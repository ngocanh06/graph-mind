"""
Unit & Functional Tests cho PB42 Phần 1A — Copilot Query Telemetry.
Kiểm tra đủ 5 yêu cầu (a), (b), (c), (d), (e) của Phần 1A Mục 8.
"""
import inspect
import time
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.m3_hybrid_copilot.telemetry import (
    StageTimer,
    hash_query,
    normalize_citation_source,
    normalize_telemetry_citations,
    record_copilot_telemetry,
)


def test_stage_timer_total_ge_sum_of_stages():
    """(b) total_latency_ms >= tổng các chặng đã chạy; chặng không chạy là None."""
    timer = StageTimer()
    with timer.stage("classify"):
        time.sleep(0.003)
    with timer.stage("vector_retrieval"):
        time.sleep(0.004)
    with timer.stage("graph_retrieval"):
        time.sleep(0.003)
    with timer.stage("fusion"):
        time.sleep(0.002)
    # Không chạy chặng 'llm'

    metrics = timer.get_metrics_ms()
    assert metrics["classify_ms"] is not None and metrics["classify_ms"] >= 0
    assert metrics["vector_retrieval_ms"] is not None and metrics["vector_retrieval_ms"] >= 0
    assert metrics["graph_retrieval_ms"] is not None and metrics["graph_retrieval_ms"] >= 0
    assert metrics["fusion_ms"] is not None and metrics["fusion_ms"] >= 0
    assert metrics["llm_ms"] is None

    stage_sum = sum(
        v for k, v in metrics.items()
        if k != "total_latency_ms" and v is not None
    )
    assert metrics["total_latency_ms"] >= stage_sum
    assert metrics["total_latency_ms"] >= 5


def test_no_fake_latency_constants_in_copilot_or_client():
    """(c) Đảm bảo không còn hằng số giả 0.01 / 0.05 / 1.25 trong ask_copilot hay generate_rag_answer."""
    from app.api.v1 import copilot
    from app.modules.m3_hybrid_copilot.inference import client

    copilot_src = inspect.getsource(copilot.ask_copilot)
    client_src = inspect.getsource(client.OllamaClient.generate_rag_answer)

    for forbidden in ['"0.01s"', '"0.05s"', '"latency": 0.01', '"latency": 0.05', 'latency = 0.05', '1.25']:
        assert forbidden not in copilot_src, f"Phát hiện hằng số latency giả trong ask_copilot: {forbidden}"
        assert forbidden not in client_src, f"Phát hiện hằng số latency giả trong generate_rag_answer: {forbidden}"


def test_rbac_security_gate_citation_excluded():
    """(e) Citation 'RBAC Security Gate' bị loại bỏ và không được tính là bằng chứng trích dẫn."""
    raw = [
        {
            "docName": "Chính sách kiểm soát truy cập (RBAC / Data Scope)",
            "file": "BR-02 Data Isolation Policy",
            "match": "RESTRICTED",
            "chunkId": "SEC-SCOPE-GUARD",
            "sourceType": "RBAC Security Gate",
            "score": 100.0,
        }
    ]
    normalized = normalize_telemetry_citations(raw)
    assert normalized == []

    # Kiểm tra trộn lẫn giữa RBAC Security Gate, Qdrant hợp lệ, Neo4j hợp lệ, và nguồn không rõ
    mixed = [
        {
            "document_id": "DOC-001",
            "sourceType": "Qdrant Vector DB (CUAD)",
            "match": "92.5% MATCH",
            "citation_valid": True,
        },
        {
            "document_id": "AW-Customer-1",
            "neo4jNode": "Customer:AW1",
            "sourceType": "Neo4j Graph DB",
            "match": "GRAPH CYPHER VERIFIED",
            "citation_valid": True,
        },
        {
            "document_id": "DOC-SECRET",
            "sourceType": "Qdrant Vector DB (CUAD)",
            "match": "RESTRICTED",
            "citation_valid": True,
        },
        {
            "document_id": "DOC-UNKNOWN-SRC",
            "sourceType": "Custom External Source",
            "match": "80% MATCH",
        },
        {
            "chunkId": "SEC-SCOPE-GUARD",
            "sourceType": "RBAC Security Gate",
            "match": "RESTRICTED",
        },
    ]
    res = normalize_telemetry_citations(mixed)
    assert len(res) == 4
    assert res[0] == {"source": "qdrant", "record_id": "DOC-001", "citation_valid": True}
    assert res[1] == {"source": "neo4j", "record_id": "AW-Customer-1", "citation_valid": True}
    # Bị ẩn bởi RBAC (match=RESTRICTED) -> citation_valid phải là False
    assert res[2] == {"source": "qdrant", "record_id": "DOC-SECRET", "citation_valid": False}
    # Nguồn không rõ -> source=None (không đoán) và citation_valid=False
    assert res[3] == {"source": None, "record_id": "DOC-UNKNOWN-SRC", "citation_valid": False}


def test_hmac_sha256_query_hash():
    """Kiểm tra query_hash dùng HMAC-SHA256 với khóa từ cấu hình (khác với plain SHA-256 và thay đổi theo khóa)."""
    import hashlib
    q = "Kiểm tra bảo mật HMAC-SHA256"
    plain_sha = hashlib.sha256(q.encode("utf-8")).hexdigest()
    h1 = hash_query(q, secret_key="key-alpha")
    h2 = hash_query(q, secret_key="key-beta")
    h_cfg = hash_query(q)
    assert h1 is not None and len(h1) == 64
    assert h1 != plain_sha
    assert h1 != h2
    assert h_cfg is not None and len(h_cfg) == 64


@pytest.mark.asyncio
async def test_each_outcome_branch_records_one_row_and_survives_db_failure():
    """
    (a) Mỗi nhánh trả lời ghi đúng một dòng telemetry với outcome và requires_citation đúng.
    (d) Lỗi khi ghi telemetry không làm văng exception ra ngoài.
    """
    outcomes = [
        ("greeting", False),
        ("refusal_rbac", False),
        ("refusal_grounding", False),
        ("refusal_layer2", False),
        ("answered", True),
        ("degraded_fallback", True),
    ]
    recorded_rows = []

    class DummyNested:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            return False

    mock_db = MagicMock()
    mock_db.begin_nested.return_value = DummyNested()
    mock_db.add.side_effect = lambda r: recorded_rows.append(r)
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    for outcome, expected_req_cit in outcomes:
        t = StageTimer()
        with t.stage("classify"):
            pass
        row = await record_copilot_telemetry(
            mock_db,
            timer=t,
            query=f"Câu hỏi thử nghiệm cho nhánh {outcome}",
            query_outcome=outcome,
            raw_citations=[
                {"sourceType": "RBAC Security Gate", "chunkId": "SEC-SCOPE-GUARD"}
            ] if outcome == "refusal_rbac" else [
                {"sourceType": "Neo4j Graph DB", "document_id": "SYSTEM-DOCS-SUMMARY", "citation_valid": True}
            ] if outcome == "answered" else [],
            session_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            is_benchmark=(outcome == "greeting"),
        )
        assert row is not None
        assert row.query_outcome == outcome
        assert row.requires_citation is expected_req_cit
        assert row.is_benchmark is (outcome == "greeting")
        assert t.write_overhead_ms is not None and t.write_overhead_ms >= 0.0
        # Không lưu nội dung câu hỏi gốc, chỉ lưu HMAC-SHA256 64 ký tự
        assert len(row.query_hash) == 64
        stage_sum = sum(
            x for x in [row.classify_ms, row.graph_retrieval_ms, row.vector_retrieval_ms, row.fusion_ms, row.llm_ms]
            if x is not None
        )
        assert row.total_latency_ms >= stage_sum
        if outcome == "refusal_rbac":
            assert row.citations == []

    assert len(recorded_rows) == len(outcomes)

    # (d) Giả lập lỗi DB khi ghi telemetry -> hàm bắt lỗi êm và trả về None, không raise
    broken_db = MagicMock()
    broken_db.begin_nested.side_effect = RuntimeError("Simulated DB connection crash during telemetry")
    t_err = StageTimer()
    res_err = await record_copilot_telemetry(
        broken_db,
        timer=t_err,
        query="Test telemetry resilience",
        query_outcome="answered",
    )
    assert res_err is None

