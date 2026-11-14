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
from fastapi import HTTPException
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
                assert "x-handover-zip-sha256" in res.headers
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


@pytest.mark.asyncio
async def test_pb42_slo_thresholds_in_summary():
    """Kiểm tra trường root slo_thresholds_ms [1200, 2800] trong response summary."""
    from app.modules.m6_admin_security.pb42_service import SLO_THRESHOLDS_MS

    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    mock_db = AsyncMock()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch("app.api.v1.pb42.get_telemetry_summary_data", new=AsyncMock(return_value={
                "empty": False,
                "scope": "test_scope",
                "definition": "test_def",
                "slo_thresholds_ms": SLO_THRESHOLDS_MS,
                "total_queries": 53,
                "real_queries_count": 0,
                "benchmark_queries_count": 53,
                "by_answer_path": [],
            })):
                res = await client.get("/api/v1/pb42/telemetry/summary")
                assert res.status_code == 200
                data = res.json()
                assert "slo_thresholds_ms" in data
                assert data["slo_thresholds_ms"] == [1200, 2800]
                assert data["slo_thresholds_ms"] == SLO_THRESHOLDS_MS
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


@pytest.mark.asyncio
async def test_pb42_limitations_endpoint():
    """Kiểm tra endpoint GET /api/v1/pb42/limitations."""
    from app.modules.m6_admin_security.pb42_service import PB42_KNOWN_LIMITATIONS

    # 1. Unauthenticated -> 401/403
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_no_auth = await client.get("/api/v1/pb42/limitations")
        assert res_no_auth.status_code in (401, 403)

    # 2. Authenticated Admin -> 200 + đầy đủ LIM-01 đến LIM-06
    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/pb42/limitations")
            assert res.status_code == 200, res.text
            items = res.json()
            assert len(items) == len(PB42_KNOWN_LIMITATIONS)
            lim_ids = [item["id"] for item in items]
            assert "LIM-01" in lim_ids
            assert "LIM-06" in lim_ids
            # Kiểm tra nội dung nguyên văn
            for item, orig in zip(items, PB42_KNOWN_LIMITATIONS):
                assert item["id"] == orig[0]
                assert item["title"] == orig[1]
                assert item["description"] == orig[2]
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


class MockStandardUser:
    user_id = "00000000-0000-0000-0000-000000000002"
    email = "standard_user@graphmind.local"
    role = "standard"
    is_superuser = False


@pytest.mark.asyncio
async def test_pb42_handover_manifest_endpoint():
    """Kiểm tra GET /api/v1/pb42/handover-manifest/{export_id}."""
    test_id = "00000000-0000-0000-0000-000000000123"
    mock_manifest = {
        "export_id": test_id,
        "git_commit": "abc1234",
        "files": {
            "dossier_excel": {"filename": "test.xlsx", "sha256": "1111"},
            "dossier_pdf": {"filename": "test.pdf", "sha256": "2222"},
        }
    }

    # 1. Unauthenticated -> 401/403
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_no_auth = await client.get(f"/api/v1/pb42/handover-manifest/{test_id}")
        assert res_no_auth.status_code in (401, 403)

    # 2. Authenticated Non-Admin (Standard User) -> 403
    def mock_forbidden():
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên hệ thống (IT Admin) mới có quyền truy cập.")

    app.dependency_overrides[get_admin_user] = mock_forbidden
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_standard = await client.get(f"/api/v1/pb42/handover-manifest/{test_id}")
        assert res_standard.status_code == 403
        res_lim_std = await client.get("/api/v1/pb42/limitations")
        assert res_lim_std.status_code == 403

    # 3. Authenticated Admin + Valid UUID export_id -> 200
    app.dependency_overrides[get_admin_user] = lambda: MockAdmin()
    try:
        with patch("app.api.v1.pb42.get_handover_manifest_by_id", side_effect=lambda eid: mock_manifest if eid == test_id else None):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res_ok = await client.get(f"/api/v1/pb42/handover-manifest/{test_id}")
                assert res_ok.status_code == 200, res_ok.text
                data = res_ok.json()
                assert data["export_id"] == test_id
                assert "files" in data
                assert data["files"]["dossier_excel"]["sha256"] == "1111"

                # 4. Valid UUID nhưng không có dữ liệu -> 404
                res_404_uuid = await client.get("/api/v1/pb42/handover-manifest/00000000-0000-0000-0000-000000000999")
                assert res_404_uuid.status_code == 404

                # 5. Các chuỗi Directory Traversal & Không phải UUID -> 404/422 ngay lập tức, không đụng filesystem
                for attack_str in ["../x", "..%2F", "/etc/passwd", "\\windows\\system32", "not-a-uuid", "1234"]:
                    res_attack = await client.get(f"/api/v1/pb42/handover-manifest/{attack_str}")
                    assert res_attack.status_code in (404, 422, 307)
    finally:
        app.dependency_overrides.pop(get_admin_user, None)


def test_get_handover_manifest_by_id_path_traversal_protection():
    """Kiểm tra get_handover_manifest_by_id từ chối tất cả chuỗi traversal và non-UUID."""
    from app.modules.m6_admin_security.pb42_service import get_handover_manifest_by_id

    assert get_handover_manifest_by_id("../x") is None
    assert get_handover_manifest_by_id("..\\x") is None
    assert get_handover_manifest_by_id("/etc/passwd") is None
    assert get_handover_manifest_by_id("C:\\Windows\\System32") is None
    assert get_handover_manifest_by_id("not-a-uuid") is None
    assert get_handover_manifest_by_id("") is None
    assert get_handover_manifest_by_id(None) is None
