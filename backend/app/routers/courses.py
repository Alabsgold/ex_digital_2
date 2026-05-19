"""EX-Digital — Courses router."""

import math
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Course, Enrollment, Session, User, Attendance
from app.schemas import (
    AssignLecturerRequest,
    AttendanceStats,
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    EnrollStudentsRequest,
    EnrollStudentsResponse,
    LecturerInfo,
    MessageResponse,
    PaginatedCourses,
)
from app.utils.security import get_current_user, require_admin, require_admin_or_lecturer

router = APIRouter()


def _build_course_response(course: Course, enrollment_count: int = 0) -> CourseResponse:
    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        description=course.description,
        department=course.department,
        level=course.level,
        lecturer_id=course.lecturer_id,
        lecturer=LecturerInfo(
            id=course.lecturer.id,
            full_name=course.lecturer.full_name,
            email=course.lecturer.email,
        ) if course.lecturer else None,
        is_active=course.is_active,
        created_at=course.created_at,
        enrollment_count=enrollment_count,
    )


# ── GET /courses/available ───────────────────────────────────────────────────

@router.get("/available", response_model=PaginatedCourses)
async def list_available_courses(
    level: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Course).options(selectinload(Course.lecturer)).where(Course.is_active == True)
    
    if current_user.role == "student":
        # exclude enrolled
        enrolled_course_ids = (
            await db.execute(select(Enrollment.course_id).where(Enrollment.student_id == current_user.id, Enrollment.is_active == True))
        ).scalars().all()
        if enrolled_course_ids:
            stmt = stmt.where(Course.id.not_in(enrolled_course_ids))
        if current_user.level:
            stmt = stmt.where(Course.level == current_user.level)
    elif current_user.role == "lecturer":
        # Only show unassigned courses (not yet claimed by any lecturer, and not already mine)
        stmt = stmt.where(Course.lecturer_id.is_(None))

    if level:
        stmt = stmt.where(Course.level == level)
    if department:
        stmt = stmt.where(Course.department.ilike(f"%{department}%"))
    if search:
        stmt = stmt.where((Course.name.ilike(f"%{search}%")) | (Course.code.ilike(f"%{search}%")))

    total = (await db.scalar(select(func.count()).select_from(stmt.subquery()))) or 0
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    results = (await db.execute(stmt.offset(offset).limit(per_page))).scalars().all()

    items = []
    for course in results:
        count = (await db.scalar(select(func.count(Enrollment.id)).where(Enrollment.course_id == course.id, Enrollment.is_active == True))) or 0
        items.append(_build_course_response(course, count))

    return PaginatedCourses(items=items, total=total, page=page, per_page=per_page, pages=pages)


# ── GET /courses/ ─────────────────────────────────────────────────────────────

@router.get("/", response_model=PaginatedCourses)
async def list_courses(
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Course)
        .options(selectinload(Course.lecturer))
        .where(Course.is_active == True if is_active is None else Course.is_active == is_active)
    )

    # Scope by role
    if current_user.role == "student":
        enrolled_course_ids = (
            await db.execute(
                select(Enrollment.course_id).where(
                    Enrollment.student_id == current_user.id,
                    Enrollment.is_active == True,
                )
            )
        ).scalars().all()
        stmt = stmt.where(Course.id.in_(enrolled_course_ids))
    elif current_user.role == "lecturer":
        stmt = stmt.where(Course.lecturer_id == current_user.id)

    if department:
        stmt = stmt.where(Course.department.ilike(f"%{department}%"))
    if search:
        stmt = stmt.where(
            (Course.name.ilike(f"%{search}%")) | (Course.code.ilike(f"%{search}%"))
        )

    total = (await db.scalar(select(func.count()).select_from(stmt.subquery()))) or 0
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    results = (await db.execute(stmt.offset(offset).limit(per_page))).scalars().all()

    items = []
    for course in results:
        count = (
            await db.scalar(
                select(func.count(Enrollment.id)).where(
                    Enrollment.course_id == course.id,
                    Enrollment.is_active == True,
                )
            )
        ) or 0
        items.append(_build_course_response(course, count))

    return PaginatedCourses(items=items, total=total, page=page, per_page=per_page, pages=pages)


# ── POST /courses/ ────────────────────────────────────────────────────────────

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    data: CourseCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(Course).where(Course.code == data.code.upper()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A course with code '{data.code}' already exists.",
        )

    course = Course(
        code=data.code.upper(),
        name=data.name,
        description=data.description,
        department=data.department,
        level=data.level,
        lecturer_id=data.lecturer_id,
    )
    db.add(course)
    await db.flush()
    await db.refresh(course, ["lecturer"])

    return _build_course_response(course, 0)


# ── GET /courses/{id} ─────────────────────────────────────────────────────────

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(
        select(Course)
        .options(selectinload(Course.lecturer))
        .where(Course.id == course_id)
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if current_user.role == "student":
        enrolled = await db.scalar(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id,
                Enrollment.is_active == True,
            )
        )
        if not enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")

    count = (
        await db.scalar(
            select(func.count(Enrollment.id)).where(
                Enrollment.course_id == course_id,
                Enrollment.is_active == True,
            )
        )
    ) or 0
    return _build_course_response(course, count)


# ── PATCH /courses/{id} ───────────────────────────────────────────────────────

@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    data: CourseUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(
        select(Course)
        .options(selectinload(Course.lecturer))
        .where(Course.id == course_id)
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await db.flush()

    count = (
        await db.scalar(
            select(func.count(Enrollment.id)).where(
                Enrollment.course_id == course_id, Enrollment.is_active == True
            )
        )
    ) or 0
    return _build_course_response(course, count)


# ── DELETE /courses/{id} ──────────────────────────────────────────────────────

@router.delete("/{course_id}", response_model=MessageResponse)
async def archive_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    course.is_active = False
    await db.flush()
    return MessageResponse(message="Course archived successfully.")


# ── POST /courses/{id}/enroll ─────────────────────────────────────────────────

@router.post("/{course_id}/enroll", response_model=EnrollStudentsResponse)
async def enroll_students(
    course_id: uuid.UUID,
    data: EnrollStudentsRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    enrolled = already_enrolled = failed = 0

    for student_id in data.student_ids:
        student = await db.scalar(
            select(User).where(User.id == student_id, User.role == "student")
        )
        if not student:
            failed += 1
            continue

        existing = await db.scalar(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.course_id == course_id,
            )
        )
        if existing:
            if not existing.is_active:
                existing.is_active = True
                enrolled += 1
            else:
                already_enrolled += 1
            continue

        db.add(Enrollment(student_id=student_id, course_id=course_id))
        enrolled += 1

    await db.flush()
    return EnrollStudentsResponse(
        enrolled=enrolled, already_enrolled=already_enrolled, failed=failed
    )


# ── POST /courses/{id}/self-enroll ────────────────────────────────────────────

@router.post("/{course_id}/self-enroll", response_model=MessageResponse)
async def self_enroll_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if current_user.role == "student":
        existing = await db.scalar(select(Enrollment).where(Enrollment.student_id == current_user.id, Enrollment.course_id == course_id))
        if existing:
            if not existing.is_active:
                existing.is_active = True
                await db.flush()
                return MessageResponse(message="Re-enrolled successfully.")
            return MessageResponse(message="Already enrolled.")
        db.add(Enrollment(student_id=current_user.id, course_id=course_id))
        await db.flush()
        return MessageResponse(message="Enrolled successfully.")

    elif current_user.role == "lecturer":
        if course.lecturer_id == current_user.id:
            return MessageResponse(message="You are already teaching this course.")
        course.lecturer_id = current_user.id
        await db.flush()
        return MessageResponse(message="Claimed course successfully.")

    else:
        raise HTTPException(status_code=403, detail="Admins cannot self-enroll.")


# ── GET /courses/{id}/students ────────────────────────────────────────────────

@router.get("/{course_id}/students", response_model=dict)
async def get_enrolled_students(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if current_user.role == "lecturer" and course.lecturer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not teach this course.")
    
    if current_user.role == "student":
        raise HTTPException(status_code=403, detail="Students cannot view full enrollment lists.")

    stmt = select(User).join(Enrollment).where(Enrollment.course_id == course_id, Enrollment.is_active == True, User.role == "student")
    students = (await db.execute(stmt)).scalars().all()
    
    return {
        "students": [
            {
                "id": str(s.id),
                "full_name": s.full_name,
                "matric_number": s.matric_number,
                "email": s.email,
                "level": s.level
            } for s in students
        ]
    }


# ── POST /courses/{id}/assign-lecturer ────────────────────────────────────────

@router.post("/{course_id}/assign-lecturer", response_model=CourseResponse)
async def assign_lecturer(
    course_id: uuid.UUID,
    data: AssignLecturerRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(
        select(Course)
        .options(selectinload(Course.lecturer))
        .where(Course.id == course_id)
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    lecturer = await db.scalar(
        select(User).where(User.id == data.lecturer_id, User.role == "lecturer")
    )
    if not lecturer:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found or user does not have lecturer role.",
        )

    course.lecturer_id = data.lecturer_id
    await db.flush()
    await db.refresh(course, ["lecturer"])

    count = (
        await db.scalar(
            select(func.count(Enrollment.id)).where(
                Enrollment.course_id == course_id, Enrollment.is_active == True
            )
        )
    ) or 0
    return _build_course_response(course, count)


# ── GET /courses/{id}/attendance/stats ────────────────────────────────────────

@router.get("/{course_id}/attendance/stats", response_model=AttendanceStats)
async def course_attendance_stats(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    total_sessions = (
        await db.scalar(
            select(func.count(Session.id)).where(Session.course_id == course_id)
        )
    ) or 0

    total_students = (
        await db.scalar(
            select(func.count(Enrollment.id)).where(
                Enrollment.course_id == course_id, Enrollment.is_active == True
            )
        )
    ) or 0

    total_attendance = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.course_id == course_id,
                Attendance.status.in_(["present", "late"]),
            )
        )
    ) or 0

    max_possible = total_sessions * total_students
    avg_percentage = round((total_attendance / max_possible * 100), 1) if max_possible > 0 else 0.0

    return AttendanceStats(
        total_sessions=total_sessions,
        average_attendance_percentage=avg_percentage,
        total_students=total_students,
        attendance_by_month=[],
    )
