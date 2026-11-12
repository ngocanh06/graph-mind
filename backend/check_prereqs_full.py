import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal
from app.core.config import settings

async def main():
    async with AsyncSessionLocal() as session:
        print("=== 1. AUDIT LOGS TRIGGER CHECK ===")
        res = await session.execute(text("""
            SELECT tgname, pg_get_triggerdef(oid)
            FROM pg_trigger
            WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal;
        """))
        for row in res.fetchall():
            print(f"Trigger: {row[0]} -> {row[1]}")

        print("\n=== 2. TELEMETRY BREAKDOWN ===")
        res = await session.execute(text("""
            SELECT 
                query_outcome,
                answer_path,
                count(*) as cnt,
                min(total_latency_ms) as min_ms,
                max(total_latency_ms) as max_ms,
                avg(total_latency_ms)::int as avg_ms,
                avg(llm_ms)::int as avg_llm,
                avg(classify_ms)::int as avg_classify,
                avg(graph_retrieval_ms)::int as avg_graph,
                avg(vector_retrieval_ms)::int as avg_vector
            FROM copilot_query_telemetry
            GROUP BY query_outcome, answer_path
            ORDER BY cnt DESC;
        """))
        for row in res.mappings():
            print(dict(row))

        print("\n=== 3. DEGRADED FALLBACK DETAILED ROWS ===")
        res = await session.execute(text("""
            SELECT 
                id, total_latency_ms, classify_ms, vector_retrieval_ms, graph_retrieval_ms, fusion_ms, llm_ms,
                query_outcome, answer_path, is_benchmark
            FROM copilot_query_telemetry
            WHERE query_outcome = 'degraded_fallback'
            ORDER BY total_latency_ms DESC
            LIMIT 10;
        """))
        for row in res.mappings():
            print(dict(row))

        print("\n=== 4. MAX LATENCY ROW (max_ms = 2041687?) ===")
        res = await session.execute(text("""
            SELECT 
                id, total_latency_ms, classify_ms, vector_retrieval_ms, graph_retrieval_ms, fusion_ms, llm_ms,
                query_outcome, answer_path, is_benchmark, created_at
            FROM copilot_query_telemetry
            WHERE total_latency_ms > 100000
            ORDER BY total_latency_ms DESC;
        """))
        rows = res.mappings().all()
        print(f"Rows with latency > 100s: {len(rows)}")
        for r in rows:
            print(dict(r))

    print("\n=== 5. OLLAMA / LLM TIMEOUT SETTINGS ===")
    print("OLLAMA_BASE_URL:", getattr(settings, "OLLAMA_BASE_URL", None))
    print("OLLAMA_TIMEOUT:", getattr(settings, "OLLAMA_TIMEOUT", None))
    print("OLLAMA_CHAT_MODEL:", getattr(settings, "OLLAMA_CHAT_MODEL", None))

if __name__ == "__main__":
    asyncio.run(main())

