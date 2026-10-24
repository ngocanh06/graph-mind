"""
Forgot Password Router (M6 - PB43)
Endpoints:
  POST /api/v1/auth/forgot-password  — gửi OTP
  POST /api/v1/auth/verify-otp       — xác thực OTP
  POST /api/v1/auth/reset-password   — đặt lại mật khẩu

Không chạm luồng JWT/OAuth/Admin cũ.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import timedelta
from app.core.security import get_password_hash
from app.db.postgres.database import get_db
from app.db.postgres.models.user import User
from app.db.postgres.models.otp import PasswordResetOtp
from app.modules.m6_admin_security.audit_service import log_action
from app.modules.m6_admin_security.otp_service import (
    check_rate_limit,
    create_otp,
    get_latest_valid_otp,
    send_otp_email,
    verify_otp,
    _now_utc,
)
from app.schemas.forgot_password import (
    ForgotPasswordRequest,
    VerifyOtpRequest,
    ResetPasswordRequest,
)

router = APIRouter(tags=["M6 Forgot Password"])


async def _get_active_user(db: AsyncSession, email: str) -> User:
    """Helper: tìm user active theo email, raise 404/403 nếu không hợp lệ."""
    result = await db.execute(select(User).where(User.email.ilike(email)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email không tồn tại trong hệ thống.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị khóa. Vui lòng liên hệ Admin.",
        )
    return user


# ── Bước 1: Gửi OTP ──────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Kiểm tra email, rate-limit, tạo OTP và gửi email."""
    user = await _get_active_user(db, body.email)

    if not await check_rate_limit(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.",
        )

    plain_otp = await create_otp(db, body.email)
    await send_otp_email(body.email, plain_otp)

    return {"message": f"Mã xác thực đã được gửi đến {body.email}. Vui lòng kiểm tra hộp thư."}


# ── Bước 2: Xác thực OTP ────────────────────────────────────────────────────

@router.post("/verify-otp", status_code=status.HTTP_200_OK)
async def verify_otp_endpoint(
    body: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """Xác thực mã OTP. Trả về xác nhận để FE cho phép chuyển bước 3."""
    await _get_active_user(db, body.email)  # đảm bảo user vẫn hợp lệ

    ok, reason = await verify_otp(db, body.email, body.otp_code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Khi xác thực OTP thành công ở Bước 2, gia hạn thêm 10 phút cho phiên đổi mật khẩu
    # để người dùng có đủ thời gian gõ mật khẩu mới phức tạp ở Bước 3 mà không bị timeout
    otp_row = await get_latest_valid_otp(db, body.email)
    if otp_row:
        otp_row.expires_at = _now_utc() + timedelta(minutes=10)
        await db.commit()

    return {"message": "Mã OTP hợp lệ. Vui lòng đặt mật khẩu mới.", "verified": True}


# ── Bước 3: Đặt lại mật khẩu ────────────────────────────────────────────────

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Xác thực lại OTP, cập nhật mật khẩu, ghi AuditLog."""
    user = await _get_active_user(db, body.email)

    # Xác thực OTP lần cuối (đây là thao tác "consume" token)
    ok, reason = await verify_otp(db, body.email, body.otp_code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Đánh dấu OTP đã dùng
    otp_result = await db.execute(
        select(PasswordResetOtp)
        .where(
            PasswordResetOtp.email == body.email.lower(),
            PasswordResetOtp.is_used == False,  # noqa: E712
            PasswordResetOtp.otp_hash == PasswordResetOtp.hash_otp(body.otp_code),
        )
        .limit(1)
    )
    otp_row = otp_result.scalar_one_or_none()
    if otp_row:
        otp_row.is_used = True

    # Cập nhật mật khẩu — chỉ ghi hash, không bao giờ lưu plain text
    user.password_hash = get_password_hash(body.new_password)

    # Ghi AuditLog (không lưu mật khẩu)
    await log_action(
        db,
        action="PASSWORD_RESET",
        actor_id=user.user_id,
        resource_type="user",
        resource_id=str(user.user_id),
        detail=f"Đặt lại mật khẩu thành công qua OTP — email={user.email}",
    )

    return {"message": "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."}
