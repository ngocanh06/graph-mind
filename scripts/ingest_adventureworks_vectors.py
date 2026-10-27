#!/usr/bin/env python3
"""
Ingest AdventureWorks Record-Level Entities into Qdrant Vector DB
Collection: adventureworks_entities
Vector size: 384 (all-MiniLM-L6-v2)
Distance: Cosine

Target Entities:
- 504 Product
- 104 Vendor
- 701 Store
- 19,820 Customer
- 5,000 SalesOrder (Representative / Top Value Orders)
Total: 26,129 vectors
"""
import sys
import os
import time
import uuid
import argparse
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

parser = argparse.ArgumentParser(description="Ingest AdventureWorks record-level vectors into Qdrant")
parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", str(REPO_ROOT / ".cache_adv_csv")), help="Path to AdventureWorks CSV directory")
parser.add_argument("--qdrant-host", default=os.getenv("QDRANT_HOST", "localhost"), help="Qdrant host")
parser.add_argument("--qdrant-port", type=int, default=int(os.getenv("QDRANT_PORT", 6333)), help="Qdrant port")
parser.add_argument("--collection", default="adventureworks_entities", help="Collection name")
args, _ = parser.parse_known_args()

adv_dir = Path(args.data_dir).resolve()
if not adv_dir.exists() or not (adv_dir / "Production_Product.csv").exists():
    fallback_dir = REPO_ROOT / "central_storage_restore"
    adv_d_dir = Path("D:/adventureworks")
    if fallback_dir.exists() and (fallback_dir / "Production_Product.csv").exists():
        adv_dir = fallback_dir
    elif adv_d_dir.exists() and (adv_d_dir / "Production_Product.csv").exists():
        adv_dir = adv_d_dir

print("=" * 65)
print("  ADVENTUREWORKS RECORD-LEVEL VECTOR INGESTION (QDRANT)")
print(f"  Target Collection: {args.collection}")
print(f"  Qdrant Host:       {args.qdrant_host}:{args.qdrant_port}")
print(f"  Source CSV Dir:    {adv_dir}")
print("=" * 65)

# 1. Connect to Qdrant & ensure collection
client = QdrantClient(host=args.qdrant_host, port=args.qdrant_port, timeout=30)
col_name = args.collection

existing_cols = [c.name for c in client.get_collections().collections]
if col_name in existing_cols:
    print(f"[*] Recreating clean collection '{col_name}'...")
    client.delete_collection(col_name)

client.create_collection(
    collection_name=col_name,
    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
)
print(f"[✓] Collection '{col_name}' created (dim: 384, metric: Cosine)")

# 2. Load Embedding Model
print("[*] Loading SentenceTransformer 'all-MiniLM-L6-v2'...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Helper to find file in adv_dir or subfolders
def get_csv_path(filename: str) -> Path:
    direct = adv_dir / filename
    if direct.exists():
        return direct
    matches = list(adv_dir.rglob(filename))
    if matches:
        return matches[0]
    raise FileNotFoundError(f"Could not find {filename} in {adv_dir}")

# 3. Collect Entity Records
records = []  # list of dicts: id, text, payload

# 3.1 PRODUCTS (504)
print("\n[1/5] Processing Products...")
prod_df = pd.read_csv(get_csv_path("Production_Product.csv"), sep=None, engine="python")
for _, r in prod_df.iterrows():
    pid = int(r["ProductID"])
    pname = str(r["Name"]).strip()
    pnum = str(r.get("ProductNumber", "")).strip()
    color = str(r.get("Color") or "N/A").strip()
    price = float(r.get("ListPrice") or 0.0)
    cost = float(r.get("StandardCost") or 0.0)
    text = f"Product: {pname} | Number: {pnum} | Color: {color} | List Price: ${price:,.2f} | Standard Cost: ${cost:,.2f}"
    
    uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"product_{pid}"))
    records.append({
        "id": uid,
        "text": text,
        "payload": {
            "entity_type": "Product",
            "type": "Product",
            "entity_id": pid,
            "product_id": pid,
            "name": pname,
            "title": pname,
            "product_number": pnum,
            "color": color,
            "list_price": price,
            "standard_cost": cost,
            "text": text,
            "source": "AdventureWorks Production_Product"
        }
    })
print(f"  -> Prepared {len(prod_df)} Product records")

# 3.2 VENDORS (104)
print("\n[2/5] Processing Vendors...")
vend_df = pd.read_csv(get_csv_path("Purchasing_Vendor.csv"), sep=None, engine="python")
for _, r in vend_df.iterrows():
    vid = int(r["BusinessEntityID"])
    vname = str(r["Name"]).strip()
    acc = str(r.get("AccountNumber", "")).strip()
    credit = int(r.get("CreditRating") or 1)
    pref = int(r.get("PreferredVendorStatus") or 0)
    text = f"Vendor: {vname} | Account: {acc} | Credit Rating: {credit} | Preferred: {'Yes' if pref else 'No'}"
    
    uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"vendor_{vid}"))
    records.append({
        "id": uid,
        "text": text,
        "payload": {
            "entity_type": "Vendor",
            "type": "Vendor",
            "entity_id": vid,
            "vendor_id": vid,
            "name": vname,
            "title": vname,
            "account_number": acc,
            "credit_rating": credit,
            "preferred_vendor": pref,
            "text": text,
            "source": "AdventureWorks Purchasing_Vendor"
        }
    })
print(f"  -> Prepared {len(vend_df)} Vendor records")

# 3.3 STORES (701)
print("\n[3/5] Processing Stores...")
store_df = pd.read_csv(get_csv_path("Sales_Store.csv"), sep=None, engine="python")
for _, r in store_df.iterrows():
    sid = int(r["BusinessEntityID"])
    sname = str(r["Name"]).strip()
    sp_id = int(r["SalesPersonID"]) if pd.notna(r.get("SalesPersonID")) else None
    text = f"Store: {sname} | Business ID: {sid} | Sales Person ID: {sp_id or 'N/A'}"
    
    uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"store_{sid}"))
    records.append({
        "id": uid,
        "text": text,
        "payload": {
            "entity_type": "Store",
            "type": "Store",
            "entity_id": sid,
            "store_id": sid,
            "name": sname,
            "title": sname,
            "sales_person_id": sp_id,
            "text": text,
            "source": "AdventureWorks Sales_Store"
        }
    })
print(f"  -> Prepared {len(store_df)} Store records")

# 3.4 CUSTOMERS (19,820)
print("\n[4/5] Processing Customers...")
cust_df = pd.read_csv(get_csv_path("Sales_Customer.csv"), sep=None, engine="python")
store_dict = store_df.set_index("BusinessEntityID")["Name"].to_dict()

person_df = pd.read_csv(get_csv_path("Person_Person.csv"), sep=None, engine="python")
person_df["FullName"] = person_df["FirstName"].fillna("") + " " + person_df["LastName"].fillna("")
person_dict = person_df.set_index("BusinessEntityID")["FullName"].to_dict()

for _, r in cust_df.iterrows():
    cid = int(r["CustomerID"])
    sid = r.get("StoreID")
    pid = r.get("PersonID")
    acc = str(r.get("AccountNumber", "")).strip()
    tid = int(r["TerritoryID"]) if pd.notna(r.get("TerritoryID")) else 0
    
    cname = None
    ctype = "Individual"
    tier = "Khách hàng Cá nhân"
    
    if pd.notna(sid) and int(sid) in store_dict:
        cname = store_dict[int(sid)]
        ctype = "Store"
        tier = "Đại lý Doanh nghiệp"
    elif pd.notna(pid) and int(pid) in person_dict:
        cname = person_dict[int(pid)].strip()
    
    if not cname:
        cname = f"Customer #{cid}"
        
    text = f"Customer: {cname} | ID: {cid} | Account: {acc} | Type: {ctype} | Territory: {tid}"
    uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"customer_{cid}"))
    records.append({
        "id": uid,
        "text": text,
        "payload": {
            "entity_type": "Customer",
            "type": "Customer",
            "entity_id": cid,
            "customer_id": cid,
            "name": cname,
            "title": cname,
            "account_number": acc,
            "customer_type": ctype,
            "tier": tier,
            "territory_id": tid,
            "text": text,
            "source": "AdventureWorks Sales_Customer"
        }
    })
print(f"  -> Prepared {len(cust_df)} Customer records")

# 3.5 SALES ORDERS (Top 5,000 Representative / High-Value Orders)
print("\n[5/5] Processing Top 5,000 Sales Orders (Representative Selection)...")
so_df = pd.read_csv(get_csv_path("Sales_SalesOrderHeader.csv"), sep=None, engine="python")
# Sort by TotalDue descending to pick top 5,000 high value orders
top_so_df = so_df.sort_values(by="TotalDue", ascending=False).head(5000)

for _, r in top_so_df.iterrows():
    so_id = int(r["SalesOrderID"])
    cid = int(r["CustomerID"])
    odate = str(r.get("OrderDate", "")).split()[0]
    total = float(r.get("TotalDue") or 0.0)
    sub = float(r.get("SubTotal") or 0.0)
    tax = float(r.get("TaxAmt") or 0.0)
    status = int(r.get("Status") or 1)
    onum = str(r.get("SalesOrderNumber", "")).strip()
    
    text = f"Sales Order #{so_id} ({onum}) | Customer ID: {cid} | Date: {odate} | Total Due: ${total:,.2f} | SubTotal: ${sub:,.2f} | Status: {status}"
    uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"order_{so_id}"))
    records.append({
        "id": uid,
        "text": text,
        "payload": {
            "entity_type": "SalesOrder",
            "type": "SalesOrder",
            "entity_id": so_id,
            "order_id": so_id,
            "sales_order_id": so_id,
            "customer_id": cid,
            "order_date": odate,
            "total_due": total,
            "sub_total": sub,
            "tax_amt": tax,
            "status": status,
            "order_number": onum,
            "text": text,
            "source": "AdventureWorks Sales_SalesOrderHeader"
        }
    })
print(f"  -> Prepared {len(top_so_df)} SalesOrder records")

total_expected = 504 + 104 + 701 + 19820 + 5000
print("\n" + "=" * 65)
print(f"TOTAL PREPARED RECORDS: {len(records):,} / Expected: {total_expected:,}")
print("=" * 65)
assert len(records) == 26129, f"Expected 26,129 records, got {len(records)}"

# 4. Vectorize & Batch Upsert to Qdrant
print("\n[*] Encoding texts and upserting into Qdrant in batches of 500...")
batch_size = 500
t0 = time.time()

for i in range(0, len(records), batch_size):
    batch = records[i:i + batch_size]
    texts = [r["text"] for r in batch]
    embeddings = model.encode(texts, batch_size=256, show_progress_bar=False).tolist()
    
    points = [
        models.PointStruct(
            id=batch[j]["id"],
            vector=embeddings[j],
            payload=batch[j]["payload"]
        )
        for j in range(len(batch))
    ]
    
    client.upsert(collection_name=col_name, points=points)
    if (i // batch_size + 1) % 5 == 0 or (i + batch_size) >= len(records):
        print(f"  -> Upserted {min(i + batch_size, len(records)):,} / {len(records):,} vectors ({time.time() - t0:.1f}s)")

# 5. Verification & Breakdown
print("\n" + "=" * 65)
print("  VERIFYING ADVENTUREWORKS ENTITIES IN QDRANT")
print("=" * 65)
info = client.get_collection(col_name)
total_points = info.points_count

print(f"  Collection Name:      {col_name}")
print(f"  Total Vectors Count:  {total_points:,} / 26,129  -> {'PASS' if total_points == 26129 else 'FAIL'}")

# Count by entity_type using scroll or filter
type_counts = {"Product": 0, "Vendor": 0, "Store": 0, "Customer": 0, "SalesOrder": 0}
for et in type_counts.keys():
    cnt = client.count(
        collection_name=col_name,
        count_filter=models.Filter(
            must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value=et))]
        )
    ).count
    type_counts[et] = cnt

print(f"  - Product:     {type_counts['Product']:,} / 504    -> {'PASS' if type_counts['Product'] == 504 else 'FAIL'}")
print(f"  - Vendor:      {type_counts['Vendor']:,} / 104    -> {'PASS' if type_counts['Vendor'] == 104 else 'FAIL'}")
print(f"  - Store:       {type_counts['Store']:,} / 701    -> {'PASS' if type_counts['Store'] == 701 else 'FAIL'}")
print(f"  - Customer:    {type_counts['Customer']:,} / 19,820 -> {'PASS' if type_counts['Customer'] == 19820 else 'FAIL'}")
print(f"  - SalesOrder:  {type_counts['SalesOrder']:,} / 5,000  -> {'PASS' if type_counts['SalesOrder'] == 5000 else 'FAIL'}")
print("=" * 65)

if total_points == 26129 and all(type_counts[k] == v for k, v in [("Product", 504), ("Vendor", 104), ("Store", 701), ("Customer", 19820), ("SalesOrder", 5000)]):
    print("  [SUCCESS] All AdventureWorks vectors ingested with 100% accuracy!")
else:
    print("  [WARNING] Vector count discrepancy detected!")
