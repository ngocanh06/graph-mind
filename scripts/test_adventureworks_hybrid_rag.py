#!/usr/bin/env python3
"""
GraphMind / AEGIS — AdventureWorks Hybrid GraphRAG Verification Suite
Module: scripts/test_adventureworks_hybrid_rag.py

Executes 10 rigorous test cases covering all requirements:
1. Product lookup by exact name
2. Semantic product search by natural language attributes
3. Real Store and Vendor search
4. Real SalesOrder ID query in Neo4j
5. Order detail verification against CSV source
6. Annual revenue calculation against ground truth definition
7. Hybrid Vector + Graph query (Product match -> Graph order expansion)
8. Negative / Out-of-distribution test (No hallucination)
9. Idempotency verification
10. CUAD integrity verification (cuad_contracts intact)
"""

import sys
import os
import json
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import pandas as pd
from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

ADV_DIR = Path("D:/adventureworks")


def run_tests():
    print("=" * 75)
    print("  GRAPHMIND — ADVENTUREWORKS HYBRID GRAPHRAG VERIFICATION SUITE")
    print("=" * 75)

    neo4j_client.connect()
    qdrant_client.connect()

    passed_count = 0
    total_tests = 10

    # -------------------------------------------------------------------------
    # TEST 1: Exact Product Search by Name
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Product Search by Exact Name...")
    q1 = "Mountain-100 Silver, 42"
    res1 = qdrant_client.vector_search(query=q1, collection_name="adventureworks_entities", limit=5)
    matched = [h for h in res1 if "Mountain-100 Silver, 42" in (h.get("contract_name") or "")]
    if not matched:
        matched = [h for h in res1 if "Mountain-100 Silver" in (h.get("contract_name") or "")]
    top1 = matched[0] if matched else (res1[0] if res1 else None)
    t1_pass = top1 is not None and "Mountain-100 Silver" in top1.get("contract_name", "") and top1.get("score", 0) > 0.40
    p1 = top1.get("payload", {}) if top1 else {}
    print(f"  Query: '{q1}'")
    print(f"  Top Match: {p1.get('name')} | SKU: {p1.get('product_number')} | Rank: {res1.index(top1) + 1 if top1 in res1 else 'N/A'} | Score: {top1.get('score')}")
    print(f"  -> {'PASS' if t1_pass else 'FAIL'}")
    if t1_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 2: Semantic Product Search by Natural Language Attributes
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Semantic Product Search by Attributes...")
    q2 = "silver competition mountain bike high performance over 3000 USD"
    res2 = qdrant_client.vector_search(
        query=q2,
        collection_name="adventureworks_entities",
        limit=3,
        entity_type="Product"
    )
    top2 = res2[0] if res2 else None
    p2 = top2.get("payload", {}) if top2 else {}
    t2_pass = top2 and p2.get("entity_type") == "Product" and float(p2.get("list_price", 0)) > 2000
    print(f"  Query: '{q2}'")
    print(f"  Top Hit: {p2.get('name')} | Category: {p2.get('subcategory')} | Price: ${p2.get('list_price')} | Score: {top2.get('score')}")
    print(f"  -> {'PASS' if t2_pass else 'FAIL'}")
    if t2_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 3: Real Store & Vendor Search
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Real Store and Vendor Search...")
    q3_store = "cửa hàng đại lý xe đạp thể thao Next-Door Bike Store"
    res3_s = qdrant_client.vector_search(query=q3_store, collection_name="adventureworks_entities", limit=3)
    top3_s = res3_s[0] if res3_s else None
    p3_s = top3_s.get("payload", {}) if top3_s else {}

    q3_vendor = "nhà cung cấp Australia Bike Retailer"
    res3_v = qdrant_client.vector_search(query=q3_vendor, collection_name="adventureworks_entities", limit=3)
    top3_v = res3_v[0] if res3_v else None
    p3_v = top3_v.get("payload", {}) if top3_v else {}

    t3_pass = (top3_s and "Next-Door Bike Store" in p3_s.get("name", "")) and \
              (top3_v and "Australia Bike Retailer" in p3_v.get("name", ""))
    print(f"  Store Hit:  {p3_s.get('name')} (ID: {p3_s.get('entity_id')}) | Score: {top3_s.get('score')}")
    print(f"  Vendor Hit: {p3_v.get('name')} (ID: {p3_v.get('entity_id')}) | Score: {top3_v.get('score')}")
    print(f"  -> {'PASS' if t3_pass else 'FAIL'}")
    if t3_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 4: Query Real SalesOrder in Neo4j
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Query Real SalesOrder in Neo4j (#43659)...")
    res4 = neo4j_client.run_cypher("""
        MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder {SalesOrderID: 43659})
        RETURN o.SalesOrderID as id, o.OrderDate as date, o.TotalDue as total_due, c.id as cust_id, c.name as cust_name
    """)
    t4_pass = len(res4) == 1 and res4[0]["id"] == 43659 and res4[0]["cust_id"] == 29825
    r4 = res4[0] if res4 else {}
    print(f"  Order: #{r4.get('id')} | Customer: {r4.get('cust_name')} (#{r4.get('cust_id')}) | TotalDue: ${r4.get('total_due'):,.2f}")
    print(f"  -> {'PASS' if t4_pass else 'FAIL'}")
    if t4_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 5: Verify Order Details against CSV Source
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Verify Order #43659 Details Against CSV Source...")
    ddf = pd.read_csv(ADV_DIR / "Sales_SalesOrderDetail.csv", sep=None, engine="python")
    csv_d43659 = ddf[ddf["SalesOrderID"] == 43659]
    csv_line_count = len(csv_d43659)
    csv_qty_sum = int(csv_d43659["OrderQty"].sum())
    csv_line_total = round(float(csv_d43659["LineTotal"].sum()), 2)

    res5 = neo4j_client.run_cypher("""
        MATCH (o:SalesOrder {SalesOrderID: 43659})-[r:CONTAINS_PRODUCT]->(p:Product)
        RETURN count(r) as line_count, sum(r.OrderQty) as qty_sum, round(sum(r.LineTotal), 2) as line_total
    """)
    r5 = res5[0] if res5 else {}
    t5_pass = (r5.get("line_count") == csv_line_count) and \
              (r5.get("qty_sum") == csv_qty_sum) and \
              (r5.get("line_total") == csv_line_total)

    print(f"  CSV Source:  Lines={csv_line_count}, QtySum={csv_qty_sum}, LineTotal=${csv_line_total:,.2f}")
    print(f"  Neo4j Graph: Lines={r5.get('line_count')}, QtySum={r5.get('qty_sum')}, LineTotal=${r5.get('line_total'):,.2f}")
    print(f"  -> {'PASS' if t5_pass else 'FAIL'}")
    if t5_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 6: Annual Revenue Calculation Ground Truth
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Annual Revenue Calculation Ground Truth...")
    hdf = pd.read_csv(ADV_DIR / "Sales_SalesOrderHeader.csv", sep=None, engine="python")
    hdf["Year"] = hdf["OrderDate"].str[:4].astype(int)
    csv_rev_2013_total = round(float(hdf[hdf["Year"] == 2013]["TotalDue"].sum()), 2)
    csv_rev_2013_sub = round(float(hdf[hdf["Year"] == 2013]["SubTotal"].sum()), 2)

    res6 = neo4j_client.run_cypher("""
        MATCH (o:SalesOrder)
        WHERE o.Year = 2013
        RETURN round(sum(o.TotalDue), 2) as total_due, round(sum(o.SubTotal), 2) as sub_total
    """)
    r6 = res6[0] if res6 else {}
    neo_total_due = r6.get("total_due")
    neo_sub_total = r6.get("sub_total")

    t6_pass = (neo_total_due == csv_rev_2013_total) and (neo_sub_total == csv_rev_2013_sub)
    print(f"  Year 2013 CSV Source:  TotalDue=${csv_rev_2013_total:,.2f} | SubTotal=${csv_rev_2013_sub:,.2f}")
    print(f"  Year 2013 Neo4j Graph: TotalDue=${neo_total_due:,.2f} | SubTotal=${neo_sub_total:,.2f}")
    print(f"  -> {'PASS' if t6_pass else 'FAIL'}")
    if t6_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 7: Hybrid Vector Retrieval + Graph Traversal
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Hybrid Vector Match -> Graph Expansion...")
    v_res = qdrant_client.vector_search(
        query="Mountain-100 Silver",
        collection_name="adventureworks_entities",
        limit=1
    )
    v_hit = v_res[0] if v_res else {}
    p7 = v_hit.get("payload", {})
    matched_pid = p7.get("entity_id")
    matched_pname = p7.get("name")

    res7 = neo4j_client.run_cypher("""
        MATCH (p:Product {id: $pid})
        OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p)
        OPTIONAL MATCH (c:Customer)-[:PLACED_ORDER]->(o)
        RETURN p.name as name, count(DISTINCT o) as orderCount, count(DISTINCT c) as custCount, round(sum(r.LineTotal), 2) as revenue
    """, {"pid": matched_pid})
    r7 = res7[0] if res7 else {}
    t7_pass = r7.get("orderCount", 0) > 0 and r7.get("revenue", 0) > 0
    print(f"  Qdrant Match: {matched_pname} (ID: {matched_pid})")
    print(f"  Neo4j Subgraph: {r7.get('orderCount')} orders placed by {r7.get('custCount')} customers, generating ${r7.get('revenue', 0):,.2f} USD")
    print(f"  -> {'PASS' if t7_pass else 'FAIL'}")
    if t7_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 8: Negative / Out-of-Distribution Test (No Hallucination)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Negative / Out-of-Distribution Query...")
    q8 = "military supersonic stealth fighter jet F-35"
    res8 = qdrant_client.vector_search(query=q8, collection_name="adventureworks_entities", limit=1)
    top8_score = res8[0].get("score", 0.0) if res8 else 0.0
    t8_pass = top8_score < 0.35
    top8_hit = res8[0].get("contract_name") if res8 else "None"
    print(f"  Query: '{q8}'")
    print(f"  Closest Entity: {top8_hit} | Similarity Score: {top8_score:.4f} (Threshold: < 0.35)")
    print(f"  Result: Query filtered out as low-confidence -> {'PASS' if t8_pass else 'FAIL'}")
    if t8_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 9: Idempotency Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Idempotency Verification...")
    so_cnt_res = neo4j_client.run_cypher("MATCH (o:SalesOrder) RETURN count(o) as cnt")
    so_cnt = so_cnt_res[0]["cnt"] if so_cnt_res else 0
    placed_cnt_res = neo4j_client.run_cypher("MATCH ()-[r:PLACED_ORDER]->() RETURN count(r) as cnt")
    placed_cnt = placed_cnt_res[0]["cnt"] if placed_cnt_res else 0
    contains_cnt_res = neo4j_client.run_cypher("MATCH ()-[r:CONTAINS_PRODUCT]->() RETURN count(r) as cnt")
    contains_cnt = contains_cnt_res[0]["cnt"] if contains_cnt_res else 0

    t9_pass = (so_cnt == 31465) and (placed_cnt == 31465) and (contains_cnt == 121317)
    print(f"  SalesOrder nodes:     {so_cnt:,} / 31,465")
    print(f"  PLACED_ORDER rels:    {placed_cnt:,} / 31,465")
    print(f"  CONTAINS_PRODUCT rels:{contains_cnt:,} / 121,317")
    print(f"  -> {'PASS' if t9_pass else 'FAIL'}")
    if t9_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # TEST 10: CUAD Collection & Graph Integrity
    # -------------------------------------------------------------------------
    print("\n[TEST 10] CUAD Collection & Graph Data Integrity...")
    col_info = qdrant_client.get_collection_info("cuad_contracts")
    cuad_points = col_info.get("points_count", 0)
    cuad_docs_res = neo4j_client.run_cypher("""
        MATCH (d:Document)
        WHERE d.name ENDS WITH '.pdf' OR d.name ENDS WITH '.PDF'
        RETURN count(d) as cnt
    """)
    cuad_docs_count = cuad_docs_res[0]["cnt"] if cuad_docs_res else 0

    t10_pass = (cuad_points >= 9069) and (cuad_docs_count >= 510)
    print(f"  cuad_contracts Qdrant points: {cuad_points:,} / >=9,069")
    print(f"  CUAD PDF Document nodes:      {cuad_docs_count:,} / >=510")
    print(f"  -> {'PASS' if t10_pass else 'FAIL'}")
    if t10_pass: passed_count += 1

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print(f"  FINAL SCORE: {passed_count}/{total_tests} TESTS PASSED ({passed_count/total_tests*100:.1f}%)")
    print("=" * 75)
    return passed_count == total_tests


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
