# Báo Cáo Đánh Giá Chất Lượng Mã Nguồn (Code Review Report)

> **Dự án:** GraphMind (EKAI) — GraphRAG-based Enterprise Knowledge Management Platform for SME Decision Support  
> **Ngày đánh giá:** 22/09/2026  
> **Tiêu chuẩn áp dụng:** [SKILL (2).md](../../SKILL%20(2).md) — Multi-axis Code Review & Quality Gates  
> **Phạm vi:** Toàn bộ mã nguồn sau tái cấu trúc (`backend/app/`, `frontend/src/`, `aegis-agent/`, `infra/`, `docs/`)

---

## 1. Tóm tắt kết quả đánh giá (Executive Summary)

Hệ thống đã trải qua đợt khảo sát và tái cấu trúc cấu trúc thư mục thành công, chuyển từ kiến trúc phẳng/hỗn hợp (Node.js + Python) sang kiến trúc chuẩn hóa theo đúng 6 module của Proposal và SRS (FastAPI + React 18). Giao diện frontend (Vite React) có độ hoàn thiện mỹ thuật và trải nghiệm người dùng (UX) rất cao, hỗ trợ song ngữ Việt - Anh và mô phỏng tốt 4 vai trò hệ thống.

Tuy nhiên, về mặt kỹ thuật backend và bảo mật, hệ thống hiện đang ở giai đoạn **Mock / Prototype phục vụ trình diễn (Sprint 1)**. Phần lớn logic cốt lõi (Hybrid Query Engine, xác thực JWT/OAuth2, kết nối Neo4j/Qdrant/PostgreSQL thật) chưa được hiện thực hóa ở tầng server mà đang dựa vào dữ liệu in-memory tĩnh.

### Bảng phân bổ phát hiện theo mức độ nghiêm trọng:
| Mức độ | Số lượng | Trọng tâm |
|---|:---:|---|
| **Critical** | 3 | Lỗ hổng bỏ trống Authentication/Authorization, Enforce RBAC hoàn toàn ở UI, Hardcode API Key |
| **High** | 4 | Hybrid Query Engine chưa phân tách thành phần, Thiếu thực thể `Clause`, Lỗ hổng CORS `*`, Nuốt lỗi ngoại lệ ở API client |
| **Medium** | 5 | Quan hệ đồ thị chưa chuẩn hóa Cypher, Thiếu kiểm tra phân trang (Pagination), Thiếu Test suite (0% coverage), Caching localStorage không có TTL |
| **Low / Nit** | 4 | Type hints chưa đồng bộ, Thiếu Docstring chuẩn Google/Numpy format, Thừa thư viện chưa dùng trong `package.json` |

---

## 2. Chi tiết đánh giá theo 5 tiêu chí chính

### 2.1 Tiêu chí 1: Bảo mật (Security & Authorization)

#### [Critical] SEC-01: Chưa có cơ chế Authentication (JWT/OAuth2) ở Backend
- **Vị trí:** [backend/app/main.py](../../backend/app/main.py), [frontend/src/services/api.js](../../frontend/src/services/api.js)
- **Hiện trạng:** Các endpoint nhạy cảm như `/api/graph/verify` (thay đổi trạng thái xác thực thực thể), `/api/copilot/ask` (truy vấn tri thức doanh nghiệp), `/api/connectors` hoàn toàn không có decorator bảo vệ (như `Depends(get_current_user)`). Bất kỳ client nào gửi request HTTP đều có thể đọc/ghi dữ liệu.
- **Rủi ro:** Vi phạm nghiêm trọng chuẩn mực bảo mật doanh nghiệp SME; người ngoài có thể làm sai lệch đồ thị tri thức hoặc trích xuất dữ liệu nội bộ.
- **Đề xuất khắc phục:** Hiện thực hóa `backend/app/core/security.py` (sử dụng `python-jose` và `passlib`), tạo route đăng nhập `backend/app/modules/m6_admin_security/auth_api.py` trả về JWT bearer token và gắn dependency vào toàn bộ router.

#### [Critical] SEC-02: RBAC & Department Scope chỉ được kiểm tra ở tầng giao diện (Client-side Only)
- **Vị trí:** [frontend/src/App.jsx](../../frontend/src/App.jsx), [frontend/src/components/Topbar.jsx](../../frontend/src/components/Topbar.jsx)
- **Hiện trạng:** Việc phân quyền 4 vai trò (*System Admin, Executive, Department Manager, Standard User*) chỉ được kiểm soát qua state `role` trong React và lưu tạm tại `localStorage.getItem('aegis_role')`. Người dùng có thể dễ dàng sửa `localStorage` hoặc gửi request trực tiếp bằng Postman/curl để vượt qua mọi rào cản phân quyền.
- **Rủi ro:** Không đảm bảo Data Isolation giữa các phòng ban (ví dụ: Nhân viên Sales có thể đọc dữ liệu nhân sự/lương nếu gọi thẳng API).
- **Đề xuất khắc phục:** Xây dựng `backend/app/core/rbac.py` định nghĩa quyền hạn (Permissions) và Department Scope. Mỗi API call phải giải mã token, lấy `user_id` và `department_id` từ cơ sở dữ liệu để lọc dữ liệu ở tầng truy vấn DB (Row-level / Node-level Security).

#### [High] SEC-03: Cấu hình CORS quá mở (`allow_origins=["*"]`)
- **Vị trí:** [backend/app/main.py](../../backend/app/main.py#L28-L34)
- **Hiện trạng:** Backend cấu hình `allow_origins=["*"]` kết hợp `allow_credentials=True`.
- **Rủi ro:** Tiềm ẩn lỗ hổng Cross-Origin Request Forgery và rò rỉ dữ liệu khi triển khai môi trường staging/production.
- **Đề xuất khắc phục:** Đọc danh sách allowed origins từ file cấu hình `.env` (`CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`).

---

### 2.2 Tiêu chí 2: Đúng Schema chuẩn (7 Entities: Customer, Product, Order, Employee, Vendor, Contract, Clause)

#### [High] SCH-01: Thiếu thực thể `Clause` (Điều khoản hợp đồng) trong Mock DB
- **Vị trí:** [backend/app/db/mock_knowledge_db.py](../../backend/app/db/mock_knowledge_db.py)
- **Hiện trạng:** Dữ liệu mock hiện tại chỉ chứa 6 loại thực thể: `CUSTOMER` (`abc`, `delta`), `CONTRACT` (`ct18`), `PRODUCT` (`prodA`), `EMPLOYEE` (`le_v_hung`, `eva_chase`), `VENDOR` (`vnpt_partner`), `ORDER` (`ord1023`). Hoàn toàn vắng bóng thực thể `Clause`.
- **Rủi ro:** Không thể biểu diễn việc phân tích rủi ro pháp lý từ bộ dữ liệu CUAD (một trong 2 nguồn dữ liệu nghiên cứu cốt lõi của đề tài).
- **Đề xuất khắc phục:** Thêm các nút thực thể mẫu đại diện cho `Clause` (ví dụ: `clause-term-penalty`, `clause-liability-cap`) gắn với hợp đồng `ct18` thông qua quan hệ `:CONTAINS_CLAUSE`.

#### [Medium] SCH-02: Quan hệ đồ thị dạng tự do, chưa chuẩn hóa Cypher
- **Vị trí:** [backend/app/db/mock_knowledge_db.py](../../backend/app/db/mock_knowledge_db.py#L67-L71)
- **Hiện trạng:** Các relationship đang được lưu dạng chuỗi tự nhiên có dấu cách: `"Customer of"`, `"Signed by"`, `"Purchased"`, `"Expires on"`.
- **Rủi ro:** Khi chuyển sang Neo4j thật, các quan hệ này sẽ gây lỗi cú pháp Cypher hoặc khó lập chỉ mục.
- **Đề xuất khắc phục:** Định nghĩa enum các loại quan hệ chuẩn trong `backend/app/db/neo4j/schema/relations.py`:
  - `(:CUSTOMER)-[:PURCHASED]->(:PRODUCT)`
  - `(:CUSTOMER)-[:SIGNED_CONTRACT]->(:CONTRACT)`
  - `(:CONTRACT)-[:CONTAINS_CLAUSE]->(:CLAUSE)`
  - `(:CONTRACT)-[:MANAGED_BY]->(:EMPLOYEE)`
  - `(:VENDOR)-[:SUPPLIES]->(:PRODUCT)`

---

### 2.3 Tiêu chí 3: Hybrid Query Engine (Intent Classifier → Graph + Vector Retriever → Fusion → LLM)

#### [High] HQE-01: Luồng Copilot đang monolithic và hardcoded
- **Vị trí:** [backend/app/main.py](../../backend/app/main.py#L110-L140) (`copilot_reasoning`)
- **Hiện trạng:** Toàn bộ phản hồi hỏi đáp được trả về từ một mẫu JSON tĩnh cố định trong code, không có bất kỳ bước xử lý suy luận hay truy vấn dữ liệu nào.
- **Đánh giá kiến trúc:**
  - Chưa có **Intent Classifier**: Không phân loại được câu hỏi là dạng đồ thị (aggregation, multi-hop), dạng ngữ nghĩa (semantic doc search), hay dạng kết hợp.
  - Chưa có **Graph Retriever (Text-to-Cypher)**: Không sinh Cypher truy vấn vào Neo4j.
  - Chưa có **Vector Retriever**: Chưa nhúng embedding câu hỏi và tìm kiếm tương đồng trên Qdrant.
  - Chưa có **Context Fusion**: Chưa có thuật toán trộn ngữ cảnh (như RRF - Reciprocal Rank Fusion) để ghép tri thức cấu trúc và phi cấu trúc.
  - Chưa kết nối **LLM Inference**: Chưa gọi tới Qwen2.5-7B-Instruct.
- **Đề xuất khắc phục:** Tách hàm này thành các module độc lập trong `backend/app/modules/m3_hybrid_copilot/query_engine/`:
  - `intent_classifier.py`
  - `text_to_cypher.py`
  - `vector_retriever.py`
  - `context_fusion.py`
  - `hybrid_query_engine.py` (bộ điều phối chính)

---

### 2.4 Tiêu chí 4: Chất lượng chung & Độ tin cậy mã nguồn (Code Quality)

#### [High] QUAL-01: Nuốt ngoại lệ (Silent Exception Swallowing) ở tầng API Client
- **Vị trí:** [frontend/src/services/api.js](../../frontend/src/services/api.js#L22,L30,L42,L54)
- **Hiện trạng:** Các hàm `fetchSignals`, `fetchEntities`, `verifyEntityApi`, `queryCopilot` đều sử dụng cú pháp:
  ```javascript
  catch (e) {}
  return null;
  ```
- **Rủi ro:** Khi backend gặp lỗi 500 hoặc lỗi mạng, frontend không hề ghi log lỗi ra console và không hiển thị thông báo thân thiện (toast/alert) cho người dùng, gây khó khăn cực lớn khi debug.
- **Đề xuất khắc phục:** Log rõ lỗi `console.error("[API Error]", e)` và trả về cấu trúc lỗi `{ success: false, error: e.message }` để UI hiển thị thông báo phù hợp.

#### [Medium] QUAL-02: Hoàn toàn chưa có Test Suite (0% Test Coverage)
- **Vị trí:** `backend/app/tests/`, `frontend/`
- **Hiện trạng:** Chưa có bất kỳ test case nào (pytest hay vitest).
- **Đề xuất khắc phục:** Viết các test case tối thiểu trong Sprint 2:
  - Unit test cho Pydantic schemas và logic xác thực JWT.
  - Integration test kiểm tra endpoint `/api/health`, `/api/signals`, `/api/graph/entities`.

---

### 2.5 Tiêu chí 5: Nợ kỹ thuật so với các hạng mục Optional/Stretch

Xác nhận đối chiếu với các mục mở rộng (PB06, PB13, PB14, PB31, PB40, PB59, PB65, PB66):

| Mã Backlog | Tên chức năng | Đánh giá hiện trạng trong code | Tác động đến luồng Core |
|---|---|---|:---:|
| **PB06** | Google Drive / Sheets Connector | Đã có giao diện trong `ConnectorsView.jsx`, hiển thị trạng thái giả lập. Chưa có OAuth2 Google thật. | **Không chặn** |
| **PB13/PB14** | Admin CRUD Neo4j & Qdrant trực tiếp | Nút bấm xác thực người dùng trên `KnowledgeView.jsx` hoạt động với Mock API. Chưa có trình soạn thảo graph trực tiếp. | **Không chặn** |
| **PB31** | Hiển thị chỉ số độ tin cậy AI (Reliability Indicator) | Hiển thị cố định `confidenceScore: 87%` trên `CopilotView.jsx`. | **Không chặn** |
| **PB40** | Cảnh báo cho Standard User | Dữ liệu `AI_SIGNALS` hiển thị dùng chung cho cả 4 role. | **Không chặn** |
| **PB59** | Ghim phiên trò chuyện (Pinned Sessions) | Có danh sách mock trong `CopilotView.jsx`, reset khi refresh trang. | **Không chặn** |
| **PB65** | Trình tạo tóm tắt báo cáo lãnh đạo (Executive Briefing) | Có giao diện `ReportsView.jsx` xuất văn bản mẫu dựa trên state. | **Không chặn** |
| **PB66** | LLMOps & Cost Dashboard | Có biểu đồ và số liệu mẫu tại `AdminView.jsx` (`LLMOPS_METRICS`). | **Không chặn** |

**Kết luận:** Tất cả các tính năng Stretch/Optional hiện tại chỉ nằm ở tầng UI mock, hoàn toàn **không gây nghẽn (blocking)** tiến độ xây dựng các tính năng Core của Sprint 1 và Sprint 2.

---

## 3. Lộ trình khuyến nghị cho Sprint tiếp theo (Sprint 2)

1. **Ưu tiên 1 (Bảo mật & Auth Core):** Xây dựng bảng `User`, `Department`, `AuditLog` với SQLAlchemy + Alembic trong `backend/app/db/postgres/`; hiện thực hóa đăng nhập JWT và middleware kiểm tra RBAC ở server.
2. **Ưu tiên 2 (Data Foundation):** Kết nối Neo4j và Qdrant thật thông qua `docker-compose.yml`; import bộ schema 7 thực thể chuẩn hóa vào Neo4j.
3. **Ưu tiên 3 (Modularization Hybrid Engine):** Tách logic `/api/copilot/ask` theo đúng kiến trúc 5 tầng của Module 3.
