"""
Post-Migration Production Audit Script.
Reads actual state of Neo4j Production (7687) and Qdrant Production (6333)
to confirm exact final state after migration of DOC_664412E7.
"""
import sys
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


def audit():
    print("=== POST-MIGRATION PRODUCTION AUDIT ===")
    
    # 1. Neo4j Node Audit
    neo = GraphDatabase.driver(PROD_NEO4J_URI, auth=(PROD_NEO4J_USER, PROD_NEO4J_PASS))
    with neo.session() as s:
        total_nodes = s.run("MATCH (n) RETURN count(n) as total").single()["total"]
        doc_rec = s.run("MATCH (d:Document {id: $id}) RETURN properties(d) as p", {"id": TARGET_DOC_ID}).single()
        assert doc_rec is not None, "Target doc not found!"
        p = doc_rec["p"]

        # Check total other documents count
        other_docs_cnt = s.run("MATCH (d:Document) WHERE d.id <> $id RETURN count(d) as c", {"id": TARGET_DOC_ID}).single()["c"]

    print(f"Total Neo4j nodes: {total_nodes}")
    print(f"Other Document nodes count: {other_docs_cnt}")
    print("\n--- Target Document DOC_664412E7 Properties ---")
    print(f"  id: {p.get('id')}")
    print(f"  name: {p.get('name')}")
    print(f"  status: {p.get('status')}")
    print(f"  op_stage: {p.get('op_stage')}")
    print(f"  active_op_id: {p.get('active_op_id')}")
    print(f"  committed_op_id: {p.get('committed_op_id')}")
    print(f"  committed_generation: {p.get('committed_generation')}")
    print(f"  fencing_generation: {p.get('fencing_generation')}")
    print(f"  chunksCount: {p.get('chunksCount')}")
    print(f"  expected_chunk_count: {p.get('expected_chunk_count')}")
    print(f"  active_point_ids count: {len(p.get('active_point_ids', []))}")
    print(f"  parser_config: {p.get('parser_config')}")
    print(f"  chunker_config: {p.get('chunker_config')}")

    assert p.get("status") == "SYNCED"
    assert p.get("op_stage") == "TERMINAL_SYNCED"
    assert p.get("active_op_id") is None
    assert p.get("committed_op_id") == "op_mgo_excel_v3"
    assert p.get("committed_generation") == 3
    assert p.get("fencing_generation") == 3
    assert p.get("chunksCount") == 8
    assert p.get("expected_chunk_count") == 8
    assert len(p.get("active_point_ids", [])) == 8

    # 2. Qdrant Points Audit
    qc = QdrantClient(host=PROD_QDRANT_HOST, port=PROD_QDRANT_PORT)
    col = qc.get_collection("cuad_contracts")
    print("\n--- Qdrant Collection Stats ---")
    print(f"  Collection: cuad_contracts")
    print(f"  Total points: {col.points_count}")
    assert col.points_count == 12532, f"Expected 12532, got {col.points_count}"

    # Verify 8 new UUIDs
    pts = qc.retrieve("cuad_contracts", ids=CANDIDATE_UUIDS, with_vectors=True)
    assert len(pts) == 8, f"Expected 8 points, found {len(pts)}"
    print(f"\n--- 8 Candidate UUIDs Verified ---")
    for i, pt in enumerate(pts):
        assert pt.payload["doc_id"] == TARGET_DOC_ID
        assert pt.payload["fencing_generation"] == 3
        assert pt.payload["operation_id"] == "op_mgo_excel_v3"
        assert pt.payload["is_active"] is True
        assert len(pt.vector) == 384
        first_line = pt.payload.get("text", "").split("\n")[0][:45]
        print(f"  #{i} [{pt.id[:8]}]: chunk={pt.payload['chunk_index']}, gen={pt.payload['fencing_generation']}, text='{first_line}...'")

    # Verify old point is deleted
    old_chk = qc.retrieve("cuad_contracts", ids=[OLD_POINT_ID])
    assert len(old_chk) == 0, f"Old point {OLD_POINT_ID} must not exist!"
    print(f"\nOld point {OLD_POINT_ID} verified DELETED from Qdrant.")

    neo.close()
    print("\n=============================================")
    print("ALL POST-MIGRATION AUDIT CHECKS PASSED (100%)!")
    print("=============================================")


if __name__ == "__main__":
    audit()
