#!/usr/bin/env python3
"""
GraphMind / AEGIS — Data Packaging Tool
Module: scripts/package_data_snapshot.py

Creates lightweight, deployable ZIP packages for sharing project data:
  1. Datasets Bundle (graphmind_raw_datasets.zip):
     Contains 510 CUAD PDFs and 71 AdventureWorks CSVs (~120 MB compressed).
  2. Database Snapshot (graphmind_db_snapshot.zip):
     Contains pre-indexed Qdrant vector DB and Neo4j graph DB stores (~180 MB compressed).
"""

import sys
import os
import zipfile
import logging
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
logger = logging.getLogger("DataPackager")


def zip_directories(zip_path: Path, dirs_to_zip: list, root_dir: Path):
    """Compresses specified directories into a single ZIP file."""
    logger.info(f"Creating archive: {zip_path.name}...")
    total_files = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for d in dirs_to_zip:
            target = root_dir / d
            if not target.exists():
                logger.warning(f"Directory not found: {d}")
                continue
            for root, _, files in os.walk(target):
                for f in files:
                    fp = Path(root) / f
                    rel = fp.relative_to(root_dir)
                    zf.write(fp, rel)
                    total_files += 1
    size_mb = round(zip_path.stat().st_size / (1024 * 1024), 2)
    logger.info(f"Done! {total_files} files packaged into {zip_path.name} ({size_mb} MB)")


def main():
    logger.info("=" * 60)
    logger.info("  GRAPHMIND — DATA PACKAGING UTILITY")
    logger.info("=" * 60)

    # 1. Package Raw Datasets (581 files: legal, sales, rnd, accounting_procurement, it)
    raw_dirs = ["legal", "sales", "rnd", "accounting_procurement", "it"]
    raw_zip = REPO_ROOT / "graphmind_raw_datasets.zip"
    zip_directories(raw_zip, raw_dirs, REPO_ROOT)

    # 2. Package Database Snapshot (qdrant_data, neo4j_data)
    # Note: Docker containers using bind mounts can be packed directly
    db_dirs = ["qdrant_data", "neo4j_data"]
    db_zip = REPO_ROOT / "graphmind_db_snapshot.zip"
    zip_directories(db_zip, db_dirs, REPO_ROOT)

    logger.info("=" * 60)
    logger.info("PACKAGING COMPLETE!")
    logger.info(f"1. Raw Datasets:    {raw_zip}")
    logger.info(f"2. Pre-indexed DB: {db_zip}")
    logger.info("You can upload these archives to Google Drive, OneDrive, or GitHub Releases.")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
