# GraphMind — Documentation & Implementation Correction Plan (Section 12)

- **Audit Date:** 23 November 2026
- **Scope:** Ordered remediation plan across the 7 GraphMind project documents and Source Code based on the 28 identified End-to-End Audit findings (`E2E-ISS-01` through `E2E-ISS-28`).
- **Rule Applied:** Strict separation between **Documentation Defects** (fixing documents to match approved requirements or verified system facts), **Design/Implementation Gaps** (fixing source code/schema where implementation violates security, integrity, or approved SRS requirements), and **Items Requiring Stakeholder Confirmation (`NEEDS CONFIRMATION`)**.

---

## 1. Correction Order & Dependency Strategy

To avoid cascading re-edits across the 7 documents, corrections must execute in **4 sequential stages**:

```
Stage 1: Resolve 8 Stakeholder Decision Points (NEEDS CONFIRMATION)
   │
   ▼
Stage 2: Patch High-Priority Source Code & Schema Integrity Gaps (E2E-ISS-02, 05, 06, 09, 10, 16, 17)
   │
   ▼
Stage 3: Synchronize Core Technical Specs (SRS Final → Database Design Ver 1.1 → Architecture Ver 1.1)
   │
   ▼
Stage 4: Harmonize Upstream Management Docs (Proposal Ver 1.2 → User Story Ver 1.2 → Product Backlog Ver 1.2 → Project Plan Ver 1.2)
```

---

## 2. Stage 1 — Items Requiring Mentor / Stakeholder Confirmation (`NEEDS CONFIRMATION`)

Before locking the final release of the 7 documents and code, the Team Leader and Project Mentor (`PhD. Tran Kim Sanh`) should confirm the following **8 design decisions**:

| Decision ID | Related Issue | Question to Confirm | Recommended Default Option |
|---|---|---|---|
| **DEC-01** | `E2E-ISS-02` | Should the application officially enforce **5 system roles** (`it_admin`, `knowledge_manager`, `executive`, `department_manager`, `standard_user`) across all 7 documents and split `ADMIN` into `IT_ADMIN` and `KNOWLEDGE_MANAGER` in `knowledge_access_policies`? | **Yes (5 Canonical BR-04 Roles)** — already adopted by `SRS Final`, `Product Backlog Ver 1.2`, `Architecture Ver 1.1`, and `Database Design Ver 1.1`. |
| **DEC-02** | `E2E-ISS-08` | Under `BR-04`, is **Document Upload Approval (`FR54` / `US61` / `PB68`)** restricted strictly to `Knowledge Administrator` (`knowledge_manager`), or may `System & IT Administrator` (`it_admin`) also approve uploads? | **Strict BR-04:** `knowledge_manager` approves business department uploads (Sales, Legal, Procurement, R&D); `it_admin` approves only IT department uploads (or none). |
| **DEC-03** | `E2E-ISS-09` | For **AI Daily Shift Consolidation (`FR57` / `UC.25`)**, should the team create and persist the 8-column `shift_daily_summaries` table in PostgreSQL, or keep dynamic on-demand synthesis in `shift_reports.py` and mark persistence as `[PLANNED]` in SRS? | **Create `shift_daily_summaries` table** (only 8 columns, ~30 lines of SQLAlchemy model + router save) so `SRS FR57`, `Database Design Table 42`, and `Source Code` match 100%. |
| **DEC-04** | `E2E-ISS-07` | How should the **Deployment Model** be phrased across `Proposal/US/PB/SRS` (which say *"Hybrid Agent + Backend Cloud"*) vs `Architecture/DB Design/docker-compose.yml` (which implement *"100% On-Premise Single-Host Docker Compose"*)? | State in all documents: **"Logical Architecture: Hybrid Edge Agent + Central Private-Cloud/On-Premise Backend; Capstone MVP Deployment: Single-Host On-Premise Docker Compose + Native Host PostgreSQL & Ollama."** |
| **DEC-05** | `E2E-ISS-20` | How should **Department References** on `users` be normalized: replace `users.department_id UUID` with `department_code VARCHAR(50)` (matching `shift_reports`, `sop_documents`, `knowledge_upload_approvals`, `knowledge_access_policies`), or create the `[PLANNED]` `departments` table? | **Replace `users.department_id` with `department_code VARCHAR(50)`** for the MVP (aligns with `backend/app/core/departments.py` and the 4 sibling tables with minimum diff). |
| **DEC-06** | `E2E-ISS-20` | Can the legacy `knowledge_permissions` table and `/api/v1/rbac` endpoints be deprecated in favor of `knowledge_access_policies` (`/api/v1/rbac/matrix`)? | **Yes** — keep read compatibility or migrate callers to `knowledge_access_policies` to eliminate Dual Source of Truth. |
| **DEC-07** | `E2E-ISS-14` | In Neo4j, how is the **Controlled Synthetic Linking (`FR18` / `BR-01`)** between AdventureWorks `:Customer` and CUAD `:Document` represented (`(:Customer) ↔ (:Company)-[:PARTY_TO]->(:Document)` vs direct `[:BOUND_BY_CONTRACT]`)? | Document the actual `(:Company)-[:PARTY_TO]->(:Document)` + customer-name/entity resolution bridge used in `nl2cypher_engine.py`, or run a linking script to add explicit `[:PARTY_TO {is_synthetic: true}]` edges from `:Customer`. |
| **DEC-08** | `E2E-ISS-18` | Should `SRS Final` (`FR62`, §4.4, §4.5) be updated from `WSS wss://.../agent/control` to **HTTP REST** (`/api/v1/workstations/*` with 30s heartbeat, `30s × 3 = 90s` offline threshold, and 2-phase ACK)? | **Yes (HTTP REST)** — matches `Architecture Ver 1.1`, `Database Design Ver 1.1`, `pb56_workstations.py`, and `aegis_file_watcher/main.py`. |

---

## 3. Stage 2 — Source Code & Database Schema Corrections (Do Not Apply Until Approved)

| Priority | Issue ID | Target Source Code Files | Specific Technical Correction |
|---|---|---|---|
| **P1 (HIGH)** | `E2E-ISS-05` | `backend/app/db/postgres/models/otp.py`; `backend/app/main.py`; `docker-compose.yml` | 1. Replace unsalted `hashlib.sha256` on 6-digit OTPs with `HMAC-SHA256(SECRET_KEY, f"{email}:{otp}")` or `bcrypt`.<br>2. Replace `allow_origins=["*"]` in `main.py:232–239` with env-configured `CORS_ORIGINS`.<br>3. Remove hardcoded fallback secret key `ekai-secret-agent-key-2026` from `docker-compose.yml` (require `.env`). |
| **P1 (HIGH)** | `E2E-ISS-02` | `backend/app/db/postgres/seed_users.py`; `backend/app/modules/m6_admin_security/rbac_matrix_service.py`; `frontend/src/data/roles.js` | Normalize all role codes to the 5 canonical BR-04 values (`it_admin, knowledge_manager, executive, department_manager, standard_user`) and split `ADMIN` into `IT_ADMIN` and `KNOWLEDGE_MANAGER` in `knowledge_access_policies`. |
| **P1 (HIGH)** | `E2E-ISS-06` & `E2E-ISS-21` | `backend/app/db/postgres/models/__init__.py`; `user.py`; `otp.py`; `audit_log.py`; `document_approval_model.py`; `rbac_matrix_model.py`; `session_service.py`; `backend/alembic/versions/` | 1. Create `UserActiveSession` ORM model and export all 13 implemented models in `models/__init__.py`.<br>2. Add missing `ForeignKey` (`ON DELETE CASCADE` / `SET NULL`) and `CheckConstraint` declarations.<br>3. Remove redundant `index=True` on PK columns and change `JSON` to `JSONB`.<br>4. Replace broken Alembic migrations `0186c646946f` / `a93ce8369026` with a clean baseline migration covering all 13 tables, and remove runtime `CREATE TABLE IF NOT EXISTS` calls. |
| **P2 (MEDIUM)** | `E2E-ISS-10` | `backend/app/modules/m6_admin_security/document_approval_model.py`; `document_approval_router.py` | Add `sha256_hash = Column(String(64), nullable=True, index=True)` to `KnowledgeUploadApproval`, compute SHA-256 on file upload (`POST /api/documents/submit-upload`), and reject duplicate hashes with `409 Conflict` (`BR-06`). |
| **P2 (MEDIUM)** | `E2E-ISS-09` | `backend/app/db/postgres/models/shift_report.py`; `backend/app/api/v1/shift_reports.py` | If `DEC-03` selects persistence, add the `ShiftDailySummary` ORM model (`shift_daily_summaries`, Table 42 in DBD Ver 1.1) and persist consolidated daily summaries in `/consolidate`. |
| **P2 (MEDIUM)** | `E2E-ISS-16` | `backend/app/db/qdrant/client.py`; `backend/app/db/neo4j/client.py` | Add Qdrant payload indexes on `department`, `is_active`, and `document_id` in `qdrant/client.py:143–144`; update `Neo4jClient.search_nodes()` to query Neo4j full-text indexes instead of scanning `keys(n)`. |
| **P2 (MEDIUM)** | `E2E-ISS-17` | `backend/app/tests/load/locustfile.py` (new) | Commit the 4-stage Locust load-testing script (`up to 150 VU`) verifying `p95 < 500 ms` (read) and `p95 < 2000 ms` (heavy retrieval) per `WBS 23b` and `SRS NFR-01`. |

---

## 4. Stage 3 — Document-by-Document Section Correction Plan

### 4.1 `C1SE18_SRS_GraphMind_Final.docx` (Priority 1 — Highest Number of Cross-Document Conflicts)
1. **Section 4.5 (Table T20 — API Interface Summary):**
   - Update Document Upload/Approval URIs from `/api/v1/documents/*` to `/api/documents/submit-upload` and `/api/admin/upload-approvals` (`/{id}/review`).
   - Update Shift Report URIs from `/api/v1/shifts/*` to `/api/v1/dashboard/shift-reports` (`/{id}/review`, `/consolidate`).
   - Update AEGIS Control channel from `WSS wss://.../agent/control` to `HTTP REST /api/v1/workstations/{id}/heartbeat` & `/sync-mode` (`/ack`) (`E2E-ISS-01`, `E2E-ISS-18`).
2. **Section 4.6 (Table T21 & P254–P256 — Data Requirements):**
   - Replace the 10-table draft PostgreSQL table list with the **13 Implemented MVP PostgreSQL tables** from `Database Design Ver 1.1` §3.1.2 (`users, password_reset_otps, user_active_sessions, knowledge_access_policies, knowledge_permissions, audit_logs, knowledge_upload_approvals, pb56_workstations, pb56_workstation_sync_logs, pb56_sync_mode_audit_logs, sop_documents, copilot_sessions, shift_reports`) plus a note referencing the 21 `[PLANNED]` tables (`E2E-ISS-01`).
   - Replace the 6 draft Neo4j labels (`:Entity, :SOP, :RiskEvent`) with the **10 Implemented Neo4j labels** (`Customer, SalesOrder, Product, SubCategory, Category, Employee, Document, Clause, Company, Department`) and **8 Implemented relationships** (`PLACED_ORDER, PURCHASED, CONTAINS_PRODUCT, BELONGS_TO, PART_OF, CONTAINS_CLAUSE, PARTY_TO, BELONGS_TO_DEPT`) (`E2E-ISS-01`).
   - Replace Qdrant collection `graphmind_chunks` (`768-dim`) in §4.6 P255 and §5.1 `NFR-06` with `cuad_contracts` and `adventureworks_entities` (**`384-dim` Cosine**, `SentenceTransformer("all-MiniLM-L6-v2")`) (`E2E-ISS-01`).
3. **Appendix B (Table T53 & Table T54 — Requirements Traceability Matrix):**
   - Fix all **13 broken US/PB mappings in Table T53** (`Rows 12, 13, 16, 20, 22, 23, 24, 25, 26, 30, 37, 47, 48, 49`) and fix **Table T54 Row 5** (`Module 5: Enterprise Multi-facet Search`) using `GraphMind-End-to-End-Traceability-Matrix.md` (`E2E-ISS-03`).
4. **Minor Harmonization:**
   - Remove `"with Tailwind CSS"` in `FR34`, §4.1, and §7.2 (`E2E-ISS-23`).
   - Standardize role codes in §2.4 Table T7 to `department_manager` and `standard_user` (`E2E-ISS-02`).

### 4.2 `7.C1SE18_Architecture-Document-ver1.1.docx` (Priority 2)
1. **Sections 3.2, 4.1, 4.2, 4.3, 4.4, 4.6 (Diagrams & Placeholders):**
   - Replace the 5 outdated Ver 1.0 diagrams and 7 red `[DIAGRAM PLACEHOLDER: ...]` text blocks with the 6 rendered 250 DPI Ver 1.1 diagrams (`docs/07-architecture/diagrams/fig_1..fig_6.png` — already embedded in `C1SE18_Architecture-Document-ver1.1.docx`) (`E2E-ISS-04`).
2. **Sections 3.3, 4.2, 4.3, 4.5, 4.6, 6 (Dangling Cross-References):**
   - Remove or define the dangling references to `Table 6.2c` and `TD-01..TD-05` (`E2E-ISS-04`).
3. **Section 5.2 (Table 7 — Team Workload & Task Assignment Matrix):**
   - Synchronize team member roles and module assignments with `Project Plan Ver 1.2` §2.1 Table T5 and RACI Table T6 (`E2E-ISS-11`).
4. **Section 4.4 (P193 — Document Upload Approval Actor):**
   - Align with `DEC-02` (`Knowledge Administrator` per `BR-04` and Table 2.2) (`E2E-ISS-08`).

### 4.3 `6.C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (Priority 3)
1. **Cover Page (P10), Document Name (Table T2 R3), and References (§1.4 P66):**
   - Update Cover Date and Table T2 Date from `25 Sep 2026` / `25 September 2026` to `22 November 2026` (`E2E-ISS-22`).
   - Update §1.4 P66 reference from `7.C1SE18_Architecture-Document-ver1.0` to `7.C1SE18_Architecture-Document-ver1.1` (`E2E-ISS-22`).
2. **Section 2.2 (Table 4 R1 — Client Layer):**
   - Remove `, Tailwind CSS` (`E2E-ISS-23`).
3. **Section 3.1.9 (Table 44 — Test Verification Status):**
   - Update `TEST VERIFIED: NOT VERIFIED` to cite the 24 existing pytest files in `backend/app/tests/` (`TEST EXISTS`) (`E2E-ISS-13`).
4. **Sections 4.1 & 5.1 (Cross-Model Mapping & Integration Logic):**
   - Add an explicit summary table of the **Implemented MVP Cross-Model Lineage** (`knowledge_upload_approvals.id`, deterministic UUIDv5 `doc_id`, `copilot_sessions.messages` JSON, `pb56_workstation_sync_logs`) ahead of the `[PLANNED]` target tables (`raw_documents`, `message_citations`, `sync_jobs`) (`E2E-ISS-15`).

### 4.4 Upstream Documents (`Proposal Ver 1.2`, `User Story Ver 1.2`, `Product Backlog Ver 1.2`, `Project Plan Ver 1.2`) (Priority 4)
1. **`C1SE18_ProductBacklog_GraphMind_Ver1.2.docx`:**
   - Fix the 11 off-by-one WBS numbers in §5 Table T7 Column 12 (`Remarks`) to match `Project Plan Ver 1.2` §3.3 Table T11 (`11c, 19, 19b, 19c, 21, 22, 23, 24, 25, 26, 27`) (`E2E-ISS-28`).
   - Update `PB70–PB71` shift report status from `REVIEWED` to `APPROVED / REJECTED` (`E2E-ISS-09`).
   - Add or link a PBI for `WBS 23b` (Locust Load Testing up to 150 VU) (`E2E-ISS-17`).
2. **`C1SE18_UserStory_GraphMind-Ver1.2.docx`:**
   - Update `US63–US64` shift report status from `REVIEWED` to `APPROVED / REJECTED` (`E2E-ISS-09`).
   - Update `US47` batch size wording from `batch size 4` to `batch size 2 per device with gradient accumulation 4 (effective batch size 8)` (`E2E-ISS-25`).
   - Update `US08` actor from `Executive` to `System & IT Administrator` (`E2E-ISS-27`).
   - Update §3 P77 reference from `C1SE18_ProductBacklog_GraphMind_FINAL.docx (PB01–PB76)` to `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx (PB01–PB79)` and §4 `[16]` to `Project Plan Ver 1.2` (`E2E-ISS-26`).
3. **`C1SE18-Proposal-Document-Ver1.2.docx` & `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx`:**
   - Harmonize role count wording (`4 roles + Department Manager persona` → `5 system roles per BR-04`) (`E2E-ISS-02`) and clarify Hybrid Logical vs Single-Host MVP Docker deployment (`E2E-ISS-07`).
