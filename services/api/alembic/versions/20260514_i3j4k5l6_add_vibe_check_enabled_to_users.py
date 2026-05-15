"""add vibe_check_enabled to users

Revision ID: i3j4k5l6m7n8
Revises: g1h2i3j4
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

revision = "i3j4k5l6m7n8"
down_revision = "g1h2i3j4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "vibe_check_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "vibe_check_enabled")
