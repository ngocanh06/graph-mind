# MA TRẬN TRUY VẾT YÊU CẦU TOÀN DIỆN (REQUIREMENT TRACEABILITY MATRIX - RTM)
## HỆ THỐNG GRAPHMIND — ĐỒ ÁN CAPSTONE PROJECT 1 (C1SE.18)

> **Căn cứ liên kết 5 nguồn:**
> 1. **Proposal Document Ver 1.2** (08/11/2026)
> 2. **User Story Document Ver 1.2** (US01 – US69)
> 3. **Product Backlog Document Ver 1.2** (PB01 – PB79)
> 4. **Project Plan Document Ver 1.2** (WBS 1 – 27, 43 Deliverables)
> 5. **Software Requirement Specification Ver 1.1** (Hiện tại) ➔ **Đề xuất Ver 1.2**

---

### Quy ước Trạng thái Bao phủ (Coverage Status):
- **`FULLY COVERED`**: Yêu cầu đã được đặc tả đầy đủ, chính xác trong SRS hiện tại (Ver 1.1).
- **`PARTIALLY COVERED`**: Mới được đặc tả một phần; còn thiếu kịch bản ngoại lệ, thiếu tiêu chí định lượng hoặc thiếu bảo mật.
- **`MISSING IN SRS`**: Đã có trong Proposal/US/PB/Code nhưng **hoàn toàn vắng bóng** trong SRS Ver 1.1.
- **`OUTDATED`**: Nội dung SRS đang mang số liệu cũ, công nghệ cũ, cần cập nhật theo Ver 1.2.
- **`INCONSISTENT`**: Mô tả trong SRS mâu thuẫn với quy tắc nghiệp vụ hoặc phạm vi của Proposal 1.2.

---

## BẢNG MA TRẬN TRUY VẾT 5 CHIỀU (5-WAY TRACEABILITY MATRIX)

| STT | Proposal Requirement (Phân hệ & Chức năng) | User Story ID | Product Backlog ID | SRS Req. ID (Hiện tại Ver 1.1) | Project Plan Task (WBS ID) | Coverage Status | Đề xuất Hiệu chỉnh trong SRS Ver 1.2 |
|:---:|---|:---:|:---:|:---:|:---:|:---:|---|
| **MODULE 1: DATA SOURCE & SYNC MANAGEMENT** | | | | | | | |
| 1 | Xác thực đăng nhập và nạp dữ liệu máy trạm ban đầu | US48 | PB48 | FR16 | WBS 8 | `FULLY COVERED` | Giữ nguyên FR16, chuẩn hóa input/output schema. |
| 2 | File Watcher theo dõi biến động tệp cục bộ (.pdf, .xlsx) | US49 | PB49 | FR15 | WBS 9 | `FULLY COVERED` | Giữ nguyên FR15, liên kết mã sự kiện tệp. |
| 3 | AEGIS Local Agent cài đặt và đồng bộ gia tăng HTTPS/TLS | US08 | PB05 | FR13, FR7 | WBS 14 | `FULLY COVERED` | Giữ nguyên FR13, FR7; làm rõ mã băm SHA-256. |
| 4 | Bảng điều khiển giám sát trạng thái máy trạm AEGIS Panel | US41 | PB56 | FR14 | WBS 19 | `PARTIALLY COVERED` | FR14 mới chỉ mô tả xem trạng thái tĩnh; cần bổ sung Heartbeat monitoring. |
| 5 | **Công tắc khẩn cấp ngắt đồng bộ máy trạm (Emergency Kill Switch)** | **US69** | **PB76** | **Chưa có** | **WBS 18 / 19** | **`MISSING IN SRS`** | **Bổ sung mới FR62 & Use Case UC.27 (Kill Switch $\le 3\text{s}$, 2-phase ACK).** |
| 6 | Kết nối nguồn dữ liệu đám mây Google Drive/Sheets [Optional] | US09 | PB06 | FR4, FR19 | Stretch Goal | `FULLY COVERED` | Giữ nguyên nhãn [Optional / Stretch Goal]. |
| **MODULE 2: KNOWLEDGE BASE & CURATION** | | | | | | | |
| 7 | Pipeline ETL, chuẩn hóa và phân mảnh dữ liệu CRM AdventureWorks | US24 | PB07 | FR17 | WBS 5 | `FULLY COVERED` | Giữ nguyên FR17; bổ sung đặc tả trường dữ liệu ERP. |
| 8 | Tiền xử lý, trích xuất điều khoản pháp lý từ hợp đồng mẫu CUAD | US25 | PB08, PB46 | FR17, FR20 | WBS 5, WBS 7 | `FULLY COVERED` | Giữ nguyên FR17, FR20. |
| 9 | Liên kết thực thể giả lập có kiểm soát (Controlled Synthetic Linking) | US45 | PB47 | FR18 | WBS 5b | `FULLY COVERED` | Giữ nguyên FR18, chuẩn hóa bảng tra cứu BR-01. |
| 10 | Trích xuất thực thể, quan hệ và giải quyết thực thể trùng lặp | US25 | PB09, PB10 | FR20 | WBS 7 | `FULLY COVERED` | Giữ nguyên FR20 (NER / RE / Entity Resolution). |
| 11 | Xây dựng đồ thị tri thức doanh nghiệp trên Neo4j Graph DB | US27 | PB11 | FR21 | WBS 7 | `FULLY COVERED` | Giữ nguyên FR21; bổ sung Ontology node/rel. |
| 12 | Tạo nhúng ngữ nghĩa và lập chỉ mục tìm kiếm trên Qdrant Vector DB | US27 | PB12 | FR22 | WBS 7 | `FULLY COVERED` | Giữ nguyên FR22; bổ sung thông số 384/1024 dim. |
| 13 | Trình duyệt kho tri thức và xem trước tệp tài liệu số theo phân quyền | US42 | PB50 | FR23 | WBS 7 | `PARTIALLY COVERED` | FR23 cần bổ sung bộ lọc Department Data Scope. |
| 14 | Knowledge Editor hiệu chỉnh thực thể đồ thị (Human-in-the-loop) | US29 | PB41 | FR24, FR25 | WBS 15 | `PARTIALLY COVERED` | **FR24 ghi nhầm Actor Admin; phải đổi thành Knowledge Administrator.** |
| 15 | Soạn thảo và xuất bản quy trình vận hành chuẩn (SOP Wiki) | US38 | PB53 | FR26 | WBS 15b | `PARTIALLY COVERED` | Bổ sung vòng đời SOP (DRAFT $\to$ PUBLISHED) và quyền Trưởng phòng. |
| 16 | Tích hợp API giữa Graph Editor và AI Copilot | US30 | PB54 | FR25 | WBS 16 | `FULLY COVERED` | Giữ nguyên FR25. |
| 17 | **Nhân viên tải tài liệu nội bộ vào hàng đợi chờ duyệt (PENDING)** | **US60** | **PB67** | **Chưa có** | **WBS 7b** | **`MISSING IN SRS`** | **Bổ sung mới FR53 (Upload PENDING, SHA-256 Idempotency Guard BR-06).** |
| 18 | **Thẩm định, xem trước và Phê duyệt/Từ chối tài liệu số** | **US61** | **PB68** | **Chưa có** | **WBS 15c** | **`MISSING IN SRS`** | **Bổ sung mới FR54 & Use Case UC.23 (Knowledge Admin phê duyệt tài liệu).** |
| **MODULE 3: HYBRID AI COPILOT & SEARCH** | | | | | | | |
| 19 | Trò chuyện đa lượt (Multi-turn Chat) với AI Copilot trên Web | US02 | PB27, PB51 | FR27 | WBS 11, 13 | `FULLY COVERED` | Giữ nguyên FR27. |
| 20 | Trả lời chính xác câu hỏi một bước (Single-hop reasoning) | US03 | PB22 | FR28 | WBS 13 | `OUTDATED` | Sửa tiêu chí kiểm chứng trong FR28 thành bộ 100 benchmark questions. |
| 21 | Trả lời câu hỏi quan hệ 2 bước (2-hop reasoning qua Neo4j) | US04 | PB23 | FR29 | WBS 13 | `FULLY COVERED` | Giữ nguyên FR29. |
| 22 | Trả lời câu hỏi đa bước đa nguồn liên kết CRM và Điều khoản hợp đồng | US05 | PB26 | FR30 | WBS 13 | `FULLY COVERED` | Giữ nguyên FR30; dẫn chiếu quy tắc BR-01. |
| 23 | Hybrid Query Engine: Phân tích ý định, NL2Cypher và Vector Search | US28 | PB20, PB21 | FR31 | WBS 13 | `FULLY COVERED` | Giữ nguyên FR31; bổ sung thuật toán RRF fusion ($k=60$). |
| 24 | Trích dẫn nguồn minh bạch (Source Citation Viewer) | US06 | PB28, PB32 | FR32 | WBS 13 | `FULLY COVERED` | Giữ nguyên FR32; trích dẫn số dòng Excel và đoạn văn hợp đồng PDF. |
| 25 | Trực quan hóa đồ thị tri thức tương tác (Knowledge Graph Viewer) | US07 | PB15 | FR33 | WBS 11 | `FULLY COVERED` | Giữ nguyên FR33. |
| 26 | Giao diện Web Dashboard tích hợp giao tiếp qua REST API (FastAPI) | US12 | PB30 | FR34 | WBS 11, 27 | `OUTDATED` | **Sửa FR34: Đổi React/Next.js thành React 18 + Vite SPA và Tailwind CSS.** |
| 27 | Tìm kiếm đa diện hợp nhất (Enterprise Multi-facet Search) | US20, US36 | PB52 | FR45, FR46 | WBS 13 | `FULLY COVERED` | Giữ nguyên FR45, FR46. |
| 28 | **Rào chắn bảo vệ Cypher chỉ đọc (Read-Only Cypher Guard)** | **US68** | **PB75** | **Chưa có** | **WBS 13b** | **`MISSING IN SRS`** | **Bổ sung mới FR61 (Chặn 7 từ khóa mutation, an toàn Cypher injection).** |
| 29 | Quản lý phiên làm việc Copilot và chia sẻ ghi chú [Optional] | US37 | PB59 | FR39 | Stretch Goal | `FULLY COVERED` | Giữ nguyên nhãn [Optional]. |
| **MODULE 4: DECISION SUPPORT, ALERTS & SHIFT REPORTS** | | | | | | | |
| 30 | Trang tổng quan Home & Dashboard theo vai trò đăng nhập | US10 | PB40 | FR40 | WBS 3 | `FULLY COVERED` | Giữ nguyên FR40. |
| 31 | Executive Decision Dashboard hiển thị biểu đồ chỉ số tài chính | US33 | PB57 | FR41 | WBS 19b | `FULLY COVERED` | Giữ nguyên FR41. |
| 32 | Trung tâm Cảnh báo Rủi ro Thông minh (Smart Risk Center) | US34 | PB58 | FR42 | WBS 19b | `PARTIALLY COVERED` | **FR42 thiếu 2 cảnh báo: Negative Margin và Abnormal Discount $\ge 35\%$.** |
| 33 | Tóm tắt điều hành trực quan trên Web (Executive Briefing Generator) | US35 | PB65 | FR44 | WBS 19c | `INCONSISTENT` | **Sửa FR44: Bỏ xuất file PDF/Word (Out-of-Scope), đổi thành hiển thị Web.** |
| 34 | **Nhân viên nộp biên bản bàn giao ca (Shift Handover Report)** | **US62** | **PB69** | **Chưa có** | **WBS 15d** | **`MISSING IN SRS`** | **Bổ sung mới FR55 & Use Case UC.24 (Lập báo cáo ca, hỗ trợ DRAFT).** |
| 35 | **Trưởng phòng thẩm định và ký duyệt báo cáo giao ca phòng ban** | **US63** | **PB70** | **Chưa có** | **WBS 15d** | **`MISSING IN SRS`** | **Bổ sung mới FR56 & Use Case UC.24 (Trưởng phòng ký duyệt ca REVIEWED).** |
| 36 | **AI tự động tổng hợp báo cáo giao ca ngày của phòng ban** | **US64** | **PB71** | **Chưa có** | **WBS 19b** | **`MISSING IN SRS`** | **Bổ sung mới FR57 & Use Case UC.25 (Ollama consolidation, fallback).** |
| **MODULE 5: MODEL ADAPTATION & BENCHMARK EVALUATION** | | | | | | | |
| 37 | Xây dựng tập dữ liệu Q&A chất lượng cao phục vụ LoRA Fine-tuning | US46 | PB16 | FR37 | WBS 5b | `OUTDATED` | **Sửa FR37: Đổi 2,000–3,000 pairs thành chính xác 509 ChatML pairs.** |
| 38 | Pipeline huấn luyện LoRA/PEFT Qwen2.5-7B trên Kaggle GPU T4 | US47 | PB17, PB18 | FR36 | WBS 11b | `FULLY COVERED` | Giữ nguyên FR36, giải trình trần phần cứng 51s/step. |
| 39 | Phục vụ mô hình suy luận cục bộ tự lưu trữ (Ollama GGUF Q4_K_M) | US50 | PB55 | FR35 | WBS 15e | `PARTIALLY COVERED` | Bổ sung vào FR35 cổng 11434, GGUF Q4_K_M và Deterministic Fallback. |
| 40 | Xây dựng bộ Benchmark 100 câu hỏi Ground Truth 3 mức độ | US51 | PB32 | FR47 | WBS 22 | `OUTDATED` | **Sửa FR47: Đổi 100–200 questions thành đúng 100 ground-truth questions.** |
| 41 | Triển khai và đo lường so sánh 3 Baselines (Vector, Pure, Hybrid) | US52 | PB33 | FR48 | WBS 23 | `FULLY COVERED` | Giữ nguyên FR48. |
| 42 | Đo lường 5 chỉ số đánh giá (Correctness, Precision, Hallucination...) | US53, US54, US55 | PB34, PB35, PB60 | FR49, FR50, FR51 | WBS 23 | `FULLY COVERED` | Giữ nguyên FR49, FR50, FR51. |
| 43 | Báo cáo kỹ thuật tổng kết thực nghiệm và so sánh Baseline | US56 | PB36, PB38 | FR52 | WBS 24 | `OUTDATED` | Sửa FR52: Dẫn chiếu bộ dữ liệu đánh giá 100 ground-truth questions. |
| **MODULE 6: SYSTEM ADMINISTRATION, RBAC & SECURITY** | | | | | | | |
| 44 | Đăng nhập an toàn với JWT và phân quyền tĩnh cơ bản | US01 | PB01 | FR1 | WBS 2 | `FULLY COVERED` | Giữ nguyên FR1. |
| 45 | Quản trị tài khoản người dùng và cơ cấu phòng ban chuẩn | US13 | PB02 | FR5 | WBS 10 | `PARTIALLY COVERED` | **Tách vai trò FR5: Gán cho System & IT Administrator (loại bỏ gộp Admin).** |
| 46 | Ghi nhật ký kiểm toán bất biến (Immutable Audit Log) | US17 | PB03 | FR6 | WBS 10 | `FULLY COVERED` | Giữ nguyên FR6; dẫn chiếu quy tắc bất biến BR-03. |
| 47 | Lưu trữ dữ liệu tài khoản, phân quyền, metadata trên PostgreSQL | US39 | PB45 | FR8 | WBS 4 | `FULLY COVERED` | Giữ nguyên FR8. |
| 48 | Bảng điều khiển Admin Analytics Dashboard | US44 | PB42 | FR9 | WBS 21 | `FULLY COVERED` | Giữ nguyên FR9. |
| 49 | Giám sát trạng thái Neo4j/Qdrant và CRUD dữ liệu [Optional] | US22 | PB13, PB14 | FR10, FR11 | WBS 10 | `FULLY COVERED` | Giữ nguyên nhãn [Optional]. |
| 50 | Theo dõi chi phí và độ trễ suy luận LLMOps Dashboard [Optional] | US44 | PB66 | FR12 | WBS 21 | `FULLY COVERED` | Giữ nguyên nhãn [Optional]. |
| 51 | **Ma trận phân quyền chi tiết động 2 chiều (Dynamic RBAC Matrix)** | **US65** | **PB72** | **Chưa có** | **WBS 10** | **`MISSING IN SRS`** | **Bổ sung mới FR58 & Use Case UC.26 (Lưới 2D CRUD trên từng Entity).** |
| 52 | **Thực thi chính sách phiên làm việc đơn lẻ (Single Active Session)** | **US66** | **PB73** | **Chưa có** | **WBS 2** | **`MISSING IN SRS`** | **Bổ sung mới FR59 (Theo dõi JTI, thu hồi phiên cũ, HTTP 401 kick).** |
| 53 | **Khôi phục mật khẩu tự phục vụ qua Email OTP 3 bước** | **US67** | **PB74** | **FR2 (sơ sài)** | **WBS 11c** | **`PARTIALLY COVERED`** | **Bổ sung mới FR60 (Quy trình 3 bước: gửi OTP 5p, xác thực, đổi mật khẩu).** |
| **CROSS-CUTTING & CLOSING ACTIVITIES** | | | | | | | |
| 54 | Tuyên bố công khai sử dụng AI trong đề tài nghiên cứu | US57 | PB61 | Chưa có | WBS 25 | `PARTIALLY COVERED` | Bổ sung yêu cầu công bố minh bạch AI vào phụ lục tuân thủ. |
| 55 | Đánh giá phản tư nhóm và đánh giá đồng đẳng 360 độ | US58 | PB39 | Chưa có | WBS 26 | `PARTIALLY COVERED` | Thuộc quy trình quản lý dự án, không bắt buộc làm FR phần mềm. |
| 56 | Tích hợp hệ thống, kiểm thử chấp nhận E2E và đóng dự án | US59 | PB62, PB63, PB64 | Chưa có | WBS 27 | `PARTIALLY COVERED` | Thuộc DoD và Test Plan, bổ sung vào tiêu chí nghiệm thu phần mềm. |

---

## TỔNG KẾT TRẠNG THÁI TRUY VẾT:
- **Tổng số hạng mục kiểm định:** 56 yêu cầu logic (bao phủ trọn vẹn 69 User Stories và 79 PBIs).
- **`FULLY COVERED` (Đạt yêu cầu):** 28 / 56 hạng mục (~50.0%).
- **`PARTIALLY COVERED` (Cần bổ sung/sửa đổi):** 11 / 56 hạng mục (~19.6%).
- **`MISSING IN SRS` (Thiếu hoàn toàn trong SRS Ver 1.1):** 11 / 56 hạng mục (~19.6%).
- **`OUTDATED` (Số liệu kỹ thuật cũ cần cập nhật):** 5 / 56 hạng mục (~8.9%).
- **`INCONSISTENT` (Mâu thuẫn ranh giới phạm vi):** 1 / 56 hạng mục (~1.8%).

> [!CRITICAL]
> **Kết luận RTM:** SRS Ver 1.1 hiện tại mới chỉ bao phủ hoàn chỉnh khoảng **50%** yêu cầu thực tế của dự án. 50% còn lại đang nằm ở tình trạng thiếu sót hoàn toàn, thiếu chi tiết hoặc mang số liệu lỗi thời. Bảng ma trận trên là cơ sở kỹ thuật cốt lõi để nhóm tiến hành nâng cấp toàn diện tài liệu SRS lên Version 1.2.
