"""
User Admin API (M6) — CRUD tài khoản, RBAC, audit log
Router prefix: /api/v1/admin
Yêu cầu: Bearer token + role it_admin hoặc is_superuser
"""
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from fastapi.security import HTTPAuthorizationCredentials
from app.core.security import get_password_hash, decode_access_token
from app.db.postgres.database import get_db
from app.db.postgres.models.user import User
from app.db.postgres.models.audit_log import AuditLog
from app.modules.m6_admin_security.audit_service import log_action, verify_audit_chain
from app.modules.m6_admin_security.deps import get_admin_user
from app.modules.m6_admin_security.rbac import (
    is_superuser_for_role,
    is_system_admin,
    canonical_role,
    CANONICAL_ROLES,
    ROLE_ALIASES,
    ADMIN_ONLY_DETAIL,
)
from app.schemas.user_admin import (
    UserCreateRequest,
    UserRoleUpdateRequest,
    UserDepartmentUpdateRequest,
    PasswordResetRequest,
    UserAdminOut,
    AuditLogOut,
    AuditLogListResponse,
)

router = APIRouter(prefix="/admin", tags=["M6 Admin"])

# Mapping chuẩn 5 phòng ban doanh nghiệp
DEPT_CODE_TO_ID = {
    "SALES": uuid.UUID("6d04d700-56e6-4d50-88b2-6594013fc8cd"),
    "LEGAL": uuid.UUID("dd99cb37-49d1-4543-99c6-f4787dd19a08"),
    "FINANCE": uuid.UUID("aa7d6633-dc3f-44b3-a5ad-cb2e08f891cd"),
    "IT": uuid.UUID("1c51042f-0345-4467-90ca-ef5845822712"),
    "RND": uuid.UUID("eafa81ed-53a7-4275-ba0f-f9ac57eb1ce5"),
}


def normalize_dept_label_and_code(raw_name: Optional[str]) -> Tuple[str, str]:
    if not raw_name:
        return "Kinh doanh (SALES)", "SALES"
    r = raw_name.lower().strip()
    if "legal" in r or "pháp chế" in r:
        return "Pháp chế (LEGAL)", "LEGAL"
    if "accounting" in r or "kế toán" in r or "thu mua" in r or "finance" in r:
        return "Kế toán / Thu mua (FINANCE)", "FINANCE"
    if "công nghệ" in r or "it" in r or "cntt" in r:
        return "Công nghệ / IT", "IT"
    if "r&d" in r or "rnd" in r or "nghiên cứu" in r:
        return "R&D", "RND"
    if "sales" in r or "kinh doanh" in r:
        return "Kinh doanh (SALES)", "SALES"
    if "ban giám đốc" in r or "executive" in r:
        return "Toàn công ty (Global)", "GLOBAL"
    return raw_name, "SALES"


async def serialize_user_admin_out(
    u: User,
    dept_map: Optional[dict] = None,
    db: Optional[AsyncSession] = None,
) -> UserAdminOut:
    dept_name = None
    dept_code = None
    if u.department_id:
        if dept_map and str(u.department_id) in dept_map:
            raw_name = dept_map[str(u.department_id)]
            dept_name, dept_code = normalize_dept_label_and_code(raw_name)
        elif db:
            dept_res = await db.execute(
                text("SELECT name FROM departments WHERE department_id = :did"),
                {"did": u.department_id},
            )
            row = dept_res.fetchone()
            if row:
                dept_name, dept_code = normalize_dept_label_and_code(row[0])

    u_role = canonical_role(u.role)
    if u_role in ("it_admin", "executive"):
        dept_code = "GLOBAL"
        dept_name = "Toàn công ty (Global)"
    elif not dept_code:
        dept_code = "SALES"
        dept_name = "Kinh doanh (SALES)"

    return UserAdminOut(
        user_id=u.user_id,
        email=u.email,
        username=u.username,
        full_name=u.full_name,
        role=u.role,
        department_id=u.department_id,
        department_name=dept_name,
        department_code=dept_code,
        status=getattr(u, "status", "active") or ("active" if u.is_active else "locked"),
        is_active=u.is_active,
        is_superuser=u.is_superuser,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
        last_active_at=u.last_active_at,
        deleted_at=u.deleted_at,
    )


async def count_active_admins(db: AsyncSession) -> int:
    """Đếm số lượng Admin hệ thống đang ở trạng thái hoạt động."""
    result = await db.execute(
        select(User).where(
            User.deleted_at.is_(None),
            User.is_active == True,
            User.status == "active",
        )
    )
    users = result.scalars().all()
    return sum(1 for u in users if is_system_admin(u))


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
    """Trả về toàn bộ danh sách tài khoản chưa bị xóa mềm."""
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    dept_res = await db.execute(text("SELECT department_id, name FROM departments"))
    dept_map = {str(r[0]): r[1] for r in dept_res.fetchall()}
    return [await serialize_user_admin_out(u, dept_map=dept_map) for u in users]


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

    dept_id = body.department_id
    if not dept_id and body.department_code:
        dept_id = DEPT_CODE_TO_ID.get(body.department_code.upper())
    if not dept_id and canonical_role(body.role) in ("knowledge_manager", "standard"):
        dept_id = DEPT_CODE_TO_ID.get("SALES")

    new_user = User(
        email=body.email.lower().strip(),
        username=username,
        password_hash=get_password_hash(body.password),
        full_name=body.full_name,
        role=body.role,
        department_id=dept_id,
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
        detail=f"email={new_user.email} role={new_user.role} dept_id={dept_id}",
    )
    await db.commit()
    await db.refresh(new_user)
    return await serialize_user_admin_out(new_user, db=db)


# ── PATCH /admin/users/{user_id}/role ────────────────────────────────────────

@router.patch("/users/{user_id}/role", response_model=UserAdminOut)
async def change_role(
    user_id: uuid.UUID,
    body: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Đổi role. Admin không thể đổi role của chính mình. Bảo vệ Admin duy nhất."""
    if user_id == actor.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể đổi role của chính mình.")

    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    # Nếu hạ quyền một Admin hệ thống đang active xuống role khác
    if is_system_admin(target) and target.is_active and getattr(target, "status", "active") == "active" and body.role != "it_admin":
        if await count_active_admins(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hệ thống phải có ít nhất 1 Admin hệ thống ở trạng thái hoạt động",
            )

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
    await db.commit()
    await db.refresh(target)
    return await serialize_user_admin_out(target, db=db)


# ── PATCH /admin/users/{user_id}/department ──────────────────────────────────

@router.patch("/users/{user_id}/department", response_model=UserAdminOut)
async def change_department(
    user_id: uuid.UUID,
    body: UserDepartmentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Cập nhật phòng ban trực thuộc cho người dùng."""
    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    target_dept_id = body.department_id
    if not target_dept_id and body.department_code:
        target_dept_id = DEPT_CODE_TO_ID.get(body.department_code.upper())

    old_dept_id = target.department_id
    target.department_id = target_dept_id

    await log_action(
        db,
        action="DEPARTMENT_CHANGE",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"Phòng ban: {old_dept_id} → {target_dept_id} (code: {body.department_code})",
    )
    await db.commit()
    await db.refresh(target)
    return await serialize_user_admin_out(target, db=db)


# ── PATCH /admin/users/{user_id}/lock ────────────────────────────────────────

@router.patch("/users/{user_id}/lock", response_model=UserAdminOut)
async def lock_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Khóa tài khoản (status = 'locked', is_active = False)."""
    if user_id == actor.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản của chính mình.")

    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    if is_system_admin(target) and target.is_active and getattr(target, "status", "active") == "active":
        if await count_active_admins(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hệ thống phải có ít nhất 1 Admin hệ thống ở trạng thái hoạt động",
            )

    target.set_status("locked")
    await log_action(
        db,
        action="USER_LOCK",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"email={target.email} role={target.role}",
    )
    await db.commit()
    await db.refresh(target)
    return await serialize_user_admin_out(target, db=db)


# ── PATCH /admin/users/{user_id}/unlock ──────────────────────────────────────

@router.patch("/users/{user_id}/unlock", response_model=UserAdminOut)
async def unlock_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Mở khóa tài khoản (status = 'active', is_active = True)."""
    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    target.set_status("active")
    await log_action(
        db,
        action="USER_UNLOCK",
        actor_id=actor.user_id,
        resource_type="user",
        resource_id=str(target.user_id),
        detail=f"email={target.email} role={target.role}",
    )
    await db.commit()
    await db.refresh(target)
    return await serialize_user_admin_out(target, db=db)


# ── PATCH /admin/users/{user_id}/reset-password ──────────────────────────────

@router.patch("/users/{user_id}/reset-password", response_model=UserAdminOut)
async def reset_password(
    user_id: uuid.UUID,
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Đặt lại mật khẩu người dùng."""
    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
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
    await db.commit()
    await db.refresh(target)
    return await serialize_user_admin_out(target, db=db)


# ── DELETE /admin/users/{user_id} ─────────────────────────────────────────────

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_admin_user),
):
    """Xóa tài khoản: xóa mềm nếu có dữ liệu liên quan, xóa cứng nếu chưa có dữ liệu."""
    if user_id == actor.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự xóa chính mình.")

    result = await db.execute(select(User).where(User.user_id == user_id, User.deleted_at.is_(None)))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    if target.username == "admin" or target.email == "admin@graphmind.ai" or target.full_name == "Administrator":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể xóa tài khoản Administrator gốc.")

    if is_system_admin(target) and target.is_active and getattr(target, "status", "active") == "active":
        if await count_active_admins(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hệ thống phải có ít nhất 1 Admin hệ thống ở trạng thái hoạt động",
            )

    from app.db.postgres.models.copilot_session import CopilotSession
    sessions_res = await db.execute(select(func.count()).select_from(CopilotSession).where(CopilotSession.user_id == user_id))
    sessions_cnt = sessions_res.scalar_one() or 0

    audit_res = await db.execute(select(func.count()).select_from(AuditLog).where(AuditLog.actor_id == user_id))
    audit_cnt = audit_res.scalar_one() or 0

    email_snapshot = target.email
    now = datetime.now(timezone.utc)

    if (sessions_cnt + audit_cnt) > 0:
        # Soft delete: lưu dấu thời điểm xóa, khóa tài khoản, giải phóng email
        target.deleted_at = now
        target.set_status("locked")
        target.email = f"{target.email}__deleted_{int(now.timestamp())}"
        await log_action(
            db,
            action="USER_DELETE",
            actor_id=actor.user_id,
            resource_type="user",
            resource_id=str(user_id),
            detail=f"delete_type=soft email={email_snapshot}",
        )
        await db.commit()
    else:
        # Hard delete
        await db.delete(target)
        await log_action(
            db,
            action="USER_DELETE",
            actor_id=actor.user_id,
            resource_type="user",
            resource_id=str(user_id),
            detail=f"delete_type=hard email={email_snapshot}",
        )
        await db.commit()


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


MAX_VERIFY_CHUNK_SIZE = 10000
_VERIFY_RATE_LIMIT = defaultdict(list)
_VERIFY_RATE_WINDOW_SECONDS = 60.0
_VERIFY_RATE_MAX_REQUESTS = 10


def _check_verify_rate_limit(actor_id: str):
    now = time.time()
    history = [t for t in _VERIFY_RATE_LIMIT[actor_id] if now - t < _VERIFY_RATE_WINDOW_SECONDS]
    if len(history) >= _VERIFY_RATE_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều yêu cầu kiểm tra toàn vẹn audit logs. Vui lòng thử lại sau 1 phút.",
        )
    history.append(now)
    _VERIFY_RATE_LIMIT[actor_id] = history


@router.get("/audit-logs/verify")
@router.post("/audit-logs/verify")
async def verify_audit_logs_endpoint(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    from_seq: Optional[int] = Query(None, ge=1, description="Số thứ tự bắt đầu chuỗi cần kiểm tra"),
    to_seq: Optional[int] = Query(None, ge=1, description="Số thứ tự kết thúc chuỗi cần kiểm tra"),
):
    """
    PB42 Phần 1B — Endpoint Admin kiểm chứng chuỗi băm toàn vẹn (tamper-evident) của audit_logs.
    Bảo vệ chống DoS bằng Rate Limit (10 req/phút) và giới hạn kích thước đoạn (tối đa 10,000 bản ghi/lần).
    """
    _check_verify_rate_limit(str(admin.user_id))

    if from_seq is not None and to_seq is not None:
        if to_seq < from_seq:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"to_seq ({to_seq}) phải lớn hơn hoặc bằng from_seq ({from_seq}).",
            )
        chunk_size = to_seq - from_seq + 1
        if chunk_size > MAX_VERIFY_CHUNK_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kích thước đoạn kiểm tra ({chunk_size}) vượt quá giới hạn tối đa ({MAX_VERIFY_CHUNK_SIZE} bản ghi/lần).",
            )

    return await verify_audit_chain(db, from_seq=from_seq, to_seq=to_seq)


from app.modules.m6_admin_security.permissions_api import router as permissions_router

router.include_router(permissions_router)
