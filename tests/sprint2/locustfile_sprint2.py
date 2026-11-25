"""
GraphMind Sprint 2 Performance & Load Test — Locust (--headless)
Targets Sprint 2 File Watcher Status, RBAC Matrix Guard, and Forgot Password APIs.
"""
from locust import HttpUser, between, task


class Sprint2User(HttpUser):
    wait_time = between(0.1, 0.3)

    @task(4)
    def get_file_watcher_status(self):
        self.client.get("/api/v1/sync/file-watcher/status", name="GET /sync/file-watcher/status")

    @task(3)
    def get_health(self):
        self.client.get("/health", name="GET /health")

    @task(2)
    def check_rbac_matrix_guard(self):
        with self.client.get(
            "/api/admin/rbac-matrix",
            name="GET /admin/rbac-matrix (401/403 guard)",
            catch_response=True,
        ) as resp:
            if resp.status_code in (401, 403):
                resp.success()
            else:
                resp.failure(f"Expected 401/403, got {resp.status_code}")

    @task(1)
    def forgot_password_unknown_email(self):
        with self.client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "unknown_loadtest@graphmind.ai"},
            name="POST /auth/forgot-password (404 expected)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 404:
                resp.success()
            else:
                resp.failure(f"Expected 404, got {resp.status_code}")
