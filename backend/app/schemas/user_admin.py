"""
Pydantic schemas cho User Admin API (M6)
"""
import uuid
from datetime import datetime
from typing import Optional, List
import re
from pydantic import BaseModel, field_validator

from app.modules.m6_admin_security.rbac import canonical_role


VALID_ROLES = {"executive", "it_admin", "knowledge_manager", "standard"}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "standard"

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Định dạng email không hợp lệ")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role không hợp lệ. Chọn một trong: {VALID_ROLES}")
        return v


class UserRoleUpdateRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role không hợp lệ. Chọn một trong: {VALID_ROLES}")
        return v


class PasswordResetRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v


class UserAdminOut(BaseModel):
    user_id: uuid.UUID
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    status: str = "active"
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("role", mode="before")
    @classmethod
    def canon_role(cls, v: str) -> str:
        return canonical_role(v)


class AuditLogOut(BaseModel):
    audit_id: uuid.UUID
    actor_id: Optional[uuid.UUID]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    status: str
    detail: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogOut]
