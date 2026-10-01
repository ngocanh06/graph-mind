import React, { useState, useEffect } from "react";
import { I18N } from "./data/i18n";
import { INITIAL_DATA } from "./data/mockData";
import { ENTERPRISE_ROLES } from "./data/roles";
import { fetchHealth, fetchSignals, fetchEntities } from "./services/api";

import Topbar from "./components/Topbar";
import NavRail from "./components/NavRail";
import DemoBanner from "./components/DemoBanner";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";

import HomeView from "./views/m4_decision_support/HomeView";
import ExecutiveView from "./views/m4_decision_support/ExecutiveView";
import CopilotView from "./views/m3_hybrid_copilot/CopilotView";
import KnowledgeView from "./views/m2_knowledge_editor/KnowledgeView";
import SearchView from "./views/m5_multifacet_search/SearchView";
import ConnectorsView from "./views/m1_data_sync/ConnectorsView";
import RiskView from "./views/m4_decision_support/RiskView";
import DocumentsView from "./views/m2_knowledge_editor/DocumentsView";
import ReportsView from "./views/m4_decision_support/ReportsView";
import AdminView from "./views/m6_admin_security/AdminView";

const VALID_VIEWS = [
  "home",
  "executive",
  "copilot",
  "knowledge",
  "search",
  "connectors",
  "risk",
  "documents",
  "reports",
  "admin"
];

function getInitialRouting() {
  try {
    // 1. Kiểm tra query parameters (?view=... hoặc ?mode=...)
    const params = new URLSearchParams(window.location.search);
    const queryView = params.get("view");
    const queryMode = params.get("mode");

    if (queryView && VALID_VIEWS.includes(queryView)) {
      return { mode: "app", view: queryView };
    }
    if (queryMode === "login" || queryMode === "landing") {
      return { mode: queryMode, view: "executive" };
    }

    // 2. Kiểm tra URL hash (#admin, #search, #login, #landing, ...)
    const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    if (hash === "login") return { mode: "login", view: "executive" };
    if (hash === "landing") return { mode: "landing", view: "executive" };
    if (VALID_VIEWS.includes(hash)) {
      return { mode: "app", view: hash };
    }

    // 3. Phục hồi từ localStorage khi người dùng bấm F5
    const savedMode = localStorage.getItem("aegis_page_mode");
    const savedView = localStorage.getItem("aegis_current_view");

    if (savedMode === "app") {
      const activeView = (savedView && VALID_VIEWS.includes(savedView)) ? savedView : "home";
      return { mode: "app", view: activeView };
    }
    if (savedMode === "login") return { mode: "login", view: "executive" };
    if (savedMode === "landing") return { mode: "landing", view: "executive" };
  } catch (e) {
    console.error("Error determining initial route:", e);
  }

  // Mặc định nếu chưa từng truy cập
  return { mode: "app", view: "home" };
}

export default function App() {
  const initialRoute = getInitialRouting();
  const [lang, setLang] = useState(() => localStorage.getItem("aegis_lang") || "vi");
  const [theme, setTheme] = useState(() => localStorage.getItem("aegis_theme") || "light");
  const [role, setRole] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_user");
      if (saved) return JSON.parse(saved).id || "executive";
    } catch (e) {}
    return "executive";
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.id === "executive") return ENTERPRISE_ROLES.executive;
        return u;
      }
    } catch (e) {}
    return ENTERPRISE_ROLES.executive;
  });
  const [view, setView] = useState(initialRoute.view);
  const [pageMode, setPageMode] = useState(initialRoute.mode); // "app" | "landing" | "login"
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [demoStep, setDemoStep] = useState(1);
  const [selectedEntity, setSelectedEntity] = useState("abc");

  const [entities, setEntities] = useState(INITIAL_DATA.entities);
  const [signals, setSignals] = useState(INITIAL_DATA.signals);
  const [apiConnected, setApiConnected] = useState(false);

  const t = I18N[lang] || I18N.en;

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aegis_theme", theme);
  }, [theme]);

  // Persist language
  useEffect(() => {
    localStorage.setItem("aegis_lang", lang);
  }, [lang]);

  // Enable smooth window scrolling for Landing Page & Login
  useEffect(() => {
    if (pageMode === "landing" || pageMode === "login") {
      document.documentElement.style.scrollBehavior = "smooth";
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    } else {
      document.documentElement.style.scrollBehavior = "auto";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
  }, [pageMode]);

  // Đồng bộ pageMode & view vào localStorage và URL Hash
  useEffect(() => {
    try {
      localStorage.setItem("aegis_page_mode", pageMode);
      if (pageMode === "landing") {
        window.history.replaceState(null, "", window.location.pathname + "#landing");
      } else if (pageMode === "login") {
        window.history.replaceState(null, "", window.location.pathname + "#login");
      } else if (pageMode === "app") {
        localStorage.setItem("aegis_current_view", view);
        window.history.replaceState(null, "", window.location.pathname + "#" + view);
      }
    } catch (e) {}
  }, [pageMode, view]);

  // Lắng nghe sự kiện hashchange nếu người dùng điều hướng bằng URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (hash === "login") {
        setPageMode("login");
      } else if (hash === "landing") {
        setPageMode("landing");
      } else if (VALID_VIEWS.includes(hash)) {
        setPageMode("app");
        setView(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Check Python FastAPI backend
  useEffect(() => {
    async function initData() {
      const health = await fetchHealth();
      if (health && health.success) {
        setApiConnected(true);
      }
      const sigData = await fetchSignals();
      if (sigData && sigData.success && sigData.data) {
        setSignals(sigData.data);
      }
      const entData = await fetchEntities();
      if (entData && entData.success && entData.data) {
        setEntities(entData.data);
      }
    }
    initData();
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    const user = ENTERPRISE_ROLES[newRole] || ENTERPRISE_ROLES.executive;
    setCurrentUser(user);
    try {
      localStorage.setItem("aegis_user", JSON.stringify(user));
    } catch (e) {}
    setView("home");
  };

  const handleDemoStep = (step) => {
    setDemoStep(step);
    setPageMode("app");
    if (step === 1) setView("executive");
    if (step === 2) setView("copilot");
    if (step === 3) setView("knowledge");
    if (step === 4) setView("risk");
    if (step === 5) setView("reports");
  };

  const handleUpdateEntity = (id, updates) => {
    setEntities((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  // 1. PUBLIC LANDING PAGE
  if (pageMode === "landing") {
    return (
      <LandingPage
        onEnterPlatform={() => setPageMode("login")}
        onShowLogin={() => setPageMode("login")}
        lang={lang}
        onLangChange={setLang}
        theme={theme}
        onThemeChange={setTheme}
        t={t}
      />
    );
  }

  // 2. LOGIN & ROLE SELECTION GATEWAY
  if (pageMode === "login") {
    return (
      <LoginPage
        onEnterPlatform={(authenticatedUser) => {
          const user = (authenticatedUser && authenticatedUser.id)
            ? authenticatedUser
            : (ENTERPRISE_ROLES[authenticatedUser] || ENTERPRISE_ROLES.executive);
          setCurrentUser(user);
          setRole(user.id);
          setView(user.defaultView || "executive");
          try {
            localStorage.setItem("aegis_user", JSON.stringify(user));
          } catch (e) {}
          setPageMode("app");
        }}
        onBackToLanding={() => setPageMode("landing")}
        onSelectRole={(r) => {
          if (typeof r === "string" && ENTERPRISE_ROLES[r]) {
            setRole(r);
            setCurrentUser(ENTERPRISE_ROLES[r]);
          }
        }}
        role={role}
        lang={lang}
        t={t}
      />
    );
  }

  // 3. ENTERPRISE WORKSPACE (ROLE-AWARE)
  return (
    <div className="app-container" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <Topbar
        view={view}
        lang={lang}
        theme={theme}
        role={role}
        currentUser={currentUser}
        onThemeChange={setTheme}
        onLangChange={setLang}
        onRoleChange={handleRoleChange}
        onOpenLanding={() => setPageMode("landing")}
        onLogout={() => setPageMode("login")}
        onNavigate={setView}
        t={t}
        apiConnected={apiConnected}
      />

      {/* Main Content: Sidebar + Workspace */}
      <div className="shell" style={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <NavRail
          currentView={view}
          onNavigate={setView}
          onOpenLanding={() => setPageMode("landing")}
          onLogout={() => setPageMode("login")}
          isOpen={isRailOpen}
          onToggleOpen={() => setIsRailOpen(!isRailOpen)}
          t={t}
          lang={lang}
          role={role}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
        />

        <main className="workspace" style={{ flex: 1, overflowY: "auto", minWidth: 0, background: "#f8fafc" }}>
          {view === "home" && (
            <HomeView
              onNavigate={setView}
              role={role}
              currentUser={currentUser}
              lang={lang}
              t={t}
            />
          )}

          {view === "executive" && (
            <ExecutiveView
              entities={entities}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              signals={signals}
              onNavigate={setView}
              t={t}
              lang={lang}
            />
          )}

          {view === "copilot" && (
            <CopilotView
              onNavigate={setView}
              t={t}
              lang={lang}
              apiConnected={apiConnected}
              role={role}
              currentUser={currentUser}
            />
          )}

          {view === "knowledge" && (
            <KnowledgeView
              entities={entities}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              onUpdateEntity={handleUpdateEntity}
              t={t}
              lang={lang}
            />
          )}

          {view === "search" && (
            <SearchView
              onNavigate={setView}
              onSelectEntity={setSelectedEntity}
              t={t}
              lang={lang}
              role={role}
              currentUser={currentUser}
            />
          )}

          {view === "connectors" && <ConnectorsView t={t} lang={lang} />}

          {view === "risk" && <RiskView onNavigate={setView} t={t} lang={lang} />}

          {view === "documents" && (
            <DocumentsView
              onNavigate={setView}
              t={t}
              lang={lang}
              role={role}
              currentUser={currentUser}
            />
          )}

          {view === "reports" && (
            <ReportsView
              onNavigate={setView}
              t={t}
              lang={lang}
              role={role}
              currentUser={currentUser}
            />
          )}

          {view === "admin" && (
            <AdminView
              onNavigate={setView}
              t={t}
              lang={lang}
            />
          )}
        </main>
      </div>
    </div>
  );
}
