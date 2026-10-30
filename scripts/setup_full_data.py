#!/usr/bin/env python3
"""
GraphMind / AEGIS — One-Command Data Setup
Module: scripts/setup_full_data.py

Sets up full data coverage across all 3 layers for new clones:
  1. Checks if pre-indexed DB snapshot exists (Instant Start).
  2. If raw datasets are present, populates Central Storage and indexes Neo4j + Qdrant.
  3. Verifies 100% data coverage across all 3 layers (PASS).
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import zipfile
import subprocess
import logging
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
logger = logging.getLogger("SetupFullData")


def check_and_extract_archives():
    """Extract zip archives if present in repository root."""
    db_zip = REPO_ROOT / "graphmind_db_snapshot.zip"
    if db_zip.exists() and not (REPO_ROOT / "qdrant_data").exists():
        logger.info(f"Extracting pre-indexed databases from {db_zip.name}...")
        with zipfile.ZipFile(db_zip, "r") as zf:
            zf.extractall(REPO_ROOT)
        logger.info("Database snapshot extracted successfully!")

    raw_zip = REPO_ROOT / "graphmind_raw_datasets.zip"
    if raw_zip.exists() and not (REPO_ROOT / "legal").exists():
        logger.info(f"Extracting raw datasets from {raw_zip.name}...")
        with zipfile.ZipFile(raw_zip, "r") as zf:
            zf.extractall(REPO_ROOT)
        logger.info("Raw datasets extracted successfully!")


def run_cmd(cmd: list):
    """Run command and log output."""
    logger.info(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=str(REPO_ROOT))
    if res.returncode != 0:
        logger.warning(f"Command exited with code {res.returncode}")
    return res.returncode


def main():
    logger.info("=" * 65)
    logger.info("  GRAPHMIND / AEGIS — AUTOMATED DATA SETUP")
    logger.info("=" * 65)

    check_and_extract_archives()

    # 1. Start Docker infrastructure
    logger.info("Checking Docker infrastructure...")
    run_cmd(["docker", "compose", "up", "-d", "neo4j", "qdrant", "file-watcher"])

    # 2. Populate Central Storage if containers are ready
    logger.info("Populating Central Document Storage...")
    run_cmd([sys.executable, "scripts/populate_central_storage.py"])

    # 3. Ingest Neo4j Knowledge Graph (if needed)
    logger.info("Ensuring Neo4j Knowledge Graph entities & relationships...")
    run_cmd([sys.executable, "scripts/ingest_adventureworks_graph.py"])
    run_cmd([sys.executable, "scripts/ingest_all_documents_neo4j.py"])

    # 4. Ingest Qdrant Vector DB (if missing)
    logger.info("Ensuring Qdrant Vector DB 100% data coverage...")
    run_cmd([sys.executable, "scripts/ingest_missing_coverage.py"])

    # 5. Final 3-Layer Verification
    logger.info("\nRunning final 3-layer verification...")
    run_cmd([sys.executable, "scripts/verify_three_layers.py"])


if __name__ == "__main__":
    main()
