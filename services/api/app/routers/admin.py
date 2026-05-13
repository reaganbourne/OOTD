import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import board as board_crud
from app.crud import outfit as outfit_crud
from app.dependencies import get_db, require_admin
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.delete("/outfits/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_outfit(
    outfit_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    """Admin: delete any outfit regardless of ownership."""
    outfit = outfit_crud.get_outfit_with_items(db, outfit_id)
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found.")
    outfit_crud.delete_outfit(db, outfit)


@router.delete("/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_board(
    board_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    """Admin: delete any board regardless of ownership."""
    board = board_crud.get_board(db, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found.")
    board_crud.delete_board(db, board)
