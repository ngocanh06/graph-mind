"""
Sinh file Excel Test Case Sprint 1 bản Tiếng Việt (C1SE18_TestCase_Sprint1_ver1.0_VI.xlsx)
theo đúng cấu trúc, công thức, định dạng và biểu đồ của mẫu:
  9. TEST CASE/C2SE.27_TestCase_Sprint1_ver1.1.xlsx

Tuân thủ excel-skill (ký hiệu A1, fill_type tường minh, trích dẫn tên sheet có dấu cách,
Reference biểu đồ có min_col, định dạng có điều kiện).
"""
from datetime import date
from pathlib import Path
import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "9. TEST CASE" / "C1SE18_TestCase_Sprint1_ver1.0_VI.xlsx"
TEST_DATE = date(2026, 9, 22)

# ── Định dạng dùng chung (Times New Roman + tông xanh #9CC2E5 theo mẫu) ──────
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


def _build_module_sheet(wb, *, sheet_name, module_code, tester, precondition, sections):
    ws = wb.create_sheet(title=sheet_name)
    widths = {"A": 17, "B": 38, "C": 48, "D": 36, "E": 40, "F": 14, "G": 14}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # Thông tin đầu trang (hàng 1-5 giống hệt file mẫu)
    ws["A1"], ws["B1"] = "Mã phân hệ", module_code
    ws["A2"], ws["B2"] = "Người kiểm thử", tester
    ws["A3"], ws["B3"] = "Điều kiện tiên quyết", precondition
    ws["A4"], ws["B4"], ws["C4"] = "Đạt", "Không đạt", "Tổng số kịch bản kiểm thử"
    ws["A5"] = '=COUNTIF(F9:F127,"Đạt")'
    ws["B5"] = '=COUNTIF(F9:F127,"Không đạt")'
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

    # Tiêu đề bảng hàng 7
    headers = [
        "Mã TC",
        "Mô tả kịch bản kiểm thử",
        "Các bước thực hiện",
        "Kết quả mong đợi",
        "Kết quả thực tế",
        "Trạng thái",
        "Ngày kiểm thử",
    ]
    for idx, h in enumerate(headers, 1):
        cell = ws.cell(7, idx, h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.border = BORDER_ALL
        cell.alignment = ALIGN_CENTER
    ws.row_dimensions[7].height = 26

    # Nội dung các nhóm kịch bản bắt đầu từ hàng 8
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
            ws.row_dimensions[r].height = 50
            r += 1

    # Tô màu có điều kiện cột Trạng thái (Đạt = xanh, Không đạt = đỏ)
    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=['"Đạt"'], fill=FILL_PASS, font=Font(name="Times New Roman", size=11, bold=True, color="006100")),
    )
    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=['"Không đạt"'], fill=FILL_FAIL, font=Font(name="Times New Roman", size=11, bold=True, color="9C0006")),
    )
    ws.freeze_panes = "A8"
    return ws


def build_workbook():
    wb = openpyxl.Workbook()

    # ── Sheet 1: Báo cáo kiểm thử ────────────────────────────────────────────
    ws_rep = wb.active
    ws_rep.title = "Bao cao kiem thu"
    for col, w in {"A": 22, "B": 14, "C": 10, "D": 12, "E": 11, "F": 12, "G": 11, "H": 10, "I": 11, "J": 11}.items():
        ws_rep.column_dimensions[col].width = w

    ws_rep.merge_cells("D3:I3")
    ws_rep["D3"] = "BÁO CÁO KẾT QUẢ KIỂM THỬ"
    ws_rep["D3"].font = FONT_TITLE
    ws_rep["D3"].alignment = ALIGN_CENTER

    rep_headers = ["STT", "Sprint", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"]
    for idx, h in enumerate(rep_headers, 3):
        c = ws_rep.cell(6, idx, h)
        c.font = FONT_HEADER
        c.fill = FILL_HEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER

    # Sprint 1 liên kết động từ sheet Tong quan!E37:I37
    ws_rep.cell(7, 3, 1)
    ws_rep.cell(7, 4, "Sprint 1")
    ws_rep.cell(7, 5, "='Tong quan'!E37")
    ws_rep.cell(7, 6, "='Tong quan'!F37")
    ws_rep.cell(7, 7, "='Tong quan'!G37")
    ws_rep.cell(7, 8, "='Tong quan'!H37")
    ws_rep.cell(7, 9, "='Tong quan'!I37")
    ws_rep.cell(7, 10, "=SUM(E7:I7)")

    for s_idx, row_i in [(2, 8), (3, 9), (4, 10)]:
        ws_rep.cell(row_i, 3, s_idx)
        ws_rep.cell(row_i, 4, f"Sprint {s_idx}")
        for col_i in range(5, 10):
            ws_rep.cell(row_i, col_i, 0)
        ws_rep.cell(row_i, 10, f"=SUM(E{row_i}:I{row_i})")

    ws_rep.merge_cells("C11:D11")
    ws_rep.cell(11, 3, "Tổng cộng")
    for col_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_rep.cell(11, col_i, f"=SUM({col_l}7:{col_l}10)")
    ws_rep.cell(11, 10, "=SUM(E11:I11)")

    _style_range(ws_rep, 7, 3, 10, 10, font=FONT_BODY, alignment=ALIGN_CENTER)
    _style_range(ws_rep, 11, 3, 11, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for r in range(7, 12):
        for c in range(5, 11):
            ws_rep.cell(r, c).number_format = "#,##0"

    # Biểu đồ cột + Biểu đồ tròn (giống mẫu)
    bar = BarChart()
    bar.title = "Kết quả kiểm thử Sprint 1–4"
    bar.y_axis.title = "Số lượng Test Case"
    bar.x_axis.title = "Sprint"
    bar.style = 10
    data_ref = Reference(ws_rep, min_col=5, min_row=6, max_col=6, max_row=10)
    cats_ref = Reference(ws_rep, min_col=4, min_row=7, max_row=10)
    bar.add_data(data_ref, titles_from_data=True)
    bar.set_categories(cats_ref)
    bar.width = 14
    bar.height = 8
    ws_rep.add_chart(bar, "B13")

    pie = PieChart()
    pie.title = "Tỷ lệ Đạt / Không đạt (Sprint 1)"
    pie_data = Reference(ws_rep, min_col=5, min_row=7, max_col=6, max_row=7)
    pie_labels = Reference(ws_rep, min_col=5, min_row=6, max_col=6, max_row=6)
    pie.add_data(pie_data, from_rows=True)
    pie.set_categories(pie_labels)
    pie.width = 11
    pie.height = 8
    ws_rep.add_chart(pie, "G13")

    # Thông tin chân trang (hàng 31-33)
    for rng in ["B31:F31", "B32:F32", "B33:F33", "G31:H31", "G32:H32", "G33:H33"]:
        ws_rep.merge_cells(rng)
    ws_rep["A31"], ws_rep["B31"] = "Tên dự án", "GraphMind: Nền tảng Quản trị Tri thức Doanh nghiệp dựa trên GraphRAG hỗ trợ ra quyết định cho SME"
    ws_rep["A32"], ws_rep["B32"] = "Đơn vị thiết kế", "Nhóm C1SE18 (Tự động hóa: pytest, httpx, Playwright, Locust, DeepEval, GitHub Actions)"
    ws_rep["A33"], ws_rep["B33"] = "Người phê duyệt", "TS. Trần Kim Sanh (Giảng viên hướng dẫn Capstone 1)"
    ws_rep["G31"], ws_rep["I31"] = "Độ phủ kiểm thử", "=IF(J11>0,(E11+F11)/J11,0)"
    ws_rep["G32"], ws_rep["I32"] = "Tỷ lệ đạt yêu cầu", "=IF(J11>0,E11/J11,0)"
    ws_rep["G33"], ws_rep["I33"] = "Phiên bản", "v1.0 (VI)"

    _style_range(ws_rep, 31, 1, 33, 9, font=FONT_BODY, alignment=ALIGN_LEFT)
    for r in (31, 32, 33):
        ws_rep.cell(r, 1).font = FONT_BOLD
        ws_rep.cell(r, 7).font = FONT_BOLD
        ws_rep.cell(r, 9).font = FONT_BOLD
        ws_rep.cell(r, 9).alignment = ALIGN_CENTER
    ws_rep["I31"].number_format = "0.00%"
    ws_rep["I32"].number_format = "0.00%"

    # ── Sheet 2: Tổng quan ───────────────────────────────────────────────────
    ws_ov = wb.create_sheet(title="Tong quan")
    for col, w in {"A": 8, "B": 24, "C": 32, "D": 36, "E": 14, "F": 12, "G": 11, "H": 10, "I": 10, "J": 11}.items():
        ws_ov.column_dimensions[col].width = w

    ws_ov["A1"] = "Kiểm thử Sprint 1"
    ws_ov["A1"].font = FONT_H2

    ws_ov.merge_cells("B3:E3")
    ws_ov["B3"] = "THÔNG TIN DỰ ÁN"
    ws_ov["B3"].font = FONT_HEADER
    ws_ov["B3"].fill = FILL_HEADER

    info_rows = [
        (4, "Tên viết tắt", "GraphMind"),
        (5, "Tên đầy đủ dự án", "Nền tảng Quản trị Tri thức Doanh nghiệp dựa trên GraphRAG hỗ trợ ra quyết định cho SME"),
        (7, "Đơn vị chủ trì", "Trường Quốc tế — Đại học Duy Tân"),
        (8, "Giảng viên hướng dẫn", "TS. Trần Kim Sanh"),
        (9, "Quản lý dự án", "Trần Thị Ngọc Ánh (Trưởng nhóm / Scrum Master)"),
        (10, "Công cụ Automation", "pytest + httpx + pytest-asyncio + pytest-html, Playwright, Locust (--headless), DeepEval, GitHub Actions + Docker Compose"),
        (11, "Bảng Jira", "C1SE18 (Sprint 1: C1SE18-6 -> C1SE18-37)"),
        (12, "Phạm vi kiểm thử", "Xác thực & Phiên đơn, Giao diện Trang chủ & Dashboard, Nạp dữ liệu & SHA-256, Kiến trúc Đa CSDL & CI, Bộ dữ liệu 509 Q&A & Liên kết tổng hợp"),
    ]
    for r_i, k, v in info_rows:
        ws_ov.merge_cells(start_row=r_i, start_column=3, end_row=r_i, end_column=5)
        ws_ov.cell(r_i, 2, k).font = FONT_BOLD
        ws_ov.cell(r_i, 3, v).font = FONT_BODY

    ws_ov.cell(6, 2, "Ngày bắt đầu").font = FONT_BOLD
    ws_ov.cell(6, 3, date(2026, 9, 1)).number_format = "yyyy-mm-dd"
    ws_ov.cell(6, 4, "Ngày kết thúc").font = FONT_BOLD
    ws_ov.cell(6, 5, date(2026, 9, 22)).number_format = "yyyy-mm-dd"
    _style_range(ws_ov, 4, 2, 12, 5, alignment=ALIGN_LEFT)

    # Thành viên nhóm hàng 14-19
    tm_headers = ["STT", "Họ và tên", "Vai trò", "Phạm vi kiểm thử Sprint 1"]
    for idx, h in enumerate(tm_headers, 2):
        c = ws_ov.cell(14, idx, h)
        c.font = FONT_HEADER
        c.fill = FILL_SUBHEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER
    members = [
        (1, "Trần Thị Ngọc Ánh", "Trưởng nhóm / Scrum Master", "Điều phối đóng Sprint 1, sửa lỗi & kiểm thử hồi quy (C1SE18-34..37)"),
        (2, "Huỳnh Ngọc Minh", "Kỹ sư Dữ liệu / AI & Backend", "Kiến trúc Đa CSDL (PB45), Bộ 509 ChatML Q&A & Liên kết tổng hợp (PB16, PB47)"),
        (3, "Hà Hoàng Anh", "Kỹ sư Fullstack", "Phân hệ Xác thực, JWT & Phiên đăng nhập đơn (PB01, PB43, PB73 / C1SE18-11)"),
        (4, "Trần Việt Anh Vũ", "Kỹ sư Backend & Hạ tầng", "Kế hoạch kiểm thử Sprint 1 (C1SE18-25), Pipeline nạp dữ liệu & SHA-256 (PB07, PB46)"),
        (5, "Phan Anh Bảo", "Kỹ sư Frontend / Trưởng nhóm QA", "Giao diện Trang chủ & Dashboard, Playwright E2E & Kiểm thử tải Locust (PB44 / C1SE18-15)"),
    ]
    for idx, (no, name, role, resp) in enumerate(members, 15):
        ws_ov.cell(idx, 2, no)
        ws_ov.cell(idx, 3, name)
        ws_ov.cell(idx, 4, role)
        ws_ov.cell(idx, 5, resp)
    _style_range(ws_ov, 15, 2, 19, 5, font=FONT_BODY, alignment=ALIGN_LEFT)

    # Lịch sử phiên bản hàng 22-24
    ws_ov.merge_cells("B22:F22")
    ws_ov["B22"] = "LỊCH SỬ CHỈNH SỬA"
    ws_ov["B22"].font = FONT_HEADER
    ws_ov["B22"].fill = FILL_HEADER
    for idx, h in enumerate(["Phiên bản", "Ngày", "Nội dung", "Tác giả", "Phê duyệt"], 2):
        c = ws_ov.cell(23, idx, h)
        c.font = FONT_BOLD
        c.fill = FILL_SUBHEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER
    ws_ov.cell(24, 2, "v1.0")
    ws_ov.cell(24, 3, TEST_DATE).number_format = "yyyy-mm-dd"
    ws_ov.cell(24, 4, "Khởi tạo bộ Test Case Automation Sprint 1 và cập nhật kết quả chạy thực tế")
    ws_ov.cell(24, 5, "Nhóm QA C1SE18")
    ws_ov.cell(24, 6, "x")
    _style_range(ws_ov, 24, 2, 24, 6, font=FONT_BODY, alignment=ALIGN_CENTER)

    # Bảng TỔNG HỢP hàng 30-37
    ws_ov.merge_cells("B30:J30")
    ws_ov["B30"] = "TỔNG HỢP KẾT QUẢ THEO PHÂN HỆ"
    ws_ov["B30"].font = FONT_HEADER
    ws_ov["B30"].fill = FILL_HEADER

    sum_headers = ["STT", "Phân hệ / Tính năng", None, "Tác nhân", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"]
    for idx, h in enumerate(sum_headers, 1):
        c = ws_ov.cell(31, idx)
        if h is not None:
            c.value = h
        c.font = FONT_HEADER
        c.fill = FILL_HEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER
    ws_ov.merge_cells("B31:C31")

    summary_rows = [
        (32, 1, "1. Xac thuc & Phien don", "Tất cả người dùng / Admin"),
        (33, 2, "2. Trang chu & Dashboard", "Ban lãnh đạo / Nhân viên"),
        (34, 3, "3. Nap du lieu & SHA-256", "Nhóm Nghiên cứu / Hệ thống"),
        (35, 4, "4. Da CSDL & CI-Docker", "Quản trị hệ thống / DevOps"),
        (36, 5, "5. Du lieu AI & Lien ket", "Nhóm Nghiên cứu"),
    ]
    for r_i, no, sname, actor in summary_rows:
        ws_ov.merge_cells(start_row=r_i, start_column=2, end_row=r_i, end_column=3)
        ws_ov.cell(r_i, 1, no)
        ws_ov.cell(r_i, 2, sname)
        ws_ov.cell(r_i, 4, actor)
        ws_ov.cell(r_i, 5, f"='{sname}'!A5")
        ws_ov.cell(r_i, 6, f"='{sname}'!B5")
        ws_ov.cell(r_i, 7, 0)
        ws_ov.cell(r_i, 8, 0)
        ws_ov.cell(r_i, 9, 0)
        ws_ov.cell(r_i, 10, f"=SUM(E{r_i}:I{r_i})")
    _style_range(ws_ov, 32, 1, 36, 10, font=FONT_BODY, alignment=ALIGN_CENTER)
    for r_i in range(32, 37):
        ws_ov.cell(r_i, 2).alignment = ALIGN_LEFT
        for c_i in range(5, 11):
            ws_ov.cell(r_i, c_i).number_format = "#,##0"

    ws_ov.merge_cells("B37:D37")
    ws_ov.cell(37, 2, "Tổng cộng")
    for c_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_ov.cell(37, c_i, f"=SUM({col_l}32:{col_l}36)")
    ws_ov.cell(37, 10, "=SUM(E37:I37)")
    _style_range(ws_ov, 37, 1, 37, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for c_i in range(5, 11):
        ws_ov.cell(37, c_i).number_format = "#,##0"

    # ── Sheet 3: 1. Xac thuc & Phien don ─────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="1. Xac thuc & Phien don",
        module_code="Module 6 — Xác thực JWT & Phiên đăng nhập đơn (PB01, PB43, PB73 / C1SE18-6..11)",
        tester="Hà Hoàng Anh",
        precondition="pytest + httpx (ASGITransport) + pytest-asyncio + Playwright Chromium trên FastAPI & Vite cô lập",
        sections=[
            (
                "Đăng nhập JWT, Kiểm tra dữ liệu doanh nghiệp & Phiên đăng nhập đơn (pytest + httpx + pytest-asyncio)",
                [
                    ("S1_AUTH_01", "Đăng nhập JWT hợp lệ bằng tài khoản/mật khẩu", "1. Gửi POST /api/v1/auth/login với tài khoản hợp lệ (exec/123456)\n2. Giải mã chuỗi JWT HS256 trả về", "HTTP 200; token_type='bearer'; JWT chứa đầy đủ sub, role='executive' và mã jti duy nhất.", "HTTP 200; xác minh thành công JWT HS256 chứa sub, role='executive' và UUID jti.", "Đạt"),
                    ("S1_AUTH_02", "Từ chối đăng nhập khi sai mật khẩu", "1. Gửi POST /api/v1/auth/login với tên đăng nhập đúng nhưng mật khẩu sai", "HTTP 401 Unauthorized; không cấp phát access_token.", "Trả về HTTP 401; không có access_token trong nội dung phản hồi.", "Đạt"),
                    ("S1_AUTH_03", "Từ chối đăng nhập với tài khoản không tồn tại", "1. Gửi POST /api/v1/auth/login với email chưa đăng ký ghost@graphmind.ai", "HTTP 401 Unauthorized kèm thông báo lỗi rõ ràng.", "Trả về HTTP 401 kèm thông báo lỗi tiếng Việt.", "Đạt"),
                    ("S1_AUTH_04", "Từ chối đăng nhập với tài khoản bị khóa/vô hiệu hóa", "1. Tạo tài khoản giả lập có is_active=False, status='locked'\n2. Gửi POST /api/v1/auth/login", "HTTP 403 Forbidden ngăn không cho tài khoản bị khóa đăng nhập.", "Trả về đúng HTTP 403 Forbidden.", "Đạt"),
                    ("S1_AUTH_05", "Từ chối gọi GET /api/v1/auth/me khi thiếu Bearer token", "1. Gọi GET /api/v1/auth/me không kèm header Authorization", "HTTP 401 Unauthorized.", "Trả về HTTP 401 yêu cầu cung cấp JWT Bearer token.", "Đạt"),
                    ("S1_AUTH_06", "Từ chối gọi GET /api/v1/auth/me với JWT giả mạo", "1. Gọi GET /api/v1/auth/me với Authorization: Bearer invalid.jwt.token", "HTTP 401 Unauthorized.", "Trả về HTTP 401 do token không hợp lệ.", "Đạt"),
                    ("S1_AUTH_07", "Thu hồi phiên cũ (JTI) khi đăng nhập trên thiết bị mới (PB73)", "1. Đăng nhập trên Thiết bị A -> token_1\n2. Đăng nhập cùng tài khoản trên Thiết bị B -> token_2\n3. Gọi /auth/me lần lượt bằng token_2 và token_1", "Thiết bị B nhận HTTP 200; Thiết bị A bị thu hồi phiên và nhận HTTP 401 CONCURRENT_LOGIN_KICKED.", "token_1 khác token_2; Thiết bị B nhận HTTP 200; Thiết bị A bị từ chối với HTTP 401.", "Đạt"),
                    ("S1_AUTH_08", "Kiểm tra ánh xạ chuẩn 5 phòng ban doanh nghiệp (PB43)", "1. Kiểm tra từ điển DEPT_CANONICAL trong backend/app/core/rbac.py\n2. Xác minh đủ 5 phòng ban: sales, legal, accounting, it, rnd", "Đủ 5 khóa phòng ban chuẩn (sales, legal, accounting, it, rnd) được ánh xạ.", "Xác minh đủ cả 5 khóa phòng ban chuẩn trong DEPT_CANONICAL.", "Đạt"),
                    ("S1_AUTH_09", "Kiểm tra bảo mật băm OTP bằng HMAC-SHA256 (PB74 / C1SE18-10)", "1. Kiểm tra mã nguồn hàm PasswordResetOtp.hash_otp\n2. Xác minh có sử dụng băm HMAC có khóa bí mật", "Sử dụng HMAC-SHA256 thay vì SHA-256 thuần không muối.", "Đã xác minh sử dụng HMAC trong PasswordResetOtp.hash_otp.", "Đạt"),
                ],
            ),
            (
                "Kiểm thử giao diện Xác thực (Playwright / pytest-playwright)",
                [
                    ("S1_UI_01", "Trang Đăng nhập hiển thị đầy đủ ô nhập và nút gửi", "1. Mở /?mode=login trên Chromium\n2. Kiểm tra hiển thị ô nhập mật khẩu và nút Đăng nhập", "Hiển thị đầy đủ form đăng nhập, ô mật khẩu và nút submit.", "Trang đăng nhập hiển thị chuẩn; ô nhập và nút bấm hiển thị đầy đủ.", "Đạt"),
                    ("S1_UI_02", "Kiểm tra hợp lệ phía client khi bỏ trống mật khẩu", "1. Mở /?mode=login\n2. Xóa trống ô mật khẩu và bấm Đăng nhập", "Hiển thị thông báo lỗi yêu cầu nhập mật khẩu ngay phía client.", "Hiển thị thông báo yêu cầu nhập 'mật khẩu' mà không gọi API.", "Đạt"),
                    ("S1_UI_03", "Xử lý lỗi HTTP 401 khi sai thông tin và giữ nguyên trang Đăng nhập", "1. Giả lập API /api/v1/auth/login trả về 401\n2. Nhập sai mật khẩu và bấm Đăng nhập", "Hiển thị thông báo lỗi và giữ người dùng ở lại trang Đăng nhập.", "Người dùng ở lại trang Đăng nhập; form nhập mật khẩu vẫn hiển thị.", "Đạt"),
                    ("S1_UI_06", "Chuyển sang trang Quên mật khẩu từ trang Đăng nhập", "1. Mở /?mode=login\n2. Nhấn nút 'Quên mật khẩu'", "Chuyển sang ForgotPasswordPage có ô nhập email.", "Mở đúng trang ForgotPasswordPage và hiển thị ô nhập email.", "Đạt"),
                ],
            ),
        ],
    )

    # ── Sheet 4: 2. Trang chu & Dashboard ────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="2. Trang chu & Dashboard",
        module_code="Module 4 — Giao diện Trang chủ, Dashboard & Hiệu năng Sprint 1 (PB44, NFR-01 / C1SE18-12..15)",
        tester="Phan Anh Bảo",
        precondition="Frontend Vite (:5173) với Playwright Chromium + Locust (--headless) trỏ về FastAPI (:5055)",
        sections=[
            (
                "Giao diện Trang chủ & Điều hướng theo vai trò (Playwright / pytest-playwright)",
                [
                    ("S1_UI_04", "Đăng nhập thành công vai trò Executive lưu JWT và vào Dashboard", "1. Giả lập /api/v1/auth/login -> 200 (role=executive)\n2. Bấm Đăng nhập\n3. Kiểm tra localStorage['aegis_token'] và giao diện HomeView", "Lưu JWT vào localStorage; chuyển khỏi trang Login sang HomeView.", "Đã lưu JWT ('eyJ...') trong localStorage; chuyển vào HomeView thành công.", "Đạt"),
                    ("S1_UI_05", "Hiển thị khung điều hướng đúng phạm vi cho Standard User", "1. Giả lập đăng nhập vai trò role='standard' (ops)\n2. Kiểm tra giao diện Dashboard & thanh điều hướng", "Hiển thị đúng giao diện và chức năng thuộc phạm vi Standard User.", "Khung Trang chủ và thanh điều hướng hiển thị đúng theo hồ sơ Standard User.", "Đạt"),
                    ("S1_UI_07", "Thời gian tải SPA Trang chủ <= 2.0 giây và không lỗi JS (NFR-01)", "1. Mở /?view=home\n2. Đo thời gian tải DOM và thu thập sự kiện pageerror", "Thời gian tải <= 2.0s và 0 lỗi JavaScript chưa được bắt.", "Tải hoàn tất dưới 2.0s và ghi nhận 0 lỗi JS.", "Đạt"),
                ],
            ),
            (
                "Kiểm thử tải không giao diện (Locust --headless, 20 VUs, 5 VU/s, 8 giây)",
                [
                    ("S1_PERF_01", "Tỷ lệ lỗi < 1% dưới tải 20 người dùng ảo đồng thời", "1. Chạy locust -f tests/sprint1/locustfile_sprint1.py --headless -u 20 -r 5 -t 8s\n2. Kiểm tra cột Failure Count trong file CSV kết quả", "Tỷ lệ lỗi < 1% (0 lỗi bất thường).", "Tổng 75 requests, 0 lỗi (0.00% error rate), tốc độ 11.14 req/s.", "Đạt"),
                    ("S1_PERF_02", "Độ trễ p95 các API đọc < 500ms trên máy chủ nội bộ", "1. Kiểm tra giá trị p95 của GET /api/v1/auth/me và GET /health trong locust_sprint1_stats.csv", "Độ trễ p95 < 500ms theo mục tiêu NFR-01 cho API đọc.", "Đã sửa bằng asyncio.to_thread(verify_password): GET /auth/me p95 = 13ms, GET /health p95 = 11ms (343 reqs, 0% lỗi, 45.15 req/s).", "Đạt"),
                    ("S1_PERF_03", "Độ ổn định khi nhận nhiều request đăng nhập sai (HTTP 401) đồng thời", "1. Gửi đồng thời các request sai mật khẩu bằng Locust\n2. Xác minh server trả về 401 sạch, không phát sinh lỗi 5xx", "100% trả về HTTP 401, không phát sinh lỗi máy chủ 5xx.", "9/9 request đăng nhập sai trả về HTTP 401 ổn định (0 lỗi).", "Đạt"),
                ],
            ),
        ],
    )

    # ── Sheet 5: 3. Nap du lieu & SHA-256 ────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="3. Nap du lieu & SHA-256",
        module_code="Module 1 — Pipeline nạp dữ liệu, Bộ phân tích tài liệu & Chống trùng SHA-256 (PB07, PB46 / C1SE18-29)",
        tester="Trần Việt Anh Vũ",
        precondition="pytest + pytest-asyncio chạy trực tiếp trên backend/app/modules/m1_data_sync & central_storage",
        sections=[
            (
                "Pipeline nạp dữ liệu, Trình đọc tệp & Chống trùng lặp SHA-256 (pytest)",
                [
                    ("S1_ING_01", "Chốt chặn chống trùng lặp SHA-256 & tên tệp từ chối tải lại (BR-06)", "1. Gọi check_document_duplicate() với tệp mới hoàn toàn -> cho phép\n2. Gọi lại với tệp đã tồn tại Purchasing_PurchaseOrderDetail.csv -> từ chối", "Tệp mới trả về (False, None); tệp trùng trả về (True, lý do).", "Tệp mới được phép (False, None); tệp trùng bị từ chối (True, lý do).", "Đạt"),
                    ("S1_ING_02", "Trình đọc TXT xử lý đúng UTF-8, UTF-8-SIG BOM, CP1252 và lọc ký tự điều khiển", "1. Truyền chuỗi byte UTF-8 BOM kèm ký tự null/bell vào extract_text_from_bytes()\n2. Truyền chuỗi byte CP1252", "Giải mã văn bản sạch, loại bỏ ký tự điều khiển; '.txt' nằm trong SUPPORTED_EXTENSIONS.", "Giải mã đúng UTF-8 BOM và CP1252; đã lọc ký tự điều khiển; hỗ trợ .txt.", "Đạt"),
                    ("S1_ING_03", "Trình đọc TXT từ chối tệp vượt quá giới hạn an toàn 10 MB", "1. Truyền dữ liệu lớn hơn 10MB (10MB + 10 bytes) vào extract_text_from_bytes()", "Ném ngoại lệ ValueError từ chối tệp quá dung lượng.", "Đã ném đúng ValueError cho tệp >10MB.", "Đạt"),
                    ("S1_ING_04", "Các script ETL AdventureWorks đầy đủ và không lỗi cú pháp (PB07)", "1. Kiểm tra tồn tại 3 file ingest_adventureworks_graph.py, _orders.py, _vectors.py\n2. Biên dịch kiểm tra cú pháp AST Python", "Cả 3 script ETL tồn tại và biên dịch không có lỗi cú pháp.", "Đã xác minh tồn tại và biên dịch sạch cả 3 script ETL AdventureWorks.", "Đạt"),
                    ("S1_ING_05", "Script tiền xử lý & trích xuất hợp đồng CUAD hợp lệ (PB46)", "1. Kiểm tra tồn tại và biên dịch research/src/ner_re/extract_cuad_kg.py", "Script tồn tại và biên dịch sạch không lỗi.", "Đã xác minh và biên dịch thành công extract_cuad_kg.py.", "Đạt"),
                    ("S1_ING_06", "Môi trường giả lập FakeNeo4j & FakeQdrant chạy cô lập không dùng mạng (PR0)", "1. Khởi tạo FakeNeo4jClient và FakeQdrantClientWrapper\n2. Gọi reset() trong sandbox khóa socket", "Khởi tạo và reset thành công mà không mở kết nối mạng ra ngoài.", "FakeNeo4jClient và FakeQdrantClientWrapper hoạt động cô lập hoàn toàn.", "Đạt"),
                    ("S1_ING_07", "Xử lý an toàn tệp PDF dạng ảnh scan không làm sập pipeline", "1. Truyền tệp PDF 1 trang dạng ảnh scan không có text stream vào extract_text_from_bytes()", "Xử lý an toàn, không gây lỗi crash hệ thống.", "Xử lý ổn định không crash (trả về chuỗi fallback hợp lệ).", "Đạt"),
                ],
            ),
        ],
    )

    # ── Sheet 6: 4. Da CSDL & CI-Docker ──────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="4. Da CSDL & CI-Docker",
        module_code="Module 6 — Kiến trúc Đa CSDL & Quy trình GitHub Actions + Docker Compose (PB45 / C1SE18-17)",
        tester="Huỳnh Ngọc Minh",
        precondition="SQLAlchemy ORM metadata, docker-compose.yml, .github/workflows/ci.yml, Docker CLI",
        sections=[
            (
                "Xác minh Kiến trúc Đa CSDL PostgreSQL / Neo4j / Qdrant (PB45)",
                [
                    ("S1_DB_01", "Đăng ký đầy đủ các bảng lõi PostgreSQL MVP trong Base.metadata", "1. Import toàn bộ các ORM model PostgreSQL\n2. Kiểm tra sự hiện diện của users, audit_logs, password_reset_otps, copilot_sessions, sop_documents", "Đầy đủ các bảng lõi MVP được đăng ký trong SQLAlchemy Base.metadata.", "Đã xác minh đầy đủ các bảng lõi trong Base.metadata.tables.", "Đạt"),
                    ("S1_DB_02", "Cấu hình pool_pre_ping=True cho kết nối async PostgreSQL", "1. Kiểm tra cấu hình create_async_engine trong backend/app/db/postgres/database.py", "Bật pool_pre_ping=True để chống ngắt kết nối đột ngột.", "Đã xác nhận pool_pre_ping=True trong database.py.", "Đạt"),
                    ("S1_DB_03", "Cấu hình client Neo4j, Qdrant và collection cuad_contracts", "1. Kiểm tra tồn tại neo4j/client.py & qdrant/client.py\n2. Kiểm tra biến QDRANT_COLLECTION_NAME=cuad_contracts trong docker-compose.yml", "Đủ module client và khai báo đúng collection cuad_contracts.", "Đã xác minh client Neo4j/Qdrant và collection cuad_contracts.", "Đạt"),
                ],
            ),
            (
                "Kiểm tra Docker Compose & GitHub Actions CI",
                [
                    ("S1_CI_01", "File docker-compose.yml định nghĩa đầy đủ 5 dịch vụ GraphMind", "1. Đọc docker-compose.yml\n2. Kiểm tra 5 service: neo4j, qdrant, backend, frontend, file-watcher", "Đủ 5 dịch vụ kèm healthcheck và mạng dùng chung.", "Đã xác minh đủ 5 dịch vụ trong docker-compose.yml.", "Đạt"),
                    ("S1_CI_02", "Kiểm tra hợp lệ cú pháp bằng lệnh docker compose config", "1. Thực thi lệnh: docker compose -f docker-compose.yml config -q", "Mã thoát (exit code) bằng 0, không lỗi YAML hay schema.", "Lệnh docker compose config -q kết thúc với mã thoát 0.", "Đạt"),
                ],
            ),
        ],
    )

    # ── Sheet 7: 5. Du lieu AI & Lien ket ────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="5. Du lieu AI & Lien ket",
        module_code="Module 3 & 1 — Bộ 509 cặp ChatML Q&A & Liên kết tổng hợp có kiểm soát (PB16, PB47 / DeepEval)",
        tester="Huỳnh Ngọc Minh",
        precondition="DeepEval 4.3.4 (LLMTestCase + BaseMetric) chạy trên research/data/qa_pairs/train_dataset.json",
        sections=[
            (
                "Đánh giá Bộ dữ liệu 509 ChatML Q&A & Liên kết tổng hợp (DeepEval)",
                [
                    ("S1_AI_01", "Kiểm tra số lượng chính xác 509 cặp Q&A trong bộ dữ liệu (PB16)", "1. Tải file research/data/qa_pairs/train_dataset.json\n2. Kiểm tra len(records) == 509", "Có chính xác 509 bản ghi Q&A.", "Xác minh chính xác 509 cặp Q&A trong train_dataset.json.", "Đạt"),
                    ("S1_AI_02", "DeepEval DatasetFormatMetric kiểm tra 100% tính đầy đủ trường dữ liệu", "1. Chạy DeepEval assert_test với DatasetFormatMetric(threshold=1.0)", "Điểm đạt 1.00 (509/509 bản ghi có đủ task, instruction, output không rỗng).", "DeepEval đạt 1.00: 509/509 bản ghi hợp lệ.", "Đạt"),
                    ("S1_AI_03", "DeepEval ReadOnlyCypherSafetyMetric kiểm tra 0 câu lệnh Cypher ghi/xóa", "1. Chạy DeepEval assert_test với ReadOnlyCypherSafetyMetric(threshold=1.0) cho toàn bộ mẫu text_to_cypher", "100% chứa MATCH..RETURN và 0 từ khóa thay đổi dữ liệu (CREATE/DELETE/DROP/SET).", "DeepEval đạt 1.00: 100% truy vấn text_to_cypher an toàn chỉ đọc.", "Đạt"),
                    ("S1_AI_04", "DeepEval SyntheticLinkingIntegrityMetric kiểm tra liên kết AW-CUAD (PB47)", "1. Chạy DeepEval assert_test với SyntheticLinkingIntegrityMetric(threshold=0.5)", "Điểm >= 0.50 tham chiếu đúng các thực thể PARTY_TO / CONTAINS_CLAUSE / Customer / Contract.", "DeepEval vượt ngưỡng: xác minh liên kết xuyên nguồn AdventureWorks-CUAD.", "Đạt"),
                    ("S1_AI_05", "Kiểm tra tỷ lệ chia 80/20 (407/102) và độ duy nhất prompt >= 90%", "1. Tính kích thước tập train/val (80/20)\n2. Đo tỷ lệ cặp (instruction, input) không trùng lặp", "407 train / 102 val; tỷ lệ prompt duy nhất >= 90%.", "Đã khử trùng lặp và bổ sung: 509/509 cặp prompt duy nhất (100%), chia 80/20 đạt 407/102.", "Đạt"),
                ],
            ),
        ],
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_PATH)
    print(f"Đã xuất file Excel tiếng Việt tại: {OUT_PATH}")


if __name__ == "__main__":
    build_workbook()
