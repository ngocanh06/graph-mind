import React, { useState } from "react";

export default function ReportsView({ onNavigate, t, lang }) {
  const isVi = lang === "vi";
  const [timeRange, setTimeRange] = useState("30D");
  const [depth, setDepth] = useState("comprehensive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDate, setGeneratedDate] = useState("15 Sep 2026, 10:00");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleGenerateBriefing = () => {
    setIsGenerating(true);
    showToast(isVi ? "Đang tổng hợp dữ liệu từ 247 nguồn tri thức qua Hybrid GraphRAG..." : "Synthesizing 247 knowledge sources via Hybrid GraphRAG...");
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedDate(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
      showToast(isVi ? "Báo cáo Lãnh đạo đã được tạo thành công!" : "Executive Briefing synthesized and ready for review!");
    }, 1200);
  };

  const handleCopySummary = () => {
    const text = isVi
      ? "BÁO CÁO LÃNH ĐẠO GRAPH MIND - TỔNG HỢP CHIẾN LƯỢC:\nDoanh thu tăng 6.2% trong 30 ngày qua nhưng tần suất đơn hàng giảm 3.1% ở 2 khách hàng VIP (ABC Corp -32%, Delta Trading -44%). Cần đàm phán gia hạn hợp đồng CT-2026-18 (hết hạn 18/10) và xử lý 8.6 tỷ VND công nợ quá hạn."
      : "GRAPH MIND EXECUTIVE BRIEFING:\nRevenue grew 6.2% over trailing 30 days while order cadence declined 3.1% in top accounts (ABC Corp -32%, Delta Trading -44%). Urgent contract renewal required for CT-2026-18 (expires 18 Oct) and reconciliation of 8.6B VND aged receivables.";
    navigator.clipboard?.writeText(text);
    showToast(isVi ? "Đã sao chép tóm tắt điều hành vào bộ nhớ tạm!" : "Executive summary copied to clipboard!");
  };

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
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
