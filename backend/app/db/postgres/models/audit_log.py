"""
AuditLog model — ánh xạ vào bảng `audit_logs` ĐÃ CÓ sẵn trong PostgreSQL (PB02/PB03).
Cột thực tế: audit_id, user_id (FK users, ON DELETE SET NULL), action, module_name,
target_type, target_id, details (jsonb), ip_address, created_at.
Email người thực hiện và trạng thái được lưu trong `details` (actor_email, status)
để log vẫn đọc được sau khi tài khoản bị xóa (user_id khi đó thành NULL).
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column("audit_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column("user_id", UUID(as_uuid=True), index=True)
    action: Mapped[str] = mapped_column(String, index=True)  # vd: USER_CREATE, USER_DELETE, ROLE_CHANGE
    module_name: Mapped[Optional[str]] = mapped_column(String)
    resource_type: Mapped[Optional[str]] = mapped_column("target_type", String, index=True)  # user, neo4j_node, qdrant_point
    resource_id: Mapped[Optional[str]] = mapped_column("target_id", String)
    detail: Mapped[Optional[dict]] = mapped_column("details", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
