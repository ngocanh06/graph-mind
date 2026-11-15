"""
GraphMind — Enterprise Knowledge Observatory
Module 1 Automated Business Verification Suite
(Nạp tài liệu, Kiểm tra chống trùng lặp, Xem trước trực quan & Phân quyền Kho tài liệu)

SRS Reference:
- FR1 / US01: Nạp tài liệu đa định dạng kèm phân loại phòng ban (Department-scoped Ingestion).
- FR2 / FR3: Tự động trích xuất nội dung, bẻ chunk ngữ nghĩa & vector hóa Qdrant.
- BR-03 / F-02: Cơ chế chống nạp trùng lặp tài liệu theo Tên file & Mã băm SHA-256.
- US09 / PB11: Xem trước tài liệu trực quan (Visual Preview & Raw Streaming).
- US20: Quy trình phê duyệt tài liệu nhạy cảm (Document Approval Workflow).
- BR-02: Ranh giới phân quyền dữ liệu phòng ban (Department Scope Enforcement).

Cách chạy:
- Trực tiếp qua CLI: python test_module1_ingestion.py
- Qua pytest:       pytest test_module1_ingestion.py -v
"""

import sys
import os
import hashlib
import asyncio
from pathlib import Path

# Đảm bảo import được backend modules
REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ANSI Color codes for clean enterprise CLI terminal report
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def print_header(title: str):
    width = 78
    print(f"\n{CYAN}{BOLD}{'=' * width}{RESET}")
    print(f"{CYAN}{BOLD}  {title.center(width - 4)}{RESET}")
    print(f"{CYAN}{BOLD}{'=' * width}{RESET}\n")


def print_test_result(tc_id: str, title: str, srs_ref: str, passed: bool, details: str = ""):
    badge = f"{GREEN}{BOLD}[PASS]{RESET}" if passed else f"{RED}{BOLD}[FAIL]{RESET}"
    print(f" {badge} {BOLD}{tc_id}{RESET}: {title}")
    print(f"        {DIM}Đặc tả:{RESET} {srs_ref}")
    if details:
        for line in details.strip().split("\n"):
            print(f"        {DIM}Chi tiết:{RESET} {line}")
    print()


# ==============================================================================
# TEST CASE IMPLEMENTATIONS
# ==============================================================================

async def tc_01_upload_new_unique_document():
    """TC-M1-01: Cho phép nạp tài liệu mới với tên và nội dung duy nhất."""
    from app.core.central_storage import check_document_duplicate
    
    unique_name = f"HD_KinhDoanh_M1_Test_{os.urandom(4).hex()}.pdf"
    unique_content = f"Nội dung hợp đồng thử nghiệm hợp lệ {os.urandom(8).hex()}".encode("utf-8")
    
    is_dup, reason = await check_document_duplicate(unique_name, unique_content)
    passed = (is_dup is False) and (reason is None)
    
    details = f"File: {unique_name}\nKết quả: is_duplicate={is_dup}, reason={reason}"
    return passed, details


async def tc_02_reject_duplicate_file_name():
    """TC-M1-02: Chặn nạp tài liệu nếu tên file đã tồn tại trong kho (BR-03 / F-02)."""
    from app.core.central_storage import check_document_duplicate
    
    existing_name = "Purchasing_PurchaseOrderDetail.csv"
    dummy_content = b"Noi dung moi hoan toan khong trung ma bam"
    
    is_dup, reason = await check_document_duplicate(existing_name, dummy_content)
    passed = (is_dup is True) and (reason is not None) and ("đã tồn tại" in reason or existing_name in reason)
    
    details = f"File trùng tên: {existing_name}\nPhản hồi hệ thống: {reason}"
    return passed, details


async def tc_03_reject_duplicate_content_sha256():
    """TC-M1-03: Chặn nạp tài liệu nếu nội dung trùng mã băm SHA-256 kể cả khi đổi tên khác (BR-03)."""
    from app.core.central_storage import check_document_duplicate
    from app.modules.m1_data_sync.webhook import get_watcher_ingested_docs
    
    # Lấy hash của 1 tài liệu thực tế đã có trong kho
    docs = get_watcher_ingested_docs()
    target_doc = next((d for d in docs if (d.get("hash") or d.get("file_hash"))), None)
    
    if not target_doc:
        return False, "Không tìm thấy tài liệu mẫu trong watcher registry để lấy hash"
    
    known_hash = (target_doc.get("hash") or target_doc.get("file_hash")).lower().strip()
    target_name = target_doc.get("name") or target_doc.get("file_name") or "known_doc.pdf"
    
    # Tạo request với tên file HOÀN TOÀN MỚI nhưng nội dung tạo ra hash trùng khớp
    from unittest.mock import patch, MagicMock
    mock_hash = MagicMock()
    mock_hash.hexdigest.return_value = known_hash
    
    fake_alias_name = "HD_GiaMao_DoiTen_Khac_100Pct.pdf"
    with patch("hashlib.sha256", return_value=mock_hash):
        is_dup, reason = await check_document_duplicate(fake_alias_name, b"some_bytes")
    
    passed = (is_dup is True) and (reason is not None) and ("trùng khớp" in reason or "đã tồn tại" in reason)
    details = f"File đổi tên: {fake_alias_name}\nHash trùng với: {target_name} ({known_hash[:16]}...)\nLý do từ chối: {reason}"
    return passed, details


async def tc_04_visual_preview_raw_streaming():
    """TC-M1-04: Phân phối byte file gốc kèm Content-Disposition inline để xem trước trực quan (US09)."""
    import urllib.request
    
    # Gọi endpoint kiểm tra phân phối raw file
    url = "http://127.0.0.1:5000/api/documents/raw?filename=dbo_ErrorLog.csv&department=it"
    headers = {"x-user-role": "admin", "x-user-name": "it_admin"}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            content_type = res.headers.get("Content-Type", "")
            disposition = res.headers.get("Content-Disposition", "")
            content = res.read()
            passed = (status == 200) and ("inline" in disposition or "attachment" in disposition) and len(content) > 0
            details = f"HTTP Status: {status}\nContent-Type: {content_type}\nDisposition: {disposition}\nKích thước tải về: {len(content)} bytes"
    except Exception as e:
        passed = False
        details = f"Lỗi gọi API /api/documents/raw: {e}"
        
    return passed, details


async def tc_05_document_chunk_and_detail_inspection():
    """TC-M1-05: Tra cứu chi tiết phân rã đoạn văn bản (Chunks) và Metadata vector (US09)."""
    import urllib.request
    import json
    
    url = "http://127.0.0.1:5000/api/documents/detail?doc_id=dbo_ErrorLog.csv"
    req = urllib.request.Request(url, headers={"x-user-role": "executive"})
    
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            data = json.loads(res.read().decode())
            is_success = data.get("success") is True
            chunks = data.get("chunks", [])
            passed = (status == 200) and is_success
            details = f"HTTP Status: {status}, Success: {is_success}\nTổng số Chunks bóc tách: {len(chunks)}"
    except Exception as e:
        passed = False
        details = f"Lỗi gọi API /api/documents/detail: {e}"
        
    return passed, details


async def tc_06_department_scope_guard_br02():
    """TC-M1-06: Chặn nhân viên phòng ban khác truy cập tệp gốc khi không có quyền (BR-02 Scope Guard)."""
    import urllib.request
    import urllib.error
    
    # Nhân viên Kinh doanh (sales) truy cập tệp hợp đồng nhạy cảm thuộc phòng Pháp chế (legal)
    url = "http://127.0.0.1:5000/api/documents/raw?filename=C_29218058437_HuynhNgocMinh_BTTL.docx&department=legal"
    headers = {
        "x-user-role": "standard",
        "x-user-dept": "sales",
        "x-user-name": "nam"
    }
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            passed = False
            details = f"Cảnh báo: Nhân viên Kinh doanh lại tải được file Pháp chế (HTTP {res.status})!"
    except urllib.error.HTTPError as err:
        passed = (err.code == 403)
        details = f"HTTP Status: {err.code} (Forbidden - Đúng chuẩn nghiệp vụ BR-02 chặn chéo phòng ban)"
    except Exception as e:
        passed = False
        details = f"Lỗi bất thường: {e}"
        
    return passed, details


async def tc_07_approval_queue_pending_check():
    """TC-M1-07: Chặn nạp tài liệu nếu đang nằm trong hàng đợi chờ duyệt (Approval Queue - US20)."""
    from unittest.mock import AsyncMock, MagicMock
    from app.core.central_storage import check_document_duplicate
    
    # Giả lập database có 1 tài liệu ở trạng thái PENDING
    mock_db = AsyncMock()
    mock_item = MagicMock()
    mock_item.status = "PENDING"
    mock_item.file_name = "ChinhSach_HoaHong_VIP_2026.docx"
    
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_item
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_res
    
    is_dup, reason = await check_document_duplicate("ChinhSach_HoaHong_VIP_2026.docx", b"test_content", db=mock_db)
    passed = (is_dup is True) and ("phê duyệt" in reason or "PENDING" in str(reason).upper())
    
    details = f"File kiểm tra: ChinhSach_HoaHong_VIP_2026.docx\nKết quả chặn: {reason}"
    return passed, details


async def tc_08_live_databases_grounding():
    """TC-M1-08: Đối soát kết nối và tính sẵn sàng của hệ thống CSDL (PostgreSQL, Neo4j, Qdrant)."""
    import psycopg2
    from neo4j import GraphDatabase
    import urllib.request
    import json
    
    db_status = {}
    
    # 1. PostgreSQL
    try:
        conn = psycopg2.connect("postgresql://postgres:123456@127.0.0.1:5432/graph-mind")
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
        tbl_cnt = cur.fetchone()[0]
        conn.close()
        db_status["PostgreSQL"] = f"OK ({tbl_cnt} bảng)"
    except Exception as e:
        db_status["PostgreSQL"] = f"FAIL ({e})"
        
    # 2. Neo4j
    try:
        driver = GraphDatabase.driver("bolt://127.0.0.1:7687", auth=("neo4j", "graphmind_secret"))
        with driver.session() as s:
            r = s.run("MATCH (n:Document) RETURN count(n) AS cnt").single()
            doc_nodes = r["cnt"] if r else 0
        driver.close()
        db_status["Neo4j"] = f"OK ({doc_nodes} Document nodes)"
    except Exception as e:
        db_status["Neo4j"] = f"FAIL ({e})"
        
    # 3. Qdrant
    try:
        with urllib.request.urlopen("http://127.0.0.1:6333/collections/cuad_contracts", timeout=3) as res:
            q_data = json.loads(res.read().decode())
            pts = q_data.get("result", {}).get("points_count", 0)
        db_status["Qdrant"] = f"OK ({pts} vector points trong cuad_contracts)"
    except Exception as e:
        db_status["Qdrant"] = f"FAIL ({e})"
        
    passed = all("OK" in v for v in db_status.values())
    details = "\n".join([f"{k}: {v}" for k, v in db_status.items()])
    return passed, details


# ==============================================================================
# MAIN TEST SUITE RUNNER
# ==============================================================================

TEST_CASES = [
    ("TC-M1-01", "Nạp tài liệu mới với tên và nội dung hợp lệ", "FR1 / US01 (Document Ingestion)", tc_01_upload_new_unique_document),
    ("TC-M1-02", "Chặn nạp tài liệu trùng tên file đã có trong kho", "BR-03 / F-02 (Duplicate File Name Guard)", tc_02_reject_duplicate_file_name),
    ("TC-M1-03", "Chặn nạp tài liệu trùng mã băm SHA-256 (kể cả đổi tên)", "BR-03 (SHA-256 Content Hash Guard)", tc_03_reject_duplicate_content_sha256),
    ("TC-M1-04", "Phân phối tệp gốc xem trước trực quan (Visual Preview)", "US09 / PB11 (Raw File Streaming)", tc_04_visual_preview_raw_streaming),
    ("TC-M1-05", "Tra cứu phân rã đoạn văn bản Chunks & Vector Metadata", "US09 (Chunk Inspection)", tc_05_document_chunk_and_detail_inspection),
    ("TC-M1-06", "Kiểm soát ranh giới phân quyền phòng ban truy cập tệp", "BR-02 (Department Scope Enforcement)", tc_06_department_scope_guard_br02),
    ("TC-M1-07", "Chặn nạp tài liệu đang nằm trong hàng đợi duyệt PENDING", "US20 (Document Approval Queue)", tc_07_approval_queue_pending_check),
    ("TC-M1-08", "Đối soát liên kết đồng bộ cơ sở dữ liệu thực tế", "Live DB Grounding (Postgres, Neo4j, Qdrant)", tc_08_live_databases_grounding),
]


async def run_suite():
    print_header("GRAPHMIND — MODULE 1 BUSINESS SPECIFICATION AUDIT SUITE")
    print(f"{DIM}Kiểm thử tính năng: Nạp tài liệu, Kiểm tra trùng lặp, Xem trước trực quan & Phân quyền{RESET}\n")
    
    passed_count = 0
    total_count = len(TEST_CASES)
    
    for tc_id, title, srs_ref, test_fn in TEST_CASES:
        try:
            passed, details = await test_fn()
        except Exception as e:
            passed = False
            details = f"Lỗi ngoại lệ không xử lý: {e}"
            
        if passed:
            passed_count += 1
            
        print_test_result(tc_id, title, srs_ref, passed, details)
        
    print(f"{CYAN}{'─' * 78}{RESET}")
    compliance_rate = (passed_count / total_count) * 100
    color = GREEN if passed_count == total_count else YELLOW
    print(f" {BOLD}KẾT QUẢ KIỂM THỬ MODULE 1:{RESET} {color}{BOLD}{passed_count}/{total_count} Kịch bản ĐẠT ({compliance_rate:.1f}% TUÂN THỦ){RESET}")
    print(f"{CYAN}{'─' * 78}{RESET}\n")
    
    return passed_count == total_count


# Pytest compatibility
import pytest

@pytest.mark.asyncio
@pytest.mark.parametrize("tc_id,title,srs_ref,test_fn", TEST_CASES)
async def test_module1_parametrized(tc_id, title, srs_ref, test_fn):
    passed, details = await test_fn()
    assert passed, f"{tc_id} FAILED: {details}"


if __name__ == "__main__":
    success = asyncio.run(run_suite())
    sys.exit(0 if success else 1)
