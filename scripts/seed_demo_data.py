"""
scripts/seed_demo_data.py — Khởi tạo Dữ liệu Mẫu Doanh nghiệp (Zero External Dependencies)

Dành cho thành viên nhóm mới clone project, KHÔNG CÓ sẵn file tar hoặc thư mục dataset nặng:
1. Tạo 5 tài liệu mẫu đại diện cho 5 phòng ban (Pháp chế, Kinh doanh, Kế toán, R&D, IT).
2. Tự động nạp vào Docker Volume: graph-mind_graphmind_documents (/data)
3. Kích hoạt Backend Ingestion Pipeline để sinh Vector (Qdrant) và Đồ thị (Neo4j).
4. Khởi tạo mạng lưới thực thể Khách hàng - Sản phẩm trong Neo4j.
"""

import os
import sys
import time
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTAINER_NAME = "aegis_file_watcher"

print("=" * 65)
print("  GRAPHMIND — SEEDING DEMO ENTERPRISE DATASET")
print("  (Zero External Dependencies Mode)")
print("=" * 65)

# Verify container is running
try:
    check = subprocess.run(["docker", "ps", "--filter", f"name={CONTAINER_NAME}", "--format", "{{.Names}}"], capture_output=True, text=True, check=True)
    if CONTAINER_NAME not in check.stdout:
        print(f"[!] Error: Docker container '{CONTAINER_NAME}' is not running.")
        print("    Please run 'docker compose up -d' first, then rerun this script.")
        sys.exit(1)
except Exception as e:
    print(f"[!] Docker check failed: {e}")
    sys.exit(1)

# Ensure canonical directories inside volume
subprocess.run(
    ["docker", "exec", CONTAINER_NAME, "mkdir", "-p",
     "/data/legal", "/data/sales", "/data/accounting_procurement", "/data/it", "/data/rnd"],
    check=True
)

demo_dir = REPO_ROOT / ".demo_seed_cache"
demo_dir.mkdir(exist_ok=True)

# 1. LEGAL CONTRACT SAMPLE
legal_file = demo_dir / "MSA_TechVanguard_Consulting_2026.txt"
legal_file.write_text("""MASTER SERVICES AGREEMENT (MSA)
Contract Reference: MSA-2026-TVC-089
Effective Date: January 15, 2026
Parties: TechVanguard Solutions Inc. ("Client") and Horizon AI Consulting Ltd. ("Service Provider")

1. SCOPE OF SERVICES:
The Service Provider agrees to deliver enterprise knowledge management, vector indexing, and hybrid GraphRAG architecture consulting services.

2. NON-COMPETE & EXCLUSIVITY CLAUSE:
During the term of this Agreement and for a period of twenty-four (24) months following termination, the Service Provider shall not directly or indirectly provide enterprise graph indexing services to any direct competitor of the Client in North America.

3. CONFIDENTIALITY & GOVERNING LAW:
All proprietary algorithms, prompt templates, and graph schemas disclosed under this Agreement shall remain strictly confidential. This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.

4. LIMITATION OF LIABILITY:
Except for gross negligence or willful misconduct, either party's maximum aggregate liability arising under this Agreement shall not exceed the total fees paid in the twelve (12) months preceding the claim, capped at $1,000,000 USD.
""", encoding="utf-8")

# 2. ADVENTUREWORKS SAMPLES (SALES & RND)
prod_cat_file = demo_dir / "Production_ProductCategory.csv"
prod_cat_file.write_text("ProductCategoryID,Name\n1,Bikes\n2,Components\n3,Clothing\n4,Accessories\n", encoding="utf-8")

prod_subcat_file = demo_dir / "Production_ProductSubcategory.csv"
prod_subcat_file.write_text("ProductSubcategoryID,ProductCategoryID,Name\n1,1,Mountain Bikes\n2,1,Road Bikes\n3,4,Helmets\n", encoding="utf-8")

prod_file = demo_dir / "Production_Product.csv"
prod_file.write_text("""ProductID,Name,ProductNumber,ListPrice,StandardCost,Color,ProductSubcategoryID
101,Mountain-100 Silver,BK-M18S-42,3399.99,1912.15,Silver,1
102,Road-150 Red,BK-R15R-48,1500.00,850.50,Red,2
103,Sport-100 Helmet Red,HL-U509-R,34.99,13.08,Red,3
""", encoding="utf-8")

cust_file = demo_dir / "Sales_Customer.csv"
cust_file.write_text("CustomerID,PersonID,StoreID,TerritoryID\n29485,,1010,1\n29486,,1011,1\n11000,11000,,1\n", encoding="utf-8")

store_file = demo_dir / "Sales_Store.csv"
store_file.write_text("BusinessEntityID,Name\n1010,Progressive Sports Retail Ltd.\n1011,Advanced Mountain Outfitters\n", encoding="utf-8")

person_file = demo_dir / "Person_Person.csv"
person_file.write_text("BusinessEntityID,FirstName,LastName\n11000,Jon,Yang\n", encoding="utf-8")

order_hdr_file = demo_dir / "Sales_SalesOrderHeader.csv"
order_hdr_file.write_text("SalesOrderID,CustomerID,TotalDue\n43659,29485,23153.23\n43660,11000,1457.99\n", encoding="utf-8")

order_dtl_file = demo_dir / "Sales_SalesOrderDetail.csv"
order_dtl_file.write_text("SalesOrderID,SalesOrderDetailID,ProductID,OrderQty,UnitPrice\n43659,1,101,2,3399.99\n43660,2,103,1,34.99\n", encoding="utf-8")

# 3. ACCOUNTING & PROCUREMENT SAMPLE
proc_file = demo_dir / "Purchasing_Vendor_Directory.csv"
proc_file.write_text("VendorID,AccountNumber,Name,CreditRating,PreferredVendorStatus\n1,AUSTRALIA0001,Australia Bike Supply,1,1\n2,CHICAGO0001,Chicago Components Co.,2,1\n", encoding="utf-8")

# 4. IT & SYSTEM ARCHITECTURE SAMPLE
it_file = demo_dir / "IT_System_Architecture_Overview.txt"
it_file.write_text("""GRAPHMIND (AEGIS EKMP) ENTERPRISE ARCHITECTURE SPECIFICATION
Document ID: ARCH-2026-V2

1. Core Architecture:
- 3-Layer Hybrid GraphRAG uniting Vector Semantic Search (Qdrant) and Property Graph Traversal (Neo4j).
- Central Docker Volume storage: graph-mind_graphmind_documents mounted at /data.
- Real-time Edge File Watcher with SHA-256 deduplication and debounce event batching.
- Multi-format parser supporting PDF, CSV, Excel (XLSX), DOCX, and TXT.

2. Security & Compliance:
- Zero data leakage to public third-party APIs (Air-gapped on-premise execution).
- Role-Based Access Control (RBAC) across Legal, Sales, Procurement, IT, and R&D.
""", encoding="utf-8")

print("[*] Copying sample documents into Central Storage Docker Volume (/data)...")

subprocess.run(["docker", "cp", str(legal_file), f"{CONTAINER_NAME}:/data/legal/"], check=True)
subprocess.run(["docker", "cp", str(prod_cat_file), f"{CONTAINER_NAME}:/data/rnd/"], check=True)
subprocess.run(["docker", "cp", str(prod_subcat_file), f"{CONTAINER_NAME}:/data/rnd/"], check=True)
subprocess.run(["docker", "cp", str(prod_file), f"{CONTAINER_NAME}:/data/rnd/"], check=True)
subprocess.run(["docker", "cp", str(cust_file), f"{CONTAINER_NAME}:/data/sales/"], check=True)
subprocess.run(["docker", "cp", str(store_file), f"{CONTAINER_NAME}:/data/sales/"], check=True)
subprocess.run(["docker", "cp", str(person_file), f"{CONTAINER_NAME}:/data/sales/"], check=True)
subprocess.run(["docker", "cp", str(order_hdr_file), f"{CONTAINER_NAME}:/data/sales/"], check=True)
subprocess.run(["docker", "cp", str(order_dtl_file), f"{CONTAINER_NAME}:/data/sales/"], check=True)
subprocess.run(["docker", "cp", str(proc_file), f"{CONTAINER_NAME}:/data/accounting_procurement/"], check=True)
subprocess.run(["docker", "cp", str(it_file), f"{CONTAINER_NAME}:/data/it/"], check=True)

print("[OK] Sample files copied to Central Storage!")
print("[*] Waiting 3 seconds for File Watcher daemon to detect and index files...")
time.sleep(3)

# Build Graph in Neo4j using the generated samples
print("[*] Ingesting Demo Customer-Product Graph into Neo4j...")
try:
    subprocess.run([sys.executable, str(REPO_ROOT / "scripts" / "ingest_adventureworks_graph.py"), "--data-dir", str(demo_dir)], check=True)
except Exception as e:
    print(f"[!] Graph ingestion warning: {e}")

print("\n" + "=" * 65)
print(" [OK] DEMO DATA SEEDING COMPLETE!")
print(" Central Storage, Qdrant Vector DB, and Neo4j Graph DB now have live data.")
print(" You can now test AI Copilot at: http://localhost:5173")
print("=" * 65 + "\n")
