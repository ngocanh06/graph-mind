"""
AEGIS Local Agent — File System Watcher
Monitors specified local directories for document changes and triggers sync
"""
import os
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileModifiedEvent

from .config import WATCH_DIR, SUPPORTED_EXTENSIONS
from .sync_client import SyncClient

class DocumentChangeHandler(FileSystemEventHandler):
    def __init__(self, sync_client: SyncClient):
        super().__init__()
        self.sync_client = sync_client

    def on_created(self, event):
        if not event.is_directory:
            self._process_file(event.src_path, "created")

    def on_modified(self, event):
        if not event.is_directory:
            self._process_file(event.src_path, "modified")

    def _process_file(self, file_path: str, action: str):
        ext = Path(file_path).suffix.lower()
        if ext in SUPPORTED_EXTENSIONS:
            print(f"[AEGIS Watcher] Detected {action}: {file_path}")
            result = self.sync_client.sync_file(file_path)
            print(f"[AEGIS Watcher] Sync result: {result}")

def start_watcher(watch_path: str = WATCH_DIR):
    os.makedirs(watch_path, exist_ok=True)
    sync_client = SyncClient()
    event_handler = DocumentChangeHandler(sync_client)
    observer = Observer()
    observer.schedule(event_handler, watch_path, recursive=True)
    observer.start()
    print(f"[AEGIS Watcher] Monitoring started on: {watch_path}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    start_watcher()
