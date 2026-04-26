"""Pydantic schemas for likes and comments."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Likes ─────────────────────────────────────────────────────────────────────

class LikeStatus(BaseModel):
    """Returned by like/unlike/get-like-status endpoints."""
    like_count: int
    liked: bool


# ── Comments ──────────────────────────────────────────────────────────────────

class CommentAuthor(BaseModel):
    id: uuid.UUID
    username: str | None
    display_name: str | None
    profile_image_url: str | None

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: uuid.UUID
    outfit_id: uuid.UUID
    user_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime
    author: CommentAuthor

    model_config = {"from_attributes": True}


class CommentPage(BaseModel):
    comments: list[CommentOut]
    next_cursor: str | None


class CreateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)


class UpdateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)
