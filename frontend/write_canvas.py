# -*- coding: utf-8 -*-
import os

content = """import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  LayoutGrid,
  Activity,
  Zap,
  Layers,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Palette,
  Eye,
  Sliders,
  Check
} from 'lucide-react';

const INITIAL_NODES = [
  {
    id: 'core',
    label: 'OKLCH Gamut Core',
    type: 'Neural Harmony Engine',
    iconType: 'Zap',
    color: '#00E5FF',
    glow: 'rgba(0, 229, 255, 0.6)',
    latency: '0.2 ms',
    hex: '#00E5FF',
    oklch: 'oklch(85.2% 0.182 205.4)',
    wcagDark: '14.8:1 AAA',
    role: 'Root Chromatic Anchor',
    x: 450,
    y: 260,
    hx: 450,
    hy: 250
  },
  {
    id: 'cyan_action',
    label: 'Primary Cyan 500',
    type: 'Action Primary Key',
    iconType: 'Sparkles',
    color: '#00E5FF',
    glow: 'rgba(0, 229, 255, 0.7)',
    latency: '14.8:1 AAA',
    hex: '#00E5FF',
    oklch: 'oklch(85.2% 0.182 205.4)',
    wcagDark: '14.8:1 AAA',
    role: 'CTA & Focus State',
    x: 230,
    y: 150,
    hx: 230,
    hy: 140
  },
  {
    id: 'indigo_depth',
    label: 'Electric Indigo 500',
    type: 'Depth & Hierarchy',
    iconType: 'Layers',
    color: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.7)',
    latency: '9.6:1 AAA',
    hex: '#3B82F6',
    oklch: 'oklch(58.4% 0.224 262.1)',
    wcagDark: '9.6:1 AAA',
    role: 'Structure & Graph',
    x: 670,
    y: 150,
    hx: 670,
    hy: 140
  },
  {
    id: 'emerald_mint',
    label: 'Emerald Mint 500',
    type: 'Success State Token',
    iconType: 'ShieldCheck',
    color: '#10B981',
    glow: 'rgba(16, 185, 129, 0.7)',
    latency: '12.8:1 AAA',
    hex: '#10B981',
    oklch: 'oklch(82.1% 0.171 155.2)',
    wcagDark: '12.8:1 AAA',
    role: 'Verified & Safe',
    x: 230,
    y: 380,
    hx: 230,
    hy: 380
  },
  {
    id: 'amber_solar',
    label: 'Solar Amber 500',
    type: 'Notice & Warning',
    iconType: 'Activity',
    color: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.7)',
    latency: '10.4:1 AAA',
    hex: '#F59E0B',
    oklch: 'oklch(79.5% 0.162 85.0)',
    wcagDark: '10.4:1 AAA',
    role: 'Contrast Anchor',
    x: 670,
    y: 380,
    hx: 670,
    hy: 380
  },
  {
    id: 'crimson_alert',
    label: 'Alert Crimson 500',
    type: 'Critical Risk Token',
    iconType: 'Palette',
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.7)',
    latency: '8.2:1 AA+',
    hex: '#EF4444',
    oklch: 'oklch(64.2% 0.241 25.4)',
    wcagDark: '8.2:1 AA+',
    role: 'Fault Boundary',
    x: 450,
    y: 90,
    hx: 450,
    hy: 100
  },
  {
    id: 'obsidian_base',
    label: 'Obsidian Void 950',
    type: 'Dark Surface Token',
    iconType: 'Sliders',
    color: '#0A0E14',
    glow: 'rgba(255, 255, 255, 0.2)',
    latency: '18.4:1 MAX',
    hex: '#0A0E14',
    oklch: 'oklch(12.0% 0.02 240.0)',
    wcagDark: 'Canvas Base',
    role: 'Contrast Zero Plane',
    x: 450,
    y: 440,
    hx: 450,
    hy: 450
  }
];

const INITIAL_EDGES = [
  { id: 'e1', source: 'core', target: 'cyan_action', label: 'Primary Action Gamut Link', speed: 2.5 },
  { id: 'e2', source: 'core', target: 'indigo_depth', label: 'Analogous Angle (+35°)', speed: 2.2 },
  { id: 'e3', source: 'core', target: 'emerald_mint', label: 'Split Triadic (-50°)', speed: 2.0 },
  { id: 'e4', source: 'core', target: 'amber_solar', label: 'Complementary Triad (120°)', speed: 1.8 },
  { id: 'e5', source: 'core', target: 'crimson_alert', label: 'Polar Opposite (180°)', speed: 1.5 },
  { id: 'e6', source: 'cyan_action', target: 'obsidian_base', label: 'APCA Contrast: Lc +92.4', speed: 2.4 },
  { id: 'e7', source: 'emerald_mint', target: 'amber_solar', label: 'Perceptual Luminance Balance', speed: 1.6 },
  { id: 'e8', source: 'indigo_depth', target: 'cyan_action', label: 'Interactive Morph Gradient', speed: 2.0 },
  { id: 'e9', source: 'crimson_alert', target: 'obsidian_base', label: 'Safety Boundary Fallback', speed: 1.7 }
];

export default function ColorInteractiveCanvas({ onOpenInspector }) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges] = useState(INITIAL_EDGES);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState('cyan_action');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [layoutMode, setLayoutMode] = useState('force');
  const [isAnimationActive, setIsAnimationActive] = useState(true);

  const containerRef = useRef(null);

  const renderIcon = (type) => {
    switch (type) {
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'Layers': return <Layers className="w-5 h-5 text-blue-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'Activity': return <Activity className="w-5 h-5 text-amber-400" />;
      case 'Palette': return <Palette className="w-5 h-5 text-rose-400" />;
      case 'Sliders': return <Sliders className="w-5 h-5 text-slate-300" />;
      default: return <Zap className="w-5 h-5 text-cyan-300" />;
    }
  };

  const handleSwitchLayout = (mode) => {
    setLayoutMode(mode);
    setNodes(prev =>
      prev.map(node => ({
        ...node,
        x: mode === 'hierarchical' ? node.hx : (INITIAL_NODES.find(n => n.id === node.id)?.x || node.x),
        y: mode === 'hierarchical' ? node.hy : (INITIAL_NODES.find(n => n.id === node.id)?.y || node.y)
      }))
    );
  };

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setIsDragging(true);

    const node = nodes.find(n => n.id === nodeId);
    if (node && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y
      });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedNodeId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    setNodes(prev =>
      prev.map(n => {
        if (n.id === draggedNodeId) {
          return {
            ...n,
            x: Math.max(40, Math.min(860, mouseX - dragOffset.x)),
            y: Math.max(40, Math.min(500, mouseY - dragOffset.y))
          };
        }
        return n;
      })
    );
  }, [isDragging, draggedNodeId, pan, zoom, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  const activeNode = nodes.find(n => n.id === (hoveredNodeId || selectedNodeId || 'cyan_action'));

  const isConnected = (sourceId, targetId) => {
    if (!hoveredNodeId) return true;
    if (sourceId === hoveredNodeId || targetId === hoveredNodeId) return true;
    return edges.some(e =>
      (e.source === hoveredNodeId && (e.target === sourceId || e.target === targetId)) ||
      (e.target === hoveredNodeId && (e.source === sourceId || e.source === targetId))
    );
  };

  const isNodeHighlighted = (nodeId) => {
    if (!hoveredNodeId) return true;
    if (nodeId === hoveredNodeId) return true;
    return edges.some(e =>
      (e.source === hoveredNodeId && e.target === nodeId) ||
      (e.target === hoveredNodeId && e.source === nodeId)
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-950/90 border border-slate-800 shadow-[0_0_50px_rgba(0,229,255,0.1)] backdrop-blur-xl">
      {/* Top Header Bar inside Canvas */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-900/70 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-cyan-400 tracking-wide uppercase">
            <Activity className="w-4 h-4 animate-pulse text-cyan-400" />
            Chroma_Mind Perceptual Mesh
          </span>
          <span className="h-3 w-px bg-slate-800"></span>
          <span className="text-slate-400 hidden sm:inline">
            Không Gian Màu OKLCH • Kéo thả các nút để khảo sát hài hòa quang học
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] font-mono text-emerald-400">7 Active Tokens</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
            <span className="text-[11px] font-mono text-cyan-300">9 Harmonic Links</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full h-[520px] select-none cursor-grab active:cursor-grabbing overflow-hidden bg-[#070A12]"
      >
        {/* Cyberpunk Grid Background */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 229, 255, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '36px 36px',
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
            }}
          />
        )}

        {/* Central Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* SVG Rendering Edges & Animations */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 900 540"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            <linearGradient id="edge-harmonic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Render Edges */}
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return null;

            const highlighted = isConnected(edge.source, edge.target);
            const isHoveredEdge = hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2 - 15;
            const pathD = `M ${sourceNode.x} ${sourceNode.y} Q ${midX} ${midY} ${targetNode.x} ${targetNode.y}`;

            return (
              <g key={edge.id} className="transition-opacity duration-300" style={{ opacity: highlighted ? 1 : 0.15 }}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHoveredEdge ? '#00E5FF' : 'rgba(51, 65, 85, 0.6)'}
                  strokeWidth={isHoveredEdge ? 2.5 : 1.5}
                  strokeDasharray={isHoveredEdge ? 'none' : '4 4'}
                />

                {isAnimationActive && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#edge-harmonic)"
                    strokeWidth={isHoveredEdge ? 3 : 2}
                    strokeDasharray="8 16"
                    className="animate-pulse"
                    style={{
                      filter: isHoveredEdge ? 'drop-shadow(0 0 6px #00E5FF)' : 'none'
                    }}
                  />
                )}

                {isHoveredEdge && (
                  <text
                    x={midX}
                    y={midY - 8}
                    fill="#38BDF8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="bg-slate-900 px-1 py-0.5 rounded text-[10px]"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Render Draggable Nodes */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-auto"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          {nodes.map(node => {
            const highlighted = isNodeHighlighted(node.id);
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                  highlighted ? 'opacity-100 scale-100 z-20' : 'opacity-30 scale-95 z-10'
                }`}
                style={{
                  left: `${(node.x / 900) * 100}%`,
                  top: `${(node.y / 540) * 100}%`
                }}
              >
                <div
                  className={`relative flex items-center justify-center w-14 h-14 rounded-2xl border transition-all duration-300 bg-slate-900/90 backdrop-blur-md ${
                    isSelected || isHovered
                      ? 'border-cyan-400 scale-110 shadow-[0_0_30px_rgba(0,229,255,0.6)]'
                      : 'border-slate-700 hover:border-slate-500 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                  }`}
                  style={{
                    boxShadow: isSelected || isHovered ? `0 0 25px ${node.glow}` : undefined
                  }}
                >
                  {node.id === 'core' && (
                    <div className="absolute inset-0 rounded-2xl border border-cyan-400/50 animate-ping pointer-events-none" />
                  )}

                  {/* Icon */}
                  {renderIcon(node.iconType)}

                  {/* Small colored dot */}
                  <span 
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow"
                    style={{ backgroundColor: node.color }}
                  />

                  {/* Contrast Tag */}
                  <span className="absolute -bottom-2.5 bg-slate-950 border border-slate-800 text-[9px] font-mono text-slate-300 px-1.5 py-0.2 rounded-full">
                    {node.latency}
                  </span>
                </div>

                {/* Node Label Below */}
                <div className="mt-2 text-center pointer-events-none">
                  <div className="text-xs font-semibold text-slate-100 whitespace-nowrap tracking-wide drop-shadow">
                    {node.label}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {node.type}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Floating Technical Tooltip / Inspector HUD (Bottom-Left) */}
        {activeNode && (
          <div className="absolute bottom-4 left-4 max-w-sm w-full bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-30 pointer-events-auto transition-all duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: activeNode.color, boxShadow: `0 0 10px ${activeNode.color}` }}
                />
                <h4 className="text-sm font-bold text-slate-100">{activeNode.label}</h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {activeNode.wcagDark}
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 my-3 text-center">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">TƯƠNG PHẢN</div>
                <div className="text-xs font-mono font-semibold text-emerald-400">{activeNode.latency}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">HEX CODE</div>
                <div className="text-xs font-mono font-semibold text-cyan-400">{activeNode.hex}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">GAMUT</div>
                <div className="text-[11px] font-mono font-semibold text-purple-300 truncate">P3 / OKLCH</div>
              </div>
            </div>

            {/* Token Snippet */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span>CSS / TAILWIND TOKEN</span>
                <button
                  onClick={() => onOpenInspector && onOpenInspector(activeNode)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>Mở Inspector</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 text-[11px] font-mono text-cyan-300/90 overflow-x-auto border border-slate-800/90 whitespace-pre-wrap leading-relaxed">
{`--token-${activeNode.id}: ${activeNode.hex};
/* OKLCH: ${activeNode.oklch} */
--contrast-ratio: ${activeNode.wcagDark};`}
              </pre>
            </div>
          </div>
        )}

        {/* Floating Control Toolbar (Top-Right Canvas Overlay) */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-xl backdrop-blur-md z-30">
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.15, 1.8))}
            title="Zoom In"
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.6))}
            title="Zoom Out"
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); handleSwitchLayout('force'); }}
            title="Reset View"
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <hr className="border-slate-800 my-0.5" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSwitchLayout(layoutMode === 'force' ? 'hierarchical' : 'force')}
            title={`Switch to ${layoutMode === 'force' ? 'Gamut Wheel' : 'Force Mesh'} Layout`}
            className={`p-2 rounded-lg transition-colors ${
              layoutMode === 'hierarchical' ? 'text-purple-400 bg-purple-950/50 border border-purple-800/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAnimationActive(!isAnimationActive)}
            title={isAnimationActive ? "Pause Flow Pulse" : "Resume Flow Pulse"}
            className={`p-2 rounded-lg transition-colors ${
              isAnimationActive ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {isAnimationActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Right Layout Indicator Badge */}
        <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 backdrop-blur-md">
          <span>Hài Hòa:</span>
          <span className="text-cyan-400 capitalize font-semibold">{layoutMode}</span>
          <span className="text-slate-600">|</span>
          <span>Zoom:</span>
          <span className="text-slate-200">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
"""

target = r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\ColorInteractiveCanvas.jsx"
with open(target, "w", encoding="utf-8") as f:
    f.write(content)
print("Wrote ColorInteractiveCanvas.jsx successfully!")
