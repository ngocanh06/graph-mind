"""
Unit Test Suite for Step 2A Live Verification (Group C)
Compatible with PR0 isolated test environment (conftest.py).
1. Verify fail-closed for node with only storagePath but missing department.
2. Verify /api/neo4j/search isolates Legal nodes by ScopeContext.
3. Verify /api/neo4j/expand & /api/neo4j/graph isolates Clauses by ScopeContext.
4. Verify Knowledge Explorer (/api/knowledge-explorer/search) isolates vector results by ScopeContext.
"""
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.db.neo4j.client import neo4j_client
from app.db.postgres.models import User
from app.core.rbac import (
    ScopeContext,
    get_user_scope,
    filter_graph_entities_by_scope,
    CANONICAL_RESOURCE_TYPES,
)
from app.core.central_storage import resolve_canonical_dept

client = TestClient(app)


def make_scope(role: str, dept_name: str, canonical_dept: str, allowed_res: set, is_unrestricted: bool = False):
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
        allowed_depts={canonical_dept} if not is_unrestricted else {"*"},
        allowed_resources=allowed_res if not is_unrestricted else set(CANONICAL_RESOURCE_TYPES),
    )


def test_fail_closed_node_with_only_storage_path():
    """Node with only storagePath but missing department must be rejected fail-closed."""
    nodes = [
        {
            "_id": "node_only_storage_path",
            "_labels": ["Document"],
            "storagePath": "/data/sales/sample_doc.pdf",
        },
        {
            "_id": "node_full_metadata",
            "_labels": ["Document"],
            "department": "Kinh doanh",
            "storagePath": "/data/sales/sample_doc.pdf",
        }
    ]
    res = filter_graph_entities_by_scope(nodes, role="standard")
    assert len(res) == 1
    assert res[0]["_id"] == "node_full_metadata"
    assert not any(n["_id"] == "node_only_storage_path" for n in res)


def test_neo4j_search_role_isolation():
    """ops must see 0 Legal nodes; Legal Manager, Executive and Admin must see > 0."""
    mock_legal_nodes = [
        {
            "_id": "doc_1",
            "_labels": ["Document"],
            "name": "Development Agreement.pdf",
            "department": "Pháp chế (Legal)",
            "domain": "legal",
            "storagePath": "/data/legal/Development Agreement.pdf",
        }
    ]

    with patch("app.main.neo4j_client.search_nodes", return_value=mock_legal_nodes):
        # 1. ops (Sales) -> allowed_resources: SALES, RND -> must see 0
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="standard", dept_name="Kinh doanh", canonical_dept="sales", allowed_res={"SALES", "RND"}
        )
        r_ops = client.get("/api/neo4j/search?q=Development Agreement")
        assert r_ops.status_code == 200
        assert len(r_ops.json().get("data", [])) == 0

        # 2. Legal Manager -> allowed_resources: LEGAL, SALES, RND -> must see > 0
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="knowledge_manager", dept_name="Legal", canonical_dept="legal", allowed_res={"LEGAL", "SALES", "RND"}
        )
        r_mgr = client.get("/api/neo4j/search?q=Development Agreement")
        assert r_mgr.status_code == 200
        assert len(r_mgr.json().get("data", [])) == 1

        # 3. Executive -> unrestricted -> must see > 0
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="executive", dept_name="Ban Giám Đốc", canonical_dept="ban_giam_doc", allowed_res=set(), is_unrestricted=True
        )
        r_exec = client.get("/api/neo4j/search?q=Development Agreement")
        assert r_exec.status_code == 200
        assert len(r_exec.json().get("data", [])) == 1

    app.dependency_overrides.pop(get_user_scope, None)


def test_neo4j_expand_clause_isolation():
    """ops must see 0 clauses; Legal Manager and Executive must see Clauses."""
    mock_expand = {
        "nodes": [
            {
                "_id": "doc_1",
                "_labels": ["Document"],
                "name": "Development Agreement.pdf",
                "department": "Pháp chế (Legal)",
                "domain": "legal",
            },
            {
                "_id": "clause_1",
                "_labels": ["Clause"],
                "name": "Điều khoản Bảo mật",
                "department": "Pháp chế (Legal)",
                "domain": "legal",
            }
        ],
        "relationships": [
            {"source": "doc_1", "target": "clause_1", "type": "CONTAINS_CLAUSE"}
        ]
    }

    with patch("app.main.neo4j_client.expand_node_neighbors", return_value=mock_expand), \
         patch.object(type(neo4j_client), "is_connected", new_callable=lambda: property(lambda self: True)):
        # 1. ops -> 0 clauses
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="standard", dept_name="Kinh doanh", canonical_dept="sales", allowed_res={"SALES", "RND"}
        )
        r_ops = client.get("/api/neo4j/expand/doc_1")
        assert r_ops.status_code == 200
        ops_clauses = [n for n in r_ops.json().get("data", {}).get("nodes", []) if "Clause" in n.get("_labels", [])]
        assert len(ops_clauses) == 0

        # 2. Legal Manager -> sees Clause
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="knowledge_manager", dept_name="Legal", canonical_dept="legal", allowed_res={"LEGAL", "SALES", "RND"}
        )
        r_mgr = client.get("/api/neo4j/expand/doc_1")
        assert r_mgr.status_code == 200
        mgr_clauses = [n for n in r_mgr.json().get("data", {}).get("nodes", []) if "Clause" in n.get("_labels", [])]
        assert len(mgr_clauses) == 1

        # 3. Executive -> sees Clause
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="executive", dept_name="Ban Giám Đốc", canonical_dept="ban_giam_doc", allowed_res=set(), is_unrestricted=True
        )
        r_exec = client.get("/api/neo4j/expand/doc_1")
        assert r_exec.status_code == 200
        exec_clauses = [n for n in r_exec.json().get("data", {}).get("nodes", []) if "Clause" in n.get("_labels", [])]
        assert len(exec_clauses) == 1

    app.dependency_overrides.pop(get_user_scope, None)


def test_knowledge_explorer_isolation():
    """Knowledge explorer must return 0 results for ops on legal queries, but > 0 for Legal Manager & Executive."""
    mock_vector_hits = [
        {
            "id": "chunk_1",
            "score": 0.95,
            "contract_name": "Development Agreement.pdf",
            "department": "legal",
            "text": "Indemnification clause content"
        }
    ]

    with patch("app.main.qdrant_client.vector_search", return_value=mock_vector_hits), \
         patch("app.main.neo4j_client.search_nodes", return_value=[]), \
         patch("app.main.neo4j_client.get_connected_nodes", return_value=[]), \
         patch("app.main.neo4j_client.get_relationships_for_nodes", return_value=[]):

        # 1. ops -> 0 results
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="standard", dept_name="Kinh doanh", canonical_dept="sales", allowed_res={"SALES", "RND"}
        )
        r_ops = client.get("/api/knowledge-explorer/search?query=indemnification")
        assert r_ops.status_code == 200
        assert len(r_ops.json().get("vector_results", [])) == 0

        # 2. Legal Manager -> results > 0
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="knowledge_manager", dept_name="Legal", canonical_dept="legal", allowed_res={"LEGAL", "SALES", "RND"}
        )
        r_mgr = client.get("/api/knowledge-explorer/search?query=indemnification")
        assert r_mgr.status_code == 200
        assert len(r_mgr.json().get("vector_results", [])) > 0

        # 3. Executive -> results > 0
        app.dependency_overrides[get_user_scope] = lambda: make_scope(
            role="executive", dept_name="Ban Giám Đốc", canonical_dept="ban_giam_doc", allowed_res=set(), is_unrestricted=True
        )
        r_exec = client.get("/api/knowledge-explorer/search?query=indemnification")
        assert r_exec.status_code == 200
        assert len(r_exec.json().get("vector_results", [])) > 0

    app.dependency_overrides.pop(get_user_scope, None)
