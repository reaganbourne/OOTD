"""
CRUD helpers for the boards feature.

Boards are private collaborative spaces — only members can see content.
The creator is a permanent member with admin rights.
"""

import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.board import Board, BoardMember, BoardOutfit
from app.models.outfit import Outfit

_CODE_CHARS = string.ascii_letters + string.digits
_CODE_LEN = 8
_DEFAULT_EXPIRY_DAYS = 30


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_invite_code(db: Session) -> str:
    """Generate a unique 8-character alphanumeric invite code."""
    for _ in range(10):
        code = "".join(secrets.choice(_CODE_CHARS) for _ in range(_CODE_LEN))
        if not db.query(Board).filter(Board.invite_code == code).first():
            return code
    raise RuntimeError("Could not generate unique invite code after 10 attempts")


def _expires_at(event_date) -> datetime:
    """Board expires 30 days after event_date, or 30 days from now if no event_date."""
    from datetime import date
    base = event_date if event_date else datetime.now(timezone.utc).date()
    from datetime import datetime as dt
    return dt.combine(base, dt.min.time()).replace(tzinfo=timezone.utc) + timedelta(days=_DEFAULT_EXPIRY_DAYS)


# ── Board lifecycle ───────────────────────────────────────────────────────────

def create_board(
    db: Session,
    creator_id: uuid.UUID,
    name: str,
    event_date=None,
) -> Board:
    """Create a board and add the creator as the first member."""
    board = Board(
        creator_id=creator_id,
        name=name,
        event_date=event_date,
        invite_code=_generate_invite_code(db),
        expires_at=_expires_at(event_date),
    )
    db.add(board)
    db.flush()

    db.add(BoardMember(board_id=board.id, user_id=creator_id, role="creator"))
    db.commit()
    db.refresh(board)
    return board


def get_board(db: Session, board_id: uuid.UUID) -> Board | None:
    return db.query(Board).filter(Board.id == board_id).first()


def get_by_invite_code(db: Session, invite_code: str) -> Board | None:
    return db.query(Board).filter(Board.invite_code == invite_code).first()


def delete_board(db: Session, board: Board) -> None:
    db.delete(board)
    db.commit()


def get_user_boards(db: Session, user_id: uuid.UUID) -> list[Board]:
    """All boards the user is a member of, newest first."""
    return (
        db.query(Board)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .filter(BoardMember.user_id == user_id)
        .order_by(Board.created_at.desc())
        .all()
    )


# ── Membership ────────────────────────────────────────────────────────────────

def is_member(db: Session, board_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.query(BoardMember)
        .filter(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
        .first()
    ) is not None


def is_creator(db: Session, board_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    row = (
        db.query(BoardMember)
        .filter(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
        .first()
    )
    return row is not None and row.role == "creator"


def join_board(db: Session, board_id: uuid.UUID, user_id: uuid.UUID) -> BoardMember:
    """Idempotent — returns existing membership if already joined."""
    existing = (
        db.query(BoardMember)
        .filter(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
        .first()
    )
    if existing:
        return existing
    member = BoardMember(board_id=board_id, user_id=user_id, role="member")
    db.add(member)
    db.commit()
    return member


def leave_board(db: Session, board_id: uuid.UUID, user_id: uuid.UUID) -> None:
    row = (
        db.query(BoardMember)
        .filter(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


def remove_member(db: Session, board_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Creator-only: kick a member (cannot kick the creator)."""
    leave_board(db, board_id, user_id)


def get_members(db: Session, board_id: uuid.UUID) -> list[BoardMember]:
    return (
        db.query(BoardMember)
        .filter(BoardMember.board_id == board_id)
        .order_by(BoardMember.joined_at)
        .all()
    )


def member_count(db: Session, board_id: uuid.UUID) -> int:
    return db.query(BoardMember).filter(BoardMember.board_id == board_id).count()


# ── Board outfits ─────────────────────────────────────────────────────────────

def add_outfit(
    db: Session,
    board_id: uuid.UUID,
    outfit_id: uuid.UUID,
    added_by: uuid.UUID,
) -> BoardOutfit:
    """Idempotent — silently returns existing row if already added."""
    existing = (
        db.query(BoardOutfit)
        .filter(BoardOutfit.board_id == board_id, BoardOutfit.outfit_id == outfit_id)
        .first()
    )
    if existing:
        return existing
    bo = BoardOutfit(board_id=board_id, outfit_id=outfit_id, added_by=added_by)
    db.add(bo)
    db.commit()
    return bo


def remove_outfit(db: Session, board_id: uuid.UUID, outfit_id: uuid.UUID) -> None:
    row = (
        db.query(BoardOutfit)
        .filter(BoardOutfit.board_id == board_id, BoardOutfit.outfit_id == outfit_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


def pin_outfit(
    db: Session, board_id: uuid.UUID, outfit_id: uuid.UUID, pinned: bool
) -> BoardOutfit | None:
    row = (
        db.query(BoardOutfit)
        .filter(BoardOutfit.board_id == board_id, BoardOutfit.outfit_id == outfit_id)
        .first()
    )
    if row:
        row.pinned = pinned
        db.commit()
    return row


def is_expired(board) -> bool:
    """Return True if the board's expiry has passed."""
    return board.expires_at < datetime.now(timezone.utc)


def delete_expired_boards(db: Session) -> int:
    """Delete all boards past their expiry date. Returns count deleted."""
    expired = (
        db.query(Board)
        .filter(Board.expires_at < datetime.now(timezone.utc))
        .all()
    )
    count = len(expired)
    for board in expired:
        db.delete(board)
    if count:
        db.commit()
    return count


def get_board_outfits(
    db: Session,
    board_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[Outfit], str | None]:
    """
    Outfits on a board, pinned first then newest-added first.
    Cursor is the ISO timestamp of the last `added_at` seen.
    """
    from datetime import datetime

    query = (
        db.query(Outfit)
        .join(BoardOutfit, BoardOutfit.outfit_id == Outfit.id)
        .filter(BoardOutfit.board_id == board_id)
    )

    if cursor:
        cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
        query = query.filter(BoardOutfit.added_at < cursor_dt)

    outfits = (
        query
        .order_by(BoardOutfit.pinned.desc(), BoardOutfit.added_at.desc())
        .limit(limit + 1)
        .all()
    )

    next_cursor = None
    if len(outfits) > limit:
        outfits = outfits[:limit]
        # Get the added_at for the last outfit via the junction row
        last = (
            db.query(BoardOutfit)
            .filter(
                BoardOutfit.board_id == board_id,
                BoardOutfit.outfit_id == outfits[-1].id,
            )
            .first()
        )
        if last:
            next_cursor = last.added_at.isoformat()

    return outfits, next_cursor
