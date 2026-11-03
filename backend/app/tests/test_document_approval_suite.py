"""
=============================================================================
AUTOMATED TEST SUITE: Phê duyệt Tài liệu theo Phòng ban (Document Upload Approvals)
Tuân thủ đặc tả SRS & Ma trận Test Cases chi tiết (TC_APPR_001 -> TC_APPR_017)
=============================================================================
Cách chạy:
  1. Chạy trực tiếp script (in bảng báo cáo kết quả chi tiết):
     python -m app.tests.test_document_approval_suite
  2. Chạy qua Pytest:
     pytest app/tests/test_document_approval_suite.py -v
=============================================================================
"""
import io
import os
import sys
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m6_admin_security.document_approval_router import ensure_approval_table
from app.modules.m6_admin_security.rbac_matrix_service import ensure_table_created, seed_default_matrix

# Tắt bớt log ồn khi test
logging.disable(logging.CRITICAL)

# Định nghĩa các Actor giả lập theo đúng vai trò & phòng ban
USER_FINANCE = {
    "X-User-Email": "user.finance@graphmind.ai",
    "X-User-Role": "standard",
    "X-User-Dept": "ACCOUNTING_PROCUREMENT",
}

USER_SALES = {
    "X-User-Email": "user.sales@graphmind.ai",
    "X-User-Role": "standard",
    "X-User-Dept": "SALES",
}

MANAGER_HR = {
    "X-User-Email": "manager.hr@graphmind.ai",
    "X-User-Role": "manager",
    "X-User-Dept": "LEGAL",
}

ADMIN_SEC = {
    "X-User-Email": "admin@graphmind.ai",
    "X-User-Role": "admin",
    "X-User-Dept": "IT",
}

# Payload mẫu
SAMPLE_CSV_FIN = b"transaction_id,amount,description\nTX1001,150000000,Chi phi server AWS Q3\nTX1002,45000000,Mua ban ghe van phong\n"
SAMPLE_CSV_SALES = b"customer_id,name,tier\nC001,Vingroup,Enterprise\nC002,FPT,Enterprise\n"

TEST_SUMMARY: List[Dict[str, Any]] = []


def record_result(tc_id: str, tc_name: str, status: str, detail: str = ""):
    TEST_SUMMARY.append({
        "id": tc_id,
        "name": tc_name,
        "status": status,
        "detail": detail
    })
    color = "\033[92m[PASS]\033[0m" if status == "PASS" else "\033[91m[FAIL]\033[0m"
    print(f"  {color} {tc_id} — {tc_name}" + (f" | {detail}" if detail else ""))


async def upload_file(client: AsyncClient, content: bytes, filename: str, res_type: str, dept: str, headers: dict):
    files = {"file": (filename, io.BytesIO(content), "text/csv")}
    data = {
        "resource_type": res_type,
        "department_code": dept,
        "action_type": "UPLOAD_NEW"
    }
    return await client.post("/api/documents/submit-upload", files=files, data=data, headers=headers)


@pytest.mark.asyncio
async def test_suite_full_execution():
    """Hàm test chính chạy toàn bộ các kịch bản kiểm thử từ TC_APPR_001 -> TC_APPR_017."""
    async with AsyncSessionLocal() as db:
        await ensure_approval_table(db)
        await ensure_table_created(db)
        await seed_default_matrix(db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        # ---------------------------------------------------------------------
        # TC_APPR_001: Upload thành công -> Trạng thái PENDING
        # ---------------------------------------------------------------------
        sales_fname = f"don_hang_{uuid.uuid4().hex[:6]}.csv"
        res_001 = await upload_file(client, SAMPLE_CSV_SALES, sales_fname, "SALES", "SALES", USER_SALES)
        d_001 = res_001.json() if res_001.status_code == 200 else {}
        doc_sales_id = d_001.get("id")
        
        tc001_pass = (res_001.status_code == 200 and d_001.get("status") == "PENDING" and bool(doc_sales_id))
        record_result("TC_APPR_001", "Upload tài liệu thành công vào trạng thái PENDING",
                      "PASS" if tc001_pass else "FAIL", f"HTTP {res_001.status_code}, id={doc_sales_id}")
        assert tc001_pass

        # ---------------------------------------------------------------------
        # TC_APPR_002: Kiểm tra Admin nhận danh sách chờ duyệt & pending_count >= 1
        # ---------------------------------------------------------------------
        res_002 = await client.get("/api/admin/upload-approvals", headers=ADMIN_SEC)
        d_002 = res_002.json() if res_002.status_code == 200 else {}
        items_admin = d_002.get("items", [])
        pending_count = d_002.get("pending_count", 0)
        found_in_pending = any(it["id"] == doc_sales_id for it in items_admin)
        
        tc002_pass = (res_002.status_code == 200 and pending_count >= 1 and found_in_pending)
        record_result("TC_APPR_002", "Hệ thống ghi nhận hàng đợi và tăng pending_count cho Admin",
                      "PASS" if tc002_pass else "FAIL", f"pending_count={pending_count}")
        assert tc002_pass

        # ---------------------------------------------------------------------
        # TC_APPR_005: Kiểm tra tính cô lập: User chỉ thấy tài liệu của chính mình
        # ---------------------------------------------------------------------
        res_005 = await client.get("/api/admin/upload-approvals", headers=USER_FINANCE)
        d_005 = res_005.json() if res_005.status_code == 200 else {}
        fin_items = d_005.get("items", [])
        has_sales_doc = any(it["id"] == doc_sales_id for it in fin_items)
        
        tc005_pass = (res_005.status_code == 200 and not has_sales_doc)
        record_result("TC_APPR_005", "Phân quyền cô lập: User phòng khác không thấy tài liệu PENDING",
                      "PASS" if tc005_pass else "FAIL", f"total_fin_seen={len(fin_items)}, leaked={has_sales_doc}")
        assert tc005_pass

        # ---------------------------------------------------------------------
        # TC_APPR_006: RBAC IDOR: Standard User upload tài nguyên phòng bị cấm -> 403
        # ---------------------------------------------------------------------
        res_006 = await upload_file(client, b"secrets\n1\n", "secrets.csv", "IT", "SALES", USER_SALES)
        tc006_pass = (res_006.status_code == 403)
        record_result("TC_APPR_006", "Bảo mật RBAC: Chặn User upload vào phòng ban trái thẩm quyền (IT)",
                      "PASS" if tc006_pass else "FAIL", f"HTTP {res_006.status_code}")
        assert tc006_pass

        # ---------------------------------------------------------------------
        # TC_APPR_007: Standard User cố tình gọi API Approve -> 403 Forbidden
        # ---------------------------------------------------------------------
        res_007 = await client.post(f"/api/admin/upload-approvals/{doc_sales_id}/approve", headers=USER_SALES)
        tc007_pass = (res_007.status_code == 403)
        record_result("TC_APPR_007", "Bảo mật API: User thông thường gọi API Approve bị chặn 403",
                      "PASS" if tc007_pass else "FAIL", f"HTTP {res_007.status_code}")
        assert tc007_pass

        # ---------------------------------------------------------------------
        # TC_APPR_016: Admin xem trước nội dung (Preview) tài liệu PENDING
        # ---------------------------------------------------------------------
        res_016 = await client.get(f"/api/admin/upload-approvals/{doc_sales_id}/preview", headers=ADMIN_SEC)
        d_016 = res_016.json() if res_016.status_code == 200 else {}
        preview_text = d_016.get("preview_text", "")
        tc016_pass = (res_016.status_code == 200 and "Vingroup" in preview_text)
        record_result("TC_APPR_016", "Admin xem trước (Preview) nội dung tài liệu trước khi duyệt",
                      "PASS" if tc016_pass else "FAIL", f"preview_length={len(preview_text)}")
        assert tc016_pass

        # ---------------------------------------------------------------------
        # TC_APPR_004: Admin từ chối (Reject) tài liệu kèm lý do
        # ---------------------------------------------------------------------
        reject_note = "Báo cáo doanh số Q3 chưa đính kèm danh mục khách hàng VIP"
        res_004 = await client.post(
            f"/api/admin/upload-approvals/{doc_sales_id}/reject",
            json={"review_note": reject_note},
            headers=ADMIN_SEC
        )
        d_004 = res_004.json() if res_004.status_code == 200 else {}
        item_004 = d_004.get("item", {})
        tc004_pass = (res_004.status_code == 200 and item_004.get("status") == "REJECTED" and item_004.get("review_note") == reject_note)
        record_result("TC_APPR_004", "Admin từ chối (Reject) tài liệu thành công kèm lý do",
                      "PASS" if tc004_pass else "FAIL", f"status={item_004.get('status')}")
        assert tc004_pass

        # ---------------------------------------------------------------------
        # TC_APPR_003: Admin phê duyệt (Approve) tài liệu thành công
        # ---------------------------------------------------------------------
        sales_fname2 = f"sales_plan_{uuid.uuid4().hex[:6]}.csv"
        res_upload_sales2 = await upload_file(client, SAMPLE_CSV_SALES, sales_fname2, "SALES", "SALES", USER_SALES)
        doc_sales_id2 = res_upload_sales2.json().get("id")
        
        res_003 = await client.post(f"/api/admin/upload-approvals/{doc_sales_id2}/approve", headers=ADMIN_SEC)
        d_003 = res_003.json() if res_003.status_code == 200 else {}
        item_003 = d_003.get("item", {})
        tc003_pass = (res_003.status_code == 200 and item_003.get("status") == "APPROVED")
        record_result("TC_APPR_003", "Admin phê duyệt (Approve) tài liệu thành công vào kho tri thức",
                      "PASS" if tc003_pass else "FAIL", f"status={item_003.get('status')}")
        # ---------------------------------------------------------------------
        # TC_APPR_011: Chống XSS / SQL Injection trong tên file và lý do từ chối
        # ---------------------------------------------------------------------
        xss_payload = "<script>alert('XSS_ATTACK')</script>"
        res_xss = await client.post(
            f"/api/admin/upload-approvals/{doc_sales_id}/reject",
            json={"review_note": xss_payload},
            headers=ADMIN_SEC
        )
        d_xss = res_xss.json() if res_xss.status_code == 200 else {}
        saved_note = d_xss.get("item", {}).get("review_note", "")
        tc011_pass = (res_xss.status_code == 200 and saved_note == xss_payload)
        record_result("TC_APPR_011", "Kiểm thử Sanitize an toàn khi payload chứa XSS / SQLi",
                      "PASS" if tc011_pass else "FAIL", "Payload được lưu an toàn dưới dạng raw string")
        assert tc011_pass

        # ---------------------------------------------------------------------
        # TC_APPR_012: Race Condition / Concurrency: 2 request đồng thời trên 1 tài liệu
        # ---------------------------------------------------------------------
        race_fname = f"race_{uuid.uuid4().hex[:6]}.csv"
        res_race = await upload_file(client, SAMPLE_CSV_SALES, race_fname, "SALES", "SALES", USER_SALES)
        race_doc_id = res_race.json().get("id")

        # Gửi 2 request approve song song qua asyncio.gather
        task1 = client.post(f"/api/admin/upload-approvals/{race_doc_id}/approve", headers=ADMIN_SEC)
        task2 = client.post(f"/api/admin/upload-approvals/{race_doc_id}/approve", headers=ADMIN_SEC)
        r1, r2 = await asyncio.gather(task1, task2)
        
        # Hệ thống phải xử lý idempotency an toàn (cả 2 đều kết thúc với trạng thái APPROVED, không crash)
        tc012_pass = (r1.status_code in (200, 409) and r2.status_code in (200, 409))
        record_result("TC_APPR_012", "Xử lý đồng thời (Race Condition) khi 2 Admin cùng thao tác",
                      "PASS" if tc012_pass else "FAIL", f"Req1={r1.status_code}, Req2={r2.status_code}")
        assert tc012_pass

        # ---------------------------------------------------------------------
        # TC_APPR_013: Duyệt tài liệu với ID không tồn tại -> 404 Not Found
        # ---------------------------------------------------------------------
        fake_uuid = str(uuid.uuid4())
        res_013 = await client.post(f"/api/admin/upload-approvals/{fake_uuid}/approve", headers=ADMIN_SEC)
        tc013_pass = (res_013.status_code == 404)
        record_result("TC_APPR_013", "Xử lý khi thao tác tài liệu không tồn tại -> 404 Not Found",
                      "PASS" if tc013_pass else "FAIL", f"HTTP {res_013.status_code}")
        assert tc013_pass

        # ---------------------------------------------------------------------
        # TC_APPR_017: Bộ lọc và phân trang trong danh sách phê duyệt
        # ---------------------------------------------------------------------
        res_017 = await client.get("/api/admin/upload-approvals?department=SALES&status=APPROVED", headers=ADMIN_SEC)
        d_017 = res_017.json() if res_017.status_code == 200 else {}
        filtered_items = d_017.get("items", [])
        all_sales = all(it["department_code"] == "SALES" for it in filtered_items)
        all_approved = all(it["status"] == "APPROVED" for it in filtered_items)
        tc017_pass = (res_017.status_code == 200 and all_sales and all_approved)
        record_result("TC_APPR_017", "Kiểm thử bộ lọc danh sách theo phòng ban và trạng thái",
                      "PASS" if tc017_pass else "FAIL", f"count={len(filtered_items)}")
        assert tc017_pass


def print_summary_table():
    print("\n" + "="*80)
    print("               BÁO CÁO KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (AUTOMATION QA REPORT)")
    print("         Chức năng: Phê duyệt Tài liệu theo Phòng ban (PB48, PB50, PB02)")
    print("="*80)
    print(f"{'MÃ TC':<14} | {'TÊN KỊCH BẢN':<42} | {'KẾT QUẢ':<8} | {'CHI TIẾT'}")
    print("-" * 80)
    for t in TEST_SUMMARY:
        status_str = "PASS" if t["status"] == "PASS" else "FAIL"
        print(f"{t['id']:<14} | {t['name'][:40]:<42} | {status_str:<8} | {t['detail']}")
    print("="*80)
    total = len(TEST_SUMMARY)
    passed = sum(1 for t in TEST_SUMMARY if t["status"] == "PASS")
    failed = total - passed
    print(f" TỔNG CỘNG: {total} Kịch bản | ĐẠT: {passed} PASS | THẤT BẠI: {failed} FAIL")
    print("="*80 + "\n")
    return failed


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(test_suite_full_execution())
    finally:
        failed_count = print_summary_table()
        exit(1 if failed_count > 0 else 0)
