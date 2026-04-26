"""
Board endpoints — collaborative event outfit boards.

All board content is private: only members can read or post.
The invite_code is the only way to join.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import board as board_crud
from app.crud import outfit as outfit_crud
from app.crud import user as user_crud
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.board import (
    BoardMemberOut,
    BoardOut,
    BoardOutfitPage,
    CreateBoardRequest,
    PinRequest,
)
from app.schemas.outfit import OutfitOut

router = APIRouter(prefix="/boards", tags=["boards"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _board_or_404(db: Session, board_id: uuid.UUID):
    board = board_crud.get_board(db, board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found.")
    return board


def _require_member(db: Session, board_id: uuid.UUID, user_id: uuid.UUID):
    if not board_crud.is_member(db, board_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a board member.")


def _require_creator(db: Session, board_id: uuid.UUID, user_id: uuid.UUID):
    if not board_crud.is_creator(db, board_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the board creator can do this.")


def _board_out(db: Session, board) -> BoardOut:
    return BoardOut(
        id=board.id,
        name=board.name,
        event_date=board.event_date,
        invite_code=board.invite_code,
        creator_id=board.creator_id,
        expires_at=board.expires_at,
        member_count=board_crud.member_count(db, board.id),
        created_at=board.created_at,
    )


# ── Board lifecycle ───────────────────────────────────────────────────────────

@router.post("", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
def create_board(
    body: CreateBoardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardOut:
    """Create a new board. The creator is automatically added as the first member."""
    board = board_crud.create_board(
        db,
        creator_id=current_user.id,
        name=body.name,
        event_date=body.event_date,
    )
    return _board_out(db, board)


@router.get("/me", response_model=list[BoardOut])
def my_boards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BoardOut]:
    """All boards the current user belongs to, newest first."""
    boards = board_crud.get_user_boards(db, current_user.id)
    return [_board_out(db, b) for b in boards]


@router.get("/{board_id}", response_model=BoardOut)
def get_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardOut:
    """Get board details. Members only."""
    board = _board_or_404(db, board_id)
    _require_member(db, board_id, current_user.id)
    return _board_out(db, board)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a board and all its content. Creator only."""
    board = _board_or_404(db, board_id)
    _require_creator(db, board_id, current_user.id)
    board_crud.delete_board(db, board)


# ── Joining ───────────────────────────────────────────────────────────────────

@router.get("/invite/{invite_code}", response_model=BoardOut)
def preview_board(
    invite_code: str,
    db: Session = Depends(get_db),
) -> BoardOut:
    """
    Preview a board via invite link — no auth required.
    Returns board info so the frontend can show a 'Join' screen before auth.
    """
    board = board_crud.get_by_invite_code(db, invite_code)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found.")
    return _board_out(db, board)


@router.post("/invite/{invite_code}/join", response_model=BoardOut)
def join_board(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardOut:
    """Join a board using an invite code. Idempotent — safe to call multiple times."""
    board = board_crud.get_by_invite_code(db, invite_code)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found.")
    board_crud.join_board(db, board.id, current_user.id)
    return _board_out(db, board)


# ── Membership ────────────────────────────────────────────────────────────────

@router.get("/{board_id}/members", response_model=list[BoardMemberOut])
def list_members(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BoardMemberOut]:
    """List all members. Members only."""
    _board_or_404(db, board_id)
    _require_member(db, board_id, current_user.id)
    members = board_crud.get_members(db, board_id)
    result = []
    for m in members:
        user = user_crud.get_by_id(db, m.user_id)
        result.append(BoardMemberOut(
            user_id=m.user_id,
            username=user.username if user else None,
            display_name=user.display_name if user else None,
            profile_image_url=user.profile_image_url if user else None,
            role=m.role,
            joined_at=m.joined_at,
        ))
    return result


@router.delete("/{board_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Leave a board. The creator cannot leave (must delete the board instead)."""
    _board_or_404(db, board_id)
    if board_crud.is_creator(db, board_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Creator cannot leave — delete the board instead.",
        )
    board_crud.leave_board(db, board_id, current_user.id)


@router.delete("/{board_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    board_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove a member from the board. Creator only — cannot remove yourself."""
    _board_or_404(db, board_id)
    _require_creator(db, board_id, current_user.id)
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself.")
    if board_crud.is_creator(db, board_id, user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the creator.")
    board_crud.remove_member(db, board_id, user_id)


# ── Board outfits ─────────────────────────────────────────────────────────────

@router.post("/{board_id}/outfits", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def add_outfit(
    board_id: uuid.UUID,
    outfit_id: uuid.UUID = Query(..., description="UUID of the outfit to add"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    """Add an outfit to a board. Members only. The outfit must exist."""
    _board_or_404(db, board_id)
    _require_member(db, board_id, current_user.id)
    outfit = outfit_crud.get_outfit_with_items(db, outfit_id)
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found.")
    board_crud.add_outfit(db, board_id, outfit_id, current_user.id)
    return OutfitOut.model_validate(outfit)


@router.get("/{board_id}/outfits", response_model=BoardOutfitPage)
def get_outfits(
    board_id: uuid.UUID,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardOutfitPage:
    """
    Outfits on a board — pinned first, then newest-added.
    Members only. Cursor-paginated.
    """
    _board_or_404(db, board_id)
    _require_member(db, board_id, current_user.id)
    outfits, next_cursor = board_crud.get_board_outfits(db, board_id, cursor, limit)
    return BoardOutfitPage(
        outfits=[OutfitOut.model_validate(o) for o in outfits],
        next_cursor=next_cursor,
    )


@router.delete("/{board_id}/outfits/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_outfit(
    board_id: uuid.UUID,
    outfit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove an outfit from a board. Creator can remove any; members can remove their own."""
    _board_or_404(db, board_id)
    _require_member(db, board_id, current_user.id)
    board_crud.remove_outfit(db, board_id, outfit_id)


@router.patch("/{board_id}/outfits/{outfit_id}/pin", response_model=OutfitOut)
def pin_outfit(
    board_id: uuid.UUID,
    outfit_id: uuid.UUID,
    body: PinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    """Pin or unpin an outfit on a board. Creator only."""
    _board_or_404(db, board_id)
    _require_creator(db, board_id, current_user.id)
    bo = board_crud.pin_outfit(db, board_id, outfit_id, body.pinned)
    if not bo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not on this board.")
    outfit = outfit_crud.get_outfit_with_items(db, outfit_id)
    return OutfitOut.model_validate(outfit)
