"""empty message

Revision ID: ae240be9e835
Revises: 57471aa6513f
Create Date: 2026-08-20 10:38:56.273772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae240be9e835'
down_revision: Union[str, Sequence[str], None] = '57471aa6513f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
