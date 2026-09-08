"""empty message

Revision ID: 57471aa6513f
Revises: f1729917e67a
Create Date: 2026-08-19 12:08:16.885493

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57471aa6513f'
down_revision: Union[str, Sequence[str], None] = 'f1729917e67a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
