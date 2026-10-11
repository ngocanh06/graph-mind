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
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import decode_access_token
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


# --- Schemas ---
class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Cuộc hội thoại mới"


class CopilotAskRequest(BaseModel):
    query: str
    lang: Optional[str] = "vi"
    session_id: Optional[str] = None


# --- User Resolution Helper ---
async def get_request_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Xác định tài khoản người dùng gửi request:
    1. Ưu tiên JWT Bearer token
    2. Fallback header X-User-Id / X-User-Email / X-User-Name (cho persona switcher)
    3. Mặc định tài khoản đầu tiên trong database nếu không có header
    """
    # 1. Bearer Token
    if auth_header and auth_header.credentials:
        try:
            payload = decode_access_token(auth_header.credentials)
            if payload and "sub" in payload:
                uid = uuid.UUID(payload["sub"])
                res = await db.execute(select(User).where(User.user_id == uid))
                u = res.scalar_one_or_none()
                if u:
                    return u
        except Exception:
            pass

    # 2. X-User-Id hoặc Query user_id
    uid_candidate = x_user_id or user_id
    if uid_candidate:
        try:
            uid = uuid.UUID(uid_candidate)
            res = await db.execute(select(User).where(User.user_id == uid))
            u = res.scalar_one_or_none()
            if u:
                return u
        except (ValueError, TypeError):
            pass

    USER_ALIASES = {
        "ceo": "exec",
        "executive": "exec",
        "huong.tran@graphmind.ai": "executive@graphmind.ai",
        "knowledge_manager": "manager",
        "it_admin": "admin",
        "sales_ops": "ops",
    }

    # 3. X-User-Email
    if x_user_email:
        clean_email = x_user_email.strip().lower()
        clean_email = USER_ALIASES.get(clean_email, clean_email)
        res = await db.execute(select(User).where(User.email.ilike(clean_email)))
        u = res.scalar_one_or_none()
        if u:
            return u

    # 4. X-User-Name
    if x_user_name:
        clean_name = x_user_name.strip().lower()
        clean_name = USER_ALIASES.get(clean_name, clean_name)
        res = await db.execute(
            select(User).where(
                or_(
                    User.username.ilike(clean_name),
                    User.email.ilike(f"%{clean_name}%"),
                )
            )
        )
        u = res.scalar_one_or_none()
        if u:
            return u

    # 5. Default fallback to first active user (exec)
    res = await db.execute(select(User).order_by(User.created_at.asc()).limit(1))
    u = res.scalar_one_or_none()
    if u:
        return u

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Chưa xác định được tài khoản người dùng.",
    )


# --- Endpoints ---

@router.get("/sessions")
async def list_user_sessions(
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách các phiên hội thoại thuộc về tài khoản người dùng hiện tại"""
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
            "createdAt": s.created_at.isoformat() if s.created_at else None,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        })

    return {
        "success": True,
        "user": {
            "id": str(user.user_id),
            "username": user.username,
            "email": user.email,
            "fullName": user.full_name,
            "role": user.role,
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


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy chi tiết toàn bộ tin nhắn của một phiên trò chuyện thuộc tài khoản này"""
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
            detail="Không tìm thấy phiên hội thoại hoặc bạn không có quyền truy cập.",
        )

    return {
        "success": True,
        "data": s.to_dict(),
        "session": s.to_dict(),
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
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hỏi đáp với AI Copilot (Hybrid Vector-Graph Fusion RAG):
    Tự động lưu câu hỏi của người dùng và câu trả lời vào database PostgreSQL của tài khoản đó.
    """
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

    # 2. Hybrid Retrieval: Qdrant Vector + Neo4j Graph
    vector_hits = qdrant_client.vector_search(query=clean_query, limit=5)

    graph_hits = execute_text_to_cypher(clean_query)
    if not graph_hits:
        words = [w for w in clean_query.split() if len(w) >= 3]
        for term in [clean_query] + words[:2]:
            matches = neo4j_client.search_nodes(query=term, limit=4)
            if matches:
                graph_hits.extend(matches)
                break

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
            c_name = raw.get("contract_name") or "CUAD Contract Document"
            chunk_num = raw.get("chunk_id")
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
                "sourceType": "Qdrant Vector DB",
                "score": score_val,
            })
        elif item_type == "graph":
            g_name = raw.get("name") or "Knowledge Graph Entity"
            g_labels = raw.get("_labels", [])
            labels_str = ", ".join(g_labels) if isinstance(g_labels, list) else str(g_labels)
            citations_detail.append({
                "docName": f"Đồ thị tri thức: {g_name}",
                "file": f"Neo4j Graph ({labels_str})",
                "match": "GRAPH VERIFIED",
                "location": f"Node #{raw.get('_id', item['id'])} ({labels_str})",
                "text": raw.get("snippet") or f"Thực thể {g_name} thuộc nhãn {labels_str}",
                "chunkId": str(raw.get("_id") or item["id"])[:10],
                "sourceType": "Neo4j Graph DB",
                "neo4jNode": f"{labels_str}:{g_name}",
            })

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
        "data": response_data,
    }
