"""
Script: scripts/test_adventureworks_hybrid_rag.py
Description: Validates AdventureWorks Hybrid Graph-RAG (Qdrant semantic vector search + Neo4j graph traversal).
"""
import sys
import os
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.http import models
from neo4j import GraphDatabase

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.qdrant.client import qdrant_client
from app.db.neo4j.client import neo4j_client

def test_adventureworks_hybrid_rag():
    print("=" * 65)
    print("TEST ADVENTUREWORKS HYBRID GRAPH-RAG")
    print("=" * 65)

    client = QdrantClient(host="127.0.0.1", port=6333)

    # 1. Collection Existence & Separation
    print("\n[1/4] Verifying Qdrant Collections & Separation...")
    collections_res = client.get_collections()
    col_names = [c.name for c in collections_res.collections]
    print(f"  Collections found: {col_names}")
    assert "adventureworks_entities" in col_names, "Collection 'adventureworks_entities' missing!"
    assert "cuad_contracts" in col_names, "Collection 'cuad_contracts' missing!"

    aw_info = client.get_collection("adventureworks_entities")
    total_aw_points = aw_info.points_count
    print(f"  adventureworks_entities points: {total_aw_points:,} (Expected: 52,594)")
    assert total_aw_points == 52594, f"Expected 52,594 vectors, got {total_aw_points}"

    # 2. Vector Type Distribution Verification
    print("\n[2/4] Verifying Entity Breakdown in adventureworks_entities...")
    expected_breakdown = {
        "Product": 504,
        "Vendor": 104,
        "Store": 701,
        "Customer": 19820,
        "SalesOrder": 31465,
    }

    for entity_type, expected_cnt in expected_breakdown.items():
        res = client.count(
            collection_name="adventureworks_entities",
            count_filter=models.Filter(
                must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value=entity_type))]
            ),
            exact=True,
        )
        print(f"  - {entity_type}: {res.count:,} (Expected: {expected_cnt:,})")
        assert res.count == expected_cnt, f"Entity {entity_type} count mismatch: expected {expected_cnt}, got {res.count}"
    print("  -> PASS: All entity categories match expected vector counts exactly.")

    # 3. Semantic Vector Search Check
    print("\n[3/4] Testing Semantic Vector Search on AdventureWorks Entities...")
    product_query = "Mountain bike 100 black 42"
    hits = qdrant_client.vector_search(
        query=product_query,
        collection_name="adventureworks_entities",
        limit=5
    )
    print(f"  Query: '{product_query}' -> Hits: {len(hits)}")
    assert len(hits) > 0, "No vector hits returned for product query!"
    top_hit = hits[0]
    print(f"  Top hit: {top_hit['contract_name']} | score: {top_hit['score']} | type: {top_hit['payload'].get('entity_type')}")
    assert "Mountain" in top_hit["contract_name"] or "Mountain" in top_hit["text"], "Top hit did not match Mountain bike product"
    assert top_hit["score"] > 0.50, f"Expected high similarity score, got {top_hit['score']}"

    # 4. Hybrid Graph Traversal via Neo4j
    print("\n[4/4] Testing Hybrid Graph Traversal (Vector Hit -> Neo4j Graph)...")
    matched_product_name = top_hit["payload"].get("name")
    print(f"  Traversing Neo4j for Product: '{matched_product_name}'...")
    query = """
        MATCH (p:Product {name: $name})
        OPTIONAL MATCH (p)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category)
        OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p)
        RETURN p.id AS productId, p.productNumber AS prodNumber,
               sc.name AS subcategory, c.name AS category,
               count(o) AS orderCount, sum(r.lineTotal) AS totalRevenue
    """
    records = neo4j_client.run_cypher(query, {"name": matched_product_name})
    assert len(records) > 0, f"Product {matched_product_name} not found in Neo4j!"
    rec = records[0]
    print(f"  Neo4j Traversal Result:")
    print(f"    Product ID: {rec['productId']} ({rec['prodNumber']})")
    print(f"    Subcategory: {rec['subcategory']} | Category: {rec['category']}")
    print(f"    Associated Sales Orders: {rec['orderCount']}")
    print(f"    Total Line Revenue: ${rec['totalRevenue']:,.2f}")
    assert rec["subcategory"] is not None, "Product should have linked subcategory"
    assert rec["orderCount"] > 0, "Product should be linked to at least one sales order"

    print("\n" + "=" * 65)
    print("ADVENTUREWORKS HYBRID GRAPH-RAG VERIFICATION PASSED [100%]")
    print("=" * 65)

if __name__ == "__main__":
    test_adventureworks_hybrid_rag()
