"""GraphMind Sprint 4 150-VU Concurrency Load Test — Locust (--headless)."""
from locust import HttpUser, between, task


class Sprint4LoadUser(HttpUser):
    wait_time = between(0.1, 0.3)

    @task(4)
    def get_kpis(self):
        self.client.get("/api/v1/dashboard/kpis", name="GET /dashboard/kpis (Executive)")

    @task(3)
    def get_risk_alerts(self):
        self.client.get("/api/v1/dashboard/risk-alerts", name="GET /dashboard/risk-alerts")

    @task(2)
    def pb56_heartbeat(self):
        self.client.post("/api/v1/workstations/heartbeat", json={"workstation_id": "ws-01"}, name="POST /workstations/heartbeat")

    @task(1)
    def get_llmops(self):
        self.client.get("/api/llmops", name="GET /api/llmops")
