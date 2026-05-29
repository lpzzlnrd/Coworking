import jwt
import pytest

from app.config import settings
from app.security.jwt import TokenError, decode_access_token, encode_access_token


def test_encode_decode_roundtrip():
    token, ttl = encode_access_token(sub="user-1", role="admin")
    payload = decode_access_token(token)

    assert payload["sub"] == "user-1"
    assert payload["role"] == "admin"
    assert payload["exp"] - payload["iat"] == ttl


def test_expired_token_raises():
    # Negative TTL → token is already expired, no sleep needed.
    token, _ = encode_access_token(sub="x", role="member", ttl_seconds=-10)
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_tampered_token_raises():
    token, _ = encode_access_token(sub="x", role="member")
    bad = token[:-2] + ("AA" if token[-2:] != "AA" else "BB")
    with pytest.raises(TokenError):
        decode_access_token(bad)


def test_wrong_secret_raises():
    token = jwt.encode(
        {"sub": "x", "role": "admin"}, "wrong-secret", algorithm=settings.JWT_ALGORITHM
    )
    with pytest.raises(TokenError):
        decode_access_token(token)