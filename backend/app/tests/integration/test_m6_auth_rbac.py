"""M6 role, login-contract, and department-scope checks without live services."""
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.modules.m6_admin_security.rbac import canonical_role
from app.modules.m6_admin_security.rbac_matrix_service import normalize_role_code
from app.schemas.auth import LoginRequest
from app.schemas.user_admin import UserCreateRequest, UserRoleUpdateRequest
from app.tests.fakes.test_app_factory import create_test_app


@pytest.mark.parametrize(
    ("raw", "canonical"),
    [
        ("standard", "standard"),
        ("standard_user", "standard"),
        ("sales", "standard"),
        ("knowledge_manager", "knowledge_manager"),
        ("department_manager", "knowledge_manager"),
        ("manager", "knowledge_manager"),
        ("executive", "executive"),
        ("ceo", "executive"),
        ("it_admin", "it_admin"),
        ("admin", "it_admin"),
    ],
)
def test_m6_role_aliases_have_one_canonical_identity(raw, canonical):
    assert canonical_role(raw) == canonical
    expected_matrix_role = {
        "standard": "STANDARD_USER",
        "knowledge_manager": "DEPARTMENT_MANAGER",
        "executive": "EXECUTIVE",
        "it_admin": "ADMIN",
    }[canonical]
    assert normalize_role_code(raw) == expected_matrix_role


@pytest.mark.parametrize(
    ("role", "username", "user_department", "target_department", "allowed", "rule"),
    [
        ("standard", "ops", "sales", "sales", True, "BR-02"),
        ("standard", "ops", "sales", "legal", False, "BR-02"),
        ("knowledge_manager", "manager", "sales", "sales", True, "BR-02"),
        ("knowledge_manager", "manager", "sales", "legal", False, "BR-02"),
        ("executive", "exec", "executive", "legal", True, "BR-05"),
        ("it_admin", "admin", "it_admin", "legal", True, "BR-03"),
    ],
)
@pytest.mark.asyncio
async def test_m6_rbac_check_role_department_matrix(
    role, username, user_department, target_department, allowed, rule
):
    app = create_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.post(
            "/api/v1/rbac/check",
            headers={
                "X-User-Name": username,
                "X-User-Role": role,
                "X-User-Dept": user_department,
            },
            json={
                "department": target_department,
                "resource_type": "contract",
                "action": "read",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["allowed"] is allowed, body
    assert body["rule"] == rule
    assert body["user"]["role"] == role


def test_m6_login_and_admin_input_validation():
    with pytest.raises(ValidationError):
        LoginRequest.model_validate({})
    with pytest.raises(ValidationError):
        LoginRequest.model_validate({"identifier": "qa-user"})

    valid = {
        "email": "qa-user@graphmind.test",
        "password": "valid-test-password",
        "role": "standard",
    }
    assert UserCreateRequest.model_validate(valid).email == "qa-user@graphmind.test"
    for invalid in (
        {**valid, "email": "not-an-email"},
        {**valid, "password": "short"},
        {**valid, "role": "research_team"},
    ):
        with pytest.raises(ValidationError):
            UserCreateRequest.model_validate(invalid)
    with pytest.raises(ValidationError):
        UserRoleUpdateRequest.model_validate({"role": "unknown-role"})


@pytest.mark.asyncio
async def test_m6_missing_and_invalid_bearer_tokens_are_rejected():
    app = create_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        missing = await client.get("/api/v1/auth/me")
        invalid = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
        )
        malformed = await client.post("/api/v1/auth/login", json={})

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert malformed.status_code == 422
