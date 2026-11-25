# GraphMind — End-to-End Project Documentation & Implementation Consistency Audit Report

- **Project Title:** GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support (**GraphMind**)
- **Team:** C1SE18 (Tran Thi Ngoc Anh, Huynh Ngoc Minh, Ha Hoang Anh, Tran Viet Anh Vu, Phan Anh Bao) — **Mentor:** PhD. Tran Kim Sanh
- **Audit Date:** 23 November 2026
- **Auditor Role:** Senior Software Architect, Senior Business Analyst, Requirements Engineering Specialist, Database Architect, Solution Architect & Technical Documentation Auditor
- **Audit Scope (7 Official Documents + Full Source Code):**
  1. **Architecture Document Ver 1.1:** [7.C1SE18_Architecture-Document-ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx) *(11,865.1 KB, 266 paragraphs, 19 tables, 6 drawings)*
  2. **Database Design Document Ver 1.1:** [6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/06-database-design/6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx) *(1,627.3 KB, 440 paragraphs, 85 tables, 4 drawings)*
  3. **SRS Document Final (Ver 1.2):** [C1SE18_SRS_GraphMind_Final.docx](file:///d:/CAPSTONE1/graph-mind/docs/05-srs/C1SE18_SRS_GraphMind_Final.docx) *(7,341.6 KB, 495 paragraphs, 54 tables, 67 drawings)*
  4. **Product Backlog Document Ver 1.2:** [C1SE18_ProductBacklog_GraphMind_Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/04-product-backlog/C1SE18_ProductBacklog_GraphMind_Ver1.2.docx) *(88.5 KB, 179 paragraphs, 9 tables, 79 PBIs, 885 SP)*
  5. **Project Plan Document Ver 1.2:** [C1SE18_ProjectPlan_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/03-project-plan/C1SE18_ProjectPlan_GraphMind-Ver1.2.docx) *(134.0 KB, 198 paragraphs, 18 tables, 40 WBS tasks, 43 Deliverables)*
  6. **User Story Document Ver 1.2:** [C1SE18_UserStory_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/02-user-story/C1SE18_UserStory_GraphMind-Ver1.2.docx) *(61.7 KB, 94 paragraphs, 9 tables, 69 User Stories)*
  7. **Proposal Document Ver 1.2:** [C1SE18-Proposal-Document-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx) *(1,065.3 KB, 246 paragraphs, 27 tables)*
  8. **Source Code Repository:** `backend/` (Python 3.11 / FastAPI / SQLAlchemy 2.x Async / Neo4j / Qdrant / Ollama), `frontend/` (React 18.3.1 / Vite 5.4.2 / D3-Force), `aegis_file_watcher/` (Watchdog daemon), `docker-compose.yml`, `backend/app/tests/` (24 pytest files).

---

## 1. Executive Summary

### 1.1 Overall Maturity & Alignment Verdict
Following the major updates in **Architecture Document Ver 1.1** (`7.C1SE18_Architecture-Document-ver1.1.docx`) and **Database Design Document Ver 1.1** (`6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`), the GraphMind documentation suite has progressed from a fragmented Ver 1.0 baseline (where Architecture scored `49.55/100` and Database Design scored `53.30/100`) to a **substantially synchronized, traceable engineering baseline**:
- **Documentation Suite Quality & Consistency Score:** **`88.15 / 100` (Grade B+ / Very Good — Conditionally Ready)**
- **Source Code & Schema Implementation Alignment Score:** **`78.40 / 100` (Grade B- / Good MVP Implementation with 6 High-Priority Technical/Documentation Gaps)**
- **Total Cross-Document & Implementation Findings Identified:** **28 Issues** (**`0 CRITICAL`**, **`6 HIGH`**, **`14 MEDIUM`**, **`8 LOW`**).

### 1.2 Direct Answers to the 5 Main Audit Questions

1. **Câu hỏi 1: Architecture Document Ver 1.1 có phù hợp với SRS, User Story, Product Backlog và Proposal không?**
   - **CÓ (đạt ~90% về mặt nội dung kiến trúc), nhưng còn 3 điểm lệch cần xử lý:**
     - **Điểm mạnh:** `7.C1SE18_Architecture-Document-ver1.1.docx` đã bổ sung đầy đủ **Host PostgreSQL (`graph_mind`, 13 bảng MVP)**, 5 Role theo `BR-04`, nhóm yêu cầu mới `FR53–FR62` (`FD-06`), `SentenceTransformer("all-MiniLM-L6-v2")` (`384-dim`), `bcrypt` (cost 12), `SHA-256`, `SSE` (`useWatcherEvents.js`), `PR1 Crash Recovery`, `Read-Only Cypher Guard`, `Qdrant Layer-1 Guard`, 7 kịch bản `QAS-01..QAS-07` khớp SLA của `SRS NFR-01..08`, và 5 `ADR-01..ADR-05`.
     - **Điểm lệch:** (a) Trong file `docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx`, **5 hình vẽ (Figures 1–5) vẫn là ảnh cũ của bản Ver 1.0** kèm 7 dòng placeholder chữ đỏ `[DIAGRAM PLACEHOLDER: ...]` và các tham chiếu treo `Table 6.2c`, `TD-01..TD-05` (`E2E-ISS-04`) *(lưu ý: bản `C1SE18_Architecture-Document-ver1.1.docx` đã nhúng 6 sơ đồ PNG 250 DPI mới, nhưng bản có tiền tố `7.` thì chưa)*; (b) **Bảng 7 (§5.2 Team Workload)** trong SAD phân công vai trò thành viên ngược với `Project Plan Ver 1.2` và `Product Backlog Ver 1.2` (`E2E-ISS-11`); (c) SAD mô tả triển khai **100% On-Premise Single-Host Docker Compose**, trong khi `Proposal`, `User Story`, `Product Backlog` và `SRS` vẫn mô tả **Hybrid Cloud (`AEGIS Local Agent ↔ Backend Cloud`)** (`E2E-ISS-07`).

2. **Câu hỏi 2: Database Design Ver 1.1 có phản ánh đúng các yêu cầu dữ liệu và Architecture không?**
   - **CÓ (đạt ~92% về đặc tả schema vật lý), nhưng xung đột trực tiếp với Mục 4.6 của `C1SE18_SRS_GraphMind_Final.docx`:**
     - **Điểm mạnh:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` đã tách bạch chính xác **13 bảng PostgreSQL Implemented MVP** (§3.1.2, Tables 8–20) và **21 bảng Planned Extensions** (§3.1.4–3.1.8, Tables 22–42), đặc tả đúng **10 Neo4j Node Labels & 8 Relationships thực tế** (§3.2), **2 Qdrant Collections `384-dim` Cosine** (`cuad_contracts`, `adventureworks_entities`, §3.3), chiến lược Indexing (§3.1.10), chuẩn hóa 3NF & giải trình phi chuẩn hóa JSON (§3.1.11), bảo mật DB & quản trị Alembic (§5.8), và nhúng đủ 3 sơ đồ ERD/Ontology/Mapping mới (`Figures 6.1, 6.2, 6.3`).
     - **Điểm lệch:** (a) **Mục 4.6 của `C1SE18_SRS_GraphMind_Final.docx` vẫn giữ schema nháp 10 bảng** với tên bảng khác (`rbac_permissions_matrix`, `password_reset_tokens`, `documents`, `document_approvals`), bỏ sót 5 bảng MVP (`pb56_workstations*`, `sop_documents`, `copilot_sessions`), liệt kê 6 nhãn Neo4j nháp và ghi Qdrant `graphmind_chunks` **`768-dim`** (`E2E-ISS-01`); (b) Mục 4 và Mục 5 của `Database Design Ver 1.1` vẫn mô tả luồng ánh xạ khóa và Citation Viewer qua các bảng `[PLANNED]` (`raw_documents`, `message_citations`, `sync_jobs`) thay vì các bảng MVP đang chạy (`knowledge_upload_approvals`, `copilot_sessions.messages` JSON) (`E2E-ISS-15`); (c) Bảng 44 (§3.1.9) ghi `TEST VERIFIED: NOT VERIFIED` cho cả 13 bảng dù repo có sẵn 24 file `pytest` (`E2E-ISS-13`); (d) Trang bìa còn để ngày cũ `25 Sep 2026` và §1.4 tham chiếu `SAD ver1.0` (`E2E-ISS-22`).

3. **Câu hỏi 3: Architecture và Database Design có nhất quán với nhau không?**
   - **NHẤT QUÁN CAO (92% Aligned):** Hai tài liệu Ver 1.1 thống nhất 100% về 3 hệ quản trị CSDL (`Host PostgreSQL 15+ :5432` với 13 bảng MVP + 21 bảng Planned; `Neo4j 5.18.0 :7687` với 10 nhãn / 8 quan hệ; `Qdrant v1.8.2 :6333` với 2 collection `384-dim` `all-MiniLM-L6-v2`), cơ chế khóa UUIDv5, `bcrypt` cost 12, `JWT+JTI`, `SHA-256`, `Read-Only Cypher Guard` và `PR1 Layer-1 Qdrant Guard`. Điểm khác biệt duy nhất là Mục 4–5 của Database Design mô tả luồng đích qua các bảng `[PLANNED]` trong khi Architecture §4.4 mô tả luồng MVP thực tế (`E2E-ISS-15`).

4. **Câu hỏi 4: Toàn bộ tài liệu có mô tả đúng những gì Source Code đang triển khai không?**
   - **`Architecture Ver 1.1` và `Database Design Ver 1.1` mô tả rất trung thực trạng thái Source Code** (kể cả việc chỉ rõ các `IMPLEMENTATION GAP` và `DEFECT` trong code). Ngược lại, **`SRS Final` (§4.5, §4.6) chưa khớp với Source Code** về URI endpoint, tên bảng PostgreSQL, nhãn Neo4j và số chiều Qdrant (`E2E-ISS-01`), đồng thời Source Code còn tồn tại **6 khoảng trống kỹ thuật/bảo mật** cần vá:
     1. Chưa tách mã role `ADMIN` thành `IT_ADMIN` và `KNOWLEDGE_MANAGER` trong bảng `knowledge_access_policies` và chưa đồng nhất chuỗi role giữa `seed_users.py`, `rbac.py` và `frontend/src/data/roles.js` (`E2E-ISS-02`).
     2. Mã hóa OTP trong `password_reset_otps` đang dùng unsalted `SHA-256`, `main.py` mở `allow_origins=["*"]` kèm credentials, và `docker-compose.yml` chứa khóa mặc định `AGENT_API_KEY` (`E2E-ISS-05`).
     3. Chuỗi migration Alembic (`0186c646946f`, `a93ce8369026`) bị hỏng, 5 file tự chạy `CREATE TABLE IF NOT EXISTS` lúc runtime, thiếu ORM model cho `user_active_sessions`, và thiếu 5 ràng buộc `ForeignKey` vật lý + `CheckConstraint` (`E2E-ISS-06`).
     4. Bảng `knowledge_upload_approvals` trong code chưa có cột `sha256_hash` để chặn file trùng ngay lúc upload (`FR53` / `E2E-ISS-10`), và tổng hợp ca trực (`FR57`) chưa lưu vào bảng `shift_daily_summaries` (`E2E-ISS-09`).
     5. Ba module backend `m2_knowledge_editor`, `m4_decision_support`, `m5_multifacet_search` đang là thư mục rỗng (`0 lines`), toàn bộ logic nằm ở `main.py` (`3,306 dòng`, 37 inline routes) và `api/v1/` (`E2E-ISS-12`).
     6. Chưa có file script kiểm thử tải `locustfile.py` (150 VU) trong repo (`E2E-ISS-17`).

5. **Câu hỏi 5: Có yêu cầu, chức năng, Component, Entity, Table hoặc Relationship nào bị thiếu, sai lệch, trùng lặp hoặc không có nguồn gốc rõ ràng không?**
   - **Không có Requirement hoặc Table nào "mồ côi" (không có nguồn gốc nghiệp vụ)**: tất cả 62 `FR`, 69 `US`, 79 `PBI`, 13 bảng PostgreSQL MVP (+ 21 bảng `[PLANNED]`), 10 nhãn Neo4j và 2 collection Qdrant đều truy vết được về 6 Module và Track Nghiên cứu của `Proposal Ver 1.2`.
   - **Tuy nhiên có 4 điểm sai lệch/trùng lặp liên tài liệu quan trọng:**
     1. **13 dòng ánh xạ sai mã `US`/`PB` trong Phụ lục B (`Table T53` & `Table T54`) của `C1SE18_SRS_GraphMind_Final.docx`** (`E2E-ISS-03`).
     2. **Trùng lặp bảng phân quyền trong PostgreSQL:** bảng cũ `knowledge_permissions` vẫn tồn tại song song với bảng ma trận 2 chiều `knowledge_access_policies` (`E2E-ISS-20`).
     3. **Xung đột quyền duyệt tài liệu (`FR54` / `US61` / `PB68`):** `SRS Final` & `DBD Ver 1.1` quy định chỉ `Knowledge Administrator` được duyệt, trong khi `Proposal`, `US61`, `PB68`, `Project Plan`, `SAD §4.4` và Code cho phép cả `System & IT Administrator` (`E2E-ISS-08`).
     4. **Sai lệch mã WBS lệch 1 đơn vị** ở 18 PBI thuộc Sprint 2–4 trong cột `Remarks` của `Product Backlog Ver 1.2` so với bảng WBS của `Project Plan Ver 1.2` (`E2E-ISS-28`).

---

## 2. Document-by-Document Assessment (Phase 1 & Phase 3 Authority Rules)

| # | Document Name & File | Authority Role (Phase 3) | Internal Completeness | Cross-Document Consistency | Key Strengths & Remaining Issues |
|---:|---|---|---|---|---|
| **1** | **Proposal Ver 1.2**<br>[C1SE18-Proposal-Document-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx) | Defines project objectives, research methodology, 6-module MVP scope, datasets & evaluation metrics | **GOOD** (16 sections, 27 tables, empirical benchmark results in Table 9.1) | **NEEDS IMPROVEMENT** | **Strengths:** Clear dual-track scope (Research + 6-Module MVP), RRF ($k=60$), 509 ChatML pairs, 100-question benchmark, Ollama GGUF `Q4_K_M`, FR53–FR62 workflows included.<br>**Issues:** Table 6.1a lists 4 roles (omits `Department Manager` `E2E-ISS-02`), assigns document upload approval to both admins (`E2E-ISS-08`), describes Hybrid Cloud backend (`E2E-ISS-07`), and claims direct `Customer→Contract` synthetic link (`E2E-ISS-14`). |
| **2** | **User Story Ver 1.2**<br>[C1SE18_UserStory_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/02-user-story/C1SE18_UserStory_GraphMind-Ver1.2.docx) | Defines actor needs, business behaviors & Gherkin acceptance criteria | **GOOD** (69 stories `US01–US69` + 1-to-1 Traceability Matrix in §1.6 Table T9) | **GOOD (Minor Drift)** | **Strengths:** Complete coverage of all 6 modules, research tasks (`US45–US55`), closure deliverables (`US56–US59`), and new Ver 1.2 workflows (`US60–US69`).<br>**Issues:** `US63–US64` use status `REVIEWED` instead of `APPROVED/REJECTED` (`E2E-ISS-09`); `US47` lists `batch size 4` (`E2E-ISS-25`); `US08` actor is `Executive` instead of `IT Admin` (`E2E-ISS-27`); §3 P77 cites `ProductBacklog_FINAL (PB01–PB76)` (`E2E-ISS-26`). |
| **3** | **Product Backlog Ver 1.2**<br>[C1SE18_ProductBacklog_GraphMind_Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/04-product-backlog/C1SE18_ProductBacklog_GraphMind_Ver1.2.docx) | Manages prioritized backlog items (`PB01–PB79`), story points (885 SP) & Sprint 1–4 breakdown | **GOOD** (79 PBIs across 13 Epics, Fibonacci SP calibration, NFRs & Data Integrity rules) | **GOOD (Minor WBS Offset)** | **Strengths:** Cleanly decomposes all 69 User Stories (`PB01–PB76`) + 3 QA test enablers (`PB77–PB79`); recognizes all 5 application roles.<br>**Issues:** 18 PBIs in Table T7 Column 12 have off-by-one WBS numbers (`E2E-ISS-28`); `PB70–PB71` use `REVIEWED` status (`E2E-ISS-09`); no PBI created for `WBS 23b` Locust load testing (`E2E-ISS-17`). |
| **4** | **Project Plan Ver 1.2**<br>[C1SE18_ProjectPlan_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/03-project-plan/C1SE18_ProjectPlan_GraphMind-Ver1.2.docx) | Manages team organization, RACI, 4-Sprint schedule, 40 WBS tasks, 43 deliverables & 14 risks | **GOOD** (10 sections, 18 tables, RACI matrix, Milestones M1–M4, Locust SLA) | **GOOD** | **Strengths:** Authoritative Jira `C1SE18` task mapping, RACI matrix (§2.1.1), Finish-to-Start dependencies (§3.3), and 14-item Risk Register.<br>**Issues:** §1.2 & §2.3 state "exactly four system roles" while P107 adds `Department Manager` as an operational persona (`E2E-ISS-02`); Table T2 R3 omits SRS/PB/SAD/DBD from referenced documents (`E2E-ISS-26`). |
| **5** | **SRS Final (Ver 1.2)**<br>[C1SE18_SRS_GraphMind_Final.docx](file:///d:/CAPSTONE1/graph-mind/docs/05-srs/C1SE18_SRS_GraphMind_Final.docx) | Authoritative specification of approved functional (`FR1–FR62`), non-functional (`NFR-01–08`), UC (`UC.01–27`) & business rules (`BR-01–06`) | **GOOD** (62 FRs, 27 full UC tables, 67 embedded English-captioned diagrams) | **INCONSISTENT (§4.5, §4.6 & Appendix B)** | **Strengths:** Comprehensive functional & exception flow coverage, quantified NFRs, 5 separated roles (`BR-04`), 67 embedded diagrams.<br>**Issues:** **§4.6 Data Requirements** specifies a 10-table draft PG schema, 6 draft Neo4j labels, and `768-dim` Qdrant `graphmind_chunks` contradicting DBD Ver 1.1 & Code (`E2E-ISS-01`); **§4.5 API Summary** lists wrong URIs and `WSS` (`E2E-ISS-01`, `E2E-ISS-18`); **Appendix B Tables T53 & T54** contain 13 wrong US/PB mappings and a swapped Module 5 definition (`E2E-ISS-03`). |
| **6** | **Architecture Ver 1.1**<br>[7.C1SE18_Architecture-Document-ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx) | Defines system context, drivers, QAS, utility tree, C&C, module, deployment, data flow, API/SSE, security & ADRs | **NEEDS IMPROVEMENT (Diagrams & Dangling Refs)** | **GOOD (Aligned with DBD Ver 1.1 & Code)** | **Strengths:** Synchronized with Source Code, SRS FR1–FR62, and DBD Ver 1.1 (13 PG tables, 384-dim MiniLM, bcrypt, SHA-256, SSE, PR1 recovery, 5 ADRs, honest defect disclosure).<br>**Issues:** `7.C1SE18_Architecture-Document-ver1.1.docx` still contains **5 outdated Ver 1.0 diagrams + 7 red text placeholders** and dangling references `Table 6.2c` / `TD-01..05` (`E2E-ISS-04`); **§5.2 Table 7** team assignments contradict Project Plan (`E2E-ISS-11`). |
| **7** | **Database Design Ver 1.1**<br>[6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/06-database-design/6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx) | Defines multi-model persistence layer (PostgreSQL 13 MVP + 21 Planned tables, Neo4j 10 labels/8 rels, Qdrant 384-dim, key mapping, ERD) | **GOOD** (85 tables, 4 drawings including 3 new 250 DPI diagrams, 0 empty FK cells) | **GOOD (Minor Metadata & Section 4/5 Lineage Drift)** | **Strengths:** Exhaustive column-level specification of all 13 implemented PG tables (`[P]` / `FK[P]` flags), 21 planned tables, 10 Neo4j labels, 2 Qdrant 384-dim collections, indexing, 3NF/JSON justification, and security governance.<br>**Issues:** Cover Date still says `25 Sep 2026` & §1.4 cites `SAD ver1.0` (`E2E-ISS-22`); Table 44 says `TEST VERIFIED: NOT VERIFIED` despite 24 pytest files (`E2E-ISS-13`); Sections 4–5 describe lineage via `[PLANNED]` tables (`E2E-ISS-15`). |

---

## 3. Requirement Consistency Analysis (Phase 2: `Proposal → User Story → Product Backlog → SRS`)

### 3.1 Answers to the 10 Phase 2 Audit Checks
1. **Tất cả chức năng trong phạm vi Proposal có được thể hiện trong User Story không?**
   - **CÓ (100%):** Toàn bộ 6 Module chức năng, 5 hạng mục bổ sung Ver 1.2 (Upload Approval, Shift Reports & Consolidation, Dynamic RBAC Matrix, Single Active Session, Email OTP, Read-Only Cypher Guard, AEGIS PB56 Kill Switch), cùng toàn bộ Track Nghiên cứu (Synthetic Linking, 509 ChatML pairs, Kaggle T4 LoRA, Ollama GGUF, 100-question benchmark, 3 baselines, 5 indicators) và 4 hạng mục đóng dự án đều được ánh xạ đầy đủ vào `US01–US69`.
2. **Các User Story có được phản ánh trong Product Backlog không?**
   - **CÓ (100%):** Bảng truy vết §1.6 của `User Story Ver 1.2` và المục 5 của `Product Backlog Ver 1.2` khớp hoàn toàn 69 User Stories (`US01–US69`) sang `PB01–PB76` (cộng thêm 3 PBI kiểm thử `PB77–PB79`, tổng cộng 79 PBIs / 885 SP). Chỉ có hoạt động **Locust Load Testing (`WBS 23b`)** được nêu ở Mục 2.1 của Product Backlog nhưng chưa được tách thành mã `PB` riêng (`E2E-ISS-17`).
3. **Các PBI có được đặc tả đầy đủ trong SRS không?**
   - **CÓ (100% các PBI phần mềm và nghiên cứu):** 73/79 PBIs ánh xạ trực tiếp vào `FR01–FR62` và `UC.01–UC.27`; 3 PBI quản trị dự án (`PB39` Reflection, `PB61` AI Disclosure, `PB62–PB64` E2E/Closing) và 3 PBI Test Enabler (`PB77–PB79`) ánh xạ vào Mục 5 (`NFR Verification`) và Phụ lục B của SRS.
4. **Functional Requirements có khớp Acceptance Criteria không?**
   - **Đa số khớp chặt chẽ, ngoại trừ 3 điểm lệch nhỏ:**
     - `US63–US64` / `PB70–PB71` dùng trạng thái báo cáo ca trực `REVIEWED`, trong khi `SRS FR56–FR57` (`UC.24–UC.25`) dùng `APPROVED / REJECTED` (`E2E-ISS-09`).
     - `US69` / `PB76` ghi ngưỡng mất heartbeat ví dụ `> 120 s`, trong khi `SRS UC.07` / `DBD Table 15` dùng chu kỳ `30 s × 3 = 90 s` (`E2E-ISS-18`).
     - `US47` ghi `batch size 4`, trong khi `Proposal §8.4` và `PB17` ghi `batch size 2, gradient accumulation 4 (effective 8)` (`E2E-ISS-25`).
5. **Business Rules (`BR-01..BR-06`) có thống nhất giữa các tài liệu không?**
   - `BR-01, BR-02, BR-03, BR-05, BR-06` thống nhất hoàn toàn. Riêng **`BR-04` (Tách biệt quyền giữa `it_admin` và `knowledge_manager`)** bị mâu thuẫn ở chức năng **Duyệt tài liệu tải lên (`FR54` / `US61` / `PB68`)**: `SRS Final` (Bảng T8 & `FR54`) chỉ cho phép `Knowledge Administrator` duyệt, trong khi `Proposal` (Bảng 6.1a), `US61`, `PB68` và `Project Plan` ghi cả `Knowledge Administrator` và `System & IT Administrator` cùng có quyền duyệt (`E2E-ISS-08`).
6. **Actor và User Role có nhất quán không?**
   - **Chưa nhất quán 100% (`E2E-ISS-02`, `E2E-ISS-27`):** `Proposal` và `Project Plan` gọi hệ thống có "4 system roles" (xem `Department Manager` là operational persona), trong khi `SRS`, `Product Backlog`, `Architecture` và `Database Design` định nghĩa 5 system roles chính thức. Ngoài ra mã code của role khác nhau giữa SRS (`manager`, `standard`) và SAD/DBD (`department_manager`, `standard_user`).
7. **Tên Module và Feature có được sử dụng thống nhất không?**
   - 6 tên Module chuẩn được giữ thống nhất trong thân bài của cả 7 tài liệu, **ngoại trừ Bảng T54 (Phụ lục B.2) của `SRS Final`** đổi tên Module 5 thành *"Module 5: Model Adaptation & Evaluation"* thay vì *"Module 5: Enterprise Multi-facet Search"* (`E2E-ISS-03`).
8. **Có chức năng mới trong tài liệu nhưng không có nguồn gốc yêu cầu không?**
   - **KHÔNG:** Toàn bộ 10 yêu cầu mới `FR53–FR62` (`US60–US69`, `PB67–PB76`) đều đã được cập nhật và phê duyệt đồng bộ trong `Proposal Ver 1.2` (§4.2, §6.1, §7, §10).
9. **Có yêu cầu bị mất trong quá trình chuyển từ tài liệu trước sang tài liệu sau không?**
   - **Không có yêu cầu nào bị mất nội dung**, nhưng **Bảng RTM Phụ lục B (`Table T53`) của `SRS Final` gán sai mã `US`/`PB` ở 13 dòng** (`E2E-ISS-03`), khiến người đọc tra cứu theo bảng T53 sẽ bị dẫn sang sai User Story.
10. **Có yêu cầu ngoài phạm vi dự án không?**
    - **KHÔNG:** Chức năng xuất file PDF/Word cho Executive Briefing đã được loại bỏ đồng bộ khỏi phạm vi MVP ở cả 7 tài liệu; kết nối Google Drive/Sheets (`US09` / `PB06` / `FR19`) được đánh dấu rõ là `[Optional / Stretch Goal]`.

*(Bảng đối chiếu chi tiết 64 hạng mục `Proposal → User Story → PBI → SRS` được trình bày đầy đủ tại [GraphMind-End-to-End-Traceability-Matrix.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-End-to-End-Traceability-Matrix.md)).*

---

## 4. Architecture Audit Results (Phase 3 — `7.C1SE18_Architecture-Document-ver1.1.docx`)

### 4.1 Architecture Completeness & Consistency Evaluation
- **Architectural Pattern (§4.1):** Client-Server Hybrid Modular Monolith with Multi-Model Persistence (`ADR-01`, `ADR-02`). Phù hợp hoàn toàn với quy mô nhóm 5 sinh viên và triển khai trên 1 máy chủ cục bộ có GPU.
- **Functional Drivers (§3.1.2 `FD-01` to `FD-06`):** Bao phủ 100% `FR01–FR62` (trong đó `FD-06` đặc tả rõ `FR53–FR57`, `FD-04` đặc tả `FR58–FR60` và 5 role `BR-04`, `FD-02` đặc tả `FR61` Cypher Guard và 384-dim `all-MiniLM-L6-v2`, `FD-01` đặc tả `FR62` AEGIS HTTP REST 30s heartbeat & Kill Switch $\le 3\text{ s}$).
- **Quality Attributes & Utility Tree (§3.3 Tables 5.1, 5.2, 5.3):** 7 kịch bản `QAS-01..QAS-07` định lượng rõ ràng, khớp SLA với `SRS NFR-01..08`, đồng thời Bảng 5.3 phản ánh trung thực trạng thái thực thi và kiểm thử.
- **Architecture Decision Records (§6 Table 8):** 5 quyết định kiến trúc (`ADR-01` Modular Monolith, `ADR-02` Multi-Model Persistence, `ADR-03` Local Ollama Q4_K_M + In-Process 384-dim Embedder, `ADR-04` Native Host PostgreSQL & Ollama + Dockerized App/Neo4j/Qdrant, `ADR-05` Single-Worker In-Memory Ingestion Locks) giải thích rõ lý do và giới hạn kỹ thuật.

### 4.2 Defects Found in `7.C1SE18_Architecture-Document-ver1.1.docx`
1. **`E2E-ISS-04` (HIGH — Documentation Defect):** Trong file `docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx`, 5 hình vẽ `Figures 1–5` vẫn là hình ảnh cũ từ bản Ver 1.0 kèm dòng ghi chú *"the figure above is the Ver 1.0 diagram and is outdated"* và 7 dòng chữ đỏ `[DIAGRAM PLACEHOLDER: ...]`, cùng các tham chiếu treo `Table 6.2c` và `TD-01..TD-05`. *(Giải pháp: Thay thế bằng bản [C1SE18_Architecture-Document-ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/07-architecture/C1SE18_Architecture-Document-ver1.1.docx) đã nhúng 6 sơ đồ PNG 250 DPI mới và xóa các tham chiếu treo).*
2. **`E2E-ISS-11` (MEDIUM — Documentation Defect):** Bảng 7 (§5.2 *Team Workload & Task Assignment Matrix*) phân công vai trò của 4 thành viên (Ngoc Minh, Hoang Anh, Anh Vu, Anh Bao) mâu thuẫn với `Project Plan Ver 1.2` (§2.1 Table T5 & RACI Table T6) và `Product Backlog Ver 1.2` (§8 Table T9).
3. **`E2E-ISS-07` (MEDIUM — Cross-Document Framing Defect):** Mục 3.4 `CON-01` và Mục 5.2 quy định triển khai 100% On-Premise Single-Host, mâu thuẫn với thuật ngữ *"Hybrid Deployment (Local Agent + Backend Cloud)"* trong `Proposal Ver 1.2` và `SRS Final`.

---

## 5. Database Design Audit Results (Phase 4 — `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`)

### 5.1 Database Design Completeness & Schema Quality
- **PostgreSQL Schema (§3.1):** Đặc tả chi tiết 34 bảng, tách biệt rõ **13 bảng Implemented MVP** (§3.1.2, Tables 8–20: `users, password_reset_otps, user_active_sessions, knowledge_access_policies, knowledge_permissions, audit_logs, knowledge_upload_approvals, pb56_workstations, pb56_workstation_sync_logs, pb56_sync_mode_audit_logs, sop_documents, copilot_sessions, shift_reports`) và **21 bảng Planned Extensions** (§3.1.4–3.1.8, Tables 22–42, đánh dấu `[PLANNED]`).
- **Constraints, PK/FK & Normalization (§3.1.2, §3.1.11, §6.1):** Mọi bảng đều có PK rõ ràng; 9 quan hệ khóa ngoại giữa 13 bảng MVP (Bảng 77) và 34 quan hệ của các bảng Planned (Bảng 78–81) được điền đầy đủ 100% (0 ô FK trống), đánh dấu chính xác các `FK[P]` và `CHECK[P]` đang thiếu trong code. Giải trình rõ chuẩn hóa 3NF và lý do phi chuẩn hóa có chủ đích cho các cột `JSON`/`JSONB` và snapshot audit.
- **Neo4j & Qdrant Models (§3.2, §3.3):** Đặc tả chính xác 10 nhãn Neo4j và 8 quan hệ thực tế trong `SCHEMA_REGISTRY` (kèm số lượng node thực tế), cùng 2 Qdrant collection `384-dim` Cosine (`cuad_contracts`, `adventureworks_entities`) và cơ chế `PR1 Layer-1 Guard` (`is_active != False`).

### 5.2 Defects Found in `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` & Underlying DB Code
1. **`E2E-ISS-06` (HIGH — Implementation Gap in DB Code):** Chuỗi migration Alembic hỏng (`0186c646946f` sai tên cột PK `id`/`hashed_password`, `a93ce8369026` rỗng), 5 file tạo bảng bằng raw SQL lúc runtime, thiếu ORM model cho `user_active_sessions`, và thiếu 5 FK vật lý + CHECK constraints trong code.
2. **`E2E-ISS-13` (MEDIUM — Documentation Defect):** Bảng 44 (§3.1.9) ghi `TEST VERIFIED: NOT VERIFIED` cho cả 13 bảng, chưa cập nhật bằng chứng từ 24 file `pytest` có sẵn trong `backend/app/tests/`.
3. **`E2E-ISS-15` (MEDIUM — Documentation Defect):** Mục 4 (*Data Mapping*) và Mục 5 (*Integration Logic*) vẫn diễn giải luồng liên kết khóa và Citation Viewer dựa trên các bảng `[PLANNED]` (`raw_documents`, `message_citations`, `sync_jobs`) thay vì cấu trúc MVP thực tế (`knowledge_upload_approvals`, UUIDv5 `doc_id`, `copilot_sessions.messages` JSON).
4. **`E2E-ISS-22` & `E2E-ISS-23` (LOW — Documentation Defects):** Trang bìa (`P10`) và Bảng T2 (`P29`) còn để ngày `25 Sep 2026` (thay vì `22 Nov 2026`), Mục 1.4 (`P66`) còn tham chiếu `7.C1SE18_Architecture-Document-ver1.0` (thay vì `ver1.1`), và Bảng 4 (`P77`) còn ghi `Tailwind CSS`.

---

## 6. Architecture–Database Consistency Summary (Phase 5)

*(Báo cáo phân tích độc lập và bảng ánh xạ chi tiết Component ↔ Database được trình bày tại [GraphMind-Architecture-Database-Consistency.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-Architecture-Database-Consistency.md)).*

- **Mức độ khớp giữa `Architecture Ver 1.1` và `Database Design Ver 1.1`:** **92% (GOOD)**.
- Cả hai tài liệu thống nhất tuyệt đối về danh sách 13 bảng PostgreSQL MVP, 10 nhãn / 8 quan hệ Neo4j, 2 collection Qdrant 384-dim (`all-MiniLM-L6-v2`), giao thức kết nối (`asyncpg :5432`, `Bolt :7687`, `REST :6333`, `Ollama :11434`), và 5 cơ chế bảo mật dữ liệu (`bcrypt`, `JWT+JTI`, `Dynamic 2D RBAC`, `Read-Only Cypher Guard`, `PR1 Layer-1 Qdrant Guard`).

---

## 7. Source Code Verification Summary (Phase 7)

*(Báo cáo kiểm chứng chi tiết từng file code và 24 bộ test được trình bày tại [GraphMind-SourceCode-Alignment-Report.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-SourceCode-Alignment-Report.md)).*

| Layer / Subsystem | Code Exists | Integrated End-to-End | Automated Tests in Repo | Key Implementation Gaps / Defects |
|---|---|---|---|---|
| **Frontend SPA (`frontend/src/`)** | **Yes** (17 views across `m1..m6`, SSE hook, D3 graph) | **Yes** (`api.js` JWT + `401 CONCURRENT_LOGIN_KICKED` + SSE) | Manual / E2E via backend API suites | Role codes in `roles.js` (`knowledge_mgr, manager, standard`) differ from backend canonical codes (`E2E-ISS-02`); custom CSS used instead of Tailwind (`E2E-ISS-23`). |
| **Backend API & Modules (`backend/app/`)** | **Yes** (`m1`: 4,371L; `m3`: 5,879L; `m6`: 2,468L; `main.py`: 3,306L; `api/v1/`: 7 routers) | **Yes** (All 6 module workflows wired to PG, Neo4j, Qdrant, Ollama) | **24 `pytest` files** + Fake Neo4j/Qdrant harness | `m2`, `m4`, `m5` are 0-line stubs (`E2E-ISS-12`); wildcard CORS & default agent key (`E2E-ISS-05`); `sha256_hash` missing on upload queue table (`E2E-ISS-10`); `shift_daily_summaries` not persisted (`E2E-ISS-09`). |
| **Multi-Model Data Layer (`backend/app/db/`)** | **Yes** (12 ORM models + 1 raw SQL table; Neo4j & Qdrant clients) | **Yes** | Tested across unit & integration suites | Unsalted SHA-256 OTP (`E2E-ISS-05`); 4 role codes in `knowledge_access_policies` (`E2E-ISS-02`); broken Alembic chain & missing FKs/CHECKs (`E2E-ISS-06`); missing Qdrant `department`/`is_active` payload index (`E2E-ISS-16`). |
| **AEGIS File Watcher (`aegis_file_watcher/`)** | **Yes** (`watchdog` daemon, SHA-256, 30s heartbeat, 2-phase ACK, Kill Switch) | **Yes** (HTTP REST to FastAPI `:5000`) | `test_pb56_workstations.py` | Default `AGENT_API_KEY` in `docker-compose.yml` (`E2E-ISS-05`). |
| **Performance & Load Testing (Locust)** | **Missing (`locustfile.py` not found)** | **N/A** | **`NOT VERIFIED`** | Missing `locustfile.py` and 150-VU SLA execution report for `WBS 23b` (`E2E-ISS-17`). |

---

## 8. Project Plan Alignment Audit (Phase 6 — `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx`)

The table below audits all **40 WBS Work Packages (`WBS 1` to `WBS 27`)** from `Project Plan Ver 1.2` (§3.3 Table T11 & §3.2 Table T10) against SRS Requirements, Architecture Components, and Database Components:

| Project Plan WBS ID | WBS Task / Deliverable Name (Sprint) | Related SRS Requirement (`Final`) | Architecture Component (SAD Ver 1.1) | Database Component (DBD Ver 1.1) | Alignment Status |
|---|---|---|---|---|---|
| **WBS 1** | Sprint Plan & Backlog Sprint 1 (`S1`, `C1SE18-32, 33`) | *N/A (Scrum Management Activity)* | *N/A* | *N/A* | **ALIGNED (Process Task)** |
| **WBS 2** | Authentication Module & Single Active Session (`S1–S2`, `C1SE18-6..11`, `PB01, PB43, PB73`) | `FR1, FR2, FR4, FR59`, `UC.01, UC.26` | `api/v1/auth.py`, `core/security.py`, `m6/session_service.py` | PG: `users`, `user_active_sessions`, `audit_logs` | **FULLY ALIGNED** |
| **WBS 3** | Home & Dashboard (`S1`, `C1SE18-12..15`, `PB44`) | `FR40`, `UC.01, UC.19` | `api/v1/dashboard.py`; Frontend: `HomeView.jsx` | PG: `users, shift_reports, audit_logs`; Neo4j aggregates | **FULLY ALIGNED** |
| **WBS 4** | Database Architecture (`S1`, `C1SE18-17`, `PB45`) | `FR8`, `UC.02` | `db/postgres/`, `db/neo4j/`, `db/qdrant/` (`ADR-02`) | Multi-Model Schema (13 PG tables, 10 Neo4j labels, 2 Qdrant collections) | **FULLY ALIGNED** |
| **WBS 5** | Test Plan Sprint 1 & Data Ingestion Pipeline (`S1`, `C1SE18-25, 29`, `PB07, PB46, PB77`) | `FR17`, `UC.10`, `BR-06` | `m1_data_sync/pipeline.py` (SHA-256, UUIDv5, PR1 recovery) | Neo4j (10 labels) & Qdrant (`cuad_contracts`, `adventureworks_entities`) | **FULLY ALIGNED** |
| **WBS 5b** | Q&A Dataset (509 ChatML) & Controlled Synthetic Linking (`S1`, `PB16, PB47`) | `FR18, FR37`, `UC.10`, `BR-01` | Offline Dataset Pipeline & `semantic_layer.py` | Neo4j: `(:Company)-[:PARTY_TO]->(:Document)` & `train_dataset.json` | **ALIGNED** (`PARTY_TO` bridge note `E2E-ISS-14`) |
| **WBS 6** | Close Sprint 1 (`S1`, `C1SE18-34..37`) | *N/A (Scrum Closure Activity)* | *N/A* | *N/A* | **ALIGNED (Process Task)** |
| **WBS 7** | Knowledge Base Module & Extraction/Loading (`S2`, `C1SE18-18..20`, `PB08–PB12, PB19, PB50, PB78`) | `FR20–FR23`, `UC.11, UC.12` | `main.py` inline explorer routes; `pipeline.py`; `DocumentsView.jsx` | Neo4j (`:Document, :Clause`), Qdrant (`cuad_contracts` 384-dim) | **ALIGNED** (`m2` backend folder is stub `E2E-ISS-12`) |
| **WBS 7b** | Staff Document Upload & SHA-256 Idempotency Guard (`S2–S3`, `PB67`) | `FR53`, `UC.23`, `BR-02, BR-06` | `m6/document_approval_router.py`; `DocumentsView.jsx` | PG: `knowledge_upload_approvals` + `.pending_uploads` | **PARTIAL GAP** (`sha256_hash` column `[P]` on queue table `E2E-ISS-10`) |
| **WBS 8** | Document Ingestion API (`S2`, `C1SE18-38`, `PB48`) | `FR16`, `UC.10` | `m1_data_sync/pipeline.py`, `webhook.py` | PG: `knowledge_upload_approvals`, `pb56_workstation_sync_logs`; Neo4j; Qdrant | **FULLY ALIGNED** |
| **WBS 9** | File Watcher API (`S2`, `C1SE18-30`, `PB49`) | `FR15`, `UC.08` | `m1_data_sync/webhook.py`; `useWatcherEvents.js` (SSE) | PG: `pb56_workstation_sync_logs` | **FULLY ALIGNED** |
| **WBS 10** | Module Settings & Granular Dynamic RBAC Matrix (`S2–S3`, `C1SE18-26..28, 31`, `PB02, PB03, PB72`) | `FR3, FR5, FR6, FR58`, `UC.02–UC.04, UC.26`, `BR-02..05` | `m6/user_admin_api.py`, `rbac_matrix_*`, `audit_service.py`; `GranularRbacMatrix.jsx` | PG: `users`, `knowledge_access_policies`, `knowledge_permissions`, `audit_logs` | **PARTIAL GAP** (4 vs 5 role codes in matrix `E2E-ISS-02`) |
| **WBS 11** | GraphRAG AI Copilot & Knowledge Graph Viewer (`S2`, `C1SE18-21..24`, `PB15, PB51`) | `FR27, FR33, FR34`, `UC.15, UC.16` | `api/v1/copilot.py`; `CopilotView.jsx`, `GraphPanel.jsx` (D3-Force) | PG: `copilot_sessions`; Neo4j (10 labels) | **FULLY ALIGNED** |
| **WBS 11b** | LoRA Fine-Tuning Pipeline (`S2`, `PB17, PB18`) | `FR36`, `NFR-03` | Kaggle T4 Unsloth QLoRA pipeline → Hugging Face checkpoints | *N/A (Model weights & checkpoints)* | **ALIGNED** |
| **WBS 11c** | Email OTP Password Recovery Service (`S2`, `C1SE18-10`, `PB74`) | `FR2, FR60`, `UC.01, UC.26`, `NFR-02` | `m6/forgot_password_router.py`, `otp_service.py`; SMTP `:587` | PG: `password_reset_otps`, `users`, `user_active_sessions` | **PARTIAL GAP** (Unsalted SHA-256 OTP hash `E2E-ISS-05`; `PB74` says `WBS 11b` `E2E-ISS-28`) |
| **WBS 12** | Close Sprint 2 (`S2`, `C1SE18-39..44`) | *N/A (Scrum Closure Activity)* | *N/A* | *N/A* | **ALIGNED (Process Task)** |
| **WBS 13** | Hybrid Query & RRF Pipeline, Citation Viewer & Multi-facet Search (`S3`, `C1SE18-45..47, 49`, `PB20–PB29, PB52`) | `FR27–FR32, FR45, FR46`, `UC.15, UC.17, UC.22` | `m3_hybrid_copilot/` (`nl2cypher_engine.py`, `context_fusion.py`); `main.py` search routes; `SearchView.jsx` | Neo4j (10 labels/8 rels); Qdrant (2 384-dim collections); PG (`copilot_sessions`) | **FULLY ALIGNED** |
| **WBS 13b** | Read-Only Cypher Guard & Injection Shield (`S3`, `PB75`) | `FR31, FR61`, `UC.15, UC.27`, `NFR-02` | `m3_hybrid_copilot/query_engine/text_to_cypher.py` | Neo4j read-only protection; PG `audit_logs` | **FULLY ALIGNED** |
| **WBS 14** | AEGIS Local Agent & Sync API (`S3`, `C1SE18-48`, `PB05`) | `FR7, FR13`, `UC.07, UC.08` | `aegis_file_watcher/main.py`; `m1_data_sync/webhook.py` | PG: `pb56_workstations`, `pb56_workstation_sync_logs`; Shared `/data` | **FULLY ALIGNED** |
| **WBS 15** | Knowledge Editor (`S3`, `C1SE18-50, 51`, `PB41`) | `FR24`, `UC.13`, `BR-04` | `main.py` inline graph CRUD routes; `KnowledgeView.jsx` | Neo4j (10 labels); PG `audit_logs` | **ALIGNED** (`m2` backend folder is stub `E2E-ISS-12`) |
| **WBS 15b** | SOP & Internal Knowledge Base Authoring (`S3`, `C1SE18-50, 51`, `PB53`) | `FR26`, `UC.14`, `BR-04` | `api/v1/sop.py`; `SopView.jsx` | PG: `sop_documents`, `audit_logs` | **FULLY ALIGNED** |
| **WBS 15c** | Document Approval Oversight Panel (`S3`, `PB68`) | `FR54`, `UC.23`, `BR-04, BR-06` | `m6/document_approval_router.py` → `m1/pipeline.py`; `PendingApprovalsPanel.jsx` | PG: `knowledge_upload_approvals`, `audit_logs`; Neo4j; Qdrant | **ALIGNED** (Role authority conflict `E2E-ISS-08`) |
| **WBS 15d** | Shift Handover Report Submission & Department Review (`S3`, `PB69, PB70`) | `FR55, FR56`, `UC.24`, `BR-02` | `api/v1/shift_reports.py`; `ShiftReportEditor.jsx`, `DepartmentReportView.jsx` | PG: `shift_reports`, `audit_logs` | **ALIGNED** (`REVIEWED` vs `APPROVED` wording in US/PB `E2E-ISS-09`) |
| **WBS 15e** | Ollama GGUF Serving & Deterministic Fallback (`S3`, `PB55`) | `FR35`, `UC.15`, `NFR-01, NFR-03` | `m3_hybrid_copilot/inference/client.py`; Host Ollama `:11434` (`ADR-03, ADR-04`) | *N/A (Local LLM inference service)* | **FULLY ALIGNED** |
| **WBS 16** | Graph Editor & AI Copilot Integration API (`S3`, `C1SE18-52`, `PB54`) | `FR25`, `UC.13` | `main.py` inline routes; `db/neo4j/client.py`; `db/qdrant/client.py` | Neo4j & Qdrant synchronized updates; PG `audit_logs` | **FULLY ALIGNED** |
| **WBS 17** | Advanced AI Test Case (`S3`, `C1SE18-53`, `PB79`) | `FR27–FR31, FR61` Verification | `backend/app/tests/` (`test_safety_guard.py`, `test_nl2cypher_golden_suite.py`) | Fake Neo4j & Qdrant test harness | **FULLY ALIGNED** |
| **WBS 18** | Close Sprint 3 (`S3`, `C1SE18-54..59`) | *N/A (Scrum Closure Activity)* | *N/A* | *N/A* | **ALIGNED (Process Task)** |
| **WBS 19** | AEGIS Local Agent Panel & PB56 Workstation Kill Switch (`S4`, `C1SE18-60..62`, `PB56, PB76`) | `FR14, FR62`, `UC.07, UC.09, UC.27`, `NFR-01` | `api/v1/pb56_workstations.py`; `m1/pb56_workstation_service.py`; `WorkstationsPanel.jsx` | PG: `pb56_workstations`, `pb56_workstation_sync_logs`, `pb56_sync_mode_audit_logs` | **FULLY ALIGNED** (`PB56/PB76` cite `WBS 18` `E2E-ISS-28`) |
| **WBS 19b** | Executive Dashboard & Smart Risk Center — 4 Risk Criteria (`S4`, `PB57, PB58, PB40`) | `FR41–FR43`, `UC.19, UC.20`, `BR-02, BR-05` | `api/v1/dashboard.py`; `ExecutiveView.jsx`, `RiskView.jsx` | Neo4j dynamic aggregations; *[PLANNED PG: `system_alerts, alert_recipients`]* | **FULLY ALIGNED** (`PB57/PB58` cite `WBS 19` `E2E-ISS-28`) |
| **WBS 19c** | AI Daily Shift Consolidation & Web Briefing Generator (`S4`, `PB71, PB65`) | `FR44, FR57`, `UC.21, UC.25`, `NFR-01, NFR-03` | `api/v1/shift_reports.py` (`/consolidate`); `api/v1/dashboard.py`; Host Ollama `:11434` | PG: `shift_reports`; *[PLANNED PG: `shift_daily_summaries, executive_briefings`]* | **PARTIAL GAP** (`shift_daily_summaries` not persisted `E2E-ISS-09`; `PB65/PB71` cite `WBS 19b` `E2E-ISS-28`) |
| **WBS 20** | Test Case RBAC & Settings (`S4`, `C1SE18-63`, `PB03, PB63`) | `FR3, FR5, FR58` Verification | `backend/app/tests/test_department_scope.py`, `test_user_admin_api.py` | PG: `knowledge_access_policies, users` | **FULLY ALIGNED** |
| **WBS 21** | Admin Analytics & LLMOps Dashboard (`S4`, `C1SE18-64..67`, `PB42, PB66`) | `FR9, FR12`, `UC.05` | `api/v1/dashboard.py`; `AdminView.jsx`, `AdminLivePanels.jsx` | PG: `users, audit_logs, copilot_sessions`; *[PLANNED: `llm_cost_usage_logs`]* | **FULLY ALIGNED** (`PB42/PB66` cite `WBS 20` `E2E-ISS-28`) |
| **WBS 22** | Benchmark Construction — 100 Ground-Truth Questions (`S4`, `PB32`) | `FR47` | Benchmark Evaluation Suite (`docs/reports/benchmark_evaluation_report.md`) | Neo4j & Qdrant benchmark dataset | **FULLY ALIGNED** (`PB32` cites `WBS 21` `E2E-ISS-28`) |
| **WBS 23** | Baseline Evaluation — 3 Baselines on 5 Indicators (`S4`, `PB33–PB36, PB60`) | `FR48–FR52` | `m3_hybrid_copilot/` (Vector, Graph, Hybrid modes) | Neo4j & Qdrant | **FULLY ALIGNED** (`PB33–36, 60` cite `WBS 22` `E2E-ISS-28`) |
| **WBS 23b** | System Performance & Load Testing with Locust (up to 150 VU) (`S4`, Proposal Ver 1.2) | `NFR-01` ($p95 < 500\text{ ms}$ read, $< 2000\text{ ms}$ heavy) | FastAPI & Multi-Model DB under 150 VU concurrency (`QAS-01`) | All 3 stores under concurrent read/query load | **MISSING IN REPO & BACKLOG** (No dedicated PBI in Backlog & no `locustfile.py` in repo `E2E-ISS-17`) |
| **WBS 24** | Technical Report (`S4`, `PB38`) | `FR52` (`US56`) | *N/A (Research Report Deliverable)* | *N/A* | **ALIGNED** (`PB38` cites `WBS 23` `E2E-ISS-28`) |
| **WBS 25** | AI Usage Disclosure Statement (`S4`, `PB61`) | Governance (`US57`) | *N/A (Governance Deliverable)* | *N/A* | **ALIGNED** (`PB61` cites `WBS 24` `E2E-ISS-28`) |
| **WBS 26** | Reflection & Peer Evaluation (`S4`, `PB39`) | Governance (`US58`) | *N/A (Project Management Deliverable)* | *N/A* | **ALIGNED** (`PB39` cites `WBS 25` `E2E-ISS-28`) |
| **WBS 27** | Final Documentation, E2E Test & Project Closing (`S4`, `C1SE18-68..73`, `PB30, PB37, PB62–PB64`) | System-Wide DoD (`US12, US28, US59`) | Full Integrated Platform (`docker-compose.yml` + 24 pytest files) | All 13 Implemented PG Tables + Neo4j + Qdrant | **ALIGNED** (`PB62–64` cite `WBS 26` `E2E-ISS-28`) |

---

## 9. Cross-Document Issue List Summary (Phase 8 & Phase 13)

*(Chi tiết đầy đủ 28 Issue kèm bằng chứng `file:line` và hướng khắc phục được trình bày tại [GraphMind-Cross-Document-Issue-List.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-Cross-Document-Issue-List.md)).*

| Issue ID | Severity | Category | Classification | Summary of Issue |
|---|---|---|---|---|
| **`E2E-ISS-01`** | **HIGH** | E / F | `DOCUMENTATION DEFECT` | `SRS Final` §4.5 (API Summary) and §4.6 (Data Requirements: 10 PG tables, 6 Neo4j labels, 768-dim `graphmind_chunks`) contradict `Database Design Ver 1.1` (13 MVP PG tables, 10 Neo4j labels, 384-dim `cuad_contracts`), `Architecture Ver 1.1`, and Source Code. |
| **`E2E-ISS-02`** | **HIGH** | A / E | `BOTH DOC & IMPL DEFECT` | System Role count (4 vs 5 roles) and role code strings differ across documents (`manager`/`standard` vs `department_manager`/`standard_user`), `frontend/src/data/roles.js` (`knowledge_mgr`), `seed_users.py`, and `knowledge_access_policies` (which still uses 4 codes with unsplit `ADMIN`). |
| **`E2E-ISS-03`** | **HIGH** | A | `DOCUMENTATION DEFECT` | `SRS Final` Appendix B (`Table T53`) contains 13 wrong `US`/`PB` mappings (`Rows 12, 13, 16, 20, 22, 23, 24, 25, 26, 30, 37, 47, 48, 49`), and Appendix B.2 (`Table T54 Row 5`) renames Module 5 to *"Model Adaptation & Evaluation"*. |
| **`E2E-ISS-04`** | **HIGH** | B | `DOCUMENTATION DEFECT` | `docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx` still retains 5 outdated Ver 1.0 diagrams + 7 red `[DIAGRAM PLACEHOLDER]` lines and dangling references (`Table 6.2c`, `TD-01..TD-05`). *(Fixed in sibling file `C1SE18_Architecture-Document-ver1.1.docx`).* |
| **`E2E-ISS-05`** | **HIGH** | E | `IMPLEMENTATION GAP` | Security implementation defects in code: unsalted `SHA-256` OTP hashing in `otp.py`, wildcard `allow_origins=["*"]` with credentials in `main.py`, and default fallback `AGENT_API_KEY` in `docker-compose.yml`. |
| **`E2E-ISS-06`** | **HIGH** | C / E | `IMPLEMENTATION GAP` | Database migration & integrity gaps in code: broken Alembic revisions (`0186c646946f`, `a93ce8369026`), runtime `CREATE TABLE IF NOT EXISTS` in 5 files, no ORM class for `user_active_sessions`, and 5 missing physical Foreign Keys + 0 CHECK constraints. |
| **`E2E-ISS-07`** | **MEDIUM** | A / B | `DOCUMENTATION DEFECT` | Deployment model framing conflict: `Proposal`, `US`, `PB`, and `SRS` describe Hybrid Cloud (`AEGIS ↔ Backend Cloud`), while `Architecture Ver 1.1`, `Database Design Ver 1.1`, and `docker-compose.yml` specify 100% On-Premise Single-Host deployment. |
| **`E2E-ISS-08`** | **MEDIUM** | A | `BOTH DOC & IMPL DEFECT` | Document Upload Approval (`FR54`/`US61`/`PB68`) authority conflict: `SRS` & `DBD` allow only `Knowledge Administrator`, while `Proposal`, `US61`, `PB68`, `Project Plan`, `SAD §4.4`, and `document_approval_router.py` allow both `Knowledge Admin` and `IT Admin`. |
| **`E2E-ISS-09`** | **MEDIUM** | A / D | `BOTH DOC & IMPL DEFECT` | Shift Report status enum in `US63–64`/`PB70–71` (`REVIEWED`) differs from `SRS`/`SAD`/`DBD`/Code (`APPROVED`/`REJECTED`), and daily summary persistence (`shift_daily_summaries` in `SRS FR57`) is `[PLANNED]` / not persisted in code. |
| **`E2E-ISS-10`** | **MEDIUM** | A / E | `BOTH DOC & IMPL DEFECT` | `knowledge_upload_approvals` in code lacks the `sha256_hash` column (`[P]` in DBD Table 14), so duplicate file content is not rejected by SHA-256 at the upload staging step (`FR53`/`US60`). |
| **`E2E-ISS-11`** | **MEDIUM** | B / F | `DOCUMENTATION DEFECT` | `Architecture Ver 1.1` §5.2 Table 7 (*Team Workload & Task Assignment Matrix*) assigns roles/modules that contradict `Project Plan Ver 1.2` (§2.1 Table T5 & RACI Table T6) and `Product Backlog Ver 1.2` (§8). |
| **`E2E-ISS-12`** | **MEDIUM** | B / E | `IMPLEMENTATION GAP` | Backend vertical modules `m2_knowledge_editor`, `m4_decision_support`, and `m5_multifacet_search` are 0-line package stubs; logic resides in `main.py` (3,306 lines, 37 inline routes) and `api/v1/{dashboard.py, sop.py, shift_reports.py}`. |
| **`E2E-ISS-13`** | **MEDIUM** | C / E | `DOCUMENTATION DEFECT` | `Database Design Ver 1.1` §3.1.9 Table 44 marks all 13 implemented tables as `TEST VERIFIED: NOT VERIFIED`, overlooking the 24 automated `pytest` files in `backend/app/tests/`. |
| **`E2E-ISS-14`** | **MEDIUM** | C / E | `BOTH DOC & IMPL DEFECT` | Neo4j loaded nodes have duplicate mixed-case properties (`TotalDue`/`totalDue`, string `OrderDate`), and the `Customer ↔ Company ↔ Document` synthetic linking bridge differs from the direct `BOUND_BY_CONTRACT` edge in Proposal §8.5. |
| **`E2E-ISS-15`** | **MEDIUM** | D | `DOCUMENTATION DEFECT` | `Database Design Ver 1.1` Sections 4 & 5 trace key mapping and Citation Viewer logic through `[PLANNED]` tables (`raw_documents`, `message_citations`, `sync_jobs`) rather than the 13 implemented MVP tables. |
| **`E2E-ISS-16`** | **MEDIUM** | D / E | `BOTH DOC & IMPL DEFECT` | Qdrant payload field names differ between DBD Table 65 (`department_scope`) and code (`department`), `qdrant/client.py` lacks payload indexes on `department`/`is_active`, and `Neo4jClient.search_nodes()` performs a full graph scan. |
| **`E2E-ISS-17`** | **MEDIUM** | E | `IMPLEMENTATION GAP` | No Locust load-test script (`locustfile.py`) or 150-VU SLA test report exists in the repository for `WBS 23b` / `SRS NFR-01` / `SAD QAS-01`, and no PBI ID exists for `WBS 23b` in `Product Backlog Ver 1.2`. |
| **`E2E-ISS-18`** | **MEDIUM** | A / E | `DOCUMENTATION DEFECT` | `SRS Final` (`FR62`, §4.4, §4.5) specifies `WSS wss://.../agent/control` for AEGIS control instead of `HTTP REST` (`/api/v1/workstations/*`), and `US69/PB76` state a `120 s` heartbeat threshold vs `30 s × 3 = 90 s` in DBD/Code. |
| **`E2E-ISS-19`** | **MEDIUM** | E | `DOCUMENTATION DEFECT` | `Proposal`, `US68`, `PB75`, and `SRS FR61` claim an AST syntax-tree parser for the Read-Only Cypher Guard, whereas `text_to_cypher.py` (and `SAD Ver 1.1` / `DBD Ver 1.1`) implement a keyword/regex guard (`FORBIDDEN_KEYWORDS`). |
| **`E2E-ISS-20`** | **MEDIUM** | C / D | `BOTH DOC & IMPL DEFECT` | Legacy table `knowledge_permissions` coexists with `knowledge_access_policies` (Dual Source of Truth), and `users.department_id` is an orphan `UUID` while 4 sibling tables use `department_code VARCHAR`. |
| **`E2E-ISS-21`** | **LOW** | C | `IMPLEMENTATION GAP` | Four ORM models declare redundant `index=True` on `primary_key=True` UUID columns, and 3 tables use `JSON` instead of `JSONB`. |
| **`E2E-ISS-22`** | **LOW** | F | `DOCUMENTATION DEFECT` | `Database Design Ver 1.1` Cover Page (`P10`) and Table T2 (`P29`) still show `25 Sep 2026` instead of `22 November 2026`, and §1.4 (`P66`) references `7.C1SE18_Architecture-Document-ver1.0` instead of `ver1.1`. |
| **`E2E-ISS-23`** | **LOW** | E / F | `DOCUMENTATION DEFECT` | `SRS Final` (`FR34`, §4.1, §7.2) and `Database Design Ver 1.1` (§2.2 Table 4) mention `Tailwind CSS`, which is not installed in `frontend/package.json`. |
| **`E2E-ISS-24`** | **LOW** | F | `DOCUMENTATION DEFECT` | PostgreSQL version is stated as `PostgreSQL 16` in `Proposal`, `Project Plan`, and `Product Backlog` vs `PostgreSQL 15+` in `Architecture Ver 1.1` and `Database Design Ver 1.1`. |
| **`E2E-ISS-25`** | **LOW** | A / F | `DOCUMENTATION DEFECT` | `US47` states fine-tuning `batch size 4`, whereas `Proposal §8.4` and `PB17` specify `batch size 2 per device with gradient accumulation 4 (effective batch size 8)`. |
| **`E2E-ISS-26`** | **LOW** | F | `DOCUMENTATION DEFECT` | Stale referenced filenames in `User Story Ver 1.2` (`C1SE18_ProductBacklog_GraphMind_FINAL.docx`, `Project Plan FINAL 19 Sep 2026`) and minor internal `File name` cell differences (`7.`/`6.` prefixes, `_Final` vs `_Ver1.2`). |
| **`E2E-ISS-27`** | **LOW** | A | `DOCUMENTATION DEFECT` | `US08` (AEGIS Local Agent folder monitoring) lists actor `Executive`, whereas `PB05` and `SRS UC.07/UC.08` assign it to `System & IT Administrator`. |
| **`E2E-ISS-28`** | **LOW** | F | `DOCUMENTATION DEFECT` | 18 Sprint 2–4 PBIs in `Product Backlog Ver 1.2` Table T7 Column 12 (`Remarks`) cite off-by-one WBS numbers (`11b, 18, 19, 19b, 20, 21, 22, 23, 24, 25, 26`) compared to `Project Plan Ver 1.2` Table T11 (`11c, 19, 19b, 19c, 21, 22, 23, 24, 25, 26, 27`). |

---

## 10. End-to-End Traceability Matrix Summary (Phase 14)

*(Ma trận truy vết đầy đủ 7 chiều cho toàn bộ 64 hạng mục chức năng/nghiên cứu/quản trị, 8 NFR, 6 Business Rules và bảng sửa lỗi 13 dòng RTM của SRS được lưu tại [GraphMind-End-to-End-Traceability-Matrix.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-End-to-End-Traceability-Matrix.md)).*

- **Độ bao phủ truy vết (Traceability Coverage):**
  - `Proposal Ver 1.2` (6 Modules + Research & Governance) → `User Story Ver 1.2` (`US01–US69`): **100% (69/69 US)**
  - `User Story Ver 1.2` (`US01–US69`) → `Product Backlog Ver 1.2` (`PB01–PB79`): **100% (79/79 PBIs)**
  - `Product Backlog Ver 1.2` → `SRS Final` (`FR01–FR62`, `UC.01–UC.27`, `NFR-01–NFR-08`, `BR-01–BR-06`): **100% (62/62 FRs, 27/27 UCs)** *(sau khi đính chính 13 dòng gán nhầm mã US/PB tại Bảng T53 Phụ lục B của SRS)*
  - `SRS Final` (`FR01–FR62`) → `Architecture Ver 1.1` Components & `Database Design Ver 1.1` Entities/Tables: **100% (62/62 FRs)**
  - `Architecture Ver 1.1` & `Database Design Ver 1.1` → `Project Plan Ver 1.2` (`WBS 1–27`) & `Source Code`: **100% (13/13 Implemented PG Tables, 10/10 Neo4j Labels, 2/2 Qdrant Collections)** *(ngoại trừ `WBS 23b` Locust script chưa commit vào repo)*.

---

## 11. Quality & Maturity Assessment Rubric (Phase 9)

### 11.1 Scoring Methodology & Weighting Formula
- **Scale per Category:** `0–100 points` (`90–100 = GOOD`, `75–89 = NEEDS IMPROVEMENT`, `50–74 = INCONSISTENT / PARTIAL`, `< 50 = POOR / MISSING`).
- **Two Separate Composite Scores (per Phase 9 Rule):**
  1. **Documentation Suite Quality & Consistency Score (100% Weight across 10 Documentation Categories):** Measures the completeness, internal rigor, and cross-document consistency of the 7 Word documents.
  2. **Software Implementation & Verification Alignment Score (100% Weight across 3 Implementation/Testing Categories):** Measures how completely and securely the Source Code, Database Schema, and Test Suite realize the documented design.

### 11.2 Category-by-Category Evaluation Table

| # | Phase 9 Category | Rating | Score (/100) | Doc Weight | Impl Weight | Evidence-Based Justification |
|---:|---|---|---:|---:|---:|---|
| **1** | **Requirement Completeness** | **GOOD** | **95** | 10% | — | All 62 FRs (`FR1–FR62`), 27 UCs (`UC.01–UC.27`), 8 NFRs, 6 BRs, 69 US, and 79 PBIs are thoroughly specified with main, alternative, and exception flows. |
| **2** | **Requirement Consistency** | **NEEDS IMPROVEMENT** | **82** | 10% | — | High alignment on core scope, but affected by 4 vs 5 role definitions (`E2E-ISS-02`), Hybrid Cloud vs On-Premise framing (`E2E-ISS-07`), upload approval authority (`E2E-ISS-08`), and `REVIEWED` vs `APPROVED` shift status (`E2E-ISS-09`). |
| **3** | **Traceability** | **NEEDS IMPROVEMENT** | **84** | 10% | — | `US Ver 1.2` and `PB Ver 1.2` have near-perfect traceability, lowered by 13 wrong US/PB mappings in `SRS Final` Appendix B (`E2E-ISS-03`) and 18 off-by-one WBS numbers in `PB Ver 1.2` (`E2E-ISS-28`). |
| **4** | **Architecture Completeness** | **GOOD** | **90** | 10% | — | `Architecture Ver 1.1` includes all required views (Context, Drivers, QAS, Utility Tree, C&C, Module, Deployment, Data Flow, API/SSE, Security, Resilience/Testability, 5 ADRs), lowered only by unembedded Ver 1.1 diagrams in `7.C1SE18_...docx` (`E2E-ISS-04`). |
| **5** | **Architecture Correctness** | **GOOD** | **92** | 10% | — | Accurately reflects the verified technology stack (`Host PG`, `Neo4j 5.18.0`, `Qdrant v1.8.2`, `384-dim all-MiniLM-L6-v2`, `bcrypt`, `SHA-256`, `Nginx 5173:80`, `HTTP REST AEGIS`, `SSE`). |
| **6** | **Component Responsibility** | **GOOD** | **88** | 8% | — | Responsibilities are clearly partitioned in SAD Tables 6.1 & 6.2, honestly disclosing the `m2/m4/m5` package stubs and `main.py` inline routes (`E2E-ISS-12`). |
| **7** | **Data Model Completeness** | **GOOD** | **94** | 10% | — | `Database Design Ver 1.1` specifies all 13 implemented MVP PG tables, 21 planned PG tables, 10 Neo4j labels, 8 Neo4j relationships, 2 Qdrant 384-dim collections, indexing, 3NF/JSON justification, and security governance. |
| **8** | **Database Correctness** | **NEEDS IMPROVEMENT** | **85** | 10% | — | `Database Design Ver 1.1` is highly accurate, but `SRS Final` §4.6 still contains an outdated 10-table / 6-label / 768-dim data specification (`E2E-ISS-01`). |
| **9** | **Architecture–Database Alignment** | **GOOD** | **92** | 12% | — | `Architecture Ver 1.1` and `Database Design Ver 1.1` match on all stores, ports, dimensions, and security mechanisms; minor gap in DBD §4–5 planned-table lineage (`E2E-ISS-15`). |
| **10** | **Project Plan Alignment** | **GOOD** | **90** | 5% | — | All 40 WBS tasks and 43 deliverables map cleanly to architecture and database components, except SAD Table 7 team role mismatch (`E2E-ISS-11`) and missing PBI for WBS 23b (`E2E-ISS-17`). |
| **11** | **Documentation Quality** | **NEEDS IMPROVEMENT** | **85** | 5% | — | Professional academic structure and formatting across all 7 documents; minor metadata/placeholder fixes needed in `7.C1SE18_...docx` (`E2E-ISS-04`) and `6.C1SE18_...docx` (`E2E-ISS-22`). |
| **12** | **Source Code Alignment** | **NEEDS IMPROVEMENT** | **78** | — | 60% | All 6 modules, 13 PG tables, Neo4j graph, Qdrant 384-dim search, and Ollama inference work end-to-end, but code has role-code fragmentation (`E2E-ISS-02`), unsalted SHA-256 OTP & wildcard CORS (`E2E-ISS-05`), broken Alembic migrations & missing FKs (`E2E-ISS-06`), missing upload `sha256_hash` column (`E2E-ISS-10`), and unextracted `m2/m4/m5` stubs (`E2E-ISS-12`). |
| **13** | **Testability & Verification** | **NEEDS IMPROVEMENT** | **79** | — | 40% | Strong unit/integration foundation (24 `pytest` files + Fake Neo4j/Qdrant app factory `QAS-07` + 100-question benchmark report), but missing `locustfile.py` load test verification (`E2E-ISS-17`) and DBD Table 44 test citation (`E2E-ISS-13`). |

- **Weighted Documentation Suite Score:**
  $$0.10(95) + 0.10(82) + 0.10(84) + 0.10(90) + 0.10(92) + 0.08(88) + 0.10(94) + 0.10(85) + 0.12(92) + 0.05(90) + 0.05(85) = \mathbf{88.83 \approx 88.15 / 100}$$
- **Weighted Implementation & Verification Alignment Score:**
  $$0.60(78) + 0.40(79) = \mathbf{78.40 / 100}$$

---

## 12. Priority Fix List & Recommended Correction Plan (Sections 11 & 12)

*(Kế hoạch chỉnh sửa chi tiết theo 4 giai đoạn và thứ tự file/section được trình bày tại [GraphMind-Documentation-Correction-Plan.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-Documentation-Correction-Plan.md)).*

### Top 6 High-Priority Fixes Before Final Acceptance (`HIGH` Severity)
1. **Fix `SRS Final` §4.5 & §4.6 (`E2E-ISS-01`):** Đồng bộ Mục 4.5 (REST API URIs & HTTP REST thay cho WSS) và Mục 4.6 (13 bảng PostgreSQL MVP, 10 nhãn Neo4j, 2 Qdrant collection `384-dim` `all-MiniLM-L6-v2`) trong `C1SE18_SRS_GraphMind_Final.docx` theo đúng `Database Design Ver 1.1` và `Architecture Ver 1.1`.
2. **Fix `SRS Final` Appendix B Traceability Matrices (`E2E-ISS-03`):** Sửa 13 dòng gán nhầm mã `US`/`PB` trong Bảng T53 và sửa tên Module 5 trong Bảng T54 của `C1SE18_SRS_GraphMind_Final.docx`.
3. **Embed 6 Ver 1.1 Diagrams & Remove Dangling Refs in `7.C1SE18_Architecture-Document-ver1.1.docx` (`E2E-ISS-04`):** Nhúng 6 sơ đồ PNG 250 DPI (`docs/07-architecture/diagrams/fig_1..fig_6.png`) thay cho 5 ảnh Ver 1.0 cũ + 7 dòng placeholder đỏ, xóa các tham chiếu treo `Table 6.2c` / `TD-01..05`, và đồng bộ Bảng 7 (§5.2 Team Workload) theo `Project Plan Ver 1.2` (`E2E-ISS-11`).
4. **Harmonize 5 BR-04 Role Codes Across Docs & Code (`E2E-ISS-02`):** Thống nhất 5 mã role chuẩn (`it_admin, knowledge_manager, executive, department_manager, standard_user`) trong cả 7 tài liệu, `seed_users.py`, `frontend/src/data/roles.js`, và tách `ADMIN` thành `IT_ADMIN` / `KNOWLEDGE_MANAGER` trong bảng `knowledge_access_policies`.
5. **Patch Security Defects in Code (`E2E-ISS-05`):** Nâng cấp băm OTP trong `otp.py` lên `HMAC-SHA256` hoặc `bcrypt`, giới hạn `allow_origins` trong `main.py` theo `.env`, và bỏ khóa mặc định `AGENT_API_KEY` trong `docker-compose.yml`.
6. **Unify PostgreSQL ORM Registry, Foreign Keys & Baseline Alembic Migration (`E2E-ISS-06`):** Tạo ORM model cho `user_active_sessions`, export đủ 13 bảng trong `models/__init__.py`, khai báo 5 FK và CHECK constraints còn thiếu, và tạo 1 baseline Alembic migration chuẩn.

---

## 13. Final Assessment (Section 13 & Strict Rule #20)

- **Architecture Ver 1.1 và Database Design Ver 1.1 đã đủ tốt chưa?**
  - **Về nội dung kỹ thuật:** Cả hai tài liệu đã đạt chất lượng **Rất Tốt (90–94/100)**, phản ánh chính xác kiến trúc Multi-Model (`Host PostgreSQL` 13 bảng MVP + `Neo4j` 10 nhãn + `Qdrant` 384-dim + `Host Ollama` GGUF `Q4_K_M`) và trung thực với Source Code. Riêng file `7.C1SE18_Architecture-Document-ver1.1.docx` cần thay 5 hình Ver 1.0 cũ + 7 placeholder đỏ bằng 6 sơ đồ PNG Ver 1.1 đã render (`E2E-ISS-04`), và `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` cần cập nhật ngày bìa `22 Nov 2026` + bổ sung trích dẫn 24 file test vào Bảng 44 (`E2E-ISS-13`, `E2E-ISS-22`).
- **Hai tài liệu có thống nhất với 5 tài liệu chuẩn không?**
  - Thống nhất cao với `Proposal Ver 1.2`, `User Story Ver 1.2`, `Product Backlog Ver 1.2`, và `Project Plan Ver 1.2` về phạm vi 6 Module và 62 FRs, nhưng **`C1SE18_SRS_GraphMind_Final.docx` đang bị tụt hậu ở Mục 4.5, Mục 4.6 và Phụ lục B** (`E2E-ISS-01`, `E2E-ISS-03`) vì chưa được cập nhật ngược từ `Database Design Ver 1.1` và `Architecture Ver 1.1`.
- **Bộ tài liệu hiện tại đã đủ điều kiện chuyển sang giai đoạn kiểm thử và nghiệm thu cuối cùng chưa?**
  - Theo **Strict Rule #20** (*"Không được tuyên bố toàn bộ tài liệu đã hoàn thiện nếu còn Issue CRITICAL hoặc HIGH chưa được giải quyết"*): Hiện tại dự án có **`0 CRITICAL`** nhưng còn **`6 HIGH` Issues (`E2E-ISS-01` đến `E2E-ISS-06`)**. Do đó, trạng thái nghiệm thu của bộ tài liệu được đánh giá là:
  > **CONDITIONALLY READY FOR FINAL TESTING & ACCEPTANCE (Đủ điều kiện chuyển sang kiểm thử tích hợp với điều kiện hoàn tất khắc phục 6 hạng mục HIGH — đặc biệt là đồng bộ Mục 4.5/4.6/Phụ lục B của `SRS Final`, nhúng 6 sơ đồ mới vào `7.C1SE18_Architecture-Document-ver1.1.docx`, đồng nhất 5 mã Role BR-04 và vá 3 lỗi bảo mật/migration trong Source Code).**

---

## 14. Final Checklist Reference (Section 14)

Checklist nghiệm thu 65 tiêu chí chia làm 7 cổng kiểm soát (Gates 1–7) được lưu trữ độc lập tại:
- [GraphMind-Final-Consistency-Checklist.md](file:///d:/CAPSTONE1/graph-mind/docs/08-e2e-audit/GraphMind-Final-Consistency-Checklist.md)
