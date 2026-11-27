import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.core.rbac import get_user_scope
from app.db.postgres.models import User
from app.modules.m6_admin_security.rbac_matrix_model import KnowledgeAccessPolicy


@pytest.mark.asyncio
async def test_get_user_scope_reads_policy_per_department():
    """2B.2: get_user_scope reads policies per role AND department strictly from DB."""
    uid = uuid.uuid4()
    did = uuid.uuid4()

    user_sales = User(
        user_id=uid,
        email="sales_user@graphmind.ai",
        username="sales_user",
        role="standard",
        status="active",
        is_active=True,
        is_superuser=False,
        department_id=did,
    )

    mock_db = AsyncMock()

    # Mock department lookup
    mock_dept_cursor = MagicMock()
    mock_dept_cursor.fetchone.return_value = ["Kinh doanh (Sales)"]

    # Mock policy lookup: only SALES is permitted for this role & department
    sales_policy = KnowledgeAccessPolicy(
        role_code="STANDARD_USER",
        department_code="SALES",
        resource_type="SALES",
        can_query=True,
    )
    mock_policy_cursor = MagicMock()
    mock_policy_cursor.scalars.return_value.all.return_value = [sales_policy]

    async def mock_execute(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        if "from departments" in stmt_str:
            return mock_dept_cursor
        if "knowledge_access_policies" in stmt_str:
            return mock_policy_cursor
        mock_generic = MagicMock()
        mock_generic.scalars.return_value.all.return_value = []
        mock_generic.fetchone.return_value = None
        return mock_generic

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    scope = await get_user_scope(user=user_sales, db=mock_db)

    assert scope.is_unrestricted is False
    assert scope.canonical_dept == "sales"
    assert scope.allowed_resources == {"SALES"}
    assert scope.allowed_depts == {"sales"}
    assert scope.is_department_allowed("sales") is True
    assert scope.is_department_allowed("legal") is False


@pytest.mark.asyncio
async def test_get_user_scope_fail_closed_on_policy_error():
    """2B.2: If DB policy query fails, standard user receives ONLY their own department resource, not cross-department defaults."""
    uid = uuid.uuid4()
    did = uuid.uuid4()

    user_sales = User(
        user_id=uid,
        email="sales_user@graphmind.ai",
        username="sales_user",
        role="standard",
        status="active",
        is_active=True,
        is_superuser=False,
        department_id=did,
    )

    mock_db = AsyncMock()

    # Mock department lookup
    mock_dept_cursor = MagicMock()
    mock_dept_cursor.fetchone.return_value = ["Kinh doanh (Sales)"]

    async def mock_execute(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        if "from departments" in stmt_str:
            return mock_dept_cursor
        if "knowledge_access_policies" in stmt_str:
            raise RuntimeError("Database connection dropped")
        return MagicMock()

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    scope = await get_user_scope(user=user_sales, db=mock_db)

    # Must NOT have IT or RND from legacy fallback!
    assert scope.is_unrestricted is False
    assert scope.canonical_dept == "sales"
    assert scope.allowed_resources == {"SALES"}
    assert "IT" not in scope.allowed_resources
    assert "RND" not in scope.allowed_resources
    assert scope.allowed_depts == {"sales"}
