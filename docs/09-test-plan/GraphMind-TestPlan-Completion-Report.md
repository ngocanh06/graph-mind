# GraphMind — Software Test Plan Completion and QA Audit Report (`GraphMind-TestPlan-Completion-Report.md`)

- **Project Title:** GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support (**GraphMind**)
- **Team:** C1SE18 (`Tran Thi Ngoc Anh`, `Huynh Ngoc Minh`, `Ha Hoang Anh`, `Tran Viet Anh Vu`, `Phan Anh Bao`) — **Mentor:** `PhD. Tran Kim Sanh`
- **Audit & Generation Date:** `23 November 2026`
- **Generated Deliverables:**
  1. **Master Software Test Plan Document (DOCX):** [C1SE18_TestPlan_GraphMind_Ver1.0.docx](file:///d:/CAPSTONE1/graph-mind/C1SE18_TestPlan_GraphMind_Ver1.0.docx) (also saved to [final_document/C1SE18_TestPlan_GraphMind_Ver1.0.docx](file:///d:/CAPSTONE1/graph-mind/final_document/C1SE18_TestPlan_GraphMind_Ver1.0.docx))
  2. **Test Scope & Module Inventory:** [GraphMind-TestScope-Module-Inventory.md](file:///d:/CAPSTONE1/graph-mind/GraphMind-TestScope-Module-Inventory.md)
  3. **Requirement Traceability Matrix (RTM):** [GraphMind-TestPlan-Traceability-Matrix.md](file:///d:/CAPSTONE1/graph-mind/GraphMind-TestPlan-Traceability-Matrix.md)
  4. **Test Plan Completion Report:** [GraphMind-TestPlan-Completion-Report.md](file:///d:/CAPSTONE1/graph-mind/GraphMind-TestPlan-Completion-Report.md)

---

## 1. Completed Scope and Verification Summary

1. **Template Preservation & Customization (`C2SE.27_TEST PLAN_SmartMealVN_ver1.1 (1).docx` -> `C1SE18_TestPlan_GraphMind_Ver1.0.docx`):**
   - Preserved 100% of the template's chapter and section structure (`1. Introduction` -> `1.1 Purpose`, `1.2 Scope`, `1.3 Out of Scope`, `1.4 Document Terminology and Acronyms`, `1.5 References`; `2. Target Test Areas`; `3. Test Specification` -> `3.1 Features to be Tested`, `3.2 Feature not to be Tested`, `3.3 Test Deliverables`, plus `3.4 Requirement Traceability Matrix (RTM)`; `4. Test Schedule`; `5. Test Cycle Entry and Exit Criteria` -> `5.1 Entry Criteria`, `5.2 Exit Criteria`; `6. Environment Needs` -> `6.1 Hardware and Software`, `6.2 Productivity and Support Tools`, plus `6.3 Test Environment Configuration and Setup Procedure`; `7. Roles and Responsibilities`, plus `7.1 Testing Risks and Mitigation Strategy`).
   - Preserved all template styles (`Heading1`, `Heading2`, `Heading3`, `Table1`–`Table8`), page margins, headers (`Capstone 1 - 2026 Test Plan Document`), footers (`Page | X`), cover page layout, `DOCUMENT NAME` metadata table, `REVISION HISTORY` table, and automatic `TABLE OF CONTENTS` / `LIST OF TABLES` SDT fields.
   - Removed all legacy `SmartMealVN` text, member names (`Huy, Tai, Khanh, Hieu, Phuong`), mentor name (`PhD. Vu, Truong Tien`), and embedded signature image (`image2.png`), replacing them with confirmed **GraphMind (`C1SE18`)** metadata (`Tran Thi Ngoc Anh, Huynh Ngoc Minh, Ha Hoang Anh, Tran Viet Anh Vu, Phan Anh Bao`; Mentor: `PhD. Tran Kim Sanh`).

2. **Direct Source Code & Automated Test Execution Audit (Phase 1):**
   - Directly inspected all `129` backend files (`backend/`), `76` frontend files (`frontend/`), `8` AEGIS local agent files (`aegis-agent/`), `74` FastAPI route registrations (`37` inline in `backend/app/main.py` + `37` across modular routers), `13` implemented PostgreSQL MVP tables, `10` Neo4j node labels (`56,119+` nodes) / `8` relationship types, `2` Qdrant `384-dim` Cosine collections (`SentenceTransformer("all-MiniLM-L6-v2")`), and `26` test scripts (`23` pytest files in `backend/app/tests/`, `1` agent unittest in `aegis-agent/src/test_pb56_agent_sync.py`, `1` sync script in `tests/test_sync_check.py`, and `2` Locust scripts in `perf-tests/locustfile.py` and `backend/app/tests/load/locustfile.py`).
   - Executed the offline unit and integration test suite via `python -m pytest -o addopts="" backend/app/tests/unit backend/app/tests/integration -v`:
     - **Total Collected:** `132` test cases
     - **Passed:** `124` test cases (`93.9%` pass rate across unit & smoke suites)
     - **Failed:** `2` unit test assertions in `backend/app/tests/unit/test_pr1_doc_identity.py` (`test_ut83_citation_excludes_evidence_filtered_from_prompt` where `len(res["used_chunks"])` returned `4` instead of `5` under offline fallback; and `test_ut85_serving_eligibility_cypher_python_exact_parity` where `CYPHER_SERVING_ELIGIBILITY_FILTER` expanded its allowed status list to `['SYNCED', 'Hoạt động (Synced)', 'active', 'INDEXED']`).
     - **Errored at Setup:** `6` DB-dependent tests in `backend/app/tests/unit/test_pb56_workstations.py` due to local Host PostgreSQL `asyncpg.exceptions.InvalidPasswordError: password authentication failed for user "postgres"` when connecting to `localhost:5432`.

---

## 2. Information Lacking Data (`TBD` / `NEEDS CONFIRMATION`)

In strict adherence to Strict Rules #7, #8, #9, #10, and #19 (*"Nếu thiếu dữ liệu phải ghi TBD hoặc NEEDS CONFIRMATION"*), the following items are explicitly marked `TBD` or `NEEDS CONFIRMATION` rather than fabricated:

1. **Task-Level Person-Hour Durations in Section 4 (`Table 3: Test Schedule`):**
   - `Project Plan Document Ver 1.2` (§3.3 P141 & §5.2 P183) explicitly states: *"no critical path is computed because task durations and effort are not yet estimated... Effort estimates (person-hours/days) per work package have not been defined yet and are marked TBD."*
   - Therefore, `Table 3: Test Schedule` uses the exact confirmed Sprint start/finish dates (`Sprint 1: 01/09 – 22/09/2026`, `Sprint 2: 22/09 – 20/10/2026`, `Sprint 3: 20/10 – 10/11/2026`, `Sprint 4: 10/11 – 01/12/2026`) and confirmed member assignments from `Project Plan Ver 1.2`, while marking individual sub-task hour durations as `TBD` (with reference Story Points where applicable).
2. **Pending Jira Issue IDs for Version 1.2 Backlog Additions & Research Items:**
   - As noted in `Project Plan Ver 1.2` (§3.2 P137) and `Product Backlog Ver 1.2` (§5), items added in Version 1.2 (`PB67–PB76` / `US60–US69`) and several research/evaluation items (`PB16–PB19`, `PB29–PB39`, `PB47`, `PB52`, `PB53`, `PB55`, `PB57–PB61`, `PB65`, `PB66`) are marked `"Jira ID pending (to be created at Sprint 4 Planning, C1SE18-68)"`.
3. **Live 150-VU Locust SLA Execution Results (`WBS 23b` / `NFR-01`):**
   - While both Locust load test scripts (`perf-tests/locustfile.py` and `backend/app/tests/load/locustfile.py`) exist in the repository, a verified `summary.json` / `report.html` from a live 150-Virtual-User run against the full multi-database + GPU Ollama stack is not yet present in the repository and is marked **`NOT VERIFIED (Scheduled for Sprint 4 Closure)`**.
4. **HTTPS/TLS Termination Certificate Configuration (`FR7` / `E2E-ISS-07`):**
   - `docker-compose.yml` communicates over the local Docker bridge network `graphmind-net` via plain HTTP (`http://backend:5000`). Production reverse-proxy TLS termination (Nginx/Traefik TLS certificates) is marked **`NEEDS CONFIRMATION`**.

---

## 3. Explicit Assumptions Used in the Test Plan

1. **Authoritative Schema & Endpoint Oracle:** Where `C1SE18_SRS_GraphMind_Final.docx` (§4.5 API Summary and §4.6 Data Requirements) conflicts with `Database Design Document Ver 1.1`, `Architecture Document Ver 1.1`, and the actual Python/React source code (audit finding `E2E-ISS-01`), **the actual Source Code and `Database Design Ver 1.1` / `Architecture Ver 1.1` are treated as the authoritative technical test oracle** (`13` PostgreSQL MVP tables, `10` Neo4j labels, `2` Qdrant `384-dim` collections, and HTTP REST 30s heartbeats for PB56).
2. **Corrected Traceability Linkages:** Where `C1SE18_SRS_GraphMind_Final.docx` Appendix B (`Table T53` and `Table T54`) contains 13 typographical `US`/`PB` mapping errors (`E2E-ISS-03`), the RTM (`Table 3K` and `GraphMind-TestPlan-Traceability-Matrix.md`) maps each `FR` to its verified `User Story Ver 1.2` and `Product Backlog Ver 1.2` ID while noting the SRS Appendix B typo in parentheses.
3. **Proposed Quantitative Exit Thresholds:** Where the project documents specify qualitative exit criteria (*"End-to-End Test passed and all Blocker/Critical bugs fixed"* in `Project Plan Ver 1.2` Table T15), the quantitative pass-rate threshold ($\ge 95\%$ overall test case pass rate and $100\%$ security/RBAC test pass rate) is explicitly labeled **`[Proposed QA Threshold Criteria]`** in Section 5.2.

---

## 4. Modules and Features Not Ready or Conditionally Ready for Testing

| Module / Component | Readiness Classification | Root Cause / Blocker in Source Code | Required Action Before Full Execution |
|---|---|---|---|
| **21 Planned PostgreSQL Tables (`Tables 22–42`), 2 Neo4j Labels (`:Vendor, :SOP_Document`), 1 Qdrant Collection (`sop_knowledge_base`)** | **Not Eligible for Runtime Testing (`NOT IMPLEMENTED / [PLANNED]`)** | Target architecture extensions documented as `[PLANNED]` in `Database Design Ver 1.1` (§3.1.4–3.1.8). No SQLAlchemy models or migrations exist in `backend/app/db/postgres/models/`. | Excluded from MVP runtime DB testing (Section 1.3 & Section 3.2). Note: If `shift_daily_summaries` persistence (`FR57` / `E2E-ISS-09`) is required for acceptance, an ORM model must be added. |
| **Live PostgreSQL Integration Pytest Suites (`test_pb56_workstations.py`, `test_concurrent_login.py`, `test_user_admin_api.py`, `test_department_scope.py`, `test_department_report.py`, `test_sop_api.py`, `test_copilot_postgres.py`)** | **Conditionally Ready (`Requires Live Host PG Credential Alignment & Flag`)** | Local Host PostgreSQL (`localhost:5432`) rejected the default `POSTGRES_PASSWORD=12345678` in `config.py` during offline pytest execution (`InvalidPasswordError`), and `PB56_WORKSTATIONS_ENABLED` defaults to `False`. | Align `POSTGRES_PASSWORD` in `.env` with the active local PostgreSQL service, run `create_all_tables()` + `pb56_workstations_migration.sql`, and set `PB56_WORKSTATIONS_ENABLED=true`. |
| **Self-Service Email OTP Delivery (`FE02` / `FR60` / `US67` / `PB74`)** | **Conditionally Ready (`Requires SMTP Credentials or Mock`)** | `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` in `backend/app/core/config.py` default to empty strings `""`. Furthermore, `otp.py` uses unsalted `SHA-256` (`E2E-ISS-05`). | Configure a test SMTP sandbox (e.g., Mailtrap / Gmail App Password) in `.env` or mock `aiosmtplib.send` in automated pytest runs. |
| **Google Drive / Google Sheets OAuth 2.0 Connector (`FE09` / `FR4, FR19` / `US09` / `PB06`)** | **Optional Stretch Goal (`Local Mock/Contract Ready Only`)** | `PB06` is outside the 4 committed Sprints. Live Google Cloud OAuth requires external OAuth client credentials. | Test local API endpoints (`google_connector.py`) and UI view (`ConnectorsView.jsx`) only; exclude live Google Cloud tenant sync. |
| **Backend Package Stubs (`m2_knowledge_editor`, `m4_decision_support`, `m5_multifacet_search` — `E2E-ISS-12`)** | **Ready via `main.py` & `api/v1/` (`Modular Packaging Gap`)** | All 3 package directories contain only a 0-byte `__init__.py`; their active routes and business logic are implemented inline in `backend/app/main.py` (`3,306 LOC`), `api/v1/dashboard.py`, `api/v1/shift_reports.py`, and `api/v1/sop.py`. | Test functional behavior through the active HTTP endpoints in `main.py` and `api/v1/*` (Table 3D). |

---

## 5. Testing Tools Verification Status

| Tool Name | Verification Status in Environment | Evidence |
|---|---|---|
| **`pytest` (`v9.1.1`) & `pytest-asyncio` (`v1.4.0`)** | **CONFIRMED & EXECUTED** | Executed `132` unit/integration tests directly in workspace (`124` passed, `2` failed, `6` setup errors). |
| **`FakeNeo4jClient` & `FakeQdrantClient` Harness** | **CONFIRMED & EXECUTED** | Verified passing in `test_safety_guard.py` (`7/7` passed) and `test_app_factory_smoke.py` (`3/3` passed). |
| **`pytest-socket` (`>=0.7.0`)** | **DECLARED IN `requirements-dev.txt` / NOT INSTALLED IN GLOBAL PYTHON 3.14** | `pytest.ini` specifies `--allow-hosts=127.0.0.1 --allow-unix-socket`, which requires `pip install -r requirements-dev.txt` in the active virtualenv (or running with `-o addopts=""`). |
| **`Locust` (`perf-tests/locustfile.py` & `backend/app/tests/load/locustfile.py`)** | **SCRIPTS CONFIRMED IN REPO / 150-VU RUN PENDING** | Both 4-stage 150-VU load test scripts are verified in the repository; live load test execution requires the full Docker + GPU stack running. |
| **Jira Board `C1SE18` & GitHub Repository** | **CONFIRMED IN PROJECT PLAN VER 1.2** | Confirmed across `Project Plan Ver 1.2` (`C1SE18-6` to `C1SE18-74`) and local `.git` repository. |

---

## 6. DOCX Schema and Formatting Validation Results (Phase 15)

1. **OpenXML / XSD Schema Validation (`validate.py`):**
   - Executed `python .agents/skills/docx/scripts/office/validate.py C1SE18_TestPlan_GraphMind_Ver1.0.docx --original "C2SE.27_TEST PLAN_SmartMealVN_ver1.1 (1).docx"`.
   - After preserving `word/settings.xml` in its exact schema-compliant element order, `validate.py` passed with **0 new XML schema validation errors**.
2. **Structural & Visual Layout Audit:**
   - Verified all `17` tables in `C1SE18_TestPlan_GraphMind_Ver1.0.docx` (`DOCUMENT NAME`, `REVISION HISTORY`, `Table 1`, `Table 2`, `Table 3A`–`Table 3K`, `Table 3`, `Table 4`, `Table 5`, `Table 6`, `Table 7`) use explicit fixed column grids (`w:tblLayout w:type="fixed"`) summing to `9,330–9,375 DXA` (matching the template's exact printable page width), `<w:cantSplit w:val="1"/>` on rows, and `<w:tblHeader w:val="1"/>` on repeating header rows so tables never overflow page margins or split mid-row across page breaks.
   - Verified `0` remaining occurrences of `SmartMealVN`, `C2SE.27`, `CMU-IS 451`, `PhD. Vu, Truong Tien`, `Phan Nhu Huy`, `Le Anh Tai`, `Nguyen Quoc Khanh`, `Le Trung Hieu`, `Nguyen Duy Phuong`, or unreplaced template placeholders across `word/document.xml`, `word/header1.xml`, `word/header2.xml`, `word/header3.xml`, and `word/footer1.xml`.
