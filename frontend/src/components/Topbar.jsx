import React, { useState, useRef, useEffect } from "react";
import { ENTERPRISE_ROLES } from "../data/roles";
import {
  Bell, ChevronDown, Moon, Sun, Globe, LogOut, Home as HomeIcon,
  Activity, ShieldCheck, Building2, Check, Search
} from "lucide-react";

const VIEW_TITLES = {
  en: {
    home: "Home · Dashboard",
    executive: "Executive Intelligence",
    copilot: "AI Copilot Center",
    knowledge: "Knowledge Graph",
    search: "Smart Search",
    connectors: "Data Connectors",
    risk: "Risk Observatory",
    documents: "Document Explorer",
    sop: "Internal SOP",
    sop_composer: "SOP Composer",
    reports: "Executive Briefing",
    admin: "System Administration",
  },
  vi: {
    home: "Trang chủ · Dashboard",
    executive: "Tổng quan Lãnh đạo",
    copilot: "Trợ lý AI Copilot",
    knowledge: "Đồ thị Tri thức",
    search: "Tìm kiếm Thông minh",
    connectors: "Kết nối Dữ liệu",
    risk: "Đài Quan sát Rủi ro",
    documents: "Khám phá Tài liệu",
    sop: "SOP Nội bộ",
    sop_composer: "Soạn thảo SOP",
    reports: "Báo cáo Chiến lược",
    admin: "Quản trị Hệ thống",
  }
};

// Role-specific view title overrides
const ROLE_VIEW_TITLES = {
  standard: { en: { search: "Client Operations Workspace", documents: "Contracts & Quotes", reports: "Work & Shift Report" }, vi: { search: "Tác nghiệp Khách hàng", documents: "Kho Hợp đồng & Báo giá", reports: "Báo cáo Công việc Ca" }},
  knowledge_manager: { en: { reports: "Department Performance Reports" }, vi: { reports: "Báo cáo Hiệu suất Phòng ban" }},
};

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
  apiConnected,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasNewNotification] = useState(true); // ponytail: demo state; replace with real subscription
  const dropdownRef = useRef(null);
  const isVi = lang === "vi";

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const titles = VIEW_TITLES[lang] || VIEW_TITLES.en;
  const roleOverrides = ROLE_VIEW_TITLES[role];
  const roleSpecific = roleOverrides ? (roleOverrides[lang] || roleOverrides.en) : {};
  const currentTitle = roleSpecific[view] || titles[view] || titles.home;

  return (
    <header
      className="topbar"
      role="banner"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 20px",
        height: 62,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border-soft)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* ── LEFT: PAGE TITLE ─────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        {/* Breadcrumb context */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
            fontFamily: "var(--f-display)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}>
            {currentTitle}
          </h1>
          {/* API status line */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: apiConnected ? "#10b981" : "#f59e0b",
            }} />
            <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)", whiteSpace: "nowrap" }}>
              {apiConnected
                ? (isVi ? "API · Trực tuyến" : "API · Online")
                : (isVi ? "Chế độ Offline" : "Offline Mode")}
            </span>
          </div>
        </div>

        {/* Global search trigger */}
        <div
          style={{ position: "relative", width: 300, flexShrink: 1 }}
          className="topbar-search-box"
        >
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-4)", pointerEvents: "none", display: "flex", alignItems: "center",
          }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            readOnly
            role="button"
            aria-label={isVi ? "Tìm kiếm nhanh (Ctrl+K)" : "Quick search (Ctrl+K)"}
            placeholder={isVi ? "Tìm kiếm nhanh..." : "Quick search..."}
            onClick={() => onNavigate("search")}
            style={{
              width: "100%",
              padding: "7px 36px 7px 32px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--text-2)",
              cursor: "pointer",
              fontFamily: "var(--f-body)",
              boxSizing: "border-box",
              transition: "border-color 0.15s, box-shadow 0.15s",
              outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
          />
          <kbd style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            fontSize: 9.5, color: "var(--text-4)",
            border: "1px solid var(--border)", padding: "1px 4px",
            borderRadius: 3, background: "var(--surface-3)", fontFamily: "var(--f-mono)",
            pointerEvents: "none",
          }}>
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── RIGHT: ACTIONS ───────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Notifications */}
        <button
          aria-label={isVi ? "Thông báo" : "Notifications"}
          style={{
            position: "relative", width: 36, height: 36,
            borderRadius: 8, border: "1px solid transparent",
            background: "transparent", color: "var(--text-3)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--text-3)"; }}
        >
          <Bell size={17} strokeWidth={1.8} />
          {hasNewNotification && (
            <span
              aria-label={isVi ? "Có thông báo mới" : "New notifications"}
              style={{
                position: "absolute", top: 7, right: 7,
                width: 7, height: 7, borderRadius: "50%",
                background: "#ef4444",
                border: "1.5px solid var(--surface)",
              }}
            />
          )}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "var(--border)", flexShrink: 0 }} aria-hidden="true" />

        {/* User profile dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            id="user-profile-trigger"
            aria-label={isVi ? "Thông tin tài khoản" : "Account profile"}
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 8px 4px 5px", borderRadius: 8,
              border: isProfileOpen ? "1px solid var(--border)" : "1px solid transparent",
              background: isProfileOpen ? "var(--surface-2)" : "transparent",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            onMouseLeave={e => {
              if (!isProfileOpen) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${currentUser?.color || "#2563eb"} 0%, ${currentUser?.accentColor || "#0891b2"} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: "0.02em",
            }}>
              {currentUser?.avatar || "US"}
            </div>
            {/* Name + role */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }} className="topbar-user-info">
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap", lineHeight: 1.25 }}>
                {currentUser?.name?.split(" ").slice(-1)[0] || "User"}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                {isVi ? currentUser?.badge?.split(" ").slice(0, 2).join(" ") : currentUser?.badgeEn?.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
            <ChevronDown
              size={12}
              color="var(--text-4)"
              style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
            />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div
              role="menu"
              aria-labelledby="user-profile-trigger"
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 288, background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 12px 32px rgba(0,0,0,0.14), 0 4px 10px rgba(0,0,0,0.08)",
                zIndex: 1000, overflow: "hidden",
                animation: "dropdownFadeIn 0.15s ease-out",
              }}
            >
              {/* Profile header */}
              <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${currentUser?.color || "#2563eb"} 0%, ${currentUser?.accentColor || "#0891b2"} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 14, fontWeight: 800,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}>
                  {currentUser?.avatar || "US"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 2 }}>
                    {currentUser?.name || "User"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                    {currentUser?.email || ""}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3,
                    color: currentUser?.color || "#0891b2",
                    background: `${currentUser?.color || "#0891b2"}15`,
                    border: `1px solid ${currentUser?.color || "#0891b2"}28`,
                    display: "inline-block", textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {isVi ? currentUser?.badge : currentUser?.badgeEn}
                  </span>
                </div>
              </div>

              {/* Dept + 2FA */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text-2)" }}>
                  <Building2 size={12} color="var(--text-4)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isVi ? currentUser?.department : currentUser?.departmentEn}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#059669" }}>
                  <ShieldCheck size={12} style={{ flexShrink: 0 }} />
                  <span>{isVi ? "2FA Hardware Token: Đã kích hoạt" : "2FA Hardware Token: Active"}</span>
                </div>
              </div>

              {/* Role switcher */}
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-soft)" }}>
                <p style={{ fontSize: 9.5, fontWeight: 800, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, paddingLeft: 2 }}>
                  {isVi ? "Chuyển đổi vai trò" : "Switch Persona"}
                </p>
                {Object.values(ENTERPRISE_ROLES).map(r => {
                  const isCurrent = r.id === currentUser?.id;
                  return (
                    <button
                      key={r.id}
                      role="menuitem"
                      onClick={() => { onRoleChange(r.id); setIsProfileOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "5px 8px", borderRadius: 6, marginBottom: 2,
                        border: isCurrent ? `1px solid ${r.color}35` : "1px solid transparent",
                        background: isCurrent ? `${r.color}0e` : "transparent",
                        cursor: "pointer", transition: "all 0.12s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--text-1)" : "var(--text-2)" }}>
                          {r.name}
                        </span>
                      </div>
                      {isCurrent ? (
                        <Check size={12} color={r.color} />
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, color: r.color }}>
                          {isVi ? r.badge?.split(" ")[0] : r.badgeEn?.split(" ")[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lang + Theme */}
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Globe size={12} color="var(--text-4)" />
                  <div style={{ display: "flex", gap: 3 }}>
                    {["en", "vi"].map(l => (
                      <button
                        key={l}
                        onClick={() => onLangChange(l)}
                        style={{
                          padding: "3px 9px", borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                          border: lang === l ? "1px solid #2563eb" : "1px solid var(--border)",
                          background: lang === l ? "rgba(37,99,235,0.08)" : "transparent",
                          color: lang === l ? "#2563eb" : "var(--text-3)",
                          cursor: "pointer", fontFamily: "var(--f-body)",
                          transition: "all 0.12s",
                        }}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
                  aria-label={theme === "light" ? (isVi ? "Chuyển Dark Mode" : "Switch to Dark Mode") : (isVi ? "Chuyển Light Mode" : "Switch to Light Mode")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 6, fontSize: 10.5, fontWeight: 600,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-2)", cursor: "pointer", fontFamily: "var(--f-body)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {theme === "light"
                    ? <Moon size={12} color="#38bdf8" />
                    : <Sun size={12} color="#d97706" />}
                  {theme === "light" ? "Dark" : "Light"}
                </button>
              </div>

              {/* Actions */}
              <div style={{ padding: "6px 10px 8px" }}>
                <button
                  role="menuitem"
                  onClick={() => { setIsProfileOpen(false); onOpenLanding(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%",
                    padding: "7px 9px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                    color: "var(--text-2)", background: "transparent", border: "none",
                    cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                    fontFamily: "var(--f-body)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  <HomeIcon size={13} color="var(--text-4)" />
                  {isVi ? "Trang chủ giới thiệu" : "Public Landing Page"}
                </button>

                {onLogout && (
                  <button
                    role="menuitem"
                    onClick={() => { setIsProfileOpen(false); onLogout(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%",
                      padding: "7px 9px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      color: "#dc2626", background: "rgba(220,38,38,0.05)",
                      border: "1px solid rgba(220,38,38,0.15)",
                      cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                      marginTop: 3, fontFamily: "var(--f-body)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.1)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,38,38,0.05)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.15)"; }}
                  >
                    <LogOut size={13} />
                    {isVi ? "Đăng xuất hệ thống" : "Sign Out"}
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
