"""
Generate GraphMind Sprint 4 Test Case Excel Workbooks (EN & VI):
  - 9. TEST CASE/C1SE18_TestCase_Sprint4_ver1.0.xlsx
  - 9. TEST CASE/C1SE18_TestCase_Sprint4_ver1.0_VI.xlsx
Reuses shared sheet/style helpers from tests/sprint2/generate_sprint2_testcase_excel.py (Ponytail).
"""
import sys
from datetime import date
from pathlib import Path
import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "tests" / "sprint2"))
import generate_sprint2_testcase_excel as s2

s2.TEST_DATE = date(2026, 12, 1)


def _build_s4(vi: bool):
    wb = openpyxl.Workbook()
    rep_name = "Bao cao kiem thu" if vi else "Test report"
    ov_name = "Tong quan" if vi else "Overview"
    ov_ref = f"'{ov_name}'" if " " in ov_name else ov_name
    P, F = ("Đạt", "Không đạt") if vi else ("Pass", "Fail")

    # ── Sheet 1: Test report (All 4 Sprints complete!) ───────────────────────
    ws = wb.active
    ws.title = rep_name
    for col, w in {"A": 22, "B": 14, "C": 10, "D": 12, "E": 11, "F": 12, "G": 11, "H": 10, "I": 11, "J": 11}.items():
        ws.column_dimensions[col].width = w
    ws.merge_cells("D3:I3")
    ws["D3"] = "BÁO CÁO KẾT QUẢ KIỂM THỬ — SPRINT 4 (TỔNG KẾT 4 SPRINT)" if vi else "TEST REPORT — SPRINT 4 (ALL 4 SPRINTS SUMMARY)"
    ws["D3"].font, ws["D3"].alignment = s2.FONT_TITLE, s2.ALIGN_CENTER

    hdrs = ["STT", "Sprint", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"] if vi else ["No.", "Sprint", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    for idx, h in enumerate(hdrs, 3):
        c = ws.cell(6, idx, h)
        c.font, c.fill, c.border, c.alignment = s2.FONT_HEADER, s2.FILL_HEADER, s2.BORDER_ALL, s2.ALIGN_CENTER

    # Sprint 1 (33/2), Sprint 2 (29/0), Sprint 3 (19/0), Sprint 4 dynamic from Overview!E37:I37
    for r_i, s_no, p_val, f_val in [(7, 1, 33, 2), (8, 2, 29, 0), (9, 3, 19, 0), (10, 4, f"={ov_ref}!E37", f"={ov_ref}!F37")]:
        ws.cell(r_i, 3, s_no); ws.cell(r_i, 4, f"Sprint {s_no}")
        ws.cell(r_i, 5, p_val); ws.cell(r_i, 6, f_val)
        for c_i in (7, 8, 9): ws.cell(r_i, c_i, f"={ov_ref}!{'GHI'[c_i-7]}37" if s_no == 4 else 0)
        ws.cell(r_i, 10, f"=SUM(E{r_i}:I{r_i})")

    ws.merge_cells("C11:D11"); ws.cell(11, 3, "Tổng cộng" if vi else "Total")
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
    pie.title = "Tỷ lệ Đạt / Không đạt (Sprint 4)" if vi else "Sprint 4 Pass vs Fail"
    pie.width, pie.height = 11, 8
    pie.add_data(Reference(ws, min_col=5, min_row=10, max_col=6, max_row=10), from_rows=True)
    pie.set_categories(Reference(ws, min_col=5, min_row=6, max_col=6, max_row=6))
    ws.add_chart(pie, "G13")

    for rng in ["B31:F31", "B32:F32", "B33:F33", "G31:H31", "G32:H32", "G33:H33"]:
        ws.merge_cells(rng)
    ws["A31"], ws["B31"] = ("Tên dự án" if vi else "Project Name"), ("GraphMind: Nền tảng Quản trị Tri thức Doanh nghiệp GraphRAG cho SME" if vi else "GraphMind: GraphRAG-based Enterprise Knowledge Management Platform for SME")
    ws["A32"], ws["B32"] = ("Đơn vị thiết kế" if vi else "Test Design By"), "C1SE18 (pytest, httpx, Playwright, Locust 150-VU, DeepEval, GitHub Actions)"
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
    ov["A1"] = "Kiểm thử Sprint 4 (Closure & Benchmark)" if vi else "Test Sprint 4 (Closure & Benchmark)"
    ov["A1"].font = s2.FONT_H2
    ov.merge_cells("B3:E3"); ov["B3"] = "THÔNG TIN DỰ ÁN" if vi else "PROJECT INFORMATION"
    ov["B3"].font, ov["B3"].fill = s2.FONT_HEADER, s2.FILL_HEADER

    for r_i, k, v in [
        (4, "Tên viết tắt" if vi else "Project acronym", "GraphMind"),
        (5, "Tên dự án" if vi else "Project Title", "Nền tảng Quản trị Tri thức GraphRAG cho SME" if vi else "GraphRAG-based Enterprise Knowledge Management Platform for SME"),
        (7, "Đơn vị chủ trì" if vi else "Lead Institution", "Trường Quốc tế — Đại học Duy Tân" if vi else "International School, Duy Tan University"),
        (8, "Giảng viên hướng dẫn" if vi else "Project Mentor", "TS. Trần Kim Sanh" if vi else "PhD. Sanh, Tran Kim"),
        (9, "Công cụ Automation" if vi else "Automation Stack", "pytest + httpx + pytest-asyncio + pytest-html, Playwright, Locust 150-VU (--headless), DeepEval, GitHub Actions"),
        (10, "Phạm vi Sprint 4" if vi else "Sprint 4 Scope", "PB56 Workstations & Kill Switch, Executive Dashboard & Risk Center, 100-Q Benchmark (3 Baselines), 150-VU Load Test & Milestone M4 Closure"),
    ]:
        ov.merge_cells(start_row=r_i, start_column=3, end_row=r_i, end_column=5)
        ov.cell(r_i, 2, k).font = s2.FONT_BOLD; ov.cell(r_i, 3, v).font = s2.FONT_BODY
    ov.cell(6, 2, "Ngày bắt đầu" if vi else "Start Date").font = s2.FONT_BOLD
    ov.cell(6, 3, date(2026, 11, 10)).number_format = "yyyy-mm-dd"
    ov.cell(6, 4, "Ngày kết thúc" if vi else "End Date").font = s2.FONT_BOLD
    ov.cell(6, 5, date(2026, 12, 1)).number_format = "yyyy-mm-dd"
    s2._style_range(ov, 4, 2, 10, 5, alignment=s2.ALIGN_LEFT)

    ov.merge_cells("B30:J30"); ov["B30"] = "TỔNG HỢP KẾT QUẢ SPRINT 4" if vi else "SPRINT 4 SUMMARY"
    ov["B30"].font, ov["B30"].fill = s2.FONT_HEADER, s2.FILL_HEADER
    sum_hdrs = ["STT", "Phân hệ / Tính năng", None, "Tác nhân", "Đạt", "Không đạt", "Đang chờ", "N/A", "Còn lại", "Tổng"] if vi else ["No.", "Feature", None, "Actor", "Passed", "Failed", "Pending", "N/A", "Remain", "Total"]
    for idx, h in enumerate(sum_hdrs, 1):
        c = ov.cell(31, idx)
        if h is not None: c.value = h
        c.font, c.fill, c.border, c.alignment = s2.FONT_HEADER, s2.FILL_HEADER, s2.BORDER_ALL, s2.ALIGN_CENTER
    ov.merge_cells("B31:C31")

    sheets = (
        [
            ("1. PB56 & Kill Switch", "Quản trị hệ thống / AEGIS Agent"),
            ("2. Executive & Risk Center", "Ban lãnh đạo / Quản lý"),
            ("3. Benchmark 100Q DeepEval", "Nhóm Nghiên cứu AI"),
            ("4. UI Sprint 4 & Tai 150VU", "Ban lãnh đạo / QA"),
            ("5. Live Full-Stack Docker", "Toàn hệ thống (DB & API thật)"),
        ]
        if vi
        else [
            ("1. PB56 & Kill Switch", "System Admin / AEGIS Agent"),
            ("2. Executive & Risk Center", "Executive / Manager"),
            ("3. 100Q Benchmark DeepEval", "AI Research Team"),
            ("4. Sprint 4 UI & 150VU Load", "Executive / QA"),
            ("5. Live Full-Stack Docker", "Full System (Live DBs & API)"),
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

    # ── Sheets 3-6 ───────────────────────────────────────────────────────────
    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[0][0],
        module_code="Module 1 — Quản trị máy trạm PB56, Heartbeat 30s & Ngắt khẩn cấp Kill Switch (PB56, PB76 / C1SE18-62)",
        tester="Phan Anh Bảo" if vi else "Bao, Phan Anh",
        precondition="pytest trên backend/app/api/v1/pb56_workstations.py & aegis-agent/src/test_pb56_agent_sync.py",
        sections=[(
            "PB56 Workstation Fleet & Emergency Kill Switch (pytest)",
            [
                ("S4_PB56_01", "Đầy đủ route PB56: /register, /heartbeat, /sync-mode, /ack-sync-mode, /sync-report" if vi else "All PB56 fleet & 2-phase ACK routes wired", "1. Kiểm tra pb56_workstations.router.routes" if vi else "1. Inspect pb56_workstations.router.routes", "Đủ 5 endpoint cốt lõi PB56." if vi else "All 5 core PB56 endpoints registered.", "Đã xác minh đủ toàn bộ route PB56." if vi else "Confirmed all PB56 endpoints.", P),
                ("S4_PB56_02", "Logic chuyển trạng thái ONLINE -> OFFLINE sau 90 giây mất heartbeat (30s x 3)" if vi else "90s heartbeat timeout transitions ONLINE -> OFFLINE", "1. Kiểm tra is_workstation_online với mốc -30s và -120s" if vi else "1. Call is_workstation_online at -30s vs -120s", "-30s -> True (ONLINE); -120s -> False (OFFLINE)." if vi else "-30s -> True; -120s -> False.", "Đạt chính xác ngưỡng 90 giây." if vi else "Verified 90s heartbeat threshold.", P),
                ("S4_PB56_03", "Bộ unit test Kill Switch trên AEGIS Agent biên dịch sạch" if vi else "AEGIS Agent PB56 kill-switch unittest compiles cleanly", "1. Kiểm tra tồn tại và biên dịch aegis-agent/src/test_pb56_agent_sync.py" if vi else "1. Compile aegis-agent/src/test_pb56_agent_sync.py", "Tồn tại và biên dịch 0 lỗi." if vi else "Exists and compiles with 0 errors.", "Đã xác minh và biên dịch sạch." if vi else "Compiled cleanly.", P),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[1][0],
        module_code="Module 4 & 6 — Executive Dashboard, Trung tâm Rủi ro, Briefing & LLMOps (PB42, 57, 58, 59, 65, 66, 71)",
        tester="Trần Thị Ngọc Ánh, Hà Hoàng Anh & Trần Việt Anh Vũ" if vi else "Anh, Tran Thi Ngoc; Anh, Ha Hoang & Vu, Tran Viet Anh",
        precondition="pytest trên backend/app/api/v1/dashboard.py, copilot.py & main.py",
        sections=[(
            "Executive Dashboard, Risk Center, LLMOps & Session Pinning (pytest)",
            [
                ("S4_DASH_01", "Dashboard router đầy đủ 7 API KPIs, xu hướng, rủi ro, briefing & tổng hợp ca" if vi else "Dashboard router exposes all 7 executive & synthesis endpoints", "1. Kiểm tra dashboard.router.routes" if vi else "1. Inspect dashboard.router.routes", "Đủ /kpis, /revenue-trend, /top-customers, /contract-distribution, /risk-alerts, /briefing, /department-report/synthesize." if vi else "All 7 routes present.", "Đủ toàn bộ 7 endpoint." if vi else "All 7 dashboard endpoints verified.", P),
                ("S4_DASH_02", "Chặn Standard User truy cập Executive KPIs bằng HTTP 403 (BR-05)" if vi else "Standard User blocked (403) from Executive KPIs (BR-05)", "1. Gọi get_executive_kpis() với ScopeContext vai trò standard" if vi else "1. Call get_executive_kpis() with standard ScopeContext", "Ném HTTPException 403 Forbidden." if vi else "Raises HTTPException 403 Forbidden.", "Trả về đúng 403 Forbidden." if vi else "Raised HTTP 403 as expected.", P),
                ("S4_DASH_03", "Kiểm tra đủ 4 tiêu chí cảnh báo rủi ro (hết hạn, liability, biên lợi nhuận âm, chiết khấu)" if vi else "Smart Risk Center implements all 4 risk criteria (FR42)", "1. Rà soát logic /risk-alerts trong backend/app/api/v1/dashboard.py" if vi else "1. Audit /risk-alerts criteria in backend/app/api/v1/dashboard.py", "Đủ 4 tiêu chí: expiring contracts, liability, negative margin, abnormal discount." if vi else "Implements expiring, liability, negative margin, and abnormal discount.", "Phát hiện thiếu: dashboard.py mới có tiêu chí expiring & liability; chưa cài đặt đủ quy tắc negative margin & abnormal discount." if vi else "Gap detected: dashboard.py covers expiring & liability but lacks negative margin & abnormal discount rules.", F),
                ("S4_DASH_04", "Đủ API LLMOps (/api/llmops, /api/metrics) & Ghim phiên Copilot (/pin)" if vi else "LLMOps telemetry & Copilot session pinning wired (PB59, PB66)", "1. Kiểm tra main.py và copilot.py" if vi else "1. Check main.py and copilot.py routes", "Đủ /api/llmops, /api/metrics và /pin." if vi else "All 3 endpoints present.", "Đã xác minh đầy đủ." if vi else "Confirmed all 3 endpoints.", P),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[2][0],
        module_code="Module 3 & 5 — Bộ 100 câu hỏi Benchmark & So sánh 3 Baselines (PB32..36, PB60 / DeepEval)",
        tester="Huỳnh Ngọc Minh" if vi else "Minh, Huynh Ngoc",
        precondition="DeepEval 4.3.4 trên research/data/benchmark/benchmark_100.json & results_summary.json",
        sections=[(
            "DeepEval 100-Question Benchmark & 3-Baseline Evaluation",
            [
                ("S4_BM_01", "DeepEval xác minh đủ 100/100 câu hỏi ground-truth trong benchmark_100.json" if vi else "DeepEval validates 100/100 ground-truth benchmark questions", "1. Chạy DeepEval _Benchmark100Metric(1.0) trên benchmark_100.json" if vi else "1. Run DeepEval _Benchmark100Metric(1.0)", "Điểm 1.00 (100/100 câu hỏi đủ query, ground_truth, expected_keywords)." if vi else "Score 1.00 (100/100 complete).", "DeepEval đạt 1.00 (100/100 câu hỏi hợp lệ)." if vi else "DeepEval passed: 100/100 valid questions.", P),
                ("S4_BM_02", "DeepEval xác minh Hybrid GraphRAG vượt trội Vector RAG & Pure GraphRAG" if vi else "DeepEval verifies Hybrid GraphRAG beats Vector & Pure GraphRAG", "1. Chạy DeepEval _HybridSuperiorityMetric(1.0) trên results_summary.json" if vi else "1. Run DeepEval _HybridSuperiorityMetric(1.0)", "Hybrid đạt Accuracy & Faithfulness cao nhất." if vi else "Hybrid leads on Accuracy & Faithfulness.", "Đạt 1.00: Hybrid Acc 60.0% (vs 58.0%/5.0%), Faithfulness 76.0% (vs 70.4%/43.0%)." if vi else "Passed 1.00: Hybrid Acc 60.0% (vs 58.0%/5.0%), Faith 76.0% (vs 70.4%/43.0%).", P),
                ("S4_BM_03", "Cấu hình perf-tests/locustfile.py chuẩn 4 giai đoạn 150 VUs & SLA NFR-01" if vi else "perf-tests/locustfile.py defines 150-VU 4-stage profile & SLAs", "1. Kiểm tra users=150, read_p95_ms=500, heavy_p95_ms=2000" if vi else "1. Verify users=150, read_p95_ms=500, heavy_p95_ms=2000", "Đủ 3 thông số chuẩn NFR-01." if vi else "All 3 NFR-01 load parameters present.", "Đã xác minh đầy đủ." if vi else "Verified 150-VU profile & SLAs.", P),
            ],
        )],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[3][0],
        module_code="Module 1 & 4 — Giao diện Sprint 4 (Playwright) & Kiểm thử tải 150 VUs (Locust --headless)",
        tester="Phan Anh Bảo & Trần Thị Ngọc Ánh" if vi else "Bao, Phan Anh & Anh, Tran Thi Ngoc",
        precondition="Vite (:5173) với Playwright Chromium + Locust (--headless, 150 VUs, 30 VU/s, 8s) trên :5058",
        sections=[
            (
                "Giao diện E2E Sprint 4 (Playwright / pytest-playwright)",
                [
                    ("S4_UI_01", "Executive Decision Dashboard (/?view=executive) hiển thị 0 lỗi JS" if vi else "Executive Dashboard (/?view=executive) renders cleanly", "1. Mở /?view=executive trên Chromium" if vi else "1. Open /?view=executive in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S4_UI_02", "Smart Risk & Alert Center (/?view=risk) hiển thị 0 lỗi JS" if vi else "Smart Risk Center (/?view=risk) renders cleanly", "1. Mở /?view=risk trên Chromium" if vi else "1. Open /?view=risk in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S4_UI_03", "AEGIS Connectors & PB56 Workstations (/?view=connectors) hiển thị 0 lỗi JS" if vi else "AEGIS Connectors & Workstations (/?view=connectors) renders cleanly", "1. Mở /?view=connectors trên Chromium" if vi else "1. Open /?view=connectors in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                    ("S4_UI_04", "Executive Reports & Briefing (/?view=reports) hiển thị 0 lỗi JS" if vi else "Reports & Briefing (/?view=reports) renders cleanly", "1. Mở /?view=reports trên Chromium" if vi else "1. Open /?view=reports in Chromium", "Hiển thị sạch, 0 lỗi JS." if vi else "Clean render, 0 JS errors.", "Pass: 0 lỗi JS." if vi else "Passed with 0 JS errors.", P),
                ],
            ),
            (
                "Kiểm thử tải 150 người dùng đồng thời (Locust --headless, 150 VUs, 30 VU/s, 8s)",
                [
                    ("S4_PERF_01", "Tỷ lệ lỗi 0.00% (< 1% SLA) ở mức tải đỉnh 150 VUs (4,013 requests)" if vi else "0.00% error rate (<1% SLA) at 150 VUs peak load (4,013 reqs)", "1. Chạy locust -f tests/sprint4/locustfile_sprint4.py --headless -u 150 -r 30 -t 8s" if vi else "1. Run locust --headless -u 150 -r 30 -t 8s", "Tỷ lệ lỗi < 1%." if vi else "Error rate < 1%.", "4,013 requests, 0 lỗi (0.00%), đạt 524.58 req/s." if vi else "4,013 requests, 0 failures (0.00%), 524.58 req/s.", P),
                    ("S4_PERF_02", "Độ trễ p95 ở mức 150 VUs < 500ms (NFR-01)" if vi else "150-VU read p95 latency < 500ms (NFR-01)", "1. Kiểm tra cột 95% trong locust_sprint4_stats.csv" if vi else "1. Inspect 95% percentile in locust_sprint4_stats.csv", "p95 < 500ms." if vi else "p95 < 500ms.", "Đạt xuất sắc: p95 tổng hợp = 15ms (trung bình 5.17ms, max 126ms)." if vi else "Aggregated p95 = 15ms (Avg 5.17ms, Max 126ms) — well under 500ms SLA.", P),
                ],
            ),
        ],
    )

    s2._build_module_sheet(
        wb, vi=vi, sheet_name=sheets[4][0],
        module_code="System E2E — Kiểm thử Live Full-Stack trên Docker thật (PostgreSQL, Neo4j, Qdrant, Ollama, FastAPI :5000)" if vi else "System E2E — Live Full-Stack Docker Verification (PostgreSQL, Neo4j, Qdrant, Ollama, FastAPI :5000)",
        tester="Nhóm QA C1SE18" if vi else "C1SE18 QA Team",
        precondition="Docker Compose UP (neo4j_db, qdrant_db, aegis_file_watcher) + Host PostgreSQL :5432 + Ollama :11434 + FastAPI :5000",
        sections=[(
            "Live Full-Stack E2E không Mock (tests/test_live_fullstack_e2e.py)" if vi else "Live Full-Stack E2E without Mocks (tests/test_live_fullstack_e2e.py)",
            [
                ("LIVE_01", "Kiểm tra sức khỏe Backend, Neo4j & Qdrant thật" if vi else "Live Backend, Neo4j & Qdrant health status", "1. Gọi GET /api/health, /api/neo4j/status, /api/qdrant/status trên :5000 thật" if vi else "1. GET /api/health, /api/neo4j/status, /api/qdrant/status on live :5000", "Tất cả trả về HTTP 200 OK." if vi else "All return HTTP 200 OK.", "Cả 3 dịch vụ thật trả về HTTP 200 OK." if vi else "All 3 live endpoints returned HTTP 200 OK.", P),
                ("LIVE_02", "Đăng nhập JWT PostgreSQL thật & đá phiên cũ (Single Active Session)" if vi else "Live PostgreSQL JWT login & Single Active Session kick", "1. Login thiết bị A -> token_1\n2. Login thiết bị B -> token_2\n3. Gọi /api/v1/auth/me bằng token_1" if vi else "1. Login Device A -> tok1\n2. Login Device B -> tok2\n3. Call /auth/me with tok1", "Thiết bị B đạt 200; thiết bị A bị đá với HTTP 401." if vi else "Device B returns 200; Device A kicked with HTTP 401.", "Xác minh thành công trên PostgreSQL thật: tok1 bị từ chối 401." if vi else "Verified on live PostgreSQL: tok1 kicked with 401.", P),
                ("LIVE_03", "Truy vấn Executive Dashboard KPIs, Revenue, Top Customers & Risk Alerts trên Neo4j thật" if vi else "Live Neo4j Executive KPIs, Revenue, Top Customers & Risk Alerts", "1. Login Executive\n2. Gọi 4 API /api/v1/dashboard/{kpis,revenue-trend,top-customers,risk-alerts}" if vi else "1. Login as Executive\n2. Call all 4 /api/v1/dashboard endpoints", "Cả 4 endpoint trả về HTTP 200 kèm dữ liệu Neo4j thật." if vi else "All 4 endpoints return HTTP 200 with live Neo4j data.", "Cả 4 API truy vấn Neo4j thật thành công (HTTP 200)." if vi else "All 4 live Neo4j endpoints returned HTTP 200.", P),
                ("LIVE_04", "Kiểm tra Ma trận RBAC 2D, SOP Wiki, File Watcher & Search trên DB thật" if vi else "Live 2D RBAC Matrix, SOP Wiki, File Watcher & Search", "1. Login Admin\n2. Gọi /api/admin/rbac-matrix, /api/v1/sop, /api/v1/sync/file-watcher/status, /api/search" if vi else "1. Login as Admin\n2. Call rbac-matrix, sop, file-watcher/status, and search", "Tất cả phản hồi HTTP 200 trong < 15s." if vi else "All respond HTTP 200 within < 15s.", "rbac-matrix trả 200, nhưng GET /api/v1/sop bị httpx.ReadTimeout (> 15s) trên DB thật." if vi else "rbac-matrix returned 200, but GET /api/v1/sop hit httpx.ReadTimeout (>15s) on live DB.", F),
                ("LIVE_05", "Kiểm tra LLMOps & kết nối Ollama thật (:11434)" if vi else "Live LLMOps & Ollama (:11434) telemetry check", "1. Gọi GET /api/llmops trên :5000 thật" if vi else "1. GET /api/llmops on live :5000", "HTTP 200 OK." if vi else "HTTP 200 OK.", "Trả về HTTP 200 OK." if vi else "Returned HTTP 200 OK.", P),
            ],
        )],
    )

    out = REPO_ROOT / "9. TEST CASE" / ("C1SE18_TestCase_Sprint4_ver1.0_VI.xlsx" if vi else "C1SE18_TestCase_Sprint4_ver1.0.xlsx")
    wb.save(out)
    print(f"Saved: {out}")


if __name__ == "__main__":
    _build_s4(vi=False)
    _build_s4(vi=True)
