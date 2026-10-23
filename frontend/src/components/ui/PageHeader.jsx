import React from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Enterprise Page Header (UI/UX Pro Max)
 * Standardizes view title, breadcrumb, description, badges, and action bar
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  badgeVariant = "neutral",
  breadcrumbs = [],
  onBack,
  actions,
  className = "",
  style = {},
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "24px",
        boxSizing: "border-box",
        ...style,
      }}
      className={`page-header-ui ${className}`}
    >
      {/* Breadcrumbs or Back Link */}
      {(onBack || breadcrumbs.length > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-3, #64748B)" }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "transparent",
                border: "none",
                color: "var(--text-3, #64748B)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
              aria-label="Go back"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
          )}

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.label || idx}>
              {idx > 0 && <span>/</span>}
              {crumb.onClick ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: idx === breadcrumbs.length - 1 ? "var(--text-1, #0F172A)" : "var(--text-3, #64748B)",
                    fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  style={{
                    color: idx === breadcrumbs.length - 1 ? "var(--text-1, #0F172A)" : "var(--text-3, #64748B)",
                    fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500,
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Title Row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text-1, #0F172A)",
                fontFamily: "var(--f-display, inherit)",
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              {title}
            </h1>
            {badge && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "var(--r-full, 9999px)",
                  background: "var(--surface-3, #EDF2F7)",
                  color: "var(--text-2, #334155)",
                  border: "1px solid var(--border, #E2E8F0)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-3, #64748B)",
                margin: "4px 0 0 0",
                lineHeight: 1.45,
                maxWidth: 820,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {actions && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
