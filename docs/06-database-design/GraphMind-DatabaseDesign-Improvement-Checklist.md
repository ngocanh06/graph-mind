# GRAPHMIND — DATABASE DESIGN IMPROVEMENT CHECKLIST (VER 1.0 ➔ VER 1.1)

> **Mục tiêu:** Lộ trình hành động ưu tiên 4 giai đoạn để nâng cấp `6.C1SE18_DatabaseDesign_GraphMind_Ver1.0.docx` lên **Ver 1.1** (đồng bộ 100% với SRS Ver 1.2, Architecture Document và Source Code thực tế), đồng thời khắc phục các rủi ro toàn vẹn dữ liệu trong mã nguồn.

---

## PHASE 1: CRITICAL — Đồng bộ Schema Thực tế, Khóa Chính/Ngoại & Multi-Store (Bắt buộc)

- [ ] **P1.1. Tái cấu trúc Section 3.1 (PostgreSQL Physical Schema) theo 13 bảng thực tế:**
  - Tách bạch rõ **13 bảng Implemented (MVP)** đang chạy trong Source Code với **các bảng Planned / Future-Phase** (`departments`, `roles`, `permissions`, `role_permissions`, `user_roles`, `data_connectors`, `agent_watched_folders`, `raw_documents`, `sop_article_versions`, `entity_extraction_reviews`, `knowledge_gaps`, `chat_messages`, `message_citations`, `user_feedback`, `llm_cost_usage_logs`, `system_alerts`, `alert_recipients`, `executive_briefings`, `shift_daily_summaries`).
- [ ] **P1.2. Bổ sung đặc tả vật lý đầy đủ cho 5 bảng mới đã triển khai trong Code:**
  - `knowledge_upload_approvals` (FR53–54)
  - `shift_reports` (FR55–56)
  - `user_active_sessions` (FR59)
  - `knowledge_access_policies` (FR58 — cấu trúc 5 cờ boolean + `data_scope`)
  - `pb56_sync_mode_audit_logs` (FR14 / FR62)
  - *(Và cập nhật lại tên/cột thực tế của `users`, `password_reset_otps`, `audit_logs`, `copilot_sessions`, `sop_documents`, `pb56_workstations`, `pb56_workstation_sync_logs`).*
- [ ] **P1.3. Điền đầy đủ 100% PK, FK và Cascade Rules vào cột `Key / Constraint`:**
  - Sửa toàn bộ các ô `Key / Constraint` bị bỏ trống cho mọi cột FK trong Tables 10–37.
  - Khai báo rõ `ON DELETE CASCADE` / `ON DELETE SET NULL` / `ON DELETE RESTRICT` cho từng FK.
  - Khai báo Composite PK cho bất kỳ bảng trung gian nào còn giữ lại.
- [ ] **P1.4. Đồng bộ Neo4j Knowledge Graph Schema (§3.2) với `semantic_layer.py`:**
  - Cập nhật nhãn `:Document` (thay `:Contract`), `:Company` (thay `:Vendor`), quan hệ `[:CONTAINS_CLAUSE]` (thay `[:HAS_CLAUSE]`), `[:PARTY_TO]` (thay `[:BOUND_BY_CONTRACT]`), và bổ sung cạnh tắt `[:PURCHASED]` (`Customer → Product`).
  - Ghi chú minh bạch các quan hệ chưa có dữ liệu (`[:SOLD_BY]`, `:SOP_Document`, `[:SUPPLIED_BY]`).
- [ ] **P1.5. Giải quyết mâu thuẫn 3 chiều về Qdrant (§3.3 vs. SAD vs. SRS):**
  - Chốt chuẩn theo Source Code thực tế: Embedding **`all-MiniLM-L6-v2` (384 dimensions, Cosine)**; collections thực tế **`cuad_contracts`** và **`adventureworks_entities`**.
  - Bổ sung đặc tả **PR1 Layer-1 Guard** (`must_not: is_active = False`) và cơ chế sinh **UUIDv5** `logical_chunk_id` / `physical_point_id`.
  - Đồng bộ lại số chiều (384-dim) và tên collection sang Architecture Document và SRS Ver 1.2.
- [ ] **P1.6. Khắc phục chuỗi Alembic Migration & FK thiếu trong Source Code (Hạng mục kỹ thuật Code):**
  - Export toàn bộ ORM models vào `backend/app/db/postgres/models/__init__.py` (bổ sung `ShiftReport`, `KnowledgeAccessPolicy`, `KnowledgeUploadApproval`, `PB56Workstation*`).
  - Tạo ORM model chính thức cho `user_active_sessions` (thay vì chỉ tạo bằng raw SQL).
  - Tạo 1 Alembic migration chuẩn hóa (thay thế stub rỗng `a93ce8369026`) và bổ sung FK cho `user_active_sessions.user_id`, `knowledge_upload_approvals.uploaded_by_id`, `knowledge_access_policies.updated_by`, `audit_logs.actor_id`.

---

## PHASE 2: HIGH — Quy tắc Nghiệp vụ, Phạm vi & Bảo mật Dữ liệu

- [ ] **P2.1. Cập nhật Phân tách Vai trò theo Business Rule BR-04 (SRS Ver 1.2):**
  - Thay thế Assumption A2 và Table 16 (4 vai trò gộp `ADMIN`) bằng **5 vai trò chuẩn BR-04** (tách `System & IT Administrator` và `Knowledge Administrator`).
- [ ] **P2.2. Loại bỏ nội dung Out-of-Scope & cập nhật Alert Rules:**
  - Xóa cột `file_format (PDF/DOCX)`, `file_uri`, `file_size_bytes` khỏi `executive_briefings` (nếu giữ ở mục Planned).
  - Bổ sung `'NEGATIVE_MARGIN'` và `'ABNORMAL_DISCOUNT'` ($\ge 35\%$) vào `system_alerts.alert_type` (khớp SRS FR42).
- [ ] **P2.3. Bổ sung mục Database Security & Integrity (Section mới trong DBD):**
  - Ghi rõ thuật toán `bcrypt` (cost 12) cho mật khẩu (sửa mâu thuẫn `PBKDF2` trong SAD).
  - Ghi nhận rủi ro và đề xuất nâng cấp `password_reset_otps.otp_hash` từ unsalted SHA-256 lên **HMAC-SHA256** hoặc `bcrypt`.
  - Bổ sung đặc tả **PostgreSQL Trigger bất biến** cho `audit_logs` để thực thi BR-03 ở tầng DB.
  - Bổ sung đặc tả **Read-Only Cypher Guard** (FR61) bảo vệ Neo4j.
- [ ] **P2.4. Bổ sung các cột & ràng buộc còn thiếu trong Source Code:**
  - Thêm `CHECK` constraints ở tầng PostgreSQL cho các cột `status` và `role`.
  - Thêm `failed_login_attempts`, `locked_until` vào `users` (phục vụ SRS UC.01 E1).
  - Thêm `sha256_hash CHAR(64)` vào `knowledge_upload_approvals` (phục vụ BR-06 / FR53).
  - Chuẩn hóa thuộc tính trùng hoa/thường (`TotalDue`/`totalDue`, `OrderDate`/`orderDate`) trên Neo4j.

---

## PHASE 3: MEDIUM — Indexing, Hiệu năng & Giải trình Chuẩn hóa

- [ ] **P3.1. Bổ sung mục PostgreSQL Indexing Strategy (§3.1.X):**
  - Liệt kê toàn bộ B-tree, Unique và Composite indexes khuyến nghị (`shift_reports(department, status, updated_at DESC)`, `copilot_sessions(user_id, updated_at DESC)`, `audit_logs(actor_id, created_at DESC)`, `password_reset_otps(email, is_used, expires_at)`).
  - Loại bỏ `index=True` thừa trên các cột đã là `primary_key=True` trong ORM.
- [ ] **P3.2. Tối ưu truy vấn Neo4j & Qdrant:**
  - Chuyển `Neo4jClient.search_nodes()` từ Full Graph Scan sang Neo4j Full-Text Index.
  - Bổ sung payload indexes trên Qdrant cho `department`, `is_active`, `document_id`, `entity_type`.
- [ ] **P3.3. Bổ sung mục Normalization & Deliberate Denormalization Justification:**
  - Giải trình rõ các quyết định phi chuẩn hóa có chủ đích trong Source Code (`copilot_sessions.messages`, `shift_reports.cases`, `sop_documents.steps/tags`, audit snapshot `author_name`/`uploaded_by_email`), khuyến nghị đổi `JSON` → `JSONB`.
- [ ] **P3.4. Rà soát hợp nhất 2 bảng phân quyền:**
  - Xác minh xem `knowledge_permissions` còn được gọi hay không; nếu đã thay thế bởi `knowledge_access_policies`, loại bỏ để tránh Dual Source of Truth.
- [ ] **P3.5. Xác nhận phạm vi bảng `shift_daily_summaries`:**
  - Chốt với đội phát triển xem báo cáo tổng hợp ca ngày (FR57) giữ cơ chế tính động hay bổ sung bảng `shift_daily_summaries` vào PostgreSQL.

---

## PHASE 4: LOW — Vệ sinh Tài liệu, Sơ đồ ERD & Đồng bộ Metadata

- [ ] **P4.1. Vẽ lại Figure 6.1 (PostgreSQL ERD):**
  - Phản ánh chính xác 13 bảng đang vận hành, đường nối PK/FK, Cardinality và Optionality.
- [ ] **P4.2. Điền đầy đủ các ô bỏ trống trong tài liệu:**
  - Table 5 (R7, R8, R14 — cột *Main Storage Objects*) và Table 7 (R9 — cột *Deletion*).
- [ ] **P4.3. Cập nhật Metadata, Phiên bản & Tham chiếu:**
  - Nâng Version lên `1.1` (hoặc `2.0`), thêm bảng Document Revision History.
  - Cập nhật §1.4 References sang **Proposal Ver 1.2** và **SRS Ver 1.2**.
  - Sửa `React / Next.js` (Table 4) thành **`React 18 + Vite (SPA)`**; sửa `heartbeat_interval_sec` từ `60` thành **`30`** giây.
  - Gỡ bỏ 5 nhãn `[TO BE VERIFIED]` (Table 1) sau khi đã đối chiếu xong với Source Code.
- [ ] **P4.4. Vệ sinh cấu hình Seed & Legacy DDL trong Code:**
  - Xóa dòng `ALTER TABLE rbac_permissions` dư thừa ở `database.py:76`.
  - Chuẩn hóa mã vai trò trong `seed_users.py` và chặn chạy seed ở môi trường production.
