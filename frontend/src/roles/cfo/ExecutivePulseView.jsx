import React, { useState } from "react";

export default function ExecutiveView({
  entities = {},
  selectedEntity = "abc",
  onSelectEntity,
  signals = [],
  onNavigate,
  t = {},
  lang = "en"
}) {
  const isVi = lang === "vi";
  const [activeRange, setActiveRange] = useState("30D");
  const [viewMode, setViewMode] = useState("pulse"); // "pulse" | "matrix"
  const [selectedHub, setSelectedHub] = useState("core");
  const [signalFilter, setSignalFilter] = useState("all"); // "all" | "high" | "med" | "low"
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const entityList = Object.values(entities);

  const filteredSignals = signals.filter((s) => {
    if (signalFilter === "all") return true;
    return s.severity === signalFilter;
  });

  const hubDetails = {
    ingest: {
      title: isVi ? "Trung tâm Thu nạp Dữ liệu" : "Data Ingestion Stream",
      stat: "247 sources active",
      desc: isVi ? "Đang đồng bộ liên tục từ Google Drive, Google Sheets, ERP và AEGIS Local Agent." : "Continuous real-time sync across Google Drive, Google Sheets, ERP, and Local Agent.",
      badge: "LATENCY: 4.2s"
    },
    core: {
      title: isVi ? "Lõi Đồ thị Tri thức (Knowledge Graph Core)" : "Knowledge Graph Core",
      stat: "142,850 nodes · 890,400 triples",
      desc: isVi ? "Liên kết thực thể đa chiều, định danh khách hàng, hợp đồng, đơn hàng và điều khoản pháp lý." : "Multi-modal entity linkage across customers, contracts, orders, and legal clauses.",
      badge: "DENSITY: 4.8 REL/NODE"
    },
    reasoning: {
      title: isVi ? "Động cơ Suy luận GraphRAG AI" : "AI GraphRAG Reasoning Engine",
      stat: "2,410 inferences/hr",
      desc: isVi ? "Suy luận nguyên nhân 4 bước (multi-hop) với bằng chứng trích dẫn đạt chuẩn L5 Provenance." : "Deterministic 4-hop causal inference with verified evidence citations and L5 provenance.",
      badge: "CONFIDENCE: 89.4%"
    },
    risk: {
      title: isVi ? "Đài Quan sát Rủi ro Doanh nghiệp" : "Risk Observatory",
      stat: "$3.18M at-risk valuation",
      desc: isVi ? "Phát hiện sớm rời bỏ khách hàng (churn), hợp đồng sắp hết hạn và lệch pha thanh toán." : "Early detection of customer churn, contract expiration, and cashflow aging anomalies.",
      badge: "ANOMALIES: 3 HIGH"
    },
    action: {
      title: isVi ? "Hỗ trợ Ra Quyết định & HITL" : "Decision Support & HITL Loop",
      stat: "94% verified accuracy",
      desc: isVi ? "Hàng đợi xác thực con người (Human-in-the-loop) đảm bảo tri thức luôn tin cậy 100%." : "Human-in-the-loop validation queues ensure infallible enterprise knowledge governance.",
      badge: "HITL QUEUE: 3 PENDING"
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-circle-check text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* TOP TELEMETRY STRIP & DUAL VIEW SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-lg shadow-sm border border-outline-variant/30 mb-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {isVi ? "ĐỘ PHỦ TRI THỨC" : "KNOWLEDGE COVERAGE"}
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs mt-space-2xs">
              <span className="font-metric-tabular-lg text-metric-tabular-lg text-on-surface font-semibold">94.2%</span>
              <span className="font-code-sm text-code-sm text-outline">/ 18 REPOSITORIES</span>
            </div>
          </div>

          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
              {isVi ? "THỰC THỂ HOẠT ĐỘNG" : "ACTIVE ENTITIES"}
            </span>
            <div className="flex items-baseline gap-space-xs mt-space-2xs">
              <span className="font-metric-tabular-lg text-metric-tabular-lg text-primary font-semibold">142,850</span>
              <span className="font-code-sm text-code-sm text-outline">NODES • 890K REL</span>
            </div>
          </div>

          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
              {isVi ? "GIÁ TRỊ THEO DÕI" : "MONITORED VALUATION"}
            </span>
            <div className="flex items-baseline gap-space-xs mt-space-2xs">
              <span className="font-metric-tabular-lg text-metric-tabular-lg text-on-surface font-semibold">$48.6M</span>
              <span className="font-code-sm text-code-sm text-tertiary">VALUATION ACTIVE</span>
            </div>
          </div>

          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>

          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <i className="fa-solid fa-triangle-exclamation text-[14px] text-error"></i>
              <span className="font-label-caps text-label-caps text-error uppercase tracking-wider">
                {isVi ? "RỦI RO TIỀM ẨN" : "AT-RISK EXPOSURE"}
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs mt-space-2xs">
              <span className="font-metric-tabular-lg text-metric-tabular-lg text-error font-semibold">$3.18M</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">AI SCRUTINY</span>
            </div>
          </div>

          <div className="h-8 w-px bg-surface-container-highest hidden md:block"></div>

          <div className="flex flex-col hidden md:flex">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
              {isVi ? "TỐC ĐỘ SUY LUẬN" : "REASONING RATE"}
            </span>
            <div className="flex items-baseline gap-space-xs mt-space-2xs">
              <span className="font-metric-tabular-lg text-metric-tabular-lg text-tertiary font-semibold">2,410</span>
              <span className="font-code-sm text-code-sm text-outline">INF/HR</span>
            </div>
          </div>
        </div>

        {/* Controls & Perspective Selectors */}
        <div className="flex items-center gap-space-sm self-end lg:self-center">
          <div className="flex bg-surface-container-lowest p-space-2xs rounded-DEFAULT border border-outline-variant/30">
            {["7D", "30D", "90D", "12M"].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setActiveRange(range);
                  showToast(isVi ? `Đã cập nhật khung thời gian: ${range}` : `Telemetry scope updated: ${range}`);
                }}
                className={`px-space-sm py-space-2xs font-label-caps text-label-caps transition-colors rounded-DEFAULT ${
                  activeRange === range
                    ? "bg-surface-container-high text-primary font-bold shadow-inner"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="flex bg-surface-container-lowest p-space-2xs rounded-DEFAULT border border-outline-variant/30">
            <button
              onClick={() => setViewMode("pulse")}
              className={`flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-DEFAULT transition-all ${
                viewMode === "pulse"
                  ? "bg-surface-container-high text-primary font-bold shadow-inner"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <i className="fa-solid fa-chart-line text-[13px]"></i>
              <span className="font-label-caps text-label-caps">PULSE</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-DEFAULT transition-all ${
                viewMode === "matrix"
                  ? "bg-surface-container-high text-primary font-bold shadow-inner"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <i className="fa-solid fa-table-cells-large text-[13px]"></i>
              <span className="font-label-caps text-label-caps">MATRIX</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: PULSE (SIGNATURE ENTERPRISE OBSERVATORY)         */}
      {/* ======================================================== */}
      {viewMode === "pulse" && (
        <div className="flex flex-col gap-space-md">
          {/* OBSERVATORY HERO: INTERACTIVE SVG KNOWLEDGE PULSE */}
          <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm border border-outline-variant/30 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <i className="fa-solid fa-diagram-project text-primary text-[18px]"></i>
                <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                  {isVi ? "Đài Quan sát Quang học — Dòng chảy Tri thức Thực thời" : "Knowledge Pulse Observatory — Real-time Neural Stream"}
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-label-caps text-label-caps text-outline">
                  {isVi ? "CHỌN NÚT ĐỂ XEM CHI TIẾT" : "CLICK A HUB TO INSPECT"}
                </span>
                <span className="font-code-sm text-code-sm text-primary bg-surface-container-highest px-space-xs py-space-2xs rounded-DEFAULT">
                  {hubDetails[selectedHub].badge}
                </span>
              </div>
            </div>

            {/* SVG Visual Stage */}
            <div className="relative w-full bg-surface-container-lowest/80 rounded-lg p-space-sm border border-outline-variant/20 flex flex-col items-center">
              <svg viewBox="0 0 920 220" className="w-full max-h-[220px]" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="execStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--cyan, #00E5FF)" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="var(--blue, #5B8DEF)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="var(--green, #3FCB8E)" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Connection Links */}
                <g stroke="url(#execStreamGrad)" strokeWidth="2.5" fill="none" opacity="0.75">
                  <path d="M120,110 C200,60 260,110 320,110" strokeDasharray="6,4" />
                  <path d="M320,110 C400,110 440,110 520,110" />
                  <path d="M520,110 C600,110 640,60 720,110" strokeDasharray="6,4" />
                  <path d="M520,110 C600,150 640,160 840,110" />
                  <path d="M720,110 L840,110" />
                </g>

                {/* Live Particles / Neural Pulses */}
                <circle cx="220" cy="85" r="4" fill="var(--cyan, #00E5FF)" filter="url(#glow)">
                  <animate attributeName="cx" values="120;320;520;720;840" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="420" cy="110" r="3.5" fill="var(--green, #3FCB8E)" filter="url(#glow)">
                  <animate attributeName="cx" values="320;520;840" dur="2.5s" repeatCount="indefinite" />
                </circle>

                {/* HUB 1: DATA INGESTION */}
                <g
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedHub("ingest")}
                >
                  <circle
                    cx="120"
                    cy="110"
                    r={selectedHub === "ingest" ? 42 : 36}
                    fill={selectedHub === "ingest" ? "var(--cyan-dim, rgba(0,229,255,0.15))" : "var(--surface-3, #232935)"}
                    stroke="var(--cyan, #00E5FF)"
                    strokeWidth={selectedHub === "ingest" ? 3 : 2}
                  />
                  <text x="120" y="106" textAnchor="middle" fill="var(--cyan, #00E5FF)" fontSize="11" fontWeight="700">
                    INGESTION
                  </text>
                  <text x="120" y="122" textAnchor="middle" fill="var(--text-2, #A4ACB9)" fontSize="9">
                    247 Sources
                  </text>
                </g>

                {/* HUB 2: GRAPH CORE */}
                <g
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedHub("core")}
                >
                  <circle
                    cx="320"
                    cy="110"
                    r={selectedHub === "core" ? 46 : 40}
                    fill={selectedHub === "core" ? "var(--blue-dim, rgba(91,141,239,0.2))" : "var(--surface-3, #232935)"}
                    stroke="var(--blue, #5B8DEF)"
                    strokeWidth={selectedHub === "core" ? 3.5 : 2}
                  />
                  <text x="320" y="105" textAnchor="middle" fill="var(--blue, #5B8DEF)" fontSize="12" fontWeight="800">
                    GRAPH CORE
                  </text>
                  <text x="320" y="122" textAnchor="middle" fill="var(--text-2, #A4ACB9)" fontSize="9">
                    142K Entities
                  </text>
                </g>

                {/* HUB 3: REASONING */}
                <g
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedHub("reasoning")}
                >
                  <circle
                    cx="520"
                    cy="110"
                    r={selectedHub === "reasoning" ? 46 : 40}
                    fill={selectedHub === "reasoning" ? "var(--green-dim, rgba(63,203,142,0.2))" : "var(--surface-3, #232935)"}
                    stroke="var(--green, #3FCB8E)"
                    strokeWidth={selectedHub === "reasoning" ? 3.5 : 2}
                  />
                  <text x="520" y="105" textAnchor="middle" fill="var(--green, #3FCB8E)" fontSize="12" fontWeight="800">
                    GRAPHRAG
                  </text>
                  <text x="520" y="122" textAnchor="middle" fill="var(--text-2, #A4ACB9)" fontSize="9">
                    AI 4-Hop
                  </text>
                </g>

                {/* HUB 4: RISK OBSERVATORY */}
                <g
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedHub("risk")}
                >
                  <circle
                    cx="720"
                    cy="110"
                    r={selectedHub === "risk" ? 42 : 36}
                    fill={selectedHub === "risk" ? "var(--red-dim, rgba(229,97,90,0.2))" : "var(--surface-3, #232935)"}
                    stroke="var(--red, #E5615A)"
                    strokeWidth={selectedHub === "risk" ? 3 : 2}
                  />
                  <text x="720" y="106" textAnchor="middle" fill="var(--red, #E5615A)" fontSize="11" fontWeight="700">
                    RISK RADAR
                  </text>
                  <text x="720" y="122" textAnchor="middle" fill="var(--text-2, #A4ACB9)" fontSize="9">
                    $3.18M At-Risk
                  </text>
                </g>

                {/* HUB 5: DECISION & HITL */}
                <g
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedHub("action")}
                >
                  <circle
                    cx="840"
                    cy="110"
                    r={selectedHub === "action" ? 38 : 34}
                    fill={selectedHub === "action" ? "var(--amber-dim, rgba(227,169,71,0.2))" : "var(--surface-3, #232935)"}
                    stroke="var(--amber, #E3A947)"
                    strokeWidth={selectedHub === "action" ? 3 : 2}
                  />
                  <text x="840" y="106" textAnchor="middle" fill="var(--amber, #E3A947)" fontSize="11" fontWeight="700">
                    DECISION
                  </text>
                  <text x="840" y="122" textAnchor="middle" fill="var(--text-2, #A4ACB9)" fontSize="9">
                    HITL Verified
                  </text>
                </g>
              </svg>

              {/* Active Hub Details Card */}
              <div className="w-full mt-space-xs p-space-sm bg-surface-container-high/60 rounded-DEFAULT flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-outline-variant/20">
                <div className="flex items-center gap-space-sm">
                  <i className="fa-solid fa-chart-simple text-primary text-[20px]"></i>
                  <div>
                    <div className="font-title-sm text-title-sm font-bold text-on-surface">
                      {hubDetails[selectedHub].title} · <span className="text-primary font-mono">{hubDetails[selectedHub].stat}</span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {hubDetails[selectedHub].desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs shrink-0">
                  {selectedHub === "ingest" && (
                    <button
                      onClick={() => onNavigate("connectors")}
                      className="btn primary sm"
                    >
                      {isVi ? "Xem Kết nối Dữ liệu" : "Open Connectors"} →
                    </button>
                  )}
                  {selectedHub === "core" && (
                    <button
                      onClick={() => onNavigate("knowledge")}
                      className="btn primary sm"
                    >
                      {isVi ? "Xem Đồ thị Tri thức" : "Inspect Graph"} →
                    </button>
                  )}
                  {selectedHub === "reasoning" && (
                    <button
                      onClick={() => onNavigate("copilot")}
                      className="btn primary sm"
                    >
                      {isVi ? "Mở Trợ lý Copilot" : "Open AI Copilot"} →
                    </button>
                  )}
                  {selectedHub === "risk" && (
                    <button
                      onClick={() => onNavigate("risk")}
                      className="btn primary sm"
                    >
                      {isVi ? "Đến Trung tâm Rủi ro" : "Open Risk Center"} →
                    </button>
                  )}
                  {selectedHub === "action" && (
                    <button
                      onClick={() => onNavigate("reports")}
                      className="btn primary sm"
                    >
                      {isVi ? "Xem Báo cáo Lãnh đạo" : "Executive Reports"} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: AI SIGNALS FEED (LEFT 55%) + AT-RISK PORTFOLIO (RIGHT 45%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            {/* LEFT: AI PRIORITY REASONING SIGNALS FEED */}
            <div className="lg:col-span-7 flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-lg shadow-sm border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-outline-variant/20">
                <div className="flex items-center gap-space-xs">
                  <i className="fa-solid fa-brain text-primary text-[18px]"></i>
                  <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                    {isVi ? "Dòng Tín hiệu AI Suy luận Nguyên nhân (WHAT → WHY → ACTION)" : "AI Priority Reasoning Signals (WHAT → WHY → ACTION)"}
                  </h3>
                </div>

                <div className="flex items-center gap-space-2xs">
                  {["all", "high", "med", "low"].map((filt) => (
                    <button
                      key={filt}
                      onClick={() => setSignalFilter(filt)}
                      className={`px-space-xs py-space-2xs font-label-caps text-label-caps rounded-DEFAULT uppercase transition-colors ${
                        signalFilter === filt
                          ? "bg-surface-container-highest text-primary font-bold"
                          : "text-outline hover:text-on-surface"
                      }`}
                    >
                      {filt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signals list */}
              <div className="flex flex-col gap-space-sm mt-space-xs">
                {filteredSignals.map((sig) => {
                  const isHigh = sig.severity === "high";
                  const isMed = sig.severity === "med";

                  return (
                    <div
                      key={sig.id}
                      className={`p-space-md rounded-DEFAULT border transition-all hover:shadow-md ${
                        isHigh
                          ? "bg-error-container/10 border-error/40"
                          : isMed
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-surface-container border-outline-variant/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-space-sm mb-space-xs">
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`px-space-xs py-space-2xs rounded-DEFAULT font-label-caps text-label-caps font-bold uppercase ${
                              isHigh
                                ? "bg-error text-on-error"
                                : isMed
                                ? "bg-amber-500 text-black"
                                : "bg-primary text-on-primary"
                            }`}
                          >
                            {sig.badge}
                          </span>
                          <span className="font-code-sm text-code-sm text-outline">
                            ID: {sig.id}
                          </span>
                        </div>

                        <span className="font-label-caps text-label-caps text-tertiary">
                          {isHigh ? "CONFIDENCE: 94%" : isMed ? "CONFIDENCE: 88%" : "CONFIDENCE: 96%"}
                        </span>
                      </div>

                      {/* WHAT */}
                      <div className="flex flex-col gap-space-2xs mb-space-xs">
                        <div className="flex items-center gap-space-2xs">
                          <span className="font-label-caps text-label-caps text-primary font-bold">WHAT</span>
                          <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                            {isVi ? sig.what_vi : sig.what_en}
                          </span>
                        </div>
                      </div>

                      {/* WHY */}
                      <div className="flex flex-col gap-space-2xs mb-space-sm bg-surface-container-lowest/50 p-space-xs rounded-DEFAULT border border-outline-variant/10">
                        <div className="flex items-start gap-space-2xs">
                          <span className="font-label-caps text-label-caps text-outline font-bold shrink-0 mt-0.5">WHY</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {isVi ? sig.why_vi : sig.why_en}
                          </span>
                        </div>
                      </div>

                      {/* ACTION */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/20">
                        <div className="flex items-center gap-space-xs text-on-surface font-medium text-body-sm">
                          <span className="font-label-caps text-label-caps text-tertiary font-bold">ACTION</span>
                          <span>{isVi ? sig.action_vi : sig.action_en}</span>
                        </div>

                        <div className="flex items-center gap-space-xs shrink-0">
                          {sig.entityId && (
                            <button
                              onClick={() => {
                                onSelectEntity?.(sig.entityId);
                                onNavigate("knowledge");
                              }}
                              className="btn sm"
                              title="Khám phá trong Đồ thị Tri thức"
                            >
                              {isVi ? "Xem Thực thể" : "View Entity"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onNavigate("copilot");
                            }}
                            className="btn primary sm"
                          >
                            {isVi ? "Hỏi Copilot" : "Investigate"} →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: AT-RISK PORTFOLIO & REVENUE EXPOSURE */}
            <div className="lg:col-span-5 flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-lg shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                <div className="flex items-center gap-space-xs">
                  <i className="fa-solid fa-building-columns text-error text-[18px]"></i>
                  <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                    {isVi ? "Danh mục Thực thể Giám sát Trọng yếu" : "Key Monitored Entity Exposure"}
                  </h3>
                </div>
                <span className="font-label-caps text-label-caps text-outline">
                  {entityList.length} TRACKED
                </span>
              </div>

              <div className="flex flex-col gap-space-sm mt-space-xs">
                {entityList.map((ent) => {
                  const isSelected = selectedEntity === ent.id;
                  const isElevated = ent.risk === "Elevated" || ent.risk === "High";

                  return (
                    <div
                      key={ent.id}
                      onClick={() => onSelectEntity?.(ent.id)}
                      className={`p-space-sm rounded-DEFAULT border cursor-pointer transition-all hover:bg-surface-container-high ${
                        isSelected
                          ? "border-primary bg-surface-container shadow-md"
                          : "border-outline-variant/20 bg-surface-container-lowest"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-space-2xs">
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isElevated ? "bg-error" : "bg-primary"
                            }`}
                          ></span>
                          <span className="font-title-sm text-title-sm font-bold text-on-surface">
                            {ent.name}
                          </span>
                        </div>
                        <span
                          className={`font-label-caps text-label-caps px-space-xs py-space-2xs rounded-DEFAULT font-bold ${
                            isElevated
                              ? "bg-error/20 text-error"
                              : "bg-surface-container-highest text-outline"
                          }`}
                        >
                          {ent.risk} RISK
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-space-xs my-space-xs text-center bg-surface-container p-space-xs rounded-DEFAULT">
                        <div>
                          <div className="font-label-caps text-label-caps text-outline">REVENUE</div>
                          <div className="font-code-sm text-code-sm font-semibold text-on-surface">{ent.revenue}</div>
                        </div>
                        <div>
                          <div className="font-label-caps text-label-caps text-outline">ORDERS</div>
                          <div className="font-code-sm text-code-sm font-semibold text-on-surface">{ent.ordersCount}</div>
                        </div>
                        <div>
                          <div className="font-label-caps text-label-caps text-outline">CONTRACTS</div>
                          <div className="font-code-sm text-code-sm font-semibold text-primary">{ent.activeContracts}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-body-sm text-on-surface-variant pt-space-2xs border-t border-outline-variant/10">
                        <span className="font-code-sm text-code-sm text-outline truncate max-w-[200px]">
                          {ent.contact}
                        </span>
                        <div className="flex items-center gap-space-2xs">
                          <i className={`fa-solid ${ent.verified ? "fa-circle-check text-tertiary" : "fa-circle-question text-outline"} text-[13px]`}></i>
                          <span className="font-label-caps text-label-caps">{ent.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-space-xs pt-space-xs border-t border-outline-variant/20 flex items-center justify-between">
                <button
                  onClick={() => {
                    showToast(isVi ? "Đã gửi yêu cầu kiểm toán sang Đội ngũ Bán hàng!" : "Account audit dispatched to Sales team.");
                  }}
                  className="btn sm"
                >
                  {isVi ? "Yêu cầu Kiểm toán" : "Dispatch Audit"}
                </button>
                <button
                  onClick={() => onNavigate("knowledge")}
                  className="btn primary sm"
                >
                  {isVi ? "Xem Toàn bộ Đồ thị" : "Open Full Graph"} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: MATRIX (CROSS-DEPARTMENT RISK & KNOWLEDGE MAP)   */}
      {/* ======================================================== */}
      {viewMode === "matrix" && (
        <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-lg shadow-sm border border-outline-variant/30">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
            <div className="flex items-center gap-space-xs">
              <i className="fa-solid fa-border-all text-primary text-[20px]"></i>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                {isVi ? "Ma trận Tri thức & Mức độ Phơi nhiễm Rủi ro theo Phòng ban" : "Cross-Department Knowledge Coverage & Risk Exposure Matrix"}
              </h3>
            </div>
            <span className="font-label-caps text-label-caps text-outline">
              UPDATED 5 MIN AGO · HYBRID GRAPHRAG
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body-sm text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container">
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">{isVi ? "Miền Tri thức" : "Knowledge Domain"}</th>
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">Sales & Marketing</th>
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">Finance & Accounting</th>
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">Operations & Supply</th>
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">Legal & Compliance</th>
                  <th className="p-space-sm font-label-caps text-label-caps text-outline uppercase">Executive Board</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-high/40">
                  <td className="p-space-sm font-semibold text-on-surface">Customer Entities</td>
                  <td className="p-space-sm text-green-500 font-medium">98.4% (Synced)</td>
                  <td className="p-space-sm text-green-500 font-medium">96.1% (Synced)</td>
                  <td className="p-space-sm text-amber-500 font-medium">84.2% (12 Unlinked)</td>
                  <td className="p-space-sm text-green-500 font-medium">99.0% (Verified)</td>
                  <td className="p-space-sm text-green-500 font-bold">100% (Observatory)</td>
                </tr>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-high/40">
                  <td className="p-space-sm font-semibold text-on-surface">Contract & Master Agreements</td>
                  <td className="p-space-sm text-error font-medium">1 Expiring (12d)</td>
                  <td className="p-space-sm text-green-500 font-medium">4.1B VND Active</td>
                  <td className="p-space-sm text-on-surface-variant">—</td>
                  <td className="p-space-sm text-error font-bold">3 Under Scrutiny</td>
                  <td className="p-space-sm text-error font-bold">$1.2M Exposure</td>
                </tr>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-high/40">
                  <td className="p-space-sm font-semibold text-on-surface">Invoice & Payment Cadence</td>
                  <td className="p-space-sm text-amber-500 font-medium">32% Order Drop</td>
                  <td className="p-space-sm text-error font-medium">8.6B VND (&gt;60d)</td>
                  <td className="p-space-sm text-green-500 font-medium">Normal Flow</td>
                  <td className="p-space-sm text-on-surface-variant">—</td>
                  <td className="p-space-sm text-amber-500 font-bold">DSO +14 Days</td>
                </tr>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-high/40">
                  <td className="p-space-sm font-semibold text-on-surface">SOP & Operational Knowledge</td>
                  <td className="p-space-sm text-green-500 font-medium">14 SOPs Active</td>
                  <td className="p-space-sm text-amber-500 font-medium">1 Review Pending</td>
                  <td className="p-space-sm text-green-500 font-medium">32 SOPs Active</td>
                  <td className="p-space-sm text-green-500 font-medium">100% Audited</td>
                  <td className="p-space-sm text-green-500 font-bold">Compliant</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-space-sm">
            <span className="text-body-sm text-on-surface-variant">
              {isVi ? "Nhấp vào bất kỳ ô nào để kích hoạt luồng kiểm tra suy luận chi tiết trong Copilot" : "Click on any cell to trigger a deep causal trace in Copilot."}
            </span>
            <button
              onClick={() => onNavigate("risk")}
              className="btn primary sm"
            >
              {isVi ? "Xem Toàn bộ Rủi ro" : "Open Full Risk Center"} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
