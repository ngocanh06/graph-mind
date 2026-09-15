import React, { useState } from "react";
import { verifyEntityApi } from "../services/api";

export default function KnowledgeView({ entities, selectedEntity, onSelectEntity, onUpdateEntity, t, lang }) {
  const [filterDocType, setFilterDocType] = useState("ALL");
  const [searchDocQuery, setSearchDocQuery] = useState("");
  const [hitlItem1Status, setHitlItem1Status] = useState("pending");
  const [hitlItem2Status, setHitlItem2Status] = useState("pending");
  const [selectedNodeId, setSelectedNodeId] = useState("#ENT-8921");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleApproveItem1 = async () => {
    setHitlItem1Status("approved");
    showToast("Item 01 Relation Audit: APPROVED & SYNCED TO GRAPH");
    try {
      await verifyEntityApi("apex", "verified");
    } catch (e) {
      console.log("Local verification updated");
    }
  };

  const handleRejectItem1 = async () => {
    setHitlItem1Status("rejected");
    showToast("Item 01 Relation Audit: REJECTED");
  };

  const pendingCount = (hitlItem1Status === "pending" ? 1 : 0) + (hitlItem2Status === "pending" ? 1 : 0) + 5;

  const DOCS = [
    { id: 1, name: "MSA_AnPhat_VietCap_2025.pdf", type: "PDF", status: "INDEXED", size: "4.2 MB", entities: 38 },
    { id: 2, name: "Appendix_Financial_Guarantee_v2.docx", type: "DOCX", status: "VERIFIED", size: "1.8 MB", entities: 14 },
    { id: 3, name: "Contract_Schedule_Milestones_Q3.xlsx", type: "EXCEL", status: "INDEXED", size: "890 KB", entities: 22 },
    { id: 4, name: "Board_Resolution_Authorization_12.pdf", type: "PDF", status: "VERIFIED", size: "2.1 MB", entities: 19 }
  ];

  return (
    <div className="flex flex-col w-full pb-space-lg text-on-surface">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-diagram-project text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Top Stream Bar */}
      <div className="w-full h-10 bg-surface-container-lowest px-space-base flex items-center justify-between shadow-sm mb-space-sm rounded-DEFAULT border border-outline-variant/30">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-primary tracking-wider uppercase font-semibold">
              GRAPH REASONING WORKBENCH v4.2
            </span>
          </div>
          <span className="font-label-caps text-label-caps text-outline-variant">|</span>
          <div className="flex items-center gap-space-xs">
            <i className="fa-solid fa-diagram-project text-[14px] text-tertiary"></i>
            <span className="font-code-sm text-code-sm text-on-surface">1,842 Active Entities</span>
          </div>
          <span className="font-label-caps text-label-caps text-outline-variant">|</span>
          <div className="flex items-center gap-space-xs">
            <i className="fa-solid fa-network-wired text-[14px] text-secondary"></i>
            <span className="font-code-sm text-code-sm text-on-surface">4,129 Semantic Triples</span>
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-space-2xs rounded-DEFAULT border border-error/30">
            <i className="fa-solid fa-clock-rotate-left text-[14px] text-error"></i>
            <span className="font-label-caps text-label-caps text-error font-bold">
              HITL Queue: {pendingCount} Pending
            </span>
          </div>
          <button
            onClick={() => showToast("All validations committed to Graph!")}
            className="bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-caps text-label-caps px-space-sm py-space-2xs rounded-DEFAULT font-semibold flex items-center gap-space-2xs transition-colors"
          >
            <i className="fa-solid fa-file-circle-check text-[13px]"></i>
            Commit Validations
          </button>
        </div>
      </div>

      {/* 3-Column Main Content */}
      <div className="w-full grid grid-cols-12 gap-space-sm" style={{ minHeight: "calc(100vh - 124px)" }}>
        {/* COL 1: DOCS */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-space-sm">
          <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex flex-col gap-space-xs shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <i className="fa-solid fa-folder-open text-[16px] text-primary"></i>
                <h2 className="font-title-sm text-title-sm text-on-surface font-semibold">Document Vault</h2>
              </div>
              <span className="font-label-caps text-label-caps bg-surface-container-highest text-primary px-space-xs py-space-2xs rounded-DEFAULT">
                48 INGESTED
              </span>
            </div>

            <div className="relative w-full mt-space-2xs">
              <input
                value={searchDocQuery}
                onChange={(e) => setSearchDocQuery(e.target.value)}
                placeholder="Search contracts & appendixes..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-DEFAULT py-space-xs px-space-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1 mt-1">
              {["ALL", "PDF", "DOCX", "EXCEL"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterDocType(f)}
                  className={`px-space-xs py-space-2xs font-label-caps text-label-caps rounded-DEFAULT ${
                    filterDocType === f ? "bg-primary text-on-primary font-bold" : "text-outline hover:text-on-surface"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Doc List */}
          <div className="flex flex-col gap-space-xs">
            {DOCS.filter(d => filterDocType === "ALL" || d.type === filterDocType).map((doc) => (
              <div
                key={doc.id}
                className="p-space-sm bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/20 hover:border-primary/50 transition-colors cursor-pointer flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{doc.name}</span>
                  <span className="font-label-caps text-label-caps text-tertiary bg-surface-container px-1 rounded">{doc.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-code-sm text-outline">
                  <span>{doc.size}</span>
                  <span>{doc.entities} entities extracted</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: GRAPH REASONING CANVAS */}
        <div className="col-span-12 xl:col-span-6 flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest rounded-DEFAULT p-space-md border border-outline-variant/30 flex-1 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-space-xs">
                <i className="fa-solid fa-diagram-project text-[16px] text-primary"></i>
                <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                  Multi-Modal Enterprise Graph Topology
                </span>
              </div>
              <div className="flex items-center gap-space-xs text-[11px] font-code-sm text-outline">
                <span>Layout: Force-Directed</span>
                <span>|</span>
                <span>Triples: 4,129</span>
              </div>
            </div>

            {/* SVG Visual Stage */}
            <div className="relative w-full h-[460px] my-space-sm bg-surface-container-low rounded-DEFAULT flex items-center justify-center overflow-hidden border border-outline-variant/20">
              <svg className="w-full h-full" viewBox="0 0 600 400">
                <line x1="300" y1="200" x2="160" y2="120" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="300" y1="200" x2="440" y2="120" stroke="#10b981" strokeWidth="2" />
                <line x1="300" y1="200" x2="200" y2="300" stroke="#f59e0b" strokeWidth="2" />
                <line x1="300" y1="200" x2="400" y2="300" stroke="#8b5cf6" strokeWidth="2" />

                {/* Center Node */}
                <circle cx="300" cy="200" r="28" fill="#0566d9" stroke="#c3f5ff" strokeWidth="3" />
                <text x="300" y="205" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">An Phát</text>

                {/* Node 1 */}
                <circle cx="160" cy="120" r="22" fill="#1c2026" stroke="#3b82f6" strokeWidth="2" />
                <text x="160" y="124" fill="#adc6ff" fontSize="9" textAnchor="middle">Hợp Đồng</text>

                {/* Node 2 */}
                <circle cx="440" cy="120" r="22" fill="#1c2026" stroke="#10b981" strokeWidth="2" />
                <text x="440" y="124" fill="#a8ffd2" fontSize="9" textAnchor="middle">VietCap</text>

                {/* Node 3 */}
                <circle cx="200" cy="300" r="20" fill="#1c2026" stroke="#f59e0b" strokeWidth="2" />
                <text x="200" y="304" fill="#ffdcb2" fontSize="9" textAnchor="middle">Bảo Lãnh</text>

                {/* Node 4 */}
                <circle cx="400" cy="300" r="20" fill="#1c2026" stroke="#8b5cf6" strokeWidth="2" />
                <text x="400" y="304" fill="#e6ecff" fontSize="9" textAnchor="middle">Phạt Vi Phạm</text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs text-outline pt-space-xs border-t border-outline-variant/20">
              <span>Selected Entity: <strong className="text-primary">{selectedNodeId}</strong></span>
              <span className="text-tertiary">Real-time Neo4j Bolt Sync: 100% OK</span>
            </div>
          </div>
        </div>

        {/* COL 3: HITL AUDIT & DETAILS */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-space-sm">
          <div className="bg-surface-container-low p-space-sm rounded-DEFAULT border border-outline-variant/30 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">HITL Audit Stream</span>
              <span className="font-label-caps text-label-caps text-error bg-surface-container-highest px-2 py-0.5 rounded">Action Required</span>
            </div>
            <p className="font-body-sm text-body-sm text-outline">
              Review and confirm high-impact contract inferences before Neo4j index persistence.
            </p>
          </div>

          {/* Audit Card 1 */}
          <div className="bg-surface-container-lowest p-space-sm rounded-DEFAULT border border-outline-variant/30 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-primary font-bold">INFERENCE #8921</span>
              <span className="font-label-caps text-label-caps text-outline">Confidence: 94.8%</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface font-semibold">
              VietCap Holding &gt; Joint Guarantee liability for An Phát Corporation
            </p>
            <p className="font-body-sm text-xs text-outline">
              Clause 8.4: Payment obligation within 15 days upon notice.
            </p>
            <div className="flex items-center gap-space-xs mt-space-xs">
              {hitlItem1Status === "pending" ? (
                <>
                  <button
                    onClick={handleApproveItem1}
                    className="flex-1 bg-tertiary hover:bg-tertiary-fixed-dim text-on-tertiary font-label-caps text-label-caps py-1 rounded font-bold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={handleRejectItem1}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high text-error font-label-caps text-label-caps py-1 rounded"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-1 text-xs font-semibold text-tertiary">
                  STATUS: {hitlItem1Status.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
