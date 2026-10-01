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

  const [query, setQuery] = useState("Alpha Corp hợp đồng dịch vụ bồi thường");
  const [debouncedQuery, setDebouncedQuery] = useState("Alpha Corp hợp đồng dịch vụ bồi thường");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("hybrid"); // "hybrid" | "semantic" | "graph"
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterDate, setFilterDate] = useState("ALL");
  const [filterValue, setFilterValue] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL"); // "ALL" | "CONTRACT" | "CUSTOMER" | "PRODUCT" | "DOCUMENT"
  const [viewLayout, setViewLayout] = useState("grouped"); // "grouped" | "table"
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

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

  // Danh sách các ca tác nghiệp cần xử lý trong ngày của nhân viên (Mặc định trống cho role standard)
  const [assignedTasks, setAssignedTasks] = useState(isSalesRole ? [] : [
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

  useEffect(() => {
    setActiveTab(role === "standard" ? "tasks" : "search");
    if (role === "standard") {
      setAssignedTasks([]);
    }
  }, [role]);

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
    { label: isVi ? "Alpha Corp bồi thường hợp đồng" : "Alpha Corp contract indemnity", text: "Alpha Corp hợp đồng dịch vụ bồi thường" },
    { label: isVi ? "Hợp đồng sắp hết hạn <30 ngày" : "Contracts expiring <30d", text: "hợp đồng sắp hết hạn dưới 30 ngày" },
    { label: isVi ? "Khách hàng Enterprise Tier 1" : "Enterprise Tier 1 clients", text: "Khách hàng Doanh nghiệp Chiến lược Tier 1" },
    { label: isVi ? "SOP rà soát điều khoản bồi thường" : "SOP liability review", text: "SOP rà soát điều khoản bồi thường thiệt hại đối tác" },
    { label: isVi ? "Cloud Knowledge Graph Hosting" : "Cloud Graph Hosting", text: "Cloud Knowledge Graph Hosting dịch vụ SLA" }
  ];

  // ============================================================
  // SCREEN-020 DATASETS: 4 GROUPED ENTITY CLUSTERS (STITCH SPEC)
  // ============================================================
  const CONTRACT_RESULTS = [
    {
      id: "cuad-42",
      code: "CUAD_042",
      type: "CONTRACT",
      title: isVi ? "Hợp đồng Dịch vụ Công nghệ Thông tin & Lưu trữ Tri thức" : "IT Services & Knowledge Cloud Agreement",
      client: "Alpha Corp (Việt Nam)",
      dept: "LEGAL",
      deptName: isVi ? "Pháp chế & R&D" : "Legal & R&D",
      value: "1.200.000.000 đ",
      numValue: 1200000000,
      date: "15/01/2026",
      status: "VALID",
      statusText: isVi ? "Còn hiệu lực" : "Active",
      snippet: isVi
        ? "...Điều khoản 12.2 quy định về giới hạn trách nhiệm bồi thường thiệt hại và mức phạt vi phạm cam kết chất lượng dịch vụ SLA tối đa 8% tổng giá trị hợp đồng..."
        : "...Clause 12.2 limits aggregate liability and indemnification damages for SLA performance breaches to 8% of total agreement value...",
      highlight: isVi ? "giới hạn trách nhiệm bồi thường" : "liability and indemnification",
      sourceDoc: "Contract_CUAD_042.pdf, Điều 12.2",
      agent: isVi ? "Trích xuất bởi AEGIS Agent" : "Extracted by AEGIS Agent",
      score: 0.98,
      risk: "Low"
    },
    {
      id: "cuad-89",
      code: "CUAD_089",
      type: "CONTRACT",
      title: isVi ? "Thỏa thuận Bảo mật Thông tin & Quyền Sở Hữu Trí Tuệ (NDA)" : "Mutual Non-Disclosure & IP Agreement (NDA)",
      client: "Alpha Corp",
      dept: "LEGAL",
      deptName: isVi ? "Pháp chế & R&D" : "Legal & R&D",
      value: "500.000.000 đ",
      numValue: 500000000,
      date: "10/02/2026",
      status: "VALID",
      statusText: isVi ? "Còn hiệu lực" : "Active",
      snippet: isVi
        ? "...Trách nhiệm liên đới và nghĩa vụ bồi thường toàn bộ thiệt hại phát sinh trực tiếp trong trường hợp làm lộ lọt mã nguồn, cơ sở dữ liệu tri thức hoặc bí mật kinh doanh..."
        : "...Joint liability and full indemnification obligations for direct damages arising from proprietary knowledge graph source code disclosure...",
      highlight: isVi ? "nghĩa vụ bồi thường" : "indemnification obligations",
      sourceDoc: "NDA_AlphaCorp_2026.pdf, p.3",
      agent: isVi ? "Phòng Pháp chế lưu trữ" : "Legal Vault Archive",
      score: 0.94,
      risk: "Low"
    },
    {
      id: "ct-18",
      code: "CT-2026-18",
      type: "CONTRACT",
      title: isVi ? "Hợp đồng Cung ứng Linh kiện Điện tử Sản xuất A" : "Component Supply Agreement — Line A",
      client: "Tập đoàn ABC (ABC Corporation)",
      dept: "SALES",
      deptName: isVi ? "Bán hàng (Sales)" : "Sales",
      value: "1.200.000.000 đ",
      numValue: 1200000000,
      date: "18/10/2026",
      status: "EXPIRING",
      statusText: isVi ? "Sắp hết hạn (<30 ngày)" : "Expiring in 12d",
      snippet: isVi
        ? "...Hợp đồng cung ứng linh kiện sản xuất chủ lực trị giá 1,2 tỷ VND. Quy định chế tài bồi thường phạt chậm giao hàng 0.5%/ngày..."
        : "...Manufacturing supply agreement worth 1.2B VND. Stipulates delay liquidated damages at 0.5% per calendar day...",
      highlight: isVi ? "bồi thường phạt chậm giao hàng" : "liquidated damages",
      sourceDoc: "Contract_CT-2026-18.pdf, p.2",
      agent: isVi ? "ERP Connector" : "ERP Connector",
      score: 0.89,
      risk: "High"
    }
  ];

  const CUSTOMER_RESULTS = [
    {
      id: "cust-881",
      code: "CUST-881",
      type: "CUSTOMER",
      name: "Alpha Corporation Vietnam Ltd.",
      tier: isVi ? "Doanh nghiệp Chiến lược (Enterprise Tier 1)" : "Strategic Enterprise Tier 1",
      revenue: "4.820.000.000 đ",
      orders: isVi ? "18 đơn hàng" : "18 orders",
      dept: "SALES",
      deptName: isVi ? "Bán hàng (Sales)" : "Sales",
      contact: "Tran M. Anh (Procurement Dir.)",
      status: "VALID",
      statusText: isVi ? "Đang giao dịch" : "Active Client",
      numValue: 4820000000,
      score: 0.95
    },
    {
      id: "cust-104",
      code: "CUST-104",
      type: "CUSTOMER",
      name: "Tập đoàn ABC (ABC Corporation)",
      tier: isVi ? "Khách hàng Trọng điểm" : "Key Account",
      revenue: "3.450.000.000 đ",
      orders: isVi ? "14 đơn hàng" : "14 orders",
      dept: "SALES",
      deptName: isVi ? "Bán hàng (Sales)" : "Sales",
      contact: "Lê V. Hùng (Purchasing Lead)",
      status: "EXPIRING",
      statusText: isVi ? "Cảnh báo sụt giảm 32%" : "Churn Warning 32%",
      numValue: 3450000000,
      score: 0.91
    },
    {
      id: "cust-502",
      code: "CUST-502",
      type: "CUSTOMER",
      name: "Delta Global Logistics JSC",
      tier: isVi ? "Đối tác Chuỗi Cung ứng" : "Supply Chain Partner",
      revenue: "2.100.000.000 đ",
      orders: isVi ? "9 đơn hàng" : "9 orders",
      dept: "OPS",
      deptName: isVi ? "Vận hành (Operations)" : "Operations",
      contact: "Ngô T. Bình (Logistics Dir.)",
      status: "VALID",
      statusText: isVi ? "Đang giao dịch" : "Active Client",
      numValue: 2100000000,
      score: 0.83
    }
  ];

  const PRODUCT_RESULTS = [
    {
      id: "prod-cloud-01",
      code: "PROD-CLOUD-01",
      type: "PRODUCT",
      name: "Cloud Knowledge Graph Hosting",
      desc: isVi ? "Hạ tầng lưu trữ đồ thị tri thức đám mây chuyên dụng, đang triển khai cho hợp đồng CUAD_042" : "Dedicated cloud knowledge graph hosting environment deployed for CUAD_042",
      dept: "LEGAL",
      deptName: isVi ? "Pháp chế & R&D" : "R&D",
      badge: isVi ? "Đang triển khai" : "Deployed",
      status: "VALID",
      statusText: isVi ? "Hoạt động" : "Active",
      value: "450.000.000 đ/năm",
      numValue: 450000000,
      score: 0.92
    },
    {
      id: "prod-ai-copilot",
      code: "PROD-AI-COPILOT",
      type: "PRODUCT",
      name: "Gói thuê bao Enterprise AI Copilot",
      desc: isVi ? "Bản quyền trợ lý AI thông minh hàng năm cho 50 người dùng doanh nghiệp kết nối GraphRAG" : "Enterprise AI Copilot annual license for 50 knowledge workers with GraphRAG",
      dept: "SALES",
      deptName: isVi ? "Bán hàng (Sales)" : "Sales",
      badge: isVi ? "Hoạt động" : "Active",
      status: "VALID",
      statusText: isVi ? "Hoạt động" : "Active",
      value: "680.000.000 đ/năm",
      numValue: 680000000,
      score: 0.88
    },
    {
      id: "prod-maint-247",
      code: "PROD-MAINT-247",
      type: "PRODUCT",
      name: "Dịch vụ Hỗ trợ Vận hành SLA 99.9%",
      desc: isVi ? "Bao gồm điều khoản giám sát rủi ro chuỗi cung ứng 24/7 và cam kết hoàn phí nếu vi phạm SLA" : "24/7 monitoring service with contractually guaranteed SLA service credits",
      dept: "OPS",
      deptName: isVi ? "Vận hành (Operations)" : "Operations",
      badge: "SLA 99.9%",
      status: "VALID",
      statusText: isVi ? "Hoạt động" : "Active",
      value: "240.000.000 đ/năm",
      numValue: 240000000,
      score: 0.85
    }
  ];

  const DOCUMENT_RESULTS = [
    {
      id: "sop-leg-004",
      code: "SOP-LEG-004",
      type: "DOCUMENT",
      title: isVi ? "SOP-LEG-004: Quy trình rà soát điều khoản bồi thường thiệt hại hợp đồng đối tác" : "SOP-LEG-004: Partner Contract Indemnity & Liability Audit Procedure",
      format: "PDF",
      dept: "LEGAL",
      deptName: isVi ? "Pháp chế & R&D" : "Legal & R&D",
      date: "12/08/2026",
      size: "2.4 MB",
      pages: isVi ? "18 trang" : "18 pages",
      status: "VALID",
      statusText: isVi ? "Đã duyệt" : "Verified",
      snippet: isVi
        ? "Tài liệu tiêu chuẩn hướng dẫn các bước rà soát ngưỡng giới hạn bồi thường, bảo hiểm trách nhiệm pháp lý và thủ tục hòa giải trước tòa."
        : "Standard operational procedure specifying liability cap thresholds, indemnification review steps, and dispute resolution.",
      score: 0.96
    },
    {
      id: "sop-fin-002",
      code: "SOP-FIN-002",
      type: "DOCUMENT",
      title: isVi ? "SOP-FIN-002: Hướng dẫn lập hóa đơn và đối soát công nợ dịch vụ Cloud RAG" : "SOP-FIN-002: Cloud RAG Invoicing & Reconciliation Guidelines",
      format: "DOCX",
      dept: "FINANCE",
      deptName: isVi ? "Kế toán & Tài chính" : "Finance",
      date: "05/09/2026",
      size: "1.1 MB",
      pages: isVi ? "12 trang" : "12 pages",
      status: "VALID",
      statusText: isVi ? "Đã duyệt" : "Verified",
      snippet: isVi
        ? "Quy trình đối soát tự động giữa hệ thống đo lường truy vấn đồ thị tri thức với phần mềm hóa đơn điện tử doanh nghiệp."
        : "Automated reconciliation guideline between Graph query metrics and ERP e-invoicing pipelines.",
      score: 0.89
    },
    {
      id: "sop-04",
      code: "SOP-04",
      type: "DOCUMENT",
      title: isVi ? "SOP-04: Quy trình Đối soát & Thu hồi Công nợ Khách hàng Doanh nghiệp" : "SOP-04: Enterprise Accounts Receivable Reconciliation Procedure",
      format: "DOCX",
      dept: "FINANCE",
      deptName: isVi ? "Kế toán & Tài chính" : "Finance",
      date: "20/09/2026",
      size: "8.6B VND",
      pages: isVi ? "8 trang" : "8 pages",
      status: "EXPIRING",
      statusText: isVi ? "Cần cập nhật" : "Needs Review",
      snippet: isVi
        ? "Tài liệu quy trình đối soát 8,6 tỷ VND công nợ quý 3 đối với khách hàng VIP, đang nằm trong hàng đợi xác thực thông tin."
        : "Internal procedure governing 8.6B VND enterprise receivables; currently pending departmental metadata sign-off.",
      score: 0.84
    }
  ];

  // Helper lọc đa chiều
  const matchesFacet = (item) => {
    if (filterDept !== "ALL" && item.dept !== filterDept) return false;
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (filterValue !== "ALL") {
      if (filterValue === "500M" && (!item.numValue || item.numValue < 500000000)) return false;
      if (filterValue === "1B" && (!item.numValue || item.numValue < 1000000000)) return false;
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      const corpus = `${item.title || ""} ${item.name || ""} ${item.code || ""} ${item.client || ""} ${item.snippet || ""} ${item.desc || ""} ${item.deptName || ""}`.toLowerCase();
      const matchesAnyToken = tokens.some((tok) => corpus.includes(tok));
      if (!matchesAnyToken && searchMode === "keyword") return false;
      if (!matchesAnyToken) return false;
    }
    return true;
  };

  const filteredContracts = CONTRACT_RESULTS.filter(matchesFacet);
  const filteredCustomers = CUSTOMER_RESULTS.filter(matchesFacet);
  const filteredProducts = PRODUCT_RESULTS.filter(matchesFacet);
  const filteredDocuments = DOCUMENT_RESULTS.filter(matchesFacet);

  const totalResultsCount =
    filteredContracts.length +
    filteredCustomers.length +
    filteredProducts.length +
    filteredDocuments.length;

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
            initials: currentUser?.avatar || "OP",
            bgGradient: "linear-gradient(135deg, #2563eb, #0284c7)",
            shadowColor: "rgba(37, 99, 235, 0.25)",
            title: isVi
              ? `Tác Nghiệp Khách Hàng — ${currentUser?.name || "Chuyên viên Nghiệp vụ"}`
              : `Client Operations Hub — ${currentUser?.name || "Operations Specialist"}`,
            badge: isVi ? (currentUser?.badge || "CHUYÊN VIÊN NGHIỆP VỤ") : "OPERATIONS SPECIALIST",
            badgeColor: "#2563eb",
            badgeBg: "rgba(37, 99, 235, 0.08)",
            badgeBorder: "rgba(37, 99, 235, 0.2)",
            subtitle: isVi
              ? `${currentUser?.department || "Phòng Nghiệp vụ & Vận hành"} · Ca làm việc: 08:00 - 17:30 · Phân quyền: Nghiệp vụ (Operations Tier)`
              : `${currentUser?.departmentEn || "Operations Department"} · Shift: 08:00 - 17:30 · Operations Access Tier`,
            tabTasksLabel: isVi ? "Ca Việc Của Tôi" : "My Assigned Cases",
            tabSearchLabel: isVi ? "Tra Cứu Quy Trình & Hợp Đồng" : "Search & Evidence",
            metric1Label: isVi ? "Hồ sơ cần xử lý hôm nay" : "Active Cases Today",
            metric1Val: assignedTasks.length > 0 ? `${pendingCount} / ${assignedTasks.length} ca` : "0 / 0 ca",
            metric1Sub: assignedTasks.length > 0 ? (isVi ? `${pendingCount} ca cần xử lý` : `${pendingCount} pending`) : (isVi ? "Chưa có ca việc cần xử lý" : "No active cases"),
            metric1Color: assignedTasks.length > 0 ? "#dc2626" : "var(--text-3)",
            metric2Label: isVi ? "Thời gian xử lý trung bình" : "Avg Resolution SLA",
            metric2Val: assignedTasks.length > 0 ? "1.4 giờ (SLA < 2h)" : "--",
            metric2Sub: assignedTasks.length > 0 ? (isVi ? "✓ Đạt chuẩn cam kết dịch vụ" : "Within enterprise SLA") : (isVi ? "Chưa ghi nhận ca làm việc" : "No active shifts"),
            metric2Color: assignedTasks.length > 0 ? "#059669" : "var(--text-3)",
            metric3Label: isVi ? "Khách hàng & Hợp đồng phụ trách" : "Assigned Accounts",
            metric3Val: assignedTasks.length > 0 ? "18 đơn vị" : "0 đơn vị",
            metric3Sub: assignedTasks.length > 0 ? (isVi ? "Bao gồm VIP ABC Corporation" : "Including VIP ABC Corp") : (isVi ? "Chưa gán tài khoản phụ trách" : "No accounts assigned"),
            metric3Color: assignedTasks.length > 0 ? "var(--cyan)" : "var(--text-3)",
            metric4Label: isVi ? "Trợ lực bởi AI Copilot" : "AI Copilot Assistance",
            metric4Val: assignedTasks.length > 0 ? "89.4%" : "--",
            metric4Sub: assignedTasks.length > 0 ? (isVi ? "Tiết kiệm ~2.5 giờ làm việc/ngày" : "Saves ~2.5 hours/day") : (isVi ? "Chưa có tương tác cùng AI" : "No AI sessions logged"),
            metric4Color: assignedTasks.length > 0 ? "#2563eb" : "var(--text-3)",
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
            {assignedTasks.length === 0 ? (
              <div style={{
                background: "var(--surface)",
                border: "1.5px dashed var(--border)",
                borderRadius: "var(--r-lg)",
                padding: "64px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.02)"
              }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.08)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  <i className="fa-solid fa-clipboard-list"></i>
                </div>
                <div style={{ maxWidth: "480px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 6px 0" }}>
                    {isVi ? "Chưa có ca tác nghiệp nào được phân công" : "No Operational Cases Assigned"}
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0, lineHeight: "1.5" }}>
                    {isVi
                      ? "Hộp ca việc của bạn hiện đang trống. Khi hệ thống phát hiện biến động tín hiệu khách hàng, hợp đồng sắp hết hạn hoặc quy trình SOP được phân công, các nhiệm vụ sẽ tự động hiển thị tại đây."
                      : "Your case queue is currently clear. Assigned operational tasks, churn alerts, and renewal notices will appear here in real-time."}
                  </p>
                </div>
              </div>
            ) : (
              assignedTasks.map((task) => {
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
            })
          )}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* TAB 2: SCREEN-020 ENTERPRISE MULTI-FACET SEARCH (STITCH UI)  */
        /* ============================================================ */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SCREEN-020 HEADER BANNER */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "20px 24px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-1)", margin: 0, letterSpacing: "-0.01em" }}>
                  SCREEN-020 — {isVi ? "Enterprise Multi-facet Search (Tìm Kiếm Hợp Nhất Đa Chiều)" : "Enterprise Multi-facet Search"}
                </h2>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "750",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "var(--surface-3)",
                  color: "var(--text-2)",
                  border: "1px solid var(--border-soft)",
                  fontFamily: "var(--f-mono)"
                }}>
                  M5 Module • 4 Sections Grouping
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                {isVi
                  ? "Tìm kiếm ngữ nghĩa kết hợp từ khóa trên Customer, Product, Contract và Document kèm bộ lọc đa chiều (phòng ban, ngày, giá trị, hiệu lực)."
                  : "Unified semantic & keyword retrieval across Customer, Product, Contract, and Document entities with multi-facet filters."}
              </p>
            </div>

            {/* Quick Engine Mode Switcher */}
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface-2)",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid var(--border)"
            }}>
              {[
                { id: "hybrid", label: isVi ? "Hybrid GraphRAG" : "Hybrid GraphRAG" },
                { id: "semantic", label: isVi ? "Vector Ngữ nghĩa" : "Vector" },
                { id: "keyword", label: isVi ? "Từ khóa chính xác" : "Keyword" }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSearchMode(m.id);
                    showToast(isVi ? `Chế độ máy tìm kiếm: ${m.label}` : `Search engine mode: ${m.label}`);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: searchMode === m.id ? "var(--surface)" : "transparent",
                    color: searchMode === m.id ? "var(--cyan)" : "var(--text-3)",
                    boxShadow: searchMode === m.id ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN SEARCH CONTAINER (STITCH CARD) */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            boxShadow: "var(--shadow-md)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            
            {/* TOP BAR: BIG SEARCH INPUT & FACETED FILTERS */}
            <div style={{
              padding: "24px 28px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}>
              
              {/* BIG SEARCH INPUT */}
              <div style={{ position: "relative", width: "100%", maxWidth: "860px", margin: "0 auto" }}>
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{
                    position: "absolute",
                    left: "18px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cyan)",
                    fontSize: "18px"
                  }}
                ></i>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isVi ? "Nhập từ khóa hoặc câu hỏi: Alpha Corp hợp đồng dịch vụ bồi thường..." : "Search entities, contracts, clauses, or questions..."}
                  style={{
                    width: "100%",
                    fontSize: "14.5px",
                    fontWeight: "500",
                    background: "var(--surface)",
                    color: "var(--text-1)",
                    border: "2px solid var(--border)",
                    borderRadius: "14px",
                    padding: "13px 180px 13px 48px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    outline: "none",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--cyan)";
                    e.target.style.boxShadow = "0 0 0 4px rgba(8, 145, 178, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                  }}
                />

                <div style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-4)",
                        cursor: "pointer",
                        padding: "4px 8px",
                        fontSize: "14px"
                      }}
                      title={isVi ? "Xóa tìm kiếm" : "Clear"}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                  <span style={{
                    fontSize: "11px",
                    fontFamily: "var(--f-mono)",
                    background: "var(--surface-3)",
                    color: "var(--text-3)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-soft)"
                  }}>
                    ⌘ + K
                  </span>
                  <button
                    onClick={() => showToast(isVi ? "Đang truy xuất kết quả tìm kiếm đa chiều..." : "Running multi-facet search...")}
                    className="btn primary sm"
                    style={{
                      borderRadius: "10px",
                      padding: "8px 18px",
                      fontWeight: "700",
                      boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)"
                    }}
                  >
                    {isSearching ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      isVi ? "Tìm kiếm" : "Search"
                    )}
                  </button>
                </div>
              </div>

              {/* MULTI-FACET FILTER CHIPS ROW (DROPDOWNS THEO STITCH SPEC) */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "12px",
                paddingTop: "4px"
              }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ color: "var(--text-3)", fontWeight: "750", display: "flex", alignItems: "center", gap: "6px" }}>
                    <i className="fa-solid fa-sliders" style={{ color: "var(--cyan)" }}></i>
                    {isVi ? "Bộ lọc đa chiều:" : "Multi-facet Filters:"}
                  </span>

                  {/* 1. Phòng ban Dropdown */}
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value="ALL">{isVi ? "Phòng ban: Tất cả" : "Dept: All"}</option>
                    <option value="LEGAL">{isVi ? "Phòng ban: Pháp chế & R&D" : "Dept: Legal & R&D"}</option>
                    <option value="SALES">{isVi ? "Phòng ban: Bán hàng (Sales)" : "Dept: Sales"}</option>
                    <option value="FINANCE">{isVi ? "Phòng ban: Kế toán & Tài chính" : "Dept: Finance"}</option>
                    <option value="OPS">{isVi ? "Phòng ban: Vận hành (Operations)" : "Dept: Operations"}</option>
                  </select>

                  {/* 2. Ngày tạo Dropdown */}
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value="ALL">{isVi ? "Ngày tạo: Toàn bộ thời gian" : "Created: All Time"}</option>
                    <option value="30D">{isVi ? "Ngày tạo: 30 ngày qua" : "Created: Past 30 Days"}</option>
                    <option value="2026">{isVi ? "Ngày tạo: Năm nay (2026)" : "Created: Year 2026"}</option>
                  </select>

                  {/* 3. Giá trị giao dịch Dropdown */}
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value="ALL">{isVi ? "Giá trị: Mọi mức" : "Value: Any Amount"}</option>
                    <option value="500M">{isVi ? "Giá trị: > 500 Triệu VNĐ" : "Value: > 500M VND"}</option>
                    <option value="1B">{isVi ? "Giá trị: > 1 Tỷ VNĐ" : "Value: > 1B VND"}</option>
                  </select>

                  {/* 4. Hiệu lực / Trạng thái Dropdown */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value="ALL">{isVi ? "Hiệu lực: Tất cả" : "Status: All"}</option>
                    <option value="VALID">{isVi ? "Hiệu lực: Còn hiệu lực" : "Status: Active"}</option>
                    <option value="EXPIRING">{isVi ? "Hiệu lực: Sắp hết hạn (<30 ngày)" : "Status: Expiring (<30d)"}</option>
                  </select>

                  {(filterDept !== "ALL" || filterDate !== "ALL" || filterValue !== "ALL" || filterStatus !== "ALL") && (
                    <button
                      onClick={() => {
                        setFilterDept("ALL");
                        setFilterDate("ALL");
                        setFilterValue("ALL");
                        setFilterStatus("ALL");
                        showToast(isVi ? "Đã đặt lại tất cả bộ lọc" : "Filters reset");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--cyan)",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      {isVi ? "Đặt lại lọc" : "Reset Filters"}
                    </button>
                  )}
                </div>

                {/* Right controls: View Toggle & Count */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "2px"
                  }}>
                    <button
                      onClick={() => setViewLayout("grouped")}
                      title={isVi ? "Xem theo 4 nhóm thực thể" : "Grouped View"}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: viewLayout === "grouped" ? "var(--surface-3)" : "transparent",
                        color: viewLayout === "grouped" ? "var(--cyan)" : "var(--text-3)",
                        fontSize: "12px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <i className="fa-solid fa-table-cells-large"></i>
                      <span>{isVi ? "Nhóm 4 mục" : "Sections"}</span>
                    </button>
                    <button
                      onClick={() => setViewLayout("table")}
                      title={isVi ? "Xem dạng bảng hợp nhất" : "Unified Table"}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: viewLayout === "table" ? "var(--surface-3)" : "transparent",
                        color: viewLayout === "table" ? "var(--cyan)" : "var(--text-3)",
                        fontSize: "12px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <i className="fa-solid fa-table-list"></i>
                      <span>{isVi ? "Bảng dữ liệu" : "Table"}</span>
                    </button>
                  </div>

                  <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>
                    {isVi ? "Tìm thấy" : "Found"}{" "}
                    <strong style={{ color: "var(--text-1)", fontWeight: "800" }}>{totalResultsCount} kết quả</strong>{" "}
                    {isVi ? "trong 4 nhóm thực thể" : "across 4 clusters"}
                  </span>
                </div>
              </div>

              {/* QUICK CATEGORY TABS ROW */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "2px" }}>
                {[
                  { id: "ALL", label: isVi ? "Tất cả kết quả" : "All Results", count: totalResultsCount, icon: "fa-layer-group" },
                  { id: "CONTRACT", label: isVi ? "Hợp Đồng & CUAD" : "Contracts", count: filteredContracts.length, icon: "fa-file-signature", color: "#6366f1" },
                  { id: "CUSTOMER", label: isVi ? "Khách Hàng (CRM)" : "Customers", count: filteredCustomers.length, icon: "fa-building", color: "#3b82f6" },
                  { id: "PRODUCT", label: isVi ? "Sản Phẩm & Dịch Vụ" : "Products", count: filteredProducts.length, icon: "fa-box-open", color: "#10b981" },
                  { id: "DOCUMENT", label: isVi ? "Tài Liệu & SOP" : "Documents", count: filteredDocuments.length, icon: "fa-file-lines", color: "#64748b" }
                ].map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: isActive ? "750" : "600",
                        cursor: "pointer",
                        border: `1px solid ${isActive ? "var(--cyan)" : "var(--border-soft)"}`,
                        background: isActive ? "var(--surface)" : "transparent",
                        color: isActive ? "var(--cyan)" : "var(--text-2)",
                        boxShadow: isActive ? "var(--shadow-sm)" : "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <i className={`fa-solid ${cat.icon}`} style={{ color: cat.color || "inherit" }}></i>
                      <span>{cat.label}</span>
                      <span style={{
                        fontSize: "10.5px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: isActive ? "var(--cyan-soft)" : "var(--surface-3)",
                        color: isActive ? "var(--cyan)" : "var(--text-3)",
                        fontFamily: "var(--f-mono)",
                        fontWeight: "700"
                      }}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* PROMPT SUGGESTIONS SHORTCUTS */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-4)", fontWeight: "600" }}>
                  {isVi ? "Gợi ý từ khóa mẫu:" : "Sample queries:"}
                </span>
                {SAMPLE_QUERIES.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(sq.text);
                      showToast(isVi ? `Đã chọn: ${sq.label}` : `Query set to ${sq.label}`);
                    }}
                    style={{
                      padding: "2px 8px",
                      background: "var(--surface)",
                      borderRadius: "6px",
                      border: "1px solid var(--border-soft)",
                      fontSize: "11.5px",
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

            {/* RESULTS CONTENT AREA */}
            <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>
              
              {totalResultsCount === 0 ? (
                /* EMPTY STATE (E1 STATE THEO SPEC) */
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px"
                }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "var(--surface-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    color: "var(--text-3)"
                  }}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                    {isVi ? "Không tìm thấy kết quả phù hợp — Hãy thử từ khóa khác" : "No Matching Results Found"}
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-3)", maxWidth: "480px", margin: 0, lineHeight: "1.5" }}>
                    {isVi
                      ? "Không có hợp đồng, khách hàng, sản phẩm hoặc tài liệu SOP nào khớp với tiêu chí lọc hiện tại. Bạn có thể xóa bớt bộ lọc hoặc gõ tên đối tác cụ thể."
                      : "Try loosening your filters, checking for spelling, or searching by generic keyword or entity code."}
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setFilterDept("ALL");
                      setFilterDate("ALL");
                      setFilterValue("ALL");
                      setFilterStatus("ALL");
                      setActiveCategory("ALL");
                    }}
                    className="btn sm"
                    style={{ marginTop: "8px" }}
                  >
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: "6px" }}></i>
                    {isVi ? "Xóa bộ lọc & Xem toàn bộ" : "Reset & Show All"}
                  </button>
                </div>
              ) : viewLayout === "table" ? (
                /* UNIFIED TABLE VIEW */
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Loại" : "Type"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Mã / Tên Thực Thể" : "Identifier / Name"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Phòng Ban" : "Department"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Giá Trị / Quy Mô" : "Scale / Value"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Hiệu Lực" : "Status"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase" }}>{isVi ? "Độ Tương Quan" : "Score"}</th>
                        <th style={{ padding: "10px 14px", fontWeight: "750", color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>{isVi ? "Thao Tác" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...filteredContracts.map((c) => ({ ...c, catLabel: "HỢP ĐỒNG", catColor: "#6366f1" })),
                        ...filteredCustomers.map((cu) => ({ ...cu, catLabel: "KHÁCH HÀNG", catColor: "#3b82f6", title: cu.name, value: cu.revenue })),
                        ...filteredProducts.map((p) => ({ ...p, catLabel: "SẢN PHẨM", catColor: "#10b981", title: p.name, value: p.value })),
                        ...filteredDocuments.map((d) => ({ ...d, catLabel: "TÀI LIỆU", catColor: "#64748b", value: d.size }))
                      ].map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-soft)", transition: "background 0.15s ease" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{
                              fontSize: "10.5px",
                              fontWeight: "800",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "var(--surface-3)",
                              color: row.catColor,
                              fontFamily: "var(--f-mono)"
                            }}>
                              {row.catLabel}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: "700", color: "var(--text-1)" }}>{row.title}</div>
                            <div style={{ fontSize: "11.5px", color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{row.code}</div>
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--text-2)" }}>{row.deptName}</td>
                          <td style={{ padding: "12px 14px", fontWeight: "700", color: "var(--text-1)" }}>{row.value || "--"}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: row.status === "VALID" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                              color: row.status === "VALID" ? "#059669" : "#d97706"
                            }}>
                              {row.statusText}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", fontFamily: "var(--f-mono)", color: "var(--cyan)", fontWeight: "700" }}>
                            {Math.round(row.score * 100)}%
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => {
                                  onNavigate?.("graph");
                                  showToast(isVi ? `Đang mở ${row.code} trên Đồ thị Tri thức` : `Opening ${row.code} in Graph`);
                                }}
                                className="btn sm"
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                title={isVi ? "Xem trên đồ thị" : "View on Graph"}
                              >
                                <i className="fa-solid fa-circle-nodes" style={{ color: "var(--cyan)" }}></i>
                              </button>
                              <button
                                onClick={() => {
                                  onNavigate?.("documents");
                                  showToast(isVi ? `Đang mở hồ sơ tài liệu của: ${row.title}` : `Opening dossier for: ${row.title}`);
                                }}
                                className="btn sm"
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                title={isVi ? "Xem trước tài liệu" : "Preview Document"}
                              >
                                <i className="fa-solid fa-file-lines"></i>
                              </button>
                              <button
                                onClick={() => {
                                  onNavigate?.("copilot");
                                  showToast(isVi ? "Đang mở phiên phân tích cùng Copilot" : "Opening Copilot session");
                                }}
                                className="btn primary sm"
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                title={isVi ? "Hỏi AI Copilot" : "Ask Copilot"}
                              >
                                <i className="fa-solid fa-brain"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* GROUPED SECTIONS (4 SECTIONS THEO ĐÚNG STITCH UI) */
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  
                  {/* SECTION 1: HỢP ĐỒNG & ĐIỀU KHOẢN PHÁP LÝ (CUAD) */}
                  {(activeCategory === "ALL" || activeCategory === "CONTRACT") && filteredContracts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1.5px solid var(--border)",
                        paddingBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "var(--text-1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: 0
                        }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }}></span>
                          <span>{isVi ? "Hợp Đồng & Điều Khoản Pháp Lý (CUAD)" : "Contracts & Legal Clauses (CUAD)"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#6366f1",
                            background: "rgba(99, 102, 241, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid rgba(99, 102, 241, 0.2)"
                          }}>
                            {filteredContracts.length} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                        <button
                          onClick={() => {
                            setActiveCategory("CONTRACT");
                            showToast(isVi ? "Đã lọc hiển thị nhóm Hợp đồng" : "Filtered by contracts");
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--cyan)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                        >
                          {isVi ? "Lọc riêng nhóm này →" : "View group →"}
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "14px" }}>
                        {filteredContracts.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-lg)",
                              padding: "18px 20px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              boxShadow: "var(--shadow-sm)",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "800",
                                  fontFamily: "var(--f-mono)",
                                  background: "rgba(99, 102, 241, 0.1)",
                                  color: "#4f46e5",
                                  padding: "2px 7px",
                                  borderRadius: "4px"
                                }}>
                                  {c.code}
                                </span>
                                <span style={{ fontSize: "13.5px", fontWeight: "750", color: "var(--text-1)" }}>
                                  {c.title}
                                </span>
                              </div>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: c.status === "VALID" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                color: c.status === "VALID" ? "#059669" : "#d97706",
                                whiteSpace: "nowrap"
                              }}>
                                {c.statusText}
                              </span>
                            </div>

                            <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0 }}>
                              {isVi ? "Đối tác:" : "Client:"} <strong style={{ color: "var(--text-1)" }}>{c.client}</strong> • {isVi ? "Giá trị:" : "Value:"} <strong style={{ color: "var(--text-1)" }}>{c.value}</strong> • {isVi ? "Ký:" : "Signed:"} {c.date}
                            </p>

                            {/* HIGHLIGHTED SNIPPET BOX */}
                            <div style={{
                              background: "rgba(245, 158, 11, 0.08)",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "12px",
                              color: "var(--text-1)",
                              lineHeight: "1.6"
                            }}>
                              <span style={{ fontWeight: "700", color: "#b45309", marginRight: "4px" }}>
                                {isVi ? "Phù hợp từ khóa:" : "Matching excerpt:"}
                              </span>
                              <span>
                                {c.snippet.split(c.highlight).map((part, i, arr) => (
                                  <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                      <mark style={{ background: "#fde68a", color: "#78350f", padding: "1px 4px", borderRadius: "3px", fontWeight: "700" }}>
                                        {c.highlight}
                                      </mark>
                                    )}
                                  </React.Fragment>
                                ))}
                              </span>
                            </div>

                            {/* CARD FOOTER */}
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingTop: "10px",
                              borderTop: "1px solid var(--border-soft)",
                              fontSize: "11.5px",
                              color: "var(--text-4)"
                            }}>
                              <span>{c.agent} • {c.sourceDoc}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <button
                                  onClick={() => {
                                    onNavigate?.("copilot");
                                    showToast(isVi ? "Đang gửi yêu cầu phân tích hợp đồng sang Copilot..." : "Switching to Copilot...");
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--cyan)", fontWeight: "700", cursor: "pointer", fontSize: "12px" }}
                                >
                                  {isVi ? "Hỏi AI Copilot" : "Ask Copilot"}
                                </button>
                                <button
                                  onClick={() => {
                                    onNavigate?.("graph");
                                    showToast(isVi ? `Đang định vị ${c.code} trên Đồ thị Tri thức` : `Locating ${c.code} on Graph`);
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--text-2)", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                                >
                                  {isVi ? "Xem trên đồ thị" : "Graph"}
                                </button>
                                <button
                                  onClick={() => {
                                    onNavigate?.("documents");
                                    showToast(isVi ? `Mở tài liệu ${c.sourceDoc}` : `Opening ${c.sourceDoc}`);
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--text-2)", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                                >
                                  {isVi ? "Xem trước" : "Preview"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: KHÁCH HÀNG (CUSTOMER — CRM ADVENTUREWORKS) */}
                  {(activeCategory === "ALL" || activeCategory === "CUSTOMER") && filteredCustomers.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1.5px solid var(--border)",
                        paddingBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "var(--text-1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: 0
                        }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}></span>
                          <span>{isVi ? "Khách Hàng (Customer — AdventureWorks CRM)" : "Customers (AdventureWorks CRM)"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#3b82f6",
                            background: "rgba(59, 130, 246, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid rgba(59, 130, 246, 0.2)"
                          }}>
                            {filteredCustomers.length} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                        <button
                          onClick={() => {
                            setActiveCategory("CUSTOMER");
                            showToast(isVi ? "Đã lọc danh sách Khách hàng" : "Filtered by customers");
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--cyan)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                        >
                          {isVi ? "Xem trong CRM →" : "View in CRM →"}
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "14px" }}>
                        {filteredCustomers.map((cust) => (
                          <div
                            key={cust.id}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-lg)",
                              padding: "18px 20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "14px",
                              boxShadow: "var(--shadow-sm)"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-1)" }}>
                                  {cust.name}
                                </span>
                                <span style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  fontFamily: "var(--f-mono)",
                                  background: "rgba(59, 130, 246, 0.1)",
                                  color: "#2563eb",
                                  padding: "2px 6px",
                                  borderRadius: "4px"
                                }}>
                                  {cust.code}
                                </span>
                              </div>
                              <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0 }}>
                                {isVi ? "Nhóm khách hàng:" : "Segment:"} <strong style={{ color: "var(--text-2)" }}>{cust.tier}</strong>
                              </p>
                              <p style={{ fontSize: "12px", color: "var(--text-2)", margin: 0 }}>
                                {isVi ? "Doanh thu lũy kế:" : "Cumulative Revenue:"} <strong style={{ color: "var(--text-1)", fontWeight: "800" }}>{cust.revenue}</strong> ({cust.orders})
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                onNavigate?.("graph");
                                showToast(isVi ? `Mở liên kết thực thể ${cust.name} trên đồ thị` : `Opening graph for ${cust.name}`);
                              }}
                              className="btn sm"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "7px 14px",
                                fontSize: "12px",
                                flexShrink: 0
                              }}
                            >
                              <i className="fa-solid fa-circle-nodes" style={{ color: "var(--cyan)" }}></i>
                              <span>{isVi ? "Đồ thị" : "Graph"}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: SẢN PHẨM & DỊCH VỤ CUNG CẤP (ERP) */}
                  {(activeCategory === "ALL" || activeCategory === "PRODUCT") && filteredProducts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1.5px solid var(--border)",
                        paddingBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "var(--text-1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: 0
                        }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                          <span>{isVi ? "Sản Phẩm & Dịch Vụ Cung Cấp" : "Products & Enterprise Services"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid rgba(16, 185, 129, 0.2)"
                          }}>
                            {filteredProducts.length} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                        {filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-lg)",
                              padding: "16px 18px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              boxShadow: "var(--shadow-sm)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{
                                fontSize: "10.5px",
                                fontWeight: "800",
                                fontFamily: "var(--f-mono)",
                                background: "rgba(16, 185, 129, 0.1)",
                                color: "#059669",
                                padding: "2px 6px",
                                borderRadius: "4px"
                              }}>
                                {p.code}
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "#059669" }}>
                                {p.value}
                              </span>
                            </div>
                            <h4 style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                              {p.name}
                            </h4>
                            <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, lineHeight: "1.5" }}>
                              {p.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 4: TÀI LIỆU & QUY TRÌNH SOP NỘI BỘ (DOCUMENT EXPLORER) */}
                  {(activeCategory === "ALL" || activeCategory === "DOCUMENT") && filteredDocuments.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1.5px solid var(--border)",
                        paddingBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "var(--text-1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: 0
                        }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#64748b", display: "inline-block" }}></span>
                          <span>{isVi ? "Tài Liệu & Quy Trình SOP Nội Bộ (Document Explorer)" : "Internal Documents & SOPs"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#64748b",
                            background: "var(--surface-3)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid var(--border)"
                          }}>
                            {filteredDocuments.length} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-md)",
                              padding: "14px 18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "14px",
                              transition: "all 0.15s ease",
                              boxShadow: "var(--shadow-sm)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                              <div style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "8px",
                                background: doc.format === "PDF" ? "rgba(239, 68, 68, 0.1)" : "rgba(37, 99, 235, 0.1)",
                                color: doc.format === "PDF" ? "#dc2626" : "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                                fontSize: "12px",
                                flexShrink: 0
                              }}>
                                {doc.format}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <h4 style={{ fontSize: "13.5px", fontWeight: "750", color: "var(--text-1)", margin: 0 }}>
                                  {doc.title}
                                </h4>
                                <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>
                                  {doc.deptName} • {isVi ? "Ngày nạp:" : "Uploaded:"} {doc.date} • {doc.size} ({doc.pages})
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button
                                onClick={() => {
                                  onNavigate?.("documents");
                                  showToast(isVi ? `Đang mở tài liệu: ${doc.title}` : `Opening ${doc.title}`);
                                }}
                                className="btn sm"
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                              >
                                <i className="fa-solid fa-file-lines" style={{ marginRight: "6px", color: "var(--amber)" }}></i>
                                {isVi ? "Xem tài liệu" : "Preview"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
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
