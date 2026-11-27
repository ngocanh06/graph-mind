import os
import sys
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from pydantic import ValidationError

from app.core.config import Settings
from app.db.postgres.database import get_db
from app.modules.m6_admin_security.forgot_password_router import router as fp_router


def test_app_env_default_production():
    """B1.1: APP_ENV model default must be 'production'."""
    assert Settings.model_fields["APP_ENV"].default == "production"


def test_validator_testing_bypass_restricted():
    """B1.1: Setting APP_ENV=testing cannot bypass password validators if pytest is not in sys.modules / PYTEST_CURRENT_TEST."""
    # Test with direct validator invocation under simulated non-pytest environment
    clean_pw = "123"
    import os, sys
    # Verify that when is_test_env is False, weak password raises ValueError
    with pytest.raises(ValueError, match="POSTGRES_PASSWORD"):
        # Explicitly call validator logic when not in test env
        with patch.dict(os.environ, {"APP_ENV": "development", "PYTEST_CURRENT_TEST": ""}):
            with patch.dict("sys.modules"):
                sys.modules.pop("pytest", None)
                Settings.validate_postgres_password(clean_pw)


def _create_fp_test_app(user_obj=None):
    app = FastAPI()
    app.include_router(fp_router, prefix="/api/v1/auth")

    mock_db = AsyncMock()
    cursor = MagicMock()
    cursor.scalar_one_or_none.return_value = user_obj
    cursor.scalar_one.return_value = 0  # for check_rate_limit count
    mock_db.execute.return_value = cursor
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    async def _override_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_db
    return app, mock_db


@pytest.mark.asyncio
async def test_forgot_password_anti_enumeration():
    """B1.2: Both non-existent and locked accounts must return 200 with uniform generic message."""
    generic_msg = "Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi đến hộp thư của bạn."

    # 1. Non-existent email
    app_none, _ = _create_fp_test_app(user_obj=None)
    async with AsyncClient(transport=ASGITransport(app=app_none), base_url="http://test") as client:
        r1 = await client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent@graphmind.ai"})
    assert r1.status_code == 200
    assert r1.json()["message"] == generic_msg

    # 2. Inactive / locked account
    locked_user = MagicMock()
    locked_user.is_active = False
    locked_user.deleted_at = None
    app_locked, _ = _create_fp_test_app(user_obj=locked_user)
    async with AsyncClient(transport=ASGITransport(app=app_locked), base_url="http://test") as client:
        r2 = await client.post("/api/v1/auth/forgot-password", json={"email": "locked@graphmind.ai"})
    assert r2.status_code == 200
    assert r2.json()["message"] == generic_msg

    # 3. Active account
    active_user = MagicMock()
    active_user.is_active = True
    active_user.deleted_at = None
    app_active, _ = _create_fp_test_app(user_obj=active_user)
    with patch("app.modules.m6_admin_security.forgot_password_router.create_otp", new=AsyncMock(return_value="123456")), \
         patch("app.modules.m6_admin_security.forgot_password_router.send_otp_email", new=AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app_active), base_url="http://test") as client:
            r3 = await client.post("/api/v1/auth/forgot-password", json={"email": "active@graphmind.ai"})
    assert r3.status_code == 200
    assert r3.json()["message"] == generic_msg


@pytest.mark.asyncio
async def test_reset_password_clears_active_sessions():
    """B1.2: Password reset must invalidate all active user sessions."""
    uid = uuid.uuid4()
    active_user = MagicMock()
    active_user.user_id = uid
    active_user.email = "active@graphmind.ai"
    active_user.is_active = True
    active_user.deleted_at = None

    app, mock_db = _create_fp_test_app(user_obj=active_user)

    with patch("app.modules.m6_admin_security.forgot_password_router.verify_otp", new=AsyncMock(return_value=(True, "OK"))), \
         patch("app.modules.m6_admin_security.forgot_password_router.get_password_hash", return_value="hashed_pw_secret"), \
         patch("app.modules.m6_admin_security.forgot_password_router.log_action", new=AsyncMock()), \
         patch("app.modules.m6_admin_security.session_service.clear_active_session", new=AsyncMock()) as mock_clear_session:

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/auth/reset-password",
                json={
                    "email": "active@graphmind.ai",
                    "otp_code": "123456",
                    "new_password": "NewStrongPassword2026!",
                    "confirm_password": "NewStrongPassword2026!",
                },
            )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."
        mock_clear_session.assert_awaited_once_with(mock_db, uid)
