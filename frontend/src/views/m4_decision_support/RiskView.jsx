import React, { useState } from "react";
import {
  Clock, TrendingDown, AlertTriangle, CheckCircle2,
  Bot, Check, ShieldAlert, Sparkles, Filter, RefreshCw,
  FileText, ExternalLink, ShieldCheck
} from "lucide-react";
import { PageHeader, Card, Badge, Button, EmptyState } from "../../components/ui";

const ALERTS_DATA = (isVi) => [
  {
    id: "ALERT-CUAD-087",
    severity: "high",
    variant: "danger",
    Icon: Clock,
    badgeLabel: isVi ? "Ưu tiên Cao" : "Critical Priority",
    detectedAt: isVi ? "Phát hiện 4 giờ trước" : "Detected 4h ago",
    title: isVi
      ? "Hợp đồng Cung cấp Linh kiện #087 hết hạn trong 5 ngày"
      : "Component Supply Agreement #087 expiring in 5 days",
    description: isVi
      ? "Hợp đồng nguyên tắc giữa Doanh nghiệp và Tập đoàn Viễn thông Alpha sẽ hết hiệu lực vào ngày 05/11/2024. Điều khoản gia hạn tự động không được kích hoạt trong tệp văn bản quét. Cần tái đàm phán hoặc gia hạn văn bản ngay để tránh gián đoạn chuỗi cung ứng."
      : "Master framework agreement between Enterprise and Alpha Corp expires on Nov 5, 2024. Auto-renewal clause not activated in ingested scan. Urgent renegotiation needed to avoid supply chain interruption.",
    meta: [
      { label: isVi ? "Phòng ban:" : "Department:", value: isVi ? "Kinh doanh & Bán hàng" : "Sales & BD" },
      {
        label: isVi ? "Trích dẫn nguồn:" : "Source citation:",
        value: "CUAD_Contract_087.pdf (Trang 12)",
        isLink: true
      },
    ],
  },
  {
    id: "ALERT-CRM-3912",
    severity: "medium",
    variant: "warning",
    Icon: TrendingDown,
    badgeLabel: isVi ? "Ưu tiên Trung bình" : "Medium Priority",
    detectedAt: isVi ? "Phát hiện 1 ngày trước" : "Detected 1 day ago",
    title: isVi
      ? "Khách hàng VIP (Công ty Cơ khí Đông Nam) giảm 30% tần suất đặt hàng"
      : "VIP Customer (Dong Nam Mechanics) 30% order cadence reduction",
    description: isVi
      ? "Mô hình phân tích đơn hàng từ AdventureWorks SalesOrderHeader ghi nhận số lượng đơn đặt hàng trung bình giảm từ 8 đơn/tháng xuống còn 2 đơn trong 45 ngày qua. Chưa ghi nhận khiếu nại chất lượng dịch vụ trong hệ thống SOP."
      : "Time-series order analytics from AdventureWorks SalesOrderHeader detects average monthly orders dropped from 8 to 2 over the past 45 days. No quality tickets recorded in SOP tracker.",
    meta: [
      { label: isVi ? "Khách hàng ID:" : "Customer ID:", value: "CUST-3912" },
      {
        label: isVi ? "Doanh số sụt giảm dự kiến:" : "Projected revenue dip:",
        value: "-285,000,000 ₫",
        highlight: "var(--red, #DC2626)"
      },
    ],
  },
  {
    id: "ALERT-GRAPH-042",
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
      { label: isVi ? "Thực thể liên quan:" : "Associated Entity:", value: "Node CUAD_042_Clause_19" },
    ],
  },
];

export default function RiskView({ onNavigate, lang = "vi" }) {
  const isVi = lang === "vi";
  const [filter, setFilter] = useState("all");
  const [resolved, setResolved] = useState({});
  const [showEmpty, setShowEmpty] = useState(false);

  const rawAlerts = ALERTS_DATA(isVi);
  const countHigh = rawAlerts.filter((a) => a.severity === "high").length;
  const countMedium = rawAlerts.filter((a) => a.severity === "medium").length;

  const visible = showEmpty
    ? []
    : rawAlerts.filter((a) => {
        if (resolved[a.id]) return false;
        if (filter === "high") return a.severity === "high";
        if (filter === "medium") return a.severity === "medium";
        return true;
      });

  const handleResolve = (id) => setResolved((prev) => ({ ...prev, [id]: true }));

  const filterBtns = [
    { key: "all", label: `${isVi ? "Tất cả" : "All"} (${rawAlerts.length})` },
    { key: "high", label: `${isVi ? "Mức độ Cao" : "Critical"} (${countHigh})`, variant: "danger" },
    { key: "medium", label: `${isVi ? "Trung bình" : "Medium"} (${countMedium})`, variant: "warning" },
  ];

  return (
    <div style={{ background: "var(--base, #F8FAFC)", minHeight: "100%", padding: "28px 32px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ── HEADER TOOLBAR ─────────────────────────────────── */}
        <PageHeader
          title={isVi ? "Trung tâm Cảnh báo Rủi ro Thông minh" : "Smart Risk & Alert Center"}
          subtitle={isVi
            ? "Phát hiện sớm hợp đồng sắp mãn hạn và đối tác có tần suất đặt hàng suy giảm bất thường qua đồ thị tri thức."
            : "Early detection of expiring contracts and partners with abnormal order cadence drops via knowledge graph."}
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {filterBtns.map(({ key, label }) => {
                const isActive = filter === key && !showEmpty;
                return (
                  <Button
                    key={key}
                    variant={isActive ? "primary" : "secondary"}
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

        {/* ── ALERTS LIST / EMPTY STATE ─────────────────────── */}
        {showEmpty || visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={isVi ? "Không còn cảnh báo rủi ro tồn đọng" : "No active risk alerts remaining"}
            description={isVi
              ? "Toàn bộ hợp đồng trong cơ sở tri thức CUAD đều an toàn và các chỉ số giao dịch AdventureWorks đang nằm trong biên độ chuẩn."
              : "All contracts in the CUAD knowledge base are safely active and AdventureWorks sales metrics remain within normal parameters."}
            actionLabel={isVi ? "Khôi phục dữ liệu mẫu" : "Restore sample alerts"}
            onAction={() => { setShowEmpty(false); setFilter("all"); setResolved({}); }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {visible.map((alert) => {
              const AlertIcon = alert.Icon;
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
                          {alert.meta.map((m, mIdx) => (
                            <div key={mIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{m.label}</span>
                              <strong style={{ color: m.highlight || "var(--text-1, #0F172A)" }}>{m.value}</strong>
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
                        onClick={() => onNavigate?.("copilot")}
                      >
                        {isVi ? "Hỏi Copilot" : "Ask Copilot"}
                      </Button>

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
