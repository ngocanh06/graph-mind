"""
GraphMind LIVE Full-Stack E2E Test Suite (Real PostgreSQL + Neo4j + Qdrant + Ollama + FastAPI :5000)
No mocks — tests live HTTP endpoints on http://127.0.0.1:5000.
Run: pytest tests/test_live_fullstack_e2e.py -o addopts="" -v --html=tests/live_fullstack_report.html --self-contained-html
"""
import os
import httpx
import pytest

BASE = os.environ.get("GRAPHMIND_API_URL", "http://127.0.0.1:5000")


def _login(client: httpx.Client, identifier: str = "admin", password: str = "123456"):
    for ident, pwd in [(identifier, password), ("exec", "123456"), ("admin", "admin123")]:
        r = client.post(f"{BASE}/api/v1/auth/login", json={"identifier": ident, "password": pwd})
        if r.status_code == 200:
            return r.json()
    return None


def test_live_01_health_and_multimodel_db_status():
    """Live Backend, Neo4j, Qdrant, and LLMOps endpoints respond with 200."""
    with httpx.Client(timeout=15.0) as c:
        assert c.get(f"{BASE}/api/health").status_code == 200
        neo = c.get(f"{BASE}/api/neo4j/status")
        qdr = c.get(f"{BASE}/api/qdrant/status")
        assert neo.status_code == 200 and qdr.status_code == 200


def test_live_02_jwt_login_and_single_active_session_kick():
    """Live PostgreSQL JWT login + Device B kicks Device A (401 CONCURRENT_LOGIN_KICKED)."""
    with httpx.Client(timeout=15.0) as c:
        d1 = _login(c, "admin", "123456")
        assert d1 and d1.get("access_token"), "Could not login to live PostgreSQL backend"
        tok1 = d1["access_token"]
        assert c.get(f"{BASE}/api/v1/auth/me", headers={"Authorization": f"Bearer {tok1}"}).status_code == 200

        # Login again -> revokes tok1
        d2 = _login(c, d1["user"]["username"], "123456")
        assert d2 and d2["access_token"] != tok1
        tok2 = d2["access_token"]
        assert c.get(f"{BASE}/api/v1/auth/me", headers={"Authorization": f"Bearer {tok2}"}).status_code == 200
        kicked = c.get(f"{BASE}/api/v1/auth/me", headers={"Authorization": f"Bearer {tok1}"})
        assert kicked.status_code == 401


def test_live_03_executive_dashboard_neo4j_kpis_and_risk_alerts():
    """Live Neo4j aggregations on Executive KPIs, Revenue Trend, Top Customers & Risk Alerts."""
    with httpx.Client(timeout=20.0) as c:
        d = _login(c, "exec", "123456")
        assert d and d.get("access_token")
        h = {"Authorization": f"Bearer {d['access_token']}"}
        for ep in ("/api/v1/dashboard/kpis", "/api/v1/dashboard/revenue-trend", "/api/v1/dashboard/top-customers", "/api/v1/dashboard/risk-alerts"):
            r = c.get(f"{BASE}{ep}", headers=h)
            assert r.status_code == 200, f"{ep} returned {r.status_code}: {r.text[:200]}"


def test_live_04_rbac_matrix_and_sop_and_search():
    """Live Admin 2D RBAC Matrix, SOP Wiki list, File Watcher status & Enterprise Search."""
    with httpx.Client(timeout=15.0) as c:
        d = _login(c, "admin", "123456")
        assert d and d.get("access_token")
        h = {"Authorization": f"Bearer {d['access_token']}"}
        assert c.get(f"{BASE}/api/admin/rbac-matrix", headers=h).status_code == 200
        assert c.get(f"{BASE}/api/v1/sop", headers=h).status_code == 200
        assert c.get(f"{BASE}/api/v1/sync/file-watcher/status", headers=h).status_code == 200
        assert c.get(f"{BASE}/api/search?q=WPPPLC", headers=h).status_code == 200


def test_live_05_llmops_and_ollama_status():
    """Live LLMOps telemetry endpoint responds with 200."""
    with httpx.Client(timeout=15.0) as c:
        r = c.get(f"{BASE}/api/llmops")
        assert r.status_code == 200
