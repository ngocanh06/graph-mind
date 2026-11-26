import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from jose import jwt
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings, settings
from app.core.security import create_access_token, decode_access_token
from app.db.postgres.models import User
from app.db.postgres.database import get_db

client = TestClient(app)

OPS_USER_ID = "1779f027-4909-4584-a66f-804713da2acb"  # Standard user ops

def test_anonymous_requests_rejected_fail_closed():
    """BR-01 / P11: Anonymous requests to protected endpoints must return 401."""
    # 1. Copilot
    r1 = client.post("/api/copilot/ask", json={"query": "test query"})
    assert r1.status_code == 401, f"Expected 401 for anonymous copilot ask, got {r1.status_code}: {r1.text}"

    # 2. Documents Raw & Download
    r2 = client.get("/api/documents/raw?filename=test.pdf")
    assert r2.status_code == 401, f"Expected 401 for anonymous documents raw, got {r2.status_code}: {r2.text}"

    r3 = client.get("/api/documents/download?filename=test.pdf")
    assert r3.status_code == 401, f"Expected 401 for anonymous documents download, got {r3.status_code}: {r3.text}"

    # 3. Neo4j Search & Node
    r4 = client.get("/api/neo4j/search?q=test")
    assert r4.status_code == 401, f"Expected 401 for anonymous neo4j search, got {r4.status_code}: {r4.text}"

    # 4. Risk Alerts
    r5 = client.get("/api/risk/alerts")
    assert r5.status_code == 401, f"Expected 401 for anonymous risk alerts, got {r5.status_code}: {r5.text}"


def test_client_role_spoofing_prevented():
    """P11: Client headers (X-User-Role, X-User-Dept, X-User-Id) must NOT elevate privileges."""
    ops_token = create_access_token(data={"sub": OPS_USER_ID, "role": "standard"})
    headers = {
        "Authorization": f"Bearer {ops_token}",
        "X-User-Role": "admin",
        "X-User-Dept": "Legal",
        "X-User-Id": "81f40efc-f51d-456c-86fe-591b64932f14"  # admin uid
    }

    fake_user = User(
        user_id=uuid.UUID(OPS_USER_ID),
        email="ops@example.com",
        username="ops",
        role="standard",
        status="active",
        is_active=True,
        is_superuser=False,
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = fake_user
    mock_res.scalars.return_value.all.return_value = [fake_user]

    async def override_get_db():
        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_res)
        yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        # 1. Document approval router must reject standard user trying to approve with spoofed role
        dummy_uuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        r_approve = client.post(f"/api/admin/upload-approvals/{dummy_uuid}/approve", headers=headers, json={"comment": "hacked"})
        assert r_approve.status_code == 403, f"Expected 403 Forbidden for spoofed ops approval, got {r_approve.status_code}: {r_approve.text}"

        # 2. Risk alerts must not treat spoofed role as executive
        r_alerts = client.get("/api/risk/alerts", headers=headers)
        assert r_alerts.status_code == 200
        data = r_alerts.json()
        assert data.get("isUnrestricted") is not True, "Spoofed X-User-Role gave isUnrestricted=True!"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.parametrize("non_admin_role", ["standard", "manager", "executive"])
def test_admin_routes_reject_non_admin_roles(non_admin_role):
    """Admin routes MUST reject standard, manager, and executive roles with 403 Forbidden."""
    user_id = str(uuid.uuid4())
    token = create_access_token(data={"sub": user_id, "role": non_admin_role})
    headers = {"Authorization": f"Bearer {token}"}

    fake_user = User(
        user_id=uuid.UUID(user_id),
        email=f"{non_admin_role}@graphmind.ai",
        username=non_admin_role,
        role=non_admin_role,
        status="active",
        is_active=True,
        is_superuser=False,
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = fake_user
    mock_res.scalars.return_value.all.return_value = [fake_user]

    async def override_get_db():
        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_res)
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        # 1. User management admin list
        r1 = client.get("/api/v1/admin/users", headers=headers)
        assert r1.status_code == 403, f"Expected 403 for {non_admin_role} on /api/v1/admin/users, got {r1.status_code}"

        # 2. Create user endpoint
        r2 = client.post("/api/v1/admin/users", headers=headers, json={"email": "new@test.com", "username": "new"})
        assert r2.status_code == 403, f"Expected 403 for {non_admin_role} on POST /api/v1/admin/users, got {r2.status_code}"

        # 3. Document approval
        dummy_uuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        r3 = client.post(f"/api/admin/upload-approvals/{dummy_uuid}/approve", headers=headers, json={})
        assert r3.status_code == 403, f"Expected 403 for {non_admin_role} on approve, got {r3.status_code}"

        # 4. Audit logs
        r4 = client.get("/api/v1/admin/audit-logs", headers=headers)
        assert r4.status_code == 403, f"Expected 403 for {non_admin_role} on audit-logs, got {r4.status_code}"

        # 5. RBAC Matrix
        r5 = client.get("/api/v1/admin/rbac-matrix", headers=headers)
        assert r5.status_code == 403, f"Expected 403 for {non_admin_role} on rbac-matrix, got {r5.status_code}"

        # 6. Password reset admin endpoint (PATCH)
        r6 = client.patch(f"/api/v1/admin/users/{dummy_uuid}/reset-password", headers=headers, json={"new_password": "NewSecurePassword123!"})
        assert r6.status_code == 403, f"Expected 403 for {non_admin_role} on reset-password, got {r6.status_code}"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_jwt_expired_tampered_and_inactive_users():
    """Verify fixed algorithms, expiration rejection, tampered signatures, and inactive/locked users."""
    user_id = str(uuid.uuid4())

    # 1. Expired token (exp in the past)
    expired_token = create_access_token(
        data={"sub": user_id, "role": "standard"},
        expires_delta=timedelta(minutes=-30)
    )
    payload_exp = decode_access_token(expired_token)
    assert payload_exp is None, "Expired token must return None on decode"
    r_exp = client.get("/api/documents/raw?filename=test.pdf", headers={"Authorization": f"Bearer {expired_token}"})
    assert r_exp.status_code == 401, f"Expected 401 for expired token, got {r_exp.status_code}"

    # 2. Tampered token (signed with wrong secret key)
    tampered_token = jwt.encode({"sub": user_id, "role": "admin"}, "wrong-secret-key-12345678901234567890", algorithm="HS256")
    r_tamp = client.get("/api/documents/raw?filename=test.pdf", headers={"Authorization": f"Bearer {tampered_token}"})
    assert r_tamp.status_code == 401, f"Expected 401 for tampered token, got {r_tamp.status_code}"

    # 3. Inactive / Locked user in DB
    valid_token = create_access_token(data={"sub": user_id, "role": "standard"})
    locked_user = User(
        user_id=uuid.UUID(user_id),
        email="locked@test.com",
        username="locked",
        role="standard",
        status="locked",  # or is_active=False
        is_active=False,
        is_superuser=False,
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = locked_user

    async def override_get_db():
        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_res)
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        r_lock = client.get("/api/documents/raw?filename=test.pdf", headers={"Authorization": f"Bearer {valid_token}"})
        assert r_lock.status_code == 403, f"Expected 403 for locked user, got {r_lock.status_code}: {r_lock.text}"
        assert "bị khóa" in r_lock.text
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_secret_key_rejection_of_empty_or_default_keys():
    """Settings must fail validation and refuse startup if SECRET_KEY is empty, default, or leaked."""
    from pydantic import ValidationError

    # Empty
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="")

    # Default placeholder containing change-me
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="some-key-with-change-me-placeholder")

    # Leaked key (matches forbidden SHA-256 hash)
    from app.core.config import FORBIDDEN_SECRET_HASHES
    import hashlib
    test_banned_key = "banned_historical_key_" + "x" * 42
    test_banned_hash = hashlib.sha256(test_banned_key.encode("utf-8")).hexdigest()
    FORBIDDEN_SECRET_HASHES.add(test_banned_hash)
    try:
        with pytest.raises(ValidationError):
            Settings(SECRET_KEY=test_banned_key)
    finally:
        FORBIDDEN_SECRET_HASHES.discard(test_banned_hash)

    # Short key (< 32 chars)
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="too-short-key")

    # Agent key containing dev-agent-key or change-me in non-testing env
    import os
    orig_env = os.environ.get("APP_ENV", "testing")
    try:
        os.environ["APP_ENV"] = "production"
        with pytest.raises(ValidationError):
            Settings(AEGIS_AGENT_API_KEY="dev-agent-key")
        with pytest.raises(ValidationError):
            Settings(AEGIS_AGENT_API_KEY="change-me-agent-key")
        with pytest.raises(ValidationError):
            Settings(POSTGRES_PASSWORD="password")
        with pytest.raises(ValidationError):
            Settings(POSTGRES_PASSWORD="change-me")
    finally:
        os.environ["APP_ENV"] = orig_env


def test_standing_api_security_guard_all_routes_authenticated():
    """Standing guard: Every business API route must have an explicit authentication dependency."""
    from fastapi.routing import APIRoute
    from starlette.routing import Route, Mount

    PUBLIC_WHITELIST_PATHS = {
        "/",
        "/api-status",
        "/health",
        "/api/health",
        "/docs",
        "/docs/oauth2-redirect",
        "/openapi.json",
        "/redoc",
        "/api/auth/login",
        "/api/v1/auth/login",
        "/api/auth/logout",
        "/api/v1/auth/logout",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v1/auth/verify-otp",
        "/api/v1/connectors/google/callback",
    }

    AUTH_DEP_NAMES = {
        "get_user_scope",
        "get_current_user",
        "get_admin_user",
        "require_role",
        "require_admin",
        "_verify_doc_action_auth",
        "get_current_active_user",
        "get_request_user",
        "verify_agent_token",
        "HTTPBearer",
        "security_bearer",
    }

    def walk_routes(routes, prefix=""):
        res = []
        for r in routes:
            if isinstance(r, APIRoute):
                res.append((prefix + r.path, r))
            elif isinstance(r, Route):
                res.append((prefix + r.path, r))
            elif isinstance(r, Mount):
                sub = getattr(r.app, "routes", getattr(r, "routes", []))
                res.extend(walk_routes(sub, prefix + r.path))
            elif "IncludedRouter" in type(r).__name__:
                sub_prefix = prefix + (r.include_context.prefix if hasattr(r, "include_context") else "")
                res.extend(walk_routes(r.original_router.routes, sub_prefix))
            elif hasattr(r, "routes"):
                res.extend(walk_routes(r.routes, prefix + getattr(r, "prefix", "")))
        return res

    all_routes = walk_routes(app.routes)
    unprotected = []

    for path, r in all_routes:
        # Check if route path is in public whitelist
        normalized_path = path.rstrip("/") if path != "/" else "/"
        if normalized_path in PUBLIC_WHITELIST_PATHS or any(normalized_path.startswith(w) for w in ["/docs", "/redoc", "/api/v1/auth/forgot-password"]):
            continue

        # Check dependencies
        deps = []
        if hasattr(r, "dependant"):
            for d in r.dependant.dependencies:
                name = d.call.__name__ if hasattr(d.call, "__name__") else type(d.call).__name__
                deps.append(name)

        has_auth = any(d in AUTH_DEP_NAMES for d in deps)
        if not has_auth:
            unprotected.append((path, getattr(r, "name", ""), deps))

    # We enforce that all core routes have authentication
    assert len(unprotected) == 0, f"Found {len(unprotected)} unprotected business routes: {unprotected[:10]}"
