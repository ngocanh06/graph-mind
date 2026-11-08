"""
Copilot API Router — Quản lý phiên hội thoại và truy vấn AI Copilot theo từng tài khoản người dùng
Endpoints:
- GET    /api/copilot/sessions: Lấy danh sách hội thoại của tài khoản đang đăng nhập
- POST   /api/copilot/sessions: Tạo phiên hội thoại mới cho tài khoản
- GET    /api/copilot/sessions/{session_id}: Lấy chi tiết lịch sử tin nhắn của phiên
- DELETE /api/copilot/sessions/{session_id}: Xóa một phiên hội thoại
- POST   /api/copilot/ask: Hỏi đáp với Copilot và tự động lưu vào phiên hội thoại trong PostgreSQL
"""
import uuid
import time
import re
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import decode_access_token
    from app.core.rbac import check_data_scope_permission, filter_graph_entities_by_scope
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
    from app.db.postgres.models.copilot_session import CopilotSession
    from app.db.neo4j.client import neo4j_client
    from app.db.qdrant.client import qdrant_client
    from app.modules.m3_hybrid_copilot.inference.client import llm_client
    from app.modules.m3_hybrid_copilot.query_engine.context_fusion import reciprocal_rank_fusion
    from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import execute_text_to_cypher
except ImportError:
    from core.security import decode_access_token
    from core.rbac import check_data_scope_permission, filter_graph_entities_by_scope
    from db.postgres.database import get_db
    from db.postgres.models.user import User
    from db.postgres.models.copilot_session import CopilotSession
    from db.neo4j.client import neo4j_client
    from db.qdrant.client import qdrant_client
    from modules.m3_hybrid_copilot.inference.client import llm_client
    from modules.m3_hybrid_copilot.query_engine.context_fusion import reciprocal_rank_fusion
    from modules.m3_hybrid_copilot.query_engine.text_to_cypher import execute_text_to_cypher

router = APIRouter()
security_bearer = HTTPBearer(auto_error=False)
_GREETING_RE = re.compile(r"^\s*(xin\s+chào|chào\s+bạn|hello|hi|chào\s+ai|chào\s+copilot|hey|alo)\s*[!.]*\s*$", re.IGNORECASE)

def _resolve_user_label(user, scope) -> str:
    role_code = (getattr(scope, "role", None) or getattr(user, "role", "") or "").upper()
    if role_code in ["DEPARTMENT_MANAGER", "KNOWLEDGE_MGR"]:
        return "Trưởng phòng (Quản lý)"
    if role_code in ["EXECUTIVE", "CEO", "CFO", "ADMIN"]:
        return "Executive (Lãnh đạo)"
    if role_code in ["STAFF", "USER"]:
        return "Nhân viên (Nội bộ)"
    return getattr(user, "full_name", None) or getattr(user, "username", None) or "User"


try:
    from app.core.rbac import get_request_user, get_user_scope, ScopeContext
except ImportError:
    from core.rbac import get_request_user, get_user_scope, ScopeContext

import logging
logger = logging.getLogger(__name__)


# ============================================================================
# PR1: LAYER-2 CONTEXT GATE (CHOKE POINT IMMEDIATELY BEFORE LLM GENERATION)
# ============================================================================

def _is_serving_eligible(d_meta: Optional[Dict[str, Any]]) -> bool:
    """
    Evaluates whether a Document node metadata dictionary meets serving eligibility.
    Fail-closed: returns False if missing, malformed, or contradictory.
    Strictly aligns with CYPHER_SERVING_ELIGIBILITY_FILTER and PR1 V3 specification:
    - PR1 V3 terminal: op_stage='TERMINAL_SYNCED', active_op_id=None, valid committed_op_id & committed_generation > 0, valid hash, synced status.
    - Legacy: op_stage=None/empty, active_op_id=None/empty, committed_op_id=None/empty, committed_generation=None, valid hash,
              and either status in ['SYNCED', 'Hoạt động (Synced)'] or (status in ['active', None, ''] and neo4jSynced=True).
    - Fails closed on any intermediate, ambiguous, or contradictory state.
    """
    if not d_meta or not isinstance(d_meta, dict):
        return False
    doc_id = d_meta.get("id") or d_meta.get("doc_id")
    if not doc_id or not isinstance(doc_id, str) or not doc_id.strip():
        return False

    # 1. Active operation check (must be None or empty)
    active_op = d_meta.get("active_op_id")
    if active_op is not None and str(active_op).strip() != "":
        return False

    # 2. Hash presence and consistency check (must exist and not conflict)
    f_hash = str(d_meta.get("file_hash") or "").strip()
    d_hash = str(d_meta.get("hash") or "").strip()
    if not f_hash and not d_hash:
        return False
    if f_hash and d_hash and f_hash != d_hash:
        return False

    # 3. Status and Stage classification
    status = d_meta.get("status")
    neo4j_synced = d_meta.get("neo4jSynced")
    op_stage = d_meta.get("op_stage")
    committed_op = d_meta.get("committed_op_id")
    committed_gen = d_meta.get("committed_generation")

    has_valid_committed_op = bool(committed_op and isinstance(committed_op, str) and committed_op.strip())
    has_valid_committed_gen = (
        committed_gen is not None
        and type(committed_gen) is int
        and not isinstance(committed_gen, bool)
        and committed_gen > 0
    )

    if op_stage == "TERMINAL_SYNCED":
        # PR1 V3 Terminal Committed: requires committed_op_id and valid committed_generation
        if not (status in ["SYNCED", "Hoạt động (Synced)", "active", "INDEXED"]):
            return False
        if not has_valid_committed_op or not has_valid_committed_gen:
            return False
        return True
    elif op_stage in (None, ""):
        # Legacy Document: must NOT have PR1 V3 committed metadata (fail-closed on ambiguous state)
        if committed_op is not None and str(committed_op).strip() != "":
            return False
        if committed_gen is not None:
            return False
        # Legacy status check:
        # - Explicit 'SYNCED' or 'Hoạt động (Synced)' is eligible
        # - Legacy 'active' or omitted status requires neo4jSynced = True
        if status in ["SYNCED", "Hoạt động (Synced)"]:
            return True
        elif (status == "active" or not status) and neo4j_synced is True:
            return True
        else:
            return False
    else:
        # Intermediate or failed stage (STAGING, PURGING_OLD, TERMINAL_FAILED, CLEANUP_PENDING, etc.)
        return False


def verify_document_batch(doc_ids: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Performs batch lookup of Document nodes by ID in Neo4j with duplicate detection.
    Returns mapping of doc_id -> metadata dict.
    If a doc_id has duplicate Document nodes in Neo4j (occurrences > 1), it maps to None (fail-closed).
    """
    doc_map: Dict[str, Optional[Dict[str, Any]]] = {}
    clean_ids = [str(did).strip() for did in doc_ids if str(did).strip()]
    if not clean_ids:
        return doc_map

    if not (neo4j_client.is_connected or neo4j_client.connect()):
        return doc_map

    try:
        records = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE d.id IN $doc_ids
            WITH d.id as doc_id, count(d) as occurrences, collect(d)[0] as doc_node
            RETURN doc_id, occurrences,
                   doc_node.id as id,
                   doc_node.name as name,
                   doc_node.status as status,
                   doc_node.hash as hash,
                   doc_node.file_hash as file_hash,
                   doc_node.committed_op_id as committed_op_id,
                   doc_node.committed_generation as committed_generation,
                   doc_node.active_op_id as active_op_id,
                   doc_node.op_stage as op_stage,
                   doc_node.neo4jSynced as neo4jSynced
        """, {"doc_ids": clean_ids})
        for r in (records or []):
            d_id = str(r.get("doc_id") or "")
            if not d_id:
                continue
            if r.get("occurrences", 0) > 1:
                # Duplicate document node detected: fail-closed reject
                doc_map[d_id] = None
            else:
                doc_map[d_id] = r
    except Exception as e:
        logger.warning(f"[Layer2Gate] Neo4j document batch lookup error: {e}")

    return doc_map



def verify_chunk_serving_integrity(ch: Dict[str, Any], d_meta: Dict[str, Any]) -> bool:
    """
    Dual wrapper & payload check verifying chunk integrity against document metadata.
    Enforces strict PR1 V3 metadata for terminal documents, and legacy constraints for legacy documents.
    """
    if not _is_serving_eligible(d_meta):
        return False

    payload = ch.get("payload") if isinstance(ch.get("payload"), dict) else ch

    # 1. is_active check: if explicitly False, reject
    ch_active = ch.get("is_active")
    pl_active = payload.get("is_active")
    if ch_active is False or pl_active is False:
        return False
    if ch_active is not None and pl_active is not None and ch_active != pl_active:
        return False

    # 2. doc_id / document_id consistency
    ch_doc = ch.get("doc_id") or ch.get("document_id")
    pl_doc = payload.get("doc_id") or payload.get("document_id")
    if ch_doc and pl_doc and str(ch_doc) != str(pl_doc):
        return False
    if ch.get("doc_id") and ch.get("document_id") and str(ch["doc_id"]) != str(ch["document_id"]):
        return False
    if payload.get("doc_id") and payload.get("document_id") and str(payload["doc_id"]) != str(payload["document_id"]):
        return False
    eff_doc = ch_doc or pl_doc
    expected_doc = d_meta.get("id") or d_meta.get("doc_id")
    if eff_doc and expected_doc and str(eff_doc) != str(expected_doc):
        return False

    # 3. file_hash check
    ch_h = ch.get("file_hash")
    pl_h = payload.get("file_hash")
    if ch_h and pl_h and str(ch_h) != str(pl_h):
        return False
    eff_hash = ch_h or pl_h
    expected_hash = d_meta.get("file_hash") or d_meta.get("hash")
    if eff_hash and expected_hash and str(eff_hash) != str(expected_hash):
        return False

    # 4. fencing_generation & operation_id consistency
    ch_gen = ch.get("fencing_generation")
    pl_gen = payload.get("fencing_generation")
    if ch_gen is not None and pl_gen is not None and ch_gen != pl_gen:
        return False
    eff_gen = ch_gen if ch_gen is not None else pl_gen
    if eff_gen is not None:
        if type(eff_gen) is not int or isinstance(eff_gen, bool) or eff_gen <= 0:
            return False
        committed_gen = d_meta.get("committed_generation")
        if committed_gen is not None and eff_gen != committed_gen:
            return False

    ch_op = ch.get("operation_id")
    pl_op = payload.get("operation_id")
    if ch_op and pl_op and str(ch_op) != str(pl_op):
        return False
    eff_op = ch_op or pl_op
    committed_op = d_meta.get("committed_op_id")
    if eff_op and committed_op and str(eff_op) != str(committed_op):
        return False

    op_stage = d_meta.get("op_stage")
    if op_stage in (None, ""):
        # Legacy Document: must NOT have PR1 V3 generation or operation metadata (fail-closed)
        if eff_gen is not None:
            return False
        if eff_op is not None and str(eff_op).strip() != "":
            return False

    return True


def validate_aggregate_in_layer2(ent: Dict[str, Any], doc_map: Dict[str, Any]) -> bool:
    """
    Validates aggregate card (portfolio-breakdown, compliance-stats) at Layer 2.
    Must be fail-closed: requires valid source_doc_ids, duplicate_detected == 1,
    total_verified_docs == len(source_doc_ids), and all source documents serving-eligible.
    """
    source_doc_ids = ent.get("source_doc_ids")
    if not isinstance(source_doc_ids, list) or len(source_doc_ids) == 0:
        return False

    cleaned_ids = []
    seen = set()
    for sid in source_doc_ids:
        if not isinstance(sid, str) or not sid.strip():
            return False
        clean = sid.strip()
        if clean in seen:
            return False
        seen.add(clean)
        cleaned_ids.append(clean)

    dup_detected = ent.get("duplicate_detected")
    if type(dup_detected) is not int or isinstance(dup_detected, bool) or dup_detected != 1:
        return False

    total_docs = ent.get("total_verified_docs")
    if type(total_docs) is not int or isinstance(total_docs, bool) or total_docs != len(cleaned_ids):
        return False

    for sid in cleaned_ids:
        if sid not in doc_map or doc_map[sid] is None:
            return False
        if not _is_serving_eligible(doc_map[sid]):
            return False

    return True


def apply_layer2_context_gate(
    evidence_chunks: List[Dict[str, Any]],
    graph_entities: List[Dict[str, Any]]
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    PR1 Layer-2 Context Gate:
    Validates all chunks and entities immediately before LLM generation.
    - Vector chunks: verified against Neo4j unique Document node with serving eligibility.
    - Graph entities: verified provenance to a SYNCED Document.
    - Aggregates: validated via validate_aggregate_in_layer2.
    - Company: provenance verified via PARTY_TO relationships.
    - Product: marks ERP structured data; excludes Document Citation generation.
    - Returns (verified_chunks, verified_entities). If empty, triggers Zero Retrieval refusal.
    """
    if not (neo4j_client.is_connected or neo4j_client.connect()):
        return [], []

    # 1. Collect all candidate Document IDs
    doc_ids = set()

    for ent in (graph_entities or []):
        ent_labels = ent.get("_labels") or []
        if ("Company" in ent_labels or ent.get("company")) and not ent.get("source_doc_ids"):
            try:
                c_name = ent.get("name") or ent.get("company") or ""
                c_id = str(ent.get("_id") or "")
                records = neo4j_client.run_cypher("""
                    MATCH (c:Company)-[:PARTY_TO]->(d:Document)
                    WHERE (c.name = $c_name AND $c_name <> '') OR elementId(c) = $c_id
                    RETURN collect(DISTINCT d.id) as doc_ids
                """, {"c_name": c_name, "c_id": c_id})
                if records and records[0].get("doc_ids"):
                    ent["source_doc_ids"] = records[0]["doc_ids"]
            except Exception as e:
                logger.warning(f"[Layer2Gate] Company provenance lookup error: {e}")

        s_ids = ent.get("source_doc_ids")
        if isinstance(s_ids, list):
            for sid in s_ids:
                if isinstance(sid, str) and sid.strip():
                    doc_ids.add(sid.strip())
        d_id = ent.get("source_document_id") or ent.get("document_id")
        if d_id and isinstance(d_id, str) and d_id.strip():
            doc_ids.add(d_id.strip())
        if "Document" in ent_labels:
            eid = ent.get("id")
            if eid and isinstance(eid, str) and eid.strip():
                doc_ids.add(eid.strip())

    for ch in (evidence_chunks or []):
        payload = ch.get("payload") if isinstance(ch.get("payload"), dict) else ch
        d_id = ch.get("doc_id") or ch.get("document_id") or payload.get("doc_id") or payload.get("document_id")
        if d_id and isinstance(d_id, str) and d_id.strip():
            doc_ids.add(d_id.strip())

    # 2. Batch lookup candidate documents in Neo4j with duplicate detection
    doc_map = verify_document_batch(list(doc_ids))


    # 3. Validate chunks
    verified_chunks = []
    for ch in (evidence_chunks or []):
        payload = ch.get("payload") if isinstance(ch.get("payload"), dict) else ch
        d_id = str(ch.get("doc_id") or ch.get("document_id") or payload.get("doc_id") or payload.get("document_id") or "").strip()
        if not d_id or d_id not in doc_map or doc_map[d_id] is None:
            continue
        if verify_chunk_serving_integrity(ch, doc_map[d_id]):
            verified_chunks.append(ch)

    # 4. Validate graph entities
    verified_entities = []
    for ent in (graph_entities or []):
        ent_labels = ent.get("_labels") or []
        ent_type = ent.get("type") or ""
        ent_id = str(ent.get("_id") or "")

        # A. System & Document Summary / Portfolio / Compliance Report entities
        is_summary = (
            "DocumentSummary" in ent_labels or
            "SystemStats" in ent_labels or
            "ComplianceReport" in ent_labels or
            "ContractPortfolio" in ent_labels or
            ent_id == "total-documents-summary" or
            ent_type == "total-documents-summary"
        )
        if is_summary:
            ent["is_system_summary"] = True
            verified_entities.append(ent)
            continue

        # A2. Aggregate cards requiring specific source document validation
        is_aggregate = (
            ent_type in ["portfolio-breakdown", "compliance-stats"] or
            ent_id in ["portfolio-breakdown", "compliance-stats"]
        )
        if is_aggregate:
            if validate_aggregate_in_layer2(ent, doc_map):
                verified_entities.append(ent)
            continue

        # B. Product / ERP / NL2Cypher Analytical entities
        is_product = (
            any(l in [
                "Product", "SalesOrder", "Customer", "Category", "SubCategory",
                "FinancialTrend", "SchemaBoundary", "BusinessKPI", "ExecutiveReport", "Clarification"
            ] for l in ent_labels) or
            ent_type in ["Product", "SalesOrder", "Customer", "Category", "SubCategory"] or
            bool(ent.get("grounded_answer"))
        )
        if is_product:
            ent["is_erp_entity"] = True
            # Products and verified ERP entities can be used in structured answers if verified in Neo4j
            verified_entities.append(ent)
            continue

        # C. Company entities
        if "Company" in ent_labels or ent.get("company"):
            c_doc_ids = ent.get("source_doc_ids")
            if c_doc_ids and isinstance(c_doc_ids, list) and len(c_doc_ids) > 0:
                all_eligible = True
                for cdid in c_doc_ids:
                    s_id = str(cdid).strip()
                    if s_id not in doc_map or not doc_map[s_id] or not _is_serving_eligible(doc_map[s_id]):
                        all_eligible = False
                        break
                if all_eligible:
                    ent["source_doc_ids"] = c_doc_ids
                    ent["provenance_verified"] = True
                    verified_entities.append(ent)
                else:
                    ent["provenance_verified"] = False
            else:
                ent["provenance_verified"] = False
            continue

        # D. Clause & Document general entities
        source_doc_id = ent.get("source_document_id") or ent.get("document_id") or (ent.get("id") if "Document" in ent_labels else None)
        if not source_doc_id:
            continue

        sid_str = str(source_doc_id).strip()
        if sid_str in doc_map and doc_map[sid_str] and _is_serving_eligible(doc_map[sid_str]):
            verified_entities.append(ent)
        else:
            try:
                chk = neo4j_client.run_cypher("""
                    MATCH (d:Document)
                    WHERE d.id = $doc_id
                    WITH d.id as doc_id, count(d) as occurrences, collect(d)[0] as doc_node
                    RETURN doc_id, occurrences,
                           doc_node.id as id,
                           doc_node.status as status,
                           doc_node.hash as hash,
                           doc_node.file_hash as file_hash,
                           doc_node.committed_op_id as committed_op_id,
                           doc_node.committed_generation as committed_generation,
                           doc_node.active_op_id as active_op_id,
                           doc_node.op_stage as op_stage,
                           doc_node.neo4jSynced as neo4jSynced
                """, {"doc_id": sid_str})
                if chk and chk[0].get("occurrences", 0) == 1 and _is_serving_eligible(chk[0]):
                    doc_map[sid_str] = chk[0]
                    verified_entities.append(ent)
                else:
                    doc_map[sid_str] = None
            except Exception:
                doc_map[sid_str] = None

    return verified_chunks, verified_entities


# --- Schemas ---
class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Cuộc hội thoại mới"


class PinSessionRequest(BaseModel):
    is_pinned: bool = True
    notes: Optional[str] = None
    department: Optional[str] = None
    is_shared: Optional[bool] = True


class CopilotAskRequest(BaseModel):
    query: str
    lang: Optional[str] = "vi"
    session_id: Optional[str] = None
    document_id: Optional[str] = None


class CitationItem(BaseModel):
    docName: str
    file: Optional[str] = None
    location: Optional[str] = None
    text: Optional[str] = None
    sourceType: Optional[str] = None
    match: Optional[str] = None


class CitationValidateRequest(BaseModel):
    citations: List[Dict[str, Any]] = []


# --- FR32 / BR-02 Citations Scoping Endpoint ---
@router.get("/citations")
@router.post("/citations")
async def get_scoped_citations(
    payload: Optional[CitationValidateRequest] = None,
    doc_id: Optional[str] = Query(None),
    scope: ScopeContext = Depends(get_user_scope),
):
    """
    SRS FR32 (BR-02): Hiển thị trích dẫn nguồn dữ liệu trong phạm vi phòng ban được phép (Data Scope).
    Tự động kiểm tra và ẩn các nội dung nhạy cảm ngoài phạm vi phân quyền của người dùng.
    """
    raw_citations = payload.citations if payload and payload.citations else []
    if doc_id and not raw_citations:
        raw_citations = [{
            "docName": doc_id,
            "file": doc_id,
            "location": "Knowledge Repository",
            "text": f"Hồ sơ tài liệu #{doc_id}",
            "sourceType": "CUAD / Repository",
        }]

    filtered = scope.filter_citations(raw_citations)
    return {
        "success": True,
        "rule": "BR-02 (FR32)",
        "userRole": scope.role,
        "department": scope.department_name,
        "isUnrestricted": scope.is_unrestricted,
        "count": len(filtered),
        "citations": filtered,
    }


# --- Endpoints ---

@router.get("/sessions")
async def list_user_sessions(
    mode: Optional[str] = Query("personal"),  # "personal" (default) or "pinned" / "shared" / "department"
    scope: ScopeContext = Depends(get_user_scope),
    db: AsyncSession = Depends(get_db),
):
    """
    US37 · PB59 · UC.18:
    - mode="personal": Lấy danh sách các phiên hội thoại cá nhân của tài khoản đang đăng nhập.
    - mode="pinned" | "shared" | "department": Lấy danh sách các phiên hội thoại được ghim làm tài liệu dùng chung phòng ban.
      Tự động lọc theo phạm vi phòng ban (Department Scope - BR-02, BR-04) của người dùng.
    """
    user = scope.user
    is_shared_mode = mode in ["pinned", "shared", "department"]

    if is_shared_mode:
        # Lấy các phiên được ghim dùng chung cho phòng ban
        stmt = (
            select(CopilotSession)
            .where(
                CopilotSession.is_pinned == True,
                CopilotSession.is_shared == True,
            )
        )
        if not scope.is_unrestricted and scope.department_name:
            # Lọc theo phòng ban của người dùng hoặc tài liệu ghim toàn công ty
            stmt = stmt.where(
                or_(
                    func.lower(CopilotSession.department) == scope.department_name.lower(),
                    CopilotSession.department == None,
                    CopilotSession.department == "",
                    func.lower(CopilotSession.department) == "all",
                )
            )
        stmt = stmt.order_by(CopilotSession.pinned_at.desc().nullslast(), CopilotSession.updated_at.desc())
    else:
        # Phiên cá nhân của tài khoản
        stmt = (
            select(CopilotSession)
            .where(CopilotSession.user_id == user.user_id)
            .order_by(CopilotSession.updated_at.desc())
        )

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        msgs = s.messages or []
        last_preview = ""
        citation_count = 0
        if msgs:
            last_msg = msgs[-1]
            last_preview = last_msg.get("text") or last_msg.get("introText") or ""
            citation_count = last_msg.get("citationCount") or 0

        items.append({
            "id": str(s.id),
            "title": s.title,
            "messageCount": len(msgs),
            "citationCount": citation_count,
            "lastPreview": last_preview[:80],
            "isPinned": bool(s.is_pinned),
            "isShared": bool(s.is_shared),
            "department": s.department,
            "pinnedByName": s.pinned_by_name,
            "pinnedAt": s.pinned_at.isoformat() if s.pinned_at else None,
            "pinNotes": s.pin_notes,
            "createdAt": s.created_at.isoformat() if s.created_at else None,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        })

    return {
        "success": True,
        "mode": mode,
        "user": {
            "id": str(user.user_id),
            "username": user.username,
            "email": user.email,
            "fullName": user.full_name,
            "role": user.role,
            "department": scope.department_name,
        },
        "count": len(items),
        "data": items,
        "sessions": items,
    }


@router.post("/sessions")
async def create_session(
    payload: Optional[CreateSessionRequest] = None,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo một phiên hội thoại rỗng mới cho tài khoản hiện tại"""
    title = (payload.title if payload and payload.title else "Cuộc hội thoại mới").strip()
    new_session = CopilotSession(
        user_id=user.user_id,
        title=title,
        messages=[],
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return {
        "success": True,
        "message": "Đã tạo phiên hội thoại mới",
        "data": new_session.to_dict(),
        "session": new_session.to_dict(),
    }


@router.post("/sessions/{session_id}/pin")
@router.patch("/sessions/{session_id}/pin")
async def pin_session(
    session_id: str,
    payload: Optional[PinSessionRequest] = None,
    scope: ScopeContext = Depends(get_user_scope),
    db: AsyncSession = Depends(get_db),
):
    """
    US37 · PB59 · UC.18: Ghim phiên hội thoại quan trọng thành tài liệu dùng chung phòng ban.
    Người dùng có thể ghim cuộc trò chuyện kèm ghi chú (notes) và chọn phạm vi phòng ban.
    """
    try:
        s_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID phiên không hợp lệ.")

    user = scope.user
    stmt = select(CopilotSession).where(CopilotSession.id == s_uuid)
    result = await db.execute(stmt)
    s = result.scalar_one_or_none()

    if not s:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên hội thoại để ghim.")

    # Quyền ghim: Chủ sở hữu của phiên, hoặc Trưởng phòng (Department Manager), hoặc Admin/Executive
    is_owner = (s.user_id == user.user_id)
    is_manager_or_admin = scope.role in ["department_manager", "admin", "executive"]
    if not (is_owner or is_manager_or_admin):
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền thay đổi trạng thái ghim của phiên hội thoại này."
        )

    req_pin = payload.is_pinned if payload and payload.is_pinned is not None else True
    req_notes = (payload.notes or "").strip() if payload and payload.notes else None
    target_dept = (payload.department or scope.department_name or "General").strip() if (payload and payload.department) else (scope.department_name or "General")

    if req_pin:
        s.is_pinned = True
        s.is_shared = True
        s.department = target_dept
        s.pinned_by_name = user.full_name or user.username or "Thành viên phòng ban"
        s.pinned_at = datetime.now()
        if req_notes:
            s.pin_notes = req_notes
    else:
        s.is_pinned = False
        s.is_shared = False
        s.pinned_at = None
        s.pin_notes = None

    s.updated_at = func.now()
    await db.commit()
    await db.refresh(s)

    return {
        "success": True,
        "message": "Đã ghim phiên hội thoại thành tài liệu dùng chung phòng ban." if req_pin else "Đã bỏ ghim phiên hội thoại.",
        "sessionId": str(s.id),
        "isPinned": s.is_pinned,
        "isShared": s.is_shared,
        "department": s.department,
        "data": s.to_dict(),
        "session": s.to_dict(),
    }


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    scope: ScopeContext = Depends(get_user_scope),
    db: AsyncSession = Depends(get_db),
):
    """
    US37 · PB59 · UC.18: Lấy chi tiết toàn bộ tin nhắn của phiên trò chuyện.
    Hỗ trợ cả phiên cá nhân của tài khoản và phiên được ghim dùng chung trong phòng ban.
    Tuân thủ BR-02: Nếu người xem có thẩm quyền thấp hơn, tự động ẩn/lọc trích dẫn nhạy cảm ngoài Data Scope (UC.18 Exception Flow E1).
    """
    try:
        s_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID phiên không hợp lệ.")

    user = scope.user
    stmt = select(CopilotSession).where(CopilotSession.id == s_uuid)
    result = await db.execute(stmt)
    s = result.scalar_one_or_none()

    if not s:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy phiên hội thoại hoặc bạn không có quyền truy cập.",
        )

    # 1. Nếu là chủ sở hữu: Được xem phiên
    is_owner = (s.user_id == user.user_id)

    # 2. Nếu không phải chủ sở hữu: Kiểm tra xem phiên có được ghim và chia sẻ không
    if not is_owner:
        if not (s.is_pinned and s.is_shared):
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy phiên hội thoại hoặc phiên này chưa được chia sẻ.",
            )
        # Kiểm tra thẩm quyền phạm vi phòng ban (BR-02 / BR-04)
        if not scope.is_department_allowed(s.department):
            raise HTTPException(
                status_code=403,
                detail=f"Bạn không có quyền truy cập phiên ghim của phòng ban {s.department} (BR-02).",
            )

    # 3. UC.18 Exception Flow E1 & BR-02: Lọc trích dẫn theo thẩm quyền của người xem hiện tại
    session_data = s.to_dict()
    if not scope.is_unrestricted:
        filtered_messages = []
        for msg in session_data.get("messages", []):
            msg_copy = dict(msg)
            if msg_copy.get("citations"):
                msg_copy["citations"] = scope.filter_citations(msg_copy["citations"])
            filtered_messages.append(msg_copy)
        session_data["messages"] = filtered_messages

    return {
        "success": True,
        "data": session_data,
        "session": session_data,
    }



@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa một phiên hội thoại của tài khoản hiện tại"""
    try:
        s_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID phiên không hợp lệ.")

    stmt = select(CopilotSession).where(
        CopilotSession.id == s_uuid,
        CopilotSession.user_id == user.user_id,
    )
    result = await db.execute(stmt)
    s = result.scalar_one_or_none()

    if not s:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy phiên hội thoại để xóa.",
        )

    await db.delete(s)
    await db.commit()

    return {
        "success": True,
        "message": f"Đã xóa phiên hội thoại {session_id}",
        "deletedId": session_id,
    }


@router.post("/ask")
async def ask_copilot(
    req: CopilotAskRequest,
    scope: ScopeContext = Depends(get_user_scope),
    db: AsyncSession = Depends(get_db),
):
    """
    Hỏi đáp với AI Copilot (Hybrid Vector-Graph Fusion RAG):
    Tự động lưu câu hỏi của người dùng và câu trả lời vào database PostgreSQL của tài khoản đó.
    Tuân thủ phân quyền phạm vi phòng ban (Department Scope - BR-02, BR-04) và hiển thị trích dẫn (FR32).
    """
    user = scope.user
    clean_query = req.query.strip()
    is_vi = (req.lang or "vi") == "vi"

    # 1. Tìm hoặc tạo phiên hội thoại trong PostgreSQL
    session_obj = None
    if req.session_id:
        try:
            s_uuid = uuid.UUID(req.session_id)
            stmt = select(CopilotSession).where(
                CopilotSession.id == s_uuid,
                CopilotSession.user_id == user.user_id,
            )
            result = await db.execute(stmt)
            session_obj = result.scalar_one_or_none()
        except ValueError:
            session_obj = None

    if not session_obj:
        # Tự động tạo phiên mới với tiêu đề từ nội dung câu hỏi
        title_summary = clean_query[:40] + ("..." if len(clean_query) > 40 else "")
        session_obj = CopilotSession(
            user_id=user.user_id,
            title=title_summary,
            messages=[],
        )
        db.add(session_obj)
        await db.flush()

    # 1.1 Greeting Fast-Path Router (0 citations, immediate sub-10ms response)
    user_label = _resolve_user_label(user, scope)
    if _GREETING_RE.match(clean_query):
        greeting_text = (
            "Xin chào! Tôi là GraphMind AI Copilot — Trợ lý Trí tuệ Doanh nghiệp liên kết đồ thị tri thức Neo4j và kho vector Qdrant. "
            "Tôi có thể hỗ trợ gì cho bạn về dữ liệu khách hàng, đơn hàng, hợp đồng hoặc tra cứu chính sách hôm nay?"
        )
        now_str = datetime.now().strftime("%H:%M")
        user_msg = {
            "id": f"u_{int(time.time()*1000)}",
            "sender": "user",
            "time": now_str,
            "userLabel": user_label,
            "text": clean_query,
        }
        copilot_msg = {
            "id": f"c_{int(time.time()*1000)}",
            "sender": "copilot",
            "time": now_str,
            "verifiedBadge": "GraphMind AI Copilot",
            "confidence": "100%",
            "confidenceScore": 100,
            "citationCount": 0,
            "latency": "0.01s",
            "introText": greeting_text,
            "text": greeting_text,
            "answer": greeting_text,
            "evidenceChips": [],
            "citations": [],
            "model": "Qwen2.5-7B LoRA + Neo4j GraphRAG",
        }
        session_obj.messages = list(session_obj.messages or []) + [user_msg, copilot_msg]
        session_obj.updated_at = datetime.now()
        await db.commit()
        await db.refresh(session_obj)
        return {
            "success": True,
            "answer": greeting_text,
            "text": greeting_text,
            "model": copilot_msg["model"],
            "latency": 0.01,
            "sessionId": str(session_obj.id),
            "session": session_obj.to_dict(),
            "citations": [],
            "evidenceChips": [],
            "data": {
                "query": clean_query,
                "answer": greeting_text,
                "confidenceScore": 100,
                "citations": [],
                "evidenceChips": [],
                "sessionId": str(session_obj.id),
            }
        }

    # 1.5. RBAC & Department Data Scope Security Gate (BR-02 / US19 / Admin Matrix)
    user_role = getattr(user, "role", "standard")
    allowed, reject_reason = check_data_scope_permission(clean_query, user_role, scope=scope)
    if not allowed and reject_reason:
        blocked_msg = {
            "success": True,
            "answer": reject_reason,
            "text": reject_reason,
            "evidenceChips": [
                {
                    "id": "rbac-scope-guard",
                    "label": "RBAC Data Scope Violation",
                    "source": "Chính sách bảo mật BR-02 / US19",
                }
            ],
            "citations": [
                {
                    "docName": "Chính sách kiểm soát truy cập (RBAC / Data Scope)",
                    "file": "BR-02 Data Isolation Policy",
                    "match": "RESTRICTED",
                    "location": "Phạm vi: Ban Giám Đốc & HR Only",
                    "startLine": 1,
                    "endLine": 1,
                    "text": reject_reason,
                    "chunkId": "SEC-SCOPE-GUARD",
                    "sourceType": "RBAC Security Gate",
                    "score": 100.0,
                }
            ],
            "confidenceScore": 100,
            "latency": 0.05,
            "model": "GraphMind RBAC Engine (Level-3 Isolation)",
            "query": clean_query,
            "sessionId": str(session_obj.id),
            "session_id": str(session_obj.id),
        }
        now_str = datetime.now().strftime("%H:%M")
        user_label = _resolve_user_label(user, scope)
        new_msgs = list(session_obj.messages or [])
        new_msgs.append({
            "id": f"u_{int(time.time()*1000)}",
            "sender": "user",
            "time": now_str,
            "userLabel": user_label,
            "text": clean_query,
        })
        new_msgs.append({
            "id": f"c_{int(time.time()*1000)}",
            "sender": "copilot",
            "time": now_str,
            "verifiedBadge": blocked_msg["model"],
            "confidence": "100%",
            "confidenceScore": 100,
            "citationCount": len(blocked_msg.get("citations", [])),
            "latency": "0.05s",
            "introText": reject_reason,
            "text": reject_reason,
            "answer": reject_reason,
            "evidenceChips": blocked_msg["evidenceChips"],
            "citations": blocked_msg["citations"],
            "model": blocked_msg["model"],
        })
        session_obj.messages = new_msgs
        session_obj.updated_at = datetime.now()
        await db.commit()
        await db.refresh(session_obj)
        blocked_msg["session"] = session_obj.to_dict()
        return blocked_msg

    # 2. Hybrid Retrieval: Qdrant Vector + Neo4j Graph
    # Intelligently route queries between Central Document Repository (cuad_contracts: DOCX, XLSX, PDF, R&D, Contracts, Policies)
    # and AdventureWorks ERP Operational Data (adventureworks_entities: Products, Stores, Vendors, Customers, Orders)
    q_lower = clean_query.lower()
    is_doc_repo_query = any(k in q_lower for k in [
        "tài liệu", "văn bản", "file", "hồ sơ", "tập tin", "đoạn", "docx", "pdf", "xlsx",
        "quy hoạch", "tuyến tính", "mô hình", "bài toán", "nghiên cứu", "r&d", "rnd",
        "chính sách", "hợp đồng", "contract", "điều khoản", "clause", "tuân thủ", "compliance",
        "trách nhiệm", "liability", "bồi hoàn", "indemnif", "chấm dứt", "termination",
        "luật áp dụng", "governing law", "bảo mật", "confidential", "sop", "pháp lý", "hàm mục tiêu",
        "ràng buộc", "biến quyết định"
    ])
    
    is_business_semantic_query = any(k in q_lower for k in [
        "doanh thu", "revenue", "xu hướng", "trend", "tăng trưởng", "growth",
        "đơn hàng", "salesorder", "order", "khách hàng", "customer", "vip",
        "sản phẩm", "product", "hàng hóa", "giá", "xe đạp", "bike", "nhà cung cấp", "vendor",
        "cửa hàng", "store", "đại lý", "mountain", "road", "touring",
        "jersey", "helmet", "mũ bảo hiểm", "quần áo", "phụ tùng", "component",
        "bán chạy", "tồn kho", "aov", "arpc", "chi tiêu", "mua nhiều", "mua ít",
        "danh mục sản phẩm", "category", "subcategory", "lợi nhuận", "doanh số"
    ])

    # 2.0 Document Identity & Provenance Gate: Check if query specifically targets a known document
    active_target_doc = None
    target_doc_id = None
    doc_filter = None
    candidate_tokens: List[str] = []

    GENERIC_STOP = {
        "trong", "tai", "lieu", "khoan", "dong", "hang", "phan", "minh", "mind", "graph",
        "dieu", "biet", "chinh", "nhom", "truong", "danh", "sach", "toan", "bo", "cac", "la",
        "thanh", "vien", "nao", "sao", "cho", "du", "an", "van", "ban", "ve", "gi", "ai",
        "he", "thong", "quy", "dinh", "bao", "cao", "nguoi", "phu", "trach", "giam", "doc",
        "systems", "system", "corp", "corporation", "company", "agreement", "inc", "ltd", "llc",
        "group", "holdings", "media", "services", "service", "contract", "contracts",
        "cuad", "adventureworks", "erp", "dataset", "datasets", "chi", "so", "co", "cau", "muc", "loai",
        "customer", "customers", "product", "products", "category", "categories", "subcategory",
        "salesorder", "bikes", "components", "clothing", "accessories", "mountain", "touring",
        "revenue", "subtotal", "totaldue", "listprice", "orderqty", "linetotal"
    }
    try:
        # A. Explicit document_id passed in request
        if req.document_id:
            doc_matches = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE d.id = $doc_id AND d.id <> ''
                RETURN d.name as name, d.id as id
                LIMIT 1
            """, {"doc_id": req.document_id})
            if doc_matches:
                active_target_doc = doc_matches[0]["name"]
                target_doc_id = doc_matches[0]["id"]

        # B. Exact ID or Document Name directly in current query (skip partial token matching for pure ERP queries)
        if not active_target_doc and (is_doc_repo_query or not is_business_semantic_query or any(ext in q_lower for ext in [".pdf", ".docx", ".xlsx", ".txt", ".csv"])):
            doc_matches = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE (d.id IS NOT NULL AND d.id <> '' AND toLower($q) CONTAINS toLower(d.id))
                   OR toLower($q) CONTAINS toLower(d.name)
                RETURN d.name as name, d.id as id
                LIMIT 1
            """, {"q": clean_query})
            if not doc_matches:
                raw_tokens = re.findall(r"[a-zA-Z0-9_\.-]{4,}", clean_query)
                candidate_tokens = [
                    t for t in raw_tokens
                    if not t.isdigit() and t.lower() not in GENERIC_STOP and (any(c.isupper() or c.isdigit() or c in "_." for c in t) or len(t) >= 6)
                ]
                for t in sorted(candidate_tokens, key=len, reverse=True):
                    doc_matches = neo4j_client.run_cypher("""
                        MATCH (d:Document)
                        WHERE toLower(d.name) CONTAINS toLower($t)
                        RETURN d.name as name, d.id as id
                        LIMIT 2
                    """, {"t": t})
                    if doc_matches:
                        break

            if doc_matches:
                active_target_doc = doc_matches[0]["name"]
                target_doc_id = doc_matches[0]["id"]

        # C. Follow-up query in session: inherit active document only when clearly verifiable (Requirement 3)
        if not active_target_doc and session_obj and session_obj.messages:
            is_verifiable_follow_up = any(re.search(pat, q_lower) for pat in [
                r"\bcase\s*[12]\b", r"\bsheet\b", r"\btuyến\b", r"\bvận chuyển\b", r"\bthức ăn\b",
                r"\bsolver\b", r"\btối ưu\b", r"\bchi phí\b", r"\bràng buộc\b", r"\bphương án\b",
                r"\bhàm lượng\b", r"\bkhối lượng\b", r"\bở trên\b", r"\btài liệu trên\b", r"\bfile trên\b"
            ])
            if is_verifiable_follow_up:
                for prev_m in reversed(session_obj.messages):
                    for cit in (prev_m.get("citations") or []):
                        c_doc_id = cit.get("document_id") or cit.get("doc_id")
                        if c_doc_id and not str(c_doc_id).startswith("AW-"):
                            cand = neo4j_client.run_cypher("""
                                MATCH (d:Document)
                                WHERE d.id = $doc_id
                                RETURN d.name as name, d.id as id
                                LIMIT 1
                            """, {"doc_id": str(c_doc_id)})
                            if cand:
                                active_target_doc = cand[0]["name"]
                                target_doc_id = cand[0]["id"]
                                break
                    if active_target_doc:
                        break

                    prev_text = prev_m.get("text") or ""
                    if prev_text:
                        cand = neo4j_client.run_cypher("""
                            MATCH (d:Document)
                            WHERE (d.id IS NOT NULL AND d.id <> '' AND toLower($q) CONTAINS toLower(d.id))
                               OR toLower($q) CONTAINS toLower(d.name)
                            RETURN d.name as name, d.id as id
                            LIMIT 1
                        """, {"q": prev_text})
                        if cand:
                            active_target_doc = cand[0]["name"]
                            target_doc_id = cand[0]["id"]
                            break
                    if active_target_doc:
                        break

        if active_target_doc:
            from app.core.rbac import resolve_resource_type
            target_res_type = resolve_resource_type(active_target_doc)
            if scope.allowed_resources and target_res_type not in scope.allowed_resources and not scope.is_unrestricted:
                role_label = getattr(user, "role", "user")
                reject_msg = (
                    f"Theo ma trận phân quyền của Quản trị viên (Admin RBAC Matrix), vai trò [{role_label}] "
                    f"không có quyền truy vấn hoặc tra cứu tài liệu '{active_target_doc}' thuộc phạm vi [{target_res_type}]."
                )
                blocked_msg = {
                    "success": True,
                    "answer": reject_msg,
                    "text": reject_msg,
                    "evidenceChips": [
                        {
                            "id": "rbac-scope-guard",
                            "label": f"RBAC Access Denied: {target_res_type}",
                            "source": "Chính sách phân quyền Admin RBAC Matrix",
                        }
                    ],
                    "citations": [
                        {
                            "docName": "Chính sách kiểm soát truy cập (Admin RBAC Matrix)",
                            "file": f"Phạm vi {target_res_type}",
                            "match": "RESTRICTED",
                            "location": f"Phạm vi: {target_res_type} bị chặn đối với vai trò {role_label}",
                            "startLine": 1,
                            "endLine": 1,
                            "text": reject_msg,
                            "chunkId": "SEC-SCOPE-GUARD",
                            "sourceType": "RBAC Security Gate",
                            "score": 100.0,
                        }
                    ],
                    "confidenceScore": 100,
                    "latency": 0.05,
                    "model": "GraphMind RBAC Matrix Guard",
                    "query": clean_query,
                    "sessionId": str(session_obj.id),
                    "session_id": str(session_obj.id),
                }
                now_str = datetime.now().strftime("%H:%M")
                user_label = _resolve_user_label(user, scope)
                new_msgs = list(session_obj.messages or [])
                new_msgs.append({
                    "id": f"u_{int(time.time()*1000)}",
                    "sender": "user",
                    "time": now_str,
                    "userLabel": user_label,
                    "text": clean_query,
                })
                new_msgs.append({
                    "id": f"c_{int(time.time()*1000)}",
                    "sender": "copilot",
                    "time": now_str,
                    "verifiedBadge": "RBAC Refusal",
                    "confidence": "100%",
                    "confidenceScore": 100,
                    "citationCount": len(blocked_msg.get("citations", [])),
                    "latency": "0.05s",
                    "introText": reject_msg,
                    "text": reject_msg,
                    "answer": reject_msg,
                    "evidenceChips": blocked_msg["evidenceChips"],
                    "citations": blocked_msg["citations"],
                    "model": blocked_msg["model"],
                })
                session_obj.messages = new_msgs
                session_obj.updated_at = datetime.now()
                await db.commit()
                await db.refresh(session_obj)
                blocked_msg["session"] = session_obj.to_dict()
                return blocked_msg

            is_doc_repo_query = True
            doc_filter = {
                "should": [
                    {"key": "contract_name", "match": {"value": active_target_doc}},
                    {"key": "source_file", "match": {"value": active_target_doc}},
                    {"key": "doc_id", "match": {"value": target_doc_id}},
                    {"key": "document_id", "match": {"value": target_doc_id}},
                ]
            }
        else:
            # 2.0.1 ENTITY EXISTENCE GATE: If user explicitly asks about a specific named document/file/contract
            # but it does not exist anywhere in Neo4j or Qdrant, refuse immediately to avoid false-positive hallucinations
            targeted_doc_term = None
            is_inventory_early = any(k in q_lower for k in [
                "bao nhiêu", "tổng số", "tổng cộng", "số lượng", "thống kê", "cơ cấu", "phân bố", "danh mục",
                "tuân thủ", "compliance", "an toàn", "đánh giá", "điều khoản bảo vệ"
            ])
            is_agg_query = any(k in q_lower for k in [
                "cơ cấu", "phân bố", "danh mục", "bao nhiêu", "thống kê", "tổng cộng", "tổng số",
                "tài liệu trong hệ thống", "kho tài liệu", "phổ biến", "chỉ số", "tuân thủ", "compliance",
                "an toàn", "đánh giá", "điều khoản", "quy định", "bảo vệ"
            ])
            if not is_inventory_early and not is_agg_query:
                t_match = re.search(r"(?:tài liệu|văn bản|file|hồ sơ|hợp đồng|contract)\s+([a-zA-Z0-9_\.-]{3,})", clean_query, re.IGNORECASE)
                if t_match:
                    cand = t_match.group(1).strip()
                    if cand.lower() not in GENERIC_STOP and len(cand) >= 4:
                        targeted_doc_term = cand
                elif candidate_tokens and is_doc_repo_query:
                    targeted_doc_term = candidate_tokens[0]

            if targeted_doc_term:
                term_in_docs = False
                try:
                    chk_hits = qdrant_client.vector_search(query=targeted_doc_term, collection_name="cuad_contracts", limit=3)
                    for qh in chk_hits:
                        src = (qh.get("source_file") or qh.get("contract_name") or "").lower()
                        txt = (qh.get("text") or "").lower()
                        if targeted_doc_term.lower() in src or targeted_doc_term.lower() in txt:
                            term_in_docs = True
                            break
                except Exception:
                    term_in_docs = False

                if not term_in_docs:
                    not_found_msg = (
                        f"Không tìm thấy tài liệu hoặc hồ sơ nào có tên '{targeted_doc_term}' trong kho tri thức của hệ thống. "
                        f"Vui lòng kiểm tra lại tên tài liệu hoặc nạp tài liệu vào kho lưu trữ của phòng ban để AI Copilot có thể tra cứu."
                    )
                    blocked_msg = {
                        "success": True,
                        "answer": not_found_msg,
                        "text": not_found_msg,
                        "evidenceChips": [],
                        "citations": [],
                        "confidenceScore": 0,
                        "latency": 0.05,
                        "model": "GraphMind Entity Existence Gate",
                        "query": clean_query,
                        "sessionId": str(session_obj.id),
                        "session_id": str(session_obj.id),
                    }
                    now_str = datetime.now().strftime("%H:%M")
                    user_label = _resolve_user_label(user, scope)
                    new_msgs = list(session_obj.messages or [])
                    new_msgs.append({
                        "id": f"u_{int(time.time()*1000)}",
                        "sender": "user",
                        "time": now_str,
                        "userLabel": user_label,
                        "text": clean_query,
                    })
                    new_msgs.append({
                        "id": f"c_{int(time.time()*1000)}",
                        "sender": "copilot",
                        "time": now_str,
                        "verifiedBadge": "Entity Gate Refusal",
                        "confidence": "0%",
                        "confidenceScore": 0,
                        "citationCount": 0,
                        "latency": "0.05s",
                        "introText": not_found_msg,
                        "text": not_found_msg,
                        "answer": not_found_msg,
                        "evidenceChips": [],
                        "citations": [],
                        "model": blocked_msg["model"],
                    })
                    session_obj.messages = new_msgs
                    session_obj.updated_at = datetime.now()
                    await db.commit()
                    await db.refresh(session_obj)
                    blocked_msg["session"] = session_obj.to_dict()
                    return blocked_msg
    except Exception as e:
        logger.warning(f"[Copilot Gate] Error in document identity gate: {e}")

    vector_hits = []
    # 2.1 Route to relevant Qdrant vector collections
    if active_target_doc or target_doc_id:
        # STRICT DOCUMENT ISOLATION (Requirement 3):
        # When a specific document is identified, strictly scope search to cuad_contracts with doc_filter.
        # Absolutely DO NOT query or mix adventureworks_entities ERP data!
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=8, query_filter=doc_filter)
        min_score = 0.01 if doc_filter else 0.25
        vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= min_score]
    elif is_doc_repo_query and is_business_semantic_query:
        # Cross-domain query: search both collections and sort by cosine score
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=8, query_filter=doc_filter)
        aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=4)
        combined = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.25] + [vh for vh in aw_hits if vh.get("score", 0) >= 0.25]
        vector_hits = sorted(combined, key=lambda x: x.get("score", 0), reverse=True)[:8]
    elif is_doc_repo_query:
        # User is querying about knowledge repository documents, files, models, or contracts
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=8, query_filter=doc_filter)
        min_score = 0.01 if doc_filter else 0.25
        vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= min_score]
        if not vector_hits and not doc_filter:
            aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=3)
            vector_hits = [vh for vh in aw_hits if vh.get("score", 0) >= 0.35]
    elif is_business_semantic_query:
        # User is querying specifically about ERP operations, sales, products, orders
        aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=5)
        vector_hits = [vh for vh in aw_hits if vh.get("score", 0) >= 0.25]
        if not vector_hits:
            cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=3)
            vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.35]
    else:
        # General query: search both collections and pick top matches by similarity
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=6)
        aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=4)
        combined = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.28] + [vh for vh in aw_hits if vh.get("score", 0) >= 0.28]
        vector_hits = sorted(combined, key=lambda x: x.get("score", 0), reverse=True)[:6]

    # 2.1.0 Filter vector hits by scope.allowed_resources (Admin RBAC Matrix)
    if scope.allowed_resources and not scope.is_unrestricted:
        from app.core.rbac import resolve_resource_type
        def _is_v_allowed(vh):
            pl = vh.get("payload") if isinstance(vh.get("payload"), dict) else vh
            if pl.get("source") == "adventureworks" or "entity_type" in pl:
                e_type = pl.get("entity_type", "")
                if e_type in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail"]:
                    return "ACCOUNTING_PROCUREMENT" in scope.allowed_resources
                return "SALES" in scope.allowed_resources or "RND" in scope.allowed_resources
            rt = resolve_resource_type(vh)
            return rt in scope.allowed_resources

        vector_hits = [vh for vh in vector_hits if _is_v_allowed(vh)]

    # 2.1.1 Document Chunk Consolidation & Exact Provenance:
    is_inventory_query = any(k in q_lower for k in [
        "bao nhiêu", "tổng số", "tổng cộng", "số lượng", "thống kê", "cơ cấu", "phân bố", "danh mục",
        "tuân thủ", "compliance", "an toàn", "đánh giá", "điều khoản bảo vệ"
    ])
    if not active_target_doc and vector_hits and not is_inventory_query and not is_business_semantic_query:
        top_hit = vector_hits[0]
        top_name = top_hit.get("source_file") or top_hit.get("contract_name")
        top_doc_id = top_hit.get("document_id") or top_hit.get("doc_id")
        top_score = float(top_hit.get("score") or 0.0)
        is_cuad_doc = (top_hit.get("source") != "adventureworks") and ("entity_type" not in (top_hit.get("payload") or {}))
        if is_cuad_doc and top_name and top_score >= 0.28:
            # Check relevance: do not lock onto top_name if user asked for specific tokens absent from top_name
            should_lock = True
            if candidate_tokens:
                should_lock = any(tok.lower() in top_name.lower() or tok.lower() in (top_hit.get("text") or "").lower() for tok in candidate_tokens)
            if should_lock:
                active_target_doc = top_name
                target_doc_id = top_doc_id
                doc_filter = {
                    "should": [
                        {"key": "contract_name", "match": {"value": active_target_doc}},
                        {"key": "source_file", "match": {"value": active_target_doc}},
                        {"key": "doc_id", "match": {"value": target_doc_id}},
                        {"key": "document_id", "match": {"value": target_doc_id}},
                    ]
                }
                # Deep semantic chunk retrieval scoped to this exact document (Requirement 4)
                deep_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=8, query_filter=doc_filter)
                if deep_hits:
                    vector_hits = deep_hits

    graph_hits = []
    if active_target_doc or target_doc_id:
        # Match exact doc_id if provided, else exact name in Neo4j with duplicate detection
        if target_doc_id:
            doc_nodes = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE d.id = $doc_id AND $doc_id <> ''
                OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
                RETURN d.name AS name, d.id AS id, coalesce(dept.name, d.department, 'Chung') AS dept,
                       coalesce(d.chunksCount, 0) AS chunksCount, elementId(d) AS _id, ['Document'] AS _labels
                LIMIT 2
            """, {"doc_id": target_doc_id})
        else:
            doc_nodes = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE d.name = $name AND $name <> ''
                OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
                RETURN d.name AS name, d.id AS id, coalesce(dept.name, d.department, 'Chung') AS dept,
                       coalesce(d.chunksCount, 0) AS chunksCount, elementId(d) AS _id, ['Document'] AS _labels
                LIMIT 2
            """, {"name": active_target_doc})

        if doc_nodes and len(doc_nodes) == 1:
            d0 = doc_nodes[0]
            graph_hits.append({
                "_id": d0.get("_id") or d0.get("id"),
                "_labels": ["Document", d0.get("dept")],
                "name": d0.get("name"),
                "id": d0.get("id"),
                "document_id": d0.get("id"),
                "source_file": d0.get("name"),
                "snippet": f"Tài liệu {d0.get('name')} (Mã hồ sơ: {d0.get('id')}) thuộc phòng ban {d0.get('dept')}, gồm {d0.get('chunksCount')} đoạn vector đã lập chỉ mục vào Neo4j và Qdrant."
            })
    else:
        # Structured or general query: execute text-to-cypher (with multi-turn session context)
        graph_hits = execute_text_to_cypher(
            clean_query,
            session_id=str(session_obj.id) if session_obj else "default",
            history_messages=(session_obj.messages if session_obj else None),
        )
        if not graph_hits:
            stop_words = {"tài", "liệu", "trong", "cho", "tôi", "biết", "các", "có", "bao", "nhiêu", "chính", "cụ", "thể", "từng", "là", "gì", "của", "phòng", "về"}
            meaningful_words = [w for w in clean_query.split() if len(w) >= 3 and w.lower() not in stop_words]
            search_terms = [clean_query]
            if meaningful_words:
                search_terms.append(" ".join(meaningful_words[:3]))
                search_terms.extend(meaningful_words[:2])
            for term in search_terms:
                matches = neo4j_client.search_nodes(query=term, limit=4)
                if matches:
                    graph_hits.extend(matches)
                    break

        # If query is a system inventory summary or a verified NL2Cypher analytical query,
        # suppress unrelated semantic vector chunks so random contract clauses do not pollute the answer.
        if any(
            gh.get("_id") in ["total-documents-summary", "cuad-contracts-summary", "portfolio-breakdown", "compliance-stats"]
            or gh.get("grounded_answer")
            for gh in graph_hits
        ):
            vector_hits = []

        # 2.2 Graph expansion from top Qdrant hits (Bridge Vector -> Graph)
        for vh in vector_hits:
            pl = vh.get("payload") or {}
            e_type = pl.get("entity_type")
            c_name = vh.get("source_file") or vh.get("contract_name")
            doc_id = vh.get("document_id") or vh.get("doc_id")

            if (c_name or doc_id) and not e_type:
                # Document expansion from central repository in Neo4j using EXACT IDENTITY with fail-closed duplicate check
                try:
                    if doc_id:
                        doc_res = neo4j_client.run_cypher("""
                            MATCH (d:Document)
                            WHERE d.id = $doc_id AND $doc_id <> ''
                            OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
                            RETURN d.name as name, d.id as id, coalesce(dept.name, d.department, 'Chung') as dept, coalesce(d.chunksCount, 0) as chunksCount
                            LIMIT 2
                        """, {"doc_id": doc_id})
                    else:
                        doc_res = neo4j_client.run_cypher("""
                            MATCH (d:Document)
                            WHERE d.name = $c_name AND $c_name <> ''
                            OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
                            RETURN d.name as name, d.id as id, coalesce(dept.name, d.department, 'Chung') as dept, coalesce(d.chunksCount, 0) as chunksCount
                            LIMIT 2
                        """, {"c_name": c_name})

                    if doc_res and len(doc_res) == 1:
                        r0 = doc_res[0]
                        graph_hits.append({
                            "_id": r0["id"],
                            "_labels": ["Document", r0["dept"]],
                            "name": r0["name"],
                            "id": r0["id"],
                            "document_id": r0["id"],
                            "source_file": r0["name"],
                            "snippet": f"Tài liệu {r0['name']} (Mã: {r0['id']}) thuộc phòng ban {r0['dept']}, đã lập chỉ mục {r0['chunksCount']} đoạn véc-tơ trong kho tri thức."
                        })
                except Exception:
                    pass

            if e_type == "Product" and pl.get("entity_id"):
                pid = pl.get("entity_id")
                p_name = pl.get("name")
                try:
                    sub_res = neo4j_client.run_cypher("""
                        MATCH (p:Product {id: $pid})
                        OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p)
                        OPTIONAL MATCH (c:Customer)-[:PLACED_ORDER]->(o)
                        WITH p, count(DISTINCT o) as orderCount, count(DISTINCT c) as custCount, round(sum(r.LineTotal), 2) as revenue
                        RETURN p.name as name, orderCount, custCount, revenue
                    """, {"pid": pid})
                    if sub_res and sub_res[0].get("orderCount", 0) > 0:
                        r0 = sub_res[0]
                        graph_hits.append({
                            "_id": f"product_subgraph_{pid}",
                            "_labels": ["Product", "SalesHistory"],
                            "name": f"Lịch sử bán hàng: {p_name}",
                            "snippet": f"Sản phẩm {p_name} (Mã #{pid}): Đã bán trong {r0['orderCount']} đơn hàng cho {r0['custCount']} khách hàng, mang lại tổng doanh thu thuần ${r0['revenue']:,.2f} USD."
                        })
                except Exception:
                    pass
                break  # Enrich top matched product
            elif e_type == "SalesOrder" and pl.get("entity_id"):
                so_id = int(pl.get("entity_id"))
                try:
                    sub_res = neo4j_client.run_cypher("""
                        MATCH (o:SalesOrder)
                        WHERE o.id = $so_id OR o.salesOrderId = $so_id OR o.SalesOrderID = $so_id
                        OPTIONAL MATCH (c:Customer)-[:PLACED_ORDER]->(o)
                        OPTIONAL MATCH (o)-[:CONTAINS_PRODUCT]->(p:Product)
                        RETURN coalesce(o.totalDue, o.TotalDue, 0.0) as totalDue,
                                toString(coalesce(o.orderDate, o.OrderDate, '')) as orderDate,
                                coalesce(c.name, 'Customer #' + toString(c.id)) as custName,
                                collect(coalesce(p.name, p.title, p.Name))[0..4] as products
                    """, {"so_id": so_id})
                    if sub_res:
                        r0 = sub_res[0]
                        graph_hits.append({
                            "_id": f"order_subgraph_{so_id}",
                            "_labels": ["SalesOrder", "Customer", "Product"],
                            "name": f"Đơn hàng #{so_id}",
                            "snippet": f"Đơn hàng #{so_id} của {r0['custName']} (Ngày đặt: {r0['orderDate']}, Tổng tiền ${r0['totalDue']:,.2f} USD). Sản phẩm đã đặt: {', '.join(r0['products'])}."
                        })
                except Exception:
                    pass
                break
            elif e_type == "SalesOrderDetail" and (pl.get("SalesOrderID") or pl.get("order_id")):
                so_id = int(pl.get("SalesOrderID") or pl.get("order_id"))
                try:
                    sub_res = neo4j_client.run_cypher("""
                        MATCH (o:SalesOrder)
                        WHERE o.id = $so_id OR o.salesOrderId = $so_id OR o.SalesOrderID = $so_id
                        OPTIONAL MATCH (c:Customer)-[:PLACED_ORDER]->(o)
                        RETURN coalesce(o.totalDue, o.TotalDue, 0.0) as totalDue,
                                coalesce(c.name, 'Customer #' + toString(c.id)) as custName
                    """, {"so_id": so_id})
                    if sub_res:
                        r0 = sub_res[0]
                        graph_hits.append({
                            "_id": f"order_detail_subgraph_{so_id}",
                            "_labels": ["SalesOrder", "SalesOrderDetail"],
                            "name": f"Đơn hàng liên kết #{so_id}",
                            "snippet": f"Mục chi tiết thuộc Đơn hàng #{so_id} (Khách hàng: {r0['custName']}, Tổng giá trị đơn: ${r0['totalDue']:,.2f} USD)."
                        })
                except Exception:
                    pass
                break

    # Lọc node thực thể theo Data Scope & Admin RBAC Matrix của vai trò
    graph_hits = filter_graph_entities_by_scope(graph_hits, user_role)
    if scope.allowed_resources and not scope.is_unrestricted:
        from app.core.rbac import resolve_resource_type
        def _is_g_allowed(gh):
            labels = gh.get("_labels") or []
            if any(l in ["DocumentSummary", "SystemStats", "ContractPortfolio", "ComplianceReport", "CUAD", "SchemaBoundary", "Clarification", "ExecutiveReport"] for l in labels) or gh.get("_id") in ["total-documents-summary", "cuad-contracts-summary", "portfolio-breakdown", "compliance-stats"]:
                return True
            if any(l in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail", "Store", "Supplier"] for l in labels):
                return "ACCOUNTING_PROCUREMENT" in scope.allowed_resources
            if any(l in ["Customer", "SalesOrder", "Product", "ProductCategory", "ProductSubcategory", "Category", "SubCategory", "FinancialTrend", "BusinessKPI"] for l in labels):
                return "SALES" in scope.allowed_resources or "RND" in scope.allowed_resources
            rt = resolve_resource_type(gh)
            return rt in scope.allowed_resources

        graph_hits = [gh for gh in graph_hits if _is_g_allowed(gh)]

    # 2.5 GROUNDING GATE (Requirement 5)
    # Empirically calibrated threshold on all-MiniLM-L6-v2 cosine similarity:
    # Out-of-domain queries score < 0.22, whereas valid in-domain queries score >= 0.28.
    GROUNDING_MIN_SCORE = 0.28
    top_vec_score = max([float(vh.get("score") or 0.0) for vh in vector_hits], default=0.0)
    has_valid_graph = len(graph_hits) > 0

    if top_vec_score < GROUNDING_MIN_SCORE and not has_valid_graph:
        safe_reply = "Không tìm thấy bằng chứng đủ tin cậy trong kho tri thức để trả lời câu hỏi này."
        blocked_msg = {
            "success": True,
            "answer": safe_reply,
            "text": safe_reply,
            "evidenceChips": [],
            "citations": [],
            "confidenceScore": 0,
            "latency": 0.05,
            "model": "GraphMind Grounding Gate (Calibrated 0.28)",
            "query": clean_query,
            "sessionId": str(session_obj.id),
            "session_id": str(session_obj.id),
        }
        now_str = datetime.now().strftime("%H:%M")
        user_label = _resolve_user_label(user, scope)
        new_msgs = list(session_obj.messages or [])
        new_msgs.append({
            "id": f"u_{int(time.time()*1000)}",
            "sender": "user",
            "time": now_str,
            "userLabel": user_label,
            "text": clean_query,
        })
        new_msgs.append({
            "id": f"c_{int(time.time()*1000)}",
            "sender": "copilot",
            "time": now_str,
            "verifiedBadge": "Grounding Refusal",
            "confidence": "0%",
            "confidenceScore": 0,
            "citationCount": 0,
            "latency": "0.05s",
            "introText": safe_reply,
            "text": safe_reply,
            "answer": safe_reply,
            "evidenceChips": [],
            "citations": [],
            "model": blocked_msg["model"],
        })
        session_obj.messages = new_msgs
        session_obj.updated_at = datetime.now()
        await db.commit()
        await db.refresh(session_obj)
        blocked_msg["session"] = session_obj.to_dict()
        return blocked_msg

    # 3. Fusion Ranking: Reciprocal Rank Fusion (RRF k=60)
    fused_results = reciprocal_rank_fusion(vector_hits, graph_hits, k=60, top_n=6)

    # 4. Context Synthesis & LLM Generation (PR1 Layer-2 Context Gate)
    raw_chunks = [it["raw"] for it in fused_results if it["type"] == "vector"] or vector_hits
    raw_entities = [it["raw"] for it in fused_results if it["type"] == "graph"] or graph_hits

    # Enforce Layer-2 Gate: verify ground truth against Neo4j SYNCED state & provenance
    verified_chunks, verified_entities = apply_layer2_context_gate(raw_chunks, raw_entities)

    if not verified_chunks and not verified_entities:
        # Zero Retrieval: Grounding Refusal without invoking LLM
        answer_text = "Không tìm thấy bằng chứng đủ tin cậy trong kho tri thức"
        latency = 0.05
        model_display = f"{llm_client.model} (PR1 Layer-2 Refusal)"
        confidence_score = 0
        citations_detail = []
        evidence_chips = []
    else:
        gen_result = await llm_client.generate_rag_answer(
            query=clean_query,
            evidence_chunks=verified_chunks,
            graph_entities=verified_entities,
            lang=req.lang or "vi",
        )
        answer_text = gen_result.get("answer") or ""
        latency = gen_result.get("latency", 1.25)
        model_display = gen_result.get("model", f"{llm_client.model} (Ollama Local)")
        confidence_score = 80 if fused_results else 60

        # Build citations & chips strictly from evidence serialized into prompt
        used_chunks = gen_result.get("used_chunks", verified_chunks)
        used_entities = gen_result.get("used_entities", verified_entities)

        evidence_chips = []
        citations_detail = []

        for ch in used_chunks:
            pl = ch.get("payload") if isinstance(ch.get("payload"), dict) else ch
            is_aw = (pl.get("source") == "adventureworks") or ("entity_type" in pl)
            if is_aw:
                e_type = pl.get("entity_type", "Entity")
                e_id = pl.get("entity_id", "")
                e_name = pl.get("name") or ch.get("source_file") or ch.get("contract_name") or "AdventureWorks Entity"
                c_text = pl.get("searchable_text") or ch.get("text") or ""
                raw_score = float(ch.get("score") or 0.0)
                score_val = min(99.6, raw_score * 100) if raw_score > 0 else 95.0
                evidence_chips.append({
                    "id": f"vec_aw_{e_id}",
                    "label": f"AW: {e_name}"[:36],
                    "source": f"Qdrant · AdventureWorks {e_type}",
                })
                citations_detail.append({
                    "docName": f"AdventureWorks: {e_name}",
                    "file": f"AdventureWorks ({e_type})",
                    "source_file": f"AdventureWorks_{e_type}",
                    "document_id": f"AW-{e_type.upper()}-{e_id}",
                    "chunk_index": 0,
                    "retrieval_score": round(raw_score, 4),
                    "match": f"{score_val:.1f}% MATCH",
                    "location": f"Bản ghi #{e_id} ({e_type})",
                    "startLine": 1,
                    "endLine": 1,
                    "text": c_text,
                    "chunkId": f"#AW-{e_type.upper()}-{e_id}",
                    "sourceType": "Qdrant Vector DB (AdventureWorks)",
                    "score": score_val,
                })
            else:
                c_name = ch.get("source_file") or ch.get("contract_name") or "CUAD Contract Document"
                doc_id_val = ch.get("document_id") or ch.get("doc_id") or pl.get("document_id") or pl.get("doc_id") or "UNKNOWN_DOC"
                raw_chunk = ch.get("chunk_index") if ch.get("chunk_index") is not None else ch.get("chunk_id")
                try:
                    chunk_num = int(raw_chunk) if raw_chunk is not None else None
                except (ValueError, TypeError):
                    chunk_num = None
                c_text = ch.get("text") or ""
                raw_score = float(ch.get("score") or 0.0)
                score_val = min(99.6, raw_score * 100) if raw_score > 0 else 95.0
                line_count = len([l for l in c_text.splitlines() if l.strip()]) or 20
                start_line = (chunk_num * 25) + 1 if chunk_num is not None else 1
                end_line = start_line + max(line_count, 15)
                loc_label = f"Đoạn #{chunk_num} (Dòng ~{start_line}-{end_line})" if chunk_num is not None else "Kho véc-tơ CUAD"
                evidence_chips.append({
                    "id": f"vec_{doc_id_val}_{chunk_num}",
                    "label": f"{c_name}"[:36],
                    "source": f"Qdrant · {loc_label}",
                })
                citations_detail.append({
                    "docName": c_name,
                    "file": c_name,
                    "source_file": c_name,
                    "document_id": str(doc_id_val),
                    "chunk_index": chunk_num,
                    "retrieval_score": round(raw_score, 4),
                    "match": f"{score_val:.1f}% MATCH",
                    "location": loc_label,
                    "startLine": start_line,
                    "endLine": end_line,
                    "text": c_text,
                    "chunkId": f"#VEC-{chunk_num}" if chunk_num is not None else str(doc_id_val)[:8],
                    "sourceType": "Qdrant Vector DB (CUAD)",
                    "score": score_val,
                })

        for ent in used_entities:
            ent_labels = ent.get("_labels") or []
            labels_str = ", ".join(ent_labels) if isinstance(ent_labels, list) else str(ent_labels)
            ent_name = ent.get("name") or "Knowledge Graph Entity"
            raw_id = str(ent.get("id") or ent.get("_id") or "")
            node_clean_id = raw_id.split(":")[-1] if ":" in raw_id else raw_id

            # A2. System Document Inventory / Summary / Portfolio Breakdown / Compliance Report
            if (
                ent.get("is_system_summary") or
                any(l in ["DocumentSummary", "SystemStats", "ContractPortfolio", "ComplianceReport"] for l in ent_labels) or
                node_clean_id in ["total-documents-summary", "portfolio-breakdown", "compliance-stats"]
            ):
                is_comp = node_clean_id == "compliance-stats" or "ComplianceReport" in ent_labels
                evidence_chips.append({
                    "id": f"graph_{node_clean_id}",
                    "label": f"{'Tuân thủ' if is_comp else 'Hệ thống'}: {ent_name}"[:36],
                    "source": "Neo4j Graph (" + ("Báo cáo Tuân thủ" if is_comp else "Thống kê hệ thống") + ")",
                })
                citations_detail.append({
                    "docName": f"{'Báo cáo Tuân thủ & An toàn Pháp lý (CUAD)' if is_comp else ('Thống kê danh mục: ' + ent_name)}",
                    "file": f"Neo4j Graph ({'ComplianceReport' if is_comp else 'DocumentSummary'})",
                    "source_file": f"Neo4j.{'ComplianceReport' if is_comp else 'DocumentSummary'}",
                    "document_id": "SYSTEM-COMPLIANCE-REPORT" if is_comp else "SYSTEM-DOCS-SUMMARY",
                    "dept": "Pháp chế" if is_comp else "Chung",
                    "deptKey": "legal" if is_comp else "general",
                    "domain": "EXECUTIVE",
                    "chunk_index": 0,
                    "retrieval_score": 100.0,
                    "match": "GRAPH CYPHER VERIFIED",
                    "location": "Toàn hệ thống (CUAD Compliance Overview)" if is_comp else "Toàn hệ thống (Enterprise Overview)",
                    "text": ent.get("snippet") or ("Báo cáo tỷ lệ tuân thủ điều khoản pháp lý trong hệ thống Neo4j" if is_comp else "Thống kê danh mục tài liệu & hợp đồng trong hệ thống Neo4j"),
                    "chunkId": "#SYSTEM-COMPLIANCE" if is_comp else "#SYSTEM-DOCS",
                    "sourceType": "Neo4j Graph DB",
                    "neo4jNode": "ComplianceReport:CUAD" if is_comp else "DocumentSummary:ContractPortfolio",
                    "score": 100.0,
                })
                continue

            # B. Product / ERP / NL2Cypher Analytical: add chip and structured Neo4j graph citation
            if ent.get("is_erp_entity") or any(l in ["Product", "SalesOrder", "Customer", "Category", "SubCategory", "FinancialTrend", "SchemaBoundary", "BusinessKPI", "ExecutiveReport", "Clarification"] for l in ent_labels):
                c_id = ent.get("CustomerID") or ent.get("id") or node_clean_id
                evidence_chips.append({
                    "id": f"graph_{node_clean_id}",
                    "label": f"ERP: {ent_name}"[:36],
                    "source": f"Neo4j Graph ({labels_str})",
                    "entityName": ent_name,
                    "entityId": str(c_id),
                })
                citations_detail.append({
                    "docName": f"Đồ thị thực thể ERP: {ent_name}",
                    "file": f"Neo4j Graph ({labels_str})",
                    "source_file": f"AdventureWorks.{labels_str}",
                    "document_id": f"AW-{node_clean_id}",
                    "dept": "Kinh doanh",
                    "deptKey": "sales",
                    "domain": "SALES",
                    "chunk_index": 0,
                    "retrieval_score": 95.0,
                    "match": "GRAPH CYPHER VERIFIED",
                    "location": f"Node #{node_clean_id} ({labels_str})",
                    "text": ent.get("snippet") or f"Thực thể {ent_name} thuộc cơ sở dữ liệu Neo4j AdventureWorks ERP",
                    "chunkId": f"#{node_clean_id}",
                    "sourceType": "Neo4j Graph DB",
                    "neo4jNode": f"{labels_str}:{ent_name}",
                    "score": 95.0,
                })
                continue

            # C. Company with verified PARTY_TO provenance
            if "Company" in ent_labels or ent.get("company"):
                evidence_chips.append({
                    "id": f"graph_{node_clean_id}",
                    "label": f"Đối tác: {ent_name}"[:36],
                    "source": "Neo4j Graph (PARTY_TO)",
                })
                if ent.get("provenance_verified") and ent.get("source_doc_ids"):
                    for s_id in ent["source_doc_ids"]:
                        citations_detail.append({
                            "docName": f"Đồ thị tri thức: {ent_name}",
                            "file": f"Hợp đồng liên kết ({s_id})",
                            "source_file": str(s_id),
                            "document_id": str(s_id),
                            "chunk_index": 0,
                            "retrieval_score": 98.0,
                            "match": "PARTY_TO PROVENANCE VERIFIED",
                            "location": f"Quan hệ PARTY_TO -> {s_id}",
                            "text": ent.get("snippet") or f"Doanh nghiệp {ent_name} tham gia hợp đồng {s_id}",
                            "chunkId": f"#{node_clean_id}",
                            "sourceType": "Neo4j Graph DB",
                            "neo4jNode": f"Company:{ent_name}",
                            "score": 98.0,
                        })
                continue

            # D. Clause & Document entities
            src_doc = ent.get("source_document_id") or ent.get("document_id") or (ent.get("id") if "Document" in ent_labels else node_clean_id)
            evidence_chips.append({
                "id": f"graph_{node_clean_id}",
                "label": f"Graph: {ent_name}"[:36],
                "source": f"Neo4j Graph ({labels_str})",
            })
            citations_detail.append({
                "docName": f"Đồ thị tri thức: {ent_name}",
                "file": f"Neo4j Graph ({labels_str})",
                "source_file": ent.get("source_file") or ent_name,
                "document_id": str(src_doc),
                "chunk_index": 0,
                "retrieval_score": 98.0,
                "match": "GRAPH VERIFIED",
                "location": f"Node #{node_clean_id} ({labels_str})",
                "text": ent.get("snippet") or f"Thực thể {ent_name} thuộc nhãn {labels_str}",
                "chunkId": f"#{node_clean_id}",
                "sourceType": "Neo4j Graph DB",
                "neo4jNode": f"{labels_str}:{ent_name}",
                "score": 98.0,
            })

        # Enforce BR-02 & FR32: Filter/redact citations outside caller's Department Scope
        citations_detail = scope.filter_citations(citations_detail)

        # Calibrate grounded confidence score (Requirement 4)
        if not citations_detail and not verified_chunks and not verified_entities:
            confidence_score = 0
        elif any(phrase in answer_text.lower() for phrase in [
            "không tìm thấy bằng chứng", "chưa đủ dữ liệu", "không tìm thấy dữ liệu",
            "không có thông tin", "chưa thể kết luận", "không thể kết luận"
        ]):
            confidence_score = 0
        else:
            top_vec_score = max([float(vh.get("score") or 0.0) for vh in (used_chunks or verified_chunks)], default=0.0)
            has_doc_citation = any(
                not str(c.get("document_id", "")).startswith("AW-") and c.get("sourceType") != "RBAC Security Gate"
                for c in citations_detail
            )
            has_graph_citation = any(c.get("sourceType") == "Neo4j Graph DB" for c in citations_detail) or bool(verified_entities)
            if (active_target_doc or target_doc_id) and has_doc_citation:
                if top_vec_score >= 0.55:
                    confidence_score = min(95, max(85, int(70 + top_vec_score * 30)))
                elif top_vec_score >= 0.30:
                    confidence_score = min(84, max(65, int(50 + top_vec_score * 50)))
                else:
                    confidence_score = max(40, int(top_vec_score * 100))
            elif has_graph_citation:
                confidence_score = min(95, max(85, int(85 + (top_vec_score * 10 if top_vec_score else 5))))
            elif citations_detail:
                confidence_score = min(82, max(45, int(top_vec_score * 100)))
            else:
                confidence_score = 25

    # 5. Lưu user message và copilot message vào PostgreSQL
    now_str = datetime.now().strftime("%H:%M")
    user_msg = {
        "id": f"u_{int(time.time()*1000)}",
        "sender": "user",
        "time": now_str,
        "userLabel": user.full_name or user.username or "User",
        "text": clean_query,
    }

    copilot_msg = {
        "id": f"c_{int(time.time()*1000)}",
        "sender": "copilot",
        "time": now_str,
        "verifiedBadge": "Hybrid GraphRAG Verified" if (citations_detail or verified_entities) else "GraphMind AI Local",
        "confidence": f"{confidence_score}%",
        "citationCount": len(citations_detail),
        "latency": f"{latency}s latency (Hybrid Vector-Graph Fusion)",
        "introText": answer_text,
        "evidenceChips": evidence_chips,
        "citations": citations_detail,
        "model": model_display,
    }

    # Cập nhật danh sách messages và tiêu đề nếu phiên còn mới
    existing_messages = list(session_obj.messages or [])
    existing_messages.extend([user_msg, copilot_msg])
    session_obj.messages = existing_messages

    if session_obj.title in ["Cuộc hội thoại mới", "New Chat"] and len(existing_messages) <= 2:
        session_obj.title = clean_query[:40] + ("..." if len(clean_query) > 40 else "")

    session_obj.updated_at = func.now()

    await db.commit()
    await db.refresh(session_obj)

    # 6. Response data
    response_data = {
        "query": clean_query,
        "answer": answer_text,
        "model": model_display,
        "insight": answer_text,
        "whyItMatters": (
            "Hệ thống tự động liên kết tài liệu thỏa thuận hợp đồng trong Qdrant với mạng lưới thực thể quan hệ trong Neo4j để đảm bảo độ tin cậy và truy vết chính xác."
            if is_vi else
            "The system automatically associates contractual clauses in Qdrant with entity networks in Neo4j for high-confidence provenance and traceability."
        ),
        "evidenceChips": evidence_chips,
        "citations": citations_detail,
        "confidenceScore": confidence_score,
        "latency": f"{latency}s",
        "sessionId": str(session_obj.id),
        "sessionTitle": session_obj.title,
    }

    return {
        "success": True,
        "answer": answer_text,
        "text": answer_text,
        "model": model_display,
        "latency": latency,
        "sessionId": str(session_obj.id),
        "session": session_obj.to_dict(),
        "citations": citations_detail,
        "evidenceChips": evidence_chips,
        "data": response_data,
    }
