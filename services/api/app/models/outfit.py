import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.clothing_item import ClothingItem


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    caption: Mapped[str | None] = mapped_column(String, nullable=True)
    event_name: Mapped[str | None] = mapped_column(String, nullable=True)
    worn_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    vibe_check_text: Mapped[str | None] = mapped_column(String, nullable=True)
    vibe_check_tone: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    clothing_items: Mapped[list["ClothingItem"]] = relationship(
        "ClothingItem", back_populates="outfit", order_by="ClothingItem.display_order"
    )

    __table_args__ = (
        Index("ix_outfits_user_id", "user_id"),
        Index("ix_outfits_created_at", "created_at"),
        Index("ix_outfits_user_id_worn_on", "user_id", "worn_on"),
    )
