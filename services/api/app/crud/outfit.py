import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status as http_status

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

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
    return (
        db.query(Outfit)
        .options(selectinload(Outfit.clothing_items))
        .filter(Outfit.id == outfit_id)
        .first()
    )


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
    query = (
        db.query(Outfit)
        .options(selectinload(Outfit.clothing_items))
        .filter(Outfit.user_id == user_id)
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        except ValueError:
            raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid cursor.")
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

    query = (
        db.query(Outfit)
        .options(selectinload(Outfit.clothing_items))
        .filter(Outfit.user_id.in_(following_ids))
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        except ValueError:
            raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid cursor.")
        query = query.filter(Outfit.created_at < cursor_dt)

    outfits = query.order_by(Outfit.created_at.desc()).limit(limit + 1).all()

    next_cursor = None
    if len(outfits) > limit:
        outfits = outfits[:limit]
        next_cursor = outfits[-1].created_at.isoformat()

    return outfits, next_cursor


def get_explore(
    db: Session,
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Outfit], str | None]:
    """
    All outfits on the platform, newest first.
    No user filter — public explore feed. Cursor-paginated.
    """
    query = (
        db.query(Outfit)
        .options(selectinload(Outfit.clothing_items))
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        except ValueError:
            raise HTTPException(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid cursor.")
        query = query.filter(Outfit.created_at < cursor_dt)

    outfits = query.order_by(Outfit.created_at.desc()).limit(limit + 1).all()

    next_cursor = None
    if len(outfits) > limit:
        outfits = outfits[:limit]
        next_cursor = outfits[-1].created_at.isoformat()

    return outfits, next_cursor


def delete_outfit(db: Session, outfit: "Outfit") -> None:
    """Permanently delete an outfit. Uses a direct SQL DELETE so SQLAlchemy
    doesn't try to nullify the non-nullable clothing_item.outfit_id FK before
    the row is gone — Postgres CASCADE handles child rows automatically."""
    from sqlalchemy import delete as sql_delete
    db.execute(sql_delete(Outfit).where(Outfit.id == outfit.id))
    db.commit()
