"""empty message

Revision ID: fccfbb570376
Revises: ae240be9e835
Create Date: 2026-08-20 10:54:33.625549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fccfbb570376'
down_revision: Union[str, Sequence[str], None] = 'ae240be9e835'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
