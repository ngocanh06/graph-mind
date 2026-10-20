"""
Audit service dùng chung: mọi module (CN1, CN4...) gọi log_action() để ghi vết.
Ghi cùng session với thao tác chính -> commit/rollback nguyên tử (get_db commit cuối request).
"""
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.db.postgres.models.audit_log import AuditLog
except ImportError:
    from db.postgres.models.audit_log import AuditLog


def log_action(
    db: AsyncSession,
    actor: Optional[dict],
    action: str,
    resource_type: str,
    resource_id: Any = None,
    detail: Optional[dict] = None,
    status: str = "success",
    module: str = "m6_admin_security",
) -> AuditLog:
    """actor = JWT payload (sub, email) hoặc None cho tác vụ hệ thống."""
    actor = actor or {}
    try:
        actor_id = uuid.UUID(str(actor["sub"]))
    except (KeyError, ValueError):
        actor_id = None
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        module_name=module,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        detail={**(detail or {}), "actor_email": actor.get("email"), "status": status},
    )
    db.add(entry)
    return entry
