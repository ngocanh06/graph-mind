import React from "react";

/**
 * Enterprise Button Component (UI/UX Pro Max)
 * Variants: primary | secondary | outline | ghost | danger | success
 * Sizes: sm (32px) | md (38px) | lg (44px)
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  style = {},
  onClick,
  type = "button",
  ariaLabel,
  title,
  ...props
}) {
  const isDisabled = disabled || loading;

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 600,
    fontFamily: "var(--f-body, inherit)",
    borderRadius: "var(--r-md, 8px)",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "1px solid transparent",
    outline: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
    textDecoration: "none",
    width: fullWidth ? "100%" : "auto",
    boxSizing: "border-box",
  };

  const sizeStyles = {
    sm: { height: 32, padding: "0 10px", fontSize: 12.5 },
    md: { height: 38, padding: "0 14px", fontSize: 13.5 },
    lg: { height: 44, padding: "0 20px", fontSize: 15 },
    icon: { width: 36, height: 36, padding: 0, fontSize: 14 }
  };

  const variantStyles = {
    primary: {
      background: "var(--blue, #2563EB)",
      color: "#FFFFFF",
      borderColor: "var(--blue, #2563EB)",
      boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
    },
    secondary: {
      background: "var(--surface, #FFFFFF)",
      color: "var(--text-1, #0F172A)",
      borderColor: "var(--border-strong, #CBD5E1)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },
    outline: {
      background: "transparent",
      color: "var(--text-2, #334155)",
      borderColor: "var(--border, #E2E8F0)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-2, #334155)",
      borderColor: "transparent",
    },
    danger: {
      background: "var(--red, #DC2626)",
      color: "#FFFFFF",
      borderColor: "var(--red, #DC2626)",
      boxShadow: "0 1px 2px rgba(220,38,38,0.2)",
    },
    dangerSoft: {
      background: "var(--red-soft, rgba(220,38,38,0.08))",
      color: "var(--red, #DC2626)",
      borderColor: "rgba(220,38,38,0.2)",
    },
    success: {
      background: "var(--green, #059669)",
      color: "#FFFFFF",
      borderColor: "var(--green, #059669)",
      boxShadow: "0 1px 2px rgba(5,150,105,0.2)",
    },
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;
  const selectedVariant = variantStyles[variant] || variantStyles.primary;

  const combinedStyle = {
    ...baseStyle,
    ...selectedSize,
    ...selectedVariant,
    ...style,
  };

  return (
    <button
      type={type}
      style={combinedStyle}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      aria-label={ariaLabel || title}
      title={title || ariaLabel}
      className={`btn-ui btn-${variant} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: "2px solid currentColor",
            borderRightColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.6s linear infinite",
          }}
        />
      ) : (
        Icon && iconPosition === "left" && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} />
      )}
      {children}
      {!loading && Icon && iconPosition === "right" && (
        <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} />
      )}
    </button>
  );
}
