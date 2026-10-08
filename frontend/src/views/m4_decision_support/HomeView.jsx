import React, { useState } from "react";
import {
  Bot, Search, Share2, LayoutDashboard,
  MessageSquare, AlertTriangle, RefreshCw, FileEdit,
  ShieldAlert, Inbox, Sparkles, Wand2, Download, FileText,
  Activity, ArrowRight
} from "lucide-react";
import { Button, Badge, Card, Modal, PageHeader } from "../../components/ui";

const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    icon: MessageSquare,
    badgeVariant: "info",
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
    badgeVariant: "warning",
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
    badgeVariant: "success",
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
    badgeVariant: "purple",
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
    iconColor: "var(--blue, #2563EB)",
    iconBg: "var(--blue-soft, rgba(37,99,235,0.08))",
    labelVi: "AI Copilot",
    labelEn: "AI Copilot",
    ctaVi: "Vào hỏi AI",
    ctaEn: "Ask AI",
    descVi: "Hỏi đáp ngôn ngữ tự nhiên Hybrid GraphRAG, trích dẫn nguồn xác thực hợp đồng & CRM.",
    descEn: "Natural language Q&A with Hybrid GraphRAG, citing verified contract & CRM sources.",
    roles: ["executive", "knowledge_manager", "standard", "it_admin"],
  },
  {
    id: "search",
    Icon: Search,
    iconColor: "var(--cyan, #0891B2)",
    iconBg: "var(--cyan-soft, rgba(8,145,178,0.08))",
    labelVi: "Tìm kiếm đa chiều",
    labelEn: "Multi-facet Search",
    ctaVi: "Tra cứu",
    ctaEn: "Search",
    descVi: "Truy xuất kết hợp từ khóa và ngữ nghĩa qua Customer, Product, Contract và Clauses.",
    descEn: "Hybrid keyword & semantic retrieval across Customer, Product, Contract and Clauses.",
    roles: ["executive", "knowledge_manager", "standard", "it_admin"],
  },
  {
    id: "knowledge",
    Icon: Share2,
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.08)",
    labelVi: "Knowledge Graph",
    labelEn: "Knowledge Graph",
    ctaVi: "Khám phá",
    ctaEn: "Explore",
    descVi: "Khám phá mạng lưới liên kết thực thể, quan hệ pháp lý và đồ thị bằng chứng RAG.",
    descEn: "Explore entity network, legal relationships and GraphRAG evidence graph.",
    roles: ["executive", "knowledge_manager", "it_admin"],
  },
  {
    id: "executive",
    Icon: LayoutDashboard,
    iconColor: "var(--green, #059669)",
    iconBg: "var(--green-soft, rgba(5,150,105,0.08))",
    labelVi: "Dashboard Điều hành",
    labelEn: "Executive Dashboard",
    ctaVi: "Xem KPI",
    ctaEn: "View KPIs",
    descVi: "Theo dõi doanh thu, đối tác chiến lược và chỉ số rủi ro điều khoản tự động.",
    descEn: "Track revenue, strategic partners and automated clause risk indicators.",
    roles: ["executive"],
  },
];

export default function HomeView({ onNavigate, role = "executive", currentUser, lang = "vi", t = {} }) {
  const isVi = lang === "vi";
  const [showBriefing, setShowBriefing] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const userName = currentUser?.name || "Trần Thị Thu Hương";

  const handleGenerateBriefing = () => {
    setLoadingBriefing(true);
    setTimeout(() => setLoadingBriefing(false), 1400);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1400, margin: "0 auto", boxSizing: "border-box" }}>
      {/* ── MODAL: EXECUTIVE BRIEFING ───────────────────────── */}
      <Modal
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        title={isVi ? "Tạo Tóm Tắt Điều Hành Chiến Lược" : "Executive Strategic Briefing Generator"}
        subtitle={isVi ? "Tự động trích xuất & tổng hợp tri thức điều hành từ Hybrid GraphRAG" : "AI-driven synthesis of cross-functional enterprise KPIs"}
        maxWidth="640px"
        footer={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <Button variant="secondary" size="md" onClick={() => setShowBriefing(false)}>
              {isVi ? "Đóng" : "Close"}
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Download}
              onClick={() => {
                alert(isVi ? "Đã tải file PDF: GraphMind_Briefing_Oct2026.pdf" : "Downloaded: GraphMind_Briefing_Oct2026.pdf");
              }}
            >
              {isVi ? "Tải PDF Báo Cáo" : "Export PDF"}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Button
            variant="primary"
            size="md"
            icon={Wand2}
            loading={loadingBriefing}
            fullWidth
            onClick={handleGenerateBriefing}
          >
            {loadingBriefing
              ? isVi
                ? "Đang tổng hợp báo cáo bằng AI..."
                : "Synthesizing briefing..."
              : isVi
              ? "Tạo báo cáo tổng hợp bằng AI"
              : "Generate AI-synthesized report"}
          </Button>

          <div
            style={{
              padding: "16px",
              background: "var(--surface-2, #F8FAFC)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: "var(--r-md, 8px)",
              fontSize: "13px",
              color: "var(--text-2, #334155)",
              lineHeight: 1.6,
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {loadingBriefing ? (
              <div style={{ color: "var(--text-3, #64748B)", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                {isVi ? "Đang truy vấn đồ thị tri thức & hợp đồng CUAD..." : "Synthesizing KPI & clause risk data..."}
              </div>
            ) : (
              <>
                <strong
                  style={{
                    color: "var(--text-1, #0F172A)",
                    borderBottom: "1px solid var(--border, #E2E8F0)",
                    display: "block",
                    paddingBottom: "8px",
                    marginBottom: "10px",
                    fontFamily: "var(--f-display, inherit)",
                  }}
                >
                  {isVi ? "BÁO CÁO ĐIỀU HÀNH TỔNG HỢP — THÁNG 10/2026" : "EXECUTIVE SUMMARY REPORT — OCTOBER 2026"}
                </strong>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "1. Hiệu suất Kinh doanh: " : "1. Business Performance: "}</strong>
                  {isVi
                    ? "Doanh thu đạt 4.829 Tỷ VND (+14.2% MoM). Đóng góp chính từ Tập đoàn Viễn thông Alpha (1.28 Tỷ VND)."
                    : "Revenue reached 4.829B VND (+14.2% MoM). Top contributor: Vien Thong Alpha Group (1.28B VND)."}
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "2. Điểm nóng Rủi ro: " : "2. Risk Hotspots: "}</strong>
                  {isVi
                    ? "Ghi nhận 1 hợp đồng khẩn cấp (#087) hết hạn trong 5 ngày; 1 khách hàng VIP sụt giảm 30% đơn hàng."
                    : "1 critical contract (#087) expiring in 5 days; 1 VIP client showing 30% order decline."}
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "3. Khuyến nghị AI: " : "3. AI Recommendations: "}</strong>
                  {isVi
                    ? "Kích hoạt phòng Pháp chế chuẩn bị phụ lục gia hạn HĐ #087 và yêu cầu Kinh doanh tiếp xúc Cơ khí Đông Nam."
                    : "Activate Legal to prepare renewal addendum for #087; dispatch Sales to re-engage Dong Nam Mechanical."}
                </p>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <PageHeader
        title={isVi ? `Xin chào, ${userName}` : `Welcome back, ${userName}`}
        subtitle={
          isVi
            ? "Hệ thống tri thức hợp nhất dữ liệu bán hàng AdventureWorks và hợp đồng pháp lý CUAD đã sẵn sàng phục vụ ra quyết định."
            : "Unified knowledge platform integrating AdventureWorks sales records and CUAD contracts is active and ready."
        }
        badge={isVi ? (currentUser?.badge || "Executive Director") : (currentUser?.badgeEn || "Executive Director")}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={FileText}
            onClick={() => setShowBriefing(true)}
          >
            {isVi ? "Tạo tóm tắt điều hành" : "Create executive briefing"}
          </Button>
        }
      />

      {/* ── SECTION: LỐI TẮT ĐIỀU HƯỚNG CHÍNH ───────────────── */}
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-4, #94A3B8)",
            marginBottom: "12px",
          }}
        >
          {isVi ? "LỐI TẮT ĐIỀU HƯỚNG CHÍNH" : "MAIN NAVIGATION SHORTCUTS"}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {ALL_CARDS_DEF.map((card) => {
            const IconComp = card.Icon;
            return (
              <Card
                key={card.id}
                hoverable
                onClick={() => onNavigate(card.id)}
                padding="18px 20px"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "var(--r-md, 8px)",
                        background: card.iconBg,
                        color: card.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconComp size={18} strokeWidth={2} />
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--blue, #2563EB)",
                      }}
                    >
                      <span>{isVi ? card.ctaVi : card.ctaEn}</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--text-1, #0F172A)",
                      margin: "0 0 6px 0",
                      fontFamily: "var(--f-display, inherit)",
                    }}
                  >
                    {isVi ? card.labelVi : card.labelEn}
                  </h3>

                  <p
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-3, #64748B)",
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {isVi ? card.descVi : card.descEn}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: 2 COLUMNS (RECENT ACTIVITIES + INSTANT RISK) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT: RECENT SYSTEM ACTIVITIES */}
        <Card
          title={isVi ? "Hoạt động gần đây trên hệ thống" : "Recent System Activities"}
          subtitle={isVi ? "Cập nhật thời gian thực từ AEGIS Agent và Copilot" : "Real-time stream from AEGIS Agent and Copilot"}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")}>
              {isVi ? "Xem tất cả" : "View all"}
            </Button>
          }
          padding="0"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {RECENT_ACTIVITIES.slice(0, 4).map((act, idx) => {
              const AIcon = act.icon;
              return (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "14px",
                    padding: "16px 20px",
                    borderBottom: idx < 3 ? "1px solid var(--border-subtle, #EDF2F7)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "var(--r-md, 8px)",
                        background: "var(--surface-3, #EDF2F7)",
                        color: "var(--text-2, #334155)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <AIcon size={16} strokeWidth={2} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-1, #0F172A)",
                          lineHeight: 1.4,
                        }}
                      >
                        {isVi ? act.titleVi : act.titleEn}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-3, #64748B)", marginTop: "3px" }}>
                        {isVi ? act.metaVi : act.metaEn}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "var(--text-4, #94A3B8)",
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
        </Card>

        {/* RIGHT: INSTANT RISK HOTSPOT */}
        <Card
          title={isVi ? "Đài quan sát rủi ro tức thì" : "Instant Risk Observatory"}
          subtitle={isVi ? "Phát hiện tự động bởi mô hình GraphRAG" : "Automated triggers from GraphRAG reasoning"}
          padding="20px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                padding: "16px",
                background: "var(--amber-soft, rgba(217,119,6,0.08))",
                border: "1px solid rgba(217,119,6,0.25)",
                borderRadius: "var(--r-md, 8px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  color: "var(--amber, #D97706)",
                  marginBottom: "6px",
                }}
              >
                <ShieldAlert size={16} strokeWidth={2} />
                <span>{isVi ? "2 hợp đồng cần rà soát khẩn" : "2 contracts require urgent review"}</span>
              </div>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "var(--text-2, #334155)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {isVi
                  ? "Điều khoản miễn trừ trách nhiệm bất đối xứng (Unilateral Liability Cap) được AI phát hiện trong CUAD_042 và hợp đồng #087 hết hạn trong 5 ngày."
                  : "AI detected unilateral liability exclusion in CUAD_042 and framework agreement #087 expires in 5 days."}
              </p>
              <div style={{ marginTop: "12px" }}>
                <Button variant="dangerSoft" size="sm" onClick={() => onNavigate("risk")}>
                  {isVi ? "Xem chi tiết rủi ro →" : "Inspect risk details →"}
                </Button>
              </div>
            </div>

            <div
              style={{
                border: "1px dashed var(--border-strong, #CBD5E1)",
                borderRadius: "var(--r-md, 8px)",
                padding: "20px 16px",
                textAlign: "center",
                background: "var(--surface-2, #F8FAFC)",
              }}
            >
              <Inbox size={22} style={{ color: "var(--text-4, #94A3B8)", margin: "0 auto 8px" }} />
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2, #334155)" }}>
                {isVi ? "Hàng đợi kiểm duyệt HITL" : "HITL Approval Queue"}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3, #64748B)", margin: "4px 0 0" }}>
                {isVi ? "Hiện tại không có thực thể nào chờ phê duyệt." : "No entity extractions currently awaiting validation."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
