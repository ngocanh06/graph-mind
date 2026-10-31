import React, { useState, useEffect } from "react";
import {
  Clock, TrendingDown, AlertTriangle, CheckCircle2,
  Bot, Check, ShieldAlert, Sparkles, Filter, RefreshCw,
  FileText, ExternalLink, ShieldCheck, ArrowRight, Database
} from "lucide-react";
import { PageHeader, Card, Badge, Button, EmptyState } from "../../components/ui";
import { fetchRiskAlerts } from "../../services/api";

const ALL_ALERTS_DATA = (isVi) => [
  {
    id: "ALERT-LEGAL-LIAB",
    category: "legal_risk",
    dept: "legal",
    severity: "high",
    variant: "danger",
    Icon: ShieldAlert,
    badgeLabel: isVi ? "Không có trần bồi thường (No Liability Cap)" : "No Liability Cap",
    detectedAt: isVi ? "Phát hiện từ Neo4j Clause Graph" : "Detected from Neo4j Clause Graph",
    title: isVi
      ? "Hợp đồng ADUROBIOTECHINC_03_28_2014-EX-10.1 thiếu điều khoản Giới hạn trách nhiệm"
      : "Contract ADUROBIOTECHINC_03_28_2014-EX-10.1 lacks Limitation of Liability",
    description: isVi
      ? "Phân tích đồ thị tri thức phát hiện hợp đồng thiếu điều khoản Giới hạn trách nhiệm bồi thường (Limitation of Liability). Khi có tranh chấp hoặc sự cố, doanh nghiệp đối mặt với rủi ro bồi thường vô hạn mức (74/510 hợp đồng có lỗ hổng này trong đồ thị Neo4j)."
      : "Graph analysis reveals contract lacks a Limitation of Liability clause, exposing enterprise to uncapped damages in disputes (74/510 contracts affected).",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Pháp chế & Rủi ro" : "Legal & Risk" },
      { label: isVi ? "Rủi ro pháp lý:" : "Legal Risk:", value: isVi ? "Bồi thường không giới hạn (Uncapped Liability)" : "Uncapped Liability" },
      { label: isVi ? "Tệp văn bản:" : "Document File:", value: "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf" },
      { label: isVi ? "Trích dẫn nguồn:" : "Source citation:", value: "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf", isLink: true },
    ],
    docId: "ADUROBIOTECHINC_03_28_2014-EX-10.1-COLLABORATION AGREEMENT.pdf",
    aliasId: "CUAD_001",
  },
  {
    id: "ALERT-LEGAL-TERM",
    category: "legal_risk",
    dept: "legal",
    severity: "medium",
    variant: "purple",
    Icon: AlertTriangle,
    badgeLabel: isVi ? "Thiếu điều khoản chấm dứt (No Termination)" : "No Termination Clause",
    detectedAt: isVi ? "Phát hiện từ Neo4j Clause Graph" : "Detected from Neo4j Clause Graph",
    title: isVi
      ? "Hợp đồng ATENTOSA_04_24_2017-EX-10.1 thiếu điều khoản Chấm dứt hợp đồng"
      : "Contract ATENTOSA_04_24_2017-EX-10.1 lacks Termination clause",
    description: isVi
      ? "Đồ thị tri thức ghi nhận hợp đồng không chứa điều khoản Chấm dứt (Termination Clause), khiến doanh nghiệp thiếu cơ chế đơn phương rút lui an toàn khi đối tác vi phạm cam kết (52/510 hợp đồng có lỗ hổng này)."
      : "Knowledge graph reports absence of a Termination clause, restricting enterprise exit options upon partner breach (52/510 contracts affected).",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Pháp chế & Rủi ro" : "Legal & Risk" },
      { label: isVi ? "Rủi ro pháp lý:" : "Legal Risk:", value: isVi ? "Thiếu cơ chế rút lui an toàn" : "Safe Exit Missing" },
      { label: isVi ? "Tệp văn bản:" : "Document File:", value: "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf" },
      { label: isVi ? "Trích dẫn nguồn:" : "Source citation:", value: "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf", isLink: true },
    ],
    docId: "ATENTOSA_04_24_2017-EX-10.1-SERVICES AGREEMENT.pdf",
    aliasId: "CUAD_002",
  },
  {
    id: "ALERT-FIN-LOSS-1",
    category: "financial_risk",
    dept: "sales",
    severity: "high",
    variant: "danger",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Bán lỗ dưới giá vốn (-$15,100 USD)" : "Sold Below Standard Cost (-$15,100)",
    detectedAt: isVi ? "Phát hiện từ Neo4j SalesOrder & Margin Analyzer" : "Detected from Neo4j SalesOrder & Margin",
    title: isVi
      ? "Đơn hàng #51823 (Metro Metals Co.) bán dưới giá vốn tiêu chuẩn"
      : "Order #51823 (Metro Metals Co.) sold below standard cost",
    description: isVi
      ? "Phân tích biên lợi nhuận ghi nhận Đơn hàng #51823 bán 21 sản phẩm 'Touring-1000 Yellow, 60' với đơn giá sau chiết khấu 20% là $762.90 USD, thấp hơn đáng kể so với Giá vốn tiêu chuẩn $1,481.94 USD (StandardCost). Khoản lỗ gộp phát sinh: -$15,099.75 USD."
      : "Margin analysis shows Order #51823 sold 21x 'Touring-1000 Yellow, 60' at net unit price $762.90 USD (after 20% discount) vs standard cost $1,481.94 USD, generating gross loss of -$15,099.75 USD.",
    meta: [
      { label: isVi ? "Khách hàng:" : "Customer:", value: "CUST-29615 (Metro Metals Co.)" },
      { label: isVi ? "Mã đơn hàng:" : "Order ID:", value: "Order #51823" },
      { label: isVi ? "Sản phẩm:" : "Product:", value: "Touring-1000 Yellow, 60 (SL: 21, Chiết khấu: 20%)" },
      { label: isVi ? "Lỗ biên lợi nhuận:" : "Margin Loss:", value: "-$15,099.75 USD", highlight: "var(--red, #DC2626)" },
    ],
    orderId: 51823,
    docId: "Sales_SalesOrderDetail.csv",
    aliasId: "SO_51823",
  },
  {
    id: "ALERT-FIN-LOSS-2",
    category: "financial_risk",
    dept: "sales",
    severity: "high",
    variant: "danger",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Bán lỗ dưới giá vốn (-$14,846 USD)" : "Sold Below Standard Cost (-$14,846)",
    detectedAt: isVi ? "Phát hiện từ Neo4j SalesOrder & Margin Analyzer" : "Detected from Neo4j SalesOrder & Margin",
    title: isVi
      ? "Đơn hàng #46380 (Golf and Cycle Store) bán dưới giá vốn tiêu chuẩn"
      : "Order #46380 (Golf and Cycle Store) sold below standard cost",
    description: isVi
      ? "Đơn hàng #46380 bán 11 sản phẩm 'Mountain-100 Black, 42' với đơn giá sau chiết khấu 35% là $548.44 USD, thấp hơn giá vốn tiêu chuẩn $1,898.09 USD. Khoản lỗ gộp phát sinh: -$14,846.24 USD."
      : "Order #46380 sold 11x 'Mountain-100 Black, 42' at net unit price $548.44 USD (after 35% discount) vs standard cost $1,898.09 USD, incurring -$14,846.24 USD gross loss.",
    meta: [
      { label: isVi ? "Khách hàng:" : "Customer:", value: "CUST-29562 (Golf and Cycle Store)" },
      { label: isVi ? "Mã đơn hàng:" : "Order ID:", value: "Order #46380" },
      { label: isVi ? "Sản phẩm:" : "Product:", value: "Mountain-100 Black, 42 (SL: 11, Chiết khấu: 35%)" },
      { label: isVi ? "Lỗ biên lợi nhuận:" : "Margin Loss:", value: "-$14,846.24 USD", highlight: "var(--red, #DC2626)" },
    ],
    orderId: 46380,
    docId: "Sales_SalesOrderDetail.csv",
    aliasId: "SO_46380",
  },
  {
    id: "ALERT-FIN-DISC",
    category: "financial_risk",
    dept: "sales",
    severity: "medium",
    variant: "warning",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Chiết khấu đột biến (40%)" : "Abnormal Discount (40%)",
    detectedAt: isVi ? "Phát hiện từ Neo4j SalesOrder Header" : "Detected from Neo4j SalesOrder Header",
    title: isVi
      ? "Đơn hàng #69471 (Brakes and Gears) chiết khấu vượt trần 40%"
      : "Order #69471 (Brakes and Gears) discount spike 40%",
    description: isVi
      ? "Đơn hàng #69471 áp dụng mức giảm giá đơn giá lên tới 40% cho sản phẩm 'Mountain-500 Silver, 40', vượt ngưỡng chiết khấu thông thường cho khách hàng này. Doanh thu dòng: $677.99 USD."
      : "Order #69471 applies a 40% discount on 'Mountain-500 Silver, 40', exceeding normal tier discount policies. Line revenue: $677.99 USD.",
    meta: [
      { label: isVi ? "Khách hàng:" : "Customer:", value: "CUST-29818 (Brakes and Gears)" },
      { label: isVi ? "Mã đơn hàng:" : "Order ID:", value: "Order #69471" },
      { label: isVi ? "Tỷ lệ chiết khấu:" : "Discount Rate:", value: "40%", highlight: "var(--amber, #D97706)" },
      { label: isVi ? "Doanh thu dòng:" : "Line Revenue:", value: "$677.99 USD" },
    ],
    orderId: 69471,
    docId: "Sales_SalesOrderDetail.csv",
    aliasId: "SO_69471",
  },
];

export default function RiskView({ onNavigate, lang = "vi", role = "executive", currentUser }) {
  const isVi = lang === "vi";
  
  // 3-Tier Enterprise Role Matrix (SRS BR-02, BR-05, UC.20, US34, US23)
  const isExecOrAdmin = role === "executive" || role === "it_admin" || currentUser?.id === "executive" || currentUser?.id === "it_admin";
  const isManager = role === "knowledge_manager" || currentUser?.id === "knowledge_manager";
  const isStandardSales = !isExecOrAdmin && !isManager;

  const userDept = currentUser?.department || (isVi ? "Kinh doanh & Bán hàng" : "Sales & BD");
  const isLegalDept = (currentUser?.department || "").toLowerCase().includes("pháp chế") || (currentUser?.department || "").toLowerCase().includes("legal");

  const [filter, setFilter] = useState("all");
  const [resolved, setResolved] = useState({});
  const [showEmpty, setShowEmpty] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);

  const loadAlerts = async () => {
    setIsLoadingLive(true);
    try {
      const res = await fetchRiskAlerts(currentUser || role, currentUser?.department || "Kinh doanh");
      if (res && res.success && res.data && res.data.length > 0) {
        setLiveAlerts(res.data);
      }
    } catch (err) {
      console.warn("[RiskView] Failed to fetch live alerts:", err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Truy vấn dữ liệu cảnh báo thực tế từ Backend API (Neo4j & Qdrant)
  useEffect(() => {
    loadAlerts();
  }, [role, currentUser]);

  // US23, US34, UC.20: PHÂN QUYỀN DATA SCOPE THEO ĐẶC TẢ
  // - Executive/Admin: Toàn quyền truy cập tất cả cảnh báo vĩ mô toàn doanh nghiệp (BR-05)
  // - Department Manager: Giám sát toàn diện trong phạm vi phòng ban quản lý (BR-02 / BR-04)
  // - Standard User: Giới hạn nghiêm ngặt theo ca việc phòng ban được giao (US23 / FR43 / E2)
  const sourceAlerts = liveAlerts.length > 0 ? liveAlerts : ALL_ALERTS_DATA(isVi);
  const rawAlerts = isExecOrAdmin
    ? sourceAlerts
    : isManager
    ? (isLegalDept
        ? sourceAlerts.filter((a) => a.dept === "legal" || a.category === "legal_risk")
        : sourceAlerts.filter((a) => a.dept === "sales" || a.category === "financial_risk"))
    : sourceAlerts.filter((a) => a.category === "financial_risk");

  const countFinancial = rawAlerts.filter((a) => a.category === "financial_risk" || a.category === "order_drop").length;
  const countLegal = rawAlerts.filter((a) => a.category === "legal_risk" || a.category === "legal_anomaly" || a.category === "LEGAL_COMPLIANCE").length;
  const countHigh = rawAlerts.filter((a) => a.severity === "high" || a.severity === "critical" || a.variant === "danger").length;

  const visible = showEmpty
    ? []
    : rawAlerts.filter((a) => {
        if (resolved[a.id]) return false;
        if (filter === "financial_risk") return a.category === "financial_risk" || a.category === "order_drop";
        if (filter === "legal_risk") return a.category === "legal_risk" || a.category === "legal_anomaly" || a.category === "LEGAL_COMPLIANCE";
        if (filter === "high") return a.severity === "high" || a.severity === "critical" || a.variant === "danger";
        return true;
      });

  const handleResolve = (id) => setResolved((prev) => ({ ...prev, [id]: true }));

  // Filter Buttons theo tiêu chí phân quyền chuẩn hóa 2 trụ cột rủi ro thật: Pháp lý & Tài chính
  const filterBtns = isExecOrAdmin
    ? [
        { key: "all", label: `${isVi ? "Tất cả cảnh báo vĩ mô" : "All Enterprise Alerts"} (${rawAlerts.length})` },
        { key: "high", label: `${isVi ? "Mức độ Nghiêm trọng" : "Critical"} (${countHigh})`, variant: "danger" },
        { key: "legal_risk", label: `${isVi ? "Rủi ro Pháp lý" : "Legal Risks"} (${countLegal})`, variant: "purple" },
        { key: "financial_risk", label: `${isVi ? "Rủi ro Tài chính & Giá vốn" : "Financial & Margin Risks"} (${countFinancial})`, variant: "warning" },
      ]
    : isManager
    ? [
        { key: "all", label: `${isVi ? "Tất cả cảnh báo phòng ban" : "All Department Alerts"} (${rawAlerts.length})` },
        { key: "high", label: `${isVi ? "Mức độ Cao" : "Critical"} (${countHigh})`, variant: "danger" },
        { key: "legal_risk", label: `${isVi ? "Rủi ro Pháp lý" : "Legal Risks"} (${countLegal})`, variant: "purple" },
        { key: "financial_risk", label: `${isVi ? "Rủi ro Tài chính" : "Financial Risks"} (${countFinancial})`, variant: "warning" },
      ]
    : [
        { key: "all", label: `${isVi ? "Cảnh báo Kinh doanh & Giá vốn" : "All Sales Alerts"} (${rawAlerts.length})` },
        { key: "high", label: `${isVi ? "Mức độ Cao" : "Critical"} (${countHigh})`, variant: "danger" },
        { key: "financial_risk", label: `${isVi ? "Rủi ro Giá vốn & Chiết khấu" : "Margin & Discount Risks"} (${countFinancial})`, variant: "warning" },
      ];

  const pageTitle = isExecOrAdmin
    ? (isVi ? "Trung tâm Cảnh báo Rủi ro Thông minh" : "Smart Risk & Alert Center")
    : isManager
    ? (isVi ? `Trung tâm Cảnh báo Rủi ro Phòng ban: ${userDept}` : `Department Risk & Alert Center: ${currentUser?.departmentEn || userDept}`)
    : (isVi ? "Cảnh báo Rủi ro Phòng Kinh doanh (Sales Risk Center)" : "Sales Department Risk Alerts");

  const pageSubtitle = isExecOrAdmin
    ? (isVi
        ? "Đài quan sát rủi ro vĩ mô toàn diện: giám sát hợp đồng thiếu điều khoản bảo vệ pháp lý (CUAD) và đơn vị phát sinh thâm hụt biên lợi nhuận dưới giá vốn (AdventureWorks) từ đồ thị tri thức."
        : "Comprehensive enterprise risk center: early detection of expiring contracts, VIP order cadence drops and legal anomalies across knowledge graph (BR-05 / UC.20).")
    : isManager
    ? (isVi
        ? `Giám sát toàn diện các chỉ số rủi ro tác nghiệp, hợp đồng sắp mãn hạn và biến động doanh số thuộc phạm vi ${userDept} (BR-02 / BR-04 / UC.20).`
        : `Monitor operational risks, contract expirations and revenue anomalies within assigned department scope (BR-02 / BR-04 / UC.20).`)
    : (isVi
        ? "Chỉ hiển thị cảnh báo sụt giảm đơn hàng & hợp đồng sắp hết hạn thuộc phạm vi ca làm việc & phòng Kinh doanh (US23, US39, FR43). Hỗ trợ chuyên viên chủ động đàm phán tái ký."
        : "Dedicated sales operational alerts: Track expiring client contracts and order cadence dips for sales shift (US23, US39, FR43).");

  const scopeBadge = isExecOrAdmin ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span>{isVi ? "Phạm vi: Toàn doanh nghiệp (Full Enterprise Scope · BR-05)" : "Scope: Enterprise-Wide (BR-05)"}</span>
      {liveAlerts.length > 0 && (
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.12)", padding: "1px 7px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.25)" }}>
          ● Live Neo4j & Qdrant
        </span>
      )}
    </span>
  ) : isManager ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span>{isVi ? `Phạm vi quản lý: ${userDept} (BR-02 Scope)` : `Scope: ${userDept} (BR-02 Scope)`}</span>
      {liveAlerts.length > 0 && (
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.12)", padding: "1px 7px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.25)" }}>
          ● Live Neo4j & Qdrant
        </span>
      )}
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span>{isVi ? "Phạm vi nghiệp vụ: Phòng Kinh doanh (US23/FR43)" : "Scope: Sales Department (US23/FR43)"}</span>
      {liveAlerts.length > 0 && (
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.12)", padding: "1px 7px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.25)" }}>
          ● Live Neo4j & Qdrant
        </span>
      )}
    </span>
  );

  return (
    <div style={{ background: "var(--base, #F8FAFC)", minHeight: "100%", padding: "28px 32px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── HEADER TOOLBAR ─────────────────────────────────── */}
        <PageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          badge={scopeBadge}
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {filterBtns.map(({ key, label, variant }) => {
                const isActive = filter === key && !showEmpty;
                return (
                  <Button
                    key={key}
                    variant={isActive ? (variant || "primary") : "secondary"}
                    size="sm"
                    onClick={() => { setFilter(key); setShowEmpty(false); }}
                  >
                    {label}
                  </Button>
                );
              })}

              <Button
                variant={showEmpty ? "primary" : "ghost"}
                size="sm"
                onClick={() => setShowEmpty((v) => !v)}
              >
                {isVi ? "Mô phỏng Trống" : "Simulate Empty"}
              </Button>
            </div>
          }
        />

        {/* ── THỐNG KÊ TỔNG QUAN THEO NHÓM VAI TRÒ ───────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isExecOrAdmin ? "repeat(auto-fit, minmax(280px, 1fr))" : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
{/* Card 1: Rủi ro Tài chính & Giá vốn (AdventureWorks) */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.02) 100%)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                background: "rgba(220,38,38,0.15)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingDown size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#991B1B" }}>
                {isVi ? "RỦI RO TÀI CHÍNH & GIÁ VỐN (ADVENTUREWORKS)" : "FINANCIAL & MARGIN RISKS"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#991B1B", marginTop: "2px" }}>
                {countFinancial} {isVi ? "Đơn hàng bất thường" : "Anomalous Orders"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#7F1D1D" }}>
                {isVi ? "Bán dưới StandardCost & chiết khấu đột biến" : "Sales below cost & discount spikes"}
              </div>
            </div>
          </div>

          {/* Card 2: Rủi ro Pháp lý & Hợp đồng (CUAD) */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 100%)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                background: "rgba(139,92,246,0.15)",
                color: "#8B5CF6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#5B21B6" }}>
                {isVi ? "RỦI RO ĐIỀU KHOẢN PHÁP LÝ (CUAD)" : "LEGAL COMPLIANCE EXPOSURE"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#5B21B6", marginTop: "2px" }}>
                {countLegal} {isVi ? "Hợp đồng thiếu điều khoản" : "Contracts Lacking Clauses"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#4C1D95" }}>
                {isVi ? "74 hợp đồng thiếu trần bồi thường, 52 thiếu chấm dứt" : "74 uncapped liability, 52 no termination"}
              </div>
            </div>
          </div>

          {/* Card 3: Cảnh báo Mức độ Nghiêm trọng */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.02) 100%)",
              border: "1px solid rgba(217,119,6,0.25)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                background: "rgba(217,119,6,0.15)",
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#92400E" }}>
                {isVi ? "CẢNH BÁO MỨC ĐỘ NGHIÊM TRỌNG" : "CRITICAL SEVERITY ALERTS"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#92400E", marginTop: "2px" }}>
                {countHigh} {isVi ? "Cảnh báo ưu tiên cao" : "High Priority Alerts"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#78350F" }}>
                {isVi ? "Cần phê duyệt & chỉ đạo xử lý từ Ban Điều hành" : "Requires Executive review & guidance"}
              </div>
            </div>
          </div>
        </div>

        {/* ── ALERTS LIST / EMPTY STATE ─────────────────────── */}
        {showEmpty || visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={isVi ? "Không còn cảnh báo rủi ro tồn đọng" : "No active risk alerts remaining"}
            description={
              isExecOrAdmin
                ? (isVi
                    ? "Toàn bộ hợp đồng CUAD và các giao dịch AdventureWorks trên đồ thị tri thức đều an toàn, nằm trong biên độ tuân thủ chuẩn."
                    : "All enterprise contracts and AdventureWorks orders on the knowledge graph are safe and compliant.")
                : isManager
                ? (isVi
                    ? `Toàn bộ hợp đồng và hoạt động kinh doanh thuộc phạm vi ${userDept} đang vận hành ổn định.`
                    : `All contracts and activities within ${userDept} are running within normal parameters.`)
                : (isVi
                    ? "Toàn bộ hợp đồng phòng Kinh doanh được giao đều an toàn, không có giao dịch bất thường trong ca làm việc."
                    : "All assigned sales contracts and orders remain safe during this shift.")
            }
            actionLabel={isVi ? "Khôi phục dữ liệu mẫu" : "Restore sample alerts"}
            onAction={() => { setShowEmpty(false); setFilter("all"); setResolved({}); }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {visible.map((alert) => {
              const AlertIcon = alert.Icon || (alert.category === "legal_risk" ? ShieldAlert : (alert.category === "financial_risk" ? TrendingDown : AlertTriangle));
              return (
                <Card
                  key={alert.id}
                  padding="20px 24px"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    borderLeft: `4px solid ${
                      alert.variant === "danger"
                        ? "var(--red, #DC2626)"
                        : alert.variant === "warning"
                        ? "var(--amber, #D97706)"
                        : "#8B5CF6"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: alert.variant === "danger" ? "var(--red-soft, rgba(220,38,38,0.08))" : "var(--amber-soft, rgba(217,119,6,0.08))",
                        color: alert.variant === "danger" ? "var(--red, #DC2626)" : "var(--amber, #D97706)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <AlertIcon size={20} strokeWidth={2.2} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                        {/* Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Badge variant={alert.variant} dot>
                            {alert.badgeLabel}
                          </Badge>
                          <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--text-3)", fontWeight: 600 }}>
                            {alert.id}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                            • {alert.detectedAt}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--text-1, #0F172A)",
                          margin: 0,
                          fontFamily: "var(--f-display, inherit)"
                        }}>
                          {alert.title}
                        </h3>

                        {/* Description */}
                        <p style={{
                          fontSize: 13,
                          color: "var(--text-2, #334155)",
                          lineHeight: 1.5,
                          margin: "2px 0 6px 0"
                        }}>
                          {alert.description}
                        </p>

                        {/* Metadata */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: 12, color: "var(--text-3, #64748B)" }}>
                          {(alert.meta || []).map((m, mIdx) => (
                            <div key={mIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{m.label}</span>
                              {m.isLink && (alert.docId || alert.aliasId) ? (
                                <span
                                  onClick={() => onNavigate?.("documents", alert.docId || alert.aliasId)}
                                  style={{
                                    color: "var(--primary, #2563EB)",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    fontWeight: 600,
                                  }}
                                  title={isVi ? "Xem văn bản gốc" : "View source document"}
                                >
                                  {m.value}
                                </span>
                              ) : (
                                <strong style={{ color: m.highlight || "var(--text-1, #0F172A)" }}>{m.value}</strong>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Bot}
                        onClick={() => {
                          const query = (alert.category === "legal_risk" || alert.contractId || alert.docId?.endsWith(".pdf") || alert.docId?.endsWith(".PDF"))
                            ? (isVi
                                ? `Phân tích rủi ro pháp lý của hợp đồng ${alert.docId || alert.contractId} (${alert.title}) và đề xuất phương án bổ sung điều khoản bảo vệ dựa trên đồ thị tri thức`
                                : `Analyze legal risk for contract ${alert.docId || alert.contractId} (${alert.title}) and recommend protective clause amendments based on knowledge graph`)
                            : alert.orderId
                            ? (() => {
                                const cust = alert.meta?.find(m => m.label?.includes("Khách hàng") || m.label?.includes("Customer"))?.value || "";
                                const val = alert.meta?.find(m => m.label?.includes("Lỗ") || m.label?.includes("Giá trị") || m.label?.includes("Chiết khấu"))?.value || "";
                                return isVi
                                  ? `Phân tích đơn hàng Order #${alert.orderId}${cust ? ` của khách hàng ${cust}` : ""}${val ? ` (${val})` : ""} và đề xuất giải pháp kiểm soát giá vốn, chiết khấu trên đồ thị tri thức Neo4j`
                                  : `Analyze Order #${alert.orderId}${cust ? ` for customer ${cust}` : ""}${val ? ` (${val})` : ""} and review cost controls and discount policy in Neo4j`;
                              })()
                            : (isVi
                                ? `Phân tích cảnh báo rủi ro: ${alert.title}`
                                : `Analyze risk alert: ${alert.title}`);
                          onNavigate?.("copilot", { query });
                        }}
                      >
                        {isVi ? "Xử lý với Copilot" : "Ask Copilot"}
                      </Button>

                      {(alert.docId || alert.aliasId) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={FileText}
                          onClick={() => onNavigate?.("documents", alert.docId || alert.aliasId)}
                        >
                          {isVi ? "Xem chi tiết" : "View Details"}
                        </Button>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => handleResolve(alert.id)}
                      >
                        {isVi ? "Đã xử lý" : "Mark Resolved"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
