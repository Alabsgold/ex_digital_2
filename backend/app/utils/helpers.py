"""EX-Digital — General helper utilities."""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import random
import re
import string
import time
import uuid
from datetime import datetime, timezone
from typing import Any


# ── Session / QR generators ───────────────────────────────────────────────────

def generate_session_code(length: int = 6) -> str:
    """Generate a random uppercase alphanumeric session code."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.SystemRandom().choices(alphabet, k=length))


def generate_qr_uuid() -> str:
    """Generate a UUID4 string for use as a QR code payload."""
    return str(uuid.uuid4())


# ── HMAC utilities ────────────────────────────────────────────────────────────

def generate_hmac_signature(payload: bytes, secret: str) -> str:
    """Return HMAC-SHA256 hex digest of the payload."""
    return hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()


def verify_hmac_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Constant-time comparison of expected vs provided HMAC-SHA256 signature."""
    expected = generate_hmac_signature(payload, secret)
    return hmac.compare_digest(expected, signature)


def is_within_timestamp_tolerance(
    timestamp_seconds: int, tolerance_minutes: int = 5
) -> bool:
    """Return True if the Unix timestamp is within ±tolerance_minutes of now."""
    now = int(time.time())
    delta = abs(now - timestamp_seconds)
    return delta <= tolerance_minutes * 60


# ── Misc utilities ────────────────────────────────────────────────────────────

def sanitize_filename(filename: str) -> str:
    """Strip path components and replace unsafe chars with underscores."""
    filename = re.sub(r"[^\w\s\-.]", "_", filename)
    return filename.strip().replace(" ", "_")


def parse_csv_to_users(csv_content: str) -> list[dict[str, Any]]:
    """
    Parse CSV content into a list of user dicts.

    Expected columns: full_name, email, matric_number, role, department, level
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    users: list[dict[str, Any]] = []
    for row in reader:
        users.append(
            {
                "full_name": (row.get("full_name") or "").strip(),
                "email": (row.get("email") or "").strip().lower(),
                "matric_number": (row.get("matric_number") or "").strip().upper() or None,
                "role": (row.get("role") or "student").strip().lower(),
                "department": (row.get("department") or "").strip() or None,
                "level": (row.get("level") or "").strip() or None,
                "password": (row.get("password") or "").strip() or None,
            }
        )
    return users


def utcnow_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()
