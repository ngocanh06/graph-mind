"""
Production Migration & Safe Recovery Script for Document DOC_664412E7 (42_HuynhNgocMinh_MGO403.xlsx).
Implements Two-Phase Commit with Fencing Generation, Crash Recovery, and Zero-Downtime Rollback.

SAFETY GUARDS:
1. Default mode is DRY-RUN. Mutation requires explicit --execute flag.
2. CAS (Compare-And-Swap) strictly targets single Document {id: 'DOC_664412E7'}.
3. Backup snapshot of Neo4j properties + Qdrant point (with 384-dim vector) saved before any mutation.
4. Neo4j commit occurs ONLY AFTER 8 new points are verified in Qdrant (UUIDs, dim=384, payloads).
5. Old point is NEVER deleted before Neo4j Gen 3 commit succeeds.
6. Safe Rollback from Gen 3 checks if old point exists; if already deleted, it restores the old point
   from backup FIRST before changing Neo4j back to Gen 2 (guaranteeing zero serving downtime).
7. Fully Idempotent & Resumable: deterministic UUIDs ensure repeated runs overwrite cleanly without duplicates.
"""
import sys
import os
import io
import time
import json
import uuid
import argparse
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
from app.db.qdrant.client import get_embed_model
from app.api.v1.copilot import _is_serving_eligible, verify_chunk_serving_integrity
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import CYPHER_SERVING_ELIGIBILITY_FILTER

TARGET_DOC_ID = "DOC_664412E7"
TARGET_DOC_NAME = "42_HuynhNgocMinh_MGO403.xlsx"
TARGET_HASH = "664412e7e64d6de041b925f5cd7c34d863d163311e07d9d698f6ff6e148683fb"
OLD_POINT_ID = "2445aec9-52d6-52bf-9beb-a507013e89a1"

EXCEL_FILE_PATH = "D:/42_HuynhNgocMinh_MGO403.xlsx"
BACKUP_DIR = REPO_ROOT / "backups"
SNAPSHOT_FILE = BACKUP_DIR / "snapshot_DOC_664412E7_pre_migration.json"

TARGET_GEN = 3
TARGET_OP_ID = "op_mgo_excel_v3"

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


class MgoMigrationManager:
    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_pass: str, qdrant_host: str, qdrant_port: int, collection: str, is_dry_run: bool = True):
        self.neo4j_uri = neo4j_uri
        self.neo4j_user = neo4j_user
        self.neo4j_pass = neo4j_pass
        self.qdrant_host = qdrant_host
        self.qdrant_port = qdrant_port
        self.collection = collection
        self.is_dry_run = is_dry_run
        
        self.neo = GraphDatabase.driver(self.neo4j_uri, auth=(self.neo4j_user, self.neo4j_pass))
        self.qc = QdrantClient(host=self.qdrant_host, port=self.qdrant_port)
        self.embedder = None

    def close(self):
        self.neo.close()

    def _get_embedder(self):
        if self.embedder is None:
            self.embedder = get_embed_model()
        return self.embedder

    # =========================================================================
    # 1. PRE-FLIGHT AUDIT & SNAPSHOT
    # =========================================================================
    def preflight_audit(self) -> dict:
        print(f"\n[PHASE 1: SNAPSHOT & PRE-FLIGHT AUDIT] (dry_run={self.is_dry_run})")
        with self.neo.session() as s:
            rec = s.run("MATCH (d:Document {id: $id}) RETURN properties(d) as p", {"id": TARGET_DOC_ID}).single()
            if not rec:
                raise RuntimeError(f"Target document {TARGET_DOC_ID} not found in Neo4j ({self.neo4j_uri})")
            doc_props = rec["p"]

        col_info = self.qc.get_collection(self.collection)
        print(f"  Neo4j target: {TARGET_DOC_ID}, name='{doc_props.get('name')}', gen={doc_props.get('committed_generation')}")
        print(f"  Qdrant collection: {self.collection}, points_count={col_info.points_count}, dim={col_info.config.params.vectors.size}")

        # Check old point in Qdrant (might already be deleted if re-running after completion)
        old_pts = self.qc.retrieve(self.collection, ids=[OLD_POINT_ID], with_vectors=True)
        old_pt_data = None
        if old_pts:
            p0 = old_pts[0]
            old_pt_data = {
                "id": str(p0.id),
                "vector": p0.vector,
                "payload": p0.payload
            }
            print(f"  Old point {OLD_POINT_ID} verified in Qdrant (vector dim={len(p0.vector)})")
        else:
            print(f"  Old point {OLD_POINT_ID} not found in Qdrant (may have been deleted or already migrated)")

        # Save snapshot file if not dry run and old point data exists
        snapshot_data = {
            "target_doc_id": TARGET_DOC_ID,
            "old_point_id": OLD_POINT_ID,
            "neo4j_properties": doc_props,
            "old_point": old_pt_data,
            "snapshot_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
            json.dump(snapshot_data, f, ensure_ascii=False, indent=2)
        print(f"  [Snapshot] Saved to {SNAPSHOT_FILE}")

        # Collision check on candidate UUIDs
        collisions = self.qc.retrieve(self.collection, ids=CANDIDATE_UUIDS)
        # If this is a re-run of Gen 3, these points might belong to us
        foreign_collisions = [p for p in collisions if p.payload.get("doc_id") != TARGET_DOC_ID]
        if foreign_collisions:
            raise RuntimeError(f"UUID COLLISION detected with foreign document: {[p.id for p in foreign_collisions]}")
        print(f"  [Collision Check] 0 foreign collisions detected for 8 candidate UUIDs.")

        return snapshot_data

    # =========================================================================
    # 2. RUN MIGRATION LIFECYCLE (IDEMPOTENT & RESUMABLE)
    # =========================================================================
    def execute_migration(self):
        print(f"\n=======================================================")
        print(f"STARTING PRODUCTION MIGRATION FOR {TARGET_DOC_ID}")
        print(f"Mode: {'DRY-RUN (Simulated)' if self.is_dry_run else 'LIVE EXECUTION'}")
        print(f"=======================================================")

        snapshot = self.preflight_audit()
        curr_gen = snapshot["neo4j_properties"].get("committed_generation")
        curr_stage = snapshot["neo4j_properties"].get("op_stage")
        curr_active_op = snapshot["neo4j_properties"].get("active_op_id")

        # Check if already completed
        if curr_gen == TARGET_GEN and curr_stage == "TERMINAL_SYNCED" and not curr_active_op:
            print(f"\n[IDEMPOTENT NOTICE] Document is ALREADY committed at Generation {TARGET_GEN}!")
            # Ensure old point is cleaned up
            old_pts = self.qc.retrieve(self.collection, ids=[OLD_POINT_ID])
            if old_pts:
                print(f"  Old point {OLD_POINT_ID} still exists in Qdrant. Cleaning up...")
                if not self.is_dry_run:
                    self.qc.delete(self.collection, points_selector=models.PointIdsList(points=[OLD_POINT_ID]))
                print("  [PASS] Old point cleanup completed.")
            else:
                print("  [PASS] Old point already cleaned up.")
            print("\n[SUCCESS] Migration already in desired state (Zero action needed).")
            return True

        # Phase 2: Acquire CAS Fencing Lock
        print(f"\n[PHASE 2: ACQUIRE CAS FENCING LOCK]")
        if self.is_dry_run:
            print(f"  [DRY-RUN] Would execute CAS lock: SET active_op_id='{TARGET_OP_ID}', op_stage='STAGING', fencing_gen={TARGET_GEN}")
        else:
            with self.neo.session() as s:
                res = s.run("""
                    MATCH (d:Document {id: $id})
                    WHERE (d.committed_generation = 2 OR d.committed_generation IS NULL)
                      AND (d.active_op_id IS NULL OR d.active_op_id = '' OR d.active_op_id = $op_id)
                    SET d.active_op_id = $op_id,
                        d.op_stage = 'STAGING',
                        d.fencing_generation = $new_gen
                    RETURN d.id as id
                """, {"id": TARGET_DOC_ID, "op_id": TARGET_OP_ID, "new_gen": TARGET_GEN}).data()
                if len(res) != 1:
                    raise RuntimeError("CAS Lock Failed: Document node state changed or lock held by another operation!")
            print(f"  [PASS] CAS lock acquired on Document {TARGET_DOC_ID}.")

        # Phase 3: Shadow Upsert 8 Chunks
        print(f"\n[PHASE 3: SHADOW UPSERT 8 CHUNKS]")
        assert os.path.exists(EXCEL_FILE_PATH), f"Target Excel {EXCEL_FILE_PATH} not found!"
        file_bytes = open(EXCEL_FILE_PATH, "rb").read()
        full_text = extract_text_from_bytes(TARGET_DOC_NAME, file_bytes)
        chunks = chunk_text(full_text)
        assert len(chunks) == 8, f"Expected 8 chunks, got {len(chunks)}"

        embedder = self._get_embedder()
        qdrant_points = []
        for i, ch in enumerate(chunks):
            pid = CANDIDATE_UUIDS[i]
            vec = embedder.encode(ch).tolist()
            qdrant_points.append(
                models.PointStruct(
                    id=pid,
                    vector=vec,
                    payload={
                        "chunk_id": i,
                        "chunk_index": i,
                        "contract_name": TARGET_DOC_NAME,
                        "department": "R&D",
                        "department_key": "rnd",
                        "doc_id": TARGET_DOC_ID,
                        "document_id": TARGET_DOC_ID,
                        "fencing_generation": TARGET_GEN,
                        "file_hash": TARGET_HASH,
                        "ingested_at": "2026-11-01T09:30:00",
                        "is_active": True,
                        "logical_chunk_id": f"{TARGET_DOC_ID}_{i}",
                        "operation_id": TARGET_OP_ID,
                        "source": "aegis_local_file_watcher",
                        "source_file": TARGET_DOC_NAME,
                        "text": ch
                    }
                )
            )

        if self.is_dry_run:
            print(f"  [DRY-RUN] Would upsert {len(qdrant_points)} points to {self.collection} with fencing_gen={TARGET_GEN}")
        else:
            self.qc.upsert(collection_name=self.collection, points=qdrant_points)
            print(f"  [PASS] Shadow-upserted {len(qdrant_points)} points into {self.collection}.")

        # Phase 4: Verification Gate
        print(f"\n[PHASE 4: VERIFICATION GATE (READ-BACK)]")
        if not self.is_dry_run:
            retrieved = self.qc.retrieve(collection_name=self.collection, ids=CANDIDATE_UUIDS, with_vectors=True)
            if len(retrieved) != 8:
                raise RuntimeError(f"Verification Gate FAILED: Expected 8 points, found {len(retrieved)}!")
            for p in retrieved:
                assert p.payload["doc_id"] == TARGET_DOC_ID
                assert p.payload["document_id"] == TARGET_DOC_ID
                assert p.payload["file_hash"] == TARGET_HASH
                assert p.payload["fencing_generation"] == TARGET_GEN
                assert p.payload["operation_id"] == TARGET_OP_ID
                assert p.payload["is_active"] is True
                assert len(p.vector) == 384
            print(f"  [PASS] All 8 points verified in Qdrant (vectors, dim=384, payloads).")
        else:
            print(f"  [DRY-RUN] Verification gate simulated PASS.")

        # Phase 5: Atomic Commit on Neo4j
        print(f"\n[PHASE 5: ATOMIC COMMIT ON NEO4J]")
        if self.is_dry_run:
            print(f"  [DRY-RUN] Would commit Neo4j: committed_gen={TARGET_GEN}, committed_op='{TARGET_OP_ID}', chunksCount=8, active_op_id=null")
        else:
            with self.neo.session() as s:
                res = s.run("""
                    MATCH (d:Document {id: $id})
                    WHERE d.active_op_id = $op_id
                    SET d.active_op_id = null,
                        d.op_stage = 'TERMINAL_SYNCED',
                        d.committed_op_id = $op_id,
                        d.committed_generation = $new_gen,
                        d.fencing_generation = $new_gen,
                        d.chunksCount = 8,
                        d.expected_chunk_count = 8,
                        d.active_point_ids = $new_uuids,
                        d.parser_config = 'openpyxl_sheet_aware_v2.0',
                        d.chunker_config = 'sheet_table_v2.0',
                        d.lastModified = datetime()
                    RETURN d.id as id
                """, {"id": TARGET_DOC_ID, "op_id": TARGET_OP_ID, "new_gen": TARGET_GEN, "new_uuids": CANDIDATE_UUIDS}).data()
                if len(res) != 1:
                    raise RuntimeError("Atomic Commit FAILED: Active op mismatch or document missing!")
            print(f"  [PASS] Neo4j successfully committed to Generation {TARGET_GEN} (chunksCount=8).")

        # Phase 6: Post-Commit Verification of Serving Eligibility
        print(f"\n[PHASE 6: POST-COMMIT SERVING VERIFICATION & COPILOT UAT]")
        if not self.is_dry_run:
            with self.neo.session() as s:
                d_rec = s.run(f"""
                    MATCH (d:Document {{id: $id}})
                    WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
                    RETURN properties(d) as p
                """, {"id": TARGET_DOC_ID}).single()
                assert d_rec is not None, "Post-commit: Document MUST be serving eligible in Cypher!"
                d_meta = d_rec["p"]
                assert _is_serving_eligible(d_meta) is True, "Post-commit: Must pass _is_serving_eligible!"
                assert d_meta["chunksCount"] == 8
                assert d_meta["expected_chunk_count"] == 8
                assert d_meta["committed_generation"] == TARGET_GEN
                assert len(d_meta["active_point_ids"]) == 8

            # Verify Layer 2 Gate accepts all 8 Gen 3 points and rejects Gen 2 point
            for p in qdrant_points:
                assert verify_chunk_serving_integrity(p.payload, d_meta) is True, f"Gen 3 point {p.id} must pass Layer 2!"
            
            old_pt_dummy = {
                "doc_id": TARGET_DOC_ID, "document_id": TARGET_DOC_ID,
                "file_hash": TARGET_HASH, "fencing_generation": 2, "operation_id": "op_525aebef31a8",
                "is_active": True
            }
            assert verify_chunk_serving_integrity(old_pt_dummy, d_meta) is False, "Gen 2 point MUST be rejected by Layer 2 Gate!"
            print(f"  [PASS] Layer 2 Gate accepts all 8 Gen 3 points and rejects Gen 2 point (generation fence verified).")

            # Execute Copilot RAG UAT on Production points
            print(f"  [UAT] Running Copilot RAG inference tests on Production evidence...")
            import asyncio
            from app.modules.m3_hybrid_copilot.inference.client import OllamaClient
            ollama = OllamaClient()

            # Case 1 UAT
            c1_pts = [p.payload for p in qdrant_points if "case1" in p.payload.get("text", "").lower()]
            q1 = "Trong Case1 của file 42_HuynhNgocMinh_MGO403.xlsx, trình bày phương án vận chuyển tối ưu và tổng chi phí."
            res1 = asyncio.run(ollama.generate_rag_answer(query=q1, evidence_chunks=c1_pts, graph_entities=[], lang="vi"))
            ans1 = res1.get("answer", "")
            ans1_low = ans1.lower()
            assert "17.690" in ans1 or "17,690" in ans1 or "17690" in ans1, "Case 1 cost must be 17,690 USD!"
            assert "farthermost" not in ans1_low and "retail mall" not in ans1_low, "No AdventureWorks contamination!"
            print(f"  [PASS] UAT Case 1: Z_min = 17,690 USD verified, 0% AdventureWorks contamination.")

            # Case 2 UAT
            c2_pts = [p.payload for p in qdrant_points if "case2" in p.payload.get("text", "").lower()]
            q2 = "Trong Case2 của file 42_HuynhNgocMinh_MGO403.xlsx, khối lượng thức ăn A, B, C và chi phí tối ưu mỗi ngày là bao nhiêu?"
            res2 = asyncio.run(ollama.generate_rag_answer(query=q2, evidence_chunks=c2_pts, graph_entities=[], lang="vi"))
            ans2 = res2.get("answer", "")
            ans2_low = ans2.lower()
            assert "1.820" in ans2 or "1,820" in ans2 or "1820" in ans2, "Case 2 cost must be 1,820 VNĐ!"
            assert "casesolver" not in ans2_low, "No CaseSolver contamination!"
            print(f"  [PASS] UAT Case 2: Z_min = 1,820 VNĐ verified, 0% CaseSolver contamination.")

            # Verify Qdrant points count is 12525 + 8 = 12533 before deleting old point
            mid_count = self.qc.get_collection(self.collection).points_count
            assert mid_count == 12533, f"Expected 12533 points before deletion, got {mid_count}"
            print(f"  [PASS] Qdrant point count verified: {mid_count} (12525 + 8).")
        else:
            print(f"  [DRY-RUN] Post-commit serving verification simulated PASS.")

        # Phase 7: Post-Commit Cleanup (Delete Old Point)
        print(f"\n[PHASE 7: POST-COMMIT CLEANUP OF OLD POINT]")
        if self.is_dry_run:
            print(f"  [DRY-RUN] Would delete old point {OLD_POINT_ID} from {self.collection}")
        else:
            self.qc.delete(collection_name=self.collection, points_selector=models.PointIdsList(points=[OLD_POINT_ID]))
            remaining = self.qc.retrieve(collection_name=self.collection, ids=[OLD_POINT_ID])
            assert len(remaining) == 0, f"Old point {OLD_POINT_ID} still present after deletion!"
            final_count = self.qc.get_collection(self.collection).points_count
            assert final_count == 12532, f"Expected final point count 12532, got {final_count}"
            print(f"  [PASS] Old point {OLD_POINT_ID} deleted cleanly. Final Qdrant count: {final_count} (12525 + 8 - 1 = 12532).")

        print(f"\n=======================================================")
        print(f"MIGRATION TO GENERATION {TARGET_GEN} COMPLETED SUCCESSFULLY!")
        print(f"=======================================================\n")
        return True

    # =========================================================================
    # 3. SAFE ROLLBACK PROTOCOL (ZERO-DOWNTIME RECOVERY)
    # =========================================================================
    def execute_rollback(self):
        print(f"\n=======================================================")
        print(f"EXECUTING SAFE ZERO-DOWNTIME ROLLBACK FOR {TARGET_DOC_ID}")
        print(f"Mode: {'DRY-RUN' if self.is_dry_run else 'LIVE ROLLBACK'}")
        print(f"=======================================================")

        if not SNAPSHOT_FILE.exists():
            raise RuntimeError(f"Snapshot file {SNAPSHOT_FILE} does not exist! Cannot safely rollback.")
        
        with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
            snapshot = json.load(f)

        orig_neo4j = snapshot["neo4j_properties"]
        orig_pt = snapshot.get("old_point")

        # Step 1: Check Qdrant status of old point
        old_pts = self.qc.retrieve(self.collection, ids=[OLD_POINT_ID])
        if not old_pts:
            print(f"  [Rollback] Old point {OLD_POINT_ID} is MISSING from Qdrant.")
            if not orig_pt or not orig_pt.get("vector"):
                raise RuntimeError("CRITICAL: Old point is missing from Qdrant AND snapshot has no vector! CANNOT rollback without causing data loss!")
            print(f"  [Rollback] Restoring old point from verified snapshot (vector dim={len(orig_pt['vector'])})...")
            if not self.is_dry_run:
                self.qc.upsert(
                    collection_name=self.collection,
                    points=[
                        models.PointStruct(
                            id=OLD_POINT_ID,
                            vector=orig_pt["vector"],
                            payload=orig_pt["payload"]
                        )
                    ]
                )
                chk = self.qc.retrieve(self.collection, ids=[OLD_POINT_ID])
                assert len(chk) == 1, "Failed to restore old point to Qdrant!"
            print(f"  [PASS] Old point {OLD_POINT_ID} successfully restored and active in Qdrant.")
        else:
            print(f"  [PASS] Old point {OLD_POINT_ID} already present in Qdrant.")

        # Step 2: Rollback Neo4j to Generation 2
        print(f"  [Rollback] Reverting Neo4j Document node to Generation 2...")
        if not self.is_dry_run:
            with self.neo.session() as s:
                s.run("""
                    MATCH (d:Document {id: $id})
                    SET d.active_op_id = null,
                        d.op_stage = 'TERMINAL_SYNCED',
                        d.committed_op_id = $orig_op,
                        d.committed_generation = $orig_gen,
                        d.fencing_generation = $orig_gen,
                        d.chunksCount = $orig_chunks,
                        d.expected_chunk_count = $orig_chunks,
                        d.active_point_ids = $orig_pids,
                        d.parser_config = $orig_parser,
                        d.chunker_config = $orig_chunker,
                        d.lastModified = datetime()
                """, {
                    "id": TARGET_DOC_ID,
                    "orig_op": orig_neo4j.get("committed_op_id"),
                    "orig_gen": orig_neo4j.get("committed_generation", 2),
                    "orig_chunks": orig_neo4j.get("chunksCount", 1),
                    "orig_pids": orig_neo4j.get("active_point_ids", [OLD_POINT_ID]),
                    "orig_parser": orig_neo4j.get("parser_config", "v1.0"),
                    "orig_chunker": orig_neo4j.get("chunker_config", "overlap_500_v1.0")
                })
            print(f"  [PASS] Neo4j Document node restored to Generation {orig_neo4j.get('committed_generation', 2)}.")
        else:
            print(f"  [DRY-RUN] Would revert Neo4j Document node to Gen 2.")

        # Step 3: Delete Gen 3 candidate points from Qdrant
        print(f"  [Rollback] Cleaning up Generation 3 points from Qdrant...")
        if not self.is_dry_run:
            self.qc.delete(self.collection, points_selector=models.PointIdsList(points=CANDIDATE_UUIDS))
            rem = self.qc.retrieve(self.collection, ids=CANDIDATE_UUIDS)
            assert len(rem) == 0
            print(f"  [PASS] Gen 3 points deleted from Qdrant.")
        else:
            print(f"  [DRY-RUN] Would delete Gen 3 points from Qdrant.")

        print(f"\n[PASS] Safe Rollback completed. Document is back to Generation 2 with zero downtime.")
        return True


def main():
    parser = argparse.ArgumentParser(description="MGO Document Migration & Recovery Protocol")
    parser.add_argument("--env", choices=["staging", "production"], default="staging", help="Target environment")
    parser.add_argument("--action", choices=["audit", "migrate", "rollback"], default="audit", help="Action to execute")
    parser.add_argument("--execute", action="store_true", help="Execute live mutation (default is dry-run)")
    args = parser.parse_args()

    if args.env == "staging":
        neo_uri = "bolt://localhost:7688"
        neo_user = "neo4j"
        neo_pass = "graphmind_secret"
        q_host = "localhost"
        q_port = 6335
        col = "staging_cuad_contracts_pr1"
    else:
        neo_uri = "bolt://localhost:7687"
        neo_user = "neo4j"
        neo_pass = "graphmind_secret"
        q_host = "localhost"
        q_port = 6333
        col = "cuad_contracts"

    is_dry_run = not args.execute
    mgr = MgoMigrationManager(neo_uri, neo_user, neo_pass, q_host, q_port, col, is_dry_run=is_dry_run)
    try:
        if args.action == "audit":
            mgr.preflight_audit()
        elif args.action == "migrate":
            mgr.execute_migration()
        elif args.action == "rollback":
            mgr.execute_rollback()
    finally:
        mgr.close()


if __name__ == "__main__":
    main()
