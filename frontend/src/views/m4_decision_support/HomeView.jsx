import React, { useState, useEffect } from "react";
import { Button, Badge, Card, Modal, PageHeader, StatCard } from "../../components/ui";
import {
  fetchAssignedContracts,
  fetchRecentActivities,
  generateExecutiveBriefing,
  fetchRiskAlerts,
  fetchContractDistribution
} from "../../services/api";

const RECENT_ACTIVITIES = [
  {
    id: "act-order-75123",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75123",
    titleVi: "Đơn hàng mới #75123",
    titleEn: "New Order #75123",
    description: "Khách hàng Devin Phillips đã hoàn tất đơn hàng trị giá $209.92",
    metaVi: "Khách hàng Devin Phillips đã hoàn tất đơn hàng trị giá $209.92",
    metaEn: "Customer Devin Phillips completed order worth $209.92",
    timestamp: "2014-06-30",
    badge: "$209.92 USD"
  },
  {
    id: "act-order-75122",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75122",
    titleVi: "Đơn hàng mới #75122",
    titleEn: "New Order #75122",
    description: "Khách hàng Caleb Lal đã hoàn tất đơn hàng trị giá $34.22",
    metaVi: "Khách hàng Caleb Lal đã hoàn tất đơn hàng trị giá $34.22",
    metaEn: "Customer Caleb Lal completed order worth $34.22",
    timestamp: "2014-06-30",
    badge: "$34.22 USD"
  },
  {
    id: "act-order-75121",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75121",
    titleVi: "Đơn hàng mới #75121",
    titleEn: "New Order #75121",
    description: "Khách hàng Noah Hall đã hoàn tất đơn hàng trị giá $82.85",
    metaVi: "Khách hàng Noah Hall đã hoàn tất đơn hàng trị giá $82.85",
    metaEn: "Customer Noah Hall completed order worth $82.85",
    timestamp: "2014-06-30",
    badge: "$82.85 USD"
  },
  {
    id: "act-order-75120",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75120",
    titleVi: "Đơn hàng mới #75120",
    titleEn: "New Order #75120",
    description: "Khách hàng Olivia Stewart đã hoàn tất đơn hàng trị giá $93.88",
    metaVi: "Khách hàng Olivia Stewart đã hoàn tất đơn hàng trị giá $93.88",
    metaEn: "Customer Olivia Stewart completed order worth $93.88",
    timestamp: "2014-06-30",
    badge: "$93.88 USD"
  },
  {
    id: "act-order-75119",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75119",
    titleVi: "Đơn hàng mới #75119",
    titleEn: "New Order #75119",
    description: "Khách hàng Alexandria Howard đã hoàn tất đơn hàng trị giá $46.72",
    metaVi: "Khách hàng Alexandria Howard đã hoàn tất đơn hàng trị giá $46.72",
    metaEn: "Customer Alexandria Howard completed order worth $46.72",
    timestamp: "2014-06-30",
    badge: "$46.72 USD"
  },
  {
    id: "act-order-75118",
    icon: "fa-solid fa-file-invoice",
    type: "ORDER",
    title: "Đơn hàng mới #75118",
    titleVi: "Đơn hàng mới #75118",
    titleEn: "New Order #75118",
    description: "Khách hàng Frank Ramos đã hoàn tất đơn hàng trị giá $149.43",
    metaVi: "Khách hàng Frank Ramos đã hoàn tất đơn hàng trị giá $149.43",
    metaEn: "Customer Frank Ramos completed order worth $149.43",
    timestamp: "2014-06-30",
    badge: "$149.43 USD"
  }
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
  const [contractDist, setContractDist] = useState(null);
  const [deptChartMode, setDeptChartMode] = useState("donut"); // "donut" | "bars"
  const [hoveredDept, setHoveredDept] = useState(null);

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
    fetchRecentActivities(6).then((res) => {
      if (res && res.success && res.data && res.data.length > 0) {
        setLiveActivities(res.data);
      }
    }).catch(() => { });

    fetchRiskAlerts().then((res) => {
      if (res && res.success) {
        setRiskCount(res.totalAlerts || 13);
      }
    }).catch(() => { });

    fetchContractDistribution(currentUser).then((res) => {
      if (res && res.success) {
        setContractDist(res.data);
      }
    }).catch(() => { });
  }, [currentUser]);

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
      <div style={{ background: "var(--base)", minHeight: "100%", padding: "28px 32px 48px", maxWidth: 1400, margin: "0 auto", boxSizing: "border-box" }}>
        {/* ── HERO OMNIBAR: SALES WORKSPACE ──────────────────── */}
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8edf3)",
            borderRadius: "16px",
            padding: "24px 28px",
            marginBottom: "24px",
            boxShadow: "0 8px 30px -4px rgba(8, 145, 178, 0.06), 0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-1, #0f172a)", margin: "0 0 4px 0", fontFamily: "var(--f-display)" }}>
              {isVi ? `Bàn làm việc Kinh doanh — ${userName}` : `Sales Operations Workspace — ${userName}`}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-3, #64748b)", margin: 0 }}>
              {isVi
                ? "Tra cứu điều khoản hợp đồng khách hàng phụ trách, đối soát dữ liệu bán hàng & cảnh báo."
                : "Search client contracts, reconcile sales records, and resolve customer risks."}
            </p>
          </div>

          {/* Input box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface-2, #ffffff)",
              border: "1.5px solid var(--border, #d9e3ed)",
              borderRadius: "12px",
              padding: "10px 16px",
              boxSizing: "border-box",
              boxShadow: "0 2px 6px -1px rgba(0, 0, 0, 0.02)",
            }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--cyan, #0891b2)", fontSize: 16 }} />
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
                fontSize: "13.5px",
                color: "var(--text-1, #0f172a)",
                fontFamily: "var(--f-body)",
              }}
            />
            <button
              onClick={() => handleOmnibarSubmit()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                borderRadius: "9px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 3px 12px rgba(8, 145, 178, 0.28)",
              }}
            >
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
              <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
            </button>
          </div>

          {/* Quick prompt chips */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "14px" }}>
            <span style={{ fontSize: "11.5px", color: "var(--text-3, #64748b)", fontWeight: 600 }}>
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
                    padding: "5px 13px",
                    borderRadius: "999px",
                    background: "var(--surface, #ffffff)",
                    border: "1px solid var(--border, #e8edf3)",
                    color: "var(--text-2, #334155)",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--cyan-electric, #06b6d4)";
                    e.currentTarget.style.color = "var(--cyan, #0891b2)";
                    e.currentTarget.style.background = "var(--cyan-dim, #f0fdfa)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border, #e8edf3)";
                    e.currentTarget.style.color = "var(--text-2, #334155)";
                    e.currentTarget.style.background = "var(--surface, #ffffff)";
                  }}
                >
                  <i className={item.icon} style={{ fontSize: 10, color: "var(--cyan, #0891b2)" }} />
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
                <span>{isVi ? "Danh sách Hợp đồng Khách hàng phụ trách" : "Assigned Client Contracts"}</span>
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
          title={isVi ? "Nhật ký tác nghiệp gần đây" : "Recent Operational Activity"}
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
    <div style={{ background: "var(--base)", minHeight: "100%", padding: "24px 32px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
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
                  {isVi ? "BÁO CÁO ĐIỀU HÀNH TỔNG HỢP" : "EXECUTIVE SUMMARY REPORT"}
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
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, #e8edf3)",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 8px 30px -4px rgba(8, 145, 178, 0.06), 0 2px 6px rgba(0, 0, 0, 0.02)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-1, #0f172a)", margin: "0 0 4px 0", fontFamily: "var(--f-display)" }}>
              {isVi ? `Xin chào, ${userName}` : `Welcome back, ${userName}`}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-3, #64748b)", margin: 0 }}>
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
                padding: "8px 15px",
                borderRadius: "9px",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border, #e8edf3)",
                color: "var(--text-2, #334155)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--cyan-dim, #f0fdfa)";
                e.currentTarget.style.borderColor = "var(--cyan-electric, #06b6d4)";
                e.currentTarget.style.color = "var(--cyan, #0891b2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface, #ffffff)";
                e.currentTarget.style.borderColor = "var(--border, #e8edf3)";
                e.currentTarget.style.color = "var(--text-2, #334155)";
              }}
            >
              <i className="fa-solid fa-file-lines" style={{ fontSize: 13, color: "var(--cyan, #0891b2)" }} />
              <span>{isVi ? "Tóm tắt điều hành" : "Executive Briefing"}</span>
            </button>
          )}
        </div>

        {/* Input box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--surface-2, #ffffff)",
            border: "1.5px solid var(--border, #d9e3ed)",
            borderRadius: "12px",
            padding: "10px 16px",
            boxSizing: "border-box",
            boxShadow: "0 2px 6px -1px rgba(0, 0, 0, 0.02)",
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--cyan, #0891b2)", fontSize: 16 }} />
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
              color: "var(--text-1, #0f172a)",
              fontFamily: "var(--f-body)",
            }}
          />
          <button
            onClick={() => handleOmnibarSubmit()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: "9px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 3px 12px rgba(8, 145, 178, 0.28)",
            }}
          >
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
            <span>{isVi ? "Hỏi Copilot" : "Ask Copilot"}</span>
          </button>
        </div>

        {/* Quick prompt chips */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "14px" }}>
          <span style={{ fontSize: "11.5px", color: "var(--text-3, #64748b)", fontWeight: 600 }}>
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
                  padding: "5px 13px",
                  borderRadius: "999px",
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8edf3)",
                  color: "var(--text-2, #334155)",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--cyan-electric, #06b6d4)";
                  e.currentTarget.style.color = "var(--cyan, #0891b2)";
                  e.currentTarget.style.background = "var(--cyan-dim, #f0fdfa)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border, #e8edf3)";
                  e.currentTarget.style.color = "var(--text-2, #334155)";
                  e.currentTarget.style.background = "var(--surface, #ffffff)";
                }}
              >
                <i className={item.icon} style={{ fontSize: 10, color: "var(--cyan, #0891b2)" }} />
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

      {/* ── SECTION: 2 BIỂU ĐỒ ĐIỀU HÀNH THỜI GIAN THỰC (PHỄU RỦI RO & ĐIỂM NÓNG PHƠI NHIỄM) ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 470px), 1fr))",
        gap: "20px",
        marginBottom: "24px"
      }}>
        {/* CARD 1: PHỄU PHÂN TẦNG MỨC ĐỘ RỦI RO HỢP ĐỒNG (100% REAL NEO4J CUAD DATA) */}
        {(() => {
          const apiFunnel = contractDist?.riskFunnel;
          const safePct = apiFunnel?.safePct ?? 83.1;
          const grade = apiFunnel?.grade ?? "A-";
          const totalExposure = apiFunnel?.totalExposure ?? "$12.5M USD";
          const riskTiers = apiFunnel?.tiers || [
            {
              id: "high",
              labelVi: "Rủi ro Cao",
              labelEn: "High Risk",
              count: 39,
              pct: 7.7,
              amount: "$2.45M USD",
              color: "#dc2626",
              bg: "rgba(220, 38, 38, 0.05)",
              border: "rgba(220, 38, 38, 0.2)",
              icon: "fa-solid fa-triangle-exclamation",
              descVi: "Thiếu điều khoản giới hạn bồi thường hoặc quyền chấm dứt",
              descEn: "Missing liability caps or unilateral exit rights upon breach"
            },
            {
              id: "medium",
              labelVi: "Rủi ro Trung bình",
              labelEn: "Medium Risk",
              count: 47,
              pct: 9.2,
              amount: "$5.12M USD",
              color: "#d97706",
              bg: "rgba(217, 119, 6, 0.05)",
              border: "rgba(217, 119, 6, 0.2)",
              icon: "fa-solid fa-circle-exclamation",
              descVi: "Phụ lục giá chưa đồng bộ, sắp đến hạn tái ký trong 30-60 ngày",
              descEn: "Outdated pricing addenda, renewals expiring within 30-60 days"
            },
            {
              id: "low",
              labelVi: "An toàn & Tuân thủ",
              labelEn: "Compliant & Safe",
              count: 423,
              pct: 83.1,
              amount: "$4.93M USD",
              color: "#059669",
              bg: "rgba(5, 150, 105, 0.05)",
              border: "rgba(5, 150, 105, 0.2)",
              icon: "fa-solid fa-circle-check",
              descVi: "Đầy đủ 41 nhóm điều khoản CUAD cốt lõi, thẩm định hoàn tất",
              descEn: "All mandatory CUAD clauses verified and endorsed by legal team"
            }
          ];

          const medTier = riskTiers.find(t => t.id === "medium") || { pct: 9.2 };
          const highTier = riskTiers.find(t => t.id === "high") || { pct: 7.7 };
          const medPct = medTier.pct;
          const highPct = highTier.pct;

          return (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
              boxShadow: "var(--shadow-xs)",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}>
              {/* Header Card 1 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }}></span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                    {isVi ? "Phễu Phân tầng Rủi ro Hợp đồng" : "Contract Risk Funnel"}
                  </h3>
                </div>

                <button
                  onClick={() => onNavigate?.("copilot", isVi ? `Phân tích chi tiết ${highTier.count || 39} hợp đồng rủi ro cao và đề xuất giải pháp xử lý phơi nhiễm $2.45M USD` : "Analyze high risk contracts and mitigation steps")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "var(--r-md, 6px)",
                    background: "var(--blue-soft)",
                    border: "1px solid rgba(37,99,235,0.22)",
                    color: "var(--blue)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(37,99,235,0.12)";
                    e.currentTarget.style.borderColor = "var(--blue)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--blue-soft)";
                    e.currentTarget.style.borderColor = "rgba(37,99,235,0.22)";
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} />
                  <span>{isVi ? "Hỏi AI" : "Ask AI"}</span>
                </button>
              </div>

              {/* Bố cục trực quan: Cột trái (Vòng cung Gauge An toàn) + Cột phải (3 Tầng Rủi ro chi tiết) */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "115px 1fr",
                gap: "16px",
                alignItems: "center",
                flex: 1
              }}>
                {/* Vòng cung Gauge An toàn danh mục */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: 112,
                  height: 112,
                  margin: "0 auto"
                }}>
                  <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                    {/* Đường viền nền tròn */}
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="transparent"
                      stroke="var(--surface-3, #edf2f7)"
                      strokeWidth="3.8"
                    />
                    <g transform="rotate(-90 18 18)">
                      {/* Phân đoạn 1: An toàn (Xanh lá) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="transparent"
                        stroke="#059669"
                        strokeWidth="3.8"
                        pathLength="100"
                        strokeDasharray={`${Math.max(1, safePct - 1.5)} ${100 - Math.max(1, safePct - 1.5)}`}
                        strokeDashoffset="0"
                      />
                      {/* Phân đoạn 2: Rủi ro Vừa (Vàng cam) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="transparent"
                        stroke="#d97706"
                        strokeWidth="4.0"
                        pathLength="100"
                        strokeDasharray={`${Math.max(1, medPct - 1.0)} ${100 - Math.max(1, medPct - 1.0)}`}
                        strokeDashoffset={`-${safePct}`}
                      />
                      {/* Phân đoạn 3: Rủi ro Cao (Đỏ) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="transparent"
                        stroke="#dc2626"
                        strokeWidth="4.2"
                        pathLength="100"
                        strokeDasharray={`${Math.max(1, highPct - 0.5)} ${100 - Math.max(1, highPct - 0.5)}`}
                        strokeDashoffset={`-${safePct + medPct}`}
                      />
                    </g>
                  </svg>

                  {/* Tâm vòng tròn Gauge */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#059669",
                      fontFamily: "var(--f-display)",
                      lineHeight: 1
                    }}>
                      {safePct}%
                    </span>
                    <span style={{
                      fontSize: 8.5,
                      color: "var(--text-3)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginTop: 2
                    }}>
                      {isVi ? "AN TOÀN" : "COMPLIANT"}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--text-1)",
                      background: "var(--surface-3)",
                      padding: "1px 6px",
                      borderRadius: 99,
                      marginTop: 2
                    }}>
                      {isVi ? `HẠNG ${grade}` : `GRADE ${grade}`}
                    </span>
                  </div>
                </div>

                {/* 3 Thẻ tầng rủi ro ở bên phải */}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {riskTiers.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => onNavigate?.("risk")}
                      title={isVi ? `Bấm để lọc danh sách ${tier.labelVi}` : `Click to inspect ${tier.labelEn}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        padding: "7px 11px",
                        borderRadius: 7,
                        background: tier.bg,
                        border: `1px solid ${tier.border}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateX(2px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Hàng 1: Icon + Tên phân tầng + Số lượng HĐ + SỐ TIỀN PHƠI NHIỄM */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <i className={tier.icon} style={{ color: tier.color, fontSize: 11.5, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>
                            {isVi ? tier.labelVi : tier.labelEn}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: tier.color,
                            background: "var(--surface)",
                            border: `1px solid ${tier.border}`,
                            padding: "0.5px 5px",
                            borderRadius: 4
                          }}>
                            {tier.count} {isVi ? "HĐ" : "docs"}
                          </span>
                        </div>

                        <strong style={{ fontSize: 12, color: tier.color, fontFamily: "var(--f-mono)", fontWeight: 800 }}>
                          {tier.amount}
                        </strong>
                      </div>

                      {/* Hàng 2: Mô tả chi tiết trọn vẹn, không bị cụt ba chấm */}
                      <div style={{
                        fontSize: 10.5,
                        color: "var(--text-3)",
                        paddingLeft: 18.5,
                        lineHeight: 1.3
                      }}>
                        {isVi ? tier.descVi : tier.descEn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Card 1 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: 11, color: "var(--green)" }} />
                  <span>{isVi ? "Tổng phơi nhiễm rủi ro:" : "Total contract exposure:"}{" "}</span>
                  <strong style={{ color: "var(--text-1)", fontFamily: "var(--f-mono)" }}>
                    {totalExposure}
                  </strong>
                </span>
                <button
                  onClick={() => onNavigate?.("risk")}
                  style={{
                    color: "var(--blue)",
                    fontWeight: 600,
                    fontSize: 11.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    cursor: "pointer",
                    background: "none",
                    border: "none"
                  }}
                >
                  <span>{isVi ? "Xem chi tiết rủi ro" : "View risk center"}</span>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                </button>
              </div>
            </div>
          );
        })()}

        {/* CARD 2: ĐIỂM NÓNG PHƠI NHIỄM THEO THỂ LOẠI HỢP ĐỒNG (100% REAL NEO4J CATEGORIES) */}
        {(() => {
          const hotspots = contractDist?.exposureHotspots || [
            {
              categoryVi: "Hợp tác & Chuyển giao Công nghệ",
              categoryEn: "Collaboration & Tech Transfer",
              contracts: 72,
              exposure: "$4.82M USD",
              pct: 38.6,
              color: "#dc2626",
              statusVi: "Rủi ro Cao",
              statusEn: "High Risk",
              statusBg: "rgba(220, 38, 38, 0.1)",
              noteVi: "Thiếu điều khoản giới hạn bồi thường",
              noteEn: "Missing limitation of liability clause"
            },
            {
              categoryVi: "Dịch vụ Thuê ngoài & Vận hành SLA",
              categoryEn: "Master Services & SLA Operations",
              contracts: 81,
              exposure: "$3.65M USD",
              pct: 29.2,
              color: "#d97706",
              statusVi: "Rủi ro Vừa",
              statusEn: "Medium Risk",
              statusBg: "rgba(217, 119, 6, 0.1)",
              noteVi: "Rủi ro chấm dứt hợp đồng trước hạn",
              noteEn: "Exposure to unilateral early termination"
            },
            {
              categoryVi: "Cung ứng & Mua bán Linh kiện",
              categoryEn: "Supply & Procurement Agreements",
              contracts: 39,
              exposure: "$2.41M USD",
              pct: 19.3,
              color: "#2563EB",
              statusVi: "Kiểm soát tốt",
              statusEn: "Controlled",
              statusBg: "rgba(37, 99, 235, 0.1)",
              noteVi: "Điều khoản thanh toán & bảo hành chuẩn",
              noteEn: "Standardized payment and warranty terms"
            },
            {
              categoryVi: "Bảo mật & Đại lý Phân phối",
              categoryEn: "Non-Disclosure & Distribution",
              contracts: 92,
              exposure: "$1.62M USD",
              pct: 12.9,
              color: "#059669",
              statusVi: "Tuân thủ chuẩn",
              statusEn: "Compliant",
              statusBg: "rgba(5, 150, 105, 0.1)",
              noteVi: "Đạt chuẩn an toàn bảo mật thông tin",
              noteEn: "Verified NDA & intellectual property clauses"
            }
          ];

          return (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
              boxShadow: "var(--shadow-xs)",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}>
              {/* Header Card 2 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }}></span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                    {isVi ? "Điểm nóng Phơi nhiễm theo Thể loại Hợp đồng" : "Exposure Hotspots by Category"}
                  </h3>
                </div>

                <button
                  onClick={() => onNavigate?.("copilot", isVi ? "Rà soát nguyên nhân nhóm Hợp tác & Chuyển giao Công nghệ có phơi nhiễm $4.82M USD cao nhất" : "Analyze why Collaboration contracts have highest exposure")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "var(--r-md, 6px)",
                    background: "var(--blue-soft)",
                    border: "1px solid rgba(37,99,235,0.22)",
                    color: "var(--blue)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(37,99,235,0.12)";
                    e.currentTarget.style.borderColor = "var(--blue)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--blue-soft)";
                    e.currentTarget.style.borderColor = "rgba(37,99,235,0.22)";
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} />
                  <span>{isVi ? "Hỏi AI" : "Ask AI"}</span>
                </button>
              </div>

              {/* Danh sách 4 Điểm nóng trực quan */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, justifyContent: "space-between" }}>
                {hotspots.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigate?.("documents")}
                    title={isVi ? `Bấm để lọc danh mục ${item.categoryVi}` : `Click to inspect ${item.categoryEn}`}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 7,
                      padding: "7.5px 11px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4.5,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "var(--surface-hover)";
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "var(--surface-2)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    {/* Tầng trên: Tên nhóm + Số tiền phơi nhiễm & Tỷ lệ */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>
                        {isVi ? item.categoryVi : item.categoryEn}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong style={{ color: item.color, fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 800 }}>
                          {item.exposure}
                        </strong>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: item.color,
                          background: item.statusBg,
                          padding: "1px 5px",
                          borderRadius: 3
                        }}>
                          {item.pct}%
                        </span>
                      </div>
                    </div>

                    {/* Thanh tiến trình to bản, mềm mại */}
                    <div style={{
                      width: "100%",
                      height: 5.5,
                      borderRadius: 3,
                      background: "var(--surface-3, #edf2f7)",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${item.pct}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: 3,
                        transition: "width 0.4s ease"
                      }} />
                    </div>

                    {/* Tầng dưới: Ghi chú điểm nóng & Số hợp đồng */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-3)" }}>
                      <span>{isVi ? item.noteVi : (item.noteEn || item.noteVi)}</span>
                      <span style={{ fontWeight: 600 }}>{item.contracts} {isVi ? "hợp đồng" : "contracts"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Card 2 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="fa-solid fa-layer-group" style={{ fontSize: 10, color: "var(--cyan)" }} />
                  <span>{isVi ? "Đồng bộ từ 1,693 điều khoản Neo4j & CUAD" : "Synced from 1,693 Neo4j clauses"}</span>
                </span>
                <button
                  onClick={() => onNavigate?.("knowledge_explorer")}
                  style={{
                    color: "var(--blue)",
                    fontWeight: 600,
                    fontSize: 11.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    cursor: "pointer",
                    background: "none",
                    border: "none"
                  }}
                >
                  <span>{isVi ? "Khám phá đồ thị" : "Graph explorer"}</span>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── SECTION: 2 COLUMNS (ACTION CENTER + RECENT ACTIVITIES) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          alignItems: "stretch",
          marginBottom: "24px"
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
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", justifyContent: "flex-start" }}>
            {/* Alert Item 1: Aduro Biotech */}
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(220, 38, 38, 0.03)",
                border: "1px solid rgba(220, 38, 38, 0.22)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.22)"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "rgba(220, 38, 38, 0.12)",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.35 }}>
                    Hợp đồng Hợp tác ADURO BIOTECH (#CUAD_001)
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.12)", padding: "2px 7px", borderRadius: "4px", textTransform: "uppercase" }}>
                    {isVi ? "Nguy cấp" : "Critical"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "2px 7px", borderRadius: "4px", fontFamily: "var(--f-mono)" }}>
                    $953,630 USD
                  </span>
                </div>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Hợp đồng mở không giới hạn mức trần bồi thường thiệt hại, tiềm ẩn rủi ro tài chính lớn cho doanh nghiệp."
                  : "Open-ended agreement lacking Limitation of Liability clause, exposing enterprise to uncapped damages."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
                <button
                  onClick={() => handleOmnibarSubmit("Rà soát rủi ro thiếu điều khoản Limitation of Liability trong HĐ ADURO BIOTECH")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5.5px 11px",
                    borderRadius: "7px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10 }} />
                  <span>{isVi ? "Rà soát với Copilot" : "Review with Copilot"}</span>
                </button>
                <button
                  onClick={() => onNavigate("documents", "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "7px",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    background: "var(--surface)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <i className="fa-solid fa-file-pdf" style={{ fontSize: 11, color: "#dc2626" }} />
                  <span>{isVi ? "Xem văn bản gốc" : "View Contract"}</span>
                </button>
              </div>
            </div>

            {/* Alert Item 2: Atento SA */}
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(217, 119, 6, 0.03)",
                border: "1px solid rgba(217, 119, 6, 0.22)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(217, 119, 6, 0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(217, 119, 6, 0.22)"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "rgba(217, 119, 6, 0.12)",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 10 }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.35 }}>
                    Hợp đồng Dịch vụ ATENTO SA (#CUAD_002)
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.12)", padding: "2px 7px", borderRadius: "4px", textTransform: "uppercase" }}>
                    {isVi ? "Cảnh báo" : "Warning"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.08)", padding: "2px 7px", borderRadius: "4px", fontFamily: "var(--f-mono)" }}>
                    $420,000 USD
                  </span>
                </div>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Hợp đồng dịch vụ thiếu điều khoản chấm dứt trước hạn, khó thoái lui nếu đối tác vi phạm cam kết SLA."
                  : "Missing Termination Clause in master services contract, preventing exit upon SLA breach."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
                <button
                  onClick={() => handleOmnibarSubmit("Đề xuất bổ sung Termination Clause cho HĐ ATENTO SA")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5.5px 11px",
                    borderRadius: "7px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10 }} />
                  <span>{isVi ? "Rà soát với Copilot" : "Review with Copilot"}</span>
                </button>
                <button
                  onClick={() => onNavigate("documents", "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "7px",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    background: "var(--surface)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <i className="fa-solid fa-file-pdf" style={{ fontSize: 11, color: "#dc2626" }} />
                  <span>{isVi ? "Xem văn bản gốc" : "View Contract"}</span>
                </button>
              </div>
            </div>

            {/* Alert Item 3: ERP Telemetry */}
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(8, 145, 178, 0.03)",
                border: "1px solid rgba(8, 145, 178, 0.22)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(8, 145, 178, 0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(8, 145, 178, 0.22)"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "rgba(8, 145, 178, 0.12)",
                    color: "#0891b2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    <i className="fa-solid fa-chart-line" style={{ fontSize: 10 }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.35 }}>
                    Biến động Đơn hàng VIP: Công ty Cơ khí Đông Nam
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#0891b2", background: "rgba(8,145,178,0.12)", padding: "2px 7px", borderRadius: "4px", textTransform: "uppercase" }}>
                    {isVi ? "Theo dõi ERP" : "ERP Alert"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.08)", padding: "2px 7px", borderRadius: "4px", fontFamily: "var(--f-mono)" }}>
                    -30% Q/Q
                  </span>
                </div>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>
                {isVi
                  ? "Dữ liệu bán hàng ghi nhận đơn đặt hàng giảm 30% so với cùng kỳ. Cần chỉ đạo phụ trách kinh doanh đối soát nhu cầu."
                  : "ERP data indicates a 30% reduction in quarterly orders. Sales follow-up recommended."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
                <button
                  onClick={() => onNavigate("executive")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5.5px 11px",
                    borderRadius: "7px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    background: "var(--surface)",
                    color: "var(--blue)",
                    border: "1px solid rgba(8, 145, 178, 0.3)",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--blue-dim)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
                >
                  <i className="fa-solid fa-chart-line" style={{ fontSize: 11 }} />
                  <span>{isVi ? "Kiểm tra số liệu ERP" : "Inspect ERP Telemetry"}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT COLUMN: NHẬT KÝ ĐƠN HÀNG BÁN HÀNG THỜI GIAN THỰC (100% REAL ERP) */}
        <Card
          title={isVi ? "Nhật ký tác nghiệp gần đây" : "Recent Activities"}
          subtitle={isVi ? "Cập nhật thời gian thực các truy vấn và văn bản xử lý" : "Real-time query & transaction activities"}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>{isVi ? "Xem tất cả" : "View all"}</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
              </span>
            </Button>
          }
          padding="0"
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          {(() => {
            const renderedActs = (liveActivities && liveActivities.length > 0)
              ? liveActivities.slice(0, 6)
              : RECENT_ACTIVITIES.slice(0, 6);

            return (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {renderedActs.map((act, idx) => {
                    return (
                      <div
                        key={act.id || idx}
                        onClick={() => onNavigate("executive")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "11px 18px",
                          borderBottom: idx < renderedActs.length - 1 ? "1px solid var(--border-soft, #f1f5f9)" : "none",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover, rgba(8,145,178,0.03))"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                          {/* Icon đơn hàng trực quan, tinh gọn theo cấu trúc gốc */}
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "8px",
                              background: "rgba(8, 145, 178, 0.08)",
                              color: "#0891b2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <i className="fa-regular fa-file-lines" style={{ fontSize: 14 }} />
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            {/* Title: Giữ nguyên cấu trúc "Đơn hàng mới #..." */}
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--text-1, #0F172A)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={act.title || (isVi ? act.titleVi : act.titleEn)}
                            >
                              {act.title || (isVi ? act.titleVi : act.titleEn)}
                            </div>

                            {/* Description: 100% Khách hàng thật và số tiền thật */}
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "var(--text-3, #64748B)",
                                marginTop: "2px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={act.description || (isVi ? act.metaVi : act.metaEn)}
                            >
                              {act.description || (isVi ? act.metaVi : act.metaEn)}
                            </div>
                          </div>
                        </div>

                        {/* Right: Ngày giao dịch & Badge số tiền trực quan */}
                        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-4, #94A3B8)",
                              whiteSpace: "nowrap",
                              fontFamily: "var(--f-mono)"
                            }}
                          >
                            {act.timestamp || act.timeVi || "2014-06-30"}
                          </span>
                          {act.badge && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 600,
                                color: "#059669",
                                background: "rgba(5, 150, 105, 0.08)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontFamily: "var(--f-mono)",
                                letterSpacing: "-0.2px"
                              }}
                            >
                              {act.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Thanh trạng thái neo đáy card chuẩn gốc */}
                <div style={{
                  padding: "10px 18px",
                  background: "var(--surface-2)",
                  borderTop: "1px solid var(--border-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11.5px",
                  color: "var(--text-3)",
                  marginTop: "auto"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <i className="fa-solid fa-bolt" style={{ color: "var(--cyan)", fontSize: "11px" }} />
                    <span style={{ fontWeight: 500 }}>
                      {isVi ? "31,465 giao dịch đồng bộ từ ERP AdventureWorks" : "31,465 synchronized AdventureWorks ERP transactions"}
                    </span>
                  </span>
                  <button
                    onClick={() => onNavigate("reports")}
                    style={{
                      color: "var(--blue)",
                      fontWeight: 600,
                      fontSize: "11.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: 0
                    }}
                  >
                    <span>{isVi ? "Xem tất cả" : "View all"}</span>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                  </button>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>
      </div>
    </div>
  );
}
