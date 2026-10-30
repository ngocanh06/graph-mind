"""
Runnable verification check for Copilot per-user PostgreSQL persistence.
Asserts that each user only sees their own sessions and questions persist to PostgreSQL.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    import pytest
    asyncio_test = pytest.mark.asyncio
except ImportError:
    def asyncio_test(func):
        return func

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.postgres.database import engine


@asyncio_test
async def test_copilot_postgres():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test sessions for user 'manager' (starts clean without dummy mock sessions)
        res_manager = await client.get("/api/copilot/sessions", headers={"X-User-Name": "manager"})
        assert res_manager.status_code == 200, f"Expected 200, got {res_manager.status_code}: {res_manager.text}"
        data_manager = res_manager.json()
        assert data_manager["success"] is True
        assert data_manager["user"]["username"] == "manager"
        assert isinstance(data_manager["sessions"], list)

        # 2. Test sessions for user 'exec' (clean list)
        res_exec = await client.get("/api/copilot/sessions", headers={"X-User-Name": "exec"})
        assert res_exec.status_code == 200
        data_exec = res_exec.json()
        assert data_exec["user"]["username"] == "exec"
        assert isinstance(data_exec["sessions"], list)

        # 3. Test creating a new session for 'exec'
        res_new = await client.post(
            "/api/copilot/sessions",
            headers={"X-User-Name": "exec"},
            json={"title": "Phiên thảo luận chiến lược"},
        )
        assert res_new.status_code == 200
        session_id = res_new.json()["session"]["id"]

        # 4. Test asking copilot within that session and verify persistence
        res_ask = await client.post(
            "/api/copilot/ask",
            headers={"X-User-Name": "exec"},
            json={
                "query": "Kiểm tra điều khoản thanh toán hợp đồng",
                "lang": "vi",
                "session_id": session_id,
            },
        )
        assert res_ask.status_code == 200
        ask_data = res_ask.json()
        assert ask_data["success"] is True
        assert ask_data["sessionId"] == session_id
        assert len(ask_data["session"]["messages"]) == 2

        # 5. Fetch session detail and verify persisted messages in PostgreSQL
        res_detail = await client.get(
            f"/api/copilot/sessions/{session_id}",
            headers={"X-User-Name": "exec"},
        )
        assert res_detail.status_code == 200
        detail = res_detail.json()["session"]
        assert len(detail["messages"]) == 2
        assert detail["messages"][0]["sender"] == "user"
        assert detail["messages"][1]["sender"] == "copilot"

        # 6. Verify cross-account security: 'manager' cannot view 'exec's session
        res_cross = await client.get(
            f"/api/copilot/sessions/{session_id}",
            headers={"X-User-Name": "manager"},
        )
        assert res_cross.status_code == 404, f"Manager should get 404 for exec's session, got {res_cross.status_code}"

        # Clean up created session
        del_res = await client.delete(
            f"/api/copilot/sessions/{session_id}",
            headers={"X-User-Name": "exec"},
        )
        assert del_res.status_code == 200

    await engine.dispose()
    print("ALL COPILOT POSTGRES TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_copilot_postgres())
