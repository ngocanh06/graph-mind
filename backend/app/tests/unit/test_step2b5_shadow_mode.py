"""
Unit tests for Step 2B.5: ACL Shadow Mode Audit Logging.

Verifies:
1. ACL_SHADOW_MODE config default is False (enforcing / fail-closed hard block).
2. Under shadow_mode=False (default):
   - Qdrant/Cypher pre-filters are generated.
   - Unauthorized department or RESTRICTED payloads are rejected (return False).
   - No shadow audit events recorded.
3. Under shadow_mode=True:
   - Qdrant/Cypher pre-filters are bypassed (None / 1=1) so candidate hits reach in-memory gate.
   - Unauthorized department or RESTRICTED payloads return True (not dropped).
   - Violations are captured in acl.shadow_blocked_events with metadata.
4. record_acl_shadow_block persists AuditLog entry with action='ACL_SHADOW_BLOCKED'.
"""

import uuid
import pytest
from unittest.mock import MagicMock, AsyncMock

from app.core.config import Settings
from app.core.rbac import (
    ScopeContext,
    build_acl_filter,
    record_acl_shadow_block,
    ACLFilter
)
from app.db.postgres.models import User
from app.db.postgres.models.audit_log import AuditLog


def _make_scope(role: str, dept_name: str, canonical_dept: str, allowed_depts: set, allowed_res: set, is_unrestricted: bool = False):
    u = User(
        user_id=uuid.uuid4(),
        email=f"{role}@graphmind.ai",
        username=role,
        role=role,
        status="active",
        is_active=True,
        is_superuser=is_unrestricted,
    )
    return ScopeContext(
        user=u,
        role=role,
        is_unrestricted=is_unrestricted,
        department_name=dept_name,
        canonical_dept=canonical_dept,
        allowed_depts=allowed_depts,
        allowed_resources=allowed_res,
    )


def test_acl_shadow_mode_config_default():
    """Verify that ACL_SHADOW_MODE defaults to False (hard block mode)."""
    assert Settings.model_fields["ACL_SHADOW_MODE"].default is False


def test_hard_block_mode_behavior():
    """Under shadow_mode=False, unauthorized or restricted payloads are strictly blocked and not recorded in shadow list."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope, shadow_mode=False)

    assert acl.shadow_mode is False
    assert acl.qdrant_filter is not None
    assert "must_not" in acl.qdrant_filter
    assert "<> 'RESTRICTED'" in acl.cypher_where

    # 1. Cross-department payload -> Hard Block (False)
    legal_payload = {
        "id": "chunk_legal_01",
        "department": "Pháp chế (Legal)",
        "classification": "INTERNAL",
        "text": "Điều khoản pháp lý."
    }
    assert acl.matches_payload(legal_payload) is False
    assert len(acl.shadow_blocked_events) == 0

    # 2. RESTRICTED payload -> Hard Block (False)
    sales_restricted_payload = {
        "id": "chunk_sales_secret",
        "department": "Kinh doanh (Sales)",
        "classification": "RESTRICTED",
        "text": "Chiến lược giá tuyệt mật."
    }
    assert acl.matches_payload(sales_restricted_payload) is False
    assert len(acl.shadow_blocked_events) == 0

    # 3. Allowed payload -> True
    sales_internal_payload = {
        "id": "chunk_sales_01",
        "department": "Kinh doanh (Sales)",
        "classification": "INTERNAL",
        "text": "Báo cáo doanh số quý 1."
    }
    assert acl.matches_payload(sales_internal_payload) is True


def test_shadow_mode_behavior():
    """Under shadow_mode=True, candidate hits pass through, but violations are logged in shadow_blocked_events."""
    sales_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(sales_scope, shadow_mode=True)

    assert acl.shadow_mode is True
    # DB pre-filters bypassed so potential matches reach in-memory audit gate
    assert acl.qdrant_filter is None
    assert acl.cypher_where == "1=1"

    # 1. Cross-department payload -> Permitted in shadow mode, but recorded
    legal_payload = {
        "id": "chunk_legal_01",
        "logical_chunk_id": "logical_legal_01",
        "department": "Pháp chế (Legal)",
        "classification": "INTERNAL",
        "text": "Điều khoản pháp lý."
    }
    assert acl.matches_payload(legal_payload) is True
    assert len(acl.shadow_blocked_events) == 1
    evt1 = acl.shadow_blocked_events[0]
    assert evt1["actor_id"] == sales_scope.user.user_id
    assert evt1["resource_id"] == "logical_legal_01"
    assert "allowed departments" in evt1["reason"]

    # 2. RESTRICTED payload -> Permitted in shadow mode, but recorded
    sales_restricted_payload = {
        "id": "chunk_sales_secret",
        "department": "Kinh doanh (Sales)",
        "classification": "RESTRICTED",
        "text": "Chiến lược giá tuyệt mật."
    }
    assert acl.matches_payload(sales_restricted_payload) is True
    assert len(acl.shadow_blocked_events) == 2
    evt2 = acl.shadow_blocked_events[1]
    assert evt2["resource_id"] == "chunk_sales_secret"
    assert "restricted for role standard" in evt2["reason"]

    # 3. Valid authorized payload -> Permitted with no new shadow event
    sales_internal_payload = {
        "id": "chunk_sales_01",
        "department": "Kinh doanh (Sales)",
        "classification": "INTERNAL",
        "text": "Báo cáo doanh số quý 1."
    }
    assert acl.matches_payload(sales_internal_payload) is True
    assert len(acl.shadow_blocked_events) == 2


@pytest.mark.asyncio
async def test_record_acl_shadow_block():
    """Verify that record_acl_shadow_block adds an AuditLog entry with action='ACL_SHADOW_BLOCKED'."""
    mock_db = MagicMock()
    user_id = uuid.uuid4()

    await record_acl_shadow_block(
        mock_db,
        actor_id=user_id,
        resource_type="DOCUMENT_CHUNK",
        resource_id="chunk_test_999",
        reason="Cross-dept access to Legal",
        query="tra cứu điều khoản trách nhiệm bồi thường"
    )

    assert mock_db.add.called
    added_entry = mock_db.add.call_args[0][0]
    assert isinstance(added_entry, AuditLog)
    assert added_entry.action == "ACL_SHADOW_BLOCKED"
    assert added_entry.actor_id == user_id
    assert added_entry.resource_type == "DOCUMENT_CHUNK"
    assert added_entry.resource_id == "chunk_test_999"
    assert added_entry.status == "SHADOW_PERMITTED"
    assert "Cross-dept access to Legal" in added_entry.detail
    assert "tra cứu điều khoản trách nhiệm bồi thường" in added_entry.detail
