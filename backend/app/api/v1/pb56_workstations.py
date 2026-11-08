"""
PB56 Workstation & Sync Mode Management API Router
Namespace: /api/v1/workstations
Additive-only: mounts only when PB56_WORKSTATIONS_ENABLED == True.
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.postgres.database import get_db
from app.core.rbac import get_user_scope, ScopeContext

from app.modules.m1_data_sync.pb56_workstation_schemas import (
    PB56WorkstationRegisterRequest,
    PB56WorkstationRegisterResponse,
    PB56RotateTokenResponse,
    PB56ChangeSyncModeRequest,
    PB56AckSyncModeRequest,
    PB56HeartbeatRequest,
    PB56HeartbeatResponse,
    PB56SyncReportRequest,
    PB56WorkstationListResponse,
)
from app.modules.m1_data_sync.pb56_workstation_service import (
    ensure_pb56_tables_dev,
    register_workstation,
    rotate_workstation_token,
    list_workstations_with_summary,
    request_sync_mode_change,
    cancel_pending_sync_mode,
    process_heartbeat,
    process_ack_sync_mode,
    process_sync_report,
    seed_demo_data,
)

router = APIRouter()


# ── CONDITION 6: STRICT ADMIN DEPENDENCY ──────────────────────────────────────
async def require_pb56_admin(
    scope: ScopeContext = Depends(get_user_scope)
) -> ScopeContext:
    """
    Condition 6: get_user_scope returns ScopeContext but does NOT raise 403 on its own.
    This new dependency checks admin privilege and raises 403 Forbidden for non-admins.
    """
    role = (getattr(scope, "role", "") or "").lower().strip()
    is_admin = getattr(scope, "is_admin", False)
    is_exec = getattr(scope, "is_exec", False)
    is_unrestricted = getattr(scope, "is_unrestricted", False)

    if not (is_admin or is_exec or is_unrestricted or role in ("admin", "it_admin", "secops", "executive")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Truy cập bị từ chối: Chức năng Quản lý Máy trạm PB56 yêu cầu quyền Quản trị viên (Admin / SecOps)."
        )
    return scope


def get_agent_token_header(
    x_agent_token: Optional[str] = Header(None, alias="X-Agent-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Extracts agent token from X-Agent-Token or Bearer Authorization header."""
    if x_agent_token and x_agent_token.strip():
        return x_agent_token.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


# ── STATUS ENDPOINT (PUBLIC) ──────────────────────────────────────────────────
@router.get("/status", tags=["PB56 Workstations"])
async def get_pb56_feature_status():
    """Returns feature flag status for frontend dynamic verification."""
    is_enabled = getattr(settings, "PB56_WORKSTATIONS_ENABLED", False)
    return {
        "success": True,
        "feature": "PB56_WORKSTATIONS",
        "enabled": bool(is_enabled),
        "app_env": getattr(settings, "APP_ENV", "development"),
    }


# ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────
@router.get("", response_model=PB56WorkstationListResponse, tags=["PB56 Workstations"])
@router.get("/", response_model=PB56WorkstationListResponse, tags=["PB56 Workstations"])
async def get_workstations_list(
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 5 & 8: Lists workstations + aggregated summary.
    Pure SELECT, dynamic is_online, zero database writes.
    """
    await ensure_pb56_tables_dev(db)
    items, summary = await list_workstations_with_summary(db)
    return {
        "success": True,
        "summary": summary,
        "workstations": items,
    }


@router.post("/register", response_model=PB56WorkstationRegisterResponse, tags=["PB56 Workstations"])
async def register_new_workstation(
    req: PB56WorkstationRegisterRequest,
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 1: Admin registers new workstation and obtains plaintext token ONCE.
    """
    await ensure_pb56_tables_dev(db)
    ws, token = await register_workstation(db, req)
    return {
        "success": True,
        "id": ws.id,
        "hostname": ws.hostname,
        "ip_address": ws.ip_address,
        "agent_token": token,
        "message": "Đã tạo máy trạm thành công. Hãy lưu mã Token này vì sẽ không hiển thị lại!",
    }


@router.post("/{workstation_id}/rotate-token", response_model=PB56RotateTokenResponse, tags=["PB56 Workstations"])
async def rotate_token_for_workstation(
    workstation_id: str,
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 1: Admin rotates token for an existing workstation.
    """
    await ensure_pb56_tables_dev(db)
    admin_email = getattr(scope.user, "email", "admin@graphmind.ai") if hasattr(scope, "user") else "admin"
    ws, new_token = await rotate_workstation_token(db, workstation_id, admin_email)
    return {
        "success": True,
        "id": ws.id,
        "new_agent_token": new_token,
        "message": "Đã cấp mới Token thành công. Hãy cập nhật Token mới vào máy trạm!",
    }


@router.post("/{workstation_id}/sync-mode", tags=["PB56 Workstations"])
async def change_sync_mode(
    workstation_id: str,
    req: PB56ChangeSyncModeRequest,
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 4: Admin updates sync mode command.
    Transitions to 'pending' if online, 'pending_offline' if offline.
    """
    await ensure_pb56_tables_dev(db)
    admin_email = getattr(scope.user, "email", "admin@graphmind.ai") if hasattr(scope, "user") else "admin"
    ws = await request_sync_mode_change(db, workstation_id, req, admin_email)
    return {
        "success": True,
        "id": ws.id,
        "sync_mode": ws.sync_mode,
        "target_sync_mode": ws.target_sync_mode,
        "sync_mode_status": ws.sync_mode_status,
        "message": (
            "Lệnh đổi sang chế độ mới đang chờ Agent kết nối và xác nhận (Pending)."
            if ws.sync_mode_status == "pending" else
            "Máy trạm hiện đang Offline. Lệnh chuyển chế độ sẽ được áp dụng khi máy online trở lại (Pending Offline)."
        ),
    }


@router.post("/{workstation_id}/cancel-sync-mode", tags=["PB56 Workstations"])
async def cancel_sync_mode(
    workstation_id: str,
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 4: Admin cancels pending sync mode command. Returns 409 if no pending command.
    """
    await ensure_pb56_tables_dev(db)
    admin_email = getattr(scope.user, "email", "admin@graphmind.ai") if hasattr(scope, "user") else "admin"
    ws = await cancel_pending_sync_mode(db, workstation_id, admin_email)
    return {
        "success": True,
        "id": ws.id,
        "sync_mode": ws.sync_mode,
        "sync_mode_status": ws.sync_mode_status,
        "message": "Đã hủy lệnh chuyển đổi chế độ đồng bộ đang chờ.",
    }


@router.post("/seed-demo", tags=["PB56 Workstations"])
async def seed_demo_workstations(
    scope: ScopeContext = Depends(require_pb56_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 3: Seeds demo workstations strictly in development environment.
    """
    await ensure_pb56_tables_dev(db)
    return await seed_demo_data(db)


# ── AGENT ENDPOINTS ───────────────────────────────────────────────────────────
@router.post("/heartbeat", response_model=PB56HeartbeatResponse, tags=["PB56 Workstations"])
async def agent_heartbeat(
    req: PB56HeartbeatRequest,
    token: str = Depends(get_agent_token_header),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 1, 4, 7: Agent sends heartbeat.
    Server time only.
    Transitions pending_offline -> pending.
    Returns pending command if available.
    """
    await ensure_pb56_tables_dev(db)
    ws, pending_cmd = await process_heartbeat(db, req, token)
    return {
        "success": True,
        "id": ws.id,
        "server_time": ws.last_heartbeat_at,
        "is_online": True,
        "sync_mode": ws.sync_mode,
        "schedule_type": ws.schedule_type,
        "shift_end_time": ws.shift_end_time,
        "timezone": ws.timezone or "Asia/Ho_Chi_Minh",
        "has_pending_command": bool(pending_cmd),
        "pending_command": pending_cmd,
        "message": "Heartbeat received successfully.",
    }


@router.post("/{workstation_id}/ack-sync-mode", tags=["PB56 Workstations"])
async def agent_ack_sync_mode(
    workstation_id: str,
    req: PB56AckSyncModeRequest,
    token: str = Depends(get_agent_token_header),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 4: Agent acknowledges applied sync mode.
    Atomic conditional update.
    Repeated ack returns 200 no-op.
    Logs REJECTED only on true mismatch.
    """
    await ensure_pb56_tables_dev(db)
    return await process_ack_sync_mode(db, workstation_id, req, token)


@router.post("/{workstation_id}/sync-report", tags=["PB56 Workstations"])
async def agent_sync_report(
    workstation_id: str,
    req: PB56SyncReportRequest,
    token: str = Depends(get_agent_token_header),
    db: AsyncSession = Depends(get_db)
):
    """
    Condition 2: Agent reports sync batch with report_id idempotency.
    Insert log + atomic accumulation in single database transaction.
    """
    await ensure_pb56_tables_dev(db)
    return await process_sync_report(db, workstation_id, req, token)

