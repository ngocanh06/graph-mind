import inspect
import uuid
import pytest
from app.core.rbac import (
    ScopeContext,
    build_acl_filter,
    ACLFilter,
)
from app.db.postgres.models import User
from app.db.qdrant.client import qdrant_client
from app.db.neo4j.client import neo4j_client


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


def test_build_acl_filter_unrestricted_executive():
    """2B.3: Executive scope produces unrestricted ACLFilter with no qdrant_filter and matches all."""
    scope = _make_scope(
        role="executive",
        dept_name="Executive",
        canonical_dept="executive",
        allowed_depts={"*"},
        allowed_res={"*"},
        is_unrestricted=True,
    )
    acl = build_acl_filter(scope)

    assert acl.is_unrestricted is True
    assert acl.qdrant_filter is None
    assert acl.cypher_where == "1=1"
    assert acl.can_view_sensitive is True

    # Matches any payload regardless of classification or department
    assert acl.matches_payload({"department": "Legal", "classification": "RESTRICTED"}) is True
    assert acl.matches_payload({"department": "Sales", "classification": "PUBLIC"}) is True
    assert acl.matches_payload({}) is True


def test_build_acl_filter_restricted_standard_sales():
    """2B.3: Standard user in Sales has restricted ACLFilter blocking Legal & Restricted clauses."""
    scope = _make_scope(
        role="standard",
        dept_name="Kinh doanh (Sales)",
        canonical_dept="sales",
        allowed_depts={"sales"},
        allowed_res={"SALES"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(scope)

    assert acl.is_unrestricted is False
    assert acl.can_view_sensitive is False
    assert acl.qdrant_filter is not None
    assert "must_not" in acl.qdrant_filter
    assert "RESTRICTED" in str(acl.qdrant_filter["must_not"])
    assert "coalesce(n.classification, 'INTERNAL') <> 'RESTRICTED'" in acl.cypher_where

    # 1. Own department + INTERNAL -> Allowed
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": "INTERNAL"}) is True
    assert acl.matches_payload({"department": "sales", "classification": "INTERNAL"}) is True

    # 2. Own department + RESTRICTED -> Blocked (standard user cannot view sensitive)
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": "RESTRICTED"}) is False

    # 3. Cross-department (Legal) + INTERNAL -> Blocked (department isolation)
    assert acl.matches_payload({"department": "Pháp chế (Legal)", "classification": "INTERNAL"}) is False

    # 4. Cross-department (Legal) + RESTRICTED -> Blocked
    assert acl.matches_payload({"department": "Pháp chế (Legal)", "classification": "RESTRICTED"}) is False

    # 5. PUBLIC classification -> Allowed across departments
    assert acl.matches_payload({"department": "Pháp chế (Legal)", "classification": "PUBLIC"}) is True

    # 6. Missing department metadata -> Blocked fail-closed
    assert acl.matches_payload({"classification": "INTERNAL"}) is False
    assert acl.matches_payload({}) is False


def test_build_acl_filter_legal_manager():
    """2B.3: Legal Manager can view Legal department items including RESTRICTED clauses."""
    scope = _make_scope(
        role="knowledge_manager",
        dept_name="Pháp chế (Legal)",
        canonical_dept="legal",
        allowed_depts={"legal"},
        allowed_res={"LEGAL"},
        is_unrestricted=False,
    )
    acl = build_acl_filter(scope)

    assert acl.is_unrestricted is False
    assert acl.can_view_sensitive is True

    # Can view Legal RESTRICTED
    assert acl.matches_payload({"department": "Pháp chế (Legal)", "classification": "RESTRICTED"}) is True
    assert acl.matches_payload({"department": "Legal", "classification": "INTERNAL"}) is True

    # Blocked from Sales
    assert acl.matches_payload({"department": "Kinh doanh (Sales)", "classification": "INTERNAL"}) is False


def test_keyword_only_acl_filter_parameters():
    """2B.3: vector_search, get_document_chunks, run_cypher, search_nodes must enforce keyword-only acl_filter."""
    # 1. qdrant_client.vector_search
    sig_vs = inspect.signature(qdrant_client.vector_search)
    assert "acl_filter" in sig_vs.parameters
    assert sig_vs.parameters["acl_filter"].kind == inspect.Parameter.KEYWORD_ONLY

    # 2. qdrant_client.get_document_chunks
    sig_gdc = inspect.signature(qdrant_client.get_document_chunks)
    assert "acl_filter" in sig_gdc.parameters
    assert sig_gdc.parameters["acl_filter"].kind == inspect.Parameter.KEYWORD_ONLY

    # 3. qdrant_client.search_by_text
    sig_sbt = inspect.signature(qdrant_client.search_by_text)
    assert "acl_filter" in sig_sbt.parameters
    assert sig_sbt.parameters["acl_filter"].kind == inspect.Parameter.KEYWORD_ONLY

    # 4. neo4j_client.run_cypher
    sig_rc = inspect.signature(neo4j_client.run_cypher)
    assert "acl_filter" in sig_rc.parameters
    assert sig_rc.parameters["acl_filter"].kind == inspect.Parameter.KEYWORD_ONLY

    # 5. neo4j_client.search_nodes
    sig_sn = inspect.signature(neo4j_client.search_nodes)
    assert "acl_filter" in sig_sn.parameters
    assert sig_sn.parameters["acl_filter"].kind == inspect.Parameter.KEYWORD_ONLY
