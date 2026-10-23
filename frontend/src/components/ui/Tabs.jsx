import React from "react";

/**
 * Enterprise Tabs Navigation (UI/UX Pro Max)
 * Variants: line | pills
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = "line",
  className = "",
  style = {},
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        alignItems: "center",
        gap: variant === "pills" ? "6px" : "16px",
        borderBottom: variant === "line" ? "1px solid var(--border, #E2E8F0)" : "none",
        background: variant === "pills" ? "var(--surface-3, #EDF2F7)" : "transparent",
        padding: variant === "pills" ? "4px" : "0",
        borderRadius: variant === "pills" ? "var(--r-md, 8px)" : 0,
        boxSizing: "border-box",
        overflowX: "auto",
        ...style,
      }}
      className={`tabs-ui tabs-${variant} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        if (variant === "pills") {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "var(--r-sm, 6px)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-1, #0F172A)" : "var(--text-3, #64748B)",
                background: isActive ? "var(--surface, #FFFFFF)" : "transparent",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {Icon && <Icon size={14} strokeWidth={2} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "9999px",
                    background: isActive ? "var(--blue-soft, rgba(37,99,235,0.08))" : "var(--border, #E2E8F0)",
                    color: isActive ? "var(--blue, #2563EB)" : "var(--text-3, #64748B)",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        // Line style
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 4px",
              fontSize: "13.5px",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--blue, #2563EB)" : "var(--text-3, #64748B)",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${isActive ? "var(--blue, #2563EB)" : "transparent"}`,
              marginBottom: "-1px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {Icon && <Icon size={15} strokeWidth={2} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  background: isActive ? "var(--blue-dim, #DBEAFE)" : "var(--surface-3, #EDF2F7)",
                  color: isActive ? "var(--blue, #2563EB)" : "var(--text-3, #64748B)",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
