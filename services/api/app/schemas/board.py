"""Pydantic schemas for the boards feature."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.outfit import BoardOutfitPage, OutfitOut  # noqa: F401 (re-exported)


class CreateBoardRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    event_date: date | None = None


class UpdateBoardRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    media_link: str | None = Field(None, max_length=500)


class BoardOut(BaseModel):
    id: uuid.UUID
    name: str
    event_date: date | None
    invite_code: str
    creator_id: uuid.UUID
    expires_at: datetime
    member_count: int
    created_at: datetime
    media_link: str | None = None

    model_config = {"from_attributes": True}


class BoardMemberOut(BaseModel):
    user_id: uuid.UUID
    username: str | None
    display_name: str | None
    profile_image_url: str | None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


# BoardOutfitPage is defined in schemas.outfit (re-exported above) so the
# boards router can import it from either location.


class PinRequest(BaseModel):
    pinned: bool
