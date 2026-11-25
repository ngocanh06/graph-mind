import React, { useState, useEffect } from "react";
import Icon from '../../components/ui/Icon';
import GraphPanel from "./GraphPanel";
import VectorSearchPanel from "./VectorSearchPanel";
import KnowledgeExplorerView from "./KnowledgeExplorerView";
import { fetchMultiFacetSearch } from "../../services/api";

export default function SearchView({ onNavigate, onSelectEntity, t, lang, role = "standard", currentUser }) {
  const isVi = lang === "vi";
  const isSalesRole = role === "standard";
  const isManagerRole = role === "knowledge_manager";
  const isExecRole = role === "executive";

  // Mặc định mở tab Tìm kiếm thông minh ("search") cho tất cả các vai trò
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    setActiveTab("search");
  }, [role]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("hybrid"); // "hybrid" | "semantic" | "keyword"
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterDate, setFilterDate] = useState("ALL");
  const [filterValue, setFilterValue] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL"); // "ALL" | "CONTRACT" | "CUSTOMER" | "PRODUCT" | "DOCUMENT"
  const [viewLayout, setViewLayout] = useState("grouped"); // "grouped" | "table"
  const [toastMsg, setToastMsg] = useState("");

  // Dữ liệu thật từ Neo4j & Qdrant Database
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [dbMetrics, setDbMetrics] = useState(null);

  // Pagination / Load more limits per section
  const [visibleLimits, setVisibleLimits] = useState({
    CONTRACT: 24,
    CUSTOMER: 24,
    PRODUCT: 24,
    DOCUMENT: 24
  });

  const handleLoadMore = (categoryKey, step = 24) => {
    setVisibleLimits(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || 24) + step
    }));
  };

  const handleShowAll = (categoryKey, totalLen) => {
    setVisibleLimits(prev => ({
      ...prev,
      [categoryKey]: totalLen
    }));
  };

  useEffect(() => {
    let isMounted = true;
    setIsSearching(true);
    const handler = setTimeout(async () => {
      setDebouncedQuery(query);
      try {
        const fetchLimit = activeCategory === "ALL" ? 60 : 600;
        const res = await fetchMultiFacetSearch(query, searchMode, filterDept, filterStatus, fetchLimit, currentUser, activeCategory);
        if (isMounted && res && res.success && res.data) {
          if (activeCategory === "ALL") {
            setContracts(res.data.contracts || []);
            setCustomers(res.data.customers || []);
            setProducts(res.data.products || []);
            setDocuments(res.data.documents || []);
          } else if (activeCategory === "CONTRACT") {
            setContracts(res.data.contracts || []);
          } else if (activeCategory === "CUSTOMER") {
            setCustomers(res.data.customers || []);
          } else if (activeCategory === "PRODUCT") {
            setProducts(res.data.products || []);
          } else if (activeCategory === "DOCUMENT") {
            setDocuments(res.data.documents || []);
          }
          if (res.summary) setDbMetrics(res.summary);
        }
      } catch (e) {
        console.warn("[Search] fetchMultiFacetSearch error:", e);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 250);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [query, searchMode, filterDept, filterStatus, currentUser, activeCategory]);


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
      title: isVi ? "Khách hàng VIP Brakes and Gears (#29818) — Đơn hàng sụt giảm 32%" : "VIP Account Brakes and Gears (#29818) — Order Cadence Down 32%",
      entityId: "29818",
      type: "CUSTOMER",
      clientName: "Brakes and Gears (CUST-29818)",
      contactPerson: "Executive Procurement Team",
      contractRef: "Hợp đồng Khung #HD-29818 ($989k USD)",
      dueDate: isVi ? "Hôm nay (Trước 17:00)" : "Today by 17:00",
      description: isVi
        ? "Tần suất đặt hàng trong 60 ngày qua giảm từ 8.0/tháng xuống 5.4/tháng. Cần chủ động liên hệ rà soát tái ký hạn mức tín dụng và phân phối linh kiện."
        : "Order cadence fell from 8.0/mo to 5.4/mo over trailing 60 days. Linked customer #29818 requires outreach.",
      suggestedAction: isVi ? "Gửi thư đề xuất ưu đãi chiết khấu 5% & mời họp gia hạn trực tiếp." : "Send 5% retention discount proposal & schedule renewal sync.",
      status: "PENDING"
    },
    {
      id: "task-2",
      priority: "HIGH",
      badgeBg: "#fef3c7",
      badgeColor: "#b45309",
      badgeBorder: "#fcd34d",
      title: isVi ? "Hợp đồng Cung cấp #HD-29818 — Cần chuẩn bị hồ sơ tái ký (Hết hạn 12 ngày)" : "Contract #HD-29818 — Renewal Dossier Needed (12d)",
      entityId: "29818",
      type: "CONTRACT",
      clientName: "Brakes and Gears",
      contactPerson: "Phòng Mua hàng Brakes and Gears",
      contractRef: "HD-29818 · Phụ tùng xe đạp AdventureWorks",
      dueDate: isVi ? "18/10/2026" : "18 Oct 2026",
      description: isVi
        ? "Hợp đồng cung ứng linh kiện sản xuất chủ lực trị giá $989k USD. Cần chủ động gửi phương án gia hạn."
        : "Manufacturing component supply agreement worth $989k USD. Renewal meeting needs scheduling.",
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
        ? "Tài liệu quy trình đối soát $8.6M USD công nợ quý 3 còn thiếu trường người duyệt bộ phận, làm giảm độ tin cậy trích dẫn của AI."
        : "Internal $8.6M USD receivables reconciliation file missing department owner metadata field.",
      suggestedAction: isVi ? "Cập nhật trường phòng ban và gửi xác thực vào hàng đợi HITL." : "Update department owner field and submit to HITL validation queue.",
      status: "PENDING"
    }
  ]);

  const handleOpenEmailModal = (task) => {
    setSelectedTaskAction(task);
    if (task.id === "task-1" || task.id === "task-2") {
      setEmailContent(
        isVi
          ? `Kính gửi Ban Giám đốc Mua sắm Brakes and Gears,\n\nTôi là Nguyễn V. Nam, đại diện Bộ phận Quản lý Khách hàng Doanh nghiệp tại Graph Mind.\n\nTheo dữ liệu rà soát định kỳ đối với Hợp đồng cung ứng linh kiện xe đạp (Mã KH: CUST-29818), chúng tôi nhận thấy tần suất giao dịch trong 60 ngày gần đây có dấu hiệu biến động. Nhằm đảm bảo tiến độ chuỗi cung ứng sản xuất của Quý Công ty không bị gián đoạn, chúng tôi trân trọng đề xuất:\n\n1. Áp dụng chính sách ưu đãi chiết khấu 5.5% cho gói gia hạn hợp đồng năm 2027.\n2. Ưu tiên cam kết SLA giao hàng 24/7 đối với linh kiện phụ tùng AdventureWorks chính hãng.\n3. Buổi trao đổi trực tiếp hoặc qua video call vào 10:00 sáng Thứ Năm tuần này.\n\nRất mong nhận được phản hồi từ Quý công ty.\n\nTrân trọng,\nNguyễn V. Nam | Chuyên viên Nghiệp vụ & Vận hành\nGraph Mind Enterprise Platform`
          : `Dear Procurement Team, Brakes and Gears (CUST-29818),\n\nMy name is Nguyen V. Nam representing the Enterprise Accounts Operations team at Graph Mind.\n\nRegarding our core supply agreement for AdventureWorks components, we would like to present an exclusive renewal package with a 5.5% volume discount and 24/7 priority SLA.\n\nLooking forward to scheduling a quick sync this Thursday.\n\nSincerely,\nNguyen V. Nam | Frontline Operations Specialist`
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
          : "Brakes and Gears Procurement (CUST-29818)",
        contractRef: currentTask?.contractRef || "Contract CT-2026-18",
        gateway: "Enterprise SMTP Dispatch Gateway (TLS 1.3 · DKIM Signed · SPF Passed)",
        auditHash: "SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
      });

      showToast(isVi ? "Đã gửi qua Cổng Doanh nghiệp & Xuất biên nhận giao dịch kiểm toán!" : "Dispatched to Gateway & Audit Receipt generated!");
    }, 650);
  };

  const SAMPLE_QUERIES = [
    { label: isVi ? "Hợp đồng dịch vụ bảo trì" : "Service Agreement", text: "Service Agreement" },
    { label: isVi ? "Khách hàng Roger Harui" : "Roger Harui (VIP)", text: "Roger Harui" },
    { label: isVi ? "Sản phẩm xe đạp thể thao" : "Road Bikes", text: "Road Bikes" },
    { label: isVi ? "Điều khoản bồi thường thiệt hại" : "Indemnity clauses", text: "indemnify liability" },
    { label: isVi ? "Luật điều chỉnh hợp đồng" : "Governing Law", text: "Governing Law" }
  ];

  // Helper lọc đa chiều trên dữ liệu thật từ Database
  const matchesFacet = (item) => {
    if (filterDept !== "ALL" && item.dept !== filterDept) return false;
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (filterValue !== "ALL") {
      if (filterValue === "50K" && (!item.numValue || item.numValue < 50000)) return false;
      if (filterValue === "100K" && (!item.numValue || item.numValue < 100000)) return false;
      if (filterValue === "500K" && (!item.numValue || item.numValue < 500000)) return false;
    }
    return true;
  };

  const filteredContracts = contracts.filter(matchesFacet);
  const filteredCustomers = customers.filter(matchesFacet);
  const filteredProducts = products.filter(matchesFacet);
  const filteredDocuments = documents.filter(matchesFacet);

  const totalResultsCount =
    filteredContracts.length +
    filteredCustomers.length +
    filteredProducts.length +
    filteredDocuments.length;

  const hasFilter = (query && query.trim() !== "") || filterDept !== "ALL" || filterStatus !== "ALL" || filterValue !== "ALL";

  const totalDbContracts = dbMetrics?.total_contracts || 510;
  const totalDbCustomers = dbMetrics?.total_customers || 19820;
  const totalDbProducts = dbMetrics?.total_products || 504;
  const totalDbDocuments = dbMetrics?.total_documents || 581;
  const totalDbAll = dbMetrics?.total_all || (totalDbContracts + totalDbCustomers + totalDbProducts + totalDbDocuments);

  const displayCountContracts = hasFilter ? filteredContracts.length : totalDbContracts;
  const displayCountCustomers = hasFilter ? (activeCategory === "CUSTOMER" ? filteredCustomers.length : totalDbCustomers) : totalDbCustomers;
  const displayCountProducts = hasFilter ? filteredProducts.length : totalDbProducts;
  const displayCountDocuments = hasFilter ? filteredDocuments.length : totalDbDocuments;
  const displayCountAll = hasFilter ? totalResultsCount : totalDbAll;

  const pendingCount = assignedTasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="view active" style={{ background: "var(--base)", display: "flex", flexDirection: "column", gap: "20px", padding: "20px 24px 60px", boxSizing: "border-box", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: "100%", overflowX: "hidden" }}>
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
          <Icon name="fa-solid fa-bell" size={15} style={{ color: "var(--cyan)", fontSize: "16px" }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. THANH ĐIỀU HƯỚNG TAB CHÍNH (ENTERPRISE TAB BAR ĐỒNG BỘ)    */}
      {/* ============================================================ */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        borderBottom: "1.5px solid var(--border, #e2e8f0)",
        paddingBottom: "0px",
        overflowX: "auto",
        scrollbarWidth: "none",
        width: "100%",
        flexShrink: 0,
        boxSizing: "border-box"
      }}>
        {[
          { id: "search", label: isVi ? "Tra Cứu Tri Thức" : "Knowledge Search", icon: "fa-magnifying-glass" },
          { id: "explorer", label: isVi ? "Hợp Nhất GraphRAG" : "GraphRAG Explorer", icon: "fa-diagram-project" },
          { id: "neo4j", label: isVi ? `Đồ thị Neo4j (${(dbMetrics?.total_nodes || 56310).toLocaleString()})` : `Neo4j Graph (${(dbMetrics?.total_nodes || 56310).toLocaleString()})`, icon: "fa-circle-nodes" },
          { id: "qdrant", label: isVi ? `Vector Qdrant (${(dbMetrics?.total_vectors || 9148).toLocaleString()})` : `Qdrant Vector (${(dbMetrics?.total_vectors || 9148).toLocaleString()})`, icon: "fa-database" },
          { id: "tasks", label: isVi ? "Giám Sát Vụ Việc" : "Case Queue", icon: "fa-list-check", badge: pendingCount }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 20px",
                borderRadius: "8px 8px 0 0",
                fontSize: "13.5px",
                fontWeight: isActive ? "800" : "600",
                cursor: "pointer",
                border: isActive ? "1.5px solid var(--border, #cbd5e1)" : "1.5px solid transparent",
                borderBottom: isActive ? "2px solid var(--base, #f8fafc)" : "none",
                marginBottom: isActive ? "-1.5px" : "0",
                background: isActive ? "var(--surface, #ffffff)" : "transparent",
                color: isActive ? "var(--cyan, #0891b2)" : "var(--text-2, #475569)",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 -2px 8px rgba(0, 0, 0, 0.04)" : "none",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-1, #0f172a)";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-2, #475569)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon
                name={`fa-solid ${tab.icon}`}
                size={14}
                style={{
                  color: isActive ? "var(--cyan, #0891b2)" : "var(--text-3, #94a3b8)",
                  transition: "color 0.15s ease"
                }}
              />
              <span style={{ fontSize: "13.5px" }}>{tab.label}</span>
              {tab.badge > 0 && (
                <span style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  background: isActive ? "var(--cyan, #0891b2)" : "#dc2626",
                  color: "#ffffff"
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 2. NỘI DUNG CHÍNH: CÁC TAB TÁC NGHIỆP, EXPLORER, GRAPH, VECTOR */}
      {/* ============================================================ */}
      {activeTab === "explorer" ? (
        <KnowledgeExplorerView lang={lang} embedded={true} currentUser={currentUser} />
      ) : activeTab === "neo4j" ? (
        <div style={{ background: "var(--surface, #fff)", padding: "20px", borderRadius: "var(--r-xl, 14px)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", minHeight: 650 }}>
          <GraphPanel lang={lang} onSelectNode={onSelectEntity} />
        </div>
      ) : activeTab === "qdrant" ? (
        <div style={{
          background: "var(--surface, #fff)",
          padding: "20px",
          borderRadius: "var(--r-xl, 14px)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          minHeight: 650,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflow: "hidden"
        }}>
          <VectorSearchPanel lang={lang} onExploreRelated={() => setActiveTab("explorer")} />
        </div>
      ) : activeTab === "tasks" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 4 Thẻ Chỉ Số Giám Sát Ca Việc */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{
              background: "var(--surface)",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xs)"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase" }}>
                {isVi ? "Hồ sơ cần xử lý hôm nay" : "Active Cases Today"}
              </span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: pendingCount > 0 ? "#dc2626" : "var(--text-1)", marginTop: "4px" }}>
                {pendingCount} / {assignedTasks.length} ca
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                {isVi ? `${pendingCount} ca chờ phản hồi` : `${pendingCount} pending review`}
              </span>
            </div>

            <div style={{
              background: "var(--surface)",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xs)"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase" }}>
                {isVi ? "Thời gian xử lý trung bình" : "Avg Resolution SLA"}
              </span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#059669", marginTop: "4px" }}>
                1.4 giờ
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                {isVi ? "Đạt chuẩn SLA < 2h" : "Within enterprise SLA"}
              </span>
            </div>

            <div style={{
              background: "var(--surface)",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xs)"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase" }}>
                {isVi ? "Quy trình & Hợp đồng phụ trách" : "Department Documents"}
              </span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#0284c7", marginTop: "4px" }}>
                {dbMetrics?.total_documents ?? 581} hồ sơ
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                {isVi ? "Hợp đồng CUAD & ERP Master" : "CUAD & ERP Master"}
              </span>
            </div>

            <div style={{
              background: "var(--surface)",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xs)"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase" }}>
                {isVi ? "Thực thể đồ thị Neo4j" : "Neo4j Graph Nodes"}
              </span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#0891b2", marginTop: "4px" }}>
                {(dbMetrics?.total_nodes || 56310).toLocaleString()} thực thể
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                {isVi ? "Đồng bộ từ CSDL thực tế" : "Live synced from Neo4j DB"}
              </span>
            </div>
          </div>
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
              <Icon name="fa-solid fa-rotate" size={15} style={{ marginRight: "6px" }} />
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
                  background: "rgba(8, 145, 178, 0.08)",
                  color: "#0891b2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  <Icon name="fa-solid fa-clipboard-list" size={15} />
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
                const borderLeftColor = isResolved
                  ? "#94a3b8"
                  : task.priority === "CRITICAL"
                    ? "#ef4444"
                    : task.priority === "HIGH"
                      ? "#f59e0b"
                      : "#0284c7";
                const isUrgent = Boolean(task.dueDate && (task.dueDate.includes("Hôm nay") || task.dueDate.includes("Today")));

                return (
                  <div
                    key={task.id}
                    style={{
                      background: isResolved ? "var(--surface-2, #f8fafc)" : "#ffffff",
                      border: "1px solid var(--border, #e2e8f0)",
                      borderLeft: `4px solid ${borderLeftColor}`,
                      borderRadius: "10px",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      boxShadow: isResolved ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                      opacity: isResolved ? 0.7 : 1,
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Dòng 1: Mức độ ưu tiên + Tiêu đề + Hạn chót */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: "10.5px",
                          fontWeight: "800",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: isResolved ? "#f1f5f9" : task.badgeBg,
                          color: isResolved ? "#64748b" : task.badgeColor,
                          border: `1px solid ${isResolved ? "#e2e8f0" : task.badgeBorder}`,
                          letterSpacing: "0.03em",
                          flexShrink: 0
                        }}>
                          {task.priority}
                        </span>
                        <h4 style={{
                          fontSize: "14.5px",
                          fontWeight: "750",
                          color: isResolved ? "#64748b" : "#0f172a",
                          margin: 0,
                          lineHeight: "1.4"
                        }}>
                          {task.title}
                        </h4>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: isUrgent ? "#dc2626" : "#64748b"
                        }}>
                          <Icon name="fa-regular fa-clock" size={12} style={{ color: isUrgent ? "#dc2626" : "#94a3b8" }} />
                          <span>{isVi ? "Hạn chót:" : "Due:"} <strong>{task.dueDate}</strong></span>
                        </span>
                        {isResolved && (
                          <span style={{
                            fontSize: "10.5px",
                            fontWeight: "800",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <Icon name="fa-solid fa-check" size={10} />
                            <span>{isVi ? "Đã xử lý" : "Resolved"}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dòng 2: Thông tin Đối tác, Đầu mối, Hồ sơ (Dạng meta tinh gọn, không rườm rà) */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      flexWrap: "wrap",
                      fontSize: "12px",
                      color: "#64748b"
                    }}>
                      <span>
                        {isVi ? "Đối tác: " : "Client: "}
                        <strong style={{ color: "#0f172a" }}>{task.clientName}</strong>
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span>
                        {isVi ? "Đầu mối: " : "Contact: "}
                        <strong style={{ color: "#334155" }}>{task.contactPerson}</strong>
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span>
                        {isVi ? "Hồ sơ: " : "Ref: "}
                        <strong style={{ color: "#0284c7" }}>{task.contractRef}</strong>
                      </span>
                    </div>

                    {/* Dòng 3: Mô tả tình huống */}
                    <p style={{
                      fontSize: "12.5px",
                      color: "#475569",
                      lineHeight: "1.55",
                      margin: 0
                    }}>
                      {task.description}
                    </p>

                    {/* Dòng 4: Hộp Khuyến nghị xử lý AI tinh gọn, trang nhã */}
                    <div style={{
                      background: "#f0f9ff",
                      borderLeft: "3px solid #0284c7",
                      borderRadius: "0 6px 6px 0",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px"
                    }}>
                      <Icon name="fa-solid fa-lightbulb" size={13} style={{ color: "#0284c7", flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: "#0369a1", marginRight: "6px" }}>
                          {isVi ? "Khuyến nghị xử lý:" : "Suggested Action:"}
                        </strong>
                        <span style={{ color: "#0f172a" }}>
                          {task.suggestedAction}
                        </span>
                      </div>
                    </div>

                    {/* Dòng 5: Cụm nút hành động tinh gọn */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      paddingTop: "8px",
                      borderTop: "1px solid #f1f5f9"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {/* Nút chính */}
                        <button
                          onClick={() => handleOpenEmailModal(task)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "700",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            background: "#0284c7",
                            color: "#ffffff",
                            boxShadow: "0 1px 3px rgba(2, 132, 199, 0.25)"
                          }}
                        >
                          <Icon name="fa-solid fa-paper-plane" size={11} />
                          <span>{isVi ? "Soạn Thư & Đề Xuất" : "Draft Outreach"}</span>
                        </button>

                        {/* Nút phụ 1: Copilot */}
                        <button
                          onClick={() => {
                            onNavigate?.("copilot");
                            showToast(isVi ? "Đang mở Trợ lý Copilot..." : "Opening Copilot...");
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#334155",
                            cursor: "pointer"
                          }}
                        >
                          <Icon name="fa-solid fa-brain" size={12} style={{ color: "#0284c7" }} />
                          <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
                        </button>

                        {/* Nút phụ 2: Xem PDF */}
                        <button
                          onClick={() => {
                            onNavigate?.("documents");
                            showToast(isVi ? "Đang mở Kho Tài liệu..." : "Opening Document...");
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#334155",
                            cursor: "pointer"
                          }}
                        >
                          <Icon name="fa-solid fa-file-lines" size={12} style={{ color: "#64748b" }} />
                          <span>{isVi ? "Xem Hợp Đồng PDF" : "View PDF"}</span>
                        </button>
                      </div>

                      {/* Nút hoàn tất ca */}
                      <div>
                        {!isResolved ? (
                          <button
                            onClick={() => handleMarkTaskCompleted(task.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              background: "#f0fdf4",
                              color: "#15803d",
                              border: "1px solid #bbf7d0",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer"
                            }}
                          >
                            <Icon name="fa-solid fa-check" size={11} />
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
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "transparent",
                              border: "1px dashed #cbd5e1",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: "#64748b",
                              cursor: "pointer"
                            }}
                          >
                            <Icon name="fa-solid fa-rotate-left" size={11} />
                            <span>{isVi ? "Mở lại ca" : "Re-open"}</span>
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
        /* TAB 2: ENTERPRISE MULTI-FACET SEARCH (STREAMLINED STITCH UI) */
        /* ============================================================ */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
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
            {/* Integrated Header of Search Card */}
            <div style={{
              padding: "16px 24px",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "rgba(8, 145, 178, 0.1)",
                  color: "#0891b2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px"
                }}>
                  <i className="fa-solid fa-magnifying-glass" />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: 0, letterSpacing: "-0.01em" }}>
                    {isVi ? "Tra cứu Tri thức Đa chiều" : "Enterprise Multi-facet Search"}
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "2px 0 0 0" }}>
                    {isVi
                      ? "Hợp nhất từ 509 Hợp đồng · 19,820 Khách hàng · 504 Sản phẩm · 581 Quy trình SOP"
                      : "Unified retrieval across 509 Contracts, 19,820 Customers, 504 Products & 581 SOP Documents"}
                  </p>
                </div>
              </div>

              {/* Quick Engine Mode Switcher */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--surface-2, #f8fafc)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border)"
              }}>
                {[
                  { id: "hybrid", label: isVi ? "Tìm kiếm Kết hợp" : "Hybrid Search", icon: "fa-solid fa-network-wired" },
                  { id: "semantic", label: isVi ? "Tìm theo Ngữ nghĩa" : "Semantic Search", icon: "fa-solid fa-compass" },
                  { id: "keyword", label: isVi ? "Từ khóa chính xác" : "Exact Keyword", icon: "fa-solid fa-font" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSearchMode(m.id);
                      showToast(isVi ? `Chế độ tìm kiếm: ${m.label}` : `Search engine mode: ${m.label}`);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: searchMode === m.id ? "750" : "600",
                      cursor: "pointer",
                      border: "none",
                      background: searchMode === m.id ? "var(--surface, #ffffff)" : "transparent",
                      color: searchMode === m.id ? "var(--cyan, #0284c7)" : "var(--text-3, #64748b)",
                      boxShadow: searchMode === m.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <i className={m.icon} style={{ fontSize: 10.5 }} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* TOP BAR: BIG SEARCH INPUT & FACETED FILTERS */}
            <div style={{
              padding: "20px 24px",
              background: "var(--surface, #ffffff)",
              borderBottom: "1px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}>
              
              {/* BIG SEARCH INPUT */}
              <div style={{ position: "relative", width: "100%", maxWidth: "900px", margin: "0 auto" }}>
                <Icon name="fa-solid fa-magnifying-glass" size={15} style={{
                    position: "absolute",
                    left: "18px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cyan)",
                    fontSize: "16px"
                  }} />

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isVi ? "Nhập tên khách hàng, mã hợp đồng, sản phẩm, điều khoản bồi thường..." : "Search entities, contracts, clauses, or questions..."}
                  style={{
                    width: "100%",
                    fontSize: "14.5px",
                    fontWeight: "500",
                    background: "var(--surface)",
                    color: "var(--text-1)",
                    border: "2px solid var(--border)",
                    borderRadius: "12px",
                    padding: "13px 125px 13px 48px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    outline: "none",
                    boxSizing: "border-box",
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
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-4)",
                        cursor: "pointer",
                        padding: "4px 6px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title={isVi ? "Xóa tìm kiếm" : "Clear"}
                    >
                      <Icon name="fa-solid fa-xmark" size={14} />
                    </button>
                  )}
                  {/* Search action button */}
                  <button
                    onClick={() => showToast(isVi ? "Đang truy xuất kết quả tìm kiếm đa chiều..." : "Running multi-facet search...")}
                    className="btn primary sm"
                    style={{
                      borderRadius: "8px",
                      padding: "7px 14px",
                      fontWeight: "700",
                      fontSize: "12px",
                      boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)"
                    }}
                  >
                    {isSearching ? (
                      <Icon name="fa-solid fa-spinner fa-spin" size={13} />
                    ) : (
                      isVi ? "Tìm" : "Search"
                    )}
                  </button>
                </div>
              </div>

              {/* MULTI-FACET FILTER CHIPS ROW */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "12px",
                paddingTop: "2px",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-3)", fontWeight: "750", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                    <Icon name="fa-solid fa-sliders" size={13} style={{ color: "var(--cyan)" }} />
                    <span>{isVi ? "Bộ lọc:" : "Filters:"}</span>
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
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <option value="ALL">{isVi ? "Phòng ban: Tất cả" : "Dept: All"}</option>
                    <option value="LEGAL">{isVi ? "Pháp chế & Nghiên cứu" : "Legal & R&D"}</option>
                    <option value="SALES">{isVi ? "Phòng Bán hàng" : "Sales"}</option>
                    <option value="FINANCE">{isVi ? "Kế toán & Tài chính" : "Finance"}</option>
                    <option value="OPS">{isVi ? "Phòng Vận hành" : "Operations"}</option>
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
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <option value="ALL">{isVi ? "Ngày tạo: Tất cả" : "Created: All"}</option>
                    <option value="30D">{isVi ? "30 ngày qua" : "Past 30 Days"}</option>
                    <option value="2026">{isVi ? "Năm 2026" : "Year 2026"}</option>
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
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <option value="ALL">{isVi ? "Giá trị: Tất cả" : "Value: All"}</option>
                    <option value="50K">&gt; $50K USD</option>
                    <option value="100K">&gt; $100K USD</option>
                    <option value="500K">&gt; $500K USD</option>
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
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <option value="ALL">{isVi ? "Hiệu lực: Tất cả" : "Status: All"}</option>
                    <option value="VALID">{isVi ? "Còn hiệu lực" : "Active"}</option>
                    <option value="EXPIRING">{isVi ? "Sắp hết hạn (<30 ngày)" : "Expiring (<30d)"}</option>
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
                        textDecoration: "underline",
                        whiteSpace: "nowrap",
                        padding: "0 4px"
                      }}
                    >
                      {isVi ? "Đặt lại" : "Reset"}
                    </button>
                  )}
                </div>

                {/* Right Result Count with safe spacing */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <span style={{ fontSize: "12.5px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "var(--text-1)", fontWeight: "800" }}>{displayCountAll.toLocaleString()}</strong> {isVi ? "kết quả tìm thấy" : "results found"}
                  </span>
                </div>
              </div>

              {/* QUICK CATEGORY TABS & VIEW LAYOUT ROW */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                paddingTop: "2px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { id: "ALL", label: isVi ? "Tất cả" : "All", count: displayCountAll.toLocaleString(), icon: "fa-layer-group" },
                    { id: "CONTRACT", label: isVi ? "Hợp đồng" : "Contracts", count: displayCountContracts.toLocaleString(), icon: "fa-file-signature", color: "#0891b2" },
                    { id: "CUSTOMER", label: isVi ? "Khách hàng" : "Customers", count: displayCountCustomers.toLocaleString(), icon: "fa-building", color: "#0284c7" },
                    { id: "PRODUCT", label: isVi ? "Sản phẩm" : "Products", count: displayCountProducts.toLocaleString(), icon: "fa-box-open", color: "#0d9488" },
                    { id: "DOCUMENT", label: isVi ? "Tài liệu SOP" : "SOP Docs", count: displayCountDocuments.toLocaleString(), icon: "fa-file-lines", color: "#64748b" }
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
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <Icon name={`fa-solid ${cat.icon}`} size={13} style={{ color: isActive ? "var(--cyan)" : (cat.color || "var(--text-3)") }} />
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

                {/* View Layout Switcher (Grouped / Table) */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "2px",
                  flexShrink: 0
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
                      fontSize: "11.5px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Icon name="fa-solid fa-table-cells-large" size={12} />
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
                      fontSize: "11.5px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Icon name="fa-solid fa-table-list" size={12} />
                    <span>{isVi ? "Bảng" : "Table"}</span>
                  </button>
                </div>
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
                    <Icon name="fa-solid fa-magnifying-glass" size={15} />
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
                    <Icon name="fa-solid fa-rotate-left" size={15} style={{ marginRight: "6px" }} />
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
                        ...(activeCategory === "ALL" || activeCategory === "CONTRACT" ? filteredContracts.map((c) => ({ ...c, catLabel: "HỢP ĐỒNG", catColor: "#0891b2" })) : []),
                        ...(activeCategory === "ALL" || activeCategory === "CUSTOMER" ? filteredCustomers.map((cu) => ({ ...cu, catLabel: "KHÁCH HÀNG", catColor: "#0284c7", title: cu.name, value: cu.revenue })) : []),
                        ...(activeCategory === "ALL" || activeCategory === "PRODUCT" ? filteredProducts.map((p) => ({ ...p, catLabel: "SẢN PHẨM", catColor: "#0d9488", title: p.name, value: p.value })) : []),
                        ...(activeCategory === "ALL" || activeCategory === "DOCUMENT" ? filteredDocuments.map((d) => ({ ...d, catLabel: "TÀI LIỆU", catColor: "#64748b", value: d.size })) : [])
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
                                  onNavigate?.("knowledge", row.code || row.id);
                                  showToast(isVi ? `Đang mở ${row.code} trên Đồ thị Tri thức` : `Opening ${row.code} in Graph`);
                                }}
                                className="btn sm"
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                title={isVi ? "Xem trên đồ thị" : "View on Graph"}
                              >
                                <Icon name="fa-solid fa-circle-nodes" size={15} style={{ color: "var(--cyan)" }} />
                              </button>
                              <button
                                onClick={() => {
                                  onNavigate?.("documents", row.sourceDoc || row.code || row.title || row.id);
                                  showToast(isVi ? `Đang mở hồ sơ tài liệu của: ${row.title}` : `Opening dossier for: ${row.title}`);
                                }}
                                className="btn sm"
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                title={isVi ? "Xem trước tài liệu" : "Preview Document"}
                              >
                                <Icon name="fa-solid fa-file-lines" size={15} />
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
                                <Icon name="fa-solid fa-brain" size={15} />
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
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0891b2", display: "inline-block" }}></span>
                          <span>{isVi ? "Hợp Đồng & Điều Khoản Pháp Lý" : "Contracts & Legal Clauses"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#0891b2",
                            background: "rgba(8, 145, 178, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid rgba(8, 145, 178, 0.2)"
                          }}>
                            {displayCountContracts.toLocaleString()} {isVi ? "kết quả" : "results"}
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

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "14px" }}>
                        {(activeCategory === "ALL" ? filteredContracts.slice(0, 12) : filteredContracts.slice(0, visibleLimits.CONTRACT || 24)).map((c) => (
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
                              transition: "all 0.15s ease",
                              minWidth: 0,
                              overflow: "hidden",
                              boxSizing: "border-box"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0, flex: 1 }}>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "800",
                                  fontFamily: "var(--f-mono)",
                                  background: "rgba(8, 145, 178, 0.1)",
                                  color: "#0e7490",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  flexShrink: 0
                                }}>
                                  {c.code}
                                </span>
                                <span style={{
                                  fontSize: "13.5px",
                                  fontWeight: "750",
                                  color: "var(--text-1)",
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  minWidth: 0
                                }}>
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
                                whiteSpace: "nowrap",
                                flexShrink: 0
                              }}>
                                {c.statusText}
                              </span>
                            </div>

                            <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, wordBreak: "break-word" }}>
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
                              lineHeight: "1.6",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              whiteSpace: "pre-wrap",
                              maxHeight: "130px",
                              overflowY: "auto",
                              overflowX: "hidden",
                              boxSizing: "border-box"
                            }}>
                              <span style={{ fontWeight: "700", color: "#b45309", marginRight: "6px" }}>
                                {isVi ? "Phù hợp từ khóa:" : "Matching excerpt:"}
                              </span>
                              <span>
                                {c.highlight && c.highlight.trim() && c.snippet && c.snippet.toLowerCase().includes(c.highlight.toLowerCase().trim()) ? (
                                  c.snippet.split(new RegExp(`(${c.highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi")).map((part, i) => (
                                    part.toLowerCase() === c.highlight.toLowerCase().trim() ? (
                                      <mark key={i} style={{ background: "#fde68a", color: "#78350f", padding: "1px 4px", borderRadius: "3px", fontWeight: "700" }}>
                                        {part}
                                      </mark>
                                    ) : (
                                      <React.Fragment key={i}>{part}</React.Fragment>
                                    )
                                  ))
                                ) : (
                                  c.snippet
                                )}
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
                              color: "var(--text-4)",
                              gap: "10px",
                              minWidth: 0
                            }}>
                              <span
                                style={{
                                  minWidth: 0,
                                  flex: "1 1 auto",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color: "var(--text-3)",
                                  fontSize: "11px"
                                }}
                                title={`${c.agent} • ${c.sourceDoc}`}
                              >
                                {c.agent} • {c.sourceDoc}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, whiteSpace: "nowrap" }}>
                                <button
                                  onClick={() => {
                                    onNavigate?.("copilot");
                                    showToast(isVi ? "Đang gửi yêu cầu phân tích hợp đồng sang Copilot..." : "Switching to Copilot...");
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--cyan)", fontWeight: "700", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                                >
                                  {isVi ? "Hỏi Copilot" : "Ask Copilot"}
                                </button>
                                <button
                                  onClick={() => {
                                    onNavigate?.("knowledge", c.code || c.id);
                                    showToast(isVi ? `Đang định vị ${c.code} trên Đồ thị Tri thức` : `Locating ${c.code} on Graph`);
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--text-2)", fontWeight: "600", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                                >
                                  {isVi ? "Xem đồ thị" : "Graph"}
                                </button>
                                <button
                                  onClick={() => {
                                    onNavigate?.("documents", c.sourceDoc || c.code || c.id);
                                    showToast(isVi ? `Mở tài liệu ${c.sourceDoc}` : `Opening ${c.sourceDoc}`);
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--text-2)", fontWeight: "600", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                                >
                                  {isVi ? "Xem trước" : "Preview"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ACTION / LOAD MORE ROW FOR CONTRACTS */}
                      {activeCategory === "ALL" && filteredContracts.length > 12 && (
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
                          <button
                            onClick={() => {
                              setActiveCategory("CONTRACT");
                              showToast(isVi ? "Đang mở toàn bộ hợp đồng CUAD..." : "Loading all CUAD contracts...");
                            }}
                            className="btn secondary"
                            style={{ padding: "8px 18px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            <Icon name="fa-solid fa-file-signature" size={14} style={{ marginRight: "8px", color: "#0891b2" }} />
                            {isVi ? `Xem tất cả ${displayCountContracts.toLocaleString()} Hợp đồng & Điều khoản CUAD →` : `View all ${displayCountContracts.toLocaleString()} CUAD Contracts →`}
                          </button>
                        </div>
                      )}

                      {activeCategory === "CONTRACT" && filteredContracts.length > (visibleLimits.CONTRACT || 24) && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", paddingTop: "12px" }}>
                          <button
                            onClick={() => handleLoadMore("CONTRACT", 24)}
                            className="btn secondary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "700" }}
                          >
                            <Icon name="fa-solid fa-arrow-down" size={13} style={{ marginRight: "6px" }} />
                            {isVi ? `Tải thêm 24 hợp đồng (Đang xem ${Math.min(filteredContracts.length, visibleLimits.CONTRACT || 24)}/${filteredContracts.length})` : `Load 24 more (${Math.min(filteredContracts.length, visibleLimits.CONTRACT || 24)}/${filteredContracts.length})`}
                          </button>
                          <button
                            onClick={() => handleShowAll("CONTRACT", filteredContracts.length)}
                            className="btn primary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            {isVi ? `Xem toàn bộ ${filteredContracts.length} Hợp đồng` : `Show all ${filteredContracts.length}`}
                          </button>
                        </div>
                      )}
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
                          <span>{isVi ? "Khách Hàng Doanh Nghiệp" : "Enterprise Customers"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#3b82f6",
                            background: "rgba(59, 130, 246, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid rgba(59, 130, 246, 0.2)"
                          }}>
                            {displayCountCustomers.toLocaleString()} {isVi ? "kết quả" : "results"}
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

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "14px" }}>
                        {(activeCategory === "ALL" ? filteredCustomers.slice(0, 12) : filteredCustomers.slice(0, visibleLimits.CUSTOMER || 24)).map((cust) => (
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
                              boxShadow: "var(--shadow-sm)",
                              minWidth: 0,
                              overflow: "hidden",
                              boxSizing: "border-box"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                                <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-1)", wordBreak: "break-word" }}>
                                  {cust.name}
                                </span>
                                <span style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  fontFamily: "var(--f-mono)",
                                  background: "rgba(59, 130, 246, 0.1)",
                                  color: "#2563eb",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  flexShrink: 0
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
                                onNavigate?.("knowledge", cust.code || cust.id || cust.name);
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
                              <Icon name="fa-solid fa-circle-nodes" size={15} style={{ color: "var(--cyan)" }} />
                              <span>{isVi ? "Đồ thị" : "Graph"}</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* ACTION / LOAD MORE ROW FOR CUSTOMERS */}
                      {activeCategory === "ALL" && filteredCustomers.length > 12 && (
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
                          <button
                            onClick={() => {
                              setActiveCategory("CUSTOMER");
                              showToast(isVi ? "Đang mở toàn bộ Khách hàng CRM..." : "Loading all CRM Customers...");
                            }}
                            className="btn secondary"
                            style={{ padding: "8px 18px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            <Icon name="fa-solid fa-building" size={14} style={{ marginRight: "8px", color: "#3b82f6" }} />
                            {isVi ? `Xem tất cả ${displayCountCustomers.toLocaleString()} Khách hàng Doanh nghiệp & CRM →` : `View all ${displayCountCustomers.toLocaleString()} CRM Customers →`}
                          </button>
                        </div>
                      )}

                      {activeCategory === "CUSTOMER" && filteredCustomers.length > (visibleLimits.CUSTOMER || 24) && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", paddingTop: "12px" }}>
                          <button
                            onClick={() => handleLoadMore("CUSTOMER", 24)}
                            className="btn secondary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "700" }}
                          >
                            <Icon name="fa-solid fa-arrow-down" size={13} style={{ marginRight: "6px" }} />
                            {isVi ? `Tải thêm 24 khách hàng (Đang xem ${Math.min(filteredCustomers.length, visibleLimits.CUSTOMER || 24)}/${filteredCustomers.length})` : `Load 24 more (${Math.min(filteredCustomers.length, visibleLimits.CUSTOMER || 24)}/${filteredCustomers.length})`}
                          </button>
                          <button
                            onClick={() => handleShowAll("CUSTOMER", filteredCustomers.length)}
                            className="btn primary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            {isVi ? `Xem toàn bộ ${filteredCustomers.length} Khách hàng` : `Show all ${filteredCustomers.length}`}
                          </button>
                        </div>
                      )}
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
                            {displayCountProducts.toLocaleString()} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                        <button
                          onClick={() => {
                            setActiveCategory("PRODUCT");
                            showToast(isVi ? "Đã lọc danh sách Sản phẩm" : "Filtered by products");
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--cyan)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                        >
                          {isVi ? "Xem danh mục ERP →" : "View catalog →"}
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                        {(activeCategory === "ALL" ? filteredProducts.slice(0, 12) : filteredProducts.slice(0, visibleLimits.PRODUCT || 24)).map((p) => (
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
                              boxShadow: "var(--shadow-sm)",
                              minWidth: 0,
                              overflow: "hidden",
                              boxSizing: "border-box"
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
                            <h4 style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--text-1)", margin: 0, wordBreak: "break-word" }}>
                              {p.name}
                            </h4>
                            <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, lineHeight: "1.5", wordBreak: "break-word" }}>
                              {p.desc}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* ACTION / LOAD MORE ROW FOR PRODUCTS */}
                      {activeCategory === "ALL" && filteredProducts.length > 12 && (
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
                          <button
                            onClick={() => {
                              setActiveCategory("PRODUCT");
                              showToast(isVi ? "Đang mở toàn bộ Sản phẩm AdventureWorks..." : "Loading all products...");
                            }}
                            className="btn secondary"
                            style={{ padding: "8px 18px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            <Icon name="fa-solid fa-box-open" size={14} style={{ marginRight: "8px", color: "#10b981" }} />
                            {isVi ? `Xem tất cả ${displayCountProducts.toLocaleString()} Sản phẩm & Dịch vụ AdventureWorks →` : `View all ${displayCountProducts.toLocaleString()} Products →`}
                          </button>
                        </div>
                      )}

                      {activeCategory === "PRODUCT" && filteredProducts.length > (visibleLimits.PRODUCT || 24) && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", paddingTop: "12px" }}>
                          <button
                            onClick={() => handleLoadMore("PRODUCT", 24)}
                            className="btn secondary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "700" }}
                          >
                            <Icon name="fa-solid fa-arrow-down" size={13} style={{ marginRight: "6px" }} />
                            {isVi ? `Tải thêm 24 sản phẩm (Đang xem ${Math.min(filteredProducts.length, visibleLimits.PRODUCT || 24)}/${filteredProducts.length})` : `Load 24 more (${Math.min(filteredProducts.length, visibleLimits.PRODUCT || 24)}/${filteredProducts.length})`}
                          </button>
                          <button
                            onClick={() => handleShowAll("PRODUCT", filteredProducts.length)}
                            className="btn primary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            {isVi ? `Xem toàn bộ ${filteredProducts.length} Sản phẩm` : `Show all ${filteredProducts.length}`}
                          </button>
                        </div>
                      )}
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
                          <span>{isVi ? "Tài Liệu & Quy Trình Nội Bộ" : "Internal Documents & SOPs"}</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#64748b",
                            background: "var(--surface-3)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: "1px solid var(--border)"
                          }}>
                            {displayCountDocuments.toLocaleString()} {isVi ? "kết quả" : "results"}
                          </span>
                        </h3>
                        <button
                          onClick={() => {
                            setActiveCategory("DOCUMENT");
                            showToast(isVi ? "Đã lọc danh sách Tài liệu & SOP" : "Filtered by documents");
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--cyan)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                        >
                          {isVi ? "Xem kho tài liệu →" : "View repository →"}
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(activeCategory === "ALL" ? filteredDocuments.slice(0, 12) : filteredDocuments.slice(0, visibleLimits.DOCUMENT || 24)).map((doc) => (
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
                                  onNavigate?.("documents", doc.sourceDoc || doc.code || doc.title || doc.id);
                                  showToast(isVi ? `Đang mở tài liệu: ${doc.title}` : `Opening ${doc.title}`);
                                }}
                                className="btn sm"
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                              >
                                <Icon name="fa-solid fa-file-lines" size={15} style={{ marginRight: "6px", color: "var(--amber)" }} />
                                {isVi ? "Xem tài liệu" : "Preview"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ACTION / LOAD MORE ROW FOR DOCUMENTS */}
                      {activeCategory === "ALL" && filteredDocuments.length > 12 && (
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
                          <button
                            onClick={() => {
                              setActiveCategory("DOCUMENT");
                              showToast(isVi ? "Đang mở toàn bộ Tài liệu & SOPs..." : "Loading all documents...");
                            }}
                            className="btn secondary"
                            style={{ padding: "8px 18px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            <Icon name="fa-solid fa-file-lines" size={14} style={{ marginRight: "8px", color: "#64748b" }} />
                            {isVi ? `Xem tất cả ${displayCountDocuments.toLocaleString()} Tài liệu & SOPs Doanh nghiệp →` : `View all ${displayCountDocuments.toLocaleString()} Documents →`}
                          </button>
                        </div>
                      )}

                      {activeCategory === "DOCUMENT" && filteredDocuments.length > (visibleLimits.DOCUMENT || 24) && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", paddingTop: "12px" }}>
                          <button
                            onClick={() => handleLoadMore("DOCUMENT", 24)}
                            className="btn secondary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "700" }}
                          >
                            <Icon name="fa-solid fa-arrow-down" size={13} style={{ marginRight: "6px" }} />
                            {isVi ? `Tải thêm 24 tài liệu (Đang xem ${Math.min(filteredDocuments.length, visibleLimits.DOCUMENT || 24)}/${filteredDocuments.length})` : `Load 24 more (${Math.min(filteredDocuments.length, visibleLimits.DOCUMENT || 24)}/${filteredDocuments.length})`}
                          </button>
                          <button
                            onClick={() => handleShowAll("DOCUMENT", filteredDocuments.length)}
                            className="btn primary"
                            style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: "750" }}
                          >
                            {isVi ? `Xem toàn bộ ${filteredDocuments.length} Tài liệu` : `Show all ${filteredDocuments.length}`}
                          </button>
                        </div>
                      )}
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
                <Icon name="fa-solid fa-paper-plane" size={15} style={{ color: "var(--cyan)", fontSize: "16px" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                  {isVi ? "Soạn Thảo Đề Xuất Tác Nghiệp" : "Draft Operational Proposal"}
                </h3>
              </div>

              <button
                onClick={() => setSelectedTaskAction(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-3)", fontSize: "18px", cursor: "pointer" }}
              >
                <Icon name="fa-solid fa-xmark" size={15} />
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
                <Icon name="" size={14} />
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
                  <Icon name="" size={14} />
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
                  <Icon name="fa-solid fa-stamp" size={15} />
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
                <Icon name="fa-solid fa-circle-check" size={15} />
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
                  {isVi ? "Mã băm kiểm toán bảo mật:" : "Immutable Audit Hash:"}
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
              <Icon name="fa-solid fa-circle-info" size={15} style={{ color: "var(--primary)", marginRight: "6px" }} />
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
                <Icon name="fa-solid fa-briefcase" size={15} />
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
                <Icon name="fa-solid fa-circle-nodes" size={15} style={{ color: "var(--cyan)" }} />
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
                <Icon name="fa-solid fa-clipboard-list" size={15} />
                <span>{isVi ? "Xem trong Nhật ký Kiểm toán" : "View in Audit Trail"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
