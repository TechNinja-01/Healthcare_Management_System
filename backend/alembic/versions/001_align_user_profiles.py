"""Align auth profiles and normalize role values.

Revision ID: 001_align_user_profiles
Revises:
Create Date: 2026-08-07

Changes:
- Convert users.role from PostgreSQL ENUM(ADMIN/DOCTOR/PATIENT) to VARCHAR lowercase values
- Add patients.user_id (nullable FK, unique) for User↔Patient one-to-one
- Enforce doctors.user_id NOT NULL
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001_align_user_profiles"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert ENUM → VARCHAR with lowercase role values used by the Python Role enum.
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role TYPE VARCHAR(7)
        USING LOWER(role::text)
        """
    )
    op.execute("DROP TYPE IF EXISTS role")

    op.add_column(
        "patients",
        sa.Column("user_id", sa.String(), nullable=True),
    )
    op.create_unique_constraint("uq_patients_user_id", "patients", ["user_id"])
    op.create_foreign_key(
        "fk_patients_user_id_users",
        "patients",
        "users",
        ["user_id"],
        ["id"],
    )

    op.alter_column(
        "doctors",
        "user_id",
        existing_type=sa.String(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "doctors",
        "user_id",
        existing_type=sa.String(),
        nullable=True,
    )

    op.drop_constraint("fk_patients_user_id_users", "patients", type_="foreignkey")
    op.drop_constraint("uq_patients_user_id", "patients", type_="unique")
    op.drop_column("patients", "user_id")

    op.execute("CREATE TYPE role AS ENUM ('ADMIN', 'DOCTOR', 'PATIENT')")
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role TYPE role
        USING UPPER(role)::role
        """
    )
