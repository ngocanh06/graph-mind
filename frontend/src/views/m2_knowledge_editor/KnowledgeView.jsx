import React, { useState } from "react";

export default function KnowledgeView({
  entities,
  selectedEntity,
  onSelectEntity,
  onUpdateEntity,
  onNavigate,
  t,
  lang = "vi"
}) {
  const isVi = lang === "vi";

  // Entity filter chips selection state
  const [selectedEntityFilter, setSelectedEntityFilter] = useState("ALL");
  const [showEmptyOverlay, setShowEmptyOverlay] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [toastMsg, setToastMsg] = useState("");

  // Selected Node state for DRAWER-003
  const [selectedNode, setSelectedNode] = useState({
    id: "Clause:12.2",
    label: "Mục 12.2: Giới hạn trách nhiệm bồi thường",
    type: "Clause",
    badge: "Clause:CUAD",
    subtitle: "Thuộc hợp đồng dịch vụ CUAD_042 với đối tác Alpha Corp",
    properties: {
      is_unilateral: "true (Bất đối xứng)",
      cap_percentage: "10% (0.10)",
      risk_score: "0.942 (Rất cao)",
      contract_ref: "CUAD_042",
      page_number: "16"
    },
    edges: [
      { name: "CUAD_042 (Contract)", relation: "← [HAS_RISK_LIABILITY]", color: "text-rose-600" },
      { name: "Alpha Corp (Customer)", relation: "→ [POTENTIAL_EXPOSURE]", color: "text-slate-500" }
    ],
    aiInsight: "Cần bổ sung phụ lục điều chỉnh trần trách nhiệm tương ứng 100% cho cả hai bên trước khi gia hạn Hợp đồng kỳ Q4/2026."
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const ENTITY_CHIPS = [
    { key: "Customer", label: "Customer", count: 24, bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-600" },
    { key: "Product", label: "Product", count: 18, bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-600" },
    { key: "Order", label: "Order", count: 36, bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-600" },
    { key: "Employee", label: "Employee", count: 12, bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-600" },
    { key: "Vendor", label: "Vendor", count: 9, bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-600" },
    { key: "Contract", label: "Contract", count: 15, bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", dot: "bg-indigo-600" },
    { key: "Clause", label: "Clause", count: 48, bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300 ring-2 ring-rose-400/50", dot: "bg-rose-600" },
  ];

  const handleNodeClick = (nodeData) => {
    setSelectedNode(nodeData);
    showToast(`Đã chọn thực thể: ${nodeData.label}`);
  };

  const resetCanvas = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
    showToast("Đã căn giữa sơ đồ đồ thị.");
  };

  return (
    <div className="space-y-4 font-sans text-slate-900">

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {toastMsg}
        </div>
      )}

      {/* SCREEN TITLE & BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              SCREEN-019 — Knowledge Graph Viewer (Đồ Thị Tri Thức Đa Chiều)
            </h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
              Full-Screen Interactive Canvas + 7 Entity Taxonomies
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trực quan hóa mạng lưới thực thể và quan hệ liên kết (Neo4j). Có thanh lọc thực thể trên cùng và Drawer chi tiết node bên phải.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmptyOverlay(!showEmptyOverlay)}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            {showEmptyOverlay ? "Tắt Empty State" : "Xem Empty State (Ngoài quyền)"}
          </button>
        </div>
      </div>

      {/* KNOWLEDGE GRAPH WORKSPACE CONTAINER */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[760px] relative">

        {/* TOP TOOLBAR: FILTER CHIPS (7 ENTITY TYPES) */}
        <div className="p-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Lọc thực thể:
            </span>

            {/* 7 Entity Filter Chips */}
            {ENTITY_CHIPS.map((chip) => {
              const isActive = selectedEntityFilter === chip.key || selectedEntityFilter === "ALL";
              return (
                <button
                  key={chip.key}
                  onClick={() => {
                    if (selectedEntityFilter === chip.key) {
                      setSelectedEntityFilter("ALL");
                    } else {
                      setSelectedEntityFilter(chip.key);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    chip.bg
                  } ${chip.text} ${chip.border} ${
                    !isActive ? "opacity-40 grayscale" : "opacity-100 hover:scale-105"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${chip.dot}`}></span>
                  {chip.label} ({chip.count})
                </button>
              );
            })}
          </div>

          {/* Canvas Controls (Zoom, Reset, Layout) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 180))}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="Phóng to"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <span className="text-[11px] px-1.5 font-mono text-slate-600 font-medium">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="Thu nhỏ"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              </button>
            </div>
            <button
              onClick={resetCanvas}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Căn giữa đồ thị
            </button>
          </div>
        </div>

        {/* GRAPH CANVAS + DETAIL PANEL WORKSPACE */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* MAIN SVG GRAPH CANVAS */}
          <div id="graph-main-canvas" className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">

            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>

            {/* SVG Graph Visualization */}
            <svg
              className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
              viewBox="0 0 1000 650"
              style={{
                transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-out"
              }}
            >
              <defs>
                {/* Marker Arrows for each link */}
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
                <marker id="arrow-emerald" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker id="arrow-rose" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
                <marker id="arrow-indigo" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                </marker>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* RELATIONSHIP EDGES (EDGES WITH LABELS & ARROWS) */}
              {/* Customer -> Order */}
              <line x1="280" y1="220" x2="480" y2="160" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-blue)" />
              <text x="370" y="180" fill="#93c5fd" fontSize="11" fontFamily="monospace">PLACED_ORDER</text>

              {/* Order -> Product */}
              <line x1="480" y1="160" x2="720" y2="180" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
              <text x="590" y="160" fill="#6ee7b7" fontSize="11" fontFamily="monospace">CONTAINS_ITEM</text>

              {/* Customer -> Contract */}
              <line x1="280" y1="220" x2="380" y2="400" stroke="#6366f1" strokeWidth="2.5" markerEnd="url(#arrow-indigo)" />
              <text x="310" y="320" fill="#c7d2fe" fontSize="11" fontFamily="monospace">BOUND_BY</text>

              {/* Employee -> Contract */}
              <line x1="160" y1="440" x2="380" y2="400" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrow-indigo)" />
              <text x="240" y="435" fill="#e9d5ff" fontSize="11" fontFamily="monospace">MANAGED_BY</text>

              {/* Contract -> Clause (HAS_RISK_LIABILITY) - HIGHLIGHTED ACTIVE */}
              <line x1="380" y1="400" x2="680" y2="440" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-rose)" className="animate-pulse" />
              <text x="510" y="415" fill="#fda4af" fontSize="11" fontWeight="bold" fontFamily="monospace">HAS_RISK_LIABILITY</text>

              {/* Vendor -> Product */}
              <line x1="840" y1="340" x2="720" y2="180" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
              <text x="790" y="270" fill="#fdba74" fontSize="11" fontFamily="monospace">SUPPLIES</text>

              {/* Clause -> Customer (IMPACTS) */}
              <line x1="680" y1="440" x2="280" y2="220" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow-blue)" />
              <text x="470" y="315" fill="#fca5a5" fontSize="10" fontFamily="monospace">POTENTIAL_EXPOSURE</text>

              {/* NODES (CIRCULAR + COLOR ACCORDING TO 7 TYPES) */}

              {/* 1. Customer Node (Blue) */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Customer:Alpha",
                    label: "Alpha Corp (Customer VIP)",
                    type: "Customer",
                    badge: "Customer:CRM",
                    subtitle: "Đối tác doanh nghiệp chính trong hệ thống CRM AdventureWorks",
                    properties: {
                      industry: "Phát triển Phần mềm & Cloud",
                      credit_rating: "AAA Enterprise",
                      annual_revenue: "42,000,000,000 VND",
                      contract_status: "Active (Chờ rà soát Q4)",
                      account_manager: "Nguyễn Văn An"
                    },
                    edges: [
                      { name: "ORD-9921 (Order)", relation: "→ [PLACED_ORDER]", color: "text-blue-600" },
                      { name: "CUAD_042 (Contract)", relation: "→ [BOUND_BY]", color: "text-indigo-600" }
                    ],
                    aiInsight: "Doanh số tài khoản ổn định nhưng có rủi ro pháp lý liên quan đến điều khoản giới hạn bồi thường đơn phương."
                  })
                }
              >
                <circle cx="280" cy="220" r="32" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="3" />
                <text x="280" y="215" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">Alpha Corp</text>
                <text x="280" y="230" fill="#93c5fd" fontSize="9" textAnchor="middle">Customer</text>
              </g>

              {/* 2. Order Node (Amber) */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Order:ORD-9921",
                    label: "Đơn hàng ORD-9921",
                    type: "Order",
                    badge: "Order:ERP",
                    subtitle: "Đơn hàng triển khai gói bản quyền ERP Cloud Suite Q3/2026",
                    properties: {
                      order_value: "1,200,000,000 VND",
                      payment_terms: "Net 30 Days",
                      fulfillment_status: "In Progress (80%)",
                      created_date: "12/09/2026",
                      sales_rep: "Lê Hoàng Nam"
                    },
                    edges: [
                      { name: "Alpha Corp (Customer)", relation: "← [PLACED_ORDER]", color: "text-blue-600" },
                      { name: "ERP Suite (Product)", relation: "→ [CONTAINS_ITEM]", color: "text-emerald-600" }
                    ],
                    aiInsight: "Tiến độ nghiệm thu đạt 80%, cần lưu ý cột mốc thanh toán đợt 2 đúng hạn trước ngày 30/10."
                  })
                }
              >
                <circle cx="480" cy="160" r="28" fill="#78350f" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="480" y="156" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">ORD-9921</text>
                <text x="480" y="170" fill="#fde68a" fontSize="9" textAnchor="middle">Order</text>
              </g>

              {/* 3. Product Node (Emerald) */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Product:ERP_Suite",
                    label: "Sản phẩm ERP Cloud Suite",
                    type: "Product",
                    badge: "Product:SaaS",
                    subtitle: "Giải pháp quản trị nguồn lực doanh nghiệp tích hợp AI",
                    properties: {
                      license_type: "Enterprise Unlimited",
                      sla_commitment: "99.9% Uptime",
                      hosting_provider: "Global Cloud Hosting",
                      monthly_fee: "85,000,000 VND",
                      version: "v4.2.1-LTS"
                    },
                    edges: [
                      { name: "ORD-9921 (Order)", relation: "← [CONTAINS_ITEM]", color: "text-amber-600" },
                      { name: "Global Cloud (Vendor)", relation: "← [SUPPLIES]", color: "text-orange-600" }
                    ],
                    aiInsight: "Hạ tầng Cloud được vận hành bởi Vendor Global Cloud, đáp ứng các chứng chỉ ISO/IEC 27001."
                  })
                }
              >
                <circle cx="720" cy="180" r="30" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
                <text x="720" y="176" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">ERP Suite</text>
                <text x="720" y="190" fill="#a7f3d0" fontSize="9" textAnchor="middle">Product</text>
              </g>

              {/* 4. Employee Node (Purple) */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Employee:NguyenVanAn",
                    label: "Nguyễn Văn An (Legal Lead)",
                    type: "Employee",
                    badge: "Employee:HR",
                    subtitle: "Trưởng nhóm Pháp chế & Tuân thủ hợp đồng Enterprise",
                    properties: {
                      department: "Phòng Pháp chế (Legal Dept)",
                      role_title: "Legal Lead Officer",
                      email: "an.nguyen@graphmind.vn",
                      managed_contracts: "14 Hợp đồng Active",
                      access_level: "Level 3 (Unrestricted)"
                    },
                    edges: [
                      { name: "CUAD_042 (Contract)", relation: "→ [MANAGED_BY]", color: "text-indigo-600" }
                    ],
                    aiInsight: "Phụ trách rà soát chính các hợp đồng khung CUAD thuộc khối khách hàng doanh nghiệp lớn."
                  })
                }
              >
                <circle cx="160" cy="440" r="26" fill="#581c87" stroke="#a855f7" strokeWidth="2.5" />
                <text x="160" y="436" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Văn An</text>
                <text x="160" y="449" fill="#e9d5ff" fontSize="8.5" textAnchor="middle">Legal Lead</text>
              </g>

              {/* 5. Contract Node (Indigo) - ACTIVE NODE */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Contract:CUAD_042",
                    label: "Hợp đồng khung CUAD_042",
                    type: "Contract",
                    badge: "Contract:CUAD",
                    subtitle: "Hợp đồng cung cấp dịch vụ phần mềm ký với Alpha Corp",
                    properties: {
                      contract_code: "CUAD_042_2026",
                      effective_date: "01/01/2026",
                      expiration_date: "31/12/2026 (Còn 91 ngày)",
                      total_value: "1,200,000,000 VND",
                      governing_law: "Luật Thương mại Việt Nam"
                    },
                    edges: [
                      { name: "Alpha Corp (Customer)", relation: "← [BOUND_BY]", color: "text-blue-600" },
                      { name: "Nguyễn Văn An (Employee)", relation: "← [MANAGED_BY]", color: "text-purple-600" },
                      { name: "Mục 12.2 (Clause)", relation: "→ [HAS_RISK_LIABILITY]", color: "text-rose-600" }
                    ],
                    aiInsight: "Hợp đồng có 1 điều khoản rủi ro pháp lý cần đàm phán lại trước thời điểm tái gia hạn."
                  })
                }
              >
                <circle cx="380" cy="400" r="36" fill="#312e81" stroke="#818cf8" strokeWidth="3.5" />
                <text x="380" y="395" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">CUAD_042</text>
                <text x="380" y="410" fill="#c7d2fe" fontSize="9" textAnchor="middle">Contract</text>
              </g>

              {/* 6. Clause Node (Rose) - SELECTED NODE FOCUS */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Clause:12.2",
                    label: "Mục 12.2: Giới hạn trách nhiệm bồi thường",
                    type: "Clause",
                    badge: "Clause:CUAD",
                    subtitle: "Thuộc hợp đồng dịch vụ CUAD_042 với đối tác Alpha Corp",
                    properties: {
                      is_unilateral: "true (Bất đối xứng)",
                      cap_percentage: "10% (0.10)",
                      risk_score: "0.942 (Rất cao)",
                      contract_ref: "CUAD_042",
                      page_number: "16"
                    },
                    edges: [
                      { name: "CUAD_042 (Contract)", relation: "← [HAS_RISK_LIABILITY]", color: "text-rose-600" },
                      { name: "Alpha Corp (Customer)", relation: "→ [POTENTIAL_EXPOSURE]", color: "text-slate-500" }
                    ],
                    aiInsight: "Cần bổ sung phụ lục điều chỉnh trần trách nhiệm tương ứng 100% cho cả hai bên trước khi gia hạn Hợp đồng kỳ Q4/2026."
                  })
                }
              >
                <circle cx="680" cy="440" r="34" fill="#881337" stroke="#f43f5e" strokeWidth="3.5" className="animate-pulse" />
                <text x="680" y="435" fill="#ffffff" fontSize="10.5" fontWeight="bold" textAnchor="middle">Mục 12.2</text>
                <text x="680" y="450" fill="#fecdd3" fontSize="9" textAnchor="middle">Liability Cap</text>
              </g>

              {/* 7. Vendor Node (Orange) */}
              <g
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={() =>
                  handleNodeClick({
                    id: "Vendor:GlobalCloud",
                    label: "Global Cloud Hosting Inc.",
                    type: "Vendor",
                    badge: "Vendor:Cloud",
                    subtitle: "Nhà cung cấp hạ tầng trung tâm dữ liệu Cloud Datacenter",
                    properties: {
                      country: "Singapore / Regional Hub",
                      service_level: "Tier-4 Datacenter",
                      security_cert: "ISO 27001, SOC 2 Type II",
                      contract_period: "2024 - 2028",
                      support_sla: "24/7 Premium Response"
                    },
                    edges: [
                      { name: "ERP Suite (Product)", relation: "→ [SUPPLIES]", color: "text-emerald-600" }
                    ],
                    aiInsight: "Nhà cung cấp đám mây tin cậy với chỉ số sẵn sàng hạ tầng cam kết 99.99%."
                  })
                }
              >
                <circle cx="840" cy="340" r="28" fill="#7c2d12" stroke="#f97316" strokeWidth="2.5" />
                <text x="840" y="336" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Global Cloud</text>
                <text x="840" y="350" fill="#fed7aa" fontSize="9" textAnchor="middle">Vendor</text>
              </g>
            </svg>

            {/* GRAPH LEGEND (BOTTOM-LEFT CORNER) */}
            <div className="absolute left-4 bottom-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 shadow-lg z-10">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center justify-between gap-4">
                <span>Chú giải thực thể (7 loại)</span>
                <span className="text-[10px] text-slate-500 font-mono">Neo4j Schema</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Customer (CRM)</div>
                <div className="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Product (ERP)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Order (Đơn hàng)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Employee (Nhân viên)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Vendor (Nhà CC)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Contract (Hợp đồng)</div>
                <div className="flex items-center gap-1.5 col-span-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Clause (Điều khoản pháp lý CUAD)</div>
              </div>
            </div>

            {/* EMPTY STATE OVERLAY (RBAC OUT OF SCOPE) */}
            {showEmptyOverlay && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-200">Không có thực thể trong phạm vi quyền của bạn</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Theo cơ chế bảo mật RBAC & Department Scope, tài khoản hiện tại không có quyền truy xuất sơ đồ quan hệ của phòng ban này.
                </p>
                <button
                  onClick={() => setShowEmptyOverlay(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Đóng thông báo xem lại đồ thị
                </button>
              </div>
            )}

          </div>

          {/* RIGHT DRAWER: DRAWER-003 KNOWLEDGE GRAPH NODE DETAIL (360px) */}
          <aside className="w-[360px] border-l border-slate-200 bg-white flex flex-col flex-shrink-0 transition-all duration-300 z-20 shadow-xl">
            {/* Panel Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  DRAWER-003: Chi Tiết Thực Thể
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                {selectedNode.badge}
              </span>
            </div>

            {/* Node Properties List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">

              {/* Title & Category */}
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Tên thuộc tính định danh:</span>
                <h3 className="text-sm font-bold text-slate-900">{selectedNode.label}</h3>
                <p className="text-[11px] text-slate-500">{selectedNode.subtitle}</p>
              </div>

              {/* Property Grid */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Thuộc tính Node (Neo4j KV)
                </div>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono">
                  {Object.entries(selectedNode.properties).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center gap-2">
                      <span className="text-slate-500">{k}:</span>
                      <strong className="text-slate-900 truncate">{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mối quan hệ liên kết (Edges)
                </div>
                <div className="space-y-2">
                  {selectedNode.edges.map((edge, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-800">{edge.name}</div>
                        <div className={`text-[10px] font-mono ${edge.color}`}>{edge.relation}</div>
                      </div>
                      <button
                        onClick={() => showToast(`Đang truy vấn liên kết: ${edge.name}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Xem
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Synthesis Insight */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Gợi ý hành động từ AI Copilot:
                </span>
                <p className="text-slate-700 leading-relaxed text-[11px]">{selectedNode.aiInsight}</p>
              </div>

            </div>

            {/* Panel Action Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate("copilot")}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1 transition-colors"
              >
                Hỏi AI về Node này
              </button>
              <button
                onClick={() => showToast("Đã mở rộng thêm 2 tầng quan hệ lân cận (2-hop exploration)")}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Mở rộng 2-hop"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </aside>

        </div>

      </div>
    </div>
  );
}
