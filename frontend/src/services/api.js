/**
 * Graph Mind — API Service
 * Communicates with Python FastAPI backend (port 5000) with offline fallback
 */

const API_BASE = "http://localhost:5000/api";

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Graph Mind] Python backend unreachable, using local cache.");
  }
  return null;
}

export async function fetchSignals() {
  try {
    const res = await fetch(`${API_BASE}/signals`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function fetchEntities() {
  try {
    const res = await fetch(`${API_BASE}/graph/entities`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function verifyEntityApi(entityId, verified, auditor = "Dieu Hoang (CFO)") {
  try {
    const res = await fetch(`${API_BASE}/graph/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId, verified, auditor })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function queryCopilot(query, lang = "en") {
  try {
    const res = await fetch(`${API_BASE}/copilot/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lang })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function loginApi(identifier, password) {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Đăng nhập không thành công.");
  }
  return data;
}

export async function getCurrentUserApi(token) {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

// ============================================================================
// NEO4J GRAPH API (LIVE REAL DATA)
// ============================================================================

export async function fetchNeo4jStatus() {
  try {
    const res = await fetch(`${API_BASE}/neo4j/status`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Neo4j] status error:", e);
  }
  return null;
}

export async function fetchNeo4jGraph(limit = 100, relLimit = 200, label = null) {
  try {
    let url = `${API_BASE}/neo4j/graph?limit=${limit}&rel_limit=${relLimit}`;
    if (label) url += `&label=${encodeURIComponent(label)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Neo4j] fetchNeo4jGraph error:", e);
  }
  return null;
}

export async function fetchNeo4jNode(nodeId) {
  try {
    const res = await fetch(`${API_BASE}/neo4j/node/${encodeURIComponent(nodeId)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Neo4j] fetchNeo4jNode error:", e);
  }
  return null;
}

export async function searchNeo4jNodes(query, limit = 25) {
  try {
    const res = await fetch(`${API_BASE}/neo4j/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Neo4j] searchNeo4jNodes error:", e);
  }
  return null;
}

export async function runCypherQuery(cypher, params = {}) {
  try {
    const res = await fetch(`${API_BASE}/neo4j/cypher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cypher, params })
    });
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
  } catch (e) {
    console.warn("[Neo4j] runCypherQuery error:", e);
  }
  return null;
}

// ============================================================================
// QDRANT VECTOR API (LIVE REAL DATA)
// ============================================================================

export async function fetchQdrantStatus() {
  try {
    const res = await fetch(`${API_BASE}/qdrant/status`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Qdrant] fetchQdrantStatus error:", e);
  }
  return null;
}

export async function fetchQdrantCollections() {
  try {
    const res = await fetch(`${API_BASE}/qdrant/collections`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Qdrant] fetchQdrantCollections error:", e);
  }
  return null;
}

export async function fetchQdrantPoints(collection, limit = 20, offset = 0) {
  try {
    let url = `${API_BASE}/qdrant/points?limit=${limit}&offset=${offset}`;
    if (collection) url += `&collection=${encodeURIComponent(collection)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Qdrant] fetchQdrantPoints error:", e);
  }
  return null;
}

export async function searchQdrant(query, collection = null, top_k = 10) {
  try {
    const res = await fetch(`${API_BASE}/vector-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, collection, top_k, limit: top_k })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Qdrant] searchQdrant error:", e);
  }
  return null;
}

// ============================================================================
// COMBINED KNOWLEDGE EXPLORER API (NEO4J + QDRANT)
// ============================================================================

export async function searchKnowledgeExplorer(query, top_k = 8) {
  try {
    const res = await fetch(`${API_BASE}/knowledge-explorer/search?query=${encodeURIComponent(query)}&top_k=${top_k}`, {
      method: "POST"
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Explorer] searchKnowledgeExplorer error:", e);
  }
  return null;
}

// ============================================================================
// REPOSITORY DOCUMENTS & ADVENTUREWORKS (REAL DATA)
// ============================================================================

export async function fetchRepositoryDocuments(params = {}) {
  try {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.doc_type && params.doc_type !== "ALL") sp.set("doc_type", params.doc_type);
    if (params.dept && params.dept !== "ALL") sp.set("dept", params.dept);
    if (params.limit) sp.set("limit", params.limit);
    if (params.offset !== undefined) sp.set("offset", params.offset);

    const res = await fetch(`${API_BASE}/documents?${sp.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Repository] fetchRepositoryDocuments error:", e);
  }
  return null;
}

export async function fetchDocumentDetail(docId) {
  try {
    const res = await fetch(`${API_BASE}/documents/detail?doc_id=${encodeURIComponent(docId)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Repository] fetchDocumentDetail error:", e);
  }
  return null;
}
