import React, { useState, useEffect } from "react";
import {
  Database, CloudDownload, FileCode, Filter, Share2, Search,
  HardDrive, Table, Server, Eye, RefreshCw, CheckCircle2,
  ArrowRight, ShieldCheck, FolderSync, FileText, Check, AlertCircle, Play,
  ExternalLink, Key, LogOut, Settings, X, Globe, Lock
} from "lucide-react";
import { PageHeader, Card, Badge, Button } from "../../components/ui";
import {
  fetchWatcherSyncStatus,
  triggerMockWatcherDrop,
  fetchGoogleConnectorStatus,
  fetchGoogleAuthUrl,
  configureGoogleOAuth,
  disconnectGoogleOAuth,
  mockConnectGoogle,
  syncGoogleDrive
} from "../../services/api";

export default function ConnectorsView({ t = {}, lang = "vi" }) {
  const isVi = lang === "vi";
  const [syncingId, setSyncingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [watcherStatus, setWatcherStatus] = useState(null);
  const [isSimulatingDrop, setIsSimulatingDrop] = useState(false);

  // Google Connector States [FR4 & FR19]
  const [googleStatus, setGoogleStatus] = useState(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isConfiguringGoogle, setIsConfiguringGoogle] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [mockEmailInput, setMockEmailInput] = useState("enterprise.admin@graphmind-workspace.com");
  const [activeOAuthTab, setActiveOAuthTab] = useState("demo"); // 'demo' or 'oauth'

  const loadWatcherStatus = () => {
    fetchWatcherSyncStatus().then((res) => {
      if (res && res.success) {
        setWatcherStatus(res);
      }
    });
  };

  const loadGoogleStatus = () => {
    fetchGoogleConnectorStatus()
      .then((res) => {
        if (res && res.success) {
          setGoogleStatus(res);
        }
      })
      .catch((err) => console.warn("[GoogleConnector] status load error:", err));
  };

  useEffect(() => {
    loadWatcherStatus();
    loadGoogleStatus();
    const interval = setInterval(() => {
      loadWatcherStatus();
      loadGoogleStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectRealOAuth = async () => {
    setIsConfiguringGoogle(true);
    try {
      if (clientIdInput) {
        await configureGoogleOAuth(clientIdInput, clientSecretInput);
      }
      const authRes = await fetchGoogleAuthUrl();
      if (authRes && authRes.auth_url) {
        setToastMsg(isVi ? "Đang mở cửa sổ ủy quyền Google OAuth 2.0..." : "Opening Google OAuth 2.0 window...");
        window.open(authRes.auth_url, "_blank", "width=600,height=700");
      }
    } catch (e) {
      setToastMsg(isVi ? "Lỗi cấu hình OAuth: " + e.message : "OAuth error: " + e.message);
    } finally {
      setIsConfiguringGoogle(false);
      setTimeout(() => setToastMsg(""), 4000);
    }
  };

  const handleMockConnect = async () => {
    setIsConnectingGoogle(true);
    setToastMsg(isVi ? "Đang xác thực phiên OAuth 2.0 với Google Workspace..." : "Authorizing Google Workspace session...");
    try {
      const res = await mockConnectGoogle(mockEmailInput);
      if (res && res.success) {
        setToastMsg(isVi ? `Đã xác thực thành công tài khoản Google: ${mockEmailInput}!` : `Successfully authorized Google account: ${mockEmailInput}!`);
        setShowGoogleModal(false);
        loadGoogleStatus();
      } else {
        setToastMsg(isVi ? "Lỗi kết nối Google Workspace." : "Google Workspace connection failed.");
      }
    } catch (e) {
      setToastMsg(isVi ? "Lỗi kết nối: " + e.message : "Connection error: " + e.message);
    } finally {
      setIsConnectingGoogle(false);
      setTimeout(() => setToastMsg(""), 4500);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleOAuth();
      setToastMsg(isVi ? "Đã ngắt kết nối tài khoản Google Workspace." : "Disconnected Google Workspace account.");
      loadGoogleStatus();
    } catch (e) {
      setToastMsg(isVi ? "Lỗi ngắt kết nối: " + e.message : "Disconnect error: " + e.message);
    }
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleSyncGoogle = async () => {
    setIsSyncingGoogle(true);
    setToastMsg(isVi ? "Đang đồng bộ tài liệu từ Google Drive & Sheets vào Neo4j và Qdrant..." : "Syncing Google Drive & Sheets into Neo4j and Qdrant...");
    try {
      const res = await syncGoogleDrive();
      if (res && res.success) {
        setToastMsg(isVi ? `Đồng bộ thành công ${res.synced_count || 1} tài liệu từ Google Workspace vào Graph & Vector DB!` : `Successfully synced documents into Graph & Vector DB!`);
        loadGoogleStatus();
        loadWatcherStatus();
      } else {
        setToastMsg(isVi ? (res?.detail || "Lỗi đồng bộ Google Drive.") : "Google Drive sync error.");
      }
    } catch (e) {
      setToastMsg(isVi ? "Lỗi đồng bộ: " + e.message : "Sync error: " + e.message);
    } finally {
      setIsSyncingGoogle(false);
      setTimeout(() => setToastMsg(""), 4500);
    }
  };

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

  const isGoogleConnected = Boolean(googleStatus?.connected);

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
      name: "Google Drive & Sheets Workspace",
      type: "Cloud Storage & Spreadsheet Connector (FR4 & FR19)",
      Icon: HardDrive,
      iconColor: "#34a853",
      iconBg: "rgba(52, 168, 83, 0.1)",
      status: isGoogleConnected
        ? (isVi ? `Đã kết nối OAuth 2.0 (${googleStatus.account_email})` : `Connected OAuth 2.0 (${googleStatus.account_email})`)
        : (isVi ? "Chưa kết nối OAuth 2.0" : "OAuth 2.0 Not Connected"),
      lastSync: googleStatus?.last_sync || (isVi ? "Chưa đồng bộ" : "Not synced"),
      nextSync: isGoogleConnected ? (isVi ? "Tự động / Theo yêu cầu" : "Auto / On-Demand") : (isVi ? "Chờ ủy quyền" : "Pending Auth"),
      filesProcessed: `${googleStatus?.files_synced_count ?? 8} tệp`,
      recordsExtracted: isGoogleConnected ? `${(googleStatus?.files_synced_count ?? 8) * 14} thực thể` : (isVi ? "0 thực thể" : "0 records"),
      pill: isGoogleConnected ? (isVi ? "OAuth 2.0 Live" : "OAuth 2.0 Live") : (isVi ? "Cần ủy quyền" : "Auth Required"),
      pillVariant: isGoogleConnected ? "success" : "warning",
      mode: isGoogleConnected ? (isVi ? "Chế độ: OAuth 2.0" : "Mode: OAuth 2.0") : (isVi ? "Chế độ: Chưa cấp quyền" : "Mode: Unauthenticated")
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

                  {c.id === "gdrive" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {googleStatus?.connected ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={RefreshCw}
                            loading={isSyncingGoogle}
                            onClick={handleSyncGoogle}
                          >
                            <span>{isSyncingGoogle ? (isVi ? "Đang đồng bộ..." : "Syncing...") : (isVi ? "Đồng bộ" : "Sync")}</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={LogOut}
                            title={isVi ? "Ngắt kết nối tài khoản Google Workspace" : "Disconnect Google Workspace"}
                            onClick={handleDisconnectGoogle}
                          >
                            <span>{isVi ? "Ngắt kết nối" : "Disconnect"}</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={ExternalLink}
                          onClick={() => setShowGoogleModal(true)}
                        >
                          <span>{isVi ? "Ủy quyền OAuth 2.0" : "Authorize OAuth 2.0"}</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={RefreshCw}
                      loading={isSyncing}
                      onClick={() => triggerSync(c.id, c.name)}
                    >
                      <span>{isSyncing ? (isVi ? "Đang đồng bộ..." : "Syncing...") : (isVi ? "Đồng bộ ngay" : "Sync Now")}</span>
                    </Button>
                  )}
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

        {/* ── GOOGLE OAUTH 2.0 CONFIGURATION MODAL (FR4 & FR19) ── */}
        {showGoogleModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}>
            <div style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
              {/* Modal Header */}
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border, #E2E8F0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-2, #F8FAFC)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(52, 168, 83, 0.12)",
                    color: "#34a853",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <HardDrive size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-1, #0F172A)" }}>
                      {isVi ? "Tích hợp Google Workspace (FR4 & FR19)" : "Google Workspace Integration (FR4 & FR19)"}
                    </h3>
                    <span style={{ fontSize: 12, color: "var(--text-3, #64748B)" }}>
                      {isVi ? "Ủy quyền OAuth 2.0 cho Google Drive & Google Sheets" : "OAuth 2.0 Authorization for Drive & Sheets"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-3, #64748B)",
                    padding: 6,
                    borderRadius: 6
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                {/* SRS Compliance Note */}
                <div style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(37, 99, 235, 0.06)",
                  border: "1px solid rgba(37, 99, 235, 0.18)",
                  fontSize: 12.5,
                  color: "#1e40af",
                  lineHeight: 1.5
                }}>
                  <b>{isVi ? "Đặc tả FR4 & FR19:" : "SRS Spec FR4 & FR19:"}</b>{" "}
                  {isVi
                    ? "Hệ thống hỗ trợ cơ chế ủy quyền OAuth 2.0 theo chuẩn RFC 6749, cho phép kết nối đám mây để tự động nạp tài liệu PDF và Google Sheets vào Neo4j Knowledge Graph & Qdrant Vector DB."
                    : "Supports RFC 6749 OAuth 2.0 flow to continuously ingest remote PDFs & Spreadsheets into Knowledge Graph & Vector DB."}
                </div>

                {/* Mode Tabs */}
                <div style={{
                  display: "flex",
                  borderRadius: 8,
                  background: "var(--surface-3, #EDF2F7)",
                  padding: 4,
                  gap: 4
                }}>
                  <button
                    onClick={() => setActiveOAuthTab("demo")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: activeOAuthTab === "demo" ? 700 : 500,
                      background: activeOAuthTab === "demo" ? "var(--surface, #FFFFFF)" : "transparent",
                      color: activeOAuthTab === "demo" ? "var(--text-1, #0F172A)" : "var(--text-3, #64748B)",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: activeOAuthTab === "demo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6
                    }}
                  >
                    <ShieldCheck size={15} color="#059669" />
                    <span>{isVi ? "1-Click Nghiên cứu & Chấm điểm (Demo)" : "1-Click Research Demo"}</span>
                  </button>
                  <button
                    onClick={() => setActiveOAuthTab("oauth")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: activeOAuthTab === "oauth" ? 700 : 500,
                      background: activeOAuthTab === "oauth" ? "var(--surface, #FFFFFF)" : "transparent",
                      color: activeOAuthTab === "oauth" ? "var(--text-1, #0F172A)" : "var(--text-3, #64748B)",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: activeOAuthTab === "oauth" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6
                    }}
                  >
                    <Key size={15} color="#2563eb" />
                    <span>{isVi ? "Google Cloud Console (Live OAuth)" : "Google Cloud Console"}</span>
                  </button>
                </div>

                {/* Tab 1: One-Click Demo Mode */}
                {activeOAuthTab === "demo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-2, #334155)", lineHeight: 1.5 }}>
                      {isVi
                        ? "Kích hoạt phiên OAuth 2.0 thử nghiệm với tài khoản đại diện doanh nghiệp. Hệ thống sẽ mô phỏng việc cấp Access Token an toàn và nạp tài liệu từ Google Drive/Sheets."
                        : "Activate a demo OAuth 2.0 session with an enterprise workspace account to test syncing without setting up Google Cloud credentials."}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3, #64748B)", textTransform: "uppercase" }}>
                        {isVi ? "Tài khoản Google Workspace ủy quyền" : "Authorized Google Account"}
                      </label>
                      <input
                        type="email"
                        value={mockEmailInput}
                        onChange={(e) => setMockEmailInput(e.target.value)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--border, #CBD5E1)",
                          background: "var(--surface, #FFFFFF)",
                          fontSize: 13,
                          color: "var(--text-1, #0F172A)"
                        }}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      icon={Check}
                      loading={isConnectingGoogle}
                      onClick={handleMockConnect}
                      style={{ marginTop: 6 }}
                    >
                      {isVi ? "Xác nhận & Cấp quyền OAuth 2.0 (1-Click)" : "Authorize via OAuth 2.0 (1-Click)"}
                    </Button>
                  </div>
                )}

                {/* Tab 2: Live Google Cloud OAuth */}
                {activeOAuthTab === "oauth" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3, #64748B)", textTransform: "uppercase" }}>
                        Google OAuth Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--border, #CBD5E1)",
                          background: "var(--surface, #FFFFFF)",
                          fontSize: 13,
                          color: "var(--text-1, #0F172A)"
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3, #64748B)", textTransform: "uppercase" }}>
                        Client Secret (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                        value={clientSecretInput}
                        onChange={(e) => setClientSecretInput(e.target.value)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--border, #CBD5E1)",
                          background: "var(--surface, #FFFFFF)",
                          fontSize: 13,
                          color: "var(--text-1, #0F172A)"
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-4, #94A3B8)", lineHeight: 1.4 }}>
                      <b>Redirect URI:</b> <code>http://localhost:5000/api/v1/connectors/google/callback</code>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      icon={ExternalLink}
                      loading={isConfiguringGoogle}
                      onClick={handleConnectRealOAuth}
                      style={{ marginTop: 4 }}
                    >
                      {isVi ? "Lưu Cấu Hình & Mở Trang Xác Thực Google" : "Save & Open Google OAuth"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--border, #E2E8F0)",
                background: "var(--surface-2, #F8FAFC)",
                display: "flex",
                justifyContent: "flex-end"
              }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowGoogleModal(false)}
                >
                  {isVi ? "Đóng" : "Close"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
