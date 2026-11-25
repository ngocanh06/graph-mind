# GraphMind (EKAI v1.2) — State Machine Specifications (Section 6.7)

## 1. Figure 6.8 — Document Approval & Ingestion State Machine Diagram (FR53–FR54)

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : User uploads file (Format valid, Size <= 50MB, SHA-256 unique [BR-06])
    UPLOADED --> PENDING_APPROVAL : Record created in documents table [status = PENDING_APPROVAL] (FR53)
    PENDING_APPROVAL --> APPROVED : Knowledge Admin approves document [action = APPROVE] (FR54)
    PENDING_APPROVAL --> REJECTED : Knowledge Admin rejects document [action = REJECT + mandatory rejection_reason]
    APPROVED --> INGESTING : Async Celery Ingestion Pipeline triggered
    INGESTING --> INDEXED_READY : Qdrant 768-d vectors & Neo4j entities persisted
    INGESTING --> INGESTION_FAILED : Parser / Embedding / Neo4j error
    INGESTION_FAILED --> INGESTING : Admin triggers retry
    REJECTED --> [*] : Excluded from Knowledge Base
    INDEXED_READY --> [*] : Searchable in Hybrid AI Copilot
```

## 2. Figure 6.9 — Shift Handover & Daily Consolidation State Machine Diagram (FR55–FR57)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Outgoing staff initializes shift handover form
    DRAFT --> SUBMITTED : Staff clicks Submit Shift Report [status = SUBMITTED] (FR55)
    SUBMITTED --> APPROVED : Dept Manager signs off [signed_by_manager_id + approved_at] (FR56)
    SUBMITTED --> REJECTED : Dept Manager requests revision [mandatory remarks]
    REJECTED --> DRAFT : Staff edits shift report to address feedback
    APPROVED --> CONSOLIDATED : Daily Consolidation Job (23:00 Cron / Manual) via Ollama LLM or Rule-Based Fallback (FR57)
    CONSOLIDATED --> [*] : Published on Executive & Manager Dashboard
```
