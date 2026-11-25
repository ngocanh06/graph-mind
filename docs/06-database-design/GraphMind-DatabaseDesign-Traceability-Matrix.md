# GRAPHMIND — DATABASE REQUIREMENT TRACEABILITY MATRIX (7-WAY RTM)

> **Chuỗi truy vết 7 chiều:**  
> **Proposal Ver 1.2 → User Story Ver 1.2 → Product Backlog Ver 1.2 → SRS Ver 1.2 → Architecture Ver 1.0 → Database Design Ver 1.0 → Source Code Evidence**  
> **Quy ước trạng thái:** `FULLY ALIGNED` | `PARTIALLY ALIGNED` | `MISSING IN DBD` | `MISSING IN CODE` | `INCONSISTENT` | `OUTDATED`

---

## BẢNG TRUY VẾT DỮ LIỆU 7 CHIỀU (7-WAY DATABASE TRACEABILITY MATRIX)

| STT | Proposal Requirement | US ID | PBI ID | SRS Req. ID | Architecture Component (SAD) | Entity / Table (DBD Ver 1.0) | Source Code Evidence (Actual DB/Store) | Status |
|:---:|---|:---:|:---:|:---:|---|---|---|---|
| 1 | Đăng nhập an toàn với JWT & phân quyền cơ bản | US01 | PB01 | FR01 | `m6_admin_security` | `users`, `roles`, `user_roles` | `users` (`models/user.py:19`, PK `user_id`, cột `role` đơn trị) | `INCONSISTENT` |
| 2 | Quản trị tài khoản người dùng & phòng ban | US13 | PB02 | FR02, FR05 | `m6_admin_security` | `users`, `departments` | `users` (`user.py`) + dict cứng `core/departments.py:9` (không có bảng `departments`) | `MISSING IN CODE` |
| 3 | Ma trận phân quyền động 2 chiều (Granular RBAC) | US65 | PB72 | FR03, FR58 | `m6_admin_security` | `knowledge_scope_policies` (cấu trúc khác) | `knowledge_access_policies` (`rbac_matrix_model.py:15`) + `knowledge_permissions` (`knowledge_permission.py:13`) | `INCONSISTENT` |
| 4 | Chính sách phiên đăng nhập duy nhất (Single Active Session) | US66 | PB73 | FR59 | `m6_admin_security` | **Chưa có trong DBD** | `user_active_sessions` (`session_service.py:37` — raw SQL, thiếu FK) | `MISSING IN DBD` |
| 5 | Khôi phục mật khẩu tự phục vụ qua Email OTP | US67 | PB74 | FR02, FR60 | `m6_admin_security`, SMTP Gateway | `otps` (Table 9) | `password_reset_otps` (`models/otp.py:18`, `otp_hash` SHA-256) | `INCONSISTENT` |
| 6 | Ghi nhật ký kiểm toán bất biến (Immutable Audit Log) | US17 | PB03 | FR04, FR06, BR-03 | `m6_admin_security` | `system_audit_trails` (`BIGSERIAL`, 17 cột) | `audit_logs` (`models/audit_log.py:17`, `UUID`, 8 cột, chưa có trigger bất biến) | `INCONSISTENT` |
| 7 | Lưu trữ metadata tài khoản, phân quyền trên PostgreSQL | US39 | PB45 | FR08 | Foundation (`db & core`) *(SAD quên trong Table 6.3)* | 27 bảng PostgreSQL | 13 bảng PostgreSQL (`database.py:57–94`, host PostgreSQL `graph_mind`) | `INCONSISTENT` |
| 8 | Bảng điều khiển quản lý máy trạm AEGIS & Heartbeat | US08, US41 | PB05, PB56 | FR07, FR13–14 | `aegis_file_watcher`, `m1_data_sync` | `aegis_local_agents` (`UUID`, 60s), `agent_watched_folders` | `pb56_workstations` (`VARCHAR(64)`, 30s), `pb56_workstation_sync_logs` (`pb56_workstation_model.py:23, 76`) | `INCONSISTENT` |
| 9 | Công tắc khẩn cấp máy trạm & kiểm toán Sync Mode | US69 | PB76 | FR62 | `aegis_file_watcher`, `m1_data_sync` | **Chưa có trong DBD** | `pb56_workstations` + `pb56_sync_mode_audit_logs` (`pb56_workstation_model.py:98`) | `MISSING IN DBD` |
| 10 | File Watcher & đồng bộ tệp cục bộ (Incremental Sync) | US48, US49 | PB48, PB49 | FR15, FR16 | `aegis_file_watcher`, `m1_data_sync` | `sync_jobs`, `sync_audit_logs`, `raw_documents` | `pb56_workstation_sync_logs` + JSON `watcher_ingested_docs.json`, `watcher_sync_logs.json` + Neo4j `:Document` | `INCONSISTENT` |
| 11 | Kết nối Google Drive/Sheets qua OAuth 2.0 [Optional] | US09 | PB06 | FR04, FR19 | `m1_data_sync` | `data_connectors` (Table 17) | `google_connector.py` (không lưu bảng `data_connectors` trong PostgreSQL) | `MISSING IN CODE` |
| 12 | Nhân viên tải tài liệu nội bộ chờ duyệt (PENDING, SHA-256) | US60 | PB67 | FR53, BR-06 | `m1_data_sync`, `m6_admin_security` | **Chưa có trong DBD** | `knowledge_upload_approvals` (`document_approval_model.py:15` — thiếu cột `sha256_hash` và FK) | `MISSING IN DBD` |
| 13 | Knowledge Admin thẩm định & phê duyệt tài liệu số | US61 | PB68 | FR54, UC.23 | `m6_admin_security`, `m1_data_sync` | **Chưa có trong DBD** | `knowledge_upload_approvals` (`document_approval_router.py:99`) → `pipeline.py` | `MISSING IN DBD` |
| 14 | ETL dữ liệu CRM AdventureWorks vào Neo4j | US24, US27 | PB07, PB11 | FR17, FR21 | `m1_data_sync`, `neo4j_db` | `:Customer`, `:Product`, `:Category`, `:SubCategory`, `:SalesOrder`, `:Employee`, `:Vendor` | Neo4j `:Customer`, `:Product`, `:Category`, `:SubCategory`, `:SalesOrder`, `[:PURCHASED]` (`ingest_adventureworks_*.py`, `semantic_layer.py`) — 0 `:Employee` gắn đơn | `PARTIALLY ALIGNED` |
| 15 | Tiền xử lý & trích xuất điều khoản hợp đồng CUAD | US25, US45 | PB08–10, PB46–47 | FR17–18, FR20 | `m1_data_sync`, `neo4j_db` | `:Contract`, `:Clause`, `[:HAS_CLAUSE]`, `[:BOUND_BY_CONTRACT]` | Neo4j `:Document`, `:Clause`, `:Company`, `[:CONTAINS_CLAUSE]`, `[:PARTY_TO]` (`ingest_all_documents_neo4j.py`, `pipeline.py`) | `INCONSISTENT` |
| 16 | Tạo nhúng ngữ nghĩa & lập chỉ mục trên Qdrant | US27 | PB12 | FR22 | `qdrant_db` *(SAD ghi 768-dim)* | `cuad_contracts`, `sop_knowledge_base`, `business_records` (384-dim) | `cuad_contracts`, `adventureworks_entities` (`qdrant/client.py:36, 134` — 384-dim `all-MiniLM-L6-v2`) | `INCONSISTENT` |
| 17 | Biên tập tri thức Human-in-the-loop (Graph Editor) | US29, US30 | PB41, PB54 | FR24, FR25 | `m2_knowledge_editor`, `neo4j_db` | `entity_extraction_reviews` (Table 25) | Chỉnh sửa trực tiếp Neo4j qua API (không có bảng staging `entity_extraction_reviews` trên PostgreSQL) | `MISSING IN CODE` |
| 18 | Soạn thảo & quản lý SOP Wiki nội bộ | US38 | PB53 | FR26, UC.14 | `m2_knowledge_editor` | `sop_articles`, `sop_article_versions`, `:SOP_Document`, `sop_knowledge_base` | `sop_documents` (`models/sop_document.py:20` — `steps JSON`, không có bảng version & không có collection riêng) | `INCONSISTENT` |
| 19 | Trò chuyện đa lượt AI Copilot & Ghim/Chia sẻ phiên | US02, US37 | PB27, PB51, PB59 | FR27, FR39, UC.18 | `m3_hybrid_copilot` | `chat_sessions`, `chat_messages`, `user_feedback` | `copilot_sessions` (`models/copilot_session.py:19` — gộp `messages JSON` + cột pin/share) | `INCONSISTENT` |
| 20 | Trích dẫn nguồn minh bạch (Citation Viewer) | US06 | PB28, PB32 | FR32, UC.17 | `m3_hybrid_copilot`, `qdrant_db`, `neo4j_db` | `message_citations` (Table 29) + §4.7 | Lưu trực tiếp trong JSON tin nhắn của `copilot_sessions` + tra cứu Qdrant `doc_id`/Neo4j `:Document` | `MISSING IN CODE` |
| 21 | Read-Only Cypher Guard chống truy vấn biến đổi đồ thị | US68 | PB75 | FR61, UC.27 | `m3_hybrid_copilot` | **Chưa đề cập trong DBD** | `text_to_cypher.py` (`FORBIDDEN_KEYWORDS`) + `audit_logs` | `MISSING IN DBD` |
| 22 | Phát hiện lỗ hổng tri thức (Knowledge Gaps Detector) | — | — | UC.15 | `m3_hybrid_copilot` | `knowledge_gaps` (Table 26) | Không có bảng `knowledge_gaps` trong PostgreSQL | `MISSING IN CODE` |
| 23 | Lập & ký duyệt biên bản bàn giao ca trực phòng ban | US62, US63 | PB69, PB70 | FR55, FR56, UC.24 | `m4_decision_support` | **Chưa có trong DBD** | `shift_reports` (`models/shift_report.py:20` — `cases JSON`, `content_hash`) | `MISSING IN DBD` |
| 24 | AI tự động tổng hợp báo cáo ca trực ngày + Fallback | US64 | PB71 | FR57, UC.25 | `m4_decision_support`, Host Ollama | **Chưa có trong DBD** | Tính động qua API (`shift_reports.py`), chưa có bảng `shift_daily_summaries` | `MISSING IN DBD` / `MISSING IN CODE` |
| 25 | Trung tâm Cảnh báo Rủi ro (Negative Margin, Discount $\ge 35\%$) | US34 | PB58 | FR42, UC.20 | `m4_decision_support`, `neo4j_db` | `system_alerts`, `alert_recipients` (thiếu 2 alert mới) | Tính động bằng Cypher trên Neo4j `:SalesOrder`/`:Product`/`:Document`, không lưu bảng PostgreSQL | `OUTDATED` / `MISSING IN CODE` |
| 26 | Tóm tắt điều hành trên Web (Executive Briefing) | US35 | PB65 | FR44, UC.21 | `m4_decision_support` | `executive_briefings` (có cột `PDF`/`DOCX` Out-of-Scope) | Không có bảng `executive_briefings` trong PostgreSQL | `OUTDATED` / `MISSING IN CODE` |
| 27 | Giám sát chi phí & token LLMOps [Optional] | US44 | PB66 | FR12, UC.05 | `m6_admin_security` | `llm_cost_usage_logs` (Table 31) | Không có bảng `llm_cost_usage_logs` trong PostgreSQL | `MISSING IN CODE` |
| 28 | Tìm kiếm đa diện hợp nhất (Multi-facet Search) | US20, US36 | PB52 | FR45, FR46 | `m5_multifacet_search`, Neo4j, Qdrant | `raw_documents`, Neo4j Full-text Index, Qdrant Payload Index | Neo4j `search_nodes` (full scan) + Qdrant `vector_search` (thiếu payload index RBAC) | `PARTIALLY ALIGNED` |

---

## TỔNG KẾT ĐỘ PHỦ TRUY VẾT

- **Tổng số nhóm yêu cầu dữ liệu đối chiếu:** 28 nhóm (phủ toàn bộ 62 FRs, 69 US, 79 PBIs).
- **`INCONSISTENT` (Khác tên bảng, cột, nhãn hoặc công nghệ):** 11 / 28 (~39.3%).
- **`MISSING IN CODE` (Có trong DBD Ver 1.0 nhưng chưa triển khai DB):** 8 / 28 (~28.6%).
- **`MISSING IN DBD` (Đã có trong SRS Ver 1.2 & Source Code nhưng thiếu trong DBD Ver 1.0):** 6 / 28 (~21.4%).
- **`PARTIALLY ALIGNED`:** 2 / 28 (~7.1%).
- **`OUTDATED` (Chứa nội dung ngoài phạm vi / thiếu rule mới):** 2 / 28 (~7.1% — trùng lặp với `MISSING IN CODE`).
- **`FULLY ALIGNED`:** 0 / 28 (cần đại tu lên DBD Ver 1.1 để đạt đồng bộ 100%).
