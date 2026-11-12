import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine("postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_pb42_test")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"))
        print("Tables in graphmind_pb42_test:", [r[0] for r in res.fetchall()])
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
