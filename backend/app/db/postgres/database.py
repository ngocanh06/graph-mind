"""
PostgreSQL Async Database Engine & Session Factory
Driver: asyncpg  |  ORM: SQLAlchemy 2.x async
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

try:
    from app.core.config import settings
except ImportError:
    from core.config import settings


# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.async_database_url,
    echo=(settings.APP_ENV == "development"),  # log SQL khi dev
    pool_pre_ping=True,                         # kiểm tra connection trước khi dùng
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Base class cho tất cả ORM models ─────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency injection cho FastAPI endpoints ────────────────────────────────
async def get_db() -> AsyncSession:
    """
    FastAPI dependency — inject database session vào endpoint.

    Dùng:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Tạo / xóa toàn bộ tables (dùng trong dev/test, production dùng Alembic) ─
async def create_all_tables():
    """Tạo tất cả tables từ ORM models. Chỉ dùng trong dev/test."""
    # Import models để Base.metadata nhận diện được
    from app.db.postgres.models import user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all_tables():
    """Xóa tất cả tables. Dùng thận trọng!"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
