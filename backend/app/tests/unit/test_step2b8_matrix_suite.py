"""
Step 2B.8: Comprehensive Role x Department x Classification RBAC Matrix Test Suite.

Exhaustively verifies every cell in the access matrix:
Roles:
  - Executive (Unrestricted)
  - IT Admin (Administration)
  - Legal Manager (Department Manager)
  - Sales Standard (Standard User)
  - IT Standard (Standard User)
  - Accounting Standard (Standard User)
  - R&D Standard (Standard User)

Target Resource Departments:
  - Legal ("Pháp chế (Legal)")
  - Sales ("Kinh doanh (Sales)")
  - IT ("Công nghệ / IT")
  - Accounting ("Kế toán / Thu mua")
  - R&D ("Nghiên cứu & Phát triển")

Target Classifications:
  - PUBLIC
  - INTERNAL
  - RESTRICTED

Security Invariants:
1. PUBLIC is accessible to all authenticated roles.
2. RESTRICTED is strictly blocked for all Standard users across all departments (Least Privilege).
3. Cross-department access to INTERNAL or RESTRICTED data is strictly blocked for all non-Executive roles (Department Isolation).
4. Executive role has unrestricted access across all departments and classifications.
5. Fail-closed: missing, empty, or unmapped department/classification defaults to DENIED.
"""

import uuid
import pytest
from app.core.rbac import (
    ScopeContext,
    build_acl_filter,
    ACLFilter
)
from app.db.postgres.models import User


def _make_scope(role: str, dept_name: str, canonical_dept: str, allowed_depts: set, allowed_res: set, is_unrestricted: bool = False):
    u = User(
        user_id=uuid.uuid4(),
        email=f"{role}_{canonical_dept}@graphmind.ai",
        username=f"{role}_{canonical_dept}",
        role=role,
        status="active",
        is_active=True,
        is_superuser=is_unrestricted,
    )
    return ScopeContext(
        user=u,
        role=role,
        is_unrestricted=is_unrestricted,
        department_name=dept_name,
        canonical_dept=canonical_dept,
        allowed_depts=allowed_depts,
        allowed_resources=allowed_res,
    )


@pytest.fixture
def acl_matrix():
    """Builds ACL filters for representative organizational roles."""
    scopes = {
        "executive": _make_scope(
            role="executive",
            dept_name="Ban Giám đốc",
            canonical_dept="executive",
            allowed_depts={"*"},
            allowed_res={"*"},
            is_unrestricted=True,
        ),
        "admin_it": _make_scope(
            role="admin",
            dept_name="Công nghệ / IT",
            canonical_dept="it",
            allowed_depts={"it", "công nghệ / it"},
            allowed_res={"IT"},
            is_unrestricted=False,
        ),
        "manager_legal": _make_scope(
            role="manager",
            dept_name="Pháp chế (Legal)",
            canonical_dept="legal",
            allowed_depts={"legal", "pháp chế (legal)"},
            allowed_res={"LEGAL"},
            is_unrestricted=False,
        ),
        "standard_sales": _make_scope(
            role="standard",
            dept_name="Kinh doanh (Sales)",
            canonical_dept="sales",
            allowed_depts={"sales", "kinh doanh (sales)"},
            allowed_res={"SALES"},
            is_unrestricted=False,
        ),
        "standard_it": _make_scope(
            role="standard",
            dept_name="Công nghệ / IT",
            canonical_dept="it",
            allowed_depts={"it", "công nghệ / it"},
            allowed_res={"IT"},
            is_unrestricted=False,
        ),
        "standard_accounting": _make_scope(
            role="standard",
            dept_name="Kế toán / Thu mua",
            canonical_dept="accounting",
            allowed_depts={"accounting", "kế toán / thu mua"},
            allowed_res={"ACCOUNTING"},
            is_unrestricted=False,
        ),
        "standard_rnd": _make_scope(
            role="standard",
            dept_name="R&D",
            canonical_dept="rnd",
            allowed_depts={"rnd", "r&d"},
            allowed_res={"RND"},
            is_unrestricted=False,
        ),
    }
    return {role_key: build_acl_filter(scope, shadow_mode=False) for role_key, scope in scopes.items()}


# ── 1. Executive Full Access ──────────────────────────────────────────────────
@pytest.mark.parametrize("dept", ["Pháp chế (Legal)", "Kinh doanh (Sales)", "Công nghệ / IT", "Kế toán / Thu mua", "R&D"])
@pytest.mark.parametrize("cls", ["PUBLIC", "INTERNAL", "RESTRICTED"])
def test_executive_unrestricted_access(acl_matrix, dept, cls):
    acl = acl_matrix["executive"]
    payload = {"department": dept, "classification": cls, "text": f"{dept} {cls} document"}
    assert acl.matches_payload(payload) is True


# ── 2. PUBLIC Accessibility for All Authenticated Roles ───────────────────────
@pytest.mark.parametrize("role_key", [
    "executive", "admin_it", "manager_legal", "standard_sales",
    "standard_it", "standard_accounting", "standard_rnd"
])
@pytest.mark.parametrize("dept", ["Pháp chế (Legal)", "Kinh doanh (Sales)", "Công nghệ / IT", "Kế toán / Thu mua", "R&D"])
def test_public_classification_accessible_to_all(acl_matrix, role_key, dept):
    acl = acl_matrix[role_key]
    payload = {"department": dept, "classification": "PUBLIC", "text": "Chính sách công khai"}
    assert acl.matches_payload(payload) is True


# ── 3. Least Privilege: RESTRICTED Denied to All Standard Users ──────────────
@pytest.mark.parametrize("role_key,user_dept", [
    ("standard_sales", "Kinh doanh (Sales)"),
    ("standard_it", "Công nghệ / IT"),
    ("standard_accounting", "Kế toán / Thu mua"),
    ("standard_rnd", "R&D"),
])
def test_standard_users_denied_own_department_restricted(acl_matrix, role_key, user_dept):
    acl = acl_matrix[role_key]
    # Even in their own department, standard users CANNOT access RESTRICTED data
    restricted_payload = {"department": user_dept, "classification": "RESTRICTED", "text": "Tài liệu tuyệt mật"}
    assert acl.matches_payload(restricted_payload) is False

    # But they CAN access their own department INTERNAL data
    internal_payload = {"department": user_dept, "classification": "INTERNAL", "text": "Tài liệu nghiệp vụ"}
    assert acl.matches_payload(internal_payload) is True


# ── 4. Department Isolation: Cross-Department INTERNAL Strictly Blocked ───────
@pytest.mark.parametrize("role_key,allowed_dept", [
    ("manager_legal", "Pháp chế (Legal)"),
    ("standard_sales", "Kinh doanh (Sales)"),
    ("standard_it", "Công nghệ / IT"),
    ("standard_accounting", "Kế toán / Thu mua"),
    ("standard_rnd", "R&D"),
])
def test_cross_department_isolation(acl_matrix, role_key, allowed_dept):
    acl = acl_matrix[role_key]
    all_depts = ["Pháp chế (Legal)", "Kinh doanh (Sales)", "Công nghệ / IT", "Kế toán / Thu mua", "R&D"]
    foreign_depts = [d for d in all_depts if d != allowed_dept]

    for f_dept in foreign_depts:
        # Cross-department INTERNAL must be denied
        f_internal = {"department": f_dept, "classification": "INTERNAL", "text": "Dữ liệu nội bộ"}
        assert acl.matches_payload(f_internal) is False, f"{role_key} must NOT access {f_dept} INTERNAL"

        # Cross-department RESTRICTED must be denied
        f_restricted = {"department": f_dept, "classification": "RESTRICTED", "text": "Dữ liệu mật"}
        assert acl.matches_payload(f_restricted) is False, f"{role_key} must NOT access {f_dept} RESTRICTED"


# ── 5. Manager Elevated Clearance for Own Department RESTRICTED ───────────────
def test_legal_manager_access_to_legal_restricted(acl_matrix):
    acl = acl_matrix["manager_legal"]

    # Allowed own department RESTRICTED
    legal_restricted = {"department": "Pháp chế (Legal)", "classification": "RESTRICTED", "text": "Bồi thường vô hạn"}
    assert acl.matches_payload(legal_restricted) is True

    # Denied foreign department RESTRICTED
    sales_restricted = {"department": "Kinh doanh (Sales)", "classification": "RESTRICTED", "text": "Chiến lược bán hàng tuyệt mật"}
    assert acl.matches_payload(sales_restricted) is False


# ── 6. Fail-Closed Boundary Testing ───────────────────────────────────────────
@pytest.mark.parametrize("role_key", ["standard_sales", "manager_legal", "admin_it"])
def test_fail_closed_missing_or_corrupt_payload(acl_matrix, role_key):
    acl = acl_matrix[role_key]

    # Non-dict payload
    assert acl.matches_payload(None) is False
    assert acl.matches_payload([]) is False
    assert acl.matches_payload("some string") is False

    # Empty payload
    assert acl.matches_payload({}) is False

    # Empty or null department
    assert acl.matches_payload({"department": "", "classification": "INTERNAL"}) is False
    assert acl.matches_payload({"department": None, "classification": "INTERNAL"}) is False

    # Unknown unmapped department
    assert acl.matches_payload({"department": "Ban Tài chính Bí mật", "classification": "INTERNAL"}) is False
