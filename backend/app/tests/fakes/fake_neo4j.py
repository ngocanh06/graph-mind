"""
In-Memory Spy & Stub for Neo4j Client (PR0 Isolated Test Harness).
Strictly bounded test double: captures Cypher execution history and parameters
without attempting to parse or execute full graph graph algorithms in memory.
"""
from typing import Any, Dict, List, Optional, Tuple


class FakeNeo4jClient:
    """
    Test double for app.db.neo4j.client.Neo4jClient.
    Acts as a Spy (records executed queries) and Stub (returns canned data).
    """

    def __init__(self):
        self._connected: bool = True
        self.executed_queries: List[Dict[str, Any]] = []
        self._canned_responses: Dict[str, List[Dict[str, Any]]] = {}
        self._node_count: int = 0
        self._relationship_count: int = 0

    @property
    def is_connected(self) -> bool:
        return self._connected

    def connect(self) -> bool:
        self._connected = True
        return True

    def close(self) -> None:
        self._connected = False

    def register_response(self, query_keyword: str, response_data: List[Dict[str, Any]]) -> None:
        """Register canned output to be returned when query contains query_keyword."""
        self._canned_responses[query_keyword] = response_data

    def set_counts(self, node_count: int = 0, relationship_count: int = 0) -> None:
        """Set mock counts for get_node_count and get_relationship_count."""
        self._node_count = node_count
        self._relationship_count = relationship_count

    def run_cypher(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Record executed query and parameters for test assertion (Spy).
        Return canned response if keyword matches; otherwise return empty list.
        """
        self.executed_queries.append({
            "query": query.strip(),
            "params": params or {}
        })
        for keyword, resp in self._canned_responses.items():
            if keyword in query:
                return resp
        return []

    def get_node_count(self) -> int:
        return self._node_count

    def get_relationship_count(self) -> int:
        return self._relationship_count

    def get_all_nodes(self, limit: int = 100, label: Optional[str] = None) -> List[Dict[str, Any]]:
        for keyword, resp in self._canned_responses.items():
            if "RETURN n" in keyword or "MATCH (n)" in keyword:
                return resp[:limit]
        return []

    def get_all_relationships(self, limit: int = 200, rel_type: Optional[str] = None) -> List[Dict[str, Any]]:
        for keyword, resp in self._canned_responses.items():
            if "MATCH (a)-" in keyword:
                return resp[:limit]
        return []

    def reset(self) -> None:
        """Reset execution history and canned responses."""
        self.executed_queries.clear()
        self._canned_responses.clear()
        self._node_count = 0
        self._relationship_count = 0
        self._connected = True
