"""
Step 2A: Neo4j Search & Node Endpoint RBAC ACL Test Suite
Validates fail-closed node filtering by department and data classification.
"""
import uuid
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.rbac import (
    ScopeContext,
    get_user_scope,
    normalize_dept,
    RESOURCE_TO_FOLDER,
    CANONICAL_RESOURCE_TYPES,
)
from app.db.postgres.models import User
from app.db.neo4j.client import neo4j_client

client = TestClient(app)

LEGAL_NODE = {
    "_id": "4:cfcd6bd6-fe10-4bea-8596-a41b8225cd4e:20384",
    "_labels": ["Document"],
    "id": "DOC_LEGAL_01",
    "name": "AimmuneTherapeuticsInc_20200205_8-K_EX-10.3_Development Agreement.pdf",
    "department": "Pháp chế (Legal)",
    "deptKey": "legal",
    "storagePath": "/data/legal/AimmuneTherapeuticsInc_Development Agreement.pdf",
}

SALES_NODE = {
    "_id": "4:cfcd6bd6-fe10-4bea-8596-a41b8225cd4e:20385",
    "_labels": ["Document"],
    "id": "DOC_SALES_01",
    "name": "Sales_Q3_Commercial_Agreement.pdf",
    "department": "Kinh doanh",
    "deptKey": "sales",
    "storagePath": "/data/sales/Sales_Q3_Commercial_Agreement.pdf",
}

MISSING_DEPT_NODE = {
    "_id": "4:cfcd6bd6-fe10-4bea-8596-a41b8225cd4e:20386",
    "_labels": ["Document"],
    "id": "DOC_CORRUPT_01",
    "name": "Unknown_Unlabeled_Document.pdf",
    "department": None,
    "deptKey": "",
    "storagePath": "",
}

PUBLIC_NODE = {
    "_id": "4:cfcd6bd6-fe10-4bea-8596-a41b8225cd4e:20387",
    "_labels": ["Document"],
    "id": "DOC_PUBLIC_01",
    "name": "Public_Company_Policy.pdf",
    "classification": "PUBLIC",
    "department": None,
}


def make_test_scope(username: str, role: str, department: str, allowed_resources, is_unrestricted: bool = False):
    u = User(
        user_id=uuid.uuid4(),
        email=f"{username}@example.com",
        username=username,
        role=role,
        status="active",
        is_active=True,
        is_superuser=(role == "admin"),
    )
    return ScopeContext(
        user=u,
        role=role,
        is_unrestricted=is_unrestricted,
        department_name=department,
        canonical_dept=normalize_dept(department),
        allowed_depts={RESOURCE_TO_FOLDER[r] for r in allowed_resources if r in RESOURCE_TO_FOLDER} | ({"*"} if is_unrestricted else set()),
        allowed_resources=set(allowed_resources) if not is_unrestricted else set(CANONICAL_RESOURCE_TYPES),
    )


def test_neo4j_search_and_node_acl_red_green():
    """
    Step 2A Verification:
    - ops (Sales Standard) searching 'Development Agreement' must get 0 Legal nodes.
    - ops accessing /api/neo4j/node/DOC_LEGAL_01 must get 403 Forbidden.
    - ops accessing /api/neo4j/node/DOC_CORRUPT_01 must get 403 Forbidden (fail-closed).
    - Legal Manager and Executive must successfully view Legal nodes.
    """
    ops_scope = make_test_scope("ops", "standard", "Kinh doanh", allowed_resources={"SALES", "RND"})
    legal_mgr_scope = make_test_scope("legal_mgr", "manager", "Pháp chế (Legal)", allowed_resources={"LEGAL"})
    exec_scope = make_test_scope("exec", "executive", "Ban Giám Đốc", allowed_resources=set(), is_unrestricted=True)

    # Mock Neo4j search returning Legal node and Missing Dept node
    with patch.object(neo4j_client, "search_nodes", return_value=[LEGAL_NODE, MISSING_DEPT_NODE]), \
         patch.object(neo4j_client, "get_node_by_id", side_effect=lambda nid: {
             "DOC_LEGAL_01": LEGAL_NODE,
             "DOC_SALES_01": SALES_NODE,
             "DOC_CORRUPT_01": MISSING_DEPT_NODE,
             "DOC_PUBLIC_01": PUBLIC_NODE,
         }.get(nid)):

        # -------------------------------------------------------------
        # 1. OPS USER (Sales Standard)
        # -------------------------------------------------------------
        app.dependency_overrides[get_user_scope] = lambda: ops_scope
        try:
            # 1a. Search for 'Development Agreement'
            r_search = client.get("/api/neo4j/search?q=Development%20Agreement")
            assert r_search.status_code == 200
            data_search = r_search.json().get("data", [])
            # Ops must NOT see Legal node or corrupted missing dept node!
            legal_hits = [n for n in data_search if n.get("id") == "DOC_LEGAL_01"]
            assert len(legal_hits) == 0, f"FAIL: ops user saw {len(legal_hits)} Legal nodes in search results!"
            corrupt_hits = [n for n in data_search if n.get("id") == "DOC_CORRUPT_01"]
            assert len(corrupt_hits) == 0, f"FAIL: ops user saw missing-dept node in search results!"

            # 1b. Direct node details access for Legal node -> 403
            r_node_legal = client.get("/api/neo4j/node/DOC_LEGAL_01")
            assert r_node_legal.status_code == 403, f"Expected 403 for ops accessing Legal node, got {r_node_legal.status_code}"

            # 1c. Direct node details access for corrupted node -> 403 (fail-closed)
            r_node_corrupt = client.get("/api/neo4j/node/DOC_CORRUPT_01")
            assert r_node_corrupt.status_code == 403, f"Expected 403 for ops accessing corrupt node, got {r_node_corrupt.status_code}"

            # 1d. Direct node details access for Sales node -> 200
            r_node_sales = client.get("/api/neo4j/node/DOC_SALES_01")
            assert r_node_sales.status_code == 200, f"Expected 200 for ops accessing Sales node, got {r_node_sales.status_code}"
        finally:
            app.dependency_overrides.pop(get_user_scope, None)

        # -------------------------------------------------------------
        # 2. LEGAL MANAGER (Legal Manager)
        # -------------------------------------------------------------
        app.dependency_overrides[get_user_scope] = lambda: legal_mgr_scope
        try:
            # Legal manager must see Legal node in search
            r_search_lm = client.get("/api/neo4j/search?q=Development%20Agreement")
            assert r_search_lm.status_code == 200
            data_search_lm = r_search_lm.json().get("data", [])
            legal_hits_lm = [n for n in data_search_lm if n.get("id") == "DOC_LEGAL_01"]
            assert len(legal_hits_lm) == 1, f"Expected Legal Manager to see Legal node, got {len(legal_hits_lm)}"

            # Direct node access
            r_node_lm = client.get("/api/neo4j/node/DOC_LEGAL_01")
            assert r_node_lm.status_code == 200, f"Expected 200 for Legal Manager, got {r_node_lm.status_code}"
        finally:
            app.dependency_overrides.pop(get_user_scope, None)

        # -------------------------------------------------------------
        # 3. EXECUTIVE USER (Unrestricted)
        # -------------------------------------------------------------
        app.dependency_overrides[get_user_scope] = lambda: exec_scope
        try:
            # Executive must see Legal node in search
            r_search_ex = client.get("/api/neo4j/search?q=Development%20Agreement")
            assert r_search_ex.status_code == 200
            data_search_ex = r_search_ex.json().get("data", [])
            legal_hits_ex = [n for n in data_search_ex if n.get("id") == "DOC_LEGAL_01"]
            assert len(legal_hits_ex) == 1, f"Expected Executive to see Legal node, got {len(legal_hits_ex)}"

            # Direct node access
            r_node_ex = client.get("/api/neo4j/node/DOC_LEGAL_01")
            assert r_node_ex.status_code == 200, f"Expected 200 for Executive, got {r_node_ex.status_code}"
        finally:
            app.dependency_overrides.pop(get_user_scope, None)
