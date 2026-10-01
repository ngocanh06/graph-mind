import React, { useState } from "react";

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

  const topCustomers = [
    { name: "Tập đoàn Viễn thông Alpha", id: "CUST-8491", revenue: "1,280,000,000 đ", dept: "Bán lẻ & Dự án", deptClass: "text-blue-600 bg-blue-50" },
    { name: "Công ty Cơ khí Đông Nam",   id: "CUST-3912", revenue: "950,000,000 đ",   dept: "Phân phối",       deptClass: "text-emerald-600 bg-emerald-50" },
    { name: "Logistics Toàn Cầu Tech",   id: "CUST-1044", revenue: "740,000,000 đ",   dept: "Dịch vụ",         deptClass: "text-purple-600 bg-purple-50" },
  ];

  const complianceBars = [
    { label: "Điều khoản Giới hạn Trách nhiệm (Liability Cap)", pct: 92.4, color: "bg-emerald-500", note: "92.4% Đạt chuẩn", noteClass: "text-emerald-600" },
    { label: "Điều khoản Bảo mật & Thời hạn NDA",               pct: 98.1, color: "bg-emerald-500", note: "98.1% Đạt chuẩn", noteClass: "text-emerald-600" },
    { label: "Điều khoản Bồi thường thiệt hại (Indemnification)", pct: 81.5, color: "bg-amber-400",  note: "81.5% (Cần rà soát 7 hợp đồng)", noteClass: "text-amber-600" },
  ];

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-[1440px] mx-auto px-8 py-6 space-y-6">

        {/* ── TITLE BAR + FILTERS ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {isVi
                ? "Bảng điều khiển điều hành (Executive Decision Dashboard)"
                : "Executive Decision Dashboard"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isVi
                ? "Dữ liệu hợp nhất từ AdventureWorks ERP và cơ sở tri thức hợp đồng pháp lý CUAD"
                : "Unified data from AdventureWorks ERP and CUAD legal contract knowledge base"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Period */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
              <span className="text-slate-400">📅</span>
              <span className="text-slate-500 whitespace-nowrap">
                {isVi ? "Kỳ báo cáo:" : "Period:"}
              </span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="30D">{isVi ? "30 ngày qua (Tháng 10/2024)" : "Last 30 days (Oct 2024)"}</option>
                <option value="Q3">{isVi ? "Quý 3/2024" : "Q3 2024"}</option>
                <option value="12M">{isVi ? "Năm tài chính 2024" : "FY 2024"}</option>
              </select>
            </div>

            {/* Dept */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
              <span className="text-slate-400">🏢</span>
              <span className="text-slate-500 whitespace-nowrap">
                {isVi ? "Phòng ban:" : "Dept:"}
              </span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">{isVi ? "Toàn doanh nghiệp (Tất cả PB)" : "All Departments"}</option>
                <option value="sales">{isVi ? "Kinh doanh & Bán hàng (Sales)" : "Sales"}</option>
                <option value="legal">{isVi ? "Pháp chế (Legal Dept)" : "Legal"}</option>
                <option value="finance">{isVi ? "Tài chính - Kế toán" : "Finance"}</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              title={isVi ? "Làm mới số liệu" : "Refresh metrics"}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── 2×2 CHART GRID ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. DOANH THU & XU HƯỚNG */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isVi ? "Doanh thu & Xu hướng giao dịch" : "Revenue & Transaction Trend"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold transition-colors whitespace-nowrap"
              >
                ✨ {isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}
              </button>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl font-bold text-slate-900">4,829,000,000 VNĐ</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                ↗ +14.2% {isVi ? "so với tháng trước" : "vs last month"}
              </span>
            </div>

            {/* Line chart */}
            <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100 p-3 flex flex-col">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span>5.5B</span><span>4.0B</span><span>2.5B</span><span>1.0B</span>
              </div>
              <div className="flex-1 relative min-h-[100px]">
                <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,85 C60,80 100,70 150,75 S250,40 300,35 S400,48 450,40 L500,15"
                    fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
                  />
                  <path
                    d="M0,85 C60,80 100,70 150,75 S250,40 300,35 S400,48 450,40 L500,15 L500,100 L0,100 Z"
                    fill="url(#revGrad)"
                  />
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200">
                <span>{isVi ? "Tuần 1" : "Wk 1"}</span>
                <span>{isVi ? "Tuần 2" : "Wk 2"}</span>
                <span>{isVi ? "Tuần 3" : "Wk 3"}</span>
                <span>{isVi ? "Tuần 4" : "Wk 4"}</span>
                <span>{isVi ? "Hiện tại" : "Now"}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
              <span>
                {isVi ? "Nguồn dữ liệu:" : "Source:"}{" "}
                <strong className="text-slate-700">AdventureWorks Sales.OrderHeader</strong>
              </span>
              <button
                onClick={() => onNavigate?.("reports")}
                className="text-blue-600 hover:underline cursor-pointer font-medium"
              >
                {isVi ? "Chi tiết báo cáo →" : "Full report →"}
              </button>
            </div>
          </div>

          {/* 2. TOP KHÁCH HÀNG */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isVi ? "Top Khách hàng Giá trị cao (AdventureWorks)" : "Top High-Value Customers (AdventureWorks)"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold transition-colors whitespace-nowrap"
              >
                ✨ {isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-semibold">
                    <th className="pb-2">{isVi ? "Khách hàng" : "Customer"}</th>
                    <th className="pb-2">{isVi ? "Doanh thu đóng góp" : "Revenue"}</th>
                    <th className="pb-2">{isVi ? "Phòng ban" : "Dept"}</th>
                    <th className="pb-2 text-right">{isVi ? "Thao tác" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-semibold text-slate-800">
                        <div>{c.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.id}</span>
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-slate-900">{c.revenue}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.deptClass}`}>
                          {c.dept}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onNavigate?.("knowledge")}
                          className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold"
                        >
                          {isVi ? "Xem đồ thị →" : "View graph →"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>{isVi ? "Top 3 / 84 đối tác giao dịch thường xuyên" : "Top 3 of 84 frequent transaction partners"}</span>
              <button
                onClick={() => onNavigate?.("knowledge")}
                className="text-blue-600 font-medium hover:underline cursor-pointer"
              >
                {isVi ? "Mở bảng đầy đủ (SCREEN-020)" : "Open full table →"}
              </button>
            </div>
          </div>

          {/* 3. PHÂN BỐ HỢP ĐỒNG CUAD */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shrink-0"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isVi ? "Phân bố Danh mục Hợp đồng (CUAD Ingestion)" : "Contract Category Distribution (CUAD)"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold transition-colors whitespace-nowrap"
              >
                ✨ {isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}
              </button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 items-center py-2">
              {/* Donut */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#2563EB" strokeWidth="4.5"
                    strokeDasharray="45 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#7C3AED" strokeWidth="4.5"
                    strokeDasharray="30 100" strokeDashoffset="-45" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#16A34A" strokeWidth="4.5"
                    strokeDasharray="25 100" strokeDashoffset="-75" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-bold text-slate-900">142</span>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wide">
                    {isVi ? "Hợp đồng" : "Contracts"}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2.5 text-xs">
                {[
                  { color: "bg-blue-600",   label: isVi ? "Hợp đồng Dịch vụ (Service)" : "Service Contracts",      pct: "45% (64)" },
                  { color: "bg-purple-600", label: isVi ? "NDA & Bảo mật thông tin"   : "NDA & Confidentiality",   pct: "30% (43)" },
                  { color: "bg-emerald-600",label: isVi ? "Cung ứng hàng hóa (Supply)" : "Supply Agreements",       pct: "25% (35)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`w-2.5 h-2.5 rounded shrink-0 inline-block ${item.color}`}></span>
                      {item.label}
                    </span>
                    <strong className="text-slate-800 shrink-0">{item.pct}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>{isVi ? "Trích xuất tự động qua Entity Extractor v1.2" : "Auto-extracted via Entity Extractor v1.2"}</span>
              <button
                onClick={() => onNavigate?.("knowledge")}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                {isVi ? "Mở Knowledge Base (SCREEN-015)" : "Open Knowledge Base →"}
              </button>
            </div>
          </div>

          {/* 4. TỶ LỆ TUÂN THỦ PHÁP LÝ */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isVi ? "Tỷ lệ Tuân thủ & An toàn Pháp lý (CUAD Clauses)" : "Legal Compliance & Safety Rate (CUAD Clauses)"}
                </h3>
              </div>
              <button
                onClick={() => onNavigate?.("copilot")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold transition-colors whitespace-nowrap"
              >
                ✨ {isVi ? "Hỏi AI về chỉ số này" : "Ask AI about this"}
              </button>
            </div>

            <div className="flex-1 space-y-4 my-1">
              {complianceBars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{bar.label}</span>
                    <strong className={bar.noteClass}>{bar.note}</strong>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all`}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <span className="text-emerald-600">✔</span>
                {isVi ? "Độ rủi ro pháp lý toàn danh mục:" : "Portfolio legal risk:"}{" "}
                <strong className="text-slate-800 ml-0.5">{isVi ? "THẤP (A-)" : "LOW (A-)"}</strong>
              </span>
              <button
                onClick={() => onNavigate?.("risk")}
                className="text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                {isVi ? "Xem cảnh báo rủi ro →" : "View risk alerts →"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
