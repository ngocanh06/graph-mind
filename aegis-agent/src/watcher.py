"""
AEGIS Local Agent — Central Storage File System Watcher Daemon
Module: M1 AEGIS Edge Watcher (aegis-agent/src/watcher.py)

Monitors Central Document Storage (/data) recursively for:
- CREATE: debounces, verifies size stability, transmits to backend for indexing
- MODIFY: verifies SHA-256 hash change before re-indexing
- RENAME: updates document name and history without re-embedding
- DELETE: cleans up document vectors in Qdrant and Document/Clause nodes in Neo4j
- INITIAL SYNC: scans volume on startup, checks known hashes, skips existing docs
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import time
import hashlib
import requests
from typing import Optional, Dict, Any, List
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from .config import (
    WATCH_ROOT,
    SUPPORTED_EXTENSIONS,
    SYNC_ENDPOINT,
    AGENT_API_KEY,
    CANONICAL_DEPARTMENTS,
    BACKEND_URL,
    FALLBACK_BACKEND_URL
)
from .sync_client import SyncClient

def _backend_request(method: str, path: str, **kwargs) -> Optional[requests.Response]:
    """Tries primary backend endpoint, falls back to host.docker.internal if unresolvable."""
    urls = [
        f"{BACKEND_URL.rstrip('/')}/api/v1/sync{path}",
        f"{FALLBACK_BACKEND_URL.rstrip('/')}/api/v1/sync{path}"
    ]
    for url in urls:
        try:
            resp = requests.request(method, url, **kwargs)
            return resp
        except requests.exceptions.RequestException:
            continue
    return None


def _detect_department_from_path(file_path: str) -> str:
    """Infer canonical department strictly based on parent folder hierarchy."""
    clean = file_path.lower().replace("\\", "/")
    segments = [s.strip() for s in clean.split("/") if s.strip()]

    # 1. Direct canonical folder matching (deepest segment first)
    for seg in reversed(segments[:-1]):
        if seg == "legal":
            return "Pháp chế (Legal)"
        if seg == "sales":
            return "Kinh doanh (Sales)"
        if seg == "accounting_procurement":
            return "Kế toán / Thu mua"
        if seg == "it":
            return "Công nghệ / IT"
        if seg == "rnd":
            return "R&D"

    # 2. Fallback to standard aliases in path segments
    for seg in reversed(segments[:-1]):
        if any(a in seg for a in ["phap_che", "phap che", "pháp chế", "legal"]):
            return "Pháp chế (Legal)"
        if any(a in seg for a in ["kinh_doanh", "kinh doanh", "sales"]):
            return "Kinh doanh (Sales)"
        if any(a in seg for a in ["ke_toan", "ke toan", "kế toán", "thu_mua", "thu mua"]):
            return "Kế toán / Thu mua"
        if any(a in seg for a in ["cong_nghe", "cong nghe", "công nghệ", "it"]):
            return "Công nghệ / IT"
        if any(a in seg for a in ["r&d", "rnd"]):
            return "R&D"

    return "Pháp chế (Legal)"


def _is_supported(file_path: str) -> bool:
    ext = Path(file_path).suffix.lower()
    name = os.path.basename(file_path)
    return ext in SUPPORTED_EXTENSIONS and not name.startswith(("~", "."))


def _wait_for_file_stable(file_path: str, max_attempts: int = 5, check_interval: float = 0.3) -> bool:
    """
    Debounce helper: Ensures file copy/writing has completely finished.
    Checks that file exists, size > 0, and size remains stable between 2 intervals.
    """
    time.sleep(check_interval)
    if not os.path.exists(file_path):
        return False

    prev_size = -1
    for _ in range(max_attempts):
        try:
            cur_size = os.path.getsize(file_path)
            if cur_size > 0 and cur_size == prev_size:
                return True
            prev_size = cur_size
            time.sleep(check_interval)
        except (OSError, PermissionError):
            time.sleep(check_interval)

    return os.path.exists(file_path) and os.path.getsize(file_path) > 0


class DocumentChangeHandler(FileSystemEventHandler):
    def __init__(self, sync_client: SyncClient):
        super().__init__()
        self.sync_client = sync_client
        self._debounce: dict = {}          # filepath -> timestamp
        self._known_hashes: dict = {}      # filepath -> sha256 hash
        self._debounce_sec = 2.0

    def _debounced(self, key: str, window: float = None) -> bool:
        """Returns True if we should skip processing (within debounce window)."""
        now = time.time()
        win = window if window is not None else self._debounce_sec
        last = self._debounce.get(key, 0)
        if (now - last < win and now >= last) or now < last:
            return True
        self._debounce[key] = now
        return False

    # ── CREATED ──────────────────────────────────────────────────────────
    def on_created(self, event):
        if event.is_directory:
            return
        if not _is_supported(event.src_path):
            ext = Path(event.src_path).suffix.lower()
            name = os.path.basename(event.src_path)
            if not name.startswith((".", "~")):
                print(f"[AEGIS Watcher] SKIP unsupported file: {name} (ext: '{ext}'). Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
            return
        self._ingest(event.src_path, "created")

    # ── MODIFIED ─────────────────────────────────────────────────────────
    def on_modified(self, event):
        if event.is_directory:
            return
        if not _is_supported(event.src_path):
            return
        self._ingest(event.src_path, "modified")

    # ── DELETED ──────────────────────────────────────────────────────────
    def on_deleted(self, event):
        if event.is_directory:
            return
        path = event.src_path
        if not _is_supported(path):
            return
        if self._debounced(f"del:{path}"):
            return

        filename = os.path.basename(path)
        dept = _detect_department_from_path(path)
        print(f"\n[AEGIS Watcher] ===================================================")
        print(f"[AEGIS Watcher] File DELETED: {filename}")
        print(f"[AEGIS Watcher] Notifying backend to remove vectors and Document node...")

        if path in self._known_hashes:
            del self._known_hashes[path]

        try:
            resp = _backend_request(
                "POST",
                "/file-watcher/deleted",
                json={"file_name": filename, "department": dept},
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                timeout=15
            )
            data = resp.json() if resp and resp.ok else {}
            print(f"[AEGIS Watcher] DELETE result: removed={data.get('removed_docs', 0)}, "
                  f"Neo4j={data.get('neo4j_removed')}, Qdrant={data.get('qdrant_removed')}")
        except Exception as e:
            print(f"[AEGIS Watcher] DELETE notify failed: {e}")
        print(f"[AEGIS Watcher] ===================================================\n")

    # ── RENAMED / MOVED ──────────────────────────────────────────────────
    def on_moved(self, event):
        if event.is_directory:
            return
        src, dest = event.src_path, event.dest_path

        if _is_supported(dest):
            if self._debounced(f"mv:{src}:{dest}"):
                return
            old_name = os.path.basename(src)
            new_name = os.path.basename(dest)
            dept = _detect_department_from_path(dest)

            # Extended debounce window for dest file so immediate on_created doesn't duplicate
            self._debounce[dest] = time.time() + 5.0
            self._debounce[f"mv:{src}:{dest}"] = time.time() + 5.0

            # Transfer hash tracking
            if src in self._known_hashes:
                self._known_hashes[dest] = self._known_hashes.pop(src)

            print(f"\n[AEGIS Watcher] ===================================================")
            print(f"[AEGIS Watcher] File RENAMED: {old_name} → {new_name}")
            try:
                resp = _backend_request(
                    "POST",
                    "/file-watcher/renamed",
                    json={"old_name": old_name, "new_name": new_name, "department": dept},
                    headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                    timeout=15
                )
                data = resp.json() if resp and resp.ok else {}
                print(f"[AEGIS Watcher] RENAME result: updated={data.get('updated_docs', 0)}")
            except Exception as e:
                print(f"[AEGIS Watcher] RENAME notify failed: {e}")
            print(f"[AEGIS Watcher] ===================================================\n")
        elif _is_supported(src):
            # Moved out of supported files -> treat as delete
            self.on_deleted(type("E", (), {"is_directory": False, "src_path": src})())

    # ── INGEST (CREATED / MODIFIED) ───────────────────────────────────────
    def _ingest(self, file_path: str, action: str):
        if self._debounced(file_path):
            return

        # Debounce: wait for copy to complete and verify file size is stable
        if not _wait_for_file_stable(file_path):
            return

        filename = os.path.basename(file_path)

        # Idempotency check: calculate SHA-256 hash before transmitting
        try:
            hasher = hashlib.sha256()
            with open(file_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            current_hash = hasher.hexdigest()
        except (OSError, PermissionError) as err:
            print(f"[AEGIS Watcher] File read error ({filename}): {err}")
            return

        # If modified but content is identical to last seen hash -> SKIP
        if action == "modified" and self._known_hashes.get(file_path) == current_hash:
            return

        dept = _detect_department_from_path(file_path)
        print(f"\n[AEGIS Watcher] ===================================================")
        print(f"[AEGIS Watcher] File {action.upper()}: {filename}")
        print(f"[AEGIS Watcher] Department: {dept} | Size: {os.path.getsize(file_path)} bytes | Hash: {current_hash[:12]}...")
        print(f"[AEGIS Watcher] Transmitting to Unified Ingestion Pipeline...")

        result = self.sync_client.sync_file(file_path, department=dept, event_type=action)
        if result.get("success"):
            self._known_hashes[file_path] = current_hash
            data = result.get("data", {}).get("data", {})
            print(f"[AEGIS Watcher] SUCCESS: doc_id={data.get('doc_id')}, "
                  f"chunks={data.get('chunks_extracted')}, "
                  f"Qdrant={data.get('qdrant_indexed')}, Neo4j={data.get('neo4j_synced')}")
        else:
            print(f"[AEGIS Watcher] FAILED: {result.get('error') or result.get('data')}")
        print(f"[AEGIS Watcher] ===================================================\n")


def initial_sync_scan(sync_client: SyncClient, watch_path: str) -> None:
    """
    On container startup, scans watch_path recursively.
    Queries backend for known SHA-256 hashes:
      - Already indexed: SKIP
      - New / Unindexed: INGEST
    Guarantees that restarting the container will NOT re-embed unchanged files.
    """
    print(f"\n[AEGIS Watcher] Starting Initial Sync Scan on: {watch_path}")
    known_hashes = set()
    try:
        resp = _backend_request("GET", "/file-watcher/known-hashes", timeout=8)
        if resp and resp.ok:
            known_hashes = set(resp.json().get("hashes", []))
            print(f"[AEGIS Watcher] Retrieved {len(known_hashes)} known hashes from GraphMind.")
    except Exception as e:
        print(f"[AEGIS Watcher] [Initial Sync] Query known-hashes note: {e}")

    synced_cnt = 0
    skipped_cnt = 0

    for root, _, files in os.walk(watch_path):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            if not _is_supported(fpath):
                continue
            try:
                # Safe read with retry for locked files
                content = None
                for _ in range(3):
                    try:
                        with open(fpath, "rb") as f:
                            content = f.read()
                        break
                    except (PermissionError, OSError):
                        time.sleep(0.2)

                if content is None or len(content) == 0:
                    continue

                fhash = hashlib.sha256(content).hexdigest()
                if fhash in known_hashes:
                    skipped_cnt += 1
                    continue

                dept = _detect_department_from_path(fpath)
                print(f"[AEGIS Watcher] [Initial Sync] Ingesting new file: {fname} [{dept}]")
                res = sync_client.sync_file(fpath, department=dept, event_type="created")
                if res.get("success"):
                    known_hashes.add(fhash)
                    synced_cnt += 1
            except Exception as ex:
                print(f"[AEGIS Watcher] [Initial Sync] Error reading {fname}: {ex}")

    print(f"[AEGIS Watcher] Initial Sync Complete: {synced_cnt} newly ingested, {skipped_cnt} already indexed.\n")


def start_watcher(watch_path: str = WATCH_ROOT):
    """Start recursive filesystem watcher daemon on Docker document volume."""
    os.makedirs(watch_path, exist_ok=True)
    for folder in CANONICAL_DEPARTMENTS:
        os.makedirs(os.path.join(watch_path, folder), exist_ok=True)

    sync_client = SyncClient()

    # 1. Run Initial Sync Scan to index any unindexed files
    initial_sync_scan(sync_client, watch_path)

    # 2. Start Realtime Filesystem Observer
    handler = DocumentChangeHandler(sync_client)
    observer = Observer()
    observer.schedule(handler, watch_path, recursive=True)
    observer.start()

    print(f"\n========================================================")
    print(f" AEGIS Central File Watcher Daemon — RUNNING")
    print(f" Storage Volume: {os.path.abspath(watch_path)}")
    print(f" Supported Types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    print(f" Events: CREATED · MODIFIED · DELETED · RENAMED")
    print(f" Backend Endpoint: {SYNC_ENDPOINT}")
    print(f"========================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[AEGIS Watcher] Stopping observer...")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    start_watcher()
