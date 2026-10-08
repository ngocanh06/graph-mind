import React from "react";
import { Search, X, Loader2 } from "lucide-react";

/**
 * Enterprise Search Input with Shortcut & Clear action (UI/UX Pro Max)
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  loading = false,
  shortcut = "/",
  style = {},
  className = "",
  ...props
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        ...style,
      }}
      className={`search-input-ui ${className}`}
    >
      <div
        style={{
          position: "absolute",
          left: 12,
          pointerEvents: "none",
          color: "var(--text-3, #64748B)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {loading ? (
          <Loader2 size={15} className="spin" style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          <Search size={15} strokeWidth={2} />
        )}
      </div>

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 38,
          paddingLeft: 36,
          paddingRight: shortcut ? 48 : onClear && value ? 36 : 14,
          background: "var(--surface, #FFFFFF)",
          color: "var(--text-1, #0F172A)",
          border: "1px solid var(--border-strong, #CBD5E1)",
          borderRadius: "var(--r-md, 8px)",
          fontSize: "13.5px",
          fontFamily: "var(--f-body, inherit)",
          outline: "none",
          transition: "all 0.15s ease",
          boxSizing: "border-box",
        }}
        {...props}
      />

      {value && onClear && !loading && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: shortcut ? 36 : 10,
            background: "transparent",
            border: "none",
            color: "var(--text-4, #94A3B8)",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={14} />
        </button>
      )}

      {shortcut && !value && (
        <div
          style={{
            position: "absolute",
            right: 10,
            pointerEvents: "none",
            fontSize: "10.5px",
            fontWeight: 700,
            color: "var(--text-3, #64748B)",
            background: "var(--surface-3, #EDF2F7)",
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid var(--border, #E2E8F0)",
            lineHeight: 1,
          }}
        >
          {shortcut}
        </div>
      )}
    </div>
  );
}
