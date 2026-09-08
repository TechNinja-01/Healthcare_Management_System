"""empty message

Revision ID: 1f74b531f54d
Revises: 9896ada3b377
Create Date: 2026-08-19 10:13:15.512024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f74b531f54d'
down_revision: Union[str, Sequence[str], None] = '9896ada3b377'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
