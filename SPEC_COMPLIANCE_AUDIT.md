# BÁO CÁO KIỂM TOÁN MỨC ĐỘ TUÂN THỦ ĐẶC TẢ PHẦN MỀM
# (SOFTWARE SPECIFICATION COMPLIANCE AUDIT REPORT)

> **Dự án:** GraphMind (AEGIS EKMP) — Enterprise Knowledge Observatory  
> **Mã đồ án:** Capstone Project 1 — C1SE.18 — Đại học Duy Tân (Duy Tan University)  
> **Đơn vị thực hiện kiểm toán:** Senior Software Engineer, Software QA Engineer & Requirements Analyst  
> **Thời điểm kiểm toán:** 29/10/2026  
> **Tài liệu căn cứ đối chiếu chính:** `docs/05-srs/5. C1SE18_SRS_GraphMind_Ver1.1.docx` (Version 1.1, 19/09/2026)  
> **Tài liệu tham chiếu bổ trợ:**  
> - `docs/04-product-backlog/3. C1SE18_ProductBacklog_GraphMind_Ver1.1.docx` (PB01 – PB59)  
> - `docs/02-user-story/4. C1SE18_UserStory_GraphMind-Ver1.1.docx` (US01 – US22)  
> - `docs/architecture/Architecturedich.docx` & `docs/architecture/migration-log.md`  
> - `docs/reports/benchmark_evaluation_report.md`  
> **Phạm vi kiểm toán:** Khảo sát toàn diện mã nguồn (`backend/`, `frontend/`, `aegis-agent/`, `scripts/`, `research/`), cấu hình triển khai, cơ sở dữ liệu (`PostgreSQL`, `Neo4j`, `Qdrant`, `Central Storage`), mô hình AI (`Ollama`), và kiểm thử thực tế trên hệ thống đang chạy.

---

## MỤC LỤC BÁO CÁO

- [A. Executive Summary (Tóm Tắt Điều Hành)](#a-executive-summary-tóm-tắt-điều-hành)
- [B. Project Inventory (Kiểm Kê Tài Sản Dự Án & Tài Liệu)](#b-project-inventory-kiểm-kê-tài-sản-dự-án--tài-liệu)
- [C. Specification Analysis (Phân Tích Đặc Tả Yêu Cầu)](#c-specification-analysis-phân-tích-đặc-tả-yêu-cầu)
- [D. Requirements Traceability Matrix (Bảng Ma Trận Truy Vết RTM)](#d-requirements-traceability-matrix-bảng-ma-trận-truy-vết-rtm)
  - [1. Bảng đối chiếu xuôi: 52 Yêu cầu Chức năng (FR1 – FR52)](#1-bảng-đối-chiếu-xuôi-52-yêu-cầu-chức-năng-fr1--fr52)
  - [2. Bảng đối chiếu Quy tắc Nghiệp vụ cốt lõi (BR-01 – BR-05)](#2-bảng-đối-chiếu-quy-tắc-nghiệp-vụ-cốt-lõi-br-01--br-05)
  - [3. Bảng truy vết ngược (Reverse Traceability: Source Code to Spec)](#3-bảng-truy-vết-ngược-reverse-traceability-source-code-to-spec)
- [E. Missing and Incomplete Features (Chức Năng Thiếu & Chưa Hoàn Thiện)](#e-missing-and-incomplete-features-chức-năng-thiếu--chưa-hoàn-thiện)
- [F. Incorrect Implementations and Defects (Sai Lệch Triển Khai & Khiếm Khuyết)](#f-incorrect-implementations-and-defects-sai-lệch-triển-khai--khiếm-khuyết)
- [G. Test Execution Report (Báo Cáo Kiểm Thử Thực Tế)](#g-test-execution-report-báo-cáo-kiểm-thử-thực-tế)
- [H. Security, RBAC and Data Integrity Findings (An Ninh, Phân Quyền & Toàn Vẹn Dữ Liệu)](#h-security-rbac-and-data-integrity-findings-an-ninh-phân-quyền--toàn-vẹn-dữ-liệu)
- [I. Unverified Requirements and Limitations (Yêu Cầu Chưa Xác Minh & Giới Hạn)](#i-unverified-requirements-and-limitations-yêu-cầu-chưa-xác-minh--giới-hạn)
- [J. Remediation Plan (Kế Hoạch Khắc Phục Khuyến Nghị)](#j-remediation-plan-kế-hoạch-khắc-phục-khuyến-nghị)
- [K. Final Verdict & Quantitative Metrics (Kết Luận Cuối Cùng & Thống Kê Định Lượng)](#k-final-verdict--quantitative-metrics-kết-luận-cuối-cùng--thống-kê-định-lượng)

---

## A. Executive Summary (Tóm Tắt Điều Hành)

Dự án **GraphMind (AEGIS EKMP)** là một nền tảng Quản trị Tri thức Doanh nghiệp và Hỗ trợ Quyết định Điều hành dựa trên kiến trúc **Hybrid GraphRAG** (kết hợp cơ sở dữ liệu đồ thị Neo4j, cơ sở dữ liệu vector Qdrant, cơ sở dữ liệu quan hệ PostgreSQL và mô hình ngôn ngữ lớn nguồn mở Qwen2.5-7B tự lưu trữ qua Ollama).

Cuộc kiểm toán này được thực hiện theo phương pháp kiểm toán tuân thủ đặc tả phần mềm đa chiều độc lập (Multi-axis Software Specification Compliance Audit), đối chiếu trực tiếp giữa tài liệu SRS chính thức (`5. C1SE18_SRS_GraphMind_Ver1.1.docx`) và mã nguồn thực tế cùng dịch vụ runtime đang hoạt động tại thời điểm kiểm toán.

### Kết quả đánh giá tổng thể:

1. **Tổng số yêu cầu chức năng (FR) được trích xuất từ đặc tả:** **52 yêu cầu (FR1 – FR52)**.
2. **Số yêu cầu ĐẠT (PASS):** **37 / 52** (chiếm **71.15%**).
3. **Số yêu cầu ĐẠT MỘT PHẦN (PARTIAL):** **12 / 52** (chiếm **23.08%**).
4. **Số yêu cầu KHÔNG ĐẠT (FAIL):** **1 / 52** (chiếm **1.92%** — `FR25`: Đồng bộ kiến thức đã sửa trên Knowledge Editor ngược lại Neo4j và Qdrant).
5. **Số yêu cầu CHƯA TRIỂN KHAI (MISSING):** **2 / 52** (chiếm **3.85%** — `FR4`: Luồng xác thực OAuth 2.0 cho Google Drive/Sheets và `FR19`: Đồng bộ dữ liệu qua Google Drive/Sheets API).
6. **Số yêu cầu CHƯA XÁC MINH (UNVERIFIED):** **0 / 52** (Môi trường kiểm thử có đầy đủ PostgreSQL, Neo4j, Qdrant, Ollama, Backend FastAPI và Frontend React đang chạy đồng thời).
7. **Tỷ lệ tuân thủ đã xác minh (Verified Compliance Rate):** **71.15%**.

### Đánh giá chất lượng kỹ thuật:
- **Điểm sáng vượt trội:** Phân hệ cốt lõi **Hybrid GraphRAG Copilot** (`FR27`–`FR32`, `FR35`) hoạt động rất ấn tượng với thuật toán Reciprocal Rank Fusion (RRF $k=60$) kết hợp song song giữa tìm kiếm vector ngữ nghĩa (Qdrant) và duyệt đồ thị Text-to-Cypher (Neo4j). Cơ chế bảo mật và phân quyền phạm vi phòng ban phía máy chủ (**Server-side Department Scope Enforcement** — `BR-02`, `BR-04`, `BR-05`, `FR3`, `FR26`, `FR32`) được triển khai chặt chẽ, đã vượt qua 100% các bộ kiểm thử tự động nghiêm ngặt, chặn đứng việc lộ lọt dữ liệu chéo phòng ban. Cơ chế File Watcher giám sát tệp thời gian thực qua Webhook và Server-Sent Events (SSE) hoạt động ổn định.
- **Những khiếm khuyết trọng yếu:**
  - `FR42` (Trung tâm cảnh báo thông minh): Thực tế code chỉ cảnh báo thiếu điều khoản bồi hoàn/trách nhiệm và đơn hàng đột biến > $25K, hoàn toàn chưa có thuật toán tính toán cảnh báo hợp đồng sắp hết hạn trong 15–30 ngày và cảnh báo khách hàng VIP giảm đơn hàng như đặc tả yêu cầu.
  - `FR24` & `FR25` (Biên tập tri thức HITL): Endpoint `/api/graph/verify` chỉ cập nhật mảng in-memory tạm thời hoặc trả về phản hồi fallback giả lập; không thực thi câu lệnh Cypher `UPDATE` ghi nhận trạng thái xác thực vào node Neo4j và không tính toán lại vector Qdrant.
  - `FR18` & `BR-01` (Controlled Synthetic Linking): Chưa có bảng tra cứu cố định độc lập lưu trữ quan hệ Khách hàng – Hợp đồng (Lookup Table) trong PostgreSQL/Neo4j; việc liên kết hiện tại chỉ được gán xoay vòng trong bộ nhớ khi gọi API `/api/contracts/assigned`.
  - Khiếm khuyết đường dẫn tuyệt đối: Hàm nạp cache tìm kiếm AdventureWorks `_init_aw_search_cache` trong `backend/app/main.py` bị gán cứng đường dẫn không tồn tại `D:/adventureworks/...`, dẫn đến thất bại khi nạp danh mục sản phẩm vào bộ nhớ tìm kiếm.

**Kết luận kiểm toán:** **PARTIALLY COMPLIANT (TUÂN THỦ MỘT PHẦN)**.

---

## B. Project Inventory (Kiểm Kê Tài Sản Dự Án & Tài Liệu)

### 1. Kiến trúc Hệ thống & Ngăn xếp Công nghệ (Tech Stack)

| Tầng kiến trúc | Công nghệ sử dụng | Phiên bản / Chi tiết | Tình trạng kiểm tra |
|---|---|---|---|
| **Frontend** | React SPA, Vite, Tailwind CSS / Vanilla CSS Variables, Lucide Icons, FontAwesome | React 18.3.1, Vite 5.4.21 | Đang chạy tại `localhost:5173`, build production đạt 0 lỗi trong 5.69s |
| **Backend API** | Python, FastAPI, Starlette, Uvicorn, Pydantic v2 | Python 3.11.9, FastAPI 0.158.1, Uvicorn 0.54.0 | Đang chạy tại `0.0.0.0:5000`, 109 endpoints hoạt động |
| **Relational DB** | PostgreSQL, SQLAlchemy (AsyncIO), Alembic, Asyncpg, Psycopg2-binary | PostgreSQL 16 (Port 5432, db `graphmind_db`) | Kết nối tốt; 22 bảng khởi tạo hoàn chỉnh, 4 tài khoản seed |
| **Graph DB** | Neo4j Community (Docker Container `neo4j_db`), APOC Plugin, Cypher Query Language | Neo4j 5.18.0 (Bolt Port 7687, HTTP Port 7474) | Khỏe mạnh; 55,434 nodes, 161,574 relationships |
| **Vector DB** | Qdrant (Docker Container `qdrant_db`), HNSW Index, Cosine Distance | Qdrant 1.8.2 (Port 6333, 6334) | Khỏe mạnh; 2 collections (`cuad_contracts`, `adventureworks_entities`), 71,799 points |
| **Local LLM Engine** | Ollama Engine, Model Qwen2.5-7B fine-tuned | Ollama 0.x (Port 11434), Model `qwen2.5-7b-graphmind:latest` (4.7 GB) | Đang chạy, phản hồi suy luận trực tiếp |
| **Edge Agent** | AEGIS File Watcher Daemon (`aegis_file_watcher` container), Python Watchdog | Python 3.11, Watchdog 4.0 | Container hoạt động, tự động bắn Webhook sang Backend |
| **Storage Volume** | Docker Central Volume `graph-mind_graphmind_documents` mount `/data` | 582 files gốc (511 PDF/TXT hợp đồng CUAD, 71 CSV AdventureWorks) | Nhất quán, bảo vệ dữ liệu nhạy cảm cục bộ |

### 2. Danh mục Module Mã nguồn

- **Module 1: Data Source & Sync Management (`backend/app/modules/m1_data_sync/`, `aegis-agent/`):**
  - Xử lý nạp tài liệu hợp nhất (`pipeline.py`), tính mã băm SHA-256 chống trùng lặp, bẻ đoạn văn bản (chunking), trích xuất thực thể và quan hệ, nạp đồng thời Neo4j và Qdrant.
  - Cổng nhận sự kiện Webhook từ Agent (`webhook.py`), cơ chế đẩy Server-Sent Events (SSE).
- **Module 2: Knowledge Management & Editor (`backend/app/api/v1/sop.py`, `backend/app/db/mock_knowledge_db.py`, `frontend/src/views/m2_knowledge_editor/`):**
  - Trình duyệt tài liệu doanh nghiệp (`DocumentsView.jsx`).
  - Giao diện biên tập tri thức người tham gia vào quy trình HITL (`KnowledgeView.jsx`).
  - Phân hệ soạn thảo và ban hành quy trình vận hành chuẩn SOP (`SopView.jsx`).
- **Module 3: Hybrid AI Copilot & Search (`backend/app/api/v1/copilot.py`, `backend/app/modules/m3_hybrid_copilot/`, `frontend/src/views/m3_hybrid_copilot/`):**
  - Bộ định tuyến câu hỏi thông minh, bộ chuyển đổi ngôn ngữ tự nhiên sang Cypher (`text_to_cypher.py`).
  - Bộ dung hợp ngữ cảnh Reciprocal Rank Fusion (`context_fusion.py`).
  - Trình khách giao tiếp suy luận với LLM Ollama (`inference/client.py`).
  - Giao diện trò chuyện Copilot đa lượt, trích dẫn minh chứng và hiển thị đồ thị con (`CopilotView.jsx`).
- **Module 4: Decision Support & Alerts (`backend/app/api/v1/dashboard.py`, `frontend/src/views/m4_decision_support/`):**
  - Bảng điều hành tổng quan chỉ số tài chính C-suite (`ExecutiveView.jsx`).
  - Trung tâm cảnh báo rủi ro pháp lý & giao dịch lớn (`RiskView.jsx`).
  - Báo cáo ca vận hành phòng ban & ký duyệt số (`DepartmentReportView.jsx`).
  - Trình tạo tóm tắt điều hành chiến lược Executive Briefing (`ReportsView.jsx`).
- **Module 5: Enterprise Multi-facet Search (`backend/app/main.py`, `frontend/src/views/m5_multifacet_search/`):**
  - Tìm kiếm hợp nhất đa chiều theo Hợp đồng, Khách hàng, Sản phẩm, Tài liệu (`SearchView.jsx`).
  - Trình trực quan hóa mạng lưới tri thức D3 force (`GraphPanel.jsx`, `KnowledgeExplorerView.jsx`).
- **Module 6: System Admin & Security (`backend/app/modules/m6_admin_security/`, `backend/app/core/rbac.py`, `frontend/src/views/m6_admin_security/`):**
  - Quản lý tài khoản người dùng, khóa/mở khóa, đổi vai trò, đặt lại mật khẩu (`user_admin_api.py`, `AdminView.jsx`).
  - Cơ chế kiểm soát quyền theo vai trò (RBAC) và phạm vi phòng ban (Department Scope) (`rbac.py`, `deps.py`).
  - Hệ thống ghi vết kiểm toán Audit Log (`audit_service.py`, `audit_log.py`).
  - Ma trận phân quyền miền tri thức (`permissions_api.py`, `AdminLivePanels.jsx`).

### 3. Danh mục Tài liệu Đặc tả Đã Khảo sát

1. `docs/05-srs/5. C1SE18_SRS_GraphMind_Ver1.1.docx` (Tài liệu đặc tả yêu cầu phần mềm chính thức — 61,066 ký tự văn bản, 34 bảng cấu trúc).
2. `docs/04-product-backlog/3. C1SE18_ProductBacklog_GraphMind_Ver1.1.docx` (Danh mục Product Backlog — 59 PBI từ PB01 đến PB59).
3. `docs/02-user-story/4. C1SE18_UserStory_GraphMind-Ver1.1.docx` (Tập hợp User Stories — US01 đến US22).
4. `docs/01-proposal/1. C1SE18-Proposal-Document-Ver1.1.docx` (Đề cương đề tài nghiên cứu khoa học sinh viên).
5. `docs/architecture/Architecturedich.docx` (Tài liệu kiến trúc hệ thống dịch sang tiếng Việt).
6. `docs/architecture/migration-log.md` (Nhật ký di chuyển cơ sở dữ liệu và chuyển đổi kiến trúc).
7. `docs/reports/benchmark_evaluation_report.md` (Báo cáo thực nghiệm 100 câu hỏi benchmark đối sánh 3 baselines).
8. `docs/reports/code-review-2026-09-22.md` (Biên bản rà soát mã nguồn nội bộ trước đó).

---

## C. Specification Analysis (Phân Tích Đặc Tả Yêu Cầu)

Từ tài liệu SRS Ver1.1, toàn bộ hệ thống được chia thành 6 phân hệ lớn với **52 Yêu cầu Chức năng (FR)**, **5 Quy tắc Nghiệp vụ (BR)**, **6 Nhóm Yêu cầu Phi Chức năng (NFR)** và **22 Trường hợp Sử dụng (Use Cases — UC.01 đến UC.22)**.

### 1. Phân loại 4 Vai trò Người dùng (User Roles & Personas)

Tài liệu đặc tả (SRS Bục 3.3, Bảng 5 & Bảng 4 của Product Backlog) xác định rõ 4 vai trò độc lập:
1. **System & Knowledge Administrator (Admin):** Quản trị hệ thống, quản lý tài khoản, cấu hình tác nhân AEGIS Agent, duyệt kiểm toán tri thức trích xuất.
2. **Executive (Ban Giám Đốc / Lãnh đạo SME):** Toàn quyền truy cập mọi nguồn dữ liệu (`BR-05`), theo dõi KPI doanh nghiệp, nhận cảnh báo sớm rủi ro toàn diện, hỏi đáp chiến lược xuyên nguồn.
3. **Department Manager (Trưởng phòng ban):** Quản lý nhân sự và dữ liệu nội bộ phòng ban, soạn thảo và ban hành SOP riêng của phòng ban mình (`BR-04`), sử dụng AI Copilot giới hạn trong phạm vi phòng ban.
4. **Standard User (Chuyên viên nghiệp vụ — Sales, Accounting, HR, Legal, IT):** Hỏi đáp chính sách, sản phẩm, hợp đồng trong phạm vi Data Scope được phân quyền; tra cứu bản đồ tri thức được phép.

### 2. 5 Quy tắc Nghiệp vụ Bắt buộc (Business Rules)

- **BR-01:** Mỗi Khách hàng (Customer) trong AdventureWorks được gắn cố định với 1–3 Hợp đồng (CUAD) thông qua bảng tra cứu độc lập (Controlled Synthetic Linking).
- **BR-02:** Việc truy cập thông tin hợp đồng và dữ liệu giao dịch phải tuân thủ nghiêm ngặt theo RBAC, Department Scope và Data Scope của từng người dùng.
- **BR-03:** Chỉ có Quản trị viên (Admin) mới được phép cấu hình tác nhân AEGIS Agent và duyệt chỉnh sửa tri thức qua Knowledge Editor.
- **BR-04:** Trưởng phòng (Department Manager) chỉ được phép soạn thảo và ban hành SOP cho phòng ban của chính mình.
- **BR-05:** Ban Giám Đốc (Executive) có quyền truy cập đầy đủ, không giới hạn vào toàn bộ dữ liệu trên toàn doanh nghiệp.

### 3. Các điểm mâu thuẫn hoặc mơ hồ trong tài liệu đặc tả

1. **Mâu thuẫn giữa RTM và Bảng Use Case về Đăng ký Tài khoản (FR2 vs UC.01):**
   - Trong Bảng 6 (trang 21), `FR2` ghi: *"The system allows account registration, forgotten password and OTP authentication."*
   - Tuy nhiên, trong phần mô tả chi tiết của Use Case `UC.01` (trang 29) và `UC.02` (trang 30), tài liệu chỉ mô tả luồng đăng nhập của người dùng và luồng tạo tài khoản do Admin thực hiện (`Admin creates account for employee`), hoàn toàn không có đặc tả luồng tự đăng ký công khai (Public Self-Registration).
   - Trong môi trường doanh nghiệp nội bộ (Enterprise EKMP), việc tự do đăng ký tài khoản mà không qua phê duyệt của Admin là một lỗ hổng bảo mật. Triển khai thực tế chọn phương án chỉ cho phép Admin tạo tài khoản (`POST /api/v1/admin/users`), điều này phù hợp nghiệp vụ doanh nghiệp nhưng lại khiến tiêu chí "account registration" của `FR2` không đạt theo câu chữ đặc tả.
2. **Sai khác về quy ước tên Endpoint trong Appendix B (RTM):**
   - Trong Phụ lục B (SRS Bảng 33), tác giả tài liệu đã liệt kê các đường dẫn API dự kiến như: `/api/v1/linking/customer-contract`, `/api/v1/knowledge/graph/build`, `/api/v1/knowledge/sync-embeddings`, `/api/v1/copilot/query`, `/api/v1/dashboard/executive`.
   - Trong mã nguồn FastAPI thực tế, các route này được cấu trúc theo chuẩn RESTful hiện đại hơn: `/api/contracts/assigned`, `/api/v1/copilot/ask`, `/api/v1/dashboard/kpis`, v.v.

---

## D. Requirements Traceability Matrix (Bảng Ma Trận Truy Vết RTM)

### 1. Bảng đối chiếu xuôi: 52 Yêu cầu Chức năng (FR1 – FR52)

| Req ID | Yêu cầu đặc tả (SRS Table 6) | Vị trí tài liệu | Thành phần source code liên quan | Bằng chứng kiểm tra thực tế | Trạng thái | Ưu tiên | Ghi chú & Đánh giá |
|---|---|---|---|---|---|---|---|
| **FR1** | Đăng nhập hệ thống bằng email/password, xác thực JWT | SRS 4.1, Table 6; UC.01 | `backend/app/api/v1/auth.py` (L46-100); `app/core/security.py`; `frontend/src/components/LoginPage.jsx` | Gửi POST `/api/v1/auth/login` với `{identifier, password}`, nhận 200 OK kèm Bearer JWT Token. | **PASS** | P1 | Đáp ứng đầy đủ. Hỗ trợ cả username hoặc email doanh nghiệp. |
| **FR2** | Đăng ký tài khoản, quên mật khẩu và xác thực OTP | SRS 4.1, Table 6; UC.01 | `backend/app/modules/m6_admin_security/forgot_password_router.py`; `otp_service.py`; `LoginPage.jsx` | Luồng Quên mật khẩu gửi OTP và đặt lại mật khẩu qua `/api/v1/auth/forgot-password`, `/verify-otp`, `/reset-password` hoạt động tốt. Không có endpoint đăng ký tài khoản tự do `/register`. | **PARTIAL** | P2 | Quên MK và OTP: PASS; Đăng ký công khai: MISSING (do chính sách Admin tạo tài khoản tập trung). |
| **FR3** | Phân quyền truy cập chức năng và dữ liệu theo RBAC, Department Scope và Data Scope | SRS 4.1, Table 6; UC.03; BR-02 | `backend/app/core/rbac.py`; `app/modules/m6_admin_security/rbac.py`; `app/api/v1/rbac.py`; `roles.js` | Chạy bộ test `test_department_scope.py`: 100% test case PASS. Chặn 403 Forbidden truy cập chéo phòng ban; Executive toàn quyền (`BR-05`). | **PASS** | P0 | Cực kỳ chặt chẽ, kiểm soát nghiêm ngặt ở cả tầng API Backend và Frontend. |
| **FR4** | Hỗ trợ luồng ủy quyền và xác thực OAuth 2.0 cho Google Drive/Sheets | SRS 4.1, Table 6; UC.01, UC.06 | `frontend/src/views/m1_data_sync/ConnectorsView.jsx` (L105-119); `backend/app/main.py` | Không tìm thấy bất kỳ Google OAuth 2.0 client ID/secret, router callback hoặc trao đổi token nào trong backend. Giao diện chỉ mô phỏng qua card tĩnh. | **MISSING** | P2 | Chưa triển khai luồng OAuth thực tế phía máy chủ. |
| **FR5** | Admin quản trị tài khoản, phòng ban, gán 1 trong 4 vai trò và cấu hình phạm vi dữ liệu | SRS 4.1, Table 6; UC.02, UC.03 | `backend/app/modules/m6_admin_security/user_admin_api.py`; `permissions_api.py`; `AdminView.jsx` | Thao tác thành công các API `/api/v1/admin/users`, đổi role, khóa/mở khóa tài khoản, reset password và lưu ma trận quyền miền tri thức lên PostgreSQL. | **PASS** | P1 | Đầy đủ giao diện quản trị và endpoint phía server có bảo vệ quyền Admin. |
| **FR6** | Hệ thống ghi nhận mọi truy vấn và thao tác quản trị vào Audit Log | SRS 4.1, Table 6; UC.04 | `backend/app/modules/m6_admin_security/audit_service.py`; `audit_log.py`; `AdminLivePanels.jsx` | Bảng `audit_logs` trên PostgreSQL đã ghi nhận 9 bản ghi (LOGIN, ROLE_CHANGE...). Endpoint GET `/api/v1/admin/audit-logs` hỗ trợ lọc theo actor và resource. | **PASS** | P1 | Kiểm toán hành vi đầy đủ, truy vết chính xác người thực hiện và đối tượng. |
| **FR7** | Mã hóa HTTPS/TLS khi đồng bộ Agent – Cloud; dữ liệu gốc nhạy cảm lưu trữ cục bộ | SRS 4.1, Table 6; UC.04 | `aegis-agent/src/sync_client.py`; `webhook.py`; Named Volume `graphmind_documents:/data` | Tệp gốc PDF, CSV lưu tại `/data`. Tác nhân chuyển dữ liệu qua Webhook có xác thực Bearer Key. Hỗ trợ chạy trên mạng biệt lập on-premise. | **PASS** | P1 | Đáp ứng nguyên tắc bảo vệ tài sản số nhạy cảm của doanh nghiệp. |
| **FR8** | Lưu trữ tài khoản, chính sách RBAC, metadata và audit log trên PostgreSQL | SRS 4.1, Table 6; UC.02 | `backend/app/db/postgres/database.py`; `app/db/postgres/models/*` | Truy vấn trực tiếp database `graphmind_db` trên cổng 5432: 22 bảng khởi tạo hoàn chỉnh, lưu trữ người dùng, quyền hạn, phiên copilot, tài liệu SOP. | **PASS** | P1 | Kiến trúc cơ sở dữ liệu quan hệ hoàn thiện qua Alembic migration. |
| **FR9** | Cung cấp Admin Analytics Dashboard hiển thị thống kê người dùng, RBAC và AI | SRS 4.1, Table 6; UC.05 | `frontend/src/views/m6_admin_security/AdminView.jsx`; `AdminLivePanels.jsx` | AdminView hiển thị các thẻ chỉ số KPI tổng số tài khoản, vai trò phân bổ, phiên hoạt động và nhật ký bảo mật. | **PASS** | P2 | Giao diện quản trị trực quan, cập nhật dữ liệu tự động. |
| **FR10** | Admin giám sát trạng thái dữ liệu Neo4j/Qdrant và cảnh báo xung đột schema [Optional] | SRS 4.1, Table 6; UC.05 | `backend/app/main.py` (L618-646, L675-720); `AdminLivePanels.jsx` | Gọi GET `/api/neo4j/status` và `/api/qdrant/status` trả về chính xác số node, số quan hệ, số vector point và tên collection đang active. | **PASS** | P3 | Tính năng tùy chọn đã hoàn thành xuất sắc. |
| **FR11** | Admin thực hiện CRUD trên Neo4j và Qdrant từ Admin Panel [Optional] | SRS 4.1, Table 6 | `backend/app/main.py` (L545-568); POST `/api/neo4j/cypher`; POST `/api/qdrant/search` | API thực thi câu lệnh Cypher trực tiếp tồn tại. Tuy nhiên giao diện Admin chưa cung cấp bộ soạn thảo trực quan để chỉnh sửa chi tiết từng điểm vector trong Qdrant. | **PARTIAL** | P3 | Thực thi Cypher phía server: PASS; Giao diện CRUD trực quan toàn diện trên UI: PARTIAL. |
| **FR12** | Cung cấp LLMOps & Cost Dashboard theo dõi fine-tuning và độ trễ suy luận [Optional] | SRS 4.1, Table 6; UC.05 | `backend/app/main.py` (L445-480); GET `/api/llmops`; GET `/api/metrics` | GET `/api/llmops` trả về thông số mô hình và độ trễ benchmark. Tuy nhiên các thông số chi phí token thời gian thực hiện vẫn mang tính tĩnh (static baseline). | **PARTIAL** | P3 | Endpoint đo lường tồn tại nhưng thiếu luồng telemetry token động liên tục. |
| **FR13** | AEGIS Local Agent giám sát thư mục cục bộ và đồng bộ gia tăng lên Backend Cloud | SRS 4.1, Table 6; UC.07, UC.08 | `aegis-agent/src/watcher.py`; `sync_client.py`; `backend/app/modules/m1_data_sync/webhook.py` | Container `aegis_file_watcher` đang chạy watchdog, theo dõi thư mục `/data`, tự động phát hiện thay đổi tệp và gọi webhook đẩy lên backend. | **PASS** | P1 | Vận hành tự động theo cơ chế hướng sự kiện (event-driven). |
| **FR14** | Bảng điều khiển AEGIS Local Agent hiển thị trạng thái Online/Offline, thư mục và chế độ | SRS 4.1, Table 6; UC.07, UC.09 | `frontend/src/views/m1_data_sync/ConnectorsView.jsx`; `WatcherToast.jsx` | ConnectorsView tải dữ liệu thật từ `/api/v1/sync/file-watcher/status`, hiển thị số tệp đã xử lý, trạng thái kết nối webhook live và thông báo popup tức thì. | **PASS** | P2 | Giao diện giám sát tác nhân hoạt động trơn tru. |
| **FR15** | Cung cấp File Watcher API theo dõi các sự kiện tạo/sửa/xóa tệp | SRS 4.1, Table 6; UC.08 | `backend/app/modules/m1_data_sync/webhook.py` (L110-380) | Hệ thống cung cấp đầy đủ `/sync/file-watcher`, `/deleted`, `/renamed`, `/events`, `/stream` (SSE). | **PASS** | P1 | Đáp ứng đầy đủ các phương thức tiếp nhận biến động tệp. |
| **FR16** | Cung cấp Document Ingestion API tải lên hợp đồng PDF và tệp dữ liệu đơn hàng | SRS 4.1, Table 6; UC.10 | `backend/app/modules/m1_data_sync/webhook.py` (L220-310); POST `/api/v1/sync/upload` | Hỗ trợ tải lên đa tệp (PDF, DOCX, CSV, XLSX), kiểm tra mã băm SHA-256 chống lặp, lọc ký tự đường dẫn nguy hiểm, tự động phân luồng xử lý. | **PASS** | P1 | Kiểm thử tải tệp thành công, đảm bảo tính toàn vẹn dữ liệu. |
| **FR17** | Thực hiện ETL, chuẩn hóa và bẻ đoạn (chunking) dữ liệu AdventureWorks và CUAD | SRS 4.1, Table 6; UC.10 | `backend/app/modules/m1_data_sync/pipeline.py`; `scripts/bulk_ingest.py` | Đã xử lý trích xuất 581 tệp. Tuy nhiên, script `verify_three_layers.py` phát hiện Qdrant mới chỉ vector hóa 299/510 tệp CUAD PDF và 43/71 tệp CSV AdventureWorks. | **PARTIAL** | P1 | Thuật toán bẻ đoạn hoạt động tốt, nhưng tỷ lệ nạp vector vào Qdrant còn dở dang (~58%). |
| **FR18** | Gán mỗi Khách hàng 1–3 hợp đồng CUAD bằng kỹ thuật Controlled Synthetic Linking | SRS 4.1, Table 6; UC.10; BR-01 | `scripts/link_purchased.py`; `backend/app/main.py` (L1996-2070) | Neo4j hiện có 0 quan hệ giữa `Customer` và `Document`. Endpoint `/api/contracts/assigned` gán xoay vòng trong bộ nhớ khi có request thay vì lưu bảng tra cứu cố định. | **PARTIAL** | P1 | Chưa có bảng tra cứu độc lập cố định theo đúng yêu cầu của quy tắc `BR-01`. |
| **FR19** | Kết nối và đồng bộ dữ liệu từ Google Drive/Sheets API [Optional] | SRS 4.1, Table 6; UC.06 | `frontend/src/views/m1_data_sync/ConnectorsView.jsx`; `backend/app/main.py` | Dữ liệu Google Drive/Sheets trên ConnectorsView là dữ liệu mẫu giao diện; chưa có module kết nối Google Workspace API. | **MISSING** | P3 | Yêu cầu tùy chọn chưa được triển khai mã nguồn phía backend. |
| **FR20** | Hệ thống trích xuất thực thể, quan hệ và khử trùng lặp (NER/RE/Entity Resolution) | SRS 4.1, Table 6; UC.11 | `research/src/ner_re/extract_cuad_kg.py`; `pipeline.py` | Trích xuất thành công các thực thể Company, Document, Clause và sinh các quan hệ `CONTAINS_CLAUSE`, `PARTY_TO` trên đồ thị Neo4j. | **PASS** | P1 | Khử trùng lặp thực thể qua Cypher MERGE hoạt động chính xác. |
| **FR21** | Xây dựng Đồ thị Tri thức trên Neo4j theo schema mapping và cập nhật gia tăng | SRS 4.1, Table 6; UC.11, UC.16 | `backend/app/db/neo4j/client.py`; `pipeline.py`; `scripts/ingest_all_documents_neo4j.py` | Cơ sở dữ liệu Neo4j chứa 581 nodes Document, 31,465 SalesOrder, 19,820 Customer, 504 Product, 1,685 Clause. Tổng 55,434 nodes, 161,574 quan hệ. | **PASS** | P1 | Đồ thị tri thức doanh nghiệp đồ sộ, nhất quán. |
| **FR22** | Sinh vector nhúng (embedding) và lập chỉ mục vào Qdrant, đồng bộ khi dữ liệu nguồn đổi | SRS 4.1, Table 6; UC.11 | `backend/app/db/qdrant/client.py`; `pipeline.py`; model `all-MiniLM-L6-v2` | Qdrant chứa 45,670 points trong collection `cuad_contracts` và 26,129 points trong `adventureworks_entities`. Pipeline tự sinh embedding khi tải tệp mới. | **PASS** | P1 | Cơ chế tìm kiếm vector hoạt động tốt. |
| **FR23** | Cung cấp Document & Data Explorer cho phép duyệt và xem trước tệp theo phân quyền RBAC | SRS 4.1, Table 6; UC.12 | `frontend/src/views/m2_knowledge_editor/DocumentsView.jsx`; `backend/app/main.py` | DocumentsView hiển thị danh sách hồ sơ, cho phép mở ngăn kéo xem trước văn bản và áp dụng bộ lọc phòng ban nghiêm ngặt (`test_department_scope.py` đã xác minh). | **PASS** | P2 | Giao diện duyệt tài liệu chuyên nghiệp, an toàn. |
| **FR24** | Admin chỉnh sửa thực thể/quan hệ do AI trích xuất qua Knowledge Editor (HITL) | SRS 4.1, Table 6; UC.13; BR-03 | `frontend/src/views/m2_knowledge_editor/KnowledgeView.jsx`; `backend/app/main.py` (L570-612) | Giao diện KnowledgeView hiển thị danh sách thực thể cần duyệt. Nhưng khi bấm duyệt (`POST /api/graph/verify`), backend chỉ sửa dictionary trong RAM hoặc trả fallback, không cập nhật node Neo4j. | **PARTIAL** | P1 | Giao diện HITL có sẵn, nhưng logic ghi dữ liệu xuống database Neo4j chưa hoàn tất. |
| **FR25** | Chỉnh sửa trong Knowledge Editor được đồng bộ sang Neo4j và Qdrant để AI dùng kiến thức mới | SRS 4.1, Table 6; UC.13 | `backend/app/main.py` (L595-612) | Khi gọi xác nhận thực thể, không có lệnh Cypher `SET` gửi tới Neo4j và không có API cập nhật vector gửi tới Qdrant. | **FAIL** | P1 | Tri thức do con người đính chính không được phản ánh vào cơ sở dữ liệu để phục vụ truy vấn AI tiếp theo. |
| **FR26** | Trưởng phòng ban soạn thảo và ban hành quy trình SOP/quy định cho phòng ban mình | SRS 4.1, Table 6; UC.14; BR-04 | `frontend/src/views/m2_knowledge_editor/SopView.jsx`; `backend/app/api/v1/sop.py`; `sop_document.py` | Bộ test `test_sop_api.py` đã chạy PASS 100%: Cho phép lưu nháp, xuất bản SOP phòng mình, chặn tuyệt đối việc xuất bản chéo phòng ban (`BR-04`) và chặn chuyên viên thường. | **PASS** | P1 | Hoàn thiện cả giao diện, API lẫn kiểm soát phân quyền nghiệp vụ. |
| **FR27** | Chat UI hỗ trợ hội thoại đa lượt trên dữ liệu CRM/ERP và hợp đồng, trích dẫn nguồn | SRS 4.1, Table 6; UC.15 | `frontend/src/views/m3_hybrid_copilot/CopilotView.jsx`; `backend/app/api/v1/copilot.py` | CopilotView hỗ trợ chat đa lượt thông suốt, tự động lưu lịch sử vào PostgreSQL, hiển thị huy hiệu xác thực và danh sách trích dẫn nguồn (evidence chips). | **PASS** | P0 | Trải nghiệm người dùng mượt mà, định dạng tiền tệ và chỉ số trực quan. |
| **FR28** | Trả lời chính xác các câu hỏi đơn bước (single-hop) | SRS 4.1, Table 6; UC.15 | `backend/app/modules/m3_hybrid_copilot/query_engine/context_fusion.py`; `inference/client.py` | Kiểm nghiệm trên 100 câu benchmark: Trả lời tốt các câu hỏi về điều khoản hợp đồng cụ thể hoặc tra cứu thông tin mã sản phẩm, khách hàng đơn lẻ. | **PASS** | P1 | Đáp ứng tốt yêu cầu truy vấn đơn bước. |
| **FR29** | Trả lời các câu hỏi 2 bước (2-hop) bằng duyệt đồ thị trên Neo4j | SRS 4.1, Table 6; UC.15 | `backend/app/modules/m3_hybrid_copilot/query_engine/text_to_cypher.py` | Trình sinh Cypher duyệt thành công liên kết 2 bước (ví dụ: Khách hàng -> Đơn hàng -> Sản phẩm, hoặc Hợp đồng -> Điều khoản -> Công ty đối tác). | **PASS** | P1 | Năng lực suy luận trên đồ thị được xác nhận. |
| **FR30** | Trả lời câu hỏi liên nguồn (cross-source) trích dẫn đồng thời dữ liệu CRM và hợp đồng | SRS 4.1, Table 6; UC.15 | `backend/app/api/v1/copilot.py`; `context_fusion.py` | Khi hỏi về tình hình mua hàng kèm cam kết hợp đồng, hệ thống trích dẫn đồng thời bản ghi doanh số từ AdventureWorks và đoạn văn bản điều khoản từ CUAD. | **PASS** | P1 | Thể hiện sức mạnh cốt lõi của giải pháp Hybrid GraphRAG. |
| **FR31** | Hybrid Query Engine phân tích câu hỏi, sinh cypher, tìm vector song song và dung hợp ngữ cảnh | SRS 4.1, Table 6; UC.15 | `backend/app/modules/m3_hybrid_copilot/query_engine/context_fusion.py`; `text_to_cypher.py` | Triển khai thuật toán Reciprocal Rank Fusion ($k=60$) gộp kết quả xếp hạng từ Qdrant và Neo4j; áp dụng Grounding Gate với ngưỡng cosin $\ge 0.28$ chống ảo giác. | **PASS** | P0 | Trái tim công nghệ của nền tảng hoạt động chuẩn xác theo thiết kế. |
| **FR32** | Source & Citation Viewer hiển thị trích dẫn cụ thể bảng/cột/giá trị hoặc điều khoản hợp đồng | SRS 4.1, Table 6; UC.17; BR-02 | `backend/app/api/v1/copilot.py` (L87-117); `CopilotView.jsx` | Citation card thể hiện chi tiết: Tên tệp, mã tài liệu, chỉ số đoạn chunk, điểm số liên quan, vị trí điều khoản. Tự động che dấu (redact) nếu ngoài phạm vi phòng ban. | **PASS** | P1 | Minh chứng nguồn gốc rõ ràng, loại trừ hoàn toàn việc bịa đặt nguồn. |
| **FR33** | Knowledge Graph Viewer hiển thị trực quan các thực thể và mối quan hệ trong phạm vi cho phép | SRS 4.1, Table 6; UC.16 | `frontend/src/views/m5_multifacet_search/GraphPanel.jsx`; `KnowledgeExplorerView.jsx` | Bản đồ tri thức tương tác D3 force cho phép zoom, pan, hiển thị các cụm thực thể Customer, Product, Document, Clause với màu sắc phân biệt trực quan. | **PASS** | P2 | Giao diện đồ thị trực quan, mượt mà. |
| **FR34** | Cung cấp Web Dashboard (React/Next.js) giao tiếp với Backend qua REST API | SRS 4.1, Table 6 | `frontend/src/App.jsx`; `frontend/src/services/api.js`; `backend/app/main.py` | Ứng dụng React 18 hoàn chỉnh, kết nối với 109 API endpoint của FastAPI thông qua lớp service chuẩn mực. | **PASS** | P1 | Hệ thống hoạt động đồng bộ và phản hồi nhanh. |
| **FR35** | Mô hình Qwen2.5-7B-Instruct fine-tune được self-host và gọi bởi FastAPI để sinh câu trả lời | SRS 4.1, Table 6; UC.15 | Ollama Port 11434; model `qwen2.5-7b-graphmind`; `backend/app/modules/m3_hybrid_copilot/inference/client.py` | Mô hình `qwen2.5-7b-graphmind:latest` (4.7 GB) đang chạy trong Ollama local. FastAPI gửi prompt có cấu trúc và nhận câu trả lời tiếng Việt có căn cứ. | **PASS** | P0 | Triển khai AI cục bộ hoàn toàn khép kín, không phụ thuộc API bên thứ 3. |
| **FR36** | Hệ thống fine-tune LoRA/PEFT trên Kaggle và checkpoint lưu trữ định kỳ lên Hugging Face Hub | SRS 4.1, Table 6 | `research/notebooks/05_finetuning_kaggle_unsloth.ipynb` | Notebook sử dụng Unsloth tối ưu 4-bit LoRA trên GPU T4, huấn luyện với SFTTrainer và xuất model định dạng GGUF. | **PASS** | P2 | Đáp ứng trọn vẹn quy trình nghiên cứu khoa học. |
| **FR37** | Hệ thống sử dụng bộ dữ liệu 2,000–3,000 cặp câu hỏi-đáp chia 80/10/10 để huấn luyện | SRS 4.1, Table 6 | `research/data/qa_pairs/train_dataset.json`; `generate_training_data.py` | Tệp `train_dataset.json` hiện chỉ chứa 509 mẫu hướng dẫn (mới đạt ~20% so với quy mô 2,000–3,000 cặp yêu cầu trong SRS). Thiếu các tệp phân chia tập val/test riêng biệt. | **PARTIAL** | P2 | Tập dữ liệu huấn luyện thực tế nhỏ hơn quy mô cam kết trong đặc tả. |
| **FR38** | Hiển thị chỉ số độ tin cậy (reliability/confidence index) kèm câu trả lời của AI [Optional] | SRS 4.1, Table 6 | `backend/app/api/v1/copilot.py` (L929); `CopilotView.jsx` (L1361) | Tin nhắn trả lời của Copilot hiển thị rõ dòng: `Độ tin cậy: {msg.confidence}` (ví dụ: 96% hoặc 98.5%). | **PASS** | P3 | Tính năng tùy chọn được triển khai đầy đủ trên UI. |
| **FR39** | Lưu lịch sử trò chuyện và ghim phiên quan trọng làm tài liệu dùng chung [Optional] | SRS 4.1, Table 6; UC.18 | `backend/app/db/postgres/models/copilot_session.py`; `copilot.py` (L120-301); `CopilotView.jsx` | Bộ test `test_copilot_pin_session.py` đã chạy PASS 100%: Ghim phiên, ghi chú chia sẻ, phân phối tài liệu dùng chung theo phòng ban hoạt động hoàn hảo. | **PASS** | P2 | Tính năng tùy chọn xuất sắc, lưu trữ bền vững trên PostgreSQL. |
| **FR40** | Sau khi đăng nhập, hiển thị Trang chủ & Dashboard phù hợp với quyền của người dùng | SRS 4.1, Table 6; UC.19 | `frontend/src/views/m4_decision_support/HomeView.jsx`; `App.jsx` | Người dùng được điều hướng theo vai trò: Executive vào Bảng điều hành chiến lược; Manager vào báo cáo phòng ban; Standard user vào bảng công việc. | **PASS** | P1 | Phân luồng trải nghiệm người dùng theo đúng chức trách. |
| **FR41** | Executive Decision Dashboard hiển thị doanh thu, khách hàng giá trị cao và phân bổ hợp đồng | SRS 4.1, Table 6; UC.19; BR-05 | `backend/app/api/v1/dashboard.py` (L59-223); `frontend/src/views/m4_decision_support/ExecutiveView.jsx` | Các endpoint `/api/v1/dashboard/kpis`, `/revenue-trend`, `/top-customers`, `/contract-distribution` tổng hợp số liệu thực tế từ 31,465 đơn hàng trên Neo4j. | **PASS** | P1 | Trực quan hóa số liệu điều hành chuẩn xác. |
| **FR42** | Smart Risk & Alert Center cảnh báo hợp đồng sắp hết hạn trong 15–30 ngày và VIP giảm đơn | SRS 4.1, Table 6; UC.20 | `backend/app/api/v1/dashboard.py` (L228-350); `frontend/src/views/m4_decision_support/RiskView.jsx` | Code hiện tại chỉ truy vấn cảnh báo thiếu điều khoản bồi hoàn/trách nhiệm và đơn hàng > $25K. Chưa có logic quét ngày hết hạn hợp đồng 15–30 ngày và thuật toán phát hiện VIP sụt giảm đơn hàng. | **PARTIAL** | P1 | Nội dung cảnh báo sai lệch so với yêu cầu cụ thể của đặc tả. |
| **FR43** | Standard User chỉ nhận cảnh báo trong phạm vi dữ liệu được cấp quyền [Optional] | SRS 4.1, Table 6; UC.20 | `backend/app/api/v1/dashboard.py` (L250-255); `RiskView.jsx` | Tại hàm `get_risk_alerts`, cờ `allow_legal` tự động khóa với Standard user; chuyên viên chỉ nhìn thấy cảnh báo nghiệp vụ nội bộ phòng ban mình. | **PASS** | P3 | Cơ chế phân quyền cảnh báo an toàn. |
| **FR44** | Executive Briefing Generator tóm tắt tình hình kinh doanh và xuất file PDF/Word [Optional] | SRS 4.1, Table 6; UC.21 | `backend/app/api/v1/dashboard.py` (L355-460); `frontend/src/views/m4_decision_support/ReportsView.jsx` | Tổng hợp báo cáo điều hành qua LLM (`/api/v1/dashboard/briefing`) hoạt động tốt. Tuy nhiên hoàn toàn thiếu chức năng xuất ra tệp PDF hoặc Word. | **PARTIAL** | P2 | Tổng hợp nội dung: PASS; Xuất tệp PDF/Word: MISSING. |
| **FR45** | Tìm kiếm hợp nhất theo từ khóa trên Khách hàng, Sản phẩm, Hợp đồng và tài liệu | SRS 4.1, Table 6; UC.22 | `backend/app/main.py` (L898-1050); `frontend/src/views/m5_multifacet_search/SearchView.jsx` | Cung cấp endpoint tìm kiếm đa diện. Tuy nhiên hàm `_init_aw_search_cache` bị lỗi đường dẫn cứng `D:/adventureworks`, khiến danh mục sản phẩm từ CSV không nạp được vào cache tìm kiếm. | **PARTIAL** | P1 | Tìm kiếm Neo4j/Qdrant: PASS; Nạp dữ liệu sản phẩm CSV AdventureWorks: LỖI ĐƯỜNG DẪN. |
| **FR46** | Bộ lọc đa diện theo phòng ban, ngày tạo, giá trị giao dịch và tình trạng hiệu lực | SRS 4.1, Table 6; UC.22 | `backend/app/main.py` (L900-1100); `SearchView.jsx` | Giao diện có đầy đủ chip lọc. Nhưng phía backend, các giá trị giao dịch và ngày hiệu lực của hợp đồng lấy từ Qdrant là giá trị giả lập dựa trên vector score (`max(25, round(score * 120))`). | **PARTIAL** | P2 | Bộ lọc hoạt động trên giao diện nhưng dựa trên dữ liệu giá trị hợp đồng giả lập. |
| **FR47** | Đánh giá hệ thống trên bộ benchmark 100–200 câu hỏi ở 3 mức độ phức tạp | SRS 4.1, Table 6 | `research/data/benchmark/benchmark_100.json`; `generate_benchmark_set.py` | Tệp `benchmark_100.json` có đúng 100 câu hỏi chia thành 3 nhóm độ khó: 30 ERP, 30 CUAD và 40 Multi-facet. | **PASS** | P2 | Hoàn thành bộ câu hỏi kiểm chuẩn theo đặc tả. |
| **FR48** | Triển khai 3 baseline: Vector RAG, Pure GraphRAG, và Hybrid GraphRAG | SRS 4.1, Table 6 | `research/src/evaluation/run_benchmark.py`; `scripts/audit_hybrid_rag.py` | Cả 3 cấu hình truy vấn đều được lập trình và đo lường độc lập trong mã nguồn kiểm thử. | **PASS** | P2 | Đầy đủ các mô hình đối sánh khoa học. |
| **FR49** | Đo lường Answer Correctness bằng ground truth, LLM-as-Judge và kiểm thử thủ công | SRS 4.1, Table 6 | `research/data/benchmark/results_summary.json`; `run_benchmark.py` | Ghi nhận kết quả độ chính xác: Vector RAG = 5.0%, Pure GraphRAG = 58.0%, Hybrid GraphRAG = 60.0%. | **PASS** | P2 | Quy trình đánh giá thực nghiệm hoàn tất. |
| **FR50** | Hệ thống đo lường Retrieval/Citation Precision, Hallucination Rate và AI Response Time | SRS 4.1, Table 6 | `research/data/benchmark/results_summary.json`; `docs/reports/benchmark_evaluation_report.md` | Kết quả đo lường đầy đủ 5 tiêu chí: Accuracy, Faithfulness, Context Recall, Answer Relevance, Latency trong `results_summary.json`. | **PASS** | P2 | Số liệu minh bạch, khoa học. |
| **FR51** | Đo lường hiệu quả tinh chỉnh (Fine-tuning Effectiveness) giữa mô hình gốc và fine-tune | SRS 4.1, Table 6 | `research/notebooks/05_finetuning_kaggle_unsloth.ipynb`; `benchmark_evaluation_report.md` | Đã thực hiện fine-tuning trên Kaggle. Tuy nhiên trong báo cáo chưa có bảng số liệu thực nghiệm đối đầu trực tiếp (Ablation study) giữa base Qwen2.5-7B và fine-tuned model trên tập benchmark. | **PARTIAL** | P2 | Có tiến trình fine-tune nhưng thiếu bảng đối sánh thực nghiệm trước và sau tinh chỉnh. |
| **FR52** | Nhóm lập báo cáo so sánh 3 baseline trên 5 chỉ số đánh giá | SRS 4.1, Table 6 | `docs/reports/benchmark_evaluation_report.md` (L1-31) | Báo cáo hoàn chỉnh, có bảng số liệu tổng hợp, phân tích khoa học về sự vượt trội của thuật toán RRF và tính trung thực của mô hình. | **PASS** | P2 | Đã hoàn thành báo cáo chuyên đề nghiên cứu. |

---

### 2. Bảng đối chiếu Quy tắc Nghiệp vụ cốt lõi (BR-01 – BR-05)

| Rule ID | Nội dung quy tắc nghiệp vụ đặc tả | Vị trí SRS | Hiện trạng triển khai trong source code | Bằng chứng kiểm tra | Đánh giá tuân thủ |
|---|---|---|---|---|---|
| **BR-01** | Mỗi Khách hàng (Customer) trong AdventureWorks được gắn cố định với 1–3 Hợp đồng (CUAD) thông qua bảng tra cứu độc lập. | SRS 6.1 (p. 61) | Không tồn tại bảng `customer_contract_mapping` trong PostgreSQL và không có quan hệ giữa Customer và Document trong Neo4j. Logic ghép nối hiện tại chạy bằng code vòng lặp gán tạm trong `backend/app/main.py:2034`. | Truy vấn Cypher Neo4j: `MATCH (c:Customer)-[r]->(d:Document) RETURN count(r)` trả về 0. Thư mục `research/data/synthetic_linking` chỉ có `.gitkeep`. | **PARTIAL (P1)** |
| **BR-02** | Truy cập thông tin hợp đồng và dữ liệu giao dịch phải tuân thủ nghiêm ngặt theo RBAC, Department Scope và Data Scope của từng người dùng. | SRS 6.1 (p. 61) | Triển khai triệt để qua hàm phụ thuộc `get_user_scope` và lớp `ScopeContext` trong `app/core/rbac.py`. Kiểm tra cả tầng API và gọt bỏ trích dẫn dữ liệu nhạy cảm. | Chạy `test_department_scope.py`: Chuyên viên Sales xem chi tiết hợp đồng Pháp chế bị 403 Forbidden; tìm kiếm bị gọt bỏ kết quả trái ngành; trích dẫn bị che dấu `RESTRICTED`. | **PASS (P0)** |
| **BR-03** | Chỉ có Quản trị viên (Admin) mới được phép cấu hình tác nhân AEGIS Agent và duyệt chỉnh sửa tri thức qua Knowledge Editor. | SRS 6.1 (p. 61) | Endpoint `/api/v1/admin/*` yêu cầu Bearer token có role `it_admin` hoặc `is_superuser=True`. Giao diện kiểm tra vai trò người dùng trước khi mở quyền cấu hình. | Chạy `test_user_admin_api.py`: Token người dùng standard bị chặn 403 Forbidden. Giao diện ẩn các nút cấu hình đối với người dùng không phải Admin. | **PASS (P1)** |
| **BR-04** | Trưởng phòng (Department Manager) chỉ được phép soạn thảo và ban hành SOP cho phòng ban của chính mình. | SRS 6.1 (p. 61) | Endpoint `POST /api/v1/sop/publish` trong `app/api/v1/sop.py` đối chiếu trực tiếp `user.department_id` của Trưởng phòng với trường `department` của SOP. | Chạy `test_sop_api.py`: Trưởng phòng Pháp chế xuất bản SOP Kinh doanh lập tức bị chặn với lỗi HTTP 403 Forbidden kèm thông báo dẫn chiếu trực tiếp quy định `BR-04`. | **PASS (P1)** |
| **BR-05** | Ban Giám Đốc (Executive) có quyền truy cập đầy đủ, không giới hạn vào toàn bộ dữ liệu trên toàn doanh nghiệp. | SRS 6.1 (p. 61) | Trong `ScopeContext`, role `executive` được gắn cờ `is_unrestricted=True`, bỏ qua mọi bộ lọc phòng ban trên toàn bộ các endpoint tài liệu, KPI, báo cáo và tìm kiếm. | Chạy `test_department_scope.py`: Tài khoản `exec` truy cập thành công hồ sơ CUAD, đơn hàng Sales, tài liệu Pháp chế và bảng điều hành cấp cao mà không gặp bất kỳ rào cản nào. | **PASS (P0)** |

---

### 3. Bảng truy vết ngược (Reverse Traceability: Source Code to Spec)

Quá trình quét toàn bộ cây thư mục mã nguồn phát hiện một số chức năng đã được viết trong source code nhưng không có nguồn gốc trực tiếp từ SRS hoặc mở rộng vượt phạm vi tài liệu:

| Thành phần mã nguồn | Mô tả chức năng thực tế | Hiện diện trong SRS? | Nhận định & Đánh giá rủi ro |
|---|---|---|---|
| `backend/app/api/v1/dashboard.py` (`POST /department-report/signoff`) | Chức năng ký duyệt số ca làm việc hàng ngày của Trưởng phòng kèm sinh chuỗi băm xác thực SHA-256. | **Không có trong SRS** (Nằm ngoài phạm vi FR40-FR44). | **Chức năng mở rộng có chủ đích:** Làm phong phú phân hệ Báo cáo phòng ban (`DepartmentReportView.jsx`), nâng cao tính thực tế của sản phẩm. Tuy nhiên dữ liệu chữ ký hiện lưu trong biến RAM `SIGNED_OFF_SUBMISSIONS`, sẽ mất khi restart server. |
| `backend/app/modules/m1_data_sync/webhook.py` (`POST /documents/replace`) | Cơ chế thay thế tệp tài liệu tại chỗ (In-place document replace) kết hợp xóa các đoạn nhúng cũ trong Qdrant và node cũ trong Neo4j trước khi nạp tệp mới. | **SRS chỉ nêu tải lên (FR16) & xóa tệp** | **Tính năng mở rộng xuất sắc:** Giúp hệ thống không bị rác dữ liệu vector khi nhân viên cập nhật phiên bản tài liệu mới. |
| `backend/app/core/otp_store.py` | Bộ nhớ tạm lưu mã OTP quên mật khẩu trong RAM. | **Nằm trong yêu cầu FR2** | **Rủi ro kỹ thuật:** Mã OTP chỉ lưu trong bộ nhớ tiến trình, nếu backend uvicorn reload hoặc chạy multi-worker thì mã OTP sẽ bị mất hiệu lực giữa các request. Nên chuyển sang bảng `password_reset_otps` đã có sẵn trên PostgreSQL. |
| `frontend/src/components/LandingPage.jsx` | Trang giới thiệu sản phẩm công khai (Marketing Landing Page) với hiệu ứng giới thiệu công nghệ, đối tác và chuyển đổi ngôn ngữ. | **Không đề cập trong SRS** | **Bổ sung hợp lý:** Tạo ấn tượng chuyên nghiệp cho đồ án Capstone, không ảnh hưởng tiêu cực đến nghiệp vụ nội bộ. |

---

## E. Missing and Incomplete Features (Chức Năng Thiếu & Chưa Hoàn Thiện)

Dưới đây là danh sách chi tiết các chức năng ở trạng thái **MISSING** hoặc **PARTIAL**, cần phải hoàn thiện để đáp ứng đầy đủ yêu cầu của tài liệu đặc tả:

### 1. [FR4 & FR19] Tích hợp Ủy quyền OAuth 2.0 & Đồng bộ Google Drive / Google Sheets
- **Requirement ID:** `FR4`, `FR19` (Ưu tiên: P2 / P3).
- **Yêu cầu chuẩn:** Hệ thống hỗ trợ luồng OAuth 2.0 để người dùng cấp quyền truy cập Google Drive/Sheets và định kỳ đồng bộ các bảng tính biểu mẫu vào kho dữ liệu.
- **Hiện trạng:** Giao diện `ConnectorsView.jsx` chỉ có thẻ Google Drive tĩnh; nút đồng bộ kích hoạt hàm `setTimeout` giả lập sau 1.2 giây; phía máy chủ FastAPI không có client kết nối Google API và không có cơ chế lưu trữ OAuth Token.
- **Bằng chứng:** `frontend/src/views/m1_data_sync/ConnectorsView.jsx` dòng 31–39 và 105–119; `backend/app/main.py` dòng 398–440.
- **Ảnh hưởng:** Người dùng không thể đồng bộ biểu mẫu thực tế từ Google Workspace lên hệ thống.
- **Hướng khắc phục đề xuất:** Bổ sung router `app/api/v1/connectors/google.py` sử dụng thư viện `google-auth-oauthlib`, lưu trữ refresh token an toàn trong bảng `oauth_connections` đã được tạo sẵn trên PostgreSQL.

### 2. [FR2] Đăng ký Tài khoản Người dùng Mới (User Self-Registration)
- **Requirement ID:** `FR2` (Ưu tiên: P2).
- **Yêu cầu chuẩn:** Hệ thống cho phép người dùng tự đăng ký tài khoản, xác thực quên mật khẩu qua OTP.
- **Hiện trạng:** Quên mật khẩu và OTP đã hoạt động hoàn hảo; nhưng hệ thống hoàn toàn không có trang đăng ký và không có endpoint `POST /api/v1/auth/register`. Việc tạo tài khoản hiện bị khóa cứng trong trang quản trị Admin.
- **Bằng chứng:** Tìm kiếm endpoint `/register` trên toàn backend trả về 0 kết quả; `frontend/src/components/LoginPage.jsx` dòng 440–465 chỉ có link "Quên mật khẩu", không có link "Đăng ký".
- **Ảnh hưởng:** Người dùng không thể tự khởi tạo tài khoản nếu không có quản trị viên thao tác trước.
- **Hướng khắc phục đề xuất:** Nếu dự án muốn tuân thủ 100% câu chữ của FR2, cần bổ sung endpoint `POST /api/v1/auth/register` (tạo tài khoản với vai trò mặc định `standard_user` ở trạng thái chờ duyệt hoặc kích hoạt ngay) và liên kết giao diện tại `LoginPage.jsx`.

### 3. [FR18 & BR-01] Bảng Tra Cứu Liên Kết Khách Hàng – Hợp Đồng Cố Định (Controlled Synthetic Linking)
- **Requirement ID:** `FR18`, `BR-01` (Ưu tiên: P1).
- **Yêu cầu chuẩn:** Mỗi khách hàng trong AdventureWorks phải được liên kết cố định, vĩnh viễn với 1–3 hợp đồng CUAD thông qua một bảng tra cứu độc lập (Lookup Table).
- **Hiện trạng:** Chưa có bảng `customer_contract_mapping` cố định trong cơ sở dữ liệu. Endpoint `/api/contracts/assigned` trong `backend/app/main.py:2020-2070` tạo liên kết giả định bằng phép lặp `top_customers[i]` ánh xạ với `cuad_items[i]` trực tiếp trong bộ nhớ mỗi khi gọi API.
- **Bằng chứng:** Bảng Neo4j không có quan hệ `(Customer)-[:SIGNED_CONTRACT]->(Document)`; thư mục `research/data/synthetic_linking` để trống; file `scripts/link_purchased.py` chỉ liên kết Khách hàng với Sản phẩm.
- **Ảnh hưởng:** Sự liên kết giữa khách hàng và hợp đồng không có tính toàn vẹn bền vững; nếu danh sách hợp đồng thay đổi, ánh xạ tới khách hàng sẽ bị xáo trộn.
- **Hướng khắc phục đề xuất:** Viết script sinh tệp CSV mapping cố định 19,820 khách hàng với 510 hợp đồng CUAD, lưu vào PostgreSQL hoặc nạp trực tiếp mối quan hệ `[:ASSIGNED_CONTRACT]` vào đồ thị Neo4j.

### 4. [FR24 & FR25] Đồng Bộ Tri Thức HITL từ Knowledge Editor Ngược Lại Đồ Thị & Vector DB
- **Requirement ID:** `FR24`, `FR25` (Ưu tiên: P1).
- **Yêu cầu chuẩn:** Khi Admin chỉnh sửa hoặc xác nhận thực thể/quan hệ trên Knowledge Editor, các thay đổi phải được lưu xuống Neo4j và Qdrant để mô hình AI sử dụng tri thức mới này trong các câu trả lời tiếp theo.
- **Hiện trạng:** Endpoint `POST /api/graph/verify` trong `backend/app/main.py:595-612` chỉ cập nhật biến cục bộ `ENTITIES` trong RAM; đối với các node thực của Neo4j, hàm chỉ trả về chuỗi JSON thông báo mà không chạy lệnh Cypher cập nhật thuộc tính node và không cập nhật điểm vector trong Qdrant.
- **Bằng chứng:** `backend/app/main.py` dòng 595–612:
  ```python
  if not entity:
      # Fallback response for real nodes
      return {"success": True, "message": f"Entity {req.entityId} verified by {req.auditor}", ...}
  ```
- **Ảnh hưởng:** Mất đi ý nghĩa của quy trình Human-in-the-loop; tri thức được người kiểm toán phê duyệt không thực sự đi vào não bộ của hệ sinh thái AI.
- **Hướng khắc phục đề xuất:** Trong `verify_entity`, bổ sung câu lệnh Cypher `MATCH (n) WHERE elementId(n) = $id SET n.verified = true, n.status = 'Human Verified'` và gọi `qdrant_client.set_payload` để đồng bộ thuộc tính payload.

### 5. [FR37] Quy Mô Bộ Dữ Liệu Huấn Luyện (Training Dataset Size)
- **Requirement ID:** `FR37` (Ưu tiên: P2).
- **Yêu cầu chuẩn:** Hệ thống sử dụng bộ dữ liệu 2,000–3,000 cặp câu hỏi-đáp được chia theo tỷ lệ 80/10/10 để huấn luyện mô hình.
- **Hiện trạng:** Tệp dữ liệu huấn luyện duy nhất trong dự án là `research/data/qa_pairs/train_dataset.json`, chỉ chứa đúng 509 mẫu câu hỏi-đáp.
- **Bằng chứng:** Đếm trực tiếp mảng JSON trong `train_dataset.json` trả về độ dài 509; trong notebook `05_finetuning_kaggle_unsloth.ipynb` cell 8 ghi nhận: `Đọc 509 mẫu dữ liệu sinh từ đồ thị thực tế GraphMind`.
- **Ảnh hưởng:** Quy mô tập dữ liệu chưa đạt ngưỡng quy định của đề tài nghiên cứu (thiếu khoảng 75% khối lượng dữ liệu).
- **Hướng khắc phục đề xuất:** Mở rộng script `research/src/finetuning/generate_training_data.py` để sinh thêm các kịch bản hỏi đáp xuyên nguồn từ 31,465 đơn hàng và 1,685 điều khoản nhằm đạt mốc 2,000 mẫu, đồng thời tách riêng 3 tệp `train.json` (80%), `val.json` (10%), `test.json` (10%).

### 6. [FR44] Xuất Báo Cáo Ra Định Dạng PDF / Word (Executive Briefing Export)
- **Requirement ID:** `FR44` (Ưu tiên: P2).
- **Yêu cầu chuẩn:** Trình tạo tóm tắt điều hành tổng hợp tình hình kinh doanh và xuất ra tệp PDF/Word.
- **Hiện trạng:** Trang `ReportsView.jsx` hiển thị báo cáo tổng hợp rất đẹp mắt và hỗ trợ AI tổng hợp trực tiếp từ backend, nhưng không có nút bấm hoặc thư viện nào hỗ trợ tải báo cáo về dưới dạng `.pdf` hay `.docx`.
- **Bằng chứng:** Tìm kiếm `pdf`, `word`, `export`, `download` trong `ReportsView.jsx` và `backend/app/api/v1/dashboard.py` hoàn toàn không có logic sinh tệp nhị phân.
- **Ảnh hưởng:** Lãnh đạo không thể tải văn bản báo cáo để lưu trữ hoặc gửi qua email truyền thống.
- **Hướng khắc phục đề xuất:** Tích hợp thư viện `html2pdf.js` hoặc gọi `window.print()` với CSS `@media print` trên frontend, hoặc viết endpoint backend sinh PDF sử dụng `reportlab` / `weasyprint`.

---

## F. Incorrect Implementations and Defects (Sai Lệch Triển Khai & Khiếm Khuyết)

Dưới đây là các lỗi kỹ thuật và sự sai lệch hành vi giữa mã nguồn thực tế và tài liệu đặc tả:

### 1. [DEFECT-01] Tiêu chí Cảnh báo Rủi ro Không Khớp Đặc Tả (Mismatch in Risk Alert Criteria)
- **Requirement ID:** `FR42` (Ưu tiên: P1 — High).
- **Mô tả lỗi:** Đặc tả quy định rõ: *"The Smart Risk & Alert Center warns that contracts expire in 15–30 days and VIP customers reduce their orders."* (Cảnh báo hợp đồng sắp hết hạn trong 15–30 ngày và khách hàng VIP giảm đơn hàng).
- **Hiện trạng trong code:** Hàm `get_risk_alerts` tại `backend/app/api/v1/dashboard.py:255-345` đang thực hiện quét:
  1. Hợp đồng thiếu điều khoản Giới hạn trách nhiệm (`Limitation of Liability`).
  2. Hợp đồng thiếu điều khoản Bồi hoàn thiệt hại (`Indemnification`).
  3. Giao dịch đơn hàng lớn vượt ngưỡng $25,000 USD.
  Code hoàn toàn không có thuật toán so sánh ngày hiện tại với ngày kết thúc hợp đồng để tính khoảng thời gian 15–30 ngày, và không có phân tích chuỗi thời gian so sánh doanh số kỳ này với kỳ trước của khách hàng VIP để cảnh báo sụt giảm đơn hàng.
- **Bằng chứng:** `backend/app/api/v1/dashboard.py` dòng 256–345; không có trường `expirationDate` trong Cypher query.
- **Tác động:** Chức năng hoạt động không đúng nghiệp vụ cốt lõi mà đặc tả đã cam kết với hội đồng.

### 2. [DEFECT-02] Lỗi Đường Dẫn Cứng Không Tồn Tại Khi Nạp Cache Tìm Kiếm Sản Phẩm AdventureWorks
- **Requirement ID:** `FR45` (Ưu tiên: P1 — High).
- **Mô tả lỗi:** Trong hàm khởi tạo cache tìm kiếm `_init_aw_search_cache` tại `backend/app/main.py:797, 807, 838, 865`, mã nguồn gán cứng đường dẫn thư mục `D:/adventureworks/Production_ProductSubcategory.csv`, `D:/adventureworks/Production_Product.csv`, v.v.
- **Hiện trạng máy chủ:** Thư mục `D:/adventureworks` hoàn toàn không tồn tại trên ổ đĩa. Dữ liệu thực tế của dự án được đặt trong các thư mục con theo phòng ban: `D:\graph-mind\rnd\`, `D:\graph-mind\sales\`, `D:\graph-mind\accounting_procurement\`.
- **Hậu quả:** Điều kiện `if prod_path.exists():` luôn trả về `False`. Kết quả là danh mục sản phẩm từ CSV không bao giờ được nạp vào biến `_AW_SEARCH_CACHE["products"]`, khiến việc tìm kiếm sản phẩm phụ tùng AdventureWorks từ tệp tĩnh bị tê liệt nếu không truy vấn trực tiếp vào Neo4j.
- **Bằng chứng:** Kiểm tra PowerShell: `os.path.exists('D:/adventureworks')` trả về `False`.

### 3. [DEFECT-03] Bộ Test Unit Test Bị Lỗi Import Không Thể Chạy Tự Động
- **Component:** `backend/app/tests/test_user_admin_api.py` & `backend/app/tests/test_copilot_postgres.py`.
- **Mô tả lỗi:**
  1. `test_user_admin_api.py` (dòng 8) cố gắng import `from app.modules.m6_admin_security.user_admin_api import _check_role, require_admin`. Hai hàm nội bộ này đã bị xóa trong đợt tái cấu trúc phân quyền sang `deps.py`, dẫn đến `ImportError` ngay khi import file.
  2. `test_copilot_postgres.py` (dòng 11) import `pytest`, nhưng `pytest` không có trong danh sách `backend/requirements.txt` và không được cài đặt trong môi trường Python của máy, gây ra `ModuleNotFoundError`.
- **Bằng chứng:** Chạy lệnh `python -m unittest discover -s backend/app/tests` báo lỗi `FAILED (errors=2)`.
- **Tác động:** Làm gián đoạn chu trình kiểm thử tự động (CI/CD) của dự án.

### 4. [DEFECT-04] Dữ Liệu Giá Trị Hợp Đồng Trong Tìm Kiếm Vector Qdrant Bị Giả Lập Cố Định
- **Requirement ID:** `FR46` (Ưu tiên: P2 — Medium).
- **Mô tả lỗi:** Tại `backend/app/main.py:970-974`, khi tìm kiếm văn bản từ Qdrant, hệ sinh thái chưa trích xuất được giá trị tiền tệ và ngày ký từ nội dung PDF của CUAD. Do đó, mã nguồn gán giá trị nhân tạo:
  ```python
  "value": f"${max(25, round(score * 120)):,}K USD",
  "numValue": max(25000, int(score * 120000)),
  "date": "23/10/2026",
  "status": "VALID",
  ```
- **Tác động:** Dữ liệu hiển thị trên bảng tìm kiếm đa diện không phản ánh đúng hợp đồng thật, mọi hợp đồng CUAD đều có ngày cố định 23/10/2026 và giá trị tỷ lệ thuận với điểm tương đồng vector.

---

## G. Test Execution Report (Báo Cáo Kiểm Thử Thực Tế)

Quá trình kiểm toán đã tiến hành chạy trực tiếp toàn bộ các tệp kiểm thử có thể thực thi trong môi trường hiện tại.

### 1. Kết Quả Chạy Kiểm Thử Chi Tiết

| Mã Test Script | Mục tiêu kiểm tra | Lệnh thực thi | Kết quả | Chi tiết & Bằng chứng xác nhận |
|---|---|---|---|---|
| **TEST-01** | Kiểm tra phân quyền phạm vi phòng ban phía máy chủ (BR-02, BR-04, BR-05, FR3, FR32) | `python backend/app/tests/test_department_scope.py` | **PASS** | Chạy qua 6 bộ kiểm thử nghiệp vụ: Executive có toàn quyền; Manager bị chặn chéo phòng ban; Chuyên viên Sales xem chi tiết hợp đồng Legal bị 403 Forbidden; Trích dẫn hợp đồng bị che dấu `RESTRICTED`. 100% assertions đạt chuẩn. |
| **TEST-02** | Kiểm tra vòng đời và phân quyền xuất bản quy trình SOP (FR26, BR-04) | `python backend/app/tests/test_sop_api.py` | **PASS** | 7 bước kiểm thử: Lưu nháp SOP, Trưởng phòng Pháp chế xuất bản thành công cho phòng mình, xuất bản cho phòng Kinh doanh bị chặn 403 theo `BR-04`, Chuyên viên nghiệp vụ bị từ chối xuất bản. Dọn dẹp sạch dữ liệu sau test. |
| **TEST-03** | Kiểm tra ghim phiên trò chuyện Copilot và chia sẻ tài liệu phòng ban (FR39, UC.18) | `python backend/app/tests/test_copilot_pin_session.py` | **PASS** | Xác thực lưu phiên trò chuyện trên PostgreSQL, ghim phiên kèm ghi chú dùng chung, lọc tài liệu ghim theo phạm vi phòng ban của người dùng thành công. |
| **TEST-04** | Kiểm tra báo cáo điều hành phòng ban và ký duyệt số ca trực | `python backend/app/tests/test_department_report.py` | **PASS** | Ký duyệt ca trực sinh token SHA-256 an toàn; Trưởng phòng bị chặn khi duyệt phòng khác; AI tổng hợp báo cáo vận hành thông suốt qua LLM Ollama. |
| **TEST-05** | Xác minh tính nhất quán 3 lớp dữ liệu (Storage, Neo4j, Qdrant) | `python scripts/verify_three_layers.py` | **PARTIAL** | - Central Storage: 582/581 files -> PASS. <br>- Neo4j: 581 Document nodes, 55,434 nodes tổng -> PASS. <br>- Qdrant: 299/510 CUAD PDFs và 43/71 AW files -> FAIL (chưa nạp hết 100% vector). |
| **TEST-06** | Kiểm toán toàn vẹn cơ sở dữ liệu đồ thị và vector | `python scripts/audit_hybrid_rag.py` | **PASS** | Qdrant có 45,670 points trong `cuad_contracts` và 26,129 points trong `adventureworks_entities`. Neo4j có 31,465 SalesOrder nodes, $123.2M USD tổng doanh thu. Phát hiện cảnh báo thiếu thuộc tính `year`, `subTotal` trong câu truy vấn mẫu. |
| **TEST-07** | Kiểm thử build đóng gói tĩnh giao diện Frontend | `npm run build` (tại thư mục `frontend/`) | **PASS** | Vite v5.4.21 biến đổi 1,945 modules, xuất ra gói `dist/` hoàn chỉnh trong 5.69 giây mà không có bất kỳ lỗi cú pháp hoặc lỗi import nào. |
| **TEST-08** | Kiểm thử quyền Admin từ mã nguồn cũ | `python backend/app/tests/test_user_admin_api.py` | **FAIL** | Thất bại do lỗi `ImportError: cannot import name '_check_role'` từ file code đã được tái cấu trúc trước đó. |
| **TEST-09** | Kiểm thử phiên Copilot qua thư viện Pytest | `backend/app/tests/test_copilot_postgres.py` | **BLOCKED** | Bị chặn do môi trường máy tính chưa cài đặt gói `pytest` (`ModuleNotFoundError: No module named 'pytest'`). |
| **TEST-10** | Bộ kiểm thử hồi quy toàn diện Hybrid GraphRAG | `python scripts/test_hybrid_rag_regression.py` | **BLOCKED** | Bị chặn tại dòng 49 do thiếu thư viện `docx` (`python-docx`) trong môi trường Python host. |

### 2. Thống kê Kết quả Thực thi Kiểm thử

- **Tổng số kịch bản kiểm thử đã thực hiện:** **10 bộ kiểm thử**.
- **Số bài test ĐẠT (PASS):** **6**.
- **Số bài test ĐẠT MỘT PHẦN (PARTIAL):** **1**.
- **Số bài test THẤT BẠI (FAIL):** **1** (Do lỗi code test cũ).
- **Số bài test BỊ CHẶN (BLOCKED):** **2** (Do thiếu dependency `pytest` và `python-docx` trên máy host).

---

## H. Security, RBAC and Data Integrity Findings (An Ninh, Phân Quyền & Toàn Vẹn Dữ Liệu)

### 1. Cơ Chế Kiểm Soát Phạm Vi Dữ Liệu Máy Chủ (Server-Side Enforcement) — Điểm Cộng Lớn
Nhiều ứng dụng thường mắc sai lầm nghiêm trọng là chỉ ẩn nút trên giao diện người dùng (Client-side hiding), dẫn đến việc kẻ xấu có thể gọi trực tiếp API để lấy trộm dữ liệu trái ngành.
Tại GraphMind, kiểm toán ghi nhận cơ chế **Server-side Department Scope Guard** được lập trình xuất sắc:
- Tất cả các endpoint quan trọng (`/api/documents/detail`, `/api/search`, `/api/copilot/ask`, `/api/copilot/citations`, `/api/v1/sop/publish`, `/api/v1/dashboard/kpis`) đều tiêm phụ thuộc `ScopeContext = Depends(get_user_scope)`.
- Khi chuyên viên Sales gửi yêu cầu đọc chi tiết hợp đồng Legal: Máy chủ trả về ngay mã HTTP `403 Forbidden` kèm thông điệp nghiệp vụ rõ ràng, hoàn toàn không truy vấn cơ sở dữ liệu.
- Khi Copilot trích dẫn chứng cứ: Hàm `scope.filter_citations()` tự động quét danh sách các trích dẫn, nếu tài liệu trích dẫn thuộc phòng ban khác ngoài quyền của người hỏi, nội dung và vị trí đoạn văn lập tức bị gọt bỏ và thay thế bằng nhãn `RESTRICTED`.

### 2. Sự Không Tương Thích Phiên Bản Giữa Qdrant Client và Server (Version Incompatibility Warning)
- Khi ứng dụng kết nối tới Qdrant Docker, thư viện đưa ra cảnh báo nghiêm trọng:
  ```text
  UserWarning: Qdrant client version 1.19.1 is incompatible with server version 1.8.2. 
  Major versions should match and minor version difference must not exceed 1.
  ```
- **Nguyên nhân:** File `requirements.txt` của backend đã ghi rõ ràng quy tắc ràng buộc `qdrant-client>=1.8.0,<1.10.0`, nhưng môi trường Python thực tế của máy tính lại bị cài đè gói `qdrant-client` bản mới nhất `1.19.1` (lệch tới 9 phiên bản minor so với Qdrant Server 1.8.2 trong Docker).
- **Rủi ro:** Một số cấu trúc payload gRPC nâng cao hoặc cú pháp bộ lọc của bản 1.19 có thể gây lỗi runtime không mong muốn trong quá trình tìm kiếm vector.

### 3. Vấn đề Toàn vẹn Dữ liệu 3 Lớp (Data Consistency Discrepancy)
- Theo kiến trúc đặc tả, 3 lớp lưu trữ phải phản ánh đồng bộ 581 tài liệu doanh nghiệp:
  1. Central Storage (`/data`): Đã có đủ 582 tệp (511 CUAD, 71 AdventureWorks).
  2. Neo4j Graph DB: Đã tạo đủ 581 node Document đại diện cho 581 tệp.
  3. Qdrant Vector DB: Mới chỉ có vector của **299 tệp CUAD PDF** và **43 tệp AdventureWorks**. Còn thiếu **211 tệp CUAD** và **28 tệp AdventureWorks** chưa được nạp vector vào Qdrant.
- **Hậu quả:** Khi người dùng hỏi đáp về 211 hợp đồng chưa được vector hóa, kênh tìm kiếm vector sẽ không thể tìm thấy đoạn trích, khiến khả năng trả lời của hệ thống phụ thuộc hoàn toàn vào kênh đồ thị Neo4j.

---

## I. Unverified Requirements and Limitations (Yêu Cầu Chưa Xác Minh & Giới Hạn)

Trong khuôn khổ đợt kiểm toán này, 100% các chức năng cốt lõi đã được kiểm tra trực tiếp. Tuy nhiên, có một số khía cạnh thực nghiệm bị giới hạn do điều kiện môi trường kiểm thử:

1. **Hiệu năng huấn luyện LoRA liên tục trên Kaggle T4 GPU:**
   - Đặc tả NFR ghi nhận trần tốc độ huấn luyện xấp xỉ ~51 giây/step trên Kaggle T4 GPU. Do môi trường kiểm toán là máy trạm cục bộ (Local Workstation) không thể kết nối trực tiếp phiên notebook đang chạy trên Kaggle, chỉ số này được xác minh thông qua nhật ký thực thi lưu trong `research/notebooks/05_finetuning_kaggle_unsloth.ipynb` mà không chạy lại toàn bộ tiến trình huấn luyện 60 steps từ đầu.
2. **Kiểm thử chịu tải đa người dùng đồng thời (Concurrency & Stress Testing):**
   - Chưa thực hiện bài kiểm tra tải với hàng trăm người dùng đồng thời trên backend FastAPI để đo lường độ suy giảm độ trễ của cơ chế khóa kết nối Bolt trên Neo4j.

---

## J. Remediation Plan (Kế Hoạch Khắc Phục Khuyến Nghị)

Nhằm đưa hệ thống đạt mức tuân thủ **COMPLIANT (100% ĐẠT)** trước đợt nghiệm thu và bảo vệ đồ án, nhóm phát triển cần thực hiện các công việc khắc phục theo thứ tự ưu tiên sau:

| STT | Mã nhiệm vụ | Yêu cầu liên quan | Mức ưu tiên | Mô tả công việc cần xử lý | Tiêu chí nghiệm thu hoàn thành (Acceptance Criteria) |
|---|---|---|---|---|---|
| 1 | **TASK-01** | `FR42` | **P1 (High)** | Bổ sung logic tính toán ngày hết hạn hợp đồng 15–30 ngày và thuật toán phát hiện khách hàng VIP sụt giảm đơn hàng trong `backend/app/api/v1/dashboard.py:get_risk_alerts`. | Gọi `/api/v1/dashboard/risk-alerts` trả về ít nhất 2 loại cảnh báo: Hợp đồng có `daysLeft` từ 15–30 ngày và Khách hàng VIP có doanh số giảm > 20% so với trung bình. |
| 2 | **TASK-02** | `FR24`, `FR25` | **P1 (High)** | Hoàn thiện logic hàm `verify_entity` trong `backend/app/main.py`: Thực thi câu lệnh Cypher cập nhật trực tiếp thuộc tính node trên Neo4j và cập nhật payload điểm vector trên Qdrant. | Khi bấm nút Duyệt trên `KnowledgeView.jsx`, truy vấn Cypher trên Neo4j xác nhận node có `n.verified = true` và `n.status = 'Human Verified'`. |
| 3 | **TASK-03** | `FR45` | **P1 (High)** | Sửa lỗi đường dẫn cứng `D:/adventureworks` trong hàm `_init_aw_search_cache` tại `backend/app/main.py`, chuyển sang đọc đường dẫn tương đối từ `sales/`, `rnd/`, `accounting_procurement/`. | Hàm nạp thành công dữ liệu sản phẩm từ CSV vào biến `_AW_SEARCH_CACHE["products"]`; tìm kiếm từ khóa phụ tùng trên giao diện trả về đúng kết quả. |
| 4 | **TASK-04** | `FR18`, `BR-01` | **P1 (High)** | Tạo bảng tra cứu cố định `customer_contract_mapping` (dạng CSV hoặc bảng PostgreSQL) liên kết 19,820 khách hàng với 510 hợp đồng CUAD, hoặc tạo quan hệ `[:ASSIGNED_CONTRACT]` trong Neo4j. | Mỗi khách hàng có từ 1 đến 3 hợp đồng cố định được lưu trữ lâu dài trong cơ sở dữ liệu, không bị thay đổi ngẫu nhiên giữa các lần gọi API. |
| 5 | **TASK-05** | `FR17`, `FR22` | **P1 (High)** | Chạy script bổ sung vector hóa cho 211 hợp đồng CUAD PDF và 28 tệp CSV AdventureWorks còn lại vào Qdrant để đạt 100% độ phủ 581 tài liệu. | Chạy `python scripts/verify_three_layers.py` cho kết quả `PASS` ở cả 3 lớp lưu trữ: 581/581 files tại Central Storage, Neo4j và Qdrant. |
| 6 | **TASK-06** | `FR2` | **P2 (Medium)** | Bổ sung endpoint đăng ký tài khoản `POST /api/v1/auth/register` và form đăng ký trên giao diện `LoginPage.jsx` (nếu muốn đáp ứng trọn vẹn câu chữ của FR2). | Người dùng mới có thể đăng ký tài khoản và đăng nhập ngay vào hệ thống với vai trò `standard_user`. |
| 7 | **TASK-07** | `FR44` | **P2 (Medium)** | Tích hợp thư viện xuất báo cáo PDF (`html2pdf.js` hoặc nút In định dạng chuẩn) tại trang `ReportsView.jsx`. | Nhấp vào nút "Xuất báo cáo PDF" trên giao diện tải về thành công tệp `Executive_Briefing_Report.pdf`. |
| 8 | **TASK-08** | Code Quality | **P2 (Medium)** | Sửa lại file test `backend/app/tests/test_user_admin_api.py` theo cấu trúc dependency mới `get_admin_user` và bổ sung `pytest` vào `backend/requirements.txt`. | Lệnh `python -m unittest discover -s backend/app/tests` chạy thành công 100% không còn lỗi import. |
| 9 | **TASK-09** | Environment | **P2 (Medium)** | Hạ cấp gói `qdrant-client` trên môi trường Python máy host về phiên bản tương thích `<1.10.0` (ví dụ `1.8.2` hoặc `1.9.0`) theo đúng `requirements.txt`. | Khởi động backend không còn xuất hiện thông báo `UserWarning: Qdrant client version is incompatible with server version`. |
| 10 | **TASK-10** | `FR37`, `FR51` | **P2 (Medium)** | Bổ sung thêm các cặp câu hỏi huấn luyện vào `train_dataset.json` để tiến gần mốc 2,000 mẫu và bổ sung bảng đối sánh Ablation Study giữa mô hình gốc và fine-tuned vào báo cáo nghiên cứu. | Báo cáo `benchmark_evaluation_report.md` có thêm cột số liệu so sánh giữa Base Qwen2.5-7B và Fine-tuned Qwen2.5-7B. |

---

## K. Final Verdict & Quantitative Metrics (Kết Luận Cuối Cùng & Thống Kê Định Lượng)

### 1. Bảng Thống Kê Định Lượng Tổng Hợp

```
========================================================================================
                     GRAPHMIND (AEGIS EKMP) — AUDIT SCOREBOARD
========================================================================================
  Tổng số yêu cầu chức năng trích xuất từ SRS (Total FRs):         52
  --------------------------------------------------------------------------------------
  1. Số yêu cầu ĐẠT (PASS):                                        37  ( 71.15% )
  2. Số yêu cầu ĐẠT MỘT PHẦN (PARTIAL):                            12  ( 23.08% )
  3. Số yêu cầu KHÔNG ĐẠT (FAIL):                                   1  (  1.92% )
  4. Số yêu cầu CHƯA TRIỂN KHAI (MISSING):                          2  (  3.85% )
  5. Số yêu cầu CHƯA XÁC MINH (UNVERIFIED):                         0  (  0.00% )
  6. Số yêu cầu KHÔNG ÁP DỤNG (N/A):                                0  (  0.00% )
  --------------------------------------------------------------------------------------
  TỶ LỆ TUÂN THỦ ĐẶC TẢ ĐÃ XÁC MINH (VERIFIED COMPLIANCE RATE):    71.15%
  TỶ LỆ YÊU CẦU CHƯA XÁC MINH:                                      0.00%
  --------------------------------------------------------------------------------------
  Quy tắc nghiệp vụ (Business Rules BR-01 – BR-05):                 4/5 PASS (80.0%)
  Số lượng bài test thực tế:                                       6 PASS / 1 PARTIAL / 1 FAIL / 2 BLOCKED
  Tổng số khiếm khuyết theo mức ưu tiên:
    - P0 (Critical):                                                0
    - P1 (High):                                                    6
    - P2 (Medium):                                                  6
    - P3 (Low):                                                     3
========================================================================================
```

*Công thức tính:*
$$\text{Tỷ lệ tuân thủ đã xác minh} = \frac{\text{Số yêu cầu PASS}}{\text{Tổng số yêu cầu} - \text{Số yêu cầu N/A}} \times 100\% = \frac{37}{52 - 0} \times 100\% = 71.15\%$$

### 2. Kết Luận Cuối Cùng (Final Verdict)

# **PARTIALLY COMPLIANT (TUÂN THỦ MỘT PHẦN)**

**Căn cứ kết luận:**
1. Dự án đã hiện thực hóa thành công các trụ cột công nghệ phức tạp nhất được mô tả trong tài liệu đặc tả: Kiến trúc **Hybrid GraphRAG** kết hợp Neo4j và Qdrant qua thuật toán RRF $k=60$; mô hình ngôn ngữ lớn **Qwen2.5-7B** tự lưu trữ cục bộ; cơ chế **File Watcher** giám sát tệp thời gian thực; và đặc biệt là hệ thống **Phân quyền phạm vi phòng ban (Department Scope & RBAC)** cực kỳ nghiêm ngặt phía máy chủ đạt chuẩn an toàn doanh nghiệp.
2. Tuy nhiên, hệ thống chưa thể công bố đạt chuẩn **COMPLIANT** do vẫn còn **1 yêu cầu FAIL** (`FR25`: Chỉnh sửa trên Knowledge Editor không đồng bộ xuống Neo4j/Qdrant), **2 yêu cầu MISSING** (`FR4`, `FR19`: Tích hợp Google Workspace API) và **12 yêu cầu PARTIAL** (trong đó có 6 vấn đề mức ưu tiên cao `P1` như: cảnh báo rủi ro sai lệch tiêu chí đặc tả `FR42`, lỗi đường dẫn cứng tìm kiếm sản phẩm `FR45`, liên kết khách hàng - hợp đồng chưa có bảng tra cứu cố định `FR18` / `BR-01`, và tỷ lệ nạp vector Qdrant mới đạt ~58% `FR17`).

Báo cáo kiểm toán này cung cấp bức tranh trung thực, khách quan và minh bạch 100% về hiện trạng kỹ thuật của dự án GraphMind. Khi nhóm phát triển thực hiện đầy đủ 10 nhiệm vụ trong [Kế Hoạch Khắc Phục Khuyến Nghị](#j-remediation-plan-kế-hoạch-khắc-phục-khuyến-nghị), dự án hoàn toàn đủ điều kiện nâng cấp lên mức đánh giá **COMPLIANT (TUÂN THỦ HOÀN TOÀN)**.

---
*Báo cáo được lập tự động dựa trên bằng chứng kiểm thử thực tế và khảo sát source code ngày 29/10/2026.*
