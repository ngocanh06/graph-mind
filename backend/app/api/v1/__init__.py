"""
API v1 package
"""
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router

__all__ = ["auth_router", "dashboard_router"]

