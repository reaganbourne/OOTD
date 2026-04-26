import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.crud import follow as follow_crud
from app.crud import user as user_crud
from app.crud import wrapped as wrapped_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.outfit import OutfitOut
from app.schemas.user import FollowResponse, PublicProfile, SearchResult, UpdateProfileRequest
from app.schemas.wrapped import WrappedStats
from app.services.storage import InvalidImageError, StorageError, upload_image

router = APIRouter(prefix="/users", tags=["users"])


# ── /me routes (must come before /{username} to avoid capture) ───────────────

@router.patch("/me", response_model=PublicProfile)
def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PublicProfile:
    """
    Partial profile update — only fields included in the request body are changed.
    Omit a field entirely to leave it unchanged.
    """
    # Check username uniqueness if caller wants to change it
    if body.username is not None and body.username != current_user.username:
        if user_crud.get_by_username(db, body.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken.",
            )

    from app.crud.user import _UNSET
    user = user_crud.update_profile(
        db,
        current_user,
        display_name=body.display_name if body.display_name is not None else _UNSET,
        bio=body.bio if body.bio is not None else _UNSET,
        username=body.username if body.username is not None else _UNSET,
    )
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


@router.post("/me/avatar", response_model=PublicProfile)
def upload_avatar(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PublicProfile:
    """
    Upload or replace the current user's profile photo.
    Accepts JPEG, PNG, WebP, HEIC — max 10 MB.
    """
    try:
        file_bytes = image.file.read()
        url = upload_image(
            file_bytes=file_bytes,
            content_type=image.content_type or "",
            user_id=current_user.id,
            key_prefix="avatars",
        )
    except InvalidImageError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    user = user_crud.set_avatar(db, current_user, url)
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


@router.get("/me/wrapped", response_model=WrappedStats)
def get_wrapped(
    month: str = Query(..., description="Month in YYYY-MM format, e.g. 2026-04"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WrappedStats:
    """Monthly Fits Wrapped — stats for the current user's outfits in a given month."""
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


@router.get("/search", response_model=list[SearchResult])
def search_users(
    q: str = Query(..., min_length=1, max_length=50, description="Search term"),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[SearchResult]:
    """
    Search users by username or display name. No auth required.
    Returns up to `limit` results ordered alphabetically by username.
    """
    users = user_crud.search(db, q.strip(), limit)
    return [
        SearchResult(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            profile_image_url=u.profile_image_url,
            follower_count=follow_crud.follower_count(db, u.id),
        )
        for u in users
    ]


@router.get("/suggested", response_model=list[SearchResult])
def suggested_users(
    limit: int = Query(default=10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SearchResult]:
    """
    Suggested users to follow — friends of friends first, then most-followed globally.
    Excludes users already followed and the current user.
    """
    users = user_crud.suggested(db, current_user.id, limit)
    return [
        SearchResult(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            profile_image_url=u.profile_image_url,
            follower_count=follow_crud.follower_count(db, u.id),
        )
        for u in users
    ]


# ── /{username} and /{user_id} routes ────────────────────────────────────────

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
