#!/usr/bin/env python3
"""
scripts/ingest_adventureworks_vectors.py
GraphMind / AEGIS — Full AdventureWorks Record-Level Vector Ingestion into Qdrant

Ingests ALL AdventureWorks business records into Qdrant collection:
'adventureworks_entities' (Dimension: 384, Distance: Cosine)

Target Entities:
- Product (504): Enriched with Category, SubCategory, Model, Description
- Customer (19,820): Enriched with Person Name, Store Name, Territory, Address
- Store (701): Enriched with Demographics, SalesPerson, Address
- Vendor (104): Enriched with Account, Credit Rating, Preferred status
- SalesOrder (31,465): Enriched with Customer Name, Line Items Summary, Financial Totals
- SalesOrderDetail (121,317): Enriched with Product Name, SKU, Category, Order Info
- Employee (290): Enriched with Person Name, Job Title, Department
- SalesPerson (17): Enriched with Person Name, Territory, Quota, Sales YTD
- PurchaseOrder (4,012): Enriched with Vendor Name, Order Totals, Status
- PurchaseOrderDetail (8,845): Enriched with Product Name, SKU, Vendor
- SpecialOffer (16): Discount promotions and volume tiers
- Department (16): Organizational department names and groups
- Territory (10): Sales territories and regional performance
- Location (14): Inventory warehouse and manufacturing locations

Features:
- Deterministic UUIDv5 point IDs: zero duplicates, 100% idempotent
- Memory-safe streaming batching (chunk size 1,000 / sub-batch 512)
- Multi-threaded CPU encoding (torch.set_num_threads)
- Safe resume mechanism: checks Qdrant IDs to skip already-ingested batches
- Preserves 'cuad_contracts' and Neo4j completely untouched
"""

import sys
import os
import gc
import re
import time
import uuid
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import torch
torch.set_num_threads(os.cpu_count() or 4)

import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

VECTOR_DIM = 384
COLLECTION_NAME = "adventureworks_entities"


def get_deterministic_id(table: str, entity_id: Any) -> str:
    """Produces stable UUIDv5 from table name and entity ID."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"aw_{table}_{entity_id}"))


def ensure_collection(client: QdrantClient, col_name: str) -> None:
    """Ensures adventureworks_entities collection exists without dropping or deleting."""
    existing = [c.name for c in client.get_collections().collections]
    if col_name not in existing:
        print(f"[*] Creating collection '{col_name}' (dim: {VECTOR_DIM}, metric: Cosine)...")
        client.create_collection(
            collection_name=col_name,
            vectors_config=models.VectorParams(size=VECTOR_DIM, distance=models.Distance.COSINE)
        )
        print(f"[✓] Collection '{col_name}' created.")
    else:
        info = client.get_collection(col_name)
        print(f"[✓] Collection '{col_name}' exists with {info.points_count:,} points.")


def parse_store_demographics(xml_str: Any) -> Dict[str, str]:
    """Extracts key survey fields from Store demographics XML."""
    res = {}
    if not isinstance(xml_str, str) or not xml_str.strip():
        return res
    for tag in ["AnnualSales", "AnnualRevenue", "BankName", "BusinessType", "YearOpened", "Specialty", "SquareFeet", "NumberEmployees"]:
        m = re.search(rf"<{tag}>([^<]+)</{tag}>", xml_str)
        if m:
            res[tag] = m.group(1).strip()
    return res


class AWVectorIngester:
    def __init__(self, data_dir: Path, client: QdrantClient, col_name: str, batch_size: int = 1000, resume: bool = True):
        self.data_dir = data_dir
        self.client = client
        self.col_name = col_name
        self.batch_size = batch_size
        self.resume = resume

        print("[*] Loading SentenceTransformer 'all-MiniLM-L6-v2' (local cache)...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        print("[✓] Embedding model loaded successfully.")

        self.stats = {}
        self.load_reference_lookups()

    def get_csv_path(self, filename: str) -> Path:
        p = self.data_dir / filename
        if p.exists():
            return p
        matches = list(self.data_dir.rglob(filename))
        if matches:
            return matches[0]
        fallback = REPO_ROOT / "central_storage_restore" / filename
        if fallback.exists():
            return fallback
        raise FileNotFoundError(f"Could not locate {filename} in {self.data_dir}")

    def load_reference_lookups(self):
        print("\n[*] Pre-loading relational lookup dictionaries for fast, rich enrichment...")
        t0 = time.time()

        # 1. Product Lookups
        prod_csv = self.get_csv_path("Production_Product.csv")
        p_df = pd.read_csv(prod_csv, sep=None, engine="python")
        sub_csv = self.get_csv_path("Production_ProductSubcategory.csv")
        sub_df = pd.read_csv(sub_csv, sep=None, engine="python")
        cat_csv = self.get_csv_path("Production_ProductCategory.csv")
        cat_df = pd.read_csv(cat_csv, sep=None, engine="python")
        cat_map = dict(zip(cat_df["ProductCategoryID"], cat_df["Name"]))
        self.sub_map = {}
        for _, r in sub_df.iterrows():
            c_name = cat_map.get(r["ProductCategoryID"], "")
            self.sub_map[r["ProductSubcategoryID"]] = (c_name, str(r["Name"]).strip())

        model_csv = self.get_csv_path("Production_ProductModel.csv")
        model_df = pd.read_csv(model_csv, sep=None, engine="python")
        self.model_map = dict(zip(model_df["ProductModelID"], model_df["Name"]))

        culture_csv = self.get_csv_path("Production_ProductModelProductDescriptionCulture.csv")
        culture_df = pd.read_csv(culture_csv, sep=None, engine="python")
        desc_csv = self.get_csv_path("Production_ProductDescription.csv")
        desc_df = pd.read_csv(desc_csv, sep=None, engine="python")
        desc_map = dict(zip(desc_df["ProductDescriptionID"], desc_df["Description"]))
        en_culture = culture_df[culture_df["CultureID"].str.strip() == "en"]
        self.model_desc_map = {}
        for _, r in en_culture.iterrows():
            mid = r["ProductModelID"]
            did = r["ProductDescriptionID"]
            if mid not in self.model_desc_map and did in desc_map:
                self.model_desc_map[mid] = str(desc_map[did]).strip()

        self.product_lookup = {}
        for _, r in p_df.iterrows():
            pid = int(r["ProductID"])
            sub_c, sub_n = self.sub_map.get(r.get("ProductSubcategoryID"), ("", ""))
            self.product_lookup[pid] = {
                "name": str(r["Name"]).strip(),
                "number": str(r.get("ProductNumber", "")).strip(),
                "color": str(r.get("Color") or "N/A").strip(),
                "price": float(r.get("ListPrice") or 0.0),
                "cost": float(r.get("StandardCost") or 0.0),
                "category": sub_c,
                "subcategory": sub_n,
                "model": str(self.model_map.get(r.get("ProductModelID"), "")).strip(),
                "desc": self.model_desc_map.get(r.get("ProductModelID"), "")
            }

        # 2. Person & Address Lookups
        person_csv = self.get_csv_path("Person_Person.csv")
        person_df = pd.read_csv(person_csv, sep=None, engine="python")
        person_df["FullName"] = person_df["FirstName"].fillna("") + " " + person_df["LastName"].fillna("")
        self.person_map = dict(zip(person_df["BusinessEntityID"], person_df["FullName"]))

        addr_csv = self.get_csv_path("Person_Address.csv")
        addr_df = pd.read_csv(addr_csv, sep=None, engine="python")
        self.addr_map = dict(zip(addr_df["AddressID"], addr_df["City"].fillna("") + ", " + addr_df["PostalCode"].fillna("")))

        bea_csv = self.get_csv_path("Person_BusinessEntityAddress.csv")
        bea_df = pd.read_csv(bea_csv, sep=None, engine="python")
        self.bea_map = dict(zip(bea_df["BusinessEntityID"], bea_df["AddressID"]))

        # 3. Store & Territory Lookups
        store_csv = self.get_csv_path("Sales_Store.csv")
        store_df = pd.read_csv(store_csv, sep=None, engine="python")
        self.store_map = dict(zip(store_df["BusinessEntityID"], store_df["Name"]))

        terr_csv = self.get_csv_path("Sales_SalesTerritory.csv")
        terr_df = pd.read_csv(terr_csv, sep=None, engine="python")
        self.terr_map = dict(zip(terr_df["TerritoryID"], terr_df["Name"]))

        # 4. Customer Lookup
        cust_csv = self.get_csv_path("Sales_Customer.csv")
        cust_df = pd.read_csv(cust_csv, sep=None, engine="python")
        self.cust_lookup = {}
        for _, r in cust_df.iterrows():
            cid = int(r["CustomerID"])
            sid = r.get("StoreID")
            pid = r.get("PersonID")
            acc = str(r.get("AccountNumber", "")).strip()
            tid = int(r.get("TerritoryID") or 0)
            tname = self.terr_map.get(tid, "")

            if pd.notna(sid) and int(sid) in self.store_map:
                cname = self.store_map[int(sid)]
                ctype = "Store (Đại lý Doanh nghiệp)"
            elif pd.notna(pid) and int(pid) in self.person_map:
                cname = self.person_map[int(pid)].strip()
                ctype = "Individual (Khách hàng Cá nhân)"
            else:
                cname = f"Customer #{cid}"
                ctype = "Customer"

            self.cust_lookup[cid] = {
                "name": cname,
                "type": ctype,
                "account": acc,
                "territory": tname
            }

        # 5. Pre-aggregate Sales Order Line Items Summary
        print("  -> Aggregating line items for 31,465 SalesOrders from Sales_SalesOrderDetail.csv...")
        sod_csv = self.get_csv_path("Sales_SalesOrderDetail.csv")
        sod_df = pd.read_csv(sod_csv, sep=None, engine="python", usecols=["SalesOrderID", "ProductID", "OrderQty", "LineTotal"])
        self.order_items_map = {}
        for row in sod_df.itertuples():
            so_id = row.SalesOrderID
            if so_id not in self.order_items_map:
                self.order_items_map[so_id] = {"line_count": 0, "total_qty": 0, "sample_prods": []}
            info = self.order_items_map[so_id]
            info["line_count"] += 1
            info["total_qty"] += int(row.OrderQty)
            if len(info["sample_prods"]) < 4:
                p_info = self.product_lookup.get(row.ProductID, {})
                p_name = p_info.get("name", f"Product #{row.ProductID}")
                info["sample_prods"].append(f"{p_name} (SL: {int(row.OrderQty)})")

        del sod_df
        gc.collect()
        print(f"[✓] Lookups loaded in {time.time()-t0:.2f}s.")

    def batch_upsert_records(self, entity_type: str, records: List[Dict[str, Any]], check_resume: bool = True):
        """Batch encode and upsert records into Qdrant with resume & retry capability."""
        if not records:
            return 0

        # Check existing points if resume is enabled
        records_to_process = records
        if check_resume and self.resume:
            ids_to_check = [r["id"] for r in records]
            try:
                retrieved = self.client.retrieve(collection_name=self.col_name, ids=ids_to_check, with_payload=True, with_vectors=False)
                if len(retrieved) > 0:
                    existing_valid = set()
                    for p in retrieved:
                        pl = p.payload or {}
                        # For SalesOrder, update if existing point is from previous partial run without sample_products
                        if entity_type == "SalesOrder" and "sample_products" not in pl:
                            continue
                        existing_valid.add(p.id)
                    records_to_process = [r for r in records if r["id"] not in existing_valid]
            except Exception:
                pass

        if not records_to_process:
            return len(records)

        # Batch encode
        texts = [r["text"] for r in records_to_process]
        embeddings = self.model.encode(texts, batch_size=512, show_progress_bar=False).tolist()

        points = [
            models.PointStruct(
                id=records_to_process[j]["id"],
                vector=embeddings[j],
                payload=records_to_process[j]["payload"]
            )
            for j in range(len(records_to_process))
        ]

        # Upsert in chunks of 500 points to stay well under Qdrant 32MB HTTP payload limit
        chunk_size = 500
        for i in range(0, len(points), chunk_size):
            pt_chunk = points[i : i + chunk_size]
            for attempt in range(3):
                try:
                    self.client.upsert(collection_name=self.col_name, points=pt_chunk)
                    break
                except Exception as e:
                    if attempt == 2:
                        raise RuntimeError(f"Failed to upsert sub-batch of {len(pt_chunk)} points for {entity_type}: {e}")
                    time.sleep(1.5 * (attempt + 1))

        del texts, embeddings, points, records_to_process
        return len(records)

    # -------------------------------------------------------------------------
    # 1. PRODUCTS (504)
    # -------------------------------------------------------------------------
    def ingest_products(self):
        print("\n[1/14] Ingesting Products (504)...")
        csv_file = self.get_csv_path("Production_Product.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            pid = int(r["ProductID"])
            p_info = self.product_lookup.get(pid, {})
            pname = p_info.get("name", str(r["Name"]))
            pnum = p_info.get("number", str(r.get("ProductNumber", "")))
            color = p_info.get("color", "N/A")
            price = p_info.get("price", 0.0)
            cost = p_info.get("cost", 0.0)
            cat = p_info.get("category", "")
            subcat = p_info.get("subcategory", "")
            model = p_info.get("model", "")
            desc = p_info.get("desc", "")

            text = f"Product: {pname} | SKU: {pnum} | Category: {cat} > {subcat} | Model: {model} | Color: {color} | List Price: ${price:,.2f} USD | Standard Cost: ${cost:,.2f} USD"
            if desc:
                text += f" | Description: {desc}"

            uid = get_deterministic_id("Production_Product", pid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Product",
                    "type": "Product",
                    "table": "Production_Product",
                    "entity_id": pid,
                    "product_id": pid,
                    "name": pname,
                    "title": pname,
                    "product_number": pnum,
                    "color": color,
                    "category": cat,
                    "subcategory": subcat,
                    "model": model,
                    "list_price": price,
                    "standard_cost": cost,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Production_Product.csv",
                    "document_id": f"aw_Product_{pid}"
                }
            })
        self.batch_upsert_records("Product", records)
        self.stats["Product"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Product records.")

    # -------------------------------------------------------------------------
    # 2. VENDORS (104)
    # -------------------------------------------------------------------------
    def ingest_vendors(self):
        print("\n[2/14] Ingesting Vendors (104)...")
        csv_file = self.get_csv_path("Purchasing_Vendor.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            vid = int(r["BusinessEntityID"])
            vname = str(r["Name"]).strip()
            acc = str(r.get("AccountNumber", "")).strip()
            credit = int(r.get("CreditRating") or 1)
            pref = int(r.get("PreferredVendorStatus") or 0)
            aid = self.bea_map.get(vid)
            city_zip = self.addr_map.get(aid, "")

            text = f"Vendor: {vname} | Account: {acc} | Credit Rating: {credit} | Preferred: {'Yes' if pref else 'No'}"
            if city_zip:
                text += f" | Address: {city_zip}"

            uid = get_deterministic_id("Purchasing_Vendor", vid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Vendor",
                    "type": "Vendor",
                    "table": "Purchasing_Vendor",
                    "entity_id": vid,
                    "vendor_id": vid,
                    "name": vname,
                    "title": vname,
                    "account_number": acc,
                    "credit_rating": credit,
                    "preferred_vendor": pref,
                    "address": city_zip,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Purchasing_Vendor.csv",
                    "document_id": f"aw_Vendor_{vid}"
                }
            })
        self.batch_upsert_records("Vendor", records)
        self.stats["Vendor"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Vendor records.")

    # -------------------------------------------------------------------------
    # 3. STORES (701)
    # -------------------------------------------------------------------------
    def ingest_stores(self):
        print("\n[3/14] Ingesting Stores (701)...")
        csv_file = self.get_csv_path("Sales_Store.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            sid = int(r["BusinessEntityID"])
            sname = str(r["Name"]).strip()
            sp_id = int(r["SalesPersonID"]) if pd.notna(r.get("SalesPersonID")) else None
            sp_name = self.person_map.get(sp_id, "N/A") if sp_id else "N/A"
            demo = parse_store_demographics(r.get("Demographics"))
            annual_sales = demo.get("AnnualSales", "")
            specialty = demo.get("Specialty", "")
            b_type = demo.get("BusinessType", "")
            aid = self.bea_map.get(sid)
            city_zip = self.addr_map.get(aid, "")

            text = f"Store: {sname} | ID: {sid} | Sales Person: {sp_name}"
            if annual_sales:
                text += f" | Annual Sales: ${float(annual_sales):,.2f} USD"
            if specialty:
                text += f" | Specialty: {specialty}"
            if b_type:
                text += f" | Business Type: {b_type}"
            if city_zip:
                text += f" | Address: {city_zip}"

            uid = get_deterministic_id("Sales_Store", sid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Store",
                    "type": "Store",
                    "table": "Sales_Store",
                    "entity_id": sid,
                    "store_id": sid,
                    "name": sname,
                    "title": sname,
                    "sales_person_name": sp_name,
                    "annual_sales": float(annual_sales) if annual_sales else 0.0,
                    "specialty": specialty,
                    "business_type": b_type,
                    "address": city_zip,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_Store.csv",
                    "document_id": f"aw_Store_{sid}"
                }
            })
        self.batch_upsert_records("Store", records)
        self.stats["Store"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Store records.")

    # -------------------------------------------------------------------------
    # 4. CUSTOMERS (19,820)
    # -------------------------------------------------------------------------
    def ingest_customers(self):
        print("\n[4/14] Ingesting Customers (19,820)...")
        csv_file = self.get_csv_path("Sales_Customer.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        total_customers = len(df)
        records = []
        committed = 0

        for idx, r in df.iterrows():
            cid = int(r["CustomerID"])
            c_info = self.cust_lookup.get(cid, {})
            cname = c_info.get("name", f"Customer #{cid}")
            ctype = c_info.get("type", "Customer")
            acc = c_info.get("account", "")
            tname = c_info.get("territory", "")
            pid = r.get("PersonID")
            sid = r.get("StoreID")
            b_id = pid if pd.notna(pid) else sid
            aid = self.bea_map.get(int(b_id)) if pd.notna(b_id) else None
            city_zip = self.addr_map.get(aid, "")

            text = f"Customer #{cid}: {cname} | Type: {ctype} | Account: {acc}"
            if tname:
                text += f" | Territory: {tname}"
            if city_zip:
                text += f" | Location: {city_zip}"

            uid = get_deterministic_id("Sales_Customer", cid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Customer",
                    "type": "Customer",
                    "table": "Sales_Customer",
                    "entity_id": cid,
                    "customer_id": cid,
                    "name": cname,
                    "title": cname,
                    "account_number": acc,
                    "customer_type": ctype,
                    "territory": tname,
                    "address": city_zip,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_Customer.csv",
                    "document_id": f"aw_Customer_{cid}"
                }
            })

            if len(records) >= self.batch_size or (idx + 1) == total_customers:
                committed += self.batch_upsert_records("Customer", records)
                print(f"  -> [Customer] Progress: {committed:,} / {total_customers:,} ({committed/total_customers*100:.1f}%)")
                records = []
                gc.collect()

        self.stats["Customer"] = committed

    # -------------------------------------------------------------------------
    # 5. SALES ORDERS (ALL 31,465)
    # -------------------------------------------------------------------------
    def ingest_sales_orders(self):
        print("\n[5/14] Ingesting Sales Orders (ALL 31,465)...")
        csv_file = self.get_csv_path("Sales_SalesOrderHeader.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        total_orders = len(df)
        records = []
        committed = 0

        for idx, r in df.iterrows():
            so_id = int(r["SalesOrderID"])
            cid = int(r["CustomerID"])
            c_info = self.cust_lookup.get(cid, {})
            cname = c_info.get("name", f"Customer #{cid}")
            odate = str(r.get("OrderDate", "")).split()[0]
            status = int(r.get("Status") or 1)
            onum = str(r.get("SalesOrderNumber", "")).strip()
            total = float(r.get("TotalDue") or 0.0)
            sub = float(r.get("SubTotal") or 0.0)
            tax = float(r.get("TaxAmt") or 0.0)
            freight = float(r.get("Freight") or 0.0)
            tid = int(r.get("TerritoryID") or 0)
            tname = self.terr_map.get(tid, "")

            order_summary = self.order_items_map.get(so_id, {"line_count": 0, "total_qty": 0, "sample_prods": []})
            line_cnt = order_summary["line_count"]
            tot_qty = order_summary["total_qty"]
            prods_str = ", ".join(order_summary["sample_prods"]) if order_summary["sample_prods"] else "N/A"

            text = f"Sales Order #{so_id} ({onum}) | Customer: {cname} (#{cid}) | Date: {odate} | Status: {status} | Total Due: ${total:,.2f} USD | SubTotal: ${sub:,.2f} USD | Tax: ${tax:,.2f} USD | Freight: ${freight:,.2f} USD"
            if tname:
                text += f" | Territory: {tname}"
            if line_cnt > 0:
                text += f" | Items ({line_cnt} lines, {tot_qty} qty): {prods_str}"

            uid = get_deterministic_id("Sales_SalesOrderHeader", so_id)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "SalesOrder",
                    "type": "SalesOrder",
                    "table": "Sales_SalesOrderHeader",
                    "entity_id": so_id,
                    "SalesOrderID": so_id,
                    "sales_order_id": so_id,
                    "CustomerID": cid,
                    "customer_id": cid,
                    "CustomerName": cname,
                    "name": f"Đơn hàng #{so_id}",
                    "title": f"Order #{so_id}",
                    "OrderDate": odate,
                    "order_date": odate,
                    "status": status,
                    "TotalDue": total,
                    "total_due": total,
                    "SubTotal": sub,
                    "sub_total": sub,
                    "tax_amt": tax,
                    "freight": freight,
                    "territory": tname,
                    "line_count": line_cnt,
                    "sample_products": prods_str,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_SalesOrderHeader.csv",
                    "document_id": f"aw_SalesOrder_{so_id}"
                }
            })

            if len(records) >= self.batch_size or (idx + 1) == total_orders:
                committed += self.batch_upsert_records("SalesOrder", records)
                print(f"  -> [SalesOrder] Progress: {committed:,} / {total_orders:,} ({committed/total_orders*100:.1f}%)")
                records = []
                gc.collect()

        self.stats["SalesOrder"] = committed

    # -------------------------------------------------------------------------
    # 6. SALES ORDER DETAILS (ALL 121,317)
    # -------------------------------------------------------------------------
    def ingest_sales_order_details(self):
        print("\n[6/14] Ingesting Sales Order Details (ALL 121,317)...")
        csv_file = self.get_csv_path("Sales_SalesOrderDetail.csv")
        total_details = sum(1 for _ in open(csv_file, encoding="utf-8", errors="ignore")) - 1

        chunk_size = 2500
        committed = 0
        t0 = time.time()

        for chunk_df in pd.read_csv(csv_file, sep=None, engine="python", chunksize=chunk_size):
            records = []
            for _, r in chunk_df.iterrows():
                sod_id = int(r["SalesOrderDetailID"])
                so_id = int(r["SalesOrderID"])
                pid = int(r["ProductID"])
                qty = int(r.get("OrderQty") or 1)
                uprice = float(r.get("UnitPrice") or 0.0)
                discount = float(r.get("UnitPriceDiscount") or 0.0)
                linetotal = float(r.get("LineTotal") or (qty * uprice * (1.0 - discount)))
                track = str(r.get("CarrierTrackingNumber") or "").strip()

                p_info = self.product_lookup.get(pid, {})
                pname = p_info.get("name", f"Product #{pid}")
                pnum = p_info.get("number", "")
                cat = p_info.get("category", "")
                subcat = p_info.get("subcategory", "")

                text = f"Sales Order Detail #{sod_id} in Order #{so_id} | Product: {pname} (SKU: {pnum}) | Category: {cat} > {subcat} | Qty: {qty} | Unit Price: ${uprice:,.2f} USD | Discount: {discount*100:.1f}% | Line Total: ${linetotal:,.2f} USD"
                if track:
                    text += f" | Tracking: {track}"

                uid = get_deterministic_id("Sales_SalesOrderDetail", sod_id)
                records.append({
                    "id": uid,
                    "text": text,
                    "payload": {
                        "entity_type": "SalesOrderDetail",
                        "type": "SalesOrderDetail",
                        "table": "Sales_SalesOrderDetail",
                        "entity_id": sod_id,
                        "SalesOrderDetailID": sod_id,
                        "SalesOrderID": so_id,
                        "ProductID": pid,
                        "name": f"Chi tiết #{sod_id} (Đơn #{so_id})",
                        "product_name": pname,
                        "product_number": pnum,
                        "category": cat,
                        "subcategory": subcat,
                        "OrderQty": qty,
                        "UnitPrice": uprice,
                        "UnitPriceDiscount": discount,
                        "LineTotal": linetotal,
                        "carrier_tracking": track,
                        "searchable_text": text,
                        "text": text,
                        "source": "adventureworks",
                        "source_file": "Sales_SalesOrderDetail.csv",
                        "document_id": f"aw_SalesOrderDetail_{sod_id}"
                    }
                })

            committed += self.batch_upsert_records("SalesOrderDetail", records)
            elapsed = time.time() - t0
            rate = committed / elapsed if elapsed > 0 else 0
            eta_sec = (total_details - committed) / rate if rate > 0 else 0
            print(f"  -> [SalesOrderDetail] Progress: {committed:,} / {total_details:,} ({committed/total_details*100:.1f}%) | {rate:.1f} rec/s | ETA: {eta_sec/60:.1f}m")
            del records, chunk_df
            gc.collect()

        self.stats["SalesOrderDetail"] = committed

    # -------------------------------------------------------------------------
    # 7. EMPLOYEES (290)
    # -------------------------------------------------------------------------
    def ingest_employees(self):
        print("\n[7/14] Ingesting Employees (290)...")
        csv_file = self.get_csv_path("HumanResources_Employee.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        dept_csv = self.get_csv_path("HumanResources_Department.csv")
        dept_df = pd.read_csv(dept_csv, sep=None, engine="python")
        dept_map = dict(zip(dept_df["DepartmentID"], dept_df["Name"]))

        edh_csv = self.get_csv_path("HumanResources_EmployeeDepartmentHistory.csv")
        edh_df = pd.read_csv(edh_csv, sep=None, engine="python")
        emp_dept_map = dict(zip(edh_df["BusinessEntityID"], edh_df["DepartmentID"].map(dept_map)))

        records = []
        for _, r in df.iterrows():
            eid = int(r["BusinessEntityID"])
            ename = self.person_map.get(eid, f"Employee #{eid}")
            job = str(r.get("JobTitle", "")).strip()
            hire = str(r.get("HireDate", "")).split()[0]
            salaried = "Salaried" if r.get("SalariedFlag") == 1 else "Hourly"
            dept_name = emp_dept_map.get(eid, "Operations")

            text = f"Employee #{eid}: {ename} | Job Title: {job} | Department: {dept_name} | Hire Date: {hire} | Type: {salaried}"
            uid = get_deterministic_id("HumanResources_Employee", eid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Employee",
                    "type": "Employee",
                    "table": "HumanResources_Employee",
                    "entity_id": eid,
                    "employee_id": eid,
                    "name": ename,
                    "title": ename,
                    "job_title": job,
                    "department": dept_name,
                    "hire_date": hire,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "HumanResources_Employee.csv",
                    "document_id": f"aw_Employee_{eid}"
                }
            })
        self.batch_upsert_records("Employee", records)
        self.stats["Employee"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Employee records.")

    # -------------------------------------------------------------------------
    # 8. SALES PERSONS (17)
    # -------------------------------------------------------------------------
    def ingest_sales_persons(self):
        print("\n[8/14] Ingesting Sales Persons (17)...")
        csv_file = self.get_csv_path("Sales_SalesPerson.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            spid = int(r["BusinessEntityID"])
            spname = self.person_map.get(spid, f"SalesPerson #{spid}")
            tid = int(r["TerritoryID"]) if pd.notna(r.get("TerritoryID")) else 0
            tname = self.terr_map.get(tid, "Global")
            quota = float(r.get("SalesQuota") or 0.0)
            sales_ytd = float(r.get("SalesYTD") or 0.0)
            bonus = float(r.get("Bonus") or 0.0)

            text = f"Sales Person #{spid}: {spname} | Territory: {tname} | Sales YTD: ${sales_ytd:,.2f} USD | Quota: ${quota:,.2f} USD | Bonus: ${bonus:,.2f} USD"
            uid = get_deterministic_id("Sales_SalesPerson", spid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "SalesPerson",
                    "type": "SalesPerson",
                    "table": "Sales_SalesPerson",
                    "entity_id": spid,
                    "sales_person_id": spid,
                    "name": spname,
                    "title": spname,
                    "territory": tname,
                    "sales_ytd": sales_ytd,
                    "sales_quota": quota,
                    "bonus": bonus,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_SalesPerson.csv",
                    "document_id": f"aw_SalesPerson_{spid}"
                }
            })
        self.batch_upsert_records("SalesPerson", records)
        self.stats["SalesPerson"] = len(records)
        print(f"  -> Successfully processed {len(records):,} SalesPerson records.")

    # -------------------------------------------------------------------------
    # 9. PURCHASE ORDER HEADERS (4,012)
    # -------------------------------------------------------------------------
    def ingest_purchase_orders(self):
        print("\n[9/14] Ingesting Purchase Orders (4,012)...")
        csv_file = self.get_csv_path("Purchasing_PurchaseOrderHeader.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        vend_csv = self.get_csv_path("Purchasing_Vendor.csv")
        vend_df = pd.read_csv(vend_csv, sep=None, engine="python")
        vend_map = dict(zip(vend_df["BusinessEntityID"], vend_df["Name"]))

        records = []
        for _, r in df.iterrows():
            poid = int(r["PurchaseOrderID"])
            vid = int(r["VendorID"])
            vname = vend_map.get(vid, f"Vendor #{vid}")
            odate = str(r.get("OrderDate", "")).split()[0]
            status = int(r.get("Status") or 1)
            total = float(r.get("TotalDue") or 0.0)
            sub = float(r.get("SubTotal") or 0.0)

            text = f"Purchase Order #{poid} | Vendor: {vname} (#{vid}) | Date: {odate} | Status: {status} | Total Due: ${total:,.2f} USD | SubTotal: ${sub:,.2f} USD"
            uid = get_deterministic_id("Purchasing_PurchaseOrderHeader", poid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "PurchaseOrder",
                    "type": "PurchaseOrder",
                    "table": "Purchasing_PurchaseOrderHeader",
                    "entity_id": poid,
                    "purchase_order_id": poid,
                    "name": f"Đơn mua hàng #{poid}",
                    "title": f"PO #{poid}",
                    "vendor_id": vid,
                    "vendor_name": vname,
                    "order_date": odate,
                    "status": status,
                    "total_due": total,
                    "sub_total": sub,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Purchasing_PurchaseOrderHeader.csv",
                    "document_id": f"aw_PurchaseOrder_{poid}"
                }
            })
        self.batch_upsert_records("PurchaseOrder", records)
        self.stats["PurchaseOrder"] = len(records)
        print(f"  -> Successfully processed {len(records):,} PurchaseOrder records.")

    # -------------------------------------------------------------------------
    # 10. PURCHASE ORDER DETAILS (8,845)
    # -------------------------------------------------------------------------
    def ingest_purchase_order_details(self):
        print("\n[10/14] Ingesting Purchase Order Details (8,845)...")
        csv_file = self.get_csv_path("Purchasing_PurchaseOrderDetail.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        committed = 0

        for idx, r in df.iterrows():
            pod_id = int(r["PurchaseOrderDetailID"])
            poid = int(r["PurchaseOrderID"])
            pid = int(r["ProductID"])
            p_info = self.product_lookup.get(pid, {})
            pname = p_info.get("name", f"Product #{pid}")
            pnum = p_info.get("number", "")
            qty = int(r.get("OrderQty") or 1)
            uprice = float(r.get("UnitPrice") or 0.0)
            linetotal = float(r.get("LineTotal") or (qty * uprice))

            text = f"Purchase Order Detail #{pod_id} in PO #{poid} | Product: {pname} (SKU: {pnum}) | Qty: {qty} | Unit Price: ${uprice:,.2f} USD | Line Total: ${linetotal:,.2f} USD"
            uid = get_deterministic_id("Purchasing_PurchaseOrderDetail", pod_id)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "PurchaseOrderDetail",
                    "type": "PurchaseOrderDetail",
                    "table": "Purchasing_PurchaseOrderDetail",
                    "entity_id": pod_id,
                    "purchase_order_detail_id": pod_id,
                    "purchase_order_id": poid,
                    "product_id": pid,
                    "product_name": pname,
                    "order_qty": qty,
                    "unit_price": uprice,
                    "line_total": linetotal,
                    "name": f"Chi tiết PO #{pod_id}",
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Purchasing_PurchaseOrderDetail.csv",
                    "document_id": f"aw_PurchaseOrderDetail_{pod_id}"
                }
            })

            if len(records) >= self.batch_size or (idx + 1) == len(df):
                committed += self.batch_upsert_records("PurchaseOrderDetail", records)
                records = []
                gc.collect()

        self.stats["PurchaseOrderDetail"] = committed
        print(f"  -> Successfully processed {committed:,} PurchaseOrderDetail records.")

    # -------------------------------------------------------------------------
    # 11. SPECIAL OFFERS (16)
    # -------------------------------------------------------------------------
    def ingest_special_offers(self):
        print("\n[11/14] Ingesting Special Offers (16)...")
        csv_file = self.get_csv_path("Sales_SpecialOffer.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            sofid = int(r["SpecialOfferID"])
            desc = str(r["Description"]).strip()
            disc = float(r.get("DiscountPct") or 0.0)
            stype = str(r.get("Type", "")).strip()
            cat = str(r.get("Category", "")).strip()
            min_q = int(r.get("MinQty") or 0)
            max_q = r.get("MaxQty")
            max_q_str = str(int(max_q)) if pd.notna(max_q) else "Unlimited"

            text = f"Special Offer #{sofid}: {desc} | Discount: {disc*100:.1f}% | Type: {stype} | Category: {cat} | Min Qty: {min_q} | Max Qty: {max_q_str}"
            uid = get_deterministic_id("Sales_SpecialOffer", sofid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "SpecialOffer",
                    "type": "SpecialOffer",
                    "table": "Sales_SpecialOffer",
                    "entity_id": sofid,
                    "name": desc,
                    "title": desc,
                    "discount_pct": disc,
                    "offer_type": stype,
                    "category": cat,
                    "min_qty": min_q,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_SpecialOffer.csv",
                    "document_id": f"aw_SpecialOffer_{sofid}"
                }
            })
        self.batch_upsert_records("SpecialOffer", records)
        self.stats["SpecialOffer"] = len(records)
        print(f"  -> Successfully processed {len(records):,} SpecialOffer records.")

    # -------------------------------------------------------------------------
    # 12. DEPARTMENTS (16)
    # -------------------------------------------------------------------------
    def ingest_departments(self):
        print("\n[12/14] Ingesting Departments (16)...")
        csv_file = self.get_csv_path("HumanResources_Department.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            did = int(r["DepartmentID"])
            dname = str(r["Name"]).strip()
            gname = str(r.get("GroupName", "")).strip()

            text = f"Department #{did}: {dname} | Group: {gname}"
            uid = get_deterministic_id("HumanResources_Department", did)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Department",
                    "type": "Department",
                    "table": "HumanResources_Department",
                    "entity_id": did,
                    "name": dname,
                    "title": dname,
                    "group_name": gname,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "HumanResources_Department.csv",
                    "document_id": f"aw_Department_{did}"
                }
            })
        self.batch_upsert_records("Department", records)
        self.stats["Department"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Department records.")

    # -------------------------------------------------------------------------
    # 13. TERRITORIES (10)
    # -------------------------------------------------------------------------
    def ingest_territories(self):
        print("\n[13/14] Ingesting Territories (10)...")
        csv_file = self.get_csv_path("Sales_SalesTerritory.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            tid = int(r["TerritoryID"])
            tname = str(r["Name"]).strip()
            ccode = str(r.get("CountryRegionCode", "")).strip()
            grp = str(r.get("Group", "")).strip()
            sytd = float(r.get("SalesYTD") or 0.0)

            text = f"Sales Territory #{tid}: {tname} | Country: {ccode} | Group: {grp} | Sales YTD: ${sytd:,.2f} USD"
            uid = get_deterministic_id("Sales_SalesTerritory", tid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Territory",
                    "type": "Territory",
                    "table": "Sales_SalesTerritory",
                    "entity_id": tid,
                    "name": tname,
                    "title": tname,
                    "country_code": ccode,
                    "group": grp,
                    "sales_ytd": sytd,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Sales_SalesTerritory.csv",
                    "document_id": f"aw_Territory_{tid}"
                }
            })
        self.batch_upsert_records("Territory", records)
        self.stats["Territory"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Territory records.")

    # -------------------------------------------------------------------------
    # 14. LOCATIONS (14)
    # -------------------------------------------------------------------------
    def ingest_locations(self):
        print("\n[14/14] Ingesting Production Locations (14)...")
        csv_file = self.get_csv_path("Production_Location.csv")
        df = pd.read_csv(csv_file, sep=None, engine="python")
        records = []
        for _, r in df.iterrows():
            lid = int(r["LocationID"])
            lname = str(r["Name"]).strip()
            cost = float(r.get("CostRate") or 0.0)
            avail = float(r.get("Availability") or 0.0)

            text = f"Production Location #{lid}: {lname} | Cost Rate: ${cost:.2f}/hr | Availability: {avail:.1f} hrs"
            uid = get_deterministic_id("Production_Location", lid)
            records.append({
                "id": uid,
                "text": text,
                "payload": {
                    "entity_type": "Location",
                    "type": "Location",
                    "table": "Production_Location",
                    "entity_id": lid,
                    "name": lname,
                    "title": lname,
                    "cost_rate": cost,
                    "availability": avail,
                    "searchable_text": text,
                    "text": text,
                    "source": "adventureworks",
                    "source_file": "Production_Location.csv",
                    "document_id": f"aw_Location_{lid}"
                }
            })
        self.batch_upsert_records("Location", records)
        self.stats["Location"] = len(records)
        print(f"  -> Successfully processed {len(records):,} Location records.")

    def run_all(self):
        start_time = time.time()
        print("\n" + "=" * 70)
        print("  STARTING FULL ADVENTUREWORKS RECORD-LEVEL VECTOR INGESTION")
        print("=" * 70)

        self.ingest_products()
        self.ingest_vendors()
        self.ingest_stores()
        self.ingest_customers()
        self.ingest_sales_orders()
        self.ingest_sales_order_details()
        self.ingest_employees()
        self.ingest_sales_persons()
        self.ingest_purchase_orders()
        self.ingest_purchase_order_details()
        self.ingest_special_offers()
        self.ingest_departments()
        self.ingest_territories()
        self.ingest_locations()

        total_ingested = sum(self.stats.values())
        elapsed = time.time() - start_time

        print("\n" + "=" * 70)
        print("  INGESTION EXECUTION COMPLETE")
        print(f"  Total Processed Records: {total_ingested:,}")
        print(f"  Elapsed Time:            {elapsed/60:.2f} minutes")
        print("=" * 70)

        return self.stats


def verify_database_counts(client: QdrantClient, col_name: str):
    print("\n" + "=" * 70)
    print("  VERIFYING QDRANT COLLECTION RECORD BREAKDOWN")
    print("=" * 70)

    info = client.get_collection(col_name)
    total_pts = info.points_count
    print(f"  Collection Name:      {col_name}")
    print(f"  Total Points Count:   {total_pts:,}")

    expected = {
        "Product": 504,
        "Customer": 19820,
        "Store": 701,
        "Vendor": 104,
        "SalesOrder": 31465,
        "SalesOrderDetail": 121317,
        "Employee": 290,
        "SalesPerson": 17,
        "PurchaseOrder": 4012,
        "PurchaseOrderDetail": 8845,
        "SpecialOffer": 16,
        "Department": 16,
        "Territory": 10,
        "Location": 14,
    }

    print("\n  Detailed Breakdown:")
    all_match = True
    for et, exp_cnt in expected.items():
        actual = client.count(
            collection_name=col_name,
            count_filter=models.Filter(
                must=[models.FieldCondition(key="entity_type", match=models.MatchValue(value=et))]
            ),
            exact=True
        ).count
        status = "PASS" if actual == exp_cnt else f"MISMATCH (got {actual:,})"
        if actual != exp_cnt:
            all_match = False
        print(f"  - {et:<20}: {actual:>7,} / {exp_cnt:>7,}  -> {status}")

    # Verify CUAD collection intact
    cuad_info = client.get_collection("cuad_contracts")
    print("\n  CUAD Contracts Integrity:")
    print(f"  - cuad_contracts points: {cuad_info.points_count:,} (Expected: >=9,069) -> {'PASS' if cuad_info.points_count >= 9069 else 'FAIL'}")
    print("=" * 70)
    return all_match


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Full AdventureWorks Vector Ingestion")
    parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", "D:/adventureworks"), help="Path to AdventureWorks CSV directory")
    parser.add_argument("--qdrant-host", default=os.getenv("QDRANT_HOST", "localhost"), help="Qdrant host")
    parser.add_argument("--qdrant-port", type=int, default=int(os.getenv("QDRANT_PORT", 6333)), help="Qdrant port")
    parser.add_argument("--collection", default=COLLECTION_NAME, help="Collection name")
    parser.add_argument("--batch-size", type=int, default=1000, help="Ingestion batch size")
    parser.add_argument("--force", action="store_true", help="Force re-encode existing points")
    args = parser.parse_args()

    adv_path = Path(args.data_dir).resolve()
    if not adv_path.exists():
        fallback = REPO_ROOT / "central_storage_restore"
        if fallback.exists():
            adv_path = fallback
        else:
            print(f"[Error] Could not find AdventureWorks CSVs at {adv_path} or {fallback}")
            sys.exit(1)

    client = QdrantClient(host=args.qdrant_host, port=args.qdrant_port, timeout=45)
    ensure_collection(client, args.collection)

    ingester = AWVectorIngester(
        data_dir=adv_path,
        client=client,
        col_name=args.collection,
        batch_size=args.batch_size,
        resume=not args.force
    )
    ingester.run_all()
    verify_database_counts(client, args.collection)
