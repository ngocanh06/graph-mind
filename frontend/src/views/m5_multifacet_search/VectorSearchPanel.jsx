/**
 * Graph Mind — Qdrant Vector Search Panel
 * Browse collections, scroll points, and execute live semantic vector searches with cosine similarity.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  fetchQdrantStatus,
  fetchQdrantCollections,
  fetchQdrantPoints,
  searchQdrant,
} from "../../services/api";

function StatusBadge({ connected }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: connected ? "#dcfce7" : "#fee2e2",
      color: connected ? "#15803d" : "#b91c1c",
      border: `1px solid ${connected ? "#86efac" : "#fca5a5"}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: connected ? "#22c55e" : "#ef4444",
        display: "inline-block",
      }} />
      {connected ? "Qdrant Live" : "Offline"}
    </span>
  );
}

function CollectionCard({ col, isSelected, onClick }) {
  return (
    <div
      onClick={() => onClick(col)}
      style={{
        padding: "10px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 6,
        border: `2px solid ${isSelected ? "#8b5cf6" : "var(--border-soft, #e2e8f0)"}`,
        background: isSelected ? "#f5f3ff" : "var(--surface, #fff)",
        transition: "all .15s",
        boxShadow: isSelected ? "0 0 0 3px rgba(139,92,246,0.15)" : "none",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1, #1e293b)" }}>
        📦 {col.name}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", marginTop: 3 }}>
        {col.points_count != null && <>{col.points_count?.toLocaleString()} points</>}
        {col.vector_size && <> · dim {col.vector_size}</>}
        {col.distance && <> · {col.distance}</>}
        {col.status && <> · {col.status}</>}
      </div>
    </div>
  );
}

function PointCard({ point, index, onExploreRelated, isVi }) {
  const [expanded, setExpanded] = useState(false);
  const payload = point.payload || {};
  const contractName = point.contract_name || payload.contract_name || "Contract Document";
  const chunkId = point.chunk_id ?? payload.chunk_id;
  const textContent = point.text || payload.text || "";

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10, marginBottom: 8,
      border: "1.5px solid var(--border-soft, #e2e8f0)",
      background: "var(--surface, #fff)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
              background: "#ede9fe", color: "#6d28d9",
            }}>
              #{index + 1}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1, #0f172a)" }}>
              📄 {contractName}
            </span>
            {chunkId != null && (
              <span style={{ fontSize: 11, color: "var(--text-3, #64748b)", background: "var(--bg-subtle, #f1f5f9)", padding: "1px 6px", borderRadius: 4 }}>
                chunk #{chunkId}
              </span>
            )}
            {point.score != null && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 12,
                background: point.score > 0.8 ? "#dcfce7" : "#e0f2fe",
                color: point.score > 0.8 ? "#15803d" : "#0369a1",
                fontWeight: 800,
              }}>
                Cosine Score: {point.score.toFixed(4)}
              </span>
            )}
          </div>

          {/* Text preview */}
          {textContent && (
            <div style={{
              fontSize: 12, color: "var(--text-2, #334155)", lineHeight: 1.5,
              marginTop: 6, fontStyle: expanded ? "normal" : "italic",
              background: "var(--bg-subtle, #f8fafc)", padding: "8px 10px", borderRadius: 6
            }}>
              {expanded ? textContent : (textContent.slice(0, 180) + (textContent.length > 180 ? "..." : ""))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-soft, #cbd5e1)",
              background: "var(--surface, #fff)", cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: "var(--text-2, #334155)"
            }}
          >
            {expanded ? "▲ Thu gọn" : "▼ Chi tiết"}
          </button>
          {onExploreRelated && (
            <button
              onClick={() => onExploreRelated(point)}
              title={isVi ? "Xem đồ thị Neo4j liên quan đến tài liệu này" : "View related Neo4j graph"}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "none",
                background: "#0284c7", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700
              }}
            >
              🕸️ Graph
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border-soft, #e2e8f0)", paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3, #64748b)", marginBottom: 4 }}>
            Point ID: <span style={{ fontFamily: "monospace" }}>{point.id}</span>
          </div>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(payload).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid var(--border-soft, #f1f5f9)" }}>
                  <td style={{ padding: "4px 4px", color: "var(--text-3, #64748b)", fontWeight: 600, verticalAlign: "top", whiteSpace: "nowrap", width: "25%" }}>
                    {k}
                  </td>
                  <td style={{ padding: "4px 4px", color: "var(--text-1, #0f172a)", wordBreak: "break-all" }}>
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VectorSearchPanel({ lang = "vi", onExploreRelated = null }) {
  const isVi = lang === "vi";

  const [status, setStatus] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [points, setPoints] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search"); // "search" | "browse"

  // Search state
  const [searchQuery, setSearchQuery] = useState("agreement liability indemnification");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLimit, setSearchLimit] = useState(10);
  const [searched, setSearched] = useState(false);

  // Browse state
  const [browseOffset, setBrowseOffset] = useState(0);
  const BROWSE_LIMIT = 20;

  const loadStatus = useCallback(async () => {
    const [st, cols] = await Promise.all([
      fetchQdrantStatus(),
      fetchQdrantCollections(),
    ]);
    setStatus(st?.data || null);
    const colList = cols?.data || [];
    setCollections(colList);
    if (!selectedCollection && colList.length > 0) {
      setSelectedCollection(colList[0]);
    }
  }, [selectedCollection]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loadPoints = useCallback(async (col, offset = 0) => {
    if (!col) return;
    setPointsLoading(true);
    const res = await fetchQdrantPoints(col.name, BROWSE_LIMIT, offset);
    setPoints(res?.data || []);
    setBrowseOffset(offset);
    setPointsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCollection && activeTab === "browse") {
      loadPoints(selectedCollection, 0);
    }
  }, [selectedCollection, activeTab, loadPoints]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearched(true);
    const res = await searchQdrant(searchQuery, selectedCollection?.name, searchLimit);
    setSearchResults(res?.results || res?.data || []);
    setSearchLoading(false);
  };

  const connected = status?.connected ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", background: "var(--surface, #fff)" }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-soft, #e2e8f0)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "#fff", fontSize: 18
          }}>
            🔮
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1, #0f172a)", display: "flex", alignItems: "center", gap: 8 }}>
              {isVi ? "Qdrant Vector Search (Dữ liệu Thực tế)" : "Qdrant Vector Search (Live Data)"}
              <StatusBadge connected={connected} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
              {status?.host || "localhost"}:{status?.port || 6333} · Collection: <b>{status?.activeCollection || "cuad_contracts"}</b> ({status?.pointsCount?.toLocaleString() || 0} vectors)
            </div>
          </div>
        </div>

        <button
          onClick={loadStatus}
          style={{
            padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border-soft, #cbd5e1)",
            background: "var(--surface-raised, #f8fafc)", fontSize: 12, fontWeight: 600,
            color: "var(--text-1, #0f172a)", cursor: "pointer"
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── TWO-COLUMN WORKSPACE ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 480 }}>
        {/* Left: Collections */}
        <div style={{
          width: 220, flexShrink: 0, overflowY: "auto",
          borderRight: "1.5px solid var(--border-soft, #e2e8f0)", paddingRight: 12
        }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, color: "var(--text-3, #64748b)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Collections ({collections.length})
          </div>
          {collections.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", textAlign: "center", padding: 16 }}>
              {isVi ? "Không có collection." : "No collections found."}
            </div>
          ) : collections.map((col, i) => (
            <CollectionCard
              key={col.name || i}
              col={col}
              isSelected={selectedCollection?.name === col.name}
              onClick={setSelectedCollection}
            />
          ))}
        </div>

        {/* Right: Search / Browse Tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Sub-tab switcher */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--border-soft, #e2e8f0)", marginBottom: 12 }}>
            {[
              { key: "search", label: isVi ? "🔍 Tìm kiếm Vector (Semantic)" : "🔍 Semantic Vector Search" },
              { key: "browse", label: isVi ? "📂 Duyệt Points thực tế" : "📂 Browse Live Points" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: "none",
                  color: activeTab === tab.key ? "#7c3aed" : "var(--text-3, #64748b)",
                  borderBottom: activeTab === tab.key ? "2px solid #7c3aed" : "2px solid transparent",
                  marginBottom: -2,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Tab */}
          {activeTab === "search" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder={isVi ? "Nhập câu hỏi hoặc từ khoá ngữ nghĩa..." : "Enter semantic query to search vectors..."}
                  style={{
                    flex: 1, padding: "9px 14px", borderRadius: 10,
                    border: "1.5px solid var(--border-soft, #cbd5e1)", fontSize: 13,
                    background: "var(--bg-subtle, #f8fafc)", color: "var(--text-1, #0f172a)",
                    outline: "none",
                  }}
                />
                <select
                  value={searchLimit}
                  onChange={e => setSearchLimit(Number(e.target.value))}
                  style={{
                    padding: "9px 10px", borderRadius: 10, border: "1.5px solid var(--border-soft, #cbd5e1)",
                    background: "var(--bg-subtle, #f8fafc)", fontSize: 13, cursor: "pointer",
                    color: "var(--text-1, #0f172a)",
                  }}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !connected}
                  style={{
                    padding: "9px 20px", borderRadius: 10, border: "none",
                    background: connected ? "#7c3aed" : "#cbd5e1",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: connected ? "pointer" : "not-allowed",
                  }}
                >
                  {searchLoading ? "⏳..." : "🔍 Vector Search"}
                </button>
              </div>

              {/* Sample queries chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Gợi ý:</span>
                {[
                  "confidentiality agreement",
                  "termination notice clause",
                  "governing law english",
                  "payment terms and audit rights"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); }}
                    style={{
                      padding: "2px 8px", borderRadius: 12, border: "1px solid #cbd5e1",
                      background: "#fff", fontSize: 11, cursor: "pointer", color: "var(--text-2)"
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Search Results */}
              {!searched ? (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  color: "var(--text-3, #64748b)", fontSize: 13, padding: 40
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔮</div>
                  <div>{isVi ? "Nhập truy vấn và nhấn 'Vector Search' để thực hiện tìm kiếm tương đồng trên Qdrant." : "Enter a query to run cosine similarity vector search on live Qdrant."}</div>
                </div>
              ) : searchLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3, #64748b)" }}>
                  ⏳ {isVi ? "Đang tính toán vector embedding và truy vấn Qdrant..." : "Embedding query and querying Qdrant..."}
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", marginBottom: 8 }}>
                    {searchResults.length} {isVi ? "kết quả tìm thấy từ Qdrant cho" : "results returned from Qdrant for"} <b>"{searchQuery}"</b>
                  </div>
                  {searchResults.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 30, color: "var(--text-3, #64748b)", fontSize: 13 }}>
                      {isVi ? "Không tìm thấy kết quả nào." : "No vector matches found."}
                    </div>
                  ) : searchResults.map((p, i) => (
                    <PointCard
                      key={p.id || i}
                      point={p}
                      index={i}
                      onExploreRelated={onExploreRelated}
                      isVi={isVi}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Browse Tab */}
          {activeTab === "browse" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
                  {selectedCollection
                    ? `${selectedCollection.name} · offset ${browseOffset} - ${browseOffset + points.length}`
                    : "Select a collection"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    disabled={browseOffset === 0 || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, Math.max(0, browseOffset - BROWSE_LIMIT))}
                    style={{
                      padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--border-soft, #cbd5e1)",
                      background: "var(--surface-raised, #f8fafc)", cursor: "pointer", fontSize: 12,
                    }}
                  >← Prev</button>
                  <button
                    disabled={points.length < BROWSE_LIMIT || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, browseOffset + BROWSE_LIMIT)}
                    style={{
                      padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--border-soft, #cbd5e1)",
                      background: "var(--surface-raised, #f8fafc)", cursor: "pointer", fontSize: 12,
                    }}
                  >Next →</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {pointsLoading ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--text-3, #64748b)" }}>
                    ⏳ {isVi ? "Đang tải points từ Qdrant..." : "Loading points..."}
                  </div>
                ) : points.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--text-3, #64748b)", fontSize: 13 }}>
                    {isVi ? "Không có points nào." : "No points found."}
                  </div>
                ) : points.map((p, i) => (
                  <PointCard
                    key={p.id || i}
                    point={p}
                    index={browseOffset + i}
                    onExploreRelated={onExploreRelated}
                    isVi={isVi}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
