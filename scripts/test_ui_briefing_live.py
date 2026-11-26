import time
import os
from playwright.sync_api import sync_playwright

def run():
    print("[+] Launching Chromium via Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("[+] Navigating to http://localhost:5173/ ...")
        page.goto("http://localhost:5173/", timeout=20000)

        # Inject Executive session into localStorage
        print("[+] Injecting Executive session...")
        page.evaluate("""() => {
            localStorage.setItem('aegis_token', 'mock_jwt_executive_token');
            localStorage.setItem('aegis_user', JSON.stringify({
                id: 'executive',
                name: 'Trần Thị Thu Hương',
                role: 'executive',
                roleKey: 'EXECUTIVE',
                email: 'huong.tran@graphmind.ai',
                department: 'Ban Giám Đốc',
                avatar: 'TH'
            }));
            localStorage.setItem('aegis_role', 'executive');
            localStorage.setItem('aegis_lang', 'vi');
            localStorage.setItem('aegis_theme', 'light');
        }""")

        # Navigate to reports view
        print("[+] Navigating to http://localhost:5173/#reports ...")
        page.goto("http://localhost:5173/#reports", timeout=20000)
        time.sleep(2.5)

        # 1. Read initial textarea
        textarea = page.locator("textarea").first
        val_before = textarea.input_value() if textarea.is_visible() else "NOT_FOUND"
        print(f"[+] Textarea value BEFORE click ({len(val_before)} chars):")
        print("    " + val_before[:120].replace("\n", " ") + "...")

        # 2. Click button "Cập nhật Báo cáo"
        update_btn = page.locator("button:has-text('Cập nhật Báo cáo')").first
        if not update_btn.is_visible():
            update_btn = page.locator("button:has-text('Cập nhật')").first
        
        print(f"[+] Found button: {update_btn.is_visible()}")
        if update_btn.is_visible():
            print("[+] Clicking 'Cập nhật Báo cáo' button...")
            update_btn.click()
            # Wait for synthesis and response
            time.sleep(3.5)

        # 3. Read textarea after click
        val_after = textarea.input_value() if textarea.is_visible() else "NOT_FOUND"
        print(f"[+] Textarea value AFTER click ({len(val_after)} chars):")
        print("    " + val_after[:180].replace("\n", " ") + "...")

        # 4. Save screenshot
        out_path = os.path.abspath("docs/ui_screenshots/live_briefing_after_click.png")
        page.screenshot(path=out_path)
        print(f"[+] Saved screenshot to: {out_path}")

        browser.close()

if __name__ == "__main__":
    run()
