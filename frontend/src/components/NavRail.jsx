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
  currentUser,
  onRoleChange
}) {
  const isVi = lang === "vi";

  // Role persona metadata & partitioned view definitions
  const ROLE_CONFIGS = {
    executive: {
      badge: "EXECUTIVE BOARD",
      name: "Hoàng Minh Điều",
      initials: "HĐ",
      title: isVi ? "Ban Lãnh Đạo · Giám Đốc Điều Hành (CEO / C-Suite)" : "Executive Leadership · C-Suite / CEO",
      color: "#0891b2",
      colorBg: "rgba(8, 145, 178, 0.08)",
      primaryGroup: isVi ? "Chiến lược & Điều hành" : "Strategic Intelligence",
      primary: [
        { id: "executive", label: t.nav_executive, idx: "01", icon: "pulse" },
        { id: "risk", label: t.nav_risk, idx: "02", badge: "3", icon: "risk" },
        { id: "reports", label: t.nav_reports, idx: "03", icon: "reports" },
        { id: "copilot", label: t.nav_copilot, idx: "04", icon: "copilot" }
      ],
      secondaryGroup: isVi ? "Mở rộng & Tra cứu" : "Explorations",
      secondary: [
        { id: "knowledge", label: t.nav_knowledge, idx: "05", icon: "knowledge" },
        { id: "search", label: t.nav_search, idx: "06", icon: "search" }
      ]
    },
    knowledge_manager: {
      badge: isVi ? "TRƯỞNG PHÒNG" : "DEPT MANAGER",
      name: "Trần M. Anh",
      initials: "TA",
      title: isVi ? "Trưởng Phòng · Quản lý Cấp trung" : "Department Head · Middle Management",
      color: "#059669",
      colorBg: "rgba(5, 150, 105, 0.08)",
      primaryGroup: isVi ? "Bộ phận & Tiến độ" : "Department Operations",
      primary: [
        { id: "reports", label: isVi ? "Báo Cáo Phòng Ban" : "Department Reports", idx: "01", icon: "reports" },
        { id: "documents", label: t.nav_documents, idx: "02", icon: "documents" },
        { id: "copilot", label: t.nav_copilot, idx: "03", icon: "copilot" },
        { id: "risk", label: t.nav_risk, idx: "04", badge: "2", icon: "risk" }
      ],
      secondaryGroup: isVi ? "Tra cứu & Tri thức" : "Search & Knowledge",
      secondary: [
        { id: "search", label: t.nav_search, idx: "05", icon: "search" }
      ]
    },
    it_admin: {
      badge: isVi ? "ADMIN HỆ THỐNG & TRI THỨC" : "SYS & KNOWLEDGE ADMIN",
      name: "SecOps Admin",
      initials: "SA",
      title: isVi ? "Quản trị viên Hệ thống & Tri thức · SecOps Lead" : "System & Knowledge Administrator · SecOps Lead",
      color: "#d97706",
      colorBg: "rgba(217, 119, 6, 0.08)",
      primaryGroup: isVi ? "Hệ thống & Tri thức" : "System & Knowledge",
      primary: [
        { id: "admin", label: t.nav_admin, idx: "01", icon: "admin" },
        { id: "knowledge", label: t.nav_knowledge, idx: "02", icon: "knowledge" },
        { id: "connectors", label: t.nav_connectors, idx: "03", icon: "connectors" },
        { id: "documents", label: t.nav_documents, idx: "04", icon: "documents" }
      ],
      secondaryGroup: isVi ? "Giám sát & Tra cứu" : "Monitoring",
      secondary: [
        { id: "search", label: t.nav_search, idx: "05", icon: "search" },
        { id: "reports", label: t.nav_reports, idx: "06", icon: "reports" },
        { id: "executive", label: t.nav_executive, idx: "07", icon: "pulse" }
      ]
    },
    standard: {
      badge: isVi ? "CHUYÊN VIÊN KINH DOANH" : "SALES EXECUTIVE",
      name: "Nguyễn V. Nam",
      initials: "NN",
      title: isVi ? "Chuyên viên Kinh doanh & Khách hàng" : "Sales & Account Executive",
      color: "#2563eb",
      colorBg: "rgba(37, 99, 235, 0.08)",
      primaryGroup: isVi ? "Nghiệp vụ Bán hàng" : "Sales & Clients",
      primary: [
        { id: "search", label: isVi ? "Tác Nghiệp Khách Hàng" : "Client Operations", idx: "01", icon: "search" },
        { id: "copilot", label: isVi ? "Trợ Lý AI" : "AI Copilot", idx: "02", icon: "copilot" },
        { id: "documents", label: isVi ? "Kho Hợp Đồng & Báo Giá" : "Contracts & Quotes", idx: "03", icon: "documents" },
        { id: "reports", label: isVi ? "Báo Cáo Công Việc" : "Work Reports", idx: "04", icon: "reports" }
      ],
      secondaryGroup: null,
      secondary: []
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
        <div className="brand-mark"></div>
        <div className="brand-text">
          GRAPH MIND<span>{t.brand_sub}</span>
        </div>

        {isOpen && (
          <button
            className="rail-toggle-btn"
            onClick={onToggleOpen}
            title={isVi ? "Thu gọn thanh điều hướng" : "Collapse sidebar"}
            aria-label="Toggle navigation"
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: "12px" }} />
          </button>
        )}
      </div>

      {/* Role Indicator Card */}
      <div style={{
        margin: "10px 10px 6px",
        padding: isOpen ? "9px 12px" : "8px 4px",
        borderRadius: "8px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        transition: "all var(--transition-fast)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: isOpen ? "flex-start" : "center" }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: currentRoleConfig.color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${currentRoleConfig.color}80`
          }} />
          {isOpen && (
            <span style={{
              fontSize: "11px",
              fontWeight: "750",
              letterSpacing: "0.03em",
              color: currentRoleConfig.color,
              fontFamily: "var(--f-body)",
              whiteSpace: "nowrap",
              textTransform: "uppercase"
            }}>
              {currentRoleConfig.badge}
            </span>
          )}
        </div>

        {isOpen && (
          <div style={{
            fontSize: "11.5px",
            color: "var(--text-2)",
            lineHeight: "1.4",
            fontWeight: "500",
            wordBreak: "break-word"
          }}>
            {currentRoleConfig.title}
          </div>
        )}
      </div>

      {/* Role-Partitioned Navigation Items */}
      <nav className="rail-nav">
        {/* Primary Group */}
        <div className="rail-group-label">
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
              {item.badge && (
                <span className="n-badge">{item.badge}</span>
              )}
            </div>
          );
        })}

        {/* Secondary Group (Extended cross-functional access) */}
        {currentRoleConfig.secondary && currentRoleConfig.secondary.length > 0 && (
          <>
            <div className="rail-group-label" style={{ marginTop: "12px" }}>
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
                  {item.badge && (
                    <span className="n-badge">{item.badge}</span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
