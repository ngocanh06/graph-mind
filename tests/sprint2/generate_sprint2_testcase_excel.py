"""
Generate GraphMind Sprint 2 Test Case Excel Workbooks (English & Vietnamese):
  - 9. TEST CASE/C1SE18_TestCase_Sprint2_ver1.0.xlsx
  - 9. TEST CASE/C1SE18_TestCase_Sprint2_ver1.0_VI.xlsx
Matching the exact template structure, formulas, styling, and charts of:
  9. TEST CASE/C2SE.27_TestCase_Sprint2_ver1.1.xlsx & Sprint 1 workbook.
"""
from datetime import date
from pathlib import Path
import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DATE = date(2026, 10, 20)

FONT_TITLE = Font(name="Times New Roman", size=16, bold=True, color="000000")
FONT_H2 = Font(name="Times New Roman", size=14, bold=True, color="000000")
FONT_HEADER = Font(name="Times New Roman", size=12, bold=True, color="000000")
FONT_BOLD = Font(name="Times New Roman", size=12, bold=True, color="000000")
FONT_SECTION = Font(name="Times New Roman", size=12, bold=True, color="FF9900")
FONT_ID = Font(name="Times New Roman", size=11, bold=True, color="1F1F1F")
FONT_BODY = Font(name="Times New Roman", size=11, bold=False, color="000000")

FILL_HEADER = PatternFill(fill_type="solid", fgColor="9CC2E5")
FILL_SUBHEADER = PatternFill(fill_type="solid", fgColor="D9E1F2")
FILL_SECTION = PatternFill(fill_type="solid", fgColor="FFF2CC")
FILL_WHITE = PatternFill(fill_type="solid", fgColor="FFFFFF")
FILL_PASS = PatternFill(fill_type="solid", fgColor="C6EFCE")
FILL_FAIL = PatternFill(fill_type="solid", fgColor="FFC7CE")

THIN = Side(style="thin", color="808080")
BORDER_ALL = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)


def _style_range(ws, min_r, min_c, max_r, max_c, *, font=None, fill=None, border=BORDER_ALL, alignment=None):
    for r in range(min_r, max_r + 1):
        for c in range(min_c, max_c + 1):
            cell = ws.cell(r, c)
            if font:
                cell.font = font
            if fill:
                cell.fill = fill
            if border:
                cell.border = border
            if alignment:
                cell.alignment = alignment


def _build_module_sheet(wb, *, sheet_name, module_code, tester, precondition, sections, vi=False):
    ws = wb.create_sheet(title=sheet_name)
    for col, w in {"A": 17, "B": 38, "C": 48, "D": 36, "E": 40, "F": 14, "G": 14}.items():
        ws.column_dimensions[col].width = w

    pass_lbl, fail_lbl = ("Đạt", "Không đạt") if vi else ("Pass", "Fail")
    ws["A1"], ws["B1"] = ("Mã phân hệ" if vi else "Module Code"), module_code
    ws["A2"], ws["B2"] = ("Người kiểm thử" if vi else "Tester"), tester
    ws["A3"], ws["B3"] = ("Điều kiện tiên quyết" if vi else "Pre-condition"), precondition
    ws["A4"], ws["B4"], ws["C4"] = pass_lbl, fail_lbl, ("Tổng số kịch bản kiểm thử" if vi else "Number of test case")
    ws["A5"] = f'=COUNTIF(F9:F127,"{pass_lbl}")'
    ws["B5"] = f'=COUNTIF(F9:F127,"{fail_lbl}")'
    ws["C5"] = "=SUM(A5,B5)"

    for rng in ["B1:G1", "B2:G2", "B3:G3", "C4:G4", "C5:G5"]:
        ws.merge_cells(rng)
    _style_range(ws, 1, 1, 5, 7, font=FONT_BODY, fill=FILL_WHITE, alignment=ALIGN_LEFT)
    for r in (1, 2, 3):
        ws.cell(r, 1).font = FONT_BOLD
    for c in (1, 2, 3):
        ws.cell(4, c).font = FONT_BOLD
        ws.cell(4, c).alignment = ALIGN_CENTER
        ws.cell(5, c).font = FONT_BOLD
        ws.cell(5, c).alignment = ALIGN_CENTER
        ws.cell(5, c).number_format = "#,##0"

    headers = (
        ["Mã TC", "Mô tả kịch bản kiểm thử", "Các bước thực hiện", "Kết quả mong đợi", "Kết quả thực tế", "Trạng thái", "Ngày kiểm thử"]
        if vi
        else ["ID", "Test case Description", "Test case Procedure", "Expected Result", "Actual Result", "Result", "Test Date"]
    )
    for idx, h in enumerate(headers, 1):
        c = ws.cell(7, idx, h)
        c.font, c.fill, c.border, c.alignment = FONT_HEADER, FILL_HEADER, BORDER_ALL, ALIGN_CENTER
    ws.row_dimensions[7].height = 26

    r = 8
    for sec_title, cases in sections:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
        ws.cell(r, 1, sec_title)
        _style_range(ws, r, 1, r, 7, font=FONT_SECTION, fill=FILL_SECTION, alignment=ALIGN_LEFT)
        ws.row_dimensions[r].height = 22
        r += 1
        for tc_id, desc, proc, exp, act, res in cases:
            ws.cell(r, 1, tc_id)
            ws.cell(r, 2, desc)
            ws.cell(r, 3, proc)
            ws.cell(r, 4, exp)
            ws.cell(r, 5, act)
            ws.cell(r, 6, res)
            c_date = ws.cell(r, 7, TEST_DATE)
            c_date.number_format = "yyyy-mm-dd"
            _style_range(ws, r, 1, r, 7, font=FONT_BODY, alignment=ALIGN_LEFT)
            ws.cell(r, 1).font = FONT_ID
            ws.cell(r, 1).alignment = ALIGN_CENTER
            ws.cell(r, 6).alignment = ALIGN_CENTER
            ws.cell(r, 6).font = FONT_BOLD
            ws.cell(r, 7).alignment = ALIGN_CENTER
            ws.row_dimensions[r].height = 48
            r += 1

    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=[f'"{pass_lbl}"'], fill=FILL_PASS, font=Font(name="Times New Roman", size=11, bold=True, color="006100")),
    )
    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=[f'"{fail_lbl}"'], fill=FILL_FAIL, font=Font(name="Times New Roman", size=11, bold=True, color="9C0006")),
    )
    ws.freeze_panes = "A8"
    return ws


def _build_workbook(vi: bool):
    wb = openpyxl.Workbook()
    rep_name = "Bao cao kiem thu" if vi else "Test report"
    ov_name = "Tong quan" if vi else "Overview"
    ov_ref = f"'{ov_name}'" if " " in ov_name else ov_name

    # ── Sheet 1: Test report / Bao cao kiem thu ──────────────────────────────
    ws_rep = wb.active
    ws_rep.title = rep_name
    for col, w in {"A": 22, "B": 14, "C": 10, "D": 12, "E": 11, "F": 12, "G": 11, "H": 10, "I": 11, "J": 11}.items():
        ws_rep.column_dimensions[col].width = w

    ws_rep.merge_cells("D3:I3")
    ws_rep["D3"] = "BÁO CÁO KẾT QUẢ KIỂM THỬ — SPRINT 2" if vi else "TEST REPORT — SPRINT 2"
    ws_rep["D3"].font, ws_rep["D3"].alignment = FONT_TITLE, ALIGN_CENTER

    rep_headers = (
        ["STT", "Sprint", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"]
        if vi
        else ["No.", "Sprint", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    )
    for idx, h in enumerate(rep_headers, 3):
        c = ws_rep.cell(6, idx, h)
        c.font, c.fill, c.border, c.alignment = FONT_HEADER, FILL_HEADER, BORDER_ALL, ALIGN_CENTER

    # Sprint 1 historical (35 Pass / 1 Fail), Sprint 2 dynamically linked to Overview!E38:I38
    ws_rep.cell(7, 3, 1); ws_rep.cell(7, 4, "Sprint 1"); ws_rep.cell(7, 5, 35); ws_rep.cell(7, 6, 1)
    for col_i in (7, 8, 9): ws_rep.cell(7, col_i, 0)
    ws_rep.cell(7, 10, "=SUM(E7:I7)")

    ws_rep.cell(8, 3, 2); ws_rep.cell(8, 4, "Sprint 2")
    ws_rep.cell(8, 5, f"={ov_ref}!E38")
    ws_rep.cell(8, 6, f"={ov_ref}!F38")
    ws_rep.cell(8, 7, f"={ov_ref}!G38")
    ws_rep.cell(8, 8, f"={ov_ref}!H38")
    ws_rep.cell(8, 9, f"={ov_ref}!I38")
    ws_rep.cell(8, 10, "=SUM(E8:I8)")

    for s_idx, row_i in [(3, 9), (4, 10)]:
        ws_rep.cell(row_i, 3, s_idx); ws_rep.cell(row_i, 4, f"Sprint {s_idx}")
        for col_i in range(5, 10): ws_rep.cell(row_i, col_i, 0)
        ws_rep.cell(row_i, 10, f"=SUM(E{row_i}:I{row_i})")

    ws_rep.merge_cells("C11:D11")
    ws_rep.cell(11, 3, "Tổng cộng" if vi else "Total")
    for col_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_rep.cell(11, col_i, f"=SUM({col_l}7:{col_l}10)")
    ws_rep.cell(11, 10, "=SUM(E11:I11)")

    _style_range(ws_rep, 7, 3, 10, 10, font=FONT_BODY, alignment=ALIGN_CENTER)
    _style_range(ws_rep, 11, 3, 11, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for r in range(7, 12):
        for c in range(5, 11): ws_rep.cell(r, c).number_format = "#,##0"

    bar = BarChart()
    bar.title = "Kết quả kiểm thử Sprint 1–4" if vi else "Sprint 1–4 Test Execution Results"
    bar.y_axis.title = "Số lượng Test Case" if vi else "Test Cases"
    bar.x_axis.title = "Sprint"
    bar.style = 10
    bar.add_data(Reference(ws_rep, min_col=5, min_row=6, max_col=6, max_row=10), titles_from_data=True)
    bar.set_categories(Reference(ws_rep, min_col=4, min_row=7, max_row=10))
    bar.width, bar.height = 14, 8
    ws_rep.add_chart(bar, "B13")

    pie = PieChart()
    pie.title = "Tỷ lệ Đạt / Không đạt (Sprint 2)" if vi else "Sprint 2 Pass vs Fail"
    pie.add_data(Reference(ws_rep, min_col=5, min_row=8, max_col=6, max_row=8), from_rows=True)
    pie.set_categories(Reference(ws_rep, min_col=5, min_row=6, max_col=6, max_row=6))
    pie.width, pie.height = 11, 8
    ws_rep.add_chart(pie, "G13")

    for rng in ["B31:F31", "B32:F32", "B33:F33", "G31:H31", "G32:H32", "G33:H33"]:
        ws_rep.merge_cells(rng)
    ws_rep["A31"] = "Tên dự án" if vi else "Project Name"
    ws_rep["B31"] = (
        "GraphMind: Nền tảng Quản trị Tri thức Doanh nghiệp dựa trên GraphRAG hỗ trợ ra quyết định cho SME"
        if vi
        else "GraphMind: GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support"
    )
    ws_rep["A32"] = "Đơn vị thiết kế" if vi else "Test Design By"
    ws_rep["B32"] = "Nhóm C1SE18 (pytest, httpx, Playwright, Locust, DeepEval, GitHub Actions)" if vi else "C1SE18 (Automated: pytest, httpx, Playwright, Locust, DeepEval, GitHub Actions)"
    ws_rep["A33"] = "Người phê duyệt" if vi else "Reviewer / Approver"
    ws_rep["B33"] = "TS. Trần Kim Sanh (Giảng viên hướng dẫn Capstone 1)" if vi else "PhD. Sanh, Tran Kim (Capstone Project 1 Mentor)"
    ws_rep["G31"], ws_rep["I31"] = ("Độ phủ kiểm thử" if vi else "Test Coverage"), "=IF(J11>0,(E11+F11)/J11,0)"
    ws_rep["G32"], ws_rep["I32"] = ("Tỷ lệ đạt yêu cầu" if vi else "Test Successful Coverage"), "=IF(J11>0,E11/J11,0)"
    ws_rep["G33"], ws_rep["I33"] = ("Phiên bản" if vi else "Version"), ("v1.0 (VI)" if vi else "v1.0")
    _style_range(ws_rep, 31, 1, 33, 9, font=FONT_BODY, alignment=ALIGN_LEFT)
    for r in (31, 32, 33):
        ws_rep.cell(r, 1).font = FONT_BOLD
        ws_rep.cell(r, 7).font = FONT_BOLD
        ws_rep.cell(r, 9).font = FONT_BOLD
        ws_rep.cell(r, 9).alignment = ALIGN_CENTER
    ws_rep["I31"].number_format = "0.00%"
    ws_rep["I32"].number_format = "0.00%"

    # ── Sheet 2: Overview / Tong quan ────────────────────────────────────────
    ws_ov = wb.create_sheet(title=ov_name)
    for col, w in {"A": 8, "B": 24, "C": 32, "D": 36, "E": 14, "F": 12, "G": 11, "H": 10, "I": 10, "J": 11}.items():
        ws_ov.column_dimensions[col].width = w

    ws_ov["A1"] = "Kiểm thử Sprint 2" if vi else "Test Sprint 2"
    ws_ov["A1"].font = FONT_H2
    ws_ov.merge_cells("B3:E3")
    ws_ov["B3"] = "THÔNG TIN DỰ ÁN" if vi else "PROJECT INFORMATION"
    ws_ov["B3"].font, ws_ov["B3"].fill = FONT_HEADER, FILL_HEADER

    info_rows = [
        (4, "Tên viết tắt" if vi else "Project acronym", "GraphMind"),
        (5, "Tên dự án" if vi else "Project Title", "Nền tảng Quản trị Tri thức Doanh nghiệp dựa trên GraphRAG hỗ trợ ra quyết định cho SME" if vi else "GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support"),
        (7, "Đơn vị chủ trì" if vi else "Lead Institution", "Trường Quốc tế — Đại học Duy Tân" if vi else "International School, Duy Tan University"),
        (8, "Giảng viên hướng dẫn" if vi else "Project Mentor", "TS. Trần Kim Sanh" if vi else "PhD. Sanh, Tran Kim"),
        (9, "Quản lý dự án" if vi else "Project Manager", "Trần Thị Ngọc Ánh (Trưởng nhóm / Scrum Master)" if vi else "Anh, Tran Thi Ngoc (Team Leader / Scrum Master)"),
        (10, "Công cụ Automation" if vi else "Automation Stack", "pytest + httpx + pytest-asyncio + pytest-html, Playwright, Locust (--headless), DeepEval, GitHub Actions + Docker Compose"),
        (11, "Bảng Jira" if vi else "Jira Board", "C1SE18 (Sprint 2: C1SE18-10, 18..24, 26..31, 38..44)"),
        (12, "Phạm vi Sprint 2" if vi else "Sprint 2 Scope", "Kho tri thức & Xem trước, Tải lên & File Watcher, Quản trị & Ma trận RBAC 2D, Email OTP 3 bước, Giao diện Copilot/Graph & Tải Locust, CUAD NER/RE & LoRA Kaggle" if vi else "Knowledge Base & Preview, Staff Upload & File Watcher, User Admin & 2D RBAC Matrix, 3-Step Email OTP, Copilot/Graph UI & Locust Load, CUAD NER/RE & Kaggle LoRA"),
    ]
    for r_i, k, v in info_rows:
        ws_ov.merge_cells(start_row=r_i, start_column=3, end_row=r_i, end_column=5)
        ws_ov.cell(r_i, 2, k).font = FONT_BOLD
        ws_ov.cell(r_i, 3, v).font = FONT_BODY
    ws_ov.cell(6, 2, "Ngày bắt đầu" if vi else "Start Date").font = FONT_BOLD
    ws_ov.cell(6, 3, date(2026, 9, 22)).number_format = "yyyy-mm-dd"
    ws_ov.cell(6, 4, "Ngày kết thúc" if vi else "End Date").font = FONT_BOLD
    ws_ov.cell(6, 5, date(2026, 10, 20)).number_format = "yyyy-mm-dd"
    _style_range(ws_ov, 4, 2, 12, 5, alignment=ALIGN_LEFT)

    tm_headers = ["STT", "Họ và tên", "Vai trò", "Phạm vi kiểm thử Sprint 2"] if vi else ["No.", "Member Name", "Role", "Sprint 2 Test Responsibility"]
    for idx, h in enumerate(tm_headers, 2):
        c = ws_ov.cell(14, idx, h)
        c.font, c.fill, c.border, c.alignment = FONT_HEADER, FILL_SUBHEADER, BORDER_ALL, ALIGN_CENTER
    members = (
        [
            (1, "Trần Thị Ngọc Ánh", "Trưởng nhóm / Scrum Master", "Giao diện AI Copilot Chat UI & Knowledge Graph Viewer (PB15, PB51 / C1SE18-24)"),
            (2, "Huỳnh Ngọc Minh", "Kỹ sư Dữ liệu / AI & Backend", "Kho tri thức (PB50 / C1SE18-20), Ingestion API, CUAD NER/RE, Qdrant 384-dim & LoRA Kaggle (PB08..12, 17..19)"),
            (3, "Hà Hoàng Anh", "Kỹ sư Fullstack", "Tải lên hàng đợi phê duyệt (PB67) & Phiên đăng nhập đơn (PB73)"),
            (4, "Trần Việt Anh Vũ", "Kỹ sư Backend & Hạ tầng", "Quản trị người dùng, Audit Log, Ma trận RBAC 2D (PB02, PB03, PB72 / C1SE18-31) & Email OTP (PB74 / C1SE18-10)"),
            (5, "Phan Anh Bảo", "Kỹ sư Frontend / Trưởng nhóm QA", "File Watcher API (PB49 / C1SE18-30), Playwright UI E2E & Kiểm thử tải Locust Sprint 2 (PB78)"),
        ]
        if vi
        else [
            (1, "Anh, Tran Thi Ngoc", "Team Leader / Scrum Master", "AI Copilot Chat UI & D3-Force Knowledge Graph Viewer (PB15, PB51 / C1SE18-24)"),
            (2, "Minh, Huynh Ngoc", "Data Engineer / AI & Backend", "Knowledge Base Explorer (PB50 / C1SE18-20), Ingestion API, CUAD NER/RE, Qdrant & Kaggle LoRA (PB08..12, 17..19)"),
            (3, "Anh, Ha Hoang", "Fullstack Engineer", "Staff Document Upload Pending Queue (PB67) & Single Active Session (PB73)"),
            (4, "Vu, Tran Viet Anh", "Backend & Infra Developer", "User Admin, Audit Log, 2D RBAC Matrix (PB02, PB03, PB72 / C1SE18-31) & Email OTP (PB74 / C1SE18-10)"),
            (5, "Bao, Phan Anh", "Frontend / QA & Testing Lead", "File Watcher API (PB49 / C1SE18-30), Playwright UI E2E & Sprint 2 Locust Load Suite (PB78)"),
        ]
    )
    for idx, row_data in enumerate(members, 15):
        for c_i, val in enumerate(row_data, 2): ws_ov.cell(idx, c_i, val)
    _style_range(ws_ov, 15, 2, 19, 5, font=FONT_BODY, alignment=ALIGN_LEFT)

    ws_ov.merge_cells("B22:F22")
    ws_ov["B22"] = "LỊCH SỬ CHỈNH SỬA" if vi else "REVISION HISTORY"
    ws_ov["B22"].font, ws_ov["B22"].fill = FONT_HEADER, FILL_HEADER
    for idx, h in enumerate(["Phiên bản", "Ngày", "Nội dung", "Tác giả", "Phê duyệt"] if vi else ["Version", "Date", "Comments", "Author", "Approval"], 2):
        c = ws_ov.cell(23, idx, h)
        c.font, c.fill, c.border, c.alignment = FONT_BOLD, FILL_SUBHEADER, BORDER_ALL, ALIGN_CENTER
    ws_ov.cell(24, 2, "v1.0"); ws_ov.cell(24, 3, TEST_DATE).number_format = "yyyy-mm-dd"
    ws_ov.cell(24, 4, "Bộ Test Case Automation Sprint 2 và kết quả chạy thực tế" if vi else "Initial Sprint 2 Automated Test Case Suite & Execution Results")
    ws_ov.cell(24, 5, "Nhóm QA C1SE18" if vi else "C1SE18 QA Team"); ws_ov.cell(24, 6, "x")
    _style_range(ws_ov, 24, 2, 24, 6, font=FONT_BODY, alignment=ALIGN_CENTER)

    ws_ov.merge_cells("B30:J30")
    ws_ov["B30"] = "TỔNG HỢP KẾT QUẢ THEO PHÂN HỆ" if vi else "SUMMARY"
    ws_ov["B30"].font, ws_ov["B30"].fill = FONT_HEADER, FILL_HEADER
    sum_headers = (
        ["STT", "Phân hệ / Tính năng", None, "Tác nhân", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"]
        if vi
        else ["No.", "Feature", None, "Actor", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    )
    for idx, h in enumerate(sum_headers, 1):
        c = ws_ov.cell(31, idx)
        if h is not None: c.value = h
        c.font, c.fill, c.border, c.alignment = FONT_HEADER, FILL_HEADER, BORDER_ALL, ALIGN_CENTER
    ws_ov.merge_cells("B31:C31")

    sheet_names = (
        [
            ("1. Kho tri thuc & Preview", "Ban lãnh đạo / Nhân viên"),
            ("2. Tai len & File Watcher", "Nhân viên / AEGIS Agent"),
            ("3. Admin & Ma tran RBAC", "Quản trị hệ thống (IT Admin)"),
            ("4. Email OTP & Phien don", "Tất cả người dùng"),
            ("5. UI Copilot-Graph & Tai", "Ban lãnh đạo / Admin"),
            ("6. CUAD KG & LoRA Kaggle", "Nhóm Nghiên cứu AI"),
        ]
        if vi
        else [
            ("1. Knowledge Base & Preview", "Executive / Standard User"),
            ("2. Upload & File Watcher", "Staff / AEGIS Agent"),
            ("3. User Admin & 2D RBAC", "System Admin (it_admin)"),
            ("4. Email OTP & Session", "All Users"),
            ("5. Copilot-Graph UI & Load", "Executive / Admin"),
            ("6. CUAD KG & Kaggle LoRA", "AI Research Team"),
        ]
    )
    for idx, (sname, actor) in enumerate(sheet_names, 1):
        r_i = 31 + idx
        ws_ov.merge_cells(start_row=r_i, start_column=2, end_row=r_i, end_column=3)
        ws_ov.cell(r_i, 1, idx); ws_ov.cell(r_i, 2, sname); ws_ov.cell(r_i, 4, actor)
        ws_ov.cell(r_i, 5, f"='{sname}'!A5"); ws_ov.cell(r_i, 6, f"='{sname}'!B5")
        ws_ov.cell(r_i, 7, 0); ws_ov.cell(r_i, 8, 0); ws_ov.cell(r_i, 9, 0)
        ws_ov.cell(r_i, 10, f"=SUM(E{r_i}:I{r_i})")
    _style_range(ws_ov, 32, 1, 37, 10, font=FONT_BODY, alignment=ALIGN_CENTER)
    for r_i in range(32, 38):
        ws_ov.cell(r_i, 2).alignment = ALIGN_LEFT
        for c_i in range(5, 11): ws_ov.cell(r_i, c_i).number_format = "#,##0"

    ws_ov.merge_cells("B38:D38")
    ws_ov.cell(38, 2, "Tổng cộng" if vi else "Total")
    for c_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_ov.cell(38, c_i, f"=SUM({col_l}32:{col_l}37)")
    ws_ov.cell(38, 10, "=SUM(E38:I38)")
    _style_range(ws_ov, 38, 1, 38, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for c_i in range(5, 11): ws_ov.cell(38, c_i).number_format = "#,##0"

    P, F = ("Đạt", "Không đạt") if vi else ("Pass", "Fail")

    # ── Sheet 3: Knowledge Base & Preview ────────────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[0][0],
        module_code="Module 2 — Kho tri thức & Xem trước tài liệu (PB50 / US40 / C1SE18-20)" if vi else "Module 2 — Knowledge Base Explorer & Visual File Preview (PB50 / US40 / C1SE18-20)",
        tester="Huỳnh Ngọc Minh" if vi else "Minh, Huynh Ngoc",
        precondition="pytest + ScopeContext RBAC + FastAPI Test App Factory",
        sections=[(
            "Phân quyền đọc Kho tri thức & API Xem trước tài liệu (pytest)" if vi else "Knowledge Base Scope & Visual Preview API (pytest)",
            [
                ("S2_KB_01", "Executive có toàn quyền đọc tài liệu các phòng ban (BR-05)" if vi else "Executive role has full department access scope (BR-05)", "1. Khởi tạo ScopeContext vai trò executive (allowed_depts={'*'})\n2. Kiểm tra truy cập legal, it, sales" if vi else "1. Instantiate executive ScopeContext (allowed_depts={'*'})\n2. Check legal, it, sales access", "Trả về True cho cả legal, it và sales." if vi else "Returns True for legal, it, and sales.", "Đã xác minh Executive được phép đọc cả 3 phòng ban." if vi else "Verified is_department_allowed=True for legal, it, and sales.", P),
                ("S2_KB_02", "Standard User (Sales) bị cô lập khỏi tài liệu IT & Legal (BR-02)" if vi else "Standard User (Sales) isolated from Legal/IT docs (BR-02)", "1. Khởi tạo ScopeContext vai trò standard (allowed_depts={'sales'})\n2. Kiểm tra sales, it, legal" if vi else "1. Instantiate standard ScopeContext (allowed_depts={'sales'})\n2. Check sales, it, legal", "sales=True; it=False; legal=False." if vi else "sales=True; it=False; legal=False.", "Đúng phạm vi: chỉ cho phép sales, chặn it và legal." if vi else "Verified sales=True and it/legal=False.", P),
                ("S2_KB_03", "Department/Knowledge Manager bị chặn khỏi tài liệu IT (BR-04)" if vi else "Manager strictly isolated from IT department (BR-04)", "1. Khởi tạo ScopeContext vai trò knowledge_manager (4 phòng nghiệp vụ)\n2. Kiểm tra sales và it" if vi else "1. Instantiate knowledge_manager ScopeContext\n2. Check sales vs it access", "sales=True; it=False." if vi else "sales=True; it=False.", "Manager đọc được sales và bị chặn khỏi phòng it." if vi else "Verified sales=True and it=False.", P),
                ("S2_KB_04", "Giao diện DocumentsView & 3 API detail/raw/download được gắn đầy đủ" if vi else "DocumentsView & detail/raw/download routes wired", "1. Kiểm tra tồn tại DocumentsView.jsx\n2. Kiểm tra route /api/v1/documents/{detail,raw,download}" if vi else "1. Verify DocumentsView.jsx exists\n2. Check /api/v1/documents/{detail,raw,download} routes", "Tồn tại UI và đủ cả 3 endpoint xem trước/tải xuống." if vi else "DocumentsView.jsx and all 3 preview/download routes exist.", "Đã xác minh đầy đủ DocumentsView.jsx và 3 endpoint API." if vi else "Verified DocumentsView.jsx and all 3 FastAPI routes.", P),
            ],
        )],
    )

    # ── Sheet 4: Upload & File Watcher ───────────────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[1][0],
        module_code="Module 1 & 2 — Tải lên hàng đợi phê duyệt & File Watcher API (PB67, PB48, PB49 / C1SE18-30, 38)" if vi else "Module 1 & 2 — Staff Upload Queue & File Watcher API (PB67, PB48, PB49 / C1SE18-30, 38)",
        tester="Hà Hoàng Anh & Phan Anh Bảo" if vi else "Anh, Ha Hoang & Bao, Phan Anh",
        precondition="pytest + httpx AsyncClient + FastAPI Test App Factory",
        sections=[(
            "File Watcher Webhook & Hàng đợi phê duyệt tài liệu (pytest + httpx)" if vi else "File Watcher Webhook & Staff Upload Approval Queue (pytest + httpx)",
            [
                ("S2_SYNC_01", "API trạng thái File Watcher phản hồi HTTP 200" if vi else "File Watcher status API returns HTTP 200", "1. Gửi GET /api/v1/sync/file-watcher/status" if vi else "1. Call GET /api/v1/sync/file-watcher/status", "HTTP 200 kèm JSON trạng thái hoạt động." if vi else "HTTP 200 with JSON operational telemetry.", "Trả về HTTP 200 với payload JSON hợp lệ." if vi else "Returned HTTP 200 with valid JSON dict.", P),
                ("S2_SYNC_02", "File Watcher webhook từ chối Agent API Key không hợp lệ" if vi else "File Watcher webhook rejects invalid Agent API Key", "1. Gửi POST /api/v1/sync/file-watcher kèm Bearer token sai" if vi else "1. POST /api/v1/sync/file-watcher with wrong Bearer key", "Từ chối với mã 401/403/422." if vi else "Rejected with HTTP 401/403/422.", "Đã chặn yêu cầu với mã trạng thái lỗi hợp lệ." if vi else "Request rejected with expected auth/validation error.", P),
                ("S2_SYNC_03", "Quy trình phê duyệt tài liệu định nghĩa đủ 3 trạng thái PENDING/APPROVED/REJECTED" if vi else "Approval router defines PENDING/APPROVED/REJECTED lifecycle", "1. Kiểm tra document_approval_router.py\n2. Xác minh đủ 3 trạng thái vòng đời" if vi else "1. Inspect document_approval_router.py\n2. Verify PENDING, APPROVED, REJECTED states", "Đủ 3 trạng thái PENDING, APPROVED, REJECTED." if vi else "All 3 approval states present.", "Đã xác minh đầy đủ 3 trạng thái trong router phê duyệt." if vi else "Verified PENDING, APPROVED, and REJECTED states.", P),
                ("S2_SYNC_04", "Kiểm tra cột sha256_hash trên bảng knowledge_upload_approvals" if vi else "KnowledgeUploadApproval ORM model includes sha256_hash column", "1. Kiểm tra cột của KnowledgeUploadApproval.__table__" if vi else "1. Inspect KnowledgeUploadApproval.__table__.columns", "Có cột sha256_hash phục vụ chống trùng lặp hàng đợi." if vi else "sha256_hash column present on ORM model.", "Đã xác minh cột sha256_hash tồn tại trên ORM model." if vi else "Confirmed sha256_hash column exists on ORM model.", P),
            ],
        )],
    )

    # ── Sheet 5: User Admin & 2D RBAC ────────────────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[2][0],
        module_code="Module 6 — Quản trị người dùng, Audit Log & Ma trận RBAC 2D (PB02, PB03, PB72 / C1SE18-26..31)" if vi else "Module 6 — User Admin, Audit Log & Dynamic 2D RBAC Matrix (PB02, PB03, PB72 / C1SE18-26..31)",
        tester="Trần Việt Anh Vũ" if vi else "Vu, Tran Viet Anh",
        precondition="pytest + httpx AsyncClient + rbac_matrix_router & rbac_matrix_service",
        sections=[(
            "Chuẩn hóa Role/Phòng ban, Ma trận RBAC 2D & Audit Log bất biến (pytest + httpx)" if vi else "Role/Dept Normalization, 2D RBAC Matrix & Immutable Audit Log (pytest + httpx)",
            [
                ("S2_RBAC_01", "Chuẩn hóa chính xác các mã vai trò hệ thống" if vi else "normalize_role_code() maps all canonical & alias roles", "1. Gọi normalize_role_code cho it_admin, executive, department_manager, knowledge_manager, standard" if vi else "1. Call normalize_role_code for all 5 role inputs", "Ánh xạ về ADMIN, EXECUTIVE, DEPARTMENT_MANAGER, STANDARD_USER." if vi else "Maps to ADMIN, EXECUTIVE, DEPARTMENT_MANAGER, STANDARD_USER.", "Tất cả 5 trường hợp ánh xạ chính xác 100%." if vi else "All 5 role mappings verified accurately.", P),
                ("S2_RBAC_02", "Chuẩn hóa chính xác 5 phòng ban doanh nghiệp song ngữ Việt/Anh" if vi else "normalize_dept_code() maps all 5 enterprise departments", "1. Gọi normalize_dept_code cho Kinh doanh, Pháp chế, Kế toán/Thu mua, IT, R&D" if vi else "1. Call normalize_dept_code for all 5 Vietnamese/English dept names", "Ánh xạ về SALES, LEGAL, ACCOUNTING_PROCUREMENT, IT, RND." if vi else "Maps to SALES, LEGAL, ACCOUNTING_PROCUREMENT, IT, RND.", "Cả 5 phòng ban ánh xạ chính xác." if vi else "All 5 departments normalized accurately.", P),
                ("S2_RBAC_03", "GET /api/admin/rbac-matrix chặn truy cập chưa xác thực" if vi else "GET /api/admin/rbac-matrix blocks unauthenticated access", "1. Gửi GET /api/admin/rbac-matrix không kèm JWT Admin" if vi else "1. Call GET /api/admin/rbac-matrix without Admin JWT", "Trả về HTTP 401 hoặc 403." if vi else "Returns HTTP 401 or 403.", "Đã chặn truy cập trái phép với mã 401/403." if vi else "Blocked unauthorized access with HTTP 401/403.", P),
                ("S2_RBAC_04", "Audit Log đảm bảo bất biến — không có API sửa/xóa (BR-03)" if vi else "Audit Log immutability — no PUT/DELETE endpoints (BR-03)", "1. Rà soát user_admin_api.py tìm route DELETE/PUT trên /audit" if vi else "1. Audit user_admin_api.py for PUT/DELETE routes on /audit", "Không tồn tại API sửa hay xóa nhật ký kiểm toán." if vi else "No update/delete endpoints exist for audit_logs.", "Đã xác nhận không có API sửa/xóa audit_logs." if vi else "Confirmed no PUT/DELETE routes for audit_logs.", P),
                ("S2_RBAC_05", "Cấu trúc ROLES của Ma trận RBAC 2D chứa đủ 4 vai trò chuẩn" if vi else "2D RBAC Matrix ROLES schema defines 4 canonical roles", "1. Kiểm tra danh sách MATRIX_ROLES trong rbac_matrix_schema.py" if vi else "1. Inspect MATRIX_ROLES in rbac_matrix_schema.py", "Chứa đủ ADMIN, EXECUTIVE, DEPARTMENT_MANAGER, STANDARD_USER." if vi else "Contains ADMIN, EXECUTIVE, DEPARTMENT_MANAGER, STANDARD_USER.", "Đủ 4 mã vai trò chuẩn trong MATRIX_ROLES." if vi else "All 4 canonical role codes verified.", P),
                ("S2_RBAC_06", "[Giới hạn MVP E2E-ISS-02] Tách riêng 2 vai trò IT_ADMIN & KNOWLEDGE_ADMIN trong Ma trận RBAC 2D" if vi else "[Known MVP Limitation E2E-ISS-02] Split IT_ADMIN & KNOWLEDGE_ADMIN in 2D RBAC Matrix", "1. Kiểm tra MATRIX_ROLES có chứa đồng thời IT_ADMIN và KNOWLEDGE_ADMIN" if vi else "1. Check MATRIX_ROLES contains both IT_ADMIN and KNOWLEDGE_ADMIN", "Tách đủ 5 mã vai trò theo BR-04." if vi else "5 split role codes defined per BR-04.", "Giới hạn MVP (E2E-ISS-02 — chuyển sang v2): Ma trận RBAC 2D hiện gộp chung 4 mã vai trò (ADMIN chưa tách IT_ADMIN / KNOWLEDGE_ADMIN)." if vi else "Known Limitation E2E-ISS-02 (Deferred to v2): 2D RBAC Matrix stores 4 unsplit role codes (ADMIN not split into IT_ADMIN & KNOWLEDGE_ADMIN).", F),
            ],
        )],
    )

    # ── Sheet 6: Email OTP & Session ─────────────────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[3][0],
        module_code="Module 6 — Khôi phục mật khẩu Email OTP 3 bước & Chính sách phiên (PB73, PB74 / C1SE18-10)" if vi else "Module 6 — 3-Step Email OTP Password Recovery & Session Policy (PB73, PB74 / C1SE18-10)",
        tester="Hà Hoàng Anh & Trần Việt Anh Vũ" if vi else "Anh, Ha Hoang & Vu, Tran Viet Anh",
        precondition="pytest + httpx AsyncClient + forgot_password_router & otp_service",
        sections=[(
            "Luồng Quên mật khẩu Email OTP 3 bước & Giới hạn tần suất (pytest + httpx)" if vi else "3-Step Email OTP Recovery & Rate Limiting (pytest + httpx)",
            [
                ("S2_OTP_01", "POST /forgot-password trả về 404 với email chưa đăng ký" if vi else "POST /forgot-password returns 404 for unknown email", "1. Gửi POST /api/v1/auth/forgot-password với nobody@graphmind.ai" if vi else "1. POST /api/v1/auth/forgot-password with unregistered email", "HTTP 404 Not Found." if vi else "HTTP 404 Not Found.", "Trả về đúng HTTP 404." if vi else "Returned HTTP 404.", P),
                ("S2_OTP_02", "POST /forgot-password từ chối tài khoản bị khóa (HTTP 403)" if vi else "POST /forgot-password rejects locked user (HTTP 403)", "1. Giả lập tài khoản is_active=False\n2. Gửi POST /api/v1/auth/forgot-password" if vi else "1. Mock user with is_active=False\n2. POST /api/v1/auth/forgot-password", "HTTP 403 Forbidden." if vi else "HTTP 403 Forbidden.", "Trả về đúng HTTP 403." if vi else "Returned HTTP 403.", P),
                ("S2_OTP_03", "POST /forgot-password giới hạn tần suất trả về HTTP 429" if vi else "POST /forgot-password enforces rate limit (HTTP 429)", "1. Giả lập check_rate_limit() -> False\n2. Gửi POST /api/v1/auth/forgot-password" if vi else "1. Mock check_rate_limit() -> False\n2. POST /api/v1/auth/forgot-password", "HTTP 429 Too Many Requests." if vi else "HTTP 429 Too Many Requests.", "Trả về đúng HTTP 429 chặn spam OTP." if vi else "Returned HTTP 429 Too Many Requests.", P),
                ("S2_OTP_04", "POST /verify-otp trả về 400 khi nhập mã OTP sai/hết hạn" if vi else "POST /verify-otp returns 400 for invalid/expired OTP", "1. Giả lập verify_otp -> (False, reason)\n2. Gửi POST /api/v1/auth/verify-otp với mã 000000" if vi else "1. Mock verify_otp -> (False, reason)\n2. POST /api/v1/auth/verify-otp with 000000", "HTTP 400 Bad Request kèm lý do lỗi." if vi else "HTTP 400 Bad Request with error detail.", "Trả về đúng HTTP 400." if vi else "Returned HTTP 400.", P),
                ("S2_OTP_05", "Kiểm tra hằng số chính sách OTP: TTL 5 phút, tối đa 3 lần thử, giới hạn 5 lần/15p" if vi else "Verify OTP policy constants: 5m TTL, 3 attempts, 5/15m limit", "1. Kiểm tra OTP_TTL_MINUTES, MAX_ATTEMPTS, RATE_LIMIT_COUNT trong otp_service.py" if vi else "1. Assert OTP_TTL_MINUTES==5, MAX_ATTEMPTS==3, RATE_LIMIT_COUNT==5", "OTP_TTL_MINUTES=5, MAX_ATTEMPTS=3, RATE_LIMIT_COUNT=5." if vi else "OTP_TTL_MINUTES=5, MAX_ATTEMPTS=3, RATE_LIMIT_COUNT=5.", "Cả 3 hằng số bảo mật OTP khớp hoàn toàn với PB74." if vi else "All 3 OTP security constants match PB74 specification.", P),
            ],
        )],
    )

    # ── Sheet 7: Copilot-Graph UI & Locust Load ──────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[4][0],
        module_code="Module 3 & 6 — Giao diện Copilot/Graph/Admin (Playwright) & Kiểm thử tải (Locust --headless)" if vi else "Module 3 & 6 — Copilot/Graph/Admin UI (Playwright) & Load Testing (Locust --headless)",
        tester="Trần Thị Ngọc Ánh & Phan Anh Bảo" if vi else "Anh, Tran Thi Ngoc & Bao, Phan Anh",
        precondition="Frontend Vite (:5173) với Playwright Chromium + Locust (--headless) trỏ về FastAPI (:5056)",
        sections=[
            (
                "Kiểm thử giao diện E2E Sprint 2 (Playwright / pytest-playwright)" if vi else "Sprint 2 UI E2E Verification (Playwright / pytest-playwright)",
                [
                    ("S2_UI_01", "Trang Kho tri thức (/?view=documents) hiển thị không lỗi JS" if vi else "Knowledge Base (/?view=documents) renders with 0 JS errors", "1. Mở /?view=documents trong Chromium\n2. Kiểm tra nội dung và pageerror" if vi else "1. Open /?view=documents in Chromium\n2. Verify render & zero pageerror", "Hiển thị danh sách tài liệu, 0 lỗi JS." if vi else "DocumentsView renders cleanly with 0 JS errors.", "DocumentsView hiển thị ổn định, 0 lỗi JS." if vi else "Rendered cleanly with 0 JS errors.", P),
                    ("S2_UI_02", "Giao diện AI Copilot Chat (/?view=copilot) hiển thị ô nhập câu hỏi" if vi else "AI Copilot Chat UI (/?view=copilot) renders prompt input", "1. Mở /?view=copilot với phiên Executive\n2. Kiểm tra ô nhập textarea/input" if vi else "1. Open /?view=copilot as Executive\n2. Verify prompt textarea/input visible", "Hiển thị khung chat và ô nhập câu hỏi, 0 lỗi JS." if vi else "Prompt input visible and 0 JS errors.", "Ô nhập câu hỏi Copilot hiển thị đầy đủ, 0 lỗi JS." if vi else "Prompt input visible with 0 uncaught JS errors.", P),
                    ("S2_UI_03", "Giao diện Đồ thị Tri thức D3-Force (/?view=knowledge) hoạt động ổn định" if vi else "D3-Force Knowledge Graph Viewer (/?view=knowledge) renders", "1. Mở /?view=knowledge với dữ liệu đồ thị giả lập\n2. Kiểm tra pageerror" if vi else "1. Open /?view=knowledge with mocked graph payload\n2. Check pageerror", "Khung đồ thị tri thức tải thành công, 0 lỗi JS." if vi else "KnowledgeView loads cleanly with 0 JS errors.", "KnowledgeView hiển thị không crash, 0 lỗi JS." if vi else "Rendered smoothly with 0 JS errors.", P),
                    ("S2_UI_04", "Trang Quản trị & Ma trận RBAC (/?view=admin) hiển thị cho IT Admin" if vi else "Admin Panel & RBAC View (/?view=admin) renders for it_admin", "1. Mở /?view=admin với phiên it_admin\n2. Kiểm tra hiển thị và pageerror" if vi else "1. Open /?view=admin as it_admin\n2. Verify render & zero pageerror", "AdminView hiển thị đầy đủ bảng quản trị, 0 lỗi JS." if vi else "AdminView renders cleanly with 0 JS errors.", "AdminView tải hoàn chỉnh, 0 lỗi JS." if vi else "AdminView rendered cleanly with 0 JS errors.", P),
                    ("S2_UI_05", "Chuyển đổi liên tiếp 4 màn hình SPA Sprint 2 không lỗi JS" if vi else "Multi-view SPA transitions (documents->copilot->knowledge->admin)", "1. Điều hướng liên tiếp qua documents, copilot, knowledge, admin\n2. Thu thập mọi sự kiện pageerror" if vi else "1. Navigate sequentially across all 4 Sprint 2 views\n2. Collect pageerror events", "0 lỗi JS xuyên suốt 4 lượt chuyển màn hình." if vi else "Zero uncaught JS errors across all 4 transitions.", "Chuyển đổi mượt mà cả 4 view, 0 lỗi JS." if vi else "All 4 SPA view transitions succeeded with 0 JS errors.", P),
                ],
            ),
            (
                "Kiểm thử tải API Sprint 2 (Locust --headless, 20 VUs, 5 VU/s, 8 giây)" if vi else "Sprint 2 Headless Load Testing (Locust --headless, 20 VUs, 5 VU/s, 8s)",
                [
                    ("S2_PERF_01", "Tổng tải 523 requests đạt tỷ lệ lỗi 0.00% (< 1% SLA)" if vi else "Error rate < 1% under 20 concurrent VUs (523 requests)", "1. Chạy locust -f tests/sprint2/locustfile_sprint2.py --headless -u 20 -r 5 -t 8s\n2. Kiểm tra Failure Count trong locust_sprint2_stats.csv" if vi else "1. Run locust --headless -u 20 -r 5 -t 8s\n2. Inspect Failure Count in CSV", "Tỷ lệ lỗi < 1%." if vi else "Error rate < 1%.", "523 requests, 0 lỗi (0.00%), đạt 77.12 req/s." if vi else "523 requests, 0 failures (0.00%), 77.12 req/s.", P),
                    ("S2_PERF_02", "Độ trễ p95 API đọc Sprint 2 < 500ms (NFR-01)" if vi else "Sprint 2 Read API p95 latency < 500ms (NFR-01)", "1. Kiểm tra cột 95% của /sync/file-watcher/status, /admin/rbac-matrix và /health trong CSV" if vi else "1. Inspect 95% percentile latency across Sprint 2 endpoints in CSV", "Độ trễ p95 < 500ms." if vi else "p95 latency < 500ms.", "Đạt xuất sắc: p95 tổng hợp = 10ms (trung bình 4.67ms, max 60.88ms)." if vi else "Aggregated p95 = 10ms (Avg 4.67ms, Max 60.88ms) — well under 500ms SLA.", P),
                ],
            ),
        ],
    )

    # ── Sheet 8: CUAD KG & Kaggle LoRA (DeepEval) ────────────────────────────
    _build_module_sheet(
        wb, vi=vi, sheet_name=sheet_names[5][0],
        module_code="Module 2 & 3 — CUAD NER/RE, Qdrant 384-Dim & Fine-Tuning LoRA Kaggle (PB08..12, 17..19 / DeepEval)" if vi else "Module 2 & 3 — CUAD NER/RE, Qdrant 384-Dim & Kaggle LoRA Setup (PB08..12, 17..19 / DeepEval)",
        tester="Huỳnh Ngọc Minh" if vi else "Minh, Huynh Ngoc",
        precondition="DeepEval 4.3.4 (LLMTestCase + BaseMetric) trên notebook LoRA, extract_cuad_kg.py, qdrant/client.py & train_dataset.json",
        sections=[(
            "Đánh giá tự động bằng DeepEval cho KG, Vector & Fine-tuning LoRA" if vi else "DeepEval Verification for KG Extraction, Vector Index & LoRA Setup",
            [
                ("S2_AI_01", "DeepEval LoRANotebookConfigMetric xác minh cấu hình Unsloth Qwen2.5-7B 4-bit (PB17, PB18)" if vi else "DeepEval validates Kaggle T4 Unsloth LoRA notebook config (PB17, PB18)", "1. Chạy DeepEval assert_test với LoRANotebookConfigMetric(threshold=1.0) trên 05_finetuning_kaggle_unsloth.ipynb" if vi else "1. Run DeepEval LoRANotebookConfigMetric(threshold=1.0) on notebook", "Điểm 1.00: đủ Qwen2.5-7B-bnb-4bit, load_in_4bit=True, r=16, lora_alpha=16 và 7 target modules." if vi else "Score 1.00: all 11 LoRA/Unsloth parameters present.", "DeepEval đạt 1.00 (11/11 tham số LoRA hợp lệ)." if vi else "DeepEval passed with score 1.00 (11/11 parameters).", P),
                ("S2_AI_02", "DeepEval CUADExtractionSchemaMetric xác minh thực thể pháp lý CUAD (PB08..10)" if vi else "DeepEval validates CUAD NER/RE graph schema coverage (PB08..10)", "1. Chạy DeepEval CUADExtractionSchemaMetric(threshold=0.8) trên extract_cuad_kg.py" if vi else "1. Run DeepEval CUADExtractionSchemaMetric(threshold=0.8) on extract_cuad_kg.py", "Điểm >= 0.80 phủ các nhãn Company, Contract, Clause, PARTY_TO, CONTAINS_CLAUSE." if vi else "Score >= 0.80 covering Company, Contract, Clause, PARTY_TO, CONTAINS_CLAUSE.", "DeepEval vượt ngưỡng, xác minh đủ lược đồ thực thể CUAD." if vi else "DeepEval passed; CUAD KG entities and relations verified.", P),
                ("S2_AI_03", "DeepEval QdrantVectorSchemaMetric xác minh vector 384 chiều & Layer-1 guard (PB12)" if vi else "DeepEval validates Qdrant 384-dim embeddings & Layer-1 is_active guard (PB12)", "1. Chạy DeepEval QdrantVectorSchemaMetric(threshold=1.0) trên qdrant/client.py & pipeline.py" if vi else "1. Run DeepEval QdrantVectorSchemaMetric(threshold=1.0) on qdrant client & pipeline", "Điểm 1.00: có 384-dim, cuad_contracts và bộ lọc is_active." if vi else "Score 1.00: 384-dim, cuad_contracts, and is_active guard present.", "DeepEval đạt 1.00 (3/3 thành phần Qdrant & Layer-1)." if vi else "DeepEval passed with score 1.00 (3/3 markers).", P),
                ("S2_AI_04", "DeepEval MultiHopTaskBalanceMetric xác minh cân bằng tác vụ text_to_cypher & rag_citation (PB17)" if vi else "DeepEval validates text_to_cypher & rag_citation task balance (PB17)", "1. Chạy DeepEval MultiHopTaskBalanceMetric(threshold=1.0) trên train_dataset.json" if vi else "1. Run DeepEval MultiHopTaskBalanceMetric(threshold=1.0) on train_dataset.json", "Điểm 1.00: có đủ cả 2 tác vụ text_to_cypher và rag_citation." if vi else "Score 1.00: both text_to_cypher and rag_citation tasks present.", "DeepEval đạt 1.00: cân bằng đủ 2 nhóm tác vụ huấn luyện." if vi else "DeepEval passed with score 1.00: both training tasks verified.", P),
                ("S2_AI_05", "Kiểm tra tạo payload index Qdrant trong qdrant/client.py" if vi else "Verify Qdrant payload index creation in qdrant/client.py", "1. Kiểm tra lệnh create_payload_index trong backend/app/db/qdrant/client.py" if vi else "1. Check create_payload_index in backend/app/db/qdrant/client.py", "Có cấu hình create_payload_index hỗ trợ lọc nhanh." if vi else "create_payload_index present for fast filtered search.", "Đã xác minh create_payload_index có mặt trong qdrant/client.py." if vi else "Verified create_payload_index exists in qdrant/client.py.", P),
            ],
        )],
    )

    out_file = REPO_ROOT / "9. TEST CASE" / ("C1SE18_TestCase_Sprint2_ver1.0_VI.xlsx" if vi else "C1SE18_TestCase_Sprint2_ver1.0.xlsx")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_file)
    print(f"Saved: {out_file}")


if __name__ == "__main__":
    _build_workbook(vi=False)
    _build_workbook(vi=True)
