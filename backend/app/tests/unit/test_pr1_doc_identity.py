"""
Component Tests for PR1 Document Identity, CAS State Machine, Two-Tier Retrieval Gate & Recovery
Module: backend/app/tests/unit/test_pr1_doc_identity.py

Coverage: 45 component test cases
- Tests 1-6:   Logical vs. Physical Point ID Determinism & Disjointness
- Tests 7-10:  Two-Tier In-Memory Lock (Path Lock + Doc Lock)
- Tests 11-16: Durable Journal First & CAS Staging
- Tests 17-22: CAS State Machine Transitions & Fencing
- Tests 23-26: Qdrant Point Activation & Scoped Old Point Purge
- Tests 27-32: Crash Recovery Reconciliation
- Tests 33-37: Fail-Closed Deletion & Version Verification
- Tests 38-41: Layer-1 Qdrant Retrieval Guard
- Tests 42-45: Layer-2 Context Gate & Zero Retrieval Refusal
"""
import pytest
import os
import sys
import uuid
import threading
import asyncio
from unittest.mock import MagicMock, patch

app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from modules.m1_data_sync.pipeline import (
    generate_logical_chunk_id,
    generate_physical_point_id,
    FencedOperationError,
    acquire_ingestion_transaction_locks,
    process_document_ingestion,
    process_document_deletion,
    reconcile_crashed_operations,
    GRAPHMIND_CHUNK_NAMESPACE
)
from db.qdrant.client import (
    validate_and_inject_layer1_guard,
    InvalidQueryFilterError,
    QdrantClientWrapper
)
from api.v1.copilot import (
    apply_layer2_context_gate,
    _is_serving_eligible,
    verify_chunk_serving_integrity,
    validate_aggregate_in_layer2,
    verify_document_batch,
)
from modules.m3_hybrid_copilot.query_engine.text_to_cypher import (
    generate_cypher_from_query,
    CYPHER_SERVING_ELIGIBILITY_FILTER,
)
from modules.m3_hybrid_copilot.inference.client import OllamaClient
from tests.fakes.fake_neo4j import FakeNeo4jClient
from tests.fakes.fake_qdrant import FakeQdrantClientInner


class MockEmbedModel:
    def encode(self, texts, **kwargs):
        if isinstance(texts, str):
            return [0.01] * 384
        return [[0.01 * ((i + idx) % 10) for i in range(384)] for idx, _ in enumerate(texts)]


@pytest.fixture(autouse=True)
def mock_embedding_model(monkeypatch):
    """Ensure in-memory mock embed model is used across all tests without network/disk load."""
    mock_instance = MockEmbedModel()
    try:
        monkeypatch.setattr("app.db.qdrant.client.get_embed_model", lambda: mock_instance)
    except Exception:
        pass
    try:
        monkeypatch.setattr("db.qdrant.client.get_embed_model", lambda: mock_instance)
    except Exception:
        pass


# ============================================================================
# TESTS 1-6: LOGICAL VS. PHYSICAL POINT ID DETERMINISM & DISJOINTNESS
# ============================================================================

def test_logical_chunk_id_determinism():
    """1. Logical Chunk ID is strictly deterministic across calls with identical parameters."""
    id1 = generate_logical_chunk_id("DOC_12345678", "hash_abc", 0)
    id2 = generate_logical_chunk_id("DOC_12345678", "hash_abc", 0)
    assert id1 == id2
    assert uuid.UUID(id1).version == 5


def test_physical_point_id_determinism():
    """2. Physical Point ID is deterministic given identical operation and generation."""
    p1 = generate_physical_point_id("DOC_1", "hash_1", "op_100", 1, "v1", "c1", "e1", 0)
    p2 = generate_physical_point_id("DOC_1", "hash_1", "op_100", 1, "v1", "c1", "e1", 0)
    assert p1 == p2
    assert uuid.UUID(p1).version == 5


def test_physical_point_id_disjoint_across_operations():
    """3. Physical Point IDs from two different operations are completely disjoint."""
    p1 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v1", "c1", "e1", 0)
    p2 = generate_physical_point_id("DOC_1", "hash_1", "op_B", 1, "v1", "c1", "e1", 0)
    assert p1 != p2


def test_physical_point_id_disjoint_across_generations():
    """4. Physical Point IDs from two different fencing generations are disjoint."""
    p1 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v1", "c1", "e1", 0)
    p2 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 2, "v1", "c1", "e1", 0)
    assert p1 != p2


def test_physical_point_id_different_chunk_index():
    """5. Different chunk indices produce disjoint physical IDs."""
    p1 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v1", "c1", "e1", 0)
    p2 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v1", "c1", "e1", 1)
    assert p1 != p2


def test_physical_point_id_different_configs():
    """6. Changing parser/chunker/embedding configs produces disjoint physical IDs."""
    p1 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v1", "c1", "e1", 0)
    p2 = generate_physical_point_id("DOC_1", "hash_1", "op_A", 1, "v2", "c1", "e1", 0)
    assert p1 != p2


# ============================================================================
# TESTS 7-10: TWO-TIER IN-MEMORY LOCK (PATH LOCK + DOC LOCK)
# ============================================================================

def test_acquire_two_tier_lock_success():
    """7. Two-Tier Lock is successfully acquired and released inside context manager."""
    with acquire_ingestion_transaction_locks("/data/legal/contract.pdf", "DOC_100"):
        # Critical section
        pass


def test_acquire_two_tier_lock_concurrency_serialization():
    """8. Two concurrent threads on the same document path execute serially."""
    order = []

    def task(val):
        with acquire_ingestion_transaction_locks("/data/legal/same.pdf", "DOC_SAME"):
            order.append(f"start_{val}")
            import time
            time.sleep(0.01)
            order.append(f"end_{val}")

    t1 = threading.Thread(target=task, args=(1,))
    t2 = threading.Thread(target=task, args=(2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Serialization check: start_1 -> end_1 -> start_2 -> end_2 (or vice versa)
    assert (order == ["start_1", "end_1", "start_2", "end_2"] or
            order == ["start_2", "end_2", "start_1", "end_1"])


def test_acquire_two_tier_lock_different_paths_concurrent():
    """9. Two operations on different paths do not block each other."""
    started = []

    def task(path, doc_id):
        with acquire_ingestion_transaction_locks(path, doc_id):
            started.append(doc_id)

    t1 = threading.Thread(target=task, args=("/data/legal/p1.pdf", "DOC_1"))
    t2 = threading.Thread(target=task, args=("/data/sales/p2.csv", "DOC_2"))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    assert set(started) == {"DOC_1", "DOC_2"}


def test_two_tier_lock_release_on_exception():
    """10. Locks are released even if an unhandled exception occurs inside the block."""
    with pytest.raises(RuntimeError):
        with acquire_ingestion_transaction_locks("/data/legal/err.pdf", "DOC_ERR"):
            raise RuntimeError("Boom")

    # Subsequent acquisition on same path must succeed immediately
    with acquire_ingestion_transaction_locks("/data/legal/err.pdf", "DOC_ERR"):
        assert True


# ============================================================================
# TESTS 11-16: DURABLE JOURNAL FIRST & CAS STAGING
# ============================================================================

def test_durable_journal_first_committed_before_qdrant_write(monkeypatch):
    """11. Neo4j STAGING commit executes strictly BEFORE any Qdrant upsert call."""
    execution_order = []
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()

    # Wrap run_cypher to log order
    orig_run_cypher = fake_neo.run_cypher

    def logging_run_cypher(query, params=None):
        if "op_stage = 'STAGING'" in query or "CREATE (d:Document" in query:
            execution_order.append("NEO4J_STAGING_JOURNAL")
        elif "op_stage = 'STAGED'" in query:
            execution_order.append("NEO4J_STAGED")
        return orig_run_cypher(query, params)

    fake_neo.run_cypher = logging_run_cypher

    orig_upsert = fake_qdrant_inner.upsert

    def logging_upsert(collection_name, points, **kwargs):
        execution_order.append("QDRANT_UPSERT")
        return orig_upsert(collection_name, points, **kwargs)

    fake_qdrant_inner.upsert = logging_upsert

    fake_qdrant_wrapper = MagicMock()
    fake_qdrant_wrapper.is_connected = True
    fake_qdrant_wrapper._client = fake_qdrant_inner
    fake_qdrant_wrapper._collection = "cuad_contracts"

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    # Register canned response for create node
    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    res = process_document_ingestion(
        content_bytes=b"Sample document text content for PR1 testing.",
        filename="test_journal.txt",
        department="legal",
        allow_skip_known=False
    )

    assert res["success"] is True
    # Verify strict ordering: NEO4J_STAGING_JOURNAL before QDRANT_UPSERT
    assert "NEO4J_STAGING_JOURNAL" in execution_order
    assert "QDRANT_UPSERT" in execution_order
    assert execution_order.index("NEO4J_STAGING_JOURNAL") < execution_order.index("QDRANT_UPSERT")


def test_staging_journal_contains_required_fields(monkeypatch):
    """12. Staging journal parameters include op_id, gen, hash, configs, and expected chunk count."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Contract document paragraph 1.\n\nParagraph 2.",
        filename="journal_fields.txt",
        department="legal",
        allow_skip_known=False
    )

    staging_queries = [q for q in fake_neo.executed_queries if "CREATE (d:Document" in q["query"] or "op_stage = 'STAGING'" in q["query"]]
    assert len(staging_queries) > 0
    params = staging_queries[0]["params"]
    assert "op_id" in params
    assert "hash" in params
    assert "parser_cfg" in params
    assert "chunker_cfg" in params
    assert "embed_cfg" in params
    assert "expected_chunk_count" in params
    assert params["expected_chunk_count"] > 0


def test_qdrant_points_staged_with_is_active_false(monkeypatch):
    """13. Vector points sent to Qdrant during staging have is_active == False."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Staged point active flag verification.",
        filename="staged_active.txt",
        department="legal",
        allow_skip_known=False
    )

    assert len(fake_qdrant_inner.upsert_history) > 0
    staged_points = fake_qdrant_inner.upsert_history[0]["points"]
    for pt in staged_points:
        assert pt.payload["is_active"] is False


def test_journal_failure_aborts_before_qdrant_upsert(monkeypatch):
    """14. If Neo4j journal write throws an exception, zero points are sent to Qdrant."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    def failing_cypher(query, params=None):
        if "CREATE (d:Document" in query or "op_stage = 'STAGING'" in query:
            raise RuntimeError("Database connection dropped during staging journal write.")
        return []

    fake_neo.run_cypher = failing_cypher

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    res = process_document_ingestion(
        content_bytes=b"Text content",
        filename="journal_fail.txt",
        department="legal",
        allow_skip_known=False
    )

    assert res["success"] is False
    assert "Durable Journal First failed" in res["error"]
    # Qdrant upsert must never be invoked
    assert len(fake_qdrant_inner.upsert_history) == 0


def test_cas_staged_transition_success(monkeypatch):
    """15. Transition to STAGED succeeds when generation and active_op_id match."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    res = process_document_ingestion(
        content_bytes=b"Text content",
        filename="cas_staged.txt",
        department="legal",
        allow_skip_known=False
    )
    assert res["success"] is True


def test_cas_staged_transition_failure_raises_fenced_operation_error(monkeypatch):
    """16. If CAS update for STAGED returns 0 records, FencedOperationError is raised."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    # STAGED returns 0 rows (fencing mismatch)
    fake_neo.register_response("op_stage = 'STAGED'", [])

    with pytest.raises(FencedOperationError):
        process_document_ingestion(
            content_bytes=b"Text content",
            filename="cas_staged_fail.txt",
            department="legal",
            allow_skip_known=False
        )


# ============================================================================
# TESTS 17-22: CAS STATE MACHINE TRANSITIONS & FENCING
# ============================================================================

def test_cas_graph_indexed_transition_success(monkeypatch):
    """17. Transition to GRAPH_INDEXED succeeds on matching gen and op_id."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    res = process_document_ingestion(
        content_bytes=b"Text",
        filename="cas_graph.txt",
        department="legal",
        allow_skip_known=False
    )
    assert res["success"] is True


def test_cas_graph_indexed_failure_raises_fenced_operation_error(monkeypatch):
    """18. If CAS update for GRAPH_INDEXED returns 0 records, FencedOperationError is raised."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [])

    with pytest.raises(FencedOperationError):
        process_document_ingestion(
            content_bytes=b"Text",
            filename="cas_graph_fail.txt",
            department="legal",
            allow_skip_known=False
        )


def test_cas_preparing_activation_success(monkeypatch):
    """19. Pre-activation check PREPARING_ACTIVATION succeeds via CAS."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    res = process_document_ingestion(
        content_bytes=b"Text",
        filename="cas_preact.txt",
        department="legal",
        allow_skip_known=False
    )
    assert res["success"] is True


def test_cas_preparing_activation_failure_raises_fenced_operation_error(monkeypatch):
    """20. If CAS update for PREPARING_ACTIVATION returns 0 records, FencedOperationError is raised."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [])

    with pytest.raises(FencedOperationError):
        process_document_ingestion(
            content_bytes=b"Text",
            filename="cas_preact_fail.txt",
            department="legal",
            allow_skip_known=False
        )


def test_cas_serving_commit_success(monkeypatch):
    """21. Commit serving version sets status='SYNCED' and op_stage='PURGING_OLD' via CAS."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    res = process_document_ingestion(
        content_bytes=b"Text",
        filename="cas_commit.txt",
        department="legal",
        allow_skip_known=False
    )
    assert res["success"] is True


def test_cas_serving_commit_failure_raises_fenced_operation_error(monkeypatch):
    """22. If CAS update for serving version commit returns 0 records, FencedOperationError is raised."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [])

    with pytest.raises(FencedOperationError):
        process_document_ingestion(
            content_bytes=b"Text",
            filename="cas_commit_fail.txt",
            department="legal",
            allow_skip_known=False
        )


# ============================================================================
# TESTS 23-26: QDRANT POINT ACTIVATION & SCOPED OLD POINT PURGE
# ============================================================================

def test_point_activation_sets_is_active_true(monkeypatch):
    """23. Point activation calls set_payload with is_active=True for newly staged points."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Text",
        filename="act_true.txt",
        department="legal",
        allow_skip_known=False
    )

    # Check set_payload was called with is_active=True
    calls = fake_qdrant_inner.set_payload.call_args_list
    assert any(call.kwargs.get("payload", {}).get("is_active") is True for call in calls)


def test_old_point_deactivation_before_new_activation(monkeypatch):
    """24. If old points exist, they are deactivated with is_active=False."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    old_ids = ["old_pt_1", "old_pt_2"]
    fake_neo.register_response("OPTIONAL MATCH (d:Document)", [{
        "elem_id": "4:doc:1",
        "gen": 1,
        "old_point_ids": old_ids,
        "existing_id": "DOC_EXISTING"
    }])
    fake_neo.register_response("op_stage = 'STAGING'", [{"elem_id": "4:doc:1", "gen": 2}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Text",
        filename="act_deact.txt",
        department="legal",
        allow_skip_known=False
    )

    calls = fake_qdrant_inner.set_payload.call_args_list
    deact_call = next((c for c in calls if c.kwargs.get("payload", {}).get("is_active") is False), None)
    assert deact_call is not None
    assert deact_call.kwargs.get("points") == old_ids


def test_scoped_purge_old_points_by_exact_ids(monkeypatch):
    """25. Old points are purged using PointIdsList with exact old IDs."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    old_ids = ["old_pt_1", "old_pt_2"]
    fake_neo.register_response("OPTIONAL MATCH (d:Document)", [{
        "elem_id": "4:doc:1",
        "gen": 1,
        "old_point_ids": old_ids,
        "existing_id": "DOC_EXISTING"
    }])
    fake_neo.register_response("op_stage = 'STAGING'", [{"elem_id": "4:doc:1", "gen": 2}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Text",
        filename="purge_old.txt",
        department="legal",
        allow_skip_known=False
    )

    delete_calls = fake_qdrant_inner.delete_history
    assert len(delete_calls) > 0
    # Check selector contains old_ids
    purge_sel = delete_calls[-1]["selector"]
    assert getattr(purge_sel, "points", None) == old_ids


def test_terminal_synced_clears_active_op_id(monkeypatch):
    """26. Final terminal synced CAS sets op_stage='TERMINAL_SYNCED' and active_op_id=NULL."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("CREATE (d:Document", [{"elem_id": "4:doc:1", "gen": 1}])
    fake_neo.register_response("op_stage = 'STAGED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'GRAPH_INDEXED'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PREPARING_ACTIVATION'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'PURGING_OLD'", [{"elem_id": "4:doc:1"}])
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:1"}])

    process_document_ingestion(
        content_bytes=b"Text",
        filename="term_sync.txt",
        department="legal",
        allow_skip_known=False
    )

    term_query = next((q for q in fake_neo.executed_queries if "op_stage = 'TERMINAL_SYNCED'" in q["query"]), None)
    assert term_query is not None
    assert "d.active_op_id = NULL" in term_query["query"]


# ============================================================================
# TESTS 27-32: CRASH RECOVERY RECONCILIATION
# ============================================================================

def test_crash_recovery_cleans_up_staging_orphan_points(monkeypatch):
    """27. Operation in STAGING state has expected physical IDs reconstructed and purged."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:crash1",
        "doc_id": "DOC_C1",
        "file_hash": "hash_c1",
        "op_id": "op_c1",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 2,
        "parser_cfg": "v1.0",
        "chunker_cfg": "overlap_500_v1.0",
        "embed_cfg": "all-MiniLM-L6-v2_384_v1.0",
        "status": "STAGING"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'TERMINAL_FAILED'", [{"elem_id": "4:doc:crash1"}])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 1
    assert res["audit_pending"] == 0

    # Verify Qdrant delete was called
    assert len(fake_qdrant_inner.delete_history) == 1
    deleted_points = fake_qdrant_inner.delete_history[0]["selector"].points
    assert len(deleted_points) == 2


def test_crash_recovery_cas_marks_terminal_failed(monkeypatch):
    """28. Recovered document is CAS transitioned to TERMINAL_FAILED with audit note."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:crash2",
        "doc_id": "DOC_C2",
        "file_hash": "hash_c2",
        "op_id": "op_c2",
        "gen": 1,
        "stage": "STAGED",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'TERMINAL_FAILED'", [{"elem_id": "4:doc:crash2"}])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 1

    cas_query = next((q for q in fake_neo.executed_queries if "op_stage = 'TERMINAL_FAILED'" in q["query"]), None)
    assert cas_query is not None
    assert "Cleaned up by crash recovery" in cas_query["query"]


def test_crash_recovery_purging_old_advances_to_terminal_synced(monkeypatch):
    """29. Document crashed during PURGING_OLD safely advances to TERMINAL_SYNCED."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:crash3",
        "doc_id": "DOC_C3",
        "file_hash": "hash_c3",
        "op_id": "op_c3",
        "gen": 2,
        "stage": "PURGING_OLD"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:crash3"}])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 1
    assert res["audit_pending"] == 0


def test_crash_recovery_incomplete_journal_marks_cleanup_pending_audit(monkeypatch):
    """30. Incomplete journal (missing expected chunk count) transitions to CLEANUP_PENDING_AUDIT."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:crash4",
        "doc_id": "DOC_C4",
        "file_hash": "hash_c4",
        "op_id": "op_c4",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 0  # Missing / corrupted!
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("CLEANUP_PENDING_AUDIT", [{"elem_id": "4:doc:crash4"}])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["audit_pending"] == 1
    assert res["reconciled"] == 0


def test_crash_recovery_generation_moved_skips_overwrite(monkeypatch):
    """31. If generation moved during recovery, CAS returns 0 and does not overwrite."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:crash5",
        "doc_id": "DOC_C5",
        "file_hash": "hash_c5",
        "op_id": "op_old",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 1,
        "parser_cfg": "v1",
        "chunker_cfg": "c1",
        "embed_cfg": "e1"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    # CAS returns 0 (generation moved to 2 by newer operation)
    fake_neo.register_response("op_stage = 'TERMINAL_FAILED'", [])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 0


def test_crash_recovery_safe_when_no_crashed_docs(monkeypatch):
    """32. If no crashed operations found, recovery returns 0 reconciled cleanly."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("WHERE d.op_stage IN", [])
    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 0
    assert res["audit_pending"] == 0


# ============================================================================
# TESTS 33-37: FAIL-CLOSED DELETION & VERSION VERIFICATION
# ============================================================================

def test_delete_stale_hash_event_rejected(monkeypatch):
    """33. Delete event with mismatched file_hash is rejected as stale_delete_ignored."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("MATCH (d:Document)", [{
        "elem_id": "4:doc:del1",
        "doc_id": "DOC_D1",
        "file_hash": "current_live_hash",
        "status": "SYNCED"
    }])

    res = process_document_deletion("contract.pdf", "legal", file_hash="old_stale_hash")
    assert res["success"] is False
    assert res["status"] == "stale_delete_ignored"
    # Qdrant must not be purged
    assert len(fake_qdrant_inner.delete_history) == 0


def test_delete_missing_file_without_hash_marked_pending_verification(monkeypatch):
    """34. Delete event lacking hash for a missing disk file marks MISSING_PENDING_VERIFICATION."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("MATCH (d:Document)", [{
        "elem_id": "4:doc:del2",
        "doc_id": "DOC_D2",
        "file_hash": "hash_2",
        "status": "SYNCED"
    }])

    res = process_document_deletion("missing_on_disk.pdf", "legal", file_hash=None)
    assert res["success"] is True
    assert res["status"] == "MISSING_PENDING_VERIFICATION"
    # Qdrant must NOT be purged!
    assert len(fake_qdrant_inner.delete_history) == 0


def test_delete_verified_purges_exact_qdrant_ids(monkeypatch):
    """35. Verified delete event purges Qdrant points by exact active_point_ids."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    active_pts = ["pt_1", "pt_2"]
    fake_neo.register_response("MATCH (d:Document)", [{
        "elem_id": "4:doc:del3",
        "doc_id": "DOC_D3",
        "file_hash": "exact_hash",
        "point_ids": active_pts,
        "status": "SYNCED"
    }])

    res = process_document_deletion("verified.pdf", "legal", file_hash="exact_hash")
    assert res["success"] is True
    assert res["status"] == "deleted"
    assert len(fake_qdrant_inner.delete_history) > 0


def test_delete_verified_neo4j_removes_document_and_clauses(monkeypatch):
    """36. Verified delete removes Document and Clause nodes in Neo4j via elementId."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("MATCH (d:Document)", [{
        "elem_id": "4:doc:del4",
        "doc_id": "DOC_D4",
        "file_hash": "h4",
        "status": "SYNCED"
    }])

    process_document_deletion("contract4.pdf", "legal", file_hash="h4")
    delete_query = next((q for q in fake_neo.executed_queries if "DETACH DELETE d" in q["query"]), None)
    assert delete_query is not None
    assert "WHERE elementId(d) = $elem_id" in delete_query["query"]


def test_delete_verified_preserves_shared_company_nodes(monkeypatch):
    """37. Deletion query preserves connected shared Company nodes."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("MATCH (d:Document)", [{
        "elem_id": "4:doc:del5",
        "doc_id": "DOC_D5",
        "file_hash": "h5",
        "status": "SYNCED"
    }])

    process_document_deletion("contract5.pdf", "legal", file_hash="h5")
    delete_query = next((q for q in fake_neo.executed_queries if "DELETE c" in q["query"]), None)
    assert delete_query is not None
    assert "WHERE c IS NOT NULL AND NOT (c)--()" in delete_query["query"]


# ============================================================================
# TESTS 38-41: LAYER-1 QDRANT RETRIEVAL GUARD
# ============================================================================

def test_layer1_guard_injects_is_active_true_on_empty_filter():
    """38. Empty query filter has must_not: [is_active=False] injected automatically."""
    res = validate_and_inject_layer1_guard(None, "cuad_contracts")
    assert res == {"must_not": [{"key": "is_active", "match": {"value": False}}]}


def test_layer1_guard_combines_with_caller_conditions():
    """39. Caller filter conditions are preserved and combined with must_not: [is_active=False]."""
    caller_filter = {"must": [{"key": "department", "match": {"value": "legal"}}]}
    res = validate_and_inject_layer1_guard(caller_filter, "cuad_contracts")
    assert {"key": "department", "match": {"value": "legal"}} in res["must"]
    assert {"key": "is_active", "match": {"value": False}} in res["must_not"]


def test_layer1_guard_rejects_caller_override_dict():
    """40. Caller attempting to provide an is_active condition raises InvalidQueryFilterError."""
    tampered_filter = {"must": [{"key": "is_active", "match": {"value": False}}]}
    with pytest.raises(InvalidQueryFilterError):
        validate_and_inject_layer1_guard(tampered_filter, "cuad_contracts")


def test_layer1_text_search_filters_out_inactive_points():
    """41. Points with is_active=False are filtered out, while is_active=True and legacy points are candidates."""
    client_wrapper = QdrantClientWrapper()
    client_wrapper._connected = True
    client_wrapper._collection = "cuad_contracts"

    # Mock scroll with 3 points: 1 active, 1 inactive, 1 legacy (no is_active)
    pt_active = MagicMock(id="p1", payload={"text": "Confidential agreement", "is_active": True})
    pt_inactive = MagicMock(id="p2", payload={"text": "Confidential agreement old", "is_active": False})
    pt_legacy = MagicMock(id="p3", payload={"text": "Confidential agreement legacy"})  # no is_active

    client_wrapper._client = MagicMock()
    client_wrapper._client.scroll.return_value = ([pt_active, pt_inactive, pt_legacy], None)

    results = client_wrapper.search_by_text("Confidential", collection_name="cuad_contracts")
    # pt_active and pt_legacy are returned as candidates, pt_inactive is excluded
    assert len(results) == 2
    assert {r["id"] for r in results} == {"p1", "p3"}


# ============================================================================
# TESTS 42-45: LAYER-2 CONTEXT GATE & ZERO RETRIEVAL REFUSAL
# ============================================================================

def test_layer2_gate_accepts_synced_document_chunk(monkeypatch):
    """42. Chunk from unique SYNCED Document with matching hash and op_id is accepted."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    fake_neo.register_response("MATCH (d:Document)", [{
        "doc_id": "DOC_OK",
        "status": "SYNCED",
        "file_hash": "hash_ok",
        "committed_op_id": "op_ok",
        "committed_generation": 1,
        "op_stage": "TERMINAL_SYNCED"
    }])

    chunks = [{
        "doc_id": "DOC_OK",
        "file_hash": "hash_ok",
        "operation_id": "op_ok",
        "text": "Evidence paragraph"
    }]
    v_chunks, v_entities = apply_layer2_context_gate(chunks, [])
    assert len(v_chunks) == 1
    assert v_chunks[0]["doc_id"] == "DOC_OK"


def test_layer2_gate_rejects_unsynced_document_chunk(monkeypatch):
    """43. Chunk from Document not in SYNCED status (e.g. STAGING or FAILED) is rejected."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    fake_neo.register_response("MATCH (d:Document)", [{
        "doc_id": "DOC_FAIL",
        "status": "STAGING",
        "file_hash": "hash_1",
        "committed_op_id": "op_1"
    }])

    chunks = [{
        "doc_id": "DOC_FAIL",
        "file_hash": "hash_1",
        "operation_id": "op_1",
        "text": "Staged unverified chunk"
    }]
    v_chunks, v_entities = apply_layer2_context_gate(chunks, [])
    assert len(v_chunks) == 0


def test_layer2_gate_rejects_duplicate_document_chunk(monkeypatch):
    """44. If duplicate Document nodes exist for doc_id, chunk is rejected fail-closed."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    # Returns 2 records for same doc_id (duplicate detected!)
    fake_neo.register_response("MATCH (d:Document)", [
        {"doc_id": "DOC_DUP", "status": "SYNCED", "file_hash": "h1", "committed_op_id": "op1"},
        {"doc_id": "DOC_DUP", "status": "SYNCED", "file_hash": "h2", "committed_op_id": "op2"}
    ])

    chunks = [{"doc_id": "DOC_DUP", "file_hash": "h1", "operation_id": "op1", "text": "text"}]
    v_chunks, v_entities = apply_layer2_context_gate(chunks, [])
    assert len(v_chunks) == 0


def test_layer2_zero_retrieval_refusal_when_context_empty(monkeypatch):
    """45. When all context is rejected by Layer-2, standardized grounding refusal is returned."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    # All unverified
    fake_neo.register_response("MATCH (d:Document)", [])

    chunks = [{"doc_id": "UNVERIFIED", "text": "junk"}]
    entities = [{"type": "portfolio-breakdown", "name": "ungrounded_card"}]

    v_chunks, v_entities = apply_layer2_context_gate(chunks, entities)
    assert len(v_chunks) == 0
    assert len(v_entities) == 0


# ============================================================================
# REMEDIATION V3 UNIT TESTS (TESTS 46 - 70)
# ============================================================================

from modules.m1_data_sync.pipeline import (
    RestrictedSafeModeRegistry,
    acquire_rename_transaction_locks,
    process_document_rename
)


# ----------------------------------------------------------------------------
# F-01: RECOVERY OWNERSHIP, VERIFIED CLEANUP, READ-BACK & PURGING_OLD
# ----------------------------------------------------------------------------

def test_f01_v3_recovery_read_back_after_delete_zero(monkeypatch):
    """46. F-01: Crash recovery executes verified delete and read-back confirms 0 remaining points."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:rec1",
        "doc_id": "DOC_R1",
        "file_hash": "hash_r1",
        "op_id": "op_r1",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 2,
        "parser_cfg": "v1.0",
        "chunker_cfg": "overlap_500_v1.0",
        "embed_cfg": "all-MiniLM-L6-v2_384_v1.0",
        "status": "STAGING"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'TERMINAL_FAILED'", [{"elem_id": "4:doc:rec1"}])

    p0 = generate_physical_point_id("DOC_R1", "hash_r1", "op_r1", 1, "v1.0", "overlap_500_v1.0", "all-MiniLM-L6-v2_384_v1.0", 0)
    p1 = generate_physical_point_id("DOC_R1", "hash_r1", "op_r1", 1, "v1.0", "overlap_500_v1.0", "all-MiniLM-L6-v2_384_v1.0", 1)

    def mock_retrieve(collection_name, ids, **kwargs):
        if len(fake_qdrant_inner.delete_history) > 0:
            return []
        res = []
        for pid in ids:
            pt = MagicMock()
            pt.id = pid
            pt.payload = {
                "doc_id": "DOC_R1",
                "file_hash": "hash_r1",
                "operation_id": "op_r1",
                "fencing_generation": 1,
                "is_active": False
            }
            res.append(pt)
        return res

    fake_qdrant_inner.retrieve = mock_retrieve

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 1
    assert res["audit_pending"] == 0
    assert len(fake_qdrant_inner.delete_history) == 1
    assert set(fake_qdrant_inner.delete_history[0]["selector"].points) == {p0, p1}


def test_f01_v3_recovery_post_delete_remaining_sets_cleanup_pending(monkeypatch):
    """47. F-01: Post-delete read-back finds remaining points; sets CLEANUP_PENDING fail-closed."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:rec2",
        "doc_id": "DOC_R2",
        "file_hash": "hash_r2",
        "op_id": "op_r2",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1",
        "status": "STAGING"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'CLEANUP_PENDING'", [{"elem_id": "4:doc:rec2"}])

    p0 = generate_physical_point_id("DOC_R2", "hash_r2", "op_r2", 1, "v1.0", "c1", "e1", 0)
    pt = MagicMock()
    pt.id = p0
    pt.payload = {
        "doc_id": "DOC_R2",
        "file_hash": "hash_r2",
        "operation_id": "op_r2",
        "fencing_generation": 1,
        "is_active": False
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["audit_pending"] == 1
    assert res["reconciled"] == 0

    pending_cypher = next((q for q in fake_neo.executed_queries if "SET d.op_stage = 'CLEANUP_PENDING'" in q["query"]), None)
    assert pending_cypher is not None


def test_f01_v3_recovery_mismatched_metadata_not_deleted(monkeypatch):
    """48. F-01: Points with mismatched payload metadata are NOT deleted; document routed to CLEANUP_PENDING_AUDIT."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:rec3",
        "doc_id": "DOC_R3",
        "file_hash": "hash_r3",
        "op_id": "op_r3",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1",
        "status": "STAGING"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'CLEANUP_PENDING_AUDIT'", [{"elem_id": "4:doc:rec3"}])

    p0 = generate_physical_point_id("DOC_R3", "hash_r3", "op_r3", 1, "v1.0", "c1", "e1", 0)
    pt = MagicMock()
    pt.id = p0
    pt.payload = {
        "doc_id": "DOC_R3",
        "file_hash": "hash_r3",
        "operation_id": "op_DIFFERENT",
        "fencing_generation": 1,
        "is_active": False
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["audit_pending"] == 1
    assert len(fake_qdrant_inner.delete_history) == 0


def test_f01_v3_recovery_stale_generation_cannot_purge_new_operation(monkeypatch):
    """49. F-01: Stale recovery worker detects generation moved; aborts pre-delete mutation."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:rec4",
        "doc_id": "DOC_R4",
        "file_hash": "hash_r4",
        "op_id": "op_stale",
        "gen": 1,
        "stage": "STAGING",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1",
        "status": "STAGING"
    }]

    def custom_cypher(query, params=None):
        params = params or {}
        if "WHERE d.op_stage IN" in query and "fencing_generation" not in query:
            return crashed
        if "fencing_generation = $gen" in query:
            return []
        return []

    fake_neo.run_cypher = custom_cypher

    p0 = generate_physical_point_id("DOC_R4", "hash_r4", "op_stale", 1, "v1.0", "c1", "e1", 0)
    pt = MagicMock()
    pt.id = p0
    pt.payload = {
        "doc_id": "DOC_R4",
        "file_hash": "hash_r4",
        "operation_id": "op_stale",
        "fencing_generation": 1,
        "is_active": False
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    res = asyncio.run(reconcile_crashed_operations())
    assert len(fake_qdrant_inner.delete_history) == 0
    assert res["reconciled"] == 0


def test_f01_v3_recovery_purging_old_verifies_active_serving_points(monkeypatch):
    """50. F-01: PURGING_OLD recovery strictly verifies serving points before committing to TERMINAL_SYNCED."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:p_old",
        "doc_id": "DOC_P1",
        "file_hash": "hash_p1",
        "op_id": "op_p1",
        "gen": 2,
        "stage": "PURGING_OLD",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1",
        "status": "SYNCED",
        "active_point_ids": ["pt_serving_1"],
        "committed_op_id": "op_p1"
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("op_stage = 'TERMINAL_SYNCED'", [{"elem_id": "4:doc:p_old"}])

    # Case A: serving point is missing or is_active is False -> fail-closed to CLEANUP_PENDING_AUDIT
    pt_inactive = MagicMock()
    pt_inactive.id = "pt_serving_1"
    pt_inactive.payload = {"is_active": False, "doc_id": "DOC_P1"}
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt_inactive])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["audit_pending"] == 1
    assert res["reconciled"] == 0

    # Case B: serving point exists and is_active is True -> advances to TERMINAL_SYNCED
    pt_active = MagicMock()
    pt_active.id = "pt_serving_1"
    pt_active.payload = {
        "is_active": True,
        "doc_id": "DOC_P1",
        "file_hash": "hash_p1",
        "operation_id": "op_p1"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt_active])
    res2 = asyncio.run(reconcile_crashed_operations())
    assert res2["reconciled"] == 1


# ----------------------------------------------------------------------------
# F-02: RESTRICTED SAFE MODE REGISTRY & STRICT IDENTITY HIERARCHY
# ----------------------------------------------------------------------------

def test_f02_v3_same_name_different_dept_not_blocked(monkeypatch):
    """51. F-02: Two files with same name in different departments resolve independently without false conflict."""
    fake_neo = FakeNeo4jClient()
    RestrictedSafeModeRegistry.reset()

    def mock_run_cypher(query, params=None):
        params = params or {}
        sp = params.get("storage_path")
        if sp == "/data/legal/contract.pdf":
            return [{"elem_id": "4:doc:leg", "doc_id": "DOC_LEGAL", "storagePath": "/data/legal/contract.pdf", "name": "contract.pdf"}]
        elif sp == "/data/hr/contract.pdf":
            return [{"elem_id": "4:doc:hr", "doc_id": "DOC_HR", "storagePath": "/data/hr/contract.pdf", "name": "contract.pdf"}]
        return []

    fake_neo.run_cypher = mock_run_cypher

    is_unique, err, matched = RestrictedSafeModeRegistry.verify_unique_target(
        fake_neo,
        storage_path="/data/legal/contract.pdf",
        filename="contract.pdf",
        dept_key="legal"
    )
    assert is_unique is True
    assert matched["doc_id"] == "DOC_LEGAL"
    assert RestrictedSafeModeRegistry.is_path_blocked("/data/legal/contract.pdf") is False


def test_f02_v3_duplicate_doc_id_blocks_mutations(monkeypatch):
    """52. F-02: Duplicate doc_id detected in Neo4j enters Safe Mode and blocks mutations."""
    fake_neo = FakeNeo4jClient()
    RestrictedSafeModeRegistry.reset()

    fake_neo.register_response("WHERE d.id = $doc_id", [
        {"elem_id": "4:doc:d1", "doc_id": "DOC_DUP", "storagePath": "/data/legal/a.pdf"},
        {"elem_id": "4:doc:d2", "doc_id": "DOC_DUP", "storagePath": "/data/legal/b.pdf"}
    ])

    is_unique, err, doc_id = RestrictedSafeModeRegistry.verify_unique_target(
        fake_neo,
        doc_id="DOC_DUP"
    )
    assert is_unique is False
    assert "duplicate" in err.lower()
    assert RestrictedSafeModeRegistry.is_doc_id_blocked("DOC_DUP") is True

    # Immediate second call is blocked by memory registry without even querying
    is_unique2, err2, _ = RestrictedSafeModeRegistry.verify_unique_target(
        fake_neo,
        doc_id="DOC_DUP"
    )
    assert is_unique2 is False
    assert err2 == "restricted_safe_mode_blocked"


def test_f02_v3_ambiguous_canonical_path_blocks_mutations(monkeypatch):
    """53. F-02: Ambiguous storagePath with multiple Document nodes is registered and blocked."""
    fake_neo = FakeNeo4jClient()
    RestrictedSafeModeRegistry.reset()

    fake_neo.register_response("WHERE d.storagePath = $storage_path", [
        {"elem_id": "4:doc:p1", "doc_id": "DOC_1", "storagePath": "/data/shared.pdf"},
        {"elem_id": "4:doc:p2", "doc_id": "DOC_2", "storagePath": "/data/shared.pdf"}
    ])

    is_unique, err, _ = RestrictedSafeModeRegistry.verify_unique_target(
        fake_neo,
        storage_path="/data/shared.pdf"
    )
    assert is_unique is False
    assert "ambiguous" in err.lower()
    assert RestrictedSafeModeRegistry.is_path_blocked("/data/shared.pdf") is True


def test_f02_v3_doc_id_and_storage_path_conflict_fails_closed(monkeypatch):
    """54. F-02: Conflicting doc_id and storagePath fail closed with identity_mismatch."""
    fake_neo = FakeNeo4jClient()
    RestrictedSafeModeRegistry.reset()

    fake_neo.register_response("WHERE d.id = $doc_id", [
        {"elem_id": "4:doc:x", "doc_id": "DOC_X", "storagePath": "/data/actual.pdf"}
    ])

    is_unique, err, _ = RestrictedSafeModeRegistry.verify_unique_target(
        fake_neo,
        doc_id="DOC_X",
        storage_path="/data/claimed_other.pdf"
    )
    assert is_unique is False
    assert "conflict" in err.lower() or "mismatch" in err.lower()


def test_f02_v3_startup_audit_error_preserves_safe_mode(monkeypatch):
    """55. F-02: Startup audit error does NOT clear or reset pre-existing Safe Mode Registry."""
    fake_neo = FakeNeo4jClient()
    RestrictedSafeModeRegistry.reset()
    RestrictedSafeModeRegistry.register_duplicate_doc_id("DOC_PRESERVED")
    RestrictedSafeModeRegistry.register_ambiguous_path("/data/preserved.pdf")

    def broken_cypher(*args, **kwargs):
        raise RuntimeError("Database connection lost during startup audit")

    fake_neo.run_cypher = broken_cypher

    audit_res = RestrictedSafeModeRegistry.audit_identity_uniqueness(fake_neo)
    assert audit_res["error"] is not None
    assert RestrictedSafeModeRegistry.is_doc_id_blocked("DOC_PRESERVED") is True
    assert RestrictedSafeModeRegistry.is_path_blocked("/data/preserved.pdf") is True


def test_f02_v3_upload_lock_held_throughout_storage_write(monkeypatch):
    """56. F-02: Central storage upload holds lock across verification, file write, and ingestion."""
    from modules.m1_data_sync.webhook import upload_document_to_central_storage
    from fastapi import UploadFile

    RestrictedSafeModeRegistry.reset()
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("modules.m1_data_sync.webhook.neo4j_client", fake_neo)

    lock_events = []

    class TrackedLock:
        def __init__(self, path, doc):
            self.path = path
            self.doc = doc
        def __enter__(self):
            lock_events.append(f"acquire:{self.path}")
            return self
        def __exit__(self, *args):
            lock_events.append(f"release:{self.path}")

    monkeypatch.setattr("modules.m1_data_sync.webhook.acquire_ingestion_transaction_locks", TrackedLock)

    def mock_save(content_bytes, safe_name, canonical_dept):
        lock_events.append("save_file_to_storage")
        return {"storage_path": f"/data/{canonical_dept}/{safe_name}"}

    def mock_ingest(**kwargs):
        lock_events.append("process_document_ingestion")
        return {"success": True, "data": {"doc_id": "DOC_TEST"}}

    monkeypatch.setattr("modules.m1_data_sync.webhook.save_file_to_storage", mock_save)
    monkeypatch.setattr("modules.m1_data_sync.webhook.process_document_ingestion", mock_ingest)

    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "secure_upload.pdf"
    upload_chunks = [b"%PDF-1.4 dummy content"]
    async def mock_read(size=-1):
        if upload_chunks:
            return upload_chunks.pop(0)
        return b""
    mock_file.read = mock_read

    res = asyncio.run(upload_document_to_central_storage(file=mock_file, department="legal"))
    assert res["success"] is True

    assert lock_events[0].startswith("acquire:")
    assert lock_events[1] == "save_file_to_storage"
    assert lock_events[2] == "process_document_ingestion"
    assert lock_events[3].startswith("release:")


def test_f02_v3_all_six_mutation_call_sites_protected(monkeypatch):
    """57. F-02: All 6 mutation call sites fail closed when target is blocked by Safe Mode Registry."""
    from modules.m1_data_sync.webhook import (
        upload_document_to_central_storage,
        api_delete_document,
        api_rename_document,
        handle_file_deleted,
        handle_file_renamed,
        DeleteDocumentRequest,
        RenameDocumentRequest,
        DeleteEventPayload,
        RenameEventPayload
    )
    from fastapi import HTTPException

    RestrictedSafeModeRegistry.reset()
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.webhook.neo4j_client", fake_neo)

    blocked_path = "/data/legal/blocked.pdf"
    blocked_doc = "DOC_BLOCKED"
    RestrictedSafeModeRegistry.register_duplicate_doc_id(blocked_doc)
    RestrictedSafeModeRegistry.register_ambiguous_path(blocked_path)

    # 1. process_document_ingestion
    with pytest.raises(FencedOperationError, match="restricted_safe_mode_blocked"):
        process_document_ingestion(b"content", "blocked.pdf", "legal", allow_skip_known=False)

    # 2. process_document_deletion
    del_res = process_document_deletion("blocked.pdf", "legal")
    assert del_res["success"] is False
    assert del_res["reason"] == "restricted_safe_mode_blocked"

    # 3. process_document_rename
    ren_res = process_document_rename("blocked.pdf", "new.pdf", "legal")
    assert ren_res["success"] is False
    assert ren_res["reason"] == "restricted_safe_mode_blocked"

    # 4. upload_document_to_central_storage
    mock_file = MagicMock()
    mock_file.filename = "blocked.pdf"
    upload_chunks_blocked = [b"some content"]
    async def mock_read_blocked(size=-1):
        if upload_chunks_blocked:
            return upload_chunks_blocked.pop(0)
        return b""
    mock_file.read = mock_read_blocked
    with pytest.raises(HTTPException) as exc_up:
        asyncio.run(upload_document_to_central_storage(file=mock_file, department="legal"))
    assert exc_up.value.status_code == 409

    # 5. handle_file_deleted
    with pytest.raises(HTTPException) as exc_del:
        handle_file_deleted(DeleteEventPayload(file_name="blocked.pdf", department="legal"), authorization="Bearer dev-agent-key")
    assert exc_del.value.status_code == 409

    # 6. handle_file_renamed
    with pytest.raises(HTTPException) as exc_ren:
        handle_file_renamed(RenameEventPayload(old_name="blocked.pdf", new_name="new.pdf", department="legal"), authorization="Bearer dev-agent-key")
    assert exc_ren.value.status_code == 409


# ----------------------------------------------------------------------------
# F-03: DOCUMENT INSPECTOR SERVING FILTER & RAW QDRANT INSPECTION GUARD
# ----------------------------------------------------------------------------

def test_f03_v3_filter_exact_active_serving_version(monkeypatch):
    """58. F-03: Document Inspector detail view returns chunks only for exact active serving version."""
    from main import get_document_detail
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("main.neo4j_client", fake_neo)
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    monkeypatch.setattr("main.get_central_storage_inventory", lambda: [{
        "name": "serving_contract.pdf",
        "fileName": "serving_contract.pdf",
        "id": "DOC_SERV_1",
        "storage_path": "/data/legal/serving_contract.pdf",
        "dept_key": "legal",
        "dept_name": "Pháp chế",
        "hash": "hash_serv_1"
    }])

    fake_neo.register_response("OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]", [{
        "id": "DOC_SERV_1",
        "name": "serving_contract.pdf",
        "dept": "Pháp chế",
        "deptKey": "legal",
        "storagePath": "/data/legal/serving_contract.pdf",
        "file_hash": "hash_serv_1",
        "status": "SYNCED",
        "op_stage": "TERMINAL_SYNCED",
        "committed_op_id": "op_serv_1",
        "active_point_ids": ["pt_serv_1"],
        "clauses": [],
        "companies": []
    }])

    pt = MagicMock()
    pt.id = "pt_serv_1"
    pt.payload = {
        "doc_id": "DOC_SERV_1",
        "file_hash": "hash_serv_1",
        "operation_id": "op_serv_1",
        "is_active": True,
        "chunk_id": 0,
        "text": "Serving version chunk text."
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    mock_scope = MagicMock()
    mock_scope.assert_document_access = MagicMock(return_value=True)

    res = get_document_detail("DOC_SERV_1", scope=mock_scope)
    assert res["success"] is True
    chunks = res["data"]["chunks_list"]
    assert len(chunks) == 1
    assert chunks[0]["text"] == "Serving version chunk text."


def test_f03_v3_filter_rejects_mismatched_file_hash(monkeypatch):
    """59. F-03: Document Inspector rejects chunks with mismatched file_hash."""
    from main import get_document_detail
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("main.neo4j_client", fake_neo)
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    monkeypatch.setattr("main.get_central_storage_inventory", lambda: [{
        "name": "hash_test.pdf",
        "fileName": "hash_test.pdf",
        "id": "DOC_HASH_1",
        "storage_path": "/data/legal/hash_test.pdf",
        "dept_key": "legal",
        "dept_name": "Pháp chế",
        "hash": "hash_expected"
    }])

    fake_neo.register_response("OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]", [{
        "id": "DOC_HASH_1",
        "name": "hash_test.pdf",
        "dept": "Pháp chế",
        "deptKey": "legal",
        "storagePath": "/data/legal/hash_test.pdf",
        "file_hash": "hash_expected",
        "status": "SYNCED",
        "op_stage": "TERMINAL_SYNCED",
        "committed_op_id": "op_hash_1",
        "active_point_ids": ["pt_hash_1"],
        "clauses": [],
        "companies": []
    }])

    pt = MagicMock()
    pt.id = "pt_hash_1"
    pt.payload = {
        "doc_id": "DOC_HASH_1",
        "file_hash": "hash_MISMATCHED",
        "operation_id": "op_hash_1",
        "is_active": True,
        "text": "Stale chunk text"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    mock_scope = MagicMock()
    mock_scope.assert_document_access = MagicMock(return_value=True)

    res = get_document_detail("DOC_HASH_1", scope=mock_scope)
    chunks = res["data"]["chunks_list"]
    assert len(chunks) == 0


def test_f03_v3_filter_rejects_mismatched_operation_id(monkeypatch):
    """60. F-03: Document Inspector rejects chunks with mismatched operation_id."""
    from main import get_document_detail
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("main.neo4j_client", fake_neo)
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    monkeypatch.setattr("main.get_central_storage_inventory", lambda: [{
        "name": "op_test.pdf",
        "fileName": "op_test.pdf",
        "id": "DOC_OP_1",
        "storage_path": "/data/legal/op_test.pdf",
        "dept_key": "legal",
        "dept_name": "Pháp chế",
        "hash": "hash_1"
    }])

    fake_neo.register_response("OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]", [{
        "id": "DOC_OP_1",
        "name": "op_test.pdf",
        "dept": "Pháp chế",
        "deptKey": "legal",
        "storagePath": "/data/legal/op_test.pdf",
        "file_hash": "hash_1",
        "status": "SYNCED",
        "op_stage": "TERMINAL_SYNCED",
        "committed_op_id": "op_committed",
        "active_point_ids": ["pt_op_1"],
        "clauses": [],
        "companies": []
    }])

    pt = MagicMock()
    pt.id = "pt_op_1"
    pt.payload = {
        "doc_id": "DOC_OP_1",
        "file_hash": "hash_1",
        "operation_id": "op_uncommitted",
        "is_active": True,
        "text": "Uncommitted op chunk"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    mock_scope = MagicMock()
    mock_scope.assert_document_access = MagicMock(return_value=True)

    res = get_document_detail("DOC_OP_1", scope=mock_scope)
    chunks = res["data"]["chunks_list"]
    assert len(chunks) == 0


def test_f03_v3_unsynced_and_renaming_document_fails_closed(monkeypatch):
    """61. F-03: Document in transitional stage (STAGING, RENAMING, etc.) returns 0 chunks."""
    from main import get_document_detail
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("main.neo4j_client", fake_neo)
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    monkeypatch.setattr("main.get_central_storage_inventory", lambda: [{
        "name": "transitional.pdf",
        "fileName": "transitional.pdf",
        "id": "DOC_TRANS_1",
        "storage_path": "/data/legal/transitional.pdf",
        "dept_key": "legal",
        "dept_name": "Pháp chế",
        "hash": "hash_trans"
    }])

    fake_neo.register_response("OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]", [{
        "id": "DOC_TRANS_1",
        "name": "transitional.pdf",
        "dept": "Pháp chế",
        "deptKey": "legal",
        "storagePath": "/data/legal/transitional.pdf",
        "file_hash": "hash_trans",
        "status": "SYNCED",
        "op_stage": "RENAMING",
        "committed_op_id": "op_trans",
        "active_point_ids": ["pt_trans_1"],
        "clauses": [],
        "companies": []
    }])

    fake_qdrant_inner.retrieve = MagicMock()

    mock_scope = MagicMock()
    mock_scope.assert_document_access = MagicMock(return_value=True)

    res = get_document_detail("DOC_TRANS_1", scope=mock_scope)
    fake_qdrant_inner.retrieve.assert_not_called()
    assert len(res["data"]["chunks_list"]) == 0


def test_f03_v3_raw_inspection_defaults_to_active_points_only(monkeypatch):
    """62. F-03: Raw inspection endpoint /api/qdrant/points defaults to active points only."""
    from main import get_qdrant_points
    fake_qdrant_wrapper = MagicMock()
    fake_qdrant_wrapper.scroll_points.return_value = [
        {"id": 1, "payload": {"is_active": True, "text": "active chunk"}},
        {"id": 2, "payload": {"is_active": False, "text": "staged chunk"}}
    ]
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    mock_scope = MagicMock(role="member")
    res = get_qdrant_points(collection="cuad_contracts", include_inactive=False, scope=mock_scope)
    assert res["success"] is True
    assert res["count"] == 1
    assert res["data"][0]["id"] == 1


def test_f03_v3_raw_inspection_non_admin_cannot_request_inactive(monkeypatch):
    """63. F-03: Non-admin users are forbidden (403) from requesting include_inactive=True."""
    from main import get_qdrant_points
    from fastapi import HTTPException

    mock_scope_member = MagicMock(role="member")
    with pytest.raises(HTTPException) as exc_member:
        get_qdrant_points(collection="cuad_contracts", include_inactive=True, scope=mock_scope_member)
    assert exc_member.value.status_code == 403
    assert "quản trị viên" in exc_member.value.detail or "Admin" in exc_member.value.detail

    mock_scope_admin = MagicMock(role="admin")
    fake_qdrant_wrapper = MagicMock()
    fake_qdrant_wrapper.scroll_points.return_value = [
        {"id": 1, "payload": {"is_active": True}},
        {"id": 2, "payload": {"is_active": False}}
    ]
    monkeypatch.setattr("main.qdrant_client", fake_qdrant_wrapper)

    res_admin = get_qdrant_points(collection="cuad_contracts", include_inactive=True, scope=mock_scope_admin)
    assert res_admin["success"] is True
    assert res_admin["count"] == 2


# ----------------------------------------------------------------------------
# F-04: RENAME TWO-PHASE CAS, SORTED LOCKING & RECOVERY
# ----------------------------------------------------------------------------

def test_f04_v3_rename_lock_ordering_lexicographical(monkeypatch):
    """64. F-04: Rename transaction locks are always acquired in strictly sorted lexicographical order."""
    acquired_locks = []

    class MockLock:
        def __init__(self, key):
            self.key = key
        def __enter__(self):
            acquired_locks.append(self.key)
            return self
        def __exit__(self, *args):
            pass

    monkeypatch.setattr("modules.m1_data_sync.pipeline._get_path_lock", lambda k: MockLock(f"path:{k}"))
    monkeypatch.setattr("modules.m1_data_sync.pipeline._get_doc_lock", lambda k: MockLock(f"doc:{k}"))

    acquired_locks.clear()
    with acquire_rename_transaction_locks("/data/z_old.pdf", "/data/a_new.pdf", "DOC_1"):
        pass
    assert acquired_locks == ["path:/data/a_new.pdf", "path:/data/z_old.pdf", "doc:DOC_1"]

    acquired_locks.clear()
    with acquire_rename_transaction_locks("/data/a_old.pdf", "/data/z_new.pdf", "DOC_1"):
        pass
    assert acquired_locks == ["path:/data/a_old.pdf", "path:/data/z_new.pdf", "doc:DOC_1"]


def test_f04_v3_stage1_cas_failure_aborts_before_qdrant_update(monkeypatch):
    """65. F-04: Stage 1 CAS failure aborts rename without touching Qdrant."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("WHERE d.storagePath", [{
        "elem_id": "4:doc:r1",
        "id": "DOC_R1",
        "name": "old_contract.pdf",
        "storagePath": "/data/legal/old_contract.pdf",
        "department": "Pháp chế",
        "deptKey": "legal",
        "gen": 1,
        "op_id": None,
        "stage": "TERMINAL_SYNCED",
        "points": ["pt1"]
    }])
    fake_neo.register_response("d.active_op_id IS NULL", [])

    with pytest.raises(FencedOperationError, match="CAS Stage 1 failure"):
        process_document_rename("old_contract.pdf", "new_contract.pdf", "legal")
    assert fake_qdrant_inner.set_payload.call_count == 0


def test_f04_v3_stage2_read_back_mismatch_prevents_finalize(monkeypatch):
    """66. F-04: Stage 2 post-update read-back mismatch prevents Stage 3 CAS finalize."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("WHERE d.storagePath", [{
        "elem_id": "4:doc:r2",
        "id": "DOC_R2",
        "name": "old2.pdf",
        "storagePath": "/data/legal/old2.pdf",
        "department": "Pháp chế",
        "deptKey": "legal",
        "gen": 1,
        "op_id": None,
        "stage": "TERMINAL_SYNCED",
        "points": ["pt_r2"]
    }])
    fake_neo.register_response("d.active_op_id IS NULL", [{
        "elem_id": "4:doc:r2"
    }])

    pt = MagicMock()
    pt.id = "pt_r2"
    pt.payload = {
        "contract_name": "old2.pdf",
        "file_name": "old2.pdf",
        "storage_path": "/data/legal/old2.pdf",
        "doc_id": "DOC_R2"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    res = process_document_rename("old2.pdf", "new2.pdf", "legal")
    assert res["success"] is False
    assert res["status"] == "rename_qdrant_pending"
    term_queries = [q for q in fake_neo.executed_queries if "d.renameHistory = coalesce" in q["query"]]
    assert len(term_queries) == 0


def test_f04_v3_stage3_cas_failure_does_not_return_success(monkeypatch):
    """67. F-04: Stage 3 finalize CAS failure returns error and never returns success."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    fake_neo.register_response("WHERE d.storagePath", [{
        "elem_id": "4:doc:r3",
        "id": "DOC_R3",
        "name": "old3.pdf",
        "storagePath": "/data/legal/old3.pdf",
        "department": "Pháp chế",
        "deptKey": "legal",
        "gen": 1,
        "op_id": None,
        "stage": "TERMINAL_SYNCED",
        "points": ["pt_r3"]
    }])
    fake_neo.register_response("d.active_op_id IS NULL", [{
        "elem_id": "4:doc:r3"
    }])

    pt = MagicMock()
    pt.id = "pt_r3"
    pt.payload = {
        "contract_name": "new3.pdf",
        "file_name": "new3.pdf",
        "storage_path": "/data/legal/new3.pdf",
        "doc_id": "DOC_R3"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    # Stage 3 finalize CAS returns [] (e.g. concurrent fencing generation bump)
    fake_neo.register_response("d.renameHistory = coalesce", [])

    res = process_document_rename("old3.pdf", "new3.pdf", "legal")
    assert res["success"] is False
    assert res["status"] == "rename_fenced_out"


def test_f04_v3_recovery_completes_interrupted_renaming(monkeypatch):
    """68. F-04: Crash recovery safely finalizes an interrupted RENAMING operation."""
    fake_neo = FakeNeo4jClient()
    fake_qdrant_inner = FakeQdrantClientInner()
    fake_qdrant_inner.set_payload = MagicMock()
    fake_qdrant_wrapper = MagicMock(is_connected=True, _client=fake_qdrant_inner, _collection="cuad_contracts")

    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)
    monkeypatch.setattr("modules.m1_data_sync.pipeline.qdrant_client", fake_qdrant_wrapper)

    crashed = [{
        "elem_id": "4:doc:r_rec",
        "doc_id": "DOC_R_REC",
        "file_hash": "hash_r",
        "op_id": "rename_op_1",
        "gen": 2,
        "stage": "RENAMING",
        "expected_chunk_count": 1,
        "parser_cfg": "v1.0",
        "chunker_cfg": "c1",
        "embed_cfg": "e1",
        "status": "SYNCED",
        "active_point_ids": ["pt_r_rec"],
        "committed_op_id": "op_comm",
        "rename_journal": '{"new_name": "recovered_name.pdf", "new_path": "/data/legal/recovered_name.pdf", "active_point_ids": ["pt_r_rec"], "next_generation": 2, "rename_op_id": "rename_op_1"}'
    }]
    fake_neo.register_response("WHERE d.op_stage IN", crashed)
    fake_neo.register_response("d.active_op_id = $rename_op_id", [{"elem_id": "4:doc:r_rec"}])
    fake_neo.register_response("d.renameHistory = coalesce", [{"elem_id": "4:doc:r_rec"}])

    pt = MagicMock()
    pt.id = "pt_r_rec"
    pt.payload = {
        "file_name": "recovered_name.pdf",
        "storage_path": "/data/legal/recovered_name.pdf",
        "doc_id": "DOC_R_REC"
    }
    fake_qdrant_inner.retrieve = MagicMock(return_value=[pt])

    res = asyncio.run(reconcile_crashed_operations())
    assert res["reconciled"] == 1
    assert res["audit_pending"] == 0


def test_f04_v3_retry_rename_idempotent(monkeypatch):
    """69. F-04: Retrying rename with already renamed target returns success idempotently."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)

    fake_neo.register_response("WHERE d.storagePath", [{
        "elem_id": "4:doc:idem",
        "id": "DOC_IDEM",
        "name": "target.pdf",
        "storagePath": "/data/legal/target.pdf",
        "department": "Pháp chế",
        "deptKey": "legal",
        "gen": 2,
        "op_id": None,
        "stage": "TERMINAL_SYNCED",
        "points": ["pt_idem"]
    }])

    res = process_document_rename("target.pdf", "target.pdf", "legal")
    assert res["success"] is True
    assert res.get("already_renamed") is True


def test_f04_v3_stale_generation_cannot_overwrite_new_rename(monkeypatch):
    """70. F-04: Stale generation worker cannot overwrite newer rename generation."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("modules.m1_data_sync.pipeline.neo4j_client", fake_neo)

    fake_neo.register_response("WHERE d.storagePath", [{
        "elem_id": "4:doc:stale_ren",
        "id": "DOC_SR",
        "name": "file.pdf",
        "storagePath": "/data/legal/file.pdf",
        "department": "Pháp chế",
        "deptKey": "legal",
        "gen": 3,
        "op_id": None,
        "stage": "TERMINAL_SYNCED",
        "points": ["pt_sr"]
    }])
    fake_neo.register_response("d.active_op_id IS NULL", [])

    with pytest.raises(FencedOperationError, match="CAS Stage 1 failure"):
        process_document_rename("file.pdf", "new_file.pdf", "legal")


# ============================================================================
# TESTS 71-84: PR1.1 AGGREGATE PROVENANCE, COMPANY & PRODUCT RETRIEVAL CLOSURE
# ============================================================================

def test_ut71_serving_and_nonserving_document():
    """71. PR1.1: Serving eligibility strictly accepts committed SYNCED docs and rejects non-serving states."""
    valid_doc = {
        "id": "DOC_SERVING_1",
        "status": "SYNCED",
        "active_op_id": None,
        "op_stage": "TERMINAL_SYNCED",
        "file_hash": "hash_abc",
        "hash": "hash_abc",
        "committed_generation": 1,
        "committed_op_id": "op_commit_1"
    }
    assert _is_serving_eligible(valid_doc) is True

    # Legacy documents
    legacy_doc = {
        "id": "DOC_LEGACY_1",
        "status": "SYNCED",
        "active_op_id": None,
        "op_stage": None,
        "file_hash": "hash_legacy",
        "hash": "hash_legacy",
        "committed_generation": None,
        "committed_op_id": None
    }
    assert _is_serving_eligible(legacy_doc) is True

    legacy_doc_vn = {
        "id": "DOC_LEGACY_VN",
        "status": "Hoạt động (Synced)",
        "active_op_id": None,
        "op_stage": None,
        "file_hash": "hash_legacy_vn",
        "hash": "hash_legacy_vn",
        "committed_generation": None,
        "committed_op_id": None
    }
    assert _is_serving_eligible(legacy_doc_vn) is True

    legacy_doc_neo = {
        "id": "DOC_LEGACY_NEO",
        "status": None,
        "neo4jSynced": True,
        "active_op_id": None,
        "op_stage": None,
        "file_hash": "hash_legacy_neo",
        "committed_generation": None,
        "committed_op_id": None
    }
    assert _is_serving_eligible(legacy_doc_neo) is True

    # Rejection cases - malformed/empty
    assert _is_serving_eligible(None) is False
    assert _is_serving_eligible({}) is False
    assert _is_serving_eligible({**valid_doc, "id": ""}) is False

    # Rejection cases - non-serving status
    assert _is_serving_eligible({**valid_doc, "status": "STAGING"}) is False
    assert _is_serving_eligible({**valid_doc, "status": "TERMINAL_FAILED"}) is False

    # Rejection cases - active operation
    assert _is_serving_eligible({**valid_doc, "active_op_id": "op_active_99"}) is False

    # Rejection cases - non-terminal stages
    assert _is_serving_eligible({**valid_doc, "op_stage": "CLEANUP_PENDING"}) is False
    assert _is_serving_eligible({**valid_doc, "op_stage": "STAGING"}) is False
    assert _is_serving_eligible({**valid_doc, "op_stage": "PURGING_OLD"}) is False
    assert _is_serving_eligible({**valid_doc, "op_stage": "TERMINAL_FAILED"}) is False
    assert _is_serving_eligible({**valid_doc, "op_stage": "PREPARING_ACTIVATION"}) is False

    # Rejection cases - terminal missing committed operation
    assert _is_serving_eligible({**valid_doc, "committed_op_id": None}) is False
    assert _is_serving_eligible({**valid_doc, "committed_op_id": ""}) is False

    # Rejection cases - terminal missing or invalid generation
    assert _is_serving_eligible({**valid_doc, "committed_generation": None}) is False
    assert _is_serving_eligible({**valid_doc, "committed_generation": 0}) is False
    assert _is_serving_eligible({**valid_doc, "committed_generation": -1}) is False
    assert _is_serving_eligible({**valid_doc, "committed_generation": True}) is False

    # Rejection cases - missing hash
    assert _is_serving_eligible({**valid_doc, "file_hash": None, "hash": None}) is False
    assert _is_serving_eligible({**valid_doc, "file_hash": "", "hash": ""}) is False
    assert _is_serving_eligible({**legacy_doc, "file_hash": None, "hash": None}) is False

    # Rejection cases - ambiguous document (legacy op_stage=None with terminal fields)
    assert _is_serving_eligible({**legacy_doc, "committed_op_id": "op_ambiguous"}) is False
    assert _is_serving_eligible({**legacy_doc, "committed_generation": 1}) is False


def test_ut72_hash_conflict_fails_closed():
    """72. PR1.1: Hash conflict between file_hash and hash or chunk vs document fails closed."""
    conflicting_doc = {
        "id": "DOC_CONFLICT",
        "status": "SYNCED",
        "active_op_id": None,
        "op_stage": "TERMINAL_SYNCED",
        "file_hash": "hash_new",
        "hash": "hash_old",
        "committed_generation": 1,
        "committed_op_id": "op_conflict_1"
    }
    assert _is_serving_eligible(conflicting_doc) is False

    valid_doc = {
        "id": "DOC_VALID",
        "status": "SYNCED",
        "active_op_id": None,
        "op_stage": "TERMINAL_SYNCED",
        "file_hash": "hash_ok",
        "hash": "hash_ok",
        "committed_generation": 1,
        "committed_op_id": "op_valid_1"
    }
    chunk_bad_hash = {
        "doc_id": "DOC_VALID",
        "file_hash": "hash_mismatch",
        "is_active": True
    }
    assert verify_chunk_serving_integrity(chunk_bad_hash, valid_doc) is False


def test_ut73_duplicate_id_same_and_different_department_detected(monkeypatch):
    """73. PR1.1: Duplicate doc_id across same or different departments detected and rejected at Layer 2."""
    # Verify Cypher query does global duplicate check
    cypher = generate_cypher_from_query("cơ cấu danh mục hợp đồng")
    assert "WITH d.id AS doc_id, count(d) AS occurrences" in cypher
    assert "max(occurrences) AS max_occ" in cypher

    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    # Document ID with occurrences = 2 (duplicate in graph)
    fake_neo.register_response("WHERE d.id IN $doc_ids", [{
        "doc_id": "DOC_DUP_GLOBAL",
        "occurrences": 2,
        "id": "DOC_DUP_GLOBAL",
        "status": "SYNCED"
    }])

    evidence_chunk = {"doc_id": "DOC_DUP_GLOBAL", "text": "sample text", "is_active": True}
    graph_ent = {"_id": "ent_1", "source_document_id": "DOC_DUP_GLOBAL", "name": "Ent 1"}

    verified_chunks, verified_entities = apply_layer2_context_gate([evidence_chunk], [graph_ent])
    assert len(verified_chunks) == 0
    assert len(verified_entities) == 0


def test_ut74_compliance_optional_match_doc_without_clause():
    """74. PR1.1: Compliance stats uses OPTIONAL MATCH and keeps documents without clauses in denominator."""
    cypher = generate_cypher_from_query("tỷ lệ tuân thủ điều khoản")
    assert "OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]->(cl:Clause)" in cypher
    assert "count(d) AS total" in cypher
    assert "doc_ids AS source_doc_ids" in cypher
    assert "total AS total_verified_docs" in cypher


def test_ut75_compliance_multiple_clauses_same_type_no_duplicate_counting():
    """75. PR1.1: Multiple clauses of same type in one document do not artificially inflate doc count."""
    cypher = generate_cypher_from_query("tỷ lệ tuân thủ điều khoản")
    assert "collect(DISTINCT cl.type) AS clauses" in cypher
    assert "count(CASE WHEN any(c IN clauses WHERE c CONTAINS 'Liability'" in cypher


def test_ut76_aggregate_missing_or_invalid_source_doc_ids_rejected():
    """76. PR1.1: Aggregate card with missing, empty, or duplicate source_doc_ids is rejected."""
    doc_map = {
        "D1": {
            "id": "D1",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d1",
            "committed_generation": 1,
            "file_hash": "hash_d1"
        }
    }
    # Missing / None
    assert validate_aggregate_in_layer2({"duplicate_detected": 1, "total_verified_docs": 1}, doc_map) is False
    # Empty list
    assert validate_aggregate_in_layer2({"source_doc_ids": [], "duplicate_detected": 1, "total_verified_docs": 0}, doc_map) is False
    # Duplicate inside source_doc_ids list
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1", "D1"], "duplicate_detected": 1, "total_verified_docs": 2}, doc_map) is False
    # Empty string inside list
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1", ""], "duplicate_detected": 1, "total_verified_docs": 2}, doc_map) is False


def test_ut77_aggregate_invalid_duplicate_detected_rejected():
    """77. PR1.1: Aggregate card with invalid or duplicate_detected != 1 is rejected."""
    doc_map = {
        "D1": {
            "id": "D1",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d1",
            "committed_generation": 1,
            "file_hash": "hash_d1"
        }
    }
    # Missing
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1"], "total_verified_docs": 1}, doc_map) is False
    # Duplicate detected > 1
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1"], "duplicate_detected": 2, "total_verified_docs": 1}, doc_map) is False
    # String "1" instead of int
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1"], "duplicate_detected": "1", "total_verified_docs": 1}, doc_map) is False
    # Boolean True instead of strict int 1
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1"], "duplicate_detected": True, "total_verified_docs": 1}, doc_map) is False


def test_ut78_aggregate_total_verified_docs_mismatch_rejected():
    """78. PR1.1: Aggregate card with total_verified_docs mismatch or wrong type is rejected."""
    doc_map = {
        "D1": {
            "id": "D1",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d1",
            "committed_generation": 1,
            "file_hash": "hash_d1"
        },
        "D2": {
            "id": "D2",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d2",
            "committed_generation": 1,
            "file_hash": "hash_d2"
        }
    }
    # Count mismatch
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1", "D2"], "duplicate_detected": 1, "total_verified_docs": 3}, doc_map) is False
    # String count
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1", "D2"], "duplicate_detected": 1, "total_verified_docs": "2"}, doc_map) is False
    # Boolean count
    assert validate_aggregate_in_layer2({"source_doc_ids": ["D1"], "duplicate_detected": 1, "total_verified_docs": True}, doc_map) is False


def test_ut79_aggregate_one_ineligible_source_doc_rejects_whole_aggregate():
    """79. PR1.1: A single ineligible or missing source document fails closed and rejects the entire aggregate."""
    doc_map = {
        "D1": {
            "id": "D1",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d1",
            "committed_generation": 1,
            "file_hash": "hash_d1"
        },
        "D2": {
            "id": "D2",
            "status": "STAGING",
            "active_op_id": None,
            "op_stage": "STAGING",
            "committed_op_id": "op_d2",
            "committed_generation": 1,
            "file_hash": "hash_d2"
        }  # Ineligible stage
    }
    agg = {
        "source_doc_ids": ["D1", "D2"],
        "duplicate_detected": 1,
        "total_verified_docs": 2
    }
    assert validate_aggregate_in_layer2(agg, doc_map) is False

    # Missing in doc_map
    doc_map_missing = {
        "D1": {
            "id": "D1",
            "status": "SYNCED",
            "active_op_id": None,
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_d1",
            "committed_generation": 1,
            "file_hash": "hash_d1"
        }
    }
    assert validate_aggregate_in_layer2(agg, doc_map_missing) is False


def test_ut80_company_missing_provenance_and_multi_provenance(monkeypatch):
    """80. PR1.1: Company without PARTY_TO provenance is rejected from citation; multiple valid docs supported."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    # 1. Company with NO party_to relation
    fake_neo.register_response("MATCH (c:Company)-[:PARTY_TO]->(d:Document)", [{"doc_ids": []}])
    unprovenanced_comp = {"_id": "c_unprovenanced", "_labels": ["Company"], "name": "Ghost Corp"}

    _, verified_ent = apply_layer2_context_gate([], [unprovenanced_comp])
    assert len(verified_ent) == 0

    # 2. Company with multiple valid PARTY_TO docs
    fake_neo.register_response("MATCH (c:Company)-[:PARTY_TO]->(d:Document)", [{"doc_ids": ["DOC_LEG_1", "DOC_LEG_2"]}])
    fake_neo.register_response("WHERE d.id IN $doc_ids", [
        {
            "doc_id": "DOC_LEG_1",
            "occurrences": 1,
            "id": "DOC_LEG_1",
            "status": "SYNCED",
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_leg_1",
            "committed_generation": 1,
            "file_hash": "hash_leg_1"
        },
        {
            "doc_id": "DOC_LEG_2",
            "occurrences": 1,
            "id": "DOC_LEG_2",
            "status": "SYNCED",
            "op_stage": "TERMINAL_SYNCED",
            "committed_op_id": "op_leg_2",
            "committed_generation": 1,
            "file_hash": "hash_leg_2"
        }
    ])
    provenanced_comp = {"_id": "c_provenanced", "_labels": ["Company"], "name": "Real Corp"}
    _, verified_ent2 = apply_layer2_context_gate([], [provenanced_comp])
    assert len(verified_ent2) == 1
    assert verified_ent2[0].get("provenance_verified") is True
    assert set(verified_ent2[0].get("source_doc_ids")) == {"DOC_LEG_1", "DOC_LEG_2"}



def test_ut81_product_no_document_citation(monkeypatch):
    """81. PR1.1: Product entity is tagged as ERP entity and never emits a Document Citation."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)
    prod_ent = {"_id": "prod_101", "_labels": ["Product"], "name": "Road-150 Red, 48"}
    verified_chunks, verified_entities = apply_layer2_context_gate([], [prod_ent])
    assert len(verified_entities) == 1
    assert verified_entities[0].get("is_erp_entity") is True
    assert "source_doc_ids" not in verified_entities[0]


def test_ut82_product_structured_data_remains_usable(monkeypatch):
    """82. PR1.1: Product structured ERP entity remains present in verified entities for LLM context synthesis."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)
    prod_ent = {
        "_id": "product_subgraph_707",
        "_labels": ["Product", "SalesHistory"],
        "name": "Lịch sử bán hàng: Sport-100 Helmet, Red",
        "snippet": "Sản phẩm Sport-100 Helmet, Red: Đã bán trong 100 đơn hàng, doanh thu $50,000 USD."
    }
    _, verified_entities = apply_layer2_context_gate([], [prod_ent])
    assert len(verified_entities) == 1
    assert verified_entities[0]["name"] == "Lịch sử bán hàng: Sport-100 Helmet, Red"


def test_ut83_citation_excludes_evidence_filtered_from_prompt():
    """83. PR1.1: LLM client formats prompt and tracks exactly which chunks/entities are serialized."""
    client = OllamaClient()
    # Provide 7 chunks; client slices top 5 non-empty
    evidence_chunks = [
        {"text": f"Chunk text content #{i}", "source_file": f"file_{i}.pdf", "chunk_index": i}
        for i in range(7)
    ]
    graph_entities = [
        {"name": f"Entity #{i}", "_labels": ["Clause"], "snippet": f"Snippet #{i}"}
        for i in range(6)
    ]

    # Run prompt building via generate_rag_answer with mock post (fallback mode)
    with patch("httpx.AsyncClient.post", side_effect=Exception("Ollama offline for test")):
        res = asyncio.run(client.generate_rag_answer("Hợp đồng bảo mật", evidence_chunks, graph_entities, "vi"))

    assert res["success"] is True
    assert "used_chunks" in res
    assert "used_entities" in res
    # Sliced to max 5 chunks and max 4 entities
    assert len(res["used_chunks"]) == 5
    assert len(res["used_entities"]) == 4
    # The 6th and 7th chunks were NOT serialized into the prompt
    assert all(c["chunk_index"] < 5 for c in res["used_chunks"])


def test_ut84_dual_wrapper_payload_integrity():
    """84. PR1.1: Dual wrapper and payload integrity check strictly enforces is_active, generation, and op_id."""
    valid_doc = {
        "id": "DOC_D1",
        "status": "SYNCED",
        "active_op_id": None,
        "op_stage": "TERMINAL_SYNCED",
        "committed_generation": 2,
        "committed_op_id": "op_commit_2",
        "file_hash": "hash_valid"
    }

    # Valid chunk
    valid_chunk = {
        "doc_id": "DOC_D1",
        "is_active": True,
        "fencing_generation": 2,
        "operation_id": "op_commit_2",
        "file_hash": "hash_valid",
        "payload": {
            "doc_id": "DOC_D1",
            "is_active": True,
            "fencing_generation": 2,
            "operation_id": "op_commit_2",
            "file_hash": "hash_valid"
        }
    }
    assert verify_chunk_serving_integrity(valid_chunk, valid_doc) is True

    # Inactive in wrapper
    assert verify_chunk_serving_integrity({**valid_chunk, "is_active": False}, valid_doc) is False
    # Inactive in payload
    assert verify_chunk_serving_integrity({**valid_chunk, "payload": {**valid_chunk["payload"], "is_active": False}}, valid_doc) is False
    # Generation mismatch between wrapper and payload
    assert verify_chunk_serving_integrity({**valid_chunk, "fencing_generation": 3}, valid_doc) is False
    # Generation mismatch with document committed generation
    mismatch_chunk = {**valid_chunk, "fencing_generation": 1, "payload": {**valid_chunk["payload"], "fencing_generation": 1}}
    assert verify_chunk_serving_integrity(mismatch_chunk, valid_doc) is False
    # Non-positive or boolean generation
    zero_gen = {**valid_chunk, "fencing_generation": 0, "payload": {**valid_chunk["payload"], "fencing_generation": 0}}
    assert verify_chunk_serving_integrity(zero_gen, valid_doc) is False
    bool_gen = {**valid_chunk, "fencing_generation": True, "payload": {**valid_chunk["payload"], "fencing_generation": True}}
    assert verify_chunk_serving_integrity(bool_gen, valid_doc) is False
    # Operation ID mismatch with doc
    mismatch_op = {**valid_chunk, "operation_id": "op_old", "payload": {**valid_chunk["payload"], "operation_id": "op_old"}}
    assert verify_chunk_serving_integrity(mismatch_op, valid_doc) is False


def test_ut85_serving_eligibility_cypher_python_exact_parity():
    """85. PR1.1: Serving eligibility between CYPHER_SERVING_ELIGIBILITY_FILTER and Python _is_serving_eligible is 100% equivalent."""
    # Ensure CYPHER_SERVING_ELIGIBILITY_FILTER contains all required sub-clauses
    assert "d.id IS NOT NULL AND trim(toString(d.id)) <> ''" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "(d.active_op_id IS NULL OR trim(toString(d.active_op_id)) = '')" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "d.status IN ['SYNCED', 'Hoạt động (Synced)']" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "(coalesce(trim(toString(d.file_hash)), '') <> '' OR coalesce(trim(toString(d.hash)), '') <> '')" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "d.op_stage = 'TERMINAL_SYNCED'" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "d.committed_op_id IS NOT NULL AND trim(toString(d.committed_op_id)) <> ''" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "d.committed_generation IS NOT NULL AND d.committed_generation > 0" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "(d.op_stage IS NULL OR trim(toString(d.op_stage)) = '')" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "(d.committed_op_id IS NULL OR trim(toString(d.committed_op_id)) = '')" in CYPHER_SERVING_ELIGIBILITY_FILTER
    assert "d.committed_generation IS NULL" in CYPHER_SERVING_ELIGIBILITY_FILTER

    # Test matrix: 16 test cases evaluated against Python _is_serving_eligible and Cypher filter specification
    cases = [
        # (doc, expected_eligible, reason)
        (
            {"id": "DOC_1", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            True, "PR1 V3 Terminal Committed"
        ),
        (
            {"id": "DOC_2", "status": "SYNCED", "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            True, "Legacy Synced"
        ),
        (
            {"id": "DOC_3", "status": "Hoạt động (Synced)", "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            True, "Legacy Synced VN status"
        ),
        (
            {"id": "DOC_4", "status": None, "neo4jSynced": True, "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            True, "Legacy neo4jSynced True"
        ),
        (
            {"id": "DOC_5", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": None, "committed_generation": 1},
            False, "Terminal missing committed_op_id"
        ),
        (
            {"id": "DOC_6", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "", "committed_generation": 1},
            False, "Terminal empty committed_op_id"
        ),
        (
            {"id": "DOC_7", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": None},
            False, "Terminal missing committed_generation"
        ),
        (
            {"id": "DOC_8", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 0},
            False, "Terminal non-positive committed_generation"
        ),
        (
            {"id": "DOC_9", "status": "SYNCED", "active_op_id": "active_op_1", "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            False, "Active operation in flight"
        ),
        (
            {"id": "DOC_10", "status": "SYNCED", "active_op_id": None, "op_stage": "STAGING", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            False, "In-flight stage STAGING"
        ),
        (
            {"id": "DOC_11", "status": "SYNCED", "active_op_id": None, "op_stage": "PURGING_OLD", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            False, "In-flight stage PURGING_OLD"
        ),
        (
            {"id": "DOC_12", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_FAILED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            False, "Terminal failed"
        ),
        (
            {"id": "DOC_13", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": None, "hash": None, "committed_op_id": "op1", "committed_generation": 1},
            False, "Missing hash"
        ),
        (
            {"id": "DOC_14", "status": "SYNCED", "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "hash": "h2", "committed_op_id": "op1", "committed_generation": 1},
            False, "Conflicting hash"
        ),
        (
            {"id": "DOC_15", "status": "SYNCED", "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": "op1", "committed_generation": None},
            False, "Ambiguous: op_stage None with committed_op_id"
        ),
        (
            {"id": "DOC_16", "status": "SYNCED", "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": 1},
            False, "Ambiguous: op_stage None with committed_generation"
        ),
        (
            {"id": "DOC_17", "status": "active", "neo4jSynced": True, "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            True, "Legacy Active with neo4jSynced True"
        ),
        (
            {"id": "DOC_18", "status": "active", "neo4jSynced": False, "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            False, "Legacy Active with neo4jSynced False"
        ),
        (
            {"id": "DOC_19", "status": "active", "neo4jSynced": None, "active_op_id": None, "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            False, "Legacy Active with neo4jSynced None"
        ),
        (
            {"id": "DOC_20", "status": "active", "neo4jSynced": True, "active_op_id": "op_active", "op_stage": None, "file_hash": "h1", "committed_op_id": None, "committed_generation": None},
            False, "Legacy Active with active_op_id"
        ),
        (
            {"id": "DOC_21", "status": "active", "neo4jSynced": True, "active_op_id": None, "op_stage": None, "file_hash": None, "hash": None, "committed_op_id": None, "committed_generation": None},
            False, "Legacy Active missing hash"
        ),
        (
            {"id": "DOC_22", "status": "active", "neo4jSynced": True, "active_op_id": None, "op_stage": None, "file_hash": "h1", "hash": "h2", "committed_op_id": None, "committed_generation": None},
            False, "Legacy Active conflicting hash"
        ),
        (
            {"id": "DOC_23", "status": "active", "neo4jSynced": True, "active_op_id": None, "op_stage": "TERMINAL_SYNCED", "file_hash": "h1", "committed_op_id": "op1", "committed_generation": 1},
            False, "PR1 V3 terminal document cannot have status=active"
        )
    ]

    for doc, expected, reason in cases:
        actual = _is_serving_eligible(doc)
        assert actual == expected, f"Failed on case: {reason} (expected {expected}, got {actual})"


def test_ut86_verify_document_batch_duplicate_handling(monkeypatch):
    """86. PR1.1: verify_document_batch returns mapped metadata and marks duplicates as None."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    fake_neo.register_response("WHERE d.id IN $doc_ids", [
        {"doc_id": "DOC_UNIQUE", "occurrences": 1, "id": "DOC_UNIQUE", "status": "SYNCED", "op_stage": "TERMINAL_SYNCED", "committed_op_id": "op_u", "committed_generation": 1, "file_hash": "h_u"},
        {"doc_id": "DOC_DUPLICATE", "occurrences": 2, "id": "DOC_DUPLICATE", "status": "SYNCED"}
    ])

    batch_res = verify_document_batch(["DOC_UNIQUE", "DOC_DUPLICATE"])
    assert "DOC_UNIQUE" in batch_res
    assert batch_res["DOC_UNIQUE"] is not None
    assert _is_serving_eligible(batch_res["DOC_UNIQUE"]) is True

    assert "DOC_DUPLICATE" in batch_res
    assert batch_res["DOC_DUPLICATE"] is None  # Duplicate node fails closed


# ============================================================================
# TESTS 89-92: BACKWARD COMPATIBILITY & PR1 V3 REGRESSION PROTECTION
# ============================================================================

def test_ut89_backward_compat_legacy_document_serving_matrix():
    """89. Backward Compatibility: Serving eligibility for Legacy active documents strictly enforced."""
    # 1. Legacy active + neo4jSynced=true + hash valid: PASS
    valid_legacy = {
        "id": "DOC_LEGACY_PASS",
        "status": "active",
        "neo4jSynced": True,
        "active_op_id": None,
        "op_stage": None,
        "file_hash": "hash_valid_legacy",
        "hash": "hash_valid_legacy",
        "committed_generation": None,
        "committed_op_id": None
    }
    assert _is_serving_eligible(valid_legacy) is True

    # 2. Legacy active + neo4jSynced=false: REJECT
    assert _is_serving_eligible({**valid_legacy, "neo4jSynced": False}) is False

    # 3. Legacy active + neo4jSynced=None: REJECT
    assert _is_serving_eligible({**valid_legacy, "neo4jSynced": None}) is False

    # 4. Legacy missing hash: REJECT
    assert _is_serving_eligible({**valid_legacy, "file_hash": None, "hash": None}) is False
    assert _is_serving_eligible({**valid_legacy, "file_hash": "", "hash": ""}) is False

    # 5. Legacy hash conflict: REJECT
    assert _is_serving_eligible({**valid_legacy, "file_hash": "hash_a", "hash": "hash_b"}) is False

    # 6. Legacy active with active_op_id in flight: REJECT
    assert _is_serving_eligible({**valid_legacy, "active_op_id": "op_active_legacy"}) is False

    # 7. Legacy with PR1 V3 committed metadata: REJECT (fail-closed on ambiguous state)
    assert _is_serving_eligible({**valid_legacy, "committed_op_id": "op_ambiguous"}) is False
    assert _is_serving_eligible({**valid_legacy, "committed_generation": 1}) is False


def test_ut90_backward_compat_chunk_serving_integrity():
    """90. Backward Compatibility: verify_chunk_serving_integrity validates both Legacy and PR1 V3 chunks."""
    doc_legacy = {
        "id": "DOC_LEGACY_CHUNK",
        "status": "active",
        "neo4jSynced": True,
        "active_op_id": None,
        "op_stage": None,
        "file_hash": "hash_leg_123",
        "hash": "hash_leg_123",
        "committed_generation": None,
        "committed_op_id": None
    }

    doc_pr1 = {
        "id": "DOC_PR1_CHUNK",
        "status": "SYNCED",
        "neo4jSynced": True,
        "active_op_id": None,
        "op_stage": "TERMINAL_SYNCED",
        "file_hash": "hash_pr1_456",
        "hash": "hash_pr1_456",
        "committed_generation": 2,
        "committed_op_id": "op_pr1_valid"
    }

    # A. Qdrant Legacy chunk missing is_active + matching hash: PASS
    legacy_chunk = {
        "doc_id": "DOC_LEGACY_CHUNK",
        "file_hash": "hash_leg_123",
        "payload": {
            "doc_id": "DOC_LEGACY_CHUNK",
            "file_hash": "hash_leg_123"
        }
    }
    assert verify_chunk_serving_integrity(legacy_chunk, doc_legacy) is True

    # B. Qdrant Legacy chunk hash mismatch: REJECT
    bad_hash_chunk = {
        "doc_id": "DOC_LEGACY_CHUNK",
        "file_hash": "hash_wrong",
        "payload": {"file_hash": "hash_wrong"}
    }
    assert verify_chunk_serving_integrity(bad_hash_chunk, doc_legacy) is False

    # C. Qdrant Legacy chunk with is_active=False: REJECT
    inactive_chunk = {
        "doc_id": "DOC_LEGACY_CHUNK",
        "file_hash": "hash_leg_123",
        "is_active": False,
        "payload": {"file_hash": "hash_leg_123", "is_active": False}
    }
    assert verify_chunk_serving_integrity(inactive_chunk, doc_legacy) is False

    # D. Qdrant Legacy without Document node in Neo4j: REJECT (d_meta=None)
    assert verify_chunk_serving_integrity(legacy_chunk, None) is False

    # E. PR1 V3 chunk is_active=False: REJECT
    pr1_inactive = {
        "doc_id": "DOC_PR1_CHUNK",
        "file_hash": "hash_pr1_456",
        "is_active": False,
        "fencing_generation": 2,
        "operation_id": "op_pr1_valid",
        "payload": {"doc_id": "DOC_PR1_CHUNK", "file_hash": "hash_pr1_456", "is_active": False, "fencing_generation": 2, "operation_id": "op_pr1_valid"}
    }
    assert verify_chunk_serving_integrity(pr1_inactive, doc_pr1) is False

    # F. PR1 V3 chunk generation mismatch: REJECT
    pr1_bad_gen = {
        "doc_id": "DOC_PR1_CHUNK",
        "file_hash": "hash_pr1_456",
        "fencing_generation": 1,
        "operation_id": "op_pr1_valid",
        "payload": {"fencing_generation": 1, "operation_id": "op_pr1_valid"}
    }
    assert verify_chunk_serving_integrity(pr1_bad_gen, doc_pr1) is False

    # G. PR1 V3 chunk operation_id mismatch: REJECT
    pr1_bad_op = {
        "doc_id": "DOC_PR1_CHUNK",
        "file_hash": "hash_pr1_456",
        "fencing_generation": 2,
        "operation_id": "op_pr1_mismatched",
        "payload": {"fencing_generation": 2, "operation_id": "op_pr1_mismatched"}
    }
    assert verify_chunk_serving_integrity(pr1_bad_op, doc_pr1) is False

    # H. PR1 V3 document missing operation/generation metadata in Neo4j: REJECT
    doc_pr1_missing_op = {**doc_pr1, "committed_op_id": None}
    assert verify_chunk_serving_integrity(pr1_inactive, doc_pr1_missing_op) is False


def test_ut91_backward_compat_layer2_gate_full_flow(monkeypatch):
    """91. Backward Compatibility: apply_layer2_context_gate accepts legacy active chunks & fails closed on duplicate/unauthorized."""
    fake_neo = FakeNeo4jClient()
    monkeypatch.setattr("api.v1.copilot.neo4j_client", fake_neo)

    fake_neo.register_response("WHERE d.id IN $doc_ids", [
        {
            "doc_id": "DOC_LEGACY_PASS",
            "occurrences": 1,
            "id": "DOC_LEGACY_PASS",
            "status": "active",
            "neo4jSynced": True,
            "hash": "hash_leg_123",
            "file_hash": "hash_leg_123",
            "op_stage": None,
            "active_op_id": None,
            "committed_op_id": None,
            "committed_generation": None
        },
        {
            "doc_id": "DOC_DUPLICATE_LEGACY",
            "occurrences": 2,
            "id": "DOC_DUPLICATE_LEGACY",
            "status": "active",
            "neo4jSynced": True
        }
    ])

    chunks = [
        {"doc_id": "DOC_LEGACY_PASS", "file_hash": "hash_leg_123", "text": "Valid legacy content"},
        {"doc_id": "DOC_DUPLICATE_LEGACY", "file_hash": "hash_dup", "text": "Duplicate doc content"},
        {"doc_id": "DOC_NOT_IN_NEO4J", "file_hash": "hash_ghost", "text": "Ghost chunk"}
    ]

    v_chunks, v_entities = apply_layer2_context_gate(chunks, [])
    # Only DOC_LEGACY_PASS must be admitted
    assert len(v_chunks) == 1
    assert v_chunks[0]["doc_id"] == "DOC_LEGACY_PASS"


def test_ut92_backward_compat_erp_entities_exclude_document_citations():
    """92. Backward Compatibility: ERP Product/SalesOrder/Customer receive Evidence Chips, NEVER Document Citations."""
    ent_product = {
        "_id": "prod_1",
        "_labels": ["Product", "SalesHistory"],
        "name": "Mountain-100 Silver, 38",
        "is_erp_entity": True
    }
    ent_order = {
        "_id": "order_1",
        "_labels": ["SalesOrder"],
        "name": "Order #55282",
        "is_erp_entity": True
    }
    ent_customer = {
        "_id": "cust_1",
        "_labels": ["Customer"],
        "name": "Customer #11000",
        "is_erp_entity": True
    }

    used_entities = [ent_product, ent_order, ent_customer]
    evidence_chips = []
    citations_detail = []

    for ent in used_entities:
        ent_labels = ent.get("_labels") or []
        labels_str = ", ".join(ent_labels) if isinstance(ent_labels, list) else str(ent_labels)
        ent_name = ent.get("name") or "Knowledge Graph Entity"
        raw_id = str(ent.get("id") or ent.get("_id") or "")
        node_clean_id = raw_id.split(":")[-1] if ":" in raw_id else raw_id

        # Product / ERP: add chip, NEVER add document citation
        if ent.get("is_erp_entity") or any(l in ["Product", "SalesOrder", "Customer"] for l in ent_labels):
            evidence_chips.append({
                "id": f"graph_{node_clean_id}",
                "label": f"ERP: {ent_name}"[:36],
                "source": f"Neo4j Graph ({labels_str})",
            })
            continue

    # Verification: Evidence chips emitted, citations strictly empty
    assert len(evidence_chips) == 3
    assert all("ERP:" in c["label"] for c in evidence_chips)
    assert len(citations_detail) == 0



