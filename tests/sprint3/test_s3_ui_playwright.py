"""
GraphMind Sprint 3 UI Automation Suite — Playwright (pytest-playwright)
Covers: SearchView (PB52), SopView (PB53), Reports/Shift Handover (PB69-70), KnowledgeExplorer (PB41).
"""
import json
import os
from playwright.sync_api import Page

BASE_URL = os.environ.get("GRAPHMIND_UI_URL", "http://127.0.0.1:5173")


def _auth_and_mock(page: Page, role="executive"):
    page.route(
        "http://localhost:5000/**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"status": "ok", "items": [], "results": [], "documents": [], "reports": [], "data": []}),
        ),
    )
    page.add_init_script("""
        localStorage.setItem('aegis_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJleGVjIn0.sig');
        localStorage.setItem('aegis_page_mode', 'app');
        localStorage.setItem('aegis_user', JSON.stringify({"id": "__ROLE__", "role": "__ROLE__", "name": "Sprint3 Demo"}));
    """.replace("__ROLE__", role))


def _assert_view_clean(page: Page, view: str):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    _auth_and_mock(page)
    page.goto(f"{BASE_URL}/?view={view}", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    assert len(page.locator("body").inner_text().strip()) > 20
    assert not errors, f"JS errors on ?view={view}: {errors}"


def test_s3_ui_01_multifacet_search_view(page: Page):
    """S3_UI_01: Enterprise Multi-Facet Search (/?view=search) renders with 0 JS errors."""
    _assert_view_clean(page, "search")


def test_s3_ui_02_sop_wiki_view(page: Page):
    """S3_UI_02: SOP Wiki View (/?view=sop) renders with 0 JS errors."""
    _assert_view_clean(page, "sop")


def test_s3_ui_03_shift_reports_view(page: Page):
    """S3_UI_03: Shift Handover & Department Report View (/?view=department_report) renders with 0 JS errors."""
    _assert_view_clean(page, "department_report")


def test_s3_ui_04_knowledge_explorer_hitl_view(page: Page):
    """S3_UI_04: Knowledge Explorer / HITL View (/?view=explorer) renders with 0 JS errors."""
    _assert_view_clean(page, "explorer")
