"""
User model — lưu thông tin tài khoản người dùng
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, synonym

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="standard_user", index=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Backward compatibility synonyms
    id = synonym("user_id")
    hashed_password = synonym("password_hash")

    def __repr__(self) -> str:
        return f"<User user_id={self.user_id} email={self.email} role={self.role}>"

