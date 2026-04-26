"""
Board models — collaborative event outfit boards.

Three tables:
  boards        — the board itself (creator, name, event date, invite code, expiry)
  board_members — who's in the board (composite PK: board_id + user_id)
  board_outfits — outfits added to a board (composite PK: board_id + outfit_id)
"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.outfit import Outfit
    from app.models.user import User


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    invite_code: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    members: Mapped[list["BoardMember"]] = relationship(
        "BoardMember", back_populates="board", cascade="all, delete-orphan"
    )
    board_outfits: Mapped[list["BoardOutfit"]] = relationship(
        "BoardOutfit", back_populates="board", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_boards_creator_id", "creator_id"),
        Index("ix_boards_invite_code", "invite_code"),
        Index("ix_boards_expires_at", "expires_at"),
    )


class BoardMember(Base):
    __tablename__ = "board_members"

    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boards.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # "creator" has full admin rights; "member" can add outfits + leave
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    board: Mapped["Board"] = relationship("Board", back_populates="members")

    __table_args__ = (
        CheckConstraint("role IN ('creator', 'member')", name="ck_board_members_role"),
        Index("ix_board_members_user_id", "user_id"),
    )


class BoardOutfit(Base):
    __tablename__ = "board_outfits"

    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boards.id", ondelete="CASCADE"),
        primary_key=True,
    )
    outfit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("outfits.id", ondelete="CASCADE"),
        primary_key=True,
    )
    added_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    board: Mapped["Board"] = relationship("Board", back_populates="board_outfits")

    __table_args__ = (
        Index("ix_board_outfits_board_id", "board_id"),
    )
