"""Restore revision marker for applied schema fixes.

Revision ID: d4e5f6a7b8c9
Revises: c37d195394f7
Create Date: 2026-09-06

Already applied on the database. Kept as a no-op so Alembic history is consistent.
"""

from typing import Sequence, Union


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c37d195394f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
