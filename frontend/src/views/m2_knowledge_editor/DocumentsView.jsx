import React, { useState, useMemo } from "react";

export default function DocumentsView({ onNavigate, t, lang, role, currentUser }) {
  const isVi = lang === "vi";
  const isAdmin = role === "admin" || role === "it_admin";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [docFilter, setDocFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Drawer & Selection state
  const [selectedDocId, setSelectedDocId] = useState("CUAD_042");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerFullscreen, setIsDrawerFullscreen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(125);
  const [verifiedDocs, setVerifiedDocs] = useState({ CUAD_042: true });
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Mock Knowledge Base Document Dataset (Aligned with Stitch SCREEN-015 & DRAWER-004 specs)
  const ALL_DOCUMENTS = [
    {
      id: "CUAD_042",
      name: "CUAD_Service_Agreement_v4.pdf",
      category: isVi ? "Hợp đồng dịch vụ" : "Service Agreement",
      type: "PDF",
      dept: "Pháp chế",
      deptLabel: isVi ? "Pháp chế" : "Legal",
      owner: "Trần Thị Thu Hương",
      date: "14/09/2026",
      lastSynced: "14/09/2026 09:30",
      status: "Neo4j + Qdrant",
      statusBadge: isVi ? "Đã xác thực NER + GraphRAG" : "NER + GraphRAG Verified",
      statusState: "active",
      risk: "High",
      riskLabel: isVi ? "Cảnh báo hạn mức" : "High Risk",
      size: "2.4 MB",
      chunks: "128 Chunks",
      hash: "0x8a4c9fc21",
      schema: "CUAD Contract v2.4",
      access: "RBAC Strict (Level 3)",
      previewType: "cuad_contract",
      entities: [
        { key: isVi ? "Bên cung cấp" : "Provider Party", val: "Alpha Corp", type: "customer" },
        { key: isVi ? "Bên tiếp nhận" : "Client Party", val: "AdventureWorks Vietnam", type: "customer" },
        { key: isVi ? "Điều khoản bồi thường" : "Liability Cap", val: "Section 12.2 (Max 10%)", type: "financial" },
        { key: isVi ? "Giá trị hợp đồng" : "Contract Value", val: "1.2B VND", type: "financial" },
        { key: isVi ? "Thời hạn hiệu lực" : "Expiration Date", val: "18/10/2026 (12 ngày)", type: "risk" },
        { key: isVi ? "Rủi ro pháp lý" : "Identified Risk", val: "Unilateral limitation of liability", type: "risk" }
      ],
      neo4jRel: [
        { from: "Node: Contract (CUAD_042)", rel: "BOUND_BY", to: "Node: Clause (Section 12.2)" },
        { from: "Node: Clause (Section 12.2)", rel: "HAS_RISK_FLAG", to: "Risk: Unilateral (10% Cap)", isRisk: true }
      ]
    },
    {
      id: "ERP_ADV_09",
      name: "AdventureWorks_Sales_Q3_2026.xlsx",
      category: isVi ? "Dữ liệu CRM/ERP" : "CRM/ERP Data",
      type: "Sheets",
      dept: "Kinh doanh",
      deptLabel: isVi ? "Kinh doanh" : "Sales",
      owner: "Lê V. Hùng",
      date: "12/09/2026",
      lastSynced: "12/09/2026 09:03",
      status: "Đã map Schema",
      statusBadge: isVi ? "Đã map Schema" : "Schema Mapped",
      statusState: "active",
      risk: "Medium",
      riskLabel: isVi ? "Sụt giảm nhịp mua" : "Cadence Drop",
      size: "1.1 MB",
      chunks: "450 Entities",
      hash: "0x4f128be10",
      schema: "ERP Sales Order v1.0",
      access: "RBAC Dept Only",
      previewType: "spreadsheet",
      entities: [
        { key: isVi ? "Tổng đơn hàng Q3" : "Total Orders Q3", val: "214 records", type: "financial" },
        { key: isVi ? "Tần suất sụt giảm" : "Cadence Drop", val: "-32% (ABC Corp)", type: "risk" },
        { key: isVi ? "Khách hàng liên kết" : "Linked Customers", val: "ABC Corp, Delta Trading", type: "customer" },
        { key: isVi ? "Doanh số thực tế" : "Realized Revenue", val: "4.8B VND", type: "financial" }
      ],
      neo4jRel: [
        { from: "Node: Dataset (ERP_ADV_09)", rel: "AGGREGATES", to: "Node: Customer (ABC Corp)" },
        { from: "Node: Customer (ABC Corp)", rel: "SHOWS_ANOMALY", to: "Anomaly: Drop (-32%)", isRisk: true }
      ]
    },
    {
      id: "NDA_ALPHA_26",
      name: "Master_NDA_AlphaCorp_Signed.pdf",
      category: isVi ? "Thỏa thuận bảo mật" : "Non-Disclosure",
      type: "NDA",
      dept: "Pháp chế",
      deptLabel: isVi ? "Pháp chế" : "Legal",
      owner: "Phạm Q. Linh",
      date: "10/09/2026",
      lastSynced: "10/09/2026 14:15",
      status: "Đã index",
      statusBadge: isVi ? "Đã index Vector" : "Vector Indexed",
      statusState: "active",
      risk: "Low",
      riskLabel: isVi ? "Tiêu chuẩn" : "Standard",
      size: "850 KB",
      chunks: "64 Chunks",
      hash: "0x91dae330a",
      schema: "NDA Standard v3.1",
      access: "RBAC Strict (Level 3)",
      previewType: "nda_contract",
      entities: [
        { key: isVi ? "Đối tác ký kết" : "Signatory Partner", val: "Alpha Corp & AdventureWorks", type: "customer" },
        { key: isVi ? "Thời hạn bảo mật" : "Confidentiality Term", val: "3 years from execution", type: "financial" },
        { key: isVi ? "Chế tài vi phạm" : "Violation Remedies", val: "Direct damages compensation", type: "risk" }
      ],
      neo4jRel: [
        { from: "Node: Agreement (NDA_ALPHA_26)", rel: "COVERS", to: "Node: Proprietary Tech (EKAI)" }
      ]
    },
    {
      id: "SOP_IT_2026",
      name: "SOP_Nghiem_Thu_Phan_Mem_v2.1.docx",
      category: isVi ? "Quy trình nội bộ" : "Standard Operating Procedure",
      type: "SOP",
      dept: "Công nghệ / IT",
      deptLabel: isVi ? "Công nghệ / IT" : "Technology & IT",
      owner: "Nguyễn V. Nam",
      date: "08/09/2026",
      lastSynced: "08/09/2026 08:40",
      status: "Đã xuất bản",
      statusBadge: isVi ? "Đã xuất bản SOP" : "Published SOP",
      statusState: "active",
      risk: "Low",
      riskLabel: isVi ? "An toàn" : "Safe",
      size: "540 KB",
      chunks: "32 Chunks",
      hash: "0x3c78119ae",
      schema: "SOP Governance v2.1",
      access: "RBAC Public",
      previewType: "sop",
      entities: [
        { key: isVi ? "Đơn vị thực hiện" : "Executing Dept", val: "IT & QA Engineering", type: "customer" },
        { key: isVi ? "Chu kỳ nghiệm thu" : "Cycle Window", val: "5 business days before Go-Live", type: "financial" },
        { key: isVi ? "Tiêu chí phê duyệt" : "Acceptance Gates", val: "100% Critical P0/P1 Passed", type: "risk" }
      ],
      neo4jRel: [
        { from: "Node: SOP (SOP_IT_2026)", rel: "REGULATES", to: "Node: Release Gate (V2.1)" }
      ]
    },
    {
      id: "CUAD_087",
      name: "CUAD_Procurement_Contract_087.pdf",
      category: isVi ? "Hợp đồng cung ứng" : "Procurement Contract",
      type: "PDF",
      dept: "Kế toán / Thu mua",
      deptLabel: isVi ? "Kế toán / Thu mua" : "Accounting & Procurement",
      owner: "Hoàng T. Mai",
      date: "05/09/2026",
      lastSynced: "05/09/2026 16:20",
      status: "Cảnh báo hạn hợp đồng",
      statusBadge: isVi ? "Cảnh báo hạn hợp đồng" : "Expiry Warning",
      statusState: "warning",
      risk: "High",
      riskLabel: isVi ? "Sắp hết hạn" : "Expiring Soon",
      size: "3.1 MB",
      chunks: "92 Chunks",
      hash: "0x77c2409f1",
      schema: "CUAD Procurement v2",
      access: "RBAC Dept Only",
      previewType: "cuad_procure",
      entities: [
        { key: isVi ? "Nhà cung ứng" : "Vendor", val: "Megatech Logistics JSC", type: "customer" },
        { key: isVi ? "Hạn hợp đồng" : "Expiration Warning", val: "Hết hạn sau 5 ngày", type: "risk" },
        { key: isVi ? "Giá trị đơn hàng" : "Purchase Value", val: "860M VND", type: "financial" }
      ],
      neo4jRel: [
        { from: "Node: Contract (CUAD_087)", rel: "SUPPLIED_BY", to: "Node: Vendor (Megatech)" },
        { from: "Node: Contract (CUAD_087)", rel: "TRIGGERS", to: "Alert: Expiry_5_Days", isRisk: true }
      ]
    },
    {
      id: "VND_2026_CAT",
      name: "Vendor_Price_Catalog_2026.xlsx",
      category: isVi ? "Bảng giá nhà cung cấp" : "Vendor Catalog",
      type: "Sheets",
      dept: "Kế toán / Thu mua",
      deptLabel: isVi ? "Kế toán / Thu mua" : "Accounting & Procurement",
      owner: "Đỗ M. Tuấn",
      date: "01/09/2026",
      lastSynced: "01/09/2026 11:00",
      status: "Đã index",
      statusBadge: isVi ? "Đã index" : "Indexed",
      statusState: "active",
      risk: "Medium",
      riskLabel: isVi ? "Biến động giá" : "Price Fluctuation",
      size: "1.8 MB",
      chunks: "310 Entities",
      hash: "0x19ba6602e",
      schema: "Vendor Catalog v1.2",
      access: "RBAC Dept Only",
      previewType: "spreadsheet",
      entities: [
        { key: isVi ? "Số lượng danh mục" : "Catalog Items", val: "1,240 items", type: "financial" },
        { key: isVi ? "Biến động giá" : "Price Variance", val: "+6.8% logistics overhead", type: "risk" }
      ],
      neo4jRel: [
        { from: "Node: Catalog (VND_2026_CAT)", rel: "CONTAINS", to: "Node: Material List" }
      ]
    },
    {
      id: "ISO_SPEC_01",
      name: "ISO_27001_Compliance_Spec.pdf",
      category: isVi ? "Chính sách bảo mật" : "Security Compliance",
      type: "NDA",
      dept: "Pháp chế",
      deptLabel: isVi ? "Pháp chế & IT" : "Legal & IT",
      owner: "Trần Thị Thu Hương",
      date: "28/08/2026",
      lastSynced: "28/08/2026 10:15",
      status: "Chuẩn hóa ISO",
      statusBadge: isVi ? "Chuẩn hóa ISO" : "ISO Standardized",
      statusState: "active",
      risk: "Low",
      riskLabel: isVi ? "Tuân thủ" : "Compliant",
      size: "4.2 MB",
      chunks: "184 Chunks",
      hash: "0xaa4411ee8",
      schema: "ISO 27001 ISMS v2022",
      access: "RBAC Strict (Level 3)",
      previewType: "iso_spec",
      entities: [
        { key: isVi ? "Tiêu chuẩn" : "Standard", val: "ISO/IEC 27001:2022", type: "customer" },
        { key: isVi ? "Phạm vi kiểm toán" : "Audit Scope", val: "Cloud & Neo4j Hybrid Store", type: "financial" }
      ],
      neo4jRel: [
        { from: "Node: Policy (ISO_SPEC_01)", rel: "MANDATES", to: "Node: Graph Security Guardrails" }
      ]
    },
    {
      id: "GRAPH_JSON_88",
      name: "Product_Catalog_Graph_Export.json",
      category: isVi ? "Dữ liệu Sản phẩm" : "Product Graph",
      type: "JSON",
      dept: "R&D",
      deptLabel: isVi ? "R&D" : "Research & Development",
      owner: "Vũ D. Hưng",
      date: "20/08/2026",
      lastSynced: "20/08/2026 15:45",
      status: "Neo4j Native",
      statusBadge: isVi ? "Neo4j Native" : "Neo4j Native",
      statusState: "active",
      risk: "Low",
      riskLabel: isVi ? "Hợp nhất" : "Unified",
      size: "920 KB",
      chunks: "512 Nodes",
      hash: "0xbb55891ac",
      schema: "Product Graph Schema v2",
      access: "RBAC Public",
      previewType: "json_graph",
      entities: [
        { key: isVi ? "Thực thể Node" : "Graph Nodes", val: "512 Product & SKU Nodes", type: "customer" },
        { key: isVi ? "Quan hệ Edge" : "Graph Edges", val: "1,420 Belongs_To & Depends_On", type: "financial" }
      ],
      neo4jRel: [
        { from: "Node: ProductGraph", rel: "EXPORTS_TO", to: "Neo4j Enterprise Engine" }
      ]
    }
  ];

  // RBAC Filtering according to Stitch Spec:
  // Admin: view all
  // Standard user: view documents in their data scope (Kinh doanh or unassigned/public)
  const accessibleDocs = useMemo(() => {
    if (isAdmin) return ALL_DOCUMENTS;
    if (role === "standard") {
      return ALL_DOCUMENTS.filter(
        (d) => d.dept === "Kinh doanh" || d.access === "RBAC Public"
      );
    }
    return ALL_DOCUMENTS;
  }, [isAdmin, role]);

  // Faceted Filtering
  const filteredDocs = useMemo(() => {
    return accessibleDocs.filter((doc) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesId = doc.id.toLowerCase().includes(q);
        const matchesOwner = doc.owner.toLowerCase().includes(q);
        const matchesDept = doc.dept.toLowerCase().includes(q);
        const matchesCategory = doc.category.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesOwner && !matchesDept && !matchesCategory) {
          return false;
        }
      }
      // Type filter
      if (docFilter !== "ALL" && doc.type !== docFilter) return false;
      // Dept filter
      if (deptFilter !== "ALL" && doc.dept !== deptFilter) return false;
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "verified" && !verifiedDocs[doc.id] && doc.statusState !== "active") return false;
        if (statusFilter === "warning" && doc.statusState !== "warning") return false;
      }
      return true;
    });
  }, [accessibleDocs, searchQuery, docFilter, deptFilter, statusFilter, verifiedDocs]);

  const activeDoc = ALL_DOCUMENTS.find((d) => d.id === selectedDocId) || ALL_DOCUMENTS[0];
  const isDocVerified = activeDoc ? (verifiedDocs[activeDoc.id] || activeDoc.statusState === "active") : false;

  const handleOpenDrawer = (docId) => {
    setSelectedDocId(docId);
    setIsDrawerOpen(true);
  };

  const handleVerifyCurrentDoc = () => {
    if (!activeDoc) return;
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    showToast(isVi ? `Đã xác thực và đồng bộ toàn bộ thực thể của ${activeDoc.name} vào Neo4j!` : `Verified and synchronized entities from ${activeDoc.name} into Neo4j!`);
  };

  const handleDownloadDoc = () => {
    if (!activeDoc) return;
    if (!isAdmin) {
      showToast(isVi ? "Chính sách C4: Tài khoản Standard/Dept Manager chỉ được xem trước (Read-Only). Liên hệ IT Admin để tải tệp gốc." : "Policy C4: Standard/Dept Manager accounts are Read-Only. Contact IT Admin to download raw file.");
      return;
    }
    showToast(isVi ? `Đang ghi nhận Audit Log & tải xuống ${activeDoc.name}...` : `Logging Audit Trail & downloading ${activeDoc.name}...`);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDocFilter("ALL");
    setDeptFilter("ALL");
    setDateFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-circle-check text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEADER BANNER (SCREEN-015) */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-wider">
              SCREEN-015
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
              Vector + Graph Ingestion
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            {isVi ? "Kho tài liệu & Dữ liệu Tri thức (Knowledge Base)" : "Knowledge Base (Document & Data Explorer)"}
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {isVi
              ? "Khám phá 1,420 tài liệu hợp đồng CUAD, biểu mẫu SOP và tập tin dữ liệu đã trích xuất vào Hybrid GraphRAG. Click vào thẻ để mở bảng xem trước chi tiết (DRAWER-004)."
              : "Explore 1,420 CUAD contracts, SOP standard operating procedures, and structured datasets ingested into Hybrid GraphRAG. Click any card to open the preview inspector (DRAWER-004)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate("sop_composer");
              } else {
                showToast(isVi ? "Chuyển tới trình soạn thảo SOP (SCREEN-017a)" : "Navigating to SOP Composer (SCREEN-017a)");
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-circle-plus text-[16px]"></i>
            <span>{isVi ? "Nạp tài liệu mới" : "Ingest Document"}</span>
          </button>
          <button
            onClick={() => showToast(isVi ? "Đang đồng bộ Schema với Neo4j & Qdrant..." : "Synchronizing Schema with Neo4j & Qdrant...")}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold border border-outline-variant/40 hover:bg-surface-container transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate text-[16px]"></i>
            <span>{isVi ? "Đồng bộ Schema" : "Sync Schema"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="md:col-span-4 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-on-surface-variant text-[15px]"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              placeholder={isVi ? "Tìm kiếm tên tài liệu, điều khoản, mã số hợp đồng, metadata..." : "Search document name, clause, contract ID, metadata..."}
            />
            <kbd className="absolute right-3 top-2.5 px-2 py-0.5 rounded-md bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-mono text-on-surface-variant shadow-2xs">
              ⌘K
            </kbd>
          </div>

          {/* Filter 1: Type */}
          <div className="md:col-span-2">
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full py-2 px-3 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">{isVi ? "Loại: Tất cả" : "Type: All"}</option>
              <option value="PDF">{isVi ? "Hợp đồng CUAD (PDF)" : "CUAD Contracts (PDF)"}</option>
              <option value="Sheets">{isVi ? "Dữ liệu CRM/ERP (XLSX)" : "CRM/ERP Data (XLSX)"}</option>
              <option value="SOP">{isVi ? "Quy trình SOP (DOCX)" : "SOP Procedures (DOCX)"}</option>
              <option value="NDA">{isVi ? "Thỏa thuận bảo mật (NDA)" : "NDA Agreements"}</option>
              <option value="JSON">{isVi ? "Dữ liệu JSON Graph" : "JSON Graph Data"}</option>
            </select>
          </div>

          {/* Filter 2: Dept */}
          <div className="md:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full py-2 px-3 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">{isVi ? "Phòng ban: Tất cả" : "Dept: All"}</option>
              <option value="Pháp chế">{isVi ? "Pháp chế (Legal)" : "Legal"}</option>
              <option value="Kinh doanh">{isVi ? "Kinh doanh (Sales)" : "Sales"}</option>
              <option value="Kế toán / Thu mua">{isVi ? "Kế toán / Thu mua" : "Finance & Procurement"}</option>
              <option value="Công nghệ / IT">{isVi ? "Công nghệ / IT" : "Technology & IT"}</option>
              <option value="R&D">{isVi ? "R&D" : "Research & Dev"}</option>
            </select>
          </div>

          {/* Filter 3: Ingestion Date */}
          <div className="md:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-2 px-3 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">{isVi ? "Ngày nạp: Tất cả" : "Date: All"}</option>
              <option value="30d">{isVi ? "30 ngày qua" : "Last 30 days"}</option>
              <option value="7d">{isVi ? "7 ngày gần nhất" : "Last 7 days"}</option>
              <option value="q1">{isVi ? "Quý 1/2026" : "Q1/2026"}</option>
            </select>
          </div>

          {/* View Mode Toggle & Reset */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <div className="bg-surface-container-low p-1 rounded-xl flex items-center border border-outline-variant/30">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Grid Cards"
              >
                <i className="fa-solid fa-grip"></i>
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "table" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Table List"
              >
                <i className="fa-solid fa-list"></i>
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <button
              onClick={resetFilters}
              className="p-2 px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors flex items-center justify-center text-xs"
              title={isVi ? "Làm mới bộ lọc" : "Reset filters"}
            >
              <i className="fa-solid fa-filter-circle-xmark text-[14px]"></i>
            </button>
          </div>
        </div>

        {/* Quick Status Indicator Bar */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-surface-container text-xs text-on-surface-variant font-medium">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {isVi ? "Hiển thị" : "Showing"}{" "}
              <strong className="text-on-surface">{filteredDocs.length}</strong> / 1,420 {isVi ? "tài liệu" : "documents"}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> 1,280 {isVi ? "Hoạt động" : "Active"}
            </span>
            <span className="flex items-center gap-1.5 text-tertiary font-semibold">
              <span className="w-2 h-2 rounded-full bg-tertiary inline-block"></span> 114 {isVi ? "Chờ duyệt NER" : "Pending NER"}
            </span>
            <span className="flex items-center gap-1.5 text-error font-semibold">
              <span className="w-2 h-2 rounded-full bg-error inline-block"></span> 26 {isVi ? "Cảnh báo hạn/xung đột" : "Warnings"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-outline">
              {isAdmin ? (isVi ? "Quyền Admin: Full Access & Download" : "Admin Role: Full Access & Download") : (isVi ? "Chính sách C4: Read-Only Preview" : "Policy C4: Read-Only Preview")}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT CARD GRID VIEW (4-COLUMN RESPONSIVE) */}
      {/* ========================================================================= */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-outline">
              <i className="fa-regular fa-folder-open text-3xl mb-2 text-outline/40"></i>
              <div className="font-semibold text-on-surface">{isVi ? "Không tìm thấy tài liệu phù hợp" : "No matching documents found"}</div>
              <p className="text-xs text-outline mt-1">{isVi ? "Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác." : "Try clearing filters or searching with another keyword."}</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isItemVerified = verifiedDocs[doc.id] || doc.statusState === "active";

              // Icon & color styling based on file type
              let iconClass = "fa-file-pdf text-rose-600 bg-rose-50 border-rose-200";
              if (doc.type === "Sheets") iconClass = "fa-table text-emerald-600 bg-emerald-50 border-emerald-200";
              if (doc.type === "NDA") iconClass = "fa-shield-halved text-secondary bg-purple-50 border-purple-200";
              if (doc.type === "SOP") iconClass = "fa-file-lines text-primary bg-blue-50 border-blue-200";
              if (doc.type === "JSON") iconClass = "fa-circle-nodes text-primary bg-cyan-50 border-cyan-200";

              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDrawer(doc.id)}
                  className={`cursor-pointer group relative bg-surface-container-lowest p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                    doc.risk === "High" ? "border-error/40 hover:border-error" : isSelected ? "border-primary ring-2 ring-primary/20" : "border-outline-variant/30 hover:border-primary"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-2xs ${iconClass}`}>
                      <i className={`fa-solid ${iconClass.split(" ")[0]} text-[22px]`}></i>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[11px] flex items-center gap-1 group-hover:bg-primary group-hover:text-white transition-colors">
                      <i className="fa-regular fa-eye text-[12px]"></i> {isVi ? "Xem Drawer-004" : "Drawer-004"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-md">
                      {doc.category}
                    </span>
                    <h3 className="text-base font-bold text-on-surface mt-2 group-hover:text-primary transition-colors line-clamp-1" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {doc.deptLabel} • {doc.date}
                    </p>
                  </div>

                  <div className="space-y-1.5 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>Vector Chunks:</span>
                      <span className="font-bold text-on-surface">{doc.chunks}</span>
                    </div>
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>{isVi ? "Trạng thái Index:" : "Index Status:"}</span>
                      <span className={`font-semibold flex items-center gap-1 ${
                        doc.statusState === "warning" ? "text-error" : isItemVerified ? "text-emerald-700" : "text-primary"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          doc.statusState === "warning" ? "bg-error" : isItemVerified ? "bg-emerald-500" : "bg-primary"
                        }`}></span>
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-surface-container text-xs">
                    <span className="text-on-surface-variant font-mono">ID: {doc.id}</span>
                    <span className="font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {isVi ? "Chi tiết" : "Details"} <i className="fa-solid fa-chevron-right text-[11px]"></i>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* DOCUMENT TABLE LIST VIEW */
        /* ========================================================================= */
        <div className="panel bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="doc-table w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low text-outline font-label-caps text-label-caps uppercase text-xs">
                  <th className="p-3.5">{isVi ? "Tài liệu" : "Document"}</th>
                  <th className="p-3.5">{isVi ? "Mã ID" : "ID"}</th>
                  <th className="p-3.5">{isVi ? "Phòng ban" : "Department"}</th>
                  <th className="p-3.5">{isVi ? "Định dạng" : "Type"}</th>
                  <th className="p-3.5">{isVi ? "Dung lượng / Chunks" : "Size / Chunks"}</th>
                  <th className="p-3.5">{isVi ? "Trạng thái Tri thức" : "Knowledge Status"}</th>
                  <th className="p-3.5">{isVi ? "Rủi ro" : "Risk"}</th>
                  <th className="p-3.5 text-center">{isVi ? "Thao tác" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-outline">
                      {isVi ? "Không có tài liệu nào trong danh sách." : "No documents in list."}
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDocId === doc.id;
                    const isItemVerified = verifiedDocs[doc.id] || doc.statusState === "active";

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => handleOpenDrawer(doc.id)}
                        className={`cursor-pointer border-b border-outline-variant/10 transition-colors ${
                          isSelected ? "bg-surface-container-high/60 font-semibold" : "hover:bg-surface-container-low"
                        }`}
                      >
                        <td className="p-3.5 flex items-center gap-2.5 text-on-surface">
                          <i className={`fa-solid ${
                            doc.type === "Sheets" ? "fa-table text-emerald-600" : doc.type === "NDA" ? "fa-shield-halved text-secondary" : doc.type === "SOP" ? "fa-file-lines text-primary" : doc.type === "JSON" ? "fa-circle-nodes text-primary" : "fa-file-pdf text-rose-600"
                          } text-[16px]`}></i>
                          <div>
                            <span className="truncate max-w-[280px] font-medium block">{doc.name}</span>
                            <span className="text-[11px] text-outline block">{doc.category}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-outline text-xs">{doc.id}</td>
                        <td className="p-3.5 text-on-surface-variant text-xs">{doc.deptLabel}</td>
                        <td className="p-3.5 font-mono text-outline text-xs">{doc.type}</td>
                        <td className="p-3.5 text-xs text-on-surface-variant">{doc.size} • {doc.chunks}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            isItemVerified ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            doc.risk === "High" ? "bg-rose-50 text-rose-700 border border-rose-200" : doc.risk === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {doc.riskLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(doc.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <i className="fa-regular fa-eye"></i>
                            <span>{isVi ? "Xem" : "View"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span>{isVi ? "Hiển thị" : "Show"}</span>
          <select className="bg-surface-container-low px-2.5 py-1.5 rounded-lg text-on-surface font-medium border border-outline-variant/30 focus:outline-none">
            <option>8 {isVi ? "dòng / trang" : "rows / page"}</option>
            <option>16 {isVi ? "dòng / trang" : "rows / page"}</option>
            <option>32 {isVi ? "dòng / trang" : "rows / page"}</option>
          </select>
          <span>{isVi ? "tổng cộng 1,420 bản ghi" : "total 1,420 records"}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold">
          <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/30 transition-colors flex items-center gap-1">
            <i className="fa-solid fa-chevron-left text-[11px]"></i> {isVi ? "Trước" : "Prev"}
          </button>
          <button className="w-8 h-8 rounded-lg bg-primary text-on-primary shadow-xs flex items-center justify-center">1</button>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">2</button>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">3</button>
          <span className="px-1 text-on-surface-variant">...</span>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center">142</button>
          <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/30 transition-colors flex items-center gap-1">
            {isVi ? "Sau" : "Next"} <i className="fa-solid fa-chevron-right text-[11px]"></i>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRAWER-004: DOCUMENT PREVIEW DRAWER (60% WIDTH OVERLAY SLIDE-OVER) */}
      {/* ========================================================================= */}
      {isDrawerOpen && activeDoc && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
            onClick={() => setIsDrawerOpen(false)}
          ></div>

          {/* Drawer Panel (60% Width on Desktop or Fullscreen) */}
          <div
            className={`relative z-10 bg-surface-container-lowest shadow-2xl flex flex-col h-full border-l border-outline-variant/40 transition-all duration-300 animate-slideLeft ${
              isDrawerFullscreen ? "w-full" : "w-full lg:w-[62vw] max-w-[1300px]"
            }`}
          >
            {/* Drawer Header Bar */}
            <div className="bg-surface-container-low px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-surface-container">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                  activeDoc.type === "Sheets" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : activeDoc.type === "NDA" ? "bg-purple-50 text-secondary border-purple-200" : activeDoc.type === "SOP" ? "bg-blue-50 text-primary border-blue-200" : "bg-rose-50 text-rose-600 border-rose-200"
                }`}>
                  <i className={`fa-solid ${
                    activeDoc.type === "Sheets" ? "fa-table" : activeDoc.type === "NDA" ? "fa-shield-halved" : activeDoc.type === "SOP" ? "fa-file-lines" : "fa-file-pdf"
                  } text-[22px]`}></i>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-on-surface line-clamp-1">{activeDoc.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      {activeDoc.statusBadge}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                    {isVi ? "Khóa bảo mật: " : "Security Key: "}{activeDoc.access} • Schema: {activeDoc.schema} • SHA-256: {activeDoc.hash}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDrawerFullscreen(!isDrawerFullscreen)}
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                  title={isDrawerFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                >
                  <i className={`fa-solid ${isDrawerFullscreen ? "fa-compress" : "fa-expand"} text-[15px]`}></i>
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                  title={isVi ? "Đóng" : "Close"}
                >
                  <i className="fa-solid fa-xmark text-[16px]"></i>
                </button>
              </div>
            </div>

            {/* Drawer Body: Split 65% (Left Document Canvas) / 35% (Right Metadata & Graph Inspector) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
              {/* Left Pane (Document Canvas Simulation) */}
              <div className="lg:col-span-8 bg-surface-container-low/40 p-6 flex flex-col justify-between space-y-4 border-b lg:border-b-0 lg:border-r border-surface-container overflow-y-auto">
                {/* PDF Page Navigation & Zoom Bar */}
                <div className="bg-surface-container-lowest px-4 py-2.5 rounded-xl border border-outline-variant/30 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-1 text-xs">
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="First Page">
                      <i className="fa-solid fa-angles-left text-[13px]"></i>
                    </button>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Prev Page">
                      <i className="fa-solid fa-chevron-left text-[13px]"></i>
                    </button>
                    <span className="font-bold text-on-surface px-2">
                      {isVi ? "Trang 16 / 42" : "Page 16 of 42"}
                    </span>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Next Page">
                      <i className="fa-solid fa-chevron-right text-[13px]"></i>
                    </button>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Last Page">
                      <i className="fa-solid fa-angles-right text-[13px]"></i>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      onClick={() => setPreviewZoom(Math.max(75, previewZoom - 25))}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Zoom Out"
                    >
                      <i className="fa-solid fa-magnifying-glass-minus text-[13px]"></i>
                    </button>
                    <span className="text-on-surface px-1">{previewZoom}%</span>
                    <button
                      onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Zoom In"
                    >
                      <i className="fa-solid fa-magnifying-glass-plus text-[13px]"></i>
                    </button>
                    <span className="inline-block w-px h-4 bg-outline-variant mx-1"></span>
                    <button
                      onClick={() => setPreviewZoom(100)}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Fit Screen"
                    >
                      <i className="fa-solid fa-expand text-[13px]"></i>
                    </button>
                  </div>
                </div>

                {/* Document Page Sheet Rendering */}
                <div className="bg-surface-container-lowest p-7 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5 flex-1 overflow-y-auto leading-relaxed">
                  {/* Dynamic Document Content according to previewType */}
                  {activeDoc.previewType === "spreadsheet" ? (
                    <div className="space-y-4">
                      <div className="text-center pb-3 border-b border-surface-container">
                        <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">
                          {isVi ? "BẢNG ĐỐI SOÁT & NHỊP MUA HÀNG — Q3/2026" : "ORDER CADENCE & FULFILLMENT LEDGER — Q3/2026"}
                        </p>
                        <h2 className="text-lg font-bold text-on-surface mt-1">AdventureWorks Enterprise Orders</h2>
                        <p className="text-xs text-on-surface-variant">{isVi ? "Nguồn dữ liệu: Google Sheets ERP Export" : "Source: Google Sheets ERP Export"}</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-outline-variant/20 rounded-lg">
                          <thead className="bg-surface-container-low font-bold text-outline">
                            <tr>
                              <th className="p-2">Date</th>
                              <th className="p-2">Account Name</th>
                              <th className="p-2">Order Volume</th>
                              <th className="p-2">Valuation</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-outline-variant/10">
                              <td className="p-2 font-mono">12/09</td>
                              <td className="p-2"><span className="hl customer font-bold">ABC Corporation</span></td>
                              <td className="p-2"><span className="hl risk font-bold">5.4 units/mo (-32%)</span></td>
                              <td className="p-2"><span className="hl financial font-bold">420M VND</span></td>
                              <td className="p-2 text-emerald-600 font-semibold">Delivered</td>
                            </tr>
                            <tr className="border-t border-outline-variant/10 bg-surface-container-low/30">
                              <td className="p-2 font-mono">08/09</td>
                              <td className="p-2"><span className="hl customer font-bold">Delta Trading Ltd</span></td>
                              <td className="p-2">2.8 units/mo</td>
                              <td className="p-2"><span className="hl financial font-bold">290M VND</span></td>
                              <td className="p-2 text-emerald-600 font-semibold">Delivered</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : activeDoc.previewType === "sop" ? (
                    <div className="space-y-4">
                      <div className="text-center pb-3 border-b border-surface-container">
                        <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">
                          {isVi ? "QUY TRÌNH VẬN HÀNH TIÊU CHUẨN — NGHIỆM THU PHẦN MỀM" : "STANDARD OPERATING PROCEDURE — SOFTWARE ACCEPTANCE"}
                        </p>
                        <h2 className="text-lg font-bold text-on-surface mt-1">SOP-04: Software Delivery & Go-Live Gates</h2>
                        <p className="text-xs text-on-surface-variant">Phòng Công nghệ Thông tin & Đảm bảo Chất lượng QA</p>
                      </div>

                      <div className="space-y-3 text-sm text-on-surface">
                        <p className="font-bold text-primary">1. Mục đích và Phạm vi kiểm soát (Purpose & Scope)</p>
                        <p className="text-on-surface-variant">
                          Quy chuẩn này áp dụng bắt buộc cho toàn bộ bản phát hành module thuộc hệ sinh thái <span className="hl customer">GraphMind Enterprise</span> trước khi đẩy lên môi trường Production.
                        </p>
                        <div className="bg-amber-100/90 border border-amber-300 p-4 rounded-xl shadow-xs space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-900 flex items-center gap-1.5 font-bold">
                              <i className="fa-solid fa-highlighter text-amber-700"></i> Đoạn trích xuất GraphRAG [Chunk #108]
                            </span>
                            <span className="bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full text-[11px]">Độ tin cậy: 99.1%</span>
                          </div>
                          <p className="text-amber-950 text-sm font-medium leading-relaxed">
                            "Chu kỳ kiểm thử UAT bắt buộc hoàn tất tối thiểu <span className="hl financial">5 ngày làm việc</span> trước Go-Live. Mọi lỗi bảo mật cấp độ Critical/High <span className="hl risk">[Gate: Zero_Tolerance_P0]</span> phải được khắc phục hoàn toàn và có chữ ký kép từ Trưởng ban IT."
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Default Contract / PDF Preview */
                    <div className="space-y-4">
                      <div className="text-center pb-4 border-b border-surface-container">
                        <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">
                          {isVi ? "HỢP ĐỒNG CUNG CẤP DỊCH VỤ CÔNG NGHỆ THÔNG TIN" : "INFORMATION TECHNOLOGY MASTER SERVICES AGREEMENT"}
                        </p>
                        <h2 className="text-xl font-bold text-on-surface mt-1">MASTER SERVICES AGREEMENT</h2>
                        <p className="text-xs text-on-surface-variant">
                          Giữa CÔNG TY CỔ PHẦN ALPHA CORP và CÔNG TY TNHH ADVENTUREWORKS VIETNAM
                        </p>
                      </div>

                      <div className="space-y-4 text-sm leading-relaxed text-on-surface">
                        <p className="font-bold text-primary">
                          Điều 12: BẢO ĐẢM VÀ TRÁCH NHIỆM PHÁP LÝ (WARRANTIES AND LIABILITIES)
                        </p>
                        <p className="text-on-surface-variant">
                          12.1. Mỗi Bên cam kết có đầy đủ năng lực pháp lý và thẩm quyền để ký kết và thực hiện các nghĩa vụ quy định tại Thỏa thuận này mà không vi phạm bất kỳ thỏa thuận nào khác với bên thứ ba.
                        </p>

                        {/* Highlighted Vector Chunk with NER Pills */}
                        <div className="bg-amber-100/90 border border-amber-300 p-4 rounded-xl shadow-xs space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-900 flex items-center gap-1.5 font-bold">
                              <i className="fa-solid fa-highlighter text-amber-700"></i> Đoạn trích xuất GraphRAG [Chunk #402]
                            </span>
                            <span className="bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              {isVi ? "Độ tin cậy: 98.4%" : "Confidence: 98.4%"}
                            </span>
                          </div>
                          <p className="text-amber-950 text-sm font-medium leading-relaxed">
                            "12.2. Giới hạn Trách nhiệm bồi thường: Trong mọi trường hợp, tổng nghĩa vụ bồi thường thiệt hại trực tiếp của{" "}
                            <span className="bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-bold text-xs">[Party: Alpha Corp]</span>{" "}
                            phát sinh từ hoặc liên quan đến Hợp đồng này sẽ không vượt quá mười phần trăm (10%) tổng giá trị dịch vụ thực tế đã thanh toán{" "}
                            <span className="bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded font-bold text-xs">[Clause: Liability_Cap_10%]</span>{" "}
                            trong vòng mười hai (12) tháng trước thời điểm phát sinh khiếu nại."
                          </p>
                        </div>

                        <p className="text-on-surface-variant">
                          12.3. Không bên nào phải chịu trách nhiệm đối với bên kia về các thiệt hại gián tiếp, thiệt hại do hậu quả, hoặc tổn thất lợi nhuận dự tính, dù đã được thông báo trước về khả năng xảy ra các tổn thất đó.
                        </p>
                        <p className="text-on-surface-variant">
                          12.4. Các ngoại lệ không áp dụng giới hạn trách nhiệm bao gồm: hành vi cố ý vi phạm, gian lận, hoặc vi phạm nghĩa vụ bảo mật theo Điều 8 (Nghĩa vụ Bảo mật & Dữ liệu).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Footer OCR Info */}
                <div className="flex flex-wrap items-center justify-between text-on-surface-variant text-xs pt-1">
                  <span>OCR Engine: Tesseract 5.3 + LayoutLMv3 DeepParser</span>
                  <span className="font-mono">Chunk Vector Hash: {activeDoc.hash}</span>
                </div>
              </div>

              {/* Right Pane (Metadata & Schema Inspector Pane) */}
              <div className="lg:col-span-4 bg-surface-container-lowest p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <i className="fa-solid fa-circle-nodes text-primary text-[18px]"></i>
                      <span>{isVi ? "Metadata & Quan hệ Đồ thị" : "Metadata & Graph Mapping"}</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold text-xs">
                      Neo4j Indexed
                    </span>
                  </div>

                  {/* Key Metadata Table */}
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Phòng ban:" : "Department:"}</span>
                      <span className="font-bold text-on-surface">{activeDoc.deptLabel}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Ngày nạp tài liệu:" : "Ingested Date:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.lastSynced}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Người nạp (Uploader):" : "Uploader:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.owner}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Định dạng & Dung lượng:" : "Format & Size:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.type} • {activeDoc.size}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-on-surface-variant">{isVi ? "Quyền truy cập:" : "Access Control:"}</span>
                      <span className="font-bold text-secondary">{activeDoc.access}</span>
                    </div>
                  </div>

                  {/* Neo4j Graph Relationship Summary */}
                  <div className="space-y-2">
                    <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                      {isVi ? "Đồ thị quan hệ Neo4j (Graph Triples)" : "Neo4j Relationship Path"}
                    </p>
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2.5 text-xs">
                      {activeDoc.neo4jRel?.map((rel, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[11px]">
                              {rel.from}
                            </span>
                          </div>
                          <div className={`pl-4 font-bold flex items-center gap-1 text-[11px] ${rel.isRisk ? "text-error" : "text-secondary"}`}>
                            <i className="fa-solid fa-arrow-turn-down-right"></i>
                            <span>[{rel.rel}]</span>
                          </div>
                          <div className="flex items-center gap-2 pl-4">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              rel.isRisk ? "bg-rose-100 text-rose-900" : "bg-purple-100 text-purple-900"
                            }`}>
                              {rel.to}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extracted Entity Triples List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="uppercase font-bold tracking-wider text-on-surface-variant">
                        {isVi ? "Thực thể tri thức đã bóc tách" : "Extracted Entity Triples"}
                      </span>
                      <span className="font-mono text-primary font-bold">
                        {activeDoc.entities?.length || 0} {isVi ? "THỰC THỂ" : "ENTITIES"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {activeDoc.entities?.map((ent, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-surface-container-low rounded-lg border border-outline-variant/10 text-xs"
                        >
                          <span className="text-outline font-semibold uppercase text-[11px]">{ent.key}</span>
                          <span className={`font-mono font-bold ${
                            ent.type === "risk" ? "text-error" : ent.type === "financial" ? "text-primary" : "text-on-surface"
                          }`}>
                            {ent.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions & Policy Callout */}
                <div className="space-y-3 pt-4 border-t border-surface-container">
                  {/* C4 Security Callout */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
                    <i className="fa-solid fa-shield-halved text-amber-700 text-[16px] shrink-0 mt-0.5"></i>
                    <div>
                      <strong className="font-bold">{isVi ? "Chính sách bảo mật C4: " : "C4 Security Policy: "}</strong>
                      {isVi
                        ? "Tài khoản Standard & Dept Manager chỉ được xem trước (Read-Only). Quyền Tải xuống tài liệu gốc được kiểm soát chặt chẽ theo Audit Log."
                        : "Standard & Dept Manager accounts are restricted to Read-Only preview. Raw file downloads are restricted and audited."}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handleVerifyCurrentDoc}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-2 ${
                        isDocVerified
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-primary text-on-primary hover:bg-blue-700"
                      }`}
                    >
                      <i className={`fa-solid ${isDocVerified ? "fa-check-double" : "fa-stamp"}`}></i>
                      <span>
                        {isDocVerified
                          ? (isVi ? "✓ Đã xác thực & Đồng bộ vào Neo4j (HITL)" : "✓ Verified & Committed to Neo4j")
                          : (isVi ? "Xác thực Toàn bộ Thực thể (HITL)" : "Verify All Extractions (HITL)")}
                      </span>
                    </button>

                    <button
                      onClick={handleDownloadDoc}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        isAdmin
                          ? "bg-surface-container-high text-on-surface hover:bg-surface-container border-outline-variant/40"
                          : "bg-surface-container-low text-outline border-outline-variant/20 cursor-not-allowed opacity-75"
                      }`}
                    >
                      <i className="fa-solid fa-cloud-arrow-down text-[15px]"></i>
                      <span>{isVi ? "Tải xuống tài liệu gốc" : "Download Raw Document"}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        isAdmin ? "bg-primary/10 text-primary" : "bg-outline-variant/40 text-outline"
                      }`}>
                        {isAdmin ? (isVi ? "Admin Đã xác thực" : "Admin Verified") : (isVi ? "Chỉ Admin" : "Admin Only")}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          if (onNavigate) onNavigate("knowledge");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-circle-nodes text-primary"></i>
                        <span>{isVi ? "Mở trên Đồ thị" : "Open in Graph"}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          if (onNavigate) onNavigate("copilot");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-robot text-cyan-600"></i>
                        <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
