# Hướng Dẫn Chạy Automation Testing — Sprint 1 (GraphMind / C1SE18)

Tài liệu này hướng dẫn cách cài đặt, chạy thực tế và xem báo cáo của toàn bộ bộ **Automation Testing Sprint 1** cho dự án **GraphMind**, sử dụng đầy đủ 5 nhóm công cụ:

1. **pytest** (kèm `httpx`, `pytest-asyncio`, `pytest-html`) — Kiểm thử API xác thực JWT, Single Active Session, Pipeline nạp dữ liệu & SHA-256, Kiến trúc Đa CSDL.
2. **Playwright** (`pytest-playwright`) — Kiểm thử giao diện E2E (Login, Validation, Forgot Password, Home & Dashboard theo phân quyền, hiệu năng tải SPA ≤ 2.0s).
3. **Locust** (`--headless`) — Kiểm thử tải cho các API Sprint 1 (`/api/v1/auth/login`, `/api/v1/auth/me`, `/health`).
4. **DeepEval** — Đánh giá tự động bộ dữ liệu **509 cặp ChatML Q&A** (`PB16`) và **Liên kết tổng hợp AdventureWorks–CUAD** (`PB47`).
5. **GitHub Actions + Docker Compose** — Quy trình CI tự động xác thực cấu hình Docker và chạy toàn bộ bộ test khi push/PR.

---

## 1. Cấu trúc thư mục

```text
graph-mind/
├── .github/workflows/ci.yml                              # Pipeline GitHub Actions + Docker Compose
├── 9. TEST CASE/
│   ├── C1SE18_TestCase_Sprint1_ver1.0.xlsx               # File Excel Test Case (Tiếng Anh)
│   └── C1SE18_TestCase_Sprint1_ver1.0_VI.xlsx            # File Excel Test Case (Tiếng Việt)
└── tests/sprint1/
    ├── conftest.py                                       # Sandbox cô lập (không chạm DB thật)
    ├── test_s1_auth_db_ingestion.py                      # 19 TC: Auth, Ingestion/SHA-256, Multi-Model DB & Docker
    ├── test_s1_deepeval_dataset.py                       # 5 TC: DeepEval đánh giá 509 Q&A & Synthetic Linking
    ├── test_s1_ui_playwright.py                          # 7 TC: Playwright UI E2E (Chromium)
    ├── locustfile_sprint1.py                             # Kịch bản tải Locust Sprint 1
    ├── run_locust_target.py                              # Server FastAPI cô lập (cổng 5055) cho Locust
    ├── generate_sprint1_testcase_excel.py                # Script xuất Excel bản Tiếng Anh
    ├── generate_sprint1_testcase_excel_vi.py             # Script xuất Excel bản Tiếng Việt
    ├── HUONG_DAN_CHAY_TEST_SPRINT1.md                    # Tài liệu hướng dẫn này
    └── reports/                                          # Thư mục chứa báo cáo HTML & CSV sau khi chạy
```

---

## 2. Chuẩn bị môi trường (chạy 1 lần nếu máy mới)

Mở **PowerShell** tại thư mục gốc `d:\CAPSTONE1\graph-mind`:

```powershell
# 1. Cài đặt các thư viện kiểm thử Python
pip install -r backend/requirements.txt pytest httpx pytest-asyncio pytest-html pytest-playwright locust deepeval openpyxl

# 2. Cài đặt trình duyệt Chromium cho Playwright (nếu chưa có)
python -m playwright install chromium

# 3. Cài đặt dependencies cho Frontend (nếu chưa cài)
cd frontend
npm install
cd ..
```

---

## 3. Hướng dẫn chạy từng bộ Automation Test

> Tất cả các lệnh dưới đây đều chạy từ thư mục gốc `d:\CAPSTONE1\graph-mind`.

### 3.1. Chạy `pytest` + `httpx` + `pytest-asyncio` + `DeepEval` (xuất báo cáo HTML)

```powershell
python -m pytest tests/sprint1/test_s1_auth_db_ingestion.py tests/sprint1/test_s1_deepeval_dataset.py -v --html=tests/sprint1/reports/sprint1_pytest_report.html --self-contained-html
```

Mở báo cáo HTML vừa tạo:

```powershell
start tests\sprint1\reports\sprint1_pytest_report.html
```

---

### 3.2. Chạy `Playwright` (`pytest-playwright`) kiểm thử giao diện

**Terminal 1** — Khởi chạy Frontend Vite:

```powershell
cd frontend
npm run dev -- --port 5173 --host 127.0.0.1
```

**Terminal 2** — Chạy Playwright:

- **Chế độ có giao diện (xem trực tiếp trình duyệt Chrome tự thao tác từng bước):**

```powershell
$env:GRAPHMIND_UI_URL="http://127.0.0.1:5173"
python -m pytest tests/sprint1/test_s1_ui_playwright.py -v --headed --slowmo 600 --html=tests/sprint1/reports/sprint1_playwright_report.html --self-contained-html
```

- **Chế độ chạy nền nhanh (headless, giống CI):**

```powershell
$env:GRAPHMIND_UI_URL="http://127.0.0.1:5173"
python -m pytest tests/sprint1/test_s1_ui_playwright.py -v --html=tests/sprint1/reports/sprint1_playwright_report.html --self-contained-html
```

Mở báo cáo Playwright HTML:

```powershell
start tests\sprint1\reports\sprint1_playwright_report.html
```

*(Sau khi chạy xong, bấm `Ctrl + C` ở Terminal 1 để tắt Vite.)*

---

### 3.3. Chạy `Locust` (`--headless`) kiểm thử tải Sprint 1

**Terminal 1** — Khởi chạy máy chủ FastAPI cô lập (cổng `5055`):

```powershell
python tests/sprint1/run_locust_target.py
```

**Terminal 2** — Chạy Locust headless (20 người dùng ảo, tốc độ tăng 5 VU/s trong 10 giây) và xuất báo cáo HTML + CSV:

```powershell
python -m locust -f tests/sprint1/locustfile_sprint1.py --headless -u 20 -r 5 -t 10s --host http://127.0.0.1:5055 --csv tests/sprint1/reports/locust_sprint1 --html tests/sprint1/reports/locust_sprint1.html
```

Mở báo cáo tải Locust:

```powershell
start tests\sprint1\reports\locust_sprint1.html
```

*(Sau khi xem xong, bấm `Ctrl + C` ở Terminal 1 để tắt server `5055`.)*

---

### 3.4. Kiểm tra `Docker Compose` và chạy `GitHub Actions`

- **Kiểm tra hợp lệ cấu hình Docker Compose tại máy:**

```powershell
docker compose -f docker-compose.yml config -q
echo "Exit code: $LASTEXITCODE"
```
*(Kết quả `Exit code: 0` là hợp lệ.)*

- **Chạy trên GitHub Actions:**
  - Workflow được cấu hình tại `.github/workflows/ci.yml` với 4 job chạy song song: `docker-compose-validate`, `sprint1-backend-and-deepeval`, `sprint1-playwright-ui`, và `sprint1-locust-headless`.
  - Khi push code lên nhánh hoặc bấm **Actions → GraphMind Sprint 1 Automation CI → Run workflow** trên GitHub, hệ thống sẽ tự động chạy toàn bộ và đính kèm các file báo cáo HTML/CSV trong mục **Artifacts**.

---

## 4. Xuất lại file Excel Test Case (Tiếng Anh & Tiếng Việt)

```powershell
# Xuất bản Tiếng Anh
python tests/sprint1/generate_sprint1_testcase_excel.py

# Xuất bản Tiếng Việt
python tests/sprint1/generate_sprint1_testcase_excel_vi.py

# Mở file Excel bản Tiếng Việt
start "9. TEST CASE\C1SE18_TestCase_Sprint1_ver1.0_VI.xlsx"
```

> **Lưu ý:** Khi mở file `.xlsx` bằng Microsoft Excel, Excel sẽ tự động tính lại toàn bộ các công thức `COUNTIF`, `SUM`, tỷ lệ `%` và vẽ lại biểu đồ trong sheet `Bao cao kiem thu` / `Test report`.

---

## 5. Tóm tắt kết quả thực thi Sprint 1 (mới nhất)

| Phân hệ | Công cụ | Tổng TC | Đạt | Không đạt | Ghi chú lỗi phát hiện |
|---|---|---:|---:|---:|---|
| 1. Xác thực & Phiên đơn | `pytest` + `httpx` + `Playwright` | 13 | 13 | 0 | — |
| 2. Trang chủ, Dashboard & Hiệu năng | `Playwright` + `Locust --headless` | 6 | 5 | 1 | `S1_PERF_02`: `p95 = 1500ms > 500ms` do 1 worker uvicorn chạy bcrypt đồng thời |
| 3. Nạp dữ liệu & SHA-256 | `pytest` + `pytest-asyncio` | 6 | 6 | 0 | — |
| 4. Đa CSDL & CI/Docker | `pytest` + `Docker Compose` | 5 | 5 | 0 | — |
| 5. Dữ liệu 509 Q&A & Liên kết | `DeepEval` | 5 | 4 | 1 | `S1_AI_05`: `443/509 (87.03%)` prompt duy nhất (66 cặp trùng lặp trong `train_dataset.json`) |
| **Tổng cộng** | **5 nhóm công cụ** | **35** | **33** | **2** | **Tỷ lệ đạt: 94.29%** |
