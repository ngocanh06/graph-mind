import React, { useState, useEffect, useMemo } from "react";
import Icon from '../../components/ui/Icon';
import { fetchRepositoryDocuments, fetchDocumentDetail } from '../../services/api';

export default function DocumentsView({ onNavigate, t, lang, role, currentUser, initialDocId }) {
  const isVi = lang === "vi";
  const isAdmin = role === "admin" || role === "it_admin";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [docFilter, setDocFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Live Repository Data states
  const [docsList, setDocsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    total_items: 515,
    cuad_contracts: 510,
    adventureworks_datasets: 5,
    cuad_chunks: 40194,
    neo4j_nodes: 52120
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [isLoading, setIsLoading] = useState(false);

  // Drawer & Selection state
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || "AW_SALES_ORDERS");
  const [activeDocDetail, setActiveDocDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(Boolean(initialDocId));
  const [isDrawerFullscreen, setIsDrawerFullscreen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(125);
  const [verifiedDocs, setVerifiedDocs] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch real documents & datasets from FastAPI backend
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchRepositoryDocuments({
      search: searchQuery,
      doc_type: docFilter,
      dept: deptFilter,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    }).then((res) => {
      if (!active) return;
      if (res && res.success) {
        setDocsList(res.data || []);
        setTotalCount(res.total || 0);
        if (res.summary) setSummary(res.summary);
      }
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [searchQuery, docFilter, deptFilter, currentPage, pageSize]);

  const accessibleDocs = docsList;
  const filteredDocs = docsList;

  const activeDoc = activeDocDetail || docsList.find((d) => d.id === selectedDocId || d.raw_id === selectedDocId || d.name === selectedDocId) || docsList[0] || {};
  const isDocVerified = activeDoc ? (verifiedDocs[activeDoc.id] || activeDoc.statusState === "active") : false;

  const handleOpenDrawer = (docId) => {
    setSelectedDocId(docId);
    setIsDrawerOpen(true);
    setIsLoadingDetail(true);
    setActiveDocDetail(null);
    fetchDocumentDetail(docId).then((res) => {
      if (res && res.success) {
        setActiveDocDetail(res.data);
      }
      setIsLoadingDetail(false);
    });
  };

  // Auto-open specific document drawer if navigated with initialDocId
  useEffect(() => {
    if (initialDocId) {
      handleOpenDrawer(initialDocId);
    }
  }, [initialDocId]);

  const handleVerifyCurrentDoc = () => {
    if (!activeDoc || !activeDoc.id) return;
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    showToast(isVi ? `Đã xác thực và đồng bộ toàn bộ thực thể của ${activeDoc.name} vào Neo4j!` : `Verified and synchronized entities from ${activeDoc.name} into Neo4j!`);
  };

  const handleDownloadDoc = () => {
    if (!activeDoc || !activeDoc.name) return;
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
    setCurrentPage(1);
  };


  return (
    <section className="view active text-on-surface flex flex-col gap-space-md min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <Icon name="fa-solid fa-circle-check text-primary text-[18px]" size={18} />
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
              ? `Khám phá ${summary.cuad_contracts} tài liệu hợp đồng CUAD (${summary.cuad_chunks?.toLocaleString()} vector chunks trong Qdrant) và dữ liệu AdventureWorks (${summary.neo4j_nodes?.toLocaleString()} thực thể trong Neo4j). Click vào thẻ để mở bảng xem trước chi tiết (DRAWER-004).`
              : `Explore ${summary.cuad_contracts} CUAD contracts (${summary.cuad_chunks?.toLocaleString()} vector chunks in Qdrant) and AdventureWorks data (${summary.neo4j_nodes?.toLocaleString()} entities in Neo4j). Click any card to open the preview inspector (DRAWER-004).`}
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
            <Icon name="fa-solid fa-circle-plus text-[16px]" size={16} />
            <span>{isVi ? "Nạp tài liệu mới" : "Ingest Document"}</span>
          </button>
          <button
            onClick={() => showToast(isVi ? "Đang đồng bộ Schema với Neo4j & Qdrant..." : "Synchronizing Schema with Neo4j & Qdrant...")}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold border border-outline-variant/40 hover:bg-surface-container transition-all flex items-center gap-2"
          >
            <Icon name="fa-solid fa-rotate text-[16px]" size={16} />
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
            <Icon name="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-on-surface-variant text-[15px]" size={15} />
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
                <Icon name="fa-solid fa-grip" size={15} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "table" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Table List"
              >
                <Icon name="fa-solid fa-list" size={15} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <button
              onClick={resetFilters}
              className="p-2 px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors flex items-center justify-center text-xs"
              title={isVi ? "Làm mới bộ lọc" : "Reset filters"}
            >
              <Icon name="fa-solid fa-filter-circle-xmark text-[14px]" size={14} />
            </button>
          </div>
        </div>

        {/* Quick Status Indicator Bar */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-surface-container text-xs text-on-surface-variant font-medium">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {isVi ? "Hiển thị" : "Showing"}{" "}
              <strong className="text-on-surface">{filteredDocs.length}</strong> / {totalCount} {isVi ? "tài liệu & bộ dữ liệu" : "documents & datasets"}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> {summary.cuad_contracts} {isVi ? "Hợp đồng CUAD" : "CUAD Contracts"}
            </span>
            <span className="flex items-center gap-1.5 text-tertiary font-semibold">
              <span className="w-2 h-2 rounded-full bg-tertiary inline-block"></span> {summary.cuad_chunks?.toLocaleString()} {isVi ? "Vector Chunks" : "Vector Chunks"}
            </span>
            <span className="flex items-center gap-1.5 text-secondary font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span> {summary.neo4j_nodes?.toLocaleString()} {isVi ? "Thực thể Neo4j" : "Neo4j Entities"}
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
              <Icon name="fa-regular fa-folder-open text-3xl mb-2 text-outline/40" size={15} />
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
                      <Icon name="" size={14} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[11px] flex items-center gap-1 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon name="fa-regular fa-eye text-[12px]" size={12} /> {isVi ? "Xem Drawer-004" : "Drawer-004"}
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
                      {isVi ? "Chi tiết" : "Details"} <Icon name="fa-solid fa-chevron-right text-[11px]" size={15} />
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
                          <Icon name="" size={14} />
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
                            <Icon name="fa-regular fa-eye" size={15} />
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
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-surface-container-low px-2.5 py-1.5 rounded-lg text-on-surface font-medium border border-outline-variant/30 focus:outline-none"
          >
            <option value={8}>8 {isVi ? "dòng / trang" : "rows / page"}</option>
            <option value={16}>16 {isVi ? "dòng / trang" : "rows / page"}</option>
            <option value={32}>32 {isVi ? "dòng / trang" : "rows / page"}</option>
          </select>
          <span>{isVi ? `tổng cộng ${totalCount} bản ghi` : `total ${totalCount} records`}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className={`px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 transition-colors flex items-center gap-1 ${
              currentPage <= 1 ? "opacity-40 cursor-not-allowed" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon name="fa-solid fa-chevron-left text-[11px]" size={15} /> {isVi ? "Trước" : "Prev"}
          </button>
          
          <span className="px-3 py-1.5 bg-surface-container text-on-surface font-mono rounded-lg">
            {currentPage} / {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), p + 1))}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            className={`px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 transition-colors flex items-center gap-1 ${
              currentPage >= Math.ceil(totalCount / pageSize) ? "opacity-40 cursor-not-allowed" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            {isVi ? "Sau" : "Next"} <Icon name="fa-solid fa-chevron-right text-[11px]" size={15} />
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
                  <Icon name="" size={14} />
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
                  <Icon name="" size={14} />
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                  title={isVi ? "Đóng" : "Close"}
                >
                  <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
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
                      <Icon name="fa-solid fa-angles-left text-[13px]" size={15} />
                    </button>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Prev Page">
                      <Icon name="fa-solid fa-chevron-left text-[13px]" size={15} />
                    </button>
                    <span className="font-bold text-on-surface px-2">
                      {isVi ? "Trang 16 / 42" : "Page 16 of 42"}
                    </span>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Next Page">
                      <Icon name="fa-solid fa-chevron-right text-[13px]" size={15} />
                    </button>
                    <button className="p-1 rounded hover:bg-surface-container text-on-surface" title="Last Page">
                      <Icon name="fa-solid fa-angles-right text-[13px]" size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      onClick={() => setPreviewZoom(Math.max(75, previewZoom - 25))}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Zoom Out"
                    >
                      <Icon name="fa-solid fa-magnifying-glass-minus text-[13px]" size={15} />
                    </button>
                    <span className="text-on-surface px-1">{previewZoom}%</span>
                    <button
                      onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Zoom In"
                    >
                      <Icon name="fa-solid fa-magnifying-glass-plus text-[13px]" size={15} />
                    </button>
                    <span className="inline-block w-px h-4 bg-outline-variant mx-1"></span>
                    <button
                      onClick={() => setPreviewZoom(100)}
                      className="p-1 rounded hover:bg-surface-container text-on-surface"
                      title="Fit Screen"
                    >
                      <Icon name="fa-solid fa-expand text-[13px]" size={15} />
                    </button>
                  </div>
                </div>

                {/* Document Page Sheet Rendering */}
                <div className="bg-surface-container-lowest p-7 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5 flex-1 overflow-y-auto leading-relaxed">
                  {/* Dynamic Document Content according to live backend detail */}
                  {isLoadingDetail ? (
                    <div className="p-12 text-center text-outline space-y-3">
                      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-semibold">{isVi ? "Đang tải dữ liệu thực tế từ Neo4j / Qdrant..." : "Loading live data from Neo4j / Qdrant..."}</p>
                    </div>
                  ) : activeDocDetail?.records?.length > 0 ? (
                    /* Real Live AdventureWorks Dataset Preview (Neo4j) */
                    <div className="space-y-4">
                      <div className="text-center pb-3 border-b border-surface-container">
                        <p className="text-xs font-bold tracking-widest text-primary uppercase">
                          {isVi ? "BẢN GHI ĐỒ THỊ THỰC TẾ — NEO4J ADVENTUREWORKS" : "LIVE GRAPH RECORDS — NEO4J ADVENTUREWORKS"}
                        </p>
                        <h2 className="text-lg font-bold text-on-surface mt-1">{activeDoc.name}</h2>
                        <p className="text-xs text-on-surface-variant font-mono">
                          {isVi ? `Hiển thị 25 bản ghi mẫu từ tập ${activeDoc.chunks || ""}` : `Showing 25 live sample records from ${activeDoc.chunks || ""}`}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-outline-variant/20 rounded-lg">
                          <thead className="bg-surface-container-low font-bold text-outline uppercase tracking-wider">
                            <tr>
                              {Object.keys(activeDocDetail.records[0]).map((key) => (
                                <th key={key} className="p-2.5 font-mono">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeDocDetail.records.map((row, rIdx) => (
                              <tr key={rIdx} className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                                {Object.values(row).map((val, cIdx) => (
                                  <td key={cIdx} className="p-2.5 font-mono text-on-surface">
                                    {val === null || val === undefined ? "-" : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : activeDocDetail?.chunks_list?.length > 0 ? (
                    /* Real Live CUAD Contract Preview (Qdrant Chunks) */
                    <div className="space-y-4">
                      <div className="text-center pb-4 border-b border-surface-container">
                        <p className="text-xs font-bold tracking-widest text-primary uppercase">
                          {isVi ? "VĂN BẢN HỢP ĐỒNG CUAD — TRÍCH XUẤT TỪ QDRANT" : "CUAD CONTRACT TEXT — EXTRACTED FROM QDRANT"}
                        </p>
                        <h2 className="text-xl font-bold text-on-surface mt-1">{activeDoc.name}</h2>
                        <p className="text-xs text-on-surface-variant font-mono">
                          {isVi ? `Tập tin chứa ${activeDoc.chunk_count || activeDocDetail.chunks_list.length} Vector Chunks (Kích thước nhúng 384 dims)` : `Contains ${activeDoc.chunk_count || activeDocDetail.chunks_list.length} Vector Chunks (384-dim embeddings)`}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {activeDocDetail.chunks_list.map((c, idx) => (
                          <div key={idx} className="bg-amber-100/90 border border-amber-300 p-4 rounded-xl shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-amber-900 flex items-center gap-1.5 font-bold">
                                <Icon name="fa-solid fa-highlighter text-amber-700" size={15} /> Chunk #{c.chunk_id !== undefined ? c.chunk_id : idx}
                              </span>
                              <span className="bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full text-[11px]">
                                Qdrant Vector Hit
                              </span>
                            </div>
                            <p className="text-amber-950 text-sm font-normal leading-relaxed whitespace-pre-wrap font-sans">
                              {c.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Fallback / Loading Detail */
                    <div className="p-8 text-center text-xs text-outline space-y-2">
                      <Icon name="fa-regular fa-file-lines text-2xl text-outline/40" size={20} />
                      <p>{isVi ? "Không có dữ liệu trích xuất hoặc đang kết nối lại dịch vụ..." : "No extraction data available or reconnecting to services..."}</p>
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
                      <Icon name="fa-solid fa-circle-nodes text-primary text-[18px]" size={18} />
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
                            <Icon name="fa-solid fa-arrow-turn-down-right" size={15} />
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
                    <Icon name="fa-solid fa-shield-halved text-amber-700 text-[16px] shrink-0 mt-0.5" size={16} />
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
                      <Icon name="" size={14} />
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
                      <Icon name="fa-solid fa-cloud-arrow-down text-[15px]" size={15} />
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
                        <Icon name="fa-solid fa-circle-nodes text-primary" size={15} />
                        <span>{isVi ? "Mở trên Đồ thị" : "Open in Graph"}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          if (onNavigate) onNavigate("copilot");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Icon name="fa-solid fa-robot text-cyan-600" size={15} />
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
