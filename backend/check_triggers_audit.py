import asyncio
from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("""
            SELECT tgname, pg_get_triggerdef(oid) 
            FROM pg_trigger 
            WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal;
        """))
        for r in res.fetchall():
            print(f"{r[0]} -> {r[1]}")

if __name__ == "__main__":
    asyncio.run(check())

