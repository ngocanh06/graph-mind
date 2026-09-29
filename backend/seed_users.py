import asyncio
import uuid
import sys
import os

# Đảm bảo đường dẫn import cho app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.db.postgres.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings
from sqlalchemy import select

async def main():
    engine = create_async_engine(settings.async_database_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    users_data = [
        {"username": "exec", "email": "executive@graphmind.ai", "password": "123456", "is_superuser": False, "full_name": "Lãnh đạo"},
        {"username": "admin", "email": "admin@graphmind.ai", "password": "123456", "is_superuser": True, "full_name": "Admin"},
        {"username": "manager", "email": "manager@graphmind.ai", "password": "123456", "is_superuser": False, "full_name": "Manager"},
        {"username": "ops", "email": "ops@graphmind.ai", "password": "123456", "is_superuser": False, "full_name": "Nhân viên nghiệp vụ"},
    ]
    
    async with async_session() as session:
        for data in users_data:
            stmt = select(User).where(User.username == data["username"])
            result = await session.execute(stmt)
            existing_user = result.scalars().first()
            if not existing_user:
                new_user = User(
                    id=uuid.uuid4(),
                    username=data["username"],
                    email=data["email"],
                    hashed_password=get_password_hash(data["password"]),
                    is_superuser=data["is_superuser"],
                    full_name=data["full_name"],
                    is_active=True
                )
                session.add(new_user)
                print(f"Added user: {data['username']} ({data['email']})")
            else:
                print(f"User {data['username']} already exists")
        await session.commit()
    
    await engine.dispose()
    print("Xong!")

if __name__ == "__main__":
    asyncio.run(main())
