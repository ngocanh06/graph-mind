"""
Automated Integration Tests for Aggregated Department Activity Report
Validates:
1. Executive & Admin have enterprise-wide access across departments (BR-05).
2. Department Manager has access to their own department report (BR-04, Proposal Sect. 6.1a).
3. Department Manager is rejected with 403 when requesting another department report.
4. Standard User is rejected with 403 when requesting another department report.
5. Shift report lifecycle: author drafts/edits/submits; non-author cannot edit; Standard User cannot review.
6. Manager approves/rejects (reject needs reason); re-review -> 409; approved report is locked.
7. Department report AI synthesis returns structured synthesis (200 OK).
"""

import asyncio
import urllib.parse
import httpx
import os
import sys

# Windows UTF-8 stdout
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app


def make_headers(username: str, role: str, dept: str) -> dict:
    return {
        "X-User-Name": username,
        "X-User-Role": role,
        "X-User-Dept": urllib.parse.quote(dept),
    }


async def run_department_report_tests():
    from app.db.postgres.database import create_all_tables
    await create_all_tables()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("\n======================================================================")
        print("RUNNING AUTOMATED TESTS: AGGREGATED DEPARTMENT ACTIVITY REPORT")
        print("======================================================================")

        # 1. Executive accesses department report
        print("\n[1] Testing Executive access across departments...")
        exec_headers = make_headers("ceo", "executive", "Ban Giám Đốc")
        res = await client.get("/api/dashboard/department-report?department=sales", headers=exec_headers)
        assert res.status_code == 200, f"Expected 200 for Executive, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data["department"] == "sales"
        assert "profile" in data
        assert "kpis" in data
        assert len(data["submissions"]) > 0
        print(f"    -> OK: Executive accessed Sales department report ({data['profile']['nameVi']}).")

        # 2. Department Manager accesses their own department
        print("\n[2] Testing Department Manager accessing their own department (sales)...")
        mgr_headers = make_headers("manager", "department_manager", "Khối Kinh Doanh & Vận Hành")
        res = await client.get("/api/dashboard/department-report?department=sales", headers=mgr_headers)
        assert res.status_code == 200, f"Expected 200 for Manager, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["department"] == "sales"
        print(f"    -> OK: Manager accessed assigned department report ({data['kpis']['shiftCompletionRate']}% SLA).")

        # 3. Department Manager blocked from accessing another department (e.g. IT)
        print("\n[3] Testing Department Manager blocked from another department (IT) (BR-04)...")
        res = await client.get("/api/dashboard/department-report?department=it", headers=mgr_headers)
        assert res.status_code == 403, f"Expected 403 for Manager accessing IT, got {res.status_code}: {res.text}"
        print(f"    -> OK: Department Manager blocked with 403 Forbidden on out-of-scope department.")

        # 4. Standard User blocked from accessing another department (e.g. Legal)
        print("\n[4] Testing Standard User blocked from out-of-scope department (BR-02)...")
        sales_user_headers = make_headers("ops", "standard_user", "Phòng Kinh Doanh")
        res = await client.get("/api/dashboard/department-report?department=legal", headers=sales_user_headers)
        assert res.status_code == 403, f"Expected 403 for Standard User, got {res.status_code}: {res.text}"
        print(f"    -> OK: Standard User blocked with 403 Forbidden on Legal department report.")

        SR = "/api/dashboard/shift-reports"
        body = {"summary": "Xử lý 2 ca", "cases": [{"customer": "ACME", "issue": "x", "ref": "EDR-1"}], "proposals": ""}

        # 5. Author drafts, edits and submits; non-author cannot edit
        print("\n[5] Testing shift report draft -> edit -> submit (author only)...")
        res = await client.post(SR, headers=sales_user_headers, json=body)
        assert res.status_code == 200, res.text
        rid = res.json()["report"]["id"]
        assert res.json()["report"]["status"] == "DRAFT"
        body["summary"] = "Xử lý 3 ca (đã sửa)"
        res = await client.put(f"{SR}/{rid}", headers=sales_user_headers, json=body)
        assert res.status_code == 200 and res.json()["report"]["summary"].endswith("(đã sửa)")
        res = await client.put(f"{SR}/{rid}", headers=mgr_headers, json=body)
        assert res.status_code == 403, f"Non-author edit must be 403, got {res.status_code}"
        res = await client.post(f"{SR}/{rid}/review", headers=mgr_headers, json={"decision": "approve"})
        assert res.status_code == 409, f"Reviewing a DRAFT must be 409, got {res.status_code}"
        res = await client.post(f"{SR}/{rid}/submit", headers=sales_user_headers)
        assert res.status_code == 200 and res.json()["report"]["status"] == "SUBMITTED"
        assert len(res.json()["report"]["contentHash"]) == 64
        res = await client.put(f"{SR}/{rid}", headers=sales_user_headers, json=body)
        assert res.status_code == 409, "Submitted report must be locked"
        print("    -> OK: lifecycle + authorization enforced.")

        # 6. Review: Standard User blocked; manager rejects (reason required), author revises, manager approves
        print("\n[6] Testing review (reject needs reason, approve locks, no double review)...")
        res = await client.post(f"{SR}/{rid}/review", headers=sales_user_headers, json={"decision": "approve"})
        assert res.status_code == 403, f"Standard User review must be 403, got {res.status_code}"
        res = await client.post(f"{SR}/{rid}/review", headers=mgr_headers, json={"decision": "reject", "comment": ""})
        assert res.status_code == 422, f"Reject without reason must be 422, got {res.status_code}"
        res = await client.post(f"{SR}/{rid}/review", headers=mgr_headers, json={"decision": "reject", "comment": "Thiếu số liệu"})
        assert res.status_code == 200 and res.json()["report"]["status"] == "REJECTED"
        res = await client.put(f"{SR}/{rid}", headers=sales_user_headers, json=body)
        assert res.status_code == 200, "Rejected report must be editable again"
        res = await client.post(f"{SR}/{rid}/submit", headers=sales_user_headers)
        assert res.status_code == 200
        res = await client.get("/api/dashboard/department-report?department=sales", headers=mgr_headers)
        assert any(s["id"] == rid and s["status"] == "SUBMITTED" for s in res.json()["submissions"])
        res = await client.post(f"{SR}/{rid}/review", headers=mgr_headers, json={"decision": "approve", "comment": "OK"})
        assert res.status_code == 200 and res.json()["report"]["status"] == "APPROVED", res.text
        res = await client.post(f"{SR}/{rid}/review", headers=mgr_headers, json={"decision": "approve"})
        assert res.status_code == 409, f"Re-review must be 409, got {res.status_code}"
        res = await client.put(f"{SR}/{rid}", headers=sales_user_headers, json=body)
        assert res.status_code == 409, "Approved report must be locked"
        print("    -> OK: review workflow enforced.")

        # 7. Department report AI synthesis
        print("\n[7] Testing Department AI Report synthesis...")
        res = await client.post(
            "/api/dashboard/department-report/synthesize",
            headers=mgr_headers,
            json={"department": "sales", "timeframe": "today"}
        )
        assert res.status_code == 200, f"Expected 200 for synthesis, got {res.status_code}: {res.text}"
        synth_data = res.json()
        assert synth_data["success"] is True
        assert len(synth_data["synthesis"]) > 50
        print(f"    -> OK: AI synthesized department activity report successfully.")

        print("\n======================================================================")
        print("ALL TESTS PASSED: AGGREGATED DEPARTMENT REPORT API & SCOPE VERIFIED!")
        print("======================================================================\n")


if __name__ == "__main__":
    asyncio.run(run_department_report_tests())
