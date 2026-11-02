import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, CheckCircle2, XCircle, Eye, Clock,
  Filter, RefreshCw, AlertCircle, Search, ShieldAlert,
  FileSpreadsheet, FileCode, Check, X, Building2, User
} from "lucide-react";
import {
  fetchUploadApprovals,
  approveUploadRequest,
  rejectUploadRequest,
  previewUploadRequest,
} from "./adminApi";
import { Badge, Button, Card, SearchInput } from "../../components/ui";

const DEPT_LABELS = {
  ALL: "Tất cả phòng ban",
  LEGAL: "Pháp chế (Legal)",
  SALES: "Kinh doanh (Sales)",
  ACCOUNTING_PROCUREMENT: "Kế toán / Thu mua",
  IT: "Công nghệ / IT",
  RND: "R&D",
};

export default function PendingApprovalsPanel({ lang = "vi", showToast = () => {}, onPendingCountChange = () => {} }) {
  const isVi = lang === "vi";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [previewItem, setPreviewItem] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const [approvingId, setApprovingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUploadApprovals({
        status: statusFilter,
        department: deptFilter,
      });
      if (res && res.success) {
        setItems(res.items || []);
        onPendingCountChange(res.pending_count || 0);
      } else {
        setItems([]);
      }
    } catch (err) {
      showToast(err.message || "Không thể tải danh sách phê duyệt tài liệu", "err");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, onPendingCountChange, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered by search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (it) =>
        (it.file_name && it.file_name.toLowerCase().includes(term)) ||
        (it.uploaded_by_email && it.uploaded_by_email.toLowerCase().includes(term)) ||
        (it.resource_type && it.resource_type.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "PENDING").length;
    const approved = items.filter((i) => i.status === "APPROVED").length;
    const rejected = items.filter((i) => i.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [items]);

  // Handle Approve
  const handleApprove = async (item) => {
    if (!window.confirm(`Xác nhận phê duyệt và nạp tài liệu "${item.file_name}" vào Kho tri thức?`)) {
      return;
    }
    setApprovingId(item.id);
    try {
      const res = await approveUploadRequest(item.id);
      if (res && res.success) {
        showToast(`✓ Đã phê duyệt và nạp thành công: ${item.file_name}`, "ok");
        await loadData();
      } else {
        showToast(res?.error || "Phê duyệt thất bại", "err");
      }
    } catch (err) {
      showToast(err.message || "Lỗi phê duyệt", "err");
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Open Preview
  const handleOpenPreview = async (item) => {
    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewContent("");
    try {
      const res = await previewUploadRequest(item.id);
      if (res && res.success) {
        setPreviewContent(res.preview_text || "Không có bản xem trước văn bản.");
      } else {
        setPreviewContent("Không thể tải bản xem trước.");
      }
    } catch (err) {
      setPreviewContent("Lỗi khi tải nội dung tệp: " + (err.message || "Lỗi mạng"));
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Open Reject Modal
  const handleOpenReject = (item) => {
    setRejectingItem(item);
    setRejectReason("Tài liệu không khớp định dạng chuẩn hoặc chưa đầy đủ căn cứ pháp lý / nghiệp vụ.");
  };

  // Handle Submit Reject
  const handleSubmitReject = async () => {
    if (!rejectingItem) return;
    setRejectLoading(true);
    try {
      const res = await rejectUploadRequest(rejectingItem.id, rejectReason);
      if (res && res.success) {
        showToast(`Đã từ chối tài liệu: ${rejectingItem.file_name}`, "ok");
        setRejectingItem(null);
        await loadData();
      } else {
        showToast(res?.error || "Từ chối thất bại", "err");
      }
    } catch (err) {
      showToast(err.message || "Lỗi từ chối", "err");
    } finally {
      setRejectLoading(false);
    }
  };

  // File Icon helper
  const renderFileIcon = (fileType, fileName = "") => {
    const ext = (fileType || fileName.split(".").pop() || "").toUpperCase();
    if (ext === "PDF") {
      return (
        <div style={{
          width: 34, height: 34, borderRadius: "var(--r-sm)",
          background: "rgba(239, 68, 68, 0.12)", color: "#dc2626",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <FileText size={18} />
        </div>
      );
    }
    if (ext === "CSV") {
      return (
        <div style={{
          width: 34, height: 34, borderRadius: "var(--r-sm)",
          background: "rgba(16, 185, 129, 0.12)", color: "#059669",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <FileSpreadsheet size={18} />
        </div>
      );
    }
    return (
      <div style={{
        width: 34, height: 34, borderRadius: "var(--r-sm)",
        background: "rgba(59, 130, 246, 0.12)", color: "#2563eb",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <FileCode size={18} />
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: "12px",
            background: "rgba(245, 158, 11, 0.12)", color: "#d97706",
            fontSize: 12, fontWeight: 600, border: "1px solid rgba(245, 158, 11, 0.25)"
          }}>
            <Clock size={12} /> Chờ duyệt
          </span>
        );
      case "APPROVED":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.12)", color: "#059669",
            fontSize: 12, fontWeight: 600, border: "1px solid rgba(16, 185, 129, 0.25)"
          }}>
            <CheckCircle2 size={12} /> Đã phê duyệt
          </span>
        );
      case "REJECTED":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.12)", color: "#dc2626",
            fontSize: 12, fontWeight: 600, border: "1px solid rgba(239, 68, 68, 0.25)"
          }}>
            <XCircle size={12} /> Bị từ chối
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Stats Banner */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)", color: "#dc2626",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>
              Đang Chờ Phê Duyệt
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>
              {stats.pending}
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.12)", color: "#059669",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>
              Đã Nạp Kho Tri Thức
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>
              {stats.approved}
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(100, 116, 139, 0.12)", color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>
              Tổng Tệp Gửi Lên
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)" }}>
              {stats.total}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter & Search */}
      <Card style={{ padding: "16px 20px" }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "space-between",
          alignItems: "center", gap: 14
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            {/* Status Tabs */}
            <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--r-sm)" }}>
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "PENDING", label: `Chờ duyệt (${stats.pending})`, badge: true },
                { id: "APPROVED", label: "Đã duyệt" },
                { id: "REJECTED", label: "Từ chối" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: "6px 12px", border: "none", borderRadius: "var(--r-xs)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: statusFilter === tab.id ? "var(--surface)" : "transparent",
                    color: statusFilter === tab.id
                      ? tab.id === "PENDING" ? "#dc2626" : "var(--primary)"
                      : "var(--text-3)",
                    boxShadow: statusFilter === tab.id ? "var(--shadow-xs)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)", background: "var(--surface)",
                fontSize: 13, color: "var(--text-1)", outline: "none", cursor: "pointer"
              }}
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="LEGAL">Pháp chế (Legal)</option>
              <option value="SALES">Kinh doanh (Sales)</option>
              <option value="ACCOUNTING_PROCUREMENT">Kế toán / Thu mua</option>
              <option value="IT">Công nghệ / IT</option>
              <option value="RND">R&D</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 260 }}>
              <SearchInput
                placeholder="Tìm tên tệp, email người gửi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadData}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{
                background: "var(--surface-2)", borderBottom: "1px solid var(--border)",
                color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5
              }}>
                <th style={{ padding: "12px 18px", width: "32%" }}>Tệp Tài liệu</th>
                <th style={{ padding: "12px 14px", width: "16%" }}>Loại Tri thức</th>
                <th style={{ padding: "12px 14px", width: "22%" }}>Người gửi & Phòng ban</th>
                <th style={{ padding: "12px 14px", width: "14%" }}>Thời gian gửi</th>
                <th style={{ padding: "12px 14px", width: "10%" }}>Trạng thái</th>
                <th style={{ padding: "12px 18px", width: "16%", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-3)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={32} style={{ color: "var(--text-4)" }} />
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Không có yêu cầu tải lên nào</div>
                      <div style={{ fontSize: 12, color: "var(--text-4)" }}>
                        {statusFilter === "PENDING"
                          ? "Hiện không có tài liệu nào đang chờ kiểm duyệt."
                          : "Không tìm thấy dữ liệu khớp với bộ lọc."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s ease",
                      background: item.status === "PENDING" ? "rgba(245, 158, 11, 0.02)" : "transparent"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        item.status === "PENDING" ? "rgba(245, 158, 11, 0.02)" : "transparent")
                    }
                  >
                    {/* Tên tệp & dung lượng */}
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {renderFileIcon(item.file_type, item.file_name)}
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3 }}>
                            {item.file_name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>
                            {formatSize(item.file_size)} • {item.file_type}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Loại tri thức */}
                    <td style={{ padding: "14px 14px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 8px", borderRadius: "var(--r-xs)",
                        background: "var(--surface-2)", color: "var(--text-2)",
                        fontSize: 12, fontWeight: 600, border: "1px solid var(--border)"
                      }}>
                        {item.resource_type}
                      </span>
                    </td>

                    {/* Người gửi */}
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontWeight: 500, color: "var(--text-1)" }}>
                          {item.uploaded_by_email}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{item.uploaded_by_role}</span>
                          <span>•</span>
                          <span>{item.department_code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Thời gian gửi */}
                    <td style={{ padding: "14px 14px", color: "var(--text-3)", fontSize: 12 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "—"}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: "14px 14px" }}>
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        {/* Xem trước */}
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Eye}
                          onClick={() => handleOpenPreview(item)}
                          title="Xem trước nội dung"
                        >
                          Xem
                        </Button>

                        {item.status === "PENDING" && (
                          <>
                            {/* Phê duyệt */}
                            <Button
                              variant="primary"
                              size="xs"
                              icon={Check}
                              disabled={approvingId === item.id}
                              onClick={() => handleApprove(item)}
                              style={{
                                background: "#059669",
                                borderColor: "#059669",
                                color: "#ffffff",
                              }}
                            >
                              {approvingId === item.id ? "..." : "Duyệt"}
                            </Button>

                            {/* Từ chối */}
                            <Button
                              variant="danger"
                              size="xs"
                              icon={X}
                              onClick={() => handleOpenReject(item)}
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal 1: Xem trước tài liệu */}
      {previewItem && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 250,
          background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)", padding: "24px 28px", width: 680, maxWidth: "92vw",
            maxHeight: "85vh", display: "flex", flexDirection: "column", gap: 16,
            boxShadow: "var(--shadow-xl)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {renderFileIcon(previewItem.file_type, previewItem.file_name)}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
                    {previewItem.file_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    Gửi bởi {previewItem.uploaded_by_email} ({previewItem.department_code})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 22 }}
              >
                ×
              </button>
            </div>

            {/* Metadata summary */}
            <div style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)", padding: "12px 16px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12
            }}>
              <div><strong>Dung lượng:</strong> {formatSize(previewItem.file_size)}</div>
              <div><strong>Loại tri thức:</strong> {previewItem.resource_type}</div>
              <div><strong>Trạng thái:</strong> {previewItem.status}</div>
              <div><strong>Ngày gửi:</strong> {previewItem.created_at ? new Date(previewItem.created_at).toLocaleString("vi-VN") : "—"}</div>
              {previewItem.review_note && (
                <div style={{ gridColumn: "1 / -1", color: "#dc2626" }}>
                  <strong>Ghi chú kiểm duyệt:</strong> {previewItem.review_note}
                </div>
              )}
            </div>

            {/* File Text Preview */}
            <div style={{ flex: 1, minHeight: 180, maxHeight: 320, overflowY: "auto" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 6 }}>
                Nội dung xem trước (Trích xuất văn bản):
              </div>
              {previewLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                  Đang đọc nội dung tệp...
                </div>
              ) : (
                <pre style={{
                  margin: 0, padding: "12px 14px", background: "var(--surface-3, #f8fafc)",
                  border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                  fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  color: "var(--text-1)", lineHeight: 1.5, maxHeight: 300, overflowY: "auto"
                }}>
                  {previewContent}
                </pre>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)}>
                Đóng
              </Button>
              {previewItem.status === "PENDING" && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const item = previewItem;
                      setPreviewItem(null);
                      handleOpenReject(item);
                    }}
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ background: "#059669", borderColor: "#059669" }}
                    onClick={() => {
                      const item = previewItem;
                      setPreviewItem(null);
                      handleApprove(item);
                    }}
                  >
                    Phê duyệt ngay
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Từ chối tài liệu */}
      {rejectingItem && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 260,
          background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)", padding: "24px 28px", width: 500, maxWidth: "90vw",
            boxShadow: "var(--shadow-xl)", display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={20} /> Từ chối tài liệu tải lên
              </div>
              <button
                onClick={() => setRejectingItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 22 }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: 13, color: "var(--text-2)" }}>
              Bạn đang từ chối tệp: <strong style={{ color: "var(--text-1)" }}>{rejectingItem.file_name}</strong>
              <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
                Người gửi: {rejectingItem.uploaded_by_email} ({rejectingItem.department_code})
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
                Lý do từ chối (Ghi chú phản hồi cho người gửi):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối..."
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)", color: "var(--text-1)", fontSize: 13,
                  outline: "none", resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setRejectingItem(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={rejectLoading || !rejectReason.trim()}
                onClick={handleSubmitReject}
              >
                {rejectLoading ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
