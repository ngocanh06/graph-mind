"""pb42_2a_telemetry_outliers

Revision ID: pb42_2a_outliers
Revises: pb42_1b_truncate_guard
Create Date: 2026-11-12 21:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "pb42_2a_outliers"
down_revision: Union[str, Sequence[str], None] = "pb42_1b_truncate_guard"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "copilot_telemetry_outliers",
        sa.Column(
            "telemetry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("copilot_query_telemetry.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="system_sleep"),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Seed dòng ngoại lai đã được điều tra chứng minh Sleep
    op.execute(
        """
        INSERT INTO copilot_telemetry_outliers (telemetry_id, category, reason)
        SELECT id, 'system_sleep', 'Máy tính chuyển sang Modern Standby/Sleep trong lúc chờ phản hồi (Event ID 506 Kernel-Power)'
        FROM copilot_query_telemetry
        WHERE id = '72893ab7-5d7b-4996-84ea-a8d65af25915'
        ON CONFLICT (telemetry_id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.drop_table("copilot_telemetry_outliers")

