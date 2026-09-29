import React, { useState } from "react";

export default function DocumentsView({ onNavigate, t, lang, role, currentUser }) {
  const isVi = lang === "vi";
  const isSalesRole = role === "standard";
  const [docFilter, setDocFilter] = useState("ALL");
  const [verifiedDocs, setVerifiedDocs] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const DOCS = isSalesRole ? [] : [
    {
      id: "doc-1",
      name: "Contract_CT-2026-18.pdf",
      type: "PDF",
      source: "Google Drive",
      owner: "Tran M. Anh",
      lastSynced: "09:12",
      status: "Human Verified",
      statusPill: "green",
      risk: "High",
      riskPill: "red",
      size: "2.4 MB",
      entitiesCount: 4,
      entities: [
        { key: isVi ? "Khách hàng" : "Customer", val: "ABC Corporation", type: "customer" },
        { key: isVi ? "Giá trị hợp đồng" : "Contract Value", val: "1.2B VND", type: "financial" },
        { key: isVi ? "Ngày hết hạn" : "Expiration Date", val: "18/10/2026 (12 days left)", type: "risk" },
        { key: isVi ? "Thông báo gia hạn" : "Renewal Notice", val: "30 days prior notice", type: "financial" }
      ],
      previewType: "contract"
    },
    {
      id: "doc-2",
      name: "Orders_Q3_Export.xlsx",
      type: "Sheets",
      source: "Google Sheets",
      owner: "Le V. Hung",
      lastSynced: "09:03",
      status: "AI Extracted",
      statusPill: "cyan",
      risk: "Medium",
      riskPill: "amber",
      size: "890 KB",
      entitiesCount: 6,
      entities: [
        { key: isVi ? "Tổng đơn hàng Q3" : "Total Orders Q3", val: "214 records", type: "financial" },
        { key: isVi ? "Tần suất sụt giảm" : "Cadence Decline", val: "-32% (ABC Corp)", type: "risk" },
        { key: isVi ? "Khách hàng liên kết" : "Linked Customers", val: "ABC Corp, Delta Trading", type: "customer" },
        { key: isVi ? "Doanh số thực tế" : "Realized Revenue", val: "4.8B VND", type: "financial" }
      ],
      previewType: "spreadsheet"
    },
    {
      id: "doc-3",
      name: "Contract_CT-2026-24.pdf",
      type: "PDF",
      source: "Google Drive",
      owner: "Pham Q. Linh",
      lastSynced: isVi ? "Hôm qua" : "Yesterday",
      status: "Needs Review",
      statusPill: "amber",
      risk: "Medium",
      riskPill: "amber",
      size: "1.8 MB",
      entitiesCount: 3,
      entities: [
        { key: isVi ? "Đối tác phân phối" : "Distributor", val: "Delta Trading Ltd", type: "customer" },
        { key: isVi ? "Sản phẩm cung ứng" : "Governed Product", val: "Product B", type: "financial" },
        { key: isVi ? "Ngày hết hạn" : "Expiration Date", val: "24/10/2026", type: "risk" }
      ],
      previewType: "contract_delta"
    },
    {
      id: "doc-4",
      name: "SOP-04_Reconciliation.docx",
      type: "SOP",
      source: "AEGIS Local Agent",
      owner: isVi ? "Chưa xác định" : "Unassigned",
      lastSynced: "08:40",
      status: "Needs Review",
      statusPill: "amber",
      risk: "Low",
      riskPill: "neutral",
      size: "420 KB",
      entitiesCount: 2,
      entities: [
        { key: isVi ? "Phòng ban chủ quản" : "Target Department", val: "Finance & Accounting", type: "customer" },
        { key: isVi ? "Chu kỳ đối soát" : "Reconciliation Cycle", val: "Monthly (Before 5th)", type: "financial" }
      ],
      previewType: "sop"
    }
  ];

  const [selectedDocId, setSelectedDocId] = useState(DOCS.length > 0 ? DOCS[0].id : null);

  const filteredDocs = DOCS.filter((d) => {
    if (docFilter === "ALL") return true;
    return d.type === docFilter;
  });

  const activeDoc = DOCS.find((d) => d.id === selectedDocId) || (DOCS.length > 0 ? DOCS[0] : null);
  const isDocVerified = activeDoc ? (verifiedDocs[activeDoc.id] || activeDoc.status === "Human Verified") : false;

  const handleVerifyCurrentDoc = () => {
    if (!activeDoc) return;
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    showToast(isVi ? `Đã xác thực toàn bộ thực thể của ${activeDoc.name} vào Đồ thị Tri thức!` : `Verified extractions from ${activeDoc.name} committed to Knowledge Graph!`);
  };

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-square-check text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="section-label">
            {isSalesRole
              ? (isVi ? "Kho Hợp Đồng & Báo Giá Doanh Nghiệp" : "Enterprise Contracts & Quotes Repository")
              : (t.docs_title || (isVi ? "Khám phá Tài liệu & Trích xuất Tri thức" : "Document Explorer & Extraction Workbench"))}
          </div>
          <div className="section-sub">
            {isSalesRole
              ? (isVi ? "Tra cứu hợp đồng cung ứng, phụ lục giá bán, lịch sử đơn hàng và đối soát tài khoản khách hàng." : "Inspect supply contracts, pricing addendums, order ledgers, and customer reconciliation records.")
              : (t.docs_sub || (isVi ? "Thu nạp tệp đa định dạng, soi chiếu thực thể gắn thẻ và quy trình xác thực HITL" : "Multi-modal file ingestion, in-situ entity highlighting, and human verification loop"))}
          </div>
        </div>

        <div className="flex items-center gap-space-xs">
          {["ALL", "PDF", "Sheets", "SOP"].map((f) => (
            <button
              key={f}
              onClick={() => setDocFilter(f)}
              className={`px-space-sm py-space-2xs rounded-DEFAULT font-label-caps text-label-caps transition-colors ${
                docFilter === f
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENT TABLE */}
      <div className="panel bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="doc-table w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container text-outline font-label-caps text-label-caps uppercase">
                <th className="p-space-sm">{isVi ? "Tài liệu" : "Document"}</th>
                <th className="p-space-sm">{isVi ? "Định dạng" : "Type"}</th>
                <th className="p-space-sm">{isVi ? "Nguồn thu nạp" : "Source"}</th>
                <th className="p-space-sm">{isVi ? "Chủ quản" : "Owner"}</th>
                <th className="p-space-sm">{isVi ? "Đồng bộ" : "Last Synced"}</th>
                <th className="p-space-sm">{isVi ? "Trạng thái Tri thức" : "Knowledge Status"}</th>
                <th className="p-space-sm">{isVi ? "Rủi ro" : "Risk"}</th>
                <th className="p-space-sm">{isVi ? "Thao tác" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-space-xl text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-space-xs py-space-xl">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline/40 mb-space-2xs">
                        <i className="fa-regular fa-folder-open text-xl"></i>
                      </div>
                      <span className="font-semibold text-on-surface text-body-md">
                        {isVi ? "Kho tài liệu hợp đồng & báo giá đang trống" : "Document repository is empty"}
                      </span>
                      <span className="font-body-sm text-outline max-w-[420px]">
                        {isVi
                          ? "Chưa có tài liệu nào được đồng bộ hoặc phân công cho chuyên viên này. Hệ thống sẵn sàng tiếp nhận tài liệu mới."
                          : "No documents have been synced or assigned to this specialist. Workspace is ready for document ingestion."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  const isItemVerified = verifiedDocs[doc.id] || doc.status === "Human Verified";

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`cursor-pointer border-b border-outline-variant/10 transition-colors ${
                        isSelected ? "bg-surface-container-high font-semibold" : "hover:bg-surface-container/50"
                      }`}
                    >
                      <td className="dt-name p-space-sm flex items-center gap-space-xs text-on-surface">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-primary shrink-0">
                          {doc.type === "Sheets" ? (
                            <>
                              <rect x="3" y="4" width="18" height="16" rx="1.5"/>
                              <path d="M3 10h18M9 4v16"/>
                            </>
                          ) : (
                            <path d="M7 3h7l4 4v14H7z"/>
                          )}
                        </svg>
                        <span className="truncate max-w-[260px]">{doc.name}</span>
                      </td>
                      <td className="p-space-sm font-mono text-outline">{doc.type}</td>
                      <td className="p-space-sm text-on-surface-variant">{doc.source}</td>
                      <td className="p-space-sm text-on-surface-variant">{doc.owner}</td>
                      <td className="p-space-sm mono text-outline">{doc.lastSynced}</td>
                      <td className="p-space-sm">
                        <span className={`pill ${isItemVerified ? "green" : doc.statusPill} uppercase font-bold text-[10px]`}>
                          {isItemVerified ? (isVi ? "ĐÃ XÁC THỰC" : "HUMAN VERIFIED") : doc.status}
                        </span>
                      </td>
                      <td className="p-space-sm">
                        <span className={`pill ${doc.riskPill} uppercase font-bold text-[10px]`}>
                          {doc.risk}
                        </span>
                      </td>
                      <td className="p-space-sm text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                            showToast(isVi ? `Đang mở bản xem trước của ${doc.name}` : `Opening inspector for ${doc.name}`);
                          }}
                          className={`btn sm ${isSelected ? "primary" : ""}`}
                          style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "5px" }}
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

      {/* DOCUMENT PREVIEW & ENTITY EXTRACTION INSPECTOR */}
      {!activeDoc ? (
        <div className="panel bg-surface-container-low p-space-xl rounded-lg border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-space-sm py-12 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline/40 mb-space-xs">
            <i className="fa-regular fa-file-lines text-2xl"></i>
          </div>
          <span className="font-title-sm text-title-sm font-bold text-on-surface">
            {isVi ? "Chưa có tài liệu được chọn để xem trước" : "No document selected for preview"}
          </span>
          <span className="font-body-sm text-outline max-w-[460px] leading-relaxed">
            {isVi
              ? "Kho tài liệu hiện chưa có hồ sơ. Khi có tài liệu tải lên hoặc đồng bộ từ Google Drive/Sheets, bạn có thể xem trước nội dung và xác thực thực thể trích xuất tại đây."
              : "Repository is currently empty. Uploaded or synchronized documents from cloud sources will appear here for in-situ preview and knowledge extraction."}
          </span>
          <div className="flex items-center gap-space-xs mt-space-sm">
            <button
              onClick={() => onNavigate("search")}
              className="btn sm"
            >
              <i className="fa-solid fa-arrow-left mr-1"></i>
              {isVi ? "Quay lại Bàn Làm Việc" : "Back to Workspace"}
            </button>
            <button
              onClick={() => onNavigate("copilot")}
              className="btn sm primary"
            >
              <i className="fa-solid fa-robot mr-1"></i>
              {isVi ? "Mở Trợ Lý Copilot" : "Open Copilot"}
            </button>
          </div>
        </div>
      ) : (
        <div className="pdf-preview grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          {/* LEFT PREVIEW CONTAINER (Col 7) */}
          <div className="lg:col-span-7 panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-outline-variant/20">
              <div className="flex items-center gap-space-xs">
                <i className="fa-solid fa-file-lines text-primary text-[18px]"></i>
                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                  {activeDoc.name}
                </span>
              </div>

              {/* In-text Highlighting Legend */}
              <div className="legend flex items-center gap-space-xs flex-wrap">
                <span><span className="hl customer">{isVi ? "Thực thể Khách hàng" : "Customer Entity"}</span></span>
                <span><span className="hl financial">{isVi ? "Dữ liệu Tài chính" : "Financial Data"}</span></span>
                <span><span className="hl risk">{isVi ? "Điều khoản Rủi ro" : "Risk Clause"}</span></span>
              </div>
            </div>

            {/* DYNAMIC DOCUMENT CONTENT */}
            <div className="pdf-page bg-surface-container-lowest p-space-md rounded-DEFAULT border border-outline-variant/20 font-body-sm leading-relaxed text-on-surface min-h-[220px]">
              {activeDoc.previewType === "contract" && (
                <>
                  <div className="font-bold text-center text-primary mb-space-sm uppercase tracking-wider">
                    MASTER SUPPLY AGREEMENT — CT-2026-18
                  </div>
                  This agreement is entered into between Company X and{" "}
                  <span className="hl customer">ABC Corporation</span>, a manufacturing entity registered under the laws of Vietnam.<br /><br />
                  Section 2.1 — Contract valuation is established at{" "}
                  <span className="hl financial">1.2B VND</span>, payable in quarterly installments upon verified milestone delivery.<br /><br />
                  Section 4.2 — Term & Termination: This agreement shall remain binding until its{" "}
                  <span className="hl risk">mandatory expiration on 18/10/2026 (12 days remaining)</span>, at which point renewal outreach must be completed no later than{" "}
                  <span className="hl financial">30 days prior notice</span>.
                </>
              )}

              {activeDoc.previewType === "spreadsheet" && (
                <>
                  <div className="font-bold text-center text-primary mb-space-sm uppercase tracking-wider">
                    ORDER FULFILLMENT CADENCE LEDGER — Q3 EXPORT
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body-sm border border-outline-variant/20">
                      <thead className="bg-surface-container">
                        <tr>
                          <th className="p-1">Date</th>
                          <th className="p-1">Account</th>
                          <th className="p-1">Volume</th>
                          <th className="p-1">Revenue</th>
                          <th className="p-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1">12/09</td>
                          <td className="p-1"><span className="hl customer">ABC Corporation</span></td>
                          <td className="p-1"><span className="hl risk">5.4 units/mo (-32%)</span></td>
                          <td className="p-1"><span className="hl financial">420M VND</span></td>
                          <td className="p-1 text-green-500">Delivered</td>
                        </tr>
                        <tr>
                          <td className="p-1">08/09</td>
                          <td className="p-1"><span className="hl customer">Delta Trading Ltd</span></td>
                          <td className="p-1">2.8 units/mo</td>
                          <td className="p-1"><span className="hl financial">290M VND</span></td>
                          <td className="p-1 text-green-500">Delivered</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeDoc.previewType === "contract_delta" && (
                <>
                  <div className="font-bold text-center text-primary mb-space-sm uppercase tracking-wider">
                    COMMERCIAL DISTRIBUTION AGREEMENT — CT-2026-24
                  </div>
                  Parties: Company X and <span className="hl customer">Delta Trading Ltd</span>.<br /><br />
                  Scope: Exclusive territorial distribution rights for{" "}
                  <span className="hl financial">Product B (Enterprise Logistics Edition)</span>.<br /><br />
                  Notice clause: Renewal review required by <span className="hl risk">24/10/2026</span>.
                </>
              )}

              {activeDoc.previewType === "sop" && (
                <>
                  <div className="font-bold text-center text-primary mb-space-sm uppercase tracking-wider">
                    STANDARD OPERATING PROCEDURE — RECONCILIATION (SOP-04)
                  </div>
                  1. Purpose: Governs quarterly accounts receivable and invoicing audits for the{" "}
                  <span className="hl customer">Finance & Accounting Department</span>.<br /><br />
                  2. Mandatory cycle: All transactions exceeding 500M VND require dual executive signoff within{" "}
                  <span className="hl financial">5 business days</span> of period close.<br /><br />
                  3. Audit Finding: <span className="hl risk">Department author signature is currently missing</span> from document header.
                </>
              )}
            </div>
          </div>

          {/* RIGHT EXTRACTED ENTITIES CARD (Col 5) */}
          <div className="lg:col-span-5 panel bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20 mb-space-sm">
                <div className="font-title-sm text-title-sm font-bold text-on-surface">
                  {isVi ? "Thực thể Tri thức Đã trích xuất" : "Extracted Entity Triples"}
                </div>
                <span className="font-code-sm text-code-sm text-primary font-bold">
                  {activeDoc.entities?.length || 0} {isVi ? "THỰC THỂ" : "ENTITIES"}
                </span>
              </div>

              <div className="flex flex-col gap-space-xs mb-space-md">
                {activeDoc.entities?.map((ent, idx) => (
                  <div
                    key={idx}
                    className="prop-row flex items-center justify-between p-space-xs bg-surface-container rounded-DEFAULT border border-outline-variant/10"
                  >
                    <span className="p-key font-label-caps text-label-caps text-outline uppercase font-semibold">
                      {ent.key}
                    </span>
                    <span className={`p-val font-code-sm text-code-sm font-bold ${
                      ent.type === "risk" ? "text-error" : ent.type === "financial" ? "text-primary" : "text-on-surface"
                    }`}>
                      {ent.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="entity-actions flex flex-col gap-space-xs pt-space-xs border-t border-outline-variant/20">
              <button
                onClick={handleVerifyCurrentDoc}
                className={`btn primary w-full text-center font-bold ${isDocVerified ? "!bg-green-600 !text-white" : ""}`}
              >
                {isDocVerified ? (isVi ? "✓ Đã xác thực & Đồng bộ vào Đồ thị" : "✓ Verified & Committed to Graph") : (isVi ? "Xác thực Toàn bộ Thực thể (HITL)" : "Verify All Extractions (HITL)")}
              </button>

              <div className="flex items-center justify-between gap-space-xs">
                <button
                  onClick={() => {
                    if (isSalesRole) {
                      onNavigate("search");
                    } else {
                      onNavigate("knowledge");
                    }
                  }}
                  className="btn sm flex-1 text-center"
                >
                  {isSalesRole ? (isVi ? "Tác Nghiệp Khách Hàng" : "Client Operations") : (isVi ? "Mở Đồ thị Tri thức" : "View in Graph")}
                </button>
                <button
                  onClick={() => onNavigate("copilot")}
                  className="btn sm flex-1 text-center"
                >
                  {isVi ? "Hỏi Copilot" : "Query Copilot"}
                </button>
                <button
                  onClick={() => showToast(isVi ? `Đang xuất & tải xuống ${activeDoc.name}...` : `Downloading ${activeDoc.name}...`)}
                  className="btn sm"
                  title={isVi ? "Tải xuống tài liệu" : "Download document"}
                >
                  <i className="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
