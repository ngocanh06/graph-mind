# HƯỚNG DẪN CẬP NHẬT TÀI LIỆU SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## TỪ PHIÊN BẢN 1.1 LÊN PHIÊN BẢN 1.2 — HỆ THỐNG GRAPHMIND
### ĐỐI CHIẾU THEO PROPOSAL VER 1.2, USER STORY VER 1.2, PRODUCT BACKLOG VER 1.2, PROJECT PLAN VER 1.2 VÀ SOURCE CODE THỰC TẾ

> **Dự án:** GraphMind (Enterprise Knowledge Management Platform for SME Decision Support)  
> **Mã đề tài:** Capstone Project 1 — C1SE.18 — Đại học Duy Tân (Duy Tan University)  
> **Tài liệu gốc cần chỉnh sửa:** `docs/05-srs/5. C1SE18_SRS_GraphMind_Ver1.1.docx`  
> **Tài liệu ban hành dự kiến:** `docs/05-srs/C1SE18_SRS_GraphMind_Ver1.2.docx`  
> **Tài liệu đối chiếu căn cứ:**  
> 1. `docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx` (08/11/2026)  
> 2. `docs/02-user-story/C1SE18_UserStory_GraphMind-Ver1.2.docx` (69 User Stories)  
> 3. `docs/04-product-backlog/C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (79 PBIs)  
> 4. `docs/03-project-plan/C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (40 WBS, 43 Deliverables)  
> 5. Toàn bộ mã nguồn thực tế của hệ thống (`backend/app`, `frontend/src`, `aegis-agent`).  

---

<div style="border: 2px solid red; background-color: #fff5f5; padding: 14px; margin: 15px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.15em;">[QUY TẮC BẮT BUỘC VỀ SƠ ĐỒ / HÌNH VẼ: KHÔNG TẠO HÌNH ẢNH — CHỈ TẠO CHÚ THÍCH SƠ ĐỒ BÔI ĐỎ]</span>
<p style="color: #b30000; margin-top: 8px; line-height: 1.6; font-size: 0.95em;">
Theo đúng yêu cầu nghiệm thu, tài liệu này <strong>TUYỆT ĐỐI KHÔNG TẠO FILE HÌNH ẢNH</strong> (không render image file PNG/JPG/SVG hay vẽ sơ đồ ASCII/Mermaid thô thay thế ảnh). Mọi vị trí sơ đồ trong tài liệu SRS Ver 1.2 đều được đặc tả bằng một <strong>KHỐI CHÚ THÍCH SƠ ĐỒ ĐƯỢC BÔI ĐỎ</strong> (Red Callout Box). Mỗi khối cung cấp đầy đủ: Tên sơ đồ, Loại biểu đồ UML/BPMN, Tác tử (Actors), Thực thể/Thành phần tham gia (Components/Entities), Quy trình luồng tương tác chi tiết từng bước, và Quy tắc nghiệp vụ liên quan. Nhóm tác giả khi biên soạn sang file Word <code>C1SE18_SRS_GraphMind_Ver1.2.docx</code> sẽ sử dụng trực tiếp các chỉ dẫn bôi đỏ này để chèn hoặc vẽ sơ đồ tương ứng.
</p>
</div>

---

## MỤC LỤC
1. [Tóm tắt Đánh giá & Ma trận Ưu tiên Cập nhật](#1-tóm-tắt-đánh-giá--ma-trận-ưu-tiên-cập-nhật)
2. [Cập nhật Thông tin Đầu trang, Metadata & Lịch sử Sửa đổi](#2-cập-nhật-thông-tin-đầu-trang-metadata--lịch-sử-sửa-đổi)
3. [Tái cấu trúc Chương & Khắc phục Lỗi Trùng lặp Tiêu đề](#3-tái-cấu-trúc-chương--khắc-phục-lỗi-trùng-lặp-tiêu-đề)
4. [Phân tách Vai trò Actor theo Business Rule BR-04](#4-phân-tách-vai-trò-actor-theo-business-rule-br-04)
5. [Đặc tả Chi tiết 10 Functional Requirements Mới (FR53 ➔ FR62)](#5-đặc-tả-chi-tiết-10-functional-requirements-mới-fr53--fr62)
6. [Danh mục Hiệu chỉnh Chi tiết 52 Functional Requirements Hiện có (FR01 ➔ FR52)](#6-danh-mục-hiệu-chỉnh-chi-tiết-52-functional-requirements-hiện-có-fr01--fr52)
7. [Đặc tả 5 Use Cases Nghiệp vụ Mới (UC.23 ➔ UC.27)](#7-đặc-tả-5-use-cases-nghiệp-vụ-mới-uc23--uc27)
8. [Chuẩn hóa & Bổ sung Luồng Ngoại lệ (Exception Flows) cho 22 Use Cases Hiện có (UC.01 ➔ UC.22)](#8-chuẩn-hóa--bổ-sung-luồng-ngoại-lệ-exception-flows-cho-22-use-cases-hiện-có-uc01--uc22)
9. [Danh mục Toàn bộ Chú thích Sơ đồ Bôi đỏ (Red Diagram Annotations)](#9-danh-mục-toàn-bộ-chú-thích-sơ-đồ-bôi-đỏ-red-diagram-annotations)
10. [Chuẩn hóa & Định lượng hóa Yêu cầu Phi chức năng (NFRs - Bảng 8)](#10-chuẩn-hóa--định-lượng-hóa-yêu-cầu-phi-chức-năng-nfrs---bảng-8)
11. [Bổ sung Yêu cầu Giao diện & Kiến trúc Dữ liệu Hệ thống](#11-bổ-sung-yêu-cầu-giao-diện--kiến-trúc-dữ-liệu-hệ-thống)
12. [Ma trận Truy vết Toàn diện 5 Chiều Mới (Full 5-Way RTM - Bảng 34 Mới)](#12-ma-trận-truy-vết-toàn-diện-5-chiều-mới-full-5-way-rtm---bảng-34-mới)
13. [Checklist Nghiệm thu Cập nhật Tài liệu Word (C1SE18_SRS_GraphMind_Ver1.2.docx)](#13-checklist-nghiệm-thu-cập-nhật-tài-liệu-word-c1se18_srs_graphmind_ver12docx)

---
## 1. TÓM TẮT ĐÁNH GIÁ & MA TRẬN ƯU TIÊN CẬP NHẬT

Qua đợt kiểm toán toàn diện tài liệu **SRS Ver 1.1** theo tiêu chuẩn **ISO/IEC/IEEE 29148:2018 (Requirements Engineering)** đối chiếu chéo với Proposal Ver 1.2, User Story Ver 1.2, Product Backlog Ver 1.2, Project Plan Ver 1.2 và Mã nguồn thực tế, điểm số chất lượng hiện tại đạt **64.25 / 100** (Xếp loại D - Cần nâng cấp toàn diện). 

Tài liệu cần được thực hiện **5 nhóm can thiệp cốt lõi**:

1. **Bổ sung 10 Functional Requirements bị bỏ sót (FR53 – FR62):** Tương ứng trực tiếp với 10 User Stories mới (US60–US69) và 10 PBIs mới (PB67–PB76) đã được cam kết và hiện diện trong Source Code (`document_approval_router.py`, `shift_reports.py`, `rbac_matrix_router.py`, `session_service.py`, `text_to_cypher.py`, `pb56_workstations.py`).
2. **Khắc phục lỗi cấu trúc chương và đánh số đề mục:** Sáp nhập hai Chương 2 và Chương 3 bị trùng tiêu đề (`2. Overall Description` và `3. Overall Description`), loại bỏ xung đột đánh số mục con trùng nhau (`3.2 System Context Diagram` và `3.2 Product Functions`).
3. **Phân lập Actor Quản trị theo Business Rule BR-04:** Tách vai trò gộp `System & Knowledge Administrator (Admin)` thành 2 Actor riêng biệt: **System & IT Administrator** (`it_admin`) và **Knowledge Administrator** (`knowledge_manager`), đảm bảo an ninh nguyên tắc phân quyền tối thiểu (Least Privilege).
4. **Bổ sung toàn bộ Luồng Ngoại lệ (Exception Flows):** Trong Ver 1.1, 100% các bảng Use Case từ UC.01 đến UC.22 đều để trống mục Exception Flow. Cần bổ sung đầy đủ kịch bản xử lý lỗi kết nối DB, timeout mạng, lỗi xác thực token, mã độc Cypher, định dạng tệp hỏng.
5. **Đính chính số liệu kỹ thuật & loại bỏ tính năng Out-of-Scope:** Cập nhật 509 ChatML pairs (FR37), 100 benchmark questions (FR47), React 18 + Vite SPA (FR34), Negative Margin & Abnormal Discount >= 35% (FR42); loại bỏ tính năng xuất file PDF/Word khỏi FR44 (đã Out-of-Scope theo Proposal §4.2).

### Ma trận Phân loại Ưu tiên (Priority Action Matrix)

| Cấp độ Ưu tiên | Nhóm Công việc Cần thực hiện | Số lượng Yêu cầu / Hạng mục | Tác động Rủi ro nếu không sửa |
|---|---|:---:|---|
| <span style="color:red; font-weight:bold;">PHASE 1: CRITICAL (P1)</span> | Bổ sung 10 FRs mới (FR53–FR62); Bổ sung 5 Use Cases mới (UC.23–UC.27); Khắc phục xung đột cấu trúc Chương 2 & 3. | 10 FRs, 5 UCs, 1 Structure fix | Hội đồng đánh giá không đồng bộ phạm vi giữa Proposal, User Story và SRS; mất điểm Completeness. |
| <span style="color:#e67e22; font-weight:bold;">PHASE 2: HIGH (P2)</span> | Tách biệt Actor IT Admin vs Knowledge Admin (BR-04); Bổ sung 100% Exception Flows cho UC.01–UC.22; Cập nhật Bảng NFRs định lượng chuẩn Locust. | 22 UCs, 1 Role split, 6 NFRs | Vi phạm kiến trúc an ninh thông tin; Use Case không thể dùng làm đầu vào cho QA viết Test Cases. |
| <span style="color:#2980b9; font-weight:bold;">PHASE 3: MEDIUM (P3)</span> | Đính chính số liệu FR37 (509 ChatML), FR47 (100 Qs), FR34 (React Vite), FR42 (cảnh báo tài chính); Loại bỏ PDF export khỏi FR44. | 6 FRs, 1 Scope fix | Mâu thuẫn kỹ thuật với Proposal Ver 1.2 và Source Code thực tế của hệ thống. |
| <span style="color:#27ae60; font-weight:bold;">PHASE 4: LOW (P4)</span> | Cập nhật Bảng Thuật ngữ (Glossary); Thay thế Bảng 34 bằng Ma trận Truy vết 5 chiều (79 hàng); Bổ sung các khối chú thích sơ đồ bôi đỏ. | 1 RTM, 1 Glossary, 65 Chú thích sơ đồ | Hoàn thiện định dạng chuyên nghiệp, đạt 100% tiêu chuẩn ISO/IEC/IEEE 29148. |

---
## 2. CẬP NHẬT THÔNG TIN ĐẦU TRANG, METADATA & LỊCH SỬ SỬA ĐỔI

### 2.1. Cập nhật Bìa & Thông tin Phiên bản (Title & Document Metadata)
- **Document Title:** Software Requirements Specification (SRS) for GraphMind (Enterprise Knowledge Management Platform for SME Decision Support)
- **Document Version:** Đổi từ `1.1` thành **`1.2`**.
- **Publication Date:** Cập nhật thành **`14/11/2026`** (đồng bộ với thời điểm hoàn thiện Proposal Ver 1.2 và Product Backlog Ver 1.2).
- **Target Audience:** Development Team, QA/QC Team, Project Manager, Product Owner, Solution Architect, Academic Review Committee (Hội đồng Đánh giá Đồ án Tốt nghiệp).

### 2.2. Bổ sung Lịch sử Sửa đổi (Document Revision History - Bảng 2)
Thêm một dòng mới vào Bảng Lịch sử Sửa đổi tài liệu:

| Version | Date | Author(s) | Description of Change |
|:---:|:---:|:---:|---|
| **1.2** | 14/11/2026 | C1SE18 Project Team | **Nâng cấp Toàn diện Chuẩn hóa IEEE 29148:**<br/>1. Bổ sung 10 Functional Requirements (FR53–FR62) cho 10 User Stories mới (US60–US69).<br/>2. Tách biệt Actor System & IT Admin và Knowledge Admin theo Business Rule BR-04.<br/>3. Tái cấu trúc Chương 2 & 3, khắc phục hoàn toàn lỗi trùng lặp tiêu đề và đề mục.<br/>4. Bổ sung 5 Use Cases mới (UC.23–UC.27) và đặc tả 100% Exception Flows cho 22 Use Cases cũ.<br/>5. Định lượng hóa bảng NFRs (Locust benchmark p95 < 500ms read, < 2000ms heavy under 150 VU).<br/>6. Đính chính thông số kỹ thuật (509 ChatML pairs, React 18 + Vite SPA, 100 benchmark Qs, loại bỏ PDF export khỏi FR44).<br/>7. Thay thế Bảng RTM 34 cũ bằng Ma trận Truy vết Toàn diện 5 Chiều 79 dòng. |

### 2.3. Cập nhật Bảng Thuật ngữ & Từ viết tắt (Table 4: Acronyms & Abbreviations)
Bổ sung các thuật ngữ kỹ thuật mới phát sinh từ các tính năng nâng cấp:

| Term / Acronym | Full Name / Expansion | Definition in GraphMind |
|---|---|---|
| **AEGIS** | Autonomous Enterprise Gathering & Inspection Sentinel | Agent chạy ngầm trên trạm máy Windows trích xuất tệp cục bộ và giám sát an toàn trạm làm việc. |
| **ChatML** | Chat Markup Language | Định dạng chuẩn hóa dữ liệu đàm thoại đa lượt dùng huấn luyện mô hình LoRA/PEFT (509 cặp). |
| **Cypher Guard** | AST-based Cypher AST Security Interceptor | Bộ phân tích cú pháp AST chặn đứng mọi truy vấn Cypher mang từ khóa biến đổi dữ liệu đồ thị. |
| **JTI** | JWT ID (Unique Token Identifier) | Mã định danh duy nhất của JSON Web Token dùng để thu hồi phiên đăng nhập đơn lẻ qua Redis. |
| **Locust** | Python-based Distributed Load Testing Tool | Công cụ kiểm thử hiệu năng tải phân tán giả lập 150 người dùng đồng thời trên hệ thống. |
| **PB** | Product Backlog Item | Hạng mục công việc phát triển trong tài liệu Product Backlog (PB01–PB79). |
| **Qdrant** | High-Performance Vector Database | Cơ sở dữ liệu vector lưu trữ và tra cứu tương đồng các đoạn văn bản (Embedding 768 chiều). |
| **RTM** | Requirements Traceability Matrix | Ma trận truy vết yêu cầu 5 chiều từ Proposal đến US, PB, SRS và WBS. |
| **SOP** | Standard Operating Procedure | Quy trình vận hành tiêu chuẩn nội bộ được số hóa vào Knowledge Base. |
| **TOTP / OTP** | Time-based One-Time Password | Mã xác thực dùng một lần qua Email có hiệu lực trong 5 phút dùng cho khôi phục mật khẩu. |

---
## 3. TÁI CẤU TRÚC CHƯƠNG & KHẮC PHỤC LỖI TRÙNG LẶP TIÊU ĐỀ

### 3.1. Phân tích Khuyết tật Cấu trúc trong SRS Ver 1.1
Tài liệu SRS Ver 1.1 hiện tại mắc phải lỗi phân rã cấu trúc nghiêm trọng:
- Có tới **hai Chương cấp 1 cùng mang tên "Overall Description"** (Dòng 55: `2. Overall Description` và Dòng 94: `3. Overall Description`).
- Trong mục số 3, có **hai mục cấp 2 cùng mang mã số 3.2**: `3.2 System Context Diagram` và `3.2 Product Functions`.
- Các yêu cầu chức năng (FR) được gom ở Chương 4 nhưng các mô hình hệ thống (Use Case, Activity, Sequence, Class) lại nằm ở Chương 5, gây phân mảnh và khó đối chiếu.

### 3.2. Cấu trúc Chuẩn hóa Toàn diện cho SRS Ver 1.2 (Theo IEEE 29148:2018)
Tiến hành gộp và tái cấu trúc lại hệ thống đề mục xuyên suốt tài liệu Word mới như sau:

```diff
--- CẤU TRÚC LỖI TRONG SRS VER 1.1
- 1. Introduction
- 2. Overall Description (Chứa 2.1 Purpose, 2.2 Scope)
- 3. Overall Description (Chứa 3.1 Perspective, 3.2 Context Diagram, 3.2 Product Functions, 3.3 Users...)
- 4. Specific Requirements (Chứa 4.1 Functional, 4.2 Non-functional, 4.3 External Interfaces)
- 5. System Models (Chứa BFD, Use Cases, Activity, Sequence, Class Diagram)
- 6. Other Requirements (Chứa Business Rules, Constraints)
- Appendix A: Glossary
- Appendix B: Requirement Traceability Matrix (Bảng 34 chỉ có 18 dòng)

+++ CẤU TRÚC CHUẨN HÓA CHO SRS VER 1.2
+ 1. Introduction (Mục đích, Phạm vi tài liệu, Định nghĩa, Tài liệu tham khảo, Tổng quan)
+ 2. Overall Description (Hợp nhất toàn bộ Chương 2 và Chương 3 cũ):
+    2.1 Product Perspective & System Purpose
+    2.2 System Context Diagram (Sơ đồ Ngữ cảnh Hệ thống)
+    2.3 Product Functions Overview (Tổng quan 6 nhóm chức năng)
+    2.4 User Characteristics & Role Separation (5 Actor chuẩn hóa theo BR-04)
+    2.5 General Constraints (Ràng buộc hạ tầng, công nghệ, bảo mật)
+    2.6 Assumptions and Dependencies (Giả định mạng nội bộ, máy chủ GPU, dữ liệu giả lập)
+ 3. Specific Requirements — Functional Requirements:
+    3.1 Module 1: System Administration, Identity & Access Control (FR01–FR05, FR58–FR60)
+    3.2 Module 2: Data Connectors & Ingestion Pipeline (FR06–FR11, FR53, FR54)
+    3.3 Module 3: Knowledge Base Management & Graph Operations (FR12–FR17, FR61)
+    3.4 Module 4: Local LLMOps & Hybrid GraphRAG Copilot (FR18–FR23, FR35–FR39)
+    3.5 Module 5: Departmental Shift Handover & AI Daily Consolidation (FR55–FR57)
+    3.6 Module 6: Executive Analytics, Risk Center & Workstation Containment (FR24–FR34, FR40–FR52, FR62)
+ 4. Specific Requirements — External Interface Requirements:
+    4.1 User Interfaces (Web SPA React 18, Responsive Dashboard)
+    4.2 Hardware Interfaces (NVIDIA GPU 8GB VRAM, Edge Workstation Agent)
+    4.3 Software Interfaces (PostgreSQL 15, Neo4j 5.x, Qdrant Vector DB, Ollama Runtime)
+    4.4 Communications Interfaces (HTTPS/TLS 1.3, WebSocket wss://, SMTP SSL)
+ 5. Specific Requirements — Non-Functional Requirements (Định lượng chuẩn Locust):
+    5.1 Performance & Throughput Requirements
+    5.2 Availability & Reliability Requirements
+    5.3 Security & Privacy Requirements
+    5.4 Scalability & Capacity Requirements
+    5.5 Usability & Accessibility Requirements
+ 6. System Models:
+    6.1 Business Function Diagram (BFD 6 phân hệ)
+    6.2 Use Case Diagrams & Specifications (27 Use Cases: UC.01–UC.27)
+    6.3 Activity Diagrams (27 sơ đồ quy trình hoạt động)
+    6.4 Sequence Diagrams (27 sơ đồ tuần tự hệ thống)
+    6.5 System Class Diagram (Mô hình lớp đối tượng miền nghiệp vụ)
+    6.6 Data Architecture Models (PostgreSQL ERD & Neo4j Ontology Schema)
+    6.7 State Machine Diagrams (Document Approval & Shift Handover Lifecycle)
+ 7. Business Rules & Compliance Constraints (BR-01 đến BR-05 chi tiết)
+ Appendix A: Glossary & Data Dictionary
+ Appendix B: Full 5-Way Requirement Traceability Matrix (Bảng 79 dòng hoàn chỉnh)
```

---
## 4. PHÂN TÁCH VAI TRÒ ACTOR THEO BUSINESS RULE BR-04

### 4.1. Thay thế Mục 3.3 (SRS Ver 1.1) / Mục 2.4 (SRS Ver 1.2): User Characteristics & Roles
SRS Ver 1.1 hiện tại quy định vai trò: `System & Knowledge Administrator (Admin)`. Điều này vi phạm nghiêm trọng **Business Rule BR-04 (Role Separation)** và kiến trúc an ninh thông tin: Người quản trị tài khoản/máy chủ không được phép tùy tiện chỉnh sửa tri thức nghiệp vụ, và ngược lại Chuyên viên tri thức không được can thiệp vào máy chủ và phân quyền tài khoản.

Trong SRS Ver 1.2, nhóm tác giả cần thay thế toàn bộ mô tả cũ bằng **5 Actor chính thức** sau:

| Mã Actor | Tên Vai trò (Role Name) | Nhãn Kỹ thuật (Key) | Mục đích & Trách nhiệm Nghiệp vụ (Responsibilities) | Phạm vi Quyền hạn (Access Scope) |
|:---:|---|:---:|---|---|
| **ACT-01** | **System & IT Administrator** | `it_admin` | Quản trị hạ tầng máy chủ, quản lý tài khoản người dùng, cấu hình Ma trận phân quyền động (`rbac_permissions_matrix`), giám sát phiên đăng nhập duy nhất (`user_active_sessions`), theo dõi Audit Log an ninh, kích hoạt công tắc ngắt khẩn cấp (Emergency Kill Switch) máy trạm AEGIS. | Toàn hệ thống hạ tầng & bảo mật. **Tuyệt đối không có quyền can thiệp, chỉnh sửa dữ liệu đồ thị tri thức Neo4j.** |
| **ACT-02** | **Knowledge Administrator** | `knowledge_manager` | Kiểm duyệt tài liệu do nhân viên tải lên (`PENDING_APPROVAL` ➔ `APPROVED`/`REJECTED`), kích hoạt pipeline bóc tách tri thức, sử dụng Knowledge Editor & Graph Editor để chuẩn hóa thực thể/quan hệ trên Neo4j, quản lý SOP Wiki nội bộ. | Toàn quyền kiểm soát tài liệu và đồ thị tri thức. **Không có quyền quản lý tài khoản người dùng, phân quyền hay xóa Audit Log.** |
| **ACT-03** | **Executive** | `executive` | Ban Giám đốc và Lãnh đạo cấp cao doanh nghiệp SME. Truy cập Dashboard điều hành tổng quan, theo dõi Trung tâm Cảnh báo Rủi ro Tài chính (Negative Margin, Abnormal Discount), xem Báo cáo Tổng hợp Giao ca Hàng ngày, truy vấn AI Copilot toàn quyền dữ liệu xuyên phòng ban. | Toàn quyền đọc dữ liệu tổng hợp và báo cáo điều hành đa phòng ban (Cross-department Scope, BR-05). |
| **ACT-04** | **Department Manager** | `manager` | Cấp Quản lý / Trưởng phòng bộ phận chuyên trách (Kinh doanh, Vận hành, Kế toán...). Tiếp nhận, đánh giá và ký duyệt Biên bản giao ca trực của nhân viên trực thuộc; kích hoạt AI tổng hợp báo cáo giao ca nội bộ bộ phận; tra cứu AI Copilot trong phạm vi phòng ban. | Giới hạn nghiêm ngặt trong phạm vi dữ liệu của phòng ban phụ trách (Department Data Scope). |
| **ACT-05** | **Standard User** | `user` | Nhân viên nghiệp vụ các phòng ban. Đăng nhập hệ thống, khôi phục mật khẩu qua Email OTP, tải tài liệu nghiệp vụ lên hàng đợi chờ duyệt, lập và nộp Biên bản giao ca làm việc hàng ngày, tra cứu tài liệu và hỏi đáp AI Copilot nội bộ phòng ban. | Giới hạn trong phạm vi cá nhân và phòng ban trực thuộc; chỉ đọc tài liệu đã được phê duyệt. |
| *ACT-06* | *Research & Dev Team* | *researcher* | Nhóm nghiên cứu & phát triển (Capstone C1SE18). Xây dựng pipeline dữ liệu, tiền xử lý bộ dữ liệu 509 ChatML pairs, huấn luyện mô hình LoRA, thực thi 100 câu hỏi Benchmark đánh giá độ chính xác. | Quyền hạn thử nghiệm trong môi trường Sandbox/Dev. |

### 4.2. Ma trận Phân quyền Truy cập Dữ liệu (CRUD Permissions Matrix)

| Thực thể / Đối tượng Nghiệp vụ | IT Administrator | Knowledge Administrator | Executive | Department Manager | Standard User |
|---|:---:|:---:|:---:|:---:|:---:|
| Tài khoản & Phòng ban (`users`, `departments`) | **CRUD** | R | R | R (chỉ phòng mình) | R (chỉ xem profile) |
| Ma trận Phân quyền Động (`rbac_matrix`) | **CRUD** | Không | Không | Không | Không |
| Audit Logs & Security Events | **R** | Không | R | Không | Không |
| Tải tài liệu lên hàng đợi (`document_upload`) | C | C | C | C | **C (Pending)** |
| Phê duyệt Tài liệu Nội bộ (`document_approval`) | Không | **CRUD** | R | R (phòng mình) | Không |
| Chỉnh sửa Đồ thị Tri thức (`graph_editor`) | Không | **CRUD** | R | Không | Không |
| Biên bản Bàn giao Ca trực (`shift_reports`) | Không | Không | R (All) | **R, U (Ký duyệt)** | **C, R, U (DRAFT)** |
| Báo cáo Tổng hợp Ca ngày (`shift_summary`) | Không | Không | **R (Toàn DN)** | **C, R (Bộ phận)** | Không |
| Dashboard Rủi ro & Cảnh báo (`risk_center`) | R (Hệ thống) | Không | **CRUD** | R (Bộ phận) | Không |
| AI Copilot Hỏi đáp Đồ thị (Hybrid GraphRAG) | R (Test) | R (Audit) | **R (All Depts)** | **R (Dept Scope)** | **R (Dept Scope)** |
| Công tắc Ngắt Khẩn cấp Máy trạm (`kill_switch`) | **C, U (Execute)** | Không | R (Audit) | Không | Không |

---

## 5. ĐẶC TẢ CHI TIẾT 10 FUNCTIONAL REQUIREMENTS MỚI (FR53 ➔ FR62)

10 yêu cầu chức năng dưới đây đã có sẵn trong Source Code và các tài liệu Proposal Ver 1.2, User Story Ver 1.2 (US60–US69), Product Backlog Ver 1.2 (PB67–PB76), nhưng bị bỏ sót hoàn toàn trong tài liệu SRS Ver 1.1. Cần bổ sung nguyên văn đặc tả kỹ thuật này vào **Mục 3: Specific Requirements — Functional Requirements** của tài liệu SRS Ver 1.2.

---

### FR53: Tải lên Tài liệu Nội bộ Chờ duyệt (Staff Internal Document Upload)
- **Mã Yêu cầu:** `FR53` (Ánh xạ: US60 / PB67 / WBS-13 / Source: `document_approval_router.py`)
- **Tên Chức năng:** Nhân viên tải tài liệu nội bộ vào hàng đợi phê duyệt.
- **Tác tử (Actor):** Standard User (`user`), Department Manager (`manager`).
- **Mô tả chi tiết:** Hệ thống cho phép người dùng thuộc các phòng ban nghiệp vụ tải lên các tệp tài liệu nội bộ (.pdf, .docx, .txt, .xlsx) có kích thước tối đa 50MB. Hệ thống tự động tính toán mã băm SHA-256 để chống trùng lặp dữ liệu (Idempotency Check). Khi lưu trữ vào PostgreSQL bảng `documents`, tài liệu được gán trạng thái khởi tạo mặc định là `PENDING_APPROVAL`. Tài liệu ở trạng thái này chưa được đưa vào đồ thị tri thức Neo4j hay lập chỉ mục vector Qdrant.
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng đã đăng nhập hệ thống với tài khoản hợp lệ thuộc một phòng ban cụ thể.
- **Điều kiện kết thúc (Post-conditions):** Bản ghi tài liệu được lưu trữ an toàn trong cơ sở dữ liệu với trạng thái `PENDING_APPROVAL`, thông báo tải lên thành công được phản hồi về giao diện.
- **Dữ liệu Đầu vào (Inputs):** File đính kèm, Tên tài liệu, Mô tả vắn tắt, Phòng ban sở hữu (`department_id`).
- **Dữ liệu Đầu ra (Outputs):** `document_id`, mã SHA-256 hash, trạng thái `PENDING_APPROVAL`, dấu thời gian `created_at`.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng truy cập màn hình *Document Upload*, chọn tệp từ máy tính cục bộ.
  2. Frontend kiểm tra định dạng (.pdf, .docx, .txt, .xlsx) và kích thước tệp (<= 50MB).
  3. Frontend gửi tệp qua API `POST /api/v1/documents/upload`.
  4. Backend tính toán chuỗi mã băm SHA-256 của nội dung tệp.
  5. Backend kiểm tra mã SHA-256 trong bảng `documents`. Nếu chưa tồn tại, lưu tệp vào Storage và tạo bản ghi với trạng thái `PENDING_APPROVAL`.
  6. Backend ghi log kiểm toán hành vi tải tài liệu vào `audit_logs`.
  7. Hệ thống trả về mã trạng thái `201 Created` kèm thông tin tài liệu.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Tệp sai định dạng:* Hệ thống từ chối tải lên, trả về mã lỗi `400 Bad Request` kèm thông báo: "Chỉ chấp nhận các tệp tài liệu định dạng .pdf, .docx, .txt, .xlsx".
  - *E2 - Tệp vượt quá dung lượng:* Hệ thống trả về `413 Payload Too Large` kèm thông báo: "Dung lượng tệp vượt quá giới hạn 50MB cho phép".
  - *E3 - Tệp trùng lặp SHA-256:* Hệ thống trả về `409 Conflict` kèm thông báo: "Tài liệu này đã tồn tại trên hệ thống (Trùng mã SHA-256 checksum)".

---

### FR54: Phê duyệt Tài liệu Nội bộ & Kích hoạt Ingestion (Document Approval Oversight & Ingestion Trigger)
- **Mã Yêu cầu:** `FR54` (Ánh xạ: US61 / PB68 / WBS-13 / Source: `document_approval_router.py`)
- **Tên Chức năng:** Chuyên viên tri thức phê duyệt/từ chối tài liệu và kích hoạt bóc tách tri thức.
- **Tác tử (Actor):** Knowledge Administrator (`knowledge_manager`).
- **Mô tả chi tiết:** Cung cấp giao diện quản trị hàng đợi duyệt tài liệu số cho Knowledge Admin. Chuyên viên có quyền xem trước tài liệu (Preview), xem metadata, kiểm tra tính hợp lệ và thực hiện hành động: **Phê duyệt (Approve)** hoặc **Từ chối (Reject)** kèm lý do giải trình bắt buộc. Khi bấm Phê duyệt, hệ thống cập nhật trạng thái thành `APPROVED` trong PostgreSQL, đồng thời tự động kích hoạt tiến trình chạy ngầm (Celery Background Task) đẩy tài liệu vào pipeline ETL (Document Chunking ➔ Embedding ➔ Qdrant Vector Upsert ➔ Neo4j Graph Extraction). Khi bấm Từ chối, trạng thái chuyển thành `REJECTED` và không được nạp vào tri thức.
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng có vai trò `knowledge_manager`; có tài liệu ở trạng thái `PENDING_APPROVAL`.
- **Điều kiện kết thúc (Post-conditions):** Tài liệu chuyển sang `APPROVED` (và kích hoạt pipeline xử lý) hoặc `REJECTED`. Bản ghi phê duyệt được lưu vào bảng `document_approvals`.
- **Dữ liệu Đầu vào (Inputs):** `document_id`, Hành động (`APPROVE` / `REJECT`), Lý do/Ghi chú (`rejection_reason`).
- **Dữ liệu Đầu ra (Outputs):** Trạng thái mới (`APPROVED` / `REJECTED`), `approved_by`, `approved_at`, `task_id` bóc tách tri thức.
- **Luồng xử lý chính (Main Flow):**
  1. Knowledge Admin truy cập màn hình *Document Approval Queue*.
  2. Hệ thống truy vấn danh sách tài liệu `PENDING_APPROVAL` từ API `GET /api/v1/documents/pending-approvals`.
  3. Admin chọn một tài liệu, xem nội dung tệp preview và thông tin phòng ban nộp.
  4. Admin nhấn nút *Approve* (hoặc *Reject* kèm nhập lý do).
  5. Frontend gửi yêu cầu tới API `POST /api/v1/documents/{id}/approve` (hoặc `/reject`).
  6. Backend cập nhật trạng thái trong bảng `documents`, ghi bản ghi phê duyệt vào bảng `document_approvals`.
  7. Nếu là Approve, Backend đẩy sự kiện vào hàng đợi xử lý trích xuất thực thể đồ thị (`knowledge_ingestion_pipeline`).
  8. Hệ thống ghi nhật ký kiểm toán `audit_logs` và trả về kết quả thành công.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Không có quyền hạn:* Người dùng không phải `knowledge_manager` sẽ nhận mã lỗi `403 Forbidden`.
  - *E2 - Tài liệu đã được xử lý trước đó:* Hệ thống trả về `400 Bad Request` nếu tài liệu không còn ở trạng thái `PENDING_APPROVAL`.
  - *E3 - Từ chối nhưng thiếu lý do:* Frontend chặn gửi và báo lỗi: "Vui lòng nhập lý do từ chối tài liệu".

---

### FR55: Lập và Nộp Biên bản Bàn giao Ca trực (Shift Handover Report Submission)
- **Mã Yêu cầu:** `FR55` (Ánh xạ: US62 / PB69 / WBS-14 / Source: `shift_reports.py`)
- **Tên Chức năng:** Nhân viên lập biên bản bàn giao ca trực làm việc.
- **Tác tử (Actor):** Standard User (`user`), Department Manager (`manager`).
- **Mô tả chi tiết:** Hệ thống cho phép nhân viên vận hành/kinh doanh lập biên bản giao ca trực bao gồm: Tên ca trực (Sáng/Chiều/Tối), Giờ bắt đầu - Giờ kết thúc, Tóm tắt công việc hoàn thành, Các vấn đề tồn đọng/sự cố phát sinh (Pending Issues/Incidents), Danh sách nhiệm vụ bàn giao cho ca tiếp theo (Handover Tasks), và Đề xuất hỗ trợ. Biên bản có 2 trạng thái: `DRAFT` (Lưu nháp cá nhân, có thể sửa đổi) và `SUBMITTED` (Đã nộp lên cấp quản lý phòng ban, khóa chỉnh sửa).
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng đã đăng nhập hệ thống.
- **Điều kiện kết thúc (Post-conditions):** Biên bản được lưu vào cơ sở dữ liệu bảng `shift_reports`. Khi nộp (`SUBMITTED`), chuyển vào hàng đợi duyệt của Trưởng phòng bộ phận.
- **Dữ liệu Đầu vào (Inputs):** `shift_name`, `date`, `department_id`, `completed_tasks`, `issues_encountered`, `handover_notes`, `status` (`DRAFT` / `SUBMITTED`).
- **Dữ liệu Đầu ra (Outputs):** `report_id`, mã biên bản, trạng thái `DRAFT` hoặc `SUBMITTED`, dấu thời gian.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng chọn chức năng *Create Shift Handover Report*.
  2. Hệ thống tải biểu mẫu chuẩn theo phòng ban của người dùng.
  3. Người dùng nhập thông tin chi tiết ca trực.
  4. Người dùng bấm *Save Draft* (để lưu nháp) hoặc *Submit Report* (để nộp chính thức).
  5. Hệ thống gọi API `POST /api/v1/shifts/reports` (hoặc `PUT` nếu cập nhật bản nháp).
  6. Backend kiểm tra tính hợp lệ dữ liệu, lưu vào bảng `shift_reports`.
  7. Nếu nộp `SUBMITTED`, hệ thống gửi thông báo nội bộ tới Trưởng phòng ban.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Để trống trường bắt buộc:* Hệ thống thông báo lỗi: "Vui lòng điền đầy đủ Tóm tắt công việc và Nội dung bàn giao ca".
  - *E2 - Cố tình chỉnh sửa báo cáo đã nộp:* Hệ thống trả về `403 Forbidden`: "Biên bản ca trực đã nộp không thể chỉnh sửa, chỉ Trưởng phòng mới có quyền xem xét".

---

### FR56: Phê duyệt Biên bản Giao ca Bộ phận (Departmental Shift Report Review & Sign-off)
- **Mã Yêu cầu:** `FR56` (Ánh xạ: US63 / PB70 / WBS-14 / Source: `shift_reports.py`)
- **Tên Chức năng:** Trưởng phòng xem xét, đánh giá và ký duyệt biên bản giao ca.
- **Tác tử (Actor):** Department Manager (`manager`).
- **Mô tả chi tiết:** Trưởng phòng bộ phận truy cập danh sách biên bản giao ca của nhân viên trực thuộc phòng mình ở trạng thái `SUBMITTED`. Trưởng phòng đọc nội dung, nhập nhận xét chỉ đạo (Manager Remarks/Action Items) và chuyển trạng thái biên bản thành `APPROVED` (Ký duyệt) hoặc `REJECTED` (Yêu cầu làm lại kèm phản hồi).
- **Điều kiện tiên quyết (Pre-conditions):** Đăng nhập với vai trò `manager`; biên bản ở trạng thái `SUBMITTED` thuộc phòng ban quản lý.
- **Điều kiện kết thúc (Post-conditions):** Bản ghi được cập nhật trạng thái `APPROVED` hoặc `REJECTED`, lưu kèm `signed_by_manager_id`, `review_notes` và `approved_at`.
- **Dữ liệu Đầu vào (Inputs):** `report_id`, `action` (`APPROVE` / `REJECT`), `manager_notes`.
- **Dữ liệu Đầu ra (Outputs):** Trạng thái mới, thông tin ký duyệt.
- **Luồng xử lý chính (Main Flow):**
  1. Manager mở màn hình *Department Shift Approval*.
  2. Hệ thống gọi `GET /api/v1/shifts/pending-reviews?department_id={id}` lấy danh sách.
  3. Manager mở chi tiết biên bản, rà soát các vấn đề tồn đọng và bàn giao.
  4. Manager nhập chỉ đạo điều hành và bấm *Approve & Sign-off* (hoặc *Request Revisions*).
  5. Backend cập nhật bản ghi bảng `shift_reports`, lưu log vào `audit_logs`.
  6. Thông báo trạng thái được gửi phản hồi cho nhân viên nộp báo cáo.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Vi phạm phạm vi phòng ban:* Manager cố tình duyệt báo cáo của phòng ban khác sẽ bị chặn với mã lỗi `403 Forbidden` (Đảm bảo quy tắc phân lập phòng ban BR-05).
  - *E2 - Báo cáo chưa được nộp (DRAFT):* Trả về lỗi `400 Bad Request`.

---

### FR57: Tự động Tổng hợp Báo cáo Ca trực Hàng ngày bằng AI (AI Daily Shift Consolidation)
- **Mã Yêu cầu:** `FR57` (Ánh xạ: US64 / PB71 / WBS-14 / Source: `shift_reports.py`)
- **Tên Chức năng:** Tổng hợp tự động các biên bản giao ca ngày bằng LLM cục bộ.
- **Tác tử (Actor):** Department Manager (`manager`), Executive (`executive`), System Scheduler (Cron Task).
- **Mô tả chi tiết:** Vào cuối ngày (hoặc theo yêu cầu tức thời của Quản lý/Lãnh đạo), hệ thống gom toàn bộ các biên bản giao ca đã duyệt (`APPROVED`) trong ngày của một hoặc toàn bộ phòng ban. Dữ liệu văn bản được đưa vào mô hình AI cục bộ (Ollama - Qwen2.5/Llama-3) để tổng hợp thành một Báo cáo Tổng quan Ngày (Daily Shift Summary) gồm: (1) Tổng số sự cố phát sinh, (2) Các công việc chính đã giải quyết, (3) Rủi ro tắc nghẽn liên phòng ban, (4) Khuyến nghị hành động cho ngày làm việc tiếp theo. Nếu dịch vụ Ollama gặp sự cố/quá tải, hệ thống tự động kích hoạt **Deterministic Rule-Based Fallback** để tổng hợp thống kê cơ học theo mẫu cố định mà không làm gián đoạn hệ thống.
- **Điều kiện tiên quyết (Pre-conditions):** Có ít nhất 01 biên bản giao ca ở trạng thái `APPROVED` trong ngày cần tổng hợp.
- **Điều kiện kết thúc (Post-conditions):** Bản ghi tổng hợp được lưu vào bảng `shift_daily_summaries` và hiển thị trên giao diện điều hành.
- **Dữ liệu Đầu vào (Inputs):** Ngày tổng hợp (`target_date`), `department_id` (nếu tổng hợp theo phòng ban), hoặc cờ tổng hợp toàn doanh nghiệp.
- **Dữ liệu Đầu ra (Outputs):** Bản tóm tắt tổng hợp Markdown, danh sách rủi ro phát hiện, số liệu thống kê ca trực, cờ `is_fallback_generated`.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng kích hoạt nút *Generate Daily Shift Summary* (hoặc Job định kỳ 23:00 hàng ngày).
  2. Backend truy vấn các biên bản ca trực `APPROVED` của ngày chỉ định từ bảng `shift_reports`.
  3. Backend định dạng prompt ChatML chuẩn, gửi tới dịch vụ Ollama API cục bộ.
  4. Ollama xử lý và sinh ra văn bản tổng hợp đa mục tiêu.
  5. Backend phân tích kết quả, lưu trữ vào bảng `shift_daily_summaries`.
  6. Kết quả hiển thị trực quan trên giao diện và sẵn sàng cho Lãnh đạo tra cứu.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Không có biên bản nào được duyệt:* Hệ thống thông báo: "Không có biên bản giao ca nào ở trạng thái APPROVED trong ngày chỉ định để thực hiện tổng hợp".
  - *E2 - Lỗi dịch vụ Ollama (Timeout/Connection Refused):* Hệ thống bắt ngoại lệ, tự động chuyển sang chế độ Rule-Based Fallback: gộp văn bản thô theo cấu trúc bảng cố định, bật cờ `is_fallback_generated = True` và ghi cảnh báo hệ thống vào `audit_logs`.

---

### FR58: Quản trị Ma trận Phân quyền Động (Granular RBAC Matrix Management)
- **Mã Yêu cầu:** `FR58` (Ánh xạ: US65 / PB72 / WBS-07 / Source: `rbac_matrix_router.py`)
- **Tên Chức năng:** Cấu hình ma trận phân quyền 2 chiều động theo Role và Permission.
- **Tác tử (Actor):** System & IT Administrator (`it_admin`).
- **Mô tả chi tiết:** Cung cấp giao diện bảng 2D trực quan trên Web cho IT Admin để quản trị phân quyền chức năng và tài nguyên. Hàng dọc thể hiện danh sách tài nguyên/chức năng hệ thống (`documents`, `shift_reports`, `graph_editor`, `risk_center`, `users`, `audit_logs`), hàng ngang thể hiện các vai trò (`it_admin`, `knowledge_manager`, `executive`, `manager`, `user`). Admin có thể bật/tắt (Toggle Checkbox) các quyền: `READ`, `WRITE`, `DELETE`, `APPROVE`, `EXECUTE` cho từng vai trò. Khi lưu ma trận, hệ thống cập nhật bảng `rbac_permissions_matrix` và tự động làm mới Cache phân quyền (Redis/In-Memory Cache) mà không yêu cầu khởi động lại máy chủ backend.
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng đăng nhập với vai trò `it_admin`.
- **Điều kiện kết thúc (Post-conditions):** Ma trận quyền hạn được lưu vào CSDL, hiệu lực tức thì cho các phiên làm việc tiếp theo.
- **Dữ liệu Đầu vào (Inputs):** Mảng cấu hình phân quyền JSON: `[{role_id, resource_id, permissions: ['READ', 'WRITE']}]`.
- **Dữ liệu Đầu ra (Outputs):** Trạng thái cập nhật thành công, thời điểm làm mới cache.
- **Luồng xử lý chính (Main Flow):**
  1. IT Admin truy cập menu *System Settings ➔ RBAC Matrix Management*.
  2. Hệ thống gọi `GET /api/v1/rbac/matrix` và kết xuất bảng lưới 2 chiều các checkbox.
  3. IT Admin thay đổi các quyền truy cập mong muốn.
  4. IT Admin bấm *Save Changes*.
  5. Hệ thống gọi `POST /api/v1/rbac/matrix` gửi dữ liệu thay đổi.
  6. Backend kiểm tra không được tước quyền quản trị cốt lõi của chính vai trò `it_admin` (Self-Lockout Prevention).
  7. Backend lưu dữ liệu vào bảng `rbac_permissions_matrix`, xóa cache cũ và nạp cache mới.
  8. Hệ thống ghi nhận sự kiện bảo mật vào `audit_logs`.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Cố tình khóa quyền IT Admin (Self-Lockout):* Hệ thống chặn hành động và trả về `400 Bad Request`: "Không thể tước quyền quản trị hệ thống cốt lõi của vai trò IT Administrator".
  - *E2 - Người dùng không phải IT Admin:* Hệ thống trả về `403 Forbidden`.

---

### FR59: Chế tài Phiên Đăng nhập Duy nhất (Single Active Session Enforcement)
- **Mã Yêu cầu:** `FR59` (Ánh xạ: US66 / PB73 / WBS-07 / Source: `session_service.py`)
- **Tên Chức năng:** Ép buộc một phiên đăng nhập duy nhất cho mỗi tài khoản người dùng.
- **Tác tử (Actor):** Tất cả người dùng (All Actors), Hệ thống xác thực (Auth Service).
- **Mô tả chi tiết:** Để ngăn chặn chia sẻ tài khoản doanh nghiệp và xâm nhập trái phép, hệ thống duy trì cơ chế một phiên làm việc hợp lệ duy nhất trên một tài khoản tại một thời điểm. Mỗi khi đăng nhập thành công, hệ thống sinh một mã JWT chứa mã định danh token ngẫu nhiên duy nhất `jti` (JWT ID), đồng thời lưu trữ `jti` này vào bảng `user_active_sessions` (và Redis key `active_session:{user_id}`). Nếu người dùng đăng nhập từ thiết bị/trình duyệt khác, hệ thống sẽ thu hồi (Revoke/Blacklist) mã `jti` của phiên đăng nhập trước đó. Thiết bị cũ khi gửi request tiếp theo sẽ bị từ chối với ngoại lệ `ConcurrentLoginException` (HTTP 401) và tự động chuyển hướng về màn hình đăng nhập kèm thông báo: "Phiên làm việc của bạn đã hết hạn do tài khoản được đăng nhập từ một thiết bị hoặc vị trí khác".
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng thực hiện đăng nhập vào hệ thống.
- **Điều kiện kết thúc (Post-conditions):** Phiên mới được thiết lập hợp lệ, phiên cũ bị vô hiệu hóa hoàn toàn.
- **Dữ liệu Đầu vào (Inputs):** `user_id`, địa chỉ IP người dùng, `user_agent` trình duyệt.
- **Dữ liệu Đầu ra (Outputs):** `access_token` chứa `jti` hợp lệ mới, thông báo thu hồi phiên cũ.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng gửi thông tin xác thực tại màn hình đăng nhập.
  2. Auth Service xác thực thông tin tài khoản thành công.
  3. Hệ thống kiểm tra trong bảng `user_active_sessions`. Nếu đã tồn tại phiên đang hoạt động của `user_id`, hệ thống đánh dấu trạng thái phiên cũ là `REVOKED` và đưa `jti` cũ vào danh sách đen (Blacklist).
  4. Hệ thống tạo mã `jti` mới, sinh cặp Access Token & Refresh Token mới.
  5. Hệ thống lưu phiên mới vào bảng `user_active_sessions` kèm IP và User-Agent.
  6. Tại thiết bị cũ, khi gửi bất kỳ API request nào qua Middleware xác thực, hệ thống phát hiện `jti` đã bị thu hồi, trả về HTTP `401 Unauthorized` kèm mã lỗi `CONCURRENT_LOGIN_DETECTED`.
  7. Frontend tại thiết bị cũ xóa token trong LocalStorage/Cookies và hiển thị thông báo chuyển hướng.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Token bị giả mạo hoặc không có jti:* Trả về `401 Unauthorized` kèm lý do "Mã token không hợp lệ".

---

### FR60: Tự phục vụ Khôi phục Mật khẩu qua Email OTP (Self-Service Password Recovery via Email OTP)
- **Mã Yêu cầu:** `FR60` (Ánh xạ: US67 / PB74 / WBS-07 / Source: `auth_router.py`)
- **Tên Chức năng:** Khôi phục mật khẩu thông qua mã xác thực một lần gửi về Email.
- **Tác tử (Actor):** Tất cả người dùng (All Actors).
- **Mô tả chi tiết:** Cho phép người dùng tự lấy lại mật khẩu khi bị quên mà không cần liên hệ quản trị viên thủ công. Quy trình gồm 3 bước chuẩn bảo mật: (1) Nhập địa chỉ email đăng ký; hệ thống kiểm tra và sinh mã OTP gồm 6 chữ số ngẫu nhiên có hiệu lực trong vòng 5 phút (300 giây) được băm bảo mật trong cơ sở dữ liệu/Redis và gửi qua giao thức SMTP an toàn; (2) Người dùng nhập mã OTP 6 số để xác minh danh tính; nếu đúng, hệ thống trả về một mã `reset_token` tạm thời có thời hạn 10 phút; (3) Người dùng nhập mật khẩu mới và xác nhận mật khẩu mới. Mật khẩu mới được băm bằng thuật toán bcrypt (Salt rounds >= 12) và ghi đè vào bảng `users`. Đồng thời toàn bộ các phiên đăng nhập cũ bị hủy bỏ ngay lập tức.
- **Điều kiện tiên quyết (Pre-conditions):** Tài khoản người dùng tồn tại trên hệ thống và có địa chỉ email hợp lệ.
- **Điều kiện kết thúc (Post-conditions):** Mật khẩu người dùng được cập nhật mới, gửi email thông báo bảo mật thành công, chuyển hướng về trang đăng nhập.
- **Dữ liệu Đầu vào (Inputs):** `email`, mã `otp` (6 chữ số), `new_password`, `confirm_password`.
- **Dữ liệu Đầu ra (Outputs):** Thông báo gửi OTP thành công, `reset_token`, thông báo đổi mật khẩu hoàn tất.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng bấm liên kết "Quên mật khẩu?" tại trang Đăng nhập.
  2. Người dùng nhập email và bấm *Send Code*.
  3. Backend kiểm tra email trong bảng `users`. Nếu tồn tại, sinh chuỗi OTP 6 chữ số, lưu vào Redis kèm TTL = 300 giây và gửi qua SMTP Email Service.
  4. Người dùng nhận email, nhập mã 6 số vào giao diện xác thực bước 2.
  5. Backend kiểm tra OTP. Nếu khớp và chưa hết hạn, sinh `reset_token` có hiệu lực 600 giây.
  6. Người dùng nhập mật khẩu mới (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).
  7. Backend kiểm tra chính sách mật khẩu, băm mật khẩu bằng `bcrypt`, cập nhật bảng `users`.
  8. Hệ thống thu hồi toàn bộ phiên đăng nhập hiện có của người dùng và gửi email thông báo cảnh báo bảo mật.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Email không tồn tại:* Để chống tấn công dò quét tài khoản (User Enumeration Attack), hệ thống luôn trả về thông báo chung: "Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục sẽ được gửi trong giây lát".
  - *E2 - Mã OTP sai quá 5 lần:* Hệ thống vô hiệu hóa mã OTP hiện tại, yêu cầu người dùng chờ 15 phút trước khi yêu cầu mã mới (Brute-force protection).
  - *E3 - Mã OTP hết hạn (> 5 phút):* Hệ thống trả về `400 Bad Request`: "Mã xác thực đã hết hạn, vui lòng yêu cầu mã mới".
  - *E4 - Mật khẩu mới không đạt chuẩn bảo mật:* Hệ thống từ chối và báo lỗi: "Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt".

---

### FR61: Chốt chặn An toàn Cypher (Read-Only Cypher Guard & Mutation Interceptor)
- **Mã Yêu cầu:** `FR61` (Ánh xạ: US68 / PB75 / WBS-15 / Source: `text_to_cypher.py`)
- **Tên Chức năng:** Kiểm soát cú pháp AST chặn đứng mọi truy vấn làm biến đổi dữ liệu đồ thị Neo4j.
- **Tác tử (Actor):** Hybrid AI Copilot Engine, Kiến trúc An ninh Hệ thống (System Security Layer).
- **Mô tả chi tiết:** Trong phân hệ Text-to-Cypher của AI Copilot, để loại trừ hoàn toàn nguy cơ Prompt Injection hoặc lỗi sinh mã từ LLM gây phá hủy cơ sở dữ liệu đồ thị tri thức Neo4j, hệ thống tích hợp một lớp chốt chặn an toàn Cypher Guard đứng trước driver Neo4j. Bộ phân tích cú pháp AST (Abstract Syntax Tree) và Regex Guard quét toàn bộ câu truy vấn Cypher trước khi thực thi. Nếu phát hiện bất kỳ từ khóa biến đổi/ghi dữ liệu nào bao gồm: `CREATE`, `MERGE`, `DELETE`, `DETACH`, `SET`, `REMOVE`, `DROP`, `CALL dbms.`, hệ thống lập tức chặn đứng câu truy vấn, không gửi đến cơ sở dữ liệu, ghi log cảnh báo an ninh nghiêm trọng vào `audit_logs` và trả về thông báo an toàn cho giao diện người dùng.
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng đặt câu hỏi trên AI Copilot kích hoạt luồng Text-to-Cypher truy vấn đồ thị Neo4j.
- **Điều kiện kết thúc (Post-conditions):** Truy vấn chỉ đọc (`MATCH ... RETURN`) được phép thực thi; mọi truy vấn đột biến dữ liệu bị chặn đứng 100%.
- **Dữ liệu Đầu vào (Inputs):** Chuỗi truy vấn Cypher do LLM sinh ra (`generated_cypher_query`).
- **Dữ liệu Đầu ra (Outputs):** Cờ hợp lệ (`is_safe: boolean`), thông báo lỗi nếu bị chặn, kết quả dữ liệu đồ thị nếu an toàn.
- **Luồng xử lý chính (Main Flow):**
  1. Người dùng gửi câu hỏi phân tích dữ liệu trên AI Copilot.
  2. Phân hệ Text-to-Cypher sử dụng LLM để sinh câu lệnh Cypher tương ứng.
  3. Trước khi gọi hàm `session.run()`, chuỗi truy vấn được chuyển qua hàm kiểm tra an ninh `validate_read_only_cypher()`.
  4. Hệ thống chuẩn hóa chữ thường và phân tích token cú pháp theo danh sách từ khóa cấm: `FORBIDDEN_KEYWORDS = ['create', 'merge', 'delete', 'detach', 'set', 'remove', 'drop', 'call']`.
  5. Nếu không chứa từ khóa cấm và cú pháp bắt đầu bằng `MATCH` hợp lệ, câu lệnh được chuyển tiếp tới Neo4j để lấy dữ liệu.
  6. Kết quả đồ thị được trả về cho AI Copilot tổng hợp câu trả lời kèm trích dẫn thực thể.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Phát hiện từ khóa ghi dữ liệu:* Hệ thống ném ngoại lệ `UnsafeCypherQueryException`, hủy thực thi truy vấn tới CSDL, ghi nhật ký sự kiện vào `audit_logs` với mức độ `CRITICAL`, và trả về giao diện thông báo: "Truy vấn tự động bị từ chối do vi phạm quy tắc an toàn dữ liệu chỉ đọc (Cypher Guard Read-Only Policy)".

---

### FR62: Điều khiển Trạm làm việc AEGIS & Ngắt khẩn cấp (Workstation Remote Control & Emergency Kill Switch)
- **Mã Yêu cầu:** `FR62` (Ánh xạ: US69 / PB76 / WBS-10 / Source: `pb56_workstations.py`)
- **Tên Chức năng:** Giám sát trạm máy Windows và kích hoạt công tắc ngắt khẩn cấp tiến trình AEGIS.
- **Tác tử (Actor):** System & IT Administrator (`it_admin`).
- **Mô tả chi tiết:** Phân hệ giám sát trạm máy cho phép IT Admin quản lý danh sách các trạm làm việc cài đặt AEGIS Local Agent (tên máy tính, hệ điều hành, địa chỉ IP, trạng thái Heartbeat kết nối, đường dẫn thư mục theo dõi File Watcher). Trong trường hợp phát hiện máy trạm bị nhiễm mã độc, rò rỉ dữ liệu, hoặc nghi vấn chiếm quyền điều khiển, IT Admin có thể nhấn nút **Emergency Kill Switch** trực tiếp trên Web Dashboard. Lệnh ngắt khẩn cấp được đẩy qua kênh kết nối bảo mật hai chiều (Secure WebSocket/Command Channel) tới trạm máy mục tiêu. Tiến trình AEGIS Agent trên máy trạm bị buộc dừng hoạt động (Terminate Process) trong thời gian tối đa **không quá 3 giây (<= 3s)**, cô lập hoàn toàn tiến trình đọc tệp và ngăn chặn dữ liệu đẩy lên máy chủ GraphMind.
- **Điều kiện tiên quyết (Pre-conditions):** IT Admin đã đăng nhập; máy trạm đang cài đặt và chạy tiến trình AEGIS Agent kết nối tới máy chủ.
- **Điều kiện kết thúc (Post-conditions):** Tiến trình AEGIS trên trạm máy bị chấm dứt hoạt động; trạng thái trên Dashboard chuyển sang `TERMINATED / CONTAINED`; sự kiện được ghi vào `audit_logs`.
- **Dữ liệu Đầu vào (Inputs):** `workstation_id`, Lý do kích hoạt ngắt khẩn cấp (`kill_reason`), Xác thực mật khẩu quản trị viên.
- **Dữ liệu Đầu ra (Outputs):** Trạng thái ngắt tiến trình (`SUCCESS`), thời gian phản hồi thực tế (ms), bản ghi nhật ký can thiệp an ninh.
- **Luồng xử lý chính (Main Flow):**
  1. IT Admin truy cập màn hình *Workstation Management & AEGIS Fleet Control*.
  2. Bảng điều khiển hiển thị trạng thái Heartbeat thời gian thực của các trạm máy.
  3. Khi phát hiện bất thường, IT Admin chọn máy trạm và nhấn nút *Trigger Emergency Kill Switch*.
  4. Hệ thống hiển thị hộp thoại cảnh báo rủi ro cao, yêu cầu nhập mật khẩu xác nhận.
  5. IT Admin xác nhận, Backend gửi tín hiệu ngắt khẩn cấp qua kênh WebSocket `wss://.../agent/control` với payload `{"action": "EMERGENCY_KILL"}`.
  6. AEGIS Agent trên Windows nhận gói tin, lập tức đóng tất cả File Watcher handles, hủy các thread xử lý ngầm và gọi hàm thoát tiến trình `os._exit(0)` hoặc lệnh chấm dứt tiến trình hệ thống trong thời gian <= 3 giây.
  7. Máy chủ nhận tín hiệu xác nhận ngắt hoặc quá hạn Heartbeat 3s, tự động cập nhật trạng thái máy trạm thành `ISOLATED / KILLED`.
  8. Hệ thống ghi nhật ký kiểm toán với mức ưu tiên `ALERT_HIGH`.
- **Luồng ngoại lệ (Exception Flows):**
  - *E1 - Máy trạm mất kết nối mạng trước khi nhận lệnh:* Nếu sau 3 giây không nhận được phản hồi, hệ thống chuyển trạng thái máy trạm thành `UNREACHABLE_PENDING_KILL`. Khi máy trạm kết nối lại mạng trong tương lai, gói tin đầu tiên nhận được sẽ lập tức thực thi lệnh ngắt cục bộ.
  - *E2 - Sai mật khẩu xác nhận:* Hệ thống từ chối kích hoạt và cảnh báo: "Mật khẩu xác nhận không chính xác, hành động ngắt khẩn cấp bị hủy bỏ".

---

## 6. DANH MỤC HIỆU CHỈNH CHI TIẾT 52 FUNCTIONAL REQUIREMENTS HIỆN CÓ (FR01 ➔ FR52)

Dưới đây là các yêu cầu chức năng hiện có trong SRS Ver 1.1 cần được hiệu chỉnh trực tiếp trong file Word để loại bỏ các điểm mâu thuẫn kỹ thuật với Proposal Ver 1.2, User Story Ver 1.2 và Mã nguồn thực tế:

---

### 6.1. Nhóm An ninh, Tài khoản & Phân quyền (FR01, FR02, FR03, FR04)
- **FR01 (System Login):**
  - *Hiện tại:* Chỉ mô tả đăng nhập cơ bản bằng username/password và sinh JWT token thông thường.
  - *Hiệu chỉnh chuẩn hóa:* Bổ sung cơ chế **Single Active Session** (sử dụng mã token identifier `jti` lưu trong Redis/Database; khi đăng nhập ở thiết bị mới thì phiên cũ bị thu hồi tự động theo FR59) và liên kết với luồng **Khôi phục mật khẩu qua Email OTP** (FR60).
- **FR02 (Manage accounts, departments & user identities):**
  - *Hiện tại:* Gán quyền quản trị cho `System & Knowledge Administrator (Admin)`.
  - *Hiệu chỉnh chuẩn hóa:* Đổi Actor duy nhất sang **System & IT Administrator (`it_admin`)**. Chuyên viên tri thức (`knowledge_manager`) không có quyền tạo/xóa tài khoản hay thay đổi phòng ban của nhân sự.
- **FR03 (Granular Access Authorization - RBAC):**
  - *Hiện tại:* Mô tả bảng phân quyền tĩnh, cấu hình cứng trong mã nguồn.
  - *Hiệu chỉnh chuẩn hóa:* Nâng cấp thành **Ma trận phân quyền 2 chiều động (Dynamic 2D RBAC Grid)** cho phép IT Admin bật/tắt quyền trực tiếp trên Web UI và cập nhật Cache tức thời (đồng bộ với FR58).
- **FR04 (Audit Log View & Data Protection):**
  - *Hiện tại:* Ghi nhận log chung chung.
  - *Hiệu chỉnh chuẩn hóa:* Quy định rõ Actor được phép xem log chỉ bao gồm **System & IT Administrator** (toàn bộ nhật ký an ninh, phiên đăng nhập, thay đổi quyền) và **Executive** (xem lịch sử hoạt động tổng thể để giám sát tuân thủ). Nghiêm cấm mọi hành vi chỉnh sửa hoặc xóa nhật ký kiểm toán (Tamper-Proof Audit Logs).

---

### 6.2. Nhóm Giám sát Trạm máy & Thu thập Tệp (FR07, FR10, FR11)
- **FR07 (Workstation Monitoring & AEGIS Local Agent):**
  - *Hiện tại:* Chỉ mô tả cài đặt agent và quét tệp định kỳ.
  - *Hiệu chỉnh chuẩn hóa:* Bổ sung cơ chế truyền tín hiệu **Heartbeat 30 giây một lần** để báo cáo trạng thái Online/Offline, và tích hợp bộ nhận lệnh từ xa hỗ trợ tính năng **Emergency Kill Switch** ngắt tiến trình trong thời gian <= 3 giây khi nhận lệnh từ IT Admin (đồng bộ với FR62).

---

### 6.3. Nhóm Quản trị Tri thức & Đồ thị Neo4j (FR13, FR14, FR15, FR16)
- **FR13 (Human-Involved Knowledge Editing):**
  - *Hiện tại:* Gán cho vai trò Admin nói chung.
  - *Hiệu chỉnh chuẩn hóa:* Đổi Actor thực hiện thành **Knowledge Administrator (`knowledge_manager`)**. Chuyên viên tri thức có quyền bổ sung node/edge, chỉnh sửa nhãn thực thể, duyệt hoặc loại bỏ các liên kết do AI tự động trích xuất.
- **FR14 (SOP Drafting & Internal Knowledge Wiki):**
  - *Hiện tại:* Chưa phân định rõ quy trình phê duyệt quy trình vận hành.
  - *Hiệu chỉnh chuẩn hóa:* Bất kỳ nhân viên nào cũng có thể đóng góp bản thảo quy trình, nhưng chỉ **Knowledge Administrator** mới có thẩm quyền phê duyệt và chuyển đổi nội dung thành các node tri thức chính thức trên đồ thị Neo4j.

---

### 6.4. Nhóm AI Copilot & An toàn Truy vấn Đồ thị (FR18, FR20, FR21, FR22)
- **FR18 (Q&A with Hybrid AI Copilot - Hybrid GraphRAG):**
  - *Hiện tại:* Chưa đặc tả cơ chế kiểm soát an toàn truy vấn đồ thị.
  - *Hiệu chỉnh chuẩn hóa:* Bổ sung lớp trung gian bắt buộc **Cypher Guard (FR61)** kiểm tra cú pháp AST trước khi thực thi câu truy vấn Cypher; chỉ cho phép các câu lệnh đọc dữ liệu (`MATCH ... RETURN`), chặn đứng 100% các câu lệnh biến đổi cấu trúc đồ thị.
- **FR20 (Intelligent Risk Alert Tracking):**
  - *Hiện tại:* Chỉ liệt kê rủi ro tồn kho và tiến độ chung chung.
  - *Hiệu chỉnh chuẩn hóa:* Bổ sung 2 quy tắc phát hiện cảnh báo rủi ro tài chính đặc thù của doanh nghiệp SME:
    1. **Negative Margin Orders:** Đơn hàng có giá bán thấp hơn giá vốn định mức (lỗ gộp).
    2. **Abnormal Discount Alert:** Các đơn hàng áp dụng mức chiết khấu bất thường **>= 35%** mà không có phê duyệt đặc cách từ cấp Giám đốc.
- **FR21 (Automatic Executive Summary Report Generation):**
  - *Hiện tại:* Mục mô tả và FR44 yêu cầu: "Hệ thống hỗ trợ xuất báo cáo dưới dạng tệp PDF/Word tải về".
  - *Hiệu chỉnh chuẩn hóa:* **LOẠI BỎ TÍNH NĂNG XUẤT TỆP PDF/WORD.** Căn cứ theo **Proposal Ver 1.2 Mục 4.2 (Phạm vi dự án - Out-of-Scope)**, tính năng kết xuất văn bản PDF/Word tải về đã được chuyển thành Ngoài phạm vi cam kết của đề tài Capstone. Thay vào đó, hệ thống tập trung hoàn thiện việc hiển thị báo cáo điều hành trực quan (Interactive Visual Reports), biểu đồ động và tóm tắt Markdown trực tiếp trên nền tảng Web UI.

---

### 6.5. Nhóm Thông số Kỹ thuật & Nghiên cứu Đánh giá (FR28, FR34, FR37, FR47)
- **FR28 / FR37 (Fine-Tuning Dataset Size):**
  - *SRS Ver 1.1 hiện tại (Dòng 130):* Ghi tập dữ liệu fine-tuning gồm "2,000–3,000 Q&A pairs".
  - *Hiệu chỉnh chuẩn hóa (Ver 1.2):* **SỬA THÀNH 509 ChatML pairs.** Bộ dữ liệu huấn luyện tinh chỉnh mô hình cục bộ (LoRA/PEFT) đã được xây dựng, làm sạch và chuẩn hóa chính xác gồm **509 cặp câu hỏi - câu trả lời định dạng ChatML**, phản ánh ngữ cảnh nghiệp vụ doanh nghiệp SME (Bán hàng, Kho vận, Vận hành, Kế toán).
- **FR34 (Frontend Technology Stack):**
  - *SRS Ver 1.1 hiện tại (Dòng 126):* Ghi công nghệ giao diện người dùng là "React/Next.js".
  - *Hiệu chỉnh chuẩn hóa (Ver 1.2):* **SỬA THÀNH React 18 + Vite (SPA) và Tailwind CSS.** Toàn bộ mã nguồn thực tế tại thư mục `frontend/` được xây dựng dưới dạng ứng dụng đơn trang Single Page Application (Vite bundler) kết hợp Tailwind CSS và Lucide Icons, không sử dụng Next.js SSR.
- **FR47 (Benchmark Evaluation Question Set):**
  - *SRS Ver 1.1 hiện tại (Dòng 142):* Ghi bộ câu hỏi đánh giá kiểm thử gồm "100–200 questions".
  - *Hiệu chỉnh chuẩn hóa (Ver 1.2):* **SỬA THÀNH 100 Ground-Truth Questions.** Bộ câu hỏi chuẩn đánh giá năng lực của hệ sinh thái Hybrid GraphRAG và mô hình LoRA được chốt chính xác là **100 câu hỏi Ground-Truth** có đáp án đối chuẩn do chuyên gia nghiệp vụ thẩm định, đo lường theo 4 tiêu chí RAGAS (Faithfulness, Answer Relevance, Context Precision, Context Recall).

---

## 7. ĐẶC TẢ 5 USE CASES NGHIỆP VỤ MỚI (UC.23 ➔ UC.27)

Trong SRS Ver 1.1 chỉ có 22 Use Cases (UC.01 – UC.22). Nhóm tác giả cần bổ sung đầy đủ 5 bảng đặc tả Use Case chi tiết dưới đây vào **Mục 5.4: Use Case Specification** (trong tài liệu mới là Mục 6.2) để bao phủ toàn bộ 10 yêu cầu chức năng mới:

---

### UC.23 — Internal Document Upload & Approval Workflow
- **Mã Use Case:** `UC.23`
- **Tên Use Case:** Quy trình tải lên và phê duyệt tài liệu nội bộ doanh nghiệp.
- **Tác tử chính (Primary Actor):** Standard User (`user`), Department Manager (`manager`).
- **Tác tử phụ (Secondary Actor):** Knowledge Administrator (`knowledge_manager`), Ingestion Pipeline Service.
- **Mô tả ngắn gọn:** Nhân viên tải tệp tài liệu nội bộ (.pdf, .docx, .xlsx, .txt) vào hàng đợi. Hệ thống kiểm tra trùng lặp checksum SHA-256 và lưu ở trạng thái `PENDING_APPROVAL`. Chuyên viên tri thức (Knowledge Admin) xem xét nội dung, quyết định duyệt (`APPROVED`) để kích hoạt tự động pipeline bóc tách tri thức đưa vào Neo4j/Qdrant, hoặc từ chối (`REJECTED`) kèm lý do giải trình.
- **Điều kiện tiên quyết (Pre-conditions):** Người dùng đã đăng nhập hệ thống với tài khoản hợp lệ.
- **Điều kiện kết thúc (Post-conditions):** Tài liệu được lưu trữ an toàn, chuyển trạng thái `APPROVED` (và đẩy vào pipeline ETL) hoặc `REJECTED`, có log kiểm toán đầy đủ.
- **Luồng sự kiện chính (Main Flow):**
  1. Người dùng chọn chức năng *Document Upload* trên thanh điều hướng.
  2. Hệ thống hiển thị giao diện tải tệp kèm chọn phòng ban sở hữu.
  3. Người dùng chọn tệp từ máy tính, nhập mô tả vắn tắt và nhấn nút *Upload Document*.
  4. Hệ thống kiểm tra dung lượng (<= 50MB) và định dạng tệp hợp lệ.
  5. Hệ thống tính toán mã băm SHA-256 để kiểm tra chống trùng lặp.
  6. Hệ thống lưu tệp vào kho lưu trữ nội bộ và tạo bản ghi trong bảng `documents` với trạng thái `PENDING_APPROVAL`.
  7. Hệ thống thông báo tải lên thành công và gửi thông báo chờ duyệt tới Knowledge Administrator.
  8. Knowledge Admin truy cập danh sách *Document Approval Queue*, chọn tài liệu để xem trước (Preview) nội dung.
  9. Knowledge Admin nhấn nút *Approve* (Phê duyệt).
  10. Hệ thống cập nhật trạng thái tài liệu thành `APPROVED`, lưu bản ghi vào `document_approvals` kèm định danh người duyệt và thời điểm.
  11. Hệ thống tự động phát sinh Background Task kích hoạt pipeline xử lý: phân đoạn văn bản (Chunking), tạo vector nhúng (Embedding), lưu vào Qdrant và trích xuất thực thể/quan hệ nạp vào đồ thị Neo4j.
  12. Hệ thống ghi nhật ký kiểm toán vào `audit_logs` và hiển thị thông báo duyệt hoàn tất.
- **Luồng ngoại lệ (Exception Flows):**
  - **4a. Tệp không đúng định dạng cho phép:**
    1. Hệ thống phát hiện đuôi tệp không thuộc danh sách (.pdf, .docx, .xlsx, .txt).
    2. Hệ thống dừng tiến trình tải lên, hiển thị thông báo lỗi: "Định dạng tệp không được hỗ trợ".
    3. Quay lại bước 2 của luồng chính.
  - **4b. Tệp vượt quá dung lượng 50MB:**
    1. Hệ thống từ chối nhận tệp, hiển thị cảnh báo: "Dung lượng tệp vượt quá giới hạn 50MB".
    2. Quay lại bước 2 của luồng chính.
  - **5a. Trùng lặp mã băm SHA-256:**
    1. Hệ thống phát hiện mã SHA-256 đã tồn tại trên CSDL.
    2. Hệ thống hủy thao tác lưu, hiển thị cảnh báo: "Tài liệu này đã tồn tại trong hệ thống (Checksum trùng khớp)".
    3. Sử dụng lại bản ghi hiện có, không tạo bản ghi mới.
  - **9a. Knowledge Admin từ chối tài liệu (Reject):**
    1. Knowledge Admin nhấn nút *Reject*.
    2. Hệ thống hiển thị hộp thoại yêu cầu nhập lý do từ chối bắt buộc.
    3. Admin nhập lý do (ví dụ: "Tài liệu chưa có chữ ký người có thẩm quyền") và bấm *Confirm Reject*.
    4. Hệ thống cập nhật trạng thái tài liệu thành `REJECTED`, lưu lý do vào bảng `document_approvals`.
    5. Hệ thống gửi thông báo phản hồi cho nhân viên đã tải tệp.
    6. Tài liệu không được đưa vào pipeline xử lý tri thức. Kết thúc Use Case.

---

### UC.24 — Departmental Shift Handover Reporting & Sign-off
- **Mã Use Case:** `UC.24`
- **Tên Use Case:** Lập và ký duyệt biên bản bàn giao ca trực phòng ban.
- **Tác tử chính (Primary Actor):** Standard User (`user`).
- **Tác tử phụ (Secondary Actor):** Department Manager (`manager`).
- **Mô tả ngắn gọn:** Nhân viên lập biên bản ca trực cuối ngày/cuối ca ghi nhận các nhiệm vụ đã hoàn thành, sự cố phát sinh, và các hạng mục cần bàn giao cho ca sau. Biên bản có thể lưu nháp (`DRAFT`) hoặc nộp chính thức (`SUBMITTED`). Trưởng phòng bộ phận rà soát nội dung, ghi chú ý kiến chỉ đạo và ký duyệt (`APPROVED`) hoặc yêu cầu chỉnh sửa (`REJECTED`).
- **Điều kiện tiên quyết (Pre-conditions):** Nhân viên và Trưởng phòng đã đăng nhập với tài khoản thuộc cùng một phòng ban nghiệp vụ.
- **Điều kiện kết thúc (Post-conditions):** Biên bản ca trực được lưu trữ, ký duyệt điện tử và sẵn sàng cho tiến trình tổng hợp báo cáo ngày.
- **Luồng sự kiện chính (Main Flow):**
  1. Nhân viên chọn chức năng *Create Shift Handover Report*.
  2. Hệ thống hiển thị biểu mẫu ca trực tương ứng với phòng ban của nhân viên.
  3. Nhân viên nhập các thông tin: Tên ca trực, Khoảng thời gian, Nhiệm vụ hoàn thành, Sự cố phát sinh, và Nhiệm vụ bàn giao.
  4. Nhân viên nhấn nút *Submit Report*.
  5. Hệ thống kiểm tra các trường bắt buộc, lưu biên bản vào bảng `shift_reports` với trạng thái `SUBMITTED`.
  6. Hệ thống gửi thông báo tới Trưởng phòng ban trực thuộc.
  7. Trưởng phòng ban truy cập danh sách *Department Shift Reviews*, mở biên bản của nhân viên.
  8. Trưởng phòng xem xét nội dung, nhập ý kiến chỉ đạo điều hành vào ô *Manager Remarks*.
  9. Trưởng phòng nhấn nút *Sign-off & Approve*.
  10. Hệ thống cập nhật trạng thái biên bản thành `APPROVED`, lưu thời điểm và ID người ký duyệt.
  11. Hệ thống ghi nhật ký kiểm toán và gửi thông báo xác nhận tới nhân viên nộp báo cáo.
- **Luồng ngoại lệ (Exception Flows):**
  - **3a. Nhân viên muốn lưu tạm để bổ sung sau:**
    1. Tại bước 4, nhân viên nhấn nút *Save Draft*.
    2. Hệ thống lưu biên bản với trạng thái `DRAFT`.
    3. Bản nháp này chỉ hiển thị với chính nhân viên đó và có thể chỉnh sửa không giới hạn.
    4. Kết thúc Use Case tạm thời cho đến khi nhân viên nộp chính thức.
  - **5a. Thiếu thông tin bắt buộc:**
    1. Hệ thống phát hiện trường tóm tắt công việc hoặc bàn giao bị để trống.
    2. Hệ thống báo đỏ các trường vi phạm và yêu cầu nhân viên điền bổ sung.
    3. Quay lại bước 3 của luồng chính.
  - **9a. Trưởng phòng yêu cầu chỉnh sửa (Reject):**
    1. Trưởng phòng nhận thấy số liệu chưa chính xác, nhấn nút *Request Revision*.
    2. Hệ thống yêu cầu nhập lý do cần sửa.
    3. Trưởng phòng gửi lý do phản hồi; trạng thái biên bản chuyển thành `REJECTED`.
    4. Biên bản được mở khóa để nhân viên chỉnh sửa và nộp lại từ đầu.

---

### UC.25 — Daily Automated Shift Consolidation via Local LLM
- **Mã Use Case:** `UC.25`
- **Tên Use Case:** Tự động tổng hợp báo cáo ca trực hàng ngày bằng mô hình ngôn ngữ cục bộ.
- **Tác tử chính (Primary Actor):** System Scheduler (Cron Job định kỳ).
- **Tác tử phụ (Secondary Actor):** Department Manager (`manager`), Executive (`executive`), Ollama Local LLM Engine.
- **Mô tả ngắn gọn:** Vào cuối ngày làm việc (23:00) hoặc khi Quản lý/Lãnh đạo bấm yêu cầu, hệ thống tự động gom toàn bộ các biên bản giao ca đã duyệt (`APPROVED`) trong ngày, gửi nội dung tới LLM cục bộ (Ollama) để trích xuất các sự kiện trọng tâm, phân tích rủi ro liên phòng ban và tạo bản tóm tắt điều hành hàng ngày. Nếu dịch vụ LLM gặp lỗi, hệ thống tự động chuyển đổi sang cơ chế Fallback cơ học theo mẫu cố định.
- **Điều kiện tiên quyết (Pre-conditions):** Có ít nhất 01 biên bản giao ca ở trạng thái `APPROVED` trong ngày cần tổng hợp; máy chủ Ollama đang chạy mô hình cục bộ (Qwen2.5/Llama-3).
- **Điều kiện kết thúc (Post-conditions):** Báo cáo tổng hợp ngày được lưu vào bảng `shift_daily_summaries`, hiển thị trên Dashboard của Quản lý và Ban Giám đốc.
- **Luồng sự kiện chính (Main Flow):**
  1. Lập lịch tự động kích hoạt tiến trình tổng hợp (hoặc Quản lý nhấn nút *Consolidate Today's Shifts*).
  2. Hệ thống truy vấn toàn bộ các bản ghi `shift_reports` có `status = 'APPROVED'` trong ngày chỉ định.
  3. Hệ thống cấu trúc hóa nội dung các ca trực thành một prompt ngữ cảnh định dạng ChatML chuẩn.
  4. Hệ thống gửi yêu cầu suy luận tới Ollama API cục bộ (`http://localhost:11434/api/generate`).
  5. Ollama xử lý và sinh ra văn bản tổng kết gồm: Thống kê số lượng ca, Điểm nổi bật trong ngày, Danh sách sự cố & rủi ro, và Đề xuất hành động cho ngày mai.
  6. Backend bóc tách kết quả văn bản Markdown và các trường thông số có cấu trúc.
  7. Hệ thống lưu bản ghi vào bảng `shift_daily_summaries` với `is_fallback_generated = False`.
  8. Hệ thống thông báo hoàn tất và hiển thị báo cáo trên Executive Dashboard.
- **Luồng ngoại lệ (Exception Flows):**
  - **2a. Không có biên bản nào được duyệt trong ngày:**
    1. Hệ thống phát hiện số lượng biên bản `APPROVED` = 0.
    2. Hệ thống ghi nhật ký: "Không có dữ liệu ca trực được phê duyệt cho ngày [Date]".
    3. Dừng tiến trình tổng hợp mà không báo lỗi hệ thống.
  - **4a. Dịch vụ Ollama bị lỗi kết nối hoặc Timeout (> 30s):**
    1. Backend bắt ngoại lệ `ConnectionError` hoặc `TimeoutError` từ Ollama client.
    2. Hệ thống ghi cảnh báo an ninh/vận hành vào `audit_logs`.
    3. Hệ thống tự động kích hoạt tiến trình **Deterministic Fallback**: gom văn bản thô của từng ca trực theo mẫu danh sách cố định, tính toán các chỉ số thống kê cơ học (tổng số ca, số người tham gia, số sự cố ghi nhận).
    4. Lưu bản ghi vào bảng `shift_daily_summaries` với cờ `is_fallback_generated = True` và chú thích: "[Bản tổng hợp cơ học dự phòng - LLM Service Unavailable]".
    5. Hiển thị báo cáo dự phòng lên giao diện mà không làm sập tiến trình người dùng.

---

### UC.26 — Security & Access Enforcement (Dynamic RBAC, Session JTI & Email OTP)
- **Mã Use Case:** `UC.26`
- **Tên Use Case:** Kiểm soát an ninh, ma trận phân quyền động, phiên đơn lẻ và khôi phục mật khẩu.
- **Tác tử chính (Primary Actor):** System & IT Administrator (`it_admin`), Người dùng hệ thống (All Users).
- **Tác tử phụ (Secondary Actor):** Auth Service, Redis Cache, SMTP Email Service.
- **Mô tả ngắn gọn:** Bao quát các quy trình an ninh nghiêm ngặt của hệ sinh thái GraphMind: (1) IT Admin cấu hình phân quyền động 2D trên Web UI hiệu lực tức thì; (2) Hệ thống giám sát phiên làm việc đơn lẻ (Single Active Session) qua mã token `jti`, tự động thu hồi phiên cũ khi đăng nhập thiết bị mới; (3) Người dùng tự khôi phục mật khẩu an toàn thông qua mã OTP 6 số gửi qua Email.
- **Điều kiện tiên quyết (Pre-conditions):** Hệ thống xác thực và dịch vụ phân quyền đang hoạt động bình thường.
- **Điều kiện kết thúc (Post-conditions):** Quyền hạn được cập nhật, phiên cũ được thu hồi hoặc mật khẩu mới được băm bcrypt an toàn.
- **Luồng sự kiện chính (Main Flow - Phân luồng Cấu hình RBAC):**
  1. IT Admin truy cập màn hình *RBAC Permissions Matrix*.
  2. Hệ thống tải ma trận phân quyền dạng lưới 2 chiều từ bảng `rbac_permissions_matrix`.
  3. IT Admin thay đổi các quyền cho phép (`READ`, `WRITE`, `DELETE`, `APPROVE`, `EXECUTE`) của từng vai trò trên từng tài nguyên.
  4. IT Admin nhấn *Save Changes*.
  5. Hệ thống xác thực người gửi là IT Admin và đảm bảo không tự khóa quyền của chính mình.
  6. Hệ thống lưu cấu hình vào CSDL và xóa bộ đệm phân quyền (Cache Invalidation) để áp dụng ngay lập tức cho toàn bộ các request tiếp theo.
  7. Hệ thống ghi nhật ký kiểm toán vào `audit_logs`.
- **Luồng sự kiện chính (Main Flow - Phân luồng Single Active Session Enforcement):**
  1. Người dùng đăng nhập từ Thiết bị B trong khi phiên tại Thiết bị A đang hoạt động.
  2. Hệ thống tạo mã `jti_B` mới, đồng thời cập nhật `jti_A` vào danh sách bị thu hồi (Blacklisted).
  3. Tại Thiết bị A, khi người dùng thực hiện bất kỳ thao tác nào, Middleware kiểm tra thấy `jti_A` đã bị thu hồi.
  4. Hệ thống trả về mã lỗi HTTP `401 Unauthorized` kèm thông báo đăng nhập trùng lặp.
  5. Frontend tại Thiết bị A tự động xóa thông tin đăng nhập cục bộ và chuyển hướng về trang Login.
- **Luồng sự kiện chính (Main Flow - Phân luồng Quên mật khẩu qua Email OTP):**
  1. Người dùng bấm liên kết "Quên mật khẩu?" tại trang Đăng nhập.
  2. Người dùng nhập email đã đăng ký và nhấn *Send OTP*.
  3. Hệ thống tạo mã OTP ngẫu nhiên 6 chữ số, lưu tạm trong Redis với thời hạn 300 giây (5 phút), và gửi qua giao thức SMTP tới email của người dùng.
  4. Người dùng kiểm tra hòm thư, nhập mã OTP vào màn hình xác thực.
  5. Hệ thống kiểm tra mã OTP khớp và chưa hết hạn; sinh mã `reset_token` tạm thời.
  6. Người dùng nhập mật khẩu mới và xác nhận mật khẩu.
  7. Hệ thống băm mật khẩu bằng thuật toán `bcrypt` (Salt rounds >= 12), lưu vào bảng `users` và hủy toàn bộ phiên đang chạy.
- **Luồng ngoại lệ (Exception Flows):**
  - **5a. Cố tình tước quyền cốt lõi của IT Admin (Self-Lockout):**
    1. Hệ thống phát hiện quyền quản trị cốt lõi của vai trò `it_admin` bị tắt.
    2. Hệ thống hủy thao tác lưu, hiển thị lỗi: "Không thể vô hiệu hóa quyền quản trị nền tảng của IT Administrator".
  - **4b. Người dùng nhập sai OTP quá 5 lần:**
    1. Hệ thống phát hiện vượt quá số lần thử cho phép.
    2. Hủy mã OTP hiện tại, khóa yêu cầu khôi phục trong 15 phút để chống tấn công Brute-force.
  - **4c. Mã OTP bị hết hạn (> 5 phút):**
    1. Hệ thống thông báo mã OTP đã hết hiệu lực, yêu cầu người dùng gửi lại mã mới.

---

### UC.27 — Threat Mitigation & Workstation Remote Containment
- **Mã Use Case:** `UC.27`
- **Tên Use Case:** Chốt chặn an toàn Cypher và cô lập trạm máy AEGIS từ xa.
- **Tác tử chính (Primary Actor):** System Security Subsystem, System & IT Administrator (`it_admin`).
- **Tác tử phụ (Secondary Actor):** AEGIS Local Agent (trên Windows Client), Neo4j Graph Database Driver.
- **Mô tả ngắn gọn:** Xử lý và triệt tiêu các mối đe dọa an ninh trong hệ thống: (1) Bộ kiểm soát Cypher Guard tự động phân tích cú pháp AST của câu lệnh Cypher do AI sinh ra, lập tức chặn đứng nếu có từ khóa sửa đổi/xóa dữ liệu đồ thị; (2) IT Admin theo dõi hạm đội máy trạm AEGIS, có quyền nhấn công tắc ngắt khẩn cấp (Emergency Kill Switch) để chấm dứt ngay lập tức tiến trình agent trên máy trạm Windows từ xa trong thời gian <= 3 giây khi phát hiện nguy cơ.
- **Điều kiện tiên quyết (Pre-conditions):** IT Admin có phiên làm việc an toàn; các trạm máy AEGIS đang duy trì kết nối WebSocket tới máy chủ GraphMind.
- **Điều kiện kết thúc (Post-conditions):** Mọi câu truy vấn nguy hiểm bị chặn đứng; trạm máy có rủi ro bị cô lập hoàn toàn tiến trình thu thập tệp.
- **Luồng sự kiện chính (Main Flow - Luồng Chốt chặn Cypher Guard):**
  1. Người dùng gửi câu hỏi phân tích dữ liệu qua AI Copilot.
  2. Phân hệ Text-to-Cypher sinh câu truy vấn Cypher tự động từ câu hỏi.
  3. Câu truy vấn được chuyển tới bộ phân tích cú pháp `CypherGuard.validate()`.
  4. Hệ thống kiểm tra cây cú pháp AST: chỉ cho phép mệnh đề `MATCH` và `RETURN`, không chứa bất kỳ từ khóa cấm nào (`CREATE`, `MERGE`, `DELETE`, `DETACH`, `SET`, `DROP`, `CALL dbms`).
  5. Truy vấn an toàn được chuyển tới Neo4j Driver để thực thi lấy dữ liệu đồ thị.
  6. Kết quả dữ liệu được trả về giao diện người dùng.
- **Luồng sự kiện chính (Main Flow - Luồng Công tắc Ngắt khẩn cấp Máy trạm AEGIS):**
  1. IT Admin truy cập màn hình *Workstation Monitoring Fleet*.
  2. IT Admin phát hiện một trạm máy gửi dữ liệu bất thường hoặc nghi vấn bị xâm nhập.
  3. IT Admin nhấn nút *Emergency Kill Switch* trên dòng trạm máy đó.
  4. Hệ thống hiển thị hộp thoại xác nhận yêu cầu nhập mật khẩu bảo mật của IT Admin.
  5. IT Admin nhập mật khẩu và nhấn *Confirm Termination*.
  6. Backend gửi gói tin điều khiển ưu tiên cao qua kênh WebSocket tới AEGIS Agent trên máy trạm: `{"command": "EMERGENCY_KILL", "timestamp": ...}`.
  7. AEGIS Agent trên Windows nhận lệnh, đóng ngay các File Watcher stream, hủy các thread xử lý và gọi lệnh kết thúc tiến trình hệ thống trong thời gian <= 3 giây.
  8. Trạng thái máy trạm trên Web Dashboard tự động cập nhật sang `TERMINATED / CONTAINED`.
  9. Hệ thống ghi nhật ký an ninh mức `CRITICAL` vào `audit_logs`.
- **Luồng ngoại lệ (Exception Flows):**
  - **4a. Phát hiện câu truy vấn Cypher chứa từ khóa biến đổi dữ liệu:**
    1. Bộ Cypher Guard phát hiện từ khóa cấm (ví dụ: `DELETE`, `SET`, hoặc `MERGE`).
    2. Hệ thống ném ngoại lệ `UnsafeCypherException`, chặn đứng truy vấn không cho tiếp cận Neo4j.
    3. Hệ thống ghi log sự kiện an ninh vào `audit_logs` mức độ `CRITICAL`.
    4. Trả về thông báo an toàn cho người dùng: "Truy vấn bị từ chối do vi phạm quy tắc an toàn dữ liệu chỉ đọc".
  - **7a. Máy trạm bị rớt mạng không nhận được lệnh qua WebSocket:**
    1. Nếu sau 3 giây máy chủ không nhận được tín hiệu phản hồi xác nhận ngắt, máy chủ đổi trạng thái trạm máy thành `UNREACHABLE_ISOLATION_PENDING`.
    2. Khi máy trạm kết nối lại mạng trong tương lai, gói tin đầu tiên nhận được từ máy chủ sẽ là lệnh bắt buộc tự chấm dứt tiến trình ngay lập tức.

---

## 8. CHUẨN HÓA & BỔ SUNG LUỒNG NGOẠI LỆ (EXCEPTION FLOWS) CHO 22 USE CASES HIỆN CÓ (UC.01 ➔ UC.22)

Trong tài liệu SRS Ver 1.1, toàn bộ 22 Use Cases từ **Bảng 10 đến Bảng 31** đều đang để trống mục **Exception Flow** hoặc ghi chú "None". Đây là lỗi kỹ thuật nặng theo chuẩn IEEE 29148. Dưới đây là bảng chuẩn hóa toàn bộ các luồng ngoại lệ cụ thể cần được điền bổ sung trực tiếp vào từng Bảng Use Case tương ứng trong file Word:

| Mã UC | Tên Use Case | Bảng trong Word | Luồng Ngoại lệ Chuẩn hóa Cần Bổ sung (Exception Flows) |
|:---:|---|:---:|---|
| **UC.01** | System Login | Bảng 10 | **E1:** Nhập sai mật khẩu quá 5 lần liên tiếp ➔ Hệ thống tạm khóa tài khoản trong 15 phút để phòng chống tấn công dò quét (Brute-force).<br/>**E2:** Tài khoản bị vô hiệu hóa bởi IT Admin ➔ Hiển thị thông báo: "Tài khoản của bạn đã bị vô hiệu hóa, vui lòng liên hệ quản trị viên".<br/>**E3:** Phát hiện đăng nhập đồng thời từ thiết bị khác ➔ Thu hồi phiên cũ theo cơ chế Single Active Session (`CONCURRENT_LOGIN_DETECTED`). |
| **UC.02** | Manage accounts, departments & user identities | Bảng 11 | **E1:** Tạo tài khoản với email đã tồn tại ➔ Trả về `409 Conflict` kèm thông báo: "Địa chỉ email này đã được sử dụng".<br/>**E2:** IT Admin cố tình xóa chính tài khoản đang đăng nhập ➔ Hệ thống chặn thao tác và báo lỗi: "Không thể tự xóa tài khoản của chính mình".<br/>**E3:** Xóa phòng ban khi vẫn còn nhân sự trực thuộc ➔ Hệ thống từ chối xóa, yêu cầu chuyển toàn bộ nhân sự sang phòng ban khác trước. |
| **UC.03** | Granular Access Authorization (RBAC) | Bảng 12 | **E1:** Người dùng cố tình truy cập tài nguyên ngoài quyền hạn phân công ➔ Trả về mã lỗi `403 Forbidden` và ghi sự kiện vào `audit_logs`.<br/>**E2:** Token xác thực hết hạn hoặc bị sửa đổi trái phép ➔ Trả về `401 Unauthorized`, yêu cầu người dùng đăng nhập lại. |
| **UC.04** | Audit Log View & Data Protection | Bảng 13 | **E1:** Người dùng không có vai trò IT Admin hoặc Executive cố truy cập ➔ Chặn truy cập với lỗi `403 Forbidden`.<br/>**E2:** Khoảng thời gian lọc nhật ký không hợp lệ (Ngày bắt đầu > Ngày kết thúc) ➔ Báo lỗi: "Khoảng thời gian tra cứu không hợp lệ". |
| **UC.05** | LLMOps Token & Cost Monitoring | Bảng 14 | **E1:** Mất kết nối tới dịch vụ thu thập chỉ số (Prometheus/Redis) ➔ Hiển thị thông báo: "Không thể tải dữ liệu tiêu thụ token thời gian thực, hiển thị dữ liệu lưu đệm gần nhất".<br/>**E2:** Chi phí token vượt ngưỡng ngân sách cảnh báo tháng ➔ Kích hoạt cảnh báo đỏ nổi bật trên Dashboard. |
| **UC.06** | Cloud Data Source Connection Management | Bảng 15 | **E1:** Thông tin cấu hình xác thực (OAuth Client ID / Secret) sai ➔ Hệ thống báo lỗi kết nối thất bại, không lưu cấu hình.<br/>**E2:** Token truy cập Cloud Drive hết hạn và không thể tự làm mới (Refresh Token Expired) ➔ Yêu cầu quản trị viên đăng nhập ủy quyền lại.<br/>**E3:** Vượt quá giới hạn gọi API (Rate Limit Exceeded) từ nhà cung cấp Cloud ➔ Tạm hoãn tiến trình và lập lịch thử lại sau (Exponential Backoff). |
| **UC.07** | Workstation Monitoring & AEGIS Local Agent | Bảng 16 | **E1:** Mất kết nối WebSocket tới trạm máy quá 30 giây (Heartbeat Timeout) ➔ Chuyển trạng thái trạm máy thành `OFFLINE / DISCONNECTED`.<br/>**E2:** Mã xác thực đăng ký trạm máy (Agent Registration Key) không khớp ➔ Từ chối kết nối, ghi log cảnh báo xâm nhập thiết bị lạ. |
| **UC.08** | Sync Calendar Configuration & Incremental Sync | Bảng 17 | **E1:** Cú pháp biểu thức lập lịch Cron không hợp lệ ➔ Báo lỗi cú pháp tại giao diện nhập liệu.<br/>**E2:** Tiến trình đồng bộ trước đó vẫn đang chạy khi tới lịch mới ➔ Bỏ qua lượt đồng bộ mới để tránh xung đột tài nguyên (Skip Overlapping Runs). |
| **UC.09** | Sync Log & Data Flow Monitoring | Bảng 18 | **E1:** Tệp log đồng bộ có kích thước quá lớn gây nghẽn kết nối ➔ Hệ thống tự động phân trang truy vấn (Pagination - 50 dòng/trang).<br/>**E2:** Không tìm thấy mã định danh tiến trình đồng bộ (`sync_task_id`) ➔ Trả về `404 Not Found`. |
| **UC.10** | Data Loading & Preprocessing | Bảng 19 | **E1:** Tệp tài liệu bị lỗi mã hóa font hoặc bị mã hóa bảo vệ mật khẩu ➔ Trả về mã lỗi: "Tệp bị khóa mật khẩu hoặc lỗi mã hóa ký tự không thể trích xuất".<br/>**E2:** Tệp PDF quét dạng ảnh bị mờ không thể OCR ➔ Đánh dấu trạng thái `OCR_FAILED` và thông báo cho người dùng tải bản rõ hơn. |
| **UC.11** | Automatic Entity & Relational Extraction | Bảng 20 | **E1:** Mô hình LLM bóc tách trả về chuỗi JSON sai cú pháp ➔ Bộ phân tích cú pháp kích hoạt cơ chế sửa lỗi regex (Regex Heuristic Repair); nếu vẫn thất bại, đưa đoạn văn bản vào hàng đợi xử lý lại (Retry Queue).<br/>**E2:** Mô hình suy luận quá tải (GPU OOM) ➔ Tạm dừng nhận tác vụ mới và hạ độ ưu tiên xử lý. |
| **UC.12** | Document Browsing & File Preview | Bảng 21 | **E1:** Tệp gốc bị xóa hoặc mất đường dẫn trong bộ lưu trữ vật lý ➔ Trả về `404 Not Found` kèm thông báo: "Tài liệu gốc không còn tồn tại trên máy chủ lưu trữ".<br/>**E2:** Định dạng tệp không được trình duyệt hỗ trợ xem trước trực tiếp ➔ Cung cấp liên kết tải tệp về thay vì xem trước. |
| **UC.13** | Human-Involved Knowledge Editing | Bảng 22 | **E1:** Hai quản trị viên cùng chỉnh sửa một Node trên đồ thị đồng thời ➔ Áp dụng cơ chế khóa lạc quan (Optimistic Locking via Version Check), cảnh báo người lưu sau về xung đột dữ liệu.<br/>**E2:** Tạo quan hệ vòng lặp phi logic hoặc node trùng lặp ➔ Hệ thống từ chối lưu và đưa ra cảnh báo quy tắc bản thể học. |
| **UC.14** | SOP Drafting & Internal Knowledge Wiki | Bảng 23 | **E1:** Nội dung bản thảo quy trình để trống hoặc ít hơn 50 ký tự ➔ Chặn lưu và yêu cầu bổ sung nội dung.<br/>**E2:** Người dùng không có quyền thuộc phòng ban sở hữu quy trình ➔ Trả về lỗi `403 Forbidden`. |
| **UC.15** | Q&A with Hybrid AI Copilot (Hybrid GraphRAG) | Bảng 24 | **E1:** Không tìm thấy dữ liệu liên quan trong cả Qdrant và Neo4j (Độ tương đồng < 0.65) ➔ Trả về câu trả lời trung thực: "Hệ thống không tìm thấy tài liệu hoặc dữ liệu nội bộ liên quan đến câu hỏi này để trả lời".<br/>**E2:** Neo4j bị nghẽn kết nối hoặc Timeout (> 5s) ➔ Hệ thống tự động suy thoái xuống chế độ Dense Vector Retrieval thuần túy để tiếp tục phục vụ người dùng mà không làm gián đoạn hội thoại.<br/>**E3:** Câu truy vấn Cypher tự động vi phạm chốt chặn an toàn Cypher Guard ➔ Chặn đứng và thông báo câu lệnh không an toàn theo FR61. |
| **UC.16** | View Knowledge Graphs & Inference Lines | Bảng 25 | **E1:** Đồ thị con truy vấn có quy mô quá lớn (> 300 nodes) gây giật lag trình duyệt ➔ Hệ thống tự động giới hạn độ sâu k-hop (mặc định k=2) và gom nhóm các node cùng nhãn.<br/>**E2:** Node trung tâm không tồn tại trên CSDL ➔ Thông báo: "Thực thể không tồn tại hoặc đã bị xóa khỏi đồ thị tri thức". |
| **UC.17** | See source citation | Bảng 26 | **E1:** Tài liệu nguồn đính kèm trích dẫn đã bị xóa khỏi hệ thống ➔ Hiển thị chú thích: "[Tài liệu nguồn đã bị gỡ bỏ, chỉ lưu giữ đoạn trích dẫn văn bản]".<br/>**E2:** Người dùng không có quyền truy cập vào phòng ban sở hữu tài liệu trích dẫn ➔ Ẩn liên kết xem chi tiết tệp gốc (Đảm bảo quy tắc phân quyền dữ liệu BR-05). |
| **UC.18** | Chat Session Management & Shared Notes | Bảng 27 | **E1:** Người dùng tạo quá 100 phiên chat đang hoạt động ➔ Khuyến nghị lưu trữ hoặc xóa các phiên cũ để tối ưu hiệu năng.<br/>**E2:** Chia sẻ ghi chú cho người dùng không tồn tại ➔ Báo lỗi: "Không tìm thấy người dùng nhận chia sẻ". |
| **UC.19** | View Executive KPIs | Bảng 28 | **E1:** Cơ sở dữ liệu nghiệp vụ chưa có giao dịch nào trong kỳ báo cáo ➔ Hiển thị giá trị 0 kèm thông báo: "Không có dữ liệu giao dịch trong khoảng thời gian đã chọn".<br/>**E2:** Lỗi chia cho 0 khi tính toán tỷ lệ tăng trưởng ➔ Gán giá trị hiển thị `N/A` hoặc `+100%` kèm chú thích. |
| **UC.20** | Intelligent Risk Alert Tracking | Bảng 29 | **E1:** Không có rủi ro nào vượt ngưỡng cảnh báo ➔ Hiển thị trạng thái an toàn: "Hệ thống hoạt động bình thường, không ghi nhận rủi ro tài chính hoặc vận hành vượt ngưỡng".<br/>**E2:** Lỗi định dạng dữ liệu giá bán hoặc chiết khấu bị âm ➔ Đưa đơn hàng vào danh sách cảnh báo bất thường dữ liệu đầu vào. |
| **UC.21** | Automatic Executive Summary Report Generation | Bảng 30 | **E1:** Khoảng thời gian tổng hợp không có bất kỳ báo cáo ca trực hay giao dịch nào ➔ Thông báo: "Không có đủ dữ liệu để tạo báo cáo tổng kết kỳ".<br/>**E2:** Mô hình LLM cục bộ bị quá tải dẫn đến Timeout ➔ Tự động chuyển đổi sang mẫu tổng hợp cơ học Rule-based Fallback theo FR57.<br/>**E3:** Người dùng cố tình tìm nút tải file PDF/Word ➔ Hiển thị thông báo hướng dẫn: "Theo đặc tả Proposal Ver 1.2, tính năng tải file PDF/Word là Out-of-Scope; vui lòng xem trực tiếp trên Web Dashboard hoặc sử dụng chức năng in trang Web (Ctrl+P)". |
| **UC.22** | Multifaceted Unified Search & Filtering | Bảng 31 | **E1:** Từ khóa tìm kiếm quá ngắn (ít hơn 2 ký tự) ➔ Nhắc nhở người dùng: "Vui lòng nhập tối thiểu 2 ký tự để bắt đầu tìm kiếm".<br/>**E2:** Kết hợp nhiều bộ lọc mâu thuẫn không trả về kết quả ➔ Hiển thị màn hình rỗng kèm gợi ý: "Không tìm thấy kết quả phù hợp, vui lòng thử bỏ bớt các tiêu chí lọc". |

---

## 9. DANH MỤC TOÀN BỘ CHÚ THÍCH SƠ ĐỒ BÔI ĐỎ (RED DIAGRAM ANNOTATIONS)

> <span style="color: red; font-weight: bold;">HƯỚNG DẪN BIÊN TẬP SƠ ĐỒ TRONG FILE WORD:</span>  
> Mục này cung cấp toàn bộ các khối **CHÚ THÍCH SƠ ĐỒ BÔI ĐỎ** tương ứng với từng hình vẽ cần có trong tài liệu SRS Ver 1.2. Theo đúng yêu cầu, **không tạo file ảnh**. Nhóm tác giả khi biên soạn tài liệu Word chỉ cần sao chép các khối chú thích này vào đúng vị trí hình vẽ để phục vụ thiết kế hoặc kiểm tra nghiệm thu.

---

### 9.1. Sơ đồ Ngữ cảnh & Sơ đồ Phân rã Chức năng (Context & BFD)

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 2.1 — Sơ đồ Ngữ cảnh Hệ thống GraphMind (System Context Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 2.2 System Context Diagram (Thay thế Hình 3.1 cũ).<br/>
<strong>Loại sơ đồ:</strong> System Context Diagram (UML Deployment / Architectural Context).<br/>
<strong>Khối trung tâm:</strong> Hệ thống GraphMind Platform (Backend FastAPI + Frontend React 18 SPA + PostgreSQL + Neo4j + Qdrant + Ollama Engine).<br/>
<strong>5 Tác tử Người dùng tương tác:</strong><br/>
1. <em>System & IT Administrator:</em> Gửi cấu hình RBAC, lệnh Kill Switch, giám sát phiên làm việc và xem Audit Logs.<br/>
2. <em>Knowledge Administrator:</em> Duyệt tài liệu PENDING, kích hoạt pipeline ETL, chỉnh sửa đồ thị tri thức qua Graph Editor.<br/>
3. <em>Executive (Lãnh đạo):</em> Xem KPI Dashboard, nhận cảnh báo rủi ro tài chính, xem tổng hợp giao ca ngày, truy vấn AI Copilot xuyên phòng ban.<br/>
4. <em>Department Manager:</em> Ký duyệt biên bản giao ca trực bộ phận, kích hoạt AI tổng hợp báo cáo ngày, hỏi đáp dữ liệu phòng ban.<br/>
5. <em>Standard User:</em> Tải tài liệu nội bộ chờ duyệt, lập biên bản ca trực, hỏi đáp AI Copilot nội bộ phòng ban, khôi phục mật khẩu qua Email OTP.<br/>
<strong>Các Thực thể & Hệ thống Bên ngoài:</strong><br/>
- <em>AEGIS Local Agent (Windows Workstations):</em> Gửi dữ liệu file nội bộ và nhịp tim Heartbeat 30s qua WebSocket; nhận lệnh ngắt khẩn cấp.<br/>
- <em>Cloud Storage Providers (Google Drive, OneDrive):</em> Cung cấp API OAuth2 đồng bộ tệp dữ liệu đám mây.<br/>
- <em>SMTP Mail Server:</em> Tiếp nhận yêu cầu gửi mã OTP xác thực khôi phục mật khẩu.<br/>
- <em>Local Ollama LLM Service:</em> Tiếp nhận prompt suy luận cục bộ phục vụ trích xuất thực thể, Text-to-Cypher và tổng hợp ca trực.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.1 — Sơ đồ Phân rã Chức năng Nghiệp vụ (Business Function Diagram - BFD)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.1 Business Function Diagram (BFD) (Thay thế Hình 5.1 cũ).<br/>
<strong>Loại sơ đồ:</strong> Functional Decomposition Tree / Business Function Diagram.<br/>
<strong>Gốc cây (Root):</strong> GraphMind Enterprise Knowledge Management & Decision Support Platform.<br/>
<strong>6 Nhánh Chức năng Cấp 1 (Modules):</strong><br/>
1. <em>Phân hệ Quản trị Hệ thống & An ninh:</em> Xác thực người dùng, Quản trị tài khoản & phòng ban, Ma trận phân quyền động 2D (FR58), Chế tài phiên đơn lẻ JTI (FR59), Quên mật khẩu Email OTP (FR60), Kiểm toán Audit Logs, Giám sát trạm máy & Kill Switch AEGIS (FR62).<br/>
2. <em>Phân hệ Kết nối & Pipeline Dữ liệu Tri thức:</em> Kết nối Cloud Drive, Thu thập tệp trạm máy qua AEGIS Agent, Tải tài liệu nội bộ chờ duyệt (FR53), Phê duyệt tài liệu số (FR54), Lập lịch đồng bộ tệp, Giám sát luồng dữ liệu Sync Log.<br/>
3. <em>Phân hệ Tiền xử lý & Đồ thị Tri thức (Neo4j):</em> Tiền xử lý văn bản đa định dạng, Trích xuất thực thể & quan hệ tự động, Trình biên tập tri thức (Knowledge Editor & Graph Editor), Quản trị SOP Wiki nội bộ, Chốt chặn an toàn Cypher Guard (FR61).<br/>
4. <em>Phân hệ AI Copilot & Hybrid GraphRAG:</em> Vector Search (Qdrant), Graph Traversal (Neo4j), Text-to-Cypher, Reranking kết quả, Hỏi đáp có trích dẫn nguồn gốc, Quản lý phiên hội thoại & ghi chú chia sẻ.<br/>
5. <em>Phân hệ Bàn giao Ca trực & Báo cáo Tự động:</em> Lập biên bản ca trực (DRAFT/SUBMITTED - FR55), Trưởng phòng ký duyệt biên bản ca (FR56), AI tự động tổng hợp báo cáo ca ngày bằng Ollama + Fallback (FR57).<br/>
6. <em>Phân hệ Phân tích Điều hành & Trung tâm Cảnh báo Rủi ro:</em> Executive KPI Dashboard, Trung tâm cảnh báo rủi ro tài chính (Negative Margin, Abnormal Discount >= 35%), Tra cứu tìm kiếm đa diện (Multifaceted Search).
</p>
</div>

---

### 9.2. Sơ đồ Use Case Tổng quan & Phân hệ (Use Case Diagrams)

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.2.1 — Sơ đồ Use Case Tổng quan Toàn Hệ thống (System Use Case Overview Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.2 Use Case Diagram Overview (Mục 5.3 cũ).<br/>
<strong>Loại sơ đồ:</strong> UML Use Case Diagram.<br/>
<strong>5 Tác tử chính:</strong> IT Admin, Knowledge Admin, Executive, Department Manager, Standard User.<br/>
<strong>Ranh giới hệ thống:</strong> Bao gồm toàn bộ 27 Use Cases từ UC.01 đến UC.27 phân nhóm theo 6 phân hệ lớn; thể hiện các quan hệ <code>&lt;&lt;include&gt;&gt;</code> giữa UC.15 (AI Copilot) với UC.16 (View Graph), UC.17 (Source Citation) và UC.27 (Cypher Guard); quan hệ <code>&lt;&lt;extend&gt;&gt;</code> từ UC.25 (Daily Shift Consolidation) sang Rule-Based Fallback.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.2.2 — Sơ đồ Use Case Phân hệ Quản trị & An ninh (Administration & Security UC Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.2 (Phân hệ Quản trị).<br/>
<strong>Loại sơ đồ:</strong> UML Use Case Diagram (Subsystem View).<br/>
<strong>Tác tử tham gia:</strong> System & IT Administrator, Standard User, Auth Service, SMTP Server.<br/>
<strong>Các Use Cases thành phần:</strong> UC.01 (Đăng nhập hệ thống), UC.02 (Quản lý tài khoản & phòng ban), UC.03 (Phân quyền truy cập), UC.04 (Xem Audit Log), UC.05 (Giám sát Token/Chi phí LLM), UC.26 (Quản lý Ma trận RBAC động, Ép buộc phiên đơn lẻ JTI, Quên mật khẩu qua Email OTP), UC.27 (Kích hoạt Emergency Kill Switch máy trạm AEGIS).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.2.3 — Sơ đồ Use Case Phân hệ Thu thập & Phê duyệt Dữ liệu Tri thức (Data Pipeline & Ingestion UC Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.2 (Phân hệ Pipeline dữ liệu).<br/>
<strong>Loại sơ đồ:</strong> UML Use Case Diagram (Subsystem View).<br/>
<strong>Tác tử tham gia:</strong> Standard User, Department Manager, Knowledge Administrator, Ingestion Pipeline Service, AEGIS Agent.<br/>
<strong>Các Use Cases thành phần:</strong> UC.06 (Kết nối Cloud Drive), UC.07 (Giám sát AEGIS Agent), UC.08 (Cấu hình lịch đồng bộ), UC.09 (Giám sát log đồng bộ), UC.10 (Nạp & tiền xử lý tệp), UC.11 (Trích xuất thực thể/quan hệ tự động), UC.12 (Duyệt tài liệu & xem trước), UC.23 (Tải tài liệu nội bộ chờ duyệt SHA-256 & Quy trình phê duyệt của Knowledge Admin).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.2.4 — Sơ đồ Use Case Phân hệ Đồ thị Tri thức & Hybrid AI Copilot (Knowledge Graph & GraphRAG UC Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.2 (Phân hệ AI Copilot & Graph).<br/>
<strong>Loại sơ đồ:</strong> UML Use Case Diagram (Subsystem View).<br/>
<strong>Tác tử tham gia:</strong> Knowledge Administrator, Executive, Department Manager, Standard User, Neo4j Driver, Qdrant Vector Engine.<br/>
<strong>Các Use Cases thành phần:</strong> UC.13 (Biên tập tri thức chuyên gia), UC.14 (Soạn thảo & quản lý SOP Wiki), UC.15 (Hỏi đáp Hybrid GraphRAG Copilot), UC.16 (Xem đồ thị trực quan & đường suy luận), UC.17 (Xem trích dẫn nguồn gốc), UC.18 (Quản lý phiên chat & ghi chú chia sẻ), UC.27 (Bộ chốt chặn an toàn Cypher Guard kiểm soát truy vấn Text-to-Cypher).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.2.5 — Sơ đồ Use Case Phân hệ Báo cáo Giao ca & Phân tích Điều hành (Shift Handover & Executive Analytics UC Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.2 (Phân hệ Giao ca & Ra quyết định).<br/>
<strong>Loại sơ đồ:</strong> UML Use Case Diagram (Subsystem View).<br/>
<strong>Tác tử tham gia:</strong> Standard User, Department Manager, Executive, Ollama Local Engine.<br/>
<strong>Các Use Cases thành phần:</strong> UC.19 (Xem KPI điều hành doanh nghiệp), UC.20 (Theo dõi cảnh báo rủi ro tài chính Negative Margin/Abnormal Discount), UC.21 (Tự động tạo báo cáo tóm tắt điều hành trên Web), UC.22 (Tìm kiếm đa diện tích hợp), UC.24 (Lập và ký duyệt biên bản giao ca phòng ban), UC.25 (Tự động tổng hợp báo cáo ca ngày bằng AI Ollama kèm Fallback).
</p>
</div>

---

### 9.3. Sơ đồ Hoạt động (Activity Diagrams) cho 5 Use Cases Mới

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.3.23 — Activity Diagram: UC.23 — Internal Document Upload & Approval Workflow]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.3 Activity Diagrams (Thêm mới sau Hình 5.5.22).<br/>
<strong>Loại sơ đồ:</strong> UML Activity Diagram (Swimlane: 3 làn - <em>Standard User</em>, <em>GraphMind Backend/Storage</em>, <em>Knowledge Administrator</em>).<br/>
<strong>Luồng hoạt động:</strong><br/>
- <em>Làn User:</em> Chọn tệp từ máy tính ➔ Nhập thông tin & bấm Tải lên.<br/>
- <em>Làn Backend:</em> Kiểm tra dung lượng & định dạng tệp [Hợp lệ?] ➔ (Nếu không: Trả lỗi, Dừng); (Nếu có: Tính toán SHA-256 hash) ➔ Kiểm tra trùng lặp [Đã tồn tại?] ➔ (Nếu có: Báo lỗi trùng, Dừng); (Nếu chưa: Lưu tệp vào Storage, tạo bản ghi trạng thái PENDING_APPROVAL) ➔ Gửi thông báo tới Knowledge Admin.<br/>
- <em>Làn Knowledge Admin:</em> Nhận thông báo ➔ Mở Approval Queue ➔ Xem trước tệp (Preview) ➔ Ra quyết định [Phê duyệt hay Từ chối?]:<br/>
  + Nếu <em>Từ chối:</em> Nhập lý do từ chối ➔ Cập nhật trạng thái REJECTED ➔ Gửi phản hồi cho User ➔ Kết thúc.<br/>
  + Nếu <em>Phê duyệt:</em> Bấm Approve ➔ Cập nhật trạng thái APPROVED ➔ Kích hoạt Celery Task đẩy vào Ingestion Pipeline (Chunking, Vectorizing, Graph Extraction) ➔ Ghi Audit Log ➔ Kết thúc.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.3.24 — Activity Diagram: UC.24 — Departmental Shift Handover Reporting & Sign-off]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.3 Activity Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Activity Diagram (Swimlane: 2 làn - <em>Standard User</em>, <em>Department Manager</em>).<br/>
<strong>Luồng hoạt động:</strong><br/>
- <em>Làn User:</em> Mở biểu mẫu ca trực ➔ Điền nội dung nhiệm vụ hoàn thành, sự cố phát sinh, nhiệm vụ bàn giao ➔ Lựa chọn [Lưu nháp hay Nộp?]:<br/>
  + Nếu <em>Lưu nháp:</em> Bấm Save Draft ➔ Lưu trạng thái DRAFT ➔ Kết thúc tạm thời.<br/>
  + Nếu <em>Nộp:</em> Bấm Submit Report ➔ Hệ thống kiểm tra trường bắt buộc ➔ Lưu trạng thái SUBMITTED ➔ Gửi thông báo tới Trưởng phòng.<br/>
- <em>Làn Department Manager:</em> Nhận thông báo ➔ Mở danh sách biên bản chờ duyệt ➔ Đọc nội dung ➔ Nhập nhận xét chỉ đạo (Manager Remarks) ➔ Quyết định [Ký duyệt hay Yêu cầu sửa?]:<br/>
  + Nếu <em>Yêu cầu sửa:</em> Nhập lý do phản hồi ➔ Chuyển trạng thái REJECTED ➔ Mở khóa cho User sửa lại.<br/>
  + Nếu <em>Ký duyệt:</em> Bấm Sign-off & Approve ➔ Lưu chữ ký điện tử, thời gian duyệt ➔ Đổi trạng thái APPROVED ➔ Lưu trữ sẵn sàng cho tổng hợp ca ngày.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.3.25 — Activity Diagram: UC.25 — Daily Automated Shift Consolidation via Local LLM]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.3 Activity Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Activity Diagram (Swimlane: 3 làn - <em>Cron Scheduler / Manager</em>, <em>GraphMind Core Engine</em>, <em>Ollama Local LLM</em>).<br/>
<strong>Luồng hoạt động:</strong><br/>
- <em>Khởi phát:</em> Cron Scheduler kích hoạt lúc 23:00 (hoặc Manager nhấn nút Tổng hợp).<br/>
- <em>Core Engine:</em> Truy vấn các biên bản ca trạng thái APPROVED trong ngày [Có biên bản nào không?] ➔ (Nếu không: Ghi log không có dữ liệu, Dừng); (Nếu có: Gom văn bản, định dạng prompt ChatML chuẩn) ➔ Gửi yêu cầu suy luận tới Ollama.<br/>
- <em>Kiểm tra dịch vụ Ollama [Kết nối thành công & phản hồi trong 30s?]:</em><br/>
  + Nếu <em>Thất bại / Quá tải:</em> Kích hoạt tiến trình Fallback cơ học ➔ Thống kê số liệu, gom danh sách nhiệm vụ/sự cố theo bảng cố định ➔ Gán cờ is_fallback_generated = True ➔ Lưu CSDL.<br/>
  + Nếu <em>Thành công:</em> Ollama trích xuất rủi ro, tóm tắt sự kiện, sinh khuyến nghị ➔ Core Engine bóc tách văn bản Markdown ➔ Gán cờ is_fallback_generated = False ➔ Lưu CSDL.<br/>
- Xuất bản báo cáo tổng hợp ngày lên Executive Dashboard ➔ Gửi thông báo hoàn tất ➔ Dừng.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.3.26 — Activity Diagram: UC.26 — Security & Access Enforcement (RBAC Matrix, Session JTI & Email OTP)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.3 Activity Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Activity Diagram (Tổ hợp 3 luồng hoạt động an ninh song song).<br/>
<strong>Luồng 1 (RBAC Matrix):</strong> IT Admin chọn quyền trên lưới 2D ➔ Bấm Lưu ➔ Kiểm tra Self-Lockout (Nếu vi phạm: Báo lỗi) ➔ Lưu Postgres ➔ Xóa Redis Cache ➔ Áp dụng tức thì.<br/>
<strong>Luồng 2 (Single Active Session):</strong> User đăng nhập Thiết bị mới ➔ Sinh jti_new, hủy jti_old (đưa vào Blacklist) ➔ Thiết bị cũ gửi request tiếp theo ➔ Middleware phát hiện jti_old bị thu hồi ➔ Trả mã HTTP 401 ConcurrentLogin ➔ Đẩy User tại thiết bị cũ về màn hình Login.<br/>
<strong>Luồng 3 (Quên mật khẩu Email OTP):</strong> User nhập Email ➔ Sinh mã OTP 6 số (hết hạn sau 5 phút) ➔ Gửi SMTP ➔ User nhập OTP ➔ Xác thực đúng ➔ Nhập mật khẩu mới ➔ Băm bcrypt ➔ Hủy toàn bộ phiên làm việc cũ ➔ Đổi mật khẩu thành công.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.3.27 — Activity Diagram: UC.27 — Threat Mitigation & Workstation Remote Containment]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.3 Activity Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Activity Diagram (Tổ hợp 2 phân luồng giảm thiểu rủi ro an ninh).<br/>
<strong>Phân luồng 1 (Cypher Guard AST Interceptor):</strong> AI Copilot sinh câu truy vấn Cypher ➔ Chuyển qua hàm validate_read_only_cypher() ➔ Tokenizer phân tích cú pháp AST [Chứa từ khóa cấm: CREATE, MERGE, DELETE, SET, DETACH, CALL dbms?]:<br/>
- Nếu <em>Có:</em> Ném ngoại lệ UnsafeCypherQueryException ➔ Chặn đứng không gửi tới CSDL ➔ Ghi cảnh báo CRITICAL vào audit_logs ➔ Trả thông báo lỗi an toàn cho User.<br/>
- Nếu <em>Không:</em> Chuyển câu lệnh MATCH ... RETURN tới Neo4j Driver ➔ Trả dữ liệu an toàn.<br/>
<strong>Phân luồng 2 (Emergency Kill Switch):</strong> IT Admin phát hiện trạm máy bất thường ➔ Nhấn Kill Switch trên Dashboard ➔ Nhập mật khẩu quản trị viên ➔ Máy chủ gửi lệnh EMERGENCY_KILL qua WebSocket ➔ AEGIS Agent trên trạm máy Windows nhận lệnh ➔ Đóng lập tức file streams, kill threads, thoát tiến trình hệ thống trong thời gian &lt;= 3 giây ➔ Cập nhật trạng thái TERMINATED lên Dashboard.
</p>
</div>

---

### 9.4. Sơ đồ Tuần tự (Sequence Diagrams) cho 5 Use Cases Mới

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.4.23 — Sequence Diagram: UC.23 — Internal Document Upload & Approval Workflow]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.4 Sequence Diagrams (Thêm mới sau Hình 5.6.22).<br/>
<strong>Loại sơ đồ:</strong> UML Sequence Diagram.<br/>
<strong>Các đối tượng tương tác (Lifelines):</strong> <code>:StandardUser</code>, <code>:WebUI</code>, <code>:DocumentRouter</code>, <code>:StorageService</code>, <code>:PostgresDB</code>, <code>:KnowledgeAdmin</code>, <code>:CeleryWorker</code>, <code>:Neo4jDriver</code>.<br/>
<strong>Chuỗi thông điệp tuần tự (Messages):</strong><br/>
1. <code>StandardUser ➔ WebUI:</code> Chọn tệp tải lên (.pdf) & phòng ban.<br/>
2. <code>WebUI ➔ DocumentRouter:</code> POST /api/v1/documents/upload (Multipart form-data).<br/>
3. <code>DocumentRouter ➔ DocumentRouter:</code> Tính mã băm SHA-256 checksum.<br/>
4. <code>DocumentRouter ➔ PostgresDB:</code> SELECT FROM documents WHERE sha256 = hash.<br/>
5. <code>PostgresDB ➔ DocumentRouter:</code> Trả về None (Không trùng lặp).<br/>
6. <code>DocumentRouter ➔ StorageService:</code> Save file to local/shared directory.<br/>
7. <code>DocumentRouter ➔ PostgresDB:</code> INSERT INTO documents (status='PENDING_APPROVAL').<br/>
8. <code>DocumentRouter ➔ WebUI:</code> 201 Created (Tải lên thành công, chờ phê duyệt).<br/>
9. <code>KnowledgeAdmin ➔ WebUI:</code> Mở màn hình Document Approval Queue.<br/>
10. <code>WebUI ➔ DocumentRouter:</code> GET /api/v1/documents/pending-approvals.<br/>
11. <code>DocumentRouter ➔ WebUI:</code> Danh sách tài liệu kèm liên kết preview.<br/>
12. <code>KnowledgeAdmin ➔ WebUI:</code> Bấm nút Approve.<br/>
13. <code>WebUI ➔ DocumentRouter:</code> POST /api/v1/documents/{id}/approve.<br/>
14. <code>DocumentRouter ➔ PostgresDB:</code> UPDATE documents SET status='APPROVED'; INSERT INTO document_approvals.<br/>
15. <code>DocumentRouter ➔ CeleryWorker:</code> publish_task("process_document_ingestion", doc_id).<br/>
16. <code>CeleryWorker ➔ Neo4jDriver:</code> Thực thi trích xuất thực thể và tạo quan hệ đồ thị tri thức.<br/>
17. <code>DocumentRouter ➔ WebUI:</code> 200 OK (Phê duyệt thành công).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.4.24 — Sequence Diagram: UC.24 — Departmental Shift Handover Reporting & Sign-off]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.4 Sequence Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Sequence Diagram.<br/>
<strong>Các đối tượng tương tác (Lifelines):</strong> <code>:StandardUser</code>, <code>:WebUI</code>, <code>:ShiftRouter</code>, <code>:PostgresDB</code>, <code>:DepartmentManager</code>.<br/>
<strong>Chuỗi thông điệp tuần tự (Messages):</strong><br/>
1. <code>StandardUser ➔ WebUI:</code> Nhập thông tin ca trực & bấm Submit Report.<br/>
2. <code>WebUI ➔ ShiftRouter:</code> POST /api/v1/shifts/reports (status='SUBMITTED').<br/>
3. <code>ShiftRouter ➔ PostgresDB:</code> INSERT INTO shift_reports (department_id, completed_tasks, issues, status='SUBMITTED').<br/>
4. <code>ShiftRouter ➔ WebUI:</code> 201 Created (Nộp biên bản thành công).<br/>
5. <code>DepartmentManager ➔ WebUI:</code> Truy cập danh sách biên bản ca trực phòng ban.<br/>
6. <code>WebUI ➔ ShiftRouter:</code> GET /api/v1/shifts/pending-reviews?department_id=dept_1.<br/>
7. <code>ShiftRouter ➔ WebUI:</code> Trả về danh sách biên bản SUBMITTED.<br/>
8. <code>DepartmentManager ➔ WebUI:</code> Nhập chỉ đạo điều hành & bấm Sign-off & Approve.<br/>
9. <code>WebUI ➔ ShiftRouter:</code> POST /api/v1/shifts/reports/{id}/sign-off (action='APPROVE', remarks='...').<br/>
10. <code>ShiftRouter ➔ PostgresDB:</code> UPDATE shift_reports SET status='APPROVED', signed_by=mgr_id, approved_at=now().<br/>
11. <code>ShiftRouter ➔ PostgresDB:</code> INSERT INTO audit_logs (event='SHIFT_APPROVED').<br/>
12. <code>ShiftRouter ➔ WebUI:</code> 200 OK (Ký duyệt biên bản hoàn tất).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.4.25 — Sequence Diagram: UC.25 — Daily Automated Shift Consolidation via Local LLM]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.4 Sequence Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Sequence Diagram.<br/>
<strong>Các đối tượng tương tác (Lifelines):</strong> <code>:CronScheduler</code>, <code>:ConsolidationService</code>, <code>:PostgresDB</code>, <code>:OllamaClient</code>, <code>:FallbackHandler</code>, <code>:ExecutiveDashboard</code>.<br/>
<strong>Chuỗi thông điệp tuần tự (Messages):</strong><br/>
1. <code>CronScheduler ➔ ConsolidationService:</code> Trigger daily consolidation (target_date=today).<br/>
2. <code>ConsolidationService ➔ PostgresDB:</code> SELECT * FROM shift_reports WHERE date=today AND status='APPROVED'.<br/>
3. <code>PostgresDB ➔ ConsolidationService:</code> Trả về danh sách n biên bản đã ký duyệt.<br/>
4. <code>ConsolidationService ➔ ConsolidationService:</code> Xây dựng Prompt ChatML tổng hợp nghiệp vụ.<br/>
5. <code>ConsolidationService ➔ OllamaClient:</code> POST /api/generate (model='qwen2.5', prompt, timeout=30s).<br/>
<em>Khối phân nhánh Alt [Ollama Response Status]:</em><br/>
- <em>Nhánh Thành công (200 OK):</em><br/>
  6a. <code>OllamaClient ➔ ConsolidationService:</code> Trả về văn bản tổng kết Markdown.<br/>
  7a. <code>ConsolidationService ➔ PostgresDB:</code> INSERT INTO shift_daily_summaries (content, is_fallback=False).<br/>
- <em>Nhánh Lỗi / Timeout (> 30s):</em><br/>
  6b. <code>OllamaClient ➔ ConsolidationService:</code> Throws TimeoutError / ConnectionRefused.<br/>
  7b. <code>ConsolidationService ➔ FallbackHandler:</code> generate_rule_based_summary(shifts).<br/>
  8b. <code>FallbackHandler ➔ PostgresDB:</code> INSERT INTO shift_daily_summaries (content, is_fallback=True).<br/>
  9b. <code>FallbackHandler ➔ PostgresDB:</code> INSERT INTO audit_logs (event='OLLAMA_FALLBACK_TRIGGERED').<br/>
8. <code>ConsolidationService ➔ ExecutiveDashboard:</code> Publish summary event (Sẵn sàng hiển thị).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.4.26 — Sequence Diagram: UC.26 — Security & Access Enforcement (Single Session Revocation)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.4 Sequence Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Sequence Diagram (Mô tả quy trình cưỡng chế phiên duy nhất Single Active Session qua JTI).<br/>
<strong>Các đối tượng tương tác (Lifelines):</strong> <code>:Browser_DeviceA</code>, <code>:Browser_DeviceB</code>, <code>:AuthRouter</code>, <code>:SessionService</code>, <code>:RedisCache</code>, <code>:PostgresDB</code>, <code>:AuthMiddleware</code>.<br/>
<strong>Chuỗi thông điệp tuần tự (Messages):</strong><br/>
1. <code>Browser_DeviceB ➔ AuthRouter:</code> POST /api/v1/auth/login (username, password).<br/>
2. <code>AuthRouter ➔ PostgresDB:</code> Kiểm tra mật khẩu bcrypt hợp lệ.<br/>
3. <code>AuthRouter ➔ SessionService:</code> register_active_session(user_id, ip_B).<br/>
4. <code>SessionService ➔ PostgresDB:</code> Tìm phiên đang active của user_id (Phát hiện session_A có jti_A).<br/>
5. <code>SessionService ➔ PostgresDB:</code> UPDATE user_active_sessions SET status='REVOKED' WHERE jti=jti_A.<br/>
6. <code>SessionService ➔ RedisCache:</code> SET blacklist:jti_A = true (TTL=7 days).<br/>
7. <code>SessionService ➔ PostgresDB:</code> INSERT INTO user_active_sessions (jti_B, user_id, ip_B, status='ACTIVE').<br/>
8. <code>AuthRouter ➔ Browser_DeviceB:</code> 200 OK (Token chứa jti_B).<br/>
9. <code>Browser_DeviceA ➔ AuthMiddleware:</code> Gửi request tiếp theo kèm Token (chứa jti_A).<br/>
10. <code>AuthMiddleware ➔ RedisCache:</code> GET blacklist:jti_A.<br/>
11. <code>RedisCache ➔ AuthMiddleware:</code> Trả về true (Token đã bị thu hồi).<br/>
12. <code>AuthMiddleware ➔ Browser_DeviceA:</code> HTTP 401 Unauthorized (CONCURRENT_LOGIN_DETECTED).<br/>
13. <code>Browser_DeviceA ➔ Browser_DeviceA:</code> Xóa Token LocalStorage & chuyển hướng về trang Login.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.4.27 — Sequence Diagram: UC.27 — Threat Mitigation (Cypher Guard AST & Emergency Kill Switch)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.4 Sequence Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML Sequence Diagram (Mô tả 2 luồng: Cypher Interceptor và Kill Switch).<br/>
<strong>Phần 1: Cypher Guard Interceptor:</strong><br/>
1. <code>CopilotEngine ➔ TextToCypher:</code> generate_cypher("Xóa các khách hàng không có giao dịch").<br/>
2. <code>TextToCypher ➔ CypherGuard:</code> validate_read_only_cypher("MATCH (c:Customer) DETACH DELETE c").<br/>
3. <code>CypherGuard ➔ CypherGuard:</code> AST Tokenizer phát hiện từ khóa cấm: ['DETACH', 'DELETE'].<br/>
4. <code>CypherGuard ➔ PostgresDB:</code> INSERT INTO audit_logs (level='CRITICAL', event='BLOCKED_CYPHER_MUTATION').<br/>
5. <code>CypherGuard ➔ CopilotEngine:</code> Throws UnsafeCypherQueryException.<br/>
6. <code>CopilotEngine ➔ WebUI:</code> Hiển thị thông báo: "Yêu cầu bị từ chối do vi phạm quy tắc an toàn dữ liệu chỉ đọc".<br/>
<strong>Phần 2: Workstation Emergency Kill Switch (Thời gian &lt;= 3s):</strong><br/>
7. <code>ITAdmin ➔ WebUI:</code> Nhấn nút Emergency Kill Switch cho Workstation_WS01 & nhập mật khẩu.<br/>
8. <code>WebUI ➔ WorkstationRouter:</code> POST /api/v1/workstations/WS01/kill-switch.<br/>
9. <code>WorkstationRouter ➔ WebSocketManager:</code> send_command("WS01", {"action": "EMERGENCY_KILL"}).<br/>
10. <code>WebSocketManager ➔ AEGIS_Agent (Windows):</code> Gửi gói tin ngắt qua kết nối wss://.<br/>
11. <code>AEGIS_Agent ➔ AEGIS_Agent:</code> Đóng File Watcher streams, kill worker threads, gọi os._exit(0) (&lt; 3 giây).<br/>
12. <code>AEGIS_Agent ➔ WebSocketManager:</code> [Tùy chọn] Gửi ACK "TERMINATING" trước khi ngắt socket.<br/>
13. <code>WebSocketManager ➔ PostgresDB:</code> UPDATE workstations SET status='TERMINATED', last_heartbeat=now().<br/>
14. <code>WorkstationRouter ➔ WebUI:</code> 200 OK (Đã cô lập trạm máy trong 1.8s).
</p>
</div>

---

### 9.5. Sơ đồ Cấu trúc & Dữ liệu Hệ thống (Class, ERD, Ontology & State Machines)

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.5 — Sơ đồ Lớp Hệ thống GraphMind (System Class Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.5 System Class Diagram (Thay thế Hình 5.7 cũ).<br/>
<strong>Loại sơ đồ:</strong> UML Class Diagram.<br/>
<strong>Các lớp đối tượng cốt lõi:</strong><br/>
- <code>User:</code> id, username, email, password_hash, role_id, department_id, is_active.<br/>
- <code>Department:</code> id, name, code, description, manager_id.<br/>
- <code>RbacPermission:</code> id, role_id, resource_name, permission_type, is_granted.<br/>
- <code>UserActiveSession:</code> id, user_id, jti, ip_address, user_agent, status, expires_at.<br/>
- <code>Document:</code> id, title, file_path, file_size, mime_type, sha256_hash, status, department_id, created_by.<br/>
- <code>DocumentApproval:</code> id, document_id, approved_by, action, rejection_reason, created_at.<br/>
- <code>ShiftReport:</code> id, user_id, department_id, shift_name, report_date, completed_tasks, issues_encountered, handover_notes, status, signed_by_manager_id, approved_at.<br/>
- <code>ShiftDailySummary:</code> id, department_id, summary_date, content_markdown, total_shifts, total_issues, is_fallback_generated, created_at.<br/>
- <code>AuditLog:</code> id, user_id, event_type, resource_affected, ip_address, severity_level, details_json, created_at.<br/>
- <code>Workstation:</code> id, workstation_name, ip_address, os_version, aegis_version, status, last_heartbeat.<br/>
<strong>Các mối quan hệ:</strong> <code>User</code> thuộc về 1 <code>Department</code> (1..*); <code>User</code> sở hữu nhiều <code>UserActiveSession</code> (1..*); <code>Department</code> có nhiều <code>Document</code> và <code>ShiftReport</code> (1..*); <code>Document</code> có 1 <code>DocumentApproval</code> (1..1); <code>ShiftReport</code> được tổng hợp vào <code>ShiftDailySummary</code> (*..1).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.6 — Sơ đồ Quan hệ Thực thể Cơ sở Dữ liệu (PostgreSQL Relational ERD)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.6 Data Architecture Models.<br/>
<strong>Loại sơ đồ:</strong> Entity-Relationship Diagram (Crow's Foot Notation ERD).<br/>
<strong>Nội dung thể hiện:</strong> 10 bảng thực thể quan hệ chính trong PostgreSQL: <code>users</code>, <code>departments</code>, <code>rbac_permissions_matrix</code>, <code>user_active_sessions</code>, <code>password_reset_tokens</code>, <code>documents</code>, <code>document_approvals</code>, <code>shift_reports</code>, <code>shift_daily_summaries</code>, <code>audit_logs</code>; các ràng buộc khóa chính (PK), khóa ngoại (FK), chỉ mục (Indexes) trên <code>sha256_hash</code>, <code>jti</code>, <code>created_at</code>, và quy tắc xóa ràng buộc (ON DELETE CASCADE / ON DELETE SET NULL).
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.7 — Sơ đồ Cấu trúc Bản thể học Đồ thị Tri thức (Neo4j Graph Ontology Schema)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.6 Data Architecture Models.<br/>
<strong>Loại sơ đồ:</strong> Knowledge Graph Ontology Schema (Property Graph Model).<br/>
<strong>Các Nhãn Node (Node Labels):</strong><br/>
- <code>:Department</code> (dept_id, name, code)<br/>
- <code>:Employee</code> (emp_id, full_name, email, position)<br/>
- <code>:Document</code> (doc_id, title, sha256, doc_type)<br/>
- <code>:Entity</code> (entity_id, name, entity_type: Product/Vendor/Metric)<br/>
- <code>:Process / :SOP</code> (sop_id, title, category)<br/>
- <code>:RiskEvent</code> (risk_id, risk_type, severity)<br/>
<strong>Các Loại Cạnh (Relationship Types):</strong><br/>
- <code>(:Employee)-[:BELONGS_TO]-&gt;(:Department)</code><br/>
- <code>(:Employee)-[:AUTHORED]-&gt;(:Document)</code><br/>
- <code>(:Document)-[:MENTIONS]-&gt;(:Entity)</code><br/>
- <code>(:Process)-[:GOVERNED_BY]-&gt;(:Department)</code><br/>
- <code>(:RiskEvent)-[:IMPACTS]-&gt;(:Department)</code><br/>
- <code>(:Entity)-[:RELATED_TO {weight: float}]-&gt;(:Entity)</code>
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.8 — Sơ đồ Trạng thái Phê duyệt Tài liệu (Document Approval State Machine Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.7 State Machine Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML State Machine Diagram.<br/>
<strong>Các trạng thái của Tài liệu (Document States):</strong><br/>
1. <em>[Trạng thái Khởi tạo] ➔ UPLOADED:</em> Tệp tải lên thành công, kiểm tra SHA-256 hoàn tất.<br/>
2. <em>PENDING_APPROVAL:</em> Tài liệu nằm trong hàng đợi chờ Knowledge Admin phê duyệt.<br/>
3. <em>REJECTED:</em> Bị từ chối bởi Knowledge Admin (kèm lý do) ➔ Kết thúc.<br/>
4. <em>APPROVED:</em> Được Knowledge Admin chấp thuận ➔ Kích hoạt Celery Task.<br/>
5. <em>PROCESSING_INGESTION:</em> Đang trong pipeline (Chunking ➔ Embedding ➔ Entity Extraction).<br/>
6. <em>INDEXED_READY:</em> Hoàn tất nạp vào Neo4j và Qdrant, sẵn sàng cho AI Copilot tra cứu.
</p>
</div>

<div style="border: 2px solid red; background-color: #fff5f5; padding: 12px; margin: 12px 0; border-radius: 6px;">
<span style="color: red; font-weight: bold; font-size: 1.05em;">[CHÚ THÍCH SƠ ĐỒ: Hình 6.9 — Sơ đồ Trạng thái Biên bản Giao ca (Shift Handover State Machine Diagram)]</span>
<p style="color: #b30000; margin-top: 6px; font-size: 0.93em; line-height: 1.5;">
<strong>Vị trí đặt trong Word:</strong> Mục 6.7 State Machine Diagrams.<br/>
<strong>Loại sơ đồ:</strong> UML State Machine Diagram.<br/>
<strong>Các trạng thái của Biên bản Giao ca (Shift Report States):</strong><br/>
1. <em>[Trạng thái Khởi tạo] ➔ DRAFT:</em> Nhân viên đang soạn thảo nội dung bàn giao, có quyền sửa đổi tùy ý.<br/>
2. <em>SUBMITTED:</em> Nhân viên nhấn nộp, biểu mẫu bị khóa sửa đổi, chuyển vào danh sách duyệt của Quản lý bộ phận.<br/>
3. <em>REJECTED (Revision Requested):</em> Quản lý bộ phận yêu cầu chỉnh sửa kèm nhận xét chỉ đạo ➔ Quay trở lại trạng thái DRAFT cho phép nhân viên sửa đổi.<br/>
4. <em>APPROVED:</em> Quản lý bộ phận ký duyệt điện tử ➔ Khóa vĩnh viễn nội dung ➔ Sẵn sàng cho AI tổng hợp ca ngày.<br/>
5. <em>CONSOLIDATED:</em> Đã được đưa vào Báo cáo Tổng quan Ngày (Daily Shift Summary) của doanh nghiệp.
</p>
</div>

---

## 10. CHUẨN HÓA & ĐỊNH LƯỢNG HÓA YÊU CẦU PHI CHỨC NĂNG (NFRS - BẢNG 8)

Trong SRS Ver 1.1, Bảng 8 (Non-functional Requirements) chỉ gồm 6 dòng mô tả định tính chung chung ("hệ thống phản hồi nhanh", "bảo mật cao", "dễ sử dụng"). Điều này không thể đo lường và kiểm thử được. Cần thay thế toàn bộ Bảng 8 bằng **Bảng Yêu cầu Phi Chức năng Định lượng Chuẩn Hóa** dưới đây:

| Mã NFR | Phân loại | Tiêu chí & Chỉ số Định lượng (Quantifiable Metrics) | Phương pháp & Công cụ Kiểm thử (Verification Method) |
|:---:|---|---|---|
| **NFR-01** | **Hiệu năng & Thời gian Phản hồi (Performance)** | 1. API đọc dữ liệu quan hệ (PostgreSQL/Redis): Độ trễ thời gian phản hồi phân vị 95 ($p95 < 500\text{ms}$) dưới tải 150 Virtual Users (VU).<br/>2. API truy vấn đồ thị phức hợp (Hybrid GraphRAG Copilot): $p95 < 2000\text{ms}$ ($2.0\text{s}$) dưới tải truy vấn đồng thời.<br/>3. Tải trang giao diện Web SPA: First Contentful Paint (FCP) $\le 1.0\text{s}$, Largest Contentful Paint (LCP) $\le 2.0\text{s}$.<br/>4. Tác vụ ngắt khẩn cấp máy trạm AEGIS (Kill Switch): Thời gian từ lúc Admin bấm xác nhận đến khi tiến trình trên trạm máy Windows dừng hoàn toàn $\le 3.0\text{s}$.<br/>5. Mức tiêu thụ tài nguyên AEGIS Agent trên máy trạm: Chiếm dụng CPU $\le 5\%$, RAM $\le 150\text{MB}$. | Sử dụng công cụ **Locust** chạy kịch bản kiểm thử tải phân tán (Distributed Load Testing) 150 VU; Đo kiểm Web bằng Google Lighthouse; Đo thời gian dừng tiến trình bằng Python Test Script. |
| **NFR-02** | **Tính Sẵn sàng & Độ tin cậy (Availability)** | 1. Độ sẵn sàng hệ thống đạt tối thiểu **$\ge 99.5\%$** trong khung giờ vận hành doanh nghiệp (8:00 – 22:00 hàng ngày).<br/>2. Thời gian phục hồi trung bình sau sự cố (MTTR - Mean Time to Recover) $\le 15$ phút nhờ kiến trúc Docker Compose có cơ chế `restart: always` và Docker Health Checks.<br/>3. Cam kết không mất dữ liệu phiên làm việc (Zero Data Loss) trên bảng `user_active_sessions`.<br/>4. Độ tin cậy tính năng tổng hợp ca trực đạt **$100\%$** nhờ cơ chế chuyển đổi tự động sang Fallback cơ học khi dịch vụ LLM Ollama gặp sự cố. | Giám sát Uptime thông qua Docker Container Healthcheck và kịch bản ngắt kết nối giả lập (Chaos Test: kill process Ollama). |
| **NFR-03** | **An ninh & Bảo mật Thông tin (Security)** | 1. Mã hóa dữ liệu lưu trữ (At Rest): Áp dụng mã hóa AES-256 cho phân vùng ổ đĩa và các khóa cấu hình nhạy cảm.<br/>2. Mã hóa dữ liệu truyền tải (In Transit): Bắt buộc giao thức HTTPS và WSS sử dụng chứng chỉ mã hóa TLS 1.3.<br/>3. Bảo vệ mật khẩu: Mật khẩu người dùng được băm bảo mật bằng thuật toán **bcrypt** với Work Factor (Salt Rounds) $\ge 12$.<br/>4. Quản lý phiên làm việc: Token JWT thuật toán HS256, thời hạn sống 15 phút, Refresh Token 7 ngày; áp dụng cơ chế Single Active Session kiểm tra `jti` qua Redis Blacklist.<br/>5. Mã OTP xác thực email: 6 chữ số ngẫu nhiên, hiệu lực 300 giây (5 phút), tự động khóa 15 phút nếu nhập sai quá 5 lần.<br/>6. Phòng chống tấn công phá hoại CSDL đồ thị: Bộ chốt chặn Cypher Guard chặn đứng $100\%$ các câu lệnh Cypher chứa từ khóa ghi/sửa/xóa (`CREATE`, `MERGE`, `DELETE`, `SET`, `DETACH`, `DROP`). | Kiểm tra mã hóa bằng SSL Labs; Quét lỗ hổng an ninh bằng OWASP ZAP; Unit test 50 ca kiểm thử chuỗi truy vấn độc hại với Cypher Guard. |
| **NFR-04** | **Khả năng Mở rộng & Tải trọng (Scalability)** | 1. Cơ sở dữ liệu đồ thị Neo4j: Đảm bảo khả năng lưu trữ và truy vấn mượt mà tối thiểu **100,000 nodes** và **500,000 relationships** mà không suy giảm tốc độ quá $10\%$.<br/>2. Cơ sở dữ liệu vector Qdrant: Lưu trữ và tra cứu tương đồng trên tối thiểu **1,000,000 vector nhúng** (Embedding 768 chiều - nomic-embed-text) với giải thuật HNSW Indexing.<br/>3. Dung lượng lưu trữ tài liệu: Hỗ trợ kho lưu trữ tối thiểu 5,000 tài liệu PDF/DOCX cho một doanh nghiệp SME vừa và nhỏ; dung lượng mỗi tệp đơn lẻ tối đa 50MB. | Kiểm thử chèn dữ liệu quy mô lớn (Bulk Ingestion Benchmark Script) trên cụm dữ liệu giả lập doanh nghiệp. |
| **NFR-05** | **Khả năng Sử dụng & Trải nghiệm (Usability)** | 1. Thiết kế giao diện tuân thủ tiêu chuẩn tương phản màu sắc và khả năng điều hướng bàn phím theo **WCAG 2.1 Level AA**.<br/>2. Giao diện đáp ứng (Responsive Web Design) hiển thị chuẩn mực trên màn hình máy tính để bàn (1920x1080, 1366x768) và máy tính bảng (1024x768).<br/>3. Phòng ngừa sai sót người dùng: $100\%$ các thao tác có tính chất rủi ro cao (Kill Switch, Từ chối tài liệu, Khóa người dùng) bắt buộc phải có hộp thoại cảnh báo xác nhận xác thực danh tính 2 bước. | Đánh giá bởi 5 người dùng thử nghiệm độc lập (System Usability Scale - SUS Score $\ge 80$). |
| **NFR-06** | **Tính Khả chuyển & Triển khai (Portability)** | 1. Toàn bộ nền tảng GraphMind được đóng gói container hóa $100\%$ thông qua tệp cấu hình `docker-compose.yml`, có thể khởi chạy đồng bộ trên môi trường Ubuntu 22.04 LTS hoặc Windows 11 (WSL2).<br/>2. Yêu cầu phần cứng máy chủ suy luận cục bộ: Tối thiểu 16GB RAM hệ thống, card đồ họa NVIDIA GPU với tối thiểu **8GB VRAM** để chạy mô hình ngôn ngữ lượng tử hóa 4-bit (Q4_K_M). | Thực hiện kịch bản cài đặt tự động từ mã nguồn sạch (Clean Deployment Test) trong thời gian $\le 20$ phút. |

---

## 11. BỔ SUNG YÊU CẦU GIAO DIỆN & KIẾN TRÚC DỮ LIỆU HỆ THỐNG

### 11.1. Kiến trúc Cơ sở Dữ liệu Quan hệ (PostgreSQL Database Schema)
Nhóm tác giả cần bổ sung bảng đặc tả cấu trúc 10 bảng thực thể cốt lõi trong cơ sở dữ liệu PostgreSQL vào tài liệu SRS Ver 1.2:

1. **`users`:** `id` (UUID, PK), `username` (VARCHAR, Unique), `email` (VARCHAR, Unique), `password_hash` (VARCHAR), `role_id` (VARCHAR), `department_id` (UUID, FK), `is_active` (BOOLEAN), `created_at` (TIMESTAMP).
2. **`departments`:** `id` (UUID, PK), `name` (VARCHAR), `code` (VARCHAR, Unique), `description` (TEXT), `manager_id` (UUID, FK), `created_at` (TIMESTAMP).
3. **`rbac_permissions_matrix`:** `id` (UUID, PK), `role_id` (VARCHAR), `resource_name` (VARCHAR), `permission_type` (VARCHAR: READ, WRITE, DELETE, APPROVE, EXECUTE), `is_granted` (BOOLEAN), `updated_at` (TIMESTAMP).
4. **`user_active_sessions`:** `id` (UUID, PK), `user_id` (UUID, FK), `jti` (VARCHAR, Unique, Indexed), `ip_address` (VARCHAR), `user_agent` (TEXT), `status` (VARCHAR: ACTIVE, REVOKED), `created_at` (TIMESTAMP), `expires_at` (TIMESTAMP).
5. **`password_reset_tokens`:** `id` (UUID, PK), `email` (VARCHAR), `otp_hash` (VARCHAR), `reset_token` (VARCHAR), `attempts_count` (INT), `is_used` (BOOLEAN), `expires_at` (TIMESTAMP).
6. **`documents`:** `id` (UUID, PK), `title` (VARCHAR), `file_path` (TEXT), `file_size` (BIGINT), `mime_type` (VARCHAR), `sha256_hash` (VARCHAR, Indexed), `status` (VARCHAR: PENDING_APPROVAL, APPROVED, REJECTED), `department_id` (UUID, FK), `uploaded_by` (UUID, FK), `created_at` (TIMESTAMP).
7. **`document_approvals`:** `id` (UUID, PK), `document_id` (UUID, FK, Unique), `action` (VARCHAR: APPROVE, REJECT), `rejection_reason` (TEXT), `approved_by` (UUID, FK), `created_at` (TIMESTAMP).
8. **`shift_reports`:** `id` (UUID, PK), `user_id` (UUID, FK), `department_id` (UUID, FK), `shift_name` (VARCHAR), `report_date` (DATE, Indexed), `completed_tasks` (TEXT), `issues_encountered` (TEXT), `handover_notes` (TEXT), `status` (VARCHAR: DRAFT, SUBMITTED, APPROVED, REJECTED), `signed_by_manager_id` (UUID, FK), `approved_at` (TIMESTAMP).
9. **`shift_daily_summaries`:** `id` (UUID, PK), `department_id` (UUID, FK, Nullable), `summary_date` (DATE, Indexed), `content_markdown` (TEXT), `total_shifts` (INT), `total_issues` (INT), `is_fallback_generated` (BOOLEAN), `created_at` (TIMESTAMP).
10. **`audit_logs`:** `id` (UUID, PK), `user_id` (UUID, FK, Nullable), `event_type` (VARCHAR), `resource_affected` (VARCHAR), `ip_address` (VARCHAR), `severity_level` (VARCHAR: INFO, WARN, CRITICAL), `details_json` (JSONB), `created_at` (TIMESTAMP, Indexed).

### 11.2. Kiến trúc Đồ thị Tri thức (Neo4j Knowledge Graph Schema)
- **Node Labels:** `:Department`, `:Employee`, `:Document`, `:Entity`, `:SOP`, `:RiskEvent`.
- **Relationship Types:** 
  - `(:Employee)-[:BELONGS_TO]->(:Department)`
  - `(:Employee)-[:AUTHORED]->(:Document)`
  - `(:Document)-[:MENTIONS]->(:Entity)`
  - `(:SOP)-[:GOVERNED_BY]->(:Department)`
  - `(:RiskEvent)-[:IMPACTS]->(:Department)`
  - `(:Entity)-[:RELATED_TO {weight: float}]->(:Entity)`

### 11.3. Kiến trúc Cơ sở Dữ liệu Vector (Qdrant Vector DB)
- **Collection Name:** `graphmind_chunks`
- **Vector Dimension:** `768` (tương thích mô hình nhúng `nomic-embed-text` hoặc `bge-base`).
- **Distance Metric:** `Cosine Similarity`.
- **Payload Schema:** `chunk_id` (UUID), `document_id` (UUID), `chunk_index` (INT), `chunk_text` (TEXT), `department_id` (UUID), `created_at` (TIMESTAMP).

---

## 12. MA TRẬN TRUY VẾT TOÀN DIỆN 5 CHIỀU MỚI (FULL 5-WAY RTM - BẢNG 34 MỚI)

Trong SRS Ver 1.1, Bảng 34 (Requirement Traceability Matrix) chỉ có vỏn vẹn 18 dòng, để trống hoàn toàn cột Test Case và Status, gây mất điểm Traceability nghiêm trọng.

Nhóm tác giả cần thay thế toàn bộ Bảng 34 bằng **Ma trận Truy vết 5 Chiều Hoàn chỉnh (79 Hàng)** ánh xạ xuyên suốt từ **Proposal Mục 4.1 ➔ User Story (US01–US69) ➔ Product Backlog (PB01–PB79) ➔ SRS (FR01–FR62) ➔ Project Plan (WBS-01–WBS-40)**.

> *Lưu ý:* Bảng ma trận chi tiết đầy đủ 79 dòng đã được biên soạn sẵn tại tệp: [`docs/05-srs/GraphMind-SRS-Traceability-Matrix.md`](./GraphMind-SRS-Traceability-Matrix.md). Dưới đây là bảng tổng hợp ánh xạ 6 phân hệ cốt lõi để đưa vào Phụ lục B của tài liệu Word:

| Phân hệ Nghiệp vụ Cốt lõi | Mục Proposal Ver 1.2 | Dải User Story (US) | Dải Product Backlog (PB) | Dải SRS FRs (Ver 1.2) | Gói Công việc Project Plan (WBS) |
|---|:---:|:---:|:---:|:---:|:---:|
| **1. Quản trị Hệ thống, Tài khoản & An ninh** | §4.1.1 (FR1) | US01 – US05, **US65, US66, US67** | PB01 – PB05, **PB72, PB73, PB74** | FR01 – FR05, **FR58, FR59, FR60** | WBS-07 (Security & RBAC), WBS-08 (Auth) |
| **2. Kết nối Dữ liệu, Trạm máy & Phê duyệt** | §4.1.2 (FR2) | US06 – US11, **US60, US61, US69** | PB06 – PB11, **PB67, PB68, PB76** | FR06 – FR11, **FR53, FR54, FR62** | WBS-09 (Cloud Connectors), WBS-10 (AEGIS Agent), WBS-13 (Approval) |
| **3. Tiền xử lý, Quản trị Tri thức & Đồ thị** | §4.1.3 (FR3) | US12 – US17, **US68** | PB12 – PB17, **PB75** | FR12 – FR17, **FR61** | WBS-11 (ETL Pipeline), WBS-12 (Neo4j Graph Ops), WBS-15 (Cypher Guard) |
| **4. AI Copilot & Hybrid GraphRAG** | §4.1.4 (FR4) | US18 – US23, US35 – US39 | PB18 – PB23, PB37 – PB41 | FR18 – FR23, FR35 – FR39 | WBS-16 (Vector Engine), WBS-17 (Graph Traversal), WBS-18 (Reranker) |
| **5. Bàn giao Ca trực & Tổng hợp AI Ngày** | §4.1.5 (FR5) | **US62, US63, US64** | **PB69, PB70, PB71** | **FR55, FR56, FR57** | WBS-14 (Shift Handover & Consolidation Engine) |
| **6. Phân tích Điều hành & Trung tâm Rủi ro** | §4.1.6 (FR6) | US24 – US34, US40 – US59 | PB24 – PB36, PB42 – PB66 | FR24 – FR34, FR40 – FR52 | WBS-19 (Executive Dashboard), WBS-20 (Risk Center), WBS-21 (Search) |
| **7. Đảm bảo Chất lượng & Kiểm thử (QA)** | §5.3, §6.2 | QA Standards | **PB77, PB78, PB79** | Verification Methods | WBS-31 (Unit/Integration), WBS-32 (E2E), WBS-33 (Performance) |

---

## 13. CHECKLIST NGHIỆM THU CẬP NHẬT TÀI LIỆU WORD (C1SE18_SRS_GRAPHMIND_VER1.2.DOCX)

Sau khi nhóm tác giả hoàn tất chỉnh sửa trên file Microsoft Word `C1SE18_SRS_GraphMind_Ver1.2.docx`, hãy rà soát từng tiêu chí nghiệm thu dưới đây trước khi xuất bản bản nộp chính thức:

### 13.1. Phase 1: Tiêu chí Phạm vi & Yêu cầu Chức năng (CRITICAL)
- [ ] Đã bổ sung đầy đủ 10 yêu cầu chức năng mới từ **FR53 đến FR62** vào Mục Yêu cầu Chức năng.
- [ ] Đã bổ sung đầy đủ 5 bảng đặc tả Use Case mới từ **UC.23 đến UC.27** có đầy đủ Luồng chính (Main Flow) và Luồng ngoại lệ (Exception Flows).
- [ ] Đã loại bỏ hoàn toàn tính năng xuất tệp PDF/Word khỏi **FR44** (đưa về chuẩn Web Interactive Report).
- [ ] Đã sáp nhập thành công hai Chương `2. Overall Description` và `3. Overall Description` thành một chương duy nhất, loại bỏ lỗi trùng lặp mã mục `3.2`.

### 13.2. Phase 2: Tiêu chí An ninh & Quy tắc Nghiệp vụ (HIGH)
- [ ] Đã tách vai trò gộp `System & Knowledge Administrator (Admin)` thành 2 Actor độc lập: **System & IT Administrator** và **Knowledge Administrator** theo đúng Business Rule **BR-04**.
- [ ] Đã điền đầy đủ $100\%$ Luồng ngoại lệ (Exception Flows) cho toàn bộ 22 Use Cases cũ từ **UC.01 đến UC.22** (Bảng 10 đến Bảng 31).
- [ ] Đã thay thế Bảng 8 (NFRs) bằng bảng chỉ số định lượng có kiểm thử tải Locust ($p95 < 500\text{ms}$ read, $< 2000\text{ms}$ complex query under 150 VU).

### 13.3. Phase 3: Tiêu chí Đồng bộ Số liệu Kỹ thuật (MEDIUM)
- [ ] Đã sửa số lượng cặp câu hỏi fine-tuning trong **FR28 / FR37** thành **509 ChatML pairs**.
- [ ] Đã sửa công nghệ giao diện trong **FR34** thành **React 18 + Vite (SPA) và Tailwind CSS**.
- [ ] Đã sửa số lượng câu hỏi đánh giá benchmark trong **FR47** thành **100 Ground-Truth Questions**.
- [ ] Đã bổ sung 2 quy tắc phát hiện rủi ro tài chính đặc thù trong **FR20 / FR42**: Đơn hàng lỗ biên lợi nhuận (*Negative Margin*) và Chiết khấu bất thường (*Abnormal Discount >= 35%*).

### 13.4. Phase 4: Tiêu chí Sơ đồ, Ma trận Truy vết & Định dạng (LOW)
- [ ] **Tiêu chí Sơ đồ:** Xác nhận toàn bộ các vị trí sơ đồ trong tài liệu đã có đầy đủ **CHÚ THÍCH SƠ ĐỒ BÔI ĐỎ** (System Context, BFD, 5 Use Case Diagrams, 27 Activity Diagrams, 27 Sequence Diagrams, Class Diagram, ERD, Graph Ontology Schema, State Machine Diagrams).
- [ ] Đã thay thế Bảng 34 cũ bằng **Ma trận Truy vết Toàn diện 5 Chiều 79 dòng** hoàn chỉnh.
- [ ] Đã cập nhật Bìa tài liệu, Metadata phiên bản thành **Ver 1.2**, ngày **14/11/2026**, và thêm dòng Lịch sử sửa đổi Version 1.2 vào Bảng 2.
- [ ] Đã cập nhật Bảng Thuật ngữ (Glossary) với đầy đủ các từ viết tắt mới (AEGIS, ChatML, Cypher Guard, JTI, Locust, Qdrant, SOP, TOTP).

---
*Tài liệu này được xác lập bởi Senior Business Analyst & Software Requirements Engineer làm căn cứ quy chuẩn để ban hành chính thức tài liệu SRS Version 1.2 của dự án GraphMind.*
