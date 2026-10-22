"""
Test Suite: Server-side Department Scope Enforcement (BR-02, BR-04, BR-05, FR3, FR32)
Verifies:
1. FR3 / BR-02: Endpoint /api/v1/rbac/check accurately evaluates user role and Department Scope.
2. BR-02: /api/documents filters datasets by caller's department scope.
3. BR-02: /api/documents/detail returns 403 Forbidden when accessing out-of-scope documents.
4. BR-02: /api/search enforces department access and blocks unauthorized dept queries with 403.
5. BR-05: /api/dashboard/kpis and /api/dashboard/briefing reject standard users with 403 Forbidden.
6. FR32 / BR-02: /api/copilot/citations redacts citations belonging to other departments.
"""

import sys
import os
import asyncio
import urllib.parse
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.main import app


def make_headers(user_name: str, dept: str = None):
    h = {"X-User-Name": user_name}
    if dept:
        h["X-User-Dept"] = urllib.parse.quote(dept)
    return h


async def run_scope_tests():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n" + "=" * 70)
        print("STARTING TEST SUITE: SERVER-SIDE DEPARTMENT SCOPE (BR-02, BR-04, BR-05)")
        print("=" * 70)

        # -------------------------------------------------------------------------
        # 1. TEST /api/v1/rbac/check (FR3, BR-02, BR-05)
        # -------------------------------------------------------------------------
        print("\n[1] Testing /api/v1/rbac/check permissions evaluation...")

        # Executive -> Unrestricted access (BR-05)
        res_exec = await client.post(
            "/api/v1/rbac/check",
            headers=make_headers("exec", "Ban Giám Đốc"),
            json={"department": "Legal", "resource_type": "contract", "action": "read"}
        )
        assert res_exec.status_code == 200, f"Expected 200, got {res_exec.status_code}: {res_exec.text}"
        data_exec = res_exec.json()
        assert data_exec["allowed"] is True
        assert data_exec["rule"] == "BR-05"
        print("    -> OK: Executive has enterprise-wide unrestricted access (BR-05).")

        # Manager in Legal asking for Sales data -> Blocked under BR-02
        res_mgr_legal = await client.post(
            "/api/v1/rbac/check",
            headers=make_headers("manager", "Legal"),
            json={"department": "Sales", "resource_type": "customer", "action": "read"}
        )
        assert res_mgr_legal.status_code == 200
        data_mgr = res_mgr_legal.json()
        assert data_mgr["allowed"] is False
        assert data_mgr["rule"] == "BR-02"
        print("    -> OK: Legal Manager correctly denied access to Sales data under BR-02.")

        # Standard User asking for Executive KPIs -> Blocked under BR-05
        res_std_kpi = await client.post(
            "/api/v1/rbac/check",
            headers=make_headers("ops", "Sales"),
            json={"resource_type": "kpi", "action": "read"}
        )
        assert res_std_kpi.status_code == 200
        data_kpi = res_std_kpi.json()
        assert data_kpi["allowed"] is False
        assert data_kpi["rule"] == "BR-05"
        print("    -> OK: Standard user denied access to Executive KPIs under BR-05.")

        # -------------------------------------------------------------------------
        # 2. TEST /api/documents Listing Filtered by Scope (BR-02)
        # -------------------------------------------------------------------------
        print("\n[2] Testing GET /api/documents scope filtering (BR-02)...")

        # Sales Specialist -> Should only see Sales and Operations/Public datasets
        res_sales_docs = await client.get(
            "/api/documents",
            headers=make_headers("ops", "Kinh doanh")
        )
        assert res_sales_docs.status_code == 200
        sales_docs = res_sales_docs.json()["data"]
        for doc in sales_docs:
            dept = (doc.get("dept") or doc.get("deptLabel") or "").lower()
            assert "pháp chế" not in dept and "legal" not in dept, f"Sales user saw legal doc: {doc}"
            assert "công nghệ" not in dept and "it" not in dept, f"Sales user saw IT doc: {doc}"
        print(f"    -> OK: Sales Specialist sees {len(sales_docs)} scoped docs (CUAD & Staff excluded).")

        # Legal Manager -> Should only see Legal and R&D docs
        res_legal_docs = await client.get(
            "/api/documents",
            headers=make_headers("manager", "Pháp chế")
        )
        assert res_legal_docs.status_code == 200
        legal_docs = res_legal_docs.json()["data"]
        for doc in legal_docs:
            dept = (doc.get("dept") or doc.get("deptLabel") or "").lower()
            assert "kinh doanh" not in dept, f"Legal manager saw Sales doc: {doc}"
        print(f"    -> OK: Legal Manager sees {len(legal_docs)} scoped docs (Sales orders excluded).")

        # Executive -> Sees all docs (BR-05)
        res_exec_docs = await client.get(
            "/api/documents",
            headers=make_headers("exec", "Ban Giám Đốc")
        )
        assert res_exec_docs.status_code == 200
        exec_docs = res_exec_docs.json()["data"]
        assert len(exec_docs) >= len(sales_docs)
        print(f"    -> OK: Executive sees full enterprise documents ({len(exec_docs)} total).")

        # -------------------------------------------------------------------------
        # 3. TEST /api/documents/detail Scope Enforcement (BR-02)
        # -------------------------------------------------------------------------
        print("\n[3] Testing GET /api/documents/detail authorization guard (BR-02)...")

        # Sales Specialist attempts to view CUAD Legal contract -> 403 Forbidden
        res_forbidden_cuad = await client.get(
            "/api/documents/detail?doc_id=CUAD_001",
            headers=make_headers("ops", "Kinh doanh")
        )
        assert res_forbidden_cuad.status_code == 403, f"Expected 403, got {res_forbidden_cuad.status_code}: {res_forbidden_cuad.text}"
        assert "BR-02" in res_forbidden_cuad.json()["detail"]
        print("    -> OK: Sales user blocked with 403 Forbidden when requesting CUAD_001 contract.")

        # Legal Manager attempts to view Sales Orders -> 403 Forbidden
        res_forbidden_orders = await client.get(
            "/api/documents/detail?doc_id=AW_SALES_ORDERS",
            headers=make_headers("manager", "Pháp chế")
        )
        assert res_forbidden_orders.status_code == 403, f"Expected 403, got {res_forbidden_orders.status_code}: {res_forbidden_orders.text}"
        assert "BR-02" in res_forbidden_orders.json()["detail"]
        print("    -> OK: Legal manager blocked with 403 Forbidden when requesting AW_SALES_ORDERS.")

        # Legal Manager views CUAD Legal contract -> 200 OK
        res_allowed_cuad = await client.get(
            "/api/documents/detail?doc_id=CUAD_001",
            headers=make_headers("manager", "Pháp chế")
        )
        assert res_allowed_cuad.status_code == 200
        print("    -> OK: Legal manager successfully retrieves CUAD_001 (in-scope).")

        # Executive views anything -> 200 OK
        res_exec_orders = await client.get(
            "/api/documents/detail?doc_id=AW_SALES_ORDERS",
            headers=make_headers("exec", "Ban Giám Đốc")
        )
        assert res_exec_orders.status_code == 200
        print("    -> OK: Executive successfully retrieves AW_SALES_ORDERS (BR-05).")

        # -------------------------------------------------------------------------
        # 4. TEST /api/search Department Scope Guard (BR-02)
        # -------------------------------------------------------------------------
        print("\n[4] Testing GET /api/search department scope guard (BR-02)...")

        # Sales user explicitly requests dept=LEGAL -> 403 Forbidden
        res_search_leak = await client.get(
            "/api/search?q=contract&dept=LEGAL",
            headers=make_headers("ops", "Kinh doanh")
        )
        assert res_search_leak.status_code == 403
        assert "BR-02" in res_search_leak.json()["detail"]
        print("    -> OK: Sales user blocked with 403 when filtering by unauthorized dept=LEGAL.")

        # Sales user searches globally -> Contracts are zeroed out automatically
        res_search_scoped = await client.get(
            "/api/search?q=agreement",
            headers=make_headers("ops", "Kinh doanh")
        )
        assert res_search_scoped.status_code == 200
        search_data = res_search_scoped.json()
        assert len(search_data["data"]["contracts"]) == 0, "Contracts should be empty for Sales user"
        print("    -> OK: Sales user search results automatically strip out cross-department contracts.")

        # -------------------------------------------------------------------------
        # 5. TEST /api/dashboard Executive Access Guard (BR-05)
        # -------------------------------------------------------------------------
        print("\n[5] Testing /api/dashboard role guard (BR-05)...")

        # Standard user requests Executive KPIs -> 403 Forbidden
        res_kpis_forbidden = await client.get(
            "/api/dashboard/kpis",
            headers=make_headers("ops", "Kinh doanh")
        )
        assert res_kpis_forbidden.status_code == 403
        assert "BR-05" in res_kpis_forbidden.json()["detail"]
        print("    -> OK: Standard user blocked with 403 Forbidden on Executive KPIs.")

        # Standard user requests Executive Briefing -> 403 Forbidden
        res_briefing_forbidden = await client.post(
            "/api/dashboard/briefing",
            headers=make_headers("ops", "Kinh doanh"),
            json={"timeframe": "month", "focus": "executive"}
        )
        assert res_briefing_forbidden.status_code == 403
        assert "BR-05" in res_briefing_forbidden.json()["detail"]
        print("    -> OK: Standard user blocked with 403 Forbidden on Executive Briefing.")

        # Executive requests KPIs -> 200 OK
        res_kpis_ok = await client.get(
            "/api/dashboard/kpis",
            headers=make_headers("exec", "Ban Giám Đốc")
        )
        assert res_kpis_ok.status_code == 200
        print("    -> OK: Executive successfully accesses KPIs (BR-05).")

        # -------------------------------------------------------------------------
        # 6. TEST /api/copilot/citations Redaction (FR32, BR-02)
        # -------------------------------------------------------------------------
        print("\n[6] Testing /api/copilot/citations scope filtering & redaction (FR32 / BR-02)...")

        test_citations = [
            {
                "docName": "CUAD Confidentiality Agreement",
                "file": "CUAD_001.pdf",
                "text": "Đoạn văn hợp đồng bảo mật CUAD chứa cam kết bồi thường $2,000,000 USD.",
                "sourceType": "Qdrant Vector DB",
            },
            {
                "docName": "Báo cáo doanh số bán hàng",
                "file": "SalesOrder_Summary",
                "text": "Tổng doanh số phòng kinh doanh đạt 15 tỷ VND.",
                "sourceType": "Neo4j Graph DB",
            }
        ]

        # Sales user validates citations -> Legal contract text must be REDACTED
        res_cite_sales = await client.post(
            "/api/copilot/citations",
            headers=make_headers("ops", "Kinh doanh"),
            json={"citations": test_citations}
        )
        assert res_cite_sales.status_code == 200
        c_sales = res_cite_sales.json()["citations"]
        assert "DỮ LIỆU ĐÃ ẨN" in c_sales[0]["text"]
        assert c_sales[0]["match"] == "RESTRICTED (BR-02)"
        assert "15 tỷ VND" in c_sales[1]["text"]
        print("    -> OK: CUAD contract citation properly redacted for Sales user with RESTRICTED (BR-02).")

        # Legal manager validates citations -> CUAD contract text remains visible
        res_cite_legal = await client.post(
            "/api/copilot/citations",
            headers=make_headers("manager", "Pháp chế"),
            json={"citations": test_citations}
        )
        assert res_cite_legal.status_code == 200
        c_legal = res_cite_legal.json()["citations"]
        assert "$2,000,000 USD" in c_legal[0]["text"]
        print("    -> OK: CUAD contract citation accessible for Legal manager.")

        print("\n" + "=" * 70)
        print("ALL TESTS PASSED: SERVER-SIDE DEPARTMENT SCOPE (BR-02, BR-04, BR-05) VERIFIED!")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_scope_tests())
