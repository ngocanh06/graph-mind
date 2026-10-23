import os
import sys
import tarfile
import io
import subprocess
from pathlib import Path

CUAD_DIR = Path("D:/CUAD_v1/full_contract_pdf")
ADV_DIR = Path("D:/adventureworks")
CONTAINER_NAME = "aegis_file_watcher"

print("="*60)
print(" POPULATING DOCKER NAMED VOLUME: graph-mind_graphmind_documents")
print("="*60)

if not CUAD_DIR.exists():
    print(f"ERROR: {CUAD_DIR} does not exist!")
    sys.exit(1)

if not ADV_DIR.exists():
    print(f"ERROR: {ADV_DIR} does not exist!")
    sys.exit(1)

# Ensure canonical folders exist in /data
subprocess.run(
    ["docker", "exec", CONTAINER_NAME, "mkdir", "-p",
     "/data/legal", "/data/sales", "/data/accounting_procurement", "/data/it", "/data/rnd"],
    check=True
)

# Collect all CUAD PDFs
cuad_files = []
for root, _, files in os.walk(CUAD_DIR):
    for f in files:
        if f.lower().endswith(".pdf"):
            cuad_files.append((Path(root) / f, f"legal/{f}"))

print(f"[*] Found {len(cuad_files)} CUAD contract PDFs.")

# Collect all AdventureWorks CSVs
adv_files = []
for f in os.listdir(ADV_DIR):
    if not f.lower().endswith(".csv"):
        continue
    filepath = ADV_DIR / f
    if f.startswith(("Sales_", "Person_")):
        dest = f"sales/{f}"
    elif f.startswith(("Purchasing_", "HumanResources_")):
        dest = f"accounting_procurement/{f}"
    elif f.startswith("Production_"):
        dest = f"rnd/{f}"
    else:
        dest = f"it/{f}"
    adv_files.append((filepath, dest))

print(f"[*] Found {len(adv_files)} AdventureWorks CSV files.")
all_items = cuad_files + adv_files
print(f"[*] Total files to copy into Central Storage: {len(all_items)}")

# Create streaming tar archive to pipe into docker exec
tar_stream_path = Path("D:/graph-mind/central_storage_pack.tar")
print(f"[*] Creating archive {tar_stream_path}...")
with tarfile.open(tar_stream_path, "w") as tar:
    for src_path, arc_rel in all_items:
        tar.add(src_path, arcname=arc_rel)

tar_size_mb = tar_stream_path.stat().st_size / (1024 * 1024)
print(f"[*] Tar archive created: {tar_size_mb:.2f} MB")

print(f"[*] Extracting into container {CONTAINER_NAME}:/data/ ...")
with open(tar_stream_path, "rb") as f:
    proc = subprocess.Popen(
        ["docker", "exec", "-i", CONTAINER_NAME, "tar", "-xf", "-", "-C", "/data"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = proc.communicate(input=f.read())

if proc.returncode != 0:
    print(f"ERROR extracting tar: {stderr.decode()}")
    sys.exit(1)

print("[✓] Extraction into Docker Named Volume completed successfully!")

# Remove local tar package
if tar_stream_path.exists():
    tar_stream_path.unlink()

print("\n[*] Verifying file counts inside Central Storage Volume (/data):")
for dept in ["legal", "sales", "accounting_procurement", "rnd", "it"]:
    res = subprocess.run(
        ["docker", "exec", CONTAINER_NAME, "sh", "-c", f"find /data/{dept} -type f | wc -l"],
        capture_output=True, text=True, check=True
    )
    print(f"  /data/{dept}: {res.stdout.strip()} files")

total_res = subprocess.run(
    ["docker", "exec", CONTAINER_NAME, "sh", "-c", "find /data -type f | wc -l"],
    capture_output=True, text=True, check=True
)
print(f"\n[✓] TOTAL FILES IN CENTRAL DOCUMENT STORAGE: {total_res.stdout.strip()} files")
