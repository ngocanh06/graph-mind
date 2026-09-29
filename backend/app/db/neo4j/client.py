"""
Graph Mind — Neo4j Graph Database Client
Connects to Neo4j using bolt protocol, with graceful fallback to mock data.
"""

import os
from typing import Any, Dict, List, Optional

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False


class Neo4jClient:
    def __init__(self):
        self._driver = None
        self._connected = False

    def connect(self) -> bool:
        if not NEO4J_AVAILABLE:
            return False
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "graphmind_secret")
        try:
            self._driver = GraphDatabase.driver(uri, auth=(user, password))
            # Verify connectivity
            with self._driver.session() as session:
                session.run("RETURN 1")
            self._connected = True
            print(f"[Neo4j] Connected to {uri}")
            return True
        except Exception as e:
            print(f"[Neo4j] Could not connect to {uri}: {e}")
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def close(self):
        if self._driver:
            self._driver.close()

    def get_all_nodes(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch all nodes from Neo4j graph."""
        if not self._connected or not self._driver:
            return []
        try:
            with self._driver.session() as session:
                result = session.run(
                    "MATCH (n) RETURN n, labels(n) as labels LIMIT $limit",
                    limit=limit
                )
                nodes = []
                for record in result:
                    node = dict(record["n"])
                    node["_labels"] = record["labels"]
                    node["_id"] = record["n"].element_id
                    nodes.append(node)
                return nodes
        except Exception as e:
            print(f"[Neo4j] get_all_nodes error: {e}")
            return []

    def get_all_relationships(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Fetch all relationships from Neo4j graph."""
        if not self._connected or not self._driver:
            return []
        try:
            with self._driver.session() as session:
                result = session.run(
                    """
                    MATCH (a)-[r]->(b)
                    RETURN 
                        a.name AS source_name, labels(a) AS source_labels, elementId(a) AS source_id,
                        type(r) AS rel_type, properties(r) AS rel_props,
                        b.name AS target_name, labels(b) AS target_labels, elementId(b) AS target_id
                    LIMIT $limit
                    """,
                    limit=limit
                )
                rels = []
                for record in result:
                    rels.append({
                        "source": {
                            "id": record["source_id"],
                            "name": record["source_name"],
                            "labels": record["source_labels"]
                        },
                        "rel_type": record["rel_type"],
                        "rel_props": dict(record["rel_props"] or {}),
                        "target": {
                            "id": record["target_id"],
                            "name": record["target_name"],
                            "labels": record["target_labels"]
                        }
                    })
                return rels
        except Exception as e:
            print(f"[Neo4j] get_all_relationships error: {e}")
            return []

    def run_cypher(self, cypher: str, params: Dict = None) -> List[Dict[str, Any]]:
        """Execute a raw Cypher query and return results as list of dicts."""
        if not self._connected or not self._driver:
            return []
        try:
            with self._driver.session() as session:
                result = session.run(cypher, parameters=params or {})
                return [dict(record) for record in result]
        except Exception as e:
            print(f"[Neo4j] run_cypher error: {e}")
            return []

    def get_node_count(self) -> int:
        results = self.run_cypher("MATCH (n) RETURN count(n) AS cnt")
        if results:
            return results[0].get("cnt", 0)
        return 0

    def get_relationship_count(self) -> int:
        results = self.run_cypher("MATCH ()-[r]->() RETURN count(r) AS cnt")
        if results:
            return results[0].get("cnt", 0)
        return 0

    def get_label_counts(self) -> Dict[str, int]:
        results = self.run_cypher(
            "MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS cnt ORDER BY cnt DESC"
        )
        return {r["label"]: r["cnt"] for r in results}


# Singleton instance
neo4j_client = Neo4jClient()
