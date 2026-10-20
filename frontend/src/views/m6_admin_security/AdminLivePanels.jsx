/**
 * Admin Panel — CRUD tài khoản + gán vai trò RBAC + tra cứu Audit Log (PB02 – US13).
 * Gọi /api/v1/admin/* (cần JWT role it_admin, lấy từ localStorage qua getAuthHeaders).
 */
import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Lock, Unlock, KeyRound, Trash2, ClipboardList, Users, RefreshCw } from "lucide-react";
import { Badge, Button, Card, SearchInput } from "../../components/ui";
import { getAuthHeaders } from "../../services/api";

const ADMIN_API = "http://localhost:5000/api/v1/admin";
const ROLES = [
  { id: "executive", vi: "Ban lãnh đạo", en: "Executive", badge: "danger" },
  { id: "admin", vi: "Admin hệ thống", en: "Sys Admin", badge: "warning" },
  { id: "department_manager", vi: "Quản lý / Trưởng phòng", en: "Manager", badge: "success" },
  { id: "standard_user", vi: "Nhân viên", en: "Standard", badge: "info" },
];

async function call(path, method = "GET", body) {
  const res = await fetch(`${ADMIN_API}${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg).join("; ") : `HTTP ${res.status}`);
  }
  return data;
}

const th = { padding: "12px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase" };
const td = { padding: "12px 16px" };
const field = {
  padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
  background: "var(--surface)", color: "var(--text-1)", fontSize: 13, minWidth: 0,
};
const fmt = (v, vi) => (v ? new Date(v).toLocaleString(vi ? "vi-VN" : "en-GB") : "—");

export function UserManagementPanel({ lang = "vi", showToast = () => {} }) {
  const isVi = lang === "vi";
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null = đóng form
  const me = (() => { try { return JSON.parse(localStorage.getItem("aegis_auth_user") || "{}"); } catch { return {}; } })();

  const load = useCallback(() => {
    call("/users").then((d) => { setUsers(d); setError(""); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn, okMsg) => {
    try { await fn(); showToast(okMsg); load(); } catch (e) { showToast(`⚠ ${e.message}`); }
  };

  const submit = (e) => {
    e.preventDefault();
    run(async () => { await call("/users", "POST", form); setForm(null); }, isVi ? "Đã tạo tài khoản" : "User created");
  };

  const resetPw = (u) => {
    const pw = window.prompt(isVi ? `Mật khẩu mới cho ${u.email} (≥ 8 ký tự):` : `New password for ${u.email} (min 8 chars):`);
    if (pw) run(() => call(`/users/${u.id}/reset-password`, "POST", { new_password: pw }), isVi ? "Đã đặt lại mật khẩu" : "Password reset");
  };

  const del = (u) => {
    if (window.confirm(isVi ? `Xóa vĩnh viễn ${u.email}?` : `Permanently delete ${u.email}?`))
      run(() => call(`/users/${u.id}`, "DELETE"), isVi ? "Đã xóa tài khoản" : "User deleted");
  };

  return (
    <Card
      title={isVi ? "Quản lý Tài khoản & Phân quyền RBAC" : "User Accounts & RBAC"}
      subtitle={isVi ? "Tạo / sửa / khóa / xóa tài khoản và gán vai trò — mọi thao tác được ghi Audit Log" : "Create, lock, delete accounts and assign roles — every action is audit-logged"}
      icon={Users}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>{isVi ? "Tải lại" : "Refresh"}</Button>
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setForm({ email: "", password: "", full_name: "", username: "", role: "standard_user" })}>
            {isVi ? "Thêm Người dùng" : "Add User"}
          </Button>
        </div>
      }
    >
      {error && (
        <div style={{ color: "var(--red, #dc2626)", fontSize: 13, marginBottom: 12 }}>
          ⚠ {error} {isVi ? "(cần đăng nhập bằng tài khoản Admin hệ thống)" : "(sign in as a System Admin)"}
        </div>
      )}

      {form && (
        <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, padding: 14, background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--border-soft)" }}>
          <input style={field} required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input style={field} placeholder={isVi ? "Họ tên" : "Full name"} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input style={field} placeholder={isVi ? "Tên đăng nhập" : "Username"} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value || null })} />
          <input style={field} required minLength={8} type="password" placeholder={isVi ? "Mật khẩu khởi tạo (≥ 8)" : "Initial password (≥ 8)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select style={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{isVi ? r.vi : r.en}</option>)}
          </select>
          <Button variant="primary" size="sm" type="submit">{isVi ? "Tạo" : "Create"}</Button>
          <Button variant="secondary" size="sm" type="button" onClick={() => setForm(null)}>{isVi ? "Hủy" : "Cancel"}</Button>
        </form>
      )}

      <div style={{ overflowX: "auto", margin: "-6px -8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>{isVi ? "Người dùng" : "Name"}</th>
              <th style={th}>Email</th>
              <th style={th}>{isVi ? "Vai trò" : "Role"}</th>
              <th style={th}>{isVi ? "Trạng thái" : "Status"}</th>
              <th style={th}>{isVi ? "Đăng nhập cuối" : "Last login"}</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === me.id;
              const roleId = ROLES.some((r) => r.id === u.role) ? u.role : "";
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ ...td, fontWeight: 600, color: "var(--text-1)" }}>{u.full_name || u.username || "—"}</td>
                  <td style={{ ...td, fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--text-3)" }}>{u.email}</td>
                  <td style={td}>
                    <select
                      style={field} value={roleId} disabled={isMe}
                      onChange={(e) => run(() => call(`/users/${u.id}/role`, "PUT", { role: e.target.value }), isVi ? "Đã đổi vai trò" : "Role updated")}
                    >
                      {!roleId && <option value="">{u.role} (legacy)</option>}
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{isVi ? r.vi : r.en}</option>)}
                    </select>
                  </td>
                  <td style={td}><Badge variant={u.is_active ? "success" : "danger"} size="sm">{u.is_active ? (isVi ? "Hoạt động" : "Active") : (isVi ? "Đã khóa" : "Locked")}</Badge></td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-3)" }}>{fmt(u.last_login_at, isVi)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <Button variant="secondary" size="sm" icon={u.is_active ? Lock : Unlock} disabled={isMe}
                      onClick={() => run(() => call(`/users/${u.id}/lock?locked=${u.is_active}`, "POST"), u.is_active ? (isVi ? "Đã khóa" : "Locked") : (isVi ? "Đã mở khóa" : "Unlocked"))} />{" "}
                    <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => resetPw(u)} />{" "}
                    <Button variant="secondary" size="sm" icon={Trash2} disabled={isMe} onClick={() => del(u)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AuditLogPanel({ lang = "vi" }) {
  const isVi = lang === "vi";
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState("");
  const [resource, setResource] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams({ limit: "200" });
    if (q.trim()) p.set("actor", q.trim());
    if (resource) p.set("resource_type", resource);
    call(`/audit-logs?${p}`).then((d) => { setLogs(d); setError(""); }).catch((e) => setError(e.message));
  }, [q, resource]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <Card
      title={isVi ? "Nhật ký Kiểm toán (Audit Log)" : "Audit Log"}
      subtitle={isVi ? "Thời gian · tài khoản thực hiện · hành động · đối tượng bị tác động" : "Time · actor · action · affected resource"}
      icon={ClipboardList}
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={field} value={resource} onChange={(e) => setResource(e.target.value)}>
            <option value="">{isVi ? "Mọi đối tượng" : "All resources"}</option>
            <option value="user">user</option>
            <option value="neo4j_node">neo4j_node</option>
            <option value="qdrant_point">qdrant_point</option>
          </select>
          <div style={{ width: 240 }}><SearchInput value={q} onChange={setQ} placeholder={isVi ? "Lọc theo tài khoản..." : "Filter by actor..."} /></div>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} />
        </div>
      }
    >
      {error && <div style={{ color: "var(--red, #dc2626)", fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
      <div style={{ overflowX: "auto", margin: "-6px -8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>{isVi ? "Thời gian" : "Time"}</th>
              <th style={th}>{isVi ? "Tài khoản" : "Actor"}</th>
              <th style={th}>{isVi ? "Hành động" : "Action"}</th>
              <th style={th}>{isVi ? "Đối tượng" : "Resource"}</th>
              <th style={th}>{isVi ? "Chi tiết" : "Detail"}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ ...td, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-4)", whiteSpace: "nowrap" }}>{fmt(l.time, isVi)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{l.actor || "system"}</td>
                <td style={td}><Badge variant={l.status === "success" ? "info" : "danger"} size="sm">{l.action}</Badge></td>
                <td style={{ ...td, fontFamily: "var(--f-mono)", fontSize: 11 }}>{l.resource_type}{l.resource_id ? `:${l.resource_id.slice(0, 8)}` : ""}</td>
                <td style={{ ...td, color: "var(--text-3)", fontSize: 11 }}>{l.detail ? JSON.stringify(l.detail) : ""}</td>
              </tr>
            ))}
            {!logs.length && !error && (
              <tr><td style={{ ...td, color: "var(--text-4)" }} colSpan={5}>{isVi ? "Chưa có bản ghi." : "No entries."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
