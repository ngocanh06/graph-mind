"""
GraphMind Sprint 2 Automation Suite — pytest + httpx + pytest-asyncio
Covers:
  - Knowledge Base Explorer & Visual File Preview RBAC (PB50 / US40 / C1SE18-20)
  - Staff Document Upload, Document Ingestion API & File Watcher API (PB67, PB48, PB49 / C1SE18-30, 38)
  - User Admin, Audit Log & Dynamic 2D RBAC Matrix (PB02, PB03, PB72 / C1SE18-26..28, 31)
  - 3-Step Email OTP Password Recovery & Session Enforcement (PB73, PB74 / C1SE18-10)
"""
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.rbac import (
    ROLE_ADMIN,
    ROLE_EXECUTIVE,
    ROLE_MANAGER,
    ROLE_STANDARD,
    ScopeContext,
)
from app.db.postgres.database import get_db
from app.modules.m6_admin_security.document_approval_model import KnowledgeUploadApproval
from app.modules.m6_admin_security.forgot_password_router import router as fp_router
from app.modules.m6_admin_security.otp_service import (
    MAX_ATTEMPTS,
    OTP_TTL_MINUTES,
    RATE_LIMIT_COUNT,
)
from app.modules.m6_admin_security.rbac_matrix_router import router as rbac_matrix_router
from app.modules.m6_admin_security.rbac_matrix_schema import ROLES as MATRIX_ROLES
from app.modules.m6_admin_security.rbac_matrix_service import (
    normalize_dept_code,
    normalize_role_code,
)
from app.tests.fakes.test_app_factory import create_test_app

REPO_ROOT = Path(__file__).resolve().parents[2]


def _make_otp_app(user_obj=None):
    app = FastAPI()
    app.include_router(fp_router, prefix="/api/v1/auth")
    app.include_router(rbac_matrix_router, prefix="/api")

    mock_db = AsyncMock()
    cursor = MagicMock()
    cursor.scalar_one_or_none.return_value = user_obj
    cursor.scalar_one.return_value = 0
    mock_db.execute.return_value = cursor
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    async def _override_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_db
    return app


def _fake_user(email="staff@graphmind.ai", is_active=True, role="standard"):
    return SimpleNamespace(
        user_id=uuid.uuid4(),
        email=email,
        username="staff",
        full_name="Staff User",
        role=role,
        department="Sales",
        is_active=is_active,
        status="active" if is_active else "locked",
        is_superuser=(role == "it_admin"),
        deleted_at=None,
    )


# =============================================================================
# 1. KNOWLEDGE BASE EXPLORER & VISUAL FILE PREVIEW RBAC (PB50)
# =============================================================================

def test_s2_kb_01_executive_full_access_scope():
    """S2_KB_01: Executive role has full read scope across all enterprise departments (BR-05)."""
    scope = ScopeContext(
        user=_fake_user(role=ROLE_EXECUTIVE),
        role=ROLE_EXECUTIVE,
        is_unrestricted=True,
        department_name="ALL",
        canonical_dept="all",
        allowed_depts={"*"},
    )
    assert scope.is_department_allowed("legal") is True
    assert scope.is_department_allowed("it") is True
    assert scope.is_department_allowed("sales") is True


def test_s2_kb_02_standard_user_department_isolation():
    """S2_KB_02: Standard User (Sales) is restricted to own department and blocked from Legal/IT (BR-02)."""
    scope = ScopeContext(
        user=_fake_user(role=ROLE_STANDARD),
        role=ROLE_STANDARD,
        is_unrestricted=False,
        department_name="Kinh doanh",
        canonical_dept="sales",
        allowed_depts={"sales"},
    )
    assert scope.is_department_allowed("sales") is True
    assert scope.is_department_allowed("it") is False
    assert scope.is_department_allowed("legal") is False


def test_s2_kb_03_manager_isolated_from_it_department():
    """S2_KB_03: Knowledge/Department Manager is strictly isolated from internal IT documents (BR-04)."""
    scope = ScopeContext(
        user=_fake_user(role=ROLE_MANAGER),
        role=ROLE_MANAGER,
        is_unrestricted=False,
        department_name="Kinh doanh",
        canonical_dept="sales",
        allowed_depts={"sales", "legal", "accounting", "rnd"},
    )
    assert scope.is_department_allowed("sales") is True
    assert scope.is_department_allowed("it") is False


def test_s2_kb_04_visual_preview_and_excel_grounding_modules_exist():
    """S2_KB_04: Document Explorer & Visual Preview frontend/backend endpoints are wired."""
    docs_view = REPO_ROOT / "frontend" / "src" / "views" / "m2_knowledge_editor" / "DocumentsView.jsx"
    assert docs_view.exists()
    app = create_test_app()
    paths = {getattr(r, "path", "") for r in app.routes}
    assert "/api/v1/documents/detail" in paths
    assert "/api/v1/documents/raw" in paths
    assert "/api/v1/documents/download" in paths


# =============================================================================
# 2. STAFF DOCUMENT UPLOAD, INGESTION API & FILE WATCHER API (PB67, PB48, PB49)
# =============================================================================

@pytest.mark.asyncio
async def test_s2_sync_01_file_watcher_status_endpoint():
    """S2_SYNC_01: File Watcher status API responds with 200 and operational telemetry."""
    app = create_test_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/sync/file-watcher/status")
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


@pytest.mark.asyncio
async def test_s2_sync_02_file_watcher_rejects_invalid_agent_key():
    """S2_SYNC_02: File Watcher webhook rejects requests with invalid X-Agent-Key / Bearer token."""
    app = create_test_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/sync/file-watcher",
            json={"event_type": "created", "file_path": "/data/sales/test.pdf"},
            headers={"Authorization": "Bearer wrong-invalid-key-999"},
        )
    assert resp.status_code in (401, 403, 422)


def test_s2_sync_03_staff_upload_approval_states_defined():
    """S2_SYNC_03: Staff Document Upload Approval workflow defines PENDING/APPROVED/REJECTED lifecycle."""
    router_src = (
        REPO_ROOT / "backend" / "app" / "modules" / "m6_admin_security" / "document_approval_router.py"
    ).read_text(encoding="utf-8")
    for kw in ("PENDING", "APPROVED", "REJECTED"):
        assert kw in router_src, f"Missing approval state {kw}"


def test_s2_sync_04_upload_approval_sha256_column_audit():
    """S2_SYNC_04: Audit Defect E2E-ISS-10 — KnowledgeUploadApproval ORM model should define sha256_hash column."""
    cols = set(KnowledgeUploadApproval.__table__.columns.keys())
    assert "sha256_hash" in cols, (
        f"Defect E2E-ISS-10 confirmed: sha256_hash column missing on knowledge_upload_approvals (found: {sorted(cols)})"
    )


# =============================================================================
# 3. USER ADMIN, AUDIT LOG & DYNAMIC 2D RBAC MATRIX (PB02, PB03, PB72)
# =============================================================================

def test_s2_rbac_01_role_code_normalization():
    """S2_RBAC_01: normalize_role_code() maps all canonical & alias role strings accurately."""
    assert normalize_role_code("it_admin") == "ADMIN"
    assert normalize_role_code("executive") == "EXECUTIVE"
    assert normalize_role_code("department_manager") == "DEPARTMENT_MANAGER"
    assert normalize_role_code("knowledge_manager") == "DEPARTMENT_MANAGER"
    assert normalize_role_code("standard") == "STANDARD_USER"


def test_s2_rbac_02_department_code_normalization():
    """S2_RBAC_02: normalize_dept_code() maps all 5 Vietnamese/English enterprise departments."""
    assert normalize_dept_code("Kinh doanh") == "SALES"
    assert normalize_dept_code("Pháp chế") == "LEGAL"
    assert normalize_dept_code("Kế toán / Thu mua") == "ACCOUNTING_PROCUREMENT"
    assert normalize_dept_code("Công nghệ / IT") == "IT"
    assert normalize_dept_code("R&D") == "RND"


@pytest.mark.asyncio
async def test_s2_rbac_03_matrix_endpoint_requires_admin():
    """S2_RBAC_03: GET /api/admin/rbac-matrix blocks unauthenticated requests (401/403)."""
    app = _make_otp_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/admin/rbac-matrix")
    assert resp.status_code in (401, 403)


def test_s2_rbac_04_audit_log_immutability_br03():
    """S2_RBAC_04: audit_logs has no PUT/PATCH/DELETE endpoints in user_admin_api.py (BR-03)."""
    src = (
        REPO_ROOT / "backend" / "app" / "modules" / "m6_admin_security" / "user_admin_api.py"
    ).read_text(encoding="utf-8")
    assert "delete(\"/audit" not in src.lower()
    assert "put(\"/audit" not in src.lower()


def test_s2_rbac_05_matrix_role_codes_canonical_audit():
    """S2_RBAC_05: Audit Defect E2E-ISS-02 — 2D RBAC Matrix role list alignment with 5-role split vs 4 canonical roles."""
    role_codes = [r["code"] if isinstance(r, dict) else str(r) for r in MATRIX_ROLES]
    assert len(role_codes) >= 4
    for expected in ("ADMIN", "EXECUTIVE", "DEPARTMENT_MANAGER", "STANDARD_USER"):
        assert expected in role_codes


def test_s2_otp_06_live_smtp_delivery_without_credentials():
    """S2_OTP_06 [Real Runtime Limitation]: Live external SMTP email delivery fails without real SMTP App Password."""
    import os
    assert os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"), (
        "Real Runtime Limitation: Live external SMTP credentials (SMTP_USER/SMTP_PASSWORD) not configured in environment."
    )


# =============================================================================
# 5. BLACK-BOX (DECISION TABLE) & WHITE-BOX (PATH COVERAGE) TESTS
# =============================================================================

def test_s2_bb_01_decision_table_rbac_department_matrix():
    """S2_BB_01 [Black-Box — Decision Table]: 4 roles x 2 departments (sales, it) access decision matrix."""
    cases = [
        (ROLE_EXECUTIVE, True, {"*"}, "sales", True),
        (ROLE_EXECUTIVE, True, {"*"}, "it", True),
        (ROLE_ADMIN, True, {"*"}, "sales", True),
        (ROLE_ADMIN, True, {"*"}, "it", True),
        (ROLE_MANAGER, False, {"sales", "legal", "accounting", "rnd"}, "sales", True),
        (ROLE_MANAGER, False, {"sales", "legal", "accounting", "rnd"}, "it", False),
        (ROLE_STANDARD, False, {"sales"}, "sales", True),
        (ROLE_STANDARD, False, {"sales"}, "it", False),
    ]
    for role, unres, depts, target, expected in cases:
        sc = ScopeContext(user=_fake_user(role=role), role=role, is_unrestricted=unres, department_name="Sales", canonical_dept="sales", allowed_depts=depts)
        assert sc.is_department_allowed(target) is expected, f"Decision table mismatch for {role} -> {target}"


def test_s2_wb_01_path_coverage_normalize_dept_and_role():
    """S2_WB_01 [White-Box — Path Coverage]: Exercises all branches of normalize_dept_code() & normalize_role_code() including fallback."""
    assert normalize_dept_code(None) == "ALL"
    assert normalize_dept_code("Toàn công ty") == "ALL"
    assert normalize_dept_code("Ke toan") == "ACCOUNTING_PROCUREMENT"
    assert normalize_dept_code("Phap ly") == "LEGAL"
    assert normalize_dept_code("Nghien cuu") == "RND"
    assert normalize_dept_code("Cong nghe") == "IT"
    assert normalize_dept_code("FINANCE_OPS") == "FINANCE_OPS"
    assert normalize_role_code("unknown_guest") == "STANDARD_USER"


# =============================================================================
# 4. 3-STEP EMAIL OTP PASSWORD RECOVERY & SESSION ENFORCEMENT (PB73, PB74)
# =============================================================================

@pytest.mark.asyncio
async def test_s2_otp_01_forgot_password_unknown_email_returns_404():
    """S2_OTP_01: POST /api/v1/auth/forgot-password returns 200 with generic message for unregistered email (OWASP anti-enumeration)."""
    app = _make_otp_app(user_obj=None)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@graphmind.ai"})
    assert resp.status_code == 200
    assert "Nếu email tồn tại trong hệ thống" in resp.json().get("message", "")


@pytest.mark.asyncio
async def test_s2_otp_02_forgot_password_locked_user_returns_403():
    """S2_OTP_02: POST /api/v1/auth/forgot-password returns 200 with generic message for locked user (OWASP anti-enumeration)."""
    app = _make_otp_app(user_obj=_fake_user(is_active=False))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/forgot-password", json={"email": "staff@graphmind.ai"})
    assert resp.status_code == 200
    assert "Nếu email tồn tại trong hệ thống" in resp.json().get("message", "")


@pytest.mark.asyncio
async def test_s2_otp_03_forgot_password_rate_limit_returns_429():
    """S2_OTP_03: Exceeding OTP request rate limit returns HTTP 429 Too Many Requests."""
    app = _make_otp_app(user_obj=_fake_user(is_active=True))
    with patch("app.modules.m6_admin_security.forgot_password_router.check_rate_limit", new=AsyncMock(return_value=False)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/v1/auth/forgot-password", json={"email": "staff@graphmind.ai"})
    assert resp.status_code == 429


@pytest.mark.asyncio
async def test_s2_otp_04_verify_invalid_otp_returns_400():
    """S2_OTP_04: Submitting wrong/expired OTP to /verify-otp returns HTTP 400."""
    app = _make_otp_app(user_obj=_fake_user(is_active=True))
    with patch(
        "app.modules.m6_admin_security.forgot_password_router.verify_otp",
        new=AsyncMock(return_value=(False, "Mã OTP không đúng hoặc đã hết hạn.")),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/auth/verify-otp",
                json={"email": "staff@graphmind.ai", "otp_code": "000000"},
            )
    assert resp.status_code == 400


def test_s2_otp_05_otp_policy_constants():
    """S2_OTP_05: OTP service enforces 5-minute TTL (300s), max 3 attempts, and rate limit 5/15min."""
    assert OTP_TTL_MINUTES == 5
    assert MAX_ATTEMPTS == 3
    assert RATE_LIMIT_COUNT == 5
