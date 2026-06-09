"""add ai_consent_accepted to users

Revision ID: k5l6m7n8o9p0
Revises: i3j4k5l6m7n8
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa

revision = "k5l6m7n8o9p0"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "ai_consent_accepted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "ai_consent_accepted")
