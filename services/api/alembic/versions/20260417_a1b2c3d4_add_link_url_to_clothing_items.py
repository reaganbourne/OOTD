"""add link_url to clothing_items

Revision ID: a1b2c3d4
Revises: 3f8a1c2d
Create Date: 2026-04-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4"
down_revision: Union[str, None] = "3f8a1c2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clothing_items", sa.Column("link_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("clothing_items", "link_url")
