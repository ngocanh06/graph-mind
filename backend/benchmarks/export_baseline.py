"""
Snapshot baseline 54 telemetry records without question text.
Stores CSV + metadata JSON with git commit hash, Ollama configuration, and system parameters.
"""
import asyncio
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.db.postgres.database import AsyncSessionLocal

BASELINE_CSV = BACKEND_DIR / "benchmarks" / "baseline_telemetry_54.csv"
BASELINE_META = BACKEND_DIR / "benchmarks" / "baseline_telemetry_54_metadata.json"

METADATA = {
    "snapshot_created_at_utc": datetime.now(timezone.utc).isoformat(),
    "git_commit_hash": "a64b90b4b6326ac7bb679145c77b32dee5bf7e57",
    "git_branch": "Admin",
    "database_name": "graphmind_db",
    "total_records": 54,
    "ollama_config": {
        "model": "qwen2.5:7b",
        "num_predict": 512,
        "temperature": 0.2,
        "top_p": 0.9,
        "repeat_penalty": 1.15,
        "client_timeout_seconds": 60.0,
        "client_connect_timeout_seconds": 3.0,
        "base_url": "http://localhost:11434"
    },
    "outlier_record_id": "72893ab7-5d7b-4996-84ea-a8d65af25915",
    "outlier_reason": "34-minute latency during client/Ollama hang; preserved intact as baseline requirement",
    "benchmark_window": {
        "start_utc": "2026-11-10T10:01:31.952219Z",
        "end_utc": "2026-11-10T10:52:48.990579Z"
    }
}


async def export():
    os.makedirs(BASELINE_CSV.parent, exist_ok=True)
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("""
            SELECT 
                id,
                created_at,
                session_id,
                user_id,
                query_outcome,
                answer_path,
                is_benchmark,
                requires_citation,
                total_latency_ms,
                classify_ms,
                graph_retrieval_ms,
                vector_retrieval_ms,
                fusion_ms,
                llm_ms,
                citations
            FROM copilot_query_telemetry
            ORDER BY created_at ASC;
        """))
        rows = [dict(r) for r in res.mappings().all()]
        
    print(f"Loaded {len(rows)} rows from copilot_query_telemetry.")
    assert len(rows) == 54, f"Expected 54 baseline rows, got {len(rows)}"

    # Write CSV
    fieldnames = [
        "id", "created_at", "session_id", "user_id", "query_outcome", "answer_path",
        "is_benchmark", "requires_citation", "total_latency_ms", "classify_ms",
        "graph_retrieval_ms", "vector_retrieval_ms", "fusion_ms", "llm_ms", "citations"
    ]
    with open(BASELINE_CSV, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            row_dict = dict(r)
            row_dict["id"] = str(row_dict["id"])
            row_dict["created_at"] = row_dict["created_at"].isoformat() if row_dict["created_at"] else ""
            row_dict["session_id"] = str(row_dict["session_id"]) if row_dict["session_id"] else ""
            row_dict["user_id"] = str(row_dict["user_id"]) if row_dict["user_id"] else ""
            row_dict["citations"] = json.dumps(row_dict["citations"], ensure_ascii=False) if row_dict["citations"] else "[]"
            writer.writerow(row_dict)
            
    print(f"Exported baseline CSV to: {BASELINE_CSV}")

    # Write Metadata
    with open(BASELINE_META, mode="w", encoding="utf-8") as f:
        json.dump(METADATA, f, indent=2, ensure_ascii=False)
    print(f"Exported baseline metadata to: {BASELINE_META}")


if __name__ == "__main__":
    asyncio.run(export())

