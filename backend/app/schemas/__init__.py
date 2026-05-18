"""EX-Digital — All Pydantic v2 schemas."""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    login: str = Field(..., min_length=3, description="Email or matric number")
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=3, max_length=255)
    matric_number: Optional[str] = Field(
        None, pattern=r"^[A-Za-z0-9\-/]{4,25}$"
    )
    role: Literal["student", "lecturer"] = "student"
    department: Optional[str] = None
    level: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        errors = []
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("at least one digit")
        if len(v) < 8:
            errors.append("at least 8 characters")
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    matric_number: Optional[str] = None
    role: str
    department: Optional[str] = None
    level: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ResetPasswordRequest(BaseModel):
    user_id: uuid.UUID
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        if not re.search(r"[A-Z]", v):
            errors.append("uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("lowercase letter")
        if not re.search(r"\d", v):
            errors.append("digit")
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v


class BulkImportResponse(BaseModel):
    total: int
    created: int
    failed: int
    errors: List[dict]


# ═══════════════════════════════════════════════════════════════════════════════
# USER SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=3, max_length=255)
    matric_number: Optional[str] = None
    role: Literal["admin", "lecturer", "student"] = "student"
    department: Optional[str] = None
    level: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "lecturer", "student"]] = None
    department: Optional[str] = None
    level: Optional[str] = None
    is_active: Optional[bool] = None


class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ═══════════════════════════════════════════════════════════════════════════════
# COURSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class CourseCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    department: str = Field(..., min_length=2, max_length=100)
    level: str = Field(..., min_length=2, max_length=10)
    lecturer_id: Optional[uuid.UUID] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    level: Optional[str] = Field(None, min_length=2, max_length=10)
    is_active: Optional[bool] = None


class LecturerInfo(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    department: str
    level: str
    lecturer_id: Optional[uuid.UUID] = None
    lecturer: Optional[LecturerInfo] = None
    is_active: bool
    created_at: datetime
    enrollment_count: int = 0

    model_config = {"from_attributes": True}


class PaginatedCourses(BaseModel):
    items: List[CourseResponse]
    total: int
    page: int
    per_page: int
    pages: int


class EnrollStudentsRequest(BaseModel):
    student_ids: List[uuid.UUID] = Field(..., min_length=1)


class EnrollStudentsResponse(BaseModel):
    enrolled: int
    already_enrolled: int
    failed: int


class AssignLecturerRequest(BaseModel):
    lecturer_id: uuid.UUID


class AttendanceStats(BaseModel):
    total_sessions: int
    average_attendance_percentage: float
    total_students: int
    attendance_by_month: List[dict]


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class SessionStartRequest(BaseModel):
    course_id: uuid.UUID
    duration_minutes: int = Field(default=10, ge=1, le=180)
    venue: Optional[str] = None


class SessionResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_name: str
    course_code: str
    qr_uuid: str
    session_code: str
    is_active: bool
    duration_minutes: int
    venue: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    attendee_count: int = 0

    model_config = {"from_attributes": True}


class ActiveSessionResponse(SessionResponse):
    elapsed_seconds: int = 0
    remaining_seconds: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# ATTENDANCE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ScanItem(BaseModel):
    qr_uuid: Optional[str] = None
    session_code: Optional[str] = None
    timestamp: str  # ISO format
    device_id: Optional[str] = None

    @model_validator(mode="after")
    def check_qr_or_code(self) -> "ScanItem":
        if not self.qr_uuid and not self.session_code:
            raise ValueError("Either qr_uuid or session_code is required")
        return self


class RapidScanRequest(BaseModel):
    scans: List[ScanItem] = Field(..., min_length=1, max_length=50)
    device_id: Optional[str] = None


class ScanResult(BaseModel):
    scan_index: int
    status: Literal["marked", "already_marked", "failed"]
    message: str
    session_id: Optional[uuid.UUID] = None
    course_name: Optional[str] = None


class RapidScanResponse(BaseModel):
    processed: int
    marked: int
    already_marked: int
    failed: int
    results: List[ScanResult]


class ManualAttendanceRequest(BaseModel):
    session_id: uuid.UUID
    student_id: uuid.UUID
    status: Literal["present", "late"] = "present"


class BarcodeScanRequest(BaseModel):
    session_id: uuid.UUID
    matric_number: str


class AttendanceResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    course_name: str
    course_code: str
    level: str
    student_name: str
    student_matric: Optional[str] = None
    status: str
    marked_by: str
    marked_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAttendance(BaseModel):
    items: List[AttendanceResponse]
    total: int
    page: int
    per_page: int
    pages: int


class AttendanceByCourse(BaseModel):
    course_name: str
    course_code: str
    percentage: float
    present: int
    total: int


class MyAttendanceStats(BaseModel):
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    percentage: float
    by_course: List[AttendanceByCourse]


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ERPSyncStatus(BaseModel):
    pending: int
    last_sync: Optional[datetime] = None
    status: str


class UsersByDepartment(BaseModel):
    department: str
    count: int


class AttendanceTrend(BaseModel):
    date: str
    percentage: float


class DashboardStats(BaseModel):
    total_users: int
    total_students: int
    total_lecturers: int
    total_admins: int
    total_courses: int
    active_courses: int
    archived_courses: int
    active_sessions_now: int
    total_attendance_records_today: int
    overall_attendance_percentage: float
    erp_sync_status: ERPSyncStatus
    users_by_department: List[UsersByDepartment]
    attendance_trend: List[AttendanceTrend]


class SystemHealth(BaseModel):
    db: str
    redis: str
    gateway: str
    uptime: float


class MessageResponse(BaseModel):
    message: str


class QRSessionInfo(BaseModel):
    qr_uuid: str
    session_code: str
    course_name: str
    course_code: str
    expires_at: datetime
