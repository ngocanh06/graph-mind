"""
Safety DB Guard for Automated & Live Integration Tests.
Strictly ensures tests can NEVER execute destructive or state-modifying actions
against graphmind_db (the demo database) or any production database.
"""
import os
import re
from urllib.parse import urlparse

PROTECTED_DATABASES = {"graphmind_db", "graphmind", "demo", "production", "prod"}


def assert_test_database(url_or_name: str) -> str:
    """
    Safety Guard: Validates that the database target for tests:
    1. Is NOT in PROTECTED_DATABASES (e.g. 'graphmind_db').
    2. MUST strictly end with '_test' or '_testing'.
    
    Raises RuntimeError immediately if non-compliant.
    Returns the validated database name.
    """
    if not url_or_name or not str(url_or_name).strip():
        raise ValueError("Database URL or name cannot be empty")

    raw = str(url_or_name).strip()

    # Extract db_name from various formats (URL, DSN, or plain name)
    if "://" in raw:
        parsed = urlparse(raw)
        db_name = parsed.path.lstrip("/").split("?")[0]
    elif "dbname=" in raw:
        m = re.search(r"dbname\s*=\s*([^\s'\"]+)", raw)
        db_name = m.group(1) if m else raw
    else:
        db_name = raw

    db_lower = db_name.lower().strip()

    if db_lower in PROTECTED_DATABASES:
        raise RuntimeError(
            f"[FATAL DB SAFETY VIOLATION] Test attempted to run against protected database: '{db_name}'. "
            f"Operations on '{db_name}' are strictly forbidden to prevent data loss or corruption!"
        )

    if not (db_lower.endswith("_test") or db_lower.endswith("_testing")):
        raise RuntimeError(
            f"[FATAL DB SAFETY VIOLATION] Target database '{db_name}' does not end with '_test' or '_testing'. "
            f"All integration and destructive tests must target an isolated database ending with '_test'."
        )

    return db_name


def get_test_database_url() -> str:
    """
    Returns the async test database URL from environment variable TEST_DATABASE_URL,
    defaulting to graphmind_test. Asserts safety before returning.
    """
    default_url = "postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_test"
    url = os.getenv("TEST_DATABASE_URL", default_url).strip()
    assert_test_database(url)
    return url


def get_test_sync_database_url() -> str:
    """
    Returns the sync psycopg2 test database URL from environment variable TEST_SYNC_DATABASE_URL,
    defaulting to graphmind_test. Asserts safety before returning.
    """
    async_url = get_test_database_url()
    sync_url = async_url.replace("+asyncpg", "")
    return sync_url

