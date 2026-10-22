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

const NOTIF_CONFIG = {
  created: {
    icon: "✓",
    labelVi: "Đã thêm tài liệu",
    labelEn: "Document added",
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.12)",
  },
  modified: {
    icon: "↻",
    labelVi: "Đã cập nhật tài liệu",
    labelEn: "Document updated",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
  },
  deleted: {
    icon: "✓",
    labelVi: "Đã xóa tài liệu",
    labelEn: "Document deleted",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.12)",
  },
  renamed: {
    icon: "↻",
    labelVi: "Đã đổi tên tài liệu",
    labelEn: "Document renamed",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.12)",
  },
  error: {
    icon: "!",
    labelVi: "Đồng bộ thất bại",
    labelEn: "Sync failed",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.12)",
  },
};

function formatNotifTimestamp(item) {
  if (item.formattedTime) return item.formattedTime;
  if (item.timestamp && item.timestamp.includes(" - ")) {
    const parts = item.timestamp.split(" - ");
    if (parts.length === 2) return `${parts[1]} • ${parts[0]}`;
  }
  return item.timestamp || item.timeStr || "";
}

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
  notifEvents = [],
  notifUnreadCount = 0,
  notifReadIds = new Set(),
  onMarkNotifRead,
  onMarkAllNotifRead,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const isVi = lang === "vi";

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
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
        {/* Notification Center */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            id="notif-center-button"
            aria-label={isVi ? "Thông báo" : "Notifications"}
            aria-expanded={isNotifOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsNotifOpen((prev) => !prev);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: isNotifOpen ? "1px solid var(--border)" : "1px solid transparent",
              background: isNotifOpen ? "var(--surface-2)" : "transparent",
              color: isNotifOpen ? "var(--text-1)" : "var(--text-3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              if (!isNotifOpen) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.color = "var(--text-3)";
              }
            }}
          >
            <Bell size={17} strokeWidth={1.8} />
            {notifUnreadCount > 0 && (
              <span
                aria-label={`${notifUnreadCount} ${isVi ? "thông báo mới" : "new notifications"}`}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid var(--surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                {notifUnreadCount > 99 ? "99+" : notifUnreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Notification Center */}
          {isNotifOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 380,
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 12,
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)",
                zIndex: 99999,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-soft)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)" }}>
                    {isVi ? "Thông báo" : "Notifications"}
                  </span>
                  {notifUnreadCount > 0 && (
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: "#ef44441a",
                        color: "#ef4444",
                        fontSize: 10.5,
                        fontWeight: 700,
                      }}
                    >
                      {notifUnreadCount} {isVi ? "chưa đọc" : "unread"}
                    </span>
                  )}
                </div>

                {notifUnreadCount > 0 && (
                  <button
                    onClick={() => onMarkAllNotifRead?.()}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--brand, #2563eb)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "3px 6px",
                      borderRadius: 4,
                      transition: "opacity 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {isVi ? "Đánh dấu đã đọc" : "Mark all read"}
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  padding: "4px 0",
                }}
              >
                {notifEvents.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 16px",
                      textAlign: "center",
                      color: "var(--text-4)",
                      fontSize: 12.5,
                    }}
                  >
                    <Bell size={24} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                    {isVi ? "Chưa có thông báo nào" : "No notifications yet"}
                  </div>
                ) : (
                  notifEvents.map((item) => {
                    const isUnread = notifReadIds ? !notifReadIds.has(item.id) : false;
                    const evType = item.eventType || (item.status === "deleted" ? "deleted" : "created");
                    const cfg = NOTIF_CONFIG[evType] || NOTIF_CONFIG.created;
                    const label = isVi ? cfg.labelVi : cfg.labelEn;
                    const timeDisplay = formatNotifTimestamp(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onMarkNotifRead?.(item.id);
                          const targetId = item.docId || item.fileName;
                          if (evType !== "deleted" && onNavigate && targetId) {
                            onNavigate("documents", targetId);
                            setIsNotifOpen(false);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--border-soft)",
                          background: isUnread ? "rgba(37, 99, 235, 0.05)" : "transparent",
                          cursor: evType !== "deleted" ? "pointer" : "default",
                          transition: "background 0.15s ease",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isUnread
                            ? "rgba(37, 99, 235, 0.05)"
                            : "transparent")
                        }
                      >
                        {/* Event Icon Badge */}
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: cfg.bg,
                            color: cfg.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {cfg.icon}
                        </span>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: isUnread ? 700 : 600,
                                color: isUnread ? "var(--text-1)" : "var(--text-2)",
                              }}
                            >
                              {label}
                            </span>
                            {/* Read / Unread Indicator Dot */}
                            {isUnread && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#2563eb",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>

                          {/* File Name & Rename Visual Diff */}
                          {evType === "renamed" ? (
                            <div style={{ marginTop: 2 }}>
                              <div style={{ color: "var(--text-4, #94a3b8)", textDecoration: "line-through", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.oldFileName}>
                                {item.oldFileName || item.fileName}
                              </div>
                              <div
                                style={{
                                  color: "var(--text-1)",
                                  fontWeight: 700,
                                  fontSize: 12.5,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  marginTop: 1,
                                }}
                                title={item.fileName}
                              >
                                <span style={{ color: "#7c3aed", fontSize: 13, flexShrink: 0 }}>➔</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fileName}</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: "var(--text-1)",
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.fileName || item.oldFileName}
                            >
                              {item.fileName || item.oldFileName}
                            </div>
                          )}

                          {/* Date + Time & Click hint */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                color: "var(--text-4)",
                                fontFamily: "var(--f-mono, monospace)",
                              }}
                            >
                              {timeDisplay}
                            </span>
                            {evType !== "deleted" && (
                              <span style={{ fontSize: 10.5, color: "var(--brand, #2563eb)", fontWeight: 600 }}>
                                {isVi ? "Xem tài liệu →" : "View doc →"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "8px 16px",
                  background: "var(--surface-2)",
                  borderTop: "1px solid var(--border-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-4)",
                }}
              >
                <span>AEGIS Local File Watcher</span>
                <span>{notifEvents.length} {isVi ? "sự kiện" : "events"}</span>
              </div>
            </div>
          )}
        </div>

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
