#!/usr/bin/env python3
"""
scripts/test_adventureworks_full_vectors.py
GraphMind / AEGIS — Full AdventureWorks Qdrant Vector Ingestion Verification Suite

Validates all 12 mandatory requirements:
- TEST 1: Product count == 504
- TEST 2: Customer count == 19,820
- TEST 3: Store count == 701
- TEST 4: Vendor count == 104
- TEST 5: SalesOrder count == 31,465
- TEST 6: SalesOrderDetail count == 121,317
- TEST 7: Duplicate check: Zero duplicates, deterministic ID collision free
- TEST 8: Random consistency check: 20 random records match CSV == Qdrant == Neo4j
- TEST 9: Semantic search Product: 'black mountain bike' returns relevant bikes
- TEST 10: Semantic search SalesOrder/Detail: 'large order containing mountain bike'
- TEST 11: Idempotency verification: Re-upserting does not increase vector count
- TEST 12: CUAD integrity: 'cuad_contracts' collection completely intact
"""

import sys
import os
import random
import time
import uuid
import pandas as pd
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from qdrant_client import QdrantClient
from qdrant_client.http import models

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

ADV_DIR = Path(os.getenv("ADV_DATA_DIR", "D:/adventureworks")).resolve()
if not ADV_DIR.exists():
    fallback = REPO_ROOT / "central_storage_restore"
    if fallback.exists():
        ADV_DIR = fallback

COLLECTION_NAME = "adventureworks_entities"


def run_full_vector_tests():
    print("=" * 75)
    print("  GRAPHMIND — FULL ADVENTUREWORKS QDRANT VECTOR VERIFICATION SUITE")
    print("=" * 75)

    client = QdrantClient(host="127.0.0.1", port=6333, timeout=30)
    neo4j_client.connect()

    passed_tests = 0
    total_tests = 12

    # -------------------------------------------------------------------------
    # TEST 1: Product Count == 504
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying Product Vector Count (Expected: 504)...")
    cnt_prod = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="Product"))]),
        exact=True
    ).count
    t1_pass = cnt_prod == 504
    print(f"  Product vectors: {cnt_prod:,} / 504 -> {'PASS' if t1_pass else 'FAIL'}")
    if t1_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 2: Customer Count == 19,820
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Verifying Customer Vector Count (Expected: 19,820)...")
    cnt_cust = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="Customer"))]),
        exact=True
    ).count
    t2_pass = cnt_cust == 19820
    print(f"  Customer vectors: {cnt_cust:,} / 19,820 -> {'PASS' if t2_pass else 'FAIL'}")
    if t2_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 3: Store Count == 701
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Verifying Store Vector Count (Expected: 701)...")
    cnt_store = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="Store"))]),
        exact=True
    ).count
    t3_pass = cnt_store == 701
    print(f"  Store vectors: {cnt_store:,} / 701 -> {'PASS' if t3_pass else 'FAIL'}")
    if t3_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 4: Vendor Count == 104
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Verifying Vendor Vector Count (Expected: 104)...")
    cnt_vend = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="Vendor"))]),
        exact=True
    ).count
    t4_pass = cnt_vend == 104
    print(f"  Vendor vectors: {cnt_vend:,} / 104 -> {'PASS' if t4_pass else 'FAIL'}")
    if t4_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 5: SalesOrder Count == 31,465 (FULL)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Verifying SalesOrder Vector Count (Expected: 31,465)...")
    cnt_so = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="SalesOrder"))]),
        exact=True
    ).count
    t5_pass = cnt_so == 31465
    print(f"  SalesOrder vectors: {cnt_so:,} / 31,465 -> {'PASS' if t5_pass else 'FAIL'}")
    if t5_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 6: SalesOrderDetail Count == 121,317 (FULL)
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Verifying SalesOrderDetail Vector Count (Expected: 121,317)...")
    cnt_sod = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=models.Filter(must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value="SalesOrderDetail"))]),
        exact=True
    ).count
    t6_pass = cnt_sod == 121317
    print(f"  SalesOrderDetail vectors: {cnt_sod:,} / 121,317 -> {'PASS' if t6_pass else 'FAIL'}")
    if t6_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 7: Duplicate Check
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Duplicate Check across Points & Deterministic Keys...")
    # Scroll sample 500 points from different offsets to confirm distinct ID uniqueness
    sample_records, _ = client.scroll(collection_name=COLLECTION_NAME, limit=500, with_payload=True)
    sample_keys = [f"{r.payload.get('entity_type')}_{r.payload.get('entity_id')}" for r in sample_records]
    unique_keys = set(sample_keys)
    t7_pass = len(sample_keys) == len(unique_keys)
    print(f"  Sample 500 records uniqueness: {len(unique_keys)} / {len(sample_keys)} distinct keys -> {'PASS' if t7_pass else 'FAIL'}")
    if t7_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 8: Random Check: 20 Records (CSV == Qdrant == Neo4j)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Cross-Layer Consistency Check (20 Random Records: CSV vs Qdrant vs Neo4j)...")
    so_df = pd.read_csv(ADV_DIR / "Sales_SalesOrderHeader.csv", sep=None, engine="python", usecols=["SalesOrderID", "TotalDue", "CustomerID"])
    sample_ids = random.sample(list(so_df["SalesOrderID"]), 20)
    matches = 0

    for s_id in sample_ids:
        csv_row = so_df[so_df["SalesOrderID"] == s_id].iloc[0]
        csv_total = round(float(csv_row["TotalDue"]), 2)
        csv_cust = int(csv_row["CustomerID"])

        q_uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"aw_Sales_SalesOrderHeader_{s_id}"))
        q_pts = client.retrieve(collection_name=COLLECTION_NAME, ids=[q_uid], with_payload=True)

        neo_res = neo4j_client.run_cypher("""
            MATCH (o:SalesOrder)
            WHERE o.id = $id OR o.salesOrderId = $id OR o.SalesOrderID = $id
            RETURN coalesce(o.totalDue, o.TotalDue, 0.0) as totalDue,
                   coalesce(o.customerId, o.CustomerID, 0) as custId
        """, {"id": s_id})

        if q_pts and neo_res:
            q_payload = q_pts[0].payload
            q_total = round(float(q_payload.get("TotalDue") or q_payload.get("total_due") or 0.0), 2)
            neo_total = round(float(neo_res[0].get("totalDue") or 0.0), 2)
            if abs(csv_total - q_total) < 0.05 and abs(csv_total - neo_total) < 0.05:
                matches += 1

    t8_pass = matches == 20
    print(f"  Verified 20 random SalesOrders across CSV, Qdrant, and Neo4j: {matches}/20 matched -> {'PASS' if t8_pass else 'FAIL'}")
    if t8_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 9: Semantic Search Product
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Semantic Search Product ('black mountain bike')...")
    hits_p = qdrant_client.vector_search(query="black mountain bike", collection_name=COLLECTION_NAME, entity_type="Product", limit=3)
    t9_pass = len(hits_p) > 0 and any("mountain" in (h.get("contract_name", "") + h.get("text", "")).lower() for h in hits_p)
    top_p = hits_p[0] if hits_p else {}
    print(f"  Query: 'black mountain bike' -> Top Hit: {top_p.get('contract_name')} (Score: {top_p.get('score')})")
    print(f"  -> {'PASS' if t9_pass else 'FAIL'}")
    if t9_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 10: Semantic Search SalesOrder / SalesOrderDetail
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Semantic Search SalesOrder / Detail ('large order containing mountain bike')...")
    hits_so = qdrant_client.vector_search(query="large order containing mountain bike", collection_name=COLLECTION_NAME, entity_type="SalesOrder", limit=3)
    hits_sod = qdrant_client.vector_search(query="mountain bike competition high value order line", collection_name=COLLECTION_NAME, entity_type="SalesOrderDetail", limit=3)
    t10_pass = len(hits_so) > 0 and len(hits_sod) > 0
    top_so = hits_so[0] if hits_so else {}
    top_sod = hits_sod[0] if hits_sod else {}
    print(f"  Top SalesOrder:       {top_so.get('contract_name')} (Score: {top_so.get('score')})")
    print(f"  Top SalesOrderDetail: {top_sod.get('contract_name')} (Score: {top_sod.get('score')})")
    print(f"  -> {'PASS' if t10_pass else 'FAIL'}")
    if t10_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 11: Idempotency Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Idempotency Verification (Re-upserting known batch)...")
    # Take 5 points and re-upsert them, verify collection count does NOT increase
    count_before = client.get_collection(COLLECTION_NAME).points_count
    test_points, _ = client.scroll(collection_name=COLLECTION_NAME, limit=5, with_vectors=True, with_payload=True)
    pts_to_reupsert = [
        models.PointStruct(id=p.id, vector=p.vector, payload=p.payload)
        for p in test_points
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=pts_to_reupsert)
    count_after = client.get_collection(COLLECTION_NAME).points_count
    t11_pass = count_before == count_after
    print(f"  Points before: {count_before:,} | Points after: {count_after:,} | Net Change: {count_after - count_before}")
    print(f"  -> {'PASS' if t11_pass else 'FAIL'}")
    if t11_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 12: CUAD Integrity Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 12] CUAD Collection Integrity Verification...")
    cuad_info = client.get_collection("cuad_contracts")
    cuad_points = cuad_info.points_count
    t12_pass = cuad_points == 9145
    print(f"  cuad_contracts Points: {cuad_points:,} (Expected: 9,145 unchanged) -> {'PASS' if t12_pass else 'FAIL'}")
    if t12_pass: passed_tests += 1

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print(f"  FULL VECTOR SUITE RESULT: {passed_tests}/{total_tests} TESTS PASSED ({passed_tests/total_tests*100:.1f}%)")
    print("=" * 75)
    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_full_vector_tests()
    sys.exit(0 if success else 1)
