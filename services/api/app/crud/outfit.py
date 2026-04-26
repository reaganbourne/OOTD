import uuid
from datetime import date, datetime, timezone

from sqlalchemy import or_
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
    vibe_check_text: str | None = None,
    vibe_check_tone: str | None = None,
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
        vibe_check_text=vibe_check_text,
        vibe_check_tone=vibe_check_tone,
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
                link_url=item.link_url,
            )
        )

    db.commit()
    db.refresh(outfit)
    return outfit


def get_outfit_with_items(db: Session, outfit_id: uuid.UUID) -> Outfit | None:
    return db.query(Outfit).filter(Outfit.id == outfit_id).first()


def get_user_outfits(
    db: Session,
    user_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Outfit], str | None]:
    """
    Paginated vault for one user, newest first.
    cursor is the ISO timestamp of the last item seen.
    Returns (outfits, next_cursor).
    """
    query = db.query(Outfit).filter(Outfit.user_id == user_id)

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        query = query.filter(Outfit.created_at < cursor_dt)

    outfits = query.order_by(Outfit.created_at.desc()).limit(limit + 1).all()

    next_cursor = None
    if len(outfits) > limit:
        outfits = outfits[:limit]
        next_cursor = outfits[-1].created_at.isoformat()

    return outfits, next_cursor


def search_user_outfits(
    db: Session,
    user_id: uuid.UUID,
    q: str,
    limit: int = 20,
) -> list[Outfit]:
    """
    Full-text search within a user's own vault.
    Matches against caption, event_name, and any clothing item's brand/category/color.
    Returns newest-first, capped at limit.
    """
    term = f"%{q.lower()}%"
    from sqlalchemy import func

    # Outfits that match caption or event_name directly
    direct_match = (
        db.query(Outfit.id)
        .filter(
            Outfit.user_id == user_id,
            or_(
                func.lower(Outfit.caption).like(term),
                func.lower(Outfit.event_name).like(term),
            ),
        )
    )

    # Outfits whose clothing items match brand/category/color
    item_match = (
        db.query(ClothingItem.outfit_id)
        .join(Outfit, Outfit.id == ClothingItem.outfit_id)
        .filter(
            Outfit.user_id == user_id,
            or_(
                func.lower(ClothingItem.brand).like(term),
                func.lower(ClothingItem.category).like(term),
                func.lower(ClothingItem.color).like(term),
            ),
        )
    )

    all_ids = direct_match.union(item_match).subquery()

    return (
        db.query(Outfit)
        .filter(Outfit.id.in_(all_ids.select()))
        .order_by(Outfit.created_at.desc())
        .limit(limit)
        .all()
    )


def get_feed(
    db: Session,
    following_ids: list[uuid.UUID],
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Outfit], str | None]:
    """
    Feed of outfits from a set of users, newest first.
    Returns empty list immediately if following_ids is empty.
    """
    if not following_ids:
        return [], None

    query = db.query(Outfit).filter(Outfit.user_id.in_(following_ids))

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        query = query.filter(Outfit.created_at < cursor_dt)

    outfits = query.order_by(Outfit.created_at.desc()).limit(limit + 1).all()

    next_cursor = None
    if len(outfits) > limit:
        outfits = outfits[:limit]
        next_cursor = outfits[-1].created_at.isoformat()

    return outfits, next_cursor
