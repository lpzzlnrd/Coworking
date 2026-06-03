import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select, text

from app.models.user import Role, User

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://role:role@localhost:5432/role_manage_test",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("JWT_SECRET", "test-secret-please-change")

from app.config import get_settings    # noqa: E402
from app.db import get_session         # noqa: E402
from app.main import create_app        # noqa: E402
from app.models.base import Base       # noqa: E402

get_settings.cache_clear()


@pytest_asyncio.fixture(loop_scope="function")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, future=True)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture(loop_scope="function")
async def session(engine) -> AsyncIterator[AsyncSession]:
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with SessionLocal() as s:
        yield s


@pytest_asyncio.fixture(loop_scope="function")
async def client(engine) -> AsyncIterator[AsyncClient]:
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def _override_get_session() -> AsyncIterator[AsyncSession]:
        async with SessionLocal() as s:
            yield s

    app = create_app()
    app.dependency_overrides[get_session] = _override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(loop_scope="function")
async def admin_token(client, engine):
    await client.post(
        "/auth/register",
        json={"email": "admin@example.com", "password": "hunter22!"},
    )

    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with SessionLocal() as s:
        u = (await s.execute(select(User).where(User.email == "admin@example.com"))).scalar_one()
        u.role = Role.admin
        await s.commit()

    login = await client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "hunter22!"},
    )
    return login.json()["access_token"]
