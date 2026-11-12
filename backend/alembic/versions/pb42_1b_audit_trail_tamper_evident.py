"""pb42_1b_audit_trail_tamper_evident

Revision ID: pb42_1b_audit_chain
Revises: pb42_1a_telemetry
Create Date: 2026-11-10 16:50:00.000000

Ghi chú thiết kế & bảo mật (PB42 Phần 1B):
- Bổ sung chuỗi băm liên kết (entry_sha256, prev_hash, chain_seq) và cờ pre_chain cho bảng audit_logs.
- Toàn bộ các bản ghi lịch sử tồn tại trước thời điểm chạy migration được gán pre_chain = TRUE
  (metadata-only default khi thêm cột, không sửa nội dung dòng cũ) và để NULL cho chain_seq / entry_sha256 / prev_hash.
- Các bản ghi mới phát sinh sau migration có pre_chain = FALSE và tạo thành chuỗi băm liên tục bắt đầu từ chain_seq = 1.
- Các cột cũ từ schema ban đầu (user_id, module_name, target_type, target_id, details, ip_address) KHÔNG nằm trong
  phép tính entry_sha256; hash chỉ tính trên canonical JSON 10 trường của ORM AuditLog:
  (audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at, prev_hash, chain_seq).
- Trigger trg_audit_logs_immutable chặn mọi thao tác UPDATE và DELETE từ phía ứng dụng.
  Lưu ý: đây là cơ chế tamper-evident (phát hiện can thiệp); chủ sở hữu DB (superuser/owner) vẫn có thể tạm gỡ trigger,
  nhưng mọi chỉnh sửa hoặc xóa dòng trong chuỗi đều sẽ bị phát hiện khi chạy verify_audit_chain().
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "pb42_1b_audit_chain"
down_revision: Union[str, Sequence[str], None] = "pb42_1a_telemetry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tamper-evident hash chain columns and immutability trigger to audit_logs."""
    op.add_column("audit_logs", sa.Column("entry_sha256", sa.CHAR(length=64), nullable=True))
    op.add_column("audit_logs", sa.Column("prev_hash", sa.CHAR(length=64), nullable=True))
    op.add_column("audit_logs", sa.Column("chain_seq", sa.BigInteger(), nullable=True))

    # Thêm cột pre_chain với default=true để toàn bộ dòng cũ hiện có tự động nhận pre_chain=true
    # mà không cần chạy UPDATE trên các dòng cũ; sau đó đổi default về false cho các dòng mới.
    op.add_column(
        "audit_logs",
        sa.Column("pre_chain", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.alter_column("audit_logs", "pre_chain", server_default=sa.text("false"))

    # Unique index cho chain_seq trên các dòng thuộc chuỗi băm
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_chain_seq "
        "ON audit_logs (chain_seq) WHERE chain_seq IS NOT NULL"
    )

    # Trigger PostgreSQL chặn UPDATE và DELETE trên audit_logs
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_audit_logs_prevent_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'AuditLogImmutableError: Bảng audit_logs là bất biến (tamper-evident). Thao tác % trên bản ghi audit_id=% bị từ chối.', TG_OP, OLD.audit_id
                USING ERRCODE = '55000';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs")
    op.execute(
        """
        CREATE TRIGGER trg_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION fn_audit_logs_prevent_mutation();
        """
    )


def downgrade() -> None:
    """Drop immutability trigger and tamper-evident hash chain columns from audit_logs."""
    op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs")
    op.execute("DROP FUNCTION IF EXISTS fn_audit_logs_prevent_mutation()")
    op.execute("DROP INDEX IF EXISTS uq_audit_logs_chain_seq")
    op.drop_column("audit_logs", "pre_chain")
    op.drop_column("audit_logs", "chain_seq")
    op.drop_column("audit_logs", "prev_hash")
    op.drop_column("audit_logs", "entry_sha256")

