import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationActor(BaseModel):
    id: uuid.UUID
    username: str | None
    display_name: str | None
    profile_image_url: str | None

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: NotificationType
    seen: bool
    body: str | None
    created_at: datetime

    # Contextual FKs — frontend decides which to use based on type
    outfit_id: uuid.UUID | None = None
    board_id: uuid.UUID | None = None
    comment_id: uuid.UUID | None = None

    actor: NotificationActor

    model_config = {"from_attributes": True}


class NotificationPage(BaseModel):
    items: list[NotificationOut]
    next_cursor: str | None


class UnseenCountOut(BaseModel):
    unseen_count: int


class MarkSeenRequest(BaseModel):
    """If notification_ids is empty/omitted, marks ALL unseen as seen."""
    notification_ids: list[uuid.UUID] = []
