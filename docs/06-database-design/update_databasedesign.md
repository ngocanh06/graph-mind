# HƯỚNG DẪN CẬP NHẬT TÀI LIỆU DATABASE DESIGN DOCUMENT (VER 1.0 ➔ VER 1.1)
## ĐỐI CHIẾU THEO SOURCE CODE THỰC TẾ, SRS VER 1.2, ARCHITECTURE DOC VER 1.0 VÀ PROPOSAL VER 1.2

> **Dự án:** GraphMind — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support  
> **Mã đề tài:** Capstone Project 1 — C1SE.18 — Đại học Duy Tân (Duy Tan University)  
> **Tài liệu gốc cần chỉnh sửa:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.0.docx`  
> **Tài liệu ban hành dự kiến:** `C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`  
> **Căn cứ đối chiếu:**  
> 1. Báo cáo kiểm toán: `docs/06-database-design/GraphMind-DatabaseDesign-Audit-Report.md` & `GraphMind-DatabaseDesign-Issue-List.md`  
> 2. `docs/05-srs/C1SE18-SRS-Document-Ver1.2.docx` (62 FRs, 27 Use Cases, BR-01–BR-06)  
> 3. `7.C1SE18_Architecture-Document-ver1.0.docx`  
> 4. `docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx`, User Story Ver 1.2 (US01–US69), Product Backlog Ver 1.2 (PB01–PB79), Project Plan Ver 1.2  
> 5. Toàn bộ mã nguồn thực tế (`backend/app/db/`, `backend/alembic/`, `backend/app/modules/`, `scripts/`, `docker-compose.yml`).

---

## MỤC LỤC
1. [Cập nhật Thông tin Đầu trang, Metadata, Assumptions & References](#1-cập-nhật-thông-tin-đầu-trang-metadata-assumptions--references)
2. [Hiệu chỉnh Section 2: System Overview & Phân tách Vai trò BR-04](#2-hiệu-chỉnh-section-2-system-overview--phân-tách-vai-trò-br-04)
3. [Tái cấu trúc Section 3.1: Đặc tả Vật lý 13 Bảng PostgreSQL Đang Vận hành (Implemented MVP)](#3-tái-cấu-trúc-section-31-đặc-tả-vật-lý-13-bảng-postgresql-đang-vận-hành-implemented-mvp)
4. [Bổ sung Section 3.1.X: Planned Extension Tables, Indexing Strategy & Normalization Justification](#4-bổ-sung-section-31x-planned-extension-tables-indexing-strategy--normalization-justification)
5. [Hiệu chỉnh Section 3.2: Neo4j Knowledge Graph Model](#5-hiệu-chỉnh-section-32-neo4j-knowledge-graph-model)
6. [Hiệu chỉnh Section 3.3: Qdrant Vector Model](#6-hiệu-chỉnh-section-33-qdrant-vector-model)
7. [Bổ sung Section 5.8: Database Security, Integrity & Migration Governance](#7-bổ-sung-section-58-database-security-integrity--migration-governance)
8. [Cập nhật Section 6: Relationships, Cascade Rules & Chú thích Sơ đồ ERD](#8-cập-nhật-section-6-relationships-cascade-rules--chú-thích-sơ-đồ-erd)
9. [Checklist Nghiệm thu Xuất bản Ver 1.1](#9-checklist-nghiệm-thu-xuất-bản-ver-11)

---

## 1. CẬP NHẬT THÔNG TIN ĐẦU TRANG, METADATA, ASSUMPTIONS & REFERENCES

### 1.1. Bìa & Bảng Metadata (Table 1)
- **Version:** Đổi `1.0` thành **`1.1`**.
- **Date:** Cập nhật từ `25 September 2026` thành ngày ban hành thực tế (ví dụ: **`22 November 2026`**).
- **File name:** Đổi `C1SE18_DatabaseDesign_GraphMind_Ver1.0.docx` thành **`C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`**.
- **Bổ sung bảng Document Revision History** ngay sau Table 2:

| Version | Date | Author(s) | Description of Change |
|:---:|:---:|---|---|
| 1.0 | 25 Sep 2026 | Tran Thi Ngoc Anh | Initial multi-model database design (27 planned PostgreSQL tables, 11 Neo4j labels, 3 Qdrant collections) based on Proposal Ver 1.1. |
| **1.1** | 22 Nov 2026 | C1SE18 Project Team | Synchronized with actual Source Code and SRS Ver 1.2: separated 13 Implemented MVP PostgreSQL tables from Planned extensions; added `knowledge_upload_approvals`, `shift_reports`, `user_active_sessions`, `knowledge_access_policies`, `pb56_sync_mode_audit_logs`; completed all FK/PK/Cascade constraints; updated Role Mapping to BR-04 (5 roles); removed Out-of-Scope PDF/DOCX export; aligned Neo4j labels/relationships and Qdrant 384-dim collections; added PostgreSQL Indexing Strategy and Database Security sections. |

### 1.2. Cập nhật Table 1 (Design Assumptions — §1.2)
Gỡ bỏ toàn bộ nhãn `[TO BE VERIFIED]` sau khi đã đối chiếu trực tiếp với Source Code:

| # | Assumption (Ver 1.0) | Kết quả Xác minh từ Source Code & SRS Ver 1.2 (Cập nhật vào Ver 1.1) |
|:---:|---|---|
| **A1** | Cấu trúc `users` và `otps` chưa được cung cấp. | **Đã xác minh:** Bảng thực tế là `users` (PK `user_id`, cột `role` đơn trị) và `password_reset_otps` (`otp_hash VARCHAR(64)`). Đã đồng bộ hoàn toàn vào §3.1.2. |
| **A2** | Khóa cứng 4 vai trò gộp `ADMIN (System & Knowledge Administrator)`. | **Cập nhật theo SRS Ver 1.2 BR-04:** Tách thành **5 vai trò chuẩn**: `System & IT Administrator`, `Knowledge Administrator`, `Executive`, `Department Manager`, `Standard User`. |
| **A3** | Self-hosted `Qwen2.5-7B-Instruct` (zero marginal cost). | **Đã xác minh:** Chạy cục bộ qua Ollama (`MODEL_NAME=qwen2.5-7b-graphmind`, `Q4_K_M`, cổng `11434`). |
| **A4** | Embedding model 384 chiều (`all-MiniLM-L6-v2`). | **Đã xác minh khớp Source Code:** `SentenceTransformer("all-MiniLM-L6-v2")` — **384 dimensions, Cosine** (`backend/app/db/qdrant/client.py:36, 134`). *(Ghi chú: Cần đồng bộ lại SAD Ver 1.0 & SRS Ver 1.2 đang ghi 768-dim `nomic-embed-text`).* |
| **A5** | File gốc lưu ở thư mục nội bộ / object storage, DB lưu đường dẫn. | **Đã xác minh:** Lưu tại volume cục bộ `D:/data:/data` (`CENTRAL_STORAGE_DIR=/data`) và thư mục tạm chờ duyệt `.pending_uploads`. |

### 1.3. Cập nhật §1.4 References
- Thay `C1SE18-Proposal-Document-Ver1.1` thành **`C1SE18-Proposal-Document-Ver1.2`** (08/11/2026).
- Bổ sung tham chiếu tường minh: **`C1SE18_SRS_GraphMind_Ver1.2.docx`**, **`C1SE18_UserStory_GraphMind-Ver1.2.docx`** (US01–US69), **`C1SE18_ProductBacklog_GraphMind_Ver1.2.docx`** (PB01–PB79), và **`7.C1SE18_Architecture-Document-ver1.0.docx`**.

---

## 2. HIỆU CHỈNH SECTION 2: SYSTEM OVERVIEW & PHÂN TÁCH VAI TRÒ BR-04

### 2.1. Sửa Table 4 (Layered Storage Architecture — §2.2)
```diff
- Client layer | Web Dashboard (React / Next.js); AEGIS Local Agent (File Watcher)
+ Client layer | Web Dashboard (React 18 + Vite SPA, Tailwind CSS); AEGIS Local Agent (File Watcher Daemon)

- Storage layer | PostgreSQL (Metadata · RBAC · Logs); Neo4j (Knowledge Graph); Qdrant (Vector Index); Object Storage
+ Storage layer | PostgreSQL 15+ (Host native, DB: graph_mind — Operational SoR); Neo4j 5.18.0 (Docker — Knowledge Graph); Qdrant v1.8.2 (Docker — Vector Index); Local Shared Volume (/data)
```

### 2.2. Sửa Table 5 (Mapping of Business Functions to Storage Objects — §2.3)
- Tách vai trò gộp `Admin (System & Knowledge Administrator)` thành **System & IT Administrator** (`it_admin`) và **Knowledge Administrator** (`knowledge_manager`) theo **BR-04**.
- **Điền 3 ô bị bỏ trống** trong bản Ver 1.0 và bổ sung 3 chức năng mới (FR53–FR62):
  - **R7 (Knowledge Administrator — Human-in-the-loop Knowledge Editor):** Điền `Neo4j (:Document, :Clause, :Company, :Customer, :Product); entity_extraction_reviews [Planned]`.
  - **R8 (Knowledge Administrator — SOP & Internal Knowledge Base):** Điền `sop_documents`.
  - **R14 (Standard User — Citation Viewer & Graph Visualizer):** Điền `copilot_sessions (messages JSON), Qdrant (cuad_contracts), Neo4j (:Document, :Clause)`.
  - **Bổ sung hàng mới:**
    - `System & IT Administrator | Granular RBAC 2D Matrix & Single Active Session | knowledge_access_policies, user_active_sessions, audit_logs`
    - `System & IT Administrator | AEGIS Fleet Control & Emergency Kill Switch | pb56_workstations, pb56_workstation_sync_logs, pb56_sync_mode_audit_logs`
    - `Knowledge Administrator | Internal Document Upload Approval Queue | knowledge_upload_approvals, Neo4j (:Document), Qdrant (cuad_contracts)`
    - `Department Manager / Standard User | Shift Handover Reports & Daily Consolidation | shift_reports, shift_daily_summaries [Planned]`

### 2.3. Sửa Table 6 (Storage Entities by Subsystem — §2.4)
Cập nhật phản ánh chính xác **13 bảng PostgreSQL đang chạy**, **10 nhãn Neo4j** và **2 collection Qdrant thực tế**:

| Subsystem | PostgreSQL Tables (Implemented MVP — 13 Tables) | Neo4j Labels (Implemented) | Qdrant Collections (Implemented) |
|---|---|---|---|
| **Core, Auth & RBAC** | `users`, `password_reset_otps`, `user_active_sessions`, `knowledge_access_policies`, `knowledge_permissions` *(legacy)*, `audit_logs` | `:Department`, `:Employee` | — |
| **AEGIS Sync & Upload Approval** | `pb56_workstations`, `pb56_workstation_sync_logs`, `pb56_sync_mode_audit_logs`, `knowledge_upload_approvals` | `:Document` | `cuad_contracts` |
| **SOP Wiki & Business Knowledge** | `sop_documents` | `:Customer`, `:Product`, `:Category`, `:SubCategory`, `:SalesOrder`, `:Document`, `:Clause`, `:Company` | `cuad_contracts`, `adventureworks_entities` |
| **AI Copilot & Shift Reports** | `copilot_sessions`, `shift_reports` | — | — |
| **Planned Extensions (Future Phase)** | `departments`, `roles`, `permissions`, `role_permissions`, `user_roles`, `data_connectors`, `agent_watched_folders`, `sync_jobs`, `sync_audit_logs`, `raw_documents`, `sop_article_versions`, `entity_extraction_reviews`, `knowledge_gaps`, `chat_messages`, `message_citations`, `user_feedback`, `llm_cost_usage_logs`, `system_alerts`, `alert_recipients`, `executive_briefings`, `shift_daily_summaries` | `:SOP_Document`, `:Vendor` | `sop_knowledge_base` |

---

## 3. TÁI CẤU TRÚC SECTION 3.1: ĐẶC TẢ VẬT LÝ 13 BẢNG POSTGRESQL ĐANG VẬN HÀNH (IMPLEMENTED MVP)

### 3.1. Sửa Table 7 (PostgreSQL Design Conventions — §3.1.1)
- **Điền ô trống R9 (`Deletion`):** `Soft delete (deleted_at TIMESTAMPTZ) is applied to users to preserve audit trail references; child operational logs use ON DELETE CASCADE; business records authored by users (sop_documents, shift_reports, knowledge_upload_approvals) use ON DELETE SET NULL.`
- **Sửa R3 (`Primary key`):** Ghi rõ `UUID PRIMARY KEY DEFAULT gen_random_uuid()` cho 12 bảng; riêng `pb56_workstations.id` dùng `VARCHAR(64)` (Workstation/Agent ID).
- **Sửa R7 (`Semi-structured data`):** Ghi rõ thực tế hiện dùng `JSON` cho `copilot_sessions.messages`, `shift_reports.cases`, `sop_documents.steps/tags` và `JSONB` cho `pb56_workstation_sync_logs.details` (khuyến nghị thống nhất `JSONB`).

### 3.2. Đặc tả Chi tiết 13 Bảng PostgreSQL Đang Vận hành (Thay thế Tables 8–35 cũ)
*(Mọi ô `Key / Constraint` đều đã điền đầy đủ PK, FK, Cascade Rules, UNIQUE, CHECK — khắc phục triệt để lỗi trống cột FK của Ver 1.0).*

#### Bảng 1: `users` (`backend/app/db/postgres/models/user.py`)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `user_id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh duy nhất tài khoản (ORM có synonym `id`). |
| `email` | `VARCHAR(255)` | `UNIQUE, NOT NULL` | Email đăng nhập *(Code hiện tại `VARCHAR(150)`, khuyến nghị nâng lên `255` khớp Alembic & RFC 5321)*. |
| `username` | `VARCHAR(100)` | `UNIQUE, NULL` | Tên đăng nhập ngắn gọn. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Chuỗi băm `bcrypt` (cost 12); không bao giờ lưu plain-text. |
| `full_name` | `VARCHAR(150)` | `NULL` | Họ và tên hiển thị. |
| `role` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'standard_user', CHECK IN ('it_admin','knowledge_manager','executive','department_manager','standard_user')` | Vai trò người dùng theo BR-04 *(Code hiện chưa có `CHECK`, cần bổ sung)*. |
| `department_id` | `UUID` | `NULL` | Mã phòng ban *(Hiện chưa có bảng `departments` để gắn FK; phòng ban quản lý tại `core/departments.py`)*. |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'active', CHECK IN ('active','locked','disabled')` | Trạng thái tài khoản. |
| `is_active` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Cờ kích hoạt đồng bộ với `status` (`CHECK ((status = 'active') = is_active)`). |
| `is_superuser` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Cờ siêu quản trị. |
| `failed_login_attempts` | `INT` | `NOT NULL, DEFAULT 0` | *[Đề xuất bổ sung vào Code cho UC.01 E1]* Số lần nhập sai mật khẩu liên tiếp. |
| `locked_until` | `TIMESTAMPTZ` | `NULL` | *[Đề xuất bổ sung vào Code cho UC.01 E1]* Thời điểm hết khóa tạm thời (15 phút). |
| `last_login_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm đăng nhập gần nhất. |
| `last_active_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm hoạt động API gần nhất. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm tạo tài khoản. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật gần nhất. |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Dấu xóa mềm (soft delete). |

#### Bảng 2: `password_reset_otps` (`backend/app/db/postgres/models/otp.py` — Thay `otps`)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh bản ghi OTP. |
| `email` | `VARCHAR(150)` | `NOT NULL, INDEX` | Email nhận mã OTP (cố ý không dùng FK để vẫn kiểm tra được an toàn khi tài khoản chưa tồn tại/bị xóa). |
| `otp_hash` | `VARCHAR(64)` | `NOT NULL` | Chuỗi hash của mã OTP 6 chữ số *(Code hiện dùng SHA-256; khuyến nghị nâng cấp sang HMAC-SHA256 hoặc bcrypt `VARCHAR(255)`)*. |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Thời điểm hết hạn (300 giây / 5 phút kể từ lúc cấp — FR60). |
| `attempt_count` | `INT` | `NOT NULL, DEFAULT 0` | Số lần nhập sai (vô hiệu hóa sau 3 lần sai theo SRS FR60). |
| `is_used` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Cờ đánh dấu mã đã được sử dụng một lần. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cấp mã OTP. |

#### Bảng 3: `user_active_sessions` (`backend/app/modules/m6_admin_security/session_service.py` — Bảng mới cho FR59)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `user_id` | `UUID` | `PK, FK REFERENCES users(user_id) ON DELETE CASCADE` | Định danh người dùng; đặt làm PK để ép cứng tối đa 1 phiên đang hoạt động/tài khoản *(Cần bổ sung FK vào SQL tạo bảng)*. |
| `active_session_token_id` | `VARCHAR(100)` | `NOT NULL, INDEX` | Mã `jti` (JWT ID) của phiên hợp lệ duy nhất hiện tại; phiên cũ khác `jti` bị đá bằng HTTP 401 `CONCURRENT_LOGIN_KICKED`. |
| `ip_address` | `VARCHAR(100)` | `NULL` | Địa chỉ IP thiết bị đăng nhập. |
| `user_agent` | `TEXT` | `NULL` | Thông tin trình duyệt/thiết bị. |
| `logged_in_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm thiết lập phiên. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm ghi đè phiên gần nhất. |

#### Bảng 4: `knowledge_access_policies` (`backend/app/modules/m6_admin_security/rbac_matrix_model.py` — Thay `knowledge_scope_policies`, FR58)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh ô phân quyền. |
| `role_code` | `VARCHAR(50)` | `NOT NULL, UNIQUE(role_code, department_code, resource_type)` | Mã vai trò (`ADMIN`, `EXECUTIVE`, `DEPARTMENT_MANAGER`, `STANDARD_USER` — đồng bộ BR-04). |
| `department_code` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'ALL', UNIQUE(...)` | Mã phòng ban (`LEGAL`, `SALES`, `ACCOUNTING_PROCUREMENT`, `IT`, `RND`, `ALL`). |
| `resource_type` | `VARCHAR(50)` | `NOT NULL, UNIQUE(...)` | Miền tri thức/phòng ban được kiểm soát. |
| `can_query` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Quyền hỏi đáp AI Copilot, tìm kiếm và xem đồ thị. |
| `can_view_citation` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Quyền xem trích dẫn nguồn gốc. |
| `can_edit` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Quyền biên tập/xuất bản tri thức. |
| `can_upload` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Quyền tải lên tài liệu vào hàng đợi phê duyệt. |
| `can_view_sensitive` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Quyền xem điều khoản hợp đồng/dữ liệu nhạy cảm. |
| `data_scope` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'NONE', CHECK IN ('ALL_DEPARTMENTS','OWN_DEPARTMENT','NONE')` | Phạm vi cô lập dữ liệu (BR-02, BR-05). |
| `updated_by` | `UUID` | `NULL, FK REFERENCES users(user_id) ON DELETE SET NULL` | Quản trị viên cập nhật gần nhất *(Cần bổ sung FK vào Code)*. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật ma trận. |

#### Bảng 5: `knowledge_permissions` (`backend/app/db/postgres/models/knowledge_permission.py` — Legacy / Ghi chú hợp nhất)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh bản ghi. |
| `domain` | `VARCHAR(80)` | `NOT NULL, UNIQUE(domain, role)` | Miền tri thức. |
| `role` | `VARCHAR(50)` | `NOT NULL, UNIQUE(domain, role)` | Mã vai trò. |
| `allowed` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Cờ cho phép truy cập. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật. |

*(Ghi chú tài liệu: Bảng này là mô hình phân quyền rút gọn cũ tồn tại song song với `knowledge_access_policies`; dự kiến hợp nhất hoàn toàn vào `knowledge_access_policies` ở đợt tinh gọn kế tiếp).*

#### Bảng 6: `audit_logs` (`backend/app/db/postgres/models/audit_log.py` — Thay `system_audit_trails`, BR-03)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `audit_id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh bản ghi kiểm toán bất biến (BR-03). |
| `actor_id` | `UUID` | `NULL, INDEX, FK REFERENCES users(user_id) ON DELETE SET NULL` | Người thực hiện thao tác *(Cần bổ sung FK vào Code)*. |
| `action` | `VARCHAR(100)` | `NOT NULL, INDEX` | Mã hành động (`USER_CREATE`, `ROLE_CHANGE`, `LOGIN`, `LOGIN_FAIL`, `PASSWORD_RESET`, `LOGIN_NEW_DEVICE_REPLACED_OLD_SESSION`, v.v.). |
| `resource_type` | `VARCHAR(50)` | `NULL` | Loại đối tượng bị tác động (`user`, `document`, `rbac_matrix`, `workstation`). |
| `resource_id` | `VARCHAR(150)` | `NULL` | Định danh đối tượng bị tác động. |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'OK', CHECK IN ('OK','DENIED','ERROR')` | Kết quả thực thi. |
| `detail` | `VARCHAR(500)` | `NULL` | Mô tả chi tiết sự kiện (đã che thông tin nhạy cảm). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now(), INDEX` | Thời điểm phát sinh sự kiện (UTC). |

#### Bảng 7: `knowledge_upload_approvals` (`backend/app/modules/m6_admin_security/document_approval_model.py` — Bảng mới cho FR53–FR54)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh yêu cầu phê duyệt tải tài liệu. |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | Tên tệp gốc. |
| `file_type` | `VARCHAR(50)` | `NOT NULL` | Định dạng tệp (`PDF`, `CSV`, `DOCX`, `XLSX`, `TXT`). |
| `file_size` | `INTEGER` | `NOT NULL, DEFAULT 0` | Kích thước tệp tính theo bytes (khuyến nghị `BIGINT`). |
| `file_path` | `VARCHAR(500)` | `NOT NULL` | Đường dẫn lưu tạm tại vùng staging `.pending_uploads`. |
| `sha256_hash` | `CHAR(64)` | `NULL, INDEX` | *[Đề xuất bổ sung vào Code cho BR-06]* Mã băm SHA-256 chống tải trùng lặp ngay tại hàng đợi duyệt. |
| `resource_type` | `VARCHAR(50)` | `NOT NULL, INDEX` | Phân loại miền tài nguyên. |
| `department_code` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'SALES', INDEX` | Mã phòng ban sở hữu tài liệu. |
| `uploaded_by_id` | `UUID` | `NULL, FK REFERENCES users(user_id) ON DELETE SET NULL` | Định danh người tải lên *(Cần bổ sung FK vào Code)*. |
| `uploaded_by_email` | `VARCHAR(255)` | `NOT NULL` | Snapshot email người tải lên. |
| `uploaded_by_role` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'STANDARD_USER'` | Snapshot vai trò người tải lên. |
| `action_type` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'UPLOAD_NEW', CHECK IN ('UPLOAD_NEW','UPDATE_EXISTING')` | Loại thao tác tải lên. |
| `status` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'PENDING', INDEX, CHECK IN ('PENDING','APPROVED','REJECTED')` | Trạng thái kiểm duyệt. |
| `reviewed_by` | `VARCHAR(255)` | `NULL` | Email/tên Knowledge Administrator duyệt tài liệu. |
| `review_note` | `VARCHAR(1000)` | `NULL` | Ghi chú hoặc lý do từ chối bắt buộc. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm gửi yêu cầu. |
| `reviewed_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm hoàn tất duyệt/từ chối. |

#### Bảng 8: `pb56_workstations` (`backend/app/modules/m1_data_sync/pb56_workstation_model.py` — Thay `aegis_local_agents`, FR07/FR62)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `VARCHAR(64)` | `PK` | Định danh máy trạm / AEGIS Agent ID. |
| `hostname` | `VARCHAR(255)` | `NOT NULL` | Tên máy tính trạm. |
| `ip_address` | `VARCHAR(64)` | `NOT NULL` | Địa chỉ IP nội bộ của máy trạm. |
| `os_info` | `VARCHAR(128)` | `NOT NULL` | Hệ điều hành (Windows 11, Ubuntu, v.v.). |
| `monitored_folder` | `VARCHAR(512)` | `NOT NULL` | Thư mục cục bộ đang theo dõi. |
| `agent_token_hash` | `VARCHAR(128)` | `NOT NULL` | Mã băm khóa xác thực của Agent. |
| `sync_mode` | `VARCHAR(32)` | `NOT NULL, DEFAULT 'realtime', CHECK IN ('realtime','scheduled')` | Chế độ đồng bộ đang áp dụng. |
| `schedule_type` | `VARCHAR(32)` | `NULL` | Chu kỳ lập lịch (`15m`, `1h`, `end_of_shift`). |
| `shift_end_time` | `VARCHAR(8)` | `NULL` | Giờ kết thúc ca (`HH:MM`). |
| `timezone` | `VARCHAR(64)` | `NOT NULL, DEFAULT 'Asia/Ho_Chi_Minh'` | Múi giờ của máy trạm. |
| `target_sync_mode` | `VARCHAR(32)` | `NULL` | Chế độ đồng bộ mục tiêu đang chờ đẩy xuống Agent. |
| `target_schedule_type` | `VARCHAR(32)` | `NULL` | Chu kỳ mục tiêu chờ áp dụng. |
| `target_shift_end_time` | `VARCHAR(8)` | `NULL` | Giờ hết ca mục tiêu. |
| `sync_mode_status` | `VARCHAR(32)` | `NOT NULL, DEFAULT 'applied', INDEX, CHECK IN ('applied','pending','pending_offline')` | Trạng thái đồng bộ cấu hình/lệnh (2-phase ACK). |
| `heartbeat_interval_sec` | `INTEGER` | `NOT NULL, DEFAULT 30` | Chu kỳ nhịp tim Heartbeat (30 giây — đồng bộ SRS UC.07). |
| `heartbeat_threshold_cycles` | `INTEGER` | `NOT NULL, DEFAULT 3` | Số chu kỳ mất nhịp tim trước khi đánh dấu `OFFLINE` (90 giây). |
| `last_heartbeat_at` | `TIMESTAMPTZ` | `NULL, INDEX` | Thời điểm nhận Heartbeat gần nhất. |
| `files_ingested_total` | `BIGINT` | `NOT NULL, DEFAULT 0` | Tổng số tệp đã đồng bộ lũy kế. |
| `records_extracted_total` | `BIGINT` | `NOT NULL, DEFAULT 0` | Tổng số bản ghi/chunk đã trích xuất. |
| `checksum_errors_total` | `BIGINT` | `NOT NULL, DEFAULT 0` | Tổng số lỗi checksum phát hiện. |
| `is_demo` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE` | Cờ máy trạm mô phỏng demo. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm đăng ký máy trạm. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật gần nhất. |

#### Bảng 9: `pb56_workstation_sync_logs` (`pb56_workstation_model.py:76` — Thay `sync_jobs` / `sync_audit_logs`)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh bản ghi đồng bộ. |
| `workstation_id` | `VARCHAR(64)` | `NOT NULL, FK REFERENCES pb56_workstations(id) ON DELETE CASCADE, UNIQUE(workstation_id, report_id)` | Máy trạm gửi báo cáo đồng bộ. |
| `report_id` | `UUID` | `NOT NULL, UNIQUE(workstation_id, report_id)` | Mã phiên báo cáo chống cộng lặp thống kê (Idempotency). |
| `sync_mode_used` | `VARCHAR(32)` | `NOT NULL, DEFAULT 'realtime'` | Chế độ đồng bộ sử dụng trong lượt chạy. |
| `files_ingested` | `INTEGER` | `NOT NULL, DEFAULT 0` | Số tệp nạp thành công trong lượt. |
| `records_extracted` | `INTEGER` | `NOT NULL, DEFAULT 0` | Số bản ghi/chunk trích xuất. |
| `checksum_errors` | `INTEGER` | `NOT NULL, DEFAULT 0` | Số lỗi checksum. |
| `status` | `VARCHAR(32)` | `NOT NULL, DEFAULT 'SUCCESS'` | Trạng thái lượt đồng bộ. |
| `error_message` | `TEXT` | `NULL` | Thông báo lỗi nếu có. |
| `details` | `JSONB` | `NULL` | Chi tiết danh sách tệp/sự kiện dạng JSONB. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm ghi nhận. |

#### Bảng 10: `pb56_sync_mode_audit_logs` (`pb56_workstation_model.py:98` — Bảng mới cho FR14/FR62)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh bản ghi kiểm toán lệnh cấu hình. |
| `workstation_id` | `VARCHAR(64)` | `NOT NULL, FK REFERENCES pb56_workstations(id) ON DELETE CASCADE` | Máy trạm chịu tác động. |
| `action` | `VARCHAR(32)` | `NOT NULL, CHECK IN ('REQUESTED','APPLIED','CANCELLED','REJECTED')` | Trạng thái chuyển đổi chế độ đồng bộ / lệnh điều khiển. |
| `old_sync_mode` / `new_sync_mode` | `VARCHAR(32)` | `NULL` | Chế độ đồng bộ trước và sau thay đổi. |
| `old_schedule_type` / `new_schedule_type` | `VARCHAR(32)` | `NULL` | Chu kỳ lịch trước và sau thay đổi. |
| `old_shift_end_time` / `new_shift_end_time` | `VARCHAR(8)` | `NULL` | Giờ kết thúc ca trước và sau thay đổi. |
| `changed_by` | `VARCHAR(255)` | `NOT NULL` | Quản trị viên thực hiện lệnh. |
| `notes` | `TEXT` | `NULL` | Ghi chú/lý do điều chỉnh. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm ghi log. |

#### Bảng 11: `sop_documents` (`backend/app/db/postgres/models/sop_document.py` — Thay `sop_articles`, FR26)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh quy trình SOP. |
| `code` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Mã chuẩn SOP (ví dụ: `SOP-SALES-001`). |
| `title` | `VARCHAR(255)` | `NOT NULL, INDEX` | Tiêu đề quy trình. |
| `department` | `VARCHAR(100)` | `NOT NULL, INDEX` | Phòng ban áp dụng. |
| `version` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'v1.0'` | Phiên bản tài liệu SOP. |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'draft', INDEX, CHECK IN ('draft','published','archived')` | Vòng đời SOP (BR-04: chỉ Knowledge Admin xuất bản). |
| `tags` | `JSON` | `NOT NULL, DEFAULT '[]'` | Danh sách thẻ phân loại (khuyến nghị `JSONB`). |
| `purpose` | `TEXT` | `NULL` | Mục đích & phạm vi áp dụng. |
| `steps` | `JSON` | `NOT NULL, DEFAULT '[]'` | Danh sách các bước `[{num, title, desc}]` (khuyến nghị `JSONB`). |
| `governance` | `TEXT` | `NULL` | Quy định kiểm soát & tuân thủ. |
| `author_id` | `UUID` | `NULL, INDEX, FK REFERENCES users(user_id) ON DELETE SET NULL` | Người biên soạn. |
| `author_name` | `VARCHAR(150)` | `NULL` | Snapshot tên tác giả. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Dấu thời gian tạo và cập nhật. |
| `published_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm xuất bản chính thức. |

#### Bảng 12: `copilot_sessions` (`backend/app/db/postgres/models/copilot_session.py` — Thay `chat_sessions`, FR27/FR39/UC.18)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh phiên hội thoại AI Copilot. |
| `user_id` | `UUID` | `NOT NULL, INDEX, FK REFERENCES users(user_id) ON DELETE CASCADE` | Chủ sở hữu phiên chat. |
| `title` | `VARCHAR(255)` | `NOT NULL, DEFAULT 'Cuộc hội thoại mới'` | Tiêu đề phiên chat. |
| `messages` | `JSON` | `NOT NULL, DEFAULT '[]'` | Mảng lịch sử tin nhắn kèm trích dẫn (Denormalization có chủ đích; khuyến nghị `JSONB`). |
| `is_pinned` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE, INDEX` | Cờ ghim phiên làm tài liệu tham khảo (UC.18). |
| `is_shared` | `BOOLEAN` | `NOT NULL, DEFAULT FALSE, INDEX` | Cờ chia sẻ cho phòng ban. |
| `department` | `VARCHAR(100)` | `NULL, INDEX` | Phòng ban được chia sẻ phiên ghim. |
| `pinned_by_name` | `VARCHAR(255)` | `NULL` | Tên người thực hiện ghim. |
| `pinned_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm ghim. |
| `pin_notes` | `VARCHAR(1000)` | `NULL` | Ghi chú đính kèm khi ghim. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Dấu thời gian tạo và cập nhật gần nhất. |

#### Bảng 13: `shift_reports` (`backend/app/db/postgres/models/shift_report.py` — Bảng mới cho FR55–FR56)
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh biên bản giao ca. |
| `author_id` | `UUID` | `NULL, INDEX, FK REFERENCES users(user_id) ON DELETE SET NULL` | Nhân viên lập báo cáo. |
| `author_name` | `VARCHAR(150)` | `NOT NULL` | Snapshot tên nhân viên lúc lập báo cáo. |
| `username` | `VARCHAR(100)` | `NOT NULL` | Snapshot username. |
| `department` | `VARCHAR(50)` | `NOT NULL, INDEX` | Mã phòng ban chuẩn (`sales`, `legal`, `accounting_procurement`, `it`, `rnd`). |
| `summary` | `TEXT` | `NOT NULL, DEFAULT ''` | Tóm tắt tình hình ca trực. |
| `cases` | `JSON` | `NOT NULL, DEFAULT '[]'` | Danh sách ca xử lý `[{time, customer, issue, solution, ref, status}]` (khuyến nghị `JSONB`). |
| `proposals` | `TEXT` | `NOT NULL, DEFAULT ''` | Kiến nghị / bàn giao ca sau. |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'DRAFT', INDEX, CHECK IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')` | Vòng đời ký duyệt báo cáo ca. |
| `content_hash` | `VARCHAR(64)` | `NULL` | Mã băm SHA-256 nội dung khi nộp, đảm bảo toàn vẹn chứng từ. |
| `submitted_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm nộp lên Trưởng phòng. |
| `signed_by` | `VARCHAR(150)` | `NULL` | Tên Trưởng phòng ký duyệt. |
| `signed_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm ký duyệt. |
| `manager_comment` | `TEXT` | `NULL` | Nhận xét chỉ đạo hoặc lý do từ chối. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Dấu thời gian tạo và cập nhật. |

### 3.3. Cập nhật Table 16 (Role Mapping — Đồng bộ BR-04 SRS Ver 1.2)
Thay thế bảng 4 vai trò gộp cũ bằng **5 vai trò chuẩn**:

| Role in SRS Ver 1.2 (BR-04) | Canonical Code | Data Scope | Primary Database Responsibilities |
|---|---|---|---|
| **System & IT Administrator** | `it_admin` | `ALL_DEPARTMENTS` (Hạ tầng & An ninh) | Quản trị `users`, `knowledge_access_policies`, `user_active_sessions`, `audit_logs`, `pb56_workstations*`. Không chỉnh sửa dữ liệu đồ thị tri thức. |
| **Knowledge Administrator** | `knowledge_manager` | `ALL_DEPARTMENTS` (Tri thức) | Phê duyệt `knowledge_upload_approvals`, xuất bản `sop_documents`, biên tập Neo4j Knowledge Graph. Không quản trị tài khoản/phân quyền hệ thống. |
| **Executive** | `executive` | `ALL_DEPARTMENTS` (Read-only) | Truy vấn toàn doanh nghiệp (BR-05), xem `audit_logs`, xem tổng hợp `shift_reports`, Executive Dashboard & Risk Alerts. |
| **Department Manager** | `department_manager` | `OWN_DEPARTMENT` | Ký duyệt `shift_reports` phòng mình, kích hoạt tổng hợp ca ngày, soạn thảo nháp `sop_documents` phòng mình, hỏi đáp AI Copilot trong phạm vi phòng ban. |
| **Standard User** | `standard_user` | `OWN_DEPARTMENT` | Lập `shift_reports`, tải tài liệu vào `knowledge_upload_approvals`, sử dụng `copilot_sessions` trong phạm vi phòng ban. |

---

## 4. BỔ SUNG SECTION 3.1.X: PLANNED EXTENSION TABLES, INDEXING STRATEGY & NORMALIZATION JUSTIFICATION

### 4.1. Phân tách Nhóm Bảng Mở rộng Tương lai (`[PLANNED / FUTURE-PHASE]`)
Di chuyển 18 bảng chưa triển khai từ Ver 1.0 sang tiểu mục riêng và bổ sung `shift_daily_summaries` (FR57), kèm **3 hiệu chỉnh bắt buộc**:
1. **`executive_briefings`:** **Xóa 3 cột** `file_format (PDF/DOCX)`, `file_uri`, `file_size_bytes` (Out-of-Scope theo Proposal Ver 1.2 §4.2 & SRS FR44); chỉ giữ `content_markdown` để hiển thị trên Web Dashboard.
2. **`system_alerts`:** Bổ sung `'NEGATIVE_MARGIN'` và `'ABNORMAL_DISCOUNT'` ($\ge 35\%$) vào `CHECK` constraint của `alert_type` (khớp SRS FR42).
3. **Composite PK cho bảng trung gian:** Bổ sung `PK (role_id, permission_id)` cho `role_permissions`; surrogate `id UUID PK` + `UNIQUE NULLS NOT DISTINCT (user_id, role_id, scope_department_id)` cho `user_roles`; và `PK (alert_id, user_id)` cho `alert_recipients`.
4. **Bổ sung bảng `shift_daily_summaries` `[PLANNED — FR57]`:** `id UUID PK`, `department_code VARCHAR(50) NULL`, `summary_date DATE NOT NULL`, `content_markdown TEXT NOT NULL`, `total_shifts INT`, `total_issues INT`, `is_fallback_generated BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMPTZ`.

### 4.2. Bổ sung Tiểu mục Mới: PostgreSQL Indexing Strategy (§3.1.Y)

| Table | Index Name | Columns | Kind | Purpose |
|---|---|---|---|---|
| `users` | `ix_users_email` | `(email)` | Unique B-tree | Tra cứu đăng nhập (loại bỏ `index=True` thừa trên PK `user_id`). |
| `users` | `ix_users_role_status` | `(role, status) WHERE deleted_at IS NULL` | Partial B-tree | Lọc danh sách tài khoản đang hoạt động theo vai trò. |
| `password_reset_otps` | `ix_otp_email_active` | `(email, is_used, expires_at)` | Composite B-tree | Xác thực OTP còn hiệu lực theo email. |
| `user_active_sessions` | `ix_uas_token` | `(active_session_token_id)` | B-tree | Kiểm tra `jti` phiên hiện hành trên mọi API request. |
| `knowledge_access_policies` | `uq_role_dept_resource_policy` | `(role_code, department_code, resource_type)` | Unique B-tree | Tra cứu ô ma trận phân quyền RBAC 2D. |
| `audit_logs` | `ix_audit_actor_time` | `(actor_id, created_at DESC)` | Composite B-tree | Tra cứu lịch sử thao tác theo người dùng mới nhất trước. |
| `audit_logs` | `ix_audit_action_time` | `(action, created_at DESC)` | Composite B-tree | Lọc sự kiện an ninh theo mã hành động. |
| `knowledge_upload_approvals` | `ix_kua_status_dept` | `(status, department_code, created_at DESC)` | Composite B-tree | Hiển thị hàng đợi `PENDING` cho Knowledge Admin. |
| `knowledge_upload_approvals` | `ix_kua_sha256` | `(sha256_hash)` | B-tree | Kiểm tra trùng lặp tệp theo BR-06 *(sau khi bổ sung cột)*. |
| `copilot_sessions` | `ix_copilot_user_updated` | `(user_id, updated_at DESC)` | Composite B-tree | Tải danh sách phiên chat gần nhất của người dùng. |
| `shift_reports` | `ix_shift_dept_status_time` | `(department, status, updated_at DESC)` | Composite B-tree | Tải hàng đợi duyệt báo cáo ca cho Trưởng phòng. |
| `pb56_workstations` | `ix_pb56_workstations_last_hb` | `(last_heartbeat_at)` | B-tree | Tính toán trạng thái Online/Offline theo ngưỡng Heartbeat. |
| `pb56_workstation_sync_logs` | `ix_pb56_sync_logs_ws` | `(workstation_id, created_at DESC)` | Composite B-tree | Xem lịch sử đồng bộ theo trạm máy (đã có trong migration SQL). |
| `pb56_sync_mode_audit_logs` | `ix_pb56_audit_ws` | `(workstation_id, created_at DESC)` | Composite B-tree | Xem lịch sử đổi chế độ đồng bộ (đã có trong migration SQL). |

### 4.3. Bổ sung Tiểu mục Mới: Normalization & Deliberate Denormalization Justification (§3.1.Z)
Giải trình minh bạch 3 quyết định phi chuẩn hóa có chủ đích trong Source Code (thay vì ép 3NF máy móc):
1. **`copilot_sessions.messages` (`JSON` → khuyến nghị `JSONB`):** Lưu mảng hội thoại trong cùng dòng phiên chat để đọc toàn bộ lịch sử bằng 1 câu truy vấn `O(1)`. *Ngưỡng nâng cấp:* Tách sang bảng `chat_messages` khi phiên vượt hàng nghìn lượt hoặc cần phân tích SQL trên từng tin nhắn.
2. **`shift_reports.cases` & `sop_documents.steps` (`JSON` → `JSONB`):** Dữ liệu danh sách con luôn được đọc và ghi trọn gói cùng bản ghi cha; tránh join nhiều bảng cho tài liệu có kích thước nhỏ (< 50 mục).
3. **Audit Snapshot Columns (`shift_reports.author_name`, `knowledge_upload_approvals.uploaded_by_email`, `sop_documents.author_name`):** Lưu bản sao tên/email tại thời điểm ký duyệt hoặc tải lên nhằm giữ nguyên tính toàn vẹn chứng từ lịch sử ngay cả khi nhân sự đổi tên hoặc nghỉ việc.

---

## 5. HIỆU CHỈNH SECTION 3.2: NEO4J KNOWLEDGE GRAPH MODEL

Cập nhật §3.2.2 và §3.2.3 khớp chính xác với `backend/app/modules/m3_hybrid_copilot/query_engine/semantic_layer.py` và các script nạp dữ liệu thực tế:

### 5.1. Danh sách Nhãn Node Thực tế (Implemented Node Labels)
1. **Nhánh ERP AdventureWorks:** `:Customer` (19.820 nodes), `:SalesOrder` (31.465 nodes, giai đoạn `2011-05-31` đến `2014-06-30`), `:Product` (504 nodes), `:SubCategory` (37 nodes), `:Category` (4 nodes), `:Employee` (bảo mật RBAC — chỉ Admin/Executive).
2. **Nhánh Hợp đồng CUAD & Tài liệu Nội bộ:**
   - Đổi `:Contract` thành **`:Document`** (595 nodes — thuộc tính `id`, `name`, `department`, `dept`, `chunksCount`, `status`, `op_stage`).
   - Giữ **`:Clause`** (1.798 nodes — thuộc tính `id`, `type`, `title`, `snippet`, `source_document_id`, `source_file`).
   - Đổi `:Vendor` thành **`:Company`** (1.891 nodes — thuộc tính `name`, `domain`).
   - Giữ **`:Department`** (5 phòng ban chuẩn).
   - Đánh dấu `[PLANNED]` cho `:SOP_Document` và `:Vendor` (chưa nạp vào `SCHEMA_REGISTRY`).

### 5.2. Danh sách Quan hệ Thực tế (Implemented Relationship Types)
- **Đang vận hành trong đồ thị:**
  - `(:Customer)-[:PLACED_ORDER]->(:SalesOrder)`
  - `(:Customer)-[:PURCHASED]->(:Product)` *(Bổ sung mới — cạnh tắt đã tạo bởi `scripts/link_purchased.py`)*
  - `(:SalesOrder)-[:CONTAINS_PRODUCT {OrderQty, UnitPrice, lineTotal}]->(:Product)`
  - `(:Product)-[:BELONGS_TO]->(:SubCategory)`
  - `(:SubCategory)-[:PART_OF]->(:Category)`
  - `(:Document)-[:CONTAINS_CLAUSE]->(:Clause)` *(Thay `[:HAS_CLAUSE]`)*
  - `(:Company)-[:PARTY_TO]->(:Document)` *(Thay `[:BOUND_BY_CONTRACT]`)*
  - `(:Product | :Document)-[:BELONGS_TO_DEPT]->(:Department)`
- **Đánh dấu `[PLANNED / NOT POPULATED]`:** `[:SOLD_BY]` (0 Employee gắn SalesOrder), `[:SUPPLIED_BY]`, `[:SUPPLIED_UNDER]`, `[:MANAGED_BY]`, `[:REFERS_TO]`, `[:RELATED_TO]`.

### 5.3. Ghi chú Chuẩn hóa Thuộc tính & Truy vấn Neo4j
- **Chuẩn hóa tên thuộc tính:** Ghi nhận hiện tượng trùng thuộc tính hoa/thường trong dữ liệu nạp (`TotalDue`/`totalDue`, `SubTotal`/`subTotal`, `OrderDate`/`orderDate`, `Name`/`name`) và đặt quy chuẩn thống nhất về 1 chuẩn duy nhất ở đợt tái nạp kế tiếp.
- **Tối ưu tìm kiếm:** Thay thế truy vấn Full Graph Scan trong `Neo4jClient.search_nodes()` bằng Full-Text Index (`entity_fulltext_idx`, `clause_text_idx` đã khai báo ở Table 50).

---

## 6. HIỆU CHỈNH SECTION 3.3: QDRANT VECTOR MODEL

1. **Chốt thống nhất Embedding Model & Số chiều:**
   - **Model:** `SentenceTransformer("all-MiniLM-L6-v2")` (local).
   - **Vector Size:** **384 dimensions**, Distance Metric: **Cosine** (`backend/app/db/qdrant/client.py:36, 134`).
   - *(Ghi chú đồng bộ chéo: Yêu cầu sửa SAD Ver 1.0 và SRS Ver 1.2 từ 768-dim `nomic-embed-text` về 384-dim `all-MiniLM-L6-v2` để 4 tài liệu khớp 100%).*
2. **Cập nhật Table 52 (Qdrant Collections):**
   - `cuad_contracts` (**Implemented** — hợp đồng CUAD và tài liệu nội bộ được nạp qua pipeline).
   - `adventureworks_entities` (**Implemented** — thay tên `business_records`; lưu vector mô tả thực thể ERP AdventureWorks).
   - `sop_knowledge_base` (**Planned** — chưa khởi tạo trong mã nguồn hiện tại).
3. **Bổ sung Tiểu mục §3.3.5: PR1 Layer-1 Server-Side Retrieval Guard & Deterministic Point IDs:**
   - **Layer-1 Guard (`qdrant/client.py:52–103`):** Mọi truy vấn `vector_search` và `get_document_chunks` đều tự động tiêm điều kiện `must_not: [{"key": "is_active", "match": {"value": False}}]` ở tầng server để chặn tuyệt đối các điểm đang nạp dở/lỗi staging; từ chối nếu caller cố tình ghi đè bộ lọc `is_active`.
   - **UUIDv5 Point IDs (`pipeline.py:58–78`):** Phân tách `logical_chunk_id` (ổn định cho Citation UI) và `physical_point_id` (độc nhất theo `operation_id` + `fencing_generation` chống xung đột ghi đồng thời).
   - **Payload Indexes cần bổ sung trong Code:** Bên cạnh `contract_name` và `doc_id` đã có, bổ sung payload index cho `department`, `is_active`, `document_id`, `entity_type`.

---

## 7. BỔ SUNG SECTION 5.8: DATABASE SECURITY, INTEGRITY & MIGRATION GOVERNANCE

Thêm tiểu mục chuyên biệt vào cuối Section 5 của tài liệu Word:

1. **Bảo vệ Mật khẩu & OTP:**
   - Mật khẩu băm bằng **`bcrypt`** (cost factor $\ge 12$, `backend/app/core/security.py:27–30`).
   - Mã OTP 6 chữ số trong `password_reset_otps`: khuyến nghị nâng cấp từ unsalted SHA-256 sang **`HMAC-SHA256(SECRET_KEY, email + otp)`** hoặc `bcrypt` để chống tấn công brute-force offline nếu lộ CSDL.
2. **Tính Bất biến của Nhật ký Kiểm toán (BR-03):**
   - Đề xuất triển khai PostgreSQL Trigger `BEFORE UPDATE OR DELETE ON audit_logs` phát sinh ngoại lệ (hoặc thu hồi quyền `UPDATE, DELETE` của DB role ứng dụng) để bảo vệ BR-03 ngay ở tầng CSDL.
3. **Chốt chặn An toàn Đồ thị & Vector:**
   - **Read-Only Cypher Guard (FR61):** Chặn mọi từ khóa đột biến (`CREATE`, `MERGE`, `DELETE`, `DETACH`, `SET`, `REMOVE`, `DROP`, `CALL`) trước khi chạm tới Neo4j Driver.
   - **Qdrant Layer-1 Guard:** Chặn truy xuất các vector `is_active = False`.
4. **Quy chuẩn Quản trị Migration (Alembic):**
   - Hợp nhất toàn bộ 13 ORM models vào `backend/app/db/postgres/models/__init__.py` (kể cả ORM model mới cho `user_active_sessions`).
   - Thay thế chuỗi migration bị đứt (`0186c646946f` lệch cột và `a93ce8369026` rỗng `pass`) bằng một **Alembic Baseline Migration** chuẩn hóa; không tạo/sửa bảng bằng `CREATE TABLE IF NOT EXISTS` rải rác lúc runtime ở môi trường Production.
   - Không lưu mật khẩu fallback yếu cho môi trường Production; khóa script `seed_users.py` chỉ chạy khi `APP_ENV == "development"`.

---

## 8. CẬP NHẬT SECTION 6: RELATIONSHIPS, CASCADE RULES & CHÚ THÍCH SƠ ĐỒ ERD

### 8.1. Bảng Quan hệ Chuẩn hóa cho 13 Bảng PostgreSQL Đang Vận hành (Thay Tables 66–69 cũ)

| Parent Table | Child Table | Cardinality | Optionality | Foreign Key & Cascade Rule | Business Meaning |
|---|---|---|:---:|---|---|
| `users` | `user_active_sessions` | `1 : 0..1` | Optional | `user_id FK ON DELETE CASCADE` *(cần thêm FK)* | Mỗi tài khoản chỉ có tối đa 1 phiên đang hoạt động (FR59). |
| `users` | `copilot_sessions` | `1 : N` | Optional | `user_id FK ON DELETE CASCADE` | Người dùng sở hữu nhiều phiên hội thoại AI Copilot. |
| `users` | `sop_documents` | `1 : N` | Optional | `author_id FK ON DELETE SET NULL` | Người dùng biên soạn các quy trình SOP (giữ tài liệu khi xóa user). |
| `users` | `shift_reports` | `1 : N` | Optional | `author_id FK ON DELETE SET NULL` | Nhân viên nộp nhiều biên bản bàn giao ca trực. |
| `users` | `knowledge_upload_approvals` | `1 : N` | Optional | `uploaded_by_id FK ON DELETE SET NULL` *(cần thêm FK)* | Nhân viên tải nhiều tài liệu vào hàng đợi phê duyệt. |
| `users` | `knowledge_access_policies` | `1 : N` | Optional | `updated_by FK ON DELETE SET NULL` *(cần thêm FK)* | IT Admin cập nhật các ô ma trận phân quyền RBAC. |
| `users` | `audit_logs` | `1 : N` | Optional | `actor_id FK ON DELETE SET NULL` *(cần thêm FK)* | Lưu vết toàn bộ hành động của người dùng (BR-03). |
| `pb56_workstations` | `pb56_workstation_sync_logs` | `1 : N` | Optional | `workstation_id FK ON DELETE CASCADE` | Một máy trạm AEGIS sinh nhiều bản ghi lịch sử đồng bộ. |
| `pb56_workstations` | `pb56_sync_mode_audit_logs` | `1 : N` | Optional | `workstation_id FK ON DELETE CASCADE` | Một máy trạm có nhiều bản ghi kiểm toán thay đổi chế độ đồng bộ. |

*(Lưu ý: `password_reset_otps` liên kết logic với `users` qua `email`, không đặt FK vật lý để vẫn xử lý an toàn trường hợp email không tồn tại).*

### 8.2. Chú thích Các Sơ đồ Cần Cập nhật / Vẽ lại trong File Word (Không tạo hình ảnh)

1. **[CHÚ THÍCH SƠ ĐỒ — Figure 6.1: Overall PostgreSQL Physical ERD (Implemented MVP — 13 Tables)]**
   - **Vị trí:** Section 6 (Thay thế ảnh Figure 6.1 cũ đang vẽ 27 bảng chưa đồng bộ).
   - **Loại sơ đồ:** Physical Entity-Relationship Diagram (Crow's Foot Notation).
   - **Nội dung cần thể hiện:** Nhóm 13 bảng thực tế thành 4 cụm màu rõ ràng:
     - *Cụm 1 (Core, Auth & RBAC):* `users`, `password_reset_otps`, `user_active_sessions`, `knowledge_access_policies`, `knowledge_permissions`, `audit_logs`.
     - *Cụm 2 (AEGIS Sync & Upload Approval):* `pb56_workstations`, `pb56_workstation_sync_logs`, `pb56_sync_mode_audit_logs`, `knowledge_upload_approvals`.
     - *Cụm 3 (SOP Wiki):* `sop_documents`.
     - *Cụm 4 (AI Copilot & Shift Reports):* `copilot_sessions`, `shift_reports`.
   - **Đường nối bắt buộc:** Vẽ đầy đủ 9 quan hệ trong Bảng 8.1 kèm ký hiệu đầu cuối Crow's Foot (`1`, `0..1`, `0..N`), nhãn tên cột FK và quy tắc `ON DELETE`.

2. **[CHÚ THÍCH SƠ ĐỒ — Figure 6.2: Neo4j Knowledge Graph Ontology Schema (Actual Implemented Graph)]**
   - **Vị trí:** Cuối Section 3.2.4 (Knowledge Graph Overview).
   - **Loại sơ đồ:** Property Graph Schema Diagram.
   - **Nội dung cần thể hiện:** 2 nhánh kết nối vào nút `:Department`:
     - *Nhánh ERP AdventureWorks:* `(:Customer)-[:PLACED_ORDER]->(:SalesOrder)-[:CONTAINS_PRODUCT]->(:Product)-[:BELONGS_TO]->(:SubCategory)-[:PART_OF]->(:Category)` cùng cạnh tắt `(:Customer)-[:PURCHASED]->(:Product)` và `(:Product)-[:BELONGS_TO_DEPT]->(:Department)`.
     - *Nhánh Hợp đồng CUAD & Tài liệu:* `(:Company)-[:PARTY_TO]->(:Document)-[:CONTAINS_CLAUSE]->(:Clause)` và `(:Document)-[:BELONGS_TO_DEPT]->(:Department)`.
     - Nút `:Employee` đặt trong vùng đánh dấu RBAC restricted (Admin/Executive only).

3. **[CHÚ THÍCH SƠ ĐỒ — Figure 6.3: Cross-Model Key Mapping & Data Lineage]**
   - **Vị trí:** Section 4.2 (Cross-Model Key Mapping Matrix).
   - **Loại sơ đồ:** Cross-Store Reference Architecture Diagram (3 cột: PostgreSQL | Neo4j | Qdrant).
   - **Nội dung cần thể hiện:** Đường liên kết mã định danh giữa 3 kho:
     - `knowledge_upload_approvals` (staging) ➔ khi `APPROVED` kích hoạt `pipeline.py` tạo `(:Document {id: DOC_...})` trên Neo4j và các point UUIDv5 (`doc_id`, `is_active: true`, `department`) trong Qdrant `cuad_contracts`.
     - `departments` canonical key (`legal`, `sales`, `accounting_procurement`, `it`, `rnd`) làm khóa lọc RBAC xuyên suốt `knowledge_access_policies` (PostgreSQL) ↔ `BELONGS_TO_DEPT` (Neo4j) ↔ `department` payload (Qdrant).

---

## 9. CHECKLIST NGHIỆM THU XUẤT BẢN `C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`

- [ ] Đã cập nhật Bìa, Table 1 (`Ver 1.1`), thêm Revision History, cập nhật §1.4 References (Proposal Ver 1.2, SRS Ver 1.2) và gỡ bỏ toàn bộ `[TO BE VERIFIED]` trong Table 1 Assumptions.
- [ ] Đã sửa `React / Next.js` → `React 18 + Vite (SPA)` và điền đầy đủ 4 ô bỏ trống ở Table 5 (R7, R8, R14) & Table 7 (R9).
- [ ] Đã tách rõ **13 bảng PostgreSQL Implemented MVP** khỏi nhóm bảng **Planned Extensions**.
- [ ] Đã điền đủ 100% `PK`, `FK REFERENCES ... ON DELETE ...`, `UNIQUE`, `CHECK` vào cột `Key / Constraint` của mọi bảng.
- [ ] Đã cập nhật Role Mapping (Table 16) sang 5 vai trò theo BR-04; xóa cột `PDF`/`DOCX` khỏi `executive_briefings`; thêm `NEGATIVE_MARGIN` & `ABNORMAL_DISCOUNT` vào `system_alerts`.
- [ ] Đã bổ sung §3.1.Y (PostgreSQL Indexing Strategy), §3.1.Z (Normalization & Denormalization Justification) và §5.8 (Database Security & Migration Governance).
- [ ] Đã cập nhật §3.2 Neo4j (`:Document`, `:Company`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]`, `[:PURCHASED]`) và §3.3 Qdrant (`all-MiniLM-L6-v2` 384-dim, `cuad_contracts` + `adventureworks_entities`, Layer-1 `is_active` guard).
- [ ] Đã vẽ lại Figure 6.1 (ERD 13 bảng), Figure 6.2 (Neo4j Schema) và Figure 6.3 (Cross-Model Key Mapping) khớp 100% nội dung bảng biểu.
