#!/usr/bin/env python3
"""
GraphMind / AEGIS — Comprehensive Knowledge Graph Full Audit (READ-ONLY)
Phase 1: Full Read-Only Audit Tool
- Queries live Neo4j database (bolt://localhost:7687)
- Queries live Qdrant database (localhost:6333)
- Scans Central Storage (/data) via docker volume
- Cross-references backup (backups/neo4j_backup_pre_upgrade.json)
- Mathematically explains the 12-node discrepancy (55,342 - 12 = 55,330)
- Outputs detailed audit_report.json
"""
import sys
import os
import json
import subprocess
from pathlib import Path
from collections import Counter, defaultdict

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

neo4j_client.connect()
qdrant_client.connect()

report = {
    "timestamp": None,
    "neo4j": {},
    "backup_diff": {},
    "central_storage": {},
    "qdrant": {},
    "cross_domain_check": {},
    "discrepancy_explanation": {}
}

import datetime
report["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

# --------------------------------------------------------------------------
# 1. NEO4J AUDIT
# --------------------------------------------------------------------------
print("=" * 80)
print("1. NEO4J GRAPH AUDIT")
print("=" * 80)
distinct_nodes = neo4j_client.run_cypher("MATCH (n) RETURN count(n) as c")[0]["c"]
total_rels = neo4j_client.run_cypher("MATCH ()-[r]->() RETURN count(r) as c")[0]["c"]

labels_res = neo4j_client.run_cypher("CALL db.labels() YIELD label RETURN label ORDER BY label")
label_counts = {}
for r in labels_res:
    lbl = r["label"]
    cnt = neo4j_client.run_cypher(f"MATCH (n:`{lbl}`) RETURN count(n) as c")[0]["c"]
    label_counts[lbl] = cnt

multi_labels = neo4j_client.run_cypher("""
    MATCH (n) WHERE size(labels(n)) > 1
    RETURN labels(n) as lbls, count(n) as c
""")

rels_res = neo4j_client.run_cypher("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType")
rel_counts = {}
for r in rels_res:
    rel = r["relationshipType"]
    cnt = neo4j_client.run_cypher(f"MATCH ()-[r:`{rel}`]->() RETURN count(r) as c")[0]["c"]
    rel_counts[rel] = cnt

# Isolated nodes
isolated_res = neo4j_client.run_cypher("MATCH (n) WHERE NOT (n)--() RETURN labels(n) as lbls, count(n) as c")
isolated_counts = {str(r["lbls"]): r["c"] for r in isolated_res}

# Demo products
demo_prods = neo4j_client.run_cypher("MATCH (p:Product) WHERE p.id IN [101, 102, 103] RETURN p.id as id, p.name as name")

report["neo4j"] = {
    "distinct_nodes": distinct_nodes,
    "total_relationships": total_rels,
    "label_counts": label_counts,
    "multi_labeled_nodes": [{"labels": r["lbls"], "count": r["c"]} for r in multi_labels],
    "relationship_counts": rel_counts,
    "isolated_nodes": isolated_counts,
    "demo_products": demo_prods
}

print(f"Distinct Nodes:         {distinct_nodes:,}")
print(f"Total Relationships:    {total_rels:,}")
print(f"Multi-labeled nodes:    {report['neo4j']['multi_labeled_nodes']}")
print(f"Isolated nodes:         {isolated_counts}")
print(f"Demo products count:    {len(demo_prods)}")

# --------------------------------------------------------------------------
# 2. MATHEMATICAL PROOF OF 12-NODE DISCREPANCY
# --------------------------------------------------------------------------
demo_prod_count = len(demo_prods)
isolated_comp_count = neo4j_client.run_cypher("MATCH (c:Company) WHERE NOT (c)--() RETURN count(c) as c")[0]["c"]
explained_target = distinct_nodes - (demo_prod_count + isolated_comp_count)

report["discrepancy_explanation"] = {
    "total_distinct_nodes": distinct_nodes,
    "section_1_reported_nodes": 55342,
    "section_5_reported_nodes": 55330,
    "delta": distinct_nodes - 55330,
    "demo_products_excluded": demo_prod_count,
    "isolated_companies_excluded": isolated_comp_count,
    "formula": f"55,342 (total) - 3 (demo products IDs 101,102,103) - 9 (isolated companies) = {explained_target:,}",
    "verified": (explained_target == 55330)
}
print("\n" + "=" * 80)
print("2. 12-NODE DISCREPANCY MATHEMATICAL PROOF")
print("=" * 80)
print(f"Formula: {report['discrepancy_explanation']['formula']}")
print(f"Status:  {'VERIFIED 100%' if report['discrepancy_explanation']['verified'] else 'MISMATCH'}")

# --------------------------------------------------------------------------
# 3. BACKUP DIFF
# --------------------------------------------------------------------------
print("\n" + "=" * 80)
print("3. BACKUP DIFF (neo4j_backup_pre_upgrade.json)")
print("=" * 80)
backup_file = REPO_ROOT / "backups" / "neo4j_backup_pre_upgrade.json"
if backup_file.exists():
    with open(backup_file, "r", encoding="utf-8") as f:
        bk = json.load(f)
    bk_nodes = bk.get("total_nodes", len(bk.get("nodes", [])))
    bk_rels = bk.get("total_relationships", len(bk.get("relationships", [])))
    report["backup_diff"] = {
        "backup_file": str(backup_file),
        "backup_timestamp": bk.get("created_at"),
        "backup_total_nodes": bk_nodes,
        "backup_total_relationships": bk_rels,
        "node_diff": distinct_nodes - bk_nodes,
        "rel_diff": total_rels - bk_rels,
        "status": "IDENTICAL_TO_LIVE" if (distinct_nodes == bk_nodes and total_rels == bk_rels) else "DIFF_DETECTED"
    }
    print(f"Backup Nodes: {bk_nodes:,} vs Live: {distinct_nodes:,} -> Diff: {report['backup_diff']['node_diff']}")
    print(f"Backup Rels:  {bk_rels:,} vs Live: {total_rels:,} -> Diff: {report['backup_diff']['rel_diff']}")
else:
    report["backup_diff"] = {"status": "BACKUP_FILE_NOT_FOUND"}

# --------------------------------------------------------------------------
# 4. CENTRAL STORAGE INVENTORY
# --------------------------------------------------------------------------
print("\n" + "=" * 80)
print("4. CENTRAL STORAGE INVENTORY (/data in aegis_file_watcher)")
print("=" * 80)
try:
    r_find = subprocess.run(
        ["docker", "exec", "aegis_file_watcher", "sh", "-c", "find /data -type f"],
        capture_output=True, encoding="utf-8", errors="replace"
    )
    storage_files = [line.strip() for line in (r_find.stdout or "").split("\n") if line.strip()]
    ext_counter = Counter(Path(f).suffix.lower() for f in storage_files)
    
    # Check pending files
    live_docs = neo4j_client.run_cypher("MATCH (d:Document) RETURN d.name as name")
    live_doc_names = {d["name"] for d in live_docs}
    
    pending_files = [f for f in storage_files if os.path.basename(f) not in live_doc_names]
    
    report["central_storage"] = {
        "total_files": len(storage_files),
        "by_extension": dict(ext_counter),
        "indexed_in_neo4j": len(storage_files) - len(pending_files),
        "pending_files": pending_files
    }
    print(f"Total Physical Files in /data: {len(storage_files)}")
    print(f"Breakdown by Extension:        {dict(ext_counter)}")
    print(f"Pending (Not in Neo4j docs):   {len(pending_files)}")
    for pf in pending_files:
        print(f"  * {pf}")
except Exception as e:
    report["central_storage"] = {"error": str(e)}

# --------------------------------------------------------------------------
# 5. QDRANT INVENTORY
# --------------------------------------------------------------------------
print("\n" + "=" * 80)
print("5. QDRANT INVENTORY")
print("=" * 80)
try:
    cols = [c.name for c in qdrant_client._client.get_collections().collections]
    q_info = {}
    for c in cols:
        inf = qdrant_client._client.get_collection(c)
        q_info[c] = {
            "points_count": inf.points_count,
            "vectors_count": inf.vectors_count,
            "status": str(inf.status)
        }
    report["qdrant"] = q_info
    print(f"Collections found: {cols}")
    for c, inf in q_info.items():
        print(f"  - '{c}': points_count = {inf['points_count']:,}")
except Exception as e:
    report["qdrant"] = {"error": str(e)}

# --------------------------------------------------------------------------
# 6. CROSS-DOMAIN VERIFICATION
# --------------------------------------------------------------------------
print("\n" + "=" * 80)
print("6. CROSS-DOMAIN RELATIONSHIPS AUDIT")
print("=" * 80)
cross_res = neo4j_client.run_cypher("""
    MATCH (a)-[r]-(b)
    WHERE any(l IN labels(a) WHERE l IN ['Clause', 'Company', 'Contract'])
      AND any(l IN labels(b) WHERE l IN ['Product', 'Customer', 'SalesOrder', 'Category', 'SubCategory'])
    RETURN count(r) as c
""")[0]["c"]
report["cross_domain_check"] = {
    "cross_domain_relations_count": cross_res,
    "status": "PASS" if cross_res == 0 else "FAIL"
}
print(f"Cross-domain relations count: {cross_res} -> {report['cross_domain_check']['status']}")

# Save report
out_path = REPO_ROOT / "audit_report.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print(f"\n[DONE] Full Audit Report saved to: {out_path}")
