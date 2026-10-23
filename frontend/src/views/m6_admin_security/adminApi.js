/**
 * Module 6 Phase 1 — live admin APIs (users, RBAC, audit, knowledge permissions)
 */
const API_BASE = "/api/v1";

export const ROLE_ALIASES = {
  executive: "executive",
  exec: "executive",
  it_admin: "it_admin",
  admin: "it_admin",
  knowledge_manager: "knowledge_manager",
  department_manager: "knowledge_manager",
  sme_manager: "knowledge_manager",
  manager: "knowledge_manager",
  standard: "standard",
  standard_user: "standard",
  sales: "standard",
  ops: "standard",
};

export const ROLE_META = {
  executive: { label: "Ban lãnh đạo", badge: "danger" },
  it_admin: { label: "Admin hệ thống", badge: "warning" },
  knowledge_manager: { label: "Quản lý", badge: "success" },
  standard: { label: "Nhân viên", badge: "info" },
};

export const ROLE_OPTIONS = Object.entries(ROLE_META).map(([value, { label }]) => ({
  value,
  label,
}));

export const RESOURCE_TYPES = [
  { value: "", label: "Tất cả loại đối tượng" },
  { value: "user", label: "USER" },
  { value: "KNOWLEDGE_PERMISSION", label: "KNOWLEDGE_PERMISSION" },
];

export function canonicalRole(role) {
  return ROLE_ALIASES[(role || "").toString().trim().toLowerCase()] || "standard";
}

export function getAuthToken() {
  return localStorage.getItem("aegis_token") || localStorage.getItem("access_token") || "";
}

export function getSessionIdentity() {
  const token = getAuthToken();
  if (!token) return { userId: null, role: null };
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return { userId: payload.sub || null, role: payload.role || null };
  } catch {
    return { userId: null, role: null };
  }
}

function extractDetail(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  if (data.message) return data.message;
  return fallback;
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  let data = null;
  try {
    data = res.status === 204 ? null : await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(extractDetail(data, `HTTP ${res.status}`));
    err.status = res.status;
    throw err;
  }
  return data;
}

export function fetchAdminUsers() {
  return apiFetch("/admin/users");
}

export function createAdminUser(payload) {
  return apiFetch("/admin/users", { method: "POST", body: JSON.stringify(payload) });
}

export function changeAdminUserRole(userId, role) {
  return apiFetch(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function lockAdminUser(userId) {
  return apiFetch(`/admin/users/${userId}/lock`, { method: "PATCH" });
}

export function unlockAdminUser(userId) {
  return apiFetch(`/admin/users/${userId}/unlock`, { method: "PATCH" });
}

export function resetAdminUserPassword(userId, newPassword) {
  return apiFetch(`/admin/users/${userId}/reset-password`, {
    method: "PATCH",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export function deleteAdminUser(userId) {
  return apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
}

export function fetchAuditLogs({ actor = "", resourceType = "", action = "" } = {}) {
  const sp = new URLSearchParams({ limit: "200", offset: "0" });
  if (actor) sp.set("actor", actor);
  if (resourceType) sp.set("resource_type", resourceType);
  if (action) sp.set("action", action);
  return apiFetch(`/admin/audit-logs?${sp.toString()}`);
}

export function fetchKnowledgePermissions() {
  return apiFetch("/admin/knowledge-permissions");
}

export function updateKnowledgePermission(domain, role, allowed) {
  return apiFetch("/admin/knowledge-permissions", {
    method: "PUT",
    body: JSON.stringify({ domain, role, allowed }),
  });
}
