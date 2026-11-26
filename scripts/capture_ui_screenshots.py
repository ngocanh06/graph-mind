"""
Capture high-resolution screenshots of all GraphMind user interfaces using Playwright.
"""
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "ui_screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

BASE_URL = "http://localhost:5173"

def run():
    print(f"[+] Starting Playwright to capture screenshots to {OUTPUT_DIR}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1600, "height": 980},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Login View
        print("[1/22] Capturing Login View...")
        page.goto(f"{BASE_URL}/", timeout=20000)
        page.evaluate("() => { localStorage.clear(); }")
        page.reload()
        time.sleep(1.5)
        # Check if login form is visible
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_view.png"))

        # 2. Forgot Password View
        print("[2/22] Capturing Forgot Password View...")
        # Click "Quên mật khẩu" or navigate
        try:
            forgot_btn = page.locator("text=Quên mật khẩu").first
            if forgot_btn.is_visible():
                forgot_btn.click()
                time.sleep(1.0)
        except Exception:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_forgot_password_view.png"))

        # Inject Admin Login state
        print("[+] Injecting Admin session into localStorage...")
        page.evaluate("""() => {
            localStorage.setItem('aegis_token', 'mock_admin_jwt_token_for_ui_doc');
            localStorage.setItem('aegis_user', JSON.stringify({
                id: 'it_admin',
                name: 'Trần Thị Ngọc Ánh',
                role: 'it_admin',
                roleKey: 'it_admin',
                badge: 'QUẢN TRỊ VIÊN & BAN GIÁM ĐỐC',
                badgeEn: 'SYS ADMIN & EXECUTIVE',
                email: 'admin@graphmind.ai',
                department: 'Ban Giám Đốc & Khối Công Nghệ',
                avatar: 'NA',
                color: '#0891b2',
                accentColor: '#06b6d4',
                permissions: ['all']
            }));
            localStorage.setItem('aegis_role', 'it_admin');
            localStorage.setItem('aegis_lang', 'vi');
            localStorage.setItem('aegis_theme', 'light');
        }""")
        page.goto(f"{BASE_URL}/", timeout=20000)
        time.sleep(2.0)

        # Helper to navigate via custom event or URL hash or sidebar click
        def navigate_to(view_name):
            page.evaluate(f"""(v) => {{
                window.location.hash = '#' + v;
                // Trigger React re-render by dispatching hashchange
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}""", view_name)
            time.sleep(1.8)

        # 3. Home View
        print("[3/22] Capturing Home Dashboard View...")
        navigate_to("home")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_home_dashboard.png"))

        # 4. Executive View
        print("[4/22] Capturing Executive View...")
        navigate_to("executive")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "04_executive_dashboard.png"))

        # 5. Risk View (Standardized)
        print("[5/22] Capturing Risk View...")
        navigate_to("risk")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_risk_observatory.png"))

        # 6. Copilot View
        print("[6/22] Capturing Copilot View...")
        navigate_to("copilot")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_copilot_workspace.png"))

        # 7. Search View
        print("[7/22] Capturing Search View...")
        navigate_to("search")
        # Type sample query into search input to show dynamic result cards
        try:
            search_input = page.locator("input[placeholder*='Tìm kiếm']").first
            if search_input.is_visible():
                search_input.fill("Hợp đồng")
                search_input.press("Enter")
                time.sleep(1.5)
        except Exception:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "07_smart_search.png"))

        # 8. Documents Repository
        print("[8/22] Capturing Documents Repository View...")
        navigate_to("documents")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "08_document_repository.png"))

        # 9. Document Upload Modal
        print("[9/22] Capturing Document Upload Modal...")
        try:
            upload_btn = page.locator("button:has-text('Tải lên'), button:has-text('Nạp')").first
            if upload_btn.is_visible():
                upload_btn.click()
                time.sleep(1.0)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "09_document_upload_modal.png"))
                # Close modal
                close_btn = page.locator("button:has-text('Đóng'), button:has-text('Hủy')").first
                if close_btn.is_visible():
                    close_btn.click()
                    time.sleep(0.5)
        except Exception as e:
            print("  Warning on upload modal:", e)

        # 10. Document Preview Modal
        print("[10/22] Capturing Document Preview...")
        try:
            # Click first doc card / row to open preview
            doc_item = page.locator(".group, tr, div[role='button']").filter(has_text="ADUROBIOTECH").first
            if not doc_item.is_visible():
                doc_item = page.locator("table tbody tr").first
            if doc_item.is_visible():
                doc_item.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "10_document_preview_modal.png"))
                # Close preview
                page.keyboard.press("Escape")
                time.sleep(0.5)
        except Exception as e:
            print("  Warning on doc preview modal:", e)

        # 11. Knowledge View (Neo4j Graph Editor)
        print("[11/22] Capturing Knowledge Graph & HITL Editor...")
        navigate_to("knowledge")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_knowledge_graph_view.png"))

        # 12. Knowledge Explorer
        print("[12/22] Capturing Knowledge Explorer...")
        navigate_to("explorer")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "12_knowledge_explorer.png"))

        # 13. SOP View
        print("[13/22] Capturing SOP Wiki View...")
        navigate_to("sop")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "13_sop_wiki.png"))

        # 14. SOP Composer
        print("[14/22] Capturing SOP Composer...")
        navigate_to("sop_composer")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "14_sop_composer.png"))

        # 15. Reports View (Executive Decision Reports)
        print("[15/22] Capturing Reports View...")
        navigate_to("reports")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "15_executive_reports.png"))

        # 16. Department Shift Report
        print("[16/22] Capturing Department Shift Report...")
        navigate_to("department_report")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "16_department_shift_report.png"))

        # 17. Connectors View
        print("[17/22] Capturing Connectors View...")
        navigate_to("connectors")
        try:
            ws_tab = page.locator("button:has-text('Quản lý máy trạm')").first
            if ws_tab.is_visible():
                ws_tab.click()
                time.sleep(1.2)
        except Exception:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "17_data_connectors.png"))

        # 18. Admin View - Tab Users
        print("[18/22] Capturing Admin View (Users Tab)...")
        navigate_to("admin")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "18_admin_users_panel.png"))

        # 19. Admin View - Tab RBAC Matrix
        print("[19/22] Capturing Admin View (RBAC Matrix Tab)...")
        try:
            rbac_tab = page.locator("button:has-text('Phân quyền'), button:has-text('RBAC')").first
            if rbac_tab.is_visible():
                rbac_tab.click()
                time.sleep(1.0)
        except Exception:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "19_admin_rbac_matrix.png"))

        # 20. Admin View - Tab Audit Logs
        print("[20/22] Capturing Admin View (Audit Logs Tab)...")
        try:
            audit_tab = page.locator("button:has-text('Nhật ký'), button:has-text('Audit')").first
            if audit_tab.is_visible():
                audit_tab.click()
                time.sleep(1.0)
        except Exception:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "20_admin_audit_logs.png"))

        # 21. User Profile Modal
        print("[21/22] Capturing User Profile Modal...")
        try:
            # Click Topbar User info / Avatar
            avatar = page.locator("header, nav").locator("button, div[style*='cursor: pointer']").filter(has_text="Trần Thị").first
            if not avatar.is_visible():
                avatar = page.locator("text=Trần Thị").first
            if avatar.is_visible():
                avatar.click()
                time.sleep(1.0)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "21_user_profile_modal.png"))
                page.keyboard.press("Escape")
                time.sleep(0.5)
        except Exception as e:
            print("  Warning on profile modal:", e)

        # 22. Dark Mode Risk View
        print("[22/22] Capturing Dark Mode Theme...")
        navigate_to("risk")
        page.evaluate("""() => {
            localStorage.setItem('aegis_theme', 'dark');
            document.documentElement.classList.add('dark');
        }""")
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "22_dark_mode_risk_view.png"))

        browser.close()
        print("[+] All screenshots captured successfully!")

if __name__ == "__main__":
    run()
