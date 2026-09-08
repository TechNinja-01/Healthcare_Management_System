"""empty message

Revision ID: 877ab15b879f
Revises: 5e79f5791608
Create Date: 2026-08-20 10:58:15.591186

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '877ab15b879f'
down_revision: Union[str, Sequence[str], None] = '5e79f5791608'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
