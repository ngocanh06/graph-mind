import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs';"))
        print("Columns in audit_logs:")
        for row in res.fetchall():
            print(" ", row)
            
        res_chain = await conn.execute(text("SELECT max(chain_seq), count(*) FROM audit_logs WHERE chain_seq IS NOT NULL;"))
        print("Chained count & max chain_seq:", res_chain.fetchone())
        
        res_pre = await conn.execute(text("SELECT count(*) FROM audit_logs WHERE pre_chain = TRUE;"))
        print("pre_chain=True count:", res_pre.fetchone())

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
