"""
In-Memory Test Double for Qdrant Vector DB (PR0 Isolated Test Harness).
Implements exact points_selector contract:
- models.PointIdsList: Deletes points by ID list (PR3 Saga Compensation)
- models.Filter: Deletes points matching FieldCondition in should (pipeline.py Deletion)
- Raises NotImplementedError for any unsupported selector type.
"""
from typing import Any, Dict, List, Optional, Union
try:
    from qdrant_client.http import models
    HAS_QDRANT_MODELS = True
except ImportError:
    HAS_QDRANT_MODELS = False
    models = None


class FakeQdrantClientInner:
    """Simulates qdrant_client.QdrantClient internal operations."""

    def __init__(self):
        # collections -> point_id -> PointStruct or dict
        self.points_store: Dict[str, Dict[Any, Any]] = {}
        self.upsert_history: List[Dict[str, Any]] = []
        self.delete_history: List[Dict[str, Any]] = []
        self._canned_search_results: Dict[str, List[Any]] = {}

    def upsert(self, collection_name: str, points: List[Any], **kwargs) -> None:
        """Store points in memory and record upsert call history."""
        self.upsert_history.append({
            "collection": collection_name,
            "points": list(points),
            "kwargs": kwargs
        })
        if collection_name not in self.points_store:
            self.points_store[collection_name] = {}

        for pt in points:
            # Handle PointStruct (object) or dictionary
            if hasattr(pt, "id"):
                pt_id = pt.id
            elif isinstance(pt, dict) and "id" in pt:
                pt_id = pt["id"]
            else:
                raise ValueError(f"Point missing 'id' attribute or key: {pt}")
            self.points_store[collection_name][pt_id] = pt

    def delete(self, collection_name: str, points_selector: Any, **kwargs) -> None:
        """
        Delete points matching points_selector.
        Strict contract:
        - models.PointIdsList -> delete by ID
        - models.Filter -> delete by matching FieldConditions
        - Any other selector -> raise NotImplementedError
        """
        self.delete_history.append({
            "collection": collection_name,
            "selector": points_selector,
            "kwargs": kwargs
        })
        col = self.points_store.get(collection_name, {})

        # 1. PointIdsList (e.g. used by Saga Compensator)
        if HAS_QDRANT_MODELS and isinstance(points_selector, models.PointIdsList):
            for pid in points_selector.points:
                col.pop(pid, None)
            return

        # 2. Filter (used by pipeline.py document deletion)
        if HAS_QDRANT_MODELS and isinstance(points_selector, models.Filter):
            matched_ids = []
            for pid, pt in col.items():
                payload = getattr(pt, "payload", None)
                if payload is None and isinstance(pt, dict):
                    payload = pt.get("payload", {})
                elif payload is None:
                    payload = {}

                # Check should conditions
                conditions = points_selector.should or []
                for cond in conditions:
                    if isinstance(cond, models.FieldCondition):
                        expected_val = cond.match.value
                        if payload.get(cond.key) == expected_val:
                            matched_ids.append(pid)
                            break
            for mid in matched_ids:
                col.pop(mid, None)
            return

        # 3. Fallback support if raw dict selector or custom object
        if hasattr(points_selector, "points") and isinstance(getattr(points_selector, "points"), (list, tuple, set)):
            for pid in points_selector.points:
                col.pop(pid, None)
            return

        # 4. Strict fail-fast: DO NOT silently ignore unsupported selectors
        raise NotImplementedError(
            f"[FakeQdrantClient] Unsupported points_selector type: {type(points_selector)}. "
            "Supported selectors are models.PointIdsList and models.Filter."
        )

    def search(self, collection_name: str, query_vector: Any, limit: int = 10, **kwargs) -> List[Any]:
        """Return canned search results if registered, or empty list."""
        return self._canned_search_results.get(collection_name, [])[:limit]

    def register_search_results(self, collection_name: str, results: List[Any]) -> None:
        self._canned_search_results[collection_name] = results

    def get_points_count(self, collection_name: Optional[str] = None) -> int:
        if collection_name:
            return len(self.points_store.get(collection_name, {}))
        return sum(len(pts) for pts in self.points_store.values())

    def reset(self) -> None:
        self.points_store.clear()
        self.upsert_history.clear()
        self.delete_history.clear()
        self._canned_search_results.clear()


class FakeQdrantClientWrapper:
    """Test double matching app.db.qdrant.client.QdrantClientWrapper interface."""

    def __init__(self, default_collection: str = "cuad_contracts"):
        self._connected: bool = True
        self._collection: str = default_collection
        self._client: FakeQdrantClientInner = FakeQdrantClientInner()

    @property
    def is_connected(self) -> bool:
        return self._connected

    def connect(self) -> bool:
        self._connected = True
        return True

    def close(self) -> None:
        self._connected = False

    # Delegate core methods for convenience
    def upsert(self, *args, **kwargs):
        return self._client.upsert(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return self._client.delete(*args, **kwargs)

    def search(self, *args, **kwargs):
        return self._client.search(*args, **kwargs)

    def get_points_count(self, *args, **kwargs):
        return self._client.get_points_count(*args, **kwargs)

    def reset(self) -> None:
        self._connected = True
        self._client.reset()
