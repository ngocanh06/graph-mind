import React, { useState, useEffect } from "react";
import {
  Bot, Search, Share2, LayoutDashboard,
  MessageSquare, AlertTriangle, RefreshCw, FileEdit,
  ShieldAlert, Inbox, Sparkles, Wand2, Download, FileText,
  Activity, ArrowRight, DollarSign, Clock, TrendingDown, CheckCircle2,
  ExternalLink, Building2, ChevronRight, Check, Database, BarChart2
} from "lucide-react";
import { Button, Badge, Card, Modal, PageHeader } from "../../components/ui";
import {
  fetchAssignedContracts,
  fetchRecentActivities,
  generateExecutiveBriefing,
  fetchRiskAlerts
} from "../../services/api";

const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    icon: MessageSquare,
    badgeVariant: "info",
    titleVi: 'Truy vấn AI Copilot: "Rà soát điều khoản bồi thường Hợp đồng CUAD_042"',
    titleEn: 'AI Copilot query: "Review indemnification clauses in Contract CUAD_042"',
    metaVi: "Thực hiện bởi Nguyễn Văn Nam (Kinh doanh) • Đã trích dẫn 3 nguồn",
    metaEn: "By Nguyễn Văn Nam (Sales) • 3 sources cited",
    timeVi: "12 phút trước",
    timeEn: "12 min ago",
  },
  {
    id: "act-2",
    icon: AlertTriangle,
    badgeVariant: "warning",
    titleVi: "Cảnh báo rủi ro hợp đồng: HĐ Cung ứng linh kiện #087 hết hạn trong 5 ngày",
    titleEn: "Contract risk alert: Supply contract #087 expiring in 5 days",
    metaVi: "Hệ thống tự động chuyển cảnh báo tới chuyên viên kinh doanh phụ trách",
    metaEn: "System alert dispatched to assigned sales specialist",
    timeVi: "1 giờ trước",
    timeEn: "1h ago",
  },
  {
    id: "act-3",
    icon: TrendingDown,
    badgeVariant: "danger",
    titleVi: "Cảnh báo sụt giảm: Khách hàng VIP Công ty Cơ khí Đông Nam giảm 30% đơn hàng",
    titleEn: "Order cadence drop: VIP client Dong Nam Mechanics reduced orders by 30%",
    metaVi: "Phân tích tự động từ dữ liệu bán hàng AdventureWorks ERP",
    metaEn: "Automated telemetry from AdventureWorks ERP sales data",
    timeVi: "3 giờ trước",
    timeEn: "3h ago",
  },
  {
    id: "act-4",
    icon: FileText,
    badgeVariant: "purple",
    titleVi: "Tra cứu hồ sơ khách hàng: CUST-8491 Tập đoàn Viễn thông Alpha",
    titleEn: "Client profile lookup: CUST-8491 Alpha Telecom Group",
    metaVi: "Đối soát điều khoản thanh toán & doanh số 1.28 Tỷ VNĐ",
    metaEn: "Reconciliation of payment terms & 1.28B VND pipeline",
    timeVi: "Hôm qua",
    timeEn: "Yesterday",
  },
];

// Danh sách hợp đồng thực tế của chuyên viên kinh doanh phụ trách
const SALES_CONTRACTS = [
  {
    id: "CUAD_087",
    docId: "CUAD_087",
    nameVi: "Hợp đồng Cung cấp Linh kiện #087",
    nameEn: "Component Supply Framework Agreement #087",
    customer: "Tập đoàn Viễn thông Alpha",
    customerId: "CUST-8491",
    value: "1,280,000,000 ₫",
    expiryDate: "05/11/2026",
    daysLeft: 5,
    status: "critical", // critical, warning, safe
    statusLabelVi: "Hết hạn trong 5 ngày",
    statusLabelEn: "Expires in 5 days",
    riskNoteVi: "Không có điều khoản tự động gia hạn, cần tái ký khẩn",
    riskNoteEn: "No auto-renewal clause, urgent renewal required",
  },
  {
    id: "CUAD_042",
    docId: "CUAD_042",
    nameVi: "Hợp đồng Dịch vụ Phần mềm & Bảo trì",
    nameEn: "Software & Maintenance Service Agreement",
    customer: "Công ty Cơ khí Đông Nam",
    customerId: "CUST-3912",
    value: "950,000,000 ₫",
    expiryDate: "28/11/2026",
    daysLeft: 28,
    status: "warning",
    statusLabelVi: "Sắp đáo hạn (28 ngày)",
    statusLabelEn: "Expiring soon (28 days)",
    riskNoteVi: "Khách hàng giảm 30% đơn hàng, cần tiếp xúc chăm sóc",
    riskNoteEn: "Client orders dropped 30%, account engagement required",
  },
  {
    id: "CUAD_104",
    docId: "CUAD_104",
    nameVi: "Hợp đồng Đại lý Phân phối Độc quyền",
    nameEn: "Exclusive Distributor Partnership Agreement",
    customer: "Logistics Toàn Cầu Tech",
    customerId: "CUST-1044",
    value: "740,000,000 ₫",
    expiryDate: "15/12/2026",
    daysLeft: 45,
    status: "safe",
    statusLabelVi: "Đang hiệu lực (45 ngày)",
    statusLabelEn: "Active (45 days left)",
    riskNoteVi: "Chuẩn bị phụ lục mở rộng danh mục sản phẩm",
    riskNoteEn: "Prepare product scope expansion addendum",
  },
  {
    id: "CUAD_115",
    docId: "CUAD_115",
    nameVi: "Hợp đồng Nguyên tắc Bán buôn Phụ tùng",
    nameEn: "Wholesale Parts Master Agreement",
    customer: "Doanh nghiệp Tư nhân Minh Phát",
    customerId: "CUST-4102",
    value: "520,000,000 ₫",
    expiryDate: "20/03/2027",
    daysLeft: 140,
    status: "safe",
    statusLabelVi: "Đang hiệu lực",
    statusLabelEn: "Active",
    riskNoteVi: "Chậm phát sinh đơn hàng trong 30 ngày qua",
    riskNoteEn: "No new orders placed in past 30 days",
  },
  {
    id: "CUAD_203",
    docId: "CUAD_203",
    nameVi: "Hợp đồng Cung ứng Dịch vụ Vận tải",
    nameEn: "Logistics Transportation Master Contract",
    customer: "Công ty CP Vận tải Biển Đông",
    customerId: "CUST-5519",
    value: "410,000,000 ₫",
    expiryDate: "10/05/2027",
    daysLeft: 190,
    status: "safe",
    statusLabelVi: "Đang hiệu lực",
    statusLabelEn: "Active",
    riskNoteVi: "Tuân thủ điều khoản thanh toán 100%",
    riskNoteEn: "100% compliant payment cadence",
  },
];

// Phím tắt tác nghiệp chuyên biệt cho Nhân viên Kinh doanh (Standard Role)
const EMPLOYEE_SHORTCUTS = [
  {
    id: "search",
    Icon: Search,
    iconColor: "var(--cyan, #0891B2)",
    iconBg: "var(--cyan-soft, rgba(8,145,178,0.08))",
    labelVi: "Tìm kiếm thông minh",
    labelEn: "Smart Search",
    ctaVi: "Tra cứu ngay",
    ctaEn: "Search now",
    descVi: "Tra cứu tức thì khách hàng, đơn hàng ERP AdventureWorks và điều khoản hợp đồng.",
    descEn: "Instantly lookup customers, ERP AdventureWorks orders, and contract clauses.",
  },
  {
    id: "copilot",
    Icon: Bot,
    iconColor: "var(--blue, #2563EB)",
    iconBg: "var(--blue-soft, rgba(37,99,235,0.08))",
    labelVi: "Trợ lý AI Copilot",
    labelEn: "AI Copilot",
    ctaVi: "Hỏi đáp AI",
    ctaEn: "Ask Copilot",
    descVi: "Trợ lý đàm phán hợp đồng, phân tích điều khoản phạt & soạn thảo phụ lục gia hạn.",
    descEn: "Negotiation assistant: analyze penalty clauses & draft contract renewal addendums.",
  },
  {
    id: "documents",
    Icon: FileText,
    iconColor: "#059669",
    iconBg: "rgba(5,150,105,0.08)",
    labelVi: "Kho hợp đồng Kinh doanh",
    labelEn: "Sales Documents",
    ctaVi: "Xem chi tiết",
    ctaEn: "View details",
    descVi: "Khám phá 510 tài liệu hợp đồng CUAD và bảng kê dữ liệu bán hàng AdventureWorks.",
    descEn: "Explore 510 CUAD contracts and AdventureWorks sales datasets (Read-Only).",
  },
  {
    id: "risk",
    Icon: AlertTriangle,
    iconColor: "#D97706",
    iconBg: "rgba(217,119,6,0.08)",
    labelVi: "Cảnh báo rủi ro Kinh doanh",
    labelEn: "Sales Risk Alerts",
    ctaVi: "Xử lý rủi ro",
    ctaEn: "Handle risks",
    descVi: "Giám sát 2 cảnh báo khẩn: hợp đồng sắp hết hạn (5 ngày) và sụt giảm đơn hàng.",
    descEn: "Monitor 2 critical alerts: expiring contracts (5 days) and client order drops.",
  },
  {
    id: "reports",
    Icon: Activity,
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.08)",
    labelVi: "Báo cáo ca làm việc",
    labelEn: "Shift Reports",
    ctaVi: "Xem báo cáo",
    ctaEn: "View reports",
    descVi: "Theo dõi số lượng ca việc đã xử lý, doanh số bảo vệ và điểm tuân thủ SOP.",
    descEn: "Track resolved cases, protected revenue pipeline, and SOP compliance score.",
  },
];

const EXECUTIVE_CARDS = [
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
    roles: ["executive", "it_admin"],
  },
  {
    id: "reports",
    Icon: BarChart2,
    iconColor: "#7c3aed",
    iconBg: "rgba(124, 58, 237, 0.08)",
    labelVi: "Báo cáo phòng ban",
    labelEn: "Department Reports",
    ctaVi: "Xem báo cáo",
    ctaEn: "View Reports",
    descVi: "Theo dõi các chỉ số hoạt động, rà soát văn bản và ký duyệt báo cáo phòng ban.",
    descEn: "Track departmental metrics, review documents and sign off reports.",
    roles: ["knowledge_manager"],
  },
  {
    id: "risk",
    Icon: AlertTriangle,
    iconColor: "#D97706",
    iconBg: "rgba(217,119,6,0.08)",
    labelVi: "Cảnh báo rủi ro toàn diện",
    labelEn: "Enterprise Risk Center",
    ctaVi: "Xem rủi ro",
    ctaEn: "View risks",
    descVi: "Phát hiện sớm các bất thường pháp lý và suy giảm doanh thu toàn doanh nghiệp (BR-05).",
    descEn: "Early detection of legal anomalies and enterprise-wide revenue dips (BR-05).",
    roles: ["executive", "it_admin"],
  },
  {
    id: "risk",
    Icon: AlertTriangle,
    iconColor: "#D97706",
    iconBg: "rgba(217,119,6,0.08)",
    labelVi: "Cảnh báo rủi ro phòng ban",
    labelEn: "Department Risk Alerts",
    ctaVi: "Xem rủi ro",
    ctaEn: "View risks",
    descVi: "Giám sát hợp đồng sắp mãn hạn và biến động đơn hàng trong phạm vi phòng ban (BR-02/BR-04).",
    descEn: "Track expiring contracts and order cadence dips within assigned department scope (BR-02/BR-04).",
    roles: ["knowledge_manager"],
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
    id: "copilot",
    Icon: Bot,
    iconColor: "var(--blue, #2563EB)",
    iconBg: "var(--blue-soft, rgba(37,99,235,0.08))",
    labelVi: "AI Copilot Chiến lược",
    labelEn: "Strategic AI Copilot",
    ctaVi: "Vào hỏi AI",
    ctaEn: "Ask AI",
    descVi: "Hỏi đáp ngôn ngữ tự nhiên Hybrid GraphRAG, trích dẫn nguồn xác thực hợp đồng & CRM.",
    descEn: "Natural language Q&A with Hybrid GraphRAG, citing verified contract & CRM sources.",
    roles: ["executive", "knowledge_manager", "it_admin", "standard"],
  },
];

export default function HomeView({ onNavigate, role = "executive", currentUser, lang = "vi", t = {} }) {
  const isVi = lang === "vi";
  const isStandardSales = role === "standard" || role === "sales" || currentUser?.roleKey === "SALES_OPS" || currentUser?.id === "standard";
  const isExec = role === "executive" || role === "it_admin" || currentUser?.id === "executive" || currentUser?.id === "it_admin";
  const isManager = role === "knowledge_manager" || currentUser?.id === "knowledge_manager";
  const [showBriefing, setShowBriefing] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [liveActivities, setLiveActivities] = useState([]);
  const [riskCount, setRiskCount] = useState(13);

  const [liveContracts, setLiveContracts] = useState([]);
  const [liveRiskSummary, setLiveRiskSummary] = useState(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);

  const userName = currentUser?.name || (isStandardSales ? "Nguyễn V. Nam" : (isVi ? "Tổng Giám Đốc" : "Executive Director"));

  // Truy vấn dữ liệu thực tế từ Qdrant & Neo4j backend
  useEffect(() => {
    let active = true;
    setIsLoadingLive(true);
    Promise.all([
      fetchAssignedContracts(role, "Kinh doanh", 6),
      fetchRiskAlerts(role, "Kinh doanh")
    ]).then(([contractsRes, riskRes]) => {
      if (!active) return;
      if (contractsRes && contractsRes.success && contractsRes.data?.length > 0) {
        setLiveContracts(contractsRes.data);
      }
      if (riskRes && riskRes.success) {
        setLiveRiskSummary(riskRes.summary);
      }
      setIsLoadingLive(false);
    }).catch(() => {
      if (active) setIsLoadingLive(false);
    });
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    fetchRecentActivities(4).then((res) => {
      if (res && res.success && res.data && res.data.length > 0) {
        setLiveActivities(res.data);
      }
    }).catch(() => {});

    fetchRiskAlerts().then((res) => {
      if (res && res.success) {
        setRiskCount(res.totalAlerts || 13);
      }
    }).catch(() => {});
  }, []);

  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await generateExecutiveBriefing("month", "executive");
      if (res && res.briefing) {
        setBriefingText(res.briefing);
      }
    } catch (err) {
      console.warn("[HomeView] Briefing error:", err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const contractsToRender = liveContracts.length > 0 ? liveContracts : SALES_CONTRACTS;

  // =========================================================================
  // GIAO DIỆN PHÂN QUYỀN: BÀN LÀM VIỆC NHÂN VIÊN KINH DOANH (STANDARD USER)
  // US23, US39: Ẩn KPI vĩ mô Ban Giám đốc, hiện danh sách hợp đồng & phím tắt
  // =========================================================================
  if (isStandardSales) {
    return (
      <div style={{ padding: "28px 32px 48px", maxWidth: 1400, margin: "0 auto", boxSizing: "border-box" }}>
        {/* ── HEADER BAN NGHIEP VU ────────────────────────────── */}
        <PageHeader
          title={isVi ? `Bàn làm việc Kinh doanh — ${userName}` : `Sales Operations Workspace — ${userName}`}
          subtitle={
            isVi
              ? "Theo dõi danh sách hợp đồng phụ trách, xử lý cảnh báo rủi ro khách hàng và sử dụng phím tắt tác nghiệp nhanh."
              : "Monitor assigned customer contracts, resolve operational risk alerts, and access quick workflow shortcuts."
          }
          badge={isVi ? "Chuyên viên Kinh doanh · Phòng Kinh doanh" : "Sales Executive · Sales Dept"}
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <Button
                variant="primary"
                size="md"
                icon={Bot}
                onClick={() => onNavigate("copilot")}
              >
                {isVi ? "Hỏi đáp AI Copilot" : "Ask AI Copilot"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={Search}
                onClick={() => onNavigate("search")}
              >
                {isVi ? "Tìm kiếm thông minh" : "Smart Search"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                icon={AlertTriangle}
                onClick={() => onNavigate("risk")}
                style={{ color: "var(--amber, #D97706)" }}
              >
                {isVi ? "Cảnh báo rủi ro (2)" : "Risk Alerts (2)"}
              </Button>
            </div>
          }
        />

        {/* ── SECTION 1: PHÍM TẮT TÁC NGHIỆP CỦA NHÂN VIÊN ───── */}
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
            {isVi ? "PHÍM TẮT TÁC NGHIỆP NHÂN VIÊN (QUICK WORKFLOWS)" : "EMPLOYEE WORKFLOW SHORTCUTS"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "16px",
            }}
          >
            {EMPLOYEE_SHORTCUTS.map((item) => {
              const IconComp = item.Icon;
              return (
                <Card
                  key={item.id}
                  hoverable
                  onClick={() => onNavigate(item.id)}
                  padding="18px 20px"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: "14px",
                    border: "1px solid var(--border-subtle, #E2E8F0)",
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
                          borderRadius: "10px",
                          background: item.iconBg,
                          color: item.iconColor,
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
                        <span>{isVi ? item.ctaVi : item.ctaEn}</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: "14.5px",
                        fontWeight: 700,
                        color: "var(--text-1, #0F172A)",
                        margin: "0 0 6px 0",
                      }}
                    >
                      {isVi ? item.labelVi : item.labelEn}
                    </h3>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-3, #64748B)",
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      {isVi ? item.descVi : item.descEn}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: BÁO ĐỘNG TÁC NGHIỆP CẦN XỬ LÝ GẤP ────── */}
        <div
          style={{
            marginBottom: "28px",
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(245,158,11,0.08) 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "14px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 280 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "rgba(220,38,38,0.12)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#991B1B" }}>
                {isVi ? "2 Cảnh báo rủi ro phòng Kinh doanh cần xử lý trong ca" : "2 Sales Risk Alerts Require Attention"}
              </div>
              <div style={{ fontSize: "12.5px", color: "#7F1D1D", marginTop: "2px" }}>
                {isVi
                  ? "HĐ #087 (Viễn thông Alpha) hết hạn sau 5 ngày & Khách hàng Cơ khí Đông Nam giảm 30% đơn hàng."
                  : "Contract #087 (Alpha Telecom) expires in 5 days & Dong Nam Mechanics dropped orders by 30%."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Button
              variant="danger"
              size="sm"
              icon={Bot}
              onClick={() => onNavigate("copilot")}
            >
              {isVi ? "Xử lý với AI Copilot" : "Resolve with Copilot"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate("risk")}
            >
              {isVi ? "Xem chi tiết rủi ro →" : "View Risk Details →"}
            </Button>
          </div>
        </div>

        {/* ── SECTION 3: DANH SÁCH HỢP ĐỒNG PHÒNG KINH DOANH PHỤ TRÁCH ── */}
        <div style={{ marginBottom: "32px" }}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>{isVi ? "Danh sách Hợp đồng Khách hàng phụ trách (Active Contracts)" : "Assigned Client Contracts"}</span>
                {liveContracts.length > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.25)" }}>
                    ● Live Neo4j & Qdrant
                  </span>
                )}
              </div>
            }
            subtitle={
              isVi
                ? "Dữ liệu hợp đồng CUAD & đối tác CRM AdventureWorks thật từ Qdrant Vector DB và Neo4j Graph DB."
                : "Live CUAD contracts & AdventureWorks CRM partners from Qdrant Vector DB and Neo4j Graph DB."
            }
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={FileText}
                onClick={() => onNavigate("documents")}
              >
                {isVi ? "Mở Kho tài liệu →" : "Open Documents →"}
              </Button>
            }
            padding="0"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2, #F8FAFC)", borderBottom: "1px solid var(--border-subtle, #E2E8F0)", color: "var(--text-3, #64748B)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 18px" }}>{isVi ? "Mã & Tên Hợp đồng" : "Contract & ID"}</th>
                    <th style={{ padding: "12px 18px" }}>{isVi ? "Khách hàng / Đối tác" : "Customer / Client"}</th>
                    <th style={{ padding: "12px 18px" }}>{isVi ? "Giá trị Hợp đồng" : "Value"}</th>
                    <th style={{ padding: "12px 18px" }}>{isVi ? "Thời hạn" : "Expiry"}</th>
                    <th style={{ padding: "12px 18px" }}>{isVi ? "Tình trạng rủi ro" : "Risk Status"}</th>
                    <th style={{ padding: "12px 18px", textAlign: "center" }}>{isVi ? "Thao tác" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {contractsToRender.map((contract, idx) => {
                    const isCritical = contract.status === "critical";
                    const isWarning = contract.status === "warning";
                    return (
                      <tr
                        key={contract.id}
                        style={{
                          borderBottom: idx < SALES_CONTRACTS.length - 1 ? "1px solid var(--border-subtle, #EDF2F7)" : "none",
                          background: isCritical ? "rgba(239,68,68,0.02)" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                background: isCritical ? "rgba(220,38,38,0.1)" : isWarning ? "rgba(217,119,6,0.1)" : "rgba(37,99,235,0.08)",
                                color: isCritical ? "#DC2626" : isWarning ? "#D97706" : "#2563EB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                cursor: "pointer",
                              }}
                              onClick={() => onNavigate("documents", contract.docId || contract.id)}
                              title={isVi ? "Xem văn bản gốc" : "View raw document"}
                            >
                              <FileText size={16} />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text-1, #0F172A)",
                                  cursor: "pointer",
                                }}
                                onClick={() => onNavigate("documents", contract.docId || contract.id)}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary, #2563EB)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-1, #0F172A)")}
                                title={isVi ? "Xem chi tiết file PDF hợp đồng" : "View contract PDF details"}
                              >
                                {isVi ? contract.nameVi : contract.nameEn}
                              </div>
                              <span style={{ fontSize: "11px", fontFamily: "var(--f-mono)", color: "var(--text-3, #64748B)" }}>
                                ID: {contract.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-1, #0F172A)" }}>
                            {contract.customer}
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-4, #94A3B8)" }}>
                            {contract.customerId}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-1, #0F172A)" }}>
                          {contract.value}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 600, color: isCritical ? "#DC2626" : "var(--text-1, #0F172A)" }}>
                            {contract.expiryDate}
                          </div>
                          <span style={{ fontSize: "11.5px", color: isCritical ? "#DC2626" : isWarning ? "#D97706" : "var(--text-3, #64748B)" }}>
                            {isVi ? `Còn ${contract.daysLeft} ngày` : `${contract.daysLeft} days remaining`}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 9px",
                              borderRadius: "999px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              background: isCritical ? "rgba(220,38,38,0.1)" : isWarning ? "rgba(217,119,6,0.1)" : "rgba(16,185,129,0.1)",
                              color: isCritical ? "#DC2626" : isWarning ? "#D97706" : "#059669",
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}></span>
                            {isVi ? contract.statusLabelVi : contract.statusLabelEn}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onNavigate("documents", contract.docId || contract.id)}
                            >
                              {isVi ? "Xem chi tiết" : "View Details"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Bot}
                              onClick={() => onNavigate("copilot")}
                              title={isVi ? "Hỏi Copilot về hợp đồng này" : "Ask Copilot about this contract"}
                            >
                              Copilot
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── SECTION 4: HOẠT ĐỘNG GẦN ĐÂY CỦA CHUYÊN VIÊN ────── */}
        <Card
          title={isVi ? "Nhật ký tác nghiệp gần đây (Activity Feed)" : "Recent Operational Activity"}
          subtitle={isVi ? "Nhật ký truy vấn Copilot và xử lý rủi ro của bạn" : "Your Copilot queries and resolved cases"}
          padding="0"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {RECENT_ACTIVITIES.map((act, idx) => {
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
                    borderBottom: idx < RECENT_ACTIVITIES.length - 1 ? "1px solid var(--border-subtle, #EDF2F7)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "8px",
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
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN EXECUTIVE / C-LEVEL (KHI ĐĂNG NHẬP VAI TRÒ EXECUTIVE / ADMIN)
  // =========================================================================

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
                {isVi ? "Đang truy vấn đồ thị tri thức & gọi mô hình AI Ollama..." : "Synthesizing KPI & clause risk data via AI..."}
              </div>
            ) : briefingText ? (
              <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "var(--text-1)", lineHeight: 1.6 }}>
                {briefingText}
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
                  {isVi ? "BÁO CÁO ĐIỀU HÀNH TỔNG HỢP (GRAPH KNOWLEDGE)" : "EXECUTIVE SUMMARY REPORT"}
                </strong>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "1. Hiệu suất Kinh doanh: " : "1. Business Performance: "}</strong>
                  {isVi
                    ? "Tổng doanh thu đạt $123.22M USD trên 31,465 đơn hàng AdventureWorks. Top khách hàng VIP: Roger Harui ($989K)."
                    : "Total revenue reached $123.22M USD over 31,465 orders. Top VIP: Roger Harui ($989K)."}
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "2. Điểm nóng Rủi ro: " : "2. Risk Hotspots: "}</strong>
                  {isVi
                    ? "Phát hiện 5 hợp đồng thiếu điều khoản giới hạn trách nhiệm (Limitation of Liability); 4 giao dịch lớn cần phê duyệt."
                    : "Detected 5 contracts lacking liability cap clauses; 4 high-value orders awaiting executive sign-off."}
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "var(--text-1)" }}>{isVi ? "3. Khuyến nghị AI: " : "3. AI Recommendations: "}</strong>
                  {isVi
                    ? "Bấm nút 'Tạo báo cáo tổng hợp bằng AI' ở trên để mô hình Ollama (Qwen2.5) sinh bản phân tích chiến lược mới nhất."
                    : "Click 'Generate AI-synthesized report' above to run live analysis via Ollama model."}
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
          isExec ? (
            <Button
              variant="primary"
              size="md"
              icon={FileText}
              onClick={() => setShowBriefing(true)}
            >
              {isVi ? "Tạo tóm tắt điều hành" : "Create executive briefing"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={BarChart2}
              onClick={() => onNavigate("reports")}
            >
              {isVi ? "Xem báo cáo phòng ban" : "View Department Reports"}
            </Button>
          )
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
          {EXECUTIVE_CARDS.filter(card => !card.roles || card.roles.includes(role)).map((card) => {
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
            {(liveActivities.length > 0 ? liveActivities : RECENT_ACTIVITIES.slice(0, 4)).map((act, idx) => {
              const AIcon = act.icon || DollarSign;
              return (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "14px",
                    padding: "16px 20px",
                    borderBottom: idx < RECENT_ACTIVITIES.length - 1 ? "1px solid var(--border-subtle, #EDF2F7)" : "none",
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
                        {act.title || (isVi ? act.titleVi : act.titleEn)}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-3, #64748B)", marginTop: "3px" }}>
                        {act.description || (isVi ? act.metaVi : act.metaEn)}
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
                    {act.timestamp || (isVi ? act.timeVi : act.timeEn)}
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
                <span>{isVi ? `${riskCount} cảnh báo rủi ro hợp đồng & giao dịch` : `${riskCount} active legal & order risks`}</span>
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
                  ? "Neo4j phát hiện 5 hợp đồng thiếu điều khoản giới hạn trách nhiệm (Limitation of Liability), 4 hợp đồng thiếu cam kết bồi thường và 4 giao dịch vượt ngưỡng $25,000 USD."
                  : "Neo4j identified 5 contracts lacking liability limitation clauses, 4 lacking indemnification, and 4 sales orders exceeding $25,000 USD."}
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
