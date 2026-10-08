import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Enterprise StatCard / Metric Widget (UI/UX Pro Max)
 */
export default function StatCard({
  title,
  value,
  change,
  isPositive,
  subtext,
  icon: Icon,
  iconColor,
  iconBg,
  onClick,
  style = {},
  className = "",
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface, #FFFFFF)",
        border: "1px solid var(--border, #E2E8F0)",
        borderRadius: "var(--r-lg, 12px)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
        cursor: isClickable ? "pointer" : "default",
        transition: isClickable ? "all 0.18s ease" : "none",
        boxSizing: "border-box",
        minWidth: 0,
        ...style,
      }}
      className={`stat-card-ui ${isClickable ? "stat-card-clickable" : ""} ${className}`}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--text-3, #64748B)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md, 8px)",
              background: iconBg || "var(--blue-soft, rgba(37,99,235,0.08))",
              color: iconColor || "var(--blue, #2563EB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={17} strokeWidth={2} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--text-1, #0F172A)",
            fontFamily: "var(--f-display, inherit)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>

        {change !== undefined && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "12px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "var(--r-full, 9999px)",
              background:
                isPositive === true
                  ? "var(--green-soft, rgba(5,150,105,0.08))"
                  : isPositive === false
                  ? "var(--red-soft, rgba(220,38,38,0.08))"
                  : "var(--surface-3, #EDF2F7)",
              color:
                isPositive === true
                  ? "var(--green, #059669)"
                  : isPositive === false
                  ? "var(--red, #DC2626)"
                  : "var(--text-3, #64748B)",
            }}
          >
            {isPositive === true ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : isPositive === false ? (
              <TrendingDown size={12} strokeWidth={2.5} />
            ) : (
              <Minus size={12} strokeWidth={2.5} />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-4, #94A3B8)",
            lineHeight: 1.3,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
