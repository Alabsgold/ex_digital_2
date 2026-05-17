"""EX-Digital — Auth endpoint tests."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "email": "student1@test.com",
            "password": "Password@1",
            "full_name": "Test Student One",
            "matric_number": "STU001",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student1@test.com"
    assert data["user"]["role"] == "student"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={"email": "dup@test.com", "password": "Password@1", "full_name": "Dup User"},
    )
    response = await client.post(
        "/auth/register",
        json={"email": "dup@test.com", "password": "Password@1", "full_name": "Dup User 2"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={"email": "weak@test.com", "password": "password", "full_name": "Weak Pass"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_with_email(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={"email": "login_test@test.com", "password": "Password@1", "full_name": "Login Test"},
    )
    response = await client.post(
        "/auth/login",
        json={"login": "login_test@test.com", "password": "Password@1"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/auth/login",
        json={"login": "notexist@test.com", "password": "Password@1"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    reg = await client.post(
        "/auth/register",
        json={"email": "me_test@test.com", "password": "Password@1", "full_name": "Me Test"},
    )
    token = reg.json()["access_token"]
    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me_test@test.com"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401
