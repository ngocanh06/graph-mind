import sys
from pathlib import Path
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.neo4j.client import neo4j_client

neo4j_client.connect()

df = pd.read_csv("D:/adventureworks/Sales_SalesOrderDetail.csv", sep=None, engine="python")
csv_sum_lt = df["LineTotal"].sum()
csv_sum_qty = df["OrderQty"].sum()
csv_rows = len(df)
csv_unique_sod = df["SalesOrderDetailID"].nunique()

neo_res = neo4j_client.run_cypher("""
    MATCH ()-[r:CONTAINS_PRODUCT]->()
    RETURN count(r) as total_rels,
           sum(r.LineTotal) as sum_lt,
           sum(r.OrderQty) as sum_qty
""")

neo_rows = neo_res[0]["total_rels"]
neo_sum_lt = neo_res[0]["sum_lt"]
neo_sum_qty = neo_res[0]["sum_qty"]

print(f"SalesOrderDetail Count: CSV={csv_rows:,} vs Neo4j={neo_rows:,} -> {'MATCH' if csv_rows == neo_rows else 'MISMATCH'}")
print(f"Unique SalesOrderDetailID in CSV: {csv_unique_sod:,} / {csv_rows:,}")
print(f"Total OrderQty Sum:     CSV={csv_sum_qty:,} vs Neo4j={neo_sum_qty:,} -> {'MATCH' if csv_sum_qty == neo_sum_qty else 'MISMATCH'}")
print(f"Total LineTotal Sum:    CSV=${csv_sum_lt:,.2f} vs Neo4j=${neo_sum_lt:,.2f} -> {'MATCH' if round(csv_sum_lt, 2) == round(neo_sum_lt, 2) else 'MISMATCH'}")
