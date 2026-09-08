"""empty message

Revision ID: 9896ada3b377
Revises: 2b5257250de0
Create Date: 2026-08-18 15:40:47.499031

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9896ada3b377'
down_revision: Union[str, Sequence[str], None] = '2b5257250de0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
