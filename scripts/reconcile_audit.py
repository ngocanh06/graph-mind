"""
Relationship Count Reconciliation Script — Read-Only
Investigates all 8 relationship types and the 2,429 BELONGS_TO_DEPT relationships.
"""

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.neo4j.client import neo4j_client

def main():
    connected = neo4j_client.is_connected or neo4j_client.connect()
    assert connected, "Neo4j connection failed"

    # 1. Total relationship count
    total_rels = neo4j_client.get_relationship_count()
    print(f"Total Relationships in Neo4j: {total_rels:,}")

    # 2. Count by type
    counts = neo4j_client.run_cypher("""
        MATCH ()-[r]->()
        RETURN type(r) as rel_type, count(r) as count
        ORDER BY count DESC
    """)
    print("\n[Relationship Inventory]")
    for c in counts:
        print(f"  {c['rel_type']:20s}: {c['count']:8,d}")

    # 3. BELONGS_TO_DEPT breakdown by start/end labels and department
    dept_breakdown = neo4j_client.run_cypher("""
        MATCH (a)-[r:BELONGS_TO_DEPT]->(d:Department)
        RETURN labels(a) as start_labels, d.name as dept_name, count(r) as count
        ORDER BY d.name, count DESC
    """)
    print("\n[BELONGS_TO_DEPT Breakdown]")
    for d in dept_breakdown:
        print(f"  {str(d['start_labels']):30s} -> {d['dept_name']:25s}: {d['count']:6,d}")

    # 4. Check for duplicate relationships between the same pair of nodes
    dup_rels = neo4j_client.run_cypher("""
        MATCH (a)-[r]->(b)
        WITH a, b, type(r) as t, count(r) as cnt
        WHERE cnt > 1
        RETURN t as rel_type, count(*) as duplicate_pairs, sum(cnt) as total_dup_edges
    """)
    print("\n[Duplicate Relationships Check (same a -> b with same type)]")
    if dup_rels:
        for dr in dup_rels:
            print(f"  Type {dr['rel_type']}: {dr['duplicate_pairs']} pairs, {dr['total_dup_edges']} total edges")
    else:
        print("  0 duplicate relationships found across entire graph.")

    # 5. Check cross-domain relationships
    cross_check = neo4j_client.run_cypher("""
        MATCH (a)-[r]-(b)
        WHERE (any(l IN labels(a) WHERE l IN ['Clause', 'Company', 'Contract']) AND any(l IN labels(b) WHERE l IN ['Product', 'Customer', 'SalesOrder', 'Category', 'SubCategory']))
           OR (a:Department AND NOT b:Customer AND NOT b:Product AND NOT b:Document)
        RETURN count(r) as cross_count
    """)[0]["cross_count"]
    print(f"\n[Cross-Domain Relationships Check]")
    print(f"  CUAD Legal <-> AdventureWorks ERP: {cross_check} (Must be 0)")

    # 6. Check Customer count matching Store or id <= 1000
    cust_check = neo4j_client.run_cypher("""
        MATCH (c:Customer)
        WHERE c.customerType = 'Store' OR c.id <= 1000
        RETURN count(c) as count
    """)[0]["count"]
    print(f"\nCustomer Store or id <= 1000 count: {cust_check}")

if __name__ == "__main__":
    main()
