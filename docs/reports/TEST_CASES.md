# GraphMind — Test Cases & Test Report

**Workbook để thực thi và ghi nhận:** [TEST_CASES_AND_REPORT.xlsx](./TEST_CASES_AND_REPORT.xlsx) · **Test plan dạng Word:** [TEST_PLAN.docx](./TEST_PLAN.docx)

| Thông tin | Giá trị |
|---|---|
| Mã tài liệu | GM-TEST-CASES |
| Phiên bản | 2.2 |
| Test cycle hiện tại | Isolated staging smoke — 09-11-2026 |
| Test plan | [TEST_PLAN.md](./TEST_PLAN.md) |
| Yêu cầu nghiệp vụ | [User Story](../02-user-story/4.%20C1SE18_UserStory_GraphMind-Ver1.1.docx), [SRS](../05-srs/5.%20C1SE18_SRS_GraphMind_Ver1.1.docx) |

## 1. Quy ước thực thi

- **Priority:** `P0` = bảo mật/toàn vẹn dữ liệu/luồng phát hành cốt lõi; `P1` = nghiệp vụ chính; `P2` = UX/nhánh phụ.
- **Test type:** `API`, `UI/E2E`, `Integration`, `Unit`, `Regression`.
- **Execution status:** `NOT RUN`, `PASS`, `FAIL`, `BLOCKED`, `NOT APPLICABLE`.
- Test data chỉ dùng trong local test hoặc Robot staging cô lập. Giá trị tài khoản bên dưới chỉ là tên fixture; lấy credential từ cấu hình staging an toàn, không ghi vào tài liệu.
- Trong mỗi case, ghi kết quả theo từng bước hoặc kết quả quan sát được. Nếu `FAIL`, tạo defect có bước tái hiện và evidence; không đổi expected để làm test pass nếu chưa được nghiệp vụ duyệt.
- Các expected có ghi “theo permission matrix/business rule đã duyệt” phải được đối chiếu với role, department và data scope đã cấu hình cho test cycle đó.

## 2. Bản đồ vấn đề cần kiểm thử toàn hệ thống

Thực hiện lần lượt theo phần để mỗi kết quả gắn với một luồng nghiệp vụ và evidence. Đây là phạm vi cần kiểm thử, không có nghĩa các case dưới đây đã chạy.

| Thứ tự | Phần / module | Vấn đề cần xác nhận | Ưu tiên | Điều kiện để test nghiệp vụ |
|---|---|---|---|---|
| 1 | Đăng nhập, session, RBAC, Admin (M6) | Đăng nhập đúng/sai/locked; danh tính/token; role × department × action; truy cập trực tiếp API ngoài quyền; tạo/trùng/sửa/khóa/mở khóa/reset/xóa user; bảo vệ Admin cuối cùng; audit trail. Cần xác minh mapping role nghiệp vụ ↔ role code; API tạo user hiện chỉ có email/password/name/role, chưa nhận department. | P0 | Stack staging, tài khoản test từng role/dept, permission matrix được duyệt. Chi tiết triển khai tại Phần 1 bên dưới. |
| 2 | Nạp tài liệu và đồng bộ (M1) | File đúng định dạng/giới hạn; file rỗng/hỏng/đường dẫn nguy hiểm; duplicate/idempotency; storage → watcher → parser → graph/vector; partial failure/retry; replace/rename/delete và orphan data. | P0 | Staging có storage riêng, Neo4j/Qdrant riêng, bộ file nhỏ tổng hợp, cách kiểm tra identity/count theo từng lớp. |
| 3 | Knowledge Editor và SOP (M2) | Đọc/sửa node/relationship; validation; source/provenance giữ nguyên; audit; SOP draft/edit/publish/search/delete; BR-04 chặn publish khác department và standard user. | P1 | Hai tài khoản scope khác nhau, entity/source fixture, SOP code riêng; chốt field nào được sửa và quyền tương ứng. |
| 4 | Search và preview (M5) | Keyword/category/dept/status facets; empty result; filter kết hợp; stale results; pagination/limit; snippet/preview/detail/download; không lộ title/count/content ngoài scope. | P0 | Fixture mỗi entity type và hai department có marker riêng, expected result IDs đã ghi trước. |
| 5 | Copilot / GraphRAG (M3) | Greeting/intent; câu đơn và hybrid graph+vector; answer-grounding/citation; ambiguous/unsupported/no-result; multi-turn/session ownership; pin/unpin/share; prompt/Cypher read-only safety; fallback khi một nguồn lỗi. | P0 | Snapshot graph/vector và golden Q&A/citation được nghiệp vụ review; cấu hình LLM sandbox nếu case cần gọi model thật. |
| 6 | Dashboard, risk, reports (M4) | KPI/filter/date range/tổng hợp so với ground truth; alert truy ra record nguồn; state khi sync lỗi/dữ liệu rỗng; shift report draft→submit→reject/approve, quyền author/reviewer, lock sau trạng thái cuối. | P1 | Snapshot dữ liệu có phép tính expected; 2 author/reviewer theo department; rule SLA/risk được PO duyệt. |
| 7 | Kết nối và vận hành | Health/degraded dependency; Google OAuth/connector sync; watcher events; timeout/retry; lỗi hiển thị/log; frontend route/error state; build, performance và accessibility cơ bản. | P1/P2 | Sandbox OAuth/LLM tách biệt; fault injection có kiểm soát; ngưỡng performance được thống nhất trước đo. |

### Thứ tự triển khai

1. Hoàn thiện và review testcase Phần 1 (M6) dưới đây.
2. Tạo/kiểm tra data fixtures; chỉ khi có dữ liệu đúng scope mới chạy Phần 2–6.
3. Với mỗi phần: chạy negative/permission cases trước, sau đó luồng happy path, đối soát dữ liệu, cleanup và regression.
4. Ghi rõ `BLOCKED` nếu thiếu fixture/expected nghiệp vụ; không biến một API 200 hay màn hình render thành PASS cho toàn luồng.

## 2A. Phần 1 — Chi tiết testcase đăng nhập, session, RBAC và Admin (M6)

**Phạm vi:** định nghĩa rõ đầu vào, bước thao tác và expected cho tester; chưa phải kết quả thực thi. Endpoint admin hiện ở `/api/v1/admin`; login/me ở `/api/v1/auth`; kiểm tra policy tổng quát ở `/api/v1/rbac/check`. Không dùng dữ liệu production. Trong case admin, tạo tài khoản test duy nhất và cleanup ngay cả khi assertion lỗi.

| ID | Mục tiêu / input | Các bước thực thi | Expected result / điều kiện PASS |
|---|---|---|---|
| M6-AUTH-01 | Đăng nhập hợp lệ bằng tài khoản test đã seed cho từng role đang được hệ thống hỗ trợ (`standard`, `knowledge_manager`, `executive`, `it_admin`); password lấy từ staging secret, không lưu trong evidence. | Gửi `POST /api/v1/auth/login` bằng username rồi lặp bằng email của cùng user. Lưu status, `user.id/email/role/status`, loại token; gọi `GET /api/v1/auth/me` với Bearer token. | Cả hai hình thức trả 200; cùng user ID và role chuẩn; token type `bearer`; `/me` trả đúng user. So sánh 4 role với role mapping được PO duyệt. Nếu không có test account hoặc mapping role nghiệp vụ chưa duyệt thì `BLOCKED`. |
| M6-AUTH-02 | Password sai cho user đang active: `{"identifier":"<test-username>","password":"<sai>"}`. | Gửi login; sau đó thử `/api/v1/auth/me` không token và `/api/v1/admin/users` bằng response (nếu có token). | Login trả 401, không có access token; `/me` thiếu token trả 401; không có quyền truy cập admin. |
| M6-AUTH-03 | Identifier không tồn tại: `gm-qa-no-such-user-<timestamp>`. | POST login bằng identifier trên và password hợp lệ về hình thức; kiểm tra status/body. | Trả 401, không có access token, không lộ stack trace/secret. Không yêu cầu message giống trường hợp sai password vì implementation có thể phân biệt; ghi nhận riêng nếu policy chống user enumeration yêu cầu đồng nhất message. |
| M6-AUTH-04 | Payload thiếu `identifier`; payload thiếu `password`; payload `{}`; payload có chuỗi rỗng. | Gửi từng payload riêng đến login; ghi status/body cho từng trường hợp. | Thiếu field trả 422 validation; chuỗi rỗng không được cấp token và bị từ chối. Xác nhận không có exception 500. |
| M6-AUTH-05 | Tài khoản test active và token hợp lệ đã cấp; sau đó admin gọi `PATCH /api/v1/admin/users/{id}/lock`. | 1. Xác nhận login và `/api/v1/auth/me` bằng token đang hoạt động trả 200. 2. Khóa tài khoản. 3. Thử login mới. 4. Gọi `/api/v1/auth/me` bằng token cũ. 5. Mở khóa và login lại. | Lock trả user `status=locked`, `is_active=false`; login mới trả 403; token cũ gọi `/me` cũng trả 403 theo guard hiện có; unlock đổi status thành active và login lại trả 200. |
| M6-AUTH-06 | Token thiếu, token sai chữ ký và token hết hạn; token hợp lệ trước đó. | GET `/api/v1/auth/me` lần lượt không Authorization, Bearer token giả, token hết hạn; cuối cùng dùng token hợp lệ. | Ba trường hợp đầu trả 401; token hợp lệ trả 200 và đúng user. Không response nào chứa thông tin user khi token không hợp lệ. |
| M6-RBAC-01 | Role × department với read: `standard` ở Sales; `knowledge_manager` ở Sales; `executive`; `it_admin`. Thử các department Sales, R&D, Legal, Accounting/Procurement, IT. Body `/rbac/check`: `{"department":"<dept>","resource_type":"contract","action":"read"}`. | Với mỗi role gửi POST `/api/v1/rbac/check` cho từng department; ghi `allowed`, `rule`, role và canonical department. Sau đó gọi ít nhất một endpoint dữ liệu trực tiếp cho một department được phép và một department bị từ chối. | Theo default matrix hiện tại trong `rbac_matrix_service.py`: standard được Sales/IT/R&D; knowledge_manager được Sales/Accounting-Procurement/IT/R&D nhưng không Legal; executive và it_admin được mọi department. Endpoint `/rbac/check` có thể trả HTTP 200 với `allowed=false`; endpoint dữ liệu trực tiếp ngoài scope không được trả nội dung. Product Owner cần xác nhận ma trận nghiệp vụ trước nghiệm thu. |
| M6-RBAC-02 | Quyền publish SOP: manager Sales publish Sales; manager Sales publish Legal; standard publish Legal; admin/executive theo matrix. | Tạo draft SOP test riêng cho Sales và Legal. Gọi publish bằng từng account; sau deny, GET SOP xác nhận trạng thái chưa đổi. Cleanup draft. | Manager được publish SOP trong scope Sales; manager publish Legal bị chặn do khác department và ngoài default matrix; standard bị chặn; deny ở API publish là 403 và không đổi trạng thái. Quyền admin/executive phải khớp permission matrix đã duyệt. |
| M6-RBAC-03 | Search/detail scope: một document marker `GM-QA-SCOPE-LEGAL` ở Legal, một `GM-QA-SCOPE-SALES` ở Sales; user Sales. | Search marker bằng `/api/search/multifacet`; gọi `GET /api/documents/detail?doc_id=<legal-id>&department=Legal`; lặp với document Sales. | Kết quả/metadata/snippet của Legal không lộ; detail Legal trả 403; detail Sales được phép theo fixture. Kiểm tra API, không chỉ ẩn trên UI. |
| M6-ADMIN-01 | Create user hợp lệ: email `gm-qa-<timestamp>@graphmind.test`, role `standard`, full name `GM QA`; password staging tạm từ secret store, dài ít nhất 8 ký tự. | POST `/api/v1/admin/users`; GET list xác nhận user; dùng cùng email POST lần hai; sau đó DELETE user test. | Tạo trả 201, email normalized, role/status đúng; lần tạo trùng trả 409; cleanup trả 204. Schema hiện không có field department: không ghi kỳ vọng “gán department” qua endpoint này; xác minh luồng gán scope riêng trước test. |
| M6-ADMIN-02 | Validation create-user: email sai format, password ngắn hơn 8 ký tự, role không thuộc `executive/it_admin/knowledge_manager/standard`. | Gửi mỗi payload qua POST admin users; kiểm tra không có user được tạo. | Mỗi payload trả 422; user không xuất hiện trong list/DB; không trả hash/password. |
| M6-ADMIN-03 | Tài khoản user test thường; role mới hợp lệ; thử sửa role chính admin đang đăng nhập. | PATCH `/api/v1/admin/users/{id}/role` cho user test; GET list xác nhận role; PATCH self-role bằng admin actor; thử role không hợp lệ; kiểm tra audit log `ROLE_CHANGE`. | User test đổi role đúng và có audit; self-role bị 400; role không hợp lệ bị 422; không tạo thay đổi một phần khi bị từ chối. |
| M6-ADMIN-04 | User test thường ở trạng thái active, token mới cấp trước khi lock. | Admin PATCH `/users/{id}/lock`; kiểm tra response/status; thử login mới; thử token cũ theo policy; PATCH unlock; login lại; kiểm tra audit `USER_LOCK/USER_UNLOCK`. | Lock chuyển `status=locked`, `is_active=false`; login mới 403; unlock chuyển active và login thành công. Hiệu lực token cũ phải được xác nhận theo security policy. |
| M6-ADMIN-05 | User test; password mới theo secret store, tối thiểu 8 ký tự; password cũ vẫn lưu riêng trong secret tạm của test. | PATCH `/users/{id}/reset-password`; thử login bằng password cũ rồi mới; kiểm tra response/admin audit. | Reset thành công; password cũ 401; password mới login được; response không chứa password/hash; có audit `PASSWORD_RESET`. Cleanup user. |
| M6-ADMIN-06 | User test không phải Administrator gốc; thêm trường hợp có session/audit liên quan nếu test soft delete; không thao tác trên admin duy nhất. | DELETE `/users/{id}`; GET list/login; lặp negative self-delete và delete Administrator gốc trên staging fixture an toàn. | User test bị xóa/ẩn theo API; login không thành công; self-delete và xóa Administrator gốc bị 400; xóa admin cuối cùng bị từ chối. Kiểm tra audit `USER_DELETE`, phân biệt hard/soft delete đúng dữ liệu liên quan. |
| M6-ADMIN-07 | Ghi nhận actor/email và các action vừa tạo: `USER_CREATE`, `ROLE_CHANGE`, `USER_LOCK`, `USER_UNLOCK`, `PASSWORD_RESET`, `USER_DELETE`. | GET `/api/v1/admin/audit-logs` với admin token; lọc `action` và `resource_type`; gọi cùng endpoint bằng standard token. | Admin thấy đúng event/actor/resource; bộ lọc không trả event ngoài điều kiện; standard bị 403. Không log secret/password/hash. |

**Coverage/gap của Phần 1:** User Story/tài liệu trước đó nêu role `Research Team`, trong khi backend canonical roles là `executive`, `it_admin`, `knowledge_manager`, `standard`; cần Product Owner xác nhận `Research Team` tương ứng role hay department trước khi tạo account/expected. Robot M6 chạy thật trên staging cô lập ngày 2026-11-11: **5 scenario PASS**. Workbook ghi **5/16 testcase PASS, 10 BLOCKED do chỉ được kiểm chứng một phần, 1 NOT RUN**; không suy rộng kết quả của scenario thành PASS cho testcase chưa được bao phủ đủ. Pytest integration trước đó xác nhận thêm role aliases, một phần RBAC, schema validation và token thiếu/sai. API user-admin tạo user chưa hỗ trợ department field; cần thống nhất endpoint/quy trình gán scope trước khi kiểm thử đầy đủ role × department.

**M2 — Knowledge Editor/SOP:** Robot staging `api_m2_sop.robot` đã chạy **3/3 scenario PASS** cho tạo/sửa/đọc/lọc/xóa SOP draft, publish trong department, đọc SOP đã publish và chặn publish ngoài quyền mà không đổi trạng thái draft. Lần chạy đầu phát hiện lỗi SQL audit khiến publish trả 500; đã sửa publish dùng audit service/schema hiện hành và retest đạt. Kiểm thử sửa thuộc tính/quan hệ graph vẫn **BLOCKED**: `KnowledgeView` hiện chỉ gửi trạng thái xác minh qua `/api/graph/verify`, chưa có API lưu thuộc tính/quan hệ; không thể xác nhận dữ liệu đã sửa được lưu bền vững hoặc giữ provenance. Chạy regression sau M2 đạt thêm M6 Robot **5/5**; sửa `get_request_user` để bỏ qua user soft-deleted trong tra cứu email/username, tránh bản ghi fixture đã xóa làm mơ hồ alias `manager`.

## 2B. Test cases theo quy trình nghiệp vụ (catalogue tổng thể)

### A. Đăng nhập, session và quyền truy cập

#### TC-AUTH-001 — Đăng nhập hợp lệ và vào dashboard theo role

| Trường | Nội dung |
|---|---|
| Story / luồng | M6 — Authenticate user and enforce RBAC |
| Ưu tiên / loại | P0 / UI-E2E |
| Tiền điều kiện / dữ liệu | Tài khoản staging cho các canonical role backend `standard`, `knowledge_manager`, `executive`, `it_admin`; cần PO xác nhận mapping sang role trong User Story, đặc biệt `Research Team`, trước khi coi coverage role hoàn chỉnh. |
| Bước thực hiện | 1. Mở trang đăng nhập. 2. Nhập thông tin hợp lệ. 3. Gửi form đăng nhập. 4. Mở một màn hình thuộc quyền của role. 5. Tải lại trang. |
| Kết quả mong đợi | Đăng nhập thành công; session/danh tính được duy trì hợp lệ; điều hướng và navigation phù hợp role; không lộ token/credential trong UI hoặc log. |
| Automation hiện có | Robot có đăng nhập admin và kiểm tra một số màn hình; chưa chứng minh toàn bộ role. |
| Actual / Status / Defect / Evidence | Chưa chạy case nghiệm thu / `NOT RUN` / — / — |

#### TC-AUTH-002 — Từ chối thông tin đăng nhập không hợp lệ

| Trường | Nội dung |
|---|---|
| Story / luồng | M6 — Authenticate user |
| Ưu tiên / loại | P0 / API + UI |
| Tiền điều kiện / dữ liệu | Staging khả dụng; các data class: sai password, username không tồn tại, thiếu trường bắt buộc và giá trị rỗng. |
| Bước thực hiện | 1. Lần lượt gửi từng bộ dữ liệu không hợp lệ. 2. Quan sát response/thông báo UI. 3. Gọi endpoint yêu cầu xác thực bằng session/token không hợp lệ. |
| Kết quả mong đợi | Login bị từ chối, không cấp session/token hợp lệ; lỗi validation/thông báo không làm lộ thông tin nhạy cảm; request sau đăng nhập bị chặn. Không giả định thông báo cụ thể nếu chưa chốt theo UI contract. |
| Automation hiện có | Pytest integration kiểm tra login payload thiếu trường; chưa bao phủ đủ các lớp dữ liệu và UI. |
| Actual / Status / Defect / Evidence | Chưa chạy case nghiệm thu / `NOT RUN` / — / — |

#### TC-RBAC-001 — Phân quyền theo role, department và data scope

| Trường | Nội dung |
|---|---|
| Story / luồng | M6/M3/M5 — Role and data-scope enforcement |
| Ưu tiên / loại | P0 / Integration + UI-E2E |
| Tiền điều kiện / dữ liệu | Permission matrix được nghiệp vụ duyệt; có Standard User thuộc department A và dữ liệu được phép/không được phép, cùng user đại diện role khác. |
| Bước thực hiện | 1. Đăng nhập bằng Standard User. 2. Đọc/tìm kiếm dữ liệu thuộc scope được cấp. 3. Lặp lại với dữ liệu ngoài scope qua UI. 4. Gửi trực tiếp request API cho dữ liệu ngoài scope. 5. Lặp lại với SME Manager/Admin theo permission matrix. |
| Kết quả mong đợi | Dữ liệu trong scope được phép truy cập; dữ liệu ngoài scope không xuất hiện trong kết quả/preview/response; backend từ chối dù UI bị bypass; role đặc biệt chỉ có quyền theo matrix đã duyệt. |
| Automation hiện có | Integration smoke có kiểm tra user Sales bị chặn Legal và executive unrestricted rule; chưa bao phủ mọi role, action và search surface. |
| Actual / Status / Defect / Evidence | Chưa chạy matrix đầy đủ / `NOT RUN` / — / — |

#### TC-ADMIN-001 — Admin cấp tài khoản và quyền, user chỉ dùng đúng quyền

| Trường | Nội dung |
|---|---|
| Story / luồng | M6 — User and permission administration |
| Ưu tiên / loại | P0 / API-E2E |
| Tiền điều kiện / dữ liệu | Admin staging; user thử nghiệm chưa tồn tại; role và department scope hợp lệ. |
| Bước thực hiện | 1. Admin tạo user test và gán role. 2. Gán department/data scope qua cấu hình/API được dự án xác nhận (không giả định POST `/api/v1/admin/users` có field này). 3. User đăng nhập. 4. Thử chức năng trong scope và ngoài scope. 5. Admin cập nhật/thu hồi role hoặc scope rồi chạy lại request. 6. Dọn user test. |
| Kết quả mong đợi | User/role/scope được lưu đúng; allow/deny khớp permission matrix; thay đổi quyền có hiệu lực theo policy session đã duyệt; thao tác quản trị được audit nếu audit log thuộc cấu hình hiện hành; dữ liệu test được dọn. |
| Automation hiện có | Robot staging có tạo/xóa user và kiểm tra user bị cấm quản trị user; chưa kiểm tra thay đổi scope, audit hoặc toàn bộ vòng đời. |
| Actual / Status / Defect / Evidence | Chưa chạy case nghiệm thu / `NOT RUN` / — / — |

### B. Nạp tài liệu và quản trị tri thức

#### TC-ING-001 — Nạp tài liệu hợp lệ theo luồng đồng bộ

| Trường | Nội dung |
|---|---|
| Story / luồng | M1 → M2 — Document ingestion to knowledge base |
| Ưu tiên / loại | P1 / API + UI-E2E |
| Tiền điều kiện / dữ liệu | Tài khoản được phép nạp; một tài liệu tổng hợp thuộc định dạng/kích thước hiện được hỗ trợ; staging storage và các dịch vụ cần thiết healthy. |
| Bước thực hiện | 1. Ghi nhận trạng thái ban đầu. 2. Nạp tài liệu qua luồng sản phẩm đang hỗ trợ. 3. Theo dõi trạng thái xử lý. 4. Mở tài liệu trong Knowledge Base. 5. Tìm kiếm một đoạn/metadata đã biết. |
| Kết quả mong đợi | Tệp được nhận/lưu; xử lý thành công hoặc lỗi được nêu rõ; tài liệu có thể được tìm thấy theo metadata/nội dung phù hợp; mọi citation chỉ về đúng tài liệu/đoạn nguồn. |
| Automation hiện có | Có API route được xác nhận trong Robot OpenAPI check; chưa có bằng chứng Robot hoàn tất upload-to-search. |
| Actual / Status / Defect / Evidence | Chưa chạy case nghiệm thu / `NOT RUN` / — / — |

#### TC-ING-002 — Từ chối tài liệu rỗng, hỏng hoặc không được hỗ trợ

| Trường | Nội dung |
|---|---|
| Story / luồng | M1 — Validate ingestion input |
| Ưu tiên / loại | P1 / API + UI |
| Tiền điều kiện / dữ liệu | Xác nhận trước danh sách định dạng/giới hạn upload theo cấu hình của release; chuẩn bị file rỗng, file hỏng và file không hỗ trợ. |
| Bước thực hiện | 1. Nạp lần lượt từng file. 2. Ghi nhận response, UI state và trạng thái storage. 3. Kiểm tra các database không nhận bản ghi/vector/graph rác. |
| Kết quả mong đợi | Đầu vào không hợp lệ bị từ chối hoặc đánh dấu lỗi theo contract; thông báo có thể xử lý; không báo indexing thành công và không tạo dữ liệu mồ côi. |
| Automation hiện có | Chưa tìm thấy test tự động tương ứng trong testpaths/Robot suite. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-ING-003 — Nạp lặp tài liệu và kiểm tra idempotency

| Trường | Nội dung |
|---|---|
| Story / luồng | M1/M2 — Update data without duplicate records |
| Ưu tiên / loại | P0 / Integration + E2E |
| Tiền điều kiện / dữ liệu | Một tài liệu test có định danh/hash xác định; ghi nhận số lượng/trạng thái liên quan trước khi chạy. |
| Bước thực hiện | 1. Nạp tài liệu lần đầu và đợi hoàn tất. 2. Nạp lại cùng nội dung với cùng định danh. 3. So sánh document identity, graph nodes/relations, vector points và danh sách UI trước/sau. |
| Kết quả mong đợi | Theo quy tắc dedup đã chọn, thao tác lặp không nhân đôi tài liệu/chunk/quan hệ; nếu tạo phiên bản mới là hành vi dự kiến thì version/source linkage được xác định rõ và truy vết được. |
| Automation hiện có | Chưa tìm thấy test tự động end-to-end tương ứng. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-ING-004 — Xác nhận tính nhất quán giữa storage, graph và vector index

| Trường | Nội dung |
|---|---|
| Story / luồng | M1/M2/M6 — Consistent enterprise knowledge |
| Ưu tiên / loại | P0 / Integration |
| Tiền điều kiện / dữ liệu | Một document ID test đã nạp; có cách kiểm tra an toàn trong staging cho central storage, Neo4j và Qdrant. |
| Bước thực hiện | 1. Lấy document ID/source identity. 2. Kiểm tra tệp gốc và trạng thái xử lý. 3. Kiểm tra node/relationship graph liên quan. 4. Kiểm tra vector/chunk có cùng source identity. 5. Gây lỗi có kiểm soát ở một dependency nếu môi trường hỗ trợ. |
| Kết quả mong đợi | Các lớp cùng trỏ về nguồn/định danh nhất quán; trạng thái pipeline phản ánh lỗi/partial failure; không báo hoàn tất khi một bước bắt buộc thất bại; retry không tạo duplicate. |
| Automation hiện có | Có script kiểm tra data layers riêng; chưa xác nhận là test mặc định hoặc E2E có fixture cô lập. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-ING-005 — Cập nhật và xóa nguồn dữ liệu được đồng bộ

| Trường | Nội dung |
|---|---|
| Story / luồng | M1 — Keep changed source data synchronized |
| Ưu tiên / loại | P1 / Integration + E2E |
| Tiền điều kiện / dữ liệu | File test riêng trong staging và watcher đang hoạt động; quy tắc xử lý update/delete được chốt. |
| Bước thực hiện | 1. Tạo file. 2. Xác nhận ingestion. 3. Sửa nội dung/metadata. 4. Xác nhận chỉ mục phản ánh phiên bản mới. 5. Xóa file test theo quy trình hỗ trợ. 6. Kiểm tra trạng thái downstream. |
| Kết quả mong đợi | Watcher/API nhận đúng thay đổi; nội dung cũ không được trình bày như mới; khi xóa, dữ liệu downstream được xử lý theo retention/deletion policy; log có thể truy vết. |
| Automation hiện có | Chưa tìm thấy test tự động tương ứng. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-KNOW-001 — Lưu thuộc tính tri thức và kiểm soát quan hệ

| Trường | Nội dung |
|---|---|
| Story / luồng | M2 — Human-in-the-loop knowledge correction |
| Ưu tiên / loại | P1 / API + E2E |
| Tiền điều kiện / dữ liệu | User Knowledge Manager/Admin/Executive; entity Neo4j test có source/provenance đã biết; có property cũ/mới. |
| Bước thực hiện | 1. Sửa name, penalty limit, risk flag hoặc notes. 2. Lưu. 3. Kiểm tra response/API và đọc lại node từ Neo4j. 4. Xác nhận source/provenance không đổi. 5. Thử user Standard và entity không tồn tại. |
| Kết quả mong đợi | Chỉ field được cho phép thay đổi; backend JWT/RBAC ghi actor/time metadata; source/provenance được giữ nguyên; lỗi quyền, entity hoặc Neo4j không bị báo thành công. |
| Automation hiện có | `backend/app/tests/integration/test_m2_graph_editor.py`: API contract, role denial, unknown-field validation, not-found/error handling (Neo4j fake). Staging E2E đã tạo fixture có phạm vi, PUT property, GET node và cleanup. |
| Actual / Status / Defect / Evidence | **PARTIAL** — property save đã được xác nhận trên Neo4j staging: 4 field đọc lại đúng, source document giữ nguyên, actor/time stamp có mặt, standard JWT bị 403 và anonymous bị 401; fixture đã dọn. 8 backend integration tests đạt. Duyệt/từ chối/sửa relationship và Copilot propagation chưa xác nhận; queue hiện là dữ liệu mẫu, không có Neo4j relationship ID. |

### C. Tìm kiếm, Copilot và quyết định

#### TC-SEARCH-001 — Tìm kiếm thống nhất và lọc đa tiêu chí

| Trường | Nội dung |
|---|---|
| Story / luồng | M5 — Enterprise Multi-facet Search |
| Ưu tiên / loại | P1 / UI-E2E |
| Tiền điều kiện / dữ liệu | Fixture có Customer, Product, Order, Contract/Document và metadata filter đã biết; account có scope phù hợp. |
| Bước thực hiện | 1. Tìm bằng từ khóa duy nhất. 2. Xác nhận loại thực thể/kết quả. 3. Áp dụng từng facet được hỗ trợ: entity type, department, ngày, transaction value, validity. 4. Kết hợp nhiều facet. 5. Thử truy vấn không có kết quả. |
| Kết quả mong đợi | Kết quả liên quan, loại và metadata đúng; mỗi facet thu hẹp tập kết quả theo dữ liệu; empty state không hiển thị kết quả cũ như mới. |
| Automation hiện có | Robot UI mở màn hình Search; chưa thao tác tìm kiếm/facet. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-SEARCH-002 — Tôn trọng data scope trên kết quả và preview

| Trường | Nội dung |
|---|---|
| Story / luồng | M5/M6 — Search only permitted enterprise data |
| Ưu tiên / loại | P0 / API + UI-E2E |
| Tiền điều kiện / dữ liệu | Hai department có record phân biệt được; Standard User chỉ được phép truy cập một scope. |
| Bước thực hiện | 1. Search từ khóa khớp cả hai scope. 2. Kiểm tra kết quả, facet count, snippet và preview. 3. Gọi trực tiếp API detail của record ngoài scope. |
| Kết quả mong đợi | Không rò tên, snippet, count nhạy cảm hoặc nội dung preview ngoài scope; API cũng từ chối/ẩn dữ liệu theo policy, không chỉ ẩn trên UI. |
| Automation hiện có | RBAC integration có cross-department check; chưa bao phủ search/facet/preview. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

#### TC-COP-001 — Hỏi đáp một nguồn và đối chiếu nguồn/citation

| Trường | Nội dung |
|---|---|
| Story / luồng | M3 — Grounded natural-language question |
| Ưu tiên / loại | P1 / Golden integration |
| Tiền điều kiện / dữ liệu | Golden fixture có ground truth và nguồn đã review; chọn câu hỏi đơn-hop về một customer/product/order/document. |
| Bước thực hiện | 1. Gửi câu hỏi cố định. 2. Ghi câu trả lời, route/intent và citations. 3. Mở từng citation. 4. Đối chiếu kết quả với ground truth. |
| Kết quả mong đợi | Giá trị trả lời khớp expected trong tolerance đã định; citation tồn tại, trỏ đúng nguồn/đoạn và có bằng chứng cho phát biểu; không tạo dữ kiện ngoài fixture. |
| Automation hiện có | Golden NL2Cypher suite có các trường hợp phân tích và cần chạy riêng; không thuộc pytest mặc định. |
| Actual / Status / Defect / Evidence | Chưa chạy cycle nghiệm thu / `NOT RUN` / — / — |

#### TC-COP-002 — Hỏi đáp Hybrid qua graph và nội dung hợp đồng

| Trường | Nội dung |
|---|---|
| Story / luồng | M3/M5 — Explainable Hybrid GraphRAG |
| Ưu tiên / loại | P1 / Golden integration |
| Tiền điều kiện / dữ liệu | Fixture customer/order–contract liên kết đã kiểm tra; clause nằm trong vector index; expected answer/citation được xác nhận. |
| Bước thực hiện | 1. Gửi câu hỏi yêu cầu nối thực thể kinh doanh với nội dung hợp đồng. 2. Kiểm tra evidence từ graph và vector. 3. Đối chiếu câu trả lời, citations và permission scope. |
| Kết quả mong đợi | Kết quả chỉ nối đúng entities/documents theo fixture; citations bao phủ nguồn cần thiết, không trỏ nhầm hợp đồng; nếu một nguồn không có dữ liệu thì nêu giới hạn thay vì suy diễn. |
| Automation hiện có | Có golden/regression scripts liên quan Hybrid RAG nhưng chạy riêng và phụ thuộc dataset/runtime. |
| Actual / Status / Defect / Evidence | Chưa chạy cycle nghiệm thu / `NOT RUN` / — / — |

#### TC-COP-003 — Câu hỏi mơ hồ, thiếu dữ liệu hoặc ngoài schema

| Trường | Nội dung |
|---|---|
| Story / luồng | M3 — Clarification and unsupported-metric honesty |
| Ưu tiên / loại | P0 / Golden integration |
| Tiền điều kiện / dữ liệu | Bộ câu hỏi đã review gồm “tốt nhất” không nêu metric, metric không có trong schema, và câu hỏi có nguồn nhưng không có record phù hợp. |
| Bước thực hiện | 1. Gửi từng câu hỏi. 2. Kiểm tra câu trả lời, clarification/refusal và citation. 3. Kiểm tra truy vấn sinh ra có read-only guard khi áp dụng. |
| Kết quả mong đợi | Hỏi lại khi tiêu chí mơ hồ; nói rõ metric/record không được hỗ trợ hoặc không có dữ liệu; không bịa số liệu/citation; không thực thi truy vấn ghi/xóa dữ liệu. |
| Automation hiện có | Golden suite có nhóm ambiguity/schema boundary/read-only security; chạy riêng. |
| Actual / Status / Defect / Evidence | Chưa chạy cycle nghiệm thu / `NOT RUN` / — / — |

#### TC-COP-004 — Hội thoại nhiều lượt, lưu và pin phiên

| Trường | Nội dung |
|---|---|
| Story / luồng | M3 — Multi-turn session and pinned knowledge |
| Ưu tiên / loại | P1 / API + UI |
| Tiền điều kiện / dữ liệu | Người dùng staging có quyền session; hai câu hỏi follow-up dựa trên cùng một fixture. |
| Bước thực hiện | 1. Tạo session và gửi câu hỏi đầu. 2. Hỏi follow-up phụ thuộc ngữ cảnh. 3. Đọc lại session. 4. Pin/unpin. 5. Thử truy cập session bằng user khác. |
| Kết quả mong đợi | Lịch sử/nguồn đúng thứ tự; follow-up giữ đúng ngữ cảnh và quyền; pin state được lưu/hiển thị nhất quán; user khác không truy cập session riêng nếu policy không cho phép. |
| Automation hiện có | Có test pin session ngoài pytest mặc định; cần chạy riêng và xác nhận auth/data ownership. |
| Actual / Status / Defect / Evidence | Chưa chạy cycle nghiệm thu / `NOT RUN` / — / — |

#### TC-COP-005 — Nhận diện lời chào không cần truy xuất tri thức

| Trường | Nội dung |
|---|---|
| Story / luồng | M3 — Copilot greeting and intent routing |
| Ưu tiên / loại | P1 / API integration |
| Tiền điều kiện / dữ liệu | Backend staging healthy; tài khoản thử nghiệm manager; câu hỏi `XIN CHÀO` bằng tiếng Việt. |
| Bước thực hiện | 1. Gửi `POST /api/copilot/ask` với `query=XIN CHÀO`, `lang=vi`. 2. Kiểm tra status, câu trả lời, citations và session. 3. Xóa session thử nghiệm. |
| Kết quả mong đợi | Trả lời lời chào bằng tiếng Việt; không truy xuất dữ liệu/citation; session được cleanup sau test. |
| Automation hiện có | `backend/app/tests/test_copilot_greeting_and_role.py` có self-check tương ứng nhưng không nằm trong pytest mặc định; lỗi cũng được tái hiện qua staging API. |
| Actual / Status / Defect / Evidence | HTTP 200, success=true, citations rỗng nhưng nội dung trả lời “Không tìm thấy bằng chứng đủ tin cậy…”; session đã cleanup / `FAIL` / `GM-DEF-001` / staging API run 09-11-2026 |

#### TC-DASH-001 — Dashboard và cảnh báo phản ánh dữ liệu đã đồng bộ

| Trường | Nội dung |
|---|---|
| Story / luồng | M4 — Executive decision support |
| Ưu tiên / loại | P1 / API + UI-E2E |
| Tiền điều kiện / dữ liệu | Dataset snapshot có expected revenue/trend/customer/contract distribution/compliance values; user role có quyền xem dashboard. |
| Bước thực hiện | 1. Đọc KPI/biểu đồ/cảnh báo ban đầu. 2. Nạp hoặc chọn một thay đổi fixture đã biết. 3. Chờ quy trình đồng bộ hoàn tất. 4. Tải lại dashboard. 5. Đối chiếu với ground truth và drill-down source. |
| Kết quả mong đợi | Chỉ số, khoảng thời gian, tổng hợp và nguồn phù hợp fixture; thay đổi chỉ phản ánh sau khi sync hoàn tất; risk alert truy về dữ liệu chứng minh; lỗi nguồn không hiển thị như số liệu mới hợp lệ. |
| Automation hiện có | Có API route và màn hình; test API/dashboard theo expected business value chưa được xác nhận trong suite mặc định. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

### D. SOP, báo cáo và vận hành

#### TC-SOP-001 — Tạo, sửa, publish và tra cứu SOP

| Trường | Nội dung |
|---|---|
| Story / luồng | M2 — SOP & Internal Knowledge Base |
| Ưu tiên / loại | P1 / API + UI-E2E |
| Tiền điều kiện / dữ liệu | User có quyền soạn/publish; fixture SOP code/title duy nhất. |
| Bước thực hiện | 1. Tạo SOP nháp. 2. Đọc và kiểm tra dữ liệu. 3. Cập nhật nội dung bằng save endpoint hiện được UI sử dụng (`POST /api/v1/sop`). 4. Publish bằng manager đúng department. 5. Đọc SOP published bằng user thường và xác nhận audit event. 6. Thử publish SOP khác department bằng manager và SOP cùng department bằng standard user. 7. Đọc lại trạng thái sau deny; xóa fixture. |
| Kết quả mong đợi | Nội dung/trạng thái lưu chính xác; manager được publish đúng department; SOP published đọc được và có audit actor/resource; publish bị cấm trả 403, giữ trạng thái `draft`; fixture được dọn. |
| Automation hiện có | `tests/robot/api_m2_sop.robot`: tạo/sửa/đọc/lọc/xóa draft; publish + read + audit; BR-04 manager khác department và standard user. |
| Actual / Status / Defect / Evidence | **3/3 scenario PASS** ngày 2026-11-11 trên staging cô lập; log `%TEMP%\graphmind-m2-results\log.html`. Lần đầu publish trả 500 do audit ghi sai schema và làm transaction lỗi; đã sửa dùng `audit_service.log_action`, rebuild staging, retest PASS. |

#### TC-SOP-002 — Publish SOP sai scope không thay đổi bản nháp

| Trường | Nội dung |
|---|---|
| Story / luồng | M2/M6 — BR-04, SOP department scope |
| Ưu tiên / loại | P1 / API integration + Robot |
| Tiền điều kiện / dữ liệu | SOP draft test ở Legal và Sales; manager có scope Sales; standard account. |
| Bước thực hiện | Manager Sales thử publish SOP Legal; standard user thử publish SOP Sales; GET lại từng SOP sau mỗi lần từ chối. |
| Kết quả mong đợi | Mỗi publish bị từ chối HTTP 403; Legal draft và Sales draft vẫn là `draft`; dữ liệu kiểm thử được admin cleanup. |
| Actual / Status / Defect / Evidence | **PASS** trong scenario `Manager And Standard Cannot Publish Out-Of-Scope SOPs`; report `%TEMP%\graphmind-m2-results\log.html`. |

#### TC-OPS-001 — Shift report theo vòng đời nghiệp vụ

| Trường | Nội dung |
|---|---|
| Story / luồng | Decision support / shift reporting API hiện có |
| Ưu tiên / loại | P1 / API integration |
| Tiền điều kiện / dữ liệu | Người lập và người review test; trạng thái chuyển tiếp hợp lệ đã được xác nhận từ business rule/backend; report fixture riêng. |
| Bước thực hiện | 1. Tạo report. 2. Đọc report của người lập. 3. Cập nhật nội dung. 4. Submit. 5. Thử sửa sau submit nếu policy cấm. 6. Reviewer đọc và review. 7. User khác thử xem/sửa report không thuộc quyền. |
| Kết quả mong đợi | Nội dung và trạng thái chuyển theo state machine đã duyệt; thao tác sai vai trò/trạng thái bị chặn; quyền xem/sửa đúng scope; dữ liệu test được dọn theo policy. |
| Automation hiện có | Có API endpoints; chưa tìm thấy test tương ứng trong pytest mặc định. |
| Actual / Status / Defect / Evidence | Chưa chạy / `NOT RUN` / — / — |

## 2C. Kịch bản thực thi cụ thể cho catalogue tổng thể

Đây là kịch bản/expected result để thực thi, không phải kết quả đã chạy. Các giá trị `GM-QA-*` dưới đây là dữ liệu tổng hợp dành riêng cho staging, không phải dữ liệu đã có sẵn. Tạo fixture trước khi chạy; nếu fixture hoặc rule nghiệp vụ chưa được chuẩn bị thì ghi `BLOCKED`, không tự giả định kết quả để đánh dấu `PASS`. Trong workbook, sheet **Execution Detail** có cùng các bước và tiêu chí kiểm tra để tester điền kết quả từng bước.

| ID | Input / dữ liệu cần chuẩn bị | Thao tác và tiêu chí PASS cụ thể |
|---|---|---|
| TC-AUTH-001 | Stack Robot; tài khoản seed `admin` và `robot-user`, lấy mật khẩu từ cấu hình staging. | Đăng nhập từng tài khoản qua UI. PASS khi admin vào được phiên đăng nhập và identity là `robot-admin@graphmind.test`; user thường vào được phiên của mình; refresh vẫn giữ phiên hợp lệ; không có lỗi browser. Đây chỉ xác nhận hai tài khoản seed, không đại diện đủ bốn role. |
| TC-AUTH-002 | `POST /api/v1/auth/login`; lần lượt gửi `{"identifier":"robot-user","password":"<sai>"}`, identifier không tồn tại và `{}`. | Sai thông tin/identifier trả 401; body rỗng trả 422 theo validation. Không case nào trả `access_token`. Sau đó gọi `GET /api/v1/admin/users` không token và xác nhận 401. |
| TC-RBAC-001 | Integration test app không kết nối DB. Case A: headers `X-User-Name=sales_staff`, `X-User-Dept=Phòng Kinh Doanh`, body `{"department":"legal","resource_type":"contract","action":"read"}`. Case B: role executive, department Ban Giám Đốc, cùng body. | POST `/api/v1/rbac/check`. Case A phải trả HTTP 200, `allowed=false`, `rule=BR-02`; case B phải trả HTTP 200, `allowed=true`, `rule=BR-05`. Đây kiểm tra boundary rule API, chưa phải ma trận tất cả route/UI. |
| TC-ADMIN-001 | Admin token; email duy nhất `gm-qa-<timestamp>@graphmind.test`, `full_name=GM QA Temporary`, `role=standard`, mật khẩu staging đáp ứng tối thiểu 8 ký tự. | POST `/api/v1/admin/users` phải trả 201, email chuẩn hóa, role `standard`, status `active`. POST lại cùng email phải trả 409. Dùng token user thường gọi GET `/api/v1/admin/users` phải trả 403. Admin xóa fixture; GET list xác nhận user không còn hoạt động/được liệt kê theo API contract. |
| TC-ING-001 | File UTF-8 `GM-QA-ING-001.txt`, department `legal`, nội dung duy nhất `GM-QA-ING-001\nAgreement reference: GM-QA-REF-001\n`; dùng staging storage/Neo4j/Qdrant. | POST multipart `/api/v1/sync/upload`. PASS khi HTTP 200, `success=true`, `fileName`, `department=legal`, `storagePath`, SHA-256 `fileHash`, `sizeBytes` khớp file; đồng thời `data.success=true`. Kiểm tra inventory và tìm đoạn `GM-QA-REF-001`; nếu outer response success nhưng `data.success=false`, ghi FAIL (không tính là ingest thành công). |
| TC-ING-002 | Hai invalid inputs: `GM-QA-invalid.exe` (bất kỳ nội dung nhỏ); `GM-QA-oversize.txt` kích thước 10 MiB + 1 byte. | Upload từng file lên cùng endpoint. `.exe` phải trả 400; `.txt` vượt giới hạn phải trả 413. Sau mỗi lần, xác nhận inventory/storage không có file đó và không sinh bản ghi index. |
| TC-ING-003 | Dùng lại chính `GM-QA-ING-001.txt`, cùng bytes, department `legal`; ghi nhận inventory và số document/vector trước test. | Upload lần đầu rồi upload lại cùng filename/content. PASS khi cả response hợp lệ và hệ thống giữ một nguồn/index logic với cùng document identity, không tạo thêm Document node/vector chunk trùng. Không bắt buộc HTTP 409: route hiện cho phép target đã tồn tại và cần xác nhận hành vi idempotent ở pipeline. |
| TC-ING-004 | File TC-ING-001 đã ingest; lấy `fileHash`, `storagePath` và document ID từ response. | Đối chiếu storage, inventory, Neo4j Document node và Qdrant payload/chunk. PASS khi mọi lớp trỏ về cùng filename/department/hash hoặc source ID; có chunk/index theo pipeline; không có `success` giả khi thiếu một lớp. Lưu query/output từng lớp làm evidence. |
| TC-ING-005 | File hiện hữu `GM-QA-ING-001.txt`; nội dung thay thế kết thúc bằng `GM-QA-ING-002`; tên mới `GM-QA-ING-001-renamed.txt`. | POST `/api/v1/sync/documents/replace` với `old_name` và file mới; xác nhận inventory/preview chỉ phản ánh nội dung mới. POST `/api/v1/sync/documents/rename` với `old_name`, `new_name`, `department=legal`; xác nhận storage path đổi, phần mở rộng giữ nguyên và source không bị nhân đôi. POST `/api/v1/sync/documents/delete` body `{"file_name":"GM-QA-ING-001-renamed.txt","department":"legal"}`; xác nhận file, document và vector không còn. |
| TC-KNOW-001 | Fixture được nghiệp vụ duyệt: entity `GM-QA-CUSTOMER-001`, thuộc tính có giá trị cũ `GM-QA-OLD`, giá trị mới `GM-QA-NEW`, source document liên kết; user Knowledge Editor. | Sửa property cho phép, lưu và đọc lại node; source/provenance phải giữ nguyên. Thử Standard, entity không tồn tại và unknown field. PASS E2E chỉ khi giá trị mới được đọc lại từ Neo4j thật. Relationship review/edit và Copilot propagation cần testcase/contract riêng; chưa được tính PASS. |
| TC-SEARCH-001 | Tạo ba fixture có mã duy nhất: contract `GM-QA-CONTRACT-001` dept Legal/status Valid, document `GM-QA-DOC-001`, customer `GM-QA-CUSTOMER-001`; ghi metadata ground truth trước test. | GET `/api/search/multifacet?q=GM-QA&category=CONTRACT&dept=Legal&status=VALID&limit=10`; xác nhận chỉ contract phù hợp. Lặp `category=DOCUMENT` và `category=CUSTOMER`; xác nhận đúng fixture loại đó. Bổ sung query `GM-QA-NO-MATCH-999`; xác nhận empty result, không giữ kết quả từ tìm kiếm trước. |
| TC-SEARCH-002 | Hai document cùng query marker `GM-QA-SCOPE-001`: một thuộc Legal, một thuộc Sales; token user Sales. Ghi lại `doc_id` của record Legal. | Search marker bằng user Sales. PASS khi chỉ thấy record Sales, không lộ title/snippet/facet count của Legal. Gọi `GET /api/documents/detail?doc_id=<Legal-doc-id>&department=Legal` bằng cùng token phải trả 403 và không trả content. Cần xác nhận fixture scope đã được seed trước chạy. |
| TC-COP-001 | Golden dataset AdventureWorks đã nạp; query cố định `Đơn hàng #43659 được tạo vào thời điểm nào?`. Ground truth từ golden suite: order `43659`, date `2011-05-31`. | Gửi câu hỏi qua Copilot, lưu answer/citations. PASS khi câu trả lời có order ID và ngày `2011-05-31`, citation trỏ tới record/order source đúng; không chấp nhận chỉ HTTP 200. Nếu golden dataset chưa nạp thì BLOCKED. |
| TC-COP-002 | Contract fixture có company/order linkage và clause cụ thể đã được nghiệp vụ xác nhận; lưu expected value, source document ID và clause ID trước test. | Hỏi một câu yêu cầu kết hợp đúng entity với đúng clause. PASS khi mỗi thành phần trả lời khớp fixture và citations gồm đúng graph source lẫn contract clause; đổi sang document khác phải không được cite nhầm. Không chạy nếu chưa có fixture/ground truth. |
| TC-COP-003 | Gửi riêng ba câu: `Khách hàng tốt nhất là ai?`; `Doanh thu COGS của khách hàng là bao nhiêu?`; `Có đơn hàng GM-QA-ORDER-MISSING không?`. | Câu 1 phải hỏi rõ tiêu chí “tốt nhất”; câu 2 phải nêu COGS/metric không được hỗ trợ; câu 3 phải báo không có record. Không câu nào được bịa số hoặc citation. Lưu generated query và xác nhận read-only guard từ chối Cypher có `DELETE`, `CREATE` hoặc `SET`. |
| TC-COP-004 | Golden dataset; câu đầu `Thông tin của khách hàng Reuben D'sa là gì?` (ground truth ID `29722`); follow-up `Nhắc lại mã khách hàng vừa hỏi`; user A và user B cùng department. | Tạo session, gửi hai câu cùng session; follow-up phải giữ context và trả ID `29722`. Đọc lại session, xác nhận đủ hai lượt đúng thứ tự. Trước khi ghim, user B GET session phải nhận 404. User A ghim với `{"is_pinned":true,"notes":"GM-QA share check","department":"Sales"}`; xác nhận `isPinned=true`, `isShared=true`; user B cùng scope GET được session. User A bỏ ghim bằng `{"is_pinned":false}`; user B GET lại phải nhận 404. |
| TC-COP-005 | Staging healthy; manager test account; `POST /api/copilot/ask` body `{"query":"XIN CHÀO","lang":"vi"}`. | PASS khi HTTP 200, answer là lời chào tiếng Việt, citations `[]`, không chạy truy xuất tri thức và session được xóa sau test. Actual ngày 09-11-2026 là câu trả lời thiếu evidence; FAIL, defect `GM-DEF-001`. |
| TC-DASH-001 | Nạp cùng một snapshot đã chốt với nghiệp vụ; lưu expected KPI và cách tính (thời gian, currency, filter, timezone), cùng IDs của record tạo cảnh báo. | Chụp API/UI dashboard trước và sau sync hoàn tất. PASS khi từng KPI khớp phép tính ground truth, khoảng thời gian/filter hiển thị đúng, alert mở ra record nguồn đúng; mô phỏng lỗi sync không được cập nhật số liệu thành công giả. Chưa có snapshot thì BLOCKED. |
| TC-SOP-001 | Dùng mã duy nhất `GM-QA-SOP-001`; payload: title `Quy trình QA Legal`, dept `Legal`, version `v1.0`, purpose `Kiểm tra SOP staging`, steps `[{"num":1,"title":"Kiểm tra","desc":"Xác nhận nội dung"}]`. | Manager Legal POST `/api/v1/sop` → HTTP 200, `status=draft`, code khớp. GET detail xác nhận title/step lưu đúng. Publish bằng manager Legal → `status=published`, có `publishedAt`. Manager Legal publish SOP dept Sales phải HTTP 403 (BR-04); user standard publish phải 403. Tìm bằng list theo `q=GM-QA-SOP-001`; cleanup fixture sau test. |
| TC-OPS-001 | Test app với author Sales `ops` (standard_user), manager Sales `manager` (department_manager); body `{"summary":"Xử lý 2 ca","cases":[{"customer":"ACME","issue":"Lỗi giao hàng","solution":"Đã liên hệ vận chuyển","ref":"EDR-1","status":"resolved"}],"proposals":"Theo dõi trong ca sau"}`. | Author POST report → `DRAFT`; PUT đổi summary thành `Xử lý 3 ca` → cập nhật; manager sửa phải 403; submit khi có summary → `SUBMITTED` và `contentHash` 64 ký tự; sửa sau submit → 409. Manager reject không comment → 422; reject có lý do → `REJECTED`; author sửa/gửi lại → `SUBMITTED`; manager approve → `APPROVED`; review lần hai hoặc sửa sau approve → 409. |

## 3. Kết quả chạy test — 09-11-2026

Đã chạy trên working tree hiện tại (HEAD `7897c37` cùng các thay đổi chưa commit), trên Windows và stack `docker-compose.robot.yml`. Kết quả chỉ áp dụng cho các lệnh/case dưới đây.

| Cấp độ / bộ test | Kết quả | Ghi chú |
|---|---|---|
| Backend unit: `python -m pytest -q backend/app/tests/unit` | **109 passed** | Một cảnh báo deprecation từ dependency `anyio`. |
| Backend integration: `python -m pytest -q backend/app/tests/integration` | **3 passed** | Dùng test app/fake dependencies. |
| Admin authorization self-check: `python -m app.tests.test_user_admin_api` (từ `backend`) | **Passed** | Không kết nối database. |
| Frontend: `npm --prefix frontend run build` | **Passed** | Vite báo một bundle JavaScript lớn hơn 500 kB sau minify; build không lỗi. |
| Robot UI/API/workflows: `robot --outputdir %TEMP%\\graphmind-robot-results tests\\robot` | **23 passed, 0 failed** | 2 API readonly, 3 workflow, 2 smoke, 16 UI/render. Chạy trên staging cô lập; workflow đã tạo và cleanup SOP/user tạm. |
| API read-only smoke | **36 endpoint không có lỗi server/transport** | `knowledge-explorer/search` lần đầu trả 422 do dùng sai tên query parameter; tra OpenAPI, chạy lại với `query` và nhận 200. |
| TC-COP-005 — Copilot greeting | **FAIL** | API trả lời từ chối do thiếu evidence thay vì chào; session tạm đã cleanup. Xem `GM-DEF-001`. |
| GraphRAG golden/data-accuracy | **BLOCKED** | Neo4j staging có 0 node; không có dataset/vector fixture để xác nhận câu trả lời và citation. |

### Defect log

| Defect ID | Test Case ID | Severity | Mô tả | Trạng thái |
|---|---|---|---|---|
| GM-DEF-001 | TC-COP-005 | Medium | Lời chào `XIN CHÀO` nhận câu trả lời từ chối “Không tìm thấy bằng chứng đủ tin cậy…” thay vì greeting. Tái hiện qua `POST /api/copilot/ask`; HTTP 200, citations rỗng. | New — cần phân loại và sửa/retest |

### Phạm vi chưa được xác nhận

- Ingestion tài liệu đầu-cuối, watcher filesystem event, deduplication và đối soát central storage/Neo4j/Qdrant.
- Search và dashboard với dataset có ground truth; GraphRAG answer/citation accuracy.
- Shift report lifecycle; đầy đủ RBAC permission matrix và quản trị/reset/lock tài khoản.
- Google OAuth/sync và LLM thật; các tích hợp này cần cấu hình/credential sandbox riêng.

Vì vậy, đây là một đợt smoke/regression có kết quả cụ thể, **chưa phải nghiệm thu hoàn tất toàn bộ hệ thống**.

## 4. Test suites và supporting checks

Các suite/check này cung cấp bằng chứng kỹ thuật, không thay thế các luồng nghiệp vụ ở trên.

| ID | Phạm vi | Bằng chứng/test file | Lệnh/phạm vi chạy | Trạng thái hiện biết |
|---|---|---|---|---|
| TC-UNIT-001 | TXT parser, định danh tài liệu, Excel grounding, safety guard và fake Neo4j/Qdrant | `backend/app/tests/unit/` | `python -m pytest -q backend/app/tests/unit` | **PASS — 109 passed** |
| TC-INT-001 | App factory, RBAC executive/department boundary, login validation | `backend/app/tests/integration/test_app_factory_smoke.py` | `python -m pytest -q backend/app/tests/integration` | **PASS — 3 passed** |
| TC-GRAPH-001 | Golden NL2Cypher/GraphRAG, aggregation, ambiguity, schema boundary và read-only guard | `backend/app/tests/test_nl2cypher_golden_suite.py`, scripts test liên quan | Cần lệnh riêng và dataset/runtime phù hợp | Không nằm trong `testpaths` mặc định; BLOCKED do staging không có graph fixture |
| TC-ROBOT-001 | Đăng nhập admin, render views, health/OpenAPI, RBAC user và SOP staging workflow | `tests/robot/` | `robot --outputdir $out tests\robot` với `$out = Join-Path $env:TEMP 'graphmind-robot-results'` trên stack cô lập | **PASS — 23 passed, 0 failed** |
| TC-API-RO-001 | Smoke các API nghiệp vụ chỉ đọc | Backend staging; OpenAPI | 36 route read-only, kiểm tra lại Knowledge Explorer với tham số `query` | **PASS — 36 route; không còn lỗi server/transport** |
| TC-BUILD-001 | Build production frontend | `frontend/` | `npm --prefix frontend run build` | **PASS**; Vite cảnh báo bundle JS vượt 500 kB |
| TC-INT-M6-001 | Role alias, role × department sample, schema validation, bearer-token rejection | `backend/app/tests/integration/test_m6_auth_rbac.py` | `python -m pytest -v backend\app\tests\integration\test_m6_auth_rbac.py` | **PASS — 18 passed**; chỉ là integration trên test app cô lập, không thay thế E2E |
| TC-INT-ALL-001 | Toàn bộ backend integration tests, gồm 18 test M6 mới | `backend/app/tests/integration/` | `python -m pytest -v backend\app\tests\integration` | **PASS — 21 passed** |
| TC-ROBOT-M6-DRYRUN-001 | Kiểm tra cú pháp và keyword của 5 scenario M6 Robot | `tests/robot/api_m6_auth.robot` | `python -m robot --dryrun --console verbose --consolewidth 140 --outputdir $out tests\robot\api_m6_auth.robot` | **DRY RUN — 5/5 được parse; không gửi request, không phải kết quả chức năng** |
| TC-ROBOT-M2-001 | SOP draft create/edit/read/filter/delete; publish in-scope; search/read published and audit; BR-04 deny | `tests/robot/api_m2_sop.robot` | `robot --console verbose --consolewidth 140 --outputdir $out tests\robot\api_m2_sop.robot` trên stack cô lập | **PASS — 3 scenarios, 0 failed**; lần đầu phát hiện publish 500 do audit schema/transaction, đã sửa và retest |

Lệnh `python -m pytest -q` ở baseline trước đó có kết quả **111 passed, 1 skipped** nhưng làm thay đổi hai file JSON watcher; các thay đổi được giữ nguyên. Ở cycle staging, unit/integration được chạy riêng. Một lần log backend có `FileNotFoundError: /proc/119` với traceback không đầy đủ; chưa xác định request gây ra và chưa có test nào gắn được lỗi này. `pytest.ini` bỏ qua một số file backend khác; xem [Test Plan](./TEST_PLAN.md) trước khi chọn phạm vi chạy.

**Cập nhật kiểm thử M6 ngày 2026-11-11:** integration riêng M6 đạt 18/18 và toàn bộ integration đạt 21/21. Docker Desktop đã được khởi động, stack Robot cô lập được dựng và Robot M6 chạy thật: **5 scenario PASS, 0 FAIL**. Workbook đánh dấu **5/16 PASS, 10 BLOCKED (bao phủ một phần), 1 NOT RUN**. Staging stack vẫn đang chạy để tiếp tục kiểm thử; báo cáo Robot: `%TEMP%\graphmind-m6-results\log.html`. Chưa nghiệm thu toàn bộ Phần 1 do còn thiếu coverage và cần PO chốt mapping `Research Team`/ma trận quyền.

**Cập nhật kiểm thử M2 ngày 2026-11-11:** Sau khi triển khai backend JWT mới lên staging, Robot regression chạy lại **8/8 PASS** (M2 SOP 3/3, M6 auth 5/5); backend integration **29 passed**, gồm 8 API test Knowledge Editor với Neo4j fake. Property save đã được xác nhận trên Neo4j staging bằng JWT-protected write/read và cleanup; Standard JWT bị 403, anonymous bị 401. TC-KNOW-001 vẫn **PARTIAL** do chưa triển khai/kiểm chứng relationship edits và Copilot propagation. Duyệt/từ chối/sửa relationship còn **BLOCKED** vì queue đang dùng dữ liệu mẫu, chưa có relationship ID/candidate contract. SOP publish đã được sửa để dùng audit service; trước đó test thật tái hiện HTTP 500, sau sửa đã retest thành công. Log Robot regression: `%TEMP%\graphmind-m2-jwt-regression\log.html`.

## 5. Biểu mẫu ghi kết quả thực thi

Sao chép các trường này cho từng lần chạy; giữ nguyên ID testcase để có thể so sánh giữa các cycle.

| Test Case ID | Commit/Build | Ngày giờ | Tester | Environment/Dataset | Actual Result | Status | Defect ID | Evidence/Log |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  | NOT RUN |  |  |

## 6. Test report summary

| Trường | Giá trị cho lần chạy |
|---|---|
| Test cycle / mục tiêu | Isolated staging smoke — 09-11-2026 |
| Commit / build | HEAD `7897c37` + working tree changes |
| Thời gian / tester | 09-11-2026 |
| Môi trường / dataset | `docker-compose.robot.yml`; graph staging rỗng |
| Tổng số case trong scope | Chưa chốt tổng scope nghiệm thu; các suite/check khác nhau về đơn vị đếm |
| Executed (PASS + FAIL) | 1 scenario case có kết quả chi tiết (TC-COP-005); ngoài ra 109 unit + 3 integration + 23 Robot + 36 API routes và production build |
| PASS | 0 scenario cases có kết quả chi tiết; các suite/check nêu trên PASS |
| FAIL | 1 scenario case (TC-COP-005) |
| BLOCKED | GraphRAG accuracy |
| NOT RUN | Các luồng chức năng được nêu trong phạm vi chưa được xác nhận ở trên |
| Tỷ lệ thực thi | `Executed / tổng scope × 100%` |
| Tỷ lệ pass | `PASS / Executed × 100%` |
| Defect Critical / High / Medium / Low còn mở | Medium: 1 (GM-DEF-001); Critical/High/Low: chưa phát hiện trong scope đã chạy |
| Quyết định | `NOT ACCEPTED — chưa đủ phạm vi nghiệm thu; có defect Medium đang mở` |
| Giới hạn, cleanup và ghi chú | Test dùng staging cô lập; tài khoản seed test còn trong staging. Session greeting đã cleanup. Stack staging được dừng sau test, giữ nguyên volume. |

### Tổng hợp theo luồng

| Luồng / Module | Planned | Executed | Pass | Fail | Blocked | Pass rate | Defect mở / ghi chú |
|---|---:|---:|---:|---:|---:|---:|---|
| Auth, RBAC, Admin (M6) | 16 testcase M6 | 5 Robot scenarios PASS; integration 18 passed (bằng chứng riêng) | 5 testcase đầy đủ | 0 | 10 partial; 1 not run | — | Còn full role/dept matrix, direct API/SOP cases và PO confirmation |
| Knowledge Editor / SOP (M2) | 4 testcase trong `Part 2 - M2` | 3 SOP Robot PASS; 8 Knowledge Editor API integration PASS; property write/read staging PASS | 3 SOP + property E2E | 0 | 1 partial: relationship edits/Copilot propagation chưa xác nhận | — | Property API đã triển khai; relationship contract/IDs còn thiếu; xem `TC-KNOW-001` |
| Enterprise Search (M5) | Chưa chốt | API smoke | — | — | — | — | Staging không có dataset nghiệp vụ |
| Copilot / GraphRAG (M3) | Golden suite | 1 functional case | 0 | 1 | Golden suite | 0% | GM-DEF-001; golden accuracy blocked |
| Decision Support (M4) | Chưa chốt | API/UI smoke | — | — | — | — | Chưa đối chiếu KPI với ground truth |
| SOP / Operational reports | Chưa chốt | Robot workflow | Pass | 0 | — | — | Shift report lifecycle chưa chạy |

### Defect log

| Defect ID | Test Case ID | Summary | Severity | Steps / Expected vs Actual | Environment / Commit | Evidence | Owner | Status / Retest |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  | New |
