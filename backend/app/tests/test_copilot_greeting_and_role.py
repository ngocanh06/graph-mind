"""
Runnable verification for Copilot greeting routing, word-boundary Cypher/RBAC guards,
and role-aligned userLabel persistence (Manager vs Executive).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.rbac import resolve_resource_type
from app.db.postgres.database import engine
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import generate_cypher_from_query


async def run_checks():
    # 1. Unit checks: 'Entity' must NOT match 'IT' via substring 'it'; 'XIN CHÀO' must not scan Neo4j
    assert resolve_resource_type({"name": "Entity #4:4fae937d:52919"}) == "LEGAL"
    assert resolve_resource_type({"name": "Boxing County Chengli Gas Supply Co", "domain": "legal"}) == "LEGAL"
    assert resolve_resource_type("Công nghệ / IT") == "IT"
    assert "NonExistent" in generate_cypher_from_query("XIN CHÀO")

    # 2. End-to-end API check for Department Manager asking 'XIN CHÀO'
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        mgr_headers = {
            "X-User-Name": "manager",
            "X-User-Email": "manager@graphmind.ai",
            "X-User-Role": "KNOWLEDGE_MGR",
            "X-User-Dept": "Sales",
        }
        res = await client.post(
            "/api/copilot/ask",
            headers=mgr_headers,
            json={"query": "XIN CHÀO", "lang": "vi"},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["success"] is True
        assert body["citations"] == [], f"Expected 0 citations for greeting, got {body['citations']}"
        assert "Boxing County" not in body["answer"]
        assert "Xin chào" in body["answer"]

        msgs = body["session"]["messages"]
        assert len(msgs) == 2
        assert msgs[0]["userLabel"] == "Trưởng phòng (Quản lý)", f"Unexpected userLabel: {msgs[0]['userLabel']}"

        # Clean up test session
        sid = body["sessionId"]
        del_res = await client.delete(f"/api/copilot/sessions/{sid}", headers=mgr_headers)
        assert del_res.status_code == 200

    await engine.dispose()
    print("[OK] Greeting routing, RBAC word-boundary & Manager userLabel checks passed!")


if __name__ == "__main__":
    asyncio.run(run_checks())

