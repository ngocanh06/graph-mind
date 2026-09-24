"""
AEGIS Local Agent Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Backend Cloud API
BACKEND_URL = os.getenv("AEGIS_BACKEND_URL", "http://localhost:5000")
SYNC_ENDPOINT = f"{BACKEND_URL}/api/v1/sync/file-watcher"
AGENT_API_KEY = os.getenv("AEGIS_AGENT_API_KEY", "dev-agent-key")

# Local directories to watch
WATCH_DIR = os.getenv("AEGIS_WATCH_DIR", str(BASE_DIR / "watched_folders"))
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".csv", ".txt"}
