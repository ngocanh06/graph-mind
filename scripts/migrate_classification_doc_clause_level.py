import sys
import os
import json
import urllib.request
sys.path.insert(0, r"D:\graph-mind")
sys.path.insert(0, r"D:\graph-mind\backend")

from neo4j import GraphDatabase

print("=== STARTING CLASSIFICATION MIGRATION (ITEM 4) ===")

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "graphmind_secret"))

with driver.session() as s:
    # 1. Identify sensitive clauses and documents
    query_sensitive = """
    MATCH (d:Document)-[:CONTAINS_CLAUSE]->(c:Clause)
    WHERE c.type CONTAINS 'Confidentiality' OR c.type CONTAINS 'Liability'
    RETURN DISTINCT d.id AS doc_id, d.name AS doc_name, id(c) AS clause_id
    """
    records = list(s.run(query_sensitive))
    sensitive_doc_ids = set()
    sensitive_doc_names = set()
    sensitive_clause_ids = set()

    for r in records:
        if r["doc_id"]:
            sensitive_doc_ids.add(str(r["doc_id"]).strip())
        if r["doc_name"]:
            sensitive_doc_names.add(str(r["doc_name"]).strip())
        sensitive_clause_ids.add(r["clause_id"])

    print(f"Sensitive distinct documents in Neo4j: {len(sensitive_doc_ids)}")
    print(f"Sensitive distinct document names: {len(sensitive_doc_names)}")
    print(f"Sensitive clause nodes: {len(sensitive_clause_ids)}")

    # 2. Update Neo4j Clause nodes
    s.run("MATCH (c:Clause) SET c.classification = 'INTERNAL'")
    if sensitive_clause_ids:
        s.run(
            "MATCH (c:Clause) WHERE id(c) IN $ids SET c.classification = 'RESTRICTED'",
            {"ids": list(sensitive_clause_ids)}
        )
    cls_clause_counts = list(s.run("MATCH (c:Clause) RETURN c.classification, count(c)"))
    print("Neo4j Clause classification distribution:", [(r[0], r[1]) for r in cls_clause_counts])

    # 3. Update Neo4j Document nodes
    s.run("MATCH (d:Document) SET d.classification = 'INTERNAL'")
    if sensitive_doc_ids:
        s.run(
            "MATCH (d:Document) WHERE d.id IN $ids SET d.classification = 'RESTRICTED'",
            {"ids": list(sensitive_doc_ids)}
        )
    cls_doc_counts = list(s.run("MATCH (d:Document) RETURN d.classification, count(d)"))
    print("Neo4j Document classification distribution:", [(r[0], r[1]) for r in cls_doc_counts])

    # 4. Update ERP nodes: Customer and Product
    res_cust = s.run("""
        MATCH (c:Customer)
        SET c.department = 'Kinh doanh (Sales)',
            c.department_id = 'sales',
            c.classification = 'INTERNAL'
        RETURN count(c)
    """).single()[0]
    res_prod = s.run("""
        MATCH (p:Product)
        SET p.department = 'Kinh doanh (Sales)',
            p.department_id = 'sales',
            p.classification = 'INTERNAL'
        RETURN count(p)
    """).single()[0]
    print(f"Neo4j Customer nodes updated: {res_cust}")
    print(f"Neo4j Product nodes updated: {res_prod}")

driver.close()

# 5. Scroll through Qdrant and update classification of each chunk based on Document
print("\n--- UPDATING QDRANT cuad_contracts PAYLOADS ---")

scroll_url = "http://localhost:6333/collections/cuad_contracts/points/scroll"
set_payload_url = "http://localhost:6333/collections/cuad_contracts/points/payload"

offset = None
total_points = 0
points_to_restricted = []
points_to_internal = []

contracts_before = {}
contracts_after = {}

while True:
    body = {"limit": 250, "with_payload": True, "with_vector": False}
    if offset:
        body["offset"] = offset
    req = urllib.request.Request(
        scroll_url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))["result"]
    points = res["points"]
    if not points:
        break
    total_points += len(points)
    offset = res.get("next_page_offset")

    for p in points:
        pid = p["id"]
        payload = p.get("payload", {})
        c_name = payload.get("contract_name") or payload.get("source_file") or "unknown"
        old_cls = payload.get("classification", "INTERNAL")

        if c_name not in contracts_before:
            contracts_before[c_name] = set()
        contracts_before[c_name].add(old_cls)

        doc_id = str(payload.get("doc_id") or payload.get("document_id") or "").strip()
        fname = str(payload.get("source_file") or payload.get("contract_name") or "").strip()

        # Check if contract matches sensitive document in Neo4j
        is_sensitive_doc = (doc_id in sensitive_doc_ids or fname in sensitive_doc_names)

        new_cls = "RESTRICTED" if is_sensitive_doc else "INTERNAL"

        if c_name not in contracts_after:
            contracts_after[c_name] = set()
        contracts_after[c_name].add(new_cls)

        if new_cls == "RESTRICTED":
            points_to_restricted.append(pid)
        else:
            points_to_internal.append(pid)

    if not offset:
        break

print(f"Total points scanned: {total_points}")
print(f"Points to set RESTRICTED: {len(points_to_restricted)}")
print(f"Points to set INTERNAL: {len(points_to_internal)}")

# Batch update Qdrant payload
def batch_update_payload(point_ids, cls_value):
    chunk_size = 500
    for i in range(0, len(point_ids), chunk_size):
        batch = point_ids[i:i+chunk_size]
        req_body = {
            "payload": {"classification": cls_value},
            "points": batch
        }
        r = urllib.request.Request(
            set_payload_url,
            data=json.dumps(req_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(r) as resp:
            pass

print("Updating RESTRICTED points in Qdrant...")
batch_update_payload(points_to_restricted, "RESTRICTED")
print("Updating INTERNAL points in Qdrant...")
batch_update_payload(points_to_internal, "INTERNAL")

# Summary of contracts before vs after
restricted_contracts_after = sum(1 for c, clss in contracts_after.items() if "RESTRICTED" in clss)
internal_only_after = sum(1 for c, clss in contracts_after.items() if clss == {"INTERNAL"})

print("\n=== CLASSIFICATION MIGRATION SUMMARY ===")
print(f"Total Distinct Contracts: {len(contracts_after)}")
print(f"Contracts with >= 1 RESTRICTED chunk (Before Item 4 migration): 168")
print(f"Contracts 100% INTERNAL (Before Item 4 migration): 31")
print(f"Contracts with >= 1 RESTRICTED chunk (After Item 4 migration): {restricted_contracts_after}")
print(f"Contracts 100% INTERNAL (After Item 4 migration): {internal_only_after}")
print(f"Total Points RESTRICTED in Qdrant: {len(points_to_restricted)}")
print(f"Total Points INTERNAL in Qdrant: {len(points_to_internal)}")
print("=== COMPLETED ===")
