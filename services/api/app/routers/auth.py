import uuid
from datetime import datetime, timezone

from better_profanity import profanity as _profanity
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.crud import password_reset as reset_crud
from app.crud import session as session_crud
from app.crud import user as user_crud
from app.models.refresh_session import RefreshSession
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth as auth_service
from app.services.email import send_password_reset_email
from app.services.rate_limit import (
    check_rate_limit,
    get_client_ip,
    login_rate_limiter,
    register_rate_limiter,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    check_rate_limit(register_rate_limiter, get_client_ip(request))
    if _profanity.contains_profanity(body.username):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Username contains disallowed words.")
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
    identifier = body.identifier.strip().lower()
    client_ip = get_client_ip(request)
    check_rate_limit(login_rate_limiter, f"ip:{client_ip}")
    check_rate_limit(login_rate_limiter, f"identifier:{identifier}")

    # Accept either email address or username
    if "@" in identifier:
        user = user_crud.get_by_email(db, identifier)
    else:
        user = user_crud.get_by_username(db, identifier)
    if not user or not auth_service.verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email/username or password.")

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

    user = user_crud.get_by_id(db, session.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return RefreshResponse(
        access_token=auth_service.create_access_token(session.user_id),
        user=UserResponse.model_validate(user),
    )


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


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    # Always return the same response to avoid email enumeration
    generic = MessageResponse(message="If that email is registered, a reset link has been sent.")

    user = user_crud.get_by_email(db, body.email.lower().strip())
    if not user:
        return generic

    raw_token = auth_service.create_refresh_token()  # reuse: secure random urlsafe token
    token_hash = auth_service.hash_token(raw_token)
    reset_crud.create_reset_token(db, user_id=user.id, token_hash=token_hash)

    reset_url = f"{settings.public_base_url}/reset-password?token={raw_token}"
    send_password_reset_email(to_email=user.email, reset_url=reset_url)

    return generic


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    token_hash = auth_service.hash_token(body.token)
    record = reset_crud.get_valid_reset_token(db, token_hash)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid or has expired.",
        )

    user = user_crud.get_by_id(db, record.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or has expired.")

    user.password_hash = auth_service.hash_password(body.new_password)
    reset_crud.mark_token_used(db, record)
    # Revoke all active refresh sessions so other devices are logged out
    db.query(RefreshSession).filter(
        RefreshSession.user_id == user.id,
        RefreshSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(timezone.utc)}, synchronize_session=False)
    db.commit()

    return MessageResponse(message="Password updated. You can now log in.")


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
