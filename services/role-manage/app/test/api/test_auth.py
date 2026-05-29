import pytest


@pytest.mark.asyncio
async def test_register_creates_user(client):
    r = await client.post(
        "/auth/register",
        json={"email": "a@example.com", "password": "hunter22!", "full_name": "A"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "a@example.com"
    assert body["role"] == "member"
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    """Exercises the real Postgres UNIQUE constraint."""
    payload = {"email": "dup@example.com", "password": "hunter22!"}
    r1 = await client.post("/auth/register", json=payload)
    r2 = await client.post("/auth/register", json=payload)
    assert r1.status_code == 201
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_register_normalizes_email_lowercase(client):
    r = await client.post(
        "/auth/register",
        json={"email": "MiXeD@Example.COM", "password": "hunter22!"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "mixed@example.com"


@pytest.mark.asyncio
async def test_login_returns_token(client):
    await client.post(
        "/auth/register",
        json={"email": "u@example.com", "password": "hunter22!"},
    )
    r = await client.post(
        "/auth/login",
        json={"email": "u@example.com", "password": "hunter22!"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["access_token"]


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    await client.post(
        "/auth/register",
        json={"email": "u@example.com", "password": "hunter22!"},
    )
    r = await client.post(
        "/auth/login",
        json={"email": "u@example.com", "password": "WRONG"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    await client.post(
        "/auth/register",
        json={"email": "me@example.com", "password": "hunter22!"},
    )
    login = await client.post(
        "/auth/login",
        json={"email": "me@example.com", "password": "hunter22!"},
    )
    token = login.json()["access_token"]

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"