"""add consultation_recordings table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "consultation_recordings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("bucket", sa.String(length=100), nullable=False),
        sa.Column("object_key", sa.String(length=255), nullable=False),
        sa.Column("upload_id", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="recording",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["room_id"],
            ["consultation_rooms.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_consultation_recordings_id"),
        "consultation_recordings",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consultation_recordings_room_id"),
        "consultation_recordings",
        ["room_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consultation_recordings_uploaded_by_user_id"),
        "consultation_recordings",
        ["uploaded_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_consultation_recordings_uploaded_by_user_id"),
        table_name="consultation_recordings",
    )
    op.drop_index(
        op.f("ix_consultation_recordings_room_id"),
        table_name="consultation_recordings",
    )
    op.drop_index(
        op.f("ix_consultation_recordings_id"),
        table_name="consultation_recordings",
    )
    op.drop_table("consultation_recordings")
