import asyncio
import os

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.postgres.database import AsyncSessionLocal
from app.db.postgres.models.user import User


async def main():
    if os.environ.get("POSTGRES_SERVER") != "postgres" or os.environ.get("POSTGRES_DB") != "graph_mind_robot":
        raise RuntimeError("Refusing to seed users outside the isolated Robot staging database.")

    password = os.environ["ROBOT_TEST_PASSWORD"]
    users = (
        ("admin", "robot-admin@graphmind.test", "Robot Test Admin", "it_admin", True),
        ("robot-user", "robot-user@graphmind.test", "Robot Test User", "standard", False),
    )

    async with AsyncSessionLocal() as session:
        for username, email, full_name, role, is_superuser in users:
            existing = await session.scalar(select(User).where(User.email == email))
            if existing:
                continue
            session.add(
                User(
                    username=username,
                    email=email,
                    full_name=full_name,
                    password_hash=get_password_hash(password),
                    role=role,
                    is_superuser=is_superuser,
                    is_active=True,
                    status="active",
                )
            )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(main())
