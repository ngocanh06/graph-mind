"""
Authentication API Router — /api/v1/auth
Endpoints:
- POST /api/v1/auth/login: Xác thực đăng nhập qua email hoặc username và mật khẩu
- GET  /api/v1/auth/me: Lấy thông tin tài khoản hiện tại từ JWT token
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import create_access_token, decode_access_token, verify_password
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
    from app.schemas.auth import LoginRequest, TokenResponse, UserOut
except ImportError:
    from core.security import create_access_token, decode_access_token, verify_password
    from db.postgres.database import get_db
    from db.postgres.models.user import User
    from schemas.auth import LoginRequest, TokenResponse, UserOut

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

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trong hệ thống.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị khóa hoặc chưa được kích hoạt.",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mật khẩu không chính xác.",
        )

    # Xác định Role tương ứng cho giao diện
    role = resolve_user_role(user.username, user.email, user.is_superuser)

    # Sinh JWT Token
    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": role,
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )

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

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")

    role = resolve_user_role(user.username, user.email, user.is_superuser)

    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )
