"""
OTP Service (M6 - PB43) — sinh OTP, gửi email, rate-limit, verify
Dùng cho luồng Quên mật khẩu. Không chạm luồng JWT/OAuth cũ.
"""
import logging
import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.postgres.models.otp import PasswordResetOtp

logger = logging.getLogger(__name__)

OTP_TTL_MINUTES = 1
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW_MINUTES = 15
MAX_ATTEMPTS = 5


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def check_rate_limit(db: AsyncSession, email: str) -> bool:
    """True nếu còn trong giới hạn, False nếu đã vượt rate-limit."""
    window_start = _now_utc() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
    stmt = select(func.count()).where(
        PasswordResetOtp.email == email.lower(),
        PasswordResetOtp.created_at >= window_start,
    )
    count = (await db.execute(stmt)).scalar_one()
    return count < RATE_LIMIT_COUNT


async def create_otp(db: AsyncSession, email: str) -> str:
    """Tạo OTP mới, lưu hash vào DB, trả về plain OTP để gửi email."""
    plain_otp = str(random.randint(100_000, 999_999))
    otp_hash = PasswordResetOtp.hash_otp(plain_otp)
    entry = PasswordResetOtp(
        email=email.lower(),
        otp_hash=otp_hash,
        expires_at=_now_utc() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(entry)
    await db.flush()
    return plain_otp


from email.header import Header
from email.utils import formataddr


def _send_smtp(to_email: str, otp: str) -> None:
    """Gửi OTP qua SMTP. Raise nếu lỗi (caller sẽ log và bỏ qua)."""
    smtp_host = getattr(settings, "SMTP_HOST", "").strip()
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_user = getattr(settings, "SMTP_USER", "").strip()
    smtp_pass = getattr(settings, "SMTP_PASSWORD", "").strip()
    smtp_from = getattr(settings, "SMTP_FROM", "").strip() or smtp_user
    smtp_from_name = getattr(settings, "SMTP_FROM_NAME", "Admin").strip()

    # Xử lý nếu người dùng để comment hoặc khoảng trắng trong password
    if "#" in smtp_pass:
        smtp_pass = smtp_pass.split("#")[0].strip()
    smtp_pass = smtp_pass.replace(" ", "")

    if not smtp_host or not smtp_user or not smtp_pass or smtp_user == "email_cua_ban@gmail.com":
        raise ValueError("SMTP chưa cấu hình đầy đủ")

    body = (
        f"Xin chào,\n\n"
        f"Mã xác thực đặt lại mật khẩu của bạn là:\n\n"
        f"  {otp}\n\n"
        f"Mã có hiệu lực trong {OTP_TTL_MINUTES} phút.\n"
        f"Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.\n\n"
        f"— {smtp_from_name}"
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(f"[{smtp_from_name}] Mã xác thực đặt lại mật khẩu", "utf-8")
    msg["From"] = formataddr((str(Header(smtp_from_name, "utf-8")), smtp_from))
    msg["To"] = to_email

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as s:
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.sendmail(smtp_from, [to_email], msg.as_string())


async def send_otp_email(to_email: str, otp: str) -> None:
    """Gửi OTP. Dev fallback: in ra console nếu SMTP chưa cấu hình."""
    try:
        _send_smtp(to_email, otp)
        logger.info("[OTP] Sent to %s via SMTP", to_email)
    except Exception as exc:
        # Dev mode: in ra log để test mà không cần SMTP thật
        logger.warning("[OTP][DEV] SMTP not configured (%s). OTP for %s: %s", exc, to_email, otp)
        print(f"\n{'='*50}")
        print(f"[DEV] OTP for {to_email}: {otp}")
        print(f"{'='*50}\n")


async def get_latest_valid_otp(db: AsyncSession, email: str) -> Optional[PasswordResetOtp]:
    """Lấy bản ghi OTP mới nhất chưa dùng, chưa hết hạn, chưa vượt attempts."""
    stmt = (
        select(PasswordResetOtp)
        .where(
            PasswordResetOtp.email == email.lower(),
            PasswordResetOtp.is_used == False,  # noqa: E712
            PasswordResetOtp.expires_at > _now_utc(),
            PasswordResetOtp.attempt_count < MAX_ATTEMPTS,
        )
        .order_by(PasswordResetOtp.created_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def verify_otp(db: AsyncSession, email: str, plain_otp: str) -> tuple[bool, str]:
    """
    Verify OTP. Trả về (True, "ok") nếu hợp lệ.
    Trả về (False, reason) nếu không.
    Side-effect: tăng attempt_count, vô hiệu hoá nếu vượt MAX_ATTEMPTS.
    """
    # Kiểm tra các OTP còn hiệu lực
    row = await get_latest_valid_otp(db, email)
    if row is None:
        # Phân biệt hết hạn vs chưa tồn tại
        expired_stmt = select(PasswordResetOtp).where(
            PasswordResetOtp.email == email.lower(),
            PasswordResetOtp.is_used == False,  # noqa: E712
            PasswordResetOtp.expires_at <= _now_utc(),
        ).limit(1)
        expired = (await db.execute(expired_stmt)).scalar_one_or_none()
        if expired:
            return False, "OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới."
        return False, "Không tìm thấy mã OTP hợp lệ. Vui lòng yêu cầu gửi mã mới."

    if row.otp_hash != PasswordResetOtp.hash_otp(plain_otp):
        row.attempt_count += 1
        if row.attempt_count >= MAX_ATTEMPTS:
            row.is_used = True  # vô hiệu hoá ngay
            return False, "Nhập sai quá nhiều lần. Mã OTP đã bị vô hiệu hóa. Vui lòng yêu cầu mã mới."
        remaining = MAX_ATTEMPTS - row.attempt_count
        return False, f"Mã OTP không đúng. Còn {remaining} lần thử."

    return True, "ok"
