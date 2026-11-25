import React, { useState } from "react";
import { ENTERPRISE_ROLES } from "../data/roles";

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  lang,
  theme,
  onThemeChange,
  onLangChange,
  onNavigate,
  defaultTab = "profile",
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const isVi = lang === "vi";

  if (!isOpen) return null;

  const currentRoleConfig = ENTERPRISE_ROLES[currentUser?.id] || currentUser;
  const isExecutive = currentUser?.id === "executive" || currentUser?.username === "ceo";
  const isAdmin = currentUser?.id === "it_admin" || currentUser?.username === "admin" || isExecutive;

  const roleBadge = isVi
    ? (currentRoleConfig?.badge && currentRoleConfig.badge !== "EXECUTIVE DIRECTOR" ? currentRoleConfig.badge : "BAN GIÁM ĐỐC")
    : (currentRoleConfig?.badgeEn || "EXECUTIVE DIRECTOR");

  const deptName = isVi
    ? (currentRoleConfig?.department || "Ban Giám Đốc & Hội Đồng Quản Trị")
    : (currentRoleConfig?.departmentEn || "Executive Board & C-Suite");

  const fullName = isExecutive
    ? "Trần Thị Thu Hương"
    : (currentUser?.name?.includes("(") ? (currentRoleConfig?.name || currentUser?.name?.replace(/\s*\(.*?\)/g, "").trim()) : (currentUser?.name || "User"));

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-slideUp"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `${currentUser?.color || "#0891b2"}18`,
                color: currentUser?.color || "#0891b2",
              }}
            >
              <i className="fa-solid fa-id-card text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-1)] leading-tight">
                {isVi ? "Hồ sơ Tài khoản & Cài đặt" : "User Profile & Account Settings"}
              </h3>
              <p className="text-[11px] text-[var(--text-3)] font-medium">
                {isVi ? "Thông tin định danh và tùy chọn hệ thống" : "Identity details and system preferences"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-all cursor-pointer border border-transparent hover:border-[var(--border)]"
            title={isVi ? "Đóng" : "Close"}
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b px-6 pt-2 gap-2"
          style={{ borderColor: "var(--border-soft)", background: "var(--surface-2)" }}
        >
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "border-[#0891b2] text-[#0891b2]"
                : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"
            }`}
          >
            <i className="fa-regular fa-user text-xs" />
            <span>{isVi ? "Thông tin người dùng" : "User Profile"}</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "border-[#0891b2] text-[#0891b2]"
                : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"
            }`}
          >
            <i className="fa-solid fa-gear text-xs" />
            <span>{isVi ? "Cài đặt & Tùy chọn" : "Settings & Preferences"}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {activeTab === "profile" ? (
            /* TAB 1: THÔNG TIN NGƯỜI DÙNG */
            <div className="space-y-4">
              {/* Profile Card Banner */}
              <div
                className="p-4 rounded-xl border flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${currentUser?.color || "#0891b2"}10, transparent)`,
                  borderColor: `${currentUser?.color || "#0891b2"}30`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${currentUser?.color || "#0891b2"} 0%, ${currentUser?.accentColor || "#06b6d4"} 100%)`,
                  }}
                >
                  {currentUser?.avatar || "US"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[var(--text-1)]">
                      {fullName}
                    </h4>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        color: currentUser?.color || "#0891b2",
                        background: `${currentUser?.color || "#0891b2"}18`,
                        border: `1px solid ${currentUser?.color || "#0891b2"}35`,
                      }}
                    >
                      {roleBadge}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-3)] font-mono mt-0.5">
                    {currentUser?.email || "huong.tran@graphmind.ai"}
                  </p>
                  <p className="text-[11.5px] text-[var(--text-2)] mt-1 flex items-center gap-1.5 font-medium">
                    <i className="fa-solid fa-building text-[10px] text-[var(--text-4)]" />
                    <span>{deptName}</span>
                  </p>
                </div>
              </div>

              {/* Detail Grid */}
              <div
                className="rounded-xl border divide-y text-xs"
                style={{ borderColor: "var(--border-soft)", background: "var(--surface-2)" }}
              >
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-id-badge text-[var(--text-4)] text-xs" />
                    {isVi ? "Mã nhân viên (User ID):" : "User ID:"}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-1)]">
                    USR-{currentUser?.id?.toUpperCase() || "EXEC"}-01
                  </span>
                </div>

                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-briefcase text-[var(--text-4)] text-xs" />
                    {isVi ? "Chức vụ đảm nhiệm:" : "Official Title:"}
                  </span>
                  <span className="font-semibold text-[var(--text-1)] text-right">
                    {isVi ? (currentRoleConfig?.title || "Giám Đốc Điều Hành") : (currentRoleConfig?.titleEn || "Executive Director")}
                  </span>
                </div>

                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-[var(--text-4)] text-xs" />
                    {isVi ? "Cấp độ phân quyền RBAC:" : "Security Clearance:"}
                  </span>
                  <span
                    className="font-bold text-[11px] px-2 py-0.5 rounded"
                    style={{
                      background: isExecutive ? "rgba(8, 145, 178, 0.12)" : "rgba(16, 185, 129, 0.12)",
                      color: isExecutive ? "#0891b2" : "#059669",
                      border: `1px solid ${isExecutive ? "rgba(8, 145, 178, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
                    }}
                  >
                    {isExecutive ? (isVi ? "Level 4 (C-Level Toàn quyền)" : "Level 4 (C-Level)") : (isVi ? "Level 3 (Quản lý nghiệp vụ)" : "Level 3 (Operational)")}
                  </span>
                </div>

                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-key text-[var(--text-4)] text-xs" />
                    {isVi ? "Xác thực 2FA:" : "2FA Authentication:"}
                  </span>
                  <span className="font-bold text-[#059669] flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-xs" />
                    {isVi ? "FIDO2 Hardware Key (YubiKey) - Đã kích hoạt" : "FIDO2 Hardware Key - Active"}
                  </span>
                </div>

                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-circle-dot text-[var(--text-4)] text-xs" />
                    {isVi ? "Trạng thái tài khoản:" : "Account Status:"}
                  </span>
                  <span className="font-bold text-[#059669] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    {isVi ? "Đang hoạt động (Active)" : "Active"}
                  </span>
                </div>

                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-[var(--text-3)] font-medium flex items-center gap-2">
                    <i className="fa-solid fa-network-wired text-[var(--text-4)] text-xs" />
                    {isVi ? "Phiên làm việc:" : "Active Session:"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-2)]">
                    192.168.1.105 • SSL TLS 1.3
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: CÀI ĐẶT & TÙY CHỌN */
            <div className="space-y-4 text-xs">
              {/* Ngôn ngữ hiển thị */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
              >
                <div>
                  <h5 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                    <i className="fa-solid fa-globe text-[#0891b2]" />
                    {isVi ? "Ngôn ngữ hệ thống" : "System Language"}
                  </h5>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {isVi ? "Chọn ngôn ngữ hiển thị trên toàn bộ giao diện" : "Choose the interface display language"}
                  </p>
                </div>
                <div className="flex gap-1.5 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => onLangChange("vi")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      lang === "vi"
                        ? "bg-[#0891b2] text-white shadow-2xs"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    onClick={() => onLangChange("en")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      lang === "en"
                        ? "bg-[#0891b2] text-white shadow-2xs"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Chế độ giao diện */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
              >
                <div>
                  <h5 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                    <i className="fa-solid fa-palette text-[#f59e0b]" />
                    {isVi ? "Chế độ giao diện" : "Theme Mode"}
                  </h5>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {isVi ? "Tùy chỉnh chế độ sáng tối bảo vệ mắt" : "Switch between Light and Dark mode"}
                  </p>
                </div>
                <div className="flex gap-1.5 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => onThemeChange("light")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      theme === "light"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    <i className="fa-solid fa-sun text-[11px]" />
                    <span>{isVi ? "Sáng" : "Light"}</span>
                  </button>
                  <button
                    onClick={() => onThemeChange("dark")}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      theme === "dark"
                        ? "bg-sky-500 text-white shadow-2xs"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    <i className="fa-solid fa-moon text-[11px]" />
                    <span>{isVi ? "Tối" : "Dark"}</span>
                  </button>
                </div>
              </div>

              {/* Thông báo thời gian thực */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
              >
                <div>
                  <h5 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                    <i className="fa-solid fa-bell text-[#10b981]" />
                    {isVi ? "Thông báo Watcher thời gian thực" : "Live Watcher Notifications"}
                  </h5>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {isVi ? "Tự động nhận chuông báo và toast khi có file mới đồng bộ" : "Alert when new files sync into Central Storage"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  {isVi ? "Đang bật ✓" : "Active ✓"}
                </span>
              </div>

              {/* Phím tắt nhanh */}
              <div
                className="p-3.5 rounded-xl border space-y-2"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
              >
                <h5 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                  <i className="fa-solid fa-keyboard text-[var(--text-3)]" />
                  {isVi ? "Phím tắt thao tác nhanh" : "Keyboard Shortcuts"}
                </h5>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between items-center bg-[var(--surface)] p-2 rounded border border-[var(--border)]">
                    <span className="text-[var(--text-3)]">{isVi ? "Mở tìm kiếm:" : "Search:"}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold">Ctrl + K</kbd>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--surface)] p-2 rounded border border-[var(--border)]">
                    <span className="text-[var(--text-3)]">{isVi ? "Đóng cửa sổ:" : "Close Modal:"}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Quản trị hệ thống nâng cao */}
              {isAdmin && (
                <div
                  className="p-4 rounded-xl border flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(8, 145, 178, 0.05)",
                    borderColor: "rgba(8, 145, 178, 0.25)",
                  }}
                >
                  <div>
                    <h5 className="font-bold text-[var(--text-1)] flex items-center gap-2 text-xs">
                      <i className="fa-solid fa-sliders text-[#0891b2]" />
                      {isVi ? "Trung tâm Quản trị Hệ thống" : "System Administration"}
                    </h5>
                    <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                      {isVi ? "Cấu hình phân quyền RBAC, kiểm duyệt tài liệu và giám sát máy trạm" : "Manage RBAC matrix, document approvals, and telemetry"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate?.("admin");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0891b2] text-white font-bold text-xs hover:bg-[#0e7490] transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-xs"
                  >
                    <span>{isVi ? "Đi tới Quản trị" : "Open Admin"}</span>
                    <i className="fa-solid fa-arrow-right text-[10px]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="px-6 py-3 border-t flex justify-end"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-2)]"
          >
            {isVi ? "Đóng" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
