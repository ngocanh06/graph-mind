import React, { useState, useEffect } from "react";
import { ENTERPRISE_ROLES, authenticateByEmail } from "../data/roles";

export default function LoginPage({
  onEnterPlatform,
  onBackToLanding,
  onSelectRole,
  role = "executive",
  lang = "vi",
  t = {}
}) {
  const isVi = lang === "vi";

  // Khởi tạo username ngắn gọn mặc định theo vai trò ban đầu (vd: 'cfo')
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("••••••••••••");
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Xử lý gửi form đăng nhập
  const handleSubmit = (e) => {
    e?.preventDefault();
    setIsAuthenticating(true);

    // Mặc định đăng nhập tài khoản tác nghiệp hoặc theo danh tính được nhập
    const targetIdentifier = (identifier || "").trim() || "ops";
    const authenticatedUser = authenticateByEmail(targetIdentifier);
    setTimeout(() => {
      setIsAuthenticating(false);
      onSelectRole?.(authenticatedUser.id);
      onEnterPlatform?.(authenticatedUser);
    }, 350);
  };

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      display: "flex",
      fontFamily: "var(--f-body, 'Inter', sans-serif)",
      background: "#010f1a",
      color: "#ffffff"
    }}>
      {/* ============================================================ */}
      {/* CỘT TRÁI: GIỚI THIỆU PHÂN HỆ DOANH NGHIỆP & CHUẨN BẢO MẬT     */}
      {/* ============================================================ */}
      <div style={{
        flex: 1.1,
        background: "linear-gradient(145deg, #010c15 0%, #021829 60%, #04243d 100%)",
        borderRight: "1px solid rgba(0,229,255,0.15)",
        padding: "48px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow hiệu ứng nền */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        {/* Logo trên cùng */}
        <div
          onClick={onBackToLanding}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", zIndex: 2 }}
          title={isVi ? "Về trang chủ" : "Back to Home"}
        >
          <img
            src="/logo-icon.svg"
            alt="Graph Mind Logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              objectFit: "contain",
              boxShadow: "0 0 20px rgba(0,229,255,0.45)",
              filter: "drop-shadow(0 0 6px rgba(0,229,255,0.3))"
            }}
          />
          <div>
            <div style={{ fontSize: "17px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.01em" }}>
              GRAPH MIND
            </div>
            <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#00e5ff", textTransform: "uppercase", fontWeight: "700" }}>
              ENTERPRISE DECISION PLATFORM
            </div>
          </div>
        </div>

        {/* Nội dung trung tâm: Cấu trúc phân quyền tác nhân */}
        <div style={{ zIndex: 2, maxWidth: "520px", margin: "36px 0" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 12px",
            borderRadius: "20px",
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.25)",
            fontSize: "11px",
            color: "#00e5ff",
            fontWeight: "700",
            marginBottom: "20px"
          }}>
            <i className="fa-solid fa-shield-halved"></i>
            <span>{isVi ? "CỔNG ĐĂNG NHẬP DOANH NGHIỆP BẢO MẬT" : "SECURE ENTERPRISE ACCESS PORTAL"}</span>
          </div>

          <h1 style={{
            fontSize: "27px",
            fontWeight: "800",
            lineHeight: "1.35",
            color: "#ffffff",
            marginBottom: "16px",
            letterSpacing: "-0.02em"
          }}>
            {isVi
              ? "Nền tảng Hỗ trợ Ra Quyết định & Quản trị Tri thức"
              : "Enterprise Decision Support & Knowledge Observatory"}
          </h1>

          <p style={{
            fontSize: "13px",
            color: "#94a3b8",
            lineHeight: "1.7",
            marginBottom: "24px"
          }}>
            {isVi
              ? "Hệ thống tự động đồng bộ không gian làm việc và kiểm soát quyền truy cập dữ liệu chính xác theo tài khoản định danh của bạn."
              : "The platform dynamically provisions workspaces and data boundaries mapped to your corporate identity."}
          </p>

          {/* Trụ cột Bảo mật & Kiến trúc Doanh nghiệp (Thay thế danh mục role nội bộ) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "18px"
          }}>
            <div style={{ borderLeft: "2.5px solid #00e5ff", paddingLeft: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-user-shield" style={{ color: "#00e5ff", fontSize: "11px" }}></i>
                <span>{isVi ? "Kiểm Soát Phân Tầng" : "Granular RBAC / ABAC"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                {isVi ? "Cô lập ngữ cảnh dữ liệu và hồ sơ theo từng phòng ban" : "Department-isolated data context & security boundary"}
              </div>
            </div>

            <div style={{ borderLeft: "2.5px solid #3fcb8e", paddingLeft: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-shield-halved" style={{ color: "#3fcb8e", fontSize: "11px" }}></i>
                <span>{isVi ? "Chuẩn Doanh Nghiệp" : "Enterprise Security"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                {isVi ? "Tiêu chuẩn SOC2 Type II, ISO/IEC 27001 & mã hóa AES-256" : "SOC2 Type II, ISO 27001 readiness & AES-256 encryption"}
              </div>
            </div>

            <div style={{ borderLeft: "2.5px solid #e3a947", paddingLeft: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-key" style={{ color: "#e3a947", fontSize: "11px" }}></i>
                <span>{isVi ? "Đăng Nhập Một Lần" : "Enterprise SSO"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                {isVi ? "Tích hợp liền mạch SAML 2.0, Microsoft Entra ID & Okta" : "Seamless integration with SAML 2.0, Entra ID & Okta"}
              </div>
            </div>

            <div style={{ borderLeft: "2.5px solid #a78bfa", paddingLeft: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-server" style={{ color: "#a78bfa", fontSize: "11px" }}></i>
                <span>{isVi ? "Hạ Tầng Riêng Tư" : "Private Deployment"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                {isVi ? "Hỗ trợ Private Cloud, On-Premise & Zero-Data-Retention" : "Private Cloud, On-Premise & zero-data-retention AI"}
              </div>
            </div>
          </div>
        </div>

        {/* Chân trang cột trái */}
        <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "var(--f-mono)", zIndex: 2 }}>
          AEGIS EKMP Enterprise Architecture · SSO/SAML 2.0 · Python FastAPI Engine
        </div>
      </div>

      {/* ============================================================ */}
      {/* CỘT PHẢI: FORM ĐĂNG NHẬP CHÍNH THỨC CỦA DOANH NGHIỆP          */}
      {/* ============================================================ */}
      <div style={{
        flex: 0.9,
        background: "#ffffff",
        color: "#002b3d",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 40px"
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Header & Nút Quay lại */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px" }}>
            <div>
              <h2 style={{ fontSize: "23px", fontWeight: "800", color: "#002b3d", marginBottom: "4px", letterSpacing: "-0.01em" }}>
                {isVi ? "Đăng Nhập Doanh Nghiệp" : "Enterprise Sign In"}
              </h2>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                {isVi ? "Nhập tên đăng nhập hoặc email được cấp quyền" : "Enter your username or authorized email"}
              </div>
            </div>

            <button
              onClick={onBackToLanding}
              style={{
                background: "transparent",
                border: "1.5px solid #cbd5e1",
                borderRadius: "16px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#002b3d";
                e.currentTarget.style.color = "#002b3d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.color = "#475569";
              }}
            >
              <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i>
              {isVi ? "Trang Chủ" : "Landing"}
            </button>
          </div>

          {/* Form Đăng Nhập */}
          <form onSubmit={handleSubmit}>
            {/* Trường Tên đăng nhập / Email */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                <i className="fa-solid fa-user" style={{ marginRight: "6px", color: "#0284c7" }}></i>
                {isVi ? "Tên Đăng Nhập / Email" : "Username or Email"}
              </label>
              <input
                type="text"
                value={identifier}
                required
                placeholder={isVi ? "Tên đăng nhập hoặc email doanh nghiệp..." : "Username or corporate email..."}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#0f172a",
                  fontWeight: "600",
                  outline: "none",
                  transition: "border-color 0.15s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#0284c7"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
              />
            </div>

            {/* Trường Mật khẩu */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                <i className="fa-solid fa-lock" style={{ marginRight: "6px", color: "#0284c7" }}></i>
                {isVi ? "Mật khẩu bảo mật" : "Password"}
              </label>
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 0.15s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#0284c7"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
              />
            </div>

            {/* Checkbox Ghi nhớ & Quên mật khẩu */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", fontSize: "12px", color: "#64748b" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {isVi ? "Ghi nhớ phiên làm việc" : "Remember session"}
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert(isVi ? "Vui lòng liên hệ IT Administrator để đặt lại mật khẩu hoặc cấp lại quyền qua SSO." : "Please contact IT Administrator for SSO credentials reset.");
                }}
                style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}
              >
                {isVi ? "Quên mật khẩu?" : "Forgot password?"}
              </a>
            </div>

            {/* Nút Đăng nhập chính */}
            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: "100%",
                padding: "12px",
                background: "#002b3d",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: isAuthenticating ? "wait" : "pointer",
                marginBottom: "12px",
                boxShadow: "0 4px 14px rgba(0,43,61,0.25)",
                transition: "background 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: isAuthenticating ? 0.8 : 1
              }}
              onMouseEnter={(e) => { if (!isAuthenticating) e.currentTarget.style.background = "#011a27"; }}
              onMouseLeave={(e) => { if (!isAuthenticating) e.currentTarget.style.background = "#002b3d"; }}
            >
              {isAuthenticating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>{isVi ? "Đang xác thực bảo mật..." : "Authenticating..."}</span>
                </>
              ) : (
                <>
                  <span>{isVi ? "Đăng Nhập An Toàn" : "Sign In to Platform"}</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>

            {/* Đăng nhập qua SSO Doanh nghiệp */}
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                width: "100%",
                padding: "10px",
                background: "#ffffff",
                color: "#334155",
                border: "1.5px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#94a3b8"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
            >
              <i className="fa-brands fa-microsoft" style={{ color: "#00a4ef", fontSize: "13px" }}></i>
              <span>{isVi ? "Đăng nhập với Microsoft Entra ID / SSO" : "Sign in with Microsoft Entra ID / SSO"}</span>
            </button>
          </form>

          {/* ============================================================ */}
          {/* HUY HIỆU BẢO MẬT & CHUẨN TUÂN THỦ DOANH NGHIỆP              */}
          {/* ============================================================ */}
          <div style={{
            marginTop: "28px",
            paddingTop: "18px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              fontSize: "11px",
              color: "#64748b"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i className="fa-solid fa-lock" style={{ color: "#10b981", fontSize: "10px" }}></i>
                TLS 1.3 · 256-Bit
              </span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i className="fa-solid fa-shield-check" style={{ color: "#0284c7", fontSize: "10px" }}></i>
                SOC2 Type II
              </span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i className="fa-solid fa-certificate" style={{ color: "#8b5cf6", fontSize: "10px" }}></i>
                ISO/IEC 27001
              </span>
            </div>

            <div style={{ fontSize: "10.5px", color: "#94a3b8", textAlign: "center" }}>
              {isVi
                ? "Bảo vệ bởi kiến trúc Zero-Trust & Phân quyền RBAC độc lập."
                : "Protected by Zero-Trust architecture & department-isolated RBAC."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
