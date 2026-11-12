import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT tgname, tgenabled, pg_get_triggerdef(oid)
            FROM pg_trigger 
            WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal;
        """))
        for row in res.fetchall():
            print(f"Trigger: {row[0]}, tgenabled: '{row[1]}', def: {row[2]}")
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())

