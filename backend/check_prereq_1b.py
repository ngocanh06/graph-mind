import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m6_admin_security.audit_service import verify_audit_chain

async def check():
    async with AsyncSessionLocal() as session:
        # Check triggers on audit_logs
        res = await session.execute(text("""
            SELECT tgname, pg_get_triggerdef(oid) 
            FROM pg_trigger 
            WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal;
        """))
        triggers = res.fetchall()
        print("Triggers on audit_logs:")
        for t in triggers:
            print(f" - {t[0]}: {t[1]}")
            
        # Check audit chain validity on live DB
        v_res = await verify_audit_chain(session)
        print("Audit chain verify result on live DB:", v_res)

        # Check total rows, pre_chain rows, chained rows
        c_res = await session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE pre_chain = TRUE) as pre_chain,
                COUNT(*) FILTER (WHERE pre_chain = FALSE) as chained,
                MAX(chain_seq) as max_seq
            FROM audit_logs;
        """))
        counts = c_res.mappings().one()
        print("Audit rows count:", dict(counts))

if __name__ == "__main__":
    asyncio.run(check())
