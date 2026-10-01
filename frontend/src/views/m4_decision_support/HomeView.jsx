import React, { useState } from "react";
import {
  Bot, Search, Share2, LayoutDashboard, AlertCircle,
  FolderOpen, BookMarked, MessageSquare, AlertTriangle,
  RefreshCw, FileEdit, ShieldAlert, Inbox,
  X, Sparkles, Wand2, Download, FileText,
} from "lucide-react";

const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    icon: MessageSquare,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    titleVi: 'Truy vấn AI Copilot: "Rà soát điều khoản bồi thường Hợp đồng CUAD_042"',
    titleEn: 'AI Copilot query: "Review indemnification clauses in Contract CUAD_042"',
    metaVi: "Thực hiện bởi Nguyễn Văn An (Pháp chế) • Đã trích dẫn 3 nguồn",
    metaEn: "By Nguyễn Văn An (Legal) • 3 sources cited",
    timeVi: "12 phút trước",
    timeEn: "12 min ago",
  },
  {
    id: "act-2",
    icon: AlertTriangle,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    titleVi: "Cảnh báo rủi ro hợp đồng: HĐ Cung ứng linh kiện #087 hết hạn trong 5 ngày",
    titleEn: "Contract risk alert: Supply contract #087 expiring in 5 days",
    metaVi: "Hệ thống kích hoạt cảnh báo tới phòng Kế toán & Ban Giám đốc",
    metaEn: "System alert dispatched to Accounting & Executive Board",
    timeVi: "1 giờ trước",
    timeEn: "1h ago",
  },
  {
    id: "act-3",
    icon: RefreshCw,
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    titleVi: "Đồng bộ dữ liệu AEGIS Local Agent (Máy trạm PC-01 / contracts)",
    titleEn: "AEGIS Local Agent sync (Workstation PC-01 / contracts)",
    metaVi: "Đã nạp thành công 18 tệp PDF mới vào Qdrant & Neo4j Vector Store",
    metaEn: "Successfully ingested 18 new PDF files into Qdrant & Neo4j",
    timeVi: "3 giờ trước",
    timeEn: "3h ago",
  },
  {
    id: "act-4",
    icon: FileEdit,
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    titleVi: 'Cập nhật SOP: "Quy trình nghiệm thu hợp đồng phần mềm v2.1"',
    titleEn: 'SOP updated: "Software contract acceptance procedure v2.1"',
    metaVi: "Xuất bản bởi Lê Hoàng Minh (Trưởng phòng IT)",
    metaEn: "Published by Lê Hoàng Minh (IT Manager)",
    timeVi: "Hôm qua",
    timeEn: "Yesterday",
  },
];

const ALL_CARDS_DEF = [
  {
    id: "copilot",
    Icon: Bot,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    labelVi: "AI Copilot",
    labelEn: "AI Copilot",
    ctaVi: "Vào hỏi AI →",
    ctaEn: "Ask AI →",
    ctaColor: "#2563eb",
    descVi: "Hỏi đáp ngôn ngữ tự nhiên Hybrid GraphRAG, trích dẫn nguồn xác thực hợp đồng & CRM.",
    descEn: "Natural language Q&A with Hybrid GraphRAG, citing verified contract & CRM sources.",
    roles: ["executive", "knowledge_manager", "standard", "it_admin"],
  },
  {
    id: "search",
    Icon: Search,
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    labelVi: "Tìm kiếm đa chiều",
    labelEn: "Multi-facet Search",
    ctaVi: "Tra cứu →",
    ctaEn: "Search →",
    ctaColor: "#64748b",
    descVi: "Truy xuất kết hợp từ khóa và ngữ nghĩa qua Customer, Product, Contract và Clauses.",
    descEn: "Hybrid keyword & semantic retrieval across Customer, Product, Contract and Clauses.",
    roles: ["executive", "knowledge_manager", "standard", "it_admin"],
  },
  {
    id: "knowledge",
    Icon: Share2,
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    labelVi: "Knowledge Graph",
    labelEn: "Knowledge Graph",
    ctaVi: "Khám phá →",
    ctaEn: "Explore →",
    ctaColor: "#64748b",
    descVi: "Khám phá mạng lưới liên kết thực thể, quan hệ pháp lý và đồ thị bằng chứng RAG.",
    descEn: "Explore entity network, legal relationships and GraphRAG evidence graph.",
    roles: ["executive", "knowledge_manager", "it_admin"],
  },
  {
    id: "executive",
    Icon: LayoutDashboard,
    iconBg: "#2563eb",
    iconColor: "#ffffff",
    labelVi: "Dashboard Điều hành",
    labelEn: "Executive Dashboard",
    ctaVi: "Xem KPI →",
    ctaEn: "View KPIs →",
    ctaColor: "#2563eb",
    descVi: "Theo dõi doanh thu, đối tác chiến lược và chỉ số rủi ro điều khoản tự động.",
    descEn: "Track revenue, strategic partners and automated clause risk indicators.",
    roles: ["executive"],
  },
];

function BriefingModal({ isVi, onClose }) {
  const [loading, setLoading] = useState(false);
  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 580,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                {isVi ? "Tạo Tóm Tắt Điều Hành (MODAL-001)" : "Executive Briefing Generator (MODAL-001)"}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                {isVi ? "Tự động trích xuất & tổng hợp tri thức điều hành" : "AI-driven synthesis of cross-functional KPIs"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Wand2 size={15} />
            {loading
              ? isVi
                ? "Đang tổng hợp báo cáo bằng AI..."
                : "Synthesizing briefing..."
              : isVi
              ? "Tạo báo cáo tổng hợp bằng AI"
              : "Generate AI-synthesized report"}
          </button>

          <div
            style={{
              height: 200,
              overflowY: "auto",
              padding: "14px 16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12.5,
              color: "#334155",
              lineHeight: 1.65,
            }}
          >
            {loading ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                {isVi ? "Đang truy vấn đồ thị tri thức & hợp đồng CUAD..." : "Synthesizing KPI & clause risk data..."}
              </div>
            ) : (
              <>
                <strong
                  style={{
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    display: "block",
                    paddingBottom: 6,
                    marginBottom: 8,
                  }}
                >
                  {isVi ? "BÁO CÁO ĐIỀU HÀNH TỔNG HỢP — THÁNG 10/2026" : "EXECUTIVE SUMMARY REPORT — OCTOBER 2026"}
                </strong>
                <p style={{ marginBottom: 6 }}>
                  <strong>{isVi ? "1. Hiệu suất Kinh doanh: " : "1. Business Performance: "}</strong>
                  {isVi
                    ? "Doanh thu đạt 4.829 Tỷ VND (+14.2% so với tháng trước). Đóng góp chính từ Tập đoàn Viễn thông Alpha (1.28 Tỷ VND)."
                    : "Revenue reached 4.829B VND (+14.2% MoM). Top contributor: Vien Thong Alpha Group (1.28B VND)."}
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>{isVi ? "2. Điểm nóng Rủi ro: " : "2. Risk Hotspots: "}</strong>
                  {isVi
                    ? "Ghi nhận 1 hợp đồng khẩn cấp (#087) hết hạn trong 5 ngày; 1 khách hàng VIP sụt giảm 30% đơn hàng."
                    : "1 critical contract (#087) expiring in 5 days; 1 VIP client showing 30% order decline."}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>{isVi ? "3. Khuyến nghị AI: " : "3. AI Recommendations: "}</strong>
                  {isVi
                    ? "Kích hoạt phòng Pháp chế chuẩn bị phụ lục gia hạn HĐ #087 và yêu cầu Kinh doanh tiếp xúc Cơ khí Đông Nam."
                    : "Activate Legal to prepare renewal addendum for #087; dispatch Sales to re-engage Dong Nam Mechanical."}
                </p>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              background: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            {isVi ? "Đóng" : "Close"}
          </button>
          <button
            onClick={() => {
              alert(isVi ? "Đã tải file PDF: GraphMind_Briefing_Oct2026.pdf" : "Downloaded: GraphMind_Briefing_Oct2026.pdf");
            }}
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: 6,
              background: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={13} />
            {isVi ? "Tải PDF Báo Cáo" : "Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeView({ onNavigate, role = "executive", currentUser, lang = "vi", t = {} }) {
  const isVi = lang === "vi";
  const [showBriefing, setShowBriefing] = useState(false);

  const userName = currentUser?.name || "Trần Thị Thu Hương";

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
      {showBriefing && <BriefingModal isVi={isVi} onClose={() => setShowBriefing(false)} />}

      {/* TOP HEADER: GREETING + SCOPE + ACTION BUTTON */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.02em",
              margin: "0 0 6px 0",
              fontFamily: "var(--f-display)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Xin chào, {userName} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "#475569", margin: 0, fontWeight: 400 }}>
            {isVi
              ? "Hệ thống hợp nhất dữ liệu bán hàng AdventureWorks và hợp đồng pháp lý CUAD đã sẵn sàng."
              : "AdventureWorks sales data and CUAD legal contracts are unified and ready."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              {isVi ? "Phạm vi quyền: " : "Access scope: "}
              <strong style={{ color: "#0f172a" }}>Unrestricted SME</strong>
            </span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Executive
            </span>
          </div>

          <button
            onClick={() => setShowBriefing(true)}
            style={{
              padding: "10px 18px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            <FileText size={15} />
            <span>{isVi ? "Tạo tóm tắt điều hành" : "Create executive briefing"}</span>
          </button>
        </div>
      </div>

      {/* SECTION: LỐI TẮT ĐIỀU HƯỚNG CHÍNH */}
      <div>
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: "750",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#94a3b8",
            marginBottom: "14px",
          }}
        >
          {isVi ? "LỐI TẮT ĐIỀU HƯỚNG CHÍNH" : "MAIN NAVIGATION SHORTCUTS"}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
          }}
        >
          {ALL_CARDS_DEF.map((card) => {
            const IconComp = card.Icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#93c5fd";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,0.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: card.iconBg,
                      color: card.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconComp size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: card.ctaColor,
                    }}
                  >
                    {isVi ? card.ctaVi : card.ctaEn}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "750",
                    color: "#0f172a",
                    margin: "0 0 6px 0",
                  }}
                >
                  {isVi ? card.labelVi : card.labelEn}
                </h3>
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#64748b",
                    lineHeight: "1.5",
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {isVi ? card.descVi : card.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: 2 COLUMNS (HOẠT ĐỘNG GẦN ĐÂY + TRẠNG THÁI RỦI RO) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.9fr 1.1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT: HOẠT ĐỘNG GẦN ĐÂY TRÊN HỆ THỐNG */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "750",
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                {isVi ? "Hoạt động gần đây trên hệ thống" : "Recent system activities"}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "2px 8px",
                  background: "#f1f5f9",
                  color: "#475569",
                  borderRadius: 20,
                  border: "1px solid #e2e8f0",
                }}
              >
                {isVi ? "4 sự kiện mới" : "4 new events"}
              </span>
            </div>

            <button
              onClick={() => onNavigate("reports")}
              style={{
                fontSize: "12.5px",
                color: "#2563eb",
                fontWeight: 600,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isVi ? "Xem tất cả" : "View all"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {RECENT_ACTIVITIES.slice(0, 3).map((act, idx) => {
              const AIcon = act.icon;
              return (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: idx < 2 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: act.iconBg,
                        color: act.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <AIcon size={16} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0f172a",
                          lineHeight: 1.4,
                        }}
                      >
                        {isVi ? act.titleVi : act.titleEn}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: 3 }}>
                        {isVi ? act.metaVi : act.metaEn}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {isVi ? act.timeVi : act.timeEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: TRẠNG THÁI RỦI RO TỨC THÌ */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "750",
                color: "#0f172a",
                margin: 0,
              }}
            >
              {isVi ? "Trạng thái rủi ro tức thì" : "Instant risk status"}
            </h3>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#eab308",
                display: "inline-block",
                boxShadow: "0 0 6px rgba(234,179,8,0.5)",
              }}
            />
          </div>

          <div
            style={{
              padding: "16px",
              background: "#fffbeb",
              border: "1px solid #fef08a",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#b45309",
                marginBottom: 6,
              }}
            >
              <ShieldAlert size={16} style={{ color: "#d97706" }} />
              <span>{isVi ? "2 hợp đồng cần rà soát gấp" : "2 contracts require urgent review"}</span>
            </div>
            <p
              style={{
                fontSize: "12.5px",
                color: "#92400e",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              {isVi
                ? "Có điều khoản miễn trừ trách nhiệm bất đối xứng được AI phát hiện trong CUAD_042."
                : "AI detected asymmetric liability clauses in CUAD_042."}
            </p>
          </div>

          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: "10px",
              padding: "18px 14px",
              textAlign: "center",
              background: "#f8fafc",
            }}
          >
            <Inbox size={22} style={{ color: "#94a3b8", margin: "0 auto 6px" }} />
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
              {isVi ? "Hàng đợi kiểm duyệt" : "Approval queue"}
            </div>
            <p style={{ fontSize: "11.5px", color: "#64748b", margin: "4px 0 0" }}>
              {isVi ? "Không có tài liệu nào chờ bạn phê duyệt lúc này." : "No documents awaiting your approval right now."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
