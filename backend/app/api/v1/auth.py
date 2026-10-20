"""
Authentication API Router — /api/v1/auth
Endpoints:
- POST /api/v1/auth/login          : Đăng nhập
- GET  /api/v1/auth/me             : Thông tin tài khoản hiện tại
- POST /api/v1/auth/forgot-password: Gửi OTP về email
- POST /api/v1/auth/verify-otp     : Xác minh OTP
- POST /api/v1/auth/reset-password : Đặt lại mật khẩu sau khi OTP hợp lệ
"""
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import create_access_token, decode_access_token, verify_password, get_password_hash
    from app.core.config import settings
    from app.core.otp_store import generate_otp, verify_otp
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
    from app.schemas.auth import LoginRequest, TokenResponse, UserOut
    from app.modules.m6_admin_security.audit_service import log_action
except ImportError:
    from core.security import create_access_token, decode_access_token, verify_password, get_password_hash
    from core.config import settings
    from core.otp_store import generate_otp, verify_otp
    from db.postgres.database import get_db
    from db.postgres.models.user import User
    from schemas.auth import LoginRequest, TokenResponse, UserOut
    from modules.m6_admin_security.audit_service import log_action

# users.role (DB, gồm cả giá trị seed cũ) -> role ID trong JWT
STORED_ROLE_MAP = {
    "executive": "executive",
    "admin": "it_admin", "it_admin": "it_admin",
    "department_manager": "knowledge_manager", "knowledge_manager": "knowledge_manager",
    "standard_user": "standard", "standard": "standard",
}

router = APIRouter()
security_bearer = HTTPBearer(auto_error=False)


async def _send_otp_email(to_email: str, otp: str) -> None:
    """Gửi OTP qua Gmail SMTP (TLS). Raises nếu cấu hình thiếu."""
    smtp_host = getattr(settings, "SMTP_HOST", "")
    smtp_user = getattr(settings, "SMTP_USER", "")
    smtp_pass = getattr(settings, "SMTP_PASSWORD", "")
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))

    if not smtp_host or not smtp_user or not smtp_pass:
        # Dev fallback: in ra console thay vì gửi thật
        print(f"[DEV OTP] {to_email} → {otp}")
        return

    from email.utils import formataddr
    from_name = getattr(settings, "SMTP_FROM_NAME", "GraphMind Admin")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[GraphMind] Mã xác minh đặt lại mật khẩu"
    msg["From"] = formataddr((from_name, smtp_user))
    msg["To"] = to_email
    body = f"""\
<html><body style="font-family:sans-serif;background:#f8fafc;padding:32px">
<div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <h2 style="color:#002b3d;margin-bottom:8px">Đặt lại mật khẩu GraphMind</h2>
  <p style="color:#64748b;margin-bottom:24px">Mã OTP của bạn (hiệu lực <strong>10 phút</strong>):</p>
  <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#0284c7;text-align:center;padding:16px;background:#f0f9ff;border-radius:8px">{otp}</div>
  <p style="color:#94a3b8;font-size:12px;margin-top:20px">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
</div></body></html>"""
    msg.attach(MIMEText(body, "html"))
    await aiosmtplib.send(msg, hostname=smtp_host, port=smtp_port,
                          username=smtp_user, password=smtp_pass, start_tls=True)


def resolve_user_role(username: str, email: str, is_superuser: bool, stored_role: Optional[str] = None) -> str:
    """Ánh xạ role đã lưu (ưu tiên) hoặc username/email sang role ID chuẩn của hệ thống Graph Mind"""
    if stored_role in STORED_ROLE_MAP:
        return STORED_ROLE_MAP[stored_role]
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
    role = resolve_user_role(user.username, user.email, user.is_superuser, user.role)

    # Sinh JWT Token
    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": role,
    }
    access_token = create_access_token(token_data)
    log_action(db, {"sub": str(user.id), "email": user.email}, "LOGIN", "user", user.id, {"role": role})

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

    role = resolve_user_role(user.username, user.email, user.is_superuser, user.role)

    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )


# ── Quên mật khẩu (OTP flow) ─────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    identifier: str  # email hoặc username

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str = Field(min_length=8)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Bước 1: Tra email/username → tạo OTP → gửi email (hoặc in console nếu chưa cấu hình SMTP)."""
    clean = body.identifier.strip().lower()
    stmt = select(User).where(or_(User.email.ilike(clean), User.username.ilike(clean)))
    user = (await db.execute(stmt)).scalar_one_or_none()
    # Luôn trả 200 để tránh user enumeration
    if not user or not user.is_active:
        return {"ok": True, "message": "Nếu email tồn tại, OTP đã được gửi."}
    otp = generate_otp(user.email)
    try:
        await _send_otp_email(user.email, otp)
    except Exception as exc:
        # Không lộ lỗi SMTP ra ngoài; ghi log
        print(f"[OTP SEND ERROR] {exc}")
        print(f"[DEV OTP FALLBACK] {user.email} → {otp}")
    return {"ok": True, "email": user.email, "message": "Nếu email tồn tại, OTP đã được gửi."}


@router.post("/verify-otp")
async def verify_otp_endpoint(body: VerifyOtpRequest):
    """Bước 2: Kiểm tra OTP — trả 200 nếu hợp lệ, 400 nếu sai/hết hạn."""
    if not verify_otp(body.email.lower(), body.otp):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn.")
    # Phát token tạm để bước 3 reset — tái dùng OTP store bằng cách ghi lại "verified" token
    from app.core.otp_store import generate_otp as _gen
    reset_token = _gen(body.email.lower() + ":reset")  # OTP 6 số dùng làm reset_token
    return {"ok": True, "reset_token": reset_token}


@router.post("/reset-password-otp")
async def reset_password_otp(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Bước 3: Xác minh reset_token/OTP lần cuối + đặt mật khẩu mới."""
    reset_key = body.email.lower() + ":reset"
    if not (verify_otp(reset_key, body.otp) or verify_otp(body.email.lower(), body.otp)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn.")
    stmt = select(User).where(User.email.ilike(body.email.strip()))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tài khoản không tồn tại.")
    user.password_hash = get_password_hash(body.new_password)
    log_action(db, {"sub": str(user.user_id), "email": user.email}, "PASSWORD_RESET", "user", user.user_id)
    return {"ok": True, "message": "Mật khẩu đã được đặt lại thành công."}
