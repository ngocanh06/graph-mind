"""
=============================================================================
KICH BAN KIEM THU TOAN DIEN - Document Upload Approval Workflow (PB48, PB50, PB02)
=============================================================================
12 kich ban TC-01 -> TC-12:

  NHOM A - Kiem soat quyen (RBAC)
    TC-01  Standard User gui SALES (dung quyen)     -> 200 PENDING
    TC-02  Standard User gui LEGAL (sai quyen)      -> 403 Forbidden
    TC-03  Standard User gui IT (sai quyen)         -> 403 Forbidden
    TC-04  Department Manager gui LEGAL (dung quyen)-> 200 PENDING
    TC-05  Executive gui RND (dung quyen)           -> 200 PENDING
    TC-06  Admin gui tai lieu (tu duyet ngay)       -> 200 APPROVED

  NHOM B - Vong doi phe duyet
    TC-07  Admin lay danh sach cho duyet            -> pending_count >= 3
    TC-07b Admin thay lich su APPROVED trong list   -> co trong items
    TC-08  Admin xem truoc noi dung CSV             -> preview co du lieu
    TC-09  Admin phe duyet tai lieu PENDING         -> APPROVED
    TC-10  Admin tu choi tai lieu voi ly do         -> REJECTED + note luu
    TC-11  Standard User chi thay tai lieu cua minh -> 0 ro ri
    TC-12  Admin duyet lai tai lieu da REJECTED     -> APPROVED (override)

Chay: python -m app.tests.test_e2e_document_approval
"""
import io
import asyncio
import logging
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m6_admin_security.document_approval_router import ensure_approval_table
from app.modules.m6_admin_security.rbac_matrix_service import ensure_table_created, seed_default_matrix

logging.disable(logging.CRITICAL)

HEADERS_STANDARD = {"X-User-Email": "sales.vien@graphmind.ai", "X-User-Role": "standard", "X-User-Dept": "SALES"}
HEADERS_MANAGER   = {"X-User-Email": "manager.legal@graphmind.ai", "X-User-Role": "manager", "X-User-Dept": "LEGAL"}
HEADERS_EXECUTIVE = {"X-User-Email": "exec@graphmind.ai", "X-User-Role": "executive", "X-User-Dept": "ALL"}
HEADERS_ADMIN     = {"X-User-Email": "admin@graphmind.ai", "X-User-Role": "admin", "X-User-Dept": "IT"}

CSV_SALES = b"id,customer_name,revenue\n1,Acme Corp,150000\n2,Globex,280000\n"
CSV_LEGAL = b"contract_id,party_a,value_vnd\nCT001,GraphMind,500000000\nCT002,GraphMind,1200000000\n"
CSV_RND   = b"project_code,title,budget\nRD-001,AI Core v2,2000000000\nRD-002,Edge Inference,800000000\n"
CSV_ADMIN = b"policy_id,resource,role\nP001,SALES,STANDARD_USER\n"

_results = []


def _ok(tc, desc, detail=""):
    _results.append({"tc": tc, "status": "PASS", "desc": desc})
    print(f"  [PASS] {tc}: {desc}" + (f" | {detail}" if detail else ""))


def _fail(tc, desc, reason):
    _results.append({"tc": tc, "status": "FAIL", "desc": desc, "detail": reason})
    print(f"  [FAIL] {tc}: {desc} | {reason}")


def _chk(cond, tc, desc, fail_detail, ok_detail=""):
    _ok(tc, desc, ok_detail) if cond else _fail(tc, desc, fail_detail)


async def _post(client, csv_bytes, fname, res_type, headers, action="UPLOAD_NEW"):
    files = {"file": (fname, io.BytesIO(csv_bytes), "text/csv")}
    data  = {"resource_type": res_type, "action_type": action}
    return await client.post("/api/documents/submit-upload", files=files, data=data, headers=headers)


async def run_all():
    print("\n" + "="*70)
    print("  KICH BAN KIEM THU: Document Upload Approval Workflow")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("="*70)

    async with AsyncSessionLocal() as db:
        await ensure_approval_table(db)
        await ensure_table_created(db)
        await seed_default_matrix(db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:

        print("\n--- NHOM A: Kiem soat quyen (RBAC) ---")

        res = await _post(c, CSV_SALES, "sales_q4.csv", "SALES", HEADERS_STANDARD)
        d = res.json(); tc01_id = d.get("id")
        _chk(res.status_code == 200 and d.get("status") == "PENDING",
             "TC-01", "Standard User + SALES -> PENDING",
             f"HTTP {res.status_code}", f"id={tc01_id}")

        res = await _post(c, CSV_LEGAL, "contracts.csv", "LEGAL", HEADERS_STANDARD)
        _chk(res.status_code == 403, "TC-02", "Standard User + LEGAL -> 403",
             f"HTTP {res.status_code}", "403 OK")

        res = await _post(c, b"t,s\n1,a\n", "keys.csv", "IT", HEADERS_STANDARD)
        _chk(res.status_code == 403, "TC-03", "Standard User + IT -> 403",
             f"HTTP {res.status_code}", "403 OK")

        res = await _post(c, CSV_LEGAL, "hop_dong.csv", "LEGAL", HEADERS_MANAGER)
        d = res.json(); tc04_id = d.get("id")
        _chk(res.status_code == 200 and d.get("status") == "PENDING",
             "TC-04", "Department Manager + LEGAL -> PENDING",
             f"HTTP {res.status_code}", f"id={tc04_id}")

        res = await _post(c, CSV_RND, "rnd.csv", "RND", HEADERS_EXECUTIVE)
        d = res.json(); tc05_id = d.get("id")
        _chk(res.status_code == 200 and d.get("status") == "PENDING",
             "TC-05", "Executive + RND -> PENDING",
             f"HTTP {res.status_code}", f"id={tc05_id}")

        res = await _post(c, CSV_ADMIN, "policy.csv", "LEGAL", HEADERS_ADMIN)
        d = res.json(); tc06_id = d.get("id")
        _chk(res.status_code == 200 and d.get("status") == "APPROVED",
             "TC-06", "Admin upload -> tu dong APPROVED",
             f"HTTP {res.status_code}", f"id={tc06_id}")

        print("\n--- NHOM B: Vong doi phe duyet ---")

        res = await c.get("/api/admin/upload-approvals", headers=HEADERS_ADMIN)
        d = res.json(); pc = d.get("pending_count", 0); items = d.get("items", [])
        _chk(res.status_code == 200 and d.get("success") and pc >= 3,
             "TC-07", f"Admin lay danh sach -> pending_count={pc} (>=3)",
             f"HTTP {res.status_code}", f"total={d.get('total')}, pending={pc}")

        approved_in = next((x for x in items if x.get("id") == tc06_id), None)
        _chk(approved_in is not None if tc06_id else True,
             "TC-07b", "Admin thay tai lieu APPROVED cua minh trong lich su",
             "Khong tim thay APPROVED trong items", "Co trong items")

        if tc01_id:
            res = await c.get(f"/api/admin/upload-approvals/{tc01_id}/preview", headers=HEADERS_ADMIN)
            d = res.json(); pt = d.get("preview_text", "")
            _chk(res.status_code == 200 and any(kw in pt for kw in ("customer_name","revenue","Acme","Globex")),
                 "TC-08", "Admin xem truoc CSV -> noi dung hien thi",
                 f"HTTP {res.status_code} | preview: {pt[:80]}", "preview co du lieu")
        else:
            _fail("TC-08", "Admin xem truoc CSV", "tc01_id khong co (TC-01 that bai)")

        if tc04_id:
            res = await c.post(f"/api/admin/upload-approvals/{tc04_id}/approve", headers=HEADERS_ADMIN)
            d = res.json(); item = d.get("item", {})
            _chk(res.status_code == 200 and item.get("status") == "APPROVED",
                 "TC-09", "Admin phe duyet tai lieu LEGAL cua Manager -> APPROVED",
                 f"HTTP {res.status_code}", f"status={item.get('status')}")
        else:
            _fail("TC-09", "Admin phe duyet", "tc04_id khong co")

        NOTE = "Du lieu R&D chua thong tin nhay cam, can ma hoa truoc khi dua vao kho."
        if tc05_id:
            res = await c.post(f"/api/admin/upload-approvals/{tc05_id}/reject",
                               json={"review_note": NOTE}, headers=HEADERS_ADMIN)
            d = res.json(); item = d.get("item", {})
            _chk(res.status_code == 200 and item.get("status") == "REJECTED" and item.get("review_note") == NOTE,
                 "TC-10", "Admin tu choi RND -> REJECTED + note luu chinh xac",
                 f"HTTP {res.status_code}", f"note OK")
        else:
            _fail("TC-10", "Admin tu choi", "tc05_id khong co")

        res = await c.get("/api/admin/upload-approvals", headers=HEADERS_STANDARD)
        d = res.json(); my_items = d.get("items", [])
        leaked = [x for x in my_items if x.get("uploaded_by_email") != HEADERS_STANDARD["X-User-Email"]]
        _chk(res.status_code == 200 and len(leaked) == 0,
             "TC-11", f"Standard User chi thay tai lieu cua minh ({len(my_items)} items)",
             f"Ro ri {len(leaked)} items", "Khong ro ri")

        if tc05_id:
            res = await c.post(f"/api/admin/upload-approvals/{tc05_id}/approve", headers=HEADERS_ADMIN)
            d = res.json(); item = d.get("item", {})
            _chk(res.status_code == 200 and item.get("status") == "APPROVED",
                 "TC-12", "Admin duyet lai tai lieu da REJECTED -> APPROVED",
                 f"HTTP {res.status_code}", f"status={item.get('status')}")
        else:
            _fail("TC-12", "Duyet lai da reject", "tc05_id khong co")

    total = len(_results); passed = sum(1 for r in _results if r["status"] == "PASS"); failed = total - passed
    print("\n" + "="*70)
    print(f"  KET QUA: {passed}/{total} PASS | {failed} FAIL")
    print("="*70)
    if failed:
        for r in _results:
            if r["status"] == "FAIL":
                print(f"  x {r['tc']}: {r['desc']} | {r.get('detail','')}")
    else:
        print("  TAT CA KICH BAN DA PASS!")
    print()
    return failed


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run_all()))
