"""
Service Quản lý Phiên Đăng nhập Đồng thời (Single Active Session / Concurrent Login Protection)
Mô-đun 6 - PB01, PB03.
Lưu vết phiên làm việc duy nhất trong PostgreSQL (bảng user_active_sessions).
Khi người dùng đăng nhập trên thiết bị mới, jti mới sẽ thay thế jti cũ, khiến phiên cũ bị văng ra.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ConcurrentLoginException(HTTPException):
    """Ngoại lệ khi phát hiện tài khoản đã đăng nhập ở nơi khác."""
    def __init__(
        self,
        detail: str = "Tài khoản của bạn vừa được đăng nhập ở một thiết bị hoặc trình duyệt khác. Phiên làm việc này đã kết thúc."
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": detail,
                "error_code": "CONCURRENT_LOGIN_KICKED",
                "detail": detail,
            }
        )


async def ensure_sessions_table(db: AsyncSession) -> None:
    """Đảm bảo bảng user_active_sessions đã tồn tại trong PostgreSQL."""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_active_sessions (
        user_id UUID PRIMARY KEY,
        active_session_token_id VARCHAR(100) NOT NULL,
        ip_address VARCHAR(100) NULL,
        user_agent TEXT NULL,
        logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """
    create_index_sql = "CREATE INDEX IF NOT EXISTS ix_uas_token ON user_active_sessions (active_session_token_id);"
    try:
        await db.execute(text(create_table_sql))
        await db.execute(text(create_index_sql))
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning(f"[ActiveSessions] ensure_sessions_table error: {e}")


async def upsert_active_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    jti: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> bool:
    """
    Cập nhật jti phiên mới nhất cho user.
    Trả về True nếu trước đó đã có một phiên khác đang hoạt động (had_prev),
    phục vụ ghi nhận Audit Log: LOGIN_NEW_DEVICE_REPLACED_OLD_SESSION.
    """
    await ensure_sessions_table(db)

    # 1. Kiểm tra phiên cũ
    had_prev = False
    try:
        check_sql = text("SELECT active_session_token_id FROM user_active_sessions WHERE user_id = :uid")
        res = await db.execute(check_sql, {"uid": user_id})
        prev_row = res.fetchone()
        if prev_row and prev_row[0] and prev_row[0] != jti:
            had_prev = True
    except Exception as e:
        logger.warning(f"[ActiveSessions] check prev session error: {e}")

    # 2. Upsert phiên mới
    upsert_sql = text("""
        INSERT INTO user_active_sessions (user_id, active_session_token_id, ip_address, user_agent, logged_in_at, updated_at)
        VALUES (:uid, :jti, :ip, :ua, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            active_session_token_id = EXCLUDED.active_session_token_id,
            ip_address = EXCLUDED.ip_address,
            user_agent = EXCLUDED.user_agent,
            logged_in_at = NOW(),
            updated_at = NOW();
    """)
    try:
        await db.execute(upsert_sql, {
            "uid": user_id,
            "jti": jti,
            "ip": ip_address,
            "ua": user_agent,
        })
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"[ActiveSessions] upsert session failed: {e}")

    return had_prev


async def get_active_jti(db: AsyncSession, user_id: uuid.UUID) -> Optional[str]:
    """Lấy jti phiên hiện tại của user_id."""
    await ensure_sessions_table(db)
    try:
        sql = text("SELECT active_session_token_id FROM user_active_sessions WHERE user_id = :uid")
        res = await db.execute(sql, {"uid": user_id})
        row = res.fetchone()
        if row and row[0]:
            return str(row[0])
    except Exception as e:
        logger.warning(f"[ActiveSessions] get_active_jti error: {e}")
    return None


async def clear_active_session(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Xóa phiên khi người dùng chủ động đăng xuất."""
    await ensure_sessions_table(db)
    try:
        sql = text("DELETE FROM user_active_sessions WHERE user_id = :uid")
        await db.execute(sql, {"uid": user_id})
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning(f"[ActiveSessions] clear_active_session error: {e}")
