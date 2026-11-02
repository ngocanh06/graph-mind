"""
Unified Core Ingestion Pipeline — GraphMind / AEGIS
Module: M1 Data Synchronization (backend/app/modules/m1_data_sync/pipeline.py)

Shared core processing pipeline for BOTH:
  1. Realtime File Watcher (CREATE / MODIFY / RENAME / DELETE)
  2. Initial Bulk Dataset Ingestion (scripts/bulk_ingest.py)
  3. Direct User Uploads via Web Dashboard

Handles:
  - Multi-format text extraction (.pdf, .docx, .xlsx, .csv)
  - SHA-256 Idempotency Guard (skips unchanged files)
  - Sliding-window text chunking
  - Qdrant Vector DB indexing with deterministic point IDs (zero duplication)
  - Neo4j Graph DB entity & relation extraction with MERGE idempotency
  - Realtime SSE event broadcasting
"""

import os
import sys
import io
import re
import json
import zlib
import zipfile
import hashlib
import logging
import asyncio
import uuid
import threading
from contextlib import contextmanager
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Tuple

try:
    from app.core.departments import resolve_department, get_department_display_name, get_department_key
    from app.db.neo4j.client import neo4j_client
    from app.db.qdrant.client import qdrant_client
except ImportError:
    from core.departments import resolve_department, get_department_display_name, get_department_key
    from db.neo4j.client import neo4j_client
    from db.qdrant.client import qdrant_client

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt"}

# ============================================================================
# PR1: CANONICAL NAMESPACE & ID GENERATION (LOGICAL & PHYSICAL POINT ID)
# ============================================================================
GRAPHMIND_CHUNK_NAMESPACE = uuid.UUID("a3b2c1d0-e9f8-4a7b-8c5d-4e3f2a1b0c9d")

class FencedOperationError(Exception):
    """Raised when an operation is fenced out or CAS validation fails."""
    pass

def generate_logical_chunk_id(doc_id: str, file_hash: str, chunk_index: int) -> str:
    """Stable logical chunk identity for UI citations and graph linking."""
    raw = f"logical:{doc_id}:{file_hash}:{chunk_index}"
    return str(uuid.uuid5(GRAPHMIND_CHUNK_NAMESPACE, raw))

def generate_physical_point_id(
    doc_id: str,
    file_hash: str,
    operation_id: str,
    fencing_generation: int,
    parser_config: str,
    chunker_config: str,
    embedding_config: str,
    chunk_index: int
) -> str:
    """
    Physical Point ID unique to operation and fencing generation.
    Guarantee: Points from different operations/generations are disjoint.
    """
    raw = f"phys:{doc_id}:{file_hash}:{operation_id}:{fencing_generation}:{parser_config}:{chunker_config}:{embedding_config}:{chunk_index}"
    return str(uuid.uuid5(GRAPHMIND_CHUNK_NAMESPACE, raw))

# ============================================================================
# PR1: TWO-TIER IN-MEMORY LOCK (PATH LOCK + DOCUMENT LOCK)
# ============================================================================
_PATH_LOCKS: Dict[str, Any] = getattr(sys, "_graphmind_path_locks", {})
_DOC_LOCKS: Dict[str, Any] = getattr(sys, "_graphmind_doc_locks", {})
_LOCKS_MUTEX = getattr(sys, "_graphmind_locks_mutex", threading.Lock())
sys._graphmind_path_locks = _PATH_LOCKS
sys._graphmind_doc_locks = _DOC_LOCKS
sys._graphmind_locks_mutex = _LOCKS_MUTEX

def _get_path_lock(path: str):
    with _LOCKS_MUTEX:
        if path not in _PATH_LOCKS:
            _PATH_LOCKS[path] = threading.RLock()
        return _PATH_LOCKS[path]

def _get_doc_lock(doc_id: str):
    with _LOCKS_MUTEX:
        if doc_id not in _DOC_LOCKS:
            _DOC_LOCKS[doc_id] = threading.RLock()
        return _DOC_LOCKS[doc_id]

@contextmanager
def acquire_ingestion_transaction_locks(storage_path: str, doc_id: str):
    """
    Acquire path lock then doc lock in deterministic order to prevent deadlock.
    Does not replace Neo4j database-level CAS.
    """
    p_lock = _get_path_lock(storage_path)
    d_lock = _get_doc_lock(doc_id)

    with p_lock:
        with d_lock:
            yield


@contextmanager
def acquire_rename_transaction_locks(old_path: str, new_path: str, doc_id: str):
    """
    Acquire old_path and new_path locks in lexicographical order, then doc_id lock.
    Guarantees deadlock-free concurrency across renames, uploads, ingestions, and deletions.
    """
    # Deduplicate and sort paths to ensure strict ordering and avoid double-locking when old_path == new_path
    sorted_paths = sorted(list(dict.fromkeys([p for p in [old_path, new_path] if p])))
    p_locks = [_get_path_lock(p) for p in sorted_paths]
    d_lock = _get_doc_lock(doc_id) if doc_id else None

    from contextlib import ExitStack
    with ExitStack() as stack:
        for pl in p_locks:
            stack.enter_context(pl)
        if d_lock:
            stack.enter_context(d_lock)
        yield


# ============================================================================
# PR1: RESTRICTED SAFE MODE REGISTRY (CENTRAL IDENTITY & MUTATION GUARD)
# ============================================================================

class RestrictedSafeModeRegistry:
    """
    Thread-safe in-memory registry tracking duplicate Document IDs and ambiguous paths.
    Enforces fail-closed identity verification across all mutation call sites.
    """
    _lock = getattr(sys, "_graphmind_safe_mode_lock", threading.Lock())
    _duplicate_doc_ids: Set[str] = getattr(sys, "_graphmind_dup_ids", set())
    _ambiguous_storage_paths: Set[str] = getattr(sys, "_graphmind_ambig_paths", set())
    sys._graphmind_safe_mode_lock = _lock
    sys._graphmind_dup_ids = _duplicate_doc_ids
    sys._graphmind_ambig_paths = _ambiguous_storage_paths

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            cls._duplicate_doc_ids.clear()
            cls._ambiguous_storage_paths.clear()

    @classmethod
    def register_duplicate_doc_id(cls, doc_id: str) -> None:
        if doc_id:
            with cls._lock:
                cls._duplicate_doc_ids.add(str(doc_id))

    @classmethod
    def register_ambiguous_path(cls, storage_path: str) -> None:
        if storage_path:
            with cls._lock:
                cls._ambiguous_storage_paths.add(str(storage_path))

    @classmethod
    def is_doc_id_blocked(cls, doc_id: Optional[str]) -> bool:
        if not doc_id:
            return False
        with cls._lock:
            return str(doc_id) in cls._duplicate_doc_ids

    @classmethod
    def is_restricted_id(cls, doc_id: Optional[str]) -> bool:
        return cls.is_doc_id_blocked(doc_id)

    @classmethod
    def is_path_blocked(cls, storage_path: Optional[str]) -> bool:
        if not storage_path:
            return False
        with cls._lock:
            return str(storage_path) in cls._ambiguous_storage_paths

    @classmethod
    def is_restricted_path(cls, storage_path: Optional[str]) -> bool:
        return cls.is_path_blocked(storage_path)

    @classmethod
    def set_duplicate_state(cls, dup_ids: Set[str], ambig_paths: Optional[Set[str]] = None) -> None:
        with cls._lock:
            cls._duplicate_doc_ids = {str(i) for i in dup_ids if i}
            cls._ambiguous_storage_paths = {str(p) for p in (ambig_paths or set()) if p}

    @classmethod
    def audit_identity_uniqueness(cls, client) -> Dict[str, Any]:
        """
        Audit Neo4j for duplicate doc_ids and ambiguous storagePaths.
        Fail-closed: preserves existing safe mode state on error.
        """
        if not client or (not client.is_connected and not client.connect()):
            return {
                "error": "Neo4j unreachable",
                "duplicate_ids": list(cls._duplicate_doc_ids),
                "ambiguous_paths": list(cls._ambiguous_storage_paths)
            }

        try:
            dups = client.run_cypher("""
                MATCH (d:Document)
                WHERE d.id IS NOT NULL
                WITH d.id AS doc_id, count(d) AS cnt
                WHERE cnt > 1
                RETURN doc_id, cnt
            """)
            dup_ids = {str(r["doc_id"]) for r in (dups or []) if r.get("doc_id")}

            ambig_paths_res = client.run_cypher("""
                MATCH (d:Document)
                WHERE d.storagePath IS NOT NULL AND trim(d.storagePath) <> ''
                WITH d.storagePath AS sp, count(d) AS cnt
                WHERE cnt > 1
                RETURN sp, cnt
            """)
            ambig_paths = {str(r["sp"]) for r in (ambig_paths_res or []) if r.get("sp")}

            if dup_ids or ambig_paths:
                cls.set_duplicate_state(dup_ids, ambig_paths)
                logger.critical(
                    f"[SafeMigration] CRITICAL: Found duplicate IDs ({len(dup_ids)}) / ambiguous paths ({len(ambig_paths)}). "
                    f"Entering Restricted Safe Mode."
                )
            else:
                cls.set_duplicate_state(set(), set())

            return {"error": None, "duplicate_ids": list(dup_ids), "ambiguous_paths": list(ambig_paths)}
        except Exception as e:
            logger.warning(f"[SafeMigration] Duplicate audit error (preserving existing Safe Mode): {e}")
            return {
                "error": str(e),
                "duplicate_ids": list(cls._duplicate_doc_ids),
                "ambiguous_paths": list(cls._ambiguous_storage_paths)
            }

    @classmethod
    def verify_unique_target(
        cls,
        neo4j_client,
        storage_path: Optional[str] = None,
        filename: Optional[str] = None,
        dept_key: Optional[str] = None,
        doc_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Verify target document uniqueness using strict identity hierarchy:
        1. Exact doc_id (if supplied).
        2. Exact canonical storagePath.
        3. Scoped name + deptKey fallback (never unconstrained name).
        Prevents false ambiguity for documents sharing names across different departments.
        """
        if doc_id and cls.is_doc_id_blocked(doc_id):
            return False, "restricted_safe_mode_blocked", None

        if storage_path and cls.is_path_blocked(storage_path):
            return False, "restricted_safe_mode_blocked", None

        if not neo4j_client or (not neo4j_client.is_connected and not neo4j_client.connect()):
            return False, "Neo4j database unreachable for identity verification.", None

        try:
            # 1. Exact doc_id lookup
            if doc_id:
                res_id = neo4j_client.run_cypher("""
                    OPTIONAL MATCH (d:Document)
                    WHERE d.id = $doc_id
                    RETURN elementId(d) as elem_id, d.id as doc_id, d.name as name, d.storagePath as storagePath,
                           d.fencing_generation as gen, d.active_op_id as op_id, d.op_stage as stage,
                           d.hash as hash, d.file_hash as file_hash, d.active_point_ids as points, d.status as status
                """, {"doc_id": doc_id})
                valid_nodes = [r for r in (res_id or []) if r.get("elem_id") is not None]
                cnt = len(valid_nodes)
                if cnt > 1:
                    cls.register_duplicate_doc_id(str(doc_id))
                    return False, f"Duplicate Document ID detected: {cnt} nodes share id '{doc_id}'.", None
                if cnt == 1:
                    matched = valid_nodes[0]
                    stored_path = matched.get("storagePath")
                    if storage_path and stored_path and stored_path != storage_path:
                        return False, f"Identity conflict: doc_id '{doc_id}' belongs to path '{stored_path}', not '{storage_path}'.", None
                    return True, None, matched

            # 2. Exact canonical storagePath lookup
            if storage_path:
                res_path = neo4j_client.run_cypher("""
                    OPTIONAL MATCH (d:Document)
                    WHERE d.storagePath = $storage_path
                    RETURN elementId(d) as elem_id, d.id as doc_id, d.name as name, d.storagePath as storagePath,
                           d.fencing_generation as gen, d.active_op_id as op_id, d.op_stage as stage,
                           d.hash as hash, d.file_hash as file_hash, d.active_point_ids as points, d.status as status
                """, {"storage_path": storage_path})
                valid_nodes = [r for r in (res_path or []) if r.get("elem_id") is not None]
                cnt = len(valid_nodes)
                if cnt > 1:
                    cls.register_ambiguous_path(str(storage_path))
                    return False, f"Ambiguous storagePath: {cnt} nodes share '{storage_path}'.", None
                if cnt == 1:
                    matched = valid_nodes[0]
                    return True, None, matched

            # 3. Fallback scoped name + deptKey ONLY when node has NO storagePath
            if filename and dept_key:
                res_name = neo4j_client.run_cypher("""
                    OPTIONAL MATCH (d:Document)
                    WHERE d.name = $name
                      AND (d.deptKey = $dept_key OR d.department = $dept_key)
                      AND (d.storagePath IS NULL OR trim(d.storagePath) = '')
                    RETURN elementId(d) as elem_id, d.id as doc_id, d.name as name, d.storagePath as storagePath,
                           d.fencing_generation as gen, d.active_op_id as op_id, d.op_stage as stage,
                           d.hash as hash, d.file_hash as file_hash, d.active_point_ids as points, d.status as status
                """, {"name": filename, "dept_key": dept_key})
                valid_nodes = [r for r in (res_name or []) if r.get("elem_id") is not None]
                cnt = len(valid_nodes)
                if cnt > 1:
                    return False, f"Ambiguous document identity: {cnt} nodes match name '{filename}' in dept '{dept_key}'.", None
                if cnt == 1:
                    matched = valid_nodes[0]
                    return True, None, matched

            return True, None, None
        except Exception as e:
            return False, f"Neo4j query error during identity check: {e}", None

# SSE Subscribers
_SSE_SUBSCRIBERS: List[asyncio.Queue] = []


def register_sse_subscriber(queue: asyncio.Queue) -> None:
    _SSE_SUBSCRIBERS.append(queue)


def unregister_sse_subscriber(queue: asyncio.Queue) -> None:
    try:
        _SSE_SUBSCRIBERS.remove(queue)
    except ValueError:
        pass


def broadcast_watcher_event(event_dict: Dict[str, Any]) -> None:
    """Safely broadcast event to all active SSE subscribers."""
    payload = f"data: {json.dumps(event_dict, ensure_ascii=False)}\n\n"
    dead = []
    for q in list(_SSE_SUBSCRIBERS):
        try:
            q.put_nowait(payload)
        except Exception:
            dead.append(q)
    for d in dead:
        try:
            _SSE_SUBSCRIBERS.remove(d)
        except ValueError:
            pass


# JSON persistence files
_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(_DATA_DIR, exist_ok=True)
_LOGS_FILE = os.path.join(_DATA_DIR, "watcher_sync_logs.json")
_DOCS_FILE = os.path.join(_DATA_DIR, "watcher_ingested_docs.json")


import threading
_JSON_LOCK = threading.Lock()


def _load_json(path: str) -> list:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[Pipeline] Could not load {path}: {e}")
        return []


def _save_json(path: str, data: list) -> None:
    with _JSON_LOCK:
        try:
            temp_path = f"{path}.tmp"
            with open(temp_path, "w", encoding="utf-8", errors="replace") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            try:
                os.replace(temp_path, path)
            except OSError:
                with open(path, "w", encoding="utf-8", errors="replace") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"[Pipeline] Failed to persist {path}: {e}")


_WATCHER_SYNC_LOGS: List[Dict[str, Any]] = _load_json(_LOGS_FILE)
_WATCHER_INGESTED_DOCS: List[Dict[str, Any]] = _load_json(_DOCS_FILE)


def get_watcher_ingested_docs() -> List[Dict[str, Any]]:
    return _WATCHER_INGESTED_DOCS


def get_watcher_sync_logs() -> List[Dict[str, Any]]:
    return _WATCHER_SYNC_LOGS


def get_verified_indexed_hashes() -> Set[str]:
    """
    Source of Truth: Checks real Neo4j and Qdrant databases.
    Returns set of SHA-256 hashes of documents that are truly indexed in DB.
    """
    neo_hashes = set()
    try:
        if neo4j_client.is_connected or neo4j_client.connect():
            res = neo4j_client.run_cypher("MATCH (d:Document) WHERE d.hash IS NOT NULL RETURN d.hash as hash")
            neo_hashes = {r["hash"] for r in res if r.get("hash")}
    except Exception as e:
        logger.debug(f"[Pipeline] Neo4j hash verification error: {e}")

    qdrant_hashes = set()
    try:
        if qdrant_client.is_connected or qdrant_client.connect():
            pts, _ = qdrant_client._client.scroll(
                collection_name=qdrant_client._collection,
                limit=10000,
                with_payload=["file_hash"],
                with_vectors=False
            )
            for p in pts:
                fh = p.payload.get("file_hash") if p.payload else None
                if fh:
                    qdrant_hashes.add(fh)
    except Exception as e:
        logger.debug(f"[Pipeline] Qdrant hash verification error: {e}")

    # A document is verified indexed ONLY if it exists in both Neo4j and Qdrant
    if neo_hashes and qdrant_hashes:
        return neo_hashes.intersection(qdrant_hashes)
    return set()


def get_known_hashes() -> Set[str]:
    """Returns set of all verified SHA-256 hashes currently indexed in DB."""
    return get_verified_indexed_hashes() | {d["hash"] for d in _WATCHER_INGESTED_DOCS if d.get("hash")}


# ============================================================================
# MULTI-FORMAT TEXT EXTRACTION (PDF, DOCX, XLSX, CSV)
# ============================================================================

def extract_text_from_bytes(filename: str, content_bytes: bytes) -> str:
    """Extract readable text from supported document formats."""
    ext = os.path.splitext(filename)[1].lower()

    # 1. Plain text / CSV / JSON / TXT
    if ext in [".txt", ".csv", ".json", ".md", ".log"]:
        if len(content_bytes) > 10 * 1024 * 1024:
            raise ValueError(f"Tệp văn bản '{filename}' vượt quá giới hạn 10 MB ({len(content_bytes)} bytes).")
        for enc in ["utf-8-sig", "utf-8", "cp1252", "latin-1"]:
            try:
                decoded = content_bytes.decode(enc)
                cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\ufeff]", "", decoded)
                return cleaned
            except UnicodeDecodeError:
                continue
        return content_bytes.decode("utf-8", errors="replace")

    # 2. PDF extraction (pypdfium2 fast C++ engine, pdfplumber fallback)
    if ext == ".pdf":
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(content_bytes)
            pages_text = [page.get_textpage().get_text_range().strip() for page in pdf]
            text = "\n\n".join(t for t in pages_text if t)
            if text:
                return text
        except Exception as e:
            logger.debug(f"[Pipeline] pypdfium2 parser note: {e}")

        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
                pages_text = [p.extract_text().strip() for p in pdf.pages if p.extract_text() and p.extract_text().strip()]
                if pages_text:
                    return "\n\n".join(pages_text)
        except Exception as e:
            logger.debug(f"[Pipeline] pdfplumber parser note: {e}")

        # Stream regex fallback for compressed/scanned PDFs
        try:
            text_chunks = []
            streams = re.findall(rb"stream[\r\n]+(.*?)[\r\n]+endstream", content_bytes, re.DOTALL)
            for s in streams:
                try:
                    decompressed = zlib.decompress(s)
                    clean = re.sub(rb"[^\x20-\x7E\n\r]", b" ", decompressed).decode("ascii", errors="ignore")
                    if len(clean.strip()) > 20:
                        text_chunks.append(clean.strip())
                except Exception:
                    clean = re.sub(rb"[^\x20-\x7E\n\r]", b" ", s).decode("ascii", errors="ignore")
                    if len(clean.strip()) > 20:
                        text_chunks.append(clean.strip())
            if text_chunks:
                return "\n\n".join(text_chunks)
        except Exception as e:
            logger.warning(f"[Pipeline] PDF raw stream extraction error: {e}")
        return f"[PDF Document: {filename} (Binary stream parsed, size: {len(content_bytes)} bytes)]"

    # 3. DOCX extraction (zero extra dependencies, stdlib zipfile + XML)
    if ext == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                if "word/document.xml" in z.namelist():
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    paragraphs = []
                    for node in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                        texts = [t.text for t in node.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if t.text]
                        if texts:
                            paragraphs.append("".join(texts))
                    if paragraphs:
                        return "\n\n".join(paragraphs)
        except Exception as e:
            logger.warning(f"[Pipeline] DOCX extraction error: {e}")

    # 4. XLSX extraction (openpyxl with sheet isolation and tabular structure)
    if ext == ".xlsx":
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            sheet_blocks = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                sheet_lines = [f"=== SHEET: {sheet_name} ==="]
                for r in range(1, ws.max_row + 1):
                    row_vals = []
                    for c in range(1, ws.max_column + 1):
                        cell_val = ws.cell(r, c).value
                        if cell_val is None:
                            row_vals.append("")
                        elif isinstance(cell_val, float):
                            if cell_val.is_integer():
                                row_vals.append(str(int(cell_val)))
                            else:
                                row_vals.append(f"{cell_val:.4f}".rstrip("0").rstrip("."))
                        else:
                            row_vals.append(str(cell_val).strip())
                    while row_vals and not row_vals[-1]:
                        row_vals.pop()
                    if row_vals and any(row_vals):
                        sheet_lines.append(" | ".join(row_vals))
                if len(sheet_lines) > 1:
                    sheet_blocks.append("\n".join(sheet_lines))
            if sheet_blocks:
                return "\n\n".join(sheet_blocks)
        except Exception as e:
            logger.warning(f"[Pipeline] openpyxl XLSX extraction error: {e}")
            try:
                with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                    strings = []
                    if "xl/sharedStrings.xml" in z.namelist():
                        tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                        for t in tree.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"):
                            if t.text:
                                strings.append(t.text.strip())
                    if strings:
                        return "\n\n".join(strings)
            except Exception as z_err:
                logger.warning(f"[Pipeline] zipfile XLSX fallback error: {z_err}")

    try:
        return content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return f"[Document: {filename}, size: {len(content_bytes)} bytes]"


def chunk_text(text: str, max_chars: int = 500) -> List[str]:
    """Split text into overlapping logical paragraph chunks with sheet boundary preservation."""
    if "=== SHEET: " in text:
        sheet_sections = re.split(r"(?==== SHEET: )", text)
        all_chunks = []
        target_chunk_size = max(max_chars, 800)
        for sec in sheet_sections:
            sec = sec.strip()
            if not sec:
                continue
            first_line = sec.split("\n", 1)[0]
            sheet_m = re.search(r"=== SHEET: (.*?) ===", first_line)
            sheet_tag = f"[Sheet: {sheet_m.group(1)}]" if sheet_m else ""

            lines = [l for l in sec.split("\n") if l.strip()]
            cur_lines = []
            cur_len = 0
            for line in lines:
                if cur_len + len(line) > target_chunk_size and cur_lines:
                    chunk_str = "\n".join(cur_lines)
                    if sheet_tag and not chunk_str.startswith("=== SHEET:"):
                        chunk_str = f"{sheet_tag}\n{chunk_str}"
                    all_chunks.append(chunk_str)
                    cur_lines = [line]
                    cur_len = len(line)
                else:
                    cur_lines.append(line)
                    cur_len += len(line)
            if cur_lines:
                chunk_str = "\n".join(cur_lines)
                if sheet_tag and not chunk_str.startswith("=== SHEET:"):
                    chunk_str = f"{sheet_tag}\n{chunk_str}"
                all_chunks.append(chunk_str)
        return all_chunks or [text[:max_chars]]

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = []
    current_len = 0

    for p in paragraphs:
        if current_len + len(p) > max_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [p]
            current_len = len(p)
        else:
            current_chunk.append(p)
            current_len += len(p)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks or [text[:max_chars]] if text else ["Empty document"]


def extract_graph_entities(text: str, filename: str) -> Dict[str, Any]:
    """Extract business & legal entities from text for Neo4j Graph ingestion."""
    companies = []
    company_patterns = [
        r"(?:Công ty|Tập đoàn|Doanh nghiệp|TNHH|Cổ phần|CP)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s\.\-]{3,40})",
        r"(?:Company|Corporation|Corp|Ltd|LLC|Inc)\.?\s+([A-Za-z0-9\s\.\-]{3,40})"
    ]
    for pat in company_patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            cleaned = m.strip().rstrip(".,;")
            if len(cleaned) > 2 and cleaned not in companies:
                companies.append(cleaned[:45])

    clauses = []
    if re.search(r"(bảo mật|confidential|non-disclosure)", text, re.IGNORECASE):
        clauses.append({"type": "Bảo mật thông tin (Confidentiality)", "title": "Điều khoản Bảo mật"})
    if re.search(r"(thanh toán|payment|hóa đơn|giá trị)", text, re.IGNORECASE):
        clauses.append({"type": "Điều khoản Thanh toán (Payment Terms)", "title": "Phương thức Thanh toán"})
    if re.search(r"(phạt vi phạm|bồi thường|indemnif|penalty|liability)", text, re.IGNORECASE):
        clauses.append({"type": "Trách nhiệm & Bồi thường (Liability)", "title": "Bồi thường & Phạt vi phạm"})
    if re.search(r"(chấm dứt|hết hiệu lực|termination|expir)", text, re.IGNORECASE):
        clauses.append({"type": "Chấm dứt hợp đồng (Termination)", "title": "Điều kiện chấm dứt"})

    values = re.findall(r"(\d{1,3}(?:[\.,]\d{3})*(?:\s*(?:VND|VNĐ|triệu|tỷ|USD|\$|₫)))", text, re.IGNORECASE)
    primary_value = values[0] if values else None

    return {
        "companies": companies[:3],
        "clauses": clauses[:4],
        "value": primary_value
    }


# ============================================================================
# UNIFIED INGESTION ENGINE (CREATE / MODIFY) — PR1 COPY-ON-WRITE & CAS
# ============================================================================

def process_document_ingestion(
    content_bytes: bytes,
    filename: str,
    department: str = "sales",
    event_type: str = "created",
    old_name: Optional[str] = None,
    allow_skip_known: bool = True
) -> Dict[str, Any]:
    """
    PR1 Unified Ingestion Pipeline:
    1. Computes SHA-256 hash.
    2. Enforces Two-Tier Locking (storage path + document ID).
    3. Enforces Idempotency Guard (skip if unchanged).
    4. Extracts text, chunks, and graph entities.
    5. Durable Journal First: commits Neo4j STAGING journal BEFORE Qdrant writes.
    6. Stages vector points in Qdrant with disjoint physical IDs and is_active=False.
    7. CAS updates journal to STAGED.
    8. Indexes Graph Entities and Clauses in Neo4j with CAS.
    9. Pre-activation check (PREPARING_ACTIVATION) via CAS.
    10. Activates new points (is_active=True) and deactivates old points.
    11. Commits serving version (status='SYNCED', op_stage='PURGING_OLD') via CAS.
    12. Scoped purge of old points by exact IDs.
    13. Terminal completion (op_stage='TERMINAL_SYNCED') via CAS.
    """
    global _WATCHER_INGESTED_DOCS, _WATCHER_SYNC_LOGS
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return {
            "success": False,
            "status": "unsupported",
            "error": f"Định dạng tệp '{ext}' không được hỗ trợ. Chỉ hỗ trợ: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        }

    computed_hash = hashlib.sha256(content_bytes).hexdigest()
    final_hash = computed_hash
    doc_id = f"DOC_{final_hash[:8].upper()}"

    dept_def = resolve_department(department or filename)
    dept_name = dept_def["displayName"]
    dept_key = dept_def["key"]
    storage_path = f"/data/{dept_key}/{filename}"

    timestamp_str = datetime.now().isoformat()
    clean_date_str = datetime.now().strftime("%d/%m/%Y")
    display_time_str = datetime.now().strftime("%H:%M")

    # Enforce Two-Tier In-Memory Lock (Path Lock + Doc Lock)
    with acquire_ingestion_transaction_locks(storage_path, doc_id):
        # Idempotency Check: Source of Truth is Real Databases (Neo4j & Qdrant)
        if allow_skip_known and event_type == "created":
            verified_hashes = get_verified_indexed_hashes()
            if final_hash in verified_hashes:
                doc_in_neo = False
                try:
                    if neo4j_client.is_connected or neo4j_client.connect():
                        check = neo4j_client.run_cypher(
                            "MATCH (d:Document) WHERE (d.name = $name OR d.storagePath = $path) AND d.status = 'SYNCED' RETURN d.id as id LIMIT 1",
                            {"name": filename, "path": storage_path}
                        )
                        if check:
                            doc_in_neo = True
                except Exception:
                    pass

                if doc_in_neo:
                    existing_doc = next((d for d in _WATCHER_INGESTED_DOCS if d.get("hash") == final_hash and d.get("name") == filename), None)
                    return {
                        "success": True,
                        "status": "skipped",
                        "message": f"Tài liệu '{filename}' đã tồn tại và đã được lập chỉ mục đầy đủ trong Neo4j và Qdrant.",
                        "doc_id": existing_doc.get("id", doc_id) if existing_doc else doc_id,
                        "hash": final_hash
                    }

        # Extract text, chunks, and entities
        full_text = extract_text_from_bytes(filename, content_bytes)
        chunks = chunk_text(full_text)
        entities = extract_graph_entities(full_text, filename)
        expected_chunk_count = len(chunks)

        parser_config = "v1.0"
        chunker_config = "overlap_500_v1.0"
        embedding_config = "all-MiniLM-L6-v2_384_v1.0"
        operation_id = f"op_{uuid.uuid4().hex[:12]}"

        elem_id = None
        fencing_gen = 1
        old_point_ids = []

        # ---------------------------------------------------------------------
        # STEP 1: DURABLE JOURNAL FIRST (Neo4j STAGING Commit BEFORE Qdrant writes)
        # ---------------------------------------------------------------------
        target_domain = "legal" if (dept_key == "legal" or ext == ".pdf") else ("adventureworks" if (dept_key in ["sales", "rnd", "accounting_procurement"] and ext == ".csv") else "unknown")

        allowed, reason, doc_record = RestrictedSafeModeRegistry.verify_unique_target(
            neo4j_client=neo4j_client,
            storage_path=storage_path,
            filename=filename,
            dept_key=dept_key,
            doc_id=doc_id
        )
        if not allowed:
            raise FencedOperationError(f"restricted_safe_mode_blocked: {reason}")

        try:
            if neo4j_client.is_connected or neo4j_client.connect():
                if doc_record and doc_record.get("elem_id"):
                    elem_id = doc_record["elem_id"]
                    curr_gen = doc_record["gen"] if doc_record.get("gen") is not None else 0
                    fencing_gen = curr_gen + 1
                    old_point_ids = doc_record.get("points") or doc_record.get("old_point_ids") or []
                    if doc_record.get("id") or doc_record.get("existing_id") or doc_record.get("doc_id"):
                        doc_id = doc_record.get("id") or doc_record.get("existing_id") or doc_record.get("doc_id")

                    cas_init = neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE elementId(d) = $elem_id
                          AND ($curr_gen IS NULL OR d.fencing_generation = $curr_gen OR d.fencing_generation IS NULL)
                          AND (d.active_op_id IS NULL OR d.op_stage IN ['TERMINAL_SYNCED', 'TERMINAL_FAILED', 'STAGING', 'PREPARING_ACTIVATION'])
                        SET d.name = $name,
                            d.hash = $hash,
                            d.file_hash = $hash,
                            d.department = $dept,
                            d.deptKey = $dept_key,
                            d.domain = $domain,
                            d.active_op_id = $op_id,
                            d.fencing_generation = $next_gen,
                            d.op_stage = 'STAGING',
                            d.status = 'STAGING',
                            d.parser_config = $parser_cfg,
                            d.chunker_config = $chunker_cfg,
                            d.embedding_config = $embed_cfg,
                            d.expected_chunk_count = $expected_chunk_count,
                            d.last_journal_at = $timestamp,
                            d.lastModified = $timestamp
                        RETURN elementId(d) as elem_id, d.fencing_generation as gen
                    """, {
                        "elem_id": elem_id,
                        "curr_gen": curr_gen,
                        "next_gen": fencing_gen,
                        "op_id": operation_id,
                        "name": filename,
                        "hash": final_hash,
                        "dept": dept_name,
                        "dept_key": dept_key,
                        "domain": target_domain,
                        "parser_cfg": parser_config,
                        "chunker_cfg": chunker_config,
                        "embed_cfg": embedding_config,
                        "expected_chunk_count": expected_chunk_count,
                        "timestamp": timestamp_str
                    })
                    if not cas_init:
                        raise FencedOperationError(f"CAS failure: Document '{filename}' concurrently modified or fenced out.")
                else:
                    fencing_gen = 1
                    create_init = neo4j_client.run_cypher("""
                        CREATE (d:Document {
                            id: $doc_id,
                            name: $name,
                            storagePath: $storage_path,
                            hash: $hash,
                            file_hash: $hash,
                            department: $dept,
                            deptKey: $dept_key,
                            domain: $domain,
                            active_op_id: $op_id,
                            fencing_generation: $fencing_gen,
                            op_stage: 'STAGING',
                            status: 'STAGING',
                            parser_config: $parser_cfg,
                            chunker_config: $chunker_cfg,
                            embedding_config: $embed_cfg,
                            expected_chunk_count: $expected_chunk_count,
                            last_journal_at: $timestamp,
                            ingestedAt: $timestamp,
                            lastModified: $timestamp
                        })
                        RETURN elementId(d) as elem_id, d.fencing_generation as gen
                    """, {
                        "doc_id": doc_id,
                        "name": filename,
                        "storage_path": storage_path,
                        "hash": final_hash,
                        "dept": dept_name,
                        "dept_key": dept_key,
                        "domain": target_domain,
                        "op_id": operation_id,
                        "fencing_gen": fencing_gen,
                        "parser_cfg": parser_config,
                        "chunker_cfg": chunker_config,
                        "embed_cfg": embedding_config,
                        "expected_chunk_count": expected_chunk_count,
                        "timestamp": timestamp_str
                    })
                    if not create_init:
                        raise FencedOperationError(f"Failed to create initial Document staging journal for '{filename}'.")
                    elem_id = create_init[0]["elem_id"]
        except FencedOperationError:
            raise
        except Exception as j_err:
            logger.warning(f"[Pipeline] Neo4j staging journal error: {j_err}")
            # If Journal commit fails, MUST NOT write vectors to Qdrant!
            return {
                "success": False,
                "status": "failed",
                "error": f"Durable Journal First failed: {j_err}"
            }

        # ---------------------------------------------------------------------
        # STEP 2: STAGE POINTS IN QDRANT (Disjoint Physical Point IDs & is_active=False)
        # ---------------------------------------------------------------------
        qdrant_indexed = False
        new_point_ids = []
        try:
            if qdrant_client.is_connected or qdrant_client.connect():
                from qdrant_client.http import models
                from app.db.qdrant.client import get_embed_model
                _embed = get_embed_model()
                pts = []
                chunk_texts = [ch[:1000] for ch in chunks]
                if _embed and chunk_texts:
                    try:
                        vectors = _embed.encode(chunk_texts)
                        vectors_list = [v.tolist() if hasattr(v, "tolist") else list(v) for v in vectors]
                    except Exception:
                        try:
                            vectors_list = [v.tolist() if hasattr(v, "tolist") else list(v) for v in [_embed.encode(t) for t in chunk_texts]]
                        except Exception:
                            vectors_list = [[0.01 * ((i + idx) % 50) for i in range(384)] for idx in range(len(chunks))]
                else:
                    vectors_list = [[0.01 * ((i + idx) % 50) for i in range(384)] for idx in range(len(chunks))]

                for idx, ch in enumerate(chunks):
                    phys_id = generate_physical_point_id(
                        doc_id=doc_id,
                        file_hash=final_hash,
                        operation_id=operation_id,
                        fencing_generation=fencing_gen,
                        parser_config=parser_config,
                        chunker_config=chunker_config,
                        embedding_config=embedding_config,
                        chunk_index=idx
                    )
                    logical_id = generate_logical_chunk_id(doc_id, final_hash, idx)
                    vec = vectors_list[idx]
                    pts.append(models.PointStruct(
                        id=phys_id,
                        vector=vec,
                        payload={
                            "contract_name": filename,
                            "source_file": filename,
                            "doc_id": doc_id,
                            "document_id": doc_id,
                            "chunk_id": idx,
                            "chunk_index": idx,
                            "logical_chunk_id": logical_id,
                            "operation_id": operation_id,
                            "fencing_generation": fencing_gen,
                            "file_hash": final_hash,
                            "is_active": False,  # STAGED AS INACTIVE
                            "text": ch,
                            "department": dept_name,
                            "department_key": dept_key,
                            "source": "aegis_local_file_watcher",
                            "ingested_at": timestamp_str
                        }
                    ))
                if pts:
                    new_point_ids = [p.id for p in pts]
                    for b_start in range(0, len(pts), 100):
                        qdrant_client._client.upsert(
                            collection_name=qdrant_client._collection,
                            points=pts[b_start:b_start + 100]
                        )
                    qdrant_indexed = True
        except Exception as q_err:
            logger.warning(f"[Pipeline] Qdrant staging error: {q_err}")
            # Rollback Neo4j journal via CAS on Qdrant staging failure
            if elem_id:
                try:
                    neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                        SET d.op_stage = 'TERMINAL_FAILED',
                            d.status = CASE WHEN d.status = 'SYNCED' THEN 'SYNCED' ELSE 'FAILED' END,
                            d.active_op_id = NULL,
                            d.last_journal_at = $timestamp
                    """, {"elem_id": elem_id, "gen": fencing_gen, "op_id": operation_id, "timestamp": timestamp_str})
                except Exception:
                    pass
            return {"success": False, "status": "failed", "error": f"Qdrant staging error: {q_err}"}

        # ---------------------------------------------------------------------
        # STEP 3: CAS UPDATE NEO4J JOURNAL (STAGED)
        # ---------------------------------------------------------------------
        try:
            if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
                cas_staged = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.op_stage = 'STAGED', d.last_journal_at = $timestamp
                    RETURN elementId(d) as elem_id
                """, {"elem_id": elem_id, "gen": fencing_gen, "op_id": operation_id, "timestamp": timestamp_str})
                if not cas_staged:
                    # Clean up staged Qdrant points and abort
                    try:
                        from qdrant_client.http import models
                        qdrant_client._client.delete(
                            collection_name=qdrant_client._collection,
                            points_selector=models.PointIdsList(points=new_point_ids)
                        )
                    except Exception:
                        pass
                    raise FencedOperationError(f"CAS failure at STAGED transition for '{filename}'.")
        except FencedOperationError:
            raise
        except Exception as e:
            logger.warning(f"[Pipeline] CAS STAGED update error: {e}")

        # ---------------------------------------------------------------------
        # STEP 4: INDEX GRAPH ENTITIES & CLAUSES (Preserve Domain & Relationships)
        # ---------------------------------------------------------------------
        neo4j_synced = False
        try:
            if neo4j_client.is_connected or neo4j_client.connect():
                cypher = """
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.contractValue = $contract_val,
                        d.chunksCount = $chunks_count,
                        d.op_stage = 'GRAPH_INDEXED',
                        d.last_journal_at = $timestamp
                    WITH d
                    OPTIONAL MATCH (d)-[r:CONTAINS_CLAUSE]->(oldCl:Clause)
                    DELETE r, oldCl
                    WITH d
                    MERGE (dept:Department {name: $dept})
                    MERGE (d)-[:BELONGS_TO_DEPT]->(dept)
                    RETURN elementId(d) as elem_id
                """
                params = {
                    "elem_id": elem_id,
                    "gen": fencing_gen,
                    "op_id": operation_id,
                    "dept": dept_name,
                    "contract_val": entities.get("value") or "Chưa xác định",
                    "chunks_count": len(chunks),
                    "timestamp": timestamp_str
                }
                cas_graph = neo4j_client.run_cypher(cypher, params)
                if not cas_graph:
                    raise FencedOperationError(f"CAS failure during GRAPH_INDEXED for '{filename}'.")

                for comp in entities.get("companies", []):
                    neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE elementId(d) = $elem_id
                        MERGE (c:Company {name: $company})
                        SET c.domain = coalesce(c.domain, $domain)
                        MERGE (c)-[pr:PARTY_TO]->(d)
                        SET pr.source_document_id = $doc_id,
                            pr.source_file = $name,
                            pr.domain = $domain,
                            pr.provenance = 'unverified_historical_regex'
                    """, {"elem_id": elem_id, "name": filename, "company": comp, "doc_id": doc_id, "domain": target_domain})

                for idx, cl in enumerate(entities.get("clauses", [])):
                    snippet_text = chunks[0][:300] if chunks else ""
                    neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE elementId(d) = $elem_id
                        MERGE (cl:Clause {id: $cl_id})
                        SET cl.type = $cl_type,
                            cl.title = $cl_title,
                            cl.snippet = $cl_snippet,
                            cl.source_document_id = $doc_id,
                            cl.source_file = $name,
                            cl.evidence_text = $cl_snippet,
                            cl.domain = $domain
                        MERGE (d)-[r:CONTAINS_CLAUSE]->(cl)
                        SET r.source_document_id = $doc_id,
                            r.source_file = $name,
                            r.evidence_text = $cl_snippet,
                            r.domain = $domain
                    """, {
                        "elem_id": elem_id,
                        "name": filename,
                        "doc_id": doc_id,
                        "cl_id": f"{doc_id}_CL_{idx+1}",
                        "cl_type": cl["type"],
                        "cl_title": cl["title"],
                        "cl_snippet": snippet_text,
                        "domain": target_domain
                    })
                neo4j_synced = True
        except FencedOperationError:
            raise
        except Exception as e:
            logger.warning(f"[Pipeline] Neo4j graph indexing error: {e}")

        # ---------------------------------------------------------------------
        # STEP 5: PRE-ACTIVATION CHECK (PREPARING_ACTIVATION via CAS)
        # ---------------------------------------------------------------------
        try:
            if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
                cas_pre = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.op_stage = 'PREPARING_ACTIVATION', d.last_journal_at = $timestamp
                    RETURN elementId(d) as elem_id
                """, {"elem_id": elem_id, "gen": fencing_gen, "op_id": operation_id, "timestamp": timestamp_str})
                if not cas_pre:
                    raise FencedOperationError(f"CAS failure at PREPARING_ACTIVATION for '{filename}'.")
        except FencedOperationError:
            raise
        except Exception as e:
            logger.warning(f"[Pipeline] Pre-activation CAS check error: {e}")

        # ---------------------------------------------------------------------
        # STEP 6: ACTIVATE NEW POINTS & DEACTIVATE OLD POINTS IN QDRANT
        # ---------------------------------------------------------------------
        try:
            if qdrant_client.is_connected or qdrant_client.connect():
                # 6a. Deactivate old points
                if old_point_ids:
                    try:
                        qdrant_client._client.set_payload(
                            collection_name=qdrant_client._collection,
                            payload={"is_active": False},
                            points=old_point_ids
                        )
                    except Exception as deact_err:
                        logger.debug(f"[Pipeline] Deactivate old points note: {deact_err}")

                # 6b. Activate new points
                if new_point_ids:
                    qdrant_client._client.set_payload(
                        collection_name=qdrant_client._collection,
                        payload={"is_active": True},
                        points=new_point_ids
                    )
        except Exception as act_err:
            logger.warning(f"[Pipeline] Qdrant activation error: {act_err}")

        # ---------------------------------------------------------------------
        # STEP 7: COMMIT SERVING VERSION (status='SYNCED', op_stage='PURGING_OLD')
        # ---------------------------------------------------------------------
        try:
            if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
                cas_commit = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.status = 'SYNCED',
                        d.committed_op_id = $op_id,
                        d.committed_generation = $gen,
                        d.active_point_ids = $new_point_ids,
                        d.qdrantIndexed = true,
                        d.neo4jSynced = true,
                        d.op_stage = 'PURGING_OLD',
                        d.last_journal_at = $timestamp,
                        d.lastModified = $timestamp
                    RETURN elementId(d) as elem_id
                """, {
                    "elem_id": elem_id,
                    "gen": fencing_gen,
                    "op_id": operation_id,
                    "new_point_ids": new_point_ids,
                    "timestamp": timestamp_str
                })
                if not cas_commit:
                    raise FencedOperationError(f"CAS failure at serving version commit for '{filename}'.")
        except FencedOperationError:
            raise
        except Exception as e:
            logger.warning(f"[Pipeline] Commit serving version error: {e}")

        # ---------------------------------------------------------------------
        # STEP 8: SCOPED PURGE OF OLD POINTS
        # ---------------------------------------------------------------------
        if old_point_ids:
            try:
                if qdrant_client.is_connected or qdrant_client.connect():
                    from qdrant_client.http import models
                    qdrant_client._client.delete(
                        collection_name=qdrant_client._collection,
                        points_selector=models.PointIdsList(points=old_point_ids)
                    )
            except Exception as purge_err:
                logger.debug(f"[Pipeline] Purge old points note: {purge_err}")

        # ---------------------------------------------------------------------
        # STEP 9: TERMINAL COMPLETION (op_stage='TERMINAL_SYNCED')
        # ---------------------------------------------------------------------
        try:
            if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
                neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.op_stage = 'TERMINAL_SYNCED',
                        d.active_op_id = NULL,
                        d.last_journal_at = $timestamp
                    RETURN elementId(d) as elem_id
                """, {"elem_id": elem_id, "gen": fencing_gen, "op_id": operation_id, "timestamp": timestamp_str})
        except Exception as term_err:
            logger.debug(f"[Pipeline] Terminal synced transition note: {term_err}")

        # ---------------------------------------------------------------------
        # STEP 10: UPDATE INGESTED DOCS STATE & LOG
        # ---------------------------------------------------------------------
        is_indexed = (qdrant_indexed and neo4j_synced)
        doc_entry = {
            "id": doc_id,
            "raw_id": filename,
            "name": filename,
            "category": f"Tài liệu {dept_def['shortName']}",
            "category_en": f"{dept_def['displayName']} Document",
            "type": "PDF" if ext == ".pdf" else (ext.replace(".", "").upper()),
            "dept": dept_name,
            "deptKey": dept_key,
            "deptLabel": dept_name,
            "department": dept_name,
            "owner": "AEGIS File Watcher",
            "date": clean_date_str,
            "status": "INDEXED" if is_indexed else "PENDING",
            "statusBadge": "Đã lập chỉ mục" if is_indexed else ("Mới nạp" if event_type == "created" else "Đã cập nhật"),
            "statusState": "active" if is_indexed else "pending",
            "qdrant_indexed": qdrant_indexed,
            "neo4j_synced": neo4j_synced,
            "qdrantIndexed": qdrant_indexed,
            "neo4jSynced": neo4j_synced,
            "risk": "Low",
            "riskLabel": "Đã trích xuất quan hệ & vector",
            "size": f"{max(0.1, round(len(content_bytes) / (1024 * 1024), 2))} MB",
            "chunks": f"{len(chunks)} Chunks",
            "chunk_count": len(chunks),
            "schema": f"AEGIS {dept_def['displayName']} Schema",
            "access": "RBAC Strict (Level 3)" if dept_key == "legal" else "RBAC Dept Only",
            "previewType": "cuad_contract" if ext == ".pdf" else ("spreadsheet" if ext in [".xlsx", ".csv"] else "sop_document"),
            "source": "aegis_local_file_watcher",
            "hash": final_hash,
            "file_hash": final_hash,
            "fileHash": final_hash,
            "storage_path": storage_path,
            "isNew": True,
            "extracted_entities": entities,
            "chunks_list": [{"id": f"{doc_id}_{i}", "chunk_id": i, "text": ch} for i, ch in enumerate(chunks[:10])],
            "lastModified": timestamp_str
        }

        _WATCHER_INGESTED_DOCS = [d for d in _WATCHER_INGESTED_DOCS if d.get("name") != filename and d.get("name") != old_name]
        _WATCHER_INGESTED_DOCS.insert(0, doc_entry)
        _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)

        event_id = f"evt_{int(datetime.now().timestamp()*1000)}"
        log_entry = {
            "id": event_id,
            "eventType": event_type,
            "fileName": filename,
            "department": dept_name,
            "docId": doc_id,
            "fileHash": final_hash,
            "chunksCount": len(chunks),
            "timestamp": timestamp_str,
            "formattedTime": f"{clean_date_str} {display_time_str}",
            "status": "success",
            "qdrantIndexed": qdrant_indexed,
            "neo4jSynced": neo4j_synced
        }
        _WATCHER_SYNC_LOGS.insert(0, log_entry)
        _save_json(_LOGS_FILE, _WATCHER_SYNC_LOGS[:200])

        broadcast_watcher_event({
            **log_entry,
            "summary": f"{'Đã thêm' if event_type == 'created' else 'Đã cập nhật'} {filename} ({dept_name})"
        })

        return {
            "success": True,
            "status": "ingested",
            "data": {
                "doc_id": doc_id,
                "filename": filename,
                "department": dept_name,
                "chunks_extracted": len(chunks),
                "qdrant_indexed": qdrant_indexed,
                "neo4j_synced": neo4j_synced,
                "file_hash": final_hash
            }
        }


# ============================================================================
# UNIFIED DELETION PIPELINE (PR1 FAIL-CLOSED DELETION)
# ============================================================================

def process_document_deletion(
    filename: str,
    department: str = "sales",
    file_hash: Optional[str] = None,
    event_timestamp: Optional[str] = None,
    force_purge: bool = False
) -> Dict[str, Any]:
    """
    PR1 Fail-Closed Deletion Pipeline:
    - Verifies version evidence (file_hash) before deleting.
    - If hash evidence is missing or stale, does NOT purge Qdrant or delete Document.
    - If file is physically absent from disk and unverified, marks MISSING_PENDING_VERIFICATION.
    - If verified, purges exact active_point_ids from Qdrant and safely deletes Document & Clauses,
      strictly preserving shared Company, Department, Customer nodes!
    """
    global _WATCHER_INGESTED_DOCS, _WATCHER_SYNC_LOGS
    dept_def = resolve_department(department or filename)
    dept_name = dept_def["displayName"]
    dept_key = dept_def["key"]
    storage_path = f"/data/{dept_key}/{filename}"

    # 1. Lookup Document in Neo4j via Strict Identity Verification
    allowed, reason, doc_node = RestrictedSafeModeRegistry.verify_unique_target(
        neo4j_client=neo4j_client,
        storage_path=storage_path,
        filename=filename,
        dept_key=dept_key,
        doc_id=None
    )
    if not allowed:
        return {
            "success": False,
            "status": "restricted_safe_mode_blocked",
            "reason": "restricted_safe_mode_blocked",
            "message": f"Restricted Safe Mode: {reason}"
        }

    if not doc_node:
        if force_purge:
            try:
                if qdrant_client.is_connected or qdrant_client.connect():
                    from qdrant_client.http import models
                    qdrant_client._client.delete(
                        collection_name=qdrant_client._collection,
                        points_selector=models.Filter(
                            should=[
                                models.FieldCondition(key="contract_name", match=models.MatchValue(value=filename)),
                                models.FieldCondition(key="source_file", match=models.MatchValue(value=filename))
                            ]
                        )
                    )
            except Exception as e:
                logger.warning(f"[Pipeline] Qdrant delete error for non-node doc: {e}")
            _WATCHER_INGESTED_DOCS = [d for d in _WATCHER_INGESTED_DOCS if d.get("name") != filename and d.get("raw_id") != filename and d.get("id") != filename]
            _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)
        return {"success": True, "status": "not_found", "filename": filename}

    elem_id = doc_node.get("elem_id")
    current_hash = doc_node.get("file_hash") or doc_node.get("hash")
    active_point_ids = doc_node.get("points") or []

    # 2. Check for Stale Delete Event (Version Evidence Mismatch)
    if not force_purge and file_hash and current_hash and file_hash != current_hash:
        logger.warning(
            f"[Pipeline] Stale delete event rejected for '{filename}': event hash {file_hash} does not match current DB hash {current_hash}."
        )
        return {
            "success": False,
            "status": "stale_delete_ignored",
            "message": "Stale delete event: file hash does not match current document hash."
        }

    # 3. Check physical file existence on disk
    file_on_disk = os.path.exists(storage_path) or os.path.exists(filename)
    if not force_purge and not file_hash and not file_on_disk:
        # Event lacks hash evidence and file is missing on disk: mark MISSING_PENDING_VERIFICATION
        try:
            if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
                neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id
                    SET d.status = 'MISSING_PENDING_VERIFICATION',
                        d.missing_detected_at = $timestamp
                """, {"elem_id": elem_id, "timestamp": datetime.now().isoformat()})
            logger.info(f"[Pipeline] File '{filename}' marked as MISSING_PENDING_VERIFICATION (no purge).")
            return {
                "success": True,
                "status": "MISSING_PENDING_VERIFICATION",
                "message": f"Document '{filename}' moved to MISSING_PENDING_VERIFICATION; no Qdrant points purged."
            }
        except Exception as m_err:
            logger.warning(f"[Pipeline] Error setting MISSING_PENDING_VERIFICATION: {m_err}")

    # 4. Verified Deletion: Purge Qdrant vectors
    qdrant_removed = False
    try:
        if qdrant_client.is_connected or qdrant_client.connect():
            from qdrant_client.http import models
            # Delete exact active point IDs if available
            if active_point_ids:
                qdrant_client._client.delete(
                    collection_name=qdrant_client._collection,
                    points_selector=models.PointIdsList(points=active_point_ids)
                )
            # Scoped deletion by name/hash
            qdrant_client._client.delete(
                collection_name=qdrant_client._collection,
                points_selector=models.Filter(
                    should=[
                        models.FieldCondition(key="contract_name", match=models.MatchValue(value=filename)),
                        models.FieldCondition(key="source_file", match=models.MatchValue(value=filename)),
                        models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_node.get("doc_id", filename))),
                    ]
                )
            )
            qdrant_removed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Qdrant delete error: {e}")

    # 5. Neo4j Cleanup (Preserving shared Company, Department, Customer nodes)
    neo4j_removed = False
    try:
        if elem_id and (neo4j_client.is_connected or neo4j_client.connect()):
            cypher = """
                MATCH (d:Document)
                WHERE elementId(d) = $elem_id
                OPTIONAL MATCH (d)-[r:CONTAINS_CLAUSE]->(cl:Clause)
                OPTIONAL MATCH (c:Company)-[pr:PARTY_TO]->(d)
                DELETE r, cl, pr
                DETACH DELETE d
                WITH c
                WHERE c IS NOT NULL AND NOT (c)--()
                DELETE c
            """
            neo4j_client.run_cypher(cypher, {"elem_id": elem_id})
            neo4j_removed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Neo4j delete error: {e}")

    # 6. Update Ingested State
    initial_len = len(_WATCHER_INGESTED_DOCS)
    _WATCHER_INGESTED_DOCS = [d for d in _WATCHER_INGESTED_DOCS if d.get("name") != filename and d.get("raw_id") != filename and d.get("id") != filename]
    removed_count = initial_len - len(_WATCHER_INGESTED_DOCS)
    _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)

    # 7. Log Event
    timestamp_str = datetime.now().isoformat()
    clean_date_str = datetime.now().strftime("%d/%m/%Y")
    display_time_str = datetime.now().strftime("%H:%M")
    event_id = f"evt_{int(datetime.now().timestamp()*1000)}"

    log_entry = {
        "id": event_id,
        "eventType": "deleted",
        "fileName": filename,
        "department": dept_name,
        "timestamp": timestamp_str,
        "formattedTime": f"{clean_date_str} {display_time_str}",
        "status": "success",
        "qdrantRemoved": qdrant_removed,
        "neo4jRemoved": neo4j_removed
    }
    _WATCHER_SYNC_LOGS.insert(0, log_entry)
    _save_json(_LOGS_FILE, _WATCHER_SYNC_LOGS[:200])

    # 8. Broadcast SSE
    broadcast_watcher_event({
        **log_entry,
        "summary": f"Đã xóa tài liệu {filename} ({dept_name})"
    })

    return {
        "success": True,
        "status": "deleted",
        "filename": filename,
        "removed_docs": removed_count,
        "qdrant_removed": qdrant_removed,
        "neo4j_removed": neo4j_removed
    }


# ============================================================================
# UNIFIED RENAMING PIPELINE
# ============================================================================

def process_document_rename(old_name: str, new_name: str, department: str = "sales") -> Dict[str, Any]:
    """
    Renames Document in Qdrant & Neo4j using Two-Phase CAS and Lexicographical Locks.
    Preserves document_id and vectors without re-embedding!
    """
    dept_def = resolve_department(department or new_name)
    dept_name = dept_def["displayName"]
    dept_key = dept_def["key"]
    old_path = f"/data/{dept_key}/{old_name}"
    new_path = f"/data/{dept_key}/{new_name}"

    # 1. Lexicographical Two-Path Lock to guarantee deadlock-free concurrency
    with acquire_rename_transaction_locks(old_path, new_path, old_name):
        # 2. Strict Identity Verification via Safe Mode Registry (F-02)
        allowed, reason, doc_record = RestrictedSafeModeRegistry.verify_unique_target(
            neo4j_client=neo4j_client,
            storage_path=old_path,
            filename=old_name,
            dept_key=dept_key,
            doc_id=None
        )
        if not allowed or not doc_record:
            return {
                "success": False,
                "status": "restricted_safe_mode_blocked",
                "reason": "restricted_safe_mode_blocked",
                "error": f"Restricted Safe Mode: {reason}"
            }

        elem_id = doc_record["elem_id"]
        doc_id = doc_record["id"]
        curr_gen = doc_record["gen"] if doc_record.get("gen") is not None else 0
        active_op = doc_record.get("op_id")
        curr_stage = doc_record.get("stage")
        point_ids = doc_record.get("points") or []

        # 3. Idempotent check
        if doc_record.get("name") == new_name and (doc_record.get("storagePath") == new_path or not doc_record.get("storagePath")) and not active_op:
            return {"success": True, "status": "already_renamed", "already_renamed": True, "filename": new_name, "doc_id": doc_id}

        # 4. Check target new_path uniqueness (prevent overwriting a different document)
        allowed_new, _, new_doc_match = RestrictedSafeModeRegistry.verify_unique_target(
            neo4j_client=neo4j_client,
            storage_path=new_path,
            filename=new_name,
            dept_key=dept_key,
            doc_id=None
        )
        if new_doc_match and new_doc_match.get("elem_id") != elem_id:
            return {
                "success": False,
                "status": "conflict",
                "error": f"Tài liệu đích '{new_name}' đã tồn tại trong phòng ban '{dept_name}'."
            }

        # 5. Active operation conflict check
        if active_op or curr_stage not in ['TERMINAL_SYNCED', 'TERMINAL_FAILED']:
            raise FencedOperationError(
                f"Document '{old_name}' currently has active operation ({active_op}, stage={curr_stage}). Rename blocked."
            )

        rename_op_id = f"rename_{uuid.uuid4().hex[:12]}"
        next_gen = curr_gen + 1
        now_iso = datetime.now().isoformat()

        # 6. Stage 1: Commit Intent CAS to Neo4j with Rename Journal
        cas_stage1 = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE elementId(d) = $elem_id AND d.fencing_generation = $curr_gen AND d.active_op_id IS NULL
            SET d.pending_rename_to = $new_name,
                d.pending_path_to = $new_path,
                d.active_op_id = $rename_op_id,
                d.fencing_generation = $next_gen,
                d.op_stage = 'RENAMING',
                d.oldName = $old_name,
                d.oldPath = $old_path,
                d.rename_journal = {
                    rename_op_id: $rename_op_id,
                    doc_id: d.id,
                    old_name: $old_name,
                    new_name: $new_name,
                    old_path: $old_path,
                    new_path: $new_path,
                    previous_generation: $curr_gen,
                    next_generation: $next_gen,
                    committed_op_id: d.committed_op_id,
                    active_point_ids: coalesce(d.active_point_ids, []),
                    op_stage: 'RENAMING'
                },
                d.lastModified = $now_iso
            RETURN elementId(d) as elem_id
        """, {
            "elem_id": elem_id,
            "curr_gen": curr_gen,
            "next_gen": next_gen,
            "rename_op_id": rename_op_id,
            "new_name": new_name,
            "new_path": new_path,
            "old_name": old_name,
            "old_path": old_path,
            "now_iso": now_iso
        })

        if not cas_stage1:
            raise FencedOperationError(f"CAS Stage 1 failure: Document '{old_name}' concurrently modified during rename.")

        # 7. Stage 2: Update Qdrant Payloads on exact active physical points with read-back verification
        qdrant_ok = False
        try:
            if qdrant_client.is_connected or qdrant_client.connect():
                target_payload = {
                    "contract_name": new_name,
                    "source_file": new_name,
                    "file_name": new_name,
                    "storage_path": new_path,
                    "old_name": old_name
                }
                if point_ids:
                    # Verify point ownership before mutation
                    pre_pts = qdrant_client._client.retrieve(
                        collection_name=qdrant_client._collection,
                        ids=point_ids,
                        with_payload=True,
                        with_vectors=False
                    )
                    valid_ids = [p.id for p in (pre_pts or []) if (p.payload or {}).get("doc_id") == doc_id]
                    if valid_ids:
                        qdrant_client._client.set_payload(
                            collection_name=qdrant_client._collection,
                            payload=target_payload,
                            points=valid_ids
                        )
                        # Read-back verification after mutation
                        post_pts = qdrant_client._client.retrieve(
                            collection_name=qdrant_client._collection,
                            ids=valid_ids,
                            with_payload=True,
                            with_vectors=False
                        )
                        qdrant_ok = (
                            len(post_pts) == len(valid_ids) and
                            all(
                                (p.payload or {}).get("file_name") == new_name and
                                (p.payload or {}).get("storage_path") == new_path and
                                (p.payload or {}).get("doc_id") == doc_id
                                for p in (post_pts or [])
                            )
                        )
                    else:
                        qdrant_ok = True
                else:
                    # No active points tracked on document node
                    qdrant_ok = True
        except Exception as q_err:
            logger.error(f"[Rename] Qdrant payload update error: {q_err}")
            qdrant_ok = False

        # 8. Stage 3: Finalize CAS in Neo4j (Only finalize if Qdrant read-back verified!)
        if qdrant_ok:
            cas_finalize = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE elementId(d) = $elem_id
                  AND d.fencing_generation = $next_gen
                  AND d.active_op_id = $rename_op_id
                  AND d.op_stage = 'RENAMING'
                SET d.name = $new_name,
                    d.storagePath = $new_path,
                    d.oldName = $old_name,
                    d.renameHistory = coalesce(d.renameHistory, []) + [$old_name],
                    d.op_stage = 'TERMINAL_SYNCED',
                    d.active_op_id = NULL,
                    d.pending_rename_to = NULL,
                    d.pending_path_to = NULL,
                    d.rename_journal = NULL,
                    d.lastModified = $now_iso
                RETURN elementId(d) as elem_id
            """, {
                "elem_id": elem_id,
                "next_gen": next_gen,
                "rename_op_id": rename_op_id,
                "new_name": new_name,
                "new_path": new_path,
                "old_name": old_name,
                "now_iso": now_iso
            })
            if not cas_finalize:
                return {
                    "success": False,
                    "status": "rename_fenced_out",
                    "error": "CAS Stage 3 failure: generation changed during rename finalize."
                }
            neo4j_renamed = True
            qdrant_renamed = True
        else:
            # Leave node in RENAMING stage for recovery reconciliation; do NOT return success!
            return {
                "success": False,
                "status": "rename_qdrant_pending",
                "error": "Qdrant payload update unconfirmed. Operation remains in RENAMING stage."
            }

    # 3. Update Ingested State
    global _WATCHER_INGESTED_DOCS
    updated = False
    for d in _WATCHER_INGESTED_DOCS:
        if d.get("name") == old_name or d.get("raw_id") == old_name:
            d["name"] = new_name
            d["raw_id"] = new_name
            d["oldName"] = old_name
            d["statusBadge"] = "Đã đổi tên"
            updated = True
            break
    if updated:
        _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)

    # 4. Log Event
    timestamp_str = datetime.now().isoformat()
    clean_date_str = datetime.now().strftime("%d/%m/%Y")
    display_time_str = datetime.now().strftime("%H:%M")
    event_id = f"evt_{int(datetime.now().timestamp()*1000)}"

    log_entry = {
        "id": event_id,
        "eventType": "renamed",
        "fileName": new_name,
        "oldFileName": old_name,
        "department": dept_name,
        "timestamp": timestamp_str,
        "formattedTime": f"{clean_date_str} {display_time_str}",
        "status": "success",
        "qdrantRenamed": qdrant_renamed,
        "neo4jRenamed": neo4j_renamed
    }
    _WATCHER_SYNC_LOGS.insert(0, log_entry)
    _save_json(_LOGS_FILE, _WATCHER_SYNC_LOGS[:200])

    # 5. Broadcast SSE
    broadcast_watcher_event({
        **log_entry,
        "summary": f"Đã đổi tên {old_name} → {new_name} ({dept_name})"
    })

    return {
        "success": True,
        "status": "renamed",
        "old_name": old_name,
        "new_name": new_name,
        "updated": updated,
        "qdrant_renamed": qdrant_renamed,
        "neo4j_renamed": neo4j_renamed
    }


# ============================================================================
# PR1: CRASH RECOVERY & ORPHAN POINT RECONCILIATION
# ============================================================================

async def reconcile_crashed_operations() -> Dict[str, Any]:
    """
    PR1 Crash Recovery Reconciliation (V3):
    Scans Neo4j for uncommitted operations in non-terminal stages:
    ['STAGING', 'STAGED', 'GRAPH_INDEXED', 'PREPARING_ACTIVATION', 'PURGING_OLD', 'CLEANUP_PENDING', 'RENAMING'].

    F-01: Reconstructs expected physical point IDs, classifies retrieved points into
          (expected_ids, retrieved_ids, verified_ids, missing_ids, mismatched_ids),
          performs verified-only delete, and verifies post-delete read-back.
          For PURGING_OLD, verifies new serving version points are complete, active, and verified.
    F-04: Recovers RENAMING state machine using lexicographical locks, journal checks,
          Qdrant payload update with read-back verification, and Stage 3 CAS.
    """
    logger.info("[Recovery] Starting crash recovery reconciliation...")
    reconciled_count = 0
    audit_pending_count = 0

    if not neo4j_client.is_connected and not neo4j_client.connect():
        logger.warning("[Recovery] Neo4j unavailable, skipping recovery.")
        return {"reconciled": 0, "audit_pending": 0}

    try:
        crashed_docs = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE d.op_stage IN ['STAGING', 'STAGED', 'GRAPH_INDEXED', 'PREPARING_ACTIVATION', 'PURGING_OLD', 'CLEANUP_PENDING', 'RENAMING']
            RETURN elementId(d) as elem_id, d.id as doc_id, d.name as name, d.storagePath as storage_path,
                   d.file_hash as file_hash, d.active_op_id as op_id, d.committed_op_id as committed_op_id,
                   d.fencing_generation as gen, d.op_stage as stage,
                   d.parser_config as parser_cfg, d.chunker_config as chunker_cfg,
                   d.embedding_config as embed_cfg, d.expected_chunk_count as expected_chunk_count,
                   d.active_point_ids as active_point_ids, d.status as status,
                   d.pending_rename_to as pending_rename_to, d.pending_path_to as pending_path_to,
                   d.oldName as old_name, d.oldPath as old_path,
                   d.rename_journal as rename_journal
        """)
    except Exception as e:
        logger.warning(f"[Recovery] Error querying crashed documents: {e}")
        return {"reconciled": 0, "audit_pending": 0}

    for doc in (crashed_docs or []):
        elem_id = doc.get("elem_id")
        doc_id = doc.get("doc_id")
        file_hash = doc.get("file_hash")
        op_id = doc.get("op_id")
        gen = doc.get("gen")
        stage = doc.get("stage")
        name = doc.get("name")
        storage_path = doc.get("storage_path")
        active_point_ids = doc.get("active_point_ids") or []
        committed_op_id = doc.get("committed_op_id")

        # -------------------------------------------------------------
        # F-04: RECOVERY FOR RENAMING STAGE
        # -------------------------------------------------------------
        if stage == "RENAMING":
            journal = doc.get("rename_journal") or {}
            if isinstance(journal, str):
                try:
                    journal = json.loads(journal)
                except Exception:
                    journal = {}
            old_name = journal.get("old_name") or doc.get("old_name") or name
            new_name = journal.get("new_name") or doc.get("pending_rename_to")
            old_path = journal.get("old_path") or doc.get("old_path") or storage_path
            new_path = journal.get("new_path") or doc.get("pending_path_to")
            rename_op_id = journal.get("rename_op_id") or op_id
            target_pts = journal.get("active_point_ids") or active_point_ids

            if not new_name or not new_path or not rename_op_id:
                logger.warning(f"[Recovery] Incomplete rename journal for doc {doc_id}; setting CLEANUP_PENDING_AUDIT.")
                neo4j_client.run_cypher("""
                    MATCH (d:Document) WHERE elementId(d) = $elem_id
                    SET d.op_stage = 'CLEANUP_PENDING_AUDIT',
                        d.recovery_note = 'Incomplete rename journal in recovery'
                """, {"elem_id": elem_id})
                audit_pending_count += 1
                continue

            # Acquire lexicographically sorted locks
            with acquire_rename_transaction_locks(old_path, new_path, doc_id):
                # Verify ownership and generation
                ownership_check = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id
                      AND d.fencing_generation = $gen
                      AND d.active_op_id = $rename_op_id
                      AND d.op_stage = 'RENAMING'
                    RETURN elementId(d) as elem_id
                """, {"elem_id": elem_id, "gen": gen, "rename_op_id": rename_op_id})

                if not ownership_check:
                    logger.info(f"[Recovery] Doc {doc_id} generation moved during RENAMING recovery; skipping.")
                    continue

                qdrant_ok = False
                try:
                    if qdrant_client.is_connected or qdrant_client.connect():
                        target_payload = {
                            "contract_name": new_name,
                            "source_file": new_name,
                            "file_name": new_name,
                            "storage_path": new_path,
                            "old_name": old_name
                        }
                        if target_pts:
                            pre_pts = qdrant_client._client.retrieve(
                                collection_name=qdrant_client._collection,
                                ids=target_pts,
                                with_payload=True,
                                with_vectors=False
                            )
                            valid_ids = [p.id for p in (pre_pts or []) if (p.payload or {}).get("doc_id") == doc_id]
                            if valid_ids:
                                qdrant_client._client.set_payload(
                                    collection_name=qdrant_client._collection,
                                    payload=target_payload,
                                    points=valid_ids
                                )
                                post_pts = qdrant_client._client.retrieve(
                                    collection_name=qdrant_client._collection,
                                    ids=valid_ids,
                                    with_payload=True,
                                    with_vectors=False
                                )
                                qdrant_ok = (
                                    len(post_pts) == len(valid_ids) and
                                    all(
                                        (p.payload or {}).get("file_name") == new_name and
                                        (p.payload or {}).get("storage_path") == new_path and
                                        (p.payload or {}).get("doc_id") == doc_id
                                        for p in (post_pts or [])
                                    )
                                )
                            else:
                                qdrant_ok = True
                        else:
                            qdrant_ok = True
                except Exception as q_err:
                    logger.error(f"[Recovery] Qdrant rename error: {q_err}")
                    qdrant_ok = False

                if qdrant_ok:
                    now_iso = datetime.now().isoformat()
                    finalize_res = neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE elementId(d) = $elem_id
                          AND d.fencing_generation = $gen
                          AND d.active_op_id = $rename_op_id
                          AND d.op_stage = 'RENAMING'
                        SET d.name = $new_name,
                            d.storagePath = $new_path,
                            d.oldName = $old_name,
                            d.renameHistory = coalesce(d.renameHistory, []) + [$old_name],
                            d.op_stage = 'TERMINAL_SYNCED',
                            d.active_op_id = NULL,
                            d.pending_rename_to = NULL,
                            d.pending_path_to = NULL,
                            d.rename_journal = NULL,
                            d.lastModified = $now_iso
                        RETURN elementId(d) as elem_id
                    """, {
                        "elem_id": elem_id,
                        "gen": gen,
                        "rename_op_id": rename_op_id,
                        "new_name": new_name,
                        "new_path": new_path,
                        "old_name": old_name,
                        "now_iso": now_iso
                    })
                    if finalize_res:
                        reconciled_count += 1
                        continue

                logger.warning(f"[Recovery] Failed to complete RENAMING for doc {doc_id}; remaining in RENAMING.")
                audit_pending_count += 1
                continue

        # -------------------------------------------------------------
        # F-01: RECOVERY FOR PURGING_OLD STAGE
        # -------------------------------------------------------------
        if stage == "PURGING_OLD":
            serving_verified = True
            if active_point_ids:
                serving_verified = False
                try:
                    if qdrant_client.is_connected or qdrant_client.connect():
                        if hasattr(qdrant_client._client, "retrieve"):
                            pts = qdrant_client._client.retrieve(
                                collection_name=qdrant_client._collection,
                                ids=active_point_ids,
                                with_payload=True,
                                with_vectors=False
                            )
                            if len(pts) == len(active_point_ids):
                                all_active_and_match = all(
                                    (getattr(p, "payload", {}) or {}).get("doc_id") == doc_id and
                                    (getattr(p, "payload", {}) or {}).get("file_hash") == file_hash and
                                    (getattr(p, "payload", {}) or {}).get("operation_id") == op_id and
                                    (getattr(p, "payload", {}) or {}).get("is_active") is True
                                    for p in pts
                                )
                                if all_active_and_match:
                                    serving_verified = True
                                else:
                                    all_match = all(
                                        (getattr(p, "payload", {}) or {}).get("doc_id") == doc_id and
                                        (getattr(p, "payload", {}) or {}).get("file_hash") == file_hash and
                                        (getattr(p, "payload", {}) or {}).get("operation_id") == op_id
                                        for p in pts
                                    )
                                    if all_match:
                                        qdrant_client._client.set_payload(
                                            collection_name=qdrant_client._collection,
                                            payload={"is_active": True},
                                            points=active_point_ids
                                        )
                                        post_act = qdrant_client._client.retrieve(
                                            collection_name=qdrant_client._collection,
                                            ids=active_point_ids,
                                            with_payload=True,
                                            with_vectors=False
                                        )
                                        serving_verified = all(
                                            (getattr(p, "payload", {}) or {}).get("is_active") is True
                                            for p in (post_act or [])
                                        )
                        else:
                            serving_verified = True
                except Exception as q_err:
                    logger.error(f"[Recovery] Error verifying serving points in PURGING_OLD: {q_err}")
                    serving_verified = False

            if serving_verified:
                cas_res = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                    SET d.op_stage = 'TERMINAL_SYNCED', d.active_op_id = NULL
                    RETURN elementId(d) as elem_id
                """, {"elem_id": elem_id, "gen": gen, "op_id": op_id})
                if cas_res:
                    reconciled_count += 1
                else:
                    logger.info(f"[Recovery] Doc {doc_id} generation moved during PURGING_OLD; skipping.")
            else:
                neo4j_client.run_cypher("""
                    MATCH (d:Document) WHERE elementId(d) = $elem_id
                    SET d.op_stage = 'CLEANUP_PENDING_AUDIT',
                        d.recovery_note = 'Serving version verification failed in PURGING_OLD'
                """, {"elem_id": elem_id})
                audit_pending_count += 1
            continue

        # -------------------------------------------------------------
        # F-01: RECOVERY FOR STAGING, STAGED, GRAPH_INDEXED, PREPARING_ACTIVATION, CLEANUP_PENDING
        # -------------------------------------------------------------
        expected_cnt = doc.get("expected_chunk_count") or 0
        parser_cfg = doc.get("parser_cfg") or "v1.0"
        chunker_cfg = doc.get("chunker_cfg") or "overlap_500_v1.0"
        embed_cfg = doc.get("embed_cfg") or "all-MiniLM-L6-v2_384_v1.0"

        if not op_id or gen is None or not file_hash or expected_cnt <= 0:
            neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE elementId(d) = $elem_id
                SET d.op_stage = 'CLEANUP_PENDING_AUDIT',
                    d.recovery_note = 'Cannot reconstruct expected point IDs due to incomplete journal'
            """, {"elem_id": elem_id})
            audit_pending_count += 1
            continue

        # Reconstruct exact expected physical point IDs
        expected_ids = [
            generate_physical_point_id(doc_id, file_hash, op_id, gen, parser_cfg, chunker_cfg, embed_cfg, idx)
            for idx in range(expected_cnt)
        ]

        # Verify Qdrant points and classify into 5 sets:
        # expected_ids, retrieved_ids, verified_ids, missing_ids, mismatched_ids
        retrieved_ids = set()
        verified_ids = []
        mismatched_ids = []

        try:
            if qdrant_client.is_connected or qdrant_client.connect():
                if hasattr(qdrant_client._client, "retrieve"):
                    pre_delete_pts = qdrant_client._client.retrieve(
                        collection_name=qdrant_client._collection,
                        ids=expected_ids,
                        with_payload=True,
                        with_vectors=False
                    )
                    for pt in (pre_delete_pts or []):
                        pt_id = str(getattr(pt, "id", pt.get("id") if isinstance(pt, dict) else pt))
                        retrieved_ids.add(pt_id)
                        p_load = getattr(pt, "payload", pt.get("payload") if isinstance(pt, dict) else {}) or {}
                        # Verified only if all metadata strictly matches and is_active is False
                        if (
                            p_load.get("doc_id") == doc_id and
                            p_load.get("file_hash") == file_hash and
                            p_load.get("operation_id") == op_id and
                            p_load.get("fencing_generation") == gen and
                            p_load.get("is_active") is False
                        ):
                            verified_ids.append(pt_id)
                        else:
                            mismatched_ids.append(pt_id)
                else:
                    verified_ids = list(expected_ids)
        except Exception as q_err:
            logger.error(f"[Recovery] Qdrant retrieve failed during recovery for doc {doc_id}: {q_err}")
            neo4j_client.run_cypher("""
                MATCH (d:Document) WHERE elementId(d) = $elem_id
                SET d.op_stage = 'CLEANUP_PENDING',
                    d.recovery_note = 'Qdrant retrieve timeout/failure during pre-delete check'
            """, {"elem_id": elem_id})
            audit_pending_count += 1
            continue

        missing_ids = set(expected_ids) - retrieved_ids

        # If mismatched IDs found, DO NOT DELETE them! Transition to CLEANUP_PENDING_AUDIT
        if mismatched_ids:
            logger.warning(f"[Recovery] Mismatched metadata in {len(mismatched_ids)} points for doc {doc_id}.")
            neo4j_client.run_cypher("""
                MATCH (d:Document) WHERE elementId(d) = $elem_id
                SET d.op_stage = 'CLEANUP_PENDING_AUDIT',
                    d.recovery_note = 'Mismatched point metadata detected during recovery'
            """, {"elem_id": elem_id})
            audit_pending_count += 1
            continue

        # If verified points exist, perform verified-only delete followed by post-delete read-back
        cleanup_success = True
        if verified_ids:
            owner_check = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE d.op_stage IN ['STAGING', 'STAGED', 'GRAPH_INDEXED', 'PREPARING_ACTIVATION', 'PURGING_OLD', 'CLEANUP_PENDING', 'CLEANUP_PENDING_AUDIT', 'RENAMING']
                  AND elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
                RETURN elementId(d) as elem_id
            """, {"elem_id": elem_id, "gen": gen, "op_id": op_id})
            if not owner_check:
                logger.info(f"[Recovery] Document {doc_id} ownership lost before delete; skipping.")
                continue

            try:
                from qdrant_client.http import models
                qdrant_client._client.delete(
                    collection_name=qdrant_client._collection,
                    points_selector=models.PointIdsList(points=verified_ids)
                )

                # POST-DELETE READ-BACK
                if hasattr(qdrant_client._client, "retrieve"):
                    post_delete_pts = qdrant_client._client.retrieve(
                        collection_name=qdrant_client._collection,
                        ids=verified_ids,
                        with_payload=False,
                        with_vectors=False
                    )
                    if post_delete_pts:
                        logger.warning(f"[Recovery] {len(post_delete_pts)} points remained after delete for doc {doc_id}!")
                        cleanup_success = False
            except Exception as del_err:
                logger.error(f"[Recovery] Qdrant delete/read-back failed for doc {doc_id}: {del_err}")
                cleanup_success = False

        if not cleanup_success:
            neo4j_client.run_cypher("""
                MATCH (d:Document) WHERE elementId(d) = $elem_id
                SET d.op_stage = 'CLEANUP_PENDING',
                    d.recovery_note = 'Points remained or deletion unconfirmed after cleanup'
            """, {"elem_id": elem_id})
            audit_pending_count += 1
            continue

        # Transition Neo4j Document node to TERMINAL_FAILED via CAS
        cas_res = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE elementId(d) = $elem_id AND d.fencing_generation = $gen AND d.active_op_id = $op_id
            SET d.op_stage = 'TERMINAL_FAILED',
                d.active_op_id = NULL,
                d.status = CASE WHEN d.status = 'SYNCED' THEN 'SYNCED' ELSE 'FAILED' END,
                d.recovery_note = 'Cleaned up by crash recovery reconciliation'
            RETURN elementId(d) as elem_id
        """, {"elem_id": elem_id, "gen": gen, "op_id": op_id})

        if cas_res:
            reconciled_count += 1
        else:
            logger.info(f"[Recovery] Document {doc_id} generation moved; skipping CAS overwrite.")

    logger.info(f"[Recovery] Completed: {reconciled_count} reconciled, {audit_pending_count} audit pending.")
    return {"reconciled": reconciled_count, "audit_pending": audit_pending_count}
