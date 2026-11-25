"""Minimal isolated FastAPI target (:5058) for Sprint 4 150-VU headless Locust run."""
import uvicorn
from fastapi import FastAPI

app = FastAPI()


@app.get("/api/v1/dashboard/kpis")
async def kpis():
    return {"totalRevenue": 12500000, "totalOrders": 31465, "complianceRate": 86.7}


@app.get("/api/v1/dashboard/risk-alerts")
async def risk_alerts():
    return {"alerts": [{"type": "EXPIRING_CONTRACT", "severity": "HIGH"}]}


@app.post("/api/v1/workstations/heartbeat")
async def heartbeat():
    return {"status": "ONLINE", "sync_mode": "ACTIVE"}


@app.get("/api/llmops")
async def llmops():
    return {"model": "qwen2.5-7b-graphmind-q4_k_m", "status": "ready"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5058, log_level="warning")
