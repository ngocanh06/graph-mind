import React, { useState } from "react";

const ALERTS = [
  {
    id: "ALERT-CUAD-087",
    severity: "high",
    borderColor: "border-red-200",
    barColor: "bg-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    icon: "⏰",
    badgeBg: "bg-red-100 text-red-700",
    badgeLabel: "Ưu tiên Cao",
    detectedAt: "Phát hiện 4 giờ trước",
    title: "Hợp đồng Cung cấp Linh kiện #087 hết hạn trong 5 ngày",
    description: (
      <>
        Hợp đồng nguyên tắc giữa Doanh nghiệp và{" "}
        <strong className="text-slate-800">Tập đoàn Viễn thông Alpha</strong>{" "}
        sẽ hết hiệu lực vào ngày <strong>05/11/2024</strong>. Điều khoản gia hạn
        tự động (Automatic Renewal) không được kích hoạt trong tệp văn bản quét.
        Cần tái đàm phán hoặc gia hạn văn bản ngay để tránh gián đoạn chuỗi cung ứng.
      </>
    ),
    meta: [
      { label: "Phòng ban:", value: <strong className="text-slate-700">Kinh doanh &amp; Bán hàng</strong> },
      {
        label: "Trích dẫn nguồn:",
        value: (
          <a href="#" className="text-blue-600 font-semibold hover:underline">
            CUAD_Contract_087.pdf (Trang 12)
          </a>
        ),
      },
    ],
  },
  {
    id: "ALERT-CRM-3912",
    severity: "medium",
    borderColor: "border-amber-200",
    barColor: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    icon: "📉",
    badgeBg: "bg-amber-100 text-amber-800",
    badgeLabel: "Ưu tiên Trung bình",
    detectedAt: "Phát hiện 1 ngày trước",
    title: "Khách hàng VIP (Công ty Cơ khí Đông Nam) giảm 30% tần suất đặt hàng",
    description: (
      <>
        Mô hình phân tích đơn hàng từ{" "}
        <strong>AdventureWorks SalesOrderHeader</strong> ghi nhận số lượng đơn
        đặt hàng trung bình giảm từ 8 đơn/tháng xuống còn 2 đơn trong 45 ngày
        qua. Chưa ghi nhận khiếu nại chất lượng dịch vụ trong hệ thống SOP.
      </>
    ),
    meta: [
      { label: "Khách hàng ID:", value: <strong className="text-slate-700">CUST-3912</strong> },
      {
        label: "Doanh số sụt giảm dự kiến:",
        value: <strong className="text-red-600 font-semibold">-285,000,000 ₫</strong>,
      },
    ],
  },
  {
    id: "ALERT-GRAPH-042",
    severity: "medium",
    borderColor: "border-amber-200",
    barColor: "bg-amber-500",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    icon: "⚠️",
    badgeBg: "bg-amber-100 text-amber-800",
    badgeLabel: "Ưu tiên Trung bình",
    detectedAt: "Phát hiện 2 ngày trước",
    title: "Điều khoản bất thường trong Hợp đồng CUAD_042",
    description: (
      <>
        Neo4j Schema Inspector phát hiện quan hệ{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono text-[11px]">
          HAS_RISK_LIABILITY
        </code>{" "}
        liên kết giữa điều khoản thanh toán và rủi ro phạt hợp đồng không có
        mức trần (No Liability Cap).
      </>
    ),
    meta: [
      { label: "Thực thể liên quan:", value: <strong className="text-slate-700">Node CUAD_042_Clause_19</strong> },
    ],
  },
];

export default function RiskView({ onNavigate, lang = "vi" }) {
  const isVi = lang === "vi";
  const [filter, setFilter] = useState("all");
  const [resolved, setResolved] = useState({});
  const [showEmpty, setShowEmpty] = useState(false);

  const countHigh   = ALERTS.filter((a) => a.severity === "high").length;
  const countMedium = ALERTS.filter((a) => a.severity === "medium").length;

  const visible = showEmpty
    ? []
    : ALERTS.filter((a) => {
        if (resolved[a.id]) return false;
        if (filter === "high")   return a.severity === "high";
        if (filter === "medium") return a.severity === "medium";
        return true;
      });

  const handleResolve = (id) => setResolved((prev) => ({ ...prev, [id]: true }));

  const filterBtns = [
    { key: "all",    label: `${isVi ? "Tất cả" : "All"} (${ALERTS.length})`,          dot: null,          activeClass: "bg-blue-600 text-white" },
    { key: "high",   label: `${isVi ? "Mức độ Cao" : "High"} (${countHigh})`,         dot: "bg-red-500",  activeClass: "bg-red-600 text-white" },
    { key: "medium", label: `${isVi ? "Trung bình" : "Medium"} (${countMedium})`,     dot: "bg-amber-500",activeClass: "bg-amber-500 text-white" },
  ];

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-[1440px] mx-auto px-8 py-6 space-y-6">

        {/* ── TITLE + FILTER TOOLBAR ───────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isVi
                ? "Trung tâm cảnh báo rủi ro thông minh (M4)"
                : "Smart Risk & Alert Center (M4)"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? "Phát hiện sớm hợp đồng sắp mãn hạn và đối tác có tần suất đặt hàng suy giảm bất thường."
                : "Early detection of expiring contracts and partners with abnormal order frequency drops."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium mr-1">
              {isVi ? "Bộ lọc mức độ:" : "Filter level:"}
            </span>
            {filterBtns.map(({ key, label, dot, activeClass }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setShowEmpty(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  filter === key && !showEmpty
                    ? `${activeClass} border-transparent shadow-sm`
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {dot && <span className={`w-2 h-2 rounded-full ${dot} inline-block`}></span>}
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowEmpty((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all border border-transparent"
            >
              {isVi ? "Mô phỏng Empty State" : "Simulate Empty State"}
            </button>
          </div>
        </div>

        {/* ── ALERT CARDS / EMPTY STATE ────────────────────────────── */}
        {showEmpty || visible.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✅
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {isVi ? "Không có cảnh báo nào — mọi thứ đều ổn!" : "No alerts — everything looks good!"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {isVi
                ? "Tất cả hợp đồng trong cơ sở tri thức CUAD đều còn hiệu lực an toàn và chỉ số bán hàng từ AdventureWorks duy trì mức ổn định theo tiêu chuẩn phòng ban."
                : "All contracts in the CUAD knowledge base are safely active and AdventureWorks sales indicators remain stable within departmental standards."}
            </p>
            <button
              onClick={() => { setShowEmpty(false); setFilter("all"); setResolved({}); }}
              className="mt-5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              {isVi ? "Quay lại danh sách cảnh báo mẫu" : "Back to sample alerts"}
            </button>
          </div>
        ) : (
          /* ALERTS LIST */
          <div className="space-y-4">
            {visible.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border ${alert.borderColor} p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
              >
                {/* Left color bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${alert.barColor}`} />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pl-1">
                  {/* Left: icon + content */}
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${alert.iconBg} ${alert.iconColor} flex items-center justify-center shrink-0 mt-0.5 text-lg`}>
                      {alert.icon}
                    </div>
                    <div>
                      {/* Badge row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${alert.badgeBg}`}>
                          {alert.badgeLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{alert.id}</span>
                        <span className="text-xs text-slate-400">• {alert.detectedAt}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {alert.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                        {alert.description}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                        {alert.meta.map((m, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span>•</span>}
                            <span>{m.label} {m.value}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      ✔ {isVi ? "Xử lý cảnh báo" : "Resolve alert"}
                    </button>
                    <button
                      onClick={() => onNavigate?.("copilot")}
                      title={isVi ? "Hỏi Copilot" : "Ask Copilot"}
                      className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      🤖
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
