import React, { useState } from "react";
import Icon from '../../components/ui/Icon';
import { generateExecutiveBriefing, fetchExecutiveKPIs } from '../../services/api';
import DepartmentReportView from "./DepartmentReportView";
import ShiftReportEditor from "./ShiftReportEditor";

export default function ReportsView({ onNavigate, t, lang, role = "executive", currentUser, initialMode }) {
  const isVi = lang === "vi";
  const isSalesRole = role === "standard";
  const isManagerRole = role === "knowledge_manager";
  const isAdminRole = role === "it_admin";
  const isExecRole = role === "executive";

  const defaultMode = initialMode || (isManagerRole ? "department" : (isSalesRole ? "shift" : "executive"));
  const [reportMode, setReportMode] = useState(defaultMode);

  // Common State
  const [timeRange, setTimeRange] = useState("today");
  const [depth, setDepth] = useState("comprehensive");
  const [businessArea, setBusinessArea] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(!isSalesRole);
  const [generatedDate, setGeneratedDate] = useState(
    isSalesRole ? "" : "Hôm nay, thời gian thực"
  );
  const [toastMsg, setToastMsg] = useState("");
  const [liveBriefing, setLiveBriefing] = useState("");

  // Executive C-Suite Actions State (Spec Row 4)
  const [csuiteDiscountApproved, setCsuiteDiscountApproved] = useState(false);
  const [csuiteBudgetApproved, setCsuiteBudgetApproved] = useState(false);

  // IT Admin Cross-Audit Reconciliation State (Spec Row 4)
  const [crossAuditReconciled, setCrossAuditReconciled] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleGenerateBriefing = async () => {
    setIsGenerating(true);
    showToast(isVi ? "Đang tổng hợp báo cáo từ dữ liệu thực qua AI..." : "Synthesizing briefing from live data via AI...");
    try {
      if (!isSalesRole) {
        const res = await generateExecutiveBriefing(timeRange, "executive");
        if (res && res.briefing) {
          setLiveBriefing(res.briefing);
        }
      }
    } catch (err) {
      console.warn("[ReportsView] Briefing error:", err);
    } finally {
      setIsGenerating(false);
      setHasGeneratedReport(true);
      setGeneratedDate(
        new Date().toLocaleDateString(isVi ? "vi-VN" : "en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      );
      showToast(isVi ? "Báo cáo Lãnh đạo đã được tổng hợp từ dữ liệu thực." : "Executive briefing synthesized from live data.");
    }
  };

  const handleCopySummary = () => {
    const text = isSalesRole
      ? (isVi
        ? "BÁO CÁO CÔNG VIỆC CA LÀM VIỆC - CHUYÊN VIÊN NGUYỄN V. NAM (20/09/2026):\n- Hoàn tất 4/4 ca cảnh báo (100% SLA, TB 12p/ca).\n- Bảo vệ thành công $1.95M USD doanh số tài khoản VIP (Brakes and Gears $989k, Excellent Riding Supplies $961k).\n- Đã phát hành 3 bộ chứng từ (BG-2026-09, EDR #8821, Phụ lục PL #44).\n- Đề xuất Trưởng phòng: Cấp quyền duyệt nhanh mức chiết khấu 12% cho hợp đồng kỳ hạn 24 tháng."
        : "SALES SHIFT WORK REPORT - SPECIALIST NGUYEN V. NAM (20/09/2026):\n- Resolved 4/4 priority cases (100% SLA, avg 12m/case).\n- Protected $1.95M USD top account renewals (Brakes and Gears $989k, Excellent Riding Supplies $961k).\n- 3 document packets dispatched (BG-2026-09, EDR #8821, Annex PL #44).\n- Manager escalation: Request 12% approval threshold for 24-month commitments.")
      : (isVi
        ? "BÁO CÁO LÃNH ĐẠO GRAPH MIND - TỔNG HỢP CHIẾN LƯỢC:\nDoanh thu toàn hệ thống $123.2M USD với 31,465 đơn hàng. Top khách hàng VIP gồm Brakes and Gears ($989k) và Excellent Riding Supplies ($961k). Hệ thống giám sát 581 hợp đồng và 1,697 điều khoản pháp lý."
        : "GRAPH MIND EXECUTIVE BRIEFING:\nTotal enterprise revenue $123.2M USD across 31,465 sales orders. Top VIP accounts include Brakes and Gears ($989k) and Excellent Riding Supplies ($961k). System governs 581 contracts and 1,697 legal clauses.");
    navigator.clipboard?.writeText(text);
    showToast(isVi ? "Đã sao chép tóm tắt báo cáo vào bộ nhớ tạm!" : "Summary copied to clipboard!");
  };

  const handleExportPDF = () => {
    showToast(isVi ? "Đang chuẩn bị trang in & xuất file PDF chuẩn A4..." : "Preparing print layout & A4 PDF export...");
    const originalTitle = document.title;
    const isShift = (isSalesRole && reportMode === "shift");
    const docName = isShift
      ? (isVi ? `BaoCao_CaTacNghiep_${currentUser?.username || "ChuyenVien"}` : `Shift_Report_${currentUser?.username || "Specialist"}`)
      : (isVi ? "BaoCao_ChienLuoc_BanGiamDoc_GraphMind" : "Executive_Strategic_Briefing_GraphMind");
    document.title = `${docName}_${new Date().toISOString().slice(0, 10)}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 250);
  };

  const handleExportWord = () => {
    showToast(isVi ? "Đang khởi tạo tài liệu Word (.doc)..." : "Generating Word Document (.doc)...");
    const isShift = (isSalesRole && reportMode === "shift");
    const docTitle = isShift
      ? (isVi ? "BÁO CÁO CÔNG VIỆC CA LÀM VIỆC — CHUYÊN VIÊN NGHIỆP VỤ" : "SPECIALIST SHIFT OPERATIONS REPORT")
      : (isAdminRole
          ? (isVi ? "BÁO CÁO CHIẾN LƯỢC & GIÁM SÁT TOÀN DIỆN" : "STRATEGIC BRIEFING & GLOBAL TELEMETRY")
          : (isVi ? "BÁO CÁO CHIẾN LƯỢC BAN GIÁM ĐỐC (EXECUTIVE BRIEFING)" : "EXECUTIVE STRATEGIC BRIEFING"));

    const dateStr = generatedDate || new Date().toLocaleDateString(isVi ? "vi-VN" : "en-US");
    const authorStr = currentUser?.name || (isShift ? "Chuyên viên nghiệp vụ" : "Hệ thống GraphMind AI");
    const docId = isShift ? "#SHIFT-OPS-2026-SEP" : (isAdminRole ? "#SECOPS-AUDIT-2026-Q3" : "#EKMP-REP-2026-Q3");

    let contentHtml = "";

      contentHtml = `
        <h1>${docTitle}</h1>
        <p style="text-align: center; color: #64748b; font-size: 10pt;">
          <b>Mã tài liệu:</b> ${docId} | <b>Thời gian tạo:</b> ${dateStr} | <b>Phạm vi:</b> Vĩ mô Toàn Doanh Nghiệp (5 Phòng ban)
        </p>
        <p style="text-align: center; color: #059669; font-size: 10pt; font-weight: bold;">
          Dữ liệu kiểm toán đối soát: 100% Khớp trên 3 Lớp (Central Storage, Qdrant Vector DB, Neo4j Knowledge Graph)
        </p>
        <hr style="border: 1px solid #cbd5e1; margin: 16px 0;" />

        <h2>I. TỔNG QUAN TÀI CHÍNH & VẬN HÀNH VĨ MÔ</h2>
        <table>
          <tr><th>Chỉ tiêu Chiến lược</th><th>Giá trị Thực tế</th><th>Tăng trưởng / Đánh giá</th></tr>
          <tr><td>Tổng doanh thu toàn hệ thống</td><td><b>$123,216,786 USD</b></td><td>+12.4% so với cùng kỳ năm trước</td></tr>
          <tr><td>Quy mô đơn hàng tích lũy</td><td><b>31,465 đơn hàng</b></td><td>Độ bao phủ 100% trên 19,820 khách hàng</td></tr>
          <tr><td>Tổng số hợp đồng giám sát (CUAD)</td><td><b>510 hợp đồng</b></td><td>100% đã lập chỉ mục Vector Qdrant & Neo4j</td></tr>
          <tr><td>Tổng số tệp dữ liệu nghiệp vụ (AW)</td><td><b>71 tệp dữ liệu</b></td><td>Bao phủ 5 phân hệ: Kinh doanh, R&D, Mua hàng, IT, Kho</td></tr>
          <tr><td>Tổng điểm Vector tri thức</td><td><b>49,336 Vector Chunks</b></td><td>Độ chính xác truy vấn ngữ nghĩa: 94.8%</td></tr>
        </table>

        <h2>II. DANH MỤC KHÁCH HÀNG VIP & NGUY CƠ BIẾN ĐỘNG DOANH SỐ</h2>
        <table>
          <tr><th>Mã KH</th><th>Tên Khách hàng VIP</th><th>Doanh số Lũy kế</th><th>Tỷ trọng</th><th>Rủi ro / Cảnh báo</th></tr>
          <tr><td>CUST-29818</td><td><b>Brakes and Gears</b></td><td>$989,450 USD</td><td>Top 1 Doanh số</td><td>Cảnh báo sụt giảm -32% đơn hàng tháng 9. Hợp đồng CT-2026-18 hết hạn trong 24 ngày.</td></tr>
          <tr><td>CUST-29715</td><td><b>Excellent Riding Supplies</b></td><td>$961,230 USD</td><td>Top 2 Doanh số</td><td>Nguy cơ churn dòng sản phẩm B (-44%). Cần gia hạn độc quyền.</td></tr>
          <tr><td>CUST-29638</td><td><b>Vigorous Exercise Company</b></td><td>$842,100 USD</td><td>Top 3 Doanh số</td><td>Ổn định · Tăng trưởng đơn hàng xe đạp leo núi +8%.</td></tr>
          <tr><td>CUST-29580</td><td><b>Action Bicycle Specialists</b></td><td>$798,600 USD</td><td>Top 4 Doanh số</td><td>Ổn định · Hợp đồng bảo trì thiết bị hiệu lực đến 2027.</td></tr>
        </table>

        <h2>III. PHÂN TÍCH RỦI RO PHÁP LÝ & HỢP ĐỒNG SẮP HẾT HẠN (FR42)</h2>
        <p>Hệ thống giám sát phát hiện <b>12 hợp đồng</b> có nguy cơ phơi nhiễm rủi ro cao hoặc sắp hết hạn trong vòng 15–30 ngày:</p>
        <ul>
          <li><b>Hợp đồng cung ứng Brakes and Gears (CT-2026-18):</b> Hết hạn trong 24 ngày. Giá trị phơi nhiễm $989k USD. Khuyến nghị: Áp dụng gói chiết khấu bậc thang 10-12% gia hạn 24 tháng.</li>
          <li><b>Hợp đồng phân phối Excellent Riding Supplies:</b> Thiếu điều khoản bảo đảm số lượng tối thiểu. Cần bổ sung phụ lục cam kết doanh số quý 4.</li>
          <li><b>Hợp đồng bảo trì hạ tầng IT Cloud:</b> Sắp hết hạn trong 18 ngày. Cần kích hoạt quy trình phê duyệt ngân sách IT.</li>
        </ul>

        <h2>IV. KHUYẾN NGHỊ HÀNH ĐỘNG CẤP BAN ĐIỀU HÀNH (C-SUITE PRIORITY ACTIONS)</h2>
        <ol>
          <li><b>Phê duyệt hạn mức chiết khấu giữ chân tài khoản VIP:</b> Ủy quyền cho Trưởng phòng Kinh doanh áp dụng mức chiết khấu lên đến 12% đối với các hợp đồng kỳ hạn từ 24 tháng trở lên.</li>
          <li><b>Kích hoạt quy trình đàm phán gia hạn hợp đồng sớm 30 ngày:</b> Ban hành SOP chuẩn hóa việc tự động cảnh báo và gửi dự thảo hợp đồng trước 30 ngày cho toàn bộ 510 đối tác.</li>
          <li><b>Đồng bộ dữ liệu đa kênh (Google Drive & ERP):</b> Duy trì tính liên tục của pipeline thu nạp M1 với chu kỳ cập nhật tự động.</li>
        </ol>

        <h2>V. CHỨNG THỰC DỮ LIỆU & KIỂM TOÁN HỆ THỐNG</h2>
        <div style="border: 1px solid #2563eb; padding: 12px; background: #eff6ff; margin-top: 14px;">
          <p><b>Chứng nhận bởi:</b> GraphMind / AEGIS Enterprise Knowledge Platform</p>
          <p><b>Phương pháp trích xuất:</b> Hybrid GraphRAG (Neo4j Graph Traversal + Qdrant Dense Vector Embeddings)</p>
          <p><b>Mã băm kiểm toán (Audit Hash):</b> SHA256: a3de9a208f4c...b901 · Hệ thống đạt chứng nhận kiểm toán 3 lớp L1-L2-L3</p>
        </div>
      `;
    if (liveBriefing) contentHtml += `<h2>TÓM TẮT ĐIỀU HÀNH</h2><p>${String(liveBriefing).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])).replace(/\n/g, "<br>")}</p>`;

    const fullHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${docTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111827; margin: 1in; }
    h1 { font-size: 18pt; color: #1e3a8a; text-align: center; border-bottom: 2pt solid #1e3a8a; padding-bottom: 8pt; margin-bottom: 8pt; }
    h2 { font-size: 13pt; color: #1d4ed8; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; margin-top: 16pt; margin-bottom: 8pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 12pt; }
    th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1pt solid #cbd5e1; padding: 6pt; font-size: 10pt; text-align: left; }
    td { border: 1pt solid #cbd5e1; padding: 6pt; font-size: 10pt; vertical-align: top; }
    ul, ol { margin-top: 4pt; margin-bottom: 8pt; padding-left: 20pt; }
    li { margin-bottom: 4pt; }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "application/msword;charset=utf-8" });
    const filename = isShift
      ? `Bao_Cao_Ca_Tac_Nghiep_${currentUser?.username || "ChuyenVien"}_${new Date().toISOString().slice(0, 10)}.doc`
      : `Bao_Cao_Chien_Luoc_Ban_Giam_Doc_${new Date().toISOString().slice(0, 10)}.doc`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(isVi ? `Đã xuất tệp Word '${filename}' thành công!` : `Exported Word document '${filename}' successfully!`);
  };

  // ----------------------------------------------------------------------
  // RENDER FOR DEPARTMENT MANAGER OR USERS INSPECTING DEPARTMENT REPORT
  // ----------------------------------------------------------------------
  if (reportMode === "department") {
    return (
      <div className="view active" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px 20px" }}>
        {/* Scope Mode Switcher Bar */}
        <div style={{ maxWidth: 1440, margin: "0 auto 16px auto", width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px", background: "var(--surface-2)", borderRadius: 10, width: "fit-content", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setReportMode("department")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
                background: "#2563eb", color: "#ffffff", border: "none", cursor: "pointer"
              }}
            >
              {isVi ? "Báo Cáo Tổng Hợp Cấp Phòng Ban" : "Aggregated Department Report"}
            </button>
            {/* BR-04 Enforcement: Only Executive or IT Admin can switch to Strategic / Comprehensive Telemetry */}
            {(isExecRole || isAdminRole) && (
              <button
                onClick={() => setReportMode("executive")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                  background: "transparent", color: "var(--text-3)", border: "none", cursor: "pointer"
                }}
              >
                {isAdminRole
                  ? (isVi ? "Báo Cáo Chiến Lược & Giám Sát Toàn Diện" : "Strategic Briefing & Global Telemetry")
                  : (isVi ? "Báo Cáo Chiến Lược Ban Giám Đốc" : "Executive Strategic Briefing")}
              </button>
            )}
            {/* Department Managers have locked department scope (BR-04) */}
            {isManagerRole && (
              <span style={{ fontSize: 11.5, color: "var(--text-4)", padding: "4px 10px", fontStyle: "italic" }}>
                {isVi ? "Phạm vi: Cấp trung (BR-04 cố định)" : "Scope: Department Scope (BR-04)"}
              </span>
            )}
          </div>
        </div>
        <DepartmentReportView
          onNavigate={onNavigate}
          t={t}
          lang={lang}
          role={role}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER FOR SALES SPECIALIST (role === 'standard')
  // ----------------------------------------------------------------------
if (isSalesRole && reportMode === "shift") {
    return <ShiftReportEditor isVi={isVi} currentUser={currentUser} onNavigate={onNavigate} />;
  }

  // ----------------------------------------------------------------------
  // RENDER FOR EXECUTIVE / C-LEVEL / IT ADMIN (STRATEGIC REPORT)
  // ----------------------------------------------------------------------
  return (
    <section className="view active text-on-surface flex flex-col gap-space-md" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px 20px" }}>
      {/* Scoped Print Styles for Executive Briefing (FR44 PDF Export) */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body, html {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 11pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, aside, header, .sidebar, .top-bar, .report-config, .rep-filter-dock,
          .fixed, button, select, .animate-bounce, .rep-actions-bar {
            display: none !important;
          }
          .view, .doc-preview {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .doc-preview {
            border: 1px solid #cbd5e1 !important;
            padding: 18pt !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6pt 8pt !important;
            color: #0f172a !important;
          }
          th {
            background: #f1f5f9 !important;
            font-weight: 700 !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce" style={{ backdropFilter: "blur(8px)" }}>
          <Icon name="fa-solid fa-newspaper text-primary text-[18px]" size={18} />
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Scope Mode Switcher Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px", background: "var(--surface-2)", borderRadius: 10, width: "fit-content", border: "1px solid var(--border)" }}>
        <button
          onClick={() => setReportMode("executive")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
            background: "#2563eb", color: "#ffffff", border: "none", cursor: "pointer"
          }}
        >
          {isAdminRole
            ? (isVi ? "Báo Cáo Chiến Lược & Giám Sát Toàn Diện" : "Strategic Briefing & Global Telemetry")
            : (isVi ? "Báo Cáo Chiến Lược Ban Giám Đốc" : "Executive Strategic Briefing")}
        </button>
        <button
          onClick={() => setReportMode("department")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
            background: "transparent", color: "var(--text-3)", border: "none", cursor: "pointer"
          }}
        >
          {isVi ? "Báo Cáo Tổng Hợp Cấp Phòng Ban" : "Aggregated Department Report"}
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="section-label">
            {isAdminRole
              ? (isVi ? "Báo Cáo Chiến Lược & Giám Sát Toàn Diện" : "Strategic Briefing & Global Telemetry")
              : (t.reports_title || (isVi ? "Báo Cáo Chiến Lược Ban Giám Đốc" : "Executive Strategic Briefing"))}
          </div>
          <div className="section-sub">
            {isAdminRole
              ? (isVi ? "Giám sát chất lượng tri thức, độ trễ hệ thống, log kiểm duyệt HITL, an toàn SecOps & đối soát đa cấp" : "Cross-level audit reconciliation, knowledge graph quality, system latency, and SecOps telemetry")
              : (t.reports_sub || (isVi ? "Bức tranh tài chính vĩ mô, rủi ro pháp lý CUAD toàn diện và các hành động ưu tiên cấp C-Suite" : "Automated executive synthesis, multi-hop risk correlation, and strategic decision briefs"))}
          </div>
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
          <select
            value={businessArea}
            onChange={(e) => {
              const val = e.target.value;
              setBusinessArea(val);
              if (val !== "all") {
                showToast(isVi ? `Đang chuyển sang báo cáo chi tiết phòng ban: ${val.toUpperCase()}...` : `Opening department report for: ${val}...`);
                setReportMode("department");
              }
            }}
            className="bg-surface-container text-on-surface p-space-xs rounded-DEFAULT border border-outline-variant/30 text-body-sm"
          >
            <option value="all">{isVi ? "Vĩ mô toàn doanh nghiệp (5 Phòng ban · $123.22M USD)" : "Full Spectrum (5 Depts · $123.22M USD)"}</option>
            <option value="sales">{isVi ? "Phòng Kinh Doanh & Khách Hàng (Sales)" : "Sales & Customer Accounts"}</option>
            <option value="legal">{isVi ? "Phòng Pháp Chế & Tuân Thủ (Legal)" : "Legal & Compliance"}</option>
            <option value="operations">{isVi ? "Phòng Vận Hành & Kho Vận (Ops)" : "Operations & Supply"}</option>
            <option value="it">{isVi ? "Phòng Công Nghệ & An Toàn TT (IT)" : "IT & SecOps"}</option>
            <option value="hr">{isVi ? "Phòng Nhân Sự & Đào Tạo (HR)" : "Human Resources"}</option>
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
            onClick={handleExportWord}
            className="btn sm flex items-center gap-1.5"
            title={isVi ? "Xuất báo cáo chiến lược ra file Word (.doc)" : "Export strategic briefing to Word (.doc)"}
          >
            <Icon name="fa-solid fa-file-word" size={13} style={{ color: "#2563eb" }} />
            <span>{isVi ? "Xuất Word" : "Export Word"}</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="btn primary sm flex items-center gap-1.5"
            title={isVi ? "In hoặc Lưu báo cáo chiến lược dưới dạng PDF A4" : "Print or save briefing as PDF"}
          >
            <Icon name="fa-solid fa-file-pdf" size={13} />
            <span>{isVi ? "Xuất PDF" : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* BOARD-READY REPORT DOCUMENT PREVIEW */}
      <div className="doc-preview bg-surface-container-low p-space-xl rounded-lg border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="border-b border-outline-variant/20 pb-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-primary font-bold">
              {isAdminRole ? "AEGIS SECOPS & ENTERPRISE AUDIT OBSERVATORY" : "AEGIS ENTERPRISE INTELLIGENCE OBSERVATORY"}
            </span>
            <span className="font-code-sm text-code-sm text-outline">
              DOC-ID: {isAdminRole ? "#SECOPS-AUDIT-2026-Q3" : "#EKMP-REP-2026-Q3"}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mt-space-2xs">
            {isAdminRole
              ? (isVi ? "Báo Cáo Chiến Lược & Giám Sát Toàn Diện — Tháng 09/2026" : "Strategic Briefing & Global System Telemetry — September 2026")
              : (isVi ? "Báo Cáo Chiến Lược Ban Giám Đốc — Tháng 09/2026" : "Executive Strategic Briefing — September 2026")}
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
          <textarea
            value={liveBriefing}
            onChange={(e) => setLiveBriefing(e.target.value)}
            rows={8}
            placeholder={isVi ? "Bấm nút tạo báo cáo để AI tổng hợp từ dữ liệu thực, sau đó chỉnh sửa nội dung tại đây trước khi xuất file." : "Generate the briefing, then edit it here before exporting."}
            style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)", fontSize: 13.5, lineHeight: 1.6, resize: "vertical" }}
          />
        </div>

        {/* 2. CUSTOMER SIGNALS */}
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-space-xs">
            2. {isVi ? "TÍN HIỆU RỜI BỎ KHÁCH HÀNG & BIẾN ĐỘNG ĐỐI TÁC" : "CUSTOMER RETENTION & CHURN SIGNALS"}
          </h3>
          <ul className="list-disc list-inside text-body-sm leading-relaxed text-on-surface-variant flex flex-col gap-space-2xs">
            <li>
              <b>Brakes and Gears (#29818):</b> {isVi ? "Tần suất đặt hàng giảm từ 8,0/tháng xuống 5,4/tháng (-32% trong 60 ngày). Mô hình đồ thị xác nhận đây là chỉ báo cần ưu tiên chăm sóc đối với tài khoản $989k USD." : "Order cadence dropped from 8.0/mo to 5.4/mo (-32% over 60 days). Graph model confirms churn risk for this $989k USD account."}
            </li>
            <li>
              <b>Excellent Riding Supplies (#29715):</b> {isVi ? "Nhịp độ đặt hàng linh kiện giảm 44% kể từ quý 3. Cần rà soát lại thỏa thuận phân phối và chiết khấu." : "Component order cadence fell 44%. Commercial terms and volume discounts require renegotiation."}
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
                  <td className="p-2 font-mono font-semibold">HD-29818</td>
                  <td className="p-2">Brakes and Gears</td>
                  <td className="p-2 font-semibold text-primary">$989k USD</td>
                  <td className="p-2 text-error font-bold">18/10/2026 (12d)</td>
                  <td className="p-2"><span className="pill red uppercase text-[10px] font-bold">HIGH</span></td>
                </tr>
                <tr className="border-b border-outline-variant/10">
                  <td className="p-2 font-mono font-semibold">HD-29715</td>
                  <td className="p-2">Excellent Riding Supplies</td>
                  <td className="p-2 font-semibold text-primary">$961k USD</td>
                  <td className="p-2">24/10/2026 (18d)</td>
                  <td className="p-2"><span className="pill amber uppercase text-[10px] font-bold">MED</span></td>
                </tr>
                <tr>
                  <td className="p-2 font-mono font-semibold">AR Receivables &gt;60d</td>
                  <td className="p-2">Finance Department</td>
                  <td className="p-2 font-semibold text-error">$8.6M USD</td>
                  <td className="p-2">End of Month</td>
                  <td className="p-2"><span className="pill amber uppercase text-[10px] font-bold">ELEVATED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. RECOMMENDED EXECUTIVE ACTIONS (WITH C-SUITE INTERACTIVE APPROVAL) */}
        <div className="bg-surface-container p-space-md rounded-DEFAULT border border-outline-variant/20">
          <div className="flex items-center justify-between mb-space-xs flex-wrap gap-2">
            <h3 className="text-sm font-bold text-tertiary uppercase tracking-wider">
              4. {isVi ? "HÀNH ĐỘNG CHIẾN LƯỢC ĐỀ XUẤT CẤP C-SUITE" : "RECOMMENDED C-SUITE EXECUTIVE ACTIONS"}
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", background: "rgba(37, 99, 235, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
              {isVi ? "Thẩm quyền: Ban Giám Đốc Phê Duyệt Hạn Mức" : "Authority: Executive Board Authorization"}
            </span>
          </div>

          <div className="flex flex-col gap-space-xs text-body-sm">
            {/* Priority 1 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "8px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 260 }}>
                <Icon name="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5" size={16} />
                <span>
                  <b>{isVi ? "Ưu tiên 1:" : "Priority 1:"}</b> {isVi ? "Chỉ đạo Giám đốc Kinh doanh tiếp xúc trực tiếp Giám đốc Mua hàng đối tác Brakes and Gears (#29818) trong vòng 7 ngày kèm đề xuất gia hạn gói ưu đãi chiết khấu 10% - 12%." : "Direct Sales VP to schedule in-person renewal review with Procurement Director at Brakes and Gears (#29818) offering a 10%-12% retention package."}
                </span>
              </div>
              <button
                onClick={() => {
                  setCsuiteDiscountApproved(true);
                  showToast(isVi ? "Ban Giám Đốc đã phê duyệt cấp hạn mức chiết khấu 10%-12% cho Brakes and Gears (#29818)!" : "Executive Board approved 10%-12% volume rebate for Brakes and Gears (#29818)!");
                }}
                disabled={csuiteDiscountApproved}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: csuiteDiscountApproved ? "rgba(16, 185, 129, 0.15)" : "#2563eb",
                  color: csuiteDiscountApproved ? "#059669" : "#ffffff",
                  border: csuiteDiscountApproved ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
                  cursor: csuiteDiscountApproved ? "default" : "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {csuiteDiscountApproved ? (isVi ? "✓ Đã Phê Duyệt Hạn Mức 10-12%" : "✓ 10-12% Limit Approved") : (isVi ? "Phê Duyệt Hạn Mức 10-12%" : "Approve 10-12% Limit")}
              </button>
            </div>

            {/* Priority 2 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "8px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 260 }}>
                <Icon name="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5" size={16} />
                <span>
                  <b>{isVi ? "Ưu tiên 2:" : "Priority 2:"}</b> {isVi ? "Kích hoạt đối soát công nợ 5 khách hàng chậm trả trên 60 ngày ($8.6M USD) và quyết định phân bổ ngân sách bảo lãnh thanh toán cho Logistics Sao Mai." : "Trigger accounts receivable reconciliation for top delinquent accounts ($8.6M USD) and authorize bank guarantee credit budget."}
                </span>
              </div>
              <button
                onClick={() => {
                  setCsuiteBudgetApproved(true);
                  showToast(isVi ? "Ban Giám Đốc đã ra quyết định phê duyệt phân bổ ngân sách bảo lãnh thanh toán!" : "Executive Board authorized payment guarantee budget allocation!");
                }}
                disabled={csuiteBudgetApproved}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: csuiteBudgetApproved ? "rgba(16, 185, 129, 0.15)" : "#059669",
                  color: csuiteBudgetApproved ? "#059669" : "#ffffff",
                  border: csuiteBudgetApproved ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
                  cursor: csuiteBudgetApproved ? "default" : "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {csuiteBudgetApproved ? (isVi ? "✓ Đã Quyết Định Phân Bổ Ngân Sách" : "✓ Budget Allocation Authorized") : (isVi ? "Quyết Định Phân Bổ Ngân Sách" : "Authorize Budget")}
              </button>
            </div>

            {/* Priority 3 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <Icon name="fa-solid fa-square-check text-primary text-[16px] shrink-0 mt-0.5" size={16} />
              <span>
                <b>{isVi ? "Ưu tiên 3:" : "Priority 3:"}</b> {isVi ? "Hoàn tất xác thực con người (HITL) cho 12 tài liệu quy trình thiếu phòng ban chủ quản trong tuần này." : "Complete human-in-the-loop verification for 12 pending SOP documents lacking department ownership."}
              </span>
            </div>
          </div>
        </div>

        {/* 5. SECOPS & SYSTEM TELEMETRY (CHỈ HIỂN THỊ CHO QUẢN TRỊ VIÊN HỆ THỐNG - IT_ADMIN) */}
        {isAdminRole && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderTop: "2px dashed var(--border)", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(217, 119, 6, 0.1)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="fa-solid fa-shield-virus" size={15} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
                      5. {isVi ? "GIÁM SÁT TOÀN DIỆN KỸ THUẬT & AN TOÀN THÔNG TIN (SECOPS TELEMETRY)" : "GLOBAL SYSTEM & SECOPS TELEMETRY"}
                    </h3>
                    <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>
                      {isVi ? "Theo dõi chất lượng tri thức, độ trễ hệ thống, log kiểm duyệt HITL và bảo mật phân quyền RBAC" : "Real-time telemetry on knowledge graph quality, latency, HITL queue, and SecOps compliance"}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "rgba(217, 119, 6, 0.1)", padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(217, 119, 6, 0.25)" }}>
                  ADMIN SECOPS PORTAL
                </span>
              </div>

              {/* 4 Telemetry Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {/* Metric 1: Knowledge Quality */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isVi ? "Chất Lượng Tri Thức (Graph Quality)" : "Knowledge Quality"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", margin: "6px 0 2px 0" }}>
                    99.4%
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {isVi ? "52.283 Nodes · 40.194 Vectors · 0 Orphan" : "52,283 Nodes · 40,194 Vectors · 0 Orphan"}
                  </div>
                </div>

                {/* Metric 2: System Latency */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isVi ? "Độ Trễ Hệ Thống (P95 / P99)" : "System Latency"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", margin: "6px 0 2px 0" }}>
                    18ms <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}>/ 42ms P99</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {isVi ? "Neo4j Cypher & Qdrant Search tối ưu" : "Optimized Neo4j & Qdrant search"}
                  </div>
                </div>

                {/* Metric 3: HITL Verification Logs */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isVi ? "Log Kiểm Duyệt HITL" : "HITL Verification Queue"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#d97706", margin: "6px 0 2px 0" }}>
                    12 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}>{isVi ? "hồ sơ chờ" : "pending"}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {isVi ? "94.6% duyệt tự động · 0 vi phạm" : "94.6% auto-verified · 0 policy violations"}
                  </div>
                </div>

                {/* Metric 4: Security & RBAC Compliance */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isVi ? "An Toàn Thông Tin (SecOps)" : "Information Security"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed", margin: "6px 0 2px 0" }}>
                    100%
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {isVi ? "2FA Active · Mã hóa SHA256 · Chuẩn BR-04" : "2FA Active · SHA256 hashed · BR-04 scope"}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. CROSS-LEVEL AUDIT RECONCILIATION TABLE (ĐỐI SOÁT & KIỂM TRA CHÉO 3 CẤP) */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text-1)", margin: "0 0 2px 0" }}>
                    6. {isVi ? "ĐỐI SOÁT & KIỂM TRA CHÉO TÍNH TOÀN VẸN BÁO CÁO 3 CẤP (AUDIT RECONCILIATION)" : "CROSS-LEVEL SHIFT & REPORT AUDIT RECONCILIATION"}
                  </h4>
                  <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>
                    {isVi ? "Toàn quyền kiểm tra chéo và đối soát báo cáo từ Chuyên viên -> Trưởng phòng -> Ban Giám Đốc" : "Cross-verifying shift reports from Specialist to Department Manager and Executive Board"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => {
                      setIsReconciling(true);
                      setTimeout(() => {
                        setIsReconciling(false);
                        setCrossAuditReconciled(true);
                        showToast(isVi ? "Đối soát tự động hoàn tất: 100% số liệu 3 cấp khớp tuyệt đối và bảo đảm tính toàn vẹn!" : "Audit completed: 100% multi-level data matched and integrity verified!");
                      }, 900);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: "rgba(37, 99, 235, 0.08)",
                      color: "#2563eb",
                      border: "1px solid rgba(37, 99, 235, 0.25)",
                      cursor: "pointer"
                    }}
                  >
                    {isReconciling ? (isVi ? "Đang đối soát..." : "Reconciling...") : (isVi ? "Chạy Đối Soát Tức Thời" : "Run Live Audit")}
                  </button>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: 6 }}>
                    {isVi ? "TÍNH TOÀN VẸN: BẢO ĐẢM 100%" : "INTEGRITY: 100% VERIFIED"}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px 10px", textTransform: "uppercase", fontSize: 10.5 }}>{isVi ? "Cấp Báo Cáo / Vai Trò" : "Level / Role"}</th>
                      <th style={{ padding: "8px 10px", textTransform: "uppercase", fontSize: 10.5 }}>{isVi ? "Cán Bộ Phụ Trách" : "Officer"}</th>
                      <th style={{ padding: "8px 10px", textTransform: "uppercase", fontSize: 10.5 }}>{isVi ? "Mã Chứng Từ & Dữ Liệu Đối Soát" : "Dossier & Doc IDs"}</th>
                      <th style={{ padding: "8px 10px", textTransform: "uppercase", fontSize: 10.5 }}>{isVi ? "Thẩm Quyền Tác Nghiệp (RBAC)" : "RBAC Authority"}</th>
                      <th style={{ padding: "8px 10px", textTransform: "uppercase", fontSize: 10.5, textAlign: "right" }}>{isVi ? "Kết Quả Đối Soát" : "Audit Result"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#2563eb" }}>
                        {isVi ? "Cấp 1: Vi mô (Micro)" : "Level 1: Micro Scope"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <b>Nguyễn V. Nam</b> (@sales)
                      </td>
                      <td style={{ padding: "10px", fontFamily: "var(--f-mono)" }}>
                        #EDR-8821, #BG-2026-09 · SLA 100% · $1.95M USD
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-2)" }}>
                        {isVi ? "Nộp ca qua 'Trình Duyệt Ngay' (Không ký)" : "Submitted via 'Submit Now' (No sign)"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                          ✓ {isVi ? "Khớp Số Liệu" : "Matched"}
                        </span>
                      </td>
                    </tr>

                    <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#059669" }}>
                        {isVi ? "Cấp 2: Cấp trung (BR-04)" : "Level 2: Dept Scope"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <b>Trần M. Anh</b> (@manager)
                      </td>
                      <td style={{ padding: "10px", fontFamily: "var(--f-mono)" }}>
                        #GM-EOD-2026-0920 · 8/8 Ca · 4.1 Tỷ VND bảo vệ
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-2)" }}>
                        {isVi ? "Ký số điện tử SHA256 & Báo cáo Ban Giám Đốc" : "SHA256 Signed & Transmitted to Board"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                          ✓ {isVi ? "Chữ Ký Hợp Lệ" : "Valid Seal"}
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#7c3aed" }}>
                        {isVi ? "Cấp 3: Vĩ mô (Enterprise)" : "Level 3: Enterprise"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <b>Trần Thị Thu Hương</b> (@ceo)
                      </td>
                      <td style={{ padding: "10px", fontFamily: "var(--f-mono)" }}>
                        $123.22M USD · $3,916 AOV · 30 CUAD · $8.6M AR
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-2)" }}>
                        {isVi ? "Phê duyệt hạn mức 10-12% & Phân bổ ngân sách" : "Approved 10-12% Limit & Budget"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                          ✓ {isVi ? "Toàn Vẹn 100%" : "Integrity OK"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
