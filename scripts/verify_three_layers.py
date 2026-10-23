import sys
import os
import subprocess
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Setup backend import
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

print("=" * 60)
print("  GRAPHMIND / AEGIS — 3-LAYER SOURCE OF TRUTH VERIFICATION")
print("=" * 60)

# ----------------------------------------------------
# LAYER 1: CENTRAL STORAGE
# ----------------------------------------------------
print("\n[LỚP 1 — CENTRAL STORAGE]")
r_cuad = subprocess.run(['docker', 'exec', 'aegis_file_watcher', 'sh', '-c', 'find /data/legal -type f | wc -l'], capture_output=True, text=True)
r_total = subprocess.run(['docker', 'exec', 'aegis_file_watcher', 'sh', '-c', 'find /data -type f | wc -l'], capture_output=True, text=True)
cuad_storage_count = int(r_cuad.stdout.strip())
total_storage_count = int(r_total.stdout.strip())
aw_storage_count = total_storage_count - cuad_storage_count

print(f"  CUAD files in /data/legal: {cuad_storage_count} / 510  -> {'PASS' if cuad_storage_count == 510 else 'FAIL'}")
print(f"  AdventureWorks files:       {aw_storage_count} / 71   -> {'PASS' if aw_storage_count == 71 else 'FAIL'}")
print(f"  Total Central Storage files: {total_storage_count} / 581  -> {'PASS' if total_storage_count == 581 else 'FAIL'}")

# ----------------------------------------------------
# LAYER 2: QDRANT VECTOR DB
# ----------------------------------------------------
print("\n[LỚP 2 — QDRANT VECTOR DB]")
from app.db.qdrant.client import qdrant_client
qdrant_client.connect()
col_info = qdrant_client._client.get_collection(qdrant_client._collection)
total_qdrant_points = col_info.points_count

contracts = set()
offset = None
while True:
    pts, offset = qdrant_client._client.scroll(
        qdrant_client._collection,
        limit=1000,
        offset=offset,
        with_payload=['contract_name'],
        with_vectors=False
    )
    for p in pts:
        if p.payload and p.payload.get("contract_name"):
            contracts.add(p.payload.get("contract_name"))
    if not offset:
        break

qdrant_cuad_docs = [c for c in contracts if c.lower().endswith(".pdf")]
qdrant_aw_docs = [c for c in contracts if c.lower().endswith(".csv")]
cuad_chunks = total_qdrant_points - len(qdrant_aw_docs)

print(f"  CUAD documents in Qdrant:         {len(qdrant_cuad_docs)} / 510  -> {'PASS' if len(qdrant_cuad_docs) == 510 else 'FAIL'}")
print(f"  AdventureWorks in Qdrant:         {len(qdrant_aw_docs)} / 71   -> {'PASS' if len(qdrant_aw_docs) == 71 else 'FAIL'}")
print(f"  Total distinct docs in Qdrant:    {len(contracts)} / 581  -> {'PASS' if len(contracts) == 581 else 'FAIL'}")
print(f"  Total vector points (chunks):     {total_qdrant_points} (CUAD: {cuad_chunks}, AW: {len(qdrant_aw_docs)})")

# ----------------------------------------------------
# LAYER 3: NEO4J GRAPH DB
# ----------------------------------------------------
print("\n[LỚP 3 — NEO4J KNOWLEDGE GRAPH]")
from app.db.neo4j.client import neo4j_client
neo4j_client.connect()

res_cuad = neo4j_client.run_cypher("""
    MATCH (d:Document)
    WHERE d.department CONTAINS 'Legal' OR d.name ENDS WITH '.pdf' OR d.name ENDS WITH '.PDF'
    RETURN count(d) as cnt
""")
neo4j_cuad_docs = res_cuad[0]["cnt"] if res_cuad else 0

res_aw = neo4j_client.run_cypher("""
    MATCH (d:Document)
    WHERE d.name ENDS WITH '.csv' OR d.name ENDS WITH '.CSV'
    RETURN count(d) as cnt
""")
neo4j_aw_docs = res_aw[0]["cnt"] if res_aw else 0

res_total_docs = neo4j_client.run_cypher("MATCH (d:Document) RETURN count(d) as cnt")
neo4j_total_docs = res_total_docs[0]["cnt"] if res_total_docs else 0

total_nodes = neo4j_client.get_node_count()
rel_res = neo4j_client.run_cypher("MATCH ()-[r]->() RETURN count(r) as cnt")
total_rels = rel_res[0]["cnt"] if rel_res else 0

print(f"  CUAD Document nodes:             {neo4j_cuad_docs} / 510  -> {'PASS' if neo4j_cuad_docs == 510 else 'FAIL'}")
print(f"  AdventureWorks Document nodes:   {neo4j_aw_docs} / 71   -> {'PASS' if neo4j_aw_docs == 71 else 'FAIL'}")
print(f"  Total Document nodes:            {neo4j_total_docs} / 581  -> {'PASS' if neo4j_total_docs == 581 else 'FAIL'}")
print(f"  Total Knowledge Graph nodes:     {total_nodes}")
print(f"  Total Knowledge Graph relations: {total_rels}")

# ----------------------------------------------------
# BACKEND API CONSISTENCY CHECK
# ----------------------------------------------------
print("\n[BACKEND API CONSISTENCY]")
import urllib.request
import json
api_res = urllib.request.urlopen("http://127.0.0.1:5000/api/v1/documents?limit=1").read()
api_data = json.loads(api_res)
summary = api_data.get("summary", {})

print(f"  API total_items:        {summary.get('total_items')} / 581   -> {'PASS' if summary.get('total_items') == 581 else 'FAIL'}")
print(f"  API indexed_documents:  {summary.get('indexed_documents')} / 581   -> {'PASS' if summary.get('indexed_documents') == 581 else 'FAIL'}")
print(f"  API pending_documents:  {summary.get('pending_documents')} / 0     -> {'PASS' if summary.get('pending_documents') == 0 else 'FAIL'}")
print(f"  API failed_documents:   {summary.get('failed_documents')} / 0     -> {'PASS' if summary.get('failed_documents') == 0 else 'FAIL'}")
print(f"  API cuad_contracts:     {summary.get('cuad_contracts')} / 510   -> {'PASS' if summary.get('cuad_contracts') == 510 else 'FAIL'}")
print(f"  API adventureworks:     {summary.get('adventureworks_datasets')} / 71    -> {'PASS' if summary.get('adventureworks_datasets') == 71 else 'FAIL'}")
print(f"  API total_chunks:       {summary.get('total_chunks')}")

print("\n" + "=" * 60)
all_pass = (
    cuad_storage_count == 510 and
    aw_storage_count == 71 and
    len(qdrant_cuad_docs) == 510 and
    len(qdrant_aw_docs) == 71 and
    neo4j_cuad_docs == 510 and
    neo4j_aw_docs == 71 and
    summary.get('indexed_documents') == 581 and
    summary.get('pending_documents') == 0
)

if all_pass:
    print("  RESULT: 100% COMPLETE & VERIFIED ACROSS ALL 3 LAYERS!")
else:
    print("  RESULT: DISCREPANCIES FOUND!")
print("=" * 60)
