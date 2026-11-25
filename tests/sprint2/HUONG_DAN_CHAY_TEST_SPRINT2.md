# Hướng Dẫn Chạy Automation Testing — Sprint 2 (GraphMind / C1SE18)

Tài liệu này hướng dẫn cách chạy và xem báo cáo của bộ **Automation Testing Sprint 2** (`22/09 – 20/10/2026`) cho dự án **GraphMind**, bao gồm đầy đủ 5 nhóm công cụ:

1. **pytest** (`httpx`, `pytest-asyncio`, `pytest-html`) — Kiểm thử Kho tri thức & RBAC Scope (`PB50`), File Watcher & Hàng đợi phê duyệt (`PB48, PB49, PB67`), Quản trị người dùng & Ma trận RBAC 2D (`PB02, PB03, PB72`), và Email OTP 3 bước (`PB73, PB74`).
2. **DeepEval** — Đánh giá cấu hình Fine-Tuning **LoRA/Unsloth Qwen2.5-7B** trên Kaggle T4 (`PB17, PB18`), trích xuất **CUAD NER/RE** (`PB08–PB10`) và chỉ mục **Qdrant 384-dim + Layer-1 Guard** (`PB12`).
3. **Playwright** (`pytest-playwright`) — Kiểm thử giao diện E2E các màn hình Sprint 2: `DocumentsView`, `CopilotView`, `KnowledgeView`, `AdminView` và độ ổn định chuyển tab SPA.
4. **Locust** (`--headless`) — Kiểm thử tải cho các API Sprint 2 (`/api/v1/sync/file-watcher/status`, `/api/admin/rbac-matrix`, `/api/v1/auth/forgot-password`, `/health`).
5. **GitHub Actions + Docker Compose** — Tích hợp chạy song song cả Sprint 1 & Sprint 2 trong `.github/workflows/ci.yml`.

---

## 1. Cấu trúc thư mục Sprint 2

```text
graph-mind/
├── .github/workflows/ci.yml                              # CI GitHub Actions cho cả Sprint 1 & Sprint 2
├── 9. TEST CASE/
│   ├── C1SE18_TestCase_Sprint2_ver1.0.xlsx               # File Excel Test Case Sprint 2 (Tiếng Anh)
│   └── C1SE18_TestCase_Sprint2_ver1.0_VI.xlsx            # File Excel Test Case Sprint 2 (Tiếng Việt)
└── tests/sprint2/
    ├── conftest.py                                       # Sandbox cô lập PR0
    ├── test_s2_kb_rbac_otp_sync.py                       # 18 TC: KB/RBAC, Upload/File Watcher, Admin 2D RBAC, Email OTP
    ├── test_s2_deepeval_kg_lora.py                       # 4 TC: DeepEval đánh giá Kaggle LoRA, CUAD NER/RE, Qdrant 384-dim
    ├── test_s2_ui_playwright.py                          # 5 TC: Playwright UI E2E (Documents, Copilot, Graph, Admin)
    ├── locustfile_sprint2.py                             # Kịch bản tải Locust Sprint 2
    ├── run_locust_target_s2.py                           # Server FastAPI cô lập (cổng 5056) cho Locust
    ├── generate_sprint2_testcase_excel.py                # Script xuất đồng thời 2 file Excel EN & VI
    ├── HUONG_DAN_CHAY_TEST_SPRINT2.md                    # Tài liệu hướng dẫn này
    └── reports/                                          # Thư mục báo cáo HTML & CSV
```

---

## 2. Cách chạy từng bộ Automation Test Sprint 2

> Mở **PowerShell** tại thư mục gốc `d:\CAPSTONE1\graph-mind`.

### 2.1. Chạy `pytest` + `httpx` + `pytest-asyncio` + `DeepEval` (xuất HTML report)

```powershell
python -m pytest tests/sprint2/test_s2_kb_rbac_otp_sync.py tests/sprint2/test_s2_deepeval_kg_lora.py -v --html=tests/sprint2/reports/sprint2_pytest_report.html --self-contained-html
start tests\sprint2\reports\sprint2_pytest_report.html
```

### 2.2. Chạy `Playwright` (`pytest-playwright`) kiểm thử giao diện Sprint 2

**Terminal 1** — Bật Frontend Vite:

```powershell
cd frontend
npm run dev -- --port 5173 --host 127.0.0.1
```

**Terminal 2** — Chạy Playwright (thêm `--headed --slowmo 600` nếu muốn xem tận mắt trình duyệt tự thao tác):

```powershell
$env:GRAPHMIND_UI_URL="http://127.0.0.1:5173"
python -m pytest tests/sprint2/test_s2_ui_playwright.py -v --headed --slowmo 600 --html=tests/sprint2/reports/sprint2_playwright_report.html --self-contained-html
start tests\sprint2\reports\sprint2_playwright_report.html
```

### 2.3. Chạy `Locust` (`--headless`) kiểm thử tải Sprint 2

**Terminal 1** — Bật FastAPI test target (cổng `5056`):

```powershell
python tests/sprint2/run_locust_target_s2.py
```

**Terminal 2** — Chạy Locust headless (20 VUs, 5 VU/s trong 8–10 giây):

```powershell
python -m locust -f tests/sprint2/locustfile_sprint2.py --headless -u 20 -r 5 -t 10s --host http://127.0.0.1:5056 --csv tests/sprint2/reports/locust_sprint2 --html tests/sprint2/reports/locust_sprint2.html
start tests\sprint2\reports\locust_sprint2.html
```

### 2.4. Xuất lại cả 2 file Excel Test Case Sprint 2 (EN & VI)

```powershell
python tests/sprint2/generate_sprint2_testcase_excel.py
start "9. TEST CASE\C1SE18_TestCase_Sprint2_ver1.0_VI.xlsx"
```

---

## 3. Tóm tắt kết quả thực thi Sprint 2

| Phân hệ | Công cụ | Tổng TC | Đạt | Không đạt | Kết quả nổi bật |
|---|---|---:|---:|---:|---|
| 1. Kho tri thức & Xem trước | `pytest` | 4 | 4 | 0 | Đủ RBAC Scope BR-02, BR-04, BR-05 |
| 2. Tải lên & File Watcher | `pytest` + `httpx` | 4 | 4 | 0 | Status 200, chặn Agent Key sai, đủ vòng đời phê duyệt |
| 3. Quản trị & Ma trận RBAC 2D | `pytest` + `httpx` | 5 | 5 | 0 | Đủ 5 phòng ban, 4 role chuẩn, Audit Log bất biến |
| 4. Email OTP 3 bước & Phiên | `pytest` + `httpx` | 5 | 5 | 0 | 404/403/429/400 & TTL 5p / 3 lần thử |
| 5. UI Copilot-Graph & Tải | `Playwright` + `Locust` | 7 | 7 | 0 | 5/5 UI Pass; Locust 523 reqs, **0% lỗi**, **p95 = 10ms** |
| 6. CUAD KG & LoRA Kaggle | `DeepEval` | 4 | 4 | 0 | 4/4 DeepEval metrics đạt ngưỡng 1.00 |
| **Tổng cộng Sprint 2** | **5 nhóm công cụ** | **29** | **29** | **0** | **Tỷ lệ đạt: 100.00%** |
