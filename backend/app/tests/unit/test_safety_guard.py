"""
Unit Tests for PR0 Safety Guard, Import Isolation, and Fake Clients Contracts.
Marked with @pytest.mark.unit. Runs in 100% air-gapped / networkless environment.
"""
import pytest
from unittest.mock import MagicMock
import socket

from app.tests.conftest import (
    guarded_connect,
    guarded_connect_ex,
    RuntimeConnectionBlockedError,
    BLOCKED_PORTS,
)
from app.tests.fakes.fake_neo4j import FakeNeo4jClient
from app.tests.fakes.fake_qdrant import FakeQdrantClientWrapper
from qdrant_client.http import models


@pytest.mark.unit
def test_socket_guard_blocks_runtime_ports_zero_packet():
    """
    Verifies that guarded_connect immediately raises RuntimeConnectionBlockedError
    for all runtime database ports WITHOUT invoking the underlying socket connect.
    Zero network packets are sent.
    """
    mock_sock = MagicMock(spec=socket.socket)
    mock_real_connect = MagicMock()

    for port in BLOCKED_PORTS:
        with pytest.raises(RuntimeConnectionBlockedError) as exc_info:
            guarded_connect(mock_sock, ("127.0.0.1", port), real_connect=mock_real_connect)
        assert f":{port}" in str(exc_info.value)
        # Assert underlying real_connect was NEVER called
        assert mock_real_connect.call_count == 0

    # Test connect_ex variant
    mock_real_connect_ex = MagicMock()
    with pytest.raises(RuntimeConnectionBlockedError):
        guarded_connect_ex(mock_sock, ("::1", 7687), real_connect_ex=mock_real_connect_ex)
    assert mock_real_connect_ex.call_count == 0


@pytest.mark.unit
def test_socket_guard_blocks_sandbox_invalid_domain():
    """Verifies that .invalid hostnames are halted immediately."""
    mock_sock = MagicMock(spec=socket.socket)
    mock_real_connect = MagicMock()

    with pytest.raises(RuntimeConnectionBlockedError) as exc_info:
        guarded_connect(mock_sock, ("disabled.invalid", 9999), real_connect=mock_real_connect)
    assert "disabled.invalid" in str(exc_info.value)
    assert mock_real_connect.call_count == 0


@pytest.mark.unit
def test_fake_neo4j_client_spy_and_stub():
    """Verifies FakeNeo4jClient records queries and returns registered responses."""
    client = FakeNeo4jClient()
    assert client.is_connected is True

    # Register canned response
    client.register_response("MATCH (d:Document)", [{"name": "test.pdf", "domain": "legal"}])

    # Run Cypher
    results = client.run_cypher("MATCH (d:Document) RETURN d", {"name": "test.pdf"})
    assert len(results) == 1
    assert results[0]["name"] == "test.pdf"

    # Verify query history recorded
    assert len(client.executed_queries) == 1
    assert client.executed_queries[0]["params"] == {"name": "test.pdf"}

    # Verify counts
    client.set_counts(node_count=100, relationship_count=250)
    assert client.get_node_count() == 100
    assert client.get_relationship_count() == 250


@pytest.mark.unit
def test_fake_qdrant_client_pointstruct_upsert():
    """Verifies FakeQdrantClient correctly indexes PointStruct instances."""
    client = FakeQdrantClientWrapper()
    points = [
        models.PointStruct(id=101, vector=[0.1]*384, payload={"contract_name": "contract_A.pdf", "doc_id": "doc_1"}),
        models.PointStruct(id=102, vector=[0.2]*384, payload={"contract_name": "contract_B.pdf", "doc_id": "doc_2"}),
    ]
    client.upsert(collection_name="cuad_contracts", points=points)

    assert client.get_points_count("cuad_contracts") == 2
    assert len(client._client.upsert_history) == 1


@pytest.mark.unit
def test_fake_qdrant_client_delete_point_ids_list():
    """Verifies FakeQdrantClient handles models.PointIdsList selector (PR3 Saga Compensator)."""
    client = FakeQdrantClientWrapper()
    points = [
        models.PointStruct(id=1, vector=[0.1]*384, payload={"name": "A"}),
        models.PointStruct(id=2, vector=[0.2]*384, payload={"name": "B"}),
    ]
    client.upsert(collection_name="cuad_contracts", points=points)
    assert client.get_points_count("cuad_contracts") == 2

    # Delete point id 1 via PointIdsList
    selector = models.PointIdsList(points=[1])
    client.delete(collection_name="cuad_contracts", points_selector=selector)

    assert client.get_points_count("cuad_contracts") == 1
    assert 1 not in client._client.points_store["cuad_contracts"]
    assert 2 in client._client.points_store["cuad_contracts"]


@pytest.mark.unit
def test_fake_qdrant_client_delete_filter():
    """Verifies FakeQdrantClient handles models.Filter selector (pipeline.py Document Deletion)."""
    client = FakeQdrantClientWrapper()
    points = [
        models.PointStruct(id=10, vector=[0.1]*384, payload={"contract_name": "target.pdf", "doc_id": "d1"}),
        models.PointStruct(id=20, vector=[0.2]*384, payload={"contract_name": "other.pdf", "doc_id": "d2"}),
    ]
    client.upsert(collection_name="cuad_contracts", points=points)

    # Delete by filter matching contract_name="target.pdf"
    filter_selector = models.Filter(
        should=[
            models.FieldCondition(key="contract_name", match=models.MatchValue(value="target.pdf"))
        ]
    )
    client.delete(collection_name="cuad_contracts", points_selector=filter_selector)

    assert client.get_points_count("cuad_contracts") == 1
    assert 10 not in client._client.points_store["cuad_contracts"]
    assert 20 in client._client.points_store["cuad_contracts"]


@pytest.mark.unit
def test_fake_qdrant_client_unsupported_selector_raises_error():
    """Verifies FakeQdrantClient raises NotImplementedError for unsupported selectors (no silent pass)."""
    client = FakeQdrantClientWrapper()
    client.upsert(collection_name="cuad_contracts", points=[
        models.PointStruct(id=1, vector=[0.1]*384, payload={"name": "X"})
    ])

    # Pass arbitrary unsupported selector
    with pytest.raises(NotImplementedError) as exc_info:
        client.delete(collection_name="cuad_contracts", points_selector="UNSUPPORTED_STRING_SELECTOR")

    assert "Unsupported points_selector type" in str(exc_info.value)
    # Point must NOT be deleted
    assert client.get_points_count("cuad_contracts") == 1
