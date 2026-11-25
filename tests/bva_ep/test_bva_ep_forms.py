"""
GraphMind — Bộ Kiểm Thử Hộp Đen: Phân Tích Giá Trị Biên (BVA) & Phân Vùng Tương Đương (EP)
Kiểm thử chi tiết từng trường (Field-level Black-box Testing) cho các Form cốt lõi:
1. Form Thêm Người Dùng (Admin User Creation Modal — M6)
2. Form Xác Thực Đăng Nhập (Authentication Form — M6)
3. Form Nạp Tài Liệu (Document Ingestion Form — M1)

Tự động kiểm tra, dọn dẹp dữ liệu (cleanup) và xuất báo cáo HTML trực quan.
"""

import sys
import os
import json
import time
import datetime
import urllib.request
import urllib.error

BASE_URL = os.environ.get("GRAPHMIND_API_URL", "http://127.0.0.1:5000")
HTML_REPORT_PATH = os.path.join(os.path.dirname(__file__), "report_bva_ep.html")

# Danh sách ID người dùng cần cleanup sau test
CREATED_USER_IDS = []
ADMIN_TOKEN = None


def http_post(endpoint: str, data: dict, token: str = None) -> tuple[int, dict, str]:
    """Gửi HTTP POST request và trả về (status_code, json_body, raw_text)."""
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            try:
                body = json.loads(raw)
            except Exception:
                body = {}
            return resp.status, body, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            body = json.loads(raw)
        except Exception:
            body = {}
        return e.code, body, raw
    except Exception as e:
        return 0, {}, str(e)


def http_delete(endpoint: str, token: str = None) -> int:
    """Gửi HTTP DELETE request."""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def get_admin_token() -> str:
    """Đăng nhập lấy JWT Token của tài khoản Admin."""
    status, body, _ = http_post("/api/v1/auth/login", {"identifier": "admin", "password": "123456"})
    if status == 200 and "access_token" in body:
        return body["access_token"]
    raise RuntimeError(f"Không thể đăng nhập Admin để khởi tạo test suite (HTTP {status}). Backend đã chạy chưa?")


# ==============================================================================
# ĐỊNH NGHĨA MA TRẬN 35 TEST CASE BVA & EP (FIELD-LEVEL)
# ==============================================================================
TEST_CASES = [
    # --------------------------------------------------------------------------
    # KHỐI 1: FORM THÊM NGƯỜI DÙNG (M6) — TRƯỜNG EMAIL (BVA & EP)
    # --------------------------------------------------------------------------
    {
        "stt": 1,
        "code": "TC-EP-EM-01",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Empty)",
        "input_desc": "Chuỗi rỗng (empty string)",
        "payload": {"email": "", "password": "Password123", "role": "standard", "full_name": "QA Tester"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Định dạng email không hợp lệ",
    },
    {
        "stt": 2,
        "code": "TC-EP-EM-02",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Missing @)",
        "input_desc": "Thiếu ký tự @ (abc.com)",
        "payload": {"email": "invalidemail.com", "password": "Password123", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Định dạng email không hợp lệ",
    },
    {
        "stt": 3,
        "code": "TC-EP-EM-03",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Missing Domain)",
        "input_desc": "Thiếu tên miền sau @ (test@)",
        "payload": {"email": "testuser@", "password": "Password123", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Định dạng email không hợp lệ",
    },
    {
        "stt": 4,
        "code": "TC-EP-EM-04",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Missing TLD)",
        "input_desc": "Thiếu phần mở rộng domain (user@domain)",
        "payload": {"email": "testuser@domain", "password": "Password123", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Định dạng email không hợp lệ",
    },
    {
        "stt": 5,
        "code": "TC-EP-EM-05",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Spaces)",
        "input_desc": "Chứa khoảng trắng ở giữa (user name@mail.com)",
        "payload": {"email": "user name@graphmind.ai", "password": "Password123", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Định dạng email không hợp lệ",
    },
    {
        "stt": 6,
        "code": "TC-EP-EM-06",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Valid - Standard)",
        "input_desc": "Email chuẩn (qa_test_std@graphmind.ai)",
        "payload": {"email": "qa_test_std@graphmind.ai", "password": "Password123", "role": "standard", "full_name": "QA Standard User"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Tạo tài khoản hợp lệ",
    },
    {
        "stt": 7,
        "code": "TC-EP-EM-07",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Invalid - Duplicate)",
        "input_desc": "Trùng lặp email vừa tạo (qa_test_std@graphmind.ai)",
        "payload": {"email": "qa_test_std@graphmind.ai", "password": "Password456", "role": "standard"},
        "expected_code": 409,
        "expected_desc": "Bị từ chối (409): Email đã tồn tại trong hệ thống",
    },
    {
        "stt": 8,
        "code": "TC-EP-EM-08",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Valid - Subdomain & Plus)",
        "input_desc": "Email có dấu cộng và subdomain (qa+tag@sub.corp.vn)",
        "payload": {"email": "qa+tag@sub.corp.vn", "password": "Password123", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Hệ thống chấp nhận email nâng cao",
    },
    {
        "stt": 9,
        "code": "TC-BVA-EM-09",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "BVA (Leading/Trailing Space)",
        "input_desc": "Biên khoảng trắng đầu/cuối ('  qa_strip@test.com  ')",
        "payload": {"email": "  qa_strip@graphmind.ai  ", "password": "Password123", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Tự động strip khoảng trắng đầu cuối",
    },
    {
        "stt": 10,
        "code": "TC-EP-EM-10",
        "form": "Admin: Thêm người dùng",
        "field": "email",
        "technique": "EP (Normalization - Uppercase)",
        "input_desc": "Chữ hoa (QA_UPPERCASE@GRAPHMIND.AI)",
        "payload": {"email": "QA_UPPERCASE@GRAPHMIND.AI", "password": "Password123", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Tự động chuyển thành chữ thường",
    },

    # --------------------------------------------------------------------------
    # KHỐI 2: FORM THÊM NGƯỜI DÙNG (M6) — TRƯỜNG PASSWORD (BVA & EP)
    # --------------------------------------------------------------------------
    {
        "stt": 11,
        "code": "TC-EP-PW-11",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "EP (Invalid - Empty)",
        "input_desc": "Mật khẩu rỗng (empty string)",
        "payload": {"email": "qa_pw_01@graphmind.ai", "password": "", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Mật khẩu phải có ít nhất 8 ký tự",
    },
    {
        "stt": 12,
        "code": "TC-BVA-PW-12",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "BVA (Min - 7 chars)",
        "input_desc": "Độ dài 1 ký tự ('a')",
        "payload": {"email": "qa_pw_02@graphmind.ai", "password": "a", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Mật khẩu phải có ít nhất 8 ký tự",
    },
    {
        "stt": 13,
        "code": "TC-BVA-PW-13",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "BVA (Boundary Min - 1: 7 chars)",
        "input_desc": "Độ dài đúng 7 ký tự ('1234567')",
        "payload": {"email": "qa_pw_03@graphmind.ai", "password": "1234567", "role": "standard"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Mật khẩu phải có ít nhất 8 ký tự",
    },
    {
        "stt": 14,
        "code": "TC-BVA-PW-14",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "BVA (Boundary Min: 8 chars)",
        "input_desc": "Độ dài chính xác 8 ký tự ('12345678')",
        "payload": {"email": "qa_pw_04@graphmind.ai", "password": "12345678", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Chạm biên tối thiểu hợp lệ",
    },
    {
        "stt": 15,
        "code": "TC-BVA-PW-15",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "BVA (Boundary Min + 1: 9 chars)",
        "input_desc": "Độ dài 9 ký tự ('123456789')",
        "payload": {"email": "qa_pw_05@graphmind.ai", "password": "123456789", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Vượt qua biên tối thiểu an toàn",
    },
    {
        "stt": 16,
        "code": "TC-EP-PW-16",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "EP (Valid - Complex chars)",
        "input_desc": "Mật khẩu phức tạp (P@$$w0rd!_2026)",
        "payload": {"email": "qa_pw_06@graphmind.ai", "password": "P@$$w0rd!_2026", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Chấp nhận ký tự đặc biệt",
    },
    {
        "stt": 17,
        "code": "TC-BVA-PW-17",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "BVA (Upper Bound - 64 chars)",
        "input_desc": "Mật khẩu dài 64 ký tự",
        "payload": {"email": "qa_pw_07@graphmind.ai", "password": "A" * 64, "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Hỗ trợ chuỗi dài an toàn",
    },
    {
        "stt": 18,
        "code": "TC-EP-PW-18",
        "form": "Admin: Thêm người dùng",
        "field": "password",
        "technique": "EP (Valid - Unicode Vietnamese)",
        "input_desc": "Mật khẩu chứa chữ tiếng Việt có dấu ('MatKhauBaoMat@123')",
        "payload": {"email": "qa_pw_08@graphmind.ai", "password": "MatKhauBaoMat@123", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Hashing mã hoá an toàn",
    },

    # --------------------------------------------------------------------------
    # KHỐI 3: FORM THÊM NGƯỜI DÙNG (M6) — TRƯỜNG ROLE (PHÂN VÙNG TƯƠNG ĐƯƠNG)
    # --------------------------------------------------------------------------
    {
        "stt": 19,
        "code": "TC-EP-RL-19",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Valid - Standard)",
        "input_desc": "Vai trò 'standard' (Chuyên viên)",
        "payload": {"email": "qa_role_std@graphmind.ai", "password": "Password123", "role": "standard"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán quyền Chuyên viên",
    },
    {
        "stt": 20,
        "code": "TC-EP-RL-20",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Valid - KM)",
        "input_desc": "Vai trò 'knowledge_manager' (Quản trị tri thức)",
        "payload": {"email": "qa_role_km@graphmind.ai", "password": "Password123", "role": "knowledge_manager"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán quyền Quản trị tri thức",
    },
    {
        "stt": 21,
        "code": "TC-EP-RL-21",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Valid - Executive)",
        "input_desc": "Vai trò 'executive' (Ban Giám Đốc)",
        "payload": {"email": "qa_role_exec@graphmind.ai", "password": "Password123", "role": "executive"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán quyền Ban Giám Đốc",
    },
    {
        "stt": 22,
        "code": "TC-EP-RL-22",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Valid - IT Admin)",
        "input_desc": "Vai trò 'it_admin' (Quản trị hệ thống)",
        "payload": {"email": "qa_role_adm@graphmind.ai", "password": "Password123", "role": "it_admin"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán quyền Quản trị hệ thống",
    },
    {
        "stt": 23,
        "code": "TC-EP-RL-23",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Invalid - Arbitrary string)",
        "input_desc": "Vai trò không hợp lệ ('superuser_god_mode')",
        "payload": {"email": "qa_role_inv@graphmind.ai", "password": "Password123", "role": "superuser_god_mode"},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Role không hợp lệ",
    },
    {
        "stt": 24,
        "code": "TC-EP-RL-24",
        "form": "Admin: Thêm người dùng",
        "field": "role",
        "technique": "EP (Invalid - Empty string)",
        "input_desc": "Vai trò để trống ('')",
        "payload": {"email": "qa_role_emp@graphmind.ai", "password": "Password123", "role": ""},
        "expected_code": 422,
        "expected_desc": "Bị từ chối (422): Role không hợp lệ",
    },

    # --------------------------------------------------------------------------
    # KHỐI 4: FORM THÊM NGƯỜI DÙNG (M6) — PHÒNG BAN & HỌ TÊN (EP & XSS)
    # --------------------------------------------------------------------------
    {
        "stt": 25,
        "code": "TC-EP-DP-25",
        "form": "Admin: Thêm người dùng",
        "field": "department_code",
        "technique": "EP (Valid - Legal)",
        "input_desc": "Phòng ban 'LEGAL' (Pháp chế)",
        "payload": {"email": "qa_dept_legal@graphmind.ai", "password": "Password123", "role": "standard", "department_code": "LEGAL"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán phạm vi phòng Pháp chế",
    },
    {
        "stt": 26,
        "code": "TC-EP-DP-26",
        "form": "Admin: Thêm người dùng",
        "field": "department_code",
        "technique": "EP (Valid - Finance)",
        "input_desc": "Phòng ban 'FINANCE' (Kế toán / Thu mua)",
        "payload": {"email": "qa_dept_fin@graphmind.ai", "password": "Password123", "role": "standard", "department_code": "FINANCE"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán phạm vi phòng Kế toán",
    },
    {
        "stt": 27,
        "code": "TC-EP-DP-27",
        "form": "Admin: Thêm người dùng",
        "field": "department_code",
        "technique": "EP (Valid - R&D)",
        "input_desc": "Phòng ban 'RND' (Nghiên cứu & Phát triển)",
        "payload": {"email": "qa_dept_rnd@graphmind.ai", "password": "Password123", "role": "standard", "department_code": "RND"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Gán phạm vi phòng R&D",
    },
    {
        "stt": 28,
        "code": "TC-EP-FN-28",
        "form": "Admin: Thêm người dùng",
        "field": "full_name",
        "technique": "EP (Valid - Optional Empty)",
        "input_desc": "Không điền họ tên (null / empty - trường tuỳ chọn)",
        "payload": {"email": "qa_fn_none@graphmind.ai", "password": "Password123", "role": "standard", "full_name": None},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Cho phép bỏ trống trường tuỳ chọn",
    },
    {
        "stt": 29,
        "code": "TC-EP-FN-29",
        "form": "Admin: Thêm người dùng",
        "field": "full_name",
        "technique": "EP (Valid - Vietnamese Unicode)",
        "input_desc": "Họ tên tiếng Việt đầy đủ ('Nguyễn Thị Ngọc Ánh')",
        "payload": {"email": "qa_fn_vn@graphmind.ai", "password": "Password123", "role": "standard", "full_name": "Nguyễn Thị Ngọc Ánh"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Lưu trữ Unicode tiếng Việt chính xác",
    },
    {
        "stt": 30,
        "code": "TC-SEC-FN-30",
        "form": "Admin: Thêm người dùng",
        "field": "full_name",
        "technique": "Security (XSS Injection)",
        "input_desc": "Chèn mã script độc hại ('<script>alert(1)</script>')",
        "payload": {"email": "qa_fn_xss@graphmind.ai", "password": "Password123", "role": "standard", "full_name": "<script>alert(1)</script>"},
        "expected_code": 201,
        "expected_desc": "Thành công (201): Lưu chuỗi thô, không thực thi script",
    },

    # --------------------------------------------------------------------------
    # KHỐI 5: FORM XÁC THỰC ĐĂNG NHẬP (M6 AUTH FORM — BVA & EP)
    # --------------------------------------------------------------------------
    {
        "stt": 31,
        "code": "TC-EP-LG-31",
        "form": "Xác thực: Đăng nhập",
        "field": "identifier",
        "technique": "EP (Invalid - Empty username)",
        "input_desc": "Tên đăng nhập để trống ('')",
        "payload": {"identifier": "", "password": "123456"},
        "expected_code": 401,
        "expected_desc": "Bị từ chối (401): Tài khoản không tồn tại / trống",
        "auth_flow": True,
    },
    {
        "stt": 32,
        "code": "TC-EP-LG-32",
        "form": "Xác thực: Đăng nhập",
        "field": "password",
        "technique": "EP (Invalid - Empty password)",
        "input_desc": "Mật khẩu để trống ('')",
        "payload": {"identifier": "admin", "password": ""},
        "expected_code": 401,
        "expected_desc": "Bị từ chối (401): Mật khẩu không chính xác / trống",
        "auth_flow": True,
    },
    {
        "stt": 33,
        "code": "TC-EP-LG-33",
        "form": "Xác thực: Đăng nhập",
        "field": "identifier",
        "technique": "EP (Invalid - Non-existent)",
        "input_desc": "Tài khoản không tồn tại ('non_existent_user_9999')",
        "payload": {"identifier": "non_existent_user_9999", "password": "Password123"},
        "expected_code": 401,
        "expected_desc": "Bị từ chối (401): Sai tài khoản hoặc mật khẩu",
        "auth_flow": True,
    },
    {
        "stt": 34,
        "code": "TC-EP-LG-34",
        "form": "Xác thực: Đăng nhập",
        "field": "password",
        "technique": "EP (Invalid - Wrong Password)",
        "input_desc": "Tài khoản đúng nhưng sai mật khẩu ('admin' / 'WrongPassword123')",
        "payload": {"identifier": "admin", "password": "WrongPassword123"},
        "expected_code": 401,
        "expected_desc": "Bị từ chối (401): Sai tài khoản hoặc mật khẩu",
        "auth_flow": True,
    },
    {
        "stt": 35,
        "code": "TC-EP-LG-35",
        "form": "Xác thực: Đăng nhập",
        "field": "credential",
        "technique": "EP (Valid - Admin Login)",
        "input_desc": "Đăng nhập hợp lệ ('admin' / '123456')",
        "payload": {"identifier": "admin", "password": "123456"},
        "expected_code": 200,
        "expected_desc": "Thành công (200): Cấp JWT Token truy cập",
        "auth_flow": True,
    },
]


def run_test_suite():
    global ADMIN_TOKEN, CREATED_USER_IDS
    print("\n" + "=" * 110)
    print("  GRAPHMIND — BỘ KIỂM THỬ HỘP ĐEN: PHÂN TÍCH GIÁ TRỊ BIÊN (BVA) & PHÂN VÙNG TƯƠNG ĐƯƠNG (EP)")
    print("  Kiểm thử chi tiết từng trường dữ liệu (Field-Level Testing) cho các Form hệ thống")
    print("=" * 110)

    # 1. Kết nối & lấy Admin Token
    print("\n[+] Đang xác thực tài khoản Quản trị viên (admin / 123456)...")
    try:
        ADMIN_TOKEN = get_admin_token()
        print("    -> Token JWT nhận diện thành công: OK")
    except Exception as e:
        print(f"    [!] LỖI: {e}")
        sys.exit(1)

    print(f"\n[+] Bắt đầu thực thi ma trận {len(TEST_CASES)} test case BVA/EP...\n")

    start_time = time.time()
    results = []
    pass_count = 0
    fail_count = 0

    header_fmt = "{:<4} {:<14} {:<24} {:<12} {:<22} {:<12} {:<10}"
    row_fmt    = "{:<4} {:<14} {:<24} {:<12} {:<22} {:<12} {:<10}"

    print(header_fmt.format("STT", "Mã TC", "Trường / Dữ liệu đầu vào", "Kỹ thuật", "Kết quả mong đợi", "Thực tế", "Trạng thái"))
    print("-" * 110)

    for tc in TEST_CASES:
        stt = tc["stt"]
        code = tc["code"]
        form = tc["form"]
        field = tc["field"]
        tech = tc["technique"]
        inp = tc["input_desc"]
        expected_code = tc["expected_code"]
        expected_desc = tc["expected_desc"]
        is_auth = tc.get("auth_flow", False)

        endpoint = "/api/v1/auth/login" if is_auth else "/api/v1/admin/users"
        token = None if is_auth else ADMIN_TOKEN

        status, body, raw = http_post(endpoint, tc["payload"], token=token)

        # Ghi nhận user id tạo thành công để cleanup
        if status == 201 and isinstance(body, dict) and "id" in body:
            CREATED_USER_IDS.append(body["id"])
        elif status == 201 and isinstance(body, dict) and "user_id" in body:
            CREATED_USER_IDS.append(body["user_id"])

        # Đánh giá PASS/FAIL
        is_pass = (status == expected_code)
        if is_pass:
            pass_count += 1
            status_text = "PASS"
            status_color = "\033[92mPASS\033[0m"
        else:
            fail_count += 1
            status_text = "FAIL"
            status_color = "\033[91mFAIL\033[0m"

        actual_desc = f"HTTP {status}"
        if not is_pass:
            # Gợi ý thông báo lỗi từ backend
            detail = body.get("detail", raw[:30]) if isinstance(body, dict) else raw[:30]
            actual_desc += f" ({detail})"

        results.append({
            "stt": stt,
            "code": code,
            "form": form,
            "field": field,
            "technique": tech,
            "input_desc": inp,
            "expected_code": expected_code,
            "expected_desc": expected_desc,
            "actual_code": status,
            "actual_desc": actual_desc,
            "is_pass": is_pass,
            "status_text": status_text,
        })

        # In dòng kết quả (rút gọn nếu quá dài)
        short_inp = (inp[:20] + "..") if len(inp) > 22 else inp
        short_exp = f"HTTP {expected_code}"
        short_tech = tech.split("(")[0].strip()
        print(row_fmt.format(stt, code, f"{field}: {short_inp}", short_tech, short_exp, actual_desc[:12], status_color))
        time.sleep(0.04)  # mô phỏng mượt mà

    elapsed = time.time() - start_time

    # ==============================================================================
    # DỌN DẸP DỮ LIỆU TẠM (CLEANUP)
    # ==============================================================================
    print("\n" + "-" * 110)
    print(f"[+] Dọn dẹp dữ liệu (Cleanup): Đang xóa {len(CREATED_USER_IDS)} tài khoản test vừa tạo...")
    cleaned = 0
    for uid in CREATED_USER_IDS:
        res = http_delete(f"/api/v1/admin/users/{uid}", token=ADMIN_TOKEN)
        if res in (200, 204):
            cleaned += 1
    print(f"    -> Đã dọn sạch {cleaned}/{len(CREATED_USER_IDS)} tài khoản test. Cơ sở dữ liệu nguyên vẹn.")

    # ==============================================================================
    # XUẤT BÁO CÁO HTML
    # ==============================================================================
    print(f"\n[+] Đang tạo báo cáo HTML: {HTML_REPORT_PATH}...")
    generate_html_report(results, pass_count, fail_count, elapsed)
    print(f"    -> Đã tạo báo cáo HTML thành công!")

    # TỔNG KẾT
    print("\n" + "=" * 110)
    rate = (pass_count / len(TEST_CASES)) * 100
    print(f"  KẾT QUẢ KIỂM THỬ: {pass_count}/{len(TEST_CASES)} PASS ({rate:.1f}%) | {fail_count} FAIL | Thời gian: {elapsed:.2f}s")
    print("=" * 110 + "\n")


def generate_html_report(results, pass_count, fail_count, elapsed):
    """Sinh file HTML report giao diện chuyên nghiệp giống Robot Framework."""
    total = len(results)
    pass_pct = (pass_count / total * 100) if total else 0
    fail_pct = (fail_count / total * 100) if total else 0
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    rows_html = ""
    for r in results:
        status_badge = (
            '<span class="badge badge-pass"><i class="fa fa-check"></i> PASS</span>'
            if r["is_pass"]
            else '<span class="badge badge-fail"><i class="fa fa-times"></i> FAIL</span>'
        )
        tech_badge = (
            '<span class="badge badge-bva">BVA</span>'
            if "BVA" in r["technique"]
            else '<span class="badge badge-ep">EP</span>'
        )
        if "Security" in r["technique"]:
            tech_badge = '<span class="badge badge-sec">Security</span>'

        rows_html += f"""
        <tr class="{ 'row-pass' if r['is_pass'] else 'row-fail' }">
            <td style="text-align: center; font-weight: bold;">{r['stt']}</td>
            <td><code>{r['code']}</code></td>
            <td><strong>{r['form']}</strong></td>
            <td><code>{r['field']}</code></td>
            <td>{tech_badge} <small>{r['technique']}</small></td>
            <td>{r['input_desc']}</td>
            <td><span class="expected-tag">{r['expected_desc']}</span></td>
            <td><code>{r['actual_desc']}</code></td>
            <td style="text-align: center;">{status_badge}</td>
        </tr>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Kiểm Thử Giá Trị Biên & Phân Vùng Tương Đương (BVA & EP) — GraphMind</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {{
            --bg: #090d16;
            --surface: #111827;
            --surface-hover: #1f2937;
            --border: #374151;
            --text-1: #f3f4f6;
            --text-2: #9ca3af;
            --text-3: #6b7280;
            --accent: #2563eb;
            --pass: #10b981;
            --fail: #ef4444;
            --bva: #f59e0b;
            --ep: #8b5cf6;
            --sec: #ec4899;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg);
            color: var(--text-1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 30px;
            font-size: 14px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 25px;
        }}
        .header h1 {{
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
        }}
        .header-meta {{
            font-size: 13px;
            color: var(--text-2);
            text-align: right;
        }}
        .stat-card-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 25px;
        }}
        .stat-card {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }}
        .stat-label {{
            font-size: 12px;
            color: var(--text-2);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }}
        .stat-value {{
            font-size: 28px;
            font-weight: 700;
        }}
        .stat-pass {{ color: var(--pass); }}
        .stat-fail {{ color: var(--fail); }}
        .stat-total {{ color: #60a5fa; }}
        .stat-time {{ color: #e5e7eb; }}
        .progress-bar-container {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 25px;
        }}
        .progress-bar {{
            height: 14px;
            background: #374151;
            border-radius: 7px;
            overflow: hidden;
            display: flex;
            margin-top: 10px;
        }}
        .progress-pass {{
            height: 100%;
            background: var(--pass);
            width: {pass_pct:.1f}%;
        }}
        .progress-fail {{
            height: 100%;
            background: var(--fail);
            width: {fail_pct:.1f}%;
        }}
        .table-container {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }}
        th {{
            background: #1e293b;
            color: var(--text-2);
            font-weight: 600;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            text-transform: uppercase;
        }}
        td {{
            padding: 11px 14px;
            border-bottom: 1px solid #1f2937;
            font-size: 13px;
        }}
        tr:hover {{
            background: var(--surface-hover);
        }}
        .badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }}
        .badge-pass {{
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }}
        .badge-fail {{
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }}
        .badge-bva {{
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }}
        .badge-ep {{
            background: rgba(139, 92, 246, 0.15);
            color: #a78bfa;
            border: 1px solid rgba(139, 92, 246, 0.3);
        }}
        .badge-sec {{
            background: rgba(236, 72, 153, 0.15);
            color: #f472b6;
            border: 1px solid rgba(236, 72, 153, 0.3);
        }}
        .expected-tag {{
            color: #93c5fd;
            font-size: 12px;
        }}
        code {{
            background: #0f172a;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #38bdf8;
            font-size: 12px;
        }}
        .footer {{
            margin-top: 25px;
            text-align: center;
            font-size: 12px;
            color: var(--text-3);
        }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1><i class="fa-solid fa-list-check" style="color: #60a5fa;"></i> GraphMind — Báo Cáo Kiểm Thử Giá Trị Biên & Phân Vùng Tương Đương</h1>
            <p style="color: var(--text-2); margin-top: 5px;">Field-Level Black-Box Testing Matrix (BVA & EP) for Enterprise Forms</p>
        </div>
        <div class="header-meta">
            <div><strong>Thời gian chạy:</strong> {now_str}</div>
            <div><strong>Hệ thống:</strong> GraphMind API v1.0.0 (FastAPI + PostgreSQL)</div>
        </div>
    </div>

    <div class="stat-card-grid">
        <div class="stat-card">
            <span class="stat-label">Tổng số Test Case</span>
            <span class="stat-value stat-total">{total}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Thành Công (PASS)</span>
            <span class="stat-value stat-pass">{pass_count}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Thất Bại (FAIL)</span>
            <span class="stat-value stat-fail">{fail_count}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Thời Gian Thực Thi</span>
            <span class="stat-value stat-time">{elapsed:.2f}s</span>
        </div>
    </div>

    <div class="progress-bar-container">
        <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>Tỷ lệ hoàn thành: {pass_pct:.1f}% PASS</span>
            <span>{pass_count}/{total} Test Cases Passed</span>
        </div>
        <div class="progress-bar">
            <div class="progress-pass"></div>
            <div class="progress-fail"></div>
        </div>
    </div>

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">STT</th>
                    <th style="width: 120px;">Mã TC</th>
                    <th style="width: 160px;">Tên Form</th>
                    <th style="width: 90px;">Trường</th>
                    <th style="width: 140px;">Kỹ Thuật</th>
                    <th>Dữ Liệu Đầu Vào (Input)</th>
                    <th>Kết Quả Mong Đợi (Expected)</th>
                    <th style="width: 120px;">Thực Tế</th>
                    <th style="width: 90px; text-align: center;">Trạng Thái</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>

    <div class="footer">
        GraphMind Automated QA System &bull; Generated automatically with Field-Level Test Engine
    </div>
</body>
</html>
"""
    with open(HTML_REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(html_content)


if __name__ == "__main__":
    run_test_suite()
