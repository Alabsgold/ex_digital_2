"""EX-Digital — Admin router."""
from __future__ import annotations

import math
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, create_redis_pool, get_db
from app.models import Attendance, Course, ERPSyncLog, Session, User
from app.schemas import (
    DashboardStats,
    ERPSyncStatus,
    MessageResponse,
    PaginatedUsers,
    SystemHealth,
    UserResponse,
    UserUpdate,
)
from app.utils.security import get_current_user, hash_password, require_admin
from sqlalchemy import text
from datetime import datetime, timezone, timedelta

router = APIRouter()

_APP_START = time.time()


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        matric_number=user.matric_number,
        role=user.role,
        department=user.department,
        level=user.level,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


# ── GET /admin/dashboard/stats ────────────────────────────────────────────────

@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.scalar(select(func.count(User.id)))) or 0
    total_students = (
        await db.scalar(select(func.count(User.id)).where(User.role == "student"))
    ) or 0
    total_lecturers = (
        await db.scalar(select(func.count(User.id)).where(User.role == "lecturer"))
    ) or 0
    total_admins = (
        await db.scalar(select(func.count(User.id)).where(User.role == "admin"))
    ) or 0
    total_courses = (await db.scalar(select(func.count(Course.id)))) or 0
    active_courses = (
        await db.scalar(select(func.count(Course.id)).where(Course.is_active == True))
    ) or 0
    archived_courses = total_courses - active_courses
    active_sessions_now = (
        await db.scalar(select(func.count(Session.id)).where(Session.is_active == True))
    ) or 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total_attendance_records_today = (
        await db.scalar(
            select(func.count(Attendance.id)).where(Attendance.marked_at >= today_start)
        )
    ) or 0

    # Overall attendance percentage (present + late out of total records)
    total_records = (await db.scalar(select(func.count(Attendance.id)))) or 0
    present_records = (
        await db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.status.in_(["present", "late"])
            )
        )
    ) or 0
    overall_pct = round(present_records / total_records * 100, 1) if total_records > 0 else 0.0

    # ERP sync status
    last_sync_log = (
        await db.scalar(
            select(ERPSyncLog)
            .order_by(ERPSyncLog.started_at.desc())
            .limit(1)
        )
    )
    pending_sync = (
        await db.scalar(
            select(func.count(Attendance.id)).where(Attendance.is_synced_to_erp == False)
        )
    ) or 0
    erp_status = ERPSyncStatus(
        pending=pending_sync,
        last_sync=last_sync_log.completed_at if last_sync_log else None,
        status=last_sync_log.status if last_sync_log else "never",
    )

    # Users by department
    dept_rows = (
        await db.execute(
            select(User.department, func.count(User.id).label("count"))
            .where(User.department.isnot(None))
            .group_by(User.department)
            .order_by(func.count(User.id).desc())
            .limit(10)
        )
    ).all()
    users_by_dept = [{"department": r[0], "count": r[1]} for r in dept_rows]

    # 30-day attendance trend
    trend = []
    for i in range(29, -1, -1):
        day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_sessions = (
            await db.scalar(
                select(func.count(Session.id)).where(
                    Session.started_at >= day, Session.started_at < day_end
                )
            )
        ) or 0
        day_present = (
            await db.scalar(
                select(func.count(Attendance.id)).where(
                    Attendance.marked_at >= day,
                    Attendance.marked_at < day_end,
                    Attendance.status.in_(["present", "late"]),
                )
            )
        ) or 0
        trend.append({"date": day.strftime("%Y-%m-%d"), "percentage": float(day_present)})

    return DashboardStats(
        total_users=total_users,
        total_students=total_students,
        total_lecturers=total_lecturers,
        total_admins=total_admins,
        total_courses=total_courses,
        active_courses=active_courses,
        archived_courses=archived_courses,
        active_sessions_now=active_sessions_now,
        total_attendance_records_today=total_attendance_records_today,
        overall_attendance_percentage=overall_pct,
        erp_sync_status=erp_status,
        users_by_department=users_by_dept,
        attendance_trend=trend,
    )


# ── GET /admin/users ──────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if search:
        stmt = stmt.where(
            (User.full_name.ilike(f"%{search}%"))
            | (User.email.ilike(f"%{search}%"))
            | (User.matric_number.ilike(f"%{search}%"))
        )
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if department:
        stmt = stmt.where(User.department.ilike(f"%{department}%"))

    total = (await db.scalar(select(func.count()).select_from(stmt.subquery()))) or 0
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    users = (await db.execute(stmt.offset(offset).limit(per_page))).scalars().all()
    return PaginatedUsers(
        items=[_user_to_response(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


# ── PATCH /admin/users/{id} ───────────────────────────────────────────────────

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if data.email and data.email != user.email:
        existing = await db.scalar(select(User).where(User.email == data.email.lower()))
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    return _user_to_response(user)


# ── DELETE /admin/users/{id} ──────────────────────────────────────────────────

@router.delete("/users/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    await db.flush()
    return MessageResponse(message="User deactivated successfully.")


# ── POST /admin/users/{id}/reactivate ─────────────────────────────────────────

@router.post("/users/{user_id}/reactivate", response_model=UserResponse)
async def reactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = True
    await db.flush()
    return _user_to_response(user)


# ── GET /admin/system-health ──────────────────────────────────────────────────

@router.get("/system-health", response_model=SystemHealth)
async def system_health(
    current_user: User = Depends(require_admin),
):
    db_status = "connected"
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    redis_status = "connected"
    try:
        r = create_redis_pool()
        await r.ping()
        await r.aclose()
    except Exception:
        redis_status = "error"

    # Gateway ping
    gateway_status = "unknown"
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get("http://gateway:5001/health")
            gateway_status = "connected" if resp.status_code == 200 else "error"
    except Exception:
        gateway_status = "unreachable"

    return SystemHealth(
        db=db_status,
        redis=redis_status,
        gateway=gateway_status,
        uptime=round(time.time() - _APP_START, 1),
    )
