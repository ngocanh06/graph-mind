"""
Copilot Telemetry Helper — PB42 Phần 1A.
Đo thời gian thực bằng time.perf_counter() (tổng end-to-end và từng chặng:
classify, graph_retrieval, vector_retrieval, fusion, llm) và chuẩn hóa trích dẫn
để ghi vào bảng copilot_query_telemetry.
"""
import hashlib
import hmac
import logging
import math
import time
import uuid
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Set

from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.config import settings
    from app.db.postgres.models.copilot_telemetry import CopilotQueryTelemetry
except ImportError:
    from core.config import settings
    from db.postgres.models.copilot_telemetry import CopilotQueryTelemetry

logger = logging.getLogger(__name__)

VALID_OUTCOMES = frozenset({
    "answered",
    "refusal_rbac",
    "refusal_grounding",
    "refusal_layer2",
    "greeting",
    "degraded_fallback",
    "error",
})

STAGE_NAMES = (
    "classify",
    "graph_retrieval",
    "vector_retrieval",
    "fusion",
    "llm",
)


class StageTimer:
    """
    Bộ đo thời gian thực dùng time.perf_counter() cho toàn bộ vòng đời ask_copilot
    và từng chặng xử lý (classify, graph_retrieval, vector_retrieval, fusion, llm).
    Chặng nào không chạy sẽ giữ giá trị None.
    """

    def __init__(self) -> None:
        self._start_ns: int = time.perf_counter_ns()
        self._end_ns: Optional[int] = None
        self._stage_ns: Dict[str, int] = {}
        self.write_overhead_ms: Optional[float] = None

    @contextmanager
    def stage(self, name: str):
        if name not in STAGE_NAMES:
            raise ValueError(f"Unknown telemetry stage: {name}")
        t0 = time.perf_counter_ns()
        try:
            yield
        finally:
            elapsed = max(0, time.perf_counter_ns() - t0)
            self._stage_ns[name] = self._stage_ns.get(name, 0) + elapsed

    def add_stage_seconds(self, name: str, seconds: float) -> None:
        if name not in STAGE_NAMES:
            raise ValueError(f"Unknown telemetry stage: {name}")
        elapsed_ns = max(0, int(seconds * 1_000_000_000))
        self._stage_ns[name] = self._stage_ns.get(name, 0) + elapsed_ns

    def stop(self) -> None:
        if self._end_ns is None:
            self._end_ns = time.perf_counter_ns()

    @property
    def elapsed_ns(self) -> int:
        end = self._end_ns if self._end_ns is not None else time.perf_counter_ns()
        return max(0, end - self._start_ns)

    @property
    def total_latency_s(self) -> float:
        """Số đo giây thực tế (làm tròn 4 chữ số thập phân) phục vụ hiển thị UI."""
        return round(self.elapsed_ns / 1_000_000_000.0, 4)

    def get_metrics_ms(self) -> Dict[str, Optional[int]]:
        """
        Trả về dict số đo nguyên (ms) cho từng chặng và total_latency_ms.
        Mỗi chặng dùng phép chia nguyên ns // 1_000_000 (floor ms).
        Nhờ tính chất toán học sum(floor(x_i)) <= floor(sum(x_i)) <= floor(total),
        total_latency_ms luôn >= tổng các chặng đã chạy.
        """
        self.stop()
        result: Dict[str, Optional[int]] = {}
        sum_stages_ms = 0
        for name in STAGE_NAMES:
            if name in self._stage_ns:
                ms = int(self._stage_ns[name] // 1_000_000)
                result[f"{name}_ms"] = ms
                sum_stages_ms += ms
            else:
                result[f"{name}_ms"] = None

        total_ms = int(self.elapsed_ns // 1_000_000)
        if total_ms < sum_stages_ms:
            total_ms = sum_stages_ms
        result["total_latency_ms"] = total_ms
        return result


def hash_query(query: str, secret_key: Optional[str] = None) -> Optional[str]:
    """
    Tính HMAC-SHA256 của câu hỏi đã chuẩn hóa khoảng trắng, dùng khóa lấy từ cấu hình
    (settings.TELEMETRY_HMAC_KEY hoặc settings.SECRET_KEY). Không lưu văn bản câu hỏi.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return None
    key_str = (
        secret_key
        or getattr(settings, "TELEMETRY_HMAC_KEY", "")
        or getattr(settings, "SECRET_KEY", "change-me")
    )
    return hmac.new(
        key_str.encode("utf-8"),
        cleaned.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def normalize_citation_source(source_type: Optional[str]) -> Optional[str]:
    """
    Suy ra nguồn chuẩn hóa ('neo4j' | 'qdrant') từ sourceType.
    Tuyệt đối KHÔNG đoán nếu không rõ -> trả về None.
    """
    if not source_type or not isinstance(source_type, str):
        return None
    low = source_type.strip().lower()
    if "rbac security gate" in low:
        return None
    has_qdrant = "qdrant" in low
    has_neo4j = "neo4j" in low
    if has_qdrant and not has_neo4j:
        return "qdrant"
    if has_neo4j and not has_qdrant:
        return "neo4j"
    return None


def normalize_telemetry_citations(
    raw_citations: Optional[List[Dict[str, Any]]],
    verified_record_ids: Optional[Set[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Chuẩn hóa danh sách trích dẫn khi ghi telemetry:
    - Loại bỏ hoàn toàn các phần tử thuộc 'RBAC Security Gate' (không phải bằng chứng tri thức).
    - source: 'neo4j' | 'qdrant' | None (không đoán nếu không rõ).
    - record_id: ưu tiên document_id -> doc_id -> neo4jNode -> chunkId.
    - citation_valid: kết quả kiểm chứng thực tế tại thời điểm trả lời.
      Nếu bị ẩn bởi RBAC (match == 'RESTRICTED') hoặc record_id rỗng/'UNKNOWN_DOC' -> False.
    """
    if not raw_citations:
        return []

    normalized: List[Dict[str, Any]] = []
    for cit in raw_citations:
        if not isinstance(cit, dict):
            continue

        src_type = str(cit.get("sourceType") or "").strip()
        chunk_id = str(cit.get("chunkId") or "").strip()
        if src_type == "RBAC Security Gate" or chunk_id == "SEC-SCOPE-GUARD":
            # RBAC Security Gate không được tính là bằng chứng trích dẫn
            continue

        source = normalize_citation_source(src_type)

        raw_record_id = (
            cit.get("document_id")
            or cit.get("doc_id")
            or cit.get("neo4jNode")
            or cit.get("chunkId")
        )
        record_id = str(raw_record_id).strip() if raw_record_id is not None else None
        if not record_id:
            record_id = None

        is_restricted = str(cit.get("match") or "").strip().upper() == "RESTRICTED"
        explicit_valid = cit.get("citation_valid")

        if is_restricted or not record_id or record_id == "UNKNOWN_DOC" or source is None:
            citation_valid = False
        elif isinstance(explicit_valid, bool):
            citation_valid = explicit_valid
        elif verified_record_ids is not None:
            citation_valid = record_id in verified_record_ids
        else:
            citation_valid = True

        normalized.append({
            "source": source,
            "record_id": record_id,
            "citation_valid": bool(citation_valid),
        })

    return normalized


async def record_copilot_telemetry(
    db: AsyncSession,
    *,
    timer: StageTimer,
    query: str,
    query_outcome: str,
    answer_path: Optional[str] = None,
    requires_citation: Optional[bool] = None,
    raw_citations: Optional[List[Dict[str, Any]]] = None,
    verified_record_ids: Optional[Set[str]] = None,
    session_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    is_benchmark: bool = False,
) -> Optional[CopilotQueryTelemetry]:
    """
    Ghi nhận 1 dòng vào copilot_query_telemetry.
    - Chốt total_latency_ms (timer.stop()) TRƯỚC khi bắt đầu chuẩn bị và ghi telemetry.
    - Đo riêng thời gian ghi telemetry (timer.write_overhead_ms) bằng time.perf_counter_ns().
    - An toàn tuyệt đối (fail-safe): mọi lỗi khi ghi chỉ được log warning và
      sử dụng SAVEPOINT (begin_nested) để không bao giờ làm hỏng giao dịch chính hay làm lỗi câu trả lời.
    """
    # Chốt mốc thời gian của truy vấn trước khi thực hiện bất kỳ thao tác telemetry nào
    timer.stop()
    t_write_start = time.perf_counter_ns()
    try:
        outcome = query_outcome if query_outcome in VALID_OUTCOMES else "error"
        if requires_citation is None:
            requires_citation = outcome in ("answered", "degraded_fallback")

        metrics = timer.get_metrics_ms()
        normalized_cits = normalize_telemetry_citations(
            raw_citations,
            verified_record_ids=verified_record_ids,
        )

        row = CopilotQueryTelemetry(
            session_id=session_id,
            user_id=user_id,
            query_hash=hash_query(query),
            query_outcome=outcome,
            answer_path=answer_path,
            requires_citation=bool(requires_citation),
            total_latency_ms=metrics["total_latency_ms"] or 0,
            classify_ms=metrics["classify_ms"],
            graph_retrieval_ms=metrics["graph_retrieval_ms"],
            vector_retrieval_ms=metrics["vector_retrieval_ms"],
            fusion_ms=metrics["fusion_ms"],
            llm_ms=metrics["llm_ms"],
            citations=normalized_cits,
            is_benchmark=bool(is_benchmark),
        )

        async with db.begin_nested():
            db.add(row)
            await db.flush()
        await db.commit()
        return row
    except Exception as exc:
        logger.warning("[CopilotTelemetry] Failed to record telemetry (ignored): %s", exc)
        return None
    finally:
        timer.write_overhead_ms = round((time.perf_counter_ns() - t_write_start) / 1_000_000.0, 3)

