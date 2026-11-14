import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, ShieldCheck, AlertTriangle, Download, RefreshCw,
  CheckCircle2, XCircle, Info, Lock, ExternalLink, HelpCircle, UploadCloud,
  Copy, Check
} from "lucide-react";
import {
  Card, Badge, Button, Alert
} from "../../../components/ui";
import {
  canonicalRole,
  getSessionIdentity,
  fetchPb42TelemetrySummary,
  fetchPb42LatencyHistogram,
  fetchPb42AuditIntegrity,
  fetchPb42Limitations,
  fetchPb42HandoverManifest,
  exportPb42HandoverPackage,
} from "../adminApi";
import {
  HISTOGRAM_DISPLAY_CAP_MS,
  SMALL_SAMPLE_THRESHOLD,
  DEFAULT_COOLDOWN_SECONDS,
  bufferToHex,
  formatDualDateTime,
  computeIntegrityStatus,
  verify3WayHashes,
  calculateSloCoordinate,
  formatScopeOutlierLabel,
  mergeDualAnswerPaths,
  getCitationDisplay,
} from "./pb42Constants";
import LatencyHistogramSvg from "./LatencyHistogramSvg";

export { SMALL_SAMPLE_THRESHOLD, DEFAULT_COOLDOWN_SECONDS, HISTOGRAM_DISPLAY_CAP_MS, calculateSloCoordinate };

function CopyButton({ text, label = "Sao chép" }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    setCopyFailed(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const success = document.execCommand("copy");
        document.body.removeChild(ta);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error("execCommand copy returned false");
        }
      }
    } catch (err) {
      setCopied(false);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };


  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleCopy}
        title={
          copied
            ? "Đã sao chép vào bộ nhớ tạm!"
            : copyFailed
            ? "Không thể sao chép vào bộ nhớ tạm"
            : label
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: copyFailed ? "1px solid var(--red, #ef4444)" : "1px solid var(--border)",
          borderRadius: 4,
          padding: "2px 5px",
          cursor: "pointer",
          marginLeft: 6,
          color: copied
            ? "var(--teal, #0d9488)"
            : copyFailed
            ? "var(--red, #ef4444)"
            : "var(--text-3, #64748b)",
          verticalAlign: "middle",
        }}
      >
        {copied ? (
          <Check size={12} color="var(--teal, #0d9488)" />
        ) : copyFailed ? (
          <XCircle size={12} color="var(--red, #ef4444)" />
        ) : (
          <Copy size={12} />
        )}
      </button>
      {copyFailed && (
        <span
          style={{
            fontSize: 10,
            color: "var(--red, #ef4444)",
            marginLeft: 4,
            fontWeight: 500,
          }}
        >
          Lỗi sao chép
        </span>
      )}
    </span>
  );
}

export default function Pb42HandoverPanel({ lang = "vi", isVi = true, showToast }) {
  const session = getSessionIdentity();
  const role = canonicalRole(session?.role);
  const isAuthorized = role === "it_admin" || Boolean(session?.is_superuser);

  // ── 2A Telemetry State ───────────────────────────────────────────────────
  const [includeBenchmark, setIncludeBenchmark] = useState(true); // Mặc định BẬT
  const [excludeOutliers, setExcludeOutliers] = useState(false);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState("");
  const [summaryData, setSummaryData] = useState(null);
  const [histogramData, setHistogramData] = useState([]);

  // ── 2B Audit Integrity State ──────────────────────────────────────────────
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityData, setIntegrityData] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState("idle");
  // "idle" | "loading" | "valid" | "broken" | "rate_limited" | "forbidden" | "unverified" | "error"
  const [isIntegrityStale, setIsIntegrityStale] = useState(false); // Chuyển "đã cũ" sau khi xuất hồ sơ
  const [integrityErrorMsg, setIntegrityErrorMsg] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // ── 2C Handover Export State ──────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  // { exportId, zipSha256, clientSha256, threeWayHashes, filename, manifest: {...} }

  // ── Đối chiếu tệp cục bộ giải nén với Manifest ────────────────────────────
  const [localVerifyLoading, setLocalVerifyLoading] = useState(false);
  const [localVerifyResult, setLocalVerifyResult] = useState(null);

  // ── 2D Known Limitations State ────────────────────────────────────────────
  const [limitations, setLimitations] = useState([]);
  const [limitationsLoading, setLimitationsLoading] = useState(false);

  // ── 1. Tải Telemetry & Histogram ─────────────────────────────────────────
  const loadTelemetry = useCallback(async () => {
    if (!isAuthorized) return;
    setTelemetryLoading(true);
    setTelemetryError("");
    try {
      const [sumRes, histRes] = await Promise.all([
        fetchPb42TelemetrySummary({ excludeOutliers, includeBenchmark }),
        fetchPb42LatencyHistogram({ bucketMs: 500, excludeOutliers, includeBenchmark }),
      ]);
      setSummaryData(sumRes);
      setHistogramData(Array.isArray(histRes?.buckets) ? histRes.buckets : []);
    } catch (err) {
      setSummaryData(null);
      setHistogramData([]);
      setTelemetryError(err.message || "Lỗi tải số liệu đo lường độ trễ");
    } finally {
      setTelemetryLoading(false);
    }
  }, [isAuthorized, excludeOutliers, includeBenchmark]);

  // ── 2. Tải Limitations ───────────────────────────────────────────────────
  const loadLimitations = useCallback(async () => {
    if (!isAuthorized) return;
    setLimitationsLoading(true);
    try {
      const data = await fetchPb42Limitations();
      setLimitations(Array.isArray(data) ? data : []);
    } catch (err) {
      setLimitations([]);
    } finally {
      setLimitationsLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadTelemetry();
      loadLimitations();
    }
  }, [isAuthorized, loadTelemetry, loadLimitations]);

  // ── 3. Quản lý đồng hồ đếm ngược Cooldown cho 429 ────────────────────────
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  
  return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // ── 4. Kiểm tra toàn vẹn chuỗi Audit Trail (2B) ──────────────────────────
  const handleCheckIntegrity = useCallback(async () => {
    if (!isAuthorized || integrityLoading || cooldownSeconds > 0) return;

    setIntegrityLoading(true);
    setIntegrityErrorMsg("");

    try {
      const res = await fetchPb42AuditIntegrity();
      setIntegrityData(res);
      setIsIntegrityStale(false); // Làm mới trạng thái

      const nextStatus = computeIntegrityStatus(res, 200, null);
      setIntegrityStatus(nextStatus);

      if (nextStatus === "unverified") {
        setIntegrityErrorMsg(
          isVi
            ? "Dữ liệu trả về từ máy chủ thiếu trường bắt buộc để xác thực toàn vẹn (ví dụ thiếu head_entry_sha256)."
            : "Server response lacks required fields for cryptographic verification."
        );
      }
    } catch (err) {
      setIntegrityData(null);
      const nextStatus = computeIntegrityStatus(null, err.status || 500, err);
      setIntegrityStatus(nextStatus);

      if (err.status === 429) {
        const retryAfterSec = Number(err.retryAfter) || DEFAULT_COOLDOWN_SECONDS;
        setCooldownSeconds(retryAfterSec);
        setIntegrityErrorMsg(
          isVi
            ? "Hệ thống đang giới hạn tần suất kiểm tra toàn vẹn. Vui lòng đợi trong giây lát và thử lại."
            : "Rate limit reached for integrity check. Please wait before retrying."
        );
      } else if (err.status === 401 || err.status === 403) {
        setIntegrityErrorMsg(err.message || (isVi ? "Không có quyền kiểm tra" : "Forbidden"));
      } else if (err.status === 400) {
        setIntegrityErrorMsg(err.message || (isVi ? "Tham số kiểm tra không hợp lệ" : "Invalid parameters"));
      } else {
        setIntegrityErrorMsg(err.message || (isVi ? "Lỗi kết nối máy chủ khi kiểm tra" : "Server/network error"));
      }
    } finally {
      setIntegrityLoading(false);
    }
  }, [isAuthorized, integrityLoading, cooldownSeconds, isVi]);

  // ── 5. Xuất hồ sơ bàn giao (2C) ──────────────────────────────────────────
  const handleExecuteExport = useCallback(async () => {
    if (!isAuthorized || exportLoading) return;
    setExportLoading(true);

    try {
      const { blob, filename, exportId, zipSha256 } = await exportPb42HandoverPackage();

      // Tải tệp an toàn qua createObjectURL + tạm <a> + revokeObjectURL
      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement("a");
      tempLink.href = blobUrl;
      tempLink.download = filename || "GraphMind_Handover_Package.zip";
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobUrl);

      // Đánh dấu kết quả kiểm tra toàn vẹn 2B chuyển sang "đã cũ" vì xuất file tạo bản ghi audit mới
      setIsIntegrityStale(true);

      // Tính toán Client-Side SHA-256 của blob
      let clientSha256 = null;
      let cryptoAvailable = Boolean(window.crypto?.subtle);

      if (cryptoAvailable) {
        try {
          const arrayBuf = await blob.arrayBuffer();
          const hashBuf = await window.crypto.subtle.digest("SHA-256", arrayBuf);
          clientSha256 = bufferToHex(hashBuf);
        } catch {
          clientSha256 = null;
        }
      }

      // Đọc manifest chi tiết từ server
      let manifestData = null;
      if (exportId) {
        try {
          manifestData = await fetchPb42HandoverManifest(exportId);
        } catch {}
      }

      // Đối soát băm 3 chiều (Client Blob vs Header vs Manifest)
      const threeWay = verify3WayHashes({
        clientBlobSha256: clientSha256,
        headerZipSha256: zipSha256,
        manifestZipSha256: manifestData?.zip_sha256 || manifestData?.files?.manifest?.sha256,
      });

      setExportResult({
        exportId,
        headerZipSha256: zipSha256,
        clientSha256,
        cryptoAvailable,
        threeWay,
        filename,
        manifest: manifestData,
      });

      setShowExportModal(false);
      if (showToast) {
        showToast(isVi ? "Đã xuất gói hồ sơ bàn giao thành công" : "Handover package exported successfully");
      }
    } catch (err) {
      if (showToast) {
        showToast(err.message || (isVi ? "Lỗi xuất hồ sơ bàn giao" : "Export failed"), "err");
      }
    } finally {
      setExportLoading(false);
    }
  }, [isAuthorized, exportLoading, isVi, showToast]);

  // ── 6. Đối soát tệp cục bộ với manifest.files ─────────────────────────────
  const handleLocalFileVerification = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !exportResult?.manifest?.files) return;

    setLocalVerifyLoading(true);
    setLocalVerifyResult(null);

    try {
      if (!window.crypto?.subtle) {
        throw new Error(
          isVi
            ? "Môi trường trình duyệt không hỗ trợ SubtleCrypto để tính toán SHA-256 tệp cục bộ."
            : "SubtleCrypto not supported in browser environment."
        );
      }

      const buf = await file.arrayBuffer();
      const hashBuf = await window.crypto.subtle.digest("SHA-256", buf);
      const computedHash = bufferToHex(hashBuf).toLowerCase();

      // Tìm kiếm trong manifest.files theo tên tệp hoặc mã băm
      let matchedComponent = null;
      let matchedInfo = null;
      let isHashExactMatch = false;

      for (const [comp, info] of Object.entries(exportResult.manifest.files)) {
        if (info.filename?.toLowerCase() === file.name.toLowerCase()) {
          matchedComponent = comp;
          matchedInfo = info;
          isHashExactMatch = info.sha256?.toLowerCase() === computedHash;
          break;
        }
      }

      if (!matchedComponent) {
        for (const [comp, info] of Object.entries(exportResult.manifest.files)) {
          if (info.sha256?.toLowerCase() === computedHash) {
            matchedComponent = comp;
            matchedInfo = info;
            isHashExactMatch = true;
            break;
          }
        }
      }

      setLocalVerifyResult({
        fileName: file.name,
        computedHash,
        matchedComponent,
        matchedInfo,
        isHashExactMatch,
      });
    } catch (err) {
      setLocalVerifyResult({
        fileName: file.name,
        error: err.message,
      });
    } finally {
      setLocalVerifyLoading(false);
    }
  };

  // ── Nếu không có quyền it_admin: Render ForbiddenBanner và DỪNG ─────────
  if (!isAuthorized) {
    return (
      <Alert variant="danger" title={isVi ? "Truy cập bị từ chối" : "Access Denied"}>
        {isVi
          ? "Chỉ Quản trị viên hệ thống (IT Admin) mới có quyền truy cập hồ sơ bàn giao và số liệu PB42."
          : "Only IT Administrators have access to PB42 Handover Dossier."}
      </Alert>
    );
  }

  const realCount = summaryData?.real_queries_count ?? summaryData?.real ?? 0;
  const isDataEmpty = summaryData?.empty === true || (summaryData && summaryData.total_queries === 0);

  const mergedPaths = useMemo(() => {
    const withoutList = summaryData?.without_outliers_by_answer_path;
    const withList = summaryData?.with_outliers_by_answer_path;
    if (withoutList || withList) {
      return mergeDualAnswerPaths(withoutList, withList);
    }
    if (Array.isArray(summaryData?.by_answer_path)) {
      return mergeDualAnswerPaths(summaryData.by_answer_path, summaryData.by_answer_path);
    }
    return [];
  }, [summaryData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Banner: CHỈ hiển thị khi ĐÃ CÓ DỮ LIỆU và KHÔNG PHẢI RỖNG (summaryData.empty !== true) ── */}
      {summaryData && !telemetryLoading && !summaryData.empty && (
        realCount === 0 ? (
          <Alert variant="warning" title={isVi ? "Dữ liệu Môi trường Thử nghiệm Nghiệm thu" : "Benchmark Data Environment"}>
            {isVi
              ? "Toàn bộ số liệu là dữ liệu benchmark nghiệm thu, chưa có truy vấn thực tế từ người dùng."
              : "All figures represent benchmark acceptance testing data. No real user queries have been recorded yet."}
          </Alert>
        ) : (
          <Alert variant="info" title={isVi ? "Dữ liệu Vận hành Thực tế" : "Live Operational Telemetry"}>
            {isVi
              ? `Dữ liệu bao gồm cả truy vấn thực tế từ người dùng (n = ${realCount}) và truy vấn benchmark nghiệm thu.`
              : `Data contains ${realCount} real user queries alongside benchmark acceptance evaluations.`}
          </Alert>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          KHỐI 2A: TỔNG QUAN VẬN HÀNH & BẢNG ANSWER_PATH
         ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
              {isVi ? "Khối 2A: Đo lường Độ trễ & Hiệu năng Theo Tuyến Xử lý" : "2A: Latency & Path Telemetry"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              {isVi ? "Phân tích độ trễ P50/P95/P99, tỷ lệ đạt SLO và trích dẫn tri thức" : "Latency percentiles, SLO compliance and citation rates"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Công tắc "Bao gồm benchmark" (mặc định BẬT) */}
            <div style={{ display: "flex", background: "var(--surface-muted, #f1f5f9)", borderRadius: "var(--r-md)", padding: 3, border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setIncludeBenchmark(true)}
                style={{
                  border: "none",
                  background: includeBenchmark ? "var(--surface, #ffffff)" : "transparent",
                  color: includeBenchmark ? "var(--primary, #2563eb)" : "var(--text-3)",
                  boxShadow: includeBenchmark ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Kèm Benchmark (Bật)" : "With Benchmark"}
              </button>
              <button
                type="button"
                onClick={() => setIncludeBenchmark(false)}
                style={{
                  border: "none",
                  background: !includeBenchmark ? "var(--surface, #ffffff)" : "transparent",
                  color: !includeBenchmark ? "var(--primary, #2563eb)" : "var(--text-3)",
                  boxShadow: !includeBenchmark ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Chỉ Real" : "Real Only"}
              </button>
            </div>

            {/* Công tắc Outliers (lấy trực tiếp từ server response) */}
            <div style={{ display: "flex", background: "var(--surface-muted, #f1f5f9)", borderRadius: "var(--r-md)", padding: 3, border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setExcludeOutliers(false)}
                style={{
                  border: "none",
                  background: !excludeOutliers ? "var(--surface, #ffffff)" : "transparent",
                  color: !excludeOutliers ? "var(--primary, #2563eb)" : "var(--text-3)",
                  boxShadow: !excludeOutliers ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Có ngoại lai" : "With Outliers"}
              </button>
              <button
                type="button"
                onClick={() => setExcludeOutliers(true)}
                style={{
                  border: "none",
                  background: excludeOutliers ? "var(--surface, #ffffff)" : "transparent",
                  color: excludeOutliers ? "var(--primary, #2563eb)" : "var(--text-3)",
                  boxShadow: excludeOutliers ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Đã loại ngoại lai" : "Exclude Outliers"}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadTelemetry}
              disabled={telemetryLoading}
            >
              <RefreshCw size={14} className={telemetryLoading ? "spin" : ""} style={{ marginRight: 6 }} />
              {isVi ? "Làm mới" : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Trạng thái dữ liệu rỗng (empty: true) */}
        {isDataEmpty ? (
          <div style={{ padding: "32px 16px", textAlign: "center", background: "var(--surface-subtle, #f8fafc)", borderRadius: "var(--r-md)", border: "1px dashed var(--border)" }}>
            <Info size={28} color="var(--text-3)" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
              {isVi ? "Chưa có dữ liệu truy vấn nào được ghi nhận cho bộ lọc này." : "No queries recorded for this filter scope."}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
              {isVi ? "Vui lòng bật 'Kèm Benchmark' hoặc tạo thêm truy vấn mới để hiển thị số liệu." : "Enable benchmark queries or trigger live traffic to view analytics."}
            </div>
          </div>
        ) : summaryData ? (
          <>
            {/* Các thẻ đo lường chính */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>
                  {isVi ? "Tổng lượt đo" : "Total Queries"}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", marginTop: 4 }}>
                  {summaryData.total_queries ?? "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                  {formatScopeOutlierLabel(summaryData?.scope, isVi)}
                </div>
              </div>

              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{isVi ? "Benchmark" : "Benchmark"}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary, #2563eb)", marginTop: 4 }}>{summaryData.benchmark_queries_count ?? "—"}</div>
              </div>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{isVi ? "Thực tế (Real)" : "Real Queries"}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--teal, #0d9488)", marginTop: 4 }}>{summaryData.real_queries_count ?? 0}</div>
              </div>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{isVi ? "Ngoại lai (Outliers)" : "Outliers"}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--amber, #d97706)", marginTop: 4 }}>{summaryData.outlier_queries_count ?? 0}</div>
              </div>

              {/* Bắt đầu và Kết thúc thu thập: Hiển thị cả Giờ Địa Phương Trình Duyệt và Giờ UTC */}
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{isVi ? "Bắt đầu thu thập" : "Data Start"}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginTop: 6, lineHeight: 1.3 }}>
                  {formatDualDateTime(summaryData.data_start, isVi)}
                </div>
              </div>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{isVi ? "Kết thúc thu thập" : "Data End"}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginTop: 6, lineHeight: 1.3 }}>
                  {formatDualDateTime(summaryData.data_end, isVi)}
                </div>
              </div>
            </div>

            {/* Scope và Definition nguyên văn từ API */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Scope: </span>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "monospace" }}>{String(summaryData.scope || "")}</span>
              </div>
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Definition: </span>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{String(summaryData.definition || "")}</span>
              </div>
            </div>

            {/* Biểu đồ Histogram SVG thuần (Hỗ trợ chọn dải 0–5s, 0–20s, 0–100s) */}
            <div style={{ marginBottom: 24, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                  {isVi ? "Phân bố độ trễ (Sparse Histogram)" : "Latency Distribution Sparse Histogram"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                  {isVi ? "Trục X tuyến tính theo ms • Vạch SLO 1.200/2.800 ms" : "Linear ms scale on X axis"}
                </span>
              </div>
              <LatencyHistogramSvg
                histogramData={histogramData}
                sloThresholdsMs={summaryData?.slo_thresholds_ms || []}
                displayCapMs={HISTOGRAM_DISPLAY_CAP_MS}
                defaultRangeMs={5000}
                lang={lang}
              />
            </div>

            {/* Bảng chi tiết các Answer Paths: Bảng cột kép đối sánh Không ngoại lai vs Có ngoại lai từ 1 response */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface-subtle, #f8fafc)", borderBottom: "1px solid var(--border)" }}>
                    <th rowSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-2)", verticalAlign: "middle" }}>
                      {isVi ? "Tuyến xử lý (Answer Path)" : "Answer Path"}
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-2)", textAlign: "center", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
                      {isVi ? "Số mẫu (n)" : "Sample count (n)"}
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-2)", textAlign: "center", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
                      {isVi ? "P50" : "P50"}
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-2)", textAlign: "center", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
                      {isVi ? "P95" : "P95"}
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-2)", textAlign: "center", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
                      {isVi ? "Max" : "Max"}
                    </th>
                    <th rowSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-2)", textAlign: "right", verticalAlign: "middle" }}>
                      {isVi ? "Ngưỡng SLO" : "SLO Target"}
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-2)", textAlign: "center", borderBottom: "1px solid var(--border-subtle, #e2e8f0)" }}>
                      {isVi ? "Đạt SLO (%)" : "SLO Met (%)"}
                    </th>
                    <th rowSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-2)", textAlign: "right", verticalAlign: "middle" }}>
                      {isVi ? "Trích dẫn (%)" : "Citation Rate"}
                    </th>
                  </tr>
                  <tr style={{ background: "var(--surface-muted, #f1f5f9)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--teal, #0d9488)", textAlign: "right" }}>{isVi ? "Loại NL" : "No Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--amber, #d97706)", textAlign: "right" }}>{isVi ? "Gồm NL" : "With Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--teal, #0d9488)", textAlign: "right" }}>{isVi ? "Loại NL" : "No Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--amber, #d97706)", textAlign: "right" }}>{isVi ? "Gồm NL" : "With Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--teal, #0d9488)", textAlign: "right" }}>{isVi ? "Loại NL" : "No Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--amber, #d97706)", textAlign: "right" }}>{isVi ? "Gồm NL" : "With Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--teal, #0d9488)", textAlign: "right" }}>{isVi ? "Loại NL" : "No Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--amber, #d97706)", textAlign: "right" }}>{isVi ? "Gồm NL" : "With Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--teal, #0d9488)", textAlign: "right" }}>{isVi ? "Loại NL" : "No Outlier"}</th>
                    <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--amber, #d97706)", textAlign: "right" }}>{isVi ? "Gồm NL" : "With Outlier"}</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedPaths.map((row, idx) => {
                    const wo = row.without;
                    const wi = row.with;
                    const sloMs = wo?.slo_applicable_ms ?? wi?.slo_applicable_ms;
                    const isSmallSampleWo = wo && wo.count < SMALL_SAMPLE_THRESHOLD;
                    const isSmallSampleWi = wi && wi.count < SMALL_SAMPLE_THRESHOLD;
                    const citText = getCitationDisplay(summaryData?.citation_metrics, row.path, wi?.count ?? wo?.count);

                  
  return (
                      <tr key={row.path || idx} style={{ borderBottom: "1px solid var(--border-subtle, #f1f5f9)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-1)" }}>
                          <code>{row.path}</code>
                        </td>
                        {/* Số mẫu (n) */}
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>
                          {wo ? (
                            <>
                              {wo.count}
                              {isSmallSampleWo && (
                                <span title={isVi ? `Mẫu nhỏ (n < ${SMALL_SAMPLE_THRESHOLD})` : `Small sample (n < ${SMALL_SAMPLE_THRESHOLD})`} style={{ color: "var(--amber, #d97706)", marginLeft: 2, fontWeight: 700 }}>*</span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", color: wi && wo && wi.count !== wo.count ? "var(--amber, #d97706)" : "inherit" }}>
                          {wi ? (
                            <>
                              {wi.count}
                              {isSmallSampleWi && (
                                <span title={isVi ? `Mẫu nhỏ (n < ${SMALL_SAMPLE_THRESHOLD})` : `Small sample (n < ${SMALL_SAMPLE_THRESHOLD})`} style={{ color: "var(--amber, #d97706)", marginLeft: 2, fontWeight: 700 }}>*</span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        {/* P50 */}
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                          {wo?.p50_ms != null ? `${wo.p50_ms} ms` : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                          {wi?.p50_ms != null ? `${wi.p50_ms} ms` : "—"}
                        </td>
                        {/* P95 */}
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace" }}>
                          {wo?.p95_ms != null ? `${wo.p95_ms} ms` : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace", color: wi && wo && wi.p95_ms !== wo.p95_ms ? "var(--amber, #d97706)" : "inherit" }}>
                          {wi?.p95_ms != null ? `${wi.p95_ms} ms` : "—"}
                        </td>
                        {/* Max */}
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace" }}>
                          {wo?.max_ms != null ? `${wo.max_ms} ms` : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "monospace", color: wi && wo && wi.max_ms !== wo.max_ms ? "var(--amber, #d97706)" : "inherit" }}>
                          {wi?.max_ms != null ? `${wi.max_ms} ms` : "—"}
                        </td>
                        {/* Ngưỡng SLO */}
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          {sloMs != null ? `${sloMs} ms` : "—"}
                        </td>
                        {/* Đạt SLO (%) */}
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>
                          {wo?.slo_applicable_met_rate_pct != null ? (
                            <span style={{ color: wo.slo_applicable_met_rate_pct >= 95 ? "var(--teal, #0d9488)" : "var(--red, #dc2626)" }}>
                              {wo.slo_applicable_met_rate_pct}%
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>
                          {wi?.slo_applicable_met_rate_pct != null ? (
                            <span style={{ color: wi.slo_applicable_met_rate_pct >= 95 ? "var(--teal, #0d9488)" : "var(--red, #dc2626)" }}>
                              {wi.slo_applicable_met_rate_pct}%
                            </span>
                          ) : "—"}
                        </td>
                        {/* Trích dẫn (%) từ citation_metrics.by_answer_path */}
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          {citText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-4)", fontStyle: "italic" }}>
                * Ghi chú: "Loại NL" = Đã loại trừ truy vấn ngoại lai. "Gồm NL" = Bao gồm toàn bộ truy vấn ngoại lai. Dấu sao (*) biểu thị cỡ mẫu n &lt; {SMALL_SAMPLE_THRESHOLD}, các chỉ số phân vị chỉ mang tính tham khảo thống kê. Dấu gạch ngang (—) biểu thị thiếu dữ liệu hoặc không áp dụng.
              </div>
            </div>
          </>
        ) : null}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          KHỐI 2B: TOÀN VẸN AUDIT TRAIL (/pb42/audit/integrity)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
              {isVi ? "Khối 2B: Xác thực Mật mã Toàn vẹn Nhật ký Kiểm toán" : "2B: Audit Trail Cryptographic Integrity"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              {isVi ? "Xác minh chuỗi băm lũy tích liên tục (Tamper-evident chain) của bảng audit_logs" : "Verify sequential tamper-evident SHA-256 hash chain"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Nhãn cảnh báo kết quả đã cũ sau khi xuất hồ sơ */}
            {isIntegrityStale && (
              <Badge variant="warning" style={{ fontSize: 12, padding: "5px 10px" }}>
                <AlertTriangle size={13} style={{ marginRight: 4 }} />
                {isVi ? "KẾT QUẢ ĐÃ CŨ (Vừa phát sinh bản ghi xuất hồ sơ)" : "STALE RESULT"}
              </Badge>
            )}

            {/* Nhãn trạng thái */}
            {integrityStatus === "valid" && (
              <Badge variant="success" style={{ fontSize: 13, padding: "6px 12px" }}>
                <CheckCircle2 size={15} style={{ marginRight: 6 }} />
                {isVi ? "HỢP LỆ" : "VALID"}
              </Badge>
            )}
            {integrityStatus === "broken" && (
              <Badge variant="danger" style={{ fontSize: 13, padding: "6px 12px" }}>
                <XCircle size={15} style={{ marginRight: 6 }} />
                {isVi ? "PHÁT HIỆN GIẢ MẠO" : "TAMPER DETECTED"}
              </Badge>
            )}
            {integrityStatus === "rate_limited" && (
              <Badge variant="warning" style={{ fontSize: 13, padding: "6px 12px" }}>
                <AlertTriangle size={15} style={{ marginRight: 6 }} />
                {isVi ? "GIỚI HẠN TẦN SUẤT (429)" : "RATE LIMITED"}
              </Badge>
            )}
            {integrityStatus === "forbidden" && (
              <Badge variant="danger" style={{ fontSize: 13, padding: "6px 12px" }}>
                <Lock size={15} style={{ marginRight: 6 }} />
                {isVi ? "TỪ CHỐI TRUY CẬP (403)" : "FORBIDDEN"}
              </Badge>
            )}
            {(integrityStatus === "unverified" || integrityStatus === "error") && (
              <Badge variant="neutral" style={{ fontSize: 13, padding: "6px 12px" }}>
                <HelpCircle size={15} style={{ marginRight: 6 }} />
                {isVi ? "KHÔNG KIỂM TRA ĐƯỢC" : "CANNOT VERIFY"}
              </Badge>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleCheckIntegrity}
              disabled={integrityLoading || cooldownSeconds > 0}
            >
              <ShieldCheck size={15} className={integrityLoading ? "spin" : ""} style={{ marginRight: 6 }} />
              {integrityLoading
                ? (isVi ? "Đang kiểm tra..." : "Verifying...")
                : cooldownSeconds > 0
                ? (isVi ? `Đợi ${cooldownSeconds}s` : `Wait ${cooldownSeconds}s`)
                : (isVi ? "Kiểm tra toàn vẹn" : "Run Integrity Check")}
            </Button>
          </div>
        </div>

        {/* Thông báo lỗi hoặc Rate limit */}
        {integrityStatus === "rate_limited" && (
          <Alert variant="warning" title={isVi ? "Giới hạn tần suất gọi API" : "Rate Limit Notice"}>
            {integrityErrorMsg}
          </Alert>
        )}

        {integrityStatus === "forbidden" && (
          <Alert variant="danger" title={isVi ? "Không đủ quyền truy cập" : "Permission Denied"}>
            {integrityErrorMsg}
          </Alert>
        )}

        {(integrityStatus === "unverified" || integrityStatus === "error") && integrityErrorMsg && (
          <Alert variant="danger" title={isVi ? "Không thể hoàn thành kiểm tra" : "Verification Failed"}>
            {integrityErrorMsg}
          </Alert>
        )}

        {/* Kết quả chi tiết */}
        {integrityData && (
          <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Số lượng đã duyệt: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                  {integrityData.checked_count ?? integrityData.total_checked ?? "—"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Đỉnh chuỗi (Head Seq): </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                  {integrityData.head_chain_seq ?? "—"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Bản ghi pre-chain: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                  {integrityData.pre_chain_count ?? "—"}
                </span>
              </div>
              {integrityData.broken_at_seq !== null && integrityData.broken_at_seq !== undefined && (
                <div>
                  <span style={{ fontSize: 11, color: "var(--red, #dc2626)", fontWeight: 700, textTransform: "uppercase" }}>Đứt chuỗi tại seq: </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--red, #dc2626)" }}>
                    {integrityData.broken_at_seq}
                  </span>
                </div>
              )}
            </div>

            {/* Lý do hỏng hóc nguyên văn */}
            {integrityData.reason && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(220, 38, 38, 0.08)", borderRadius: "var(--r-sm)", border: "1px solid var(--red)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red, #dc2626)" }}>Lý do lỗi (Reason): </span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--red, #b91c1c)" }}>{String(integrityData.reason)}</span>
              </div>
            )}

            {/* Các trường băm mật mã kèm nút Copy */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, fontSize: 12 }}>
              {integrityData.head_entry_sha256 && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Head Entry SHA-256: </span>
                  <code style={{ fontSize: 11, marginLeft: 6, wordBreak: "break-all" }}>{integrityData.head_entry_sha256}</code>
                  <CopyButton text={integrityData.head_entry_sha256} label="Sao chép Head Entry SHA-256" />
                </div>
              )}
              {integrityData.pre_chain_aggregate_sha256 && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Pre-chain Aggregate SHA-256: </span>
                  <code style={{ fontSize: 11, marginLeft: 6, wordBreak: "break-all" }}>{integrityData.pre_chain_aggregate_sha256}</code>
                  <CopyButton text={integrityData.pre_chain_aggregate_sha256} label="Sao chép Pre-chain Aggregate SHA-256" />
                </div>
              )}
              {integrityData.scope_note && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  <span>* Phạm vi: </span>
                  <span>{String(integrityData.scope_note)}</span>
                </div>
              )}
              {integrityData.external_anchor_requirement && (
                <div style={{ fontSize: 11, color: "var(--amber, #d97706)" }}>
                  <span>* Khuyến nghị: </span>
                  <span>{String(integrityData.external_anchor_requirement)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          KHỐI 2C: XUẤT HỒ SƠ BÀN GIAO (/pb42/handover-export)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
              {isVi ? "Khối 2C: Xuất Trọn Gói Hồ sơ Bàn giao Hệ thống" : "2C: Handover Package Generation & Export"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              {isVi ? "Đóng gói tệp .zip (gồm Dossier Excel, Dossier PDF, Manifest JSON) và ghi nhật ký kiểm toán" : "Export signed zip bundle and record permanent audit event"}
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setShowExportModal(true)}
            disabled={exportLoading}
          >
            <Download size={15} style={{ marginRight: 6 }} />
            {isVi ? "Xuất hồ sơ bàn giao (.zip)" : "Export Handover Package (.zip)"}
          </Button>
        </div>

        {/* Kết quả sau khi xuất thành công */}
        {exportResult && (
          <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={18} color="var(--teal, #0d9488)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>
                {isVi ? `Đã tạo tệp: ${exportResult.filename}` : `Generated: ${exportResult.filename}`}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Mã bàn giao (Export ID): </span>
                <code style={{ fontSize: 12 }}>{exportResult.exportId}</code>
              </div>

              {/* Cảnh báo nếu server không trả header */}
              {!exportResult.headerZipSha256 && (
                <div style={{ color: "var(--amber, #d97706)", fontWeight: 600 }}>
                  ⚠️ Cảnh báo: Máy chủ không trả về header X-Handover-Zip-SHA256 để đối chiếu toàn vẹn gói.
                </div>
              )}

              {/* Thông báo nếu trình duyệt không hỗ trợ SubtleCrypto */}
              {!exportResult.cryptoAvailable && (
                <div style={{ color: "var(--text-3)", fontStyle: "italic" }}>
                  ℹ Môi trường trình duyệt không hỗ trợ SubtleCrypto (yêu cầu kết nối HTTPS hoặc localhost) để tính toán SHA-256 client.
                </div>
              )}

              {/* Bảng so khớp 3 chiều kèm nút copy */}
              <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-1)" }}>
                  {isVi ? "Bảng Đối soát Băm 3 Chiều (Client Blob vs Header vs Manifest):" : "3-Way Hash Verification Matrix:"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-3)" }}>1. Client Blob SHA-256: </span>
                    <code style={{ fontSize: 11, marginLeft: 6, wordBreak: "break-all" }}>{exportResult.clientSha256 || "(Không khả dụng)"}</code>
                    {exportResult.clientSha256 && <CopyButton text={exportResult.clientSha256} label="Sao chép Client Blob SHA-256" />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-3)" }}>2. Server Header (X-Handover-Zip-SHA256): </span>
                    <code style={{ fontSize: 11, marginLeft: 6, wordBreak: "break-all" }}>{exportResult.headerZipSha256 || "(Không có header)"}</code>
                    {exportResult.headerZipSha256 && <CopyButton text={exportResult.headerZipSha256} label="Sao chép Header SHA-256" />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-3)" }}>3. Manifest (manifest.zip_sha256): </span>
                    <code style={{ fontSize: 11, marginLeft: 6, wordBreak: "break-all" }}>{exportResult.manifest?.zip_sha256 || "(Chưa tải manifest)"}</code>
                    {exportResult.manifest?.zip_sha256 && <CopyButton text={exportResult.manifest.zip_sha256} label="Sao chép Manifest ZIP SHA-256" />}
                  </div>

                  {/* Kết quả đối soát từng cặp */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <Badge variant={exportResult.threeWay.clientVsHeader ? "success" : "danger"}>
                      {exportResult.threeWay.clientVsHeader
                        ? "Cặp Client vs Header: Khớp"
                        : "Cặp Client vs Header: Không khớp"}
                    </Badge>
                    <Badge variant={exportResult.threeWay.clientVsManifest ? "success" : "danger"}>
                      {exportResult.threeWay.clientVsManifest
                        ? "Cặp Client vs Manifest: Khớp"
                        : "Cặp Client vs Manifest: Không khớp"}
                    </Badge>
                    <Badge variant={exportResult.threeWay.headerVsManifest ? "success" : "danger"}>
                      {exportResult.threeWay.headerVsManifest
                        ? "Cặp Header vs Manifest: Khớp"
                        : "Cặp Header vs Manifest: Không khớp"}
                    </Badge>
                  </div>

                  {/* Nhãn trung thực theo yêu cầu Request 5 */}
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>
                      ✓ Khớp hash do máy chủ cấp, chỉ phát hiện hỏng khi truyền tải; không thay thế neo bên ngoài (LIM-06)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bảng chi tiết từng file trong Manifest kèm nút Copy */}
            {exportResult.manifest?.files && (
              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>
                  {isVi ? "Bảng giá trị băm từng tệp (Do máy chủ cung cấp qua Manifest JSON):" : "Per-file SHA-256 Hashes from Server Manifest:"}
                </span>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8, background: "var(--surface)" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-muted, #f1f5f9)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Tệp (Component)</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Tên tệp</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Mã băm SHA-256</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(exportResult.manifest.files).map(([k, fileInfo]) => (
                      <tr key={k} style={{ borderBottom: "1px solid var(--border-subtle, #f1f5f9)" }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{k}</td>
                        <td style={{ padding: "6px 10px", color: "var(--text-2)" }}>{fileInfo.filename}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>
                          {fileInfo.sha256}
                          <CopyButton text={fileInfo.sha256} label={`Sao chép SHA-256 của ${fileInfo.filename}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tính năng chọn tệp cục bộ để đối chiếu SHA-256 với Manifest */}
            {exportResult.manifest?.files && (
              <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <UploadCloud size={16} color="var(--primary, #2563eb)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                    {isVi ? "Chọn tệp cục bộ (đã giải nén) để đối chiếu SHA-256 với Manifest:" : "Select extracted local file to verify against Manifest:"}
                  </span>
                </div>
                <input
                  type="file"
                  onChange={handleLocalFileVerification}
                  disabled={localVerifyLoading}
                  style={{ fontSize: 12 }}
                />
                {localVerifyLoading && (
                  <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 8 }}>
                    {isVi ? "Đang băm tệp..." : "Hashing file..."}
                  </span>
                )}

                {localVerifyResult && (
                  <div style={{ marginTop: 10, fontSize: 12, padding: "8px 10px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "var(--r-xs)", border: "1px solid var(--border)" }}>
                    <div><span style={{ fontWeight: 600 }}>Tệp: </span>{localVerifyResult.fileName}</div>
                    <div>
                      <span style={{ fontWeight: 600 }}>SHA-256 tính toán: </span>
                      <code style={{ fontSize: 11 }}>{localVerifyResult.computedHash}</code>
                      <CopyButton text={localVerifyResult.computedHash} label="Sao chép SHA-256 tính toán" />
                    </div>
                    {localVerifyResult.matchedComponent ? (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontWeight: 600 }}>Khớp component: </span>{localVerifyResult.matchedComponent} ({localVerifyResult.matchedInfo?.filename})
                        {localVerifyResult.isHashExactMatch ? (
                          <Badge variant="success" style={{ marginLeft: 8, fontSize: 11 }}>
                            ✓ Khớp mã băm Manifest
                          </Badge>
                        ) : (
                          <Badge variant="danger" style={{ marginLeft: 8, fontSize: 11 }}>
                            ✗ Sai khác mã băm so với Manifest!
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 4, color: "var(--amber, #d97706)" }}>
                        ⚠️ Không tìm thấy tệp trùng tên trong Manifest files.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal xác nhận xuất hồ sơ bàn giao */}
        {showExportModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border-strong, #cbd5e1)",
                borderRadius: "var(--r-lg, 12px)",
                padding: "24px 28px",
                width: 520,
                maxWidth: "92vw",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <AlertTriangle size={22} color="var(--amber, #d97706)" />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
                  {isVi ? "Xác nhận xuất gói hồ sơ bàn giao" : "Confirm Handover Package Export"}
                </h4>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, margin: "0 0 16px" }}>
                {isVi
                  ? "Hành động xuất gói hồ sơ bàn giao sẽ tự động tạo tệp .zip chứa Dossier Excel, Dossier PDF và Manifest JSON. Sự kiện xuất file này sẽ được ghi nhận VĨNH VIỄN vào Nhật ký kiểm toán (Audit Trail) của hệ thống với mã băm toàn vẹn."
                  : "Exporting the handover package will generate a .zip archive containing Excel, PDF and Manifest. This action will be PERMANENTLY logged in the immutable audit trail."}
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                  disabled={exportLoading}
                >
                  {isVi ? "Hủy" : "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExecuteExport}
                  disabled={exportLoading}
                >
                  {exportLoading ? (isVi ? "Đang đóng gói..." : "Generating...") : (isVi ? "Xác nhận xuất hồ sơ" : "Confirm Export")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          KHỐI 2D: GIỚI HẠN KỸ THUẬT ĐÃ BIẾT (Known Limitations)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
              {isVi ? "Khối 2D: Các Giới Hạn Kỹ Thuật Đã Biết (Known Limitations)" : "2D: Known Technical Limitations"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              {isVi ? "Danh mục các ràng buộc kiến trúc, rủi ro và phạm vi nghiệm thu chính thức" : "Architectural boundaries, threat models and operational constraints"}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLimitations}
            disabled={limitationsLoading}
          >
            <RefreshCw size={13} className={limitationsLoading ? "spin" : ""} style={{ marginRight: 6 }} />
            {isVi ? "Làm mới" : "Refresh"}
          </Button>
        </div>

        {limitationsLoading && limitations.length === 0 ? (
          <div style={{ padding: "16px", color: "var(--text-3)", fontSize: 13 }}>{isVi ? "Đang tải danh sách giới hạn..." : "Loading limitations..."}</div>
        ) : limitations.length === 0 ? (
          <div style={{ padding: "16px", color: "var(--text-4)", fontSize: 13 }}>{isVi ? "Không có giới hạn kỹ thuật nào được khai báo." : "No known limitations reported."}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {limitations.map((lim) => (
              <div
                key={lim.id}
                style={{
                  background: "var(--surface-subtle, #f8fafc)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Badge variant="warning" style={{ fontWeight: 700 }}>
                    {lim.id}
                  </Badge>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>
                    {String(lim.title || "")}
                  </span>
                </div>
                {/* Render Text thuần túy, tuyệt đối không dangerouslySetInnerHTML */}
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {String(lim.description || "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
