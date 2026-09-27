"""
Seed script — Tạo các tài khoản mặc định cho hệ thống Graph Mind.

Chạy lệnh:
    cd backend
    python -m app.db.postgres.seeds.seed_users
    hoặc:
    python app/db/postgres/seeds/seed_users.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

import bcrypt
from sqlalchemy.future import select

try:
    from app.db.postgres.database import AsyncSessionLocal
    from app.db.postgres.models.user import User
except ImportError:
    from db.postgres.database import AsyncSessionLocal
    from db.postgres.models.user import User

# ── Password hashing ──────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# ── Danh sách users cần seed ──────────────────────────────────────────────────
SEED_USERS = [
    {
        "username": "exec",
        "email": "executive@graphmind.ai",
        "full_name": "Executive (Lãnh đạo)",
        "password": "123456",
        "is_superuser": True,
        "is_active": True,
    },
    {
        "username": "admin",
        "email": "admin@graphmind.ai",
        "full_name": "Administrator",
        "password": "123456",
        "is_superuser": True,
        "is_active": True,
    },
    {
        "username": "manager",
        "email": "manager@graphmind.ai",
        "full_name": "Manager (Quản lý)",
        "password": "123456",
        "is_superuser": False,
        "is_active": True,
    },
    {
        "username": "ops",
        "email": "ops@graphmind.ai",
        "full_name": "Operations (Nhân viên nghiệp vụ)",
        "password": "123456",
        "is_superuser": False,
        "is_active": True,
    },
]


async def seed_users():
    print("[*] Seeding users...")
    async with AsyncSessionLocal() as session:
        created = 0
        skipped = 0

        for data in SEED_USERS:
            # Kiểm tra đã tồn tại chưa (theo email)
            result = await session.execute(
                select(User).where(User.email == data["email"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"  [SKIP]    [{data['username']:8}] -- {data['email']} (already exists)")
                skipped += 1
                continue

            user = User(
                username=data["username"],
                email=data["email"],
                full_name=data["full_name"],
                hashed_password=hash_password(data["password"]),
                is_superuser=data["is_superuser"],
                is_active=data["is_active"],
            )
            session.add(user)
            print(f"  [OK]      [{data['username']:8}] -- {data['email']}")
            created += 1

        await session.commit()

    print(f"\n[DONE] Created: {created} | Skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(seed_users())
