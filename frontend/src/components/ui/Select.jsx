import React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";

/**
 * Enterprise Form Select (UI/UX Pro Max)
 */
export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  helperText = "",
  error = "",
  required = false,
  disabled = false,
  className = "",
  style = {},
  ...props
}) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...style }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--text-1, #0F172A)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: "var(--red, #DC2626)", fontWeight: 700 }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={{
            width: "100%",
            height: 38,
            paddingLeft: 12,
            paddingRight: 32,
            background: disabled ? "var(--surface-3, #EDF2F7)" : "var(--surface, #FFFFFF)",
            color: "var(--text-1, #0F172A)",
            border: `1px solid ${error ? "var(--red, #DC2626)" : "var(--border-strong, #CBD5E1)"}`,
            borderRadius: "var(--r-md, 8px)",
            fontSize: "13.5px",
            fontFamily: "var(--f-body, inherit)",
            outline: "none",
            appearance: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            boxSizing: "border-box",
          }}
          className={`select-ui ${error ? "select-error" : ""} ${className}`}
          {...props}
        >
          {placeholder && !value && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value ?? opt.id ?? opt} value={opt.value ?? opt.id ?? opt}>
              {opt.label ?? opt.name ?? opt}
            </option>
          ))}
        </select>

        <div
          style={{
            position: "absolute",
            right: 10,
            pointerEvents: "none",
            color: "var(--text-3, #64748B)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronDown size={15} />
        </div>
      </div>

      {error ? (
        <div
          id={errorId}
          role="alert"
          style={{
            fontSize: "12px",
            color: "var(--red, #DC2626)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontWeight: 500,
          }}
        >
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div style={{ fontSize: "11.5px", color: "var(--text-3, #64748B)" }}>{helperText}</div>
      ) : null}
    </div>
  );
}
