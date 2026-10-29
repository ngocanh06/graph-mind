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

try:
    from app.core.config import settings
except ImportError:
    try:
        from core.config import settings
    except ImportError:
        settings = None


_EMBED_MODEL = None


def get_embed_model():
    """Lazy load SentenceTransformer or FastEmbed model from local cache."""
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
            print("[Qdrant] SentenceTransformer 'all-MiniLM-L6-v2' loaded successfully")
        except Exception:
            try:
                from fastembed import TextEmbedding
                class _FastEmbedAdapter:
                    def __init__(self):
                        self._model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
                    def encode(self, texts, **kwargs):
                        import numpy as np
                        if isinstance(texts, str):
                            return np.array(list(self._model.embed([texts]))[0])
                        return np.array([e for e in self._model.embed(texts)])
                _EMBED_MODEL = _FastEmbedAdapter()
                print("[Qdrant] FastEmbed 'all-MiniLM-L6-v2' loaded successfully")
            except Exception as e:
                print(f"[Qdrant] Warning: Could not load embedding model: {e}")
                _EMBED_MODEL = False
    return _EMBED_MODEL if _EMBED_MODEL is not False else None


class QdrantClientWrapper:
    def __init__(self):
        self._client = None
        self._connected = False
        self._collection = None
        self._host = "localhost"
        self._port = 6333

    def connect(self) -> bool:
        if not QDRANT_AVAILABLE:
            return False
        host = (settings.QDRANT_HOST if settings else None) or os.getenv("QDRANT_HOST", "localhost")
        port = int((settings.QDRANT_PORT if settings else None) or os.getenv("QDRANT_PORT", "6333"))
        self._host = host
        self._port = port
        self._collection = (settings.QDRANT_COLLECTION_NAME if settings else None) or os.getenv("QDRANT_COLLECTION_NAME", "cuad_contracts")
        try:
            self._client = QdrantClient(host=host, port=port, timeout=8)
            resp = self._client.get_collections()
            col_names = [c.name for c in resp.collections]
            if self._collection not in col_names:
                if "cuad_contracts" in col_names:
                    self._collection = "cuad_contracts"
                else:
                    try:
                        from qdrant_client.http import models
                        self._client.create_collection(
                            collection_name=self._collection,
                            vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
                        )
                    except Exception as col_err:
                        if col_names:
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
                doc_id_val = payload.get("document_id") or payload.get("doc_id") or payload.get("contract_id") or str(r.id)
                file_val = payload.get("source_file") or payload.get("contract_name") or payload.get("name") or "Document"
                chunk_idx_val = payload.get("chunk_index") if payload.get("chunk_index") is not None else payload.get("chunk_id")
                points.append({
                    "id": str(r.id),
                    "document_id": doc_id_val,
                    "doc_id": doc_id_val,
                    "source_file": file_val,
                    "contract_name": file_val,
                    "chunk_index": chunk_idx_val,
                    "chunk_id": chunk_idx_val,
                    "text": payload.get("text", ""),
                    "department": payload.get("department") or "",
                    "source": payload.get("source") or col,
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
        query_filter: Optional[Dict[str, Any]] = None,
        entity_type: Optional[Any] = None,
        table: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic vector search using SentenceTransformer embedding.
        Falls back to keyword search if model is unavailable.
        Supports Qdrant payload filtering by entity_type (single or list) or table or custom query_filter.
        """
        if not self._connected and not self.connect():
            return []
        col = collection_name or self._collection
        if not col or not query.strip():
            return []

        # Build filter if entity_type or table is provided
        effective_filter = query_filter
        if (entity_type or table) and not effective_filter:
            must_conditions = []
            if entity_type:
                if isinstance(entity_type, list):
                    must_conditions.append({"key": "entity_type", "match": {"any": entity_type}})
                else:
                    must_conditions.append({"key": "entity_type", "match": {"value": str(entity_type)}})
            if table:
                must_conditions.append({"key": "table", "match": {"value": str(table)}})
            effective_filter = {"must": must_conditions}

        model = get_embed_model()
        if model:
            try:
                import urllib.request
                import json

                query_vec = model.encode(query.strip()).tolist()
                url = f"http://{self._host}:{self._port}/collections/{col}/points/search"
                search_payload = {
                    "vector": query_vec,
                    "limit": limit,
                    "with_payload": True,
                    "with_vector": False
                }
                if effective_filter:
                    search_payload["filter"] = effective_filter

                req_data = json.dumps(search_payload).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=req_data,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=6) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    hits = res_json.get("result", [])
                    results = []
                    for h in hits:
                        payload = h.get("payload") or {}
                        h_id = str(h.get("id"))
                        doc_id_val = payload.get("document_id") or payload.get("doc_id") or payload.get("contract_id") or h_id
                        file_val = payload.get("source_file") or payload.get("contract_name") or payload.get("name") or "Document"
                        chunk_idx_val = payload.get("chunk_index") if payload.get("chunk_index") is not None else payload.get("chunk_id")
                        results.append({
                            "id": h_id,
                            "score": round(float(h.get("score", 0)), 4),
                            "document_id": doc_id_val,
                            "doc_id": doc_id_val,
                            "source_file": file_val,
                            "contract_name": file_val,
                            "chunk_index": chunk_idx_val,
                            "chunk_id": chunk_idx_val,
                            "text": payload.get("text") or payload.get("searchable_text", ""),
                            "department": payload.get("department") or "",
                            "source": payload.get("source") or col,
                            "payload": payload,
                            "collection": col,
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
            tokens = [w for w in q_lower.split() if len(w) >= 3]
            matched = []
            for r in results:
                payload = r.payload or {}
                combined = " ".join(str(v) for v in payload.values()).lower()
                score = 0.0
                if q_lower in combined:
                    score = 1.0
                elif tokens:
                    hit_cnt = sum(1 for t in tokens if t in combined)
                    if hit_cnt > 0:
                        score = round(hit_cnt / len(tokens), 2)
                if score > 0:
                    r_id = str(r.id)
                    doc_id_val = payload.get("document_id") or payload.get("doc_id") or payload.get("contract_id") or r_id
                    file_val = payload.get("source_file") or payload.get("contract_name") or payload.get("name") or "Document"
                    chunk_idx_val = payload.get("chunk_index") if payload.get("chunk_index") is not None else payload.get("chunk_id")
                    matched.append({
                        "id": r_id,
                        "score": score,
                        "document_id": doc_id_val,
                        "doc_id": doc_id_val,
                        "source_file": file_val,
                        "contract_name": file_val,
                        "chunk_index": chunk_idx_val,
                        "chunk_id": chunk_idx_val,
                        "text": payload.get("text", ""),
                        "department": payload.get("department") or "",
                        "source": payload.get("source") or col,
                        "payload": payload,
                        "collection": col,
                    })
            matched.sort(key=lambda x: x["score"], reverse=True)
            return matched[:limit]
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
