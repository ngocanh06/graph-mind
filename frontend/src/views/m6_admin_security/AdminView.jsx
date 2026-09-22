import React, { useState } from "react";

export default function AdminView({ onNavigate, t, lang }) {
  const isVi = lang === "vi";
  const [activeTab, setActiveTab] = useState("perms"); // "perms" | "roles" | "audit" | "cost"
  const [auditQuery, setAuditQuery] = useState("");
  const [budgetLimit, setBudgetLimit] = useState(500);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const [permissions, setPermissions] = useState({
    customer: { exec: true, admin: true, manager: true, ops: true },
    orders: { exec: true, admin: true, manager: true, ops: true },
    payroll: { exec: true, admin: true, manager: false, ops: false },
    contracts: { exec: true, admin: true, manager: true, ops: false },
    risk: { exec: true, admin: true, manager: true, ops: false },
    sop: { exec: true, admin: true, manager: true, ops: true }
  });

  const togglePermission = (domain, role) => {
    setPermissions((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [role]: !prev[domain][role]
      }
    }));
    showToast(isVi ? `Đã cập nhật quyền truy cập cho miền [${domain}] - vai trò [${role}]` : `Permission updated for [${domain}] - [${role}]`);
  };

  const AUDIT_LOGS = [
    { id: "log-1", time: "10:14:22", user: "Executive Board", action: "Generated Executive Strategic Briefing #EKMP-REP-2026-Q3", type: "INFO" },
    { id: "log-2", time: "10:08:45", user: "Tran M. Anh", action: "HITL Verification committed: Contract_CT-2026-18.pdf (4 entities)", type: "SECURITY" },
    { id: "log-3", time: "09:42:10", user: "AI Engine", action: "Automated risk trigger: Customer ABC Corp order cadence fell 32%", type: "WARNING" },
    { id: "log-4", time: "09:12:00", user: "Google Drive Connector", action: "Synced 14 new documents; 4,208 entities verified intact", type: "SYNC" },
    { id: "log-5", time: "08:30:15", user: "Le V. Hung", action: "Updated financial reconciliation report for SOP-04", type: "INFO" }
  ];

  const filteredLogs = AUDIT_LOGS.filter((log) => {
    if (!auditQuery.trim()) return true;
    const q = auditQuery.toLowerCase();
    return log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.type.toLowerCase().includes(q);
  });

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-user-shield text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="section-label">{t.admin_title || (isVi ? "Quản trị Hệ thống & Quản trị Tri thức" : "Administration & LLMOps Governance")}</div>
          <div className="section-sub">{t.admin_sub || (isVi ? "Phân quyền thực thể, danh bạ người dùng, nhật ký kiểm toán và chi phí mô hình" : "Entity domain permissions, user roles, immutable audit trail, and LLMOps telemetry")}</div>
        </div>

        <div className="flex items-center gap-space-xs">
          <span className="font-code-sm text-code-sm bg-surface-container-high px-space-sm py-space-2xs rounded-DEFAULT text-green-500 font-bold">
            HEALTH: 100% SECURE
          </span>
        </div>
      </div>

      {/* ADMIN TABS NAVIGATION */}
      <div className="admin-tabs flex flex-wrap gap-space-2xs bg-surface-container-low p-space-2xs rounded-lg border border-outline-variant/30" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {[
          { id: "perms", label: isVi ? "Phân quyền Tri thức" : "Knowledge Permissions", icon: "fa-solid fa-shield-halved", color: "#0284c7" },
          { id: "roles", label: isVi ? "Người dùng & Vai trò" : "Users & Role Personas", icon: "fa-solid fa-users-gear", color: "#8b5cf6" },
          { id: "audit", label: isVi ? "Nhật ký Kiểm toán (Audit)" : "Audit Trail", icon: "fa-solid fa-clipboard-list", color: "#f59e0b" },
          { id: "cost", label: isVi ? "Sử dụng AI & Chi phí (LLMOps)" : "LLMOps & Cost Governance", icon: "fa-solid fa-chart-line", color: "#10b981" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "var(--r-sm)",
              fontSize: "12.5px",
              fontWeight: activeTab === tab.id ? "700" : "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === tab.id ? "var(--surface)" : "transparent",
              color: activeTab === tab.id ? "var(--text-1)" : "var(--text-3)",
              border: activeTab === tab.id ? "1px solid var(--border-strong)" : "1px solid transparent",
              boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none"
            }}
          >
            <i className={tab.icon} style={{ fontSize: "14px", color: tab.color }}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KNOWLEDGE PERMISSIONS MATRIX                      */}
      {/* ======================================================== */}
      {activeTab === "perms" && (
        <div className="panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-1)" }}>
              {isVi ? "Ma trận Phân quyền Truy cập Miền Tri thức (RBAC Matrix)" : "Role-Based Knowledge Access Control (RBAC Matrix)"}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
              {isVi ? "Nhấp vào ô để bật/tắt quyền truy xuất miền tri thức" : "Click cells to toggle domain permissions"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm border-collapse">
              <thead>
                <tr style={{ background: "var(--surface-2)", color: "var(--text-2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 14px", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Miền Tri thức" : "Knowledge Domain"}</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Ban Lãnh Đạo (C-Suite/CEO)" : "Executive Board"}</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Admin (HT & Tri thức)" : "Sys & Knowledge Admin"}</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Quản lý Cấp trung" : "Middle Manager"}</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Chuyên viên Kinh doanh (Sales)" : "Sales Executive"}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(permissions).map(([domain, roles]) => (
                  <tr key={domain} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: "600", textTransform: "capitalize", color: "var(--text-1)" }}>
                      {domain}
                    </td>
                    {["exec", "admin", "manager", "ops"].map((r) => {
                      const hasPerm = roles[r];
                      return (
                        <td
                          key={r}
                          onClick={() => togglePermission(domain, r)}
                          style={{ padding: "10px 14px", textAlign: "center", cursor: "pointer" }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              fontSize: "11px",
                              background: hasPerm ? "rgba(5, 150, 105, 0.12)" : "var(--surface-3)",
                              color: hasPerm ? "var(--green)" : "var(--text-4)",
                              border: `1px solid ${hasPerm ? "rgba(5, 150, 105, 0.25)" : "var(--border)"}`
                            }}
                          >
                            <i className={`fa-solid ${hasPerm ? "fa-check" : "fa-ban"}`} style={{ fontSize: "10px" }}></i>
                            {hasPerm ? "ALLOWED" : "DENIED"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USERS & ROLE PERSONAS                             */}
      {/* ======================================================== */}
      {activeTab === "roles" && (
        <div className="panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
            <span className="font-title-sm text-title-sm font-bold text-on-surface">
              {isVi ? "Danh bạ Tài khoản & Phân vai Doanh nghiệp" : "Enterprise Users & Role Personas"}
            </span>
            <button
              onClick={() => showToast(isVi ? "Đã mở hộp thoại thêm người dùng mới!" : "Invite user dialog opened!")}
              className="btn primary sm"
            >
              <i className="fa-solid fa-user-plus" style={{ marginRight: "6px" }}></i>
              {isVi ? "Thêm Người dùng" : "Add User"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/30 text-outline font-label-caps text-label-caps uppercase">
                  <th className="p-space-sm">{isVi ? "Người dùng" : "Name"}</th>
                  <th className="p-space-sm">{isVi ? "Email / ID" : "Email"}</th>
                  <th className="p-space-sm">{isVi ? "Vai trò Persona" : "Role Persona"}</th>
                  <th className="p-space-sm">{isVi ? "Xác thực 2FA" : "2FA"}</th>
                  <th className="p-space-sm">{isVi ? "Lần đăng nhập cuối" : "Last Active"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-space-sm font-semibold text-on-surface">Hoàng Minh Điều (CEO)</td>
                  <td className="p-space-sm text-outline font-mono">executive@graphmind.ai</td>
                  <td className="p-space-sm"><span className="pill red uppercase font-bold text-[10px]">{isVi ? "BAN LÃNH ĐẠO (CEO / C-SUITE)" : "EXECUTIVE (CEO / C-SUITE)"}</span></td>
                  <td className="p-space-sm text-green-500 font-bold">Hardware Token</td>
                  <td className="p-space-sm text-primary font-bold">Active Now</td>
                </tr>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-space-sm font-semibold text-on-surface">SecOps Admin</td>
                  <td className="p-space-sm text-outline font-mono">admin@graphmind.ai</td>
                  <td className="p-space-sm"><span className="pill amber uppercase font-bold text-[10px]">{isVi ? "ADMIN HỆ THỐNG & TRI THỨC" : "SYS & KNOWLEDGE ADMIN"}</span></td>
                  <td className="p-space-sm text-green-500 font-bold">Hardware Token</td>
                  <td className="p-space-sm text-outline">5 min ago</td>
                </tr>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-space-sm font-semibold text-on-surface">Trần M. Anh</td>
                  <td className="p-space-sm text-outline font-mono">manager@graphmind.ai</td>
                  <td className="p-space-sm"><span className="pill green uppercase font-bold text-[10px]">{isVi ? "QUẢN LÝ CẤP TRUNG (TRƯỞNG PHÒNG)" : "DEPARTMENT MANAGER"}</span></td>
                  <td className="p-space-sm text-green-500 font-bold">Enabled</td>
                  <td className="p-space-sm text-outline">10 min ago</td>
                </tr>
                <tr>
                  <td className="p-space-sm font-semibold text-on-surface">Nguyễn V. Nam</td>
                  <td className="p-space-sm text-outline font-mono">sales@graphmind.ai</td>
                  <td className="p-space-sm"><span className="pill cyan uppercase font-bold text-[10px]">{isVi ? "CHUYÊN VIÊN KINH DOANH (SALES)" : "SALES EXECUTIVE"}</span></td>
                  <td className="p-space-sm text-green-500 font-bold">Enabled</td>
                  <td className="p-space-sm text-outline">25 min ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: IMMUTABLE AUDIT TRAIL                             */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <div className="panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/20">
            <span className="font-title-sm text-title-sm font-bold text-on-surface">
              {isVi ? "Nhật ký Hoạt động Bất biến (Immutable Audit Trail)" : "Immutable Activity & Security Audit Trail"}
            </span>

            <input
              type="text"
              placeholder={isVi ? "Lọc nhật ký theo tên, hành động hoặc mức độ..." : "Filter audit log..."}
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              className="bg-surface-container text-on-surface px-space-sm py-space-2xs rounded-DEFAULT border border-outline-variant/30 text-body-sm w-full sm:w-[260px]"
            />
          </div>

          <div className="flex flex-col gap-space-xs">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-space-sm bg-surface-container rounded-DEFAULT border border-outline-variant/10 text-body-sm"
              >
                <div className="flex items-center gap-space-sm">
                  <span className={`px-space-xs py-space-2xs rounded-DEFAULT font-mono text-[10px] font-bold ${
                    log.type === "SECURITY" ? "bg-green-500/20 text-green-500" : log.type === "WARNING" ? "bg-error/20 text-error" : "bg-primary/20 text-primary"
                  }`}>
                    {log.type}
                  </span>
                  <span className="font-semibold text-on-surface">{log.user}:</span>
                  <span className="text-on-surface-variant">{log.action}</span>
                </div>
                <span className="font-mono text-outline text-caption shrink-0 ml-2">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: LLMOPS AI USAGE & COST GOVERNANCE                 */}
      {/* ======================================================== */}
      {activeTab === "cost" && (
        <div className="panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
            <div>
              <span className="font-title-sm text-title-sm font-bold text-on-surface">
                {isVi ? "Điều phối Mô hình AI & Quản trị Chi phí (LLMOps)" : "LLMOps AI Telemetry & Cost Governance"}
              </span>
              <p className="text-body-sm text-on-surface-variant">
                {isVi ? "Theo dõi lưu lượng token thời gian thực, độ trễ và hạn mức ngân sách phòng ban" : "Real-time token throughput, inference latency, and budget guardrails"}
              </p>
            </div>
            <span className="font-label-caps text-label-caps bg-primary/20 text-primary px-space-sm py-space-2xs rounded-DEFAULT font-bold">
              HYBRID GRAPHRAG ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
            <div className="cost-box bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
              <div className="cb-label font-label-caps text-label-caps text-outline uppercase">{isVi ? "Tổng token (30 ngày)" : "Total Tokens (30D)"}</div>
              <div className="cb-val font-metric-tabular-lg text-metric-tabular-lg text-primary font-bold my-1">18.4M</div>
              <div className="cb-sub text-caption text-outline">Prompt: 11.2M · Completion: 7.2M</div>
            </div>

            <div className="cost-box bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
              <div className="cb-label font-label-caps text-label-caps text-outline uppercase">{isVi ? "Số truy vấn suy luận" : "AI Inferences"}</div>
              <div className="cb-val font-metric-tabular-lg text-metric-tabular-lg text-on-surface font-bold my-1">54,180</div>
              <div className="cb-sub text-caption text-outline">Avg. response latency: 2.1s</div>
            </div>

            <div className="cost-box bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
              <div className="cb-label font-label-caps text-label-caps text-outline uppercase">{isVi ? "Ước tính chi phí" : "Estimated Cost"}</div>
              <div className="cb-val font-metric-tabular-lg text-metric-tabular-lg text-green-500 font-bold my-1">$312</div>
              <div className="cb-sub text-caption text-outline">Across 3 active business units</div>
            </div>

            <div className="cost-box bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
              <div className="cb-label font-label-caps text-label-caps text-outline uppercase">{isVi ? "Tỷ lệ trích dẫn bằng chứng" : "Citation Coverage"}</div>
              <div className="cb-val font-metric-tabular-lg text-metric-tabular-lg text-green-500 font-bold my-1">94%</div>
              <div className="cb-sub text-caption text-outline">Of answers cite ≥1 L5 verified source</div>
            </div>
          </div>

          {/* Budget Quota Slider */}
          <div className="bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20 flex flex-col gap-space-xs">
            <div className="flex justify-between items-center">
              <label className="font-body-sm text-body-sm font-semibold text-on-surface">
                {isVi ? "Hạn mức ngân sách hàng tháng (Monthly Budget Quota):" : "Monthly Token Expenditure Limit:"}
              </label>
              <span className="font-code-sm text-code-sm font-bold text-primary">${budgetLimit} / mo</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(Number(e.target.value))}
              className="w-full cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-caption text-outline">
              <span>$200 (Min)</span>
              <span>$500 (Current Cap)</span>
              <span>$2,000 (Enterprise)</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
