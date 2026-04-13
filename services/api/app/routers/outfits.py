import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.crud import outfit as outfit_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.outfit import OutfitMetadata, OutfitOut
from app.services.storage import InvalidImageError, StorageError, upload_image

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
                    clothing_items: [{ category, brand, color, display_order }]

    Example fetch (JavaScript):
        const form = new FormData()
        form.append('image', file)
        form.append('metadata', JSON.stringify({
            caption: 'Sunday brunch fit',
            worn_on: '2026-04-13',
            clothing_items: [
                { category: 'top', brand: 'Zara', color: 'white', display_order: 0 },
                { category: 'pants', brand: 'Levis', color: 'blue', display_order: 1 },
            ]
        }))
        await fetch('/outfits', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        })
    """
    # Parse metadata JSON
    try:
        meta = OutfitMetadata.model_validate(json.loads(metadata))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid metadata JSON: {exc}",
        )

    # Upload image to S3
    try:
        file_bytes = image.file.read()
        image_url = upload_image(
            file_bytes=file_bytes,
            content_type=image.content_type or "",
            user_id=current_user.id,
        )
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

    # Persist to DB
    outfit = outfit_crud.create_outfit(
        db,
        user_id=current_user.id,
        image_url=image_url,
        caption=meta.caption,
        event_name=meta.event_name,
        worn_on=meta.worn_on,
        clothing_items=meta.clothing_items,
    )

    return OutfitOut.model_validate(outfit)
