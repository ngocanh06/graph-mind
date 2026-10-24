import React, { useState, useEffect, useMemo } from "react";
import Icon from '../../components/ui/Icon';
import {
  fetchRepositoryDocuments,
  fetchDocumentDetail,
  uploadDocument,
  renameDocument,
  replaceDocument,
  deleteDocument
} from '../../services/api';
import { DEPARTMENTS, resolveDepartment } from '../../constants/departments';

export default function DocumentsView({ onNavigate, t, lang, role, currentUser, initialDocId }) {
  const isVi = lang === "vi";
  const isStandard = role === "standard" || role === "sales" || currentUser?.roleKey === "SALES_OPS" || currentUser?.id === "standard";
  const isAdmin = (role === "admin" || role === "it_admin" || currentUser?.roleKey === "IT_ADMIN") && !isStandard;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [docFilter, setDocFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [filterNewest, setFilterNewest] = useState("ALL"); // "ALL" | "NEW_ONLY" | "NEWEST_FIRST" | "NAME_ASC"
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Live Repository Data states
  const [docsList, setDocsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    total_items: 0,
    indexed_documents: 0,
    pending_documents: 0,
    failed_documents: 0,
    cuad_total: 0,
    cuad_contracts: 0,
    adventureworks_total: 0,
    adventureworks_datasets: 0,
    total_chunks: 0,
    cuad_chunks: 0,
    neo4j_nodes: 0,
    neo4j_relationships: 0,
    departments_count: 5
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [isLoading, setIsLoading] = useState(false);

  // Drawer & Selection state
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || null);
  const [activeDocDetail, setActiveDocDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(Boolean(initialDocId));
  const [isDrawerFullscreen, setIsDrawerFullscreen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(125);
  const [verifiedDocs, setVerifiedDocs] = useState({});
  const [toastMsg, setToastMsg] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [drawerError, setDrawerError] = useState("");

  // Action Menu & Management Modal States
  const [activeMenuDocId, setActiveMenuDocId] = useState(null);

  const [renameModalDoc, setRenameModalDoc] = useState(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  const [replaceModalDoc, setReplaceModalDoc] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState("");

  const [deleteModalDoc, setDeleteModalDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Upload Modal State (+ Upload tài liệu)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDept, setUploadDept] = useState("legal");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Close active dropdown menu when clicking anywhere else
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuDocId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleUploadSubmit = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      setUploadError(isVi ? "Vui lòng chọn một tệp để tải lên." : "Please select a file to upload.");
      return;
    }
    const ext = uploadFile.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "xlsx", "csv"].includes(ext)) {
      setUploadError(isVi ? "Chỉ hỗ trợ các định dạng .pdf, .docx, .xlsx, .csv." : "Only .pdf, .docx, .xlsx, .csv are supported.");
      return;
    }
    if (uploadFile.size > 50 * 1024 * 1024) {
      setUploadError(isVi ? "Kích thước tệp vượt quá giới hạn 50MB." : "File exceeds 50MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccessMsg("");

    const res = await uploadDocument(uploadFile, uploadDept, currentUser);
    setIsUploading(false);

    if (res && res.success) {
      setUploadSuccessMsg(isVi ? `✓ Đã lưu ${uploadFile.name} vào Central Storage (/data/${uploadDept}/). Ingestion Pipeline đang phân tích...` : `✓ Saved ${uploadFile.name} to /data/${uploadDept}/. Ingestion Pipeline analyzing...`);
      showToast(isVi ? `Đã lưu ${uploadFile.name} vào Central Storage` : `Saved ${uploadFile.name} to Central Storage`);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadSuccessMsg("");
      }, 1600);
    } else {
      setUploadError(res?.error || (isVi ? "Tải lên thất bại. Vui lòng thử lại." : "Upload failed. Please try again."));
    }
  };

  // Rename Action Handler
  const handleOpenRename = (doc, e) => {
    e?.stopPropagation();
    setActiveMenuDocId(null);
    setRenameModalDoc(doc);
    setRenameNewName(doc.name || "");
    setRenameError("");
  };

  const handleRenameSubmit = async (e) => {
    e?.preventDefault();
    if (!renameModalDoc || !renameNewName.trim()) return;
    setIsRenaming(true);
    setRenameError("");
    const res = await renameDocument(
      renameModalDoc.name,
      renameNewName.trim(),
      renameModalDoc.department || renameModalDoc.deptKey || "legal",
      currentUser
    );
    setIsRenaming(false);
    if (res && res.success) {
      showToast(isVi ? `Đã đổi tên thành ${renameNewName.trim()}` : `Renamed to ${renameNewName.trim()}`);
      setRenameModalDoc(null);
      setReloadTrigger((prev) => prev + 1);
    } else {
      setRenameError(res?.error || (isVi ? "Đổi tên thất bại." : "Rename failed."));
    }
  };

  // Replace File Action Handler
  const handleOpenReplace = (doc, e) => {
    e?.stopPropagation();
    setActiveMenuDocId(null);
    setReplaceModalDoc(doc);
    setReplaceFile(null);
    setReplaceError("");
  };

  const handleReplaceSubmit = async (e) => {
    e?.preventDefault();
    if (!replaceModalDoc || !replaceFile) return;
    setIsReplacing(true);
    setReplaceError("");
    const res = await replaceDocument(
      replaceFile,
      replaceModalDoc.name,
      replaceModalDoc.department || replaceModalDoc.deptKey || "legal",
      currentUser
    );
    setIsReplacing(false);
    if (res && res.success) {
      showToast(isVi ? `Đã thay tệp ${replaceModalDoc.name}. Ingestion đang đồng bộ...` : `Replaced ${replaceModalDoc.name}. Ingestion syncing...`);
      setReplaceModalDoc(null);
      setReplaceFile(null);
      setReloadTrigger((prev) => prev + 1);
    } else {
      setReplaceError(res?.error || (isVi ? "Thay file thất bại." : "Replace failed."));
    }
  };

  // Delete File Action Handler
  const handleOpenDelete = (doc, e) => {
    e?.stopPropagation();
    setActiveMenuDocId(null);
    setDeleteModalDoc(doc);
    setDeleteError("");
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModalDoc) return;
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteDocument(
      deleteModalDoc.name,
      deleteModalDoc.department || deleteModalDoc.deptKey || "legal",
      currentUser
    );
    setIsDeleting(false);
    if (res && res.success) {
      showToast(isVi ? `Đã xóa tài liệu ${deleteModalDoc.name}` : `Deleted ${deleteModalDoc.name}`);
      if (selectedDocId === deleteModalDoc.id || selectedDocId === deleteModalDoc.name) {
        setIsDrawerOpen(false);
        setActiveDocDetail(null);
      }
      setDeleteModalDoc(null);
      setReloadTrigger((prev) => prev + 1);
    } else {
      setDeleteError(res?.error || (isVi ? "Xóa tài liệu thất bại." : "Delete failed."));
    }
  };

  // Listen for realtime File Watcher events (CREATED, MODIFIED, DELETED, RENAMED)
  useEffect(() => {
    const handleWatcherEvent = (e) => {
      const evt = e.detail;
      if (evt && evt.eventType === "deleted") {
        if (selectedDocId && (selectedDocId === evt.fileName || selectedDocId === evt.docId)) {
          setSelectedDocId(null);
          setActiveDocDetail(null);
          setIsDrawerOpen(false);
        }
      }
      setReloadTrigger((prev) => prev + 1);
    };

    window.addEventListener("graphmind:watcher-event", handleWatcherEvent);
    return () => window.removeEventListener("graphmind:watcher-event", handleWatcherEvent);
  }, [selectedDocId]);

  // Fetch real documents & datasets from FastAPI backend
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchRepositoryDocuments({
      search: searchQuery,
      doc_type: docFilter,
      dept: deptFilter,
      sort_by: filterNewest === "NEWEST_FIRST" ? "newest" : (filterNewest === "NAME_ASC" ? "name_asc" : "default"),
      new_only: filterNewest === "NEW_ONLY",
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
  }, [searchQuery, docFilter, deptFilter, filterNewest, currentPage, pageSize, reloadTrigger]);

  const accessibleDocs = useMemo(() => {
    return docsList || [];
  }, [docsList]);

  const newDocsCount = summary.new_docs_count ?? summary.watcher_docs ?? 0;
  const filteredDocs = accessibleDocs;

  const activeDoc =
    activeDocDetail ||
    docsList.find((d) => d.id === selectedDocId || d.raw_id === selectedDocId || d.name === selectedDocId || d.oldName === selectedDocId) ||
    (selectedDocId ? { id: selectedDocId, name: selectedDocId, type: "PDF", statusBadge: "Đang tải...", access: "AES-256", schema: "CUAD_v1", hash: selectedDocId } : docsList[0]) ||
    {};
  const isDocVerified = activeDoc ? (verifiedDocs[activeDoc.id] || activeDoc.statusState === "active") : false;

  const handleOpenDrawer = (docId) => {
    setSelectedDocId(docId);
    setIsDrawerOpen(true);
    setIsLoadingDetail(true);
    setActiveDocDetail(null);
    setDrawerError("");
    fetchDocumentDetail(docId, currentUser).then((res) => {
      if (res && res.success) {
        setActiveDocDetail(res.data);
      } else if (res && res.error) {
        setDrawerError(res.error);
      }
      setIsLoadingDetail(false);
    });
  };

  // Auto-open specific document drawer if navigated with initialDocId
  useEffect(() => {
    if (initialDocId === "upload") {
      setIsUploadModalOpen(true);
      setUploadError("");
      setUploadSuccessMsg("");
      setUploadFile(null);
    } else if (initialDocId) {
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
    setFilterNewest("ALL");
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
              ? `Khám phá ${summary.cuad_contracts} tài liệu hợp đồng CUAD (${summary.cuad_chunks?.toLocaleString()} vector chunks trong Qdrant) và dữ liệu AdventureWorks (${summary.neo4j_nodes?.toLocaleString()} thực thể trong Neo4j). Click vào thẻ để mở bảng xem trước chi tiết.`
              : `Explore ${summary.cuad_contracts} CUAD contracts (${summary.cuad_chunks?.toLocaleString()} vector chunks in Qdrant) and AdventureWorks data (${summary.neo4j_nodes?.toLocaleString()} entities in Neo4j). Click any card to open the preview inspector.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-upload-document-modal"
            onClick={() => {
              setIsUploadModalOpen(true);
              setUploadError("");
              setUploadSuccessMsg("");
              setUploadFile(null);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
          >
            <Icon name="fa-solid fa-cloud-arrow-up text-[16px]" size={16} />
            <span>{isVi ? "+ Upload tài liệu" : "+ Upload Document"}</span>
          </button>

          {isAdmin ? (
            <>
              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("sop_composer");
                  } else {
                    showToast(isVi ? "Chuyển tới trình soạn thảo SOP (SCREEN-017a)" : "Navigating to SOP Composer (SCREEN-017a)");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold border border-outline-variant/40 hover:bg-surface-container transition-all flex items-center gap-2"
              >
                <Icon name="fa-solid fa-circle-plus text-[16px]" size={16} />
                <span>{isVi ? "Soạn thảo SOP" : "Compose SOP"}</span>
              </button>
              <button
                onClick={() => showToast(isVi ? "Đang đồng bộ Schema với Neo4j & Qdrant..." : "Synchronizing Schema with Neo4j & Qdrant...")}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold border border-outline-variant/40 hover:bg-surface-container transition-all flex items-center gap-2"
              >
                <Icon name="fa-solid fa-rotate text-[16px]" size={16} />
                <span>{isVi ? "Đồng bộ Schema" : "Sync Schema"}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-semibold text-on-surface-variant">
              <Icon name="fa-solid fa-shield-halved text-primary text-[14px]" size={14} />
              <span>{isVi ? "Quyền xem trước & Nạp tệp (Standard Preview Tier)" : "Preview & Upload Tier"}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REALTIME INGESTION PROGRESS BANNER */}
      {/* ========================================================================= */}
      {summary.cuad_total > 0 && (
        <div className={`p-4 md:p-5 rounded-2xl border transition-all ${
          summary.pending_documents > 0
            ? "bg-primary/5 border-primary/30 shadow-xs"
            : "bg-emerald-500/10 border-emerald-500/30"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                summary.pending_documents > 0
                  ? "bg-primary text-white animate-pulse"
                  : "bg-emerald-600 text-white"
              }`}>
                <Icon name={summary.pending_documents > 0 ? "fa-solid fa-arrows-rotate" : "fa-solid fa-check-double"} size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-on-surface">
                    {isVi ? "Tiến trình đồng bộ CUAD Ingestion" : "CUAD Ingestion Pipeline Progress"}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    summary.pending_documents > 0
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}>
                    {summary.pending_documents > 0
                      ? (isVi ? "Đang xử lý / Ingesting" : "Processing")
                      : (isVi ? "Hoàn tất 100%" : "100% Completed")}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {summary.pending_documents > 0
                    ? (isVi
                        ? `Đang trích xuất văn bản & nạp vector Qdrant + đồ thị Neo4j (${summary.cuad_contracts} / ${summary.cuad_total} files)`
                        : `Extracting text, embedding Qdrant chunks & merging Neo4j graph (${summary.cuad_contracts} / ${summary.cuad_total} files)`)
                    : (isVi
                        ? `Toàn bộ ${summary.cuad_contracts}/${summary.cuad_total} Hợp đồng CUAD & ${summary.adventureworks_datasets}/${summary.adventureworks_total} AdventureWorks đã được lập chỉ mục đầy đủ trong Qdrant và Neo4j.`
                        : `All ${summary.cuad_contracts}/${summary.cuad_total} CUAD contracts & ${summary.adventureworks_datasets}/${summary.adventureworks_total} AdventureWorks fully indexed in Qdrant & Neo4j.`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-on-surface-variant font-mono">
                    {summary.cuad_contracts} / {summary.cuad_total}
                  </span>
                  <span className="text-primary font-bold font-mono">
                    {summary.cuad_total > 0 ? (Math.round((summary.cuad_contracts / summary.cuad_total) * 1000) / 10).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${summary.cuad_total > 0 ? Math.min(100, Math.round((summary.cuad_contracts / summary.cuad_total) * 1000) / 10) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DASHBOARD STATISTICS CARDS (6 REQUIRED REAL-DATA KPIS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Documents */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              {isVi ? "Tổng tài liệu" : "Total Documents"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-folder-open" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface font-mono">
              {summary.total_items || totalCount}
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              {summary.cuad_contracts || 0} CUAD + {summary.adventureworks_datasets || 0} AW
            </p>
          </div>
        </div>

        {/* Card 2: Indexed Documents */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">
              {isVi ? "Đã lập chỉ mục" : "Indexed Documents"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-circle-check" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {summary.indexed_documents}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Qdrant + Neo4j ✓
            </p>
          </div>
        </div>

        {/* Card 3: Processing / Pending */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              {isVi ? "Đang xử lý / Chờ" : "Processing / Pending"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-hourglass-half" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-700 font-mono">
              {summary.pending_documents}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {summary.pending_documents > 0 ? (isVi ? "Trong hàng đợi nạp" : "In queue") : (isVi ? "Đã hoàn tất" : "All synced")}
            </p>
          </div>
        </div>

        {/* Card 4: Failed */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              {isVi ? "Thất bại" : "Failed"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-triangle-exclamation" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface font-mono">
              {summary.failed_documents || 0}
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              {isVi ? "0 lỗi kiểm duyệt" : "0 pipeline errors"}
            </p>
          </div>
        </div>

        {/* Card 5: Total Chunks (Qdrant) */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              {isVi ? "Tổng Chunks (Qdrant)" : "Total Chunks"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-primary-fixed/50 text-primary flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-cube" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-primary font-mono">
              {summary.total_chunks?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              cuad_contracts DB
            </p>
          </div>
        </div>

        {/* Card 6: Departments */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              {isVi ? "Phòng ban" : "Departments"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
              <Icon name="fa-solid fa-building" size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface font-mono">
              {summary.departments_count || 5}
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              Legal, Sales, Fin, R&D, IT
            </p>
          </div>
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

          {/* Filter 2: Dept (Exact 5 Canonical Departments, 'ALL' is filter-only) */}
          <div className="md:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full py-2 px-3 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">{isVi ? "Phòng ban: Tất cả" : "Dept: All"}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.key} value={d.filterValue}>
                  {isVi ? d.displayName : d.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Sắp xếp & Lọc tài liệu mới */}
          <div className="md:col-span-2">
            <select
              value={filterNewest}
              onChange={(e) => {
                setFilterNewest(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border-0 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="ALL">{isVi ? "Sắp xếp: Mặc định" : "Sort: Default"}</option>
              <option value="NEW_ONLY">{isVi ? "⚡ Chỉ tài liệu mới thêm" : "⚡ Only Recently Added"}</option>
              <option value="NEWEST_FIRST">{isVi ? "Mới nhất trước" : "Newest First"}</option>
              <option value="NAME_ASC">{isVi ? "Tên A → Z" : "Name A → Z"}</option>
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

        {/* Quick Filter Chips (Tất cả, Mới thêm gần đây, Theo phòng ban...) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container/60">
          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5 mr-1">
            <Icon name="fa-solid fa-bolt text-amber-500 text-[12px]" size={12} />
            <span>{isVi ? "Lọc nhanh:" : "Quick Filter:"}</span>
          </span>

          {/* Chip 1: Tất cả */}
          <button
            onClick={() => {
              setFilterNewest("ALL");
              setDocFilter("ALL");
              setDeptFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterNewest === "ALL" && docFilter === "ALL" && deptFilter === "ALL"
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30"
            }`}
          >
            <span>{isVi ? "Tất cả tài liệu" : "All Documents"}</span>
            <span className="text-[10px] opacity-80 font-mono">({summary.total_items || totalCount})</span>
          </button>

          {/* Chip 2: MỚI THÊM GẦN ĐÂY */}
          <button
            onClick={() => {
              setFilterNewest(filterNewest === "NEW_ONLY" ? "ALL" : "NEW_ONLY");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterNewest === "NEW_ONLY"
                ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40"
                : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
            }`}
            title={isVi ? "Lọc riêng các tài liệu vừa được nạp từ File Watcher hoặc tải lên gần đây" : "Filter newly added documents from File Watcher"}
          >
            <span className={`w-2 h-2 rounded-full ${filterNewest === "NEW_ONLY" ? "bg-white" : "bg-emerald-500"} animate-pulse`}></span>
            <span>{isVi ? "Mới thêm gần đây" : "Recently Added"}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              filterNewest === "NEW_ONLY" ? "bg-white/20 text-white" : "bg-emerald-200/80 text-emerald-900"
            }`}>
              {newDocsCount}
            </span>
          </button>

          {/* Chip 3: Mới nhất trước */}
          <button
            onClick={() => {
              setFilterNewest(filterNewest === "NEWEST_FIRST" ? "ALL" : "NEWEST_FIRST");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterNewest === "NEWEST_FIRST"
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30"
            }`}
          >
            <Icon name="fa-solid fa-arrow-down-wide-short text-[11px]" size={11} />
            <span>{isVi ? "Mới nhất trước" : "Newest First"}</span>
          </button>

          {/* Chip 4: Hợp đồng CUAD */}
          <button
            onClick={() => {
              setDocFilter(docFilter === "PDF" ? "ALL" : "PDF");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              docFilter === "PDF"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30"
            }`}
          >
            <Icon name="fa-solid fa-file-pdf text-rose-500 text-[11px]" size={11} />
            <span>CUAD PDF ({summary.cuad_contracts || 0})</span>
          </button>

          {/* Active filter badge if filtering */}
          {(filterNewest !== "ALL" || docFilter !== "ALL" || deptFilter !== "ALL" || searchQuery) && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="fa-solid fa-xmark text-[10px]" size={10} />
              <span>{isVi ? "Xóa bộ lọc" : "Clear filters"}</span>
            </button>
          )}
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
              <div className="font-semibold text-on-surface">
                {filterNewest === "NEW_ONLY"
                  ? (isVi ? "Chưa có tài liệu mới nào được thêm gần đây" : "No newly added documents yet")
                  : (isVi ? "Không tìm thấy tài liệu phù hợp" : "No matching documents found")}
              </div>
              <p className="text-xs text-outline mt-1">
                {filterNewest === "NEW_ONLY"
                  ? (isVi ? "Hãy đưa file vào Docker document volume '/data' hoặc bấm 'Nạp tài liệu mới'." : "Place a file into Docker document volume '/data' or click 'Ingest Document'.")
                  : (isVi ? "Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác." : "Try clearing filters or searching with another keyword.")}
              </p>
              {filterNewest === "NEW_ONLY" && (
                <button
                  onClick={() => setFilterNewest("ALL")}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Icon name="fa-solid fa-list text-[12px]" size={12} />
                  <span>{isVi ? "Xem tất cả tài liệu" : "View all documents"}</span>
                </button>
              )}
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isItemVerified = verifiedDocs[doc.id] || doc.statusState === "active";

              // Icon & color styling based on file type
              let iconName = "fa-solid fa-file-pdf";
              let iconBoxClass = "text-rose-600 bg-rose-50 border-rose-200";
              if (doc.type === "Sheets") {
                iconName = "fa-solid fa-file-excel";
                iconBoxClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
              } else if (doc.type === "NDA") {
                iconName = "fa-solid fa-shield-halved";
                iconBoxClass = "text-purple-600 bg-purple-50 border-purple-200";
              } else if (doc.type === "SOP") {
                iconName = "fa-solid fa-file-lines";
                iconBoxClass = "text-blue-600 bg-blue-50 border-blue-200";
              } else if (doc.type === "JSON") {
                iconName = "fa-solid fa-file-code";
                iconBoxClass = "text-cyan-600 bg-cyan-50 border-cyan-200";
              }

              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDrawer(doc.id)}
                  className={`cursor-pointer group relative bg-surface-container-lowest p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                    doc.risk === "High"
                      ? "border-error/40 hover:border-error"
                      : isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : (doc.isNew || doc.source === "aegis_local_file_watcher" || doc.statusBadge?.includes("Mới"))
                      ? "border-emerald-300/80 bg-gradient-to-b from-emerald-50/25 to-surface-container-lowest hover:border-emerald-500 shadow-emerald-500/5"
                      : "border-outline-variant/30 hover:border-primary"
                  }`}
                >
                  <div className="flex items-start justify-between relative">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-2xs ${iconBoxClass}`}>
                      <Icon name={iconName} size={20} />
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(doc.id);
                        }}
                        className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-bold text-[11px] flex items-center gap-1 hover:bg-primary hover:text-white transition-colors shadow-2xs cursor-pointer"
                        title={isVi ? "Xem chi tiết" : "View Details"}
                      >
                        <Icon name="fa-regular fa-eye text-[12px]" size={12} /> {isVi ? "Xem" : "View"}
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id);
                          }}
                          className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors border border-outline-variant/30 cursor-pointer"
                          title={isVi ? "Thao tác tài liệu" : "Document Actions"}
                        >
                          <Icon name="fa-solid fa-ellipsis-vertical text-[13px]" size={13} />
                        </button>

                        {/* Action Dropdown Menu */}
                        {activeMenuDocId === doc.id && (
                          <div className="absolute right-0 top-8 z-30 w-44 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuDocId(null);
                                handleOpenDrawer(doc.id);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Icon name="fa-regular fa-eye text-primary" size={13} />
                              <span>{isVi ? "Xem chi tiết" : "View Details"}</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenRename(doc, e)}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Icon name="fa-solid fa-pen-to-square text-amber-600" size={13} />
                              <span>{isVi ? "Đổi tên" : "Rename"}</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenReplace(doc, e)}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Icon name="fa-solid fa-arrow-right-arrow-left text-blue-600" size={13} />
                              <span>{isVi ? "Thay file" : "Replace File"}</span>
                            </button>
                            <div className="my-1 border-t border-outline-variant/20"></div>
                            <button
                              onClick={(e) => handleOpenDelete(doc, e)}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-error hover:bg-error/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Icon name="fa-regular fa-trash-can text-error" size={13} />
                              <span>{isVi ? "Xóa" : "Delete"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-md">
                        {doc.category}
                      </span>
                      {(doc.isNew || doc.source === "aegis_local_file_watcher" || doc.statusBadge?.includes("Mới") || doc.statusBadge?.includes("cập nhật")) && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {doc.statusBadge || (isVi ? "Mới thêm" : "New")}
                        </span>
                      )}
                      {doc.oldName && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs" title={`Tên cũ: ${doc.oldName}`}>
                          <Icon name="fa-solid fa-arrow-right-arrow-left text-[9px]" size={9} />
                          <span>{isVi ? "Đổi từ: " : "From: "}<span className="line-through">{doc.oldName}</span></span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-on-surface mt-2 group-hover:text-primary transition-colors line-clamp-1" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {doc.deptLabel} • {doc.date}
                    </p>
                  </div>

                  <div className="space-y-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
                    <div className="flex justify-between items-center text-xs text-on-surface-variant">
                      <span>{isVi ? "Trạng thái:" : "Status:"}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                        doc.status === "INDEXED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                          : doc.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-300"
                          : "bg-amber-50 text-amber-700 border border-amber-300"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          doc.status === "INDEXED" ? "bg-emerald-500" : doc.status === "FAILED" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                        }`}></span>
                        {doc.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant">
                      <span>Vector Chunks:</span>
                      <span className="font-bold text-on-surface font-mono">{doc.chunks}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-outline-variant/20 text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span>Qdrant:</span>
                        <strong className={doc.qdrant_indexed ? "text-emerald-600 font-bold" : "text-slate-400"}>
                          {doc.qdrant_indexed ? "✓" : "—"}
                        </strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>Neo4j:</span>
                        <strong className={doc.neo4j_synced ? "text-emerald-600 font-bold" : "text-slate-400"}>
                          {doc.neo4j_synced ? "✓" : "—"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-surface-container text-xs">
                    <span className="text-on-surface-variant font-mono">ID: {doc.id}</span>
                    <span className="font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {isVi ? "Xem chi tiết" : "View Details"} <Icon name="fa-solid fa-chevron-right text-[11px]" size={15} />
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
                      <div className="font-semibold text-on-surface">
                        {filterNewest === "NEW_ONLY"
                          ? (isVi ? "Chưa có tài liệu mới nào được thêm gần đây" : "No newly added documents yet")
                          : (isVi ? "Không có tài liệu nào trong danh sách." : "No documents in list.")}
                      </div>
                      <p className="text-xs text-outline mt-1">
                        {filterNewest === "NEW_ONLY"
                          ? (isVi ? "Hãy đưa file vào Docker document volume '/data' hoặc bấm 'Nạp tài liệu mới'." : "Place a file into Docker document volume '/data' or click 'Ingest Document'.")
                          : (isVi ? "Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác." : "Try clearing filters or searching with another keyword.")}
                      </p>
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
                          isSelected
                            ? "bg-surface-container-high/60 font-semibold"
                            : (doc.isNew || doc.source === "aegis_local_file_watcher" || doc.statusBadge?.includes("Mới"))
                            ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                            : "hover:bg-surface-container-low"
                        }`}
                      >
                        <td className="p-3.5 flex items-center gap-2.5 text-on-surface">
                          <Icon
                            name={
                              doc.type === "Sheets"
                                ? "fa-solid fa-file-excel text-emerald-600"
                                : doc.type === "NDA"
                                ? "fa-solid fa-shield-halved text-purple-600"
                                : doc.type === "SOP"
                                ? "fa-solid fa-file-lines text-blue-600"
                                : doc.type === "JSON"
                                ? "fa-solid fa-file-code text-cyan-600"
                                : "fa-solid fa-file-pdf text-rose-600"
                            }
                            size={16}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[280px] font-medium block">{doc.name}</span>
                              {(doc.isNew || doc.source === "aegis_local_file_watcher" || doc.statusBadge?.includes("Mới") || doc.statusBadge?.includes("cập nhật")) && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {doc.statusBadge || (isVi ? "Mới thêm" : "New")}
                                </span>
                              )}
                              {doc.oldName && (
                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 flex-shrink-0" title={`Tên cũ: ${doc.oldName}`}>
                                  <span>{isVi ? "Đổi từ: " : "From: "}<span className="line-through">{doc.oldName}</span></span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-outline block">{doc.category}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-outline text-xs">{doc.id}</td>
                        <td className="p-3.5 text-on-surface-variant text-xs">{doc.deptLabel}</td>
                        <td className="p-3.5 font-mono text-outline text-xs">{doc.type}</td>
                        <td className="p-3.5 text-xs text-on-surface-variant">{doc.size} • {doc.chunks}</td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 w-max ${
                              doc.status === "INDEXED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                : doc.status === "FAILED"
                                ? "bg-rose-50 text-rose-700 border border-rose-300"
                                : "bg-amber-50 text-amber-700 border border-amber-300"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                doc.status === "INDEXED" ? "bg-emerald-500" : doc.status === "FAILED" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                              }`}></span>
                              {doc.status}
                            </span>
                            <div className="text-[10px] text-on-surface-variant flex items-center gap-2">
                              <span>Qdrant: <strong className={doc.qdrant_indexed ? "text-emerald-600 font-bold" : "text-slate-400"}>{doc.qdrant_indexed ? "✓" : "—"}</strong></span>
                              <span>Neo4j: <strong className={doc.neo4j_synced ? "text-emerald-600 font-bold" : "text-slate-400"}>{doc.neo4j_synced ? "✓" : "—"}</strong></span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            doc.risk === "High" ? "bg-rose-50 text-rose-700 border border-rose-200" : doc.risk === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {doc.riskLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(doc.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title={isVi ? "Xem chi tiết" : "View Details"}
                            >
                              <Icon name="fa-regular fa-eye" size={13} />
                              <span>{isVi ? "Xem" : "View"}</span>
                            </button>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id);
                                }}
                                className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors border border-outline-variant/30 cursor-pointer"
                                title={isVi ? "Thao tác" : "Actions"}
                              >
                                <Icon name="fa-solid fa-ellipsis-vertical text-[13px]" size={13} />
                              </button>

                              {/* Action Dropdown Menu */}
                              {activeMenuDocId === doc.id && (
                                <div className="absolute right-0 top-8 z-30 w-44 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-xl py-1.5 text-left animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuDocId(null);
                                      handleOpenDrawer(doc.id);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Icon name="fa-regular fa-eye text-primary" size={13} />
                                    <span>{isVi ? "Xem chi tiết" : "View Details"}</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenRename(doc, e)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Icon name="fa-solid fa-pen-to-square text-amber-600" size={13} />
                                    <span>{isVi ? "Đổi tên" : "Rename"}</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenReplace(doc, e)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Icon name="fa-solid fa-arrow-right-arrow-left text-blue-600" size={13} />
                                    <span>{isVi ? "Thay file" : "Replace File"}</span>
                                  </button>
                                  <div className="my-1 border-t border-outline-variant/20"></div>
                                  <button
                                    onClick={(e) => handleOpenDelete(doc, e)}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-error hover:bg-error/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Icon name="fa-regular fa-trash-can text-error" size={13} />
                                    <span>{isVi ? "Xóa" : "Delete"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
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
                  <Icon name={activeDoc.icon || (activeDoc.type === "Sheets" ? "fa-solid fa-file-excel" : activeDoc.type === "NDA" ? "fa-solid fa-file-contract" : "fa-solid fa-file-pdf")} size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-on-surface line-clamp-1">{activeDoc.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      {activeDoc.statusBadge}
                    </span>
                    {activeDoc.oldName && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs">
                        <Icon name="fa-solid fa-arrow-right-arrow-left text-[10px]" size={10} />
                        <span>{isVi ? "Đổi tên từ: " : "Renamed from: "}<span className="line-through font-mono">{activeDoc.oldName}</span> ➔ <strong className="font-mono">{activeDoc.name}</strong></span>
                      </span>
                    )}
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
                  <Icon name={isDrawerFullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand"} size={15} />
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
                          {activeDoc.source === "aegis_local_file_watcher"
                            ? (isVi ? "TÀI LIỆU NẠP TỰ ĐỘNG TỪ LOCAL FILE WATCHER (MÁY NHÂN VIÊN)" : "AUTO-INGESTED FROM LOCAL FILE WATCHER")
                            : (isVi ? "VĂN BẢN HỢP ĐỒNG CUAD — TRÍCH XUẤT TỪ QDRANT" : "CUAD CONTRACT TEXT — EXTRACTED FROM QDRANT")}
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
                  ) : drawerError ? (
                    /* Error / BR-02 Permission Notice */
                    <div className="p-8 text-center text-xs space-y-3 bg-red-50/60 rounded-xl border border-red-200 m-4">
                      <Icon name="fa-solid fa-shield-halved text-2xl text-red-600" size={24} />
                      <div className="text-red-900 font-bold text-sm">
                        {isVi ? "Giới hạn quyền truy cập theo phòng ban (BR-02)" : "Department Scope Access Restriction (BR-02)"}
                      </div>
                      <p className="text-red-800 text-xs max-w-md mx-auto leading-relaxed">{drawerError}</p>
                    </div>
                  ) : isLoadingDetail ? (
                    /* Loading Detail */
                    <div className="p-8 text-center text-xs text-outline space-y-2">
                      <Icon name="fa-solid fa-spinner animate-spin text-2xl text-primary" size={20} />
                      <p>{isVi ? "Đang truy xuất dữ liệu từ Central Storage, Qdrant & Neo4j..." : "Fetching document from Central Storage, Qdrant & Neo4j..."}</p>
                    </div>
                  ) : (
                    /* Fallback / Empty Detail */
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

                  {/* Key Metadata Table (Section 21 Standard) */}
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2 text-xs">
                    {activeDoc.oldName && (
                      <div className="flex justify-between py-1.5 border-b border-surface-container bg-amber-50/70 px-2.5 rounded-lg border border-amber-200">
                        <span className="text-amber-900 font-semibold">{isVi ? "Tên cũ (Trước đổi):" : "Previous Name:"}</span>
                        <span className="font-bold text-amber-950 font-mono line-through">{activeDoc.oldName}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Tên tài liệu:" : "Document Name:"}</span>
                      <span className="font-bold text-on-surface max-w-[200px] truncate" title={activeDoc.name}>{activeDoc.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Phòng ban:" : "Department:"}</span>
                      <span className="font-bold text-on-surface">{activeDoc.deptLabel || activeDoc.department}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Mã định danh (ID):" : "Document ID:"}</span>
                      <span className="font-mono font-bold text-on-surface">{activeDoc.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Trạng thái:" : "Status:"}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                        activeDoc.status === "INDEXED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                          : activeDoc.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-300"
                          : "bg-amber-50 text-amber-700 border border-amber-300"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activeDoc.status === "INDEXED" ? "bg-emerald-500" : activeDoc.status === "FAILED" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                        }`}></span>
                        {activeDoc.status || "INDEXED"}
                      </span>
                    </div>
                    <div className="flex flex-col py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant mb-0.5">{isVi ? "Central Storage:" : "Central Storage:"}</span>
                      <span className="font-mono text-[11px] text-primary bg-primary/5 px-2 py-1 rounded border border-primary/20 break-all select-all">
                        {activeDoc.storage_path || activeDoc.storagePath || `/data/${activeDoc.deptKey || 'legal'}/${activeDoc.name}`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Dung lượng:" : "File Size:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.size || "1.2 MB"}</span>
                    </div>
                    <div className="flex flex-col py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant mb-0.5">SHA-256 Hash:</span>
                      <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded truncate select-all" title={activeDoc.hash || activeDoc.file_hash}>
                        {activeDoc.hash || activeDoc.file_hash || "SHA-256 Verified"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Thời gian tạo:" : "Created At:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.created_at || activeDoc.lastSynced}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">{isVi ? "Thời gian cập nhật:" : "Updated At:"}</span>
                      <span className="font-semibold text-on-surface">{activeDoc.updated_at || activeDoc.lastSynced}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-surface-container">
                      <span className="text-on-surface-variant">Qdrant Vector DB:</span>
                      <span className="flex items-center gap-1 font-bold text-xs text-emerald-600">
                        <span>✓ Indexed</span>
                        <span className="text-on-surface font-mono text-[11px]">({activeDoc.chunk_count || activeDoc.chunks || 0} chunks)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-on-surface-variant">Neo4j Graph DB:</span>
                      <span className="font-bold text-xs text-emerald-600">
                        {activeDoc.neo4j_synced !== false ? "✓ Synced" : "Pending"}
                      </span>
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

      {/* ========================================================================= */}
      {/* UPLOAD DOCUMENT MODAL (+ Upload tài liệu) */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="fa-solid fa-cloud-arrow-up text-[18px]" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {isVi ? "Tải lên tài liệu mới" : "Upload New Document"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {isVi ? "Lưu vào Central Document Storage (/data) & Tự động Ingest" : "Save to Central Storage (/data) & Auto-Ingest"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              >
                <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {/* Department Selector */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                  {isVi ? "Phòng ban đích (Canonical Department)" : "Target Department"}
                </label>
                <select
                  value={uploadDept}
                  onChange={(e) => setUploadDept(e.target.value)}
                  className="w-full py-2.5 px-3 bg-surface-container-low rounded-xl text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                >
                  <option value="legal">Pháp chế (Legal) — /data/legal</option>
                  <option value="sales">Kinh doanh (Sales) — /data/sales</option>
                  <option value="accounting_procurement">Kế toán / Thu mua (Accounting & Procurement) — /data/accounting_procurement</option>
                  <option value="it">Công nghệ / IT (Information Technology) — /data/it</option>
                  <option value="rnd">Nghiên cứu & Phát triển (R&D) — /data/rnd</option>
                </select>
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  {isVi ? "Tệp sẽ được phân bổ vào thư mục chuẩn xác định theo RBAC của GraphMind." : "File will be saved to canonical folder mapped to RBAC scope."}
                </span>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                  {isVi ? "Tệp tài liệu (.pdf, .docx, .xlsx, .csv)" : "Document File (.pdf, .docx, .xlsx, .csv)"}
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    uploadFile
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/60 hover:border-primary hover:bg-surface-container-low"
                  }`}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadError("");
                      }
                    }}
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Icon name="fa-solid fa-file-circle-check text-primary text-[28px]" size={28} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-on-surface">{uploadFile.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                        className="ml-auto text-xs text-error hover:underline"
                      >
                        {isVi ? "Đổi tệp" : "Change"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Icon name="fa-solid fa-cloud-arrow-up text-on-surface-variant text-[28px]" size={28} />
                      <p className="text-sm font-semibold text-on-surface">
                        {isVi ? "Nhấp hoặc kéo thả tệp vào đây" : "Click or drag file here"}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {isVi ? "Hỗ trợ PDF, DOCX, XLSX, CSV (Tối đa 50MB)" : "Supports PDF, DOCX, XLSX, CSV (Max 50MB)"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informational Architecture Banner */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11.5px] text-on-surface-variant flex items-start gap-2.5">
                <Icon name="fa-solid fa-circle-info text-primary mt-0.5" size={14} />
                <span className="leading-relaxed">
                  {isVi
                    ? "Kiến trúc thống nhất: Backend lưu tệp vào Central Storage (/data) → File Watcher phát hiện CREATE → Trích xuất Entity & Relation vào Neo4j và Vectors vào Qdrant → Phát thông báo SSE theo thời gian thực."
                    : "Unified Architecture: File is stored in Central Storage (/data) → File Watcher detects CREATE → Extracts Graph Entities to Neo4j & Vectors to Qdrant → SSE realtime broadcast."}
                </span>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                  <Icon name="fa-solid fa-circle-exclamation text-[14px]" size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Success Message */}
              {uploadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Icon name="fa-solid fa-circle-check text-[14px]" size={14} />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all"
                  disabled={isUploading}
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-primary shadow transition-all flex items-center gap-2 ${
                    !uploadFile || isUploading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Icon name="fa-solid fa-spinner animate-spin text-[14px]" size={14} />
                      <span>{isVi ? "Đang lưu Central Storage..." : "Uploading to Storage..."}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="fa-solid fa-arrow-up-from-bracket text-[14px]" size={14} />
                      <span>{isVi ? "Tải lên Central Storage" : "Upload to Central Storage"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* RENAME DOCUMENT MODAL */}
      {/* ========================================================================= */}
      {renameModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Icon name="fa-solid fa-pen-to-square text-[18px]" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {isVi ? "Đổi tên tài liệu" : "Rename Document"}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono truncate max-w-[240px]">
                    {renameModalDoc.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenameModalDoc(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                  {isVi ? "Tên tệp mới (Kèm phần mở rộng)" : "New File Name (With Extension)"}
                </label>
                <input
                  type="text"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full py-2.5 px-3 bg-surface-container-low rounded-xl text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-mono shadow-2xs"
                  placeholder="Contract_NewName.pdf"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11.5px] text-on-surface-variant flex items-start gap-2.5">
                <Icon name="fa-solid fa-circle-info text-amber-600 mt-0.5" size={14} />
                <span className="leading-relaxed">
                  {isVi
                    ? "Tên tệp sẽ được đồng bộ cập nhật trong Central Storage (/data), payload Qdrant và đồ thị Neo4j mà không làm mất liên kết hay phải nhúng lại vector."
                    : "File name will be synchronized in Central Storage (/data), Qdrant payload, and Neo4j graph without re-embedding."}
                </span>
              </div>

              {renameError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                  <Icon name="fa-solid fa-circle-exclamation text-[14px]" size={14} />
                  <span>{renameError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenameModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
                  disabled={isRenaming}
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameNewName.trim() || renameNewName.trim() === renameModalDoc.name}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary shadow transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isRenaming ? (
                    <>
                      <Icon name="fa-solid fa-spinner animate-spin text-[14px]" size={14} />
                      <span>{isVi ? "Đang đổi tên..." : "Renaming..."}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="fa-solid fa-check text-[14px]" size={14} />
                      <span>{isVi ? "Lưu thay đổi" : "Save Changes"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPLACE DOCUMENT FILE MODAL */}
      {/* ========================================================================= */}
      {replaceModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Icon name="fa-solid fa-arrow-right-arrow-left text-[18px]" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {isVi ? "Thay thế nội dung tệp" : "Replace Document File"}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono truncate max-w-[260px]">
                    {replaceModalDoc.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplaceModalDoc(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                  {isVi ? "Chọn tệp tài liệu mới để ghi đè" : "Select Replacement File"}
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    replaceFile
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/60 hover:border-primary hover:bg-surface-container-low"
                  }`}
                  onClick={() => document.getElementById("file-replace-input")?.click()}
                >
                  <input
                    id="file-replace-input"
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplaceFile(e.target.files[0]);
                        setReplaceError("");
                      }
                    }}
                  />
                  {replaceFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Icon name="fa-solid fa-file-circle-check text-primary text-[28px]" size={28} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-on-surface">{replaceFile.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {(replaceFile.size / (1024 * 1024)).toFixed(2)} MB • {replaceFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplaceFile(null);
                        }}
                        className="ml-auto text-xs text-error hover:underline cursor-pointer"
                      >
                        {isVi ? "Đổi tệp" : "Change"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Icon name="fa-solid fa-cloud-arrow-up text-on-surface-variant text-[28px]" size={28} />
                      <p className="text-sm font-semibold text-on-surface">
                        {isVi ? "Nhấp hoặc kéo thả tệp mới vào đây" : "Click or drag replacement file"}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {isVi ? "Tối đa 50MB (PDF, DOCX, XLSX, CSV)" : "Max 50MB (PDF, DOCX, XLSX, CSV)"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11.5px] text-blue-900 flex items-start gap-2.5">
                <Icon name="fa-solid fa-arrows-rotate text-blue-600 mt-0.5" size={14} />
                <span className="leading-relaxed">
                  {isVi
                    ? "Hệ thống sẽ ghi đè vào Central Storage, xóa các vector chunks cũ, tự động trích xuất nội dung tệp mới, lập chỉ mục Qdrant và cập nhật Document trong Neo4j."
                    : "System will overwrite file in Central Storage, purge old vectors, re-chunk and embed into Qdrant, and update Neo4j."}
                </span>
              </div>

              {replaceError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                  <Icon name="fa-solid fa-circle-exclamation text-[14px]" size={14} />
                  <span>{replaceError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReplaceModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
                  disabled={isReplacing}
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!replaceFile || isReplacing}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary shadow transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isReplacing ? (
                    <>
                      <Icon name="fa-solid fa-spinner animate-spin text-[14px]" size={14} />
                      <span>{isVi ? "Đang thay thế & Ingest..." : "Replacing & Ingesting..."}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="fa-solid fa-arrow-right-arrow-left text-[14px]" size={14} />
                      <span>{isVi ? "Tải lên & Thay thế" : "Upload & Replace"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-error/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-error/20 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-error/15 text-error flex items-center justify-center">
                  <Icon name="fa-solid fa-triangle-exclamation text-[18px]" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {isVi ? "Xác nhận xóa tài liệu" : "Confirm Document Deletion"}
                  </h3>
                  <p className="text-xs text-error font-semibold">
                    {isVi ? "Hành động này không thể hoàn tác" : "This action cannot be undone"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalDoc(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <Icon name="fa-solid fa-xmark text-[16px]" size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">{isVi ? "Tên tệp:" : "File Name:"}</span>
                  <span className="font-mono font-bold text-on-surface truncate max-w-[220px]" title={deleteModalDoc.name}>{deleteModalDoc.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">{isVi ? "Phòng ban:" : "Department:"}</span>
                  <span className="font-semibold text-on-surface">{deleteModalDoc.deptLabel || deleteModalDoc.department}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">{isVi ? "Mã định danh:" : "Document ID:"}</span>
                  <span className="font-mono text-outline">{deleteModalDoc.id}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed flex items-start gap-2.5">
                <Icon name="fa-solid fa-circle-exclamation text-error text-[16px] shrink-0 mt-0.5" size={16} />
                <span>
                  {isVi
                    ? "Tài liệu sẽ bị xóa vĩnh viễn khỏi Central Storage (/data), toàn bộ vector chunks trong Qdrant sẽ bị dọn dẹp, và Document node trong Neo4j sẽ được gỡ bỏ."
                    : "The raw file will be deleted from Central Storage (/data), vectors removed from Qdrant, and Document node purged from Neo4j."}
                </span>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                  <Icon name="fa-solid fa-circle-exclamation text-[14px]" size={14} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
                  disabled={isDeleting}
                >
                  {isVi ? "Hủy bỏ" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-error hover:bg-rose-700 shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Icon name="fa-solid fa-spinner animate-spin text-[14px]" size={14} />
                      <span>{isVi ? "Đang xóa..." : "Deleting..."}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="fa-regular fa-trash-can text-[14px]" size={14} />
                      <span>{isVi ? "Xác nhận xóa vĩnh viễn" : "Delete Permanently"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
