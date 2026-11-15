/**
 * Graph Mind — Neo4j Graph Panel
 * Visualizes live real graph data from Neo4j (nodes + relationships).
 * Interactive SVG canvas: Zoom, Pan, Drag, Node & Relationship Selection, Label Filters, Search, Cypher Console.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { fetchNeo4jStatus, fetchNeo4jGraph, fetchNeo4jNode, runCypherQuery, searchNeo4jNodes, expandNeo4jNode } from "../../services/api";

// Color map for real Neo4j labels — Unified Harmonious Teal/Cyan/Ocean Enterprise Spectrum
const LABEL_COLORS = {
  Product: { bg: "#f0fdf4", border: "#0d9488", text: "#115e59", circle: "#0d9488", highlight: "#5eead4", shadow: "#134e4a", shape: "circle" },
  Category: { bg: "#f0f9ff", border: "#0284c7", text: "#0369a1", circle: "#0284c7", highlight: "#7dd3fc", shadow: "#075985", shape: "circle" },
  SubCategory: { bg: "#ecfeff", border: "#0891b2", text: "#0e7490", circle: "#0891b2", highlight: "#67e8f9", shadow: "#155e75", shape: "circle" },
  Customer: { bg: "#ecfeff", border: "#06b6d4", text: "#0e7490", circle: "#06b6d4", highlight: "#a5f3fc", shadow: "#0891b2", shape: "circle" },
  SalesOrder: { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e", circle: "#14b8a6", highlight: "#99f6e4", shadow: "#115e59", shape: "circle" },
  Employee: { bg: "#f8fafc", border: "#475569", text: "#1e293b", circle: "#475569", highlight: "#94a3b8", shadow: "#334155", shape: "circle" },
  Contract: { bg: "#f0fdfa", border: "#0f766e", text: "#134e4a", circle: "#0f766e", highlight: "#2dd4bf", shadow: "#042f2e", shape: "circle" },
  Clause: { bg: "#e0f2fe", border: "#0369a1", text: "#075985", circle: "#0369a1", highlight: "#38bdf8", shadow: "#0c4a6e", shape: "circle" },
  Company: { bg: "#cffafe", border: "#00b4d8", text: "#0077b6", circle: "#00b4d8", highlight: "#90e0ef", shadow: "#0096c7", shape: "circle" },
  Document: { bg: "#f1f5f9", border: "#64748b", text: "#334155", circle: "#64748b", highlight: "#cbd5e1", shadow: "#475569", shape: "circle" },
  Department: { bg: "#f0f9ff", border: "#0284c7", text: "#0369a1", circle: "#0284c7", highlight: "#38bdf8", shadow: "#075985", shape: "circle" },
  Vendor: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", circle: "#10b981", highlight: "#6ee7b7", shadow: "#047857", shape: "circle" },
  default: { bg: "#f8fafc", border: "#64748b", text: "#334155", circle: "#64748b", highlight: "#cbd5e1", shadow: "#475569", shape: "circle" },
};

const LABEL_ICONS = {
  Customer: "fa-solid fa-user",
  Product: "fa-solid fa-box",
  SalesOrder: "fa-solid fa-receipt",
  Employee: "fa-solid fa-user-tie",
  Contract: "fa-solid fa-file-contract",
  Clause: "fa-solid fa-scale-balanced",
  Company: "fa-solid fa-building",
  Document: "fa-solid fa-file-lines",
  Department: "fa-solid fa-sitemap",
  Category: "fa-solid fa-folder-tree",
  SubCategory: "fa-solid fa-tag",
  Vendor: "fa-solid fa-truck",
  default: "fa-solid fa-circle-nodes",
};

const REL_COLORS = {
  PURCHASED: "#0284c7",
  PLACED_ORDER: "#0ea5e9",
  CONTAINS_PRODUCT: "#0d9488",
  CONTAINS_CLAUSE: "#0891b2",
  PARTY_TO: "#14b8a6",
  PART_OF: "#0e7490",
  BELONGS_TO: "#0284c7",
  default: "#94a3b8"
};

function getRelColor(type = "") {
  return REL_COLORS[type] || REL_COLORS.default;
}

function getLabelColor(labels = []) {
  for (const lbl of labels) {
    if (LABEL_COLORS[lbl]) return LABEL_COLORS[lbl];
  }
  return LABEL_COLORS.default;
}

export default function GraphPanel({ lang = "vi", onSelectNode = null, initialSearch = "", role = null, currentUser = null }) {
  const isVi = lang === "vi";

  // Derive canonical role and RBAC label scope
  const effectiveRole = (role || currentUser?.id || currentUser?.role || "standard").toLowerCase();
  const isPrivileged = ["executive", "it_admin", "admin", "ceo", "cfo"].includes(effectiveRole);
  const isManager = ["knowledge_manager", "manager", "tp", "lead"].includes(effectiveRole);
  const isStandard = !isPrivileged && !isManager;

  const allowedLabels = useMemo(() => {
    if (isPrivileged) return ["Customer", "Product", "SalesOrder", "Contract", "Clause", "Employee", "Vendor", "Company", "Document", "Department", "Category", "SubCategory"];
    if (isManager) return ["Customer", "Product", "SalesOrder", "Contract", "Clause", "Company", "Vendor", "Document", "Department", "Category", "SubCategory"];
    return ["Customer", "Product", "SalesOrder", "Contract", "Clause", "Document", "Department", "Category", "SubCategory"];
  }, [isPrivileged, isManager]);

  const [status, setStatus] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRel, setSelectedRel] = useState(null);
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "nodes" | "rels" | "cypher"

  // Filters & limits
  const [selectedDomain, setSelectedDomain] = useState("ALL"); // "ALL" | "legal" | "adventureworks" | "demo"
  const [selectedLabel, setSelectedLabel] = useState("ALL");
  const [selectedRelType, setSelectedRelType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState(() => {
    return typeof initialSearch === "string" ? initialSearch : (initialSearch?.name || "");
  });
  const [nodeLimit, setNodeLimit] = useState(60);
  const [expanding, setExpanding] = useState(false);

  // Auto-reset label filter if current selection is restricted by RBAC
  useEffect(() => {
    if (selectedLabel !== "ALL" && !allowedLabels.includes(selectedLabel)) {
      setSelectedLabel("ALL");
    }
  }, [selectedLabel, allowedLabels]);

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

  // 1. Fetch Status & Graph Data scoped by Role RBAC
  const loadData = useCallback(async () => {
    setLoading(true);
    const [st, graph] = await Promise.all([
      fetchNeo4jStatus(effectiveRole),
      fetchNeo4jGraph(
        nodeLimit,
        nodeLimit * 2,
        selectedLabel === "ALL" ? null : selectedLabel,
        selectedDomain === "ALL" ? null : selectedDomain,
        selectedRelType === "ALL" ? null : selectedRelType,
        effectiveRole
      ),
    ]);
    setStatus(st?.data || null);
    setGraphData(graph?.data || null);
    setLoading(false);
  }, [nodeLimit, selectedLabel, selectedDomain, selectedRelType, effectiveRole]);

  const handleExpandNode = async (nodeId) => {
    if (!nodeId || expanding) return;
    setExpanding(true);
    try {
      const res = await expandNeo4jNode(nodeId, 25, effectiveRole);
      if (res?.success && res.data) {
        const newNodes = (res.data.nodes || []).filter(n => (n._labels || []).some(l => allowedLabels.includes(l)));
        const newRels = res.data.relationships || [];
        if (newNodes.length > 0 || newRels.length > 0) {
          const parentPos = nodePositionsRef.current[nodeId] || { x: 440, y: 300 };
          const seededPositions = { ...nodePositionsRef.current };
          newNodes.forEach((n, idx) => {
            if (!seededPositions[n._id]) {
              const angle = (idx / Math.max(1, newNodes.length)) * 2 * Math.PI;
              seededPositions[n._id] = {
                x: parentPos.x + Math.cos(angle) * 75,
                y: parentPos.y + Math.sin(angle) * 75
              };
            }
          });
          nodePositionsRef.current = seededPositions;

          setGraphData(prev => {
            if (!prev) return res.data;
            const existingIds = new Set(prev.nodes.map(n => n._id));
            const mergedNodes = [...prev.nodes];
            newNodes.forEach(n => {
              if (!existingIds.has(n._id)) {
                mergedNodes.push(n);
                existingIds.add(n._id);
              }
            });
            const allowedNodeIds = new Set(mergedNodes.map(n => n._id));
            const relKey = r => `${r.source?.id ?? r.source}->${r.rel_type || r.type}->${r.target?.id ?? r.target}`;
            const existingRels = new Set(prev.relationships.map(relKey));
            const mergedRels = [...prev.relationships];
            newRels.forEach(r => {
              const srcId = r.source?.id ?? r.source?._id ?? r.source;
              const tgtId = r.target?.id ?? r.target?._id ?? r.target;
              if (allowedNodeIds.has(srcId) && allowedNodeIds.has(tgtId)) {
                const k = relKey(r);
                if (!existingRels.has(k)) {
                  mergedRels.push(r);
                  existingRels.add(k);
                }
              }
            });
            return {
              ...prev,
              nodes: mergedNodes,
              relationships: mergedRels
            };
          });
        }
      }
    } catch (err) {
      console.error("[GraphPanel] Expand error:", err);
    } finally {
      setExpanding(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Compute Layout for Visual Graph strictly filtered by RBAC
  const nodes = useMemo(() => {
    const raw = graphData?.nodes || [];
    return raw.filter(n => {
      const lbls = n._labels || [];
      return lbls.some(l => allowedLabels.includes(l));
    });
  }, [graphData, allowedLabels]);

  const rels = useMemo(() => {
    const raw = graphData?.relationships || [];
    const allowedNodeIds = new Set(nodes.map(n => n._id));
    return raw.filter(r => {
      const srcId = r.source?.id ?? r.source?._id ?? r.source;
      const tgtId = r.target?.id ?? r.target?._id ?? r.target;
      return allowedNodeIds.has(srcId) && allowedNodeIds.has(tgtId);
    });
  }, [graphData, nodes]);

  // Stable references to prevent runaway re-render cycles
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const allowedLabelsRef = useRef(allowedLabels);
  useEffect(() => { allowedLabelsRef.current = allowedLabels; }, [allowedLabels]);

  const effectiveRoleRef = useRef(effectiveRole);
  useEffect(() => { effectiveRoleRef.current = effectiveRole; }, [effectiveRole]);

  const nodePositionsRef = useRef(nodePositions);
  useEffect(() => { nodePositionsRef.current = nodePositions; }, [nodePositions]);

  const lastInitialSearchRef = useRef("");

  const centerOnNode = useCallback((nodeId) => {
    if (!nodeId) return;
    const pos = nodePositionsRef.current[nodeId];
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      const width = 880;
      const height = 580;
      setPan({
        x: Math.round(width / 2 - pos.x * zoom),
        y: Math.round(height / 2 - pos.y * zoom)
      });
    }
  }, [zoom]);

  const handleSearchAndFocus = useCallback(async (query) => {
    if (!query || typeof query !== "string") return;
    const clean = query.replace(/^(ERP:\s*|Graph:\s*|Báo cáo:\s*|Đối tác:\s*)/, "").trim();
    if (!clean) return;
    setSearchTerm(clean);

    // 1. Check local nodes in current graphData
    const lower = clean.toLowerCase();
    const idMatch = clean.match(/\d+/)?.[0];
    const currentNodes = nodesRef.current || [];
    const local = currentNodes.find(n => {
      const nm = (n.name || "").toLowerCase();
      const nid = String(n.id || n.CustomerID || n.ProductID || n.SalesOrderID || n._id || "");
      return nm.includes(lower) || (idMatch && nid === idMatch);
    });

    if (local) {
      handleNodeClick(local);
      centerOnNode(local._id);
      return; // Do NOT call handleExpandNode: prevents infinite expansion loops
    }

    // 2. Query Neo4j live backend only if node does not exist in local canvas
    try {
      const searchKey = idMatch || clean;
      const res = await searchNeo4jNodes(searchKey, 5, effectiveRoleRef.current);
      const target = (res?.data || []).find(n => (n._labels || []).some(l => (allowedLabelsRef.current || []).includes(l)));
      if (target && target._id) {
        const exp = await expandNeo4jNode(target._id, 20, effectiveRoleRef.current);
        const newN = (exp?.data?.nodes || []).filter(n => (n._labels || []).some(l => (allowedLabelsRef.current || []).includes(l)));
        const newR = exp?.data?.relationships || [];

        setGraphData(prev => {
          const existingIds = new Set(prev?.nodes?.map(n => n._id) || []);
          const mergedN = [...(prev?.nodes || [])];
          if (!existingIds.has(target._id)) mergedN.unshift(target);
          newN.forEach(n => { if (!existingIds.has(n._id)) mergedN.push(n); });

          const allowedNodeIds = new Set(mergedN.map(n => n._id));
          const relKey = r => `${r.source?.id ?? r.source}->${r.rel_type || r.type}->${r.target?.id ?? r.target}`;
          const existingRels = new Set((prev?.relationships || []).map(relKey));
          const mergedR = [...(prev?.relationships || [])];
          newR.forEach(r => {
            const srcId = r.source?.id ?? r.source?._id ?? r.source;
            const tgtId = r.target?.id ?? r.target?._id ?? r.target;
            if (allowedNodeIds.has(srcId) && allowedNodeIds.has(tgtId)) {
              const k = relKey(r);
              if (!existingRels.has(k)) mergedR.push(r);
            }
          });
          return { nodes: mergedN, relationships: mergedR };
        });

        handleNodeClick(target);
        centerOnNode(target._id);
      }
    } catch (err) {
      console.warn("[GraphPanel] handleSearchAndFocus error:", err);
    }
  }, [centerOnNode]);

  // Auto-focus when initialSearch prop changes (only once per search term)
  useEffect(() => {
    if (!initialSearch) return;
    const term = typeof initialSearch === "string" ? initialSearch.trim() : (initialSearch?.name || initialSearch?.id || "");
    if (!term) return;
    if (term === lastInitialSearchRef.current) return;
    lastInitialSearchRef.current = term;
    handleSearchAndFocus(term);
  }, [initialSearch, handleSearchAndFocus]);

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

  // Filter nodes by search (including 1-hop neighbors of matched nodes for visual graph context)
  const filteredNodes = useMemo(() => {
    const raw = typeof searchTerm === "string" ? searchTerm : (searchTerm?.name || "");
    if (!raw.trim()) return nodes;
    const term = raw.toLowerCase();
    const idMatch = raw.match(/\d+/)?.[0];

    const matchIds = new Set();
    nodes.forEach(n => {
      const name = (n.name || "").toLowerCase();
      const labels = (n._labels || []).join(" ").toLowerCase();
      const nId = String(n.id || n.CustomerID || n.ProductID || n.SalesOrderID || n._id || "");
      const props = Object.values(n).map(v => String(v).toLowerCase()).join(" ");
      if (name.includes(term) || labels.includes(term) || props.includes(term) || (idMatch && nId === idMatch)) {
        matchIds.add(n._id);
      }
    });

    if (selectedNode?._id) {
      matchIds.add(selectedNode._id);
    }

    if (matchIds.size === 0) return nodes;

    const visibleIds = new Set(matchIds);
    matchIds.forEach(id => {
      const neighbors = nodeNeighbors[id];
      if (neighbors) {
        neighbors.forEach(nId => visibleIds.add(nId));
      }
    });

    return nodes.filter(n => visibleIds.has(n._id));
  }, [nodes, searchTerm, selectedNode, nodeNeighbors]);

  // Compute visible node IDs for fast O(1) edge filtering (prevents ghost edges)
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map(n => n._id)), [filteredNodes]);

  // D3-Force simulation layout for organic Bloom dandelion clustering (scalable to 2,000+ nodes)
  useEffect(() => {
    if (nodes.length === 0) return;

    const width = 880;
    const height = 580;
    const centerX = width / 2;
    const centerY = height / 2;

    const prevPositions = nodePositionsRef.current || {};
    const missing = nodes.some(n => {
      const p = prevPositions[n._id];
      return !p || !Number.isFinite(p.x) || !Number.isFinite(p.y);
    });

    // If all current nodes already have valid coordinates, preserve stability!
    if (!missing && Object.keys(prevPositions).length === nodes.length) {
      return;
    }

    // Simulation nodes with degree-based radii
    const simNodes = nodes.map((n, i) => {
      const deg = nodeDegrees[n._id] || 0;
      const radius = deg >= 5 ? 24 : deg >= 2 ? 18 : 14;
      const prev = prevPositions[n._id];
      const hasValid = prev && Number.isFinite(prev.x) && Number.isFinite(prev.y);
      return {
        id: String(n._id),
        radius,
        x: hasValid ? prev.x : (centerX + Math.cos(i * 0.8) * (60 + (i % 10) * 14)),
        y: hasValid ? prev.y : (centerY + Math.sin(i * 0.8) * (60 + (i % 10) * 14)),
        fx: hasValid ? prev.x : null, // Pin existing nodes so they do NOT jump or shake!
        fy: hasValid ? prev.y : null,
      };
    });

    const nodeMap = new Map(simNodes.map(d => [d.id, d]));
    const simLinks = [];
    rels.forEach(r => {
      const sId = String(r.source?.id ?? r.source?._id ?? r.source);
      const tId = String(r.target?.id ?? r.target?._id ?? r.target);
      if (nodeMap.has(sId) && nodeMap.has(tId)) {
        simLinks.push({ source: sId, target: tId });
      }
    });

    // D3 Force: Link distance for dandelion rays + Charge repulsion + Collision buffer
    const simulation = forceSimulation(simNodes)
      .force("link", forceLink(simLinks).id(d => d.id).distance(100).strength(0.7))
      .force("charge", forceManyBody().strength(-260).distanceMax(480))
      .force("center", forceCenter(centerX, centerY))
      .force("collision", forceCollide().radius(d => d.radius + 30).iterations(2))
      .stop();

    // 100 ticks fast-forward for instant stable layout without visual jitter
    for (let i = 0; i < 100; ++i) simulation.tick();

    const newPositions = { ...prevPositions };
    simNodes.forEach(d => {
      if (Number.isFinite(d.x) && Number.isFinite(d.y)) {
        newPositions[d.id] = { x: d.x, y: d.y };
      }
    });

    nodePositionsRef.current = newPositions;
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
  const handleNodeClick = (node) => {
    if (!node) return;
    const nodeKey = typeof node === "object" ? (node.name || node.code || String(node._id || "")) : String(node);
    lastInitialSearchRef.current = nodeKey; // Prevent circular feedback loop with initialSearch
    setSelectedNode(node);
    setSelectedRel(null);
    centerOnNode(node._id);
    if (onSelectNode) {
      onSelectNode(nodeKey, node);
    }
    // Fetch live neighbor details (without re-invoking onSelectNode)
    if (node?._id) {
      fetchNeo4jNode(node._id).then(detail => {
        if (detail?.data) {
          setSelectedNode(prev => ({
            ...prev,
            ...detail.data,
            ...(detail.data.properties || {})
          }));
        }
      }).catch(e => {
        console.warn("fetchNeo4jNode error:", e);
      });
    }
  };

  const handleRelClick = (rel) => {
    setSelectedRel(rel);
    setSelectedNode(null);
  };

  const handleSelectPreset = (presetKey) => {
    setSearchTerm("");
    setSelectedNode(null);
    setSelectedRel(null);
    if (presetKey === "ALL") {
      setSelectedDomain("ALL");
      setSelectedLabel("ALL");
      setSelectedRelType("ALL");
    } else if (presetKey === "ERP_SALES") {
      setSelectedDomain("adventureworks");
      setSelectedLabel("Customer");
      setSelectedRelType("ALL");
    } else if (presetKey === "LEGAL_CUAD") {
      setSelectedDomain("legal");
      setSelectedLabel("Clause");
      setSelectedRelType("ALL");
    } else if (presetKey === "PRODUCTS") {
      setSelectedDomain("adventureworks");
      setSelectedLabel("Product");
      setSelectedRelType("ALL");
    }
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12, background: "transparent" }}>
      {/* ── HEADER & LIVE STATUS ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, padding: "12px 18px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#ecfeff", border: "1px solid #cffafe", color: "#0891b2", fontSize: 14
          }}>
            <i className="fa-solid fa-circle-nodes" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{isVi ? "Đồ thị Tri thức Neo4j" : "Neo4j Knowledge Graph"}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                background: connected ? "#ecfdf5" : "#fee2e2",
                color: connected ? "#065f46" : "#b91c1c",
                border: `1px solid ${connected ? "#a7f3d0" : "#fca5a5"}`
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#10b981" : "#ef4444" }} />
                <span>{connected ? "Neo4j Live" : "Offline"}</span>
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                background: "#f0fdfa",
                color: "#0891b2",
                border: "1px solid #ccfbf1"
              }}>
                <i className="fa-solid fa-shield-halved text-[10px]" />
                <span>{currentUser?.badge || (isPrivileged ? "EXECUTIVE DIRECTOR" : (isManager ? "TRƯỞNG PHÒNG" : "CHUYÊN VIÊN"))}</span>
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
              {nodes.length} nodes · {rels.length} liên kết
              <span style={{ marginLeft: 6, fontSize: 11, color: "#0891b2", fontWeight: 500 }}>
                {isPrivileged
                  ? (isVi ? "· Toàn quyền: 10+ nhãn thực thể" : "· Full Access: 10+ Labels")
                  : (isManager
                    ? (isVi ? "· Đã ẩn bảo mật: Nhân sự HR" : "· Hidden: HR")
                    : (isVi ? "· Đã ẩn bảo mật: Nhân sự HR & Nhà cung cấp" : "· Hidden: HR & Vendor"))}
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Limit, Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#334155" }}>
            <span>{isVi ? "Hiển thị:" : "Limit:"}</span>
            <select
              value={nodeLimit}
              onChange={e => setNodeLimit(Number(e.target.value))}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1",
                fontSize: 11.5, background: "#ffffff", color: "#0f172a", outline: "none"
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
              display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
              borderRadius: 6, border: "1px solid #cbd5e1",
              background: "#f8fafc", cursor: "pointer",
              fontSize: 11.5, fontWeight: 600, color: "#0f172a", transition: "all 0.15s"
            }}
          >
            <i className={`fa-solid fa-rotate-right text-xs ${loading ? "fa-spin" : ""}`} />
            <span>{loading ? (isVi ? "Đang tải..." : "Loading...") : (isVi ? "Làm mới" : "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* Connection Offline Warning Banner */}
      {!connected && !loading && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, background: "#fef2f2",
          border: "1px solid #fecaca", color: "#991b1b", fontSize: 12.5,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation text-base" />
            <div>
              <b>{isVi ? "Cơ sở dữ liệu đồ thị Neo4j đang ngoại tuyến hoặc đang khởi động" : "Neo4j Database is Offline or Starting up"}</b>
              <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 1 }}>
                {isVi
                  ? "Vui lòng kiểm tra Docker Desktop và container neo4j_db. Sau đó bấm 'Thử kết nối lại'."
                  : "Please check Docker Desktop and neo4j_db container, then click 'Retry'."}
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: "5px 12px", borderRadius: 6, background: "#dc2626",
              color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11.5
            }}
          >
            {isVi ? "Thử kết nối lại" : "Retry"}
          </button>
        </div>
      )}

      {/* ── UNIFIED DOMAIN & RELATION TOOLBAR ───────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap", padding: "8px 14px",
        background: "#ffffff", borderRadius: 8,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginRight: 4 }}>
            {isVi ? "Miền tri thức:" : "Domain:"}
          </span>
          {[
            { id: "ALL", label: isVi ? "Tất cả các miền" : "All Domains" },
            { id: "adventureworks", label: isVi ? "ERP Doanh nghiệp" : "Enterprise ERP" },
            { id: "legal", label: isVi ? "Pháp chế CUAD" : "CUAD Legal" },
            { id: "demo", label: isVi ? "Mẫu thử" : "Demo / Sample" }
          ].map(dom => {
            const isSelected = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(dom.id)}
                style={{
                  padding: "4px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer", border: isSelected ? "1px solid #0891b2" : "1px solid #e2e8f0",
                  background: isSelected ? "#0891b2" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#334155",
                  transition: "all 0.15s"
                }}
              >
                {dom.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}>
            {isVi ? "Loại quan hệ:" : "Relationship:"}
          </span>
          <select
            value={selectedRelType}
            onChange={e => setSelectedRelType(e.target.value)}
            style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
              border: "1px solid #cbd5e1", background: "#ffffff",
              color: "#0f172a", outline: "none"
            }}
          >
            <option value="ALL">{isVi ? "Tất cả quan hệ" : "All Relationships"}</option>
            <option value="CONTAINS_CLAUSE">CONTAINS_CLAUSE</option>
            <option value="PARTY_TO">PARTY_TO</option>
            <option value="PART_OF">PART_OF</option>
            <option value="BELONGS_TO">BELONGS_TO</option>
            <option value="CONTAINS_PRODUCT">CONTAINS_PRODUCT</option>
            <option value="PLACED_ORDER">PLACED_ORDER</option>
            <option value="PURCHASED">PURCHASED</option>
          </select>
        </div>
      </div>

      {/* ── LABEL FILTER TAGS ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        padding: "8px 14px", background: "#ffffff", borderRadius: 8,
        border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginRight: 2 }}>
          {isVi ? "Nhãn thực thể:" : "Labels:"}
        </span>
        <button
          onClick={() => setSelectedLabel("ALL")}
          style={{
            padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: selectedLabel === "ALL" ? 700 : 500,
            cursor: "pointer", border: selectedLabel === "ALL" ? "1px solid #0891b2" : "1px solid #e2e8f0",
            background: selectedLabel === "ALL" ? "#0891b2" : "#f8fafc",
            color: selectedLabel === "ALL" ? "#ffffff" : "#334155",
            transition: "all 0.15s"
          }}
        >
          {isVi ? "Tất cả" : "All"} ({nodes.length})
        </button>

        {status?.labelCounts && Object.entries(status.labelCounts)
          .filter(([lbl]) => allowedLabels.includes(lbl))
          .map(([lbl, count]) => {
            const c = getLabelColor([lbl]);
            const isSelected = selectedLabel === lbl;
            return (
              <button
                key={lbl}
                onClick={() => setSelectedLabel(lbl)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  border: isSelected ? "1px solid #0891b2" : "1px solid #e2e8f0",
                  background: isSelected ? "#0891b2" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#334155",
                  transition: "all 0.15s"
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isSelected ? "#ffffff" : c.border,
                  flexShrink: 0
                }} />
                <span>{lbl}</span>
                <span style={{
                  fontSize: 10, opacity: isSelected ? 0.9 : 0.65,
                  fontFamily: "var(--f-mono, monospace)"
                }}>
                  ({count.toLocaleString()})
                </span>
              </button>
            );
          })}
      </div>

      {/* ── SUB-TABS & SEARCH ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid var(--border-soft, #e2e8f0)", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "visual", label: isVi ? "Trực quan Canvas" : "Visual Canvas", icon: "fa-solid fa-circle-nodes" },
            { id: "nodes", label: isVi ? `Danh sách Nodes (${filteredNodes.length})` : `Nodes List (${filteredNodes.length})`, icon: "fa-solid fa-list" },
            { id: "rels", label: isVi ? `Quan hệ (${rels.length})` : `Relationships (${rels.length})`, icon: "fa-solid fa-diagram-project" },
            { id: "cypher", label: "Cypher Console", icon: "fa-solid fa-terminal" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: activeTab === tab.id ? 700 : 500,
                background: "transparent",
                color: activeTab === tab.id ? "#0891b2" : "var(--text-3, #64748b)",
                borderBottom: activeTab === tab.id ? "2px solid #0891b2" : "2px solid transparent",
                marginBottom: -1.5,
                transition: "all 0.15s"
              }}
            >
              <i className={`${tab.icon} text-xs`} style={{ opacity: activeTab === tab.id ? 1 : 0.6 }} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Local Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 10, fontSize: 11, color: "#94a3b8", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && searchTerm.trim()) {
                handleSearchAndFocus(searchTerm.trim());
              }
            }}
            placeholder={isVi ? "Tìm thực thể... (Enter)" : "Search entities... (Enter)"}
            style={{
              padding: "5px 12px 5px 28px", borderRadius: 6, border: "1px solid var(--border-soft, #cbd5e1)",
              fontSize: 12, outline: "none", width: 190,
              background: "var(--surface, #fff)", color: "var(--text-1, #0f172a)"
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--text-3)", padding: "0 4px" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3, #64748b)" }}>
          <div style={{ fontSize: 24, marginBottom: 10, color: "#0891b2" }}>
            <i className="fa-solid fa-circle-notch fa-spin" />
          </div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{isVi ? "Đang tải dữ liệu thực tế từ Neo4j..." : "Loading live data from Neo4j..."}</div>
        </div>
      ) : activeTab === "visual" ? (
        /* ── 1. VISUAL INTERACTIVE SVG CANVAS ── */
        <div style={{ display: "flex", flex: 1, minHeight: 520, gap: 14, position: "relative" }}>
          {/* Canvas Viewport */}
          <div
            style={{
              flex: 1, position: "relative", borderRadius: 8, overflow: "hidden",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              userSelect: "none"
            }}
          >
            {/* Top Floating Status Indicator */}
            <div style={{
              position: "absolute", top: 12, left: 12, zIndex: 10,
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)",
              padding: "6px 14px", borderRadius: 20,
              border: "1px solid var(--border-soft, #cbd5e1)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              fontSize: 11.5, color: "var(--text-2, #334155)"
            }}>
              {searchTerm ? (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="fa-solid fa-crosshairs" style={{ color: "#0891b2" }} />
                    <span>{isVi ? "Cụm thực thể:" : "Entity cluster:"} <b>{searchTerm}</b> ({filteredNodes.length} nodes)</span>
                  </span>
                  <button
                    onClick={() => { setSearchTerm(""); setSelectedNode(null); }}
                    style={{
                      padding: "2px 9px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                      background: "#0891b2", color: "#fff", border: "none", cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(8,145,178,0.3)"
                    }}
                  >
                    {isVi ? "✕ Xem toàn cảnh (50+ nodes)" : "✕ View Full Graph"}
                  </button>
                </>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  <span>
                    {isVi
                      ? `Toàn cảnh: ${filteredNodes.length} nodes · ${rels.length} liên kết thực tế`
                      : `Graph: ${filteredNodes.length} nodes · ${rels.length} live edges`}
                  </span>
                  <span style={{ color: "var(--text-4, #94a3b8)", fontSize: 10.5 }}>
                    {isVi ? "(Kéo thả để di chuyển · Cuộn để zoom)" : "(Drag to pan · Scroll to zoom)"}
                  </span>
                </span>
              )}
            </div>

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
              display: "flex", gap: 8, background: "rgba(255,255,255,0.92)",
              padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11,
              backdropFilter: "blur(6px)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
            }}>
              {Object.entries(LABEL_COLORS).filter(([k]) => k !== "default" && allowedLabels.includes(k)).map(([lbl, c]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.circle }} />
                  <span style={{ color: "var(--text-2, #334155)", fontWeight: 600, fontSize: 10.5 }}>{lbl}</span>
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
                {/* Arrow markers */}
                <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" />
                </marker>

                {/* Infinite Canvas Dot Pattern */}
                <pattern id="canvas-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.1" fill="#94a3b8" opacity="0.32" />
                </pattern>

                {/* Drop Shadows & Glow Filters */}
                <filter id="shadow-3d" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
                </filter>
                <filter id="shadow-pill" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.08" />
                </filter>
                <filter id="shadow-edge" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.07" />
                </filter>
                <filter id="halo-soft" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                </filter>
                <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#0284c7" floodOpacity="0.75" />
                </filter>

                {/* Radial Gradients for Entity Labels */}
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
                {/* Architectural Grid Background */}
                <rect x="-12000" y="-12000" width="24000" height="24000" fill="url(#canvas-grid)" />

                {/* Relationships (Edges) */}
                {rels.map((r, i) => {
                  const sId = r.source?.id ?? r.source;
                  const tId = r.target?.id ?? r.target;
                  if (!visibleNodeIds.has(sId) || !visibleNodeIds.has(tId)) return null;
                  const srcPos = nodePositions[sId];
                  const tgtPos = nodePositions[tId];
                  if (!srcPos || !tgtPos) return null;
                  const isSelected = selectedRel === r;
                  const isConnToHover = hoveredNodeId && (sId === hoveredNodeId || tId === hoveredNodeId);
                  const isRelDimmed = hoveredNodeId && !isConnToHover;

                  const midX = (srcPos.x + tgtPos.x) / 2;
                  const midY = (srcPos.y + tgtPos.y) / 2;
                  const relColor = isSelected || isConnToHover ? "#0284c7" : getRelColor(r.rel_type || r.type);
                  const relLabel = r.rel_type || r.type || "RELATED_TO";
                  const pillW = Math.max(50, relLabel.length * 6.5 + 14);

                  return (
                    <g key={i} onClick={() => handleRelClick(r)} style={{ cursor: "pointer" }}>
                      <line
                        x1={srcPos.x}
                        y1={srcPos.y}
                        x2={tgtPos.x}
                        y2={tgtPos.y}
                        stroke={relColor}
                        strokeWidth={isSelected || isConnToHover ? 2.4 : 1.3}
                        strokeOpacity={isRelDimmed ? 0.12 : isSelected || isConnToHover ? 1 : 0.55}
                        markerEnd={isRelDimmed ? undefined : isSelected || isConnToHover ? "url(#arrow-selected)" : "url(#arrow)"}
                        style={{ transition: "stroke 0.15s, stroke-opacity 0.15s" }}
                      />
                      {(isSelected || isConnToHover || zoom >= 1.1) && (
                        <g transform={`translate(${midX}, ${midY})`} style={{ pointerEvents: "none" }}>
                          <rect
                            x={-pillW / 2}
                            y={-9}
                            width={pillW}
                            height={18}
                            rx={9}
                            fill="#ffffff"
                            stroke={isSelected || isConnToHover ? "#0284c7" : "#e2e8f0"}
                            strokeWidth={1}
                            filter="url(#shadow-edge)"
                          />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            fontSize={8.5}
                            fontWeight={700}
                            fill={isSelected || isConnToHover ? "#0284c7" : "#475569"}
                            style={{ fontFamily: "var(--f-body, sans-serif)", letterSpacing: "0.02em" }}
                          >
                            {relLabel}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Nodes (Orbs with Icons + Pill Badges) */}
                {filteredNodes.map((n) => {
                  const pos = nodePositions[n._id] || { x: 440, y: 300 };
                  const color = getLabelColor(n._labels);
                  const isSelected = selectedNode?._id === n._id;
                  const isHovered = hoveredNodeId === n._id;
                  const isConnToHover = hoveredNodeId && (nodeNeighbors[hoveredNodeId]?.has(n._id) || n._id === hoveredNodeId);
                  const isNodeDimmed = hoveredNodeId && !isConnToHover;
                  const firstLabel = (n._labels && n._labels[0]) || "default";
                  const gradId = LABEL_COLORS[firstLabel] ? `grad-3d-${firstLabel}` : "grad-3d-default";
                  const iconClass = LABEL_ICONS[firstLabel] || LABEL_ICONS.default;
                  const displayName = n.name || n.title || firstLabel;
                  const displayNameShort = displayName.length > 20 ? displayName.slice(0, 18) + "…" : displayName;
                  const pillW = Math.max(72, displayNameShort.length * 6.8 + 18);

                  const deg = nodeDegrees[n._id] || 0;
                  const radius = filteredNodes.length === 1 ? 30 : (deg >= 5 ? 24 : deg >= 2 ? 18 : 14);

                  return (
                    <g
                      key={n._id}
                      transform={`translate(${pos.x}, ${pos.y}) scale(${isHovered ? 1.12 : 1})`}
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
                        opacity: isNodeDimmed ? 0.2 : 1
                      }}
                    >
                      {/* Ambient Bloom Glow Halo */}
                      <circle
                        r={radius + (isHovered || isSelected ? 10 : 5)}
                        fill={color.circle}
                        opacity={isHovered || isSelected ? 0.45 : 0.18}
                        filter="url(#halo-soft)"
                      />

                      {/* Selection Outer Ring */}
                      {(isSelected || isHovered) && (
                        <circle
                          r={radius + 4}
                          fill="none"
                          stroke={isSelected ? "#0284c7" : color.border}
                          strokeWidth={isSelected ? 2 : 1.5}
                          strokeDasharray={isSelected ? "4 2" : "none"}
                          opacity={0.85}
                          filter={isSelected ? "url(#glow-selected)" : undefined}
                        />
                      )}

                      {/* 3D Circular Sphere */}
                      <circle
                        r={radius}
                        fill={`url(#${gradId})`}
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth={1.8}
                        filter="url(#shadow-3d)"
                      />

                      {/* Center FontAwesome Vector Icon */}
                      <foreignObject
                        x={-radius}
                        y={-radius}
                        width={radius * 2}
                        height={radius * 2}
                        style={{ pointerEvents: "none" }}
                      >
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#ffffff", fontSize: radius >= 22 ? 13 : radius >= 17 ? 11 : 9,
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))"
                        }}>
                          <i className={iconClass} />
                        </div>
                      </foreignObject>

                      {/* Degree Badge (top-right) */}
                      {deg > 0 && (
                        <g transform={`translate(${radius * 0.72}, ${-radius * 0.72})`}>
                          <circle r={7.5} fill="#0f172a" stroke="#ffffff" strokeWidth={1.5} />
                          <text
                            dy=".35em"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={7.5}
                            fontWeight={800}
                            style={{ pointerEvents: "none", fontFamily: "var(--f-mono, monospace)" }}
                          >
                            {deg > 99 ? "99+" : deg}
                          </text>
                        </g>
                      )}

                      {/* Modern Bottom Label Pill Card */}
                      <g transform={`translate(0, ${radius + 8})`}>
                        <rect
                          x={-pillW / 2}
                          y={0}
                          width={pillW}
                          height={22}
                          rx={11}
                          fill="#ffffff"
                          stroke={isSelected ? "#0284c7" : isHovered ? color.border : "#e2e8f0"}
                          strokeWidth={isSelected ? 1.8 : 1}
                          filter="url(#shadow-pill)"
                        />
                        <text
                          x={0}
                          y={14}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={700}
                          fill={isSelected ? "#0284c7" : "var(--text-1, #0f172a)"}
                          style={{ pointerEvents: "none", fontFamily: "var(--f-body, sans-serif)" }}
                        >
                          {displayNameShort}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Single-Node Focus Helper Banner */}
            {filteredNodes.length === 1 && (
              <div style={{
                position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                background: "var(--surface, #ffffff)",
                padding: "8px 16px", borderRadius: 24, border: "1px solid var(--border)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 10,
                fontSize: 12, color: "var(--text-2)", zIndex: 10, pointerEvents: "auto",
                whiteSpace: "nowrap"
              }}>
                <i className="fa-solid fa-circle-info" style={{ color: "var(--cyan, #0891b2)" }} />
                <span>
                  {isVi
                    ? "Đang xem tiêu điểm thực thể đơn. Nhấn nút bên cạnh để mở rộng toàn bộ đồ thị mạng."
                    : "Single entity focused. Click below to view the entire graph network."}
                </span>
                <button
                  onClick={() => { setSearchTerm(""); setSelectedNode(null); }}
                  style={{
                    padding: "4px 12px", borderRadius: 12, background: "var(--cyan, #0891b2)",
                    color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11,
                    display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cyan-hover, #0e7490)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--cyan, #0891b2)"}
                >
                  <i className="fa-solid fa-expand" style={{ fontSize: 10 }} />
                  {isVi ? "Xem tất cả đồ thị" : "View Full Graph"}
                </button>
              </div>
            )}
          </div>

          {/* Side Inspector Panel (Node or Rel details) */}
          <div style={{
            width: 320, flexShrink: 0, borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#ffffff", padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
            overflowY: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            {selectedNode ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                      Entity Inspector
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginTop: 2 }}>
                      {selectedNode.name || selectedNode._id}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#64748b" }}
                  >✕</button>
                </div>

                {/* Labels */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(selectedNode._labels || []).map(lbl => {
                    const c = getLabelColor([lbl]);
                    return (
                      <span key={lbl} style={{
                        padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: c.bg, color: c.text, border: `1px solid ${c.border}`
                      }}>
                        {lbl}
                      </span>
                    );
                  })}
                </div>

                {/* ID badge */}
                <div style={{ fontSize: 11, color: "#64748b", background: "#f8fafc", padding: "4px 8px", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e2e8f0" }}>
                  <span>Neo4j ID: <span style={{ fontFamily: "monospace" }}>{selectedNode._id}</span></span>
                </div>

                {/* 1-Hop Expansion Action Button */}
                <button
                  onClick={() => handleExpandNode(selectedNode._id)}
                  disabled={expanding}
                  style={{
                    padding: "7px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                    background: expanding ? "#94a3b8" : "#0891b2", color: "#fff",
                    border: "none", cursor: expanding ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: "0 1px 3px rgba(8,145,178,0.25)", transition: "all 0.15s"
                  }}
                >
                  {expanding ? "⏳ Đang mở rộng..." : (isVi ? "🔍 Mở rộng liên kết (Expand 1-hop)" : "🔍 Expand Neighbors (1-hop)")}
                </button>

                {/* Provenance & Source Metadata Card */}
                <div style={{
                  padding: "10px 12px", borderRadius: 6,
                  background: selectedNode.domain ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${selectedNode.domain ? "#bbf7d0" : "#e2e8f0"}`,
                  fontSize: 11
                }}>
                  <div style={{ fontWeight: 700, color: selectedNode.domain ? "#166534" : "#334155", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{isVi ? "Nguồn dữ liệu & Provenance:" : "Data Provenance:"}</span>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: selectedNode.domain ? "#dcfce7" : "#f1f5f9", color: selectedNode.domain ? "#15803d" : "#475569", fontWeight: 600 }}>
                      {selectedNode.domain ? `Domain: ${selectedNode.domain}` : (isVi ? "Runtime Node" : "Runtime Node")}
                    </span>
                  </div>
                  {selectedNode.source_file && (
                    <div style={{ color: "#334155", wordBreak: "break-all", marginBottom: 2 }}>
                      📁 File: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedNode.source_file}</span>
                    </div>
                  )}
                  {selectedNode.source_table && (
                    <div style={{ color: "#334155", marginBottom: 2 }}>
                      📊 Table: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedNode.source_table}</span>
                    </div>
                  )}
                  {selectedNode.evidence_text && (
                    <div style={{ marginTop: 4, fontStyle: "italic", color: "#64748b", background: "rgba(255,255,255,0.85)", padding: 4, borderRadius: 4, border: "1px solid #e2e8f0" }}>
                      "{selectedNode.evidence_text.length > 120 ? selectedNode.evidence_text.slice(0, 117) + "…" : selectedNode.evidence_text}"
                    </div>
                  )}
                  {!selectedNode.source_file && !selectedNode.source_table && (
                    <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 10.5 }}>
                      {isVi ? "Dữ liệu runtime gốc từ đồ thị tri thức Neo4j" : "Runtime node from Neo4j knowledge graph"}
                    </div>
                  )}
                </div>

                {/* Properties Table */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginTop: 4 }}>
                  {isVi ? "Thuộc tính thực tế:" : "Properties:"}
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
                <div style={{ textAlign: "center", padding: "18px 12px", background: "var(--surface-2, #f8fafc)", borderRadius: 10, border: "1px dashed var(--border, #e2e8f0)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: "#ecfeff", border: "1px solid #a5f3fc",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: "#0891b2", fontSize: 16
                  }}>
                    <i className="fa-solid fa-circle-nodes" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1, #0f172a)" }}>
                    {isVi ? "Đài Quan Sát Tri Thức Neo4j" : "Neo4j Knowledge Inspector"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3, #64748b)", marginTop: 4, lineHeight: 1.4 }}>
                    {isVi
                      ? "Chọn một node bất kỳ trên canvas để mở rộng mạng lưới 1-hop hoặc xem chi tiết thuộc tính."
                      : "Click any node on canvas to expand 1-hop neighborhood or inspect properties."}
                  </div>
                </div>

                {/* Subgraph overview stats */}
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2, #334155)" }}>
                  {isVi ? "Thống kê cụm hiện tại:" : "Current Cluster Overview:"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface-2, #f8fafc)", border: "1px solid var(--border-soft, #e2e8f0)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4, #94a3b8)", fontWeight: 600 }}>NODES HIỂN THỊ</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0891b2" }}>{filteredNodes.length}</div>
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface-2, #f8fafc)", border: "1px solid var(--border-soft, #e2e8f0)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4, #94a3b8)", fontWeight: 600 }}>LIÊN KẾT (EDGES)</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0e7490" }}>{rels.length}</div>
                  </div>
                </div>

                {/* Quick hints */}
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(8,145,178,0.04)", border: "1px solid rgba(8,145,178,0.15)", fontSize: 11, color: "var(--text-2, #334155)", lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: "#0891b2", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="fa-solid fa-circle-info text-xs" />
                    <span>{isVi ? "Mẹo tương tác:" : "Tips:"}</span>
                  </div>
                  <div>• {isVi ? "Kéo thả node để điều chỉnh bố cục đồ thị." : "Drag nodes to adjust layout."}</div>
                  <div>• {isVi ? "Nhấp 'Mở rộng liên kết' để tải thêm 25 thực thể lân cận từ Neo4j." : "Click 'Expand Neighbors' to load 25 adjacent nodes."}</div>
                  <div>• {isVi ? "Chọn nhãn hoặc miền dữ liệu phía trên để lọc nhanh đồ thị." : "Select domain or label tags above to filter graph."}</div>
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
