import uuid
from datetime import datetime

from pydantic import BaseModel


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
