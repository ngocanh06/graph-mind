/**
 * Graph Mind — Knowledge Explorer (Phase 10)
 * Unified Knowledge Exploration combining Qdrant Vector Search + Neo4j Graph Lookup.
 * Data Flow: Query -> Qdrant Vector Search -> Relevant Documents -> Neo4j Entity Subgraph -> Interactive Inspection.
 */
import React, { useState, useEffect } from "react";
import { searchKnowledgeExplorer, fetchNeo4jNode } from "../../services/api";

const LABEL_COLORS = {
  Product:     { bg: "#f0fdf4", border: "#0d9488", text: "#115e59" },
  Category:    { bg: "#ecfeff", border: "#0891b2", text: "#0e7490" },
  SubCategory: { bg: "#ecfeff", border: "#06b6d4", text: "#0e7490" },
  Customer:    { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e" },
  SalesOrder:  { bg: "#f0fdfa", border: "#2dd4bf", text: "#0f766e" },
  Employee:    { bg: "#f8fafc", border: "#475569", text: "#1e293b" },
  default:     { bg: "#f8fafc", border: "#64748b", text: "#334155" },
};

function getLabelColor(labels = []) {
  for (const lbl of labels) {
    if (LABEL_COLORS[lbl]) return LABEL_COLORS[lbl];
  }
  return LABEL_COLORS.default;
}

export default function KnowledgeExplorerView({ lang = "vi", initialQuery = "Mountain Bikes agreement", embedded = false }) {
  const isVi = lang === "vi";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (searchQ = query) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await searchKnowledgeExplorer(searchQ.trim(), 8);
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
    handleSearch("Mountain Bikes agreement");
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
      height: "100%",
      gap: 14,
      padding: embedded ? "0" : "16px 20px 48px",
      boxSizing: "border-box",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflowX: "hidden"
    }}>
      {/* ── TOP SEARCH BAR ─────────────────────────────────────────────── */}
      <div style={{
        background: "var(--surface, #fff)", padding: "14px 18px", borderRadius: 12,
        border: "1.5px solid var(--border-soft, #e2e8f0)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        width: "100%", boxSizing: "border-box", minWidth: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🌐</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isVi ? "Knowledge Explorer: Hợp nhất Qdrant + Neo4j" : "Knowledge Explorer: Unified Qdrant + Neo4j"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
                {isVi ? "Truy vết đa chiều từ Tìm kiếm Ngữ nghĩa (Qdrant) đến Đồ thị Tri thức Thực thể (Neo4j)" : "Multi-modal reasoning from Semantic Vector Search to Relational Knowledge Graph"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "#ede9fe", color: "#6d28d9", fontWeight: 700 }}>
              Qdrant: 9,140 vectors
            </span>
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "#e0f2fe", color: "#0369a1", fontWeight: 700 }}>
              Neo4j: 3,484 nodes
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
            placeholder={isVi ? "Nhập câu hỏi hoặc chủ đề (ví dụ: Mountain Bikes agreement, confidentiality, sales orders...)" : "Enter topic or query..."}
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
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)",
              color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer",
              flexShrink: 0
            }}
          >
            {loading ? "⏳..." : "🔍 Explore"}
          </button>
        </div>

        {/* Preset chips */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", flexShrink: 0 }}>
            {isVi ? "Gợi ý khám phá:" : "Presets:"}
          </span>
          {[
            "Mountain Bikes agreement",
            "confidentiality agreement",
            "termination of employment",
            "Road Bikes supplier warranty",
            "governing law and jurisdiction"
          ].map(p => (
            <button
              key={p}
              onClick={() => { setQuery(p); handleSearch(p); }}
              style={{
                padding: "3px 10px", borderRadius: 12, border: "1px solid var(--border-soft, #cbd5e1)",
                background: "#fff", fontSize: 11.5, cursor: "pointer", color: "var(--text-2, #334155)",
                fontWeight: 600
              }}
            >
              {p}
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
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1)" }}>
              📄 {isVi ? "Kết quả Vector Semantic từ Qdrant" : "Semantic Results from Qdrant"}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              {vectorResults.length} {isVi ? "đoạn trích" : "chunks"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                ⏳ {isVi ? "Đang tính toán vector tương đồng..." : "Searching Qdrant vectors..."}
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
                      border: `1.5px solid ${isSelected ? "#7c3aed" : "var(--border-soft, #e2e8f0)"}`,
                      background: isSelected ? "#f5f3ff" : "var(--bg-subtle, #f8fafc)",
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
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1)" }}>
              🕸️ {isVi ? "Thực thể Quan hệ từ Neo4j" : "Related Entities from Neo4j"}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              {graphNodes.length} nodes · {graphRels.length} rels
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                ⏳ {isVi ? "Đang truy vấn đồ thị thực thể Neo4j..." : "Querying Neo4j subgraph..."}
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
            {isVi ? "Tài liệu Qdrant đang chọn" : "Selected Qdrant Document"}
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
            {isVi ? "Thực thể Neo4j đang chọn" : "Selected Neo4j Entity"}
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
