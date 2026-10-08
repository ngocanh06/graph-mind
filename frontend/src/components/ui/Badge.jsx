import React from "react";

/**
 * Enterprise Badge / Tag / Status Indicator (UI/UX Pro Max)
 * Variants: success | warning | danger | info | neutral | purple | cyan
 * High contrast, WCAG 4.5:1+, accessible with optional status dot
 */
export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  icon: Icon,
  className = "",
  style = {},
  ...props
}) {
  const variantStyles = {
    success: {
      background: "var(--green-soft, rgba(5,150,105,0.08))",
      color: "var(--green, #059669)",
      borderColor: "rgba(5,150,105,0.25)",
      dotColor: "var(--green, #059669)",
    },
    warning: {
      background: "var(--amber-soft, rgba(217,119,6,0.08))",
      color: "var(--amber, #D97706)",
      borderColor: "rgba(217,119,6,0.25)",
      dotColor: "var(--amber, #D97706)",
    },
    danger: {
      background: "var(--red-soft, rgba(220,38,38,0.08))",
      color: "var(--red, #DC2626)",
      borderColor: "rgba(220,38,38,0.25)",
      dotColor: "var(--red, #DC2626)",
    },
    info: {
      background: "var(--blue-soft, rgba(37,99,235,0.08))",
      color: "var(--blue, #2563EB)",
      borderColor: "rgba(37,99,235,0.25)",
      dotColor: "var(--blue, #2563EB)",
    },
    cyan: {
      background: "var(--cyan-soft, rgba(8,145,178,0.09))",
      color: "var(--cyan, #0891B2)",
      borderColor: "rgba(8,145,178,0.25)",
      dotColor: "var(--cyan, #0891B2)",
    },
    purple: {
      background: "rgba(139, 92, 246, 0.08)",
      color: "#8B5CF6",
      borderColor: "rgba(139, 92, 246, 0.25)",
      dotColor: "#8B5CF6",
    },
    neutral: {
      background: "var(--surface-3, #EDF2F7)",
      color: "var(--text-2, #334155)",
      borderColor: "var(--border, #E2E8F0)",
      dotColor: "var(--text-3, #64748B)",
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.neutral;

  const sizeStyles = {
    sm: {
      padding: "2px 7px",
      fontSize: "11px",
      gap: "4px",
      height: "20px",
    },
    md: {
      padding: "3px 9px",
      fontSize: "12px",
      gap: "6px",
      height: "24px",
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontFamily: "var(--f-body, inherit)",
        letterSpacing: "0.01em",
        borderRadius: "var(--r-full, 9999px)",
        border: "1px solid",
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        lineHeight: 1,
        ...currentSize,
        background: currentVariant.background,
        color: currentVariant.color,
        borderColor: currentVariant.borderColor,
        ...style,
      }}
      className={`badge-ui badge-${variant} ${className}`}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: currentVariant.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {Icon && <Icon size={size === "sm" ? 11 : 13} strokeWidth={2} />}
      <span>{children}</span>
    </span>
  );
}
