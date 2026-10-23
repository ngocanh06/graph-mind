import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

/**
 * Enterprise Data Table (UI/UX Pro Max)
 * Handles responsive horizontal scroll, sort indicators, empty state, loading skeleton
 */
export default function Table({
  columns = [],
  data = [],
  keyField = "id",
  sortField,
  sortDirection = "asc",
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = "No records found.",
  emptyIcon: EmptyIcon,
  className = "",
  style = {},
}) {
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid var(--border, #E2E8F0)",
        borderRadius: "var(--r-lg, 12px)",
        background: "var(--surface, #FFFFFF)",
        boxShadow: "var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.04))",
        boxSizing: "border-box",
        ...style,
      }}
      className={`table-wrapper-ui ${className}`}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "13.5px",
          fontFamily: "var(--f-body, inherit)",
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--surface-2, #F8FAFC)",
              borderBottom: "1px solid var(--border, #E2E8F0)",
            }}
          >
            {columns.map((col) => {
              const isSorted = sortField === col.key;
              const isSortable = Boolean(col.sortable && onSort);

              return (
                <th
                  key={col.key}
                  onClick={isSortable ? () => onSort(col.key) : undefined}
                  style={{
                    padding: "12px 16px",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-3, #64748B)",
                    width: col.width,
                    textAlign: col.align || "left",
                    cursor: isSortable ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    <span>{col.header}</span>
                    {isSortable && (
                      <span style={{ color: isSorted ? "var(--blue, #2563EB)" : "var(--text-4, #94A3B8)" }}>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp size={13} strokeWidth={2.5} />
                          ) : (
                            <ChevronDown size={13} strokeWidth={2.5} />
                          )
                        ) : (
                          <ChevronsUpDown size={13} strokeWidth={2} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            // Skeleton loading rows
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`loading-${idx}`} style={{ borderBottom: "1px solid var(--border-subtle, #EDF2F7)" }}>
                {columns.map((col, cIdx) => (
                  <td key={cIdx} style={{ padding: "16px" }}>
                    <div
                      style={{
                        height: 14,
                        width: cIdx === 0 ? "70%" : "50%",
                        background: "var(--surface-3, #EDF2F7)",
                        borderRadius: "4px",
                        animation: "pulse 1.5s infinite ease-in-out",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty state
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--text-3, #64748B)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  {EmptyIcon && <EmptyIcon size={32} strokeWidth={1.5} color="var(--text-4, #94A3B8)" />}
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data rows
            data.map((row, rowIdx) => {
              const isClickable = Boolean(onRowClick);
              const rowKey = row[keyField] ?? rowIdx;

              return (
                <tr
                  key={rowKey}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  style={{
                    borderBottom: rowIdx === data.length - 1 ? "none" : "1px solid var(--border-subtle, #EDF2F7)",
                    cursor: isClickable ? "pointer" : "default",
                    transition: "background 0.12s ease",
                  }}
                  className={`table-row-ui ${isClickable ? "table-row-clickable" : ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "14px 16px",
                        color: "var(--text-2, #334155)",
                        textAlign: col.align || "left",
                        verticalAlign: "middle",
                        fontSize: "13px",
                      }}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
