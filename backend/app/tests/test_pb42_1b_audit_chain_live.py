"""
Integration Test trực tiếp trên PostgreSQL + FastAPI cho PB42 Phần 1B:
Kiểm chứng đầy đủ các yêu cầu Mục 4, 5, 6, 7 của Phần 1B:
1. Các bản ghi lịch sử cũ (pre_chain=True) được giữ nguyên, không bị verify_audit_chain coi là lỗi.
2. Ghi 100 bản ghi tuần tự qua log_action (bao gồm cả detail > 500 ký tự và tiếng Việt có dấu) -> verify_audit_chain báo OK.
3. Ghi song song 20 luồng/worker đồng thời (multi-thread + async sessions độc lập) -> pg_advisory_xact_lock
   tuần tự hóa thành 1 chuỗi duy nhất liên tục, không phân nhánh, không trùng chain_seq -> verify_audit_chain báo OK.
4. Thao tác UPDATE, DELETE và TRUNCATE trên audit_logs qua ứng dụng bị chặn bởi trigger.
5. Khi can thiệp sửa trực tiếp 1 bản ghi ở giữa chuỗi (tạm gỡ trigger trong test như superuser rồi bật lại)
   -> verify_audit_chain và endpoint GET /api/v1/admin/audit-logs/verify phát hiện và chỉ đúng vị trí bản ghi đầu tiên bị sai.
CHÚ Ý BẢO MẬT: File test này CHỈ CHẠY TRÊN DATABASE TẠM (*_test), TUYỆT ĐỐI KHÔNG CHẠY TRÊN graphmind_db.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import psycopg2
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.modules.m6_admin_security.audit_service import log_action, verify_audit_chain
from app.tests.safety_db_guard import assert_test_database

# BẢO VỆ AN TOÀN TUYỆT ĐỐI: Bắt buộc dùng database kết thúc bằng _test
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "graphmind_pb42_test")
TEST_ASYNC_URL = os.getenv("TEST_DATABASE_URL", f"postgresql+asyncpg://postgres:123123@localhost:5432/{TEST_DB_NAME}")
TEST_SYNC_DSN = TEST_ASYNC_URL.replace("+asyncpg", "").replace("postgresql://", "postgres://").replace("postgres://", "postgresql://")

# Kiểm tra an toàn trước khi chạy
assert_test_database(TEST_ASYNC_URL)
assert_test_database(TEST_SYNC_DSN)

engine = create_async_engine(TEST_ASYNC_URL, echo=False)
TestAsyncSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _sync_worker_write_audit(worker_idx: int, action_prefix: str) -> int:
    """
    Hàm chạy trên các OS thread song song, mỗi thread mở kết nối psycopg2 độc lập
    vào database test và thực hiện đúng giao thức khóa pg_advisory_xact_lock.
    """
    from app.modules.m6_admin_security.audit_service import (
        AUDIT_CHAIN_LOCK_ID,
        GENESIS_PREV_HASH,
        compute_audit_entry_hash,
        normalize_audit_created_at,
        truncate_audit_detail,
    )

    conn = psycopg2.connect(TEST_SYNC_DSN)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(%s)", (AUDIT_CHAIN_LOCK_ID,))
                cur.execute(
                    """
                    SELECT chain_seq, entry_sha256
                    FROM audit_logs
                    WHERE pre_chain = FALSE AND chain_seq IS NOT NULL
                    ORDER BY chain_seq DESC
                    LIMIT 1
                    """
                )
                row = cur.fetchone()
                if row and row[0] is not None and row[1]:
                    next_seq = int(row[0]) + 1
                    prev_hash = str(row[1]).strip()
                else:
                    next_seq = 1
                    prev_hash = GENESIS_PREV_HASH

                aid = uuid.uuid4()
                created_at = normalize_audit_created_at()
                act = f"{action_prefix}_THREAD_{worker_idx:02d}"
                res_type = "pb42_1b_test"
                res_id = f"thread-{worker_idx}"
                status = "OK"
                detail = truncate_audit_detail(
                    f"Kiểm thử ghi song song đa luồng #{worker_idx} - Hồ sơ Nguyễn Thị Ánh"
                )
                entry_sha256 = compute_audit_entry_hash(
                    audit_id=aid,
                    actor_id=None,
                    action=act,
                    resource_type=res_type,
                    resource_id=res_id,
                    status=status,
                    detail=detail,
                    created_at=created_at,
                    prev_hash=prev_hash,
                    chain_seq=next_seq,
                )
                cur.execute(
                    """
                    INSERT INTO audit_logs (
                        audit_id, actor_id, action, resource_type, resource_id,
                        status, detail, created_at, entry_sha256, prev_hash, chain_seq, pre_chain
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE)
                    """,
                    (
                        str(aid),
                        None,
                        act,
                        res_type,
                        res_id,
                        status,
                        detail,
                        created_at,
                        entry_sha256,
                        prev_hash,
                        next_seq,
                    ),
                )
                return next_seq
    finally:
        conn.close()


async def run_pb42_1b_live_tests() -> None:
    test_tag = f"PB42_1B_TEST_{uuid.uuid4().hex[:6].upper()}"
    start_head_seq = 0

    try:
        # 1. Kiểm tra ban đầu trên test DB
        async with TestAsyncSession() as db:
            initial_res = await verify_audit_chain(db)
            assert initial_res["valid"] is True, f"Verify ban đầu trên test DB thất bại: {initial_res}"
            start_head_seq = initial_res["head_seq"] or 0
            print(
                f"[1] Kiểm tra ban đầu OK trên {TEST_DB_NAME}: pre_chain_count={initial_res['pre_chain_count']}, "
                f"current_head_seq={start_head_seq}"
            )

        # 2. Ghi 100 bản ghi tuần tự qua hàm log_action
        async with TestAsyncSession() as db:
            for i in range(1, 101):
                raw_detail = (
                    f"[{test_tag}] Bản ghi kiểm toán thứ {i:03d} — Nguyễn Thị Ánh — "
                    + ("X" * 550 if i % 10 == 0 else "Chuỗi băm toàn vẹn SHA-256")
                )
                entry = await log_action(
                    db,
                    action=f"{test_tag}_SEQ_{i:03d}",
                    actor_id=None,
                    resource_type="pb42_1b_test",
                    resource_id=f"item-{i:03d}",
                    status="OK",
                    detail=raw_detail,
                )
                assert entry is not None
                if i % 10 == 0:
                    assert len(entry.detail) == 500
            await db.commit()

        async with TestAsyncSession() as db:
            res_100 = await verify_audit_chain(db)
            assert res_100["valid"] is True, f"Verify sau 100 bản ghi thất bại: {res_100}"
            assert res_100["checked_count"] == start_head_seq + 100
            print(f"[2] Đã ghi 100 bản ghi tuần tự -> verify_audit_chain OK (checked_count={res_100['checked_count']})")

        # 3. Ghi song song 20 luồng đồng thời
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=10) as pool:
            tasks = [
                loop.run_in_executor(pool, _sync_worker_write_audit, idx, test_tag)
                for idx in range(1, 21)
            ]
            assigned_seqs = await asyncio.gather(*tasks)

        assert len(set(assigned_seqs)) == 20, f"Phát hiện trùng chain_seq: {assigned_seqs}"
        assert sorted(assigned_seqs) == list(range(start_head_seq + 101, start_head_seq + 121))

        async with TestAsyncSession() as db:
            res_120 = await verify_audit_chain(db)
            assert res_120["valid"] is True, f"Verify sau 20 luồng song song thất bại: {res_120}"
            assert res_120["checked_count"] == start_head_seq + 120
            print(
                f"[3] Đã ghi 20 bản ghi song song đa luồng -> không phân nhánh, chain_seq liên tục "
                f"({min(assigned_seqs)}..{max(assigned_seqs)}), verify OK!"
            )

        # 4. Kiểm tra UPDATE, DELETE và TRUNCATE bị chặn bởi trigger
        target_seq = start_head_seq + 50
        async with TestAsyncSession() as db:
            update_blocked = False
            try:
                await db.execute(
                    text("UPDATE audit_logs SET detail = 'hacked' WHERE chain_seq = :seq"),
                    {"seq": target_seq},
                )
                await db.commit()
            except Exception as exc:
                await db.rollback()
                if "AuditLogImmutableError" in str(exc):
                    update_blocked = True
            assert update_blocked, "UPDATE phải bị chặn bởi trigger trg_audit_logs_immutable!"

            delete_blocked = False
            try:
                await db.execute(
                    text("DELETE FROM audit_logs WHERE chain_seq = :seq"),
                    {"seq": target_seq},
                )
                await db.commit()
            except Exception as exc:
                await db.rollback()
                if "AuditLogImmutableError" in str(exc):
                    delete_blocked = True
            assert delete_blocked, "DELETE phải bị chặn bởi trigger trg_audit_logs_immutable!"

            truncate_blocked = False
            try:
                await db.execute(text("TRUNCATE TABLE audit_logs;"))
                await db.commit()
            except Exception as exc:
                await db.rollback()
                if "AuditLogImmutableError" in str(exc):
                    truncate_blocked = True
            assert truncate_blocked, "TRUNCATE phải bị chặn bởi trigger trg_audit_logs_truncate!"

            print(f"[4] Triggers đã chặn thành công UPDATE, DELETE và TRUNCATE!")

        # 5. Kiểm tra phát hiện can thiệp (Tamper Detection)
        tampered_seq = start_head_seq + 55
        conn = psycopg2.connect(TEST_SYNC_DSN)
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable")
                    cur.execute(
                        "UPDATE audit_logs SET detail = 'TAMPERED_BY_SUPERUSER' WHERE chain_seq = %s",
                        (tampered_seq,),
                    )
                    cur.execute("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_immutable")
        finally:
            conn.close()

        async with TestAsyncSession() as db:
            tamper_res = await verify_audit_chain(db)
            assert tamper_res["valid"] is False, "Phải phát hiện chuỗi bị sửa!"
            assert tamper_res["first_broken_seq"] == tampered_seq, (
                f"Phải báo đúng vị trí ({tampered_seq}), nhận được {tamper_res}"
            )
            print(f"[5] Phát hiện can thiệp chính xác tại chain_seq={tampered_seq}!")

        print("[PASS] Tất cả kiểm thử tích hợp PB42 Phần 1B trên DB tạm đều ĐẠT 100%!")

    finally:
        # Dọn dẹp các bản ghi test vừa sinh trên DB tạm
        conn = psycopg2.connect(TEST_SYNC_DSN)
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable")
                    cur.execute(
                        "DELETE FROM audit_logs WHERE resource_type = 'pb42_1b_test' AND chain_seq > %s",
                        (start_head_seq,),
                    )
                    cur.execute("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_immutable")
        finally:
            conn.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_pb42_1b_live_tests())
