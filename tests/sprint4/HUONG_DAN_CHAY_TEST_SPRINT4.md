# Hướng Dẫn Chạy Automation Testing — Sprint 4 (GraphMind / C1SE18)

Bộ **Automation Testing Sprint 4** (`10/11 – 01/12/2026`, Milestone M4 Closure) kiểm thử **PB56 Workstation Fleet & Kill Switch**, **Executive Decision Dashboard & Smart Risk Center**, **100-Question Benchmark (3 Baselines)**, **Playwright UI E2E**, và **Locust 150-VU Concurrency Load Test**.

## 1. Lệnh chạy nhanh (từ thư mục gốc `d:\CAPSTONE1\graph-mind`)

### 1.1. `pytest` + `httpx` + `pytest-asyncio` + `DeepEval` (10 TCs)
```powershell
python -m pytest tests/sprint4/test_s4_pb56_dashboard_benchmark.py -v --html=tests/sprint4/reports/sprint4_pytest_report.html --self-contained-html
start tests\sprint4\reports\sprint4_pytest_report.html
```

### 1.2. `Playwright` (`pytest-playwright` — 4 TCs UI)
```powershell
# Terminal 1: bật Vite frontend
cd frontend; npm run dev -- --port 5173 --host 127.0.0.1

# Terminal 2: chạy Playwright (thêm --headed --slowmo 600 để xem trực tiếp)
$env:GRAPHMIND_UI_URL="http://127.0.0.1:5173"
python -m pytest tests/sprint4/test_s4_ui_playwright.py -v --headed --slowmo 600 --html=tests/sprint4/reports/sprint4_playwright_report.html --self-contained-html
start tests\sprint4\reports\sprint4_playwright_report.html
```

### 1.3. `Locust` (`--headless` **150 VUs** — 2 TCs tải đỉnh)
```powershell
# Terminal 1: bật server FastAPI cô lập (cổng 5058)
python tests/sprint4/run_locust_target_s4.py

# Terminal 2: chạy Locust 150 VUs headless
python -m locust -f tests/sprint4/locustfile_sprint4.py --headless -u 150 -r 30 -t 8s --host http://127.0.0.1:5058 --csv tests/sprint4/reports/locust_sprint4 --html tests/sprint4/reports/locust_sprint4.html
start tests\sprint4\reports\locust_sprint4.html
```

### 1.4. Xuất lại file Excel Test Case Sprint 4 (EN & VI)
```powershell
python tests/sprint4/generate_sprint4_testcase_excel.py
start "9. TEST CASE\C1SE18_TestCase_Sprint4_ver1.0_VI.xlsx"
```

## 2. Kết quả thực thi Sprint 4 (**15/16 Passed — 93.75%**) & Tổng kết toàn dự án (4 Sprints)

| Phân hệ Sprint 4 | Công cụ | Tổng TC | Đạt | Không đạt | Ghi chú |
|---|---|---:|---:|---:|---|
| 1. PB56 Workstations & Kill Switch | `pytest` | 3 | 3 | 0 | Đủ route, ngưỡng heartbeat 90s & agent unittest |
| 2. Executive Dashboard, Risk & LLMOps | `pytest` | 4 | 3 | 1 | `S4_DASH_03` Fail: `dashboard.py` thiếu 2 tiêu chí ERP (`margin`, `discount`) trong `/risk-alerts` |
| 3. Benchmark 100 câu hỏi (3 Baselines) | `DeepEval` | 3 | 3 | 0 | Hybrid GraphRAG Acc **60.0%**, Faithfulness **76.0%** (vượt Vector & Pure GraphRAG) |
| 4. UI Sprint 4 & Tải 150 VUs | `Playwright` + `Locust` | 6 | 6 | 0 | 4/4 UI Pass; 150 VUs: **4,013 reqs, 0% lỗi, 524.58 req/s, p95 = 15ms** |
| **Tổng cộng Sprint 4** | **5 nhóm công cụ** | **16** | **15** | **1** | **Tỷ lệ đạt Sprint 4: 93.75%** |
| **Tổng kết cả 4 Sprint (S1–S4)** | **Toàn dự án** | **99** | **96** | **3** | **Tỷ lệ đạt toàn dự án: 96.97%** |
