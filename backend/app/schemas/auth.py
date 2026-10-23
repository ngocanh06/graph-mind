"""
Pydantic schemas for Authentication & Users
"""
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    identifier: str  # Email hoặc username (exec, admin, manager, ops)
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_superuser: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str
