"""add online consultation rooms, chat messages and appointment_type

Also merges the two pre-existing alembic heads
('87b59d29a213' and 'e7f8a9b0c1d2') into a single head.

Revision ID: a1b2c3d4e5f6
Revises: 87b59d29a213, e7f8a9b0c1d2
Create Date: 2026-09-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = (
    "87b59d29a213",
    "e7f8a9b0c1d2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------
    # appointments.appointment_type
    # ------------------------------------------------------------
    op.add_column(
        "appointments",
        sa.Column(
            "appointment_type",
            sa.String(length=20),
            nullable=False,
            server_default="in_person",
        ),
    )

    # ------------------------------------------------------------
    # consultation_rooms
    # ------------------------------------------------------------
    op.create_table(
        "consultation_rooms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_code", sa.String(length=36), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["appointment_id"],
            ["appointments.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id"),
        sa.UniqueConstraint("room_code"),
    )
    op.create_index(
        op.f("ix_consultation_rooms_id"),
        "consultation_rooms",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consultation_rooms_room_code"),
        "consultation_rooms",
        ["room_code"],
        unique=True,
    )
    op.create_index(
        op.f("ix_consultation_rooms_appointment_id"),
        "consultation_rooms",
        ["appointment_id"],
        unique=False,
    )

    # ------------------------------------------------------------
    # consultation_messages
    # ------------------------------------------------------------
    op.create_table(
        "consultation_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
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
            ["sender_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_consultation_messages_id"),
        "consultation_messages",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consultation_messages_room_id"),
        "consultation_messages",
        ["room_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consultation_messages_sender_user_id"),
        "consultation_messages",
        ["sender_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_consultation_messages_sender_user_id"),
        table_name="consultation_messages",
    )
    op.drop_index(
        op.f("ix_consultation_messages_room_id"),
        table_name="consultation_messages",
    )
    op.drop_index(
        op.f("ix_consultation_messages_id"),
        table_name="consultation_messages",
    )
    op.drop_table("consultation_messages")

    op.drop_index(
        op.f("ix_consultation_rooms_appointment_id"),
        table_name="consultation_rooms",
    )
    op.drop_index(
        op.f("ix_consultation_rooms_room_code"),
        table_name="consultation_rooms",
    )
    op.drop_index(
        op.f("ix_consultation_rooms_id"),
        table_name="consultation_rooms",
    )
    op.drop_table("consultation_rooms")

    op.drop_column("appointments", "appointment_type")
