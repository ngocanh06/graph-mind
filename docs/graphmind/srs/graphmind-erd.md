# GraphMind (EKAI v1.2) — Data Architecture Models (PostgreSQL ERD & Neo4j Graph Ontology)

## 1. PostgreSQL Relational Entity-Relationship Diagram (Figure 6.6)

```mermaid
erDiagram
    departments {
        UUID id PK
        VARCHAR name
        VARCHAR code UK
        TEXT description
        UUID manager_id FK
        TIMESTAMP created_at
    }
    users {
        UUID id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR role_id
        UUID department_id FK
        BOOLEAN is_active
        TIMESTAMP created_at
    }
    rbac_permissions_matrix {
        UUID id PK
        VARCHAR role_id
        VARCHAR resource_name
        VARCHAR permission_type
        BOOLEAN is_granted
        TIMESTAMP updated_at
    }
    user_active_sessions {
        UUID id PK
        UUID user_id FK
        VARCHAR jti UK
        VARCHAR ip_address
        TEXT user_agent
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP expires_at
    }
    password_reset_tokens {
        UUID id PK
        VARCHAR email FK
        VARCHAR otp_hash
        VARCHAR reset_token
        INT attempts_count
        BOOLEAN is_used
        TIMESTAMP expires_at
    }
    documents {
        UUID id PK
        VARCHAR title
        TEXT file_path
        BIGINT file_size
        VARCHAR mime_type
        VARCHAR sha256_hash UK
        VARCHAR status
        UUID department_id FK
        UUID uploaded_by FK
        TIMESTAMP created_at
    }
    document_approvals {
        UUID id PK
        UUID document_id FK
        VARCHAR action
        TEXT rejection_reason
        UUID approved_by FK
        TIMESTAMP created_at
    }
    shift_reports {
        UUID id PK
        UUID user_id FK
        UUID department_id FK
        VARCHAR shift_name
        DATE report_date
        TEXT completed_tasks
        TEXT issues_encountered
        TEXT handover_notes
        VARCHAR status
        UUID signed_by_manager_id FK
        TIMESTAMP approved_at
    }
    shift_daily_summaries {
        UUID id PK
        UUID department_id FK
        DATE summary_date
        TEXT content_markdown
        INT total_shifts
        INT total_issues
        BOOLEAN is_fallback_generated
        TIMESTAMP created_at
    }
    audit_logs {
        UUID id PK
        UUID user_id FK
        VARCHAR event_type
        VARCHAR resource_affected
        VARCHAR ip_address
        VARCHAR severity_level
        JSONB details_json
        TIMESTAMP created_at
    }

    departments ||--o{ users : "employs"
    users |o--o| departments : "manages"
    users }o--o{ rbac_permissions_matrix : "governed_by_role"
    users ||--o{ user_active_sessions : "owns_session"
    users ||--o{ password_reset_tokens : "requests_otp"
    users |o--o{ audit_logs : "generates_audit"
    departments ||--o{ documents : "scopes"
    users ||--o{ documents : "uploads"
    documents ||--o| document_approvals : "reviewed_in"
    users ||--o{ document_approvals : "approves_or_rejects"
    departments ||--o{ shift_reports : "owns"
    users ||--o{ shift_reports : "authors"
    users |o--o{ shift_reports : "signs_off"
    departments |o--o{ shift_daily_summaries : "summarizes"
    shift_reports }o--o| shift_daily_summaries : "consolidated_into"
```

## 2. Neo4j Knowledge Graph Property Ontology Schema (Figure 6.7)

- **Core Governance & Enterprise Nodes**: `:Department`, `:Employee`, `:Document`, `:SOP`, `:Entity`, `:RiskEvent`
- **CRM & Legal Contract Nodes (AdventureWorks + CUAD)**: `:Customer`, `:SalesOrder`, `:Product`, `:Contract`, `:Clause`
- **Core Relationships**:
  - `(:Employee)-[:BELONGS_TO]->(:Department)`
  - `(:Employee)-[:AUTHORED]->(:Document)`
  - `(:Document)-[:MENTIONS {confidence: float}]->(:Entity)`
  - `(:SOP)-[:GOVERNED_BY]->(:Department)`
  - `(:Customer)-[:PLACED]->(:SalesOrder)`
  - `(:SalesOrder)-[:CONTAINS {qty: int, unit_price: float}]->(:Product)`
  - `(:Customer)-[:BOUND_BY {synthetic_link: 'BR-01 (1..3)'}]->(:Contract)`
  - `(:Contract)-[:HAS_CLAUSE]->(:Clause)`
  - `(:RiskEvent)-[:TRIGGERED_BY_ORDER]->(:SalesOrder)`
  - `(:RiskEvent)-[:TRIGGERED_BY_CLAUSE]->(:Clause)`
