# GRAPHMIND — ARCHITECTURE AUDIT REPORT (VER 1.0)
## ĐÁNH GIÁ TOÀN DIỆN TÀI LIỆU ARCHITECTURE DESIGN DOCUMENT ĐỐI CHIẾU VỚI SRS VER 1.2, DATABASE DESIGN VER 1.1 VÀ SOURCE CODE THỰC TẾ

> **Dự án:** GraphMind — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support (Capstone Project 1 — C1SE.18)  
> **Tài liệu được kiểm toán:** `7.C1SE18_Architecture-Document-ver1.0.docx` (Date: 18/12/2026, 222 paragraphs, 14 tables, 6 images)  
> **Nguồn đối chiếu:**  
> 1. `docs/05-srs/C1SE18_SRS_GraphMind_Ver1.2.docx` (62 FRs, 27 Use Cases, BR-01–BR-06)  
> 2. `docs/06-database-design/C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (13 bảng PostgreSQL Implemented, 10 nhãn Neo4j, 2 collection Qdrant 384-dim)  
> 3. `docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx`, `C1SE18_UserStory_GraphMind-Ver1.2.docx`, `C1SE18_ProductBacklog_GraphMind_Ver1.2.docx`, `C1SE18_ProjectPlan_GraphMind-Ver1.2.docx`  
> 4. **Toàn bộ Source Code thực tế:** `backend/`, `frontend/`, `aegis-agent/`, `docker-compose.yml`, `Dockerfiles`  
> **Ngày thực hiện kiểm toán:** 23/11/2026  
> **Nguyên tắc kiểm toán:** Chỉ kiểm toán và lập báo cáo; **không chỉnh sửa Architecture Document gốc, không chỉnh sửa Source Code, không vẽ hình ảnh sơ đồ mới** (sử dụng `[DIAGRAM PLACEHOLDER: ...]`).

---

## 1. Executive Summary

### 1.1. Đánh giá Tổng quan Architecture Document Ver 1.0
Tài liệu `7.C1SE18_Architecture-Document-ver1.0.docx` có cấu trúc khung kiến trúc phần mềm tốt theo chuẩn SEI/IEEE (Problem Statement, Architecture Drivers, Quality Attribute Scenarios, Utility Tree, C&C View, Module View, Allocation/Deployment View, Data Flow, Constraints).

Tuy nhiên, đối chiếu trực tiếp với **Source Code thực tế**, **SRS Ver 1.2** và **Database Design Ver 1.1** cho thấy tài liệu đang chứa **nhiều sai lệch nghiêm trọng về thực tế triển khai, mâu thuẫn nội tại và thiếu sót các thành phần kiến trúc cốt lõi**.

### 1.2. Bảng Đánh giá Chất lượng Kiến trúc & Điểm số Chuẩn hóa (Section 16)

| Category | Trạng thái | Trọng số | Điểm (/100) | Quy đổi | Nhận xét cốt lõi |
|---|:---:|:---:|:---:|:---:|---|
| **Completeness** | `NEEDS IMPROVEMENT` | 15% | 55 | 8.25 | Bỏ sót hoàn toàn **PostgreSQL** khỏi C&C View & Deployment View; thiếu luồng Document Approval (FR53–54), Shift Handover (FR55–57), Single Session JTI (FR59), Email OTP (FR60), Cypher Guard (FR61), Kill Switch (FR62), PR1 Crash Recovery. |
| **Correctness** | `POOR` | 15% | 42 | 6.30 | Sai 3/6 backend modules (`m2`, `m4`, `m5` rỗng 0 dòng); sai embedding (`768-dim nomic-embed-text` vs `384-dim all-MiniLM-L6-v2`); sai hash (`PBKDF2` vs `bcrypt`, `MD5` vs `SHA-256`); sai Frontend (`Next.js/TypeScript` vs `Vite React JSX`). |
| **Consistency** | `INCONSISTENT` | 10% | 48 | 4.80 | Tự mâu thuẫn nội tại: §5.2 dòng 293 ghi "Backend hosted on cloud", ngay dòng 294 ghi "No component hosted on public cloud"; §4.4 ghi `React/Next.js` còn Table 6.3 ghi `Vite React SPA`; QAS-01 ghi `< 6.0s` (20 sessions) còn Utility Tree ghi `< 20s` (5 sessions). |
| **Traceability** | `NEEDS IMPROVEMENT` | 10% | 52 | 5.20 | Bảng References (Table 3) chỉ ghi 2 mục (`Project Proposal`, `Project Plan`), thiếu SRS Ver 1.2 và Database Design Ver 1.1; không truy vết tới FR53–FR62. |
| **Modularity & SoC** | `POOR` | 10% | 45 | 4.50 | Thực tế backend không tách sạch 6 module như Table 6.2: `main.py` là God File 3.306 dòng chứa 37 endpoint trực tiếp; `nl2cypher_engine.py` dài 4.233 dòng; `copilot.py` dài 2.363 dòng. |
| **Low Coupling / High Cohesion** | `NEEDS IMPROVEMENT` | 10% | 50 | 5.00 | `main.py` ghép chặt hầu hết các router/service (mount lặp `/api/v1` và `/api`, thậm chí mount trùng 2 lần `file_watcher_router` và `google_connector_router`); thiếu Repository layer thống nhất. |
| **Security Architecture** | `NEEDS IMPROVEMENT` | 10% | 54 | 5.40 | Không mô tả Single Session JTI, Cypher Guard AST, Email OTP, PR1 Layer-1 Qdrant Guard; Code có lỗi `CORS allow_origins=["*"]` kèm `allow_credentials=True` (`main.py:232–239`); vẫn giữ 3 vai trò cũ (vi phạm BR-04). |
| **Scalability & Deployment** | `INCONSISTENT` | 10% | 55 | 5.50 | Table 6.3 thiếu PostgreSQL, sai image versions (`neo4j:5.26` vs `5.18.0`, `qdrant:v1.12.1` vs `v1.8.2`), sai port frontend (`5173:5173` vs Nginx `5173:80`), thiếu `API_BASE` env config (`localhost:5000` hardcode ở `api.js:6`). |
| **Implementation Alignment** | `POOR` | 10% | 46 | 4.60 | Độ lệch giữa mô tả kiến trúc và thực tế triển khai cao ở cả Backend, Frontend, Data Layer và Deployment. |
| **TỔNG ĐIỂM KIỂM TOÁN** | — | **100%** | — | **49.55 / 100** | **Xếp loại: D- (Cần cập nhật toàn diện lên Ver 1.1)** |

### 1.3. Năm Vấn đề Nghiêm trọng Nhất
1. **Bỏ sót hoàn toàn PostgreSQL (System of Record) khỏi C&C View (Table 6.1) và Deployment View (Table 6.3):** Trong khi PostgreSQL lưu toàn bộ 13 bảng vận hành (`users`, `audit_logs`, `knowledge_access_policies`, `shift_reports`, `copilot_sessions`, `pb56_workstations`...), SAD Ver 1.0 chỉ nhắc tên 1 lần duy nhất ở CON-01!
2. **Module View (Table 6.2) mô tả sai cấu trúc Backend thực tế:** 3/6 thư mục module (`m2_knowledge_editor`, `m4_decision_support`, `m5_multifacet_search`) **hoàn toàn rỗng (0 dòng code)**. Chức năng thực tế bị dồn vào God File `backend/app/main.py` (3.306 dòng, 37 endpoint inline) và `backend/app/api/v1/{dashboard.py, sop.py, copilot.py}`.
3. **Mâu thuẫn nghiêm trọng về Data & AI Stack:** SAD ghi `nomic-embed-text` (**768-dim** qua Ollama), `MD5` dedup, `PBKDF2` password hash; thực tế Source Code & Database Design Ver 1.1 dùng `SentenceTransformer("all-MiniLM-L6-v2")` (**384-dim**), **`SHA-256`**, và **`bcrypt`**.
4. **Mâu thuẫn nội tại về Deployment & Frontend:** §5.2 tự mâu thuẫn giữa "Backend hosted on cloud" (dòng 293) và "No component hosted on public cloud" (dòng 294); Frontend thực tế là **React 18 + Vite JSX** build tĩnh chạy qua **Nginx (`5173:80`)**, không phải Next.js, không phải TypeScript, và không có Tailwind CSS trong `package.json`.
5. **Thiếu toàn bộ kiến trúc cho 10 tính năng mới (FR53–FR62) và các cơ chế bảo mật/phục hồi thực tế:** Không mô tả Document Approval Pipeline, Shift Handover & Ollama Consolidation Fallback, Dynamic 2D RBAC Matrix, Single Active Session JTI, Email OTP, Read-Only Cypher Guard, AEGIS Emergency Kill Switch, và PR1 Crash Recovery Reconciliation (`reconcile_crashed_operations`).

---

## 2. Architecture Document Structure Assessment

| Mục Chuẩn (Section 4 Checklist) | Trạng thái trong SAD Ver 1.0 | Đánh giá chi tiết |
|---|:---:|---|
| 4.1. Introduction & References | `PARTIALLY COVERED` | Có Purpose, Definitions, Acronyms; **nhưng** Table 3 References thiếu SRS Ver 1.2 và Database Design Ver 1.1; dòng 21/25 còn sót tiếng Việt (`ThS.`, `Chữ ký`) và toàn bộ mục References cuối tài liệu bị dịch máy sang tiếng Việt! |
| 4.2. Architectural Context | `INCONSISTENT` | Có Figure 1 & Table 4, nhưng chỉ liệt kê 3 Human Actors (thiếu tách `System & IT Admin` vs `Knowledge Admin` theo BR-04, thiếu `Department Manager`). |
| 4.3. Architectural Drivers | `OUTDATED` | Có 5 Functional Drivers (FD-01..FD-05), QAS-01..05, Utility Tree, CON-01..03; **nhưng** CON-03 bị copy-paste nhầm nội dung Security test của QAS-03 thay vì Technology Stack Standards! |
| 4.4. Architecture Overview & Pattern | `INCONSISTENT` | Tuyên bố "clean modular monolith" (Table 6.2) nhưng sai thực tế backend; không mô tả Layered Architecture nội bộ (API → Service → DB Client). |
| 4.5. Component Architecture | `PARTIALLY COVERED` | Table 6.1 thiếu PostgreSQL, thiếu Shift Handover Engine, thiếu Approval Queue, thiếu Cypher Guard. |
| 4.6. Data Architecture | `POOR` | Thiếu PostgreSQL ở C&C/Deployment; sai số chiều vector (768 vs 384); không có Data Access Layer (SQLAlchemy Async, Neo4j Driver, Qdrant Client). |
| 4.7. Interface & API Architecture | `MISSING` | Không có mục đặc tả REST API prefixes, SSE realtime stream (`useWatcherEvents.js`), Agent Webhook/Heartbeat/2-phase ACK, Error Handling chuẩn. |
| 4.8. Security Architecture | `NEEDS IMPROVEMENT` | Thiếu luồng JWT + JTI Single Session, Dynamic RBAC Matrix, Email OTP 3-step, Cypher Guard, Qdrant Layer-1 Guard; sai thuật toán hash (`PBKDF2`). |
| 4.9. Deployment Architecture | `INCONSISTENT` | Table 6.3 sai image versions, sai frontend port (`5173:5173` vs `5173:80` Nginx), bỏ sót PostgreSQL host, và tự mâu thuẫn Cloud vs On-premise ở §5.2. |
| 4.10. Quality Attributes | `INCONSISTENT` | Có QAS-01..05 và Utility Tree nhưng **tự mâu thuẫn chỉ số**: QAS-01 ghi `< 6.0s` dưới 20 sessions, còn Utility Tree ghi `< 20s` dưới 5 sessions; QAS-04 ghi reconnect `< 10s`, còn Utility Tree ghi `60s`. |

---

## 3. Source Code Architecture Analysis

### 3.1. Technology Stack Thực tế (`IMPLEMENTED` — Verified from `package.json`, `requirements.txt`, `Dockerfiles`, `docker-compose.yml`)
- **Frontend (`frontend/package.json`, `frontend/Dockerfile`):**
  - **Language:** JavaScript (JSX/ES Modules — **không có TypeScript**).
  - **Framework & Build:** React `^18.3.1`, Vite `^5.4.2`, build tĩnh phục vụ bởi **`nginx:alpine`** (port 80 → host `5173`).
  - **UI & Visualization:** `d3-force ^3.0.0` (Knowledge Graph Visualizer), `docx-preview ^0.4.1`, `lucide-react ^1.44.0`, `@fortawesome/fontawesome-free ^7.3.1`, Custom CSS (`index.css` — **không có Tailwind CSS trong `package.json`**).
  - **API Client:** Native `fetch` (`frontend/src/services/api.js`, 1.065 dòng, hardcode `API_BASE = "http://localhost:5000/api"`) + Server-Sent Events (`frontend/src/hooks/useWatcherEvents.js`).
- **Backend (`backend/requirements.txt`, `backend/Dockerfile`):**
  - **Language & Runtime:** Python 3.11 (`python:3.11-slim`), FastAPI `>=0.110.0`, Uvicorn `>=0.28.0`, Pydantic v2 (`>=2.6.0`).
  - **PostgreSQL Stack:** SQLAlchemy 2.x Async (`sqlalchemy[asyncio]>=2.0.0`), `asyncpg`, `alembic>=1.13.0`, `psycopg2-binary`.
  - **Auth & Email:** `passlib[bcrypt]`, `bcrypt` (`security.py`), `python-jose[cryptography]` (HS256 JWT + `jti`), `aiosmtplib` (SMTP Email OTP).
  - **Graph & Vector & Parsing:** `neo4j>=5.18.0`, `qdrant-client>=1.8.0,<1.10.0`, `sentence-transformers>=3.0.0` (`all-MiniLM-L6-v2`, 384-dim), `pdfplumber`, `openpyxl`, `python-docx`, `httpx`, `aiofiles`.
- **Edge Daemon (`aegis-agent/Dockerfile`, `aegis-agent/src/`):**
  - Python 3.11 + `watchdog` (`watcher.py`, 372 dòng) + `pb56_agent_sync.py` (795 dòng) + `sync_client.py` (78 dòng) gửi HTTP REST webhook/heartbeat về Backend (`/api/v1/sync/*`, `/api/v1/workstations/*`).
- **Databases & AI Runtime (`docker-compose.yml`):**
  - **PostgreSQL:** Chạy native trên host (`POSTGRES_SERVER=host.docker.internal:5432`, DB `graph_mind`) — **không có container trong `docker-compose.yml`**.
  - **Neo4j:** Docker `neo4j:5.18.0` (ports `7474`, `7687`, plugin `apoc`).
  - **Qdrant:** Docker `qdrant/qdrant:v1.8.2` (ports `6333`, `6334`).
  - **Ollama LLM:** Chạy native trên host (`http://localhost:11434`, model `qwen2.5-7b-graphmind` GGUF Q4_K_M).

### 3.2. Cấu trúc Dự án & Quy mô Module Thực tế
- **Frontend (`frontend/src/`):** Tổ chức tốt theo 6 thư mục view tương ứng 6 module (`views/m1_data_sync/` .. `views/m6_admin_security/`), tách `components/ui/` (16 file), `hooks/`, `services/`, `constants/`.
- **Backend (`backend/app/`):** Phân bố thực tế rất bất cân đối:
  - `modules/m1_data_sync/`: **4.371 dòng** (7 file — `pipeline.py` 2.118 dòng, `webhook.py` 794 dòng, `pb56_workstation_service.py` 775 dòng, `google_connector.py` 419 dòng).
  - `modules/m2_knowledge_editor/`: **0 dòng** (chỉ có `__init__.py` rỗng!).
  - `modules/m3_hybrid_copilot/`: **5.879 dòng** (7 file — `nl2cypher_engine.py` **4.233 dòng**, `inference/client.py` 638 dòng, `text_to_cypher.py` 495 dòng, `semantic_layer.py` 432 dòng, `context_fusion.py` 81 dòng).
  - `modules/m4_decision_support/`: **0 dòng** (chỉ có `__init__.py` rỗng!).
  - `modules/m5_multifacet_search/`: **0 dòng** (chỉ có `__init__.py` rỗng!).
  - `modules/m6_admin_security/`: **2.468 dòng** (15 file — thiết kế gọn nhất: router/service/model/schema rõ ràng).
  - `api/v1/`: Chứa `copilot.py` (2.363 dòng), `dashboard.py` (1.117 dòng), `sop.py` (736 dòng), `shift_reports.py` (152 dòng), `auth.py`, `pb56_workstations.py`, `rbac.py`.
  - **`main.py`:** **3.306 dòng** với **37 route `@app.*` viết trực tiếp** (Explorer, Graph CRUD, Search, Preview, Health, Signals) + lifespan startup/PR1 Crash Recovery.

---

## 4. Architecture Pattern Assessment

- **Pattern tuyên bố trong SAD Ver 1.0:** Clean Modular Monolith (`backend/app/modules/m1..m6`) + Client-Server + On-Premise Multi-Model Storage.
- **Pattern thực tế trong Source Code:** **Client-Server Hybrid Monolith** (Frontend React SPA tách biệt theo 6 module; Backend là sự pha trộn giữa **3 vertical modules** `m1`, `m3`, `m6` với **Fat Entrypoint `main.py` + `api/v1/` Controllers**).
- **Đánh giá nguyên tắc thiết kế:**
  - **Separation of Concerns (`POOR` ở `main.py` & `copilot.py`):** `main.py` ôm đồng thời bootstrap/lifespan, PR1 crash recovery, 37 endpoint nghiệp vụ (m2, m4, m5) và truy cập trực tiếp `neo4j_client`/`qdrant_client`/`AsyncSessionLocal`.
  - **Coupling (`NEEDS IMPROVEMENT`):** Các file trong `backend/app/` lặp lại mẫu `try: from app.xxx ... except ImportError: from xxx ...` do phụ thuộc vào `PYTHONPATH`; nhiều router truy cập trực tiếp SQL/Cypher thay vì qua Service/Repository layer.
  - **Cohesion (`MIXED`):** `m6_admin_security` và `m1_data_sync` có tính gắn kết cao; ngược lại `main.py` (3.306 dòng) và `nl2cypher_engine.py` (4.233 dòng) có độ phức tạp rất cao, khó bảo trì.
  - **Modularity (`PARTIAL`):** Frontend modular tốt (6/6 modules); Backend mới modular thực sự 3/6 modules (`m1`, `m3`, `m6`).

---

## 5. Layer and Component Assessment

| Layer Thực tế | Thành phần Chính trong Code | Trách nhiệm Thực tế | Vấn đề Kiến trúc |
|---|---|---|---|
| **Presentation Layer** | `frontend/src/views/m1..m6`, `components/`, `services/api.js`, `hooks/useWatcherEvents.js` | Render SPA, chat Copilot, D3 Graph, RBAC 2D Grid, Shift Editor, lắng nghe SSE watcher events. | Hardcode `API_BASE = "http://localhost:5000/api"` (`api.js:6`); không qua env variable hay Nginx proxy. |
| **API / Gateway Layer** | `main.py` (37 inline routes + 22 `include_router`), `api/v1/*.py`, `m6_admin_security/*_router.py` | Routing, JWT/JTI validation, RBAC scope dependency (`get_user_scope`), global `ConcurrentLoginException` handler. | **Mount trùng router** (`file_watcher_router` và `google_connector_router` bị gọi `include_router` 2 lần; mọi router khác bị mount song song 2 prefix `/api/v1` và `/api`). |
| **Business / Service Layer** | `pipeline.py`, `pb56_workstation_service.py`, `nl2cypher_engine.py`, `text_to_cypher.py`, `context_fusion.py`, `rbac_matrix_service.py`, `session_service.py`, `audit_service.py`, `otp_service.py` | Ingestion + SHA-256 + UUIDv5 + PR1 locks/recovery, NL2Cypher + Cypher Guard, RRF Fusion, RBAC matrix, Single Session. | Thiếu service tách biệt cho `m2` (Graph Editor), `m4` (Risk/Dashboard), `m5` (Search) — logic nằm lẫn trong `main.py` và `api/v1/dashboard.py`. |
| **Data Access Layer** | `db/postgres/database.py` (SQLAlchemy Async), `db/neo4j/client.py`, `db/qdrant/client.py`, `m3/inference/client.py` | Connection pooling, ORM sessions, Cypher execution, Qdrant Layer-1 guard, Ollama HTTP streaming + fallback. | Thiếu Repository pattern thống nhất; runtime DDL (`CREATE TABLE IF NOT EXISTS`) nằm rải rác ở 5 file; `mock_knowledge_db.py` vẫn được import vào `main.py:48`. |
| **Persistence & AI Layer** | Host PostgreSQL (`graph_mind`), Docker Neo4j 5.18.0, Docker Qdrant v1.8.2, Host Ollama (`qwen2.5-7b-graphmind`), Shared Volume `/data` | Lưu trữ đa mô hình và suy luận cục bộ. | PostgreSQL chạy ngoài Docker (host) nhưng SAD Table 6.3 không hề mô tả. |
| **Edge Daemon Layer** | `aegis-agent/src/{watcher.py, pb56_agent_sync.py, sync_client.py}` | Giám sát `/data` bằng `watchdog`, debounce, gửi webhook & heartbeat 30s, nhận lệnh đồng bộ/kill switch. | SAD Table 6.1 ghi "Direct Python Service calls" — **sai**, thực tế Agent chạy container riêng gọi Backend qua **HTTP REST** (`_backend_request`, `watcher.py:45–57`). |

---

## 6. Data Architecture Assessment (Đối chiếu Database Design Ver 1.1 & Source Code)

| Component | Architecture Document Ver 1.0 | Database Design Ver 1.1 | Source Code Thực tế | Status | Recommendation |
|---|---|---|---|---|---|
| **PostgreSQL SoR** | **Thiếu** ở Table 6.1 & Table 6.3; chỉ nhắc ở CON-01 | 13 bảng Implemented MVP (`graph_mind`, host native) | SQLAlchemy 2.x Async + `asyncpg` → `host.docker.internal:5432` | `MISSING COMPONENT` (in SAD) | Bổ sung PostgreSQL vào C&C View, Deployment View, và Data Flow của SAD Ver 1.1. |
| **Embedding Model** | `nomic-embed-text` (**768-dim**) qua Ollama (FD-02, Table 6.1) | `all-MiniLM-L6-v2` (**384-dim**, Cosine) | `SentenceTransformer("all-MiniLM-L6-v2")` (**384-dim**, `qdrant/client.py:36`) | `IMPLEMENTATION MISMATCH` | Sửa SAD Ver 1.1 từ 768-dim `nomic-embed-text` thành 384-dim `all-MiniLM-L6-v2` (chạy trong backend container, không qua Ollama). |
| **Deduplication Hash** | `MD5` (FD-01, dòng 147) | `SHA-256` (BR-06) | `SHA-256` (`pipeline.py:12`, `shift_reports.py:54`) | `IMPLEMENTATION MISMATCH` | Sửa `MD5` thành `SHA-256` trong FD-01. |
| **Qdrant Collections** | Không liệt kê tên collection | `cuad_contracts`, `adventureworks_entities` + PR1 Layer-1 Guard | `cuad_contracts`, `adventureworks_entities` (`main.py:537`, `qdrant/client.py:52`) | `PARTIALLY COVERED` | Bổ sung tên 2 collection thực tế và PR1 Layer-1 `is_active` guard vào SAD. |
| **Neo4j Ontology** | Mô tả chung chung | 10 nhãn (`:Document`, `:Company`, `:Clause`, `:Customer`, `:SalesOrder`, `:Product`, `:Department`...) | Khớp DBD Ver 1.1 (`semantic_layer.py`) | `PARTIALLY COVERED` | Tham chiếu trực tiếp DBD Ver 1.1 §3.2 để đồng bộ kiến trúc dữ liệu. |
| **Container Versions** | `neo4j:5.26-community`, `qdrant:v1.12.1` (Table 6.3) | `neo4j:5.18.0`, `qdrant/qdrant:v1.8.2` | `neo4j:5.18.0`, `qdrant/qdrant:v1.8.2` (`docker-compose.yml:6, 33`) | `OUTDATED` / `INCONSISTENT` | Cập nhật Table 6.3 khớp `docker-compose.yml`. |

---

## 7. API and Integration Assessment

- **Giao tiếp thực tế (`IMPLEMENTED` nhưng chưa được tài liệu hóa trong SAD Ver 1.0):**
  1. **REST APIs (FastAPI, Port 5000):** Nhóm endpoint `/api/v1/auth` (+ `/forgot-password`), `/api/v1/copilot`, `/api/v1/dashboard`, `/api/v1/dashboard/shift-reports`, `/api/v1/sop`, `/api/v1/rbac`, `/api/v1/workstations`, `/api/documents/submit-upload`, `/api/admin/upload-approvals`, `/api/v1/sync/*`, và 37 endpoint trực tiếp trong `main.py`.
  2. **Server-Sent Events (SSE):** Kênh realtime từ Backend đẩy sự kiện File Watcher/Ingestion lên Frontend (`useWatcherEvents.js`, `RealtimeUploadTicker.jsx`, `WatcherToast.jsx`) — **chưa có trong SAD Ver 1.0**.
  3. **AEGIS Agent ↔ Backend Integration:** Giao tiếp qua **HTTP REST** (`X-Agent-API-Key` + `pb56_agent_sync.py` polling/heartbeat 30s + 2-phase ACK cho Sync Mode & Kill Switch) — SAD Table 6.1 ghi sai là "Direct Python Service calls".
  4. **External Integrations:** Host Ollama HTTP REST (`:11434`), SMTP TLS (`:587` qua `aiosmtplib` cho Email OTP), và Google Drive/Sheets OAuth 2.0 (`google_connector.py` — Optional/Stretch).
- **Vấn đề API trong Source Code:** Mount trùng lặp router (`file_watcher_router`, `google_connector_router`) và duy trì song song 2 tiền tố `/api` và `/api/v1` cho cùng một router gây phình OpenAPI schema.

---

## 8. Security Architecture Assessment

| Cơ chế Bảo mật | Trong SAD Ver 1.0 | Trong SRS Ver 1.2 & DBD Ver 1.1 | Trong Source Code Thực tế | Phân loại Sai lệch |
|---|---|---|---|---|
| **Password Hashing** | Ghi **`PBKDF2`** (Table 6.2) | `bcrypt` (cost 12) | `bcrypt.gensalt()` (`security.py:29`) | `DOCUMENTATION DEFECT` (sửa SAD) |
| **Role Separation (BR-04)** | 3 nhóm Actor (Table 2.2 / Table 4), gộp Admin | 5 vai trò tách IT Admin vs Knowledge Admin | `core/rbac.py` & `rbac_matrix_service.py` (chưa tách sạch hết ở `seed_users.py`) | `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT` |
| **Single Active Session (FR59)** | **Không đề cập** | `user_active_sessions` + JTI + HTTP 401 kick | `session_service.py` + `ConcurrentLoginException` handler (`main.py:220`) | `DOCUMENTATION DEFECT` |
| **Dynamic 2D RBAC Matrix (FR58)** | Chỉ nhắc RBAC chung | `knowledge_access_policies` (5 cờ boolean) | `rbac_matrix_router.py` + `rbac_matrix_service.py` | `DOCUMENTATION DEFECT` |
| **Email OTP Recovery (FR60)** | Chỉ nhắc SMTP gửi alert | 3 bước, 6 số, 300s, 3 lần sai | `forgot_password_router.py` + `otp_service.py` (**unsalted SHA-256** — rủi ro) | `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT` |
| **Read-Only Cypher Guard (FR61)** | **Không đề cập** | Chặn 7 từ khóa đột biến | `text_to_cypher.py` (`FORBIDDEN_KEYWORDS`) | `DOCUMENTATION DEFECT` |
| **PR1 Layer-1 Qdrant Guard** | **Không đề cập** | Chặn `is_active = False` | `qdrant/client.py:52–103` | `DOCUMENTATION DEFECT` |
| **CORS Policy** | Không đề cập | — | **`allow_origins=["*"]` + `allow_credentials=True`** (`main.py:232–239`) | `IMPLEMENTATION GAP` / Security Defect |
| **AEGIS Agent Auth** | Ghi HTTPS/TLS | API key + token hash | `AEGIS_AGENT_API_KEY=dev-agent-key` mặc định trong `docker-compose.yml:66, 111` | `BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT` |

---

## 9. Deployment Architecture Assessment

- **Trạng thái thực tế:** Hệ thống có cấu hình **Development / On-Premise Single-Host Docker Compose** (`docker-compose.yml`, 3 `Dockerfiles`, `run_all.bat`, `run_backend.bat`, `run_frontend.bat`). Chưa có bằng chứng triển khai Production Cloud hay chứng chỉ TLS/Reverse Proxy Nginx cho HTTPS/WSS.
- **5 Sai lệch trực tiếp giữa SAD Table 6.3 / §5.2 và `docker-compose.yml`:**
  1. **Thiếu PostgreSQL:** Thực tế Backend kết nối PostgreSQL chạy native trên host qua `POSTGRES_SERVER=host.docker.internal` (`docker-compose.yml:65`).
  2. **Sai kiến trúc Frontend container:** SAD ghi `Node 20 / Vite React SPA | 5173:5173`; thực tế `frontend/Dockerfile` là **multi-stage build (`node:20-alpine` → `nginx:alpine`)** chạy trên port 80 và ánh xạ **`5173:80`** (`docker-compose.yml:90`).
  3. **Sai phiên bản Database images:** SAD ghi `neo4j:5.26-community` và `qdrant:v1.12.1`; thực tế là **`neo4j:5.18.0`** và **`qdrant/qdrant:v1.8.2`**.
  4. **Sai volume mount `/data`:** SAD ghi Named Volume `graphmind_documents:/data`; thực tế `docker-compose.yml:69, 115` đang bind-mount trực tiếp ổ đĩa Windows **`D:/data:/data`** (dù dòng 131 vẫn khai báo `volumes: graphmind_documents` không dùng tới!).
  5. **Mâu thuẫn tự thân ở §5.2 (dòng 293 vs 294):** Dòng 293 viết *"backend API is hosted on a cloud platform"*, ngay dòng 294 viết *"No component is hosted on a public cloud platform"*.

---

## 10. Quality Attributes Assessment

| Quality Attribute | Yêu cầu trong SRS Ver 1.2 | Mô tả trong SAD Ver 1.0 | Bằng chứng Triển khai (Code) | Đã kiểm chứng Benchmark/Test? |
|---|---|---|---|---|
| **Performance** | Locust 150 VU: read p95 `< 500ms`, heavy `< 2s`; Web load `<= 2s`; Ollama `<= 3.5s`; Kill Switch `<= 3s` | **Tự mâu thuẫn:** QAS-01 ghi TTFT `< 2.5s`, full `< 6.0s` (20 sessions); Utility Tree ghi 1-hop `< 5s`, 2-hop `< 10s`, multi-hop `< 20s` (5 sessions). | Async FastAPI + SQLAlchemy pool (`10+20`); **nhưng** `Neo4jClient.search_nodes` là Full Graph Scan và `Qdrant.search_by_text` chỉ scroll 300 điểm. | `UNCERTAIN` (chưa thấy báo cáo kết quả Locust/Lighthouse trong repo). |
| **Scalability** | 100k Neo4j nodes, 1M Qdrant vectors, 5k docs | QAS-02: 500+ PDFs & 10k records trong `< 15 min` | `pipeline.py` dùng **in-memory Python lock** (`_PATH_LOCKS`, `_DOC_LOCKS`) — **chỉ scale được 1 worker process**, không scale ngang nhiều container backend! | `NOT VERIFIED` |
| **Reliability & Availability** | Fallback `< 1.0s` khi Ollama sập (0% error rate); MTTR `<= 15m` | **Tự mâu thuẫn:** QAS-04 ghi reconnect `< 10s`; Utility Tree ghi `< 60s`. | **Điểm sáng chưa có trong SAD:** `reconcile_crashed_operations()` chạy lúc startup (`main.py:196`) + Deterministic Fallback khi Ollama lỗi + `pool_pre_ping=True`. | `PARTIALLY VERIFIED` (unit tests có `test_staging_migration_safety.py`, `test_pb56_workstations.py`). |
| **Security** | BR-02..BR-06, FR58–FR62 | QAS-03a/b (100% on-premise, HTTP 403, audit log) | Có JWT+JTI, Dynamic RBAC, Cypher Guard, Layer-1 Qdrant Guard; **nhưng** tồn tại lỗi CORS `* + credentials`, OTP SHA-256 không muối, dev API key mặc định. | `TEST VERIFIED` một phần (`test_concurrent_login.py`, `test_department_scope.py`, `test_safety_guard.py`). |
| **Maintainability** | PEP 8, modular containers | QAS-05: đổi LLM trong `< 1 person-day` | `inference/client.py` tách gọn (đạt QAS-05); **nhưng** `main.py` (3.306 dòng) và `nl2cypher_engine.py` (4.233 dòng) là nợ kỹ thuật bảo trì lớn. | `NOT VERIFIED` |
| **Testability** | Unit, Integration, E2E | Không đề cập trong SAD | **Tốt trong Code:** Có `backend/app/tests/fakes/{fake_neo4j.py, fake_qdrant.py, test_app_factory.py}` và ~20 file pytest. | `IMPLEMENTED` |

---

## 11. Architecture Diagram Assessment

### 11.1. Đánh giá 5 Sơ đồ Hiện có trong SAD Ver 1.0
1. **Figure 1 — System Context Diagram (§3.2):** Thiếu tách vai trò `System & IT Admin` vs `Knowledge Admin` và `Department Manager` (BR-04); không thể hiện rõ AEGIS Local Agent như thực thể biên kết nối qua HTTP REST.
2. **Figure 2 — Component and Connector View (§4.1):** **Sai lệch nghiêm trọng** — thiếu hoàn toàn **PostgreSQL**, ghi sai embedding `768-dim` qua Ollama thay vì `384-dim` trong Backend, ghi sai AEGIS giao tiếp "Direct Python calls" thay vì HTTP REST, thiếu SSE stream về Frontend.
3. **Figure 3 — Module View (§4.2):** **Sai lệch nghiêm trọng** — vẽ 6 backend module ngang hàng (`m1..m6`) trong khi `m2`, `m4`, `m5` là thư mục rỗng 0 dòng, bỏ sót `main.py` (37 inline routes) và `api/v1/` layer.
4. **Figure 4 — Network / Deployment Diagram (§4.3):** **Sai lệch nghiêm trọng** — thiếu Host PostgreSQL (`host.docker.internal:5432`), sai port Frontend (`5173:5173` thay vì Nginx `5173:80`), sai version Neo4j/Qdrant, sai mount `/data`.
5. **Figure 5 — Data Flow (§4.4):** Thiếu nhánh **Document Upload Approval Queue (`PENDING -> APPROVED -> Ingestion`)**, thiếu nhánh **Shift Handover & AI Daily Consolidation**, và ghi sai `React/Next.js`.

### 11.2. Danh sách Sơ đồ Cần Bổ sung / Vẽ lại (Không tạo ảnh trong giai đoạn Audit)
- `[DIAGRAM PLACEHOLDER: Updated Figure 1 — System Context Diagram (5 BR-04 Roles + AEGIS Edge + Host Ollama + SMTP)]` — Vị trí: §3.2. Mục đích: Đồng bộ 5 tác tử chuẩn BR-04 và ranh giới tích hợp.
- `[DIAGRAM PLACEHOLDER: Updated Figure 2 — Component & Connector View (Including Host PostgreSQL, 384-dim Local Embedder, SSE Stream & Security Guards)]` — Vị trí: §4.1. Mục đích: Phản ánh đầy đủ 3 kho lưu trữ và kênh giao tiếp thực tế.
- `[DIAGRAM PLACEHOLDER: Updated Figure 3 — Actual Layered & Modular Monolith View (Frontend 6 Views + FastAPI API/Modules/DB Layers)]` — Vị trí: §4.2. Mục đích: Thể hiện trung thực kiến trúc thực tế (hoặc trạng thái đích sau refactor `main.py`).
- `[DIAGRAM PLACEHOLDER: Updated Figure 4 — On-Premise Docker & Host Deployment Diagram (Nginx 5173:80, FastAPI 5000, Neo4j 5.18, Qdrant 1.8.2, Host PostgreSQL 5432, Host Ollama 11434)]` — Vị trí: §4.3. Mục đích: Khớp 100% `docker-compose.yml` và `Dockerfiles`.
- `[DIAGRAM PLACEHOLDER: New Figure 6 — Security & Multi-Store Access Control Architecture (JWT+JTI, Dynamic RBAC Matrix, Cypher Guard AST, PR1 Layer-1 Qdrant Guard)]` — Vị trí: Mục mới §4.5 Security Architecture. Mục đích: Làm rõ chuỗi kiểm soát an ninh xuyên suốt 3 CSDL.
- `[DIAGRAM PLACEHOLDER: New Figure 7 — Document Approval & Shift Handover Data Flow Diagram (FR53–FR57)]` — Vị trí: §4.4 Data Flow. Mục đích: Bao phủ luồng phê duyệt tài liệu và báo cáo giao ca mới của SRS Ver 1.2.

---

## 12. Architecture vs Source Code Comparison (Tóm tắt)

Bảng đối chiếu chi tiết từng thành phần kèm phân loại **A. DOCUMENTATION DEFECT**, **B. IMPLEMENTATION GAP**, **C. BOTH DOCUMENTATION AND IMPLEMENTATION DEFECT** được xuất riêng tại: **`GraphMind-Architecture-SourceCode-Comparison.md`**.

---

## 13. Architecture Traceability Matrix (Tóm tắt)

Ma trận truy vết 7 chiều đầy đủ (**Proposal → US → PBI → SRS → Architecture → Database Design Ver 1.1 → Source Code**) được xuất riêng tại: **`GraphMind-Architecture-Traceability-Matrix.md`**.

---

## 14. Missing and Incorrect Architecture Content

- **Missing Content:** PostgreSQL trong C&C/Deployment; Security Architecture section (JWT+JTI, Dynamic RBAC, Email OTP, Cypher Guard, Qdrant Layer-1 Guard); API & SSE Integration Architecture; PR1 Crash Recovery Reconciliation; Luồng Document Approval (FR53–54), Shift Handover & Daily Consolidation (FR55–57), AEGIS Emergency Kill Switch (FR62); Testability Architecture (`fakes/` + pytest); ADR (Architecture Decision Records) giải trình chọn Modular Monolith, Self-hosted Ollama, Host PostgreSQL, và 384-dim embeddings.
- **Incorrect Content:** 3/6 backend modules (`m2`, `m4`, `m5`) rỗng nhưng được mô tả là package hoàn chỉnh; `768-dim nomic-embed-text` (thực tế `384-dim all-MiniLM-L6-v2`); `PBKDF2` (thực tế `bcrypt`); `MD5` (thực tế `SHA-256`); `Direct Python calls` từ AEGIS (thực tế HTTP REST); `CON-03` bị paste nhầm nội dung QAS-03; `5173:5173` (thực tế Nginx `5173:80`).
- **Outdated / Self-Contradictory Content:** `React / Next.js` & `TypeScript` (thực tế React 18 Vite JSX); `neo4j:5.26` & `qdrant:v1.12.1`; mâu thuẫn Cloud vs On-premise ở §5.2; mâu thuẫn chỉ số QAS-01/04 vs Utility Tree; mục References cuối tài liệu bị dịch máy sang tiếng Việt và trang bìa còn sót `ThS.`, `Chữ ký`.

---

## 15. Priority Fix List

Danh sách đầy đủ 26 Issues (`ARCH-ISS-01` → `ARCH-ISS-26`) được lưu tại **`GraphMind-Architecture-Issue-List.md`**:
- **CRITICAL (6 issues):** `ARCH-ISS-01` (Thiếu PostgreSQL ở C&C & Deployment), `ARCH-ISS-02` (3/6 backend modules rỗng + God File `main.py`), `ARCH-ISS-03` (Sai embedding 768 vs 384), `ARCH-ISS-04` (Thiếu toàn bộ kiến trúc FR53–FR62), `ARCH-ISS-05` (Mâu thuẫn nội tại Cloud vs On-premise §5.2 & sai Deployment Table 6.3), `ARCH-ISS-06` (Lỗi CORS `* + credentials` & thiếu Security Architecture section).
- **HIGH (9 issues):** Sai thuật toán `PBKDF2`/`MD5`, vi phạm BR-04 (3 vai trò cũ), sai giao tiếp AEGIS (`Direct Python` vs HTTP REST), sai Frontend stack (`Next.js`/`TypeScript` vs Vite JSX Nginx), hardcode `API_BASE = localhost:5000`, mount trùng router trong `main.py`, mâu thuẫn chỉ số QAS vs Utility Tree, `CON-03` copy-paste nhầm, thiếu mô tả SSE & PR1 Crash Recovery.
- **MEDIUM (7 issues):** In-memory lock cản trở scale ngang (`pipeline.py`), thiếu API & Error Handling Architecture, thiếu Testability section, thiếu ADR, `mock_knowledge_db.py` còn import vào `main.py`, `nl2cypher_engine.py` 4.233 dòng quá lớn, volume `graphmind_documents` khai báo thừa so với `D:/data`.
- **LOW (4 issues):** Bảng References thiếu SRS Ver 1.2 & DBD Ver 1.1, References cuối tài liệu bị dịch máy tiếng Việt, trang bìa còn chữ `Chữ ký`/`ThS.`, ngày bìa `December 18, 2026` vượt quá End Date dự án (`01 Dec 2026`).

---

## 16. Proposed Architecture Improvements

1. **Tái cấu trúc & Chuẩn hóa SAD lên Ver 1.1:**
   - Bổ sung **PostgreSQL** vào C&C View (Table 6.1), Deployment View (Table 6.3) và Data Flow (§4.4).
   - Sửa lại Module View (Table 6.2) phản ánh trung thực kiến trúc hiện tại (Backend: `main.py` + `api/v1/` + `modules/{m1, m3, m6}` + `db/core`; Frontend: `views/m1..m6`), kèm kế hoạch refactor tách `m2`, `m4`, `m5` ra khỏi `main.py`.
   - Sửa toàn bộ thông số sai: `384-dim all-MiniLM-L6-v2`, `bcrypt`, `SHA-256`, `React 18 + Vite SPA (JSX)` phục vụ qua `nginx:alpine (5173:80)`, `neo4j:5.18.0`, `qdrant/qdrant:v1.8.2`, AEGIS giao tiếp HTTP REST.
   - Xóa mâu thuẫn §5.2 (chốt 100% On-Premise Single-Host Docker Compose + Host PostgreSQL + Host Ollama), sửa nội dung `CON-03`, đồng nhất chỉ số QAS-01/04 với Utility Tree và SRS NFR-01..NFR-08.
   - Bổ sung **§4.5 API, SSE & Integration Architecture**, **§4.6 Security Architecture** (5 vai trò BR-04, JWT+JTI, Dynamic RBAC Matrix, Email OTP, Cypher Guard, Layer-1 Qdrant Guard), **§4.7 Resilience & Crash Recovery** (PR1 Reconciliation + Ollama Fallback), và **§6 Architecture Decision Records (ADRs)**.
2. **Đề xuất Cải thiện Riêng cho Source Code (Không tự ý sửa trong Audit):**
   - Sửa CORS trong `main.py:232–239` (chỉ định `allow_origins` cụ thể từ `.env` thay vì `["*"]` khi `allow_credentials=True`).
   - Xóa 2 lệnh `include_router` bị gọi lặp (`file_watcher_router`, `google_connector_router`) trong `main.py`.
   - Đưa `API_BASE` trong `frontend/src/services/api.js:6` sang biến môi trường `import.meta.env.VITE_API_URL` hoặc cấu hình Nginx reverse proxy `/api` → `http://backend:5000/api`.
   - Từng bước trích xuất 37 route từ `main.py` về đúng thư mục `m2_knowledge_editor`, `m4_decision_support`, `m5_multifacet_search`.

---

## 17. Final Checklist

Architecture Document chỉ đủ điều kiện nâng cấp lên **Ver 1.1** khi hoàn thành đủ:
- [ ] Bổ sung PostgreSQL (`graph_mind`, host native) vào C&C View, Deployment View và Data Flow.
- [ ] Sửa đúng Module View (phản ánh thực tế `m1/m3/m6` + `api/v1/` + `main.py` và Frontend 6 modules).
- [ ] Đồng bộ 100% Technology Stack với Code & DBD Ver 1.1 (`React 18 Vite JSX + Nginx`, `384-dim all-MiniLM-L6-v2`, `bcrypt`, `SHA-256`, `neo4j:5.18.0`, `qdrant:v1.8.2`, AEGIS HTTP REST).
- [ ] Bổ sung đầy đủ kiến trúc cho FR53–FR62, SSE realtime, PR1 Crash Recovery, và Security Architecture theo BR-04 (5 vai trò).
- [ ] Xóa mọi mâu thuẫn nội tại (§5.2 Cloud vs On-premise, QAS vs Utility Tree, `CON-03`, ngày bìa, ngôn ngữ tiếng Anh đồng nhất ở References).
- [ ] Cập nhật lại 5 sơ đồ hiện có và bổ sung 2 sơ đồ mới (Security Architecture & Approval/Shift Data Flow).
