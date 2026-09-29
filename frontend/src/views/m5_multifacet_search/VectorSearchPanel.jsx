/**
 * Graph Mind — Qdrant Vector Search Panel
 * Browse collections, scroll points, and keyword-search across payloads.
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
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: connected ? "#dcfce7" : "#fef3c7",
      color: connected ? "#15803d" : "#92400e",
      border: `1px solid ${connected ? "#86efac" : "#fcd34d"}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: connected ? "#22c55e" : "#f59e0b",
        display: "inline-block",
      }} />
      {connected ? "Qdrant Live" : "Qdrant Offline"}
    </span>
  );
}

function CollectionCard({ col, isSelected, onClick }) {
  return (
    <div
      onClick={() => onClick(col)}
      style={{
        padding: "10px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 6,
        border: `2px solid ${isSelected ? "#8b5cf6" : "#e2e8f0"}`,
        background: isSelected ? "#f5f3ff" : "var(--bg-card,#fff)",
        transition: "all .15s",
        boxShadow: isSelected ? "0 0 0 3px #8b5cf633" : "none",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary,#1e293b)" }}>
        📦 {col.name}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted,#64748b)", marginTop: 3 }}>
        {col.points_count != null && <>{col.points_count?.toLocaleString()} points</>}
        {col.vector_size && <> · dim {col.vector_size}</>}
        {col.distance && <> · {col.distance}</>}
        {col.status && <> · {col.status}</>}
      </div>
    </div>
  );
}

function PointCard({ point, index }) {
  const [expanded, setExpanded] = useState(false);
  const payload = point.payload || {};
  const previewKey = Object.keys(payload).find(k =>
    ["title", "name", "content", "text", "description"].includes(k)
  );
  const preview = previewKey ? String(payload[previewKey]).slice(0, 100) : null;

  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, marginBottom: 8,
      border: "1.5px solid var(--border,#e2e8f0)",
      background: "var(--bg-card,#fff)",
    }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
            background: "#ede9fe", color: "#6d28d9", marginRight: 8,
          }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary,#1e293b)" }}>
            ID: {point.id}
          </span>
          {point.score != null && (
            <span style={{
              marginLeft: 8, fontSize: 11, padding: "1px 6px", borderRadius: 4,
              background: "#dcfce7", color: "#166534", fontWeight: 600,
            }}>
              score: {point.score.toFixed(4)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted,#64748b)" }}>
          {expanded ? "▲" : "▼"} {Object.keys(payload).length} fields
        </span>
      </div>
      {preview && !expanded && (
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted,#64748b)", fontStyle: "italic" }}>
          {preview}{String(payload[previewKey]).length > 100 ? "..." : ""}
        </div>
      )}
      {expanded && (
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 8 }}>
          <tbody>
            {Object.entries(payload).map(([k, v]) => (
              <tr key={k} style={{ borderBottom: "1px solid var(--border,#e2e8f0)" }}>
                <td style={{ padding: "4px 4px", color: "var(--text-muted,#64748b)", fontWeight: 600, verticalAlign: "top", whiteSpace: "nowrap", paddingRight: 12 }}>
                  {k}
                </td>
                <td style={{ padding: "4px 4px", color: "var(--text-primary,#1e293b)", wordBreak: "break-all" }}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function VectorSearchPanel({ lang = "en" }) {
  const isVi = lang === "vi";

  const [status, setStatus] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [points, setPoints] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "search"

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
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
    // Auto-select first collection
    if (!selectedCollection && colList.length > 0) {
      setSelectedCollection(colList[0]);
    }
  }, [selectedCollection]);

  useEffect(() => { loadStatus(); }, []);

  const loadPoints = useCallback(async (col, offset = 0) => {
    if (!col) return;
    setPointsLoading(true);
    const res = await fetchQdrantPoints(col.name, BROWSE_LIMIT, offset);
    setPoints(res?.data || []);
    setBrowseOffset(offset);
    setPointsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      loadPoints(selectedCollection, 0);
    }
  }, [selectedCollection, loadPoints]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearched(true);
    const res = await searchQdrant(searchQuery, selectedCollection?.name, searchLimit);
    setSearchResults(res?.data || []);
    setSearchLoading(false);
  };

  const connected = status?.connected ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary,#1e293b)" }}>
              {isVi ? "Tìm kiếm Vector Qdrant" : "Qdrant Vector Search"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted,#64748b)" }}>
              {status?.host || "localhost"}:{status?.port || 6333}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge connected={connected} />
          {connected && (
            <span style={{ fontSize: 11, color: "var(--text-muted,#64748b)" }}>
              {collections.length} {isVi ? "collections" : "collections"}
            </span>
          )}
          <button
            onClick={loadStatus}
            style={{
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "var(--bg-subtle,#f1f5f9)", fontSize: 12, fontWeight: 600,
              color: "var(--text-primary,#1e293b)",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {!connected && (
        <div style={{
          padding: "12px 16px", borderRadius: 12,
          background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e", fontSize: 13,
        }}>
          ⚠️ {isVi
            ? "Qdrant chưa kết nối. Kiểm tra QDRANT_HOST và QDRANT_PORT trong file .env, sau đó khởi động lại backend."
            : "Qdrant is not connected. Check QDRANT_HOST and QDRANT_PORT in your .env file, then restart the backend."}
        </div>
      )}

      {/* Main content: two-column layout */}
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left: collection list */}
        <div style={{
          width: 220, flexShrink: 0, overflowY: "auto",
          borderRight: "1.5px solid var(--border,#e2e8f0)", paddingRight: 12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted,#64748b)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            {isVi ? "Collections" : "Collections"}
          </div>
          {collections.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted,#64748b)", textAlign: "center", padding: 16 }}>
              {isVi ? "Chưa có collection nào." : "No collections found."}
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

        {/* Right: tabs + content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--border,#e2e8f0)", marginBottom: 12 }}>
            {[
              { key: "browse", label: isVi ? "Duyệt Points" : "Browse Points" },
              { key: "search", label: isVi ? "Tìm kiếm" : "Keyword Search" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: "none",
                  color: activeTab === tab.key ? "#8b5cf6" : "var(--text-muted,#64748b)",
                  borderBottom: activeTab === tab.key ? "2px solid #8b5cf6" : "2px solid transparent",
                  marginBottom: -2,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Browse tab */}
          {activeTab === "browse" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted,#64748b)" }}>
                  {selectedCollection
                    ? `${isVi ? "Collection" : "Collection"}: ${selectedCollection.name} (${selectedCollection.points_count ?? "?"} points)`
                    : isVi ? "Chọn collection ở bên trái" : "Select a collection on the left"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    disabled={browseOffset === 0 || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, Math.max(0, browseOffset - BROWSE_LIMIT))}
                    style={{
                      padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--border,#e2e8f0)",
                      background: "var(--bg-subtle,#f8fafc)", cursor: "pointer", fontSize: 12,
                    }}
                  >← Prev</button>
                  <button
                    disabled={points.length < BROWSE_LIMIT || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, browseOffset + BROWSE_LIMIT)}
                    style={{
                      padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--border,#e2e8f0)",
                      background: "var(--bg-subtle,#f8fafc)", cursor: "pointer", fontSize: 12,
                    }}
                  >Next →</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {pointsLoading ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted,#64748b)" }}>
                    ⏳ {isVi ? "Đang tải..." : "Loading..."}
                  </div>
                ) : points.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted,#64748b)", fontSize: 13 }}>
                    {isVi ? "Không có points nào." : "No points found."}
                  </div>
                ) : points.map((p, i) => (
                  <PointCard key={p.id || i} point={p} index={browseOffset + i} />
                ))}
              </div>
            </div>
          )}

          {/* Search tab */}
          {activeTab === "search" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder={isVi ? "Nhập từ khoá để tìm trong payload..." : "Search by keyword in payloads..."}
                  style={{
                    flex: 1, padding: "9px 14px", borderRadius: 10,
                    border: "1.5px solid var(--border,#e2e8f0)", fontSize: 13,
                    background: "var(--bg-subtle,#f8fafc)", color: "var(--text-primary,#1e293b)",
                    outline: "none",
                  }}
                />
                <select
                  value={searchLimit}
                  onChange={e => setSearchLimit(Number(e.target.value))}
                  style={{
                    padding: "9px 10px", borderRadius: 10, border: "1.5px solid var(--border,#e2e8f0)",
                    background: "var(--bg-subtle,#f8fafc)", fontSize: 13, cursor: "pointer",
                    color: "var(--text-primary,#1e293b)",
                  }}
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>Top {n}</option>)}
                </select>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !connected}
                  style={{
                    padding: "9px 18px", borderRadius: 10, border: "none",
                    background: connected ? "#8b5cf6" : "#cbd5e1",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: connected ? "pointer" : "not-allowed",
                  }}
                >
                  {searchLoading ? "..." : "🔍 Search"}
                </button>
              </div>

              {!searched ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted,#64748b)", fontSize: 13,
                }}>
                  {isVi ? "Nhập từ khoá và nhấn Search hoặc Enter." : "Enter a keyword and press Search or Enter."}
                </div>
              ) : searchLoading ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted,#64748b)" }}>
                  ⏳ {isVi ? "Đang tìm kiếm..." : "Searching..."}
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted,#64748b)", marginBottom: 8 }}>
                    {searchResults.length} {isVi ? "kết quả cho" : "results for"} <b>"{searchQuery}"</b>
                    {selectedCollection && <> {isVi ? "trong" : "in"} <b>{selectedCollection.name}</b></>}
                  </div>
                  {searchResults.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted,#64748b)", fontSize: 13 }}>
                      {isVi ? "Không tìm thấy kết quả nào." : "No results found."}
                    </div>
                  ) : searchResults.map((p, i) => (
                    <PointCard key={p.id || i} point={p} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
