"""
Verification test for document repository & dashboard synchronization (Ponytail self-check).
Verifies:
1. Neo4j document count = 611 and legal contracts = 509
2. Executive Dashboard KPIs: totalDocuments = 611, totalContracts = 509
3. Repository Documents: total_items = 611, cuad_contracts = 509, cuad_total = 509
4. Department distribution across all 5 departments:
   - Pháp chế (Legal): 535
   - Kinh doanh (Sales): 37
   - R&D: 26
   - Kế toán / Thu mua: 9
   - Công nghệ / IT: 4
"""

import sys
import os
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.db.neo4j.client import neo4j_client
from app.core.rbac import ScopeContext
from app.api.v1.dashboard import get_executive_kpis
from app.main import get_repository_documents


def test_document_synchronization():
    # 1. Neo4j connection & KPIs
    assert neo4j_client.connect(), "Neo4j connection failed"
    from unittest.mock import MagicMock
    mock_user = MagicMock()
    mock_user.id = "admin-test-id"
    mock_user.role = "admin"
    admin_scope = ScopeContext(
        user=mock_user,
        role="admin",
        is_unrestricted=True,
        department_name="Ban Giám Đốc",
        canonical_dept="all"
    )

    kpis_resp = get_executive_kpis(scope=admin_scope)
    kpis = kpis_resp.get("data", {})
    print("[1/4] Dashboard KPIs:", kpis)
    assert kpis["totalDocuments"] == 611, f"Expected 611 docs, got {kpis['totalDocuments']}"
    assert kpis["totalContracts"] == 509, f"Expected 509 contracts, got {kpis['totalContracts']}"

    # 2. Repository Documents endpoint
    repo_res = get_repository_documents(scope=admin_scope, limit=200)
    summary = repo_res["summary"]
    print("[2/4] Repository Summary:", summary)

    assert summary["total_items"] == 611, f"Expected 611 total_items, got {summary['total_items']}"
    assert summary["cuad_contracts"] == 509, f"Expected 509 cuad_contracts, got {summary['cuad_contracts']}"
    assert summary["cuad_total"] == 509, f"Expected 509 cuad_total, got {summary['cuad_total']}"
    assert summary["indexed_documents"] == 611, f"Expected 611 indexed_documents, got {summary['indexed_documents']}"
    assert summary["pending_documents"] == 0, f"Expected 0 pending, got {summary['pending_documents']}"
    assert summary["failed_documents"] == 0, f"Expected 0 failed, got {summary['failed_documents']}"
    assert summary["departments_count"] == 5, f"Expected 5 depts, got {summary['departments_count']}"

    # 3. Full items department distribution
    items = repo_res.get("documents", [])
    print(f"[3/4] Paginated items: {len(items)}, Total in summary: {summary['total_items']}")

    # Check distribution of all items in cache
    from app import main as app_main
    all_cached_items, _ = app_main._DOCUMENTS_CACHE
    assert len(all_cached_items) == 611, f"Expected 611 total cached items, got {len(all_cached_items)}"

    dept_counts = dict(Counter(it["dept"] for it in all_cached_items))
    print("[4/4] Department Counts:", dept_counts)
    assert dept_counts.get("Pháp chế (Legal)") == 535, f"Expected 535 Legal, got {dept_counts.get('Pháp chế (Legal)')}"
    assert dept_counts.get("Kinh doanh (Sales)") == 37, f"Expected 37 Sales, got {dept_counts.get('Kinh doanh (Sales)')}"
    assert dept_counts.get("R&D") == 26, f"Expected 26 R&D, got {dept_counts.get('R&D')}"
    assert dept_counts.get("Kế toán / Thu mua") == 9, f"Expected 9 Accounting, got {dept_counts.get('Kế toán / Thu mua')}"
    assert dept_counts.get("Công nghệ / IT") == 4, f"Expected 4 IT, got {dept_counts.get('Công nghệ / IT')}"

    # 5. Copilot Natural Language Text-to-Cypher queries
    from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import execute_text_to_cypher

    cuad_hits = execute_text_to_cypher("có tổng cộng bao nhiêu hợp đồng pháp lý CUAD")
    assert len(cuad_hits) > 0, "Expected hits for CUAD contracts count query"
    assert "509" in cuad_hits[0]["snippet"], f"Expected 509 in snippet, got: {cuad_hits[0]['snippet']}"
    print("[5/5] Copilot CUAD Contracts Query verified:", cuad_hits[0]["snippet"])

    sys_hits = execute_text_to_cypher("có tổng cộng bao nhiêu tài liệu trong hệ thống")
    assert len(sys_hits) > 0, "Expected hits for system documents count query"
    assert "611" in sys_hits[0]["snippet"], f"Expected 611 in snippet, got: {sys_hits[0]['snippet']}"
    print("[5/5] Copilot System Documents Query verified:", sys_hits[0]["snippet"])

    print("\n>>> ALL CHECKS PASSED: 100% SYNCHRONIZED ACROSS NEO4J, DASHBOARD, REPOSITORY, AND COPILOT! <<<")


if __name__ == "__main__":
    test_document_synchronization()
