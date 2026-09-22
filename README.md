# GraphMind (EKAI) — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support

> Capstone Project 1 — C1SE.18 — International School, Duy Tan University
> Cây thư mục này được tổng hợp từ 5 tài liệu dự án: **Proposal Document (v1.1)**, **User Story Document**, **Project Plan Document**, **Product Backlog Document**, **SRS (v1.2)**.
> File này dùng làm bản đồ (scaffold) để agent code (Claude Code / Cursor / v.v.) khởi tạo và chỉnh sửa cấu trúc repo.

---

## 1. Tổng quan hệ thống

GraphMind gồm **6 module khóa cứng** (locked modules), phục vụ **4 vai trò hệ thống** (System & Knowledge Administrator, Executive, Department Manager, Standard User) và **1 nhóm dự án** (Research Team — không phải role RBAC):

| Module | Tên | Nội dung chính |
|---|---|---|
| M1 | Data Source & Sync Management | AEGIS Local Agent, ETL, Document/File Watcher API |
| M2 | Knowledge Management & Editor | Document Explorer, Knowledge Editor, SOP Editor |
| M3 | Hybrid AI Copilot & Search | Chat Copilot, Hybrid Query Engine, Knowledge Graph Viewer, Source Citation |
| M4 | Decision Support & Alerts | Home Dashboard, Executive Dashboard, Risk Alert Center |
| M5 | Enterprise Multi-facet Search | Unified search + filters |
| M6 | System Admin & Security | Auth (JWT/OAuth2/RBAC), Audit Log, Admin Analytics |

**Research Track** (song song, không phải module hệ thống): ETL AdventureWorks/CUAD, Controlled Synthetic Linking, Q&A dataset, fine-tuning Qwen2.5-7B-Instruct (LoRA/PEFT/Unsloth trên Kaggle T4), 3 baseline (Vector RAG / Pure GraphRAG / Hybrid GraphRAG), benchmark 100–200 câu hỏi, 5 chỉ số đánh giá.

**Tech stack:** FastAPI (Backend) · React/Next.js (Frontend) · Neo4j (Graph DB) · Qdrant (Vector DB) · PostgreSQL (Relational DB) · Qwen2.5-7B-Instruct fine-tuned (self-hosted inference) · AEGIS Local Agent (Python File Watcher) · JWT/OAuth2/RBAC.

---

## 2. Cây thư mục đề xuất

```
graphmind/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── docs/                                   # Tài liệu quản lý dự án (5 file docx gốc + phát sinh)
│   ├── 01-proposal/
│   │   └── C1SE18-Proposal-Document.docx
│   ├── 02-user-story/
│   │   └── C1SE18_UserStory_GraphMind.docx
│   ├── 03-project-plan/
│   │   └── C1SE18_ProjectPlan_GraphMind.docx
│   ├── 04-product-backlog/
│   │   └── C1SE18_ProductBacklog_GraphMind.docx
│   ├── 05-srs/
│   │   └── C1SE18_SRS_GraphMind.docx
│   ├── architecture/                        # SAD — Sprint 2 deliverable
│   │   ├── system-context-diagram.md
│   │   ├── business-function-diagram.md
│   │   ├── schema-mapping-design.md
│   │   └── deployment-architecture.md
│   ├── use-cases/                           # UC.01–UC.22 (SRS §5.4)
│   ├── diagrams/                            # Activity / Sequence / Class diagrams
│   └── reports/
│       ├── technical-report.md              # Sprint 4 deliverable
│       ├── ai-usage-disclosure.md           # Sprint 4 deliverable
│       └── peer-evaluation.md               # Sprint 4 deliverable
│
├── backend/                                 # Python FastAPI — Backend Cloud
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py                  # JWT + OAuth2
│   │   │   └── rbac.py                      # RBAC / Department Scope / Data Scope
│   │   ├── db/
│   │   │   ├── postgres/                    # SQLAlchemy models + Alembic migrations
│   │   │   │   ├── models/
│   │   │   │   │   ├── user.py
│   │   │   │   │   ├── department.py
│   │   │   │   │   └── audit_log.py
│   │   │   │   └── migrations/
│   │   │   ├── neo4j/
│   │   │   │   ├── client.py
│   │   │   │   └── schema/                  # Customer, Product, Order, Employee, Vendor, Contract, Clause
│   │   │   └── qdrant/
│   │   │       └── client.py
│   │   ├── modules/
│   │   │   ├── m1_data_sync/                # Module 1 — Data Source & Sync Management
│   │   │   │   ├── document_ingestion_api.py
│   │   │   │   ├── file_watcher_api.py
│   │   │   │   ├── sync_orchestration.py
│   │   │   │   └── gdrive_sheets_connector.py   # Optional/Stretch (PB06)
│   │   │   ├── m2_knowledge_editor/         # Module 2 — Knowledge Management & Editor
│   │   │   │   ├── document_explorer.py
│   │   │   │   ├── knowledge_editor.py      # human-in-the-loop CRUD (Neo4j/Qdrant)
│   │   │   │   └── sop_editor.py
│   │   │   ├── m3_hybrid_copilot/           # Module 3 — Hybrid AI Copilot & Search
│   │   │   │   ├── query_engine/
│   │   │   │   │   ├── intent_classifier.py
│   │   │   │   │   ├── text_to_cypher.py
│   │   │   │   │   ├── vector_retriever.py
│   │   │   │   │   ├── context_fusion.py
│   │   │   │   │   └── hybrid_query_engine.py
│   │   │   │   ├── inference/               # self-hosted Qwen2.5-7B-Instruct (fine-tuned)
│   │   │   │   │   └── inference_service.py
│   │   │   │   ├── citation_viewer.py
│   │   │   │   ├── kg_visualizer_api.py
│   │   │   │   └── session_manager.py       # chat history / pinned sessions (PB59, optional)
│   │   │   ├── m4_decision_support/         # Module 4 — Decision Support & Alerts
│   │   │   │   ├── home_dashboard.py
│   │   │   │   ├── executive_dashboard.py
│   │   │   │   ├── risk_alert_center.py
│   │   │   │   └── executive_briefing.py    # Optional/Stretch (PB65)
│   │   │   ├── m5_multifacet_search/        # Module 5 — Enterprise Multi-facet Search
│   │   │   │   └── unified_search.py
│   │   │   └── m6_admin_security/           # Module 6 — System Admin & Security
│   │   │       ├── auth_api.py              # login / register / forgot-password / OTP
│   │   │       ├── user_department_mgmt.py
│   │   │       ├── audit_log_api.py
│   │   │       ├── admin_analytics_dashboard.py
│   │   │       └── llmops_cost_dashboard.py # Optional/Stretch (PB66)
│   │   ├── api/v1/                          # REST route registration per module
│   │   ├── schemas/                         # Pydantic request/response models
│   │   ├── services/                        # cross-module shared services
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
│
├── frontend/                                # React / Next.js — Web Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/                      # login, register, forgot-password, OTP
│   │   │   ├── dashboard/                   # Home & Dashboard (role-aware nav)
│   │   │   ├── copilot/                     # Chat UI (multi-turn)
│   │   │   ├── knowledge-graph/             # Knowledge Graph Visualizer
│   │   │   ├── source-viewer/               # Source & Citation Viewer
│   │   │   ├── search/                      # Enterprise Multi-facet Search
│   │   │   ├── knowledge-base/              # Document & Data Explorer + Knowledge Editor
│   │   │   ├── sop/                         # SOP & Internal Knowledge Base editor
│   │   │   ├── executive/                   # Executive Decision Dashboard + Risk Alert Center
│   │   │   ├── admin/                       # User/RBAC mgmt, Audit Log, Analytics, AEGIS Panel
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/                             # API client, auth context
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── next.config.js
│
├── aegis-agent/                             # AEGIS Local Agent — File Watcher (chạy tại máy SME)
│   ├── src/
│   │   ├── watcher.py                       # theo dõi thư mục cục bộ
│   │   ├── sync_client.py                   # incremental sync qua HTTPS/TLS tới Backend Cloud
│   │   └── config.py
│   ├── requirements.txt
│   └── README.md
│
├── research/                                # Research Track (không phải module hệ thống)
│   ├── data/
│   │   ├── raw/
│   │   │   ├── adventureworks/
│   │   │   └── cuad/
│   │   ├── processed/
│   │   ├── synthetic_linking/               # lookup table Customer↔Contract (seed cố định)
│   │   ├── qa_pairs/                        # 2,000–3,000 cặp Q&A (80/10/10 split)
│   │   └── benchmark/                       # 100–200 câu hỏi (single-hop/2-hop/cross-source)
│   ├── notebooks/
│   │   ├── 01_etl_adventureworks.ipynb
│   │   ├── 02_cuad_preprocessing.ipynb
│   │   ├── 03_controlled_synthetic_linking.ipynb
│   │   ├── 04_qa_pairs_generation.ipynb
│   │   ├── 05_finetuning_kaggle_unsloth.ipynb
│   │   └── 06_baseline_evaluation.ipynb
│   ├── src/
│   │   ├── etl/
│   │   ├── ner_re/                          # Entity/Relation Extraction + Entity Resolution
│   │   ├── linking/                         # controlled synthetic linking logic + seeds
│   │   ├── finetuning/                      # LoRA/PEFT config, training loop, checkpoint mgmt
│   │   └── evaluation/
│   │       ├── baselines/
│   │       │   ├── vector_rag.py
│   │       │   ├── pure_graphrag.py
│   │       │   └── hybrid_graphrag.py
│   │       └── metrics/                     # Answer Correctness, Citation Precision,
│   │                                         # Hallucination Rate, Response Time, FT Effectiveness
│   └── reports/
│       └── baseline_comparison_report.md
│
├── infra/
│   ├── neo4j/
│   ├── qdrant/
│   ├── postgres/
│   └── docker/
│
└── .github/
    └── workflows/                           # CI: lint, test, build (pull-request review trước khi merge)
```

---

## 3. Ánh xạ Module ↔ Sprint (theo Project Plan & Product Backlog)

| Sprint | Thời gian | Thư mục chính được xây dựng |
|---|---|---|
| Sprint 1 — Kickoff & Planning | 01/09 – 22/09/2026 | `backend/app/modules/m6_admin_security/auth_api.py`, `frontend/src/app/(auth)`, `frontend/src/app/dashboard`, `backend/app/db/postgres`, `research/src/etl`, `research/data/qa_pairs` (khởi tạo) |
| Sprint 2 — Knowledge Foundation & Fine-tuning | 22/09 – 20/10/2026 | `backend/app/modules/m2_knowledge_editor`, `backend/app/modules/m6_admin_security` (RBAC), `backend/app/modules/m3_hybrid_copilot` (KG Viewer + Chat UI frontend), `research/notebooks/05_finetuning_kaggle_unsloth.ipynb` |
| Sprint 3 — Hybrid Query Engine & Explainable Answers | 20/10 – 10/11/2026 | `backend/app/modules/m3_hybrid_copilot/query_engine`, `aegis-agent/`, `backend/app/modules/m2_knowledge_editor` (Knowledge Editor + Graph Editor integration), `backend/app/modules/m5_multifacet_search` |
| Sprint 4 — Packaging, Benchmarking & Closing | 10/11 – 01/12/2026 | `backend/app/modules/m1_data_sync` (AEGIS Panel), `backend/app/modules/m6_admin_security/admin_analytics_dashboard.py`, `research/src/evaluation`, `docs/reports/` |

---

## 4. Ghi chú cho agent code

- Repo là **monorepo**: `backend/`, `frontend/`, `aegis-agent/`, `research/` độc lập về dependency nhưng chia sẻ schema qua `docs/architecture/schema-mapping-design.md`.
- 7 loại entity chuẩn hóa xuyên suốt hệ thống: **Customer, Product, Order, Employee, Vendor, Contract, Clause** — mọi module đọc/ghi Neo4j/Qdrant phải tuân theo schema này.
- Các mục **Optional / Stretch** (không nằm trong 4 Sprint cam kết): PB06 (Google Drive/Sheets), PB13/PB14 (Neo4j/Qdrant admin CRUD), PB31 (reliability indicators UI), PB40 (Standard User alerts), PB59 (session pinning), PB65 (Executive Briefing Generator), PB66 (LLMOps Dashboard) — đặt code ở nhánh riêng hoặc đánh dấu rõ trong module tương ứng, không chặn tiến độ Core.
- Naming convention module trong code nên giữ tiền tố `m1_…` đến `m6_…` để agent/reviewer tra cứu nhanh về User Story (US01–US59) và Backlog item (PB01–PB69) tương ứng trong `docs/`.
- Neo4j, Qdrant, PostgreSQL đều là thành phần **retrieval/lưu trữ**; mô hình sinh câu trả lời duy nhất là Qwen2.5-7B-Instruct đã fine-tune, phục vụ tại `backend/app/modules/m3_hybrid_copilot/inference/`.
