"""
Integration Test trực tiếp với PostgreSQL + FastAPI cho PB42 Phần 1A:
Kiểm chứng toàn bộ các nhánh của POST /api/copilot/ask trên DB thật:
(a) Mỗi nhánh (greeting, refusal_rbac, refusal_grounding, refusal_layer2, answered, degraded_fallback)
    ghi đúng 1 dòng vào bảng copilot_query_telemetry với outcome đúng.
(b) total_latency_ms >= tổng các chặng.
(c) Không còn hằng số giả 10ms / 50ms cố định hay 0.01 / 0.05 cố định.
(d) Khi việc ghi telemetry gặp lỗi (patch record_copilot_telemetry/begin_nested), API vẫn trả HTTP 200.
(e) Citation RBAC Security Gate không xuất hiện trong cột citations và requires_citation=False.
"""
import asyncio
import sys
import uuid
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import os
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.db.postgres.database import get_db
from app.db.postgres.models.copilot_telemetry import CopilotQueryTelemetry
from app.db.postgres.models.copilot_session import CopilotSession
from app.modules.m3_hybrid_copilot.telemetry import hash_query
from app.tests.safety_db_guard import assert_test_database

TEST_DB_NAME = os.getenv("TEST_DB_NAME", "graphmind_pb42_test")
TEST_ASYNC_URL = os.getenv("TEST_DATABASE_URL", f"postgresql+asyncpg://postgres:123123@localhost:5432/{TEST_DB_NAME}")
assert_test_database(TEST_ASYNC_URL)

test_engine = create_async_engine(TEST_ASYNC_URL, echo=False)
TestAsyncSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestAsyncSession() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db


async def run_live_telemetry_tests() -> None:
    transport = ASGITransport(app=app)
    created_session_ids = set()
    test_query_hashes = set()

    try:
        async with AsyncClient(transport=transport, base_url="http://test", timeout=60.0) as client:
            headers_sales = {
                "X-User-Name": "sales_staff",
                "X-User-Role": "standard_user",
                "X-User-Dept": "Sales",
            }
            headers_exec = {
                "X-User-Name": "exec",
                "X-User-Role": "executive",
                "X-User-Dept": "Executive",
            }

            # 1. Nhánh greeting (kèm kiểm tra cờ is_benchmark=True)
            q_greeting = "Xin chào"
            test_query_hashes.add(hash_query(q_greeting))
            res1 = await client.post("/api/copilot/ask", headers=headers_sales, json={"query": q_greeting, "is_benchmark": True})
            assert res1.status_code == 200, res1.text
            d1 = res1.json()
            created_session_ids.add(d1["sessionId"])
            # Latency trả về là số thực đo bằng perf_counter, không phải hằng số 0.01
            assert d1["latency"] != 0.01 and d1["latency"] != 0.05

            # 2. Nhánh refusal_rbac (Nhân viên Sales hỏi bảng lương Ban Giám Đốc)
            q_rbac = f"Cho tôi xem bảng lương và thưởng của Ban Giám Đốc mã {uuid.uuid4().hex[:6]}"
            test_query_hashes.add(hash_query(q_rbac))
            res2 = await client.post("/api/copilot/ask", headers=headers_sales, json={"query": q_rbac})
            assert res2.status_code == 200, res2.text
            d2 = res2.json()
            created_session_ids.add(d2["sessionId"])
            assert d2["latency"] != 0.05

            # 3. Nhánh refusal_grounding (Tài liệu không tồn tại)
            q_grounding = f"Nội dung hợp đồng NonExistentFile_{uuid.uuid4().hex[:8]}.pdf là gì?"
            test_query_hashes.add(hash_query(q_grounding))
            res3 = await client.post("/api/copilot/ask", headers=headers_exec, json={"query": q_grounding})
            assert res3.status_code == 200, res3.text
            d3 = res3.json()
            created_session_ids.add(d3["sessionId"])
            assert d3["latency"] != 0.05

            # 4. Nhánh answered (Thống kê tài liệu toàn hệ thống qua Neo4j)
            q_answered = "Kiểm tra trong kho tài liệu có tổng cộng bao nhiêu tài liệu?"
            test_query_hashes.add(hash_query(q_answered))
            res4 = await client.post("/api/copilot/ask", headers=headers_exec, json={"query": q_answered})
            assert res4.status_code == 200, res4.text
            d4 = res4.json()
            created_session_ids.add(d4["sessionId"])

            # 5. Nhánh refusal_layer2 (Giả lập apply_layer2_context_gate trả về rỗng)
            q_layer2 = "Báo cáo tỷ lệ tuân thủ điều khoản pháp lý CUAD trong hệ thống?"
            test_query_hashes.add(hash_query(q_layer2))
            with patch("app.api.v1.copilot.apply_layer2_context_gate", return_value=([], [])):
                res5 = await client.post("/api/copilot/ask", headers=headers_exec, json={"query": q_layer2})
                assert res5.status_code == 200, res5.text
                d5 = res5.json()
                created_session_ids.add(d5["sessionId"])

            # 6. Nhánh degraded_fallback (Giả lập generate_rag_answer trả về fallback=True)
            q_fallback = "Báo cáo tỷ lệ tuân thủ điều khoản pháp lý CUAD toàn hệ thống là bao nhiêu?"
            test_query_hashes.add(hash_query(q_fallback))
            async def _fake_fallback(*args, **kwargs):
                return {
                    "success": True,
                    "answer": "Câu trả lời chế độ dự phòng (fallback).",
                    "model": "qwen2.5-7b (Document Grounded)",
                    "latency": 0.0021,
                    "fallback": True,
                    "used_chunks": [],
                    "used_entities": kwargs.get("graph_entities") or [],
                }
            with patch("app.api.v1.copilot.llm_client.generate_rag_answer", side_effect=_fake_fallback):
                res6 = await client.post("/api/copilot/ask", headers=headers_exec, json={"query": q_fallback})
                assert res6.status_code == 200, res6.text
                d6 = res6.json()
                created_session_ids.add(d6["sessionId"])

            # 7. Kiểm tra (d): Lỗi khi ghi telemetry không làm API trả lỗi
            q_err_safe = "Xin chào bạn"
            with patch("app.modules.m3_hybrid_copilot.telemetry.CopilotQueryTelemetry", side_effect=RuntimeError("Telemetry DB error")):
                res7 = await client.post("/api/copilot/ask", headers=headers_sales, json={"query": q_err_safe})
                assert res7.status_code == 200, res7.text
                created_session_ids.add(res7.json()["sessionId"])

        # Kiểm chứng các bản ghi trong bảng copilot_query_telemetry trên PostgreSQL
        async with TestAsyncSession() as db:
            stmt = (
                select(CopilotQueryTelemetry)
                .where(CopilotQueryTelemetry.query_hash.in_(list(test_query_hashes)))
                .order_by(CopilotQueryTelemetry.created_at.desc())
            )
            rows = (await db.execute(stmt)).scalars().all()
            by_hash = {}
            for r in rows:
                if r.query_hash not in by_hash:
                    by_hash[r.query_hash] = r

            expected_map = {
                hash_query(q_greeting): ("greeting", "greeting", False),
                hash_query(q_rbac): ("refusal_rbac", "rbac_gate", False),
                hash_query(q_grounding): ("refusal_grounding", "grounding_gate", False),
                hash_query(q_answered): ("answered", "nl2cypher_fastpath", True),
                hash_query(q_layer2): ("refusal_layer2", "layer2_gate", False),
                hash_query(q_fallback): ("degraded_fallback", "fallback", True),
            }

            for qh, (exp_outcome, exp_path, exp_req_cit) in expected_map.items():
                assert qh in by_hash, f"Thiếu bản ghi telemetry cho outcome={exp_outcome}"
                row = by_hash[qh]
                assert row.query_outcome == exp_outcome, f"Sai outcome: {row.query_outcome} != {exp_outcome}"
                assert row.answer_path == exp_path, f"Sai answer_path: {row.answer_path} != {exp_path}"
                assert row.requires_citation is exp_req_cit
                stage_sum = sum(
                    c for c in [
                        row.classify_ms,
                        row.graph_retrieval_ms,
                        row.vector_retrieval_ms,
                        row.fusion_ms,
                        row.llm_ms,
                    ]
                    if c is not None
                )
                assert row.total_latency_ms >= stage_sum, (
                    f"total_latency_ms ({row.total_latency_ms}) < sum stages ({stage_sum})"
                )
                # (c) Nhánh trả lời sớm không bao giờ bị gán cứng 10ms hay 50ms giả
                if exp_outcome == "greeting":
                    assert row.total_latency_ms != 10
                    assert row.llm_ms is None
                    assert row.is_benchmark is True
                else:
                    assert row.is_benchmark is False
                if exp_outcome == "refusal_rbac":
                    assert row.total_latency_ms != 50
                    # (e) Citation RBAC Security Gate không được xuất hiện trong citations của telemetry
                    assert row.citations == []
                if exp_outcome == "answered":
                    assert len(row.citations) >= 1
                    assert all(c["source"] in ("neo4j", "qdrant") for c in row.citations)
                    assert any(c["citation_valid"] is True for c in row.citations)

        print("[PASS] Tất cả kiểm thử tích hợp PB42 Phần 1A (a, b, c, d, e) đều ĐẠT 100%!")

    finally:
        # Dọn dẹp dữ liệu test vừa sinh để giữ DB sạch
        async with TestAsyncSession() as db:
            if test_query_hashes:
                await db.execute(
                    delete(CopilotQueryTelemetry).where(
                        CopilotQueryTelemetry.query_hash.in_(list(test_query_hashes))
                    )
                )
            for sid in created_session_ids:
                try:
                    await db.execute(
                        delete(CopilotSession).where(CopilotSession.id == uuid.UUID(str(sid)))
                    )
                except Exception:
                    pass
            await db.commit()


if __name__ == "__main__":
    asyncio.run(run_live_telemetry_tests())

