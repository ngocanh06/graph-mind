"""
Read-Only Preflight Verification Script for DOC_664412E7 Migration Safety.
Strictly Read-Only on Production: Neo4j (7687) & Qdrant (6333).
Does NOT perform any mutation, upsert, update, or deletion.
"""
import sys
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

CANDIDATE_UUIDS = [
    "e634cb94-e350-5750-a9cb-b2f7f90be680",
    "1939db27-72ce-5100-9852-bb53198eb537",
    "a7ea7a5c-5da2-52ce-a4a3-76495b54637d",
    "5a8d4234-fc56-5ea5-937d-03aa34170e0f",
    "769fa894-3d9c-5895-8854-ce1f185db215",
    "a6358cfa-555e-5fb7-9755-d6ee9431bf1c",
    "a7138386-8d19-5431-a204-7489bb07fb2e",
    "3dbaf7ff-299f-524c-9f6b-80df241d72cf"
]


def run_preflight():
    print("=== FINAL PREFLIGHT READ-ONLY AUDIT ===")
    
    # 1. Neo4j Read-Only Snapshot
    neo = GraphDatabase.driver(PROD_NEO4J_URI, auth=(PROD_NEO4J_USER, PROD_NEO4J_PASS))
    with neo.session() as s:
        rec = s.run("MATCH (d:Document {id: $id}) RETURN properties(d) as p", {"id": TARGET_DOC_ID}).single()
        assert rec is not None, f"Target document {TARGET_DOC_ID} not found in Neo4j Production!"
        props = rec["p"]

    print("\n--- 1. CURRENT NEO4J DOCUMENT PROPERTIES ---")
    for k in sorted(props.keys()):
        val = props[k]
        print(f"  {k}: {val} ({type(val).__name__})")

    # 2. Qdrant Collection & Old Point Verification
    qc = QdrantClient(host=PROD_QDRANT_HOST, port=PROD_QDRANT_PORT)
    col = qc.get_collection("cuad_contracts")
    print("\n--- 2. QDRANT CUAD_CONTRACTS STATS ---")
    print(f"  Total points: {col.points_count}")
    print(f"  Vector dim: {col.config.params.vectors.size}")
    print(f"  Distance: {col.config.params.vectors.distance}")

    old_pt = qc.retrieve("cuad_contracts", ids=[OLD_POINT_ID])
    assert len(old_pt) == 1, f"Old point {OLD_POINT_ID} not found in Qdrant!"
    p0 = old_pt[0]
    print(f"\n--- 3. OLD POINT VERIFICATION ({OLD_POINT_ID}) ---")
    for k, v in sorted(p0.payload.items()):
        if k != "text":
            print(f"  {k}: {v} ({type(v).__name__})")
        else:
            print(f"  text: len={len(v)} chars")

    # 3. Collision Check on 8 Candidate UUIDs
    collisions = qc.retrieve("cuad_contracts", ids=CANDIDATE_UUIDS)
    print("\n--- 4. CANDIDATE UUID COLLISION CHECK ---")
    print(f"  Tested 8 candidate UUIDs against cuad_contracts.")
    print(f"  Collisions detected: {len(collisions)}")
    assert len(collisions) == 0, "COLLISION DETECTED! Must regenerate UUIDs."
    print("  [PASS] Zero collisions. All 8 UUIDs are completely free.")

    # 4. Total Point Math Check
    expected_final_count = col.points_count + 8 - 1
    print("\n--- 5. POINT COUNT PROJECTION ---")
    print(f"  Current: {col.points_count}")
    print(f"  + New points: 8")
    print(f"  - Old point: 1")
    print(f"  = Expected final count: {expected_final_count} (12525 + 8 - 1 = 12532)")
    assert col.points_count == 12525
    assert expected_final_count == 12532

    neo.close()
    print("\n=============================================")
    print("PREFLIGHT VERIFICATION PASSED (READ-ONLY)!")
    print("=============================================")


if __name__ == "__main__":
    run_preflight()
