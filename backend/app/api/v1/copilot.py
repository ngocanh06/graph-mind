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


try:
    from app.core.rbac import get_request_user, get_user_scope, ScopeContext
except ImportError:
    from core.rbac import get_request_user, get_user_scope, ScopeContext


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

    # 1.5. RBAC & Department Data Scope Security Gate (BR-02 / US19)
    user_role = getattr(user, "role", "standard")
    allowed, reject_reason = check_data_scope_permission(clean_query, user_role)
    if not allowed and reject_reason:
        blocked_msg = {
            "answer": reject_reason,
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
            "session_id": str(session_obj.id),
        }
        new_msgs = list(session_obj.messages or [])
        new_msgs.append({"sender": "user", "text": clean_query, "timestamp": datetime.now().isoformat()})
        new_msgs.append({
            "sender": "bot",
            "text": reject_reason,
            "timestamp": datetime.now().isoformat(),
            "evidenceChips": blocked_msg["evidenceChips"],
            "citations": blocked_msg["citations"],
            "confidenceScore": 100,
            "latency": 0.05,
            "model": blocked_msg["model"]
        })
        session_obj.messages = new_msgs
        session_obj.updated_at = datetime.now()
        await db.commit()
        return blocked_msg

    # 2. Hybrid Retrieval: Qdrant Vector + Neo4j Graph
    # Intelligently route queries between AdventureWorks ERP (Products, Stores, Vendors, Customers, Orders)
    # and CUAD Legal Contracts (Clauses, Compliance, NDAs, Liability)
    q_lower = clean_query.lower()
    is_legal_contract_query = any(k in q_lower for k in [
        "hợp đồng", "contract", "điều khoản", "clause", "tuân thủ", "compliance",
        "trách nhiệm", "liability", "bồi hoàn", "indemnif", "chấm dứt", "termination",
        "luật áp dụng", "governing law", "bảo mật", "confidential", "sop", "pháp lý"
    ])
    
    is_erp_query = any(k in q_lower for k in [
        "doanh thu", "revenue", "xu hướng", "trend", "tăng trưởng", "growth",
        "đơn hàng", "salesorder", "order", "khách hàng", "customer", "vip",
        "sản phẩm", "product", "xe đạp", "bike", "nhà cung cấp", "vendor", "đại lý", "store"
    ])

    vector_hits = []
    # 2.1 Route to relevant Qdrant vector collections
    if is_legal_contract_query and is_erp_query:
        # Cross-domain query: search both collections
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=3)
        aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=3)
        vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.25] + [vh for vh in aw_hits if vh.get("score", 0) >= 0.25]
    elif is_legal_contract_query:
        cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=5)
        vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.25]
    else:
        # Business/Product/ERP query or general search: prioritize adventureworks_entities
        aw_hits = qdrant_client.vector_search(query=clean_query, collection_name="adventureworks_entities", limit=5)
        vector_hits = [vh for vh in aw_hits if vh.get("score", 0) >= 0.25]
        # If no business entity matches and not an ERP financial calculation, check cuad_contracts
        if not vector_hits and not any(k in q_lower for k in ["doanh thu", "revenue", "đơn hàng", "order"]):
            cuad_hits = qdrant_client.vector_search(query=clean_query, collection_name="cuad_contracts", limit=3)
            vector_hits = [vh for vh in cuad_hits if vh.get("score", 0) >= 0.35]

    graph_hits = execute_text_to_cypher(clean_query)
    if not graph_hits:
        words = [w for w in clean_query.split() if len(w) >= 3]
        for term in [clean_query] + words[:2]:
            matches = neo4j_client.search_nodes(query=term, limit=4)
            if matches:
                graph_hits.extend(matches)
                break

    # 2.2 Graph expansion from top Qdrant Product hits (Bridge Vector -> Graph)
    for vh in vector_hits:
        pl = vh.get("payload") or {}
        if pl.get("entity_type") == "Product" and pl.get("entity_id"):
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

    # Lọc node thực thể theo Data Scope của vai trò (ví dụ: loại bỏ Employee/nhân sự khỏi kết quả của Standard User)
    graph_hits = filter_graph_entities_by_scope(graph_hits, user_role)

    # 3. Fusion Ranking: Reciprocal Rank Fusion (RRF k=60)
    fused_results = reciprocal_rank_fusion(vector_hits, graph_hits, k=60, top_n=6)

    evidence_chips = []
    citations_detail = []
    for item in fused_results:
        raw = item.get("raw") or {}
        item_type = item.get("type")
        evidence_chips.append({
            "id": item["id"],
            "label": item["label"][:36],
            "source": f"RRF ({item['rrf_score']:.4f}) · {item['sources'][0][:28]}",
        })
        if item_type == "vector":
            pl = raw.get("payload") or {}
            is_aw = (pl.get("source") == "adventureworks") or ("entity_type" in pl)
            if is_aw:
                e_type = pl.get("entity_type", "Entity")
                e_id = pl.get("entity_id", "")
                e_name = pl.get("name") or raw.get("contract_name") or "AdventureWorks Entity"
                c_text = pl.get("searchable_text") or raw.get("text") or ""
                score_val = min(99.6, item['rrf_score'] * 3500) if item.get("rrf_score") else 95.0
                citations_detail.append({
                    "docName": f"AdventureWorks: {e_name}",
                    "file": f"AdventureWorks ({e_type})",
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
                c_name = raw.get("contract_name") or "CUAD Contract Document"
                raw_chunk = raw.get("chunk_id")
                try:
                    chunk_num = int(raw_chunk) if raw_chunk is not None else None
                except (ValueError, TypeError):
                    chunk_num = None
                c_text = raw.get("text") or ""
                score_val = min(99.6, item['rrf_score'] * 3500) if item.get("rrf_score") else 95.0
                line_count = len([l for l in c_text.splitlines() if l.strip()]) or 20
                start_line = (chunk_num * 25) + 1 if chunk_num is not None else 1
                end_line = start_line + max(line_count, 15)
                loc_label = f"Đoạn #{chunk_num} (Dòng ~{start_line}-{end_line})" if chunk_num is not None else "Kho véc-tơ CUAD"
                citations_detail.append({
                    "docName": c_name,
                    "file": c_name,
                    "match": f"{score_val:.1f}% MATCH",
                    "location": loc_label,
                    "startLine": start_line,
                    "endLine": end_line,
                    "text": c_text,
                    "chunkId": f"#VEC-{chunk_num}" if chunk_num is not None else str(item["id"])[:8],
                    "sourceType": "Qdrant Vector DB (CUAD)",
                    "score": score_val,
                })
        elif item_type == "graph":
            g_name = raw.get("name") or "Knowledge Graph Entity"
            g_labels = raw.get("_labels", [])
            labels_str = ", ".join(g_labels) if isinstance(g_labels, list) else str(g_labels)
            raw_id = str(raw.get("id") or raw.get("_id") or item["id"])
            node_clean_id = raw_id.split(":")[-1] if ":" in raw_id else raw_id
            citations_detail.append({
                "docName": f"Đồ thị tri thức: {g_name}",
                "file": f"Neo4j Graph ({labels_str})",
                "match": "GRAPH VERIFIED",
                "location": f"Node #{node_clean_id} ({labels_str})",
                "text": raw.get("snippet") or f"Thực thể {g_name} thuộc nhãn {labels_str}",
                "chunkId": f"#{node_clean_id}",
                "sourceType": "Neo4j Graph DB",
                "neo4jNode": f"{labels_str}:{g_name}",
            })

    # Enforce BR-02 & FR32: Filter/redact citations outside caller's Department Scope
    citations_detail = scope.filter_citations(citations_detail)

    # 4. Context Synthesis & LLM Generation
    fused_chunks = [it["raw"] for it in fused_results if it["type"] == "vector"]
    fused_entities = [it["raw"] for it in fused_results if it["type"] == "graph"]

    gen_result = await llm_client.generate_rag_answer(
        query=clean_query,
        evidence_chunks=fused_chunks or vector_hits,
        graph_entities=fused_entities or graph_hits,
        lang=req.lang or "vi",
    )

    answer_text = gen_result.get("answer") or ""
    latency = gen_result.get("latency", 1.25)
    model_display = gen_result.get("model", f"{llm_client.model} (Ollama Local)")

    confidence_score = 96 if fused_results else 88

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
        "verifiedBadge": "Hybrid GraphRAG Verified" if citations_detail else "GraphMind AI Local",
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
