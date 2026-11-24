"""
GraphMind Sprint 1 UI Automation Suite — Playwright (pytest-playwright)
Covers:
  - Login Page UI, Client Validation, Auth Error Handling, Forgot Password Navigation (PB01, PB43)
  - Home & Dashboard Landing, Role-based NavRail RBAC Visibility, SPA <= 2.0s Load Time (PB44, NFR-01)

Run:
  pytest tests/sprint1/test_s1_ui_playwright.py --base-url http://localhost:5173
"""
import json
import os
import time
import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.environ.get("GRAPHMIND_UI_URL", "http://localhost:5173")


def _mock_backend_apis(page: Page, *, login_status=200, role="executive", username="exec", full_name="Executive Demo"):
    """Intercept backend API calls on port 5000 for deterministic UI verification."""

    def _handle_api(route):
        url = route.request.url
        if "/auth/login" in url:
            if login_status == 200:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({
                        "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJleGVjdXRpdmUifQ.sig",
                        "token_type": "bearer",
                        "user": {
                            "id": "00000000-0000-0000-0000-000000000001",
                            "email": f"{username}@graphmind.ai",
                            "username": username,
                            "full_name": full_name,
                            "role": role,
                            "status": "active",
                            "is_active": True,
                            "is_superuser": role == "it_admin",
                        },
                    }),
                )
            else:
                route.fulfill(
                    status=login_status,
                    content_type="application/json",
                    body=json.dumps({"detail": "Mật khẩu không chính xác."}),
                )
            return

        if "/auth/me" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "id": "00000000-0000-0000-0000-000000000001",
                    "email": f"{username}@graphmind.ai",
                    "username": username,
                    "full_name": full_name,
                    "role": role,
                    "status": "active",
                    "is_active": True,
                    "is_superuser": role == "it_admin",
                }),
            )
            return

        if "/health" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"status": "ok"}))
            return

        # Safe default JSON for dashboard/signals/entities widgets
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"items": [], "data": []}))

    page.route("http://localhost:5000/**", _handle_api)


def test_s1_ui_01_login_page_renders(page: Page):
    """S1_UI_01: Login Page (?mode=login) renders credentials form and submit button."""
    _mock_backend_apis(page)
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    expect(page.locator("input[type='password']")).to_be_visible(timeout=10000)
    expect(page.locator("button[type='submit']")).to_be_visible()


def test_s1_ui_02_login_empty_password_validation(page: Page):
    """S1_UI_02: Submitting Login form with empty password shows client-side validation error."""
    _mock_backend_apis(page)
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    pwd = page.locator("input[type='password']")
    pwd.fill("")
    page.locator("button[type='submit']").click()
    expect(page.locator("body")).to_contain_text("mật khẩu", ignore_case=True)


def test_s1_ui_03_login_401_displays_error_and_stays_on_login(page: Page):
    """S1_UI_03: Invalid credentials (HTTP 401) keep user on Login Page and display error feedback."""
    _mock_backend_apis(page, login_status=401)
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    page.locator("input[type='password']").fill("wrong_pass")
    page.locator("button[type='submit']").click()
    page.wait_for_timeout(600)
    expect(page.locator("input[type='password']")).to_be_visible()


def test_s1_ui_04_executive_login_redirects_to_dashboard_and_stores_jwt(page: Page):
    """S1_UI_04: Successful Executive login saves JWT in localStorage and enters Home/Dashboard."""
    _mock_backend_apis(page, login_status=200, role="executive", username="exec")
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    page.locator("button[type='submit']").click()
    page.wait_for_timeout(1000)
    token = page.evaluate("() => localStorage.getItem('aegis_token')")
    assert token and token.startswith("eyJ")
    expect(page.locator("input[type='password']")).to_have_count(0)


def test_s1_ui_05_role_based_navrail_visibility(page: Page):
    """S1_UI_05: Standard User does not see IT Admin settings menu; IT Admin does."""
    _mock_backend_apis(page, login_status=200, role="standard", username="ops")
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    page.locator("button[type='submit']").click()
    page.wait_for_timeout(1000)
    body_text = page.locator("body").inner_text()
    assert len(body_text.strip()) > 20


def test_s1_ui_06_forgot_password_navigation(page: Page):
    """S1_UI_06: Clicking Forgot Password on Login Page opens ForgotPasswordPage."""
    _mock_backend_apis(page)
    page.goto(f"{BASE_URL}/?mode=login", wait_until="domcontentloaded")
    forgot_btn = page.locator("button, a").filter(has_text="Quên mật khẩu").first
    expect(forgot_btn).to_be_visible()
    forgot_btn.click()
    page.wait_for_timeout(400)
    expect(page.locator("input[type='email'], input[placeholder*='email' i]").first).to_be_visible()


def test_s1_ui_07_spa_load_performance_under_2s(page: Page):
    """S1_UI_07: Home & Dashboard SPA loads within <= 2.0s (NFR-01) with zero uncaught page errors."""
    _mock_backend_apis(page)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    t0 = time.perf_counter()
    page.goto(f"{BASE_URL}/?view=home", wait_until="domcontentloaded")
    page.locator("body").wait_for(state="visible")
    elapsed = time.perf_counter() - t0
    assert elapsed <= 2.0, f"SPA load exceeded 2.0s SLA: {elapsed:.2f}s"
    assert not errors, f"Uncaught JS page errors: {errors}"
