"""
Graph Mind — Enterprise Knowledge Base & Graph Dataset (Python)
Baseline verified data from AdventureWorks ERP (Neo4j) & CUAD Legal Dataset (Qdrant).
"""
from typing import Dict, Any, List
from datetime import datetime

SYSTEM_HEALTH: Dict[str, Any] = {
    "status": "nominal",
    "uptime": "99.98%",
    "activeSources": 581,
    "reasoningEngine": "Python Hybrid GraphRAG v2.6",
    "lastSync": datetime.now().isoformat(),
    "neo4jNodes": 55315,
    "neo4jRelationships": 161574,
    "qdrantVectors": 35276
}

AI_SIGNALS: List[Dict[str, Any]] = [
    {
        "id": "sig-1",
        "severity": "high",
        "badge": "VIP ACCOUNT INSIGHT",
        "what_en": "Top Customer 'Brakes and Gears' (#CUST-29818) generated $989,184.08 USD across 12 orders.",
        "what_vi": "Khách hàng VIP 'Brakes and Gears' (#CUST-29818) đạt tổng doanh số $989,184.08 USD qua 12 đơn hàng.",
        "why_en": "Largest revenue contributor in AdventureWorks ERP. Prioritize executive outreach for contract renewal.",
        "why_vi": "Đối tác doanh số lớn nhất hệ thống AdventureWorks ERP. Cần ưu tiên chăm sóc gia hạn và rà soát hạn mức tín dụng.",
        "action_en": "Review account within 7 days",
        "action_vi": "Xem xét tài khoản trong vòng 7 ngày",
        "entityId": "29818"
    },
    {
        "id": "sig-2",
        "severity": "med",
        "badge": "LEGAL RISK",
        "what_en": "5 legal documents in CUAD repository lack Limitation of Liability clauses.",
        "what_vi": "5 hợp đồng pháp chế trong kho CUAD thiếu điều khoản giới hạn trách nhiệm (Limitation of Liability).",
        "why_en": "Uncapped liability exposes the business to unlimited damages in legal disputes.",
        "why_vi": "Thiếu điều khoản giới hạn trách nhiệm khiến doanh nghiệp đối mặt với rủi ro bồi thường vô hạn khi có tranh chấp.",
        "action_en": "Open Risk Center",
        "action_vi": "Mở Trung tâm Rủi ro",
        "entityId": "legal-contracts"
    },
    {
        "id": "sig-3",
        "severity": "low",
        "badge": "DATA QUALITY",
        "what_en": "All 581 documents and 35,276 vector points are 100% indexed and synchronized.",
        "what_vi": "Toàn bộ 581 tài liệu và 35,276 điểm vector đã lập chỉ mục và đồng bộ hoàn tất 100%.",
        "why_en": "Multi-department knowledge repository (Legal, Sales, Accounting, R&D, IT) verified in Central Storage & Neo4j.",
        "why_vi": "Kho tài liệu đa phòng ban đã đồng bộ hoàn chỉnh giữa Central Storage, Qdrant và Neo4j.",
        "action_en": "View Document Repository",
        "action_vi": "Xem Kho Tài liệu",
        "entityId": "doc-repository"
    }
]

ENTITIES: Dict[str, Any] = {
    "29818": {
        "id": "29818",
        "type": "CUSTOMER",
        "name": "Brakes and Gears",
        "verified": True,
        "status": "Human Verified",
        "risk": "Low",
        "industry": "Bicycle Retail & Distribution",
        "contact": "Executive Procurement Team",
        "revenue": "$989,184.08 USD",
        "ordersCount": 12,
        "activeContracts": 1,
        "relationships": [
            { "rel": "Placed Order", "target": "Order #43659", "warning": False },
            { "rel": "Purchased", "target": "Product #707 (Sport-100 Helmet)" },
            { "rel": "Customer Tier", "target": "Enterprise Partner" }
        ]
    },
    "29715": {
        "id": "29715",
        "type": "CUSTOMER",
        "name": "Excellent Riding Supplies",
        "verified": True,
        "status": "Human Verified",
        "risk": "Low",
        "industry": "Sports & Outdoor Goods",
        "contact": "Regional Account Lead",
        "revenue": "$961,675.86 USD",
        "ordersCount": 12,
        "activeContracts": 1,
        "relationships": [
            { "rel": "Placed Order", "target": "Sales Orders" },
            { "rel": "Purchased", "target": "Mountain Bikes & Components" }
        ]
    },
    "43659": {
        "id": "43659",
        "type": "ORDER",
        "name": "SalesOrder #43659",
        "verified": True,
        "status": "System Verified",
        "risk": "Low",
        "industry": "Sales & Commerce",
        "contact": "AdventureWorks ERP",
        "revenue": "$23,153.23 USD",
        "ordersCount": 1,
        "activeContracts": 1,
        "relationships": [
            { "rel": "Placed by", "target": "Better Bike Shop (#29825)" },
            { "rel": "Contains", "target": "Mountain-100 Silver, 38" }
        ]
    },
    "707": {
        "id": "707",
        "type": "PRODUCT",
        "name": "Sport-100 Helmet, Red",
        "verified": True,
        "status": "System Verified",
        "risk": "Low",
        "industry": "Safety Gear & Apparel",
        "contact": "Manufacturing Department",
        "revenue": "List Price: $34.99 USD",
        "ordersCount": 3088,
        "activeContracts": 1,
        "relationships": [
            { "rel": "SubCategory", "target": "Helmets" },
            { "rel": "Category", "target": "Accessories" }
        ]
    }
}

CONNECTORS: List[Dict[str, Any]] = [
    {
        "id": "conn-1",
        "name": "Neo4j Knowledge Graph",
        "type": "graph_database",
        "status": "Connected · Live",
        "lastSync": "Just now",
        "nextSync": "Real-time Event-driven",
        "filesProcessed": 581,
        "recordsExtracted": 55315,
        "relationshipsCount": 161574,
        "errors": 0
    },
    {
        "id": "conn-2",
        "name": "Qdrant Vector Database",
        "type": "vector_database",
        "status": "Connected · Continuous",
        "lastSync": "Just now",
        "nextSync": "Real-time",
        "filesProcessed": 2,
        "recordsExtracted": 35276,
        "errors": 0
    },
    {
        "id": "conn-3",
        "name": "Central Storage & AEGIS File Watcher",
        "type": "filesystem",
        "status": "Active · Live Sync",
        "lastSync": "Just now",
        "nextSync": "Continuous Event Stream",
        "filesProcessed": 581,
        "recordsExtracted": 581,
        "errors": 0
    },
    {
        "id": "conn-4",
        "name": "PostgreSQL RDBMS",
        "type": "relational_db",
        "status": "Connected · ACID Compliant",
        "lastSync": "Just now",
        "nextSync": "Transaction-based",
        "filesProcessed": 12,
        "recordsExtracted": "RBAC, Audit Logs, SOPs",
        "errors": 0
    }
]

LLMOPS_METRICS: Dict[str, Any] = {
    "model": "qwen2.5-7b-instruct-graphmind",
    "engine": "Ollama Local Inference",
    "hybridEngine": "Python Hybrid GraphRAG v2.6 (RRF Fusion)",
    "vectorPointsIndexed": 35276,
    "graphNodesIndexed": 55315,
    "documentsIndexed": 581,
    "avgLatency": "1.8s",
    "estimatedCost": "$0 (100% Local Self-Hosted)",
    "citationCoverage": "96.4%"
}
