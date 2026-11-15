import pytest
from httpx import ASGITransport, AsyncClient
from types import SimpleNamespace

from app.api.v1.auth import get_current_user
from app.api.v1 import graph_editor
from app.tests.fakes.fake_neo4j import FakeNeo4jClient
from app.tests.fakes.test_app_factory import create_test_app


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_persists_allowed_properties(monkeypatch):
    neo4j = FakeNeo4jClient()
    neo4j.register_response(
        "SET n += $properties",
        [{
            "id": "neo-node-1",
            "properties": {
                "name": "Reviewed Clause",
                "penalty_limit": "1000 USD",
                "is_risk": True,
                "notes": "Reviewed",
                "source_document": "contract.pdf",
            },
        }],
    )
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={
                "name": "Reviewed Clause",
                "penalty_limit": "1000 USD",
                "is_risk": True,
                "notes": "Reviewed",
            },
        )

    assert response.status_code == 200, response.text
    assert response.json()["data"]["properties"]["source_document"] == "contract.pdf"
    assert len(neo4j.executed_queries) == 1
    assert neo4j.executed_queries[0]["params"]["properties"] == {
        "name": "Reviewed Clause",
        "penalty_limit": "1000 USD",
        "is_risk": True,
        "notes": "Reviewed",
    }


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_rejects_standard_user(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="sales", role="standard"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={"name": "Not allowed"},
        )

    assert response.status_code == 403
    assert neo4j.executed_queries == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_rejects_anonymous_requests(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={"name": "No identity"},
        )

    assert response.status_code == 401
    assert neo4j.executed_queries == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_does_not_report_missing_entity_as_saved(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/missing-node/properties",
            json={"name": "Does not exist"},
        )

    assert response.status_code == 404
    assert response.json()["detail"].find("no changes were saved") >= 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_surfaces_neo4j_errors(monkeypatch):
    neo4j = FakeNeo4jClient()

    def fail_query(query, params=None, raise_errors=False):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(neo4j, "run_cypher", fail_query)
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={"name": "Reviewed Clause"},
        )

    assert response.status_code == 502
    assert response.json()["detail"] == "Neo4j failed to save the entity."


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_rejects_unknown_fields(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={"source_document": "overwrite provenance"},
        )

    assert response.status_code == 422
    assert neo4j.executed_queries == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_rejects_empty_entity_name(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.put(
            "/api/graph/entity/neo-node-1/properties",
            json={"name": "  "},
        )

    assert response.status_code == 422
    assert neo4j.executed_queries == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_m2_graph_editor_verification_requires_a_real_node(monkeypatch):
    neo4j = FakeNeo4jClient()
    monkeypatch.setattr(graph_editor, "neo4j_client", neo4j)
    app = create_test_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        username="manager", role="knowledge_manager"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post(
            "/api/graph/verify",
            json={"entityId": "missing-node", "verified": True},
        )

    assert response.status_code == 404
    assert "no changes were saved" in response.json()["detail"]
