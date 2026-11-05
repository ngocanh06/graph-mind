#!/usr/bin/env python3
"""
Patch SalesOrder nodes in Neo4j with SubTotal, TaxAmt, Freight from Sales_SalesOrderHeader.csv
"""
import os
import sys
import time
from pathlib import Path
import pandas as pd
from neo4j import GraphDatabase

csv_path = Path("sales/Sales_SalesOrderHeader.csv")
if not csv_path.exists():
    print(f"Error: {csv_path} not found")
    sys.exit(1)

print(f"Reading {csv_path}...", flush=True)
df = pd.read_csv(csv_path, usecols=["SalesOrderID", "SubTotal", "TaxAmt", "Freight"])
total_rows = len(df)
print(f"Found {total_rows:,} rows.", flush=True)

batch = []
for _, r in df.iterrows():
    batch.append({
        "id": int(r["SalesOrderID"]),
        "subTotal": float(r["SubTotal"] or 0.0),
        "taxAmt": float(r["TaxAmt"] or 0.0),
        "freight": float(r["Freight"] or 0.0)
    })

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
auth = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password123"))
driver = GraphDatabase.driver(uri, auth=auth)

t0 = time.time()
batch_size = 5000
with driver.session() as s:
    # Ensure index on id as well
    s.run("CREATE INDEX sales_order_id_idx IF NOT EXISTS FOR (o:SalesOrder) ON (o.id)")
    
    for i in range(0, len(batch), batch_size):
        chunk = batch[i:i+batch_size]
        query = """
            UNWIND $batch AS row
            MATCH (o:SalesOrder {SalesOrderID: row.id})
            SET o.subTotal = row.subTotal,
                o.SubTotal = row.subTotal,
                o.taxAmt = row.taxAmt,
                o.TaxAmt = row.taxAmt,
                o.freight = row.freight,
                o.Freight = row.freight
        """
        s.run(query, batch=chunk)
        print(f"Committed {min(i+batch_size, len(batch)):,} / {len(batch):,} records", flush=True)

    print("\nVerifying Neo4j SalesOrder nodes...", flush=True)
    verify_query = """
        MATCH (so:SalesOrder)
        RETURN count(so) as total,
               count(so.SubTotal) as with_subtotal,
               round(sum(so.SubTotal), 2) as total_subtotal,
               round(sum(so.TotalDue), 2) as total_due
    """
    rec = s.run(verify_query).single()
    print("Verification result:", dict(rec), flush=True)

driver.close()
print(f"Finished in {time.time()-t0:.2f}s", flush=True)
