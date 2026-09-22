# -*- coding: utf-8 -*-
import os

content = """import React, { useState } from 'react';
import { ShieldCheck, Sparkles, ExternalLink, Activity, Layers, ArrowUpRight } from 'lucide-react';

export default function ColorHeroIsometric({ activeNode, onSelectNode, onOpenInspector }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const handleNodeClick = (nodeId) => {
    if (onSelectNode) {
      onSelectNode(nodeId);
    }
  };

  const getNodeInfo = (id) => {
    switch (id) {
      case 'cyan':
        return {
          id: 'cyan',
          name: 'Primary Cyan Token (500)',
          category: 'Action & Brand Key',
          hex: '#00E5FF',
          oklch: 'oklch(85.2% 0.182 205.4)',
          wcag: '14.8:1 AAA',
          deltaE: 'ΔE 0.38',
          gamut: 'P3 99.8%',
          engine: 'OKLCH Gamut Fusion',
          description: 'Màu nhận diện thương hiệu số 1, tối ưu hóa cho các hành động chuyển đổi chính, đường dẫn quang học và điểm nhấn giao diện.'
        };
      case 'indigo':
        return {
          id: 'indigo',
          name: 'Electric Indigo Token (500)',
          category: 'Depth & Hierarchy',
          hex: '#3B82F6',
          oklch: 'oklch(58.4% 0.224 262.1)',
          wcag: '9.6:1 AAA',
          deltaE: 'ΔE 0.45',
          gamut: 'sRGB 100% / P3 98%',
          engine: 'Perceptual Curve Engine',
          description: 'Màu nền tảng tri thức và cấu trúc logic, tạo độ sâu trường thị giác và dẫn dắt người dùng qua các tầng thông tin phức tạp.'
        };
      case 'emerald':
        return {
          id: 'emerald',
          name: 'Emerald Mint Token (500)',
          category: 'Success & Verified',
          hex: '#10B981',
          oklch: 'oklch(82.1% 0.171 155.2)',
          wcag: '12.8:1 AAA',
          deltaE: 'ΔE 0.29',
          gamut: 'P3 99.4%',
          engine: 'Adaptive Chroma Matcher',
          description: 'Biểu thị trạng thái an toàn, giao dịch thành công và tính toàn vẹn dữ liệu hợp đồng mà không gây mỏi mắt.'
        };
      case 'amber':
        return {
          id: 'amber',
          name: 'Solar Amber Token (500)',
          category: 'Attention & Contrast Anchor',
          hex: '#F59E0B',
          oklch: 'oklch(79.5% 0.162 85.0)',
          wcag: '10.4:1 AAA',
          deltaE: 'ΔE 0.41',
          gamut: 'sRGB 100%',
          engine: 'APCA Contrast Limiter',
          description: 'Điểm neo tương phản thị giác, hỗ trợ cảnh báo thời hạn hợp đồng, rủi ro liên đới và chú ý cao cấp.'
        };
      case 'crimson':
        return {
          id: 'crimson',
          name: 'Alert Crimson Token (500)',
          category: 'Critical Risk State',
          hex: '#EF4444',
          oklch: 'oklch(64.2% 0.241 25.4)',
          wcag: '8.2:1 AA+',
          deltaE: 'ΔE 0.35',
          gamut: 'P3 100%',
          engine: 'Emergency Gamut Clip',
          description: 'Khu vực báo động vi phạm điều khoản pháp lý, hợp đồng quá hạn và xung đột nghĩa vụ với độ bắt mắt tối đa.'
        };
      default:
        return {
          id: 'core',
          name: 'OKLCH Neural Gamut Core',
          category: 'Chromatic Substrate Engine',
          hex: '#00E5FF',
          oklch: 'oklch(85% 0.18 205)',
          wcag: '100% AAA Compliant',
          deltaE: 'ΔE < 0.5',
          gamut: 'Display P3 / Rec.2020',
          engine: 'Neural Harmony Core',
          description: 'Lõi tính toán không gian màu đa chiều, tự động cân bằng cảm nhận thị giác (Perceptual Uniformity) và xuất Design Tokens đồng bộ.'
        };
    }
  };

  const activeInfo = getNodeInfo(hoveredNode || activeNode || 'cyan');

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950/90 border border-slate-800 shadow-[0_0_50px_rgba(0,229,255,0.08)]">
      {/* Background Chromatic Grid Accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0, 229, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 229, 255, 0.15) 1px, transparent 1px)`,
          backgroundSize: '36px 36px'
        }}
      />

      {/* Floating Info Tooltip Banner (HUD) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border border-white/20 shadow-md"
            style={{ backgroundColor: activeInfo.hex, boxShadow: `0 0 16px ${activeInfo.hex}70` }}
          >
            <Sparkles className="w-4 h-4 text-slate-950 mix-blend-difference" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <h4 className="text-xs font-bold text-slate-100">{activeInfo.name}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {activeInfo.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {activeInfo.oklch} • {activeInfo.engine}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-[10px] font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">WCAG:</span>
            <span className="text-emerald-400 font-semibold">{activeInfo.wcag}</span>
          </div>

          <button
            onClick={() => onOpenInspector && onOpenInspector(activeInfo)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
          >
            <span>Chi Tiết</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Isometric Graph Canvas */}
      <svg 
        className="w-full h-[460px] select-none pt-14" 
        viewBox="0 0 900 600" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="centerTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id="cyanNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0FCFF" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>

          <linearGradient id="indigoNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <linearGradient id="emeraldNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D1FAE5" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          <linearGradient id="amberNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <linearGradient id="crimsonNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEE2E2" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>

          <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
          </linearGradient>

          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000000" floodOpacity="0.5" />
          </filter>
          
          <filter id="cyanPulseShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#00E5FF" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* --- CIRCUIT PATH LINES CONNECTING NODES TO CENTER --- */}
        {/* Line 1: Top-Left (Primary Cyan) -> Center */}
        <path 
          d="M 230 220 L 330 270 L 400 305" 
          stroke="#00E5FF" 
          strokeWidth="2.5" 
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        <circle cx="330" cy="270" r="4" fill="#00E5FF" />

        {/* Line 2: Top-Right (Electric Indigo) -> Center */}
        <path 
          d="M 670 220 L 570 270 L 500 305" 
          stroke="#3B82F6" 
          strokeWidth="2.5" 
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        <circle cx="570" cy="270" r="4" fill="#3B82F6" />

        {/* Line 3: Bottom-Left (Emerald Mint) -> Center */}
        <path 
          d="M 230 440 L 330 390 L 400 355" 
          stroke="#10B981" 
          strokeWidth="2.5" 
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        <circle cx="330" cy="390" r="4" fill="#10B981" />

        {/* Line 4: Bottom-Right (Solar Amber) -> Center */}
        <path 
          d="M 670 440 L 570 390 L 500 355" 
          stroke="#F59E0B" 
          strokeWidth="2.5" 
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        <circle cx="570" cy="390" r="4" fill="#F59E0B" />

        {/* Line 5: Top-Center (Alert Crimson) -> Center */}
        <path 
          d="M 450 140 L 450 250" 
          stroke="#EF4444" 
          strokeWidth="2.5" 
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        <circle cx="450" cy="190" r="4" fill="#EF4444" />

        {/* Circuit Intersection Glowing Dots */}
        <circle cx="400" cy="305" r="5" fill="#00E5FF" filter="url(#cyanPulseShadow)" />
        <circle cx="500" cy="305" r="5" fill="#3B82F6" filter="url(#cyanPulseShadow)" />
        <circle cx="400" cy="355" r="5" fill="#10B981" filter="url(#cyanPulseShadow)" />
        <circle cx="500" cy="355" r="5" fill="#F59E0B" filter="url(#cyanPulseShadow)" />

        {/* --- CENTRAL OKLCH NEURAL ENGINE PLATFORM (STACKED 3D ISOMETRIC CHIP) --- */}
        <g 
          className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
          onClick={() => handleNodeClick('core')}
          onMouseEnter={() => setHoveredNode('core')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Base Drop Shadow Polygon */}
          <polygon 
            points="450,230 630,320 450,410 270,320" 
            fill="url(#cyanGlow)" 
            filter="url(#softShadow)"
          />

          {/* Bottom Layer Side Left */}
          <polygon points="270,320 450,410 450,430 270,340" fill="#1E293B" />
          {/* Bottom Layer Side Right */}
          <polygon points="450,410 630,320 630,340 450,430" fill="#0F172A" />
          {/* Bottom Layer Top Surface */}
          <polygon points="450,230 630,320 450,410 270,320" fill="#334155" />

          {/* Middle Blue Layer */}
          <g transform="translate(0, -16)">
            <polygon points="290,320 450,400 450,415 290,335" fill="#00E5FF" opacity="0.8" />
            <polygon points="450,400 610,320 610,335 450,415" fill="#2563EB" opacity="0.9" />
            <polygon points="450,240 610,320 450,400 290,320" fill="#0B132B" />
          </g>

          {/* Main Top Isometric Chip Surface */}
          <g transform="translate(0, -32)">
            {/* Side Left */}
            <polygon points="310,320 450,390 450,405 310,335" fill="#00E5FF" opacity="0.9" />
            {/* Side Right */}
            <polygon points="450,390 590,320 590,335 450,405" fill="#3B82F6" opacity="0.9" />
            {/* Top Surface */}
            <polygon 
              points="450,250 590,320 450,390 310,320" 
              fill="#0A0E14" 
              stroke="#00E5FF" 
              strokeWidth="2.5" 
              filter="url(#cyanPulseShadow)"
            />

            {/* Dotted Matrix Pattern on Central Chip Surface */}
            <g opacity="0.85">
              {[
                {cx: 410, cy: 300, fill: '#00E5FF'}, {cx: 430, cy: 290, fill: '#00E5FF'}, {cx: 450, cy: 280, fill: '#3B82F6'}, {cx: 470, cy: 270, fill: '#8B5CF6'}, {cx: 490, cy: 260, fill: '#EC4899'},
                {cx: 410, cy: 320, fill: '#10B981'}, {cx: 430, cy: 310, fill: '#00E5FF'}, {cx: 450, cy: 300, fill: '#FFFFFF'}, {cx: 470, cy: 290, fill: '#3B82F6'}, {cx: 490, cy: 280, fill: '#8B5CF6'},
                {cx: 410, cy: 340, fill: '#F59E0B'}, {cx: 430, cy: 330, fill: '#10B981'}, {cx: 450, cy: 320, fill: '#00E5FF'}, {cx: 470, cy: 310, fill: '#3B82F6'}, {cx: 490, cy: 300, fill: '#8B5CF6'},
                {cx: 410, cy: 360, fill: '#EF4444'}, {cx: 430, cy: 350, fill: '#F59E0B'}, {cx: 450, cy: 340, fill: '#10B981'}, {cx: 470, cy: 330, fill: '#00E5FF'}, {cx: 490, cy: 320, fill: '#3B82F6'}
              ].map((dot, idx) => (
                <circle key={idx} cx={dot.cx} cy={dot.cy} r="2.8" fill={dot.fill} />
              ))}
            </g>

            {/* Central Pulse Indicator Ring */}
            <circle cx="450" cy="320" r="14" fill="none" stroke="#00E5FF" strokeWidth="1.5" className="animate-ping" opacity="0.4" />
            <circle cx="450" cy="320" r="6" fill="#00E5FF" />
          </g>
        </g>

        {/* --- NODE 1: TOP-LEFT (PRIMARY CYAN 500) --- */}
        <g 
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick('cyan')}
          onMouseEnter={() => setHoveredNode('cyan')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <g transform="translate(140, 130)">
            <ellipse cx="90" cy="110" rx="60" ry="25" fill="rgba(0, 229, 255, 0.15)" />
            <polygon points="90,40 150,70 90,100 30,70" fill="url(#cyanNodeGrad)" stroke="#00E5FF" strokeWidth="1.5" />
            <polygon points="30,70 90,100 90,112 30,82" fill="#009FB2" />
            <polygon points="90,100 150,70 150,82 90,112" fill="#00C8DE" />
            
            {/* 3D Color Cylinder Swatch */}
            <g transform="translate(65, 35)">
              <path d="M 5 15 C 5 8, 45 8, 45 15 C 45 22, 5 22, 5 15 Z" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M 5 15 L 5 25 C 5 32, 45 32, 45 25 L 45 15" fill="#3CE9FF" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M 5 27 L 5 37 C 5 44, 45 44, 45 37 L 45 27" fill="#7AF0FF" stroke="#FFFFFF" strokeWidth="1.5" />
            </g>

            {/* Label tag */}
            <rect x="50" y="115" width="80" height="20" rx="6" fill="#0A0E14" stroke="#00E5FF" strokeWidth="1" />
            <text x="90" y="129" fill="#00E5FF" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CYAN 500</text>
          </g>
        </g>

        {/* --- NODE 2: TOP-RIGHT (ELECTRIC INDIGO 500) --- */}
        <g 
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick('indigo')}
          onMouseEnter={() => setHoveredNode('indigo')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <g transform="translate(580, 130)">
            <ellipse cx="90" cy="110" rx="60" ry="25" fill="rgba(59, 130, 246, 0.15)" />
            <polygon points="90,40 150,70 90,100 30,70" fill="url(#indigoNodeGrad)" stroke="#3B82F6" strokeWidth="1.5" />
            <polygon points="30,70 90,100 90,112 30,82" fill="#1D4ED8" />
            <polygon points="90,100 150,70 150,82 90,112" fill="#2563EB" />

            {/* 3D Isometric Bar Chart Columns */}
            <g transform="translate(55, 25)">
              <polygon points="15,45 23,49 23,25 15,21" fill="#60A5FA" />
              <polygon points="23,49 31,45 31,21 23,25" fill="#2563EB" />
              <polygon points="15,21 23,17 31,21 23,25" fill="#BFDBFE" />

              <polygon points="33,45 41,49 41,12 33,8" fill="#3B82F6" />
              <polygon points="41,49 49,45 49,8 41,12" fill="#1D4ED8" />
              <polygon points="33,8 41,4 49,8 41,12" fill="#EFF6FF" />

              <polygon points="51,45 59,49 59,30 51,26" fill="#93C5FD" />
              <polygon points="59,49 67,45 67,26 59,30" fill="#3B82F6" />
              <polygon points="51,26 59,22 67,26 59,30" fill="#DBEAFE" />
            </g>

            {/* Label tag */}
            <rect x="50" y="115" width="80" height="20" rx="6" fill="#0A0E14" stroke="#3B82F6" strokeWidth="1" />
            <text x="90" y="129" fill="#60A5FA" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">INDIGO 500</text>
          </g>
        </g>

        {/* --- NODE 3: BOTTOM-LEFT (EMERALD MINT 500) --- */}
        <g 
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick('emerald')}
          onMouseEnter={() => setHoveredNode('emerald')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <g transform="translate(140, 350)">
            <ellipse cx="90" cy="110" rx="60" ry="25" fill="rgba(16, 185, 129, 0.15)" />
            <polygon points="90,40 150,70 90,100 30,70" fill="url(#emeraldNodeGrad)" stroke="#10B981" strokeWidth="1.5" />
            <polygon points="30,70 90,100 90,112 30,82" fill="#047857" />
            <polygon points="90,100 150,70 150,82 90,112" fill="#059669" />

            {/* Graph Network Node Icon */}
            <g transform="translate(60, 35)">
              <line x1="20" y1="20" x2="40" y2="40" stroke="#047857" strokeWidth="2.5" />
              <line x1="40" y1="40" x2="58" y2="22" stroke="#047857" strokeWidth="2.5" />
              <circle cx="20" cy="20" r="7" fill="#34D399" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="40" cy="40" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="58" cy="22" r="7" fill="#34D399" stroke="#FFFFFF" strokeWidth="2" />
            </g>

            {/* Label tag */}
            <rect x="50" y="115" width="80" height="20" rx="6" fill="#0A0E14" stroke="#10B981" strokeWidth="1" />
            <text x="90" y="129" fill="#34D399" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">MINT 500</text>
          </g>
        </g>

        {/* --- NODE 4: BOTTOM-RIGHT (SOLAR AMBER 500) --- */}
        <g 
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick('amber')}
          onMouseEnter={() => setHoveredNode('amber')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <g transform="translate(580, 350)">
            <ellipse cx="90" cy="110" rx="60" ry="25" fill="rgba(245, 158, 11, 0.15)" />
            <polygon points="90,40 150,70 90,100 30,70" fill="url(#amberNodeGrad)" stroke="#F59E0B" strokeWidth="1.5" />
            <polygon points="30,70 90,100 90,112 30,82" fill="#B45309" />
            <polygon points="90,100 150,70 150,82 90,112" fill="#D97706" />

            {/* Shield / Warning Anchor Icon */}
            <g transform="translate(70, 35)">
              <polygon points="20,10 35,18 35,32 20,40 5,32 5,18" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
              <text x="20" y="28" fill="#78350F" fontSize="14" fontWeight="bold" textAnchor="middle">!</text>
            </g>

            {/* Label tag */}
            <rect x="50" y="115" width="80" height="20" rx="6" fill="#0A0E14" stroke="#F59E0B" strokeWidth="1" />
            <text x="90" y="129" fill="#FBBF24" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">AMBER 500</text>
          </g>
        </g>

        {/* --- NODE 5: TOP-CENTER (ALERT CRIMSON 500) --- */}
        <g 
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick('crimson')}
          onMouseEnter={() => setHoveredNode('crimson')}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <g transform="translate(360, 40)">
            <ellipse cx="90" cy="100" rx="55" ry="22" fill="rgba(239, 68, 68, 0.15)" />
            <polygon points="90,30 150,60 90,90 30,60" fill="url(#crimsonNodeGrad)" stroke="#EF4444" strokeWidth="1.5" />
            <polygon points="30,60 90,90 90,102 30,72" fill="#991B1B" />
            <polygon points="90,90 150,60 150,72 90,102" fill="#DC2626" />

            {/* Octagon Alert Icon */}
            <g transform="translate(70, 25)">
              <polygon points="12,5 28,5 35,18 35,32 28,40 12,40 5,32 5,18" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="20" cy="22" r="5" fill="#FFFFFF" />
            </g>

            {/* Label tag */}
            <rect x="50" y="105" width="80" height="20" rx="6" fill="#0A0E14" stroke="#EF4444" strokeWidth="1" />
            <text x="90" y="119" fill="#F87171" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CRIMSON 500</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
"""

target = r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\ColorHeroIsometric.jsx"
with open(target, "w", encoding="utf-8") as f:
    f.write(content)
print("Wrote ColorHeroIsometric.jsx successfully!")
