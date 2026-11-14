/**
 * PB42 Handover Dossier & Telemetry - Module Constants, Helpers, and Controllers
 */

export const HISTOGRAM_DISPLAY_CAP_MS = 100000; // 100.000 ms = 100s (bao phủ dải dữ liệu hợp lệ đến ~76,8s)
export const SMALL_SAMPLE_THRESHOLD = 10;
export const DEFAULT_COOLDOWN_SECONDS = 60;

export function bufferToHex(buffer) {
  if (!buffer) return "";
  const byteArray = new Uint8Array(buffer);
  let hexString = "";
  for (let i = 0; i < byteArray.byteLength; i++) {
    hexString += byteArray[i].toString(16).padStart(2, "0");
  }
  return hexString;
}

export function formatDualDateTime(dtStr, isVi = true) {
  if (!dtStr) return "—";
  try {
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) return String(dtStr);
    const utcStr = dt.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
    const localStr = dt.toLocaleString(isVi ? "vi-VN" : "en-US", { hour12: false });
    const localLabel = isVi ? "giờ địa phương trình duyệt" : "browser local time";
    return `${localStr} (${localLabel}) / ${utcStr}`;
  } catch {
    return String(dtStr);
  }
}

/**
 * Tính tọa độ pixel X của vạch SLO trên đồ thị SVG dựa trên dải đang xem
 */
export function calculateSloCoordinate(sloVal, selectedRangeMs, plotWidth = 600, paddingLeft = 40) {
  if (!sloVal || !selectedRangeMs || selectedRangeMs <= 0) return null;
  if (sloVal > selectedRangeMs) return null; // Vượt ngoài vùng đang xem
  return Number((paddingLeft + (sloVal / selectedRangeMs) * plotWidth).toFixed(2));
}

/**
 * Đọc nhãn gồm/loại ngoại lai từ response.scope thay vì client state
 */
export function formatScopeOutlierLabel(scope, isVi = true) {
  if (!scope || typeof scope !== "string") return "—";
  if (scope.includes("excluding_outliers")) {
    return isVi ? "(Đã loại ngoại lai)" : "(Excluding outliers)";
  }
  if (scope.includes("including_outliers")) {
    return isVi ? "(Gồm ngoại lai)" : "(Including outliers)";
  }
  return scope;
}

/**
 * Ghép hàng theo answer_path từ 2 mảng without_outliers_by_answer_path và with_outliers_by_answer_path
 * Tuyệt đối không tính lại số liệu ở client; thiếu một bên hiển thị "—"
 */
export function mergeDualAnswerPaths(withoutList = [], withList = []) {
  const map = new Map();
  if (Array.isArray(withoutList)) {
    withoutList.forEach((item) => {
      if (item && item.answer_path) {
        map.set(item.answer_path, { path: item.answer_path, without: item, with: null });
      }
    });
  }
  if (Array.isArray(withList)) {
    withList.forEach((item) => {
      if (item && item.answer_path) {
        if (!map.has(item.answer_path)) {
          map.set(item.answer_path, { path: item.answer_path, without: null, with: item });
        } else {
          map.get(item.answer_path).with = item;
        }
      }
    });
  }
  return Array.from(map.values());
}

/**
 * Lấy chuỗi hiển thị Citation rate từ citation_metrics.by_answer_path[<path>].rate_pct (+ n)
 */
export function getCitationDisplay(citationMetrics, path, fallbackN = null) {
  if (!citationMetrics?.by_answer_path || !path) return "—";
  const citObj = citationMetrics.by_answer_path[path];
  if (!citObj) return "—";
  const rate = citObj.rate_pct ?? citObj.citation_rate_pct;
  if (rate === null || rate === undefined) return "—";
  const n = citObj.n ?? fallbackN;
  return n != null ? `${rate}% (n=${n})` : `${rate}%`;
}

export function computeIntegrityStatus(res, httpStatus, err) {
  if (err) {
    if (err.status === 429) return "rate_limited";
    if (err.status === 401 || err.status === 403) return "forbidden";
    if (err.status === 400) return "error";
    return "error";
  }

  if (res?.is_valid === true) {
    const hasAllRequired =
      res.checked_count !== undefined &&
      res.broken_at_seq === null &&
      res.pre_chain_count !== undefined &&
      res.head_chain_seq !== undefined &&
      Boolean(res.head_entry_sha256) &&
      Boolean(res.pre_chain_aggregate_sha256) &&
      Boolean(res.scope_note) &&
      Boolean(res.external_anchor_requirement);

    return hasAllRequired ? "valid" : "unverified";
  }

  if (res?.is_valid === false) {
    return "broken";
  }

  return "error";
}

export function processHistogramBuckets(data = [], capMs = HISTOGRAM_DISPLAY_CAP_MS, viewRangeMs = 5000) {
  const normal = [];
  let outsideViewCount = 0;
  let overflow = 0;
  let minOverflow = Infinity;
  let maxOverflow = 0;
  let total = 0;

  for (const b of data) {
    const c = Number(b.count) || 0;
    total += c;
    const start = Number(b.bucket_start_ms) || 0;
    const end = Number(b.bucket_end_ms) || start + 500;

    if (start >= capMs) {
      overflow += c;
      if (start < minOverflow) minOverflow = start;
      if (end > maxOverflow) maxOverflow = end;
    } else if (start < viewRangeMs) {
      normal.push({
        start,
        end,
        count: c,
        pct: b.pct ?? 0,
      });
    } else {
      outsideViewCount += c;
    }
  }

  const maxCount = Math.max(1, ...normal.map((b) => b.count), overflow);
  return {
    normalBuckets: normal,
    outsideViewCount,
    overflowCount: overflow,
    overflowBucketRange: overflow > 0 ? { min: minOverflow, max: maxOverflow } : null,
    maxCount,
    totalCount: total,
    isEmpty: total === 0,
  };
}

/**
 * Đối soát băm 3 chiều: Client Blob SHA-256 vs Header X-Handover-Zip-SHA256 vs Manifest zip_sha256
 */
export function verify3WayHashes({ clientBlobSha256, headerZipSha256, manifestZipSha256 }) {
  const c = clientBlobSha256?.toLowerCase() || "";
  const h = headerZipSha256?.toLowerCase() || "";
  const m = manifestZipSha256?.toLowerCase() || "";

  return {
    clientBlobSha256: c || null,
    headerZipSha256: h || null,
    manifestZipSha256: m || null,
    hasHeader: Boolean(h),
    clientVsHeader: Boolean(c && h) ? c === h : null,
    clientVsManifest: Boolean(c && m) ? c === m : null,
    headerVsManifest: Boolean(h && m) ? h === m : null,
    allMatch: Boolean(c && h && m) && c === h && h === m,
  };
}

/**
 * Controller cho luồng Xuất Hồ sơ Bàn giao (Khối 2C)
 * Hỗ trợ Dependency Injection phục vụ kiểm thử cấp component không cần cài thêm thư viện
 */
export function createPb42ExportController({
  exportApiFn,
  createObjectURLFn = (blob) => URL.createObjectURL(blob),
  revokeObjectURLFn = (url) => URL.revokeObjectURL(url),
  cryptoDigestFn = null,
} = {}) {
  let showModal = false;
  let exportLoading = false;
  let lastResult = null;
  let lastError = null;
  let revokedUrls = [];
  let apiCallCount = 0;

  return {
    get showModal() { return showModal; },
    get exportLoading() { return exportLoading; },
    get lastResult() { return lastResult; },
    get lastError() { return lastError; },
    get revokedUrls() { return revokedUrls; },
    get apiCallCount() { return apiCallCount; },

    requestExport() {
      showModal = true;
      lastError = null;
    },

    cancelModal() {
      showModal = false;
    },

    async executeExport() {
      if (exportLoading) {
        return;
      }
      exportLoading = true;
      lastError = null;

      try {
        apiCallCount++;
        const res = await exportApiFn();
        const { blob, filename, exportId, zipSha256 } = res;

        const url = createObjectURLFn(blob);
        revokeObjectURLFn(url);
        revokedUrls.push(url);

        let clientSha256 = null;
        if (cryptoDigestFn) {
          clientSha256 = await cryptoDigestFn(blob);
        }

        lastResult = {
          exportId,
          filename,
          zipSha256,
          clientSha256,
        };
        showModal = false;
        return lastResult;
      } catch (err) {
        lastError = err;
        throw err;
      } finally {
        exportLoading = false;
      }
    },
  };
}

/**
 * Controller cho luồng Kiểm tra Toàn vẹn (Khối 2B)
 */
export function createPb42IntegrityController({
  integrityApiFn,
  initialStatus = "idle",
  defaultCooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
} = {}) {
  let status = initialStatus;
  let loading = false;
  let data = null;
  let errorMsg = "";
  let cooldownSeconds = 0;
  let apiCallCount = 0;

  return {
    get status() { return status; },
    get loading() { return loading; },
    get data() { return data; },
    get errorMsg() { return errorMsg; },
    get cooldownSeconds() { return cooldownSeconds; },
    get apiCallCount() { return apiCallCount; },

    markStale() {
      if (status === "valid" || status === "broken") {
        status = "stale";
      }
    },

    async checkIntegrity() {
      if (loading || cooldownSeconds > 0) {
        return;
      }

      loading = true;
      errorMsg = "";

      try {
        apiCallCount++;
        const res = await integrityApiFn();
        data = res;
        status = computeIntegrityStatus(res, 200, null);
        return res;
      } catch (err) {
        data = null;
        status = computeIntegrityStatus(null, err.status || 500, err);
        if (err.status === 429) {
          cooldownSeconds = Number(err.retryAfter) || defaultCooldownSeconds;
          errorMsg = "Hệ thống đang giới hạn tần suất kiểm tra toàn vẹn. Vui lòng đợi trong giây lát và thử lại.";
        } else {
          errorMsg = err.message || "Lỗi kiểm tra toàn vẹn";
        }
        throw err;
      } finally {
        loading = false;
      }
    },
  };
}
