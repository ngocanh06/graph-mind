"""
Script: scripts/verify_order_details.py
Description: Validates Neo4j AdventureWorks SalesOrders, CONTAINS_PRODUCT, and PLACED_ORDER integrity.
"""
import sys
from neo4j import GraphDatabase

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

NEO4J_URI = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j", "graphmind_secret")

def verify_order_details():
    print("=" * 65)
    print("VERIFY ADVENTUREWORKS ORDER DETAILS & DATA INTEGRITY")
    print("=" * 65)

    driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)
    with driver.session(database="neo4j") as session:
        # 1. Total SalesOrders
        rec = session.run("MATCH (o:SalesOrder) RETURN count(o) AS cnt").single()
        order_count = rec["cnt"]
        print(f"SalesOrder nodes: {order_count:,} (Expected: 31,465)")
        assert order_count == 31465, f"Expected 31,465 SalesOrder nodes, got {order_count}"

        # 2. Total PLACED_ORDER relationships
        rec = session.run("MATCH (:Customer)-[r:PLACED_ORDER]->(:SalesOrder) RETURN count(r) AS cnt").single()
        placed_order_count = rec["cnt"]
        print(f"PLACED_ORDER relationships: {placed_order_count:,} (Expected: 31,465)")
        assert placed_order_count == 31465, f"Expected 31,465 PLACED_ORDER relationships, got {placed_order_count}"

        # 3. Total CONTAINS_PRODUCT relationships
        rec = session.run("MATCH (:SalesOrder)-[r:CONTAINS_PRODUCT]->(:Product) RETURN count(r) AS cnt").single()
        contains_product_count = rec["cnt"]
        print(f"CONTAINS_PRODUCT relationships: {contains_product_count:,} (Expected: 121,317)")
        assert contains_product_count == 121317, f"Expected 121,317 CONTAINS_PRODUCT relationships, got {contains_product_count}"

        # 4. Duplicate SalesOrderID
        rec = session.run("""
            MATCH (o:SalesOrder)
            WITH o.id AS id, count(o) AS cnt
            WHERE cnt > 1
            RETURN count(id) AS dups
        """).single()
        dup_orders = rec["dups"]
        print(f"Duplicate SalesOrderID: {dup_orders} (Expected: 0)")
        assert dup_orders == 0, f"Found {dup_orders} duplicate SalesOrderIDs"

        # 5. Duplicate PLACED_ORDER relationships
        rec = session.run("""
            MATCH (c:Customer)-[r:PLACED_ORDER]->(o:SalesOrder)
            WITH c, o, count(r) AS cnt
            WHERE cnt > 1
            RETURN count(*) AS dups
        """).single()
        dup_placed = rec["dups"]
        print(f"Duplicate PLACED_ORDER relationships: {dup_placed} (Expected: 0)")
        assert dup_placed == 0, f"Found {dup_placed} duplicate PLACED_ORDER relationships"

        # 6. Duplicate CONTAINS_PRODUCT relationships
        rec = session.run("""
            MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)
            WITH o, p, r.detailId AS detailId, count(r) AS cnt
            WHERE cnt > 1
            RETURN count(*) AS dups
        """).single()
        dup_contains = rec["dups"]
        print(f"Duplicate CONTAINS_PRODUCT relationships: {dup_contains} (Expected: 0)")
        assert dup_contains == 0, f"Found {dup_contains} duplicate CONTAINS_PRODUCT relationships"

        # 7. Sample order verification (Order 43659)
        rec = session.run("""
            MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder {id: 43659})-[r:CONTAINS_PRODUCT]->(p:Product)
            RETURN c.id AS customerId, c.name AS customerName, o.totalDue AS totalDue, 
                   count(r) AS lineCount, sum(r.lineTotal) AS computedTotal,
                   collect(p.name)[0..3] AS sampleProducts
        """).single()
        assert rec is not None, "Order 43659 not found or has no linked customer/products"
        print(f"\nSample Order 43659 Inspection:")
        print(f"  Customer ID: {rec['customerId']} ({rec['customerName']})")
        print(f"  Total Due: ${rec['totalDue']:,.2f}")
        print(f"  Line Items Count: {rec['lineCount']}")
        print(f"  Computed Line Total: ${rec['computedTotal']:,.2f}")
        print(f"  Sample Products: {rec['sampleProducts']}")
        assert rec["lineCount"] > 0, "Order 43659 should have line items"

    driver.close()
    print("\n" + "=" * 65)
    print("ALL ORDER DETAIL & INTEGRITY CHECKS PASSED [100%]")
    print("=" * 65)

if __name__ == "__main__":
    verify_order_details()
