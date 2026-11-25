"""Lightweight isolated FastAPI server for Sprint 2 headless Locust verification."""
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("POSTGRES_SERVER", "disabled.invalid")

import sqlalchemy.ext.asyncio as sa_async

sa_async.create_async_engine = lambda *a, **kw: MagicMock()

import uvicorn
from app.db.postgres.database import get_db
from app.modules.m6_admin_security.forgot_password_router import router as fp_router
from app.modules.m6_admin_security.rbac_matrix_router import router as rbac_matrix_router
from app.tests.fakes.test_app_factory import create_test_app

_db = AsyncMock()
_cur = MagicMock()
_cur.scalar_one_or_none.return_value = None
_db.execute.return_value = _cur
_db.commit = AsyncMock()

app = create_test_app(db_session_override=_db)
app.include_router(fp_router, prefix="/api/v1/auth")
app.include_router(rbac_matrix_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "sprint": 2}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5056, log_level="warning")
