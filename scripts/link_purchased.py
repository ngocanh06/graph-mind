import sys
import pandas as pd
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.neo4j.client import neo4j_client

if not neo4j_client.is_connected and not neo4j_client.connect():
    print("[Error] Could not connect to Neo4j")
    sys.exit(1)

soh = pd.read_csv("sales/Sales_SalesOrderHeader.csv", sep=None, engine="python", nrows=10000)
sod = pd.read_csv("sales/Sales_SalesOrderDetail.csv", sep=None, engine="python", nrows=25000)

so_prod = sod[["SalesOrderID", "ProductID"]].drop_duplicates()
merged = soh[["SalesOrderID", "CustomerID"]].merge(so_prod, on="SalesOrderID")

pairs = merged.drop_duplicates(subset=["CustomerID", "ProductID"])
purchases = [{"cid": int(r["CustomerID"]), "pid": int(r["ProductID"])} for _, r in pairs.head(4354).iterrows()]

print(f"Linking {len(purchases)} unique Customer-Product PURCHASED pairs...")
batch_size = 1000
for i in range(0, len(purchases), batch_size):
    batch = purchases[i:i + batch_size]
    neo4j_client.run_cypher("""
        UNWIND $batch AS row
        MATCH (c:Customer) WHERE c.CustomerID = row.cid OR c.id = row.cid
        MATCH (p:Product) WHERE p.ProductID = row.pid OR p.id = row.pid
        MERGE (c)-[:PURCHASED]->(p)
    """, {"batch": batch})

cnt = neo4j_client.run_cypher("MATCH ()-[r:PURCHASED]->() RETURN count(r) as cnt")[0]["cnt"]
print(f"Done! Total PURCHASED relationships: {cnt:,}")

# Link SubCategories to Categories
df_sub = pd.read_csv("rnd/Production_ProductSubcategory.csv", sep=None, engine="python")
subs = [{"id": int(r["ProductSubcategoryID"]), "catId": int(r["ProductCategoryID"])} for _, r in df_sub.iterrows()]
neo4j_client.run_cypher("""
    UNWIND $batch AS row
    MATCH (s:SubCategory) WHERE s.id = row.id or s.SubCategoryID = row.id
    MATCH (c:Category) WHERE c.id = row.catId or c.CategoryID = row.catId
    MERGE (s)-[:PART_OF]->(c)
""", {"batch": subs})

# Link Products to SubCategories
df_prod = pd.read_csv("rnd/Production_Product.csv", sep=None, engine="python")
prods = [{"pid": int(r["ProductID"]), "subId": int(r["ProductSubcategoryID"])} for _, r in df_prod[df_prod["ProductSubcategoryID"].notna()].iterrows()]
neo4j_client.run_cypher("""
    UNWIND $batch AS row
    MATCH (p:Product) WHERE p.id = row.pid or p.ProductID = row.pid
    MATCH (s:SubCategory) WHERE s.id = row.subId or s.SubCategoryID = row.subId
    MERGE (p)-[:BELONGS_TO]->(s)
""", {"batch": prods})

belongs_cnt = neo4j_client.run_cypher("MATCH ()-[r:BELONGS_TO]->() RETURN count(r) as cnt")[0]["cnt"]
print(f"Done! Total BELONGS_TO relationships: {belongs_cnt:,}")

