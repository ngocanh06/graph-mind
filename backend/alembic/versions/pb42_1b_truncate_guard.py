"""Add TRUNCATE statement trigger and revoke mutation rights on audit_logs.

Revision ID: pb42_1b_truncate_guard
Revises: pb42_1b_audit_chain
Create Date: 2026-11-12

Nội dung:
1. Trigger trg_audit_logs_truncate mức câu lệnh (STATEMENT-level trigger) chặn mọi lệnh TRUNCATE trên audit_logs.
2. REVOKE các quyền UPDATE, DELETE, TRUNCATE trên bảng audit_logs khỏi PUBLIC và application role
   để thiết lập cơ chế phòng vệ 2 lớp (RBAC SQL + Trigger bảo vệ).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "pb42_1b_truncate_guard"
down_revision: Union[str, Sequence[str], None] = "pb42_1b_audit_chain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add TRUNCATE trigger and revoke mutation privileges on audit_logs."""
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_audit_logs_prevent_truncate()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'AuditLogImmutableError: Bảng audit_logs là bất biến (tamper-evident). Thao tác TRUNCATE bị từ chối tuyệt đối.'
                USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_truncate ON audit_logs")
    op.execute(
        """
        CREATE TRIGGER trg_audit_logs_truncate
        BEFORE TRUNCATE ON audit_logs
        FOR EACH STATEMENT
        EXECUTE FUNCTION fn_audit_logs_prevent_truncate();
        """
    )
    op.execute("REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;")


def downgrade() -> None:
    """Remove TRUNCATE trigger and restore default PUBLIC grants."""
    op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_truncate ON audit_logs;")
    op.execute("DROP FUNCTION IF EXISTS fn_audit_logs_prevent_truncate();")
    op.execute("GRANT UPDATE, DELETE, TRUNCATE ON audit_logs TO PUBLIC;")

