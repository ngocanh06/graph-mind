"""
GraphMind Sprint 4 UI Automation Suite — Playwright (pytest-playwright)
Covers: ExecutiveView (PB57), RiskView (PB58), Connectors/PB56 Workstations (PB56), ReportsView (PB65/71).
"""
import json
import os
from playwright.sync_api import Page

BASE_URL = os.environ.get("GRAPHMIND_UI_URL", "http://127.0.0.1:5173")


def _assert_s4_view(page: Page, view: str):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route(
        "http://localhost:5000/**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "status": "ok",
                "totalRevenue": 12500000,
                "totalOrders": 31465,
                "totalCustomers": 19119,
                "complianceRate": 86.7,
                "alerts": [],
                "workstations": [],
                "items": [],
                "data": [],
            }),
        ),
    )
    page.add_init_script("""
        localStorage.setItem('aegis_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJleGVjdXRpdmUifQ.sig');
        localStorage.setItem('aegis_page_mode', 'app');
        localStorage.setItem('aegis_user', JSON.stringify({"id": "executive", "role": "executive", "name": "CEO Demo"}));
    """)
    page.goto(f"{BASE_URL}/?view={view}", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    assert len(page.locator("body").inner_text().strip()) > 20
    assert not errors, f"JS errors on ?view={view}: {errors}"


def test_s4_ui_01_executive_dashboard_view(page: Page):
    """S4_UI_01: Executive Decision Dashboard (/?view=executive) renders with 0 JS errors."""
    _assert_s4_view(page, "executive")


def test_s4_ui_02_smart_risk_center_view(page: Page):
    """S4_UI_02: Smart Risk & Alert Center (/?view=risk) renders with 0 JS errors."""
    _assert_s4_view(page, "risk")


def test_s4_ui_03_aegis_connectors_workstations_view(page: Page):
    """S4_UI_03: AEGIS Local Agent & PB56 Workstations (/?view=connectors) renders with 0 JS errors."""
    _assert_s4_view(page, "connectors")


def test_s4_ui_04_reports_briefing_view(page: Page):
    """S4_UI_04: Executive Reports & Briefing View (/?view=reports) renders with 0 JS errors."""
    _assert_s4_view(page, "reports")
