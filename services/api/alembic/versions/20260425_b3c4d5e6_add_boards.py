"""add boards, board_members, board_outfits tables

Revision ID: b3c4d5e6
Revises: a1b2c3d4
Create Date: 2026-04-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b3c4d5e6"
down_revision = "a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "boards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("event_date", sa.Date, nullable=True),
        sa.Column("invite_code", sa.String(12), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_boards_creator_id", "boards", ["creator_id"])
    op.create_index("ix_boards_invite_code", "boards", ["invite_code"])
    op.create_index("ix_boards_expires_at", "boards", ["expires_at"])

    op.create_table(
        "board_members",
        sa.Column("board_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("boards.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.CheckConstraint("role IN ('creator', 'member')", name="ck_board_members_role"),
    )
    op.create_index("ix_board_members_user_id", "board_members", ["user_id"])

    op.create_table(
        "board_outfits",
        sa.Column("board_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("boards.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("outfit_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("outfits.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("added_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("pinned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_board_outfits_board_id", "board_outfits", ["board_id"])


def downgrade() -> None:
    op.drop_table("board_outfits")
    op.drop_table("board_members")
    op.drop_table("boards")
