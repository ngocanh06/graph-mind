import React, { useState, useEffect } from "react";
import Icon from '../../components/ui/Icon';
import GraphPanel from "../m5_multifacet_search/GraphPanel";
import { saveEntityPropertiesApi, verifyEntityApi } from "../../services/api";

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

  // Derive role and permissions per RBAC Matrix
  // - Executive & Admin: Full access (Customer, Product, Order, Employee, Vendor, Contract, Clause)
  // - Knowledge Manager: Excludes Employee (HR payroll / internal personnel)
  // - Standard (Sales): Excludes Employee & Vendor (Suppliers)
  const rawRole = (role || currentUser?.id || currentUser?.roleKey || currentUser?.username || "standard").toString().toLowerCase();
  const isPrivileged = ["executive", "admin", "it_admin", "secops", "cfo", "ceo", "it"].some(r => rawRole.includes(r));
  const isManager = !isPrivileged && ["manager", "knowledge_manager", "lead", "tp", "truongphong", "mgr"].some(r => rawRole.includes(r));
  const isStandard = !isPrivileged && !isManager;
  const effectiveRole = isPrivileged ? "executive" : (isManager ? "knowledge_manager" : "standard");

  const allowedTaxonomies = isPrivileged
    ? ["Customer", "Product", "Order", "Employee", "Vendor", "Contract", "Clause"]
    : isManager
    ? ["Customer", "Product", "Order", "Vendor", "Contract", "Clause"]
    : ["Customer", "Product", "Order", "Contract", "Clause"];

  // Sub-tab navigation: "neo4j_live" | "canvas" | "queue"
  const [activeTab, setActiveTab] = useState("neo4j_live");

  // Auto-switch to live Neo4j tab if selectedEntity is passed (e.g. from Copilot deep-link)
  useEffect(() => {
    if (selectedEntity) {
      setActiveTab("neo4j_live");
    }
  }, [selectedEntity]);

  // Filter chips selection
  const [selectedEntityFilter, setSelectedEntityFilter] = useState("ALL");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [toastMsg, setToastMsg] = useState("");

  // Reset selectedEntityFilter if restricted under new role
  useEffect(() => {
    if (selectedEntityFilter !== "ALL" && !allowedTaxonomies.includes(selectedEntityFilter)) {
      setSelectedEntityFilter("ALL");
    }
  }, [effectiveRole, allowedTaxonomies, selectedEntityFilter]);

  // Quick Entity creation modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("Customer");

  // Selected Node state for Inspector (Live CUAD Clause from Neo4j & Qdrant)
  const [selectedNode, setSelectedNode] = useState({
    id: "CUAD_001_Termination",
    name: "Termination Clause (#75)",
    label: "Điều khoản Chấm dứt hợp đồng (Termination)",
    type: "Clause",
    badge: "Clause Node",
    docSource: "WPPPLC_04_30_2020-EX-4.28-SERVICE AGREEMENT.pdf",
    chunkId: "Qdrant_Chunk_#75",
    penaltyLimit: "Stock Plan Vesting & Bonus",
    isRisk: false,
    notes: "Điều khoản chấm dứt hợp đồng trích xuất từ CUAD_001 liên kết đối tác WPPPLC trong đồ thị Neo4j.",
    properties: {
      contract_ref: "CUAD_001 (WPPPLC)",
      clause_type: "Termination",
      qdrant_vector_point: "#75",
      neo4j_label: "Clause",
      neo4j_verified: "true"
    }
  });

  const handleGraphNodeSelect = (nodeKey, node) => {
    if (onSelectEntity) onSelectEntity(nodeKey);
    if (!node) return;
    const properties = node.properties || node;
    const type = (node._labels || [node.type || "Node"])[0];
    setSelectedNode((prev) => ({
      ...prev,
      id: String(node._id || node.id || nodeKey),
      name: node.name || properties.Name || properties.name || nodeKey,
      type,
      badge: `${type} Node`,
      docSource: properties.source_document || properties.source_file || properties.document_id || "",
      chunkId: properties.qdrant_vector_point || properties.chunk_id || "",
      penaltyLimit: properties.penalty_limit || "",
      isRisk: properties.is_risk === true || properties.is_risk === "true",
      notes: properties.notes || "",
      properties
    }));
  };

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
      sourceColor: "bg-slate-700",
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
    { key: "Customer", label: "Customer", count: 19820, bg: "bg-amber-50 text-amber-900 border-amber-300", dot: "bg-amber-500" },
    { key: "Product", label: "Product", count: 504, bg: "bg-emerald-50 text-emerald-900 border-emerald-300", dot: "bg-emerald-600" },
    { key: "Order", label: "SalesOrder", count: 31465, bg: "bg-orange-50 text-orange-900 border-orange-300", dot: "bg-orange-600" },
    { key: "Employee", label: "Employee", count: 290, bg: "bg-slate-100 text-slate-800 border-slate-300", dot: "bg-slate-600" },
    { key: "Vendor", label: "Company", count: 30, bg: "bg-blue-50 text-blue-900 border-blue-300", dot: "bg-blue-600" },
    { key: "Contract", label: "Contract", count: 30, bg: "bg-red-50 text-red-900 border-red-300", dot: "bg-red-600" },
    { key: "Clause", label: "Clause", count: 103, bg: "bg-teal-50 text-teal-900 border-teal-300 font-bold", dot: "bg-teal-600" },
  ];

  // Filter chips visible according to user RBAC scope
  const visibleChips = ENTITY_CHIPS.filter(chip => allowedTaxonomies.includes(chip.key));

  // Filter queue items according to user RBAC scope
  const visibleQueueItems = queueItems.filter(item => {
    if (!allowedTaxonomies.includes("Employee")) {
      if (item.sourceType === "Employee" || item.targetType === "Employee") return false;
    }
    if (!allowedTaxonomies.includes("Vendor")) {
      if (["Organization", "Vendor", "Company"].includes(item.sourceType) || ["Organization", "Vendor", "Company"].includes(item.targetType)) {
        return false;
      }
    }
    return true;
  });

  const handleVerifyNode = async () => {
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có thẩm quyền duyệt thực thể vào Neo4j!" : "Read-only: Only Admin and Manager can verify nodes to Neo4j!");
      return;
    }
    const auditorName = currentUser?.name || currentUser?.full_name || currentUser?.email || "Dieu Hoang (CFO)";
    try {
      await verifyEntityApi(selectedNode.id, true, auditorName, currentUser);
      setSelectedNode((prev) => ({
        ...prev,
        properties: { ...prev.properties, neo4j_verified: "true", status: "Human Verified" }
      }));
      showToast(isVi ? `Đã duyệt thực thể [${selectedNode.id}] và lưu thật vào Neo4j Database!` : `Verified [${selectedNode.id}] and committed to Neo4j!`);
    } catch (err) {
      showToast(isVi ? `Lỗi duyệt: ${err.message}` : `Verify error: ${err.message}`);
    }
  };

  const handleSaveAttributeChanges = async () => {
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền chỉnh sửa thuộc tính." : "Read-only: Only Admin and Manager can save attributes.");
      return;
    }
    try {
      const result = await saveEntityPropertiesApi(selectedNode.id, {
        name: selectedNode.name,
        penalty_limit: selectedNode.penaltyLimit,
        is_risk: selectedNode.isRisk,
        notes: selectedNode.notes
      }, currentUser);
      const saved = result.data?.properties || {};
      setSelectedNode((prev) => ({
        ...prev,
        name: saved.name || saved.Name || prev.name,
        penaltyLimit: saved.penalty_limit ?? prev.penaltyLimit,
        isRisk: saved.is_risk === true || saved.is_risk === "true",
        notes: saved.notes ?? prev.notes,
        properties: saved
      }));
      showToast(isVi ? `Đã lưu thuộc tính ${selectedNode.id} vào Neo4j.` : `Saved attributes for ${selectedNode.id} to Neo4j.`);
    } catch (err) {
      showToast(isVi ? `Không thể lưu: ${err.message}` : `Save failed: ${err.message}`);
    }
  };

  const handleDeleteEntity = () => {
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền xóa thực thể." : "Read-only: Only Admin and Manager can delete entities.");
      return;
    }
    showToast(isVi ? "Xóa thực thể chưa được hỗ trợ; không có dữ liệu nào thay đổi." : "Entity deletion is not implemented; no data was changed.");
  };

  const handleBatchReview = () => {
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chuyên viên kinh doanh không có quyền duyệt/từ chối trích xuất." : "Read-only: Sales specialists cannot approve/reject extractions.");
      return;
    }
    showToast(isVi
      ? "Chưa thể duyệt quan hệ: hàng chờ đang dùng dữ liệu mẫu, chưa có ID quan hệ Neo4j. Không có thay đổi nào được lưu."
      : "Cannot review relationships yet: this queue uses sample data without Neo4j relationship IDs. Nothing was saved.");
  };

  const handleBatchApprove = handleBatchReview;
  const handleBatchReject = handleBatchReview;

  const handleRowAction = () => {
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chuyên viên kinh doanh không có quyền duyệt/từ chối." : "Read-only: Sales specialists cannot approve/reject.");
      return;
    }
    handleBatchReview();
  };

  const toggleSelectQueue = (id) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAllQueue = () => {
    const allVisibleSelected = visibleQueueItems.length > 0 && visibleQueueItems.every((q) => q.selected);
    const visibleIds = new Set(visibleQueueItems.map(q => q.id));
    setQueueItems((prev) => prev.map((item) => (visibleIds.has(item.id) ? { ...item, selected: !allVisibleSelected } : item)));
  };

  const handleCreateNewEntity = (e) => {
    e.preventDefault();
    if (isStandard) {
      showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền tạo thực thể mới." : "Read-only: Only Admin and Manager can create new entities.");
      setIsAddModalOpen(false);
      return;
    }
    if (!newEntityName.trim()) return;
    showToast(isVi ? `Đã khởi tạo thực thể [${newEntityType}: ${newEntityName}] trong Neo4j!` : `Created entity [${newEntityType}: ${newEntityName}] in Neo4j!`);
    setIsAddModalOpen(false);
    setNewEntityName("");
  };

  return (
    <div
      className="space-y-6 font-sans text-on-surface min-h-screen"
      style={{ background: "var(--base)", minHeight: "100%", padding: "24px 32px 64px", boxSizing: "border-box" }}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-surface-container-high border border-primary/40 text-on-surface text-xs font-medium rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Icon name="fa-solid fa-circle-check text-primary text-[16px]" size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. UNIFIED KNOWLEDGE HEADER & GLOBAL CONTROLS */}
      {/* ========================================================================= */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg, 12px)",
        boxShadow: "var(--shadow-xs)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Tier 1: Title, Subtitle, RBAC Badge & Primary Actions */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 14px 20px",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid var(--border-soft, #f1f5f9)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(8, 145, 178, 0.08)",
              border: "1px solid rgba(8, 145, 178, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--cyan, #0891b2)",
              flexShrink: 0
            }}>
              <i className="fa-solid fa-project-diagram" style={{ fontSize: "16px" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1 style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "var(--text-1)",
                  margin: 0,
                  letterSpacing: "-0.01em"
                }}>
                  {isVi ? "Đồ thị Tri thức & Hiệu chỉnh Thực thể" : "Knowledge Graph & Entity Editor"}
                </h1>
              </div>
              <p style={{
                fontSize: "12px",
                color: "var(--text-3)",
                margin: "2px 0 0 0",
                lineHeight: "1.3"
              }}>
                {isVi
                  ? "Trực quan hóa mạng lưới liên kết thực thể Neo4j, kiểm duyệt ontology và bóc tách quan hệ đồ thị."
                  : "Visualize enterprise entity triples, curate ontology, and inspect relationship pathways."}
              </p>
            </div>
          </div>

          {/* Right side: RBAC Badge + Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* RBAC Scope Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "rgba(8, 145, 178, 0.08)",
              border: "1px solid rgba(8, 145, 178, 0.2)",
              fontSize: "11px",
              fontWeight: "750",
              color: "#0891b2"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0891b2" }}></span>
              <span>RBAC: {currentUser?.badge || (isPrivileged ? "ADMIN / EXECUTIVE" : isManager ? "TRƯỞNG PHÒNG" : "CHUYÊN VIÊN")}</span>
              <span style={{ opacity: 0.7, fontFamily: "var(--f-mono)" }}>({visibleChips.length}/7 loại)</span>
            </div>

            <button
              onClick={() => {
                if (isStandard) {
                  showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền thêm thực thể mới." : "Read-only: Only Admin and Manager can create new entities.");
                  return;
                }
                setIsAddModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 13px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                background: "var(--cyan, #0891b2)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(8, 145, 178, 0.25)"
              }}
            >
              <Icon name="fa-solid fa-plus text-[12px]" size={12} />
              <span>{isVi ? "Thực thể mới" : "New Entity"}</span>
            </button>

            <button
              onClick={() => {
                if (isStandard) {
                  showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền thêm quan hệ mới." : "Read-only: Only Admin and Manager can add relations.");
                  return;
                }
                showToast(isVi ? "Kéo thả giữa 2 node trên canvas để tạo quan hệ mới" : "Drag between 2 nodes on canvas to create relation");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: "var(--surface-2)",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
                cursor: "pointer"
              }}
            >
              <Icon name="fa-solid fa-link text-[12px]" size={12} />
              <span>{isVi ? "Thêm quan hệ" : "Add Relation"}</span>
            </button>

            <button
              onClick={() => {
                if (isStandard) {
                  showToast(isVi ? "Chế độ xem (Read-only): Chỉ Quản trị viên & Trưởng phòng mới có quyền ghi dữ liệu vào Neo4j + Qdrant." : "Read-only: Only Admin and Manager can commit to Neo4j + Qdrant.");
                  return;
                }
                showToast(isVi ? "Đã lưu và đồng bộ các thuộc tính thực thể vào cơ sở dữ liệu." : "Saved entity attributes and synchronized with database.");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                background: "var(--text-1)",
                color: "var(--surface)",
                border: "none",
                cursor: "pointer"
              }}
            >
              <Icon name="fa-solid fa-cloud-arrow-up text-[12px]" size={12} />
              <span>{isVi ? "Lưu thay đổi" : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Integrated Navigation Tabs & Taxonomy Filters */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "6px 16px",
          background: "var(--surface-2, #f8fafc)",
          overflowX: "auto",
          scrollbarWidth: "none",
          flexWrap: "nowrap"
        }}>
          {/* Main View Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {[
              { id: "neo4j_live", label: isVi ? "Đồ thị Trực quan (55.342 Nút)" : "Live Graph (55,342 Nodes)", icon: "fa-circle-nodes", dot: "#0891b2" },
              { id: "queue", label: isVi ? "Hàng chờ Phê duyệt Thực thể" : "Review Queue", icon: "fa-list-check", badge: visibleQueueItems.length }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: isActive ? "750" : "600",
                    cursor: "pointer",
                    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    background: isActive ? "var(--surface, #ffffff)" : "transparent",
                    color: isActive ? "var(--cyan, #0891b2)" : "var(--text-2, #64748b)",
                    boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.06)" : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--surface-3, #f1f5f9)";
                      e.currentTarget.style.color = "var(--text-1, #0f172a)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-2, #64748b)";
                    }
                  }}
                >
                  {tab.dot && (
                    <span style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: tab.dot,
                      display: "inline-block"
                    }} />
                  )}
                  <Icon name={`fa-solid ${tab.icon}`} size={12} style={{ color: isActive ? "var(--cyan, #0891b2)" : "var(--text-3, #94a3b8)" }} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      background: isActive ? "var(--cyan, #0891b2)" : "#d97706",
                      color: "#ffffff"
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Taxonomies Chips (show when in canvas mode) */}
          {activeTab === "canvas" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: "600" }}>{isVi ? "Lọc:" : "Filter:"}</span>
              {visibleChips.map((chip) => {
                const isActive = selectedEntityFilter === chip.key || selectedEntityFilter === "ALL";
                return (
                  <span
                    key={chip.key}
                    onClick={() => setSelectedEntityFilter(selectedEntityFilter === chip.key ? "ALL" : chip.key)}
                    className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 cursor-pointer text-[11px] transition-all ${
                      chip.bg
                    } ${!isActive ? "opacity-35 grayscale" : "opacity-100 hover:scale-105"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${chip.dot}`}></span>
                    <span>{chip.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: LIVE REAL NEO4J GRAPH PANEL */}
      {/* ========================================================================= */}
      {activeTab === "neo4j_live" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg, 12px)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
          <GraphPanel lang={lang} onSelectNode={handleGraphNodeSelect} initialSearch={selectedEntity} role={effectiveRole} currentUser={currentUser} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE GRAPH CANVAS (SCREEN-016) */}
      {/* ========================================================================= */}
      {activeTab === "canvas" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: GRAPH CANVAS SIMULATION (8 Cols) */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-xs relative min-h-[600px] overflow-hidden flex flex-col justify-between">
            {/* Floating Top-Left Subgraph Context */}
            <div className="absolute top-4 left-4 z-10 bg-surface-container-lowest/90 backdrop-blur px-3 py-1.5 rounded-xl border border-outline-variant/40 shadow-xs flex items-center gap-2 text-xs text-on-surface">
              <Icon name="fa-solid fa-circle-nodes text-primary text-[15px]" size={15} />
              <span>{isVi ? "Đồ thị con: " : "Subgraph: "}<strong>Hợp đồng Alpha Corp CUAD_042</strong></span>
            </div>

            {/* Floating Top-Right Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 bg-surface-container-lowest/90 backdrop-blur p-1 rounded-xl border border-outline-variant/40 shadow-xs flex items-center gap-1 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Thu nhỏ"
              >
                <Icon name="fa-solid fa-minus text-[13px]" size={15} />
              </button>
              <span className="px-2 font-bold font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 180))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Phóng to"
              >
                <Icon name="fa-solid fa-plus text-[13px]" size={15} />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Căn giữa"
              >
                <Icon name="fa-solid fa-compress text-[13px]" size={15} />
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
                  <marker id="arrow-cyan" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#0891b2" />
                  </marker>
                  <marker id="arrow-slate" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#475569" />
                  </marker>
                  <marker id="arrow-red" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#BA1A1A" />
                  </marker>
                  <marker id="arrow-orange" markerWidth="7" markerHeight="7" refX="24" refY="3.5" orient="auto">
                    <polygon points="0 0, 7 3.5, 0 7" fill="#EA580C" />
                  </marker>
                </defs>

                <rect width="100%" height="100%" fill="url(#canvas-grid)" />

                {/* Edges / Links with Directional Markers */}
                <path
                  d="M 180 180 L 350 140"
                  stroke="#0891b2"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  markerEnd="url(#arrow-cyan)"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedEdge({
                      id: "edge-1",
                      label: "PARTNER_OF",
                      from: "Alpha Corp",
                      to: "CUAD_042",
                      color: "#0891b2"
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
                  stroke="#0891b2"
                  strokeWidth="2"
                  markerEnd="url(#arrow-cyan)"
                />

                {/* Edge Labels */}
                <rect x="230" y="145" width="85" height="20" rx="4" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="0.5" />
                <text x="272" y="159" textAnchor="middle" fill="#0891b2" fontSize="10" fontWeight="600" fontFamily="Inter">
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

                {/* Node 1: Top Customer (Roger Harui - $989K USD) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(180, 180)"
                  onClick={() => {
                    setSelectedNode({
                      id: "CUST-29818",
                      name: "Roger Harui",
                      label: "Roger Harui (Top 1 VIP Customer)",
                      type: "Customer",
                      badge: "Customer Node",
                      docSource: "AdventureWorks Sales.Customer",
                      chunkId: "Neo4j Node #29818",
                      penaltyLimit: "N/A",
                      isRisk: false,
                      notes: "Khách hàng VIP doanh thu cao nhất trên cơ sở dữ liệu AdventureWorks Neo4j ($989K USD).",
                      properties: {
                        customer_id: "29818",
                        total_orders: "12 đơn hàng",
                        total_revenue: "$989,184.08 USD",
                        contract_status: "Active VIP"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Roger Harui ($989K USD)" : "Selected Node: Roger Harui ($989K USD)");
                  }}
                >
                  <circle r="42" fill="#EAEDFF" stroke="#004AC6" strokeWidth="2" />
                  <circle cx="0" cy="0" r="6" fill="#004AC6" />
                  <text y="-8" textAnchor="middle" fill="#004AC6" fontSize="11" fontWeight="bold" fontFamily="Inter">Roger Harui</text>
                  <text y="10" textAnchor="middle" fill="#434655" fontSize="9" fontFamily="Inter">$989K VIP</text>
                </g>

                {/* Node 2: Center Contract (CUAD_001 - WPPPLC) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(350, 140)"
                  onClick={() => {
                    setSelectedNode({
                      id: "CUAD_001",
                      name: "WPPPLC Service Agreement",
                      label: "Hợp đồng dịch vụ CUAD_001 (WPPPLC)",
                      type: "Contract",
                      badge: "Contract Node",
                      docSource: "WPPPLC_04_30_2020-EX-4.28-SERVICE AGREEMENT.pdf",
                      chunkId: "Qdrant_Chunk_#66",
                      penaltyLimit: "$36,000 USD (Clause #75)",
                      isRisk: false,
                      notes: "Hợp đồng dịch vụ WPPPLC ký ngày 04/30/2020, chứa điều khoản Termination và Governing Law.",
                      properties: {
                        id: "CUAD_001",
                        effective_date: "04/30/2020",
                        party: "WPPPLC",
                        governing_law: "English Law (Wales Jurisdiction)",
                        clause_count: "2"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: CUAD_001 (WPPPLC)" : "Selected Node: CUAD_001 (WPPPLC)");
                  }}
                >
                  <circle r="48" fill="#ECFEFF" stroke="#0891b2" strokeWidth="3" />
                  <circle cx="0" cy="0" r="8" fill="#0891b2" />
                  <text y="-8" textAnchor="middle" fill="#0891b2" fontSize="12" fontWeight="bold" fontFamily="Inter">CUAD_001</text>
                  <text y="10" textAnchor="middle" fill="#434655" fontSize="9" fontFamily="Inter">WPPPLC ($36K)</text>
                </g>

                {/* Node 3: Top Product (Road-150 Red) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(520, 220)"
                  onClick={() => {
                    setSelectedNode({
                      id: "PROD-751",
                      name: "Road-150 Red, 48",
                      label: "Sản phẩm Road-150 Red, 48",
                      type: "Product",
                      badge: "Product Node",
                      docSource: "AdventureWorks Production.Product",
                      chunkId: "Neo4j Product #751",
                      penaltyLimit: "Standard 2-Yr Warranty",
                      isRisk: false,
                      notes: "Sản phẩm dòng xe đạp đua cao cấp nhất trong kho hàng AdventureWorks Neo4j.",
                      properties: {
                        product_id: "751",
                        list_price: "$3,578.27 USD",
                        category: "Bikes / Road Bikes",
                        color: "Red"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Road-150 Red ($3,578.27 USD)" : "Selected Node: Road-150 Red ($3,578.27 USD)");
                  }}
                >
                  <circle r="38" fill="#F2F3FF" stroke="#0074A6" strokeWidth="2" />
                  <circle cx="0" cy="0" r="5" fill="#0074A6" />
                  <text y="-6" textAnchor="middle" fill="#0074A6" fontSize="10" fontWeight="bold" fontFamily="Inter">Road-150</text>
                  <text y="8" textAnchor="middle" fill="#434655" fontSize="8" fontFamily="Inter">$3,578 USD</text>
                </g>

                {/* Node 4: Selected Clause Node (Termination - #75) with Pulse Ring */}
                <g
                  className="cursor-pointer group"
                  transform="translate(350, 320)"
                  onClick={() => {
                    setSelectedNode({
                      id: "CUAD_001_Termination",
                      name: "Termination Clause (#75)",
                      label: "Điều khoản Chấm dứt hợp đồng (Termination)",
                      type: "Clause",
                      badge: "Clause Node",
                      docSource: "WPPPLC_04_30_2020-EX-4.28-SERVICE AGREEMENT.pdf",
                      chunkId: "Qdrant_Chunk_#75",
                      penaltyLimit: "Stock Plan Vesting & Bonus",
                      isRisk: false,
                      notes: "Điều khoản chấm dứt hợp đồng trích xuất từ CUAD_001 liên kết đối tác WPPPLC trong đồ thị Neo4j.",
                      properties: {
                        contract_ref: "CUAD_001 (WPPPLC)",
                        clause_type: "Termination",
                        qdrant_vector_point: "#75",
                        neo4j_label: "Clause",
                        neo4j_verified: "true"
                      }
                    });
                    showToast(isVi ? "Đã chọn Node: Termination (#75)" : "Selected Node: Termination (#75)");
                  }}
                >
                  <circle r="50" fill="#ecfeff" stroke="#0891b2" strokeWidth="3" />
                  <circle r="56" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                  <circle cx="0" cy="0" r="8" fill="#0891b2" />
                  <text y="-8" textAnchor="middle" fill="#0891b2" fontSize="11" fontWeight="bold" fontFamily="Inter">Termination</text>
                  <text y="10" textAnchor="middle" fill="#0e7490" fontSize="9" fontFamily="Inter">Clause #75</text>
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
                  <circle r="36" fill="#F0FDFA" stroke="#0D9488" strokeWidth="2" />
                  <circle cx="0" cy="0" r="5" fill="#0D9488" />
                  <text y="-6" textAnchor="middle" fill="#0D9488" fontSize="10" fontWeight="bold" fontFamily="Inter">SLA 99.9%</text>
                  <text y="8" textAnchor="middle" fill="#434655" fontSize="8" fontFamily="Inter">Requirement</text>
                </g>

                {/* Node 6: Vendor Node (Alpha Corp) - visible only if Vendor taxonomy allowed */}
                {allowedTaxonomies.includes("Vendor") && (
                  <>
                    <path
                      d="M 140 330 L 350 140"
                      stroke="#EA580C"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow-orange)"
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedEdge({
                          id: "edge-vendor",
                          label: "SUPPLIER_TO",
                          from: "Alpha Corp Global",
                          to: "CUAD_001",
                          color: "#EA580C"
                        })
                      }
                    />
                    <rect x="195" y="225" width="85" height="20" rx="4" fill="#FFF7ED" stroke="#FDBA74" strokeWidth="0.5" />
                    <text x="237" y="239" textAnchor="middle" fill="#EA580C" fontSize="10" fontWeight="600" fontFamily="Inter">
                      SUPPLIER_TO
                    </text>
                    <g
                      className="cursor-pointer group"
                      transform="translate(140, 330)"
                      onClick={() => {
                        setSelectedNode({
                          id: "VEND-001",
                          name: "Alpha Corp Global",
                          label: "Alpha Corp Global (Vendor/Partner)",
                          type: "Vendor",
                          badge: "Vendor Node",
                          docSource: "Vendor Registry & ERP",
                          chunkId: "Neo4j Node #VEND-001",
                          penaltyLimit: "N/A",
                          isRisk: false,
                          notes: "Nhà cung cấp linh kiện và hạ tầng ERP đối tác của doanh nghiệp.",
                          properties: {
                            vendor_id: "VEND-001",
                            company_name: "Alpha Corp Global Ltd",
                            contract_ref: "CUAD_001",
                            tax_id: "VN-010293847"
                          }
                        });
                        showToast(isVi ? "Đã chọn Node Nhà cung cấp: Alpha Corp Global" : "Selected Node: Alpha Corp Global");
                      }}
                    >
                      <circle r="40" fill="#FFF7ED" stroke="#EA580C" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="6" fill="#EA580C" />
                      <text y="-8" textAnchor="middle" fill="#EA580C" fontSize="11" fontWeight="bold" fontFamily="Inter">Alpha Corp</text>
                      <text y="10" textAnchor="middle" fill="#9A3412" fontSize="9" fontFamily="Inter">Vendor / NCC</text>
                    </g>
                  </>
                )}

                {/* Node 7: Employee Node (Lê Hoàng Minh) - visible only if Employee taxonomy allowed */}
                {allowedTaxonomies.includes("Employee") && (
                  <>
                    <path
                      d="M 350 45 L 350 140"
                      stroke="#475569"
                      strokeWidth="2"
                      markerEnd="url(#arrow-slate)"
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedEdge({
                          id: "edge-employee",
                          label: "AUTHORIZED_SIGNER",
                          from: "Lê Hoàng Minh",
                          to: "CUAD_001",
                          color: "#475569"
                        })
                      }
                    />
                    <rect x="280" y="65" width="140" height="20" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.5" />
                    <text x="350" y="79" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Inter">
                      AUTHORIZED_SIGNER
                    </text>
                    <g
                      className="cursor-pointer group"
                      transform="translate(350, 45)"
                      onClick={() => {
                        setSelectedNode({
                          id: "EMP-042",
                          name: "Lê Hoàng Minh",
                          label: "Lê Hoàng Minh (Đại diện ký hợp đồng)",
                          type: "Employee",
                          badge: "Employee Node",
                          docSource: "Master_NDA_AlphaCorp_Signed.pdf",
                          chunkId: "Neo4j Node #EMP-042",
                          penaltyLimit: "N/A",
                          isRisk: false,
                          notes: "Nhân sự nội bộ - Người ký được ủy quyền theo Phụ lục Hợp đồng CUAD_001.",
                          properties: {
                            employee_id: "EMP-042",
                            department: "Ban Giám Đốc / Pháp chế",
                            title: "Đại diện ký hợp đồng",
                            security_level: "Internal Confidential"
                          }
                        });
                        showToast(isVi ? "Đã chọn Node Nhân sự: Lê Hoàng Minh" : "Selected Node: Lê Hoàng Minh");
                      }}
                    >
                      <circle r="36" fill="#F8FAFC" stroke="#475569" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="5" fill="#475569" />
                      <text y="-6" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="Inter">Lê H. Minh</text>
                      <text y="8" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="Inter">Employee (HR)</text>
                    </g>
                  </>
                )}
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
                      showToast(isVi ? "Xóa quan hệ chưa được hỗ trợ; không có dữ liệu nào thay đổi." : "Relationship deletion is not implemented; no data was changed.");
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
                {5 + (allowedTaxonomies.includes("Vendor") ? 1 : 0) + (allowedTaxonomies.includes("Employee") ? 1 : 0)} {isVi ? "Nút" : "Nodes"} • {4 + (allowedTaxonomies.includes("Vendor") ? 1 : 0) + (allowedTaxonomies.includes("Employee") ? 1 : 0)} {isVi ? "Liên kết" : "Edges"} • {isPrivileged ? (isVi ? "Toàn quyền (Tất cả nhãn)" : "Full Scope") : isManager ? (isVi ? "Phạm vi: Quản lý (Đã ẩn HR)" : "Scope: Manager (Hidden HR)") : (isVi ? "Phạm vi: Kinh doanh (Đã ẩn HR & NCC)" : "Scope: Sales (Hidden HR & Vendor)")}
              </span>
            </div>
          </div>

          {/* RIGHT: ENTITY PROPERTIES & HUMAN FEEDBACK INSPECTOR (4 Cols) */}
          <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="fa-solid fa-sliders text-error text-[18px]" size={18} />
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
                    {isVi ? "Ghi chú chuyên viên pháp chế" : "Specialist Notes (Human Feedback)"}
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
                onClick={handleVerifyNode}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="fa-solid fa-stamp text-[15px]" size={15} />
                <span>{isVi ? "Duyệt thực thể này (Lưu Neo4j)" : "Verify Node (Save to Neo4j)"}</span>
              </button>

              <button
                onClick={handleSaveAttributeChanges}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="fa-solid fa-circle-check text-[15px]" size={15} />
                <span>{isVi ? "Lưu thay đổi thuộc tính" : "Save Attribute Changes"}</span>
              </button>

              <button
                onClick={handleDeleteEntity}
                className="w-full py-2 rounded-xl bg-surface-container-low text-error hover:bg-error-container hover:text-on-error-container text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Icon name="fa-solid fa-trash-can text-[14px]" size={14} />
                <span>{isVi ? "Xóa Thực thể khỏi Graph" : "Delete Entity from Graph"}</span>
              </button>

              <button
                onClick={() => {
                  if (onNavigate) onNavigate("copilot");
                }}
                className="w-full py-1.5 rounded-xl text-primary hover:bg-primary-fixed/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="fa-solid fa-robot text-[13px]" size={15} />
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
                  {isVi ? "Hàng chờ duyệt trích xuất tự động" : "Automated Extraction Pending Review Queue"}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
                {isVi
                  ? "Các quan hệ thực thể có độ tin cậy mô hình < 85% hoặc phát hiện mâu thuẫn NER cần phê duyệt trước khi ghi vào đồ thị tri thức production."
                  : "Entity relations with model confidence < 85% or detected NER ambiguities requiring human review before committing to production Graph DB."}
              </p>
            </div>

            {isStandard ? (
              <div className="bg-blue-100/70 border border-blue-300 text-blue-900 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Icon name="fa-solid fa-shield-halved text-blue-600" size={15} />
                <span>{isVi ? "Chế độ xem (Read-only): Chỉ Trưởng phòng & Quản trị viên mới có thẩm quyền phê duyệt trích xuất vào Đồ thị Tri thức." : "Read-only: Only Managers and Admins can approve graph extractions."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBatchApprove}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                >
                  <Icon name="fa-solid fa-check-double text-[15px]" size={15} />
                  <span>{isVi ? "Duyệt hàng loạt" : "Batch Approve"}</span>
                </button>
                <button
                  onClick={handleBatchReject}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700 transition-all flex items-center gap-1.5"
                >
                  <Icon name="fa-solid fa-ban text-[15px]" size={15} />
                  <span>{isVi ? "Từ chối hàng loạt" : "Batch Reject"}</span>
                </button>
              </div>
            )}
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
                        disabled={isStandard}
                        checked={visibleQueueItems.length > 0 && visibleQueueItems.every((q) => q.selected)}
                        onChange={toggleSelectAllQueue}
                        className="w-4 h-4 rounded text-primary border-outline-variant disabled:opacity-50"
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
                  {visibleQueueItems.map((item) => (
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
                          disabled={isStandard}
                          checked={item.selected}
                          onChange={() => toggleSelectQueue(item.id)}
                          className="w-4 h-4 rounded text-primary border-outline-variant disabled:opacity-50"
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
                              <Icon name="fa-solid fa-check" size={15} /> {isVi ? "Đã duyệt" : "Approved"}
                            </span>
                          ) : item.status === "rejected" ? (
                            <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                              <Icon name="fa-solid fa-xmark" size={15} /> {isVi ? "Đã từ chối" : "Rejected"}
                            </span>
                          ) : isStandard ? (
                            <span className="text-on-surface-variant text-[11px] font-medium flex items-center gap-1 justify-end">
                              <Icon name="fa-solid fa-lock text-on-surface-variant" size={12} />
                              <span>{isVi ? "Chờ duyệt (Chỉ xem)" : "Read-only"}</span>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRowAction(item.id, "approved")}
                                className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                                title={isVi ? "Chấp thuận" : "Approve"}
                              >
                                <Icon name="fa-solid fa-check text-[15px]" size={15} />
                              </button>
                              <button
                                onClick={handleRowAction}
                                className="p-1.5 rounded-lg hover:bg-surface-container text-primary transition-colors"
                                title={isVi ? "Chỉnh sửa" : "Edit"}
                              >
                                <Icon name="fa-solid fa-pen-to-square text-[15px]" size={15} />
                              </button>
                              <button
                                onClick={() => handleRowAction(item.id, "rejected")}
                                className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-700 transition-colors"
                                title={isVi ? "Từ chối" : "Reject"}
                              >
                                <Icon name="fa-solid fa-xmark text-[15px]" size={15} />
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
                <strong className="text-on-surface">{visibleQueueItems.filter((q) => q.selected).length}</strong> / {visibleQueueItems.length} {isVi ? "mục hiển thị theo phân quyền" : "items in visible scope"}
              </span>
              <span className="text-primary font-semibold">
                {isStandard
                  ? (isVi ? "🔒 Chế độ Chuyên viên kinh doanh: Chỉ đọc dữ liệu trích xuất hợp đồng & sản phẩm" : "🔒 Sales Specialist Scope: Read-only contract & product extractions")
                  : (isVi ? "Hàng chờ dữ liệu mẫu: thao tác duyệt/từ chối quan hệ hiện chưa được lưu" : "Sample queue: relationship approve/reject is not persisted yet")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ENTITY CREATION MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-2xl w-full max-w-md p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="text-base font-bold text-on-surface">
                {isVi ? "Thêm Thực thể Mới vào Đồ thị" : "Add New Entity to Graph"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface"
              >
                <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewEntity} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-on-surface mb-1">
                  {isVi ? "Tên Thực thể" : "Entity Name"}
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
                  {isVi ? "Loại Thực thể" : "Taxonomy Type"}
                </label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {allowedTaxonomies.includes("Customer") && <option value="Customer">Customer (Khách hàng)</option>}
                  {allowedTaxonomies.includes("Product") && <option value="Product">Product (Sản phẩm)</option>}
                  {allowedTaxonomies.includes("Order") && <option value="Order">Order / SalesOrder (Đơn hàng)</option>}
                  {allowedTaxonomies.includes("Contract") && <option value="Contract">Contract (Hợp đồng)</option>}
                  {allowedTaxonomies.includes("Clause") && <option value="Clause">Clause (Điều khoản)</option>}
                  {allowedTaxonomies.includes("Vendor") && <option value="Vendor">Vendor / Company (Nhà cung cấp)</option>}
                  {allowedTaxonomies.includes("Employee") && <option value="Employee">Employee (Nhân viên / HR)</option>}
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
