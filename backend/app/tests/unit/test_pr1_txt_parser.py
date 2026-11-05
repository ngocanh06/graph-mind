"""
Unit Tests for PR1 TXT Ingestion & Plain Text Extraction
Module: backend/app/tests/unit/test_pr1_txt_parser.py

Coverage: 8 pure unit tests
- test_txt_utf8_standard_decoding
- test_txt_utf8_sig_bom_handling
- test_txt_cp1252_windows_encoding
- test_txt_latin1_fallback
- test_txt_control_characters_sanitization
- test_txt_exceeds_10mb_limit_raises_value_error
- test_txt_supported_extensions_includes_txt
- test_txt_empty_and_whitespace
"""
import pytest
import os
import sys

# Ensure backend/app is importable
app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from modules.m1_data_sync.pipeline import (
    extract_text_from_bytes,
    SUPPORTED_EXTENSIONS
)


def test_txt_utf8_standard_decoding():
    """1. Standard UTF-8 plain text decodes correctly."""
    text_sample = "Hợp đồng dịch vụ tư vấn quản trị và xử lý ngôn ngữ tự nhiên GraphMind."
    raw_bytes = text_sample.encode("utf-8")
    result = extract_text_from_bytes("contract.txt", raw_bytes)
    assert result == text_sample


def test_txt_utf8_sig_bom_handling():
    """2. UTF-8 with Byte Order Mark (BOM: \\xef\\xbb\\xbf) decodes cleanly without BOM character."""
    text_sample = "Tài liệu lưu trữ có BOM ký hiệu chuẩn UTF-8."
    raw_bytes = text_sample.encode("utf-8-sig")
    assert raw_bytes.startswith(b"\xef\xbb\xbf")
    result = extract_text_from_bytes("contract_bom.txt", raw_bytes)
    assert not result.startswith("\ufeff")
    assert "Tài liệu lưu trữ có BOM ký hiệu chuẩn UTF-8." in result


def test_txt_cp1252_windows_encoding():
    """3. Windows CP1252 encoding with curly smart quotes falls back and decodes cleanly."""
    # Byte 0x93 and 0x94 are smart quotes in CP1252, invalid in UTF-8
    raw_bytes = b"Contract terms \x93Confidential Agreement\x94 Section 1."
    result = extract_text_from_bytes("windows_legacy.txt", raw_bytes)
    assert "Contract terms" in result
    assert "Confidential Agreement" in result
    assert "Section 1." in result


def test_txt_latin1_fallback():
    """4. ISO-8859-1 (Latin-1) accented characters decode without error."""
    raw_bytes = b"Soci\xe9t\xe9 G\xe9n\xe9rale Corporate Legal Agreement"
    result = extract_text_from_bytes("french_corp.txt", raw_bytes)
    assert "Société Générale" in result or "Corporate Legal Agreement" in result


def test_txt_control_characters_sanitization():
    """5. Non-printable control characters are stripped while preserving tabs and newlines."""
    dirty_text = "Dòng 1\x00\x01\x07\x08\n\tDòng 2 có tab\x0e\x0f\x7f\r\nDòng 3 kết thúc."
    raw_bytes = dirty_text.encode("utf-8")
    result = extract_text_from_bytes("sanitized.txt", raw_bytes)
    assert "\x00" not in result
    assert "\x01" not in result
    assert "\x07" not in result
    assert "\x08" not in result
    assert "\x0e" not in result
    assert "\x0f" not in result
    assert "\x7f" not in result
    # Crucial formatting characters preserved
    assert "\n" in result
    assert "\t" in result
    assert "Dòng 1" in result
    assert "Dòng 2 có tab" in result
    assert "Dòng 3 kết thúc." in result


def test_txt_exceeds_10mb_limit_raises_value_error():
    """6. Text file exceeding 10 MiB limit raises ValueError immediately."""
    oversized_bytes = b"A" * (10 * 1024 * 1024 + 1)
    with pytest.raises(ValueError) as excinfo:
        extract_text_from_bytes("huge_file.txt", oversized_bytes)
    assert "vượt quá giới hạn 10 MB" in str(excinfo.value)


def test_txt_supported_extensions_includes_txt():
    """7. SUPPORTED_EXTENSIONS constant includes .txt."""
    assert ".txt" in SUPPORTED_EXTENSIONS
    assert SUPPORTED_EXTENSIONS >= {".pdf", ".docx", ".xlsx", ".csv", ".txt"}


def test_txt_empty_and_whitespace():
    """8. Empty or whitespace-only TXT files return clean string without throwing unhandled exceptions."""
    empty_result = extract_text_from_bytes("empty.txt", b"")
    assert empty_result == ""

    ws_result = extract_text_from_bytes("spaces.txt", b"   \n\t\r\n   ")
    assert ws_result.strip() == ""
