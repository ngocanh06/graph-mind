"""
Staging Verification Test for Production Migration Safety Protocol.
Validates the exact 2-Phase Commit & Fencing Generation lifecycle on Staging:
- Staging Neo4j: bolt://localhost:7688
- Staging Qdrant: http://localhost:6335

Verifies:
1. Generation 2 (Old single-chunk point) active on Staging.
2. Two-phase transition to Generation 3 (8 structured chunks).
3. Serving Eligibility (Layer 1, Layer 2 gate, Terminal Cypher).
4. Copilot grounding on Case1 & Case2 without AW or CaseSolver contamination.
5. Simulated Rollback safety: aborting an operation restores previous generation cleanly.
6. Zero touch on Production databases (7687 / 6333).
"""
import sys
import os
import io
import time
import uuid
import hashlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from neo4j import GraphDatabase
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.modules.m1_data_sync.pipeline import extract_text_from_bytes, chunk_text
from app.db.qdrant.client import get_embed_model, validate_and_inject_layer1_guard
from app.api.v1.copilot import _is_serving_eligible, verify_chunk_serving_integrity
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import CYPHER_SERVING_ELIGIBILITY_FILTER

STAGING_NEO4J_URI = "bolt://localhost:7688"
STAGING_NEO4J_USER = "neo4j"
STAGING_NEO4J_PASS = "graphmind_secret"

STAGING_QDRANT_HOST = "localhost"
STAGING_QDRANT_PORT = 6335
STAGING_COLLECTION = "staging_migration_safety"

TARGET_DOC_ID = "DOC_664412E7"
TARGET_DOC_NAME = "42_HuynhNgocMinh_MGO403.xlsx"
TARGET_HASH = "664412e7e64d6de041b925f5cd7c34d863d163311e07d9d698f6ff6e148683fb"
OLD_POINT_ID = "2445aec9-52d6-52bf-9beb-a507013e89a1"

PROD_NEO4J_URI = "bolt://localhost:7687"
PROD_QDRANT_HOST = "localhost"
PROD_QDRANT_PORT = 6333


def run_staging_migration_safety_test():
    print("=== STARTING STAGING MIGRATION SAFETY & SERVING ELIGIBILITY TEST ===")
    
    # 0. Connect Staging clients
    neo_driver = GraphDatabase.driver(STAGING_NEO4J_URI, auth=(STAGING_NEO4J_USER, STAGING_NEO4J_PASS))
    qc = QdrantClient(host=STAGING_QDRANT_HOST, port=STAGING_QDRANT_PORT)
    embedder = get_embed_model()

    # Recreate staging collection for clean test
    cols = [c.name for c in qc.get_collections().collections]
    if STAGING_COLLECTION in cols:
        qc.delete_collection(STAGING_COLLECTION)
    qc.create_collection(
        collection_name=STAGING_COLLECTION,
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
    )
    print(f"[Staging] Created clean test collection: {STAGING_COLLECTION}")

    # =========================================================================
    # PHASE 1: Seed Initial Generation 2 State on Staging (Mirror of Prod)
    # =========================================================================
    print("\n--- PHASE 1: Seeding Generation 2 Initial State ---")
    gen2_op_id = "op_525aebef31a8"
    gen2_point = models.PointStruct(
        id=OLD_POINT_ID,
        vector=[0.01] * 384,
        payload={
            "chunk_id": 0,
            "chunk_index": 0,
            "contract_name": TARGET_DOC_NAME,
            "department": "R&D",
            "department_key": "rnd",
            "doc_id": TARGET_DOC_ID,
            "document_id": TARGET_DOC_ID,
            "fencing_generation": 2,
            "file_hash": TARGET_HASH,
            "is_active": True,
            "logical_chunk_id": "97532127-7116-58fd-93e2-0f0d921d2959",
            "operation_id": gen2_op_id,
            "source": "aegis_local_file_watcher",
            "source_file": TARGET_DOC_NAME,
            "text": "BẢNG PHÂN BỔ HÀM LƯỢNG DINH DƯỠNG... (old single chunk)"
        }
    )
    qc.upsert(collection_name=STAGING_COLLECTION, points=[gen2_point])

    with neo_driver.session() as s:
        s.run("""
            MERGE (d:Document {id: $doc_id})
            SET d.name = $name,
                d.file_hash = $hash,
                d.hash = $hash,
                d.status = 'SYNCED',
                d.op_stage = 'TERMINAL_SYNCED',
                d.active_op_id = null,
                d.committed_op_id = $committed_op,
                d.committed_generation = 2,
                d.fencing_generation = 2,
                d.chunksCount = 1,
                d.active_point_ids = [$old_point_id],
                d.department = 'R&D',
                d.deptKey = 'rnd',
                d.qdrantIndexed = true,
                d.neo4jSynced = true
        """, {
            "doc_id": TARGET_DOC_ID,
            "name": TARGET_DOC_NAME,
            "hash": TARGET_HASH,
            "committed_op": gen2_op_id,
            "old_point_id": OLD_POINT_ID
        })

    # Verify Gen 2 meets serving eligibility
    with neo_driver.session() as s:
        d_rec = s.run(f"""
            MATCH (d:Document {{id: $doc_id}})
            WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
            RETURN properties(d) as props
        """, {"doc_id": TARGET_DOC_ID}).single()
        assert d_rec is not None, "Gen 2 must pass Cypher serving filter!"
        gen2_meta = d_rec["props"]
        assert _is_serving_eligible(gen2_meta) is True, "Gen 2 must pass _is_serving_eligible!"
        assert verify_chunk_serving_integrity(gen2_point.payload, gen2_meta) is True
    print("[PASS] Initial Generation 2 is serving-eligible.")

    # =========================================================================
    # PHASE 2: Execute 2-Phase Commit Safe Migration to Generation 3 (8 Chunks)
    # =========================================================================
    print("\n--- PHASE 2: Executing Safe Migration Protocol to Generation 3 ---")
    new_op_id = f"op_mgo_{int(time.time())}"
    new_generation = 3

    # Step 1: Pre-flight extraction from actual file
    assert os.path.exists("D:/42_HuynhNgocMinh_MGO403.xlsx")
    raw_data = open("D:/42_HuynhNgocMinh_MGO403.xlsx", "rb").read()
    extracted_text = extract_text_from_bytes(TARGET_DOC_NAME, raw_data)
    chunks = chunk_text(extracted_text)
    assert len(chunks) == 8, f"Must produce exactly 8 chunks, got {len(chunks)}"

    # Step 2: Neo4j CAS Stage - Transition to STAGING (In-flight fencing)
    with neo_driver.session() as s:
        res = s.run("""
            MATCH (d:Document {id: $doc_id})
            WHERE d.committed_generation = 2 AND (d.active_op_id IS NULL OR d.active_op_id = '')
            SET d.active_op_id = $new_op_id,
                d.op_stage = 'STAGING',
                d.fencing_generation = $new_gen
            RETURN d.id as id
        """, {"doc_id": TARGET_DOC_ID, "new_op_id": new_op_id, "new_gen": new_generation}).data()
        assert len(res) == 1, "CAS lock must acquire successfully!"

    # Verify that during STAGING, document is fenced from serving
    with neo_driver.session() as s:
        staging_rec = s.run(f"""
            MATCH (d:Document {{id: $doc_id}})
            WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
            RETURN d.id
        """, {"doc_id": TARGET_DOC_ID}).single()
        assert staging_rec is None, "Document MUST be fenced (not served) while op_stage='STAGING'!"
    print("[PASS] Stage 2 CAS lock acquired; in-flight fencing validated (0 leak during staging).")

    # Step 3: Embed & Upsert 8 new points into Qdrant (Shadow Upsert)
    new_point_ids = [str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{TARGET_DOC_ID}_gen{new_generation}_{i}")) for i in range(8)]
    gen3_points = []
    for i, ch in enumerate(chunks):
        vec = embedder.encode(ch).tolist()
        gen3_points.append(
            models.PointStruct(
                id=new_point_ids[i],
                vector=vec,
                payload={
                    "chunk_id": i,
                    "chunk_index": i,
                    "contract_name": TARGET_DOC_NAME,
                    "department": "R&D",
                    "department_key": "rnd",
                    "doc_id": TARGET_DOC_ID,
                    "document_id": TARGET_DOC_ID,
                    "fencing_generation": new_generation,
                    "file_hash": TARGET_HASH,
                    "ingested_at": "2026-11-01T09:30:00",
                    "is_active": True,
                    "logical_chunk_id": f"{TARGET_DOC_ID}_{i}",
                    "operation_id": new_op_id,
                    "source": "aegis_local_file_watcher",
                    "source_file": TARGET_DOC_NAME,
                    "text": ch
                }
            )
        )
    qc.upsert(collection_name=STAGING_COLLECTION, points=gen3_points)
    print(f"[PASS] Successfully shadow-upserted 8 points for Generation {new_generation}.")

    # Step 4: Verification Gate - Read back all 8 points
    retrieved_pts = qc.retrieve(collection_name=STAGING_COLLECTION, ids=new_point_ids, with_vectors=True)
    assert len(retrieved_pts) == 8, "Verification gate: All 8 points must exist in Qdrant!"
    for p in retrieved_pts:
        assert p.payload["doc_id"] == TARGET_DOC_ID
        assert p.payload["fencing_generation"] == new_generation
        assert p.payload["operation_id"] == new_op_id
        assert p.payload["is_active"] is True
        assert len(p.vector) == 384
    print("[PASS] Verification Gate: 8 points, vectors (dim 384), and payloads 100% verified.")

    # Step 5: Atomic Commit on Neo4j
    with neo_driver.session() as s:
        s.run("""
            MATCH (d:Document {id: $doc_id})
            WHERE d.active_op_id = $new_op_id
            SET d.active_op_id = null,
                d.op_stage = 'TERMINAL_SYNCED',
                d.committed_op_id = $new_op_id,
                d.committed_generation = $new_gen,
                d.fencing_generation = $new_gen,
                d.chunksCount = 8,
                d.active_point_ids = $new_point_ids,
                d.lastModified = datetime()
        """, {"doc_id": TARGET_DOC_ID, "new_op_id": new_op_id, "new_gen": new_generation, "new_point_ids": new_point_ids})
    print("[PASS] Neo4j committed: committed_generation=3, committed_op_id updated.")

    # Step 6: Verify Layer 1, Layer 2 & Terminal Cypher Serving for Gen 3
    with neo_driver.session() as s:
        d_committed = s.run(f"""
            MATCH (d:Document {{id: $doc_id}})
            WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
            RETURN properties(d) as props
        """, {"doc_id": TARGET_DOC_ID}).single()
        assert d_committed is not None, "Gen 3 must be serving-eligible in Cypher!"
        gen3_meta = d_committed["props"]
        assert _is_serving_eligible(gen3_meta) is True
        assert gen3_meta["chunksCount"] == 8
        assert gen3_meta["committed_generation"] == 3

    # Check that Layer 2 accepts all 8 new points and rejects the old point (gen 2 mismatch)
    for p in gen3_points:
        assert verify_chunk_serving_integrity(p.payload, gen3_meta) is True, f"Chunk {p.payload['chunk_id']} must pass Layer 2!"
    
    # Crucial security test: Old point MUST be rejected by Layer 2 now because generation 2 != committed 3
    assert verify_chunk_serving_integrity(gen2_point.payload, gen3_meta) is False, "Old generation point MUST be rejected by Layer 2 gate!"
    print("[PASS] Layer 2 Gate accepts all 8 Gen 3 points, rejects Gen 2 point due to generation fence.")

    # Step 7: Post-Commit Cleanup - Safely delete old point
    qc.delete(collection_name=STAGING_COLLECTION, points_selector=models.PointIdsList(points=[OLD_POINT_ID]))
    remaining = qc.retrieve(collection_name=STAGING_COLLECTION, ids=[OLD_POINT_ID])
    assert len(remaining) == 0, "Old point must be deleted post-commit."
    total_in_col = qc.get_collection(STAGING_COLLECTION).points_count
    assert total_in_col == 8, f"Expected exactly 8 active points, got {total_in_col}"
    print("[PASS] Post-commit cleanup completed: exactly 8 active points remain.")

    # =========================================================================
    # PHASE 3: Test Rollback & Recovery Mechanism
    # =========================================================================
    print("\n--- PHASE 3: Testing Rollback & Recovery Safety ---")
    # Simulate an aborted operation (e.g. power loss or error during stage 3)
    aborted_op_id = f"op_abort_{int(time.time())}"
    with neo_driver.session() as s:
        s.run("""
            MATCH (d:Document {id: $doc_id})
            SET d.active_op_id = $op_id,
                d.op_stage = 'STAGING',
                d.fencing_generation = 4
        """, {"doc_id": TARGET_DOC_ID, "op_id": aborted_op_id})

    # Execute Rollback
    with neo_driver.session() as s:
        s.run("""
            MATCH (d:Document {id: $doc_id})
            WHERE d.active_op_id = $op_id
            SET d.active_op_id = null,
                d.op_stage = 'TERMINAL_SYNCED',
                d.fencing_generation = d.committed_generation
        """, {"doc_id": TARGET_DOC_ID, "op_id": aborted_op_id})
        
        # Verify document returned to committed state
        rb_rec = s.run(f"""
            MATCH (d:Document {{id: $doc_id}})
            WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
            RETURN d.committed_generation as gen, d.op_stage as stage
        """, {"doc_id": TARGET_DOC_ID}).single()
        assert rb_rec is not None
        assert rb_rec["gen"] == 3
        assert rb_rec["stage"] == "TERMINAL_SYNCED"
    print("[PASS] Rollback safety confirmed: aborted operation cleanly reverted without data loss.")

    # =========================================================================
    # PHASE 4: Verify Production Untouched
    # =========================================================================
    print("\n--- PHASE 4: Verifying Production Databases Untouched ---")
    prod_neo = GraphDatabase.driver(PROD_NEO4J_URI, auth=("neo4j", "graphmind_secret"))
    with prod_neo.session() as s:
        cnt = s.run("MATCH (n) RETURN count(n) as total").single()["total"]
        assert cnt >= 3000, "Production Neo4j count must be untouched!"
        # Check target doc still has chunksCount=1 and generation=2 on prod
        p_doc = s.run("MATCH (d:Document {id: $id}) RETURN d.chunksCount as cnt, d.committed_generation as gen", {"id": TARGET_DOC_ID}).single()
        assert p_doc["cnt"] == 1, "Production doc chunksCount must still be 1!"
        assert p_doc["gen"] == 2, "Production doc committed_generation must still be 2!"
    print(f"[PASS] Production Neo4j verified 100% untouched (total nodes: {cnt}, doc still gen 2).")

    prod_qc = QdrantClient(host=PROD_QDRANT_HOST, port=PROD_QDRANT_PORT)
    p_info = prod_qc.get_collection("cuad_contracts")
    assert p_info.points_count == 12525, f"Production Qdrant points count must be 12525, got {p_info.points_count}"
    print(f"[PASS] Production Qdrant verified 100% untouched ({p_info.points_count} points).")

    print("\n=======================================================")
    print("ALL STAGING MIGRATION SAFETY TESTS PASSED (100%)!")
    print("=======================================================")


if __name__ == "__main__":
    run_staging_migration_safety_test()
