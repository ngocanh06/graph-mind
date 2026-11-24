"""
Generate GraphMind Sprint 1 Test Case Excel Workbook (C1SE18_TestCase_Sprint1_ver1.0.xlsx)
strictly following the layout, formulas, styling, and charts of:
  9. TEST CASE/C2SE.27_TestCase_Sprint1_ver1.1.xlsx

Built with openpyxl following excel-skill guidelines (A1 notation, explicit fill_type,
quoted cross-sheet references, proper chart Reference min_col, conditional formatting).
"""
from datetime import date
from pathlib import Path
import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "9. TEST CASE" / "C1SE18_TestCase_Sprint1_ver1.0.xlsx"
TEST_DATE = date(2026, 9, 22)

# ── Shared Styles (matching template Times New Roman + #9CC2E5 theme) ────────
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
    widths = {"A": 17, "B": 38, "C": 48, "D": 36, "E": 38, "F": 12, "G": 14}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # Header metadata rows 1-5 (exact template layout)
    ws["A1"], ws["B1"] = "Module Code", module_code
    ws["A2"], ws["B2"] = "Tester", tester
    ws["A3"], ws["B3"] = "Pre-condition", precondition
    ws["A4"], ws["B4"], ws["C4"] = "Pass", "Fail", "Number of test case"
    ws["A5"] = '=COUNTIF(F9:F127,"Pass")'
    ws["B5"] = '=COUNTIF(F9:F127,"Fail")'
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

    # Table headers row 7
    headers = [
        "ID",
        "Test case Description",
        "Test case Procedure",
        "Expected Result",
        "Actual Result",
        "Result",
        "Test Date",
    ]
    for idx, h in enumerate(headers, 1):
        cell = ws.cell(7, idx, h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.border = BORDER_ALL
        cell.alignment = ALIGN_CENTER
    ws.row_dimensions[7].height = 26

    # Populate sections & test cases starting row 8
    r = 8
    for sec_title, cases in sections:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
        cell = ws.cell(r, 1, sec_title)
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

    # Conditional formatting for Result column (Pass = green, Fail = red)
    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=['"Pass"'], fill=FILL_PASS, font=Font(name="Times New Roman", size=11, bold=True, color="006100")),
    )
    ws.conditional_formatting.add(
        f"F9:F{max(r, 10)}",
        CellIsRule(operator="equal", formula=['"Fail"'], fill=FILL_FAIL, font=Font(name="Times New Roman", size=11, bold=True, color="9C0006")),
    )
    ws.freeze_panes = "A8"
    return ws


def build_workbook():
    wb = openpyxl.Workbook()

    # ── Sheet 1: Test report ─────────────────────────────────────────────────
    ws_rep = wb.active
    ws_rep.title = "Test report"
    for col, w in {"A": 22, "B": 14, "C": 10, "D": 12, "E": 11, "F": 11, "G": 11, "H": 10, "I": 10, "J": 11}.items():
        ws_rep.column_dimensions[col].width = w

    ws_rep.merge_cells("D3:I3")
    ws_rep["D3"] = "TEST REPORT"
    ws_rep["D3"].font = FONT_TITLE
    ws_rep["D3"].alignment = ALIGN_CENTER

    rep_headers = ["No.", "Sprint", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    for idx, h in enumerate(rep_headers, 3):
        c = ws_rep.cell(6, idx, h)
        c.font = FONT_HEADER
        c.fill = FILL_HEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER

    # Sprint 1 linked dynamically to Overview!E37:I37; Sprints 2-4 initialized to 0
    ws_rep.cell(7, 3, 1)
    ws_rep.cell(7, 4, "Sprint 1")
    ws_rep.cell(7, 5, "=Overview!E37")
    ws_rep.cell(7, 6, "=Overview!F37")
    ws_rep.cell(7, 7, "=Overview!G37")
    ws_rep.cell(7, 8, "=Overview!H37")
    ws_rep.cell(7, 9, "=Overview!I37")
    ws_rep.cell(7, 10, "=SUM(E7:I7)")

    for s_idx, row_i in [(2, 8), (3, 9), (4, 10)]:
        ws_rep.cell(row_i, 3, s_idx)
        ws_rep.cell(row_i, 4, f"Sprint {s_idx}")
        for col_i in range(5, 10):
            ws_rep.cell(row_i, col_i, 0)
        ws_rep.cell(row_i, 10, f"=SUM(E{row_i}:I{row_i})")

    ws_rep.merge_cells("C11:D11")
    ws_rep.cell(11, 3, "Total")
    for col_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_rep.cell(11, col_i, f"=SUM({col_l}7:{col_l}10)")
    ws_rep.cell(11, 10, "=SUM(E11:I11)")

    _style_range(ws_rep, 7, 3, 10, 10, font=FONT_BODY, alignment=ALIGN_CENTER)
    _style_range(ws_rep, 11, 3, 11, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for r in range(7, 12):
        for c in range(5, 11):
            ws_rep.cell(r, c).number_format = "#,##0"

    # Charts (matching template: BarChart + PieChart)
    bar = BarChart()
    bar.title = "Sprint 1–4 Test Execution Results"
    bar.y_axis.title = "Test Cases"
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
    pie.title = "Sprint 1 Pass vs Fail"
    pie_data = Reference(ws_rep, min_col=5, min_row=7, max_col=6, max_row=7)
    pie_labels = Reference(ws_rep, min_col=5, min_row=6, max_col=6, max_row=6)
    pie.add_data(pie_data, from_rows=True)
    pie.set_categories(pie_labels)
    pie.width = 11
    pie.height = 8
    ws_rep.add_chart(pie, "G13")

    # Footer metadata rows 31-33
    for rng in ["B31:F31", "B32:F32", "B33:F33", "G31:H31", "G32:H32", "G33:H33"]:
        ws_rep.merge_cells(rng)
    ws_rep["A31"], ws_rep["B31"] = "Project Name", "GraphMind: GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support"
    ws_rep["A32"], ws_rep["B32"] = "Test Design By", "C1SE18 (Automated: pytest, httpx, Playwright, Locust, DeepEval, GitHub Actions)"
    ws_rep["A33"], ws_rep["B33"] = "Reviewer / Approver", "PhD. Sanh, Tran Kim (Capstone Project 1 Mentor)"
    ws_rep["G31"], ws_rep["I31"] = "Test Coverage", "=IF(J11>0,(E11+F11)/J11,0)"
    ws_rep["G32"], ws_rep["I32"] = "Test Successful Coverage", "=IF(J11>0,E11/J11,0)"
    ws_rep["G33"], ws_rep["I33"] = "Version", "v1.0"

    _style_range(ws_rep, 31, 1, 33, 9, font=FONT_BODY, alignment=ALIGN_LEFT)
    for r in (31, 32, 33):
        ws_rep.cell(r, 1).font = FONT_BOLD
        ws_rep.cell(r, 7).font = FONT_BOLD
        ws_rep.cell(r, 9).font = FONT_BOLD
        ws_rep.cell(r, 9).alignment = ALIGN_CENTER
    ws_rep["I31"].number_format = "0.00%"
    ws_rep["I32"].number_format = "0.00%"

    # ── Sheet 2: Overview ────────────────────────────────────────────────────
    ws_ov = wb.create_sheet(title="Overview")
    for col, w in {"A": 8, "B": 24, "C": 32, "D": 36, "E": 14, "F": 12, "G": 11, "H": 10, "I": 10, "J": 11}.items():
        ws_ov.column_dimensions[col].width = w

    ws_ov["A1"] = "Test Sprint 1"
    ws_ov["A1"].font = FONT_H2

    ws_ov.merge_cells("B3:E3")
    ws_ov["B3"] = "PROJECT INFORMATION"
    ws_ov["B3"].font = FONT_HEADER
    ws_ov["B3"].fill = FILL_HEADER

    info_rows = [
        (4, "Project acronym", "GraphMind"),
        (5, "Project Title", "GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support"),
        (7, "Lead Institution", "International School, Duy Tan University"),
        (8, "Project Mentor", "PhD. Sanh, Tran Kim"),
        (9, "Project Manager", "Anh, Tran Thi Ngoc (Team Leader / Scrum Master)"),
        (10, "Automation Stack", "pytest + httpx + pytest-asyncio + pytest-html, Playwright, Locust (--headless), DeepEval, GitHub Actions + Docker Compose"),
        (11, "Jira Board", "C1SE18 (Sprint 1: C1SE18-6 -> C1SE18-37)"),
        (12, "Test Scope", "Auth & Single Session, Home & Dashboard UI, Ingestion & SHA-256, Multi-Model DB & CI, 509 ChatML Dataset & Synthetic Linking"),
    ]
    for r_i, k, v in info_rows:
        ws_ov.merge_cells(start_row=r_i, start_column=3, end_row=r_i, end_column=5)
        ws_ov.cell(r_i, 2, k).font = FONT_BOLD
        ws_ov.cell(r_i, 3, v).font = FONT_BODY

    ws_ov.cell(6, 2, "Start Date").font = FONT_BOLD
    ws_ov.cell(6, 3, date(2026, 9, 1)).number_format = "yyyy-mm-dd"
    ws_ov.cell(6, 4, "End Date").font = FONT_BOLD
    ws_ov.cell(6, 5, date(2026, 9, 22)).number_format = "yyyy-mm-dd"
    _style_range(ws_ov, 4, 2, 12, 5, alignment=ALIGN_LEFT)

    # Team members table rows 14-19
    tm_headers = ["No.", "Member Name", "Role", "Sprint 1 Test Responsibility"]
    for idx, h in enumerate(tm_headers, 2):
        c = ws_ov.cell(14, idx, h)
        c.font = FONT_HEADER
        c.fill = FILL_SUBHEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER
    members = [
        (1, "Anh, Tran Thi Ngoc", "Team Leader / Scrum Master", "Sprint 1 Closure, Bug Fix & Retest Coordination (C1SE18-34..37)"),
        (2, "Minh, Huynh Ngoc", "Data Engineer / AI & Backend", "Multi-Model DB Architecture (PB45), 509 ChatML Q&A & Synthetic Linking (PB16, PB47)"),
        (3, "Anh, Ha Hoang", "Fullstack Engineer", "Authentication Module, JWT & Single Active Session (PB01, PB43, PB73 / C1SE18-11)"),
        (4, "Vu, Tran Viet Anh", "Backend & Infra Developer", "Sprint 1 Test Plan (C1SE18-25), Data Ingestion Pipeline & SHA-256 Guard (PB07, PB46)"),
        (5, "Bao, Phan Anh", "Frontend / QA & Testing Lead", "Home & Dashboard UI, Playwright E2E & Locust Load Tests (PB44 / C1SE18-15)"),
    ]
    for idx, (no, name, role, resp) in enumerate(members, 15):
        ws_ov.cell(idx, 2, no)
        ws_ov.cell(idx, 3, name)
        ws_ov.cell(idx, 4, role)
        ws_ov.cell(idx, 5, resp)
    _style_range(ws_ov, 15, 2, 19, 5, font=FONT_BODY, alignment=ALIGN_LEFT)

    # Revision history rows 22-24
    ws_ov.merge_cells("B22:F22")
    ws_ov["B22"] = "REVISION HISTORY"
    ws_ov["B22"].font = FONT_HEADER
    ws_ov["B22"].fill = FILL_HEADER
    for idx, h in enumerate(["Version", "Date", "Comments", "Author", "Approval"], 2):
        c = ws_ov.cell(23, idx, h)
        c.font = FONT_BOLD
        c.fill = FILL_SUBHEADER
        c.border = BORDER_ALL
        c.alignment = ALIGN_CENTER
    ws_ov.cell(24, 2, "v1.0")
    ws_ov.cell(24, 3, TEST_DATE).number_format = "yyyy-mm-dd"
    ws_ov.cell(24, 4, "Initial Sprint 1 Automated Test Case Suite & Execution Results")
    ws_ov.cell(24, 5, "C1SE18 QA Team")
    ws_ov.cell(24, 6, "x")
    _style_range(ws_ov, 24, 2, 24, 6, font=FONT_BODY, alignment=ALIGN_CENTER)

    # SUMMARY table rows 30-37
    ws_ov.merge_cells("B30:J30")
    ws_ov["B30"] = "SUMMARY"
    ws_ov["B30"].font = FONT_HEADER
    ws_ov["B30"].fill = FILL_HEADER

    sum_headers = ["No.", "Feature", None, "Actor", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
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
        (32, 1, "1. Auth & Single Session", "All Users / Admin"),
        (33, 2, "2. Home & Dashboard UI", "Executive / Standard User"),
        (34, 3, "3. Ingestion & SHA-256", "Research Team / System"),
        (35, 4, "4. Multi-Model DB & CI", "System Admin / DevOps"),
        (36, 5, "5. AI Dataset & Linking", "Research Team"),
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
    ws_ov.cell(37, 2, "Total")
    for c_i, col_l in [(5, "E"), (6, "F"), (7, "G"), (8, "H"), (9, "I")]:
        ws_ov.cell(37, c_i, f"=SUM({col_l}32:{col_l}36)")
    ws_ov.cell(37, 10, "=SUM(E37:I37)")
    _style_range(ws_ov, 37, 1, 37, 10, font=FONT_BOLD, fill=FILL_HEADER, alignment=ALIGN_CENTER)
    for c_i in range(5, 11):
        ws_ov.cell(37, c_i).number_format = "#,##0"

    # ── Sheet 3: 1. Auth & Single Session ────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="1. Auth & Single Session",
        module_code="Module 6 — Authentication & Single Active Session (PB01, PB43, PB73 / C1SE18-6..11)",
        tester="Anh, Ha Hoang",
        precondition="pytest + httpx (ASGITransport) + pytest-asyncio + Playwright Chromium against isolated FastAPI & Vite",
        sections=[
            (
                "JWT Login, Enterprise Validation & Single Active Session (pytest + httpx + pytest-asyncio)",
                [
                    ("S1_AUTH_01", "Valid JWT login with email/username & password", "1. Send POST /api/v1/auth/login with valid credentials (exec/123456)\n2. Decode returned HS256 JWT", "HTTP 200; token_type='bearer'; JWT contains sub, role='executive', and unique jti.", "HTTP 200; valid HS256 JWT with sub, role='executive', and UUID jti verified.", "Pass"),
                    ("S1_AUTH_02", "Reject login with wrong password", "1. Send POST /api/v1/auth/login with valid identifier and invalid password", "HTTP 401 Unauthorized; no access_token returned.", "HTTP 401 returned; access_token absent from response body.", "Pass"),
                    ("S1_AUTH_03", "Reject login for non-existent user", "1. Send POST /api/v1/auth/login with unregistered email ghost@graphmind.ai", "HTTP 401 Unauthorized with clear error message.", "HTTP 401 returned with Vietnamese error detail.", "Pass"),
                    ("S1_AUTH_04", "Reject login for locked/inactive account", "1. Seed user with is_active=False, status='locked'\n2. Send POST /api/v1/auth/login", "HTTP 403 Forbidden preventing locked account login.", "HTTP 403 Forbidden returned.", "Pass"),
                    ("S1_AUTH_05", "Reject GET /api/v1/auth/me without Bearer token", "1. Call GET /api/v1/auth/me with no Authorization header", "HTTP 401 Unauthorized.", "HTTP 401 returned requiring JWT Bearer token.", "Pass"),
                    ("S1_AUTH_06", "Reject GET /api/v1/auth/me with tampered JWT", "1. Call GET /api/v1/auth/me with Authorization: Bearer invalid.jwt.token", "HTTP 401 Unauthorized.", "HTTP 401 returned for invalid/tampered token.", "Pass"),
                    ("S1_AUTH_07", "Single Active Session JTI revocation on concurrent login (PB73)", "1. Login on Device A -> token_1\n2. Login same user on Device B -> token_2\n3. Call /auth/me with token_2 and token_1", "Device B receives HTTP 200; Device A revoked with HTTP 401 CONCURRENT_LOGIN_KICKED.", "token_1 != token_2; Device B HTTP 200; Device A rejected with HTTP 401.", "Pass"),
                    ("S1_AUTH_08", "Enterprise 5 standard departments canonical mapping (PB43)", "1. Inspect DEPT_CANONICAL in backend/app/core/rbac.py\n2. Verify sales, legal, accounting, it, rnd keys exist", "All 5 canonical enterprise departments (sales, legal, accounting, it, rnd) mapped.", "All 5 canonical department keys verified in DEPT_CANONICAL.", "Pass"),
                    ("S1_AUTH_09", "OTP hash HMAC-SHA256 security check (PB74 / C1SE18-10)", "1. Inspect PasswordResetOtp.hash_otp implementation\n2. Verify salted HMAC hashing is used", "Uses HMAC-SHA256 rather than unsalted SHA-256.", "HMAC usage verified in PasswordResetOtp.hash_otp.", "Pass"),
                ],
            ),
            (
                "Authentication UI Flows (Playwright / pytest-playwright)",
                [
                    ("S1_UI_01", "Login page renders credentials form & submit button", "1. Open /?mode=login in Chromium\n2. Check password input and submit button visibility", "Login form with password input and submit button visible.", "Login page rendered cleanly; inputs and submit button visible.", "Pass"),
                    ("S1_UI_02", "Client-side validation on empty password", "1. Open /?mode=login\n2. Clear password input and click Submit", "Client-side validation displays password required message.", "Validation message containing 'mật khẩu' displayed without API call.", "Pass"),
                    ("S1_UI_03", "Login 401 error displays feedback and stays on Login page", "1. Mock /api/v1/auth/login -> 401\n2. Submit wrong password", "User remains on Login page with error message shown.", "User stayed on Login page; password field remained visible.", "Pass"),
                    ("S1_UI_06", "Forgot Password link opens ForgotPasswordPage", "1. Open /?mode=login\n2. Click 'Quên mật khẩu' button", "Navigates to ForgotPasswordPage with email input visible.", "ForgotPasswordPage rendered with email input visible.", "Pass"),
                ],
            ),
        ],
    )

    # ── Sheet 4: 2. Home & Dashboard UI ──────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="2. Home & Dashboard UI",
        module_code="Module 4 — Home & Dashboard UI & Sprint 1 Performance (PB44, NFR-01 / C1SE18-12..15)",
        tester="Bao, Phan Anh",
        precondition="Vite dev server (:5173) with Playwright Chromium + Locust (--headless) against FastAPI (:5055)",
        sections=[
            (
                "Home & Dashboard Role-Aware UI (Playwright / pytest-playwright)",
                [
                    ("S1_UI_04", "Executive login stores JWT and redirects to Home/Dashboard", "1. Mock /api/v1/auth/login -> 200 (role=executive)\n2. Submit login form\n3. Inspect localStorage['aegis_token'] & view", "JWT stored in localStorage; redirected off Login page to HomeView.", "JWT stored in localStorage ('eyJ...'); Login form unmounted and HomeView rendered.", "Pass"),
                    ("S1_UI_05", "Standard User role-based navigation shell rendering", "1. Mock login as role='standard' (ops)\n2. Verify Dashboard shell renders role-scoped content", "Dashboard shell renders cleanly with Standard User scope.", "Home & Navigation shell rendered cleanly with Standard User profile.", "Pass"),
                    ("S1_UI_07", "Home & Dashboard SPA load time <= 2.0s with 0 JS errors (NFR-01)", "1. Navigate to /?view=home\n2. Measure DOM load elapsed time & collect pageerror events", "Load time <= 2.0s and zero uncaught JavaScript errors.", "Loaded well under 2.0s with 0 uncaught JS errors.", "Pass"),
                ],
            ),
            (
                "Sprint 1 Headless Load Testing (Locust --headless, 20 VUs, 5 VU/s, 8s)",
                [
                    ("S1_PERF_01", "Error rate < 1% under 20 concurrent VUs (Locust --headless)", "1. Run locust -f tests/sprint1/locustfile_sprint1.py --headless -u 20 -r 5 -t 8s\n2. Inspect Aggregated Failure Count in CSV", "0% unexpected failures (< 1% SLA threshold).", "75 total requests, 0 failures (0.00% error rate), 11.14 req/s.", "Pass"),
                    ("S1_PERF_02", "Read API p95 latency < 500ms on single-worker local host", "1. Inspect GET /api/v1/auth/me and GET /health p95 in locust_sprint1_stats.csv", "p95 latency < 500ms per NFR-01 read API target.", "Observed p95 = 1500ms (Avg 845-971ms) due to single-worker uvicorn bcrypt CPU contention during concurrent logins; requires multi-worker/async bcrypt offload.", "Fail"),
                    ("S1_PERF_03", "Invalid login (401) stability under concurrent load", "1. Send concurrent invalid login requests in Locust\n2. Verify 401 handled cleanly without 5xx errors", "100% of invalid logins return 401 with 0 server errors.", "9/9 invalid login requests returned HTTP 401 cleanly (0 failures).", "Pass"),
                ],
            ),
        ],
    )

    # ── Sheet 5: 3. Ingestion & SHA-256 ──────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="3. Ingestion & SHA-256",
        module_code="Module 1 — Data Ingestion Pipeline, Parsers & SHA-256 Guard (PB07, PB46 / C1SE18-29)",
        tester="Vu, Tran Viet Anh",
        precondition="pytest + pytest-asyncio against backend/app/modules/m1_data_sync & central_storage",
        sections=[
            (
                "Data Ingestion Pipeline, Parsers & SHA-256 Hash Guard (pytest)",
                [
                    ("S1_ING_01", "SHA-256 & filename duplicate guard rejects re-upload (BR-06)", "1. Call check_document_duplicate() with unique file -> allowed\n2. Call with existing Purchasing_PurchaseOrderDetail.csv -> rejected", "New file returns (False, None); duplicate returns (True, reason).", "New file allowed (False, None); duplicate rejected (True, reason).", "Pass"),
                    ("S1_ING_02", "TXT parser handles UTF-8, UTF-8-SIG BOM, CP1252 & control chars", "1. Pass UTF-8 BOM + null/bell control bytes to extract_text_from_bytes()\n2. Pass CP1252 bytes", "Clean decoded text with control chars stripped; '.txt' in SUPPORTED_EXTENSIONS.", "UTF-8 BOM and CP1252 decoded cleanly; control chars stripped; .txt supported.", "Pass"),
                    ("S1_ING_03", "TXT parser enforces 10 MB max file size safety limit", "1. Pass 10MB + 10 bytes payload to extract_text_from_bytes()", "Raises ValueError rejecting oversized payload.", "ValueError raised as expected for >10MB file.", "Pass"),
                    ("S1_ING_04", "AdventureWorks ETL scripts exist and compile cleanly (PB07)", "1. Verify ingest_adventureworks_graph.py, _orders.py, _vectors.py exist\n2. Compile Python AST", "All 3 ETL scripts exist and compile with 0 syntax errors.", "All 3 AdventureWorks ETL scripts verified and compiled cleanly.", "Pass"),
                    ("S1_ING_05", "CUAD PDF preprocessing & extraction script compiles (PB46)", "1. Verify research/src/ner_re/extract_cuad_kg.py exists and compiles", "Script exists and compiles cleanly.", "extract_cuad_kg.py verified and compiled with 0 errors.", "Pass"),
                    ("S1_ING_06", "In-memory FakeNeo4j & FakeQdrant harness isolation (PR0)", "1. Instantiate FakeNeo4jClient and FakeQdrantClientWrapper\n2. Call reset() under blocked-socket sandbox", "Both fakes initialize and reset with zero external network sockets.", "FakeNeo4jClient and FakeQdrantClientWrapper operated in full isolation.", "Pass"),
                ],
            ),
        ],
    )

    # ── Sheet 6: 4. Multi-Model DB & CI ──────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="4. Multi-Model DB & CI",
        module_code="Module 6 — Multi-Model DB Architecture & GitHub Actions + Docker Compose (PB45 / C1SE18-17)",
        tester="Minh, Huynh Ngoc",
        precondition="SQLAlchemy ORM metadata, docker-compose.yml, .github/workflows/ci.yml, Docker CLI",
        sections=[
            (
                "Multi-Model Database Architecture Verification (PB45)",
                [
                    ("S1_DB_01", "PostgreSQL core MVP ORM tables registered in Base.metadata", "1. Import all Postgres ORM models\n2. Assert users, audit_logs, password_reset_otps, copilot_sessions, sop_documents exist", "All core MVP tables registered in SQLAlchemy Base.metadata.", "All core tables verified in Base.metadata.tables.", "Pass"),
                    ("S1_DB_02", "PostgreSQL async engine enables pool_pre_ping=True", "1. Inspect backend/app/db/postgres/database.py engine configuration", "create_async_engine configured with pool_pre_ping=True.", "pool_pre_ping=True confirmed in database.py.", "Pass"),
                    ("S1_DB_03", "Neo4j & Qdrant client modules and cuad_contracts collection configured", "1. Check neo4j/client.py & qdrant/client.py exist\n2. Check QDRANT_COLLECTION_NAME=cuad_contracts in docker-compose.yml", "Both client modules exist and cuad_contracts configured.", "Neo4j/Qdrant clients and cuad_contracts collection verified.", "Pass"),
                ],
            ),
            (
                "Docker Compose & GitHub Actions CI Pipeline",
                [
                    ("S1_CI_01", "docker-compose.yml defines all 5 GraphMind services", "1. Parse docker-compose.yml\n2. Verify neo4j, qdrant, backend, frontend, file-watcher services", "All 5 services defined with healthchecks and shared network.", "All 5 services verified in docker-compose.yml.", "Pass"),
                    ("S1_CI_02", "docker compose config syntax validation passes", "1. Execute: docker compose -f docker-compose.yml config -q", "Exit code 0 with no YAML or schema errors.", "docker compose config -q exited with code 0.", "Pass"),
                ],
            ),
        ],
    )

    # ── Sheet 7: 5. AI Dataset & Linking ─────────────────────────────────────
    _build_module_sheet(
        wb,
        sheet_name="5. AI Dataset & Linking",
        module_code="Module 3 & 1 — 509 ChatML Q&A Dataset & Synthetic Linking (PB16, PB47 / DeepEval)",
        tester="Minh, Huynh Ngoc",
        precondition="DeepEval 4.3.4 (LLMTestCase + BaseMetric) on research/data/qa_pairs/train_dataset.json",
        sections=[
            (
                "509 ChatML Q&A Dataset & Controlled Synthetic Linking (DeepEval)",
                [
                    ("S1_AI_01", "Curated dataset contains exactly 509 Q&A pairs (PB16)", "1. Load research/data/qa_pairs/train_dataset.json\n2. Assert len(records) == 509", "Exactly 509 records present.", "Verified exact count: 509 Q&A pairs.", "Pass"),
                    ("S1_AI_02", "DeepEval DatasetFormatMetric validates 100% schema completeness", "1. Run DeepEval assert_test with DatasetFormatMetric(threshold=1.0)", "Score == 1.00 (509/509 non-empty task, instruction, output).", "DeepEval passed: 509/509 valid records (score = 1.0).", "Pass"),
                    ("S1_AI_03", "DeepEval ReadOnlyCypherSafetyMetric verifies 0 mutating Cypher queries", "1. Run DeepEval assert_test with ReadOnlyCypherSafetyMetric(threshold=1.0) on all text_to_cypher pairs", "100% contain MATCH..RETURN and 0 mutating keywords (CREATE/DELETE/DROP/SET).", "DeepEval passed: 100% of text_to_cypher samples strictly read-only.", "Pass"),
                    ("S1_AI_04", "DeepEval SyntheticLinkingIntegrityMetric verifies AW-CUAD grounding (PB47)", "1. Run DeepEval assert_test with SyntheticLinkingIntegrityMetric(threshold=0.5)", "Score >= 0.50 referencing PARTY_TO / CONTAINS_CLAUSE / Customer / Contract.", "DeepEval passed: cross-source AdventureWorks-CUAD grounding verified.", "Pass"),
                    ("S1_AI_05", "Dataset supports 80/20 split (407/102) & >=90% prompt uniqueness", "1. Compute 80/20 split sizes\n2. Measure unique (instruction, input) ratio", "407 train / 102 val; unique prompt ratio >= 90%.", "80/20 split verified (407/102), but unique (instruction, input) ratio = 443/509 (87.03% < 90%); 66 duplicate prompts found in train_dataset.json.", "Fail"),
                ],
            ),
        ],
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_PATH)
    print(f"Saved Excel workbook to: {OUT_PATH}")


if __name__ == "__main__":
    build_workbook()
