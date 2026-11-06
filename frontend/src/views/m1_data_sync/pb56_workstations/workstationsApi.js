/**
 * PB56 Workstations API Client
 * Namespace: pb56_*
 * Communicates with backend endpoints at /api/v1/workstations
 */
import { API_BASE } from "../../../services/api";

function getAuthHeaders() {
  const token = localStorage.getItem("aegis_token") || localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Fallback to identify admin role
  headers["X-User-Role"] = "admin";
  headers["X-User-Name"] = "admin";
  return headers;
}

export async function fetchPb56Status() {
  try {
    const res = await fetch(`${API_BASE}/v1/workstations/status`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("[PB56] Status check failed:", e);
  }
  return { success: false, enabled: false };
}

export async function fetchWorkstationsList() {
  const res = await fetch(`${API_BASE}/v1/workstations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi tải danh sách máy trạm (${res.status})`);
  }
  return await res.json();
}

export async function registerWorkstation(payload) {
  const res = await fetch(`${API_BASE}/v1/workstations/register`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi đăng ký máy trạm (${res.status})`);
  }
  return await res.json();
}

export async function rotateWorkstationToken(workstationId) {
  const res = await fetch(`${API_BASE}/v1/workstations/${encodeURIComponent(workstationId)}/rotate-token`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi cấp mới Token (${res.status})`);
  }
  return await res.json();
}

export async function changeSyncMode(workstationId, payload) {
  const res = await fetch(`${API_BASE}/v1/workstations/${encodeURIComponent(workstationId)}/sync-mode`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi cập nhật Sync Mode (${res.status})`);
  }
  return await res.json();
}

export async function cancelPendingSyncMode(workstationId) {
  const res = await fetch(`${API_BASE}/v1/workstations/${encodeURIComponent(workstationId)}/cancel-sync-mode`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi hủy lệnh Sync Mode (${res.status})`);
  }
  return await res.json();
}

export async function seedDemoWorkstations() {
  const res = await fetch(`${API_BASE}/v1/workstations/seed-demo`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lỗi nạp dữ liệu demo (${res.status})`);
  }
  return await res.json();
}

