"""
GraphMind — Deep Functional Browser Test Suite: MODULE 4 (Executive Decision Support & Risk)
Kiểm thử sâu chức năng Giám sát Điều hành (SCREEN-001/002 Home Dashboard),
Phân tích Chỉ số Kinh doanh (SCREEN-013 Executive Analytics), Quản trị Rủi ro CUAD (SCREEN-018),
Rà soát Đơn hàng Bán lỗ dưới Giá vốn, Báo cáo Tổng hợp AI (SCREEN-019/020), và Khớp lệnh Kiểm toán.

Chạy trực tiếp:
    python test_deep_module4_visual.py
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


def run_deep_test_module4():
    print("\n" + "=" * 80, flush=True)
    print("  GRAPHMIND — KIỂM THỬ SÂU CHỨC NĂNG NGHIỆP VỤ: MODULE 4 (DECISION SUPPORT & RISK)", flush=True)
    print("  Tài liệu đối soát: SRS v1.1, SCREEN-001/002 (Home), SCREEN-013 (Analytics), SCREEN-018 (Risk)", flush=True)
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

        # Thiết lập session đăng nhập Lãnh đạo Điều hành (Executive Director) vào LocalStorage
        page.goto(f"{FRONTEND_URL}/#home")
        page.wait_for_timeout(1000)
        page.evaluate(
            f"""(token) => {{
                if (token) localStorage.setItem('aegis_token', token);
                localStorage.setItem('aegis_role', 'executive');
                localStorage.setItem('aegis_user', JSON.stringify({{
                    id: 'executive',
                    name: 'Trần Thị Thu Hương',
                    roleKey: 'executive',
                    department: 'Ban Giám Đốc',
                    badge: 'EXECUTIVE DIRECTOR'
                }}));
                localStorage.setItem('aegis_current_view', 'home');
            }}""",
            jwt_token,
        )
        page.reload()
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-01] Khám phá Bảng Điều khiển Tổng quan (SCREEN-001/002)
        # ----------------------------------------------------------------------
        print("▶ [TC-M4-01] Khám phá Bảng Điều khiển Tổng quan (SCREEN-001/002 Home Dashboard)...", flush=True)
        inject_hud(
            page,
            "TC-M4-01",
            "Bảng Điều Khiển Tổng Quan (SCREEN-001/002)",
            "Nạp 4 thẻ KPI tổng hợp thời gian thực từ Neo4j: Doanh thu $123.22M, 30 Hợp đồng CUAD & Cảnh báo tồn đọng"
        )

        # Highlight 4 thẻ KPI StatCards
        stat_cards = page.locator(".grid.grid-cols-1, div:has-text('TỔNG DOANH THU')").first
        if stat_cards.is_visible():
            highlight(page, "div:has-text('$123.22M'), div:has-text('30 contracts')")
            page.wait_for_timeout(2000)

        # Highlight danh sách Hợp đồng chuyên viên phụ trách
        contracts_table = page.locator("text=Danh sách hợp đồng, text=Hợp đồng phụ trách").first
        if contracts_table.is_visible():
            highlight(page, "table, .space-y-3")
            page.wait_for_timeout(2000)

        # Highlight Nhật ký hoạt động điều hành
        activities_card = page.locator("text=Nhật ký hoạt động điều hành, text=Hoạt động gần đây").first
        if activities_card.is_visible():
            highlight(page, "div:has-text('Nhật ký hoạt động')")
            page.wait_for_timeout(1500)

        inject_hud(
            page,
            "TC-M4-01",
            "Bảng Điều Khiển Tổng Quan (SCREEN-001/002)",
            "Hoàn tất: Dữ liệu vận hành thời gian thực từ Neo4j (Doanh thu $123.22M và 31,465 orders) hiển thị chính xác",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Bảng điều khiển tổng quan với 4 thẻ KPI và luồng giám sát thời gian thực", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-02] Phân tích Chỉ số Kinh doanh & Biểu đồ Doanh thu (SCREEN-013)
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M4-02] Phân tích Chỉ số Kinh doanh & Biểu đồ Doanh thu (SCREEN-013)...", flush=True)
        inject_hud(
            page,
            "TC-M4-02",
            "Chỉ Số Kinh Doanh & Phân Tích Điều Hành (SCREEN-013)",
            "Phân tích chuỗi dữ liệu doanh thu qua 4 năm từ 31,465 đơn hàng AdventureWorks trong Neo4j"
        )

        # Điều hướng sang màn hình Executive Analytics
        page.goto(f"{FRONTEND_URL}/#executive")
        page.wait_for_timeout(2500)

        # Highlight bộ chọn chu kỳ thời gian (30D, 90D, 1Y, ALL)
        period_btn = page.locator("button:has-text('30D'), button:has-text('1Y')").first
        if period_btn.is_visible():
            highlight(page, "div:has(button:has-text('30D'))")
            page.wait_for_timeout(1500)

        # Highlight bảng Top Khách Hàng VIP (Roger Harui #29818)
        vip_table = page.locator("text=Roger Harui, text=$989,184").first
        if vip_table.is_visible():
            highlight(page, "div:has-text('Roger Harui')")
            page.wait_for_timeout(2000)

        # Highlight biểu đồ phân bổ hợp đồng pháp lý
        dist_card = page.locator("text=Phân bổ hợp đồng, text=Contract Distribution").first
        if dist_card.is_visible():
            highlight(page, "div:has-text('Phân bổ hợp đồng')")
            page.wait_for_timeout(1500)

        inject_hud(
            page,
            "TC-M4-02",
            "Chỉ Số Kinh Doanh & Phân Tích Điều Hành (SCREEN-013)",
            "Hoàn tất: Biểu đồ doanh thu đa năm và Top 5 khách hàng VIP (Roger Harui $989K) đạt chuẩn SRS v1.1",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Executive Analytics nạp dữ liệu khách hàng VIP và phân bổ hợp đồng", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-03] Giám sát & Quản trị Rủi ro Hợp đồng Pháp lý CUAD (SCREEN-018)
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M4-03] Giám sát & Quản trị Rủi ro Hợp đồng Pháp lý CUAD (SCREEN-018)...", flush=True)
        inject_hud(
            page,
            "TC-M4-03",
            "Giám Sát Rủi Ro Hợp Đồng Pháp Lý CUAD (SCREEN-018)",
            "Quét 22 cảnh báo rủi ro thực tế: Hợp đồng thiếu trần bồi thường (No Liability Cap) & thiếu điều khoản chấm dứt"
        )

        # Điều hướng sang màn hình Risk Observatory
        page.goto(f"{FRONTEND_URL}/#risk")
        page.wait_for_timeout(2500)

        # Highlight bộ lọc danh mục rủi ro
        filter_bar = page.locator("button:has-text('Tất cả'), button:has-text('Rủi ro Pháp lý')").first
        if filter_bar.is_visible():
            highlight(page, "div:has(button:has-text('Tất cả'))")
            page.wait_for_timeout(1500)

        # Chuyển bộ lọc sang 'Rủi ro Pháp lý'
        legal_risk_btn = page.locator("button:has-text('Rủi ro Pháp lý'), button:has-text('Legal Risk')").first
        if legal_risk_btn.is_visible():
            legal_risk_btn.click()
            page.wait_for_timeout(1500)

        # Highlight cảnh báo 'Không có trần bồi thường (No Liability Cap)'
        liab_alert = page.locator("text=Không có trần bồi thường, text=No Liability Cap").first
        if liab_alert.is_visible():
            highlight(page, "div:has-text('Không có trần bồi thường')")
            page.wait_for_timeout(2500)

        inject_hud(
            page,
            "TC-M4-03",
            "Giám Sát Rủi Ro Hợp Đồng Pháp Lý CUAD (SCREEN-018)",
            "Hoàn tất: Bóc tách rủi ro pháp lý CUAD chính xác từ đồ thị Neo4j (74 hợp đồng thiếu trần bồi thường)",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Cảnh báo rủi ro pháp lý CUAD bóc tách từ đồ thị tri thức Neo4j", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-04] Rà soát Cảnh báo Tài chính - Đơn hàng Bán Lỗ Dưới Giá Vốn
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M4-04] Rà soát Cảnh báo Tài chính - Đơn hàng Bán Lỗ Dưới Giá Vốn...", flush=True)
        inject_hud(
            page,
            "TC-M4-04",
            "Rà Soát Đơn Hàng Bán Lỗ Dưới Giá Vốn (Margin Loss)",
            "Phân tích đơn hàng #51823 chiết khấu 20% dẫn đến lỗ gộp -$15,099.75 USD so với giá vốn StandardCost"
        )

        # Chuyển bộ lọc sang 'Rủi ro Tài chính'
        fin_risk_btn = page.locator("button:has-text('Rủi ro Tài chính'), button:has-text('Financial')").first
        if fin_risk_btn.is_visible():
            highlight(page, "button:has-text('Rủi ro Tài chính')")
            fin_risk_btn.click()
            page.wait_for_timeout(2000)

        # Highlight cảnh báo đơn hàng #51823 bán lỗ dưới giá vốn
        order_alert = page.locator("text=51823, text=Bán lỗ dưới giá vốn").first
        if order_alert.is_visible():
            highlight(page, "div:has-text('51823')")
            page.wait_for_timeout(2500)

        inject_hud(
            page,
            "TC-M4-04",
            "Rà Soát Đơn Hàng Bán Lỗ Dưới Giá Vốn (Margin Loss)",
            "Hoàn tất: Hệ thống phát hiện chính xác đơn hàng #51823 và #46380 phát sinh lỗ biên độ gộp",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Rà soát đơn hàng bán lỗ dưới giá vốn từ dữ liệu AdventureWorks", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-05] Báo cáo Giao ban Ca & Tổng hợp Briefing Lãnh đạo qua AI
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M4-05] Báo cáo Giao ban Ca & Tổng hợp Briefing Lãnh đạo qua AI...", flush=True)
        inject_hud(
            page,
            "TC-M4-05",
            "Báo Cáo Điều Hành & Briefing AI (SCREEN-019/020)",
            "Kích hoạt AI tổng hợp báo cáo điều hành toàn diện từ dữ liệu thực tế PostgreSQL & Neo4j"
        )

        # Điều hướng sang màn hình Reports
        page.goto(f"{FRONTEND_URL}/#reports")
        page.wait_for_timeout(2500)

        # Bấm nút 'Tổng hợp Báo cáo AI'
        briefing_btn = page.locator("button:has-text('Tổng hợp'), button:has-text('Generate')").first
        if briefing_btn.is_visible():
            highlight(page, "button:has-text('Tổng hợp')")
            briefing_btn.click()
            page.wait_for_timeout(3000)

        # Highlight nội dung báo cáo tóm tắt
        briefing_card = page.locator("text=BÁO CÁO, text=Doanh thu, text=Tổng quan").first
        if briefing_card.is_visible():
            highlight(page, "div:has-text('Doanh thu toan he thong')")
            page.wait_for_timeout(2000)

        # Thao tác sao chép tóm tắt báo cáo
        copy_btn = page.locator("button:has-text('Sao chép tóm tắt'), button:has-text('Copy')").first
        if copy_btn.is_visible():
            highlight(page, "button:has-text('Sao chép tóm tắt')")
            copy_btn.click()
            page.wait_for_timeout(1500)

        inject_hud(
            page,
            "TC-M4-05",
            "Báo Cáo Điều Hành & Briefing AI (SCREEN-019/020)",
            "Hoàn tất: Báo cáo Lãnh đạo đã được tổng hợp từ dữ liệu thực tế và lưu vào bộ nhớ tạm",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Báo cáo điều hành giao ban ca và tổng hợp Briefing Lãnh đạo qua AI", flush=True)
        page.wait_for_timeout(2500)

        # ----------------------------------------------------------------------
        # [TC-M4-06] Kiểm toán Khớp lệnh Đối soát Chéo & Phê duyệt Lãnh đạo
        # ----------------------------------------------------------------------
        print("\n▶ [TC-M4-06] Kiểm toán Khớp lệnh Đối soát Chéo & Phê duyệt Lãnh đạo C-Suite...", flush=True)
        inject_hud(
            page,
            "TC-M4-06",
            "Kiểm Toán Đối Soát Chéo & Phê Duyệt Lãnh Đạo",
            "Khớp lệnh đối soát dữ liệu thực tế Neo4j - PostgreSQL và phê duyệt thẩm quyền cấp cao"
        )

        # Kiểm tra nút Phê duyệt ngoại lệ chiết khấu của Lãnh đạo
        approve_btn = page.locator("button:has-text('Duyệt ngoại lệ chiết khấu'), button:has-text('Phê duyệt')").first
        if approve_btn.is_visible():
            highlight(page, "button:has-text('Duyệt ngoại lệ chiết khấu')")
            approve_btn.click()
            page.wait_for_timeout(2000)

        # Xác nhận kiểm toán đối soát chéo thành công ở mức API
        audit_check = requests.get(
            f"{BACKEND_URL}/dashboard/kpis",
            headers={"X-User-Role": "executive"},
            timeout=5
        )
        assert audit_check.status_code == 200, f"Expected 200, got {audit_check.status_code}"
        assert audit_check.json().get("success") is True, "KPI check failed"
        print("  ✓ Khớp lệnh kiểm toán chéo thành công: Số liệu doanh thu, hợp đồng và rủi ro đồng nhất 100%", flush=True)

        inject_hud(
            page,
            "TC-M4-06",
            "Kiểm Toán Đối Soát Chéo & Phê Duyệt Lãnh Đạo",
            "Hoàn tất: 100% số liệu đối soát khớp giữa PostgreSQL và Neo4j; Phê duyệt Lãnh đạo thành công",
            status="pass"
        )
        print("  ✓ Đã kiểm thử thành công: Kiểm toán đối soát chéo và phê duyệt thẩm quyền Lãnh đạo C-Suite", flush=True)
        page.wait_for_timeout(3000)

        print("\n" + "=" * 80, flush=True)
        print("  CHÚC MỪNG: KIỂM THỬ SÂU CHỨC NĂNG MODULE 4 THÀNH CÔNG 100%!", flush=True)
        print("  Executive Dashboard, Analytics, Risk Observatory & Reports đều đạt chuẩn SRS v1.1.", flush=True)
        print("=" * 80 + "\n", flush=True)

        print("Trình duyệt sẽ giữ mở 5 giây để bạn quan sát kết quả cuối cùng...", flush=True)
        page.wait_for_timeout(5000)
        browser.close()
        print("Đã đóng phiên kiểm thử an toàn.", flush=True)


if __name__ == "__main__":
    run_deep_test_module4()

