import uuid
import pytest
from app.core.central_storage import resolve_canonical_dept
from app.core.rbac import (
    DEPT_CANONICAL,
    normalize_dept,
    ScopeContext,
)
from app.db.postgres.models import User


def test_resolve_canonical_dept_fail_closed():
    """2B.1: resolve_canonical_dept must return 'unknown' on empty or unmapped string."""
    assert resolve_canonical_dept("") == "unknown"
    assert resolve_canonical_dept(None) == "unknown"
    assert resolve_canonical_dept("random_unmapped_dept") == "unknown"
    assert resolve_canonical_dept("Pháp chế (Legal)") == "legal"
    assert resolve_canonical_dept("Kinh doanh (Sales)") == "sales"
    assert resolve_canonical_dept("Công nghệ / IT") == "it"


def test_normalize_dept_fail_closed():
    """2B.1: normalize_dept must return 'unknown' on empty, None, or unmapped string."""
    assert normalize_dept(None) == "unknown"
    assert normalize_dept("") == "unknown"
    assert normalize_dept("   ") == "unknown"
    assert normalize_dept("invalid_dept_xyz") == "unknown"

    # Canonical aliases
    assert normalize_dept("Pháp chế (Legal)") == "legal"
    assert normalize_dept("pháp chế") == "legal"
    assert normalize_dept("Kinh doanh (Sales)") == "sales"
    assert normalize_dept("công nghệ / it") == "it"
    assert normalize_dept("kế toán / thu mua") == "accounting"
    assert normalize_dept("accounting_procurement") == "accounting"


def test_scope_is_department_allowed_fail_closed():
    """2B.1: ScopeContext.is_department_allowed must be fail-closed for non-unrestricted users."""
    u_ops = User(
        user_id=uuid.uuid4(),
        email="ops@graphmind.ai",
        username="ops",
        role="standard",
        status="active",
        is_active=True,
        is_superuser=False,
    )
    scope_ops = ScopeContext(
        user=u_ops,
        role="standard",
        is_unrestricted=False,
        department_name="Sales",
        canonical_dept="sales",
        allowed_depts={"sales"},
        allowed_resources={"SALES"},
    )

    # Empty, None or ALL must be denied for standard users
    assert scope_ops.is_department_allowed("") is False
    assert scope_ops.is_department_allowed(None) is False
    assert scope_ops.is_department_allowed("ALL") is False
    assert scope_ops.is_department_allowed("ALL_DEPARTMENTS") is False
    assert scope_ops.is_department_allowed("legal") is False
    assert scope_ops.is_department_allowed("Pháp chế (Legal)") is False

    # Own department must be permitted
    assert scope_ops.is_department_allowed("sales") is True
    assert scope_ops.is_department_allowed("Kinh doanh (Sales)") is True

    # Executive must be allowed across all
    u_exec = User(
        user_id=uuid.uuid4(),
        email="exec@graphmind.ai",
        username="exec",
        role="executive",
        status="active",
        is_active=True,
        is_superuser=True,
    )
    scope_exec = ScopeContext(
        user=u_exec,
        role="executive",
        is_unrestricted=True,
        department_name="Executive",
        canonical_dept="executive",
        allowed_depts={"*"},
        allowed_resources={"*"},
    )
    assert scope_exec.is_department_allowed("") is True
    assert scope_exec.is_department_allowed(None) is True
    assert scope_exec.is_department_allowed("ALL") is True
    assert scope_exec.is_department_allowed("legal") is True
    assert scope_exec.is_department_allowed("sales") is True
