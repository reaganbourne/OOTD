import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.crud import follow as follow_crud
from app.crud import outfit as outfit_crud
from app.crud import user as user_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.outfit import OutfitMetadata, OutfitOut, VaultPage
from app.services.storage import InvalidImageError, StorageError, upload_image
from app.services.vibe_check import run_vibe_check

router = APIRouter(prefix="/outfits", tags=["outfits"])


@router.post("", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(
    image: UploadFile = File(...),
    metadata: str = Form(default="{}"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    """
    Create a new outfit with an image and optional clothing items.

    Request: multipart/form-data
      - image:    the photo file (jpeg, png, webp, or heic — max 10 MB)
      - metadata: JSON string with optional fields:
                    caption, event_name, worn_on (YYYY-MM-DD),
                    clothing_items: [{ category, brand, color, display_order, link_url }]
    """
    try:
        meta = OutfitMetadata.model_validate(json.loads(metadata))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid metadata JSON: {exc}")

    try:
        file_bytes = image.file.read()
        content_type = image.content_type or ""
        image_url = upload_image(file_bytes=file_bytes, content_type=content_type, user_id=current_user.id)
    except InvalidImageError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # Vibe check is best-effort — never blocks outfit creation if it fails.
    vibe_check_text, vibe_check_tone = run_vibe_check(
        file_bytes=file_bytes,
        content_type=content_type,
        caption=meta.caption,
    )

    outfit = outfit_crud.create_outfit(
        db,
        user_id=current_user.id,
        image_url=image_url,
        caption=meta.caption,
        event_name=meta.event_name,
        worn_on=meta.worn_on,
        clothing_items=meta.clothing_items,
        vibe_check_text=vibe_check_text,
        vibe_check_tone=vibe_check_tone,
    )
    return OutfitOut.model_validate(outfit)


@router.get("/feed", response_model=VaultPage)
def get_feed(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VaultPage:
    """
    Outfits from users the current user follows, newest first.
    Returns an empty list if the user follows nobody yet.
    """
    ids = follow_crud.following_ids(db, current_user.id)
    outfits, next_cursor = outfit_crud.get_feed(db, ids, cursor, limit)
    return VaultPage(outfits=[OutfitOut.model_validate(o) for o in outfits], next_cursor=next_cursor)


@router.get("/me", response_model=VaultPage)
def my_vault(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VaultPage:
    """Current user's own vault, newest first."""
    outfits, next_cursor = outfit_crud.get_user_outfits(db, current_user.id, cursor, limit)
    return VaultPage(outfits=[OutfitOut.model_validate(o) for o in outfits], next_cursor=next_cursor)


@router.get("/user/{username}", response_model=VaultPage)
def user_vault(
    username: str,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> VaultPage:
    """Public vault for any user — no auth required."""
    user = user_crud.get_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    outfits, next_cursor = outfit_crud.get_user_outfits(db, user.id, cursor, limit)
    return VaultPage(outfits=[OutfitOut.model_validate(o) for o in outfits], next_cursor=next_cursor)
