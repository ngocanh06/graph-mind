"""
Export tất cả ORM models để Alembic autogenerate nhận diện được.
"""
from .user import User

__all__ = ["User"]
