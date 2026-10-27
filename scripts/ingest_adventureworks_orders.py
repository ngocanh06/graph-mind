#!/usr/bin/env python3
"""
GraphMind / AEGIS — AdventureWorks SalesOrder & Details Ingestion
Module: scripts/ingest_adventureworks_orders.py

Ingests full SalesOrderHeader and SalesOrderDetail into Neo4j with 100% data fidelity:
- Nodes: (:SalesOrder {SalesOrderID, OrderDate, DueDate, ShipDate, Status, OnlineOrderFlag,
                       SalesOrderNumber, PurchaseOrderNumber, AccountNumber, CustomerID,
                       SubTotal, TaxAmt, Freight, TotalDue, Year})
- Relationships:
  (:Customer {id: CustomerID})-[:PLACED_ORDER]->(:SalesOrder)
  (:SalesOrder)-[:CONTAINS_PRODUCT {SalesOrderDetailID, OrderQty, UnitPrice, UnitPriceDiscount, LineTotal, CarrierTrackingNumber}]->(:Product {id: ProductID})

Idempotent: Uses MERGE to guarantee safe re-runs without duplication.
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


def run_ingestion(data_dir: Path, batch_size: int = 5000):
    start_time = time.time()
    header_path = data_dir / "Sales_SalesOrderHeader.csv"
    detail_path = data_dir / "Sales_SalesOrderDetail.csv"

    if not header_path.exists() or not detail_path.exists():
        print(f"[Error] Missing CSV files in {data_dir}. Expected Sales_SalesOrderHeader.csv and Sales_SalesOrderDetail.csv")
        sys.exit(1)

    print("=" * 70)
    print(" GRAPHMIND — INGEST ADVENTUREWORKS SALES ORDERS & DETAILS INTO NEO4J")
    print("=" * 70)
    print(f"Data Directory: {data_dir}")
    print(f"Batch Size:     {batch_size:,}")

    if not neo4j_client.is_connected and not neo4j_client.connect():
        print("[Error] Could not connect to Neo4j. Check docker-compose and credentials.")
        sys.exit(1)

    # 1. Constraints
    print("\n[1/4] Ensuring Neo4j Constraints and Indexes...")
    neo4j_client.run_cypher("CREATE CONSTRAINT IF NOT EXISTS FOR (o:SalesOrder) REQUIRE o.SalesOrderID IS UNIQUE")
    neo4j_client.run_cypher("CREATE INDEX IF NOT EXISTS FOR (o:SalesOrder) ON (o.Year)")
    neo4j_client.run_cypher("CREATE INDEX IF NOT EXISTS FOR (o:SalesOrder) ON (o.CustomerID)")

    # 2. Ingest SalesOrder Nodes
    print("\n[2/4] Reading Sales_SalesOrderHeader.csv and ingesting SalesOrder nodes...")
    header_df = pd.read_csv(header_path, sep=None, engine="python")
    total_headers = len(header_df)
    print(f"  -> Discovered {total_headers:,} orders in CSV.")

    orders_data = []
    for _, r in header_df.iterrows():
        so_id = int(r["SalesOrderID"])
        order_date = str(r["OrderDate"]).strip()
        due_date = str(r.get("DueDate", "")).strip() if pd.notna(r.get("DueDate")) else ""
        ship_date = str(r.get("ShipDate", "")).strip() if pd.notna(r.get("ShipDate")) else ""
        status = int(r.get("Status", 1)) if pd.notna(r.get("Status")) else 1
        online_flag = bool(r.get("OnlineOrderFlag", False))
        so_num = str(r.get("SalesOrderNumber", "")).strip()
        po_num = str(r.get("PurchaseOrderNumber", "")).strip() if pd.notna(r.get("PurchaseOrderNumber")) else ""
        acc_num = str(r.get("AccountNumber", "")).strip() if pd.notna(r.get("AccountNumber")) else ""
        cust_id = int(r["CustomerID"])
        subtotal = float(r.get("SubTotal", 0.0))
        tax_amt = float(r.get("TaxAmt", 0.0))
        freight = float(r.get("Freight", 0.0))
        total_due = float(r.get("TotalDue", 0.0))
        year = int(order_date[:4]) if len(order_date) >= 4 and order_date[:4].isdigit() else 0

        orders_data.append({
            "id": so_id,
            "SalesOrderID": so_id,
            "name": f"Đơn hàng #{so_id}",
            "title": f"Order #{so_id}",
            "orderDate": order_date,
            "dueDate": due_date,
            "shipDate": ship_date,
            "status": status,
            "onlineOrderFlag": online_flag,
            "salesOrderNumber": so_num,
            "purchaseOrderNumber": po_num,
            "accountNumber": acc_num,
            "customerId": cust_id,
            "subTotal": subtotal,
            "taxAmt": tax_amt,
            "freight": freight,
            "totalDue": total_due,
            "year": year
        })

    # Batch upsert SalesOrder nodes
    num_order_batches = (len(orders_data) + batch_size - 1) // batch_size
    for b_idx in range(num_order_batches):
        batch = orders_data[b_idx * batch_size : (b_idx + 1) * batch_size]
        neo4j_client.run_cypher("""
            UNWIND $batch AS row
            MERGE (o:SalesOrder {SalesOrderID: row.SalesOrderID})
            SET o.id = row.id,
                o.name = row.name,
                o.title = row.title,
                o.OrderDate = row.orderDate,
                o.orderDate = row.orderDate,
                o.DueDate = row.dueDate,
                o.ShipDate = row.shipDate,
                o.Status = row.status,
                o.OnlineOrderFlag = row.onlineOrderFlag,
                o.SalesOrderNumber = row.salesOrderNumber,
                o.PurchaseOrderNumber = row.purchaseOrderNumber,
                o.AccountNumber = row.accountNumber,
                o.CustomerID = row.customerId,
                o.customerId = row.customerId,
                o.SubTotal = row.subTotal,
                o.subTotal = row.subTotal,
                o.TaxAmt = row.taxAmt,
                o.Freight = row.freight,
                o.TotalDue = row.totalDue,
                o.totalDue = row.totalDue,
                o.Year = row.year,
                o.year = row.year
        """, {"batch": batch})
        print(f"  -> Committed SalesOrder nodes batch {b_idx + 1}/{num_order_batches} ({len(batch):,} nodes)")

    # 3. Create PLACED_ORDER relationships: (Customer)-[:PLACED_ORDER]->(SalesOrder)
    print("\n[3/4] Linking Customers to SalesOrders (PLACED_ORDER)...")
    for b_idx in range(num_order_batches):
        batch = orders_data[b_idx * batch_size : (b_idx + 1) * batch_size]
        neo4j_client.run_cypher("""
            UNWIND $batch AS row
            MATCH (c:Customer {id: row.customerId})
            MATCH (o:SalesOrder {SalesOrderID: row.SalesOrderID})
            MERGE (c)-[:PLACED_ORDER]->(o)
        """, {"batch": batch})
        print(f"  -> Linked PLACED_ORDER batch {b_idx + 1}/{num_order_batches} ({len(batch):,} links)")

    # 4. Ingest SalesOrderDetail & Link to Products: (SalesOrder)-[:CONTAINS_PRODUCT]->(Product)
    print("\n[4/4] Reading Sales_SalesOrderDetail.csv and linking to Products (CONTAINS_PRODUCT)...")
    detail_df = pd.read_csv(detail_path, sep=None, engine="python")
    total_details = len(detail_df)
    print(f"  -> Discovered {total_details:,} detail line items in CSV.")

    details_data = []
    for _, r in detail_df.iterrows():
        so_id = int(r["SalesOrderID"])
        sod_id = int(r["SalesOrderDetailID"])
        pid = int(r["ProductID"])
        qty = int(r["OrderQty"])
        uprice = float(r["UnitPrice"])
        discount = float(r.get("UnitPriceDiscount", 0.0))
        linetotal = float(r["LineTotal"])
        tracking = str(r.get("CarrierTrackingNumber", "")).strip() if pd.notna(r.get("CarrierTrackingNumber")) else ""

        details_data.append({
            "soId": so_id,
            "sodId": sod_id,
            "pId": pid,
            "qty": qty,
            "unitPrice": uprice,
            "discount": discount,
            "lineTotal": linetotal,
            "tracking": tracking
        })

    num_detail_batches = (len(details_data) + batch_size - 1) // batch_size
    for b_idx in range(num_detail_batches):
        batch = details_data[b_idx * batch_size : (b_idx + 1) * batch_size]
        neo4j_client.run_cypher("""
            UNWIND $batch AS row
            MATCH (o:SalesOrder {SalesOrderID: row.soId})
            MATCH (p:Product {id: row.pId})
            MERGE (o)-[r:CONTAINS_PRODUCT {SalesOrderDetailID: row.sodId}]->(p)
            SET r.SalesOrderDetailID = row.sodId,
                r.OrderQty = row.qty,
                r.UnitPrice = row.unitPrice,
                r.UnitPriceDiscount = row.discount,
                r.LineTotal = row.lineTotal,
                r.CarrierTrackingNumber = row.tracking
        """, {"batch": batch})
        print(f"  -> Linked CONTAINS_PRODUCT batch {b_idx + 1}/{num_detail_batches} ({len(batch):,} links)")

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 70)
    print(f"INGESTION COMPLETE IN {elapsed}s!")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest AdventureWorks Sales Orders into Neo4j")
    parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", "D:/adventureworks"), help="Path to AdventureWorks CSV directory")
    parser.add_argument("--batch-size", type=int, default=5000, help="Batch size for Neo4j UNWIND commits")
    args = parser.parse_args()

    run_ingestion(Path(args.data_dir).resolve(), batch_size=args.batch_size)
