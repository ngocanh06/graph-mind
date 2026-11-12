"""bridge_schema_revision

Revision ID: c4e8a91b2d70
Revises: a93ce8369026
Create Date: 2026-10-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4e8a91b2d70"
down_revision: Union[str, Sequence[str], None] = "a93ce8369026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op bridge revision matching existing database state."""
    pass


def downgrade() -> None:
    """No-op downgrade."""
    pass

