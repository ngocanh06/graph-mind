/**
 * Graph Mind — Neo4j Graph Panel
 * Visualizes live real graph data from Neo4j (nodes + relationships).
 * Interactive SVG canvas: Zoom, Pan, Drag, Node & Relationship Selection, Label Filters, Search, Cypher Console.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { fetchNeo4jStatus, fetchNeo4jGraph, fetchNeo4jNode, runCypherQuery, searchNeo4jNodes } from "../../services/api";

// Color map for real Neo4j labels in the dataset
// Color map with vibrant Neo4j Bloom lighting gradients & circular orbs
const LABEL_COLORS = {
  Product:     { bg: "#dcfce7", border: "#10b981", text: "#065f46", circle: "#10b981", highlight: "#6ee7b7", shadow: "#047857", shape: "circle" },
  Category:    { bg: "#f3e8ff", border: "#8b5cf6", text: "#5b21b6", circle: "#8b5cf6", highlight: "#c4b5fd", shadow: "#6d28d9", shape: "circle" },
  SubCategory: { bg: "#fae8ff", border: "#d946ef", text: "#86198f", circle: "#d946ef", highlight: "#f5d0fe", shadow: "#a21caf", shape: "circle" },
  Customer:    { bg: "#dbeafe", border: "#0ea5e9", text: "#0369a1", circle: "#0ea5e9", highlight: "#7dd3fc", shadow: "#0284c7", shape: "circle" },
  SalesOrder:  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", circle: "#f59e0b", highlight: "#fde68a", shadow: "#b45309", shape: "circle" },
  Employee:    { bg: "#ffe4e6", border: "#f43f5e", text: "#9f1239", circle: "#f43f5e", highlight: "#fda4af", shadow: "#be123c", shape: "circle" },
  Contract:    { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3", circle: "#6366f1", highlight: "#a5b4fc", shadow: "#4338ca", shape: "circle" },
  Clause:      { bg: "#fee2e2", border: "#ef4444", text: "#991b1b", circle: "#ef4444", highlight: "#fca5a5", shadow: "#b91c1c", shape: "circle" },
  Company:     { bg: "#ccfbf1", border: "#06b6d4", text: "#0e7490", circle: "#06b6d4", highlight: "#67e8f9", shadow: "#0891b2", shape: "circle" },
  Document:    { bg: "#f1f5f9", border: "#475569", text: "#1e293b", circle: "#475569", highlight: "#94a3b8", shadow: "#334155", shape: "circle" },
  Department:  { bg: "#fef9c3", border: "#eab308", text: "#713f12", circle: "#eab308", highlight: "#fef08a", shadow: "#a16207", shape: "circle" },
  default:     { bg: "#f1f5f9", border: "#64748b", text: "#334155", circle: "#64748b", highlight: "#cbd5e1", shadow: "#334155", shape: "circle" },
};

function getLabelColor(labels = []) {
  for (const lbl of labels) {
    if (LABEL_COLORS[lbl]) return LABEL_COLORS[lbl];
  }
  return LABEL_COLORS.default;
}

export default function GraphPanel({ lang = "vi", onSelectNode = null, initialSearch = "" }) {
  const isVi = lang === "vi";

  const [status, setStatus] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRel, setSelectedRel] = useState(null);
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "nodes" | "rels" | "cypher"
  
  // Filters & limits
  const [selectedLabel, setSelectedLabel] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState(() => {
    return typeof initialSearch === "string" ? initialSearch : (initialSearch?.name || "");
  });
  const [nodeLimit, setNodeLimit] = useState(60);

  // Cypher Console
  const [cypher, setCypher] = useState("MATCH (n:Product) RETURN n LIMIT 15");
  const [cypherResult, setCypherResult] = useState(null);
  const [cypherLoading, setCypherLoading] = useState(false);
  const [cypherError, setCypherError] = useState("");

  // Canvas Viewport (Zoom / Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Dragging & hover node state
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [nodePositions, setNodePositions] = useState({});

  // 1. Fetch Status & Graph Data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [st, graph] = await Promise.all([
      fetchNeo4jStatus(),
      fetchNeo4jGraph(nodeLimit, nodeLimit * 2, selectedLabel === "ALL" ? null : selectedLabel),
    ]);
    setStatus(st?.data || null);
    setGraphData(graph?.data || null);
    setLoading(false);
  }, [nodeLimit, selectedLabel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Compute Layout for Visual Graph
  const nodes = useMemo(() => graphData?.nodes || [], [graphData]);
  const rels = useMemo(() => graphData?.relationships || [], [graphData]);

  // Degrees and neighbors for Neo4j Bloom dandelion layout & interactions
  const { nodeDegrees, nodeNeighbors } = useMemo(() => {
    const degs = {};
    const adj = {};
    nodes.forEach(n => {
      degs[n._id] = 0;
      adj[n._id] = new Set();
    });
    rels.forEach(r => {
      const s = r.source?.id ?? r.source;
      const t = r.target?.id ?? r.target;
      if (degs[s] !== undefined) degs[s] += 1;
      if (degs[t] !== undefined) degs[t] += 1;
      if (adj[s]) adj[s].add(t);
      if (adj[t]) adj[t].add(s);
    });
    return { nodeDegrees: degs, nodeNeighbors: adj };
  }, [nodes, rels]);

  // Filter nodes by local search
  const filteredNodes = useMemo(() => {
    const raw = typeof searchTerm === "string" ? searchTerm : (searchTerm?.name || "");
    if (!raw.trim()) return nodes;
    const term = raw.toLowerCase();
    return nodes.filter(n => {
      const name = (n.name || "").toLowerCase();
      const labels = (n._labels || []).join(" ").toLowerCase();
      const props = Object.values(n).map(v => String(v).toLowerCase()).join(" ");
      return name.includes(term) || labels.includes(term) || props.includes(term);
    });
  }, [nodes, searchTerm]);

  // D3-Force simulation layout for organic Bloom dandelion clustering (scalable to 2,000+ nodes)
  useEffect(() => {
    if (nodes.length === 0) return;

    const width = 860;
    const height = 580;
    const centerX = width / 2;
    const centerY = height / 2;

    // Simulation nodes with degree-based radii
    const simNodes = nodes.map(n => {
      const deg = nodeDegrees[n._id] || 0;
      const radius = deg >= 5 ? 24 : deg >= 2 ? 17 : 13;
      const prev = nodePositions[n._id];
      return {
        id: n._id,
        radius,
        x: prev?.x ?? (centerX + (Math.random() - 0.5) * 260),
        y: prev?.y ?? (centerY + (Math.random() - 0.5) * 260),
      };
    });

    const nodeMap = new Map(simNodes.map(d => [d.id, d]));
    const simLinks = [];
    rels.forEach(r => {
      const sId = r.source?.id ?? r.source;
      const tId = r.target?.id ?? r.target;
      if (nodeMap.has(sId) && nodeMap.has(tId)) {
        simLinks.push({ source: sId, target: tId });
      }
    });

    // D3 Force: Link distance for dandelion rays + Charge repulsion + Collision buffer (zero overlap)
    const simulation = forceSimulation(simNodes)
      .force("link", forceLink(simLinks).id(d => d.id).distance(85).strength(0.75))
      .force("charge", forceManyBody().strength(-300).distanceMax(550))
      .force("center", forceCenter(centerX, centerY))
      .force("collision", forceCollide().radius(d => d.radius + 18).iterations(3))
      .stop();

    // 120 ticks fast-forward for instant stable layout without visual jitter
    for (let i = 0; i < 120; ++i) simulation.tick();

    const newPositions = {};
    simNodes.forEach(d => {
      newPositions[d.id] = { x: d.x, y: d.y };
    });

    setNodePositions(newPositions);
  }, [nodes, rels, nodeDegrees]);

  // 3. Pan / Zoom handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.id === "graph-background") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedNodeId) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions(prev => ({
        ...prev,
        [draggedNodeId]: { x: mouseX, y: mouseY }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(z => Math.max(0.3, Math.min(3.5, z * zoomFactor)));
  };

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Node selection & neighbor inspection
  const handleNodeClick = async (node) => {
    if (!node) return;
    setSelectedNode(node);
    setSelectedRel(null);
    if (onSelectNode) {
      const nodeKey = typeof node === "object" ? (node.name || node.code || String(node._id || "")) : String(node);
      onSelectNode(nodeKey);
    }
    // Fetch live neighbor details
    if (node?._id) {
      try {
        const detail = await fetchNeo4jNode(node._id);
        if (detail?.data) {
          setSelectedNode(prev => ({
            ...prev,
            ...detail.data,
            ...(detail.data.properties || {})
          }));
        }
      } catch (e) {
        console.warn("fetchNeo4jNode error:", e);
      }
    }
  };

  const handleRelClick = (rel) => {
    setSelectedRel(rel);
    setSelectedNode(null);
  };

  // Run Cypher
  const handleRunCypher = async () => {
    if (!cypher.trim()) return;
    setCypherLoading(true);
    setCypherError("");
    const res = await runCypherQuery(cypher);
    if (res === null) {
      setCypherError(isVi ? "Neo4j chưa kết nối hoặc cú pháp Cypher không hợp lệ." : "Neo4j not connected or invalid Cypher syntax.");
      setCypherResult(null);
    } else {
      setCypherResult(res);
    }
    setCypherLoading(false);
  };

  const connected = status?.connected ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14, background: "var(--surface, #fff)" }}>
      {/* ── HEADER & LIVE STATUS ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-soft, #e2e8f0)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#fff", fontSize: 18
          }}>
            🕸️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1, #0f172a)", display: "flex", alignItems: "center", gap: 8 }}>
              {isVi ? "Neo4j Knowledge Graph (Dữ liệu Thực tế)" : "Neo4j Knowledge Graph (Live Data)"}
              <span style={{
                padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: connected ? "#dcfce7" : "#fee2e2",
                color: connected ? "#15803d" : "#b91c1c",
                border: `1px solid ${connected ? "#86efac" : "#fca5a5"}`
              }}>
                ● {connected ? "Neo4j Live" : "Offline"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3, #64748b)" }}>
              {status?.uri || "bolt://localhost:7687"} · {status?.nodeCount?.toLocaleString() || 0} nodes · {status?.relationshipCount?.toLocaleString() || 0} rels
            </div>
          </div>
        </div>

        {/* Controls: Limit, Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2, #334155)" }}>
            <span>Limit:</span>
            <select
              value={nodeLimit}
              onChange={e => setNodeLimit(Number(e.target.value))}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-soft, #cbd5e1)",
                fontSize: 12, background: "var(--surface, #fff)", color: "var(--text-1, #0f172a)"
              }}
            >
              <option value={30}>30 nodes</option>
              <option value={60}>60 nodes</option>
              <option value={100}>100 nodes</option>
              <option value={200}>200 nodes</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
              borderRadius: 8, border: "1px solid var(--border-soft, #cbd5e1)",
              background: "var(--surface-raised, #f8fafc)", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--text-1, #0f172a)"
            }}
          >
            {loading ? "⏳..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── LABEL FILTER PILLS ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3, #64748b)" }}>
          {isVi ? "Bộ lọc Label:" : "Filter Label:"}
        </span>
        <button
          onClick={() => setSelectedLabel("ALL")}
          style={{
            padding: "4px 11px", borderRadius: 16, fontSize: 11.5, fontWeight: 700,
            cursor: "pointer", border: "1px solid",
            background: selectedLabel === "ALL" ? "#0284c7" : "transparent",
            color: selectedLabel === "ALL" ? "#fff" : "var(--text-2, #334155)",
            borderColor: selectedLabel === "ALL" ? "#0284c7" : "var(--border-soft, #cbd5e1)",
            transition: "all 0.15s"
          }}
        >
          {isVi ? "Tất cả" : "All"} ({status?.nodeCount || nodes.length})
        </button>

        {status?.labelCounts && Object.entries(status.labelCounts).map(([lbl, count]) => {
          const c = getLabelColor([lbl]);
          const isSelected = selectedLabel === lbl;
          return (
            <button
              key={lbl}
              onClick={() => setSelectedLabel(lbl)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 11px", borderRadius: 16, fontSize: 11.5, fontWeight: 700,
                cursor: "pointer", border: `1.5px solid ${c.border}`,
                background: isSelected ? c.border : c.bg,
                color: isSelected ? "#fff" : c.text,
                transition: "all 0.15s"
              }}
            >
              <span>{lbl}</span>
              <span style={{
                fontSize: 10, padding: "1px 5px", borderRadius: 8,
                background: isSelected ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.06)"
              }}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SUB-TABS & SEARCH ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid var(--border-soft, #e2e8f0)", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 2 }}>
          {[
            { id: "visual", label: isVi ? `🗺️ Trực quan Canvas` : `🗺️ Visual Canvas` },
            { id: "nodes",  label: isVi ? `Danh sách Nodes (${filteredNodes.length})` : `Nodes List (${filteredNodes.length})` },
            { id: "rels",   label: isVi ? `Quan hệ (${rels.length})` : `Relationships (${rels.length})` },
            { id: "cypher", label: `⚡ Cypher Console` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: "transparent",
                color: activeTab === tab.id ? "#0284c7" : "var(--text-3, #64748b)",
                borderBottom: activeTab === tab.id ? "2px solid #0284c7" : "2px solid transparent",
                marginBottom: -2,
                transition: "all 0.15s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Local Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isVi ? "Tìm entity / node..." : "Search entities..."}
            style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border-soft, #cbd5e1)",
              fontSize: 12, outline: "none", width: 180,
              background: "var(--surface, #fff)", color: "var(--text-1, #0f172a)"
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-3)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3, #64748b)" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🕸️ ⏳</div>
          <div style={{ fontWeight: 600 }}>{isVi ? "Đang tải dữ liệu thực tế từ Neo4j..." : "Loading live data from Neo4j..."}</div>
        </div>
      ) : activeTab === "visual" ? (
        /* ── 1. VISUAL INTERACTIVE SVG CANVAS ── */
        <div style={{ display: "flex", flex: 1, minHeight: 520, gap: 14, position: "relative" }}>
          {/* Canvas Viewport */}
          <div
            style={{
              flex: 1, position: "relative", borderRadius: 12, overflow: "hidden",
              border: "1.5px solid var(--border-soft, #e2e8f0)",
              background: "radial-gradient(circle, #f8fafc 10%, #f1f5f9 90%)",
              userSelect: "none"
            }}
          >
            {/* Viewport Floating Controls */}
            <div style={{
              position: "absolute", top: 12, right: 12, zIndex: 10,
              display: "flex", flexDirection: "column", gap: 6,
              background: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)",
              padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}>
              <button
                onClick={() => setZoom(z => Math.min(3.5, z * 1.2))}
                title="Zoom In"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700 }}
              >+</button>
              <button
                onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
                title="Zoom Out"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700 }}
              >-</button>
              <button
                onClick={resetViewport}
                title="Fit View"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 11 }}
              >⤢</button>
            </div>

            {/* Canvas Legend */}
            <div style={{
              position: "absolute", bottom: 12, left: 12, zIndex: 10,
              display: "flex", gap: 8, background: "rgba(255,255,255,0.9)",
              padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11
            }}>
              {Object.entries(LABEL_COLORS).filter(([k]) => k !== "default").map(([lbl, c]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.circle }} />
                  <span style={{ color: "var(--text-2, #334155)", fontWeight: 600 }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* SVG Elements */}
            <svg
              ref={svgRef}
              id="graph-background"
              width="100%"
              height="100%"
              style={{ cursor: isPanning ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setHoveredNodeId(null)}
              onWheel={handleWheel}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>

                {/* 3D Soft Contact Shadow */}
                <filter id="shadow-3d" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0f172a" floodOpacity="0.22" />
                </filter>
                <filter id="halo-soft" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                </filter>
                <filter id="contact-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </filter>
                <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#0284c7" floodOpacity="0.75" />
                </filter>

                {/* Neo4j Bloom Radial Gradients for all Entity Labels */}
                {Object.entries(LABEL_COLORS).map(([lbl, c]) => (
                  <radialGradient
                    id={`grad-3d-${lbl}`}
                    key={lbl}
                    cx="32%"
                    cy="28%"
                    r="72%"
                    fx="26%"
                    fy="22%"
                  >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="28%" stopColor={c.highlight || c.circle} stopOpacity="0.95" />
                    <stop offset="68%" stopColor={c.circle} />
                    <stop offset="100%" stopColor={c.shadow || "#0f172a"} />
                  </radialGradient>
                ))}
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Relationships (Edges - Dandelion Stems) */}
                {rels.map((r, i) => {
                  const sId = r.source?.id ?? r.source;
                  const tId = r.target?.id ?? r.target;
                  const srcPos = nodePositions[sId];
                  const tgtPos = nodePositions[tId];
                  if (!srcPos || !tgtPos) return null;
                  const isSelected = selectedRel === r;
                  const isConnToHover = hoveredNodeId && (sId === hoveredNodeId || tId === hoveredNodeId);
                  const isRelDimmed = hoveredNodeId && !isConnToHover;

                  const midX = (srcPos.x + tgtPos.x) / 2;
                  const midY = (srcPos.y + tgtPos.y) / 2;

                  return (
                    <g key={i} onClick={() => handleRelClick(r)} style={{ cursor: "pointer" }}>
                      <line
                        x1={srcPos.x}
                        y1={srcPos.y}
                        x2={tgtPos.x}
                        y2={tgtPos.y}
                        stroke={isSelected || isConnToHover ? "#0284c7" : "#94a3b8"}
                        strokeWidth={isSelected || isConnToHover ? 2.2 : 1}
                        strokeOpacity={isRelDimmed ? 0.12 : isSelected || isConnToHover ? 1 : 0.45}
                        markerEnd={isRelDimmed ? undefined : "url(#arrow)"}
                        style={{ transition: "stroke 0.15s, stroke-opacity 0.15s" }}
                      />
                      {(isSelected || isConnToHover || zoom >= 1.25) && (
                        <text
                          x={midX}
                          y={midY - 4}
                          textAnchor="middle"
                          fontSize={9}
                          fontWeight={700}
                          fill={isSelected || isConnToHover ? "#0284c7" : "#64748b"}
                          stroke="rgba(255,255,255,0.92)"
                          strokeWidth={2}
                          paintOrder="stroke"
                          style={{ pointerEvents: "none" }}
                        >
                          {r.rel_type}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Neo4j Bloom Circular Spheres & Orbs */}
                {filteredNodes.map((n) => {
                  const pos = nodePositions[n._id] || { x: 550, y: 350 };
                  const color = getLabelColor(n._labels);
                  const isSelected = selectedNode?._id === n._id;
                  const isHovered = hoveredNodeId === n._id;
                  const isConnToHover = hoveredNodeId && (nodeNeighbors[hoveredNodeId]?.has(n._id) || n._id === hoveredNodeId);
                  const isNodeDimmed = hoveredNodeId && !isConnToHover;
                  const firstLabel = (n._labels && n._labels[0]) || "default";
                  const gradId = LABEL_COLORS[firstLabel] ? `grad-3d-${firstLabel}` : "grad-3d-default";
                  const displayName = n.name || n.title || firstLabel;

                  const deg = nodeDegrees[n._id] || 0;
                  const radius = deg >= 5 ? 24 : deg >= 2 ? 17 : 13;

                  return (
                    <g
                      key={n._id}
                      transform={`translate(${pos.x}, ${pos.y}) scale(${isHovered ? 1.15 : 1})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(n);
                      }}
                      onMouseEnter={() => setHoveredNodeId(n._id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedNodeId(n._id);
                      }}
                      style={{
                        cursor: "pointer",
                        transition: draggedNodeId === n._id ? "none" : "transform 0.15s ease-out, opacity 0.2s",
                        opacity: isNodeDimmed ? 0.22 : 1
                      }}
                    >
                      {/* Ambient Bloom Glow Halo */}
                      <circle
                        r={radius + (isHovered || isSelected ? 9 : 5)}
                        fill={color.circle}
                        opacity={isHovered || isSelected ? 0.45 : 0.2}
                        filter="url(#halo-soft)"
                      />

                      {/* Selection Orbit or Hub Accent Ring */}
                      {(isSelected || isHovered || deg >= 4) && (
                        <circle
                          r={radius + 3}
                          fill="none"
                          stroke={isSelected ? "#0284c7" : color.circle}
                          strokeWidth={isSelected ? 2 : 1.2}
                          strokeDasharray={isSelected ? "4 2" : "none"}
                          opacity={0.75}
                          filter={isSelected ? "url(#glow-selected)" : undefined}
                        />
                      )}

                      {/* 3D Circular Bloom Sphere */}
                      <circle
                        r={radius}
                        fill={`url(#${gradId})`}
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth={1.5}
                        filter="url(#shadow-3d)"
                      />

                      {/* Specular Gloss Arc */}
                      <ellipse
                        cx={-radius * 0.3}
                        cy={-radius * 0.35}
                        rx={radius * 0.42}
                        ry={radius * 0.22}
                        transform={`rotate(-25 ${-radius * 0.3} ${-radius * 0.35})`}
                        fill="rgba(255,255,255,0.7)"
                      />

                      {/* Embossed Initial / Label Icon */}
                      <text
                        textAnchor="middle"
                        dy=".35em"
                        fill="#ffffff"
                        fontSize={radius >= 22 ? 12.5 : radius >= 17 ? 10 : 8}
                        fontWeight={900}
                        style={{
                          pointerEvents: "none",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        {firstLabel[0]}
                      </text>

                      {/* Label badge with white outline halo */}
                      <text
                        textAnchor="middle"
                        y={radius + 12}
                        fontSize={deg >= 3 || isHovered || isSelected ? 10.5 : 9}
                        fontWeight={deg >= 3 || isHovered || isSelected ? 700 : 600}
                        fill={isNodeDimmed ? "#94a3b8" : "var(--text-1, #0f172a)"}
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth={2.5}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none" }}
                      >
                        {displayName.length > 18 ? displayName.slice(0, 16) + "…" : displayName}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Side Inspector Panel (Node or Rel details) */}
          <div style={{
            width: 320, flexShrink: 0, borderRadius: 12,
            border: "1.5px solid var(--border-soft, #e2e8f0)",
            background: "var(--surface, #fff)", padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
            overflowY: "auto", boxShadow: "0 2px 10px rgba(0,0,0,0.04)"
          }}>
            {selectedNode ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-3, #64748b)" }}>
                      Entity Inspector
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1, #0f172a)", marginTop: 2 }}>
                      {selectedNode.name || selectedNode._id}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--text-3)" }}
                  >✕</button>
                </div>

                {/* Labels */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(selectedNode._labels || []).map(lbl => {
                    const c = getLabelColor([lbl]);
                    return (
                      <span key={lbl} style={{
                        padding: "3px 9px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: c.bg, color: c.text, border: `1px solid ${c.border}`
                      }}>
                        {lbl}
                      </span>
                    );
                  })}
                </div>

                {/* ID badge */}
                <div style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg-subtle, #f8fafc)", padding: "4px 8px", borderRadius: 6 }}>
                  Neo4j ID: <span style={{ fontFamily: "monospace" }}>{selectedNode._id}</span>
                </div>

                {/* Properties Table */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #334155)", marginTop: 4 }}>
                  {isVi ? "Thuộc tính thực tế:" : "Properties:"}
                </div>
                <div style={{ border: "1px solid var(--border-soft, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
                    <tbody>
                      {(() => {
                        const mergedProps = {
                          ...(selectedNode.properties || {}),
                          ...Object.fromEntries(
                            Object.entries(selectedNode).filter(([k]) => !["_id", "_labels", "neighbors", "properties"].includes(k))
                          )
                        };
                        const entries = Object.entries(mergedProps);
                        if (entries.length === 0) {
                          return (
                            <tr>
                              <td colSpan={2} style={{ padding: "8px", color: "var(--text-3, #64748b)", textAlign: "center" }}>
                                {isVi ? "Không có thuộc tính mở rộng" : "No extra properties"}
                              </td>
                            </tr>
                          );
                        }
                        return entries.map(([k, v]) => (
                          <tr key={k} style={{ borderBottom: "1px solid var(--border-soft, #f1f5f9)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600, color: "var(--text-3, #64748b)", background: "var(--bg-subtle, #fafafa)", width: "40%" }}>
                              {k}
                            </td>
                            <td style={{ padding: "6px 8px", color: "var(--text-1, #0f172a)", wordBreak: "break-all" }}>
                              {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Neighbors List */}
                {selectedNode.neighbors && selectedNode.neighbors.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>
                      {isVi ? `Thực thể liên kết (${selectedNode.neighbors.length}):` : `Linked Entities (${selectedNode.neighbors.length}):`}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
                      {selectedNode.neighbors.map((nb, i) => (
                        <div
                          key={i}
                          onClick={() => handleNodeClick(nb.target)}
                          style={{
                            padding: "6px 8px", borderRadius: 6, fontSize: 11,
                            background: "var(--surface-raised, #f8fafc)",
                            border: "1px solid var(--border-soft, #e2e8f0)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between"
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                            {nb.target?.name || nb.target?.id}
                          </span>
                          <span style={{ padding: "1px 6px", borderRadius: 4, background: "#e0f2fe", color: "#0369a1", fontSize: 9.5, fontWeight: 700 }}>
                            {nb.rel_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedRel ? (
              /* Relationship detail */
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)" }}>
                      Relationship Inspector
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0284c7", marginTop: 2 }}>
                      -[:{selectedRel.rel_type}]-&gt;
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRel(null)}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--text-3)" }}
                  >✕</button>
                </div>

                <div style={{ padding: 10, background: "var(--bg-subtle, #f8fafc)", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "var(--text-3)" }}>From: </span>
                    <b>{selectedRel.source?.name || selectedRel.source?.id}</b>
                    <span style={{ marginLeft: 6, fontSize: 10, color: "#64748b" }}>
                      ({selectedRel.source?.labels?.join(", ")})
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-3)" }}>To: </span>
                    <b>{selectedRel.target?.name || selectedRel.target?.id}</b>
                    <span style={{ marginLeft: 6, fontSize: 10, color: "#64748b" }}>
                      ({selectedRel.target?.labels?.join(", ")})
                    </span>
                  </div>
                </div>

                {selectedRel.rel_props && Object.keys(selectedRel.rel_props).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>
                      Properties:
                    </div>
                    <pre style={{ fontSize: 11, background: "var(--bg-subtle, #f8fafc)", padding: 8, borderRadius: 6, overflowX: "auto" }}>
                      {JSON.stringify(selectedRel.rel_props, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              /* Empty selection guide */
              <div style={{ textAlign: "center", color: "var(--text-3, #64748b)", padding: "40px 10px", fontSize: 12.5 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>👆</div>
                <div style={{ fontWeight: 600 }}>{isVi ? "Chưa chọn thực thể" : "No entity selected"}</div>
                <div style={{ marginTop: 4 }}>
                  {isVi ? "Nhấp chuột vào một node hoặc đường nối trên canvas để xem toàn bộ thuộc tính thực tế." : "Click any node or relationship on the canvas to inspect real properties."}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "nodes" ? (
        /* ── 2. NODES LIST TAB ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1, minHeight: 480 }}>
          <div style={{ overflowY: "auto", border: "1px solid var(--border-soft, #e2e8f0)", borderRadius: 10, padding: 10 }}>
            {filteredNodes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-3)" }}>
                {isVi ? "Không tìm thấy node nào." : "No nodes match filter."}
              </div>
            ) : (
              filteredNodes.map(n => {
                const c = getLabelColor(n._labels);
                const isSelected = selectedNode?._id === n._id;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleNodeClick(n)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, marginBottom: 6,
                      border: `1.5px solid ${isSelected ? c.border : "var(--border-soft, #e2e8f0)"}`,
                      background: isSelected ? c.bg : "var(--surface, #fff)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <span style={{
                        padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: c.bg, color: c.text, border: `1px solid ${c.border}`, marginRight: 8
                      }}>
                        {n._labels?.[0] || "Node"}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>
                        {n.name || n.title || n._id}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>
                      {n._id.slice(-6)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Node detail */}
          <div style={{ border: "1px solid var(--border-soft, #e2e8f0)", borderRadius: 10, padding: 14, overflowY: "auto" }}>
            {selectedNode ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: "var(--text-1)" }}>
                  {selectedNode.name || selectedNode._id}
                </div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {Object.entries(selectedNode).filter(([k]) => !k.startsWith("_") && k !== "neighbors").map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: "1px solid var(--border-soft, #f1f5f9)" }}>
                        <td style={{ padding: "6px 4px", fontWeight: 600, color: "var(--text-3)", width: "35%" }}>{k}</td>
                        <td style={{ padding: "6px 4px", color: "var(--text-1)", wordBreak: "break-all" }}>{String(v ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                {isVi ? "Chọn một node ở danh sách bên trái để xem chi tiết." : "Select a node from the list to inspect."}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "rels" ? (
        /* ── 3. RELATIONSHIPS TAB ── */
        <div style={{ overflowY: "auto", flex: 1, minHeight: 480, border: "1px solid var(--border-soft, #e2e8f0)", borderRadius: 10, padding: 10 }}>
          {rels.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-3)" }}>
              {isVi ? "Không có mối quan hệ nào trong giới hạn." : "No relationships found."}
            </div>
          ) : (
            rels.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderRadius: 8, background: "var(--bg-subtle, #f8fafc)",
                  marginBottom: 6, fontSize: 12, border: "1px solid var(--border-soft, #f1f5f9)"
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-1)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.source?.name || r.source?.id}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, background: "#e0f2fe", color: "#0369a1", fontWeight: 800 }}>
                  -[:{r.rel_type}]-&gt;
                </span>
                <span style={{ fontWeight: 700, color: "var(--text-1)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.target?.name || r.target?.id}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── 4. CYPHER CONSOLE TAB ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 480 }}>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            {isVi ? "Chạy truy vấn Cypher trực tiếp vào cơ sở dữ liệu Neo4j thực tế:" : "Execute raw Cypher query directly on live Neo4j database:"}
          </div>
          <textarea
            value={cypher}
            onChange={e => setCypher(e.target.value)}
            rows={4}
            disabled={!connected}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, resize: "vertical",
              border: "1.5px solid var(--border-soft, #e2e8f0)", fontFamily: "monospace", fontSize: 13,
              background: "var(--bg-subtle, #f8fafc)", color: "var(--text-1, #0f172a)", boxSizing: "border-box"
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleRunCypher}
              disabled={!connected || cypherLoading}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: connected ? "pointer" : "not-allowed",
                background: connected ? "#0284c7" : "#cbd5e1", color: "#fff", fontWeight: 700, fontSize: 13
              }}
            >
              {cypherLoading ? "⏳..." : "▶ Run Cypher"}
            </button>
            <button
              onClick={() => setCypher("MATCH (n:Product)-[r:BELONGS_TO]->(s:SubCategory) RETURN n.Name as Product, s.Name as SubCategory LIMIT 10")}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 11 }}
            >
              Sample: Products &amp; SubCategories
            </button>
            <button
              onClick={() => setCypher("MATCH (c:Customer)-[r:PLACED_ORDER]->(o:SalesOrder) RETURN c.CustomerID as Customer, o.SalesOrderID as Order, o.TotalDue as Due LIMIT 10")}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 11 }}
            >
              Sample: Orders by Customer
            </button>
          </div>

          {cypherError && (
            <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fee2e2", borderRadius: 8 }}>
              {cypherError}
            </div>
          )}

          {cypherResult && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                {cypherResult.length} {isVi ? "kết quả trả về" : "results returned"}
              </div>
              <pre style={{
                background: "var(--bg-subtle, #f8fafc)", borderRadius: 10, padding: 12,
                fontSize: 11, overflowX: "auto", color: "var(--text-1)",
                border: "1px solid var(--border-soft, #e2e8f0)", whiteSpace: "pre-wrap", wordBreak: "break-all"
              }}>
                {JSON.stringify(cypherResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
