/**
 * Graph Mind — Neo4j Graph Panel
 * Displays live graph data from Neo4j (nodes + relationships).
 * Falls back gracefully to mock data when Neo4j is offline.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { fetchNeo4jStatus, fetchNeo4jGraph, runCypherQuery } from "../../services/api";

// ─── Color map for node labels ─────────────────────────────────────────────────
const LABEL_COLORS = {
  CUSTOMER: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  CONTRACT: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  PRODUCT:  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
  ENTITY:   { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8" },
  Document: { bg: "#ffe4e6", border: "#f43f5e", text: "#9f1239" },
  Person:   { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
  default:  { bg: "#f1f5f9", border: "#64748b", text: "#334155" },
};

function getLabelColor(labels = []) {
  for (const lbl of labels) {
    if (LABEL_COLORS[lbl]) return LABEL_COLORS[lbl];
  }
  return LABEL_COLORS.default;
}

function StatusBadge({ connected, source }) {
  const isLive = connected && source === "neo4j";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: isLive ? "#dcfce7" : "#fef3c7",
      color: isLive ? "#15803d" : "#92400e",
      border: `1px solid ${isLive ? "#86efac" : "#fcd34d"}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: isLive ? "#22c55e" : "#f59e0b",
        display: "inline-block",
      }} />
      {isLive ? "Neo4j Live" : "Mock Data"}
    </span>
  );
}

function NodeCard({ node, isSelected, onClick }) {
  const labels = node._labels || [];
  const name = node.name || node.title || node._id || "Node";
  const color = getLabelColor(labels);
  return (
    <div
      onClick={() => onClick(node)}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: `2px solid ${isSelected ? color.border : "#e2e8f0"}`,
        background: isSelected ? color.bg : "var(--bg-card, #fff)",
        cursor: "pointer",
        marginBottom: 8,
        transition: "all .15s",
        boxShadow: isSelected ? `0 0 0 3px ${color.border}33` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
          background: color.bg, color: color.text, border: `1px solid ${color.border}`,
        }}>
          {labels[0] || "NODE"}
        </span>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary, #1e293b)" }}>
          {name}
        </span>
      </div>
      {node.risk && (
        <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted, #64748b)" }}>
          Risk: <b>{node.risk}</b>
          {node.status && <> · {node.status}</>}
        </div>
      )}
    </div>
  );
}

function RelationshipRow({ rel }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
      borderRadius: 8, background: "var(--bg-subtle, #f8fafc)",
      marginBottom: 5, fontSize: 12,
    }}>
      <span style={{
        fontWeight: 600, color: "var(--text-primary, #1e293b)",
        maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {rel.source?.name || rel.source?.id || "?"}
      </span>
      <span style={{
        padding: "2px 8px", borderRadius: 12, fontSize: 10,
        background: "#e0f2fe", color: "#0369a1", fontWeight: 700, whiteSpace: "nowrap",
      }}>
        {rel.rel_type}
      </span>
      <span style={{
        fontWeight: 600, color: "var(--text-primary, #1e293b)",
        maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {rel.target?.name || rel.target?.id || "?"}
      </span>
    </div>
  );
}

export default function GraphPanel({ lang = "en" }) {
  const isVi = lang === "vi";

  const [status, setStatus] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState("nodes"); // "nodes" | "rels" | "cypher"
  const [cypher, setCypher] = useState("MATCH (n) RETURN n LIMIT 25");
  const [cypherResult, setCypherResult] = useState(null);
  const [cypherLoading, setCypherLoading] = useState(false);
  const [cypherError, setCypherError] = useState("");
  const [nodeLimit, setNodeLimit] = useState(100);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [st, graph] = await Promise.all([
      fetchNeo4jStatus(),
      fetchNeo4jGraph(nodeLimit, nodeLimit * 2),
    ]);
    setStatus(st?.data || null);
    setGraphData(graph?.data ? { ...graph.data, source: graph.source } : null);
    setLoading(false);
  }, [nodeLimit]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRunCypher = async () => {
    if (!cypher.trim()) return;
    setCypherLoading(true);
    setCypherError("");
    const res = await runCypherQuery(cypher);
    if (res === null) {
      setCypherError(isVi ? "Neo4j chưa kết nối hoặc lỗi truy vấn." : "Neo4j not connected or query error.");
      setCypherResult(null);
    } else {
      setCypherResult(res);
    }
    setCypherLoading(false);
  };

  const nodes = graphData?.nodes || [];
  const rels = graphData?.relationships || [];
  const source = graphData?.source || "mock";
  const connected = status?.connected ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🕸️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary, #1e293b)" }}>
              {isVi ? "Đồ thị Tri thức Neo4j" : "Neo4j Knowledge Graph"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
              {status?.uri || "bolt://localhost:7687"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge connected={connected} source={source} />
          {connected && (
            <span style={{ fontSize: 11, color: "var(--text-muted,#64748b)" }}>
              {status.nodeCount ?? 0} nodes · {status.relationshipCount ?? 0} rels
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "var(--bg-subtle,#f1f5f9)", fontSize: 12, fontWeight: 600,
              color: "var(--text-primary,#1e293b)",
            }}
          >
            {loading ? "⏳" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Label summary chips */}
      {status?.labelCounts && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(status.labelCounts).map(([lbl, cnt]) => {
            const c = getLabelColor([lbl]);
            return (
              <span key={lbl} style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: c.bg, color: c.text, border: `1px solid ${c.border}`,
              }}>
                {lbl}: {cnt}
              </span>
            );
          })}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border,#e2e8f0)" }}>
        {[
          { key: "nodes", label: isVi ? `Nodes (${nodes.length})` : `Nodes (${nodes.length})` },
          { key: "rels", label: isVi ? `Quan hệ (${rels.length})` : `Relationships (${rels.length})` },
          { key: "cypher", label: "Cypher Query" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: "none",
              color: activeTab === tab.key ? "#3b82f6" : "var(--text-muted,#64748b)",
              borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted,#64748b)" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          {isVi ? "Đang tải dữ liệu đồ thị..." : "Loading graph data..."}
        </div>
      ) : activeTab === "nodes" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 0, flex: 1 }}>
          {/* Node list */}
          <div style={{ overflowY: "auto", paddingRight: 4 }}>
            {nodes.length === 0 ? (
              <div style={{ color: "var(--text-muted,#64748b)", fontSize: 13, textAlign: "center", padding: 20 }}>
                {isVi ? "Không có nodes nào." : "No nodes found."}
              </div>
            ) : nodes.map((n, i) => (
              <NodeCard
                key={n._id || i}
                node={n}
                isSelected={selectedNode?._id === n._id}
                onClick={setSelectedNode}
              />
            ))}
          </div>

          {/* Node detail */}
          <div style={{
            borderRadius: 12, border: "1.5px solid var(--border,#e2e8f0)",
            background: "var(--bg-card,#fff)", padding: 16, overflowY: "auto",
          }}>
            {selectedNode ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "var(--text-primary,#1e293b)" }}>
                  {selectedNode.name || selectedNode._id}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {(selectedNode._labels || []).map(lbl => {
                    const c = getLabelColor([lbl]);
                    return (
                      <span key={lbl} style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                      }}>{lbl}</span>
                    );
                  })}
                </div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {Object.entries(selectedNode).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: "1px solid var(--border,#e2e8f0)" }}>
                        <td style={{ padding: "5px 4px", color: "var(--text-muted,#64748b)", fontWeight: 600, whiteSpace: "nowrap" }}>{k}</td>
                        <td style={{ padding: "5px 4px", color: "var(--text-primary,#1e293b)", wordBreak: "break-all" }}>
                          {typeof v === "boolean" ? (v ? "✅ true" : "❌ false") : String(v ?? "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted,#64748b)", padding: 30, fontSize: 13 }}>
                {isVi ? "Chọn một node để xem chi tiết" : "Select a node to inspect it"}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "rels" ? (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {rels.length === 0 ? (
            <div style={{ color: "var(--text-muted,#64748b)", fontSize: 13, textAlign: "center", padding: 20 }}>
              {isVi ? "Không có quan hệ nào." : "No relationships found."}
            </div>
          ) : rels.map((r, i) => <RelationshipRow key={i} rel={r} />)}
        </div>
      ) : (
        /* Cypher tab */
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {!connected && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "#fef3c7", border: "1px solid #fcd34d",
              color: "#92400e", fontSize: 13,
            }}>
              ⚠️ {isVi ? "Neo4j chưa kết nối — Cypher query không khả dụng." : "Neo4j not connected — Cypher queries unavailable."}
            </div>
          )}
          <textarea
            value={cypher}
            onChange={e => setCypher(e.target.value)}
            rows={4}
            disabled={!connected}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, resize: "vertical",
              border: "1.5px solid var(--border,#e2e8f0)", fontFamily: "monospace", fontSize: 13,
              background: "var(--bg-subtle,#f8fafc)", color: "var(--text-primary,#1e293b)",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleRunCypher}
            disabled={!connected || cypherLoading}
            style={{
              padding: "9px 20px", borderRadius: 10, border: "none", cursor: connected ? "pointer" : "not-allowed",
              background: connected ? "#3b82f6" : "#cbd5e1", color: "#fff", fontWeight: 700, fontSize: 13,
              alignSelf: "flex-start",
            }}
          >
            {cypherLoading ? "Running..." : "▶ Run Cypher"}
          </button>
          {cypherError && (
            <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fee2e2", borderRadius: 8 }}>
              {cypherError}
            </div>
          )}
          {cypherResult && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted,#64748b)", marginBottom: 6 }}>
                {cypherResult.count} {isVi ? "kết quả" : "results"}
              </div>
              <pre style={{
                background: "var(--bg-subtle,#f1f5f9)", borderRadius: 10, padding: 14,
                fontSize: 11, overflowX: "auto", color: "var(--text-primary,#1e293b)",
                border: "1px solid var(--border,#e2e8f0)", whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
                {JSON.stringify(cypherResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
