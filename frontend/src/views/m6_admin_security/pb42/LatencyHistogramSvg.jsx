import React, { useState, useMemo } from "react";
import { HISTOGRAM_DISPLAY_CAP_MS, processHistogramBuckets, calculateSloCoordinate } from "./pb42Constants";

export { HISTOGRAM_DISPLAY_CAP_MS, calculateSloCoordinate };

export const RANGE_OPTIONS = [
  { value: 5000, labelVi: "0 – 5s (Mặc định)", labelEn: "0 – 5s (Default)" },
  { value: 20000, labelVi: "0 – 20s", labelEn: "0 – 20s" },
  { value: 100000, labelVi: "Toàn dải (0 – 100s)", labelEn: "Full Range (0 – 100s)" },
];

export default function LatencyHistogramSvg({
  histogramData = [],
  sloThresholdsMs = [],
  displayCapMs = HISTOGRAM_DISPLAY_CAP_MS,
  defaultRangeMs = 5000,
  height = 255,
  lang = "vi",
}) {
  const isVi = lang === "vi";
  const [selectedRangeMs, setSelectedRangeMs] = useState(defaultRangeMs);

  const {
    normalBuckets,
    outsideViewCount,
    overflowCount,
    overflowBucketRange,
    maxCount,
    totalCount,
    isEmpty,
  } = useMemo(() => {
    return processHistogramBuckets(histogramData, displayCapMs, selectedRangeMs);
  }, [histogramData, displayCapMs, selectedRangeMs]);

  // Kích thước khung vẽ SVG
  const width = 760;
  const padding = { top: 32, right: 80, bottom: 44, left: 45 };
  const overflowColWidth = 50;
  const gapBeforeOverflow = 16;
  const plotWidth = width - padding.left - padding.right - overflowColWidth - gapBeforeOverflow;
  const plotHeight = height - padding.top - padding.bottom;

  // Tính tọa độ y theo tỷ lệ tuyến tính
  const getY = (count) => {
    return padding.top + plotHeight - (count / maxCount) * plotHeight;
  };

  // Vị trí trục x theo giá trị ms tuyến tính trong phạm vi selectedRangeMs
  const getX = (ms) => {
    return calculateSloCoordinate(ms, selectedRangeMs, plotWidth, padding.left) ?? (padding.left + plotWidth);
  };

  // Danh sách vạch chia thời gian ms động theo selectedRangeMs
  const ticks = useMemo(() => {
    const step = selectedRangeMs / 5;
    return [0, step, step * 2, step * 3, step * 4, selectedRangeMs];
  }, [selectedRangeMs]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Bộ chọn phạm vi trục X */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>
            {isVi ? "Phạm vi hiển thị trục X:" : "X-Axis Range:"}
          </span>
          <div style={{ display: "inline-flex", background: "var(--surface-muted, #f1f5f9)", borderRadius: "var(--r-md, 6px)", padding: 2, border: "1px solid var(--border)" }}>
            {RANGE_OPTIONS.map((opt) => {
              const active = selectedRangeMs === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedRangeMs(opt.value)}
                  style={{
                    border: "none",
                    background: active ? "var(--surface, #ffffff)" : "transparent",
                    color: active ? "var(--primary, #2563eb)" : "var(--text-3)",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    borderRadius: "var(--r-sm, 4px)",
                    cursor: "pointer",
                  }}
                >
                  {isVi ? opt.labelVi : opt.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chú thích lượt nằm ngoài vùng đang xem */}
        {outsideViewCount > 0 && (
          <div style={{ fontSize: 11, color: "var(--amber, #d97706)", background: "rgba(245, 158, 11, 0.1)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
            {isVi
              ? `* ${outsideViewCount} lượt nằm ngoài vùng đang xem (từ ${(selectedRangeMs / 1000).toFixed(0)}s đến ${(displayCapMs / 1000).toFixed(0)}s)`
              : `* ${outsideViewCount} queries outside current view`}
          </div>
        )}
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            maxWidth: `${width}px`,
            height: `${height}px`,
            display: "block",
            fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
          }}
          role="img"
          aria-label={isVi ? "Biểu đồ phân bố độ trễ truy vấn (Sparse Histogram)" : "Latency distribution sparse histogram"}
        >
          {/* Nền đồ thị thông thường */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="var(--surface-muted, #f8fafc)"
            stroke="var(--border, #e2e8f0)"
            strokeWidth="1"
            rx="4"
          />

          {/* Nền cột tràn cho ngoại lai vượt cap (displayCapMs) */}
          <rect
            x={padding.left + plotWidth + gapBeforeOverflow}
            y={padding.top}
            width={overflowColWidth}
            height={plotHeight}
            fill="var(--surface-subtle, #f1f5f9)"
            stroke="var(--border, #cbd5e1)"
            strokeWidth="1"
            strokeDasharray="3 3"
            rx="4"
          />

          {/* Trục X và các vạch mốc (Ticks) theo selectedRangeMs */}
          {ticks.map((tVal, tIdx) => {
            const x = getX(tVal);
            const labelSec = (tVal / 1000).toFixed(tVal % 1000 === 0 ? 0 : 1);
            return (
              <g key={`tick-${tVal}-${tIdx}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="var(--border-subtle, #e2e8f0)"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-3, #64748b)"
                >
                  {tVal === 0 ? "0" : `${labelSec}s`}
                </text>
              </g>
            );
          })}

          {/* Nhãn cột tràn (> cap) */}
          <text
            x={padding.left + plotWidth + gapBeforeOverflow + overflowColWidth / 2}
            y={padding.top + plotHeight + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--amber, #d97706)"
          >
            {`> ${(displayCapMs / 1000).toFixed(0)}s`}
          </text>

          {/* Trục Y: mốc 0 và mốc max */}
          <text
            x={padding.left - 8}
            y={padding.top + plotHeight}
            textAnchor="end"
            fontSize="10"
            fill="var(--text-4, #94a3b8)"
            alignmentBaseline="middle"
          >
            0
          </text>
          <text
            x={padding.left - 8}
            y={padding.top + 8}
            textAnchor="end"
            fontSize="10"
            fill="var(--text-4, #94a3b8)"
            alignmentBaseline="middle"
          >
            {maxCount}
          </text>

          {/* Dữ liệu trống trong dải đang xem */}
          {isEmpty && (
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              fontSize="13"
              fill="var(--text-3, #64748b)"
            >
              {isVi ? "Không có dữ liệu trong phạm vi hiển thị này" : "No latency data in this range"}
            </text>
          )}

          {/* Vẽ các cột thông thường trong phạm vi đang xem (selectedRangeMs) */}
          {!isEmpty &&
            normalBuckets.map((b, i) => {
              const x = getX(b.start);
              const nextX = getX(b.end);
              const barW = Math.max(3, nextX - x - 1);
              const barY = getY(b.count);
              const barH = padding.top + plotHeight - barY;

              return (
                <g key={`bar-${b.start}-${i}`}>
                  <rect
                    x={x}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill="var(--primary, #3b82f6)"
                    opacity="0.85"
                    rx="2"
                  >
                    <title>
                      {`[${b.start}ms – ${b.end}ms]: ${b.count} lượt (${b.pct}%)`}
                    </title>
                  </rect>
                  {barH > 14 && barW >= 12 && (
                    <text
                      x={x + barW / 2}
                      y={barY - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="var(--primary, #2563eb)"
                    >
                      {b.count}
                    </text>
                  )}
                </g>
              );
            })}

          {/* Vẽ cột tràn (Overflow bar) nếu có ngoại lai > displayCapMs */}
          {overflowCount > 0 && (
            <g>
              {(() => {
                const ofX = padding.left + plotWidth + gapBeforeOverflow + 5;
                const ofW = overflowColWidth - 10;
                const ofY = getY(overflowCount);
                const ofH = padding.top + plotHeight - ofY;
                const rangeDesc = overflowBucketRange
                  ? ` (từ ${overflowBucketRange.min}ms đến ${overflowBucketRange.max}ms)`
                  : "";

                return (
                  <>
                    <rect
                      x={ofX}
                      y={ofY}
                      width={ofW}
                      height={ofH}
                      fill="var(--amber, #f59e0b)"
                      opacity="0.9"
                      rx="2"
                    >
                      <title>
                        {`Cột tràn [>${(displayCapMs / 1000).toFixed(0)}s]: ${overflowCount} lượt ngoại lai${rangeDesc}`}
                      </title>
                    </rect>
                    <text
                      x={ofX + ofW / 2}
                      y={ofY - 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="var(--amber, #b45309)"
                    >
                      {overflowCount}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Các vạch SLO (nội suy tuyến tính theo selectedRangeMs) */}
          {Array.isArray(sloThresholdsMs) && sloThresholdsMs.length > 0 ? (
            sloThresholdsMs.map((sloVal, sIdx) => {
              const sloX = calculateSloCoordinate(sloVal, selectedRangeMs, plotWidth, padding.left);
              if (sloX === null) return null; // Ẩn vạch nếu vượt quá phạm vi đang xem
              const isFirst = sIdx === 0;
              const strokeColor = isFirst ? "var(--teal, #0d9488)" : "var(--purple, #9333ea)";

              return (
                <g key={`slo-${sloVal}`}>
                  <line
                    x1={sloX}
                    y1={padding.top - 8}
                    x2={sloX}
                    y2={padding.top + plotHeight}
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  {/* Nhãn vạch SLO */}
                  <rect
                    x={sloX - 32}
                    y={padding.top - 24}
                    width="64"
                    height="16"
                    fill="var(--surface, #ffffff)"
                    stroke={strokeColor}
                    strokeWidth="1"
                    rx="3"
                  />
                  <text
                    x={sloX}
                    y={padding.top - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={strokeColor}
                  >
                    {`SLO ${sloVal}ms`}
                  </text>
                </g>
              );
            })
          ) : (
            <text
              x={padding.left + 10}
              y={padding.top + 18}
              fontSize="10"
              fill="var(--text-4, #94a3b8)"
              fontStyle="italic"
            >
              {isVi ? "* Không có ngưỡng SLO" : "* No SLO thresholds configured"}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
