# Import all models here so that Base.metadata is fully populated
# for Alembic autogenerate and SQLAlchemy table creation.
from app.models.board import Board, BoardMember, BoardOutfit
from app.models.clothing_item import ClothingItem
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.like import Like
from app.models.outfit import Outfit
from app.models.refresh_session import RefreshSession
from app.models.user import User

__all__ = [
    "User",
    "RefreshSession",
    "Outfit",
    "ClothingItem",
    "Follow",
    "Like",
    "Comment",
    "Board",
    "BoardMember",
    "BoardOutfit",
]
