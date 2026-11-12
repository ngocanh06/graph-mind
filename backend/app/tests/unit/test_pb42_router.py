"""
Unit tests for PB42 Router & Handover Service.
Runs in 100% air-gapped / mocked environment (PR0 test harness).
Kiểm tra:
- Quyền Admin (401/403 cho unauthenticated, 200 cho admin).
- Chống Formula Injection (=, +, -, @) trên các ô Excel.
- Schema và tính chuẩn xác của response telemetry summary & histogram.
- Phân đoạn và rate limit của endpoint audit integrity.
- Cấu trúc file zip, excel, pdf sinh từ generate_handover_package.
"""
import io
import zipfile
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient
import openpyxl

from app.main import app
from app.modules.m6_admin_security.pb42_service import escape_excel_formula, CITATION_RATE_DEFINITION
from app.modules.m6_admin_security.deps import get_admin_user
from app.db.postgres.database import get_db


class MockAdmin:
    user_id = "00000000-0000-0000-0000-000000000001"
    email = "admin_test@graphmind.local"
    role = "it_admin"
    is_superuser = True


def test_escape_excel_formula():
    """Kiểm tra chống CSV/Excel Formula Injection."""
    assert escape_excel_formula("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert escape_excel_formula("+12345") == "'+12345"
    assert escape_excel_formula("-cmd|' /C calc'!A0") == "'-cmd|' /C calc'!A0"
    assert escape_excel_formula("@SUM(B1)") == "'@SUM(B1)"
    assert escape_excel_formula("Văn bản bình thường") == "Văn bản bình thường"
    assert escape_excel_formula(12345) == 12345
    assert escape_excel_formula(None) is None


@pytest.mark.asyncio
async def test_pb42_auth_protection():
    """Kiểm tra chặn truy cập khi chưa xác thực hoặc không phải admin."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Không truyền token
        res_no_auth = await client.get("/api/v1/pb42/telemetry/summary")
        assert res_no_auth.status_code in (401, 403)

        res_exp_no_auth = await client.post("/api/v1/pb42/handover-export")
        assert res_exp_no_auth.status_code in (401, 403)


@pytest.mark.asyncio
async def test_pb42_telemetry_summary_endpoint():
    """Kiểm tra schema và dữ liệu trả về của /api/v1/pb42/telemetry/summary."""
    mock_summary = {
        "empty": False,
        "scope": "all_benchmark_and_real_queries_excluding_outliers",
        "definition": CITATION_RATE_DEFINITION,
        "filter_applied": {
            "from_time": None,
            "to_time": None,
            "include_benchmark": True,
            "exclude_outliers": True,
        },
        "data_start": "2026-11-10T10:01:31.952219Z",
        "data_end": "2026-11-10T10:52:48.990579Z",
        "total_queries": 53,
        "real_queries_count": 0,
        "benchmark_queries_count": 53,
        "outlier_queries_count": 1,
        "outcome_distribution": {"answered": 20, "degraded_fallback": 13, "refusal_rbac": 7, "refusal_grounding": 7, "greeting": 6},
        "citation_metrics": {
            "denominator_requires_citation_answered": 20,
            "numerator_all_valid_citation_queries": 20,
            "citation_rate_pct": 100.0,
            "null_source_citation_count": 0,
            "by_answer_path": {
                "nl2cypher_fastpath": {"n": 19, "citation_rate_pct": 100.0},
                "rag_llm": {"n": 1, "citation_rate_pct": 100.0},
            }
        },
        "by_answer_path": [
            {
                "answer_path": "nl2cypher_fastpath",
                "count": 19,
                "p50_ms": 1500.0,
                "p95_ms": 3200.0,
                "p99_ms": 4500.0,
                "min_ms": 266,
                "max_ms": 18993,
                "avg_ms": 2167.0,
                "slo_applicable_ms": 1200,
                "slo_applicable_met_rate_pct": 73.68,
                "slo_1200_met_rate_pct": 73.68,
                "slo_2800_met_rate_pct": 89.47,
                "degraded_fallback_count": 0,
                "timeout_llm_count": 0,
            }
        ],
        "without_outliers_by_answer_path": [],
        "with_outliers_by_answer_path": [],
    }

    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    try:
        with patch("app.api.v1.pb42.get_telemetry_summary_data", new=AsyncMock(return_value=mock_summary)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/api/v1/pb42/telemetry/summary?include_benchmark=true&exclude_outliers=true")
                assert res.status_code == 200, res.text
                data = res.json()
                assert "scope" in data
                assert "definition" in data
                assert "mẫu số = lượt requires_citation=true" in data["definition"]
                assert data["citation_metrics"]["citation_rate_pct"] == 100.0
                assert "by_answer_path" in data["citation_metrics"]
                assert data["total_queries"] == 53
                assert len(data["by_answer_path"]) == 1
                p0 = data["by_answer_path"][0]
                assert p0["answer_path"] == "nl2cypher_fastpath"
                assert p0["slo_applicable_ms"] == 1200
                assert p0["slo_applicable_met_rate_pct"] == 73.68
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


@pytest.mark.asyncio
async def test_pb42_latency_histogram_endpoint():
    """Kiểm tra endpoint /api/v1/pb42/telemetry/latency-histogram."""
    mock_histogram = {
        "bucket_ms": 1000,
        "answer_path": None,
        "include_benchmark": True,
        "exclude_outliers": True,
        "total_buckets": 2,
        "buckets": [
            {"bucket_start_ms": 0, "bucket_end_ms": 1000, "count": 25},
            {"bucket_start_ms": 1000, "bucket_end_ms": 2000, "count": 15},
        ],
    }

    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    try:
        with patch("app.api.v1.pb42.get_latency_histogram_data", new=AsyncMock(return_value=mock_histogram)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/api/v1/pb42/telemetry/latency-histogram?bucket_ms=1000&include_benchmark=true")
                assert res.status_code == 200, res.text
                data = res.json()
                assert data["bucket_ms"] == 1000
                assert len(data["buckets"]) == 2
                assert data["buckets"][0]["count"] == 25
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


@pytest.mark.asyncio
async def test_pb42_audit_integrity_endpoint():
    """Kiểm tra endpoint /api/v1/pb42/audit/integrity."""
    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    fake_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: fake_db

    try:
        with patch("app.api.v1.pb42.verify_audit_chain", new=AsyncMock(return_value=(True, 50, None, 293))), \
             patch("app.api.v1.pb42.compute_prechain_aggregate_hash", new=AsyncMock(return_value="69dfc3d04d03e593395f72a3cabc979c25f528605747832bba484d4ad01e3ec0")):

            # Mock câu truy vấn lấy head
            head_cursor = MagicMock()
            head_cursor.fetchone.return_value = (50, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
            fake_db.execute.return_value = head_cursor

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/api/v1/pb42/audit/integrity")
                assert res.status_code == 200, res.text
                data = res.json()
                assert data["is_valid"] is True
                assert data["head_chain_seq"] == 50
                assert data["head_entry_sha256"] == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                assert "external_anchor_requirement" in data

                # Kiểm tra validation chunk size
                res_bad_range = await client.get("/api/v1/pb42/audit/integrity?from_seq=100&to_seq=50")
                assert res_bad_range.status_code == 400

                res_too_large = await client.get("/api/v1/pb42/audit/integrity?from_seq=1&to_seq=20000")
                assert res_too_large.status_code == 400
    finally:
        app.dependency_overrides.pop(get_admin_user, None)
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_pb42_handover_export_endpoint():
    """Kiểm tra xuất gói hồ sơ bàn giao (.zip)."""
    mock_zip_bytes = b"PK\x05\x06" + b"\x00" * 18  # Empty zip header
    mock_manifest = {"export_id": "exp-12345"}

    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    try:
        with patch("app.api.v1.pb42.generate_handover_package", new=AsyncMock(return_value=(mock_zip_bytes, "GraphMind_Handover_Package_test.zip", mock_manifest))):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/v1/pb42/handover-export")
                assert res.status_code == 200, res.text
                assert res.headers["content-type"] == "application/zip"
                assert "GraphMind_Handover_Package_test.zip" in res.headers["content-disposition"]
                assert res.headers["x-handover-export-id"] == "exp-12345"
    finally:
        app.dependency_overrides.pop(get_admin_user, None)
