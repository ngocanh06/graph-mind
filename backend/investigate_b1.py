import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def analyze_b1():
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT 
                id, created_at, query_outcome, answer_path, total_latency_ms,
                classify_ms, graph_retrieval_ms, vector_retrieval_ms, fusion_ms, llm_ms
            FROM copilot_query_telemetry
            ORDER BY created_at ASC;
        """))
        rows = [dict(r) for r in res.mappings().all()]
        
    await engine.dispose()
    
    print(f"Total rows: {len(rows)}")
    print("\n--- PHÂN TÍCH TUẦN TỰ 54 LƯỢT BENCHMARK ---")
    
    # Analyze each row
    for i, r in enumerate(rows):
        prev = rows[i-1] if i > 0 else None
        prev_is_timeout = (prev and prev['query_outcome'] == 'degraded_fallback' and (prev['llm_ms'] or 0) >= 60000)
        
        path = r['answer_path']
        tot = r['total_latency_ms']
        llm = r['llm_ms'] or 0
        classify = r['classify_ms'] or 0
        graph = r['graph_retrieval_ms'] or 0
        vector = r['vector_retrieval_ms'] or 0
        fusion = r['fusion_ms'] or 0
        
        # Check fastpath SLO (> 1200ms)
        is_fastpath_miss = (path in ('nl2cypher_fastpath', 'grounding_gate') and tot > 1200)
        # Check fallback > 60s
        is_fallback_over_60s = (path == 'fallback' and tot >= 60000)
        
        if is_fastpath_miss or is_fallback_over_60s:
            prev_info = f"Seq #{i-1} ({prev['answer_path']}, outcome={prev['query_outcome']}, tot={prev['total_latency_ms']}ms, llm={prev['llm_ms']}ms)" if prev else "None (First)"
            print(f"\n[Seq #{i}] ID: {r['id']}")
            print(f"  Time: {r['created_at'].strftime('%H:%M:%S')} | Path: {path} | Outcome: {r['query_outcome']}")
            print(f"  Total Latency: {tot:,} ms | Stages: classify={classify}ms, graph={graph}ms, vector={vector}ms, fusion={fusion}ms, llm={llm:,}ms")
            overhead = tot - 60000 if path == 'fallback' else 0
            if path == 'fallback':
                non_llm_sum = classify + graph + vector + fusion
                llm_over_60 = max(0, llm - 60000)
                print(f"  -> Phần vượt 60s: {tot - 60000:,} ms. Phân rã: Non-LLM stages={non_llm_sum}ms, LLM over 60s={llm_over_60}ms, Khác={tot - (60000 + non_llm_sum + llm_over_60)}ms")
            print(f"  Lượt ngay trước đó có phải Timeout không? -> {'CÓ (TIMEOUT)' if prev_is_timeout else 'KHÔNG'} [{prev_info}]")

if __name__ == '__main__':
    asyncio.run(analyze_b1())

