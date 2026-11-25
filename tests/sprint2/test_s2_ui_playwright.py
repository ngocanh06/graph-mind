"""
GraphMind Sprint 2 UI Automation Suite — Playwright (pytest-playwright)
Covers:
  - Knowledge Base Explorer (DocumentsView.jsx — PB50)
  - GraphRAG AI Copilot Chat UI (CopilotView.jsx — PB51)
  - Interactive D3-Force Knowledge Graph Viewer (KnowledgeView.jsx — PB15)
  - Admin Panel & Dynamic 2D RBAC Matrix UI (AdminView.jsx — PB02, PB72)
  - Multi-view SPA navigation stability with zero uncaught JS errors
"""
import json
import os
from playwright.sync_api import Page, expect

BASE_URL = os.environ.get("GRAPHMIND_UI_URL", "http://127.0.0.1:5173")


def _setup_authenticated_session(page: Page, *, role="it_admin", username="admin"):
    """Pre-seed localStorage auth state & mock backend APIs on port 5000."""
    def _handle_api(route):
        url = route.request.url
        if "/auth/me" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "id": "00000000-0000-0000-0000-000000000002",
                    "email": f"{username}@graphmind.ai",
                    "username": username,
                    "full_name": "Admin Demo",
                    "role": role,
                    "status": "active",
                    "is_active": True,
                    "is_superuser": role == "it_admin",
                }),
            )
            return
        if "/documents" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "documents": [
                        {"id": "doc-1", "name": "CUAD_Master_Agreement.pdf", "department": "Legal", "status": "ACTIVE"},
                        {"id": "doc-2", "name": "Sales_Q4_Report.xlsx", "department": "Sales", "status": "ACTIVE"},
                    ],
                    "items": [],
                    "total": 2,
                }),
            )
            return
        if "/neo4j/graph" in url or "/graph/entities" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "nodes": [
                        {"id": "n1", "label": "Company", "name": "WPPPLC"},
                        {"id": "n2", "label": "Contract", "name": "Service Agreement"},
                    ],
                    "links": [{"source": "n1", "target": "n2", "type": "PARTY_TO"}],
                }),
            )
            return
        if "/copilot/ask" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "answer": "Hợp đồng WPPPLC áp dụng luật Governing Law tại Anh (Nguồn: CUAD).",
                    "citations": [{"source": "WPPPLC_Service_Agreement.pdf", "snippet": "English law"}],
                    "confidence": 0.94,
                }),
            )
            return
        if "/admin/rbac-matrix" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "metadata": {"roles": ["ADMIN", "EXECUTIVE", "DEPARTMENT_MANAGER", "STANDARD_USER"], "departments": ["SALES", "LEGAL", "IT"], "resource_types": ["DOCUMENT", "GRAPH"]},
                    "policies": [],
                }),
            )
            return
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"status": "ok", "items": [], "data": [], "users": []}))

    page.route("http://localhost:5000/**", _handle_api)
    page.add_init_script("""
        localStorage.setItem('aegis_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MiIsInJvbGUiOiJhZG1pbiJ9.sig');
        localStorage.setItem('aegis_page_mode', 'app');
        localStorage.setItem('aegis_user', JSON.stringify({"id": "__ROLE__", "role": "__ROLE__", "name": "Admin Demo"}));
    """.replace("__ROLE__", role))


def test_s2_ui_01_knowledge_base_documents_view(page: Page):
    """S2_UI_01: Knowledge Base Explorer (/?view=documents) renders cleanly with zero JS errors."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _setup_authenticated_session(page, role="it_admin")
    page.goto(f"{BASE_URL}/?view=documents", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    assert len(page.locator("body").inner_text().strip()) > 20
    assert not errors, f"Uncaught JS errors on DocumentsView: {errors}"


def test_s2_ui_02_ai_copilot_chat_view_renders(page: Page):
    """S2_UI_02: GraphRAG AI Copilot Chat UI (/?view=copilot) renders prompt input workspace."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _setup_authenticated_session(page, role="executive", username="exec")
    page.goto(f"{BASE_URL}/?view=copilot", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    expect(page.locator("textarea, input[type='text']").first).to_be_visible(timeout=10000)
    assert not errors, f"Uncaught JS errors on CopilotView: {errors}"


def test_s2_ui_03_knowledge_graph_viewer_renders(page: Page):
    """S2_UI_03: Interactive D3-Force Knowledge Graph Viewer (/?view=knowledge) renders without crash."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _setup_authenticated_session(page, role="executive", username="exec")
    page.goto(f"{BASE_URL}/?view=knowledge", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    assert len(page.locator("body").inner_text().strip()) > 20
    assert not errors, f"Uncaught JS errors on KnowledgeView: {errors}"


def test_s2_ui_04_admin_panel_and_rbac_view_renders(page: Page):
    """S2_UI_04: Admin Panel (/?view=admin) renders for IT Admin role with zero JS errors."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _setup_authenticated_session(page, role="it_admin", username="admin")
    page.goto(f"{BASE_URL}/?view=admin", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    assert len(page.locator("body").inner_text().strip()) > 20
    assert not errors, f"Uncaught JS errors on AdminView: {errors}"


def test_s2_ui_05_spa_multi_view_transition_stability(page: Page):
    """S2_UI_05: Navigating across documents -> copilot -> knowledge -> admin yields 0 uncaught JS errors."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _setup_authenticated_session(page, role="it_admin", username="admin")
    for view in ("documents", "copilot", "knowledge", "admin"):
        page.goto(f"{BASE_URL}/?view={view}", wait_until="domcontentloaded")
        page.wait_for_timeout(400)
    assert not errors, f"JS errors during Sprint 2 SPA view switching: {errors}"
