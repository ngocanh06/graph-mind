"""
PB56 Workstation Service (Business Logic & Atomic Operations)
Namespace: pb56_*
"""
import asyncio
from datetime import datetime, timezone
import hashlib
import hmac
import secrets
from typing import Optional, Tuple, List, Dict, Any
from uuid import UUID

from sqlalchemy import select, update, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.modules.m1_data_sync.pb56_workstation_model import (
    PB56Workstation,
    PB56WorkstationSyncLog,
    PB56SyncModeAuditLog,
)
from app.modules.m1_data_sync.pb56_workstation_schemas import (
    PB56WorkstationRegisterRequest,
    PB56ChangeSyncModeRequest,
    PB56AckSyncModeRequest,
    PB56HeartbeatRequest,
    PB56SyncReportRequest,
    PB56WorkstationItem,
    PB56StatsSummary,
)

# Lock for dev-only lazy DDL table creation
_DEV_TABLE_INIT_LOCK = asyncio.Lock()
_DEV_TABLES_INITIALIZED = False

DEMO_UNUSABLE_TOKEN_HASH = "DEMO_UNUSABLE_TOKEN_NON_INVERTIBLE_GUARD"


def hash_agent_token(token: str) -> str:
    """Hashes agent token with SHA-256."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


def verify_agent_token(provided_token: str, stored_hash: str) -> bool:
    """Securely verifies agent token with constant-time comparison."""
    if not provided_token or not stored_hash:
        return False
    computed_hash = hash_agent_token(provided_token)
    return hmac.compare_digest(computed_hash, stored_hash)


def is_workstation_online(
    last_heartbeat_at: Optional[datetime],
    interval_sec: int = 30,
    threshold_cycles: int = 3,
    now: Optional[datetime] = None
) -> bool:
    """
    Condition 8: Single shared calculation function for dynamic Online/Offline status.
    Online if last_heartbeat_at is within (interval_sec * threshold_cycles) seconds.
    Pure calculation: does NOT perform any database write or commit.
    """
    if not last_heartbeat_at:
        return False
    current_time = now or datetime.now(timezone.utc)
    if last_heartbeat_at.tzinfo is None:
        last_heartbeat_at = last_heartbeat_at.replace(tzinfo=timezone.utc)
    delta_seconds = (current_time - last_heartbeat_at).total_seconds()
    max_allowed_seconds = max(10, interval_sec * threshold_cycles)
    return delta_seconds <= max_allowed_seconds


async def ensure_pb56_tables_dev(session: AsyncSession) -> None:
    """
    Condition 5: Dev-only lazy table creator.
    Does NOT run DDL on import.
    Runs lazy check only when APP_ENV == 'development'.
    """
    global _DEV_TABLES_INITIALIZED
    if getattr(settings, "APP_ENV", "development") != "development":
        return
    if _DEV_TABLES_INITIALIZED:
        return

    async with _DEV_TABLE_INIT_LOCK:
        if _DEV_TABLES_INITIALIZED:
            return
        # Create tables using raw DDL idempotent script
        ddl = """
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

        CREATE TABLE IF NOT EXISTS pb56_sync_mode_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workstation_id VARCHAR(64) NOT NULL REFERENCES pb56_workstations(id) ON DELETE CASCADE,
            action VARCHAR(32) NOT NULL,
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
        """
        try:
            await session.execute(text(ddl))
            await session.commit()
            _DEV_TABLES_INITIALIZED = True
        except Exception:
            await session.rollback()
            raise


# ── ADMIN OPERATIONS ───────────────────────────────────────────────────────────

async def register_workstation(
    session: AsyncSession,
    data: PB56WorkstationRegisterRequest
) -> Tuple[PB56Workstation, str]:
    """
    Condition 1: Admin registers new workstation.
    Generates cryptographically random plaintext token, returns it ONCE.
    Database only stores SHA-256 hash.
    """
    # Check if exists
    stmt = select(PB56Workstation).where(PB56Workstation.id == data.id)
    res = await session.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Máy trạm có mã định danh '{data.id}' đã tồn tại trong hệ thống."
        )

    # Generate token
    plaintext_token = f"aegis_sec_{secrets.token_urlsafe(32)}"
    token_hash = hash_agent_token(plaintext_token)
    now = datetime.now(timezone.utc)

    ws = PB56Workstation(
        id=data.id,
        hostname=data.hostname,
        ip_address=data.ip_address,
        os_info=data.os_info,
        monitored_folder=data.monitored_folder,
        agent_token_hash=token_hash,
        sync_mode=data.sync_mode,
        schedule_type=data.schedule_type if data.sync_mode == "scheduled" else None,
        shift_end_time=data.shift_end_time if data.sync_mode == "scheduled" and data.schedule_type == "end_of_shift" else None,
        timezone=data.timezone or "Asia/Ho_Chi_Minh",
        sync_mode_status="applied",
        heartbeat_interval_sec=data.heartbeat_interval_sec,
        heartbeat_threshold_cycles=data.heartbeat_threshold_cycles,
        last_heartbeat_at=None,
        files_ingested_total=0,
        records_extracted_total=0,
        checksum_errors_total=0,
        is_demo=False,
        created_at=now,
        updated_at=now,
    )
    session.add(ws)

    # Initial audit log
    audit = PB56SyncModeAuditLog(
        workstation_id=ws.id,
        action="APPLIED",
        old_sync_mode=None,
        new_sync_mode=ws.sync_mode,
        old_schedule_type=None,
        new_schedule_type=ws.schedule_type,
        old_shift_end_time=None,
        new_shift_end_time=ws.shift_end_time,
        changed_by="Admin (Registration)",
        notes="Đăng ký máy trạm mới ban đầu",
        created_at=now,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(ws)
    return ws, plaintext_token


async def rotate_workstation_token(
    session: AsyncSession,
    workstation_id: str,
    admin_email: str
) -> Tuple[PB56Workstation, str]:
    """
    Condition 1: Admin rotates agent token.
    Returns new plaintext token ONCE.
    """
    stmt = select(PB56Workstation).where(PB56Workstation.id == workstation_id)
    res = await session.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy máy trạm '{workstation_id}'.")
    if ws.is_demo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không thể đổi token máy trạm demo.")

    new_token = f"aegis_sec_{secrets.token_urlsafe(32)}"
    ws.agent_token_hash = hash_agent_token(new_token)
    ws.updated_at = datetime.now(timezone.utc)

    audit = PB56SyncModeAuditLog(
        workstation_id=ws.id,
        action="REQUESTED",
        old_sync_mode=ws.sync_mode,
        new_sync_mode=ws.sync_mode,
        changed_by=admin_email,
        notes="Cấp mới (rotate) Agent Token",
        created_at=ws.updated_at,
    )
    session.add(audit)
    await session.commit()
    return ws, new_token


async def list_workstations_with_summary(
    session: AsyncSession
) -> Tuple[List[PB56WorkstationItem], PB56StatsSummary]:
    """
    Condition 5 & 8: Lists workstations and computes summary statistics.
    GET is pure SELECT: ZERO database writes or commits!
    Uses shared is_workstation_online function.
    """
    now = datetime.now(timezone.utc)
    stmt = select(PB56Workstation).order_by(PB56Workstation.created_at.desc())
    res = await session.execute(stmt)
    workstations = res.scalars().all()

    items: List[PB56WorkstationItem] = []
    online_count = 0
    offline_count = 0
    total_files = 0
    total_records = 0
    total_checksum_errors = 0

    for ws in workstations:
        online = is_workstation_online(
            ws.last_heartbeat_at,
            ws.heartbeat_interval_sec or 30,
            ws.heartbeat_threshold_cycles or 3,
            now=now
        )
        if online:
            online_count += 1
        else:
            offline_count += 1

        total_files += int(ws.files_ingested_total or 0)
        total_records += int(ws.records_extracted_total or 0)
        total_checksum_errors += int(ws.checksum_errors_total or 0)

        items.append(PB56WorkstationItem(
            id=ws.id,
            hostname=ws.hostname,
            ip_address=ws.ip_address,
            os_info=ws.os_info,
            monitored_folder=ws.monitored_folder,
            sync_mode=ws.sync_mode,
            schedule_type=ws.schedule_type,
            shift_end_time=ws.shift_end_time,
            timezone=ws.timezone or "Asia/Ho_Chi_Minh",
            target_sync_mode=ws.target_sync_mode,
            target_schedule_type=ws.target_schedule_type,
            target_shift_end_time=ws.target_shift_end_time,
            sync_mode_status=ws.sync_mode_status,
            heartbeat_interval_sec=ws.heartbeat_interval_sec,
            heartbeat_threshold_cycles=ws.heartbeat_threshold_cycles,
            last_heartbeat_at=ws.last_heartbeat_at,
            is_online=online,
            files_ingested_total=int(ws.files_ingested_total or 0),
            records_extracted_total=int(ws.records_extracted_total or 0),
            checksum_errors_total=int(ws.checksum_errors_total or 0),
            is_demo=bool(ws.is_demo),
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        ))

    summary = PB56StatsSummary(
        total_workstations=len(items),
        online_count=online_count,
        offline_count=offline_count,
        total_files_ingested=total_files,
        total_records_extracted=total_records,
        total_checksum_errors=total_checksum_errors,
    )
    return items, summary


async def request_sync_mode_change(
    session: AsyncSession,
    workstation_id: str,
    req: PB56ChangeSyncModeRequest,
    admin_email: str
) -> PB56Workstation:
    """
    Condition 4: Admin updates sync mode.
    Sets status to 'pending' if online, 'pending_offline' if offline.
    """
    stmt = select(PB56Workstation).where(PB56Workstation.id == workstation_id)
    res = await session.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy máy trạm '{workstation_id}'.")

    now = datetime.now(timezone.utc)
    online = is_workstation_online(ws.last_heartbeat_at, ws.heartbeat_interval_sec, ws.heartbeat_threshold_cycles, now=now)
    new_status = "pending" if online else "pending_offline"

    ws.target_sync_mode = req.sync_mode
    ws.target_schedule_type = req.schedule_type if req.sync_mode == "scheduled" else None
    ws.target_shift_end_time = req.shift_end_time if req.sync_mode == "scheduled" and req.schedule_type == "end_of_shift" else None
    ws.sync_mode_status = new_status
    ws.updated_at = now

    audit = PB56SyncModeAuditLog(
        workstation_id=ws.id,
        action="REQUESTED",
        old_sync_mode=ws.sync_mode,
        new_sync_mode=req.sync_mode,
        old_schedule_type=ws.schedule_type,
        new_schedule_type=req.schedule_type,
        old_shift_end_time=ws.shift_end_time,
        new_shift_end_time=req.shift_end_time,
        changed_by=admin_email,
        notes=f"Admin yêu cầu đổi Sync Mode (Trạng thái: {new_status})",
        created_at=now,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(ws)
    return ws


async def cancel_pending_sync_mode(
    session: AsyncSession,
    workstation_id: str,
    admin_email: str
) -> PB56Workstation:
    """
    Condition 4: Cancels pending sync mode command.
    Returns 409 Conflict if no pending command exists.
    """
    stmt = select(PB56Workstation).where(PB56Workstation.id == workstation_id)
    res = await session.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy máy trạm '{workstation_id}'.")

    if not ws.target_sync_mode or ws.sync_mode_status == "applied":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không có lệnh thay đổi Sync Mode nào đang chờ áp dụng trên máy trạm này."
        )

    now = datetime.now(timezone.utc)
    cancelled_target = ws.target_sync_mode
    ws.target_sync_mode = None
    ws.target_schedule_type = None
    ws.target_shift_end_time = None
    ws.sync_mode_status = "applied"
    ws.updated_at = now

    audit = PB56SyncModeAuditLog(
        workstation_id=ws.id,
        action="CANCELLED",
        old_sync_mode=cancelled_target,
        new_sync_mode=ws.sync_mode,
        changed_by=admin_email,
        notes="Admin hủy lệnh chuyển đổi Sync Mode đang chờ",
        created_at=now,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(ws)
    return ws


# ── AGENT OPERATIONS ───────────────────────────────────────────────────────────

async def authenticate_agent(
    session: AsyncSession,
    workstation_id: str,
    token: str
) -> PB56Workstation:
    """
    Condition 1 & 3: Authenticates agent with workstation-specific token using hmac.compare_digest.
    Rejects is_demo workstations.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu mã token xác thực máy trạm (X-Agent-Token).")

    stmt = select(PB56Workstation).where(PB56Workstation.id == workstation_id)
    res = await session.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Máy trạm '{workstation_id}' chưa được đăng ký trong hệ thống.")

    if ws.is_demo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Máy trạm demo không được phép gửi tín hiệu thực tế.")

    if not verify_agent_token(token, ws.agent_token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token xác thực máy trạm không hợp lệ.")

    return ws


async def process_heartbeat(
    session: AsyncSession,
    req: PB56HeartbeatRequest,
    token: str
) -> Tuple[PB56Workstation, Optional[Dict[str, Any]]]:
    """
    Condition 4 & 7: Processes agent heartbeat.
    Only uses server time.
    Transitions 'pending_offline' to 'pending' on first heartbeat.
    Returns pending command if available.
    """
    ws = await authenticate_agent(session, req.id, token)
    now = datetime.now(timezone.utc)

    # Update metadata if sent
    if req.hostname: ws.hostname = req.hostname
    if req.ip_address: ws.ip_address = req.ip_address
    if req.os_info: ws.os_info = req.os_info
    if req.monitored_folder: ws.monitored_folder = req.monitored_folder

    ws.last_heartbeat_at = now

    # If was pending_offline, machine is now online -> transition to pending
    if ws.sync_mode_status == "pending_offline":
        ws.sync_mode_status = "pending"
        ws.updated_at = now

    await session.commit()

    pending_command = None
    if ws.target_sync_mode and ws.sync_mode_status == "pending":
        pending_command = {
            "target_sync_mode": ws.target_sync_mode,
            "target_schedule_type": ws.target_schedule_type,
            "target_shift_end_time": ws.target_shift_end_time,
            "timezone": ws.timezone,
        }

    return ws, pending_command


async def process_ack_sync_mode(
    session: AsyncSession,
    workstation_id: str,
    req: PB56AckSyncModeRequest,
    token: str
) -> Dict[str, Any]:
    """
    Condition 4: Atomic conditional UPDATE for ack-sync-mode.
    Repeated ACK when no pending command -> returns 200 no-op.
    Records REJECTED only on true mismatch.
    """
    ws = await authenticate_agent(session, workstation_id, token)
    now = datetime.now(timezone.utc)

    # If no pending target exists: repeated ACK is idempotent 200 no-op
    if not ws.target_sync_mode or ws.sync_mode_status == "applied":
        return {
            "success": True,
            "status": "applied",
            "message": "Không có lệnh thay đổi nào đang chờ (Đã áp dụng trước đó)",
            "sync_mode": ws.sync_mode
        }

    # Verify matching target
    is_mode_match = (req.applied_mode == ws.target_sync_mode)
    is_sched_match = True
    if ws.target_sync_mode == "scheduled":
        is_sched_match = (req.applied_schedule_type == ws.target_schedule_type)

    if not is_mode_match or not is_sched_match:
        # True mismatch: record REJECTED audit log
        audit = PB56SyncModeAuditLog(
            workstation_id=ws.id,
            action="REJECTED",
            old_sync_mode=ws.sync_mode,
            new_sync_mode=req.applied_mode,
            old_schedule_type=ws.schedule_type,
            new_schedule_type=req.applied_schedule_type,
            changed_by=f"Agent:{ws.hostname}",
            notes=f"Lệch cấu hình: Agent áp dụng '{req.applied_mode}' trong khi mục tiêu là '{ws.target_sync_mode}'",
            created_at=now,
        )
        session.add(audit)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cấu hình áp dụng ({req.applied_mode}) không khớp với cấu hình chỉ định ({ws.target_sync_mode})."
        )

    # Atomic conditional update
    applied_mode = ws.target_sync_mode
    applied_sched = ws.target_schedule_type
    applied_shift = ws.target_shift_end_time

    stmt = (
        update(PB56Workstation)
        .where(
            PB56Workstation.id == workstation_id,
            PB56Workstation.target_sync_mode == applied_mode,
            PB56Workstation.sync_mode_status.in_(["pending", "pending_offline"])
        )
        .values(
            sync_mode=applied_mode,
            schedule_type=applied_sched,
            shift_end_time=applied_shift,
            target_sync_mode=None,
            target_schedule_type=None,
            target_shift_end_time=None,
            sync_mode_status="applied",
            updated_at=now
        )
    )
    result = await session.execute(stmt)
    if result.rowcount == 0:
        # Another concurrent worker already updated
        return {"success": True, "status": "applied", "sync_mode": applied_mode}

    # Record APPLIED audit log
    audit = PB56SyncModeAuditLog(
        workstation_id=ws.id,
        action="APPLIED",
        old_sync_mode=ws.sync_mode,
        new_sync_mode=applied_mode,
        old_schedule_type=ws.schedule_type,
        new_schedule_type=applied_sched,
        old_shift_end_time=ws.shift_end_time,
        new_shift_end_time=applied_shift,
        changed_by=f"Agent:{ws.hostname}",
        notes="Agent đã xác nhận áp dụng thành công chế độ đồng bộ mới",
        created_at=now,
    )
    session.add(audit)
    await session.commit()

    return {
        "success": True,
        "status": "applied",
        "message": "Đã ghi nhận cấu hình Sync Mode áp dụng thành công",
        "sync_mode": applied_mode,
        "schedule_type": applied_sched
    }


async def process_sync_report(
    session: AsyncSession,
    workstation_id: str,
    req: PB56SyncReportRequest,
    token: str
) -> Dict[str, Any]:
    """
    Condition 2: Handles sync report with report_id idempotency.
    Insert log + atomic accumulation (x = x + :n) within SAME transaction.
    """
    ws = await authenticate_agent(session, workstation_id, token)

    # Check idempotency via UNIQUE (workstation_id, report_id)
    check_stmt = select(PB56WorkstationSyncLog).where(
        PB56WorkstationSyncLog.workstation_id == workstation_id,
        PB56WorkstationSyncLog.report_id == req.report_id
    )
    res = await session.execute(check_stmt)
    if res.scalar_one_or_none():
        # Duplicate report: idempotent 200 OK, no double-counting
        return {
            "success": True,
            "idempotent": True,
            "message": "Báo cáo này đã được tiếp nhận trước đó (Idempotent 200 OK).",
            "report_id": str(req.report_id)
        }

    now = datetime.now(timezone.utc)

    # 1. Insert sync log
    log = PB56WorkstationSyncLog(
        workstation_id=workstation_id,
        report_id=req.report_id,
        sync_mode_used=ws.sync_mode,
        files_ingested=req.files_ingested,
        records_extracted=req.records_extracted,
        checksum_errors=req.checksum_errors,
        status=req.status,
        error_message=req.error_message,
        details=req.details,
        created_at=now,
    )
    session.add(log)

    # 2. Atomic accumulation in SAME transaction
    upd_stmt = (
        update(PB56Workstation)
        .where(PB56Workstation.id == workstation_id)
        .values(
            files_ingested_total=PB56Workstation.files_ingested_total + req.files_ingested,
            records_extracted_total=PB56Workstation.records_extracted_total + req.records_extracted,
            checksum_errors_total=PB56Workstation.checksum_errors_total + req.checksum_errors,
            updated_at=now,
        )
    )
    await session.execute(upd_stmt)

    await session.commit()
    return {
        "success": True,
        "idempotent": False,
        "message": "Đã tiếp nhận và cộng dồn báo cáo đồng bộ thành công.",
        "report_id": str(req.report_id),
        "files_ingested": req.files_ingested,
        "records_extracted": req.records_extracted,
        "checksum_errors": req.checksum_errors,
    }


# ── SEED DEMO DATA ─────────────────────────────────────────────────────────────

async def seed_demo_data(session: AsyncSession) -> Dict[str, Any]:
    """
    Condition 3: Seeds 3 realistic workstations for dev verification.
    Strictly blocked unless os.getenv("APP_ENV") == "development".
    Uses unusable token hash; agent calls rejected on demo machines.
    """
    if getattr(settings, "APP_ENV", None) != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint seed-demo chỉ được phép chạy khi APP_ENV được đặt tường minh là 'development'."
        )

    now = datetime.now(timezone.utc)
    demo_workstations = [
        {
            "id": "WS-SALES-HN01",
            "hostname": "sales-desktop-01.hn.internal",
            "ip_address": "192.168.10.45",
            "os_info": "Windows 11 Pro 64-bit",
            "monitored_folder": "D:/AEGIS_Data/Sales_Contracts",
            "sync_mode": "realtime",
            "schedule_type": None,
            "shift_end_time": None,
            "timezone": "Asia/Ho_Chi_Minh",
            "target_sync_mode": None,
            "target_schedule_type": None,
            "target_shift_end_time": None,
            "sync_mode_status": "applied",
            "heartbeat_interval_sec": 30,
            "heartbeat_threshold_cycles": 3,
            "last_heartbeat_at": now,  # Online
            "files_ingested_total": 142,
            "records_extracted_total": 4820,
            "checksum_errors_total": 0,
            "is_demo": True,
        },
        {
            "id": "WS-LEGAL-HCM02",
            "hostname": "legal-macbook-pro.hcm.internal",
            "ip_address": "192.168.20.112",
            "os_info": "macOS Sonoma 14.5",
            "monitored_folder": "/Users/legal/Documents/CUAD_Legal_Docs",
            "sync_mode": "scheduled",
            "schedule_type": "15m",
            "shift_end_time": None,
            "timezone": "Asia/Ho_Chi_Minh",
            "target_sync_mode": None,
            "target_schedule_type": None,
            "target_shift_end_time": None,
            "sync_mode_status": "applied",
            "heartbeat_interval_sec": 30,
            "heartbeat_threshold_cycles": 3,
            "last_heartbeat_at": now,  # Online
            "files_ingested_total": 89,
            "records_extracted_total": 2150,
            "checksum_errors_total": 1,
            "is_demo": True,
        },
        {
            "id": "WS-RND-UBUNTU",
            "hostname": "rnd-lab-server.internal",
            "ip_address": "10.0.15.8",
            "os_info": "Ubuntu 22.04 LTS",
            "monitored_folder": "/mnt/storage/rnd/linear_models",
            "sync_mode": "scheduled",
            "schedule_type": "end_of_shift",
            "shift_end_time": "18:00",
            "timezone": "Asia/Ho_Chi_Minh",
            "target_sync_mode": "realtime",
            "target_schedule_type": None,
            "target_shift_end_time": None,
            "sync_mode_status": "pending_offline",
            "heartbeat_interval_sec": 30,
            "heartbeat_threshold_cycles": 3,
            "last_heartbeat_at": datetime(2026, 11, 5, 8, 0, 0, tzinfo=timezone.utc),  # Offline > 3 cycles
            "files_ingested_total": 230,
            "records_extracted_total": 11400,
            "checksum_errors_total": 0,
            "is_demo": True,
        },
    ]

    seeded_ids = []
    for d in demo_workstations:
        stmt = select(PB56Workstation).where(PB56Workstation.id == d["id"])
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            # Update existing demo machine
            for k, v in d.items():
                setattr(existing, k, v)
            existing.agent_token_hash = DEMO_UNUSABLE_TOKEN_HASH
            existing.updated_at = now
        else:
            ws = PB56Workstation(
                **d,
                agent_token_hash=DEMO_UNUSABLE_TOKEN_HASH,
                created_at=now,
                updated_at=now,
            )
            session.add(ws)
        seeded_ids.append(d["id"])

    await session.commit()
    return {
        "success": True,
        "message": f"Đã nạp thành công {len(seeded_ids)} máy trạm demo cho môi trường development.",
        "workstations": seeded_ids
    }

