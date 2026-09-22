"""
AEGIS Local Agent — Secure Incremental Sync Client
Transmits detected files & metadata via HTTPS/TLS to Backend Cloud
"""
import hashlib
import os
import requests
from typing import Dict, Any, Optional
from .config import SYNC_ENDPOINT, AGENT_API_KEY

class SyncClient:
    def __init__(self, endpoint: str = SYNC_ENDPOINT, api_key: str = AGENT_API_KEY):
        self.endpoint = endpoint
        self.api_key = api_key

    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file to check idempotency."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def sync_file(self, file_path: str, department: str = "General") -> Dict[str, Any]:
        """Send file with metadata to Backend Cloud."""
        if not os.path.exists(file_path):
            return {"success": False, "error": "File does not exist"}

        file_hash = self.calculate_file_hash(file_path)
        file_name = os.path.basename(file_path)
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            with open(file_path, "rb") as f:
                files = {"file": (file_name, f)}
                data = {
                    "file_hash": file_hash,
                    "department": department,
                    "file_name": file_name
                }
                response = requests.post(self.endpoint, headers=headers, data=data, files=files, timeout=30)
                return {
                    "success": response.status_code in (200, 201),
                    "status_code": response.status_code,
                    "data": response.json() if response.ok else response.text
                }
        except Exception as exc:
            return {"success": False, "error": str(exc)}
