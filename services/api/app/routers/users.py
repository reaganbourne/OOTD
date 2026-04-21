import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import follow as follow_crud
from app.crud import user as user_crud
from app.crud import wrapped as wrapped_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.outfit import OutfitOut
from app.schemas.user import FollowResponse, PublicProfile
from app.schemas.wrapped import WrappedStats

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/wrapped", response_model=WrappedStats)
def get_wrapped(
    month: str = Query(..., description="Month in YYYY-MM format, e.g. 2026-04"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WrappedStats:
    """
    Monthly Fits Wrapped — stats for the current user's outfits in a given month.

    Returns totals, top colors/brands/category, vibe of the month, most active
    day of the week, longest consecutive streak, and the standout outfit.
    All fields gracefully degrade to None / [] when there is no data.
    """
    try:
        year_str, mon_str = month.split("-")
        year, mon = int(year_str), int(mon_str)
        if not (1 <= mon <= 12):
            raise ValueError
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="month must be in YYYY-MM format (e.g. 2026-04).",
        )

    stats = wrapped_crud.get_wrapped_stats(db, current_user.id, year, mon)
    top_outfit_out = OutfitOut.model_validate(stats["top_outfit"]) if stats["top_outfit"] else None
    return WrappedStats(**{**stats, "top_outfit": top_outfit_out})


@router.get("/{username}", response_model=PublicProfile)
def get_profile(username: str, db: Session = Depends(get_db)) -> PublicProfile:
    """Public profile — no auth required."""
    user = user_crud.get_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return PublicProfile(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio,
        profile_image_url=user.profile_image_url,
        follower_count=follow_crud.follower_count(db, user.id),
        following_count=follow_crud.following_count(db, user.id),
        created_at=user.created_at,
    )


@router.post("/{user_id}/follow", response_model=FollowResponse)
def follow_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowResponse:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself.")
    if not user_crud.get_by_id(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    follow_crud.follow(db, follower_id=current_user.id, following_id=user_id)
    return FollowResponse(following=True, follower_count=follow_crud.follower_count(db, user_id))


@router.delete("/{user_id}/follow", response_model=FollowResponse)
def unfollow_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowResponse:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot unfollow yourself.")
    if not user_crud.get_by_id(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    follow_crud.unfollow(db, follower_id=current_user.id, following_id=user_id)
    return FollowResponse(following=False, follower_count=follow_crud.follower_count(db, user_id))
