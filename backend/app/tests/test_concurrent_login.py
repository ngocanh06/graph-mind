"""
Unit/Integration test for Single Active Session / Concurrent Login Protection
Mô-đun 6 - PB01, PB03.
"""
import io
import sys
import asyncio

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m6_admin_security.session_service import ensure_sessions_table


@pytest.mark.asyncio
async def test_single_active_session_kick():
    transport = ASGITransport(app=app)
    async with AsyncSessionLocal() as db:
        await ensure_sessions_table(db)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Device 1 logins with admin
        login_res_1 = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin", "password": "123456"},
        )
        assert login_res_1.status_code == 200, f"Login device 1 failed: {login_res_1.text}"
        data_1 = login_res_1.json()
        token_1 = data_1["access_token"]

        # Device 1 can call /auth/me
        me_res_1 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_1}"},
        )
        assert me_res_1.status_code == 200, f"Device 1 /me failed: {me_res_1.text}"

        # 2. Device 2 logins with the same admin account
        login_res_2 = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin", "password": "123456"},
        )
        assert login_res_2.status_code == 200, f"Login device 2 failed: {login_res_2.text}"
        data_2 = login_res_2.json()
        token_2 = data_2["access_token"]
        assert token_1 != token_2, "Tokens should have different jtis"

        # Device 2 can call /auth/me
        me_res_2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_2}"},
        )
        assert me_res_2.status_code == 200, f"Device 2 /me failed: {me_res_2.text}"

        # 3. Device 1 attempts to call /auth/me again -> MUST BE KICKED (401 CONCURRENT_LOGIN_KICKED)
        kicked_res_1 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_1}"},
        )
        assert kicked_res_1.status_code == 401, f"Expected 401 for kicked device 1, got {kicked_res_1.status_code}"
        kicked_data = kicked_res_1.json()
        assert kicked_data.get("error_code") == "CONCURRENT_LOGIN_KICKED", f"Expected error_code CONCURRENT_LOGIN_KICKED, got: {kicked_data}"
        print(f"\n[PASS] Device 1 /auth/me successfully rejected with CONCURRENT_LOGIN_KICKED: {kicked_data}")

        # 4. Device 1 attempts to call another protected API (e.g. /api/copilot/sessions) -> MUST ALSO BE KICKED
        copilot_res_1 = await client.get(
            "/api/copilot/sessions",
            headers={"Authorization": f"Bearer {token_1}"},
        )
        assert copilot_res_1.status_code == 401, f"Expected 401 for kicked device 1 on copilot, got {copilot_res_1.status_code}"
        copilot_data = copilot_res_1.json()
        assert copilot_data.get("error_code") == "CONCURRENT_LOGIN_KICKED", f"Expected error_code CONCURRENT_LOGIN_KICKED, got: {copilot_data}"
        print(f"[PASS] Device 1 protected route rejected with CONCURRENT_LOGIN_KICKED: {copilot_data}")

        # 5. Device 2 can still continue to call protected APIs normally
        copilot_res_2 = await client.get(
            "/api/copilot/sessions",
            headers={"Authorization": f"Bearer {token_2}"},
        )
        assert copilot_res_2.status_code == 200, f"Device 2 should work normally: {copilot_res_2.text}"
        print(f"[PASS] Device 2 continues working normally with active session token!")

        print("\n=======================================================")
        print(" ALL CONCURRENT LOGIN SECURITY TESTS PASSED PERFECTLY! ")
        print("=======================================================")


if __name__ == "__main__":
    asyncio.run(test_single_active_session_kick())
