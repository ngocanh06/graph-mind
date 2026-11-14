"""
Unit test suite for Document Visual Preview & Raw File Access.
Tests:
- Raw file streaming endpoint (/api/documents/raw and /api/v1/documents/raw).
- Inline disposition and MIME types for DOCX, PDF, XLSX, CSV.
- Department Scope Access control (BR-02).
- Tabular extraction for spreadsheet preview in /api/documents/detail.
"""
import pytest
import io
import openpyxl
from unittest.mock import patch


@pytest.mark.asyncio
async def test_get_document_raw_file_docx_admin(async_client):
    """Test fetching raw docx bytes as admin returns inline content-disposition."""
    dummy_docx = b"PK\x03\x04dummy_word_file_bytes"

    with patch("app.core.central_storage.read_file_from_storage", return_value=dummy_docx):
        response = await async_client.get(
            "/api/documents/raw?filename=C_29218058437_HuynhNgocMinh_BTTL.docx&department=legal",
            headers={"x-user-role": "admin", "x-user-name": "admin"}
        )

        assert response.status_code == 200
        assert response.content == dummy_docx
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in response.headers.get("content-type", "")
        assert "inline" in response.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_get_document_raw_file_br02_forbidden(async_client):
    """Test standard user from sales attempting to access legal raw document is blocked by BR-02."""
    response = await async_client.get(
        "/api/documents/raw?filename=C_29218058437_HuynhNgocMinh_BTTL.docx&department=legal",
        headers={"x-user-role": "standard", "x-user-dept": "sales", "x-user-name": "nam"}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_document_raw_file_executive_allowed(async_client):
    """Test executive user has enterprise access to preview raw document under BR-02."""
    dummy_docx = b"PK\x03\x04legal_bytes"
    with patch("app.core.central_storage.read_file_from_storage", return_value=dummy_docx):
        response = await async_client.get(
            "/api/documents/raw?filename=C_29218058437_HuynhNgocMinh_BTTL.docx&department=legal",
            headers={"x-user-role": "executive", "x-user-name": "ceo"}
        )
        assert response.status_code == 200
        assert response.content == dummy_docx
        assert "inline" in response.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_spreadsheet_detail_parsing_xlsx(async_client):
    """Test that .xlsx files are automatically parsed into live table records for preview."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["ID", "Name", "Score"])
    ws.append([101, "Alice", 95])
    ws.append([102, "Bob", 88])
    out = io.BytesIO()
    wb.save(out)
    xlsx_bytes = out.getvalue()

    with patch("app.core.central_storage.read_file_from_storage", return_value=xlsx_bytes):
        response = await async_client.get(
            "/api/documents/detail?doc_id=sample_grade.xlsx&department=rnd",
            headers={"x-user-role": "admin", "x-user-name": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        doc_data = data.get("data", {})
        records = doc_data.get("records", [])
        assert len(records) == 2
        assert records[0]["Name"] == "Alice"
        assert records[1]["Name"] == "Bob"
