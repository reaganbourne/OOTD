"""add notifications table

Revision ID: c5d6e7f8
Revises: b3c4d5e6
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM as PgENUM

revision = "c5d6e7f8"
down_revision = "b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # `create_type=False` is only honoured by postgresql.ENUM, not sa.Enum.
    # Use PgENUM.create(checkfirst=True) so this is idempotent on any DB state.
    notif_enum = PgENUM(
        "follow", "like", "comment", "board_join", "board_outfit",
        name="notificationtype",
        create_type=False,
    )
    notif_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "recipient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            PgENUM(
                "follow", "like", "comment", "board_join", "board_outfit",
                name="notificationtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "outfit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("outfits.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "board_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boards.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "comment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("comments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("body", sa.String(255), nullable=True),
        sa.Column("seen", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"])
    op.create_index(
        "ix_notifications_recipient_seen", "notifications", ["recipient_id", "seen"]
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_recipient_seen", table_name="notifications")
    op.drop_index("ix_notifications_recipient_id", table_name="notifications")
    op.drop_table("notifications")
    PgENUM(name="notificationtype", create_type=False).drop(op.get_bind(), checkfirst=True)
