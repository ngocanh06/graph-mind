"""Sprint 2 Automation Test Harness — GraphMind (C1SE18)."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("POSTGRES_SERVER", "disabled.invalid")
os.environ.setdefault("POSTGRES_PORT", "59999")
os.environ.setdefault("POSTGRES_DB", "graphmind_test_disabled")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_pass")
os.environ.setdefault("NEO4J_URI", "bolt://disabled.invalid:59998")
os.environ.setdefault("NEO4J_USER", "test_neo")
os.environ.setdefault("NEO4J_PASSWORD", "test_neo_pass")
os.environ.setdefault("QDRANT_HOST", "disabled.invalid")
os.environ.setdefault("QDRANT_PORT", "59997")
os.environ.setdefault("QDRANT_COLLECTION_NAME", "cuad_contracts")

import sqlalchemy.ext.asyncio as sa_async


class _MockAsyncEngine:
    def __init__(self, *args, **kwargs):
        self.url = "postgresql+asyncpg://mock:***@disabled.invalid/mock_db"
        self.sync_engine = MagicMock()
        self.pool = MagicMock()

    async def dispose(self):
        pass


sa_async.create_async_engine = lambda *a, **kw: _MockAsyncEngine(*a, **kw)
