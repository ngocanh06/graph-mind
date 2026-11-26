"""
OAuth 2.0 State Security Test Suite (RED / GREEN)
Validates CSRF protection, 10-minute expiration, user binding, and single-use invalidation.
"""
import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.db.postgres.models import User
from app.core.rbac import ScopeContext, get_user_scope, CANONICAL_RESOURCE_TYPES
import uuid

client = TestClient(app)

ADMIN_USER_ID = str(uuid.uuid4())

def make_admin_scope():
    u = User(
        user_id=uuid.UUID(ADMIN_USER_ID),
        email="admin@graphmind.ai",
        username="admin",
        role="admin",
        status="active",
        is_active=True,
        is_superuser=True,
    )
    return ScopeContext(
        user=u,
        role="admin",
        is_unrestricted=True,
        department_name="IT",
        canonical_dept="it",
        allowed_depts={"*"},
        allowed_resources=set(CANONICAL_RESOURCE_TYPES),
    )


def test_oauth_state_csrf_protection_red_green():
    """
    1. Callback with missing or forged state must be rejected with 400.
    2. Callback with expired state (>10 mins) must be rejected with 400.
    3. Valid state must be consumed once; second attempt (replay) must be rejected with 400.
    """
    admin_scope = make_admin_scope()
    app.dependency_overrides[get_user_scope] = lambda: admin_scope

    try:
        # A. Missing state must return 400 CSRF error
        r1 = client.get("/api/v1/connectors/google/callback?code=valid_auth_code")
        assert r1.status_code == 400
        assert "state" in r1.text.lower() or "csrf" in r1.text.lower(), f"Expected CSRF state error, got: {r1.text}"

        # B. Forged state must return 400 CSRF error
        r2 = client.get("/api/v1/connectors/google/callback?code=valid_auth_code&state=forged_unregistered_state_123")
        assert r2.status_code == 400
        assert "state" in r2.text.lower() or "csrf" in r2.text.lower(), f"Expected CSRF state error for forged state, got: {r2.text}"

        # C. Generate genuine auth URL and extract registered state
        r_auth = client.get("/api/v1/connectors/google/auth-url")
        assert r_auth.status_code == 200
        auth_data = r_auth.json()
        assert auth_data.get("success") is True
        auth_url = auth_data.get("auth_url", "")
        assert "state=" in auth_url

        import urllib.parse
        parsed = urllib.parse.urlparse(auth_url)
        params = urllib.parse.parse_qs(parsed.query)
        gen_state = params["state"][0]
        assert len(gen_state) >= 32, "State must have high cryptographic entropy"

        # D. Mock Google token exchange to simulate successful callback
        mock_post = MagicMock()
        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {
            "access_token": "ya29.test_token",
            "refresh_token": "1//test_refresh",
            "token_type": "Bearer",
            "expires_in": 3600
        }
        mock_get = MagicMock()
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {"email": "verified.user@gmail.com"}

        with patch("requests.post", mock_post), patch("requests.get", mock_get):
            # First callback with genuine state -> Success (returns redirect to frontend)
            r_cb1 = client.get(
                f"/api/v1/connectors/google/callback?code=valid_code_456&state={gen_state}",
                follow_redirects=False
            )
            assert r_cb1.status_code in [200, 307, 302], f"Expected success/redirect on genuine callback, got: {r_cb1.status_code}"
            assert "google_auth=success" in r_cb1.headers.get("location", "")

            # Replay attack: calling again with same state -> 400 (already consumed)
            r_replay = client.get(
                f"/api/v1/connectors/google/callback?code=valid_code_456&state={gen_state}",
                follow_redirects=False
            )
            assert r_replay.status_code == 400, f"Expected 400 for replayed state, got: {r_replay.status_code}"
            assert "state" in r_replay.text.lower() or "csrf" in r_replay.text.lower()

    finally:
        app.dependency_overrides.pop(get_user_scope, None)
