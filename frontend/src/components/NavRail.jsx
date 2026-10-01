import React from "react";

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
  onRoleChange
}) {
  const isVi = lang === "vi";

  // Navigation definition structured to match Stitch SCREEN-004
  const SECTIONS = [
    {
      id: "focus",
      label: isVi ? "TRỌNG TÂM" : "CORE FOCUS",
      items: [
        {
          id: "home",
          label: isVi ? "Trang chủ (Home)" : "Home & Dashboard",
          icon: "fa-regular fa-house",
        },
        {
          id: "copilot",
          label: isVi ? "AI Copilot (Chat)" : "AI Copilot (Chat)",
          icon: "fa-regular fa-comment-dots",
        },
        {
          id: "search",
          label: isVi ? "Tìm kiếm đa chiều" : "Multi-facet Search",
          icon: "fa-solid fa-magnifying-glass",
        },
        {
          id: "knowledge",
          label: isVi ? "Knowledge Graph" : "Knowledge Graph",
          icon: "fa-solid fa-circle-nodes",
        },
      ],
    },
    {
      id: "executive_support",
      label: isVi ? "HỖ TRỢ ĐIỀU HÀNH" : "EXECUTIVE DECISION",
      badge: isVi ? "EXECUTIVE" : "EXECUTIVE",
      items: [
        {
          id: "executive",
          label: isVi ? "Dashboard điều hành" : "Executive Dashboard",
          icon: "fa-solid fa-table-cells-large",
        },
        {
          id: "risk",
          label: isVi ? "Cảnh báo rủi ro" : "Risk Alerts",
          icon: "fa-regular fa-circle-exclamation",
          alertDot: true,
        },
        {
          id: "reports",
          label: isVi ? "Báo cáo điều hành" : "Executive Briefing",
          icon: "fa-regular fa-chart-bar",
        },
      ],
    },
    {
      id: "knowledge_management",
      label: isVi ? "QUẢN TRỊ TRI THỨC" : "KNOWLEDGE ASSETS",
      items: [
        {
          id: "documents",
          label: isVi ? "Tài liệu (Knowledge Base)" : "Knowledge Base",
          icon: "fa-regular fa-folder-open",
        },
        {
          id: "sop",
          label: isVi ? "Quy trình SOP nội bộ" : "Internal SOP Rules",
          icon: "fa-regular fa-clipboard",
        },
        ...(role === "it_admin"
          ? [
              {
                id: "admin",
                label: isVi ? "Quản trị hệ thống" : "System Admin",
                icon: "fa-solid fa-gear",
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <aside
      style={{
        width: isOpen ? 240 : 64,
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        overflowY: "auto",
        transition: "width 0.2s ease",
        userSelect: "none",
        zIndex: 40,
      }}
    >
      <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        {SECTIONS.map((section) => (
          <div key={section.id}>
            {isOpen && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 18px 6px 18px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "750",
                    color: "#94a3b8",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--f-body)",
                    textTransform: "uppercase",
                  }}
                >
                  {section.label}
                </span>
                {section.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "750",
                      color: "#9333ea",
                      background: "#faf5ff",
                      border: "1px solid #f3e8ff",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {section.badge}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: isOpen ? "9px 16px" : "10px 0",
                      justifyContent: isOpen ? "flex-start" : "center",
                      margin: "0 8px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: isActive ? "#eff6ff" : "transparent",
                      color: isActive ? "#2563eb" : "#475569",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "13px",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.color = "#0f172a";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#475569";
                      }
                    }}
                  >
                    <i
                      className={item.icon}
                      style={{
                        fontSize: "15px",
                        width: "18px",
                        textAlign: "center",
                        color: isActive ? "#2563eb" : "#64748b",
                        flexShrink: 0,
                      }}
                    />
                    {isOpen && (
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                    {isOpen && item.alertDot && (
                      <span
                        style={{
                          marginLeft: "auto",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                          flexShrink: 0,
                          boxShadow: "0 0 6px rgba(239,68,68,0.4)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
