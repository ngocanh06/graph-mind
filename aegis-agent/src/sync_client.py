"""
AEGIS Local Agent — Secure Incremental Sync Client
Transmits detected files & metadata via HTTPS/TLS to Backend Cloud
"""
import hashlib
import os
import requests
from typing import Dict, Any, Optional
from .config import SYNC_ENDPOINT, FALLBACK_SYNC_ENDPOINT, AGENT_API_KEY

class SyncClient:
    def __init__(
        self,
        endpoint: str = SYNC_ENDPOINT,
        fallback_endpoint: Optional[str] = FALLBACK_SYNC_ENDPOINT,
        api_key: str = AGENT_API_KEY
    ):
        self.endpoint = endpoint
        self.fallback_endpoint = fallback_endpoint
        self.api_key = api_key

    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file to check idempotency."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def sync_file(self, file_path: str, department: str = "General", event_type: str = "created") -> dict:
        """Send file with metadata to Backend Cloud."""
        if not os.path.exists(file_path):
            return {"success": False, "error": "File does not exist"}

        file_hash = self.calculate_file_hash(file_path)
        file_name = os.path.basename(file_path)
        headers = {"Authorization": f"Bearer {self.api_key}"}

        endpoints_to_try = [self.endpoint]
        if self.fallback_endpoint and self.fallback_endpoint != self.endpoint:
            endpoints_to_try.append(self.fallback_endpoint)

        last_error = "Unknown error"
        for ep in endpoints_to_try:
            try:
                with open(file_path, "rb") as f:
                    files = {"file": (file_name, f)}
                    data = {
                        "file_hash": file_hash,
                        "department": department,
                        "file_name": file_name,
                        "event_type": event_type
                    }
                    response = requests.post(ep, headers=headers, data=data, files=files, timeout=30)
                    if response.status_code in (200, 201):
                        self.endpoint = ep  # Remember working endpoint
                        return {
                            "success": True,
                            "status_code": response.status_code,
                            "data": response.json() if response.ok else response.text
                        }
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text[:120]}"
            except requests.exceptions.RequestException as exc:
                last_error = str(exc)
                continue

        return {"success": False, "error": last_error}
