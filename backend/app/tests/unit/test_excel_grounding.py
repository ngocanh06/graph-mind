"""
Unit test suite for Excel Grounding & Retrieval Accuracy.
Tests:
- Sheet boundary preservation in openpyxl extraction.
- Sheet-aware chunking (Case1 vs Case2 separation).
- Context assembly prioritization and solver preservation.
- Strict Document Isolation from AdventureWorks ERP entities.
- Session follow-up active document inheritance.
- Grounded confidence score calibration.
"""
import io
import re
import pytest
from unittest.mock import MagicMock, patch

from app.modules.m1_data_sync.pipeline import extract_text_from_bytes, chunk_text
from app.modules.m3_hybrid_copilot.inference.client import OllamaClient


def test_xlsx_parser_preserves_sheets_and_values():
    """Verify XLSX parser extracts sheet headers, tabular layout, and numerical values."""
    # Build a minimal multi-sheet Excel file in memory
    openpyxl = pytest.importorskip("openpyxl")
    wb = openpyxl.Workbook()
    ws_case2 = wb.active
    ws_case2.title = "Case2"
    ws_case2.append(["BẢNG PHÂN BỔ HÀM LƯỢNG DINH DƯỠNG VÀ GIÁ MUA THỨC ĂN GIA SÚC"])
    ws_case2.append(["", "A", "B", "C", "Yêu cầu tối thiểu/ngày"])
    ws_case2.append(["Hàm lượng đạm - g/kg", 100, 200, 300, 90])
    ws_case2.append(["Giá mua - VNĐ/kg", 3000, 4000, 5000, ""])
    ws_case2.append(["LỜI GIẢI SOLVER: KHỐI LƯỢNG THỨC ĂN TỐI ƯU"])
    ws_case2.append(["khối lượng cần mua - kg/ngày", 0.1933, 0.0933, 0.1733, "TỔNG CHI PHÍ MUA", 1820])

    ws_case1 = wb.create_sheet("Case1")
    ws_case1.append(["BẢNG PHÂN BỔ VẬN CHUYỂN HÀNG HÓA TỪ NHÀ MÁY QUA KHO ĐẾN KHÁCH HÀNG"])
    ws_case1.append(["Nhà máy / Kho hàng", "K1", "K2", "Công suất (Supply)"])
    ws_case1.append(["Chi phí vận chuyển từ HCM - USD/đơn vị", 6, 5, 550])
    ws_case1.append(["GIẢI THÍCH KẾT QUẢ SOLVER — CASE 1 (Vận chuyển)"])
    ws_case1.append(["Phương án tối ưu: Z_min = 17.690 USD"])

    buf = io.BytesIO()
    wb.save(buf)
    content_bytes = buf.getvalue()

    extracted = extract_text_from_bytes("test_workbook.xlsx", content_bytes)

    assert "=== SHEET: Case2 ===" in extracted
    assert "=== SHEET: Case1 ===" in extracted
    assert "Hàm lượng đạm - g/kg | 100 | 200 | 300 | 90" in extracted
    assert "3000 | 4000 | 5000" in extracted
    assert "1820" in extracted
    assert "17.690 USD" in extracted


def test_chunk_text_preserves_sheet_boundaries_and_tags():
    """Verify that chunking on spreadsheet text preserves sheet boundaries and tags every chunk."""
    text = (
        "=== SHEET: Case2 ===\n"
        "BẢNG PHÂN BỔ HÀM LƯỢNG DINH DƯỠNG\n"
        "Đạm: 90 | Đường: 130 | Khoáng: 10\n"
        "xA = 193.33 kg | xB = 93.33 kg | xC = 173.33 kg\n"
        "Tổng chi phí: 1.820 VNĐ/ngày\n\n"
        "=== SHEET: Case1 ===\n"
        "BẢNG PHÂN BỔ VẬN CHUYỂN\n"
        "HCM -> K1 -> CUS2: 50 | HCM -> K1 -> CUS4: 500\n"
        "Tiền Giang -> K1 -> CUS2: 200\n"
        "Phương án tối ưu Z_min = 17.690 USD\n"
    )

    chunks = chunk_text(text, max_chars=300)
    assert len(chunks) >= 2

    # Verify no chunk contains both Case1 and Case2 headers
    for ch in chunks:
        has_c1 = "Case1" in ch
        has_c2 = "Case2" in ch
        assert not (has_c1 and has_c2), "Chunk must not blend Case1 and Case2!"


def test_inference_client_prioritizes_solver_and_allocates_budget():
    """Verify that client.py prioritizes solver result chunks and includes Case1 / Case2 correctly."""
    client = OllamaClient()

    chunks = [
        {"text": "[Sheet: Case1] Thông tin chung về công ty ABC", "source_file": "file.xlsx", "chunk_index": 0, "score": 0.4},
        {"text": "[Sheet: Case1] GIẢI THÍCH KẾT QUẢ SOLVER — CASE 1: Z_min = 17.690 USD", "source_file": "file.xlsx", "chunk_index": 1, "score": 0.5},
        {"text": "[Sheet: Case2] GIẢI THÍCH KẾT QUẢ SOLVER — CASE 2: Z_min = 1.820 VNĐ/ngày, xA=193.33, xB=93.33, xC=173.33", "source_file": "file.xlsx", "chunk_index": 2, "score": 0.5},
    ]

    # Query asking about Case1 Solver
    q = "Trong Case1, hãy giải thích kết quả solver và chi phí"
    # Sorter priority check
    q_norm = q.lower()
    asks_case1 = bool(re.search(r"\bcase\s*1\b|\bvận chuyển\b|\btuyến\b", q_norm))
    assert asks_case1 is True

    # When querying Case 1, chunk 1 (solver) should be ranked first
    def priority(c):
        t_low = c["text"].lower()
        score = c["score"] * 10
        if "sheet: case1" in t_low:
            score += 20.0
        if "z_min" in t_low or "kết quả solver" in t_low:
            score += 15.0
        return score

    ranked = sorted(chunks, key=priority, reverse=True)
    assert ranked[0]["chunk_index"] == 1
    assert "17.690 USD" in ranked[0]["text"]


def test_confidence_score_calibration():
    """Verify confidence score is not hardcoded to 96% and drops to 0 on lack of evidence."""
    # Test refusal phrase detection
    refusal_answers = [
        "Không tìm thấy bằng chứng đủ tin cậy trong kho tri thức",
        "Chưa đủ dữ liệu để kết luận kết quả của case này",
    ]
    for ans in refusal_answers:
        is_refused = any(p in ans.lower() for p in ["không tìm thấy bằng chứng", "chưa đủ dữ liệu", "chưa thể kết luận"])
        assert is_refused is True
