import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Server, HardDrive, RefreshCw, Plus, ShieldAlert,
  Clock, CheckCircle2, AlertTriangle, XCircle, Copy, Check,
  Laptop, Cpu, Folder, Search, ArrowRight, X, KeyRound, Play
} from "lucide-react";
import {
  Card, Badge, Button, SearchInput, Alert
} from "../../../components/ui";
import {
  fetchWorkstationsList,
  registerWorkstation,
  rotateWorkstationToken,
  changeSyncMode,
  cancelPendingSyncMode,
  seedDemoWorkstations
} from "./workstationsApi";

export default function WorkstationsPanel({ lang = "vi", showToast = () => {} }) {
  const isVi = lang === "vi";

  // Data states
  const [loading, setLoading] = useState(true);
  const [workstations, setWorkstations] = useState([]);
  const [summary, setSummary] = useState({
    total_workstations: 0,
    online_count: 0,
    offline_count: 0,
    total_files_ingested: 0,
    total_records_extracted: 0,
    total_checksum_errors: 0,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ONLINE, OFFLINE, PENDING

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    id: "",
    hostname: "",
    ip_address: "",
    os_info: "Windows 11 Pro 64-bit",
    monitored_folder: "D:/AEGIS_Data/Sales_Contracts",
    sync_mode: "realtime",
    schedule_type: "15m",
    shift_end_time: "17:30",
  });
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  // Token Reveal Modal (shown ONCE only)
  const [revealedTokenData, setRevealedTokenData] = useState(null); // { id, hostname, token, isNew }
  const [hasCopiedToken, setHasCopiedToken] = useState(false);

  // Sync Mode Change Modal
  const [activeSyncModeModal, setActiveSyncModeModal] = useState(null); // workstation item
  const [syncModeForm, setSyncModeForm] = useState({
    sync_mode: "realtime",
    schedule_type: "15m",
    shift_end_time: "17:30",
  });
  const [isSubmittingSyncMode, setIsSubmittingSyncMode] = useState(false);

  // Load workstations data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchWorkstationsList();
      if (res && res.success) {
        setWorkstations(res.workstations || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      if (!silent) {
        showToast(err.message || "Không thể tải danh sách máy trạm", "err");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    // Polling every 10 seconds for real-time heartbeat updates
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle register workstation
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.id.trim() || !registerForm.hostname.trim() || !registerForm.ip_address.trim()) {
      showToast("Vui lòng điền đầy đủ Mã ID, Hostname và Địa chỉ IP", "err");
      return;
    }
    setIsSubmittingRegister(true);
    try {
      const payload = {
        id: registerForm.id.trim(),
        hostname: registerForm.hostname.trim(),
        ip_address: registerForm.ip_address.trim(),
        os_info: registerForm.os_info.trim(),
        monitored_folder: registerForm.monitored_folder.trim(),
        sync_mode: registerForm.sync_mode,
        schedule_type: registerForm.sync_mode === "scheduled" ? registerForm.schedule_type : null,
        shift_end_time: registerForm.sync_mode === "scheduled" && registerForm.schedule_type === "end_of_shift" ? registerForm.shift_end_time : null,
      };
      const res = await registerWorkstation(payload);
      showToast("Đăng ký máy trạm thành công!");
      setShowRegisterModal(false);
      setRevealedTokenData({
        id: res.id,
        hostname: res.hostname,
        token: res.agent_token,
        isNew: true,
      });
      loadData();
    } catch (err) {
      showToast(err.message, "err");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // Handle rotate token
  const handleRotateToken = async (ws) => {
    if (!window.confirm(`Bạn có chắc muốn cấp mới Token cho máy trạm "${ws.hostname}" (${ws.id})? Token cũ sẽ lập tức mất hiệu lực!`)) {
      return;
    }
    try {
      const res = await rotateWorkstationToken(ws.id);
      showToast("Đã cấp mới Token thành công!");
      setRevealedTokenData({
        id: res.id,
        hostname: ws.hostname,
        token: res.new_agent_token,
        isNew: false,
      });
      loadData();
    } catch (err) {
      showToast(err.message, "err");
    }
  };

  // Handle open sync mode modal
  const handleOpenSyncModeModal = (ws) => {
    setActiveSyncModeModal(ws);
    setSyncModeForm({
      sync_mode: ws.target_sync_mode || ws.sync_mode || "realtime",
      schedule_type: ws.target_schedule_type || ws.schedule_type || "15m",
      shift_end_time: ws.target_shift_end_time || ws.shift_end_time || "17:30",
    });
  };

  // Handle submit sync mode change
  const handleSubmitSyncMode = async () => {
    if (!activeSyncModeModal) return;
    setIsSubmittingSyncMode(true);
    try {
      const payload = {
        sync_mode: syncModeForm.sync_mode,
        schedule_type: syncModeForm.sync_mode === "scheduled" ? syncModeForm.schedule_type : null,
        shift_end_time: syncModeForm.sync_mode === "scheduled" && syncModeForm.schedule_type === "end_of_shift" ? syncModeForm.shift_end_time : null,
      };
      const res = await changeSyncMode(activeSyncModeModal.id, payload);
      showToast(res.message || "Đã gửi lệnh đổi Sync Mode");
      setActiveSyncModeModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, "err");
    } finally {
      setIsSubmittingSyncMode(false);
    }
  };

  // Handle cancel pending sync mode
  const handleCancelPending = async (ws) => {
    if (!window.confirm(`Hủy lệnh đổi Sync Mode đang chờ áp dụng trên máy "${ws.hostname}"?`)) {
      return;
    }
    try {
      const res = await cancelPendingSyncMode(ws.id);
      showToast(res.message || "Đã hủy lệnh chuyển đổi Sync Mode");
      loadData();
    } catch (err) {
      showToast(err.message, "err");
    }
  };

  // Handle seed demo
  const handleSeedDemo = async () => {
    try {
      const res = await seedDemoWorkstations();
      showToast(res.message || "Đã nạp 3 máy trạm demo thành công");
      loadData();
    } catch (err) {
      showToast(err.message, "err");
    }
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!revealedTokenData?.token) return;
    navigator.clipboard.writeText(revealedTokenData.token);
    setHasCopiedToken(true);
    showToast("Đã sao chép Token vào bộ nhớ tạm");
    setTimeout(() => setHasCopiedToken(false), 2500);
  };

  // Filtered list
  const filteredWorkstations = useMemo(() => {
    return workstations.filter((ws) => {
      // Status filter
      if (statusFilter === "ONLINE" && !ws.is_online) return false;
      if (statusFilter === "OFFLINE" && ws.is_online) return false;
      if (statusFilter === "PENDING" && ws.sync_mode_status === "applied") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ws.hostname?.toLowerCase().includes(q);
        const matchId = ws.id?.toLowerCase().includes(q);
        const matchIp = ws.ip_address?.toLowerCase().includes(q);
        const matchFolder = ws.monitored_folder?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchIp && !matchFolder) return false;
      }
      return true;
    });
  }, [workstations, statusFilter, searchQuery]);

  // Format last seen timestamp
  const formatLastSeen = (ts, isOnline) => {
    if (!ts) return isVi ? "Chưa kết nối bao giờ" : "Never connected";
    const date = new Date(ts);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));
    if (isOnline) {
      if (diffSeconds < 10) return isVi ? "Vừa xong (Vài giây trước)" : "Just now";
      return isVi ? `${diffSeconds} giây trước` : `${diffSeconds}s ago`;
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return isVi ? `${diffMinutes} phút trước` : `${diffMinutes}m ago`;
    return date.toLocaleString(isVi ? "vi-VN" : "en-US", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "14px"
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
          boxShadow: "var(--shadow-xs)"
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
            {isVi ? "Tổng số Máy trạm" : "Total Workstations"}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-1)" }}>
              {summary.total_workstations}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>{isVi ? "máy" : "units"}</span>
          </div>
          <div style={{ fontSize: 12, display: "flex", gap: 12, marginTop: 4 }}>
            <span style={{ color: "#10b981", fontWeight: 600 }}>🟢 {summary.online_count} Online</span>
            <span style={{ color: "var(--text-4)" }}>⚪ {summary.offline_count} Offline</span>
          </div>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
          boxShadow: "var(--shadow-xs)"
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
            {isVi ? "Tệp nạp thành công" : "Files Ingested"}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#2563eb" }}>
              {Number(summary.total_files_ingested).toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>{isVi ? "tệp" : "files"}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {isVi ? "Đã xác thực SHA-256" : "SHA-256 Verified"}
          </span>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
          boxShadow: "var(--shadow-xs)"
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
            {isVi ? "Bản ghi trích xuất" : "Records Extracted"}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed" }}>
              {Number(summary.total_records_extracted).toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>{isVi ? "bản ghi" : "records"}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {isVi ? "Vào Neo4j & Qdrant" : "Into Neo4j & Qdrant"}
          </span>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
          boxShadow: "var(--shadow-xs)"
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
            {isVi ? "Lỗi Checksum" : "Checksum Errors"}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{
              fontSize: 28, fontWeight: 700,
              color: summary.total_checksum_errors > 0 ? "var(--red)" : "var(--text-1)"
            }}>
              {summary.total_checksum_errors}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>{isVi ? "lỗi" : "errors"}</span>
          </div>
          <span style={{ fontSize: 12, color: summary.total_checksum_errors > 0 ? "var(--red)" : "#10b981" }}>
            {summary.total_checksum_errors > 0 ? (isVi ? "⚠️ Có tệp lỗi toàn vẹn" : "⚠️ Integrity faults") : (isVi ? "✓ Toàn vẹn 100%" : "✓ 100% Integrity")}
          </span>
        </div>
      </div>

      {/* ── MAIN WORKSTATIONS TABLE CARD ─────────────────────────────────── */}
      <Card
        title={isVi ? "Danh mục Máy trạm & Đại lý Biên AEGIS" : "AEGIS Workstations & Edge Agents"}
        subtitle={isVi ? "Giám sát thời gian thực, điều khiển chế độ đồng bộ và kiểm toán tệp" : "Realtime monitoring, sync mode control & audit metrics"}
        icon={Server}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDemo}
              style={{ fontSize: 12, gap: 6 }}
              title="Chỉ khả dụng trong môi trường dev"
            >
              <Play size={13} /> {isVi ? "Nạp Demo" : "Seed Demo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              style={{ fontSize: 12, gap: 6 }}
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} /> {isVi ? "Làm mới" : "Refresh"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRegisterModal(true)}
              style={{ fontSize: 12, gap: 6 }}
            >
              <Plus size={14} /> {isVi ? "Đăng ký Máy trạm" : "Register Workstation"}
            </Button>
          </div>
        }
      >
        {/* Filter bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: isVi ? "Tất cả máy trạm" : "All Workstations" },
              { id: "ONLINE", label: isVi ? "🟢 Đang trực tuyến" : "🟢 Online" },
              { id: "OFFLINE", label: isVi ? "⚪ Đang ngoại tuyến" : "⚪ Offline" },
              { id: "PENDING", label: isVi ? "⏳ Đang chờ áp dụng" : "⏳ Pending ACK" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: statusFilter === tab.id ? "1px solid #2563eb" : "1px solid var(--border)",
                  background: statusFilter === tab.id ? "rgba(37, 99, 235, 0.1)" : "var(--surface)",
                  color: statusFilter === tab.id ? "#2563eb" : "var(--text-3)",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ width: 280, maxWidth: "100%" }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isVi ? "Tìm theo Hostname, IP, thư mục..." : "Search hostname, IP, folder..."}
            />
          </div>
        </div>

        {/* Workstations Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
                textAlign: "left",
                color: "var(--text-3)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                <th style={{ padding: "12px 14px", width: 130 }}>{isVi ? "Trạng thái" : "Status"}</th>
                <th style={{ padding: "12px 14px" }}>{isVi ? "Máy trạm / Hostname" : "Workstation / Host"}</th>
                <th style={{ padding: "12px 14px" }}>{isVi ? "Thư mục giám sát" : "Monitored Folder"}</th>
                <th style={{ padding: "12px 14px", width: 260 }}>{isVi ? "Chế độ Đồng bộ (Sync Mode)" : "Sync Mode Control"}</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>{isVi ? "Thống kê nạp" : "Sync Stats"}</th>
                <th style={{ padding: "12px 14px", textAlign: "center", width: 90 }}>{isVi ? "Thao tác" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading && workstations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
                    <RefreshCw className="spin" size={20} style={{ margin: "0 auto 8px" }} />
                    <div>{isVi ? "Đang tải dữ liệu máy trạm..." : "Loading workstations..."}</div>
                  </td>
                </tr>
              ) : filteredWorkstations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
                    {isVi ? "Không tìm thấy máy trạm nào phù hợp điều kiện lọc." : "No workstations matching filter."}
                  </td>
                </tr>
              ) : (
                filteredWorkstations.map((ws) => (
                  <tr
                    key={ws.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s ease",
                      background: ws.is_online ? "transparent" : "rgba(0,0,0,0.01)"
                    }}
                  >
                    {/* Status badge */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            width: 9, height: 9, borderRadius: "50%",
                            background: ws.is_online ? "#10b981" : "#94a3b8",
                            boxShadow: ws.is_online ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
                            display: "inline-block"
                          }} />
                          <strong style={{
                            fontSize: 12,
                            color: ws.is_online ? "#059669" : "var(--text-3)"
                          }}>
                            {ws.is_online ? "Online" : "Offline"}
                          </strong>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-4)" }} title={ws.last_heartbeat_at || ""}>
                          {formatLastSeen(ws.last_heartbeat_at, ws.is_online)}
                        </span>
                      </div>
                    </td>

                    {/* Machine info */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ color: "var(--text-1)", fontSize: 13 }}>{ws.hostname}</strong>
                          {ws.is_demo && (
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", fontWeight: 600
                            }}>
                              DEMO
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-3)" }}>
                          <span>IP: <code style={{ color: "var(--text-2)" }}>{ws.ip_address}</code></span>
                          <span>•</span>
                          <span>{ws.os_info}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-4)" }}>ID: {ws.id}</div>
                      </div>
                    </td>

                    {/* Monitored folder */}
                    <td style={{ padding: "14px" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "var(--surface-2)", padding: "4px 8px", borderRadius: "var(--r-sm)",
                        border: "1px solid var(--border)", fontSize: 11, color: "var(--text-2)",
                        maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>
                        <Folder size={12} style={{ flexShrink: 0, color: "#2563eb" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={ws.monitored_folder}>
                          {ws.monitored_folder}
                        </span>
                      </div>
                    </td>

                    {/* Sync Mode Control */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontWeight: 600, fontSize: 12,
                            color: ws.sync_mode === "realtime" ? "#2563eb" : "#7c3aed"
                          }}>
                            {ws.sync_mode === "realtime" ? "⚡ Real-time Watchdog" : `⏱ Scheduled (${ws.schedule_type || "15m"})`}
                          </span>
                          <button
                            onClick={() => handleOpenSyncModeModal(ws)}
                            style={{
                              background: "none", border: "1px solid var(--border)",
                              borderRadius: "var(--r-sm)", padding: "2px 8px", fontSize: 11,
                              color: "var(--text-2)", cursor: "pointer"
                            }}
                          >
                            {isVi ? "Đổi" : "Edit"}
                          </button>
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {ws.sync_mode_status === "applied" && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 10, padding: "2px 7px", borderRadius: 10,
                              background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 600
                            }}>
                              <Check size={11} /> {isVi ? "Đã áp dụng" : "Applied"}
                            </span>
                          )}

                          {ws.sync_mode_status === "pending" && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 10, padding: "2px 7px", borderRadius: 10,
                              background: "rgba(245, 158, 11, 0.14)", color: "#b45309", fontWeight: 600
                            }}>
                              <Clock size={11} className="spin" /> {isVi ? "Đang chờ áp dụng" : "Pending ACK"}
                            </span>
                          )}

                          {ws.sync_mode_status === "pending_offline" && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 10, padding: "2px 7px", borderRadius: 10,
                              background: "rgba(239, 68, 68, 0.12)", color: "#b91c1c", fontWeight: 600
                            }}>
                              <AlertTriangle size={11} /> {isVi ? "Chờ máy online" : "Waiting Online"}
                            </span>
                          )}

                          {/* Cancel pending button */}
                          {ws.sync_mode_status !== "applied" && (
                            <button
                              onClick={() => handleCancelPending(ws)}
                              style={{
                                background: "none", border: "none", color: "var(--red)",
                                fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0
                              }}
                            >
                              {isVi ? "Hủy lệnh" : "Cancel"}
                            </button>
                          )}
                        </div>

                        {/* Show target details if pending */}
                        {ws.target_sync_mode && ws.sync_mode_status !== "applied" && (
                          <div style={{ fontSize: 10, color: "var(--text-3)", fontStyle: "italic" }}>
                            ↳ Mục tiêu: {ws.target_sync_mode} {ws.target_schedule_type ? `(${ws.target_schedule_type})` : ""}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Stats */}
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: 12 }}>
                          {Number(ws.files_ingested_total || 0).toLocaleString()} {isVi ? "tệp" : "files"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {Number(ws.records_extracted_total || 0).toLocaleString()} records
                        </span>
                        {ws.checksum_errors_total > 0 ? (
                          <span style={{
                            fontSize: 10, padding: "1px 5px", borderRadius: 4,
                            background: "rgba(239, 68, 68, 0.12)", color: "var(--red)", fontWeight: 600
                          }}>
                            {ws.checksum_errors_total} {isVi ? "lỗi checksum" : "errors"}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "#10b981" }}>0 lỗi checksum</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotateToken(ws)}
                        title={isVi ? "Cấp lại Token xác thực" : "Rotate Token"}
                        style={{ padding: "6px 8px" }}
                      >
                        <KeyRound size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── MODAL 1: REGISTER WORKSTATION ─────────────────────────────────── */}
      {showRegisterModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)", padding: "28px 32px", width: 480, maxWidth: "90vw",
            boxShadow: "var(--shadow-xl)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)" }}>
                {isVi ? "Đăng ký Máy trạm / AEGIS Agent Mới" : "Register New Workstation Agent"}
              </span>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 20 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                  Mã định danh máy trạm (Workstation ID) *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: WS-SALES-HN02"
                  value={registerForm.id}
                  onChange={(e) => setRegisterForm({ ...registerForm, id: e.target.value })}
                  required
                  style={{
                    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                    Hostname *
                  </label>
                  <input
                    type="text"
                    placeholder="sales-desktop.local"
                    value={registerForm.hostname}
                    onChange={(e) => setRegisterForm({ ...registerForm, hostname: e.target.value })}
                    required
                    style={{
                      width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                      border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                      color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                    Địa chỉ IP *
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.15"
                    value={registerForm.ip_address}
                    onChange={(e) => setRegisterForm({ ...registerForm, ip_address: e.target.value })}
                    required
                    style={{
                      width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                      border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                      color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                  Hệ điều hành (OS)
                </label>
                <select
                  value={registerForm.os_info}
                  onChange={(e) => setRegisterForm({ ...registerForm, os_info: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                  }}
                >
                  <option value="Windows 11 Pro 64-bit">Windows 11 Pro 64-bit</option>
                  <option value="Windows 10 Pro 64-bit">Windows 10 Pro 64-bit</option>
                  <option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</option>
                  <option value="macOS Sonoma 14.5">macOS Sonoma 14.5</option>
                  <option value="Debian 12 Bookworm">Debian 12 Bookworm</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                  Thư mục cục bộ giám sát *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: D:/AEGIS_Data/Sales hoặc /data/legal"
                  value={registerForm.monitored_folder}
                  onChange={(e) => setRegisterForm({ ...registerForm, monitored_folder: e.target.value })}
                  required
                  style={{
                    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                  Chế độ đồng bộ ban đầu (Sync Mode)
                </label>
                <select
                  value={registerForm.sync_mode}
                  onChange={(e) => setRegisterForm({ ...registerForm, sync_mode: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                  }}
                >
                  <option value="realtime">⚡ Real-time Watchdog (Đồng bộ ngay khi tệp thay đổi)</option>
                  <option value="scheduled">⏱ Scheduled Sync (Đồng bộ theo chu kỳ)</option>
                </select>
              </div>

              {registerForm.sync_mode === "scheduled" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                      Chu kỳ (Schedule)
                    </label>
                    <select
                      value={registerForm.schedule_type}
                      onChange={(e) => setRegisterForm({ ...registerForm, schedule_type: e.target.value })}
                      style={{
                        width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                        border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                        color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                      }}
                    >
                      <option value="15m">Mỗi 15 phút</option>
                      <option value="1h">Mỗi 1 giờ</option>
                      <option value="end_of_shift">Cuối ca làm việc</option>
                    </select>
                  </div>
                  {registerForm.schedule_type === "end_of_shift" && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                        Giờ kết thúc ca (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={registerForm.shift_end_time}
                        onChange={(e) => setRegisterForm({ ...registerForm, shift_end_time: e.target.value })}
                        required
                        style={{
                          width: "100%", padding: "8px 12px", background: "var(--surface-2)",
                          border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                          color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowRegisterModal(false)}>
                  {isVi ? "Hủy" : "Cancel"}
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmittingRegister}>
                  {isSubmittingRegister ? "Đang xử lý..." : (isVi ? "Tạo và Sinh Token" : "Create & Generate Token")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TOKEN REVEAL (SHOWN ONCE ONLY) ───────────────────────── */}
      {revealedTokenData && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 220,
          background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)", padding: "28px 32px", width: 500, maxWidth: "90vw",
            boxShadow: "var(--shadow-xl)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981"
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)" }}>
                  {revealedTokenData.isNew ? "Đăng ký Máy trạm Thành công" : "Cấp mới Token Thành công"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {revealedTokenData.hostname} ({revealedTokenData.id})
                </div>
              </div>
            </div>

            <div style={{
              background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "var(--r-sm)", padding: "10px 14px", fontSize: 12, color: "#b45309",
              marginBottom: 16, lineHeight: 1.5
            }}>
              <strong>⚠️ LƯU Ý BẢO MẬT:</strong> Mã Token bên dưới chỉ hiển thị <strong>DUY NHẤT MỘT LẦN</strong>. Cơ sở dữ liệu chỉ lưu trữ bản băm mã hóa SHA-256. Hãy sao chép và cấu hình ngay vào file <code>.env</code> của máy trạm.
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
                Mã bí mật xác thực (Agent Token)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={revealedTokenData.token}
                  style={{
                    flex: 1, padding: "10px 12px", background: "var(--surface-2)",
                    border: "1px solid #2563eb", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13, fontFamily: "monospace",
                    fontWeight: 600, boxSizing: "border-box"
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyToken}
                  style={{ gap: 6, flexShrink: 0 }}
                >
                  {hasCopiedToken ? <Check size={14} /> : <Copy size={14} />}
                  {hasCopiedToken ? "Đã chép" : "Sao chép"}
                </Button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealedTokenData(null)}
              >
                {isVi ? "Tôi đã lưu Token — Đóng" : "I have saved Token — Close"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT SYNC MODE ───────────────────────────────────────── */}
      {activeSyncModeModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)", padding: "26px 30px", width: 440, maxWidth: "90vw",
            boxShadow: "var(--shadow-xl)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)" }}>
                  {isVi ? "Chuyển Chế độ Đồng bộ" : "Change Sync Mode"}
                </span>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                  {activeSyncModeModal.hostname} ({activeSyncModeModal.id})
                </div>
              </div>
              <button
                onClick={() => setActiveSyncModeModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 20 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
                  Chọn Chế độ (Sync Mode)
                </label>
                <select
                  value={syncModeForm.sync_mode}
                  onChange={(e) => setSyncModeForm({ ...syncModeForm, sync_mode: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                    color: "var(--text-1)", fontSize: 13
                  }}
                >
                  <option value="realtime">⚡ Real-time Watchdog (Đồng bộ ngay khi tệp thay đổi)</option>
                  <option value="scheduled">⏱ Scheduled Sync (Đồng bộ theo lịch trình)</option>
                </select>
              </div>

              {syncModeForm.sync_mode === "scheduled" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
                      Chu kỳ lặp lại (Schedule Interval)
                    </label>
                    <select
                      value={syncModeForm.schedule_type}
                      onChange={(e) => setSyncModeForm({ ...syncModeForm, schedule_type: e.target.value })}
                      style={{
                        width: "100%", padding: "9px 12px", background: "var(--surface-2)",
                        border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                        color: "var(--text-1)", fontSize: 13
                      }}
                    >
                      <option value="15m">Định kỳ mỗi 15 phút</option>
                      <option value="1h">Định kỳ mỗi 1 giờ</option>
                      <option value="end_of_shift">Cuối ca làm việc</option>
                    </select>
                  </div>

                  {syncModeForm.schedule_type === "end_of_shift" && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
                        Giờ kết thúc ca làm việc (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={syncModeForm.shift_end_time}
                        onChange={(e) => setSyncModeForm({ ...syncModeForm, shift_end_time: e.target.value })}
                        required
                        style={{
                          width: "100%", padding: "8px 12px", background: "var(--surface-2)",
                          border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                          color: "var(--text-1)", fontSize: 13, boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{
                background: "var(--surface-2)", padding: "10px 12px", borderRadius: "var(--r-sm)",
                fontSize: 12, color: "var(--text-3)", lineHeight: 1.5
              }}>
                ℹ️ <strong>Cơ chế 2 pha:</strong> Lệnh sẽ chuyển sang trạng thái <em>"Đang chờ áp dụng"</em> (hoặc <em>"Chờ máy online"</em> nếu máy offline). Khi Agent phản hồi xác nhận ACK thành công, trạng thái mới chính thức hiển thị <em>"Đã áp dụng"</em>.
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <Button variant="ghost" size="sm" onClick={() => setActiveSyncModeModal(null)}>
                  {isVi ? "Hủy" : "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitSyncMode}
                  disabled={isSubmittingSyncMode}
                >
                  {isSubmittingSyncMode ? "Đang gửi..." : (isVi ? "Áp dụng cấu hình" : "Apply Command")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

