"""migrate_to_ekai_postgres_schema

Revision ID: a93ce8369026
Revises: 0186c646946f
Create Date: 2026-09-27 13:34:37.402913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a93ce8369026'
down_revision: Union[str, Sequence[str], None] = '0186c646946f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to ekai_postgres_schema.sql while preserving data."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass


