import uuid
from typing import Generator

from fastapi import Depends, Header, HTTPException, status
from jose import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session

from app.crud import user as user_crud
from app.db import SessionLocal
from app.models.user import User
from app.services.auth import decode_access_token


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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ")

    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_crud.get_by_id(db, uuid.UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


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
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None
        return user_crud.get_by_id(db, uuid.UUID(user_id))
    except (JWTError, ExpiredSignatureError):
        return None
