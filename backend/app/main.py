"""EX-Digital — FastAPI application factory with lifespan and middleware."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal, close_redis, create_redis_pool, engine
from app.utils.rate_limit import limiter

# ── Startup timestamp for /health uptime ─────────────────────────────────────
_START_TIME = time.time()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    # ── Startup ──────────────────────────────────────────────────────────
    settings.validate_secrets()

    # Ensure tables exist (dev/test convenience — production uses Alembic)
    from app.models import Base  # noqa: F401 — registers all models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Verify Redis connection
    redis = create_redis_pool()
    try:
        await redis.ping()
    except Exception:
        pass  # Gateway may not be available; keep server alive
    finally:
        await redis.aclose()

    # Seed default admin if no users exist
    from app.models import User
    from app.utils.security import hash_password
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        count = await db.scalar(select(User).limit(1))
        if count is None:
            admin = User(
                email=settings.DEFAULT_ADMIN_EMAIL,
                full_name=settings.DEFAULT_ADMIN_NAME,
                hashed_password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    await engine.dispose()
    await close_redis()


# ── Application factory ───────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Enterprise Attendance Management System API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Rate limiting ─────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global exception handlers ─────────────────────────────────────────
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error. Please try again.",
                "type": type(exc).__name__ if settings.DEBUG else "error",
            },
        )

    # ── Routers ───────────────────────────────────────────────────────────
    from app.routers.admin import router as admin_router
    from app.routers.attendance import router as attendance_router
    from app.routers.auth import router as auth_router
    from app.routers.courses import router as courses_router
    from app.routers.sessions import router as sessions_router

    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
    app.include_router(courses_router, prefix="/courses", tags=["Courses"])
    app.include_router(sessions_router, prefix="/sessions", tags=["Sessions"])
    app.include_router(attendance_router, prefix="/attendance", tags=["Attendance"])
    app.include_router(admin_router, prefix="/admin", tags=["Admin"])

    # ── Utility endpoints ─────────────────────────────────────────────────
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "status": "running",
        }

    @app.get("/health", tags=["Health"])
    async def health_check():
        from app.database import get_redis

        # DB check
        db_status = "connected"
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
        except Exception:
            db_status = "error"

        # Redis check
        redis_status = "connected"
        try:
            r = create_redis_pool()
            await r.ping()
            await r.aclose()
        except Exception:
            redis_status = "error"

        return {
            "status": "healthy" if db_status == "connected" else "degraded",
            "db": db_status,
            "redis": redis_status,
            "uptime": round(time.time() - _START_TIME, 1),
        }

    return app


# ── WSGI entry point ──────────────────────────────────────────────────────────
app = create_app()
