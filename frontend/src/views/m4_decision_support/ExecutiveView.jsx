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
  const [viewMode, setViewMode] = useState("pulse"); // "pulse" | "chart" | "matrix"
  const [selectedHub, setSelectedHub] = useState("core");
  const [signalFilter, setSignalFilter] = useState("all"); // "all" | "high" | "med" | "low"
  const [toastMsg, setToastMsg] = useState("");
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [showBoardDossierModal, setShowBoardDossierModal] = useState(false);

  // Directives state for C-Suite Action Center
  const [directives, setDirectives] = useState([
    {
      id: "dir-1",
      titleVi: "Phê duyệt Chủ trương Tái ký VIP ABC Corp (Chiết khấu 10%)",
      titleEn: "Approve 10% Discount Mandate for ABC Corp VIP Contract Renewal",
      targetVi: "GĐ Kinh Doanh (Nguyễn V. Nam) & Khối Sales",
      targetEn: "Sales Director & Commercial Team",
      impactVi: "Bảo vệ hợp đồng 4.1 Tỷ VND (hết hạn trong 12 ngày); chặn đà sụt giảm đơn hàng 32%.",
      impactEn: "Protects 4.1B VND contract (expiring in 12d); reverses 32% order drop anomaly.",
      status: "pending",
      executedAt: null,
      priority: "CRITICAL",
      color: "#dc2626",
      bgLight: "rgba(220, 38, 38, 0.04)",
      code: "DIR-2026-081"
    },
    {
      id: "dir-2",
      titleVi: "Ban hành Lệnh Kiểm toán Công nợ Quá hạn >60 Ngày (8.6 Tỷ VND)",
      titleEn: "Dispatch 60-Day Overdue Debt Audit Mandate (8.6B VND Scope)",
      targetVi: "Trưởng phòng Tài chính - Kế toán & Ban Kiểm soát",
      targetEn: "Finance & Accounting Head & Internal Audit",
      impactVi: "Truy vết nguyên nhân chu kỳ thu tiền DSO tăng +14 ngày; kích hoạt cơ chế thu nợ ưu tiên.",
      impactEn: "Trace root cause for DSO spike (+14 days) and initiate prioritized debt recovery.",
      status: "pending",
      executedAt: null,
      priority: "HIGH",
      color: "#d97706",
      bgLight: "rgba(217, 119, 6, 0.04)",
      code: "DIR-2026-082"
    },
    {
      id: "dir-3",
      titleVi: "Ký Duyệt & Xuất Bộ Hồ sơ Báo cáo Phiên họp Hội đồng Quản trị (HĐQT)",
      titleEn: "Endorse & Export Executive Dossier for Upcoming Board of Directors Meeting",
      targetVi: "Hội đồng Quản trị & Ban Thư ký Doanh nghiệp",
      targetEn: "Board of Directors & Corporate Secretariat",
      impactVi: "Tự động trích xuất báo cáo GraphRAG L5: Doanh thu 1,150 Tỷ, Rủi ro 75.2 Tỷ, Kế hoạch Q3/Q4.",
      impactEn: "Automated GraphRAG L5 executive dossier: 1,150B Revenue, 75.2B Risk, Q3/Q4 Forecast.",
      status: "pending",
      executedAt: null,
      priority: "STRATEGIC",
      color: "#2563eb",
      bgLight: "rgba(37, 99, 235, 0.04)",
      code: "DIR-2026-083"
    }
  ]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleExecuteDirective = (id) => {
    setDirectives((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const newStatus = d.status === "executed" ? "pending" : "executed";
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

          if (newStatus === "executed") {
            if (id === "dir-3") {
              setShowBoardDossierModal(true);
            }
            showToast(
              isVi
                ? `Đã ký số & ban hành thành công chỉ đạo: ${d.code}!`
                : `Successfully signed & dispatched directive: ${d.code}!`
            );
          } else {
            showToast(
              isVi
                ? `Đã thu hồi trạng thái chỉ đạo: ${d.code}`
                : `Revoked status for directive: ${d.code}`
            );
          }

          return {
            ...d,
            status: newStatus,
            executedAt: newStatus === "executed" ? timeStr : null
          };
        }
        return d;
      })
    );
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
      desc: isVi
        ? "Đang đồng bộ liên tục từ Google Drive, Google Sheets, ERP và AEGIS Local Agent."
        : "Continuous real-time sync across Google Drive, Google Sheets, ERP, and Local Agent.",
      badge: "LATENCY: 4.2s"
    },
    core: {
      title: isVi ? "Lõi Đồ thị Tri thức (Knowledge Graph Core)" : "Knowledge Graph Core",
      stat: "142,850 nodes · 890,400 triples",
      desc: isVi
        ? "Liên kết thực thể đa chiều, định danh khách hàng, hợp đồng, đơn hàng và điều khoản pháp lý."
        : "Multi-modal entity linkage across customers, contracts, orders, and legal clauses.",
      badge: "DENSITY: 4.8 REL/NODE"
    },
    reasoning: {
      title: isVi ? "Động cơ Suy luận GraphRAG AI" : "AI GraphRAG Reasoning Engine",
      stat: "2,410 inferences/hr",
      desc: isVi
        ? "Suy luận nguyên nhân 4 bước (multi-hop) với bằng chứng trích dẫn đạt chuẩn L5 Provenance."
        : "Deterministic 4-hop causal inference with verified evidence citations and L5 provenance.",
      badge: "CONFIDENCE: 89.4%"
    },
    risk: {
      title: isVi ? "Đài Quan sát Rủi ro Doanh nghiệp" : "Risk Observatory",
      stat: "75.2 Tỷ VND ($3.18M) at-risk",
      desc: isVi
        ? "Phát hiện sớm rời bỏ khách hàng (churn), hợp đồng sắp hết hạn và lệch pha thanh toán."
        : "Early detection of customer churn, contract expiration, and cashflow aging anomalies.",
      badge: "ANOMALIES: 3 HIGH"
    },
    action: {
      title: isVi ? "Hỗ trợ Ra Quyết định & HITL" : "Decision Support & HITL Loop",
      stat: "94% verified accuracy",
      desc: isVi
        ? "Hàng đợi xác thực con người (Human-in-the-loop) đảm bảo tri thức luôn tin cậy 100%."
        : "Human-in-the-loop validation queues ensure infallible enterprise knowledge governance.",
      badge: "HITL QUEUE: 3 PENDING"
    }
  };

  // Timeline dataset for Business Pulse Chart
  const pulseTimelineData = {
    "7D": [
      { label: "14/09", rev: 18.2, orders: 42, risk: 0, noteVi: "Dòng tiền ổn định từ chu kỳ thanh toán F1.", noteEn: "Steady cashflow from cycle F1." },
      { label: "15/09", rev: 24.5, orders: 56, risk: 0, noteVi: "Lô hàng thương mại điện tử hoàn tất nghiệm thu.", noteEn: "E-commerce batch accepted." },
      { label: "16/09", rev: 15.0, orders: 38, risk: 1, eventVi: "CT18 chậm thanh toán 850Tr", eventEn: "CT18 payment delayed 850M", noteVi: "Phát hiện nợ đọng ngắn hạn vượt hạn mức 15 ngày.", noteEn: "Short-term debt exceeded 15d limit." },
      { label: "17/09", rev: 31.2, orders: 65, risk: 0, noteVi: "Giải ngân đợt 2 hợp đồng Delta Logistics.", noteEn: "Delta Logistics phase 2 disbursed." },
      { label: "18/09", rev: 28.4, orders: 59, risk: 0, noteVi: "Khối Bán hàng vượt chỉ tiêu tuần 12%.", noteEn: "Sales team surpassed weekly target by 12%." },
      { label: "19/09", rev: 12.1, orders: 28, risk: 2, eventVi: "Cảnh báo sụt giảm ABC Corp -32%", eventEn: "ABC Corp order cadence drop -32%", noteVi: "AI phát hiện hợp đồng 4.1 Tỷ sắp hết hạn trong 12 ngày.", noteEn: "AI flagged 4.1B contract expiring in 12 days." },
      { label: "20/09", rev: 35.8, orders: 74, risk: 1, eventVi: "Ký kết khung đối tác mới 3.2 Tỷ", eventEn: "Signed new 3.2B partnership", noteVi: "Đạt đỉnh doanh thu ngày nhờ đơn hàng vật tư y tế.", noteEn: "Peak daily revenue on medical supply fulfillment." }
    ],
    "30D": [
      { label: "Tuần 1", rev: 112, orders: 280, risk: 0, noteVi: "Khởi động tháng thuận lợi, tỷ lệ thanh toán đạt 96%.", noteEn: "Strong month start, 96% collection." },
      { label: "Tuần 2", rev: 145, orders: 340, risk: 1, eventVi: "Công nợ quá hạn ABC Corp 45 ngày", eventEn: "ABC Corp 45-day overdue debt", noteVi: "Phòng Kế toán đối chiếu công nợ phát hiện lệch pha 1.2 Tỷ.", noteEn: "Accounting flagged 1.2B discrepancy." },
      { label: "Tuần 3", rev: 98, orders: 210, risk: 2, eventVi: "Cảnh báo rời bỏ đối tác Sao Mai", eventEn: "Sao Mai churn warning", noteVi: "Tần suất đặt hàng sụt giảm liên tiếp 3 tuần.", noteEn: "Order frequency dropped 3 consecutive weeks." },
      { label: "Tuần 4", rev: 165, orders: 390, risk: 1, eventVi: "Đề xuất chính sách tái ký hạn mức 10%", eventEn: "Proposed 10% discount renewal policy", noteVi: "Phục hồi dòng tiền cuối tháng từ các đơn hàng dự án.", noteEn: "Month-end cashflow rebound from project orders." }
    ],
    "90D": [
      { label: "Tháng 07", rev: 340, orders: 1120, risk: 1, eventVi: "Mở rộng 12 kho dữ liệu vệ tinh", eventEn: "Expanded 12 data repos", noteVi: "Tích hợp hoàn tất 142K thực thể vào Graph Mind.", noteEn: "Integrated 142K entities into Graph Mind." },
      { label: "Tháng 08", rev: 385, orders: 1290, risk: 1, eventVi: "Tăng trưởng doanh thu +13.2%", eventEn: "Revenue growth +13.2%", noteVi: "Giảm tỷ lệ khiếu nại chất lượng nhờ kiểm soát SOP.", noteEn: "Reduced complaints via SOP knowledge graph." },
      { label: "Tháng 09", rev: 425, orders: 1410, risk: 2, eventVi: "Cảnh báo rủi ro thanh khoản 75.2 Tỷ", eventEn: "Liquidity risk alert 75.2B", noteVi: "DSO tăng thêm 14 ngày cần quyết sách chỉ đạo từ Tổng Giám Đốc.", noteEn: "DSO +14 days requires CEO directive." }
    ],
    "12M": [
      { label: "Q1/2026", rev: 980, orders: 3200, risk: 0, noteVi: "Hoàn tất kế hoạch quý 1 đạt 104% kế hoạch HĐQT.", noteEn: "Q1 achieved 104% of Board plan." },
      { label: "Q2/2026", rev: 1050, orders: 3450, risk: 1, eventVi: "Đạt mốc 100K thực thể đồ thị", eventEn: "Hit 100K graph entities", noteVi: "Chuẩn hóa quy trình vận hành toàn công ty.", noteEn: "Standardized enterprise-wide operational SOP." },
      { label: "Q3/2026", rev: 1120, orders: 3800, risk: 2, eventVi: "Kích hoạt Đài Quan sát Lãnh đạo AEGIS", eventEn: "Activated AEGIS Observatory", noteVi: "Triển khai suy luận GraphRAG nguyên nhân thời gian thực.", noteEn: "Realtime GraphRAG causal inference deployed." },
      { label: "Q4/2026 (Dự kiến)", rev: 1150, orders: 4020, risk: 1, eventVi: "Kỳ vọng cán mốc 1,200 Tỷ VND", eventEn: "Forecasted to hit 1,200B VND", noteVi: "Dự kiến đóng thêm 3 hợp đồng chiến lược ngành y tế & logistics.", noteEn: "Anticipating 3 strategic deals in healthcare & logistics." }
    ]
  };

  const currentTimeline = pulseTimelineData[activeRange] || pulseTimelineData["30D"];
  const maxRev = Math.max(...currentTimeline.map((p) => p.rev)) * 1.15;
  const maxOrders = Math.max(...currentTimeline.map((p) => p.orders)) * 1.15;

  return (
    <div
      className="exec-scroll-container"
      style={{
        width: "100%",
        padding: "0 24px 80px 24px"
      }}
    >
      {/* ======================================================== */}
      {/* HIGH-END EXECUTIVE STYLESHEET                            */}
      {/* ======================================================== */}
      <style>{`
        .workspace {
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        .workspace::-webkit-scrollbar,
        .exec-scroll-container::-webkit-scrollbar {
          width: 9px !important;
          display: block !important;
        }
        .workspace::-webkit-scrollbar-track,
        .exec-scroll-container::-webkit-scrollbar-track {
          background: var(--surface-2, #f8fafc) !important;
        }
        .workspace::-webkit-scrollbar-thumb,
        .exec-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 6px !important;
          border: 2px solid var(--surface-2, #f8fafc) !important;
        }
        .workspace::-webkit-scrollbar-thumb:hover,
        .exec-scroll-container::-webkit-scrollbar-thumb:hover {
          background: var(--cyan, #0891b2) !important;
        }

        .exec-wrap {
          font-family: var(--f-body, sans-serif);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* COMMAND HEADER DECK */
        .exec-deck-bar {
          background: linear-gradient(135deg, var(--surface, #ffffff) 0%, var(--surface-2, #f8fafc) 100%);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 14px 20px;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .exec-crest {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .exec-crest-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.28);
        }

        /* BENTO KPI CARDS */
        .exec-kpi-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 18px 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .exec-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
          border-color: #cbd5e1;
        }
        .exec-kpi-stripe {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
        }
        .exec-kpi-num {
          font-family: var(--f-display, sans-serif);
          font-size: 26px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--text-1, #0f172a);
        }

        /* SEGMENTED CONTROLS */
        .exec-seg-box {
          background: var(--surface-2, #f1f5f9);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          padding: 3px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .exec-seg-btn {
          border: none;
          background: transparent;
          color: var(--text-3, #64748b);
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .exec-seg-btn:hover {
          color: var(--text-1, #0f172a);
        }
        .exec-seg-btn.active {
          background: var(--surface, #ffffff);
          color: var(--cyan, #0284c7);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          font-weight: 700;
        }

        /* C-SUITE DIRECTIVE DECK */
        .exec-action-deck {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          padding: 20px 22px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
        }
        .exec-mandate-card {
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          padding: 16px 18px;
          background: var(--surface-2, #f8fafc);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .exec-mandate-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        .exec-cta-btn {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .exec-cta-btn:hover {
          background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in border border-cyan-500/40">
          <i className="fa-solid fa-circle-check text-cyan-400 text-base"></i>
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      <div className="exec-wrap max-w-[1440px] mx-auto mt-2">
        {/* ======================================================== */}
        {/* 1. COMMAND HEADER DECK (EXECUTIVE COMMAND STRIP)         */}
        {/* ======================================================== */}
        <div className="exec-deck-bar">
          <div className="exec-crest">
            <div className="exec-crest-icon">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-1)] tracking-tight">
                  {isVi ? "Đài Quan sát Vĩ mô & Điều hành Chiến lược" : "Enterprise Executive Observatory"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE SYNC
                </span>
              </div>
              <div className="text-xs text-[var(--text-3)] mt-0.5">
                {isVi
                  ? "Hoàng Minh Điều (Tổng Giám Đốc / C-Suite) · 247 nguồn dữ liệu liên tục đồng bộ qua GraphRAG"
                  : "Hoang Minh Dieu (CEO / C-Suite) · 247 real-time enterprise data pipelines"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Scope Segmented Control */}
            <div className="exec-seg-box">
              {["7D", "30D", "90D", "12M"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setActiveRange(range);
                    showToast(isVi ? `Đã cập nhật phạm vi: ${range}` : `Telemetry scope: ${range}`);
                  }}
                  className={`exec-seg-btn ${activeRange === range ? "active" : ""}`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* View Mode Segmented Control */}
            <div className="exec-seg-box">
              <button
                onClick={() => setViewMode("pulse")}
                className={`exec-seg-btn ${viewMode === "pulse" ? "active" : ""}`}
              >
                <i className="fa-solid fa-diagram-project text-xs"></i>
                <span>{isVi ? "Nhịp độ Tri thức" : "Knowledge Pulse"}</span>
              </button>
              <button
                onClick={() => setViewMode("chart")}
                className={`exec-seg-btn ${viewMode === "chart" ? "active" : ""}`}
              >
                <i className="fa-solid fa-chart-line text-xs"></i>
                <span>{isVi ? "Dòng tiền & Đơn hàng" : "Cashflow & Orders"}</span>
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`exec-seg-btn ${viewMode === "matrix" ? "active" : ""}`}
              >
                <i className="fa-solid fa-table-cells-large text-xs"></i>
                <span>{isVi ? "Ma trận Phòng ban" : "Risk Matrix"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. EXECUTIVE BENTO-GRID KPI CARDS                        */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Knowledge Coverage */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-stripe" style={{ background: "linear-gradient(90deg, #0284c7, #38bdf8)" }}></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                  {isVi ? "ĐỘ PHỦ TRI THỨC" : "KNOWLEDGE COVERAGE"}
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-database"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="exec-kpi-num">94.2%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  +2.8% MoM
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-3)] mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2">
              <span>18/18 Kho dữ liệu</span>
              <span className="font-semibold text-sky-600">247 Luồng realtime</span>
            </div>
          </div>

          {/* KPI 2: Graph Scale */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-stripe" style={{ background: "linear-gradient(90deg, #4f46e5, #818cf8)" }}></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                  {isVi ? "QUY MÔ ĐỒ THỊ TRI THỨC" : "KNOWLEDGE GRAPH SCALE"}
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-circle-nodes"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="exec-kpi-num text-indigo-600">142,850</span>
                <span className="text-xs text-[var(--text-3)] font-medium">Nodes</span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-3)] mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2">
              <span>890,400 Quan hệ</span>
              <span className="font-semibold text-indigo-600">4.8 rel/node</span>
            </div>
          </div>

          {/* KPI 3: Monitored Valuation */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-stripe" style={{ background: "linear-gradient(90deg, #059669, #34d399)" }}></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                  {isVi ? "DOANH THU THEO DÕI" : "MONITORED VALUATION"}
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-sack-dollar"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="exec-kpi-num text-emerald-700 dark:text-emerald-400">1,150 Tỷ</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  $48.6M
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-3)] mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2">
              <span className="text-emerald-600 font-semibold">▲ +14.2% YoY</span>
              <span>42 Hợp đồng VIP</span>
            </div>
          </div>

          {/* KPI 4: At-Risk Exposure */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-stripe" style={{ background: "linear-gradient(90deg, #e11d48, #f43f5e)" }}></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  {isVi ? "RỦI RO PHƠI NHIỄM" : "AT-RISK EXPOSURE"}
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="exec-kpi-num text-rose-600">75.2 Tỷ</span>
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  $3.18M
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-3)] mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2">
              <span className="text-rose-600 font-semibold">3 Điểm nóng cần duyệt</span>
              <span>DSO +14 ngày</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. C-SUITE STRATEGIC ACTION CENTER (CHỈ ĐẠO LÃNH ĐẠO)    */}
        {/* ======================================================== */}
        <div className="exec-action-deck">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[var(--border-soft)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center text-xs shadow-sm">
                <i className="fa-solid fa-stamp"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--text-1)] tracking-tight">
                    {isVi ? "Trung tâm Ra Quyết Định Lãnh Đạo (C-Suite Action Center)" : "C-Suite Strategic Directive Action Center"}
                  </h2>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                    {directives.filter((d) => d.status === "executed").length}/{directives.length} {isVi ? "ĐÃ BAN HÀNH" : "DISPATCHED"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  {isVi
                    ? "Quyết sách cấp cao trực tiếp từ Tổng Giám Đốc truyền đạt tức thì tới Giám đốc Khối & Trưởng bộ phận."
                    : "Direct authoritative mandates dispatched from the CEO to functional directors."}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowBoardDossierModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-2)] flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <i className="fa-solid fa-file-invoice text-sky-600"></i>
              <span>{isVi ? "Xem Hồ Sơ HĐQT" : "Board Dossier"}</span>
            </button>
          </div>

          {/* 3 Executive Directives Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {directives.map((dir) => {
              const isExecuted = dir.status === "executed";
              return (
                <div
                  key={dir.id}
                  className="exec-mandate-card"
                  style={{
                    borderLeft: `3.5px solid ${dir.color}`,
                    background: isExecuted ? "rgba(5, 150, 105, 0.03)" : dir.bgLight
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          background: "#ffffff",
                          color: dir.color,
                          border: `1px solid ${dir.color}40`
                        }}
                      >
                        {dir.code}
                      </span>
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isExecuted ? "text-emerald-700 font-bold" : "text-amber-700"
                        }`}
                      >
                        <i className={`fa-solid ${isExecuted ? "fa-circle-check" : "fa-clock"}`}></i>
                        {isExecuted
                          ? (isVi ? "ĐÃ BAN HÀNH" : "DISPATCHED")
                          : (isVi ? "CHỜ PHÊ CHUẨN" : "PENDING")}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[var(--text-1)] mb-2 leading-snug">
                      {isVi ? dir.titleVi : dir.titleEn}
                    </h3>

                    <div className="text-[11px] text-[var(--text-2)] bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-soft)] mb-3 space-y-1.5">
                      <div>
                        <span className="text-[var(--text-3)] font-medium">{isVi ? "Đối tượng: " : "Target: "}</span>
                        <strong className="text-[var(--text-1)]">{isVi ? dir.targetVi : dir.targetEn}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)] font-medium">{isVi ? "Tác động: " : "Impact: "}</span>
                        <span>{isVi ? dir.impactVi : dir.impactEn}</span>
                      </div>
                    </div>

                    {isExecuted && dir.executedAt && (
                      <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 mb-2.5 flex items-center justify-between">
                        <span><i className="fa-solid fa-signature mr-1"></i>Ký số: Hoàng Minh Điều (CEO)</span>
                        <span>{dir.executedAt}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-3)]">
                      {isExecuted ? (isVi ? "Lệnh đang thực thi" : "In active workflow") : (isVi ? "Cần chữ ký CEO" : "Requires CEO Sign")}
                    </span>
                    <button
                      onClick={() => handleExecuteDirective(dir.id)}
                      className={isExecuted ? "px-3 py-1 rounded text-xs font-medium text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer" : "exec-cta-btn"}
                    >
                      <i className={`fa-solid ${isExecuted ? "fa-rotate-left" : "fa-feather-pointed"}`}></i>
                      <span>
                        {isExecuted
                          ? (isVi ? "Thu hồi" : "Revoke")
                          : (isVi ? "Ký Duyệt & Ban Hành" : "Sign & Dispatch")}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. BUSINESS PULSE TIMELINE CHART (DÒNG TIỀN & ĐƠN HÀNG)  */}
        {/* ======================================================== */}
        {viewMode === "chart" && (
          <div className="exec-action-deck">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-soft)]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-1)]">
                    {isVi
                      ? `Biểu Đồ Nhịp Sống Doanh Nghiệp & Dòng Tiền (${activeRange})`
                      : `Business Pulse & Cashflow Trajectory (${activeRange})`}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  {isVi
                    ? "Tương quan đa trục giữa Doanh thu thực nhận (Tỷ VND), Nhịp độ đơn hàng và Điểm nóng rủi ro."
                    : "Multi-series trajectory correlating revenue, order cadence, and risk events."}
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-sky-600"></span>
                  <span className="text-[var(--text-2)] font-semibold">{isVi ? "Doanh thu (Tỷ VND)" : "Revenue"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-600"></span>
                  <span className="text-[var(--text-2)] font-semibold">{isVi ? "Đơn hàng" : "Orders"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                  <span className="text-[var(--text-2)] font-semibold">{isVi ? "Biến cố rủi ro" : "Risk Event"}</span>
                </div>
              </div>
            </div>

            {/* Clean SVG Multi-Series Chart */}
            <div className="relative w-full bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
              <svg viewBox="0 0 800 220" className="w-full h-[220px] overflow-visible">
                <defs>
                  <linearGradient id="chartRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[40, 90, 140, 190].map((y, idx) => (
                  <line
                    key={idx}
                    x1="50"
                    y1={y}
                    x2="770"
                    y2={y}
                    stroke="var(--border-soft, #e2e8f0)"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Coordinates */}
                {(() => {
                  const count = currentTimeline.length;
                  const step = (720 / Math.max(count - 1, 1));
                  const pointsRev = currentTimeline.map((p, i) => {
                    const x = 50 + i * step;
                    const y = 190 - (p.rev / maxRev) * 150;
                    return { x, y, p, i };
                  });
                  const pointsOrders = currentTimeline.map((p, i) => {
                    const x = 50 + i * step;
                    const y = 190 - (p.orders / maxOrders) * 150;
                    return { x, y, p, i };
                  });

                  const dRevLine = pointsRev.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x},${pt.y}`, "");
                  const dRevArea = `${dRevLine} L ${pointsRev[pointsRev.length - 1].x},190 L ${pointsRev[0].x},190 Z`;
                  const dOrderLine = pointsOrders.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x},${pt.y}`, "");

                  return (
                    <g>
                      <path d={dRevArea} fill="url(#chartRevGrad)" />
                      <path d={dRevLine} fill="none" stroke="#0284c7" strokeWidth="3" />
                      <path d={dOrderLine} fill="none" stroke="#059669" strokeWidth="2.2" strokeDasharray="3 3" />

                      {pointsRev.map((pt, i) => {
                        const isHovered = hoveredPointIndex === i;
                        const hasRisk = pt.p.risk > 0;
                        return (
                          <g
                            key={i}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPointIndex(i)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          >
                            {isHovered && (
                              <line
                                x1={pt.x}
                                y1="20"
                                x2={pt.x}
                                y2="190"
                                stroke="#0284c7"
                                strokeWidth="1.5"
                                strokeDasharray="2 2"
                              />
                            )}

                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill="#ffffff"
                              stroke="#0284c7"
                              strokeWidth="2.5"
                            />

                            <circle
                              cx={pointsOrders[i].x}
                              cy={pointsOrders[i].y}
                              r={isHovered ? 5 : 3}
                              fill="#ffffff"
                              stroke="#059669"
                              strokeWidth="2"
                            />

                            {hasRisk && (
                              <g>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y - 12}
                                  r="7"
                                  fill="#dc2626"
                                />
                                <text
                                  x={pt.x}
                                  y={pt.y - 9}
                                  textAnchor="middle"
                                  fill="#ffffff"
                                  fontSize="9"
                                  fontWeight="bold"
                                >
                                  !
                                </text>
                              </g>
                            )}

                            <text
                              x={pt.x}
                              y="208"
                              textAnchor="middle"
                              fill={isHovered ? "#0284c7" : "var(--text-3)"}
                              fontSize="11"
                              fontWeight={isHovered ? "bold" : "normal"}
                            >
                              {pt.p.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPointIndex !== null && currentTimeline[hoveredPointIndex] && (
                <div
                  className="absolute top-3 right-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xl max-w-xs z-10 animate-fade-in"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-1.5 mb-2">
                    <span className="text-xs font-bold text-[var(--text-1)]">
                      {isVi ? "Mốc:" : "Period:"} {currentTimeline[hoveredPointIndex].label}
                    </span>
                    {currentTimeline[hoveredPointIndex].risk > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        CẢNH BÁO RỦI RO
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <div className="text-[10px] text-[var(--text-3)]">{isVi ? "Doanh thu" : "Revenue"}</div>
                      <div className="text-sm font-extrabold text-sky-700">
                        {currentTimeline[hoveredPointIndex].rev} Tỷ VND
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-3)]">{isVi ? "Đơn hàng" : "Orders"}</div>
                      <div className="text-sm font-extrabold text-emerald-700">
                        {currentTimeline[hoveredPointIndex].orders} đơn
                      </div>
                    </div>
                  </div>

                  {currentTimeline[hoveredPointIndex].eventVi && (
                    <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 mb-1.5">
                      <i className="fa-solid fa-flag text-rose-600 mr-1.5"></i>
                      {isVi
                        ? currentTimeline[hoveredPointIndex].eventVi
                        : currentTimeline[hoveredPointIndex].eventEn}
                    </div>
                  )}

                  <div className="text-[11px] text-[var(--text-2)]">
                    <span className="font-bold text-sky-700">AI Note:</span>{" "}
                    {isVi
                      ? currentTimeline[hoveredPointIndex].noteVi
                      : currentTimeline[hoveredPointIndex].noteEn}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
              <div className="bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-soft)] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">{isVi ? "TĂNG TRƯỞNG DÒNG TIỀN" : "CASHFLOW GROWTH"}</div>
                  <div className="text-lg font-extrabold text-emerald-600 mt-0.5">+18.4% YoY</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shadow-sm">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
              </div>

              <div className="bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-soft)] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">{isVi ? "TỶ LỆ CHUYỂN ĐỔI ĐƠN HÀNG" : "ORDER FULFILLMENT"}</div>
                  <div className="text-lg font-extrabold text-sky-600 mt-0.5">86.2%</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-sm shadow-sm">
                  <i className="fa-solid fa-boxes-stacked"></i>
                </div>
              </div>

              <div className="bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-soft)] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">{isVi ? "CHỈ SỐ SỨC KHỎE THANH KHOẢN" : "LIQUIDITY INDEX"}</div>
                  <div className="text-lg font-extrabold text-amber-600 mt-0.5">91 / 100</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shadow-sm">
                  <i className="fa-solid fa-shield-heart"></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. MODE 1: PULSE (OPTICAL STREAM & AI SIGNALS)           */}
        {/* ======================================================== */}
        {viewMode === "pulse" && (
          <div className="flex flex-col gap-4">
            {/* OBSERVATORY HERO: OPTICAL KNOWLEDGE FLOW */}
            <div className="exec-action-deck">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-diagram-project"></i>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-1)]">
                    {isVi
                      ? "Đài Quan sát Quang học — Luồng Tri thức Thực thời"
                      : "Knowledge Pulse Observatory — Real-time Neural Stream"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-3)]">
                    {isVi ? "Chọn nút để xem chi tiết:" : "Select a hub:"}
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {hubDetails[selectedHub].badge}
                  </span>
                </div>
              </div>

              {/* SVG Visual Stage */}
              <div className="relative w-full bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] flex flex-col items-center">
                <svg viewBox="0 0 920 220" className="w-full max-h-[220px]" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="execStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  {/* Connection Links */}
                  <g stroke="url(#execStreamGrad)" strokeWidth="2.5" fill="none" opacity="0.65">
                    <path d="M120,110 C200,60 260,110 320,110" strokeDasharray="6,4" />
                    <path d="M320,110 C400,110 440,110 520,110" />
                    <path d="M520,110 C600,110 640,60 720,110" strokeDasharray="6,4" />
                    <path d="M520,110 C600,150 640,160 840,110" />
                    <path d="M720,110 L840,110" />
                  </g>

                  {/* Live Pulses */}
                  <circle cx="220" cy="85" r="4.5" fill="#0284c7">
                    <animate attributeName="cx" values="120;320;520;720;840" dur="4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="420" cy="110" r="4" fill="#059669">
                    <animate attributeName="cx" values="320;520;840" dur="2.5s" repeatCount="indefinite" />
                  </circle>

                  {/* HUB 1: INGESTION */}
                  <g
                    className="cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setSelectedHub("ingest")}
                  >
                    <circle
                      cx="120"
                      cy="110"
                      r={selectedHub === "ingest" ? 42 : 36}
                      fill={selectedHub === "ingest" ? "#e0f2fe" : "#ffffff"}
                      stroke="#0284c7"
                      strokeWidth={selectedHub === "ingest" ? 3.5 : 2}
                    />
                    <text x="120" y="106" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="700">
                      INGESTION
                    </text>
                    <text x="120" y="122" textAnchor="middle" fill="#64748b" fontSize="9">
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
                      fill={selectedHub === "core" ? "#e0e7ff" : "#ffffff"}
                      stroke="#4f46e5"
                      strokeWidth={selectedHub === "core" ? 3.5 : 2}
                    />
                    <text x="320" y="105" textAnchor="middle" fill="#4f46e5" fontSize="12" fontWeight="800">
                      GRAPH CORE
                    </text>
                    <text x="320" y="122" textAnchor="middle" fill="#64748b" fontSize="9">
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
                      fill={selectedHub === "reasoning" ? "#d1fae5" : "#ffffff"}
                      stroke="#059669"
                      strokeWidth={selectedHub === "reasoning" ? 3.5 : 2}
                    />
                    <text x="520" y="105" textAnchor="middle" fill="#059669" fontSize="12" fontWeight="800">
                      GRAPHRAG
                    </text>
                    <text x="520" y="122" textAnchor="middle" fill="#64748b" fontSize="9">
                      AI 4-Hop
                    </text>
                  </g>

                  {/* HUB 4: RISK */}
                  <g
                    className="cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setSelectedHub("risk")}
                  >
                    <circle
                      cx="720"
                      cy="110"
                      r={selectedHub === "risk" ? 42 : 36}
                      fill={selectedHub === "risk" ? "#fee2e2" : "#ffffff"}
                      stroke="#dc2626"
                      strokeWidth={selectedHub === "risk" ? 3.5 : 2}
                    />
                    <text x="720" y="106" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="700">
                      RISK RADAR
                    </text>
                    <text x="720" y="122" textAnchor="middle" fill="#64748b" fontSize="9">
                      75.2 Tỷ At-Risk
                    </text>
                  </g>

                  {/* HUB 5: DECISION */}
                  <g
                    className="cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setSelectedHub("action")}
                  >
                    <circle
                      cx="840"
                      cy="110"
                      r={selectedHub === "action" ? 38 : 34}
                      fill={selectedHub === "action" ? "#fef3c7" : "#ffffff"}
                      stroke="#d97706"
                      strokeWidth={selectedHub === "action" ? 3 : 2}
                    />
                    <text x="840" y="106" textAnchor="middle" fill="#d97706" fontSize="11" fontWeight="700">
                      DECISION
                    </text>
                    <text x="840" y="122" textAnchor="middle" fill="#64748b" fontSize="9">
                      HITL Verified
                    </text>
                  </g>
                </svg>

                {/* Hub Details Panel */}
                <div className="w-full mt-3 p-3.5 bg-[var(--surface)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100 shrink-0">
                      <i className="fa-solid fa-circle-info text-sm"></i>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-1)]">
                        {hubDetails[selectedHub].title} · <span className="text-sky-700 font-mono">{hubDetails[selectedHub].stat}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                        {hubDetails[selectedHub].desc}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedHub === "ingest" && (
                      <button onClick={() => onNavigate("connectors")} className="exec-cta-btn text-xs">
                        {isVi ? "Xem Kết nối" : "Connectors"} →
                      </button>
                    )}
                    {selectedHub === "core" && (
                      <button onClick={() => onNavigate("knowledge")} className="exec-cta-btn text-xs">
                        {isVi ? "Xem Đồ thị" : "Graph"} →
                      </button>
                    )}
                    {selectedHub === "reasoning" && (
                      <button onClick={() => onNavigate("copilot")} className="exec-cta-btn text-xs">
                        {isVi ? "Mở Copilot" : "Copilot"} →
                      </button>
                    )}
                    {selectedHub === "risk" && (
                      <button onClick={() => onNavigate("risk")} className="exec-cta-btn text-xs">
                        {isVi ? "Trung tâm Rủi ro" : "Risk Center"} →
                      </button>
                    )}
                    {selectedHub === "action" && (
                      <button onClick={() => onNavigate("reports")} className="exec-cta-btn text-xs">
                        {isVi ? "Báo cáo Lãnh đạo" : "Reports"} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TWO COLUMN GRID: SIGNALS FEED (LEFT) + AT-RISK ENTITIES (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LEFT: AI REASONING SIGNALS FEED */}
              <div className="lg:col-span-7 flex flex-col gap-3 exec-action-deck">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-soft)]">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-brain text-sky-600"></i>
                    <h3 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wide">
                      {isVi ? "Dòng Tín hiệu AI Suy luận Nguyên nhân" : "AI Priority Reasoning Signals"}
                    </h3>
                  </div>

                  <div className="exec-seg-box">
                    {["all", "high", "med", "low"].map((filt) => (
                      <button
                        key={filt}
                        onClick={() => setSignalFilter(filt)}
                        className={`exec-seg-btn ${signalFilter === filt ? "active" : ""}`}
                        style={{ padding: "3px 8px", fontSize: "10px" }}
                      >
                        {filt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signals list */}
                <div className="flex flex-col gap-2.5">
                  {filteredSignals.map((sig) => {
                    const isHigh = sig.severity === "high";
                    const isMed = sig.severity === "med";

                    return (
                      <div
                        key={sig.id}
                        className="p-3.5 rounded-xl border transition-all"
                        style={{
                          background: "var(--surface)",
                          borderColor: isHigh
                            ? "rgba(220,38,38,0.3)"
                            : isMed
                            ? "rgba(217,119,6,0.3)"
                            : "var(--border)"
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                background: isHigh ? "#dc2626" : isMed ? "#d97706" : "#0284c7",
                                color: "#ffffff"
                              }}
                            >
                              {sig.badge}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--text-3)]">
                              {sig.id}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold text-sky-700">
                            {isHigh ? "CONFIDENCE: 94%" : isMed ? "CONFIDENCE: 88%" : "CONFIDENCE: 96%"}
                          </span>
                        </div>

                        {/* WHAT */}
                        <div className="mb-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              WHAT
                            </span>
                            <span className="text-xs font-bold text-[var(--text-1)]">
                              {isVi ? sig.what_vi : sig.what_en}
                            </span>
                          </div>
                        </div>

                        {/* WHY */}
                        <div className="mb-2 bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border-soft)]">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--text-3)] shrink-0 mt-0.5">WHY:</span>
                            <span className="text-[11px] text-[var(--text-2)] leading-relaxed">
                              {isVi ? sig.why_vi : sig.why_en}
                            </span>
                          </div>
                        </div>

                        {/* ACTION */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-soft)]">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ACTION
                            </span>
                            <span>{isVi ? sig.action_vi : sig.action_en}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {sig.entityId && (
                              <button
                                onClick={() => {
                                  onSelectEntity?.(sig.entityId);
                                  onNavigate("knowledge");
                                }}
                                className="text-xs px-2.5 py-1 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--text-2)] border border-[var(--border)] transition-all cursor-pointer font-medium"
                              >
                                {isVi ? "Thực thể" : "Entity"}
                              </button>
                            )}
                            <button
                              onClick={() => onNavigate("copilot")}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-sm cursor-pointer"
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

              {/* RIGHT: AT-RISK PORTFOLIO */}
              <div className="lg:col-span-5 flex flex-col gap-3 exec-action-deck">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-building-columns text-rose-600"></i>
                    <h3 className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wide">
                      {isVi ? "Thực thể Giám sát Trọng yếu" : "Key Monitored Entities"}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-3)]">
                    {entityList.length} TRACKED
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {entityList.map((ent) => {
                    const isSelected = selectedEntity === ent.id;
                    const isElevated = ent.risk === "Elevated" || ent.risk === "High";

                    return (
                      <div
                        key={ent.id}
                        onClick={() => onSelectEntity?.(ent.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/50 shadow-sm"
                            : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isElevated ? "bg-rose-500" : "bg-sky-600"
                              }`}
                            ></span>
                            <span className="text-xs font-bold text-[var(--text-1)]">
                              {ent.name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isElevated
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-[var(--surface-2)] text-[var(--text-3)]"
                            }`}
                          >
                            {ent.risk}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 my-1.5 text-center bg-[var(--surface-2)] p-2 rounded-lg border border-[var(--border-soft)] text-xs">
                          <div>
                            <div className="text-[9px] text-[var(--text-3)] uppercase font-medium">Doanh thu</div>
                            <div className="font-bold text-[var(--text-1)]">{ent.revenue}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[var(--text-3)] uppercase font-medium">Đơn hàng</div>
                            <div className="font-bold text-[var(--text-1)]">{ent.ordersCount}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[var(--text-3)] uppercase font-medium">Hợp đồng</div>
                            <div className="font-bold text-sky-700">{ent.activeContracts}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--text-3)] pt-1 border-t border-[var(--border-soft)]">
                          <span className="truncate max-w-[170px]">
                            {ent.contact}
                          </span>
                          <div className="flex items-center gap-1">
                            <i
                              className={`fa-solid ${
                                ent.verified ? "fa-circle-check text-emerald-600" : "fa-circle-question text-slate-400"
                              }`}
                            ></i>
                            <span>{ent.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between">
                  <button
                    onClick={() => {
                      showToast(
                        isVi
                          ? "Đã điều động kiểm toán công nợ sang Phòng Kế toán!"
                          : "Audit mandate dispatched to Finance team."
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    {isVi ? "Yêu cầu Kiểm toán" : "Dispatch Audit"}
                  </button>
                  <button
                    onClick={() => onNavigate("knowledge")}
                    className="exec-cta-btn text-xs"
                  >
                    {isVi ? "Xem Toàn bộ Đồ thị" : "Open Full Graph"} →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. MODE 2: MATRIX (CROSS-DEPARTMENT RISK & KNOWLEDGE MAP)*/}
        {/* ======================================================== */}
        {viewMode === "matrix" && (
          <div className="exec-action-deck">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-border-all text-sky-600"></i>
                <h3 className="text-sm font-bold text-[var(--text-1)]">
                  {isVi
                    ? "Ma trận Tri thức & Mức độ Phơi nhiễm Rủi ro theo Phòng ban"
                    : "Cross-Department Knowledge Coverage & Risk Exposure Matrix"}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                UPDATED 5 MIN AGO · HYBRID GRAPHRAG
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">{isVi ? "Miền Tri thức" : "Knowledge Domain"}</th>
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">Sales & Marketing</th>
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">Finance & Accounting</th>
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">Operations & Supply</th>
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">Legal & Compliance</th>
                    <th className="p-3 text-[var(--text-3)] font-semibold uppercase">Executive Board</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  <tr className="hover:bg-[var(--surface-hover)]">
                    <td className="p-3 font-semibold text-[var(--text-1)]">Customer Entities</td>
                    <td className="p-3 text-emerald-600 font-medium">98.4% (Synced)</td>
                    <td className="p-3 text-emerald-600 font-medium">96.1% (Synced)</td>
                    <td className="p-3 text-amber-600 font-medium">84.2% (12 Unlinked)</td>
                    <td className="p-3 text-emerald-600 font-medium">99.0% (Verified)</td>
                    <td className="p-3 text-emerald-600 font-bold">100% (Observatory)</td>
                  </tr>
                  <tr className="hover:bg-[var(--surface-hover)]">
                    <td className="p-3 font-semibold text-[var(--text-1)]">Contract & Master Agreements</td>
                    <td className="p-3 text-rose-600 font-medium">1 Expiring (12d)</td>
                    <td className="p-3 text-emerald-600 font-medium">4.1B VND Active</td>
                    <td className="p-3 text-[var(--text-3)]">—</td>
                    <td className="p-3 text-rose-600 font-bold">3 Under Scrutiny</td>
                    <td className="p-3 text-rose-600 font-bold">75.2 Tỷ Exposure</td>
                  </tr>
                  <tr className="hover:bg-[var(--surface-hover)]">
                    <td className="p-3 font-semibold text-[var(--text-1)]">Invoice & Payment Cadence</td>
                    <td className="p-3 text-amber-600 font-medium">32% Order Drop</td>
                    <td className="p-3 text-rose-600 font-medium">8.6B VND (&gt;60d)</td>
                    <td className="p-3 text-emerald-600 font-medium">Normal Flow</td>
                    <td className="p-3 text-[var(--text-3)]">—</td>
                    <td className="p-3 text-amber-600 font-bold">DSO +14 Days</td>
                  </tr>
                  <tr className="hover:bg-[var(--surface-hover)]">
                    <td className="p-3 font-semibold text-[var(--text-1)]">SOP & Operational Knowledge</td>
                    <td className="p-3 text-emerald-600 font-medium">14 SOPs Active</td>
                    <td className="p-3 text-amber-600 font-medium">1 Review Pending</td>
                    <td className="p-3 text-emerald-600 font-medium">32 SOPs Active</td>
                    <td className="p-3 text-emerald-600 font-medium">100% Audited</td>
                    <td className="p-3 text-emerald-600 font-bold">Compliant</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 mt-2 border-t border-[var(--border-soft)] text-xs">
              <span className="text-[var(--text-3)]">
                {isVi
                  ? "Nhấp vào bất kỳ ô nào để kích hoạt luồng kiểm tra suy luận chi tiết trong Copilot."
                  : "Click on any cell to trigger a deep causal trace in Copilot."}
              </span>
              <button
                onClick={() => onNavigate("risk")}
                className="exec-cta-btn text-xs"
              >
                {isVi ? "Xem Toàn bộ Rủi ro" : "Open Full Risk Center"} →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. MODAL: BOARD OF DIRECTORS DOSSIER (BÁO CÁO HĐQT)      */}
        {/* ======================================================== */}
        {showBoardDossierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-[var(--text-1)]">
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-soft)] mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center text-sm shadow-sm">
                    <i className="fa-solid fa-file-signature"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-1)]">
                      {isVi ? "Hồ Sơ Tổng Hợp Báo Cáo Phiên Họp Hội Đồng Quản Trị" : "Board of Directors Executive Dossier"}
                    </h3>
                    <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                      Mã hồ sơ: HĐQT-Q3-2026 · Chuẩn xác thực GraphRAG L5 Provenance
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowBoardDossierModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-3)] hover:text-[var(--text-1)] flex items-center justify-center transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              <div className="space-y-3 text-xs text-[var(--text-2)]">
                <div className="p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border-soft)]">
                  <div className="font-bold text-sky-700 mb-1">1. TỔNG QUAN TÀI CHÍNH & VẬN HÀNH</div>
                  <p className="leading-relaxed">
                    Doanh thu theo dõi đạt <strong>1,150 Tỷ VND ($48.6M USD)</strong>, hoàn thành 104% kế hoạch điều hành. Độ phủ tri thức đạt 94.2% trên 18 kho dữ liệu với 142,850 thực thể định danh.
                  </p>
                </div>

                <div className="p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border-soft)]">
                  <div className="font-bold text-rose-600 mb-1">2. TRỌNG ĐIỂM RỦI RO CẦN HĐQT LƯU TÂM</div>
                  <p className="leading-relaxed">
                    Tổng giá trị phơi nhiễm rủi ro ghi nhận <strong>75.2 Tỷ VND ($3.18M USD)</strong>, trong đó có 8.6 Tỷ nợ đọng quá hạn 60 ngày tại nhóm khách hàng dự án và hợp đồng ABC Corp 4.1 Tỷ hết hạn trong 12 ngày.
                  </p>
                </div>

                <div className="p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border-soft)]">
                  <div className="font-bold text-emerald-600 mb-1">3. CHỈ ĐẠO CẤP CAO ĐÃ BAN HÀNH BỞI CEO</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Phê duyệt hạn mức chiết khấu 10% giữ chân khách hàng VIP ABC Corp.</li>
                    <li>Ban hành lệnh thanh tra toàn diện công nợ &gt;60 ngày gửi Phòng Tài chính.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
                <div className="text-[11px] text-[var(--text-3)]">
                  Ký bởi: <strong className="text-[var(--text-1)]">Hoàng Minh Điều (CEO)</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBoardDossierModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    {isVi ? "Đóng" : "Close"}
                  </button>
                  <button
                    onClick={() => {
                      showToast(isVi ? "Đang kết xuất PDF Hồ sơ HĐQT..." : "Exporting Board Dossier PDF...");
                      setShowBoardDossierModal(false);
                    }}
                    className="exec-cta-btn text-xs"
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>{isVi ? "Tải File Báo Cáo PDF" : "Download PDF"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
