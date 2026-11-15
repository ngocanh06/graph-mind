import React, { useState, useEffect } from "react";
import { Button, Badge, Card, Modal, PageHeader, StatCard } from "../../components/ui";
import {
  fetchAssignedContracts,
  fetchRecentActivities,
  generateExecutiveBriefing,
  fetchRiskAlerts
} from "../../services/api";

const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    icon: "fa-solid fa-comment-dots",
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
    icon: "fa-solid fa-triangle-exclamation",
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
    icon: "fa-solid fa-arrow-trend-down",
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
    icon: "fa-solid fa-file-lines",
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
    id: "CUAD_001",
    docId: "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf",
    nameVi: "Hợp đồng Hợp tác Khoa học ADURO BIOTECH",
    nameEn: "ADURO BIOTECH Collaboration Agreement",
    customer: "Metro Metals Co.",
    customerId: "CUST-29818",
    value: "$953,630 USD",
    expiryDate: "Hợp đồng mở (Open-ended)",
    daysLeft: null,
    status: "critical",
    statusLabelVi: "Thiếu điều khoản giới hạn trách nhiệm",
    statusLabelEn: "Missing liability cap",
    riskNoteVi: "Đồ thị Neo4j ghi nhận hợp đồng thiếu điều khoản Limitation of Liability",
    riskNoteEn: "Graph detects missing Limitation of Liability clause",
  },
  {
    id: "CUAD_002",
    docId: "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf",
    nameVi: "Hợp đồng Dịch vụ Vận hành ATENTO SA",
    nameEn: "ATENTO SA Services Master Agreement",
    customer: "Golf and Cycle Store",
    customerId: "CUST-29715",
    value: "$420,000 USD",
    expiryDate: "Hợp đồng mở (Open-ended)",
    daysLeft: null,
    status: "warning",
    statusLabelVi: "Thiếu điều khoản chấm dứt",
    statusLabelEn: "Missing termination clause",
    riskNoteVi: "Đồ thị Neo4j ghi nhận hợp đồng thiếu Termination Clause",
    riskNoteEn: "Graph detects missing Termination Clause",
  },
  {
    id: "CUAD_003",
    docId: "LinkPlusCorp_20190520_10-Q_EX-10.1_11677334_EX-10.1_Service Agreement.pdf",
    nameVi: "Hợp đồng Cung cấp Dịch vụ Link Plus",
    nameEn: "Link Plus Corp Service Agreement",
    customer: "Brakes and Gears",
    customerId: "CUST-29818",
    value: "$677,990 USD",
    expiryDate: "Đã đồng bộ Neo4j & Qdrant",
    daysLeft: null,
    status: "safe",
    statusLabelVi: "Đã xác thực 100%",
    statusLabelEn: "100% Verified",
    riskNoteVi: "Toàn bộ điều khoản tuân thủ chuẩn",
    riskNoteEn: "All standard clauses verified compliant",
  },
];

const EXEC_SUGGESTIONS = [
  { textVi: "Hợp đồng nào sắp hết hạn trong 30 ngày?", textEn: "Contracts expiring in 30 days", icon: "fa-solid fa-clock" },
  { textVi: "Rà soát điều khoản giới hạn trách nhiệm (CUAD)", textEn: "Review liability caps (CUAD)", icon: "fa-solid fa-shield-halved" },
  { textVi: "Khách hàng nào có doanh số cao nhất ERP?", textEn: "Top revenue customers in ERP", icon: "fa-solid fa-chart-line" },
  { textVi: "Tóm tắt rủi ro pháp lý quý này", textEn: "Summarize legal risks this quarter", icon: "fa-solid fa-file-contract" },
];

const SALES_SUGGESTIONS = [
  { textVi: "Kiểm tra hợp đồng của khách hàng CUST-29818", textEn: "Check contract for client CUST-29818", icon: "fa-solid fa-magnifying-glass" },
  { textVi: "Điều khoản thanh toán HĐ Aduro Biotech", textEn: "Payment terms in Aduro Biotech", icon: "fa-solid fa-file-lines" },
  { textVi: "Hợp đồng nào của tôi cần gia hạn?", textEn: "Which contracts need renewal?", icon: "fa-solid fa-clock" },
];

export default function HomeView({ onNavigate, role = "executive", currentUser, lang = "vi", t = {} }) {
  const isVi = lang === "vi";
  const isStandardSales = role === "standard" || role === "sales" || currentUser?.roleKey === "SALES_OPS" || currentUser?.id === "standard";
  const isExec = role === "executive" || role === "it_admin" || currentUser?.id === "executive" || currentUser?.id === "it_admin";
  const isManager = role === "knowledge_manager" || currentUser?.id === "knowledge_manager";
  const [omnibarQuery, setOmnibarQuery] = useState("");
  const [showBriefing, setShowBriefing] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [liveActivities, setLiveActivities] = useState([]);
  const [riskCount, setRiskCount] = useState(13);

  const handleOmnibarSubmit = (customQuery) => {
    const q = (customQuery !== undefined ? customQuery : omnibarQuery).trim();
    if (!q) return;
    onNavigate("copilot", q);
  };

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
        {/* ── HERO OMNIBAR: SALES WORKSPACE ──────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #ecfeff 60%, #ffffff 100%)",
            border: "1px solid #cffafe",
            borderRadius: "20px",
            padding: "24px 28px",
            marginBottom: "24px",
            boxShadow: "0 4px 20px -2px rgba(8, 145, 178, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative Arctic Ambient Glow (Tone Xanh Ngọc Lam tươi sáng) */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 320, height: 320,
            background: "radial-gradient(circle at top right, rgba(6, 182, 212, 0.14), transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />

          <div style={{ position: "relative", zIndex: 1, marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0", fontFamily: "var(--f-display)", letterSpacing: "-0.01em" }}>
              {isVi ? `Bàn làm việc Kinh doanh — ${userName}` : `Sales Operations Workspace — ${userName}`}
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {isVi
                ? "Tra cứu điều khoản hợp đồng khách hàng phụ trách, đối soát dữ liệu bán hàng & cảnh báo."
                : "Search client contracts, reconcile sales records, and resolve customer risks."}
            </p>
          </div>

          {/* Input box */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#ffffff",
              border: "1.5px solid #a5f3fc",
              borderRadius: "12px",
              padding: "8px 16px",
              boxShadow: "0 2px 8px rgba(8, 145, 178, 0.05)",
              boxSizing: "border-box",
            }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ color: "#0891b2", fontSize: 16 }} />
            <input
              type="text"
              value={omnibarQuery}
              onChange={(e) => setOmnibarQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOmnibarSubmit();
              }}
              placeholder={
                isVi
                  ? "Hỏi Copilot về hợp đồng khách hàng, điều khoản phạt hoặc doanh số... (Nhấn Enter)"
                  : "Ask Copilot about customer contracts, penalty terms or revenue... (Press Enter)"
              }
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "14px",
                color: "#0f172a",
                fontFamily: "var(--f-body)",
              }}
            />
            <button
              onClick={() => handleOmnibarSubmit()}
              className="btn-gradient-cyan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
              <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
            </button>
          </div>

          {/* Quick prompt chips */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "14px" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              {isVi ? "Gợi ý 1-chạm:" : "Quick Prompts:"}
            </span>
            {SALES_SUGGESTIONS.map((item, idx) => {
              const promptText = isVi ? item.textVi : item.textEn;
              return (
                <button
                  key={idx}
                  onClick={() => handleOmnibarSubmit(promptText)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: "999px",
                    background: "#ffffff",
                    border: "1px solid #cffafe",
                    color: "#334155",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(8, 145, 178, 0.04)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#06b6d4";
                    e.currentTarget.style.color = "#0891b2";
                    e.currentTarget.style.background = "#ecfeff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#cffafe";
                    e.currentTarget.style.color = "#334155";
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  <i className={item.icon} style={{ fontSize: 11, color: "#0891b2" }} />
                  <span>{promptText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION: 3 CHỈ SỐ NHỊP TIM CA TRỰC ─────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              title={isVi ? "Doanh số ca / Khu vực" : "Assigned Sales Pipeline"}
              value="$2.05M USD"
              change="+8.2%"
              isPositive={true}
              subtext={isVi ? "3 đối tác doanh nghiệp VIP" : "3 key enterprise clients"}
              icon="fa-solid fa-wallet"
              iconColor="#0891b2"
              iconBg="rgba(8, 145, 178, 0.09)"
              onClick={() => onNavigate("documents")}
            />
            <StatCard
              title={isVi ? "Hợp đồng Phụ trách" : "Managed Contracts"}
              value={liveContracts.length > 0 ? `${liveContracts.length} hợp đồng` : "3 hợp đồng"}
              change={isVi ? "Đang hiệu lực" : "Active"}
              isPositive={true}
              subtext={isVi ? "Aduro Biotech, Atento, LinkPlus" : "Aduro Biotech, Atento, LinkPlus"}
              icon="fa-solid fa-file-contract"
              iconColor="#059669"
              iconBg="rgba(5, 150, 105, 0.09)"
              onClick={() => onNavigate("documents")}
            />
            <StatCard
              title={isVi ? "Cảnh báo Điều khoản" : "Contract Risk Alerts"}
              value="2 cảnh báo"
              change={isVi ? "Cần rà soát" : "Needs Review"}
              isPositive={false}
              subtext={isVi ? "Thiếu giới hạn trách nhiệm & chấm dứt" : "Missing liability cap & termination"}
              icon="fa-solid fa-triangle-exclamation"
              iconColor="#d97706"
              iconBg="rgba(217, 119, 6, 0.09)"
              onClick={() => onNavigate("risk")}
            />
          </div>
        </div>

        {/* ── SECTION 2: BÁO ĐỘNG TÁC NGHIỆP CẦN XỬ LÝ GẤP ────── */}
        <div
          style={{
            marginBottom: "28px",
            padding: "16px 20px",
            background: "rgba(220, 38, 38, 0.03)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            borderRadius: "12px",
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
                width: 38,
                height: 38,
                borderRadius: "8px",
                background: "rgba(220, 38, 38, 0.1)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-shield-halved" style={{ fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#991B1B" }}>
                {isVi ? "2 Cảnh báo rủi ro phòng Kinh doanh cần xử lý trong ca" : "2 Sales Risk Alerts Require Attention"}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-2, #334155)", marginTop: "2px" }}>
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
              icon="fa-solid fa-robot"
              onClick={() => onNavigate("copilot")}
            >
              {isVi ? "Xử lý với AI Copilot" : "Resolve with Copilot"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate("risk")}
            >
              {isVi ? "Xem chi tiết rủi ro" : "View Risk Details"}
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
                icon="fa-solid fa-folder-open"
                onClick={() => onNavigate("documents")}
              >
                {isVi ? "Mở Kho tài liệu" : "Open Documents"}
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
                                background: isCritical ? "rgba(220,38,38,0.1)" : isWarning ? "rgba(217,119,6,0.1)" : "rgba(8,145,178,0.08)",
                                color: isCritical ? "#DC2626" : isWarning ? "#D97706" : "#0891b2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                cursor: "pointer",
                              }}
                              onClick={() => onNavigate("documents", contract.docId || contract.id)}
                              title={isVi ? "Xem văn bản gốc" : "View raw document"}
                            >
                              <i className="fa-solid fa-file-lines" style={{ fontSize: 16 }} />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text-1, #0F172A)",
                                  cursor: "pointer",
                                }}
                                onClick={() => onNavigate("documents", contract.docId || contract.id)}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand, #0891b2)")}
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
                              icon="fa-solid fa-robot"
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
              const iconClass = typeof act.icon === "string" ? act.icon : "fa-solid fa-file-lines";
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
                      <i className={iconClass} style={{ fontSize: 15 }} />
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
              icon="fa-solid fa-download"
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
            icon="fa-solid fa-chart-line"
            loading={loadingBriefing}
            fullWidth
            onClick={handleGenerateBriefing}
          >
            {loadingBriefing
              ? isVi
                ? "Đang tổng hợp báo cáo điều hành..."
                : "Synthesizing executive brief..."
              : isVi
              ? "Tổng hợp báo cáo điều hành"
              : "Generate Executive Brief"}
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

      {/* ── HERO OMNIBAR: AI & SEARCH CENTER ────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #ecfeff 60%, #ffffff 100%)",
          border: "1px solid #cffafe",
          borderRadius: "20px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 4px 20px -2px rgba(8, 145, 178, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decorative Arctic Ambient Glow (Tone Xanh Ngọc Lam tươi sáng) */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: 320, height: 320,
          background: "radial-gradient(circle at top right, rgba(6, 182, 212, 0.14), transparent 70%)",
          pointerEvents: "none", zIndex: 0
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0", fontFamily: "var(--f-display)", letterSpacing: "-0.01em" }}>
              {isVi ? `Xin chào, ${userName}` : `Welcome back, ${userName}`}
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {isVi
                ? "Nền tảng quản trị tri thức kinh doanh & kiểm soát rủi ro pháp lý hợp nhất."
                : "Unified platform for enterprise knowledge & legal risk governance."}
            </p>
          </div>
          {isExec && (
            <button
              onClick={() => setShowBriefing(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 700,
                background: "#ffffff",
                border: "1px solid #a5f3fc",
                color: "#0891b2",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(8, 145, 178, 0.08)",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ecfeff";
                e.currentTarget.style.borderColor = "#0891b2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#a5f3fc";
              }}
            >
              <i className="fa-solid fa-file-lines" style={{ fontSize: 13 }} />
              <span>{isVi ? "Tóm tắt điều hành" : "Executive Briefing"}</span>
            </button>
          )}
        </div>

        {/* Input box */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#ffffff",
            border: "1.5px solid #a5f3fc",
            borderRadius: "12px",
            padding: "8px 14px",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(8, 145, 178, 0.04)"
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#0891b2", fontSize: 16 }} />
          <input
            type="text"
            value={omnibarQuery}
            onChange={(e) => setOmnibarQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleOmnibarSubmit();
            }}
            placeholder={
              isVi
                ? "Hỏi bất kỳ điều gì: hợp đồng, điều khoản rủi ro, doanh số đối tác... (Nhấn Enter để gửi)"
                : "Ask anything about contracts, risk clauses, partner sales... (Press Enter to ask)"
            }
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "13.5px",
              color: "#0f172a",
              fontFamily: "var(--f-body)",
            }}
          />
          <button
            onClick={() => handleOmnibarSubmit()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 4px 14px rgba(8, 145, 178, 0.28)",
              transition: "all 0.15s ease"
            }}
          >
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
            <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
          </button>
        </div>

        {/* Quick prompt chips */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "14px" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
            {isVi ? "Gợi ý 1-chạm:" : "Quick Prompts:"}
          </span>
          {EXEC_SUGGESTIONS.map((item, idx) => {
            const promptText = isVi ? item.textVi : item.textEn;
            return (
              <button
                key={idx}
                onClick={() => handleOmnibarSubmit(promptText)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: "999px",
                  background: "#ffffff",
                  border: "1px solid #cffafe",
                  color: "#334155",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(8, 145, 178, 0.03)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#06b6d4";
                  e.currentTarget.style.color = "#0891b2";
                  e.currentTarget.style.background = "#ecfeff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#cffafe";
                  e.currentTarget.style.color = "#334155";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <i className={item.icon} style={{ fontSize: 10, color: "#0891b2" }} />
                <span>{promptText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: 3 CHỈ SỐ NHỊP TIM DOANH NGHIỆP ─────────── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <StatCard
            title={isVi ? "Doanh thu Toàn Doanh nghiệp" : "Enterprise ERP Revenue"}
            value="$123.22M USD"
            change="+12.4% quý này"
            isPositive={true}
            subtext={isVi ? "31,465 giao dịch AdventureWorks ERP" : "31,465 AdventureWorks transactions"}
            icon="fa-solid fa-wallet"
            iconColor="#0891b2"
            iconBg="rgba(8, 145, 178, 0.09)"
            onClick={() => onNavigate("executive")}
          />
          <StatCard
            title={isVi ? "Hồ sơ Hợp đồng Quản lý" : "Active CUAD Contracts"}
            value="519 hợp đồng"
            change={isVi ? "30 trọng điểm" : "30 critical"}
            isPositive={true}
            subtext={isVi ? "Đã đối soát điều khoản và thực thể" : "Fully indexed legal agreements"}
            icon="fa-solid fa-file-contract"
            iconColor="#059669"
            iconBg="rgba(5, 150, 105, 0.09)"
            onClick={() => onNavigate("documents")}
          />
          <StatCard
            title={isVi ? "Cảnh báo Rủi ro Cần xử lý" : "Actionable Risk Alerts"}
            value={`${riskCount} cảnh báo`}
            change={isVi ? "5 rủi ro cao" : "5 high risk"}
            isPositive={false}
            subtext={isVi ? "Thiếu điều khoản giới hạn trách nhiệm" : "Missing liability caps & indemnities"}
            icon="fa-solid fa-triangle-exclamation"
            iconColor="#d97706"
            iconBg="rgba(217, 119, 6, 0.09)"
            onClick={() => onNavigate("risk")}
          />
        </div>
      </div>

      {/* ── SECTION: 2 COLUMNS (ACTION CENTER + RECENT ACTIVITIES) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: ACTION CENTER (CẢNH BÁO CẦN XỬ LÝ NGAY) */}
        <Card
          title={isVi ? "Cảnh báo & Việc cần xử lý ngay" : "Action Items & Risk Alerts"}
          subtitle={isVi ? "Các điểm nóng pháp lý & bán hàng cần lãnh đạo chỉ đạo xử lý" : "High-priority legal and sales alerts requiring decisions"}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("risk")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>{isVi ? "Xem tất cả rủi ro" : "View all risks"}</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
              </span>
            </Button>
          }
          padding="16px 20px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Alert Item 1 */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(220, 38, 38, 0.03)",
                border: "1px solid rgba(220, 38, 38, 0.18)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-1)" }}>
                    Hợp đồng Hợp tác ADURO BIOTECH (#CUAD_001)
                  </span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.1)", padding: "2px 7px", borderRadius: "999px" }}>
                  $953,630 USD
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Hợp đồng mở không giới hạn giá trị bồi thường (Missing Limitation of Liability Clause), gây rủi ro tài chính tiềm ẩn."
                  : "Open-ended agreement lacking Limitation of Liability clause, exposing enterprise to uncapped damages."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="fa-solid fa-robot"
                  onClick={() => handleOmnibarSubmit("Rà soát rủi ro thiếu điều khoản Limitation of Liability trong HĐ ADURO BIOTECH")}
                >
                  {isVi ? "Rà soát với Copilot" : "Review with Copilot"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="fa-solid fa-file-pdf"
                  onClick={() => onNavigate("documents", "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf")}
                >
                  {isVi ? "Xem văn bản gốc" : "View Contract"}
                </Button>
              </div>
            </div>

            {/* Alert Item 2 */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(217, 119, 6, 0.03)",
                border: "1px solid rgba(217, 119, 6, 0.18)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-1)" }}>
                    Hợp đồng Dịch vụ ATENTO SA (#CUAD_002)
                  </span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.1)", padding: "2px 7px", borderRadius: "999px" }}>
                  $420,000 USD
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Hợp đồng dịch vụ thiếu điều khoản chấm dứt trước hạn (Missing Termination Clause), khó thoái lui nếu đối tác vi phạm SLA."
                  : "Missing Termination Clause in master services contract, preventing exit upon SLA breach."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="fa-solid fa-robot"
                  onClick={() => handleOmnibarSubmit("Đề xuất bổ sung Termination Clause cho HĐ ATENTO SA")}
                >
                  {isVi ? "Rà soát với Copilot" : "Review with Copilot"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="fa-solid fa-file-pdf"
                  onClick={() => onNavigate("documents", "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf")}
                >
                  {isVi ? "Xem văn bản gốc" : "View Contract"}
                </Button>
              </div>
            </div>

            {/* Alert Item 3 */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(37, 99, 235, 0.03)",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0891b2" }} />
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-1)" }}>
                    Biến động Đơn hàng VIP: Công ty Cơ khí Đông Nam
                  </span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0891b2", background: "rgba(8,145,178,0.1)", padding: "2px 7px", borderRadius: "999px" }}>
                  ERP Alert
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Dữ liệu bán hàng ghi nhận đơn đặt hàng giảm 30% so với cùng kỳ. Cần chỉ đạo phụ trách kinh doanh đối soát nhu cầu."
                  : "ERP data indicates a 30% reduction in quarterly orders. Sales follow-up recommended."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="fa-solid fa-chart-line"
                  onClick={() => onNavigate("executive")}
                >
                  {isVi ? "Kiểm tra số liệu ERP" : "Inspect ERP Telemetry"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT COLUMN: NHẬT KÝ HOẠT ĐỘNG THỜI GIAN THỰC */}
        <Card
          title={isVi ? "Nhật ký tác nghiệp gần đây" : "Recent System Activity"}
          subtitle={isVi ? "Cập nhật thời gian thực các truy vấn và văn bản xử lý" : "Live stream of recent user interactions & contract updates"}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>{isVi ? "Xem tất cả" : "View all"}</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
              </span>
            </Button>
          }
          padding="0"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {(liveActivities.length > 0 ? liveActivities : RECENT_ACTIVITIES.slice(0, 4)).map((act, idx) => {
              const iconClass = typeof act.icon === "string" ? act.icon : "fa-solid fa-file-lines";
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
                        width: 32,
                        height: 32,
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
                      <i className={iconClass} style={{ fontSize: 14 }} />
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
                      fontSize: "11px",
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
      </div>
    </div>
  );
}
