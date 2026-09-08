"""empty message

Revision ID: 5e79f5791608
Revises: fccfbb570376
Create Date: 2026-08-20 10:57:50.173294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e79f5791608'
down_revision: Union[str, Sequence[str], None] = 'fccfbb570376'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
