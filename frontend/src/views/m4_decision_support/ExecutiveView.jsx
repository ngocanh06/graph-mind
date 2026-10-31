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

  const topCustomers = liveCustomers.length > 0 ? liveCustomers.map((c, i) => ({
    name: c.name || `Customer #${c.id}`,
    id: `CUST-${c.id}`,
    revenue: `$${Number(c.totalSpent || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    dept: i === 0 ? (isVi ? "Doanh nghiệp VIP" : "Key Account") : (isVi ? "Phân phối & Bán sỉ" : "Distribution & Wholesale"),
    deptColor: i === 0 ? "var(--blue)" : i === 1 ? "var(--green)" : "#8b5cf6",
    deptBg: i === 0 ? "rgba(37, 99, 235, 0.08)" : i === 1 ? "rgba(5, 150, 105, 0.08)" : "rgba(139, 92, 246, 0.08)"
  })) : [
    {
      name: "Roger Harui",
      id: "CUST-29818",
      revenue: "$989,184.08",
      dept: isVi ? "Khách hàng VIP" : "Key Account",
      deptColor: "var(--blue)",
      deptBg: "rgba(37, 99, 235, 0.08)"
    },
    {
      name: "Andrew Dixon",
      id: "CUST-29715",
      revenue: "$961,675.86",
      dept: isVi ? "Phân phối & Bán sỉ" : "Distribution",
      deptColor: "var(--green)",
      deptBg: "rgba(5, 150, 105, 0.08)"
    },
    {
      name: "Reuben D'sa",
      id: "CUST-29722",
      revenue: "$954,021.92",
      dept: isVi ? "Đối tác Chiến lược" : "Strategic Partner",
      deptColor: "#8b5cf6",
      deptBg: "rgba(139, 92, 246, 0.08)"
    },
  ];

  const complianceBars = [
    {
      label: isVi ? "Điều khoản Giới hạn Trách nhiệm (Liability Cap)" : "Liability Cap Clause",
      pct: 20.0,
      color: "var(--red, #DC2626)",
      note: isVi ? "6/30 Hợp đồng có điều khoản (Cần bổ sung)" : "6/30 contracts (Needs addendum)",
      noteColor: "var(--red, #DC2626)"
    },
    {
      label: isVi ? "Điều khoản Luật áp dụng (Governing Law)" : "Governing Law Clauses",
      pct: 80.0,
      color: "var(--green)",
      note: isVi ? "24/30 Đạt chuẩn quy định" : "24/30 Standard compliant",
      noteColor: "var(--green)"
    },
    {
      label: isVi ? "Điều khoản Bồi thường thiệt hại (Indemnification)" : "Indemnification Clauses",
      pct: 66.7,
      color: "var(--amber)",
      note: isVi ? "20/30 (Cần rà soát 10 hợp đồng)" : "20/30 (10 contracts need review)",
      noteColor: "var(--amber)"
    },
    {
      label: isVi ? "Điều khoản Chấm dứt hợp đồng (Termination)" : "Termination Clauses",
      pct: 86.7,
      color: "var(--green)",
      note: isVi ? "26/30 Điều khoản bảo vệ hiệu lực" : "26/30 Standard active",
      noteColor: "var(--green)"
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
      value: kpis ? `${kpis.totalContracts} ${isVi ? "hợp đồng" : "contracts"}` : "30 contracts",
      sub: kpis ? `${kpis.totalClauses} ${isVi ? "điều khoản vector hóa" : "clauses indexed"}` : "103 clauses indexed",
      isPos: true,
      icon: FileText,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.08)"
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
                  Bảng điều khiển điều hành vĩ mô chỉ dành riêng cho <strong>Ban Giám Đốc (Executive)</strong> và 
                  <strong> Quản trị viên (Admin)</strong>.
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
                {isVi ? "Bảng điều khiển điều hành (Executive Decision Dashboard)" : "Executive Decision Dashboard"}
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
                <option value="all">{isVi ? "Toàn doanh nghiệp (Tất cả PB)" : "All Departments"}</option>
                <option value="sales">{isVi ? "Kinh doanh & Bán hàng (Sales)" : "Sales"}</option>
                <option value="legal">{isVi ? "Pháp chế (Legal Dept)" : "Legal"}</option>
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

        {/* ── KPI QUICK-STATS STRIP ───────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px"
        }}>
          {quickKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  boxShadow: "var(--shadow-xs)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
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
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginTop: 2, fontFamily: "var(--f-display)" }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: kpi.isPos ? "var(--green)" : "var(--amber)", marginTop: 2 }}>
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
                {latestRevenue ? formatCurrency(latestRevenue.revenue) : (kpis ? formatCurrency(kpis.totalRevenue) : "$22.42M")}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 3 }}>
                {latestRevenue ? (isVi ? `Năm ${latestRevenue.year} (${Number(latestRevenue.orders).toLocaleString()} đơn hàng)` : `Year ${latestRevenue.year} (${Number(latestRevenue.orders).toLocaleString()} orders)`) : (isVi ? "Kỳ gần nhất" : "Latest Period")}
              </span>
            </div>

            {/* Line chart container */}
            <div style={{
              flex: 1,
              background: "var(--surface-2)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-soft)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 140
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
                <span>$55M</span><span>$40M</span><span>$25M</span><span>$10M</span>
              </div>
              <div style={{ flex: 1, position: "relative", minHeight: 90 }}>
                <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revGradTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,69.4 L166.7,35.2 L333.3,18.8 L500,57.4"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M0,69.4 L166.7,35.2 L333.3,18.8 L500,57.4 L500,100 L0,100 Z"
                    fill="url(#revGradTokens)"
                  />
                  <circle cx="0" cy="69.4" r="3.5" fill="#2563EB" />
                  <circle cx="166.7" cy="35.2" r="3.5" fill="#2563EB" />
                  <circle cx="333.3" cy="18.8" r="4.5" fill="#2563EB" stroke="var(--surface)" strokeWidth="2" />
                  <circle cx="500" cy="57.4" r="4.5" fill="#2563EB" stroke="var(--surface)" strokeWidth="2" />
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
                <span>2011 ($14.2M)</span>
                <span>2012 ($37.7M)</span>
                <span>2013 ($49.0M)</span>
                <span style={{ color: "var(--blue)", fontWeight: 700 }}>2014 ($22.4M)</span>
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
                  {isVi ? "Top Khách hàng Giá trị cao (AdventureWorks)" : "Top High-Value Customers (AdventureWorks)"}
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
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{c.name}</div>
                        <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{c.id}</span>
                      </td>
                      <td style={{ padding: "10px 0", fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--text-1)" }}>
                        {c.revenue}
                      </td>
                      <td style={{ padding: "10px 0" }}>
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
                      <td style={{ padding: "10px 0", textAlign: "right" }}>
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
              <span>{isVi ? "Top 3 / 84 đối tác giao dịch thường xuyên" : "Top 3 of 84 frequent partners"}</span>
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

          {/* 3. PHÂN BỐ HỢP ĐỒNG CUAD */}
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
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }}></span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0, fontFamily: "var(--f-display)" }}>
                  {isVi ? "Phân bố Danh mục Hợp đồng (CUAD Ingestion)" : "Contract Category Distribution (CUAD)"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot", isVi ? "Phân tích cơ cấu danh mục hợp đồng CUAD và các loại hợp đồng phổ biến nhất" : "Analyze the CUAD contract portfolio breakdown and dominant agreement types")}
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

            <div style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 20,
              alignItems: "center",
              padding: "10px 0"
            }}>
              {/* Donut chart */}
              <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto" }}>
                <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--surface-3)" strokeWidth="4.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#2563EB" strokeWidth="4.5"
                    strokeDasharray="23.3 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#8B5CF6" strokeWidth="4.5"
                    strokeDasharray="16.7 100" strokeDashoffset="-23.3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="4.5"
                    strokeDasharray="16.7 100" strokeDashoffset="-40" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4.5"
                    strokeDasharray="43.3 100" strokeDashoffset="-56.7" />
                </svg>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none"
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--f-display)" }}>
                    {kpis ? kpis.totalContracts : 30}
                  </span>
                  <span style={{ fontSize: 9.5, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    {isVi ? "Hợp đồng" : "Contracts"}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11.5 }}>
                {[
                  { color: "#2563EB", label: isVi ? "Dịch vụ & Thuê ngoài (Service/Outsourcing)" : "Service & Outsourcing", pct: "23.3% (7)" },
                  { color: "#8B5CF6", label: isVi ? "Liên minh chiến lược & SHTT (Alliance/IP)" : "Strategic Alliance & IP", pct: "16.7% (5)" },
                  { color: "#059669", label: isVi ? "Phân phối & Đại lý (Reseller/Distribution)" : "Reseller & Distribution", pct: "16.7% (5)" },
                  { color: "#F59E0B", label: isVi ? "Hợp đồng thương mại khác" : "Other Commercial", pct: "43.3% (13)" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-2)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }}></span>
                      {item.label}
                    </span>
                    <strong style={{ color: "var(--text-1)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{item.pct}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
              <span>{isVi ? "Trích xuất tự động qua Entity Extractor v1.2" : "Auto-extracted via Entity Extractor"}</span>
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
                  {isVi ? "Tỷ lệ Tuân thủ & An toàn Pháp lý (CUAD Clauses)" : "Legal Compliance & Safety Rate"}
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
                <strong style={{ color: "var(--text-1)" }}>{isVi ? "THẤP (A-)" : "LOW (A-)"}</strong>
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
