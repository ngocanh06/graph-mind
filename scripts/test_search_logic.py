import sys
import os
import csv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

neo4j_client.connect()
qdrant_client.connect()

def search_contracts(q="", limit=12):
    contracts = []
    seen = set()
    clean_q = (q or "").strip().lower()

    # 1. Search Neo4j Document nodes for CUAD contracts
    cypher = """
        MATCH (d:Document)
        WHERE (d.department CONTAINS 'Legal' OR d.name ENDS WITH '.pdf' OR d.name ENDS WITH '.PDF')
    """
    params = {"limit": limit}
    if clean_q:
        cypher += " AND (toLower(d.name) CONTAINS $q OR toLower(d.id) CONTAINS $q)"
        params["q"] = clean_q
    cypher += """
        OPTIONAL MATCH (comp:Company)-[:PARTY_TO]->(d)
        OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]->(cl:Clause)
        RETURN d.id AS id, d.name AS name, d.department AS dept, d.chunksCount AS chunks,
               d.contractValue AS val, collect(comp.name)[0] AS company,
               collect(cl.snippet)[0] AS snippet, count(cl) AS clause_count
        LIMIT $limit
    """
    records = neo4j_client.run_cypher(cypher, params)
    for r in records:
        cname = r.get("name")
        if cname and cname not in seen:
            seen.add(cname)
            contracts.append({
                "id": r.get("id"),
                "code": r.get("id"),
                "type": "CONTRACT",
                "title": cname.replace(".pdf", "").replace(".PDF", "").replace("_", " "),
                "client": r.get("company") or cname.split("_")[0],
                "dept": "LEGAL",
                "deptName": "Pháp chế (Legal)",
                "value": r.get("val") or "$120,000 USD",
                "numValue": 120000,
                "date": "23/10/2026",
                "status": "VALID",
                "statusText": "Đã lập chỉ mục",
                "snippet": (r.get("snippet") or f"Hợp đồng CUAD chứa {r.get('chunks', 0)} vector chunks")[:280] + "...",
                "sourceDoc": cname,
                "score": 0.95
            })
    return contracts

def search_documents(q="", limit=12):
    documents = []
    seen = set()
    clean_q = (q or "").strip().lower()

    cypher = """
        MATCH (d:Document)
        WHERE (d.name ENDS WITH '.csv' OR d.name ENDS WITH '.CSV' OR d.name ENDS WITH '.xlsx' OR d.name ENDS WITH '.docx')
    """
    params = {"limit": limit}
    if clean_q:
        cypher += " AND (toLower(d.name) CONTAINS $q OR toLower(d.department) CONTAINS $q)"
        params["q"] = clean_q
    cypher += """
        OPTIONAL MATCH (d)-[:BELONGS_TO_DEPT]->(dept:Department)
        RETURN d.id AS id, d.name AS name, d.department AS deptName, d.deptKey AS deptKey,
               d.chunksCount AS chunks, d.storagePath AS storagePath
        LIMIT $limit
    """
    records = neo4j_client.run_cypher(cypher, params)
    for r in records:
        fname = r.get("name")
        if fname and fname not in seen:
            seen.add(fname)
            documents.append({
                "id": r.get("id"),
                "code": r.get("id"),
                "type": "DOCUMENT",
                "title": fname,
                "format": "CSV" if fname.lower().endswith(".csv") else "XLSX",
                "dept": (r.get("deptKey") or "sales").upper(),
                "deptName": r.get("deptName") or "Kinh doanh (Sales)",
                "date": "23/10/2026",
                "size": "Dataset",
                "pages": f"{r.get('chunks', 1)} Chunks",
                "sourceDoc": fname,
                "status": "VALID",
                "statusText": "Đã lập chỉ mục",
                "snippet": f"Bộ dữ liệu {fname} thuộc phòng ban {r.get('deptName')}, lưu trữ tại {r.get('storagePath')}.",
                "score": 0.92
            })
    return documents

def search_customers(q="", limit=12):
    customers = []
    seen = set()
    clean_q = (q or "").strip().lower()

    # Query Companies from CUAD in Neo4j
    cypher = """
        MATCH (c:Company)-[:PARTY_TO]->(d:Document)
        WHERE size(c.name) > 3
    """
    params = {"limit": limit}
    if clean_q:
        cypher += " AND toLower(c.name) CONTAINS $q"
        params["q"] = clean_q
    cypher += """
        RETURN c.name AS name, count(d) AS deal_count, collect(d.name)[0] AS contract_sample
        ORDER BY deal_count DESC
        LIMIT $limit
    """
    records = neo4j_client.run_cypher(cypher, params)
    for idx, r in enumerate(records, start=1):
        cname = r.get("name")
        if cname and cname not in seen:
            seen.add(cname)
            customers.append({
                "id": f"cust-co-{idx}",
                "code": f"CUST-CO-{idx:04d}",
                "type": "CUSTOMER",
                "name": cname,
                "tier": "Doanh nghiệp Chiến lược (Enterprise Tier 1)",
                "revenue": "$1,250,000 USD",
                "orders": f"{r.get('deal_count')} Hợp đồng CUAD",
                "dept": "SALES",
                "deptName": "Kinh doanh (Sales)",
                "contact": f"Hồ sơ ký kết: {r.get('contract_sample')}",
                "status": "VALID",
                "statusText": "Hoạt động",
                "score": 0.95
            })

    # Also load Stores from Sales_Store.csv if more needed
    store_csv = Path("D:/adventureworks/Sales_Store.csv")
    if store_csv.exists() and len(customers) < limit:
        with open(store_csv, encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sname = row.get("Name")
                if not sname or sname in seen:
                    continue
                if clean_q and clean_q not in sname.lower():
                    continue
                seen.add(sname)
                bid = row.get("BusinessEntityID", "0")
                customers.append({
                    "id": f"cust-aw-{bid}",
                    "code": f"CUST-AW-{bid}",
                    "type": "CUSTOMER",
                    "name": sname,
                    "tier": "Đại lý Ủy quyền (Authorized Retailer)",
                    "revenue": "$800,000 USD",
                    "orders": "AdventureWorks Store Account",
                    "dept": "SALES",
                    "deptName": "Kinh doanh (Sales)",
                    "contact": f"Store #{bid}",
                    "status": "VALID",
                    "statusText": "Hoạt động",
                    "score": 0.92
                })
                if len(customers) >= limit:
                    break
    return customers

def search_products(q="", limit=12):
    products = []
    seen = set()
    clean_q = (q or "").strip().lower()

    prod_csv = Path("D:/adventureworks/Production_Product.csv")
    if prod_csv.exists():
        with open(prod_csv, encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pname = row.get("Name")
                pcode = row.get("ProductNumber", "")
                price = float(row.get("ListPrice") or 0)
                if not pname or pname in seen or price <= 0:
                    continue
                if clean_q and clean_q not in pname.lower() and clean_q not in pcode.lower():
                    continue
                seen.add(pname)
                pid = row.get("ProductID", "0")
                products.append({
                    "id": f"prod-{pid}",
                    "code": pcode,
                    "type": "PRODUCT",
                    "name": pname,
                    "desc": f"Sản phẩm {pname} · Mã {pcode} · Tiêu chuẩn chất lượng AdventureWorks ERP.",
                    "dept": "RND",
                    "deptName": "R&D / Vận hành",
                    "badge": "AdventureWorks Catalog",
                    "status": "VALID",
                    "statusText": "Hoạt động",
                    "value": f"${price:,.2f} USD",
                    "numValue": price,
                    "score": 0.94
                })
                if len(products) >= limit:
                    break
    return products

c = search_contracts("", 5)
d = search_documents("", 5)
cu = search_customers("", 5)
p = search_products("", 5)

print(f"Empty Query: Contracts={len(c)}, Documents={len(d)}, Customers={len(cu)}, Products={len(p)}")
for item in c[:2]:
    print("  Contract:", item["title"][:40], item["value"])
for item in d[:2]:
    print("  Document:", item["title"][:40], item["format"])
for item in cu[:2]:
    print("  Customer:", item["name"][:40], item["orders"])
for item in p[:2]:
    print("  Product: ", item["name"][:40], item["value"])
