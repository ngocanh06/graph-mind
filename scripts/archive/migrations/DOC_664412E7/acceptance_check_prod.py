"""
Post-Migration Acceptance Check for DOC_664412E7.
Read-Only verification of Production Neo4j (7687) and Production Qdrant (6333).
"""
import os
import json
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


def run_acceptance_check():
    print("=== POST-MIGRATION ACCEPTANCE CHECK ===")

    # 1. Neo4j Production Check
    print("\n--- 1. NEO4J PRODUCTION ACCEPTANCE ---")
    neo = GraphDatabase.driver(PROD_NEO4J_URI, auth=(PROD_NEO4J_USER, PROD_NEO4J_PASS))
    with neo.session() as s:
        doc = s.run("MATCH (d:Document {id: $doc_id}) RETURN properties(d) as p", {"doc_id": TARGET_DOC_ID}).single()["p"]
        total_nodes = s.run("MATCH (n) RETURN count(n) as c").single()["c"]
        other_docs = s.run("MATCH (d:Document) WHERE d.id <> $doc_id RETURN count(d) as c", {"doc_id": TARGET_DOC_ID}).single()["c"]
    neo.close()

    print(f"  Document ID: {doc.get('id')}")
    print(f"  committed_generation: {doc.get('committed_generation')} (expected: 3)")
    print(f"  chunksCount: {doc.get('chunksCount')} (expected: 8)")
    print(f"  expected_chunk_count: {doc.get('expected_chunk_count')} (expected: 8)")
    print(f"  active_point_ids count: {len(doc.get('active_point_ids', []))} (expected: 8)")
    print(f"  active_point_ids matches candidate UUIDs: {doc.get('active_point_ids') == CANDIDATE_UUIDS}")
    print(f"  active_op_id: {doc.get('active_op_id')} (expected: None)")
    print(f"  op_stage: {doc.get('op_stage')} (expected: TERMINAL_SYNCED)")
    print(f"  Total Neo4j nodes: {total_nodes} (expected: 55356)")
    print(f"  Other Document nodes count: {other_docs} (expected: 589)")

    assert doc.get("committed_generation") == 3, "committed_generation must be 3"
    assert doc.get("chunksCount") == 8, "chunksCount must be 8"
    assert doc.get("expected_chunk_count") == 8, "expected_chunk_count must be 8"
    assert doc.get("active_point_ids") == CANDIDATE_UUIDS, "active_point_ids must match exactly"
    assert doc.get("active_op_id") is None, "active_op_id must be None"
    assert doc.get("op_stage") == "TERMINAL_SYNCED", "op_stage must be TERMINAL_SYNCED"
    assert total_nodes == 55356, "Total nodes must remain 55356"
    assert other_docs == 589, "Other documents count must remain 589"

    # 2. Qdrant Production Check
    print("\n--- 2. QDRANT PRODUCTION ACCEPTANCE ---")
    qc = QdrantClient(host=PROD_QDRANT_HOST, port=PROD_QDRANT_PORT)
    col = qc.get_collection("cuad_contracts")
    print(f"  Collection: cuad_contracts")
    print(f"  Total points: {col.points_count} (expected: 12532)")
    assert col.points_count == 12532, f"Total points must be 12532, got {col.points_count}"

    pts = qc.retrieve("cuad_contracts", ids=CANDIDATE_UUIDS, with_vectors=True)
    print(f"  Candidate Gen 3 points retrieved: {len(pts)} / 8")
    assert len(pts) == 8, "Must retrieve exactly 8 Gen 3 points"

    for i, pt in enumerate(pts):
        vec_dim = len(pt.vector)
        doc_id = pt.payload.get("doc_id")
        document_id = pt.payload.get("document_id")
        f_gen = pt.payload.get("fencing_generation")
        is_act = pt.payload.get("is_active")
        op_id = pt.payload.get("operation_id")
        h = pt.payload.get("file_hash")
        assert vec_dim == 384, f"Vector dimension must be 384, got {vec_dim}"
        assert doc_id == TARGET_DOC_ID, f"doc_id must be {TARGET_DOC_ID}, got {doc_id}"
        assert document_id == TARGET_DOC_ID, f"document_id must be {TARGET_DOC_ID}, got {document_id}"
        assert f_gen == 3, f"fencing_generation must be 3, got {f_gen}"
        assert is_act is True, f"is_active must be True, got {is_act}"
        assert op_id == "op_mgo_excel_v3", f"operation_id must be op_mgo_excel_v3, got {op_id}"
        assert h == "664412e7e64d6de041b925f5cd7c34d863d163311e07d9d698f6ff6e148683fb"

    print("  [PASS] All 8 points: vector dim=384, doc_id=DOC_664412E7, fencing_generation=3, is_active=True, operation_id=op_mgo_excel_v3.")

    # Check that old point is gone
    old_res = qc.retrieve("cuad_contracts", ids=[OLD_POINT_ID])
    print(f"  Old point {OLD_POINT_ID} presence in Qdrant: {len(old_res)} (expected: 0)")
    assert len(old_res) == 0, f"Old point {OLD_POINT_ID} must not exist in Qdrant!"
    print("  [PASS] Old point Gen 2 does not exist in Qdrant.")

    # 3. Integrity Check: none of Gen 3 points belongs to another document
    print("\n--- 3. DATA INTEGRITY CHECK ---")
    foreign = [p for p in pts if p.payload.get("doc_id") != TARGET_DOC_ID]
    print(f"  Foreign document points among 8 UUIDs: {len(foreign)} (expected: 0)")
    assert len(foreign) == 0

    # 4. Snapshot File Check
    print("\n--- 4. PRE-MIGRATION SNAPSHOT FILE CHECK ---")
    snap_path = "backups/snapshot_DOC_664412E7_pre_migration.json"
    assert os.path.exists(snap_path), f"Snapshot file {snap_path} does not exist!"
    with open(snap_path, "r", encoding="utf-8") as f:
        snap_data = json.load(f)
    
    print(f"  Snapshot file exists: {snap_path}")
    print(f"  target_doc_id in snapshot: {snap_data.get('target_doc_id')}")
    print(f"  Neo4j properties captured: {len(snap_data.get('neo4j_properties', {}))} fields")
    print(f"  Old point vector captured: dimension {len(snap_data.get('old_point', {}).get('vector', []))}")
    print(f"  Old point payload text captured: {len(snap_data.get('old_point', {}).get('payload', {}).get('text', ''))} chars")
    assert snap_data.get("target_doc_id") == TARGET_DOC_ID
    assert len(snap_data.get("old_point", {}).get("vector", [])) == 384
    assert snap_data.get("neo4j_properties", {}).get("committed_generation") == 2
    print("  [PASS] Snapshot file intact, readable, complete.")

    print("\n=======================================================")
    print("ALL POST-MIGRATION ACCEPTANCE CRITERIA PASSED (100%)!")
    print("=======================================================")


if __name__ == "__main__":
    run_acceptance_check()
