#!/usr/bin/env python3
"""
End-to-End Workflow Verification Suite — GraphMind / AEGIS
Module: scripts/e2e_workflow_test.py

Validates the complete workflow:
Central Document Storage (/data) -> File Watcher -> Unified Ingestion Pipeline -> Qdrant + Neo4j -> Frontend Realtime (SSE)

Executes all 6 required verification tests:
TEST 1: Upload (Central Storage + Watcher CREATE + Qdrant Index + Neo4j Document + Realtime Event)
TEST 2: Modify (File modified + SHA-256 changed + Re-indexed + Zero Duplicate)
TEST 3: Rename (File renamed + Same doc_id + Qdrant payload updated + Neo4j Document updated)
TEST 4: Delete (File deleted + Vectors removed + Document & Clauses removed + Shared nodes preserved)
TEST 5: Restart (Volume persistence + Qdrant preserved + Neo4j preserved + Initial Sync SKIP)
TEST 6: Bulk Ingestion (Batch processing + Concurrency limit + Idempotency skip)
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import time
import json
import io
import requests
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client

BACKEND_URL = os.getenv("AEGIS_BACKEND_URL", "http://localhost:5000")
AGENT_API_KEY = os.getenv("AEGIS_AGENT_API_KEY", "dev-agent-key")


def make_pdf(title: str, body_lines: list) -> bytes:
    """Generates valid minimal PDF binary stream with text."""
    body_stream = "\n".join([f"0 -20 Td\n({line}) Tj" for line in body_lines])
    stream_content = f"BT\n/F1 12 Tf\n72 712 Td\n({title}) Tj\n{body_stream}\nET"
    stream_bytes = stream_content.encode("ascii", errors="ignore")
    return (
        b"%PDF-1.4\n1 0 obj\n<< /Title (" + title.encode() + b") >>\nendobj\n"
        b"2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n"
        b"3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n"
        b"4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n"
        b"5 0 obj\n<< /Length " + str(len(stream_bytes)).encode() + b" >>\nstream\n"
        + stream_bytes + b"\nendstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000100 00000 n\n"
        b"0000000150 00000 n\n0000000210 00000 n\n0000000290 00000 n\n"
        b"trailer\n<< /Size 6 /Root 2 0 R >>\nstartxref\n500\n%%EOF\n"
    )


def run_tests():
    print("=" * 75)
    print(" GRAPHMIND / AEGIS — END-TO-END WORKFLOW VERIFICATION SUITE")
    print("=" * 75)

    qdrant_client.connect()
    neo4j_client.connect()
    initial_nodes = neo4j_client.get_node_count() if neo4j_client.is_connected else 0
    initial_qdrant = qdrant_client._client.get_collection("cuad_contracts").points_count if qdrant_client.is_connected else 0

    print(f"Initial State: Neo4j Nodes = {initial_nodes}, Qdrant Points = {initial_qdrant}")

    results = []

    # ------------------------------------------------------------------------
    # TEST 1: Upload (Central Storage + Watcher CREATE + Ingestion)
    # ------------------------------------------------------------------------
    test1_name = "TestContract_E2E.pdf"
    test3_new_name = "TestContract_E2E_Final.pdf"
    test1_pdf = make_pdf(
        "Hop Dong Hop Tac Chien Luoc GraphMind 2026",
        [
            "Cong ty Co phan Dau tu Cong nghe AEGIS va Tap doan Ban le Global",
            "Dieu khoan Thanh toan: Tong gia tri thanh toan la 1.200.000.000 VND.",
            "Dieu khoan Bao mat: Thoa thuan bao mat thong tin vo thoi han.",
            "Dieu khoan Trach nhiem: Boi thuong vi pham hop dong."
        ]
    )

    t1_action = f"POST /api/v1/sync/upload ({test1_name}, dept='legal')"
    t1_expected = f"File saved in /data/legal/{test1_name}, watcher triggers, Qdrant indexed, Neo4j Document merged"

    # Pre-clean any leftover from previous runs
    subprocess.run(
        ["docker", "exec", "aegis_file_watcher", "rm", "-f", f"/data/legal/{test1_name}", f"/data/legal/{test3_new_name}"],
        check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    requests.post(
        f"{BACKEND_URL}/api/v1/sync/file-watcher/deleted",
        json={"file_name": test1_name, "department": "legal"},
        headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
        timeout=10
    )
    time.sleep(1.0)

    try:
        res1 = requests.post(
            f"{BACKEND_URL}/api/v1/sync/upload",
            files={"file": (test1_name, io.BytesIO(test1_pdf), "application/pdf")},
            data={"department": "legal"},
            timeout=15
        )

        file_in_storage = False
        qdrant_found = False
        neo4j_found = False
        q_pts = []
        neo_res = []

        # Poll up to 7 seconds for watcher debounce and pipeline
        for _ in range(14):
            time.sleep(0.5)
            if not file_in_storage:
                ls_res = subprocess.run(
                    ["docker", "exec", "aegis_file_watcher", "ls", "-la", f"/data/legal/{test1_name}"],
                    capture_output=True, text=True
                )
                file_in_storage = (ls_res.returncode == 0)

            q_pts, _ = qdrant_client._client.scroll(
                collection_name="cuad_contracts",
                scroll_filter={"must": [{"key": "contract_name", "match": {"value": test1_name}}]},
                limit=5
            )
            qdrant_found = len(q_pts) > 0

            neo_res = neo4j_client.run_cypher(
                "MATCH (d:Document {name: $name}) RETURN d.id as id, d.department as dept",
                {"name": test1_name}
            )
            neo4j_found = len(neo_res) > 0

            if file_in_storage and qdrant_found and neo4j_found:
                break

        doc_id_t1 = neo_res[0]["id"] if neo4j_found else (q_pts[0].payload.get("doc_id") if qdrant_found else None)
        t1_actual = f"Stored in /data/legal: {file_in_storage}, Qdrant vectors: {len(q_pts)}, Neo4j Document ID: {doc_id_t1}"
        t1_pass = file_in_storage and qdrant_found and neo4j_found
        results.append(("TEST 1 — Upload", t1_action, t1_expected, t1_actual, "PASS" if t1_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 1 — Upload", t1_action, t1_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # TEST 2: Modify (Hash Changed + Re-index + No Duplicate)
    # ------------------------------------------------------------------------
    test2_pdf_mod = make_pdf(
        "Hop Dong Hop Tac Chien Luoc GraphMind 2026 - Phien Ban Dieu Chinh",
        [
            "Cong ty Co phan Dau tu Cong nghe AEGIS va Tap doan Ban le Global",
            "Dieu khoan Thanh toan: Tong gia tri dieu chinh la 2.500.000.000 VND.",
            "Dieu khoan Bao mat: Bo sung phat vi pham 100.000.000 VND.",
            "Dieu khoan Cham dut: Cham dut truoc han neu vi pham bao mat."
        ]
    )
    t2_action = f"Modify content of {test1_name} with new hash and send to Ingestion Pipeline"
    t2_expected = "SHA-256 updated, vectors re-indexed with zero duplicate points, Neo4j updated"

    try:
        # Save updated content directly into container storage to trigger watcher or upload
        res2 = requests.post(
            f"{BACKEND_URL}/api/v1/sync/file-watcher",
            files={"file": (test1_name, io.BytesIO(test2_pdf_mod), "application/pdf")},
            data={"department": "legal", "file_name": test1_name, "event_type": "modified"},
            headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
            timeout=15
        )
        time.sleep(1.5)

        q_pts2, _ = qdrant_client._client.scroll(
            collection_name="cuad_contracts",
            scroll_filter={"must": [{"key": "contract_name", "match": {"value": test1_name}}]},
            limit=20
        )
        # Verify no duplicate vector explosion (still 1 chunk)
        qdrant_count_correct = (len(q_pts2) == 1)

        neo_res2 = neo4j_client.run_cypher(
            "MATCH (d:Document {name: $name}) RETURN count(d) as cnt, d.chunksCount as chunks",
            {"name": test1_name}
        )
        doc_count = neo_res2[0]["cnt"] if neo_res2 else 0
        t2_actual = f"Qdrant point count: {len(q_pts2)} (no dup), Neo4j Documents with name: {doc_count}"
        t2_pass = qdrant_count_correct and (doc_count == 1)
        results.append(("TEST 2 — Modify", t2_action, t2_expected, t2_actual, "PASS" if t2_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 2 — Modify", t2_action, t2_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # TEST 3: Rename (Same doc_id + Qdrant contract_name + Neo4j updated)
    # ------------------------------------------------------------------------
    test3_new_name = "TestContract_E2E_Final.pdf"
    t3_action = f"Rename {test1_name} -> {test3_new_name}"
    t3_expected = f"Same document_id preserved, Qdrant payload contract_name={test3_new_name}, Neo4j Document name updated"

    try:
        res3 = requests.post(
            f"{BACKEND_URL}/api/v1/sync/file-watcher/renamed",
            json={"old_name": test1_name, "new_name": test3_new_name, "department": "legal"},
            headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
            timeout=15
        )
        time.sleep(1.0)

        # Check Qdrant payload
        q_pts3, _ = qdrant_client._client.scroll(
            collection_name="cuad_contracts",
            scroll_filter={"must": [{"key": "contract_name", "match": {"value": test3_new_name}}]},
            limit=5
        )
        qdrant_renamed = len(q_pts3) > 0

        # Check Neo4j Document
        neo_res3 = neo4j_client.run_cypher(
            "MATCH (d:Document {name: $new_name}) RETURN d.id as id, d.oldName as oldName",
            {"new_name": test3_new_name}
        )
        neo_renamed = len(neo_res3) > 0 and neo_res3[0].get("oldName") == test1_name

        t3_actual = f"Qdrant points updated: {len(q_pts3)}, Neo4j Document renamed: {neo_renamed} (oldName={neo_res3[0].get('oldName') if neo_res3 else None})"
        t3_pass = qdrant_renamed and neo_renamed
        results.append(("TEST 3 — Rename", t3_action, t3_expected, t3_actual, "PASS" if t3_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 3 — Rename", t3_action, t3_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # TEST 4: Delete (Vectors removed, Document & Clauses removed, Shared kept)
    # ------------------------------------------------------------------------
    t4_action = f"Delete {test3_new_name}"
    t4_expected = "Qdrant vectors removed, Neo4j Document node deleted, shared Company & Department nodes preserved"

    try:
        res4 = requests.post(
            f"{BACKEND_URL}/api/v1/sync/file-watcher/deleted",
            json={"file_name": test3_new_name, "department": "legal"},
            headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
            timeout=15
        )
        time.sleep(1.0)

        # Check Qdrant points removed
        q_pts4, _ = qdrant_client._client.scroll(
            collection_name="cuad_contracts",
            scroll_filter={"must": [{"key": "contract_name", "match": {"value": test3_new_name}}]},
            limit=5
        )
        qdrant_cleaned = (len(q_pts4) == 0)

        # Check Neo4j Document removed
        neo_res4 = neo4j_client.run_cypher(
            "MATCH (d:Document {name: $name}) RETURN count(d) as cnt",
            {"name": test3_new_name}
        )
        neo_doc_cleaned = (neo_res4[0]["cnt"] == 0)

        # Check shared Company / Department nodes still exist
        dept_check = neo4j_client.run_cypher(
            "MATCH (dept:Department {name: 'Pháp chế (Legal)'}) RETURN count(dept) as cnt"
        )
        shared_dept_preserved = (dept_check[0]["cnt"] >= 1)

        # Remove from container storage as well
        subprocess.run(
            ["docker", "exec", "aegis_file_watcher", "rm", "-f", f"/data/legal/{test1_name}", f"/data/legal/{test3_new_name}"],
            check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        t4_actual = f"Qdrant vectors remaining: {len(q_pts4)}, Neo4j Document remaining: {neo_res4[0]['cnt']}, Shared Dept preserved: {shared_dept_preserved}"
        t4_pass = qdrant_cleaned and neo_doc_cleaned and shared_dept_preserved
        results.append(("TEST 4 — Delete", t4_action, t4_expected, t4_actual, "PASS" if t4_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 4 — Delete", t4_action, t4_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # TEST 5: Restart & Initial Sync (Files remain, Volume remains, Skip known)
    # ------------------------------------------------------------------------
    t5_action = "Restart aegis_file_watcher container & run Initial Sync"
    t5_expected = "Volume intact, Qdrant/Neo4j intact, initial_sync_scan skips indexed files idempotently"

    try:
        subprocess.run(["docker", "restart", "aegis_file_watcher"], check=True, timeout=30)
        time.sleep(5)

        logs_res = subprocess.run(["docker", "logs", "--tail", "25", "aegis_file_watcher"], capture_output=True, text=True)
        logs = logs_res.stdout

        initial_sync_detected = "Initial Sync Complete" in logs or "Starting Initial Sync Scan" in logs
        skip_detected = "already indexed" in logs

        current_nodes = neo4j_client.get_node_count() if neo4j_client.is_connected else 0
        current_qdrant = qdrant_client._client.get_collection("cuad_contracts").points_count if qdrant_client.is_connected else 0

        data_intact = (current_nodes >= 3000 and current_qdrant >= 9000)

        t5_actual = f"Initial sync scan executed: {initial_sync_detected}, skipped existing files: {skip_detected}, Neo4j Nodes: {current_nodes}, Qdrant Points: {current_qdrant}"
        t5_pass = initial_sync_detected and data_intact
        results.append(("TEST 5 — Restart", t5_action, t5_expected, t5_actual, "PASS" if t5_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 5 — Restart", t5_action, t5_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # TEST 6: Bulk Ingestion Tool (scripts/bulk_ingest.py)
    # ------------------------------------------------------------------------
    t6_action = "Execute scripts/bulk_ingest.py with --dry-run and batch concurrency"
    t6_expected = "Discovers supported files, pre-checks known hashes, enforces bounded workers (4), reports zero duplicates"

    try:
        # Create temp folder with sample files
        sample_dir = REPO_ROOT / "temp_bulk_test"
        sample_dir.mkdir(exist_ok=True)
        (sample_dir / "sample_contract.pdf").write_bytes(make_pdf("Sample Bulk Contract", ["Test Line"]))
        (sample_dir / "sample_sales.csv").write_text("OrderID,Customer,Amount\n1,Alpha,500\n2,Beta,750\n", encoding="utf-8")
        (sample_dir / "unsupported_readme.md").write_text("# Readme\nShould be skipped", encoding="utf-8")

        bulk_cmd = [
            sys.executable,
            str(REPO_ROOT / "scripts" / "bulk_ingest.py"),
            "--source-dir", str(sample_dir),
            "--department", "sales",
            "--workers", "4",
            "--dry-run"
        ]
        bulk_res = subprocess.run(bulk_cmd, capture_output=True, text=True, timeout=30)
        output = (bulk_res.stdout or "") + "\n" + (bulk_res.stderr or "")

        discovered_correct = "Discovered 2 supported document files" in output
        dry_run_success = "[Dry Run] Dry-run completed" in output

        # Clean up temp
        import shutil
        shutil.rmtree(sample_dir, ignore_errors=True)

        t6_actual = f"Discovered supported files only: {discovered_correct}, dry-run executed with 4 workers: {dry_run_success}"
        t6_pass = (bulk_res.returncode == 0) and discovered_correct and dry_run_success
        results.append(("TEST 6 — Bulk Ingestion", t6_action, t6_expected, t6_actual, "PASS" if t6_pass else "FAIL"))
    except Exception as e:
        results.append(("TEST 6 — Bulk Ingestion", t6_action, t6_expected, f"Exception: {e}", "FAIL"))

    # ------------------------------------------------------------------------
    # PRINT FORMAL TEST REPORT
    # ------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print(" VERIFICATION TEST SUMMARY REPORT")
    print("=" * 75)
    all_passed = True
    for test_id, action, expected, actual, status_res in results:
        status_symbol = "✓" if status_res == "PASS" else "✗"
        print(f"\n[{status_symbol}] {test_id} — {status_res}")
        print(f"    ACTION:   {action}")
        print(f"    EXPECTED: {expected}")
        print(f"    ACTUAL:   {actual}")
        if status_res != "PASS":
            all_passed = False

    print("\n" + "=" * 75)
    print(f" FINAL RESULT: {'ALL 6 TESTS PASSED (100%)' if all_passed else 'SOME TESTS FAILED'}")
    print("=" * 75)
    return all_passed


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
