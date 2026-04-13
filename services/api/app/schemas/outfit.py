import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


# ------------------------------------------------------------------ input


class ClothingItemIn(BaseModel):
    brand: str | None = None
    category: str
    color: str | None = None
    display_order: int = 0


class OutfitMetadata(BaseModel):
    """
    The non-file fields for POST /outfits, sent as a JSON string in the
    multipart form field named 'metadata'.

    Example (JavaScript):
        const form = new FormData()
        form.append('image', file)
        form.append('metadata', JSON.stringify({
            caption: 'Sunday brunch fit',
            clothing_items: [{ category: 'top', brand: 'Zara', color: 'white' }]
        }))
    """

    caption: str | None = None
    event_name: str | None = None
    worn_on: date | None = None
    clothing_items: list[ClothingItemIn] = Field(default_factory=list)


# ------------------------------------------------------------------ output


class ClothingItemOut(BaseModel):
    id: uuid.UUID
    outfit_id: uuid.UUID
    brand: str | None
    category: str
    color: str | None
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class OutfitOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    image_url: str
    caption: str | None
    event_name: str | None
    worn_on: date | None
    vibe_check_text: str | None
    vibe_check_tone: str | None
    created_at: datetime
    updated_at: datetime
    clothing_items: list[ClothingItemOut]

    model_config = {"from_attributes": True}
