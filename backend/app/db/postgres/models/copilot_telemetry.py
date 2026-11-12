"""
Copilot Query Telemetry model — PB42 Phần 1A.
Lưu số đo thời gian thực (latency_ms tổng và theo từng chặng) và thông tin kiểm chứng trích dẫn
cho mỗi lượt hỏi đáp của AI Copilot. Không lưu nội dung câu hỏi gốc để bảo mật dữ liệu nhạy cảm.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class CopilotQueryTelemetry(Base):
    __tablename__ = "copilot_query_telemetry"
    __table_args__ = (
        Index("ix_copilot_query_telemetry_created_at", "created_at"),
        Index("ix_copilot_query_telemetry_outcome_created_at", "query_outcome", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("copilot_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    query_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    # answered | refusal_rbac | refusal_grounding | refusal_layer2 | greeting | degraded_fallback | error
    query_outcome: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    # nl2cypher_fastpath | rag_llm | greeting | rbac_gate | grounding_gate | layer2_gate | fallback
    answer_path: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    requires_citation: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    total_latency_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    classify_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    graph_retrieval_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    vector_retrieval_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    fusion_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    llm_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    # Danh sách [{source: "neo4j"|"qdrant"|None, record_id: str|None, citation_valid: bool}]
    citations: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )
    is_benchmark: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

