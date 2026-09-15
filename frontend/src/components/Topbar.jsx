import React from "react";

export default function Topbar({
  view,
  lang,
  theme,
  role,
  onThemeChange,
  onLangChange,
  onRoleChange,
  onOpenLanding,
  onNavigate,
  t,
  apiConnected
}) {
  const titles = {
    executive: lang === "vi" ? ["Tổng quan Lãnh đạo", "Toàn cảnh Trí tuệ Doanh nghiệp"] : ["Executive", "Enterprise Intelligence Overview"],
    copilot: lang === "vi" ? ["Trợ lý AI Copilot", "Trung tâm Chỉ huy Tri thức"] : ["AI Copilot", "Knowledge Command Center"],
    knowledge: lang === "vi" ? ["Không gian Tri thức", "Đồ thị Thực thể & Xác thực Con người"] : ["Knowledge", "Entities, graph and human verification"],
    search: lang === "vi" ? ["Tìm kiếm Thông minh", "Tìm kiếm Tri thức Doanh nghiệp"] : ["Smart Search", "Enterprise Knowledge Search"],
    connectors: lang === "vi" ? ["Kết nối Dữ liệu", "Trung tâm Điều khiển Dữ liệu"] : ["Data Connectors", "Data Control Center"],
    risk: lang === "vi" ? ["Trung tâm Rủi ro", "Đài Quan sát Rủi ro Doanh nghiệp"] : ["Risk Center", "Business Risk Observatory"],
    documents: lang === "vi" ? ["Khám phá Tài liệu", "Tài liệu thu nạp & Tri thức trích xuất"] : ["Document Explorer", "Ingested files and extracted knowledge"],
    reports: lang === "vi" ? ["Báo cáo Chiến lược", "Tạo Báo cáo Tổng hợp Lãnh đạo"] : ["Reports", "Executive Briefing generator"],
    admin: lang === "vi" ? ["Quản trị Hệ thống", "Phân quyền, Audit & Chi phí LLMOps"] : ["Administration", "Permissions, audit and AI operations"]
  };

  const currentTitle = titles[view] || titles.executive;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="crumb">
          {currentTitle[0]} <span className="crumb-sub">{currentTitle[1]}</span>
        </div>
      </div>

      <div className="topbar-right">

        {/* Signature Knowledge Pulse Component */}
        <div
          className="kpulse-widget"
          title="Knowledge Pulse — Live Python FastAPI Engine"
          onClick={() => onNavigate("connectors")}
        >
          <svg viewBox="0 0 114 20">
            <line x1="8" y1="10" x2="28" y2="10" className="kp-edge" />
            <line x1="28" y1="10" x2="48" y2="10" className="kp-edge" />
            <line x1="48" y1="10" x2="68" y2="10" className="kp-flow" />
            <line x1="68" y1="10" x2="88" y2="10" className="kp-flow" />
            <line x1="88" y1="10" x2="106" y2="10" className="kp-edge" />
            <circle cx="8" cy="10" r="3" className="kp-node active" />
            <circle cx="28" cy="10" r="3" className="kp-node active" />
            <circle cx="48" cy="10" r="3" className="kp-node active" />
            <circle cx="68" cy="10" r="3" className="kp-node active" />
            <circle cx="88" cy="10" r="3" className="kp-node" />
            <circle cx="106" cy="10" r="3" className="kp-node" />
          </svg>
          <div className="kpulse-label">
            {lang === "vi" ? "247 nguồn đồng bộ" : "247 sources synced"} ·{" "}
            <b>{apiConnected ? "Python FastAPI (:5000)" : "AI Hybrid GraphRAG"}</b>
          </div>
        </div>

        {/* Role Persona Switcher */}
        <div className="role-badge" title="Switch User Role Persona">
          <i className="fa-solid fa-user-gear" style={{ fontSize: "12px", color: "var(--cyan)" }}></i>
          <select value={role} onChange={(e) => onRoleChange(e.target.value)}>
            <option value="executive">{lang === "vi" ? "Lãnh đạo (CFO)" : "Executive (CFO)"}</option>
            <option value="knowledge_manager">{lang === "vi" ? "Quản lý Tri thức" : "Knowledge Manager"}</option>
            <option value="it_admin">{lang === "vi" ? "Quản trị viên IT" : "IT Administrator"}</option>
            <option value="standard">{lang === "vi" ? "Chuyên viên Nghiệp vụ" : "Standard User"}</option>
          </select>
        </div>

        {/* Bilingual Selector */}
        <div className="ctrl-group">
          <button className={`ctrl-btn btn-lang ${lang === "en" ? "active" : ""}`} onClick={() => onLangChange("en")}>
            EN
          </button>
          <button className={`ctrl-btn btn-lang ${lang === "vi" ? "active" : ""}`} onClick={() => onLangChange("vi")}>
            VI
          </button>
        </div>

        {/* Theme Selector (Light Primary, Dark Secondary) */}
        <div className="ctrl-group">
          <button className={`ctrl-btn btn-theme ${theme === "light" ? "active" : ""}`} onClick={() => onThemeChange("light")}>
            <i className="fa-solid fa-sun" style={{ marginRight: "4px", fontSize: "11px" }}></i>Light
          </button>
          <button className={`ctrl-btn btn-theme ${theme === "dark" ? "active" : ""}`} onClick={() => onThemeChange("dark")}>
            <i className="fa-solid fa-moon" style={{ marginRight: "4px", fontSize: "11px" }}></i>Dark
          </button>
        </div>

        <button className="icon-btn" title="View Public Landing Page" onClick={onOpenLanding}>
          <i className="fa-solid fa-house" style={{ fontSize: "13px" }}></i>
        </button>
      </div>
    </header>
  );
}
