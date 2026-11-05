"""
Create Read-Only Snapshot of DOC_664412E7 from Production.
Reads from Neo4j (7687) and Qdrant (6333) without modifying any data.
Saves complete Document node properties and complete old point (including vector)
to backups/snapshot_DOC_664412E7_pre_migration.json.
"""
import os
import json
from pathlib import Path
from neo4j import GraphDatabase
from qdrant_client import QdrantClient

PROD_NEO4J_URI = "bolt://localhost:7687"
PROD_NEO4J_USER = "neo4j"
PROD_NEO4J_PASS = "graphmind_secret"

PROD_QDRANT_HOST = "localhost"
PROD_QDRANT_PORT = 6333
TARGET_DOC_ID = "DOC_664412E7"
OLD_POINT_ID = "2445aec9-52d6-52bf-9beb-a507013e89a1"

BACKUP_DIR = Path("backups")
SNAPSHOT_FILE = BACKUP_DIR / "snapshot_DOC_664412E7_pre_migration.json"


def take_snapshot():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Read Neo4j
    neo = GraphDatabase.driver(PROD_NEO4J_URI, auth=(PROD_NEO4J_USER, PROD_NEO4J_PASS))
    with neo.session() as s:
        rec = s.run("MATCH (d:Document {id: $id}) RETURN properties(d) as p", {"id": TARGET_DOC_ID}).single()
        assert rec is not None, f"Document {TARGET_DOC_ID} not found!"
        doc_props = rec["p"]
    neo.close()

    # 2. Read Qdrant point with vector
    qc = QdrantClient(host=PROD_QDRANT_HOST, port=PROD_QDRANT_PORT)
    pts = qc.retrieve("cuad_contracts", ids=[OLD_POINT_ID], with_vectors=True)
    assert len(pts) == 1, f"Point {OLD_POINT_ID} not found!"
    pt = pts[0]

    snapshot_data = {
        "target_doc_id": TARGET_DOC_ID,
        "old_point_id": OLD_POINT_ID,
        "neo4j_properties": doc_props,
        "old_point": {
            "id": str(pt.id),
            "vector": pt.vector,
            "payload": pt.payload
        }
    }

    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshot_data, f, ensure_ascii=False, indent=2)

    print(f"[Snapshot] Successfully written to {SNAPSHOT_FILE}")
    print(f"  Neo4j committed_generation: {doc_props.get('committed_generation')}")
    print(f"  Neo4j chunksCount: {doc_props.get('chunksCount')}")
    print(f"  Old point ID: {pt.id}")
    print(f"  Old point vector dimension: {len(pt.vector)}")
    print(f"  Old point text length: {len(pt.payload.get('text', ''))}")
    return snapshot_data


if __name__ == "__main__":
    take_snapshot()
