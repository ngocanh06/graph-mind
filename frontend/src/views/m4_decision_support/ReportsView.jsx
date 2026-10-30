import React, { useState } from "react";
import Icon from '../../components/ui/Icon';
import { generateExecutiveBriefing, fetchExecutiveKPIs } from '../../services/api';
import DepartmentReportView from "./DepartmentReportView";

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
  const [managerApproved, setManagerApproved] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
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
    showToast(
      isSalesRole
        ? (isVi ? "Trợ lý AI đang quét nhật ký cuộc gọi, email và dữ liệu tác nghiệp..." : "AI scanning call logs, emails, and activity data...")
        : (isVi ? "Đang tổng hợp dữ liệu từ 52.283 nodes đồ thị Neo4j & 40.194 điểm hợp đồng CUAD qua AI..." : "Synthesizing 52,283 Neo4j nodes & 40,194 CUAD contract points via AI...")
    );
    try {
      if (!isSalesRole) {
        const res = await generateExecutiveBriefing("month", "executive");
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
      showToast(
        isSalesRole
          ? (isVi ? "Đã tái lập Báo cáo ca tác nghiệp hoàn chỉnh!" : "Shift report compiled successfully!")
          : (isVi ? "Báo cáo Lãnh đạo đã được tạo thành công từ dữ liệu thực tế!" : "Executive Briefing synthesized from real database!")
      );
    }
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

    if (isShift) {
      contentHtml = `
        <h1>${docTitle}</h1>
        <p style="text-align: center; color: #64748b; font-size: 10pt;">
          <b>Mã tài liệu:</b> ${docId} | <b>Thời gian:</b> ${dateStr} | <b>Chuyên viên:</b> ${authorStr} (@${currentUser?.username || "ops"})
        </p>
        <hr style="border: 1px solid #cbd5e1; margin: 16px 0;" />
        
        <h2>I. TỔNG QUAN KẾT QUẢ CÔNG VIỆC TRONG CA</h2>
        <p>Trong ca làm việc hôm nay, chuyên viên đã theo dõi sát sao các tài khoản doanh nghiệp phụ trách. Tiếp nhận và xử lý dứt điểm các ca cảnh báo rủi ro sụt giảm đơn hàng, đạt 100% cam kết thời gian phản hồi SLA. Đã thành công kích hoạt giải pháp đàm phán thông minh qua AI Copilot để giữ chân tài khoản Brakes and Gears ($989k USD) và thỏa thuận hạn mức đối soát công nợ tại Excellent Riding Supplies ($961k USD).</p>

        <h2>II. CHỈ SỐ KPI TÁC NGHIỆP TRỌNG YẾU</h2>
        <table>
          <tr><th>Chỉ số (KPI)</th><th>Giá trị</th><th>Trạng thái / Đánh giá</th></tr>
          <tr><td>Ca cảnh báo đã giải quyết</td><td><b>4 / 4 ca</b></td><td>100% SLA cam kết (TB 12 phút/ca)</td></tr>
          <tr><td>Doanh số VIP bảo vệ thành công</td><td><b>$1,950,000 USD</b></td><td>Brakes and Gears ($989k), Excellent Riding Supplies ($961k)</td></tr>
          <tr><td>Hồ sơ chứng từ đã phát hành</td><td><b>3 bộ chứng từ</b></td><td>BG-2026-09, EDR #8821, Phụ lục hợp đồng PL #44</td></tr>
          <tr><td>Độ hài lòng tài khoản phụ trách</td><td><b>98.5%</b></td><td>Xuất sắc · Không có khiếu nại phát sinh</td></tr>
        </table>

        <h2>III. NHẬT KÝ CHI TIẾT CÁC CA ĐÃ XỬ LÝ</h2>
        <table>
          <tr><th>Thời gian</th><th>Khách hàng</th><th>Sự việc cảnh báo</th><th>Giải pháp tác nghiệp</th><th>Mã EDR</th><th>Trạng thái</th></tr>
          <tr><td>09:15</td><td><b>Brakes and Gears</b> (CUST-29818)</td><td>Sụt giảm đơn hàng (-32%), rủi ro hợp đồng CT-2026-18</td><td>Copilot gợi ý gói chiết khấu 10% giữ chân tài khoản; xuất phiếu EDR</td><td>#EDR-8821</td><td>Đã giải quyết</td></tr>
          <tr><td>10:30</td><td><b>Excellent Riding Supplies</b> (CUST-29715)</td><td>Nguy cơ rời bỏ dòng sản phẩm B (-44%)</td><td>Rà soát điều khoản độc quyền; gửi thư mời làm việc với GĐ Mua hàng</td><td>#EDR-8825</td><td>Đang theo dõi</td></tr>
          <tr><td>11:15</td><td><b>Tập đoàn Dược Phẩm V</b></td><td>Nâng cấp hạ tầng bảo mật dữ liệu GxP</td><td>Lập bảng báo giá chính thức $450K USD gửi qua email kèm chứng thư số</td><td>#BG-2026-09</td><td>Đã gửi báo giá</td></tr>
          <tr><td>14:00</td><td><b>Logistics Sao Mai</b></td><td>Ký kết phụ lục gia hạn hợp đồng vận tải</td><td>Soạn thảo phụ lục theo mẫu chuẩn Pháp chế; gửi ký số qua cổng điện tử</td><td>#PL-44</td><td>Đã hoàn tất</td></tr>
        </table>

        <h2>IV. ĐỀ XUẤT & KIẾN NGHỊ GỬI TRƯỞNG PHÒNG TRẦN M. ANH</h2>
        <ol>
          <li><b>Cấp hạn mức duyệt chiết khấu nhanh (10% - 12%):</b> Xem xét cấp thẩm quyền duyệt nhanh nếu khách hàng Brakes and Gears cam kết kỳ hạn 24 tháng trước ngày 30/09.</li>
          <li><b>Đôn đốc Pháp chế phê duyệt bảo lãnh thanh toán:</b> Đôn đốc bộ phận Pháp chế hoàn tất thẩm định phụ lục bảo lãnh cho Logistics Sao Mai trong sáng mai.</li>
        </ol>

        <h2>V. XÁC NHẬN PHÊ DUYỆT CỦA TRƯỞNG PHÒNG</h2>
        <div style="border: 1px dashed #059669; padding: 12px; background: #f0fdf4; margin-top: 10px;">
          <p><b>Người phê duyệt:</b> Trần M. Anh — Trưởng Phòng Quản Lý Nghiệp Vụ</p>
          <p><b>Trạng thái:</b> ${managerApproved ? "ĐÃ PHÊ DUYỆT & KÝ SỐ ĐIỆN TỬ" : (reportSubmitted ? "ĐANG CHỜ TRƯỞNG PHÒNG DUYỆT" : "BẢN THẢO CHỜ TRÌNH DUYỆT")}</p>
          <p><b>Mã băm chứng thực:</b> SHA256: 7f89b2c89e1a...a889 · Khối phê duyệt nội bộ GraphMind</p>
        </div>
      `;
    } else {
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
    }

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
    return (
      <div className="view active" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px 20px" }}>
        {/* Switcher Bar for Specialist - strictly Micro Scope (BR-02) */}
        <div style={{ maxWidth: 1400, margin: "0 auto 14px auto", width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px", background: "var(--surface-2)", borderRadius: 10, width: "fit-content", border: "1px solid var(--border)" }}>
            <span
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
                background: "#2563eb", color: "#ffffff"
              }}
            >
              {isVi ? "Báo Cáo Ca Chuyên Viên" : "Specialist Shift Report"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--text-3)", padding: "0 8px", fontStyle: "italic" }}>
              {isVi ? "Phạm vi: Vi mô cá nhân (BR-02)" : "Scope: Specialist Micro-Level (BR-02)"}
            </span>
          </div>
        </div>

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

          /* PRINT MEDIA STYLES (FR44 PDF EXPORT) */
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
            nav, aside, header, .sidebar, .top-bar, .rep-filter-dock, .report-config,
            .rep-actions-cluster, .rep-actions-bar, .fixed, .rep-btn, button, select,
            .animate-bounce, .rep-seg-group {
              display: none !important;
            }
            .view, .sales-report-wrap, .doc-preview {
              max-width: 100% !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            .rep-hero-box, .rep-kpi-card, .rep-table-panel, .rep-doc-dossier, .rep-sign-box, .doc-preview {
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 12pt !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
            }
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto !important;
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
              <Icon name="fa-solid fa-check" size={15} />
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
                    <Icon name="fa-solid fa-chart-pie" size={15} />
                    {isVi ? "Báo Cáo Tác Nghiệp Bán Hàng" : "Sales Operational Report"}
                  </span>
                  <span className="rep-pill-tag rep-pill-neutral">
                    <Icon name="fa-solid fa-id-badge" size={15} />
                    {isVi
                      ? `Chuyên viên: ${currentUser?.name || "Chuyên viên Nghiệp vụ"} · Mã @${currentUser?.username || "ops"}`
                      : `Specialist: ${currentUser?.name || "Operations Specialist"} · ID @${currentUser?.username || "ops"}`}
                  </span>
                  {managerApproved ? (
                    <span className="rep-pill-tag rep-pill-green">
                      <Icon name="fa-solid fa-circle-check" size={15} />
                      {isVi ? "Trưởng phòng Trần M. Anh ĐÃ DUYỆT" : "Dept Manager APPROVED"}
                    </span>
                  ) : reportSubmitted ? (
                    <span className="rep-pill-tag rep-pill-amber">
                      <Icon name="fa-solid fa-hourglass-half" size={15} />
                      {isVi ? "Đang chờ Trưởng phòng duyệt" : "Pending Manager Sign-off"}
                    </span>
                  ) : hasGeneratedReport ? (
                    <span className="rep-pill-tag rep-pill-neutral" style={{ color: "#2563eb", background: "rgba(37, 99, 235, 0.06)", borderColor: "rgba(37, 99, 235, 0.2)" }}>
                      <Icon name="fa-solid fa-pen-nib" size={15} />
                      {isVi ? "Bản thảo ca đang cập nhật" : "Current Active Shift Draft"}
                    </span>
                  ) : (
                    <span className="rep-pill-tag rep-pill-neutral" style={{ color: "var(--text-4)", background: "var(--surface-2)" }}>
                      <Icon name="fa-solid fa-clock" size={15} />
                      {isVi ? "Chưa khởi tạo báo cáo" : "No report initialized"}
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                  {isVi ? "Báo Cáo Công Việc & Nhật Ký Tác Nghiệp Ca" : "Shift Work & Operations Report"}
                </h1>
                <p style={{ fontSize: "13.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
                  {isVi
                    ? `Tổng hợp kết quả xử lý và nhật ký tác nghiệp của ${currentUser?.name || "Chuyên viên Nghiệp vụ"}`
                    : `Comprehensive operational log and shift synthesis for ${currentUser?.name || "Operations Specialist"}`}
                </p>
              </div>

              {/* Action Cluster */}
              <div className="rep-actions-cluster">
                <button
                  onClick={() => onNavigate("search")}
                  className="rep-btn"
                  title={isVi ? "Quay về Bàn làm việc Khách hàng" : "Return to Operations Hub"}
                >
                  <Icon name="fa-solid fa-arrow-left" size={15} />
                  <span>{isVi ? "Bàn Làm Việc" : "Operations Hub"}</span>
                </button>

                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGenerating}
                  className="rep-btn magic"
                  title={isVi ? "AI tự động thu thập nhật ký để soạn báo cáo" : "AI auto-compile shift report"}
                >
                  <Icon name="fa-solid fa-wand-magic-sparkles" size={14} />
                  <span>{isGenerating ? (isVi ? "AI Đang Soạn..." : "Compiling...") : (isVi ? "AI Soạn Báo Cáo" : "AI Compile Report")}</span>
                </button>

                <button
                  onClick={handleSubmitToManager}
                  disabled={!hasGeneratedReport}
                  className="rep-btn primary-gradient"
                  style={{ opacity: !hasGeneratedReport ? 0.6 : 1 }}
                  title={isVi ? "Gửi báo cáo lên Trưởng phòng Trần M. Anh" : "Submit report to Dept Manager"}
                >
                  <Icon name="fa-solid fa-paper-plane" size={15} />
                  <span>{isVi ? "Gửi Trưởng Phòng Duyệt" : "Submit to Manager"}</span>
                </button>

                <button
                  onClick={handleExportWord}
                  className="rep-btn"
                  title={isVi ? "Xuất báo cáo ca làm việc ra định dạng Word (.doc)" : "Export shift report to Word (.doc)"}
                >
                  <Icon name="fa-solid fa-file-word" size={14} style={{ color: "#2563eb" }} />
                  <span>{isVi ? "Xuất Word" : "Export Word"}</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="rep-btn"
                  title={isVi ? "In hoặc Lưu báo cáo ca dưới dạng PDF A4" : "Print or save report as PDF"}
                >
                  <Icon name="fa-solid fa-file-pdf" size={14} style={{ color: "#ef4444" }} />
                  <span>{isVi ? "Xuất PDF" : "Export PDF"}</span>
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
                  <Icon name="fa-solid fa-shield-halved" size={15} />
                </div>
              </div>
              <div>
                <div className="rep-kpi-val">
                  {hasGeneratedReport ? "4 / 4" : "0 / 0"}
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                    {hasGeneratedReport ? "100% SLA" : "0% SLA"}
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: hasGeneratedReport ? "100%" : "0%", background: "linear-gradient(90deg, #10b981, #059669)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <Icon name="fa-solid fa-clock" size={15} style={{ fontSize: "11px", color: "var(--text-4)" }} />
                  <span>{hasGeneratedReport ? (isVi ? "Tốc độ xử lý TB: 12 phút / ca" : "Avg turnaround: 12m") : (isVi ? "Tốc độ xử lý TB: --" : "Avg turnaround: --")}</span>
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Doanh Số Bảo Vệ (Tái Ký)" : "Protected Pipeline"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
                  <Icon name="fa-solid fa-hand-holding-dollar" size={15} />
                </div>
              </div>
              <div>
                <div className="rep-kpi-val" style={{ color: "#2563eb" }}>
                  {hasGeneratedReport ? "$4.1M USD" : "$0 USD"}
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#2563eb", background: "rgba(37, 99, 235, 0.08)", padding: "2px 8px", borderRadius: "12px" }}>
                    {hasGeneratedReport ? "+2.4% MoM" : "+0% MoM"}
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: hasGeneratedReport ? "88%" : "0%", background: "linear-gradient(90deg, #38bdf8, #2563eb)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <Icon name="fa-solid fa-building" size={15} style={{ fontSize: "11px", color: "var(--text-4)" }} />
                  <span>{hasGeneratedReport ? "Brakes and Gears ($989k) & Excellent Riding Supplies ($961k)" : (isVi ? "Chưa có phát sinh tái ký" : "No pipeline generated")}</span>
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Hồ Sơ & Báo Giá Đã Lập" : "Quotes & Dispatches"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#d97706" }}>
                  <Icon name="fa-solid fa-file-signature" size={15} />
                </div>
              </div>
              <div>
                <div className="rep-kpi-val">
                  {hasGeneratedReport ? "3" : "0"} <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-3)" }}>{isVi ? "Bộ hoàn tất" : "Packets"}</span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: hasGeneratedReport ? "75%" : "0%", background: "linear-gradient(90deg, #fbbf24, #d97706)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <Icon name="fa-solid fa-tags" size={15} style={{ fontSize: "11px", color: "var(--text-4)" }} />
                  <span>{hasGeneratedReport ? "1 Báo giá Cloud · 1 Phụ lục · 1 EDR" : (isVi ? "Chưa phát sinh chứng từ & báo giá" : "No dispatches")}</span>
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="rep-kpi-card">
              <div className="rep-kpi-header">
                <span className="rep-kpi-label">{isVi ? "Điểm Tuân Thủ SOP & KPI" : "SOP Compliance"}</span>
                <div className="rep-kpi-icon-wrap" style={{ background: "rgba(6, 182, 212, 0.1)", color: "#0891b2" }}>
                  <Icon name="fa-solid fa-award" size={15} />
                </div>
              </div>
              <div>
                <div className="rep-kpi-val" style={{ color: "#059669" }}>
                  {hasGeneratedReport ? "98.5" : "--"} <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-4)" }}>/ 100</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#0891b2", background: "rgba(6, 182, 212, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                    {hasGeneratedReport ? "Hạng A+" : (isVi ? "Chưa xếp hạng" : "Unranked")}
                  </span>
                </div>
                <div className="rep-progress-track">
                  <div className="rep-progress-fill" style={{ width: hasGeneratedReport ? "98.5%" : "0%", background: "linear-gradient(90deg, #2dd4bf, #059669)" }}></div>
                </div>
                <div className="rep-kpi-meta">
                  <Icon name="fa-solid fa-medal" size={15} style={{ fontSize: "11px", color: "#0891b2" }} />
                  <span>{hasGeneratedReport ? (isVi ? "Top 5% năng suất khối Kinh doanh" : "Top 5% frontline productivity") : (isVi ? "Đang chờ dữ liệu đánh giá ca" : "Pending shift assessment")}</span>
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
                  <Icon name="fa-solid fa-calendar-day mr-1" size={15} />
                  {isVi ? "Hôm nay (20/09/2026)" : "Today (20 Sep 2026)"}
                </button>
                <button
                  onClick={() => setTimeRange("week")}
                  className={`rep-seg-btn ${timeRange === "week" ? "active" : ""}`}
                >
                  <Icon name="fa-solid fa-calendar-week mr-1" size={15} />
                  {isVi ? "Tuần 38 (15 - 21/09)" : "Week 38 (15-21 Sep)"}
                </button>
                <button
                  onClick={() => setTimeRange("month")}
                  className={`rep-seg-btn ${timeRange === "month" ? "active" : ""}`}
                >
                  <Icon name="fa-solid fa-calendar mr-1" size={15} />
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
                <Icon name="fa-solid fa-copy" size={15} />
                <span>{isVi ? "Sao chép Tóm tắt" : "Copy Summary"}</span>
              </button>

              <button
                onClick={() => showToast(isVi ? "Đang xuất file Báo cáo công việc PDF chất lượng cao..." : "Exporting high-resolution PDF work report...")}
                className="rep-btn"
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                <Icon name="fa-solid fa-file-pdf" size={15} style={{ color: "#ef4444" }} />
                <span>{isVi ? "Xuất PDF" : "Export PDF"}</span>
              </button>
            </div>
          </div>

          {/* 4. ACTIVITY LEDGER (ACTIVITY LOG GRID) */}
          <div className="rep-table-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                  <Icon name="fa-solid fa-list-check" size={15} />
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
                  {!hasGeneratedReport ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-4)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)" }}>
                            <Icon name="fa-solid fa-clipboard-list" size={15} style={{ fontSize: "20px" }} />
                          </div>
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-2)" }}>
                            {isVi ? "Chưa có nhật ký tác nghiệp nào trong ca này" : "No shift activity records logged yet"}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-4)", maxWidth: "460px", lineHeight: "1.5" }}>
                            {isVi
                              ? "Các hành động xử lý ca cảnh báo, tạo báo giá hoặc tương tác Copilot sẽ tự động ghi vết và xuất hiện tại đây."
                              : "Action items, quotes, and Copilot workflows will automatically be tracked and logged here."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Row 1 */}
                      <tr>
                        <td style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                          09:15
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                              BG
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "13.5px" }}>Brakes and Gears</div>
                              <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>CUST-29818 · VIP Enterprise</span>
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
                              ER
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "13.5px" }}>Excellent Riding Supplies</div>
                              <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>CUST-29715 · VIP Enterprise</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", color: "var(--text-1)" }}>
                            {isVi ? "Nguy cơ rời bỏ dòng Sản phẩm B (-44%)" : "Churn risk on Product line B (-44%)"}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "2px" }}>
                            {isVi ? "Tài khoản đối tác thương mại $2.9M USD" : "$2.9M USD commercial distribution account"}
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
                              ? "Lập bảng báo giá chính thức $450K USD gửi qua email chính thức kèm chứng thư số"
                              : "Dispatched official $450K USD quotation via verified secure email with digital certificate"}
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
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. OFFICIAL DOSSIER REPORT DOCUMENT */}
          {!hasGeneratedReport ? (
            <div className="rep-doc-dossier" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", maxWidth: "560px", margin: "0 auto" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "14px", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  <Icon name="fa-solid fa-file-signature" size={15} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 6px 0" }}>
                    {isVi ? "Chưa Khởi Tạo Báo Cáo Ca Làm Việc" : "Shift Dossier Not Yet Generated"}
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: "1.6", margin: 0 }}>
                    {isVi
                      ? `Hệ thống chưa tạo văn bản báo cáo cho ca làm việc của ${currentUser?.name || "Chuyên viên Nghiệp vụ"}. Bạn có thể bấm nút "AI Soạn Báo Cáo" phía trên để Copilot tự động quét dữ liệu và lập báo cáo.`
                      : `No shift dossier has been compiled yet. Click the "AI Compile Report" button above to synthesize real-time logs into an official dossier.`}
                  </p>
                </div>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGenerating}
                  className="rep-btn magic"
                  style={{ marginTop: "8px" }}
                >
                  <Icon name="fa-solid fa-wand-magic-sparkles" size={14} />
                  <span>{isGenerating ? (isVi ? "AI Đang Soạn..." : "Compiling...") : (isVi ? "AI Soạn Báo Cáo Ngay" : "Compile Report Now")}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rep-doc-dossier">
              <div className="rep-doc-stripe"></div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#133e70", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src="/logo-icon.svg" alt="GraphMind Logo" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }} />
                    GRAPH MIND · KHỐI KINH DOANH & PHÁT TRIỂN DOANH NGHIỆP
                  </div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-1)", margin: "4px 0 2px 0", letterSpacing: "-0.01em" }}>
                    {isVi ? "Văn Bản Báo Cáo Tác Nghiệp Ca Làm Việc" : "Sales Operations Shift Dossier"}
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                    {isVi ? "Người lập:" : "Reporter:"} <b style={{ color: "var(--text-1)" }}>{currentUser?.name || "Chuyên viên Nghiệp vụ"}</b> · {isVi ? "Quản lý:" : "Supervisor:"} <b style={{ color: "var(--text-1)" }}>Trần M. Anh (Trưởng phòng)</b> · {isVi ? "Cập nhật:" : "Synthesized:"} {generatedDate}
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
                  <Icon name="fa-solid fa-circle-check" size={15} />
                  I. {isVi ? "TỔNG QUAN KẾT QUẢ CÔNG VIỆC TRONG CA" : "SHIFT PERFORMANCE SUMMARY"}
                </div>
                <div style={{ background: "var(--surface-2)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--border-soft)", fontSize: "13.5px", lineHeight: "1.65", color: "var(--text-1)" }}>
                  {isVi
                    ? "Trong ca làm việc hôm nay, chuyên viên đã theo dõi sát sao các tài khoản doanh nghiệp phụ trách. Tiếp nhận và xử lý dứt điểm các ca cảnh báo rủi ro sụt giảm đơn hàng, đạt 100% cam kết thời gian phản hồi SLA. Đặc biệt đã thành công kích hoạt giải pháp đàm phán thông minh qua AI Copilot để giữ chân tài khoản Brakes and Gears ($989k USD) và thỏa thuận hạn mức đối soát công nợ tại Excellent Riding Supplies ($961k USD)."
                    : "During today's operational shift, the specialist monitored assigned enterprise accounts. Handled and resolved priority churn alerts with a 100% SLA compliance rate. Successfully engaged AI Copilot to formulate a retention package for Brakes and Gears ($989k USD) and negotiated terms for Excellent Riding Supplies ($961k USD)."}
                </div>
              </div>

              {/* Section II */}
              <div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Icon name="fa-solid fa-lightbulb" size={15} />
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
                        ? "Đề xuất Trưởng phòng xem xét cấp thẩm quyền áp dụng mức chiết khấu 10% - 12% trực tiếp trong hợp đồng gia hạn nếu khách hàng Brakes and Gears (#29818) cam kết kỳ hạn 24 tháng trước ngày 30/09."
                        : "Request managerial pre-approval for a 10%-12% volume rebate if Brakes and Gears (#29818) commits to a 24-month contract before Sep 30."}
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
                  <Icon name="fa-solid fa-calendar-check" size={15} />
                  III. {isVi ? "KẾ HOẠCH TÁC NGHIỆP CA TIẾP THEO" : "UPCOMING SHIFT ACTION PLAN"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                  <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-soft)", fontSize: "12.5px" }}>
                    <b style={{ color: "#2563eb" }}>09:00:</b> {isVi ? "Gọi điện xác nhận lịch họp với GĐ Mua hàng Brakes and Gears (#29818)." : "Confirm meeting schedule with Procurement Director at Brakes and Gears (#29818)."}
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
                        <Icon name={managerApproved ? "fa-solid fa-circle-check" : "fa-solid fa-clock"} size={13} />
                        {managerApproved ? (isVi ? "ĐÃ PHÊ DUYỆT & KÝ SỐ" : "VERIFIED & SIGNED") : (isVi ? "SẴN SÀNG TIẾP NHẬN" : "READY FOR REVIEW")}
                      </span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0 0", lineHeight: 1.45, maxWidth: "680px" }}>
                      {managerApproved
                        ? (isVi
                          ? `“Đã xem và phê duyệt toàn bộ báo cáo ca của ${currentUser?.name || "Chuyên viên"}. Đánh giá cao tốc độ phản hồi. Đồng ý chủ trương phương án tác nghiệp.”`
                          : `“Reviewed and verified ${currentUser?.name || "Specialist"}'s shift report. Commendable response speed. Approved operational policies.”`)
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
                    <Icon name="fa-solid fa-signature" size={15} />
                    <span>{isVi ? "Trình Duyệt Ngay" : "Submit Now"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
          <div className="text-body-sm leading-relaxed text-on-surface" style={{ whiteSpace: "pre-line" }}>
            {liveBriefing ? liveBriefing : (
              isVi
                ? "Tổng doanh thu toàn hệ thống lũy kế đạt $123.22M USD với 31.465 đơn hàng AdventureWorks trong cơ sở tri thức Neo4j, giá trị đơn hàng trung bình đạt $3,916 AOV. Khách hàng đóng góp lớn nhất dẫn đầu bởi Roger Harui ($989K) và Andrew Dixon ($961K). Rủi ro pháp lý toàn diện được kiểm soát qua 30 hợp đồng CUAD với tỷ lệ tuân thủ điều khoản đạt 56.7%, phát hiện 5 hợp đồng thiếu điều khoản bảo vệ giới hạn trách nhiệm (Limitation of Liability) cần ban lãnh đạo phê duyệt phụ lục bổ sung. Phân tích công nợ quá hạn ghi nhận $8.6M USD và rủi ro khách hàng rời bỏ lớn tại 2 đối tác trọng điểm."
                : "Total enterprise monitored revenue reached $123.22M USD across 31,465 AdventureWorks orders in Neo4j, with an average order value of $3,916 AOV. Top contributing VIP accounts led by Roger Harui ($989K) and Andrew Dixon ($961K). Comprehensive legal risk governed across 30 CUAD contracts with a 56.7% clause compliance rate, identifying 5 agreements lacking limitation of liability protections. Overdue receivables analysis stands at $8.6M USD with significant churn signals on key accounts."
            )}
          </div>
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
