import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PublicProfile(BaseModel):
    id: uuid.UUID
    username: str | None
    display_name: str | None
    bio: str | None
    profile_image_url: str | None
    follower_count: int
    following_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowResponse(BaseModel):
    following: bool
    follower_count: int


class UpdateProfileRequest(BaseModel):
    """All fields are optional — only provided fields are updated (PATCH semantics)."""

    display_name: str | None = Field(default=None, max_length=64)
    bio: str | None = Field(default=None, max_length=160)
    username: str | None = Field(default=None, min_length=2, max_length=30)

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, underscores, and dots.")
        return v.lower()


class SearchResult(BaseModel):
    """Slim profile returned by search and suggested-users endpoints."""

    id: uuid.UUID
    username: str | None
    display_name: str | None
    profile_image_url: str | None
    follower_count: int

    model_config = {"from_attributes": True}
