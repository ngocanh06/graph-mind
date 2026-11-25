"""Lightweight isolated FastAPI server for Sprint 1 headless Locust verification."""
import os
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("POSTGRES_SERVER", "disabled.invalid")

import sqlalchemy.ext.asyncio as sa_async

sa_async.create_async_engine = lambda *a, **kw: MagicMock()

import uvicorn
from app.core.security import get_password_hash
from app.tests.fakes.test_app_factory import create_test_app

_user = SimpleNamespace(
    user_id=uuid.uuid4(),
    username="exec",
    email="executive@graphmind.ai",
    full_name="Executive Demo",
    password_hash=get_password_hash("123456"),
    role="executive",
    department="Sales",
    is_active=True,
    status="active",
    is_superuser=False,
    deleted_at=None,
    last_login_at=None,
    last_active_at=None,
)

_db = AsyncMock()
_cur = MagicMock()
_cur.scalar_one_or_none.return_value = _user
_db.execute.return_value = _cur
_db.commit = AsyncMock()
_db.refresh = AsyncMock()

app = create_test_app(db_session_override=_db)


@app.get("/health")
async def health():
    return {"status": "ok", "sprint": 1}


if __name__ == "__main__":
    with (
        patch("app.api.v1.auth.ensure_sessions_table", new=AsyncMock()),
        patch("app.api.v1.auth.upsert_active_session", new=AsyncMock(return_value=False)),
        patch("app.api.v1.auth.get_active_jti", new=AsyncMock(return_value=None)),
        patch("app.api.v1.auth.log_action", new=AsyncMock()),
    ):
        uvicorn.run(app, host="127.0.0.1", port=5055, log_level="warning")
