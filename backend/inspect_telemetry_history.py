import asyncio
from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("""
            SELECT 
                min(created_at) as min_created, 
                max(created_at) as max_created, 
                min(total_latency_ms) as min_ms, 
                max(total_latency_ms) as max_ms, 
                count(*) as total_count,
                count(*) FILTER (WHERE is_benchmark = TRUE) as benchmark_count,
                count(*) FILTER (WHERE is_benchmark = FALSE) as non_benchmark_count
            FROM copilot_query_telemetry;
        """))
        print(dict(res.mappings().one()))

        # Check distinct benchmark batches or runs
        res2 = await session.execute(text("""
            SELECT date_trunc('hour', created_at) as hr, count(*), max(total_latency_ms)
            FROM copilot_query_telemetry
            GROUP BY 1
            ORDER BY 1;
        """))
        print("Hourly groups:")
        for r in res2.mappings():
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(check())

