"""
GraphMind Sprint 1 Performance & Load Test — Locust (--headless)
Targets Sprint 1 Auth & Health/Dashboard endpoints.

Run headless:
  locust -f tests/sprint1/locustfile_sprint1.py --headless -u 20 -r 5 -t 10s \
         --host http://127.0.0.1:5055 \
         --csv tests/sprint1/reports/locust_sprint1 \
         --html tests/sprint1/reports/locust_sprint1.html
"""
from locust import HttpUser, between, task


class Sprint1User(HttpUser):
    wait_time = between(0.1, 0.3)

    def on_start(self):
        self.token = None
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "exec", "password": "123456"},
            name="POST /api/v1/auth/login",
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")

    @task(3)
    def get_current_user(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client.get("/api/v1/auth/me", headers=headers, name="GET /api/v1/auth/me")

    @task(2)
    def get_health(self):
        self.client.get("/health", name="GET /health")

    @task(1)
    def login_invalid_credentials(self):
        with self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "exec", "password": "wrong"},
            name="POST /api/v1/auth/login (401 expected)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Expected 401, got {resp.status_code}")
