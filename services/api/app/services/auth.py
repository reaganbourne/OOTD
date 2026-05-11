import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Response
from jose import jwt

from app.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
COOKIE_NAME = "refresh_token"
MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be {MAX_PASSWORD_BYTES} bytes or fewer.")
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if len(plain.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return False
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT. Raises JWTError on invalid, ExpiredSignatureError on expired."""
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])


def create_refresh_token() -> str:
    """Generate a cryptographically random refresh token. Store its hash, send the raw value."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 hash a token for safe storage. Never store refresh tokens in plaintext."""
    return hashlib.sha256(token.encode()).hexdigest()


def refresh_token_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)


def set_refresh_cookie(response: Response, token: str) -> None:
    is_production = settings.environment == "production"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        # In production the frontend and backend are on different domains
        # (Vercel + Railway). SameSite=Lax blocks cross-site fetch() calls,
        # so the refresh cookie is never sent → user is logged out on every
        # page refresh. SameSite=None + Secure allows the cookie across origins.
        samesite="none" if is_production else "lax",
        secure=is_production,
        path="/auth",
        max_age=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS,
    )


def clear_refresh_cookie(response: Response) -> None:
    is_production = settings.environment == "production"
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/auth",
        samesite="none" if is_production else "lax",
        secure=is_production,
        httponly=True,
    )
