"""
CRUD helpers for Monthly Fits Wrapped stats.

All queries are scoped to a single user + calendar month.
The "outfit date" for each outfit is coalesce(worn_on, created_at::date) so
outfits without an explicit worn_on date still contribute to the stats.
"""

import uuid
from collections import Counter
from datetime import date, timedelta

from sqlalchemy import cast, Date, func
from sqlalchemy.orm import Session

from app.models.clothing_item import ClothingItem
from app.models.outfit import Outfit

# Day-of-week index → name (PostgreSQL EXTRACT('dow') returns 0=Sunday)
_DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def get_wrapped_stats(
    db: Session,
    user_id: uuid.UUID,
    year: int,
    month: int,
) -> dict:
    """
    Compute monthly wrapped stats for one user.

    Returns a plain dict matching the WrappedStats schema so the router can
    call WrappedStats(**stats) without any extra transformation.
    """
    month_label = f"{year}-{month:02d}"
    empty = {
        "month": month_label,
        "total_outfits": 0,
        "top_colors": [],
        "top_brands": [],
        "top_category": None,
        "vibe_of_month": None,
        "most_active_day": None,
        "longest_streak": 0,
        "top_outfit": None,
    }

    # ── Derived date expression ──────────────────────────────────────────────
    # worn_on is a Date; created_at is a DateTime — cast to Date before coalesce.
    outfit_date = func.coalesce(Outfit.worn_on, cast(Outfit.created_at, Date))

    # ── 1. Fetch all outfits in the month ────────────────────────────────────
    outfits = (
        db.query(Outfit)
        .filter(Outfit.user_id == user_id)
        .filter(func.extract("year", outfit_date) == year)
        .filter(func.extract("month", outfit_date) == month)
        .all()
    )

    if not outfits:
        return empty

    outfit_ids = [o.id for o in outfits]

    # ── 2. Top colors (from clothing items) ──────────────────────────────────
    color_rows = (
        db.query(ClothingItem.color, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .filter(ClothingItem.color.isnot(None))
        .group_by(ClothingItem.color)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_colors = [r.color for r in color_rows]

    # ── 3. Top brands ────────────────────────────────────────────────────────
    brand_rows = (
        db.query(ClothingItem.brand, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .filter(ClothingItem.brand.isnot(None))
        .group_by(ClothingItem.brand)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_brands = [r.brand for r in brand_rows]

    # ── 4. Top category ──────────────────────────────────────────────────────
    cat_row = (
        db.query(ClothingItem.category, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .group_by(ClothingItem.category)
        .order_by(func.count().desc())
        .first()
    )
    top_category = cat_row.category if cat_row else None

    # ── 5. Vibe of the month ─────────────────────────────────────────────────
    vibe_counts = Counter(o.vibe_check_tone for o in outfits if o.vibe_check_tone)
    vibe_of_month = vibe_counts.most_common(1)[0][0] if vibe_counts else None

    # ── 6. Most active day of week ───────────────────────────────────────────
    dow_row = (
        db.query(
            func.extract("dow", outfit_date).label("dow"),
            func.count().label("cnt"),
        )
        .filter(Outfit.user_id == user_id)
        .filter(func.extract("year", outfit_date) == year)
        .filter(func.extract("month", outfit_date) == month)
        .group_by(func.extract("dow", outfit_date))
        .order_by(func.count().desc())
        .first()
    )
    most_active_day = _DOW_NAMES[int(dow_row.dow)] if dow_row else None

    # ── 7. Longest consecutive-day streak ────────────────────────────────────
    worn_dates = sorted({
        (o.worn_on if o.worn_on else o.created_at.date())
        for o in outfits
    })
    longest_streak = _longest_streak(worn_dates)

    # ── 8. Top outfit (most tagged clothing items; newest as tiebreaker) ─────
    top_outfit = max(outfits, key=lambda o: (len(o.clothing_items), o.created_at))

    return {
        "month": month_label,
        "total_outfits": len(outfits),
        "top_colors": top_colors,
        "top_brands": top_brands,
        "top_category": top_category,
        "vibe_of_month": vibe_of_month,
        "most_active_day": most_active_day,
        "longest_streak": longest_streak,
        "top_outfit": top_outfit,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _longest_streak(dates: list[date]) -> int:
    """Return the length of the longest run of consecutive calendar dates."""
    if not dates:
        return 0
    best = current = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]) == timedelta(days=1):
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best
