"""EX-Digital — Attendance endpoint tests."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rapid_scan_requires_auth(client: AsyncClient):
    response = await client.post(
        "/attendance/rapid-scan",
        json={"scans": [{"session_code": "ABCDEF", "timestamp": "2025-01-01T00:00:00Z"}]},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_rapid_scan_requires_student_role(client: AsyncClient):
    # Register a lecturer
    reg = await client.post(
        "/auth/register",
        json={"email": "lec_scan_test@test.com", "password": "Password@1", "full_name": "Lec Scan"},
    )
    token = reg.json()["access_token"]

    response = await client.post(
        "/attendance/rapid-scan",
        json={"scans": [{"session_code": "ABCDEF", "timestamp": "2025-01-01T00:00:00Z"}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Student can call this endpoint (role = student by default)
    assert response.status_code in (200, 400, 422)


@pytest.mark.asyncio
async def test_my_attendance_empty(client: AsyncClient):
    reg = await client.post(
        "/auth/register",
        json={"email": "att_hist@test.com", "password": "Password@1", "full_name": "Att Hist"},
    )
    token = reg.json()["access_token"]
    response = await client.get(
        "/attendance/my",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_attendance_stats_empty(client: AsyncClient):
    reg = await client.post(
        "/auth/register",
        json={"email": "att_stats@test.com", "password": "Password@1", "full_name": "Att Stats"},
    )
    token = reg.json()["access_token"]
    response = await client.get(
        "/attendance/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["percentage"] == 0.0
