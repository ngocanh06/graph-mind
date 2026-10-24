import os
import sys
import tarfile
import io
import subprocess
from pathlib import Path

import argparse

ROOT_DIR = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser(description="Populate Central Document Storage in Docker Volume")
parser.add_argument("--cuad-dir", default=os.getenv("CUAD_DIR", "D:/CUAD_v1/full_contract_pdf"), help="Directory containing CUAD contract PDFs")
parser.add_argument("--adv-dir", default=os.getenv("ADV_DIR", "D:/adventureworks"), help="Directory containing AdventureWorks CSVs")
parser.add_argument("--container", default="aegis_file_watcher", help="Docker container name mounting /data")
parser.add_argument("--pack-tar", default=str(ROOT_DIR / "central_storage_pack.tar"), help="Path to pre-packaged tar file if available")
args = parser.parse_args()

CUAD_DIR = Path(args.cuad_dir)
ADV_DIR = Path(args.adv_dir)
CONTAINER_NAME = args.container
PREPACKED_TAR = Path(args.pack_tar)
if not PREPACKED_TAR.exists() and Path("central_storage_pack.tar").exists():
    PREPACKED_TAR = Path("central_storage_pack.tar")

print("="*60)
print(" POPULATING DOCKER NAMED VOLUME: graph-mind_graphmind_documents")
print("="*60)

# Ensure canonical folders exist in /data
subprocess.run(
    ["docker", "exec", CONTAINER_NAME, "mkdir", "-p",
     "/data/legal", "/data/sales", "/data/accounting_procurement", "/data/it", "/data/rnd"],
    check=True
)

# Fast path: If pre-packaged central_storage_pack.tar already exists, extract directly!
if PREPACKED_TAR.exists():
    print(f"[*] Found pre-packaged archive: {PREPACKED_TAR} ({PREPACKED_TAR.stat().st_size / (1024*1024):.2f} MB)")
    print(f"[*] Extracting into container {CONTAINER_NAME}:/data/ ...")
    with open(PREPACKED_TAR, "rb") as f:
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
    print("[✓] Extraction from pre-packaged archive completed successfully!")
    # Verify and exit
    total_res = subprocess.run(
        ["docker", "exec", CONTAINER_NAME, "sh", "-c", "find /data -type f | wc -l"],
        capture_output=True, text=True, check=True
    )
    print(f"[✓] TOTAL FILES IN CENTRAL DOCUMENT STORAGE: {total_res.stdout.strip()} files")
    sys.exit(0)

if not CUAD_DIR.exists():
    print(f"ERROR: {CUAD_DIR} does not exist!")
    print("Provide the correct path with --cuad-dir <path> or place central_storage_pack.tar in the root directory.")
    sys.exit(1)

if not ADV_DIR.exists():
    print(f"ERROR: {ADV_DIR} does not exist!")
    print("Provide the correct path with --adv-dir <path> or place central_storage_pack.tar in the root directory.")
    sys.exit(1)

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
tar_stream_path = ROOT_DIR / "central_storage_pack.tar"
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
