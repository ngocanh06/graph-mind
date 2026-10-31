"""
GraphMind Performance Test Suite — Locust
=========================================
Test Plan:
  Stage 1 (Warm-up):  0-20 VUs in 30s
  Stage 2 (Load):     50 VUs for 60s
  Stage 3 (Stress):   150 VUs for 60s
  Stage 4 (Cooldown): ramp down to 0 over 30s

Thresholds:
  - Read/query APIs:  p95 < 500 ms
  - Heavy compute:    p95 < 2000 ms
  - Error rate:       < 1%

Run:
    locust -f perf-tests/locustfile.py --headless --host http://localhost:5000 --html perf-tests/report.html --csv perf-tests/results
"""

import json
import os
import time
import random
from locust import HttpUser, task, between, events, LoadTestShape

SAMPLE_QUERIES = [
    "Khach hang nao co doanh thu cao nhat?",
    "Cac hop dong thieu dieu khoan Liability la gi?",
    "Danh sach san pham ban chay nhat",
    "Tong doanh thu nam 2013",
    "Dieu khoan cham dut hop dong",
]

HEAVY_ENDPOINTS = {
    "POST /copilot/ask (LLM+Vector+Graph)",
    "POST /dashboard/dept-report/synthesize (LLM)",
    "GET /dashboard/kpis (Neo4j multi-MATCH)",
    "GET /dashboard/risk-alerts (Neo4j heavy)",
}

_perf_data: dict = {
    "test_start": None,
    "test_end": None,
    "thresholds": {
        "read_p95_ms": 500,
        "heavy_p95_ms": 2000,
        "error_rate_pct": 1.0,
    },
    "results": [],
}


class GraphMindLoadShape(LoadTestShape):
    stages = [
        {"duration": 30,  "users": 20,  "spawn_rate": 1},
        {"duration": 90,  "users": 50,  "spawn_rate": 2},
        {"duration": 150, "users": 150, "spawn_rate": 5},
        {"duration": 210, "users": 0,   "spawn_rate": 10},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None


class GraphMindUser(HttpUser):
    wait_time = between(0.5, 2.0)

    def on_start(self):
        self.token = None
        self.session_id = None
        self._do_login()

    def _do_login(self):
        for creds in [
            {"username": "admin", "password": "admin123"},
            {"username": "user",  "password": "user123"},
        ]:
            resp = self.client.post("/api/v1/auth/login", json=creds, name="POST /auth/login")
            if resp.status_code == 200:
                self.token = resp.json().get("access_token") or resp.json().get("token")
                break

    def _h(self):
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    @task(5)
    def get_sop_list(self):
        self.client.get("/api/v1/sop", headers=self._h(), name="GET /sop (list)")

    @task(4)
    def get_sop_filtered(self):
        self.client.get("/api/v1/sop?dept=Kinh+doanh&status=published", headers=self._h(), name="GET /sop?dept=&status=")

    @task(3)
    def get_revenue_trend(self):
        self.client.get("/api/v1/dashboard/revenue-trend", headers=self._h(), name="GET /dashboard/revenue-trend (Neo4j agg)")

    @task(3)
    def get_top_customers(self):
        self.client.get("/api/v1/dashboard/top-customers?limit=10", headers=self._h(), name="GET /dashboard/top-customers (Neo4j)")

    @task(3)
    def get_contract_dist(self):
        self.client.get("/api/v1/dashboard/contract-distribution", headers=self._h(), name="GET /dashboard/contract-distribution (Neo4j x2)")

    @task(2)
    def get_risk_alerts(self):
        self.client.get("/api/v1/dashboard/risk-alerts", headers=self._h(), name="GET /dashboard/risk-alerts (Neo4j heavy)")

    @task(2)
    def get_recent_activities(self):
        self.client.get("/api/v1/dashboard/recent-activities", headers=self._h(), name="GET /dashboard/recent-activities")

    @task(2)
    def get_copilot_sessions(self):
        self.client.get("/api/v1/copilot/sessions", headers=self._h(), name="GET /copilot/sessions (PG)")

    @task(1)
    def get_kpis(self):
        self.client.get("/api/v1/dashboard/kpis", headers=self._h(), name="GET /dashboard/kpis (Neo4j multi-MATCH)")

    @task(1)
    def get_auth_me(self):
        self.client.get("/api/v1/auth/me", headers=self._h(), name="GET /auth/me")

    @task(1)
    def post_copilot_ask(self):
        with self.client.post(
            "/api/v1/copilot/ask",
            json={"query": random.choice(SAMPLE_QUERIES), "lang": "vi", "session_id": self.session_id},
            headers=self._h(),
            name="POST /copilot/ask (LLM+Vector+Graph)",
            catch_response=True,
            timeout=60,
        ) as resp:
            if resp.status_code == 200:
                sid = resp.json().get("sessionId")
                if sid:
                    self.session_id = sid
                resp.success()
            elif resp.status_code in (401, 403):
                self._do_login()
                resp.failure(f"Auth {resp.status_code}")
            else:
                resp.failure(f"HTTP {resp.status_code}")

    @task(1)
    def post_dept_synthesize(self):
        with self.client.post(
            "/api/v1/dashboard/department-report/synthesize",
            json={"department": "Kinh doanh", "timeframe": "today"},
            headers=self._h(),
            name="POST /dashboard/dept-report/synthesize (LLM)",
            catch_response=True,
            timeout=60,
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            elif resp.status_code in (401, 403):
                self._do_login()
                resp.failure(f"Auth {resp.status_code}")
            else:
                resp.failure(f"HTTP {resp.status_code}")


@events.test_start.add_listener
def on_test_start(environment, **kw):
    _perf_data["test_start"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("\n=== GraphMind Load Test started ===")
    print("Stage 1 Warm-up  0->20 VU: 0-30s")
    print("Stage 2 Load       50 VU: 30-90s")
    print("Stage 3 Stress    150 VU: 90-150s")
    print("Stage 4 Cooldown    0 VU: 150-210s\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kw):
    _perf_data["test_end"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    stats = environment.runner.stats
    results = []
    failures = []

    for name, entry in stats.entries.items():
        if entry.num_requests == 0:
            continue
        label = f"{name[0]} {name[1]}"
        is_heavy = label in HEAVY_ENDPOINTS
        p95 = entry.get_response_time_percentile(0.95) or 0
        threshold_ms = 2000 if is_heavy else 500
        err_rate = (entry.num_failures / entry.num_requests * 100)

        ok_lat = p95 <= threshold_ms
        ok_err = err_rate < 1.0

        row = {
            "endpoint": label,
            "requests": entry.num_requests,
            "failures": entry.num_failures,
            "error_rate_pct": round(err_rate, 2),
            "median_ms": entry.median_response_time,
            "p95_ms": p95,
            "p99_ms": entry.get_response_time_percentile(0.99) or 0,
            "avg_ms": round(entry.avg_response_time, 1),
            "min_ms": entry.min_response_time,
            "max_ms": entry.max_response_time,
            "rps": round(entry.total_rps, 2),
            "threshold_ms": threshold_ms,
            "category": "heavy_compute" if is_heavy else "read_query",
            "passed_latency": ok_lat,
            "passed_error_rate": ok_err,
            "status": "PASS" if (ok_lat and ok_err) else "FAIL",
        }
        results.append(row)
        if not ok_lat:
            failures.append(f"LATENCY FAIL: {label} p95={p95}ms > {threshold_ms}ms")
        if not ok_err:
            failures.append(f"ERROR FAIL:   {label} error={err_rate:.1f}% > 1%")

    results.sort(key=lambda x: x["p95_ms"], reverse=True)
    _perf_data["results"] = results
    _perf_data["threshold_failures"] = failures

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "summary.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(_perf_data, f, indent=2, ensure_ascii=False)

    print("\n" + "="*72)
    print("  GraphMind Performance Test — Results Summary")
    print("="*72)
    print(f"{'Endpoint':<48} {'p95':>6} {'Limit':>6} {'Err%':>6} {'Status':>6}")
    print("-"*72)
    for r in results:
        ep = r["endpoint"][:47]
        print(f"{ep:<48} {r['p95_ms']:>5}ms {r['threshold_ms']:>5}ms {r['error_rate_pct']:>5.1f}% {'PASS' if r['status']=='PASS' else 'FAIL':>6}")
    print("\n--- Threshold Violations ---")
    if failures:
        for f in failures:
            print(f"  {f}")
    else:
        print("  All thresholds PASSED")
    print(f"\nFull results: {out}")
    print("="*72)
