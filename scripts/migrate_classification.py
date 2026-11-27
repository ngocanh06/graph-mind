import json
import urllib.request
import re
from collections import Counter
from neo4j import GraphDatabase

# Qdrant Config
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "cuad_contracts"

# Sensitive Keywords for RESTRICTED classification
SENSITIVE_PATTERNS = [
    re.compile(r"uncapped\s+liability", re.IGNORECASE),
    re.compile(r"unlimited\s+liability", re.IGNORECASE),
    re.compile(r"non[\s-]compete", re.IGNORECASE),
    re.compile(r"non[\s-]competition", re.IGNORECASE),
    re.compile(r"indemnif(?:y|ication|ied)", re.IGNORECASE),
    re.compile(r"bồi\s+thường\s+vô\s+hạn", re.IGNORECASE),
    re.compile(r"trách\s+nhiệm\s+vô\s+hạn", re.IGNORECASE),
    re.compile(r"exclusivity", re.IGNORECASE),
    re.compile(r"trade\s+secret", re.IGNORECASE),
    re.compile(r"bí\s+mật\s+kinh\s+doanh", re.IGNORECASE),
    re.compile(r"change\s+of\s+control", re.IGNORECASE),
    re.compile(r"bồi\s+thường\s+&\s+phạt", re.IGNORECASE),
    re.compile(r"điều\s+khoản\s+bảo\s+mật", re.IGNORECASE),
    re.compile(r"bảo\s+mật\s+thông\s+tin", re.IGNORECASE),
    re.compile(r"confidentiality", re.IGNORECASE),
    re.compile(r"liability", re.IGNORECASE),
]

def is_sensitive(text: str) -> bool:
    if not text:
        return False
    return any(p.search(text) for p in SENSITIVE_PATTERNS)

def run():
    print("=== Step 2B.4 Data Classification Migration ===")
    
    # 1. Qdrant Migration
    print(f"\n--- 1. Inspecting & Migrating Qdrant '{COLLECTION_NAME}' ---")
    next_page_offset = None
    all_points = []
    
    while True:
        scroll_payload = {
            "limit": 500,
            "with_payload": True,
            "with_vector": False
        }
        if next_page_offset is not None:
            scroll_payload["offset"] = next_page_offset
            
        req = urllib.request.Request(
            f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections/{COLLECTION_NAME}/points/scroll",
            data=json.dumps(scroll_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            result = data.get("result", {})
            points = result.get("points", [])
            all_points.extend(points)
            next_page_offset = result.get("next_page_offset")
            if not next_page_offset or not points:
                break

    print(f"Total points retrieved from Qdrant: {len(all_points)}")
    
    qdrant_counts = Counter()
    points_to_update = []
    
    for pt in all_points:
        p_id = pt["id"]
        payload = pt.get("payload") or {}
        dept = payload.get("department") or "Pháp chế (Legal)"
        text_content = payload.get("text") or ""
        
        if is_sensitive(text_content):
            classification = "RESTRICTED"
        else:
            classification = "INTERNAL"
            
        qdrant_counts[(dept, classification)] += 1
        points_to_update.append((p_id, classification))
        
    # Batch update Qdrant points with classification payload
    print(f"Applying payload updates to {len(points_to_update)} points in batches...")
    batch_size = 200
    for i in range(0, len(points_to_update), batch_size):
        chunk = points_to_update[i:i+batch_size]
        # Set payload by ID
        # Group by classification to update in bulk
        restricted_ids = [cid for cid, cls in chunk if cls == "RESTRICTED"]
        internal_ids = [cid for cid, cls in chunk if cls == "INTERNAL"]
        
        for cls_name, ids in [("RESTRICTED", restricted_ids), ("INTERNAL", internal_ids)]:
            if not ids:
                continue
            update_payload = {
                "payload": {"classification": cls_name},
                "points": ids
            }
            req = urllib.request.Request(
                f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections/{COLLECTION_NAME}/points/payload",
                data=json.dumps(update_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req) as resp:
                pass
                
    print("\nQdrant Points Breakdown by (Department, Classification):")
    for (dept, cls), count in sorted(qdrant_counts.items()):
        print(f"  [{dept}] - [{cls}]: {count} points")

    # 2. Neo4j Migration
    print("\n--- 2. Inspecting & Migrating Neo4j Nodes ---")
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
    from app.db.neo4j.client import neo4j_client

    if not neo4j_client.connect():
        print("[Neo4j] Could not connect to Neo4j instance.")
        return

    # A. Label Document nodes
    neo4j_client.run_cypher("""
        MATCH (d:Document)
        SET d.classification = 'INTERNAL'
    """)
    
    # B. Label Clause nodes: sensitive clauses get RESTRICTED, others INTERNAL
    neo4j_client.run_cypher("""
        MATCH (d:Document)-[:CONTAINS_CLAUSE]->(c:Clause)
        WHERE c.department IS NULL
        SET c.department = d.department
    """)
    clauses = neo4j_client.run_cypher("""
        MATCH (c:Clause)
        RETURN c.id as id, coalesce(c.name, '') as name, coalesce(c.type, '') as type, coalesce(c.title, '') as title, coalesce(c.department, 'Pháp chế (Legal)') as dept
    """)
    
    neo4j_counts = Counter()
    for rec in clauses:
        c_id = rec["id"]
        c_name = rec["name"]
        c_type = rec["type"]
        c_title = rec["title"]
        c_dept = rec["dept"]
        
        combined_meta = f"{c_name} {c_type} {c_title}"
        if is_sensitive(combined_meta):
            classification = "RESTRICTED"
        else:
            classification = "INTERNAL"
        neo4j_client.run_cypher("""
            MATCH (c:Clause {id: $id})
            SET c.classification = $classification,
                c.department = coalesce(c.department, $dept)
        """, {"id": c_id, "classification": classification, "dept": c_dept})
        neo4j_counts[(c_dept, classification)] += 1
        
    # Count Document nodes by dept & classification
    doc_res = neo4j_client.run_cypher("""
        MATCH (d:Document)
        RETURN coalesce(d.department, 'Pháp chế (Legal)') as dept, d.classification as cls, count(d) as cnt
    """)
    for d_rec in doc_res:
        neo4j_counts[(d_rec["dept"], d_rec["cls"])] += d_rec["cnt"]

    print("\nNeo4j Nodes Breakdown by (Department, Classification):")
    for (dept, cls), count in sorted(neo4j_counts.items()):
        print(f"  [{dept}] - [{cls}]: {count} nodes")

if __name__ == "__main__":
    run()
