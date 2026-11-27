"""
RED/GREEN Test Suite for Item 2: Qdrant ACL Strict Positive Allowlist (fail-closed).

Verifies:
1. qdrant_filter uses strict positive MUST (department IN allowed AND classification IN allowed).
2. Elimination of must_not RESTRICTED.
3. Points with missing classification, strange classification ('TOP_SECRET', 'UNKNOWN'), or strange department
   are strictly rejected (fail-closed) for non-privileged roles.
4. Legal Manager sees RESTRICTED chunks of Legal department.
5. Standard Ops (Sales) does NOT see RESTRICTED chunks or Legal chunks.
6. Shadow mode does NOT loosen pre-filters (qdrant_filter and cypher_where stay enforcing).
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


def test_qdrant_filter_uses_strict_allowlist_and_no_must_not():
    """Verify that qdrant_filter uses positive MUST allowlist and eliminates must_not."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope)

    assert "must" in acl.qdrant_filter, "Qdrant filter MUST use positive allowlist!"
    assert "must_not" not in acl.qdrant_filter, "must_not blocklist must be eliminated in favor of positive allowlist!"

    # Verify must contains department allowlist and classification allowlist
    must_conditions = acl.qdrant_filter["must"]
    keys = [c["key"] for c in must_conditions]
    assert "department" in keys
    assert "classification" in keys

    cls_cond = next(c for c in must_conditions if c["key"] == "classification")
    allowed_cls = cls_cond["match"]["any"]
    assert "RESTRICTED" not in allowed_cls
    assert "INTERNAL" in allowed_cls
    assert "PUBLIC" in allowed_cls


def test_missing_or_strange_classification_fail_closed():
    """Points with missing or strange classification are strictly rejected for standard role."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope)

    # 1. Missing classification
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "text": "no classification"}) is False

    # 2. None classification
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": None}) is False

    # 3. Strange / unknown classification
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": "TOP_SECRET"}) is False
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": "HIGHLY_CONFIDENTIAL"}) is False

    # 4. Strange department
    assert acl.matches_payload({"department": "Phong_La", "classification": "INTERNAL"}) is False


def test_legal_manager_vs_ops_restricted_visibility():
    """Legal Manager can see Legal RESTRICTED; Ops (Sales) CANNOT."""
    legal_mgr_scope = _make_scope(
        role="manager",
        dept_name="Pháp chế (Legal)",
        canonical_dept="legal",
        allowed_depts={"legal", "pháp chế (legal)"},
        allowed_res={"LEGAL"},
        is_unrestricted=False,
    )
    ops_sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )

    acl_legal_mgr = build_acl_filter(legal_mgr_scope)
    acl_ops = build_acl_filter(ops_sales_scope)

    legal_restricted_payload = {
        "department": "Pháp chế (Legal)",
        "classification": "RESTRICTED",
        "text": "Điều khoản bồi thường vô hạn."
    }

    # Legal Manager MUST see Legal RESTRICTED
    assert acl_legal_mgr.matches_payload(legal_restricted_payload) is True
    # Qdrant must allowlist for Legal Manager contains RESTRICTED
    mgr_cls_cond = next(c for c in acl_legal_mgr.qdrant_filter["must"] if c["key"] == "classification")
    assert "RESTRICTED" in mgr_cls_cond["match"]["any"]

    # Ops (Sales) MUST NOT see Legal RESTRICTED
    assert acl_ops.matches_payload(legal_restricted_payload) is False
    ops_cls_cond = next(c for c in acl_ops.qdrant_filter["must"] if c["key"] == "classification")
    assert "RESTRICTED" not in ops_cls_cond["match"]["any"]


def test_shadow_mode_does_not_loosen_prefilters():
    """Shadow mode must NOT set qdrant_filter to None or cypher_where to 1=1."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope, shadow_mode=True)

    assert acl.shadow_mode is True
    # Must STILL have enforcing qdrant_filter and cypher_where
    assert acl.qdrant_filter is not None
    assert "must" in acl.qdrant_filter
    assert acl.cypher_where != "1=1"
    # Matches payload must STILL return False to block prompt entry
    restricted_payload = {
        "id": "chunk_secret",
        "department": "Kinh doanh (Sales)",
        "classification": "RESTRICTED",
        "text": "Dữ liệu mật"
    }
    assert acl.matches_payload(restricted_payload) is False
    # But shadow_blocked_events logs the attempt
    assert len(acl.shadow_blocked_events) == 1
    assert acl.shadow_blocked_events[0]["resource_id"] == "chunk_secret"
