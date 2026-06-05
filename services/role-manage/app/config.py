from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://role:role@localhost:5432/role_manage"

    JWT_SECRET: str = Field(default="change-me-in-prod", min_length=8)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_SECONDS: int = 900
    JWT_ISSUER: str = "coworking-auth"

    CORS_ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    APP_NAME: str = "role-manage"
    APP_ENV: str = "dev"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
