#!/usr/bin/env python3
"""
Ingest AdventureWorks Orders & Order Details into Neo4j
Target:
- 31,465 SalesOrder nodes
- 31,465 PLACED_ORDER relationships (Customer -> SalesOrder)
- 121,317 CONTAINS_PRODUCT relationships (SalesOrder -> Product)
Idempotent via MERGE and unique constraints.
"""
import sys
import os
import time
import argparse
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

parser = argparse.ArgumentParser(description="Ingest AdventureWorks Orders into Neo4j")
parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", str(REPO_ROOT / ".cache_adv_csv")), help="Path to AdventureWorks CSV directory")
args, _ = parser.parse_known_args()
adv_dir = Path(args.data_dir).resolve()

if not adv_dir.exists() or not (adv_dir / "Sales_SalesOrderHeader.csv").exists():
    fallback_dir = REPO_ROOT / "central_storage_restore" / "sales"
    if fallback_dir.exists() and (fallback_dir / "Sales_SalesOrderHeader.csv").exists():
        adv_dir = fallback_dir
    else:
        print(f"[Error] Could not find Sales_SalesOrderHeader.csv in {adv_dir} or {fallback_dir}")
        sys.exit(1)

print("=" * 65)
print("  ADVENTUREWORKS GRAPH INGESTION: ORDERS & ORDER DETAILS")
print(f"  Source CSV directory: {adv_dir}")
print("=" * 65)

# 1. CONSTRAINTS
print("\n[1/3] Ensuring Neo4j Constraints...")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (o:SalesOrder) REQUIRE o.id IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Customer) REQUIRE c.id IS UNIQUE")
neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE")

# 2. SALES ORDER HEADERS & PLACED_ORDER
header_csv = adv_dir / "Sales_SalesOrderHeader.csv"
print(f"\n[2/3] Reading SalesOrderHeader from {header_csv.name}...")
df_hdr = pd.read_csv(header_csv, sep=None, engine="python")
total_orders = len(df_hdr)
print(f"  -> Total order headers: {total_orders:,}")

orders_batch = []
for _, r in df_hdr.iterrows():
    orders_batch.append({
        "id": int(r["SalesOrderID"]),
        "customerId": int(r["CustomerID"]),
        "orderDate": str(r.get("OrderDate", "")),
        "dueDate": str(r.get("DueDate", "")),
        "shipDate": str(r.get("ShipDate", "")),
        "status": int(r["Status"]) if pd.notna(r.get("Status")) else 1,
        "onlineOrderFlag": int(r["OnlineOrderFlag"]) if pd.notna(r.get("OnlineOrderFlag")) else 0,
        "orderNumber": str(r.get("SalesOrderNumber", "")),
        "totalDue": float(r.get("TotalDue") or 0.0),
        "subTotal": float(r.get("SubTotal") or 0.0),
        "taxAmt": float(r.get("TaxAmt") or 0.0),
        "freight": float(r.get("Freight") or 0.0),
    })

batch_size = 2500
print(f"  -> Ingesting {len(orders_batch):,} SalesOrder nodes & PLACED_ORDER relations (batch size: {batch_size})...")
for i in range(0, len(orders_batch), batch_size):
    chunk = orders_batch[i:i + batch_size]
    neo4j_client.run_cypher("""
        UNWIND $batch AS row
        MERGE (o:SalesOrder {id: row.id})
        SET o.salesOrderId = row.id,
            o.name = 'Order #' + toString(row.id),
            o.title = 'Order #' + toString(row.id),
            o.orderDate = row.orderDate,
            o.dueDate = row.dueDate,
            o.shipDate = row.shipDate,
            o.status = row.status,
            o.onlineOrderFlag = row.onlineOrderFlag,
            o.orderNumber = row.orderNumber,
            o.totalDue = row.totalDue,
            o.subTotal = row.subTotal,
            o.taxAmt = row.taxAmt,
            o.freight = row.freight
        WITH o, row
        MATCH (c:Customer {id: row.customerId})
        MERGE (c)-[:PLACED_ORDER]->(o)
    """, {"batch": chunk})
    print(f"     Batch {i // batch_size + 1}/{(len(orders_batch) + batch_size - 1) // batch_size} committed ({len(chunk)} records)")

# 3. SALES ORDER DETAILS & CONTAINS_PRODUCT
detail_csv = adv_dir / "Sales_SalesOrderDetail.csv"
print(f"\n[3/3] Reading SalesOrderDetail from {detail_csv.name}...")
df_dtl = pd.read_csv(detail_csv, sep=None, engine="python")
total_details = len(df_dtl)
print(f"  -> Total order details: {total_details:,}")

details_batch = []
for _, r in df_dtl.iterrows():
    details_batch.append({
        "orderId": int(r["SalesOrderID"]),
        "detailId": int(r["SalesOrderDetailID"]),
        "productId": int(r["ProductID"]),
        "orderQty": int(r.get("OrderQty") or 1),
        "unitPrice": float(r.get("UnitPrice") or 0.0),
        "discount": float(r.get("UnitPriceDiscount") or 0.0),
        "lineTotal": float(r.get("LineTotal") or 0.0),
        "trackingNumber": str(r.get("CarrierTrackingNumber") or ""),
    })

print(f"  -> Ingesting {len(details_batch):,} CONTAINS_PRODUCT relationships (batch size: {batch_size})...")
for i in range(0, len(details_batch), batch_size):
    chunk = details_batch[i:i + batch_size]
    neo4j_client.run_cypher("""
        UNWIND $batch AS row
        MATCH (o:SalesOrder {id: row.orderId})
        MATCH (p:Product {id: row.productId})
        MERGE (o)-[r:CONTAINS_PRODUCT {detailId: row.detailId}]->(p)
        SET r.orderQty = row.orderQty,
            r.unitPrice = row.unitPrice,
            r.unitPriceDiscount = row.discount,
            r.lineTotal = row.lineTotal,
            r.carrierTrackingNumber = row.trackingNumber
    """, {"batch": chunk})
    if (i // batch_size + 1) % 5 == 0 or (i + batch_size) >= len(details_batch):
        print(f"     Batch {i // batch_size + 1}/{(len(details_batch) + batch_size - 1) // batch_size} committed ({i + len(chunk):,} / {len(details_batch):,})")

# 4. FINAL VERIFICATION
print("\n" + "=" * 65)
print("  VERIFYING INGESTED DATA IN NEO4J")
print("=" * 65)
so_count = neo4j_client.run_cypher("MATCH (o:SalesOrder) RETURN count(o) as cnt")[0]["cnt"]
placed_count = neo4j_client.run_cypher("MATCH (:Customer)-[r:PLACED_ORDER]->(:SalesOrder) RETURN count(r) as cnt")[0]["cnt"]
contains_count = neo4j_client.run_cypher("MATCH (:SalesOrder)-[r:CONTAINS_PRODUCT]->(:Product) RETURN count(r) as cnt")[0]["cnt"]

print(f"  SalesOrder nodes:          {so_count:,} / 31,465  -> {'PASS' if so_count == 31465 else 'FAIL'}")
print(f"  PLACED_ORDER relationships: {placed_count:,} / 31,465  -> {'PASS' if placed_count == 31465 else 'FAIL'}")
print(f"  CONTAINS_PRODUCT rels:     {contains_count:,} / 121,317 -> {'PASS' if contains_count == 121317 else 'FAIL'}")

# Check duplicate SalesOrderID
dup_so = neo4j_client.run_cypher("MATCH (o:SalesOrder) WITH o.id as id, count(*) as c WHERE c > 1 RETURN count(id) as cnt")[0]["cnt"]
dup_placed = neo4j_client.run_cypher("MATCH (c:Customer)-[r:PLACED_ORDER]->(o:SalesOrder) WITH c, o, count(r) as cnt WHERE cnt > 1 RETURN count(*) as c")[0]["c"]
dup_contains = neo4j_client.run_cypher("MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) WITH o, p, r.detailId as d, count(*) as cnt WHERE cnt > 1 RETURN count(*) as c")[0]["c"]

print(f"  Duplicate SalesOrderID:    {dup_so}  -> {'PASS' if dup_so == 0 else 'FAIL'}")
print(f"  Duplicate PLACED_ORDER:    {dup_placed}  -> {'PASS' if dup_placed == 0 else 'FAIL'}")
print(f"  Duplicate CONTAINS_PRODUCT: {dup_contains}  -> {'PASS' if dup_contains == 0 else 'FAIL'}")

print("=" * 65)
if so_count == 31465 and placed_count == 31465 and contains_count == 121317 and dup_so == 0 and dup_placed == 0 and dup_contains == 0:
    print("  [SUCCESS] All AdventureWorks orders successfully ingested with 100% integrity!")
else:
    print("  [WARNING] Verification checks failed!")
