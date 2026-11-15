import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

try:
    from app.api.v1.auth import get_current_user
    from app.db.neo4j.client import neo4j_client
    from app.modules.m6_admin_security.rbac import canonical_role
except ImportError:
    from api.v1.auth import get_current_user
    from db.neo4j.client import neo4j_client
    from modules.m6_admin_security.rbac import canonical_role

logger = logging.getLogger(__name__)
router = APIRouter()


class EntityPropertiesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, max_length=500)
    penalty_limit: Optional[str] = Field(default=None, max_length=2000)
    is_risk: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=5000)


class VerifyEntityRequest(BaseModel):
    entityId: str
    verified: bool
    auditor: Optional[str] = "Human Auditor"


def _require_editor(user: Any) -> None:
    if canonical_role(user) not in {"executive", "it_admin", "knowledge_manager"}:
        raise HTTPException(status_code=403, detail="Only Admin, Executive, and Knowledge Manager may edit graph entities.")


@router.post("/api/graph/verify")
def verify_entity(
    payload: VerifyEntityRequest,
    user=Depends(get_current_user),
):
    _require_editor(user)
    if not (neo4j_client.is_connected or neo4j_client.connect()):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable; entity verification was not saved.")

    status = "Human Verified" if payload.verified else "Needs Review"
    cypher = """
    MATCH (n)
    WHERE elementId(n) = $id
       OR n.id = $id
       OR toString(n.ProductID) = $id
       OR toString(n.CustomerID) = $id
       OR toString(n.SalesOrderID) = $id
       OR n.name = $id
       OR n.Name = $id
    SET n.verified = $verified,
        n.status = $status,
        n.auditor = $auditor,
        n.verifiedAt = datetime()
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties
    LIMIT 1
    """
    try:
        records = neo4j_client.run_cypher(
            cypher,
            {
                "id": payload.entityId,
                "verified": payload.verified,
                "status": status,
                "auditor": payload.auditor or str(user.username),
            },
            raise_errors=True,
        )
    except Exception as exc:
        logger.exception("Knowledge Editor could not verify entity %s", payload.entityId)
        raise HTTPException(status_code=502, detail="Neo4j failed to update entity verification.") from exc

    if not records:
        raise HTTPException(status_code=404, detail=f"Graph entity '{payload.entityId}' was not found; no changes were saved.")
    return {"success": True, "data": records[0]}


@router.put("/api/graph/entity/{entity_id}/properties")
def update_entity_properties(
    entity_id: str,
    payload: EntityPropertiesUpdate,
    user=Depends(get_current_user),
):
    _require_editor(user)

    properties = payload.model_dump(exclude_unset=True)
    if not properties:
        raise HTTPException(status_code=422, detail="At least one editable property is required.")
    if "name" in properties and (properties["name"] is None or not properties["name"].strip()):
        raise HTTPException(status_code=422, detail="Entity name cannot be empty.")

    if not (neo4j_client.is_connected or neo4j_client.connect()):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable; entity changes were not saved.")

    cypher = """
    MATCH (n)
    WHERE elementId(n) = $id
       OR n.id = $id
       OR toString(n.ProductID) = $id
       OR toString(n.CustomerID) = $id
       OR toString(n.SalesOrderID) = $id
       OR n.name = $id
       OR n.Name = $id
    WITH n
    ORDER BY CASE
        WHEN elementId(n) = $id THEN 0
        WHEN n.id = $id THEN 1
        ELSE 2
    END
    LIMIT 1
    SET n += $properties
    WITH n, $properties AS changes
    SET n.Name = CASE
            WHEN 'name' IN keys(changes) AND n.Name IS NOT NULL THEN changes.name
            ELSE n.Name
        END,
        n.human_feedback_updated_by = $editor,
        n.human_feedback_updated_at = datetime()
    RETURN elementId(n) AS id, properties(n) AS properties
    """
    try:
        records = neo4j_client.run_cypher(
            cypher,
            {"id": entity_id, "properties": properties, "editor": str(user.username)},
            raise_errors=True,
        )
    except Exception as exc:
        logger.exception("Knowledge Editor could not save entity %s", entity_id)
        raise HTTPException(status_code=502, detail="Neo4j failed to save the entity.") from exc

    if not records:
        raise HTTPException(status_code=404, detail=f"Graph entity '{entity_id}' was not found; no changes were saved.")

    return {"success": True, "data": records[0]}
