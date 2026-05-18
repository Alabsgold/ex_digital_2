"""EX-Digital — Attendance router."""

import json
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db, get_redis
from app.models import Attendance, Course, Enrollment, Session, User
from app.schemas import (
    AttendanceResponse,
    ManualAttendanceRequest,
    BarcodeScanRequest,
    MyAttendanceStats,
    PaginatedAttendance,
    RapidScanRequest,
    RapidScanResponse,
    ScanResult,
)
from app.utils.rate_limit import limiter
from app.utils.security import get_current_user, require_admin_or_lecturer, require_student

router = APIRouter()


def _attendance_to_response(a: Attendance) -> AttendanceResponse:
    return AttendanceResponse(
        id=a.id,
        session_id=a.session_id,
        course_name=a.course.name if a.course else "",
        course_code=a.course.code if a.course else "",
        level=a.course.level if a.course else "",
        student_name=a.student.full_name if a.student else "",
        student_matric=a.student.matric_number if a.student else None,
        status=a.status,
        marked_by=a.marked_by,
        marked_at=a.marked_at,
    )


# ── POST /attendance/rapid-scan ───────────────────────────────────────────────

@router.post("/rapid-scan", response_model=RapidScanResponse)
@limiter.limit(settings.RATE_LIMIT_RAPID_SCAN)
async def rapid_scan(
    request: Request,
    data: RapidScanRequest,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Process a batch of QR scan attempts from a student device."""
    marked = already_marked = failed = 0
    results: list[ScanResult] = []

    for idx, scan in enumerate(data.scans):
        # Resolve session from QR UUID or session code
        session: Session | None = None

        if scan.qr_uuid:
            session = await db.scalar(
                select(Session)
                .options(selectinload(Session.course))
                .where(Session.qr_uuid == scan.qr_uuid, Session.is_active == True)
            )
        elif scan.session_code:
            session = await db.scalar(
                select(Session)
                .options(selectinload(Session.course))
                .where(
                    Session.session_code == scan.session_code.upper(),
                    Session.is_active == True,
                )
            )

        if not session:
            results.append(ScanResult(
                scan_index=idx,
                status="failed",
                message="Session not found or has expired.",
            ))
            failed += 1
            continue

        # Check enrollment
        enrolled = await db.scalar(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == session.course_id,
                Enrollment.is_active == True,
            )
        )
        if not enrolled:
            results.append(ScanResult(
                scan_index=idx,
                status="failed",
                message=f"You are not enrolled in {session.course.name if session.course else 'this course'}.",
                session_id=session.id,
            ))
            failed += 1
            continue

        # Duplicate detection (idempotent)
        duplicate = await db.scalar(
            select(Attendance).where(
                Attendance.session_id == session.id,
                Attendance.student_id == current_user.id,
            )
        )
        if duplicate:
            results.append(ScanResult(
                scan_index=idx,
                status="already_marked",
                message="Attendance already recorded for this session.",
                session_id=session.id,
                course_name=session.course.name if session.course else None,
            ))
            already_marked += 1
            continue

        # Calculate lateness: mark 'late' if past initial window
        started = session.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        elapsed_minutes = (now - started).total_seconds() / 60
        att_status = "late" if elapsed_minutes > settings.QR_SCAN_WINDOW_MINUTES else "present"

        attendance = Attendance(
            session_id=session.id,
            student_id=current_user.id,
            course_id=session.course_id,
            marked_by="qr_scan",
            status=att_status,
            scan_metadata={"device_id": scan.device_id or data.device_id, "scan_timestamp": scan.timestamp},
        )
        db.add(attendance)
        await db.flush()

        # Publish to Redis SSE channel
        event_data = json.dumps({
            "student_name": current_user.full_name,
            "matric_number": current_user.matric_number,
            "marked_at": attendance.marked_at.isoformat(),
            "status": att_status,
        })
        try:
            await redis.publish(f"attendance:{session.id}", event_data)
        except Exception:
            pass  # Non-blocking

        results.append(ScanResult(
            scan_index=idx,
            status="marked",
            message=f"Attendance marked as {att_status}.",
            session_id=session.id,
            course_name=session.course.name if session.course else None,
        ))
        marked += 1

    return RapidScanResponse(
        processed=len(data.scans),
        marked=marked,
        already_marked=already_marked,
        failed=failed,
        results=results,
    )


# ── POST /attendance/manual ───────────────────────────────────────────────────

@router.post("/manual", response_model=AttendanceResponse)
async def manual_attendance(
    data: ManualAttendanceRequest,
    current_user: User = Depends(require_admin_or_lecturer),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Lecturer/admin manually marks attendance for a student."""
    session = await db.scalar(
        select(Session)
        .options(selectinload(Session.course))
        .where(Session.id == data.session_id, Session.is_active == True)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found.")

    student = await db.scalar(
        select(User).where(User.id == data.student_id, User.role == "student")
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    enrolled = await db.scalar(
        select(Enrollment).where(
            Enrollment.student_id == data.student_id,
            Enrollment.course_id == session.course_id,
            Enrollment.is_active == True,
        )
    )
    if not enrolled:
        raise HTTPException(status_code=400, detail="Student is not enrolled in this course.")

    duplicate = await db.scalar(
        select(Attendance).where(
            Attendance.session_id == data.session_id,
            Attendance.student_id == data.student_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Attendance already marked for this student.")

    attendance = Attendance(
        session_id=data.session_id,
        student_id=data.student_id,
        course_id=session.course_id,
        marked_by="manual",
        marked_by_user_id=current_user.id,
        status=data.status,
    )
    db.add(attendance)
    await db.flush()

    # Load relationships for response
    await db.refresh(attendance, ["student", "course"])

    # Publish to SSE
    event_data = json.dumps({
        "student_name": student.full_name,
        "matric_number": student.matric_number,
        "marked_at": attendance.marked_at.isoformat(),
        "status": data.status,
    })
    try:
        await redis.publish(f"attendance:{data.session_id}", event_data)
    except Exception:
        pass

    return _attendance_to_response(attendance)


# ── POST /attendance/barcode-scan ─────────────────────────────────────────────

@router.post("/barcode-scan", response_model=AttendanceResponse)
async def barcode_scan(
    data: BarcodeScanRequest,
    current_user: User = Depends(require_admin_or_lecturer),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Lecturer marks attendance by scanning a student's matric number barcode."""
    session = await db.scalar(
        select(Session)
        .options(selectinload(Session.course))
        .where(Session.id == data.session_id, Session.is_active == True)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found.")

    student = await db.scalar(
        select(User).where(User.matric_number == data.matric_number.upper(), User.role == "student")
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found with this matric number.")

    enrolled = await db.scalar(
        select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.course_id == session.course_id,
            Enrollment.is_active == True,
        )
    )
    if not enrolled:
        raise HTTPException(status_code=400, detail="Student is not enrolled in this course.")

    duplicate = await db.scalar(
        select(Attendance).where(
            Attendance.session_id == data.session_id,
            Attendance.student_id == student.id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Attendance already marked for this student.")

    # Calculate lateness
    started = session.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    elapsed_minutes = (now - started).total_seconds() / 60
    att_status = "late" if elapsed_minutes > settings.QR_SCAN_WINDOW_MINUTES else "present"

    attendance = Attendance(
        session_id=data.session_id,
        student_id=student.id,
        course_id=session.course_id,
        marked_by="barcode_scan",
        marked_by_user_id=current_user.id,
        status=att_status,
        scan_metadata={"scan_type": "lecturer_barcode_scan"},
    )
    db.add(attendance)
    await db.flush()

    # Load relationships for response
    await db.refresh(attendance, ["student", "course"])

    # Publish to SSE
    event_data = json.dumps({
        "student_name": student.full_name,
        "matric_number": student.matric_number,
        "marked_at": attendance.marked_at.isoformat(),
        "status": att_status,
    })
    try:
        await redis.publish(f"attendance:{data.session_id}", event_data)
    except Exception:
        pass

    return _attendance_to_response(attendance)


# ── GET /attendance/my ────────────────────────────────────────────────────────

@router.get("/my", response_model=PaginatedAttendance)
async def my_attendance(
    course_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    att_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Attendance)
        .options(selectinload(Attendance.course), selectinload(Attendance.student))
        .where(Attendance.student_id == current_user.id)
    )

    if course_id:
        stmt = stmt.where(Attendance.course_id == course_id)
    if att_status:
        stmt = stmt.where(Attendance.status == att_status)
    if from_date:
        try:
            stmt = stmt.where(Attendance.marked_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            stmt = stmt.where(Attendance.marked_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass

    total = (await db.scalar(select(func.count()).select_from(stmt.subquery()))) or 0
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    records = (
        await db.execute(
            stmt.order_by(Attendance.marked_at.desc()).offset(offset).limit(per_page)
        )
    ).scalars().all()

    return PaginatedAttendance(
        items=[_attendance_to_response(a) for a in records],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


# ── GET /attendance/stats ─────────────────────────────────────────────────────

@router.get("/stats", response_model=MyAttendanceStats)
async def my_stats(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate attendance statistics for the authenticated student."""
    total = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.student_id == current_user.id
            )
        )
    ) or 0

    present = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.student_id == current_user.id,
                Attendance.status == "present",
            )
        )
    ) or 0

    late = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.student_id == current_user.id,
                Attendance.status == "late",
            )
        )
    ) or 0

    absent = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.student_id == current_user.id,
                Attendance.status == "absent",
            )
        )
    ) or 0

    percentage = round((present + late) / total * 100, 1) if total > 0 else 0.0

    # Per-course breakdown
    enrolled_courses = (
        await db.execute(
            select(Enrollment)
            .options(selectinload(Enrollment.course))
            .where(Enrollment.student_id == current_user.id, Enrollment.is_active == True)
        )
    ).scalars().all()

    by_course = []
    for enrollment in enrolled_courses:
        course = enrollment.course
        course_total_sessions = (
            await db.scalar(
                select(func.count(Session.id)).where(Session.course_id == course.id)
            )
        ) or 0
        course_present = (
            await db.scalar(
                select(func.count(Attendance.id)).where(
                    Attendance.student_id == current_user.id,
                    Attendance.course_id == course.id,
                    Attendance.status.in_(["present", "late"]),
                )
            )
        ) or 0
        course_pct = (
            round(course_present / course_total_sessions * 100, 1)
            if course_total_sessions > 0
            else 0.0
        )
        by_course.append(
            {
                "course_name": course.name,
                "course_code": course.code,
                "percentage": course_pct,
                "present": course_present,
                "total": course_total_sessions,
            }
        )

    return MyAttendanceStats(
        total_sessions=total,
        present_count=present,
        absent_count=absent,
        late_count=late,
        percentage=percentage,
        by_course=by_course,
    )
