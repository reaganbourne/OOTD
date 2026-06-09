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

    Returns a plain dict matching the WrappedStats schema.
    """
    empty = {
        "year": year,
        "month": month,
        "total_outfits": 0,
        "total_items": 0,
        "top_colors": [],
        "top_brands": [],
        "top_categories": [],
        "longest_streak": 0,
        "current_streak": 0,
        "most_worn_vibe": None,
        "outfits_by_week": [],
    }

    # ── Derived date expression ──────────────────────────────────────────────
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

    # ── 2. Total clothing items ──────────────────────────────────────────────
    total_items = (
        db.query(func.count(ClothingItem.id))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .scalar() or 0
    )

    # ── 3. Top colors ────────────────────────────────────────────────────────
    color_rows = (
        db.query(ClothingItem.color, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .filter(ClothingItem.color.isnot(None))
        .group_by(ClothingItem.color)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_colors = [{"color": r.color, "count": r.cnt} for r in color_rows]

    # ── 4. Top brands ────────────────────────────────────────────────────────
    brand_rows = (
        db.query(ClothingItem.brand, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .filter(ClothingItem.brand.isnot(None))
        .group_by(ClothingItem.brand)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_brands = [{"brand": r.brand, "count": r.cnt} for r in brand_rows]

    # ── 5. Top categories ────────────────────────────────────────────────────
    cat_rows = (
        db.query(ClothingItem.category, func.count().label("cnt"))
        .filter(ClothingItem.outfit_id.in_(outfit_ids))
        .filter(ClothingItem.category.isnot(None))
        .group_by(ClothingItem.category)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_categories = [{"category": r.category, "count": r.cnt} for r in cat_rows]

    # ── 6. Most worn vibe ────────────────────────────────────────────────────
    vibe_counts = Counter(o.vibe_check_tone for o in outfits if o.vibe_check_tone)
    most_worn_vibe = vibe_counts.most_common(1)[0][0] if vibe_counts else None

    # ── 7. Outfits by week-of-month ──────────────────────────────────────────
    # Week 1 = days 1-7, week 2 = days 8-14, week 3 = days 15-21, week 4 = 22+
    week_counter: Counter = Counter()
    for o in outfits:
        d = o.worn_on if o.worn_on else o.created_at.date()
        week_num = min((d.day - 1) // 7 + 1, 4)
        week_counter[week_num] += 1
    outfits_by_week = [
        {"week": w, "count": week_counter.get(w, 0)}
        for w in range(1, 5)
    ]

    # ── 8. Longest streak ────────────────────────────────────────────────────
    worn_dates = sorted({
        (o.worn_on if o.worn_on else o.created_at.date())
        for o in outfits
    })
    longest_streak = _longest_streak(worn_dates)

    # ── 9. Current streak (streak ending on or including the last outfit date) ─
    all_dates_ever = sorted({
        (o.worn_on if o.worn_on else o.created_at.date())
        for o in db.query(Outfit)
        .filter(Outfit.user_id == user_id)
        .all()
    })
    current_streak = _current_streak(all_dates_ever)

    return {
        "year": year,
        "month": month,
        "total_outfits": len(outfits),
        "total_items": total_items,
        "top_colors": top_colors,
        "top_brands": top_brands,
        "top_categories": top_categories,
        "longest_streak": longest_streak,
        "current_streak": current_streak,
        "most_worn_vibe": most_worn_vibe,
        "outfits_by_week": outfits_by_week,
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


def _current_streak(dates: list[date]) -> int:
    """Return the current consecutive streak ending today or yesterday."""
    if not dates:
        return 0
    today = date.today()
    streak = 0
    check = today
    date_set = set(dates)
    while check in date_set:
        streak += 1
        check -= timedelta(days=1)
    # also accept a streak ending yesterday
    if streak == 0:
        check = today - timedelta(days=1)
        while check in date_set:
            streak += 1
            check -= timedelta(days=1)
    return streak
