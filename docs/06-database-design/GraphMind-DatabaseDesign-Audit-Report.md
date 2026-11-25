# GRAPHMIND — DATABASE DESIGN AUDIT REPORT (VER 1.0)
## ĐÁNH GIÁ TOÀN DIỆN THIẾT KẾ CƠ SỞ DỮ LIỆU ĐỐI CHIẾU VỚI SRS VER 1.2, ARCHITECTURE VER 1.0 VÀ SOURCE CODE THỰC TẾ

> **Dự án:** GraphMind — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support (Capstone Project 1 — C1SE.18)  
> **Tài liệu được kiểm toán:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.0.docx` (25/09/2026 — 27 bảng PostgreSQL, 11 nhãn Neo4j, 3 collection Qdrant)  
> **Nguồn đối chiếu:**  
> 1. `docs/05-srs/C1SE18-SRS-Document-Ver1.2.docx` (SRS Ver 1.2 — 62 FRs, 27 Use Cases, BR-01–BR-06)  
> 2. `7.C1SE18_Architecture-Document-ver1.0.docx` (SAD Ver 1.0)  
> 3. `docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx` (Proposal Ver 1.2)  
> 4. `docs/02-user-story/C1SE18_UserStory_GraphMind-Ver1.2.docx` (US01–US69)  
> 5. `docs/04-product-backlog/C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (PB01–PB79)  
> 6. `docs/03-project-plan/C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (Project Plan Ver 1.2)  
> 7. **Source Code thực tế:** `backend/app/db/`, `backend/alembic/`, `backend/app/modules/`, `scripts/`, `docker-compose.yml`  
> **Ngày thực hiện kiểm toán:** 22/11/2026  
> **Nguyên tắc kiểm toán:** Chỉ kiểm toán và lập báo cáo; **không chỉnh sửa hay ghi đè tài liệu gốc**. Mọi kết luận đều có bằng chứng cụ thể và phân biệt rõ: `DOCUMENTED`, `IMPLEMENTED`, `TEST VERIFIED`, `NOT VERIFIED`, `UNCERTAIN`.

---

## 1. Executive Summary

### 1.1. Đánh giá Tổng quan Database Design Ver 1.0
Tài liệu `6.C1SE18_DatabaseDesign_GraphMind_Ver1.0.docx` (lập ngày **25/09/2026**, bám theo **Proposal Ver 1.1**) thể hiện tư duy thiết kế đa mô hình (Multi-Model Storage: PostgreSQL + Neo4j + Qdrant) có chiều sâu lý thuyết tốt, rõ nguyên tắc Single Source of Truth và Cross-Model Key Mapping.

Tuy nhiên, khi đối chiếu nghiêm ngặt với **Source Code thực tế**, **SRS Ver 1.2**, và **Architecture Document Ver 1.0**, tài liệu đang rơi vào tình trạng **lệch pha nghiêm trọng (Severe Design-Implementation Drift)** do được viết từ đầu Sprint 1 với 5 giả định chưa xác minh (`A1–A5`, Table 1) và **chưa từng được cập nhật** sau khi đội ngũ triển khai toàn bộ tính năng Sprint 2–4 (đặc biệt là 10 yêu cầu mới FR53–FR62).

### 1.2. Điểm Đánh giá Tổng hợp (Database Design Quality Scorecard)

| Tiêu chí Đánh giá | Trọng số | Điểm (/100) | Quy đổi | Nhận xét cốt lõi |
|---|:---:|:---:|:---:|---|
| 1. Mức độ khớp Source Code (Code Alignment) | 25% | **38 / 100** | 9.50 | Thiết kế 27 bảng PostgreSQL nhưng code chỉ triển khai 13 bảng (chỉ 2 bảng trùng tên `users`, `audit_logs` và đều khác cột/PK); Neo4j và Qdrant lệch tên nhãn, quan hệ, collection. |
| 2. Mức độ bao phủ SRS Ver 1.2 (SRS Coverage) | 20% | **55 / 100** | 11.00 | Thiếu hoàn toàn bảng cho FR53–FR60 (`knowledge_upload_approvals`, `shift_reports`, `shift_daily_summaries`, `user_active_sessions`); vẫn giữ 4 vai trò gộp (vi phạm BR-04) và giữ `PDF/DOCX` export (Out-of-Scope FR44). |
| 3. Tính đầy đủ Kỹ thuật & Ràng buộc (PK/FK/Constraints) | 20% | **50 / 100** | 10.00 | **100% các cột FK trong Bảng 8–35 bị bỏ trống ô `Key / Constraint`**; 3 bảng trung gian thiếu Composite PK; không có Cascade Rules; không có mục PostgreSQL Indexing Strategy. |
| 4. Chuẩn hóa & Toàn vẹn Dữ liệu (Normalization & Integrity) | 15% | **72 / 100** | 10.80 | Bản thiết kế đạt 3NF tốt ở mức logic, nhưng thiếu đối chiếu với các quyết định phi chuẩn hóa có chủ đích (`ponytail:` JSON columns) trong Source Code. |
| 5. Nhất quán với Architecture Document Ver 1.0 | 10% | **52 / 100** | 5.20 | Mâu thuẫn 3 chiều về kích thước vector (384 vs 768), mô hình embedding (`all-MiniLM-L6-v2` vs `nomic-embed-text`), Docker PostgreSQL, và Frontend stack (`Next.js` vs `Vite SPA`). |
| 6. Cấu trúc Tài liệu & Bảo mật (Docs & Security) | 10% | **68 / 100** | 6.80 | Bố cục rõ ràng nhưng còn nhiều ô trống (`Table 5`, `Table 7 Row 9`), thiếu đặc tả bảo mật tầng DB (RLS/Triggers/Immutability) và thiếu quản trị Migration (Alembic). |
| **TỔNG ĐIỂM KIỂM TOÁN** | **100%** | — | **53.30 / 100** | **Xếp loại: D- (Cần đại tu và nâng cấp lên Ver 1.1 / Ver 2.0)** |

### 1.3. Năm Vấn đề Nghiêm trọng Nhất (Top 5 Critical Findings)
1. **Lệch pha hoàn toàn danh sách bảng PostgreSQL (Design vs. Code):** Design mô tả 27 bảng, nhưng **18 bảng không tồn tại trong Source Code** (`MISSING IN CODE`), trong khi **6 bảng thực tế đang chạy trong Source Code lại hoàn toàn vắng bóng trong tài liệu** (`MISSING IN DOCUMENT`: `knowledge_upload_approvals`, `shift_reports`, `user_active_sessions`, `knowledge_permissions`, `knowledge_access_policies`, `pb56_sync_mode_audit_logs`), cộng thêm các bảng đổi tên hoàn toàn (`otps` → `password_reset_otps`, `system_audit_trails` → `audit_logs`, `chat_sessions` → `copilot_sessions`, `sop_articles` → `sop_documents`, `aegis_local_agents` → `pb56_workstations`).
2. **Mất toàn bộ khai báo Foreign Key & Composite PK trong các bảng đặc tả vật lý (Tables 10–37):** Trong tài liệu Word, cột `Key / Constraint` của **toàn bộ các cột khóa ngoại** (`users.department_id`, `otps.user_id`, `role_permissions.role_id`, `user_roles.user_id`, `chat_sessions.user_id`, `chat_messages.session_id`, v.v.) đều bị **để trống** (rất có thể do lỗi format/render khi xuất từ Markdown sang Word).
3. **Mâu thuẫn 3 chiều về Neo4j & Qdrant giữa Design, Architecture, SRS và Code:**
   - **Qdrant Vector Dimension:** Design & Code dùng **384 chiều** (`all-MiniLM-L6-v2`), trong khi Architecture Ver 1.0 & SRS Ver 1.2 ghi **768 chiều** (`nomic-embed-text`).
   - **Qdrant Collections:** Design ghi `cuad_contracts`, `sop_knowledge_base`, `business_records`; SRS ghi `graphmind_chunks`; Code thực tế dùng `cuad_contracts` và `adventureworks_entities` / `adventureworks_datasets`.
   - **Neo4j Ontology:** Design dùng `:Contract`, `:Vendor`, `[:HAS_CLAUSE]`, `[:BOUND_BY_CONTRACT]`, `[:SOLD_BY]`; Code thực tế dùng `:Document`, `:Company`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]`, `[:PURCHASED]` (và có **0** liên kết `Employee`–`SalesOrder`).
4. **Alembic Migration bị đứt gãy & quản lý schema phân tán trong Code:** File migration thứ 2 (`a93ce8369026_migrate_to_ekai_postgres_schema.py`) là một **stub rỗng (`pass`)**; `alembic/env.py` bỏ sót 4 ORM models; toàn bộ bảng mới được tạo rải rác bằng raw SQL `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` ngay lúc runtime.
5. **Vi phạm Quy tắc nghiệp vụ BR-04 & Phạm vi Proposal Ver 1.2:** Design Ver 1.0 khẳng định cứng 4 vai trò gộp `ADMIN (System & Knowledge Administrator)` (Assumption A2, Table 16) — mâu thuẫn trực tiếp SRS Ver 1.2 BR-04; bảng `executive_briefings` vẫn giữ cột `file_format CHECK IN ('PDF','DOCX')` (Out-of-Scope theo Proposal Ver 1.2 §4.2 & SRS FR44).

---

## 2. Database Design Structure Assessment

| Hạng mục cấu trúc (theo chuẩn DBD) | Trạng thái trong Ver 1.0 | Bằng chứng trong tài liệu | Đánh giá |
|---|:---:|---|---|
| **4.1. Database Overview** | `DOCUMENTED` (Outdated) | Section 1.1–1.4, Section 2.1–2.4 | Có đủ mục tiêu, phạm vi, phân bổ 3 DBMS; nhưng tham chiếu Proposal **Ver 1.1** (§1.4) và công nghệ cũ (`React/Next.js`, Table 4). |
| **4.2. Conceptual Data Model** | `PARTIALLY DOCUMENTED` | Section 2.3–2.4 (Tables 5–6) | Không có Conceptual ERD riêng; Table 5 có **3 ô trống** ở cột *Main Storage Objects* (R7, R8, R14). |
| **4.3. Logical Data Model** | `PARTIALLY DOCUMENTED` | Section 6.1–6.4 (Tables 66–69) | Nhầm lẫn trộn lẫn Logical và Physical vào Section 3; không có phần Normalization Analysis; thiếu Optionality (chỉ ghi 1:N chung chung). |
| **4.4. Physical Data Model** | `PARTIALLY DOCUMENTED` (Defective) | Section 3.1–3.3 (Tables 8–57) | Có bảng cột chi tiết, nhưng **trắng toàn bộ ô FK** trong cột `Key / Constraint`, thiếu `ON DELETE/UPDATE`, thiếu PostgreSQL DDL/Indexes; có 1 ô trống ở Table 7 R9 (`Deletion`). |
| **4.5. Data Dictionary** | `DOCUMENTED` (Partial) | Embedded in Tables 8–35, 38–48, 54 | Kết hợp vào bảng vật lý; thiếu mô tả business rules ở nhiều cột và thiếu bảng Enum cho các bảng mới (`shift_reports`, `knowledge_upload_approvals`). |
| **4.6. Database Relationships** | `PARTIALLY DOCUMENTED` | Section 6 (Figure 6.1 + Tables 66–69), §3.2.3 | Có 1 ảnh ERD (`Figure 6.1`), bảng quan hệ liệt kê 1:N nhưng **thiếu Cascade Rules**, thiếu mối quan hệ từ `users` tới các bảng mới (`shift_reports`, `user_active_sessions`). |
| **4.7. Database Security** | `PARTIALLY DOCUMENTED` | Table 7 R10, §5.4 | Chỉ nhắc 1 dòng về mã hóa `*_enc` và Bcrypt/Argon2; **không có mục Database Security riêng** (thiếu phân quyền DB user, immutability cho Audit Log BR-03, bảo vệ OTP hash, TLS connection). |
| **4.8. Performance & Integrity** | `PARTIALLY DOCUMENTED` | §3.2.5 (Neo4j), §3.3.3 (Qdrant), §7 | Có bảng Index cho Neo4j và Qdrant, nhưng **HOÀN TOÀN THIẾU bảng Indexing Strategy cho PostgreSQL**; không có Transaction Management / Concurrency Control (chỉ có trong `pipeline.py` bằng in-memory lock + Neo4j CAS). |

---

## 3. Source Code Database Analysis

### 3.1. Công nghệ & Cấu hình Kết nối Thực tế (`IMPLEMENTED`)
- **PostgreSQL (Operational SoR):**
  - Database name: `graph_mind` (`backend/app/core/config.py:40`).
  - Driver & ORM: `asyncpg` + **SQLAlchemy 2.x Async** (`backend/app/db/postgres/database.py:1–35`), connection pool `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`. Sync driver `psycopg2` cho Alembic (`config.py:51–56`).
  - Triển khai: Chạy trên máy chủ host (`POSTGRES_SERVER=host.docker.internal` trong `docker-compose.yml:65`), **không chạy trong Docker container**.
- **Neo4j (Knowledge Graph):**
  - Image: `neo4j:5.18.0` kèm plugin `apoc` (`docker-compose.yml:6, 17`).
  - Driver: Python `neo4j` Bolt driver (`backend/app/db/neo4j/client.py:11, 77–86`).
- **Qdrant (Vector Index):**
  - Image: `qdrant/qdrant:v1.8.2` (`docker-compose.yml:33`).
  - Client & Embedding: `qdrant-client` + `SentenceTransformer("all-MiniLM-L6-v2")` (**384 chiều**, Cosine) (`backend/app/db/qdrant/client.py:36, 134`).
- **File Storage & Local JSON State (Không được mô tả trong Design):**
  - Tệp thô lưu tại volume `D:/data:/data` (`CENTRAL_STORAGE_DIR=/data`, `docker-compose.yml:58, 69`).
  - Hàng đợi tệp tạm chờ duyệt lưu tại `tempfile.gettempdir()/graphmind_pending_uploads` (Windows) hoặc `/data/.pending_uploads` (Linux) (`document_approval_router.py:60–63`).
  - Dữ liệu danh mục phòng ban được **hardcode trong Python** (`backend/app/core/departments.py:9–61` — 5 phòng ban: `legal`, `sales`, `accounting_procurement`, `it`, `rnd`), **không có bảng `departments` trong PostgreSQL**.
  - Trạng thái log watcher còn lưu bổ sung ra 2 file JSON phẳng: `backend/app/modules/m1_data_sync/data/watcher_ingested_docs.json` và `watcher_sync_logs.json`.

### 3.2. Danh sách Đầy đủ 13 Bảng PostgreSQL trong Source Code (`IMPLEMENTED`)

| STT | Tên Bảng trong Code | Nguồn Định nghĩa (File & Dòng) | Cách Khởi tạo | Khóa chính (PK) | Khóa ngoại (FK) Thực tế | Test Verified? |
|:---:|---|---|---|---|---|:---:|
| 1 | `users` | `backend/app/db/postgres/models/user.py:19` | ORM `create_all` + Alembic `0186c646946f` (lệch cột!) + `ALTER TABLE` (`database.py:75,86–90`) | `user_id` (`UUID`) | **Không có FK** (`department_id` là UUID trần!) | `TEST VERIFIED` (`test_user_admin_api.py`) |
| 2 | `password_reset_otps` | `backend/app/db/postgres/models/otp.py:18` | ORM `create_all` (`database.py:59`) | `id` (`UUID`) | **Không có FK** (dùng `email`) | `NOT VERIFIED` |
| 3 | `audit_logs` | `backend/app/db/postgres/models/audit_log.py:17` | ORM `create_all` + `ALTER TABLE` (`database.py:79–83`) | `audit_id` (`UUID`) | **Không có FK** (`actor_id` là UUID trần) | `TEST VERIFIED` (`test_user_admin_api.py`) |
| 4 | `copilot_sessions` | `backend/app/db/postgres/models/copilot_session.py:19` | ORM `create_all` + `ALTER TABLE` (`database.py:66–71`) | `id` (`UUID`) | `user_id → users.user_id` (`ON DELETE CASCADE`) | `TEST VERIFIED` (`test_copilot_postgres.py`, `test_copilot_pin_session.py`) |
| 5 | `sop_documents` | `backend/app/db/postgres/models/sop_document.py:20` | ORM `create_all` (`database.py:59`) | `id` (`UUID`) | `author_id → users.user_id` (`ON DELETE SET NULL`) | `TEST VERIFIED` (`test_sop_api.py`) |
| 6 | `knowledge_permissions` | `backend/app/db/postgres/models/knowledge_permission.py:13` | ORM `create_all` (`database.py:59`) | `id` (`UUID`) | Không có FK (`UNIQUE(domain, role)`) | `NOT VERIFIED` |
| 7 | `shift_reports` | `backend/app/db/postgres/models/shift_report.py:20` | ORM `create_all` (`database.py:59`) | `id` (`UUID`) | `author_id → users.user_id` (`ON DELETE SET NULL`) | `TEST VERIFIED` (`test_department_report.py`) |
| 8 | `knowledge_access_policies` | `backend/app/modules/m6_admin_security/rbac_matrix_model.py:15` | ORM `create_all` + raw `CREATE TABLE` (`rbac_matrix_service.py:56`) | `id` (`UUID`) | **Không có FK** (`updated_by` là UUID trần; `UNIQUE(role_code, department_code, resource_type)`) | `TEST VERIFIED` (`test_department_scope.py`) |
| 9 | `knowledge_upload_approvals` | `backend/app/modules/m6_admin_security/document_approval_model.py:15` | ORM `create_all` + raw `CREATE TABLE` (`document_approval_router.py:99`) | `id` (`UUID`) | **Không có FK** (`uploaded_by_id` là UUID trần) | `TEST VERIFIED` (`test_document_approval*.py`) |
| 10 | `user_active_sessions` | `backend/app/modules/m6_admin_security/session_service.py:37` | **Chỉ raw SQL `CREATE TABLE IF NOT EXISTS`** (không có ORM Model!) | `user_id` (`UUID`) | **Không có FK** tới `users.user_id`! | `TEST VERIFIED` (`test_concurrent_login.py`) |
| 11 | `pb56_workstations` | `backend/app/modules/m1_data_sync/pb56_workstation_model.py:23` + `pb56_workstations_migration.sql:6` | SQL Migration + raw `CREATE TABLE` (`pb56_workstation_service.py:91`) | `id` (`VARCHAR(64)`) | Không có FK | `TEST VERIFIED` (`test_pb56_workstations.py`) |
| 12 | `pb56_workstation_sync_logs` | `pb56_workstation_model.py:76` + `pb56_workstations_migration.sql:33` | SQL Migration + raw `CREATE TABLE` | `id` (`UUID`) | `workstation_id → pb56_workstations.id` (`ON DELETE CASCADE`); `UNIQUE(workstation_id, report_id)` | `TEST VERIFIED` (`test_pb56_workstations.py`) |
| 13 | `pb56_sync_mode_audit_logs` | `pb56_workstation_model.py:98` + `pb56_workstations_migration.sql:49` | SQL Migration + raw `CREATE TABLE` | `id` (`UUID`) | `workstation_id → pb56_workstations.id` (`ON DELETE CASCADE`) | `TEST VERIFIED` (`test_pb56_workstations.py`) |

*(Lưu ý: `database.py:76` còn chạy `ALTER TABLE rbac_permissions ...` trong khối `try/except pass`, đây là tàn dư bảng cũ không còn ORM model.)*

### 3.3. Cấu trúc Migration & Khởi tạo (`IMPLEMENTED` — Có khuyết tật nghiêm trọng)
1. **Alembic hỏng chuỗi lịch sử:**
   - `0186c646946f_initial_users_table.py`: Tạo bảng `users` với PK `id` và cột `hashed_password` (`VARCHAR(255)`), `username NOT NULL`. **Mâu thuẫn** với ORM `user.py` hiện tại dùng PK `user_id`, cột `password_hash`, `username NULLABLE`, `email VARCHAR(150)`.
   - `a93ce8369026_migrate_to_ekai_postgres_schema.py`: Hoàn toàn rỗng (`upgrade(): pass`, `downgrade(): pass`).
   - `alembic/env.py:24` import `from app.db.postgres.models import *` — nhưng `models/__init__.py` **chỉ export 6 model**, bỏ sót `ShiftReport`, `KnowledgeAccessPolicy`, `KnowledgeUploadApproval`, `PB56Workstation*`, và không có ORM model cho `user_active_sessions`.
2. **Ad-hoc Runtime DDL:** Thay vì Alembic, code tự chạy `CREATE TABLE IF NOT EXISTS` và `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` trong 5 file khác nhau (`database.py`, `session_service.py`, `rbac_matrix_service.py`, `document_approval_router.py`, `pb56_workstation_service.py`).
3. **Seed Script (`seed_users.py`):** Seed 6 tài khoản dev với mật khẩu yếu cố định và dùng lẫn lộn giá trị `role` (`"admin"`, `"executive"`, `"department_manager"`, `"standard_user"`, `"standard"` — không nhất quán).

---

## 4. Entity and Table Coverage Matrix

Đối chiếu 3 chiều **SRS Ver 1.2 → Database Design Ver 1.0 → Source Code**:

### 4.1. PostgreSQL Entities / Tables

| STT | Entity / Table | Trong SRS Ver 1.2 | Trong Database Design Ver 1.0 | Trong Source Code | Status | Issue |
|:---:|---|---|---|---|---|---|
| 1 | `users` | Có (Table 20, FR01–02) | Có (Table 8, `[TO BE VERIFIED]`) | Có (`models/user.py`) | `INCONSISTENT` | Khác tên PK (`id` vs `user_id`), khác độ dài `email` (255 vs 150), thiếu 8 cột bảo mật/hồ sơ, thừa cột `role`, `username`, `status`, `is_superuser`. |
| 2 | `otps` / `password_reset_otps` / `password_reset_tokens` | Có (`password_reset_tokens`, Table 20, FR60) | Có (`otps`, Table 9) | Có (`password_reset_otps`, `models/otp.py`) | `INCONSISTENT` | 3 nơi đặt 3 tên bảng khác nhau; code thiếu `user_id`, `purpose`, `used_at`, `ip_address`, `reset_token`. |
| 3 | `departments` | Có (Table 20, FR02) | Có (Table 10) | **Không có bảng** (hardcode `core/departments.py`) | `MISSING IN CODE` | Phòng ban chỉ tồn tại trong dict Python; `users.department_id` bị mồ côi không có bảng tham chiếu. |
| 4 | `roles` | Không (chỉ có trong BR-04) | Có (Table 11 — 4 roles) | **Không có bảng** (lưu string trong `users.role`) | `MISSING IN CODE` / `OUTDATED` | Design khóa cứng 4 roles (gộp Admin), vi phạm SRS BR-04; code không có bảng `roles`. |
| 5 | `permissions` | Không | Có (Table 12) | **Không có bảng** | `MISSING IN CODE` | Không được triển khai trong code. |
| 6 | `role_permissions` | Không | Có (Table 13) | **Không có bảng** | `MISSING IN CODE` | Không được triển khai; Table 13 thiếu Composite PK. |
| 7 | `user_roles` | Không | Có (Table 14) | **Không có bảng** | `MISSING IN CODE` | Không được triển khai; mỗi user trong code chỉ giữ 1 `role` string. |
| 8 | `knowledge_scope_policies` / `knowledge_access_policies` / `rbac_permissions_matrix` | Có (`rbac_permissions_matrix`, Table 20, FR58) | Có (`knowledge_scope_policies`, Table 15) | Có (`knowledge_access_policies`, `rbac_matrix_model.py`) | `INCONSISTENT` | 3 tên bảng khác nhau; cấu trúc cột hoàn toàn khác (Design dùng `access_level` + `filter_expression JSONB`; Code dùng 5 cờ boolean `can_query`, `can_view_citation`, `can_edit`, `can_upload`, `can_view_sensitive` + `data_scope`). |
| 9 | `knowledge_permissions` | Không | **Không có** | Có (`models/knowledge_permission.py`) | `MISSING IN DOCUMENT` | Bảng phân quyền miền đơn giản `(domain, role, allowed)` tồn tại song song với `knowledge_access_policies` — dư thừa/chồng lấn cần làm rõ. |
| 10 | `user_active_sessions` | Có (Table 20, FR59) | **Không có** | Có (`session_service.py:37`) | `MISSING IN DOCUMENT` | Thiếu hoàn toàn trong Design Ver 1.0; trong code chưa có ORM model và thiếu FK tới `users`. |
| 11 | `knowledge_upload_approvals` / `document_approvals` | Có (`documents` + `document_approvals`, Table 20, FR53–54) | **Không có** | Có (`knowledge_upload_approvals`, `document_approval_model.py`) | `MISSING IN DOCUMENT` | Thiếu hoàn toàn trong Design Ver 1.0 (US60–US61 / PB67–PB68). |
| 12 | `shift_reports` | Có (Table 20, FR55–56) | **Không có** | Có (`models/shift_report.py`) | `MISSING IN DOCUMENT` | Thiếu hoàn toàn trong Design Ver 1.0 (US62–US63 / PB69–PB70). |
| 13 | `shift_daily_summaries` | Có (Table 20, FR57) | **Không có** | **Không có bảng** (tính động) | `MISSING IN DOCUMENT` / `MISSING IN CODE` | SRS Ver 1.2 yêu cầu lưu trữ tổng hợp ca ngày, nhưng cả Design lẫn Code đều chưa có bảng. |
| 14 | `aegis_local_agents` / `pb56_workstations` | Có (FR07, FR62) | Có (`aegis_local_agents`, Table 18) | Có (`pb56_workstations`, `pb56_workstation_model.py`) | `INCONSISTENT` | Khác tên bảng, khác kiểu PK (`UUID` vs `VARCHAR(64)`), khác `heartbeat_interval_sec` (60 vs 30), khác cơ chế quản lý folder và sync mode command. |
| 15 | `agent_watched_folders` | Có (FR15) | Có (Table 19) | **Không có bảng** (gộp vào `pb56_workstations.monitored_folder`) | `MISSING IN CODE` | Code chỉ hỗ trợ 1 thư mục/máy trạm thay vì 1:N. |
| 16 | `data_connectors` | Có (FR04, FR19 [Optional]) | Có (Table 17) | **Không có bảng** (`google_connector.py` không dùng DB table) | `MISSING IN CODE` | Chưa lưu cấu hình OAuth connector vào PostgreSQL. |
| 17 | `sync_jobs` + `sync_audit_logs` / `pb56_workstation_sync_logs` | Có (FR08–09) | Có (`sync_jobs` Table 20 + `sync_audit_logs` Table 21) | Có (`pb56_workstation_sync_logs`, `pb56_workstation_model.py` + `watcher_sync_logs.json`) | `INCONSISTENT` | Code gộp nhật ký đồng bộ vào `pb56_workstation_sync_logs` và file JSON phẳng, không có `sync_jobs`/`sync_audit_logs`. |
| 18 | `pb56_sync_mode_audit_logs` | Có (FR14, FR62) | **Không có** | Có (`pb56_workstation_model.py:98`) | `MISSING IN DOCUMENT` | Bảng kiểm toán chuyển đổi chế độ đồng bộ của AEGIS vắng mặt trong Design Ver 1.0. |
| 19 | `raw_documents` / `documents` | Có (`documents`, Table 20, FR53) | Có (`raw_documents`, Table 22) | **Không có bảng PostgreSQL** (lưu ở Neo4j `:Document` + `watcher_ingested_docs.json`) | `MISSING IN CODE` | Thiết kế coi `raw_documents` là "bảng trung tâm liên kết 3 DBMS", nhưng thực tế code không có bảng này trong PostgreSQL! |
| 20 | `sop_articles` / `sop_documents` | Có (FR26, UC.14) | Có (`sop_articles`, Table 23) | Có (`sop_documents`, `models/sop_document.py`) | `INCONSISTENT` | Khác tên bảng và phần lớn cột (`slug`, `content_markdown`, `content_html` trong Design vs `code`, `purpose`, `steps JSON`, `governance` trong Code). |
| 21 | `sop_article_versions` | Không bắt buộc | Có (Table 24) | **Không có bảng** | `MISSING IN CODE` | Chưa triển khai lịch sử phiên bản SOP. |
| 22 | `entity_extraction_reviews` | Có (FR24, UC.13) | Có (Table 25) | **Không có bảng** | `MISSING IN CODE` | Chỉnh sửa đồ thị thao tác trực tiếp trên Neo4j, chưa có bảng staging review trên PostgreSQL. |
| 23 | `knowledge_gaps` | Có (UC.15 / Admin) | Có (Table 26) | **Không có bảng** | `MISSING IN CODE` | Chưa triển khai bảng lưu trữ câu hỏi thất bại trong PostgreSQL. |
| 24 | `chat_sessions` / `copilot_sessions` | Có (FR27, FR39, UC.18) | Có (`chat_sessions`, Table 27) | Có (`copilot_sessions`, `models/copilot_session.py`) | `INCONSISTENT` | Khác tên bảng; code gộp `messages` dạng mảng `JSON` vào cùng bảng thay vì tách bảng. |
| 25 | `chat_messages` | Có (FR27, UC.15) | Có (Table 28) | **Không có bảng** (nhúng trong `copilot_sessions.messages JSON`) | `MISSING IN CODE` | Thiết kế chuẩn hóa 3NF nhưng code chọn denormalization (`ponytail:` comment). |
| 26 | `message_citations` | Có (FR32, UC.17) | Có (Table 29) | **Không có bảng** (nhúng trong JSON message) | `MISSING IN CODE` | Không có bảng riêng trong PostgreSQL. |
| 27 | `user_feedback` | Có (Đánh giá chất lượng) | Có (Table 30) | **Không có bảng** | `MISSING IN CODE` | Chưa triển khai bảng lưu phản hồi upvote/downvote. |
| 28 | `llm_cost_usage_logs` | Có (FR12, UC.05 [Optional]) | Có (Table 31) | **Không có bảng** | `MISSING IN CODE` | Chưa có bảng lưu log token/latency LLM trong PostgreSQL. |
| 29 | `system_audit_trails` / `audit_logs` | Có (`audit_logs`, Table 20, FR06, BR-03) | Có (`system_audit_trails`, Table 32) | Có (`audit_logs`, `models/audit_log.py`) | `INCONSISTENT` | Design dùng `BIGSERIAL` + 17 cột (IP, before/after state JSONB); Code dùng `UUID` (`audit_id`) + 8 cột tối giản. |
| 30 | `system_alerts` | Có (FR42, UC.20) | Có (Table 33) | **Không có bảng** (tính động từ Neo4j) | `MISSING IN CODE` / `OUTDATED` | Design thiếu 2 loại alert của SRS FR42 (`NEGATIVE_MARGIN`, `ABNORMAL_DISCOUNT`). |
| 31 | `alert_recipients` | Có (UC.20) | Có (Table 34) | **Không có bảng** | `MISSING IN CODE` | Chưa triển khai hộp thư nhắc việc cá nhân trong DB. |
| 32 | `executive_briefings` | Có (FR44, UC.21 [Optional]) | Có (Table 35) | **Không có bảng** | `MISSING IN CODE` / `OUTDATED` | Bảng có cột `file_format CHECK IN ('PDF','DOCX')` vi phạm phạm vi Out-of-Scope của Proposal Ver 1.2 §4.2 & SRS FR44. |

### 4.2. Neo4j Labels & Qdrant Collections Coverage

| Hệ quản trị | Thành phần | Trong Database Design Ver 1.0 | Trong Source Code Thực tế | Status |
|---|---|---|---|---|
| **Neo4j** | `:Customer`, `:Product`, `:Category`, `:SubCategory`, `:SalesOrder`, `:Department`, `:Clause`, `:Employee` | Có (Tables 38–47) | Có (`semantic_layer.py`, `ingest_*.py`) | `PARTIALLY DOCUMENTED` / `INCONSISTENT` (khác tên thuộc tính & kiểu dữ liệu) |
| **Neo4j** | `:Contract` vs `:Document` | Design dùng `:Contract` (Table 44) | Code dùng `:Document` (595 nodes, `semantic_layer.py:146`) | `INCONSISTENT` |
| **Neo4j** | `:Vendor` vs `:Company` | Design dùng `:Vendor` (Table 46) | Code dùng `:Company` (1.891 nodes, `semantic_layer.py:183`) | `INCONSISTENT` |
| **Neo4j** | `:SOP_Document` | Có (Table 48) | Không có trong `SCHEMA_REGISTRY` (`semantic_layer.py`) | `MISSING IN CODE` |
| **Neo4j** | `[:PURCHASED]` | **Không có** | Có (`Customer -> Product`, `link_purchased.py`, `semantic_layer.py:68`) | `MISSING IN DOCUMENT` |
| **Neo4j** | `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]` | Design ghi `[:HAS_CLAUSE]`, `[:BOUND_BY_CONTRACT]` | Code dùng `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]` (`neo4j/client.py:212–213`) | `INCONSISTENT` |
| **Neo4j** | `[:SOLD_BY]`, `[:SUPPLIED_BY]`, `[:SUPPLIED_UNDER]`, `[:MANAGED_BY]`, `[:REFERS_TO]`, `[:RELATED_TO]` | Có (Table 49) | **Không tìm thấy trong ingest scripts / `SCHEMA_REGISTRY`** (`semantic_layer.py:418` xác nhận 0 Employee gắn SalesOrder) | `MISSING IN CODE` |
| **Qdrant** | `cuad_contracts` | Có (384-dim, Cosine) | Có (384-dim, Cosine, `qdrant/client.py:121, 134`) | `FULLY DOCUMENTED` (nhưng payload thực tế dùng `doc_id`, `department`, `source_file`, `entity_type`, `table`) |
| **Qdrant** | `adventureworks_entities` / `adventureworks_datasets` | **Không có** (Design đặt tên `business_records`) | Có (`main.py:537, 2069`, `ingest_adventureworks_vectors.py:7`) | `INCONSISTENT` |
| **Qdrant** | `sop_knowledge_base` | Có (Table 52) | **Không tìm thấy trong Code** | `MISSING IN CODE` |

---

## 5. Attribute and Data Type Analysis

Bảng đối chiếu chi tiết các thuộc tính sai lệch, thiếu hoặc có nguy cơ dữ liệu giữa **Database Design Ver 1.0**, **Source Code**, và **SRS Ver 1.2**:

| Table | Column | Database Design Ver 1.0 | Source Code | Expected Requirement (SRS Ver 1.2) | Status | Recommendation |
|---|---|---|---|---|---|---|
| `users` | PK (`id` vs `user_id`) | `id UUID PK` | `user_id UUID PK` (nhưng Alembic `0186` tạo `id`!) | `id` hoặc `user_id` thống nhất | `INCONSISTENT` | Chốt `user_id` theo ORM đang chạy (hoặc tạo migration chuẩn hóa), đồng bộ lại tài liệu và Alembic. |
| `users` | `email` | `VARCHAR(255) UNIQUE NOT NULL` | `VARCHAR(150) UNIQUE NOT NULL` (Alembic `0186` là 255) | Chuẩn RFC 5321 tối đa 254 ký tự | `INCONSISTENT` | Chuẩn hóa về `VARCHAR(255)` trên cả ORM và tài liệu. |
| `users` | `password_hash` | `VARCHAR(255) NOT NULL` | `String` (không giới hạn độ dài; Alembic là `hashed_password VARCHAR(255)`) | Bcrypt hash (60 ký tự) | `INCONSISTENT` | Chỉ rõ `VARCHAR(255)` trong ORM và khớp tên cột với Alembic. |
| `users` | `full_name` | `VARCHAR(150) NOT NULL` | `VARCHAR(150) NULL` | Nên `NOT NULL` | `INCONSISTENT` | Xác nhận nghiệp vụ: nếu bắt buộc khi tạo tài khoản thì đổi thành `NOT NULL`. |
| `users` | `role` | Không có (tách bảng `user_roles`) | `VARCHAR(50) NOT NULL DEFAULT 'standard_user'` | 5 vai trò theo BR-04 | `INCONSISTENT` | Nếu giữ mô hình đơn vai trò theo code, bổ sung `role` + `CHECK` constraint cho đúng mã vai trò chuẩn (`it_admin`, `knowledge_manager`, `executive`, `department_manager`, `standard_user`). |
| `users` | `failed_login_attempts`, `locked_until` | `INT DEFAULT 0`, `TIMESTAMPTZ NULL` | **Thiếu trong ORM `user.py`** | UC.01 E1: khóa tạm 15 phút sau 5 lần sai | `MISSING IN CODE` | Bổ sung 2 cột này vào `users` để thực thi chống brute-force ở tầng DB. |
| `password_reset_otps` | `otp_hash` vs `otp_code_hash` | `otp_code_hash VARCHAR(255)` | `otp_hash VARCHAR(64)` (SHA-256) | FR60: OTP 6 số, hiệu lực 300s, sai 3 lần hủy | `INCONSISTENT` | Đồng bộ tên bảng/cột; khuyến nghị nâng cấp hash lên HMAC-SHA256 hoặc bcrypt (`VARCHAR(255)`). |
| `password_reset_otps` | `reset_token` | Không có | Không có trong `otp.py` | FR60 bước 2: cấp `reset_token` tạm sau khi xác thực OTP | `UNCERTAIN` | Kiểm tra `forgot_password_router.py` xem `reset_token` là JWT stateless hay lưu DB; ghi rõ vào DBD. |
| `audit_logs` | PK (`id` vs `audit_id`) | `id BIGSERIAL PK` (`system_audit_trails`) | `audit_id UUID PK` (`audit_logs`) | SRS Table 20: `id UUID PK` | `INCONSISTENT` | Cập nhật DBD sang `audit_logs` (`audit_id UUID` hoặc `BIGSERIAL`), bổ sung cột `ip_address`, `severity_level` nếu phục vụ an ninh. |
| `copilot_sessions` | `messages` | Tách bảng `chat_messages` (3NF) | `JSON NOT NULL DEFAULT []` | FR27, FR32, UC.18 | `INCONSISTENT` | Ghi nhận rõ quyết định denormalization (`JSONB` khuyến nghị thay cho `JSON` để hỗ trợ index/truy vấn tốt hơn trong PostgreSQL). |
| `sop_documents` | `tags`, `steps` | `tags TEXT[]`, `content_markdown TEXT` | `tags JSON`, `steps JSON`, `purpose TEXT` | FR26, UC.14 | `INCONSISTENT` | Cập nhật DBD khớp chính xác cấu trúc `sop_documents` thực tế; đổi `JSON` → `JSONB` nếu cần lọc theo tag. |
| `knowledge_upload_approvals` | `file_size` | `raw_documents.file_size_bytes BIGINT` | `file_size INTEGER` (`document_approval_model.py:20`) | Giới hạn 25–50 MB (FR53) | `PARTIALLY DOCUMENTED` | `INTEGER` đủ cho 50 MB (~52 triệu bytes), nhưng `BIGINT` an toàn hơn về lâu dài. |
| `knowledge_upload_approvals` | `checksum_sha256` | `raw_documents.checksum_sha256 CHAR(64)` | **Thiếu cột hash trong bảng** | BR-06 / FR53: chống trùng lặp SHA-256 | `MISSING IN CODE` | Bổ sung `sha256_hash CHAR(64)` kèm `INDEX` vào `knowledge_upload_approvals` để tra cứu trùng lặp ngay ở hàng đợi chờ duyệt. |
| `shift_reports` | `cases` | Không có bảng | `JSON NOT NULL DEFAULT []` | FR55–56 | `MISSING IN DOCUMENT` | Bổ sung bảng `shift_reports` vào DBD; nêu rõ cấu trúc JSON schema `[{time, customer, issue, solution, ref, status}]`. |
| `pb56_workstations` | `heartbeat_interval_sec` | `INT DEFAULT 60` (`aegis_local_agents`) | `INT DEFAULT 30` (`pb56_workstation_model.py:45`) | SRS UC.07 E1: 30s | `INCONSISTENT` | Cập nhật DBD thành `DEFAULT 30`. |
| `executive_briefings` | `file_format` | `VARCHAR(10) CHECK IN ('PDF','DOCX')` | Không tồn tại trong code | SRS FR44 & Proposal §4.2: **PDF/Word export is Out-of-Scope** | `OUTDATED` | **Loại bỏ** cột `file_format`, `file_uri`, `file_size_bytes` khỏi thiết kế. |
| `system_alerts` | `alert_type` | 8 loại alert (thiếu Margin & Discount) | Không có bảng | SRS FR42: bổ sung `NEGATIVE_MARGIN` & `ABNORMAL_DISCOUNT` ($\ge 35\%$) | `OUTDATED` | Bổ sung 2 giá trị vào `CHECK` constraint nếu triển khai bảng `system_alerts`. |
| Neo4j `:SalesOrder` | `orderDate` / `OrderDate` | `orderDate DATE` | `OrderDate` & `orderDate` kiểu `STRING (YYYY-MM-DD)` (`semantic_layer.py:79–80`) | Truy vấn khoảng thời gian | `INCONSISTENT` | Chuẩn hóa 1 quy ước tên thuộc tính duy nhất (tránh lưu song song cả `OrderDate` và `orderDate`, `TotalDue` và `totalDue`!). |

---

## 6. Primary Key and Foreign Key Assessment

### 6.1. Đánh giá Primary Key (PK)
- **Trong Database Design Ver 1.0:**
  - Quy ước chung tốt (Table 7: `UUID` cho bảng nghiệp vụ, `BIGSERIAL` cho bảng log lớn).
  - **Khuyết tật nghiêm trọng (CRITICAL):** **3 bảng trung gian (Junction Tables)** bị **thiếu khai báo Primary Key** trong cột `Key / Constraint`:
    - `role_permissions` (Table 13): thiếu `PRIMARY KEY (role_id, permission_id)`.
    - `user_roles` (Table 14): thiếu `PRIMARY KEY (user_id, role_id, scope_department_id)` (hoặc surrogate PK `id UUID` vì `scope_department_id` có thể NULL — trong PostgreSQL cột PK không được NULL!).
    - `alert_recipients` (Table 34): thiếu `PRIMARY KEY (alert_id, user_id)`.
- **Trong Source Code:**
  - Tất cả 13 bảng đều có PK hợp lệ (`UUID` cho 12 bảng, `VARCHAR(64)` cho `pb56_workstations.id`).
  - `user_active_sessions` dùng `user_id UUID PRIMARY KEY` — thiết kế thông minh vì ép cứng 1:1 (mỗi user tối đa 1 dòng active session) ngay ở tầng Primary Key!

### 6.2. Đánh giá Foreign Key (FK) & Referential Integrity
- **Trong Database Design Ver 1.0 (CRITICAL):**
  - Toàn bộ ô `Key / Constraint` của các cột FK trong Tables 10–37 đều bị **trắng hoàn toàn** (chỉ mô tả bằng chữ ở Section 6 Tables 66–69). Tài liệu vật lý không thể chuyển trực tiếp thành DDL nếu thiếu khai báo `FK REFERENCES <table>(<col>) ON DELETE ...`.
- **Trong Source Code (HIGH — Rủi ro toàn vẹn tham chiếu):**
  - Chỉ có **5/13 bảng** có Foreign Key thực sự trong PostgreSQL:
    1. `copilot_sessions.user_id → users.user_id` (`ON DELETE CASCADE`)
    2. `sop_documents.author_id → users.user_id` (`ON DELETE SET NULL`)
    3. `shift_reports.author_id → users.user_id` (`ON DELETE SET NULL`)
    4. `pb56_workstation_sync_logs.workstation_id → pb56_workstations.id` (`ON DELETE CASCADE`)
    5. `pb56_sync_mode_audit_logs.workstation_id → pb56_workstations.id` (`ON DELETE CASCADE`)
  - **5 cột tham chiếu quan trọng KHÔNG CÓ Foreign Key trong Code:**
    1. `user_active_sessions.user_id` — thiếu `REFERENCES users(user_id) ON DELETE CASCADE`.
    2. `knowledge_upload_approvals.uploaded_by_id` — thiếu `REFERENCES users(user_id) ON DELETE SET NULL`.
    3. `knowledge_access_policies.updated_by` — thiếu `REFERENCES users(user_id) ON DELETE SET NULL`.
    4. `audit_logs.actor_id` — thiếu `REFERENCES users(user_id) ON DELETE SET NULL` (lưu ý: cần `SET NULL` hoặc giữ nguyên UUID không FK nếu muốn lưu log vĩnh viễn kể cả khi xóa cứng user; vì `users` dùng soft-delete `deleted_at`, nên đặt `ON DELETE RESTRICT` hoặc `SET NULL` kèm ghi chú rõ).
    5. `users.department_id` — không có bảng `departments` để tham chiếu.

### 6.3. Cascade Rules Recommendation
| Quan hệ (Parent → Child) | Quy tắc đề xuất | Lý do nghiệp vụ |
|---|---|---|
| `users → copilot_sessions` | `ON DELETE CASCADE` (Đã có trong code) | Phiên chat cá nhân gắn với chủ sở hữu; tuy nhiên `users` dùng soft-delete nên dữ liệu vẫn được bảo toàn. |
| `users → user_active_sessions` | `ON DELETE CASCADE` | Xóa tài khoản thì phiên đăng nhập phải bị xóa ngay. |
| `users → shift_reports` | `ON DELETE SET NULL` (Đã có trong code) | Bảo toàn lịch sử báo cáo ca của doanh nghiệp ngay cả khi nhân sự nghỉ việc. |
| `users → sop_documents` | `ON DELETE SET NULL` (Đã có trong code) | Tài liệu SOP thuộc tài sản doanh nghiệp, không được xóa theo tác giả. |
| `users → knowledge_upload_approvals` | `ON DELETE SET NULL` | Giữ lịch sử phê duyệt tài liệu (cùng `uploaded_by_email`). |
| `users → audit_logs` | `ON DELETE RESTRICT` (hoặc `SET NULL`) | Bảo vệ tính bất biến lịch sử kiểm toán (BR-03). |
| `pb56_workstations → pb56_workstation_sync_logs` | `ON DELETE CASCADE` (Đã có trong code) | Nhật ký gắn với trạm máy; nếu cần lưu vết dài hạn cho kiểm toán, cân nhắc soft-delete máy trạm. |

---

## 7. Relationship and Cardinality Analysis

| Entity A | Entity B | Relationship trong Design Ver 1.0 | Relationship trong Code | Expected Relationship | Status |
|---|---|---|---|---|---|
| `departments` | `users` | `1:N` (`users.department_id`) | Không có bảng `departments`; `users.department_id` là UUID rời | `1:N` (nếu có bảng `departments`) hoặc `department_code VARCHAR(50)` nhất quán | `INCONSISTENT` |
| `users` | `roles` | `N:M` qua `user_roles` | `1:1` đơn trị (`users.role VARCHAR(50)`) | `N:1` (1 role cho 1 user là đủ cho SME, khớp SRS & Code) | `INCONSISTENT` |
| `users` | `user_active_sessions` | **Không có** | `1:0..1` (`user_active_sessions.user_id PK`, thiếu FK) | `1:0..1` kèm `FK ON DELETE CASCADE` (FR59) | `MISSING IN DOCUMENT` |
| `users` | `shift_reports` | **Không có** | `1:N` (`shift_reports.author_id FK SET NULL`) | `1:N` (optionality: user có 0..N báo cáo) | `MISSING IN DOCUMENT` |
| `users` | `knowledge_upload_approvals` | **Không có** | `1:N` logic (`uploaded_by_id`, thiếu FK) | `1:N` kèm `FK ON DELETE SET NULL` | `MISSING IN DOCUMENT` |
| `users` | `copilot_sessions` | `1:N` (`chat_sessions.user_id`) | `1:N` (`copilot_sessions.user_id FK CASCADE`) | `1:N` (tên bảng: `copilot_sessions`) | `PARTIALLY DOCUMENTED` |
| `copilot_sessions` | `chat_messages` | `1:N` (2 bảng riêng) | Gộp `1:1` (mảng `JSON` trong `copilot_sessions`) | Khớp thực tế code (ghi rõ lý do denormalization) | `INCONSISTENT` |
| `pb56_workstations` | `agent_watched_folders` | `1:N` (`aegis_local_agents → agent_watched_folders`) | `1:1` (cột `monitored_folder` trên `pb56_workstations`) | Khớp code (`1:1`) hoặc mở rộng bảng con ở Ver 2.0 | `INCONSISTENT` |
| `pb56_workstations` | `pb56_workstation_sync_logs` | `1:N` (`aegis_local_agents → sync_jobs`) | `1:N` (`workstation_id FK CASCADE`) | `1:N` | `INCONSISTENT` |
| `pb56_workstations` | `pb56_sync_mode_audit_logs` | **Không có** | `1:N` (`workstation_id FK CASCADE`) | `1:N` | `MISSING IN DOCUMENT` |
| Neo4j `:Customer` | `:Product` | Không nối trực tiếp (chỉ qua `:SalesOrder`) | Có cạnh tắt `[:PURCHASED]` (`link_purchased.py`) | Ghi nhận cạnh tắt `[:PURCHASED]` để tối ưu truy vấn | `MISSING IN DOCUMENT` |
| Neo4j `:Company` | `:Document` | `:Customer -[:BOUND_BY_CONTRACT]-> :Contract` | `:Company -[:PARTY_TO]-> :Document` | Đồng bộ tên nhãn và quan hệ theo đồ thị thực tế | `INCONSISTENT` |
| Neo4j `:Document` | `:Clause` | `:Contract -[:HAS_CLAUSE]-> :Clause` | `:Document -[:CONTAINS_CLAUSE]-> :Clause` | Đồng bộ tên quan hệ theo đồ thị thực tế | `INCONSISTENT` |

---

## 8. Database Normalization Assessment

### 8.1. Đánh giá trên Database Design Ver 1.0 (Thiết kế)
- **1NF:** Đạt (các thuộc tính nguyên tử; dùng `TEXT[]` cho danh sách ngắn `tags`, `include_patterns` là chấp nhận được trong PostgreSQL).
- **2NF:** Đạt ở các bảng có surrogate PK `UUID`. Tuy nhiên, 3 bảng trung gian (`role_permissions`, `user_roles`, `alert_recipients`) chưa khai báo PK trong bảng vật lý nên chưa hoàn thiện định nghĩa khóa.
- **3NF:** Đạt tốt ở mức thiết kế. Điểm đáng chú ý: `users` không chứa `department_name`, `chat_messages` tách khỏi `chat_sessions`. Ngoại lệ có chủ đích (denormalization chấp nhận được): `Customer.totalOrderValue` và `SalesOrder.fiscalQuarter` trên Neo4j để tăng tốc truy vấn tổng hợp.

### 8.2. Đánh giá trên Source Code Thực tế (Phân biệt Denormalization có chủ đích vs. Lỗi chuẩn hóa)

| Table trong Code | Cột có vấn đề | Dạng chuẩn | Phân loại & Nguyên nhân | Tác động | Khuyến nghị |
|---|---|---|---|---|---|
| `copilot_sessions` | `messages` (`JSON`) | Vi phạm 1NF (mảng nhiều giá trị) | **Denormalization có chủ đích** (có comment `# ponytail: split to copilot_messages table if sessions exceed thousands of turns`). | Không thể query SQL trực tiếp lên từng tin nhắn/trích dẫn hoặc thống kê token/latency bằng SQL; ghi đè cả mảng JSON mỗi lần gửi tin. | **Chấp nhận trong phạm vi Capstone MVP**, nhưng cần đổi `JSON` → `JSONB` và ghi rõ giới hạn (ceiling) trong DBD Ver 1.1. |
| `shift_reports` | `cases` (`JSON`), `author_name`, `username` | Vi phạm 1NF (`cases`) & 3NF (`author_name`, `username` phụ thuộc bắc cầu vào `author_id`) | `cases` là **denormalization có chủ đích** (`# ponytail:`). `author_name`/`username` là snapshot tại thời điểm nộp báo cáo (hợp lý về mặt kiểm toán!). | Nếu user đổi tên, báo cáo cũ giữ nguyên tên lúc ký — đây là hành vi mong muốn cho chứng từ ký duyệt. | **Giữ nguyên** và giải trình rõ trong DBD là *Audit Snapshot Denormalization*. |
| `sop_documents` | `steps` (`JSON`), `tags` (`JSON`), `author_name` | Vi phạm 1NF (`steps`, `tags`) & 3NF (`author_name`) | **Denormalization có chủ đích** (`# ponytail:`). | Không cần join nhiều bảng khi đọc 1 bài SOP. | **Giữ nguyên**, cân nhắc chuyển `JSON` → `JSONB` để tạo GIN index tìm kiếm tag. |
| `users` | `status` + `is_active` | Dư thừa dữ liệu (Update Anomaly) | Lưu song song 2 cột biểu diễn cùng trạng thái hoạt động (`set_status()` đồng bộ bằng code Python, `user.py:73–75`). | Nếu cập nhật trực tiếp qua SQL mà quên cột kia sẽ gây mâu thuẫn (`status='locked'` nhưng `is_active=True`). | Thêm `CHECK ((status = 'active') = is_active)` ở DB hoặc loại bỏ 1 cột ở phiên bản sau. |
| `knowledge_upload_approvals` | `uploaded_by_email`, `uploaded_by_role` | Phụ thuộc bắc cầu vào `uploaded_by_id` (3NF) | Lưu snapshot thông tin người tải lên. | Chấp nhận được cho mục đích lịch sử kiểm duyệt, nhưng cần thêm FK `uploaded_by_id`. | Giữ snapshot, bổ sung FK `ON DELETE SET NULL`. |
| `knowledge_permissions` vs `knowledge_access_policies` | Trùng lặp chức năng bảng | Dư thừa ở cấp Schema | Hai bảng phân quyền tồn tại song song trong cùng CSDL (`models/knowledge_permission.py` và `rbac_matrix_model.py`). | Gây nhầm lẫn nguồn chân lý phân quyền (Dual Source of Truth). | Rà soát code gọi `knowledge_permissions`; nếu đã thay thế bởi `knowledge_access_policies`, loại bỏ bảng thừa. |
| Neo4j `:SalesOrder`, `:Product`, `:Customer` | Lưu trùng cặp thuộc tính hoa/thường (`TotalDue`/`totalDue`, `SubTotal`/`subTotal`, `OrderDate`/`orderDate`, `Name`/`name`, `id`/`SalesOrderID`) | Dư thừa thuộc tính nghiêm trọng | Do các script ingest khác nhau dùng quy ước đặt tên khác nhau (`semantic_layer.py:76–88`). | Phải viết `coalesce(o.totalDue, o.TotalDue, 0.0)` ở mọi câu Cypher; tăng dung lượng lưu trữ và rủi ro cập nhật lệch. | Chạy migration chuẩn hóa về **1 quy ước tên thuộc tính duy nhất** (ví dụ camelCase hoặc PascalCase) và cập nhật tài liệu DBD. |

---

## 9. Constraints and Data Integrity Assessment

| Loại Ràng buộc | Trạng thái trong Design Ver 1.0 | Trạng thái trong Source Code | Đánh giá & Đề xuất |
|---|---|---|---|
| **NOT NULL** | Đặc tả đầy đủ | Tương đối đầy đủ trên các cột chính | Bổ sung `NOT NULL` cho `users.full_name` nếu nghiệp vụ yêu cầu. |
| **UNIQUE** | Có khai báo cho email, code, composite keys | Đã có: `users.email`, `users.username`, `sop_documents.code`, `knowledge_permissions(domain, role)`, `knowledge_access_policies(role_code, department_code, resource_type)`, `pb56_workstation_sync_logs(workstation_id, report_id)` | Tốt! Riêng `knowledge_upload_approvals` thiếu cơ chế chống trùng lặp ở tầng DB (cần `sha256_hash` + partial unique index cho trạng thái `PENDING`/`APPROVED`). |
| **CHECK Constraints** | Design dùng `VARCHAR + CHECK IN (...)` rất bài bản (Table 7 R6) | **0 CHECK constraints** trong toàn bộ 13 bảng PostgreSQL ở Source Code! | Mọi kiểm tra enum (`users.status`, `users.role`, `shift_reports.status`, `sop_documents.status`, `knowledge_upload_approvals.status`, `pb56_workstations.sync_mode`) hiện chỉ nằm ở **Application Layer (Pydantic/Python)**. Cần bổ sung `CHECK` constraint ở DB cho các cột trạng thái cốt lõi để chống dữ liệu rác. |
| **Referential Integrity (FK)** | Bị bỏ trống trong bảng vật lý (Tables 10–37) | Chỉ 5/13 bảng có FK | Bổ sung FK cho `user_active_sessions`, `knowledge_upload_approvals`, `knowledge_access_policies`, `audit_logs` và điền đầy đủ vào DBD. |
| **Data Validation & Business Rules** | BR-01..BR-05 chưa gắn chặt vào bảng vật lý | BR-02, BR-04, BR-05 chủ yếu kiểm tra ở `core/rbac.py` và `rbac_matrix_service.py`; BR-06 (SHA-256) kiểm tra ở `central_storage.py` & `pipeline.py` | Phân định rõ trong DBD: ràng buộc nào bảo vệ ở DB (PK, FK, UNIQUE, CHECK, Immutability Trigger), ràng buộc nào ở Application Layer (RBAC multi-store filter, Cypher Guard AST). |

---

## 10. Indexing and Performance Assessment

### 10.1. PostgreSQL Indexing Audit
- **Trong Database Design Ver 1.0:** **HOÀN TOÀN THIẾU mục/bảng PostgreSQL Indexing Strategy** (chỉ có 1 câu gợi ý partitioning ở Table 31).
- **Trong Source Code (Đã có các index cơ bản, nhưng còn điểm yếu):**
  - *Đã có:* Single-column indexes trên `users` (`user_id`, `email`, `role`, `department_id`, `status`, `deleted_at`), `audit_logs` (`actor_id`, `action`, `created_at`), `copilot_sessions` (`user_id`, `is_pinned`, `is_shared`, `department`), `shift_reports` (`author_id`, `department`, `status`), `knowledge_access_policies(role_code, department_code)` & `(resource_type)`, `knowledge_upload_approvals` (`status`, `resource_type`, `department_code`), `user_active_sessions(active_session_token_id)`, `pb56_workstations` (`last_heartbeat_at`, `sync_mode_status`), và **Composite DESC indexes** tốt trên `pb56_workstation_sync_logs(workstation_id, created_at DESC)` và `pb56_sync_mode_audit_logs(workstation_id, created_at DESC)`.
  - *Index dư thừa phát hiện trong Code:* `users.user_id`, `copilot_sessions.id`, `shift_reports.id`, `sop_documents.id` vừa là `primary_key=True` vừa đặt `index=True` → SQLAlchemy tạo thêm một B-tree index trùng lặp với PK index! (Nên bỏ `index=True` trên cột PK).
  - *Thiếu Composite Index theo truy vấn thực tế:*
    - `shift_reports`: Truy vấn duyệt báo cáo theo phòng ban và trạng thái (`WHERE department = :d AND status = :s ORDER BY updated_at DESC`) hiện chỉ có 2 index đơn lẻ; nên xem xét composite index `(department, status, updated_at DESC)`.
    - `copilot_sessions`: Truy vấn danh sách phiên của user (`WHERE user_id = :u ORDER BY updated_at DESC`) nên có `(user_id, updated_at DESC)`.
    - `audit_logs`: Truy vấn lọc theo `actor_id` hoặc `action` sắp xếp theo thời gian nên có `(actor_id, created_at DESC)` và `(action, created_at DESC)`.
    - `password_reset_otps`: Truy vấn kiểm tra OTP hợp lệ (`WHERE email = :e AND is_used = false ORDER BY created_at DESC`) nên có `(email, is_used, expires_at)`.

### 10.2. Neo4j & Qdrant Performance Observations (Từ Source Code)
- **Neo4j Full-Scan Risk (`backend/app/db/neo4j/client.py:455–465`):** Hàm `search_nodes()` chạy `MATCH (n) WHERE any(prop IN keys(n) WHERE toLower(toString(n[prop])) CONTAINS toLower($q))` — đây là **Full Graph Scan** duyệt toàn bộ node và mọi thuộc tính! Cần sử dụng Full-Text Index (`entity_fulltext_idx`, `clause_text_idx`) như thiết kế ở Table 50 của DBD.
- **Qdrant Fallback Scan Risk (`backend/app/db/qdrant/client.py:433–448`):** Hàm `search_by_text()` dùng `scroll(limit=300)` rồi tìm chuỗi bằng Python (chỉ quét 300 điểm đầu tiên, bỏ sót dữ liệu nếu collection > 300 điểm!).
- **Qdrant Payload Indexes (`qdrant/client.py:143–144`):** Code chỉ tạo 2 payload index (`contract_name`, `doc_id`), **thiếu** các index bắt buộc cho RBAC filter (`department` / `department_scope`, `is_active`, `entity_type`, `document_id`) đã khuyến nghị trong Design Table 56.
- *(Ghi chú: Chưa có bằng chứng `EXPLAIN ANALYZE` hay Locust Benchmark kết quả thực tế trong kho mã nguồn để khẳng định độ trễ thực tế; các chỉ số hiệu năng cần được xác nhận bằng benchmark).*

---

## 11. Security and Privacy Assessment

| Hạng mục Bảo mật | Đánh giá Thiết kế (DBD Ver 1.0) | Đánh giá Source Code Thực tế | Mức độ & Khuyến nghị |
|---|---|---|---|
| **Password Hashing** | Đề xuất Bcrypt/Argon2 (Table 7 R10) | Dùng `bcrypt.gensalt()` (mặc định 12 rounds) trong `backend/app/core/security.py:27–30`. **ĐẠT** | Ghi rõ trong DBD: `bcrypt` (cost factor 12); sửa mâu thuẫn `PBKDF2` trong Architecture Doc Table 6.2. |
| **OTP Hashing** | `otp_code_hash VARCHAR(255)` | Dùng **SHA-256 không muối (unsalted)** trên OTP 6 số (`models/otp.py:35–36`)! | **HIGH:** Không gian 6 chữ số chỉ có $10^6$ giá trị; nếu lộ DB sẽ bị giải ngược trong < 1 giây. Nên dùng `HMAC-SHA256(SECRET_KEY, email + otp)` hoặc `bcrypt`. |
| **Audit Log Immutability (BR-03)** | Chỉ nêu quy tắc chung, không có cơ chế DB | Không có trigger/rule chặn `UPDATE`/`DELETE` trên bảng `audit_logs` ở tầng PostgreSQL. | **MEDIUM:** Bổ sung PostgreSQL `BEFORE UPDATE OR DELETE` trigger (hoặc thu hồi quyền `UPDATE, DELETE` của app DB role) để thực thi BR-03 ở tầng DB. |
| **Data Isolation / RBAC** | Thiết kế chặt qua `knowledge_scope_policies` + filter Cypher & Qdrant | Thực thi tốt ở tầng ứng dụng (`core/rbac.py`, `rbac_matrix_service.py`, `qdrant/client.py` Layer-1 `is_active` guard, `text_to_cypher.py` Cypher Guard). | Đồng bộ mô tả cơ chế Layer-1 Qdrant Guard và Read-Only Cypher Guard vào mục Database Security của DBD. |
| **Default Credentials & Seed Data** | Không đề cập | `config.py` và `docker-compose.yml` chứa giá trị fallback mật khẩu mặc định cho môi trường dev; `seed_users.py` tạo tài khoản với mật khẩu đơn giản. | **HIGH:** Tuyệt đối không dùng cấu hình fallback ở production; yêu cầu fail-fast nếu thiếu biến môi trường `.env` và vô hiệu hóa `seed_users.py` khi `APP_ENV != development`. *(Không trích xuất mật khẩu thực tế vào báo cáo).* |
| **SQL / Cypher Injection** | Không phân tích | PostgreSQL dùng SQLAlchemy ORM & parameterized `text()` (`:uid`, `:jti`) — tốt. Neo4j `client.py` sanitize `label`/`rel_type` bằng regex `[^a-zA-Z0-9_]` và dùng `$params`. | Duy trì parameterized queries; bổ sung đặc tả Read-Only Cypher Guard (FR61) vào DBD. |
| **Session & Account Lockout** | Thiết kế có `failed_login_attempts`, `locked_until`; thiếu `user_active_sessions` | Có `user_active_sessions` (Single Active Session JTI); **thiếu** cột `failed_login_attempts`, `locked_until` trong `users`. | Đồng bộ cả hai cơ chế trong cả DBD và Source Code. |

---

## 12. Architecture Consistency Assessment

Đối chiếu **Database Design Ver 1.0** vs. **Architecture Document Ver 1.0 (SAD)** vs. **Source Code**:

| Khía cạnh Kiến trúc | Database Design Ver 1.0 | Architecture Doc Ver 1.0 (SAD) | Source Code Thực tế | Mâu thuẫn / Ghi nhận |
|---|---|---|---|---|
| **PostgreSQL trong Deployment** | System of Record (27 bảng) | **Bỏ sót container PostgreSQL** trong Table 6.3 (Deployment View) và Table 6.1 (C&C View)! Chỉ nhắc 1 dòng ở CON-01. | Chạy native trên host (`host.docker.internal:5432`), không có trong `docker-compose.yml`. | **Mâu thuẫn nghiêm trọng:** SAD gần như "quên" PostgreSQL ở C&C View & Deployment View, trong khi DBD và Code đặt PostgreSQL làm System of Record. |
| **Embedding Model & Dimension** | `all-MiniLM-L6-v2` — **384 chiều** (Assumption A4, Table 52) | `nomic-embed-text` (Ollama) — **768 chiều** (FD-02, QAS-02, Table 6.1) | `SentenceTransformer("all-MiniLM-L6-v2")` — **384 chiều** (`qdrant/client.py:36, 134`) | **Mâu thuẫn 3 chiều:** DBD & Code khớp nhau (384-dim); SAD & SRS Ver 1.2 ghi sai thành 768-dim (`nomic-embed-text`). |
| **Container Versions** | Không ghi version | `neo4j:5.26-community`, `qdrant:v1.12.1` (Table 6.3) | `neo4j:5.18.0`, `qdrant/qdrant:v1.8.2` (`docker-compose.yml`) | SAD lệch phiên bản image so với `docker-compose.yml`. |
| **Deduplication Hash** | `SHA-256` (`CHAR(64)`) | `MD5` (FD-01, dòng 147) | `SHA-256` (`pipeline.py:12`, `shift_reports.py:54`) | SAD ghi sai `MD5` (yếu, lỗi thời); DBD và Code dùng `SHA-256` (đúng BR-06). |
| **Password Hashing** | `Bcrypt / Argon2` | `PBKDF2` (Table 6.2, `m6_admin_security`) | `bcrypt` (`security.py:7, 29`) | SAD ghi sai `PBKDF2`; Code dùng `bcrypt`. |
| **Frontend Stack** | `React / Next.js` (Table 4) | `React / Next.js` (§4.4, §5.2) + `Vite React SPA` (Table 6.3) | `React 18 + Vite SPA` | Cả DBD và phần lớn SAD đều lỗi thời (`Next.js`). |
| **System Roles** | 4 roles gộp Admin (Table 16) | 3 stakeholder groups (Table 2.2) / 3 human actors (Table 4) | 4–5 role codes (`it_admin`/`admin`, `knowledge_manager`/`department_manager`, `executive`, `standard_user`/`standard`) | Cả DBD, SAD và Code đều chưa đồng nhất hoàn toàn với 5 vai trò chuẩn BR-04 của SRS Ver 1.2. |
| **Deployment Model** | Hybrid (Local Agent + Backend) | Tự mâu thuẫn trong §5.2 (dòng 293 ghi "Backend hosted on cloud", dòng 294 ghi "No component hosted on public cloud") | On-premise Docker Compose + Host Ollama + Host PostgreSQL | Cần thống nhất 1 mô hình triển khai xuyên suốt SAD và DBD. |

---

## 13. Requirement Traceability Matrix (Tóm tắt)

Truy vết đầy đủ 7 chiều (**Proposal → US → PBI → SRS → Architecture → Database Design → Source Code**) được xuất chi tiết tại tệp riêng: **`GraphMind-DatabaseDesign-Traceability-Matrix.md`**.

Tóm tắt độ phủ dữ liệu theo 6 phân hệ SRS Ver 1.2:
- **Module 1 (Auth, RBAC, Security — FR01–05, FR58–60):** 6 bảng thực tế trong Code (`users`, `password_reset_otps`, `audit_logs`, `knowledge_access_policies`, `knowledge_permissions`, `user_active_sessions`) — chỉ 3 bảng có bản tương đương gần đúng trong DBD Ver 1.0, nhưng khác tên/cột; thiếu hoàn toàn `user_active_sessions` và `knowledge_access_policies` (cấu trúc mới).
- **Module 2 (Data Sync, AEGIS, Document Approval — FR06–11, FR53–54, FR62):** 4 bảng thực tế trong Code (`pb56_workstations`, `pb56_workstation_sync_logs`, `pb56_sync_mode_audit_logs`, `knowledge_upload_approvals`) + Neo4j `:Document` — lệch hoàn toàn tên bảng và thiếu `knowledge_upload_approvals`, `pb56_sync_mode_audit_logs`.
- **Module 3 (Knowledge Base & Graph — FR12–17, FR61):** 1 bảng PostgreSQL (`sop_documents`) + Neo4j (9 labels) + Qdrant (`cuad_contracts`, `adventureworks_entities`) — thiếu `entity_extraction_reviews` và `sop_article_versions` trong Code; lệch tên nhãn/quan hệ Neo4j & Qdrant.
- **Module 4 (Hybrid Copilot — FR18–23, FR35–39):** 1 bảng PostgreSQL (`copilot_sessions` kèm `messages JSON`) — không có 3 bảng tách rời `chat_messages`, `message_citations`, `user_feedback` như DBD.
- **Module 5 (Shift Handover & AI Daily Consolidation — FR55–57):** 1 bảng PostgreSQL (`shift_reports`) — **0% phủ trong DBD Ver 1.0**; thiếu bảng `shift_daily_summaries` ở cả DBD lẫn Code.
- **Module 6 (Executive Analytics & Risk Center — FR24–34, FR40–52):** Tính toán trực tiếp từ Neo4j `:SalesOrder` / `:Product` / `:Document` / `:Clause` — 3 bảng báo cáo/cảnh báo trong DBD (`system_alerts`, `alert_recipients`, `executive_briefings`) chưa triển khai trong PostgreSQL; `executive_briefings` chứa cột Out-of-Scope.

---

## 14. Missing and Incorrect Database Components

### A. Missing Content (Thiếu trong Database Design Ver 1.0)
1. **6 Bảng PostgreSQL đã triển khai trong Code nhưng vắng bóng trong DBD:**
   - `knowledge_upload_approvals` (FR53–54)
   - `shift_reports` (FR55–56)
   - `user_active_sessions` (FR59)
   - `knowledge_access_policies` (FR58 — cấu trúc 5 cờ boolean thay cho `knowledge_scope_policies`)
   - `pb56_sync_mode_audit_logs` (FR14/FR62)
   - `knowledge_permissions` (cần quyết định giữ hay gộp/xóa)
2. **1 Bảng yêu cầu bởi SRS Ver 1.2 nhưng thiếu ở cả DBD và Code:** `shift_daily_summaries` (FR57).
3. **Khai báo FK & Composite PK:** Bị trống ở toàn bộ Tables 10–37; thiếu PK cho `role_permissions`, `user_roles`, `alert_recipients`.
4. **Cascade Rules (`ON DELETE` / `ON UPDATE`)** cho mọi quan hệ FK.
5. **PostgreSQL Indexing Strategy** (bảng chỉ mục, composite indexes cho các truy vấn thường xuyên).
6. **Database Security Section riêng** (Bcrypt, OTP HMAC, Audit Log Immutability Trigger BR-03, Cypher Guard FR61, Qdrant Layer-1 `is_active` Guard).
7. **Neo4j & Qdrant thực tế:** Thiếu nhãn `:Document`, `:Company`, quan hệ `[:PURCHASED]`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]`, collection `adventureworks_entities`, và cơ chế UUIDv5 `logical_chunk_id`/`physical_point_id`.
8. **Migration & Schema Versioning Policy** (Alembic workflow vs runtime DDL).

### B. Incorrect Content (Sai trong Database Design Ver 1.0)
1. **3 ô trống trong Table 5** (R7, R8, R14) và **1 ô trống trong Table 7** (R9 `Deletion`).
2. **Table 16 (Role Mapping):** Khóa cứng 4 vai trò gộp `ADMIN`, vi phạm BR-04 của SRS Ver 1.2.
3. **Table 35 (`executive_briefings`):** Cột `file_format CHECK IN ('PDF','DOCX')` vi phạm phạm vi Out-of-Scope (Proposal Ver 1.2 §4.2, SRS FR44).
4. **Table 33 (`system_alerts`):** Thiếu 2 loại cảnh báo tài chính cốt lõi của SRS FR42 (`NEGATIVE_MARGIN`, `ABNORMAL_DISCOUNT`).
5. **Table 18 (`aegis_local_agents`):** `heartbeat_interval_sec DEFAULT 60` sai so với thực tế `30` giây (SRS UC.07 & Code).
6. **Table 4 (`Layered Storage Architecture`):** Ghi `React / Next.js` sai so với `React 18 + Vite SPA`.

### C. Outdated Content & Design-Implementation Mismatch
- Tham chiếu `C1SE18-Proposal-Document-Ver1.1` (§1.4) thay vì `Ver1.2`.
- **18 bảng trong DBD Ver 1.0 không tồn tại trong Source Code** (`departments`, `roles`, `permissions`, `role_permissions`, `user_roles`, `data_connectors`, `agent_watched_folders`, `sync_jobs`, `sync_audit_logs`, `raw_documents`, `sop_article_versions`, `entity_extraction_reviews`, `knowledge_gaps`, `chat_messages`, `message_citations`, `user_feedback`, `llm_cost_usage_logs`, `system_alerts`, `alert_recipients`, `executive_briefings`). Cần phân định rạch ròi trong Ver 1.1: bảng nào thuộc **Implemented MVP Schema (13 bảng)** và bảng nào là **Future / Planned Extension Schema** (không đánh đồng vào Physical Schema đang vận hành!).

---

## 15. Priority Fix List

Danh sách đầy đủ từng Issue kèm mã số `DB-ISS-01` → `DB-ISS-28` được lưu tại **`GraphMind-DatabaseDesign-Issue-List.md`**. Tóm tắt phân hạng:

- **CRITICAL (7 issues):**
  - `DB-ISS-01`: Lệch pha 27 bảng thiết kế vs. 13 bảng thực tế (18 bảng chưa triển khai, 6 bảng đang chạy bị thiếu trong tài liệu).
  - `DB-ISS-02`: 100% ô `Key / Constraint` của Foreign Key bị bỏ trống trong Tables 10–37; 3 bảng trung gian thiếu Composite PK.
  - `DB-ISS-03`: Mâu thuẫn Neo4j Ontology (`:Contract`/`:Vendor` vs `:Document`/`:Company`; `HAS_CLAUSE`/`BOUND_BY_CONTRACT` vs `CONTAINS_CLAUSE`/`PARTY_TO`; thiếu `[:PURCHASED]`; 0 `Employee` gắn `SalesOrder`).
  - `DB-ISS-04`: Mâu thuẫn 3 chiều Qdrant (384-dim `all-MiniLM-L6-v2` vs 768-dim `nomic-embed-text`; tên collection `cuad_contracts`+`adventureworks_entities` vs `sop_knowledge_base`/`business_records`/`graphmind_chunks`).
  - `DB-ISS-05`: Đứt gãy Alembic migration (`0186` lệch ORM `user.py`, `a93ce836` là `pass` rỗng, thiếu 4 models trong `models/__init__.py`).
  - `DB-ISS-06`: Thiếu bảng nghiệp vụ FR53–FR59 (`knowledge_upload_approvals`, `shift_reports`, `user_active_sessions`, `pb56_sync_mode_audit_logs`) trong DBD Ver 1.0.
  - `DB-ISS-07`: Thiếu Foreign Key thực tế trên 5 cột tham chiếu trong PostgreSQL Code (`user_active_sessions.user_id`, `knowledge_upload_approvals.uploaded_by_id`, `knowledge_access_policies.updated_by`, `audit_logs.actor_id`, `users.department_id`).
- **HIGH (9 issues):** Vi phạm BR-04 (gộp Admin), Out-of-Scope PDF/DOCX trong `executive_briefings`, thiếu cảnh báo Margin/Discount trong `system_alerts`, 0 `CHECK` constraints trong PostgreSQL code, OTP hash dùng SHA-256 không muối, thiếu `failed_login_attempts`/`locked_until` trong `users`, thiếu `sha256_hash` trong `knowledge_upload_approvals`, trùng thuộc tính hoa/thường trên Neo4j, SAD bỏ sót PostgreSQL và sai thuật toán hash/MD5.
- **MEDIUM (8 issues):** Thiếu mục PostgreSQL Indexing Strategy, index trùng lặp trên cột PK trong ORM, thiếu composite indexes cho truy vấn thường xuyên, Neo4j `search_nodes` full-graph scan, Qdrant thiếu payload indexes cho RBAC, thiếu bảng `shift_daily_summaries`, trùng lặp 2 bảng phân quyền (`knowledge_permissions` vs `knowledge_access_policies`), thiếu DB-level trigger bất biến cho `audit_logs` (BR-03).
- **LOW (4 issues):** 4 ô bỏ trống trong Table 5 & Table 7, tham chiếu Proposal Ver 1.1 & `React/Next.js`, sai mặc định `heartbeat_interval_sec` (60 vs 30), seed data mật khẩu yếu và role strings không đồng nhất.

---

## 16. Proposed Database Design Improvements

1. **Tái cấu trúc Section 3.1 (PostgreSQL Physical Schema) theo thực tế Source Code:**
   - Trình bày chính xác **13 bảng PostgreSQL đang vận hành (Implemented MVP Schema)** kèm đầy đủ kiểu dữ liệu, độ dài, `NOT NULL`, `DEFAULT`, `PK`, `FK REFERENCES ... ON DELETE ...`, `UNIQUE`, `CHECK` và `INDEX`.
   - Nếu giữ các bảng mở rộng chưa triển khai (`entity_extraction_reviews`, `knowledge_gaps`, `llm_cost_usage_logs`, `system_alerts`, `shift_daily_summaries`, `departments`), tách thành mục riêng **Section 3.1.X — Planned / Future-Phase Extension Tables** (đánh dấu rõ `[PLANNED]`) để tránh gây hiểu nhầm cho Hội đồng.
2. **Bổ sung ngay các bảng & cột thiết yếu:**
   - Thêm vào DBD: `knowledge_upload_approvals`, `shift_reports`, `user_active_sessions`, `knowledge_access_policies`, `pb56_sync_mode_audit_logs`, và đánh dấu `[PLANNED]` cho `shift_daily_summaries`.
   - Đề xuất bổ sung vào Code (qua 1 Alembic migration chuẩn): `users.failed_login_attempts`, `users.locked_until`, `knowledge_upload_approvals.sha256_hash`, ORM model cho `user_active_sessions`, các FK còn thiếu (`ON DELETE CASCADE`/`SET NULL`), và `CHECK` constraints cho các cột `status`/`role`.
3. **Đồng bộ Neo4j & Qdrant giữa 3 tài liệu (DBD, SRS, SAD) và Source Code:**
   - Chốt thống nhất embedding model thực tế: **`all-MiniLM-L6-v2` (384 dimensions, Cosine)** (sửa lại SAD Ver 1.0 và SRS Ver 1.2 nếu không chuyển sang `nomic-embed-text`).
   - Cập nhật Section 3.2 (Neo4j) khớp với `semantic_layer.py`: `:Document`, `:Company`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]`, `[:PURCHASED]`, ghi chú rõ các quan hệ chưa có dữ liệu (`[:SOLD_BY]`).
   - Cập nhật Section 3.3 (Qdrant) theo 2 collection thực tế (`cuad_contracts`, `adventureworks_entities`), bổ sung đặc tả PR1 Layer-1 Guard (`is_active`) và UUIDv5 point ID.
4. **Bổ sung 3 mục kỹ thuật còn thiếu trong DBD:**
   - **Section 3.1.X: PostgreSQL Indexing Strategy** (liệt kê toàn bộ B-tree, Unique, Composite indexes, loại bỏ index trùng PK).
   - **Section 4.X / Section 5.X: Database Security & Integrity** (Bcrypt cost 12, nâng cấp OTP sang HMAC-SHA256, trigger bất biến `audit_logs` BR-03, Read-Only Cypher Guard FR61).
   - **Section 6: Vẽ lại ERD PostgreSQL (Figure 6.1)** phản ánh đúng 13 bảng thực tế kèm đường nối PK/FK, Cardinality, Optionality và Cascade Rules.

---

## 17. Final Checklist

Database Design chỉ đủ điều kiện phát hành phiên bản **Ver 1.1 / Ver 2.0** khi đạt đủ các tiêu chí sau:
- [ ] Tất cả 5 giả định `[TO BE VERIFIED]` (A1–A5, Table 1) đã được xác minh trực tiếp với Source Code và gỡ bỏ nhãn tạm.
- [ ] Tách bạch rõ **13 bảng PostgreSQL đang vận hành (Implemented)** với các bảng mở rộng tương lai (Planned).
- [ ] Điền đầy đủ 100% khai báo `PK`, `FK REFERENCES ... ON DELETE ...`, `UNIQUE`, `CHECK` vào cột `Key / Constraint` của mọi bảng.
- [ ] Bổ sung đầy đủ đặc tả cho `knowledge_upload_approvals`, `shift_reports`, `user_active_sessions`, `knowledge_access_policies`, `pb56_sync_mode_audit_logs`.
- [ ] Loại bỏ cột `PDF`/`DOCX` export (Out-of-Scope) khỏi `executive_briefings`; cập nhật vai trò theo BR-04 (SRS Ver 1.2).
- [ ] Đồng bộ tên nhãn/quan hệ Neo4j (`:Document`, `:Company`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]`, `[:PURCHASED]`) và collection/dimension Qdrant (384-dim, `cuad_contracts`, `adventureworks_entities`).
- [ ] Bổ sung bảng PostgreSQL Indexing Strategy, mục Database Security & Integrity, và cập nhật tham chiếu lên Proposal Ver 1.2 / SRS Ver 1.2 / React 18 + Vite SPA.
- [ ] Vẽ lại Figure 6.1 (ERD) khớp 100% với Physical Schema đã chốt và xóa toàn bộ các ô trống trong Table 5, Table 7.
