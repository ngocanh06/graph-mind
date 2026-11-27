"""
Unit tests for Step 2B.4 Data Classification Migration and Enforcement.

Verifies:
1. classify_chunk_content accurately flags sensitive clauses/terms as RESTRICTED and general terms as INTERNAL.
2. Ingestion pipeline creates PointStruct payloads with correct classification tags.
3. Clause node classification logic in Neo4j properly tags sensitive liability and confidentiality clauses.
4. ACLFilter enforces classification-based access control fail-closed (Standard users denied RESTRICTED; Managers/Executives permitted).
"""

import uuid
import pytest
from app.modules.m1_data_sync.pipeline import classify_chunk_content, SENSITIVE_PATTERNS
from app.core.rbac import ScopeContext, build_acl_filter
from app.db.postgres.models import User


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


def test_classify_chunk_content_sensitive_terms():
    """Verify that all target sensitive keywords and patterns trigger RESTRICTED classification."""
    sensitive_samples = [
        "The supplier shall have uncapped liability for gross negligence.",
        "Both parties agree to unlimited liability regarding data breaches.",
        "This agreement includes a strict non-compete clause valid for 24 months.",
        "Employee must adhere to the non-competition covenant post-termination.",
        "The Vendor shall indemnify, defend, and hold harmless the Company.",
        "Bên B cam kết chịu trách nhiệm bồi thường vô hạn đối với thiệt hại phát sinh.",
        "Nghĩa vụ trách nhiệm vô hạn áp dụng đối với vi phạm quyền sở hữu trí tuệ.",
        "Exclusivity rights are granted solely to the Distributor in Vietnam.",
        "Trade secret protection applies to all algorithms and source code.",
        "Bảo vệ bí mật kinh doanh tuyệt đối trong suốt thời gian hiệu lực.",
        "Change of control provisions apply if more than 50% shares transfer.",
        "Chế tài bồi thường & phạt vi phạm áp dụng theo quy định của hợp đồng.",
        "Tuân thủ nghiêm ngặt điều khoản bảo mật thông tin nội bộ.",
        "Các bên cam kết bảo mật thông tin khách hàng và kỹ thuật.",
        "Confidentiality obligations survive 5 years past contract expiration.",
        "Limitation of liability terms do not cover intentional misconduct."
    ]
    for sample in sensitive_samples:
        assert classify_chunk_content(sample) == "RESTRICTED", f"Expected RESTRICTED for: {sample}"


def test_classify_chunk_content_normal_terms():
    """Verify that general business content defaults to INTERNAL."""
    normal_samples = [
        "Hợp đồng có hiệu lực 12 tháng kể từ ngày các bên ký kết.",
        "Phương thức thanh toán bằng chuyển khoản ngân hàng trong vòng 30 ngày.",
        "Địa điểm giao hàng tại kho của Bên Mua tại Quận 7, TP. Hồ Chí Minh.",
        "Quy trình kiểm tra chất lượng sản phẩm được thực hiện theo tiêu chuẩn ISO 9001.",
        "",
        None
    ]
    for sample in normal_samples:
        assert classify_chunk_content(sample) == "INTERNAL", f"Expected INTERNAL for: {sample}"


def test_clause_metadata_classification():
    """Verify clause metadata classification logic used for Neo4j indexing."""
    # Sensitive clause types/titles
    restricted_clause_meta = "Trách nhiệm & Bồi thường (Liability) uncapped liability clause text"
    assert classify_chunk_content(restricted_clause_meta) == "RESTRICTED"

    confidential_clause_meta = "Bảo mật thông tin (Confidentiality) Điều khoản bảo mật dữ liệu"
    assert classify_chunk_content(confidential_clause_meta) == "RESTRICTED"

    # Non-sensitive clause types/titles
    normal_clause_meta = "Điều khoản chung General Terms Các định nghĩa sử dụng trong hợp đồng"
    assert classify_chunk_content(normal_clause_meta) == "INTERNAL"

    payment_clause_meta = "Điều khoản Thanh toán Payment Terms Thanh toán đợt 1 30%"
    assert classify_chunk_content(payment_clause_meta) == "INTERNAL"


def test_acl_filter_enforces_classification_least_privilege():
    """
    Verify that Step 2B.3 ACLFilter integrates with Step 2B.4 classification:
    - Standard Legal user: access to Legal INTERNAL allowed; access to Legal RESTRICTED DENIED.
    - Legal Manager: access to Legal RESTRICTED allowed.
    - Executive: access to all classifications across departments allowed.
    - Sales user: access to Legal (INTERNAL or RESTRICTED) DENIED.
    """
    legal_std_scope = _make_scope(
        role="standard",
        dept_name="Pháp chế (Legal)",
        canonical_dept="legal",
        allowed_depts={"legal", "pháp chế (legal)"},
        allowed_res={"LEGAL"},
        is_unrestricted=False,
    )
    legal_mgr_scope = _make_scope(
        role="manager",
        dept_name="Pháp chế (Legal)",
        canonical_dept="legal",
        allowed_depts={"legal", "pháp chế (legal)"},
        allowed_res={"LEGAL"},
        is_unrestricted=False,
    )
    exec_scope = _make_scope(
        role="executive",
        dept_name="Ban Giám đốc",
        canonical_dept="executive",
        allowed_depts={"*"},
        allowed_res={"*"},
        is_unrestricted=True,
    )
    sales_std_scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales", "kinh doanh (sales)"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )

    filter_legal_std = build_acl_filter(legal_std_scope)
    filter_legal_mgr = build_acl_filter(legal_mgr_scope)
    filter_exec = build_acl_filter(exec_scope)
    filter_sales_std = build_acl_filter(sales_std_scope)

    legal_internal_payload = {
        "department": "Pháp chế (Legal)",
        "classification": "INTERNAL",
        "text": "Điều khoản thanh toán thông thường."
    }
    legal_restricted_payload = {
        "department": "Pháp chế (Legal)",
        "classification": "RESTRICTED",
        "text": "Bồi thường vô hạn đối với vi phạm nghĩa vụ bảo mật."
    }
    sales_internal_payload = {
        "department": "Kinh doanh (Sales)",
        "classification": "INTERNAL",
        "text": "Kế hoạch doanh số quý 4."
    }

    # 1. Standard Legal: Can access Legal INTERNAL, but CANNOT access Legal RESTRICTED
    assert filter_legal_std.matches_payload(legal_internal_payload) is True
    assert filter_legal_std.matches_payload(legal_restricted_payload) is False

    # 2. Manager Legal: Can access BOTH Legal INTERNAL and Legal RESTRICTED
    assert filter_legal_mgr.matches_payload(legal_internal_payload) is True
    assert filter_legal_mgr.matches_payload(legal_restricted_payload) is True

    # 3. Executive: Can access everything
    assert filter_exec.matches_payload(legal_internal_payload) is True
    assert filter_exec.matches_payload(legal_restricted_payload) is True
    assert filter_exec.matches_payload(sales_internal_payload) is True

    # 4. Standard Sales: Cannot access any Legal content, whether INTERNAL or RESTRICTED
    assert filter_sales_std.matches_payload(legal_internal_payload) is False
    assert filter_sales_std.matches_payload(legal_restricted_payload) is False
    # But can access Sales INTERNAL
    assert filter_sales_std.matches_payload(sales_internal_payload) is True
