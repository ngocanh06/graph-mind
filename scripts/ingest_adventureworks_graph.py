import sys
import os
import time
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.db.neo4j.client import neo4j_client

if not neo4j_client.is_connected and not neo4j_client.connect():
    print("[Error] Could not connect to Neo4j")
    sys.exit(1)

import argparse
parser = argparse.ArgumentParser(description="Ingest AdventureWorks Graph into Neo4j")
parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", "D:/adventureworks"), help="Path to AdventureWorks CSV directory")
args, _ = parser.parse_known_args()
adv_dir = Path(args.data_dir).resolve()

if not adv_dir.exists():
    cache_dir = REPO_ROOT / ".cache_adv_csv"
    cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"[*] Local path '{adv_dir}' not found on host. Checking Docker Central Storage container...")
    try:
        import subprocess
        chk = subprocess.run(["docker", "exec", "aegis_file_watcher", "sh", "-c", "test -f /data/rnd/Production_ProductCategory.csv"], capture_output=True)
        if chk.returncode == 0:
            print(f"[*] Extracting AdventureWorks CSVs from aegis_file_watcher:/data into {cache_dir}...")
            subprocess.run(["docker", "cp", "aegis_file_watcher:/data/sales/.", str(cache_dir)], capture_output=True)
            subprocess.run(["docker", "cp", "aegis_file_watcher:/data/rnd/.", str(cache_dir)], capture_output=True)
            adv_dir = cache_dir
    except Exception as e:
        print(f"[*] Note: Could not auto-extract from container: {e}")

if not adv_dir.exists() or not (adv_dir / "Production_ProductCategory.csv").exists():
    print(f"[Error] AdventureWorks data directory does not exist or missing required CSVs: {adv_dir}")
    print("Please provide the correct directory using --data-dir <path> or setting ADV_DATA_DIR environment variable.")
    print("Or ensure Central Storage is populated first using: python scripts/populate_central_storage.py")
    sys.exit(1)

print("[1/5] Connected to Neo4j. Creating constraints...")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (cat:Category) REQUIRE cat.id IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (s:SubCategory) REQUIRE s.id IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Customer) REQUIRE c.id IS UNIQUE")

# 1. CATEGORIES
print(f"[2/5] Ingesting Categories & Subcategories from {adv_dir}...")
cat_df = pd.read_csv(adv_dir / "Production_ProductCategory.csv", sep=None, engine="python")
cats = []
for _, r in cat_df.iterrows():
    cats.append({
        "id": int(r["ProductCategoryID"]),
        "name": str(r["Name"]).strip()
    })

neo4j_client.run_cypher("""
    UNWIND $cats AS row
    MERGE (cat:Category {id: row.id})
    SET cat.name = row.name,
        cat.title = row.name
""", {"cats": cats})
print(f"  -> Ingested {len(cats)} Categories")

# 2. SUBCATEGORIES
subcat_df = pd.read_csv(adv_dir / "Production_ProductSubcategory.csv", sep=None, engine="python")
subcats = []
for _, r in subcat_df.iterrows():
    subcats.append({
        "id": int(r["ProductSubcategoryID"]),
        "catId": int(r["ProductCategoryID"]),
        "name": str(r["Name"]).strip()
    })

neo4j_client.run_cypher("""
    UNWIND $subcats AS row
    MERGE (s:SubCategory {id: row.id})
    SET s.name = row.name,
        s.title = row.name
    WITH s, row
    MATCH (cat:Category {id: row.catId})
    MERGE (s)-[:PART_OF]->(cat)
""", {"subcats": subcats})
print(f"  -> Ingested {len(subcats)} SubCategories & PART_OF relationships")

# 3. PRODUCTS
print("[3/5] Ingesting Products...")
prod_df = pd.read_csv(adv_dir / "Production_Product.csv", sep=None, engine="python")
prods = []
for _, r in prod_df.iterrows():
    pid = int(r["ProductID"])
    pname = str(r["Name"]).strip()
    pnum = str(r.get("ProductNumber", "")).strip()
    price = float(r.get("ListPrice") or 0)
    cost = float(r.get("StandardCost") or 0)
    color = str(r.get("Color") or "")
    sub_id = int(r["ProductSubcategoryID"]) if pd.notna(r.get("ProductSubcategoryID")) else None

    prods.append({
        "id": pid,
        "name": pname,
        "title": pname,
        "productNumber": pnum,
        "price": price,
        "listPrice": price,
        "standardCost": cost,
        "color": color,
        "subId": sub_id
    })

neo4j_client.run_cypher("""
    UNWIND $prods AS row
    MERGE (p:Product {id: row.id})
    SET p.name = row.name,
        p.title = row.title,
        p.productNumber = row.productNumber,
        p.price = row.price,
        p.listPrice = row.listPrice,
        p.standardCost = row.standardCost,
        p.color = row.color
    WITH p, row
    WHERE row.subId IS NOT NULL
    MATCH (s:SubCategory {id: row.subId})
    MERGE (p)-[:BELONGS_TO]->(s)
""", {"prods": prods})

# Link products to R&D Department
neo4j_client.run_cypher("""
    MATCH (d:Department {name: 'R&D'})
    MATCH (p:Product)
    MERGE (p)-[:BELONGS_TO_DEPT]->(d)
""")
print(f"  -> Ingested {len(prods)} Products with BELONGS_TO & BELONGS_TO_DEPT")

# 4. CUSTOMERS
print("[4/5] Preparing Customers (Stores + Individuals)...")
cust_df = pd.read_csv(adv_dir / "Sales_Customer.csv", sep=None, engine="python")
store_df = pd.read_csv(adv_dir / "Sales_Store.csv", sep=None, engine="python").set_index("BusinessEntityID")["Name"].to_dict()
person_df = pd.read_csv(adv_dir / "Person_Person.csv", sep=None, engine="python")
person_df["FullName"] = person_df["FirstName"].fillna("") + " " + person_df["LastName"].fillna("")
person_dict = person_df.set_index("BusinessEntityID")["FullName"].to_dict()

customers = []
for _, r in cust_df.iterrows():
    cid = int(r["CustomerID"])
    sid = r.get("StoreID")
    pid = r.get("PersonID")
    cname = None
    ctype = "Individual"
    tier = "Khách hàng Trọng điểm (VIP)"

    if pd.notna(sid) and int(sid) in store_df:
        cname = store_df[int(sid)]
        ctype = "Store"
        tier = "Đại lý Doanh nghiệp (Enterprise Partner)"
    elif pd.notna(pid) and int(pid) in person_dict:
        cname = person_dict[int(pid)].strip()

    if not cname:
        cname = f"Customer #{cid}"

    customers.append({
        "id": cid,
        "name": cname,
        "title": cname,
        "accountNumber": str(r.get("AccountNumber", "")),
        "customerType": ctype,
        "tier": tier,
        "territoryId": int(r["TerritoryID"]) if pd.notna(r.get("TerritoryID")) else 0
    })

print(f"  -> Ingesting {len(customers)} Customer nodes in batches of 2,000...")
batch_size = 2000
for i in range(0, len(customers), batch_size):
    batch = customers[i : i + batch_size]
    neo4j_client.run_cypher("""
        UNWIND $batch AS row
        MERGE (c:Customer {id: row.id})
        SET c.name = row.name,
            c.title = row.title,
            c.accountNumber = row.accountNumber,
            c.customerType = row.customerType,
            c.tier = row.tier,
            c.territoryId = row.territoryId
    """, {"batch": batch})
    print(f"     Batch {i // batch_size + 1}/{(len(customers) + batch_size - 1) // batch_size} committed ({len(batch)} nodes)")

# Link Customers to Kinh doanh (Sales) Department
neo4j_client.run_cypher("""
    MATCH (d:Department) WHERE d.name CONTAINS 'Kinh doanh' OR d.name CONTAINS 'Sales'
    WITH d LIMIT 1
    MATCH (c:Customer)
    WHERE c.customerType = 'Store' OR c.id <= 1000
    MERGE (c)-[:BELONGS_TO_DEPT]->(d)
""")
print("  -> Linked Store & Top Customer nodes to Kinh doanh (Sales) Department")

# 5. PURCHASES (Link Top Customer Stores to Products)
print("[5/5] Ingesting purchase relationships between Customers and Products...")
try:
    soh_df = pd.read_csv(adv_dir / "Sales_SalesOrderHeader.csv", sep=None, engine="python", nrows=5000)
    sod_df = pd.read_csv(adv_dir / "Sales_SalesOrderDetail.csv", sep=None, engine="python", nrows=10000)
    
    so_prod = sod_df[["SalesOrderID", "ProductID"]].drop_duplicates()
    merged = soh_df[["SalesOrderID", "CustomerID"]].merge(so_prod, on="SalesOrderID")
    
    purchases = []
    seen_pairs = set()
    for _, row in merged.iterrows():
        pair = (int(row["CustomerID"]), int(row["ProductID"]))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            purchases.append({"cid": pair[0], "pid": pair[1]})
            if len(purchases) >= 3000:
                break
                
    print(f"  -> Linking {len(purchases)} unique Customer-Product PURCHASED pairs...")
    neo4j_client.run_cypher("""
        UNWIND $purchases AS row
        MATCH (c:Customer {id: row.cid})
        MATCH (p:Product {id: row.pid})
        MERGE (c)-[:PURCHASED]->(p)
    """, {"purchases": purchases})
    print("  -> Finished linking PURCHASED relationships")
except Exception as e:
    print(f"  -> Notice on purchases: {e}")

counts = neo4j_client.get_label_counts()
total_nodes = neo4j_client.get_node_count()
total_rels = neo4j_client.get_relationship_count()

print("\n" + "=" * 60)
print(f"INGESTION COMPLETE!")
print(f"Total Neo4j Nodes: {total_nodes:,}")
print(f"Total Neo4j Relationships: {total_rels:,}")
print("Label Breakdown:")
for lbl, cnt in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  - {lbl}: {cnt:,}")
print("=" * 60)
