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


export const DEPARTMENT_OPTIONS = [
  { value: "SALES", label: "Kinh doanh (SALES)", dbName: "Sales", id: "6d04d700-56e6-4d50-88b2-6594013fc8cd" },
  { value: "LEGAL", label: "Pháp chế (LEGAL)", dbName: "Legal", id: "dd99cb37-49d1-4543-99c6-f4787dd19a08" },
  { value: "FINANCE", label: "Kế toán / Thu mua (FINANCE)", dbName: "Accounting", id: "aa7d6633-dc3f-44b3-a5ad-cb2e08f891cd" },
  { value: "IT", label: "Công nghệ / IT", dbName: "Công Nghệ Thông Tin", id: "1c51042f-0345-4467-90ca-ef5845822712" },
  { value: "RND", label: "R&D", dbName: "R&D", id: "eafa81ed-53a7-4275-ba0f-f9ac57eb1ce5" },
];

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
    const detailMsg = extractDetail(data, `HTTP ${res.status}`);
    if (res.status === 401 && (data?.error_code === "CONCURRENT_LOGIN_KICKED" || data?.detail?.error_code === "CONCURRENT_LOGIN_KICKED")) {
      const kickMsg = data?.detail?.message || data?.detail || data?.message || "Tài khoản của bạn vừa được đăng nhập ở một thiết bị hoặc trình duyệt khác. Phiên làm việc này đã kết thúc.";
      try {
        localStorage.removeItem("aegis_token");
        localStorage.removeItem("aegis_auth_user");
        localStorage.removeItem("aegis_user");
        localStorage.removeItem("access_token");
        sessionStorage.setItem("aegis_kicked_notice", kickMsg);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("graphmind:concurrent-login-kicked", { detail: { message: kickMsg } }));
    }
    if (res.status === 403 && detailMsg && detailMsg.includes("Tài khoản đã bị khóa")) {
      try {
        localStorage.removeItem("aegis_token");
        sessionStorage.removeItem("aegis_token");
        window.location.href = "/login";
      } catch {}
    }
    const err = new Error(detailMsg);
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


export function changeAdminUserDepartment(userId, departmentCode, departmentId) {
  return apiFetch(`/admin/users/${userId}/department`, {
    method: "PATCH",
    body: JSON.stringify({
      department_code: departmentCode,
      department_id: departmentId || undefined,
    }),
  });
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
export const lockUser = lockAdminUser;

export function unlockAdminUser(userId) {
  return apiFetch(`/admin/users/${userId}/unlock`, { method: "PATCH" });
}
export const unlockUser = unlockAdminUser;

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

// ── Granular RBAC Matrix APIs (PB02 - Mục 6.2.1) ─────────────────────────────
export function fetchGranularRbacMatrix() {
  return apiFetch("/admin/rbac-matrix");
}

export function updateGranularRbacMatrix(policies) {
  return apiFetch("/admin/rbac-matrix", {
    method: "PUT",
    body: JSON.stringify({ policies }),
  });
}

export function resetGranularRbacMatrix(scopeDept = "SALES") {
  const query = scopeDept ? `?scope_dept=${encodeURIComponent(scopeDept)}` : "";
  return apiFetch(`/admin/rbac-matrix/reset-default${query}`, {
    method: "POST",
  });
}

export function fetchMyKnowledgeScope() {
  return apiFetch("/admin/rbac-matrix/user-scope/me");
}

// ── Document Upload Approvals (PB48, PB50, PB02) ───────────────────────────
export function fetchUploadApprovals({ status = "ALL", department = "", resourceType = "" } = {}) {
  const sp = new URLSearchParams();
  if (status && status !== "ALL") sp.set("status", status);
  if (department && department !== "ALL") sp.set("department", department);
  if (resourceType && resourceType !== "ALL") sp.set("resource_type", resourceType);
  return apiFetch(`/admin/upload-approvals?${sp.toString()}`);
}

export function approveUploadRequest(requestId) {
  return apiFetch(`/admin/upload-approvals/${requestId}/approve`, {
    method: "POST",
  });
}

export function rejectUploadRequest(requestId, reviewNote = "") {
  return apiFetch(`/admin/upload-approvals/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ review_note: reviewNote }),
  });
}

export function previewUploadRequest(requestId) {
  return apiFetch(`/admin/upload-approvals/${requestId}/preview`);
}
