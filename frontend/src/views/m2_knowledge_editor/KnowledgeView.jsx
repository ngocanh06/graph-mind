import React, { useState } from "react";

export default function KnowledgeView({
  entities,
  selectedEntity,
  onSelectEntity,
  onUpdateEntity,
  onNavigate,
  t,
  lang = "vi",
  role,
  currentUser
}) {
  const isVi = lang === "vi";

  // Sub-tab navigation: "canvas" | "queue"
  const [activeTab, setActiveTab] = useState("canvas");

  // Filter chips selection
  const [selectedEntityFilter, setSelectedEntityFilter] = useState("ALL");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [toastMsg, setToastMsg] = useState("");

  // Quick Entity creation modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("Customer");

  // Selected Node state for Inspector
  const [selectedNode, setSelectedNode] = useState({
    id: "Clause_12.2",
    name: "Unilateral Liability Cap",
    label: "Mục 12.2: Giới hạn trách nhiệm bồi thường",
    type: "Clause",
    badge: "Clause Node",
    docSource: "CUAD_Service_Agreement_v4.pdf",
    chunkId: "Qdrant_Chunk_#402",
    penaltyLimit: "10% total fee in 12 months",
    isRisk: true,
    notes: "Mức trần 10% này thấp hơn tiêu chuẩn 30% của công ty. Cần lưu ý khi soạn phụ lục đàm phán lại.",
    properties: {
      is_unilateral: "true (Bất đối xứng)",
      cap_percentage: "10% (0.10)",
      risk_score: "0.942 (Rất cao)",
      contract_ref: "CUAD_042",
      page_number: "16"
    }
  });

  // Selected Edge state for Floating Toolbar
  const [selectedEdge, setSelectedEdge] = useState({
    id: "edge-3",
    label: "HAS_RISK_LIABILITY",
    from: "CUAD_042",
    to: "Clause_12.2",
    color: "#ba1a1a"
  });

  // Queue state for Pending Reviews (SCREEN-016-QUEUE)
  const [queueItems, setQueueItems] = useState([
    {
      id: "q-1",
      source: "Alpha Corp Global",
      sourceType: "Organization",
      sourceColor: "bg-blue-600",
      relation: "PARENT_COMPANY_OF",
      target: "Alpha Corp Vietnam Ltd",
      targetType: "Subsidiary",
      targetColor: "bg-blue-600",
      confidence: 74.2,
      doc: "CUAD_Service_Agreement_v4.pdf",
      clause: isVi ? "Trang 2 • Khổ 4" : "Page 2 • Para 4",
      status: "pending",
      selected: true
    },
    {
      id: "q-2",
      source: "CUAD_Procurement_087",
      sourceType: "Contract",
      sourceColor: "bg-indigo-600",
      relation: "EXPIRES_AT",
      target: "31/12/2026",
      targetType: "Date Milestone",
      targetColor: "bg-amber-600",
      confidence: 68.5,
      doc: "CUAD_Procurement_Contract_087.pdf",
      clause: isVi ? "Trang 18 • Điều 22" : "Page 18 • Art 22",
      status: "pending",
      selected: true
    },
    {
      id: "q-3",
      source: "Lê Hoàng Minh",
      sourceType: "Employee",
      sourceColor: "bg-purple-600",
      relation: "AUTHORIZED_SIGNER",
      target: "CUAD_042",
      targetType: "Contract",
      targetColor: "bg-indigo-600",
      confidence: 81.0,
      doc: "Master_NDA_AlphaCorp_Signed.pdf",
      clause: isVi ? "Phụ lục Ủy quyền" : "Authorization Addendum",
      status: "pending",
      selected: true
    },
    {
      id: "q-4",
      source: "SaaS Engine Pro",
      sourceType: "Product",
      sourceColor: "bg-cyan-600",
      relation: "GOVERNED_BY_SOP",
      target: "SOP-02",
      targetType: "Procedure",
      targetColor: "bg-primary",
      confidence: 79.4,
      doc: "SOP_Nghiem_Thu_Phan_Mem_v2.1.docx",
      clause: isVi ? "Phần 1.2" : "Section 1.2",
      status: "pending",
      selected: true
    }
  ]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const ENTITY_CHIPS = [
    { key: "Customer", label: "Customer", count: 340, bg: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-600" },
    { key: "Product", label: "Product", count: 1120, bg: "bg-cyan-50 text-cyan-800 border-cyan-200", dot: "bg-cyan-600" },
    { key: "Order", label: "Order", count: 4290, bg: "bg-amber-50 text-amber-900 border-amber-200", dot: "bg-amber-600" },
    { key: "Employee", label: "Employee", count: 89, bg: "bg-purple-50 text-purple-900 border-purple-200", dot: "bg-purple-600" },
    { key: "Vendor", label: "Vendor", count: 142, bg: "bg-orange-50 text-orange-900 border-orange-200", dot: "bg-orange-600" },
    { key: "Contract", label: "Contract", count: 68, bg: "bg-indigo-50 text-indigo-900 border-indigo-200", dot: "bg-indigo-600" },
    { key: "Clause", label: "Clause", count: 412, bg: "bg-rose-50 text-rose-900 border-rose-200 font-bold", dot: "bg-rose-600" },
  ];

  const handleSaveAttributeChanges = () => {
    showToast(isVi ? `Đã lưu thuộc tính ${selectedNode.id} và cập nhật vector weights trong Qdrant!` : `Saved attributes for ${selectedNode.id} and updated Qdrant weights!`);
  };

  const handleDeleteEntity = () => {
    showToast(isVi ? `Đã xóa thực thể ${selectedNode.id} khỏi đồ thị Neo4j.` : `Deleted entity ${selectedNode.id} from Neo4j.`);
  };

  const handleBatchApprove = () => {
    const selectedCount = queueItems.filter((q) => q.selected && q.status === "pending").length;
    if (selectedCount === 0) {
      showToast(isVi ? "Chưa chọn mục nào trong hàng chờ." : "No pending items selected.");
      return;
    }
    setQueueItems((prev) =>
      prev.map((item) => (item.selected ? { ...item, status: "approved" } : item))
    );
    showToast(isVi ? `Đã duyệt ${selectedCount} quan hệ và đồng bộ thẳng vào Neo4j Production!` : `Approved ${selectedCount} relations and committed to Neo4j Production!`);
  };

  const handleBatchReject = () => {
    const selectedCount = queueItems.filter((q) => q.selected && q.status === "pending").length;
    if (selectedCount === 0) {
      showToast(isVi ? "Chưa chọn mục nào trong hàng chờ." : "No pending items selected.");
      return;
    }
    setQueueItems((prev) =>
      prev.map((item) => (item.selected ? { ...item, status: "rejected" } : item))
    );
    showToast(isVi ? `Đã từ chối ${selectedCount} quan hệ khỏi đồ thị.` : `Rejected ${selectedCount} relations from graph.`);
  };

  const handleRowAction = (id, newStatus) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showToast(
      newStatus === "approved"
        ? (isVi ? "Đã chấp thuận quan hệ tri thức!" : "Relationship approved!")
        : (isVi ? "Đã từ chối quan hệ tri thức!" : "Relationship rejected!")
    );
  };

  const toggleSelectQueue = (id) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAllQueue = () => {
    const allSelected = queueItems.every((q) => q.selected);
    setQueueItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleCreateNewEntity = (e) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;
    showToast(isVi ? `Đã khởi tạo thực thể [${newEntityType}: ${newEntityName}] trong Neo4j!` : `Created entity [${newEntityType}: ${newEntityName}] in Neo4j!`);
    setIsAddModalOpen(false);
    setNewEntityName("");
  };

  return (
    <div className="space-y-4 font-sans text-on-surface min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-surface-container-high border border-primary/40 text-on-surface text-xs font-medium rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <i className="fa-solid fa-circle-check text-primary text-[16px]"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEADER & CONTROLS (SCREEN-016) */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-xs font-bold tracking-wider">
              SCREEN-016
            </span>
            <h1 className="text-xl font-bold text-on-surface tracking-tight">
              {isVi ? "Knowledge Editor — Trực quan hóa & Hiệu chỉnh Tri thức AI" : "Knowledge Editor — AI Knowledge Visualizer & Human-in-the-Loop"}
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant">
            {isVi
              ? "Human-in-the-loop: Tinh chỉnh liên kết thực thể, bổ sung ontology và đồng bộ hai chiều Neo4j & Qdrant."
              : "Human-in-the-loop: Refine entity triples, curate enterprise ontology, and synchronize bidirectionally with Neo4j & Qdrant."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow hover:bg-blue-700 transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[14px]"></i>
            <span>{isVi ? "Thực thể mới" : "New Entity"}</span>
          </button>
          <button
            onClick={() => showToast(isVi ? "Kéo thả giữa 2 node trên canvas để tạo quan hệ mới" : "Drag between 2 nodes on canvas to create relation")}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-link text-[14px]"></i>
            <span>{isVi ? "Thêm quan hệ" : "Add Relation"}</span>
          </button>
          <button
            onClick={() => showToast(isVi ? "Đã hoàn tác thao tác gần nhất" : "Undone last action")}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-rotate-left text-[14px]"></i>
            <span>{isVi ? "Hoàn tác" : "Undo"}</span>
          </button>
          <button
            onClick={() => showToast(isVi ? "Đã lưu và đồng bộ toàn bộ đồ thị vào Neo4j + Qdrant!" : "Committed all graph changes to Neo4j + Qdrant!")}
            className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-semibold shadow hover:bg-purple-700 transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-rotate text-[14px]"></i>
            <span>{isVi ? "Lưu Neo4j + Qdrant" : "Commit to Neo4j"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-BAR: VIEW TOGGLE (CANVAS vs REVIEW QUEUE) & ENTITY COLOR SPECTRUM */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 shadow-2xs text-xs font-semibold">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-on-surface-variant px-1">{isVi ? "Lọc thực thể:" : "Filter:"}</span>

          {/* 7 Taxonomies Chips */}
          {ENTITY_CHIPS.map((chip) => {
            const isActive = selectedEntityFilter === chip.key || selectedEntityFilter === "ALL";
            return (
              <span
                key={chip.key}
                onClick={() => setSelectedEntityFilter(selectedEntityFilter === chip.key ? "ALL" : chip.key)}
                className={`px-3 py-1 rounded-full border flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                  chip.bg
                } ${!isActive ? "opacity-35 grayscale" : "opacity-100 hover:scale-105"}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${chip.dot}`}></span>
                <span>{chip.label} ({chip.count})</span>
              </span>
            );
          })}
        </div>

        {/* Tab switch button between Canvas & Queue */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "canvas"
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
          >
            <i className="fa-solid fa-circle-nodes text-[14px]"></i>
            <span>{isVi ? "Graph Canvas" : "Canvas"}</span>
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "queue"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <i className="fa-solid fa-list-check text-[14px]"></i>
            <span>{isVi ? "Hàng chờ duyệt NER (114 mục)" : "Review Queue (114)"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE GRAPH CANVAS (SCREEN-016) */}
      {/* ========================================================================= */}
      {activeTab === "canvas" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: GRAPH CANVAS SIMULATION (8 Cols) */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-xs relative min-h-[600px] overflow-hidden flex flex-col justify-between">
            {/* Floating Top-Left Subgraph Context */}
            <div className="absolute top-4 left-4 z-10 bg-surface-container-lowest/90 backdrop-blur px-3 py-1.5 rounded-xl border border-outline-variant/40 shadow-xs flex items-center gap-2 text-xs text-on-surface">
              <i className="fa-solid fa-circle-nodes text-primary text-[15px]"></i>
              <span>{isVi ? "Đồ thị con: " : "Subgraph: "}<strong>Hợp đồng Alpha Corp CUAD_042</strong></span>
            </div>

            {/* Floating Top-Right Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 bg-surface-container-lowest/90 backdrop-blur p-1 rounded-xl border border-outline-variant/40 shadow-xs flex items-center gap-1 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Thu nhỏ"
              >
                <i className="fa-solid fa-minus text-[13px]"></i>
              </button>
              <span className="px-2 font-bold font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 180))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Phóng to"
              >
                <i className="fa-solid fa-plus text-[13px]"></i>
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Căn giữa"
              >
                <i className="fa-solid fa-compress text-[13px]"></i>
              </button>
            </div>

            {/* Simulated SVG Graph Visual with Arrows & Rich Nodes */}
            <div className="w-full h-full flex-1 flex items-center justify-center relative my-2 overflow-hidden">
              <svg
                className="w-full h-[470px]"
                fill="none"
                viewBox="0 0 700 450"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out"
                }}
              >
                <defs>
                  <pattern id="canvas-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E2E7FF" strokeWidth="0.8" />
                  </pattern>
                  <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#004AC6" />
                  </marker>
                  <marker id="arrow-purple" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#712AE2" />
                  </marker>
                  <marker id="arrow-red" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#BA1A1A" />
                  </marker>
                </defs>

                <rect width="100%" height="100%" fill="url(#canvas-grid)" />

                {/* Edges / Links with Directional Markers */}
                <path
                  d="M 180 180 L 350 140"
                  stroke="#712AE2"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  markerEnd="url(#arrow-purple)"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedEdge({
                      id: "edge-1",
                      label: "PARTNER_OF",
                      from: "Alpha Corp",
                      to: "CUAD_042",
                      color: "#712AE2"
                    })
                  }
                />
                <path
                  d="M 350 140 L 520 220"
                  stroke="#004AC6"
                  strokeWidth="2"
                  markerEnd="url(#arrow-blue)"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedEdge({
                      id: "edge-2",
                      label: "INCLUDES_ITEM",
                      from: "CUAD_042",
                      to: "Cloud Infra",
                      color: "#004AC6"
                    })
                  }
                />
                <path
                  d="M 350 140 L 350 320"
                  stroke="#BA1A1A"
                  strokeWidth="3"
                  markerEnd="url(#arrow-red)"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedEdge({
                      id: "edge-3",
                      label: "HAS_RISK_LIABILITY",
                      from: "CUAD_042",
                      to: "Clause_12.2",
                      color: "#BA1A1A"
                    })
                  }
                />
                <path
                  d="M 520 220 L 520 340"
                  stroke="#712AE2"
                  strokeWidth="2"
                  markerEnd="url(#arrow-purple)"
                />

                {/* Edge Labels */}
                <rect x="230" y="145" width="85" height="20" rx="4" fill="#F2F3FF" stroke="#C3C6D7" strokeWidth="0.5" />
                <text x="272" y="159" textAnchor="middle" fill="#712AE2" fontSize="10" fontWeight="600" fontFamily="Inter">
                  PARTNER_OF
                </text>

                <rect x="408" y="165" width="90" height="20" rx="4" fill="#F2F3FF" stroke="#C3C6D7" strokeWidth="0.5" />
                <text x="453" y="179" textAnchor="middle" fill="#004AC6" fontSize="10" fontWeight="600" fontFamily="Inter">
                  INCLUDES_ITEM
                </text>

                <rect x="308" y="225" width="135" height="22" rx="4" fill="#FFDAD6" stroke="#BA1A1A" strokeWidth="0.5" />
                <text x="375" y="240" textAnchor="middle" fill="#BA1A1A" fontSize="10" fontWeight="bold" fontFamily="Inter">
                  HAS_RISK_LIABILITY
                </text>

                {/* Node 1: Vendor (Alpha Corp) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(180, 180)"
                  onClick={() => {
                    setSelectedNode({
                      id: "Party_AlphaCorp",
                      name: "Alpha Corporation",
                      label: "Alpha Corp (Customer VIP)",
                      type: "Customer",
                      badge: "Customer Node",
                      docSource: "CUAD_Service_Agreement_v4.pdf",
                      chunkId: "Qdrant_Chunk_#101",
                      penaltyLimit: "N/A",
                      isRisk: false,
                      notes: "Khách hàng cấp Enterprise, đã ký hợp đồng dịch vụ CUAD.",
                      properties: {
                        credit_rating: "AAA Enterprise",
                        annual_revenue: "42,000,000,000 VND",
                        contract_status: "Active (Chờ rà soát Q4)"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Alpha Corp" : "Selected Node: Alpha Corp");
                  }}
                >
                  <circle r="42" fill="#EAEDFF" stroke="#004AC6" strokeWidth="2" />
                  <circle cx="0" cy="0" r="6" fill="#004AC6" />
                  <text y="-8" textAnchor="middle" fill="#004AC6" fontSize="11" fontWeight="bold" fontFamily="Inter">Alpha Corp</text>
                  <text y="10" textAnchor="middle" fill="#434655" fontSize="9" fontFamily="Inter">Party / Vendor</text>
                </g>

                {/* Node 2: Center Contract (CUAD_042) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(350, 140)"
                  onClick={() => {
                    setSelectedNode({
                      id: "CUAD_042",
                      name: "Master Service Agreement v4",
                      label: "Hợp đồng dịch vụ CUAD_042",
                      type: "Contract",
                      badge: "Contract Node",
                      docSource: "CUAD_Service_Agreement_v4.pdf",
                      chunkId: "Qdrant_Chunk_#204",
                      penaltyLimit: "1.2B VND (Total Valuation)",
                      isRisk: true,
                      notes: "Hợp đồng dịch vụ IT có điều khoản giới hạn bồi thường bất lợi.",
                      properties: {
                        effective_date: "01/01/2026",
                        expiration_date: "18/10/2026 (12 ngày còn lại)",
                        governing_law: "Luật Thương mại Việt Nam"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: CUAD_042" : "Selected Node: CUAD_042");
                  }}
                >
                  <circle r="48" fill="#EAEDFF" stroke="#712AE2" strokeWidth="3" />
                  <circle cx="0" cy="0" r="8" fill="#712AE2" />
                  <text y="-8" textAnchor="middle" fill="#712AE2" fontSize="12" fontWeight="bold" fontFamily="Inter">CUAD_042</text>
                  <text y="10" textAnchor="middle" fill="#434655" fontSize="9" fontFamily="Inter">Service Agreement</text>
                </g>

                {/* Node 3: Product / Service */}
                <g
                  className="cursor-pointer group"
                  transform="translate(520, 220)"
                  onClick={() => {
                    setSelectedNode({
                      id: "Cloud_Infra_01",
                      name: "Cloud Enterprise Infrastructure",
                      label: "Sản phẩm Cloud Infra",
                      type: "Product",
                      badge: "Product Node",
                      docSource: "AdventureWorks_Sales_Q3_2026.xlsx",
                      chunkId: "Qdrant_Chunk_#312",
                      penaltyLimit: "99.9% Uptime SLA",
                      isRisk: false,
                      notes: "Hạ tầng đám mây đạt tiêu chuẩn ISO 27001.",
                      properties: {
                        sla_commitment: "99.9% Uptime",
                        monthly_fee: "85,000,000 VND"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Cloud Infra" : "Selected Node: Cloud Infra");
                  }}
                >
                  <circle r="38" fill="#F2F3FF" stroke="#0074A6" strokeWidth="2" />
                  <circle cx="0" cy="0" r="5" fill="#0074A6" />
                  <text y="-6" textAnchor="middle" fill="#0074A6" fontSize="10" fontWeight="bold" fontFamily="Inter">Cloud Infra</text>
                  <text y="8" textAnchor="middle" fill="#434655" fontSize="8" fontFamily="Inter">Product</text>
                </g>

                {/* Node 4: Selected Clause Node (Clause_12.2) with Pulse Ring */}
                <g
                  className="cursor-pointer group"
                  transform="translate(350, 320)"
                  onClick={() => {
                    setSelectedNode({
                      id: "Clause_12.2",
                      name: "Unilateral Liability Cap",
                      label: "Mục 12.2: Giới hạn trách nhiệm bồi thường",
                      type: "Clause",
                      badge: "Clause Node",
                      docSource: "CUAD_Service_Agreement_v4.pdf",
                      chunkId: "Qdrant_Chunk_#402",
                      penaltyLimit: "10% total fee in 12 months",
                      isRisk: true,
                      notes: "Mức trần 10% này thấp hơn tiêu chuẩn 30% của công ty. Cần lưu ý khi soạn phụ lục đàm phán lại.",
                      properties: {
                        is_unilateral: "true (Bất đối xứng)",
                        cap_percentage: "10% (0.10)",
                        risk_score: "0.942 (Rất cao)",
                        contract_ref: "CUAD_042",
                        page_number: "16"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Clause_12.2" : "Selected Node: Clause_12.2");
                  }}
                >
                  <circle r="50" fill="#FFDAD6" stroke="#BA1A1A" strokeWidth="3" />
                  <circle r="56" fill="none" stroke="#BA1A1A" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                  <circle cx="0" cy="0" r="8" fill="#BA1A1A" />
                  <text y="-8" textAnchor="middle" fill="#BA1A1A" fontSize="11" fontWeight="bold" fontFamily="Inter">Clause_12.2</text>
                  <text y="10" textAnchor="middle" fill="#93000A" fontSize="9" fontFamily="Inter">Liability Cap 10%</text>
                </g>

                {/* Node 5: SLA Condition */}
                <g
                  className="cursor-pointer group"
                  transform="translate(520, 340)"
                  onClick={() => {
                    setSelectedNode({
                      id: "SLA_999",
                      name: "SLA 99.9% High Availability",
                      label: "Điều kiện SLA 99.9%",
                      type: "Clause",
                      badge: "Requirement Node",
                      docSource: "CUAD_Service_Agreement_v4.pdf",
                      chunkId: "Qdrant_Chunk_#512",
                      penaltyLimit: "5% penalty per 0.1% downtime",
                      isRisk: false,
                      notes: "Cam kết chỉ số uptime hạ tầng Cloud.",
                      properties: {
                        requirement_type: "Operational SLA",
                        reporting_cycle: "Monthly"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: SLA 99.9%" : "Selected Node: SLA 99.9%");
                  }}
                >
                  <circle r="36" fill="#F2F3FF" stroke="#712AE2" strokeWidth="2" />
                  <circle cx="0" cy="0" r="5" fill="#712AE2" />
                  <text y="-6" textAnchor="middle" fill="#712AE2" fontSize="10" fontWeight="bold" fontFamily="Inter">SLA 99.9%</text>
                  <text y="8" textAnchor="middle" fill="#434655" fontSize="8" fontFamily="Inter">Requirement</text>
                </g>
              </svg>

              {/* Floating Context Toolbar for Selected Relationship */}
              {selectedEdge && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-container-lowest border border-outline-variant/40 p-2 rounded-xl shadow-lg flex items-center gap-2">
                  <span className="text-xs text-on-surface px-2">
                    {isVi ? "Cạnh chọn: " : "Selected Edge: "}
                    <strong className="text-error">{selectedEdge.label}</strong>
                  </span>
                  <button
                    onClick={() => showToast(isVi ? "Đang mở cửa sổ chỉnh sửa loại quan hệ" : "Opening relation modifier")}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container text-xs font-semibold"
                  >
                    {isVi ? "Sửa quan hệ" : "Edit Relation"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEdge((e) => ({ ...e, label: "BOUND_BY" }));
                      showToast(isVi ? "Đã đổi thành [BOUND_BY]" : "Changed to [BOUND_BY]");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold"
                  >
                    {isVi ? "Đổi: BOUND_BY" : "Switch: BOUND_BY"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEdge(null);
                      showToast(isVi ? "Đã xóa cạnh liên kết" : "Deleted relation edge");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-white transition-colors text-xs font-semibold"
                  >
                    {isVi ? "Xóa cạnh" : "Delete Edge"}
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Footer Status */}
            <div className="flex flex-wrap items-center justify-between text-on-surface-variant text-xs pt-2 border-t border-surface-container">
              <span>
                {isVi
                  ? "Kéo thả node để tái cấu trúc quan hệ ontology • Giữ Shift để chọn nhiều"
                  : "Drag nodes to restructure ontology • Hold Shift to multi-select"}
              </span>
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                5 Nodes • 4 Edges • Thuật toán Fruchterman-Reingold
              </span>
            </div>
          </div>

          {/* RIGHT: ENTITY PROPERTIES & HUMAN FEEDBACK INSPECTOR (4 Cols) */}
          <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-error text-[18px]"></i>
                  <h3 className="text-base font-bold text-on-surface">
                    {isVi ? "Thuộc tính Thực thể" : "Entity Properties"}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                  {selectedNode.badge}
                </span>
              </div>

              {/* Selected Node Meta */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Entity ID:</span>
                  <code className="font-mono text-primary bg-primary-fixed/50 px-2 py-0.5 rounded text-[11px] font-bold">
                    {selectedNode.id}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">{isVi ? "Tài liệu trích xuất:" : "Extracted Source:"}</span>
                  <span className="text-on-surface font-semibold truncate max-w-[200px]" title={selectedNode.docSource}>
                    {selectedNode.docSource}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Vector Chunk ID:</span>
                  <span className="text-on-surface font-mono text-[11px]">{selectedNode.chunkId}</span>
                </div>
              </div>

              {/* Editable Attributes Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    {isVi ? "Tên điều khoản (clause_name)" : "Clause Name (clause_name)"}
                  </label>
                  <input
                    type="text"
                    value={selectedNode.name}
                    onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    {isVi ? "Giới hạn bồi thường (penalty_limit)" : "Liability Cap (penalty_limit)"}
                  </label>
                  <input
                    type="text"
                    value={selectedNode.penaltyLimit}
                    onChange={(e) => setSelectedNode({ ...selectedNode, penaltyLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <div>
                    <p className="font-bold text-on-surface">{isVi ? "Đánh dấu Rủi ro (is_risk)" : "Flag as Risk (is_risk)"}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {isVi ? "Cảnh báo tới hệ thống Copilot & Risk Engine" : "Alerts Copilot & Risk Engine"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedNode.isRisk}
                    onChange={(e) => setSelectedNode({ ...selectedNode, isRisk: e.target.checked })}
                    className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    {isVi ? "Ghi chú chuyên viên pháp chế (Human Feedback)" : "Specialist Notes (Human Feedback)"}
                  </label>
                  <textarea
                    rows="3"
                    value={selectedNode.notes}
                    onChange={(e) => setSelectedNode({ ...selectedNode, notes: e.target.value })}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="space-y-2 pt-4 border-t border-surface-container">
              <button
                onClick={handleSaveAttributeChanges}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-circle-check text-[15px]"></i>
                <span>{isVi ? "Lưu thay đổi thuộc tính" : "Save Attribute Changes"}</span>
              </button>

              <button
                onClick={handleDeleteEntity}
                className="w-full py-2 rounded-xl bg-surface-container-low text-error hover:bg-error-container hover:text-on-error-container text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-trash-can text-[14px]"></i>
                <span>{isVi ? "Xóa Thực thể khỏi Graph" : "Delete Entity from Graph"}</span>
              </button>

              <button
                onClick={() => {
                  if (onNavigate) onNavigate("copilot");
                }}
                className="w-full py-1.5 rounded-xl text-primary hover:bg-primary-fixed/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-robot text-[13px]"></i>
                <span>{isVi ? "Hỏi Copilot về thực thể này" : "Ask Copilot about this node"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING REVIEW QUEUE (SCREEN-016-QUEUE) */}
      {/* ========================================================================= */}
      {activeTab === "queue" && (
        <div className="space-y-5">
          {/* Banner for Review Queue */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-on-surface shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-xs">
                  {isVi ? "Cần Human-in-the-loop" : "HITL Required"}
                </span>
                <h2 className="text-xl font-bold text-on-surface">
                  {isVi ? "Hàng chờ duyệt trích xuất tự động (Pending Review Queue)" : "Automated Extraction Pending Review Queue"}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
                {isVi
                  ? "Các quan hệ thực thể có độ tin cậy mô hình < 85% hoặc phát hiện mâu thuẫn NER cần phê duyệt trước khi ghi vào đồ thị tri thức production."
                  : "Entity relations with model confidence < 85% or detected NER ambiguities requiring human review before committing to production Graph DB."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBatchApprove}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-all flex items-center gap-1.5"
              >
                <i className="fa-solid fa-check-double text-[15px]"></i>
                <span>{isVi ? "Duyệt hàng loạt (Approve)" : "Batch Approve"}</span>
              </button>
              <button
                onClick={handleBatchReject}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700 transition-all flex items-center gap-1.5"
              >
                <i className="fa-solid fa-ban text-[15px]"></i>
                <span>{isVi ? "Từ chối hàng loạt (Reject)" : "Batch Reject"}</span>
              </button>
            </div>
          </div>

          {/* Batch Selection Summary Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container-low font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={queueItems.every((q) => q.selected)}
                        onChange={toggleSelectAllQueue}
                        className="w-4 h-4 rounded text-primary border-outline-variant"
                      />
                    </th>
                    <th className="p-4">{isVi ? "Thực thể / Nguồn" : "Source Entity"}</th>
                    <th className="p-4">{isVi ? "Loại quan hệ dự đoán" : "Predicted Relation"}</th>
                    <th className="p-4">{isVi ? "Thực thể đích" : "Target Entity"}</th>
                    <th className="p-4 text-center">{isVi ? "Độ tin cậy (%)" : "Confidence (%)"}</th>
                    <th className="p-4">{isVi ? "Nguồn trích xuất" : "Extracted Source"}</th>
                    <th className="p-4 text-right">{isVi ? "Hành động nhanh" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {queueItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-container-low/70 transition-colors ${
                        item.status === "approved"
                          ? "bg-emerald-50/50"
                          : item.status === "rejected"
                          ? "bg-rose-50/50 opacity-60"
                          : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelectQueue(item.id)}
                          className="w-4 h-4 rounded text-primary border-outline-variant"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.sourceColor}`}></span>
                          <span className="font-bold text-on-surface">{item.source}</span>
                        </div>
                        <span className="text-on-surface-variant text-[11px]">Type: {item.sourceType}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-[11px] font-mono">
                          {item.relation}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.targetColor}`}></span>
                          <span className="font-bold text-on-surface">{item.target}</span>
                        </div>
                        <span className="text-on-surface-variant text-[11px]">Type: {item.targetType}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          item.confidence >= 80 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"
                        }`}>
                          {item.confidence}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-on-surface line-clamp-1">{item.doc}</div>
                        <div className="text-on-surface-variant text-[11px]">{item.clause}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "approved" ? (
                            <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                              <i className="fa-solid fa-check"></i> {isVi ? "Đã duyệt" : "Approved"}
                            </span>
                          ) : item.status === "rejected" ? (
                            <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                              <i className="fa-solid fa-xmark"></i> {isVi ? "Đã từ chối" : "Rejected"}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRowAction(item.id, "approved")}
                                className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                                title={isVi ? "Chấp thuận" : "Approve"}
                              >
                                <i className="fa-solid fa-check text-[15px]"></i>
                              </button>
                              <button
                                onClick={() => showToast(isVi ? `Đang mở trình sửa quan hệ cho ${item.source}` : `Editing ${item.source}`)}
                                className="p-1.5 rounded-lg hover:bg-surface-container text-primary transition-colors"
                                title={isVi ? "Chỉnh sửa" : "Edit"}
                              >
                                <i className="fa-solid fa-pen-to-square text-[15px]"></i>
                              </button>
                              <button
                                onClick={() => handleRowAction(item.id, "rejected")}
                                className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-700 transition-colors"
                                title={isVi ? "Từ chối" : "Reject"}
                              >
                                <i className="fa-solid fa-xmark text-[15px]"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container flex flex-wrap items-center justify-between text-on-surface-variant text-xs gap-3">
              <span>
                {isVi ? "Đã chọn" : "Selected"}{" "}
                <strong className="text-on-surface">{queueItems.filter((q) => q.selected).length}</strong> / {queueItems.length} {isVi ? "mục trong hàng chờ duyệt hôm nay" : "items in queue"}
              </span>
              <span className="text-primary font-semibold">
                {isVi ? "Nhấn [Duyệt hàng loạt] để đồng bộ thẳng vào Neo4j Graph DB" : "Click [Batch Approve] to commit directly to Neo4j"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ENTITY CREATION MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-2xl w-full max-w-md p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="text-base font-bold text-on-surface">
                {isVi ? "Thêm Thực thể Mới vào Đồ thị" : "Add New Entity to Graph"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface"
              >
                <i className="fa-solid fa-xmark text-[16px]"></i>
              </button>
            </div>

            <form onSubmit={handleCreateNewEntity} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-on-surface mb-1">
                  {isVi ? "Tên Thực thể (Entity Name)" : "Entity Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isVi ? "Ví dụ: Beta Global Ltd, Điều 5.1..." : "e.g. Beta Global Ltd, Section 5.1..."}
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">
                  {isVi ? "Loại Thực thể (Taxonomy Type)" : "Taxonomy Type"}
                </label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Customer">Customer (Khách hàng)</option>
                  <option value="Product">Product (Sản phẩm)</option>
                  <option value="Order">Order (Đơn hàng)</option>
                  <option value="Employee">Employee (Nhân viên)</option>
                  <option value="Vendor">Vendor (Nhà cung cấp)</option>
                  <option value="Contract">Contract (Hợp đồng)</option>
                  <option value="Clause">Clause (Điều khoản)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold"
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold shadow hover:bg-blue-700"
                >
                  {isVi ? "Tạo Thực thể" : "Create Entity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
