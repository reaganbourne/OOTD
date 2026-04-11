"""initial schema

Revision ID: 3f8a1c2d
Revises:
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "3f8a1c2d"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("profile_image_url", sa.String(), nullable=True),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    # -------------------------------------------------------- refresh_sessions
    op.create_table(
        "refresh_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name="fk_refresh_sessions_user_id"
        ),
        sa.UniqueConstraint("token_hash", name="uq_refresh_sessions_token_hash"),
    )
    op.create_index("ix_refresh_sessions_token_hash", "refresh_sessions", ["token_hash"])
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])
    op.create_index("ix_refresh_sessions_expires_at", "refresh_sessions", ["expires_at"])

    # --------------------------------------------------------------- outfits
    op.create_table(
        "outfits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("caption", sa.String(), nullable=True),
        sa.Column("event_name", sa.String(), nullable=True),
        sa.Column("worn_on", sa.Date(), nullable=True),
        sa.Column("vibe_check_text", sa.String(), nullable=True),
        sa.Column("vibe_check_tone", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name="fk_outfits_user_id"
        ),
    )
    op.create_index("ix_outfits_user_id", "outfits", ["user_id"])
    op.create_index("ix_outfits_created_at", "outfits", ["created_at"])
    op.create_index("ix_outfits_user_id_worn_on", "outfits", ["user_id", "worn_on"])

    # --------------------------------------------------------- clothing_items
    op.create_table(
        "clothing_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("outfit_id", UUID(as_uuid=True), nullable=False),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["outfit_id"], ["outfits.id"], ondelete="CASCADE", name="fk_clothing_items_outfit_id"
        ),
    )
    op.create_index("ix_clothing_items_outfit_id", "clothing_items", ["outfit_id"])
    op.create_index("ix_clothing_items_category", "clothing_items", ["category"])
    op.create_index("ix_clothing_items_color", "clothing_items", ["color"])

    # --------------------------------------------------------------- follows
    op.create_table(
        "follows",
        sa.Column("follower_id", UUID(as_uuid=True), nullable=False),
        sa.Column("following_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("follower_id", "following_id", name="pk_follows"),
        sa.ForeignKeyConstraint(
            ["follower_id"], ["users.id"], ondelete="CASCADE", name="fk_follows_follower_id"
        ),
        sa.ForeignKeyConstraint(
            ["following_id"], ["users.id"], ondelete="CASCADE", name="fk_follows_following_id"
        ),
        sa.CheckConstraint("follower_id != following_id", name="ck_follows_no_self_follow"),
    )
    op.create_index("ix_follows_following_id", "follows", ["following_id"])

    # ------------------------------------------------------------------ likes
    op.create_table(
        "likes",
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("outfit_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("user_id", "outfit_id", name="pk_likes"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name="fk_likes_user_id"
        ),
        sa.ForeignKeyConstraint(
            ["outfit_id"], ["outfits.id"], ondelete="CASCADE", name="fk_likes_outfit_id"
        ),
    )
    op.create_index("ix_likes_outfit_id", "likes", ["outfit_id"])

    # --------------------------------------------------------------- comments
    op.create_table(
        "comments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("outfit_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["outfit_id"], ["outfits.id"], ondelete="CASCADE", name="fk_comments_outfit_id"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name="fk_comments_user_id"
        ),
    )
    op.create_index("ix_comments_outfit_id", "comments", ["outfit_id"])
    op.create_index("ix_comments_user_id", "comments", ["user_id"])
    op.create_index("ix_comments_created_at", "comments", ["created_at"])


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("likes")
    op.drop_table("follows")
    op.drop_table("clothing_items")
    op.drop_table("outfits")
    op.drop_table("refresh_sessions")
    op.drop_table("users")
