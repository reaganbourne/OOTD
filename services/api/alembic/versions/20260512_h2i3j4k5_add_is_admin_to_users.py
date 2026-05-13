"""add is_admin to users

Revision ID: h2i3j4k5
Revises: c5d6e7f8
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = "h2i3j4k5"
down_revision = "c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
