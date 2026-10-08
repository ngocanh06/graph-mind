import React, { useState } from "react";
import {
  Calendar, Building2, TrendingUp, Users, FileText, DollarSign,
  Activity, AlertTriangle, ArrowUpRight, Sparkles, RefreshCw,
  ShieldCheck, BarChart3, ChevronRight, CheckCircle2
} from "lucide-react";

export default function ExecutiveView({
  entities = {},
  selectedEntity = "",
  onSelectEntity,
  signals = [],
  onNavigate,
  t = {},
  lang = "vi"
}) {
  const isVi = lang === "vi";
  const [period, setPeriod] = useState("30D");
  const [dept, setDept] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const topCustomers = [
    {
      name: "Tập đoàn Viễn thông Alpha",
      id: "CUST-8491",
      revenue: "1,280,000,000 đ",
      dept: isVi ? "Bán lẻ & Dự án" : "Retail & Projects",
      deptColor: "var(--blue)",
      deptBg: "rgba(37, 99, 235, 0.08)"
    },
    {
      name: "Công ty Cơ khí Đông Nam",
      id: "CUST-3912",
      revenue: "950,000,000 đ",
      dept: isVi ? "Phân phối" : "Distribution",
      deptColor: "var(--green)",
      deptBg: "rgba(5, 150, 105, 0.08)"
    },
    {
      name: "Logistics Toàn Cầu Tech",
      id: "CUST-1044",
      revenue: "740,000,000 đ",
      dept: isVi ? "Dịch vụ" : "Services",
      deptColor: "#8b5cf6",
      deptBg: "rgba(139, 92, 246, 0.08)"
    },
  ];

  const complianceBars = [
    {
      label: isVi ? "Điều khoản Giới hạn Trách nhiệm (Liability Cap)" : "Liability Cap Clause",
      pct: 92.4,
      color: "var(--green)",
      note: isVi ? "92.4% Đạt chuẩn" : "92.4% Compliant",
      noteColor: "var(--green)"
    },
    {
      label: isVi ? "Điều khoản Bảo mật & Thời hạn NDA" : "Confidentiality & NDA Duration",
      pct: 98.1,
      color: "var(--green)",
      note: isVi ? "98.1% Đạt chuẩn" : "98.1% Compliant",
      noteColor: "var(--green)"
    },
    {
      label: isVi ? "Điều khoản Bồi thường thiệt hại (Indemnification)" : "Indemnification Clauses",
      pct: 81.5,
      color: "var(--amber)",
      note: isVi ? "81.5% (Cần rà soát 7 hợp đồng)" : "81.5% (7 contracts need review)",
      noteColor: "var(--amber)"
    },
  ];

  const quickKpis = [
    {
      label: isVi ? "Tổng doanh thu ghi nhận" : "Total Revenue YTD",
      value: "4.829 tỷ VNĐ",
      sub: "+14.2% MoM",
      isPos: true,
      icon: DollarSign,
      color: "var(--blue)",
      bg: "var(--blue-soft)"
    },
    {
      label: isVi ? "Hợp đồng pháp lý CUAD" : "CUAD Ingested Contracts",
      value: "142 tệp",
      sub: isVi ? "100% vector hóa" : "100% vectorized",
      isPos: true,
      icon: FileText,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.08)"
    },
    {
      label: isVi ? "Điểm an toàn pháp lý" : "Legal Safety Score",
      value: "91.8 / 100",
      sub: isVi ? "Xếp hạng A- (Thấp)" : "Grade A- (Low risk)",
      isPos: true,
      icon: ShieldCheck,
      color: "var(--green)",
      bg: "var(--green-soft)"
    },
    {
      label: isVi ? "Cảnh báo rủi ro tồn đọng" : "Active Risk Alerts",
      value: "3 cảnh báo",
      sub: isVi ? "1 mức độ cao" : "1 critical priority",
      isPos: false,
      icon: AlertTriangle,
      color: "var(--amber)",
      bg: "var(--amber-soft)"
    }
  ];

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
                onClick={() => onNavigate?.("copilot")}
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
                4,829,000,000 VNĐ
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--green)", display: "flex", alignItems: "center", gap: 3 }}>
                ↗ +14.2% {isVi ? "so với tháng trước" : "vs last month"}
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
                <span>5.5B</span><span>4.0B</span><span>2.5B</span><span>1.0B</span>
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
                    d="M0,85 C60,80 100,70 150,75 S250,40 300,35 S400,48 450,40 L500,15"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,85 C60,80 100,70 150,75 S250,40 300,35 S400,48 450,40 L500,15 L500,100 L0,100 Z"
                    fill="url(#revGradTokens)"
                  />
                  <circle cx="500" cy="15" r="4.5" fill="#2563EB" stroke="var(--surface)" strokeWidth="2" />
                </svg>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--text-4)",
                fontFamily: "var(--f-mono)",
                borderTop: "1px solid var(--border-soft)",
                paddingTop: 6
              }}>
                <span>{isVi ? "Tuần 1" : "Wk 1"}</span>
                <span>{isVi ? "Tuần 2" : "Wk 2"}</span>
                <span>{isVi ? "Tuần 3" : "Wk 3"}</span>
                <span>{isVi ? "Tuần 4" : "Wk 4"}</span>
                <span style={{ color: "var(--blue)", fontWeight: 700 }}>{isVi ? "Hiện tại" : "Now"}</span>
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
                onClick={() => onNavigate?.("copilot")}
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
                onClick={() => onNavigate?.("copilot")}
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
                    strokeDasharray="45 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#8B5CF6" strokeWidth="4.5"
                    strokeDasharray="30 100" strokeDashoffset="-45" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="4.5"
                    strokeDasharray="25 100" strokeDashoffset="-75" />
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
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", fontFamily: "var(--f-display)" }}>142</span>
                  <span style={{ fontSize: 9.5, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    {isVi ? "Hợp đồng" : "Contracts"}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                {[
                  { color: "#2563EB", label: isVi ? "Hợp đồng Dịch vụ (Service)" : "Service Contracts", pct: "45% (64)" },
                  { color: "#8B5CF6", label: isVi ? "NDA & Bảo mật thông tin" : "NDA & Confidentiality", pct: "30% (43)" },
                  { color: "#059669", label: isVi ? "Cung ứng hàng hóa (Supply)" : "Supply Agreements", pct: "25% (35)" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }}></span>
                      {item.label}
                    </span>
                    <strong style={{ color: "var(--text-1)", fontFamily: "var(--f-mono)", fontSize: 11.5 }}>{item.pct}</strong>
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
                onClick={() => onNavigate?.("copilot")}
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
