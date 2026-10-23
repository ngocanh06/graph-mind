import React, { useState } from "react";
import {
  Database, CloudDownload, FileCode, Filter, Share2, Search,
  HardDrive, Table, Server, Eye, RefreshCw, CheckCircle2,
  ArrowRight
} from "lucide-react";
import { PageHeader, Card, Badge, Button } from "../../components/ui";

export default function ConnectorsView({ t = {}, lang = "vi" }) {
  const isVi = lang === "vi";
  const [syncingId, setSyncingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const triggerSync = (id, name) => {
    setSyncingId(id);
    setToastMsg(isVi ? `Đang kích hoạt đồng bộ dữ liệu cho ${name}...` : `Triggering data sync for ${name}...`);
    setTimeout(() => {
      setSyncingId(null);
      setToastMsg(isVi ? `Đồng bộ hoàn tất thành công cho ${name}!` : `Sync completed successfully for ${name}!`);
      setTimeout(() => setToastMsg(""), 3000);
    }, 1200);
  };

  const pipelineStages = [
    { label: isVi ? "Nguồn" : "Source", Icon: Database },
    { label: isVi ? "Thu nạp" : "Ingestion", Icon: CloudDownload },
    { label: isVi ? "Phân giải" : "Parsing", Icon: FileCode },
    { label: isVi ? "Trích xuất" : "Extraction", Icon: Filter },
    { label: isVi ? "Đồ thị Tri thức" : "Knowledge Graph", Icon: Share2 },
    { label: isVi ? "Tìm kiếm AI" : "AI Search", Icon: Search },
  ];

  const connectors = [
    {
      id: "gdrive",
      name: "Google Drive Workspace",
      type: "Cloud Storage",
      Icon: HardDrive,
      iconColor: "#34a853",
      iconBg: "rgba(52, 168, 83, 0.1)",
      status: isVi ? "Đã kết nối · Liên tục" : "Connected · Continuous",
      lastSync: isVi ? "2 phút trước" : "2 min ago",
      nextSync: isVi ? "trong 13 phút" : "in 13 min",
      filesProcessed: "4,208",
      recordsExtracted: "18,930",
      pill: isVi ? "0 lỗi" : "0 errors",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Liên tục" : "Mode: Continuous"
    },
    {
      id: "gsheets",
      name: "Google Sheets & ERP Data",
      type: "Tabular Records",
      Icon: Table,
      iconColor: "#059669",
      iconBg: "rgba(5, 150, 105, 0.1)",
      status: isVi ? "Đã kết nối · Định kỳ" : "Connected · Scheduled",
      lastSync: isVi ? "9 phút trước" : "9 min ago",
      nextSync: isVi ? "trong 6 phút" : "in 6 min",
      filesProcessed: "312",
      recordsExtracted: "52,104",
      pill: isVi ? "0 lỗi" : "0 errors",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Liên tục" : "Mode: Continuous"
    },
    {
      id: "aegis_agent",
      name: "Local Agent — AEGIS Edge",
      type: "On-Premise Connector",
      Icon: Server,
      iconColor: "var(--cyan, #0891B2)",
      iconBg: "var(--cyan-soft, rgba(8,145,178,0.08))",
      status: isVi ? "3 máy đang trực tuyến" : "3 machines online",
      lastSync: isVi ? "14 giây trước" : "14s ago",
      nextSync: isVi ? "Thời gian thực" : "Real-time",
      filesProcessed: "11 thư mục",
      recordsExtracted: "86 tệp / 24h",
      pill: isVi ? "1 máy ngoại tuyến" : "1 machine offline",
      pillVariant: "warning",
      mode: isVi ? "Chế độ: Thời gian thực" : "Mode: Real-time"
    },
    {
      id: "watcher",
      name: "Kernel File Watcher",
      type: "Filesystem Event Listener",
      Icon: Eye,
      iconColor: "var(--blue, #2563EB)",
      iconBg: "var(--blue-soft, rgba(37,99,235,0.08))",
      status: isVi ? "Đang theo dõi tích cực" : "Actively Watching",
      lastSync: isVi ? "Thời gian thực" : "Real-time",
      nextSync: isVi ? "Độ trễ: 4.2s" : "Avg Latency: 4.2s",
      filesProcessed: "212 sự kiện",
      recordsExtracted: "198 tự động nạp",
      pill: isVi ? "Khỏe mạnh" : "Healthy",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Daemon Watch" : "Mode: Daemon Watch"
    }
  ];

  return (
    <div style={{ background: "var(--base, #F8FAFC)", minHeight: "100%", padding: "28px 32px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Toast */}
        {toastMsg && (
          <div style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            background: "var(--surface, #FFFFFF)",
            border: "1px solid var(--border-strong, #CBD5E1)",
            borderRadius: "var(--r-md, 8px)",
            padding: "12px 18px",
            boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1, #0F172A)"
          }}>
            <CheckCircle2 size={16} color="var(--green, #059669)" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── HEADER ─────────────────────────────────────────── */}
        <PageHeader
          title={isVi ? "Kết nối Nguồn Dữ liệu & Pipeline Thu nạp (M1)" : "Data Connectors & Ingestion Pipeline (M1)"}
          subtitle={isVi
            ? "Giám sát trạng thái đồng bộ, các kênh trích xuất và cơ chế nạp tự động vào Knowledge Graph"
            : "Monitor sync status, extraction channels, and automated ingestion into the Knowledge Graph"}
          badge={isVi ? "4 NGUỒN HOẠT ĐỘNG" : "4 SOURCES ACTIVE"}
          badgeVariant="success"
        />

        {/* ── PIPELINE FLOW STRIP ────────────────────────────── */}
        <Card padding="20px 24px">
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
            {isVi ? "Quy trình Thu nạp & Trích xuất Tri thức Doanh nghiệp" : "Enterprise Ingestion & Knowledge Extraction Pipeline"}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10
          }}>
            {pipelineStages.map((stage, idx) => {
              const StageIcon = stage.Icon;
              return (
                <React.Fragment key={idx}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--surface-2, #F8FAFC)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: "var(--r-md, 8px)",
                    padding: "8px 14px",
                    flex: 1,
                    minWidth: 130
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--blue-soft, rgba(37,99,235,0.08))",
                      color: "var(--blue, #2563EB)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <StageIcon size={16} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-4, #94A3B8)", fontWeight: 600, textTransform: "uppercase" }}>
                        {isVi ? `Bước 0${idx+1}` : `Stage 0${idx+1}`}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1, #0F172A)" }}>
                        {stage.label}
                      </div>
                    </div>
                  </div>

                  {idx < pipelineStages.length - 1 && (
                    <div style={{ color: "var(--text-4, #94A3B8)", display: "flex", alignItems: "center" }}>
                      <ArrowRight size={14} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>

        {/* ── CONNECTOR CARDS GRID ───────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 20
        }}>
          {connectors.map((c) => {
            const ConnIcon = c.Icon;
            const isSyncing = syncingId === c.id;

            return (
              <Card
                key={c.id}
                padding="22px"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  position: "relative"
                }}
              >
                {/* Connector Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: c.iconBg,
                      color: c.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <ConnIcon size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1, #0F172A)", margin: 0, fontFamily: "var(--f-display, inherit)" }}>
                        {c.name}
                      </h3>
                      <div style={{ fontSize: 11.5, color: "var(--text-3, #64748B)", marginTop: 2 }}>
                        {c.type}
                      </div>
                    </div>
                  </div>

                  <Badge variant={c.pillVariant} dot>
                    {c.pill}
                  </Badge>
                </div>

                {/* Status Bar */}
                <div style={{
                  padding: "10px 14px",
                  background: "var(--surface-2, #F8FAFC)",
                  borderRadius: "var(--r-md, 8px)",
                  border: "1px solid var(--border, #E2E8F0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-2, #334155)", fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green, #059669)" }}></span>
                    <span>{c.status}</span>
                  </div>
                  <span style={{ color: "var(--text-4, #94A3B8)", fontSize: 11 }}>
                    {c.mode}
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--surface-3, #EDF2F7)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2
                  }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-3, #64748B)", textTransform: "uppercase", fontWeight: 600 }}>
                      {isVi ? "Tệp đã nạp" : "Files processed"}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-1, #0F172A)", fontFamily: "var(--f-display, inherit)" }}>
                      {c.filesProcessed}
                    </span>
                  </div>

                  <div style={{
                    padding: "10px 12px",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--surface-3, #EDF2F7)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2
                  }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-3, #64748B)", textTransform: "uppercase", fontWeight: 600 }}>
                      {isVi ? "Bản ghi trích xuất" : "Records extracted"}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "var(--blue, #2563EB)", fontFamily: "var(--f-display, inherit)" }}>
                      {c.recordsExtracted}
                    </span>
                  </div>
                </div>

                {/* Timing & Action */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTop: "1px solid var(--border-subtle, #EDF2F7)",
                  marginTop: "auto"
                }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-3, #64748B)" }}>
                    <div>{isVi ? `Lần cuối: ${c.lastSync}` : `Last: ${c.lastSync}`}</div>
                    <div style={{ color: "var(--text-4, #94A3B8)", fontSize: 10.5 }}>{isVi ? `Tiếp theo: ${c.nextSync}` : `Next: ${c.nextSync}`}</div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={RefreshCw}
                    loading={isSyncing}
                    onClick={() => triggerSync(c.id, c.name)}
                  >
                    <span>{isSyncing ? (isVi ? "Đang đồng bộ..." : "Syncing...") : (isVi ? "Đồng bộ ngay" : "Sync Now")}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
