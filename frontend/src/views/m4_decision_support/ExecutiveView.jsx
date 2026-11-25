import React, { useState, useEffect } from "react";
import {
  Calendar, Building2, TrendingUp, Users, FileText, DollarSign,
  Activity, AlertTriangle, ArrowUpRight, Sparkles, RefreshCw,
  ShieldCheck, BarChart3, ChevronRight, CheckCircle2, ShieldAlert, ArrowLeft
} from "lucide-react";
import {
  fetchExecutiveKPIs,
  fetchTopCustomers,
  fetchContractDistribution,
  fetchRiskAlerts,
  fetchRevenueTrend
} from "../../services/api";

export default function ExecutiveView({
  entities = {},
  selectedEntity = "",
  onSelectEntity,
  signals = [],
  onNavigate,
  t = {},
  lang = "vi",
  role = "executive",
  currentUser
}) {
  const isVi = lang === "vi";
  const isExec = role === "executive" || role === "it_admin" || currentUser?.id === "executive" || currentUser?.id === "it_admin";
  const [period, setPeriod] = useState("30D");
  const [dept, setDept] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real backend data states
  const [kpis, setKpis] = useState(null);
  const [liveCustomers, setLiveCustomers] = useState([]);
  const [contractDist, setContractDist] = useState(null);
  const [alertCount, setAlertCount] = useState(13);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [latestRevenue, setLatestRevenue] = useState(null);
  const [growthRate, setGrowthRate] = useState(null);
  const [deptChartMode, setDeptChartMode] = useState("donut"); // "donut" | "bars"
  const [hoveredDept, setHoveredDept] = useState(null);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

  const loadData = async () => {
    if (!isExec) return;
    setIsRefreshing(true);
    try {
      const [kpiRes, custRes, distRes, alertRes, trendRes] = await Promise.all([
        fetchExecutiveKPIs(currentUser),
        fetchTopCustomers(5, currentUser),
        fetchContractDistribution(currentUser),
        fetchRiskAlerts(role, currentUser?.department, currentUser),
        fetchRevenueTrend(currentUser)
      ]);

      if (kpiRes && kpiRes.success) setKpis(kpiRes.data);
      if (custRes && custRes.success) setLiveCustomers(custRes.data);
      if (distRes && distRes.success) setContractDist(distRes.data);
      if (alertRes && alertRes.success) setAlertCount(alertRes.totalAlerts || alertRes.data?.length || 0);
      if (trendRes && trendRes.success) {
        setRevenueTrends(trendRes.data || []);
        if (trendRes.latestYear) setLatestRevenue(trendRes.latestYear);
        if (trendRes.growthRate !== undefined) setGrowthRate(trendRes.growthRate);
      }
    } catch (err) {
      console.warn("[ExecutiveView] Error loading live dashboard data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  const formatCurrency = (val) => {
    if (!val) return "$0";
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${Number(val).toLocaleString()}`;
  };

  const defaultTopCustomers = [
    {
      name: "Brakes and Gears",
      id: "CUST-29818",
      revenue: "$989,184.08",
      dept: isVi ? "Doanh nghiệp VIP" : "Key Account",
      deptColor: "var(--blue)",
      deptBg: "rgba(37, 99, 235, 0.08)"
    },
    {
      name: "Excellent Riding Supplies",
      id: "CUST-29715",
      revenue: "$961,675.86",
      dept: isVi ? "Phân phối & Bán sỉ" : "Distribution & Wholesale",
      deptColor: "var(--green)",
      deptBg: "rgba(5, 150, 105, 0.08)"
    },
    {
      name: "Vigorous Exercise Company",
      id: "CUST-29722",
      revenue: "$954,021.92",
      dept: isVi ? "Đối tác Chiến lược" : "Strategic Partner",
      deptColor: "#0891b2",
      deptBg: "rgba(8, 145, 178, 0.08)"
    },
    {
      name: "Totes & Baskets Company",
      id: "CUST-30117",
      revenue: "$919,801.82",
      dept: isVi ? "Đại lý Cấp 1" : "Tier 1 Dealer",
      deptColor: "#d97706",
      deptBg: "rgba(217, 119, 6, 0.08)"
    },
    {
      name: "Retail Mall",
      id: "CUST-29614",
      revenue: "$901,346.86",
      dept: isVi ? "Chuỗi Bán lẻ" : "Retail Chain",
      deptColor: "#2563EB",
      deptBg: "rgba(37, 99, 235, 0.08)"
    }
  ];

  const topCustomers = (liveCustomers && liveCustomers.length > 0) ? liveCustomers.map((c, i) => {
    const deptInfo = [
      { labelVi: "Doanh nghiệp VIP", labelEn: "Key Account", color: "var(--blue)", bg: "rgba(37, 99, 235, 0.08)" },
      { labelVi: "Phân phối & Bán sỉ", labelEn: "Distribution & Wholesale", color: "var(--green)", bg: "rgba(5, 150, 105, 0.08)" },
      { labelVi: "Đối tác Chiến lược", labelEn: "Strategic Partner", color: "#0891b2", bg: "rgba(8, 145, 178, 0.08)" },
      { labelVi: "Đại lý Cấp 1", labelEn: "Tier 1 Dealer", color: "#d97706", bg: "rgba(217, 119, 6, 0.08)" },
      { labelVi: "Chuỗi Bán lẻ", labelEn: "Retail Chain", color: "#2563EB", bg: "rgba(37, 99, 235, 0.08)" }
    ][i % 5];

    return {
      name: c.name || `Customer #${c.id}`,
      id: `CUST-${c.id}`,
      revenue: `$${Number(c.totalSpent || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      dept: isVi ? deptInfo.labelVi : deptInfo.labelEn,
      deptColor: deptInfo.color,
      deptBg: deptInfo.bg
    };
  }) : defaultTopCustomers;

  const complianceBars = (contractDist?.complianceBars && contractDist.complianceBars.length > 0)
    ? contractDist.complianceBars.map(b => {
        let label = isVi ? (b.label || b.name) : (b.labelEn || b.nameEn || b.label);
        let note = isVi ? (b.note || "") : (b.noteEn || b.note || "");
        if (isVi) {
          label = label.replace(/\s*\([A-Za-z\s&/]+\)/g, "").trim();
          note = note.replace(/\s*\([A-Za-z\s&/]+\)/g, "").trim();
        }
        return {
          label,
          pct: b.pct,
          color: b.color || "var(--green)",
          note,
          noteColor: b.noteColor || b.color || "var(--green)"
        };
      })
    : [
        {
          label: isVi ? "Điều khoản Chấm dứt hợp đồng" : "Termination Clause",
          pct: 88.1,
          color: "var(--green)",
          note: isVi ? "457/519 điều khoản bảo vệ hiệu lực (88.1%)" : "457/519 active clauses (88.1%)",
          noteColor: "var(--green)"
        },
        {
          label: isVi ? "Điều khoản Trách nhiệm & Bồi thường" : "Liability & Indemnification",
          pct: 84.0,
          color: "var(--green)",
          note: isVi ? "436/519 đạt chuẩn quy định (84.0%)" : "436/519 standard compliant (84.0%)",
          noteColor: "var(--green)"
        },
        {
          label: isVi ? "Điều khoản Thanh toán" : "Payment Terms",
          pct: 81.1,
          color: "var(--green)",
          note: isVi ? "421/519 đạt chuẩn (81.1%)" : "421/519 standard compliant (81.1%)",
          noteColor: "var(--green)"
        },
        {
          label: isVi ? "Điều khoản Bảo mật thông tin" : "Confidentiality",
          pct: 73.0,
          color: "var(--amber)",
          note: isVi ? "379/519 hợp đồng có điều khoản (73.0%)" : "379/519 contracts covered (73.0%)",
          noteColor: "var(--amber)"
        }
      ];

  const quickKpis = [
    {
      label: isVi ? "Tổng doanh thu ghi nhận (Neo4j)" : "Total Revenue (Neo4j)",
      value: kpis ? formatCurrency(kpis.totalRevenue) : "$123.22M",
      sub: kpis ? `${Number(kpis.totalOrders).toLocaleString()} ${isVi ? "đơn hàng" : "orders"}` : "31,465 orders",
      isPos: true,
      icon: DollarSign,
      color: "var(--blue)",
      bg: "var(--blue-soft)"
    },
    {
      label: isVi ? "Hợp đồng pháp lý CUAD" : "CUAD Ingested Contracts",
      value: kpis ? `${kpis.totalContracts} ${isVi ? "hợp đồng" : "contracts"}` : (isVi ? "509 hợp đồng" : "509 contracts"),
      sub: kpis ? `${kpis.totalClauses} ${isVi ? "điều khoản vector hóa" : "clauses indexed"}` : (isVi ? "1,693 điều khoản vector hóa" : "1,693 clauses indexed"),
      isPos: true,
      icon: FileText,
      color: "var(--cyan, #0891b2)",
      bg: "rgba(8, 145, 178, 0.08)"
    },
    {
      label: isVi ? "Tỷ lệ tuân thủ pháp lý" : "Legal Compliance Rate",
      value: kpis ? `${kpis.complianceRate}%` : "56.7%",
      sub: isVi ? "Chỉ số an toàn đồ thị CUAD" : "CUAD Graph Safety Index",
      isPos: (kpis?.complianceRate || 0) >= 50,
      icon: ShieldCheck,
      color: "var(--green)",
      bg: "var(--green-soft)"
    },
    {
      label: isVi ? "Cảnh báo rủi ro tồn đọng" : "Active Risk Alerts",
      value: `${alertCount} ${isVi ? "cảnh báo" : "alerts"}`,
      sub: isVi ? "5 rủi ro nghiêm trọng" : "5 critical priority",
      isPos: false,
      icon: AlertTriangle,
      color: "var(--amber)",
      bg: "var(--amber-soft)"
    }
  ];


  if (!isExec) {
    return (
      <div style={{ background: "var(--base)", minHeight: "100%", padding: "40px 24px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 720, margin: "60px auto", textAlign: "center" }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl, 16px)",
            padding: "48px 36px",
            boxShadow: "var(--shadow-md, 0 4px 20px rgba(0,0,0,0.06))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--red, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20
            }}>
              <ShieldAlert size={34} />
            </div>

            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--red, #ef4444)",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 4,
              padding: "3px 10px",
              marginBottom: 12
            }}>
              {isVi ? "Giới hạn phân quyền dữ liệu · BR-05" : "Access Restriction · BR-05"}
            </span>

            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-1)",
              margin: "0 0 12px 0",
              fontFamily: "var(--f-display)"
            }}>
              {isVi ? "Truy cập Bảng điều khiển điều hành bị từ chối" : "Executive Decision Dashboard Access Restricted"}
            </h2>

            <p style={{
              fontSize: 14,
              color: "var(--text-3)",
              lineHeight: 1.6,
              maxWidth: 580,
              margin: "0 0 28px 0"
            }}>
              {isVi ? (
                <>
                  Theo quy định nghiệp vụ <strong>BR-05</strong> và đặc tả <strong>UC.19 / PB57</strong>, 
                  Bảng điều khiển điều hành vĩ mô chỉ dành riêng cho <strong>Ban Giám Đốc</strong> và 
                  <strong> Quản trị viên</strong>.
                  <br /><br />
                  Tài khoản hiện tại của bạn là <strong>{currentUser?.badge || (role === "knowledge_manager" ? "Trưởng phòng / Quản lý" : role)}</strong> thuộc phạm vi phòng ban (Department Scope - BR-02/BR-04).
                </>
              ) : (
                <>
                  According to business rule <strong>BR-05</strong> and specification <strong>UC.19 / PB57</strong>, 
                  the Executive Decision Dashboard is restricted to <strong>Executive Leadership</strong> and 
                  <strong> Administrators</strong>.
                  <br /><br />
                  Your current account is signed in as <strong>{currentUser?.badgeEn || role}</strong> within Department Scope (BR-02/BR-04).
                </>
              )}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={() => onNavigate && onNavigate("home")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <ArrowLeft size={15} />
                {isVi ? "Về Trang chủ" : "Return to Home"}
              </button>

              <button
                onClick={() => onNavigate && onNavigate("reports")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--primary, #059669)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)"
                }}
              >
                <BarChart3 size={15} />
                {isVi ? "Đến Báo cáo phòng ban" : "Go to Department Reports"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultTrends = [
    { year: 2011, revenue: 14155699.53, orders: 1607 },
    { year: 2012, revenue: 37675549.44, orders: 3915 },
    { year: 2013, revenue: 48965887.96, orders: 14182 },
    { year: 2014, revenue: 22419498.32, orders: 11761 }
  ];
  const chartTrends = (revenueTrends && revenueTrends.length > 0) ? revenueTrends : defaultTrends;
  const maxTrendRev = Math.max(...chartTrends.map(t => t.revenue || 0), 55000000);
  const trendPoints = chartTrends.map((t, idx) => {
    const x = chartTrends.length > 1 ? idx * (500 / (chartTrends.length - 1)) : 250;
    const y = Math.max(14, Math.min(86, 92 - (t.revenue / maxTrendRev) * 78));
    return { ...t, x, y };
  });
  const trendPathD = trendPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const trendAreaD = `${trendPathD} L500,100 L0,100 Z`;
  const currentActiveTrend = hoveredTrendIdx !== null ? chartTrends[hoveredTrendIdx] : (latestRevenue || chartTrends[chartTrends.length - 1]);

  return (
    <div style={{ background: "var(--base)", minHeight: "100%", padding: "24px 32px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── HEADER & TOOLBAR ─────────────────────────────────── */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-xs)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: "linear-gradient(135deg, #0F233D 0%, #1E3A5F 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#22d3ee"
              }}>
                <BarChart3 size={16} strokeWidth={2.2} />
              </div>
              <h2 style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-1)",
                letterSpacing: "-0.02em",
                margin: 0,
                fontFamily: "var(--f-display)"
              }}>
                {isVi ? "Bảng điều khiển điều hành" : "Executive Decision Dashboard"}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, paddingLeft: 38 }}>
              {isVi
                ? "Dữ liệu hợp nhất từ AdventureWorks ERP và cơ sở tri thức hợp đồng pháp lý CUAD"
                : "Unified data from AdventureWorks ERP and CUAD legal contract knowledge base"}
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            {/* Period select */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              padding: "6px 12px",
              fontSize: 12.5,
              color: "var(--text-2)"
            }}>
              <Calendar size={14} color="var(--text-3)" />
              <span style={{ color: "var(--text-3)", fontWeight: 500 }}>
                {isVi ? "Kỳ báo cáo:" : "Period:"}
              </span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontWeight: 600,
                  color: "var(--text-1)",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: 12.5
                }}
              >
                <option value="30D">{isVi ? "30 ngày qua (Tháng 10/2024)" : "Last 30 days (Oct 2024)"}</option>
                <option value="Q3">{isVi ? "Quý 3/2024" : "Q3 2024"}</option>
                <option value="12M">{isVi ? "Năm tài chính 2024" : "FY 2024"}</option>
              </select>
            </div>

            {/* Dept select */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              padding: "6px 12px",
              fontSize: 12.5,
              color: "var(--text-2)"
            }}>
              <Building2 size={14} color="var(--text-3)" />
              <span style={{ color: "var(--text-3)", fontWeight: 500 }}>
                {isVi ? "Phòng ban:" : "Dept:"}
              </span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontWeight: 600,
                  color: "var(--text-1)",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: 12.5
                }}
              >
                <option value="all">{isVi ? "Toàn doanh nghiệp" : "All Departments"}</option>
                <option value="sales">{isVi ? "Kinh doanh & Bán hàng" : "Sales"}</option>
                <option value="legal">{isVi ? "Pháp chế" : "Legal"}</option>
                <option value="finance">{isVi ? "Tài chính - Kế toán" : "Finance"}</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              title={isVi ? "Làm mới số liệu" : "Refresh metrics"}
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--cyan)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
            >
              <RefreshCw size={14} className={isRefreshing ? "spin-icon" : ""} />
            </button>
          </div>
        </div>

        {/* ── KPI QUICK-STATS STRIP (1 HÀNG 4 CỘT) ───────────── */}
        <div
          className="kpi-quick-strip"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px"
          }}
        >
          {quickKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8edf3)",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 4px 16px -2px rgba(8, 145, 178, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.18s ease",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(8, 145, 178, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)";
                  e.currentTarget.style.borderColor = "rgba(8, 145, 178, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px -2px rgba(8, 145, 178, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)";
                  e.currentTarget.style.borderColor = "var(--border, #e8edf3)";
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: kpi.bg,
                  color: kpi.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3, #64748b)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {kpi.label}
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--text-1, #0f172a)",
                    marginTop: 2,
                    fontFamily: "var(--f-display)",
                    lineHeight: 1.1
                  }}>
                    {kpi.value}
                  </div>
                  <div style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: kpi.isPos ? "var(--green, #059669)" : "var(--amber, #ea580c)",
                    marginTop: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {kpi.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 2×2 CHART GRID ──────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))",
          gap: "20px"
        }}>

          {/* 1. DOANH THU & XU HƯỚNG */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "22px",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)" }}></span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                  {isVi ? "Doanh thu & Xu hướng giao dịch" : "Revenue & Transaction Trend"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot", isVi ? "Phân tích xu hướng doanh thu và cơ cấu tăng trưởng giao dịch gần đây" : "Analyze recent revenue trends and transaction growth structure")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--blue-soft)",
                  border: "1px solid rgba(37,99,235,0.2)",
                  color: "var(--blue)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Sparkles size={12} />
                <span>{isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--f-display)" }}>
                {currentActiveTrend ? formatCurrency(currentActiveTrend.revenue) : (kpis ? formatCurrency(kpis.totalRevenue) : "$22.42M")}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: hoveredTrendIdx !== null ? "var(--blue)" : "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
                {currentActiveTrend
                  ? (isVi ? `Năm ${currentActiveTrend.year} (${Number(currentActiveTrend.orders).toLocaleString()} đơn hàng)` : `Year ${currentActiveTrend.year} (${Number(currentActiveTrend.orders).toLocaleString()} orders)`)
                  : (isVi ? "Kỳ gần nhất" : "Latest Period")}
                {hoveredTrendIdx !== null && (
                  <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--r-xs)", background: "var(--blue-soft)", color: "var(--blue)", fontWeight: 700 }}>
                    {isVi ? "Chi tiết năm" : "Selected Year"}
                  </span>
                )}
              </span>
            </div>

            {/* Line chart container with interactive hover tooltip */}
            <div style={{
              flex: 1,
              background: "var(--surface-2)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-soft)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 140,
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                <span>$55M</span><span>$40M</span><span>$25M</span><span>$10M</span>
              </div>
              <div style={{ flex: 1, position: "relative", minHeight: 90 }}>
                <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="revGradTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={trendPathD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={trendAreaD}
                    fill="url(#revGradTokens)"
                  />

                  {/* Vertical dashed guide line on hover */}
                  {hoveredTrendIdx !== null && trendPoints[hoveredTrendIdx] && (
                    <line
                      x1={trendPoints[hoveredTrendIdx].x}
                      y1={0}
                      x2={trendPoints[hoveredTrendIdx].x}
                      y2={100}
                      stroke="#2563EB"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.65"
                    />
                  )}

                  {/* Points with hover glow and hit boxes */}
                  {trendPoints.map((p, i) => {
                    const isHovered = hoveredTrendIdx === i;
                    return (
                      <g key={p.year || i}>
                        {isHovered && (
                          <circle cx={p.x} cy={p.y} r="9" fill="rgba(37, 99, 235, 0.2)" />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill="#2563EB"
                          stroke={isHovered ? "#ffffff" : "var(--surface)"}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                        />
                        {/* Hover trigger zone */}
                        <rect
                          x={p.x - 35}
                          y={0}
                          width={70}
                          height={100}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setHoveredTrendIdx(i)}
                          onMouseLeave={() => setHoveredTrendIdx(null)}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10.5,
                color: "var(--text-3)",
                fontFamily: "var(--f-mono)",
                borderTop: "1px solid var(--border-soft)",
                paddingTop: 6
              }}>
                {trendPoints.map((p, i) => {
                  const isSelected = hoveredTrendIdx === i || (hoveredTrendIdx === null && i === trendPoints.length - 1);
                  return (
                    <span
                      key={p.year}
                      onMouseEnter={() => setHoveredTrendIdx(i)}
                      onMouseLeave={() => setHoveredTrendIdx(null)}
                      style={{
                        cursor: "pointer",
                        color: isSelected ? "var(--blue)" : "var(--text-3)",
                        fontWeight: isSelected ? 700 : 500,
                        transition: "all 0.15s ease"
                      }}
                    >
                      {p.year} (${(p.revenue / 1e6).toFixed(1)}M)
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", paddingTop: 4 }}>
              <span>
                {isVi ? "Nguồn dữ liệu:" : "Source:"}{" "}
                <strong style={{ color: "var(--text-2)" }}>AdventureWorks Sales.OrderHeader</strong>
              </span>
              <button
                onClick={() => onNavigate?.("reports")}
                style={{
                  color: "var(--blue)",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer"
                }}
              >
                <span>{isVi ? "Chi tiết báo cáo" : "Full report"}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 2. TOP KHÁCH HÀNG */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "22px",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }}></span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                  {isVi ? "Top Khách hàng Giá trị cao" : "Top High-Value Customers"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot", isVi ? "Khách hàng nào có doanh thu cao nhất và lịch sử giao dịch lớn trong hệ thống?" : "Which customers contribute the highest revenue and transaction volume?")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--blue-soft)",
                  border: "1px solid rgba(37,99,235,0.2)",
                  color: "var(--blue)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Sparkles size={12} />
                <span>{isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <th style={{ paddingBottom: 10, fontWeight: 600 }}>{isVi ? "Khách hàng" : "Customer"}</th>
                    <th style={{ paddingBottom: 10, fontWeight: 600 }}>{isVi ? "Doanh thu đóng góp" : "Revenue"}</th>
                    <th style={{ paddingBottom: 10, fontWeight: 600 }}>{isVi ? "Phòng ban" : "Dept"}</th>
                    <th style={{ paddingBottom: 10, textAlign: "right", fontWeight: 600 }}>{isVi ? "Thao tác" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-soft)", transition: "background 0.1s ease" }}>
                      <td style={{ padding: "6.5px 0" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{c.name}</div>
                        <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{c.id}</span>
                      </td>
                      <td style={{ padding: "6.5px 0", fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--text-1)" }}>
                        {c.revenue}
                      </td>
                      <td style={{ padding: "6.5px 0" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--r-xs)",
                          fontSize: 11,
                          fontWeight: 600,
                          background: c.deptBg,
                          color: c.deptColor
                        }}>
                          {c.dept}
                        </span>
                      </td>
                      <td style={{ padding: "6.5px 0", textAlign: "right" }}>
                        <button
                          onClick={() => onNavigate?.("knowledge")}
                          style={{
                            color: "var(--blue)",
                            fontWeight: 600,
                            fontSize: 11.5,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3
                          }}
                        >
                          <span>{isVi ? "Xem đồ thị" : "View graph"}</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
              <span>{isVi ? "Top 5 / 84 đối tác giao dịch thường xuyên" : "Top 5 of 84 frequent partners"}</span>
              <button
                onClick={() => onNavigate?.("knowledge")}
                style={{
                  color: "var(--blue)",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer"
                }}
              >
                <span>{isVi ? "Mở danh sách đầy đủ" : "Open full table"}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 3. PHÂN BỐ HỢP ĐỒNG & TÀI LIỆU THEO PHÒNG BAN */}
          {(() => {
            const deptColorMap = {
              "Pháp chế": "#2563EB",
              "Pháp chế (Legal)": "#2563EB",
              "Legal": "#2563EB",
              "Kinh doanh": "#059669",
              "Kinh doanh (Sales)": "#059669",
              "Sales": "#059669",
              "Nghiên cứu & Phát triển": "#0284C7",
              "Nghiên cứu & Phát triển (R&D)": "#0284C7",
              "R&D": "#0284C7",
              "Kế toán & Thu mua": "#D97706",
              "Accounting & Procurement": "#D97706",
              "Công nghệ thông tin": "#64748B",
              "IT": "#64748B"
            };

            const formatDeptName = (rawType) => {
              if (!rawType) return "";
              if (isVi) {
                return rawType.replace(/\s*\([A-Za-z\s&/]+\)/g, "").trim();
              }
              if (/pháp chế|legal/i.test(rawType)) return "Legal";
              if (/kinh doanh|sales/i.test(rawType)) return "Sales";
              if (/nghiên cứu|r&d|rnd/i.test(rawType)) return "R&D";
              if (/kế toán|thu mua|accounting/i.test(rawType)) return "Accounting";
              if (/công nghệ|it/i.test(rawType)) return "IT";
              return rawType;
            };

            const defaultDeptDist = [
              { type: isVi ? "Pháp chế" : "Legal", count: 509, deptKey: "legal" },
              { type: isVi ? "Kinh doanh" : "Sales", count: 30, deptKey: "sales" },
              { type: isVi ? "Nghiên cứu & Phát triển" : "R&D", count: 21, deptKey: "rnd" },
              { type: isVi ? "Kế toán & Thu mua" : "Accounting", count: 11, deptKey: "accounting" },
            ];

            const rawDeptList = (contractDist?.byContractType && contractDist.byContractType.length > 0)
              ? contractDist.byContractType.map(d => ({ ...d, type: formatDeptName(d.type) }))
              : defaultDeptDist;

            const totalDeptDocs = rawDeptList.reduce((acc, curr) => acc + (curr.count || 0), 0) || 571;

            // Tính % thực tế cho từng phòng ban
            const realPctList = rawDeptList.map(item => {
              const count = item.count || 0;
              return {
                ...item,
                count,
                realPct: totalDeptDocs > 0 ? (count / totalDeptDocs) * 100 : 0
              };
            });

            // Phân bổ tỷ lệ vòng tròn trực quan: Bảo toàn nghiêm ngặt thứ tự và tỷ lệ chênh lệch (30 > 21 > 11),
            // kết hợp sàn cơ sở nhỏ (1.8%) để phân đoạn nhỏ nhất (11 tài liệu) vẫn có vòng cung màu rõ nét
            const activeDepts = realPctList.filter(d => d.count > 0);
            const baseFloor = 1.8;
            const remainingPct = 100 - (activeDepts.length * baseFloor);

            let runningOffset = 0;
            const gap = 0.8;
            const computedDeptDist = realPctList.map((item) => {
              let visualPct = 0;
              if (item.count > 0) {
                visualPct = baseFloor + ((item.count / (totalDeptDocs || 1)) * remainingPct);
              }

              const visualOffset = runningOffset;
              runningOffset += visualPct;
              const color = deptColorMap[item.type] || "#2563EB";
              const dashLen = Math.max(1.8, visualPct - gap);
              const gapLen = Math.max(0, 100 - dashLen);

              return {
                type: item.type,
                count: item.count,
                pct: item.realPct,
                pctDisplay: `${item.realPct.toFixed(1)}% (${item.count})`,
                color,
                visualPct,
                visualOffset,
                dashLen,
                gapLen,
                deptKey: item.deptKey || (item.type.includes("Pháp chế") ? "legal" : item.type.includes("Kinh doanh") ? "sales" : item.type.includes("Nghiên cứu") ? "rnd" : "accounting")
              };
            });

            const activeItem = hoveredDept ? computedDeptDist.find(d => d.type === hoveredDept) : null;

            return (
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                padding: "22px",
                boxShadow: "var(--shadow-xs)",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                {/* Header card: Tiêu đề + Bộ chuyển đổi chế độ xem (Donut ⟷ Bar) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue, #2563eb)" }}></span>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                      {isVi ? "Phân bố Danh mục Tài liệu & Hợp đồng" : "Document & Contract Distribution"}
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--cyan, #0284c7)",
                      background: "var(--cyan-soft, rgba(2, 132, 199, 0.08))",
                      padding: "2px 7px",
                      borderRadius: 4
                    }}>
                      {computedDeptDist.length} {isVi ? "phòng ban" : "depts"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* View Switcher: Donut vs Bars */}
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      padding: "2px"
                    }}>
                      <button
                        onClick={() => setDeptChartMode("donut")}
                        title={isVi ? "Xem biểu đồ tròn" : "View Donut Chart"}
                        style={{
                          padding: "4px 9px",
                          borderRadius: 5,
                          border: "none",
                          fontSize: 11.5,
                          fontWeight: deptChartMode === "donut" ? 700 : 500,
                          cursor: "pointer",
                          background: deptChartMode === "donut" ? "var(--surface)" : "transparent",
                          color: deptChartMode === "donut" ? "var(--text-1)" : "var(--text-3)",
                          boxShadow: deptChartMode === "donut" ? "var(--shadow-xs)" : "none",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 5
                        }}
                      >
                        <i className="fa-solid fa-chart-pie" style={{ fontSize: 11, color: deptChartMode === "donut" ? "var(--blue)" : "inherit" }} />
                        <span>{isVi ? "Tròn" : "Donut"}</span>
                      </button>

                      <button
                        onClick={() => setDeptChartMode("bars")}
                        title={isVi ? "Xem thanh tiến trình so sánh" : "View Horizontal Bars"}
                        style={{
                          padding: "4px 9px",
                          borderRadius: 5,
                          border: "none",
                          fontSize: 11.5,
                          fontWeight: deptChartMode === "bars" ? 700 : 500,
                          cursor: "pointer",
                          background: deptChartMode === "bars" ? "var(--surface)" : "transparent",
                          color: deptChartMode === "bars" ? "var(--text-1)" : "var(--text-3)",
                          boxShadow: deptChartMode === "bars" ? "var(--shadow-xs)" : "none",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 5
                        }}
                      >
                        <i className="fa-solid fa-bars-progress" style={{ fontSize: 11, color: deptChartMode === "bars" ? "var(--blue)" : "inherit" }} />
                        <span>{isVi ? "Thanh ngang" : "Bars"}</span>
                      </button>
                    </div>

                    {/* Ask AI button */}
                    <button
                      onClick={() => onNavigate?.("copilot", isVi ? "Phân tích cơ cấu danh mục tài liệu và hợp đồng theo các phòng ban trong hệ thống" : "Analyze document and contract distribution across departments")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: "var(--r-md)",
                        background: "var(--blue-soft)",
                        border: "1px solid rgba(37,99,235,0.2)",
                        color: "var(--blue)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <Sparkles size={12} />
                      <span>{isVi ? "Hỏi AI" : "Ask AI"}</span>
                    </button>
                  </div>
                </div>

                {/* Body: Chế độ Donut hoặc Chế độ Bars */}
                {deptChartMode === "donut" ? (
                  <div style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "150px 1fr",
                    gap: 22,
                    alignItems: "center",
                    padding: "6px 0"
                  }}>
                    {/* Donut chart đa màu tương tác cao */}
                    <div
                      style={{ position: "relative", width: 140, height: 140, margin: "0 auto", cursor: "pointer" }}
                      onMouseLeave={() => setHoveredDept(null)}
                    >
                      <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", display: "block" }}>
                        {/* Vòng nền mờ */}
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--surface-3, #f1f5f9)" strokeWidth="4.5" />
                        {/* Các lát cắt phòng ban: xoay chuẩn -90 độ quanh tâm (18, 18) */}
                        <g transform="rotate(-90 18 18)">
                          {computedDeptDist.map((item, idx) => {
                            const isHovered = hoveredDept === item.type;
                            return (
                              <circle
                                key={item.type || idx}
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="none"
                                stroke={item.color}
                                strokeWidth={isHovered ? 5.5 : 4.5}
                                strokeDasharray={`${item.dashLen.toFixed(2)} ${item.gapLen.toFixed(2)}`}
                                strokeDashoffset={`-${(item.visualOffset + gap / 2).toFixed(2)}`}
                                style={{
                                  transition: "stroke-width 0.18s ease, opacity 0.18s ease",
                                  opacity: hoveredDept && !isHovered ? 0.45 : 1,
                                  cursor: "pointer"
                                }}
                                onMouseEnter={() => setHoveredDept(item.type)}
                              >
                                <title>{`${item.type}: ${item.pctDisplay}`}</title>
                              </circle>
                            );
                          })}
                        </g>
                      </svg>

                      {/* Tâm vòng tròn Donut: Thay đổi sinh động khi rê chuột */}
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        padding: "8px",
                        textAlign: "center"
                      }}>
                        <span style={{
                          fontSize: activeItem ? 20 : 22,
                          fontWeight: 800,
                          color: activeItem ? activeItem.color : "var(--text-1)",
                          fontFamily: "var(--f-display)",
                          lineHeight: 1.1
                        }}>
                          {activeItem ? activeItem.count : totalDeptDocs}
                        </span>
                        <span style={{
                          fontSize: 9.5,
                          color: "var(--text-4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 700,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100px"
                        }}>
                          {activeItem ? `${activeItem.pct.toFixed(1)}%` : (isVi ? "Tài liệu" : "Docs")}
                        </span>
                      </div>
                    </div>

                    {/* Danh sách phòng ban kèm Thanh tiến trình mini trực quan */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {computedDeptDist.map((item) => {
                        const isHovered = hoveredDept === item.type;
                        return (
                          <div
                            key={item.type}
                            onMouseEnter={() => setHoveredDept(item.type)}
                            onMouseLeave={() => setHoveredDept(null)}
                            onClick={() => {
                              onNavigate?.("documents");
                            }}
                            title={isVi ? `Bấm để lọc tài liệu phòng ${item.type}` : `Click to filter ${item.type} documents`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              padding: "6px 8px",
                              borderRadius: 6,
                              background: isHovered ? "var(--surface-hover, rgba(0,0,0,0.03))" : "transparent",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 8, color: isHovered ? "var(--text-1)" : "var(--text-2)", fontWeight: isHovered ? 700 : 500 }}>
                                <span style={{ width: 9, height: 9, borderRadius: "50%", background: item.color, flexShrink: 0 }}></span>
                                <span>{item.type}</span>
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <strong style={{ color: "var(--text-1)", fontFamily: "var(--f-mono)", fontSize: 11.5 }}>
                                  {item.count}
                                </strong>
                                <span style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: item.color,
                                  background: `${item.color}18`,
                                  padding: "1px 5px",
                                  borderRadius: 4
                                }}>
                                  {item.pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* Thanh tiến trình mini hiển thị độ phủ thực tế */}
                            <div style={{
                              width: "100%",
                              height: 4,
                              borderRadius: 2,
                              background: "var(--surface-3, #f1f5f9)",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                width: `${Math.max(2, item.pct)}%`,
                                height: "100%",
                                background: item.color,
                                borderRadius: 2,
                                transition: "width 0.3s ease"
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Chế độ Thanh ngang so sánh (Horizontal Bars) */
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 4px" }}>
                    {computedDeptDist.map((item, idx) => (
                      <div
                        key={item.type}
                        onClick={() => onNavigate?.("documents")}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-soft)",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-soft)"}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: item.color,
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                              {item.type}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "var(--f-mono)", color: "var(--text-1)" }}>
                              {item.count} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-3)" }}>{isVi ? "tài liệu" : "docs"}</span>
                            </span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: item.color,
                              background: `${item.color}18`,
                              padding: "2px 7px",
                              borderRadius: 4
                            }}>
                              {item.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Thanh tiến trình so sánh lớn */}
                        <div style={{
                          width: "100%",
                          height: 8,
                          borderRadius: 4,
                          background: "var(--surface-3)",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${Math.max(2, item.pct)}%`,
                            height: "100%",
                            background: item.color,
                            borderRadius: 4,
                            transition: "width 0.4s ease"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer card */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="fa-solid fa-database" style={{ fontSize: 11, color: "var(--cyan)" }} />
                    <span>{isVi ? "Trích xuất tự động qua Entity Extractor v1.2 & Neo4j" : "Auto-extracted via Entity Extractor & Neo4j"}</span>
                  </span>
                  <button
                    onClick={() => onNavigate?.("knowledge")}
                    style={{
                      color: "var(--blue)",
                      fontWeight: 600,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      cursor: "pointer"
                    }}
                  >
                    <span>{isVi ? "Mở Knowledge Base" : "Open Knowledge Base"}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 4. TỶ LỆ TUÂN THỦ PHÁP LÝ */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "22px",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }}></span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                  {isVi ? "Tỷ lệ Tuân thủ & An toàn Pháp lý" : "Legal Compliance & Safety Rate"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot", isVi ? "Đánh giá tỷ lệ tuân thủ điều khoản pháp lý và danh sách hợp đồng thiếu điều khoản bảo vệ quan trọng" : "Assess legal compliance rates and identify contracts missing critical protection clauses")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--blue-soft)",
                  border: "1px solid rgba(37,99,235,0.2)",
                  color: "var(--blue)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Sparkles size={12} />
                <span>{isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}</span>
              </button>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
              {complianceBars.map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{bar.label}</span>
                    <strong style={{ color: bar.noteColor, fontSize: 11.5 }}>{bar.note}</strong>
                  </div>
                  <div style={{
                    width: "100%",
                    height: 8,
                    background: "var(--surface-3)",
                    borderRadius: 99,
                    overflow: "hidden"
                  }}>
                    <div
                      style={{
                        width: `${bar.pct}%`,
                        height: "100%",
                        background: bar.color,
                        borderRadius: 99,
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} color="var(--green)" />
                {isVi ? "Độ rủi ro pháp lý toàn danh mục:" : "Portfolio legal risk:"}{" "}
                <strong style={{ color: "var(--text-1)" }}>
                  {contractDist?.portfolioRisk ? (isVi ? contractDist.portfolioRisk.level : contractDist.portfolioRisk.levelEn) : (isVi ? "THẤP (A-)" : "LOW (A-)")}
                </strong>
              </span>
              <button
                onClick={() => onNavigate?.("risk")}
                style={{
                  color: "var(--blue)",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer"
                }}
              >
                <span>{isVi ? "Xem cảnh báo rủi ro" : "View risk alerts"}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
