import React, { useState } from "react";

export default function RiskView({ onNavigate, t, lang }) {
  const isVi = lang === "vi";
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState("churn");
  const [discountSim, setDiscountSim] = useState(10);
  const [termSim, setTermSim] = useState(15);
  const [actionStatuses, setActionStatuses] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const markAction = (id, status) => {
    setActionStatuses((prev) => ({ ...prev, [id]: status }));
    showToast(isVi ? `Đã cập nhật trạng thái xử lý rủi ro: ${status}` : `Risk mitigation status logged: ${status}`);
  };

  // Base exposure is 14.1B VND ($3.18M). Dynamic simulation recalculates exposure:
  const simulatedSavedRevenue = (6.4 * (discountSim / 100) + 4.1 * 0.85).toFixed(2);
  const simulatedRemainingExposure = Math.max(0.8, (14.1 - Number(simulatedSavedRevenue))).toFixed(2);
  const simulatedRiskReduction = Math.min(88, Math.round((Number(simulatedSavedRevenue) / 14.1) * 100));

  const RISKS = [
    {
      id: "risk-1",
      category: "churn",
      severity: "high",
      pillClass: "red",
      title: "ABC Corporation — Order frequency dropped 32%",
      date: isVi ? "Phát hiện hôm nay" : "Detected today",
      entity: "ABC Corporation",
      impact: "6.4B VND lifetime account",
      actionText: isVi ? "Liên hệ Giám đốc Mua hàng trong 7 ngày" : "Review account & contact Procurement Dir within 7 days",
      lead: "Tran M. Anh (Procurement Dir.)"
    },
    {
      id: "risk-2",
      category: "contract",
      severity: "high",
      pillClass: "red",
      title: "Contract CT-2026-18 expires in 12 days, no renewal activity",
      date: isVi ? "Hết hạn 18/10/2026" : "Expires 18 Oct 2026",
      entity: "Contract CT-2026-18",
      impact: "1.2B VND contract value",
      actionText: isVi ? "Chuyển tiếp Lãnh đạo Kinh doanh để gia hạn" : "Escalate to Sales VP for contract renewal window",
      lead: "Pham Q. Linh (Account Mgr)"
    },
    {
      id: "risk-3",
      category: "payment",
      severity: "med",
      pillClass: "amber",
      title: "Receivables aging past 60 days rose 11.4%",
      date: isVi ? "2 ngày trước" : "Detected 2 days ago",
      entity: "Finance Ledger / AR",
      impact: "8.6B VND outstanding cashflow",
      actionText: isVi ? "Gắn cờ 5 tài khoản công nợ lớn để tái đàm phán" : "Flag top 5 aged customer accounts for debt reconciliation",
      lead: "Nguyen V. Binh (Finance Head)"
    },
    {
      id: "risk-4",
      category: "compliance",
      severity: "low",
      pillClass: "cyan",
      title: "12 SOP & Policy documents lack verified department owners",
      date: isVi ? "4 ngày trước" : "Detected 4 days ago",
      entity: "SOP-04 Reconciliation",
      impact: "Audit traceability compliance penalty",
      actionText: isVi ? "Gửi tài liệu vào Hàng đợi Xác thực Tri thức (HITL)" : "Route 12 documents to Human-in-the-loop validation queue",
      lead: "Knowledge Governance Unit"
    }
  ];

  const filteredRisks = RISKS.filter((r) => {
    if (selectedFilter === "all") return true;
    return r.category === selectedFilter;
  });

  const nodeDetails = {
    churn: {
      name: isVi ? "Cụm Rời bỏ Khách hàng (Customer Churn)" : "Customer Churn Cluster",
      severity: "CRITICAL",
      entities: "ABC Corporation, Delta Trading Ltd",
      exposure: "9.6B VND ($2.1M)",
      driver: isVi ? "Tần suất đặt hàng giảm 32% trong 60 ngày liên tục" : "Order cadence decline over 60-day trailing window"
    },
    contract: {
      name: isVi ? "Cụm Hết hạn Hợp đồng (Contract Expiration)" : "Contract Expiry Cluster",
      severity: "HIGH",
      entities: "CT-2026-18, CT-2026-24",
      exposure: "4.1B VND ($920K)",
      driver: isVi ? "Hết hạn trong < 21 ngày, chưa ghi nhận hoạt động tái ký trên CRM" : "Expiry < 21 days with no renewal activity logged in CRM"
    },
    payment: {
      name: isVi ? "Cụm Chậm trả & Công nợ (Payment Aging)" : "Payment & Cashflow Cluster",
      severity: "ELEVATED",
      entities: "Receivables Ledger Q3",
      exposure: "8.6B VND ($1.9M)",
      driver: isVi ? "Số ngày thu tiền trung bình (DSO) tăng thêm 14 ngày" : "Days Sales Outstanding (DSO) increased by 14 days"
    },
    compliance: {
      name: isVi ? "Cụm Tuân thủ & Chất lượng Dữ liệu" : "Data Compliance & SOPs",
      severity: "MODERATE",
      entities: "12 SOP Documents",
      exposure: "Governance Scrutiny",
      driver: isVi ? "Thiếu siêu dữ liệu phòng ban chịu trách nhiệm" : "Missing author and department provenance metadata"
    }
  };

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-shield-halved text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="section-label">{t.risk_title || (isVi ? "Đài Quan sát Rủi ro Doanh nghiệp" : "Enterprise Risk Observatory")}</div>
          <div className="section-sub">{t.risk_sub || (isVi ? "Mô hình hoá lan truyền rủi ro, dòng thời gian phát hiện và mô phỏng giải pháp" : "Multi-hop risk propagation, timeline anomalies, and mitigation sandbox")}</div>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={() => onNavigate("copilot")}
            className="btn sm"
          >
            {isVi ? "Hỏi Copilot về Rủi ro" : "Query Copilot"}
          </button>
          <button
            onClick={() => onNavigate("reports")}
            className="btn primary sm"
          >
            {isVi ? "Xuất Báo cáo Rủi ro" : "Export Risk Brief"} →
          </button>
        </div>
      </div>

      {/* Risk Metrics Summary Chips */}
      <div className="risk-summary">
        <div
          onClick={() => setSelectedFilter("all")}
          className={`risk-chip cursor-pointer transition-all ${selectedFilter === "all" ? "ring-2 ring-primary" : ""}`}
        >
          <div className="rc-count">23</div>
          <div className="rc-label">{isVi ? "TỔNG RỦI RO THEO DÕI" : "TOTAL ANOMALIES"}</div>
        </div>

        <div
          onClick={() => setSelectedFilter("churn")}
          className={`risk-chip high cursor-pointer transition-all ${selectedFilter === "churn" ? "ring-2 ring-error" : ""}`}
        >
          <div className="rc-count">3</div>
          <div className="rc-label">{t.risk_high_label || (isVi ? "NGUY CƠ CAO (RỜI BỎ)" : "HIGH (CHURN RISK)")}</div>
        </div>

        <div
          onClick={() => setSelectedFilter("contract")}
          className={`risk-chip med cursor-pointer transition-all ${selectedFilter === "contract" ? "ring-2 ring-amber-500" : ""}`}
        >
          <div className="rc-count">6</div>
          <div className="rc-label">{t.risk_med_label || (isVi ? "TRUNG BÌNH (HỢP ĐỒNG)" : "MEDIUM (CONTRACT EXPIRY)")}</div>
        </div>

        <div
          onClick={() => setSelectedFilter("payment")}
          className={`risk-chip low cursor-pointer transition-all ${selectedFilter === "payment" ? "ring-2 ring-cyan-500" : ""}`}
        >
          <div className="rc-count">14</div>
          <div className="rc-label">{t.risk_low_label || (isVi ? "THẤP (CÔNG NỢ / DỮ LIỆU)" : "LOW (PAYMENT & DATA)")}</div>
        </div>
      </div>

      {/* Main Grid: Left Timeline + Right Interactive Risk Map */}
      <div className="grid2">
        {/* LEFT: TIMELINE WITH DIRECT MITIGATION ACTIONS */}
        <div className="panel" style={{ padding: "18px 20px" }}>
          <div className="flex items-center justify-between mb-space-sm">
            <div className="panel-title">
              {isVi ? "Dòng Thời gian & Khuyến nghị Xử lý" : "Risk Timeline & Actionable Mitigation"}
            </div>
            <span className="font-label-caps text-label-caps text-outline">
              {filteredRisks.length} {isVi ? "MỤC HIỂN THỊ" : "ITEMS"}
            </span>
          </div>

          <div className="timeline">
            {filteredRisks.map((item) => {
              const status = actionStatuses[item.id] || "pending";

              return (
                <div key={item.id} className={`tl-item ${item.severity}`}>
                  <div className="tl-card">
                    <div className="tl-top flex items-center justify-between">
                      <span className={`pill ${item.pillClass} uppercase font-bold text-[10px]`}>
                        {item.category}
                      </span>
                      <span className="tl-date">{item.date}</span>
                    </div>

                    <div className="tl-title font-semibold text-on-surface mt-space-2xs">
                      {item.title}
                    </div>

                    <div className="tl-meta text-body-sm text-on-surface-variant my-space-2xs">
                      <b>{isVi ? "Thực thể" : "Entity"}:</b> {item.entity} · <b>{isVi ? "Tác động" : "Impact"}:</b> {item.impact}
                    </div>

                    <div className="text-body-sm text-outline mb-space-xs">
                      <b>{isVi ? "Đầu mối" : "Owner"}:</b> {item.lead}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pt-space-xs border-t border-outline-variant/20">
                      <div className="text-primary font-semibold text-body-sm">
                        → {item.actionText}
                      </div>

                      <div className="flex items-center gap-space-2xs shrink-0">
                        {status === "pending" ? (
                          <>
                            <button
                              onClick={() => markAction(item.id, "escalated")}
                              className="btn sm"
                            >
                              {isVi ? "Báo cáo Lãnh đạo" : "Escalate"}
                            </button>
                            <button
                              onClick={() => markAction(item.id, "resolved")}
                              className="btn primary sm"
                            >
                              {isVi ? "Đánh dấu Đã xử lý" : "Resolve"}
                            </button>
                          </>
                        ) : (
                          <span className="font-code-sm text-code-sm text-green-500 font-bold flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[14px]"></i>
                            {status === "resolved" ? (isVi ? "ĐÃ XỬ LÝ" : "RESOLVED") : (isVi ? "ĐÃ BÁO CÁO" : "ESCALATED")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: INTERACTIVE RISK MAP (SVG) & CLUSTER INSPECTOR */}
        <div className="panel flex flex-col justify-between" style={{ padding: "18px 20px" }}>
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="panel-title">
                {isVi ? "Bản đồ Mạng lưới Cụm Rủi ro (Tương tác)" : "Interactive Risk Cluster Graph"}
              </div>
              <span className="font-label-caps text-label-caps text-outline">
                {isVi ? "CHỌN CỤM ĐỂ KIỂM TRA" : "SELECT CLUSTER"}
              </span>
            </div>

            <svg viewBox="0 0 360 270" style={{ width: "100%", height: "260px" }}>
              <defs>
                <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Edge connections */}
              <g className="g-edge" stroke="var(--border-strong)" strokeWidth="1.8" opacity="0.6">
                <path d="M180,135 L80,60" strokeDasharray="4,4" />
                <path d="M180,135 L280,60" strokeDasharray="4,4" />
                <path d="M180,135 L70,210" strokeDasharray="4,4" />
                <path d="M180,135 L290,210" strokeDasharray="4,4" />
              </g>

              {/* Center Business Node */}
              <circle cx="180" cy="135" r="40" fill="url(#hubGlow)" />
              <circle cx="180" cy="135" r="26" fill="var(--surface-3)" stroke="var(--primary)" strokeWidth="2.2" />
              <text x="180" y="132" textAnchor="middle" fill="var(--primary)" fontSize="10" fontWeight="700">
                ENTERPRISE
              </text>
              <text x="180" y="145" textAnchor="middle" fill="var(--text-3)" fontSize="8">
                $48.6M Core
              </text>

              {/* Node 1: Churn Risk */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedNode("churn")}
              >
                <circle
                  cx="80"
                  cy="60"
                  r={selectedNode === "churn" ? 28 : 22}
                  fill="var(--red-dim)"
                  stroke="var(--red)"
                  strokeWidth={selectedNode === "churn" ? 3 : 1.8}
                />
                <text x="80" y="58" textAnchor="middle" fill="var(--red)" fontSize="10" fontWeight="700">
                  CHURN
                </text>
                <text x="80" y="70" textAnchor="middle" fill="var(--text-1)" fontSize="8">
                  32% Drop
                </text>
              </g>

              {/* Node 2: Contract Expiry */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedNode("contract")}
              >
                <circle
                  cx="280"
                  cy="60"
                  r={selectedNode === "contract" ? 28 : 22}
                  fill="var(--red-dim)"
                  stroke="var(--red)"
                  strokeWidth={selectedNode === "contract" ? 3 : 1.8}
                />
                <text x="280" y="58" textAnchor="middle" fill="var(--red)" fontSize="10" fontWeight="700">
                  CONTRACT
                </text>
                <text x="280" y="70" textAnchor="middle" fill="var(--text-1)" fontSize="8">
                  12d Left
                </text>
              </g>

              {/* Node 3: Payment Aging */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedNode("payment")}
              >
                <circle
                  cx="70"
                  cy="210"
                  r={selectedNode === "payment" ? 26 : 20}
                  fill="var(--amber-dim)"
                  stroke="var(--amber)"
                  strokeWidth={selectedNode === "payment" ? 3 : 1.8}
                />
                <text x="70" y="208" textAnchor="middle" fill="var(--amber)" fontSize="9" fontWeight="700">
                  PAYMENT
                </text>
                <text x="70" y="220" textAnchor="middle" fill="var(--text-1)" fontSize="8">
                  8.6B VND
                </text>
              </g>

              {/* Node 4: Compliance & Data */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedNode("compliance")}
              >
                <circle
                  cx="290"
                  cy="210"
                  r={selectedNode === "compliance" ? 24 : 18}
                  fill="var(--cyan-dim)"
                  stroke="var(--cyan)"
                  strokeWidth={selectedNode === "compliance" ? 3 : 1.8}
                />
                <text x="290" y="208" textAnchor="middle" fill="var(--cyan)" fontSize="9" fontWeight="700">
                  COMPLIANCE
                </text>
                <text x="290" y="220" textAnchor="middle" fill="var(--text-1)" fontSize="8">
                  12 SOPs
                </text>
              </g>
            </svg>

            {/* Inspected Cluster Callout */}
            <div className="bg-surface-container p-space-sm rounded-DEFAULT border border-outline-variant/30 mt-space-xs">
              <div className="flex items-center justify-between mb-space-2xs">
                <span className="font-title-sm text-title-sm font-bold text-primary">
                  {nodeDetails[selectedNode].name}
                </span>
                <span className="font-label-caps text-label-caps bg-error/20 text-error px-space-xs py-space-2xs rounded-DEFAULT font-bold">
                  {nodeDetails[selectedNode].severity}
                </span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface mb-space-2xs">
                <b>{isVi ? "Thực thể ảnh hưởng" : "Affected Entities"}:</b> {nodeDetails[selectedNode].entities}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface mb-space-2xs">
                <b>{isVi ? "Giá trị phơi nhiễm" : "Monetary Exposure"}:</b> <span className="font-mono text-error font-bold">{nodeDetails[selectedNode].exposure}</span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                <b>{isVi ? "Nguyên nhân gốc rễ" : "Root Cause"}:</b> {nodeDetails[selectedNode].driver}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCENARIO SIMULATION & WHAT-IF MITIGATION SANDBOX */}
      <div className="panel p-space-md bg-surface-container-low rounded-lg border border-outline-variant/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-sm pb-space-xs border-b border-outline-variant/20">
          <div className="flex items-center gap-space-xs">
            <i className="fa-solid fa-sliders text-primary text-[20px]"></i>
            <div>
              <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                {isVi ? "Hộp cát Mô phỏng Kịch bản Giảm thiểu Rủi ro (What-If Simulation)" : "Executive Risk Mitigation & Scenario Simulation Sandbox"}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {isVi ? "Điều chỉnh các thông số chính sách để tính toán tức thời mức độ thu hồi doanh thu và giảm phơi nhiễm rủi ro" : "Tune mitigation policy variables to calculate real-time retained revenue and risk reduction"}
              </p>
            </div>
          </div>

          <span className="font-label-caps text-label-caps bg-primary/20 text-primary px-space-sm py-space-2xs rounded-DEFAULT font-bold">
            {isVi ? "SUY LUẬN XÁC SUẤT ĐỒ THỊ" : "PROBABILISTIC GRAPH MODEL"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
          {/* Sliders (Col 7) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div>
              <div className="flex justify-between items-center mb-space-2xs">
                <label className="font-body-sm text-body-sm font-semibold text-on-surface">
                  {isVi ? "Chiết khấu gia hạn cho ABC Corp & Hợp đồng CT-2026-18:" : "Retention Discount Offer for CT-2026-18 Renewal:"}
                </label>
                <span className="font-code-sm text-code-sm font-bold text-primary">{discountSim}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={discountSim}
                onChange={(e) => setDiscountSim(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-caption text-outline mt-1">
                <span>0% (Standard)</span>
                <span>10% (Target)</span>
                <span>25% (Max Aggressive)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-space-2xs">
                <label className="font-body-sm text-body-sm font-semibold text-on-surface">
                  {isVi ? "Gia hạn thời hạn thanh toán công nợ (Grace Period Extension):" : "Receivable Grace Period Extension:"}
                </label>
                <span className="font-code-sm text-code-sm font-bold text-primary">{termSim} {isVi ? "ngày" : "days"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={termSim}
                onChange={(e) => setTermSim(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-caption text-outline mt-1">
                <span>0 days (Strict)</span>
                <span>15 days (Balanced)</span>
                <span>45 days (Maximum Flex)</span>
              </div>
            </div>
          </div>

          {/* Recalculated Output Box (Col 5) */}
          <div className="lg:col-span-5 bg-surface-container p-space-md rounded-DEFAULT border border-primary/30 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-outline uppercase">
                {isVi ? "KẾT QUẢ MÔ PHỎNG" : "SIMULATION OUTCOME"}
              </span>
              <span className="font-code-sm text-code-sm text-green-500 font-bold">
                +{simulatedRiskReduction}% {isVi ? "GIẢM THIỂU" : "REDUCTION"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-space-sm text-center">
              <div className="bg-surface-container-lowest p-space-xs rounded-DEFAULT">
                <div className="font-label-caps text-label-caps text-outline">
                  {isVi ? "DOANH THU BẢO TOÀN" : "RETAINED REVENUE"}
                </div>
                <div className="font-metric-tabular-lg text-metric-tabular-lg text-green-500 font-bold mt-1">
                  {simulatedSavedRevenue}B
                </div>
                <div className="text-caption text-outline">VND</div>
              </div>

              <div className="bg-surface-container-lowest p-space-xs rounded-DEFAULT">
                <div className="font-label-caps text-label-caps text-outline">
                  {isVi ? "RỦI RO CÒN LẠI" : "RESIDUAL EXPOSURE"}
                </div>
                <div className="font-metric-tabular-lg text-metric-tabular-lg text-error font-bold mt-1">
                  {simulatedRemainingExposure}B
                </div>
                <div className="text-caption text-outline">VND</div>
              </div>
            </div>

            <button
              onClick={() => {
                showToast(isVi ? "Kịch bản đã được phê duyệt và chuyển vào Báo cáo Chiến lược!" : "Mitigation package approved & committed to Strategic Briefing.");
                onNavigate("reports");
              }}
              className="btn primary w-full text-center"
            >
              {isVi ? "Phê duyệt Kế hoạch & Tạo Báo cáo" : "Commit Plan & Generate Briefing"} →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
