import React, { useState, useEffect } from "react";
import {
  Clock, TrendingDown, AlertTriangle, CheckCircle2,
  Bot, Check, ShieldAlert, Sparkles, Filter, RefreshCw,
  FileText, ExternalLink, ShieldCheck, ArrowRight, Database
} from "lucide-react";
import { PageHeader, Card, Badge, Button, EmptyState } from "../../components/ui";
import { fetchRiskAlerts } from "../../services/api";

function formatDocName(rawName) {
  if (!rawName) return "";
  let name = String(rawName).trim();
  name = name.replace(/\.(pdf|txt|docx|json)$/i, "");

  // Match pattern: COMPANY,INC_MM_DD_YYYY-EX-xx.x-AGREEMENT NAME(x)
  const cuadMatch = name.match(/^([A-Z0-9,.\s&]+?)_[0-9_]+-(?:EX-[0-9\.]+-)?(.+)$/i);
  if (cuadMatch) {
    let org = cuadMatch[1]
      .replace(/[,_]+/g, " ")
      .replace(/\bINC\b/i, "Inc.")
      .replace(/\bCORP\b/i, "Corp.")
      .replace(/\bLLC\b/i, "LLC")
      .replace(/\bLTD\b/i, "Ltd.")
      .trim();
    org = org.replace(/ADUROBIOTECH/i, "Aduro Biotech")
             .replace(/BIOAMBER/i, "BioAmber")
             .replace(/ATENTOSA/i, "Atento SA")
             .replace(/MARTINMIDSTREAM/i, "Martin Midstream");

    let docType = cuadMatch[2].replace(/[_-]+/g, " ").replace(/\(\d+\)/g, "").trim();
    docType = docType.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());

    const yearMatch = rawName.match(/_(\d{4})[-_]|_(\d{2})_(\d{2})_(\d{4})/);
    const year = yearMatch ? (yearMatch[4] || yearMatch[1]) : "";
    const yearStr = year ? ` (${year})` : "";
    return `${org} — ${docType}${yearStr}`;
  }

  if (name.includes("—") || name.includes(" - ")) {
    return name.replace(/\.pdf$/i, "");
  }

  return name.replace(/[_-]+/g, " ");
}

function cleanAlertTitle(title, docId) {
  if (!title) return "";
  const cleanDoc = formatDocName(docId || title);
  if (title.includes("thiếu điều khoản Giới hạn trách nhiệm") || title.includes("Limitation of Liability")) {
    return `Hợp đồng ${cleanDoc} thiếu điều khoản Giới hạn trách nhiệm`;
  }
  if (title.includes("thiếu điều khoản Chấm dứt") || title.includes("Termination")) {
    return `Hợp đồng ${cleanDoc} thiếu điều khoản Chấm dứt hợp đồng`;
  }
  if (title.includes("bồi hoàn thiệt hại") || title.includes("Indemnif")) {
    return `Hợp đồng ${cleanDoc} thiếu điều khoản Bồi hoàn thiệt hại`;
  }
  if (docId) {
    const rawBase = docId.replace(/\.(pdf|docx|txt)$/i, "");
    if (title.includes(docId)) return title.replace(docId, cleanDoc);
    if (title.includes(rawBase)) return title.replace(rawBase, cleanDoc);
    const spaceBase = rawBase.replace(/[_-]+/g, " ");
    if (title.includes(spaceBase)) return title.replace(spaceBase, cleanDoc);
  }
  return title;
}

function cleanAlertDescription(desc, docId) {
  if (!desc) return "";
  if (!docId) return desc;
  const cleanDoc = formatDocName(docId);
  const rawBase = docId.replace(/\.(pdf|docx|txt)$/i, "");
  const spaceBase = rawBase.replace(/[_-]+/g, " ");
  let clean = desc;
  clean = clean.split(docId).join(cleanDoc);
  clean = clean.split(rawBase).join(cleanDoc);
  clean = clean.split(spaceBase).join(cleanDoc);
  clean = clean.replace(/hợp đồng\s+hợp đồng/gi, "hợp đồng");
  return clean;
}

const ALL_ALERTS_DATA = (isVi) => [
  {
    id: "ALERT-LEGAL-LIAB",
    category: "legal_risk",
    dept: "legal",
    severity: "high",
    variant: "danger",
    Icon: ShieldAlert,
    badgeLabel: isVi ? "Không có trần bồi thường" : "No Liability Cap",
    detectedAt: isVi ? "Đồ thị điều khoản Neo4j" : "Neo4j Clause Graph",
    title: isVi
      ? "Hợp đồng Aduro Biotech — Collaboration Agreement (2014) thiếu điều khoản Giới hạn trách nhiệm"
      : "Contract Aduro Biotech — Collaboration Agreement (2014) lacks Limitation of Liability",
    description: isVi
      ? "Phân tích đồ thị tri thức phát hiện hợp đồng thiếu điều khoản Giới hạn trách nhiệm bồi thường. Khi có tranh chấp hoặc sự cố, doanh nghiệp đối mặt với rủi ro bồi thường vô hạn mức (74/510 hợp đồng thiếu điều khoản này)."
      : "Graph analysis reveals contract lacks a Limitation of Liability clause, exposing enterprise to uncapped damages in disputes (74/510 contracts affected).",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Pháp chế & Rủi ro" : "Legal & Risk" },
      { label: isVi ? "Rủi ro pháp lý:" : "Legal Risk:", value: isVi ? "Bồi thường không giới hạn" : "Uncapped Liability" },
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
    badgeLabel: isVi ? "Thiếu điều khoản chấm dứt" : "No Termination Clause",
    detectedAt: isVi ? "Đồ thị điều khoản Neo4j" : "Neo4j Clause Graph",
    title: isVi
      ? "Hợp đồng Atento SA — Services Agreement (2017) thiếu điều khoản Chấm dứt hợp đồng"
      : "Contract Atento SA — Services Agreement (2017) lacks Termination clause",
    description: isVi
      ? "Đồ thị tri thức ghi nhận hợp đồng không chứa điều khoản Chấm dứt hợp đồng, khiến doanh nghiệp thiếu cơ chế đơn phương rút lui an toàn khi đối tác vi phạm cam kết (52/510 hợp đồng thiếu điều khoản này)."
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
    detectedAt: isVi ? "Phân tích giá vốn & biên lợi nhuận" : "SalesOrder & Margin Analyzer",
    title: isVi
      ? "Đơn hàng #51823 (Metro Metals Co.) bán dưới giá vốn tiêu chuẩn"
      : "Order #51823 (Metro Metals Co.) sold below standard cost",
    description: isVi
      ? "Phân tích biên lợi nhuận ghi nhận Đơn hàng #51823 bán 21 sản phẩm 'Touring-1000 Yellow, 60' với đơn giá sau chiết khấu 20% là $762.90 USD, thấp hơn đáng kể so với Giá vốn tiêu chuẩn $1,481.94 USD. Khoản lỗ gộp phát sinh: -$15,099.75 USD."
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
    detectedAt: isVi ? "Phân tích giá vốn & biên lợi nhuận" : "SalesOrder & Margin Analyzer",
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
    detectedAt: isVi ? "Phân tích đơn hàng" : "SalesOrder Analysis",
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
  const normRole = String(role || currentUser?.role || currentUser?.id || "executive").toLowerCase();
  const isExecOrAdmin = normRole === "executive" || normRole === "it_admin" || normRole === "admin" || normRole === "ceo" || normRole === "cfo" || currentUser?.id === "executive" || currentUser?.id === "it_admin" || currentUser?.id === "admin";
  const isManager = normRole === "knowledge_manager" || normRole === "manager" || normRole === "lead" || currentUser?.id === "knowledge_manager";
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
  const sourceAlerts = liveAlerts.length > 0 ? liveAlerts : ALL_ALERTS_DATA(isVi);
  const rawAlerts = isExecOrAdmin
    ? sourceAlerts
    : isManager
    ? (isLegalDept
        ? sourceAlerts.filter((a) => a.dept === "legal" || a.category === "legal_risk")
        : (sourceAlerts.filter((a) => a.dept === "sales" || a.category === "financial_risk").length > 0
            ? sourceAlerts.filter((a) => a.dept === "sales" || a.category === "financial_risk")
            : sourceAlerts))
    : (sourceAlerts.filter((a) => a.category === "financial_risk").length > 0
        ? sourceAlerts.filter((a) => a.category === "financial_risk")
        : sourceAlerts);

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
    ? (isVi ? "Trung tâm Cảnh báo Rủi ro" : "Risk & Alert Center")
    : isManager
    ? (isVi ? `Trung tâm Cảnh báo Rủi ro: ${userDept}` : `Department Risk Center: ${currentUser?.departmentEn || userDept}`)
    : (isVi ? "Cảnh báo Rủi ro Phòng Kinh doanh" : "Sales Department Risk Alerts");

  return (
    <div style={{ background: "var(--base, #F8FAFC)", minHeight: "100%", padding: "28px 32px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── HEADER TOOLBAR ─────────────────────────────────── */}
        <PageHeader
          title={pageTitle}
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
            </div>
          }
        />

        {/* ── THỐNG KÊ TỔNG QUAN THEO NHÓM VAI TRÒ ───────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Card 1: Rủi ro Tài chính & Giá vốn */}
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: "12px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                background: "rgba(220,38,38,0.1)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <TrendingDown size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-3, #64748B)" }}>
                {isVi ? "Rủi ro tài chính & giá vốn" : "Financial & Margin Risks"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px", marginBottom: "2px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1, #0F172A)", lineHeight: 1 }}>
                  {countFinancial}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1, #0F172A)", lineHeight: 1.3 }}>
                  {isVi ? "Đơn hàng bất thường" : "Anomalous Orders"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3, #64748B)", marginTop: "2px", lineHeight: 1.4 }}>
                {isVi ? "Bán dưới giá vốn & chiết khấu đột biến" : "Sales below cost & discount spikes"}
              </div>
            </div>
          </div>

          {/* Card 2: Rủi ro Pháp lý & Hợp đồng */}
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: "12px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                background: "rgba(139,92,246,0.1)",
                color: "#8B5CF6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-3, #64748B)" }}>
                {isVi ? "Rủi ro điều khoản pháp lý" : "Legal Compliance Exposure"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px", marginBottom: "2px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1, #0F172A)", lineHeight: 1 }}>
                  {countLegal}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1, #0F172A)", lineHeight: 1.3 }}>
                  {isVi ? "Hợp đồng thiếu điều khoản" : "Contracts Lacking Clauses"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3, #64748B)", marginTop: "2px", lineHeight: 1.4 }}>
                {isVi ? "74 hợp đồng thiếu trần bồi thường, 52 thiếu chấm dứt" : "74 uncapped liability, 52 no termination"}
              </div>
            </div>
          </div>

          {/* Card 3: Cảnh báo Mức độ Nghiêm trọng */}
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: "12px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                background: "rgba(217,119,6,0.1)",
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-3, #64748B)" }}>
                {isVi ? "Cảnh báo mức độ nghiêm trọng" : "Critical Severity Alerts"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px", marginBottom: "2px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1, #0F172A)", lineHeight: 1 }}>
                  {countHigh}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1, #0F172A)", lineHeight: 1.3 }}>
                  {isVi ? "Cảnh báo ưu tiên cao" : "High Priority Alerts"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3, #64748B)", marginTop: "2px", lineHeight: 1.4 }}>
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
                    ? "Toàn bộ hợp đồng và các giao dịch kinh doanh trên đồ thị tri thức đều an toàn, nằm trong biên độ tuân thủ chuẩn."
                    : "All enterprise contracts and business orders on the knowledge graph are safe and compliant.")
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
                          {alert.detectedAt && (
                            <span style={{ fontSize: 11.5, color: "var(--text-3, #64748B)" }}>
                              • {alert.detectedAt}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--text-1, #0F172A)",
                          margin: "2px 0 0 0",
                          fontFamily: "var(--f-display, inherit)"
                        }}>
                          {cleanAlertTitle(alert.title, alert.docId)}
                        </h3>

                        {/* Description */}
                        <p style={{
                          fontSize: 13,
                          color: "var(--text-2, #334155)",
                          lineHeight: 1.55,
                          margin: "2px 0 8px 0"
                        }}>
                          {cleanAlertDescription(alert.description, alert.docId)}
                        </p>

                        {/* Metadata: Clean & Non-redundant */}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", fontSize: 12, color: "var(--text-3, #64748B)" }}>
                          {(alert.meta || [])
                            .filter(m => !m.label?.includes("Tệp văn bản") && !m.label?.includes("Document File"))
                            .map((m, mIdx) => {
                              const isDocLink = m.isLink || m.label?.includes("Trích dẫn") || m.label?.includes("Nguồn");
                              const displayVal = isDocLink ? formatDocName(m.value || alert.docId) : m.value;
                              return (
                                <div key={mIdx} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span>{isDocLink ? (isVi ? "Hồ sơ gốc:" : "Source:") : m.label}</span>
                                  {isDocLink && (alert.docId || alert.aliasId) ? (
                                    <span
                                      onClick={() => onNavigate?.("documents", alert.docId || alert.aliasId)}
                                      style={{
                                        color: "var(--primary, #2563EB)",
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3
                                      }}
                                      title={m.value}
                                    >
                                      <span>{displayVal}</span>
                                      <ExternalLink size={11} />
                                    </span>
                                  ) : (
                                    <strong style={{ color: m.highlight || "var(--text-1, #0F172A)" }}>{displayVal}</strong>
                                  )}
                                </div>
                              );
                            })}
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
                          const targetFile = alert.docId || alert.contractId;
                          const query = (alert.category === "legal_risk" || alert.contractId || (targetFile && (targetFile.includes(".") || alert.aliasId)))
                            ? (isVi
                                ? `Đọc nội dung và phân tích rủi ro thực tế của tài liệu ${targetFile}, chỉ ra các lỗ hổng và đề xuất phương án bảo vệ`
                                : `Read content and analyze real risks of document ${targetFile}, identify vulnerabilities and suggest mitigations`)
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
                          icon={ExternalLink}
                          onClick={() => onNavigate?.("documents", alert.docId || alert.aliasId)}
                        >
                          {isVi ? "Xem hồ sơ" : "View Doc"}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Check}
                        style={{ color: "#059669", background: "rgba(5, 150, 105, 0.08)", border: "1px solid rgba(5, 150, 105, 0.2)" }}
                        onClick={() => handleResolve(alert.id)}
                      >
                        {isVi ? "Đã xử lý" : "Resolved"}
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
