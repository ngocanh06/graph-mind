"""Minimal isolated FastAPI target (:5057) for Sprint 3 headless Locust run."""
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("POSTGRES_SERVER", "disabled.invalid")

import sqlalchemy.ext.asyncio as sa_async

sa_async.create_async_engine = lambda *a, **kw: MagicMock()

import uvicorn
from fastapi import FastAPI
from app.api.v1 import shift_reports, sop
from app.db.postgres.database import get_db
from app.modules.m3_hybrid_copilot.query_engine.context_fusion import reciprocal_rank_fusion

app = FastAPI()
app.include_router(sop.router, prefix="/api/v1/sop")
app.include_router(shift_reports.router, prefix="/api/v1/shift-reports")


_db_mock = AsyncMock()
_cur = MagicMock()
_cur.scalar_one_or_none.return_value = None
_cur.fetchall.return_value = []
_db_mock.execute.return_value = _cur


async def _db():
    yield _db_mock


app.dependency_overrides[get_db] = _db


@app.get("/health")
async def health():
    return {"status": "ok", "sprint": 3}


@app.get("/api/v1/rrf-bench")
async def rrf_bench():
    fused = reciprocal_rank_fusion([{"id": "d1"}, {"id": "d2"}], [{"id": "d2"}, {"id": "d3"}], k=60)
    return {"top": fused[0]["id"], "count": len(fused)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5057, log_level="warning")
