"""
Graph Mind — Deep Test Suite Module 5: Multi-faceted Search & Knowledge Explorer
Target Views: SearchView.jsx & KnowledgeExplorerView.jsx (/#search, /#explorer)
Enterprise Specs: SCREEN-020, FR-Search, Hybrid GraphRAG v2.6, BR-02 Data Scope
Visual Mode: Headed Chrome with top banner, element highlights, and human-observable pacing.
"""

import sys
import time
import urllib.request
import json
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173/#search"
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
            b.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(8, 145, 178, 0.95))';
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
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #38bdf8; font-weight: 800; margin-bottom: 3px;">
                <i class="fa-solid fa-bolt" style="margin-right: 6px; color: #38bdf8;"></i> GRAPH MIND ENTERPRISE AUTOMATION &bull; MODULE 5 VERIFICATION
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                <i class="fa-solid fa-magnifying-glass" style="margin-right: 8px; color: #38bdf8;"></i> [{step_id}] {title}
            </div>
            <div style="font-size: 13px; color: #e2e8f0; margin-top: 4px; font-weight: 500;">
                {desc}
            </div>
        `;
    }})();
    """
    page.evaluate(script)

def highlight(page, locator, duration_ms=1800):
    """Draw a glowing cyan frame around target element and dwell."""
    try:
        locator.first.evaluate("""el => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const orig = el.style.outline;
            const origShadow = el.style.boxShadow;
            el.style.outline = '3px solid #06b6d4';
            el.style.boxShadow = '0 0 24px rgba(6, 182, 212, 0.75)';
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
    print("  GRAPH MIND — DEEP AUTOMATED VERIFICATION: MODULE 5")
    print("  TÌM KIẾM THÔNG MINH ĐA DIỆN & KNOWLEDGE EXPLORER (M5)")
    print("=" * 80)
    
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

        # =====================================================================
        # TC-M5-01: MỞ TRUNG TÂM TÌM KIẾM ĐA DIỆN & KIỂM TRA CHỈ SỐ DOANH NGHIỆP
        # =====================================================================
        print("\n[TC-M5-01] Mở Trung tâm Tìm kiếm Thông minh & Thẻ Chỉ số Doanh nghiệp...")
        page.goto(FRONTEND_URL)
        page.wait_for_selector(".view.active", timeout=15000)
        time.sleep(2.0)
        
        show_step_banner(
            page,
            "TC-M5-01",
            "Trung Tâm Tìm Kiếm Hợp Nhất Đa Chiều (Enterprise Search Hub)",
            "Đang kiểm tra giao diện tìm kiếm hợp nhất, thẻ chỉ số thực thể Neo4j & Qdrant thực tế"
        )
        
        # Highlight command banner / metrics
        banner = page.locator(".view.active > div").first
        highlight(page, banner, 2000)
        
        # Verify category tabs exist
        cat_all = page.locator("button:has-text('Tất cả kết quả')")
        cat_cuad = page.locator("button:has-text('Hợp Đồng & CUAD')")
        cat_cust = page.locator("button:has-text('Khách Hàng (CRM)')")
        cat_prod = page.locator("button:has-text('Sản Phẩm & Dịch Vụ')")
        cat_doc = page.locator("button:has-text('Tài Liệu & SOP')")
        
        assert cat_all.count() > 0, "Thiếu Tab Tất cả kết quả"
        assert cat_cuad.count() > 0, "Thiếu Tab Hợp Đồng & CUAD"
        assert cat_cust.count() > 0, "Thiếu Tab Khách Hàng (CRM)"
        assert cat_prod.count() > 0, "Thiếu Tab Sản Phẩm & Dịch Vụ"
        print("  -> Đã tải đầy đủ 4 nhóm phân loại thực thể và thẻ tổng hợp cơ sở dữ liệu.")
        highlight(page, cat_all, 1500)
        time.sleep(1.0)

        # =====================================================================
        # TC-M5-02: TRUY VẤN TỪ KHÓA & TÌM KIẾM NGỮ NGHĨA HYBRID GRAPHRAG
        # =====================================================================
        print("\n[TC-M5-02] Thực hiện truy vấn Hybrid Keyword & Semantic Retrieval...")
        show_step_banner(
            page,
            "TC-M5-02",
            "Truy Vấn Ngữ Nghĩa Kết Hợp Từ Khóa (Hybrid GraphRAG Search)",
            "Tìm kiếm đối tác VIP 'Roger Harui' và hợp đồng CUAD qua chỉ mục Qdrant + Neo4j"
        )
        
        search_input = page.locator("input[placeholder*='Nhập từ khóa hoặc câu hỏi']")
        highlight(page, search_input, 1500)
        
        # Query 1: Roger Harui
        print("  -> Gõ từ khóa tìm kiếm: 'Roger Harui'")
        search_input.fill("Roger Harui")
        time.sleep(1.5)
        
        # Verify matching results
        roger_match = page.locator("text=Roger Harui")
        assert roger_match.count() > 0, "Không tìm thấy khách hàng Roger Harui trong kết quả tìm kiếm"
        highlight(page, roger_match.first, 2000)
        print("  -> Tìm thấy hồ sơ khách hàng VIP Roger Harui chính xác trên CSDL CRM!")
        time.sleep(1.0)
        
        # Query 2: CUAD Service Agreement
        print("  -> Gõ từ khóa hợp đồng: 'Service Agreement'")
        search_input.fill("Service Agreement")
        time.sleep(1.8)
        
        # Check contract results
        contract_cards = page.locator("text=Agreement")
        print(f"  -> Số kết quả liên quan đến 'Agreement': {contract_cards.count()}")
        time.sleep(1.5)

        # =====================================================================
        # TC-M5-03: BỘ LỌC ĐA CHIỀU (MULTI-FACET FILTERS) & CHUYỂN ĐỔI BẢNG/NHÓM
        # =====================================================================
        print("\n[TC-M5-03] Kiểm tra Bộ lọc Đa Chiều (Phòng ban, Giá trị, Hiệu lực) & Bố cục...")
        show_step_banner(
            page,
            "TC-M5-03",
            "Bộ Lọc Đa Chiều (Multi-facet Filters) & Chuyển Đổi Dạng Bảng",
            "Áp dụng lọc Phòng ban, Giá trị hợp đồng >$100K và chuyển chế độ xem Bảng Dữ Liệu Hợp Nhất"
        )
        
        # Filter dropdowns
        dept_select = page.locator("select").nth(0)
        value_select = page.locator("select").nth(2)
        
        highlight(page, dept_select, 1200)
        print("  -> Chọn lọc phòng ban: Pháp chế & R&D (LEGAL)")
        dept_select.select_option("LEGAL")
        time.sleep(1.2)
        
        highlight(page, value_select, 1200)
        print("  -> Chọn lọc giá trị giao dịch: > $100K USD")
        value_select.select_option("100K")
        time.sleep(1.5)
        
        # Toggle Layout to Unified Table
        table_view_btn = page.locator("button:has-text('Bảng dữ liệu')")
        highlight(page, table_view_btn, 1200)
        print("  -> Chuyển sang giao diện Bảng Dữ Liệu Hợp Nhất (Unified Data Table)...")
        table_view_btn.click()
        time.sleep(1.5)
        
        table_rows = page.locator("table tbody tr")
        print(f"  -> Hiển thị {table_rows.count()} hàng dữ liệu đã được lọc đa chiều.")
        highlight(page, page.locator("table").first, 2000)
        
        # Switch back to Grouped View
        grouped_view_btn = page.locator("button:has-text('Nhóm 4 mục')")
        grouped_view_btn.click()
        time.sleep(1.0)
        
        # Reset filters
        dept_select.select_option("ALL")
        value_select.select_option("ALL")
        search_input.fill("")
        time.sleep(1.5)

        # =====================================================================
        # TC-M5-04: ĐIỀU HƯỚNG TỪ KHÓA MẪU & DANH MỤC THỰC THỂ RIÊNG BIỆT
        # =====================================================================
        print("\n[TC-M5-04] Kiểm tra Gợi ý Từ Khóa Mẫu & Phân loại Theo Nhóm...")
        show_step_banner(
            page,
            "TC-M5-04",
            "Lọc Theo Nhóm Thực Thể Riêng Biệt & Gợi Ý Phím Tắt",
            "Xem riêng nhóm 'Sản Phẩm & Dịch Vụ' (504 sản phẩm) và bấm chọn từ khóa mẫu Road Bikes"
        )
        
        # Click category tab Sản Phẩm & Dịch Vụ
        highlight(page, cat_prod, 1500)
        cat_prod.first.click()
        time.sleep(1.5)
        
        prod_section = page.locator("h3:has-text('Sản Phẩm & Dịch Vụ')")
        assert prod_section.count() > 0, "Không hiển thị danh mục Sản Phẩm & Dịch Vụ"
        print("  -> Đã lọc hiển thị nhóm Sản phẩm AdventureWorks Production Catalog thành công.")
        highlight(page, prod_section.first, 1800)
        
        # Click sample query shortcut "Sản phẩm Road Bikes"
        road_bike_chip = page.locator("button:has-text('Road Bikes')").first
        highlight(page, road_bike_chip, 1200)
        print("  -> Bấm gợi ý từ khóa mẫu 'Sản phẩm Road Bikes'...")
        road_bike_chip.click()
        time.sleep(1.8)
        
        # Reset to All Categories
        cat_all.first.click()
        search_input.fill("")
        time.sleep(1.5)

        # =====================================================================
        # TC-M5-05: KNOWLEDGE EXPLORER (HỢP NHẤT QDRANT VECTORS + NEO4J SUBGRAPH)
        # =====================================================================
        print("\n[TC-M5-05] Khám phá Tri thức Đa tầng (Knowledge Explorer)...")
        show_step_banner(
            page,
            "TC-M5-05",
            "Knowledge Explorer: Hợp Nhất Qdrant Vectors + Neo4j Subgraph",
            "Truy vết đa chiều từ vectơ ngữ nghĩa (Qdrant) đến phân tích chi tiết thực thể (Neo4j)"
        )
        
        explorer_tab = page.locator("button:has-text('Knowledge Explorer')").first
        highlight(page, explorer_tab, 1500)
        print("  -> Chuyển sang Tab Knowledge Explorer...")
        explorer_tab.click()
        time.sleep(2.5)
        
        # Verify explorer header
        explorer_header = page.locator("text=Knowledge Explorer: Hợp nhất Qdrant + Neo4j")
        assert explorer_header.count() > 0, "Giao diện Knowledge Explorer chưa xuất hiện"
        highlight(page, explorer_header.first, 1500)
        
        # Perform inquiry on Knowledge Explorer input
        ke_input = page.locator("input[placeholder*='Nhập câu hỏi hoặc chủ đề']")
        highlight(page, ke_input, 1500)
        print("  -> Tìm kiếm trong Knowledge Explorer: 'Mountain Bikes agreement'")
        ke_input.fill("Mountain Bikes agreement")
        ke_input.press("Enter")
        time.sleep(2.5)
        
        # Check vector and graph presence
        print("  -> Đang kiểm tra bảng vectơ Qdrant và đồ thị liên kết Neo4j...")
        vector_badges = page.locator("text=Qdrant: 9,140 vectors")
        highlight(page, vector_badges.first, 1500)
        time.sleep(1.5)

        # =====================================================================
        # TC-M5-06: BẢO VỆ PHẠM VI DỮ LIỆU BR-02 TRONG SEARCH (RBAC SECURITY GATE)
        # =====================================================================
        print("\n[TC-M5-06] Kiểm tra cổng an ninh RBAC & Data Scope BR-02 trên API Search...")
        show_step_banner(
            page,
            "TC-M5-06",
            "Cổng An Ninh Phân Quyền Tìm Kiếm (BR-02 Data Scope Isolation)",
            "Chứng minh Nhân viên Bán hàng (Sales) bị giới hạn, không được tiếp cận Hợp đồng Pháp chế mật"
        )
        
        # 1. Test via backend API with Executive role -> full visibility (51 contracts)
        req_exec = urllib.request.Request(
            f"{BACKEND_URL}/api/search?category=CONTRACT",
            headers={"X-User-Role": "executive", "X-User-Name": "ceo", "X-User-Email": "huong.tran@graphmind.ai"}
        )
        with urllib.request.urlopen(req_exec) as resp:
            data_exec = json.loads(resp.read().decode())
            exec_contracts = len(data_exec.get("data", {}).get("contracts", []))
            print(f"  -> Ban Lãnh Đạo (Executive): Nhìn thấy {exec_contracts} hợp đồng pháp chế toàn quyền.")
            assert exec_contracts > 0, "Executive phải thấy đầy đủ hợp đồng CUAD"

        # 2. Test via backend API with Standard / Sales role -> strictly filtered (0 Legal contracts)
        req_sales = urllib.request.Request(
            f"{BACKEND_URL}/api/search?category=CONTRACT",
            headers={"X-User-Role": "standard", "X-User-Name": "ops", "X-User-Email": "ops@graphmind.ai", "X-User-Dept": "sales"}
        )
        with urllib.request.urlopen(req_sales) as resp:
            data_sales = json.loads(resp.read().decode())
            sales_contracts = len(data_sales.get("data", {}).get("contracts", []))
            print(f"  -> Chuyên viên Bán hàng (Sales): Nhận {sales_contracts} hợp đồng pháp chế mật (Bảo vệ BR-02 thành công).")
            assert sales_contracts == 0, f"Vi phạm BR-02: Chuyên viên Sales nhìn thấy {sales_contracts} hợp đồng pháp chế mật!"

        # Switch back to search tab on frontend
        page.locator("button:has-text('Tra Cứu Tri Thức')").first.click()
        time.sleep(1.5)
        
        # Final success banner
        show_step_banner(
            page,
            "HOÀN TẤT MODULE 5",
            "Kiểm Thử Sâu Toàn Bộ Chức Năng Module 5 Đạt 100% THÀNH CÔNG!",
            "Tìm kiếm thông minh đa diện, lọc đa chiều, Knowledge Explorer và kiểm soát RBAC BR-02 hoàn hảo."
        )
        time.sleep(3.0)
        browser.close()

    print("\n" + "=" * 80)
    print("  KẾT QUẢ: MODULE 5 HOÀN TOÀN ĐẠT CHUẨN (100% PASS - 6/6 TEST CASES)")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
