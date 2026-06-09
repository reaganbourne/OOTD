"""CRUD helpers for password reset tokens."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken

RESET_TOKEN_EXPIRE_HOURS = 1


def create_reset_token(db: Session, user_id: uuid.UUID, token_hash: str) -> PasswordResetToken:
    """Store a hashed reset token. Invalidate any existing unused tokens for this user first."""
    # Revoke previous unused tokens for this user so only one is active at a time
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    token = PasswordResetToken(
        id=uuid.uuid4(),
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_valid_reset_token(db: Session, token_hash: str) -> PasswordResetToken | None:
    """Return an unused, non-expired token matching the hash, or None."""
    now = datetime.now(timezone.utc)
    return (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )


def mark_token_used(db: Session, token: PasswordResetToken) -> None:
    token.used_at = datetime.now(timezone.utc)
    db.commit()
