import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal

async def survey():
    async with AsyncSessionLocal() as session:
        # Check users columns
        res = await session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """))
        print("USERS COLUMNS:")
        for r in res.fetchall():
            print(f" - {r[0]} ({r[1]})")

        # Check knowledge_access_policies columns
        res = await session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_access_policies'
            ORDER BY ordinal_position;
        """))
        print("\nKNOWLEDGE_ACCESS_POLICIES COLUMNS:")
        for r in res.fetchall():
            print(f" - {r[0]} ({r[1]})")

        # Check existing audit-logs endpoints in routes
        # Also check existing routers

if __name__ == "__main__":
    asyncio.run(survey())

