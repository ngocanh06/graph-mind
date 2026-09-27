"""
Alembic migration environment — async SQLAlchemy setup.
- Đọc DATABASE_URL từ app settings (không hardcode)
- Hỗ trợ autogenerate dựa trên ORM models
"""
import asyncio
import sys
import os

from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Thêm backend root vào sys.path để import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import settings và Base sau khi sys.path được cập nhật
from app.core.config import settings
from app.db.postgres.database import Base

# Import tất cả models để autogenerate nhận diện được
from app.db.postgres.models import *  # noqa: F401, F403

# ── Alembic config ─────────────────────────────────────────────────────────
config = context.config

# Load logging config từ alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Đặt metadata để autogenerate so sánh với DB hiện tại
target_metadata = Base.metadata

# Override URL từ settings (sync URL dùng psycopg2 cho Alembic)
config.set_main_option("sqlalchemy.url", settings.sync_database_url)


# ── Offline mode (generate SQL scripts, không cần DB thật) ─────────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (kết nối DB thật và chạy migration) ───────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Async entry point — dùng asyncpg engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # Override URL thành async URL (asyncpg) cho engine thật
        url=settings.async_database_url,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ── Entrypoint ─────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
