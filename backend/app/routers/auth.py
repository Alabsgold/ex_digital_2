"""EX-Digital — Authentication router."""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import RevokedToken, User
from app.schemas import (
    BulkImportResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.helpers import parse_csv_to_users
from app.utils.rate_limit import limiter
from app.utils.security import (
    create_access_token,
    decode_access_token,
    get_current_user,
    hash_password,
    oauth2_scheme,
    require_admin,
    verify_password,
)

router = APIRouter()


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


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new student account."""
    # Check duplicate email
    existing = await db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Check duplicate matric
    if data.matric_number:
        existing_matric = await db.scalar(
            select(User).where(User.matric_number == data.matric_number.upper())
        )
        if existing_matric:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This matric number is already registered.",
            )

    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="student",
        matric_number=data.matric_number.upper() if data.matric_number else None,
        department=data.department,
        level=data.level,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=_user_to_response(user))


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email or matric number."""
    login_value = data.login.strip()

    # Detect if login is email or matric
    if "@" in login_value:
        user = await db.scalar(select(User).where(User.email == login_value.lower()))
    else:
        user = await db.scalar(
            select(User).where(User.matric_number == login_value.upper())
        )

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your login and password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=_user_to_response(user))


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return _user_to_response(current_user)


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
async def logout(
    token: str | None = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the current JWT so it can no longer be used."""
    if token:
        payload = decode_access_token(token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            revoked = RevokedToken(
                jti=jti,
                user_id=current_user.id,
                expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
            )
            db.add(revoked)
            await db.flush()
    return MessageResponse(message="Logged out successfully.")


# ── POST /auth/reset-password ─────────────────────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: reset a user's password and revoke all their existing tokens."""
    user = await db.scalar(select(User).where(User.id == data.user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = hash_password(data.new_password)
    await db.flush()

    return MessageResponse(message="Password reset successfully.")


# ── POST /auth/bulk-import ────────────────────────────────────────────────────

@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: bulk-import users from a CSV file."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = (await file.read()).decode("utf-8")
    rows = parse_csv_to_users(content)

    created = 0
    failed = 0
    errors: list[dict] = []

    valid_roles = {"admin", "lecturer", "student"}

    for idx, row in enumerate(rows, start=2):  # Row 1 is header
        email = row.get("email", "")
        full_name = row.get("full_name", "")
        role = row.get("role", "student")
        password = row.get("password") or "Welcome@1234"

        if not email or not full_name:
            errors.append({"row": idx, "message": "Missing required fields: email, full_name"})
            failed += 1
            continue

        if role not in valid_roles:
            errors.append({"row": idx, "message": f"Invalid role '{role}'. Must be one of: {', '.join(valid_roles)}"})
            failed += 1
            continue

        # Check duplicate
        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            errors.append({"row": idx, "message": f"Email '{email}' already exists."})
            failed += 1
            continue

        matric = row.get("matric_number")
        if matric:
            existing_matric = await db.scalar(
                select(User).where(User.matric_number == matric)
            )
            if existing_matric:
                errors.append({"row": idx, "message": f"Matric '{matric}' already exists."})
                failed += 1
                continue

        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=role,
            matric_number=matric or None,
            department=row.get("department"),
            level=row.get("level"),
        )
        db.add(user)
        created += 1

    await db.flush()

    return BulkImportResponse(
        total=len(rows),
        created=created,
        failed=failed,
        errors=errors,
    )
