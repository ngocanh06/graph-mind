import React from "react";

const NAV_SECTIONS = (role, isVi) => [
  {
    id: "overview",
    label: isVi ? "TỔNG QUAN" : "OVERVIEW",
    items: [
      { id: "home", icon: "fa-solid fa-house", label: isVi ? "Trang chủ" : "Home", roles: ["executive","knowledge_manager","it_admin","standard"] },
      { id: "executive", icon: "fa-solid fa-chart-line", label: isVi ? "Chỉ số Kinh doanh" : "Business Intel", roles: ["executive","it_admin"] },
    ],
  },
  {
    id: "intelligence",
    label: isVi ? "TRỢ LÝ TRI THỨC" : "AI & SEARCH",
    items: [
      { id: "copilot", icon: "fa-solid fa-robot", label: isVi ? "AI Copilot" : "AI Copilot", roles: ["executive","knowledge_manager","it_admin","standard"] },
      { id: "search", icon: "fa-solid fa-magnifying-glass", label: isVi ? "Tìm kiếm thông minh" : "Smart Search", roles: ["executive","knowledge_manager","it_admin","standard"] },
    ],
  },
  {
    id: "knowledge_base",
    label: isVi ? "HỒ SƠ & DỮ LIỆU" : "FILES & DATA",
    items: [
      { id: "documents", icon: "fa-solid fa-folder-open", label: isVi ? "Kho hợp đồng & File" : "Contracts & Docs", roles: ["executive","knowledge_manager","it_admin","standard"] },
      { id: "knowledge", icon: "fa-solid fa-circle-nodes", label: isVi ? "Đồ thị Tri thức Graph" : "Knowledge Graph", roles: ["executive","knowledge_manager","it_admin"] },
      { id: "sop", icon: "fa-solid fa-clipboard-list", label: isVi ? "Quy trình SOP" : "Internal SOP", roles: ["executive","knowledge_manager","it_admin"] },
    ],
  },
  {
    id: "governance",
    label: isVi ? "GIÁM SÁT & BÁO CÁO" : "GOVERNANCE",
    items: [
      { id: "risk", icon: "fa-solid fa-triangle-exclamation", label: isVi ? "Cảnh báo rủi ro" : "Risk Alerts", alert: true, roles: ["executive","knowledge_manager","it_admin","standard"] },
      { id: "reports", icon: "fa-solid fa-file-invoice", label: role === "knowledge_manager" ? (isVi ? "Báo cáo phòng ban" : "Dept Reports") : (isVi ? "Báo cáo điều hành" : "Executive Reports"), roles: ["executive","knowledge_manager","it_admin","standard"] },
      { id: "connectors", icon: "fa-solid fa-database", label: isVi ? "Kết nối dữ liệu" : "Data Connectors", roles: ["it_admin"] },
      { id: "admin", icon: "fa-solid fa-gear", label: isVi ? "Quản trị hệ thống" : "System Admin", roles: ["it_admin"] },
    ],
  },
];

export default function NavRail({
  currentView,
  onNavigate,
  onOpenLanding,
  onLogout,
  isOpen = true,
  onToggleOpen,
  t,
  lang,
  role = "executive",
  currentUser,
  onRoleChange,
}) {
  const isVi = lang === "vi";
  const sections = NAV_SECTIONS(role, isVi);

  return (
    <aside
      aria-label={isVi ? "Điều hướng chính" : "Main navigation"}
      style={{
        width: isOpen ? 240 : 60,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border-soft)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
        zIndex: 40,
      }}
    >
      {/* ── BRAND HEADER ─────────────────────────────────── */}
      <div
        style={{
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "space-between" : "center",
          padding: isOpen ? "0 12px 0 16px" : "0",
          borderBottom: "1px solid var(--border-soft)",
          flexShrink: 0,
          gap: 8,
          boxSizing: "border-box",
        }}
      >
        {isOpen ? (
          <>
            <div
              onClick={onOpenLanding}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 0, overflow: "hidden" }}
              title={isVi ? "Về trang chủ" : "Back to landing"}
            >
              {/* Brand mark */}
              <img
                src="/logo-icon.svg"
                alt="GraphMind Logo"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  flexShrink: 0,
                  objectFit: "contain",
                  boxShadow: "0 2px 8px rgba(19, 62, 112, 0.18)",
                }}
              />
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em", fontFamily: "var(--f-display)", whiteSpace: "nowrap" }}>
                  GraphMind
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--cyan, #0891b2)", letterSpacing: "0.04em" }}>
                  Enterprise Knowledge
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            onClick={onToggleOpen}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            title={isVi ? "Mở rộng thanh điều hướng (Click)" : "Expand sidebar (Click)"}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <img
              src="/logo-icon.svg"
              alt="GraphMind Logo"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                objectFit: "contain",
                boxShadow: "0 2px 6px rgba(19, 62, 112, 0.18)",
              }}
            />
          </div>
        )}
      </div>

      {/* ── NAVIGATION ───────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0 8px" }}>
        {sections.map((section) => {
          const visibleItems = section.items.filter(item =>
            !item.roles || item.roles.includes(role)
          );
          if (!visibleItems.length) return null;

          return (
            <div key={section.id} style={{ marginBottom: 4 }}>
              {/* Section label */}
              {isOpen && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px 5px",
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--text-4)",
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    fontFamily: "var(--f-body)",
                  }}>
                    {section.label}
                  </span>
                  {section.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: section.badgeColor || "#7c3aed",
                      background: `${section.badgeColor || "#7c3aed"}15`,
                      border: `1px solid ${section.badgeColor || "#7c3aed"}30`,
                      borderRadius: 3, padding: "1px 5px", letterSpacing: "0.04em",
                    }}>
                      {section.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Items */}
              <div style={{ padding: "0 6px" }}>
                {visibleItems.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      title={!isOpen ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: isOpen ? "8px 12px" : "9px 0",
                        justifyContent: isOpen ? "flex-start" : "center",
                        borderRadius: isOpen ? "10px" : "8px",
                        border: isActive ? "1px solid #a5f3fc" : "1px solid transparent",
                        background: isActive ? "#ecfeff" : "transparent",
                        color: isActive ? "#0891b2" : "var(--text-2)",
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        textAlign: "left",
                        position: "relative",
                        marginBottom: 3,
                        fontFamily: "var(--f-body)",
                        boxSizing: "border-box",
                        boxShadow: isActive ? "0 1px 4px rgba(8, 145, 178, 0.08)" : "none",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = "#f4fbfb";
                          e.currentTarget.style.color = "var(--text-1)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-2)";
                        }
                      }}
                    >
                      {/* Icon */}
                      <span style={{
                        width: 20, height: 20, display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                        color: isActive ? "#0891b2" : "var(--text-3)",
                      }}>
                        <i className={item.icon} style={{ fontSize: 14 }} />
                      </span>

                      {/* Label */}
                      {isOpen && (
                        <span style={{
                          flex: 1, minWidth: 0, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                          lineHeight: 1.3,
                        }}>
                          {item.label}
                        </span>
                      )}

                      {/* Alert dot */}
                      {item.alert && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#ef4444",
                          flexShrink: 0,
                          marginLeft: isOpen ? "auto" : 0,
                          boxShadow: "0 0 5px rgba(239,68,68,0.5)",
                        }} aria-label={isVi ? "Có cảnh báo" : "Has alerts"} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--border-soft)",
        padding: "10px 6px 12px",
        flexShrink: 0,
      }}>
        {/* System health indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: isOpen ? "7px 10px" : "7px 0",
          justifyContent: isOpen ? "flex-start" : "center",
          borderRadius: 8,
          background: "var(--surface-2)",
          border: "1px solid var(--border-soft)",
          margin: "0 0 6px",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#10b981",
            flexShrink: 0,
            boxShadow: "0 0 0 0 rgba(16,185,129,0.4)",
            animation: "dotpulse 2.2s infinite",
          }} />
          {isOpen && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.2 }}>
                {isVi ? "Hệ thống ổn định" : "System Nominal"}
              </div>
              <div style={{ fontSize: 9.5, color: "var(--text-4)", lineHeight: 1.2 }}>
                {isVi ? "247 nguồn đã kết nối" : "247 sources connected"}
              </div>
            </div>
          )}
        </div>

        {/* User mini-profile */}
        {currentUser && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: isOpen ? "7px 10px" : "7px 0",
            justifyContent: isOpen ? "flex-start" : "center",
            borderRadius: 8, cursor: "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            title={!isOpen ? (currentUser?.name || "") : undefined}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${currentUser?.color || "#0891b2"}, ${currentUser?.accentColor || "#06b6d4"})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 10.5, fontWeight: 800,
              letterSpacing: "0.02em",
            }}>
              {currentUser?.avatar || "US"}
            </div>
            {isOpen && (
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.25 }}>
                  {(currentUser?.id === "executive" || currentUser?.username === "ceo" || currentUser?.name?.includes("Hương"))
                    ? "Trần Thị Thu Hương"
                    : (currentUser?.name?.includes("(") ? (ENTERPRISE_ROLES[currentUser?.id]?.name || currentUser?.name?.replace(/\s*\(.*?\)/g, "").trim()) : (currentUser?.name || "User"))}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lang === "vi" ? currentUser?.badge : currentUser?.badgeEn}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
