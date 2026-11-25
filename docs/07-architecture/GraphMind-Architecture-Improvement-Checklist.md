# GRAPHMIND — ARCHITECTURE IMPROVEMENT CHECKLIST (VER 1.0 ➔ VER 1.1)

> **Mục tiêu:** Lộ trình 4 giai đoạn nâng cấp `7.C1SE18_Architecture-Document-ver1.0.docx` lên **Ver 1.1** (đồng bộ 100% với SRS Ver 1.2, Database Design Ver 1.1 và Source Code thực tế), kèm các hạng mục cải thiện kiến trúc Source Code tách biệt rõ ràng.

---

## PHASE 1: CRITICAL — Vá Lỗ hổng Kiến trúc Cốt lõi & Sai lệch Sự thật

- [ ] **P1.1. Bổ sung PostgreSQL (System of Record) vào toàn bộ Architecture Views:**
  - Thêm Host PostgreSQL (`graph_mind`, port `5432` via `host.docker.internal`) vào **C&C View (Table 6.1)**, **Deployment View (Table 6.3)**, **Data Flow (§4.4)** và các sơ đồ Figure 2, Figure 4.
- [ ] **P1.2. Cập nhật Module View (Table 6.2) phản ánh trung thực cấu trúc Backend & Frontend:**
  - Ghi nhận rõ Backend gồm 3 vertical modules đang hoạt động (`m1_data_sync`, `m3_hybrid_copilot`, `m6_admin_security`), tầng `api/v1/` (`auth`, `copilot`, `dashboard`, `sop`, `shift_reports`, `pb56_workstations`, `rbac`), và `main.py` (kèm ghi chú nợ kỹ thuật refactor 37 inline routes sang `m2`, `m4`, `m5`).
  - Bổ sung bảng phân rã 6 module Frontend (`frontend/src/views/m1..m6`).
- [ ] **P1.3. Chốt đồng nhất Data & AI Stack với Source Code & DBD Ver 1.1:**
  - Sửa `768-dim nomic-embed-text` (Ollama) → **`384-dim all-MiniLM-L6-v2` (SentenceTransformer chạy trong Backend container)**; liệt kê 2 collection `cuad_contracts` và `adventureworks_entities`.
  - Sửa `MD5` → **`SHA-256`** (FD-01); sửa `PBKDF2` → **`bcrypt` (cost 12)** (Table 6.2).
- [ ] **P1.4. Bổ sung kiến trúc cho 10 tính năng mới (FR53–FR62):**
  - Thêm FD-06 (Document Upload Approval Workflow & Departmental Shift Handover + Ollama Consolidation Fallback).
  - Bổ sung đặc tả kiến trúc cho Dynamic 2D RBAC Matrix, Single Active Session JTI, Email OTP 3-step, Read-Only Cypher Guard, và AEGIS Emergency Kill Switch.
- [ ] **P1.5. Xóa mâu thuẫn Deployment & Cập nhật Table 6.3 khớp `docker-compose.yml`:**
  - Xóa câu *"backend API is hosted on a cloud platform"* ở §5.2 (chốt 100% On-Premise Single-Host).
  - Cập nhật Frontend container: `node:20-alpine -> nginx:alpine`, port **`5173:80`**.
  - Cập nhật image versions: **`neo4j:5.18.0`**, **`qdrant/qdrant:v1.8.2`**.
- [ ] **P1.6. Bổ sung mục §4.6 Security Architecture & ghi nhận lỗi CORS ở Source Code:**
  - Mô tả chuỗi phòng thủ đa tầng (JWT+JTI, 5 vai trò BR-04, RBAC Matrix, Cypher Guard AST, PR1 Layer-1 Qdrant Guard, Immutable Audit Log BR-03).
  - *(Code Action)* Sửa `CORSMiddleware` (`main.py:232–239`) bỏ `allow_origins=["*"]` khi `allow_credentials=True`.

---

## PHASE 2: HIGH — Đồng bộ Giao tiếp, Quality Attributes & Công nghệ

- [ ] **P2.1. Sửa giao tiếp AEGIS Agent (Table 6.1):** Đổi `"Direct Python Service calls"` thành **`HTTP REST (Webhook /api/v1/sync/* + Heartbeat 30s + 2-phase ACK)`**.
- [ ] **P2.2. Chuẩn hóa 5 Vai trò BR-04 (Table 2.2 & Table 4):** Tách `System & IT Administrator` và `Knowledge Administrator`, bổ sung `Department Manager`.
- [ ] **P2.3. Sửa Frontend Technology Stack (§4.4, §5.2, Table 7):** Thay `React / Next.js` & `TypeScript` thành **`React 18 + Vite SPA (JavaScript/JSX, D3-Force, Lucide Icons, Custom CSS)`**.
- [ ] **P2.4. Đồng nhất chỉ số QAS-01/04 với Utility Tree & SRS Ver 1.2 NFRs:** Chốt 1 bộ chỉ số Latency và Reconnection time duy nhất.
- [ ] **P2.5. Viết lại mục `CON-03 (Technology Stack Standards)`:** Xóa nội dung copy-paste nhầm của QAS-03.
- [ ] **P2.6. Bổ sung kiến trúc SSE Realtime (`useWatcherEvents.js`) & PR1 Crash Recovery (`reconcile_crashed_operations()`).**
- [ ] **P2.7. *(Code Actions)*:** Xóa 2 lệnh `include_router` trùng lặp trong `main.py`; đưa `API_BASE` (`api.js:6`) sang `VITE_API_URL` hoặc Nginx proxy.

---

## PHASE 3: MEDIUM — API Architecture, Testability, ADRs & Technical Debt

- [ ] **P3.1. Bổ sung mục §4.5 API & Integration Architecture:** Tóm tắt nhóm REST endpoints, SSE stream, Agent protocol và Global Exception Handling (`ConcurrentLoginException`).
- [ ] **P3.2. Bổ sung mục Testability vào Quality Attributes:** Ghi nhận kiến trúc kiểm thử với `tests/fakes/{fake_neo4j, fake_qdrant, test_app_factory}`.
- [ ] **P3.3. Bổ sung mục §6 Architecture Decision Records (5 ADRs):** (1) Modular Monolith vs Microservices, (2) Multi-Model Storage (PG + Neo4j + Qdrant), (3) Self-Hosted Ollama Q4_K_M + 384-dim Local Embedder, (4) Single-Worker In-Memory Lock Trade-off (`pipeline.py`), (5) Host Native PostgreSQL/Ollama vs Containerized.
- [ ] **P3.4. Ghi nhận Technical Debt & Lộ trình Refactor:** `main.py` (3.306 dòng), `nl2cypher_engine.py` (4.233 dòng), `mock_knowledge_db.py`, và bind-mount `D:/data:/data`.

---

## PHASE 4: LOW — Vệ sinh Tài liệu, Mục lục & Sơ đồ

- [ ] **P4.1. Cập nhật trang bìa & Metadata:** Đổi `Version: 1.1`, `Date: 23 Nov 2026` (nằm trong khung thời gian dự án), sửa `ThS.` → `PhD.`, `Chữ ký` → `Signature`, `File name: C1SE18_Architecture-Document-ver1.1.docx`, thêm bảng Revision History.
- [ ] **P4.2. Sửa lỗi Heading styles:** Sửa `4.3 Allocation / Deployment View` từ `Heading 4` về `Heading 2`; sửa đoạn chứa Figure 4 từ `Heading 2` về `Normal`.
- [ ] **P4.3. Hoàn thiện References:** Bổ sung đủ 6 tài liệu dự án (Table 3) và khôi phục nguyên văn tiếng Anh chuẩn IEEE cho 12 tài liệu tham khảo `[1]–[12]`.
- [ ] **P4.4. Cập nhật lại 5 sơ đồ hiện có và bổ sung 2 sơ đồ mới** (Security Architecture & Document Approval/Shift Data Flow).
