import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.crud import session as session_crud
from app.crud import user as user_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth as auth_service
from app.services.rate_limit import login_rate_limiter, register_rate_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(key: str, limiter) -> None:
    decision = limiter.check(key)
    if decision.allowed:
        return
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many attempts. Please try again later.",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _enforce_rate_limit(f"register:ip:{_client_ip(request)}", register_rate_limiter)

    if user_crud.get_by_email(db, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered.")
    if user_crud.get_by_username(db, body.username):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Username already taken.")

    user = user_crud.create_user(
        db,
        username=body.username,
        email=body.email,
        password_hash=auth_service.hash_password(body.password),
    )

    access_token, refresh_token = _issue_tokens(db, user, request, response)
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    normalized_email = body.email.lower()
    client_ip = _client_ip(request)
    _enforce_rate_limit(f"login:ip:{client_ip}", login_rate_limiter)
    _enforce_rate_limit(f"login:email:{normalized_email}", login_rate_limiter)

    user = user_crud.get_by_email(db, normalized_email)
    if not user or not auth_service.verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    access_token, refresh_token = _issue_tokens(db, user, request, response)
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/refresh", response_model=RefreshResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
) -> RefreshResponse:
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing.")

    session = session_crud.get_by_token_hash(db, auth_service.hash_token(refresh_token))

    if (
        not session
        or session.revoked_at is not None
        or session.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked."
        )

    # Rotate: revoke old session, issue a new one
    session_crud.revoke_session(db, session)
    new_refresh_token = auth_service.create_refresh_token()
    session_crud.create_session(
        db,
        user_id=session.user_id,
        token_hash=auth_service.hash_token(new_refresh_token),
        expires_at=auth_service.refresh_token_expires_at(),
    )
    auth_service.set_refresh_cookie(response, new_refresh_token)

    return RefreshResponse(access_token=auth_service.create_access_token(session.user_id))


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
) -> MessageResponse:
    if refresh_token:
        session = session_crud.get_by_token_hash(db, auth_service.hash_token(refresh_token))
        if session and session.revoked_at is None:
            session_crud.revoke_session(db, session)

    auth_service.clear_refresh_cookie(response)
    return MessageResponse(message="Logged out.")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


# ------------------------------------------------------------------ helpers

def _issue_tokens(
    db: Session, user: User, request: Request, response: Response
) -> tuple[str, str]:
    """Create an access token + refresh session and set the refresh cookie."""
    access_token = auth_service.create_access_token(user.id)
    refresh_token = auth_service.create_refresh_token()
    session_crud.create_session(
        db,
        user_id=user.id,
        token_hash=auth_service.hash_token(refresh_token),
        expires_at=auth_service.refresh_token_expires_at(),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    auth_service.set_refresh_cookie(response, refresh_token)
    return access_token, refresh_token
