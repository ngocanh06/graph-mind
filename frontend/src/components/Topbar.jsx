import React, { useState, useRef, useEffect } from "react";
import { ENTERPRISE_ROLES } from "../data/roles";

export default function Topbar({
  view,
  lang,
  theme,
  role,
  currentUser,
  onThemeChange,
  onLangChange,
  onRoleChange,
  onOpenLanding,
  onLogout,
  onNavigate,
  t,
  apiConnected
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi nhấp ra bên ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const titles = {
    executive: lang === "vi" ? "Tổng quan Lãnh đạo" : "Executive Intelligence",
    copilot: lang === "vi" ? "Trợ lý AI Copilot" : "AI Copilot Center",
    knowledge: lang === "vi" ? "Đồ thị Tri thức & Thực thể" : "Knowledge Graph Observatory",
    search: role === "standard"
      ? (lang === "vi" ? "Tác Nghiệp Khách Hàng & Bàn Làm Việc" : "Client Operations Workspace")
      : (lang === "vi" ? "Tra cứu Tri thức Doanh nghiệp" : "Smart Search & Intelligence"),
    connectors: lang === "vi" ? "Kết nối Dữ liệu Doanh nghiệp" : "Enterprise Data Connectors",
    risk: lang === "vi" ? "Đài Quan sát Rủi ro" : "Business Risk Observatory",
    documents: role === "standard"
      ? (lang === "vi" ? "Kho Hợp Đồng & Báo Giá Doanh Nghiệp" : "Contracts & Quotes Explorer")
      : (lang === "vi" ? "Khám phá Kho Tài liệu" : "Document Explorer"),
    reports: role === "standard"
      ? (lang === "vi" ? "Báo Cáo Công Việc & Nhật Ký Ca" : "Shift Work & Operations Report")
      : role === "knowledge_manager"
      ? (lang === "vi" ? "Báo Cáo Hiệu Suất Phòng Ban" : "Department Performance Reports")
      : (lang === "vi" ? "Báo cáo Chiến lược Lãnh đạo" : "Executive Strategic Reports"),
    admin: lang === "vi" ? "Quản trị Hệ thống & Tri thức" : "System & Knowledge Admin"
  };

  const currentTitle = titles[view] || titles.executive;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="crumb" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="/logo-icon.svg"
            alt="Graph Mind"
            onClick={onOpenLanding}
            title={lang === "vi" ? "Về Trang Chủ" : "Back to Landing"}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "7px",
              objectFit: "contain",
              flexShrink: 0,
              cursor: "pointer",
              boxShadow: "0 0 8px rgba(0,229,255,0.3)",
              filter: "drop-shadow(0 0 3px rgba(0,229,255,0.2))",
              transition: "transform 0.15s ease, box-shadow 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 0 14px rgba(0,229,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(0,229,255,0.3)";
            }}
          />
          <span className="crumb-title" style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-1)" }}>
            {currentTitle}
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* 1. Signature Knowledge Pulse Component */}
        <div
          className="kpulse-widget"
          title="Knowledge Pulse — Live Python FastAPI Engine (:5000)"
          onClick={() => onNavigate("connectors")}
        >
          <svg viewBox="0 0 74 18" style={{ width: "74px", height: "18px", flexShrink: 0 }}>
            <line x1="6" y1="9" x2="22" y2="9" className="kp-edge" />
            <line x1="22" y1="9" x2="38" y2="9" className="kp-edge" />
            <line x1="38" y1="9" x2="54" y2="9" className="kp-flow" />
            <line x1="54" y1="9" x2="68" y2="9" className="kp-edge" />
            <circle cx="6" cy="9" r="2.5" className="kp-node active" />
            <circle cx="22" cy="9" r="2.5" className="kp-node active" />
            <circle cx="38" cy="9" r="2.5" className="kp-node active" />
            <circle cx="54" cy="9" r="2.5" className="kp-node active" />
            <circle cx="68" cy="9" r="2.5" className="kp-node" />
          </svg>
          <div className="kpulse-label">
            <span>247 nguồn</span> · <b>{apiConnected ? "FastAPI" : "GraphRAG"}</b>
          </div>
        </div>

        {/* 2. Bilingual Selector (EN / VI) */}
        <div className="ctrl-group lang-group">
          <button
            className={`ctrl-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => onLangChange("en")}
            title="English"
          >
            EN
          </button>
          <button
            className={`ctrl-btn ${lang === "vi" ? "active" : ""}`}
            onClick={() => onLangChange("vi")}
            title="Tiếng Việt"
          >
            VI
          </button>
        </div>

        {/* 3. Theme Toggle (Light / Dark) */}
        <button
          className="theme-toggle-btn"
          onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
          title={lang === "vi" ? `Chuyển sang giao diện ${theme === "light" ? "Tối (Dark)" : "Sáng (Light)"}` : `Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
        >
          <i
            className={`fa-solid ${theme === "light" ? "fa-sun" : "fa-moon"}`}
            style={{ color: theme === "light" ? "#d97706" : "#38bdf8", fontSize: "12px" }}
          />
          <span className="theme-text">{theme === "light" ? "Light" : "Dark"}</span>
        </button>

        {/* 4. Enterprise Authenticated User Badge & Profile Menu (GÓC NGOÀI CÙNG BÊN PHẢI) */}
        <div className="topbar-user-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
          <div
            className={`topbar-user-badge ${isProfileOpen ? "active" : ""}`}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title={lang === "vi" ? "Nhấp để xem thông tin cá nhân & đăng xuất" : "Click for profile & sign out"}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <div
              className="ub-avatar"
              style={{ background: currentUser?.color || "#0891b2" }}
            >
              {currentUser?.avatar || "US"}
            </div>
            <div className="ub-info" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span className="ub-name">{currentUser?.name || "Dieu Hoang"}</span>
              <span
                className="ub-pill"
                style={{
                  color: currentUser?.color || "#0891b2",
                  background: `${currentUser?.color || "#0891b2"}15`
                }}
              >
                {lang === "vi" ? (currentUser?.badge || "LÃNH ĐẠO") : (currentUser?.badgeEn || "EXECUTIVE")}
              </span>
            </div>
            <i
              className="fa-solid fa-chevron-down"
              style={{
                fontSize: "10px",
                color: "var(--text-3)",
                marginLeft: "2px",
                transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease"
              }}
            />
          </div>

          {/* User Profile Dropdown Popover */}
          {isProfileOpen && (
            <div
              className="user-profile-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "290px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "dropdownFadeIn 0.15s ease-out"
              }}
            >
              {/* Profile Card Header */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border-soft)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px"
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: currentUser?.color || "#0891b2",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "14px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                    flexShrink: 0
                  }}
                >
                  {currentUser?.avatar || "US"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-1)", lineHeight: "1.3" }}>
                    {currentUser?.name || "Người dùng"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--f-mono)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {currentUser?.email || "user@graphmind.ai"}
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "800",
                        padding: "2px 7px",
                        borderRadius: "3px",
                        color: currentUser?.color || "#0891b2",
                        background: `${currentUser?.color || "#0891b2"}18`,
                        border: `1px solid ${currentUser?.color || "#0891b2"}30`,
                        display: "inline-block"
                      }}
                    >
                      {lang === "vi" ? currentUser?.badge : currentUser?.badgeEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Department & Security Info */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-2)" }}>
                  <i className="fa-solid fa-building" style={{ fontSize: "11px", color: "var(--text-3)", width: "14px" }} />
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {lang === "vi" ? currentUser?.department : currentUser?.departmentEn}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#059669" }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: "11px", width: "14px" }} />
                  <span>{lang === "vi" ? "2FA Hardware Token: Đã kích hoạt" : "2FA Hardware Token: Active"}</span>
                </div>
              </div>

              {/* Fast Role Switcher */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", background: "var(--surface)" }}>
                <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "var(--text-3)", letterSpacing: "0.04em", display: "block", marginBottom: "6px", paddingLeft: "4px" }}>
                  {lang === "vi" ? "Chuyển nhanh vai trò (Switch Role)" : "Quick Switch Persona"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {Object.values(ENTERPRISE_ROLES).map((r) => {
                    const isCurrent = r.id === currentUser?.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          onRoleChange(r.id);
                          setIsProfileOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderRadius: "5px",
                          border: isCurrent ? `1px solid ${r.color}50` : "1px solid transparent",
                          background: isCurrent ? `${r.color}12` : "transparent",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textAlign: "left"
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = "var(--surface-2)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.color }} />
                          <span style={{ fontSize: "11.5px", fontWeight: isCurrent ? "700" : "500", color: isCurrent ? "var(--text-1)" : "var(--text-2)" }}>
                            {r.name}
                          </span>
                        </div>
                        <span style={{ fontSize: "9px", fontWeight: "700", color: r.color }}>
                          {lang === "vi" ? r.badge : r.badgeEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions: Landing Page & Logout */}
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenLanding();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-2)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                    width: "100%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                    e.currentTarget.style.color = "var(--text-1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-2)";
                  }}
                >
                  <i className="fa-solid fa-house" style={{ fontSize: "12px", color: "var(--text-3)", width: "16px" }} />
                  <span>{lang === "vi" ? "Trang chủ giới thiệu" : "Public Landing Page"}</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#dc2626",
                      background: "rgba(220, 38, 38, 0.05)",
                      border: "1px solid rgba(220, 38, 38, 0.15)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                      width: "100%",
                      marginTop: "2px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(220, 38, 38, 0.12)";
                      e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.15)";
                    }}
                  >
                    <i className="fa-solid fa-right-from-bracket" style={{ fontSize: "12px", width: "16px" }} />
                    <span>{lang === "vi" ? "Đăng xuất hệ thống" : "Sign Out"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

