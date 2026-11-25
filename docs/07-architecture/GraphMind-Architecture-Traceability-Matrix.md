# GRAPHMIND — ARCHITECTURE REQUIREMENT TRACEABILITY MATRIX (7-WAY RTM)

> **Chuỗi truy vết 7 chiều:**  
> **Proposal Ver 1.2 → User Story Ver 1.2 → Product Backlog Ver 1.2 → SRS Ver 1.2 → Architecture Ver 1.0 → Database Design Ver 1.1 → Source Code Evidence**

| STT | SRS Req. ID | US ID | PBI ID | Architecture Component (SAD Ver 1.0) | Database Component (DBD Ver 1.1) | Source Code Evidence | Status |
|:---:|:---:|:---:|:---:|---|---|---|---|
| 1 | FR01, FR05 | US01, US13 | PB01, PB02 | `m6_admin_security` *(sai hash PBKDF2)* | `users`, `core/departments.py` | `api/v1/auth.py`, `m6_admin_security/user_admin_api.py`, `core/security.py` (`bcrypt`) | `IMPLEMENTATION MISMATCH` |
| 2 | FR03, FR58 | US65 | PB72 | `m6_admin_security` *(chưa mô tả 2D Matrix)* | `knowledge_access_policies` | `m6_admin_security/rbac_matrix_{router,service,model}.py`, `views/m6_admin_security/GranularRbacMatrix.jsx` | `PARTIALLY COVERED` |
| 3 | FR59 | US66 | PB73 | **Thiếu trong SAD** | `user_active_sessions` | `m6_admin_security/session_service.py`, `main.py:220` (`ConcurrentLoginException`), `api.js:8` | `MISSING COMPONENT` |
| 4 | FR02, FR60 | US67 | PB74 | SMTP Gateway *(chưa mô tả luồng OTP 3 bước)* | `password_reset_otps` | `m6_admin_security/{forgot_password_router,otp_service}.py`, `ForgotPasswordPage.jsx` | `PARTIALLY COVERED` |
| 5 | FR04, FR06, BR-03 | US17 | PB03 | `m6_admin_security` | `audit_logs` | `m6_admin_security/audit_service.py`, `models/audit_log.py` | `FULLY COVERED` |
| 6 | FR07, FR13–16 | US08, US41, US48–49 | PB05, PB48–49, PB56 | `aegis_file_watcher`, `m1_data_sync` *(sai connector Direct Python)* | `pb56_workstations`, `pb56_workstation_sync_logs` | `aegis-agent/src/{watcher,pb56_agent_sync,sync_client}.py`, `m1_data_sync/{webhook,pb56_workstation_service}.py` | `IMPLEMENTATION MISMATCH` |
| 7 | FR62 | US69 | PB76 | **Thiếu trong SAD** | `pb56_workstations`, `pb56_sync_mode_audit_logs` | `api/v1/pb56_workstations.py`, `m1_data_sync/pb56_workstation_service.py`, `WorkstationsPanel.jsx` | `MISSING COMPONENT` |
| 8 | FR53, FR54, BR-06 | US60, US61 | PB67, PB68 | **Thiếu trong SAD** | `knowledge_upload_approvals`, Neo4j `:Document`, Qdrant `cuad_contracts` | `m6_admin_security/document_approval_{router,model}.py`, `PendingApprovalsPanel.jsx` | `MISSING COMPONENT` |
| 9 | FR17–22 | US24–25, US27, US45 | PB07–12, PB46–47 | `m1_data_sync`, `neo4j_db`, `qdrant_db` *(sai 768-dim & MD5)* | Neo4j 10 labels + Qdrant `cuad_contracts`, `adventureworks_entities` (384-dim) | `m1_data_sync/pipeline.py`, `scripts/ingest_*.py`, `db/qdrant/client.py` | `IMPLEMENTATION MISMATCH` |
| 10 | FR23–25 | US29–30, US42 | PB41, PB50, PB54 | `m2_knowledge_editor` *(rỗng 0 dòng trong Code!)* | Neo4j (`:Document`, `:Clause`, `:Company`...) | Inline routes trong `backend/app/main.py` (37 routes), `views/m2_knowledge_editor/{DocumentsView,KnowledgeView}.jsx` | `IMPLEMENTATION MISMATCH` |
| 11 | FR26 | US38 | PB53 | `m2_knowledge_editor` *(rỗng 0 dòng)* | `sop_documents` | `backend/app/api/v1/sop.py` (736 dòng), `views/m2_knowledge_editor/SopView.jsx` | `IMPLEMENTATION MISMATCH` |
| 12 | FR27–33, FR35–39 | US02–07, US28, US37, US46–50 | PB15–28, PB51, PB55, PB59 | `m3_hybrid_copilot`, Host Ollama | `copilot_sessions`, Neo4j, Qdrant | `api/v1/copilot.py`, `m3_hybrid_copilot/{query_engine/*, inference/client.py}`, `CopilotView.jsx` | `FULLY COVERED` |
| 13 | FR61 | US68 | PB75 | **Thiếu trong SAD** | Neo4j (Read-Only Guard) + `audit_logs` | `m3_hybrid_copilot/query_engine/text_to_cypher.py` (`FORBIDDEN_KEYWORDS`) | `MISSING COMPONENT` |
| 14 | FR34 | US12 | PB30 | `graphmind_frontend` *(ghi lẫn Next.js & Vite 5173:5173)* | — | `frontend/package.json` (React 18 + Vite JSX), `frontend/Dockerfile` (Nginx `5173:80`) | `IMPLEMENTATION MISMATCH` |
| 15 | FR40–42, FR44 | US10, US33–35 | PB40, PB57–58, PB65 | `m4_decision_support` *(rỗng 0 dòng trong Code!)* | Neo4j aggregate queries (no PDF/DOCX export) | `backend/app/api/v1/dashboard.py` (1.117 dòng), `views/m4_decision_support/{ExecutiveView,RiskView,ReportsView}.jsx` | `IMPLEMENTATION MISMATCH` |
| 16 | FR55, FR56, FR57 | US62, US63, US64 | PB69, PB70, PB71 | **Thiếu trong SAD** | `shift_reports`, `shift_daily_summaries` [Planned] | `backend/app/api/v1/shift_reports.py`, `models/shift_report.py`, `views/m4_decision_support/{ShiftReportEditor,DepartmentReportView}.jsx` | `MISSING COMPONENT` |
| 17 | FR45, FR46 | US20, US36 | PB52 | `m5_multifacet_search` *(rỗng 0 dòng trong Code!)* | Neo4j + Qdrant | Inline search routes trong `backend/app/main.py`, `views/m5_multifacet_search/{SearchView,KnowledgeExplorerView,GraphPanel,VectorSearchPanel}.jsx` | `IMPLEMENTATION MISMATCH` |
| 18 | FR47–52 | US51–56 | PB32–38, PB60 | Mentioned in §2.1 / §5.2 | 100 Ground-Truth benchmark, 509 ChatML pairs | `scripts/audit_hybrid_rag.py`, `scripts/test_adventureworks_hybrid_rag.py` | `PARTIALLY COVERED` |
| 19 | FR04, FR19 [Optional] | US09 | PB06 | Mentioned in §4.4 Data Flow | `data_connectors` [Planned] | `m1_data_sync/google_connector.py` (419 dòng) | `PARTIALLY COVERED` |
| 20 | FR12 [Optional] | US44 | PB66 | Not specified | `llm_cost_usage_logs` [Planned] | Fallback mock `LLMOPS_METRICS` (`db/mock_knowledge_db.py`) | `OUTDATED` |
