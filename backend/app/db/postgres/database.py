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
    from app.db.postgres.models import user, copilot_session, sop_document, audit_log, knowledge_permission, otp  # noqa: F401
    from app.modules.m6_admin_security import rbac_matrix_model  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate columns for copilot_sessions if table already existed (US37 / PB59 / UC.18)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS department VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS pinned_by_name VARCHAR(255);"))
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;"))
        await conn.execute(text("ALTER TABLE copilot_sessions ADD COLUMN IF NOT EXISTS pin_notes VARCHAR(1000);"))

        # Migrate role to varchar for users & rbac_permissions, and ensure audit_logs columns (M6 Admin)
        try:
            await conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE varchar(50) USING role::varchar;"))
            await conn.execute(text("ALTER TABLE rbac_permissions ALTER COLUMN role TYPE varchar(50) USING role::varchar;"))
        except Exception:
            pass
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id uuid;"))
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type varchar(50);"))
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id varchar(150);"))
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'OK';"))
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS detail varchar(500);"))

        # Migrate users status, deleted_at, last_login_at, last_active_at
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NULL;"))
        await conn.execute(text("UPDATE users SET status = CASE WHEN is_active = true THEN 'active' ELSE 'locked' END WHERE status IS NULL;"))


async def drop_all_tables():
    """Xóa tất cả tables. Dùng thận trọng!"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
