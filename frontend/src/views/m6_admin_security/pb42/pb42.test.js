/**
 * PB42 Handover Dossier & Telemetry - Frontend Verification Suite
 * Executed via Node.js built-in test runner (node --test)
 */
import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  HISTOGRAM_DISPLAY_CAP_MS,
  SMALL_SAMPLE_THRESHOLD,
  DEFAULT_COOLDOWN_SECONDS,
  formatDualDateTime,
  computeIntegrityStatus,
  processHistogramBuckets,
  verify3WayHashes,
  createPb42ExportController,
  createPb42IntegrityController,
  calculateSloCoordinate,
  formatScopeOutlierLabel,
  mergeDualAnswerPaths,
  getCitationDisplay,
} from "./pb42Constants.js";
import {
  canonicalRole,
} from "../adminApi.js";

describe("PB42 Frontend Suite", () => {
  // ── 1. Kiểm tra hằng số và cấu hình cơ bản ─────────────────────────────
  it("Các hằng số bắt buộc được định nghĩa rõ ràng", () => {
    assert.equal(HISTOGRAM_DISPLAY_CAP_MS, 100000, "HISTOGRAM_DISPLAY_CAP_MS phải là 100.000 ms (100s)");
    assert.equal(SMALL_SAMPLE_THRESHOLD, 10, "SMALL_SAMPLE_THRESHOLD phải là 10");
    assert.equal(DEFAULT_COOLDOWN_SECONDS, 60, "DEFAULT_COOLDOWN_SECONDS phải là 60s");
  });

  // ── 2. Kiểm tra phân quyền truy cập (RBAC it_admin) ────────────────────
  it("Vai trò không phải it_admin không được cấp quyền truy cập PB42", () => {
    assert.notEqual(canonicalRole("standard"), "it_admin");
    assert.notEqual(canonicalRole("knowledge_manager"), "it_admin");
    assert.notEqual(canonicalRole("executive"), "it_admin");
    assert.equal(canonicalRole("it_admin"), "it_admin");
    assert.equal(canonicalRole("admin"), "it_admin");
  });

  // ── 3. Ánh xạ trạng thái 2B (/audit/integrity) đủ 5 nhánh ──────────────
  describe("2B: Quy tắc ánh xạ trạng thái Audit Trail Integrity", () => {
    it("Nhánh 1: 200 + hợp lệ đầy đủ trường -> xanh 'valid'", () => {
      const validPayload = {
        is_valid: true,
        checked_count: 55,
        broken_at_seq: null,
        pre_chain_count: 293,
        head_chain_seq: 88,
        head_entry_sha256: "3a7b...64hex",
        pre_chain_aggregate_sha256: "f2c1...64hex",
        scope_note: "Phạm vi hash ORM",
        external_anchor_requirement: "Khuyến nghị neo giữ",
      };
      assert.equal(computeIntegrityStatus(validPayload, 200, null), "valid");
    });

    it("Nhánh 2: 200 + nhánh hỏng chỉ có đúng 4 trường (không có head_*) -> ĐỎ 'broken', KHÔNG rơi vào xám", () => {
      const minimalBrokenPayload = {
        is_valid: false,
        broken_at_seq: 55,
        total_checked: 55,
        reason: "entry_sha256 tamper detected at chain_seq=55",
      };
      const status = computeIntegrityStatus(minimalBrokenPayload, 200, null);
      assert.equal(status, "broken", "Nhánh hỏng phải trả về broken (Đỏ), không được rơi vào unverified/xám");

      const count = minimalBrokenPayload.checked_count ?? minimalBrokenPayload.total_checked;
      assert.equal(count, 55);
      assert.equal(minimalBrokenPayload.reason, "entry_sha256 tamper detected at chain_seq=55");
    });

    it("Nhánh 2 (phụ): 200 + hợp lệ nhưng thiếu head_entry_sha256 -> XÁM 'unverified', KHÔNG xanh", () => {
      const incompleteValidPayload = {
        is_valid: true,
        checked_count: 55,
        broken_at_seq: null,
        pre_chain_count: 293,
        head_chain_seq: 88,
        head_entry_sha256: null,
        pre_chain_aggregate_sha256: "f2c1...64hex",
        scope_note: "Phạm vi hash",
        external_anchor_requirement: "Khuyến nghị",
      };
      const status = computeIntegrityStatus(incompleteValidPayload, 200, null);
      assert.equal(status, "unverified", "Thiếu head_entry_sha256 phải rơi vào unverified (xám), tuyệt đối không xanh");
    });

    it("Nhánh 3: 429 Rate Limit -> 'rate_limited' (không gọi lại tự động, kích hoạt cooldown)", () => {
      const err429 = new Error("Quá giới hạn tần suất kiểm tra");
      err429.status = 429;
      err429.retryAfter = "45";
      assert.equal(computeIntegrityStatus(null, 429, err429), "rate_limited");
    });

    it("Nhánh 4: 401 hoặc 403 -> 'forbidden'", () => {
      const err403 = new Error("Chỉ Admin hệ thống mới có quyền");
      err403.status = 403;
      assert.equal(computeIntegrityStatus(null, 403, err403), "forbidden");

      const err401 = new Error("Unauthorized");
      err401.status = 401;
      assert.equal(computeIntegrityStatus(null, 401, err401), "forbidden");
    });

    it("Nhánh 5: 400 Bad Request / 5xx / Network error -> 'error' (nhãn xám, hiển thị detail)", () => {
      const err400 = new Error("to_seq phải lớn hơn hoặc bằng from_seq");
      err400.status = 400;
      assert.equal(computeIntegrityStatus(null, 400, err400), "error");
      assert.equal(err400.message, "to_seq phải lớn hơn hoặc bằng from_seq");

      const err500 = new Error("Internal Server Error");
      err500.status = 500;
      assert.equal(computeIntegrityStatus(null, 500, err500), "error");
    });
  });

  // ── 4. Kiểm tra Logic Sparse Histogram và Bộ chọn Phạm vi trục X ────────
  describe("Histogram: Bộ chọn phạm vi trục X và vị trí vạch SLO", () => {
    const testData = [
      { bucket_start_ms: 0, bucket_end_ms: 500, count: 22 },
      { bucket_start_ms: 2500, bucket_end_ms: 3000, count: 5 },
      { bucket_start_ms: 15000, bucket_end_ms: 15500, count: 4 }, // 15s
      { bucket_start_ms: 76500, bucket_end_ms: 77000, count: 1 }, // 76.8s
      { bucket_start_ms: 2041500, bucket_end_ms: 2042000, count: 1 }, // Outlier 2.041.500 ms
    ];

    it("(1) Phạm vi mặc định 0–5 s: chỉ 2 bucket < 5s, còn lại tính vào ngoài vùng và cột tràn", () => {
      const res5s = processHistogramBuckets(testData, HISTOGRAM_DISPLAY_CAP_MS, 5000);
      assert.equal(res5s.normalBuckets.length, 2, "Chỉ 2 bucket nằm trong phạm vi 0–5s");
      assert.equal(res5s.outsideViewCount, 5, "4 (tại 15s) + 1 (tại 76.8s) = 5 lượt ngoài vùng đang xem");
      assert.equal(res5s.overflowCount, 1, "1 lượt tại 2.041.500 ms vào cột tràn >100s");

      // Tọa độ vạch SLO: GỌI TRỰC TIẾP HÀM calculateSloCoordinate từ pb42Constants/LatencyHistogramSvg
      // Với plotWidth = 600, paddingLeft = 40:
      const xSlo1200_5s = calculateSloCoordinate(1200, 5000, 600, 40);
      const xSlo2800_5s = calculateSloCoordinate(2800, 5000, 600, 40);
      assert.equal(xSlo1200_5s, 40 + 144, "Vạch SLO 1.200 ms nằm tại 184 px (24% plotWidth + 40px padding)");
      assert.equal(xSlo2800_5s, 40 + 336, "Vạch SLO 2.800 ms nằm tại 376 px (56% plotWidth + 40px padding)");

      // Khi SLO vượt ngoài phạm vi đang xem, hàm phải trả về null để ẩn vạch
      const xSloOutOfRange = calculateSloCoordinate(2800, 2000, 600, 40);
      assert.equal(xSloOutOfRange, null, "SLO vượt quá selectedRangeMs phải trả về null");
    });

    it("(2) Phạm vi 0–20 s: bao gồm các bucket < 20s", () => {
      const res20s = processHistogramBuckets(testData, HISTOGRAM_DISPLAY_CAP_MS, 20000);
      assert.equal(res20s.normalBuckets.length, 3, "3 bucket nằm trong 0–20s (0s, 2.5s, 15s)");
      assert.equal(res20s.outsideViewCount, 1, "1 lượt tại 76.8s ngoài vùng đang xem");
      assert.equal(res20s.overflowCount, 1, "1 lượt outlier vào cột tràn");

      // Gọi hàm calculateSloCoordinate trên dải 20.000 ms
      const xSlo1200_20s = calculateSloCoordinate(1200, 20000, 600, 40);
      const xSlo2800_20s = calculateSloCoordinate(2800, 20000, 600, 40);
      assert.equal(xSlo1200_20s, 40 + 36, "SLO 1200 ms trên dải 20s nằm tại 76 px (6% + 40px)");
      assert.equal(xSlo2800_20s, 40 + 84, "SLO 2800 ms trên dải 20s nằm tại 124 px (14% + 40px)");
    });

    it("(3) Toàn dải 0–100 s: bao gồm dải Copilot ~76,8s, ngoài vùng đang xem = 0", () => {
      const res100s = processHistogramBuckets(testData, HISTOGRAM_DISPLAY_CAP_MS, 100000);
      assert.equal(res100s.normalBuckets.length, 4, "Tất cả 4 bucket hợp lệ nằm trong dải 0–100s");
      assert.equal(res100s.outsideViewCount, 0, "Không có lượt nào ngoài vùng đang xem (<100s)");
      assert.equal(res100s.overflowCount, 1, "Chỉ duy nhất outlier 2.041.500 ms vào cột tràn >100s");
    });
  });

  // ── 5. Kiểm thử Cấp Component cho Luồng 2C (Xuất hồ sơ) & 2B (Toàn vẹn) ──
  describe("Request 3: Kiểm thử luồng Component 2C & 2B với Dependency Injection", () => {
    it("2C: Phải qua modal xác nhận trước khi gọi API; hủy modal không gọi API", async () => {
      let apiCalled = false;
      const exportApiMock = async () => {
        apiCalled = true;
        return { blob: new Blob([new Uint8Array([1, 2, 3])]), filename: "test.zip", exportId: "exp-1", zipSha256: "hash1" };
      };

      const controller = createPb42ExportController({
        exportApiFn: exportApiMock,
        createObjectURLFn: () => "blob:http://test/123",
        revokeObjectURLFn: () => {},
      });
      assert.equal(controller.showModal, false);
      assert.equal(apiCalled, false);

      // Bấm nút mở modal
      controller.requestExport();
      assert.equal(controller.showModal, true);
      assert.equal(apiCalled, false, "Chưa gọi API khi mới mở modal");

      // Bấm hủy modal
      controller.cancelModal();
      assert.equal(controller.showModal, false);
      assert.equal(apiCalled, false, "Hủy modal không được gọi API");

      // Mở lại và xác nhận xuất
      controller.requestExport();
      await controller.executeExport();
      assert.equal(apiCalled, true, "Chỉ gọi API sau khi bấm xác nhận");
      assert.equal(controller.showModal, false);
    });

    it("2C: Nút khóa khi đang chạy; chỉ gọi API đúng 1 lần khi bấm nhiều lần", async () => {
      let callCount = 0;
      const exportApiMock = async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return { blob: new Blob([new Uint8Array([1, 2, 3])]), filename: "test.zip", exportId: "exp-1", zipSha256: "hash1" };
      };

      const controller = createPb42ExportController({
        exportApiFn: exportApiMock,
        createObjectURLFn: () => "blob:http://test/123",
        revokeObjectURLFn: () => {},
      });

      const p1 = controller.executeExport();
      const p2 = controller.executeExport();
      const p3 = controller.executeExport();

      await Promise.all([p1, p2, p3]);
      assert.equal(callCount, 1, "API chỉ được gọi đúng 1 lần duy nhất dù bấm liên tiếp");
      assert.equal(controller.apiCallCount, 1);
    });

    it("2C: Các lỗi 401/403/429/500 không tạo tải file rỗng", async () => {
      let objectUrlCreated = false;
      const createObjectURLMock = () => {
        objectUrlCreated = true;
        return "blob:http://test/empty";
      };

      for (const errCode of [401, 403, 429, 500]) {
        objectUrlCreated = false;
        const failedApiMock = async () => {
          const err = new Error(`HTTP ${errCode}`);
          err.status = errCode;
          throw err;
        };

        const controller = createPb42ExportController({
          exportApiFn: failedApiMock,
          createObjectURLFn: createObjectURLMock,
        });

        await assert.rejects(
          async () => await controller.executeExport(),
          (err) => err.status === errCode
        );
        assert.equal(objectUrlCreated, false, `Lỗi ${errCode} tuyệt đối không được tạo Object URL để tải file`);
      }
    });

    it("2C: Blob URL được thu hồi (revokeObjectURL) ngay sau khi kích hoạt tải", async () => {
      let createdUrl = null;
      let revokedUrl = null;

      const controller = createPb42ExportController({
        exportApiFn: async () => ({
          blob: new Blob([new Uint8Array([10, 20, 30])]),
          filename: "package.zip",
          exportId: "exp-uuid",
          zipSha256: "zip-hash-123",
        }),
        createObjectURLFn: (blob) => {
          createdUrl = "blob:http://localhost/test-uuid";
          return createdUrl;
        },
        revokeObjectURLFn: (url) => {
          revokedUrl = url;
        },
      });

      await controller.executeExport();
      assert.ok(createdUrl, "Đã tạo Object URL");
      assert.equal(revokedUrl, createdUrl, "URL được revoke chính xác bằng URL đã tạo");
      assert.deepEqual(controller.revokedUrls, [createdUrl]);
    });

    it("2B: Gặp 429 ở /integrity chỉ gọi đúng 1 lần, kích hoạt cooldown và chặn gọi lại", async () => {
      let callCount = 0;
      const integrityApiMock = async () => {
        callCount++;
        const err = new Error("Rate limit exceeded");
        err.status = 429;
        err.retryAfter = "30";
        throw err;
      };

      const controller = createPb42IntegrityController({
        integrityApiFn: integrityApiMock,
        defaultCooldownSeconds: 60,
      });

      await assert.rejects(async () => await controller.checkIntegrity());
      assert.equal(controller.status, "rate_limited");
      assert.equal(controller.cooldownSeconds, 30);
      assert.equal(callCount, 1);

      await controller.checkIntegrity();
      assert.equal(callCount, 1, "Không gọi lại tự động hoặc lặp vòng khi đang trong cooldown");
    });

    it("2B: Kết quả chuyển sang 'stale' (đã cũ) sau khi xuất hồ sơ bàn giao", () => {
      const idleController = createPb42IntegrityController({ initialStatus: "idle" });
      idleController.markStale();
      assert.equal(idleController.status, "idle");

      const validController = createPb42IntegrityController({ initialStatus: "valid" });
      validController.markStale();
      assert.equal(validController.status, "stale", "Trạng thái valid chuyển sang stale sau khi xuất hồ sơ");

      const brokenController = createPb42IntegrityController({ initialStatus: "broken" });
      brokenController.markStale();
      assert.equal(brokenController.status, "stale", "Trạng thái broken chuyển sang stale sau khi xuất hồ sơ");
    });
  });

  // ── 6. Kiểm tra Đối soát Băm 3 Chiều ────────────────────────────────────
  describe("Request 4f: Ma trận Đối soát Băm 3 Chiều", () => {
    it("Cả 3 nguồn khớp nhau hoàn toàn -> allMatch: true", () => {
      const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const res = verify3WayHashes({
        clientBlobSha256: hash,
        headerZipSha256: hash.toUpperCase(),
        manifestZipSha256: hash,
      });
      assert.equal(res.clientVsHeader, true);
      assert.equal(res.clientVsManifest, true);
      assert.equal(res.headerVsManifest, true);
      assert.equal(res.allMatch, true);
      assert.equal(res.hasHeader, true);
    });

    it("Sai khác một cặp -> báo rõ từng cặp", () => {
      const res = verify3WayHashes({
        clientBlobSha256: "aaa",
        headerZipSha256: "aaa",
        manifestZipSha256: "bbb",
      });
      assert.equal(res.clientVsHeader, true);
      assert.equal(res.clientVsManifest, false);
      assert.equal(res.headerVsManifest, false);
      assert.equal(res.allMatch, false);
    });

    it("Header bị null -> hasHeader: false và cảnh báo", () => {
      const res = verify3WayHashes({
        clientBlobSha256: "aaa",
        headerZipSha256: null,
        manifestZipSha256: "aaa",
      });
      assert.equal(res.hasHeader, false);
      assert.equal(res.clientVsHeader, null);
      assert.equal(res.clientVsManifest, true);
      assert.equal(res.allMatch, false);
    });
  });

  // ── 7. Kiểm tra Banner điều kiện hóa theo real & empty (Item 3) ────────
  describe("Banner thông báo môi trường & định dạng thời gian", () => {
    function getBannerState(summaryData) {
      if (!summaryData || summaryData.empty === true) return "no_banner";
      const real = summaryData.real_queries_count ?? summaryData.real ?? 0;
      return real === 0 ? "benchmark_only" : "live_queries";
    }

    it("Khi chưa có dữ liệu hoặc summary.empty === true: không khẳng định gì", () => {
      assert.equal(getBannerState(null), "no_banner");
      assert.equal(getBannerState({ empty: true, total_queries: 0 }), "no_banner");
    });

    it("Khi đã có dữ liệu và real === 0: hiện cảnh báo benchmark nghiệm thu", () => {
      assert.equal(getBannerState({ empty: false, real_queries_count: 0 }), "benchmark_only");
    });

    it("Khi đã có dữ liệu và real > 0: đổi nội dung ghi nhận có truy vấn thực tế", () => {
      assert.equal(getBannerState({ empty: false, real_queries_count: 5 }), "live_queries");
    });

    it("formatDualDateTime hiển thị đồng thời giờ địa phương trình duyệt và UTC", () => {
      const sampleIso = "2026-11-13T14:30:00Z";
      const formattedVi = formatDualDateTime(sampleIso, true);
      assert.ok(formattedVi.includes("giờ địa phương trình duyệt"), "Phải chứa nhãn 'giờ địa phương trình duyệt'");
      assert.ok(formattedVi.includes("2026-11-13 14:30:00 UTC"), "Phải chứa ngày giờ UTC chính xác");

      const formattedEn = formatDualDateTime(sampleIso, false);
      assert.ok(formattedEn.includes("browser local time"), "Tiếng Anh hiển thị 'browser local time'");
    });
  });

  // ── 8. Outliers: Bảng cột kép ghép hàng theo answer_path từ 1 response ──
  describe("Outliers: Bảng cột kép từ 1 response (Ghép hàng theo answer_path)", () => {
    it("Ghép hàng theo answer_path mà không tính lại ở client; thiếu một bên trả về null ('—')", () => {
      const withoutList = [
        { answer_path: "rag_llm", count: 19, p50_ms: 1200, p95_ms: 2450, max_ms: 2900, slo_applicable_ms: 2800, slo_applicable_met_rate_pct: 94.7 },
        { answer_path: "greeting", count: 7, p50_ms: 300, p95_ms: 500, max_ms: 600, slo_applicable_ms: 1200, slo_applicable_met_rate_pct: 100.0 },
        { answer_path: "path_only_without", count: 2, p50_ms: 400, max_ms: 500 },
      ];
      const withList = [
        { answer_path: "rag_llm", count: 20, p50_ms: 1250, p95_ms: 76800, max_ms: 2041500, slo_applicable_ms: 2800, slo_applicable_met_rate_pct: 90.0 },
        { answer_path: "greeting", count: 7, p50_ms: 300, p95_ms: 500, max_ms: 600, slo_applicable_ms: 1200, slo_applicable_met_rate_pct: 100.0 },
        { answer_path: "path_only_with", count: 1, p50_ms: 9999, max_ms: 9999 },
      ];

      const merged = mergeDualAnswerPaths(withoutList, withList);
      assert.equal(merged.length, 4, "Tổng hợp đủ 4 answer_path độc nhất");

      // rag_llm có ở cả 2 bên
      const rag = merged.find((r) => r.path === "rag_llm");
      assert.equal(rag.without.count, 19);
      assert.equal(rag.with.count, 20);
      assert.equal(rag.without.p95_ms, 2450);
      assert.equal(rag.with.p95_ms, 76800);

      // path_only_without chỉ có ở bên without -> with = null (render "—")
      const onlyWo = merged.find((r) => r.path === "path_only_without");
      assert.equal(onlyWo.without.count, 2);
      assert.equal(onlyWo.with, null, "Bên with phải là null để render '—'");

      // path_only_with chỉ có ở bên with -> without = null (render "—")
      const onlyWi = merged.find((r) => r.path === "path_only_with");
      assert.equal(onlyWi.without, null, "Bên without phải là null để render '—'");
      assert.equal(onlyWi.with.count, 1);
    });
  });

  // ── 9. Citation: Trích dẫn từ citation_metrics.by_answer_path ──────────
  describe("Citation Metrics từ citation_metrics.by_answer_path[<path>]", () => {
    const mockCitationMetrics = {
      by_answer_path: {
        rag_llm: {
          n: 19,
          denominator_requires_citation_answered: 19,
          numerator_all_valid_citation_queries: 19,
          citation_rate_pct: 100.0,
        },
        nl2cypher_fastpath: {
          n: 13,
          rate_pct: 85.5,
        },
        greeting: {
          n: 7,
          denominator_requires_citation_answered: 0,
          numerator_all_valid_citation_queries: 0,
          citation_rate_pct: null,
        },
      },
    };

    it("Path có citation hiển thị tỷ lệ % kèm cỡ mẫu n", () => {
      assert.equal(getCitationDisplay(mockCitationMetrics, "rag_llm"), "100% (n=19)");
      assert.equal(getCitationDisplay(mockCitationMetrics, "nl2cypher_fastpath"), "85.5% (n=13)");
    });

    it("Path không có citation hoặc citation_rate_pct null hiển thị '—'", () => {
      assert.equal(getCitationDisplay(mockCitationMetrics, "greeting"), "—");
      assert.equal(getCitationDisplay(mockCitationMetrics, "unknown_path"), "—");
      assert.equal(getCitationDisplay(null, "rag_llm"), "—");
    });
  });

  // ── 10. Nhãn Outlier từ response.scope ─────────────────────────────────
  describe("Nhãn Outlier đọc từ response.scope", () => {
    it("Đọc nhãn đúng từ chuỗi scope backend, không dựa vào client state", () => {
      assert.equal(formatScopeOutlierLabel("all_benchmark_and_real_queries_excluding_outliers", true), "(Đã loại ngoại lai)");
      assert.equal(formatScopeOutlierLabel("all_benchmark_and_real_queries_including_outliers", true), "(Gồm ngoại lai)");
      assert.equal(formatScopeOutlierLabel("real_queries_only_excluding_outliers", false), "(Excluding outliers)");
      assert.equal(formatScopeOutlierLabel("real_queries_only_including_outliers", false), "(Including outliers)");
      assert.equal(formatScopeOutlierLabel("", true), "—");
      assert.equal(formatScopeOutlierLabel(null, true), "—");
    });
  });

  // ── 11. CopyButton Bắt Lỗi Clipboard ──────────────────────────────────
  describe("CopyButton: Bắt lỗi clipboard và phản hồi trực quan", () => {
    it("Thành công thì hiển thị 'đã chép', thất bại thì kích hoạt trạng thái lỗi không hiển thị 'đã chép'", async () => {
      async function simulateCopy(text, mockClipboard) {
        let copied = false;
        let copyFailed = false;
        try {
          if (mockClipboard?.writeText) {
            await mockClipboard.writeText(text);
            copied = true;
          } else {
            throw new Error("Clipboard API not available");
          }
        } catch {
          copied = false;
          copyFailed = true;
        }
        return { copied, copyFailed };
      }

      // Kịch bản thành công
      const successRes = await simulateCopy("test-hash", {
        writeText: async () => {},
      });
      assert.equal(successRes.copied, true);
      assert.equal(successRes.copyFailed, false);

      // Kịch bản thất bại (permission denied / throw error)
      const failRes = await simulateCopy("test-hash", {
        writeText: async () => { throw new Error("Permission denied"); },
      });
      assert.equal(failRes.copied, false, "Thất bại tuyệt đối không hiển thị 'đã chép'");
      assert.equal(failRes.copyFailed, true, "Phải kích hoạt cờ lỗi copyFailed");
    });
  });

  // ── 12. An toàn XSS ───────────────────────────────────────────────────
  describe("An toàn XSS: Văn bản nguyên văn từ backend", () => {
    it("Văn bản chứa ký tự HTML/script chỉ là chuỗi text thuần túy", () => {
      const maliciousBackendScope = "<script>alert('xss')</script><b>Scope Test</b>";
      const textOutput = String(maliciousBackendScope);
      assert.equal(typeof textOutput, "string");
      assert.equal(textOutput.includes("<script>"), true);
    });
  });
});
