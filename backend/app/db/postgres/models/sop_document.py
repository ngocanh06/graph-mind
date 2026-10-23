"""
SOP Document model — Quản lý quy trình và quy chuẩn vận hành chuẩn (SOP)
Hỗ trợ FR26, UC.14 và quy tắc BR-04 trong tài liệu SRS GraphMind.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import Boolean, DateTime, String, Text, JSON, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, synonym

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class SopDocument(Base):
    __tablename__ = "sop_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="v1.0",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        index=True,
    )  # "draft" | "published" | "archived"
    tags: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    purpose: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    # ponytail: steps structured as list of {num, title, desc} in JSON; avoid complex normalized relation tables
    steps: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    governance: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    author_name: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Backward compatibility synonyms
    sop_id = synonym("id")
    dept = synonym("department")

    def to_dict(self) -> Dict[str, Any]:
        """Chuyển đổi thành định dạng JSON chuẩn tương thích hoàn toàn với giao diện SopView."""
        tag_list = self.tags if isinstance(self.tags, list) else []
        desc = (self.purpose or "").strip()
        if len(desc) > 90:
            desc = desc[:87] + "..."

        is_published = (self.status or "").lower() == "published"
        updated_str = self.updated_at.strftime("%d/%m/%Y") if self.updated_at else "Hôm nay"

        return {
            "id": self.code or str(self.id),
            "sopId": str(self.id),
            "code": self.code,
            "title": self.title,
            "desc": desc or f"Quy trình {self.code} phòng ban {self.department}",
            "dept": self.department,
            "status": self.status,
            "statusLabel": "Đã xuất bản" if is_published else "Bản nháp",
            "version": self.version or "v1.0",
            "updatedAt": updated_str,
            "author": self.author_name or "Trưởng phòng",
            "tags": tag_list,
            "purpose": self.purpose or "",
            "steps": self.steps or [],
            "governance": self.governance or "",
            "publishedAt": self.published_at.isoformat() if self.published_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<SopDocument code={self.code} title='{self.title[:30]}' status={self.status} dept='{self.department}'>"
