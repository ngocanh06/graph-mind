import React from "react";

export default function NavRail({
  currentView,
  onNavigate,
  onOpenLanding,
  onLogout,
  isOpen,
  onToggleOpen,
  t,
  lang,
  role = "executive",
  onRoleChange
}) {
  const isVi = lang === "vi";

  // Role persona metadata & partitioned view definitions
  const ROLE_CONFIGS = {
    executive: {
      badge: "EXECUTIVE",
      name: "Dieu Hoang",
      initials: "DH",
      title: isVi ? "Lãnh đạo · Giám đốc Tài chính (CFO)" : "Executive · Chief Financial Officer",
      color: "#0891b2",
      colorBg: "rgba(8, 145, 178, 0.12)",
      primaryGroup: isVi ? "Phân hệ Chiến lược & Điều hành" : "Strategic Intelligence",
      primary: [
        { id: "executive", label: t.nav_executive, idx: "01", icon: "pulse" },
        { id: "risk", label: t.nav_risk, idx: "02", badge: "3", icon: "risk" },
        { id: "reports", label: t.nav_reports, idx: "03", icon: "reports" },
        { id: "copilot", label: t.nav_copilot, idx: "04", icon: "copilot" }
      ],
      secondaryGroup: isVi ? "Mở rộng & Tra cứu" : "Extended Explorations",
      secondary: [
        { id: "knowledge", label: t.nav_knowledge, idx: "05", icon: "knowledge" },
        { id: "search", label: t.nav_search, idx: "06", icon: "search" }
      ]
    },
    knowledge_manager: {
      badge: "KNOWLEDGE MGR",
      name: "Trần M. Anh",
      initials: "TA",
      title: isVi ? "Quản lý Tri thức · Trưởng ban Dữ liệu" : "Knowledge Manager · Data Lead",
      color: "#059669",
      colorBg: "rgba(5, 150, 105, 0.12)",
      primaryGroup: isVi ? "Phân hệ Đồ thị & Dữ liệu" : "Knowledge & Extraction Suite",
      primary: [
        { id: "knowledge", label: t.nav_knowledge, idx: "01", icon: "knowledge" },
        { id: "documents", label: t.nav_documents, idx: "02", icon: "documents" },
        { id: "copilot", label: t.nav_copilot, idx: "03", icon: "copilot" },
        { id: "connectors", label: t.nav_connectors, idx: "04", icon: "connectors" }
      ],
      secondaryGroup: isVi ? "Tra cứu & Tổng quan" : "Search & Overview",
      secondary: [
        { id: "search", label: t.nav_search, idx: "05", icon: "search" },
        { id: "executive", label: t.nav_executive, idx: "06", icon: "pulse" }
      ]
    },
    it_admin: {
      badge: "IT ADMIN",
      name: "SecOps Admin",
      initials: "SA",
      title: isVi ? "Quản trị Hệ thống · SecOps & LLMOps" : "IT Administrator · SecOps Lead",
      color: "#d97706",
      colorBg: "rgba(217, 119, 6, 0.12)",
      primaryGroup: isVi ? "Phân hệ Quản trị & Vận hành" : "System & LLMOps Control",
      primary: [
        { id: "admin", label: t.nav_admin, idx: "01", icon: "admin" },
        { id: "connectors", label: t.nav_connectors, idx: "02", icon: "connectors" },
        { id: "knowledge", label: t.nav_knowledge, idx: "03", icon: "knowledge" }
      ],
      secondaryGroup: isVi ? "Giám sát & Tra cứu" : "Monitoring & Search",
      secondary: [
        { id: "search", label: t.nav_search, idx: "04", icon: "search" },
        { id: "executive", label: t.nav_executive, idx: "05", icon: "pulse" }
      ]
    },
    standard: {
      badge: "OPERATIONS",
      name: "Nguyễn V. Nam",
      initials: "NN",
      title: isVi ? "Chuyên viên Nghiệp vụ · Vận hành" : "Operations & Sales Specialist",
      color: "#7c3aed",
      colorBg: "rgba(124, 58, 237, 0.12)",
      primaryGroup: isVi ? "Phân hệ Tác nghiệp & Tra cứu" : "Workplace Operations",
      primary: [
        { id: "search", label: t.nav_search, idx: "01", icon: "search" },
        { id: "copilot", label: t.nav_copilot, idx: "02", icon: "copilot" },
        { id: "documents", label: t.nav_documents, idx: "03", icon: "documents" }
      ],
      secondaryGroup: isVi ? "Tham khảo Lãnh đạo" : "Executive Reference",
      secondary: [
        { id: "executive", label: t.nav_executive, idx: "04", icon: "pulse" }
      ]
    }
  };

  const currentRoleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.executive;

  const renderIcon = (type) => {
    switch (type) {
      case "pulse":
        return <i className="fa-solid fa-chart-line" style={{ fontSize: "16px" }} />;
      case "copilot":
        return <i className="fa-solid fa-brain" style={{ fontSize: "16px" }} />;
      case "knowledge":
        return <i className="fa-solid fa-diagram-project" style={{ fontSize: "16px" }} />;
      case "search":
        return <i className="fa-solid fa-magnifying-glass" style={{ fontSize: "16px" }} />;
      case "connectors":
        return <i className="fa-solid fa-network-wired" style={{ fontSize: "16px" }} />;
      case "risk":
        return <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "16px" }} />;
      case "documents":
        return <i className="fa-solid fa-file-invoice" style={{ fontSize: "16px" }} />;
      case "reports":
        return <i className="fa-solid fa-file-lines" style={{ fontSize: "16px" }} />;
      case "admin":
        return <i className="fa-solid fa-gear" style={{ fontSize: "16px" }} />;
      default:
        return null;
    }
  };

  return (
    <aside className={`rail ${isOpen ? "open" : ""}`} id="rail">
      {/* Toggle button */}
      <button className="rail-toggle" onClick={onToggleOpen} title="Toggle navigation">
        <i className={`fa-solid ${isOpen ? "fa-chevron-left" : "fa-chevron-right"}`} style={{ fontSize: "10px" }} />
      </button>

      {/* Brand logo */}
      <div className="rail-brand" onClick={onOpenLanding} title={isVi ? "Về Trang Chủ Giới Thiệu" : "Back to Landing Page"}>
        <img
          src="/logo-icon.svg"
          alt="Graph Mind Logo"
          style={{
            width: "30px",
            height: "30px",
            flexShrink: 0,
            borderRadius: "7px",
            objectFit: "contain",
            boxShadow: "0 0 12px rgba(0, 229, 255, 0.35)"
          }}
        />
        <div className="brand-text">
          GRAPH MIND<span>{t.brand_sub}</span>
        </div>
      </div>

      {/* Dynamic Role Indicator & Switcher Card (Only expanded when rail open) */}
      <div style={{
        margin: "10px 10px 4px",
        padding: isOpen ? "8px 10px" : "6px 2px",
        borderRadius: "var(--r-md)",
        background: currentRoleConfig.colorBg,
        border: `1px solid ${currentRoleConfig.color}40`,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        transition: "all var(--transition-fast)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isOpen ? "space-between" : "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: currentRoleConfig.color,
              display: "inline-block",
              boxShadow: `0 0 8px ${currentRoleConfig.color}`
            }} />
            {isOpen && (
              <span style={{
                fontSize: "9.5px",
                fontWeight: "800",
                letterSpacing: "0.06em",
                color: currentRoleConfig.color,
                fontFamily: "var(--f-mono)"
              }}>
                {currentRoleConfig.badge}
              </span>
            )}
          </div>

          {isOpen && onRoleChange && (
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{
                fontSize: "10px",
                fontWeight: "600",
                background: "transparent",
                border: "none",
                color: "var(--text-2)",
                cursor: "pointer",
                outline: "none"
              }}
              title={isVi ? "Chuyển đổi vai trò người dùng" : "Switch role persona"}
            >
              <option value="executive">Executive</option>
              <option value="knowledge_manager">Knowledge Mgr</option>
              <option value="it_admin">IT Admin</option>
              <option value="standard">Operations</option>
            </select>
          )}
        </div>

        {isOpen && (
          <div style={{
            fontSize: "10.5px",
            color: "var(--text-3)",
            lineHeight: "1.3",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            {currentRoleConfig.title}
          </div>
        )}
      </div>

      {/* Role-Partitioned Navigation Items */}
      <nav className="rail-nav">
        {/* Primary Group */}
        <div className="rail-group-label" style={{ color: currentRoleConfig.color }}>
          {currentRoleConfig.primaryGroup}
        </div>

        {currentRoleConfig.primary.map((item) => {
          const isActive = currentView === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="n-icon">{renderIcon(item.icon)}</span>
              <span className="n-label">{item.label}</span>
              {item.badge ? (
                <span className="n-badge">{item.badge}</span>
              ) : (
                <span className="n-idx">{item.idx}</span>
              )}
            </div>
          );
        })}

        {/* Secondary Group (Extended cross-functional access) */}
        {currentRoleConfig.secondary && currentRoleConfig.secondary.length > 0 && (
          <>
            <div className="rail-group-label" style={{ marginTop: "10px" }}>
              {currentRoleConfig.secondaryGroup}
            </div>
            {currentRoleConfig.secondary.map((item) => {
              const isActive = currentView === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                >
                  <span className="n-icon">{renderIcon(item.icon)}</span>
                  <span className="n-label">{item.label}</span>
                  <span className="n-idx">{item.idx}</span>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Rail Footer */}
      <div className="rail-foot">
        {/* System telemetry */}
        <div className="rail-health" title={isVi ? "247 nguồn dữ liệu đồng bộ ổn định" : "247 sources synced healthy"}>
          <span className="pulse-dot"></span>
          <div className="h-text">
            <div className="h-title">{t.system_health_title}</div>
            <div className="h-sub">{t.system_health_sub}</div>
          </div>
        </div>

        {/* User Card */}
        <div
          className="rail-user"
          onClick={() => onNavigate("admin")}
          title={isVi ? "Xem quyền hạn trong Quản trị viên" : "View permissions in Admin"}
        >
          <div className="avatar" style={{ border: `1.5px solid ${currentRoleConfig.color}` }}>
            {currentRoleConfig.initials}
          </div>
          <div className="u-text">
            <div className="u-name">{currentRoleConfig.name}</div>
            <div className="u-role">{currentRoleConfig.title}</div>
          </div>
        </div>

        {/* Explicit Role Switching / Sign Out Button */}
        {isOpen && (
          <div style={{ padding: "6px 10px 0" }}>
            <button
              onClick={onLogout}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-sm)",
                fontSize: "10.5px",
                fontWeight: "600",
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all var(--transition-fast)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--cyan)";
                e.currentTarget.style.borderColor = "var(--cyan)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-3)";
                e.currentTarget.style.borderColor = "var(--border-soft)";
              }}
              title={isVi ? "Đổi vai trò người dùng hoặc đăng xuất" : "Switch role or sign out"}
            >
              <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: "11px" }}></i>
              <span>{isVi ? "Đổi Vai Trò / Đăng Xuất" : "Switch Role / Sign Out"}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
