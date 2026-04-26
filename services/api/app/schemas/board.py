"""Pydantic schemas for the boards feature."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.outfit import OutfitOut


class CreateBoardRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    event_date: date | None = None


class BoardOut(BaseModel):
    id: uuid.UUID
    name: str
    event_date: date | None
    invite_code: str
    creator_id: uuid.UUID
    expires_at: datetime
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BoardMemberOut(BaseModel):
    user_id: uuid.UUID
    username: str | None
    display_name: str | None
    profile_image_url: str | None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class BoardOutfitPage(BaseModel):
    outfits: list[OutfitOut]
    next_cursor: str | None


class PinRequest(BaseModel):
    pinned: bool
