"""EX-Digital — Application Configuration using Pydantic Settings."""
from __future__ import annotations

import sys
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── App ───────────────────────────────────────────────────────────────
    APP_NAME: str = "EX-Digital"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ─── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://exdigital:change-me@localhost:5432/exdigital"
    )
    DATABASE_URL_SYNC: str = (
        "postgresql://exdigital:change-me@localhost:5432/exdigital"
    )

    # ─── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-please-this-is-a-secret-key-minimum-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ─── Session / QR ──────────────────────────────────────────────────────
    SESSION_DURATION_MINUTES: int = 10
    SESSION_GRACE_PERIOD_MINUTES: int = 5
    QR_SCAN_WINDOW_MINUTES: int = 5

    # ─── Gateway ───────────────────────────────────────────────────────────
    HMAC_SECRET: str = "change-me-hmac-secret-must-be-min-32-chars"
    GATEWAY_API_KEY: str = "change-me-gateway-api-key"

    # ─── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ─── Rate Limiting ─────────────────────────────────────────────────────
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_RAPID_SCAN: str = "30/minute"

    # ─── Security ──────────────────────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12

    # ─── Admin Seed ────────────────────────────────────────────────────────
    DEFAULT_ADMIN_EMAIL: str = "admin@exdigital.local"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@123456"
    DEFAULT_ADMIN_NAME: str = "System Administrator"

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        return v

    def validate_secrets(self) -> None:
        """Exit with an error if insecure default secrets are used in production."""
        if self.ENVIRONMENT == "production":
            insecure_defaults = {
                "change-me-please-this-is-a-secret-key-minimum-32-chars-long",
                "ec7f683b57fcbae7d9e68f7bf26079bbb34c62d0c0d94013b30eb9dc6dec2d1a",
            }
            if self.JWT_SECRET in insecure_defaults:
                print(
                    "FATAL: Default JWT_SECRET detected in production. "
                    "Set a strong secret in your environment.",
                    file=sys.stderr,
                )
                sys.exit(1)
            if self.HMAC_SECRET in {"change-me-hmac-secret-must-be-min-32-chars", "796b805edd229cab0bd6e35d0f8dbfba"}:
                print(
                    "FATAL: Default HMAC_SECRET detected in production.",
                    file=sys.stderr,
                )
                sys.exit(1)

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
