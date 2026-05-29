import uuid

import pytest


@pytest.mark.asyncio
async def test_list_users_requires_admin(client):
    await client.post(
        "/auth/register",
        json={"email": "m@example.com", "password": "hunter22!"},
    )
    login = await client.post(
        "/auth/login",
        json={"email": "m@example.com", "password": "hunter22!"},
    )
    token = login.json()["access_token"]

    r = await client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_users_as_admin(client, admin_token):
    r = await client.get("/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_update_role_as_admin(client, admin_token):
    reg = await client.post(
        "/auth/register",
        json={"email": "victim@example.com", "password": "hunter22!"},
    )
    user_id = reg.json()["id"]

    r = await client.patch(
        f"/users/{user_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "staff"},
    )
    assert r.status_code == 200
    assert r.json()["role"] == "staff"


@pytest.mark.asyncio
async def test_get_user_not_found(client, admin_token):
    r = await client.get(
        f"/users/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404