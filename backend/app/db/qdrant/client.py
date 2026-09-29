"""
Graph Mind — Qdrant Vector Database Client
Connects to Qdrant for semantic/vector search, with graceful fallback.
"""

import os
from typing import Any, Dict, List, Optional

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False


class QdrantClientWrapper:
    def __init__(self):
        self._client = None
        self._connected = False
        self._collection = None

    def connect(self) -> bool:
        if not QDRANT_AVAILABLE:
            return False
        host = os.getenv("QDRANT_HOST", "localhost")
        port = int(os.getenv("QDRANT_PORT", "6333"))
        self._collection = os.getenv("QDRANT_COLLECTION_NAME", "enterprise_knowledge")
        try:
            self._client = QdrantClient(host=host, port=port, timeout=5)
            # Verify connectivity by listing collections
            self._client.get_collections()
            self._connected = True
            print(f"[Qdrant] Connected to {host}:{port}, collection={self._collection}")
            return True
        except Exception as e:
            print(f"[Qdrant] Could not connect to {host}:{port}: {e}")
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def get_collections(self) -> List[str]:
        if not self._connected or not self._client:
            return []
        try:
            resp = self._client.get_collections()
            return [c.name for c in resp.collections]
        except Exception as e:
            print(f"[Qdrant] get_collections error: {e}")
            return []

    def get_collection_info(self, collection_name: str = None) -> Dict[str, Any]:
        col = collection_name or self._collection
        if not self._connected or not self._client or not col:
            return {}
        try:
            info = self._client.get_collection(col)
            return {
                "name": col,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": str(info.status),
                "vector_size": info.config.params.vectors.size if hasattr(info.config.params.vectors, "size") else None,
                "distance": str(info.config.params.vectors.distance) if hasattr(info.config.params.vectors, "distance") else None,
            }
        except Exception as e:
            print(f"[Qdrant] get_collection_info error: {e}")
            return {}

    def scroll_points(
        self,
        collection_name: str = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Scroll through points (no query vector needed)."""
        col = collection_name or self._collection
        if not self._connected or not self._client or not col:
            return []
        try:
            results, _next = self._client.scroll(
                collection_name=col,
                limit=limit,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            return [
                {
                    "id": str(r.id),
                    "payload": r.payload or {},
                    "score": None,
                }
                for r in results
            ]
        except Exception as e:
            print(f"[Qdrant] scroll_points error: {e}")
            return []

    def search_by_text(
        self,
        query: str,
        collection_name: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Keyword/payload search — does NOT require an embedding model.
        Scrolls all points and filters by keyword match in payload fields.
        """
        col = collection_name or self._collection
        if not self._connected or not self._client or not col:
            return []
        try:
            # Scroll all (up to 500 points) and do client-side text filter
            results, _ = self._client.scroll(
                collection_name=col,
                limit=500,
                with_payload=True,
                with_vectors=False,
            )
            query_lower = query.lower()
            matched = []
            for r in results:
                payload = r.payload or {}
                combined = " ".join(str(v) for v in payload.values()).lower()
                if query_lower in combined:
                    matched.append({
                        "id": str(r.id),
                        "payload": payload,
                        "score": None,
                    })
                    if len(matched) >= limit:
                        break
            return matched
        except Exception as e:
            print(f"[Qdrant] search_by_text error: {e}")
            return []

    def get_points_count(self, collection_name: str = None) -> int:
        col = collection_name or self._collection
        if not self._connected or not self._client or not col:
            return 0
        try:
            info = self._client.get_collection(col)
            return info.points_count or 0
        except Exception as e:
            print(f"[Qdrant] get_points_count error: {e}")
            return 0


# Singleton instance
qdrant_client = QdrantClientWrapper()
