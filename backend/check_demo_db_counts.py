import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        db_name = (await session.execute(text("SELECT current_database();"))).scalar()
        print("Demo Database Name:", db_name)
        
        counts = {}
        for tbl in ["users", "audit_logs", "knowledge_access_policies", "copilot_query_telemetry", "shift_reports"]:
            try:
                cnt = (await session.execute(text(f"SELECT count(*) FROM {tbl};"))).scalar()
                counts[tbl] = cnt
            except Exception as e:
                counts[tbl] = f"Error: {e}"
        print("Demo Database Table Counts:", counts)

if __name__ == "__main__":
    asyncio.run(check())

