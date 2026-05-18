"""EX-Digital — Sessions router."""

import asyncio
import json
import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.database import get_db, get_redis
from app.models import Attendance, Course, Enrollment, Session, User
from app.schemas import (
    ActiveSessionResponse,
    MessageResponse,
    QRSessionInfo,
    SessionResponse,
    SessionStartRequest,
)
from app.utils.helpers import generate_qr_uuid, generate_session_code
from app.utils.security import get_current_user, require_admin_or_lecturer, require_lecturer

router = APIRouter()


def _session_to_response(session: Session, attendee_count: int = 0) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        course_id=session.course_id,
        course_name=session.course.name if session.course else "",
        course_code=session.course.code if session.course else "",
        qr_uuid=session.qr_uuid,
        session_code=session.session_code,
        is_active=session.is_active,
        duration_minutes=session.duration_minutes,
        venue=session.venue,
        started_at=session.started_at,
        ended_at=session.ended_at,
        attendee_count=attendee_count,
    )


# ── POST /sessions/start ──────────────────────────────────────────────────────

@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    data: SessionStartRequest,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Lecturer starts a new attendance session for one of their courses."""
    course = await db.scalar(
        select(Course)
        .options(selectinload(Course.lecturer))
        .where(
            Course.id == data.course_id,
            Course.lecturer_id == current_user.id,
            Course.is_active == True,
        )
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you are not the assigned lecturer.",
        )

    # Check for existing active session for this course
    existing = await db.scalar(
        select(Session).where(
            Session.course_id == data.course_id,
            Session.is_active == True,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is already an active session for this course. End it before starting a new one.",
        )

    session = Session(
        course_id=data.course_id,
        created_by=current_user.id,
        qr_uuid=generate_qr_uuid(),
        session_code=generate_session_code(),
        duration_minutes=data.duration_minutes,
        venue=data.venue,
        is_active=True,
    )
    db.add(session)
    await db.flush()
    session.course = course  # manual attach for response

    # Cache in Redis with TTL = duration + grace period
    ttl = (data.duration_minutes + settings.SESSION_GRACE_PERIOD_MINUTES) * 60
    session_data = {
        "id": str(session.id),
        "course_id": str(session.course_id),
        "course_name": course.name,
        "course_code": course.code,
        "session_code": session.session_code,
        "lecturer_id": str(current_user.id),
        "started_at": session.started_at.isoformat(),
        "duration_minutes": session.duration_minutes,
    }
    await redis.setex(f"session:{session.qr_uuid}", ttl, json.dumps(session_data))
    await redis.setex(f"session_code:{session.session_code}", ttl, str(session.id))

    return _session_to_response(session, 0)


# ── GET /sessions/active ──────────────────────────────────────────────────────

@router.get("/active", response_model=list[ActiveSessionResponse])
async def list_active_sessions(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    """Return all active sessions created by this lecturer."""
    sessions = (
        await db.execute(
            select(Session)
            .options(selectinload(Session.course))
            .where(
                Session.created_by == current_user.id,
                Session.is_active == True,
            )
        )
    ).scalars().all()

    now = datetime.now(timezone.utc)
    result = []
    for s in sessions:
        count = (
            await db.scalar(
                select(func.count(Attendance.id)).where(Attendance.session_id == s.id)
            )
        ) or 0
        started = s.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = int((now - started).total_seconds())
        remaining = max(0, s.duration_minutes * 60 - elapsed)
        result.append(
            ActiveSessionResponse(
                **_session_to_response(s, count).model_dump(),
                elapsed_seconds=elapsed,
                remaining_seconds=remaining,
            )
        )
    return result


# ── POST /sessions/{id}/end ───────────────────────────────────────────────────

@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: uuid.UUID,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    session = await db.scalar(
        select(Session)
        .options(selectinload(Session.course))
        .where(Session.id == session_id)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if str(session.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only end your own sessions.")
    if not session.is_active:
        raise HTTPException(status_code=409, detail="Session is already ended.")

    session.is_active = False
    session.ended_at = datetime.now(timezone.utc)
    await db.flush()

    # Remove from Redis
    await redis.delete(f"session:{session.qr_uuid}")
    await redis.delete(f"session_code:{session.session_code}")

    count = (
        await db.scalar(
            select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
        )
    ) or 0
    return _session_to_response(session, count)


# ── GET /sessions/{id}/attendees ──────────────────────────────────────────────

@router.get("/{session_id}/attendees")
async def list_attendees(
    session_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin_or_lecturer),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(select(Session).where(Session.id == session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    total = (
        await db.scalar(
            select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
        )
    ) or 0
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    attendances = (
        await db.execute(
            select(Attendance)
            .options(selectinload(Attendance.student), selectinload(Attendance.course))
            .where(Attendance.session_id == session_id)
            .offset(offset)
            .limit(per_page)
        )
    ).scalars().all()

    items = [
        {
            "id": str(a.id),
            "student_name": a.student.full_name,
            "matric_number": a.student.matric_number,
            "status": a.status,
            "marked_at": a.marked_at.isoformat(),
            "marked_by": a.marked_by,
        }
        for a in attendances
    ]

    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}


# ── GET /sessions/{id}/attendees/stream (SSE) ─────────────────────────────────

@router.get("/{session_id}/attendees/stream")
async def stream_attendees(
    session_id: uuid.UUID,
    current_user: User = Depends(require_lecturer),
    redis=Depends(get_redis),
):
    """Server-Sent Events stream for live attendance updates."""

    async def event_generator():
        channel = f"attendance:{session_id}"
        pubsub = redis.pubsub()
        await pubsub.subscribe(channel)
        try:
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=30
                )
                if message and message["type"] == "message":
                    yield {"event": "attendee", "data": message["data"]}
                else:
                    yield {"event": "heartbeat", "data": "ping"}
                await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()

    return EventSourceResponse(event_generator())


# ── GET /sessions/{id}/qr ─────────────────────────────────────────────────────

@router.get("/{session_id}/qr", response_model=QRSessionInfo)
async def get_session_qr(
    session_id: uuid.UUID,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(
        select(Session)
        .options(selectinload(Session.course))
        .where(Session.id == session_id)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if str(session.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    started = session.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    expires_at = started + timedelta(
        minutes=session.duration_minutes + settings.SESSION_GRACE_PERIOD_MINUTES
    )

    return QRSessionInfo(
        qr_uuid=session.qr_uuid,
        session_code=session.session_code,
        course_name=session.course.name if session.course else "",
        course_code=session.course.code if session.course else "",
        expires_at=expires_at,
    )
