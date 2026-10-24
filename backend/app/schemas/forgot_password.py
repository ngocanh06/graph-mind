"""
Pydantic schemas cho luồng Quên mật khẩu & OTP (M6 - PB43)
"""
import re
from pydantic import BaseModel, field_validator


_PWD_RE = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$')


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    otp_code: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_policy(cls, v: str) -> str:
        if not _PWD_RE.match(v):
            raise ValueError(
                "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
            )
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Mật khẩu xác nhận không khớp")
        return v
