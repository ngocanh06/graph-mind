import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import httpx
from app.main import app

async def run_async_tests():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Pre-test cleanup
        headers_admin = {"X-User-Name": "admin"}
        await client.delete("/api/v1/sop/SOP-TEST-01", headers=headers_admin)
        await client.delete("/api/v1/sop/SOP-TEST-SALES", headers=headers_admin)

        print("[1] Test GET /api/v1/sop...")
        res = await client.get("/api/v1/sop")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        body = res.json()
        assert body["success"] is True
        print(f"    -> OK: Found {body['count']} SOPs.")

        print("\n[2] Test POST /api/v1/sop (Save Draft)...")
        draft_payload = {
            "id": "SOP-TEST-01",
            "code": "SOP-TEST-01",
            "title": "Quy trình kiểm thử nháp BR-04",
            "dept": "Pháp chế",
            "version": "v1.0",
            "tags": ["#test", "#draft"],
            "purpose": "Quy trình kiểm tra tính hợp lệ của bản nháp trước khi xuất bản.",
            "steps": [
                {"num": 1, "title": "Bước 1", "desc": "Chuẩn bị hồ sơ."},
                {"num": 2, "title": "Bước 2", "desc": "Đối soát văn bản."}
            ],
            "governance": "Quy định thử nghiệm nội bộ."
        }
        headers_manager_legal = {
            "X-User-Name": "manager",
            "X-User-Dept": "Legal"
        }
        res_draft = await client.post("/api/v1/sop", json=draft_payload, headers=headers_manager_legal)
        assert res_draft.status_code == 200, f"Expected 200, got {res_draft.status_code}: {res_draft.text}"
        draft_data = res_draft.json()["data"]
        assert draft_data["status"] == "draft"
        assert draft_data["code"] == "SOP-TEST-01"
        print("    -> OK: Draft saved successfully with status='draft'.")

        print("\n[3] Test POST /api/v1/sop/publish (Success for own department - FR26, UC.14)...")
        res_publish = await client.post(
            "/api/v1/sop/publish",
            json={"sop_id": "SOP-TEST-01"},
            headers=headers_manager_legal
        )
        assert res_publish.status_code == 200, f"Expected 200, got {res_publish.status_code}: {res_publish.text}"
        pub_data = res_publish.json()["data"]
        assert pub_data["status"] == "published"
        assert pub_data["publishedAt"] is not None
        print("    -> OK: Published successfully by Legal Manager for Legal department.")

        print("\n[4] Test POST /api/v1/sop/publish (BR-04 Enforcement: Reject when manager publishes for other dept)...")
        foreign_sop_payload = {
            "id": "SOP-TEST-SALES",
            "code": "SOP-TEST-SALES",
            "title": "Quy trình bán hàng vi phạm BR-04",
            "dept": "Kinh doanh",
            "purpose": "Test BR-04 rejection."
        }
        await client.post("/api/v1/sop", json=foreign_sop_payload, headers=headers_manager_legal)

        res_foreign = await client.post(
            "/api/v1/sop/publish",
            json={"sop_id": "SOP-TEST-SALES"},
            headers=headers_manager_legal  # Legal manager cố xuất bản cho Kinh doanh
        )
        assert res_foreign.status_code == 403, f"Expected 403 Forbidden for BR-04, got {res_foreign.status_code}: {res_foreign.text}"
        assert "BR-04" in res_foreign.json()["detail"]
        print(f"    -> OK: Correctly blocked by BR-04 with 403 Forbidden: {res_foreign.json()['detail']}")

        print("\n[5] Test POST /api/v1/sop/publish (Reject Standard User - FR26)...")
        headers_sales_ops = {
            "X-User-Name": "ops",
            "X-User-Dept": "Sales"
        }
        res_std = await client.post(
            "/api/v1/sop/publish",
            json={"sop_id": "SOP-TEST-01"},
            headers=headers_sales_ops
        )
        assert res_std.status_code == 403, f"Expected 403 Forbidden for Standard User, got {res_std.status_code}"
        print(f"    -> OK: Standard user blocked with 403 Forbidden: {res_std.json()['detail']}")

        print("\n[6] Test GET /api/v1/sop/SOP-TEST-01 detail...")
        res_get = await client.get("/api/v1/sop/SOP-TEST-01")
        assert res_get.status_code == 200
        assert res_get.json()["data"]["code"] == "SOP-TEST-01"
        print("    -> OK: Detail retrieved.")

        print("\n[7] Clean up test records...")
        headers_admin = {"X-User-Name": "admin"}
        await client.delete("/api/v1/sop/SOP-TEST-01", headers=headers_admin)
        await client.delete("/api/v1/sop/SOP-TEST-SALES", headers=headers_admin)
        print("    -> OK: Test SOPs cleaned up.")

    print("\n=======================================================")
    print("ALL TESTS PASSED: /api/v1/sop/publish & BR-04 VERIFIED!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(run_async_tests())
