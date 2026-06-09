"""Response schema for the Monthly Fits Wrapped endpoint."""

from pydantic import BaseModel


class ColorCount(BaseModel):
    color: str
    count: int


class BrandCount(BaseModel):
    brand: str
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class WeekCount(BaseModel):
    week: int
    count: int


class WrappedStats(BaseModel):
    """
    Monthly stats for a user's outfits — returned by GET /users/me/wrapped.

    All list fields are ordered by frequency (most common first).
    Fields are None / empty when there is no data for that stat.
    """

    year: int
    month: int
    total_outfits: int
    total_items: int
    top_colors: list[ColorCount]
    top_brands: list[BrandCount]
    top_categories: list[CategoryCount]
    longest_streak: int
    current_streak: int
    most_worn_vibe: str | None
    outfits_by_week: list[WeekCount]
