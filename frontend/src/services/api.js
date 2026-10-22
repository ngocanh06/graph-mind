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

export function getAuthHeaders(currentUser = null) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("aegis_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (currentUser) {
    if (currentUser.email) headers["X-User-Email"] = currentUser.email;
    if (currentUser.username) headers["X-User-Name"] = currentUser.username;
    if (currentUser.id) headers["X-User-Id"] = currentUser.id;
  }
  return headers;
}

export async function fetchCopilotSessions(currentUser = null) {
  try {
    const res = await fetch(`${API_BASE}/copilot/sessions`, {
      headers: getAuthHeaders(currentUser)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Copilot] fetchCopilotSessions failed:", e);
  }
  return null;
}

export async function createCopilotSession(title = "Cuộc hội thoại mới", currentUser = null) {
  try {
    const res = await fetch(`${API_BASE}/copilot/sessions`, {
      method: "POST",
      headers: getAuthHeaders(currentUser),
      body: JSON.stringify({ title })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Copilot] createCopilotSession failed:", e);
  }
  return null;
}

export async function fetchCopilotSessionDetail(sessionId, currentUser = null) {
  try {
    const res = await fetch(`${API_BASE}/copilot/sessions/${encodeURIComponent(sessionId)}`, {
      headers: getAuthHeaders(currentUser)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Copilot] fetchCopilotSessionDetail failed:", e);
  }
  return null;
}

export async function deleteCopilotSession(sessionId, currentUser = null) {
  try {
    const res = await fetch(`${API_BASE}/copilot/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(currentUser)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Copilot] deleteCopilotSession failed:", e);
  }
  return null;
}

export async function queryCopilot(query, lang = "vi", sessionId = null, currentUser = null) {
  try {
    const res = await fetch(`${API_BASE}/copilot/ask`, {
      method: "POST",
      headers: getAuthHeaders(currentUser),
      body: JSON.stringify({ query, lang, session_id: sessionId })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Copilot] queryCopilot failed:", e);
  }
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
    if (params.sort_by && params.sort_by !== "default") sp.set("sort_by", params.sort_by);
    if (params.new_only) sp.set("new_only", "true");
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

// ============================================================================
// MULTI-FACET SEARCH API (REAL DATABASE DATA)
// ============================================================================

export async function fetchMultiFacetSearch(query = "", mode = "hybrid", dept = "ALL", status = "ALL", limit = 12, currentUser = null) {
  try {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (mode) sp.set("mode", mode);
    if (dept && dept !== "ALL") sp.set("dept", dept);
    if (status && status !== "ALL") sp.set("status", status);
    sp.set("limit", limit);

    const res = await fetch(`${API_BASE}/search?${sp.toString()}`, {
      headers: getAuthHeaders(currentUser)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Search] fetchMultiFacetSearch error:", e);
  }
  return null;
}

// ============================================================================
// ASSIGNED CONTRACTS & RISK ALERTS (LIVE DATABASE API)
// ============================================================================

export async function fetchAssignedContracts(role = "standard", dept = "Kinh doanh", limit = 8) {
  try {
    const sp = new URLSearchParams({ role, dept, limit: String(limit) });
    const res = await fetch(`${API_BASE}/contracts/assigned?${sp.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Contracts] fetchAssignedContracts error:", e);
  }
  return null;
}

export async function fetchRiskAlerts(role = "standard", dept = "Kinh doanh") {
  try {
    const sp = new URLSearchParams({ role, dept });
    const res = await fetch(`${API_BASE}/risk/alerts?${sp.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Risk] fetchRiskAlerts error:", e);
  }
  return null;
}

// ============================================================================
// M1 DATA SYNC — AEGIS LOCAL FILE WATCHER STATUS API
// ============================================================================

export async function fetchWatcherSyncStatus() {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/sync/file-watcher/status`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Watcher] fetchWatcherSyncStatus error:", e);
  }
  return null;
}

export async function triggerMockWatcherDrop(fileName = "HD_CungCap_ThietBi_2026.pdf", department = "Kinh doanh") {
  try {
    const formData = new FormData();
    const blob = new Blob([
      `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nHỢP ĐỒNG KINH TẾ #${Date.now().toString().slice(-4)}\n` +
      `Bên A: Công ty Cổ phần Công nghệ GraphMind\n` +
      `Bên B: Tập đoàn Viễn thông Alpha (CUST-29818)\n` +
      `Giá trị hợp đồng: 1,280,000,000 VND\n` +
      `Điều khoản 1: Bảo mật thông tin tuyệt đối (Confidentiality).\n` +
      `Điều khoản 2: Phương thức thanh toán 3 đợt theo khối lượng nghiệm thu.\n` +
      `Điều khoản 3: Bồi thường thiệt hại và phạt vi phạm 8% giá trị vi phạm.`
    ], { type: "text/plain" });
    
    formData.append("file", blob, fileName);
    formData.append("department", department);
    formData.append("file_name", fileName);

    const res = await fetch(`http://localhost:5000/api/v1/sync/file-watcher`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer dev-agent-key"
      },
      body: formData
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[Watcher] triggerMockWatcherDrop error:", e);
  }
  return null;
}


