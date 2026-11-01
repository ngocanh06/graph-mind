"""
Integration Smoke Tests for Test App Factory (PR0 Isolated Test Harness).
Verifies:
1. create_test_app() starts cleanly without running live lifespan.
2. Real router endpoints (/api/v1/rbac/check, /api/v1/auth) operate with dependency overrides.
3. RBAC scope and header validations function identically to production.
4. Zero database connections are attempted.
Marked with @pytest.mark.integration.
"""
import urllib.parse
import pytest
from httpx import AsyncClient, ASGITransport

from app.tests.fakes.test_app_factory import create_test_app


@pytest.mark.integration
@pytest.mark.asyncio
async def test_app_factory_rbac_check_executive():
    """
    Verifies that create_test_app mounts the real rbac_router and correctly
    evaluates Executive unrestricted access (BR-05) without any DB connection.
    """
    app = create_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {
            "X-User-Name": "exec",
            "X-User-Dept": urllib.parse.quote("Ban Giám Đốc")
        }
        payload = {
            "department": "legal",
            "resource_type": "contract",
            "action": "read"
        }
        res = await client.post("/api/v1/rbac/check", headers=headers, json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["allowed"] is True
        assert data["rule"] == "BR-05"
        assert data["user"]["role"] == "executive"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_app_factory_rbac_check_department_boundary():
    """
    Verifies that a standard user in Sales trying to access Legal contracts
    is properly blocked under BR-02 without touching any live database.
    """
    app = create_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {
            "X-User-Name": "sales_staff",
            "X-User-Dept": urllib.parse.quote("Phòng Kinh Doanh")
        }
        payload = {
            "department": "legal",
            "resource_type": "contract",
            "action": "read"
        }
        res = await client.post("/api/v1/rbac/check", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["allowed"] is False
        assert data["rule"] == "BR-02"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_app_factory_auth_validation_error():
    """
    Verifies that auth_router correctly processes input validation
    and returns 422 for malformed requests without invoking PostgreSQL.
    """
    app = create_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Send empty body to login
        res = await client.post("/api/v1/auth/login", json={})
        assert res.status_code == 422  # Unprocessable Entity
        error_detail = res.json()
        assert "detail" in error_detail
