"""Sprint 4 Automation Sandbox — GraphMind (C1SE18)."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("POSTGRES_SERVER", "disabled.invalid")
os.environ.setdefault("NEO4J_URI", "bolt://disabled.invalid:59998")
os.environ.setdefault("QDRANT_HOST", "disabled.invalid")

import sqlalchemy.ext.asyncio as sa_async

sa_async.create_async_engine = lambda *a, **kw: MagicMock()
