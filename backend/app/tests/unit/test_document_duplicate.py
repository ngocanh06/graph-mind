import pytest
import hashlib
from unittest.mock import MagicMock, AsyncMock
from app.core.central_storage import check_document_duplicate

@pytest.mark.asyncio
async def test_duplicate_check_brand_new_file():
    """Verify that a brand new file with unique name and unique content is allowed."""
    unique_name = "brand_new_unique_contract_2099_xyz.pdf"
    unique_content = b"Content that has never existed in any document repository 2099"
    is_dup, reason = await check_document_duplicate(unique_name, unique_content)
    assert is_dup is False
    assert reason is None


@pytest.mark.asyncio
async def test_duplicate_check_existing_name():
    """Verify that uploading a file with an already existing name is rejected."""
    existing_name = "Purchasing_PurchaseOrderDetail.csv"
    dummy_content = b"Some brand new content"
    is_dup, reason = await check_document_duplicate(existing_name, dummy_content)
    assert is_dup is True
    assert "đã tồn tại" in reason
    assert existing_name in reason


@pytest.mark.asyncio
async def test_duplicate_check_identical_content_different_name():
    """Verify that uploading a file with different name but identical content hash is rejected."""
    # Find an existing doc's hash from watcher_ingested_docs.json if available
    import json
    from pathlib import Path
    docs_file = Path(__file__).resolve().parent.parent.parent / "modules" / "m1_data_sync" / "data" / "watcher_ingested_docs.json"
    if docs_file.exists():
        with open(docs_file, "r", encoding="utf-8") as f:
            docs = json.load(f)
        target_doc = next((d for d in docs if (d.get("hash") or d.get("file_hash"))), None)
        if target_doc:
            target_hash = (target_doc.get("hash") or target_doc.get("file_hash")).lower().strip()
            # Mock hashlib.sha256 to return this hash
            from unittest.mock import patch
            mock_hash = MagicMock()
            mock_hash.hexdigest.return_value = target_hash
            with patch("hashlib.sha256", return_value=mock_hash):
                is_dup, reason = await check_document_duplicate("brand_new_alias_name.pdf", b"fake_bytes")
                assert is_dup is True
                assert "trùng khớp" in reason or "đã tồn tại" in reason


@pytest.mark.asyncio
async def test_duplicate_check_pending_approval():
    """Verify that if a document is already pending in the approval queue, it is rejected."""
    mock_db = AsyncMock()
    mock_approval = MagicMock()
    mock_approval.status = "PENDING"
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_approval
    mock_exec_res = MagicMock()
    mock_exec_res.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_exec_res

    unique_name = "some_unique_file_pending.pdf"
    is_dup, reason = await check_document_duplicate(unique_name, b"random_bytes", db=mock_db)
    assert is_dup is True
    assert "hàng đợi chờ Quản trị viên phê duyệt" in reason
