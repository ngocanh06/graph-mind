import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Enterprise Slide-over Drawer (UI/UX Pro Max)
 * Positions: right | left
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "480px",
  position = "right",
  showBackdrop = true,
  className = "",
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        justifyContent: position === "right" ? "flex-end" : "flex-start",
        background: showBackdrop ? "rgba(15, 23, 42, 0.4)" : "transparent",
        backdropFilter: showBackdrop ? "blur(2px)" : "none",
        pointerEvents: showBackdrop ? "auto" : "none",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && showBackdrop) onClose?.();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          height: "100%",
          background: "var(--surface, #FFFFFF)",
          borderLeft: position === "right" ? "1px solid var(--border, #E2E8F0)" : "none",
          borderRight: position === "left" ? "1px solid var(--border, #E2E8F0)" : "none",
          boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1))",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          animation: `${position === "right" ? "drawerSlideRight" : "drawerSlideLeft"} 0.22s cubic-bezier(0.16, 1, 0.3, 1)`,
          boxSizing: "border-box",
        }}
        className={`drawer-ui ${className}`}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle, #EDF2F7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-1, #0F172A)",
                  fontFamily: "var(--f-display, inherit)",
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "var(--text-3, #64748B)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--r-md, 8px)",
              background: "transparent",
              border: "none",
              color: "var(--text-3, #64748B)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            fontSize: "13px",
            color: "var(--text-2, #334155)",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--border-subtle, #EDF2F7)",
              background: "var(--surface-2, #F8FAFC)",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
