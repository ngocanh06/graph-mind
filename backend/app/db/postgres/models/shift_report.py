"""
ShiftReport model — Báo cáo ca tác nghiệp của chuyên viên.
Vòng đời: DRAFT -> SUBMITTED -> APPROVED | REJECTED (REJECTED được sửa và gửi lại).
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import DateTime, JSON, String, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class ShiftReport(Base):
    __tablename__ = "shift_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_name: Mapped[str] = mapped_column(String(150), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # canonical key
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # ponytail: ca xử lý lưu JSON [{time, customer, issue, solution, ref, status}]; không chuẩn hóa bảng riêng
    cases: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    proposals: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT", index=True)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    manager_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        iso = lambda d: d.isoformat() if d else None  # noqa: E731
        return {
            "id": str(self.id),
            "specialistName": self.author_name,
            "username": self.username,
            "department": self.department,
            "summary": self.summary,
            "cases": self.cases or [],
            "proposals": self.proposals,
            "escalation": self.proposals,
            "status": self.status,
            "contentHash": self.content_hash,
            "submittedAt": iso(self.submitted_at),
            "signedBy": self.signed_by,
            "signedAt": iso(self.signed_at),
            "managerComment": self.manager_comment,
            "updatedAt": iso(self.updated_at),
        }
