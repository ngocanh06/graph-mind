-- GraphMind (EKAI v1.2) PostgreSQL Relational DDL (10 Core Tables - Section 6.6.1)
-- Generated with /dbdiagram skill

CREATE TABLE departments (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(32) UNIQUE NOT NULL,
    description TEXT,
    manager_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(32) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE rbac_permissions_matrix (
    id UUID PRIMARY KEY,
    role_id VARCHAR(32) NOT NULL,
    resource_name VARCHAR(64) NOT NULL,
    permission_type VARCHAR(32) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (role_id, resource_name, permission_type)
);

CREATE TABLE user_active_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jti VARCHAR(128) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),
    attempts_count INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_APPROVAL',
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_approvals (
    id UUID PRIMARY KEY,
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    action VARCHAR(16) NOT NULL,
    rejection_reason TEXT,
    approved_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shift_reports (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    shift_name VARCHAR(64) NOT NULL,
    report_date DATE NOT NULL,
    completed_tasks TEXT NOT NULL,
    issues_encountered TEXT,
    handover_notes TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    signed_by_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP
);

CREATE TABLE shift_daily_summaries (
    id UUID PRIMARY KEY,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    summary_date DATE NOT NULL,
    content_markdown TEXT NOT NULL,
    total_shifts INT NOT NULL DEFAULT 0,
    total_issues INT NOT NULL DEFAULT 0,
    is_fallback_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    resource_affected VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45),
    severity_level VARCHAR(16) NOT NULL,
    details_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
