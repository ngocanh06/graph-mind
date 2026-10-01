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
    home: lang === "vi" ? "Trang chủ & Dashboard" : "Home & Dashboard",
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
    <header className="topbar" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: "64px",
      background: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* BRAND & SEARCH */}
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {/* Brand: Logo + GraphMind + v1.2 */}
        <div
          onClick={onOpenLanding}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
          title={lang === "vi" ? "Về Trang Chủ" : "Back to Landing"}
        >
          <img
            src="/logo-icon.svg"
            alt="GraphMind"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: "17.5px",
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.02em",
            fontFamily: "var(--f-display)"
          }}>
            GraphMind
          </span>
          <span style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#2563eb",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "2px 7px",
            borderRadius: "6px",
            lineHeight: 1.2
          }}>
            v1.2
          </span>
        </div>

        {/* Global Search — Stitch COMP */}
        <div style={{ position: "relative", width: "380px" }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
              color: "#94a3b8",
              pointerEvents: "none"
            }}
          />
          <input
            type="text"
            placeholder={lang === "vi" ? "Tìm kiếm nhanh thực thể, hợp đồng, SOP..." : "Quick search entities, contracts, SOP..."}
            onClick={() => onNavigate("search")}
            readOnly
            style={{
              width: "100%",
              paddingLeft: 34,
              paddingRight: 40,
              paddingTop: 8,
              paddingBottom: 8,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12.5,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              fontFamily: "var(--f-body)",
              boxSizing: "border-box",
              transition: "border-color 0.15s, box-shadow 0.15s"
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10.5,
              color: "#94a3b8",
              border: "1px solid #e2e8f0",
              padding: "1px 5px",
              borderRadius: 4,
              background: "#f8fafc",
              fontFamily: "var(--f-mono)",
              pointerEvents: "none"
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* RIGHT: BELL + DIVIDER + USER BADGE */}
      <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Bell Notification */}
        <button
          title={lang === "vi" ? "Thông báo" : "Notifications"}
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <i className="fa-regular fa-bell" style={{ fontSize: 17 }} />
          <span style={{
            position: "absolute",
            top: 7,
            right: 7,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ef4444",
            border: "2px solid #ffffff",
          }} />
        </button>

        {/* User Avatar + Name + Role Dropdown Trigger */}
        <div className="topbar-user-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
          <div
            className={`topbar-user-badge ${isProfileOpen ? "active" : ""}`}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title={lang === "vi" ? "Nhấp để xem thông tin cá nhân & đăng xuất" : "Click for profile & sign out"}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 8px 4px 4px",
              borderRadius: 8,
              transition: "background 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {/* Avatar: Solid royal blue circle matching Stitch */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                letterSpacing: "0.02em"
              }}
            >
              {currentUser?.avatar || "TH"}
            </div>
            {/* Name + Role */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", lineHeight: 1.25 }}>
                {currentUser?.name || "Trần Thị Thu Hương"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {currentUser?.title || "Executive Director"}
                </span>
                <i
                  className="fa-solid fa-chevron-down"
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── PROFILE DROPDOWN ─────────────────────── */}
          {isProfileOpen && (
            <div
              className="user-profile-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "300px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.1)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "dropdownFadeIn 0.15s ease-out",
              }}
            >
              {/* Header */}
              <div style={{ padding: "16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>
                  {currentUser?.avatar || "US"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3 }}>
                    {currentUser?.name || "Người dùng"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {currentUser?.email || "user@graphmind.ai"}
                  </span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 3,
                    color: currentUser?.color || "#0891b2",
                    background: `${currentUser?.color || "#0891b2"}18`,
                    border: `1px solid ${currentUser?.color || "#0891b2"}30`,
                    display: "inline-block", marginTop: 2,
                  }}>
                    {lang === "vi" ? currentUser?.badge : currentUser?.badgeEn}
                  </span>
                </div>
              </div>

              {/* Dept + Security */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
                  <i className="fa-solid fa-building" style={{ fontSize: 11, color: "var(--text-3)", width: 14 }} />
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {lang === "vi" ? currentUser?.department : currentUser?.departmentEn}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669" }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: 11, width: 14 }} />
                  <span>{lang === "vi" ? "2FA Hardware Token: Đã kích hoạt" : "2FA Hardware Token: Active"}</span>
                </div>
              </div>

              {/* Role switcher */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)" }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-3)", letterSpacing: "0.04em", display: "block", marginBottom: 6, paddingLeft: 4 }}>
                  {lang === "vi" ? "Chuyển nhanh vai trò" : "Quick Switch Persona"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {Object.values(ENTERPRISE_ROLES).map((r) => {
                    const isCurrent = r.id === currentUser?.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => { onRoleChange(r.id); setIsProfileOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "6px 8px", borderRadius: 5,
                          border: isCurrent ? `1px solid ${r.color}50` : "1px solid transparent",
                          background: isCurrent ? `${r.color}12` : "transparent",
                          cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--surface-2)"; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                          <span style={{ fontSize: 11.5, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--text-1)" : "var(--text-2)" }}>
                            {r.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: r.color }}>
                          {lang === "vi" ? r.badge : r.badgeEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EN/VI + Theme (moved from topbar) */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {["en", "vi"].map(l => (
                    <button
                      key={l}
                      onClick={() => onLangChange(l)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: lang === l ? "1px solid #2563eb" : "1px solid var(--border)",
                        background: lang === l ? "rgba(37,99,235,0.08)" : "transparent",
                        color: lang === l ? "#2563eb" : "var(--text-2)",
                        cursor: "pointer", fontFamily: "var(--f-body)",
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-2)", cursor: "pointer", fontFamily: "var(--f-body)",
                  }}
                >
                  <i className={`fa-solid ${theme === "light" ? "fa-moon" : "fa-sun"}`}
                     style={{ color: theme === "light" ? "#38bdf8" : "#d97706", fontSize: 11 }} />
                  {theme === "light" ? "Dark" : "Light"}
                </button>
              </div>

              {/* Actions */}
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => { setIsProfileOpen(false); onOpenLanding(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    color: "var(--text-2)", background: "transparent", border: "none",
                    cursor: "pointer", transition: "all 0.15s", textAlign: "left", width: "100%",
                    fontFamily: "var(--f-body)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  <i className="fa-solid fa-house" style={{ fontSize: 12, color: "var(--text-3)", width: 16 }} />
                  <span>{lang === "vi" ? "Trang chủ giới thiệu" : "Public Landing Page"}</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => { setIsProfileOpen(false); onLogout(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      color: "#dc2626", background: "rgba(220,38,38,0.05)",
                      border: "1px solid rgba(220,38,38,0.15)",
                      cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                      width: "100%", marginTop: 2, fontFamily: "var(--f-body)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.12)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,38,38,0.05)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.15)"; }}
                  >
                    <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 12, width: 16 }} />
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
