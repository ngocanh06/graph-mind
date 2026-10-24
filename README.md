# GraphMind (AEGIS EKMP) — Enterprise Knowledge Observatory

> **Hệ thống Quản trị Tri thức Doanh nghiệp & Trợ lý Điều hành Chiến lược (Hybrid GraphRAG)**  
> *Capstone Project 1 — C1SE.18 — International School, Duy Tan University*  
> Tài liệu hướng dẫn thiết lập môi trường phát triển cục bộ (Local Development & Deployment) dành riêng cho thành viên nhóm trên nền tảng **Windows (PowerShell & Docker Desktop)**.

---

## Mục lục

1. [Tổng quan Kiến trúc Hệ thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Bảng Kiến trúc Docker & Dịch vụ](#2-bảng-kiến-trúc-docker-dịch-vụ)
3. [Yêu cầu Tiên quyết (Prerequisites)](#3-yêu-cầu-tiên-quyết-prerequisites)
4. [Clone Project & Checkout Nhánh](#4-clone-project-checkout-nhánh)
5. [Cấu hình Biến Môi trường (Environment Variables)](#5-cấu-hình-biến-môi-trường-environment-variables)
6. [Central Docker Storage — Cơ chế Lưu trữ & Khởi tạo Volume](#6-central-docker-storage-cơ-chế-lưu-trữ-khởi-tạo-volume)
7. [Khởi động Hệ thống](#7-khởi-động-hệ-thống)
8. [Kiểm tra Tình trạng Hệ thống (Health Check)](#8-kiểm-tra-tình-trạng-hệ-thống-health-check)
9. [Chuẩn bị & Nạp Dữ liệu (Dataset Ingestion)](#9-chuẩn-bị-nạp-dữ-liệu-dataset-ingestion)
   - [9.1. Bộ dữ liệu Hợp đồng Pháp lý CUAD (510 PDFs)](#91-bộ-dữ-liệu-hợp-đồng-pháp-lý-cuad-510-pdfs)
   - [9.2. Bộ dữ liệu Vận hành Doanh nghiệp AdventureWorks (71 CSVs)](#92-bộ-dữ-liệu-vận-hành-doanh-nghiệp-adventureworks-71-csvs)
   - [9.3. Phương án A: Khởi tạo Dữ liệu Mẫu Doanh nghiệp Tự động (Zero External Files)](#93-phương-án-a-khởi-tạo-dữ-liệu-mẫu-doanh-nghiệp-tự-động-zero-external-files-khuyên-dùng-chạy-thử-ngay)
   - [9.4. Phương án B: Nạp Gói Dữ liệu Đồ án Đầy đủ (581 Files / 9.142 Vectors)](#94-phương-án-b-nạp-gói-dữ-liệu-đồ-án-đầy-đủ-581-files-9142-vectors-khuyến-nghị-cho-cả-nhóm)
   - [9.5. Phương án C: Nạp hàng loạt từ thư mục dataset rời (Bulk Ingest Script)](#95-phương-án-c-nạp-hàng-loạt-từ-thư-mục-dataset-rời-bulk-ingest-script)
   - [9.6. Phương án D: Tải tệp lên qua Web Dashboard UI (Zero-code)](#96-phương-án-d-tải-tệp-lên-qua-web-dashboard-ui-zero-code)
10. [Xác minh Tính Nhất quán 3 Lớp Dữ liệu (Data Consistency Verification)](#10-xác-minh-tính-nhất-quán-3-lớp-dữ-liệu-data-consistency-verification)
11. [Cơ chế Chống Trùng lặp & Toàn vẹn Dữ liệu (Idempotency)](#11-cơ-chế-chống-trùng-lặp-toàn-vẹn-dữ-liệu-idempotency)
12. [Cơ chế Đồng bộ Tệp Thời gian thực (Realtime File Watcher)](#12-cơ-chế-đồng-bộ-tệp-thời-gian-thực-realtime-file-watcher)
13. [Thiết lập Trợ lý AI Cục bộ (Ollama Local LLM)](#13-thiết-lập-trợ-lý-ai-cục-bộ-ollama-local-llm)
14. [Xóa Trắng & Khôi phục Môi trường Sạch (Database Reset)](#14-xóa-trắng-khôi-phục-môi-trường-sạch-database-reset)
15. [Hướng dẫn Sử dụng Web Dashboard](#15-hướng-dẫn-sử-dụng-web-dashboard)
16. [Quy trình Setup Chuẩn cho Thành viên Mới (10 Bước Khép Kín)](#16-quy-trình-setup-chuẩn-cho-thành-viên-mới-10-bước-khép-kín)
17. [Quy tắc Git & Hợp tác Nhóm](#17-quy-tắc-git-hợp-tác-nhóm)
18. [Xử lý Sự cố Thường gặp (Troubleshooting)](#18-xử-lý-sự-cố-thường-gặp-troubleshooting)
19. [Quick Start (Dành cho Developer Đã Hiểu Dự án)](#19-quick-start-dành-cho-developer-đã-hiểu-dự-án)
20. [Vấn đề Tồn đọng & Kế hoạch Tiếp theo (Known Issues / TODO)](#20-vấn-đề-tồn-đọng-kế-hoạch-tiếp-theo-known-issues-todo)

---

## 1. Tổng quan Kiến trúc Hệ thống

Dự án GraphMind (AEGIS EKMP) vận hành theo mô hình kiến trúc **Hybrid GraphRAG** khép kín cục bộ. **Mỗi thành viên trong nhóm sẽ có môi trường độc lập hoàn toàn trên máy tính cá nhân**, bao gồm Docker volume riêng, File Watcher riêng, cơ sở dữ liệu Vector (Qdrant) riêng và cơ sở dữ liệu Đồ thị (Neo4j) riêng. **Không chia sẻ chung VPS/Server trong giai đoạn phát triển.**

```mermaid
flowchart TD
    subgraph ClientLayer["Lớp Giao diện & Người dùng"]
        User["Người dùng / Trưởng phòng"] -->|Truy cập trình duyệt: Port 5173| Frontend["React + Vite Frontend (graphmind_frontend)"]
    end

    subgraph AppLayer["Lớp Ứng dụng & Đồng bộ"]
        Frontend -->|Proxy /api: Port 5000| Backend["FastAPI Backend (graphmind_backend)"]
        Backend -->|Ghi tệp tải lên| CentralStorage["Central Document Storage\nDocker Volume: graph-mind_graphmind_documents\n(Mount path: /data)"]
        CentralStorage -->|Giám sát đệ quy| FileWatcher["AEGIS File Watcher (aegis_file_watcher)\nDaemon watchdog"]
        FileWatcher -->|Gửi sự kiện qua Webhook HTTP /api/v1/sync/file-watcher| Backend
    end

    subgraph PipelineLayer["Lớp Xử lý Lõi (Unified Ingestion Pipeline)"]
        Backend -->|SHA-256 Deduplication & Chunking| IngestCore["Ingestion Pipeline (pipeline.py)"]
        IngestCore -->|384-d Dense Embedding\nall-MiniLM-L6-v2| Qdrant[("Qdrant Vector DB (qdrant_db)\nCollection: cuad_contracts\nPort: 6333 / 6334")]
        IngestCore -->|Cypher MERGE Entities & Relations| Neo4j[("Neo4j Graph DB (neo4j_db)\nBolt Port: 7687 | HTTP: 7474\nDocument, Clause, Customer, Product")]
        IngestCore -->|Phát sự kiện SSE /api/v1/sync/file-watcher/events| Frontend
    end

    subgraph InferenceLayer["Lớp Suy luận Trí tuệ Nhân tạo (Hybrid Copilot)"]
        Frontend -->|Hỏi đáp Copilot: /api/v1/copilot/ask| Backend
        Backend -->|Vector Semantic Search| Qdrant
        Backend -->|Text-to-Cypher Graph Traversal| Neo4j
        Backend -->|Reciprocal Rank Fusion k=60| Fusion["Context Fusion Engine"]
        Fusion -->|Prompt có Trích dẫn Chứng cứ| Ollama["Ollama Local LLM (Host: Port 11434)\nModel: qwen2.5-7b-graphmind"]
        Ollama -->|Trả câu trả lời có bằng chứng| Frontend
    end
```

> **Nguyên tắc cốt lõi về lưu trữ:**
> - **Central Storage (`/data`)**: Là **nơi duy nhất** lưu trữ các tệp văn bản gốc (.pdf, .csv, .xlsx).
> - **Qdrant Vector DB**: Chỉ lưu trữ các vector nhúng ngữ nghĩa (embeddings 384 chiều) kèm đoạn trích text (chunks), **không lưu trữ tệp PDF/CSV gốc**.
> - **Neo4j Graph DB**: Chỉ lưu trữ cấu trúc mạng tri thức (thực thể Document, Điều khoản Clause, Khách hàng Customer, Sản phẩm Product và các mối quan hệ `CONTAINS_CLAUSE`, `PURCHASED`, `BELONGS_TO_DEPT`), **không lưu trữ tệp gốc**.

---

## 2. Bảng Kiến trúc Docker & Dịch vụ

Dự án định nghĩa các dịch vụ trong file [docker-compose.yml](docker-compose.yml):

| Dịch vụ (Service) | Tên Container (`container_name`) | Cổng Host : Cổng Container | Volume / Mount Path | Mục đích & Vai trò |
|---|---|---|---|---|
| **neo4j** | `neo4j_db` | `7474:7474`<br>`7687:7687` | `./neo4j_data:/data`<br>`./neo4j_import:/var/lib/neo4j/import` | Cơ sở dữ liệu đồ thị Neo4j 5.18.0 (APOC plugin enabled). Lưu trữ thực thể và liên kết tri thức. |
| **qdrant** | `qdrant_db` | `6333:6333`<br>`6334:6334` | `./qdrant_data:/qdrant/storage` | Cơ sở dữ liệu vector Qdrant 1.8.2. Lưu trữ vector nhúng đoạn trích hợp đồng (384 chiều, model `all-MiniLM-L6-v2`) và tìm kiếm ngữ nghĩa. |
| **file-watcher** | `aegis_file_watcher` | Cổng nội bộ | `graphmind_documents:/data` | Tiến trình Daemon giám sát biến động thư mục Central Storage (`watchdog`), gửi webhook đồng bộ tức thì sang Backend. |
| **backend** *(tùy chọn trong Docker)* | `graphmind_backend` | `5000:5000` | `graphmind_documents:/data` | API Server Python FastAPI (Python 3.11-slim). Xử lý ingestion pipeline, xác thực, điều hướng truy vấn GraphRAG. |
| **frontend** *(tùy chọn trong Docker)* | `graphmind_frontend` | `5173:80` | Không gắn volume | Giao diện Web Dashboard React + Vite đóng gói qua Nginx reverse proxy. |

*Lưu ý:* Mạng nội bộ kết nối các container là mạng bridge: `graphmind-net`.

---

## 3. Yêu cầu Tiên quyết (Prerequisites)

Mỗi thành viên cần chuẩn bị máy tính cài hệ điều hành **Windows 10 hoặc Windows 11 (64-bit)** và mở terminal **PowerShell** (quyền Administrator khi cần) để kiểm tra các phần mềm bắt buộc sau:

```powershell
# 1. Kiểm tra Docker Engine và Docker Compose (Bắt buộc phải bật Docker Desktop trước)
docker --version
docker compose version

# 2. Kiểm tra Git
git --version

# 3. Kiểm tra Python (Bắt buộc nếu chạy script nạp dữ liệu hoặc chạy backend trực tiếp ngoài host)
python --version    # Yêu cầu Python 3.10 trở lên, khuyến nghị Python 3.11/3.12

# 4. Kiểm tra Node.js & npm (Bắt buộc nếu phát triển Frontend trực tiếp ngoài host)
node --version      # Khuyến nghị Node.js v18 hoặc v20 LTS
npm --version
```

> [!IMPORTANT]
> - **Docker Desktop** phải đang ở trạng thái **Running** (biểu tượng cá voi màu xanh lá ở khay hệ thống) với cấu hình WSL 2 Backend được kích hoạt.
> - Cấu hình tài nguyên khuyến nghị cho Docker Desktop: RAM tối thiểu 8GB (khuyến nghị 16GB RAM máy thực) để vận hành đồng thời Neo4j, Qdrant và Ingestion Pipeline.

---

## 4. Clone Project & Checkout Nhánh

Mở PowerShell tại thư mục làm việc của bạn (ví dụ `C:\Projects\` hoặc thư mục tùy chọn trên máy):

```powershell
# Clone mã nguồn từ GitHub chính thức
git clone https://github.com/ngocanh06/graph-mind.git
cd graph-mind

# Kiểm tra các nhánh và checkout về nhánh làm việc hiện tại
git fetch origin
git checkout Standard-User
```

*Ghi chú:* Nhánh triển khai tính năng và dữ liệu đầy đủ nhất hiện tại là nhánh `Standard-User` (hoặc nhánh `main` nếu đã hoàn tất merge).

---

## 5. Cấu hình Biến Môi trường (Environment Variables)

Hệ thống sử dụng file cấu hình `.env` tại thư mục gốc và thư mục `backend/`. Copy file mẫu bằng lệnh PowerShell:

```powershell
# Tạo file .env tại thư mục gốc
Copy-Item .env.example .env

# Tạo file .env cho Backend
Copy-Item backend\.env.example backend\.env
```

### 5.1. Bảng Ý nghĩa Biến Môi trường

| Nhóm cấu hình | Tên biến | Giá trị Mặc định cho Host Windows | Giá trị khi chạy trong Docker | Ý nghĩa & Mục đích |
|---|---|---|---|---|
| **Application** | `APP_ENV` | `development` | `development` | Chế độ chạy ứng dụng (`development` / `production`). |
| | `PORT` | `5000` | `5000` | Cổng HTTP lắng nghe của Backend API. |
| | `FRONTEND_PORT` | `5173` | `5173` | Cổng phục vụ của Frontend Dashboard. |
| **Security & Auth** | `SECRET_KEY` | `change-me-to-a-secure-random-secret-key` | `change-me` | Chuỗi khóa bí mật mã hóa JWT Access Token. |
| | `ALGORITHM` | `HS256` | `HS256` | Thuật toán ký mã hóa token JWT. |
| | `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | `60` | Thời gian sống của token đăng nhập (phút). |
| **Relational DB** | `POSTGRES_SERVER` | `localhost` | `host.docker.internal` (hoặc `postgres`) | Địa chỉ máy chủ PostgreSQL quan hệ (quản lý User/Audit). |
| | `POSTGRES_PORT` | `5432` | `5432` | Cổng kết nối PostgreSQL. |
| | `POSTGRES_USER` | `postgres` | `postgres` | Tài khoản đăng nhập PostgreSQL. |
| | `POSTGRES_PASSWORD` | `12345678` | `12345678` | Mật khẩu tài khoản PostgreSQL. |
| | `POSTGRES_DB` | `graph_mind` | `graph_mind` | Tên cơ sở dữ liệu quan hệ. |
| | `DATABASE_URL` | `postgresql://postgres:12345678@localhost:5432/graph_mind` | `postgresql://postgres:12345678@postgres:5432/graph_mind` | Connection string đồng bộ. |
| **Neo4j Graph DB** | `NEO4J_URI` | `bolt://localhost:7687` | `bolt://neo4j:7687` | URI giao thức Bolt kết nối Neo4j. |
| | `NEO4J_USER` | `neo4j` | `neo4j` | Tài khoản quản trị Neo4j. |
| | `NEO4J_PASSWORD` | `graphmind_secret` | `graphmind_secret` | Mật khẩu xác thực Neo4j (khớp với `docker-compose.yml`). |
| **Qdrant Vector DB**| `QDRANT_HOST` | `localhost` | `qdrant` | Địa chỉ kết nối Qdrant REST API. |
| | `QDRANT_PORT` | `6333` | `6333` | Cổng REST API của Qdrant. |
| | `QDRANT_COLLECTION_NAME`| `cuad_contracts` | `cuad_contracts` | Tên Collection chứa các điểm vector (dim: 384, model: `all-MiniLM-L6-v2`). |
| **LLM Inference** | `INFERENCE_ENGINE_URL`| `http://localhost:11434` | `http://host.docker.internal:11434` | URL dịch vụ Ollama cục bộ phục vụ sinh văn bản. |
| | `MODEL_NAME` | `qwen2.5-7b-graphmind` | `qwen2.5-7b-graphmind` | Tên mô hình ngôn ngữ lớn đã nạp trong Ollama. |
| **File Watcher** | `AEGIS_AGENT_API_KEY` | `dev-agent-key` | `dev-agent-key` | Khóa xác thực API bảo vệ Webhook truyền tệp của Agent. |
| | `WATCH_ROOT` | `/data` | `/data` | Đường dẫn mount trong container giám sát tệp tin. |

### 5.2. Cơ sở dữ liệu Quan hệ PostgreSQL & Quản lý Migration
- **Vai trò trong hệ thống:** Quản lý bảng tài khoản người dùng (`users`), quyền hạn phòng ban (`rbac_permissions`), lịch sử hội thoại Copilot (`copilot_sessions`), văn bản quy trình chuẩn (`sop_documents`), và nhật ký kiểm toán (`audit_logs`).
- **Khởi động PostgreSQL trên máy cá nhân:**
  - *Cách 1 (Nếu máy bạn đã có sẵn PostgreSQL cục bộ):* Đảm bảo dịch vụ PostgreSQL đang chạy trên cổng 5432 với tài khoản `postgres`, mật khẩu `12345678` và đã tạo sẵn database `graph_mind`.
  - *Cách 2 (Khởi chạy nhanh qua Docker 1 dòng lệnh — Khuyến nghị):*
    ```powershell
    docker run -d --name graphmind_postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=12345678 -e POSTGRES_DB=graph_mind postgres:16-alpine
    ```
- **Tự động khởi tạo Schema & Migration:**
  - Khi Backend khởi động, hàm `create_all_tables()` trong `lifespan` sẽ **tự động gọi SQLAlchemy `Base.metadata.create_all`** để khởi tạo đầy đủ các bảng dữ liệu nếu bảng chưa tồn tại.
  - Nếu muốn nâng cấp hoặc chạy migration thủ công bằng Alembic:
    ```powershell
    cd backend
    alembic upgrade head
    ```
- *Lưu ý về tính độc lập:* Nếu PostgreSQL chưa được bật, Backend sẽ ghi nhận cảnh báo `[WARN] PostgreSQL not available`, nhưng **vẫn khởi động bình thường** và phục vụ đầy đủ tính năng tra cứu Đồ thị Neo4j, Vector Qdrant, Central Storage và AI Copilot.

---

## 6. Central Docker Storage — Cơ chế Lưu trữ & Khởi tạo Volume

Hệ thống sử dụng một **Docker Named Volume độc lập** tên là `graph-mind_graphmind_documents` đóng vai trò là Central Storage (kho dữ liệu dùng chung duy nhất cho raw files giữa Backend và File Watcher).

### 6.1. Cơ chế Tạo Volume Tự động
File [docker-compose.yml](docker-compose.yml) đã được cấu hình với tên volume định danh:
```yaml
services:
  backend:
    volumes:
      - graphmind_documents:/data

  file-watcher:
    volumes:
      - graphmind_documents:/data

volumes:
  graphmind_documents:
    name: graph-mind_graphmind_documents
```

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC VỀ DOCKER VOLUME:**
> - Volume **KHÔNG khai báo `external: true`**.
> - Cả `backend` và `file-watcher` đều mount cùng volume `graphmind_documents` vào đường dẫn `/data`.
> - **Khi thành viên mới clone project về:** Volume chưa tồn tại trên máy bạn. Khi bạn chạy lệnh `docker compose up -d`, Docker Compose sẽ **tự động khởi tạo volume `graph-mind_graphmind_documents`**.
> - **Khi volume đã tồn tại trên máy:** Docker Compose sẽ gắn kết nối và **giữ nguyên toàn bộ dữ liệu hiện có**, không xóa hay ghi đè.

### 6.2. Lệnh Kiểm tra Volume & Mount Path
Mỗi thành viên chỉ cần chạy 3 lệnh sau trong PowerShell để xác thực volume:

```powershell
# 1. Kiểm tra cấu hình compose hợp lệ
docker compose config

# 2. Khởi động các container và tự động tạo volume
docker compose up -d neo4j qdrant file-watcher

# 3. Liệt kê danh sách volume để xác nhận volume đã tồn tại
docker volume ls --filter name=graph-mind_graphmind_documents
```

Xác minh File Watcher thực sự mount volume vào `/data`:
```powershell
# Kiểm tra mount point của container aegis_file_watcher
docker inspect aegis_file_watcher --format '{{ range .Mounts }}{{ if eq .Destination "/data" }}{{ .Name }} -> {{ .Destination }}{{ end }}{{ end }}'

# Xem danh sách thư mục bên trong volume
docker exec aegis_file_watcher ls -la /data
```

### 6.3. Lưu ý Đặc biệt: Phân biệt "Tạo Volume" với "Nạp Dữ liệu"
- **Tạo Volume:** Khi mới được Docker tạo ra trên máy mới, volume này **HOÀN TOÀN TRỐNG (0 files)**.
- **Nạp Dữ liệu:** Để hệ thống có dữ liệu phục vụ Qdrant & Neo4j, thành viên cần thực hiện nạp dữ liệu theo [Mục 9](#9-chuẩn-bị--nạp-dữ-liệu-dataset-ingestion). Hệ thống hỗ trợ chế độ Demo tạo dữ liệu mẫu tự động trong 5-10 giây mà không cần tải bất kỳ tệp nặng nào từ bên ngoài.

### 6.4. Cấu trúc Thư mục Bên trong Central Storage (`/data`)
Toàn bộ tài liệu được chia theo 5 phòng ban chuẩn tắc (Canonical Departments):
```text
/data/
├── legal/                     # Hợp đồng pháp lý CUAD (.pdf, .txt)
├── sales/                     # Dữ liệu khách hàng, đơn hàng (.csv)
├── accounting_procurement/    # Dữ liệu mua hàng, nhà cung ứng (.csv)
├── it/                        # Tài liệu kỹ thuật, kiến trúc hệ thống (.txt, .md)
└── rnd/                       # Nghiên cứu & phát triển, tài liệu kỹ thuật (.xlsx, .csv)
```

---

## 7. Khởi động Hệ thống

Dự án hỗ trợ 2 chế độ khởi động tùy theo nhu cầu làm việc của thành viên:

### Chế độ A: Khởi động Hoàn toàn bằng Docker (Đóng gói Toàn diện)

Chế độ này đóng gói toàn bộ Frontend (Nginx), Backend (FastAPI), File Watcher, Neo4j và Qdrant vào 5 container độc lập:

```powershell
# 1. Khởi động toàn bộ container chạy ngầm
docker compose up -d

# 2. Kiểm tra trạng thái danh sách container
docker compose ps
```

Kết quả mong đợi: Cả 5 container (`neo4j_db`, `qdrant_db`, `graphmind_backend`, `graphmind_frontend`, `aegis_file_watcher`) đều hiển thị trạng thái `Up` hoặc `Up (healthy)`.

*Lưu ý kỹ thuật:* Khi Backend chạy bên trong container `graphmind_backend`, container kết nối với cơ sở dữ liệu qua mạng nội bộ `graphmind-net` (`bolt://neo4j:7687`, `qdrant:6333`). Để kết nối tới Ollama đang chạy trên máy chủ Windows host, backend sử dụng mapping mạng `http://host.docker.internal:11434`.

Xem log hoạt động thời gian thực của các dịch vụ:
```powershell
# Xem log toàn bộ hệ thống
docker compose logs -f

# Hoặc xem log riêng dịch vụ File Watcher
docker compose logs -f file-watcher
```

---

### Chế độ B: Chế độ Nhà phát triển (Hybrid Development Mode — Khuyến nghị thực tế)

Dành cho thành viên phát triển mã nguồn Frontend/Backend cần tính năng **Hot-Reload** (sửa code thấy kết quả ngay lập tức mà không cần build lại Docker image):

```powershell
# Bước 1: Khởi động 3 dịch vụ nền tảng trong Docker (Neo4j, Qdrant, File Watcher)
docker compose up -d neo4j qdrant file-watcher

# Bước 2: Chạy Backend Python trực tiếp trên máy Host (Mở Cửa sổ PowerShell 1)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload

# Bước 3: Chạy Frontend React Vite trực tiếp trên máy Host (Mở Cửa sổ PowerShell 2)
cd frontend
npm install
npm run dev
```

*Mẹo tiện ích:* Bạn cũng có thể nhấp đúp chạy file tiện ích [run_all.bat](run_all.bat) ở thư mục gốc để tự động bật đồng thời Backend (port 5000) và Frontend (port 5173).

---

## 8. Kiểm tra Tình trạng Hệ thống (Health Check)

Chạy các lệnh PowerShell sau để xác minh toàn bộ các thành phần đã kết nối thông suốt:

```powershell
# 1. Kiểm tra Backend API & kết nối Database (Qdrant, Neo4j, Ollama)
Invoke-RestMethod -Uri http://localhost:5000/ -Method Get
```

**Kết quả mong đợi:**
```json
{
  "message": "Graph Mind Python Backend is running",
  "neo4j_connected": true,
  "qdrant_connected": true,
  "llm_model": "qwen2.5-7b-graphmind",
  "docs": "/docs"
}
```

```powershell
# 2. Kiểm tra chi tiết trạng thái dịch vụ & cấu hình database
Invoke-RestMethod -Uri http://localhost:5000/api-status -Method Get

# 3. Kiểm tra Qdrant Vector Engine
Invoke-RestMethod -Uri http://localhost:6333/collections/cuad_contracts -Method Get

# 4. Kiểm tra Neo4j Web Browser
Invoke-WebRequest -Uri http://localhost:7474 -Method Head

# 5. Kiểm tra Frontend Dashboard
Invoke-WebRequest -Uri http://localhost:5173 -Method Head

# 6. Kiểm tra dịch vụ Ollama Local LLM
Invoke-RestMethod -Uri http://localhost:11434/api/tags -Method Get
```

---

## 9. Chuẩn bị & Nạp Dữ liệu (Dataset Ingestion)

Mỗi thành viên cần tự nạp dataset vào môi trường máy tính của mình. Hệ thống sử dụng 2 bộ dữ liệu:

### 9.1. Bộ dữ liệu Hợp đồng Pháp lý CUAD (510 PDFs)
- **Nguồn**: Bộ dữ liệu hợp đồng pháp lý mở Contract Understanding Atticus Dataset (CUAD v1).
- **Thư mục cần nạp**: Thư mục chứa các tệp PDF gốc `full_contract_pdf/` (tổng cộng **510 tệp .pdf**).
- **Quy tắc**: Chỉ nạp các tệp `.pdf`. Không nạp các file nhãn CSV/JSON thô ngoài luồng.
- **Phòng ban đích**: Phân loại tự động vào phòng ban **Pháp chế (`legal`)**.

### 9.2. Bộ dữ liệu Vận hành Doanh nghiệp AdventureWorks (71 CSVs)
- **Nguồn**: Cơ sở dữ liệu mẫu doanh nghiệp AdventureWorks.
- **Thư mục cần nạp**: Thư mục chứa **71 tệp .csv** (gồm `Sales_*.csv`, `Production_*.csv`, `Person_*.csv`, `Purchasing_*.csv`,...).
- **Quy tắc ánh xạ phòng ban chuẩn tắc**:
  - Tệp bắt đầu bằng `Sales_`, `Person_` $\rightarrow$ Phòng ban **Kinh doanh (`sales`)**.
  - Tệp bắt đầu bằng `Purchasing_`, `HumanResources_` $\rightarrow$ Phòng ban **Kế toán / Thu mua (`accounting_procurement`)**.
  - Tệp bắt đầu bằng `Production_` $\rightarrow$ Phòng ban **Nghiên cứu & Phát triển (`rnd`)**.
  - Các tệp quản trị hệ thống còn lại $\rightarrow$ Phòng ban **Công nghệ (`it`)**.

---

### 9.3. Phương án A: Khởi tạo Dữ liệu Mẫu Doanh nghiệp Tự động (Zero External Files — Khuyên dùng chạy thử ngay)

Nếu bạn vừa mới clone project về, **chưa được nhận file tar 180MB** hoặc muốn hệ thống có dữ liệu chạy ngay lập tức trong 5 giây mà không cần tải bất kỳ file ngoài nào:

Chạy đúng 1 lệnh duy nhất trong PowerShell:
```powershell
python scripts\seed_demo_data.py
```

**Cơ chế tự động của script:**
1. Tự động sinh 5 tài liệu mẫu đại diện cho 5 phòng ban:
   - `legal/MSA_TechVanguard_Consulting_2026.txt` (Hợp đồng dịch vụ mẫu với điều khoản Không cạnh tranh, Độc quyền, Luật Delaware).
   - `sales/` (Dữ liệu khách hàng mẫu, đơn hàng mẫu).
   - `rnd/` (Danh mục sản phẩm xe đạp địa hình, mũ bảo hiểm).
   - `accounting_procurement/Purchasing_Vendor_Directory.csv` (Danh bạ nhà cung cấp).
   - `it/IT_System_Architecture_Overview.txt` (Đặc tả kiến trúc hệ thống GraphMind).
2. Tự động copy vào Central Storage Docker Volume `/data/` thông qua container `aegis_file_watcher`.
3. Kích hoạt File Watcher daemon quét và đồng bộ sang Backend để tạo vector trong Qdrant.
4. Tự động xây dựng đồ thị quan hệ Khách hàng - Sản phẩm (`[:PURCHASED]`, `[:BELONGS_TO]`) trên Neo4j.

*Kết quả:* Chỉ sau 5 giây, toàn bộ 3 tầng dữ liệu (Volume, Qdrant, Neo4j) đã có dữ liệu thực tế để bạn truy cập `http://localhost:5173` và trải nghiệm AI Copilot ngay lập tức!

---

### 9.4. Phương án B: Nạp Gói Dữ liệu Đồ án Đầy đủ (581 Files / 9.142 Vectors — Khuyến nghị cho cả nhóm)

Để môi trường của bạn đạt chuẩn tuyệt đối 100% khớp với môi trường của trưởng nhóm (510 hợp đồng CUAD PDF + 71 file AdventureWorks CSV):

1. **Nhận file gói dữ liệu:** Tải file **`central_storage_pack.tar`** (~180 MB do nhóm chia sẻ qua Google Drive / OneDrive / USB) và đặt ngay tại thư mục gốc của project `graph-mind/`.
2. **Bung toàn bộ 581 files vào Central Storage Docker Volume:**
   ```powershell
   python scripts\populate_central_storage.py
   ```
   *(Script tự động nhận diện file tar, truyền trực tiếp vào container và giải nén vào `/data` trong vài giây).*
3. **Nạp đồ thị Khách hàng - Sản phẩm vào Neo4j:**
   ```powershell
   python scripts\ingest_adventureworks_graph.py
   ```
   *(Lưu ý: Script đã được nâng cấp tự động trích xuất các file CSV nghiệp vụ từ chính Docker volume `/data`, bạn **KHÔNG CẦN** phải có sẵn thư mục CSV ngoài máy host).*

Sau khi chạy xong 2 lệnh trên, toàn bộ 581 tệp tin đã nằm gọn trong Docker volume cá nhân của bạn!

---

### 9.5. Phương án C: Nạp hàng loạt từ thư mục dataset rời (Bulk Ingest Script)

Nếu trên máy tính của bạn đã có sẵn các thư mục dataset rời từ trước (ví dụ `C:\datasets\CUAD_v1\full_contract_pdf` và `C:\datasets\adventureworks` — hãy thay bằng đường dẫn thực tế trên máy bạn):

1. **Khởi tạo cấu trúc thư mục trong Central Storage Volume:**
   ```powershell
   docker exec aegis_file_watcher mkdir -p /data/legal /data/sales /data/accounting_procurement /data/it /data/rnd
   ```

2. **Chạy script nạp tệp CUAD (510 PDFs):**
   ```powershell
   python scripts\bulk_ingest.py --source-dir "<ĐƯỜNG_DẪN_THƯ_MỤC_CUAD_PDF>" --department legal --workers 4
   ```

3. **Chạy script nạp tệp AdventureWorks (71 CSVs):**
   ```powershell
   python scripts\bulk_ingest.py --source-dir "<ĐƯỜNG_DẪN_THƯ_MỤC_ADVENTUREWORKS_CSV>" --department auto --workers 4
   ```

4. **Nạp đồ thị vào Neo4j:**
   ```powershell
   python scripts\ingest_adventureworks_graph.py --data-dir "<ĐƯỜNG_DẪN_THƯ_MỤC_ADVENTUREWORKS_CSV>"
   ```

---

### 9.6. Phương án D: Tải tệp lên qua Web Dashboard UI (Zero-code)

1. Truy cập trình duyệt: `http://localhost:5173`.
2. Điều hướng vào menu **Kho tài liệu (Documents)**.
3. Nhấp nút **Tải lên tài liệu (Upload Document)**.
4. Chọn Phòng ban (ví dụ: *Pháp chế* hoặc *R&D*), chọn bất kỳ tệp nào từ máy tính (`.pdf`, `.docx`, `.xlsx`, `.csv`) và bấm Xác nhận.
5. Luồng xử lý tự động:
   $$\text{Trình duyệt Web} \longrightarrow \text{Backend API} \longrightarrow \text{Ghi file vào Volume } \text{/data/\{dept\}} \longrightarrow \text{Watcher quét \& Index} \longrightarrow \text{Cập nhật Realtime UI}$$

---

## 10. Xác minh Tính Nhất quán 3 Lớp Dữ liệu (Data Consistency Verification)

Để đảm bảo môi trường của bạn đã nạp đủ và đồng bộ chuẩn xác giống hệt các thành viên khác trong nhóm, hệ thống cung cấp script kiểm thử độc lập cả 3 tầng dữ liệu:

```powershell
python scripts\verify_three_layers.py
```

Tuỳ theo bạn đã chọn **Phương án A (Demo Data)** hay **Phương án B (Full Dataset)** ở Mục 9, hãy đối chiếu với bảng nghiệm thu tương ứng bên dưới:

### Bảng 10.1: Tiêu chí Nghiệm thu cho Demo Data (Phương án A — `seed_demo_data.py`)

Chế độ Demo dành cho thành viên mới muốn khởi động nhanh hệ thống để test tính năng hoặc viết code mà chưa cần tải dataset nặng:

| Tầng dữ liệu (Layer) | Vị trí kiểm tra | Chỉ số mong đợi | Tiêu chuẩn PASS |
|---|---|---|:---:|
| **Lớp 1: Central Storage** | Docker Volume `/data` | 5 tệp mẫu đại diện 5 phòng ban (`legal/`, `finance/`, `sales/`, `engineering/`, `hr/`) | **5 tệp** |
| **Lớp 2: Qdrant Vector** | Collection `cuad_contracts` | Số tài liệu mẫu có vector nhúng<br>Tổng số điểm vector (chunks) | **5 tài liệu**<br>**5 - 15 points** (tùy kích thước demo) |
| **Lớp 3: Neo4j Graph** | Nhãn node `(d:Document)` | Số node tài liệu mẫu<br>Quan hệ phòng ban `[:BELONGS_TO_DEPARTMENT]` | **5 nodes**<br>**>= 5 quan hệ** |
| **Backend API** | Endpoint `/api/v1/documents` | `total_items`<br>`indexed_documents`<br>`failed_documents` | **>= 5**<br>**>= 5**<br>**0** |

*Ghi chú:* Script `verify_three_layers.py` được thiết kế mặc định để xác minh bộ Full Dataset (581 tệp). Khi chạy ở chế độ Demo, script sẽ hiển thị chi tiết số lượng thực tế 5 tệp trong volume và Qdrant/Neo4j.

---

### Bảng 10.2: Tiêu chí Nghiệm thu cho Full Dataset Đồ án (Phương án B — `central_storage_pack.tar`)

Chế độ nghiệm thu toàn diện đồ án dành cho việc benchmark mô hình, đánh giá Hybrid GraphRAG và báo cáo bảo vệ:

| Tầng dữ liệu (Layer) | Vị trí kiểm tra | Chỉ số mong đợi | Tiêu chuẩn PASS |
|---|---|---|:---:|
| **Lớp 1: Central Storage** | Docker Named Volume `/data` | Tệp CUAD PDF trong `/data/legal`<br>Tệp AdventureWorks CSV trong `/data/*`<br>**Tổng số tệp gốc lưu trữ** | **>= 510** tệp<br>**>= 71** tệp<br>**>= 581 tệp** |
| **Lớp 2: Qdrant Vector** | Collection `cuad_contracts` | Số tài liệu CUAD có vector<br>Số tài liệu AdventureWorks có vector<br>**Tổng số điểm vector (chunks)** | **>= 510** tài liệu<br>**>= 71** tài liệu<br>**~9.145 điểm** (384-dim) |
| **Lớp 3: Neo4j Graph** | Nhãn node `(d:Document)` | Node Document CUAD<br>Node Document AdventureWorks<br>**Tổng số node Document**<br>Quan hệ điều khoản `[:CONTAINS_CLAUSE]` | **>= 510** nodes<br>**>= 71** nodes<br>**>= 581 nodes**<br>**> 1.690 quan hệ** |
| **Backend API** | Endpoint `/api/v1/documents` | `total_items`<br>`indexed_documents`<br>`pending_documents`<br>`failed_documents` | **>= 581**<br>**>= 581**<br>**0**<br>**0** |

*Khi toàn bộ tiêu chuẩn đạt được, script sẽ trả về thông báo:*  
`RESULT: 100% COMPLETE & VERIFIED ACROSS ALL 3 LAYERS!` $\rightarrow$ Môi trường Full Dataset của bạn đã đạt chuẩn 100%.

---

## 11. Cơ chế Chống Trùng lặp & Toàn vẹn Dữ liệu (Idempotency)

Hệ thống được thiết kế theo nguyên lý **Idempotent** (chạy nạp dữ liệu nhiều lần vẫn cho ra cùng một trạng thái duy nhất, không tạo dữ liệu rác):

1. **Khóa nhận diện SHA-256**: Mỗi tệp tin trước khi nạp đều được đọc theo từng khối 64KB để sinh mã băm SHA-256 duy nhất.
2. **Kiểm tra trước khi xử lý (Pre-flight Hash Check)**: Endpoint `/api/v1/sync/file-watcher/known-hashes` trả về danh sách các mã băm đã có trong cơ sở dữ liệu. Nếu tệp không có sự thay đổi nội dung, hệ thống sẽ **bỏ qua (SKIP)** tức thì trong 0.001s.
3. **Định danh Vector đơn định (Deterministic Vector ID)**:
   Mỗi đoạn trích vector trong Qdrant được tính toán ID theo công thức:
   $$\text{pt\_id} = \text{MD5}(\text{file\_hash} + \text{"\_"} + \text{filename} + \text{"\_"} + \text{chunk\_idx})$$
   Đảm bảo khi nạp lại, vector chỉ bị ghi đè (upsert) tại đúng ID đó chứ không tạo thêm điểm mới.
4. **Cypher MERGE trên Neo4j**: Sử dụng mệnh đề `MERGE (d:Document {name: $name})` thay vì `CREATE`, đảm bảo không bao giờ nhân bản node tài liệu trên đồ thị.

---

## 12. Cơ chế Đồng bộ Tệp Thời gian thực (Realtime File Watcher)

Container `aegis_file_watcher` chạy tiến trình Python theo dõi các biến động trên Docker Volume `/data`:

```text
[Thao tác tệp]
     │
     ├── CREATE  ──> Đợi tệp ghi xong (debounce 1.5s) ──> Đọc SHA-256 ──> Gửi Webhook ──> Tạo Chunks ──> Qdrant + Neo4j
     ├── MODIFY  ──> So sánh SHA-256 mới ──> Nếu khác mã băm ──> Xóa vector cũ ──> Ghi đè vector & quan hệ mới
     ├── RENAME  ──> Cập nhật tên node và storage path trên Neo4j & Qdrant ──> Không cần sinh lại embedding
     └── DELETE  ──> Xóa toàn bộ vector trong Qdrant ──> Xóa node Document & Clause mồ côi trên Neo4j
```

---

## 13. Thiết lập Trợ lý AI Cục bộ (Ollama Local LLM)

Để tính năng AI Copilot hoạt động với mô hình **Qwen2.5-7B-Instruct** cục bộ:

1. **Cài đặt Ollama**: Truy cập [ollama.com](https://ollama.com) và cài đặt phiên bản Windows. Mở PowerShell kiểm tra: `ollama --version`.
2. **Khởi tạo mô hình GraphMind (chọn 1 trong 2 cách):**
   - **Cách A (Tự động & Nhanh nhất — KHÔNG cần tải file GGUF 4.6GB):**
     Tải mô hình chuẩn từ thư viện chính thức của Ollama và tạo alias tương thích với cấu hình Backend:
     ```powershell
     ollama pull qwen2.5:7b
     ollama cp qwen2.5:7b qwen2.5-7b-graphmind
     ```
     *(Lệnh `ollama cp` tạo liên kết mô hình tức thì trong 0.1s, không tốn thêm dung lượng ổ cứng).*
   - **Cách B (Sử dụng file GGUF nếu được copy trực tiếp qua USB):**
     Nếu trong máy bạn có sẵn file `Qwen2.5-7B-Instruct.Q4_K_M.gguf` tại thư mục gốc của project:
     ```powershell
     ollama create qwen2.5-7b-graphmind -f Modelfile
     ```
3. **Kiểm tra mô hình đã sẵn sàng:**
   ```powershell
   ollama list
   ```
   *(Xác nhận có mô hình `qwen2.5-7b-graphmind:latest` dung lượng ~4.7 GB).*

---

## 14. Xóa Trắng & Khôi phục Môi trường Sạch (Database Reset)

> [!CAUTION]
> **CẢNH BÁO NGUY HIỂM — MẤT DỮ LIỆU VĨNH VIỄN:**  
> - **TUYỆT ĐỐI KHÔNG** sử dụng `docker compose down -v`, `docker volume rm`, `docker volume prune` hoặc xóa thư mục `./neo4j_data`, `./qdrant_data` như một giải pháp khắc phục sự cố thông thường!  
> - Các lệnh này sẽ **xóa sạch toàn bộ** đồ thị tri thức Neo4j, kho vector Qdrant và các tệp trong Central Storage.  
> - Khi gặp lỗi kết nối hoặc container không chạy, **luôn ưu tiên kiểm tra logs và restart dịch vụ trước** (xem [Mục 18. Xử lý Sự cố Thường gặp](#18-xử-lý-sự-cố-thường-gặp-troubleshooting)):
>   ```powershell
>   docker compose ps
>   docker compose logs -f neo4j
>   docker compose restart neo4j qdrant file-watcher
>   ```
> - **Chỉ thực hiện quy trình Reset bên dưới** khi bạn thực sự muốn xóa sạch toàn bộ môi trường và dữ liệu cục bộ để thử nghiệm quy trình onboarding từ con số 0.

### Quy trình Reset Môi trường Sạch (Chỉ dùng khi muốn xóa trắng)

Mở PowerShell tại thư mục gốc:

```powershell
# Bước 1: Dừng toàn bộ các container và gỡ bỏ network (giữ nguyên volume nếu chưa muốn mất dữ liệu)
# Nếu chắc chắn muốn xóa sạch volume, thêm cờ -v:
docker compose down -v

# Bước 2: Xóa trắng volume Central Storage (nếu chưa bị xóa bởi cờ -v)
docker volume rm graph-mind_graphmind_documents -ErrorAction SilentlyContinue

# Bước 3: Xóa trắng thư mục dữ liệu cục bộ Neo4j và Qdrant
Remove-Item -Recurse -Force ./neo4j_data/* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ./qdrant_data/* -ErrorAction SilentlyContinue

# Bước 4: Khởi động lại hệ thống sạch (Docker sẽ tự động tạo lại volume rỗng)
docker compose up -d neo4j qdrant file-watcher

# Bước 5: Nạp lại dữ liệu (chọn nạp demo hoặc nạp full dataset theo Mục 9)
python scripts\seed_demo_data.py
```

---

## 15. Hướng dẫn Sử dụng Web Dashboard

Sau khi khởi động, truy cập trình duyệt tại địa chỉ: **`http://localhost:5173`**

1. **Trang Chủ & Dashboard Điều hành**: Hiển thị tổng quan các chỉ số KPI, tỷ lệ tuân thủ điều khoản pháp lý, cảnh báo rủi ro hợp đồng và phân bố danh mục tài liệu.
2. **Kho Tài liệu (Document Explorer)**: Xem danh sách 581 tài liệu, lọc theo phòng ban (Pháp chế, Kinh doanh, R&D,...), xem chi tiết số lượng đoạn trích (chunks) và tải tệp mới lên hệ thống.
3. **AI Copilot (Hybrid GraphRAG Chat)**:
   - Đặt câu hỏi tự nhiên về hợp đồng hoặc thông tin kinh doanh.
   - Trợ lý sẽ tự động trích xuất bằng chứng từ Qdrant & Neo4j, sinh câu trả lời kèm thẻ **"Hybrid GraphRAG Verified"**.
   - Bấm vào các chip chứng cứ (**Evidence Chips**) để mở trình xem chi tiết tài liệu và vị trí dòng đối chiếu gốc.
4. **Khám phá Đồ thị Tri thức (Knowledge Graph Viewer)**: Tương tác trực quan 3D/2D đồ thị mạng lưới thực thể Khách hàng $\rightarrow$ Sản phẩm $\rightarrow$ Hợp đồng $\rightarrow$ Điều khoản.

---

## 16. Quy trình Setup Chuẩn cho Thành viên Mới (10 Bước Khép Kín)

Khi một thành viên mới clone project, thực hiện đúng tuần tự 10 bước sau để hệ thống chạy chuẩn 100%:

1. [x] **Cài đặt công cụ nền tảng**: Bật Docker Desktop, cài đặt Git, Python 3.11+, Node.js 20+.
2. [x] **Clone mã nguồn**:
   ```powershell
   git clone https://github.com/ngocanh06/graph-mind.git
   cd graph-mind
   git checkout Standard-User
   ```
3. [x] **Tạo file cấu hình môi trường**:
   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend\.env.example backend\.env
   ```
4. [x] **Cài đặt thư viện Python & Node.js**:
   ```powershell
   pip install -r backend\requirements.txt
   npm --prefix frontend install
   ```
5. [x] **Khởi động các dịch vụ nền tảng trong Docker**:
   ```powershell
   docker compose up -d neo4j qdrant file-watcher
   ```
   *(Lệnh này tự động khởi tạo Volume `graph-mind_graphmind_documents` trên máy bạn nếu volume chưa tồn tại).*
6. [x] **Khởi tạo Model AI trên Ollama**:
   ```powershell
   ollama pull qwen2.5:7b
   ollama cp qwen2.5:7b qwen2.5-7b-graphmind
   ```
   *(Hoặc chạy `ollama create qwen2.5-7b-graphmind -f Modelfile` nếu bạn có sẵn file GGUF 4.6GB tại thư mục gốc).*
7. [x] **Nạp dữ liệu vào Central Storage Volume & Index (chọn 1 trong 2 lựa chọn):**
   - **Lựa chọn 1 (Chạy thử ngay trong 5 giây — Zero downloads):**
     ```powershell
     python scripts\seed_demo_data.py
     ```
     *(Tự động tạo tài liệu mẫu 5 phòng ban, nạp vào Docker Volume, kích hoạt Watcher index Qdrant và đồ thị Neo4j).*
   - **Lựa chọn 2 (Bộ dữ liệu đồ án chuẩn 581 files / 9.142 vector chunks):**
     Đặt `central_storage_pack.tar` (180MB) vào thư mục gốc và chạy:
     ```powershell
     python scripts\populate_central_storage.py
     python scripts\ingest_adventureworks_graph.py
     ```
     *(Script đồ thị tự động lấy CSV từ container, không cần thư mục ngoài host).*
8. [x] **Kiểm tra tính nhất quán 3 lớp (3-Layer Consistency Check)**:
   ```powershell
   python scripts\verify_three_layers.py
   ```
   *(Xác nhận toàn bộ các tiêu chí hiển thị `PASS` và kết quả là `RESULT: 100% COMPLETE & VERIFIED ACROSS ALL 3 LAYERS!`).*
9. [x] **Bật ứng dụng toàn diện (Backend + Frontend)**:
   ```powershell
   .\run_all.bat
   ```
10. [x] **Mở trình duyệt Web Dashboard**:
    Truy cập địa chỉ: `http://localhost:5173` để trải nghiệm hệ thống và hỏi đáp với AI Copilot.

---

## 17. Quy tắc Git & Hợp tác Nhóm

> [!WARNING]
> **QUY TẮC BẮT BUỘC:** GitHub chỉ đồng bộ MÃ NGUỒN (CODE), **tuyệt đối không đồng bộ dữ liệu Database, Docker Volume hoặc Tệp nhị phân lớn**.

Các thư mục sau đã được chặn trong file [.gitignore](.gitignore) và **KHÔNG ĐƯỢC PHÉP commit**:
- `neo4j_data/`, `neo4j_import/` (Cơ sở dữ liệu đồ thị cục bộ).
- `qdrant_data/` (Cơ sở dữ liệu vector cục bộ).
- `*.tar`, `*.gguf`, `*.bin` (Các gói dữ liệu nén hoặc model AI nặng hàng GB).
- `.env` (Chứa mật khẩu và API key thực tế của máy bạn).

---

## 18. Xử lý Sự cố Thường gặp (Troubleshooting)

### Lỗi 1: `Central Storage Volume bị trống (0 files) khi mới clone project`
- **Triệu chứng**: Giao diện báo không tìm thấy file hoặc `verify_three_layers.py` báo `FAIL` ở Lớp 1.
- **Nguyên nhân**: Docker volume mới tạo trên máy bạn hoàn toàn chưa có file bên trong.
- **Cách sửa (chọn 1 trong 2 cách):**
  - **Cách cực nhanh (không cần tải file ngoài):** Chạy `python scripts\seed_demo_data.py` (tự động tạo 5 tài liệu chuẩn cho 5 phòng ban và đồ thị).
  - **Cách đầy đủ đồ án (581 files):** Copy file `central_storage_pack.tar` (180MB) vào thư mục gốc, rồi chạy `python scripts\populate_central_storage.py` và `python scripts\ingest_adventureworks_graph.py`.

### Lỗi 2: `Port already allocated` (Cổng 5000, 5173, 7474, 7687 hoặc 6333 bị chiếm dụng)
- **Kiểm tra**:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000, 5173, 7687, 6333 -ErrorAction SilentlyContinue
  ```
- **Cách sửa**: Tắt tiến trình đang chiếm cổng hoặc đổi cổng trong file `.env`.

### Lỗi 3: Qdrant kết nối thành công nhưng không có vector (`points_count = 0`)
- **Nguyên nhân**: Chưa chạy script nạp dữ liệu hoặc nạp bị gián đoạn.
- **Cách sửa**: Chạy `python scripts\seed_demo_data.py` hoặc `python scripts\bulk_ingest.py --source-dir <đường_dẫn_dataset> --department auto`.

### Lỗi 4: Không có thư mục dataset AdventureWorks trên máy tính khi nạp đồ thị
- **Giải pháp**: Script [scripts/ingest_adventureworks_graph.py](scripts/ingest_adventureworks_graph.py) đã được tích hợp cơ chế tự động trích xuất các file CSV từ Docker container `aegis_file_watcher:/data`. Bạn chỉ cần chạy lệnh sau mà không cần chỉ định đường dẫn:
  ```powershell
  python scripts\ingest_adventureworks_graph.py
  ```

### Lỗi 5: File Watcher không nhận sự kiện khi copy file vào
- **Nguyên nhân**: Bạn copy file vào thư mục trên máy Windows thay vì đưa vào Docker Volume `/data`.
- **Cách sửa**: Sử dụng tính năng Upload trên Web UI hoặc dùng script `bulk_ingest.py`. Không thả trực tiếp vào thư mục code nếu thư mục đó không được mount vào `/data`.

### Lỗi 6: Cảnh báo `Ollama model 'qwen2.5-7b-graphmind' not reachable`
- **Nguyên nhân**: Ollama chưa được bật hoặc chưa tạo model có tên `qwen2.5-7b-graphmind`.
- **Cách sửa**: Mở terminal PowerShell và chạy chuỗi lệnh:
  ```powershell
  ollama serve
  ollama pull qwen2.5:7b
  ollama cp qwen2.5:7b qwen2.5-7b-graphmind
  ```
  Kiểm tra lại bằng `ollama list` và kiểm tra backend tại `http://localhost:5000/`.

---

## 19. Quick Start (Dành cho Developer Đã Hiểu Dự án)

Dành cho thành viên đã quen thuộc với kiến trúc dự án, chạy chuỗi lệnh nhanh trong PowerShell:

```powershell
# 1. Clone & Cấu hình môi trường
git clone https://github.com/ngocanh06/graph-mind.git
cd graph-mind
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env

# 2. Khởi động các container cơ sở dữ liệu & watcher
docker compose up -d neo4j qdrant file-watcher

# 3. Nạp dữ liệu vào Central Storage Volume (chọn 1 trong 2):
# Lựa chọn A (Chạy thử ngay trong 5s, zero download):
python scripts\seed_demo_data.py

# Lựa chọn B (Nạp full 581 files chuẩn đồ án với file central_storage_pack.tar):
# python scripts\populate_central_storage.py
# python scripts\ingest_adventureworks_graph.py

# 4. Xác minh 3 lớp dữ liệu
python scripts\verify_three_layers.py

# 5. Khởi chạy toàn bộ ứng dụng (Backend + Frontend)
.\run_all.bat
```

---

## 20. Vấn đề Tồn đọng & Kế hoạch Tiếp theo (Known Issues / TODO)

1. **Cơ chế nhúng SentenceTransformer trong Container**: Hiện tại script `bulk_ingest.py` gọi mô hình embedding `all-MiniLM-L6-v2` cục bộ trên host. Khi chạy hoàn toàn trong container backend độc lập, cần đảm bảo container có quyền tải hoặc cache trọng số embedding vào volume.
2. **PostgreSQL Relational DB Service trong Compose**: Hiện tại PostgreSQL quan hệ chủ yếu quản lý tài khoản người dùng và nhật ký audit log. Trong phiên bản tới, service postgres sẽ được tích hợp chính thức vào file `docker-compose.yml` để tự động hóa migration Alembic khi triển khai production.
3. **Tối ưu hóa GPU cho Ollama**: Chạy suy luận Qwen2.5-7B trên CPU thuần túy có độ trễ khoảng 10-12s/câu trả lời. Thành viên có card đồ họa rời NVIDIA nên bật GPU acceleration (CUDA) trong Docker/Ollama để đạt tốc độ suy luận dưới 2 giây.

---
*GraphMind Engineering Team — Capstone Project 2026.*
