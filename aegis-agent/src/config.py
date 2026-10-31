"""
AEGIS Local Agent Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Backend Cloud API
BACKEND_URL = os.getenv("AEGIS_BACKEND_URL", "http://backend:5000")
FALLBACK_BACKEND_URL = os.getenv("AEGIS_BACKEND_FALLBACK_URL", "http://host.docker.internal:5000")
SYNC_ENDPOINT = f"{BACKEND_URL}/api/v1/sync/file-watcher"
FALLBACK_SYNC_ENDPOINT = f"{FALLBACK_BACKEND_URL}/api/v1/sync/file-watcher"
AGENT_API_KEY = os.getenv("AEGIS_AGENT_API_KEY", os.getenv("AGENT_API_KEY", "dev-agent-key"))

# Canonical Document Root to watch (Docker Named Volume mounted at /data)
WATCH_ROOT = os.getenv("WATCH_ROOT", os.getenv("AEGIS_WATCH_DIR", "/data"))
WATCH_DIR = WATCH_ROOT  # backward-compatible alias

# Strictly supported business document extensions (.txt and other files are ignored)
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv"}

# Canonical 5 departments
CANONICAL_DEPARTMENTS = ["legal", "sales", "accounting_procurement", "it", "rnd"]
