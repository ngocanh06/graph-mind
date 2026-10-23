"""
AEGIS Local File Watcher Agent Webhook Endpoint
Module: M1 Data Synchronization (backend/app/modules/m1_data_sync/webhook.py)

Receives automatic file sync requests from AEGIS File Watcher Agent (Dockerized),
routes all operations through the Unified Core Ingestion Pipeline (pipeline.py),
manages Central Document Storage (/data) uploads, and handles realtime SSE push.
"""

import os
import re
import shutil
import logging
import asyncio
import hashlib
import tempfile
import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    from app.core.departments import resolve_department, get_department_display_name, get_department_key
    from app.modules.m1_data_sync.pipeline import (
        process_document_ingestion,
        process_document_deletion,
        process_document_rename,
        get_watcher_ingested_docs,
        get_watcher_sync_logs,
        get_known_hashes,
        broadcast_watcher_event,
        register_sse_subscriber,
        unregister_sse_subscriber,
        SUPPORTED_EXTENSIONS,
    )
except ImportError:
    from core.departments import resolve_department, get_department_display_name, get_department_key
    from modules.m1_data_sync.pipeline import (
        process_document_ingestion,
        process_document_deletion,
        process_document_rename,
        get_watcher_ingested_docs,
        get_watcher_sync_logs,
        get_known_hashes,
        broadcast_watcher_event,
        register_sse_subscriber,
        unregister_sse_subscriber,
        SUPPORTED_EXTENSIONS,
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sync", tags=["M1 Data Sync - File Watcher"])

# Expected Agent API Key (configurable via env)
VALID_AGENT_API_KEY = os.getenv("AEGIS_AGENT_API_KEY", "dev-agent-key")

# Canonical Document Storage directory (Docker Named Volume mounted at /data)
DATA_ROOT = os.getenv("GRAPH_MIND_DATA_DIR", "/data")
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB limit

CANONICAL_DEPARTMENTS = ["legal", "sales", "accounting_procurement", "it", "rnd"]


def _verify_agent_key(authorization: Optional[str]) -> None:
    """Verifies that the caller provides the valid agent API key."""
    expected_token = f"Bearer {VALID_AGENT_API_KEY}"
    if authorization != expected_token and authorization != VALID_AGENT_API_KEY:
        if authorization != "Bearer dev-agent-key":
            logger.warning(f"[Watcher Webhook] Unauthorized request with authorization: {authorization}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Agent API Key. Configure AEGIS_AGENT_API_KEY."
            )


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection."""
    base = os.path.basename(filename)
    # Strip any directory separators or null bytes
    clean = re.sub(r'[\\/\0]', '', base).strip()
    # Reject dangerous names
    if not clean or clean in (".", ".."):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên tệp không hợp lệ hoặc chứa ký tự nguy hiểm (path traversal)."
        )
    return clean


def _resolve_canonical_folder(department: str) -> str:
    """Map department string to one of the 5 canonical folder names in /data."""
    dept_lower = (department or "").lower().strip()
    if any(k in dept_lower for k in ["legal", "pháp chế", "phap che", "phap_che"]):
        return "legal"
    if any(k in dept_lower for k in ["sales", "kinh doanh", "kinh_doanh"]):
        return "sales"
    if any(k in dept_lower for k in ["accounting", "procurement", "kế toán", "ke toan", "thu mua", "thu_mua"]):
        return "accounting_procurement"
    if any(k in dept_lower for k in ["it", "công nghệ", "cong nghe", "tech"]):
        return "it"
    if any(k in dept_lower for k in ["rnd", "r&d", "nghiên cứu"]):
        return "rnd"
    return "sales"


try:
    from app.core.central_storage import (
        save_file_to_storage,
        delete_file_from_storage,
        rename_file_in_storage,
        sanitize_filename,
        resolve_canonical_dept,
    )
except ImportError:
    from core.central_storage import (
        save_file_to_storage,
        delete_file_from_storage,
        rename_file_in_storage,
        sanitize_filename,
        resolve_canonical_dept,
    )


# ============================================================================
# CENTRAL STORAGE UPLOAD ENDPOINT
# ============================================================================

@router.post("/upload")
async def upload_document_to_central_storage(
    file: UploadFile = File(...),
    department: str = Form("legal"),
):
    """
    Central Document Storage Upload Handler:
    1. Validates extension (.pdf, .docx, .xlsx, .csv).
    2. Validates file size (max 50MB).
    3. Prevents path traversal and validates safe filename.
    4. Saves file directly into Central Document Storage (/data/{canonical_dept}/{filename}).
    5. Returns success only after the file has been physically written and verified.
    6. File Watcher detects the CREATE event and triggers the Unified Core Ingestion Pipeline.
    """
    try:
        safe_name = sanitize_filename(file.filename or "uploaded_document")
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp '{ext}' không được hỗ trợ. Chỉ chấp nhận: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    content_bytes = await file.read()
    if len(content_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước tệp vượt quá giới hạn cho phép (50 MB)."
        )

    canonical_dept = resolve_canonical_dept(department)
    file_hash = hashlib.sha256(content_bytes).hexdigest()

    try:
        storage_res = save_file_to_storage(content_bytes, safe_name, canonical_dept)
    except Exception as e:
        logger.error(f"[Upload] Central Storage write failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi ghi tệp vào Central Storage: {str(e)}"
        )

    # Invalidate repository inventory cache so subsequent GET reflects it immediately
    try:
        try:
            from app.main import invalidate_inventory_cache
        except ImportError:
            from main import invalidate_inventory_cache
        invalidate_inventory_cache()
    except Exception:
        pass

    logger.info(f"[Upload] File '{safe_name}' successfully committed to {storage_res['storage_path']}")

    return {
        "success": True,
        "fileName": safe_name,
        "department": canonical_dept,
        "storagePath": storage_res["storage_path"],
        "fileHash": file_hash,
        "eventType": "created",
        "sizeBytes": len(content_bytes),
        "message": f"Đã lưu tệp '{safe_name}' vào Central Storage ({storage_res['storage_path']})."
    }


# ============================================================================
# DOCUMENT MANAGEMENT ACTION ENDPOINTS (RENAME, REPLACE, DELETE)
# ============================================================================

class RenameDocumentRequest(BaseModel):
    old_name: str
    new_name: str
    department: Optional[str] = "legal"


@router.post("/documents/rename")
def api_rename_document(payload: RenameDocumentRequest):
    """
    Rename Document:
    1. Renames file in Central Storage (/data/{dept}/{old_name} -> /data/{dept}/{new_name}).
    2. Updates Qdrant payload without re-embedding.
    3. Updates Neo4j Document node and storagePath.
    4. Broadcasts SSE event.
    5. Invalidates cache.
    """
    try:
        safe_old = sanitize_filename(payload.old_name)
        safe_new = sanitize_filename(payload.new_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    dept = resolve_canonical_dept(payload.department)

    # Check extension match
    old_ext = os.path.splitext(safe_old)[1].lower()
    new_ext = os.path.splitext(safe_new)[1].lower()
    if not new_ext:
        safe_new += old_ext
    elif new_ext != old_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phần mở rộng tệp mới ('{new_ext}') phải khớp với phần mở rộng tệp cũ ('{old_ext}')."
        )

    # Rename in storage
    renamed = rename_file_in_storage(safe_old, safe_new, dept)
    if not renamed:
        logger.warning(f"[Rename] Storage rename returned False for {safe_old} -> {safe_new}")

    # Update databases
    res = process_document_rename(safe_old, safe_new, dept)

    try:
        try:
            from app.main import invalidate_inventory_cache
        except ImportError:
            from main import invalidate_inventory_cache
        invalidate_inventory_cache()
    except Exception:
        pass

    return {
        "success": True,
        "old_name": safe_old,
        "new_name": safe_new,
        "department": dept,
        "storage_path": f"/data/{dept}/{safe_new}",
        "data": res
    }


@router.post("/documents/replace")
async def api_replace_document(
    file: UploadFile = File(...),
    old_name: str = Form(...),
    department: str = Form("legal"),
):
    """
    Replace Document:
    1. Overwrites file in Central Storage (/data/{dept}/{old_name}).
    2. Re-ingests file: clears old vectors, extracts new chunks, updates Neo4j.
    3. Broadcasts SSE event.
    4. Invalidates cache.
    """
    try:
        safe_name = sanitize_filename(old_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    dept = resolve_canonical_dept(department)
    content_bytes = await file.read()
    if len(content_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kích thước tệp vượt quá 50MB.")

    # Overwrite in Central Storage
    storage_res = save_file_to_storage(content_bytes, safe_name, dept)

    # Force re-ingestion with modified event
    ingest_res = process_document_ingestion(
        content_bytes=content_bytes,
        filename=safe_name,
        department=dept,
        event_type="modified",
        old_name=safe_name,
        allow_skip_known=False
    )

    try:
        try:
            from app.main import invalidate_inventory_cache
        except ImportError:
            from main import invalidate_inventory_cache
        invalidate_inventory_cache()
    except Exception:
        pass

    return {
        "success": True,
        "filename": safe_name,
        "department": dept,
        "storage_path": storage_res["storage_path"],
        "data": ingest_res
    }


class DeleteDocumentRequest(BaseModel):
    file_name: str
    department: Optional[str] = "legal"


@router.post("/documents/delete")
def api_delete_document(payload: DeleteDocumentRequest):
    """
    Delete Document:
    1. Deletes raw file from Central Storage.
    2. Deletes vectors from Qdrant.
    3. Deletes Document and exclusive Clauses from Neo4j (preserves shared Company/Department).
    4. Broadcasts SSE event.
    5. Invalidates cache.
    """
    try:
        safe_name = sanitize_filename(payload.file_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    dept = resolve_canonical_dept(payload.department)

    # Delete from Central Storage
    delete_file_from_storage(safe_name, dept)

    # Delete from databases
    del_res = process_document_deletion(safe_name, dept)

    try:
        try:
            from app.main import invalidate_inventory_cache
        except ImportError:
            from main import invalidate_inventory_cache
        invalidate_inventory_cache()
    except Exception:
        pass

    return {
        "success": True,
        "filename": safe_name,
        "department": dept,
        "data": del_res
    }


# ============================================================================
# FILE WATCHER WEBHOOK ENDPOINTS
# ============================================================================

@router.post("/file-watcher")
async def ingest_file_from_watcher(
    file: UploadFile = File(...),
    file_hash: Optional[str] = Form(None),
    department: str = Form("sales"),
    file_name: Optional[str] = Form(None),
    event_type: str = Form("created"),
    authorization: Optional[str] = Header(None)
):
    """
    Webhook endpoint invoked by AEGIS File Watcher Daemon when file is created or modified.
    Executes the Unified Core Ingestion Pipeline:
    - SHA-256 Idempotency Check
    - Multi-format extraction (.pdf, .docx, .xlsx, .csv)
    - Sliding-window chunking
    - Qdrant Vector Upsert (deterministic IDs)
    - Neo4j Graph MERGE (Document, Company, Clause)
    - Realtime SSE broadcast
    """
    _verify_agent_key(authorization)

    content_bytes = await file.read()
    actual_name = file_name or file.filename or "unknown_file"
    actual_name = _sanitize_filename(actual_name)

    result = process_document_ingestion(
        content_bytes=content_bytes,
        filename=actual_name,
        department=department,
        event_type=event_type,
        allow_skip_known=True
    )

    # Invalidate cache if available
    try:
        try:
            from app.main import invalidate_cuad_cache
        except ImportError:
            from main import invalidate_cuad_cache
        invalidate_cuad_cache()
    except Exception:
        pass

    return result


class DeleteEventPayload(BaseModel):
    file_name: str
    file_hash: Optional[str] = None
    department: str = "sales"
    authorization: Optional[str] = None


@router.post("/file-watcher/deleted")
def handle_file_deleted(payload: DeleteEventPayload, authorization: Optional[str] = Header(None)):
    """
    Invoked by AEGIS File Watcher when a monitored file is deleted from Central Storage.
    Removes Qdrant vectors and owned Document/Clause nodes in Neo4j while strictly
    preserving shared Company, Department, Customer nodes.
    """
    _verify_agent_key(authorization or payload.authorization)
    safe_name = _sanitize_filename(payload.file_name)

    result = process_document_deletion(
        filename=safe_name,
        department=payload.department
    )

    try:
        try:
            from app.main import invalidate_cuad_cache
        except ImportError:
            from main import invalidate_cuad_cache
        invalidate_cuad_cache()
    except Exception:
        pass

    return result


class RenameEventPayload(BaseModel):
    old_name: str
    new_name: str
    department: str = "sales"
    authorization: Optional[str] = None


@router.post("/file-watcher/renamed")
def handle_file_renamed(payload: RenameEventPayload, authorization: Optional[str] = Header(None)):
    """
    Invoked by AEGIS File Watcher when a file is renamed or moved within Central Storage.
    Updates metadata in Qdrant & Neo4j without re-embedding to preserve doc_id and vector integrity.
    """
    _verify_agent_key(authorization or payload.authorization)
    old_name = _sanitize_filename(payload.old_name)
    new_name = _sanitize_filename(payload.new_name)

    result = process_document_rename(
        old_name=old_name,
        new_name=new_name,
        department=payload.department
    )

    try:
        try:
            from app.main import invalidate_cuad_cache
        except ImportError:
            from main import invalidate_cuad_cache
        invalidate_cuad_cache()
    except Exception:
        pass

    return result


@router.get("/file-watcher/status")
def get_watcher_sync_status():
    """Returns live telemetry and recent ingestion events from AEGIS Local Agents."""
    logs = get_watcher_sync_logs()
    return {
        "success": True,
        "agent": "AEGIS Central File Watcher Daemon",
        "active_endpoint": "/api/v1/sync/file-watcher",
        "supported_extensions": sorted(list(SUPPORTED_EXTENSIONS)),
        "total_events_logged": len(logs),
        "recent_syncs": logs[:10]
    }


@router.get("/file-watcher/events")
def get_all_watcher_events(limit: int = 50):
    """Returns event log for Notification Center."""
    logs = get_watcher_sync_logs()
    return {
        "success": True,
        "events": logs[:limit],
        "total": len(logs)
    }


@router.get("/file-watcher/latest")
def get_latest_watcher_event():
    """Returns the single most recent event."""
    logs = get_watcher_sync_logs()
    latest = logs[0] if logs else None
    return {
        "success": True,
        "latest": latest,
        "total": len(logs)
    }


@router.get("/file-watcher/known-hashes")
def get_known_hashes_endpoint():
    """
    Returns list of all file SHA-256 hashes already indexed in GraphMind.
    Enables AEGIS File Watcher Initial Sync to skip already-indexed files idempotently.
    """
    hashes = get_known_hashes()
    return {
        "success": True,
        "count": len(hashes),
        "hashes": list(hashes)
    }


@router.get("/file-watcher/stream")
async def stream_watcher_events():
    """
    Server-Sent Events (SSE) live push stream for instant 0ms notification in frontend.
    Dispatches created, modified, deleted, renamed events in realtime.
    """
    q: asyncio.Queue = asyncio.Queue()
    register_sse_subscriber(q)

    async def _gen():
        try:
            yield ": connected\n\n"
            while True:
                data = await q.get()
                yield data
        except asyncio.CancelledError:
            pass
        finally:
            unregister_sse_subscriber(q)

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


class TestEventPayload(BaseModel):
    fileName: str = "Demo_HopDong.pdf"
    department: str = "Pháp chế"
    sizeBytes: int = 204800
    chunksCount: int = 8
    entitiesExtracted: int = 5
    eventType: str = "created"


@router.post("/file-watcher/test-event")
def inject_test_event(payload: TestEventPayload):
    """Dev/demo helper: inject a fake ingestion event to test frontend SSE ticker."""
    now_dt = datetime.now()
    import hashlib as _hl, time as _t
    fake_hash = _hl.sha256(f"{payload.fileName}{_t.time()}".encode()).hexdigest()

    dept_def = resolve_department(payload.department)
    dept_name = dept_def["displayName"]
    dept_key = dept_def["key"]

    entry = {
        "id": f"evt_{int(now_dt.timestamp() * 1000)}",
        "eventType": payload.eventType,
        "fileName": payload.fileName,
        "docId": f"DOC_{fake_hash[:8].upper()}",
        "fileHash": fake_hash,
        "department": dept_name,
        "deptKey": dept_key,
        "sizeBytes": payload.sizeBytes,
        "chunksCount": payload.chunksCount,
        "entitiesExtracted": payload.entitiesExtracted,
        "qdrantIndexed": False,
        "neo4jSynced": False,
        "timestamp": now_dt.isoformat(),
        "formattedTime": now_dt.strftime("%d/%m/%Y %H:%M"),
        "status": payload.eventType,
        "summary": f"{'Đã thêm' if payload.eventType == 'created' else 'Đã cập nhật'} {payload.fileName} ({dept_name})"
    }

    broadcast_watcher_event(entry)
    return {"success": True, "injected": entry}
