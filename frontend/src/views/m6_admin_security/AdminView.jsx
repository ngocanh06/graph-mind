import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck, Users, ClipboardList, TrendingUp, UserPlus,
  Check, Ban, AlertTriangle,
  Lock, Unlock, KeyRound, Trash2, RefreshCw, Sliders
} from "lucide-react";
import GranularRbacMatrix from "./GranularRbacMatrix";
import {
  PageHeader, Tabs, Badge, Button, SearchInput, Card, StatCard, Alert
} from "../../components/ui";
import {
  ROLE_OPTIONS,
  RESOURCE_TYPES,
  canonicalRole,
  getSessionIdentity,
  fetchAdminUsers,
  createAdminUser,
  changeAdminUserRole,
  lockAdminUser,
  unlockAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
  fetchAuditLogs,
  fetchKnowledgePermissions,
  updateKnowledgePermission,
} from "./adminApi";

const ACTION_VARIANT = {
  USER_CREATE: "success", USER_DELETE: "danger",
  ROLE_CHANGE: "warning", USER_LOCK: "danger", USER_UNLOCK: "success",
  PASSWORD_RESET: "info", LOGIN: "info", LOGIN_FAIL: "danger",
  PERM_CHANGE: "info",
};

const PERM_PERSONAS = ["exec", "admin", "manager", "ops"];
const EMPTY_MATRIX = {
  customer: { exec: false, admin: false, manager: false, ops: false },
  orders: { exec: false, admin: false, manager: false, ops: false },
  payroll: { exec: false, admin: false, manager: false, ops: false },
  contracts: { exec: false, admin: false, manager: false, ops: false },
  risk: { exec: false, admin: false, manager: false, ops: false },
  sop: { exec: false, admin: false, manager: false, ops: false },
};

function toMatrix(rows) {
  const matrix = JSON.parse(JSON.stringify(EMPTY_MATRIX));
  (rows || []).forEach((row) => {
    if (!matrix[row.domain]) {
      matrix[row.domain] = { exec: false, admin: false, manager: false, ops: false };
    }
    matrix[row.domain][row.role] = Boolean(row.allowed);
  });
  return matrix;
}

function ForbiddenBanner({ message }) {
  return (
    <Alert variant="danger" title="403">
      {message || "Chỉ Admin hệ thống mới có quyền"}
    </Alert>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-lg)", padding: "28px 32px", width: 420, maxWidth: "90vw",
        boxShadow: "var(--shadow-xl)", animation: "modalEnter 0.2s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminView({ onNavigate, t = {}, lang = "vi" }) {
  const isVi = lang === "vi";
  const session = getSessionIdentity();
  const [activeTab, setActiveTab] = useState("roles");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("ok");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersForbidden, setUsersForbidden] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [addForm, setAddForm] = useState({ email: "", password: "", full_name: "", role: "standard" });
  const [resetPwd, setResetPwd] = useState("");

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditForbidden, setAuditForbidden] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditResourceType, setAuditResourceType] = useState("");

  const [permissions, setPermissions] = useState(EMPTY_MATRIX);
  const [permsForbidden, setPermsForbidden] = useState("");

  const [budgetLimit, setBudgetLimit] = useState(500);

  const showToast = useCallback((msg, type = "ok") => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const errorText = (err) => {
    if (err.status === 409) return `409 ${err.message}`;
    if (err.status === 403) return `403 ${err.message}`;
    return err.message || "Có lỗi xảy ra";
  };

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersForbidden("");
    try {
      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      if (e.status === 403) setUsersForbidden(e.message || "Chỉ Admin hệ thống mới có quyền");
      else showToast(errorText(e), "err");
    } finally {
      setUsersLoading(false);
    }
  }, [showToast]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditForbidden("");
    try {
      const data = await fetchAuditLogs({
        actor: auditSearch,
        resourceType: auditResourceType,
      });
      setAuditLogs(data.items || []);
      setAuditTotal(data.total || 0);
    } catch (e) {
      setAuditLogs([]);
      if (e.status === 403) setAuditForbidden(e.message || "Chỉ Admin hệ thống mới có quyền");
      else showToast(errorText(e), "err");
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch, auditResourceType, showToast]);

  const loadPermissions = useCallback(async () => {
    setPermsForbidden("");
    try {
      const rows = await fetchKnowledgePermissions();
      setPermissions(toMatrix(rows));
    } catch (e) {
      if (e.status === 403) setPermsForbidden(e.message || "Chỉ Admin hệ thống mới có quyền");
      else showToast(errorText(e), "err");
    }
  }, [showToast]);

  useEffect(() => { if (activeTab === "roles") loadUsers(); }, [activeTab, loadUsers]);
  useEffect(() => { if (activeTab === "audit") loadAudit(); }, [activeTab, loadAudit]);
  useEffect(() => { if (activeTab === "perms") loadPermissions(); }, [activeTab, loadPermissions]);

  const handleAddUser = async () => {
    try {
      await createAdminUser(addForm);
      showToast("Đã tạo tài khoản");
      setShowAddModal(false);
      setAddForm({ email: "", password: "", full_name: "", role: "standard" });
      loadUsers();
    } catch (e) {
      showToast(errorText(e), "err");
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await changeAdminUserRole(user.user_id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === user.user_id ? { ...u, role: newRole } : u))
      );
      showToast("Đã đổi vai trò");
      await loadUsers();
    } catch (e) {
      showToast(errorText(e), "err");
    }
  };

  const handleLock = (user) => {
    setShowLockConfirm(user);
  };

  const confirmLock = async () => {
    if (!showLockConfirm) return;
    try {
      await lockAdminUser(showLockConfirm.user_id);
      showToast("Đã khóa tài khoản");
      setShowLockConfirm(null);
      loadUsers();
    } catch (e) {
      showToast(errorText(e), "err");
    }
  };

  const handleUnlock = async (user) => {
    try {
      await unlockAdminUser(user.user_id);
      showToast("Đã mở khóa tài khoản");
      loadUsers();
    } catch (e) { showToast(errorText(e), "err"); }
  };

  const formatLastActivity = (dtStr) => {
    if (!dtStr) return "Chưa từng hoạt động";
    try {
      const dt = new Date(dtStr);
      const diffSec = Math.floor((Date.now() - dt.getTime()) / 1000);
      if (diffSec < 60) return "Hoạt động vừa xong";
      if (diffSec < 3600) return `Hoạt động ${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `Hoạt động ${Math.floor(diffSec / 3600)} giờ trước`;
      const diffDays = Math.floor(diffSec / 86400);
      if (diffDays < 30) return `Hoạt động ${diffDays} ngày trước`;
      return `Hoạt động ngày ${dt.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`;
    } catch {
      return "Chưa từng hoạt động";
    }
  };

  const activeAdminCount = useMemo(() => {
    return users.filter(
      (u) =>
        canonicalRole(u.role) === "it_admin" &&
        (u.status || (u.is_active ? "active" : "locked")) === "active"
    ).length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "ALL") return users;
    return users.filter(
      (u) => (u.status || (u.is_active ? "active" : "locked")) === statusFilter
    );
  }, [users, statusFilter]);

  const handleResetPwd = async () => {
    try {
      await resetAdminUserPassword(showResetModal.user_id, resetPwd);
      showToast("Đã đặt lại mật khẩu");
      setShowResetModal(null);
      setResetPwd("");
    } catch (e) { showToast(errorText(e), "err"); }
  };

  const handleDelete = async () => {
    try {
      await deleteAdminUser(showDeleteConfirm.user_id);
      showToast("Đã xóa tài khoản");
      setShowDeleteConfirm(null);
      loadUsers();
    } catch (e) { showToast(errorText(e), "err"); }
  };

  const togglePermission = async (domain, role) => {
    const next = !permissions[domain]?.[role];
    try {
      await updateKnowledgePermission(domain, role, next);
      setPermissions((prev) => ({
        ...prev,
        [domain]: { ...prev[domain], [role]: next },
      }));
      showToast(
        isVi
          ? `Đã cập nhật quyền truy cập cho miền [${domain}] - vai trò [${role}]`
          : `Permission updated for [${domain}] - [${role}]`
      );
    } catch (e) {
      showToast(errorText(e), "err");
    }
  };

  const adminTabs = [
    { id: "granular_rbac", label: isVi ? "Ma trận Phân quyền Tri thức" : "Granular RBAC Matrix", icon: Sliders },
    { id: "perms", label: isVi ? "Phân quyền Miền (Cơ bản)" : "Knowledge Domains", icon: ShieldCheck },
    { id: "roles", label: isVi ? "Người dùng & Vai trò" : "Users & Role Personas", icon: Users },
    { id: "audit", label: isVi ? "Nhật ký Kiểm toán" : "Audit Trail", icon: ClipboardList },
    { id: "cost", label: isVi ? "Sử dụng AI & Chi phí" : "LLMOps & Cost", icon: TrendingUp },
  ];

  return (
    <div style={{ background: "var(--base)", minHeight: "100%", padding: "24px 32px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {toastMsg && (
          <div style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 100,
            background: "var(--surface)", border: `1px solid ${toastType === "err" ? "var(--red)" : "var(--border-strong)"}`,
            borderRadius: "var(--r-md)", padding: "12px 18px", boxShadow: "var(--shadow-xl)",
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 13, fontWeight: 600, color: "var(--text-1)",
            animation: "modalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {toastType === "err"
              ? <AlertTriangle size={16} color="var(--red)" />
              : <ShieldCheck size={16} color="var(--green)" />}
            <span>{toastMsg}</span>
          </div>
        )}

        {showAddModal && (
          <Modal title="Thêm người dùng mới" onClose={() => setShowAddModal(false)}>
            {[
              { label: "Email", key: "email", type: "email", placeholder: "test1@graphmind.ai" },
              { label: "Mật khẩu (≥8 ký tự)", key: "password", type: "password", placeholder: "••••••••" },
              { label: "Họ tên (tuỳ chọn)", key: "full_name", type: "text", placeholder: "Nguyễn Văn A" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 5 }}>{label}</label>
                <input
                  type={type} placeholder={placeholder} value={addForm[key]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "9px 12px",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)", color: "var(--text-1)", fontSize: 13, outline: "none"
                  }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 5 }}>Vai trò</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                style={{
                  width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                  border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                  color: "var(--text-1)", fontSize: 13
                }}
              >
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
              <Button variant="primary" size="sm" onClick={handleAddUser}>Tạo tài khoản</Button>
            </div>
          </Modal>
        )}

        {showResetModal && (
          <Modal title={`Đặt lại mật khẩu — ${showResetModal.email}`} onClose={() => setShowResetModal(null)}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 5 }}>Mật khẩu mới (≥8 ký tự)</label>
              <input
                type="password" value={resetPwd} placeholder="Nhập mật khẩu mới..."
                onChange={e => setResetPwd(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "9px 12px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)", color: "var(--text-1)", fontSize: 13, outline: "none"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowResetModal(null)}>Hủy</Button>
              <Button variant="primary" size="sm" onClick={handleResetPwd}>Đặt lại</Button>
            </div>
          </Modal>
        )}

        {showLockConfirm && (
          <Modal title="Xác nhận khóa tài khoản" onClose={() => setShowLockConfirm(null)}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 12 }}>
                Người dùng <strong style={{ color: "var(--text-1)" }}>{showLockConfirm.full_name || showLockConfirm.username || showLockConfirm.email}</strong> sẽ bị đăng xuất và không thể đăng nhập.
              </p>
              {canonicalRole(showLockConfirm.role) === "it_admin" && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "var(--r-sm)",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--red)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  marginBottom: 12
                }}>
                  <strong>CẢNH BÁO NGUY HIỂM:</strong> Bạn đang thực hiện khóa tài khoản Admin hệ thống. Hãy đảm bảo vẫn còn tài khoản quản trị khác hoạt động.
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowLockConfirm(null)}>Hủy</Button>
              <Button variant="danger" size="sm" onClick={confirmLock}>Xác nhận khóa</Button>
            </div>
          </Modal>
        )}

        {showDeleteConfirm && (
          <Modal title="Xác nhận xóa tài khoản" onClose={() => setShowDeleteConfirm(null)}>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20 }}>
              Bạn có chắc muốn xóa vĩnh viễn tài khoản <strong style={{ color: "var(--text-1)" }}>{showDeleteConfirm.email}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Xóa tài khoản</Button>
            </div>
          </Modal>
        )}

        <PageHeader
          title={t.admin_title || (isVi ? "Quản trị Hệ thống & Quản trị Tri thức" : "Administration & LLMOps Governance")}
          subtitle={t.admin_sub || (isVi
            ? "Phân quyền thực thể, danh bạ người dùng, nhật ký kiểm toán bất biến và điều phối chi phí mô hình AI"
            : "Entity domain permissions, user roles, immutable audit trail, and LLMOps telemetry")}
          breadcrumbs={[
            { label: "GraphMind", href: "#home" },
            { label: isVi ? "Hệ thống" : "System" },
            { label: isVi ? "Quản trị & An ninh" : "Admin & Governance" }
          ]}
          role="SecOps / Admin"
          roleVariant="amber"
        />

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)", padding: "8px 16px", boxShadow: "var(--shadow-xs)"
        }}>
          <Tabs tabs={adminTabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />
        </div>

        {activeTab === "granular_rbac" && (
          <GranularRbacMatrix />
        )}

        {activeTab === "perms" && (
          <Card
            title={isVi ? "Ma trận Phân quyền Truy cập Miền Tri thức (RBAC Matrix)" : "Role-Based Knowledge Access Control (RBAC Matrix)"}
            subtitle={isVi ? "Nhấp vào từng ô để lưu quyền lên PostgreSQL" : "Click cells to persist domain permissions"}
            icon={ShieldCheck}
          >
            {permsForbidden ? (
              <ForbiddenBanner message={permsForbidden} />
            ) : (
              <div style={{ overflowX: "auto", margin: "-6px -8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                        {isVi ? "Miền Tri thức" : "Knowledge Domain"}
                      </th>
                      {["Ban lãnh đạo", "Admin hệ thống", "Quản lý", "Nhân viên"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(permissions).map(([domain, roles]) => (
                      <tr key={domain} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600, textTransform: "capitalize" }}>{domain}</td>
                        {PERM_PERSONAS.map((r) => {
                          const hasPerm = roles[r];
                          return (
                            <td key={r} onClick={() => togglePermission(domain, r)}
                              style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "4px 10px", borderRadius: "var(--r-xs)", fontWeight: 700, fontSize: 11,
                                background: hasPerm ? "var(--green-soft)" : "var(--surface-3)",
                                color: hasPerm ? "var(--green)" : "var(--text-4)",
                                border: `1px solid ${hasPerm ? "rgba(5,150,105,0.25)" : "var(--border)"}`,
                              }}>
                                {hasPerm ? <Check size={12} strokeWidth={2.5} /> : <Ban size={12} strokeWidth={2.5} />}
                                <span>{hasPerm ? "ALLOWED" : "DENIED"}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "roles" && (
          <Card
            title={isVi ? "Danh bạ Tài khoản & Phân vai Doanh nghiệp" : "Enterprise Users & Role Personas"}
            subtitle={isVi ? "Dữ liệu lấy từ API PostgreSQL / RBAC thật" : "Live PostgreSQL RBAC directory"}
            icon={Users}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  padding: 2,
                  gap: 2
                }}>
                  {[
                    { id: "ALL", label: isVi ? "Tất cả" : "All" },
                    { id: "active", label: isVi ? "Hoạt động" : "Active" },
                    { id: "locked", label: isVi ? "Đã khóa" : "Locked" },
                  ].map((btn) => {
                    const isSelected = statusFilter === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setStatusFilter(btn.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "var(--r-xs)",
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? "var(--surface)" : "transparent",
                          color: isSelected ? "var(--text-1)" : "var(--text-3)",
                          border: isSelected ? "1px solid var(--border)" : "none",
                          boxShadow: isSelected ? "var(--shadow-xs)" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadUsers}>
                  {isVi ? "Tải lại" : "Refresh"}
                </Button>
                <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setShowAddModal(true)} disabled={Boolean(usersForbidden)}>
                  {isVi ? "+ Thêm Người dùng" : "+ Add User"}
                </Button>
              </div>
            }
          >
            {usersForbidden ? (
              <ForbiddenBanner message={usersForbidden} />
            ) : usersLoading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-4)", fontSize: 13 }}>
                <RefreshCw size={18} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
                <div>Đang tải danh sách người dùng...</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto", margin: "-6px -8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                      {["Người dùng", "Email", "Vai trò", "Trạng thái", "Thao tác"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const role = canonicalRole(u.role);
                      const isSelf = String(u.user_id) === String(session.userId);
                      const isAdministrator = u.email === "admin@graphmind.ai" || u.username === "admin" || u.full_name === "Administrator";
                      const isLocked = (u.status || (u.is_active ? "active" : "locked")) === "locked";
                      const isSystemAdmin = role === "it_admin";
                      const isLastAdmin = isSystemAdmin && !isLocked && activeAdminCount <= 1;

                      // Online indicator calculation (within 5 minutes AND status === 'active')
                      const lastActivity = u.last_active_at || u.last_login_at;
                      const isOnline = Boolean(
                        !isLocked &&
                        (u.status || (u.is_active ? "active" : "locked")) === "active" &&
                        lastActivity &&
                        (Date.now() - new Date(lastActivity).getTime()) <= 5 * 60 * 1000
                      );

                      return (
                        <tr
                          key={u.user_id}
                          style={{
                            borderBottom: "1px solid var(--border-soft)",
                            opacity: isLocked ? 0.65 : 1,
                            transition: "opacity 0.2s ease",
                          }}
                        >
                          <td style={{ padding: "12px 16px", color: "var(--text-1)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                title={isOnline ? "Đang hoạt động" : (lastActivity ? formatLastActivity(lastActivity) : "Chưa từng hoạt động")}
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: isOnline ? "#10b981" : "#9ca3af",
                                  boxShadow: isOnline ? "0 0 6px rgba(16, 185, 129, 0.6)" : "none",
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{u.full_name || u.username || "—"}</div>
                                <div
                                  title={isOnline ? "Đang hoạt động" : (lastActivity ? formatLastActivity(lastActivity) : "Chưa từng hoạt động")}
                                  style={{
                                    fontSize: 11,
                                    marginTop: 2,
                                    whiteSpace: "nowrap",
                                    color: isOnline ? "#10b981" : "#9ca3af",
                                    fontWeight: isOnline ? 600 : 400,
                                  }}
                                >
                                  {isOnline ? "Đang hoạt động" : formatLastActivity(lastActivity)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>
                            {u.email}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <select
                              disabled={isSelf || isAdministrator}
                              value={role}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              title={isSelf ? "Không thể đổi role của chính mình" : (isAdministrator ? "Không thể đổi role của Administrator" : "")}
                              style={{
                                padding: "5px 8px", borderRadius: "var(--r-xs)", fontSize: 12, fontWeight: 600,
                                background: "var(--surface-2)", border: "1px solid var(--border)",
                                color: "var(--text-1)",
                                cursor: (isSelf || isAdministrator) ? "not-allowed" : "pointer",
                                opacity: (isSelf || isAdministrator) ? 0.5 : 1,
                              }}
                            >
                              {ROLE_OPTIONS.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <Badge variant={isLocked ? "danger" : "success"} size="sm">
                              {isLocked ? "Đã khóa" : "Hoạt động"}
                            </Badge>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {!isLocked ? (
                                <button
                                  type="button"
                                  title={
                                    isSelf
                                      ? "Không thể tự khóa tài khoản của chính mình"
                                      : isLastAdmin
                                      ? "Không thể khóa Admin hệ thống duy nhất đang hoạt động"
                                      : "Khóa tài khoản"
                                  }
                                  disabled={isSelf || isLastAdmin}
                                  onClick={() => handleLock(u)}
                                  style={{
                                    padding: "5px 8px",
                                    background: "var(--surface-3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--r-xs)",
                                    cursor: (isSelf || isLastAdmin) ? "not-allowed" : "pointer",
                                    color: (isSelf || isLastAdmin) ? "var(--text-4)" : "var(--red)",
                                    opacity: (isSelf || isLastAdmin) ? 0.5 : 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  <Lock size={12} /> Khóa
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Mở khóa tài khoản"
                                  onClick={() => handleUnlock(u)}
                                  style={{
                                    padding: "5px 8px",
                                    background: "var(--surface-3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--r-xs)",
                                    cursor: "pointer",
                                    color: "var(--text-1)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  <Unlock size={12} /> Mở khóa
                                </button>
                              )}
                              <button
                                type="button"
                                title="Đặt lại mật khẩu"
                                onClick={() => setShowResetModal(u)}
                                style={{
                                  padding: "5px 8px",
                                  background: "var(--surface-3)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--r-xs)",
                                  cursor: "pointer",
                                  color: "var(--blue)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                <KeyRound size={12} /> Đặt lại mật khẩu
                              </button>
                              {!isSelf && !isAdministrator && (
                                <button
                                  type="button"
                                  title="Xóa tài khoản"
                                  onClick={() => setShowDeleteConfirm(u)}
                                  style={{
                                    padding: "5px 8px",
                                    background: "var(--surface-3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--r-xs)",
                                    cursor: "pointer",
                                    color: "var(--red)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  <Trash2 size={12} /> Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-4)", fontSize: 13 }}>
                          {statusFilter !== "ALL" ? "Không có người dùng nào phù hợp với bộ lọc." : "Chưa có người dùng nào."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "audit" && (
          <Card
            title={isVi ? "Nhật ký Hoạt động Bất biến (Immutable Audit Trail)" : "Immutable Activity & Security Audit Trail"}
            subtitle={isVi ? "USER_CREATE, ROLE_CHANGE, USER_LOCK, PASSWORD_RESET, USER_DELETE, LOGIN" : "Account and login events"}
            icon={ClipboardList}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 220 }}>
                  <SearchInput
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder={isVi ? "Lọc theo tài khoản..." : "Filter by account..."}
                  />
                </div>
                <select
                  value={auditResourceType}
                  onChange={(e) => setAuditResourceType(e.target.value)}
                  style={{
                    padding: "7px 10px", background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)", color: "var(--text-1)", fontSize: 12
                  }}
                >
                  {RESOURCE_TYPES.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadAudit}>
                  Tải lại
                </Button>
              </div>
            }
          >
            {auditForbidden ? (
              <ForbiddenBanner message={auditForbidden} />
            ) : auditLoading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-4)", fontSize: 13 }}>
                <RefreshCw size={18} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
                <div>Đang tải nhật ký...</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-4)" }}>
                  Hiển thị {auditLogs.length} / {auditTotal} dòng
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {auditLogs.map((log) => (
                    <div key={log.audit_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", fontSize: 12.5
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
                        <Badge variant={ACTION_VARIANT[log.action] || "info"} size="sm">{log.action}</Badge>
                        <Badge variant="neutral" size="sm">{(log.resource_type || "").toUpperCase() || "—"}</Badge>
                        <span style={{ color: "var(--text-2)" }}>{log.detail || "—"}</span>
                      </div>
                      <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-4)", fontSize: 11, flexShrink: 0, marginLeft: 12 }}>
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-4)", fontSize: 13 }}>
                      Không có nhật ký nào phù hợp.
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        {activeTab === "cost" && (
          <Card
            title={isVi ? "Điều phối Mô hình AI & Quản trị Chi phí (LLMOps)" : "LLMOps AI Telemetry & Cost Governance"}
            subtitle={isVi ? "Theo dõi lưu lượng token thời gian thực, độ trễ và hạn mức ngân sách phòng ban" : "Real-time token throughput, inference latency, and budget guardrails"}
            icon={TrendingUp}
            actions={<Badge variant="info">HYBRID GRAPHRAG ACTIVE</Badge>}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
              <StatCard label={isVi ? "Tổng token (30 ngày)" : "Total Tokens (30D)"} value="18.4M" sub="Prompt: 11.2M · Completion: 7.2M" trend="12% vs last month" isPositive={true} color="blue" />
              <StatCard label={isVi ? "Số truy vấn suy luận" : "AI Inferences"} value="54,180" sub="Avg. latency: 2.1s (Graph + Qdrant)" trend="Stable" color="cyan" />
              <StatCard label={isVi ? "Ước tính chi phí" : "Estimated Cost"} value="$312" sub="Across 3 active business units" trend="Under monthly cap" isPositive={true} color="green" />
              <StatCard label={isVi ? "Tỷ lệ trích dẫn bằng chứng" : "Citation Coverage"} value="94%" sub="Of answers cite ≥1 verified node" trend="+3.2% vs target" isPositive={true} color="amber" />
            </div>
            <div style={{
              background: "var(--surface-2)", padding: "20px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 12
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                  {isVi ? "Hạn mức ngân sách hàng tháng:" : "Monthly Token Expenditure Limit:"}
                </label>
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--blue)", fontSize: 14 }}>
                  ${budgetLimit} / mo
                </span>
              </div>
              <input type="range" min="200" max="2000" step="50" value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--blue)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-4)" }}>
                <span>$200 (Min)</span><span>$500 (Current Cap)</span><span>$2,000 (Enterprise Tier)</span>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
