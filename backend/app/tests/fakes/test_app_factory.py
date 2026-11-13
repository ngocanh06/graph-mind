"""
Test App Factory for GraphMind / AEGIS (PR0 Isolated Test Harness).
Constructs a FastAPI application with real business routers, authentication,
RBAC scope validation, and middleware, but WITHOUT invoking live lifespan
or triggering live PostgreSQL, Neo4j, or Qdrant connections.
"""
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import real routers
from app.api.v1.auth import router as auth_router
from app.api.v1.rbac import router as rbac_router
from app.modules.m1_data_sync.webhook import (
    router as file_watcher_router,
    upload_document_to_central_storage,
    api_rename_document,
    api_replace_document,
    api_delete_document,
)
from app.db.postgres.database import get_db


@asynccontextmanager
async def noop_lifespan(app: FastAPI):
    """
    Completely isolated no-op lifespan context.
    Bypasses create_all_tables(), neo4j_client.connect(), qdrant_client.connect(),
    and LLM ping entirely.
    """
    yield


def create_test_app(
    db_session_override: Optional[Any] = None,
    state_overrides: Optional[Dict[str, Any]] = None,
) -> FastAPI:
    """
    Factory function to construct an isolated FastAPI test instance.
    Mounts real routers and middleware; overrides get_db dependency.
    """
    test_app = FastAPI(
        title="GraphMind Test Sandbox",
        description="Isolated Test Harness (PR0)",
        version="2.1.0-test",
        lifespan=noop_lifespan,
    )

    # Enable CORS
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Authentication routers
    test_app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    test_app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

    # RBAC routers
    test_app.include_router(rbac_router, prefix="/api/v1/rbac", tags=["rbac"])
    test_app.include_router(rbac_router, prefix="/api/rbac", tags=["rbac"])

    # M1 Data Sync / File Watcher Webhook & Document Management
    test_app.include_router(file_watcher_router)
    test_app.post("/api/documents/upload", tags=["Documents"])(upload_document_to_central_storage)
    test_app.post("/api/v1/documents/upload", tags=["Documents"])(upload_document_to_central_storage)
    test_app.post("/api/documents/rename", tags=["Documents"])(api_rename_document)
    test_app.post("/api/v1/documents/rename", tags=["Documents"])(api_rename_document)
    test_app.post("/api/documents/replace", tags=["Documents"])(api_replace_document)
    test_app.post("/api/v1/documents/replace", tags=["Documents"])(api_replace_document)
    test_app.post("/api/documents/delete", tags=["Documents"])(api_delete_document)
    test_app.post("/api/v1/documents/delete", tags=["Documents"])(api_delete_document)

    from app.main import get_document_raw_file, download_document_file, get_document_detail
    test_app.get("/api/documents/raw", tags=["Documents"])(get_document_raw_file)
    test_app.get("/api/v1/documents/raw", tags=["Documents"])(get_document_raw_file)
    test_app.get("/api/documents/download", tags=["Documents"])(download_document_file)
    test_app.get("/api/v1/documents/download", tags=["Documents"])(download_document_file)
    test_app.get("/api/documents/detail", tags=["Documents"])(get_document_detail)
    test_app.get("/api/v1/documents/detail", tags=["Documents"])(get_document_detail)

    # Import rbac dependencies for override
    from app.core.rbac import get_request_user
    from fastapi import Header

    # Override get_db dependency
    if db_session_override is not None:
        async def _override_get_db():
            yield db_session_override
        test_app.dependency_overrides[get_db] = _override_get_db
    else:
        # Default mock session returning safe empty results
        async def _default_mock_db():
            from unittest.mock import MagicMock
            mock_session = AsyncMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = None
            mock_cursor.fetchall.return_value = []
            mock_cursor.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_cursor
            yield mock_session
        test_app.dependency_overrides[get_db] = _default_mock_db

    # Override get_request_user dependency to avoid live database lookup
    async def _default_get_request_user(
        x_user_name: Optional[str] = Header(None),
        x_user_role: Optional[str] = Header(None),
    ):
        from unittest.mock import MagicMock
        u_name = (x_user_name or "exec").strip().lower()
        if x_user_role:
            u_role = x_user_role.strip().lower()
        elif u_name in ["exec", "ceo", "cfo", "executive"]:
            u_role = "executive"
        elif u_name in ["admin", "secops", "itadmin"]:
            u_role = "it_admin"
        elif u_name in ["manager", "mgr", "lead"]:
            u_role = "knowledge_manager"
        else:
            u_role = "standard"

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = u_name
        mock_user.role = u_role
        mock_user.is_superuser = (u_role in ["admin", "it_admin"])
        mock_user.is_active = True
        mock_user.department_id = None  # None ensures clean header-based resolution without DB query
        mock_user.department = "Ban Giám Đốc" if u_role == "executive" else "Kinh Doanh"
        return mock_user

    test_app.dependency_overrides[get_request_user] = _default_get_request_user

    # Initialize app.state
    test_app.state.testing = True
    if state_overrides:
        for k, v in state_overrides.items():
            setattr(test_app.state, k, v)

    return test_app
