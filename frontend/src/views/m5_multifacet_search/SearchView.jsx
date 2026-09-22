import React, { useState, useEffect } from "react";

export default function SearchView({ onNavigate, onSelectEntity, t, lang, role = "standard", currentUser }) {
  const isVi = lang === "vi";
  const isSalesRole = role === "standard";
  const isManagerRole = role === "knowledge_manager";
  const isExecRole = role === "executive";

  // Nhân viên mặc định mở Ca việc; Quản lý / Lãnh đạo mặc định mở Tra cứu tìm kiếm
  const [activeTab, setActiveTab] = useState(isSalesRole ? "tasks" : "search");

  useEffect(() => {
    setActiveTab(role === "standard" ? "tasks" : "search");
  }, [role]);

  const [query, setQuery] = useState("contracts expiring next 30 days with declining customer activity");
  const [searchMode, setSearchMode] = useState("hybrid"); // "semantic" | "graph" | "hybrid" | "evidence"
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  // Modal xử lý ca nghiệp vụ
  const [selectedTaskAction, setSelectedTaskAction] = useState(null);
  const [emailContent, setEmailContent] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dispatchReceipt, setDispatchReceipt] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Danh sách các ca tác nghiệp cần xử lý trong ngày của nhân viên
  const [assignedTasks, setAssignedTasks] = useState([
    {
      id: "task-1",
      priority: "CRITICAL",
      badgeBg: "#fee2e2",
      badgeColor: "#dc2626",
      badgeBorder: "#fca5a5",
      title: isVi ? "Khách hàng VIP ABC Corp — Đơn hàng sụt giảm 32%" : "VIP Account ABC Corp — Order Cadence Down 32%",
      entityId: "abc",
      type: "CUSTOMER",
      clientName: "Tập đoàn ABC (ABC Corporation)",
      contactPerson: "Tran M. Anh (Procurement Dir.)",
      contractRef: "Contract CT-2026-18 (1.2 tỷ VND)",
      dueDate: isVi ? "Hôm nay (Trước 17:00)" : "Today by 17:00",
      description: isVi
        ? "Tần suất đặt hàng trong 60 ngày qua giảm từ 8.0/tháng xuống 5.4/tháng. Hợp đồng CT-18 sắp hết hạn vào 18/10. Nguy cơ khách hàng chuyển dịch sang đối thủ cạnh tranh."
        : "Order cadence fell from 8.0/mo to 5.4/mo over trailing 60 days. Linked contract CT-18 expires in 12 days.",
      suggestedAction: isVi ? "Gửi thư đề xuất ưu đãi chiết khấu 5% & mời họp gia hạn trực tiếp." : "Send 5% retention discount proposal & schedule renewal sync.",
      status: "PENDING"
    },
    {
      id: "task-2",
      priority: "HIGH",
      badgeBg: "#fef3c7",
      badgeColor: "#b45309",
      badgeBorder: "#fcd34d",
      title: isVi ? "Hợp đồng CT-2026-18 — Cần chuẩn bị hồ sơ tái ký (Hết hạn 12 ngày)" : "Contract CT-2026-18 — Renewal Dossier Needed (12d)",
      entityId: "ct18",
      type: "CONTRACT",
      clientName: "ABC Corporation",
      contactPerson: "Phòng Mua hàng & Pháp chế ABC",
      contractRef: "CT-2026-18 · Linh kiện Sản phẩm A",
      dueDate: isVi ? "18/10/2026" : "18 Oct 2026",
      description: isVi
        ? "Hợp đồng cung ứng linh kiện sản xuất chủ lực trị giá 1,2 tỷ VND. Chưa có biên bản ghi nhận thương thảo gia hạn trong hệ thống CRM hay Drive."
        : "Manufacturing component supply agreement worth 1.2B VND. No renewal meeting logged in CRM or Drive folders.",
      suggestedAction: isVi ? "Rà soát điều khoản phạt trễ giao hàng và chuẩn bị phụ lục hợp đồng 2027." : "Review delay penalties and prepare 2027 contract addendum.",
      status: "PENDING"
    },
    {
      id: "task-3",
      priority: "MEDIUM",
      badgeBg: "#e0f2fe",
      badgeColor: "#0369a1",
      badgeBorder: "#7dd3fc",
      title: isVi ? "Quy trình Đối soát Công nợ SOP-04 — Bổ sung người kiểm duyệt" : "Reconciliation SOP-04 — Missing Owner Verification",
      entityId: "doc-sop",
      type: "SOP",
      clientName: "Nội bộ Tài chính & Bán hàng",
      contactPerson: "Lê V. Hùng (Trưởng Ban Kiểm toán)",
      contractRef: "SOP-04_Reconciliation.docx",
      dueDate: isVi ? "Ngày mai" : "Tomorrow",
      description: isVi
        ? "Tài liệu quy trình đối soát 8,6 tỷ VND công nợ quý 3 còn thiếu trường người duyệt bộ phận, làm giảm độ tin cậy trích dẫn của AI."
        : "Internal 8.6B VND receivables reconciliation file missing department owner metadata field.",
      suggestedAction: isVi ? "Cập nhật trường phòng ban và gửi xác thực vào hàng đợi HITL." : "Update department owner field and submit to HITL validation queue.",
      status: "PENDING"
    }
  ]);

  const handleOpenEmailModal = (task) => {
    setSelectedTaskAction(task);
    if (task.id === "task-1" || task.id === "task-2") {
      setEmailContent(
        isVi
          ? `Kính gửi Ông/Bà Tran M. Anh - Giám đốc Mua sắm Tập đoàn ABC,\n\nTôi là Nguyễn V. Nam, đại diện Bộ phận Quản lý Khách hàng Doanh nghiệp tại Graph Mind.\n\nTheo dữ liệu rà soát định kỳ đối với Hợp đồng cung ứng CT-2026-18 (sắp kết thúc thời hạn vào ngày 18/10/2026), chúng tôi nhận thấy tần suất giao dịch trong 60 ngày gần đây có dấu hiệu biến động. Nhằm đảm bảo tiến độ chuỗi cung ứng sản xuất của Quý Tập đoàn không bị gián đoạn, chúng tôi trân trọng đề xuất:\n\n1. Áp dụng chính sách ưu đãi chiết khấu 5.5% cho gói gia hạn hợp đồng năm 2027.\n2. Ưu tiên cam kết SLA giao hàng 24/7 đối với linh kiện Sản phẩm A.\n3. Buổi trao đổi trực tiếp hoặc qua video call vào 10:00 sáng Thứ Năm tuần này.\n\nRất mong nhận được phản hồi từ Quý công ty.\n\nTrân trọng,\nNguyễn V. Nam | Chuyên viên Nghiệp vụ & Vận hành\nGraph Mind Enterprise Platform`
          : `Dear Tran M. Anh - Procurement Director, ABC Corporation,\n\nMy name is Nguyen V. Nam representing the Enterprise Accounts Operations team at Graph Mind.\n\nRegarding our core supply agreement CT-2026-18 expiring on 18 Oct 2026, we would like to present an exclusive renewal package with a 5.5% volume discount and 24/7 priority SLA.\n\nLooking forward to scheduling a quick sync this Thursday.\n\nSincerely,\nNguyen V. Nam | Frontline Operations Specialist`
      );
    } else {
      setEmailContent(
        isVi
          ? `Kính gửi Ban Kiểm toán & Pháp chế,\n\nTôi đã hoàn tất rà soát quy trình đối soát công nợ SOP-04 và bổ sung đầy đủ trường thông tin bộ phận phụ trách. Kính đề nghị Quản lý phê duyệt trên hệ thống.\n\nTrân trọng,\nNguyễn V. Nam`
          : `Dear Audit & Compliance Team,\n\nI have verified and updated the departmental metadata for Reconciliation SOP-04. Ready for sign-off.\n\nBest regards,\nNguyen V. Nam`
      );
    }
  };

  const handleMarkTaskCompleted = (taskId) => {
    setIsSending(true);
    const currentTask = selectedTaskAction || assignedTasks.find((t) => t.id === taskId);

    setTimeout(() => {
      setAssignedTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "RESOLVED" } : t))
      );
      setIsSending(false);
      setSelectedTaskAction(null);

      // Tạo Biên nhận Giao dịch Doanh nghiệp & Ký số Kiểm toán (Enterprise Dispatch Receipt)
      setDispatchReceipt({
        taskId: taskId,
        taskTitle: currentTask?.title || "Nghiệp vụ Hợp đồng CT-2026-18",
        receiptNo: `EKMP-DISP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · 20/09/2026`,
        sender: isVi
          ? "Nguyễn V. Nam (Chuyên viên Kinh doanh & Quản trị Hợp đồng — sales@graphmind.ai)"
          : "Nguyen V. Nam (Sales Executive & Contract Governance — sales@graphmind.ai)",
        recipient: currentTask
          ? `${currentTask.contactPerson} · ${currentTask.clientName}`
          : "Tran M. Anh (Procurement Dir. ABC Corp)",
        contractRef: currentTask?.contractRef || "Contract CT-2026-18",
        gateway: "Enterprise SMTP Dispatch Gateway (TLS 1.3 · DKIM Signed · SPF Passed)",
        auditHash: "SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
      });

      showToast(isVi ? "Đã gửi qua Cổng Doanh nghiệp & Xuất biên nhận giao dịch kiểm toán!" : "Dispatched to Gateway & Audit Receipt generated!");
    }, 650);
  };

  const SAMPLE_QUERIES = [
    { label: isVi ? "Hợp đồng sắp hết hạn <30 ngày" : "Contracts expiring <30d", text: "contracts expiring next 30 days with declining customer activity" },
    { label: isVi ? "Khách hàng ABC giảm sản lượng" : "ABC Corp churn signals", text: "ABC Corporation order frequency drop pattern and contract exposure" },
    { label: isVi ? "Chuỗi cung ứng Sản phẩm A" : "Product A supply chain", text: "Product A enterprise core delivery to ABC Corporation dependencies" },
    { label: isVi ? "SOP đối soát công nợ" : "Reconciliation SOP owner", text: "Finance Department SOP-04 reconciliation document owner verification" }
  ];

  const ALL_RESULTS = [
    {
      id: "res-1",
      entityId: "ct18",
      type: "CONTRACT",
      title: "Contract CT-2026-18 — ABC Corporation",
      pill: "red",
      pillText: isVi ? "Hết hạn 18/10 (12 ngày)" : "Expires 18/10 (12d)",
      snippet: isVi
        ? "Hợp đồng cung cấp linh kiện cho Dây chuyền A. Tổng giá trị cam kết 1.2 tỷ VND/năm. Đã kích hoạt cảnh báo rủi ro sụt giảm tần suất đặt hàng."
        : "Manufacturing component supply agreement for Line A. Total value 1.2B VND. Triggered anomaly alert due to declining order frequency.",
      score: 0.96,
      graphPath: "ABC Corp → CT-2026-18 → Product A Line → Churn Alert (High)",
      sourceDoc: "Contract_CT-2026-18.pdf, p.2",
      dept: "Sales",
      risk: "High",
      confidence: "94%"
    },
    {
      id: "res-2",
      entityId: "abc",
      type: "CUSTOMER",
      title: "Tập đoàn ABC (ABC Corporation)",
      pill: "red",
      pillText: isVi ? "Khách hàng Rủi ro Cao" : "High Risk Churn",
      snippet: isVi
        ? "Khách hàng đối tác loại A. Tần suất mua hàng giảm 32.5% trong 60 ngày. Chưa có biên bản ghi nhận tiếp xúc gia hạn hợp đồng."
        : "Strategic Tier-1 client. Purchasing cadence decreased 32.5% over 60 days. No recorded outreach logged in CRM or Drive folders.",
      score: 0.92,
      graphPath: "ABC Corp → Order Cadence Drop → Contract Expiration Risk",
      sourceDoc: "CRM_Account_Ledger_2026.xlsx, Row 41",
      dept: "Sales",
      risk: "High",
      confidence: "91%"
    },
    {
      id: "res-3",
      entityId: "prod-a",
      type: "PRODUCT",
      title: "Linh kiện Điện tử Sản phẩm A",
      pill: "amber",
      pillText: isVi ? "Ảnh hưởng Doanh thu" : "Revenue Exposure",
      snippet: isVi
        ? "Linh kiện cốt lõi chiếm 41% cơ cấu đơn hàng của ABC Corp. Tồn kho chuỗi cung ứng hiện tại đủ đáp ứng 45 ngày."
        : "Core electronic module accounting for 41% of ABC Corp order value. Supply chain safety buffer stands at 45 days.",
      score: 0.88,
      graphPath: "Product A → Supply Chain → ABC Corporation Orders",
      sourceDoc: "ERP_Inventory_Ledger_Q3.csv",
      dept: "Operations",
      risk: "Med",
      confidence: "86%"
    },
    {
      id: "res-4",
      entityId: "doc-sop",
      type: "SOP",
      title: "SOP-04 — Quy trình Đối soát & Thu hồi Công nợ",
      pill: "cyan",
      pillText: isVi ? "Cần Xác thực" : "Needs Review",
      snippet: isVi
        ? "Quy trình đối soát công nợ nội bộ. Tài liệu thiếu trường phòng ban và người lập hợp lệ, đang nằm trong hàng đợi xác thực."
        : "Internal financial reconciliation procedure. Missing department metadata and author field; pending validation queue.",
      score: 0.79,
      graphPath: "SOP-04 → Finance Dept → Outstanding Receivables (8.6B)",
      sourceDoc: "SOP-04_Reconciliation.docx, p.4",
      dept: "Finance",
      risk: "Med",
      confidence: "74%"
    }
  ];

  const filteredResults = ALL_RESULTS.filter((r) => {
    if (filterDept !== "ALL" && r.dept !== filterDept) return false;
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterRisk !== "ALL" && r.risk !== filterRisk) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q) ||
        r.graphPath.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q);
      if (!match && searchMode === "keyword") return false;
    }
    return true;
  });

  const pendingCount = assignedTasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="view active" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: "var(--surface)",
          border: "1px solid var(--cyan)",
          color: "var(--text-1)",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          fontWeight: "600"
        }}>
          <i className="fa-solid fa-bell" style={{ color: "var(--cyan)", fontSize: "16px" }}></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. ROLE-AWARE COMMAND BANNER (BÀN LÀM VIỆC & TRA CỨU TRI THỨC) */}
      {/* ============================================================ */}
      {(() => {
        const PERSONA = {
          standard: {
            initials: "NN",
            bgGradient: "linear-gradient(135deg, #2563eb, #0284c7)",
            shadowColor: "rgba(37, 99, 235, 0.25)",
            title: isVi ? "Tác Nghiệp Khách Hàng — Nguyễn V. Nam" : "Client Operations Hub — Nguyen V. Nam",
            badge: isVi ? "CHUYÊN VIÊN KINH DOANH" : "SALES EXECUTIVE",
            badgeColor: "#2563eb",
            badgeBg: "rgba(37, 99, 235, 0.08)",
            badgeBorder: "rgba(37, 99, 235, 0.2)",
            subtitle: isVi
              ? "Phòng Kinh doanh & Khách hàng Doanh nghiệp · Ca làm việc: 08:00 - 17:30 · Phân quyền: Nghiệp vụ Bán hàng (Sales Tier)"
              : "Corporate Sales & Account Management · Shift: 08:00 - 17:30 · Sales Access Tier",
            tabTasksLabel: isVi ? "Ca Việc Của Tôi" : "My Assigned Cases",
            tabSearchLabel: isVi ? "Tra Cứu Quy Trình & Hợp Đồng" : "Search & Evidence",
            metric1Label: isVi ? "Hồ sơ cần xử lý hôm nay" : "Active Cases Today",
            metric1Val: `${pendingCount} / ${assignedTasks.length} ca`,
            metric1Sub: isVi ? "2 ca mức độ nghiêm trọng cao" : "2 high-priority alerts",
            metric1Color: "#dc2626",
            metric2Label: isVi ? "Thời gian xử lý trung bình" : "Avg Resolution SLA",
            metric2Val: "1.4 giờ (SLA < 2h)",
            metric2Sub: isVi ? "✓ Đạt chuẩn cam kết dịch vụ" : "Within enterprise SLA",
            metric2Color: "#059669",
            metric3Label: isVi ? "Khách hàng & Hợp đồng phụ trách" : "Assigned Accounts",
            metric3Val: "18 đơn vị",
            metric3Sub: isVi ? "Bao gồm VIP ABC Corporation" : "Including VIP ABC Corp",
            metric3Color: "var(--cyan)",
            metric4Label: isVi ? "Trợ lực bởi AI Copilot" : "AI Copilot Assistance",
            metric4Val: "89.4%",
            metric4Sub: isVi ? "Tiết kiệm ~2.5 giờ làm việc/ngày" : "Saves ~2.5 hours/day",
            metric4Color: "#2563eb",
          },
          knowledge_manager: {
            initials: "TA",
            bgGradient: "linear-gradient(135deg, #059669, #10b981)",
            shadowColor: "rgba(5, 150, 105, 0.25)",
            title: isVi ? "Tra Cứu Tri Thức Doanh Nghiệp & Giám Sát Bộ Phận" : "Department Knowledge Search & Operations Oversight",
            badge: isVi ? "TRƯỞNG PHÒNG / QUẢN LÝ" : "DEPARTMENT MANAGER",
            badgeColor: "#059669",
            badgeBg: "rgba(5, 150, 105, 0.1)",
            badgeBorder: "rgba(5, 150, 105, 0.25)",
            subtitle: isVi
              ? "Trần M. Anh · Khối Quản lý Phòng ban · Tra cứu chéo 247 nguồn tri thức, bóc tách đồ thị & giám sát tiến độ ca việc của nhân viên"
              : "Tran M. Anh · Middle Management · Cross-domain knowledge discovery, graph extraction & staff shift oversight",
            tabTasksLabel: isVi ? "Giám Sát Ca Việc Nhân Viên" : "Staff Operations Queue",
            tabSearchLabel: isVi ? "Tra Cứu Tri Thức & Hợp Đồng" : "Enterprise Search & Retrieval",
            metric1Label: isVi ? "Ca việc nhân viên đang xử lý" : "Team Active Cases",
            metric1Val: `${pendingCount} / ${assignedTasks.length} ca`,
            metric1Sub: isVi ? "Chuyên viên Nam đang thụ lý" : "Handled by Specialist Nam",
            metric1Color: "#d97706",
            metric2Label: isVi ? "Giá trị phơi nhiễm giám sát" : "Monitored Value",
            metric2Val: "4.1 Tỷ VND",
            metric2Sub: isVi ? "ABC Corp (1.2B) & Delta (2.9B)" : "ABC Corp & Delta Trading",
            metric2Color: "#2563eb",
            metric3Label: isVi ? "Quy trình & Hợp đồng phụ trách" : "Department Documents",
            metric3Val: "48 tài liệu",
            metric3Sub: isVi ? "Đã xác thực chữ ký & phân loại" : "Indexed in Knowledge Vault",
            metric3Color: "#059669",
            metric4Label: isVi ? "Độ chính xác truy xuất AI" : "GraphRAG Precision",
            metric4Val: "94.2%",
            metric4Sub: isVi ? "Mô hình Hybrid GraphRAG L5" : "Hybrid GraphRAG Model L5",
            metric4Color: "var(--cyan)",
          },
          executive: {
            initials: "HĐ",
            bgGradient: "linear-gradient(135deg, #0891b2, #0284c7)",
            shadowColor: "rgba(8, 145, 178, 0.25)",
            title: isVi ? "Tra Cứu Tri Thức Doanh Nghiệp & Đồ Thị Đa Chiều" : "Enterprise Intelligence & Multi-Modal Search",
            badge: isVi ? "BAN LÃNH ĐẠO C-LEVEL" : "C-SUITE EXECUTIVE",
            badgeColor: "#0891b2",
            badgeBg: "rgba(8, 145, 178, 0.1)",
            badgeBorder: "rgba(8, 145, 178, 0.25)",
            subtitle: isVi
              ? "Hoàng Minh Điều (CEO) · Truy vấn hợp nhất 247 nguồn dữ liệu: Tài chính, Hợp đồng, Chuỗi cung ứng và Rủi ro vận hành"
              : "Hoang Minh Dieu (CEO) · Unified discovery across 247 enterprise sources: Financials, Contracts, and Operations",
            tabTasksLabel: isVi ? "Giám Sát Vụ Việc Toàn Doanh Nghiệp" : "Corporate Cases",
            tabSearchLabel: isVi ? "Tra Cứu Tri Thức Toàn Doanh Nghiệp" : "Enterprise Search Engine",
            metric1Label: isVi ? "Thực thể đồ thị tri thức" : "Monitored Graph Entities",
            metric1Val: "1,842 thực thể",
            metric1Sub: isVi ? "Đồng bộ từ 247 nguồn dữ liệu" : "Synced from 247 sources",
            metric1Color: "var(--cyan)",
            metric2Label: isVi ? "Phơi nhiễm rủi ro hợp đồng" : "Contract Risk Exposure",
            metric2Val: "12.7 Tỷ VND",
            metric2Sub: isVi ? "Cần can thiệp trong Q4/2026" : "Actionable in Q4 2026",
            metric2Color: "#dc2626",
            metric3Label: isVi ? "Tổng hồ sơ đã lập chỉ mục" : "Indexed Documents",
            metric3Val: "247 nguồn",
            metric3Sub: isVi ? "Hợp đồng, ERP, Báo cáo kiểm toán" : "Contracts, ERP, Audit files",
            metric3Color: "#059669",
            metric4Label: isVi ? "Độ tin cậy trích xuất AI" : "AI Verification Score",
            metric4Val: "96.8%",
            metric4Sub: isVi ? "Chuẩn xác thực HITL doanh nghiệp" : "Enterprise HITL standard",
            metric4Color: "#2563eb",
          },
          it_admin: {
            initials: "SA",
            bgGradient: "linear-gradient(135deg, #d97706, #f59e0b)",
            shadowColor: "rgba(217, 119, 6, 0.25)",
            title: isVi ? "Tra Cứu Tri Thức Hệ Thống & Kiểm Tra Bằng Chứng" : "SysOps & Evidence Knowledge Search",
            badge: isVi ? "ADMIN HỆ THỐNG & TRI THỨC" : "SYS & KNOWLEDGE ADMIN",
            badgeColor: "#d97706",
            badgeBg: "rgba(217, 119, 6, 0.1)",
            badgeBorder: "rgba(217, 119, 6, 0.25)",
            subtitle: isVi
              ? "SecOps Admin · Kiểm soát pipeline tri thức, bóc tách thực thể đồ thị và truy vết nguồn gốc bằng chứng"
              : "SecOps Admin · Pipeline inspection, entity extraction, and audit evidence traceability",
            tabTasksLabel: isVi ? "Hàng Đợi Ca Tác Nghiệp" : "Operations Queue",
            tabSearchLabel: isVi ? "Truy Vấn Đồ Thị & Bằng Chứng" : "Graph & Evidence Query",
            metric1Label: isVi ? "Quan hệ đồ thị Semantic Triples" : "Semantic Triples",
            metric1Val: "4,129 quan hệ",
            metric1Sub: isVi ? "Neo4j Bolt Sync: 100% OK" : "Neo4j Bolt Sync 100% OK",
            metric1Color: "#059669",
            metric2Label: isVi ? "Độ trễ truy vấn trung bình" : "Query Latency",
            metric2Val: "18ms",
            metric2Sub: isVi ? "Pipeline hoạt động tối ưu" : "Optimal pipeline latency",
            metric2Color: "var(--cyan)",
            metric3Label: isVi ? "Hàng đợi kiểm duyệt HITL" : "Pending HITL Queue",
            metric3Val: "7 hồ sơ",
            metric3Sub: isVi ? "Đang chờ admin ký duyệt" : "Awaiting verification",
            metric3Color: "#d97706",
            metric4Label: isVi ? "Độ tin cậy mô hình" : "Extraction Confidence",
            metric4Val: "94.8%",
            metric4Sub: isVi ? "Hybrid GraphRAG v4.2" : "Hybrid GraphRAG v4.2",
            metric4Color: "#2563eb",
          }
        };

        const currentPersona = PERSONA[role] || PERSONA.knowledge_manager;

        return (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "22px 24px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "18px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              borderBottom: "1px solid var(--border-soft)",
              paddingBottom: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: currentPersona.bgGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "15px",
                  boxShadow: `0 4px 12px ${currentPersona.shadowColor}`
                }}>
                  {currentPersona.initials}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{
                      fontSize: "17px",
                      fontWeight: "800",
                      color: "var(--text-1)",
                      margin: 0,
                      letterSpacing: "-0.01em"
                    }}>
                      {currentPersona.title}
                    </h2>
                    <span style={{
                      fontSize: "10.5px",
                      fontWeight: "750",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: currentPersona.badgeBg,
                      color: currentPersona.badgeColor,
                      border: `1px solid ${currentPersona.badgeBorder}`
                    }}>
                      {currentPersona.badge}
                    </span>
                  </div>
                  <p style={{
                    fontSize: "12.5px",
                    color: "var(--text-3)",
                    margin: "4px 0 0 0",
                    lineHeight: "1.4"
                  }}>
                    {currentPersona.subtitle}
                  </p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div style={{
                display: "flex",
                alignItems: "center",
                background: "var(--surface-2)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border)"
              }}>
                {/* Tab Tra Cứu (Default cho Manager / Exec) */}
                <button
                  onClick={() => setActiveTab("search")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s ease",
                    background: activeTab === "search" ? "var(--surface)" : "transparent",
                    color: activeTab === "search" ? "var(--cyan)" : "var(--text-3)",
                    boxShadow: activeTab === "search" ? "var(--shadow-sm)" : "none"
                  }}
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>{currentPersona.tabSearchLabel}</span>
                </button>

                {/* Tab Ca việc (Default cho Sales Specialist) */}
                <button
                  onClick={() => setActiveTab("tasks")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s ease",
                    background: activeTab === "tasks" ? "var(--surface)" : "transparent",
                    color: activeTab === "tasks" ? "var(--cyan)" : "var(--text-3)",
                    boxShadow: activeTab === "tasks" ? "var(--shadow-sm)" : "none"
                  }}
                >
                  <i className="fa-solid fa-list-check"></i>
                  <span>{currentPersona.tabTasksLabel}</span>
                  {pendingCount > 0 && (
                    <span style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      padding: "1px 7px",
                      borderRadius: "10px",
                      background: isSalesRole ? "#dc2626" : "#059669",
                      color: "#ffffff"
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* 4 Thẻ chỉ số tác nghiệp theo vai trò */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px"
            }}>
              <div style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-soft)",
                display: "flex",
                flexDirection: "column"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentPersona.metric1Label}
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: currentPersona.metric1Color, marginTop: "4px" }}>
                  {currentPersona.metric1Val}
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "4px" }}>
                  {currentPersona.metric1Sub}
                </span>
              </div>

              <div style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-soft)",
                display: "flex",
                flexDirection: "column"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentPersona.metric2Label}
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: currentPersona.metric2Color, marginTop: "4px" }}>
                  {currentPersona.metric2Val}
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "4px" }}>
                  {currentPersona.metric2Sub}
                </span>
              </div>

              <div style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-soft)",
                display: "flex",
                flexDirection: "column"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentPersona.metric3Label}
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: currentPersona.metric3Color, marginTop: "4px" }}>
                  {currentPersona.metric3Val}
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "4px" }}>
                  {currentPersona.metric3Sub}
                </span>
              </div>

              <div style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-soft)",
                display: "flex",
                flexDirection: "column"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentPersona.metric4Label}
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: currentPersona.metric4Color, marginTop: "4px" }}>
                  {currentPersona.metric4Val}
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--text-3)", marginTop: "4px" }}>
                  {currentPersona.metric4Sub}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* 2. NỘI DUNG CHÍNH: TAB CA VIỆC ĐƯỢC GIAO HOẶC TAB TÌM KIẾM  */}
      {/* ============================================================ */}
      {activeTab === "tasks" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header danh sách ca việc */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
            <div>
              <h3 style={{
                fontSize: "17px",
                fontWeight: "800",
                color: "var(--text-1)",
                margin: 0,
                letterSpacing: "-0.01em"
              }}>
                {isSalesRole
                  ? (isVi ? "Danh Sách Ca Việc Tác Nghiệp Được Phân Công" : "Frontline Action Queue")
                  : (isVi ? "Giám Sát Ca Tác Nghiệp Đang Xử Lý Của Nhân Viên (Chuyên viên Nguyễn V. Nam)" : "Department Operational Queue (Specialist Nguyen V. Nam)")}
              </h3>
              <p style={{
                fontSize: "13px",
                color: "var(--text-3)",
                margin: "4px 0 0 0",
                lineHeight: "1.4"
              }}>
                {isSalesRole
                  ? (isVi ? "Xử lý trực tiếp các biến động tín hiệu, cảnh báo khách hàng và quy trình SOP được phân công." : "Resolve operational alerts, customer retention actions, and assigned SOP validations.")
                  : (isVi ? "Trưởng phòng theo dõi tiến độ giải quyết ca cảnh báo, phê duyệt đề xuất chiết khấu và tháo gỡ vướng mắc cho nhân viên." : "Oversee case resolution cadence, review frontline retention terms, and support team execution.")}
              </p>
            </div>

            <button
              onClick={() => showToast(isVi ? "Đã đồng bộ dữ liệu tác nghiệp mới nhất từ CRM & ERP!" : "Synced operational queue with CRM & ERP")}
              className="btn sm"
            >
              <i className="fa-solid fa-rotate" style={{ marginRight: "6px" }}></i>
              {isVi ? "Đồng bộ mới" : "Sync Queue"}
            </button>
          </div>

          {/* Cards Ca Việc */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {assignedTasks.map((task) => {
              const isResolved = task.status === "RESOLVED";
              return (
                <div
                  key={task.id}
                  style={{
                    background: isResolved ? "var(--surface-2)" : "var(--surface)",
                    border: `1px solid ${isResolved ? "var(--border-soft)" : "var(--border)"}`,
                    borderRadius: "var(--r-lg)",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: isResolved ? "none" : "var(--shadow-sm)",
                    opacity: isResolved ? 0.75 : 1,
                    transition: "all var(--transition-fast)"
                  }}
                >
                  {/* Dòng 1: Tiêu đề, Mức ưu tiên & Hạn xử lý */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: isResolved ? "var(--surface-3)" : task.badgeBg,
                        color: isResolved ? "var(--text-3)" : task.badgeColor,
                        border: `1px solid ${isResolved ? "var(--border)" : task.badgeBorder}`,
                        textTransform: "uppercase"
                      }}>
                        {task.priority}
                      </span>
                      <span style={{
                        fontSize: "15.5px",
                        fontWeight: "700",
                        color: "var(--text-1)",
                        letterSpacing: "-0.01em"
                      }}>
                        {task.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12.5px", color: "var(--text-3)" }}>
                      <span>
                        <i className="fa-solid fa-clock" style={{ marginRight: "6px", color: "var(--text-4)" }}></i>
                        {isVi ? "Hạn chót:" : "Due:"} <b style={{ color: "var(--text-2)" }}>{task.dueDate}</b>
                      </span>
                      {isResolved && (
                        <span style={{
                          fontSize: "10.5px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "#d1fae5",
                          color: "#059669",
                          border: "1px solid #a7f3d0"
                        }}>
                          ✓ {isVi ? "ĐÃ HOÀN TẤT" : "RESOLVED"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dòng 2: Thông tin đối tác & Hợp đồng */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    background: "var(--surface-2)",
                    padding: "8px 14px",
                    borderRadius: "var(--r-md)",
                    fontSize: "12.5px",
                    color: "var(--text-2)",
                    border: "1px solid var(--border-soft)"
                  }}>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>{isVi ? "Đối tác:" : "Client:"}</span>{" "}
                      <b style={{ color: "var(--text-1)" }}>{task.clientName}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>{isVi ? "Đầu mối:" : "Contact:"}</span> {task.contactPerson}
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>{isVi ? "Hồ sơ liên kết:" : "Ref:"}</span>{" "}
                      <code style={{
                        color: "var(--cyan)",
                        fontWeight: "700",
                        fontFamily: "var(--f-mono)",
                        background: "var(--surface-3)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}>
                        {task.contractRef}
                      </code>
                    </div>
                  </div>

                  {/* Dòng 3: Mô tả tình huống */}
                  <p style={{
                    fontSize: "13.5px",
                    color: "var(--text-2)",
                    lineHeight: "1.65",
                    margin: "2px 0"
                  }}>
                    {task.description}
                  </p>

                  {/* Hộp Đề xuất Hành động AI */}
                  <div style={{
                    background: "var(--cyan-soft)",
                    border: "1px solid rgba(8, 145, 178, 0.25)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    color: "var(--text-1)"
                  }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--cyan)", fontSize: "14px" }}></i>
                    <span>
                      <b style={{ color: "var(--cyan)" }}>{isVi ? "Hành động đề xuất từ AI:" : "AI Recommended Action:"}</b> {task.suggestedAction}
                    </span>
                  </div>

                  {/* Dòng 4: Nút hành động tác nghiệp cụ thể */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border-soft)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      {/* Nút 1: Soạn thư trao đổi */}
                      <button
                        onClick={() => handleOpenEmailModal(task)}
                        className="btn primary sm"
                        style={{ padding: "7px 14px", fontSize: "12.5px", fontWeight: "600" }}
                      >
                        <i className="fa-solid fa-paper-plane" style={{ marginRight: "6px" }}></i>
                        {isVi ? "Soạn Thư & Đề Xuất Tái Ký" : "Draft Outreach Email"}
                      </button>

                      {/* Nút 2: Hỏi Copilot chuyên sâu */}
                      <button
                        onClick={() => {
                          onNavigate?.("copilot");
                          showToast(isVi ? "Đang mở Trợ lý Copilot để phân tích ca..." : "Opening Operational Copilot...");
                        }}
                        className="btn sm"
                        style={{ padding: "7px 14px", fontSize: "12.5px" }}
                      >
                        <i className="fa-solid fa-brain" style={{ marginRight: "6px", color: "var(--cyan)" }}></i>
                        {isVi ? "Hỏi Copilot Ca Này" : "Ask Copilot"}
                      </button>

                      {/* Nút 3: Xem tài liệu */}
                      <button
                        onClick={() => {
                          onNavigate?.("documents");
                          showToast(isVi ? "Đang mở Kho Tài liệu đối soát..." : "Opening Document Explorer...");
                        }}
                        className="btn sm"
                        style={{ padding: "7px 14px", fontSize: "12.5px" }}
                      >
                        <i className="fa-solid fa-file-lines" style={{ marginRight: "6px", color: "var(--amber)" }}></i>
                        {isVi ? "Xem Hợp Đồng PDF" : "View PDF"}
                      </button>
                    </div>

                    {/* Nút hoàn tất ca */}
                    <div>
                      {!isResolved ? (
                        <button
                          onClick={() => handleMarkTaskCompleted(task.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            borderRadius: "6px",
                            background: "rgba(5, 150, 105, 0.1)",
                            color: "#059669",
                            border: "1px solid rgba(5, 150, 105, 0.3)",
                            fontSize: "12.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>{isVi ? "Đánh Dấu Đã Xử Lý" : "Mark Resolved"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAssignedTasks((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, status: "PENDING" } : t))
                            );
                            showToast(isVi ? "Đã mở lại ca nghiệp vụ!" : "Re-opened task!");
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-3)",
                            fontSize: "12.5px",
                            cursor: "pointer",
                            textDecoration: "underline"
                          }}
                        >
                          {isVi ? "Mở lại ca" : "Re-open"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAB 2: CÔNG CỤ TÌM KIẾM NGỮ NGHĨA HYBRID GRAPHRAG */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SEARCH HERO */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "28px 24px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            <h1 style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--text-1)",
              margin: "0 0 6px 0",
              letterSpacing: "-0.01em"
            }}>
              {isVi ? "Tra Cứu Quy Trình SOP, Hợp Đồng & Chính Sách" : "Operational Knowledge & Evidence Retrieval"}
            </h1>
            <p style={{
              fontSize: "13.5px",
              color: "var(--text-3)",
              maxWidth: "650px",
              margin: "0 0 20px 0",
              lineHeight: "1.5"
            }}>
              {isVi
                ? "Truy xuất nhanh điều khoản phạt, chính sách chiết khấu và quy trình nghiệp vụ đã được kiểm chứng."
                : "Fast hybrid retrieval across contract clauses, discount policies, and verified enterprise SOPs."}
            </p>

            {/* Search Input Bar */}
            <div style={{
              width: "100%",
              maxWidth: "760px",
              display: "flex",
              alignItems: "center",
              background: "var(--surface-2)",
              border: "1.5px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 14px",
              boxShadow: "var(--shadow-sm)"
            }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--cyan)", fontSize: "16px", marginRight: "12px", flexShrink: 0 }}></i>
              <input
                type="text"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: "var(--text-1)",
                  fontWeight: "500"
                }}
                placeholder={isVi ? "Nhập câu hỏi, tên khách hàng, mã hợp đồng hoặc điều khoản..." : "Search entities, contracts, relationships, or questions..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-4)",
                    cursor: "pointer",
                    marginRight: "8px"
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
              <button
                onClick={() => showToast(isVi ? "Đang chạy tìm kiếm Hybrid GraphRAG..." : "Executing Hybrid GraphRAG Search...")}
                className="btn primary sm"
                style={{ flexShrink: 0, padding: "7px 16px" }}
              >
                {isVi ? "Tìm kiếm" : "Search"}
              </button>
            </div>

            {/* Search Mode Toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", marginRight: "4px" }}>
                {isVi ? "CHẾ ĐỘ TÌM:" : "SEARCH ENGINE:"}
              </span>
              {[
                { id: "hybrid", label: isVi ? "Đồ thị + Ngữ nghĩa (Hybrid)" : "Hybrid GraphRAG" },
                { id: "semantic", label: isVi ? "Vector Ngữ nghĩa" : "Semantic Vector" },
                { id: "evidence", label: isVi ? "Trích dẫn Bằng chứng (PDF/XLSX)" : "Cited Evidence" }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSearchMode(mode.id);
                    showToast(isVi ? `Đã chuyển sang chế độ: ${mode.label}` : `Retriever switched to ${mode.label}`);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s ease",
                    background: searchMode === mode.id ? "var(--cyan)" : "var(--surface-2)",
                    color: searchMode === mode.id ? "#ffffff" : "var(--text-2)",
                    boxShadow: searchMode === mode.id ? "var(--shadow-sm)" : "none"
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Sample query shortcuts */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "14px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--text-4)", fontWeight: "600" }}>
                {isVi ? "Gợi ý truy vấn nghiệp vụ:" : "Sample prompts:"}
              </span>
              {SAMPLE_QUERIES.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(sq.text);
                    showToast(isVi ? `Đã chọn truy vấn mẫu: ${sq.label}` : `Query loaded: ${sq.label}`);
                  }}
                  style={{
                    padding: "3px 10px",
                    background: "var(--surface-2)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-soft)",
                    fontSize: "12px",
                    color: "var(--cyan)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  "{sq.label}"
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH BODY: FILTERS SIDEBAR + RESULTS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "20px",
            alignItems: "start"
          }}>
            {/* FILTERS SIDEBAR */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "18px 20px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-1)" }}>
                  {isVi ? "Bộ lọc Tác nghiệp" : "Faceted Filters"}
                </span>
                <button
                  onClick={() => {
                    setFilterDept("ALL");
                    setFilterType("ALL");
                    setFilterRisk("ALL");
                  }}
                  style={{ background: "transparent", border: "none", fontSize: "12px", color: "var(--cyan)", cursor: "pointer", fontWeight: "600" }}
                >
                  {isVi ? "Đặt lại" : "Reset"}
                </button>
              </div>

              {/* Department filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {isVi ? "PHÒNG BAN" : "DEPARTMENT"}
                </div>
                {["ALL", "Sales", "Finance", "Operations"].map((d) => (
                  <div
                    key={d}
                    onClick={() => setFilterDept(d)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      transition: "all 0.15s ease",
                      background: filterDept === d ? "var(--surface-3)" : "transparent",
                      color: filterDept === d ? "var(--cyan)" : "var(--text-2)",
                      fontWeight: filterDept === d ? "700" : "500"
                    }}
                  >
                    <span>{d === "ALL" ? (isVi ? "Tất cả phòng ban" : "All Departments") : d}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                      {d === "ALL" ? "5" : d === "Sales" ? "2" : d === "Finance" ? "1" : "2"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Entity Type filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {isVi ? "LOẠI THỰC THỂ" : "ENTITY TYPE"}
                </div>
                {["ALL", "CUSTOMER", "CONTRACT", "PRODUCT", "SOP"].map((t) => (
                  <div
                    key={t}
                    onClick={() => setFilterType(t)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      transition: "all 0.15s ease",
                      background: filterType === t ? "var(--surface-3)" : "transparent",
                      color: filterType === t ? "var(--cyan)" : "var(--text-2)",
                      fontWeight: filterType === t ? "700" : "500"
                    }}
                  >
                    <span>{t === "ALL" ? (isVi ? "Tất cả thực thể" : "All Types") : t}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                      {t === "ALL" ? "5" : "1"}
                    </span>
                  </div>
                ))}
              </div>

              {/* File Format filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {isVi ? "ĐỊNH DẠNG FILE" : "FILE FORMAT"}
                </div>
                {["ALL", "PDF", "DOCX", "XLSX"].map((fmt) => (
                  <div
                    key={fmt}
                    onClick={() => {
                      setFilterType(fmt === "ALL" ? "ALL" : fmt);
                      showToast(isVi ? `Đã lọc theo định dạng: ${fmt}` : `Filtered by format: ${fmt}`);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      transition: "all 0.15s ease",
                      background: filterType === fmt ? "var(--surface-3)" : "transparent",
                      color: filterType === fmt ? "var(--cyan)" : "var(--text-2)",
                      fontWeight: filterType === fmt ? "700" : "500"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className={`fa-solid ${fmt === "PDF" ? "fa-file-pdf text-red-400" : fmt === "DOCX" ? "fa-file-word text-blue-400" : fmt === "XLSX" ? "fa-file-excel text-green-400" : "fa-folder"}`} style={{ fontSize: "12px" }}></i>
                      {fmt === "ALL" ? (isVi ? "Tất cả file" : "All Files") : fmt}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                      {fmt === "ALL" ? "5" : fmt === "PDF" ? "2" : fmt === "DOCX" ? "2" : "1"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Date range filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {isVi ? "THỜI GIAN CẬP NHẬT" : "DATE RANGE"}
                </div>
                {["ALL", "30_DAYS", "THIS_QUARTER", "YEAR_2026"].map((range) => (
                  <div
                    key={range}
                    onClick={() => {
                      showToast(isVi ? "Đã áp dụng khoảng thời gian tra cứu" : "Date range filter applied");
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      transition: "all 0.15s ease",
                      color: "var(--text-2)",
                      fontWeight: range === "ALL" ? "700" : "500"
                    }}
                  >
                    <span>
                      {range === "ALL"
                        ? (isVi ? "Toàn bộ thời gian" : "All Time")
                        : range === "30_DAYS"
                        ? (isVi ? "30 ngày gần đây" : "Past 30 Days")
                        : range === "THIS_QUARTER"
                        ? (isVi ? "Quý 3/2026" : "Q3 2026")
                        : (isVi ? "Năm 2026" : "Year 2026")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Risk filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {isVi ? "MỨC RỦI RO" : "RISK STATUS"}
                </div>
                {["ALL", "High", "Med", "Low"].map((r) => (
                  <div
                    key={r}
                    onClick={() => setFilterRisk(r)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      transition: "all 0.15s ease",
                      background: filterRisk === r ? "var(--surface-3)" : "transparent",
                      color: filterRisk === r ? "var(--cyan)" : "var(--text-2)",
                      fontWeight: filterRisk === r ? "700" : "500"
                    }}
                  >
                    <span>{r === "ALL" ? (isVi ? "Tất cả mức độ" : "All Risk Levels") : r}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                      {r === "High" ? "2" : r === "Med" ? "2" : "1"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RESULTS LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  {isVi ? "Tìm thấy" : "Showing"} <b style={{ color: "var(--text-1)" }}>{filteredResults.length}</b> {isVi ? "kết quả tương quan cao" : "high-confidence matches"}
                </span>
                <span style={{ fontSize: "10.5px", color: "var(--text-4)", fontFamily: "var(--f-mono)", textTransform: "uppercase" }}>
                  SORTED BY: RELEVANCE + PROVENANCE
                </span>
              </div>

              {filteredResults.length === 0 ? (
                <div style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "40px 24px",
                  textAlign: "center",
                  color: "var(--text-3)",
                  fontSize: "13.5px"
                }}>
                  {isVi ? "Không tìm thấy kết quả nào phù hợp với bộ lọc đã chọn." : "No results match your selected search criteria."}
                </div>
              ) : (
                filteredResults.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-lg)",
                      padding: "18px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      boxShadow: "var(--shadow-sm)",
                      transition: "all var(--transition-fast)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          background: "var(--surface-3)",
                          color: "var(--text-3)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontFamily: "var(--f-mono)"
                        }}>
                          {item.type}
                        </span>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-1)" }}>
                          {item.title}
                        </span>
                      </div>
                      <span className={`pill ${item.pill}`} style={{ fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase" }}>
                        {item.pillText}
                      </span>
                    </div>

                    <div style={{ fontSize: "13.5px", color: "var(--text-2)", lineHeight: "1.6" }}>
                      {item.snippet}
                    </div>

                    {/* WHY THIS RESULT MATCHES */}
                    <div style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px"
                    }}>
                      <span style={{ color: "var(--cyan)", fontWeight: "700" }}>
                        {isVi ? "LÝ DO KHỚP:" : "WHY THIS MATCHES:"}
                      </span>
                      <span style={{ background: "var(--surface)", color: "var(--cyan)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border-soft)" }}>
                        {isVi ? "Tương đồng" : "Semantic score"} {item.score}
                      </span>
                      <span style={{ background: "var(--surface)", color: "var(--text-2)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border-soft)", fontFamily: "var(--f-mono)" }}>
                        {item.graphPath}
                      </span>
                      <span style={{ background: "var(--surface)", color: "var(--text-3)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border-soft)" }}>
                        {isVi ? "Nguồn:" : "Source:"} {item.sourceDoc}
                      </span>
                    </div>

                    {/* Card Action Footer */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--border-soft)",
                      fontSize: "12px",
                      color: "var(--text-3)"
                    }}>
                      <span>
                        {isVi ? "Độ tin cậy:" : "Confidence:"} <b style={{ color: "#059669" }}>{item.confidence}</b> · {isVi ? "Phòng ban:" : "Dept:"} {item.dept}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          onClick={() => {
                            onSelectEntity?.(item.entityId);
                            onNavigate?.("documents");
                            showToast(isVi ? `Đang mở hồ sơ tài liệu của: ${item.title}` : `Opening dossier for: ${item.title}`);
                          }}
                          className="btn sm"
                        >
                          <i className="fa-solid fa-file-lines" style={{ marginRight: "6px", color: "var(--amber)" }}></i>
                          {isVi ? "Hồ Sơ Tài Liệu" : "View Dossier"}
                        </button>
                        <button
                          onClick={() => {
                            onNavigate?.("copilot");
                            showToast(isVi ? "Đang chuyển sang Trợ lý Copilot..." : "Switching to Copilot...");
                          }}
                          className="btn primary sm"
                        >
                          <i className="fa-solid fa-brain" style={{ marginRight: "6px" }}></i>
                          {isVi ? "Hỏi Copilot" : "Ask Copilot"} →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODAL SOẠN THẢO VĂN BẢN & XỬ LÝ NHANH CHO CHUYÊN VIÊN      */}
      {/* ============================================================ */}
      {selectedTaskAction && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(1, 15, 26, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            maxWidth: "680px",
            width: "100%",
            padding: "24px 28px",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-solid fa-paper-plane" style={{ color: "var(--cyan)", fontSize: "16px" }}></i>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                  {isVi ? "Soạn Thảo Đề Xuất Tác Nghiệp (AI Assisted Draft)" : "Draft Operational Proposal"}
                </h3>
              </div>

              <button
                onClick={() => setSelectedTaskAction(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-3)", fontSize: "18px", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{
              fontSize: "12.5px",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface-2)",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border-soft)"
            }}>
              <span>
                <b style={{ color: "var(--text-3)" }}>{isVi ? "Gửi tới:" : "To:"}</b> {selectedTaskAction.contactPerson} ({selectedTaskAction.clientName})
              </span>
              <span>
                <b style={{ color: "var(--text-3)" }}>{isVi ? "Tham chiếu:" : "Ref:"}</b> {selectedTaskAction.contractRef}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase" }}>
                {isVi ? "Nội dung văn bản được AI chuẩn bị sẵn:" : "AI Generated Content:"}
              </label>
              <textarea
                rows={10}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  color: "var(--text-1)",
                  padding: "12px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid var(--border)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  outline: "none",
                  fontFamily: "var(--f-body)",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-soft)",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(emailContent);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2500);
                }}
                className="btn sm"
              >
                <i className={`fa-solid ${copiedToast ? "fa-check" : "fa-copy"}`} style={{ marginRight: "6px", color: copiedToast ? "#059669" : "inherit" }}></i>
                {copiedToast ? (isVi ? "Đã sao chép!" : "Copied!") : (isVi ? "Sao chép nội dung" : "Copy Content")}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setSelectedTaskAction(null)}
                  className="btn sm"
                >
                  {isVi ? "Đóng" : "Cancel"}
                </button>

                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleMarkTaskCompleted(selectedTaskAction.id)}
                  className="btn primary sm"
                >
                  <i className={`fa-solid ${isSending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} style={{ marginRight: "6px" }}></i>
                  {isSending
                    ? (isVi ? "Đang gửi qua Cổng..." : "Dispatching...")
                    : (isVi ? "Gửi & Ký Số Kiểm Toán" : "Send & Audit Sign")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BIÊN NHẬN CHUYỂN PHÁT DOANH NGHIỆP & KÝ SỐ KIỂM TOÁN   */}
      {/* ============================================================ */}
      {dispatchReceipt && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            maxWidth: "640px",
            width: "100%",
            padding: "26px 28px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "18px"
          }}>
            {/* Header Biên nhận */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  background: "rgba(6, 182, 212, 0.12)",
                  color: "var(--cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  <i className="fa-solid fa-stamp"></i>
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                    {isVi ? "Biên Nhận Chuyển Phát Nghiệp Vụ Doanh Nghiệp" : "Enterprise Dispatch & Audit Receipt"}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "2px 0 0" }}>
                    {isVi ? "Chứng từ điện tử bảo mật — Đã tự động lưu vết bất biến vào Audit Trail" : "Cryptographically signed & recorded into Enterprise Audit Trail"}
                  </p>
                </div>
              </div>

              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "700",
                background: "rgba(5, 150, 105, 0.12)",
                color: "var(--green)",
                border: "1px solid rgba(5, 150, 105, 0.25)"
              }}>
                <i className="fa-solid fa-circle-check"></i>
                DISPATCHED
              </span>
            </div>

            {/* Chi tiết biên nhận */}
            <div style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "12.5px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-3)" }}>{isVi ? "Mã số biên nhận:" : "Receipt Ref:"}</span>
                <span style={{ fontWeight: "700", fontFamily: "var(--f-mono)", color: "var(--cyan)" }}>{dispatchReceipt.receiptNo}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-3)" }}>{isVi ? "Thời gian xác lập:" : "Timestamp:"}</span>
                <span style={{ fontWeight: "600", color: "var(--text-1)" }}>{dispatchReceipt.timestamp}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-3)" }}>{isVi ? "Người gửi:" : "Issuer / Sender:"}</span>
                <span style={{ fontWeight: "600", color: "var(--text-1)", textAlign: "right", maxWidth: "360px" }}>{dispatchReceipt.sender}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-3)" }}>{isVi ? "Đích đến (Người nhận):" : "Recipient:"}</span>
                <span style={{ fontWeight: "600", color: "var(--text-1)", textAlign: "right" }}>{dispatchReceipt.recipient}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-3)" }}>{isVi ? "Cổng giao vận:" : "Dispatch Gateway:"}</span>
                <span style={{ fontWeight: "500", color: "var(--text-2)", fontSize: "11.5px" }}>{dispatchReceipt.gateway}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>
                  {isVi ? "Mã băm kiểm toán bảo mật (Audit Trail Hash):" : "Immutable Audit Hash:"}
                </span>
                <span style={{
                  background: "var(--surface)",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--f-mono)",
                  fontSize: "11px",
                  color: "var(--text-2)",
                  wordBreak: "break-all"
                }}>
                  {dispatchReceipt.auditHash}
                </span>
              </div>
            </div>

            {/* Hướng dẫn nghiệp vụ */}
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(2, 132, 199, 0.08)",
              border: "1px solid rgba(2, 132, 199, 0.2)",
              fontSize: "12px",
              color: "var(--text-2)",
              lineHeight: "1.5"
            }}>
              <i className="fa-solid fa-circle-info" style={{ color: "var(--primary)", marginRight: "6px" }}></i>
              {isVi
                ? "Dữ liệu đã tự động cập nhật vào Nhật ký Kiểm toán (Audit Trail) và đồng bộ quan hệ thực thể vào Đồ thị Tri thức. Bạn có thể chọn chuyển sang xem Đồ thị hoặc Nhật ký để đối soát."
                : "Transaction recorded into Audit Trail and synced to Knowledge Graph. Select below to inspect graph relations or verify audit logs."}
            </div>

            {/* Các nút hành vi nghiệp vụ chuyển qua đâu */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              borderTop: "1px solid var(--border-soft)",
              paddingTop: "14px",
              flexWrap: "wrap"
            }}>
              <button
                type="button"
                onClick={() => setDispatchReceipt(null)}
                className="btn sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <i className="fa-solid fa-briefcase"></i>
                <span>{isVi ? "Ở lại Bàn làm việc" : "Stay in Workspace"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDispatchReceipt(null);
                  if (onNavigate) onNavigate("knowledge");
                }}
                className="btn sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <i className="fa-solid fa-circle-nodes" style={{ color: "var(--cyan)" }}></i>
                <span>{isVi ? "Xem trên Đồ thị Tri thức" : "View on Knowledge Graph"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDispatchReceipt(null);
                  if (onNavigate) onNavigate("admin");
                }}
                className="btn primary sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <i className="fa-solid fa-clipboard-list"></i>
                <span>{isVi ? "Xem trong Nhật ký Kiểm toán" : "View in Audit Trail"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
