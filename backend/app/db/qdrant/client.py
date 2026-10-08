"""
Graph Mind — Qdrant Vector Database Client
Connects to Qdrant for semantic/vector search and collection exploration.
Uses local SentenceTransformer embedding model with graceful fallback.
"""

import os
from typing import Any, Dict, List, Optional

try:
    from qdrant_client import QdrantClient
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

_EMBED_MODEL = None


def get_embed_model():
    """Lazy load SentenceTransformer model from local cache."""
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
            print("[Qdrant] SentenceTransformer 'all-MiniLM-L6-v2' loaded successfully")
        except Exception as e:
            print(f"[Qdrant] Warning: Could not load SentenceTransformer locally: {e}")
            _EMBED_MODEL = False
    return _EMBED_MODEL if _EMBED_MODEL is not False else None


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
        self._collection = os.getenv("QDRANT_COLLECTION_NAME", "cuad_contracts")
        try:
            self._client = QdrantClient(host=host, port=port, timeout=8)
            resp = self._client.get_collections()
            col_names = [c.name for c in resp.collections]
            if self._collection not in col_names and col_names:
                self._collection = col_names[0]
            self._connected = True
            print(f"[Qdrant] Connected to {host}:{port}, active collection={self._collection}")
            return True
        except Exception as e:
            print(f"[Qdrant] Could not connect to {host}:{port}: {e}")
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def get_collections(self) -> List[str]:
        if not self._connected and not self.connect():
            return []
        try:
            resp = self._client.get_collections()
            return [c.name for c in resp.collections]
        except Exception as e:
            print(f"[Qdrant] get_collections error: {e}")
            return []

    def get_collection_info(self, collection_name: str = None) -> Dict[str, Any]:
        if not self._connected and not self.connect():
            return {}
        col = collection_name or self._collection
        if not col:
            return {}
        try:
            info = self._client.get_collection(col)
            vector_size = None
            distance = None
            if hasattr(info.config.params, "vectors"):
                v_params = info.config.params.vectors
                if hasattr(v_params, "size"):
                    vector_size = v_params.size
                    distance = str(v_params.distance)
                elif isinstance(v_params, dict):
                    first_cfg = next(iter(v_params.values()), None)
                    if first_cfg:
                        vector_size = getattr(first_cfg, "size", None)
                        distance = str(getattr(first_cfg, "distance", None))

            return {
                "name": col,
                "vectors_count": getattr(info, "vectors_count", None) or getattr(info, "points_count", 0),
                "points_count": getattr(info, "points_count", 0),
                "status": str(info.status),
                "vector_size": vector_size,
                "distance": distance,
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
        """Scroll through points in collection with payloads."""
        if not self._connected and not self.connect():
            return []
        col = collection_name or self._collection
        if not col:
            return []
        try:
            results, _ = self._client.scroll(
                collection_name=col,
                limit=limit,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            points = []
            for r in results:
                payload = r.payload or {}
                points.append({
                    "id": str(r.id),
                    "contract_name": payload.get("contract_name", "Contract Document"),
                    "chunk_id": payload.get("chunk_id"),
                    "text": payload.get("text", ""),
                    "payload": payload,
                    "score": None,
                })
            return points
        except Exception as e:
            print(f"[Qdrant] scroll_points error: {e}")
            return []

    def vector_search(
        self,
        query: str,
        collection_name: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Semantic vector search using SentenceTransformer embedding.
        Falls back to keyword search if model is unavailable.
        """
        if not self._connected and not self.connect():
            return []
        col = collection_name or self._collection
        if not col or not query.strip():
            return []

        model = get_embed_model()
        if model:
            try:
                query_vec = model.encode(query.strip()).tolist()
                hits = self._client.search(
                    collection_name=col,
                    query_vector=query_vec,
                    limit=limit,
                    with_payload=True,
                    with_vectors=False,
                )
                results = []
                for h in hits:
                    payload = h.payload or {}
                    results.append({
                        "id": str(h.id),
                        "score": round(float(h.score), 4),
                        "contract_name": payload.get("contract_name", "Contract Document"),
                        "chunk_id": payload.get("chunk_id"),
                        "text": payload.get("text", ""),
                        "payload": payload,
                    })
                return results
            except Exception as e:
                print(f"[Qdrant] vector_search error, falling back to text search: {e}")

        # Fallback to text search
        return self.search_by_text(query, col, limit)

    def search_by_text(
        self,
        query: str,
        collection_name: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Keyword text search across payloads."""
        if not self._connected and not self.connect():
            return []
        col = collection_name or self._collection
        if not col:
            return []
        try:
            results, _ = self._client.scroll(
                collection_name=col,
                limit=300,
                with_payload=True,
                with_vectors=False,
            )
            q_lower = query.lower()
            matched = []
            for r in results:
                payload = r.payload or {}
                combined = " ".join(str(v) for v in payload.values()).lower()
                if q_lower in combined:
                    matched.append({
                        "id": str(r.id),
                        "score": 1.0,
                        "contract_name": payload.get("contract_name", "Contract Document"),
                        "chunk_id": payload.get("chunk_id"),
                        "text": payload.get("text", ""),
                        "payload": payload,
                    })
                    if len(matched) >= limit:
                        break
            return matched
        except Exception as e:
            print(f"[Qdrant] search_by_text error: {e}")
            return []

    def get_points_count(self, collection_name: str = None) -> int:
        if not self._connected and not self.connect():
            return 0
        col = collection_name or self._collection
        if not col:
            return 0
        try:
            info = self._client.get_collection(col)
            return getattr(info, "points_count", 0) or 0
        except Exception as e:
            print(f"[Qdrant] get_points_count error: {e}")
            return 0


# Singleton instance
qdrant_client = QdrantClientWrapper()
