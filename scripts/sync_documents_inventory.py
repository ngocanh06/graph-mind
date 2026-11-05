#!/usr/bin/env python3
"""
Sync watcher documents into Neo4j and deduplicate BELONGS_TO_DEPT relationships
so that Neo4j Document count matches Central Storage repository inventory (595 documents).
"""
import sys
import os
from pathlib import Path
from neo4j import GraphDatabase

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.core.central_storage import list_central_storage_files
from app.modules.m1_data_sync.webhook import get_watcher_ingested_docs

files = list_central_storage_files()
inv_names = {x["name"] for x in files}
watcher = get_watcher_ingested_docs()
watcher_extra = [w for w in watcher if w.get("name") and w["name"] not in inv_names]

print(f"Central storage files: {len(files)}")
print(f"Watcher extra files: {len(watcher_extra)}")
print(f"Total target: {len(files) + len(watcher_extra)} (595)")

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123"))

with driver.session() as s:
    # 1. Clean up duplicate BELONGS_TO_DEPT relationships
    print("\n[1] Deduplicating BELONGS_TO_DEPT relationships...")
    s.run("""
        MATCH (d:Document)-[r:BELONGS_TO_DEPT]->(dept:Department)
        WITH d, dept, collect(r) as rels
        WHERE size(rels) > 1
        FOREACH (r in tail(rels) | DELETE r)
    """)

    # Also resolve multiple distinct Department relationships per document
    # Keep only the canonical one matching d.department / d.deptKey
    s.run("""
        MATCH (d:Document)-[r:BELONGS_TO_DEPT]->(dept:Department)
        WITH d, collect({dept: dept, rel: r}) as items
        WHERE size(items) > 1
        WITH d, items, head(items) as keep
        FOREACH (it in items | 
            FOREACH (_ in CASE WHEN it <> keep THEN [1] ELSE [] END |
                DELETE it.rel
            )
        )
    """)

    # 2. Insert / Merge the 13 watcher extra documents into Neo4j
    print("\n[2] Ingesting watcher extra documents into Neo4j...")
    for w in watcher_extra:
        w_name = w["name"]
        w_id = w.get("id") or f"DOC_{w_name[:8]}"
        dept = w.get("dept") or w.get("department") or "Pháp chế (Legal)"
        dept_key = w.get("deptKey") or "legal"
        
        s.run("""
            MERGE (d:Document {name: $name})
            SET d.id = $id,
                d.title = $name,
                d.department = $dept,
                d.dept = $dept,
                d.deptKey = $dept_key,
                d.status = 'INDEXED',
                d.qdrantIndexed = true,
                d.neo4jSynced = true,
                d.chunksCount = $chunks,
                d.hash = $hash,
                d.storagePath = $storage_path
            WITH d
            MATCH (dept:Department)
            WHERE dept.key = $dept_key OR dept.name = $dept
            WITH d, dept LIMIT 1
            MERGE (d)-[:BELONGS_TO_DEPT]->(dept)
        """, {
            "name": w_name,
            "id": w_id,
            "dept": dept,
            "dept_key": dept_key,
            "chunks": w.get("chunk_count", 1),
            "hash": w.get("hash", ""),
            "storage_path": w.get("storage_path", f"/data/{dept_key}/{w_name}")
        })
        print(f"  Synced: {w_name} -> {dept}")

    # 3. Canonicalize d.department property on all Document nodes
    print("\n[3] Standardizing department names...")
    s.run("""
        MATCH (d:Document)
        OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
        WITH d, dept,
             CASE
               WHEN coalesce(d.department, d.dept, dept.name, '') =~ '(?i).*(pháp chế|legal|hợp đồng).*' THEN 'Pháp chế (Legal)'
               WHEN coalesce(d.department, d.dept, dept.name, '') =~ '(?i).*(kinh doanh|sales).*' THEN 'Kinh doanh (Sales)'
               WHEN coalesce(d.department, d.dept, dept.name, '') =~ '(?i).*(r&d|nghiên cứu|rnd).*' THEN 'Nghiên cứu & Phát triển (R&D)'
               WHEN coalesce(d.department, d.dept, dept.name, '') =~ '(?i).*(kế toán|thu mua|accounting|procurement).*' THEN 'Kế toán & Thu mua'
               WHEN coalesce(d.department, d.dept, dept.name, '') =~ '(?i).*(công nghệ|it|cntt).*' THEN 'Công nghệ thông tin (IT)'
               ELSE 'Pháp chế (Legal)'
             END AS canon
        SET d.department = canon, d.dept = canon
    """)

    # 4. Verification
    print("\n[4] Verification...")
    res = s.run("""
        MATCH (d:Document)
        WHERE d.status IS NULL OR (d.status <> 'MISSING_PENDING_VERIFICATION' AND d.status <> 'DELETED')
        WITH d, d.department as dept
        WITH dept, count(d) as count
        ORDER BY count DESC
        RETURN collect({dept: dept, count: count}) as list, sum(count) as total
    """).single()
    print("Total serving documents in Neo4j:", res["total"])
    for item in res["list"]:
        print(f"  {item['dept']}: {item['count']}")

driver.close()
