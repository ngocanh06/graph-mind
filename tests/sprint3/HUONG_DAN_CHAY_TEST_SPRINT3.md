# Hướng Dẫn Chạy Automation Testing — Sprint 3 (GraphMind / C1SE18)

Bộ **Automation Testing Sprint 3** (`20/10 – 10/11/2026`) kiểm thử **Hybrid Query Engine (`RRF k=60`)**, **Read-Only Cypher Guard**, **Source Citation Redaction**, **Multi-Facet Search**, **AEGIS Watchdog**, **SOP Wiki**, **Shift Handover**, và **Ollama Offline Fallback** bằng đủ 5 nhóm công cụ: `pytest` (`httpx`, `pytest-asyncio`, `pytest-html`), `DeepEval`, `Playwright`, `Locust --headless`, và `GitHub Actions + Docker Compose`.

## 1. Lệnh chạy nhanh (từ thư mục gốc `d:\CAPSTONE1\graph-mind`)

### 1.1. `pytest` + `httpx` + `pytest-asyncio` + `DeepEval` (13 TCs)
```powershell
python -m pytest tests/sprint3/test_s3_hybrid_cypher_governance.py -v --html=tests/sprint3/reports/sprint3_pytest_report.html --self-contained-html
start tests\sprint3\reports\sprint3_pytest_report.html
```

### 1.2. `Playwright` (`pytest-playwright` — 4 TCs UI)
```powershell
# Terminal 1: bật Vite frontend
cd frontend; npm run dev -- --port 5173 --host 127.0.0.1

# Terminal 2: chạy Playwright (thêm --headed --slowmo 600 để xem trực tiếp)
$env:GRAPHMIND_UI_URL="http://127.0.0.1:5173"
python -m pytest tests/sprint3/test_s3_ui_playwright.py -v --headed --slowmo 600 --html=tests/sprint3/reports/sprint3_playwright_report.html --self-contained-html
start tests\sprint3\reports\sprint3_playwright_report.html
```

### 1.3. `Locust` (`--headless` — 2 TCs hiệu năng)
```powershell
# Terminal 1: bật server FastAPI cô lập (cổng 5057)
python tests/sprint3/run_locust_target_s3.py

# Terminal 2: chạy Locust headless
python -m locust -f tests/sprint3/locustfile_sprint3.py --headless -u 20 -r 5 -t 8s --host http://127.0.0.1:5057 --csv tests/sprint3/reports/locust_sprint3 --html tests/sprint3/reports/locust_sprint3.html
start tests\sprint3\reports\locust_sprint3.html
```

### 1.4. Xuất lại file Excel Test Case Sprint 3 (EN & VI)
```powershell
python tests/sprint3/generate_sprint3_testcase_excel.py
start "9. TEST CASE\C1SE18_TestCase_Sprint3_ver1.0_VI.xlsx"
```

## 2. Kết quả thực thi Sprint 3 (**19/19 Passed — 100%**)

| Phân hệ | Công cụ | Tổng TC | Đạt | Không đạt |
|---|---|---:|---:|---:|
| 1. Hybrid Query, RRF k=60, Cypher Guard & Ollama | `pytest` + `pytest-asyncio` | 5 | 5 | 0 |
| 2. Multi-Facet Search & AEGIS Watchdog | `pytest` | 2 | 2 | 0 |
| 3. SOP Wiki, Shift Handover & Approval Trigger | `pytest` + `httpx` | 4 | 4 | 0 |
| 4. UI Sprint 3 & Kiểm thử tải | `Playwright` + `Locust --headless` | 6 | 6 | 0 |
| 5. Cypher Injection Shield & RRF Ranking | `DeepEval` | 2 | 2 | 0 |
| **Tổng cộng Sprint 3** | **5 nhóm công cụ** | **19** | **19** | **0** |
