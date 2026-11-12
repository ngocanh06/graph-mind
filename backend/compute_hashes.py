import hashlib
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

def get_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

async def compute_prechain_hash():
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at
            FROM audit_logs
            WHERE pre_chain = TRUE
            ORDER BY created_at ASC, audit_id ASC;
        """))
        rows = res.fetchall()
        print(f"Total pre_chain rows: {len(rows)}")
        
        # Calculate deterministic aggregate hash
        h = hashlib.sha256()
        for r in rows:
            # Hash representation of each row
            row_str = "|".join(str(c or "") for c in r)
            h.update(row_str.encode("utf-8"))
        pre_chain_hash = h.hexdigest()
        print(f"Pre-chain aggregate SHA-256: {pre_chain_hash}")
        
    await engine.dispose()
    return pre_chain_hash

if __name__ == "__main__":
    baseline_csv = Path("benchmarks/baseline_telemetry_54.csv")
    if baseline_csv.exists():
        csv_hash = get_file_sha256(str(baseline_csv))
        print(f"Baseline CSV SHA-256: {csv_hash}")
    else:
        print("Baseline CSV not found")
        
    asyncio.run(compute_prechain_hash())

