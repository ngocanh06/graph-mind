import React from "react";

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

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === "string") {
      const cls = Icon.startsWith("fa-") || Icon.startsWith("fas ") ? Icon : `fa-solid fa-${Icon}`;
      return <i className={cls} style={{ fontSize: 16 }} />;
    }
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === "function") {
      const Comp = Icon;
      return <Comp size={17} strokeWidth={2} />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface, #FFFFFF)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "12px",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
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
            fontSize: "12px",
            fontWeight: 700,
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
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: iconBg || "var(--cyan-soft, rgba(8,145,178,0.08))",
              color: iconColor || "var(--cyan, #0891b2)",
              border: "1px solid rgba(8, 145, 178, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {renderIcon()}
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
              gap: "4px",
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
              <i className="fa-solid fa-arrow-trend-up" style={{ fontSize: 11 }} />
            ) : isPositive === false ? (
              <i className="fa-solid fa-arrow-trend-down" style={{ fontSize: 11 }} />
            ) : (
              <i className="fa-solid fa-minus" style={{ fontSize: 11 }} />
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
