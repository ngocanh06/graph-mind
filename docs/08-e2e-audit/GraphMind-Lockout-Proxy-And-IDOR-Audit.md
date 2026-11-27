# GRAPHMINID SECURITY ARCHITECTURE SPECIFICATION: REVERSE PROXY LOCKOUT & IDOR DEFENSE MATRIX

> **Tài liệu kiểm toán và đặc tả an toàn thông tin**  
> **Tiêu chuẩn áp dụng:** ISO/IEC 27001:2022 (A.8.5, A.8.20, A.8.24), Nghị định 13/2023/NĐ-CP, OWASP ASVS v4.0.3 (V2, V3, V4, V13)  
> **Thời điểm cập nhật:** 27/11/2026  
> **Trạng thái:** Triển khai nghiệm thu Bước B1 / Chuẩn bị Bước 2B  

---

## 1. KIẾN TRÚC REVERSE PROXY VÀ CƠ CHẾ DUAL-TIER BRUTE-FORCE LOCKOUT

### 1.1. Bối cảnh hạ tầng On-Premise & Reverse Proxy Trust Boundary
Trong kiến trúc GraphMind On-premise Docker Compose:
- **Nginx Reverse Proxy (`graphmind_frontend`):** Lắng nghe port `5173` (hoặc `80/443`), phục vụ Single Page Application (SPA React 18) và chuyển tiếp toàn bộ traffic `/api/*` về `graphmind_backend:5000`.
- **FastAPI Backend (`graphmind_backend`):** Lắng nghe port `5000` trong Docker network nội bộ (`graphmind-net`).

```
[ External User / Attacker ]
            │
            ▼
┌───────────────────────────────┐
│ Nginx Reverse Proxy (:5173/80)│
│  - SSL Termination            │
│  - Sets X-Forwarded-For       │
│  - Sets X-Real-IP             │
└───────────────┬───────────────┘
                │ Docker Network (`graphmind-net`: 172.18.0.0/16)
                ▼
┌───────────────────────────────┐
│ FastAPI Application (:5000)   │
│  - Middleware: Trusted Proxies│
│  - Dual-Tier Lockout Engine   │
└───────────────────────────────┘
```

### 1.2. Thuật toán trích xuất Client IP an toàn (Chống IP Spoofing)
Kẻ tấn công có thể giả mạo header `X-Forwarded-For: 8.8.8.8` nếu gửi request trực tiếp đến Backend mà không qua Proxy hoặc nếu Proxy cấu hình nối chuỗi lỏng lẻo.

**Quy tắc xác thực Trust Boundary:**
1. Định nghĩa biến môi trường `TRUSTED_PROXIES = {"127.0.0.1", "::1", "172.16.0.0/12", "192.168.0.0/16", "10.0.0.0/8"}`.
2. Kiểm tra `peer_ip = request.client.host`.
3. Nếu `peer_ip` **KHÔNG** thuộc `TRUSTED_PROXIES`:
   - Bỏ qua toàn bộ header `X-Forwarded-For` và `X-Real-IP`.
   - Sử dụng trực tiếp `client_ip = peer_ip`.
4. Nếu `peer_ip` thuộc `TRUSTED_PROXIES`:
   - Lấy chuỗi `X-Forwarded-For`.
   - Trích xuất địa chỉ IP hợp lệ đầu tiên từ bên phải ngược lên (hoặc IP hợp lệ đầu tiên từ client) được xác nhận bởi Proxy tin cậy.

### 1.3. Cơ chế Khóa chống tấn công dò mật khẩu Hai Tầng (Dual-Tier Lockout Engine)
Để giải quyết bài toán cân bằng giữa:
- Chống tấn công phân tán (Distributed Brute-force / Credential Stuffing qua Botnet).
- Chống tấn công từ chối dịch vụ (Denial of Service - DoS) bằng cách cố tình gõ sai tài khoản của người khác để làm tài khoản bị khóa cứng.

Hệ thống áp dụng kiến trúc **Dual-Tier Lockout**:

| Tham số | Tầng 1: Temporary Lock (Theo Cặp IP + Identifier) | Tầng 2: Global Account Lock (Theo Identifier) |
|---|---|---|
| **Khóa theo dõi** | `(clean_identifier, client_ip)` | `clean_identifier` (Email / Username) |
| **Ngưỡng kích hoạt** | 5 lần nhập sai trong 5 phút | 15 lần nhập sai trong 15 phút (bất kể từ bao nhiêu IP) |
| **Thời gian khóa** | 15 phút (`900` giây) | Khóa vĩnh viễn đến khi Quản trị viên mở hoặc Đổi mật khẩu qua OTP |
| **Lưu trữ** | In-Memory TTL Cache / Redis (Tối ưu I/O) | Cột `User.status = 'locked'` trong PostgreSQL |
| **Mã lỗi HTTP** | `429 Too Many Requests` | `403 Forbidden` |
| **Thông điệp trả về** | `"Tài khoản tạm thời bị giới hạn đăng nhập từ IP này trong 15 phút do nhập sai mật khẩu quá 5 lần."` | `"Tài khoản đã bị khóa bảo vệ do phát hiện hành vi dò quét mật khẩu phân tán. Vui lòng liên hệ Quản trị viên hoặc sử dụng Quên mật khẩu."` |
| **Audit Log** | `LOGIN_LOCKOUT_IP` | `ACCOUNT_LOCKED_BRUTEFORCE` (Gửi cảnh báo SecOps) |

---

## 2. MA TRẬN KIỂM TOÁN VÀ ĐÁNH GIÁ PHÒNG THỦ IDOR (53 ROUTES)

Quá trình quét tự động `scripts/scan_idor_routes.py` trên 180 route của Backend đã phát hiện **53 route** có nhận tham số định danh đối tượng (`IDOR Candidates`). Thực chất đây là **27 route handler duy nhất** được ánh xạ song song tại hai tiền tố `/api/*` và `/api/v1/*`.

Dưới đây là bảng đánh giá kiểm toán chi tiết 27 route theo 6 nhóm nghiệp vụ:

| STT | Endpoint Patterns | Method | Định danh đối tượng (Params) | Dependency Xác thực | Cơ chế Kiểm tra Quyền sở hữu & Phạm vi (IDOR Defense) | Đánh giá & Rủi ro tồn đọng |
|:---:|---|:---:|---|---|---|:---:|
| **1** | `/api/v1/admin/upload-approvals/{request_id}/preview` | GET | `request_id` (UUID) | `get_request_user`, `get_db` | Đã vá tại commit `b696376`: Kiểm tra `req.uploaded_by == user.user_id` HOẶC `user.role in ['it_admin', 'executive']` HOẶC `user.department == req.department_code`. | **AN TOÀN (Passed)** |
| **2** | `/api/v1/admin/upload-approvals/{request_id}/approve` | POST | `request_id` (UUID) | `get_request_user`, `get_db` | Chỉ `it_admin` hoặc `knowledge_manager` thuộc cùng department mới được phép duyệt yêu cầu. | **AN TOÀN (Passed)** |
| **3** | `/api/v1/admin/upload-approvals/{request_id}/reject` | POST | `request_id` (UUID) | `get_request_user`, `get_db` | Chỉ `it_admin` hoặc `knowledge_manager` thuộc cùng department mới được phép từ chối yêu cầu. | **AN TOÀN (Passed)** |
| **4** | `/api/v1/copilot/sessions/{session_id}` | GET | `session_id` (UUID) | `get_user_scope`, `get_db` | `copilot.py:734`: Truy vấn `CopilotSession`. Kiểm tra `session.user_id == current_user.user_id`. Nếu không khớp và không phải Executive/Admin => Raise 403. | **AN TOÀN (Passed)** |
| **5** | `/api/v1/copilot/sessions/{session_id}` | DELETE | `session_id` (UUID) | `get_request_user`, `get_db` | `copilot.py:760`: Kiểm tra `session.user_id == current_user.user_id`. Chặn xóa phiên của người khác. | **AN TOÀN (Passed)** |
| **6** | `/api/v1/copilot/sessions/{session_id}/pin` | POST, PATCH | `session_id` (UUID) | `get_user_scope`, `get_db` | `copilot.py:785`: Kiểm tra quyền sở hữu phiên trước khi ghim (pin). | **AN TOÀN (Passed)** |
| **7** | `/api/v1/copilot/citations` | GET, POST | `doc_id` | `get_user_scope` | Kiểm tra quyền truy cập tài liệu qua `rbac.can_access_document(user_scope, doc_id)`. | **AN TOÀN (Passed)** |
| **8** | `/api/v1/dashboard/shift-reports/{report_id}` | PUT | `report_id` (UUID) | `get_user_scope`, `get_db` | `dashboard.py`: Chỉ tác giả tạo báo cáo ca hoặc Quản lý ca của phòng ban đó mới có quyền sửa. | **AN TOÀN (Passed)** |
| **9** | `/api/v1/dashboard/shift-reports/{report_id}/submit` | POST | `report_id` (UUID) | `get_user_scope`, `get_db` | Chỉ người tạo ca mới được submit báo cáo ca của mình. | **AN TOÀN (Passed)** |
| **10** | `/api/v1/dashboard/shift-reports/{report_id}/review` | POST | `report_id` (UUID) | `get_user_scope`, `get_db` | Chỉ Trưởng phòng (`manager`) hoặc Giám đốc (`executive`) cùng phòng ban mới được review/ký duyệt. | **AN TOÀN (Passed)** |
| **11** | `/api/v1/documents` | GET | `search`, `dept`, `doc_type` | `get_user_scope` | Lọc kết quả danh mục theo phòng ban được phép của user (`user_scope.is_department_allowed`). | **AN TOÀN (Passed)** |
| **12** | `/api/v1/documents/detail` | GET | `doc_id`, `department` | `get_user_scope` | Xác thực phòng ban tài liệu đối chiếu với `user_scope.allowed_depts`. | **AN TOÀN (Passed)** |
| **13** | `/api/v1/documents/raw` | GET | `doc_id`, `filename`, `department` | `get_user_scope` | Đã vá Step 2A (commit `a23bf09`): Fail-closed nếu thiếu department hoặc không khớp phòng ban được phép. | **AN TOÀN (Passed)** |
| **14** | `/api/v1/documents/download` | GET | `doc_id`, `filename`, `department` | `get_user_scope` | Đã vá Step 2A (commit `a23bf09`): Chặn tải tài liệu khác phòng ban qua kiểm tra fail-closed storage path. | **AN TOÀN (Passed)** |
| **15** | `/api/v1/graph/entity/{entity_id}` | GET | `entity_id` | `get_user_scope` | Sử dụng `filter_graph_entities_by_scope` để loại bỏ thực thể không thuộc phạm vi phòng ban. | **AN TOÀN (Passed)** |
| **16** | `/api/v1/graph/entity/{entity_id}/properties` | PUT | `entity_id` | `get_current_user` | Yêu cầu quyền Knowledge Manager / Admin để chỉnh sửa thuộc tính Ontology Node. | **AN TOÀN (Passed)** |
| **17** | `/api/v1/neo4j/node/{node_id}` | GET | `node_id` | `get_user_scope` | Đã vá Step 2A (commit `0054702`): Lọc Cypher kiểm tra thuộc tính node thuộc phòng ban được phép. | **AN TOÀN (Passed)** |
| **18** | `/api/v1/neo4j/expand/{node_id}` | GET | `node_id` | `get_user_scope` | Đã vá Step 2A: Mở rộng đồ thị lọc bỏ quan hệ và node đích không thuộc phòng ban hợp lệ. | **AN TOÀN (Passed)** |
| **19** | `/api/v1/rbac/check` | GET, POST | `department`, `resource_type`, `action` | `get_user_scope` | Endpoint tính toán quyền logic RBAC read-only, không can thiệp thay đổi dữ liệu đối tượng. | **AN TOÀN (Passed)** |
| **20** | `/api/v1/sop/{sop_id}` | GET | `sop_id` (UUID) | `get_user_scope`, `get_db` | `sop.py:112`: Kiểm tra `sop.department == user.department` hoặc `user.role in ['it_admin', 'executive']`. | **AN TOÀN (Passed)** |
| **21** | `/api/v1/sop/{sop_id}` | DELETE | `sop_id` (UUID) | `get_request_user`, `get_db` | `sop.py:145`: Kiểm tra `sop.created_by == user.user_id` hoặc Quản lý phòng ban. | **AN TOÀN (Passed)** |
| **22** | `/api/v1/sop/{sop_id}/publish` | POST | `sop_id` (UUID) | `get_request_user`, `get_db` | `sop.py:168`: Chỉ tác giả hoặc Quản lý phòng ban mới được xuất bản quy trình SOP. | **AN TOÀN (Passed)** |
| **23** | `/api/v1/admin/users/{user_id}` | DELETE | `user_id` (UUID) | `get_db`, `get_admin_user` | Bắt buộc quyền `it_admin` / `executive`. Không cho phép user thường tự xóa người khác. | **AN TOÀN (Passed)** |
| **24** | `/api/v1/admin/users/{user_id}/lock` | PATCH | `user_id` (UUID) | `get_db`, `get_admin_user` | Bắt buộc quyền `it_admin` / `executive`. | **AN TOÀN (Passed)** |
| **25** | `/api/v1/admin/users/{user_id}/unlock` | PATCH | `user_id` (UUID) | `get_db`, `get_admin_user` | Bắt buộc quyền `it_admin` / `executive`. | **AN TOÀN (Passed)** |
| **26** | `/api/v1/admin/users/{user_id}/role` | PATCH | `user_id` (UUID) | `get_db`, `get_admin_user` | Bắt buộc quyền `it_admin` / `executive`. | **AN TOÀN (Passed)** |
| **27** | `/api/v1/admin/users/{user_id}/reset-password` | PATCH | `user_id` (UUID) | `get_db`, `get_admin_user` | Bắt buộc quyền `it_admin` / `executive`. Đổi mật khẩu do Admin thực hiện. | **AN TOÀN (Passed)** |

---

## 3. KẾT LUẬN & KIỂM ĐỊNH BƯỚC B1
1. **APP_ENV & Security Bypass:**
   - Mặc định khởi chạy hệ thống luôn là `production`.
   - Cấm hoàn toàn khả năng bypass mật khẩu bằng biến môi trường `APP_ENV=testing` khi ứng dụng chạy thực tế ngoài môi trường `pytest`.
2. **User Enumeration (CWE-204):**
   - Đã loại bỏ hoàn toàn mã lỗi 404 và 403 rò rỉ trạng thái tài khoản tại endpoint `/api/v1/auth/forgot-password`.
   - Chuẩn hóa thông điệp đồng nhất theo khuyến nghị OWASP ASVS v4.0.3.
3. **Session Invalidation (CWE-613):**
   - Khi đặt lại mật khẩu thành công qua OTP, hệ thống tự động gọi `clear_active_session(db, user.user_id)`, hủy bỏ toàn bộ JWT session cũ đang mở trên các thiết bị khác.
4. **IDOR Mitigation (CWE-639):**
   - 100% (27/27) route tham số hóa đều được bảo vệ bởi chuỗi xác thực chủ quyền (Ownership / Department Scope Check / Admin RBAC Check).
