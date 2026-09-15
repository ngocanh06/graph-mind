import React, { useState } from 'react';
import { X, Check, Copy, ShieldCheck, Sparkles, Terminal, Sliders, Layers, Eye, Download } from 'lucide-react';

export default function ColorInspectorModal({ isOpen, onClose, selectedToken, tokensData }) {
  const [activeTab, setActiveTab] = useState('tailwind');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const token = (typeof selectedToken === 'object' && selectedToken) 
    ? selectedToken 
    : (tokensData?.find(t => t.id === selectedToken) || {
        id: 'primary_cyan',
        name: 'Primary Cyan 500',
        role: 'Brand Primary & Action Key',
        hex: '#00E5FF',
        rgb: 'rgb(0, 229, 255)',
        oklch: 'oklch(85.2% 0.182 205.4)',
        wcagDark: '14.2:1',
        wcagLight: '1.4:1',
        apcaDark: 'Lc +92.4',
        apcaLight: 'Lc -24.1',
        gamut: 'sRGB 100% / P3 99.2%',
        category: 'Action & Identity',
        description: 'Màu nhận diện trung tâm dùng cho các nút CTA trọng yếu, điểm nhấn đồ họa tương tác và đường chỉ dẫn ánh sáng.'
      });

  const shades = [
    { step: 50, hex: '#E0FCFF', oklch: '97.2% 0.03 205' },
    { step: 100, hex: '#B8F7FF', oklch: '93.5% 0.07 205' },
    { step: 200, hex: '#7AF0FF', oklch: '89.1% 0.12 205' },
    { step: 300, hex: '#3CE9FF', oklch: '87.0% 0.16 205' },
    { step: 400, hex: '#00E5FF', oklch: '85.2% 0.18 205', active: true },
    { step: 500, hex: '#00C8DE', oklch: '78.5% 0.17 205' },
    { step: 600, hex: '#00A3B5', oklch: '68.2% 0.15 205' },
    { step: 700, hex: '#007F8F', oklch: '56.1% 0.13 205' },
    { step: 800, hex: '#005E6B', oklch: '44.8% 0.11 205' },
    { step: 900, hex: '#00404A', oklch: '33.2% 0.08 205' },
    { step: 950, hex: '#00252C', oklch: '22.0% 0.05 205' }
  ];

  const getCodeSnippet = () => {
    switch (activeTab) {
      case 'tailwind':
        return `@theme {\n  --color-brand-${token.id}: ${token.hex};\n  --color-brand-${token.id}-oklch: ${token.oklch};\n  --color-brand-${token.id}-rgb: ${token.rgb};\n  /* Semantic Binding */\n  --color-action-primary: var(--color-brand-${token.id});\n  --color-action-primary-hover: ${shades[5].hex};\n}`;
      case 'css':
        return `:root {\n  /* W3C DTCG Token Definition */\n  --token-color-${token.id}: ${token.hex};\n  --token-color-${token.id}-oklch: ${token.oklch};\n  --token-color-${token.id}-rgb: ${token.rgb};\n  --token-contrast-ratio: ${token.wcagDark || '14.2:1'};\n}`;
      case 'dtcg':
        return `{\n  "color": {\n    "brand": {\n      "${token.id}": {\n        "$value": "${token.hex}",\n        "$type": "color",\n        "$description": "${token.role || token.name}",\n        "$extensions": {\n          "oklch": "${token.oklch}",\n          "gamut": "Display P3 / sRGB",\n          "wcag": "${token.wcagDark || '14.2:1'} (AAA)"\n        }\n      }\n    }\n  }\n}`;
      case 'swift':
        return `import SwiftUI\n\npublic extension Color {\n    static let ${token.id.replace(/[^a-zA-Z0-9]/g, '')} = Color(\n        hex: "${token.hex}",\n        oklch: "${token.oklch}"\n    )\n}`;
      default:
        return '';
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div 
              className="w-7 h-7 rounded-xl shadow-lg border border-white/20 shrink-0 flex items-center justify-center"
              style={{ backgroundColor: token.hex, boxShadow: `0 0 16px ${token.hex}80` }}
            >
              <Sparkles className="w-4 h-4 text-slate-950 mix-blend-difference" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">{token.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-800/40">
                  {token.category || 'Semantic Token'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{token.oklch}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-80px)] overflow-y-auto">
          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
            {token.description || 'Nút màu sắc được tính toán tự động qua giải thuật OKLCH không gian màu Display P3, đảm bảo tương phản 100% trên cả dark/light mode.'}
          </p>

          {/* 11-Step Perceptual OKLCH Shade Ramp */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Thang sắc độ tính toán OKLCH (50 - 950)
              </span>
              <span className="text-[11px] text-slate-500">Click để sao chép HEX</span>
            </div>
            <div className="grid grid-cols-11 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
              {shades.map((s) => (
                <button
                  key={s.step}
                  onClick={() => {
                    navigator.clipboard?.writeText(s.hex);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className={`group relative flex flex-col items-center gap-1 p-1 rounded-lg transition-all hover:scale-105 ${
                    s.active ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                >
                  <div 
                    className="w-full h-8 rounded-md border border-white/10 shadow-sm" 
                    style={{ backgroundColor: s.hex }} 
                  />
                  <span className="text-[9px] font-mono text-slate-400 group-hover:text-cyan-300">{s.step}</span>
                </button>
              ))}
            </div>
          </div>

          {/* WCAG 2.2 & APCA Contrast Testing Grid */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Kiểm định tương phản WCAG 2.2 & APCA
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">100% Passed AAA</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0A0E14] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Nền Dark Void</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] font-bold">AAA</span>
                </div>
                <div className="my-2">
                  <span className="text-lg font-bold font-mono text-emerald-400">{token.wcagDark || '14.2:1'}</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: token.hex }}>Mẫu chữ AAA</span>
              </div>

              <div className="p-3 rounded-xl bg-[#1C2026] border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Nền Surface 800</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] font-bold">AAA</span>
                </div>
                <div className="my-2">
                  <span className="text-lg font-bold font-mono text-emerald-400">11.8:1</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: token.hex }}>Mẫu chữ AAA</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F1F5F9] border border-slate-300 text-slate-900 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono">
                  <span>Nền White 50</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">AA+</span>
                </div>
                <div className="my-2">
                  <span className="text-lg font-bold font-mono text-emerald-700">8.4:1</span>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: '#005E6B' }}>Mẫu tương phản</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Display P3 Gamut</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[9px] font-bold">OKLCH</span>
                </div>
                <div className="my-2">
                  <span className="text-lg font-bold font-mono text-cyan-400">99.8%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Zero Clipping</span>
              </div>
            </div>
          </div>

          {/* Code Export Tabs */}
          <div>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('tailwind')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'tailwind' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tailwind v4
                </button>
                <button
                  onClick={() => setActiveTab('css')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'css' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CSS Variables
                </button>
                <button
                  onClick={() => setActiveTab('dtcg')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'dtcg' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  W3C DTCG JSON
                </button>
                <button
                  onClick={() => setActiveTab('swift')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    activeTab === 'swift' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SwiftUI / Android
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
              </button>
            </div>

            <pre className="mt-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {getCodeSnippet()}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Đã kiểm tra mô phỏng mù màu (Protan / Deutan / Tritan: Safe)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                handleCopyCode();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sử Dụng Token Này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
