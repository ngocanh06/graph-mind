"""
Unit Tests for PB56 Workstation & Sync Mode Management
Namespace: pb56_*
Runs against an in-memory SQLite async database or Postgres test session.
"""
from datetime import datetime, timezone, timedelta
import os
import uuid
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
from fastapi import HTTPException

from app.db.postgres.database import Base
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
)
from app.modules.m1_data_sync.pb56_workstation_service import (
    is_workstation_online,
    hash_agent_token,
    verify_agent_token,
    register_workstation,
    rotate_workstation_token,
    list_workstations_with_summary,
    request_sync_mode_change,
    cancel_pending_sync_mode,
    authenticate_agent,
    process_heartbeat,
    process_ack_sync_mode,
    process_sync_report,
    seed_demo_data,
)
from app.core.config import settings


import socket
import sqlalchemy.ext.asyncio as sa_async

try:
    from app.tests.conftest import _orig_socket_connect, _orig_create_async_engine
    socket.socket.connect = _orig_socket_connect
    socket.socket.connect_ex = lambda *args, **kwargs: 0
    sa_async.create_async_engine = _orig_create_async_engine
    real_create_engine = _orig_create_async_engine
except ImportError:
    from sqlalchemy.ext.asyncio import create_async_engine as real_create_engine

from app.tests.safety_db_guard import assert_test_database, get_test_database_url

TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_pb56_test")

@pytest.fixture
async def test_db_session():
    """Isolated dedicated Postgres test DB session for PB56 tests."""
    assert_test_database(TEST_DB_URL)
    engine = real_create_engine(TEST_DB_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        # Re-create PB56 tables cleanly with CASCADE in test database
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    await engine.dispose()


# ── TEST 1: IS_ONLINE SHARED CALCULATION ───────────────────────────────────────
def test_is_workstation_online_logic():
    now = datetime(2026, 11, 6, 12, 0, 0, tzinfo=timezone.utc)
    interval = 30
    cycles = 3  # threshold = 90s

    # None heartbeat -> Offline
    assert not is_workstation_online(None, interval, cycles, now=now)

    # 45s ago -> Online
    recent_hb = now - timedelta(seconds=45)
    assert is_workstation_online(recent_hb, interval, cycles, now=now)

    # 90s ago -> Online (boundary)
    boundary_hb = now - timedelta(seconds=90)
    assert is_workstation_online(boundary_hb, interval, cycles, now=now)

    # 95s ago -> Offline (exceeded threshold)
    past_hb = now - timedelta(seconds=95)
    assert not is_workstation_online(past_hb, interval, cycles, now=now)


# ── TEST 2: WORKSTATION REGISTRATION & TOKEN ROTATION ─────────────────────────
@pytest.mark.asyncio
async def test_registration_and_token_rotation(test_db_session: AsyncSession):
    reg_data = PB56WorkstationRegisterRequest(
        id="WS-TEST-01",
        hostname="test-pc.local",
        ip_address="192.168.1.100",
        os_info="Ubuntu 22.04 LTS",
        monitored_folder="/data/sales",
        sync_mode="realtime"
    )

    ws, token = await register_workstation(test_db_session, reg_data)
    assert ws.id == "WS-TEST-01"
    assert token.startswith("aegis_sec_")
    # Verify DB only stores hash
    assert ws.agent_token_hash == hash_agent_token(token)
    assert ws.agent_token_hash != token

    # Token verification
    assert verify_agent_token(token, ws.agent_token_hash)
    assert not verify_agent_token("wrong-token", ws.agent_token_hash)

    # Duplicate registration -> 409 Conflict
    with pytest.raises(HTTPException) as exc:
        await register_workstation(test_db_session, reg_data)
    assert exc.value.status_code == 409

    # Rotate token
    ws_rot, new_token = await rotate_workstation_token(test_db_session, "WS-TEST-01", "admin@graphmind.ai")
    assert new_token != token
    assert verify_agent_token(new_token, ws_rot.agent_token_hash)
    assert not verify_agent_token(token, ws_rot.agent_token_hash)


# ── TEST 3: TOKEN OF ANOTHER MACHINE REJECTED ─────────────────────────────────
@pytest.mark.asyncio
async def test_token_of_another_machine_rejected(test_db_session: AsyncSession):
    ws1, token1 = await register_workstation(test_db_session, PB56WorkstationRegisterRequest(
        id="WS-MACHINE-A", hostname="pc-a", ip_address="192.168.1.10", os_info="Win11", monitored_folder="/data"
    ))
    ws2, token2 = await register_workstation(test_db_session, PB56WorkstationRegisterRequest(
        id="WS-MACHINE-B", hostname="pc-b", ip_address="192.168.1.20", os_info="Win11", monitored_folder="/data"
    ))

    # Token 1 works for Machine A
    auth_a = await authenticate_agent(test_db_session, "WS-MACHINE-A", token1)
    assert auth_a.id == "WS-MACHINE-A"

    # Token 2 used for Machine A -> 401 Unauthorized
    with pytest.raises(HTTPException) as exc:
        await authenticate_agent(test_db_session, "WS-MACHINE-A", token2)
    assert exc.value.status_code == 401

    # Missing token -> 401
    with pytest.raises(HTTPException) as exc:
        await authenticate_agent(test_db_session, "WS-MACHINE-A", "")
    assert exc.value.status_code == 401


# ── TEST 4: HEARTBEAT & TRANSITION FROM PENDING_OFFLINE ────────────────────────
@pytest.mark.asyncio
async def test_heartbeat_offline_transition(test_db_session: AsyncSession):
    ws, token = await register_workstation(test_db_session, PB56WorkstationRegisterRequest(
        id="WS-OFFLINE-TEST", hostname="pc-off", ip_address="10.0.0.1", os_info="Linux", monitored_folder="/data"
    ))

    # Simulate admin changed mode while machine was offline
    ws.sync_mode_status = "pending_offline"
    ws.target_sync_mode = "scheduled"
    ws.target_schedule_type = "15m"
    await test_db_session.commit()

    # Agent sends heartbeat
    hb_req = PB56HeartbeatRequest(id="WS-OFFLINE-TEST")
    updated_ws, pending_cmd = await process_heartbeat(test_db_session, hb_req, token)

    # Status must transition from 'pending_offline' to 'pending'
    assert updated_ws.sync_mode_status == "pending"
    assert updated_ws.last_heartbeat_at is not None
    assert updated_ws.sync_mode == "realtime"
    assert updated_ws.schedule_type is None
    assert updated_ws.shift_end_time is None
    assert updated_ws.timezone == "Asia/Ho_Chi_Minh"
    assert pending_cmd is not None
    assert pending_cmd["target_sync_mode"] == "scheduled"
    assert pending_cmd["target_schedule_type"] == "15m"


# ── TEST 5: SYNC MODE VALIDATION, ACK MISMATCH & REPEATED ACK ──────────────────
@pytest.mark.asyncio
async def test_sync_mode_ack_and_validation(test_db_session: AsyncSession):
    ws, token = await register_workstation(test_db_session, PB56WorkstationRegisterRequest(
        id="WS-SYNC-MODE-TEST", hostname="pc-mode", ip_address="10.0.0.2", os_info="Linux", monitored_folder="/data"
    ))

    # Admin requests scheduled sync mode (1h)
    change_req = PB56ChangeSyncModeRequest(sync_mode="scheduled", schedule_type="1h")
    await request_sync_mode_change(test_db_session, ws.id, change_req, "admin@graphmind.ai")

    await test_db_session.refresh(ws)
    assert ws.target_sync_mode == "scheduled"
    assert ws.target_schedule_type == "1h"
    assert ws.sync_mode_status in ("pending", "pending_offline")

    # Agent sends mismatched ACK (e.g. sends realtime instead of scheduled) -> 400 Bad Request + REJECTED audit
    with pytest.raises(HTTPException) as exc:
        await process_ack_sync_mode(test_db_session, ws.id, PB56AckSyncModeRequest(applied_mode="realtime"), token)
    assert exc.value.status_code == 400

    # Verify audit log recorded REJECTED
    audit_stmt = select(PB56SyncModeAuditLog).where(
        PB56SyncModeAuditLog.workstation_id == ws.id,
        PB56SyncModeAuditLog.action == "REJECTED"
    )
    res = await test_db_session.execute(audit_stmt)
    assert res.scalar_one_or_none() is not None

    # Agent sends matching ACK -> success & applied
    ack_res = await process_ack_sync_mode(
        test_db_session,
        ws.id,
        PB56AckSyncModeRequest(applied_mode="scheduled", applied_schedule_type="1h"),
        token
    )
    assert ack_res["status"] == "applied"

    await test_db_session.refresh(ws)
    assert ws.sync_mode == "scheduled"
    assert ws.schedule_type == "1h"
    assert ws.target_sync_mode is None
    assert ws.sync_mode_status == "applied"

    # Repeated ACK when no pending target -> 200 idempotent no-op
    repeat_res = await process_ack_sync_mode(
        test_db_session,
        ws.id,
        PB56AckSyncModeRequest(applied_mode="scheduled"),
        token
    )
    assert repeat_res["success"] is True
    assert repeat_res["status"] == "applied"

    # Cancel when no pending target -> 409 Conflict
    with pytest.raises(HTTPException) as exc:
        await cancel_pending_sync_mode(test_db_session, ws.id, "admin@graphmind.ai")
    assert exc.value.status_code == 409


# ── TEST 6: SYNC REPORT IDEMPOTENCY & ATOMIC ACCUMULATION ─────────────────────
@pytest.mark.asyncio
async def test_sync_report_idempotency_and_atomic_counters(test_db_session: AsyncSession):
    ws, token = await register_workstation(test_db_session, PB56WorkstationRegisterRequest(
        id="WS-REPORT-TEST", hostname="pc-rep", ip_address="10.0.0.3", os_info="Linux", monitored_folder="/data"
    ))

    report_uuid = uuid.uuid4()
    rep1 = PB56SyncReportRequest(
        report_id=report_uuid,
        files_ingested=10,
        records_extracted=250,
        checksum_errors=1,
        status="SUCCESS"
    )

    # First report -> accumulated
    res1 = await process_sync_report(test_db_session, ws.id, rep1, token)
    assert res1["idempotent"] is False

    await test_db_session.refresh(ws)
    assert ws.files_ingested_total == 10
    assert ws.records_extracted_total == 250
    assert ws.checksum_errors_total == 1

    # Duplicate report (same report_id) -> returns 200 idempotent, NOT accumulated again
    res2 = await process_sync_report(test_db_session, ws.id, rep1, token)
    assert res2["idempotent"] is True

    await test_db_session.refresh(ws)
    assert ws.files_ingested_total == 10
    assert ws.records_extracted_total == 250
    assert ws.checksum_errors_total == 1

    # New distinct report -> accumulated correctly
    rep2 = PB56SyncReportRequest(
        report_id=uuid.uuid4(),
        files_ingested=5,
        records_extracted=100,
        checksum_errors=0,
        status="SUCCESS"
    )
    res3 = await process_sync_report(test_db_session, ws.id, rep2, token)
    assert res3["idempotent"] is False

    await test_db_session.refresh(ws)
    assert ws.files_ingested_total == 15
    assert ws.records_extracted_total == 350
    assert ws.checksum_errors_total == 1


# ── TEST 7: SEED DEMO SECURITY & DEMO REJECTION ────────────────────────────────
@pytest.mark.asyncio
async def test_seed_demo_security(test_db_session: AsyncSession):
    # If APP_ENV is not development -> 403 Forbidden
    original_env = getattr(settings, "APP_ENV", "development")
    try:
        settings.APP_ENV = "production"
        with pytest.raises(HTTPException) as exc:
            await seed_demo_data(test_db_session)
        assert exc.value.status_code == 403

        # In development -> creates 3 demo machines
        settings.APP_ENV = "development"
        seed_res = await seed_demo_data(test_db_session)
        assert seed_res["success"] is True
        assert len(seed_res["workstations"]) == 3

        # Demo machine rejects agent operations
        demo_id = "WS-SALES-HN01"
        with pytest.raises(HTTPException) as exc:
            await authenticate_agent(test_db_session, demo_id, "any_token")
        assert exc.value.status_code == 403
    finally:
        settings.APP_ENV = original_env


# ── TEST 8: FEATURE FLAG OFF => ROUTER INACTIVE (404) ──────────────────────────
@pytest.mark.asyncio
async def test_feature_flag_off_returns_404():
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    # By default PB56_WORKSTATIONS_ENABLED is False
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/workstations")
        assert res.status_code == 404

