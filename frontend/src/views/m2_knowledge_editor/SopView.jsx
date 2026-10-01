import React, { useState } from "react";

export default function SopView({ onNavigate, t, lang = "vi", initialMode = "list", role, currentUser }) {
  const isVi = lang === "vi";

  // Mode: "list" (SCREEN-017) | "composer" (SCREEN-017a)
  const [mode, setMode] = useState(initialMode === "composer" ? "composer" : "list");

  // Search & Filter state for List (SCREEN-017)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  // SOP List dataset
  const [sopList, setSopList] = useState([
    {
      id: "SOP-01",
      code: "SOP-01",
      title: "SOP-01: Quy trình rà soát hợp đồng pháp lý CUAD",
      desc: "3 bước tích hợp GraphMind Copilot để bóc tách điều khoản rủi ro",
      dept: "Pháp chế",
      status: "published",
      statusLabel: isVi ? "Đã xuất bản" : "Published",
      version: "v2.2",
      updatedAt: "12/09/2026",
      author: "Trưởng phòng Pháp chế",
      tags: ["#legal", "#cuad", "#risk"]
    },
    {
      id: "SOP-02",
      code: "SOP-02",
      title: "SOP-02: Quy chuẩn tiếp nhận & nghiệm thu phần mềm đối tác v2.1",
      desc: "Tiêu chuẩn kiểm thử bảo mật, UAT và bàn giao mã nguồn IT",
      dept: "Công nghệ / IT",
      status: "published",
      statusLabel: isVi ? "Đã xuất bản" : "Published",
      version: "v2.1",
      updatedAt: "10/09/2026",
      author: "Nguyễn Văn An",
      tags: ["#it", "#uat", "#security"]
    },
    {
      id: "SOP-03",
      code: "SOP-03",
      title: "SOP-03: Hướng dẫn tích hợp Agent đồng bộ máy trạm AEGIS",
      desc: "Quy trình cấp phát token và cấu hình RBAC cho chuyên viên mới",
      dept: "R&D",
      status: "draft",
      statusLabel: isVi ? "Bản nháp" : "Draft",
      version: "v0.9",
      updatedAt: isVi ? "Hôm nay 08:15" : "Today 08:15",
      author: "Trần Thu Hương",
      tags: ["#aegis", "#sync", "#agent"]
    },
    {
      id: "SOP-04",
      code: "SOP-04",
      title: "SOP-04: Xử lý sự cố lệch dữ liệu Vector Qdrant",
      desc: "Sổ tay Runbook dành cho AI Ops khi phát hiện drift embeddings",
      dept: "AI Ops",
      status: "draft",
      statusLabel: isVi ? "Bản nháp" : "Draft",
      version: "v1.0-draft",
      updatedAt: "04/09/2026",
      author: "Võ Minh Đạt",
      tags: ["#vector", "#qdrant", "#ops"]
    }
  ]);

  // Composer Form State (SCREEN-017a)
  const [composerData, setComposerData] = useState({
    id: "SOP-01",
    title: "Quy trình rà soát hợp đồng CUAD với GraphMind AI Copilot",
    dept: "Pháp chế",
    version: "v2.2",
    tags: "#legal, #cuad, #risk",
    purpose:
      "Quy trình này quy định các bước chuẩn hóa bắt buộc đối với chuyên viên Pháp chế và Quản lý Hợp đồng khi tiếp nhận, rà soát và đánh giá rủi ro pháp lý đối với toàn bộ các dự thảo hợp đồng mua sắm dịch vụ (CUAD Service Agreement) có giá trị từ 500,000,000 VNĐ trở lên hoặc hợp đồng có yếu tố đối tác nước ngoài.",
    steps: [
      {
        num: 1,
        title: "Bước 1: Nạp tài liệu & Kích hoạt Hybrid GraphRAG",
        desc: "Chuyên viên tải tệp PDF dự thảo lên SCREEN-015. Hệ thống tự động phân tách 128 Chunks vector vào Qdrant và liên kết các node pháp lý tương ứng trong Neo4j."
      },
      {
        num: 2,
        title: "Bước 2: Đối soát điều khoản và Nhận diện rủi ro tự động",
        desc: "AI Copilot sẽ quét toàn bộ 41 danh mục điều khoản CUAD. Đặc biệt lưu ý các cảnh báo HAS_RISK_LIABILITY nếu điều khoản bồi thường thiệt hại trực tiếp dưới mức trần quy chuẩn 30% giá trị hợp đồng."
      },
      {
        num: 3,
        title: "Bước 3: Hiệu chỉnh Human-in-the-loop & Đề xuất sửa đổi",
        desc: "Sử dụng Knowledge Editor (SCREEN-016) để xác nhận lại mối liên hệ thực thể, bổ sung chú thích pháp lý trước khi phát hành Báo cáo thẩm định sang ban Giám đốc."
      }
    ],
    governance:
      "Mọi biên bản rà soát phải được ký số bởi Trưởng phòng Pháp chế và lưu trữ vĩnh viễn trên hệ thống tri thức tập trung. Bất kỳ ngoại lệ nào vượt quá thẩm quyền phải kích hoạt quy trình phê duyệt khẩn cấp (Escalation Rule C4)."
  });

  const [activePreviewSop, setActivePreviewSop] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleEditSop = (sop) => {
    setComposerData({
      id: sop.id,
      title: sop.title,
      dept: sop.dept,
      version: sop.version,
      tags: sop.tags.join(", "),
      purpose: composerData.purpose,
      steps: composerData.steps,
      governance: composerData.governance
    });
    setMode("composer");
    showToast(isVi ? `Đang mở trình soạn thảo cho ${sop.code}` : `Editing ${sop.code}`);
  };

  const handleNewSop = () => {
    const nextCode = `SOP-0${sopList.length + 1}`;
    setComposerData({
      id: nextCode,
      title: isVi ? `Quy trình nghiệp vụ mới (${nextCode})` : `New Standard Procedure (${nextCode})`,
      dept: "Pháp chế",
      version: "v1.0",
      tags: "#internal, #sop, #new",
      purpose: isVi ? "Quy định mục đích và phạm vi áp dụng của quy trình chuẩn mới." : "Define purpose and scope of the standard operating procedure.",
      steps: [
        {
          num: 1,
          title: isVi ? "Bước 1: Khởi tạo quy trình & Định danh đầu vào" : "Step 1: Initiation and input validation",
          desc: isVi ? "Kiểm tra tính hợp lệ của tài liệu và kích hoạt luồng tác nghiệp." : "Validate input data and initiate execution flow."
        }
      ],
      governance: isVi ? "Tuân thủ phân quyền RBAC và phê duyệt cấp quản lý." : "Governed by RBAC policy and executive sign-off."
    });
    setMode("composer");
  };

  const handleDuplicateSop = (sop) => {
    const duplicated = {
      ...sop,
      id: `${sop.id}-COPY`,
      code: `${sop.code}-COPY`,
      title: `${sop.title} (Bản sao)`,
      status: "draft",
      statusLabel: isVi ? "Bản nháp" : "Draft",
      updatedAt: isVi ? "Vừa xong" : "Just now"
    };
    setSopList((prev) => [duplicated, ...prev]);
    showToast(isVi ? `Đã nhân bản ${sop.code} thành bản nháp mới!` : `Duplicated ${sop.code} into a new draft!`);
  };

  const handleDeleteSop = (id) => {
    setSopList((prev) => prev.filter((s) => s.id !== id));
    showToast(isVi ? `Đã xóa quy trình ${id} khỏi hệ thống.` : `Deleted procedure ${id}.`);
  };

  const handlePublishSop = () => {
    // Update or add in sopList
    setSopList((prev) => {
      const idx = prev.findIndex((s) => s.id === composerData.id);
      const updatedItem = {
        id: composerData.id,
        code: composerData.id,
        title: composerData.title,
        desc: composerData.purpose.slice(0, 80) + "...",
        dept: composerData.dept,
        status: "published",
        statusLabel: isVi ? "Đã xuất bản" : "Published",
        version: composerData.version,
        updatedAt: isVi ? "Vừa xong" : "Just now",
        author: currentUser?.name || (isVi ? "Trưởng ban Pháp chế" : "Legal Lead"),
        tags: composerData.tags.split(",").map((t) => t.trim())
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedItem;
        return copy;
      }
      return [updatedItem, ...prev];
    });
    showToast(isVi ? `✓ Đã xuất bản ${composerData.id} làm Ground-Truth cho AI Copilot!` : `✓ Published ${composerData.id} as Ground-Truth for AI Copilot!`);
    setMode("list");
  };

  const handleSaveDraft = () => {
    showToast(isVi ? `Đã lưu bản nháp ${composerData.id} vào Cloud Database!` : `Saved draft for ${composerData.id} into Cloud Database!`);
  };

  const handleAiCoWriter = () => {
    const nextNum = composerData.steps.length + 1;
    const aiStep = {
      num: nextNum,
      title: isVi
        ? `Bước ${nextNum}: Giám sát Tuân thủ & Báo cáo Tác nghiệp Định kỳ`
        : `Step ${nextNum}: Compliance Audit & Routine Shift Reporting`,
      desc: isVi
        ? "AI Copilot tự động đối chiếu dữ liệu giao dịch thực tế qua Neo4j và tổng hợp KPI báo cáo lãnh đạo theo chu kỳ hàng tuần."
        : "AI Copilot reconciles realized transactions via Neo4j and synthesizes executive shift briefings weekly."
    };
    setComposerData((prev) => ({
      ...prev,
      steps: [...prev.steps, aiStep]
    }));
    showToast(isVi ? "AI Co-writer đã đề xuất thêm bước quy trình mới!" : "AI Co-writer generated next SOP workflow step!");
  };

  // Filtered list
  const filteredList = sopList.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.dept.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (deptFilter !== "ALL" && item.dept !== deptFilter) return false;
    return true;
  });

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
      {/* SCREEN-017: SOP MANAGEMENT LIST VIEW */}
      {/* ========================================================================= */}
      {mode === "list" ? (
        <div className="space-y-5">
          {/* Header with Scope Banner */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-wider">
                  SCREEN-017
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-surface-container-highest text-on-surface text-xs font-bold">
                  BR-04 Scope
                </span>
              </div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                {isVi ? "Quy trình & Quy chuẩn Nội bộ (SOP Knowledge Base)" : "Internal SOP Rules & Guidelines"}
              </h1>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {isVi
                  ? "Quản trị các tài liệu quy trình chuẩn (Standard Operating Procedures) làm ground-truth cho Agent Copilot."
                  : "Curate Standard Operating Procedures (SOPs) acting as ground-truth rulebook for Agent Copilot."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewSop}
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-file-circle-plus text-[16px]"></i>
                <span>{isVi ? "+ Tạo mới SOP (SCREEN-017a)" : "+ Compose SOP"}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search SOP Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-on-surface-variant text-[14px]"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? "Tìm theo tên SOP, mã quy trình, phòng ban..." : "Search by SOP title, code, department..."}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border border-outline-variant/30 focus:outline-none"
              >
                <option value="ALL">{isVi ? "Trạng thái: Tất cả" : "Status: All"}</option>
                <option value="published">{isVi ? "Đã xuất bản" : "Published"}</option>
                <option value="draft">{isVi ? "Bản nháp" : "Draft"}</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border border-outline-variant/30 focus:outline-none"
              >
                <option value="ALL">{isVi ? "Phòng ban: Tất cả" : "Dept: All"}</option>
                <option value="Pháp chế">{isVi ? "Pháp chế" : "Legal"}</option>
                <option value="Công nghệ / IT">{isVi ? "Công nghệ / IT" : "Technology & IT"}</option>
                <option value="R&D">{isVi ? "R&D" : "R&D"}</option>
                <option value="AI Ops">{isVi ? "AI Ops" : "AI Ops"}</option>
              </select>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setDeptFilter("ALL");
                }}
                className="p-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors"
                title={isVi ? "Xóa bộ lọc" : "Clear filters"}
              >
                <i className="fa-solid fa-filter-circle-xmark text-[15px]"></i>
              </button>
            </div>
          </div>

          {/* SOP Table List */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container-low font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">{isVi ? "Mã & Tiêu đề Quy trình" : "Code & SOP Title"}</th>
                    <th className="p-4">{isVi ? "Phòng ban" : "Department"}</th>
                    <th className="p-4">{isVi ? "Trạng thái" : "Status"}</th>
                    <th className="p-4">{isVi ? "Cập nhật lần cuối" : "Last Updated"}</th>
                    <th className="p-4 text-right">{isVi ? "Hành động" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low/70 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                            item.dept === "Pháp chế"
                              ? "bg-blue-50 text-primary border-blue-200"
                              : item.dept === "Công nghệ / IT"
                              ? "bg-sky-50 text-tertiary border-sky-200"
                              : item.dept === "R&D"
                              ? "bg-purple-50 text-secondary border-purple-200"
                              : "bg-rose-50 text-error border-rose-200"
                          }`}>
                            <i className={`fa-solid ${
                              item.dept === "Pháp chế"
                                ? "fa-shield-halved"
                                : item.dept === "Công nghệ / IT"
                                ? "fa-terminal"
                                : item.dept === "R&D"
                                ? "fa-rotate"
                                : "fa-triangle-exclamation"
                            } text-[16px]`}></i>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-on-surface-variant text-[11px] mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-semibold text-[11px]">
                          {item.dept}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border font-bold text-[11px] flex items-center gap-1 w-max ${
                          item.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${item.status === "published" ? "bg-emerald-600" : "bg-slate-500"}`}></span>
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="p-4 text-on-surface-variant text-[11px]">
                        <div>{item.updatedAt}</div>
                        <div className="font-semibold text-on-surface">{item.author}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 font-semibold">
                          <button
                            onClick={() => handleEditSop(item)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white border border-outline-variant/30 transition-all text-xs"
                          >
                            {item.status === "draft" ? (isVi ? "Tiếp tục soạn" : "Continue") : (isVi ? "Sửa" : "Edit")}
                          </button>
                          <button
                            onClick={() => setActivePreviewSop(item)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors text-xs text-on-surface"
                          >
                            {isVi ? "Xem" : "View"}
                          </button>
                          <button
                            onClick={() => handleDuplicateSop(item)}
                            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
                            title={isVi ? "Nhân bản" : "Duplicate"}
                          >
                            <i className="fa-regular fa-copy text-[14px]"></i>
                          </button>
                          {item.status === "draft" && (
                            <button
                              onClick={() => handleDeleteSop(item.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                              title={isVi ? "Xóa" : "Delete"}
                            >
                              <i className="fa-solid fa-trash-can text-[14px]"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List Footer Stats */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container flex flex-wrap items-center justify-between text-on-surface-variant text-xs gap-3">
              <span>
                {isVi ? "Hiển thị" : "Showing"}{" "}
                <strong className="text-on-surface">{filteredList.length}</strong> / {sopList.length} {isVi ? "quy trình chuẩn SOP" : "SOP procedures"}
              </span>
              <span className="text-primary font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                {isVi ? "Tất cả SOP đã xuất bản được nhúng vào Hybrid GraphRAG làm Ground-Truth" : "All published SOPs are grounded into Hybrid GraphRAG"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCREEN-017a: SOP COMPOSER & RICH TEXT WORKBENCH */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* Breadcrumb Bar */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <button
              onClick={() => setMode("list")}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
            >
              <i className="fa-solid fa-arrow-left text-[11px]"></i>
              <span>{isVi ? "SOP Nội bộ (SCREEN-017)" : "Back to SOP List"}</span>
            </button>
            <i className="fa-solid fa-chevron-right text-[10px] text-outline"></i>
            <span>{composerData.dept}</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-outline"></i>
            <span className="text-primary font-bold">{composerData.title}</span>
          </nav>

          {/* Metadata Setup Card */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Title Input */}
              <div className="md:col-span-6 space-y-1">
                <label className="font-bold text-xs text-on-surface">
                  {isVi ? "Tiêu đề SOP chuẩn" : "SOP Title"}
                </label>
                <input
                  type="text"
                  value={composerData.title}
                  onChange={(e) => setComposerData({ ...composerData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-base font-bold text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                />
              </div>

              {/* Dept */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-xs text-on-surface">{isVi ? "Phòng ban" : "Department"}</label>
                <select
                  value={composerData.dept}
                  onChange={(e) => setComposerData({ ...composerData, dept: e.target.value })}
                  className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border border-outline-variant/30 focus:outline-none"
                >
                  <option value="Pháp chế">{isVi ? "Pháp chế (Legal)" : "Legal"}</option>
                  <option value="Kinh doanh">{isVi ? "Kinh doanh" : "Sales"}</option>
                  <option value="Công nghệ / IT">{isVi ? "Công nghệ / IT" : "Technology / IT"}</option>
                  <option value="R&D">{isVi ? "R&D" : "R&D"}</option>
                  <option value="AI Ops">{isVi ? "AI Ops" : "AI Ops"}</option>
                </select>
              </div>

              {/* Version */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-xs text-on-surface">{isVi ? "Phiên bản" : "Version"}</label>
                <input
                  type="text"
                  value={composerData.version}
                  onChange={(e) => setComposerData({ ...composerData, version: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs md:text-sm font-semibold text-on-surface border border-outline-variant/30 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-xs text-on-surface">{isVi ? "Thẻ Tag ontology" : "Ontology Tags"}</label>
                <input
                  type="text"
                  value={composerData.tags}
                  onChange={(e) => setComposerData({ ...composerData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs md:text-sm text-on-surface border border-outline-variant/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rich Text Formatting Toolbar & Editor Canvas */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="bg-surface-container px-4 py-2 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-wrap text-xs">
                {/* Text styles */}
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface font-bold px-2">B</button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface italic px-2">I</button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface underline px-2">U</button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface line-through px-2">S</button>
                <span className="inline-block w-px h-5 bg-outline-variant mx-1"></span>

                {/* Headings */}
                <button className="px-2 py-1 rounded-lg hover:bg-surface-container-high text-on-surface font-bold text-xs">H1</button>
                <button className="px-2 py-1 rounded-lg hover:bg-surface-container-high text-on-surface font-bold text-xs">H2</button>
                <button className="px-2 py-1 rounded-lg hover:bg-surface-container-high text-on-surface font-bold text-xs">H3</button>
                <span className="inline-block w-px h-5 bg-outline-variant mx-1"></span>

                {/* Lists */}
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Bullet List">
                  <i className="fa-solid fa-list-ul text-[14px]"></i>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Numbered List">
                  <i className="fa-solid fa-list-ol text-[14px]"></i>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Checklist">
                  <i className="fa-solid fa-list-check text-[14px]"></i>
                </button>
                <span className="inline-block w-px h-5 bg-outline-variant mx-1"></span>

                {/* Inserts */}
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Bảng biểu">
                  <i className="fa-solid fa-table text-[14px]"></i>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Trích dẫn">
                  <i className="fa-solid fa-quote-left text-[14px]"></i>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Liên kết">
                  <i className="fa-solid fa-link text-[14px]"></i>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface" title="Đính kèm tài liệu tham chiếu">
                  <i className="fa-solid fa-paperclip text-[14px]"></i>
                </button>
              </div>

              {/* AI Assistant Action Button */}
              <button
                onClick={handleAiCoWriter}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow hover:bg-purple-700 transition-all flex items-center gap-1.5"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[13px]"></i>
                <span>{isVi ? "AI Co-writer: Viết tiếp SOP" : "AI Co-writer: Continue"}</span>
              </button>
            </div>

            {/* Writing Canvas Area */}
            <div className="p-8 min-h-[460px] bg-surface-container-lowest space-y-6 text-sm leading-relaxed text-on-surface">
              {/* Section 1 */}
              <div>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  {isVi ? "1. Mục đích và Phạm vi áp dụng" : "1. Purpose and Scope"}
                </h2>
                <textarea
                  rows="3"
                  value={composerData.purpose}
                  onChange={(e) => setComposerData({ ...composerData, purpose: e.target.value })}
                  className="mt-2 w-full p-3 bg-surface-container-low rounded-xl text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* Section 2: Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-surface tracking-tight">
                    {isVi ? "2. Các bước thực hiện chuẩn với GraphMind AI Copilot" : "2. Execution Steps with GraphMind AI"}
                  </h2>
                  <button
                    onClick={handleAiCoWriter}
                    className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[11px]"></i> {isVi ? "Thêm bước" : "Add Step"}
                  </button>
                </div>

                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-4">
                  {composerData.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {step.num}
                      </span>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...composerData.steps];
                            newSteps[idx].title = e.target.value;
                            setComposerData({ ...composerData, steps: newSteps });
                          }}
                          className="w-full font-bold text-sm text-on-surface bg-transparent border-0 focus:ring-0 p-0"
                        />
                        <textarea
                          rows="2"
                          value={step.desc}
                          onChange={(e) => {
                            const newSteps = [...composerData.steps];
                            newSteps[idx].desc = e.target.value;
                            setComposerData({ ...composerData, steps: newSteps });
                          }}
                          className="w-full text-xs text-on-surface-variant bg-transparent border-0 focus:ring-0 p-0 leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Governance */}
              <div>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  {isVi ? "3. Biểu mẫu nghiệm thu và Phân quyền phê duyệt" : "3. Approval Gates & Governance"}
                </h2>
                <textarea
                  rows="3"
                  value={composerData.governance}
                  onChange={(e) => setComposerData({ ...composerData, governance: e.target.value })}
                  className="mt-2 w-full p-3 bg-surface-container-low rounded-xl text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            {/* Sticky Editor Bottom Action Footer */}
            <div className="bg-surface-container-low px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isVi ? "Đã tự động lưu nháp lúc 14:22 (Cloud Auto-save)" : "Auto-saved to Cloud at 14:22"}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMode("list")}
                  className="px-4 py-2 rounded-xl text-xs text-on-surface hover:bg-surface-container font-semibold"
                >
                  {isVi ? "Hủy / Quay lại" : "Cancel"}
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold shadow-2xs transition-colors"
                >
                  {isVi ? "Lưu bản nháp (Draft)" : "Save Draft"}
                </button>
                <button
                  onClick={handlePublishSop}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-[15px]"></i>
                  <span>{isVi ? "Xuất bản SOP cho phòng ban (Publish)" : "Publish SOP"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK SOP PREVIEW MODAL */}
      {/* ========================================================================= */}
      {activePreviewSop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-2xl w-full max-w-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold text-[11px]">
                  {activePreviewSop.code} • {activePreviewSop.version}
                </span>
                <h3 className="text-base font-bold text-on-surface mt-1">{activePreviewSop.title}</h3>
              </div>
              <button
                onClick={() => setActivePreviewSop(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
              >
                <i className="fa-solid fa-xmark text-[16px]"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-on-surface">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="font-bold text-on-surface block mb-1">{isVi ? "Phạm vi & Mô tả:" : "Description:"}</span>
                <p className="text-on-surface-variant">{activePreviewSop.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low rounded-xl">
                  <span className="text-on-surface-variant block">{isVi ? "Phòng ban:" : "Dept:"}</span>
                  <span className="font-bold">{activePreviewSop.dept}</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl">
                  <span className="text-on-surface-variant block">{isVi ? "Trạng thái:" : "Status:"}</span>
                  <span className="font-bold text-emerald-700">{activePreviewSop.statusLabel}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <strong className="block font-bold mb-1">
                  <i className="fa-solid fa-brain mr-1"></i>
                  {isVi ? "Tích hợp GraphRAG Ground-Truth:" : "GraphRAG Ground-Truth Ingestion:"}
                </strong>
                <p>
                  {isVi
                    ? "Tài liệu này đã được đánh chỉ mục và tự động đối chiếu khi AI Copilot phản hồi người dùng về các chính sách, quy trình liên quan."
                    : "This SOP is actively indexed into Neo4j and Qdrant to ground AI Copilot responses."}
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-surface-container">
              <button
                onClick={() => setActivePreviewSop(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold"
              >
                {isVi ? "Đóng" : "Close"}
              </button>
              <button
                onClick={() => {
                  const sop = activePreviewSop;
                  setActivePreviewSop(null);
                  handleEditSop(sop);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-blue-700"
              >
                {isVi ? "Mở trong Trình soạn thảo" : "Open in Composer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
