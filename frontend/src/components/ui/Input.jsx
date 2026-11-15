import React from "react";

/**
 * Enterprise Form Input (UI/UX Pro Max)
 * Accessible with label, helperText, inline error via aria-describedby, focus ring
 */
export default function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  helperText = "",
  error = "",
  required = false,
  disabled = false,
  icon: Icon,
  clearable = false,
  onClear,
  className = "",
  style = {},
  autoComplete = "off",
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === "string") {
      const cls = Icon.startsWith("fa-") || Icon.startsWith("fas ") ? Icon : `fa-solid fa-${Icon}`;
      return <i className={cls} style={{ fontSize: 14 }} />;
    }
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === "function") {
      const Comp = Icon;
      return <Comp size={15} strokeWidth={2} />;
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...style }}>
      {label && (
        <label
          htmlFor={inputId}
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
        {Icon && (
          <div
            style={{
              position: "absolute",
              left: 12,
              pointerEvents: "none",
              color: error ? "var(--red, #DC2626)" : "var(--text-4, #94A3B8)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {renderIcon()}
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          style={{
            width: "100%",
            height: 38,
            paddingLeft: Icon ? 36 : 12,
            paddingRight: (clearable && value) || error ? 36 : 12,
            background: disabled ? "var(--surface-3, #EDF2F7)" : "var(--surface, #FFFFFF)",
            color: "var(--text-1, #0F172A)",
            border: `1px solid ${error ? "var(--red, #DC2626)" : "var(--border-strong, #CBD5E1)"}`,
            borderRadius: "var(--r-md, 8px)",
            fontSize: "13.5px",
            fontFamily: "var(--f-body, inherit)",
            outline: "none",
            transition: "all 0.15s ease",
            boxSizing: "border-box",
          }}
          className={`input-ui ${error ? "input-error" : ""} ${className}`}
          {...props}
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear input"
            style={{
              position: "absolute",
              right: 10,
              background: "transparent",
              border: "none",
              color: "var(--text-4, #94A3B8)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              borderRadius: "50%",
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
          </button>
        )}
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
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 13 }} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div
          id={helperId}
          style={{
            fontSize: "11.5px",
            color: "var(--text-3, #64748B)",
          }}
        >
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
