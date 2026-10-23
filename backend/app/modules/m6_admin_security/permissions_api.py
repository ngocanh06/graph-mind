"""Knowledge domain permission matrix API (Module 6)."""
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.database import get_db
from app.db.postgres.models.knowledge_permission import KnowledgePermission
from app.db.postgres.models.user import User
from app.modules.m6_admin_security.audit_service import log_action
from app.modules.m6_admin_security.deps import get_admin_user

router = APIRouter()

DOMAINS = ("customer", "orders", "payroll", "contracts", "risk", "sop")
PERSONAS = ("exec", "admin", "manager", "ops")
DEFAULT_MATRIX = {
    "customer": {"exec": True, "admin": True, "manager": True, "ops": True},
    "orders": {"exec": True, "admin": True, "manager": True, "ops": True},
    "payroll": {"exec": True, "admin": True, "manager": False, "ops": False},
    "contracts": {"exec": True, "admin": True, "manager": True, "ops": False},
    "risk": {"exec": True, "admin": True, "manager": True, "ops": False},
    "sop": {"exec": True, "admin": True, "manager": True, "ops": True},
}


class KnowledgePermissionOut(BaseModel):
    domain: str
    role: str
    allowed: bool


class KnowledgePermissionUpdate(BaseModel):
    domain: str
    role: str
    allowed: bool


async def _ensure_defaults(db: AsyncSession) -> None:
    existing = (await db.execute(select(KnowledgePermission))).scalars().all()
    if existing:
        return
    for domain, roles in DEFAULT_MATRIX.items():
        for role, allowed in roles.items():
            db.add(KnowledgePermission(domain=domain, role=role, allowed=allowed))
    await db.flush()


@router.get("/knowledge-permissions", response_model=List[KnowledgePermissionOut])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await _ensure_defaults(db)
    rows = (await db.execute(select(KnowledgePermission).order_by(KnowledgePermission.domain))).scalars().all()
    return [KnowledgePermissionOut(domain=r.domain, role=r.role, allowed=r.allowed) for r in rows]


@router.put("/knowledge-permissions", response_model=KnowledgePermissionOut)
async def update_permission(
    payload: KnowledgePermissionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await _ensure_defaults(db)
    domain = payload.domain.strip().lower()
    role = payload.role.strip().lower()
    result = await db.execute(
        select(KnowledgePermission).where(
            KnowledgePermission.domain == domain,
            KnowledgePermission.role == role,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = KnowledgePermission(domain=domain, role=role, allowed=payload.allowed)
        db.add(row)
    else:
        row.allowed = payload.allowed
    await log_action(
        db,
        action="PERM_CHANGE",
        actor_id=admin.user_id,
        resource_type="KNOWLEDGE_PERMISSION",
        resource_id=f"{domain}:{role}",
        detail=f"allowed={payload.allowed}",
    )
    return KnowledgePermissionOut(domain=row.domain, role=row.role, allowed=row.allowed)
