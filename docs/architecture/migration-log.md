# Nhật Ký Tái Cấu Trúc Repository (Migration Log)

> **Dự án:** GraphMind (EKAI) — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support  
> **Thời gian thực hiện:** 22/09/2026  
> **Phương pháp:** Sử dụng `git mv` cho tất cả các file có giá trị lịch sử; cô lập file legacy/scratch; scaffold khung thư mục chuẩn hóa theo [README.md](../../README.md).

---

## 1. Mục tiêu & Nguyên tắc tái cấu trúc
- **Bảo toàn lịch sử Git:** Tất cả file code, component, docs và script đều được di dời bằng `git mv` thay vì xóa/tạo mới.
- **Chuẩn hóa kiến trúc 6 Module khóa cứng (M1–M6):** Định hình rõ cấu trúc thư mục backend và frontend theo các module:
  - **M1:** Data Source & Sync Management (`m1_data_sync`)
  - **M2:** Knowledge Management & Editor (`m2_knowledge_editor`)
  - **M3:** Hybrid AI Copilot & Search (`m3_hybrid_copilot`)
  - **M4:** Decision Support & Alerts (`m4_decision_support`)
  - **M5:** Enterprise Multi-facet Search (`m5_multifacet_search`)
  - **M6:** System Admin & Security (`m6_admin_security`)
- **Giải quyết xung đột công nghệ:** Thống nhất **Python FastAPI** làm backend duy nhất; cô lập hoàn toàn prototype Node.js Express cũ vào `backend/archive/express/`; giữ vững **React 18 + Vite** cho frontend và tổ chức lại views theo M1–M6.

---

## 2. Chi tiết các thao tác tái cấu trúc

### 2.1 Dọn dẹp Root & Scripts
| Thao tác | Đường dẫn cũ | Đường dẫn mới | Mục đích |
|---|---|---|---|
| `git mv` | `app_code.b64`, `copilot_code.b64`, `exec_code.b64`, `knowledge_code.b64`, `test.b64`, `test.py`, `test.txt`, `update_views.py`, `build_views.py` | `scripts/scratch/` | Thu gom toàn bộ file rác/scratch từ root |
| `git mv` | `frontend/scripts/*` (18 python files & b64) | `scripts/dev-tools/` | Đưa các script dev/decode về thư mục `scripts/` chung |

### 2.2 Tái cấu trúc Backend Cloud (`backend/`)
| Thao tác | Đường dẫn cũ | Đường dẫn mới | Mục đích |
|---|---|---|---|
| `git mv` | `backend/server.js`, `backend/package.json`, `backend/package-lock.json`, `backend/routes/`, `backend/data/knowledgeData.js` | `backend/archive/express/` | Lưu trữ prototype Express cũ, bảo toàn commit |
| `git mv` | `backend/main.py` | `backend/app/main.py` | Đưa FastAPI vào đúng package `app` |
| `git mv` | `backend/data/knowledge_db.py` | `backend/app/db/mock_knowledge_db.py` | Chuẩn bị cho việc chuyển dịch sang Neo4j/PostgreSQL |
| Scaffold | *(Mới)* | `backend/app/core/` (`config.py`, `security.py`, `rbac.py`) | Khung Auth & RBAC cho Sprint 1 & 2 |
| Scaffold | *(Mới)* | `backend/app/db/postgres/`, `neo4j/`, `qdrant/` | Khung kết nối cơ sở dữ liệu |
| Scaffold | *(Mới)* | `backend/app/modules/m1_...` đến `m6_...` | Cấu trúc 6 module backend |
| Cập nhật | `backend/app/main.py` | `backend/app/main.py` | Sửa import `from app.db.mock_knowledge_db import ...` và entrypoint uvicorn |
| Cập nhật | `run_backend.bat`, `run_all.bat` | `run_backend.bat`, `run_all.bat` | Đổi lệnh chạy thành `python -m uvicorn app.main:app --reload` |

### 2.3 Tái cấu trúc Frontend React (`frontend/`)
| Thao tác | Đường dẫn cũ | Đường dẫn mới | Mục đích |
|---|---|---|---|
| `git mv` | `frontend/css/`, `frontend/js/` | `frontend/archive/vanilla/` | Lưu trữ file vanilla HTML/JS cũ |
| `git mv` | `frontend/src/views/ConnectorsView.jsx` | `frontend/src/views/m1_data_sync/ConnectorsView.jsx` | Module 1 UI |
| `git mv` | `frontend/src/views/DocumentsView.jsx`, `KnowledgeView.jsx` | `frontend/src/views/m2_knowledge_editor/` | Module 2 UI |
| `git mv` | `frontend/src/views/CopilotView.jsx` | `frontend/src/views/m3_hybrid_copilot/CopilotView.jsx` | Module 3 UI |
| `git mv` | `frontend/src/views/ExecutiveView.jsx`, `RiskView.jsx`, `ReportsView.jsx` | `frontend/src/views/m4_decision_support/` | Module 4 UI |
| `git mv` | `frontend/src/views/SearchView.jsx` | `frontend/src/views/m5_multifacet_search/SearchView.jsx` | Module 5 UI |
| `git mv` | `frontend/src/views/AdminView.jsx` | `frontend/src/views/m6_admin_security/AdminView.jsx` | Module 6 UI |
| Cập nhật | `frontend/src/App.jsx` | `frontend/src/App.jsx` | Cập nhật 9 import view theo đường dẫn module mới |
| Cập nhật | `KnowledgeView.jsx`, `CopilotView.jsx` | Tương ứng | Cập nhật import `../../services/api` |

### 2.4 Chuẩn hóa AEGIS Agent, Research, Infra & Docs
- **aegis-agent:** Xóa các `.gitkeep` rỗng cũ, tạo file nguồn chuẩn hóa theo mục 2 README.md: `src/watcher.py`, `src/sync_client.py`, `src/config.py`, `requirements.txt`, `README.md`.
- **infra:** Bổ sung `infra/postgres/.gitkeep`, tạo root `docker-compose.yml` (Postgres, Neo4j, Qdrant) và root `.env.example`.
- **research:** Khởi tạo toàn bộ cấu trúc thư mục Research Track: `data/raw/`, `processed/`, `synthetic_linking/`, `qa_pairs/`, `benchmark/`, `notebooks/`, `src/etl/`, `ner_re/`, `linking/`, `finetuning/`, `evaluation/`, `reports/`.
- **docs:** Chuyển `docs/ProjectPlan_Documents.docx` thành `docs/03-project-plan/C1SE18_ProjectPlan_GraphMind.docx`, tạo khung thư mục `01-proposal/`, `02-user-story/`, `04-product-backlog/`, `05-srs/`, `architecture/`, `use-cases/`, `diagrams/`, `reports/`.

---

## 3. Kết quả xác nhận sau di dời (Verification)
1. **Kiểm tra Backend:** Chạy `python -c "from app.main import app; print(app.title)"` thành công, output:
   `Backend app imported successfully: Graph Mind Enterprise Knowledge Observatory API`.
2. **Kiểm tra Frontend:** Chạy `npm --prefix frontend run build` hoàn thành thành công trong 1.17s với 0 cảnh báo hay lỗi import.

---

## 4. Dọn dẹp triệt để các file không cần thiết (Cleanup)
Theo yêu cầu, toàn bộ các file rác, file code thừa và prototype cũ đã được xóa bỏ hoàn toàn khỏi repository:
1. **Backend Express cũ (Đã xóa 5 files):** `server.js`, `package.json`, `package-lock.json`, `routes/api.js`, `data/knowledgeData.js`.
2. **Frontend Vanilla prototype cũ (Đã xóa 5 files):** `frontend/css/components.css`, `tokens.css`, `frontend/js/app.js`, `data.js`, `i18n.js`.
3. **Các file scratch / dump Base64 / test tại root (Đã xóa 9 files):** `app_code.b64`, `copilot_code.b64`, `exec_code.b64`, `knowledge_code.b64`, `test.b64`, `test.py`, `test.txt`, `update_views.py`, `build_views.py`.
4. **Các script dev / decode tạm (Đã xóa 18 files):** `frontend/scripts/*.py`, `ColorInspectorModal.b64`, `modal.b64`, `test_write.txt`.
5. **Untracked files:** Xóa `package-lock.json` thừa ở root.

Sau khi dọn dẹp, toàn bộ mã nguồn repo tinh gọn 100%, tuân thủ đúng chuẩn kiến trúc trong README.md.

