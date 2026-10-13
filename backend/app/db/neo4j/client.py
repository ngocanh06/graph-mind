"""
Graph Mind — Neo4j Graph Database Client
Connects to Neo4j using bolt protocol, queries live real data.
"""

import os
import re
from typing import Any, Dict, List, Optional

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False


def _clean_val(v: Any) -> Any:
    """Helper to convert Neo4j dates/times/nodes into JSON-serializable types."""
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if hasattr(v, "__str__") and type(v).__module__.startswith("neo4j"):
        return str(v)
    if isinstance(v, dict):
        return {k: _clean_val(val) for k, val in v.items()}
    if isinstance(v, (list, tuple, set)):
        return [_clean_val(x) for x in v]
    return v


def _extract_display_name(props: Dict[str, Any], labels: List[str], element_id: str) -> str:
    """Compute human-friendly display name based on properties and schema labels."""
    if "Name" in props and props["Name"]:
        return str(props["Name"])
    if "name" in props and props["name"]:
        return str(props["name"])
    if "title" in props and props["title"]:
        return str(props["title"])
    if "SalesOrderID" in props:
        return f"Order #{props['SalesOrderID']}"
    if "CustomerID" in props:
        return f"Customer #{props['CustomerID']}"
    if "EmployeeID" in props:
        fn = props.get("FirstName", "")
        ln = props.get("LastName", "")
        job = props.get("JobTitle", "")
        name = f"{fn} {ln}".strip()
        return f"{name} ({job})" if job else (name or f"Employee #{props['EmployeeID']}")
    if "ProductID" in props:
        return f"Product #{props['ProductID']}"
    if "SubCategoryID" in props:
        return f"SubCategory #{props['SubCategoryID']}"
    if "CategoryID" in props:
        return f"Category #{props['CategoryID']}"
    
    first_lbl = labels[0] if labels else "Node"
    return f"{first_lbl} {element_id.split(':')[-1] if ':' in element_id else element_id}"


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
            with self._driver.session() as session:
                session.run("RETURN 1")
            self._connected = True
            print(f"[Neo4j] Connected successfully to {uri}")
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
            self._connected = False

    def get_all_nodes(self, limit: int = 100, label: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch nodes from Neo4j graph with optional label filter."""
        if not self._connected and not self.connect():
            return []
        try:
            query = "MATCH (n) RETURN n, labels(n) as labels LIMIT $limit"
            params: Dict[str, Any] = {"limit": limit}
            if label:
                clean_label = re.sub(r"[^a-zA-Z0-9_]", "", label)
                query = f"MATCH (n:`{clean_label}`) RETURN n, labels(n) as labels LIMIT $limit" if clean_label else query

            with self._driver.session() as session:
                result = session.run(query, parameters=params)
                nodes = []
                for record in result:
                    raw_props = dict(record["n"])
                    props = {k: _clean_val(v) for k, v in raw_props.items()}
                    labels = record["labels"] or []
                    elem_id = record["n"].element_id
                    display_name = _extract_display_name(props, labels, elem_id)

                    node_obj = {
                        "_id": elem_id,
                        "_labels": labels,
                        "name": display_name,
                        **props
                    }
                    nodes.append(node_obj)
                return nodes
        except Exception as e:
            print(f"[Neo4j] get_all_nodes error: {e}")
            return []

    def get_all_relationships(self, limit: int = 200, rel_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch relationships with formatted source/target entities."""
        if not self._connected and not self.connect():
            return []
        try:
            clean_rel = re.sub(r"[^a-zA-Z0-9_]", "", rel_type) if rel_type else ""
            rel_clause = f"[r:`{clean_rel}`]" if clean_rel else "[r]"
            cypher = f"""
                MATCH (a)-{rel_clause}->(b)
                RETURN 
                    properties(a) AS a_props, labels(a) AS a_labels, elementId(a) AS a_id,
                    type(r) AS rel_type, properties(r) AS rel_props,
                    properties(b) AS b_props, labels(b) AS b_labels, elementId(b) AS b_id
                LIMIT $limit
            """
            with self._driver.session() as session:
                result = session.run(cypher, limit=limit)
                rels = []
                for record in result:
                    a_props = {k: _clean_val(v) for k, v in dict(record["a_props"] or {}).items()}
                    a_labels = record["a_labels"] or []
                    a_id = record["a_id"]
                    a_name = _extract_display_name(a_props, a_labels, a_id)

                    b_props = {k: _clean_val(v) for k, v in dict(record["b_props"] or {}).items()}
                    b_labels = record["b_labels"] or []
                    b_id = record["b_id"]
                    b_name = _extract_display_name(b_props, b_labels, b_id)

                    r_props = {k: _clean_val(v) for k, v in dict(record["rel_props"] or {}).items()}

                    rels.append({
                        "source": {
                            "id": a_id,
                            "name": a_name,
                            "labels": a_labels,
                            "properties": a_props
                        },
                        "rel_type": record["rel_type"],
                        "rel_props": r_props,
                        "target": {
                            "id": b_id,
                            "name": b_name,
                            "labels": b_labels,
                            "properties": b_props
                        }
                    })
                return rels
        except Exception as e:
            print(f"[Neo4j] get_all_relationships error: {e}")
            return []

    def get_connected_nodes(self, limit: int = 60, label: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch nodes from Neo4j, prioritizing connected hierarchy so products link to subcategories."""
        if not self._connected and not self.connect():
            return []
        try:
            if label and label != "ALL":
                return self.get_all_nodes(limit=limit, label=label)
            
            # Hierarchical traversal: Category -> SubCategory -> Product (plus other entities)
            cypher = """
                MATCH (c:Category)<-[:PART_OF]-(s:SubCategory)
                OPTIONAL MATCH (s)<-[:BELONGS_TO]-(p:Product)
                WITH c, s, collect(p)[0..2] as prods
                UNWIND ([c, s] + prods) as n
                WITH DISTINCT n
                RETURN n, labels(n) as labels
                LIMIT $limit
            """
            with self._driver.session() as session:
                result = session.run(cypher, limit=limit)
                nodes = []
                for record in result:
                    raw_props = dict(record["n"])
                    props = {k: _clean_val(v) for k, v in raw_props.items()}
                    labels = record["labels"] or []
                    elem_id = record["n"].element_id
                    display_name = _extract_display_name(props, labels, elem_id)
                    nodes.append({
                        "_id": elem_id,
                        "_labels": labels,
                        "name": display_name,
                        **props
                    })
                # If less than limit, fill up with other connected nodes
                if len(nodes) < limit:
                    extra = self.get_all_nodes(limit=limit)
                    seen = {n["_id"] for n in nodes}
                    for en in extra:
                        if en["_id"] not in seen and len(nodes) < limit:
                            nodes.append(en)
                            seen.add(en["_id"])
                return nodes
        except Exception as e:
            print(f"[Neo4j] get_connected_nodes error: {e}")
            return self.get_all_nodes(limit=limit, label=label)

    def get_relationships_for_nodes(self, node_ids: List[str], limit: int = 300) -> List[Dict[str, Any]]:
        """Fetch relationships between the provided node IDs."""
        if not self._connected and not self.connect() or not node_ids:
            return []
        try:
            cypher = """
                MATCH (a)-[r]->(b)
                WHERE elementId(a) IN $node_ids AND elementId(b) IN $node_ids
                RETURN 
                    properties(a) AS a_props, labels(a) AS a_labels, elementId(a) AS a_id,
                    type(r) AS rel_type, properties(r) AS rel_props,
                    properties(b) AS b_props, labels(b) AS b_labels, elementId(b) AS b_id
                LIMIT $limit
            """
            with self._driver.session() as session:
                result = session.run(cypher, node_ids=node_ids, limit=limit)
                rels = []
                for record in result:
                    a_props = {k: _clean_val(v) for k, v in dict(record["a_props"] or {}).items()}
                    a_labels = record["a_labels"] or []
                    a_id = record["a_id"]
                    a_name = _extract_display_name(a_props, a_labels, a_id)

                    b_props = {k: _clean_val(v) for k, v in dict(record["b_props"] or {}).items()}
                    b_labels = record["b_labels"] or []
                    b_id = record["b_id"]
                    b_name = _extract_display_name(b_props, b_labels, b_id)

                    r_props = {k: _clean_val(v) for k, v in dict(record["rel_props"] or {}).items()}

                    rels.append({
                        "source": {
                            "id": a_id,
                            "name": a_name,
                            "labels": a_labels,
                            "properties": a_props
                        },
                        "rel_type": record["rel_type"],
                        "rel_props": r_props,
                        "target": {
                            "id": b_id,
                            "name": b_name,
                            "labels": b_labels,
                            "properties": b_props
                        }
                    })
                # If few relationships found between the exact set, supplement with general rels
                if len(rels) < 10:
                    general_rels = self.get_all_relationships(limit=limit)
                    return general_rels
                return rels
        except Exception as e:
            print(f"[Neo4j] get_relationships_for_nodes error: {e}")
            return self.get_all_relationships(limit=limit)

    def get_node_by_id(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single node and its immediate neighbors."""
        if not self._connected and not self.connect():
            return None
        try:
            with self._driver.session() as session:
                # 1. Fetch node
                res = session.run(
                    "MATCH (n) WHERE elementId(n) = $id RETURN n, labels(n) as labels",
                    id=node_id
                )
                rec = res.single()
                if not rec:
                    return None
                
                raw_props = dict(rec["n"])
                props = {k: _clean_val(v) for k, v in raw_props.items()}
                labels = rec["labels"] or []
                elem_id = rec["n"].element_id
                display_name = _extract_display_name(props, labels, elem_id)

                # 2. Fetch neighbor relationships (up to 30)
                n_res = session.run("""
                    MATCH (n)-[r]-(m)
                    WHERE elementId(n) = $id
                    RETURN 
                        elementId(n) as nid,
                        type(r) as rel_type,
                        properties(r) as r_props,
                        elementId(startNode(r)) = $id as is_outgoing,
                        elementId(m) as mid,
                        labels(m) as m_labels,
                        properties(m) as m_props
                    LIMIT 30
                """, id=node_id)

                neighbors = []
                for nr in n_res:
                    m_props = {k: _clean_val(v) for k, v in dict(nr["m_props"] or {}).items()}
                    m_labels = nr["m_labels"] or []
                    m_id = nr["mid"]
                    neighbors.append({
                        "rel_type": nr["rel_type"],
                        "is_outgoing": nr["is_outgoing"],
                        "target": {
                            "id": m_id,
                            "name": _extract_display_name(m_props, m_labels, m_id),
                            "labels": m_labels,
                            "properties": m_props
                        }
                    })

                return {
                    "_id": elem_id,
                    "_labels": labels,
                    "name": display_name,
                    "properties": props,
                    "neighbors": neighbors
                }
        except Exception as e:
            print(f"[Neo4j] get_node_by_id error: {e}")
            return None

    def search_nodes(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Search nodes matching keyword in any property."""
        if not self._connected and not self.connect():
            return []
        try:
            q_clean = query.strip()
            # If query is integer ID, match exact IDs
            params: Dict[str, Any] = {"limit": limit}
            cypher = """
                MATCH (n)
                WHERE any(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $q)
                RETURN n, labels(n) as labels
                LIMIT $limit
            """
            params["q"] = q_clean

            with self._driver.session() as session:
                result = session.run(cypher, parameters=params)
                nodes = []
                for record in result:
                    raw_props = dict(record["n"])
                    props = {k: _clean_val(v) for k, v in raw_props.items()}
                    labels = record["labels"] or []
                    elem_id = record["n"].element_id
                    nodes.append({
                        "_id": elem_id,
                        "_labels": labels,
                        "name": _extract_display_name(props, labels, elem_id),
                        **props
                    })
                return nodes
        except Exception as e:
            print(f"[Neo4j] search_nodes error: {e}")
            return []

    def run_cypher(self, cypher: str, params: Dict = None) -> List[Dict[str, Any]]:
        """Execute a raw Cypher query and return serializable records."""
        if not self._connected and not self.connect():
            return []
        try:
            with self._driver.session() as session:
                result = session.run(cypher, parameters=params or {})
                cleaned = []
                for record in result:
                    d = {}
                    for k, v in record.items():
                        if hasattr(v, "element_id"): # Node or Rel
                            d[k] = {
                                "_id": v.element_id,
                                "_labels": list(v.labels) if hasattr(v, "labels") else [],
                                "type": v.type if hasattr(v, "type") else None,
                                "properties": {pk: _clean_val(pv) for pk, pv in dict(v).items()}
                            }
                        else:
                            d[k] = _clean_val(v)
                    cleaned.append(d)
                return cleaned
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
