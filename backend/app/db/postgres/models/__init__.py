"""
Export tất cả ORM models để Alembic autogenerate nhận diện được.
"""
from .user import User
from .copilot_session import CopilotSession
from .sop_document import SopDocument
from .audit_log import AuditLog
from .knowledge_permission import KnowledgePermission
from .otp import PasswordResetOtp

__all__ = [
    "User",
    "CopilotSession",
    "SopDocument",
    "AuditLog",
    "KnowledgePermission",
    "PasswordResetOtp",
]
