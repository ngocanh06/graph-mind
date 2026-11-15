import React from "react";

/**
 * Enterprise Alert / Banner (UI/UX Pro Max)
 */
export default function Alert({
  variant = "info",
  title,
  children,
  onClose,
  action,
  className = "",
  style = {},
}) {
  const configs = {
    info: {
      icon: "fa-solid fa-circle-info",
      bg: "var(--cyan-soft, rgba(8,145,178,0.09))",
      border: "rgba(8,145,178,0.25)",
      text: "var(--text-1, #0F172A)",
      iconColor: "var(--cyan, #0891B2)",
    },
    warning: {
      icon: "fa-solid fa-triangle-exclamation",
      bg: "var(--amber-soft, rgba(217,119,6,0.08))",
      border: "rgba(217,119,6,0.25)",
      text: "var(--text-1, #0F172A)",
      iconColor: "var(--amber, #D97706)",
    },
    danger: {
      icon: "fa-solid fa-circle-exclamation",
      bg: "var(--red-soft, rgba(220,38,38,0.08))",
      border: "rgba(220,38,38,0.25)",
      text: "var(--text-1, #0F172A)",
      iconColor: "var(--red, #DC2626)",
    },
    success: {
      icon: "fa-solid fa-circle-check",
      bg: "var(--green-soft, rgba(5,150,105,0.08))",
      border: "rgba(5,150,105,0.25)",
      text: "var(--text-1, #0F172A)",
      iconColor: "var(--green, #059669)",
    },
  };

  const current = configs[variant] || configs.info;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        background: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: "var(--r-md, 8px)",
        color: current.text,
        boxSizing: "border-box",
        ...style,
      }}
      className={`alert-ui alert-${variant} ${className}`}
    >
      <div style={{ color: current.iconColor, flexShrink: 0, marginTop: "1px" }}>
        <i className={current.icon} style={{ fontSize: 17 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0, fontSize: "13px", lineHeight: 1.45 }}>
        {title && (
          <div style={{ fontWeight: 700, marginBottom: "2px", color: "var(--text-1, #0F172A)" }}>
            {title}
          </div>
        )}
        <div>{children}</div>
        {action && <div style={{ marginTop: "8px" }}>{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-3, #64748B)",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <i className="fa-solid fa-xmark" style={{ fontSize: 14 }} />
        </button>
      )}
    </div>
  );
}
