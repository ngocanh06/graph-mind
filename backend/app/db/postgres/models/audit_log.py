"""
AuditLog model — ghi nhận toàn bộ hành động tài khoản & hệ thống (M6 / PB42 Phần 1B)
Bảng: audit_logs

Ghi chú thiết kế & toàn vẹn dữ liệu (Tamper-Evident Audit Trail):
- Chuỗi băm SHA-256 (entry_sha256) được tính trên canonical JSON (sort_keys=True, separators=(',', ':'),
  ensure_ascii=False, UTF-8) của đúng 10 trường thuộc ORM AuditLog:
  (audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at, prev_hash, chain_seq).
- Các cột cũ từ schema ban đầu (user_id, module_name, target_type, target_id, details, ip_address)
  KHÔNG nằm trong phép tính entry_sha256.
- created_at được chốt ở tầng ứng dụng theo chuẩn UTC với microsecond cố định (timespec='microseconds')
  trước khi băm và lưu vào DB; detail được cắt về tối đa 500 ký tự trước khi băm.
- Trigger PostgreSQL trg_audit_logs_immutable chặn UPDATE/DELETE từ phía ứng dụng. Đây là cơ chế
  tamper-evident (chủ DB/superuser vẫn có thể gỡ trigger, nhưng mọi thay đổi nội dung hoặc đứt gãy
  sẽ bị phát hiện khi chạy verify_audit_chain).
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, CHAR, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # USER_CREATE | USER_DELETE | ROLE_CHANGE | USER_LOCK | USER_UNLOCK
    # PASSWORD_RESET | LOGIN | LOGIN_FAIL | ...
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OK")
    detail: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # PB42 Phần 1B — Tamper-evident hash chain columns
    entry_sha256: Mapped[Optional[str]] = mapped_column(CHAR(64), nullable=True)
    prev_hash: Mapped[Optional[str]] = mapped_column(CHAR(64), nullable=True)
    chain_seq: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    pre_chain: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
