#!/usr/bin/env python3
"""
GraphMind / AEGIS — AdventureWorks Record-Level Vector Ingestion
Module: scripts/ingest_adventureworks_vectors.py

Embeds AdventureWorks business entities at the record level into a dedicated Qdrant collection:
Collection: "adventureworks_entities" (Dimension: 384, Distance: Cosine)

Entities Processed:
1. Production_Product (504 records):
   Enriched with Category, SubCategory, and English Description from ProductModel.
2. Purchasing_Vendor (104 records):
   Credit rating, preferred vendor status, active flag.
3. Sales_Store (701 records):
   B2B stores with parsed demographic XML (annual sales, specialty, business type).
4. Sales_Customer (19,820 records):
   Individual customers & corporate store accounts with territory and account number.
5. Sales_SalesOrderHeader (Configurable, default top 5,000 or all):
   High-value & key transaction summaries linking order date, total due, and product items.

Deterministic point IDs (UUIDv5) guarantee zero duplicates on re-runs.
Preserves existing 'cuad_contracts' collection completely untouched.
"""

import sys
import os
import time
import uuid
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

COLLECTION_NAME = "adventureworks_entities"
VECTOR_DIM = 384


def get_deterministic_id(table: str, entity_id: Any) -> str:
    """Produces stable UUIDv5 from table name and entity ID."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"aw_{table}_{entity_id}"))


def ensure_qdrant_collection(client: QdrantClient, collection_name: str) -> None:
    """Creates collection if not exists with Cosine distance."""
    collections = [c.name for c in client.get_collections().collections]
    if collection_name not in collections:
        print(f"[*] Creating Qdrant collection '{collection_name}' (dim={VECTOR_DIM}, Cosine)...")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=VECTOR_DIM,
                distance=models.Distance.COSINE
            )
        )
        print(f"[✓] Created collection '{collection_name}'.")
    else:
        info = client.get_collection(collection_name)
        print(f"[*] Collection '{collection_name}' already exists with {info.points_count:,} points.")


def parse_store_demographics(xml_str: Any) -> Dict[str, Any]:
    """Extracts structured values from StoreSurvey XML."""
    if not isinstance(xml_str, str) or not xml_str.strip().startswith("<"):
        return {}
    try:
        root = ET.fromstring(xml_str)
        res = {}
        for child in root:
            tag = child.tag.split("}")[-1]
            if child.text:
                res[tag] = child.text.strip()
        return res
    except Exception:
        return {}


def process_products(data_dir: Path) -> List[Dict[str, Any]]:
    """Loads and serializes 504 Products with categories & descriptions."""
    print("\n--- [1/5] Processing Production_Product ---")
    p_path = data_dir / "Production_Product.csv"
    sub_path = data_dir / "Production_ProductSubcategory.csv"
    cat_path = data_dir / "Production_ProductCategory.csv"
    desc_path = data_dir / "Production_ProductDescription.csv"
    mpdc_path = data_dir / "Production_ProductModelProductDescriptionCulture.csv"

    prod_df = pd.read_csv(p_path, sep=None, engine="python")
    sub_df = pd.read_csv(sub_path, sep=None, engine="python") if sub_path.exists() else pd.DataFrame()
    cat_df = pd.read_csv(cat_path, sep=None, engine="python") if cat_path.exists() else pd.DataFrame()

    sub_map = {}
    sub_to_cat = {}
    if not sub_df.empty:
        for _, r in sub_df.iterrows():
            sid = int(r["ProductSubcategoryID"])
            sub_map[sid] = str(r["Name"]).strip()
            if pd.notna(r.get("ProductCategoryID")):
                sub_to_cat[sid] = int(r["ProductCategoryID"])

    cat_map = {}
    if not cat_df.empty:
        for _, r in cat_df.iterrows():
            cid = int(r["ProductCategoryID"])
            cat_map[cid] = str(r["Name"]).strip()

    # English descriptions via ProductModel
    model_desc_map = {}
    if desc_path.exists() and mpdc_path.exists():
        desc_df = pd.read_csv(desc_path, sep=None, engine="python")
        mpdc_df = pd.read_csv(mpdc_path, sep=None, engine="python")
        desc_dict = desc_df.set_index("ProductDescriptionID")["Description"].to_dict()
        en_mpdc = mpdc_df[mpdc_df["CultureID"].astype(str).str.strip() == "en"]
        for _, r in en_mpdc.iterrows():
            mid = int(r["ProductModelID"])
            did = int(r["ProductDescriptionID"])
            if did in desc_dict and mid not in model_desc_map:
                model_desc_map[mid] = str(desc_dict[did]).strip()

    items = []
    for _, r in prod_df.iterrows():
        pid = int(r["ProductID"])
        pname = str(r["Name"]).strip()
        pnum = str(r.get("ProductNumber", "")).strip()
        color = str(r.get("Color", "")).strip() if pd.notna(r.get("Color")) else ""
        list_price = float(r.get("ListPrice", 0.0))
        cost = float(r.get("StandardCost", 0.0))
        size = str(r.get("Size", "")).strip() if pd.notna(r.get("Size")) else ""
        sub_id = int(r["ProductSubcategoryID"]) if pd.notna(r.get("ProductSubcategoryID")) else None
        model_id = int(r["ProductModelID"]) if pd.notna(r.get("ProductModelID")) else None

        sub_name = sub_map.get(sub_id, "") if sub_id else ""
        cat_id = sub_to_cat.get(sub_id) if sub_id else None
        cat_name = cat_map.get(cat_id, "") if cat_id else ""
        description = model_desc_map.get(model_id, "") if model_id else ""

        # Rich searchable text
        text_parts = [f"Sản phẩm: {pname} (Mã SKU: {pnum})."]
        if cat_name or sub_name:
            cat_info = f"Phân loại: {cat_name}" if cat_name else ""
            if sub_name:
                cat_info += f" - {sub_name}" if cat_info else f"Phân loại: {sub_name}"
            text_parts.append(cat_info + ".")
        if color:
            text_parts.append(f"Màu sắc: {color}.")
        if size:
            text_parts.append(f"Kích cỡ: {size}.")
        if list_price > 0:
            text_parts.append(f"Giá niêm yết: ${list_price:,.2f} USD.")
        if cost > 0:
            text_parts.append(f"Chi phí tiêu chuẩn: ${cost:,.2f} USD.")
        if description:
            text_parts.append(f"Mô tả: {description}")

        searchable = " ".join(text_parts)

        items.append({
            "table": "Production_Product",
            "entity_type": "Product",
            "entity_id": pid,
            "name": pname,
            "searchable_text": searchable,
            "payload": {
                "source": "adventureworks",
                "table": "Production_Product",
                "entity_type": "Product",
                "entity_id": pid,
                "name": pname,
                "product_number": pnum,
                "category": cat_name,
                "subcategory": sub_name,
                "color": color,
                "size": size,
                "list_price": list_price,
                "standard_cost": cost,
                "description": description,
                "searchable_text": searchable
            }
        })

    print(f"  -> Prepared {len(items):,} Product records.")
    return items


def process_vendors(data_dir: Path) -> List[Dict[str, Any]]:
    """Loads and serializes 104 Purchasing Vendors."""
    print("\n--- [2/5] Processing Purchasing_Vendor ---")
    v_path = data_dir / "Purchasing_Vendor.csv"
    if not v_path.exists():
        print(f"  [!] Missing {v_path}")
        return []

    vendor_df = pd.read_csv(v_path, sep=None, engine="python")
    items = []
    for _, r in vendor_df.iterrows():
        vid = int(r["BusinessEntityID"])
        vname = str(r["Name"]).strip()
        acc_num = str(r.get("AccountNumber", "")).strip()
        credit = int(r.get("CreditRating", 1)) if pd.notna(r.get("CreditRating")) else 1
        pref = bool(r.get("PreferredVendorStatus", False))
        active = bool(r.get("ActiveFlag", True))

        pref_str = "Đối tác ưu tiên (Preferred)" if pref else "Nhà cung cấp tiêu chuẩn"
        active_str = "Đang hoạt động" if active else "Ngừng cung ứng"

        searchable = (
            f"Nhà cung cấp: {vname} (Mã đối tác: {acc_num}, ID: {vid}). "
            f"Hạng mức tín dụng: Cấp {credit}. Tình trạng hợp tác: {pref_str}. "
            f"Trạng thái hoạt động: {active_str}. "
            f"Chuyên cung ứng linh kiện và thiết bị sản xuất cho doanh nghiệp."
        )

        items.append({
            "table": "Purchasing_Vendor",
            "entity_type": "Vendor",
            "entity_id": vid,
            "name": vname,
            "searchable_text": searchable,
            "payload": {
                "source": "adventureworks",
                "table": "Purchasing_Vendor",
                "entity_type": "Vendor",
                "entity_id": vid,
                "name": vname,
                "account_number": acc_num,
                "credit_rating": credit,
                "preferred_vendor": pref,
                "active_flag": active,
                "searchable_text": searchable
            }
        })

    print(f"  -> Prepared {len(items):,} Vendor records.")
    return items


def process_stores(data_dir: Path) -> List[Dict[str, Any]]:
    """Loads and serializes 701 B2B Retail Stores."""
    print("\n--- [3/5] Processing Sales_Store ---")
    s_path = data_dir / "Sales_Store.csv"
    if not s_path.exists():
        print(f"  [!] Missing {s_path}")
        return []

    store_df = pd.read_csv(s_path, sep=None, engine="python")
    items = []
    for _, r in store_df.iterrows():
        sid = int(r["BusinessEntityID"])
        sname = str(r["Name"]).strip()
        demo = parse_store_demographics(r.get("Demographics", ""))

        sales = demo.get("AnnualSales", "")
        revenue = demo.get("AnnualRevenue", "")
        btype = demo.get("BusinessType", "B2B")
        specialty = demo.get("Specialty", "")
        year_opened = demo.get("YearOpened", "")
        employees = demo.get("NumberEmployees", "")
        sqft = demo.get("SquareFeet", "")

        parts = [f"Đại lý Doanh nghiệp: {sname} (Mã đối tác: {sid}). Loại hình: {btype}."]
        if specialty:
            parts.append(f"Chuyên môn phân phối: {specialty}.")
        if sales:
            try:
                parts.append(f"Doanh số hàng năm: ${float(sales):,.2f} USD.")
            except ValueError:
                parts.append(f"Doanh số: {sales}.")
        if year_opened:
            parts.append(f"Năm thành lập: {year_opened}.")
        if employees:
            parts.append(f"Quy mô: {employees} nhân viên, diện tích {sqft} ft².")

        searchable = " ".join(parts)

        items.append({
            "table": "Sales_Store",
            "entity_type": "Store",
            "entity_id": sid,
            "name": sname,
            "searchable_text": searchable,
            "payload": {
                "source": "adventureworks",
                "table": "Sales_Store",
                "entity_type": "Store",
                "entity_id": sid,
                "name": sname,
                "business_type": btype,
                "specialty": specialty,
                "annual_sales": float(sales) if sales and sales.replace(".", "", 1).isdigit() else 0.0,
                "annual_revenue": float(revenue) if revenue and revenue.replace(".", "", 1).isdigit() else 0.0,
                "year_opened": int(year_opened) if year_opened and year_opened.isdigit() else 0,
                "searchable_text": searchable
            }
        })

    print(f"  -> Prepared {len(items):,} Store records.")
    return items


def process_customers(data_dir: Path, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Loads and serializes Customers with resolved Person/Store names."""
    print("\n--- [4/5] Processing Sales_Customer ---")
    c_path = data_dir / "Sales_Customer.csv"
    p_path = data_dir / "Person_Person.csv"
    s_path = data_dir / "Sales_Store.csv"

    if not c_path.exists():
        print(f"  [!] Missing {c_path}")
        return []

    cust_df = pd.read_csv(c_path, sep=None, engine="python")
    person_dict = {}
    if p_path.exists():
        p_df = pd.read_csv(p_path, sep=None, engine="python")
        p_df["FullName"] = p_df["FirstName"].fillna("") + " " + p_df["LastName"].fillna("")
        person_dict = p_df.set_index("BusinessEntityID")["FullName"].to_dict()

    store_dict = {}
    if s_path.exists():
        s_df = pd.read_csv(s_path, sep=None, engine="python")
        store_dict = s_df.set_index("BusinessEntityID")["Name"].to_dict()

    if limit and limit < len(cust_df):
        cust_df = cust_df.head(limit)

    items = []
    for _, r in cust_df.iterrows():
        cid = int(r["CustomerID"])
        sid = r.get("StoreID")
        pid = r.get("PersonID")
        acc_num = str(r.get("AccountNumber", "")).strip()
        tid = int(r["TerritoryID"]) if pd.notna(r.get("TerritoryID")) else 0

        cname = None
        ctype = "Individual"
        tier = "Khách hàng Cá nhân (B2C)"

        if pd.notna(sid) and int(sid) in store_dict:
            cname = store_dict[int(sid)]
            ctype = "Store"
            tier = "Đại lý Doanh nghiệp (Enterprise Partner)"
        elif pd.notna(pid) and int(pid) in person_dict:
            cname = person_dict[int(pid)].strip()

        if not cname:
            cname = f"Customer #{cid}"

        searchable = (
            f"Khách hàng: {cname} (Mã KH: {cid}, Số tài khoản: {acc_num}). "
            f"Phân loại đối tượng: {tier} ({ctype}). "
            f"Khu vực lãnh thổ kinh doanh: Territory #{tid}."
        )

        items.append({
            "table": "Sales_Customer",
            "entity_type": "Customer",
            "entity_id": cid,
            "name": cname,
            "searchable_text": searchable,
            "payload": {
                "source": "adventureworks",
                "table": "Sales_Customer",
                "entity_type": "Customer",
                "entity_id": cid,
                "name": cname,
                "account_number": acc_num,
                "customer_type": ctype,
                "tier": tier,
                "territory_id": tid,
                "searchable_text": searchable
            }
        })

    print(f"  -> Prepared {len(items):,} Customer records.")
    return items


def process_orders(data_dir: Path, max_orders: int = 5000) -> List[Dict[str, Any]]:
    """Loads and serializes key SalesOrders with top product line items."""
    print(f"\n--- [5/5] Processing Sales_SalesOrderHeader (Top {max_orders:,} Orders) ---")
    h_path = data_dir / "Sales_SalesOrderHeader.csv"
    d_path = data_dir / "Sales_SalesOrderDetail.csv"
    p_path = data_dir / "Production_Product.csv"

    if not h_path.exists():
        print(f"  [!] Missing {h_path}")
        return []

    header_df = pd.read_csv(h_path, sep=None, engine="python")
    # Sort by TotalDue descending to prioritize major orders for semantic search
    header_df = header_df.sort_values(by="TotalDue", ascending=False).head(max_orders)

    order_prods = {}
    if d_path.exists() and p_path.exists():
        detail_df = pd.read_csv(d_path, sep=None, engine="python")
        prod_df = pd.read_csv(p_path, sep=None, engine="python")
        p_names = prod_df.set_index("ProductID")["Name"].to_dict()

        target_ids = set(header_df["SalesOrderID"])
        sub_details = detail_df[detail_df["SalesOrderID"].isin(target_ids)]
        for so_id, grp in sub_details.groupby("SalesOrderID"):
            prod_list = [p_names.get(pid, f"Product #{pid}") for pid in grp["ProductID"].unique()[:4]]
            order_prods[so_id] = prod_list

    items = []
    for _, r in header_df.iterrows():
        so_id = int(r["SalesOrderID"])
        so_num = str(r.get("SalesOrderNumber", f"SO{so_id}")).strip()
        date = str(r["OrderDate"]).strip()
        due = float(r.get("TotalDue", 0.0))
        cid = int(r["CustomerID"])
        prods = order_prods.get(so_id, [])
        prod_str = ", ".join(prods) if prods else "Các sản phẩm linh kiện thể thao"

        searchable = (
            f"Đơn hàng giao dịch: #{so_id} (Số hiệu: {so_num}). "
            f"Khách hàng đặt: Customer #{cid}. Ngày giao dịch: {date}. "
            f"Tổng giá trị đơn hàng: ${due:,.2f} USD. "
            f"Danh mục sản phẩm đặt mua: {prod_str}."
        )

        items.append({
            "table": "Sales_SalesOrderHeader",
            "entity_type": "SalesOrder",
            "entity_id": so_id,
            "name": f"Đơn hàng #{so_id} ({so_num})",
            "searchable_text": searchable,
            "payload": {
                "source": "adventureworks",
                "table": "Sales_SalesOrderHeader",
                "entity_type": "SalesOrder",
                "entity_id": so_id,
                "order_number": so_num,
                "order_date": date,
                "customer_id": cid,
                "total_due": due,
                "year": int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else 0,
                "searchable_text": searchable
            }
        })

    print(f"  -> Prepared {len(items):,} SalesOrder records.")
    return items


def batch_upsert(client: QdrantClient, model: SentenceTransformer, items: List[Dict[str, Any]], batch_size: int = 250) -> int:
    """Encodes texts and upserts points into Qdrant."""
    if not items:
        return 0

    total_upserted = 0
    num_batches = (len(items) + batch_size - 1) // batch_size

    for b_idx in range(num_batches):
        batch = items[b_idx * batch_size : (b_idx + 1) * batch_size]
        texts = [it["searchable_text"] for it in batch]
        vectors = model.encode(texts, batch_size=len(texts), show_progress_bar=False)

        points = []
        for it, vec in zip(batch, vectors):
            pt_id = get_deterministic_id(it["table"], it["entity_id"])
            points.append(models.PointStruct(
                id=pt_id,
                vector=vec.tolist(),
                payload=it["payload"]
            ))

        client.upsert(collection_name=COLLECTION_NAME, points=points)
        total_upserted += len(points)
        if (b_idx + 1) % 5 == 0 or (b_idx + 1) == num_batches:
            print(f"     Batch {b_idx + 1}/{num_batches}: Upserted {total_upserted:,} / {len(items):,} points")

    return total_upserted


def main():
    parser = argparse.ArgumentParser(description="Ingest AdventureWorks Entities into Qdrant")
    parser.add_argument("--data-dir", default=os.getenv("ADV_DATA_DIR", "D:/adventureworks"), help="Path to AdventureWorks CSV directory")
    parser.add_argument("--qdrant-host", default=os.getenv("QDRANT_HOST", "localhost"), help="Qdrant host")
    parser.add_argument("--qdrant-port", type=int, default=int(os.getenv("QDRANT_PORT", 6333)), help="Qdrant port")
    parser.add_argument("--max-orders", type=int, default=5000, help="Max SalesOrders to vectorize (default: top 5,000 by TotalDue)")
    parser.add_argument("--skip-customers", action="store_true", help="Skip 19k customers if only indexing catalog & orders")
    args = parser.parse_args()

    data_dir = Path(args.data_dir).resolve()
    print("=" * 70)
    print(" GRAPHMIND — INGEST ADVENTUREWORKS SEMANTIC VECTORS INTO QDRANT")
    print("=" * 70)
    print(f"Data Directory:    {data_dir}")
    print(f"Target Collection: {COLLECTION_NAME}")
    print(f"Qdrant Endpoint:   http://{args.qdrant_host}:{args.qdrant_port}")

    t_start = time.time()

    # 1. Connect to Qdrant & ensure collection
    client = QdrantClient(host=args.qdrant_host, port=args.qdrant_port, timeout=15)
    ensure_qdrant_collection(client, COLLECTION_NAME)

    # 2. Load Embedding Model
    print(f"\n[*] Loading SentenceTransformer('all-MiniLM-L6-v2')...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    assert model.get_sentence_embedding_dimension() == VECTOR_DIM, "Embedding dimension mismatch"
    print(f"[✓] Model ready (Embedding dimension: {VECTOR_DIM}).")

    # 3. Process Entities
    all_items: List[Dict[str, Any]] = []

    # Products (504)
    products = process_products(data_dir)
    all_items.extend(products)

    # Vendors (104)
    vendors = process_vendors(data_dir)
    all_items.extend(vendors)

    # Stores (701)
    stores = process_stores(data_dir)
    all_items.extend(stores)

    # Customers (19,820 or skipped)
    if not args.skip_customers:
        customers = process_customers(data_dir)
        all_items.extend(customers)

    # Orders (top max_orders)
    if args.max_orders > 0:
        orders = process_orders(data_dir, max_orders=args.max_orders)
        all_items.extend(orders)

    total_entities = len(all_items)
    print(f"\n[*] Total entities to vectorize: {total_entities:,}")

    # 4. Upsert into Qdrant in batches
    print(f"\n[*] Encoding and upserting points into collection '{COLLECTION_NAME}'...")
    total_upserted = batch_upsert(client, model, all_items, batch_size=250)

    # 5. Verification
    col_info = client.get_collection(COLLECTION_NAME)
    elapsed = round(time.time() - t_start, 2)

    print("\n" + "=" * 70)
    print(" INGESTION FINISHED SUCCESSFULLY!")
    print("=" * 70)
    print(f"Collection:            {COLLECTION_NAME}")
    print(f"Total Points in Qdrant: {col_info.points_count:,}")
    print(f"New Points Upserted:    {total_upserted:,}")
    print(f"Execution Time:        {elapsed}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
