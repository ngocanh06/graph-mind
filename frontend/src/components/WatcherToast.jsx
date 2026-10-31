/**
 * WatcherToast — Modern SaaS, clean, premium, minimal horizontal notification banner
 * Pure white background, spans horizontally across the screen.
 * 
 * Event types:
 * - created:  [+] Đã thêm tài liệu mới
 * - modified: [↻] Đã cập nhật tài liệu
 * - deleted:  [✕] Đã xóa tài liệu khỏi hệ thống
 * - renamed:  [⇆] Đã đổi tên tài liệu
 */
import React, { useEffect, useState } from "react";

const EVENT_CONFIG = {
  created: {
    icon: "+",
    symbol: "✓",
    labelVi: "Đã thêm tài liệu",
    labelEn: "Document added",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  modified: {
    icon: "✎",
    symbol: "↻",
    labelVi: "Đã cập nhật tài liệu",
    labelEn: "Document updated",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  deleted: {
    icon: "✕",
    symbol: "✕",
    labelVi: "Đã xóa tài liệu",
    labelEn: "Document deleted",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  renamed: {
    icon: "⇆",
    symbol: "↻",
    labelVi: "Đã đổi tên tài liệu",
    labelEn: "Document renamed",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  error: {
    icon: "!",
    symbol: "!",
    labelVi: "Đồng bộ thất bại",
    labelEn: "Sync failed",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
};

function formatEventTime(event) {
  if (event.formattedTime) return event.formattedTime;
  if (event.timestamp && event.timestamp.includes(" - ")) {
    const parts = event.timestamp.split(" - ");
    if (parts.length === 2) return `${parts[1]} • ${parts[0]}`;
  }
  return event.timestamp || event.timeStr || "";
}

function getFileIcon(fileName = "") {
  const f = fileName.toLowerCase();
  if (f.endsWith(".pdf")) return { text: "PDF", color: "#dc2626", bg: "#fef2f2" };
  if (f.endsWith(".xlsx") || f.endsWith(".csv")) return { text: "XLS", color: "#16a34a", bg: "#f0fdf4" };
  if (f.endsWith(".docx")) return { text: "DOC", color: "#2563eb", bg: "#eff6ff" };
  return { text: "TXT", color: "#64748b", bg: "#f1f5f9" };
}

export default function WatcherToast({ event, onDismiss, lang = "vi", onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!event) {
      setVisible(false);
      return;
    }
    setLeaving(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [event]);

  if (!event || !visible) return null;

  const isVi = lang === "vi";
  const evType = event.eventType || (event.status === "deleted" ? "deleted" : "created");
  const cfg = EVENT_CONFIG[evType] || EVENT_CONFIG.created;
  const label = isVi ? cfg.labelVi : cfg.labelEn;
  const fileName = event.fileName || event.oldFileName || "document";
  const fileBadge = getFileIcon(fileName);
  const timeDisplay = formatEventTime(event);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 240);
  };

  const handleOpenDocs = () => {
    if (onNavigate) {
      onNavigate("documents", event.docId || fileName);
      handleDismiss();
    }
  };

  return (
    <>
      <style>{`
        @keyframes toastSlideAcross {
          0% {
            opacity: 0;
            transform: translate(-50%, -24px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes toastFadeAway {
          0% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -16px) scale(0.98);
          }
        }
        @keyframes countdownProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .white-saas-banner {
          animation: toastSlideAcross 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .white-saas-banner.leaving {
          animation: toastFadeAway 0.22s ease-in forwards;
        }
        .white-saas-banner-progress {
          animation: countdownProgress 6s linear forwards;
        }
      `}</style>

      {/* Floating White Notification Banner Running Horizontally Across the Screen */}
      <div
        className={`white-saas-banner${leaving ? " leaving" : ""}`}
        role="status"
        aria-live="polite"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "fixed",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          width: "min(94vw, 860px)",
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.09), 0 2px 8px rgba(0, 0, 0, 0.04)",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Subtle Bottom Progress Line */}
        <div
          className="white-saas-banner-progress"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2.5,
            background: cfg.color,
            opacity: 0.6,
            animationPlayState: isHovered ? "paused" : "running",
          }}
        />

        {/* Left Section: Action Badge & Event Type */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          {/* Action Badge (Thêm / Sửa / Xóa / Đổi tên) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              color: cfg.color,
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{cfg.icon}</span>
            <span>{label}</span>
          </div>

          {/* File Icon Badge */}
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 6,
              background: fileBadge.bg,
              color: fileBadge.color,
              fontSize: 10.5,
              fontWeight: 800,
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {fileBadge.text}
          </span>

          {/* File Name & Rename Diff */}
          {evType === "renamed" && event.oldFileName ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  textDecoration: "line-through",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={event.oldFileName}
              >
                {event.oldFileName}
              </span>
              <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>➔</span>
              <span
                style={{
                  color: "#0f172a",
                  fontWeight: 700,
                  maxWidth: 240,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={fileName}
              >
                {fileName}
              </span>
            </span>
          ) : (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 380,
              }}
              title={fileName}
            >
              {fileName}
            </span>
          )}

          {/* Department Tag */}
          {event.department && (
            <span
              style={{
                fontSize: 11,
                color: "#64748b",
                background: "#f8fafc",
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid #f1f5f9",
                flexShrink: 0,
              }}
            >
              {event.department}
            </span>
          )}
        </div>

        {/* Right Section: Timestamp + Action Button + Close */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Timestamp: 22/10/2026 • 09:55:01 */}
          {timeDisplay && (
            <span
              style={{
                fontSize: 11.5,
                color: "#94a3b8",
                fontFamily: "var(--f-mono, monospace)",
                whiteSpace: "nowrap",
              }}
            >
              {timeDisplay}
            </span>
          )}

          {/* Action: Open in Document Repository (Kho tài liệu) */}
          {(evType === "created" || evType === "modified" || !evType) && onNavigate && (
            <button
              onClick={handleOpenDocs}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#eff6ff";
                e.currentTarget.style.color = "#2563eb";
              }}
            >
              <span>{isVi ? "Kho tài liệu" : "Repository"}</span>
              <span style={{ fontSize: 11 }}>→</span>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            aria-label={isVi ? "Đóng" : "Close"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#334155";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
