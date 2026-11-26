"""
Unit tests closing PoC #8:
Validates fail-closed metadata checks and proper department priority over filename.
"""
import uuid
import pytest
from app.core.rbac import (
    resolve_resource_type,
    ScopeContext,
    normalize_dept,
    RESOURCE_TO_FOLDER,
    CANONICAL_RESOURCE_TYPES,
)
from app.db.postgres.models import User


def make_scope(username: str, role: str, dept: str, allowed_resources, is_unrestricted: bool = False):
    u = User(
        user_id=uuid.uuid4(),
        email=f"{username}@example.com",
        username=username,
        role=role,
        status="active",
        is_active=True,
        is_superuser=(role == "admin"),
    )
    return ScopeContext(
        user=u,
        role=role,
        is_unrestricted=is_unrestricted,
        department_name=dept,
        canonical_dept=normalize_dept(dept),
        allowed_depts={RESOURCE_TO_FOLDER[r] for r in allowed_resources if r in RESOURCE_TO_FOLDER} | ({"*"} if is_unrestricted else set()),
        allowed_resources=set(allowed_resources) if not is_unrestricted else set(CANONICAL_RESOURCE_TYPES),
    )


def is_v_allowed(vh, scope: ScopeContext) -> bool:
    """Mirrors _is_v_allowed in copilot.py for unit testing"""
    if scope.is_unrestricted:
        return True
    pl = vh.get("payload") if isinstance(vh.get("payload"), dict) else vh
    if pl.get("source") == "adventureworks" or "entity_type" in pl:
        e_type = pl.get("entity_type", "")
        if e_type in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail"]:
            return "ACCOUNTING_PROCUREMENT" in scope.allowed_resources
        return "SALES" in scope.allowed_resources or "RND" in scope.allowed_resources

    # Department / metadata fail-closed check
    dept = pl.get("department") or pl.get("dept") or pl.get("deptKey") or pl.get("dept_key") or pl.get("domain")
    storage_path = pl.get("storage_path") or pl.get("storagePath") or pl.get("file") or pl.get("source_file")
    classification = str(pl.get("classification") or pl.get("classification_level") or "").strip().upper()

    if classification == "PUBLIC":
        return True

    if not dept and not storage_path:
        # Missing or empty department metadata on sensitive document -> FAIL-CLOSED
        return False

    rt = resolve_resource_type(vh)
    if not rt or rt == "UNKNOWN":
        return False
    return rt in scope.allowed_resources


def test_resolve_resource_type_fail_closed_and_department_priority():
    """
    1. Missing department -> fail-closed (returns 'UNKNOWN').
    2. Empty department -> fail-closed (returns 'UNKNOWN').
    3. Filename containing 'sales' but department 'Legal' -> resolves strictly to 'LEGAL'.
    """
    # 1. Missing department
    hit_missing = {"contract_name": "Mystery_Contract.pdf", "department": None}
    assert resolve_resource_type(hit_missing) == "UNKNOWN", "Missing department did not resolve to UNKNOWN (fail-closed)"

    # 2. Empty department
    hit_empty = {"contract_name": "Empty_Dept_Doc.pdf", "department": "   "}
    assert resolve_resource_type(hit_empty) == "UNKNOWN", "Empty department did not resolve to UNKNOWN (fail-closed)"

    # 3. Filename contains 'sales' (SalesforcecomInc) but department is Legal
    hit_salesforce_legal = {
        "contract_name": "SalesforcecomInc_20191218_8-K_EX-10.1_Development Agreement.pdf",
        "department": "Pháp chế (Legal)",
    }
    assert resolve_resource_type(hit_salesforce_legal) == "LEGAL", "Department priority failed: resolved to something other than LEGAL"

    hit_salesforce_legal_short = {
        "contract_name": "SalesforcecomInc_20191218_8-K_EX-10.1_Development Agreement.pdf",
        "department": "Legal",
    }
    assert resolve_resource_type(hit_salesforce_legal_short) == "LEGAL"


def test_is_v_allowed_with_sales_and_legal_personas():
    """
    Validates _is_v_allowed behavior across sales (standard) and legal (manager) users.
    """
    ops_sales_scope = make_scope("ops", "standard", "Kinh doanh", allowed_resources={"SALES", "RND"})
    legal_mgr_scope = make_scope("legal_mgr", "manager", "Pháp chế (Legal)", allowed_resources={"LEGAL"})

    # Case A: Missing department -> False for both
    hit_missing = {"payload": {"contract_name": "no_dept.pdf", "department": None}}
    assert is_v_allowed(hit_missing, ops_sales_scope) is False
    assert is_v_allowed(hit_missing, legal_mgr_scope) is False

    # Case B: Empty department -> False for both
    hit_empty = {"payload": {"contract_name": "empty_dept.pdf", "department": ""}}
    assert is_v_allowed(hit_empty, ops_sales_scope) is False
    assert is_v_allowed(hit_empty, legal_mgr_scope) is False

    # Case C: Salesforce doc in Legal department
    hit_salesforce = {
        "payload": {
            "contract_name": "SalesforcecomInc_20191218_8-K_EX-10.1_Development Agreement.pdf",
            "department": "Pháp chế (Legal)",
            "storage_path": "/data/legal/SalesforcecomInc.pdf",
        }
    }
    # Ops must be rejected (False)
    assert is_v_allowed(hit_salesforce, ops_sales_scope) is False, "Sales user improperly allowed access to Legal Salesforce doc!"
    # Legal Manager must be allowed (True)
    assert is_v_allowed(hit_salesforce, legal_mgr_scope) is True, "Legal manager improperly blocked from Legal Salesforce doc!"
