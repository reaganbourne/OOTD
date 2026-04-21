"""Response schema for the Monthly Fits Wrapped endpoint."""

from pydantic import BaseModel

from app.schemas.outfit import OutfitOut


class WrappedStats(BaseModel):
    """
    Monthly stats for a user's outfits — returned by GET /users/me/wrapped.

    All list fields are ordered by frequency (most common first).
    Fields are None / empty when there is no data for that stat.
    """

    month: str                      # "2026-04"
    total_outfits: int
    top_colors: list[str]           # up to 3, most frequent first
    top_brands: list[str]           # up to 3, most frequent first
    top_category: str | None        # single most-used clothing category
    vibe_of_month: str | None       # most common vibe_check_tone
    most_active_day: str | None     # e.g. "Monday"
    longest_streak: int             # consecutive calendar days with an outfit
    top_outfit: OutfitOut | None    # outfit with the most tagged clothing items
