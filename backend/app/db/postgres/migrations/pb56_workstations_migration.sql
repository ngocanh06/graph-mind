-- ==============================================================================
-- PB56: Bảng điều khiển Quản lý Máy trạm AEGIS Local Agent (Migration)
-- ==============================================================================

-- 1. Bảng quản lý máy trạm và trạng thái đồng bộ
CREATE TABLE IF NOT EXISTS pb56_workstations (
    id VARCHAR(64) PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    os_info VARCHAR(128) NOT NULL,
    monitored_folder VARCHAR(512) NOT NULL,
    agent_token_hash VARCHAR(128) NOT NULL,
    sync_mode VARCHAR(32) NOT NULL DEFAULT 'realtime',
    schedule_type VARCHAR(32) NULL,
    shift_end_time VARCHAR(8) NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    target_sync_mode VARCHAR(32) NULL,
    target_schedule_type VARCHAR(32) NULL,
    target_shift_end_time VARCHAR(8) NULL,
    sync_mode_status VARCHAR(32) NOT NULL DEFAULT 'applied',
    heartbeat_interval_sec INTEGER NOT NULL DEFAULT 30,
    heartbeat_threshold_cycles INTEGER NOT NULL DEFAULT 3,
    last_heartbeat_at TIMESTAMPTZ NULL,
    files_ingested_total BIGINT NOT NULL DEFAULT 0,
    records_extracted_total BIGINT NOT NULL DEFAULT 0,
    checksum_errors_total BIGINT NOT NULL DEFAULT 0,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng lịch sử đồng bộ chi tiết (với ràng buộc UNIQUE workstation_id + report_id chống cộng lặp)
CREATE TABLE IF NOT EXISTS pb56_workstation_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstation_id VARCHAR(64) NOT NULL REFERENCES pb56_workstations(id) ON DELETE CASCADE,
    report_id UUID NOT NULL,
    sync_mode_used VARCHAR(32) NOT NULL DEFAULT 'realtime',
    files_ingested INTEGER NOT NULL DEFAULT 0,
    records_extracted INTEGER NOT NULL DEFAULT 0,
    checksum_errors INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT NULL,
    details JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pb56_sync_report UNIQUE (workstation_id, report_id)
);

-- 3. Bảng nhật ký kiểm toán thay đổi Sync Mode riêng biệt
CREATE TABLE IF NOT EXISTS pb56_sync_mode_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstation_id VARCHAR(64) NOT NULL REFERENCES pb56_workstations(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL, -- 'REQUESTED', 'APPLIED', 'CANCELLED', 'REJECTED'
    old_sync_mode VARCHAR(32) NULL,
    new_sync_mode VARCHAR(32) NULL,
    old_schedule_type VARCHAR(32) NULL,
    new_schedule_type VARCHAR(32) NULL,
    old_shift_end_time VARCHAR(8) NULL,
    new_shift_end_time VARCHAR(8) NULL,
    changed_by VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index hỗ trợ tra cứu nhanh
CREATE INDEX IF NOT EXISTS ix_pb56_workstations_last_hb ON pb56_workstations(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS ix_pb56_workstations_status ON pb56_workstations(sync_mode_status);
CREATE INDEX IF NOT EXISTS ix_pb56_sync_logs_ws ON pb56_workstation_sync_logs(workstation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_pb56_audit_ws ON pb56_sync_mode_audit_logs(workstation_id, created_at DESC);

