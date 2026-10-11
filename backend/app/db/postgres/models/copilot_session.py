"""
Copilot Session model — lưu trữ lịch sử hội thoại của từng người dùng với AI Copilot.
"""
import uuid
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import DateTime, String, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class CopilotSession(Base):
    __tablename__ = "copilot_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Cuộc hội thoại mới")
    # ponytail: messages stored as JSON array in session; split to copilot_messages table if sessions exceed thousands of turns
    messages: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "title": self.title,
            "messages": self.messages or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
