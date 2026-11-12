import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT current_user, session_user, usesuper FROM pg_user WHERE usename = current_user;"))
        print("Role info:", res.fetchone())
        
        res2 = await conn.execute(text("SELECT tableowner FROM pg_tables WHERE tablename = 'audit_logs';"))
        print("Table owner:", res2.fetchone())
        
        res3 = await conn.execute(text("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'audit_logs';"))
        print("Grants on audit_logs:", res3.fetchall())
        
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
