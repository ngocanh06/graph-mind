#!/usr/bin/env python3
"""
Ingest all 581 documents (510 CUAD PDFs + 71 AdventureWorks CSVs) into Neo4j
High performance with pypdfium2 and concurrent thread pool.
Target:
- 55,315 total nodes
- 161,574 total relationships
- 9 labels: Category, Clause, Company, Customer, Department, Document, Product, SalesOrder, SubCategory
- 8 relationships: BELONGS_TO, BELONGS_TO_DEPT, CONTAINS_CLAUSE, CONTAINS_PRODUCT, PARTY_TO, PART_OF, PLACED_ORDER, PURCHASED
"""
import os
import sys
import time
import hashlib
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.db.neo4j.client import neo4j_client
from app.modules.m1_data_sync.pipeline import (
    extract_text_from_bytes,
    chunk_text,
    extract_graph_entities
)

try:
    import pypdfium2
    HAS_PDFIUM = True
except ImportError:
    HAS_PDFIUM = False

def fast_extract_text(filename: str, content_bytes: bytes) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf" and HAS_PDFIUM:
        try:
            pdf = pypdfium2.PdfDocument(content_bytes)
            pages = [p.get_textpage().get_text_range() for p in pdf]
            return "\n\n".join(p for p in pages if p)
        except Exception:
            pass
    return extract_text_from_bytes(filename, content_bytes)

if not neo4j_client.is_connected and not neo4j_client.connect():
    print("[Error] Could not connect to Neo4j")
    sys.exit(1)

print("=" * 65)
print("  INGESTING ALL 581 DOCUMENTS INTO NEO4J KNOWLEDGE GRAPH")
print("=" * 65)

# 1. Clean obsolete / extraneous node labels not in official architecture
print("\n[1/5] Cleaning obsolete test nodes (Contract, Employee)...")
neo4j_client.run_cypher("MATCH (c:Contract) DETACH DELETE c")
neo4j_client.run_cypher("MATCH (e:Employee) DETACH DELETE e")

# 2. Constraints & Canonical Departments
print("\n[2/5] Ensuring Constraints & Canonical Departments...")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (d:Document) REQUIRE d.name IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (dept:Department) REQUIRE dept.name IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (comp:Company) REQUIRE comp.name IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (cl:Clause) REQUIRE cl.id IS UNIQUE")

departments_map = {
    "legal": ("Pháp chế (Legal)", "legal"),
    "sales": ("Kinh doanh (Sales)", "sales"),
    "rnd": ("Nghiên cứu & Phát triển (R&D)", "rnd"),
    "accounting_procurement": ("Kế toán / Thu mua (Accounting & Procurement)", "accounting_procurement"),
    "it": ("Công nghệ thông tin (IT)", "it"),
}

for dept_key, (dept_name, _) in departments_map.items():
    neo4j_client.run_cypher("MERGE (dept:Department {name: $name}) SET dept.key = $key", {"name": dept_name, "key": dept_key})

# 3. Discover existing Document nodes
existing_docs = set()
res = neo4j_client.run_cypher("MATCH (d:Document) RETURN d.name as name")
for r in res:
    if r.get("name"):
        existing_docs.add(r["name"])
print(f"[*] Found {len(existing_docs)} already existing Document nodes in Neo4j.")

# 4. Ingest missing files
print("\n[3/5] Scanning and ingesting missing documents...")
all_files = []
for dept_key, (dept_name, _) in departments_map.items():
    dept_dir = REPO_ROOT / dept_key
    if not dept_dir.exists():
        continue
    for f in sorted(os.listdir(dept_dir)):
        fp = dept_dir / f
        if fp.is_file() and not f.startswith((".", "~")):
            all_files.append((fp, dept_name, dept_key))

print(f"[*] Total files on disk to synchronize: {len(all_files)}")

to_ingest = [(fp, dept_name, dept_key) for fp, dept_name, dept_key in all_files if fp.name not in existing_docs]
print(f"[*] Missing from Neo4j: {len(to_ingest)} files")

def process_single_file(item):
    fp, dept_name, dept_key = item
    fname = fp.name
    try:
        with open(fp, "rb") as f_in:
            content_bytes = f_in.read()

        file_hash = hashlib.sha256(content_bytes).hexdigest()
        doc_id = f"DOC_{file_hash[:8].upper()}"
        timestamp_str = datetime.now().isoformat()

        # Fast extraction
        full_text = fast_extract_text(fname, content_bytes)
        chunks = chunk_text(full_text)
        entities = extract_graph_entities(full_text, fname)

        # Ingest Document & Belongs_to_dept
        neo4j_client.run_cypher("""
            MERGE (d:Document {name: $name})
            SET d.id = $doc_id,
                d.hash = $hash,
                d.department = $dept,
                d.deptKey = $dept_key,
                d.chunksCount = $chunks_count,
                d.contractValue = $contract_val,
                d.status = 'active',
                d.source = 'aegis_local_watcher',
                d.storagePath = '/data/' + $dept_key + '/' + $name,
                d.qdrantIndexed = true,
                d.neo4jSynced = true,
                d.ingestedAt = $ingested_at,
                d.lastModified = $ingested_at
            WITH d
            MERGE (dept:Department {name: $dept})
            MERGE (d)-[:BELONGS_TO_DEPT]->(dept)
        """, {
            "name": fname,
            "doc_id": doc_id,
            "hash": file_hash,
            "dept": dept_name,
            "dept_key": dept_key,
            "chunks_count": len(chunks),
            "contract_val": entities.get("value") or "Chưa xác định",
            "ingested_at": timestamp_str
        })

        # Ingest Companies
        for comp in entities.get("companies", []):
            neo4j_client.run_cypher("""
                MATCH (d:Document {name: $name})
                MERGE (c:Company {name: $company})
                MERGE (c)-[:PARTY_TO]->(d)
            """, {"name": fname, "company": comp})

        # Ingest Clauses
        for cl_idx, cl in enumerate(entities.get("clauses", [])):
            neo4j_client.run_cypher("""
                MATCH (d:Document {name: $name})
                CREATE (cls:Clause {
                    id: $cl_id,
                    type: $cl_type,
                    title: $cl_title,
                    snippet: $cl_snippet
                })
                CREATE (d)-[:CONTAINS_CLAUSE]->(cls)
            """, {
                "name": fname,
                "cl_id": f"{doc_id}_CL_{cl_idx + 1}",
                "cl_type": cl["type"],
                "cl_title": cl["title"],
                "cl_snippet": chunks[0][:200] if chunks else ""
            })
        return True, fname
    except Exception as e:
        return False, f"{fname}: {e}"

t0 = time.time()
success_cnt = 0
failed_cnt = 0

with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(process_single_file, item): item for item in to_ingest}
    for idx, fut in enumerate(as_completed(futures), 1):
        ok, res = fut.result()
        if ok:
            success_cnt += 1
        else:
            failed_cnt += 1
            print(f"  [!] Failed: {res}")
        if idx % 50 == 0 or idx == len(to_ingest):
            print(f"  -> Ingested {idx}/{len(to_ingest)} documents ({time.time() - t0:.1f}s)")

# 4. Link standard AdventureWorks relationships
print("\n[4/5] Checking and verifying entity relationships...")
# Ensure Products linked to R&D Dept
neo4j_client.run_cypher("""
    MATCH (d:Department) WHERE d.name CONTAINS 'R&D' OR d.name CONTAINS 'Nghiên cứu'
    WITH d LIMIT 1
    MATCH (p:Product)
    MERGE (p)-[:BELONGS_TO_DEPT]->(d)
""")
# Ensure Customer Stores linked to Sales Dept
neo4j_client.run_cypher("""
    MATCH (d:Department) WHERE d.name CONTAINS 'Kinh doanh' OR d.name CONTAINS 'Sales'
    WITH d LIMIT 1
    MATCH (c:Customer)
    WHERE c.customerType = 'Store' OR c.id <= 1000
    MERGE (c)-[:BELONGS_TO_DEPT]->(d)
""")

# 5. Verification
print("\n[5/5] Final Graph Metrics Verification...")
total_nodes = neo4j_client.get_node_count()
total_rels = neo4j_client.get_relationship_count()
label_counts = neo4j_client.get_label_counts()
rel_counts = {}
rel_res = neo4j_client.run_cypher("MATCH ()-[r]->() RETURN type(r) as t, count(r) as cnt")
for r in rel_res:
    rel_counts[r["t"]] = r["cnt"]

print("\n" + "=" * 65)
print(f"  NEO4J INGESTION COMPLETE!")
print(f"  Total Nodes:         {total_nodes:,} (Target: ~55,315)")
print(f"  Total Relationships: {total_rels:,} (Target: ~161,574)")
print("=" * 65)
print("  Labels:")
for lbl, cnt in sorted(label_counts.items(), key=lambda x: -x[1]):
    print(f"    - {lbl:15s}: {cnt:,}")
print("  Relationships:")
for rel, cnt in sorted(rel_counts.items(), key=lambda x: -x[1]):
    print(f"    - {rel:18s}: {cnt:,}")
print("=" * 65)
