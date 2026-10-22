import React, { useState, useEffect } from "react";
import {
  Database, CloudDownload, FileCode, Filter, Share2, Search,
  HardDrive, Table, Server, Eye, RefreshCw, CheckCircle2,
  ArrowRight, ShieldCheck, FolderSync, FileText, Check, AlertCircle, Play
} from "lucide-react";
import { PageHeader, Card, Badge, Button } from "../../components/ui";
import { fetchWatcherSyncStatus, triggerMockWatcherDrop } from "../../services/api";

export default function ConnectorsView({ t = {}, lang = "vi" }) {
  const isVi = lang === "vi";
  const [syncingId, setSyncingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [watcherStatus, setWatcherStatus] = useState(null);
  const [isSimulatingDrop, setIsSimulatingDrop] = useState(false);

  const loadWatcherStatus = () => {
    fetchWatcherSyncStatus().then((res) => {
      if (res && res.success) {
        setWatcherStatus(res);
      }
    });
  };

  useEffect(() => {
    loadWatcherStatus();
    const interval = setInterval(loadWatcherStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = (id, name) => {
    setSyncingId(id);
    setToastMsg(isVi ? `Đang kích hoạt đồng bộ dữ liệu cho ${name}...` : `Triggering data sync for ${name}...`);
    setTimeout(() => {
      setSyncingId(null);
      setToastMsg(isVi ? `Đồng bộ hoàn tất thành công cho ${name}!` : `Sync completed successfully for ${name}!`);
      setTimeout(() => setToastMsg(""), 3000);
    }, 1200);
  };

  const handleSimulateDrop = async () => {
    setIsSimulatingDrop(true);
    setToastMsg(isVi ? "Đang mô phỏng nhân viên thả file 'HopDong_PhanPhoi_M2026.pdf' vào thư mục máy tính..." : "Simulating file drop into employee watched folder...");
    
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const fileName = `HopDong_KinhDoanh_${randomId}.pdf`;
    const res = await triggerMockWatcherDrop(fileName, "Kinh doanh");
    
    setIsSimulatingDrop(false);
    if (res && res.success) {
      setToastMsg(isVi ? `Thành công! Agent đã tự đẩy '${fileName}' lên backend, trích xuất Graph & Vector hoàn tất.` : `Success! File '${fileName}' auto-ingested into Graph & Vector.`);
      loadWatcherStatus();
    } else {
      setToastMsg(isVi ? "Có lỗi xảy ra khi nạp tệp thử nghiệm." : "Error simulating file drop.");
    }
    setTimeout(() => setToastMsg(""), 4500);
  };

  const pipelineStages = [
    { label: isVi ? "Nguồn dữ liệu" : "Source", Icon: Database },
    { label: isVi ? "Thu nạp (Agent)" : "Ingestion", Icon: CloudDownload },
    { label: isVi ? "Phân giải tệp" : "Parsing", Icon: FileCode },
    { label: isVi ? "Trích xuất Thực thể" : "Extraction", Icon: Filter },
    { label: isVi ? "Đồ thị Tri thức Neo4j" : "Knowledge Graph", Icon: Share2 },
    { label: isVi ? "Tìm kiếm Vector Qdrant" : "Vector Search", Icon: Search },
  ];

  const totalEvents = watcherStatus?.total_events_logged || 0;
  const recentSyncs = watcherStatus?.recent_syncs || [];

  const connectors = [
    {
      id: "aegis_agent",
      name: "Local Agent — AEGIS Edge",
      type: "On-Premise SME File Watcher",
      Icon: Server,
      iconColor: "var(--cyan, #0891B2)",
      iconBg: "var(--cyan-soft, rgba(8,145,178,0.08))",
      status: isVi ? "Đang hoạt động · Webhook Live" : "Active · Webhook Live",
      lastSync: isVi ? "Vừa xong" : "Just now",
      nextSync: isVi ? "Thời gian thực (Sự kiện)" : "Real-time Event-driven",
      filesProcessed: `${totalEvents + 1} tệp`,
      recordsExtracted: `${(totalEvents + 1) * 3} thực thể Graph`,
      pill: isVi ? "0 lỗi kết nối" : "0 errors",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Webhook Daemon" : "Mode: Webhook Daemon"
    },
    {
      id: "watcher",
      name: "Kernel File Watcher",
      type: "Filesystem Event Listener (Windows/Linux)",
      Icon: Eye,
      iconColor: "var(--blue, #2563EB)",
      iconBg: "var(--blue-soft, rgba(37,99,235,0.08))",
      status: isVi ? "Đang theo dõi tích cực" : "Actively Watching",
      lastSync: isVi ? "Thời gian thực" : "Real-time",
      nextSync: isVi ? "Độ trễ: 0.3s" : "Avg Latency: 0.3s",
      filesProcessed: `${totalEvents + 4} sự kiện`,
      recordsExtracted: "100% tự động đẩy",
      pill: isVi ? "Khỏe mạnh" : "Healthy",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Local Watchdog" : "Mode: Local Watchdog"
    },
    {
      id: "gdrive",
      name: "Google Drive Workspace",
      type: "Cloud Storage Connector",
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
      name: "AdventureWorks ERP & Datasets",
      type: "Neo4j Relational Graph Mapper",
      Icon: Table,
      iconColor: "#059669",
      iconBg: "rgba(5, 150, 105, 0.1)",
      status: isVi ? "Đã kết nối · Live Neo4j" : "Connected · Live Neo4j",
      lastSync: isVi ? "5 phút trước" : "5 min ago",
      nextSync: isVi ? "Thời gian thực" : "Real-time",
      filesProcessed: "5 bảng dữ liệu",
      recordsExtracted: "52,120 nodes",
      pill: isVi ? "Sẵn sàng" : "Ready",
      pillVariant: "success",
      mode: isVi ? "Chế độ: Graph Mapping" : "Mode: Graph Mapping"
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
          subtitle={
            isVi
              ? "Quản trị toàn bộ các luồng dữ liệu tự động: từ AEGIS Local File Watcher (máy nhân viên) đến Google Drive, AdventureWorks ERP vào Neo4j Graph & Qdrant Vector DB."
              : "Enterprise ingestion pipelines: from local SME file watcher daemons to ERP datasets mapped into Neo4j & Qdrant."
          }
          badge={isVi ? "Module M1 · Phân quyền IT Admin" : "Module M1 · IT Admin Scope"}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={loadWatcherStatus}
              >
                {isVi ? "Làm mới Telemetry" : "Refresh Status"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                loading={isSimulatingDrop}
                onClick={handleSimulateDrop}
              >
                {isVi ? "Mô phỏng Thả tệp (Test Ingest)" : "Simulate File Drop"}
              </Button>
            </div>
          }
        />

        {/* ── PIPELINE OVERVIEW CARD ──────────────────────────── */}
        <Card padding="20px 24px">
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
            {isVi ? "Quy trình Thu nạp & Trích xuất Tri thức Doanh nghiệp (Ingestion Pipeline)" : "Enterprise Ingestion & Knowledge Extraction Pipeline"}
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
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100__, 300px), 1fr))",
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
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--r-md, 8px)",
                      background: c.iconBg,
                      color: c.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <ConnIcon size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1, #0F172A)", margin: 0 }}>
                        {c.name}
                      </h3>
                      <span style={{ fontSize: 11.5, color: "var(--text-4, #94A3B8)" }}>
                        {c.type}
                      </span>
                    </div>
                  </div>

                  <Badge variant={c.pillVariant}>
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

        {/* ── SECTION: RECENT LOCAL AGENT WATCHER INGESTION LOG ── */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FolderSync size={18} color="var(--primary, #2563EB)" />
              <span>{isVi ? "Nhật ký Nạp tệp Tự động từ AEGIS Local Watcher (Máy nhân viên SME)" : "Live Ingestion Stream from AEGIS Local File Watcher"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#059669", padding: "2px 8px", borderRadius: 999 }}>
                ● Webhook: /api/v1/sync/file-watcher
              </span>
            </div>
          }
          subtitle={
            isVi
              ? "Bất cứ khi nào nhân viên thả file vào thư mục máy tính, Agent ngầm lập tức đẩy tệp qua webhook và tự động trích xuất Graph & Vector."
              : "Whenever an employee drops documents into watched local folders, the agent triggers webhook ingestion and graph extraction."
          }
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={Play}
              loading={isSimulatingDrop}
              onClick={handleSimulateDrop}
            >
              {isVi ? "+ Bắn tệp Thử nghiệm" : "+ Simulate File Drop"}
            </Button>
          }
          padding="0"
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #F8FAFC)", borderBottom: "1px solid var(--border, #E2E8F0)", color: "var(--text-3, #64748B)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 18px" }}>{isVi ? "Thời gian" : "Timestamp"}</th>
                  <th style={{ padding: "12px 18px" }}>{isVi ? "Tên tệp đã nạp" : "File Name"}</th>
                  <th style={{ padding: "12px 18px" }}>{isVi ? "Phòng ban" : "Department"}</th>
                  <th style={{ padding: "12px 18px" }}>{isVi ? "Vector Qdrant" : "Vector Chunks"}</th>
                  <th style={{ padding: "12px 18px" }}>{isVi ? "Đồ thị Neo4j" : "Neo4j Graph"}</th>
                  <th style={{ padding: "12px 18px", textAlign: "center" }}>{isVi ? "Trạng thái" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {recentSyncs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px 20px", color: "var(--text-4, #94A3B8)" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <FolderSync size={24} style={{ opacity: 0.5 }} />
                        <span>{isVi ? "Chưa có sự kiện nạp tệp nào trong phiên này." : "No sync events recorded yet."}</span>
                        <span style={{ fontSize: 12 }}>
                          {isVi ? "Nhấn nút '+ Bắn tệp Thử nghiệm' phía trên hoặc đưa file vào Docker document volume '/data' để kiểm tra." : "Click '+ Simulate File Drop' above or place files into Docker document volume '/data'."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentSyncs.map((ev, idx) => (
                    <tr
                      key={ev.id || idx}
                      style={{
                        borderBottom: idx < recentSyncs.length - 1 ? "1px solid var(--border-subtle, #EDF2F7)" : "none",
                        background: idx === 0 ? "rgba(37,99,235,0.02)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 18px", fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--text-3, #64748B)" }}>
                        {ev.timestamp}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FileText size={16} color="var(--primary, #2563EB)" />
                          <span style={{ fontWeight: 600, color: "var(--text-1, #0F172A)" }}>{ev.fileName}</span>
                          <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--text-4, #94A3B8)" }}>({Math.round((ev.sizeBytes || 1024)/1024)} KB)</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--surface-3, #EDF2F7)", fontSize: 11.5, fontWeight: 600 }}>
                          {ev.department}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}>
                          ✓ {ev.chunksCount || 1} Vector Chunks (Qdrant)
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ color: "#2563EB", fontWeight: 600, fontSize: 12 }}>
                          ✓ {ev.entitiesExtracted || 3} Thực thể (Neo4j)
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.1)", color: "#059669", fontSize: 11, fontWeight: 700 }}>
                          <Check size={12} strokeWidth={2.5} />
                          {isVi ? "Đã Ingest" : "Ingested"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
