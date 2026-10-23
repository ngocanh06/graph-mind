"""
Audit Service (M6) — ghi nhận hành động vào bảng audit_logs
Dùng chung cho user_admin_api và auth router.
"""
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    action: str,
    actor_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "OK",
    detail: Optional[str] = None,
) -> None:
    """Ghi một dòng vào audit_logs. Fire-and-forget — lỗi chỉ log, không raise."""
    try:
        entry = AuditLog(
            action=action,
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            detail=detail,
        )
        db.add(entry)
        # Không commit ở đây — để FastAPI dependency tự commit sau response
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("audit log failed: %s", exc)
