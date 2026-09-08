"""Add payment signature column and widen appointment status.

Revision ID: e7f8a9b0c1d2
Revises: d4e5f6a7b8c9
Create Date: 2026-09-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR
        """
    )
    # Expand status column width for pending_payment / no_show values.
    op.execute(
        """
        ALTER TABLE appointments
        ALTER COLUMN status TYPE VARCHAR(20)
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_signature")
