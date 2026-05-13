import uuid
from typing import Generator

from fastapi import Depends, Header, HTTPException, status
from jose import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session

from app.crud import user as user_crud
from app.db import SessionLocal
from app.models.user import User
from app.services.auth import decode_access_token


def _unauthenticated(detail: str = "Not authenticated.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _parse_user_id(user_id: str | None) -> uuid.UUID:
    if not user_id:
        raise _unauthenticated()
    try:
        return uuid.UUID(user_id)
    except ValueError:
        raise _unauthenticated()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency for protected routes.
    Reads the Authorization: Bearer <token> header, validates the JWT,
    and returns the corresponding User row.

    Usage:
        @router.get("/me")
        def me(current_user: User = Depends(get_current_user)):
            ...
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthenticated()

    token = authorization.removeprefix("Bearer ")

    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise _unauthenticated("Token expired.")
    except JWTError:
        raise _unauthenticated()

    user = user_crud.get_by_id(db, _parse_user_id(payload.get("sub")))
    if not user:
        raise _unauthenticated()

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for admin-only routes. Returns the user or raises 403."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return current_user


def get_optional_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Like get_current_user but returns None instead of 401 when no token is provided.
    Use on endpoints that are public but have auth-aware behaviour (e.g. liked_by_me).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.removeprefix("Bearer ")
        payload = decode_access_token(token)
        return user_crud.get_by_id(db, _parse_user_id(payload.get("sub")))
    except (HTTPException, JWTError, ExpiredSignatureError):
        return None
