import sys
import os
import re
import asyncio
from dotenv import load_dotenv

# Reconfigure stdout for utf-8
sys.stdout.reconfigure(encoding="utf-8")

# Load backend environment variables
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
load_dotenv(os.path.join(backend_dir, ".env"))
sys.path.insert(0, backend_dir)

from sqlalchemy import select
from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client
from app.api.v1.copilot import ask_copilot, CopilotAskRequest
from app.core.rbac import ScopeContext
from app.db.postgres.models.user import User
from app.db.postgres.database import AsyncSessionLocal

def test_entity_gate_logic():
    clean_query = "tài liệu minhnguoc thuộc phòng ban nào"
    GENERIC_STOP = {
        "trong", "tai", "lieu", "khoan", "dong", "hang", "phan", "minh", "mind", "graph",
        "dieu", "biet", "chinh", "nhom", "truong", "danh", "sach", "toan", "bo", "cac", "la",
        "thanh", "vien", "nao", "sao", "cho", "du", "an", "van", "ban", "ve", "gi", "ai",
        "he", "thong", "quy", "dinh", "bao", "cao", "nguoi", "phu", "trach", "giam", "doc",
        "systems", "system", "corp", "corporation", "company", "agreement", "inc", "ltd", "llc",
        "group", "holdings", "media", "services", "service", "contract", "contracts"
    }

    # Step 1: Neo4j exact query check
    doc_matches = neo4j_client.run_cypher("""
        MATCH (d:Document)
        WHERE (d.id IS NOT NULL AND d.id <> '' AND toLower($q) CONTAINS toLower(d.id))
           OR toLower($q) CONTAINS toLower(d.name)
        RETURN d.name as name, d.id as id
        LIMIT 1
    """, {"q": clean_query})

    raw_tokens = re.findall(r"[a-zA-Z0-9_\.-]{4,}", clean_query)
    candidate_tokens = [
        t for t in raw_tokens
        if t.lower() not in GENERIC_STOP and (any(c.isupper() or c.isdigit() or c in "_." for c in t) or len(t) >= 6)
    ]

    print(f"Candidate tokens: {candidate_tokens}")
    assert "minhnguoc" in candidate_tokens, "minhnguoc should be in candidate_tokens"

    if not doc_matches:
        for t in sorted(candidate_tokens, key=len, reverse=True):
            doc_matches = neo4j_client.run_cypher("""
                MATCH (d:Document)
                WHERE toLower(d.name) CONTAINS toLower($t)
                RETURN d.name as name, d.id as id
                LIMIT 2
            """, {"t": t})
            if doc_matches:
                break

    assert len(doc_matches) == 0, "minhnguoc should NOT match any document in Neo4j"

    # Step 2: Entity Existence Gate check
    targeted_doc_term = None
    t_match = re.search(r"(?:tài liệu|văn bản|file|hồ sơ|hợp đồng|contract)\s+([a-zA-Z0-9_\.-]{3,})", clean_query, re.IGNORECASE)
    if t_match:
        cand = t_match.group(1).strip()
        if cand.lower() not in GENERIC_STOP and len(cand) >= 4:
            targeted_doc_term = cand

    print(f"Targeted doc term extracted: '{targeted_doc_term}'")
    assert targeted_doc_term == "minhnguoc", f"Expected targeted_doc_term to be 'minhnguoc', got '{targeted_doc_term}'"

    term_in_docs = False
    try:
        chk_hits = qdrant_client.vector_search(query=targeted_doc_term, collection_name="cuad_contracts", limit=3)
        for qh in chk_hits:
            src = (qh.get("source_file") or qh.get("contract_name") or "").lower()
            txt = (qh.get("text") or "").lower()
            if targeted_doc_term.lower() in src or targeted_doc_term.lower() in txt:
                term_in_docs = True
                break
    except Exception as e:
        print("Vector search error:", e)
        term_in_docs = False

    print(f"Term 'minhnguoc' in docs: {term_in_docs}")
    assert not term_in_docs, "minhnguoc should NOT be found in any doc or chunk text"

    # Step 3: Verify Lock Relevance Guard
    fake_top_hit = {
        "source_file": "Bài giảng Chủ nghĩa xã hội khoa học.pdf",
        "text": "Chức năng tái sản xuất ra con người. Nếu như trước kia...",
        "score": 0.6275
    }
    top_name = fake_top_hit.get("source_file")
    should_lock = True
    if candidate_tokens:
        should_lock = any(tok.lower() in top_name.lower() or tok.lower() in (fake_top_hit.get("text") or "").lower() for tok in candidate_tokens)

    print(f"Should lock onto target when query asks for 'minhnguoc'?: {should_lock}")
    assert not should_lock, "Should NOT lock onto unrelated document when candidate token 'minhnguoc' is absent!"

    print(">>> Logic checks passed! <<<")

async def test_ask_copilot_e2e():
    print("\n--- Testing ask_copilot API endpoint directly ---")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        real_user = result.scalar_one()
        scope = ScopeContext(user=real_user, role=real_user.role, is_unrestricted=True, department_name="All", canonical_dept="All", allowed_depts={"All"})
        req = CopilotAskRequest(
            query="tài liệu minhnguoc thuộc phòng ban nào",
            session_id=None
        )
        resp = await ask_copilot(req=req, scope=scope, db=db)
        print(f"Success: {resp.get('success')}")
        print(f"Model: {resp.get('model')}")
        print(f"ConfidenceScore: {resp.get('confidenceScore')}")
        answer_text = resp.get('answer', '')
        print(f"Answer: {repr(answer_text)}")
        
        # Verify gate output
        assert resp.get("model") == "GraphMind Entity Existence Gate", f"Expected Entity Gate model, got {resp.get('model')}"
        assert resp.get("confidenceScore") == 0, "Confidence score should be 0"
        assert "minhnguoc" in answer_text, "Answer must reference the missing document term"
        assert "Không tìm thấy" in answer_text, "Answer must clearly indicate not found"
        assert "Bài giảng" not in answer_text, "Answer must NEVER mention Bài giảng Chủ nghĩa xã hội khoa học"
        assert "Công nghệ / IT" not in answer_text, "Answer must NEVER assign Công nghệ / IT"
        print("\n>>> E2E ask_copilot gate test PASSED! <<<")

if __name__ == "__main__":
    test_entity_gate_logic()
    asyncio.run(test_ask_copilot_e2e())
