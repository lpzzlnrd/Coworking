from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import InvalidTokenError

from app.config import settings


class TokenError(Exception):
    pass


def encode_access_token(sub: str, role: str, ttl_seconds: int | None = None) -> tuple[str, int]:
    ttl = ttl_seconds if ttl_seconds is not None else settings.JWT_ACCESS_TTL_SECONDS
    now = datetime.now(UTC)
    exp = now + timedelta(seconds=ttl)
    payload: dict[str, Any] = {
        "sub": sub,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": settings.JWT_ISSUER,
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, ttl


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except InvalidTokenError as e:
        raise TokenError(str(e)) from e
