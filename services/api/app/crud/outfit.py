import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.clothing_item import ClothingItem
from app.models.outfit import Outfit
from app.schemas.outfit import ClothingItemIn


def create_outfit(
    db: Session,
    user_id: uuid.UUID,
    image_url: str,
    clothing_items: list[ClothingItemIn],
    caption: str | None = None,
    event_name: str | None = None,
    worn_on: date | None = None,
) -> Outfit:
    """
    Insert one outfit row and all its clothing_items in a single transaction.
    Returns the outfit with clothing_items already loaded.
    """
    outfit = Outfit(
        user_id=user_id,
        image_url=image_url,
        caption=caption,
        event_name=event_name,
        worn_on=worn_on,
    )
    db.add(outfit)
    db.flush()  # get outfit.id without committing yet

    for item in clothing_items:
        db.add(
            ClothingItem(
                outfit_id=outfit.id,
                brand=item.brand,
                category=item.category,
                color=item.color,
                display_order=item.display_order,
            )
        )

    db.commit()
    db.refresh(outfit)
    return outfit


def get_outfit_with_items(db: Session, outfit_id: uuid.UUID) -> Outfit | None:
    return db.query(Outfit).filter(Outfit.id == outfit_id).first()
