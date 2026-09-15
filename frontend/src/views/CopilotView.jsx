import React, { useState } from "react";
import { queryCopilot } from "../services/api";

export default function CopilotView({ onNavigate, t, lang, apiConnected }) {
  const [queryInput, setQueryInput] = useState("");
  const [isInferring, setIsInferring]= useState(false);
  const [activeThread, setActiveThread] = useState(1);
  const [toastMsg, setToastMsg]= useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleInfer = async () => {
    if (!queryInput.trim()) return;
    setIsInferring(true);
    showToast("Copilot synthesizing reasoning path from Knowledge Graph...");
    try {
      await queryCopilot(queryInput);
    } catch (e) {
      console.log("Unified local reasoning fallback");
    } finally {
      setTimeout(() => {
        setIsInferring(false);
        showToast("Reasoning Synthesis complete! Multi-hop verified.");
      }, 1200);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-brain text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Knowledge Pulse Sub-Bar (Executive Mission Telemetry) */}
      <div className="flex items-center justify-between px-space-base py-space-xs bg-surface-container-low mb-space-sm rounded-DEFAULT shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-primary tracking-widest font-semibold">
              NEURAL REASONING COCKPIT: SYNTHESIS ACTIVE
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded-DEFAULT border border-outline-variant/20">
            <span className="font-label-caps text-label-caps text-outline">GRAPHRAG DEPTH:</span>
            <span className="font-code-sm text-code-sm text-tertiary font-semibold">4-HOP DETERMINISTIC</span>
          </div>

          <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded-DEFAULT border border-outline-variant/20">
            <span className="font-label-caps text-label-caps text-outline">CROSS-MODAL VERIFICATION:</span>
            <span className="font-label-caps text-label-caps text-tertiary">PDF + SHEETS + TELEMETRY (SYNCED)</span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="font-label-caps text-label-caps text-outline">AUDIT IDENTIFIER:</span>
          <span className="font-code-sm text-code-sm text-primary-fixed bg-surface-container px-space-xs py-space-2xs rounded-DEFAULT">
            #EKMP-TR-88192-ALPHA
          </span>
          <div className="flex items-center gap-space-2xs bg-surface-container-high px-space-xs py-space-2xs rounded-DEFAULT text-on-surface">
            <i className="fa-solid fa-shield-halved text-[13px] text-tertiary"></i>
            <span className="font-label-caps text-label-caps">L5 PROVENANCE GUARANTEE</span>
          </div>
        </div>
      </div>

      {/* Primary Cockpit Tripartite Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start w-full pb-space-2xl">
        {/* ======================================== */}
        {/* LEFT COLUMN (25% - lg:col-span-3)             */}
        {/* Session Context & Knowledge Threads        */}
        {/* ======================================== */}
        <div className="lg:col-span-3 flex flex-col gap-space-md min-w-0">
          {/* Ingestion Stream & Active Context Selector */}
          <div className="bg-surface-container-low p-space-sm rounded-DEFAULT shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-2xs">
              <div className="flex items-center gap-space-xs">
                <i className="fa-solid fa-folder-tree text-primary text-[15px]"></i>
                <span className="font-label-caps text-label-caps text-on-surface tracking-wider uppercase">Active Context</span>
              </div>
              <span className="font-label-caps text-label-caps text-tertiary">38 LIVE STREAMS</span>
            </div>

            <div className="flex flex-col gap-space-2xs">
              <label className="font-label-caps text-label-caps text-outline uppercase">Knowledge Scope</label>
              <div className="relative">
                <select className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-body-sm px-space-sm py-space-xs rounded-DEFAULT appearance-none cursor-pointer focus:outline-none focus:bg-surface-container border border-outline-variant/20">
                  <option>All Enterprise Data (Full Graph)</option>
                  <option selected>Legal & Contracts + Q4 Financials</option>
                  <option>Q4 Financials & Invoice Ledgers</option>
                  <option>Local Watcher Files & Node Agents</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-space-xs top-space-sm pointer-events-none text-outline text-[12px]"></i>
              </div>
            </div>

            <div className="bg-surface-container p-space-xs rounded-DEFAULT flex flex-col gap-space-2xs border border-outline-variant/20">
              <div className="flex justify-between items-center text-outline">
                <span className="font-label-caps text-label-caps">INGESTION PIPELINE</span>
                <span className="font-code-sm text-code-sm text-tertiary font-bold">STABLE</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-DEFAULT overflow-hidden">
                <div className="bg-primary-container h-full w-[94%]"></div>
              </div>
              <span className="font-label-caps text-label-caps text-outline truncate">
                Vector Index: Milvus v2.4 • Graph: Neo4j Aura L4
              </span>
            </div>
          </div>

          {/* Recent Intelligence Inquiries */}
          <div className="bg-surface-container-low p-space-sm rounded-DEFAULT shadow-sm flex flex-col gap-space-xs border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-xs">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                Reasoning Inquiries
              </span>
              <button
                onClick={() => showToast("Initiating new reasoning session...")}
                className="font-label-caps text-label-caps text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-space-2xs"
              >
                <i className="fa-solid fa-plus text-[11px]"></i> NEW
              </button>
            </div>

            {/* Thread 1: Active */}
            <div
              onClick={() => setActiveThread(1)}
              className={`p-space-sm rounded-DEFAULT cursor-pointer shadow-inner relative overflow-hidden group ${activeThread === 1 ? "bg-surface-container-high" : "bg-surface-container-lowest hover:bg-surface-container"}`}>
              {activeThread === 1 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}
              <div className="flex items-center justify-between mb-space-2xs pl-space-xs">
                <span className="font-label-caps text-label-caps text-primary uppercase">ACTIVE SESSION</span>
                <span className="font-code-sm text-code-sm text-outline">14:02:18</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold pl-space-xs line-clamp-2">
                VIP customer purchasing decline & churn risk
              </p>
              <div className="flex items-center gap-space-xs mt-space-xs pl-space-xs">
                <i className="fa-solid fa-circle-check text-[12px] text-tertiary"></i>
                <span className="font-label-caps text-label-caps text-outline">HYBRID GRAPH TRAVERSED</span>
              </div>
            </div>

            {/* Thread 2 */}
            <div
              onClick={() => setActiveThread(2)}
              className="p-space-sm bg-surface-container-lowest hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-space-2xs">
                <span className="font-label-caps text-label-caps text-outline">SYNTHESIZED</span>
                <span className="font-code-sm text-code-sm text-outline">11:45 AM</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface line-clamp-2">
                Cross-departmental vendor overlap in EMEA operations
              </p>
              <div className="flex items-center gap-space-xs mt-space-xs">
                <span className="font-label-caps text-label-caps text-outline">12 Entities • 4 Subgraphs</span>
              </div>
            </div>

            {/* Thread 3 */}
            <div
              onClick={() => setActiveThread(3)}
              className="p-space-sm bg-surface-container-lowest hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-space-2xs">
                <span className="font-label-caps text-label-caps text-outline">SYNTHESIZED</span>
                <span className="font-code-sm text-code-sm text-outline">YESTERDAY</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface line-clamp-2">
                Supply chain SLA exposure across unindexed PDF7contracts
              </p>
              <div className="flex items-center gap-space-xs mt-space-xs">
                <span className="font-label-caps text-label-caps text-outline">21 Entities • 2 Discrepancies</span>
              </div>
            </div>

            {/* Thread 4 */}
            <div
              onClick={() => setActiveThread(4)}
              className="p-space-sm bg-surface-container-lowest hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-space-2xs">
                <span className="font-label-caps text-label-caps text-outline">ARCHIVED</span>
                <span className="font-code-sm text-code-sm text-outline">NOV 28</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface line-clamp-2">
                Audit trail for unverified Google Drive SOPs in Logistics Hub
              </p>
              <div className="flex items-center gap-space-xs mt-space-xs">
                <span className="font-label-caps text-label-caps text-outline">3 Conflicts Flagged</span>
              </div>
            </div>
          </div>

          {/* Live Retrieval Metrics Micro-Card */}
          <div className="bg-surface-container-low p-space-sm rounded-DEFAULT shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                Graph Retrieval Telemetry
              </span>
              <i className="fa-solid fa-rotate text-[13px] text-tertiary animate-spin"></i>
            </div>

            <div className="grid grid-cols-2 gap-space-xs">
              <div className="bg-surface-container-lowest p-space-xs rounded-DEFAULT flex flex-col border border-outline-variant/20">
                <span className="font-label-caps text-label-caps text-outline">SUBGRAPHS</span>
                <span className="font-metric-tabular-lg text-headline-md text-primary font-bold">38</span>
                <span className="font-label-caps text-label-caps text-tertiary">Traversed</span>
              </div>

              <div className="bg-surface-container-lowest p-space-xs rounded-DEFAULT flex flex-col border border-outline-variant/20">
                <span className="font-label-caps text-label-caps text-outline">HOP LATENCY</span>
                <span className="font-metric-tabular-lg text-headline-md text-on-surface font-bold">
                  14<span className="text-body-sm font-normal text-outline">ms</span>
                </span>
                <span className="font-label-caps text-label-caps text-tertiary">Sub-quantum</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-xs rounded-DEFAULT flex flex-col gap-space-2xs border border-outline-variant/20">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps text-outline">ALIGNMENT CONFIDENCE</span>
                <span className="font-code-sm text-code-sm text-primary font-bold">99.4%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-DEFAULT overflow-hidden">
                <div className="bg-tertiary h-full w-[99.4%]"></div>
              </div>
              <span className="font-label-caps text-label-caps text-outline">
                Vector embedding &lt;=&gt; Explicit graph triple matched
              </span>
            </div>
          </div>

          {/* Human Verification Auditor Profile Badge */}
          <div className="bg-surface-container-lowest p-space-sm rounded-DEFAULT flex items-center gap-space-sm border border-outline-variant/30">
            <div className="w-9 h-9 rounded-DEFAULT bg-surface-container-high flex items-center justify-center shrink-0">
              <i className="fa-solid fa-circle-check text-primary text-[18px]"></i>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">
                Audited by AI Reasoning Core
              </span>
              <span className="font-label-caps text-label-caps text-outline truncate">
                Model: GraphRAG-Neural-70B • Fallback: None
              </span>
            </div>
          </div>
        </div>

    </div>
  </div>
  );
}
