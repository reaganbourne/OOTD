import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import notification as notif_crud
from app.dependencies import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    MarkSeenRequest,
    NotificationActor,
    NotificationOut,
    NotificationPage,
    UnseenCountOut,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _notification_out(n: Notification, db: Session) -> NotificationOut:
    """Hydrate actor from DB and return a NotificationOut."""
    actor: User | None = db.get(User, n.actor_id)
    if actor is None:
        # Actor was deleted — build a placeholder
        actor_out = NotificationActor(
            id=n.actor_id,
            username=None,
            display_name=None,
            profile_image_url=None,
        )
    else:
        actor_out = NotificationActor(
            id=actor.id,
            username=actor.username,
            display_name=actor.display_name,
            profile_image_url=actor.profile_image_url,
        )

    return NotificationOut(
        id=n.id,
        type=n.type,
        seen=n.seen,
        body=n.body,
        created_at=n.created_at,
        outfit_id=n.outfit_id,
        board_id=n.board_id,
        comment_id=n.comment_id,
        actor=actor_out,
    )


@router.get("", response_model=NotificationPage)
def list_notifications(
    cursor: str | None = Query(default=None, description="ISO timestamp cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationPage:
    """
    Newest-first list of notifications for the current user.
    Cursor is the ISO `created_at` of the last item returned.
    """
    rows, next_cursor = notif_crud.get_notifications(
        db, recipient_id=current_user.id, cursor=cursor, limit=limit
    )
    return NotificationPage(
        items=[_notification_out(n, db) for n in rows],
        next_cursor=next_cursor,
    )


@router.get("/unseen-count", response_model=UnseenCountOut)
def get_unseen_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnseenCountOut:
    """Returns the number of unseen notifications for the badge."""
    count = notif_crud.unseen_count(db, current_user.id)
    return UnseenCountOut(unseen_count=count)


@router.post("/seen", status_code=status.HTTP_204_NO_CONTENT)
def mark_seen(
    body: MarkSeenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Mark notifications as seen.

    Pass `notification_ids` to mark specific ones, or an empty list / omit it
    to mark ALL unseen notifications as seen.
    """
    notif_crud.mark_seen(
        db,
        recipient_id=current_user.id,
        notification_ids=body.notification_ids or None,
    )
