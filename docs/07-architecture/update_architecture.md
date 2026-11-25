# HƯỚNG DẪN CẬP NHẬT TÀI LIỆU ARCHITECTURE DESIGN DOCUMENT (VER 1.0 ➔ VER 1.1)
## ĐỐI CHIẾU THEO SOURCE CODE THỰC TẾ, SRS VER 1.2, DATABASE DESIGN VER 1.1 VÀ PROPOSAL VER 1.2

> **Dự án:** GraphMind — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support  
> **Mã đề tài:** Capstone Project 1 — C1SE.18 — Đại học Duy Tân (Duy Tan University)  
> **Tài liệu gốc cần chỉnh sửa:** `7.C1SE18_Architecture-Document-ver1.0.docx`  
> **Tài liệu ban hành dự kiến:** `C1SE18_Architecture-Document-ver1.1.docx`  
> **Căn cứ đối chiếu:**  
> 1. Bộ báo cáo kiểm toán: `docs/07-architecture/GraphMind-Architecture-Audit-Report.md`, `GraphMind-Architecture-Issue-List.md`, `GraphMind-Architecture-SourceCode-Comparison.md`  
> 2. `docs/05-srs/C1SE18_SRS_GraphMind_Ver1.2.docx` (62 FRs, 27 Use Cases, BR-01–BR-06)  
> 3. `docs/06-database-design/C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx` (13 bảng PostgreSQL Implemented, 10 nhãn Neo4j, 2 collection Qdrant 384-dim)  
> 4. `docs/01-proposal/C1SE18-Proposal-Document-Ver1.2.docx`, User Story Ver 1.2, Product Backlog Ver 1.2, Project Plan Ver 1.2  
> 5. Toàn bộ mã nguồn thực tế (`backend/`, `frontend/`, `aegis-agent/`, `docker-compose.yml`, `Dockerfiles`).

---

## MỤC LỤC
1. [Cập nhật Bìa, Metadata, Revision History & Document References (§1)](#1-cập-nhật-bìa-metadata-revision-history--document-references-1)
2. [Chuẩn hóa 5 Vai trò Theo BR-04 (§1.2 Table 2.2 & §3.2 Table 4)](#2-chuẩn-hóa-5-vai-trò-theo-br-04-12-table-22--32-table-4)
3. [Hiệu chỉnh Architecture Drivers, Quality Attributes & CON-03 (§3)](#3-hiệu-chỉnh-architecture-drivers-quality-attributes--con-03-3)
4. [Cập nhật High-Level Architecture (§4.1 – §4.4) & Bổ sung §4.5 – §4.7](#4-cập-nhật-high-level-architecture-41--44--bổ-sung-45--47)
5. [Xóa Mâu thuẫn §5.2 Constraints & Bổ sung §6 Architecture Decision Records (ADRs)](#5-xóa-mâu-thuẫn-52-constraints--bổ-sung-6-architecture-decision-records-adrs)
6. [Chú thích Các Sơ đồ Kiến trúc Cần Cập nhật / Bổ sung (Không Tạo Ảnh)](#6-chú-thích-các-sơ-đồ-kiến-trúc-cần-cập-nhật--bổ-sung-không-tạo-ảnh)
7. [Hạng mục Sửa đổi Riêng cho Source Code & Checklist Nghiệm thu Ver 1.1](#7-hạng-mục-sửa-đổi-riêng-cho-source-code--checklist-nghiệm-thu-ver-11)

---

## 1. CẬP NHẬT BÌA, METADATA, REVISION HISTORY & DOCUMENT REFERENCES (§1)

### 1.1. Trang bìa & Bảng Metadata (Table 1)
- **Version:** Đổi `1.0` thành **`1.1`**.
- **Date:** Đổi `December 18, 2026` (vượt quá End Date `01 Dec 2026` trong Table 0!) thành **`23 November 2026`**.
- **File name (Table 1):** Đổi `Architecture Design Document.docx` thành **`C1SE18_Architecture-Document-ver1.1.docx`**.
- **Chuẩn hóa tiếng Anh đồng nhất trên trang bìa:**
  - `ThS. Sanh, Kim Tran` → **`PhD. Sanh, Kim Tran`**.
  - `Chữ ký` → **`Signature`**.
  - `Tran Viet Anh Vũ` → **`Tran Viet Anh Vu`**.
- **Bổ sung bảng Document Revision History** ngay sau Table 2:

| Version | Date | Author(s) | Description of Change |
|:---:|:---:|---|---|
| 1.0 | 25 Sep 2026 | Tran Thi Ngoc Anh | Initial Architecture Design Document (Context, Drivers, QAS, Utility Tree, C&C, Module, Deployment, Data Flow). |
| **1.1** | 23 Nov 2026 | C1SE18 Project Team | Synchronized with Source Code, SRS Ver 1.2, and Database Design Ver 1.1: added Host PostgreSQL to C&C and Deployment Views; corrected Backend/Frontend Module View and React 18 Vite + Nginx (5173:80) stack; aligned 384-dim all-MiniLM-L6-v2, SHA-256, bcrypt, AEGIS HTTP REST, and Docker image versions (Neo4j 5.18.0, Qdrant v1.8.2); added FR53–FR62 architecture, API/SSE, Security Architecture (BR-04 5 roles), PR1 Crash Recovery, Testability, and 5 ADRs; fixed CON-03, QAS consistency, Heading styles, and IEEE English References. |

### 1.2. Cập nhật Table 3 (Document References — §1.3)
Bổ sung đầy đủ 6 tài liệu dự án mới nhất thay cho 2 dòng cũ:

| No. | Reference Document | Version | Date |
|:---:|---|:---:|:---:|
| 1 | Project Proposal (`C1SE18-Proposal-Document-Ver1.2.docx`) | 1.2 | 08 Nov 2026 |
| 2 | User Story Document (`C1SE18_UserStory_GraphMind-Ver1.2.docx`) | 1.2 | Nov 2026 |
| 3 | Product Backlog Document (`C1SE18_ProductBacklog_GraphMind_Ver1.2.docx`) | 1.2 | Nov 2026 |
| 4 | Project Plan Document (`C1SE18_ProjectPlan_GraphMind-Ver1.2.docx`) | 1.2 | Nov 2026 |
| 5 | Software Requirements Specification (`C1SE18_SRS_GraphMind_Ver1.2.docx`) | 1.2 | 14 Nov 2026 |
| 6 | Database Design Document (`C1SE18_DatabaseDesign_GraphMind_Ver1.1.docx`) | 1.1 | 22 Nov 2026 |

### 1.3. Khôi phục Nguyên văn Tiếng Anh Chuẩn IEEE cho Mục `References` (Cuối tài liệu)
Thay thế toàn bộ 12 dòng bị dịch máy tiếng Việt (`[1]`–`[12]`) bằng nguyên văn tiếng Anh:
1. `[1]` P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," in *Proc. NeurIPS*, 2020.
2. `[2]` D. Edge et al., "From Local to Global: A Graph RAG Approach to Query-Focused Summarization," *arXiv:2404.16130*, 2024.
3. `[3]` Microsoft, "AdventureWorks Sample Databases," Microsoft Learn. Available: https://learn.microsoft.com/en-us/sql/samples/adventureworks-install-configure
4. `[4]` D. Hendrycks et al., "CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review," in *Proc. NeurIPS Datasets and Benchmarks*, 2021.
5. `[5]` Neo4j, Inc., "Neo4j Graph Database Documentation." Available: https://neo4j.com/docs/
6. `[6]` Qdrant, "Qdrant Vector Database Documentation." Available: https://qdrant.tech/documentation/
7. `[7]` E. J. Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models," in *Proc. ICLR*, 2022.
8. `[8]` Hugging Face, "PEFT: Parameter-Efficient Fine-Tuning Documentation." Available: https://huggingface.co/docs/peft
9. `[9]` Kaggle, "Kaggle Notebooks GPU and TPU Documentation." Available: https://www.kaggle.com/docs/notebooks
10. `[10]` Y. Gao et al., "Retrieval-Augmented Generation for Large Language Models: A Survey," *arXiv:2312.10997*, 2023.
11. `[11]` IETF, "RFC 7519: JSON Web Token (JWT)," 2015. Available: https://www.rfc-editor.org/rfc/rfc7519
12. `[12]` IETF, "RFC 6749: The OAuth 2.0 Authorization Framework," 2012. Available: https://www.rfc-editor.org/rfc/rfc6749

---

## 2. CHUẨN HÓA 5 VAI TRÒ THEO BR-04 (§1.2 TABLE 2.2 & §3.2 TABLE 4)

Thay thế bảng 3 vai trò gộp cũ bằng **5 vai trò chuẩn BR-04** (đồng bộ SRS Ver 1.2 & Database Design Ver 1.1):

| Human Actor / Stakeholder | Role Code (BR-04) | Architectural Concerns & Interaction Boundary |
|---|---|---|
| **System & IT Administrator** | `it_admin` | User/account management, Dynamic 2D RBAC Matrix, Single Active Session enforcement, Immutable Audit Logs, AEGIS Fleet Control & Emergency Kill Switch (<= 3s). *Must not curate knowledge graph content.* |
| **Knowledge Administrator** | `knowledge_manager` | Document Upload Approval Queue (`PENDING -> APPROVED/REJECTED`), SOP Wiki publication, Neo4j Knowledge Graph curation. *Must not manage accounts, RBAC matrix, or delete audit logs.* |
| **Executive (BOD / C-Level)** | `executive` | Cross-departmental strategic Hybrid GraphRAG queries (BR-05), Executive KPI Dashboard, Financial Risk Alerts (Negative Margin, Abnormal Discount >= 35%), Daily Shift Overview, Audit Log viewing. |
| **Department Manager** | `department_manager` | Departmental Shift Handover sign-off (`SUBMITTED -> APPROVED/REJECTED`), AI Daily Shift Consolidation trigger, departmental SOP drafting, department-scoped Copilot queries. |
| **Standard User** | `standard_user` | Department-scoped AI Copilot & Multi-facet Search (BR-02), internal document upload to approval queue, shift handover submission, self-service Email OTP password recovery. |

*(Cập nhật tương ứng Table 4 System Context Entities: 5 Human Actors trên + 4 External/Host Systems: Local Storage `/data`, Host PostgreSQL `:5432`, Host Ollama `:11434`, SMTP Mail Gateway `:587`).*

---

## 3. HIỆU CHỈNH ARCHITECTURE DRIVERS, QUALITY ATTRIBUTES & CON-03 (§3)

### 3.1. Sửa Functional Drivers (§3.1.2)
- **FD-01 (Automated Multi-Modal Ingestion & Preprocessing):**
  - Sửa `calculating MD5 deduplication hashes` → **`calculating SHA-256 deduplication hashes (BR-06)`**.
  - Bổ sung: hỗ trợ giao tiếp **HTTP REST Webhook + Heartbeat 30s + 2-phase ACK** (bao gồm Emergency Kill Switch <= 3s, FR62) và **PR1 Crash Recovery Reconciliation** khi khởi động.
- **FD-02 (Hybrid GraphRAG Retrieval & Multi-Hop Traversal):**
  - Sửa `768-dimensional dense vector similarity searches on Qdrant (using Cosine metric via nomic-embed-text)` → **`384-dimensional dense vector similarity searches on Qdrant (using Cosine metric via local SentenceTransformer all-MiniLM-L6-v2)`** trên 2 collection `cuad_contracts` và `adventureworks_entities`.
  - Bổ sung: áp dụng **Read-Only Cypher Guard (FR61)** trước Neo4j và **PR1 Layer-1 Guard (`is_active`)** trước Qdrant.
- **FD-04 (Cross-Departmental Access Control & Data Governance):**
  - Bổ sung: tách 5 vai trò theo BR-04, Dynamic 2D RBAC Matrix (`knowledge_access_policies`), Single Active Session JTI (`user_active_sessions`), và Email OTP 3 bước (`password_reset_otps`).
- **FD-05 (Multi-Faceted Decision Analytics & Risk Assessment):**
  - Bổ sung 2 quy tắc cảnh báo tài chính cốt lõi của SRS FR42 (`Negative Margin` và `Abnormal Discount >= 35%`) và xác nhận báo cáo điều hành chỉ hiển thị trực quan trên Web (PDF/Word export là Out-of-Scope per Proposal §4.2).
- **Bổ sung FD-06 (Document Governance & Shift Handover Consolidation — FR53–FR57):**
  - Quản lý hàng đợi phê duyệt tài liệu nội bộ (`PENDING -> APPROVED/REJECTED`, SHA-256 idempotency, kích hoạt ingestion sau khi Knowledge Admin duyệt) và vòng đời biên bản bàn giao ca trực (`DRAFT -> SUBMITTED -> APPROVED/REJECTED`) kèm tổng hợp ca ngày bằng Ollama cục bộ + Deterministic Fallback (`< 1.0s`).

### 3.2. Đồng nhất Quality Attribute Scenarios (Table 5.1) & Utility Tree (Table 5.2)
Loại bỏ mâu thuẫn nội tại và đồng bộ với SRS Ver 1.2 NFR-01..NFR-08:
- **QAS-01 (Performance):** Thống nhất 1 bộ chỉ tiêu: Read endpoints p95 `< 500 ms` & heavy retrieval endpoints p95 `< 2,000 ms` (Locust 150 VU per SRS NFR-01); Web SPA load `<= 2.0 s`; Local Ollama Q4_K_M inference average `<= 3.5 s` (TTFT `< 2.5 s`, multi-hop ceiling `< 20 s` under 5 concurrent GPU sessions); AEGIS Kill Switch `<= 3.0 s`.
- **QAS-02 (Scalability):** Sửa `768-dim nomic-embed-text` → **`384-dim all-MiniLM-L6-v2`**; ghi rõ ràng buộc hiện tại của `pipeline.py` dùng in-memory lock (`threading.RLock`) nên Backend chạy chế độ single-worker.
- **QAS-04 (Availability & Resilience):** Thống nhất thời gian reconnect database: auto-reconnect trong `< 60 s` (Docker healthcheck + `pool_pre_ping=True`), Ollama timeout `> 30 s` kích hoạt Deterministic Fallback trong `< 1.0 s` (0% application error rate), và **PR1 Crash Recovery Reconciliation** tự dọn giao dịch dở dang khi khởi động.
- **Bổ sung QAS-07 (Testability):** Backend cô lập phụ thuộc CSDL thông qua `tests/fakes/{fake_neo4j.py, fake_qdrant.py, test_app_factory.py}`, cho phép chạy unit & integration tests không cần Neo4j/Qdrant thật.

### 3.3. Viết lại `CON-03 (Technology Stack Standards)` (§3.4)
Xóa hoàn toàn nội dung copy-paste nhầm của QAS-03 ở dòng 202, thay bằng:
- **CON-03 (Technology Stack Standards):** The system standardizes on open-source, zero-licensing-cost technologies: Python 3.11 + FastAPI + SQLAlchemy 2.x Async (`asyncpg`) for the backend; React 18 + Vite (JavaScript/JSX) served via Nginx (`nginx:alpine`) for the frontend SPA; PostgreSQL 15+ (Host native, DB `graph_mind`), Neo4j `5.18.0` (APOC), and Qdrant `v1.8.2` for multi-model storage; local `SentenceTransformer("all-MiniLM-L6-v2")` (384-dim) for embeddings; and native Host Ollama (`Qwen2.5-7B-GraphMind` GGUF Q4_K_M) for local LLM inference.

---

## 4. CẬP NHẬT HIGH-LEVEL ARCHITECTURE (§4.1 – §4.4) & BỔ SUNG §4.5 – §4.7

### 4.1. Cập nhật Table 6.1 (Component & Connector Roles — §4.1)
Thay đổi & bổ sung 4 điểm cốt lõi:

| Component Name | Stereotype / Type | Primary Responsibility (Updated Ver 1.1) | Connectors / Protocols |
|---|---|---|---|
| **React Web SPA (Nginx)** | Client Component | Renders AI Copilot, D3-Force Graph Visualizer, RBAC 2D Matrix, Document Approval Queue, Shift Editor & Executive Dashboards. | HTTP REST (`5173:80 -> 5000`), Server-Sent Events (SSE) |
| **FastAPI Gateway & Orchestrator** | Application Server | Coordinates JWT+JTI auth, Dynamic RBAC, Document Approval, Shift Consolidation, Hybrid GraphRAG, Read-Only Cypher Guard, local 384-dim embeddings (`all-MiniLM-L6-v2`), PR1 Crash Recovery. | HTTP REST (`:5000`), asyncpg (`:5432`), Bolt (`:7687`), Qdrant REST (`:6333`), Ollama REST (`:11434`), SMTP TLS (`:587`) |
| **AEGIS File Watcher Daemon** | Edge Background Daemon | Monitors `/data` via `watchdog`, verifies SHA-256 changes, sends ingestion webhooks, 30s heartbeats, and executes remote Sync Mode / Emergency Kill Switch commands. | **HTTP REST** (`/api/v1/sync/*`, `/api/v1/workstations/*`, `X-Agent-API-Key`) |
| **Host PostgreSQL (NEW in Table 6.1)** | Relational Database (SoR) | Persists 13 operational MVP tables (`users`, `user_active_sessions`, `password_reset_otps`, `knowledge_access_policies`, `audit_logs`, `knowledge_upload_approvals`, `shift_reports`, `sop_documents`, `copilot_sessions`, `pb56_workstations*`). | PostgreSQL Wire Protocol (`host.docker.internal:5432`) |
| **Neo4j Graph Engine** | Graph Database | Stores AdventureWorks ERP & CUAD/Document knowledge graph (10 labels, 8 implemented relationships); executes read-only Cypher traversals. | Bolt Binary Protocol (`:7687`) |
| **Qdrant Vector DB** | Vector Database | Stores 384-dim Cosine embeddings in `cuad_contracts` and `adventureworks_entities`; enforces PR1 Layer-1 `is_active` guard. | HTTP REST / gRPC (`:6333`, `:6334`) |
| **Host Ollama Inference Engine** | Local AI Engine | Serves local LLM completions (`qwen2.5-7b-graphmind`, GGUF Q4_K_M) for Copilot answers and Shift Consolidation (with Deterministic Fallback). | HTTP REST (`host.docker.internal:11434`) |

### 4.2. Cập nhật Table 6.2 (Module View — §4.2)
Phản ánh **trung thực 100%** kiến trúc mã nguồn hiện tại (cả Backend lẫn Frontend), đồng thời ghi nhận kế hoạch refactor tách `main.py`:
- **Backend Active Modules & Entrypoints:**
  - `backend/app/main.py` (3.306 lines): FastAPI app bootstrap, lifespan startup, PR1 Crash Recovery, `ConcurrentLoginException` handler, router mounting, và 37 inline endpoints phục vụ Explorer, Graph CRUD (`m2`), và Multi-facet Search (`m5`) *(Technical Debt: đang lập kế hoạch tách về `modules/m2` và `modules/m5`)*.
  - `backend/app/api/v1/`: Chứa `auth.py`, `copilot.py` (2.363d), `dashboard.py` (1.117d — đảm nhiệm `m4_decision_support`), `sop.py` (736d — đảm nhiệm SOP Wiki), `shift_reports.py` (152d — FR55–57), `pb56_workstations.py` (FR62), `rbac.py`.
  - `backend/app/modules/m1_data_sync/` (4.371d): `pipeline.py`, `webhook.py`, `pb56_workstation_*`, `google_connector.py`.
  - `backend/app/modules/m3_hybrid_copilot/` (5.879d): `nl2cypher_engine.py`, `text_to_cypher.py` (Cypher Guard), `semantic_layer.py`, `context_fusion.py`, `inference/client.py`.
  - `backend/app/modules/m6_admin_security/` (2.468d): `user_admin_api.py`, `rbac_matrix_*`, `document_approval_*`, `session_service.py`, `forgot_password_router.py`, `otp_service.py`, `audit_service.py` (**bcrypt**, không phải PBKDF2).
  - `backend/app/modules/{m2_knowledge_editor, m4_decision_support, m5_multifacet_search}/`: Hiện là package stub rỗng (`__init__.py`), chờ đợt refactor tách code từ `main.py` và `api/v1/`.
  - `backend/app/db/` & `backend/app/core/`: SQLAlchemy Async engine & 13 models, Neo4j client, Qdrant client (384-dim + Layer-1 guard), RBAC scope, canonical departments (`core/departments.py`).
- **Frontend Modular Views (`frontend/src/views/`):** Tổ chức đủ 6 module (`m1_data_sync`, `m2_knowledge_editor`, `m3_hybrid_copilot`, `m4_decision_support`, `m5_multifacet_search`, `m6_admin_security`) + `services/api.js` + `hooks/useWatcherEvents.js`.

### 4.3. Cập nhật §4.3 Allocation / Deployment View (Table 6.3)
- **Sửa lỗi Heading style:** Đổi `4.3 Allocation / Deployment View` từ `Heading 4` về **`Heading 2`**; đổi đoạn ảnh Figure 4 từ `Heading 2` về **`Normal`**.
- **Cập nhật Table 6.3 khớp 100% `docker-compose.yml` và `Dockerfiles`:**

| Container / Host Node | Image / Runtime (Verified) | Port Mapping | Network Boundary | Volume / Storage |
|---|---|---|---|---|
| `graphmind_frontend` | Multi-stage `node:20-alpine` → **`nginx:alpine`** | **`5173:80`** | `graphmind-net` | Static Vite build (`/usr/share/nginx/html`) |
| `graphmind_backend` | `python:3.11-slim` (FastAPI / Uvicorn) | `5000:5000` | `graphmind-net` | Bind mount `/data` (`${DATA_DIR:-D:/data}:/data`) |
| `neo4j_db` | **`neo4j:5.18.0`** (plugin `apoc`) | `7474:7474`, `7687:7687` | `graphmind-net` | `./neo4j_data:/data`, `./neo4j_import:/var/lib/neo4j/import` |
| `qdrant_db` | **`qdrant/qdrant:v1.8.2`** | `6333:6333`, `6334:6334` | `graphmind-net` | `./qdrant_data:/qdrant/storage` |
| `aegis_file_watcher` | `python:3.11-slim` (Watchdog Daemon) | Internal (Outbound HTTP) | `graphmind-net` | Shared `/data` mount |
| **Host PostgreSQL (NEW)** | Native Host PostgreSQL 15+ (DB: `graph_mind`) | **`5432`** | `host.docker.internal` | Host PostgreSQL data directory |
| **Host Ollama Node** | Native Host OS (Windows/Linux + GPU) | `11434:11434` | `host.docker.internal` | Local GGUF weights (`qwen2.5-7b-graphmind`) |

### 4.4. Cập nhật §4.4 Data Flow & Bổ sung §4.5, §4.6, §4.7
- **§4.4 Data Flow:** Sửa `React/Next.js` → `React 18 + Vite SPA`; bổ sung 2 luồng dữ liệu mới:
  1. **Document Upload Approval Flow (FR53–54):** Staff upload → `.pending_uploads` + `knowledge_upload_approvals (PENDING)` → Knowledge Admin preview & Approve → `pipeline.py` (SHA-256 + 384-dim Qdrant + Neo4j `:Document`) → SSE event cập nhật UI.
  2. **Shift Handover & Daily Consolidation Flow (FR55–57):** Staff submit `shift_reports` → Department Manager sign-off (`APPROVED`) → Ollama Daily Consolidation (hoặc Deterministic Fallback `< 1.0s`) → hiển thị trên Executive/Manager Dashboard.
- **§4.5 API, SSE & Integration Architecture (Mới):** Trình bày các nhóm REST endpoint `/api/v1/*`, kênh SSE realtime (`useWatcherEvents.js`), giao thức AEGIS Agent (HTTP Webhook + Heartbeat 30s + 2-phase ACK), và Global Exception Handler (`ConcurrentLoginException` → HTTP 401 `CONCURRENT_LOGIN_KICKED`).
- **§4.6 Security Architecture (Mới):** Mô tả chuỗi kiểm soát an ninh đa tầng: (1) JWT HS256 + JTI Single Active Session; (2) 5 vai trò BR-04 & Dynamic 2D RBAC Matrix; (3) Email OTP 3 bước (`bcrypt` cho password; khuyến nghị nâng cấp OTP sang HMAC-SHA256); (4) Read-Only Cypher Guard (FR61); (5) PR1 Layer-1 Qdrant Guard (`is_active`); (6) Immutable Audit Logs (BR-03).
- **§4.7 Resilience, Crash Recovery & Testability (Mới):** Mô tả `reconcile_crashed_operations()` chạy tự động khi khởi động Backend (`main.py:196`), Ollama Deterministic Fallback, và kiến trúc kiểm thử bằng Fakes (`backend/app/tests/fakes/`).

---

## 5. XÓA MÂU THUẪN §5.2 CONSTRAINTS & BỔ SUNG §6 ARCHITECTURE DECISION RECORDS (ADRs)

### 5.1. Sửa §5.2 Technical Constraints
- **Xóa dòng 293** (*"while the backend API is hosted on a cloud platform"*) để loại bỏ mâu thuẫn trực tiếp với dòng 294 (*"No component is hosted on a public cloud platform"*). Chốt nhất quán: **100% On-Premise Single-Host Docker Compose + Host PostgreSQL + Host Ollama**.
- **Sửa Programming Languages (dòng 291):** Đổi `JavaScript / TypeScript: Frontend development (React / Next.js)` → **`JavaScript (JSX / ES Modules): Frontend development (React 18 + Vite SPA, D3-Force)`**.
- **Bổ sung PostgreSQL** vào mục `Software Used` (hiện đang chỉ liệt kê Neo4j và Qdrant!).

### 5.2. Bổ sung Section 6: Architecture Decision Records (ADRs)
Tóm tắt 5 quyết định kiến trúc cốt lõi để bảo vệ trước Hội đồng:
1. **ADR-01 — Modular Monolith over Microservices:** Giảm độ phức tạp vận hành cho đội ngũ 5 thành viên và triển khai trên 1 máy trạm on-premise.
2. **ADR-02 — Multi-Model Persistence (PostgreSQL + Neo4j + Qdrant):** Mỗi kho làm Single Source of Truth cho đúng bản chất dữ liệu (ACID vs. Multi-hop Graph vs. Dense Vector).
3. **ADR-03 — Self-Hosted Ollama Q4_K_M + In-Process 384-dim `all-MiniLM-L6-v2`:** Đảm bảo 0 VND chi phí biên, 100% data sovereignty, giảm độ trễ embedding bằng cách nhúng trực tiếp trong Backend.
4. **ADR-04 — Native Host PostgreSQL & Host Ollama with Dockerized App/Neo4j/Qdrant:** Tận dụng GPU vật lý trực tiếp cho Ollama và PostgreSQL sẵn có của máy chủ trong môi trường Capstone Windows/WSL2.
5. **ADR-05 — Single-Worker In-Memory Ingestion Locks (`pipeline.py`):** Đơn giản hóa kiểm soát đồng thời (deadlock-free path/doc RLock + Neo4j CAS) với giới hạn đã biết là 1 worker process (nâng cấp sang distributed lock nếu scale ngang).

---

## 6. CHÚ THÍCH CÁC SƠ ĐỒ KIẾN TRÚC CẦN CẬP NHẬT / BỔ SUNG (KHÔNG TẠO ẢNH)

1. `[DIAGRAM PLACEHOLDER — Updated Figure 1: System Context Diagram]` — Vị trí: §3.2. Cập nhật 5 Human Actors chuẩn BR-04 + 4 External/Host Systems (Local `/data`, Host PostgreSQL `:5432`, Host Ollama `:11434`, SMTP `:587`).
2. `[DIAGRAM PLACEHOLDER — Updated Figure 2: Component & Connector View]` — Vị trí: §4.1. Bổ sung Host PostgreSQL, 384-dim local embedder trong FastAPI, SSE stream về React/Nginx, và sửa AEGIS thành HTTP REST.
3. `[DIAGRAM PLACEHOLDER — Updated Figure 3: Actual Modular & Layered View]` — Vị trí: §4.2. Thể hiện 6 Frontend views (`m1..m6`) và cấu trúc thực tế Backend (`main.py`, `api/v1/`, `modules/{m1, m3, m6}`, `db/`, `core/`).
4. `[DIAGRAM PLACEHOLDER — Updated Figure 4: On-Premise Docker & Host Deployment Diagram]` — Vị trí: §4.3. Khớp 100% `docker-compose.yml` (`nginx:alpine 5173:80`, `FastAPI 5000`, `neo4j:5.18.0`, `qdrant:v1.8.2`, `aegis_file_watcher`, Host PostgreSQL `5432`, Host Ollama `11434`).
5. `[DIAGRAM PLACEHOLDER — Updated Figure 5: End-to-End Data Flow]` — Vị trí: §4.4. Bổ sung nhánh Document Upload Approval (FR53–54) và Shift Handover + AI Consolidation (FR55–57).
6. `[DIAGRAM PLACEHOLDER — New Figure 6: Multi-Layer Security & Access Control Architecture]` — Vị trí: §4.6. Chuỗi phòng thủ JWT+JTI → 5 vai trò BR-04 → Dynamic RBAC Matrix → Read-Only Cypher Guard → PR1 Layer-1 Qdrant Guard → Immutable Audit Log.

---

## 7. HẠNG MỤC SỬA ĐỔI RIÊNG CHO SOURCE CODE & CHECKLIST NGHIỆM THU VER 1.1

### 7.1. Hạng mục Cần Khắc phục trong Source Code (Tách biệt khỏi việc sửa Tài liệu)
- Sửa `CORSMiddleware` trong `backend/app/main.py:232–239` (không dùng `allow_origins=["*"]` kèm `allow_credentials=True`).
- Xóa 2 lệnh `include_router` trùng lặp (`file_watcher_router`, `google_connector_router`) trong `main.py`.
- Chuyển `API_BASE` (`frontend/src/services/api.js:6`) sang `import.meta.env.VITE_API_URL` hoặc Nginx proxy `/api` → `http://backend:5000/api`.
- Thay bind-mount cứng `D:/data:/data` bằng `${DATA_DIR:-./data}:/data` và bỏ `AEGIS_AGENT_API_KEY=dev-agent-key` mặc định ở Production.
- Từng bước refactor 37 route từ `main.py` sang `modules/m2_knowledge_editor/` và `modules/m5_multifacet_search/`.

### 7.2. Checklist Nghiệm thu Xuất bản `C1SE18_Architecture-Document-ver1.1.docx`
- [ ] Đã cập nhật Bìa (`Ver 1.1`, `23 Nov 2026`, `PhD.`, `Signature`), thêm Revision History, cập nhật Table 3 (6 tài liệu) và khôi phục 12 IEEE References tiếng Anh.
- [ ] Đã bổ sung **Host PostgreSQL** vào C&C View, Deployment View, Data Flow và §5.2 Software Used.
- [ ] Đã sửa trung thực Module View (Table 6.2), công nghệ (`384-dim all-MiniLM-L6-v2`, `SHA-256`, `bcrypt`, `React 18 Vite JSX + Nginx 5173:80`, `neo4j:5.18.0`, `qdrant:v1.8.2`, AEGIS HTTP REST).
- [ ] Đã chuẩn hóa 5 vai trò BR-04, bổ sung FD-06 (FR53–FR57), §4.5 API/SSE, §4.6 Security Architecture, §4.7 Crash Recovery & Testability, và §6 ADRs.
- [ ] Đã xóa mâu thuẫn §5.2 Cloud vs On-premise, viết lại `CON-03`, đồng nhất QAS với Utility Tree, và sửa style `Heading 2` cho mục `4.3`.
- [ ] Đã cập nhật lại 5 sơ đồ hiện có và bổ sung Figure 6 (Security Architecture).
