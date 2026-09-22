"""
Graph Mind — Enterprise Knowledge Base & Graph Dataset (Python)
"""
from typing import Dict, Any, List
from datetime import datetime

SYSTEM_HEALTH: Dict[str, Any] = {
    "status": "nominal",
    "uptime": "99.98%",
    "activeSources": 247,
    "reasoningEngine": "Python Hybrid GraphRAG v2.6",
    "lastSync": datetime.now().isoformat()
}

AI_SIGNALS: List[Dict[str, Any]] = [
    {
        "id": "sig-1",
        "severity": "high",
        "badge": "HIGH CHURN RISK",
        "what_en": "Customer ABC Corporation order frequency decreased 32%.",
        "what_vi": "Tần suất đặt hàng của Tập đoàn ABC giảm 32%.",
        "why_en": "Order cadence fell from 8.0/mo to 5.4/mo over trailing 60 days — consistent with prior churn events in manufacturing tier.",
        "why_vi": "Tần suất đặt hàng giảm từ 8,0/tháng xuống 5,4/tháng trong 60 ngày qua — khớp với mô hình rời bỏ trước đây.",
        "action_en": "Review account within 7 days",
        "action_vi": "Xem xét tài khoản trong vòng 7 ngày",
        "entityId": "abc"
    },
    {
        "id": "sig-2",
        "severity": "med",
        "badge": "MEDIUM RISK",
        "what_en": "3 contracts expire within 21 days with no renewal activity logged.",
        "what_vi": "3 hợp đồng hết hạn trong 21 ngày tới chưa có hoạt động gia hạn.",
        "why_en": "Combined value of 4.1B VND has no renewal activity logged in CRM or Drive folders.",
        "why_vi": "Tổng giá trị hợp đồng 4,1 tỷ VND chưa ghi nhận động thái gia hạn nào trên CRM hoặc Google Drive.",
        "action_en": "Open Risk Center",
        "action_vi": "Mở Trung tâm Rủi ro",
        "entityId": "ct18"
    },
    {
        "id": "sig-3",
        "severity": "low",
        "badge": "DATA QUALITY",
        "what_en": "12 documents contain incomplete metadata or unverified owners.",
        "what_vi": "12 tài liệu bị thiếu siêu dữ liệu hoặc chưa xác thực người sở hữu.",
        "why_en": "Department and author fields missing, reducing traceability for downstream AI reasoning.",
        "why_vi": "Thiếu trường phòng ban và người lập, làm giảm khả năng truy xuất bằng chứng của AI.",
        "action_en": "Send to Validation Queue",
        "action_vi": "Chuyển tới Hàng đợi Xác thực",
        "entityId": "doc-sop"
    }
]

ENTITIES: Dict[str, Any] = {
    "abc": {
        "id": "abc",
        "type": "CUSTOMER",
        "name": "ABC Corporation",
        "verified": True,
        "status": "Human Verified",
        "risk": "Elevated",
        "industry": "Manufacturing & Industrial",
        "contact": "Tran M. Anh (Procurement Dir.)",
        "revenue": "6.4B VND",
        "ordersCount": 214,
        "activeContracts": 2,
        "relationships": [
            { "rel": "Customer of", "target": "Company X" },
            { "rel": "Purchased", "target": "Product A" },
            { "rel": "Signed", "target": "Contract CT-2026-18", "warning": True }
        ]
    },
    "ct18": {
        "id": "ct18",
        "type": "CONTRACT",
        "name": "Contract CT-2026-18",
        "verified": False,
        "status": "Needs Review",
        "risk": "High",
        "industry": "Legal / Sales",
        "contact": "Pham Q. Linh (Account Mgr)",
        "revenue": "1.2B VND",
        "ordersCount": 18,
        "activeContracts": 1,
        "relationships": [
            { "rel": "Signed by", "target": "ABC Corporation" },
            { "rel": "Governs", "target": "Product A supply" },
            { "rel": "Expires on", "target": "18 Oct 2026 (12 days left)" }
        ]
    },
    "delta": {
        "id": "delta",
        "type": "CUSTOMER",
        "name": "Delta Trading Ltd",
        "verified": True,
        "status": "Human Verified",
        "risk": "Medium",
        "industry": "Distribution & Logistics",
        "contact": "Nguyen V. Binh (Director)",
        "revenue": "3.2B VND",
        "ordersCount": 94,
        "activeContracts": 1,
        "relationships": [
            { "rel": "Customer of", "target": "Company X" },
            { "rel": "Purchased", "target": "Product B" },
            { "rel": "Signed", "target": "Contract CT-2026-24" }
        ]
    },
    "proda": {
        "id": "proda",
        "type": "PRODUCT",
        "name": "Product A — Enterprise Core",
        "verified": True,
        "status": "System Verified",
        "risk": "Low",
        "industry": "Software & Services",
        "contact": "Product Management Team",
        "revenue": "28.4B VND (YTD)",
        "ordersCount": 840,
        "activeContracts": 180,
        "relationships": [
            { "rel": "Delivered to", "target": "ABC Corporation" },
            { "rel": "Produced by", "target": "Tech Division" }
        ]
    }
}

CONNECTORS: List[Dict[str, Any]] = [
    {
        "id": "conn-1",
        "name": "Google Drive",
        "type": "cloud_storage",
        "status": "Connected · Continuous",
        "lastSync": "2 min ago",
        "nextSync": "in 13 min",
        "filesProcessed": 4208,
        "recordsExtracted": 18930,
        "errors": 0
    },
    {
        "id": "conn-2",
        "name": "Google Sheets",
        "type": "tabular_data",
        "status": "Connected · Continuous",
        "lastSync": "9 min ago",
        "nextSync": "in 6 min",
        "filesProcessed": 312,
        "recordsExtracted": 52104,
        "errors": 0
    },
    {
        "id": "conn-3",
        "name": "Local Agent — AEGIS",
        "type": "agent_daemon",
        "status": "3 machines online",
        "lastSync": "14s ago",
        "nextSync": "Real-time",
        "filesProcessed": 86,
        "recordsExtracted": 4,
        "errors": 1
    },
    {
        "id": "conn-4",
        "name": "File Watcher",
        "type": "filesystem",
        "status": "Active · Low Latency",
        "lastSync": "Just now",
        "nextSync": "Real-time",
        "filesProcessed": 212,
        "recordsExtracted": 198,
        "errors": 0
    }
]

LLMOPS_METRICS: Dict[str, Any] = {
    "totalTokens30D": "18.4M",
    "promptTokens": "11.2M",
    "completionTokens": "7.2M",
    "aiQueries": 54180,
    "avgLatency": "2.1s",
    "estimatedCost": "$312",
    "citationCoverage": "94%"
}
