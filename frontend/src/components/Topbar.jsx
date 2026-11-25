import React, { useState, useRef, useEffect } from "react";
import { ENTERPRISE_ROLES } from "../data/roles";
import UserProfileModal from "./UserProfileModal";

const VIEW_TITLES = {
  en: {
    home: "Home",
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
    home: "Trang chủ",
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
  executive: { en: { reports: "Report Approvals & Strategic Decisions" }, vi: { reports: "Phê duyệt Báo cáo & Quyết định" } },
  it_admin: { en: { reports: "Audit Reconciliation & System Reports" }, vi: { reports: "Báo cáo Kiểm toán & Giám sát" } },
  standard: { en: { search: "Client Operations Workspace", documents: "Contracts & Quotes", reports: "Work & Shift Report" }, vi: { search: "Tác nghiệp Khách hàng", documents: "Kho Hợp đồng & Báo giá", reports: "Báo cáo Công việc Ca" } },
  knowledge_manager: { en: { reports: "Department Performance Reports" }, vi: { reports: "Báo cáo Hiệu suất Phòng ban" } },
};

const NOTIF_CONFIG = {
  created: {
    icon: "fa-solid fa-check",
    labelVi: "Đã thêm tài liệu",
    labelEn: "Document added",
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.12)",
  },
  modified: {
    icon: "fa-solid fa-rotate",
    labelVi: "Đã cập nhật tài liệu",
    labelEn: "Document updated",
    color: "#0891b2",
    bg: "rgba(8, 145, 178, 0.12)",
  },
  deleted: {
    icon: "fa-solid fa-trash",
    labelVi: "Đã xóa tài liệu",
    labelEn: "Document deleted",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.12)",
  },
  renamed: {
    icon: "fa-solid fa-pen",
    labelVi: "Đã đổi tên tài liệu",
    labelEn: "Document renamed",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.12)",
  },
  error: {
    icon: "fa-solid fa-triangle-exclamation",
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState("profile");
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
  const normRole = (role === "admin" || currentUser?.id === "admin" || currentUser?.role === "it_admin") ? "it_admin" : (role || "executive");
  const roleOverrides = ROLE_VIEW_TITLES[normRole] || ROLE_VIEW_TITLES[role];
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
            fontSize: 15.5,
            fontWeight: 700,
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
            fontFamily: "var(--f-display)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}>
            {currentTitle}
          </h1>
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
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 13 }} />
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
            onFocus={e => { e.target.style.borderColor = "var(--border-focus, #0891b2)"; e.target.style.boxShadow = "0 0 0 3px rgba(8,145,178,0.14)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* ── RIGHT: ACTIONS ───────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Language Switcher (EN / VI) directly on Header */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 6px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}>
          <i className="fa-solid fa-globe" style={{ fontSize: 12, color: "var(--text-4)", marginLeft: 2 }} />
          <div style={{ display: "flex", gap: 3 }}>
            {["en", "vi"].map(l => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                title={l === "vi" ? "Tiếng Việt" : "English"}
                style={{
                  padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                  border: lang === l ? "1px solid var(--cyan, #0284c7)" : "1px solid transparent",
                  background: lang === l ? "var(--cyan-soft, rgba(56, 189, 248, 0.14))" : "transparent",
                  color: lang === l ? "var(--cyan, #0284c7)" : "var(--text-3)",
                  cursor: "pointer", fontFamily: "var(--f-body)",
                  transition: "all 0.12s",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Dark / Light Mode Toggle directly on Header */}
        <button
          onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
          title={theme === "light" ? (isVi ? "Chuyển sang chế độ Tối" : "Switch to Dark Mode") : (isVi ? "Chuyển sang chế độ Sáng" : "Switch to Light Mode")}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text-2)", cursor: "pointer", fontFamily: "var(--f-body)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
        >
          {theme === "light"
            ? <i className="fa-solid fa-moon" style={{ fontSize: 12, color: "#38bdf8" }} />
            : <i className="fa-solid fa-sun" style={{ fontSize: 12, color: "#f59e0b" }} />}
          <span>{theme === "light" ? "Dark" : "Light"}</span>
        </button>

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
            <i className="fa-solid fa-bell" style={{ fontSize: 15 }} />
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
                      color: "var(--brand, #0891b2)",
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
                    <i className="fa-solid fa-bell" style={{ fontSize: 24, opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
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
                          background: isUnread ? "rgba(8, 145, 178, 0.06)" : "transparent",
                          cursor: evType !== "deleted" ? "pointer" : "default",
                          transition: "background 0.15s ease",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) =>
                        (e.currentTarget.style.background = isUnread
                          ? "rgba(8, 145, 178, 0.06)"
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
                          <i className={cfg.icon} style={{ fontSize: 11 }} />
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
                                  background: "#0891b2",
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
                                <i className="fa-solid fa-arrow-right" style={{ color: "var(--cyan, #0891b2)", fontSize: 11, flexShrink: 0 }} />
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
                              <span style={{ fontSize: 10.5, color: "var(--brand, #0891b2)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span>{isVi ? "Xem tài liệu" : "View doc"}</span>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
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
                <span>{isVi ? "Đồng bộ tài liệu thời gian thực" : "Real-time Document Watcher"}</span>
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
              background: `linear-gradient(135deg, ${currentUser?.color || "#0891b2"} 0%, ${currentUser?.accentColor || "#06b6d4"} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: "0.02em",
              boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)",
            }}>
              {currentUser?.avatar || "US"}
            </div>
            {/* Name + role */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }} className="topbar-user-info">
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap", lineHeight: 1.25 }}>
                {(() => {
                  if (currentUser?.id === "executive" || currentUser?.username === "ceo" || currentUser?.name?.includes("Hương")) return "Hương";
                  let n = currentUser?.name || "User";
                  n = n.replace(/\s*\(.*?\)/g, "").trim();
                  if (ENTERPRISE_ROLES[currentUser?.id]?.name) {
                    n = ENTERPRISE_ROLES[currentUser.id].name;
                  }
                  return n.split(" ").slice(-1)[0] || "User";
                })()}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                {(() => {
                  const cfg = ENTERPRISE_ROLES[currentUser?.id] || currentUser;
                  return isVi
                    ? (cfg?.badge && cfg.badge !== "EXECUTIVE DIRECTOR" ? cfg.badge : "BAN GIÁM ĐỐC")
                    : (cfg?.badgeEn || "EXECUTIVE DIRECTOR");
                })()}
              </span>
            </div>
            <i
              className="fa-solid fa-chevron-down"
              style={{
                fontSize: 10,
                color: "var(--text-4)",
                transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                flexShrink: 0
              }}
            />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div
              role="menu"
              aria-labelledby="user-profile-trigger"
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 320, background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 14px 36px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
                zIndex: 1000, overflow: "hidden",
                animation: "dropdownFadeIn 0.15s ease-out",
              }}
            >
              {/* Profile header */}
              <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${currentUser?.color || "#0891b2"} 0%, ${currentUser?.accentColor || "#06b6d4"} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 14, fontWeight: 800,
                  boxShadow: "0 2px 8px rgba(8, 145, 178, 0.25)",
                }}>
                  {currentUser?.avatar || "US"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 2 }}>
                    {(currentUser?.id === "executive" || currentUser?.username === "ceo" || currentUser?.name?.includes("Hương"))
                      ? "Trần Thị Thu Hương"
                      : (currentUser?.name?.includes("(") ? (ENTERPRISE_ROLES[currentUser?.id]?.name || currentUser?.name?.replace(/\s*\(.*?\)/g, "").trim()) : (currentUser?.name || "User"))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--f-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
                    {currentUser?.email || "huong.tran@graphmind.ai"}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "2.5px 8px", borderRadius: 4,
                    color: currentUser?.color || "#0891b2",
                    background: `${currentUser?.color || "#0891b2"}14`,
                    border: `1px solid ${currentUser?.color || "#0891b2"}30`,
                    display: "inline-block", textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>
                    {(() => {
                      const cfg = ENTERPRISE_ROLES[currentUser?.id] || currentUser;
                      return isVi
                        ? (cfg?.badge && cfg.badge !== "EXECUTIVE DIRECTOR" ? cfg.badge : "BAN GIÁM ĐỐC")
                        : (cfg?.badgeEn || "EXECUTIVE DIRECTOR");
                    })()}
                  </span>
                </div>
              </div>

              {/* Account Profile & Settings Quick Action Buttons */}
              <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  role="menuitem"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setModalDefaultTab("profile");
                    setIsProfileModalOpen(true);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%",
                    padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    color: "var(--text-1)", background: "transparent", border: "none",
                    cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                    fontFamily: "var(--f-body)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <i className="fa-regular fa-id-badge" style={{ fontSize: 13, color: "#0891b2", width: 16 }} />
                  <span>{isVi ? "Thông tin người dùng" : "User Profile"}</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setModalDefaultTab("settings");
                    setIsProfileModalOpen(true);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%",
                    padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    color: "var(--text-1)", background: "transparent", border: "none",
                    cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                    fontFamily: "var(--f-body)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <i className="fa-solid fa-gear" style={{ fontSize: 13, color: "#0891b2", width: 16 }} />
                  <span>{isVi ? "Cài đặt & Tùy chọn" : "Settings & Preferences"}</span>
                </button>
              </div>

              {/* Role switcher */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)" }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, paddingLeft: 4 }}>
                  {isVi ? "Chuyển đổi vai trò" : "Switch Persona"}
                </p>
                {Object.values(ENTERPRISE_ROLES).map(r => {
                  const isCurrent = r.id === currentUser?.id;
                  const roleLabel = isVi ? r.badge : r.badgeEn;
                  return (
                    <button
                      key={r.id}
                      role="menuitem"
                      onClick={() => { onRoleChange(r.id); setIsProfileOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 3,
                        border: isCurrent ? `1px solid ${r.color}35` : "1px solid transparent",
                        background: isCurrent ? `${r.color}10` : "transparent",
                        cursor: "pointer", transition: "all 0.12s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--text-1)" : "var(--text-2)" }}>
                          {r.name}
                        </span>
                      </div>
                      {isCurrent ? (
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, color: r.color,
                          background: `${r.color}18`, border: `1px solid ${r.color}35`,
                          padding: "2px 7px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4
                        }}>
                          <i className="fa-solid fa-check" style={{ fontSize: 9 }} />
                          {roleLabel}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 9.5, fontWeight: 600, color: r.color,
                          background: `${r.color}10`, border: `1px solid ${r.color}20`,
                          padding: "2px 7px", borderRadius: 4
                        }}>
                          {roleLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={{ padding: "6px 10px 8px" }}>
                {onLogout && (
                  <button
                    role="menuitem"
                    onClick={() => { setIsProfileOpen(false); onLogout(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%",
                      padding: "7px 9px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      color: "#dc2626", background: "transparent",
                      border: "none",
                      cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                      marginTop: 2, fontFamily: "var(--f-body)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: 11, flexShrink: 0 }} />
                    {isVi ? "Đăng xuất hệ thống" : "Sign Out"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile & Account Settings Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
        theme={theme}
        onThemeChange={onThemeChange}
        onLangChange={onLangChange}
        onNavigate={onNavigate}
        defaultTab={modalDefaultTab}
      />
    </header>
  );
}
