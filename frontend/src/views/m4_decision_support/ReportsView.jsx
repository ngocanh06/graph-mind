import React, { useState } from "react";

export default function ReportsView({ onNavigate, t, lang, role = "executive" }) {
  const isVi = lang === "vi";
  const isSalesRole = role === "standard";

  // Common State
  const [timeRange, setTimeRange] = useState("today");
  const [depth, setDepth] = useState("comprehensive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDate, setGeneratedDate] = useState(
    isSalesRole ? "20 Th09 2026, 11:30" : "15 Sep 2026, 10:00"
  );
  const [toastMsg, setToastMsg] = useState("");
  const [managerApproved, setManagerApproved] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleGenerateBriefing = () => {
    setIsGenerating(true);
    showToast(
      isSalesRole
        ? (isVi ? "Trợ lý AI đang quét nhật ký cuộc gọi, email và phiếu điều phối EDR..." : "AI scanning call logs, emails, and EDR dispatch tickets...")
        : (isVi ? "Đang tổng hợp dữ liệu từ 247 nguồn tri thức qua Hybrid GraphRAG..." : "Synthesizing 247 knowledge sources via Hybrid GraphRAG...")
    );
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedDate(
        new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      );
      showToast(
        isSalesRole
          ? (isVi ? "Đã tái lập Báo cáo ca tác nghiệp bán hàng hoàn chỉnh!" : "Sales shift report compiled successfully!")
          : (isVi ? "Báo cáo Lãnh đạo đã được tạo thành công!" : "Executive Briefing synthesized and ready for review!")
      );
    }, 1100);
  };

  const handleSubmitToManager = () => {
    setReportSubmitted(true);
    showToast(
      isVi
        ? "Đã gửi báo cáo ca làm việc tới Trưởng phòng Trần M. Anh phê duyệt!"
        : "Work report submitted to Dept Manager Tran M. Anh!"
    );
    setTimeout(() => {
      setManagerApproved(true);
      showToast(
        isVi
          ? "Trưởng phòng Trần M. Anh vừa phê duyệt & ký số xác nhận báo cáo ca làm việc!"
          : "Dept Manager Tran M. Anh signed off on your shift report!"
      );
    }, 1800);
  };

  const handleCopySummary = () => {
    const text = isSalesRole
      ? (isVi
        ? "BÁO CÁO CÔNG VIỆC CA LÀM VIỆC - CHUYÊN VIÊN NGUYỄN V. NAM (20/09/2026):\n- Hoàn tất 4/4 ca cảnh báo (100% SLA, TB 12p/ca).\n- Bảo vệ thành công 4.1 Tỷ VND doanh số tái ký (ABC Corp 1.2B chiết khấu 10%, Delta Trading 2.9B).\n- Đã phát hành 3 bộ chứng từ (BG-2026-09, EDR #8821, Phụ lục PL #44).\n- Đề xuất Trưởng phòng: Cấp quyền duyệt nhanh mức chiết khấu 12% cho hợp đồng kỳ hạn 24 tháng."
        : "SALES SHIFT WORK REPORT - SPECIALIST NGUYEN V. NAM (20/09/2026):\n- Resolved 4/4 priority cases (100% SLA, avg 12m/case).\n- Protected $4.1B VND renewal pipeline (ABC Corp 1.2B with 10% retention, Delta Trading 2.9B).\n- 3 document packets dispatched (BG-2026-09, EDR #8821, Annex PL #44).\n- Manager escalation: Request 12% approval threshold for 24-month commitments.")
      : (isVi
        ? "BÁO CÁO LÃNH ĐẠO GRAPH MIND - TỔNG HỢP CHIẾN LƯỢC:\nDoanh thu tăng 6.2% trong 30 ngày qua nhưng tần suất đơn hàng giảm 3.1% ở 2 khách hàng VIP (ABC Corp -32%, Delta Trading -44%). Cần đàm phán gia hạn hợp đồng CT-2026-18 (hết hạn 18/10) và xử lý 8.6 tỷ VND công nợ quá hạn."
        : "GRAPH MIND EXECUTIVE BRIEFING:\nRevenue grew 6.2% over trailing 30 days while order cadence declined 3.1% in top accounts (ABC Corp -32%, Delta Trading -44%). Urgent contract renewal required for CT-2026-18 (expires 18 Oct) and reconciliation of 8.6B VND aged receivables.");
    navigator.clipboard?.writeText(text);
    showToast(isVi ? "Đã sao chép tóm tắt báo cáo vào bộ nhớ tạm!" : "Summary copied to clipboard!");
  };

  // ----------------------------------------------------------------------
  // RENDER FOR SALES SPECIALIST (role === 'standard')
  // ----------------------------------------------------------------------
  if (isSalesRole) {
    return (
      <div className="view active" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px 20px" }}>
        {/* Scoped High-End Stylesheet for Reports View */}
        <style>{`
          .sales-report-wrap {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
            font-family: var(--f-body);
          }

          /* HERO HEADER CARD */
          .rep-hero-box {
            background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 22px 28px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .rep-hero-glow {
            position: absolute;
            top: -40px;
            right: -30px;
            width: 240px;
            height: 240px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%);
            pointer-events: none;
            filter: blur(25px);
          }
          .rep-tag-strip {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .rep-pill-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 24px;
            font-size: 11.5px;
            font-weight: 700;
            font-family: var(--f-body) !important;
            letter-spacing: 0.01em;
            line-height: 1;
          }
          .rep-pill-blue {
            background: rgba(37, 99, 235, 0.08);
            color: #2563eb;
            border: 1px solid rgba(37, 99, 235, 0.2);
          }
          .rep-pill-neutral {
            background: var(--surface-3);
            color: var(--text-2);
            border: 1px solid var(--border);
          }
          .rep-pill-green {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.25);
          }
          .rep-pill-amber {
            background: rgba(245, 158, 11, 0.1);
            color: #d97706;
            border: 1px solid rgba(245, 158, 11, 0.25);
          }

          /* ACTION BUTTONS */
          .rep-actions-cluster {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .rep-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: var(--f-body);
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text-1);
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          }
          .rep-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-color: var(--border-focus);
          }
          .rep-btn.magic {
            border: 1px solid rgba(14, 165, 233, 0.35);
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%);
            color: #0284c7;
          }
          .rep-btn.magic:hover {
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
            border-color: #0284c7;
          }
          .rep-btn.primary-gradient {
            border: none;
            background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          }
          .rep-btn.primary-gradient:hover {
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
            transform: translateY(-1.5px);
          }

          /* KPI CARDS - 1 DÒNG DUY NHẤT */
          .rep-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }
          @media (max-width: 900px) {
            .rep-kpi-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          .rep-kpi-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 15px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
            transition: all 0.25s ease;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .rep-kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 22px rgba(0,0,0,0.06);
            border-color: rgba(37, 99, 235, 0.3);
          }
          .rep-kpi-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .rep-kpi-label {
            font-size: 11.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-3);
          }
          .rep-kpi-icon-wrap {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }
          .rep-kpi-val {
            font-size: 23px;
            font-weight: 800;
            color: var(--text-1);
            font-family: var(--f-display);
            letter-spacing: -0.02em;
            display: flex;
            align-items: baseline;
            gap: 6px;
            flex-wrap: wrap;
          }
          .rep-kpi-meta {
            font-size: 11.5px;
            color: var(--text-3);
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .rep-progress-track {
            width: 100%;
            height: 5px;
            background: var(--surface-3);
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
          }
          .rep-progress-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.6s ease;
          }

          /* SEGMENTED CONTROL BAR */
          .rep-filter-dock {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 8px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.02);
          }
          .rep-seg-group {
            display: inline-flex;
            align-items: center;
            background: var(--surface-2);
            padding: 3px;
            border-radius: 10px;
            border: 1px solid var(--border-soft);
          }
          .rep-seg-btn {
            padding: 6px 16px;
            border-radius: 7px;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--text-3);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.16s ease;
            font-family: var(--f-body);
          }
          .rep-seg-btn:hover {
            color: var(--text-1);
          }
          .rep-seg-btn.active {
            background: var(--surface);
            color: #2563eb;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
            font-weight: 700;
          }

          /* ACTIVITY LEDGER TABLE */
          .rep-table-panel {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 20px 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .rep-table-lux {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
          }
          .rep-table-lux thead th {
            background: var(--surface-2);
            color: var(--text-3);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 12px 14px;
            border-top: 1px solid var(--border-soft);
            border-bottom: 1px solid var(--border);
            text-align: left;
          }
          .rep-table-lux thead th:first-child {
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
          }
          .rep-table-lux thead th:last-child {
            border-top-right-radius: 10px;
            border-bottom-right-radius: 10px;
            text-align: right;
          }
          .rep-table-lux tbody tr {
            transition: background 0.16s ease;
          }
          .rep-table-lux tbody tr:hover {
            background: var(--surface-hover);
          }
          .rep-table-lux tbody td {
            padding: 14px;
            border-bottom: 1px solid var(--border-soft);
            vertical-align: middle;
            color: var(--text-1);
          }
          .rep-table-lux tbody tr:last-child td {
            border-bottom: none;
          }

          /* STATUS BADGES */
          .rep-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            display: inline-block;
          }
          .rep-status-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }

          /* OFFICIAL DOCUMENT DOSSIER */
          .rep-doc-dossier {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px 32px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.04);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 22px;
          }
          .rep-doc-stripe {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #0284c7 0%, #2563eb 40%, #6366f1 70%, #10b981 100%);
          }

          /* SIGN-OFF CERTIFICATE */
          .rep-sign-box {
            border-radius: 14px;
            padding: 20px 24px;
            border: 1.5px dashed rgba(16, 185, 129, 0.4);
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(37, 99, 235, 0.02) 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
          }
        `}</style>

        {/* Floating Toast Notification */}
        {toastMsg && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 9999,
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border-focus)",
              color: "var(--text-1)",
              padding: "12px 20px",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backdropFilter: "blur(12px)",
              animation: "slideIn 0.25s ease"
            }}
          >
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
              <i className="fa-solid fa-check"></i>
            </div>
            <span style={{ fontSize: "13.5px", fontWeight: "600" }}>{toastMsg}</span>
          </div>
        )}

        <div className="sales-report-wrap">
          {/* 1. HERO HEADER CARD */}
          <div className="rep-hero-box">
            <div className="rep-hero-glow"></div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div className="rep-tag-strip" style={{ marginBottom: "10px" }}>
                  <span className="rep-pill-tag rep-pill-blue">
                    <i className="fa-solid fa-chart-pie"></i>
                    {isVi ? "Báo Cáo Tác Nghiệp Bán Hàng" : "Sales Operational Report"}
                  </span>
                  <span className="rep-pill-tag rep-pill-neutral">
                    <i className="fa-solid fa-id-badge"></i>
                    {isVi ? "Chuyên viên: Nguyễn V. Nam · Mã GM-088" : "Specialist: Nguyen V. Nam · ID GM-088"}
                  </span>
                  {managerApproved ? (
                    <span className="rep-pill-tag rep-pill-green">
                      <i className="fa-solid fa-circle-check"></i>
                      {isVi ? "Trưởng phòng Trần M. Anh ĐÃ DUYỆT" : "Dept Manager APPROVED"}
                    </span>
                  ) : reportSubmitted ? (
                    <span className="rep-pill-tag rep-pill-amber">
                      <i className="fa-solid fa-hourglass-half"></i>
                      {isVi ? "Đang chờ Trưởng phòng duyệt" : "Pending Manager Sign-off"}
                    </span>
                  ) : (
                    <span className="rep-pill-tag rep-pill-neutral" style={{ color: "#2563eb", background: "rgba(37, 99, 235, 0.06)", borderColor: "rgba(37, 99, 235, 0.2)" }}>
                      <i className="fa-solid fa-pen-nib"></i>
                      {isVi ? "Bản thảo ca đang cập nhật" : "Current Active Shift Draft"}
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                  {isVi ? "Báo Cáo Công Việc & Nhật Ký Tác Nghiệp Ca" : "Shift Work & Operations Report"}
                </h1>
                <p style={{ fontSize: "13.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
                  {isVi
                    ? "Tổng hợp kết quả xử lý tài khoản khách hàng VIP, giữ chân doanh số và nhật ký tác nghiệp hợp đồng của Chuyên viên Nguyễn V. Nam"
                    : "Comprehensive synthesis of VIP client account interventions, retention revenue, and shift execution logs"}
                </p>
              </div>

              {/* Action Cluster */}
              <div className="rep-actions-cluster">
                <button
                  onClick={() => onNavigate("search")}
                  className="rep-btn"
                  title={isVi ? "Quay về Bàn làm việc Khách hàng" : "Return to Operations Hub"}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>{isVi ? "Bàn Làm Việc" : "Operations Hub"}</span>
                </button>

                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGenerating}
                  className="rep-btn magic"
                  title={isVi ? "AI tự động thu thập nhật ký để soạn báo cáo" : "AI auto-compile shift report"}
                >
                  <i className={`fa-solid ${isGenerating ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`}></i>
                  <span>{isGenerating ? (isVi ? "AI Đang Soạn..." : "Compiling...") : (isVi ? "AI Soạn Báo Cáo" : "AI Compile Report")}</span>
                </button>

                <button
                  onClick={handleSubmitToManager}
                  className="rep-btn primary-gradient"
                  title={isVi ? "Gửi báo cáo lên Trưởng phòng Trần M. Anh" : "Submit report to Dept Manager"}
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>{isVi ? "Gửi Trưởng Phòng Duyệt" : "Submit to Manager"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. KPI BENCHMARK CARDS */}
          <div className="rep-kpi-grid">
            {/* KPI 1 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Ca Cảnh Báo Đã Xử Lý" : "Cases Resolved"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
              </div>
              <div>
                <div className="rep-kpi-val">
                  4 / 4
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                    100% SLA
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: "100%", background: "linear-gradient(90deg, #10b981, #059669)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <i className="fa-solid fa-clock" style={{ fontSize: "11px", color: "var(--text-4)" }}></i>
                  <span>{isVi ? "Tốc độ xử lý TB: 12 phút / ca" : "Avg turnaround: 12m"}</span>
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Doanh Số Bảo Vệ (Tái Ký)" : "Protected Pipeline"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                </div>
              </div>
              <div>
                <div className="rep-kpi-val" style={{ color: "#2563eb" }}>
                  4.1 Tỷ VND
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#2563eb", background: "rgba(37, 99, 235, 0.08)", padding: "2px 8px", borderRadius: "12px" }}>
                    +2.4% MoM
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: "88%", background: "linear-gradient(90deg, #38bdf8, #2563eb)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <i className="fa-solid fa-building" style={{ fontSize: "11px", color: "var(--text-4)" }}></i>
                  <span>ABC Corp (1.2B) & Delta Trading (2.9B)</span>
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Hồ Sơ & Báo Giá Đã Lập" : "Quotes & Dispatches"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#d97706" }}>
                  <i className="fa-solid fa-file-signature"></i>
                </div>
              </div>
              <div>
                <div className="rep-kpi-val">
                  3 <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-3)" }}>{isVi ? "Bộ hoàn tất" : "Packets"}</span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: "75%", background: "linear-gradient(90deg, #fbbf24, #d97706)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <i className="fa-solid fa-tags" style={{ fontSize: "11px", color: "var(--text-4)" }}></i>
                  <span>1 Báo giá Cloud · 1 Phụ lục · 1 EDR</span>
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Điểm Tuân Thủ SOP & KPI" : "SOP Compliance"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(6, 182, 212, 0.1)", color: "#0891b2" }}>
                  <i className="fa-solid fa-award"></i>
                </div>
              </div>
              <div>
                <div className="rep-kpi-val" style={{ color: "#059669" }}>
                  98.5 <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-4)" }}>/ 100</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#0891b2", background: "rgba(6, 182, 212, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                    Hạng A+
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: "98.5%", background: "linear-gradient(90deg, #2dd4bf, #059669)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <i className="fa-solid fa-medal" style={{ fontSize: "11px", color: "#0891b2" }}></i>
                  <span>{isVi ? "Top 5% năng suất khối Kinh doanh" : "Top 5% frontline productivity"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SEGMENTED FILTER DOCK */}
          <div className="rep-filter-dock">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isVi ? "Kỳ Báo Cáo:" : "Reporting Period:"}
              </span>
              <div className="rep-seg-group">
                <button
                  onClick={() => setTimeRange("today")}
                  className={`rep-seg-btn ${timeRange === "today" ? "active" : ""}`}
                >
                  <i className="fa-solid fa-calendar-day mr-1"></i>
                  {isVi ? "Hôm nay (20/09/2026)" : "Today (20 Sep 2026)"}
                </button>
                <button
                  onClick={() => setTimeRange("week")}
                  className={`rep-seg-btn ${timeRange === "week" ? "active" : ""}`}
                >
                  <i className="fa-solid fa-calendar-week mr-1"></i>
                  {isVi ? "Tuần 38 (15 - 21/09)" : "Week 38 (15-21 Sep)"}
                </button>
                <button
                  onClick={() => setTimeRange("month")}
                  className={`rep-seg-btn ${timeRange === "month" ? "active" : ""}`}
                >
                  <i className="fa-solid fa-calendar mr-1"></i>
                  {isVi ? "Tháng 09/2026" : "September 2026"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleCopySummary}
                className="rep-btn"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                title={isVi ? "Sao chép tóm tắt nội dung báo cáo ca" : "Copy shift summary"}
              >
                <i className="fa-solid fa-copy"></i>
                <span>{isVi ? "Sao chép Tóm tắt" : "Copy Summary"}</span>
              </button>

              <button
                onClick={() => showToast(isVi ? "Đang xuất file Báo cáo công việc PDF chất lượng cao..." : "Exporting high-resolution PDF work report...")}
                className="rep-btn"
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                <i className="fa-solid fa-file-pdf" style={{ color: "#ef4444" }}></i>
                <span>{isVi ? "Xuất PDF" : "Export PDF"}</span>
              </button>
            </div>
          </div>

          {/* 4. ACTIVITY LEDGER (ACTIVITY LOG GRID) */}
          <div className="rep-table-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                  <i className="fa-solid fa-list-check"></i>
                </div>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                    {isVi ? "Nhật Ký Xử Lý Ca Làm Việc Chi Tiết" : "Shift Operations Activity Ledger"}
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                    {isVi ? "4 vụ việc đã can thiệp trong ca · Đồng bộ trực tiếp từ CRM & Trợ lý Copilot" : "4 cases resolved in current shift · Real-time synced with CRM & Copilot"}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: "12px", fontWeight: "600", color: "#059669", background: "rgba(16, 185, 129, 0.08)", padding: "4px 10px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="rep-status-dot" style={{ background: "#10b981" }}></span>
                {isVi ? "Đã xác thực chữ ký điện tử" : "Cryptographically Signed"}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="rep-table-lux">
                <thead>
                  <tr>
                    <th style={{ width: "85px" }}>{isVi ? "Thời Gian" : "Time"}</th>
                    <th style={{ width: "190px" }}>{isVi ? "Khách Hàng / Đối Tác" : "Account"}</th>
                    <th style={{ minWidth: "220px" }}>{isVi ? "Nhiệm Vụ Tác Nghiệp" : "Action Item"}</th>
                    <th style={{ minWidth: "280px" }}>{isVi ? "Giải Pháp & Tiền Lệ AI" : "AI Solution & Evidence"}</th>
                    <th style={{ width: "130px" }}>{isVi ? "Mã Chứng Từ" : "Doc ID"}</th>
                    <th style={{ width: "135px" }}>{isVi ? "Trạng Thái" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                      09:15
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                          ABC
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13.5px" }}>ABC Corporation</div>
                          <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>Tier-1 Enterprise</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--text-1)" }}>
                        {isVi ? "Xử lý cảnh báo sụt giảm đơn hàng (-32%)" : "Order cadence drop alert (-32%)"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                        {isVi ? "Rủi ro phơi nhiễm hợp đồng CT-2026-18 (1.2B)" : "Contract CT-2026-18 expiration exposure"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.4 }}>
                        {isVi
                          ? "Copilot tra cứu tiền lệ CT-2024; áp dụng gói chiết khấu 10% giữ chân tài khoản; xuất phiếu EDR"
                          : "Copilot matched CT-2024 precedent; applied 10% retention package; issued EDR ticket"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "11.5px", fontWeight: "700", color: "#0284c7", background: "rgba(14, 165, 233, 0.08)", padding: "3px 8px", borderRadius: "6px" }}>
                        #EDR-8821
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="rep-status-chip" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                        <span className="rep-status-dot" style={{ background: "#059669" }}></span>
                        {isVi ? "Đã Giải Quyết" : "Resolved"}
                      </span>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                      10:30
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.1)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                          DT
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13.5px" }}>Delta Trading Ltd</div>
                          <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>Phân Phối Độc Quyền</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--text-1)" }}>
                        {isVi ? "Nguy cơ rời bỏ dòng Sản phẩm B (-44%)" : "Churn risk on Product line B (-44%)"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                        {isVi ? "Tài khoản đối tác thương mại 2.9 Tỷ VND" : "2.9B VND commercial distribution account"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.4 }}>
                        {isVi
                          ? "Rà soát điều khoản thỏa thuận độc quyền; gửi thư mời làm việc trực tiếp với Giám đốc Mua hàng"
                          : "Audited exclusivity agreement clauses; scheduled direct sync with Procurement Director"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "11.5px", fontWeight: "700", color: "#0284c7", background: "rgba(14, 165, 233, 0.08)", padding: "3px 8px", borderRadius: "6px" }}>
                        #EDR-8825
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="rep-status-chip" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#d97706" }}>
                        <span className="rep-status-dot" style={{ background: "#d97706" }}></span>
                        {isVi ? "Đang Theo Dõi" : "In Progress"}
                      </span>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                      11:15
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(6, 182, 212, 0.1)", color: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                          VP
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13.5px" }}>Tập đoàn Dược Phẩm V</div>
                          <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>Dược Phẩm & Y Tế</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--text-1)" }}>
                        {isVi ? "Phát hành báo giá gói mở rộng Cloud" : "Issued Cloud enterprise expansion quote"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                        {isVi ? "Nâng cấp hạ tầng bảo mật dữ liệu GxP" : "GxP compliant data infrastructure"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.4 }}>
                        {isVi
                          ? "Lập bảng báo giá chính thức 450 triệu VND gửi qua email chính thức kèm chứng thư số"
                          : "Dispatched official 450M VND quotation via verified secure email with digital certificate"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "11.5px", fontWeight: "700", color: "#0284c7", background: "rgba(14, 165, 233, 0.08)", padding: "3px 8px", borderRadius: "6px" }}>
                        #BG-2026-09
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="rep-status-chip" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563eb" }}>
                        <span className="rep-status-dot" style={{ background: "#2563eb" }}></span>
                        {isVi ? "Đã Gửi Báo Giá" : "Dispatched"}
                      </span>
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                      14:00
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                          SM
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13.5px" }}>Logistics Sao Mai</div>
                          <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>Đối tác Vận tải</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--text-1)" }}>
                        {isVi ? "Tháo gỡ vướng mắc thanh toán công nợ 45 ngày" : "Negotiated 45-day credit terms annex"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                        {isVi ? "Đối soát công nợ & bổ sung cam kết bảo lãnh" : "Receivables reconciliation & bank guarantee"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.4 }}>
                        {isVi
                          ? "Hoàn thiện phụ lục bổ sung cam kết bảo lãnh ngân hàng, hoàn tất ký nháy giữa hai bên"
                          : "Finalized annex with bank guarantee commitment, completed preliminary signatures"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "11.5px", fontWeight: "700", color: "#0284c7", background: "rgba(14, 165, 233, 0.08)", padding: "3px 8px", borderRadius: "6px" }}>
                        #PL-2026-44
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="rep-status-chip" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                        <span className="rep-status-dot" style={{ background: "#059669" }}></span>
                        {isVi ? "Hoàn Tất Ký" : "Completed"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. OFFICIAL DOSSIER REPORT DOCUMENT */}
          <div className="rep-doc-dossier">
            <div className="rep-doc-stripe"></div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="fa-solid fa-building-circle-check"></i>
                  GRAPH MIND · KHỐI KINH DOANH & PHÁT TRIỂN DOANH NGHIỆP
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-1)", margin: "4px 0 2px 0", letterSpacing: "-0.01em" }}>
                  {isVi ? "Văn Bản Báo Cáo Tác Nghiệp Ca Làm Việc — Ngày 20/09/2026" : "Sales Operations Shift Dossier — 20 Sep 2026"}
                </h2>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                  {isVi ? "Người lập:" : "Reporter:"} <b style={{ color: "var(--text-1)" }}>Nguyễn V. Nam (Chuyên viên Kinh doanh)</b> · {isVi ? "Quản lý:" : "Supervisor:"} <b style={{ color: "var(--text-1)" }}>Trần M. Anh (Trưởng phòng)</b> · {isVi ? "Cập nhật:" : "Synthesized:"} {generatedDate}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--text-4)", background: "var(--surface-2)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  DOC-ID: #GM-EOD-2026-0920
                </span>
              </div>
            </div>

            {/* Section I */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <i className="fa-solid fa-circle-check"></i>
                I. {isVi ? "TỔNG QUAN KẾT QUẢ CÔNG VIỆC TRONG CA" : "SHIFT PERFORMANCE SUMMARY"}
              </div>
              <div style={{ background: "var(--surface-2)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--border-soft)", fontSize: "13.5px", lineHeight: "1.65", color: "var(--text-1)" }}>
                {isVi
                  ? "Trong ca làm việc hôm nay, chuyên viên đã theo dõi sát sao 42 tài khoản doanh nghiệp phụ trách. Tiếp nhận và xử lý dứt điểm 4 ca cảnh báo rủi ro sụt giảm đơn hàng, đạt 100% cam kết thời gian phản hồi SLA. Đặc biệt đã thành công kích hoạt giải pháp đàm phán thông minh qua AI Copilot để giữ chân tài khoản ABC Corporation (1.2 tỷ VND) và kiểm soát rủi ro phân phối tại Delta Trading Ltd (2.9 tỷ VND)."
                  : "During today's operational shift, the specialist monitored 42 assigned enterprise accounts. Handled and resolved 4 high-priority churn alerts with a 100% SLA compliance rate. Successfully engaged AI Copilot to formulate a retention package for ABC Corporation ($1.2B VND) and mitigated distribution channel risks for Delta Trading ($2.9B VND)."}
              </div>
            </div>

            {/* Section II */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <i className="fa-solid fa-lightbulb"></i>
                II. {isVi ? "ĐỀ XUẤT & KIẾN NGHỊ GỬI TRƯỞNG PHÒNG TRẦN M. ANH" : "ESCALATIONS & RECOMMENDATIONS"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", shrink: 0, marginTop: "2px" }}>
                    1
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.55", color: "var(--text-1)" }}>
                    <b style={{ color: "#2563eb" }}>{isVi ? "Cấp hạn mức duyệt chiết khấu nhanh (10% - 12%):" : "Fast-Track Discount Authorization (10% - 12%):"}</b>{" "}
                    {isVi
                      ? "Đề xuất Trưởng phòng xem xét cấp thẩm quyền áp dụng mức chiết khấu 10% - 12% trực tiếp trong hợp đồng gia hạn CT-2026-18 nếu khách hàng ABC Corp cam kết kỳ hạn 24 tháng trước ngày 30/09."
                      : "Request managerial pre-approval for a 10%-12% volume rebate on CT-2026-18 if ABC Corp commits to a 24-month contract before Sep 30."}
                  </div>
                </div>

                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", shrink: 0, marginTop: "2px" }}>
                    2
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.55", color: "var(--text-1)" }}>
                    <b style={{ color: "#2563eb" }}>{isVi ? "Đôn đốc Pháp chế phê duyệt bảo lãnh thanh toán:" : "Expedite Legal Review on Credit Guarantee:"}</b>{" "}
                    {isVi
                      ? "Nhờ Trưởng phòng đôn đốc bộ phận Pháp chế phê duyệt phụ lục bảo lãnh thanh toán của Logistics Sao Mai trong sáng mai để hoàn tất ký kết."
                      : "Prompt Legal department to expedite approval on Logistics Sao Mai's credit guarantee annex tomorrow morning."}
                  </div>
                </div>
              </div>
            </div>

            {/* Section III */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <i className="fa-solid fa-calendar-check"></i>
                III. {isVi ? "KẾ HOẠCH TÁC NGHIỆP CA TIẾP THEO" : "UPCOMING SHIFT ACTION PLAN"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-soft)", fontSize: "12.5px" }}>
                  <b style={{ color: "#2563eb" }}>09:00:</b> {isVi ? "Gọi điện xác nhận lịch họp với GĐ Mua hàng ABC Corp." : "Confirm meeting schedule with Procurement Director at ABC Corp."}
                </div>
                <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-soft)", fontSize: "12.5px" }}>
                  <b style={{ color: "#2563eb" }}>11:00:</b> {isVi ? "Hoàn tất hợp đồng điện tử đã ký nháy cho Logistics Sao Mai." : "Execute countersigned digital contract for Logistics Sao Mai."}
                </div>
                <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-soft)", fontSize: "12.5px" }}>
                  <b style={{ color: "#2563eb" }}>14:30:</b> {isVi ? "Rà soát 5 hợp đồng đối tác sẽ hết hạn trong Quý 4/2026." : "Audit 5 enterprise partner contracts maturing in Q4 2026."}
                </div>
              </div>
            </div>

            {/* Section IV: Manager Sign-off Certificate Box */}
            <div className="rep-sign-box">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
                  TA
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-1)" }}>
                      {isVi ? "Trần M. Anh · Trưởng Phòng Quản Lý" : "Tran M. Anh · Department Head"}
                    </span>
                    <span className="rep-status-chip" style={{ background: managerApproved ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.1)", color: managerApproved ? "#059669" : "#2563eb" }}>
                      <i className={`fa-solid ${managerApproved ? "fa-certificate" : "fa-signature"}`}></i>
                      {managerApproved ? (isVi ? "ĐÃ PHÊ DUYỆT & KÝ SỐ" : "VERIFIED & SIGNED") : (isVi ? "SẴN SÀNG TIẾP NHẬN" : "READY FOR REVIEW")}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0 0", lineHeight: 1.45, maxWidth: "680px" }}>
                    {managerApproved
                      ? (isVi
                        ? "“Đã xem và phê duyệt toàn bộ báo cáo ca của Chuyên viên Nam. Đánh giá cao tốc độ phản hồi case ABC Corp. Đồng ý chủ trương chiết khấu 10% kèm cam kết hợp đồng 24 tháng.”"
                        : "“Reviewed and verified Nam's shift report. Commendable response speed on ABC Corp account. Approved 10% discount policy for 24-month contract renewal.”")
                      : (isVi
                        ? "“Nhấn nút 'Trình Duyệt Ngay' bên phải để hoàn tất gửi báo cáo ca lên hệ thống đánh giá KPI của Trưởng phòng.”"
                        : "“Click 'Submit Now' on the right to transmit your shift dossier for formal managerial sign-off.”")}
                  </p>
                  <div style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)", marginTop: "4px" }}>
                    Mã xác thực số: SHA256: 7f89b2c...a889 · Khối phê duyệt nội bộ
                  </div>
                </div>
              </div>

              {!managerApproved && (
                <button
                  onClick={handleSubmitToManager}
                  className="rep-btn primary-gradient"
                  style={{ padding: "10px 20px" }}
                >
                  <i className="fa-solid fa-signature"></i>
                  <span>{isVi ? "Trình Duyệt Ngay" : "Submit Now"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER FOR EXECUTIVE / C-LEVEL / IT ADMIN (STRATEGIC REPORT)
  // ----------------------------------------------------------------------
  return (
    <section className="view active text-on-surface flex flex-col gap-space-md" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px 20px" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce" style={{ backdropFilter: "blur(8px)" }}>
          <i className="fa-solid fa-newspaper text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="section-label">{t.reports_title || (isVi ? "Báo cáo Lãnh đạo & Tóm lược Chiến lược" : "Executive Reports & Strategic Briefings")}</div>
          <div className="section-sub">{t.reports_sub || (isVi ? "Tự động tổng hợp thông tin kinh doanh, tín hiệu rủi ro và khuyến nghị hành động" : "Automated executive synthesis, multi-hop risk correlation, and strategic decision briefs")}</div>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={() => onNavigate("copilot")}
            className="btn sm"
          >
            {isVi ? "Mở Trợ lý Copilot" : "Open Copilot"}
          </button>
          <button
            onClick={handleGenerateBriefing}
            disabled={isGenerating}
            className="btn primary sm"
          >
            {isGenerating ? (isVi ? "Đang tổng hợp..." : "Synthesizing...") : (isVi ? "Tái tạo Báo cáo" : "Generate Briefing")}
          </button>
        </div>
      </div>

      {/* REPORT CONFIGURATION PANEL */}
      <div className="report-config grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
        <div className="cfg-box flex flex-col gap-space-2xs">
          <label className="font-label-caps text-label-caps text-outline uppercase font-bold">{isVi ? "KHUNG THỜI GIAN" : "TIME RANGE"}</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-surface-container text-on-surface p-space-xs rounded-DEFAULT border border-outline-variant/30 text-body-sm"
          >
            <option value="7D">{isVi ? "7 ngày qua (Tuần này)" : "Last 7 days"}</option>
            <option value="30D">{isVi ? "30 ngày qua (Tháng này)" : "Last 30 days"}</option>
            <option value="90D">{isVi ? "Quý gần nhất (Q3 2026)" : "Last quarter (Q3 2026)"}</option>
            <option value="12M">{isVi ? "Năm 2026 (Lũy kế YTD)" : "Full Year 2026 (YTD)"}</option>
          </select>
        </div>

        <div className="cfg-box flex flex-col gap-space-2xs">
          <label className="font-label-caps text-label-caps text-outline uppercase font-bold">{isVi ? "PHẠM VI DOANH NGHIỆP" : "BUSINESS AREAS"}</label>
          <select className="bg-surface-container text-on-surface p-space-xs rounded-DEFAULT border border-outline-variant/30 text-body-sm">
            <option>{isVi ? "Toàn diện (Sales, Finance, Ops, Legal)" : "Full Spectrum (Sales, Finance, Ops)"}</option>
            <option>{isVi ? "Kinh doanh & Khách hàng" : "Sales & Customer Accounts"}</option>
            <option>{isVi ? "Tài chính & Dòng tiền" : "Financial Cadence & AR"}</option>
          </select>
        </div>

        <div className="cfg-box flex flex-col gap-space-2xs">
          <label className="font-label-caps text-label-caps text-outline uppercase font-bold">{isVi ? "MỨC ĐỘ CHI TIẾT" : "REASONING DEPTH"}</label>
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="bg-surface-container text-on-surface p-space-xs rounded-DEFAULT border border-outline-variant/30 text-body-sm"
          >
            <option value="comprehensive">{isVi ? "Toàn diện (L5 Bằng chứng & Đồ thị)" : "Comprehensive (L5 Evidence & Graph)"}</option>
            <option value="summary">{isVi ? "Tóm lược Ban Điều hành" : "Executive Summary Only"}</option>
            <option value="risk_focus">{isVi ? "Tập trung Rủi ro & Khẩn cấp" : "High Risk Focus"}</option>
          </select>
        </div>

        <div className="cfg-box flex flex-col gap-space-2xs">
          <label className="font-label-caps text-label-caps text-outline uppercase font-bold">{isVi ? "TIÊU CHUẨN XÁC THỰC" : "VERIFICATION TARGET"}</label>
          <select className="bg-surface-container text-on-surface p-space-xs rounded-DEFAULT border border-outline-variant/30 text-body-sm">
            <option>{isVi ? "Chỉ nguồn đã xác thực (Human Verified)" : "Human Verified Only"}</option>
            <option>{isVi ? "Bao gồm trích xuất AI (Confidence > 80%)" : "AI Extracted (Confidence > 80%)"}</option>
          </select>
        </div>
      </div>

      {/* ACTION TOOLBAR & METADATA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-high/40 px-space-md py-space-xs rounded-DEFAULT border border-outline-variant/20">
        <span className="text-body-sm text-outline">
          {isVi ? "Bản thảo sẵn sàng · Tổng hợp từ 247 nguồn, 6 loại thực thể đồ thị" : "Draft ready · Synthesized across 247 sources, 6 knowledge entity classes"}
        </span>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={handleCopySummary}
            className="btn sm"
            title="Sao chép tóm tắt điều hành"
          >
            {isVi ? "Sao chép Tóm tắt" : "Copy Summary"}
          </button>
          <button
            onClick={() => showToast(isVi ? "Đang xuất tài liệu Word (.docx) chuẩn ban giám đốc..." : "Exporting Board-Ready Word Document...")}
            className="btn sm"
          >
            {isVi ? "Xuất Word" : "Export Word"}
          </button>
          <button
            onClick={() => showToast(isVi ? "Đang tạo bản PDF in chất lượng cao..." : "Exporting High-Resolution PDF Briefing...")}
            className="btn primary sm"
          >
            {isVi ? "Xuất PDF" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* BOARD-READY REPORT DOCUMENT PREVIEW */}
      <div className="doc-preview bg-surface-container-low p-space-xl rounded-lg border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-primary font-bold">
              AEGIS ENTERPRISE INTELLIGENCE OBSERVATORY
            </span>
            <span className="font-code-sm text-code-sm text-outline">
              DOC-ID: #EKMP-REP-2026-Q3
            </span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mt-space-2xs">
            {isVi ? "Báo cáo Tóm lược Chiến lược — Tháng 09/2026" : "Executive Strategic Briefing — September 2026"}
          </h2>
          <div className="doc-date text-caption text-outline mt-space-2xs">
            {isVi ? "Tạo lúc:" : "Synthesized:"} {generatedDate} · Model: Hybrid GraphRAG · <b className="text-green-500">89.4% average confidence score</b>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-space-xs">
            1. {isVi ? "TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)" : "EXECUTIVE SUMMARY"}
          </h3>
          <p className="text-body-sm leading-relaxed text-on-surface">
            {isVi
              ? "Doanh thu toàn hệ thống tăng trưởng 6,2% trong 30 ngày qua, đạt 48,6 triệu USD (khoảng 1.150 tỷ VND). Tuy nhiên, khối lượng đơn hàng sụt giảm 3,1%, nguyên nhân chính xuất phát từ sự suy yếu đáng kể tại 2 khách hàng nhóm Tier-1 (Tập đoàn ABC và Công ty Thương mại Delta). Mức độ phơi nhiễm hợp đồng sắp hết hạn (1,2 tỷ VND trong 12 ngày) và công nợ quá hạn 60 ngày tăng 11,4% đòi hỏi sự can thiệp chiến lược ngay trong chu kỳ hiện tại."
              : "Enterprise monitored valuation grew 6.2% over trailing 30 days to $48.6M. However, total order cadence declined 3.1%, driven primarily by softened purchase frequency in two top-quartile accounts (ABC Corporation and Delta Trading). Contract expiration exposure ($1.2M within 12 days) and receivables aging past 60 days (+11.4%) warrant immediate executive intervention."}
          </p>
        </div>

        {/* 2. CUSTOMER SIGNALS */}
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-space-xs">
            2. {isVi ? "TÍN HIỆU RỜI BỎ KHÁCH HÀNG & BIẾN ĐỘNG ĐỐI TÁC" : "CUSTOMER RETENTION & CHURN SIGNALS"}
          </h3>
          <ul className="list-disc list-inside text-body-sm leading-relaxed text-on-surface-variant flex flex-col gap-space-2xs">
            <li>
              <b>ABC Corporation:</b> {isVi ? "Tần suất đặt hàng giảm từ 8,0/tháng xuống 5,4/tháng (-32% trong 60 ngày). Mô hình đồ thị xác nhận đây là chỉ báo rời bỏ trước mắt đối với tài khoản 6,4 tỷ VND." : "Order cadence dropped from 8.0/mo to 5.4/mo (-32% over 60 days). Graph model confirms high churn probability for this 6.4B VND lifetime account."}
            </li>
            <li>
              <b>Delta Trading Ltd:</b> {isVi ? "Nhịp độ đặt hàng Sản phẩm B giảm 44% kể từ tháng 7. Cần rà soát lại thỏa thuận phân phối độc quyền." : "Product B order cadence fell 44% since July. Exclusive distribution terms require commercial renegotiation."}
            </li>
          </ul>
        </div>

        {/* 3. CONTRACT & FINANCIAL EXPOSURE */}
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-space-xs">
            3. {isVi ? "PHƠI NHIỄM HỢP ĐỒNG & CÔNG NỢ" : "CONTRACT RENEWAL & FINANCIAL EXPOSURE"}
          </h3>
          <div className="overflow-x-auto my-space-xs">
            <table className="w-full text-left text-body-sm border border-outline-variant/20">
              <thead className="bg-surface-container text-outline font-label-caps text-label-caps">
                <tr>
                  <th className="p-2">{isVi ? "Hợp đồng / Danh mục" : "Contract / Category"}</th>
                  <th className="p-2">{isVi ? "Thực thể đối ứng" : "Counterparty"}</th>
                  <th className="p-2">{isVi ? "Giá trị" : "Exposure Value"}</th>
                  <th className="p-2">{isVi ? "Thời hạn" : "Deadline"}</th>
                  <th className="p-2">{isVi ? "Trạng thái rủi ro" : "Risk Level"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-2 font-mono font-semibold">CT-2026-18</td>
                  <td className="p-2">ABC Corporation</td>
                  <td className="p-2 font-semibold text-primary">1.2B VND</td>
                  <td className="p-2 text-error font-bold">18/10/2026 (12d)</td>
                  <td className="p-2"><span className="pill red uppercase text-[10px] font-bold">HIGH</span></td>
                </tr>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-2 font-mono font-semibold">CT-2026-24</td>
                  <td className="p-2">Delta Trading Ltd</td>
                  <td className="p-2 font-semibold text-primary">2.9B VND</td>
                  <td className="p-2">24/10/2026 (18d)</td>
                  <td className="p-2"><span className="pill amber uppercase text-[10px] font-bold">MED</span></td>
                </tr>
                <tr>
                  <td className="p-2 font-mono font-semibold">AR Receivables &gt;60d</td>
                  <td className="p-2">Finance Department</td>
                  <td className="p-2 font-semibold text-error">8.6B VND</td>
                  <td className="p-2">End of Month</td>
                  <td className="p-2"><span className="pill amber uppercase text-[10px] font-bold">ELEVATED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. RECOMMENDED EXECUTIVE ACTIONS */}
        <div className="bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
          <h3 className="text-sm font-bold text-tertiary uppercase tracking-wider mb-space-xs">
            4. {isVi ? "HÀNH ĐỘNG CHIẾN LƯỢC ĐỀ XUẤT (RECOMMENDED ACTIONS)" : "RECOMMENDED EXECUTIVE ACTIONS"}
          </h3>
          <div className="flex flex-col gap-space-xs text-body-sm">
            <div className="flex items-start gap-space-xs">
              <i className="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5"></i>
              <span>
                <b>{isVi ? "Ưu tiên 1:" : "Priority 1:"}</b> {isVi ? "Chỉ đạo Giám đốc Kinh doanh tiếp xúc trực tiếp Giám đốc Mua hàng Trần M. Anh (ABC Corp) trong vòng 7 ngày kèm đề xuất gia hạn CT-2026-18 với chiết khấu 10%." : "Direct Sales VP to schedule in-person renewal review with Procurement Director Tran M. Anh (ABC Corp) within 7 days offering a 10% retention package."}
              </span>
            </div>
            <div className="flex items-start gap-space-xs">
              <i className="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5"></i>
              <span>
                <b>{isVi ? "Ưu tiên 2:" : "Priority 2:"}</b> {isVi ? "Kích hoạt đối soát công nợ 5 khách hàng có khoản chậm trả trên 60 ngày theo quy trình SOP-04 của Phòng Tài chính." : "Trigger accounts receivable reconciliation for top 5 delinquent customer accounts per SOP-04."}
              </span>
            </div>
            <div className="flex items-start gap-space-xs">
              <i className="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5"></i>
              <span>
                <b>{isVi ? "Ưu tiên 3:" : "Priority 3:"}</b> {isVi ? "Hoàn tất xác thực con người (HITL) cho 12 tài liệu quy trình thiếu phòng ban chủ quản trong tuần này." : "Complete human-in-the-loop verification for 12 pending SOP documents lacking department ownership."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
