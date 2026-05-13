"""add instagram_handle to users

Revision ID: g1h2i3j4
Revises: f0a1b2c3
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa

revision = "g1h2i3j4"
down_revision = "f0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("instagram_handle", sa.String(30), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "instagram_handle")
