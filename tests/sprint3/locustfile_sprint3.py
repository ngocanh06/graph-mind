"""GraphMind Sprint 3 Load Test — Locust (--headless)."""
from locust import HttpUser, between, task


class Sprint3User(HttpUser):
    wait_time = between(0.1, 0.3)

    @task(4)
    def rrf_fusion_bench(self):
        self.client.get("/api/v1/rrf-bench", name="GET /rrf-bench (RRF k=60)")

    @task(3)
    def health(self):
        self.client.get("/health", name="GET /health")

    @task(2)
    def shift_report_auth_guard(self):
        with self.client.get("/api/v1/shift-reports/mine", name="GET /shift-reports/mine (401/403 guard)", catch_response=True) as r:
            r.success() if r.status_code in (401, 403) else r.failure(f"Got {r.status_code}")

    @task(1)
    def sop_publish_auth_guard(self):
        with self.client.post("/api/v1/sop/1/publish", name="POST /sop/1/publish (401/403 guard)", catch_response=True) as r:
            r.success() if r.status_code in (401, 403, 422) else r.failure(f"Got {r.status_code}")
