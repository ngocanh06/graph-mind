import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  Palette,
  ArrowRight,
  CheckCircle2,
  Sliders,
  GitBranch,
  Laptop,
  Smartphone,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Code,
  Box,
  Share2,
  Check
} from 'lucide-react';

import ColorHeroIsometric from './ColorHeroIsometric';
import ColorInteractiveCanvas from './ColorInteractiveCanvas';
import ColorInspectorModal from './ColorInspectorModal';

export default function ColorPaletteLandingPage({
  onEnterPlatform,
  onOpenKnowledgeLanding,
  onShowLogin
}) {
  const [visualMode, setVisualMode] = useState('isometric');
  const [selectedToken, setSelectedToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('cyan');

  const handleOpenInspector = (token) => {
    setSelectedToken(token);
    setIsModalOpen(true);
  };

  const PRESETS = [
    { id: 'cyan', name: 'Cyberpunk Cyan', primary: '#00E5FF', badge: 'Mặc định' },
    { id: 'indigo', name: 'Enterprise Indigo', primary: '#3B82F6', badge: 'Tin cậy' },
    { id: 'emerald', name: 'Fintech Emerald', primary: '#10B981', badge: 'Tài chính' },
    { id: 'crimson', name: 'Sunset Crimson', primary: '#EF4444', badge: 'Nổi bật' }
  ];

  return (
    <div className="bg-[#070A12] text-slate-100 min-h-screen font-body-md antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-60 right-10 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0E17]/85 backdrop-blur-xl border-b border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="h-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <a href="#" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-100 tracking-tight font-display-hero">
                  Chroma<span className="text-cyan-400">_Mind</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase -mt-0.5 tracking-wider">
                  Chromatic Substrate EKMP
                </span>
              </div>
            </a>
          </div>

          <nav className="hidden xl:flex items-center gap-8 text-xs font-mono">
            <a href="#oklch" className="text-slate-400 hover:text-cyan-300 transition-colors">Kiến Trúc OKLCH</a>
            <a href="#wcag" className="text-slate-400 hover:text-cyan-300 transition-colors">Kiểm Định WCAG 2.2</a>
            <a href="#sync" className="text-slate-400 hover:text-cyan-300 transition-colors">Đồng Bộ Figma ⇄ Git</a>
            <a href="#pipeline" className="text-slate-400 hover:text-cyan-300 transition-colors">Quy Trình 4 Bước</a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenKnowledgeLanding && (
              <button
                onClick={onOpenKnowledgeLanding}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-full transition-colors"
                title="Quay lại Knowledge Graph Landing"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>GraphRAG Tri Thức</span>
              </button>
            )}

            <button
              onClick={onShowLogin || onEnterPlatform}
              className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-500 rounded-full hover:bg-slate-800 transition-colors"
            >
              Đăng nhập
            </button>

            <button
              onClick={() => handleOpenInspector(null)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-full transition-transform active:scale-[0.98] shadow-lg shadow-cyan-500/25"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Studio Màu Sắc</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* HERO SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center min-h-[calc(100vh-6rem)] py-8">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-sm w-fit mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-300 tracking-wide uppercase">
                  Hệ Thống Màu Sắc Doanh Nghiệp Thế Hệ Mới
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold ml-1">
                  OKLCH &amp; WCAG 2.2 AAA
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 tracking-tight leading-[1.12] mb-6 font-display-hero">
                Biến Bảng Màu Rời Rạc Thành{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400">
                  Design Tokens Chuẩn Xác
                </span>{" "}
                &amp; Tương Phản 100%
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mb-8 leading-relaxed">
                Chroma_Mind tự động tính toán không gian màu OKLCH, kiểm soát độ tương phản thị giác APCA, loại bỏ hoàn toàn tình trạng lệch màu trên các loại màn hình và tự động đồng bộ Design Tokens hai chiều với Figma &amp; Git Repository.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  onClick={() => handleOpenInspector(null)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-full transition-all duration-150 active:scale-[0.98] shadow-lg shadow-cyan-500/25 group"
                >
                  <span>Khám Phá Studio Bảng Màu</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => setVisualMode(visualMode === 'isometric' ? 'interactive' : 'isometric')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-full transition-colors shadow-sm"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Chuyển View: {visualMode === 'isometric' ? 'Lưới Tương Tác Mesh' : 'Mô Hình 3D Isometric'}</span>
                </button>
              </div>

              {/* Preset Selector */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/90 max-w-lg mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Thử nghiệm nhanh bảng màu mẫu:
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">1-Click Preview</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePreset(p.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                        activePreset === p.id
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0 shadow" style={{ backgroundColor: p.primary }} />
                      <span className="text-[11px] font-mono truncate">{p.name.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proof Stats */}
              <div className="pt-2 border-t border-slate-800/80 max-w-xl">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-emerald-400 font-mono">WCAG 2.2 AAA</span>
                    <span className="text-xs text-slate-400 mt-0.5">100% đạt chuẩn tiếp cận</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-cyan-400 font-mono">Toán Học OKLCH</span>
                    <span className="text-xs text-slate-400 mt-0.5">Đồng đều cảm nhận quang học</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-slate-100 font-mono">Dưới 1 Giây</span>
                    <span className="text-xs text-slate-400 mt-0.5">Xuất CSS, Tailwind, Swift</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column Canvas */}
            <div className="lg:col-span-5 relative w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Mô phỏng bảng màu trực tiếp
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <button
                    onClick={() => setVisualMode('isometric')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      visualMode === 'isometric' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3D Isometric
                  </button>
                  <button
                    onClick={() => setVisualMode('interactive')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      visualMode === 'interactive' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mesh Kéo Thả
                  </button>
                </div>
              </div>

              <div className="w-full">
                {visualMode === 'isometric' ? (
                  <ColorHeroIsometric onOpenInspector={handleOpenInspector} />
                ) : (
                  <ColorInteractiveCanvas onOpenInspector={handleOpenInspector} />
                )}
              </div>
            </div>
          </section>

          {/* BENTO GRID */}
          <section id="wcag" className="mt-28">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">
                  Kiến Trúc Màu Sắc Khoa Học
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-display-hero">
                  Những Gì Chroma_Mind Mang Lại Cho Đội Ngũ Sản Phẩm
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                Chấm dứt hoàn toàn mâu thuẫn giữa Designer và Developer về mã màu. Mọi giá trị đều được bảo chứng bằng toán học quang học.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center mb-6 text-cyan-400">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Tính năng 01</span>
                  <h3 className="text-base font-bold text-slate-100 mt-1 mb-2">
                    Toán Học OKLCH &amp; Gamut Mapping P3
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Đồng đều cảm nhận thị giác (Perceptual Uniformity). Không bao giờ gặp lỗi màu vàng bị sáng chói hay màu xanh dương bị chìm tối khi đặt cùng sắc độ 500.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span>Không gian: Display P3</span>
                    <span className="text-emerald-400 font-semibold">100% Gamut Bound</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 h-full w-[96%]" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">0% clipping trên màn hình Retina / OLED</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-emerald-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center mb-6 text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Tính năng 02</span>
                  <h3 className="text-base font-bold text-slate-100 mt-1 mb-2">
                    Tự Động Kiểm Định WCAG 2.2 &amp; APCA
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Tự động quét và cảnh báo các cặp màu chữ/nền vi phạm tương phản ngay khi vừa thiết kế, ngăn chặn nguy cơ vi phạm chuẩn tiếp cận ADA.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tương phản APCA:</span>
                    <span className="text-emerald-400 font-semibold">Lc +92.4 (Chuẩn AAA)</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[10px]">
                    ✓ Thử nghiệm mù màu: Đạt chuẩn Protanopia &amp; Deuteranopia
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center mb-6 text-indigo-400">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Tính năng 03</span>
                  <h3 className="text-base font-bold text-slate-100 mt-1 mb-2">
                    Đồng Bộ 2 Chiều Figma Tokens ⇄ Git
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Designer cập nhật bảng màu trên Figma Tokens Plugin, Chroma_Mind tự động tạo Pull Request cập nhật CSS Variables &amp; Tailwind config chỉ trong 10 giây.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Đồng bộ gần nhất:</span>
                    <span className="text-cyan-400 font-semibold">v4.2.1 • GitHub PR #142</span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                    tokens.json ➔ tailwind.config.js (0 xung đột)
                  </div>
                </div>
              </div>
            </div>

            {/* 70/30 Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                        <Palette className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono text-slate-400">Tính năng 04</span>
                        <h3 className="text-base font-bold text-slate-100">
                          Công Nghệ Morphing Đa Giao Diện (Dark, Light, OLED, Contrast)
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 hidden sm:inline-block">
                      Tự Động Đảo Chiều
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
                    Chuyển đổi giao diện từ Tối sang Sáng hoặc High Contrast không chỉ đơn thuần là đảo màu trắng-đen. Thuật toán của Chroma_Mind tự động tính toán lại Luminance Curve để bảo toàn trọn vẹn tỷ lệ tương phản thương hiệu.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-[#0A0E14] border border-slate-800 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">DARK THEME (MẶC ĐỊNH)</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">14.8:1 AAA</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-300 text-slate-900 text-center">
                      <span className="text-[10px] font-mono text-slate-600 block mb-1">LIGHT THEME (TỰ TẠO)</span>
                      <span className="text-sm font-bold font-mono text-cyan-800">9.4:1 AAA</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#000000] border border-cyan-800/80 text-center">
                      <span className="text-[10px] font-mono text-cyan-400 block mb-1">OLED ULTRA-BLACK</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">18.2:1 MAX</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-6 text-slate-300">
                    <Layers className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Tính năng 05</span>
                  <h3 className="text-base font-bold text-slate-100 mt-1 mb-2">
                    Phân Cấp Token Chuẩn W3C DTCG
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Xóa bỏ vĩnh viễn tình trạng hardcode mã HEX. Phân lớp 3 cấp độ: Global Raw ➔ Semantic Alias ➔ Component Token.
                  </p>
                </div>

                <div className="space-y-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Level 1: Global</span>
                    <span className="text-cyan-300 font-semibold">color.cyan.500</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Level 2: Semantic</span>
                    <span className="text-indigo-300 font-semibold">color.action.primary</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Level 3: Component</span>
                    <span className="text-emerald-300 font-semibold">btn.primary.bg</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PIPELINE */}
          <section id="pipeline" className="mt-28">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">
                Quy Trình 4 Bước Đơn Giản
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-display-hero">
                Từ 1 Màu Brand Đến Hệ Thống Tokens Sẵn Sàng Sản Xuất
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Quy trình tự động hóa thay thế hàng tuần lễ pha màu thủ công và dò tìm lỗi tương phản chữ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 block mb-4">BƯỚC 01</span>
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-4">
                    <Palette className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mb-2">Nhập Màu Gốc Thương Hiệu</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nhập mã HEX, HSL, link Figma hoặc tải lên logo nhận diện. Chroma_Mind tự động trích xuất các điểm màu chủ đạo.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  Thời gian: Dưới 5 giây
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                <div>
                  <span className="text-[11px] font-mono text-indigo-400 block mb-4">BƯỚC 02</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-4">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mb-2">Toán Học OKLCH Tạo Thang 50-950</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tự động tính toán đường cong sắc độ (Lightness Curve) và Chroma cân bằng để mọi bậc sắc độ đều nhìn thấy rõ ràng.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  Độ chính xác: 100% Quang học
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                <div>
                  <span className="text-[11px] font-mono text-emerald-400 block mb-4">BƯỚC 03</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mb-2">Ánh Xạ Ngữ Nghĩa Semantic</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tự động phân bổ vai trò cho Surface, Text, Border, Action, Success, Warning và Error theo ma trận tiếp cận WCAG.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  Tiêu chuẩn: W3C DTCG
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 block mb-4">BƯỚC 04</span>
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-4">
                    <Code className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mb-2">Xuất Code &amp; Đồng Bộ Git</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    1-Click xuất file Tailwind v4, CSS Custom Properties, Swift cho iOS, Jetpack Compose cho Android và Figma Tokens JSON.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] font-mono text-emerald-400 font-semibold">
                  Sẵn sàng Production
                </div>
              </div>
            </div>
          </section>

          {/* COMPLIANCE */}
          <section className="mt-28 bg-slate-900/70 border border-slate-800 rounded-2xl p-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">
                Cam Kết Tiêu Chuẩn Quốc Tế
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-100 font-display-hero">
                Bảo Vệ Tính Toàn Vẹn Của Hệ Thống Nhận Diện
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                Được thiết kế để loại bỏ rủi ro sai lệch màu thương hiệu và rủi ro pháp lý về khả năng tiếp cận kỹ thuật số.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col gap-2">
                <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-1">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-100">Chuẩn W3C Design Tokens</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tương thích hoàn toàn với thông số kỹ thuật của Design Tokens Community Group (DTCG). Dễ dàng tích hợp với mọi công cụ.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-100">WCAG 2.2 AAA &amp; APCA</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tự động kiểm định độ tương phản theo thuật toán quang học mới nhất APCA, giúp văn bản hiển thị rõ ràng trên mọi thiết bị.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-1">
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-100">Mô Phỏng Khiếm Thị Màu Sắc</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Kiểm tra đồng thời các dạng mù màu phổ biến (Protanopia, Deuteranopia, Tritanopia) để đảm bảo không người dùng nào bị bỏ lại.
                </p>
              </div>
            </div>
          </section>

          {/* CTA BANNER */}
          <section className="mt-28 mb-12">
            <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-3">
                Bắt Đầu Ngay Hôm Nay
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 max-w-2xl tracking-tight mb-4 font-display-hero">
                Sẵn Sàng Chuẩn Hóa Hệ Thống Màu Sắc Cho Toàn Bộ Sản Phẩm?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mb-8 leading-relaxed">
                Tạo bảng màu chuẩn OKLCH đầu tiên của bạn chỉ trong 2 phút. Xuất mã nguồn đồng bộ cho Web, iOS, Android và Figma ngay hôm nay.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleOpenInspector(null)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-full transition-all duration-150 active:scale-[0.98] shadow-lg shadow-cyan-500/25"
                >
                  <span>Tạo Bảng Màu Ngay (Miễn Phí)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {onEnterPlatform && (
                  <button
                    onClick={onEnterPlatform}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-full transition-colors shadow-sm"
                  >
                    <span>Vào Không Gian Làm Việc</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              <span className="text-[11px] font-mono text-slate-500 mt-6">
                Không yêu cầu thẻ tín dụng · Hỗ trợ xuất Tailwind v4, CSS &amp; W3C Tokens JSON
              </span>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-slate-800/80">
            <div className="lg:col-span-2 flex flex-col gap-4 pr-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400 flex items-center justify-center text-slate-950 font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-slate-100 font-display-hero">Chroma_Mind</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Nền Tảng Quản Trị Hệ Thống Màu Sắc &amp; Design Tokens Chuẩn Doanh Nghiệp. Tự động hóa tính toán quang học OKLCH, kiểm soát tương phản WCAG 2.2 và đồng bộ Figma ⇄ Git.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-mono">Hệ thống màu sắc: Đã hiệu chuẩn P3 (99.99%)</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-200 mb-4">Sản Phẩm</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">OKLCH Palette Studio</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">APCA Contrast Inspector</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Multi-Theme Morphing</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Figma Tokens Sync</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-200 mb-4">Giải Pháp</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Design System Doanh Nghiệp</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Ứng Dụng Fintech &amp; Ngân Hàng</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Giao Diện Y Tế &amp; Sức Khỏe</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Tuân Thủ Tiêu Chuẩn ADA</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-200 mb-4">Công Nghệ</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Không Gian Màu OKLCH</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Display P3 / Rec.2020</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Chuẩn W3C DTCG Tokens</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Tailwind v4 Engine</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-200 mb-4">Pháp Chế</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Tiêu Chuẩn WCAG 2.2</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Báo Cáo Tiếp Cận VPAT</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Chính Sách Quyền Riêng Tư</li>
                <li className="hover:text-cyan-300 transition-colors cursor-pointer">Bảo Mật SOC2 Type II</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">W3C DTCG Validated</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">WCAG 2.2 AAA</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">Display P3</span>
            </div>
            <div>
              © 2025 Chroma_Mind Substrate. Bản quyền thuộc về Graph_Mind Inc.
            </div>
          </div>
        </div>
      </footer>

      {/* INSPECTOR MODAL */}
      <ColorInspectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedToken={selectedToken}
      />
    </div>
  );
}
