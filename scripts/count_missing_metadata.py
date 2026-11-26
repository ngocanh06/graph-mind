"""
Script to count missing department and classification metadata in live Qdrant and Neo4j.
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client


def run_audit():
    print("=== START METADATA AUDIT (QDRANT & NEO4J) ===")

    # 1. Neo4j Audit
    neo_ok = neo4j_client.connect()
    if not neo_ok:
        print("[Neo4j] FAILED to connect.")
    else:
        print("[Neo4j] Connected successfully.")
        total_nodes = neo4j_client.get_node_count()
        total_rels = neo4j_client.get_relationship_count()
        print(f"  Total nodes: {total_nodes}")
        print(f"  Total relationships: {total_rels}")

        # Document nodes
        doc_count_res = neo4j_client.run_cypher("MATCH (d:Document) RETURN count(d) as cnt")
        doc_cnt = doc_count_res[0]["cnt"] if doc_count_res else 0

        # Document nodes missing department
        doc_missing_dept_res = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE d.department IS NULL OR trim(d.department) = ''
            RETURN count(d) as cnt
        """)
        doc_missing_dept = doc_missing_dept_res[0]["cnt"] if doc_missing_dept_res else 0

        # Document nodes missing classification
        doc_missing_class_res = neo4j_client.run_cypher("""
            MATCH (d:Document)
            WHERE d.classification IS NULL OR trim(d.classification) = ''
            RETURN count(d) as cnt
        """)
        doc_missing_class = doc_missing_class_res[0]["cnt"] if doc_missing_class_res else 0

        # Clause nodes missing department
        cl_res = neo4j_client.run_cypher("MATCH (c:Clause) RETURN count(c) as cnt")
        cl_cnt = cl_res[0]["cnt"] if cl_res else 0

        cl_missing_dept_res = neo4j_client.run_cypher("""
            MATCH (c:Clause)
            WHERE c.department IS NULL OR trim(c.department) = ''
            RETURN count(c) as cnt
        """)
        cl_missing_dept = cl_missing_dept_res[0]["cnt"] if cl_missing_dept_res else 0

        # All nodes missing both department and classification
        all_missing_both_res = neo4j_client.run_cypher("""
            MATCH (n)
            WHERE (n.department IS NULL OR trim(toString(n.department)) = '')
              AND (n.classification IS NULL OR trim(toString(n.classification)) = '')
            RETURN count(n) as cnt
        """)
        all_missing_both = all_missing_both_res[0]["cnt"] if all_missing_both_res else 0

        print(f"  Document nodes: {doc_cnt}")
        print(f"    - Missing department: {doc_missing_dept}")
        print(f"    - Missing classification: {doc_missing_class}")
        print(f"  Clause nodes: {cl_cnt}")
        print(f"    - Missing department: {cl_missing_dept}")
        print(f"  Total nodes across graph missing both dept & classification: {all_missing_both}")

    # 2. Qdrant Audit
    qdrant_ok = qdrant_client.connect()
    if not qdrant_ok:
        print("[Qdrant] FAILED to connect.")
    else:
        print("\n[Qdrant] Connected successfully.")
        collections = qdrant_client.get_collections()
        print(f"  Active collections: {collections}")

        for col in collections:
            cnt = qdrant_client.get_points_count(collection_name=col)
            print(f"\n  Collection: '{col}' (Total Points: {cnt})")

            # Scroll and check payloads
            # We can use client.scroll
            client = qdrant_client._client
            offset = None
            missing_dept_cnt = 0
            scanned_cnt = 0

            while True:
                res, next_offset = client.scroll(
                    collection_name=col,
                    limit=1000,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                if not res:
                    break
                for p in res:
                    scanned_cnt += 1
                    pl = p.payload or {}
                    dept = pl.get("department") or pl.get("dept") or pl.get("deptKey")
                    if not dept or not str(dept).strip():
                        missing_dept_cnt += 1

                if next_offset is None:
                    break
                offset = next_offset

            print(f"    - Scanned points: {scanned_cnt}")
            print(f"    - Missing department payload: {missing_dept_cnt}")


if __name__ == "__main__":
    run_audit()
