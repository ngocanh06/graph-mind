# GraphMind (EKAI v1.2) — Activity & Sequence Flows for UC.23 to UC.27 (Sections 6.3 & 6.4)

## 1. UC.23 — Internal Document Upload & Approval Workflow (FR53, FR54)

### Activity Swimlane Diagram (Figure 6.3.23)
![Figure 6.3.23](../../../diagram_output/workflow/Figure_6.3.23_Activity_UC23_Document_Upload_Approval.svg)

### Sequence Diagram (Figure 6.4.23)
```mermaid
sequenceDiagram
    autonumber
    actor U as Standard User / Manager
    actor KA as Knowledge Administrator
    participant FE as React Web UI
    participant API as FastAPI DocumentService
    participant DB as PostgreSQL
    participant CEL as Celery Ingestion Worker

    U->>FE: Select file (<=50MB), owning department & click Upload
    FE->>API: POST /api/v1/documents/upload (multipart/form-data)
    API->>API: Validate extension, size <= 50MB & compute SHA-256 hash
    API->>DB: SELECT id FROM documents WHERE sha256_hash = :hash
    alt SHA-256 hash already exists (BR-06)
        DB-->>API: Existing document record
        API-->>FE: HTTP 409 Conflict (Duplicate SHA-256 content)
    else Unique SHA-256 hash
        DB-->>API: No duplicate found
        API->>DB: INSERT INTO documents (status='PENDING_APPROVAL') (FR53)
        API-->>FE: HTTP 201 Created (status = PENDING_APPROVAL)
        KA->>FE: Open Approval Queue & review document
        alt Approve Document (FR54)
            KA->>FE: Click Approve
            FE->>API: POST /api/v1/documents/{id}/approve
            API->>DB: UPDATE documents SET status='APPROVED' + INSERT document_approvals
            API->>CEL: enqueue_task(process_approved_document, doc_id)
            API-->>FE: HTTP 200 OK (Approved & Ingestion Triggered)
        else Reject Document
            KA->>FE: Enter mandatory rejection_reason & click Reject
            FE->>API: POST /api/v1/documents/{id}/reject
            API->>DB: UPDATE documents SET status='REJECTED' + INSERT document_approvals
            API-->>FE: HTTP 200 OK (Rejected)
        end
    end
```

---

## 2. UC.24 — Departmental Shift Handover & Sign-Off (FR55, FR56)

### Activity Swimlane Diagram (Figure 6.3.24)
![Figure 6.3.24](../../../diagram_output/workflow/Figure_6.3.24_Activity_UC24_Shift_Handover_Signoff.svg)

### Sequence Diagram (Figure 6.4.24)
```mermaid
sequenceDiagram
    autonumber
    actor S as Standard User (Outgoing Staff)
    actor M as Department Manager
    participant FE as React Web UI
    participant API as FastAPI ShiftHandoverService
    participant DB as PostgreSQL

    S->>FE: Fill shift report fields & click Submit Shift Report
    FE->>API: POST /api/v1/shifts/reports
    API->>DB: INSERT INTO shift_reports (status='SUBMITTED') (FR55)
    API-->>FE: HTTP 201 Created (status = SUBMITTED)
    M->>FE: Open Pending Shift Approvals Queue
    FE->>API: GET /api/v1/shifts/reports?status=SUBMITTED
    API->>DB: SELECT * FROM shift_reports WHERE department_id=:dept AND status='SUBMITTED'
    DB-->>API: Pending shift reports
    API-->>FE: Render shift reports for review
    alt Sign Off & Approve (FR56)
        M->>FE: Enter remarks & click Sign Off & Approve
        FE->>API: POST /api/v1/shifts/reports/{id}/sign-off
        API->>DB: UPDATE shift_reports SET status='APPROVED', signed_by_manager_id=:mgr, approved_at=NOW()
        API-->>FE: HTTP 200 OK (Signed Off)
    else Request Revision
        M->>FE: Enter mandatory rejection reason & click Reject
        FE->>API: POST /api/v1/shifts/reports/{id}/reject
        API->>DB: UPDATE shift_reports SET status='REJECTED'
        API-->>FE: HTTP 200 OK (Returned for revision)
    end
```

---

## 3. UC.25 — Daily Automated Shift Consolidation (FR57)

### Activity Swimlane Diagram (Figure 6.3.25)
![Figure 6.3.25](../../../diagram_output/workflow/Figure_6.3.25_Activity_UC25_Daily_Shift_Consolidation.svg)

### Sequence Diagram (Figure 6.4.25)
```mermaid
sequenceDiagram
    autonumber
    actor T as Celery Beat (23:00) / Manager
    participant API as FastAPI ConsolidationService
    participant DB as PostgreSQL
    participant LLM as Local Ollama LLM (Qwen2.5-7B)

    T->>API: Trigger Daily Shift Consolidation (report_date, department_id)
    API->>DB: SELECT * FROM shift_reports WHERE report_date=:date AND status='APPROVED'
    DB-->>API: List of approved shift reports
    API->>LLM: POST /api/generate (ChatML consolidation prompt)
    alt Ollama LLM responds within 30s
        LLM-->>API: Structured Markdown executive summary
        API->>DB: INSERT INTO shift_daily_summaries (is_fallback_generated=FALSE)
    else Ollama timeout or connection error (FR57 Fallback)
        API->>API: Execute Deterministic Rule-Based SQL/Template Aggregation
        API->>DB: INSERT INTO shift_daily_summaries (is_fallback_generated=TRUE)
    end
    API-->>T: Consolidation completed
```

---

## 4. UC.26 — Granular Security & Access Enforcement (FR58, FR59, FR60)

### Activity Swimlane Diagram (Figure 6.3.26)
![Figure 6.3.26](../../../diagram_output/workflow/Figure_6.3.26_Activity_UC26_Security_Access_Enforcement.svg)

### Sequence Diagram (Figure 6.4.26)
```mermaid
sequenceDiagram
    autonumber
    actor U as User (New Device B)
    actor UOld as User (Previous Device A)
    participant API as FastAPI Auth & Session Guard
    participant DB as PostgreSQL (user_active_sessions)
    participant R as Redis JTI Blacklist

    U->>API: POST /api/v1/auth/login (username, password)
    API->>DB: SELECT id, jti FROM user_active_sessions WHERE user_id=:uid AND status='ACTIVE'
    alt Active session exists on Device A (FR59)
        DB-->>API: Existing session (old_jti)
        API->>DB: UPDATE user_active_sessions SET status='REVOKED' WHERE jti=:old_jti
        API->>R: SETEX blacklist:jti:{old_jti} True
    end
    API->>DB: INSERT INTO user_active_sessions (jti=new_jti, status='ACTIVE')
    API-->>U: HTTP 200 OK (JWT with new_jti)
    UOld->>API: Subsequent API request with old_jti
    API->>R: EXISTS blacklist:jti:{old_jti}
    R-->>API: True (Blacklisted)
    API-->>UOld: HTTP 401 Unauthorized (SESSION_REVOKED_NEW_LOGIN)
```

---

## 5. UC.27 — Proactive Threat Mitigation & Workstation Kill Switch (FR61, FR62)

### Activity Swimlane Diagram (Figure 6.3.27)
![Figure 6.3.27](../../../diagram_output/workflow/Figure_6.3.27_Activity_UC27_Threat_Mitigation_KillSwitch.svg)

### Sequence Diagram (Figure 6.4.27)
```mermaid
sequenceDiagram
    autonumber
    actor U as Standard User / Manager
    actor A as System & IT Administrator
    participant COP as Hybrid AI Copilot Engine
    participant GUARD as Read-Only Cypher Guard (FR61)
    participant NEO as Neo4j Graph DB
    participantDB as PostgreSQL (audit_logs)
    participant WSS as FastAPI WebSocket Hub
    participant AEGIS as AEGIS Local Agent

    U->>COP: Submit natural language query
    COP->>GUARD: validateReadOnlyCypher(generated_cypher)
    alt Destructive Cypher keyword detected (CREATE/SET/DELETE/MERGE/DROP/REMOVE/CALL)
        GUARD->>participantDB: INSERT INTO audit_logs (severity='CRITICAL', event='CYPHER_MUTATION_BLOCKED')
        GUARD-->>U: HTTP 403 Forbidden (Destructive Cypher blocked)
    else Safe read-only MATCH/RETURN query
        GUARD->>NEO: Execute read-only Cypher query
        NEO-->>COP: Graph query results
        COP-->>U: Grounded response with citations
    end
    A->>WSS: POST /api/v1/workstations/{id}/kill-switch (FR62)
    WSS->>AEGIS: WSS Push {"command": "EMERGENCY_KILL"} (<= 3s SLA)
    AEGIS->>AEGIS: Abort sync threads & wipe local token cache
    AEGIS-->>WSS: ACK KILLED_AND_REVOKED
```
