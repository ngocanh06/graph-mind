"""
Graph Mind — Enterprise Python Backend Engine
Framework: FastAPI / Uvicorn
Architecture: Hybrid GraphRAG Reasoning, Ontology Graph, Human-in-the-loop QC & Decision Support
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.db.mock_knowledge_db import (
        SYSTEM_HEALTH,
        AI_SIGNALS,
        ENTITIES,
        CONNECTORS,
        LLMOPS_METRICS
    )
except ImportError:
    from db.mock_knowledge_db import (
        SYSTEM_HEALTH,
        AI_SIGNALS,
        ENTITIES,
        CONNECTORS,
        LLMOPS_METRICS
    )

app = FastAPI(
    title="Graph Mind Enterprise Knowledge Observatory API",
    description="Python Backend Engine for Graph Mind (AEGIS EKMP) Platform",
    version="2.0.0"
)

# Enable CORS for all local ports (3000, 3001, 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class CopilotQueryRequest(BaseModel):
    query: str
    lang: Optional[str] = "en"

class VerifyEntityRequest(BaseModel):
    entityId: str
    verified: bool
    auditor: Optional[str] = "Human Auditor"

# --- Endpoints ---

@app.get("/")
def get_root():
    return {"message": "Graph Mind Python Backend is running", "docs": "/docs"}

@app.get("/api-status")
def get_api_status():
    return {
        "service": "Graph Mind Python Backend Engine",
        "status": "online",
        "version": "2.0.0",
        "framework": "Python FastAPI + Uvicorn",
        "docs_url": "/docs",
        "endpoints": [
            "/api/health",
            "/api/signals",
            "/api/graph/entities",
            "/api/graph/entity/{id}",
            "/api/graph/verify",
            "/api/copilot/ask",
            "/api/connectors",
            "/api/llmops",
            "/api/metrics",
            "/api/nodes"
        ]
    }

@app.get("/api/health")
def get_health():
    return {"success": True, "data": SYSTEM_HEALTH}

@app.get("/api/signals")
def get_signals():
    return {"success": True, "count": len(AI_SIGNALS), "data": AI_SIGNALS}

@app.get("/api/graph/entities")
@app.get("/api/nodes")
@app.get("/api/graph")
def get_entities():
    return {"success": True, "data": ENTITIES}

@app.get("/api/graph/entity/{entity_id}")
def get_entity_by_id(entity_id: str):
    entity = ENTITIES.get(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found in Knowledge Graph")
    return {"success": True, "data": entity}

@app.post("/api/graph/verify")
def verify_entity(req: VerifyEntityRequest):
    entity = ENTITIES.get(req.entityId)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity '{req.entityId}' not found")
    
    entity["verified"] = req.verified
    entity["status"] = "Human Verified" if req.verified else "Needs Review"
    return {
        "success": True,
        "message": f"Entity {req.entityId} verification updated by {req.auditor}",
        "data": entity
    }

@app.post("/api/copilot/ask")
def copilot_reasoning(req: CopilotQueryRequest):
    is_vi = req.lang == "vi"
    
    response_data = {
        "query": req.query,
        "model": "Graph Mind Python Hybrid GraphRAG v2.6",
        "insight": (
            "2 trong số 14 tài khoản VIP ghi nhận mức sụt giảm liên tục về tần suất đặt hàng — Tập đoàn ABC và Delta Trading — cả hai đều thấp hơn mức chuẩn 6 tháng qua trong 3 chu kỳ liên tiếp."
            if is_vi else
            "2 of 14 VIP accounts show a sustained decline in order frequency — ABC Corporation and Delta Trading — both falling below their 6-month baseline for three consecutive cycles."
        ),
        "whyItMatters": (
            "Tập đoàn ABC trước đây trung bình 8,0 đơn/tháng nay chỉ còn 5,4 (-32,5%). Delta Trading giảm từ 5,0 xuống 2,8 đơn/tháng (-44,0%). Cả hai nằm trong top doanh thu tích lũy, việc sụt giảm kéo dài sẽ tác động trực tiếp đến kế hoạch Q4."
            if is_vi else
            "ABC Corporation previously averaged 8.0 orders/month and now averages 5.4 (-32.5%). Delta Trading fell from 5.0 to 2.8/month (-44.0%). Both accounts sit in top-quartile by lifetime revenue, so continued decline materially impacts Q4 forecast."
        ),
        "evidenceChips": [
            {"id": "ord-1023", "label": "Order #1023", "source": "Google Sheets"},
            {"id": "ord-1041", "label": "Order #1041", "source": "Google Sheets"},
            {"id": "ct-18", "label": "Contract CT-2026-18", "source": "Google Drive PDF"},
            {"id": "crm-sept", "label": "CRM export · Sept", "source": "Local Agent CSV"}
        ],
        "confidenceScore": 87,
        "recommendedAction": (
            "Gặp gỡ đánh giá lại cả hai tài khoản trong vòng 7 ngày — bản nháp chăm sóc khách hàng đã sẵn sàng trong mục Báo cáo."
            if is_vi else
            "Review both accounts and reach out within 7 days — draft outreach available in Reports."
        )
    }
    return {"success": True, "data": response_data}

@app.get("/api/connectors")
def get_connectors():
    return {"success": True, "data": CONNECTORS}

@app.get("/api/llmops")
@app.get("/api/metrics")
def get_llmops():
    return {"success": True, "data": LLMOPS_METRICS}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)