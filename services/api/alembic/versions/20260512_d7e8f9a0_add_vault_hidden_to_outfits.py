"""add vault_hidden to outfits

Revision ID: d7e8f9a0
Revises: c5d6e7f8
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = "d7e8f9a0"
down_revision = "c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "outfits",
        sa.Column(
            "vault_hidden",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("outfits", "vault_hidden")
