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
    id: "ALERT-CUAD-087",
    category: "contract_expiring", // Hợp đồng sắp hết hạn
    dept: "sales",
    severity: "high",
    variant: "danger",
    Icon: Clock,
    badgeLabel: isVi ? "Hợp đồng sắp hết hạn (5 ngày)" : "Contract Expiring (5 days)",
    detectedAt: isVi ? "Phát hiện từ đồ thị Neo4j" : "Detected from Neo4j graph",
    title: isVi
      ? "Hợp đồng Cung cấp Linh kiện #087 hết hạn trong 5 ngày"
      : "Component Supply Agreement #087 expiring in 5 days",
    description: isVi
      ? "Hợp đồng nguyên tắc giữa Doanh nghiệp và Tập đoàn Viễn thông Alpha sẽ hết hiệu lực vào ngày 05/11/2026. Điều khoản gia hạn tự động không được kích hoạt trong tệp văn bản quét. Cần tái đàm phán hoặc gia hạn văn bản ngay để tránh gián đoạn chuỗi cung ứng."
      : "Master framework agreement between Enterprise and Alpha Corp expires on Nov 5, 2026. Auto-renewal clause not activated in ingested scan. Urgent renegotiation needed to avoid contract lapse.",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Kinh doanh & Bán hàng" : "Sales & BD" },
      { label: isVi ? "Đối tác:" : "Partner:", value: "Tập đoàn Viễn thông Alpha (CUST-8491)" },
      { label: isVi ? "Giá trị hợp đồng:" : "Contract Value:", value: "1,280,000,000 ₫", highlight: "var(--blue, #2563EB)" },
      {
        label: isVi ? "Trích dẫn nguồn:" : "Source citation:",
        value: "CUAD_Contract_087.pdf",
        isLink: true
      },
    ],
    docId: "CUAD_087",
  },
  {
    id: "ALERT-CRM-3912",
    category: "order_drop", // Sụt giảm đơn hàng
    dept: "sales",
    severity: "medium",
    variant: "warning",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Sụt giảm đơn hàng (-30%)" : "Order Cadence Drop (-30%)",
    detectedAt: isVi ? "Phát hiện 1 ngày trước" : "Detected 1 day ago",
    title: isVi
      ? "Khách hàng VIP (Công ty Cơ khí Đông Nam) giảm 30% tần suất đặt hàng"
      : "VIP Customer (Dong Nam Mechanics) 30% order cadence reduction",
    description: isVi
      ? "Mô hình phân tích đơn hàng từ AdventureWorks SalesOrderHeader ghi nhận số lượng đơn đặt hàng trung bình giảm từ 8 đơn/tháng xuống còn 2 đơn trong 45 ngày qua. Chưa ghi nhận khiếu nại chất lượng dịch vụ trong hệ thống SOP. Cần chuyên viên kinh doanh liên hệ tái chăm sóc."
      : "Time-series order analytics from AdventureWorks SalesOrderHeader detects average monthly orders dropped from 8 to 2 over the past 45 days. No quality tickets recorded in SOP tracker. Sales rep re-engagement recommended.",
    meta: [
      { label: isVi ? "Khách hàng ID:" : "Customer ID:", value: "CUST-3912 (Cơ khí Đông Nam)" },
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Kinh doanh & Bán hàng" : "Sales & BD" },
      {
        label: isVi ? "Doanh số sụt giảm dự kiến:" : "Projected revenue dip:",
        value: "-285,000,000 ₫",
        highlight: "var(--red, #DC2626)"
      },
    ],
    docId: "CUAD_042",
  },
  {
    id: "ALERT-EXP-104",
    category: "contract_expiring", // Hợp đồng sắp hết hạn
    dept: "sales",
    severity: "high",
    variant: "danger",
    Icon: Clock,
    badgeLabel: isVi ? "Hợp đồng sắp hết hạn (18 ngày)" : "Contract Expiring (18 days)",
    detectedAt: isVi ? "Phát hiện hôm qua" : "Detected yesterday",
    title: isVi
      ? "Hợp đồng Đại lý Ủy quyền #104 (Logistics Toàn Cầu Tech) hết hạn trong 18 ngày"
      : "Authorized Distributor Agreement #104 (Global Logistics Tech) expiring in 18 days",
    description: isVi
      ? "Hợp đồng phân phối đại lý độc quyền giữa Doanh nghiệp và Logistics Toàn Cầu Tech hết hiệu lực ngày 15/12/2026. Đối tác đề xuất mở rộng thêm danh mục phụ tùng mới, cần chuẩn bị phụ lục hợp đồng đính kèm trước khi đáo hạn."
      : "Exclusive distributor contract expires Dec 15, 2026. Partner requested new parts catalogue expansion. Prepare contract renewal addendum prior to expiry.",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Kinh doanh & Bán hàng" : "Sales & BD" },
      { label: isVi ? "Đối tác:" : "Partner:", value: "Logistics Toàn Cầu Tech (CUST-1044)" },
      { label: isVi ? "Giá trị hợp đồng:" : "Contract Value:", value: "740,000,000 ₫", highlight: "var(--blue, #2563EB)" },
      {
        label: isVi ? "Trích dẫn nguồn:" : "Source citation:",
        value: "CUAD_Contract_104.pdf",
        isLink: true
      },
    ],
    docId: "CUAD_104",
  },
  {
    id: "ALERT-ORDER-4102",
    category: "order_drop", // Sụt giảm đơn hàng
    dept: "sales",
    severity: "medium",
    variant: "warning",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Sụt giảm đơn hàng (Chậm 30 ngày)" : "Order Lag (>30 days)",
    detectedAt: isVi ? "Phát hiện 2 ngày trước" : "Detected 2 days ago",
    title: isVi
      ? "Đối tác Phân phối (Minh Phát Corp) chậm phát sinh đơn hàng mới quá 30 ngày"
      : "Distribution Partner (Minh Phat Corp) no new orders for >30 days",
    description: isVi
      ? "Theo dõi chu kỳ mua hàng định kỳ ghi nhận Minh Phát Corp đã quá 30 ngày chưa phát sinh Purchase Order theo Hợp đồng nguyên tắc bán buôn CUAD_115. Đề xuất nhân viên phụ trách kiểm tra tình trạng tồn kho của đại lý."
      : "Periodic replenishment cycle shows Minh Phat Corp overdue by >30 days without new Purchase Order under Master Wholesale Agreement CUAD_115. Recommend checking dealer stock levels.",
    meta: [
      { label: isVi ? "Khách hàng ID:" : "Customer ID:", value: "CUST-4102 (Minh Phát Corp)" },
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Kinh doanh & Bán hàng" : "Sales & BD" },
      {
        label: isVi ? "Doanh số dự kiến ảnh hưởng:" : "Projected revenue impact:",
        value: "-120,000,000 ₫",
        highlight: "var(--amber, #D97706)"
      },
    ],
    docId: "CUAD_115",
  },
  {
    id: "ALERT-GRAPH-042",
    category: "legal_anomaly", // Bất thường pháp lý (Pháp chế / Toàn doanh nghiệp)
    dept: "legal",
    severity: "medium",
    variant: "purple",
    Icon: AlertTriangle,
    badgeLabel: isVi ? "Bất thường Pháp lý" : "Contract Anomaly",
    detectedAt: isVi ? "Phát hiện 2 ngày trước" : "Detected 2 days ago",
    title: isVi
      ? "Điều khoản bất thường trong Hợp đồng CUAD_042"
      : "Abnormal Clause Detected in Contract CUAD_042",
    description: isVi
      ? "Neo4j Schema Inspector phát hiện quan hệ HAS_RISK_LIABILITY liên kết giữa điều khoản thanh toán và rủi ro phạt hợp đồng không có mức trần (No Liability Cap)."
      : "Neo4j Schema Inspector detected HAS_RISK_LIABILITY relationship linking payment terms to an uncapped indemnification clause (No Liability Cap).",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Pháp chế & Rủi ro" : "Legal & Risk" },
      { label: isVi ? "Thực thể liên quan:" : "Associated Entity:", value: "Node CUAD_042_Clause_19" },
    ],
    docId: "CUAD_042",
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
        ? sourceAlerts.filter((a) => a.dept === "legal" || a.category === "legal_anomaly")
        : sourceAlerts.filter((a) => a.dept === "sales" || a.category === "order_drop" || a.category === "contract_expiring"))
    : sourceAlerts.filter((a) => a.dept === "sales" && (a.category === "order_drop" || a.category === "contract_expiring"));

  const countExpiring = rawAlerts.filter((a) => a.category === "contract_expiring").length;
  const countOrderDrop = rawAlerts.filter((a) => a.category === "order_drop").length;
  const countLegal = rawAlerts.filter((a) => a.category === "legal_anomaly" || a.category === "LEGAL_COMPLIANCE").length;
  const countHigh = rawAlerts.filter((a) => a.severity === "high" || a.severity === "critical" || a.variant === "danger").length;

  const visible = showEmpty
    ? []
    : rawAlerts.filter((a) => {
        if (resolved[a.id]) return false;
        if (filter === "contract_expiring") return a.category === "contract_expiring";
        if (filter === "order_drop") return a.category === "order_drop";
        if (filter === "legal_anomaly") return a.category === "legal_anomaly" || a.category === "LEGAL_COMPLIANCE";
        if (filter === "high") return a.severity === "high" || a.severity === "critical" || a.variant === "danger";
        return true;
      });

  const handleResolve = (id) => setResolved((prev) => ({ ...prev, [id]: true }));

  // Filter Buttons theo tiêu chí phân quyền từng nhóm vai trò
  const filterBtns = isExecOrAdmin
    ? [
        { key: "all", label: `${isVi ? "Tất cả cảnh báo vĩ mô" : "All Enterprise Alerts"} (${rawAlerts.length})` },
        { key: "high", label: `${isVi ? "Mức độ Nghiêm trọng" : "Critical"} (${countHigh})`, variant: "danger" },
        { key: "contract_expiring", label: `${isVi ? "Hợp đồng sắp hết hạn" : "Expiring Contracts"} (${countExpiring})` },
        { key: "order_drop", label: `${isVi ? "Sụt giảm đơn hàng" : "Order Drops"} (${countOrderDrop})` },
        { key: "legal_anomaly", label: `${isVi ? "Bất thường Pháp lý" : "Legal Anomalies"} (${countLegal})`, variant: "purple" },
      ]
    : isManager
    ? [
        { key: "all", label: `${isVi ? "Tất cả cảnh báo phòng ban" : "All Department Alerts"} (${rawAlerts.length})` },
        { key: "high", label: `${isVi ? "Mức độ Cao" : "Critical"} (${countHigh})`, variant: "danger" },
        { key: "contract_expiring", label: `${isVi ? "Hợp đồng sắp hết hạn" : "Expiring Contracts"} (${countExpiring})` },
        { key: "order_drop", label: `${isVi ? "Sụt giảm đơn hàng" : "Order Drops"} (${countOrderDrop})` },
      ]
    : [
        { key: "all", label: `${isVi ? "Cảnh báo Kinh doanh trong ca" : "All Sales Alerts"} (${rawAlerts.length})` },
        { key: "contract_expiring", label: `${isVi ? "Hợp đồng sắp hết hạn" : "Expiring Contracts"} (${countExpiring})`, variant: "danger" },
        { key: "order_drop", label: `${isVi ? "Sụt giảm đơn hàng" : "Order Cadence Dips"} (${countOrderDrop})`, variant: "warning" },
      ];

  const pageTitle = isExecOrAdmin
    ? (isVi ? "Trung tâm Cảnh báo Rủi ro Thông minh" : "Smart Risk & Alert Center")
    : isManager
    ? (isVi ? `Trung tâm Cảnh báo Rủi ro Phòng ban: ${userDept}` : `Department Risk & Alert Center: ${currentUser?.departmentEn || userDept}`)
    : (isVi ? "Cảnh báo Rủi ro Phòng Kinh doanh (Sales Risk Center)" : "Sales Department Risk Alerts");

  const pageSubtitle = isExecOrAdmin
    ? (isVi
        ? "Đài quan sát rủi ro vĩ mô toàn diện: phát hiện sớm hợp đồng sắp mãn hạn, biến động tần suất đặt hàng VIP và bất thường pháp lý trên toàn bộ đồ thị tri thức (BR-05 / UC.20)."
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
          {/* Card 1: Hợp đồng sắp hết hạn */}
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
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#991B1B" }}>
                {isVi ? "HỢP ĐỒNG SẮP HẾT HẠN (15–30 NGÀY)" : "EXPIRING CONTRACTS (15-30 DAYS)"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#991B1B", marginTop: "2px" }}>
                {countExpiring} {isVi ? "Hợp đồng" : "Contracts"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#7F1D1D" }}>
                {isVi ? "Tổng giá trị 2.02 Tỷ VNĐ cần tái đàm phán" : "2.02B VND pipeline to renegotiate"}
              </div>
            </div>
          </div>

          {/* Card 2: Sụt giảm đơn hàng */}
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
              <TrendingDown size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#92400E" }}>
                {isVi ? "KHÁCH HÀNG SỤT GIẢM ĐƠN HÀNG (-30%)" : "ORDER CADENCE DIPS (-30%)"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#92400E", marginTop: "2px" }}>
                {countOrderDrop} {isVi ? "Đối tác trọng điểm" : "VIP Partners"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#78350F" }}>
                {isVi ? "Ước tính hụt -405 Triệu VNĐ doanh thu" : "-405M VND projected dip"}
              </div>
            </div>
          </div>

          {/* Card 3: Bất thường Pháp lý & Bồi thường (Dành riêng cho Executive & Admin) */}
          {isExecOrAdmin && (
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
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#5B21B6" }}>
                  {isVi ? "BẤT THƯỜNG ĐIỀU KHOẢN PHÁP LÝ" : "LEGAL COMPLIANCE EXPOSURE"}
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#5B21B6", marginTop: "2px" }}>
                  {countLegal} {isVi ? "Cảnh báo" : "Anomalies"}
                </div>
                <div style={{ fontSize: "11.5px", color: "#4C1D95" }}>
                  {isVi ? "Rủi ro bồi thường vô hạn (No Liability Cap)" : "Uncapped liability exposure"}
                </div>
              </div>
            </div>
          )}
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
              const AlertIcon = alert.Icon || (alert.category === "order_drop" ? TrendingDown : (alert.category === "legal_anomaly" ? AlertTriangle : Clock));
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
                          const query = alert.contractId
                            ? (isVi
                                ? `Phân tích rủi ro pháp lý của hợp đồng ${alert.contractId} (${alert.title}) và đề xuất phương án xử lý theo dữ liệu đồ thị tri thức`
                                : `Analyze the legal risk for contract ${alert.contractId} (${alert.title}) and recommend protective clause amendments based on knowledge graph`)
                            : alert.orderId
                            ? (() => {
                                const cust = alert.meta?.find(m => m.label?.includes("Khách hàng") || m.label?.includes("Customer"))?.value || "";
                                const val = alert.meta?.find(m => m.label?.includes("Giá trị") || m.label?.includes("Value"))?.value || "";
                                return isVi
                                  ? `Phân tích đơn hàng Order #${alert.orderId}${cust ? ` của khách hàng ${cust}` : ""}${val ? ` (giá trị ${val})` : ""} và kiểm tra danh mục sản phẩm, lịch sử giao dịch trên đồ thị tri thức Neo4j`
                                  : `Analyze Order #${alert.orderId}${cust ? ` for customer ${cust}` : ""}${val ? ` (value ${val})` : ""} and review purchased products and transaction history in Neo4j`;
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
