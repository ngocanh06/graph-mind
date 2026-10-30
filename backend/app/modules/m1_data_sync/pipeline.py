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
import io
import re
import json
import zlib
import zipfile
import hashlib
import logging
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, Any, List, Optional, Set

try:
    from app.core.departments import resolve_department, get_department_display_name, get_department_key
    from app.db.neo4j.client import neo4j_client
    from app.db.qdrant.client import qdrant_client
except ImportError:
    from core.departments import resolve_department, get_department_display_name, get_department_key
    from db.neo4j.client import neo4j_client
    from db.qdrant.client import qdrant_client

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv"}

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
            os.replace(temp_path, path)
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

    # 1. Plain text / CSV / JSON
    if ext in [".txt", ".csv", ".json", ".md", ".log"]:
        try:
            return content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return content_bytes.decode("latin-1", errors="ignore")

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

    # 4. XLSX extraction (stdlib zipfile parsing sharedStrings & sheet XMLs)
    if ext == ".xlsx":
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                strings = []
                if "xl/sharedStrings.xml" in z.namelist():
                    tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    for t in tree.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"):
                        if t.text:
                            strings.append(t.text.strip())
                if strings:
                    return "\n".join(strings)
        except Exception as e:
            logger.warning(f"[Pipeline] XLSX extraction error: {e}")

    try:
        return content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return f"[Document: {filename}, size: {len(content_bytes)} bytes]"


def chunk_text(text: str, max_chars: int = 500) -> List[str]:
    """Split text into overlapping logical paragraph chunks."""
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
# UNIFIED INGESTION ENGINE (CREATE / MODIFY)
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
    Unified Ingestion Logic:
    1. Computes SHA-256 hash.
    2. Enforces Idempotency Guard (skip if unchanged).
    3. Extracts text and chunks.
    4. Indexes vectors into Qdrant (with deterministic point IDs).
    5. Merges Document & Clause nodes and relationships into Neo4j.
    6. Updates local state and broadcasts SSE realtime event.
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

    timestamp_str = datetime.now().isoformat()
    clean_date_str = datetime.now().strftime("%d/%m/%Y")
    display_time_str = datetime.now().strftime("%H:%M")

    # Idempotency Check: Source of Truth is Real Databases (Neo4j & Qdrant)
    if allow_skip_known and event_type == "created":
        verified_hashes = get_verified_indexed_hashes()
        if final_hash in verified_hashes:
            doc_in_neo = False
            try:
                if neo4j_client.is_connected or neo4j_client.connect():
                    check = neo4j_client.run_cypher("MATCH (d:Document {name: $name}) RETURN d.id as id LIMIT 1", {"name": filename})
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

    # 1. Qdrant Vector Indexing
    qdrant_indexed = False
    try:
        if qdrant_client.is_connected or qdrant_client.connect():
            from qdrant_client.http import models

            # Clean previous vectors if modifying
            target_name = old_name or filename
            try:
                qdrant_client._client.delete(
                    collection_name=qdrant_client._collection,
                    points_selector=models.Filter(
                        should=[
                            models.FieldCondition(key="contract_name", match=models.MatchValue(value=target_name)),
                            models.FieldCondition(key="source_file", match=models.MatchValue(value=target_name)),
                        ]
                    )
                )
            except Exception as del_err:
                logger.debug(f"[Pipeline] Qdrant clean old points note: {del_err}")

            from app.db.qdrant.client import get_embed_model
            _embed = get_embed_model()
            pts = []
            chunk_texts = [ch[:1000] for ch in chunks]
            if _embed and chunk_texts:
                try:
                    vectors = _embed.encode(chunk_texts)
                    vectors_list = [v.tolist() for v in vectors]
                except Exception:
                    vectors_list = [_embed.encode(t).tolist() for t in chunk_texts]
            else:
                vectors_list = [[0.01 * ((i + idx) % 50) for i in range(384)] for idx in range(len(chunks))]

            for idx, ch in enumerate(chunks):
                pt_id = int(hashlib.md5(f"{final_hash}_{filename}_{idx}".encode()).hexdigest()[:15], 16)
                vec = vectors_list[idx]
                pts.append(models.PointStruct(
                    id=pt_id,
                    vector=vec,
                    payload={
                        "contract_name": filename,
                        "source_file": filename,
                        "doc_id": doc_id,
                        "document_id": doc_id,
                        "chunk_id": idx,
                        "chunk_index": idx,
                        "text": ch,
                        "department": dept_name,
                        "department_key": dept_key,
                        "source": "aegis_local_file_watcher",
                        "ingested_at": timestamp_str,
                        "file_hash": final_hash
                    }
                ))
            if pts:
                # Upsert in safe batches of 100 points
                for b_start in range(0, len(pts), 100):
                    qdrant_client._client.upsert(
                        collection_name=qdrant_client._collection,
                        points=pts[b_start:b_start + 100]
                    )
                qdrant_indexed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Qdrant indexing error: {e}")

    # 2. Neo4j Graph Indexing
    neo4j_synced = False
    try:
        if neo4j_client.is_connected or neo4j_client.connect():
            cypher = """
                MERGE (d:Document {name: $name})
                SET d.id = $doc_id,
                    d.hash = $hash,
                    d.department = $dept,
                    d.deptKey = $dept_key,
                    d.chunksCount = $chunks_count,
                    d.contractValue = $contract_val,
                    d.status = 'active',
                    d.source = 'aegis_local_watcher',
                    d.storagePath = '/data/' + $dept_key + '/' + $name,
                    d.qdrantIndexed = true,
                    d.neo4jSynced = true,
                    d.ingestedAt = $ingested_at,
                    d.lastModified = $ingested_at
                WITH d
                OPTIONAL MATCH (d)-[r:CONTAINS_CLAUSE]->(oldCl:Clause)
                DELETE r, oldCl
                WITH d
                MERGE (dept:Department {name: $dept})
                MERGE (d)-[:BELONGS_TO_DEPT]->(dept)
            """
            params = {
                "name": filename,
                "doc_id": doc_id,
                "hash": final_hash,
                "dept": dept_name,
                "dept_key": dept_key,
                "chunks_count": len(chunks),
                "contract_val": entities.get("value") or "Chưa xác định",
                "ingested_at": timestamp_str
            }
            neo4j_client.run_cypher(cypher, params)

            for comp in entities.get("companies", []):
                neo4j_client.run_cypher("""
                    MATCH (d:Document {name: $name})
                    MERGE (c:Company {name: $company})
                    MERGE (c)-[:PARTY_TO]->(d)
                """, {"name": filename, "company": comp})

            for idx, cl in enumerate(entities.get("clauses", [])):
                neo4j_client.run_cypher("""
                    MATCH (d:Document {name: $name})
                    MERGE (cl:Clause {id: $cl_id})
                    SET cl.type = $cl_type,
                        cl.title = $cl_title,
                        cl.snippet = $cl_snippet
                    MERGE (d)-[:CONTAINS_CLAUSE]->(cl)
                """, {
                    "name": filename,
                    "cl_id": f"{doc_id}_CL_{idx+1}",
                    "cl_type": cl["type"],
                    "cl_title": cl["title"],
                    "cl_snippet": chunks[0][:200] if chunks else ""
                })
            neo4j_synced = True
    except Exception as e:
        logger.warning(f"[Pipeline] Neo4j indexing error: {e}")

    # 3. Update Ingested Docs Record
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
        "storage_path": f"/data/{dept_key}/{filename}",
        "isNew": True,
        "extracted_entities": entities,
        "chunks_list": [{"id": f"{doc_id}_{i}", "chunk_id": i, "text": ch} for i, ch in enumerate(chunks[:10])],
        "lastModified": timestamp_str
    }

    # Remove previous entry by name if modifying
    _WATCHER_INGESTED_DOCS = [d for d in _WATCHER_INGESTED_DOCS if d.get("name") != filename and d.get("name") != old_name]
    _WATCHER_INGESTED_DOCS.insert(0, doc_entry)
    _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)

    # 4. Log Event
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

    # 5. Broadcast SSE
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
# UNIFIED DELETION PIPELINE
# ============================================================================

def process_document_deletion(filename: str, department: str = "sales") -> Dict[str, Any]:
    """
    Deletes vectors from Qdrant and Document/Clause nodes from Neo4j.
    Preserves shared Company, Department, Customer nodes!
    """
    dept_def = resolve_department(department or filename)
    dept_name = dept_def["displayName"]

    # 1. Qdrant Cleanup
    qdrant_removed = False
    try:
        if qdrant_client.is_connected or qdrant_client.connect():
            from qdrant_client.http import models
            qdrant_client._client.delete(
                collection_name=qdrant_client._collection,
                points_selector=models.Filter(
                    should=[
                        models.FieldCondition(key="contract_name", match=models.MatchValue(value=filename)),
                        models.FieldCondition(key="source_file", match=models.MatchValue(value=filename)),
                        models.FieldCondition(key="doc_id", match=models.MatchValue(value=filename)),
                        models.FieldCondition(key="document_id", match=models.MatchValue(value=filename)),
                    ]
                )
            )
            qdrant_removed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Qdrant delete error: {e}")

    # 2. Neo4j Cleanup (Documents & Clauses only, keeping shared nodes)
    neo4j_removed = False
    try:
        if neo4j_client.is_connected or neo4j_client.connect():
            cypher = """
                MATCH (d:Document)
                WHERE d.name = $name OR d.oldName = $name OR d.id = $name
                OPTIONAL MATCH (d)-[r:CONTAINS_CLAUSE]->(cl:Clause)
                DELETE r, cl
                DETACH DELETE d
            """
            neo4j_client.run_cypher(cypher, {"name": filename})
            neo4j_removed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Neo4j delete error: {e}")

    # 3. Update Ingested State
    global _WATCHER_INGESTED_DOCS
    initial_len = len(_WATCHER_INGESTED_DOCS)
    _WATCHER_INGESTED_DOCS = [d for d in _WATCHER_INGESTED_DOCS if d.get("name") != filename and d.get("raw_id") != filename and d.get("id") != filename]
    removed_count = initial_len - len(_WATCHER_INGESTED_DOCS)
    _save_json(_DOCS_FILE, _WATCHER_INGESTED_DOCS)

    # 4. Log Event
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

    # 5. Broadcast SSE
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
    Renames Document in Qdrant & Neo4j.
    Preserves document_id and vectors without re-embedding!
    """
    dept_def = resolve_department(department or new_name)
    dept_name = dept_def["displayName"]

    # 1. Qdrant Payload Update
    qdrant_renamed = False
    try:
        if qdrant_client.is_connected or qdrant_client.connect():
            from qdrant_client.http import models
            # Update contract_name in payloads where contract_name == old_name
            filter_cond = models.Filter(
                must=[models.FieldCondition(key="contract_name", match=models.MatchValue(value=old_name))]
            )
            pts, _ = qdrant_client._client.scroll(
                collection_name=qdrant_client._collection,
                scroll_filter=filter_cond,
                limit=100,
                with_payload=True,
                with_vectors=False
            )
            for p in pts:
                new_payload = dict(p.payload or {})
                new_payload["contract_name"] = new_name
                new_payload["source_file"] = new_name
                new_payload["old_name"] = old_name
                qdrant_client._client.set_payload(
                    collection_name=qdrant_client._collection,
                    payload=new_payload,
                    points=[p.id]
                )
            qdrant_renamed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Qdrant rename error: {e}")

    # 2. Neo4j Document Update
    neo4j_renamed = False
    try:
        if neo4j_client.is_connected or neo4j_client.connect():
            cypher = """
                MATCH (d:Document)
                WHERE d.name = $old_name OR d.id = $old_name
                SET d.name = $new_name,
                    d.oldName = $old_name,
                    d.renameHistory = coalesce(d.renameHistory, []) + [$old_name],
                    d.lastModified = $now
                RETURN d.id as doc_id
            """
            res = neo4j_client.run_cypher(cypher, {
                "old_name": old_name,
                "new_name": new_name,
                "now": datetime.now().isoformat()
            })
            if res:
                neo4j_renamed = True
    except Exception as e:
        logger.warning(f"[Pipeline] Neo4j rename error: {e}")

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
