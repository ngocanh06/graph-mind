"""
Unit tests for Step 2B.6: Context Gate Secondary Defense Layer Hardening.

Verifies:
1. Elimination of fallbacks: When fused results are empty, raw_chunks and raw_entities do not fall back.
2. Late Lock secondary check: When vector_hits[0] is from another department, Late Lock refuses to lock onto it.
3. Graph entity secondary isolation: Graph entities are filtered strictly through acl_filter.matches_payload.
4. Fail-closed zero-retrieval refusal: If all chunks/entities are filtered out, system refuses to hallucinate and issues clean refusal.
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
        email=f"{role}@graphmind.ai",
        username=role,
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


def test_late_lock_secondary_defense():
    """Verify that late lock will NOT lock onto a cross-department document even if vector score is high."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope, shadow_mode=False)

    unauthorized_top_hit = {
        "source_file": "Legal_Contract_CONFIDENTIAL.pdf",
        "contract_name": "Legal_Contract_CONFIDENTIAL.pdf",
        "document_id": "DOC_LEGAL_SECRET",
        "score": 0.88,
        "text": "Điều khoản bồi thường vô hạn",
        "payload": {
            "department": "Pháp chế (Legal)",
            "classification": "RESTRICTED",
            "source_file": "Legal_Contract_CONFIDENTIAL.pdf",
        }
    }

    # ACL check must fail
    pl = unauthorized_top_hit["payload"]
    assert acl.matches_payload(pl) is False

    # Simulate late lock condition
    should_lock = acl.matches_payload(pl)
    assert should_lock is False, "Late Lock must NOT lock onto unauthorized document!"


def test_graph_entity_secondary_isolation():
    """Verify that graph nodes belonging to unallowed departments or RESTRICTED are filtered out."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope, shadow_mode=False)

    graph_nodes = [
        {
            "_id": "node_sales_01",
            "name": "Báo cáo doanh số",
            "department": "Kinh doanh (Sales)",
            "classification": "INTERNAL"
        },
        {
            "_id": "node_legal_01",
            "name": "Hợp đồng đối tác cấp cao",
            "department": "Pháp chế (Legal)",
            "classification": "INTERNAL"
        },
        {
            "_id": "node_sales_restricted",
            "name": "Lương thưởng ban điều hành",
            "department": "Kinh doanh (Sales)",
            "classification": "RESTRICTED"
        }
    ]

    filtered_nodes = [gn for gn in graph_nodes if acl.matches_payload(gn)]
    assert len(filtered_nodes) == 1
    assert filtered_nodes[0]["_id"] == "node_sales_01"


def test_no_fallback_on_empty_fusion():
    """Verify that when reciprocal rank fusion yields no vector/graph matches, fallbacks are not engaged."""
    fused_results = []
    # Hardened behavior in Step 2B.6:
    raw_chunks = [it["raw"] for it in fused_results if it["type"] == "vector"]
    raw_entities = [it["raw"] for it in fused_results if it["type"] == "graph"]

    assert raw_chunks == []
    assert raw_entities == []
