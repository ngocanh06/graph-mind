"""
OTP Model — bảng password_reset_otps (M6 - PB43)
Lưu mã OTP khôi phục mật khẩu. Hoàn toàn tách biệt với bảng users.
"""
import uuid
import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.database import Base


class PasswordResetOtp(Base):
    __tablename__ = "password_reset_otps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Lưu email thay vì FK để tránh join và vẫn hoạt động nếu user bị xoá
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    # OTP lưu dạng SHA-256 hash để không lộ plain text
    otp_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @staticmethod
    def hash_otp(plain: str) -> str:
        return hashlib.sha256(plain.encode()).hexdigest()
