"""
Admin API — CRUD tài khoản + gán vai trò RBAC + tra cứu Audit Log (PB02 – US13).
Prefix khi đăng ký: /api/v1/admin. Chỉ role "it_admin" trong JWT mới được gọi.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import cast, or_, select
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import decode_access_token, get_password_hash
    from app.db.postgres.database import get_db
    from app.db.postgres.models.audit_log import AuditLog
    from app.db.postgres.models.user import User
    from app.modules.m6_admin_security.audit_service import log_action
except ImportError:
    from core.security import decode_access_token, get_password_hash
    from db.postgres.database import get_db
    from db.postgres.models.audit_log import AuditLog
    from db.postgres.models.user import User
    from modules.m6_admin_security.audit_service import log_action

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)

# Nhãn của enum PostgreSQL `system_role` (cột users.role); auth.STORED_ROLE_MAP ánh xạ sang role trong JWT
VALID_ROLES = {"admin", "executive", "department_manager", "standard_user"}


def _role_sql(role: str):
    return cast(role, PG_ENUM(name="system_role", create_type=False))


# ── Guard ────────────────────────────────────────────────────────────────────
async def require_admin(cred: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> dict:
    payload = decode_access_token(cred.credentials) if cred else None
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn.")
    if payload.get("role") != "it_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Chỉ Admin hệ thống mới có quyền thực hiện.")
    return payload


# ── Schemas ──────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8)
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "standard_user"
    department_id: Optional[uuid.UUID] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    department_id: Optional[uuid.UUID] = None


class RoleAssign(BaseModel):
    role: str


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


def _out(u: User) -> dict:
    return {
        "id": str(u.user_id), "email": u.email, "username": u.username, "full_name": u.full_name,
        "role": u.role, "department_id": str(u.department_id) if u.department_id else None,
        "is_active": u.is_active, "created_at": u.created_at, "last_login_at": u.last_login_at,
    }


def _check_role(role: str) -> None:
    if role not in VALID_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Role hợp lệ: {sorted(VALID_ROLES)}")


async def _get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy tài khoản.")
    return user


def _not_self(admin: dict, user: User, what: str) -> None:
    if admin.get("sub") == str(user.user_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Không thể {what} chính tài khoản đang đăng nhập.")


# ── Users CRUD ───────────────────────────────────────────────────────────────
@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    rows = (await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
    return [_out(u) for u in rows]


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    _check_role(body.role)
    user = User(
        email=body.email.lower(), username=body.username, full_name=body.full_name,
        role=_role_sql(body.role), department_id=body.department_id,
        password_hash=get_password_hash(body.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email hoặc username đã tồn tại.")
    await db.refresh(user)  # role vừa ghi là biểu thức CAST -> nạp lại giá trị thật
    log_action(db, admin, "USER_CREATE", "user", user.user_id, {"email": user.email, "role": user.role})
    return _out(user)


@router.get("/users/{user_id}")
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    return _out(await _get_user(db, user_id))


@router.patch("/users/{user_id}")
async def update_user(user_id: uuid.UUID, body: UserUpdate, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    user = await _get_user(db, user_id)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(user, k, v)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username đã tồn tại.")
    log_action(db, admin, "USER_UPDATE", "user", user.user_id, {k: str(v) for k, v in changes.items()})
    return _out(user)


@router.put("/users/{user_id}/role")
async def assign_role(user_id: uuid.UUID, body: RoleAssign, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    _check_role(body.role)
    user = await _get_user(db, user_id)
    _not_self(admin, user, "đổi vai trò")
    old, user.role = user.role, _role_sql(body.role)
    await db.flush()
    await db.refresh(user)
    log_action(db, admin, "ROLE_CHANGE", "user", user.user_id, {"from": old, "to": body.role})
    return _out(user)


@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: uuid.UUID, body: PasswordReset, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    user = await _get_user(db, user_id)
    user.password_hash = get_password_hash(body.new_password)
    log_action(db, admin, "PASSWORD_RESET", "user", user.user_id)  # không log mật khẩu
    return {"ok": True}


@router.post("/users/{user_id}/lock")
async def set_lock(user_id: uuid.UUID, locked: bool = True, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    user = await _get_user(db, user_id)
    _not_self(admin, user, "khóa")
    user.is_active = not locked
    log_action(db, admin, "USER_LOCK" if locked else "USER_UNLOCK", "user", user.user_id)
    return _out(user)


@router.delete("/users/{user_id}")
async def delete_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)):
    user = await _get_user(db, user_id)
    _not_self(admin, user, "xóa")
    log_action(db, admin, "USER_DELETE", "user", user.user_id, {"email": user.email, "role": user.role})
    await db.delete(user)
    return {"ok": True}


# ── Audit log (đọc) ──────────────────────────────────────────────────────────
@router.get("/audit-logs")
async def list_audit_logs(
    actor: Optional[str] = None, action: Optional[str] = None, resource_type: Optional[str] = None,
    limit: int = Query(100, le=500), offset: int = 0,
    db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin),
):
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    if actor:
        like = f"%{actor}%"
        q = q.where(or_(AuditLog.detail["actor_email"].astext.ilike(like), AuditLog.detail["email"].astext.ilike(like)))
    if action:
        q = q.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        d = r.detail or {}  # log cũ lưu email ở details.email, log mới ở details.actor_email
        out.append({
            "id": str(r.log_id), "time": r.created_at,
            "actor": d.get("actor_email") or d.get("email") or (str(r.actor_id) if r.actor_id else None),
            "action": r.action, "resource_type": r.resource_type, "resource_id": r.resource_id,
            "detail": d, "status": d.get("status", "success"),
        })
    return out
