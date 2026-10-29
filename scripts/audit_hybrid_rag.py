import sys
import os
from pathlib import Path
import json
from collections import Counter, defaultdict

# Ensure backend in pythonpath
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import pandas as pd
from app.db.qdrant.client import qdrant_client
from app.db.neo4j.client import neo4j_client

print("=" * 80)
print("AUDIT SCRIPT: HYBRID GRAPHRAG VERIFICATION")
print("=" * 80)

# Connect to DBs
qdrant_client.connect()
neo4j_client.connect()

qc = qdrant_client._client

# ----------------------------------------------------------------------
# 1. INSPECT QDRANT COLLECTIONS
# ----------------------------------------------------------------------
collections = [c.name for c in qc.get_collections().collections]
print(f"\n[1] QDRANT COLLECTIONS FOUND: {collections}")
for col in collections:
    info = qc.get_collection(col)
    print(f"  - Collection '{col}': points_count = {info.points_count:,}")

# ----------------------------------------------------------------------
# 2. AUDIT 'cuad_contracts' (ALL 9,145 POINTS)
# ----------------------------------------------------------------------
print("\n[2] AUDITING 'cuad_contracts' (9,145 POINTS)...")
col_name = "cuad_contracts"
offset = None
points_by_ext = Counter()
points_by_source = Counter()
contract_names = set()
contracts_by_ext = defaultdict(set)
sample_payloads = {}

total_scrolled = 0
while True:
    records, offset = qc.scroll(
        col_name,
        limit=1000,
        offset=offset,
        with_payload=True,
        with_vectors=False
    )
    for p in records:
        total_scrolled += 1
        pl = p.payload or {}
        cname = pl.get("contract_name") or pl.get("file_name") or pl.get("name") or "UNKNOWN"
        contract_names.add(cname)
        
        # Determine extension
        ext = Path(cname).suffix.lower() if "." in cname else "no_ext"
        points_by_ext[ext] += 1
        contracts_by_ext[ext].add(cname)
        
        src = pl.get("source") or pl.get("doc_type") or pl.get("department") or "unspecified"
        points_by_source[src] += 1
        
        if ext not in sample_payloads:
            sample_payloads[ext] = pl

    if not offset:
        break

print(f"  Total scrolled points in '{col_name}': {total_scrolled}")
print("  Points by file extension:")
for ext, count in sorted(points_by_ext.items(), key=lambda x: -x[1]):
    distinct_docs = len(contracts_by_ext[ext])
    print(f"    {ext:10s}: {count:5d} points across {distinct_docs:4d} files")

print("  Points by source/department:")
for src, count in sorted(points_by_source.items(), key=lambda x: -x[1]):
    print(f"    {src:25s}: {count:5d} points")

print("\n  Sample non-pdf documents found in cuad_contracts:")
for ext in [".csv", ".xlsx", ".txt"]:
    if ext in contracts_by_ext:
        sample_files = list(contracts_by_ext[ext])[:5]
        print(f"    {ext} ({len(contracts_by_ext[ext])} files): {sample_files}")

# ----------------------------------------------------------------------
# 3. AUDIT 'adventureworks_entities' (26,129 POINTS)
# ----------------------------------------------------------------------
if "adventureworks_entities" in collections:
    print("\n[3] AUDITING 'adventureworks_entities' (26,129 POINTS)...")
    offset = None
    aw_by_table = Counter()
    aw_by_type = Counter()
    total_aw = 0
    while True:
        records, offset = qc.scroll(
            "adventureworks_entities",
            limit=2000,
            offset=offset,
            with_payload=['table', 'entity_type'],
            with_vectors=False
        )
        for p in records:
            total_aw += 1
            pl = p.payload or {}
            aw_by_table[pl.get("table", "UNKNOWN")] += 1
            aw_by_type[pl.get("entity_type", "UNKNOWN")] += 1
        if not offset:
            break
            
    print(f"  Total points in 'adventureworks_entities': {total_aw}")
    print("  Points by table:")
    for tbl, cnt in sorted(aw_by_table.items(), key=lambda x: -x[1]):
        print(f"    {tbl:30s}: {cnt:6d} points")
    print("  Points by entity_type:")
    for et, cnt in sorted(aw_by_type.items(), key=lambda x: -x[1]):
        print(f"    {et:30s}: {cnt:6d} points")

# ----------------------------------------------------------------------
# 4. AUDIT NEO4J: SalesOrder, SalesOrderDetail, Product, Document
# ----------------------------------------------------------------------
print("\n[4] AUDITING NEO4J GRAPH DB...")
res_so = neo4j_client.run_cypher("MATCH (o:SalesOrder) RETURN count(o) as cnt")
print(f"  SalesOrder nodes in Neo4j: {res_so[0]['cnt'] if res_so else 0:,}")

res_cp = neo4j_client.run_cypher("MATCH ()-[r:CONTAINS_PRODUCT]->() RETURN count(r) as cnt")
print(f"  CONTAINS_PRODUCT relationships in Neo4j: {res_cp[0]['cnt'] if res_cp else 0:,}")

res_prod = neo4j_client.run_cypher("MATCH (p:Product) RETURN count(p) as cnt")
print(f"  Product nodes in Neo4j: {res_prod[0]['cnt'] if res_prod else 0:,}")

res_cust = neo4j_client.run_cypher("MATCH (c:Customer) RETURN count(c) as cnt")
print(f"  Customer nodes in Neo4j: {res_cust[0]['cnt'] if res_cust else 0:,}")

# Check revenue by year in Neo4j
print("\n  Revenue by Year in Neo4j (from SalesOrder nodes):")
res_rev = neo4j_client.run_cypher("""
    MATCH (o:SalesOrder)
    RETURN o.year as Year,
           count(o) as OrderCount,
           sum(o.subTotal) as SubTotal,
           sum(o.taxAmt) as TaxAmt,
           sum(o.freight) as Freight,
           sum(o.totalDue) as TotalDue
    ORDER BY Year
""")
for r in res_rev:
    print(f"    Year {r['Year']}: Orders={r['OrderCount']:,}, SubTotal=${r['SubTotal']:,.2f}, TotalDue=${r['TotalDue']:,.2f}")

# ----------------------------------------------------------------------
# 5. AUDIT CSV SOURCE FILES (D:\adventureworks)
# ----------------------------------------------------------------------
print("\n[5] AUDITING SOURCE CSV (D:/adventureworks)...")
adv_dir = Path("D:/adventureworks")
if adv_dir.exists():
    h_df = pd.read_csv(adv_dir / "Sales_SalesOrderHeader.csv", sep=None, engine="python")
    d_df = pd.read_csv(adv_dir / "Sales_SalesOrderDetail.csv", sep=None, engine="python")
    print(f"  Sales_SalesOrderHeader.csv rows: {len(h_df):,}")
    print(f"  Sales_SalesOrderDetail.csv rows: {len(d_df):,}")
    
    # Check duplicate (SalesOrderID, ProductID) in CSV
    dupes = d_df.duplicated(subset=['SalesOrderID', 'ProductID'])
    print(f"  Duplicate (SalesOrderID, ProductID) pairs in CSV: {dupes.sum():,}")
    
    # Check unique SalesOrderDetailID
    unique_sod = d_df['SalesOrderDetailID'].nunique()
    print(f"  Unique SalesOrderDetailID count in CSV: {unique_sod:,} / {len(d_df):,}")
    
    # Check revenue by year in CSV
    h_df['Year'] = pd.to_datetime(h_df['OrderDate']).dt.year
    csv_rev = h_df.groupby('Year').agg(
        OrderCount=('SalesOrderID', 'count'),
        SubTotal=('SubTotal', 'sum'),
        TaxAmt=('TaxAmt', 'sum'),
        Freight=('Freight', 'sum'),
        TotalDue=('TotalDue', 'sum')
    ).reset_index()
    print("\n  Revenue by Year in Source CSV:")
    for _, r in csv_rev.iterrows():
        print(f"    Year {int(r['Year'])}: Orders={int(r['OrderCount']):,}, SubTotal=${r['SubTotal']:,.2f}, TotalDue=${r['TotalDue']:,.2f}")

print("\n" + "=" * 80)
