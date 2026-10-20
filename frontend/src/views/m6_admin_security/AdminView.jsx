import React, { useState } from "react";
import {
  ShieldCheck, Users, ClipboardList, TrendingUp, UserPlus,
  Check, Ban, Shield, Activity, Sparkles,
  Sliders, DollarSign, Clock, CheckCircle2, AlertTriangle,
  Lock, KeyRound, Cpu
} from "lucide-react";
import {
  PageHeader, Tabs, Badge, Button, SearchInput, Card, StatCard
} from "../../components/ui";
import { UserManagementPanel, AuditLogPanel } from "./AdminLivePanels";

export default function AdminView({ onNavigate, t = {}, lang = "vi" }) {
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
    showToast(
      isVi
        ? `Đã cập nhật quyền truy cập cho miền [${domain}] - vai trò [${role}]`
        : `Permission updated for [${domain}] - [${role}]`
    );
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

  const usersList = [
    { name: "Hoàng Minh Điều (CEO)", email: "executive@graphmind.ai", role: isVi ? "BAN LÃNH ĐẠO (CEO / C-SUITE)" : "EXECUTIVE (CEO / C-SUITE)", roleBadge: "red", auth: "Hardware Token (FIDO2)", lastActive: "Active Now" },
    { name: "SecOps Admin", email: "admin@graphmind.ai", role: isVi ? "ADMIN HỆ THỐNG & TRI THỨC" : "SYS & KNOWLEDGE ADMIN", roleBadge: "amber", auth: "Hardware Token (FIDO2)", lastActive: "5 min ago" },
    { name: "Trần M. Anh", email: "manager@graphmind.ai", role: isVi ? "QUẢN LÝ CẤP TRUNG (TRƯỞNG PHÒNG)" : "DEPARTMENT MANAGER", roleBadge: "green", auth: "2FA App (TOTP)", lastActive: "10 min ago" },
    { name: "Nguyễn V. Nam", email: "sales@graphmind.ai", role: isVi ? "CHUYÊN VIÊN KINH DOANH (SALES)" : "SALES EXECUTIVE", roleBadge: "cyan", auth: "2FA App (TOTP)", lastActive: "25 min ago" }
  ];

  const adminTabs = [
    { id: "perms", label: isVi ? "Phân quyền Tri thức" : "Knowledge Permissions", icon: ShieldCheck },
    { id: "roles", label: isVi ? "Người dùng & Vai trò" : "Users & Role Personas", icon: Users },
    { id: "audit", label: isVi ? "Nhật ký Kiểm toán (Audit)" : "Audit Trail", icon: ClipboardList },
    { id: "cost", label: isVi ? "Sử dụng AI & Chi phí (LLMOps)" : "LLMOps & Cost Governance", icon: TrendingUp }
  ];

  return (
    <div style={{ background: "var(--base)", minHeight: "100%", padding: "24px 32px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Global Toast */}
        {toastMsg && (
          <div style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-md)",
            padding: "12px 18px",
            boxShadow: "var(--shadow-xl)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            animation: "modalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <ShieldCheck size={16} color="var(--green)" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── UNIFIED PAGE HEADER ───────────────────────────── */}
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
          actions={
            <Badge variant="success" dot={true}>
              HEALTH: 100% SECURE
            </Badge>
          }
        />

        {/* ── TABS NAVIGATION ─────────────────────────────────── */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: "8px 16px",
          boxShadow: "var(--shadow-xs)"
        }}>
          <Tabs
            tabs={adminTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />
        </div>

        {/* ── TAB 1: KNOWLEDGE PERMISSIONS MATRIX ─────────────── */}
        {activeTab === "perms" && (
          <Card
            title={isVi ? "Ma trận Phân quyền Truy cập Miền Tri thức (RBAC Matrix)" : "Role-Based Knowledge Access Control (RBAC Matrix)"}
            subtitle={isVi ? "Nhấp vào từng ô để kích hoạt hoặc thu hồi quyền truy xuất miền tri thức theo vai trò" : "Click cells to toggle domain permissions per role persona"}
            icon={ShieldCheck}
          >
            <div style={{ overflowX: "auto", margin: "-6px -8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isVi ? "Miền Tri thức" : "Knowledge Domain"}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isVi ? "Ban Lãnh Đạo (C-Suite)" : "Executive Board"}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isVi ? "Admin Hệ thống" : "Sys Admin"}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isVi ? "Quản lý Cấp trung" : "Manager"}
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isVi ? "Chuyên viên Kinh doanh" : "Sales"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(permissions).map(([domain, roles]) => (
                    <tr key={domain} style={{ borderBottom: "1px solid var(--border-soft)", transition: "background 0.1s ease" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, textTransform: "capitalize", color: "var(--text-1)" }}>
                        {domain}
                      </td>
                      {["exec", "admin", "manager", "ops"].map((r) => {
                        const hasPerm = roles[r];
                        return (
                          <td
                            key={r}
                            onClick={() => togglePermission(domain, r)}
                            style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: "var(--r-xs)",
                                fontWeight: 700,
                                fontSize: 11,
                                background: hasPerm ? "var(--green-soft)" : "var(--surface-3)",
                                color: hasPerm ? "var(--green)" : "var(--text-4)",
                                border: `1px solid ${hasPerm ? "rgba(5, 150, 105, 0.25)" : "var(--border)"}`,
                                transition: "all 0.15s ease"
                              }}
                            >
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
          </Card>
        )}

        {/* -- TAB 2: USERS & RBAC (live API) -- */}
        {activeTab === "roles" && <UserManagementPanel lang={lang} showToast={showToast} />}

        {/* -- TAB 3: AUDIT LOG (live API) -- */}
        {activeTab === "audit" && <AuditLogPanel lang={lang} />}

        {/* ── TAB 4: LLMOPS AI USAGE & COST GOVERNANCE ─────────── */}
        {activeTab === "cost" && (
          <Card
            title={isVi ? "Điều phối Mô hình AI & Quản trị Chi phí (LLMOps)" : "LLMOps AI Telemetry & Cost Governance"}
            subtitle={isVi ? "Theo dõi lưu lượng token thời gian thực, độ trễ và hạn mức ngân sách phòng ban" : "Real-time token throughput, inference latency, and budget guardrails"}
            icon={TrendingUp}
            action={
              <Badge variant="info">
                HYBRID GRAPHRAG ACTIVE
              </Badge>
            }
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 20
            }}>
              <StatCard
                label={isVi ? "Tổng token (30 ngày)" : "Total Tokens (30D)"}
                value="18.4M"
                sub="Prompt: 11.2M · Completion: 7.2M"
                trend="12% vs last month"
                isPositive={true}
                color="blue"
              />
              <StatCard
                label={isVi ? "Số truy vấn suy luận" : "AI Inferences"}
                value="54,180"
                sub="Avg. latency: 2.1s (Graph + Qdrant)"
                trend="Stable"
                color="cyan"
              />
              <StatCard
                label={isVi ? "Ước tính chi phí" : "Estimated Cost"}
                value="$312"
                sub="Across 3 active business units"
                trend="Under monthly cap"
                isPositive={true}
                color="green"
              />
              <StatCard
                label={isVi ? "Tỷ lệ trích dẫn bằng chứng" : "Citation Coverage"}
                value="94%"
                sub="Of answers cite ≥1 verified node"
                trend="+3.2% vs target"
                isPositive={true}
                color="amber"
              />
            </div>

            {/* Budget Quota Slider */}
            <div style={{
              background: "var(--surface-2)",
              padding: "20px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                  {isVi ? "Hạn mức ngân sách hàng tháng (Monthly Budget Quota):" : "Monthly Token Expenditure Limit:"}
                </label>
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--blue)", fontSize: 14 }}>
                  ${budgetLimit} / mo
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--blue)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-4)" }}>
                <span>$200 (Min)</span>
                <span>$500 (Current Cap)</span>
                <span>$2,000 (Enterprise Tier)</span>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
