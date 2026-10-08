import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Enterprise Modal Dialog (UI/UX Pro Max)
 * Accessible with role="dialog", aria-modal="true", Esc key dismiss, backdrop blur
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "560px",
  showCloseButton = true,
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
      aria-label={title || "Dialog"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface, #FFFFFF)",
          border: "1px solid var(--border-strong, #CBD5E1)",
          borderRadius: "var(--r-xl, 16px)",
          boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1))",
          overflow: "hidden",
          animation: "modalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box",
        }}
        className={`modal-dialog-ui ${className}`}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
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
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "var(--text-1, #0F172A)",
                  fontFamily: "var(--f-display, inherit)",
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  margin: "3px 0 0 0",
                  fontSize: "12.5px",
                  color: "var(--text-3, #64748B)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--r-md, 8px)",
                background: "transparent",
                border: "none",
                color: "var(--text-3, #64748B)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s ease",
              }}
              className="modal-close-btn"
            >
              <X size={17} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            fontSize: "13.5px",
            color: "var(--text-2, #334155)",
            lineHeight: 1.5,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border-subtle, #EDF2F7)",
              background: "var(--surface-2, #F8FAFC)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
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
