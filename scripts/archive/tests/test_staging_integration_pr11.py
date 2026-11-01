"""
GraphMind PR1.1 — Staging Integration Test Suite
Executes real Neo4j (bolt://localhost:7688) & Qdrant (http://localhost:6335) integration tests.
Tests all required scenarios across Sections A, B, C, D, E.
"""

import sys
import os
import asyncio
from pathlib import Path
from typing import Dict, Any, List

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Ensure stdout handles UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from neo4j import GraphDatabase
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.db.neo4j.client import Neo4jClient
from app.db.qdrant.client import QdrantClientWrapper
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import (
    generate_cypher_from_query,
    CYPHER_SERVING_ELIGIBILITY_FILTER
)
from app.api.v1.copilot import (
    _is_serving_eligible,
    verify_chunk_serving_integrity,
    validate_aggregate_in_layer2,
    verify_document_batch,
    apply_layer2_context_gate
)
from app.modules.m3_hybrid_copilot.inference.client import OllamaClient


STAGING_NEO4J_URI = "bolt://localhost:7688"
STAGING_NEO4J_USER = "neo4j"
STAGING_NEO4J_PASS = "graphmind_secret"

STAGING_QDRANT_HOST = "localhost"
STAGING_QDRANT_PORT = 6335
STAGING_COLLECTION = "staging_cuad_contracts"


class StagingTestRunner:
    def __init__(self):
        self.neo4j_driver = GraphDatabase.driver(
            STAGING_NEO4J_URI,
            auth=(STAGING_NEO4J_USER, STAGING_NEO4J_PASS)
        )
        self.qdrant_client = QdrantClient(host=STAGING_QDRANT_HOST, port=STAGING_QDRANT_PORT)
        
        # Configure app singleton wrappers to point to staging instances
        self.app_neo4j = Neo4jClient()
        self.app_neo4j._driver = self.neo4j_driver
        self.app_neo4j._connected = True

        self.results: List[Dict[str, Any]] = []

    def record_result(self, test_id: str, section: str, name: str, passed: bool, details: str = ""):
        self.results.append({
            "test_id": test_id,
            "section": section,
            "name": name,
            "passed": passed,
            "details": details
        })
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {test_id} — {name}: {details}")

    def setup_staging_data(self):
        print("\n--- Seeding Staging Neo4j & Qdrant Data ---")
        with self.neo4j_driver.session() as session:
            # Clean any previous staging test nodes
            session.run("MATCH (n) DETACH DELETE n")

            # 1. Valid PR1 V3 Terminal Document
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_PR1_TERMINAL_VALID',
                    name: 'Hop_dong_PR1_Terminal.pdf',
                    department: 'Pháp chế (Legal)',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_pr1_term_01',
                    committed_generation: 1,
                    file_hash: 'hash_term_01',
                    hash: 'hash_term_01',
                    neo4jSynced: true
                })
            """)

            # 2. Valid Legacy Documents
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_LEGACY_VALID',
                    name: 'Hop_dong_Legacy_Standard.pdf',
                    department: 'Pháp chế (Legal)',
                    status: 'SYNCED',
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_01',
                    hash: 'hash_leg_01',
                    neo4jSynced: true
                })
            """)

            session.run("""
                CREATE (d:Document {
                    id: 'DOC_LEGACY_VN_VALID',
                    name: 'Hop_dong_Legacy_VN.pdf',
                    department: 'Kinh doanh (Sales)',
                    status: 'Hoạt động (Synced)',
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_vn_02',
                    hash: 'hash_leg_vn_02',
                    neo4jSynced: true
                })
            """)

            session.run("""
                CREATE (d:Document {
                    id: 'DOC_LEGACY_NEO_VALID',
                    name: 'Hop_dong_Legacy_NeoSynced.pdf',
                    department: 'Nhân sự (HR)',
                    status: null,
                    neo4jSynced: true,
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_neo_03',
                    hash: 'hash_leg_neo_03'
                })
            """)

            # 2b. Backward Compatibility: Legacy Active Documents
            session.run("""
                CREATE (d1:Document {
                    id: 'DOC_LEGACY_ACTIVE_VALID',
                    name: 'Sales_Store_Legacy.csv',
                    department: 'Kinh doanh (Sales)',
                    status: 'active',
                    neo4jSynced: true,
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_act_04',
                    hash: 'hash_leg_act_04'
                })
                CREATE (d2:Document {
                    id: 'DOC_LEGACY_ACTIVE_UNSYNCED',
                    name: 'Hop_dong_Legacy_Unsynced.pdf',
                    department: 'Kinh doanh (Sales)',
                    status: 'active',
                    neo4jSynced: false,
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_unsync'
                })
                CREATE (d3:Document {
                    id: 'DOC_LEGACY_ACTIVE_INFLIGHT',
                    name: 'Hop_dong_Legacy_Inflight.pdf',
                    department: 'Pháp chế (Legal)',
                    status: 'active',
                    neo4jSynced: true,
                    op_stage: null,
                    active_op_id: 'op_active_legacy',
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_leg_inf'
                })
            """)

            # 3. In-flight & Failed Documents
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_STAGE_STAGING',
                    name: 'Hop_dong_Staging.pdf',
                    status: 'STAGING',
                    op_stage: 'STAGING',
                    active_op_id: 'op_active_01',
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_stg_01'
                })
                CREATE (d2:Document {
                    id: 'DOC_STAGE_PURGING',
                    name: 'Hop_dong_Purging.pdf',
                    status: 'SYNCED',
                    op_stage: 'PURGING_OLD',
                    active_op_id: 'op_active_02',
                    committed_op_id: 'op_comm_02',
                    committed_generation: 1,
                    file_hash: 'hash_purg_01'
                })
                CREATE (d3:Document {
                    id: 'DOC_STAGE_FAILED',
                    name: 'Hop_dong_Failed.pdf',
                    status: 'TERMINAL_FAILED',
                    op_stage: 'TERMINAL_FAILED',
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_failed_01'
                })
                CREATE (d4:Document {
                    id: 'DOC_STAGE_CLEANUP',
                    name: 'Hop_dong_Cleanup.pdf',
                    status: 'SYNCED',
                    op_stage: 'CLEANUP_PENDING',
                    active_op_id: null,
                    committed_op_id: 'op_cln_01',
                    committed_generation: 1,
                    file_hash: 'hash_cln_01'
                })
                CREATE (d5:Document {
                    id: 'DOC_STAGE_PREPARING',
                    name: 'Hop_dong_Preparing.pdf',
                    status: 'STAGING',
                    op_stage: 'PREPARING_ACTIVATION',
                    active_op_id: 'op_prep_01',
                    committed_op_id: null,
                    committed_generation: null,
                    file_hash: 'hash_prep_01'
                })
            """)

            # 4. Broken Metadata Documents
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_TERM_NO_OP',
                    name: 'Hop_dong_No_Op.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: 1,
                    file_hash: 'hash_no_op'
                })
                CREATE (d2:Document {
                    id: 'DOC_TERM_NO_GEN',
                    name: 'Hop_dong_No_Gen.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_no_gen',
                    committed_generation: null,
                    file_hash: 'hash_no_gen'
                })
                CREATE (d3:Document {
                    id: 'DOC_TERM_ZERO_GEN',
                    name: 'Hop_dong_Zero_Gen.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_zero_gen',
                    committed_generation: 0,
                    file_hash: 'hash_zero_gen'
                })
            """)

            # 5. Missing / Conflicting Hash Documents
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_NO_HASH',
                    name: 'Hop_dong_No_Hash.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_h1',
                    committed_generation: 1,
                    file_hash: null,
                    hash: null
                })
                CREATE (d2:Document {
                    id: 'DOC_CONFLICT_HASH',
                    name: 'Hop_dong_Conflict_Hash.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_h2',
                    committed_generation: 1,
                    file_hash: 'hash_alpha',
                    hash: 'hash_beta'
                })
            """)

            # 6. Ambiguous Legacy Documents
            session.run("""
                CREATE (d:Document {
                    id: 'DOC_AMBIGUOUS_OP',
                    name: 'Hop_dong_Ambig_Op.pdf',
                    status: 'SYNCED',
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: 'op_ambig_01',
                    committed_generation: null,
                    file_hash: 'hash_ambig_01'
                })
                CREATE (d2:Document {
                    id: 'DOC_AMBIGUOUS_GEN',
                    name: 'Hop_dong_Ambig_Gen.pdf',
                    status: 'SYNCED',
                    op_stage: null,
                    active_op_id: null,
                    committed_op_id: null,
                    committed_generation: 1,
                    file_hash: 'hash_ambig_02'
                })
            """)

            # 7. Duplicate Document ID Nodes (2 nodes with identical id)
            session.run("""
                CREATE (d1:Document {
                    id: 'DOC_DUP_STAGING',
                    name: 'Hop_dong_Dup_A.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_dup_1',
                    committed_generation: 1,
                    file_hash: 'hash_dup_a'
                })
                CREATE (d2:Document {
                    id: 'DOC_DUP_STAGING',
                    name: 'Hop_dong_Dup_B.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_dup_2',
                    committed_generation: 1,
                    file_hash: 'hash_dup_b'
                })
            """)

            # 8. Clauses linked to valid documents
            session.run("""
                MATCH (d:Document {id: 'DOC_PR1_TERMINAL_VALID'})
                CREATE (cl1:Clause {
                    id: 'cl_1',
                    type: 'Limitation of Liability',
                    snippet: 'Giới hạn trách nhiệm bồi thường tối đa 100,000 USD.'
                })
                CREATE (cl2:Clause {
                    id: 'cl_2',
                    type: 'Governing Law',
                    snippet: 'Hợp đồng tuân theo pháp luật Việt Nam.'
                })
                CREATE (d)-[:CONTAINS_CLAUSE]->(cl1)
                CREATE (d)-[:CONTAINS_CLAUSE]->(cl2)
            """)

            session.run("""
                MATCH (d:Document {id: 'DOC_LEGACY_VALID'})
                CREATE (cl3:Clause {
                    id: 'cl_3',
                    type: 'Termination',
                    snippet: 'Thời hạn báo trước chấm dứt hợp đồng là 30 ngày.'
                })
                CREATE (d)-[:CONTAINS_CLAUSE]->(cl3)
            """)

            # 9. Company entities & relationships
            session.run("""
                MATCH (d1:Document {id: 'DOC_PR1_TERMINAL_VALID'})
                MATCH (d2:Document {id: 'DOC_LEGACY_VALID'})
                CREATE (c1:Company {name: 'Staging MultiCorp'})
                CREATE (c1)-[:PARTY_TO]->(d1)
                CREATE (c1)-[:PARTY_TO]->(d2)
            """)

            session.run("CREATE (c2:Company {name: 'Staging GhostCorp'})")

            session.run("""
                MATCH (dbad:Document {id: 'DOC_STAGE_STAGING'})
                CREATE (c3:Company {name: 'Staging BadCorp'})
                CREATE (c3)-[:PARTY_TO]->(dbad)
            """)


            # 10. ERP entities (Product & SalesOrder)
            session.run("""
                CREATE (p:Product {
                    id: 1001,
                    name: 'Mountain-100 Silver, 38',
                    productNumber: 'BK-M68S-38',
                    listPrice: 3399.99
                })
                CREATE (o:SalesOrder {
                    id: 99001,
                    salesOrderId: 99001,
                    totalDue: 4500.0,
                    orderDate: '2026-10-31'
                })
                CREATE (cust:Customer {
                    id: 29845,
                    CustomerID: 29845,
                    name: 'Staging VIP Customer'
                })
                CREATE (cust)-[:PLACED_ORDER]->(o)
                CREATE (o)-[:CONTAINS_PRODUCT]->(p)
            """)

        # Setup Qdrant Staging Collection
        try:
            self.qdrant_client.delete_collection(STAGING_COLLECTION)
        except Exception:
            pass

        self.qdrant_client.create_collection(
            collection_name=STAGING_COLLECTION,
            vectors_config=models.VectorParams(size=4, distance=models.Distance.COSINE)
        )

        # Upsert test points into Qdrant staging
        self.qdrant_client.upsert(
            collection_name=STAGING_COLLECTION,
            points=[
                # Valid chunk for PR1 V3 Terminal Document
                models.PointStruct(
                    id=101,
                    vector=[0.1, 0.2, 0.3, 0.4],
                    payload={
                        "doc_id": "DOC_PR1_TERMINAL_VALID",
                        "document_id": "DOC_PR1_TERMINAL_VALID",
                        "file_hash": "hash_term_01",
                        "operation_id": "op_pr1_term_01",
                        "fencing_generation": 1,
                        "is_active": True,
                        "text": "Điều khoản giới hạn trách nhiệm bồi thường hợp đồng PR1."
                    }
                ),
                # Staged chunk (is_active True in Qdrant, but Document is STAGING in Neo4j)
                models.PointStruct(
                    id=102,
                    vector=[0.1, 0.2, 0.3, 0.4],
                    payload={
                        "doc_id": "DOC_STAGE_STAGING",
                        "document_id": "DOC_STAGE_STAGING",
                        "file_hash": "hash_stg_01",
                        "operation_id": "op_active_01",
                        "fencing_generation": 1,
                        "is_active": True,
                        "text": "Nội dung tài liệu đang STAGING chưa commit."
                    }
                ),
                # Inactive chunk (is_active False)
                models.PointStruct(
                    id=103,
                    vector=[0.1, 0.2, 0.3, 0.4],
                    payload={
                        "doc_id": "DOC_PR1_TERMINAL_VALID",
                        "file_hash": "hash_term_01",
                        "is_active": False,
                        "text": "Point cũ đã bị vô hiệu hóa."
                    }
                ),
                # Legacy chunk: missing is_active, matching hash with DOC_LEGACY_ACTIVE_VALID
                models.PointStruct(
                    id=104,
                    vector=[0.1, 0.2, 0.3, 0.4],
                    payload={
                        "doc_id": "DOC_LEGACY_ACTIVE_VALID",
                        "document_id": "DOC_LEGACY_ACTIVE_VALID",
                        "file_hash": "hash_leg_act_04",
                        "text": "Nội dung tài liệu Legacy active từ Sales_Store.csv."
                    }
                ),
                # Legacy chunk: missing is_active, but hash mismatch with Neo4j
                models.PointStruct(
                    id=105,
                    vector=[0.1, 0.2, 0.3, 0.4],
                    payload={
                        "doc_id": "DOC_LEGACY_ACTIVE_VALID",
                        "document_id": "DOC_LEGACY_ACTIVE_VALID",
                        "file_hash": "hash_mismatched",
                        "text": "Nội dung Legacy active nhưng hash xung đột."
                    }
                )
            ]
        )
        print("Staging data seeded successfully.")

    # ------------------------------------------------------------------------
    # SECTION A: SERVING ELIGIBILITY IN CYPHER & LAYER 2
    # ------------------------------------------------------------------------
    def run_section_a(self):
        print("\n=== RUNNING SECTION A: SERVING ELIGIBILITY ===")
        with self.neo4j_driver.session() as session:
            # Query all documents through CYPHER_SERVING_ELIGIBILITY_FILTER
            res = session.run(f"""
                MATCH (d:Document)
                WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
                RETURN d.id as doc_id, d.name as name
            """)
            matched_ids = {r["doc_id"] for r in res}

        # A1: PR1 V3 Terminal Valid is served
        self.record_result(
            "SCENARIO-A1", "A. Serving Eligibility",
            "PR1 V3 Terminal Valid served in Cypher",
            "DOC_PR1_TERMINAL_VALID" in matched_ids,
            f"Matched IDs: {matched_ids}"
        )

        # A2: Legacy Valid Documents served
        legacy_served = {
            "DOC_LEGACY_VALID",
            "DOC_LEGACY_VN_VALID",
            "DOC_LEGACY_NEO_VALID"
        }.issubset(matched_ids)
        self.record_result(
            "SCENARIO-A2", "A. Serving Eligibility",
            "Legacy Valid documents served in Cypher",
            legacy_served,
            f"All 3 legacy documents present in matched: {legacy_served}"
        )

        # A3: In-flight & Failed stages rejected in Cypher
        in_flight_rejected = not any(
            bad_id in matched_ids
            for bad_id in [
                "DOC_STAGE_STAGING", "DOC_STAGE_PURGING",
                "DOC_STAGE_FAILED", "DOC_STAGE_CLEANUP", "DOC_STAGE_PREPARING"
            ]
        )
        self.record_result(
            "SCENARIO-A3", "A. Serving Eligibility",
            "In-flight & Failed stages rejected in Cypher",
            in_flight_rejected,
            "STAGING, PURGING_OLD, TERMINAL_FAILED, CLEANUP_PENDING, PREPARING all absent"
        )

        # A4: Missing committed metadata rejected
        broken_rejected = not any(
            bid in matched_ids
            for bid in ["DOC_TERM_NO_OP", "DOC_TERM_NO_GEN", "DOC_TERM_ZERO_GEN"]
        )
        self.record_result(
            "SCENARIO-A4", "A. Serving Eligibility",
            "Terminal documents missing committed metadata rejected",
            broken_rejected,
            "No-op, no-gen, zero-gen all rejected"
        )

        # A5: Missing or conflicting hash rejected
        hash_rejected = not any(
            hid in matched_ids
            for hid in ["DOC_NO_HASH", "DOC_CONFLICT_HASH"]
        )
        self.record_result(
            "SCENARIO-A5", "A. Serving Eligibility",
            "Missing hash or conflicting hash rejected",
            hash_rejected,
            "DOC_NO_HASH & DOC_CONFLICT_HASH absent"
        )

        # A6: Ambiguous legacy documents rejected
        ambig_rejected = not any(
            aid in matched_ids
            for aid in ["DOC_AMBIGUOUS_OP", "DOC_AMBIGUOUS_GEN"]
        )
        self.record_result(
            "SCENARIO-A6", "A. Serving Eligibility",
            "Ambiguous documents (op_stage=None with committed fields) rejected",
            ambig_rejected,
            "Ambiguous legacy rejected fail-closed"
        )

        # A7: Layer 2 Duplicate Document Detection
        # Pass mock client connected to staging neo4j
        import app.api.v1.copilot as copilot_module
        copilot_module.neo4j_client = self.app_neo4j

        batch_meta = verify_document_batch(["DOC_DUP_STAGING", "DOC_PR1_TERMINAL_VALID"])
        dup_handled = (batch_meta.get("DOC_DUP_STAGING") is None) and (batch_meta.get("DOC_PR1_TERMINAL_VALID") is not None)
        self.record_result(
            "SCENARIO-A7", "A. Serving Eligibility",
            "Duplicate Document ID fail-closed in verify_document_batch",
            dup_handled,
            f"DOC_DUP_STAGING mapped to None: {batch_meta.get('DOC_DUP_STAGING') is None}"
        )

        # A8: Backward Compatibility - Legacy active document with neo4jSynced=true served
        legacy_act_served = "DOC_LEGACY_ACTIVE_VALID" in matched_ids
        self.record_result(
            "SCENARIO-A8", "A. Serving Eligibility",
            "Legacy active document with neo4jSynced=true served in Cypher",
            legacy_act_served,
            f"DOC_LEGACY_ACTIVE_VALID present: {legacy_act_served}"
        )

        # A9: Backward Compatibility - Legacy active document with neo4jSynced=false or active_op_id rejected
        legacy_bad_rejected = not any(
            bad_id in matched_ids
            for bad_id in ["DOC_LEGACY_ACTIVE_UNSYNCED", "DOC_LEGACY_ACTIVE_INFLIGHT"]
        )
        self.record_result(
            "SCENARIO-A9", "A. Serving Eligibility",
            "Legacy active with neo4jSynced=false or in-flight active_op_id rejected in Cypher",
            legacy_bad_rejected,
            f"DOC_LEGACY_ACTIVE_UNSYNCED & DOC_LEGACY_ACTIVE_INFLIGHT absent: {legacy_bad_rejected}"
        )

    # ------------------------------------------------------------------------
    # SECTION B: AGGREGATE PROVENANCE
    # ------------------------------------------------------------------------
    def run_section_b(self):
        print("\n=== RUNNING SECTION B: AGGREGATE PROVENANCE ===")
        # 1. Execute actual synthesized Cypher aggregate query on staging Neo4j
        cypher_portfolio = generate_cypher_from_query("cơ cấu danh mục hợp đồng")
        with self.neo4j_driver.session() as session:
            res = session.run(cypher_portfolio)
            rows = [r.data() for r in res]

        row = rows[0] if rows else {}
        source_doc_ids = row.get("source_doc_ids", [])
        total_verified = row.get("total_verified_docs", 0)
        dup_det = row.get("duplicate_detected", 0)

        expected_ids = {
            "DOC_PR1_TERMINAL_VALID",
            "DOC_LEGACY_VALID",
            "DOC_LEGACY_VN_VALID",
            "DOC_LEGACY_NEO_VALID",
            "DOC_LEGACY_ACTIVE_VALID"
        }
        actual_ids = set(source_doc_ids)

        # B1: Aggregate counts only serving eligible documents exactly once (deduplication)
        # Note: In the presence of duplicate document ID 'DOC_DUP_STAGING', Cypher counts it exactly ONCE
        # (len(source_doc_ids) == 6, total_verified == 6) and flags duplicate_detected == 2.
        dedup_works = (
            len(source_doc_ids) == len(actual_ids) == 6 and
            total_verified == 6 and
            dup_det == 2 and
            expected_ids.issubset(actual_ids) and
            "DOC_DUP_STAGING" in actual_ids
        )
        self.record_result(
            "SCENARIO-B1a", "B. Aggregate Provenance",
            "Aggregate query deduplicates duplicate document nodes to 1 count and flags duplicate_detected=2",
            dedup_works,
            f"Total verified: {total_verified}, distinct IDs count: {len(actual_ids)}, dup_detected: {dup_det}"
        )

        # B1b: Now test clean aggregate by removing the duplicate node temporarily
        with self.neo4j_driver.session() as session:
            session.run("MATCH (d:Document {id: 'DOC_DUP_STAGING'}) DETACH DELETE d")
            res_clean = session.run(cypher_portfolio)
            rows_clean = [r.data() for r in res_clean]

            # Re-create duplicate node immediately for subsequent tests
            session.run("""
                CREATE (d1:Document {
                    id: 'DOC_DUP_STAGING',
                    name: 'Hop_dong_Dup_A.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_dup_1',
                    committed_generation: 1,
                    file_hash: 'hash_dup_a'
                })
                CREATE (d2:Document {
                    id: 'DOC_DUP_STAGING',
                    name: 'Hop_dong_Dup_B.pdf',
                    status: 'SYNCED',
                    op_stage: 'TERMINAL_SYNCED',
                    active_op_id: null,
                    committed_op_id: 'op_dup_2',
                    committed_generation: 1,
                    file_hash: 'hash_dup_b'
                })
            """)

        row_clean = rows_clean[0] if rows_clean else {}
        clean_ids = set(row_clean.get("source_doc_ids", []))
        clean_total = row_clean.get("total_verified_docs", 0)
        clean_dup = row_clean.get("duplicate_detected", 0)

        clean_counts_match = (clean_ids == expected_ids) and (clean_total == len(expected_ids)) and (clean_dup == 1)
        self.record_result(
            "SCENARIO-B1b", "B. Aggregate Provenance",
            "Clean aggregate query counts only valid serving documents with duplicate_detected=1",
            clean_counts_match,
            f"Total clean docs: {clean_total}, source IDs: {clean_ids}, dup_detected: {clean_dup}"
        )


        # B2: Layer 2 validates valid aggregate card successfully
        import app.api.v1.copilot as copilot_module
        copilot_module.neo4j_client = self.app_neo4j

        valid_aggregate_card = {
            "type": "portfolio-breakdown",
            "source_doc_ids": list(expected_ids),
            "total_verified_docs": len(expected_ids),
            "duplicate_detected": 1,
            "_labels": ["ContractPortfolio", "CUAD"]
        }
        _, verified_entities = apply_layer2_context_gate([], [valid_aggregate_card])
        l2_accepted = len(verified_entities) == 1
        self.record_result(
            "SCENARIO-B2", "B. Aggregate Provenance",
            "Layer 2 Context Gate validates legitimate aggregate card",
            l2_accepted,
            f"Verified entities count: {len(verified_entities)}"
        )

        # B3: Layer 2 rejects aggregate card with tainted or invalid source_doc_ids
        tainted_aggregate_card = {
            "type": "portfolio-breakdown",
            "source_doc_ids": list(expected_ids) + ["DOC_STAGE_STAGING"],  # Staging doc added
            "total_verified_docs": len(expected_ids) + 1,
            "duplicate_detected": 1,
            "_labels": ["ContractPortfolio", "CUAD"]
        }
        _, verified_tainted = apply_layer2_context_gate([], [tainted_aggregate_card])
        l2_rejected_tainted = len(verified_tainted) == 0
        self.record_result(
            "SCENARIO-B3", "B. Aggregate Provenance",
            "Layer 2 Context Gate strictly rejects aggregate with in-flight source doc",
            l2_rejected_tainted,
            f"Tainted aggregate correctly rejected (0 verified entities)"
        )

        # B4: Aggregate card with duplicate_detected > 1 is rejected
        dup_aggregate_card = {
            "type": "portfolio-breakdown",
            "source_doc_ids": ["DOC_DUP_STAGING"],
            "total_verified_docs": 1,
            "duplicate_detected": 2,
            "_labels": ["ContractPortfolio", "CUAD"]
        }
        _, verified_dup = apply_layer2_context_gate([], [dup_aggregate_card])
        l2_rejected_dup = len(verified_dup) == 0
        self.record_result(
            "SCENARIO-B4", "B. Aggregate Provenance",
            "Layer 2 Context Gate strictly rejects aggregate when duplicate doc detected",
            l2_rejected_dup,
            f"Duplicate detected aggregate rejected: {l2_rejected_dup}"
        )

    # ------------------------------------------------------------------------
    # SECTION C: COMPANY PROVENANCE
    # ------------------------------------------------------------------------
    def run_section_c(self):
        print("\n=== RUNNING SECTION C: COMPANY PROVENANCE ===")
        import app.api.v1.copilot as copilot_module
        copilot_module.neo4j_client = self.app_neo4j

        # C1: Company with multiple valid PARTY_TO docs resolves and verifies provenance
        multi_company = {
            "name": "Staging MultiCorp",
            "_labels": ["Company"]
        }
        _, verified_multi = apply_layer2_context_gate([], [multi_company])
        c1_pass = (
            len(verified_multi) == 1 and
            verified_multi[0].get("provenance_verified") is True and
            set(verified_multi[0].get("source_doc_ids", [])) == {"DOC_PR1_TERMINAL_VALID", "DOC_LEGACY_VALID"}
        )
        self.record_result(
            "SCENARIO-C1", "C. Company Provenance",
            "Company with multiple valid documents resolves and verifies provenance",
            c1_pass,
            f"MultiCorp verified: {c1_pass}, sources: {verified_multi[0].get('source_doc_ids') if verified_multi else None}"
        )

        # C2: Company with NO PARTY_TO documents (GhostCorp) is rejected from citation
        ghost_company = {
            "name": "Staging GhostCorp",
            "_labels": ["Company"]
        }
        _, verified_ghost = apply_layer2_context_gate([], [ghost_company])
        c2_pass = (len(verified_ghost) == 0)
        self.record_result(
            "SCENARIO-C2", "C. Company Provenance",
            "Company without PARTY_TO provenance is rejected from citation context",
            c2_pass,
            f"GhostCorp rejected count: {len(verified_ghost)}"
        )

        # C3: Company linked to ineligible document (BadCorp -> DOC_STAGE_STAGING) fails closed
        bad_company = {
            "name": "Staging BadCorp",
            "_labels": ["Company"]
        }
        _, verified_bad = apply_layer2_context_gate([], [bad_company])
        c3_pass = (len(verified_bad) == 0)
        self.record_result(
            "SCENARIO-C3", "C. Company Provenance",
            "Company linked to in-flight document fails closed and is rejected",
            c3_pass,
            f"BadCorp rejected count: {len(verified_bad)}"
        )

    # ------------------------------------------------------------------------
    # SECTION D: PRODUCT CITATION EXCLUSION
    # ------------------------------------------------------------------------
    def run_section_d(self):
        print("\n=== RUNNING SECTION D: PRODUCT CITATION EXCLUSION ===")
        import app.api.v1.copilot as copilot_module
        copilot_module.neo4j_client = self.app_neo4j

        prod_ent = {
            "_id": "prod_staging_1001",
            "_labels": ["Product"],
            "name": "Mountain-100 Silver, 38",
            "snippet": "Sản phẩm Mountain-100 Silver: Giá niêm yết $3399.99 USD."
        }
        order_ent = {
            "_id": "order_staging_99001",
            "_labels": ["SalesOrder"],
            "name": "Đơn hàng #99001",
            "snippet": "Đơn hàng #99001 tổng tiền $4,500.0 USD."
        }
        customer_ent = {
            "_id": "cust_staging_29845",
            "_labels": ["Customer"],
            "name": "Staging VIP Customer",
            "snippet": "Khách hàng Staging VIP Customer."
        }

        _, verified_erp = apply_layer2_context_gate([], [prod_ent, order_ent, customer_ent])
        
        all_retained = len(verified_erp) == 3
        all_tagged_erp = all(e.get("is_erp_entity") is True for e in verified_erp)
        no_doc_citations = all("source_doc_ids" not in e and "source_document_id" not in e for e in verified_erp)

        d1_pass = all_retained and all_tagged_erp and no_doc_citations
        self.record_result(
            "SCENARIO-D1", "D. Product Citation Exclusion",
            "ERP entities retained for synthesis, tagged is_erp_entity, and excluded from Document Citation",
            d1_pass,
            f"Retained: {len(verified_erp)}/3, all tagged is_erp_entity: {all_tagged_erp}, no doc citations: {no_doc_citations}"
        )

    # ------------------------------------------------------------------------
    # SECTION E: LLM CONTEXT & CITATION ALIGNMENT
    # ------------------------------------------------------------------------
    def run_section_e(self):
        print("\n=== RUNNING SECTION E: LLM CONTEXT & CITATION ===")
        import app.api.v1.copilot as copilot_module
        copilot_module.neo4j_client = self.app_neo4j

        # Test chunk verification against staging Qdrant + Neo4j
        # 1. Fetch points from staging Qdrant
        points, _ = self.qdrant_client.scroll(
            collection_name=STAGING_COLLECTION,
            limit=10,
            with_payload=True,
            with_vectors=False
        )
        raw_chunks = [
            {
                "id": p.id,
                "doc_id": p.payload.get("doc_id"),
                "document_id": p.payload.get("document_id"),
                "file_hash": p.payload.get("file_hash"),
                "operation_id": p.payload.get("operation_id"),
                "fencing_generation": p.payload.get("fencing_generation"),
                "is_active": p.payload.get("is_active"),
                "text": p.payload.get("text"),
                "payload": p.payload
            }
            for p in points
        ]

        verified_chunks, _ = apply_layer2_context_gate(raw_chunks, [])

        # Point 101: PR1 V3 Terminal Document (is_active True, matching op_id & generation) -> PASS
        # Point 102: STAGING document in Neo4j -> REJECT
        # Point 103: is_active False -> REJECT
        # Point 104: Legacy active document (missing is_active, matching hash with DOC_LEGACY_ACTIVE_VALID) -> PASS
        # Point 105: Legacy active document (missing is_active, but hash mismatched) -> REJECT
        verified_ids = {c["id"] for c in verified_chunks}
        e1_pass = (
            len(verified_chunks) == 2 and
            verified_ids == {101, 104}
        )
        self.record_result(
            "SCENARIO-E1", "E. LLM Context & Citation",
            "Layer 2 accepts serving PR1 V3 point (101) and valid Legacy point (104), rejecting staged (102), inactive (103), and hash mismatch (105)",
            e1_pass,
            f"Verified point IDs: {verified_ids}"
        )

        # 2. Ollama Prompt Serializer slicing verification
        client = OllamaClient()
        test_chunks = [
            {"text": f"Nội dung chunk #{i}", "source_file": f"file_{i}.pdf", "chunk_index": i}
            for i in range(8)
        ]
        test_entities = [
            {"name": f"Thực thể #{i}", "_labels": ["Clause"], "snippet": f"Mô tả #{i}"}
            for i in range(7)
        ]

        from unittest.mock import patch
        with patch("httpx.AsyncClient.post", side_effect=Exception("Ollama offline mock fallback")):
            res = asyncio.run(client.generate_rag_answer(
                "Điều khoản bảo mật hợp đồng",
                test_chunks,
                test_entities,
                "vi"
            ))

        e2_pass = (
            res.get("success") is True and
            len(res.get("used_chunks", [])) == 5 and
            len(res.get("used_entities", [])) == 4 and
            all(c["chunk_index"] < 5 for c in res.get("used_chunks", []))
        )
        self.record_result(
            "SCENARIO-E2", "E. LLM Context & Citation",
            "LLM serializer strictly bounds prompt evidence and tracks used_chunks/used_entities",
            e2_pass,
            f"Used chunks: {len(res.get('used_chunks', []))}/5, used entities: {len(res.get('used_entities', []))}/4"
        )

        # 3. Zero Retrieval Refusal verification
        # When all context is rejected
        zero_chunks, zero_entities = apply_layer2_context_gate(
            [{"doc_id": "GHOST_DOC", "text": "Unverified text"}],
            [{"name": "Ghost Ent", "_labels": ["Company"]}]
        )
        e3_pass = (len(zero_chunks) == 0 and len(zero_entities) == 0)
        self.record_result(
            "SCENARIO-E3", "E. LLM Context & Citation",
            "Zero retrieval refusal triggered when all candidate context fails Layer 2 gate",
            e3_pass,
            f"Context cleanly zeroed: chunks={len(zero_chunks)}, entities={len(zero_entities)}"
        )

    def verify_production_integrity(self):
        print("\n--- Verifying Production Databases Untouched ---")
        # Check production Neo4j (bolt://localhost:7687)
        prod_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "graphmind_secret"))
        with prod_driver.session() as s:
            r = s.run("MATCH (n) RETURN labels(n) as lbl, count(n) as cnt")
            prod_labels = {tuple(x["lbl"]): x["cnt"] for x in r}
        prod_driver.close()

        # Check production Qdrant (http://localhost:6333)
        prod_qdrant = QdrantClient(host="localhost", port=6333)
        prod_cols = [c.name for c in prod_qdrant.get_collections().collections]

        prod_unaffected = (
            ("cuad_contracts" in prod_cols) and
            ("adventureworks_entities" in prod_cols) and
            ("staging_cuad_contracts" not in prod_cols) and
            (prod_labels.get(('SalesOrder',), 0) == 31465) and
            (prod_labels.get(('Customer',), 0) == 19820)
        )
        self.record_result(
            "PROD-INTEGRITY", "Database Protection",
            "Production Neo4j & Qdrant completely untouched and unchanged",
            prod_unaffected,
            f"Production SalesOrders: {prod_labels.get(('SalesOrder',))}, Customers: {prod_labels.get(('Customer',))}, Collections: {prod_cols}"
        )

    def close(self):
        self.neo4j_driver.close()


def main():
    runner = StagingTestRunner()
    try:
        runner.setup_staging_data()
        runner.run_section_a()
        runner.run_section_b()
        runner.run_section_c()
        runner.run_section_d()
        runner.run_section_e()
        runner.verify_production_integrity()
    finally:
        runner.close()

    total_tests = len(runner.results)
    passed_tests = sum(1 for r in runner.results if r["passed"])
    print(f"\n=======================================================")
    print(f"STAGING INTEGRATION TEST SUMMARY: {passed_tests}/{total_tests} PASSED")
    print(f"=======================================================")
    if passed_tests == total_tests:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
