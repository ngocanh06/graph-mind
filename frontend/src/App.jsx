import React, { useState, useEffect } from "react";
import { I18N } from "./data/i18n";
import { INITIAL_DATA } from "./data/mockData";
import { fetchHealth, fetchSignals, fetchEntities } from "./services/api";

import Topbar from "./components/Topbar";
import NavRail from "./components/NavRail";
import DemoBanner from "./components/DemoBanner";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";

import ExecutiveView from "./views/ExecutiveView";
import CopilotView from "./views/CopilotView";
import KnowledgeView from "./views/KnowledgeView";
import SearchView from "./views/SearchView";
import ConnectorsView from "./views/ConnectorsView";
import RiskView from "./views/RiskView";
import DocumentsView from "./views/DocumentsView";
import ReportsView from "./views/ReportsView";
import AdminView from "./views/AdminView";

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("aegis_lang") || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem("aegis_theme") || "light");
  const [role, setRole] = useState("executive");
  const [view, setView] = useState("executive");
  const [pageMode, setPageMode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("mode");
      if (p === "app") return "app";
      if (p === "landing") return "landing";
    } catch (e) {}
    return "landing"; // Default is the authentic Graph Mind Enterprise Knowledge Observatory!
  }); // "app" | "landing" | "login"
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
    if (newRole === "executive") setView("executive");
    else if (newRole === "knowledge_manager") setView("knowledge");
    else if (newRole === "it_admin") setView("admin");
    else if (newRole === "standard") setView("search");
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
        onEnterPlatform={(chosenRole) => {
          const targetRole = chosenRole || role || "executive";
          setRole(targetRole);
          setPageMode("app");
          // Route immediately to role-specific primary workspace!
          if (targetRole === "executive") setView("executive");
          else if (targetRole === "knowledge_manager") setView("knowledge");
          else if (targetRole === "it_admin") setView("admin");
          else if (targetRole === "standard") setView("search");
          else setView("executive");
        }}
        onBackToLanding={() => setPageMode("landing")}
        onSelectRole={setRole}
        role={role}
        lang={lang}
        t={t}
      />
    );
  }

  // 3. ENTERPRISE WORKSPACE (ROLE-AWARE)
  return (
    <div className="app-container">
      {/* Sidebar Rail with Role Partitioning */}
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
        onRoleChange={handleRoleChange}
      />

      {/* Main Content Workspace */}
      <div className="shell">
        <Topbar
          view={view}
          lang={lang}
          theme={theme}
          role={role}
          onThemeChange={setTheme}
          onLangChange={setLang}
          onRoleChange={handleRoleChange}
          onOpenLanding={() => setPageMode("landing")}
          onNavigate={setView}
          t={t}
          apiConnected={apiConnected}
        />

        <main className="workspace">
          {/* Guided Demo Banner */}
          {view === "executive" && (
            <DemoBanner
              currentStep={demoStep}
              onStepClick={handleDemoStep}
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
            />
          )}

          {view === "connectors" && <ConnectorsView t={t} lang={lang} />}

          {view === "risk" && <RiskView onNavigate={setView} t={t} lang={lang} />}

          {view === "documents" && (
            <DocumentsView
              onNavigate={setView}
              t={t}
              lang={lang}
            />
          )}

          {view === "reports" && (
            <ReportsView
              onNavigate={setView}
              t={t}
              lang={lang}
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
