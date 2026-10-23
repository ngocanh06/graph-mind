import React from "react";

/**
 * Enterprise Card Component (UI/UX Pro Max)
 * Structured with optional Header, Title, Actions, Body, Footer
 */
export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  actions,
  footer,
  hoverable = false,
  padding = "20px",
  className = "",
  style = {},
  onClick,
  ...props
}) {
  return (
    <div
      style={{
        background: "var(--surface, #FFFFFF)",
        border: "1px solid var(--border, #E2E8F0)",
        borderRadius: "var(--r-lg, 12px)",
        boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
        display: "flex",
        flexDirection: "column",
        transition: hoverable ? "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        cursor: hoverable ? "pointer" : "default",
        boxSizing: "border-box",
        overflow: "hidden",
        ...style,
      }}
      onClick={onClick}
      className={`card-ui ${hoverable ? "card-hoverable" : ""} ${className}`}
      {...props}
    >
      {(title || subtitle || actions || Icon) && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle, var(--border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {Icon && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--r-md, 8px)",
                  background: iconBg || "var(--blue-soft, rgba(37,99,235,0.08))",
                  color: iconColor || "var(--blue, #2563EB)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              {title && (
                <div
                  style={{
                    fontSize: "14.5px",
                    fontWeight: 700,
                    color: "var(--text-1, #0F172A)",
                    fontFamily: "var(--f-display, inherit)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-3, #64748B)",
                    marginTop: "2px",
                    lineHeight: 1.3,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          {actions && <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>{actions}</div>}
        </div>
      )}

      <div style={{ padding, flex: 1, minHeight: 0 }}>{children}</div>

      {footer && (
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle, var(--border))",
            background: "var(--surface-2, #F8FAFC)",
            fontSize: "12px",
            color: "var(--text-3, #64748B)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
