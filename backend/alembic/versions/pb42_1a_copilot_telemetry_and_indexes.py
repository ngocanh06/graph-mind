"""pb42_1a_copilot_telemetry_and_indexes

Revision ID: pb42_1a_telemetry
Revises: a93ce8369026
Create Date: 2026-11-09 22:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "pb42_1a_telemetry"
down_revision: Union[str, Sequence[str], None] = "c4e8a91b2d70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create copilot_query_telemetry table and missing created_at indexes."""
    op.create_table(
        "copilot_query_telemetry",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("copilot_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("query_hash", sa.String(length=64), nullable=True),
        sa.Column("query_outcome", sa.String(length=50), nullable=False),
        sa.Column("answer_path", sa.String(length=50), nullable=True),
        sa.Column(
            "requires_citation",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("total_latency_ms", sa.Integer(), nullable=False),
        sa.Column("classify_ms", sa.Integer(), nullable=True),
        sa.Column("graph_retrieval_ms", sa.Integer(), nullable=True),
        sa.Column("vector_retrieval_ms", sa.Integer(), nullable=True),
        sa.Column("fusion_ms", sa.Integer(), nullable=True),
        sa.Column("llm_ms", sa.Integer(), nullable=True),
        sa.Column(
            "citations",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "is_benchmark",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_copilot_query_telemetry_created_at",
        "copilot_query_telemetry",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_copilot_query_telemetry_outcome_created_at",
        "copilot_query_telemetry",
        ["query_outcome", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_copilot_query_telemetry_session_id",
        "copilot_query_telemetry",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        "ix_copilot_query_telemetry_user_id",
        "copilot_query_telemetry",
        ["user_id"],
        unique=False,
    )

    # Thêm index created_at trên copilot_sessions và audit_logs (dùng IF NOT EXISTS an toàn)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_copilot_sessions_created_at ON copilot_sessions (created_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)"
    )


def downgrade() -> None:
    """Drop created_at indexes and copilot_query_telemetry table."""
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_created_at")
    op.execute("DROP INDEX IF EXISTS ix_copilot_sessions_created_at")
    op.drop_index("ix_copilot_query_telemetry_user_id", table_name="copilot_query_telemetry")
    op.drop_index("ix_copilot_query_telemetry_session_id", table_name="copilot_query_telemetry")
    op.drop_index("ix_copilot_query_telemetry_outcome_created_at", table_name="copilot_query_telemetry")
    op.drop_index("ix_copilot_query_telemetry_created_at", table_name="copilot_query_telemetry")
    op.drop_table("copilot_query_telemetry")
