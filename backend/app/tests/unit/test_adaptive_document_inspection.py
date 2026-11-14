"""
Unit test suite for Adaptive Document Inspection & Summarization Engine.
Tests:
- format_short_document_content CSV table extraction.
- format_short_document_content plain-text full extraction.
- Short file vs Long file routing logic.
- OllamaClient prompt injection for document summarization & 1024 token budget.
"""
import pytest
import asyncio
from unittest.mock import patch, MagicMock

from app.api.v1.copilot import format_short_document_content
from app.modules.m3_hybrid_copilot.inference.client import OllamaClient


def test_format_short_csv_document():
    """Verify that a short CSV document is cleanly parsed into Markdown table with headers and rows."""
    raw_csv = (
        "BusinessEntityID,Name\r\n"
        "1010,Progressive Sports Retail Ltd.\r\n"
        "1011,Advanced Mountain Outfitters"
    )
    result = format_short_document_content(
        doc_name="Sales_Store.csv",
        doc_id="DOC_9B3EC572",
        dept="Kinh doanh (Sales)",
        text=raw_csv
    )

    assert "Sales_Store.csv" in result
    assert "DOC_9B3EC572" in result
    assert "2 trường thông tin (cột)" in result
    assert "2 bản ghi (dòng)" in result
    assert "| BusinessEntityID | Name |" in result
    assert "| 1010 | Progressive Sports Retail Ltd. |" in result
    assert "| 1011 | Advanced Mountain Outfitters |" in result
    assert "1. `BusinessEntityID`" in result
    assert "2. `Name`" in result


def test_format_short_plaintext_document():
    """Verify that a short non-CSV text document is cleanly wrapped in code block."""
    raw_text = "Điều 1: Quy định chung về bảo mật thông tin nội bộ."
    result = format_short_document_content(
        doc_name="Policy_Security.txt",
        doc_id="DOC_SEC_01",
        dept="Pháp chế",
        text=raw_text
    )

    assert "Policy_Security.txt" in result
    assert "DOC_SEC_01" in result
    assert "Pháp chế" in result
    assert "```text\nĐiều 1: Quy định chung về bảo mật thông tin nội bộ.\n```" in result


def test_ollama_client_summary_prompt_injection():
    """Verify that is_document_summary=True injects strict summary rules and sets num_predict to 1024."""
    client = OllamaClient()
    evidence_chunks = [
        {"text": "Đoạn 1: Thỏa thuận hợp tác chiến lược giữa Công ty A và Công ty B.", "source_file": "HopDong.pdf", "chunk_index": 0}
    ]
    graph_entities = [
        {"name": "HopDong.pdf", "_labels": ["Document"], "snippet": "Tài liệu hợp đồng"}
    ]

    captured_payload = {}

    async def fake_post(url, json=None, **kwargs):
        nonlocal captured_payload
        captured_payload = json
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "message": {
                "content": "1. Thông tin chung: Hợp đồng giữa Công ty A và B.\n2. Nội dung chính: Hợp tác phân phối.\n3. Thời hạn: 3 năm."
            }
        }
        return mock_resp

    with patch("httpx.AsyncClient.post", side_effect=fake_post):
        res = asyncio.run(client.generate_rag_answer(
            query="HopDong.pdf tóm tắt nội dung file này",
            evidence_chunks=evidence_chunks,
            graph_entities=graph_entities,
            lang="vi",
            is_document_summary=True,
            target_doc_name="HopDong.pdf"
        ))

    assert res["success"] is True
    assert captured_payload is not None
    # Verify num_predict is at least 1024 (e.g. 1536) to prevent truncation
    assert captured_payload["options"]["num_predict"] >= 1024
    # Verify strict document summarization rules are injected in system prompt
    system_content = captured_payload["messages"][0]["content"]
    assert "QUY TẮC TÓM TẮT NỘI DUNG TÀI LIỆU" in system_content
    assert "HopDong.pdf" in system_content
    assert "TUYỆT ĐỐI KHÔNG đưa số liệu doanh thu ERP" in system_content

