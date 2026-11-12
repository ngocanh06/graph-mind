"""
Audit Service (M6 / PB42 Phần 1B) — Tamper-Evident Audit Trail với chuỗi băm SHA-256 liên kết.
Dùng chung cho user_admin_api, auth router, permissions_api, rbac_matrix_service, document_approval_router.

Thiết kế toàn vẹn dữ liệu (Tamper-Evident):
1. Chuỗi băm SHA-256 (entry_sha256) tính trên canonical JSON:
   json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
   gồm đúng 10 trường của ORM AuditLog:
   (audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at, prev_hash, chain_seq).
2. Các cột cũ từ schema ban đầu (user_id, module_name, target_type, target_id, details, ip_address)
   KHÔNG nằm trong phép tính entry_sha256.
3. created_at được chốt ở tầng ứng dụng theo múi giờ UTC với độ chính xác microsecond cố định
   (timespec='microseconds') TRƯỚC khi tính hash và lưu vào PostgreSQL.
4. detail được cắt về tối đa 500 ký tự TRƯỚC khi tính hash và lưu vào PostgreSQL.
5. Việc lấy prev_hash và cấp phát chain_seq được tuần tự hóa bằng khóa giao dịch PostgreSQL
   pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_ID) kết hợp flush ngay trong giao dịch để hai luồng
   ghi đồng thời không bao giờ tạo hai nhánh chuỗi.
6. Trigger PostgreSQL trg_audit_logs_immutable chặn UPDATE/DELETE từ phía ứng dụng.
   Lưu ý: đây là cơ chế tamper-evident; chủ sở hữu DB (superuser/owner) vẫn có thể tạm gỡ trigger,
   và tính toàn vẹn dữ liệu được kiểm chứng độc lập bằng verify_audit_chain().
"""
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Hằng số prev_hash cho bản ghi khởi thủy của chuỗi (chain_seq = 1)
GENESIS_PREV_HASH: str = "0" * 64

# Khóa cố định dùng cho pg_advisory_xact_lock khi nối chuỗi audit_logs
AUDIT_CHAIN_LOCK_ID: int = 42006001


def normalize_audit_created_at(dt: Optional[datetime] = None) -> datetime:
    """
    Chốt mốc thời gian created_at ở tầng ứng dụng về UTC với độ chính xác microsecond cố định.
    Đảm bảo giá trị trước khi băm và giá trị đọc lại từ cột TIMESTAMPTZ của PostgreSQL khớp tuyệt đối.
    """
    if dt is None:
        now_utc = datetime.now(timezone.utc)
        return now_utc.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_audit_created_at_iso(dt: datetime) -> str:
    """Định dạng created_at chuẩn ISO 8601 UTC với đúng 6 chữ số microsecond."""
    norm = normalize_audit_created_at(dt)
    return norm.isoformat(timespec="microseconds")


def truncate_audit_detail(detail: Optional[str]) -> Optional[str]:
    """Cắt detail về tối đa 500 ký tự khớp với cột VARCHAR(500) trước khi tính hash."""
    if detail is None:
        return None
    return str(detail)[:500]


def build_canonical_audit_payload(
    *,
    audit_id: uuid.UUID | str,
    actor_id: Optional[uuid.UUID | str],
    action: str,
    resource_type: Optional[str],
    resource_id: Optional[str],
    status: str,
    detail: Optional[str],
    created_at: datetime,
    prev_hash: str,
    chain_seq: int,
) -> Dict[str, Any]:
    """
    Tạo dictionary 10 trường chuẩn hóa để sinh canonical JSON cho entry_sha256.
    Các cột cũ (user_id, module_name, target_type, target_id, details, ip_address) không nằm trong hash.
    """
    return {
        "action": str(action)[:100],
        "actor_id": str(actor_id) if actor_id is not None else None,
        "audit_id": str(audit_id),
        "chain_seq": int(chain_seq),
        "created_at": format_audit_created_at_iso(created_at),
        "detail": truncate_audit_detail(detail),
        "prev_hash": str(prev_hash).strip(),
        "resource_id": str(resource_id)[:150] if resource_id is not None else None,
        "resource_type": str(resource_type)[:50] if resource_type is not None else None,
        "status": str(status or "OK")[:20],
    }


def compute_audit_entry_hash(
    *,
    audit_id: uuid.UUID | str,
    actor_id: Optional[uuid.UUID | str],
    action: str,
    resource_type: Optional[str],
    resource_id: Optional[str],
    status: str,
    detail: Optional[str],
    created_at: datetime,
    prev_hash: str,
    chain_seq: int,
) -> str:
    """
    Tính SHA-256 trên canonical JSON (sort_keys=True, separators=(',', ':'), ensure_ascii=False, UTF-8).
    """
    payload = build_canonical_audit_payload(
        audit_id=audit_id,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        status=status,
        detail=detail,
        created_at=created_at,
        prev_hash=prev_hash,
        chain_seq=chain_seq,
    )
    canonical_json = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


async def log_action(
    db: AsyncSession,
    *,
    action: str,
    actor_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "OK",
    detail: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Ghi một dòng vào audit_logs kèm chuỗi băm liên kết (entry_sha256, prev_hash, chain_seq).
    - Tuần tự hóa việc lấy prev_hash bằng pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_ID).
    - Fire-and-forget an toàn: sử dụng SAVEPOINT (begin_nested) để nếu xảy ra lỗi chỉ log warning,
      không làm hỏng giao dịch nghiệp vụ của caller.
    """
    try:
        async with db.begin_nested():
            # 1. Khóa tuần tự hóa mức giao dịch để chống phân nhánh chuỗi khi ghi đồng thời
            await db.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": AUDIT_CHAIN_LOCK_ID},
            )

            # 2. Lấy bản ghi đứng đầu chuỗi hiện tại (chỉ xét các dòng thuộc chuỗi pre_chain = FALSE)
            head_res = await db.execute(
                text(
                    """
                    SELECT chain_seq, entry_sha256
                    FROM audit_logs
                    WHERE pre_chain = FALSE AND chain_seq IS NOT NULL
                    ORDER BY chain_seq DESC
                    LIMIT 1
                    """
                )
            )
            head_row = head_res.fetchone()
            if head_row and head_row[0] is not None and head_row[1]:
                next_seq = int(head_row[0]) + 1
                prev_hash = str(head_row[1]).strip()
            else:
                next_seq = 1
                prev_hash = GENESIS_PREV_HASH

            # 3. Chốt các giá trị chuẩn hóa ở tầng ứng dụng trước khi tính hash
            audit_id = uuid.uuid4()
            created_at = normalize_audit_created_at()
            clean_action = str(action)[:100]
            clean_resource_type = str(resource_type)[:50] if resource_type is not None else None
            clean_resource_id = str(resource_id)[:150] if resource_id is not None else None
            clean_status = str(status or "OK")[:20]
            clean_detail = truncate_audit_detail(detail)

            entry_sha256 = compute_audit_entry_hash(
                audit_id=audit_id,
                actor_id=actor_id,
                action=clean_action,
                resource_type=clean_resource_type,
                resource_id=clean_resource_id,
                status=clean_status,
                detail=clean_detail,
                created_at=created_at,
                prev_hash=prev_hash,
                chain_seq=next_seq,
            )

            entry = AuditLog(
                audit_id=audit_id,
                actor_id=actor_id,
                action=clean_action,
                resource_type=clean_resource_type,
                resource_id=clean_resource_id,
                status=clean_status,
                detail=clean_detail,
                created_at=created_at,
                entry_sha256=entry_sha256,
                prev_hash=prev_hash,
                chain_seq=next_seq,
                pre_chain=False,
            )
            db.add(entry)
            await db.flush()
            return entry
    except Exception as exc:
        logger.warning("audit log failed: %s", exc)
        return None


async def verify_audit_chain(
    db: AsyncSession,
    from_seq: Optional[int] = None,
    to_seq: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Kiểm chứng tính toàn vẹn của chuỗi băm audit_logs trong đoạn [from_seq, to_seq]:
    - Các dòng lịch sử có pre_chain = TRUE được thống kê riêng vào pre_chain_count và KHÔNG bị coi là lỗi.
    - Kiểm tra tính liên tục của chain_seq (không bị khuyết dòng / xóa dòng).
    - Kiểm tra liên kết prev_hash == entry_sha256 của dòng liền trước.
    - Tính lại SHA-256 trên canonical JSON và đối chiếu với entry_sha256 đã lưu.
    - Trả về vị trí bản ghi đầu tiên bị sai (first_broken_seq, first_broken_audit_id, reason) nếu có.
    """
    pre_chain_stmt = select(func.count()).select_from(AuditLog).where(AuditLog.pre_chain == True)
    pre_chain_count = int((await db.execute(pre_chain_stmt)).scalar_one() or 0)

    # Nếu kiểm tra từ một vị trí giữa chuỗi (from_seq > 1), cần lấy bản ghi neo ở (from_seq - 1)
    start_seq = int(from_seq) if (from_seq is not None and from_seq > 1) else 1
    if start_seq > 1:
        anchor_stmt = select(AuditLog).where(
            AuditLog.pre_chain == False,
            AuditLog.chain_seq == start_seq - 1,
        )
        anchor_row = (await db.execute(anchor_stmt)).scalar_one_or_none()
        if anchor_row is None or not anchor_row.entry_sha256:
            return {
                "valid": False,
                "checked_count": 0,
                "pre_chain_count": pre_chain_count,
                "from_seq": start_seq,
                "to_seq": to_seq,
                "head_seq": None,
                "head_sha256": None,
                "first_broken_seq": start_seq - 1,
                "first_broken_audit_id": str(anchor_row.audit_id) if anchor_row else None,
                "reason": f"Missing or invalid anchor record at chain_seq={start_seq - 1}",
            }
        expected_prev_hash = str(anchor_row.entry_sha256).strip()
    else:
        expected_prev_hash = GENESIS_PREV_HASH

    stmt = select(AuditLog).where(AuditLog.pre_chain == False)
    if from_seq is not None:
        stmt = stmt.where(AuditLog.chain_seq >= int(from_seq))
    if to_seq is not None:
        stmt = stmt.where(AuditLog.chain_seq <= int(to_seq))
    stmt = stmt.order_by(AuditLog.chain_seq.asc().nullsfirst(), AuditLog.created_at.asc())

    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return {
            "valid": True,
            "checked_count": 0,
            "pre_chain_count": pre_chain_count,
            "from_seq": from_seq,
            "to_seq": to_seq,
            "head_seq": None,
            "head_sha256": None,
            "first_broken_seq": None,
            "first_broken_audit_id": None,
            "reason": None,
        }

    expected_seq = start_seq
    checked_count = 0
    last_seq: Optional[int] = None
    last_hash: Optional[str] = None

    for row in rows:
        # 1. Kiểm tra chain_seq hợp lệ và liên tục
        if row.chain_seq is None or int(row.chain_seq) != expected_seq:
            return {
                "valid": False,
                "checked_count": checked_count,
                "pre_chain_count": pre_chain_count,
                "from_seq": start_seq,
                "to_seq": to_seq,
                "head_seq": last_seq,
                "head_sha256": last_hash,
                "first_broken_seq": int(row.chain_seq) if row.chain_seq is not None else expected_seq,
                "first_broken_audit_id": str(row.audit_id),
                "reason": f"Sequence mismatch or deleted record: expected chain_seq={expected_seq}, got {row.chain_seq}",
            }

        # 2. Kiểm tra prev_hash khớp với bản ghi liền trước
        actual_prev = (row.prev_hash or "").strip()
        if actual_prev != expected_prev_hash:
            return {
                "valid": False,
                "checked_count": checked_count,
                "pre_chain_count": pre_chain_count,
                "from_seq": start_seq,
                "to_seq": to_seq,
                "head_seq": last_seq,
                "head_sha256": last_hash,
                "first_broken_seq": int(row.chain_seq),
                "first_broken_audit_id": str(row.audit_id),
                "reason": f"prev_hash mismatch at chain_seq={row.chain_seq}",
            }

        # 3. Tính lại entry_sha256 trên canonical JSON và đối chiếu
        recomputed_sha256 = compute_audit_entry_hash(
            audit_id=row.audit_id,
            actor_id=row.actor_id,
            action=row.action,
            resource_type=row.resource_type,
            resource_id=row.resource_id,
            status=row.status,
            detail=row.detail,
            created_at=row.created_at,
            prev_hash=actual_prev,
            chain_seq=int(row.chain_seq),
        )
        actual_sha256 = (row.entry_sha256 or "").strip()
        if actual_sha256 != recomputed_sha256:
            return {
                "valid": False,
                "checked_count": checked_count,
                "pre_chain_count": pre_chain_count,
                "from_seq": start_seq,
                "to_seq": to_seq,
                "head_seq": last_seq,
                "head_sha256": last_hash,
                "first_broken_seq": int(row.chain_seq),
                "first_broken_audit_id": str(row.audit_id),
                "reason": f"entry_sha256 tamper detected at chain_seq={row.chain_seq}",
            }

        checked_count += 1
        last_seq = int(row.chain_seq)
        last_hash = actual_sha256
        expected_prev_hash = actual_sha256
        expected_seq += 1

    return {
        "valid": True,
        "checked_count": checked_count,
        "pre_chain_count": pre_chain_count,
        "from_seq": start_seq,
        "to_seq": last_seq if to_seq is None else to_seq,
        "head_seq": last_seq,
        "head_sha256": last_hash,
        "first_broken_seq": None,
        "first_broken_audit_id": None,
        "reason": None,
    }
