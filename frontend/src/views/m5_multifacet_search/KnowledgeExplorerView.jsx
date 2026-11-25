/**
 * Graph Mind — Knowledge Explorer (Phase 10)
 * Unified Knowledge Exploration combining Qdrant Vector Search + Neo4j Graph Lookup.
 * Data Flow: Query -> Qdrant Vector Search -> Relevant Documents -> Neo4j Entity Subgraph -> Interactive Inspection.
 */
import React, { useState, useEffect } from "react";
import { searchKnowledgeExplorer, fetchNeo4jNode } from "../../services/api";

const LABEL_COLORS = {
  Category:    { bg: "#eff6ff", border: "#2563eb", text: "#1e40af" },
  SubCategory: { bg: "#f0f9ff", border: "#0284c7", text: "#075985" },
  Product:     { bg: "#ecfdf5", border: "#059669", text: "#065f46" },
  Customer:    { bg: "#fffbeb", border: "#d97706", text: "#b45309" },
  SalesOrder:  { bg: "#fff7ed", border: "#ea580c", text: "#9a3412" },
  Contract:    { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" },
  Clause:      { bg: "#f0fdfa", border: "#0d9488", text: "#115e59" },
  Employee:    { bg: "#f8fafc", border: "#475569", text: "#1e293b" },
  default:     { bg: "#f8fafc", border: "#64748b", text: "#334155" },
};

function getLabelColor(labels = []) {
  for (const lbl of labels) {
    if (LABEL_COLORS[lbl]) return LABEL_COLORS[lbl];
  }
  return LABEL_COLORS.default;
}

export default function KnowledgeExplorerView({ lang = "vi", initialQuery = null, embedded = false, currentUser = null }) {
  const isVi = lang === "vi";
  const defaultQ = initialQuery || (isVi ? "Hợp đồng dịch vụ bảo trì" : "Mountain Bikes agreement");

  const [query, setQuery] = useState(defaultQ);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (searchQ = query) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await searchKnowledgeExplorer(searchQ.trim(), 8, currentUser);
    setData(res || null);
    if (res?.vector_results?.length > 0) {
      setSelectedResult(res.vector_results[0]);
    }
    if (res?.graph?.nodes?.length > 0) {
      setSelectedEntity(res.graph.nodes[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    handleSearch(defaultQ);
  }, []);

  const handleSelectNode = async (node) => {
    setSelectedEntity(node);
    const detail = await fetchNeo4jNode(node._id);
    if (detail?.data) {
      setSelectedEntity(prev => ({ ...prev, ...detail.data }));
    }
  };

  const vectorResults = data?.vector_results || [];
  const graphNodes = data?.graph?.nodes || [];
  const graphRels = data?.graph?.relationships || [];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: embedded ? "auto" : "100%",
      minHeight: embedded ? "600px" : undefined,
      gap: 14,
      padding: embedded ? "0" : "16px 20px 48px",
      boxSizing: "border-box",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0
    }}>
      {/* ── TOP SEARCH BAR ─────────────────────────────────────────────── */}
      <div style={{
        background: "var(--surface, #fff)", padding: "14px 18px", borderRadius: 12,
        border: "1.5px solid var(--border-soft, #e2e8f0)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        width: "100%", boxSizing: "border-box", minWidth: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: "rgba(2, 132, 199, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0284c7", flexShrink: 0
            }}>
              <i className="fa-solid fa-circle-nodes" style={{ fontSize: 17 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isVi ? "Hợp Nhất GraphRAG: Đối Chiếu Vector & Đồ Thị" : "GraphRAG Studio: Unified Vector & Graph"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
                {isVi ? "Minh chứng kỹ thuật GraphRAG: Đối chiếu đồng thời Bằng chứng Ngữ nghĩa và Mạng lưới Thực thể" : "Technical verification of GraphRAG: Grounding Semantic Vector Chunks with Knowledge Graph Entities"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "#e0f2fe", color: "#0369a1", fontWeight: 700 }}>
              {isVi ? "Vector: 9,140" : "Qdrant: 9,140 vectors"}
            </span>
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "#f0fdf4", color: "#166534", fontWeight: 700 }}>
              {isVi ? "Đồ thị: 3,484 nút" : "Neo4j: 3,484 nodes"}
            </span>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={isVi ? "Nhập câu hỏi hoặc chủ đề tra cứu..." : "Enter topic or query..."}
            style={{
              flex: 1, minWidth: "240px", padding: "10px 16px", borderRadius: 10,
              border: "1.5px solid var(--border-soft, #cbd5e1)", fontSize: 13.5,
              background: "var(--bg-subtle, #f8fafc)", color: "var(--text-1, #0f172a)",
              outline: "none"
            }}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: loading ? "wait" : "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 13 }} />
                <span>{isVi ? "Đang tìm..." : "Searching..."}</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 13 }} />
                <span>{isVi ? "Khám phá" : "Explore"}</span>
              </>
            )}
          </button>
        </div>

        {/* Preset chips */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", flexShrink: 0 }}>
            {isVi ? "Gợi ý khám phá:" : "Presets:"}
          </span>
          {(isVi ? [
            { label: "Hợp đồng dịch vụ bảo trì", query: "Hợp đồng dịch vụ bảo trì" },
            { label: "Xe đạp thể thao Mountain", query: "Xe đạp thể thao" },
            { label: "Thỏa thuận bảo mật thông tin", query: "Bảo mật thông tin" },
            { label: "Điều khoản bồi thường thiệt hại", query: "Bồi thường thiệt hại" },
            { label: "Khách hàng Roger Harui", query: "Roger Harui" }
          ] : [
            { label: "Service Agreement", query: "Service Agreement" },
            { label: "Mountain Bikes", query: "Mountain Bikes" },
            { label: "Confidentiality Agreement", query: "Confidentiality Agreement" },
            { label: "Indemnity & Liability", query: "Indemnity and liability" },
            { label: "Roger Harui (VIP)", query: "Roger Harui" }
          ]).map(p => (
            <button
              key={p.label}
              onClick={() => { setQuery(p.query); handleSearch(p.query); }}
              style={{
                padding: "3px 10px", borderRadius: 12, border: "1px solid var(--border-soft, #cbd5e1)",
                background: "#fff", fontSize: 11.5, cursor: "pointer", color: "var(--text-2, #334155)",
                fontWeight: 600
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN WORKSPACE: QDRANT (LEFT) + NEO4J (RIGHT) ─────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
        gap: 14,
        flex: 1,
        minHeight: 440,
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box"
      }}>
        {/* LEFT: Qdrant Search Results */}
        <div style={{
          background: "var(--surface, #fff)", borderRadius: 12,
          border: "1.5px solid var(--border-soft, #e2e8f0)", padding: 14,
          display: "flex", flexDirection: "column", minHeight: 0,
          minWidth: 0, overflow: "hidden", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-file-contract" style={{ color: "#0284c7", fontSize: 14 }} />
              <span>{isVi ? "Bằng chứng Ngữ nghĩa Vector" : "Semantic Evidence Chunks (Qdrant)"}</span>
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              {vectorResults.length} {isVi ? "đoạn trích" : "chunks"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--blue)" }} />
                <span>{isVi ? "Đang tính toán vector tương đồng..." : "Searching Qdrant vectors..."}</span>
              </div>
            ) : vectorResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                {isVi ? "Không có kết quả vector phù hợp." : "No vector results."}
              </div>
            ) : (
              vectorResults.map((item, idx) => {
                const isSelected = selectedResult?.id === item.id;
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedResult(item)}
                    style={{
                      padding: 10, borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isSelected ? "#0284c7" : "var(--border-soft, #e2e8f0)"}`,
                      background: isSelected ? "#f0f9ff" : "var(--bg-subtle, #f8fafc)",
                      transition: "all 0.15s",
                      minWidth: 0,
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8, minWidth: 0 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 12, color: "var(--text-1)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1, minWidth: 0
                      }}>
                        #{idx + 1} {item.contract_name || "Contract Document"}
                      </span>
                      {item.score != null && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
                          background: item.score > 0.8 ? "#dcfce7" : "#e0f2fe",
                          color: item.score > 0.8 ? "#15803d" : "#0369a1",
                          flexShrink: 0
                        }}>
                          score: {item.score.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-2, #334155)", lineHeight: 1.45, fontStyle: "italic", wordBreak: "break-word" }}>
                      {item.text ? (item.text.slice(0, 160) + "...") : "No text excerpt"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Neo4j Graph Subgraph */}
        <div style={{
          background: "var(--surface, #fff)", borderRadius: 12,
          border: "1.5px solid var(--border-soft, #e2e8f0)", padding: 14,
          display: "flex", flexDirection: "column", minHeight: 0,
          minWidth: 0, overflow: "hidden", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-circle-nodes" style={{ color: "#059669", fontSize: 14 }} />
              <span>{isVi ? "Mạng lưới Thực thể từ Đồ thị (Neo4j)" : "Knowledge Graph Entities (Neo4j)"}</span>
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              {graphNodes.length} {isVi ? "nút" : "nodes"} · {graphRels.length} {isVi ? "quan hệ" : "rels"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--blue)" }} />
                <span>{isVi ? "Đang truy vấn đồ thị thực thể Neo4j..." : "Querying Neo4j subgraph..."}</span>
              </div>
            ) : graphNodes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                {isVi ? "Không tìm thấy thực thể liên quan." : "No related entities found."}
              </div>
            ) : (
              graphNodes.map(node => {
                const c = getLabelColor(node._labels);
                const isSelected = selectedEntity?._id === node._id;
                return (
                  <div
                    key={node._id}
                    onClick={() => handleSelectNode(node)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isSelected ? c.border : "var(--border-soft, #e2e8f0)"}`,
                      background: isSelected ? c.bg : "var(--surface, #fff)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 8, minWidth: 0, overflow: "hidden"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, overflow: "hidden" }}>
                      <span style={{
                        padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                        flexShrink: 0
                      }}>
                        {node._labels?.[0] || "Entity"}
                      </span>
                      <span style={{
                        fontWeight: 700, fontSize: 12.5, color: "var(--text-1)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1, minWidth: 0
                      }}>
                        {node.name || node.title || node._id}
                      </span>
                    </div>
                    {node.ListPrice != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", flexShrink: 0 }}>
                        ${node.ListPrice}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: COMBINED INSPECTOR PANEL ──────────────────────────── */}
      <div style={{
        background: "var(--surface, #fff)", borderRadius: 12,
        border: "1.5px solid var(--border-soft, #e2e8f0)", padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: 16, minHeight: 160,
        minWidth: 0, width: "100%", boxSizing: "border-box"
      }}>
        {/* Left: Selected Document / Qdrant Chunk Detail */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)" }}>
            {isVi ? "Chi tiết Đoạn trích Đang chọn" : "Selected Document Details"}
          </div>
          {selectedResult ? (
            <div style={{ marginTop: 6, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 14, color: "var(--text-1)", marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {selectedResult.contract_name || "Contract Document"}
              </div>
              <div style={{
                fontSize: 11.5, color: "var(--text-3)", marginBottom: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                Point ID: <span style={{ fontFamily: "monospace" }}>{selectedResult.id}</span> · Chunk #{selectedResult.chunk_id} · Similarity: {selectedResult.score}
              </div>
              <div style={{
                maxHeight: 90, overflowY: "auto", fontSize: 11.5, color: "var(--text-2)",
                lineHeight: 1.5, background: "var(--bg-subtle, #f8fafc)", padding: 8, borderRadius: 6,
                wordBreak: "break-word"
              }}>
                {selectedResult.text || "No full text available."}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-3)", padding: 15 }}>
              {isVi ? "Chưa chọn tài liệu nào." : "No document selected."}
            </div>
          )}
        </div>

        {/* Right: Selected Neo4j Entity Detail */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)" }}>
            {isVi ? "Chi tiết Thực thể Đang chọn" : "Selected Entity Details"}
          </div>
          {selectedEntity ? (
            <div style={{ marginTop: 6, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 14, color: "var(--text-1)", marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {selectedEntity.name || selectedEntity._id}
              </div>
              <div style={{
                fontSize: 11.5, color: "var(--text-3)", marginBottom: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                Labels: {selectedEntity._labels?.join(", ")} · Neo4j ID: <span style={{ fontFamily: "monospace" }}>{selectedEntity._id}</span>
              </div>
              {/* Properties row */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 90, overflowY: "auto" }}>
                {Object.entries(selectedEntity)
                  .filter(([k]) => !["_id", "_labels", "neighbors", "name", "properties"].includes(k))
                  .map(([k, v]) => (
                    <div key={k} style={{
                      fontSize: 11, background: "var(--bg-subtle, #f8fafc)", padding: "3px 8px",
                      borderRadius: 4, border: "1px solid #e2e8f0", maxWidth: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      <span style={{ color: "var(--text-3)" }}>{k}: </span>
                      <b>{String(v ?? "")}</b>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-3)", padding: 15 }}>
              {isVi ? "Chưa chọn thực thể nào." : "No entity selected."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
