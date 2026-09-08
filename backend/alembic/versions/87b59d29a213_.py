"""empty message

Revision ID: 87b59d29a213
Revises: 877ab15b879f
Create Date: 2026-08-20 12:36:52.199594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87b59d29a213'
down_revision: Union[str, Sequence[str], None] = '877ab15b879f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
