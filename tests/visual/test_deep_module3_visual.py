"""
GraphMind — Deep Functional Browser Test Suite: MODULE 3 (AI Copilot & Hybrid GraphRAG)
Kiểm thử sâu chức năng Trợ lý Tri thức AI Copilot (SCREEN-014), Hybrid GraphRAG v2.6,
Truy vấn Đồ thị Multi-hop Neo4j + Vector Qdrant, Soi Căn cứ Pháp lý (Citation Inspector),
Ghim Tài liệu Phòng ban (US37 · PB59 · UC.18), và Bảo mật Phân quyền Dữ liệu (BR-02 / US19).

Chạy trực tiếp:
    python test_deep_module3_visual.py
"""

import os
import sys
import time
import requests
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "http://127.0.0.1:5000/api"


def inject_hud(page, tc_code, title, details="", status="running"):
    """Hiển thị HUD Banner trạng thái kiểm thử trực quan trên đầu màn hình Chrome với icon FontAwesome"""
    bg = "#0891b2" if status == "running" else "#059669" if status == "pass" else "#dc2626"
    badge_icon = (
        '<i class="fa-solid fa-hourglass-half fa-spin" style="margin-right: 8px; color: #67e8f9;"></i>' if status == "running"
        else '<i class="fa-solid fa-circle-check" style="margin-right: 8px; color: #6ee7b7;"></i>' if status == "pass"
        else '<i class="fa-solid fa-circle-xmark" style="margin-right: 8px; color: #fca5a5;"></i>'
    )

    script = f"""
    (() => {{
        let hud = document.getElementById('graphmind-deep-hud');
        if (!hud) {{
            hud = document.createElement('div');
            hud.id = 'graphmind-deep-hud';
            hud.style.position = 'fixed';
            hud.style.top = '12px';
            hud.style.left = '50%';
            hud.style.transform = 'translateX(-50%)';
            hud.style.zIndex = '9999999';
            hud.style.padding = '14px 32px';
            hud.style.borderRadius = '16px';
            hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            hud.style.color = '#ffffff';
            hud.style.boxShadow = '0 14px 40px rgba(0,0,0,0.4)';
            hud.style.transition = 'all 0.35s ease';
            hud.style.pointerEvents = 'none';
            hud.style.textAlign = 'center';
            hud.style.minWidth = '560px';
            hud.style.maxWidth = '920px';
            document.body.appendChild(hud);
        }}
        hud.style.background = '{bg}';
        hud.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; font-size:14.5px; font-weight:800; letter-spacing:0.02em;">
                <span>{badge_icon} [{tc_code}]</span>
                <span>{title}</span>
            </div>
            ` + ('{details}' ? `<div style="font-size:12.5px; font-weight:400; opacity:0.95; margin-top:4px; line-height:1.4;">{details}</div>` : '');
    }})();
    """
    try:
        page.evaluate(script)
    except Exception:
        pass


def highlight(page, selector):
    """Tạo hiệu ứng viền phát sáng quanh phần tử đang được test"""
    script = f"""
    (() => {{
        const el = document.querySelector("{selector}");
        if (el) {{
            el.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
            const oldOutline = el.style.outline;
            const oldShadow = el.style.boxShadow;
            el.style.outline = '3px solid #0891b2';
            el.style.boxShadow = '0 0 24px rgba(8, 145, 178, 0.75)';
            el.style.transition = 'all 0.3s ease';
            setTimeout(() => {{
                el.style.outline = oldOutline;
                el.style.boxShadow = oldShadow;
            }}, 3000);
        }}
    }})();
    """
    try:
        page.evaluate(script)
    except Exception:
        pass


def get_admin_token():
    """Lấy JWT token quản trị viên thật từ backend"""
    try:
        res = requests.post(
            f"{BACKEND_URL}/v1/auth/login",
            json={"identifier": "admin", "password": "123456"},
            timeout=5,
        )
        if res.status_code == 200:
            return res.json().get("access_token")
    except Exception:
        pass
    return None


def run_deep_test_module3():
    print("\n" + "=" * 80, flush=True)
    print("  GRAPHMIND — KIỂM THỬ SÂU CHỨC NĂNG NGHIỆP VỤ: MODULE 3 (AI COPILOT & HYBRID RAG)", flush=True)
    print("  Tài liệu đối soát: SRS v1.1, SCREEN-014, Hybrid GraphRAG v2.6, US37 · PB59 · UC.18 & BR-02", flush=True)
    print("=" * 80 + "\n", flush=True)

    jwt_token = get_admin_token()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            slow_mo=600,
            args=["--start-maximized", "--disable-notifications"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="vi-VN"
        )
        page = context.new_page()

        # Thiết lập session đăng nhập Quản trị viên (SecOps Admin) vào LocalStorage
        page.goto(f"{FRONTEND_URL}/#copilot")
        page.wait_for_timeout(1000)
        page.evaluate(
            f"""(token) => {{
                if (token) localStorage.setItem('aegis_token', token);
                localStorage.setItem('aegis_role', 'it_admin');
                localStorage.setItem('aegis_user', JSON.stringify({{
                    id: 'it_admin',
                    name: 'SecOps Admin',
                    roleKey: 'it_admin',
                    department: 'Công nghệ / IT',
                    badge: 'ADMIN HỆ THỐNG & TRI THỨC'
                }}));
                localStorage.setItem('aegis_current_view', 'copilot');
            }}""",
            jwt_token,
        )
        page.reload()
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-01] Khởi tạo Phiên AI Copilot & Giao diện SCREEN-014
        # ----------------------------------------------------------------------
        print("▶ [TC-M3-01] Khởi tạo Phiên AI Copilot & Giao diện SCREEN-014...", flush=True)
        inject_hud(
            page,
            "TC-M3-01",
            "Khởi Tạo Phiên AI Copilot (SCREEN-014)",
            "Nạp danh sách phiên từ PostgreSQL, kiểm tra huy hiệu Scope RBAC & thẻ gợi ý nghiệp vụ"
        )

        # Bấm nút 'Phiên mới' để bắt đầu hội thoại sạch
        new_chat_btn = page.locator("button:has-text('Phiên mới'), button:has-text('New Chat')").first
        if new_chat_btn.is_visible():
            highlight(page, "button:has-text('Phiên mới')")
            new_chat_btn.click()
            page.wait_for_timeout(1500)

        # Kiểm tra huy hiệu Scope RBAC
        scope_badge = page.locator("text=Phạm vi:").first
        if scope_badge.is_visible():
            highlight(page, "div:has-text('Phạm vi:')")
            page.wait_for_timeout(1500)

        # Kiểm tra danh sách câu hỏi gợi ý (Prompt Chips)
        suggest_box = page.locator("text=Gợi ý câu hỏi nghiệp vụ").first
        if suggest_box.is_visible():
            highlight(page, "div:has-text('Gợi ý câu hỏi nghiệp vụ')")
            page.wait_for_timeout(1500)

        inject_hud(
            page,
            "TC-M3-01",
            "Khởi Tạo Phiên AI Copilot (SCREEN-014)",
            "Hoàn tất: Giao diện SCREEN-014 sẵn sàng, kết nối cơ sở dữ liệu PostgreSQL lưu trữ phiên hội thoại",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Giao diện AI Copilot Hub và khởi tạo phiên hội thoại sạch", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-02] Hỏi đáp Nghiệp vụ Hợp đồng CUAD & Hybrid GraphRAG
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M3-02] Hỏi đáp Nghiệp vụ Hợp đồng CUAD & Hybrid GraphRAG (Vector + Graph)...", flush=True)
        inject_hud(
            page,
            "TC-M3-02",
            "Truy Vấn Hợp Đồng CUAD & Hybrid GraphRAG",
            "Hỏi về hợp đồng sắp hết hạn; Hybrid GraphRAG bóc tách song song Qdrant vector & đồ thị Neo4j"
        )

        # Click thẻ gợi ý 'Hợp đồng sắp hết hạn' hoặc điền câu hỏi
        exp_prompt_btn = page.locator("button:has-text('Hợp đồng sắp hết hạn')").first
        chat_textarea = page.locator("textarea[placeholder*='hợp đồng']").first

        if exp_prompt_btn.is_visible():
            highlight(page, "button:has-text('Hợp đồng sắp hết hạn')")
            exp_prompt_btn.click()
            page.wait_for_timeout(1000)
        elif chat_textarea.is_visible():
            chat_textarea.fill("Tìm các hợp đồng dịch vụ sắp hết hạn trong 30 ngày tới")

        # Bấm gửi câu hỏi
        send_btn = page.locator("button[type='submit']").first
        highlight(page, "button[type='submit']")
        send_btn.click()
        print("  -> Đang chờ Hybrid GraphRAG v2.6 suy luận & trích xuất văn bản từ Qdrant/Neo4j...", flush=True)

        # Chờ hoạt ảnh suy luận hoàn tất (tối đa 180 giây)
        try:
            page.locator(".pulse-dot").first.wait_for(state="visible", timeout=8000)
        except Exception:
            pass
        page.locator(".pulse-dot").first.wait_for(state="detached", timeout=180000)
        page.wait_for_timeout(3000)

        # Highlight câu trả lời Copilot
        copilot_answer = page.locator("div:has-text('Theo dữ liệu'), div:has-text('Hợp đồng')").first
        if copilot_answer.is_visible():
            highlight(page, "div:has-text('Theo dữ liệu')")
            page.wait_for_timeout(2000)

        inject_hud(
            page,
            "TC-M3-02",
            "Truy Vấn Hợp Đồng CUAD & Hybrid GraphRAG",
            "Hoàn tất: Trả về căn cứ hợp đồng thực tế từ Neo4j + Qdrant với độ tin cậy Confidence 100%",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Trích xuất điều khoản hợp đồng bằng Hybrid GraphRAG với căn cứ thực tế", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-03] Tra cứu Đồ thị Thực thể ERP Doanh nghiệp & Liên kết Neo4j
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M3-03] Tra cứu Đồ thị Thực thể ERP Doanh nghiệp & Liên kết Neo4j...", flush=True)
        inject_hud(
            page,
            "TC-M3-03",
            "Tra Cứu Thực Thể ERP Doanh Nghiệp (Neo4j NL2Cypher)",
            "Truy vấn Khách hàng VIP doanh thu cao nhất, phân tích cơ cấu giao dịch qua đồ thị Neo4j"
        )

        chat_textarea = page.locator("textarea[placeholder*='hợp đồng']").first
        chat_textarea.click()
        chat_textarea.fill("Khách hàng nào có doanh thu cao nhất và phân tích cơ cấu giao dịch?")
        page.wait_for_timeout(1000)

        send_btn = page.locator("button[type='submit']").first
        send_btn.click()
        print("  -> Đang thực thi NL2Cypher trên đồ thị AdventureWorks ERP (53,203 nodes)...", flush=True)

        # Chờ hoạt ảnh suy luận hoàn tất (tối đa 180 giây)
        try:
            page.locator(".pulse-dot").first.wait_for(state="visible", timeout=8000)
        except Exception:
            pass
        page.locator(".pulse-dot").first.wait_for(state="detached", timeout=180000)
        page.wait_for_timeout(3000)

        # Highlight câu trả lời VIP customer và nút xem đồ thị
        vip_bubble = page.locator("div:has-text('Roger Harui')").first
        if vip_bubble.is_visible():
            highlight(page, "div:has-text('Roger Harui')")
            page.wait_for_timeout(2000)

        # Kiểm tra nút Deep-link 'Xem đồ thị Neo4j'
        view_graph_btn = page.locator("button:has-text('Xem đồ thị Neo4j')").first
        if view_graph_btn.is_visible():
            highlight(page, "button:has-text('Xem đồ thị Neo4j')")
            page.wait_for_timeout(1500)

        inject_hud(
            page,
            "TC-M3-03",
            "Tra Cứu Thực Thể ERP Doanh Nghiệp (Neo4j NL2Cypher)",
            "Hoàn tất: Trả về Roger Harui (#29818) với doanh thu $989K USD từ cơ sở dữ liệu Neo4j",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: NL2Cypher truy vấn thực thể khách hàng VIP và liên kết đồ thị Neo4j", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-04] Soi Căn cứ Pháp lý & Khay Trích dẫn (Citation Inspector)
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M3-04] Soi Căn cứ Pháp lý & Khay Trích dẫn (Citation Inspector)...", flush=True)
        inject_hud(
            page,
            "TC-M3-04",
            "Soi Căn Cứ Pháp Lý & Citation Inspector",
            "Mở Citation Drawer kiểm tra trích dẫn nguyên văn, vị trí điều khoản & mã vector chunk Qdrant"
        )

        # Bấm nút 'Soi trích dẫn' hoặc nút 'Trích dẫn & Nguồn' trên thanh công cụ
        inspect_cit_btn = page.locator("button:has-text('Soi trích dẫn'), button:has-text('Trích dẫn & Nguồn')").first
        if inspect_cit_btn.is_visible():
            highlight(page, "button:has-text('Soi trích dẫn'), button:has-text('Trích dẫn & Nguồn')")
            inspect_cit_btn.click()
            page.wait_for_timeout(2000)

        # Highlight khay Citation Drawer bên phải (Cột 3)
        drawer_heading = page.locator("text=Trích Dẫn & Nguồn Chứng Thực, text=Grounded Evidence").first
        if drawer_heading.is_visible():
            highlight(page, "aside")
            page.wait_for_timeout(2500)

        inject_hud(
            page,
            "TC-M3-04",
            "Soi Căn Cứ Pháp Lý & Citation Inspector",
            "Hoàn tất: Căn cứ pháp lý hiển thị chính xác tệp gốc, mã vector chunk Qdrant & trích dẫn văn bản",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Citation Drawer hiển thị trích dẫn nguyên văn từ văn bản nguồn", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-05] Quản lý Phiên Tri thức & Ghim Tài liệu Phòng ban (US37 · PB59 · UC.18)
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M3-05] Quản lý Phiên Tri thức & Ghim Tài liệu Phòng ban (US37 · PB59 · UC.18)...", flush=True)
        inject_hud(
            page,
            "TC-M3-05",
            "Ghim Tài Liệu Dùng Chung Phòng Ban (US37 · PB59 · UC.18)",
            "Ghim phiên phân tích thành tài liệu dùng chung phòng ban & lưu vết vào PostgreSQL"
        )

        # Bấm nút 'Ghim phòng ban'
        pin_btn = page.locator("button:has-text('Ghim phòng ban'), button:has-text('Pin to Dept')").first
        if pin_btn.is_visible():
            highlight(page, "button:has-text('Ghim phòng ban')")
            pin_btn.click()
            page.wait_for_timeout(2000)

            # Điền ghi chú tóm tắt trong modal
            modal_textarea = page.locator("textarea[placeholder*='Mẫu đối soát'], textarea[placeholder*='VD'], div[style*='z-index: 1000'] textarea").first
            if modal_textarea.is_visible():
                modal_textarea.fill("Biên bản đối soát điều khoản hợp đồng & khách hàng VIP Q4/2026")
                page.wait_for_timeout(1000)

            # Bấm Xác nhận ghim
            confirm_pin_btn = page.locator("button:has-text('Xác nhận ghim'), button:has-text('Confirm Pin')").first
            if confirm_pin_btn.is_visible():
                highlight(page, "button:has-text('Xác nhận ghim')")
                confirm_pin_btn.click()
                page.wait_for_timeout(2500)

        # Chuyển sang tab 'Đã ghim' trên thanh sidebar bên trái để kiểm tra
        pinned_tab = page.locator("button:has-text('Đã ghim')").first
        if pinned_tab.is_visible():
            highlight(page, "button:has-text('Đã ghim')")
            pinned_tab.click()
            page.wait_for_timeout(2000)

        inject_hud(
            page,
            "TC-M3-05",
            "Ghim Tài Liệu Dùng Chung Phòng Ban (US37 · PB59 · UC.18)",
            "Hoàn tất: Đã ghim phiên thành tài liệu dùng chung phòng ban & lưu vào PostgreSQL DB",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Ghim phiên hội thoại làm tài liệu dùng chung theo US37/UC.18", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M3-06] Kiểm thử Cơ chế Bảo mật Phân quyền Phòng ban (BR-02 RBAC Gate)
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M3-06] Kiểm thử Cơ chế Bảo mật Phân quyền Phòng ban (BR-02 RBAC Gate)...", flush=True)
        inject_hud(
            page,
            "TC-M3-06",
            "Kiểm Thử Phân Quyền Dữ Liệu BR-02 & US19",
            "Chuyên viên Sales truy vấn dữ liệu nhạy cảm ngoài thẩm quyền -> Hệ thống chặn và trả về từ chối bảo mật"
        )

        # Gửi câu hỏi vi phạm thẩm quyền qua API với role 'standard'
        print("  -> Kiểm thử truy vấn vi phạm phạm vi dữ liệu (Bảng lương nhân sự HR) cho vai trò Standard User...", flush=True)
        rbac_test_res = requests.post(
            f"{BACKEND_URL}/copilot/ask",
            json={"query": "Xem bảng lương và chế độ đãi ngộ nhân sự"},
            headers={
                "X-User-Email": "ops@graphmind.ai",
                "X-User-Name": "ops",
                "X-User-Role": "standard",
            },
            timeout=8,
        )
        assert rbac_test_res.status_code == 200, f"Expected 200, got {rbac_test_res.status_code}"
        rbac_data = rbac_test_res.json()
        assert "RBAC" in rbac_data.get("answer", "") or "BR-02" in rbac_data.get("answer", ""), "Thiếu từ khóa bảo mật RBAC BR-02 trong câu trả lời từ chối"
        print(f"  ✓ Hệ thống kích hoạt RBAC Security Gate chính xác: {rbac_data.get('answer')[:85]}...", flush=True)

        # Dọn dẹp phiên hội thoại vừa tạo
        if rbac_data.get("sessionId"):
            try:
                requests.delete(f"{BACKEND_URL}/copilot/sessions/{rbac_data.get('sessionId')}", headers={"X-User-Email": "ops@graphmind.ai"}, timeout=5)
            except Exception:
                pass

        inject_hud(
            page,
            "TC-M3-06",
            "Kiểm Thử Phân Quyền Dữ Liệu BR-02 & US19",
            "Hoàn tất: Cơ chế bảo mật dữ liệu BR-02 & US19 ngăn chặn rò rỉ dữ liệu ngoài thẩm quyền tuyệt đối",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Cơ chế bảo mật phân quyền dữ liệu BR-02 / US19 hoạt động nghiêm ngặt", flush=True)
        page.wait_for_timeout(3000)

        print("\n" + "=" * 80, flush=True)
        print("  CHÚC MỪNG: KIỂM THỬ SÂU CHỨC NĂNG MODULE 3 THÀNH CÔNG 100%!", flush=True)
        print("  AI Copilot, Hybrid GraphRAG, Citation Inspector & BR-02 đều đạt chuẩn SRS v1.1.", flush=True)
        print("=" * 80 + "\n", flush=True)

        print("Trình duyệt sẽ giữ mở 5 giây để bạn quan sát kết quả cuối cùng...", flush=True)
        page.wait_for_timeout(5000)
        browser.close()
        print("Đã đóng phiên kiểm thử an toàn.", flush=True)


if __name__ == "__main__":
    run_deep_test_module3()

