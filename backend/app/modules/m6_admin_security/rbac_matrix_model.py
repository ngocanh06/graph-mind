"""
Model cho Ma trận Phân quyền Tri thức chi tiết (Granular RBAC Matrix) - PB02 (Mục 6.2.1)
Bảng: knowledge_access_policies
"""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.database import Base


class KnowledgeAccessPolicy(Base):
    __tablename__ = "knowledge_access_policies"
    __table_args__ = (
        UniqueConstraint("role_code", "department_code", "resource_type", name="uq_role_dept_resource_policy"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # ADMIN, EXECUTIVE, DEPARTMENT_MANAGER, STANDARD_USER
    department_code: Mapped[str] = mapped_column(String(50), nullable=False, default="ALL", index=True)
    # SALES, ACCOUNTING, HR, LEGAL, IT, ALL
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # 8 loại tri thức cố định: CUSTOMER, SALES_ORDER, PRODUCT, VENDOR, EMPLOYEE, CONTRACT, CLAUSE, SOP_WIKI

    can_query: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Quyền hỏi AI Copilot, tìm kiếm và xem trên Knowledge Graph
    can_view_citation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Quyền bấm xem trích dẫn nguồn dữ liệu gốc (PDF/Excel/Bảng)
    can_edit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Quyền biên tập/xuất bản
    can_view_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Quyền xem dữ liệu/điều khoản hợp đồng nhạy cảm (phục vụ PB04)

    data_scope: Mapped[str] = mapped_column(String(50), nullable=False, default="NONE")
    # ALL_DEPARTMENTS, OWN_DEPARTMENT, NONE

    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
