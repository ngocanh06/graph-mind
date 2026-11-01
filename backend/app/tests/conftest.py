"""
Root conftest.py for GraphMind / AEGIS (PR0 Isolated Test Harness).
Pre-import hooks:
1. Sets dummy RFC 2606 environment variables before any app modules are loaded.
2. Patches sqlalchemy.ext.asyncio.create_async_engine to prevent any engine/connection pool creation.
3. Provides FakeNeo4jClient, FakeQdrantClientWrapper, and TestApp fixtures.
4. Implements fail-closed socket interceptor for defense-in-depth alongside pytest-socket.
"""
import os
import sys
import socket
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

# ── 1. Setup Sys.Path ────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ── 2. Environment Sandboxing (Pre-Import) ──────────────────────────────────
os.environ["APP_ENV"] = "testing"
os.environ["POSTGRES_SERVER"] = "disabled.invalid"
os.environ["POSTGRES_PORT"] = "59999"
os.environ["POSTGRES_DB"] = "graphmind_test_disabled"
os.environ["POSTGRES_USER"] = "test_user"
os.environ["POSTGRES_PASSWORD"] = "test_pass"
os.environ["NEO4J_URI"] = "bolt://disabled.invalid:59998"
os.environ["NEO4J_USER"] = "test_neo"
os.environ["NEO4J_PASSWORD"] = "test_neo_pass"
os.environ["QDRANT_HOST"] = "disabled.invalid"
os.environ["QDRANT_PORT"] = "59997"
os.environ["QDRANT_COLLECTION_NAME"] = "cuad_contracts"

# ── 3. Pre-Import Engine Factory Patching ────────────────────────────────────
# Patch create_async_engine in sqlalchemy.ext.asyncio BEFORE app.db.postgres.database imports it.
import sqlalchemy.ext.asyncio as sa_async

_orig_create_async_engine = sa_async.create_async_engine

class MockAsyncEngine:
    def __init__(self, *args, **kwargs):
        self.url = "postgresql+asyncpg://mock:***@disabled.invalid/mock_db"
        self.sync_engine = MagicMock()
        self.pool = MagicMock()
    async def dispose(self):
        pass
    def connect(self):
        raise RuntimeError("PR0 Safety Guard: Direct database connection attempted on MockAsyncEngine!")

def _mock_create_async_engine(*args, **kwargs):
    return MockAsyncEngine(*args, **kwargs)

sa_async.create_async_engine = _mock_create_async_engine

# ── 4. Socket Interceptor (Defense-in-Depth Guard) ───────────────────────────
BLOCKED_PORTS = {7687, 7474, 6333, 6334, 5432}

class RuntimeConnectionBlockedError(RuntimeError):
    pass

_orig_socket_connect = socket.socket.connect
_orig_socket_connect_ex = socket.socket.connect_ex

def guarded_connect(sock_self, address, real_connect=_orig_socket_connect):
    host, port = address[0], address[1]
    if port in BLOCKED_PORTS or "invalid" in str(host):
        raise RuntimeConnectionBlockedError(
            f"[FATAL PR0 GUARD] Blocked connection to runtime port or sandbox host: {host}:{port}"
        )
    return real_connect(sock_self, address)

def guarded_connect_ex(sock_self, address, real_connect_ex=_orig_socket_connect_ex):
    host, port = address[0], address[1]
    if port in BLOCKED_PORTS or "invalid" in str(host):
        raise RuntimeConnectionBlockedError(
            f"[FATAL PR0 GUARD] Blocked connect_ex to runtime port or sandbox host: {host}:{port}"
        )
    return real_connect_ex(sock_self, address)

socket.socket.connect = guarded_connect
socket.socket.connect_ex = guarded_connect_ex

# ── 5. Pytest Fixtures ───────────────────────────────────────────────────────
import pytest
from httpx import AsyncClient, ASGITransport

from app.tests.fakes.fake_neo4j import FakeNeo4jClient
from app.tests.fakes.fake_qdrant import FakeQdrantClientWrapper
from app.tests.fakes.test_app_factory import create_test_app


@pytest.fixture
def fake_neo4j():
    """Provides a fresh in-memory FakeNeo4jClient instance."""
    client = FakeNeo4jClient()
    yield client
    client.reset()


@pytest.fixture
def fake_qdrant():
    """Provides a fresh in-memory FakeQdrantClientWrapper instance."""
    client = FakeQdrantClientWrapper()
    yield client
    client.reset()


@pytest.fixture(autouse=True)
def patch_singletons(monkeypatch, fake_neo4j, fake_qdrant):
    """
    Automatically injects fake clients into app.db.neo4j.client,
    app.db.qdrant.client, and pipeline module for every test.
    """
    try:
        import app.db.neo4j.client as n4j_module
        monkeypatch.setattr(n4j_module, "neo4j_client", fake_neo4j)
    except Exception:
        pass

    try:
        import app.db.qdrant.client as qdr_module
        monkeypatch.setattr(qdr_module, "qdrant_client", fake_qdrant)
    except Exception:
        pass

    try:
        import app.modules.m1_data_sync.pipeline as pipe_module
        monkeypatch.setattr(pipe_module, "neo4j_client", fake_neo4j)
        monkeypatch.setattr(pipe_module, "qdrant_client", fake_qdrant)
    except Exception:
        pass


@pytest.fixture
def test_app():
    """Constructs an isolated FastAPI application instance."""
    return create_test_app()


@pytest.fixture
async def async_client(test_app):
    """Provides an isolated AsyncClient using in-memory ASGITransport."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
