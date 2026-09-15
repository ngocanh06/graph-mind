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
