"""
Authentication API Router — /api/v1/auth
Endpoints:
- POST /api/v1/auth/login: Xác thực đăng nhập qua email hoặc username và mật khẩu
- GET  /api/v1/auth/me: Lấy thông tin tài khoản hiện tại từ JWT token
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import create_access_token, decode_access_token, verify_password
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
    from app.schemas.auth import LoginRequest, TokenResponse, UserOut
    from app.modules.m6_admin_security.audit_service import log_action
    from app.modules.m6_admin_security.rbac import canonical_role
    from app.modules.m6_admin_security.session_service import (
        ensure_sessions_table, upsert_active_session, get_active_jti,
        ConcurrentLoginException, clear_active_session
    )
except ImportError:
    from core.security import create_access_token, decode_access_token, verify_password
    from db.postgres.database import get_db
    from db.postgres.models.user import User
    from schemas.auth import LoginRequest, TokenResponse, UserOut
    from modules.m6_admin_security.audit_service import log_action
    from modules.m6_admin_security.rbac import canonical_role
    from modules.m6_admin_security.session_service import (
        ensure_sessions_table, upsert_active_session, get_active_jti,
        ConcurrentLoginException, clear_active_session
    )

router = APIRouter()
security_bearer = HTTPBearer(auto_error=False)


def resolve_user_role(username: str, email: str, is_superuser: bool) -> str:
    """Ánh xạ username/email sang role ID chuẩn của hệ thống Graph Mind"""
    u = (username or "").strip().lower()
    e = (email or "").strip().lower()
    if u in ["exec", "ceo", "cfo", "executive"] or "executive" in e:
        return "executive"
    if u in ["admin", "secops", "itadmin"] or "admin" in e:
        return "it_admin"
    if u in ["manager", "mgr", "lead"] or "manager" in e:
        return "knowledge_manager"
    return "standard"


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Đăng nhập hệ thống:
    - Chấp nhận identifier là Email (ví dụ: executive@graphmind.ai) hoặc Username (ví dụ: exec, admin, manager, ops)
    - Kiểm tra mật khẩu mã hóa bcrypt trong database PostgreSQL
    - Trả về JWT Access Token cùng thông tin User & Role
    """
    clean_identifier = payload.identifier.strip().lower()

    # Truy vấn người dùng theo email hoặc username
    stmt = select(User).where(
        or_(
            User.email.ilike(clean_identifier),
            User.username.ilike(clean_identifier),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trong hệ thống.",
        )

    if not user.is_active or getattr(user, "status", "active") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa, liên hệ quản trị viên",
        )

    if not verify_password(payload.password, user.password_hash):
        await log_action(db, action="LOGIN_FAIL", resource_type="user",
                         resource_id=str(user.user_id), detail=f"email={user.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mật khẩu không chính xác.",
        )

    # Cập nhật thời điểm đăng nhập & hoạt động
    now = datetime.now(timezone.utc)
    user.last_login_at = now
    user.last_active_at = now
    await db.commit()
    await db.refresh(user)

    # Role JWT lấy từ cột users.role (canonical), không còn ánh xạ cứng theo username
    role = canonical_role(user)

    # Sinh JWT Token voi jti de kiem soat phien don (Single Active Session)
    jti = str(uuid.uuid4())
    token_data = {
        "sub": str(user.user_id),
        "username": user.username or "",
        "email": user.email,
        "role": role,
        "jti": jti,
    }
    access_token = create_access_token(token_data)

    # Upsert phien hoat dong — van ng phien cu neu co
    await ensure_sessions_table(db)
    client_ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    had_prev = await upsert_active_session(db, user.user_id, jti, client_ip, ua)
    if had_prev:
        await log_action(db, action="LOGIN_NEW_DEVICE_REPLACED_OLD_SESSION",
                         actor_id=user.user_id, resource_type="user",
                         resource_id=str(user.user_id),
                         detail=f"email={user.email} ip={client_ip}")

    user_out = UserOut(
        id=user.user_id,
        email=user.email,
        username=user.username or "",
        full_name=user.full_name,
        role=role,
        status=getattr(user, "status", "active"),
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )

    await log_action(db, action="LOGIN", actor_id=user.user_id,
                     resource_type="user", resource_id=str(user.user_id),
                     detail=f"email={user.email} role={role}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_out,
    )


@router.get("/me", response_model=UserOut)
async def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin tài khoản hiện tại từ JWT Bearer token"""
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cung cấp JWT Bearer token.",
        )

    payload = decode_access_token(auth_header.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )

    user_id_str = payload["sub"]
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User ID không hợp lệ.")

    stmt = select(User).where(User.user_id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    if not user.is_active or getattr(user, "status", "active") == "locked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa, liên hệ quản trị viên")

    # Kiểm tra jti — phát hiện đăng nhập trùng tài khoản (Single Active Session)
    token_jti = payload.get("jti")
    if token_jti:
        await ensure_sessions_table(db)
        stored_jti = await get_active_jti(db, user_uuid)
        if stored_jti and stored_jti != token_jti:
            raise ConcurrentLoginException()

    role = canonical_role(user)

    return UserOut(
        id=user.user_id,
        email=user.email,
        username=user.username or "",
        full_name=user.full_name,
        role=role,
        status=getattr(user, "status", "active"),
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )


@router.post("/logout")
async def logout(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Đăng xuất tài khoản và vô hiệu hóa active session."""
    if auth_header and auth_header.credentials:
        try:
            payload = decode_access_token(auth_header.credentials)
            if payload and "sub" in payload:
                uid = uuid.UUID(payload["sub"])
                await clear_active_session(db, uid)
        except Exception:
            pass
    return {"success": True, "message": "Đã đăng xuất thành công."}
