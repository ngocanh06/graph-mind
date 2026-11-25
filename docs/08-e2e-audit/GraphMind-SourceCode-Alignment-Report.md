# GraphMind — Source Code End-to-End Alignment Report (Phase 7)

- **Audit Date:** 23 November 2026
- **Audited Repository Root:** `d:\CAPSTONE1\graph-mind`
- **Compared Document Suite:** `Proposal Ver 1.2`, `User Story Ver 1.2`, `Product Backlog Ver 1.2`, `Project Plan Ver 1.2`, `SRS Final (Ver 1.2)`, `Database Design Ver 1.1`, `Architecture Ver 1.1`

---

## 1. Verification Status Definitions (Phase 7 Rule)

Per Phase 7 and Strict Rule #11 (*"Không xem Code tồn tại là chức năng hoàn thành"*), every subsystem and component is evaluated across five distinct verification levels:
- **`CODE EXISTS`**: Source files, classes, functions, or UI components exist in the repository.
- **`INTEGRATED`**: Frontend UI, Backend API router, Service/Engine, and Database driver/ORM are wired end-to-end without mock-only dead ends.
- **`TEST EXISTS`**: Automated unit, integration, or E2E test files (`pytest` or load test scripts) exist in the repository for the component.
- **`TEST PASSED`**: Tests have been executed and verified passing in the target environment.
- **`NOT VERIFIED`**: Live runtime behavior, benchmark SLA metric, or test pass status has not been independently verified against a live multi-database environment during this static audit.

---

## 2. Application Layer Verification (Backend — `backend/app/`)

### 2.1 Entrypoint, Routers, Controllers, and Vertical Modules

| Backend Component / File Path | Lines of Code | Documented In (SAD Ver 1.1 / SRS Final) | Actual Implementation & Responsibility | Verification Status | Alignment Classification |
|---|---:|---|---|---|---|
| `backend/app/main.py` | 3,306 | SAD §4.2 Table 6.2 R1; §4.7 | FastAPI app bootstrap, lifespan startup, `reconcile_crashed_operations()` (PR1 Crash Recovery), `ConcurrentLoginException` handler (`401 CONCURRENT_LOGIN_KICKED`), `CORSMiddleware` (wildcard `*` defect `E2E-ISS-05`), router mounting (`/api/v1` + legacy `/api`), plus **37 inline endpoints** (Knowledge Explorer, Graph CRUD for `m2`, Multi-facet Search for `m5`, SSE stream). | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` | **FULLY ALIGNED with SAD Ver 1.1** (Flagged as modularity refactor target `E2E-ISS-12`) |
| `backend/app/api/v1/auth.py` | ~220 | SAD §4.2 Table 6.2 R2; SRS `FR1, FR2, FR59` | JWT login (`/api/v1/auth/login`), registration (`/register`), `/me`, token creation (`HS256` with `jti`), wired to `session_service.py` for Single Active Session enforcement. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_concurrent_login.py`) | **FULLY ALIGNED** |
| `backend/app/api/v1/copilot.py` | 2,363 | SAD §4.2 Table 6.2 R2; SRS `FR27–FR35, FR39` | Multi-turn AI Copilot controller (`/api/v1/copilot/*`), session CRUD, pin/share sessions (`copilot_sessions`), orchestrates `m3_hybrid_copilot` engine, RRF fusion, citations, and Ollama inference. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_copilot_postgres.py`, `test_copilot_pin_session.py`, `test_copilot_greeting_and_role.py`) | **FULLY ALIGNED** |
| `backend/app/api/v1/dashboard.py` | 1,117 | SAD §4.2 Table 6.2 R2; SRS `FR40–FR44` | Carries `Module 4` business logic: Home & Executive KPI aggregations, Smart Risk & Alert Center (4 criteria: expiring contracts, uncapped liability, negative margin, abnormal discount $\ge 35\%$), and on-screen Executive Briefing generation via Ollama. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_department_scope.py`) | **ALIGNED with SAD Ver 1.1** (`m4_decision_support` module folder is an empty stub `E2E-ISS-12`) |
| `backend/app/api/v1/shift_reports.py` | 152 | SAD §4.2 Table 6.2 R2; SRS `FR55–FR57` | Shift handover CRUD (`/api/v1/dashboard/shift-reports`), manager review/sign-off (`APPROVED`/`REJECTED`), and `/consolidate` via local Ollama + Deterministic Fallback. Does not persist daily summaries to a `shift_daily_summaries` table. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_department_report.py`) | **PARTIAL GAP** (`shift_daily_summaries` persistence in SRS `FR57` not implemented `E2E-ISS-09`; URI differs from SRS §4.5 `E2E-ISS-01`) |
| `backend/app/api/v1/sop.py` | 736 | SAD §4.2 Table 6.2 R2; SRS `FR26` | SOP Wiki CRUD (`/api/v1/sop/*`), `draft → published → archived` lifecycle on PostgreSQL `sop_documents`. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_sop_api.py`) | **ALIGNED with SAD Ver 1.1** (`m2_knowledge_editor` folder is an empty stub `E2E-ISS-12`) |
| `backend/app/api/v1/pb56_workstations.py` & `m1_data_sync/pb56_workstation_service.py` | ~890 | SAD §4.2 Table 6.2 R2–R3; SRS `FR13–FR14, FR62` | AEGIS Workstation registration, 30s HTTP REST heartbeat, Online/Offline status computation (`30s × 3 = 90s`), 2-phase sync mode & Emergency Kill Switch command/ACK (`<= 3s`), idempotent sync log recording. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_pb56_workstations.py`) | **ALIGNED with SAD & DBD Ver 1.1** (Contradicts SRS §4.5 `WSS` claim `E2E-ISS-18`) |
| `backend/app/api/v1/rbac.py` | ~140 | SAD §4.2 Table 6.2 R2; DBD Table 12 | Legacy simplified domain-permission endpoints reading/writing `knowledge_permissions`. Coexists with `rbac_matrix_router.py`. | `CODE EXISTS` · `INTEGRATED` | **TECHNICAL DEBT** (Dual Source of Truth with `knowledge_access_policies` `E2E-ISS-20`) |
| `backend/app/modules/m1_data_sync/` (`pipeline.py`, `webhook.py`, `google_connector.py`) | 4,371 | SAD §4.2 Table 6.2 R3; SRS `FR15–FR22` | Unified ingestion pipeline: PDF/CSV/XLSX/TXT parsing, SHA-256 content deduplication (`BR-06`), deterministic UUIDv5 chunking, in-memory `RLock` concurrency (`ADR-05`), PR1 staged commits to Qdrant & Neo4j, optional Google Drive/Sheets OAuth connector. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_pr1_doc_identity.py`, `test_pr1_txt_parser.py`, `test_document_duplicate.py`) | **FULLY ALIGNED** |
| `backend/app/modules/m2_knowledge_editor/` | 0 | SAD §4.2 Table 6.2 R4 | Empty package stub (`__init__.py` = 0 bytes). Logic lives in `main.py` inline routes and `api/v1/sop.py`. | `CODE EXISTS (Stub)` | **IMPLEMENTATION GAP (`E2E-ISS-12`)** |
| `backend/app/modules/m3_hybrid_copilot/` (`nl2cypher_engine.py`, `text_to_cypher.py`, `semantic_layer.py`, `context_fusion.py`, `inference/client.py`) | 5,879 | SAD §4.2 Table 6.2 R5; SRS `FR27–FR35, FR61` | Core Hybrid GraphRAG engine: intent classification, `SCHEMA_REGISTRY` (10 labels, 8 relationships), NL2Cypher (`4,233 lines`), Read-Only Cypher Guard (`FORBIDDEN_KEYWORDS`, `FR61`), parallel Qdrant 384-dim search, RRF context fusion ($k=60$), local Ollama client (`qwen2.5-7b-graphmind`) with `< 1.0 s` Deterministic Fallback. | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_nl2cypher_golden_suite.py`, `test_safety_guard.py`, `test_customer_cypher_and_confidence.py`, `test_excel_grounding.py`) | **FULLY ALIGNED with SAD Ver 1.1** (Note: Cypher Guard is keyword/regex-based rather than full AST `E2E-ISS-19`) |
| `backend/app/modules/m4_decision_support/` | 0 | SAD §4.2 Table 6.2 R6 | Empty package stub (`__init__.py` = 0 bytes). Logic lives in `api/v1/dashboard.py` and `api/v1/shift_reports.py`. | `CODE EXISTS (Stub)` | **IMPLEMENTATION GAP (`E2E-ISS-12`)** |
| `backend/app/modules/m5_multifacet_search/` | 0 | SAD §4.2 Table 6.2 R7 | Empty package stub (`__init__.py` = 0 bytes). Logic lives in `main.py` inline search routes. | `CODE EXISTS (Stub)` | **IMPLEMENTATION GAP (`E2E-ISS-12`)** |
| `backend/app/modules/m6_admin_security/` (`user_admin_api.py`, `rbac_matrix_*`, `document_approval_*`, `session_service.py`, `forgot_password_router.py`, `otp_service.py`, `audit_service.py`) | 2,468 | SAD §4.2 Table 6.2 R8; SRS `FR1–FR6, FR53–FR54, FR58–FR60` | 15 files implementing User Admin CRUD, Dynamic 2D RBAC Matrix (`knowledge_access_policies`), Document Upload Approval Queue (`knowledge_upload_approvals`), Single Active Session (`user_active_sessions`), 3-step Email OTP (`password_reset_otps`), and Immutable Audit Logs (`audit_logs`). | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` (`test_user_admin_api.py`, `test_document_approval.py`, `test_document_approval_suite.py`, `test_e2e_document_approval.py`, `test_concurrent_login.py`) | **ALIGNED with SAD & DBD Ver 1.1** (Subject to `E2E-ISS-02` role codes, `E2E-ISS-05` OTP hash, `E2E-ISS-10` queue `sha256_hash`) |

---

## 3. Frontend Layer Verification (`frontend/src/`)

- **Framework & Packaging (`frontend/package.json`, `Dockerfile`):**
  - Built with `react: ^18.3.1`, `react-dom: ^18.3.1`, `vite: ^5.4.2`, `d3-force`, `lucide-react`.
  - Pure JavaScript/JSX (`.jsx` / `.js`), styled via custom CSS in `frontend/src/index.css` (**no Tailwind CSS, no TypeScript, no Next.js** — matches `Architecture Ver 1.1` §3.4 `CON-03`, contradicts `Tailwind CSS` mention in `SRS Final` & `Database Design Ver 1.1` `E2E-ISS-23`).
  - Served in production Docker container by `nginx:alpine` mapped to host port `5173:80`.
- **Modular Views (`frontend/src/views/m1..m6`):**
  - `m1_data_sync/`: `ConnectorsView.jsx`, `pb56_workstations/WorkstationsPanel.jsx`, `workstationsApi.js` (AEGIS Fleet, 30s Heartbeat, 2-Phase Sync Mode, Emergency Kill Switch).
  - `m2_knowledge_editor/`: `DocumentsView.jsx` (Explorer + Staff Upload to approval queue), `KnowledgeView.jsx` (Human-in-the-loop graph curation), `SopView.jsx` (SOP Wiki editor).
  - `m3_hybrid_copilot/`: `CopilotView.jsx` (Multi-turn chat, source citation badges & drawer, session pinning/sharing).
  - `m4_decision_support/`: `HomeView.jsx`, `ExecutiveView.jsx` (KPIs + on-screen Executive Briefing), `RiskView.jsx` (4 risk alert criteria), `ShiftReportEditor.jsx`, `DepartmentReportView.jsx`, `ReportsView.jsx`.
  - `m5_multifacet_search/`: `SearchView.jsx`, `KnowledgeExplorerView.jsx`, `GraphPanel.jsx` (D3-Force interactive graph), `VectorSearchPanel.jsx`.
  - `m6_admin_security/`: `AdminView.jsx`, `AdminLivePanels.jsx`, `GranularRbacMatrix.jsx` (2D permission grid), `PendingApprovalsPanel.jsx` (Approve/Reject uploaded documents).
- **Realtime & Auth Wiring (`frontend/src/services/api.js`, `hooks/useWatcherEvents.js`, `data/roles.js`):**
  - `api.js` attaches `Authorization: Bearer <jwt>` and intercepts `401 CONCURRENT_LOGIN_KICKED` to clear session storage and redirect to `LoginPage.jsx`.
  - `useWatcherEvents.js` subscribes to Backend Server-Sent Events (SSE) for realtime watcher/ingestion notifications (`RealtimeUploadTicker.jsx`, `WatcherToast.jsx`).
  - `roles.js` defines 5 roles (`it_admin, knowledge_mgr, executive, manager, standard` — note string mismatch `knowledge_mgr`/`manager`/`standard` vs backend `knowledge_manager`/`department_manager`/`standard_user`, `E2E-ISS-02`).

---

## 4. Data Layer Verification (`backend/app/db/` & `backend/alembic/`)

1. **PostgreSQL (`backend/app/db/postgres/`):**
   - Connection via `SQLAlchemy 2.x Async` (`create_async_engine`, `asyncpg`, `pool_pre_ping=True`) targeting native Host PostgreSQL (`host.docker.internal:5432`, DB `graph_mind`).
   - **13 Implemented MVP Tables** exist in code (12 SQLAlchemy ORM classes + 1 raw SQL table `user_active_sessions` in `session_service.py`), matching `Database Design Ver 1.1` §3.1.2 Tables 8–20 100%.
   - **21 Planned Extension Tables** (`Database Design Ver 1.1` §3.1.4–§3.1.8 Tables 22–42) do not exist in code and are properly marked `[PLANNED]` in `Database Design Ver 1.1` (except `shift_daily_summaries`, which `SRS Final` `FR57` treats as implemented, `E2E-ISS-09`).
   - **Schema Defects in Code (accurately documented in DBD Ver 1.1):** Broken Alembic revisions `0186c646946f` and `a93ce8369026`, runtime `CREATE TABLE IF NOT EXISTS` in 5 files, 5 missing physical `ForeignKey` declarations, 0 `CheckConstraint` declarations (`E2E-ISS-06`), redundant `index=True` on 4 PK columns, and `JSON` instead of `JSONB` on 3 tables (`E2E-ISS-21`).
2. **Neo4j (`backend/app/db/neo4j/client.py` & `semantic_layer.py`):**
   - `neo4j:5.18.0` container with APOC plugin (`:7474` HTTP, `:7687` Bolt).
   - `SCHEMA_REGISTRY` in `semantic_layer.py` defines the exact 10 node labels and 8 relationship types documented in `Database Design Ver 1.1` §3.2.
   - `Neo4jClient.search_nodes()` performs a full-graph property scan instead of using full-text indexes (`E2E-ISS-16`), and loaded nodes contain duplicate mixed-case properties (`TotalDue`/`totalDue`, `OrderDate` as `STRING`, `E2E-ISS-14`).
3. **Qdrant (`backend/app/db/qdrant/client.py`):**
   - `qdrant/qdrant:v1.8.2` container (`:6333` REST, `:6334` gRPC).
   - Embeds text in-process using `SentenceTransformer("all-MiniLM-L6-v2")` (**384 dimensions, Cosine distance**) into `cuad_contracts` and `adventureworks_entities`.
   - Enforces the **PR1 Layer-1 Server-Side Guard** (`must_not: [{"key": "is_active", "match": {"value": False}}]`) on all vector searches.
   - Only creates payload indexes on `contract_name` and `doc_id` (`client.py:143–144`), missing `department` and `is_active` (`E2E-ISS-16`).

---

## 5. Testing & Verification Matrix (`backend/app/tests/`)

The repository contains **24 pytest files** (`backend/app/tests/`) plus a fake database harness (`fake_neo4j.py`, `fake_qdrant.py`, `test_app_factory.py`). Below is the exact mapping of existing tests to requirements and database tables:

| Test File Path | Tested Feature / SRS Requirement | Tested Database Entities / Components | Verification Level |
|---|---|---|---|
| `backend/app/tests/fakes/test_app_factory.py` & `integration/test_app_factory_smoke.py` | Isolated Test Harness (`QAS-07`) | FastAPI app factory with `FakeNeo4jClient` & `FakeQdrantClient` | `CODE EXISTS` · `TEST EXISTS` |
| `backend/app/tests/test_concurrent_login.py` | Single Active Session (`FR59`, `US66`, `PB73`) | `users`, `user_active_sessions`, `session_service.py` (`401 CONCURRENT_LOGIN_KICKED`) | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_user_admin_api.py` | User Account & Role Admin (`FR5`, `US13`, `PB02`) | `users`, `audit_logs`, `user_admin_api.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_department_scope.py` | Department Data Scope Isolation (`FR3, FR58, BR-02, BR-04, BR-05`) | `knowledge_access_policies`, `core/rbac.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_document_approval.py`, `test_document_approval_suite.py`, `test_e2e_document_approval.py` | Staff Upload & Knowledge Admin Approval Queue (`FR53–FR54`, `US60–US61`, `PB67–PB68`) | `knowledge_upload_approvals`, `document_approval_router.py`, `pipeline.py` trigger | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/unit/test_pb56_workstations.py` | AEGIS Workstation Fleet, Heartbeat, 2-Phase ACK & Kill Switch (`FR14, FR62`, `US41, US69`, `PB56, PB76`) | `pb56_workstations`, `pb56_workstation_sync_logs`, `pb56_sync_mode_audit_logs` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/unit/test_safety_guard.py` | Read-Only Cypher Guard (`FR61`, `US68`, `PB75`) | `text_to_cypher.py` (`FORBIDDEN_KEYWORDS` mutation blocking) | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_department_report.py` | Shift Handover Reports & Consolidation (`FR55–FR57`, `US62–US64`, `PB69–PB71`) | `shift_reports`, `api/v1/shift_reports.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_sop_api.py` | SOP Wiki Authoring & Publishing (`FR26`, `US38`, `PB53`) | `sop_documents`, `api/v1/sop.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_copilot_postgres.py`, `test_copilot_pin_session.py`, `test_copilot_greeting_and_role.py` | AI Copilot Sessions, Pinning & Role Scoping (`FR27, FR39`, `US02, US37`, `PB27, PB59`) | `copilot_sessions`, `api/v1/copilot.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_nl2cypher_golden_suite.py`, `test_customer_cypher_and_confidence.py` | Single-Hop, 2-Hop & Cross-Source NL2Cypher (`FR28–FR31`, `US03–US05, US28`) | `nl2cypher_engine.py`, `semantic_layer.py`, `context_fusion.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| `backend/app/tests/test_document_understanding.py`, `unit/test_adaptive_document_inspection.py`, `unit/test_document_duplicate.py`, `unit/test_document_visual_preview.py`, `unit/test_excel_grounding.py`, `unit/test_pr1_doc_identity.py`, `unit/test_pr1_txt_parser.py` | Ingestion Parsing, SHA-256 Deduplication (`BR-06`), UUIDv5 Identity, Excel Grounding & Visual File Preview (`FR17, FR20, FR22, FR23`) | `m1_data_sync/pipeline.py`, `qdrant/client.py` | `CODE EXISTS` · `INTEGRATED` · `TEST EXISTS` |
| **Missing in Repo:** Locust Load Testing (`locustfile.py`) | Performance Load Test up to 150 VUs (`NFR-01`, `QAS-01`, `WBS 23b`) | Read endpoints (`p95 < 500 ms`) & Heavy retrieval (`p95 < 2000 ms`) | **`NOT VERIFIED` (No `locustfile.py` in repo `E2E-ISS-17`)** |
