"""
AEGIS Local Agent — File System Watcher Daemon
Module: M1 AEGIS Edge Watcher (aegis-agent/src/watcher.py)

Monitors specified local SME directories for document creation/modifications,
debounces filesystem events, and automatically transmits files via secure HTTPS
webhook to GraphMind Backend Cloud for Graph & Vector extraction.
"""

import sys
# Fix UnicodeEncodeError on Windows cp1252 console when printing Vietnamese text
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os
import time
import requests
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from .config import WATCH_ROOT, SUPPORTED_EXTENSIONS, SYNC_ENDPOINT, AGENT_API_KEY, CANONICAL_DEPARTMENTS
from .sync_client import SyncClient

BASE_URL = SYNC_ENDPOINT.rsplit("/file-watcher", 1)[0]  # http://localhost:5000/api/v1/sync


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

    return "Kinh doanh (Sales)"




def _is_supported(file_path: str) -> bool:
    ext = Path(file_path).suffix.lower()
    name = os.path.basename(file_path)
    return ext in SUPPORTED_EXTENSIONS and not name.startswith(("~", "."))


class DocumentChangeHandler(FileSystemEventHandler):
    def __init__(self, sync_client: SyncClient):
        super().__init__()
        self.sync_client = sync_client
        self._debounce: dict = {}      # filepath -> last_processed timestamp
        self._debounce_sec = 2.0

    def _debounced(self, key: str, window: float = None) -> bool:
        """Returns True if we should skip (within debounce window)."""
        now = time.time()
        win = window if window is not None else self._debounce_sec
        last = self._debounce.get(key, 0)
        if (now - last < win and now >= last) or now < last:
            return True
        self._debounce[key] = now
        return False

    # ── CREATED ──────────────────────────────────────────────────────────
    def on_created(self, event):
        if not event.is_directory and _is_supported(event.src_path):
            self._ingest(event.src_path, "created")

    # ── MODIFIED ─────────────────────────────────────────────────────────
    def on_modified(self, event):
        if not event.is_directory and _is_supported(event.src_path):
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
        print(f"[AEGIS Watcher] Notifying backend to remove from index...")

        try:
            resp = requests.post(
                f"{BASE_URL}/file-watcher/deleted",
                json={"file_name": filename, "department": dept},
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                timeout=15
            )
            data = resp.json() if resp.ok else {}
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
        # If dest is still a supported file type → rename, else treat as delete
        if _is_supported(dest):
            if self._debounced(f"mv:{src}:{dest}"):
                return
            old_name = os.path.basename(src)
            new_name = os.path.basename(dest)
            dept = _detect_department_from_path(dest)
            # Extended debounce window (6.0s) for dest file so immediate on_created/on_modified don't overwrite rename event
            self._debounce[dest] = time.time() + 6.0
            self._debounce[f"mv:{src}:{dest}"] = time.time() + 6.0
            print(f"\n[AEGIS Watcher] ===================================================")
            print(f"[AEGIS Watcher] File RENAMED: {old_name} → {new_name}")
            try:
                resp = requests.post(
                    f"{BASE_URL}/file-watcher/renamed",
                    json={"old_name": old_name, "new_name": new_name, "department": dept},
                    headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                    timeout=15
                )
                data = resp.json() if resp.ok else {}
                print(f"[AEGIS Watcher] RENAME result: updated={data.get('updated_docs', 0)}")
            except Exception as e:
                print(f"[AEGIS Watcher] RENAME notify failed: {e}")
            print(f"[AEGIS Watcher] ===================================================\n")
        elif _is_supported(src):
            # Moved out of watched folder → treat as delete
            self.on_deleted(type("E", (), {"is_directory": False, "src_path": src})())

    # ── INGEST (CREATED / MODIFIED) ───────────────────────────────────────
    def _ingest(self, file_path: str, action: str):
        if self._debounced(file_path):
            return

        # Wait briefly for OS to finish writing
        time.sleep(0.3)
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            return

        filename = os.path.basename(file_path)
        dept = _detect_department_from_path(file_path)
        print(f"\n[AEGIS Watcher] ===================================================")
        print(f"[AEGIS Watcher] File {action.upper()}: {filename}")
        print(f"[AEGIS Watcher] Department: {dept}  Size: {os.path.getsize(file_path)} bytes")
        print(f"[AEGIS Watcher] Transmitting to backend...")

        result = self.sync_client.sync_file(file_path, department=dept, event_type=action)
        if result.get("success"):
            data = result.get("data", {}).get("data", {})
            print(f"[AEGIS Watcher] OK — doc_id={data.get('doc_id')}, "
                  f"chunks={data.get('chunks_extracted')}, "
                  f"Qdrant={data.get('qdrant_indexed')}, Neo4j={data.get('neo4j_synced')}")
        else:
            print(f"[AEGIS Watcher] FAILED: {result.get('error') or result.get('data')}")
        print(f"[AEGIS Watcher] ===================================================\n")


def initial_sync_scan(sync_client: SyncClient, watch_path: str) -> None:
    """
    On startup, scans watch_path recursively, computes SHA-256 for all existing supported files,
    checks with backend to see which files are already indexed, and ingests any new/unindexed files.
    Ensures idempotency without duplicate processing.
    """
    import hashlib
    print(f"\n[AEGIS Watcher] Running Initial Sync scan on: {watch_path}")
    known_hashes = set()
    try:
        resp = requests.get(f"{BASE_URL}/file-watcher/known-hashes", timeout=8)
        if resp.ok:
            known_hashes = set(resp.json().get("hashes", []))
    except Exception as e:
        print(f"[AEGIS Watcher] [Initial Sync] Note: Backend hashes query note: {e}")

    synced_cnt = 0
    skipped_cnt = 0

    for root, _, files in os.walk(watch_path):
        for fname in files:
            fpath = os.path.join(root, fname)
            if not _is_supported(fpath):
                continue
            try:
                # Safe read with retry for Windows locking
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

    print(f"[AEGIS Watcher] Initial Sync complete: {synced_cnt} newly ingested, {skipped_cnt} already indexed.\n")


def start_watcher(watch_path: str = WATCH_ROOT):
    """Start recursive filesystem watcher daemon on Docker document volume."""
    os.makedirs(watch_path, exist_ok=True)
    for folder in CANONICAL_DEPARTMENTS:
        os.makedirs(os.path.join(watch_path, folder), exist_ok=True)

    sync_client = SyncClient()
    
    # 1. Run Initial Sync scan to ingest any offline/unindexed files
    initial_sync_scan(sync_client, watch_path)

    # 2. Start Realtime Filesystem Observer
    handler = DocumentChangeHandler(sync_client)
    observer = Observer()
    observer.schedule(handler, watch_path, recursive=True)
    observer.start()

    print(f"\n========================================================")
    print(f" AEGIS Local File Watcher Agent — RUNNING")
    print(f" Monitoring: {os.path.abspath(watch_path)}")
    print(f" Types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    print(f" Events: CREATED · MODIFIED · DELETED · RENAMED")
    print(f" Backend: {BASE_URL}")
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

