from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(users.router)

    @app.on_event("startup")
    async def seed_admin():
        from app.db import AsyncSessionLocal
        from app.models.user import User, Role
        from app.security.passwords import hash_password
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            # Check if there is already an admin
            result = await session.execute(select(User).where(User.role == Role.admin))
            admin = result.scalars().first()
            if not admin:
                # Seed default admin user
                admin = User(
                    email="admin@coworking.com",
                    password_hash=hash_password("admin123"),
                    full_name="Admin Principal",
                    role=Role.admin,
                    is_active=True
                )
                session.add(admin)
                await session.commit()
                print("--- DEFAULT ADMIN SEEDED: admin@coworking.com / admin123 ---")

    @app.get("/health", tags=["meta"])
    async def health() -> dict:
        return {"status": "ok", "service": settings.APP_NAME, "env": settings.APP_ENV}

    return app


app = create_app()
