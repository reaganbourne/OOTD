import uuid
from datetime import datetime

from sqlalchemy.orm import Session as DbSession

from app.models.refresh_session import RefreshSession


def create_session(
    db: DbSession,
    user_id: uuid.UUID,
    token_hash: str,
    expires_at: datetime,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> RefreshSession:
    session = RefreshSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_by_token_hash(db: DbSession, token_hash: str) -> RefreshSession | None:
    return (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .first()
    )


def revoke_session(db: DbSession, session: RefreshSession) -> None:
    session.revoked_at = datetime.utcnow()
    db.commit()
