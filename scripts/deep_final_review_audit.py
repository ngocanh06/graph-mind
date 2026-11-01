"""
Comprehensive Deep Audit for Final Review — GraphMind / AEGIS
Verifies:
  1. All 586 Document nodes in Neo4j vs 588 Central Storage files
  2. All 1,702 Clauses & CONTAINS_CLAUSE provenance
  3. All 1,216 Companies & 1,348 PARTY_TO relationships
  4. AdventureWorks 504 canonical Products vs 3 demo Products & ERP hierarchy
  5. Qdrant payload schema & point-to-document mapping
"""

import sys
import os
import json
import hashlib
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(BACKEND_DIR))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

def main():
    print("=" * 80)
    print("STEP 1: DOCUMENT NODES (586) VS CENTRAL STORAGE FILES (588)")
    print("=" * 80)
    connected = neo4j_client.is_connected or neo4j_client.connect()
    assert connected, "Neo4j connection failed"

    docs = neo4j_client.run_cypher("""
        MATCH (d:Document)
        RETURN d.name as name, d.id as id, d.department as dept, d.storagePath as path, d.hash as hash, labels(d) as labels
        ORDER BY d.name
    """)
    print(f"Total Document nodes in Neo4j: {len(docs)}")

    docs_by_ext = {}
    for d in docs:
        name = d.get("name") or ""
        ext = Path(name).suffix.lower()
        docs_by_ext.setdefault(ext, []).append(d)

    for ext, items in sorted(docs_by_ext.items()):
        print(f"  {ext}: {len(items)} nodes")

    print("\nNon-PDF/CSV Document nodes:")
    for ext in [".xlsx", ".docx", ".txt"]:
        for d in docs_by_ext.get(ext, []):
            print(f"  [{ext}] name={d['name']}, id={d['id']}, dept={d['dept']}, path={d['path']}, hash={d['hash'][:16]}...")

    print("\nChecking 72 CSV Document nodes:")
    csv_names = [d["name"] for d in docs_by_ext.get(".csv", [])]
    print(f"  CSV count: {len(csv_names)}")
    # Find CSVs not starting with canonical prefixes (Production_, Sales_, Purchasing_, HumanResources_, Person_)
    canonical_prefixes = ("Production_", "Sales_", "Purchasing_", "HumanResources_", "Person_")
    non_canonical_csvs = [c for c in csv_names if not c.startswith(canonical_prefixes)]
    print(f"  Non-canonical prefix CSVs ({len(non_canonical_csvs)}): {non_canonical_csvs}")

    # Check Central Storage files on disk
    print("\nPhysical files in /data (via docker or local disk check if accessible):")
    # Let's inspect docker exec or local path
    import subprocess
    r = subprocess.run(["docker", "exec", "aegis_file_watcher", "find", "/data", "-type", "f"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    disk_files = [line.strip() for line in r.stdout.split("\n") if line.strip()]
    print(f"  Total physical files in /data: {len(disk_files)}")
    disk_exts = {}
    for f in disk_files:
        ext = Path(f).suffix.lower()
        disk_exts[ext] = disk_exts.get(ext, 0) + 1
    print(f"  Physical files by extension: {disk_exts}")

    # Physical files not in Neo4j docs
    neo_doc_names = {d["name"] for d in docs}
    neo_doc_paths = {d["path"] for d in docs if d.get("path")}
    unindexed = []
    for f in disk_files:
        fname = Path(f).name
        if fname not in neo_doc_names and f not in neo_doc_paths:
            unindexed.append(f)
    print(f"  Physical files without Document node in Neo4j ({len(unindexed)}):")
    for u in unindexed:
        print(f"    * {u}")

    print("\n" + "=" * 80)
    print("STEP 2: CLAUSE PROVENANCE (1,702 CLAUSES)")
    print("=" * 80)
    clauses = neo4j_client.run_cypher("""
        MATCH (c:Clause)
        OPTIONAL MATCH (d:Document)-[r:CONTAINS_CLAUSE]->(c)
        RETURN count(c) as total_clauses,
               count(r) as total_rels,
               count(d) as total_with_doc,
               count(CASE WHEN c.snippet IS NOT NULL AND trim(c.snippet) <> '' THEN 1 END) as clauses_with_snippet,
               count(CASE WHEN c.source_document_id IS NOT NULL THEN 1 END) as clauses_with_src_doc_id,
               count(CASE WHEN c.evidence_text IS NOT NULL THEN 1 END) as clauses_with_evidence
    """)
    print("Clause Audit Stats:", clauses[0])

    orphan_clauses = neo4j_client.run_cypher("""
        MATCH (c:Clause)
        WHERE NOT ()-[:CONTAINS_CLAUSE]->(c)
        RETURN count(c) as orphan_count
    """)[0]["orphan_count"]
    print(f"Orphan Clauses (no Document parent): {orphan_clauses}")

    sample_clauses = neo4j_client.run_cypher("""
        MATCH (d:Document)-[:CONTAINS_CLAUSE]->(c:Clause)
        RETURN d.name as doc_name, d.id as doc_id, c.type as clause_type, substring(c.snippet, 0, 80) as snippet_preview
        LIMIT 3
    """)
    print("Sample Clauses with parent Document:")
    for sc in sample_clauses:
        print(f"  Doc: {sc['doc_name']} (ID: {sc['doc_id']}) -> Clause: {sc['clause_type']} | Snippet: {sc['snippet_preview']}...")

    print("\n" + "=" * 80)
    print("STEP 3: COMPANY & PARTY_TO (1,216 COMPANIES, 1,348 PARTY_TO)")
    print("=" * 80)
    comp_stats = neo4j_client.run_cypher("""
        MATCH (c:Company)
        OPTIONAL MATCH (c)-[r:PARTY_TO]->(d:Document)
        WITH c, count(r) as deg, collect(d.name)[0..2] as doc_samples
        RETURN count(c) as total_companies,
               count(CASE WHEN deg > 0 THEN 1 END) as companies_with_party_to,
               count(CASE WHEN deg = 0 THEN 1 END) as companies_degree_0,
               count(CASE WHEN deg > 1 THEN 1 END) as shared_companies
    """)
    print("Company Audit Stats:", comp_stats[0])

    party_to_stats = neo4j_client.run_cypher("""
        MATCH ()-[r:PARTY_TO]->()
        RETURN count(r) as total_party_to,
               count(CASE WHEN r.evidence_text IS NOT NULL THEN 1 END) as party_to_with_evidence,
               count(CASE WHEN r.provenance IS NOT NULL THEN 1 END) as party_to_with_provenance
    """)
    print("PARTY_TO Relationship Stats:", party_to_stats[0])

    print("\n" + "=" * 80)
    print("STEP 4: ADVENTUREWORKS (504 CANONICAL VS 3 DEMO PRODUCTS, 31,465 ORDERS)")
    print("=" * 80)
    prod_stats = neo4j_client.run_cypher("""
        MATCH (p:Product)
        RETURN count(p) as total_products,
               count(CASE WHEN p.id IN [101, 102, 103] THEN 1 END) as demo_count,
               count(CASE WHEN NOT p.id IN [101, 102, 103] THEN 1 END) as canonical_count
    """)
    print("Product Stats:", prod_stats[0])

    erp_nodes = neo4j_client.run_cypher("""
        RETURN 
            head([x IN [{l: 'SalesOrder', c: count { MATCH (:SalesOrder) }}] | x.c]) as sales_orders,
            head([x IN [{l: 'Customer', c: count { MATCH (:Customer) }}] | x.c]) as customers,
            head([x IN [{l: 'SubCategory', c: count { MATCH (:SubCategory) }}] | x.c]) as subcats,
            head([x IN [{l: 'Category', c: count { MATCH (:Category) }}] | x.c]) as cats
    """)
    print("AdventureWorks ERP Hierarchy Stats:", erp_nodes[0])

    print("\n" + "=" * 80)
    print("STEP 5: QDRANT VECTORS & PAYLOAD SCHEMAS")
    print("=" * 80)
    q_conn = qdrant_client.is_connected or qdrant_client.connect()
    assert q_conn, "Qdrant connection failed"
    
    info_cuad = qdrant_client.get_collection_info("cuad_contracts")
    info_aw = qdrant_client.get_collection_info("adventureworks_entities")
    print(f"Qdrant 'cuad_contracts': points={info_cuad.get('points_count')}, vector_size={info_cuad.get('vector_size')}")
    print(f"Qdrant 'adventureworks_entities': points={info_aw.get('points_count')}, vector_size={info_aw.get('vector_size')}")

    # Inspect sample points and payloads
    pts_cuad, _ = qdrant_client._client.scroll(collection_name="cuad_contracts", limit=2, with_payload=True, with_vectors=False)
    print("\nSample cuad_contracts payload:")
    for p in pts_cuad:
        print(f"  Point ID: {p.id} | Payload keys: {list(p.payload.keys()) if p.payload else None}")
        if p.payload:
            print(f"    source_file: {p.payload.get('source_file')}, doc_id: {p.payload.get('document_id') or p.payload.get('doc_id')}, chunk_index: {p.payload.get('chunk_index')}")

    pts_aw, _ = qdrant_client._client.scroll(collection_name="adventureworks_entities", limit=2, with_payload=True, with_vectors=False)
    print("\nSample adventureworks_entities payload:")
    for p in pts_aw:
        print(f"  Point ID: {p.id} | Payload keys: {list(p.payload.keys()) if p.payload else None}")
        if p.payload:
            print(f"    entity_type: {p.payload.get('entity_type')}, entity_id: {p.payload.get('entity_id')}, name: {p.payload.get('name')}")

if __name__ == "__main__":
    main()
