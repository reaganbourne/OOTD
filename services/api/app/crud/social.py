"""
CRUD helpers for likes and comments.

Likes  — composite PK (user_id, outfit_id), idempotent toggle.
Comments — full CRUD; only the author or the outfit owner may delete.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.like import Like


# ── Likes ─────────────────────────────────────────────────────────────────────

def like_outfit(db: Session, user_id: uuid.UUID, outfit_id: uuid.UUID) -> None:
    """Idempotent — does nothing if the user already liked this outfit."""
    exists = (
        db.query(Like)
        .filter(Like.user_id == user_id, Like.outfit_id == outfit_id)
        .first()
    )
    if not exists:
        db.add(Like(user_id=user_id, outfit_id=outfit_id))
        db.commit()


def unlike_outfit(db: Session, user_id: uuid.UUID, outfit_id: uuid.UUID) -> None:
    """Idempotent — does nothing if the user never liked this outfit."""
    row = (
        db.query(Like)
        .filter(Like.user_id == user_id, Like.outfit_id == outfit_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


def get_like_count(db: Session, outfit_id: uuid.UUID) -> int:
    return db.query(Like).filter(Like.outfit_id == outfit_id).count()


def is_liked_by(db: Session, outfit_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.query(Like)
        .filter(Like.outfit_id == outfit_id, Like.user_id == user_id)
        .first()
    ) is not None


# ── Comments ──────────────────────────────────────────────────────────────────

def create_comment(
    db: Session,
    outfit_id: uuid.UUID,
    user_id: uuid.UUID,
    body: str,
) -> Comment:
    comment = Comment(outfit_id=outfit_id, user_id=user_id, body=body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def get_comment(db: Session, comment_id: uuid.UUID) -> Comment | None:
    return db.query(Comment).filter(Comment.id == comment_id).first()


def get_outfit_comments(
    db: Session,
    outfit_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Comment], str | None]:
    """Oldest-first (conversation order). Cursor is the ISO created_at of the last seen comment."""
    query = db.query(Comment).filter(Comment.outfit_id == outfit_id)

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        query = query.filter(Comment.created_at > cursor_dt)

    comments = query.order_by(Comment.created_at.asc()).limit(limit + 1).all()

    next_cursor = None
    if len(comments) > limit:
        comments = comments[:limit]
        next_cursor = comments[-1].created_at.isoformat()

    return comments, next_cursor


def update_comment(db: Session, comment: Comment, body: str) -> Comment:
    comment.body = body
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()
