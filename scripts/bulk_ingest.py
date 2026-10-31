#!/usr/bin/env python3
"""
Bulk Ingestion Tool — GraphMind / AEGIS
Module: scripts/bulk_ingest.py

Bulk dataset loader for CUAD and AdventureWorks datasets into Central Document Storage,
Qdrant Vector DB, and Neo4j Knowledge Graph via the Unified Core Ingestion Pipeline.

Features:
- Bounded concurrency with ThreadPoolExecutor (workers: 4-8)
- SHA-256 Idempotency Guard (pre-checks known hashes, skips existing files)
- Copies files into Central Document Storage (/data/{canonical_dept}/)
- Zero data destruction: preserves existing collections and database state
- Progress logging with batching and error isolation
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import time
import hashlib
import argparse
import logging
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Set, Optional

# Setup root path for importing backend pipeline directly if available
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Supported business document extensions
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout
)
logger = logging.getLogger("BulkIngest")


def calculate_sha256(filepath: Path) -> str:
    """Calculates SHA-256 hash in 64KB blocks."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def detect_department(filepath: Path, default_dept: str = "auto") -> str:
    """Infer canonical department from path or default."""
    if default_dept and default_dept != "auto":
        return default_dept

    clean = str(filepath).lower().replace("\\", "/")
    if any(k in clean for k in ["legal", "cuad", "contract", "phap_che", "hợp đồng"]):
        return "legal"
    if any(k in clean for k in ["sales", "order", "kinh_doanh", "crm"]):
        return "sales"
    if any(k in clean for k in ["procurement", "accounting", "ke_toan", "purchase"]):
        return "accounting_procurement"
    if any(k in clean for k in ["it", "tech", "hardware", "software"]):
        return "it"
    if any(k in clean for k in ["rnd", "r&d", "research", "product"]):
        return "rnd"

    return "legal"


def get_backend_known_hashes(backend_url: str) -> Set[str]:
    """Fetch known hashes from backend to skip already-indexed files."""
    try:
        url = f"{backend_url.rstrip('/')}/api/v1/sync/file-watcher/known-hashes"
        res = requests.get(url, timeout=8)
        if res.ok:
            data = res.json()
            return set(data.get("hashes", []))
    except Exception as e:
        logger.warning(f"Could not fetch known hashes from backend: {e}")
    return set()


def ingest_file_via_http(
    filepath: Path,
    department: str,
    backend_url: str,
    api_key: str,
    file_hash: str
) -> Dict[str, Any]:
    """Transmits file via HTTP webhook to backend."""
    url = f"{backend_url.rstrip('/')}/api/v1/sync/file-watcher"
    headers = {"Authorization": f"Bearer {api_key}"}

    with open(filepath, "rb") as f:
        files = {"file": (filepath.name, f)}
        data = {
            "file_hash": file_hash,
            "department": department,
            "file_name": filepath.name,
            "event_type": "created"
        }
        res = requests.post(url, headers=headers, data=data, files=files, timeout=60)
        if res.ok:
            return {"success": True, "data": res.json()}
        return {"success": False, "error": f"HTTP {res.status_code}: {res.text[:120]}"}


def ingest_file_via_direct_pipeline(
    filepath: Path,
    department: str,
    file_hash: str
) -> Dict[str, Any]:
    """Invokes backend pipeline directly if running in the same Python environment."""
    try:
        from app.modules.m1_data_sync.pipeline import process_document_ingestion
        with open(filepath, "rb") as f:
            content_bytes = f.read()
        return process_document_ingestion(
            content_bytes=content_bytes,
            filename=filepath.name,
            department=department,
            event_type="created",
            allow_skip_known=True
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


def copy_to_storage_volume(filepath: Path, department: str, storage_root: Path) -> None:
    """Copies source file to central storage volume /data/{department}/."""
    try:
        if storage_root.exists():
            target_dir = storage_root / department
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / filepath.name
            if not target_file.exists():
                import shutil
                shutil.copy2(filepath, target_file)
    except Exception as e:
        logger.debug(f"Note copying to storage volume: {e}")


def process_single_item(
    item_info: Dict[str, Any],
    backend_url: str,
    api_key: str,
    use_direct: bool,
    storage_root: Path
) -> Dict[str, Any]:
    filepath: Path = item_info["path"]
    department = item_info["department"]
    fhash = item_info["hash"]

    # 1. Copy to Central Document Storage
    copy_to_storage_volume(filepath, department, storage_root)

    # 2. Ingest
    if use_direct:
        result = ingest_file_via_direct_pipeline(filepath, department, fhash)
    else:
        result = ingest_file_via_http(filepath, department, backend_url, api_key, fhash)

    return {
        "filename": filepath.name,
        "department": department,
        "hash": fhash,
        "result": result
    }


def main():
    parser = argparse.ArgumentParser(description="GraphMind / AEGIS Bulk Dataset Ingestion CLI")
    parser.add_argument("--source-dir", required=True, help="Directory containing dataset files (.pdf, .docx, .xlsx, .csv)")
    parser.add_argument("--department", default="auto", help="Canonical department (legal, sales, accounting_procurement, it, rnd, or 'auto')")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent worker threads (default: 4)")
    parser.add_argument("--backend-url", default=os.getenv("AEGIS_BACKEND_URL", "http://localhost:5000"), help="Backend URL")
    parser.add_argument("--api-key", default=os.getenv("AEGIS_AGENT_API_KEY", "dev-agent-key"), help="Agent API Key")
    parser.add_argument("--storage-root", default=os.getenv("GRAPH_MIND_DATA_DIR", "/data"), help="Central storage path")
    parser.add_argument("--direct", action="store_true", help="Directly invoke backend Python pipeline (in-process)")
    parser.add_argument("--dry-run", action="store_true", help="Scan and compute hashes only, do not index")
    args = parser.parse_args()

    source_dir = Path(args.source_dir).resolve()
    if not source_dir.exists():
        logger.error(f"Source directory does not exist: {source_dir}")
        sys.exit(1)

    storage_root = Path(args.storage_root)

    logger.info("=" * 65)
    logger.info(" GRAPHMIND / AEGIS — UNIFIED BULK DATASET INGESTION")
    logger.info("=" * 65)
    logger.info(f"Source Directory: {source_dir}")
    logger.info(f"Target Storage:   {storage_root}")
    logger.info(f"Department:       {args.department}")
    logger.info(f"Concurrency:      {args.workers} workers")
    logger.info(f"Mode:             {'Direct In-Process' if args.direct else f'HTTP Webhook ({args.backend_url})'}")
    logger.info("=" * 65)

    # 1. Discover supported files
    all_files: List[Path] = []
    for root, _, files in os.walk(source_dir):
        for f in sorted(files):
            fp = Path(root) / f
            if fp.suffix.lower() in SUPPORTED_EXTENSIONS and not f.startswith((".", "~")):
                all_files.append(fp)

    total_found = len(all_files)
    logger.info(f"Discovered {total_found} supported document files (.pdf, .docx, .xlsx, .csv).")

    if total_found == 0:
        logger.info("No matching documents found. Exiting.")
        sys.exit(0)

    # 2. Retrieve known hashes for Idempotency Guard
    known_hashes = set()
    if not args.dry_run:
        known_hashes = get_backend_known_hashes(args.backend_url)
        logger.info(f"Retrieved {len(known_hashes)} known document hashes from GraphMind.")

    # 3. Filter files by SHA-256 hash
    to_process = []
    skipped_count = 0

    logger.info("Computing file hashes and checking idempotency...")
    for idx, fp in enumerate(all_files, start=1):
        try:
            fhash = calculate_sha256(fp)
            if fhash in known_hashes:
                skipped_count += 1
            else:
                dept = detect_department(fp, args.department)
                to_process.append({
                    "path": fp,
                    "department": dept,
                    "hash": fhash
                })
        except Exception as e:
            logger.warning(f"Error computing hash for {fp.name}: {e}")

    logger.info(f"Pre-check complete: {len(to_process)} to ingest, {skipped_count} already indexed (SKIP).")

    if args.dry_run:
        logger.info("[Dry Run] Dry-run completed. No files modified or indexed.")
        sys.exit(0)

    if not to_process:
        logger.info("All files are already up-to-date in Knowledge Base. Nothing to ingest!")
        sys.exit(0)

    # 4. Execute Batch Ingestion with bounded concurrency
    success_count = 0
    failed_count = 0
    start_time = time.time()

    logger.info(f"Starting bulk ingestion of {len(to_process)} documents with {args.workers} workers...")

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(
                process_single_item,
                item,
                args.backend_url,
                args.api_key,
                args.direct,
                storage_root
            ): item for item in to_process
        }

        for idx, future in enumerate(as_completed(futures), start=1):
            item = futures[future]
            fname = item["path"].name
            try:
                res = future.result()
                ingest_res = res.get("result", {})
                if ingest_res.get("success") or ingest_res.get("status") in ("ingested", "skipped"):
                    success_count += 1
                    status_str = "SUCCESS" if ingest_res.get("status") != "skipped" else "SKIPPED"
                    logger.info(f"[{idx}/{len(to_process)}] {status_str}: {fname} [{item['department']}]")
                else:
                    failed_count += 1
                    logger.warning(f"[{idx}/{len(to_process)}] FAILED: {fname} — {ingest_res.get('error')}")
            except Exception as e:
                failed_count += 1
                logger.error(f"[{idx}/{len(to_process)}] EXCEPTION: {fname} — {e}")

    duration = round(time.time() - start_time, 2)
    logger.info("=" * 65)
    logger.info(" BULK INGESTION REPORT")
    logger.info("=" * 65)
    logger.info(f"Total Discovered:   {total_found}")
    logger.info(f"Already Indexed:    {skipped_count} (skipped)")
    logger.info(f"Successfully Added: {success_count}")
    logger.info(f"Failed / Errored:   {failed_count}")
    logger.info(f"Total Elapsed Time: {duration}s")
    logger.info("=" * 65)


if __name__ == "__main__":
    main()
