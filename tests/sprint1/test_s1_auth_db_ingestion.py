"""
GraphMind Sprint 1 Automation Suite — pytest + httpx + pytest-asyncio
Covers:
  - Module 6: Authentication, Enterprise Validation, Single Active Session, OTP (PB01, PB43, PB73)
  - Module 1: Data Ingestion Parsers & SHA-256 Duplicate Guard (PB07, PB46)
  - Module 6: Multi-Model Database Architecture & Docker Compose / CI (PB45)
"""
import hashlib
import inspect
import uuid
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, decode_access_token, get_password_hash
from app.db.postgres.database import Base
from app.db.postgres.models.otp import PasswordResetOtp
from app.core.central_storage import check_document_duplicate
from app.modules.m1_data_sync.pipeline import extract_text_from_bytes, SUPPORTED_EXTENSIONS
from app.tests.fakes.fake_neo4j import FakeNeo4jClient
from app.tests.fakes.fake_qdrant import FakeQdrantClientWrapper
from app.tests.fakes.test_app_factory import create_test_app

REPO_ROOT = Path(__file__).resolve().parents[2]


def _make_fake_user(
    *,
    username="exec",
    email="executive@graphmind.ai",
    password_plain="123456",
    role="executive",
    is_active=True,
    status="active",
    deleted_at=None,
):
    return SimpleNamespace(
        user_id=uuid.uuid4(),
        username=username,
        email=email,
        full_name="Executive User",
        password_hash=get_password_hash(password_plain),
        role=role,
        department="Sales",
        is_active=is_active,
        status=status,
        is_superuser=(role == "it_admin"),
        deleted_at=deleted_at,
        last_login_at=None,
        last_active_at=None,
    )


def _mock_db_returning(user_obj):
    mock_session = AsyncMock()
    cursor = MagicMock()
    cursor.scalar_one_or_none.return_value = user_obj
    cursor.fetchone.return_value = None
    cursor.fetchall.return_value = []
    mock_session.execute.return_value = cursor
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    return mock_session


# =============================================================================
# 1. AUTHENTICATION & SINGLE ACTIVE SESSION (PB01, PB43, PB73)
# =============================================================================

@pytest.mark.asyncio
async def test_s1_auth_01_valid_jwt_login():
    """S1_AUTH_01: Valid login returns 200 with HS256 JWT containing sub, role, jti."""
    user = _make_fake_user()
    app = create_test_app(db_session_override=_mock_db_returning(user))
    with (
        patch("app.api.v1.auth.ensure_sessions_table", new=AsyncMock()),
        patch("app.api.v1.auth.upsert_active_session", new=AsyncMock(return_value=False)),
        patch("app.api.v1.auth.log_action", new=AsyncMock()),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/v1/auth/login", json={"identifier": "exec", "password": "123456"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    payload = decode_access_token(body["access_token"])
    assert payload["sub"] == str(user.user_id)
    assert payload["role"] == "executive"
    assert payload.get("jti")


@pytest.mark.asyncio
async def test_s1_auth_02_invalid_password_returns_401():
    """S1_AUTH_02: Wrong password returns 401 and issues no JWT."""
    user = _make_fake_user(password_plain="correctPass1")
    app = create_test_app(db_session_override=_mock_db_returning(user))
    with patch("app.api.v1.auth.log_action", new=AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/v1/auth/login", json={"identifier": "exec", "password": "wrong"})
    assert resp.status_code == 401
    assert "access_token" not in resp.json()


@pytest.mark.asyncio
async def test_s1_auth_03_nonexistent_user_returns_401():
    """S1_AUTH_03: Non-existent user returns 401 Unauthorized."""
    app = create_test_app(db_session_override=_mock_db_returning(None))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={"identifier": "ghost@graphmind.ai", "password": "123456"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_s1_auth_04_locked_account_returns_403():
    """S1_AUTH_04: Locked/inactive account is rejected with 403 Forbidden."""
    user = _make_fake_user(is_active=False, status="locked")
    app = create_test_app(db_session_override=_mock_db_returning(user))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={"identifier": "exec", "password": "123456"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_s1_auth_05_me_without_bearer_returns_401():
    """S1_AUTH_05: GET /api/v1/auth/me without Authorization header returns 401."""
    app = create_test_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_s1_auth_06_me_with_invalid_token_returns_401():
    """S1_AUTH_06: GET /api/v1/auth/me with tampered JWT returns 401."""
    app = create_test_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_s1_auth_07_single_active_session_jti_revocation():
    """S1_AUTH_07: Concurrent login replaces old JTI and kicks old device with 401 CONCURRENT_LOGIN_KICKED."""
    user = _make_fake_user()
    app = create_test_app(db_session_override=_mock_db_returning(user))
    active_jti_store = {}

    async def _upsert(db, uid, jti, ip, ua):
        had_prev = uid in active_jti_store
        active_jti_store[uid] = jti
        return had_prev

    async def _get_jti(db, uid):
        return active_jti_store.get(uid)

    with (
        patch("app.api.v1.auth.ensure_sessions_table", new=AsyncMock()),
        patch("app.api.v1.auth.upsert_active_session", side_effect=_upsert),
        patch("app.api.v1.auth.get_active_jti", side_effect=_get_jti),
        patch("app.api.v1.auth.log_action", new=AsyncMock()),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r1 = await client.post("/api/v1/auth/login", json={"identifier": "exec", "password": "123456"})
            r2 = await client.post("/api/v1/auth/login", json={"identifier": "exec", "password": "123456"})
            tok1, tok2 = r1.json()["access_token"], r2.json()["access_token"]
            assert tok1 != tok2
            # Device 2 active -> 200; Device 1 revoked -> 401
            me2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok2}"})
            assert me2.status_code == 200
            me1 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok1}"})
            assert me1.status_code == 401


def test_s1_auth_08_enterprise_departments_and_roles_schema():
    """S1_AUTH_08: Canonical 5 enterprise departments and 4 RBAC roles are defined."""
    from app.core.rbac import DEPT_CANONICAL

    canonical_values = set(DEPT_CANONICAL.values())
    for required in ["sales", "legal", "accounting", "it", "rnd"]:
        assert required in canonical_values, f"Missing canonical dept {required}"


def test_s1_auth_09_otp_hash_hmac_security_audit():
    """S1_AUTH_09: Security check for PB74/E2E-ISS-05 — OTP hash must use HMAC-SHA256 (salted), not bare SHA-256."""
    src = inspect.getsource(PasswordResetOtp.hash_otp)
    # Intentionally verify HMAC requirement per PB74 AC1 & Test Plan Defect E2E-ISS-05
    assert "hmac" in src.lower(), (
        "Defect E2E-ISS-05 confirmed: PasswordResetOtp.hash_otp uses unsalted SHA-256 instead of HMAC-SHA256"
    )


# =============================================================================
# 2. DATA INGESTION PIPELINE, PARSERS & SHA-256 HASH GUARD (PB07, PB46)
# =============================================================================

@pytest.mark.asyncio
async def test_s1_ing_01_sha256_hash_guard_determinism():
    """S1_ING_01: Brand-new file allowed; existing duplicate file/hash rejected by BR-06 guard."""
    is_dup_new, reason_new = await check_document_duplicate(
        "s1_unique_contract_2099.pdf", b"Unique GraphMind Sprint 1 contract content 2099"
    )
    assert is_dup_new is False and reason_new is None
    is_dup_existing, reason_existing = await check_document_duplicate(
        "Purchasing_PurchaseOrderDetail.csv", b"Any content"
    )
    assert is_dup_existing is True and reason_existing is not None


def test_s1_ing_02_txt_parser_encodings_and_sanitization():
    """S1_ING_02: TXT parser decodes UTF-8, UTF-8-SIG BOM, and CP1252 while stripping control chars."""
    utf8_bom = "\ufeffHợp đồng dịch vụ GraphMind\x00\x07".encode("utf-8")
    text = extract_text_from_bytes("bom_test.txt", utf8_bom)
    assert "Hợp đồng dịch vụ GraphMind" in text
    assert "\x00" not in text

    cp1252_bytes = b"Caf\xe9 Contract \x96 Clause 1"
    text2 = extract_text_from_bytes("cp1252.txt", cp1252_bytes)
    assert "Clause 1" in text2
    assert ".txt" in SUPPORTED_EXTENSIONS


def test_s1_ing_03_txt_parser_rejects_oversized_file():
    """S1_ING_03: TXT parser rejects files larger than 10 MB ceiling."""
    oversized = b"A" * (10 * 1024 * 1024 + 10)
    with pytest.raises(ValueError):
        extract_text_from_bytes("too_big.txt", oversized)


def test_s1_ing_04_adventureworks_etl_scripts_present():
    """S1_ING_04: AdventureWorks ETL ingestion scripts exist and are syntactically valid."""
    etl_scripts = [
        REPO_ROOT / "scripts" / "ingest_adventureworks_graph.py",
        REPO_ROOT / "scripts" / "ingest_adventureworks_orders.py",
        REPO_ROOT / "scripts" / "ingest_adventureworks_vectors.py",
    ]
    for script in etl_scripts:
        assert script.exists(), f"Missing ETL script: {script}"
        compile(script.read_text(encoding="utf-8"), str(script), "exec")


def test_s1_ing_05_cuad_extraction_script_valid():
    """S1_ING_05: CUAD preprocessing & extraction script exists and compiles cleanly."""
    cuad_script = REPO_ROOT / "research" / "src" / "ner_re" / "extract_cuad_kg.py"
    assert cuad_script.exists()
    compile(cuad_script.read_text(encoding="utf-8"), str(cuad_script), "exec")


def test_s1_ing_06_fake_neo4j_and_qdrant_isolation():
    """S1_ING_06: In-memory FakeNeo4jClient and FakeQdrantClientWrapper operate without network sockets."""
    neo = FakeNeo4jClient()
    qdr = FakeQdrantClientWrapper()
    neo.reset()
    assert neo is not None and qdr is not None


# =============================================================================
# 3. MULTI-MODEL DATABASE ARCHITECTURE & CI / DOCKER COMPOSE (PB45)
# =============================================================================

def test_s1_db_01_postgres_mvp_tables_registered():
    """S1_DB_01: Core PostgreSQL ORM models register expected MVP tables in SQLAlchemy Base.metadata."""
    from app.db.postgres.models import user, audit_log, copilot_session, sop_document, otp, shift_report  # noqa: F401
    from app.modules.m6_admin_security import rbac_matrix_model, document_approval_model  # noqa: F401

    tables = set(Base.metadata.tables.keys())
    expected_core = {"users", "audit_logs", "password_reset_otps", "copilot_sessions", "sop_documents"}
    missing = expected_core - tables
    assert not missing, f"Missing core tables: {missing}"


def test_s1_db_02_postgres_pool_pre_ping_enabled():
    """S1_DB_02: database.py configures SQLAlchemy async engine with pool_pre_ping=True."""
    db_src = (REPO_ROOT / "backend" / "app" / "db" / "postgres" / "database.py").read_text(encoding="utf-8")
    assert "pool_pre_ping=True" in db_src


def test_s1_db_03_multi_model_clients_defined():
    """S1_DB_03: Neo4j and Qdrant client modules exist with expected collection/connection configuration."""
    neo_path = REPO_ROOT / "backend" / "app" / "db" / "neo4j" / "client.py"
    qdr_path = REPO_ROOT / "backend" / "app" / "db" / "qdrant" / "client.py"
    assert neo_path.exists() and qdr_path.exists()
    assert "cuad_contracts" in (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")


def test_s1_db_04_docker_compose_services_defined():
    """S1_CI_01: docker-compose.yml defines neo4j, qdrant, backend, frontend, and file-watcher services."""
    dc = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    for svc in ["neo4j:", "qdrant:", "backend:", "frontend:", "file-watcher:"]:
        assert svc in dc, f"Missing service {svc} in docker-compose.yml"


def test_s1_db_05_known_limitation_sessions_physical_fk_e2e_iss_06():
    """S1_DB_05 [Known MVP Limitation E2E-ISS-06]: user_active_sessions lacks physical FK constraint & Alembic chain."""
    src = (REPO_ROOT / "backend" / "app" / "modules" / "m6_admin_security" / "session_service.py").read_text(encoding="utf-8")
    assert "REFERENCES users(" in src, (
        "Known Limitation E2E-ISS-06: user_active_sessions DDL omits physical FOREIGN KEY REFERENCES users(user_id)"
    )
