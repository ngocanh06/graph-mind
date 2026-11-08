"""
Model cho Hàng đợi Phê duyệt Tài liệu Tri thức (Document Upload Approvals) - PB48, PB50, PB02
Bảng: knowledge_upload_approvals
"""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.database import Base


class KnowledgeUploadApproval(Base):
    __tablename__ = "knowledge_upload_approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PDF, CSV, DOCX, XLSX
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    department_code: Mapped[str] = mapped_column(String(50), nullable=False, default="SALES", index=True)

    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    uploaded_by_email: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_by_role: Mapped[str] = mapped_column(String(50), nullable=False, default="STANDARD_USER")

    action_type: Mapped[str] = mapped_column(String(50), nullable=False, default="UPLOAD_NEW")  # UPLOAD_NEW, UPDATE_EXISTING
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True)  # PENDING, APPROVED, REJECTED

    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
