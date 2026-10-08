import React from "react";
import { FolderOpen } from "lucide-react";
import Button from "./Button";

/**
 * Enterprise Empty State (UI/UX Pro Max)
 * Clear explanation of what is empty, why, and actionable next steps
 */
export default function EmptyState({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "There are no items to display at this time.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style = {},
  className = "",
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        background: "var(--surface, #FFFFFF)",
        border: "1px dashed var(--border-strong, #CBD5E1)",
        borderRadius: "var(--r-lg, 12px)",
        boxSizing: "border-box",
        ...style,
      }}
      className={`empty-state-ui ${className}`}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--surface-3, #EDF2F7)",
          color: "var(--text-3, #64748B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <Icon size={24} strokeWidth={1.75} />
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "16px",
          fontWeight: 700,
          color: "var(--text-1, #0F172A)",
          fontFamily: "var(--f-display, inherit)",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "6px 0 20px 0",
          fontSize: "13px",
          color: "var(--text-3, #64748B)",
          maxWidth: "420px",
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {actionLabel && onAction && (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" size="md" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
