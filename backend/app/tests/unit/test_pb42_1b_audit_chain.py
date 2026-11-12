"""
Unit Tests cho PB42 Phần 1B — Audit Trail Tamper-Evident Hash Chain.
Kiểm tra:
1. Chốt created_at về UTC với microsecond cố định (6 chữ số) trước khi băm.
2. Cắt detail về tối đa 500 ký tự trước khi băm.
3. Canonical JSON (sort_keys=True, separators=(',', ':'), ensure_ascii=False, UTF-8)
   chỉ gồm đúng 10 trường của ORM AuditLog; không bao gồm các cột cũ.
4. Tính nhất quán và độ nhạy của compute_audit_entry_hash khi thay đổi bất kỳ trường nào.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone

from app.modules.m6_admin_security.audit_service import (
    GENESIS_PREV_HASH,
    build_canonical_audit_payload,
    compute_audit_entry_hash,
    format_audit_created_at_iso,
    normalize_audit_created_at,
    truncate_audit_detail,
)


def test_normalize_and_format_created_at_utc_microseconds():
    """Đảm bảo created_at luôn chuẩn hóa về UTC với đúng 6 chữ số microsecond."""
    tz_vn = timezone(timedelta(hours=7))
    dt_vn = datetime(2026, 11, 10, 16, 30, 45, 123000, tzinfo=tz_vn)
    iso_str = format_audit_created_at_iso(dt_vn)
    assert iso_str == "2026-11-10T09:30:45.123000+00:00"

    # Ngay cả khi microsecond = 0, chuỗi ISO vẫn phải giữ '.000000+00:00'
    dt_zero_us = datetime(2026, 11, 10, 9, 30, 45, 0, tzinfo=timezone.utc)
    assert format_audit_created_at_iso(dt_zero_us) == "2026-11-10T09:30:45.000000+00:00"


def test_truncate_detail_before_hashing():
    """Đảm bảo detail dài hơn 500 ký tự được cắt về đúng 500 ký tự trước khi băm."""
    long_detail = "Nguyễn Thị Ánh - " + ("A" * 600)
    truncated = truncate_audit_detail(long_detail)
    assert truncated is not None
    assert len(truncated) == 500
    assert truncated == long_detail[:500]

    aid = uuid.uuid4()
    actor = uuid.uuid4()
    now = normalize_audit_created_at()

    h_long = compute_audit_entry_hash(
        audit_id=aid,
        actor_id=actor,
        action="USER_UPDATE",
        resource_type="user",
        resource_id=str(actor),
        status="OK",
        detail=long_detail,
        created_at=now,
        prev_hash=GENESIS_PREV_HASH,
        chain_seq=1,
    )
    h_trunc = compute_audit_entry_hash(
        audit_id=aid,
        actor_id=actor,
        action="USER_UPDATE",
        resource_type="user",
        resource_id=str(actor),
        status="OK",
        detail=long_detail[:500],
        created_at=now,
        prev_hash=GENESIS_PREV_HASH,
        chain_seq=1,
    )
    assert h_long == h_trunc


def test_canonical_payload_exact_10_fields_and_sensitivity():
    """Đảm bảo canonical payload chỉ chứa đúng 10 trường chuẩn và phát hiện mọi thay đổi."""
    aid = uuid.uuid4()
    actor = uuid.uuid4()
    now = datetime(2026, 11, 10, 10, 0, 0, 500, tzinfo=timezone.utc)

    payload = build_canonical_audit_payload(
        audit_id=aid,
        actor_id=actor,
        action="ROLE_CHANGE",
        resource_type="user",
        resource_id="u-123",
        status="OK",
        detail="Đổi vai trò sang knowledge_manager",
        created_at=now,
        prev_hash=GENESIS_PREV_HASH,
        chain_seq=1,
    )
    expected_keys = {
        "audit_id",
        "actor_id",
        "action",
        "resource_type",
        "resource_id",
        "status",
        "detail",
        "created_at",
        "prev_hash",
        "chain_seq",
    }
    assert set(payload.keys()) == expected_keys
    # Các cột cũ tuyệt đối không nằm trong payload
    for legacy_col in ("user_id", "module_name", "target_type", "target_id", "details", "ip_address"):
        assert legacy_col not in payload

    # Kiểm tra định dạng JSON không khoảng trắng thừa và giữ nguyên UTF-8 tiếng Việt
    dumped = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    assert "Đổi vai trò sang knowledge_manager" in dumped
    assert ": " not in dumped

    base_hash = compute_audit_entry_hash(
        audit_id=aid,
        actor_id=actor,
        action="ROLE_CHANGE",
        resource_type="user",
        resource_id="u-123",
        status="OK",
        detail="Đổi vai trò sang knowledge_manager",
        created_at=now,
        prev_hash=GENESIS_PREV_HASH,
        chain_seq=1,
    )
    tampered_hash = compute_audit_entry_hash(
        audit_id=aid,
        actor_id=actor,
        action="ROLE_CHANGE",
        resource_type="user",
        resource_id="u-123",
        status="OK",
        detail="Đổi vai trò sang it_admin",
        created_at=now,
        prev_hash=GENESIS_PREV_HASH,
        chain_seq=1,
    )
    assert len(base_hash) == 64
    assert base_hash != tampered_hash

