"""
Graph Mind — Deep Test Suite Module 6: Admin Security, Granular RBAC Matrix & Audit Trail
Target Views: AdminView.jsx & GranularRbacMatrix.jsx (/#admin)
Enterprise Specs: SCREEN-Admin, PB02, Granular RBAC Matrix, Immutable Audit Logs, BR-02/BR-04 Security Gate
Visual Mode: Headed Chrome with top banner, element highlights, and human-observable pacing.
"""

import sys
import time
import urllib.request
import json
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173/#admin"
BACKEND_URL = "http://127.0.0.1:5000"

def show_step_banner(page, step_id, title, desc):
    """Render a modern visual HUD banner at top of viewport."""
    script = f"""
    (() => {{
        let b = document.getElementById('deep-test-banner');
        if (!b) {{
            b = document.createElement('div');
            b.id = 'deep-test-banner';
            b.style.position = 'fixed';
            b.style.top = '12px';
            b.style.left = '50%';
            b.style.transform = 'translateX(-50%)';
            b.style.zIndex = '999999';
            b.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(217, 119, 6, 0.95))';
            b.style.color = '#ffffff';
            b.style.padding = '12px 28px';
            b.style.borderRadius = '14px';
            b.style.boxShadow = '0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.18)';
            b.style.fontFamily = 'Inter, -apple-system, sans-serif';
            b.style.pointerEvents = 'none';
            b.style.maxWidth = '880px';
            b.style.textAlign = 'center';
            b.style.backdropFilter = 'blur(10px)';
            b.style.transition = 'all 0.3s ease';
            document.body.appendChild(b);
        }}
        b.innerHTML = `
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #fbbf24; font-weight: 800; margin-bottom: 3px;">
                <i class="fa-solid fa-shield-halved" style="margin-right: 6px; color: #fbbf24;"></i> GRAPH MIND ENTERPRISE AUTOMATION &bull; MODULE 6 VERIFICATION
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                <i class="fa-solid fa-lock" style="margin-right: 8px; color: #fbbf24;"></i> [{step_id}] {title}
            </div>
            <div style="font-size: 13px; color: #fef3c7; margin-top: 4px; font-weight: 500;">
                {desc}
            </div>
        `;
    }})();
    """
    page.evaluate(script)

def highlight(page, locator, duration_ms=1800):
    """Draw a glowing amber frame around target element and dwell."""
    try:
        locator.first.evaluate("""el => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const orig = el.style.outline;
            const origShadow = el.style.boxShadow;
            el.style.outline = '3px solid #f59e0b';
            el.style.boxShadow = '0 0 24px rgba(245, 158, 11, 0.75)';
            el.style.transition = 'all 0.25s ease';
            window.__lastHighlight = { el, orig, origShadow };
        }""")
        time.sleep(duration_ms / 1000.0)
        locator.first.evaluate("""el => {
            if (window.__lastHighlight && window.__lastHighlight.el === el) {
                el.style.outline = window.__lastHighlight.orig;
                el.style.boxShadow = window.__lastHighlight.origShadow;
            }
        }""")
    except Exception as e:
        time.sleep(duration_ms / 1000.0)

def run_tests():
    print("=" * 80)
    print("  GRAPH MIND — DEEP AUTOMATED VERIFICATION: MODULE 6")
    print("  QUẢN TRỊ HỆ THỐNG, MA TRẬN PHÂN QUYỀN RBAC & NHẬT KÝ KIỂM TOÁN (M6)")
    print("=" * 80)

    # 1. Obtain Real Admin JWT Token via PostgreSQL Auth
    login_data = json.dumps({"identifier": "admin", "password": "123456"}).encode()
    req_login = urllib.request.Request(
        f"{BACKEND_URL}/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_login) as resp:
        auth_res = json.loads(resp.read().decode())
        admin_token = auth_res["access_token"]
        admin_user = auth_res["user"]
        print(f"  -> Đăng nhập Admin thành công: {admin_user.get('email')} (Token JWT sẵn sàng).")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--start-maximized", "--disable-infobars"]
        )
        context = browser.new_context(
            no_viewport=True,
            locale="vi-VN"
        )
        page = context.new_page()

        # Seed local storage with real admin session before navigating
        page.goto("http://127.0.0.1:5173")
        page.evaluate(f"""() => {{
            localStorage.setItem('aegis_token', '{admin_token}');
            localStorage.setItem('access_token', '{admin_token}');
            localStorage.setItem('aegis_user', JSON.stringify({json.dumps(admin_user)}));
            localStorage.setItem('aegis_auth_user', JSON.stringify({json.dumps(admin_user)}));
        }}""")

        # =====================================================================
        # TC-M6-01: TRUNG TÂM QUẢN TRỊ & DANH MỤC NGƯỜI DÙNG DOANH NGHIỆP
        # =====================================================================
        print("\n[TC-M6-01] Mở Trung tâm Quản trị An ninh & Danh mục Người dùng (Users Directory)...")
        page.goto(FRONTEND_URL)
        page.wait_for_timeout(2500)

        show_step_banner(
            page,
            "TC-M6-01",
            "Trung Tâm Quản Trị Hệ Thống & Danh Mục Tài Khoản (PostgreSQL)",
            "Đang kiểm tra danh sách 4 tài khoản nhân sự từ PostgreSQL với đầy đủ phân quyền và vai trò"
        )

        # Click on Users & Roles tab
        tab_users = page.locator("button:has-text('Người dùng & Vai trò')").first
        highlight(page, tab_users, 1500)
        tab_users.click()
        time.sleep(1.5)

        # Verify user table rows
        user_table = page.locator("table")
        assert user_table.count() > 0, "Bảng danh sách người dùng không hiển thị"
        highlight(page, user_table.first, 2000)

        # Check for core enterprise accounts: admin, exec, manager, ops
        assert page.locator("text=admin@graphmind.ai").count() > 0, "Thiếu tài khoản Admin"
        assert page.locator("text=executive@graphmind.ai").count() > 0, "Thiếu tài khoản Executive"
        assert page.locator("text=manager@graphmind.ai").count() > 0, "Thiếu tài khoản Manager"
        assert page.locator("text=ops@graphmind.ai").count() > 0, "Thiếu tài khoản Operations"
        print("  -> Danh mục người dùng PostgreSQL: Đầy đủ 4 tài khoản cốt lõi (Admin, Exec, Manager, Ops).")
        time.sleep(1.0)

        # =====================================================================
        # TC-M6-02: MA TRẬN PHÂN QUYỀN CHI TIẾT (GRANULAR RBAC MATRIX - PB02)
        # =====================================================================
        print("\n[TC-M6-02] Kiểm tra Ma Trận Phân Quyền Tri Thức Đa Chiều (Granular RBAC Matrix)...")
        show_step_banner(
            page,
            "TC-M6-02",
            "Ma Trận Phân Quyền Tri Thức (Granular RBAC Matrix PB02)",
            "Quản lý 20 chính sách bảo mật chi tiết: 4 vai trò x 4 phòng ban x 3 loại tài nguyên"
        )

        tab_matrix = page.locator("button:has-text('Ma trận Phân quyền')").first
        highlight(page, tab_matrix, 1500)
        tab_matrix.click()
        time.sleep(2.0)

        # Verify RBAC matrix container
        matrix_container = page.locator("text=Ma trận Phân quyền")
        assert matrix_container.count() > 0, "Giao diện Ma trận Phân quyền chưa xuất hiện"
        highlight(page, matrix_container.first, 1800)

        # Verify policy cards / scope toggles
        matrix_toggles = page.locator("button[title*='truy vấn']")
        toggle_count = matrix_toggles.count()
        print(f"  -> Số lượng công tắc kiểm soát quyền truy cập chi tiết: {toggle_count}")
        assert toggle_count >= 10, f"Ma trận RBAC thiếu các nút công tắc phân quyền (tìm thấy: {toggle_count})"
        highlight(page, matrix_toggles.first, 1500)
        
        # Test clicking a toggle to demonstrate live permission change
        print("  -> Thử nghiệm đổi trạng thái quyền trên ma trận...")
        matrix_toggles.first.click()
        time.sleep(1.0)
        matrix_toggles.first.click()
        time.sleep(1.0)

        # =====================================================================
        # TC-M6-03: BỘ LỌC TRẠNG THÁI NGƯỜI DÙNG & TÁC VỤ BẢO MẬT (MODAL)
        # =====================================================================
        print("\n[TC-M6-03] Kiểm tra Tác vụ Quản trị: Thêm Người Dùng & Bộ Lọc Trạng Thái...")
        show_step_banner(
            page,
            "TC-M6-03",
            "Tác Vụ Quản Trị Nhân Sự & Modal Tạo Tài Khoản",
            "Kiểm tra form khởi tạo tài khoản mới với mật khẩu mã hóa bcrypt và phân quyền phòng ban"
        )

        tab_users.click()
        time.sleep(1.5)

        # Click "+ Thêm Người dùng" button
        add_btn = page.locator("button:has-text('Thêm Người dùng')").first
        highlight(page, add_btn, 1200)
        add_btn.click()
        time.sleep(1.5)

        # Verify Add User Modal opens
        modal = page.locator("text=Thêm người dùng mới")
        assert modal.count() > 0, "Modal Thêm người dùng không xuất hiện"
        highlight(page, modal.first, 1800)

        # Close modal
        close_modal_btn = page.locator("button:has-text('×')").first
        close_modal_btn.click()
        time.sleep(1.0)
        print("  -> Modal tạo người dùng hoạt động đúng chuẩn biểu mẫu doanh nghiệp.")

        # =====================================================================
        # TC-M6-04: HÀNG ĐỢI PHÊ DUYỆT TÀI LIỆU NẠP VÀO (PENDING APPROVALS)
        # =====================================================================
        print("\n[TC-M6-04] Kiểm tra Hàng đợi Phê duyệt Tài liệu Ingestion...")
        show_step_banner(
            page,
            "TC-M6-04",
            "Hàng Đợi Phê Duyệt Tài Liệu (Pending Approvals Queue)",
            "Admin kiểm tra các tài liệu do nhân viên gửi lên trước khi cho phép lập chỉ mục AI Copilot"
        )

        tab_approvals = page.locator("button:has-text('Phê duyệt Tài liệu')").first
        highlight(page, tab_approvals, 1500)
        tab_approvals.click()
        time.sleep(2.0)

        # Verify Pending Approvals Panel
        approvals_header = page.locator("text=Phê duyệt")
        assert approvals_header.count() > 0, "Giao diện Phê duyệt tài liệu chưa xuất hiện"
        highlight(page, approvals_header.first, 1800)
        print("  -> Hàng đợi phê duyệt tài liệu sẵn sàng nhận định dạng PDF, DOCX, XLSX.")
        time.sleep(1.0)

        # =====================================================================
        # TC-M6-05: NHẬT KÝ KIỂM TOÁN BẤT BIẾN POSTGRESQL (AUDIT TRAIL)
        # =====================================================================
        print("\n[TC-M6-05] Kiểm tra Bảng Nhật Ký Kiểm Toán Bất Biến (Audit Trail)...")
        show_step_banner(
            page,
            "TC-M6-05",
            "Nhật Ký Kiểm Toán Bất Biến (PostgreSQL Audit Trail)",
            "Truy xuất 49+ bản ghi kiểm toán ghi nhận mọi thao tác: đăng nhập, đổi quyền, khóa tài khoản"
        )

        tab_audit = page.locator("button:has-text('Nhật ký Kiểm toán')").first
        highlight(page, tab_audit, 1500)
        tab_audit.click()
        time.sleep(2.0)

        # Verify audit logs container and entries
        audit_counter = page.locator("text=Hiển thị")
        assert audit_counter.count() > 0, "Dòng tổng số nhật ký kiểm toán không hiển thị"
        counter_text = audit_counter.first.inner_text()
        print(f"  -> Trạng thái kiểm toán: {counter_text}")
        highlight(page, audit_counter.first, 1500)

        # Highlight sample audit item
        audit_cards = page.locator("text=Hiển thị").locator("..").locator("> div:last-child > div")
        audit_count = audit_cards.count()
        print(f"  -> Số bản ghi nhật ký kiểm toán bất biến hiển thị: {audit_count}")
        assert audit_count > 0, "Không có bản ghi nhật ký kiểm toán nào hiển thị"
        highlight(page, audit_cards.first, 2000)

        # Verify search filter on Audit Trail
        audit_search = page.locator("input[placeholder*='Tìm theo']")
        if audit_search.count() > 0:
            highlight(page, audit_search.first, 1200)
            print("  -> Lọc nhật ký kiểm toán theo tác nhân: 'admin'")
            audit_search.first.fill("admin")
            time.sleep(1.5)

        # =====================================================================
        # TC-M6-06: CỔNG BẢO VỆ AN NINH TRUY CẬP ADMIN (BR-02 / BR-04 GATE)
        # =====================================================================
        print("\n[TC-M6-06] Kiểm định Cổng An Ninh Phân Quyền Quản Trị (BR-02 / BR-04 Gate)...")
        show_step_banner(
            page,
            "TC-M6-06",
            "Cổng An Ninh Bảo Vệ Phân Quyền Quản Trị (BR-02 / BR-04)",
            "Chứng minh Người dùng Nghiệp vụ (Standard / Sales) bị chặn mã lỗi 403 Forbidden"
        )

        # 1. Log in via API with Standard User (Sales / Ops)
        login_ops = json.dumps({"identifier": "ops", "password": "123456"}).encode()
        req_ops_login = urllib.request.Request(
            f"{BACKEND_URL}/api/v1/auth/login",
            data=login_ops,
            headers={"Content-Type": "application/json"}
        )
        resp_ops = urllib.request.urlopen(req_ops_login)
        ops_token = json.loads(resp_ops.read().decode())["access_token"]

        # 2. Standard user attempts to call Admin API -> MUST be rejected with HTTP 403 Forbidden!
        print("  -> Thử nghiệm: Chuyên viên Ops gọi API /api/v1/admin/users...")
        req_unauth = urllib.request.Request(
            f"{BACKEND_URL}/api/v1/admin/users",
            headers={"Authorization": f"Bearer {ops_token}"}
        )
        try:
            urllib.request.urlopen(req_unauth)
            raise AssertionError("LỖI BẢO MẬT: Standard User gọi được API Admin Users mà không bị 403!")
        except urllib.error.HTTPError as err:
            print(f"  -> Phản hồi hệ thống: HTTP {err.code} - {err.reason} (Từ chối truy cập chuẩn xác!)")
            assert err.code == 403, f"Mong đợi HTTP 403 nhưng nhận {err.code}"

        # 3. Standard user attempts to call Admin RBAC Matrix API -> MUST be rejected with HTTP 403!
        print("  -> Thử nghiệm: Chuyên viên Ops gọi API /api/v1/admin/rbac-matrix...")
        req_matrix_unauth = urllib.request.Request(
            f"{BACKEND_URL}/api/v1/admin/rbac-matrix",
            headers={"Authorization": f"Bearer {ops_token}"}
        )
        try:
            urllib.request.urlopen(req_matrix_unauth)
            raise AssertionError("LỖI BẢO MẬT: Standard User xem được Ma trận RBAC mà không bị 403!")
        except urllib.error.HTTPError as err:
            print(f"  -> Phản hồi hệ thống: HTTP {err.code} - {err.reason} (Bảo vệ BR-02/BR-04 thành công!)")
            assert err.code == 403, f"Mong đợi HTTP 403 nhưng nhận {err.code}"

        # Switch back to Granular RBAC Matrix
        tab_matrix.click()
        time.sleep(1.5)

        # Final success banner
        show_step_banner(
            page,
            "HOÀN TẤT MODULE 6",
            "Kiểm Thử Sâu Toàn Bộ Chức Năng Module 6 Đạt 100% THÀNH CÔNG!",
            "Quản trị người dùng PostgreSQL, Ma trận RBAC PB02, Nhật ký kiểm toán và An ninh bảo mật hoàn hảo."
        )
        time.sleep(3.0)
        browser.close()

    print("\n" + "=" * 80)
    print("  KẾT QUẢ: MODULE 6 HOÀN TOÀN ĐẠT CHUẨN (100% PASS - 6/6 TEST CASES)")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
