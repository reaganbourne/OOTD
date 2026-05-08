"""
CRUD helpers for the notifications table.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.user import User


def create_notification(
    db: Session,
    *,
    recipient_id: uuid.UUID,
    actor_id: uuid.UUID,
    type: NotificationType,
    body: str | None = None,
    outfit_id: uuid.UUID | None = None,
    board_id: uuid.UUID | None = None,
    comment_id: uuid.UUID | None = None,
) -> Notification:
    """
    Insert a notification row.  No-ops if recipient == actor (no self-notifications).
    Also de-dupes follow notifications (one per (actor, recipient) pair).
    """
    if recipient_id == actor_id:
        # Return a dummy unsaved object so callers don't have to check for None
        n = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type,
        )
        return n

    # De-dupe follow: if this actor already notified this recipient of a follow, skip
    if type == NotificationType.follow:
        exists = (
            db.query(Notification)
            .filter(
                Notification.recipient_id == recipient_id,
                Notification.actor_id == actor_id,
                Notification.type == NotificationType.follow,
            )
            .first()
        )
        if exists:
            return exists

    n = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=type,
        body=body,
        outfit_id=outfit_id,
        board_id=board_id,
        comment_id=comment_id,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def get_notifications(
    db: Session,
    recipient_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Notification], str | None]:
    """Newest-first, cursor-paginated by created_at."""
    query = (
        db.query(Notification)
        .filter(Notification.recipient_id == recipient_id)
        .order_by(Notification.created_at.desc())
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        except ValueError:
            cursor_dt = None
        if cursor_dt:
            query = query.filter(Notification.created_at < cursor_dt)

    rows = query.limit(limit + 1).all()

    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = rows[-1].created_at.isoformat()

    return rows, next_cursor


def mark_seen(
    db: Session,
    recipient_id: uuid.UUID,
    notification_ids: list[uuid.UUID] | None = None,
) -> int:
    """
    Mark notifications as seen.

    If notification_ids is provided (and non-empty), only those rows are updated.
    Otherwise marks ALL unseen notifications for this recipient.

    Returns the number of rows updated.
    """
    query = db.query(Notification).filter(
        Notification.recipient_id == recipient_id,
        Notification.seen == False,  # noqa: E712
    )

    if notification_ids:
        query = query.filter(Notification.id.in_(notification_ids))

    rows = query.all()
    for row in rows:
        row.seen = True
    db.commit()
    return len(rows)


def unseen_count(db: Session, recipient_id: uuid.UUID) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.recipient_id == recipient_id,
            Notification.seen == False,  # noqa: E712
        )
        .count()
    )
