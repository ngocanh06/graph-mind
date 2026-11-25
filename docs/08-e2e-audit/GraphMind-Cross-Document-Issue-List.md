# GraphMind — Cross-Document Issue List (End-to-End Documentation & Source Code Audit)

- **Audit Date:** 23 November 2026
- **Auditor Role:** Senior Software Architect, Senior Business Analyst, Requirements Engineering Specialist, Database Architect & Technical Documentation Auditor
- **Audited Baseline (7 Documents + Full Source Code):**
  1. **Architecture Document Ver 1.1:** [7.C1SE18_Architecture-Document-ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx)
  2. **Database Design Document Ver 1.1:** [6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx](file:///d:/CAPSTONE1/graph-mind/docs/06-database-design/6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx)
  3. **SRS Document Final (Ver 1.2):** [C1SE18_SRS_GraphMind_Final.docx](file:///d:/CAPSTONE1/graph-mind/docs/05-srs/C1SE18_SRS_GraphMind_Final.docx)
  4. **Product Backlog Ver 1.2:** [C1SE18_ProductBacklog_GraphMind_Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/04-product-backlog/C1SE18_ProductBacklog_GraphMind_Ver1.2.docx)
  5. **Project Plan Ver 1.2:** [C1SE18_ProjectPlan_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/03-project-plan/C1SE18_ProjectPlan_GraphMind-Ver1.2.docx)
  6. **User Story Document Ver 1.2:** [C1SE18_UserStory_GraphMind-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/02-user-story/C1SE18_UserStory_GraphMind-Ver1.2.docx)
  7. **Proposal Document Ver 1.2:** [C1SE18-Proposal-Document-Ver1.2.docx](file:///d:/CAPSTONE1/graph-mind/docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx)
  8. **Source Code Repository:** `backend/`, `frontend/`, `aegis_file_watcher/`, `docker-compose.yml`

---

## 1. Issue Summary by Severity & Category

| Severity | Count | Issue IDs |
|---|---:|---|
| **CRITICAL** | **0** | *(None — Architecture Ver 1.1 & Database Design Ver 1.1 resolved all Ver 1.0 critical blockers such as missing Host PostgreSQL, missing 6 MVP tables, and missing FR53–FR62)* |
| **HIGH** | **6** | `E2E-ISS-01`, `E2E-ISS-02`, `E2E-ISS-03`, `E2E-ISS-04`, `E2E-ISS-05`, `E2E-ISS-06` |
| **MEDIUM** | **14** | `E2E-ISS-07` through `E2E-ISS-20` |
| **LOW** | **8** | `E2E-ISS-21` through `E2E-ISS-28` |
| **TOTAL** | **28** | **28 Cross-Document & Implementation Alignment Findings** |

| Phase 8 Category | Issue IDs | Count |
|---|---|---:|
| **A. Requirement Inconsistency** | `E2E-ISS-03`, `E2E-ISS-07`, `E2E-ISS-08`, `E2E-ISS-09`, `E2E-ISS-10` | 5 |
| **B. Architecture Defects** | `E2E-ISS-04`, `E2E-ISS-11`, `E2E-ISS-12` | 3 |
| **C. Database Defects** | `E2E-ISS-13`, `E2E-ISS-14`, `E2E-ISS-21` | 3 |
| **D. Architecture–Database Mismatch** | `E2E-ISS-15`, `E2E-ISS-16` | 2 |
| **E. Source Code Mismatch** | `E2E-ISS-01`, `E2E-ISS-02`, `E2E-ISS-05`, `E2E-ISS-06`, `E2E-ISS-17`, `E2E-ISS-18`, `E2E-ISS-19`, `E2E-ISS-20` | 8 |
| **F. Version & Naming Inconsistency** | `E2E-ISS-22`, `E2E-ISS-23`, `E2E-ISS-24`, `E2E-ISS-25`, `E2E-ISS-26`, `E2E-ISS-27`, `E2E-ISS-28` | 7 |

---

## 2. Detailed Issue Specification

### HIGH SEVERITY ISSUES (6 Issues)

#### `E2E-ISS-01` — SRS §4.6 Data Requirements & §4.5 API Summary Contradict Database Design Ver 1.1, Architecture Ver 1.1, and Source Code
- **Severity:** **HIGH**
- **Category:** Group E (Source Code Mismatch) & Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `C1SE18_SRS_GraphMind_Final.docx`)
- **Affected Documents:**
  - `C1SE18_SRS_GraphMind_Final.docx` (§4.5 Table T20, §4.6 Table T21 & P254–P256, §5.1 NFR-06)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Tables 8–20, §3.2, §3.3)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.1.2 FD-02, §4.1 Table 6.1, §4.5 Table 6.4)
- **Description:**
  While `Architecture Ver 1.1` and `Database Design Ver 1.1` were updated to match the actual multi-model database schema and REST endpoints, `C1SE18_SRS_GraphMind_Final.docx` (§4.5 and §4.6) still specifies an incompatible schema and URI contract:
  1. **PostgreSQL Schema Mismatch:** SRS §4.6 Table T21 lists only 10 tables (`users, departments, rbac_permissions_matrix, user_active_sessions, password_reset_tokens, documents, document_approvals, shift_reports, shift_daily_summaries, audit_logs`). In contrast, `Database Design Ver 1.1` (§3.1.2) and Source Code implement **13 operational MVP tables** (`users, password_reset_otps, user_active_sessions, knowledge_access_policies, knowledge_permissions, audit_logs, knowledge_upload_approvals, pb56_workstations, pb56_workstation_sync_logs, pb56_sync_mode_audit_logs, sop_documents, copilot_sessions, shift_reports`), while `departments` and `shift_daily_summaries` are `[PLANNED]` (unimplemented). SRS §4.6 completely omits 5 implemented tables (`pb56_workstations*`, `sop_documents`, `copilot_sessions`).
  2. **Neo4j Ontology Mismatch:** SRS §4.6 (P254) specifies 6 labels (`:Department, :Employee, :Document, :Entity, :SOP, :RiskEvent`) and 6 edges (`:BELONGS_TO, :AUTHORED, :MENTIONS, :GOVERNED_BY, :IMPACTS, :RELATED_TO`), whereas `Database Design Ver 1.1` (§3.2), `Architecture Ver 1.1`, and `semantic_layer.py` implement 10 labels (`Customer, SalesOrder, Product, SubCategory, Category, Employee, Document, Clause, Company, Department`) and 8 relationships (`PLACED_ORDER, PURCHASED, CONTAINS_PRODUCT, BELONGS_TO, PART_OF, CONTAINS_CLAUSE, PARTY_TO, BELONGS_TO_DEPT`).
  3. **Qdrant Collection & Embedding Dimension Mismatch:** SRS §4.6 (P255) & NFR-06 state collection `graphmind_chunks` with **768-dim** embeddings, whereas `Database Design Ver 1.1` (§3.3), `Architecture Ver 1.1` (§3.1.2 FD-02), and `backend/app/db/qdrant/client.py:36,134` implement `cuad_contracts` and `adventureworks_entities` with **384-dim** `SentenceTransformer("all-MiniLM-L6-v2")` vectors.
  4. **REST API URI & Protocol Mismatch:** SRS §4.5 Table T20 lists `/api/v1/documents/upload`, `/api/v1/documents/pending-approvals`, `/api/v1/shifts/reports`, and `WSS wss://.../agent/control`, whereas `Architecture Ver 1.1` (§4.5) and Source Code expose `/api/documents/submit-upload`, `/api/admin/upload-approvals`, `/api/v1/dashboard/shift-reports`, and HTTP REST `/api/v1/workstations/{id}/heartbeat` & `/sync-mode`.
- **Evidence:**
  - `C1SE18_SRS_GraphMind_Final.docx` lines 557–603 (Tables T20 & T21).
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 88–95 (Table 1 Assumption A4 explicitly flags SRS 768-dim mismatch), lines 242–488 (Tables 8–20), lines 1072–1088 (Table 47), lines 1332–1340 (Table 63).
  - `backend/app/db/qdrant/client.py:36,134`; `backend/app/modules/m6_admin_security/document_approval_router.py:32`; `backend/app/api/v1/shift_reports.py:18`; `backend/app/api/v1/pb56_workstations.py:16`.
- **Impact:** QA testers writing API or database tests from SRS §4.5–4.6 will test non-existent table names (`rbac_permissions_matrix`, `password_reset_tokens`, `documents`), wrong vector dimensions (`768` vs `384`), and wrong endpoints (`404 Not Found`).
- **Recommendation:** Update SRS §4.5 and §4.6 to match the verified 13 implemented PostgreSQL tables, 10 Neo4j labels / 8 relationships, 2 Qdrant 384-dim collections, and actual FastAPI REST routes documented in `Database Design Ver 1.1` and `Architecture Ver 1.1`.

---

#### `E2E-ISS-02` — Multi-Layer Role Code & Role Count Fragmentation (4 vs 5 System Roles; Unsplit `ADMIN` in RBAC Matrix)
- **Severity:** **HIGH**
- **Category:** Group A (Requirement Inconsistency) & Group E (Source Code Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§4.2 P84, §6.1a Table T7 — lists 4 roles, omits `Department Manager`)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§1.2 P75, §2.2 P99, §2.3 Table T8 — states "exactly four system roles", treats `Department Manager` as an operational persona in P107)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (§1 P40–P46 — states 4 Web Dashboard roles + `Department Manager` persona)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§1.2 P70, §4 Table T6 — lists 5 application roles)
  - `C1SE18_SRS_GraphMind_Final.docx` (§2.1 P169, §2.4 Table T7 — 5 system roles with codes `it_admin, knowledge_manager, executive, manager, standard`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§1.2 Table 2.2, §3.2 Table 4 — 5 roles with codes `it_admin, knowledge_manager, executive, department_manager, standard_user`)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 11, §3.1.3 Table 21 — 5 roles in `users.role` vs 4 roles in `knowledge_access_policies.role_code`)
  - Source Code: `backend/app/core/rbac.py`, `backend/app/modules/m6_admin_security/rbac_matrix_service.py`, `backend/app/db/postgres/seed_users.py`, `frontend/src/data/roles.js`
- **Description:**
  1. **4 Roles vs 5 Roles across Documents:** Proposal Ver 1.2 (§6.1a) and Project Plan Ver 1.2 (§2.3) formally declare 4 system roles (treating `Department Manager` as a sub-persona), whereas SRS Final, Product Backlog Ver 1.2, Architecture Ver 1.1, and Database Design Ver 1.1 define **5 distinct system roles** per `BR-04`.
  2. **Role Code String Mismatch across Documents & Code:**
     - SRS Final Table T7 uses: `it_admin`, `knowledge_manager`, `executive`, `manager`, `standard`.
     - Architecture Ver 1.1 & Database Design Ver 1.1 use: `it_admin`, `knowledge_manager`, `executive`, `department_manager`, `standard_user`.
     - Frontend `frontend/src/data/roles.js` uses: `it_admin`, `knowledge_mgr`, `executive`, `manager`, `standard`.
     - Backend `seed_users.py` mixes: `admin`, `it_admin`, `knowledge_manager`, `executive`, `department_manager`, `standard_user`, `standard`.
     - Backend 2D RBAC Matrix (`rbac_matrix_service.py` / `knowledge_access_policies.role_code`) uses only **4 uppercase codes**: `ADMIN`, `EXECUTIVE`, `DEPARTMENT_MANAGER`, `STANDARD_USER` — failing to separate `IT_ADMIN` and `KNOWLEDGE_MANAGER` in the database permission matrix required by `BR-04` and `FR58`!
- **Evidence:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` lines 196–205 (Table T7).
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` lines 179–203 (Table T8 & P107).
  - `C1SE18_SRS_GraphMind_Final.docx` lines 274–283 (Table T7).
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 301, 491–501 (Table 11 R2 & Table 21).
  - `backend/app/modules/m6_admin_security/rbac_matrix_service.py`; `backend/app/db/postgres/seed_users.py`; `frontend/src/data/roles.js`.
- **Impact:** Violates `BR-04` (Strict Role Separation between `it_admin` and `knowledge_manager`) at the database policy matrix layer (`knowledge_access_policies`) and causes role-lookup mismatches unless translation shims map `manager ↔ department_manager`, `standard ↔ standard_user`, `knowledge_mgr ↔ knowledge_manager`.
- **Recommendation:** Standardize on the **5 canonical BR-04 role codes** (`it_admin`, `knowledge_manager`, `executive`, `department_manager`, `standard_user`) across all 7 documents, `seed_users.py`, `roles.js`, and split `ADMIN` in `knowledge_access_policies.role_code` into `IT_ADMIN` and `KNOWLEDGE_MANAGER`.

---

#### `E2E-ISS-03` — Contradiction in SRS Appendix B Traceability Matrices (13 Wrong US/PB Mappings in Table T53 & Swapped Module 5 in Table T54)
- **Severity:** **HIGH**
- **Category:** Group A (Requirement Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `C1SE18_SRS_GraphMind_Final.docx` Appendix B & B.2)
- **Affected Documents:**
  - `C1SE18_SRS_GraphMind_Final.docx` (Appendix B Table T53 lines 1381–1439; Appendix B.2 Table T54 lines 1444–1454)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (§1.6 Table T9 lines 184–255)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§5 Table T7 lines 179–260)
- **Description:**
  SRS Final Appendix B Note (`P491`) explicitly admits: *"US, PB and WBS identifiers are copied from that file and were not re-verified against the other documents."* Cross-checking against `User Story Ver 1.2` and `Product Backlog Ver 1.2` reveals **13 broken requirement linkages in Table T53** and a **Module definition swap in Table T54**:
  1. **Row 12 (Qdrant Embedding `FR22`):** Mapped to `US27` (Neo4j Graph Construction) instead of `US26`.
  2. **Row 13 (Document Browsing `FR23`, `PB50`):** Mapped to `US42` (Graph Editor Integration) instead of `US40`.
  3. **Row 16 (Graph Editor & Copilot Integration `FR25`, `PB54`):** Mapped to `US30` (Admin Analytics Dashboard) instead of `US42`.
  4. **Row 20 (Single-hop Reasoning `FR28`, `PB22`):** Incorrectly includes `US18` (Admin DB CRUD) and `PB31` (Answer Reliability Indicators).
  5. **Row 22 (Cross-source Multi-hop `FR30`, `PB26`):** Incorrectly includes `US23` (Standard User Risk Alerts) and `US26` (Qdrant Embeddings).
  6. **Row 23 (Hybrid Query Engine `FR31`):** Incorrectly includes `US31` (Account Registration) and `US32` (Executive Home & Dashboard).
  7. **Row 24 (Source Citation Viewer `FR32`):** Mapped to `PB28, PB32` (`PB32` is 100-question Benchmark!) instead of `PB29` (and omits `US21`).
  8. **Row 25 (Interactive Knowledge Graph Viewer `FR33`, `PB15`):** Incorrectly maps to `US40` (Document Explorer) instead of `US22` (Standard User KG Viewer).
  9. **Row 26 (Web Dashboard SPA `FR34`, `PB30`):** Incorrectly includes `US43` (Database Architecture).
  10. **Row 30 (Home & Dashboard `FR40`):** Mapped to `US10` (Sensitive Contract Data Protection) and `PB40` (Standard User Risk Alerts) instead of `US32, US39` and `PB44`!
  11. **Row 37 (509 ChatML Q&A Dataset `FR37`, `PB16`):** Stuffing `US11, US14, US15, US16` into `FR37` (`US11` = Reliability Indicators `FR38`, `US14` = Neo4j/Qdrant Monitoring `FR10`, `US15` = Checkpoints `FR36`, `US16` = Baseline Report `FR52`).
  12. **Row 47 (Storage on PostgreSQL `FR8`, `PB45`):** Mapped to `US39` (Standard User Home & Dashboard) instead of `US43`.
  13. **Row 48 (Admin Analytics Dashboard `FR9`, `PB42`) & Row 49 (`FR10, FR11`, `PB13, PB14`):** Row 48 mapped to `US44` (LLMOps Dashboard) instead of `US30`; Row 49 mapped to `US22` (Standard User KG Viewer) instead of `US14, US18`.
  14. **Appendix B.2 Table T54 Row 5:** Renames Module 5 to `"Module 5: Model Adaptation & Evaluation"` instead of the locked `"Module 5: Enterprise Multi-facet Search"` used in SRS Table T6, Proposal §6.1, User Story §1, Product Backlog §1.2, and Project Plan §1.2, and misplaces `PB43` (Registration) into Module 5 and `PB39` (Peer Reflection) into Module 6!
- **Evidence:**
  - `C1SE18_SRS_GraphMind_Final.docx` lines 1379–1454 (Tables T53 & T54).
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` lines 184–255 (Table T9).
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` lines 179–260 (Table T7).
- **Impact:** Breaks formal bidirectional traceability (`Proposal ↔ US ↔ PB ↔ SRS`) during Capstone defense verification.
- **Recommendation:** Replace SRS Appendix B Table T53 & Table T54 mappings with the verified 7-way mappings in `GraphMind-End-to-End-Traceability-Matrix.md`.

---

#### `E2E-ISS-04` — `7.C1SE18_Architecture-Document-ver1.1.docx` Retains 5 Outdated Ver 1.0 Diagrams + 7 Text Placeholders & Dangling References (`Table 6.2c`, `TD-01..TD-05`)
- **Severity:** **HIGH**
- **Category:** Group B (Architecture Defects)
- **Classification:** `DOCUMENTATION DEFECT` (in `docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx`)
- **Affected Documents:**
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.2 P116–P119, §3.3 Table 5.3 R5, §4.1 P141–P144, §4.2 P151–P156 & Table 6.2 R9, §4.3 P161–P164 & Table 6.3 R2, §4.4 P170–P174 & P196, §4.5 P199, §4.6 P205 & Table 6.5 R9, §6 Table 8 R1)
- **Description:**
  1. **Unreplaced Outdated Diagrams & Red Placeholders:** In `docs/07-architecture/7.C1SE18_Architecture-Document-ver1.1.docx`, Figures 1, 2, 3, 4, and 5 still display the **outdated Ver 1.0 images** (which omit Host PostgreSQL, show 4 legacy actors instead of 5 BR-04 roles, show `nomic-embed-text` / Direct Python calls, and show empty modules `m2/m4/m5` as active), accompanied by text notes (`Note: the figure above is the Ver 1.0 diagram and is outdated...`) and 7 unrendered `[DIAGRAM PLACEHOLDER: ...]` blocks (for Figures 1–5 and new Figures 6–7). *(Note: The sibling file `C1SE18_Architecture-Document-ver1.1.docx` has the 6 newly rendered 250 DPI PNG diagrams embedded, whereas `7.C1SE18_Architecture-Document-ver1.1.docx` does not.)*
  2. **Dangling Internal Cross-References:** The text of `7.C1SE18_Architecture-Document-ver1.1.docx` cites `Table 6.2c` twice (`P131 Table 5.3 R5` and `P156`) and cites `TD-01`, `TD-03`, `TD-04`, `TD-05` five times (`Table 6.2 R9`, `Table 6.3 R2`, `P199`, `Table 6.5 R9`, `Table 8 R1`), but neither `Table 6.2c` nor a Technical Debt catalog table (`TD-01..TD-05`) exists in the document.
- **Evidence:**
  - `7.C1SE18_Architecture-Document-ver1.1.docx` lines 176–179, 233, 245–248, 265–269, 282, 286–289, 296, 306–309, 330, 332, 362, 366, 421.
- **Impact:** A reviewer opening `7.C1SE18_Architecture-Document-ver1.1.docx` sees contradictory Ver 1.0 diagrams directly above Ver 1.1 text, red diagram placeholders, and broken references to `Table 6.2c` and `TD-01..TD-05`.
- **Recommendation:** Embed the 6 rendered Ver 1.1 PNG diagrams (`docs/07-architecture/diagrams/fig_1..fig_6.png`) directly into `7.C1SE18_Architecture-Document-ver1.1.docx` (or replace `7.C1SE18_Architecture-Document-ver1.1.docx` with the diagram-complete `C1SE18_Architecture-Document-ver1.1.docx`) and remove/resolve the dangling `Table 6.2c` and `TD-01..TD-05` references.

---

#### `E2E-ISS-05` — Unsalted SHA-256 OTP Hashing (`password_reset_otps`), Wildcard CORS with Credentials, and Hardcoded Default Agent API Key in Source Code
- **Severity:** **HIGH**
- **Category:** Group E (Source Code Mismatch / Security Implementation Defect)
- **Classification:** `IMPLEMENTATION GAP` (properly flagged as defects in `Architecture Ver 1.1` §4.6 Table 6.5 & `Database Design Ver 1.1` §5.8, but still unpatched in Source Code)
- **Affected Documents & Code:**
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR60`, `NFR-02`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§4.6 Table 6.5 R5, R9, R10)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 9 R3, §5.8 P403)
  - Source Code: `backend/app/db/postgres/models/otp.py:26,35–36`; `backend/app/main.py:232–239`; `docker-compose.yml` (`AGENT_API_KEY`)
- **Description:**
  1. **Weak OTP Hash (`password_reset_otps.otp_hash`):** `otp.py` hashes 6-digit numeric OTPs using unsalted `hashlib.sha256(otp.encode()).hexdigest()`. Since the keyspace is only $10^6$ (`000000`–`999999`), any read exposure of `password_reset_otps` allows instant rainbow-table reversal in `< 0.1 s`.
  2. **Wildcard CORS with Credentials:** `backend/app/main.py:232–239` configures `CORSMiddleware` with `allow_origins=["*"]` alongside `allow_credentials=True`.
  3. **Hardcoded Default Agent Key:** `docker-compose.yml` defines a fallback plaintext development key (`AGENT_API_KEY=${AGENT_API_KEY:-ekai-secret-agent-key-2026}`).
- **Evidence:**
  - `backend/app/db/postgres/models/otp.py:26,35–36`
  - `backend/app/main.py:232–239`
  - `docker-compose.yml`
- **Impact:** Security vulnerabilities in authentication recovery, cross-origin browser requests, and workstation daemon authentication.
- **Recommendation:** (1) Replace unsalted SHA-256 in `otp.py` with `hmac.new(SECRET_KEY, f"{email}:{otp}".encode(), hashlib.sha256).hexdigest()` or `bcrypt`; (2) restrict `allow_origins` in `main.py` to configured frontend origins from `.env`; (3) require `AGENT_API_KEY` from `.env` without a weak default fallback.

---

#### `E2E-ISS-06` — Broken Alembic Migration Chain, Runtime `CREATE TABLE IF NOT EXISTS` in 5 Service Files, and Missing Physical Foreign Keys / CHECK Constraints in PostgreSQL Code
- **Severity:** **HIGH**
- **Category:** Group C (Database Defects) & Group E (Source Code Mismatch)
- **Classification:** `IMPLEMENTATION GAP` (accurately documented as `[P]` / `FK[P]` in `Database Design Ver 1.1` §3.1.2 & §5.8, but unfixed in Source Code)
- **Affected Documents & Code:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Tables 8–20, §5.8 P406–P408, §6.1 Table 77)
  - Source Code: `backend/alembic/versions/0186c646946f_initial_users_table.py`, `backend/alembic/versions/a93ce8369026_migrate_to_ekai_postgres_schema.py`, `backend/app/db/postgres/models/__init__.py`, `backend/app/db/postgres/database.py:76`, `backend/app/modules/m6_admin_security/session_service.py`
- **Description:**
  1. **Broken Alembic Migrations:** Migration `0186c646946f` creates `users` with `id` and `hashed_password` (contradicting ORM `user.py` which uses `user_id` and `password_hash`), and migration `a93ce8369026` is a no-op `pass` stub. Running `alembic upgrade head` does not produce the 13 implemented MVP tables.
  2. **Ad-hoc Runtime DDL & Incomplete Model Registry:** `models/__init__.py` only exports 6 of the 12 ORM models, and 5 service/router files execute raw `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` statements at request/startup time (including `session_service.py` which has no SQLAlchemy ORM class for `user_active_sessions`).
  3. **Missing Physical FKs & CHECK Constraints in Code:** 5 reference columns (`user_active_sessions.user_id`, `knowledge_upload_approvals.uploaded_by_id`, `knowledge_access_policies.updated_by`, `audit_logs.actor_id`, `users.department_id`) lack `ForeignKey(...)` constraints in code, and 0 `CheckConstraint` declarations exist on status/role enum columns.
- **Evidence:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 254–258, 287, 310, 332, 354, 1634–1636, 1647–1660.
  - `backend/alembic/versions/0186c646946f_initial_users_table.py`; `backend/alembic/versions/a93ce8369026_migrate_to_ekai_postgres_schema.py`; `backend/app/db/postgres/models/__init__.py`.
- **Impact:** Referential integrity on 4 user-referencing tables and 1 department column is not enforced by PostgreSQL, and schema deployments cannot rely on Alembic migrations.
- **Recommendation:** Export all 13 models in `models/__init__.py` (adding a `UserActiveSession` ORM model), declare the missing `ForeignKey` and `CheckConstraint` rules, and generate a clean baseline Alembic migration.

---

### MEDIUM SEVERITY ISSUES (14 Issues)

#### `E2E-ISS-07` — Hybrid Cloud vs 100% On-Premise Single-Host Deployment Contradiction Across the 7 Documents
- **Severity:** **MEDIUM**
- **Category:** Group A (Requirement Inconsistency) & Group B (Architecture Defects)
- **Classification:** `DOCUMENTATION DEFECT` (cross-document architectural framing divergence)
- **Affected Documents:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§1.3, §4.2 P89, §5 T6 R7, §6.6 P151 — states *"AEGIS Local Agent installed locally... sending changes over a secure connection to the Backend Cloud (FastAPI), which is located on the cloud infrastructure"*)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US08`, `US10`, `US17`, `US59` — *"Backend Cloud"*)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB03`, `PB04`, `PB05`, `PB62` — *"Backend Cloud"*)
  - `C1SE18_SRS_GraphMind_Final.docx` (§1.3 T5 R13, §2.1 P179, `FR7`, `FR13`, `UC.08`, `NFR-04` — *"Hybrid Deployment: AEGIS Local Agent + Backend Cloud"*)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.2 P122, §3.4 `CON-01`, §4.3 Table 6.3, §5.2 P235–P236 — states *"100% on-premise single-host Docker Compose... No component is hosted on a public cloud platform"*)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§2.2 Table 4 — *"100% local host + Docker"*)
- **Evidence:** Compare `Proposal Ver 1.2` P151 & `SRS Final` P179 against `Architecture Ver 1.1` P135 (`CON-01`) & P235–P236 and `docker-compose.yml`.
- **Impact:** Confuses reviewers on whether the backend runs in the Cloud (Hybrid Edge-to-Cloud) or 100% On-Premise on a single workstation.
- **Recommendation:** Clarify consistently across Proposal/SRS/Architecture that **the logical architecture supports Hybrid Edge-to-Central-Server synchronization (where AEGIS runs on edge workstations and FastAPI runs on a central private cloud/on-premise server), while the Capstone MVP demonstration deploys all containers and host services on a single on-premise host via Docker Compose**.

---

#### `E2E-ISS-08` — Document Upload Approval Authority Conflict (`Knowledge Administrator` Only vs Both `Knowledge Admin` & `IT Admin`)
- **Severity:** **MEDIUM**
- **Category:** Group A (Requirement Inconsistency)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents & Code:**
  - `C1SE18_SRS_GraphMind_Final.docx` (§2.4 Table T8 R5, `FR54` Table T11 R2 & R9 E1, `UC.23`, `BR-04` — states **only `Knowledge Administrator`** may approve/reject uploaded documents; `IT Administrator = None`, and non-`knowledge_manager` callers receive `403 Forbidden`)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 14 R14, §3.1.3 Table 21 R1–R2 — assigns approval exclusively to `Knowledge Administrator`)
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§6.1a Table T7 R1 & R2 — lists *"approve document uploads"* under **both** `System & IT Administrator` and `Knowledge Administrator`)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US61` — Actor: *"Knowledge Administrator / System & IT Administrator"*)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§4 Table T6 R1 & R2, `PB68` — *"Knowledge Administrator / System & IT Administrator"*)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§2.3 Table T8 R1 & R2 — both roles approve document uploads)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§1.2 Table 2.2 R1–R2 says only Knowledge Admin, but §4.4 P193 says *"A Knowledge Administrator (or System & IT Administrator) previews and approves it"*)
  - Source Code: `backend/app/modules/m6_admin_security/document_approval_router.py` (`_require_admin` allows `admin`, `it_admin`, `knowledge_manager`, `executive`)
- **Evidence:** Compare `SRS Final` Table T8 R5 (`IT Administrator: None | Knowledge Administrator: CRUD`) and `FR54` E1 (`User is not a Knowledge Administrator: 403 Forbidden`) against `US61`, `PB68`, `Proposal` Table T7 R1, and `document_approval_router.py`.
- **Impact:** Direct contradiction on whether `it_admin` (and `executive` in code) is permitted to approve knowledge uploads under `BR-04`.
- **Recommendation:** Enforce strict `BR-04` separation of duties: restrict document upload approval (`FR54` / `US61` / `PB68`) to **`Knowledge Administrator` (`knowledge_manager`)** (or allow `it_admin` only for IT-department documents if desired, and update `BR-04` and `_require_admin()` accordingly — marked `NEEDS CONFIRMATION`).

---

#### `E2E-ISS-09` — Shift Report Status Lifecycle (`REVIEWED` vs `APPROVED / REJECTED`) and Daily Summary Persistence (`shift_daily_summaries`) Mismatch
- **Severity:** **MEDIUM**
- **Category:** Group A (Requirement Inconsistency) & Group D (Architecture–Database Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents & Code:**
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US63` AC2, `US64` AC1 — uses status `REVIEWED` and allows consolidation of `SUBMITTED or REVIEWED` reports)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB70` AC2, `PB71` AC1 — uses `REVIEWED` and `SUBMITTED or REVIEWED`)
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR56`, `FR57`, `UC.24`, `UC.25`, §4.6 Table T21 R9, §6.7 — uses `APPROVED / REJECTED`, requires `APPROVED` reports for consolidation, and requires storing the result in PostgreSQL table `shift_daily_summaries`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.1.2 `FD-06`, §4.4 P195 — uses `APPROVED / REJECTED` and notes `shift_daily_summaries` is `[Planned]` / `NOT YET IMPLEMENTED`)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 20 `shift_reports.status` = `DRAFT, SUBMITTED, APPROVED, REJECTED`; §3.1.8 Table 42 `shift_daily_summaries` = `[PLANNED — FR57]`)
  - Source Code: `backend/app/db/postgres/models/shift_report.py`, `backend/app/api/v1/shift_reports.py` (uses `DRAFT, SUBMITTED, APPROVED, REJECTED`; computes daily summary on-the-fly without persisting to `shift_daily_summaries`)
- **Evidence:** Compare `US63/PB70` (`REVIEWED`) and `SRS FR57/UC.25` (persisted in `shift_daily_summaries`) against `Database Design Ver 1.1` Table 20 & Table 42 and `shift_reports.py`.
- **Impact:** Acceptance criteria in `US63/PB70` (`REVIEWED`) differ from the enum in SRS/Architecture/DB/Code (`APPROVED`/`REJECTED`), and SRS `FR57` post-condition (`stored in shift_daily_summaries`) is not implemented in PostgreSQL.
- **Recommendation:** Update `US63–US64` and `PB70–PB71` status enum from `REVIEWED` to `APPROVED / REJECTED`, and either implement the 8-column `shift_daily_summaries` table in PostgreSQL or update SRS `FR57`/`UC.25` to state on-demand dynamic synthesis.

---

#### `E2E-ISS-10` — Staff Document Upload Format, File Size Limit, and Queue-Stage `sha256_hash` Mismatch (`FR53` / `US60` / `PB67`)
- **Severity:** **MEDIUM**
- **Category:** Group A (Requirement Inconsistency) & Group E (Source Code Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents & Code:**
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US60` — `.pdf, .xlsx` up to `25 MB`, SHA-256 computed and duplicate rejected at upload time)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB67` — `.pdf, .xlsx` up to `25 MB`, SHA-256 duplicate check at upload)
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR53`, `UC.23` — `.pdf, .xlsx` up to `25 MB`, SHA-256 hash stored & checked at upload)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 14 `knowledge_upload_approvals`: lists `file_type` = `PDF, CSV, DOCX, XLSX, TXT` and marks `sha256_hash CHAR(64)` as `[Proposed column]` (`[P]`))
  - Source Code: `backend/app/modules/m6_admin_security/document_approval_model.py`, `document_approval_router.py` (no `sha256_hash` column exists on `knowledge_upload_approvals`; duplicate check on upload only checks pending/existing filename, while SHA-256 content hashing runs in `pipeline.py` after approval)
- **Evidence:** `document_approval_model.py` (16 columns, no `sha256_hash`); `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` line 351 (`R6: sha256_hash | CHAR(64) | NULL, INDEX [P] | [Proposed column]`).
- **Impact:** Uploading a renamed file with identical content into the approval queue is not rejected by SHA-256 at step `FR53` (`POST /api/documents/submit-upload`), violating `US60 AC2` / `FR53 E3` / `BR-06` at the staging boundary.
- **Recommendation:** Add `sha256_hash CHAR(64) INDEX` to `knowledge_upload_approvals` in `document_approval_model.py` and compute/verify SHA-256 immediately during `submit-upload`.

---

#### `E2E-ISS-11` — Team Workload & Role Assignment Conflict Between `Architecture Ver 1.1` (§5.2 Table 7) and `Project Plan Ver 1.2` (§2.1 Table T5 & RACI Table T6)
- **Severity:** **MEDIUM**
- **Category:** Group B (Architecture Defects) & Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `7.C1SE18_Architecture-Document-ver1.1.docx` §5.2 Table 7)
- **Affected Documents:**
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§5.2 Table 7 lines 404–413)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§2.1 Table T5 lines 138–145 & §2.1.1 RACI Table T6 lines 151–167)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§8 Table T9 lines 342–346)
- **Description:**
  `7.C1SE18_Architecture-Document-ver1.1.docx` §5.2 Table 7 assigns team roles and modules that contradict the authoritative `Project Plan Ver 1.2` (confirmed against Jira board `C1SE18`):
  - **Huynh Ngoc Minh:** SAD Table 7 lists only *"AI / ML Engineer (LoRA Fine-Tuning, Context Fusion)"*, whereas Project Plan & Backlog assign him **Database Architecture Design (`C1SE18-17`), Knowledge Base (`C1SE18-18..20`), Knowledge Editor & SOP (`C1SE18-50..51`), plus Fine-tuning & Hybrid Query Engine**.
  - **Ha Hoang Anh:** SAD Table 7 lists *"Database Engineer (Neo4j, Qdrant, PostgreSQL)"*, whereas Project Plan & Backlog assign him **Fullstack Engineer: Authentication Module (`C1SE18-6..11`), Single Active Session, Document Upload & Approval, Multi-facet Search, Shift Reports & Consolidation**.
  - **Tran Viet Anh Vu:** SAD Table 7 lists *"Frontend Developer (React 18 + Vite Web UI, Copilot Chat, Graph Visualizer)"*, whereas Project Plan & Backlog assign him **Backend & Infrastructure Developer: OTP API (`C1SE18-10`), Data Ingestion Pipeline (`C1SE18-29`), Settings & Dynamic RBAC Matrix (`C1SE18-26..31`), Cypher Guard, Ollama Serving, Admin/LLMOps Dashboard** (while Ngoc Anh owns Copilot Chat & Graph Visualizer Frontend `C1SE18-21..24`).
  - **Phan Anh Bao:** SAD Table 7 lists *"Security & Local Integration Engineer (JWT/OAuth RBAC Security Layer)"*, whereas Project Plan & Backlog assign him **Frontend Engineer / QA & Testing Lead: Home & Dashboard (`C1SE18-12..15`), File Watcher & AEGIS PB56 Kill Switch (`C1SE18-30, 48, 60..62`), E2E & Locust Load Testing**.
- **Evidence:** Compare `7.C1SE18_Architecture-Document-ver1.1.docx` lines 406–413 against `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` lines 138–167.
- **Impact:** Direct contradiction on who built which component when the Review Board cross-checks the SAD against the Project Plan and Jira board `C1SE18`.
- **Recommendation:** Update `Table 7: Team Workload & Task Assignment Matrix` in `7.C1SE18_Architecture-Document-ver1.1.docx` §5.2 to match `Project Plan Ver 1.2` §2.1 Table T5 and RACI Table T6.

---

#### `E2E-ISS-12` — Backend Modular Monolith Split Incomplete (`m2_knowledge_editor`, `m4_decision_support`, `m5_multifacet_search` Are 0-Line Stubs; `main.py` Holds 3,306 Lines & 37 Inline Routes)
- **Severity:** **MEDIUM**
- **Category:** Group B (Architecture Defects) & Group E (Source Code Mismatch)
- **Classification:** `IMPLEMENTATION GAP` (transparently documented in `Architecture Ver 1.1` §4.2 Table 6.2 & `ADR-01`, but remains an implementation structural debt)
- **Affected Documents & Code:**
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§4.2 Table 6.2, §6 `ADR-01`)
  - Source Code: `backend/app/main.py` (3,306 lines, 37 inline endpoints), `backend/app/modules/m2_knowledge_editor/__init__.py` (0 lines), `backend/app/modules/m4_decision_support/__init__.py` (0 lines), `backend/app/modules/m5_multifacet_search/__init__.py` (0 lines), `backend/app/api/v1/dashboard.py` (1,117 lines), `backend/app/api/v1/sop.py` (736 lines)
- **Description:**
  All 7 documents organize the system around 6 modules (`Module 1`–`Module 6`). On the frontend (`frontend/src/views/m1..m6`), all 6 modular directories are cleanly populated. On the backend (`backend/app/modules/`), only `m1_data_sync` (4,371 lines), `m3_hybrid_copilot` (5,879 lines), and `m6_admin_security` (2,468 lines) are populated; `m2`, `m4`, and `m5` are empty 0-line `__init__.py` stubs, with their routes and data access embedded directly in `main.py` and `api/v1/{dashboard.py, sop.py, shift_reports.py}`.
- **Evidence:** `backend/app/modules/m2_knowledge_editor/__init__.py`, `m4_decision_support/__init__.py`, `m5_multifacet_search/__init__.py`; `7.C1SE18_Architecture-Document-ver1.1.docx` lines 269–283.
- **Impact:** High coupling in `main.py` and direct database driver queries from controller functions without a dedicated service/module layer for `m2`, `m4`, and `m5`.
- **Recommendation:** Keep the honest `IMPLEMENTATION GAP` disclosure in `Architecture Ver 1.1` §4.2, and if schedule permits before final code freeze, extract the inline `m2`/`m5` routes from `main.py` and `m4` services from `api/v1/dashboard.py` into their respective `backend/app/modules/` packages.

---

#### `E2E-ISS-13` — `Database Design Ver 1.1` Table 44 Marks All 13 Implemented Tables as `TEST VERIFIED: NOT VERIFIED` Despite 24 Existing Pytest Test Suites
- **Severity:** **MEDIUM**
- **Category:** Group C (Database Defects) & Group E (Source Code Mismatch)
- **Classification:** `DOCUMENTATION DEFECT` (in `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` §3.1.9 Table 44)
- **Affected Documents & Code:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.9 P217 & Table 44 lines 988–1006)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.3 Table 5.3, §4.6 Table 6.5, §4.7 P210 — acknowledges ~20 pytest files including `test_concurrent_login.py`, `test_department_scope.py`, `test_safety_guard.py`, `test_pb56_workstations.py`)
  - Source Code: `backend/app/tests/` (24 test files)
- **Description:**
  `Database Design Ver 1.1` §3.1.9 P217 states: *"no automated test evidence was supplied, so TEST VERIFIED is NOT VERIFIED for every table."* However, `Architecture Ver 1.1` (§3.3, §4.6, §4.7) and the repository `backend/app/tests/` contain **24 automated pytest files** that directly test the database models and flows (`test_user_admin_api.py` → `users`, `test_concurrent_login.py` → `user_active_sessions`, `test_department_scope.py` → `knowledge_access_policies`, `test_document_approval.py` & `test_e2e_document_approval.py` → `knowledge_upload_approvals`, `test_pb56_workstations.py` → `pb56_workstations*`, `test_sop_api.py` → `sop_documents`, `test_copilot_postgres.py` & `test_copilot_pin_session.py` → `copilot_sessions`, `test_department_report.py` → `shift_reports`).
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 988–1006 vs `backend/app/tests/` directory listing (24 `test_*.py` files).
- **Impact:** Under-reports existing automated test coverage and creates an inconsistency between `Database Design Ver 1.1` (claims 0 tests) and `Architecture Ver 1.1` (cites the pytest suite).
- **Recommendation:** Update `Database Design Ver 1.1` §3.1.9 Table 44 to cite the specific pytest files in `backend/app/tests/` (`TEST EXISTS`) while noting whether live-PostgreSQL execution vs fake/SQLite test harness execution is verified.

---

#### `E2E-ISS-14` — Neo4j Case-Duplicate Properties, String-Typed Dates, and Unverified Controlled Synthetic Linking Bridge (`Customer` ↔ `Company` ↔ `Document`)
- **Severity:** **MEDIUM**
- **Category:** Group C (Database Defects) & Group E (Source Code Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents & Code:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§6.4 Table T8, §8.5 — specifies `Customer` linked directly to `1–3 CUAD Contracts` via Controlled Synthetic Linking lookup table)
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR18`, `BR-01`, `UC.10`)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.2.1 P236, §3.2.2 P252, §3.2.3 Table 60 R7, §3.2.4 P272)
  - Source Code: `backend/app/modules/m3_hybrid_copilot/query_engine/semantic_layer.py`, `backend/app/modules/m3_hybrid_copilot/nl2cypher_engine.py`
- **Description:**
  1. **Synthetic Link Topology Divergence:** Proposal §6.4/§8.5 and SRS `FR18`/`BR-01` specify a direct synthetic relationship `(:Customer)-[:BOUND_BY_CONTRACT]->(:Contract)`. In the implemented Neo4j `SCHEMA_REGISTRY` (`semantic_layer.py`), contracts are stored as `:Document` nodes linked via `(:Company)-[:PARTY_TO]->(:Document)` (and `Database Design Ver 1.1` §3.2.1 P236 & §3.2.4 P272 mark how `:Customer` bridges to `:Company` / `:Document` and whether `PARTY_TO` carries `is_synthetic, random_seed` as `NEEDS CONFIRMATION`).
  2. **Duplicate Mixed-Case Properties & String Dates:** On loaded Neo4j nodes (`:SalesOrder`, `:Customer`, `:Product`), properties exist in duplicate casing (`TotalDue`/`totalDue`, `SubTotal`/`subTotal`, `OrderDate`/`orderDate`, `Name`/`name`) and `OrderDate` is stored as a `STRING` rather than a native Neo4j `DATE`.
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 1069, 1153, 1269, 1280; `backend/app/modules/m3_hybrid_copilot/query_engine/semantic_layer.py`.
- **Impact:** Cross-source multi-hop queries (`Customer → Contract → Clause`) depend on name/company matching or synthetic edges in `nl2cypher_engine.py` rather than the explicit `BOUND_BY_CONTRACT` lookup table described in Proposal §8.5.
- **Recommendation:** Document the exact `Customer ↔ Company ↔ Document` bridge implemented in `nl2cypher_engine.py` / `semantic_layer.py`, and normalize Neo4j property casing during ETL reload.

---

#### `E2E-ISS-15` — `Database Design Ver 1.1` Sections 4 & 5 Describe Data Lineage & Citation Resolution Through `[PLANNED]` Tables Rather Than the 13 Implemented MVP Tables
- **Severity:** **MEDIUM**
- **Category:** Group D (Architecture–Database Mismatch)
- **Classification:** `DOCUMENTATION DEFECT` (in `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` Sections 4 & 5)
- **Affected Documents:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§4.1–§4.7 Tables 69–74, §5.1–§5.7 Tables 75–76)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§4.4 Data Flow)
- **Description:**
  Although `Database Design Ver 1.1` added disclaimer notes at `P317` and `P357`, the entire body and tables of Section 4 (`Data Mapping Specification`, Tables 69–74) and Section 5 (`Integration Logic Explanation`, Tables 75–76) still trace data lineage, ingestion stages, and Citation Viewer resolution (`GET /citations/{citation_id}`) through **unimplemented `[PLANNED]` tables** (`raw_documents.id`, `entity_extraction_reviews`, `message_citations`, `chat_messages`, `sync_jobs`, `sync_audit_logs`, `knowledge_gaps`, and object storage `storage_uri`). In `Architecture Ver 1.1` (§4.4) and Source Code:
  - Document ingestion goes from `knowledge_upload_approvals` (or AEGIS `/data` file) → `pipeline.py` (UUIDv5 `doc_id` / `logical_chunk_id`) → Neo4j `:Document` / `:Clause` and Qdrant `cuad_contracts` payload (`doc_id`, `document_id`).
  - Citations and multi-turn messages are stored as JSON inside `copilot_sessions.messages`.
  - Workstation sync logs are recorded in `pb56_workstation_sync_logs`.
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 1446–1628 vs `7.C1SE18_Architecture-Document-ver1.1.docx` lines 310–330.
- **Impact:** A developer reading `Database Design Ver 1.1` Sections 4 & 5 to understand how `Architecture Ver 1.1` resolves citations or links Neo4j/Qdrant to PostgreSQL sees tables (`raw_documents`, `message_citations`) and endpoints (`GET /citations/{citation_id}`) that do not exist in the MVP codebase.
- **Recommendation:** Add a concise **"Implemented MVP Cross-Model Mapping & Citation Flow"** summary table in `Database Design Ver 1.1` §4.1 and §5.1 showing the actual active keys (`knowledge_upload_approvals.id`, deterministic UUIDv5 `doc_id`, `copilot_sessions.messages` JSON, `pb56_workstation_sync_logs`) alongside the target planned design.

---

#### `E2E-ISS-16` — Qdrant Payload Key Naming Mismatch (`department_scope` vs `department`; `document_id` vs `doc_id`) and Missing Qdrant Payload Indexes / Neo4j Full-Text Index Usage
- **Severity:** **MEDIUM**
- **Category:** Group D (Architecture–Database Mismatch) & Group E (Source Code Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT`
- **Affected Documents & Code:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.2.5 P282, §3.3.2 Table 65 & P299, §3.3.3 Table 67 & P306)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.3 Table 5.3 R1, §4.6 Table 6.5 R7)
  - Source Code: `backend/app/db/qdrant/client.py:143–144, 155–220`, `backend/app/db/neo4j/client.py` (`search_nodes`)
- **Description:**
  1. **Payload Field Naming:** `Database Design Ver 1.1` Table 65 specifies Qdrant payload fields `department_scope`, `document_id`, `sensitivity_level`, whereas `backend/app/db/qdrant/client.py` and `pipeline.py` write and filter on `department`, `doc_id` / `document_id`, and `is_active`.
  2. **Missing Payload & Full-Text Indexes in Code:** `qdrant/client.py:143–144` only creates payload indexes on `contract_name` and `doc_id` (missing `department`, `is_active`, `document_id`, `entity_type`). Furthermore, `qdrant/client.py` fallback `search_by_text()` scrolls only 300 points in Python memory, and `Neo4jClient.search_nodes()` performs a full-graph property scan (` any(prop IN keys(n) ...) `) instead of querying Neo4j full-text indexes.
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 1317, 1385, 1425; `backend/app/db/qdrant/client.py:143–144`; `backend/app/db/neo4j/client.py`.
- **Impact:** Degrades query performance as vector and graph volume grows (flagged in `Architecture Ver 1.1` Table 5.3 R1) and causes confusion over payload field names.
- **Recommendation:** Standardize payload field documentation in `Database Design Ver 1.1` Table 65 to show both implemented names (`department`, `doc_id`, `is_active`) and planned extensions, add Qdrant payload indexes on `department` and `is_active` in `qdrant/client.py`, and use Neo4j full-text indexes in `search_nodes()`.

---

#### `E2E-ISS-17` — Missing Locust Load Test Script (`locustfile.py`) and Automated Performance Benchmark Evidence in Repository
- **Severity:** **MEDIUM**
- **Category:** Group E (Source Code Mismatch)
- **Classification:** `IMPLEMENTATION GAP` (or un-committed artifact)
- **Affected Documents:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§6.7 Table T10 R14, §9.2 Table T18 R6 — Locust load tests in 4 stages up to 150 VU, `p95 < 500 ms` read, `p95 < 2000 ms` heavy)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§3.2 Deliverable 38, §3.3 WBS 23b, §4 Milestone M4, §7.1 P173–P175)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§2.1 P86 — notes *"no dedicated Product Backlog Item exists yet and one is to be raised at Product Backlog Refinement"*)
  - `C1SE18_SRS_GraphMind_Final.docx` (§1.3 T5 R27, §5.1 `NFR-01`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.3 Table 5.1 `QAS-01` & Table 5.3 R1 — notes *"Benchmark evidence: UNCERTAIN — no Locust/Lighthouse report found in the repository"*)
- **Evidence:** Repository search across `d:\CAPSTONE1\graph-mind` finds no `locustfile.py` or Locust test report, and `Product Backlog Ver 1.2` P86 confirms no PBI was created for WBS 23b.
- **Impact:** WBS 23b / Milestone M4 acceptance criterion (`Locust load test up to 150 VU meets p95 < 500 ms read and < 2000 ms heavy`) is currently `NOT VERIFIED` in the repository, and WBS 23b lacks a PBI ID in `Product Backlog Ver 1.2`.
- **Recommendation:** Add a `locustfile.py` script and execution report to the repository for Sprint 4 closure (WBS 23b) and assign it a PBI ID (or link it explicitly to `PB63` End-to-End Test).

---

#### `E2E-ISS-18` — AEGIS Agent Communication Protocol & Heartbeat Threshold Mismatch (`WSS` vs `HTTP REST`; `90 s` vs `120 s` Timeout)
- **Severity:** **MEDIUM**
- **Category:** Group A (Requirement Inconsistency) & Group E (Source Code Mismatch)
- **Classification:** `DOCUMENTATION DEFECT` (between SRS/US/PB and Architecture/DB/Code)
- **Affected Documents & Code:**
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR62` Table T19 R6 & R10, §4.4 P249, §4.5 Table T20 R7 — specifies `WSS wss://.../agent/control` WebSocket command channel and notes `30 s` vs `120 s` threshold conflict)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US69` AC1 — states `> 120 seconds` heartbeat timeout)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB76` AC1 — states `> 120 s` heartbeat timeout)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.1.2 `FD-01`, §4.1 Table 6.1 R3, §4.5 Table 6.4 R3 — specifies **HTTP REST** `/api/v1/workstations/*` with `30 s` heartbeat)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 15 R15–R16 — `heartbeat_interval_sec = 30`, `heartbeat_threshold_cycles = 3` → **`90 s` before OFFLINE**)
  - Source Code: `backend/app/modules/m1_data_sync/pb56_workstation_model.py`, `backend/app/api/v1/pb56_workstations.py`, `aegis_file_watcher/main.py` (uses HTTP REST polling/heartbeat every 30 s, 3 cycles = 90 s threshold, 2-phase ACK via HTTP POST)
- **Evidence:** `SRS Final` lines 537, 553, 565 (`wss://.../agent/control`) and `US69/PB76` (`> 120 s`) vs `Database Design Ver 1.1` lines 384–385 (`30 s × 3 = 90 s`) and `pb56_workstations.py`.
- **Impact:** Protocol mismatch (`WSS` vs `HTTP REST`) and timeout calculation mismatch (`90 s` vs `120 s`) for `FR62` / `UC.27`.
- **Recommendation:** Update `SRS Final` (`FR62`, §4.4, §4.5) from `WSS` to `HTTP REST` (with 30 s heartbeat and 2-phase ACK) and align the default offline threshold (`30 s × 3 cycles = 90 s`, configurable up to `120 s` / 4 cycles) across `US69`, `PB76`, `SRS`, and `Database Design`.

---

#### `E2E-ISS-19` — Read-Only Cypher Guard Implementation Scope (Keyword Regex Guard vs Claimed AST Syntax-Tree Parser)
- **Severity:** **MEDIUM**
- **Category:** Group E (Source Code Mismatch)
- **Classification:** `DOCUMENTATION DEFECT` (over-claiming AST parsing in Proposal/US/PB/SRS)
- **Affected Documents & Code:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§6.5 P148, §10 Table T23 R3 — *"Regex/AST-based safety filter"*)
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US68` AC1 — *"regex and syntax-tree analysis"*)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB75` AC1 — *"regex and syntax-tree analysis"*)
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR61`, Figure 6.4.27 caption — *"Cypher Guard AST"*)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§4.6 Table 6.5 R6 — accurately notes *"IMPLEMENTED (keyword-based); TEST VERIFIED (test_safety_guard.py). Syntax-tree analysis named in the checklist: NEEDS CONFIRMATION"*)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§5.8 P405 — accurately describes keyword check on `FORBIDDEN_KEYWORDS`)
  - Source Code: `backend/app/modules/m3_hybrid_copilot/query_engine/text_to_cypher.py` (`FORBIDDEN_KEYWORDS` regex/token check)
- **Evidence:** `backend/app/modules/m3_hybrid_copilot/query_engine/text_to_cypher.py`; `backend/app/tests/unit/test_safety_guard.py`; `7.C1SE18_Architecture-Document-ver1.1.docx` line 359.
- **Impact:** `Architecture Ver 1.1` and `Database Design Ver 1.1` accurately report the keyword/regex implementation, while `Proposal`, `US68`, `PB75`, and `SRS FR61` claim an AST syntax-tree parser.
- **Recommendation:** Either word `Proposal`, `US68`, `PB75`, and `SRS FR61` as *"Regex and token-level lexical guard"* (matching `Architecture Ver 1.1` and `text_to_cypher.py`), or add Cypher clause-structure validation if AST verification is required.

---

#### `E2E-ISS-20` — Legacy `knowledge_permissions` Table Coexists with `knowledge_access_policies` (Dual Source of Truth Risk) & Orphan `users.department_id` UUID Column
- **Severity:** **MEDIUM**
- **Category:** Group C (Database Defects) & Group D (Architecture–Database Mismatch)
- **Classification:** `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT` (explicitly flagged in `Database Design Ver 1.1` §3.1.2 Tables 8 & 12 and §3.1.11 P229–P230)
- **Affected Documents & Code:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.2 Table 8 R7 & Table 12, §3.1.11 P229–P230)
  - Source Code: `backend/app/db/postgres/models/knowledge_permission.py`, `backend/app/modules/m6_admin_security/rbac_matrix_model.py`, `backend/app/db/postgres/models/user.py`, `backend/app/core/departments.py`
- **Description:**
  1. **Dual Permission Tables:** Both `knowledge_permissions` (`api/v1/rbac.py`) and `knowledge_access_policies` (`rbac_matrix_router.py`) exist in the 13 implemented tables. `knowledge_access_policies` is the authoritative 2D RBAC matrix (`FR58`), leaving `knowledge_permissions` as legacy technical debt.
  2. **Orphan `users.department_id` UUID vs String `department_code`:** `users.department_id` is typed as `UUID` pointing to an unimplemented `departments` table, while all other implemented tables (`knowledge_access_policies.department_code`, `knowledge_upload_approvals.department_code`, `shift_reports.department`, `sop_documents.department`) and `core/departments.py` use canonical department code strings (`sales, legal, accounting_procurement, it, rnd`).
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 255, 314–324, 1062–1063.
- **Impact:** Inconsistent department representation across PostgreSQL tables (`UUID` on `users` vs `VARCHAR` code on 4 sibling tables) and potential confusion between `/api/v1/rbac` (`knowledge_permissions`) and `/api/v1/rbac/matrix` (`knowledge_access_policies`).
- **Recommendation:** Confirm whether to replace `users.department_id UUID` with `department_code VARCHAR(50)` (or implement the `departments` table) and deprecate `knowledge_permissions` in favor of `knowledge_access_policies`.

---

### LOW SEVERITY ISSUES (8 Issues)

#### `E2E-ISS-21` — Redundant `index=True` on Primary Key Columns and `JSON` vs `JSONB` Column Types in PostgreSQL ORM Models
- **Severity:** **LOW**
- **Category:** Group C (Database Defects)
- **Classification:** `IMPLEMENTATION GAP` (documented in `Database Design Ver 1.1` §3.1.1 Table 7 R7 & §3.1.10 P221)
- **Affected Documents & Code:**
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§3.1.1 Table 7 R7, §3.1.10 P221)
  - Source Code: `user.py`, `copilot_session.py`, `shift_report.py`, `sop_document.py`
- **Description:** Four ORM models declare `primary_key=True, index=True` on their UUID primary key (creating redundant B-tree indexes in PostgreSQL), and `copilot_sessions.messages`, `shift_reports.cases`, `sop_documents.steps/tags` use `JSON` instead of `JSONB`.
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 236, 1036.
- **Impact:** Minor storage/write overhead on PK indexes and inability to create GIN indexes on `JSON` columns.
- **Recommendation:** Remove `index=True` from `primary_key=True` columns and migrate `JSON` columns to `JSONB` in the baseline Alembic migration.

---

#### `E2E-ISS-22` — `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` Cover Date (`25 Sep 2026`) and SAD Reference (`ver1.0`) Not Updated to November 2026 / `ver1.1`
- **Severity:** **LOW**
- **Category:** Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`)
- **Affected Documents:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (Cover Page P10, Document Name Table T2 R3, §1.4 References P66)
- **Description:**
  - Cover Page (`P10`) says `Date: 25 Sep 2026` and Table T2 R3 (`P29`) says `Date: 25 September 2026`, contradicting Revision History Table T4 R2 (`P34`, line 65) and `Architecture Ver 1.1` Table 3 R6 which state Version 1.1 is dated **`22 Nov 2026`**.
  - Section 1.4 References (`P66`, line 151) still cites `7.C1SE18_Architecture-Document-ver1.0` instead of `ver1.1`.
- **Evidence:** `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` lines 10, 44, 65, 151.
- **Impact:** Metadata inconsistency between the cover page, revision history, and cross-document reference tables.
- **Recommendation:** Update Cover Date and Table T2 Date in `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` to `22 November 2026` and update §1.4 P66 reference to `7.C1SE18_Architecture-Document-ver1.1`.

---

#### `E2E-ISS-23` — `Tailwind CSS` Claimed in `SRS Final` and `Database Design Ver 1.1` vs Pure Custom CSS in `frontend/package.json` & `Architecture Ver 1.1`
- **Severity:** **LOW**
- **Category:** Group E (Source Code Mismatch) & Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `C1SE18_SRS_GraphMind_Final.docx` & `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`)
- **Affected Documents & Code:**
  - `C1SE18_SRS_GraphMind_Final.docx` (`FR34`, §4.1 P242, §7.2 P484 — states *"React 18 + Vite Single Page Application with Tailwind CSS"*)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§2.2 Table 4 R1 — states *"Web Dashboard (React 18 + Vite SPA, Tailwind CSS)"*)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.4 `CON-03`, §5.2 — states *"React 18 + Vite (JavaScript/JSX)"*, no Tailwind CSS)
  - Source Code: `frontend/package.json`, `frontend/src/index.css` (uses custom CSS variables and styling; Tailwind CSS is not installed)
- **Evidence:** `C1SE18_SRS_GraphMind_Final.docx` lines 353, 546, 1353; `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` line 174; `frontend/package.json`.
- **Impact:** Minor technology stack discrepancy on frontend styling framework.
- **Recommendation:** Remove `"with Tailwind CSS"` from `SRS Final` (`FR34`, §4.1, §7.2) and `Database Design Ver 1.1` (§2.2 Table 4 R1).

---

#### `E2E-ISS-24` — PostgreSQL Version Number Discrepancy (`PostgreSQL 16` in Proposal/Plan/Backlog vs `PostgreSQL 15+` in Architecture/Database Design)
- **Severity:** **LOW**
- **Category:** Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT`
- **Affected Documents:**
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§6.7 Table T10 R12 — `PostgreSQL 16`)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§5.1 Table T16 R3 — `PostgreSQL 16`)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§7 Table T8 R5 — `PostgreSQL 16`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` (§3.4 `CON-03`, §4.3 Table 6.3 R6 — `PostgreSQL 15+`)
  - `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (§2.2 Table 4 R3 — `PostgreSQL 15+`)
- **Evidence:** Compare `Proposal Ver 1.2` line 262 (`PostgreSQL 16`) against `Architecture Ver 1.1` line 242 (`PostgreSQL 15+`).
- **Impact:** Minor version label difference (`15+` includes `16`, and `UNIQUE NULLS NOT DISTINCT` used in Database Design Table 26 requires PostgreSQL 15+).
- **Recommendation:** Standardize wording to `PostgreSQL 15+ (tested on PostgreSQL 16)` across all documents.

---

#### `E2E-ISS-25` — Fine-Tuning Batch Size Wording Discrepancy (`batch size 4` in `US47` vs `batch size 2, gradient accumulation 4, effective batch size 8` in `Proposal` & `PB17`)
- **Severity:** **LOW**
- **Category:** Group A (Requirement Inconsistency) & Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `C1SE18_UserStory_GraphMind-Ver1.2.docx` `US47`)
- **Affected Documents:**
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US47` line 160 — states *"batch size 4 (with gradient accumulation if needed)"*)
  - `C1SE18-Proposal-Document-Ver1.2.docx` (§8.4 Table T16 R5 line 350 — states *"2 per device, with gradient accumulation steps of 4 (effective batch size = 8)"*)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB17` line 197 — explicitly notes *"Hyperparameters follow Proposal §8.4 (User Story v1.2, US47 still lists batch size 4)"*)
- **Evidence:** `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` line 197.
- **Impact:** Minor hyperparameter discrepancy in `US47`.
- **Recommendation:** Update `US47` AC2 in `C1SE18_UserStory_GraphMind-Ver1.2.docx` to *"batch size 2 per device with gradient accumulation 4 (effective batch size 8)"*.

---

#### `E2E-ISS-26` — Stale Document Filenames in Cross-Document Reference Sections (`C1SE18_ProductBacklog_GraphMind_FINAL.docx`, `Project Plan FINAL 19 Sep 2026`, `C1SE18_SRS_GraphMind_Ver1.2.docx`)
- **Severity:** **LOW**
- **Category:** Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT`
- **Affected Documents:**
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (§1 P39, §3 P77 cites `C1SE18_ProductBacklog_GraphMind_FINAL.docx` with `PB01–PB76` instead of `Ver1.2` with `PB01–PB79`; §4 P94 `[16]` cites `Project Plan Document, FINAL, 19 Sep 2026`)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (Table T2 R3 P44 omits SRS, Product Backlog, Architecture, and Database Design from Referenced Documents)
  - `C1SE18_SRS_GraphMind_Final.docx` (Table T2 R3 P44 internal `File name` cell says `C1SE18_SRS_GraphMind_Ver1.2.docx` while disk filename is `C1SE18_SRS_GraphMind_Final.docx`)
  - `7.C1SE18_Architecture-Document-ver1.1.docx` & `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (Table T2 R3 internal `File name` cell omits the `7.` / `6.` prefix used on disk)
- **Evidence:** `C1SE18_UserStory_GraphMind-Ver1.2.docx` lines 61, 266, 283; `C1SE18_SRS_GraphMind_Final.docx` line 44; `7.C1SE18_Architecture-Document-ver1.1.docx` line 44; `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` line 44.
- **Impact:** Cosmetic filename and version-label drift across document headers and reference lists.
- **Recommendation:** Harmonize all cross-document reference tables so every document cites the exact latest filenames and versions (`Proposal Ver 1.2`, `User Story Ver 1.2`, `Product Backlog Ver 1.2`, `Project Plan Ver 1.2`, `SRS Ver 1.2 / Final`, `Database Design Ver 1.1`, `Architecture Ver 1.1`).

---

#### `E2E-ISS-27` — Persona Mismatch on `US08` vs `PB05` (AEGIS Local Agent Monitoring: `Executive` in `US08` vs `System & IT Administrator` in `PB05` & `SRS UC.07/UC.08`)
- **Severity:** **LOW**
- **Category:** Group A (Requirement Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (in `C1SE18_UserStory_GraphMind-Ver1.2.docx` `US08`)
- **Affected Documents:**
  - `C1SE18_UserStory_GraphMind-Ver1.2.docx` (`US08` line 93 — Actor: `Executive`)
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (`PB05` line 185 — Actor: `System & IT Administrator`, explicitly notes *"Persona differs from US08 (Executive) in User Story v1.2 — to be confirmed at Refinement"*)
  - `C1SE18_SRS_GraphMind_Final.docx` (`UC.07`, `UC.08` — Actor: `System & IT Administrator`)
- **Evidence:** `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` line 185.
- **Impact:** Minor actor discrepancy on `US08` (under `BR-04`, AEGIS Agent installation and sync configuration belong to `System & IT Administrator`).
- **Recommendation:** Change `US08` actor in `C1SE18_UserStory_GraphMind-Ver1.2.docx` from `Executive` to `System & IT Administrator`.

---

#### `E2E-ISS-28` — WBS Numbering Offset Between `Product Backlog Ver 1.2` (`PB32–PB39, PB42, PB56–PB58, PB60–PB66, PB71, PB74, PB76`) and `Project Plan Ver 1.2` (§3.3 Table T11)
- **Severity:** **LOW**
- **Category:** Group F (Version and Naming Inconsistency)
- **Classification:** `DOCUMENTATION DEFECT` (off-by-one WBS references in `Product Backlog Ver 1.2` Column 12 Remarks)
- **Affected Documents:**
  - `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` (§5 Table T7 Column 12 Remarks, lines 212–256)
  - `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` (§3.3 Table T11 WBS, lines 275–316)
- **Description:**
  In `Product Backlog Ver 1.2` Table T7 (Remarks column), several Sprint 2–4 PBIs cite WBS numbers that are shifted by 1 compared to `Project Plan Ver 1.2` Table T11:
  - `PB74` (Email OTP) cites `WBS: 11b` (in Project Plan Table T11, `11b` is LoRA Fine-Tuning and **`11c`** is Email OTP).
  - `PB56` & `PB76` (AEGIS Panel & Kill Switch) cite `WBS: 18` (in Project Plan Table T11, `18` is Close Sprint 3 and **`19`** is AEGIS Panel & Kill Switch).
  - `PB57` & `PB58` (Executive Dashboard & Risk Center) cite `WBS: 19` (in Project Plan Table T11, **`19b`** is Executive Dashboard & Risk Center).
  - `PB65` & `PB71` (Web Briefing & Shift Consolidation) cite `WBS: 19b` (in Project Plan Table T11, **`19c`** is Shift Consolidation & Web Briefing).
  - `PB42` & `PB66` (Admin Analytics & LLMOps Dashboard) cite `WBS: 20` (in Project Plan Table T11, `20` is Test Case RBAC & Settings and **`21`** is Admin Analytics & LLMOps Dashboard).
  - `PB32` (100-question Benchmark) cites `WBS: 21` (in Project Plan Table T11, **`22`** is Benchmark Construction).
  - `PB33, PB34, PB35, PB36, PB60` (3 Baselines & 5 Indicators) cite `WBS: 22` (in Project Plan Table T11, **`23`** is Baseline Evaluation).
  - `PB38` (Technical Report) cites `WBS: 23` (in Project Plan Table T11, **`24`** is Technical Report).
  - `PB61` (AI Usage Disclosure) cites `WBS: 24` (in Project Plan Table T11, **`25`** is AI Usage Disclosure).
  - `PB39` (Reflection & Peer Evaluation) cites `WBS: 25` (in Project Plan Table T11, **`26`** is Reflection & Peer Evaluation).
  - `PB62, PB63, PB64` (E2E Test & Closing) cite `WBS: 26` (in Project Plan Table T11, **`27`** is Final Documentation, E2E Test & Project Closing).
- **Evidence:** Compare `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx` lines 212–256 against `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx` lines 290–315.
- **Impact:** Off-by-one WBS reference numbers when tracing Sprint 4 PBIs from the Product Backlog to the Project Plan WBS table.
- **Recommendation:** Update the WBS reference numbers in `Product Backlog Ver 1.2` Table T7 Column 12 (`Remarks`) to match `Project Plan Ver 1.2` §3.3 Table T11 (`11c, 19, 19b, 19c, 21, 22, 23, 24, 25, 26, 27`).
