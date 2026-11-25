"""
Generate GraphMind Sprint 3 Test Case Excel Workbooks (EN & VI):
  - 9. TEST CASE/C1SE18_TestCase_Sprint3_ver1.0.xlsx
  - 9. TEST CASE/C1SE18_TestCase_Sprint3_ver1.0_VI.xlsx
Reuses shared sheet/style helpers from tests/sprint2/generate_sprint2_testcase_excel.py (Ponytail).
"""
import sys
from datetime import date
from pathlib import Path
import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "tests" / "sprint2"))
import generate_sprint2_testcase_excel as s2  # reuse styles & _build_module_sheet

s2.TEST_DATE = date(2026, 11, 10)


def _build_s3(vi: bool):
    wb = openpyxl.Workbook()
    rep_name = "Bao cao kiem thu" if vi else "Test report"
    ov_name = "Tong quan" if vi else "Overview"
    ov_ref = f"'{ov_name}'" if " " in ov_name else ov_name
    P, F = ("Đạt", "Không đạt") if vi else ("Pass", "Fail")

    # ── Sheet 1: Test report ─────────────────────────────────────────────────
    ws = wb.active
    ws.title = rep_name
    for col, w in {"A": 22, "B": 14, "C": 10, "D": 12, "E": 11, "F": 12, "G": 11, "H": 10, "I": 11, "J": 11}.items():
        ws.column_dimensions[col].width = w
    ws.merge_cells("D3:I3")
    ws["D3"] = "BÁO CÁO KẾT QUẢ KIỂM THỬ — SPRINT 3" if vi else "TEST REPORT — SPRINT 3"
    ws["D3"].font, ws["D3"].alignment = s2.FONT_TITLE, s2.ALIGN_CENTER

    hdrs = ["STT", "Sprint", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"] if vi else ["No.", "Sprint", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    for idx, h in enumerate(hdrs, 3):
        c = ws.cell(6, idx, h)
        c.font, c.fill, c.border, c.alignment = s2.FONT_HEADER, s2.FILL_HEADER, s2.BORDER_ALL, s2.ALIGN_CENTER

    # Historical Sprint 1 (35/1), Sprint 2 (30/1), dynamic Sprint 3, Sprint 4 (0)
    for r_i, s_no, p_val, f_val in [(7, 1, 35, 1), (8, 2, 30, 1), (9, 3, f"={ov_ref}!E37", f"={ov_ref}!F37"), (10, 4, 0, 0)]:
        ws.cell(r_i, 3, s_no); ws.cell(r_i, 4, f"Sprint {s_no}")
        ws.cell(r_i, 5, p_val); ws.cell(r_i, 6, f_val)
        for c_i in (7, 8, 9): ws.cell(r_i, c_i, f"={ov_ref}!{'GHI'[c_i-7]}37" if s_no == 3 else 0)
        ws.cell(r_i, 10, f"=SUM(E{r_i}:I{r_i})")

    ws.merge_cells("C11:D11")
    ws.cell(11, 3, "Tổng cộng" if vi else "Total")
    for c_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws.cell(11, c_i, f"=SUM({col_l}7:{col_l}10)")
    ws.cell(11, 10, "=SUM(E11:I11)")
    s2._style_range(ws, 7, 3, 10, 10, font=s2.FONT_BODY, alignment=s2.ALIGN_CENTER)
    s2._style_range(ws, 11, 3, 11, 10, font=s2.FONT_BOLD, fill=s2.FILL_HEADER, alignment=s2.ALIGN_CENTER)
    for r in range(7, 12):
        for c in range(5, 11): ws.cell(r, c).number_format = "#,##0"

    bar = BarChart()
    bar.title = "Kết quả kiểm thử Sprint 1–4" if vi else "Sprint 1–4 Test Execution Results"
    bar.style, bar.width, bar.height = 10, 14, 8
    bar.add_data(Reference(ws, min_col=5, min_row=6, max_col=6, max_row=10), titles_from_data=True)
    bar.set_categories(Reference(ws, min_col=4, min_row=7, max_row=10))
    ws.add_chart(bar, "B13")

    pie = PieChart()
    pie.title = "Tỷ lệ Đạt / Không đạt (Sprint 3)" if vi else "Sprint 3 Pass vs Fail"
    pie.width, pie.height = 11, 8
    pie.add_data(Reference(ws, min_col=5, min_row=9, max_col=6, max_row=9), from_rows=True)
    pie.set_categories(Reference(ws, min_col=5, min_row=6, max_col=6, max_row=6))
    ws.add_chart(pie, "G13")

    for rng in ["B31:F31", "B32:F32", "B33:F33", "G31:H31", "G32:H32", "G33:H33"]:
        ws.merge_cells(rng)
    ws["A31"], ws["B31"] = ("Tên dự án" if vi else "Project Name"), ("GraphMind: Nền tảng Quản trị Tri thức Doanh nghiệp GraphRAG cho SME" if vi else "GraphMind: GraphRAG-based Enterprise Knowledge Management Platform for SME")
    ws["A32"], ws["B32"] = ("Đơn vị thiết kế" if vi else "Test Design By"), "C1SE18 (pytest, httpx, Playwright, Locust, DeepEval, GitHub Actions)"
    ws["A33"], ws["B33"] = ("Người phê duyệt" if vi else "Reviewer / Approver"), ("TS. Trần Kim Sanh" if vi else "PhD. Sanh, Tran Kim")
    ws["G31"], ws["I31"] = ("Độ phủ kiểm thử" if vi else "Test Coverage"), "=IF(J11>0,(E11+F11)/J11,0)"
    ws["G32"], ws["I32"] = ("Tỷ lệ đạt yêu cầu" if vi else "Test Successful Coverage"), "=IF(J11>0,E11/J11,0)"
    ws["G33"], ws["I33"] = ("Phiên bản" if vi else "Version"), ("v1.0 (VI)" if vi else "v1.0")
    s2._style_range(ws, 31, 1, 33, 9, font=s2.FONT_BODY, alignment=s2.ALIGN_LEFT)
    for r in (31, 32, 33):
        ws.cell(r, 1).font = ws.cell(r, 7).font = ws.cell(r, 9).font = s2.FONT_BOLD
        ws.cell(r, 9).alignment = s2.ALIGN_CENTER
    ws["I31"].number_format = ws["I32"].number_format = "0.00%"

    # ── Sheet 2: Overview ────────────────────────────────────────────────────
    ov = wb.create_sheet(title=ov_name)
    for col, w in {"A": 8, "B": 24, "C": 32, "D": 36, "E": 14, "F": 12, "G": 11, "H": 10, "I": 10, "J": 11}.items():
        ov.column_dimensions[col].width = w
    ov["A1"] = "Kiểm thử Sprint 3" if vi else "Test Sprint 3"
    ov["A1"].font = s2.FONT_H2
    ov.merge_cells("B3:E3"); ov["B3"] = "THÔNG TIN DỰ ÁN" if vi else "PROJECT INFORMATION"
    ov["B3"].font, ov["B3"].fill = s2.FONT_HEADER, s2.FILL_HEADER

    for r_i, k, v in [
        (4, "Tên viết tắt" if vi else "Project acronym", "GraphMind"),
        (5, "Tên dự án" if vi else "Project Title", "Nền tảng Quản trị Tri thức GraphRAG cho SME" if vi else "GraphRAG-based Enterprise Knowledge Management Platform for SME"),
        (7, "Đơn vị chủ trì" if vi else "Lead Institution", "Trường Quốc tế — Đại học Duy Tân" if vi else "International School, Duy Tan University"),
        (8, "Giảng viên hướng dẫn" if vi else "Project Mentor", "TS. Trần Kim Sanh" if vi else "PhD. Sanh, Tran Kim"),
        (9, "Công cụ Automation" if vi else "Automation Stack", "pytest + httpx + pytest-asyncio + pytest-html, Playwright, Locust (--headless), DeepEval, GitHub Actions"),
        (10, "Phạm vi Sprint 3" if vi else "Sprint 3 Scope", "Hybrid Query Engine, RRF k=60, Cypher Guard, Multi-Facet Search, AEGIS Watchdog, SOP Wiki, Shift Handover & Ollama Fallback"),
    ]:
        ov.merge_cells(start_row=r_i, start_column=3, end_row=r_i, end_column=5)
        ov.cell(r_i, 2, k).font = s2.FONT_BOLD; ov.cell(r_i, 3, v).font = s2.FONT_BODY
    ov.cell(6, 2, "Ngày bắt đầu" if vi else "Start Date").font = s2.FONT_BOLD
    ov.cell(6, 3, date(2026, 10, 20)).number_format = "yyyy-mm-dd"
    ov.cell(6, 4, "Ngày kết thúc" if vi else "End Date").font = s2.FONT_BOLD
    ov.cell(6, 5, date(2026, 11, 10)).number_format = "yyyy-mm-dd"
    s2._style_range(ov, 4, 2, 10, 5, alignment=s2.ALIGN_LEFT)

    ov.merge_cells("B30:J30"); ov["B30"] = "TỔNG HỢP KẾT QUẢ SPRINT 3" if vi else "SPRINT 3 SUMMARY"
    ov["B30"].font, ov["B30"].fill = s2.FONT_HEADER, s2.FILL_HEADER
    sum_hdrs = ["STT", "Phân hệ / Tính năng", None, "Tác nhân", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"] if vi else ["No.", "Feature", None, "Actor", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    for idx, h in enumerate(sum_hdrs, 1):
        c = ov.cell(31, idx)
        if h is not None: c.value = h
        c.font, c.fill, c.border, c.alignment = s2.FONT_HEADER, s2.FILL_HEADER, s2.BORDER_ALL, s2.ALIGN_CENTER
    ov.merge_cells("B31:C31")

    sheets = (
        [
            ("1. Hybrid Query & Cypher Guard", "Ban lãnh đạo / AI Copilot"),
            ("2. Search & AEGIS Watchdog", "Tất cả người dùng / Agent"),
            ("3. SOP, Shift & Approval", "Nhân viên / Quản lý / Admin"),
            ("4. UI Sprint 3 & Tai Locust", "Ban lãnh đạo / QA"),
            ("5. DeepEval Safety & RRF", "Nhóm Nghiên cứu AI"),
        ]
        if vi
        else [
            ("1. Hybrid Query & Cypher Guard", "Executive / AI Copilot"),
            ("2. Search & AEGIS Watchdog", "All Users / AEGIS Agent"),
            ("3. SOP, Shift & Approval", "Staff / Manager / Admin"),
            ("4. Sprint 3 UI & Locust Load", "Executive / QA"),
            ("5. DeepEval Safety & RRF", "AI Research Team"),
        ]
    )
    for idx, (sname, actor) in enumerate(sheets, 1):
        r_i = 31 + idx
        ov.merge_cells(start_row=r_i, start_column=2, end_row=r_i, end_column=3)
        ov.cell(r_i, 1, idx); ov.cell(r_i, 2, sname); ov.cell(r_i, 4, actor)
        ov.cell(r_i, 5, f"='{sname}'!A5"); ov.cell(r_i, 6, f"='{sname}'!B5")
        ov.cell(r_i, 7, 0); ov.cell(r_i, 8, 0); ov.cell(r_i, 9, 0); ov.cell(r_i, 10, f"=SUM(E{r_i}:I{r_i})")
    s2._style_range(ov, 32, 1, 36, 10, font=s2.FONT_BODY, alignment=s2.ALIGN_CENTER)
    for r_i in range(32, 37):
        ov.cell(r_i, 2).alignment = s2.ALIGN_LEFT
        for c_i in range(5, 11): ov.cell(r_i, c_i).number_format = "#,##0"

    ov.merge_cells("B37:D37"); ov.cell(37, 2, "Tổng cộng" if vi else "Total")
    for c_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ov.cell(37, c_i, f"=SUM({col_l}32:{col_l}36)")
    ov.cell(37, 10, "=SUM(E37:I37)")
    s2._style_range(ov, 37, 1, 37, 10, font=s2.FONT_BOLD, fill=s2.FILL_HEADER, alignment=s2.ALIGN_CENTER)
    for c_i in range(5, 11): ov.cell(37, c_i).number_format = "#,##0"

    # ── Sheets 3-7 ───────────────────────────────────────────────────────────
    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[0][0],
        module_code="Module 3 & 6 — Hybrid Query Engine, RRF k=60, Read-Only Cypher Guard & Ollama (PB20..29, PB55, PB75)",
        tester="Huỳnh Ngọc Minh & Trần Việt Anh Vũ" if vi else "Minh, Huynh Ngoc & Vu, Tran Viet Anh",
        precondition="pytest + pytest-asyncio trên context_fusion.py, text_to_cypher.py, rbac.py & llm_client",
        sections=[(
            "Hybrid Retrieval, Cypher Guard & Ollama Fallback (pytest)" if vi else "Hybrid Retrieval, Cypher Guard & Ollama Fallback (pytest)",
            [
                ("S3_HYB_01", "Hợp nhất RRF (k=60) ưu tiên tài liệu xuất hiện ở cả Vector & Graph" if vi else "RRF (k=60) ranks dual-source overlap item #1", "1. Gọi reciprocal_rank_fusion(vec, graph, k=60)" if vi else "1. Call reciprocal_rank_fusion(vec, graph, k=60)", "doc_overlap đứng hạng #1." if vi else "doc_overlap ranked #1.", "Xác minh doc_overlap đứng vị trí đầu tiên." if vi else "Verified doc_overlap ranked #1.", P),
                ("S3_HYB_02", "Read-Only Cypher Guard chặn lệnh ghi/xóa DETACH DELETE (PB75)" if vi else "Read-Only Cypher Guard blocks DETACH DELETE (PB75)", "1. Giả lập sinh Cypher chứa DETACH DELETE\n2. Gọi execute_text_to_cypher()" if vi else "1. Mock mutating Cypher\n2. Call execute_text_to_cypher()", "Ném ValueError 'Security Alert' trước khi chạy Neo4j." if vi else "Raises ValueError 'Security Alert' before Neo4j.", "Đã chặn và ném đúng ValueError Security Alert." if vi else "Blocked mutation with ValueError Security Alert.", P),
                ("S3_HYB_03", "NL2Cypher sinh câu lệnh chỉ đọc MATCH..RETURN hợp lệ" if vi else "NL2Cypher generates read-only MATCH..RETURN query", "1. Gọi generate_cypher_from_query() với câu hỏi doanh thu" if vi else "1. Call generate_cypher_from_query() for revenue query", "Sinh truy vấn MATCH..RETURN, không chứa từ khóa ghi/xóa." if vi else "Generates read-only MATCH..RETURN without mutations.", "Truy vấn sinh ra hợp lệ và chỉ đọc." if vi else "Generated read-only MATCH..RETURN query.", P),
                ("S3_HYB_04", "Che trích dẫn vượt phạm vi phòng ban cho Standard User (PB29 / BR-02)" if vi else "Citation scope redaction masks out-of-scope IT docs (PB29)", "1. Gọi ScopeContext(allowed_resources={'SALES'}).filter_citations()" if vi else "1. Call ScopeContext(allowed_resources={'SALES'}).filter_citations()", "Giữ trích dẫn Sales; che trích dẫn IT bằng '[DỮ LIỆU ĐÃ ẨN]'." if vi else "Keeps Sales citation; masks IT citation with '[DỮ LIỆU ĐÃ ẨN]'.", "Trích dẫn IT đã bị đánh dấu restricted=True và che nội dung." if vi else "IT citation marked restricted=True with '[DỮ LIỆU ĐÃ ẨN]'.", P),
                ("S3_HYB_05", "Cấu hình Ollama nội bộ (:11434) và fallback < 1.0s khi offline (PB55)" if vi else "Ollama local :11434 config & <1.0s offline fallback (PB55)", "1. Kiểm tra base_url chứa 11434\n2. Giả lập offline và đo thời gian fallback" if vi else "1. Verify :11434 base_url\n2. Mock offline is_available() & time response", "Trỏ tới :11434; phản hồi offline < 1.0s." if vi else "Targets :11434; offline check returns False in <1.0s.", "Đạt: trỏ cổng 11434 và fallback < 0.01s." if vi else "Verified :11434 target and <0.01s fallback.", P),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[1][0],
        module_code="Module 5 & 1 — Tìm kiếm đa chiều & AEGIS Local Watchdog (PB52, PB41, PB05)",
        tester="Hà Hoàng Anh & Phan Anh Bảo" if vi else "Anh, Ha Hoang & Bao, Phan Anh",
        precondition="backend/app/main.py & aegis-agent/src/watcher.py",
        sections=[(
            "Multi-Facet Search, HITL Verify & Watchdog Daemon (pytest)" if vi else "Multi-Facet Search, HITL Verify & Watchdog Daemon (pytest)",
            [
                ("S3_SRC_01", "Route /api/search và /api/graph/verify tồn tại trong main.py" if vi else "/api/search and /api/graph/verify routes defined in main.py", "1. Kiểm tra định nghĩa route trong backend/app/main.py" if vi else "1. Inspect backend/app/main.py route definitions", "Đủ cả /api/search và /api/graph/verify." if vi else "Both routes present in main.py.", "Đã xác minh đầy đủ 2 route." if vi else "Confirmed both routes in main.py.", P),
                ("S3_SRC_02", "AEGIS Watchdog daemon biên dịch sạch & xử lý đủ sự kiện tệp (PB05)" if vi else "AEGIS Watchdog compiles & handles file events (PB05)", "1. Biên dịch AST aegis-agent/src/watcher.py\n2. Kiểm tra on_created, on_modified, on_deleted" if vi else "1. Compile watcher.py\n2. Verify on_created/on_modified/on_deleted handlers", "0 lỗi cú pháp, đủ 3 handler sự kiện." if vi else "Zero syntax errors; all 3 event handlers present.", "Biên dịch sạch và đủ cả 3 handler." if vi else "Compiled cleanly with all 3 event handlers.", P),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[2][0],
        module_code="Module 2, 4 & 6 — SOP Wiki, Bàn giao ca & Kích hoạt phê duyệt (PB53, PB68..70)",
        tester="Huỳnh Ngọc Minh & Hà Hoàng Anh" if vi else "Minh, Huynh Ngoc & Anh, Ha Hoang",
        precondition="pytest + httpx AsyncClient trên sop.router, shift_reports.router & document_approval_router.py",
        sections=[(
            "Quy trình Quản trị: SOP Wiki, Bàn giao ca & Phê duyệt tài liệu (pytest + httpx)" if vi else "Governance Workflows: SOP Wiki, Shift Handover & Approval (pytest + httpx)",
            [
                ("S3_GOV_01", "API xuất bản SOP Wiki yêu cầu xác thực/phân quyền (PB53)" if vi else "SOP Wiki publish endpoint enforces auth/RBAC (PB53)", "1. Gửi POST /api/v1/sop/123/publish không kèm JWT" if vi else "1. POST /api/v1/sop/123/publish without JWT", "Từ chối với HTTP 401/403/422." if vi else "Rejected with HTTP 401/403/422.", "Đã chặn truy cập trái phép hợp lệ." if vi else "Blocked unauthorized request as expected.", P),
                ("S3_GOV_02", "API Báo cáo bàn giao ca (/mine, /submit, /review) bảo vệ bằng RBAC (PB69, PB70)" if vi else "Shift Handover APIs enforce auth/RBAC (PB69, PB70)", "1. Kiểm tra route /submit & /review\n2. Gọi GET /api/v1/shift-reports/mine không kèm JWT" if vi else "1. Check /submit & /review routes\n2. GET /api/v1/shift-reports/mine without JWT", "Đủ route và trả về HTTP 401/403." if vi else "Routes present and HTTP 401/403 returned.", "Xác minh đủ route và trả về 401/403." if vi else "Verified routes and 401/403 guard.", P),
                ("S3_GOV_03", "Phê duyệt tài liệu kích hoạt pipeline nạp dữ liệu m1_data_sync (PB68)" if vi else "Document Approval triggers m1_data_sync pipeline (PB68)", "1. Kiểm tra /approve, /reject và gọi pipeline trong document_approval_router.py" if vi else "1. Inspect document_approval_router.py for /approve, /reject, pipeline trigger", "Có đủ /approve, /reject và lời gọi pipeline." if vi else "Contains /approve, /reject, and pipeline trigger.", "Đã xác minh đầy đủ." if vi else "Verified approval trigger wiring.", P),
                ("S3_GOV_04", "Bảng ORM shift_reports được đăng ký trong PostgreSQL Base.metadata" if vi else "shift_reports ORM table registered in Base.metadata", "1. Kiểm tra 'shift_reports' trong Base.metadata.tables" if vi else "1. Assert 'shift_reports' in Base.metadata.tables", "Có bảng shift_reports." if vi else "shift_reports table present.", "Đã xác nhận bảng shift_reports." if vi else "Confirmed shift_reports in metadata.", P),
                ("S3_GOV_05", "[Giới hạn MVP E2E-ISS-09] Lưu trữ bền vững tổng hợp ca vào bảng shift_daily_summaries" if vi else "[Known MVP Limitation E2E-ISS-09] Persist AI daily shift summary to shift_daily_summaries", "1. Kiểm tra bảng shift_daily_summaries trong Base.metadata.tables" if vi else "1. Check shift_daily_summaries table in Base.metadata.tables", "Có bảng shift_daily_summaries lưu lịch sử tổng hợp ca." if vi else "shift_daily_summaries table exists to persist daily summaries.", "Giới hạn MVP (E2E-ISS-09 — [PLANNED] DBD §3.1.4): tổng hợp ca AI chỉ hiển thị trên màn hình, chưa lưu DB." if vi else "Known Limitation E2E-ISS-09 ([PLANNED] DBD §3.1.4): AI shift summary is on-screen only, not persisted.", F),
                ("S3_ARCH_01", "[Giới hạn MVP E2E-ISS-12] Đóng gói Modular Monolith đầy đủ cho m2/m4/m5 backend" if vi else "[Known MVP Limitation E2E-ISS-12] Full modular monolith packaging for m2/m4/m5", "1. Kiểm tra mã nguồn trong backend/app/modules/{m2,m4,m5}" if vi else "1. Check non-empty .py modules in backend/app/modules/{m2,m4,m5}", "Cả 3 thư mục module đều chứa router/service đầy đủ." if vi else "All 3 module folders contain active router/service code.", "Giới hạn MVP (E2E-ISS-12 — refactor sau MVP): thư mục m2/m4/m5 là stub 0 dòng, route đặt trong main.py & api/v1/." if vi else "Known Limitation E2E-ISS-12 (Post-MVP refactor): m2/m4/m5 folders are 0-line stubs; routes live in main.py & api/v1/.", F),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[3][0],
        module_code="Module 2, 4 & 5 — Giao diện Sprint 3 (Playwright) & Kiểm thử tải (Locust --headless)",
        tester="Trần Thị Ngọc Ánh & Phan Anh Bảo" if vi else "Anh, Tran Thi Ngoc & Bao, Phan Anh",
        precondition="Frontend Vite (:5173) với Playwright Chromium + Locust (--headless) trên FastAPI (:5057)",
        sections=[
            (
                "Giao diện E2E Sprint 3 (Playwright / pytest-playwright)" if vi else "Sprint 3 UI E2E (Playwright / pytest-playwright)",
                [
                    ("S3_UI_01", "Trang Tìm kiếm đa chiều (/?view=search) tải không lỗi JS" if vi else "Multi-Facet Search (/?view=search) renders with 0 JS errors", "1. Mở /?view=search trên Chromium\n2. Kiểm tra pageerror" if vi else "1. Open /?view=search in Chromium\n2. Check pageerror", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S3_UI_02", "Trang SOP Wiki (/?view=sop) tải không lỗi JS" if vi else "SOP Wiki (/?view=sop) renders with 0 JS errors", "1. Mở /?view=sop trên Chromium" if vi else "1. Open /?view=sop in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S3_UI_03", "Trang Báo cáo bàn giao ca (/?view=department_report) tải không lỗi JS" if vi else "Department Shift Report (/?view=department_report) renders cleanly", "1. Mở /?view=department_report trên Chromium" if vi else "1. Open /?view=department_report in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S3_UI_04", "Trang Knowledge Explorer / HITL (/?view=explorer) tải không lỗi JS" if vi else "Knowledge Explorer / HITL (/?view=explorer) renders cleanly", "1. Mở /?view=explorer trên Chromium" if vi else "1. Open /?view=explorer in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                ],
            ),
            (
                "Kiểm thử tải Sprint 3 (Locust --headless, 20 VUs, 5 VU/s, 8 giây)" if vi else "Sprint 3 Headless Load Test (Locust --headless, 20 VUs, 5 VU/s, 8s)",
                [
                    ("S3_PERF_01", "Tỷ lệ lỗi 0.00% (< 1% SLA) trên RRF Fusion & Governance Guards" if vi else "0.00% error rate (<1% SLA) on RRF Fusion & Governance Guards", "1. Chạy locust -f tests/sprint3/locustfile_sprint3.py --headless -u 20 -r 5 -t 8s" if vi else "1. Run locust --headless -u 20 -r 5 -t 8s", "Tỷ lệ lỗi < 1%." if vi else "Error rate < 1%.", "0 lỗi (0.00% error rate) toàn bộ lượt chạy Locust." if vi else "0 failures (0.00% error rate) across all requests.", P),
                    ("S3_PERF_02", "Độ trễ p95 API RRF k=60 & Governance < 500ms (NFR-01)" if vi else "RRF k=60 & Governance p95 latency < 500ms (NFR-01)", "1. Kiểm tra cột 95% trong locust_sprint3_stats.csv" if vi else "1. Check 95% percentile in locust_sprint3_stats.csv", "p95 < 500ms." if vi else "p95 < 500ms.", "Đạt xuất sắc: trung bình ~4ms, p95 < 50ms." if vi else "Avg ~4ms, p95 < 50ms (well under 500ms SLA).", P),
                ],
            ),
        ],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[4][0],
        module_code="Module 3 & 6 — Đánh giá an toàn Cypher Injection & RRF k=60 bằng DeepEval (PB28, PB75)",
        tester="Huỳnh Ngọc Minh & Phan Anh Bảo" if vi else "Minh, Huynh Ngoc & Bao, Phan Anh",
        precondition="DeepEval 4.3.4 (LLMTestCase + BaseMetric)",
        sections=[(
            "DeepEval Cypher Injection Shield & RRF Fusion Metrics" if vi else "DeepEval Cypher Injection Shield & RRF Fusion Metrics",
            [
                ("S3_AI_01", "DeepEval xác minh chặn 8/8 payload tấn công Cypher Injection (PB75)" if vi else "DeepEval blocks 8/8 adversarial Cypher mutation payloads (PB75)", "1. Chạy DeepEval _CypherInjectionBlockMetric(1.0) trên 8 mẫu tấn công DELETE/DROP/CREATE/MERGE/SET/REMOVE/CALL" if vi else "1. Run DeepEval _CypherInjectionBlockMetric(1.0) on 8 attack payloads", "Điểm 1.00 (chặn 8/8)." if vi else "Score 1.00 (8/8 blocked).", "DeepEval đạt 1.00: chặn toàn bộ 8/8 mẫu tấn công." if vi else "DeepEval passed: 8/8 mutations blocked (score 1.0).", P),
                ("S3_AI_02", "DeepEval xác minh RRF k=60 xếp hạng #1 cho chứng cứ xuất hiện cả 2 nguồn" if vi else "DeepEval verifies RRF k=60 ranks dual-source evidence #1", "1. Chạy DeepEval _RRFMonotonicityMetric(1.0) trên kết quả reciprocal_rank_fusion()" if vi else "1. Run DeepEval _RRFMonotonicityMetric(1.0) on RRF output", "Điểm 1.00 (doc_overlap hạng #1)." if vi else "Score 1.00 (doc_overlap rank #1).", "DeepEval đạt 1.00." if vi else "DeepEval passed with score 1.00.", P),
            ],
        )],
    )

    out = REPO_ROOT / "9. TEST CASE" / ("C1SE18_TestCase_Sprint3_ver1.0_VI.xlsx" if vi else "C1SE18_TestCase_Sprint3_ver1.0.xlsx")
    wb.save(out)
    print(f"Saved: {out}")


if __name__ == "__main__":
    _build_s3(vi=False)
    _build_s3(vi=True)
