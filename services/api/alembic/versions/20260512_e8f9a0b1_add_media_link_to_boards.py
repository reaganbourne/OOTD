"""add media_link to boards

Revision ID: e8f9a0b1
Revises: d7e8f9a0
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = "e8f9a0b1"
down_revision = "d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "boards",
        sa.Column("media_link", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("boards", "media_link")
