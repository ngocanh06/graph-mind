# GraphMind — Ma Trận Kiểm Thử Hộp Đen: Phân Tích Giá Trị Biên (BVA) & Phân Vùng Tương Đương (EP)

| Thuộc tính | Giá trị |
| :--- | :--- |
| **Mã tài liệu** | `GM-QA-BVA-EP-FORMS` |
| **Phiên bản** | `1.0.0` |
| **Kỹ thuật áp dụng** | Equivalence Partitioning (EP) & Boundary Value Analysis (BVA) |
| **Cấp độ kiểm thử** | Field-level Black-Box Testing / Form Validation Integrity |
| **Hệ thống mục tiêu** | GraphMind API v1.0.0 (FastAPI + PostgreSQL + Pydantic v2) |
| **Tệp thực thi tự động** | [`tests/bva_ep/test_bva_ep_forms.py`](file:///d:/Dokumen/NgocAnh/FULLSTACK/graph-mind/tests/bva_ep/test_bva_ep_forms.py) |
| **Báo cáo HTML trực quan** | [`tests/bva_ep/report_bva_ep.html`](file:///d:/Dokumen/NgocAnh/FULLSTACK/graph-mind/tests/bva_ep/report_bva_ep.html) |
| **Kết quả thực tế** | **35 / 35 PASS (100.0%)** |

---

## 1. Thiết Kế Các Lớp Phân Vùng Tương Đương (Equivalence Classes) & Điểm Biên (Boundary Values)

### A. Form Thêm Người Dùng Quản Trị (M6 — Admin User Creation Form)

#### 1. Trường `email`
* **Lớp hợp lệ (Valid Classes):**
  - `EC-EM-V1`: Email chuẩn dạng `local@domain.com` (chuỗi thường).
  - `EC-EM-V2`: Email chữ hoa (hệ thống tự chuẩn hóa `lower()`).
  - `EC-EM-V3`: Email có gắn tag cộng và subdomain dạng `qa+tag@sub.domain.vn`.
* **Lớp không hợp lệ (Invalid Classes):**
  - `EC-EM-I1`: Chuỗi rỗng `""`.
  - `EC-EM-I2`: Thiếu ký tự `@` (`invalidemail.com`).
  - `EC-EM-I3`: Thiếu tên miền sau `@` (`testuser@`).
  - `EC-EM-I4`: Thiếu phần mở rộng TLD (`testuser@domain`).
  - `EC-EM-I5`: Chứa khoảng trắng ở giữa (`user name@domain.com`).
  - `EC-EM-I6`: Trùng lặp với email đã tồn tại trong cơ sở dữ liệu (`Duplicate Conflict`).
* **Giá trị biên (Boundary Points):**
  - Khoảng trắng đầu và cuối chuỗi (`"  test@domain.com  "` ➜ tự động `strip()` thành công).

#### 2. Trường `password`
* **Quy chuẩn hệ thống:** Mật khẩu tối thiểu **8 ký tự**.
* **Lớp không hợp lệ:** Chuỗi rỗng, độ dài $\le 7$ ký tự.
* **Lớp hợp lệ:** Độ dài $\ge 8$ ký tự, chuỗi phức tạp, Unicode tiếng Việt.
* **Giá trị biên (Boundary Points):**
  - Điểm biên dưới $Min - 1 = 7$ ký tự (`"1234567"`) ➜ **Bị từ chối (HTTP 422)**.
  - Điểm biên dưới $Min = 8$ ký tự (`"12345678"`) ➜ **Hợp lệ (HTTP 201)**.
  - Điểm biên kế $Min + 1 = 9$ ký tự (`"123456789"`) ➜ **Hợp lệ (HTTP 201)**.
  - Điểm biên trên $Max = 64$ ký tự ➜ **Hợp lệ (HTTP 201)**.

#### 3. Trường `role` (Vai trò)
* **Lớp hợp lệ:** `standard` (Chuyên viên), `knowledge_manager` (Quản trị tri thức), `executive` (Ban Giám Đốc), `it_admin` (Quản trị hệ thống).
* **Lớp không hợp lệ:** Chuỗi tùy ý (`superuser_god_mode`), chuỗi rỗng (`""`).

#### 4. Trường `department_code` (Phòng ban)
* **Lớp hợp lệ:** 5 phòng ban doanh nghiệp (`SALES`, `LEGAL`, `FINANCE`, `IT`, `RND`).

#### 5. Trường `full_name` (Họ tên)
* **Lớp hợp lệ:** Chuỗi rỗng / Null (trường tùy chọn), chuỗi Unicode tiếng Việt có dấu.
* **Kiểm thử an ninh (Security Injection):** Chuỗi chứa thẻ HTML/Script (`<script>alert(1)</script>`) ➜ lưu trữ thô, không thực thi script.

---

### B. Form Xác Thực Đăng Nhập (M6 — Authentication Form)

* **Lớp không hợp lệ:**
  - Tên đăng nhập rỗng ➜ **Bị từ chối (HTTP 401)**.
  - Mật khẩu rỗng ➜ **Bị từ chối (HTTP 401)**.
  - Tài khoản không tồn tại ➜ **Bị từ chối (HTTP 401)**.
  - Đúng tài khoản nhưng sai mật khẩu ➜ **Bị từ chối (HTTP 401)**.
* **Lớp hợp lệ:** Đúng tài khoản và đúng mật khẩu (`admin` / `123456`) ➜ **Cấp JWT Access Token (HTTP 200)**.

---

## 2. Bảng Ma Trận Chi Tiết 35 Test Case Thực Thi

| STT | Mã Test Case | Tên Form | Trường | Kỹ thuật | Dữ liệu đầu vào (Input) | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `TC-EP-EM-01` | Admin: Thêm User | `email` | EP (Invalid - Empty) | `""` (chuỗi rỗng) | HTTP 422: Lỗi định dạng email | HTTP 422 | **PASS** |
| 2 | `TC-EP-EM-02` | Admin: Thêm User | `email` | EP (Invalid - No @) | `"invalidemail.com"` | HTTP 422: Lỗi định dạng email | HTTP 422 | **PASS** |
| 3 | `TC-EP-EM-03` | Admin: Thêm User | `email` | EP (Invalid - No Domain) | `"testuser@"` | HTTP 422: Lỗi định dạng email | HTTP 422 | **PASS** |
| 4 | `TC-EP-EM-04` | Admin: Thêm User | `email` | EP (Invalid - No TLD) | `"testuser@domain"` | HTTP 422: Lỗi định dạng email | HTTP 422 | **PASS** |
| 5 | `TC-EP-EM-05` | Admin: Thêm User | `email` | EP (Invalid - Spaces) | `"user name@domain.com"` | HTTP 422: Lỗi định dạng email | HTTP 422 | **PASS** |
| 6 | `TC-EP-EM-06` | Admin: Thêm User | `email` | EP (Valid - Standard) | `"qa_test_std@graphmind.ai"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 7 | `TC-EP-EM-07` | Admin: Thêm User | `email` | EP (Invalid - Duplicate) | Email trùng lặp vừa tạo | HTTP 409: Đã tồn tại | HTTP 409 | **PASS** |
| 8 | `TC-EP-EM-08` | Admin: Thêm User | `email` | EP (Valid - Subdomain/Plus) | `"qa+tag@sub.corp.vn"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 9 | `TC-BVA-EM-09` | Admin: Thêm User | `email` | BVA (Leading/Trailing Space) | `"  qa_strip@test.com  "` | HTTP 201: Tự động strip khoảng trắng | HTTP 201 | **PASS** |
| 10 | `TC-EP-EM-10` | Admin: Thêm User | `email` | EP (Valid - Uppercase) | `"QA_UPPER@GRAPHMIND.AI"` | HTTP 201: Chuẩn hóa chữ thường | HTTP 201 | **PASS** |
| 11 | `TC-EP-PW-11` | Admin: Thêm User | `password` | EP (Invalid - Empty) | `""` (chuỗi rỗng) | HTTP 422: Thiếu mật khẩu | HTTP 422 | **PASS** |
| 12 | `TC-BVA-PW-12` | Admin: Thêm User | `password` | BVA (Extreme Low: 1 char) | `"a"` (1 ký tự) | HTTP 422: Phải $\ge 8$ ký tự | HTTP 422 | **PASS** |
| 13 | `TC-BVA-PW-13` | Admin: Thêm User | `password` | BVA (Min - 1: 7 chars) | `"1234567"` (7 ký tự) | HTTP 422: Phải $\ge 8$ ký tự | HTTP 422 | **PASS** |
| 14 | `TC-BVA-PW-14` | Admin: Thêm User | `password` | BVA (Min: 8 chars) | `"12345678"` (8 ký tự) | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 15 | `TC-BVA-PW-15` | Admin: Thêm User | `password` | BVA (Min + 1: 9 chars) | `"123456789"` (9 ký tự) | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 16 | `TC-EP-PW-16` | Admin: Thêm User | `password` | EP (Valid - Complex chars) | `"P@$$w0rd!_2026"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 17 | `TC-BVA-PW-17` | Admin: Thêm User | `password` | BVA (Upper Bound: 64 chars) | Chuỗi 64 ký tự `"A"*64` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 18 | `TC-EP-PW-18` | Admin: Thêm User | `password` | EP (Valid - Unicode) | `"MatKhauBaoMat@123"` | HTTP 201: Hashing an toàn | HTTP 201 | **PASS** |
| 19 | `TC-EP-RL-19` | Admin: Thêm User | `role` | EP (Valid - Standard) | `"standard"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 20 | `TC-EP-RL-20` | Admin: Thêm User | `role` | EP (Valid - KM) | `"knowledge_manager"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 21 | `TC-EP-RL-21` | Admin: Thêm User | `role` | EP (Valid - Executive) | `"executive"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 22 | `TC-EP-RL-22` | Admin: Thêm User | `role` | EP (Valid - IT Admin) | `"it_admin"` | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 23 | `TC-EP-RL-23` | Admin: Thêm User | `role` | EP (Invalid - String) | `"superuser_god_mode"` | HTTP 422: Role không hợp lệ | HTTP 422 | **PASS** |
| 24 | `TC-EP-RL-24` | Admin: Thêm User | `role` | EP (Invalid - Empty) | `""` (chuỗi rỗng) | HTTP 422: Role không hợp lệ | HTTP 422 | **PASS** |
| 25 | `TC-EP-DP-25` | Admin: Thêm User | `department` | EP (Valid - Legal) | `"LEGAL"` (Pháp chế) | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 26 | `TC-EP-DP-26` | Admin: Thêm User | `department` | EP (Valid - Finance) | `"FINANCE"` (Kế toán) | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 27 | `TC-EP-DP-27` | Admin: Thêm User | `department` | EP (Valid - R&D) | `"RND"` (Nghiên cứu) | HTTP 201: Tạo thành công | HTTP 201 | **PASS** |
| 28 | `TC-EP-FN-28` | Admin: Thêm User | `full_name` | EP (Valid - Null) | `null` (bỏ trống họ tên) | HTTP 201: Chấp nhận tuỳ chọn | HTTP 201 | **PASS** |
| 29 | `TC-EP-FN-29` | Admin: Thêm User | `full_name` | EP (Valid - VN Unicode) | `"Nguyễn Thị Ngọc Ánh"` | HTTP 201: Lưu đúng Unicode | HTTP 201 | **PASS** |
| 30 | `TC-SEC-FN-30` | Admin: Thêm User | `full_name` | Security (XSS) | `"<script>alert(1)</script>"` | HTTP 201: Lưu an toàn, ko execute | HTTP 201 | **PASS** |
| 31 | `TC-EP-LG-31` | Auth: Đăng nhập | `identifier` | EP (Invalid - Empty) | `""` (tài khoản rỗng) | HTTP 401: Từ chối đăng nhập | HTTP 401 | **PASS** |
| 32 | `TC-EP-LG-32` | Auth: Đăng nhập | `password` | EP (Invalid - Empty) | `""` (mật khẩu rỗng) | HTTP 401: Từ chối đăng nhập | HTTP 401 | **PASS** |
| 33 | `TC-EP-LG-33` | Auth: Đăng nhập | `identifier` | EP (Invalid - Non-existent) | `"non_existent_user_9999"` | HTTP 401: Từ chối đăng nhập | HTTP 401 | **PASS** |
| 34 | `TC-EP-LG-34` | Auth: Đăng nhập | `password` | EP (Invalid - Wrong Pwd) | `"admin"` / `"WrongPwd123"` | HTTP 401: Từ chối đăng nhập | HTTP 401 | **PASS** |
| 35 | `TC-EP-LG-35` | Auth: Đăng nhập | `credential` | EP (Valid - Admin) | `"admin"` / `"123456"` | HTTP 200: Cấp JWT Access Token | HTTP 200 | **PASS** |

---

## 3. Cách Thực Thi & Xem Báo Cáo

### Cách 1: Chạy trực tiếp từ file Batch
Nhấp đúp chuột vào file:
👉 [`tests/bva_ep/run_bva_ep.bat`](file:///d:/Dokumen/NgocAnh/FULLSTACK/graph-mind/tests/bva_ep/run_bva_ep.bat)  
*(Bộ test sẽ chạy tự động và tự bật trang báo cáo HTML trên Google Chrome hoặc Edge).*

### Cách 2: Chạy qua bộ chọn tổng hợp ở thư mục gốc
Tại thư mục gốc dự án, mở PowerShell và gõ:
```powershell
.\run_tests.bat
# Chọn phím [2] để chạy bộ BVA & EP
```

### Cách 3: Mở xem trực tiếp trang báo cáo HTML
👉 [tests/bva_ep/report_bva_ep.html](file:///d:/Dokumen/NgocAnh/FULLSTACK/graph-mind/tests/bva_ep/report_bva_ep.html)
```powershell
start tests\bva_ep\report_bva_ep.html
```

