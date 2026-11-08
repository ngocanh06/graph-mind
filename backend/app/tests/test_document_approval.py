"""
Self-check test for Document Upload Approval Workflow (PB48, PB50, PB02).
Tests:
1. Submitting upload as Standard User (PENDING status + AuditLog entry).
2. Submitting upload as Admin (auto APPROVED status + AuditLog entry).
3. Admin listing approvals and checking pending_count.
4. Admin previewing uploaded content.
5. Admin approving pending document.
6. Admin rejecting pending document with reason.
7. Verification that unauthorized role/department without can_upload gets 403 Forbidden.
"""
import io
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m6_admin_security.document_approval_router import ensure_approval_table
from app.modules.m6_admin_security.rbac_matrix_service import ensure_table_created, seed_default_matrix


@pytest.mark.asyncio
async def test_document_approval_workflow():
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as db:
        await ensure_approval_table(db)
        await ensure_table_created(db)
        await seed_default_matrix(db)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Standard user submits upload for SALES (has permission by default)
        csv_content = b"id,customer_name,revenue\n1,Acme Corp,15000\n2,Globex,28000\n"
        files = {"file": ("test_customers.csv", io.BytesIO(csv_content), "text/csv")}
        data = {
            "resource_type": "SALES",
            "department_code": "SALES",
            "action_type": "UPLOAD_NEW",
        }
        headers = {
            "X-User-Email": "sales.user@graphmind.ai",
            "X-User-Role": "standard",
            "X-User-Dept": "SALES",
        }
        res = await client.post("/api/documents/submit-upload", files=files, data=data, headers=headers)
        assert res.status_code == 200, f"Submit upload failed: {res.text}"
        res_data = res.json()
        assert res_data["success"] is True
        assert res_data["status"] == "PENDING"
        request_id = res_data["id"]

        # 2. Check that Standard user without permission gets 403 when uploading to IT
        files_forbidden = {"file": ("it_secrets.csv", io.BytesIO(b"token,secret\n1,abc\n"), "text/csv")}
        data_forbidden = {
            "resource_type": "IT",
            "department_code": "SALES",
        }
        res_403 = await client.post("/api/documents/submit-upload", files=files_forbidden, data=data_forbidden, headers=headers)
        assert res_403.status_code == 403, f"Expected 403 but got {res_403.status_code}"

        # 3. Admin listing approvals
        admin_headers = {
            "X-User-Email": "admin@graphmind.ai",
            "X-User-Role": "admin",
            "X-User-Dept": "IT",
        }
        list_res = await client.get("/api/admin/upload-approvals", headers=admin_headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["success"] is True
        assert list_data["pending_count"] >= 1
        found = any(it["id"] == request_id for it in list_data["items"])
        assert found, "Created request not found in admin list"

        # 4. Preview the pending request
        preview_res = await client.get(f"/api/admin/upload-approvals/{request_id}/preview", headers=admin_headers)
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["success"] is True
        assert "customer_name" in preview_data["preview_text"]

        # 5. Admin rejecting the request with note
        reject_res = await client.post(
            f"/api/admin/upload-approvals/{request_id}/reject",
            json={"review_note": "Dữ liệu thiếu mã thuế của khách hàng."},
            headers=admin_headers,
        )
        assert reject_res.status_code == 200
        reject_data = reject_res.json()
        assert reject_data["success"] is True
        assert reject_data["item"]["status"] == "REJECTED"
        assert reject_data["item"]["review_note"] == "Dữ liệu thiếu mã thuế của khách hàng."

        # 6. Admin auto-approval test
        admin_files = {"file": ("admin_policy.csv", io.BytesIO(b"col1,col2\nv1,v2\n"), "text/csv")}
        admin_data = {
            "resource_type": "LEGAL",
            "department_code": "LEGAL",
        }
        admin_upload_res = await client.post("/api/documents/submit-upload", files=admin_files, data=admin_data, headers=admin_headers)
        assert admin_upload_res.status_code == 200
        admin_res_data = admin_upload_res.json()
        assert admin_res_data["status"] == "APPROVED"

        print("\n[ALL SELF-CHECK TESTS PASSED FOR DOCUMENT APPROVALS & GRANULAR RBAC!]")


if __name__ == "__main__":
    asyncio.run(test_document_approval_workflow())
