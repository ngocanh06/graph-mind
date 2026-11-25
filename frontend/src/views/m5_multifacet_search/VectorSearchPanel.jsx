/**
 * Graph Mind — Qdrant Vector Search Panel
 * Human-centric, intuitive semantic vector exploration with smart cross-collection recommendations.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchQdrantStatus,
  fetchQdrantCollections,
  fetchQdrantPoints,
  searchQdrant,
} from "../../services/api";

const COLLECTION_CONFIG = {
  cuad_contracts: {
    key: "cuad_contracts",
    nameVi: "Hồ sơ Hợp đồng Pháp lý",
    nameEn: "Legal Contracts",
    tagVi: "Hợp đồng & Điều khoản",
    tagEn: "Contracts & Clauses",
    descVi: "9,148 đoạn trích điều khoản: bảo mật, giới hạn trách nhiệm, bồi thường & giải quyết tranh chấp",
    descEn: "9,148 vectors covering liability, indemnity, covenants & governing law",
    icon: "fa-solid fa-file-contract",
    color: "#0284c7",
    bgSoft: "rgba(2, 132, 199, 0.08)",
    borderSoft: "rgba(2, 132, 199, 0.25)",
    defaultQueryVi: "Thỏa thuận bảo mật thông tin",
    defaultQueryEn: "agreement liability indemnification",
    suggestionsVi: [
      "Thỏa thuận bảo mật thông tin",
      "Điều khoản bồi thường thiệt hại",
      "Thông báo chấm dứt hợp đồng",
      "Luật điều chỉnh hợp đồng",
      "Điều khoản thanh toán & kiểm toán"
    ],
    suggestionsEn: [
      "agreement liability indemnification",
      "confidentiality agreement",
      "termination notice clause",
      "governing law and jurisdiction",
      "payment terms and audit rights"
    ]
  },
  adventureworks_entities: {
    key: "adventureworks_entities",
    nameVi: "Dữ liệu Doanh nghiệp & Bán hàng",
    nameEn: "Enterprise Master Data",
    tagVi: "Sản phẩm & Khách hàng",
    tagEn: "Products & Customers",
    descVi: "52,900 thực thể: xe đạp thể thao, phụ tùng, khách hàng VIP & đơn hàng",
    descEn: "52,900 points covering bikes, components, VIP customers & sales orders",
    icon: "fa-solid fa-boxes-stacked",
    color: "#059669",
    bgSoft: "rgba(5, 150, 105, 0.08)",
    borderSoft: "rgba(5, 150, 105, 0.25)",
    defaultQueryVi: "Xe đạp thể thao Mountain",
    defaultQueryEn: "Mountain Bikes",
    suggestionsVi: [
      "Xe đạp thể thao Mountain",
      "Xe đạp đường trường Road",
      "Khách hàng Roger Harui",
      "Phụ tùng Phanh và Bàn đạp",
      "Đơn đặt hàng năm 2014"
    ],
    suggestionsEn: [
      "Mountain Bikes",
      "Road Bikes",
      "Roger Harui",
      "Brakes and Pedals",
      "Sales Orders 2014"
    ]
  }
};

function getCollectionMeta(name) {
  if (COLLECTION_CONFIG[name]) return COLLECTION_CONFIG[name];
  return {
    key: name,
    nameVi: `Bộ sưu tập: ${name}`,
    nameEn: `Collection: ${name}`,
    tagVi: "Vector Collection",
    tagEn: "Vector Collection",
    descVi: "Điểm vector nhúng ngữ nghĩa trong cơ sở dữ liệu Qdrant",
    descEn: "Semantic vector points stored in Qdrant database",
    icon: "fa-solid fa-database",
    color: "#0891b2",
    bgSoft: "rgba(8, 145, 178, 0.08)",
    borderSoft: "rgba(8, 145, 178, 0.25)",
    defaultQuery: "",
    suggestions: []
  };
}

function StatusBadge({ connected, isVi }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: connected ? "#ecfdf5" : "#fee2e2",
      color: connected ? "#059669" : "#dc2626",
      border: `1px solid ${connected ? "#a7f3d0" : "#fca5a5"}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: connected ? "#10b981" : "#ef4444",
        display: "inline-block",
      }} />
      {connected ? (isVi ? "Qdrant Sẵn sàng" : "Qdrant Live") : (isVi ? "Mất kết nối" : "Offline")}
    </span>
  );
}

function CollectionCard({ col, isSelected, onClick, isVi }) {
  const meta = getCollectionMeta(col.name);
  return (
    <div
      onClick={() => onClick(col)}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        cursor: "pointer",
        marginBottom: 8,
        border: `1.5px solid ${isSelected ? meta.color : "var(--border, #e2e8f0)"}`,
        background: isSelected ? meta.bgSoft : "var(--surface, #ffffff)",
        transition: "all 0.15s ease",
        boxShadow: isSelected ? `0 0 0 3px ${meta.borderSoft}` : "0 1px 3px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: isSelected ? meta.color : "var(--surface-2, #f1f5f9)",
          color: isSelected ? "#ffffff" : meta.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, flexShrink: 0
        }}>
          <i className={meta.icon} />
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 12.5,
          color: isSelected ? meta.color : "var(--text-1, #0f172a)",
          lineHeight: 1.3
        }}>
          {isVi ? meta.nameVi : meta.nameEn}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", lineHeight: 1.4 }}>
        <strong style={{ color: "var(--text-2, #334155)" }}>
          {col.points_count != null ? col.points_count.toLocaleString() : "9,148"}
        </strong> {isVi ? "vectors ngữ nghĩa" : "vectors"}
      </div>
    </div>
  );
}

function PointCard({ point, index, onExploreRelated, isVi }) {
  const [expanded, setExpanded] = useState(false);
  const payload = point.payload || {};
  const entityType = payload.entity_type || payload.neo4j_label;
  const rawTitle = payload.name || point.contract_name || payload.contract_name || "Tài liệu hệ thống";
  const cleanTitle = rawTitle.replace(/\.(pdf|txt|docx|csv)$/i, "").replace(/[_-]+/g, " ");
  const chunkId = point.chunk_id ?? payload.chunk_id;
  const textContent = point.text || payload.text || "";
  const scoreVal = point.score != null ? Number(point.score) : null;
  const scorePercent = scoreVal != null ? Math.round(scoreVal * 100) : null;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10, marginBottom: 10,
      border: "1px solid var(--border, #e2e8f0)",
      background: "var(--surface, #ffffff)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
      minWidth: 0,
      width: "100%",
      boxSizing: "border-box",
      transition: "border-color 0.15s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, minWidth: 0, width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6, minWidth: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
              background: "rgba(2, 132, 199, 0.1)", color: "#0284c7", flexShrink: 0
            }}>
              #{index + 1}
            </span>

            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-1, #0f172a)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }} title={rawTitle}>
              <i className={entityType ? "fa-solid fa-boxes-stacked" : "fa-solid fa-file-lines"} style={{ color: entityType ? "#059669" : "#0284c7", fontSize: 13 }} />
              <span>{cleanTitle}</span>
            </span>

            {entityType && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#059669", background: "rgba(5, 150, 105, 0.08)", border: "1px solid rgba(5, 150, 105, 0.2)", padding: "1px 6px", borderRadius: 4 }}>
                {entityType}
              </span>
            )}

            {chunkId != null && (
              <span style={{ fontSize: 10.5, color: "var(--text-3, #64748b)", background: "var(--surface-2, #f1f5f9)", padding: "1px 6px", borderRadius: 4, fontFamily: "var(--f-mono, monospace)" }}>
                đoạn #{chunkId}
              </span>
            )}

            {scorePercent != null && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 12,
                background: scorePercent >= 75 ? "#ecfdf5" : "#f0f9ff",
                color: scorePercent >= 75 ? "#059669" : "#0284c7",
                border: `1px solid ${scorePercent >= 75 ? "#a7f3d0" : "#bae6fd"}`,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4
              }}>
                <i className="fa-solid fa-bullseye" style={{ fontSize: 10 }} />
                <span>{scorePercent}% {isVi ? "tương đồng" : "match"}</span>
              </span>
            )}
          </div>

          {/* Text preview */}
          {textContent && (
            <div style={{
              fontSize: 12.5, color: "var(--text-2, #334155)", lineHeight: 1.55,
              marginTop: 6, fontStyle: expanded ? "normal" : "italic",
              background: "var(--surface-2, #f8fafc)", padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--border-soft, #f1f5f9)",
              wordBreak: "break-word"
            }}>
              {expanded ? textContent : (textContent.slice(0, 220) + (textContent.length > 220 ? "..." : ""))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface, #ffffff)", cursor: "pointer", fontSize: 11.5, fontWeight: 600,
              color: "var(--text-2, #334155)", display: "inline-flex", alignItems: "center", gap: 5,
              whiteSpace: "nowrap"
            }}
          >
            <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} style={{ fontSize: 10 }} />
            <span>{expanded ? (isVi ? "Thu gọn" : "Collapse") : (isVi ? "Xem thêm" : "Details")}</span>
          </button>

          {onExploreRelated && (
            <button
              onClick={() => onExploreRelated(point)}
              title={isVi ? "Xem đồ thị Neo4j liên quan đến tài liệu này" : "View related Neo4j graph"}
              style={{
                padding: "5px 10px", borderRadius: 6, border: "none",
                background: "rgba(2, 132, 199, 0.1)", color: "#0284c7", cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#0284c7";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(2, 132, 199, 0.1)";
                e.currentTarget.style.color = "#0284c7";
              }}
            >
              <i className="fa-solid fa-diagram-project" style={{ fontSize: 11 }} />
              <span>{isVi ? "Đồ thị" : "Graph"}</span>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border-soft, #f1f5f9)", paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3, #64748b)", marginBottom: 6 }}>
            Point ID: <span style={{ fontFamily: "monospace", color: "var(--text-1)" }}>{point.id}</span>
          </div>
          <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(payload).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid var(--border-soft, #f8fafc)" }}>
                  <td style={{ padding: "4px 6px", color: "var(--text-3, #64748b)", fontWeight: 600, verticalAlign: "top", whiteSpace: "nowrap", width: "22%" }}>
                    {k}
                  </td>
                  <td style={{ padding: "4px 6px", color: "var(--text-1, #0f172a)", wordBreak: "break-all" }}>
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
  const [searchQuery, setSearchQuery] = useState(isVi ? "Thỏa thuận bảo mật thông tin" : "agreement liability indemnification");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLimit, setSearchLimit] = useState(10);
  const [searched, setSearched] = useState(false);

  // Browse state
  const [browseOffset, setBrowseOffset] = useState(0);
  const BROWSE_LIMIT = 20;

  const activeMeta = useMemo(() => {
    return getCollectionMeta(selectedCollection?.name || "cuad_contracts");
  }, [selectedCollection]);

  // Determine the "other" collection for cross-collection recommendation
  const otherCollection = useMemo(() => {
    if (!collections || collections.length < 2) return null;
    return collections.find(c => c.name !== selectedCollection?.name) || null;
  }, [collections, selectedCollection]);

  const otherMeta = useMemo(() => {
    return otherCollection ? getCollectionMeta(otherCollection.name) : null;
  }, [otherCollection]);

  const loadStatus = useCallback(async () => {
    const [st, cols] = await Promise.all([
      fetchQdrantStatus(),
      fetchQdrantCollections(),
    ]);
    setStatus(st?.data || null);
    const colList = cols?.data || [];
    setCollections(colList);

    // Prefer cuad_contracts by default so contract queries yield immediate results
    if (!selectedCollection && colList.length > 0) {
      const preferred = colList.find(c => c.name === "cuad_contracts") || colList[0];
      setSelectedCollection(preferred);
      const meta = getCollectionMeta(preferred.name);
      const defQ = (isVi ? meta.defaultQueryVi : meta.defaultQueryEn) || meta.defaultQuery;
      if (defQ) {
        setSearchQuery(defQ);
      }
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

  const handleSearch = async (queryOverride, collectionOverride) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!q) return;
    setSearchLoading(true);
    setSearched(true);
    const targetCol = collectionOverride || selectedCollection?.name || "cuad_contracts";
    const res = await searchQdrant(q, targetCol, searchLimit);
    setSearchResults(res?.results || res?.data || []);
    setSearchLoading(false);
  };

  const handleSwitchCollection = (col) => {
    setSelectedCollection(col);
    const meta = getCollectionMeta(col.name);
    // If switching to ERP and query is contract-oriented, or vice versa, adapt default
    const isSwitchingToErp = col.name === "adventureworks_entities";
    const isContractQuery = /agreement|liability|indemnification|clause|contract/i.test(searchQuery);
    const isErpQuery = /bike|order|customer|brakes|pedal|roger/i.test(searchQuery);

    let nextQ = searchQuery;
    if (isSwitchingToErp && isContractQuery) {
      nextQ = (isVi ? meta.defaultQueryVi : meta.defaultQueryEn) || meta.defaultQuery || (isVi ? "Xe đạp thể thao Mountain" : "Mountain Bikes");
      setSearchQuery(nextQ);
    } else if (!isSwitchingToErp && isErpQuery) {
      nextQ = (isVi ? meta.defaultQueryVi : meta.defaultQueryEn) || meta.defaultQuery || (isVi ? "Thỏa thuận bảo mật thông tin" : "agreement liability indemnification");
      setSearchQuery(nextQ);
    }

    handleSearch(nextQ, col.name);
  };

  useEffect(() => {
    if (selectedCollection && !searched && activeTab === "search") {
      handleSearch();
    }
  }, [selectedCollection]);

  const connected = status?.connected ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", background: "var(--surface, #ffffff)" }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        paddingBottom: 12,
        borderBottom: "1px solid var(--border-soft, #f1f5f9)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(2, 132, 199, 0.1)", color: "#0284c7", fontSize: 16
          }}>
            <i className="fa-solid fa-cube" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-1, #0f172a)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{isVi ? "Truy vấn Vector Ngữ nghĩa Qdrant" : "Qdrant Vector Similarity Search"}</span>
              <StatusBadge connected={connected} isVi={isVi} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", marginTop: 2 }}>
              {isVi ? "Bộ sưu tập đang chọn:" : "Active Collection:"} <strong style={{ color: "var(--text-1, #0f172a)" }}>{isVi ? activeMeta.nameVi : activeMeta.nameEn}</strong> • {(selectedCollection?.points_count || status?.pointsCount || 9148).toLocaleString()} vectors sẵn sàng
            </div>
          </div>
        </div>

        <button
          onClick={loadStatus}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #cbd5e1)",
            background: "var(--surface, #ffffff)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2, #334155)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#0284c7";
            e.currentTarget.style.color = "#0284c7";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--border, #cbd5e1)";
            e.currentTarget.style.color = "var(--text-2, #334155)";
          }}
        >
          <i className="fa-solid fa-rotate" style={{ fontSize: 11 }} />
          <span>{isVi ? "Làm mới dữ liệu" : "Refresh"}</span>
        </button>
      </div>

      {/* ── TWO-COLUMN WORKSPACE ───────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        flex: 1,
        minHeight: 480,
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box"
      }}>
        {/* Left: Collections */}
        <div style={{
          width: "250px",
          minWidth: "200px",
          flexShrink: 0,
          overflowY: "auto",
          borderRight: "1px solid var(--border-soft, #f1f5f9)",
          paddingRight: 14,
          boxSizing: "border-box"
        }}>
          <div style={{ fontWeight: 750, fontSize: 11, color: "var(--text-3, #64748b)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {isVi ? "Bộ sưu tập Qdrant" : "Collections"} ({collections.length})
          </div>
          {collections.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", textAlign: "center", padding: 16 }}>
              {isVi ? "Không có bộ sưu tập nào." : "No collections found."}
            </div>
          ) : collections.map((col, i) => (
            <CollectionCard
              key={col.name || i}
              col={col}
              isSelected={selectedCollection?.name === col.name}
              onClick={handleSwitchCollection}
              isVi={isVi}
            />
          ))}

          {/* Educational Note */}
          <div style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--border-soft, #f1f5f9)",
            fontSize: 11,
            color: "var(--text-3, #64748b)",
            lineHeight: 1.45
          }}>
            <strong style={{ color: "var(--text-2, #334155)", display: "block", marginBottom: 3 }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 4, color: "#0284c7" }} />
              {isVi ? "Phạm vi tra cứu:" : "Search Scope:"}
            </strong>
            {isVi
              ? "Chọn bộ sưu tập Hợp đồng để tra cứu điều khoản pháp lý, hoặc chọn Doanh nghiệp để tìm kiếm sản phẩm và đơn hàng."
              : "Select Legal Contracts for clauses, or Enterprise Data for products and sales orders."}
          </div>
        </div>

        {/* Right: Search / Browse Tabs */}
        <div style={{
          flex: "1 1 320px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box"
        }}>
          {/* Sub-tab switcher */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--border-soft, #e2e8f0)", marginBottom: 12, overflowX: "auto" }}>
            {[
              { key: "search", label: isVi ? "Tìm kiếm Ngữ nghĩa" : "Semantic Vector Search", icon: "fa-solid fa-magnifying-glass" },
              { key: "browse", label: isVi ? "Duyệt Điểm Dữ Liệu" : "Browse Data Points", icon: "fa-solid fa-layer-group" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: "none",
                  whiteSpace: "nowrap",
                  display: "inline-flex", alignItems: "center", gap: 7,
                  color: activeTab === tab.key ? "#0284c7" : "var(--text-3, #64748b)",
                  borderBottom: activeTab === tab.key ? "2px solid #0284c7" : "2px solid transparent",
                  marginBottom: -2,
                }}
              >
                <i className={tab.icon} style={{ fontSize: 12 }} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Tab */}
          {activeTab === "search" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0, minWidth: 0 }}>
              {/* Search Bar Input Row */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
                <div style={{
                  flex: "1 1 240px",
                  display: "flex",
                  alignItems: "center",
                  background: "var(--surface-2, #f8fafc)",
                  border: "1.5px solid var(--border, #cbd5e1)",
                  borderRadius: 8,
                  padding: "0 12px",
                  boxSizing: "border-box"
                }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-4, #94a3b8)", fontSize: 13, marginRight: 8 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={isVi ? `Tìm kiếm ngữ nghĩa trong ${activeMeta.nameVi}...` : `Search semantic vectors in ${activeMeta.nameEn}...`}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "9px 0",
                      background: "transparent",
                      fontSize: 13,
                      color: "var(--text-1, #0f172a)",
                      fontFamily: "inherit"
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 4 }}
                      title={isVi ? "Xóa tìm kiếm" : "Clear"}
                    >
                      <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
                    </button>
                  )}
                </div>

                <select
                  value={searchLimit}
                  onChange={e => setSearchLimit(Number(e.target.value))}
                  style={{
                    flexShrink: 0,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1.5px solid var(--border, #cbd5e1)",
                    background: "var(--surface, #ffffff)",
                    fontSize: 12.5,
                    cursor: "pointer",
                    color: "var(--text-1, #0f172a)",
                    boxSizing: "border-box",
                    fontWeight: 600
                  }}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>

                <button
                  onClick={() => handleSearch()}
                  disabled={searchLoading || !connected}
                  style={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    padding: "9px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: connected ? "#0284c7" : "#cbd5e1",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: connected ? (searchLoading ? "wait" : "pointer") : "not-allowed",
                    boxSizing: "border-box",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: connected ? "0 2px 6px rgba(2, 132, 199, 0.25)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  {searchLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" />
                      <span>{isVi ? "Đang tìm..." : "Searching..."}</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-magnifying-glass" />
                      <span>{isVi ? "Tìm kiếm Vector" : "Vector Search"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample queries chips matched to selected collection */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "2px 0" }}>
                <span style={{ fontSize: 11.5, color: "var(--text-3, #64748b)", fontWeight: 600 }}>
                  <i className="fa-solid fa-lightbulb" style={{ color: "#d97706", marginRight: 4 }} />
                  {isVi ? "Gợi ý nhanh:" : "Suggestions:"}
                </span>
                {((isVi ? activeMeta.suggestionsVi : activeMeta.suggestionsEn) || activeMeta.suggestions || []).map(q => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); handleSearch(q); }}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 12,
                      border: "1px solid var(--border, #cbd5e1)",
                      background: searchQuery === q ? "rgba(2, 132, 199, 0.1)" : "var(--surface, #ffffff)",
                      color: searchQuery === q ? "#0284c7" : "var(--text-2, #334155)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: searchQuery === q ? 700 : 500,
                      transition: "all 0.12s ease"
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
                  <div style={{ fontSize: 28, marginBottom: 10, color: "#0284c7" }}>
                    <i className="fa-solid fa-magnifying-glass" />
                  </div>
                  <div>{isVi ? "Nhấn 'Tìm kiếm Vector' hoặc chọn gợi ý để tìm kiếm tương đồng trên Qdrant." : "Enter a query or select a suggestion to run vector similarity search."}</div>
                </div>
              ) : searchLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3, #64748b)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--blue)" }} />
                  <span>{isVi ? "Đang tính toán vector embedding và truy vấn Qdrant..." : "Embedding query and querying Qdrant..."}</span>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-3, #64748b)",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <span>
                      {isVi ? "Tìm thấy" : "Found"} <strong style={{ color: "var(--text-1)" }}>{searchResults.length}</strong> {isVi ? "đoạn trích tương đồng cho" : "matching vectors for"} <b>"{searchQuery}"</b>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                      Collection: <code>{selectedCollection?.name}</code>
                    </span>
                  </div>

                  {/* SMART 0-RESULTS CARD WITH AUTO-SWITCH RECOMMENDATION */}
                  {searchResults.length === 0 ? (
                    <div style={{
                      padding: "28px 24px",
                      textAlign: "center",
                      background: "rgba(2, 132, 199, 0.03)",
                      border: "1.5px dashed rgba(2, 132, 199, 0.3)",
                      borderRadius: "12px",
                      margin: "12px 0"
                    }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(2, 132, 199, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                        color: "#0284c7"
                      }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 18 }} />
                      </div>

                      <div style={{ fontWeight: 750, fontSize: 14, color: "var(--text-1)", marginBottom: 6 }}>
                        {isVi
                          ? `Không tìm thấy kết quả nào trong "${activeMeta.nameVi}"`
                          : `No vector matches found in "${activeMeta.nameEn}"`}
                      </div>

                      <p style={{ fontSize: 12.5, color: "var(--text-3)", maxWidth: 540, margin: "0 auto 16px", lineHeight: 1.55 }}>
                        {isVi
                          ? `Bộ sưu tập hiện tại (${activeMeta.nameVi}) không chứa nội dung khớp với từ khóa "${searchQuery}". Hãy thử chuyển sang bộ sưu tập đối ứng khác để tra cứu đúng loại dữ liệu.`
                          : `The active collection does not contain points matching "${searchQuery}". Try switching to the other collection.`}
                      </p>

                      {otherCollection && (
                        <button
                          onClick={() => handleSwitchCollection(otherCollection)}
                          style={{
                            padding: "9px 18px",
                            borderRadius: "8px",
                            border: "none",
                            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.28)",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <i className="fa-solid fa-arrow-right-arrow-left" />
                          <span>
                            {isVi
                              ? `Chuyển sang tìm trong "${otherMeta?.nameVi || otherCollection.name}"`
                              : `Search in "${otherMeta?.nameEn || otherCollection.name}"`}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    searchResults.map((p, i) => (
                      <PointCard
                        key={p.id || i}
                        point={p}
                        index={i}
                        onExploreRelated={onExploreRelated}
                        isVi={isVi}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Browse Tab */}
          {activeTab === "browse" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
                  {selectedCollection
                    ? `${activeMeta.nameVi} · Hiển thị ${browseOffset + 1} - ${browseOffset + points.length} trong tổng số ${(selectedCollection.points_count || 0).toLocaleString()} points`
                    : "Chọn một bộ sưu tập"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    disabled={browseOffset === 0 || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, Math.max(0, browseOffset - BROWSE_LIMIT))}
                    style={{
                      padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border, #cbd5e1)",
                      background: "var(--surface, #ffffff)", cursor: browseOffset === 0 ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 600, color: "var(--text-2, #334155)",
                      opacity: browseOffset === 0 ? 0.5 : 1
                    }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ marginRight: 4, fontSize: 10 }} />
                    {isVi ? "Trang trước" : "Prev"}
                  </button>
                  <button
                    disabled={points.length < BROWSE_LIMIT || pointsLoading}
                    onClick={() => loadPoints(selectedCollection, browseOffset + BROWSE_LIMIT)}
                    style={{
                      padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border, #cbd5e1)",
                      background: "var(--surface, #ffffff)", cursor: points.length < BROWSE_LIMIT ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 600, color: "var(--text-2, #334155)",
                      opacity: points.length < BROWSE_LIMIT ? 0.5 : 1
                    }}
                  >
                    {isVi ? "Trang sau" : "Next"}
                    <i className="fa-solid fa-chevron-right" style={{ marginLeft: 4, fontSize: 10 }} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {pointsLoading ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--text-3, #64748b)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--blue)" }} />
                    <span>{isVi ? "Đang tải points từ Qdrant..." : "Loading points..."}</span>
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
