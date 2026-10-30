"""
User Admin API (M6) — CRUD tài khoản, RBAC, audit log
Router prefix: /api/v1/admin
Yêu cầu: Bearer token + role it_admin hoặc is_superuser
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from fastapi.security import HTTPAuthorizationCredentials
from app.core.security import get_password_hash, decode_access_token
from app.db.postgres.database import get_db
from app.db.postgres.models.user import User
from app.db.postgres.models.audit_log import AuditLog
from app.modules.m6_admin_security.audit_service import log_action
from app.modules.m6_admin_security.deps import get_admin_user
from app.modules.m6_admin_security.rbac import (
    is_superuser_for_role,
    canonical_role,
    CANONICAL_ROLES,
    ROLE_ALIASES,
    ADMIN_ONLY_DETAIL,
)
from app.schemas.user_admin import (
    UserCreateRequest,
    UserRoleUpdateRequest,
    PasswordResetRequest,
    UserAdminOut,
    AuditLogOut,
    AuditLogListResponse,
)

router = APIRouter(prefix="/admin", tags=["M6 Admin"])


def _check_role(role: str) -> None:
    """Kiểm tra role có hợp lệ không (hỗ trợ kiểm thử và xác thực tài khoản)."""
    if not role or (role not in CANONICAL_ROLES and role not in ROLE_ALIASES):
        raise HTTPException(
            status_code=422,
            detail=f"Role không hợp lệ: {role}. Các role hợp lệ: {list(CANONICAL_ROLES)}",
        )


async def require_admin(creds: Optional[HTTPAuthorizationCredentials] = None) -> dict:
    """Kiểm tra quyền IT Admin nhanh qua JWT Bearer token (hỗ trợ test suite và self-check không cần DB)."""
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc thiếu Bearer header.",
        )
    payload = decode_access_token(creds.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )
    role = payload.get("role")
    if not role or canonical_role(role) != "it_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ADMIN_ONLY_DETAIL,
        )
    return payload


# ── GET /admin/users ──────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserAdminOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Trả về toàn bộ danh sách tài khoản."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


# ── POST /admin/users ─────────────────────────────────────────────────────────

@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Tạo tài khoản mới. 409 nếu email đã tồn tại."""
    username = (body.email.split("@")[0] or "").strip().lower()
    existing = await db.execute(
        select(User).where(
            or_(User.email.ilike(body.email), User.username.ilike(username))
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email hoặc username đã tồn tại")

    new_user = User(
        email=body.email.lower().strip(),
        username=username,
        password_hash=get_password_hash(body.password),
        full_name=body.full_name,
        role=body.role,
        is_active=True,
        is_superuser=is_superuser_for_role(body.role),
    )
    db.add(new_user)
    await db.flush()  # lấy user_id trước khi commit

    await log_action(
        db,
        action="USER_CREATE",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(new_user.user_id),
        detail=f"email={new_user.email} role={new_user.role}",
    )
    await db.flush()
    await db.refresh(new_user)
    return new_user


# ── PATCH /admin/users/{user_id}/role ────────────────────────────────────────

@router.patch("/users/{user_id}/role", response_model=UserAdminOut)
async def change_role(
    user_id: uuid.UUID,
    body: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Đổi role. Admin không thể đổi role của chính mình."""
    if user_id == actor.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể đổi role của chính mình.")

    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    old_role = target.role
    target.role = body.role
    target.is_superuser = is_superuser_for_role(body.role)

    await log_action(
        db,
        action="ROLE_CHANGE",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"{old_role} → {body.role}",
    )
    await db.flush()
    await db.refresh(target)
    return target


# ── PATCH /admin/users/{user_id}/lock ────────────────────────────────────────

@router.patch("/users/{user_id}/lock", response_model=UserAdminOut)
async def lock_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Khóa tài khoản (is_active = False)."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    target.is_active = False
    await log_action(
        db,
        action="USER_LOCK",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"email={target.email}",
    )
    await db.flush()
    await db.refresh(target)
    return target


# ── PATCH /admin/users/{user_id}/unlock ──────────────────────────────────────

@router.patch("/users/{user_id}/unlock", response_model=UserAdminOut)
async def unlock_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Mở khóa tài khoản (is_active = True)."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    target.is_active = True
    await log_action(
        db,
        action="USER_UNLOCK",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"email={target.email}",
    )
    await db.flush()
    await db.refresh(target)
    return target


# ── PATCH /admin/users/{user_id}/reset-password ──────────────────────────────

@router.patch("/users/{user_id}/reset-password", response_model=UserAdminOut)
async def reset_password(
    user_id: uuid.UUID,
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Đặt lại mật khẩu người dùng."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    target.password_hash = get_password_hash(body.new_password)
    await log_action(
        db,
        action="PASSWORD_RESET",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"email={target.email}",
    )
    await db.flush()
    await db.refresh(target)
    return target


# ── DELETE /admin/users/{user_id} ─────────────────────────────────────────────

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Xóa tài khoản vĩnh viễn."""
    if user_id == actor.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự xóa chính mình.")

    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    email_snapshot = target.email
    await db.delete(target)
    await log_action(
        db,
        action="USER_DELETE",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(user_id),
        detail=f"email={email_snapshot}",
    )


# ── GET /admin/audit-logs ─────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    actor: Optional[str] = Query(None, description="Lọc theo email/username tài khoản thực hiện"),
    resource_type: Optional[str] = Query(None, description="Lọc theo loại đối tượng"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    """Truy vấn audit log, lọc theo tài khoản (actor) và loại đối tượng."""
    actor_user = aliased(User)
    stmt = select(AuditLog).outerjoin(actor_user, actor_user.user_id == AuditLog.actor_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type.ilike(resource_type.strip()))
    account_q = (actor or search or "").strip()
    if account_q:
        q = f"%{account_q}%"
        stmt = stmt.where(
            or_(
                actor_user.email.ilike(q),
                actor_user.username.ilike(q),
                actor_user.full_name.ilike(q),
                AuditLog.detail.ilike(q),
                AuditLog.resource_id.ilike(q),
            )
        )
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    return AuditLogListResponse(total=total, items=rows)


from app.modules.m6_admin_security.permissions_api import router as permissions_router

router.include_router(permissions_router)
