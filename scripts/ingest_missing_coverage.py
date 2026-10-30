#!/usr/bin/env python3
"""
GraphMind / AEGIS — Missing Document Coverage Ingestion
Module: scripts/ingest_missing_coverage.py

Achieves 100% Vector DB coverage in Qdrant (FR17 & FR22) for all original datasets:
  - 510 CUAD Contracts (legal/*.pdf)
  - 71 AdventureWorks Business Datasets (sales, rnd, accounting_procurement, it/*.csv)

Zero synthetic/new data created. Uses only the original dataset files already on disk.
Only processes files missing from Qdrant cuad_contracts collection.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import time
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Set, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.qdrant.client import qdrant_client
from app.db.neo4j.client import neo4j_client
from app.modules.m1_data_sync.pipeline import process_document_ingestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout
)
logger = logging.getLogger("CoverageIngest")


def get_indexed_contracts_in_qdrant() -> Set[str]:
    """Scroll Qdrant to find all contract_name values currently present."""
    qdrant_client.connect()
    col = qdrant_client._collection
    indexed = set()
    offset = None
    while True:
        pts, offset = qdrant_client._client.scroll(
            col,
            limit=1000,
            offset=offset,
            with_payload=['contract_name'],
            with_vectors=False
        )
        for p in pts:
            if p.payload and p.payload.get("contract_name"):
                indexed.add(p.payload.get("contract_name"))
        if not offset:
            break
    return indexed


def find_original_files() -> Tuple[Dict[str, Path], Dict[str, Tuple[Path, str]]]:
    """Discover all original CUAD PDFs and AW CSVs from disk."""
    cuad_files: Dict[str, Path] = {}
    for ext in ["*.pdf", "*.PDF"]:
        for p in (REPO_ROOT / "legal").glob(ext):
            cuad_files[p.name] = p

    aw_files: Dict[str, Tuple[Path, str]] = {}
    dept_dirs = ["sales", "rnd", "accounting_procurement", "it"]
    for dept in dept_dirs:
        dept_path = REPO_ROOT / dept
        if dept_path.exists():
            for p in dept_path.glob("*.csv"):
                aw_files[p.name] = (p, dept)

    return cuad_files, aw_files


def ingest_single_file(filepath: Path, dept: str) -> Dict[str, Any]:
    """Process a single file into Qdrant and Neo4j via core pipeline."""
    try:
        content_bytes = filepath.read_bytes()
        res = process_document_ingestion(
            content_bytes=content_bytes,
            filename=filepath.name,
            department=dept,
            event_type="created",
            allow_skip_known=False
        )
        qdrant_ok = res.get("data", {}).get("qdrant_indexed", False)
        return {"name": filepath.name, "dept": dept, "success": res.get("success", False) and qdrant_ok, "res": res}
    except Exception as e:
        return {"name": filepath.name, "dept": dept, "success": False, "error": str(e)}


def main():
    logger.info("=" * 65)
    logger.info("  GRAPHMIND / AEGIS — QDRANT 100% DATA COVERAGE INGESTION")
    logger.info("=" * 65)

    # 1. Connect and discover existing coverage
    logger.info("Connecting to Qdrant...")
    indexed_in_qdrant = get_indexed_contracts_in_qdrant()
    qdrant_cuad = {c for c in indexed_in_qdrant if c.lower().endswith(".pdf")}
    qdrant_aw = {c for c in indexed_in_qdrant if c.lower().endswith(".csv")}

    logger.info(f"Current Qdrant coverage:")
    logger.info(f"  CUAD PDFs:           {len(qdrant_cuad)} / 510")
    logger.info(f"  AdventureWorks CSVs: {len(qdrant_aw)} / 71")
    logger.info(f"  Total distinct:      {len(indexed_in_qdrant)} / 581")

    # 2. Discover local files
    cuad_files, aw_files = find_original_files()
    logger.info(f"Discovered on disk: {len(cuad_files)} CUAD PDFs, {len(aw_files)} AW CSVs (Total: {len(cuad_files) + len(aw_files)})")

    missing_aw_names = sorted(list(set(aw_files.keys()) - qdrant_aw))
    missing_cuad_names = sorted(list(set(cuad_files.keys()) - qdrant_cuad))

    logger.info(f"Identified missing files to vectorize:")
    logger.info(f"  Missing AW CSVs:  {len(missing_aw_names)}")
    logger.info(f"  Missing CUAD PDFs: {len(missing_cuad_names)}")
    logger.info(f"  Total to ingest:  {len(missing_aw_names) + len(missing_cuad_names)}")

    if not missing_aw_names and not missing_cuad_names:
        logger.info("All files are already 100% indexed in Qdrant! Nothing to do.")
        return

    start_time = time.time()

    # 3. Process missing AW CSVs first (fast)
    if missing_aw_names:
        logger.info("\n" + "-" * 50)
        logger.info(f"Phase 1: Ingesting {len(missing_aw_names)} missing AdventureWorks CSVs...")
        logger.info("-" * 50)
        for idx, name in enumerate(missing_aw_names, start=1):
            fp, dept = aw_files[name]
            r = ingest_single_file(fp, dept)
            status = "OK" if r.get("success") else "ERR"
            logger.info(f"[{idx}/{len(missing_aw_names)}] [{status}] {name} ({dept})")

    # 4. Process missing CUAD PDFs sequentially (rock-solid, zero C++ threading crashes)
    if missing_cuad_names:
        logger.info("\n" + "-" * 50)
        logger.info(f"Phase 2: Ingesting {len(missing_cuad_names)} missing CUAD PDFs (sequential safe mode)...")
        logger.info("-" * 50)
        success_count = 0
        failed_count = 0

        for idx, name in enumerate(missing_cuad_names, start=1):
            try:
                res = ingest_single_file(cuad_files[name], "legal")
                if res.get("success"):
                    success_count += 1
                    logger.info(f"[{idx}/{len(missing_cuad_names)}] [OK] {name}")
                else:
                    failed_count += 1
                    logger.warning(f"[{idx}/{len(missing_cuad_names)}] [FAIL] {name}: {res.get('error')}")
            except Exception as e:
                failed_count += 1
                logger.error(f"[{idx}/{len(missing_cuad_names)}] [EXC] {name}: {e}")

        logger.info(f"Phase 2 complete: {success_count} succeeded, {failed_count} failed.")

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"\nIngestion elapsed time: {elapsed}s")

    # 5. Final Verification of Qdrant Coverage
    logger.info("\n" + "=" * 65)
    logger.info("  FINAL VERIFICATION — QDRANT DATA COVERAGE")
    logger.info("=" * 65)
    final_indexed = get_indexed_contracts_in_qdrant()
    final_cuad = [c for c in final_indexed if c.lower().endswith(".pdf")]
    final_aw = [c for c in final_indexed if c.lower().endswith(".csv")]

    cuad_pass = len(final_cuad) >= 510
    aw_pass = len(final_aw) >= 71
    total_pass = len(final_indexed) >= 581

    logger.info(f"  CUAD PDFs in Qdrant:         {len(final_cuad)} / 510  -> {'PASS' if cuad_pass else 'FAIL'}")
    logger.info(f"  AdventureWorks in Qdrant:    {len(final_aw)} / 71   -> {'PASS' if aw_pass else 'FAIL'}")
    logger.info(f"  Total distinct in Qdrant:    {len(final_indexed)} / 581  -> {'PASS' if total_pass else 'FAIL'}")

    if cuad_pass and aw_pass and total_pass:
        logger.info("\n>>> 100% DATA COVERAGE ACHIEVED ACROSS ALL DATASETS! <<<")
        logger.info("=" * 65)
    else:
        logger.warning("\n>>> Coverage check found missing items! <<<")
        logger.info("=" * 65)
        sys.exit(1)


if __name__ == "__main__":
    main()
