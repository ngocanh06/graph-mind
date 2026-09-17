import React, { useState } from "react";

export default function LoginPage({
  onEnterPlatform,
  onBackToLanding,
  onSelectRole,
  role = "executive",
  lang = "vi",
  t = {}
}) {
  const isVi = lang === "vi";
  const [selectedRole, setSelectedRole] = useState(role || "executive");
  const [email, setEmail] = useState("dieu.hoang@enterprise.com");
  const [password, setPassword] = useState("••••••••••••");
  const [rememberMe, setRememberMe] = useState(true);

  const PERSONAS = [
    {
      id: "executive",
      name: "Dieu Hoang",
      roleTitle: isVi ? "Lãnh đạo · Giám đốc Tài chính (CFO)" : "Executive · Chief Financial Officer",
      email: "dieu.hoang@enterprise.com",
      badge: "EXECUTIVE",
      color: "#00e5ff",
      targetView: isVi ? "→ Phân hệ: Đài Quan sát Lãnh đạo & Rủi ro" : "→ Scope: Executive Pulse & Risk Center"
    },
    {
      id: "knowledge_manager",
      name: "Trần M. Anh",
      roleTitle: isVi ? "Quản lý Tri thức · Trưởng ban Dữ liệu" : "Knowledge Manager · Data Lead",
      email: "anh.tran@enterprise.com",
      badge: "KNOWLEDGE MGR",
      color: "#3fcb8e",
      targetView: isVi ? "→ Phân hệ: Đồ thị Tri thức & Kho Tài liệu" : "→ Scope: Knowledge Graph & Documents"
    },
    {
      id: "it_admin",
      name: "SecOps Admin",
      roleTitle: isVi ? "Quản trị viên IT · SecOps & LLMOps" : "IT Administrator · SecOps Lead",
      email: "admin.secops@enterprise.com",
      badge: "IT ADMIN",
      color: "#e3a947",
      targetView: isVi ? "→ Phân hệ: Quản trị Hệ thống, RBAC & LLMOps" : "→ Scope: Administration & System Telemetry"
    },
    {
      id: "standard",
      name: "Nguyễn V. Nam",
      roleTitle: isVi ? "Chuyên viên Nghiệp vụ · Vận hành & Sales" : "Operations & Sales Specialist",
      email: "nam.nguyen@enterprise.com",
      badge: "OPERATIONS",
      color: "#a78bfa",
      targetView: isVi ? "→ Phân hệ: Tìm kiếm Tri thức & Trợ lý Copilot" : "→ Scope: Smart Search & Operational Copilot"
    }
  ];

  const handleSelectPersona = (p) => {
    setSelectedRole(p.id);
    setEmail(p.email);
    onSelectRole?.(p.id);
  };

  const handleLoginSubmit = (e, roleOverride) => {
    e?.preventDefault();
    const roleToUse = roleOverride || selectedRole;
    onSelectRole?.(roleToUse);
    onEnterPlatform?.(roleToUse);
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
      {/* LEFT COLUMN (Brand, Holographic Visuals & Security) */}
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
        {/* Background glow orb */}
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

        {/* Top Logo */}
        <div
          onClick={onBackToLanding}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", zIndex: 2 }}
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
            <div style={{ fontSize: "9.5px", letterSpacing: "0.08em", color: "#00e5ff", textTransform: "uppercase", fontWeight: "700" }}>
              ENTERPRISE OBSERVATORY
            </div>
          </div>
        </div>

        {/* Middle Core Proposition */}
        <div style={{ zIndex: 2, maxWidth: "520px", margin: "40px 0" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "16px",
            background: "rgba(0,229,255,0.1)",
            border: "1px solid rgba(0,229,255,0.3)",
            fontSize: "10.5px",
            fontWeight: "700",
            letterSpacing: "0.06em",
            color: "#00e5ff",
            marginBottom: "20px",
            textTransform: "uppercase"
          }}>
            DATA → KNOWLEDGE → RELATIONSHIPS → REASONING → DECISION
          </div>

          <h1 style={{
            fontSize: "32px",
            fontWeight: "800",
            lineHeight: 1.3,
            color: "#ffffff",
            marginBottom: "16px"
          }}>
            {isVi ? "Cổng Xác Thực Trí Tuệ Doanh Nghiệp Bảo Mật" : "Secure Enterprise Intelligence Gateway"}
          </h1>

          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.7", marginBottom: "32px" }}>
            {isVi
              ? "Đăng nhập để truy cập không gian làm việc của Ban Điều hành: theo dõi nhịp đập kinh doanh thời gian thực, đồ thị tri thức 142.000 thực thể và hệ thống cảnh báo rủi ro AI."
              : "Sign in with your corporate credentials to inspect real-time enterprise telemetry, knowledge graph entities, and AI causal reasoning."}
          </p>

          {/* Checklist box with dashed border */}
          <div style={{
            background: "rgba(3, 27, 44, 0.6)",
            border: "1px dashed rgba(255, 255, 255, 0.25)",
            borderRadius: "6px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontSize: "12.5px",
            color: "#e2e8f0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#00e5ff", color: "#010f1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                <i className="fa-solid fa-check"></i>
              </span>
              <span><b>L5 Provenance Guarantee:</b> {isVi ? "100% câu trả lời có trích dẫn tài liệu" : "100% answers with cited source files"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#00e5ff", color: "#010f1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                <i className="fa-solid fa-check"></i>
              </span>
              <span><b>Deterministic GraphRAG:</b> {isVi ? "Suy luận nguyên nhân 4 bước không hallucination" : "Multi-hop reasoning with zero hallucination"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#00e5ff", color: "#010f1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                <i className="fa-solid fa-check"></i>
              </span>
              <span><b>Human-In-The-Loop:</b> {isVi ? "Hàng đợi xác thực con người kiểm duyệt dữ liệu" : "Human verification queues for full compliance"}</span>
            </div>
          </div>
        </div>

        {/* Bottom Version */}
        <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "var(--f-mono)", zIndex: 2 }}>
          AEGIS EKMP v2.6.4 · Python FastAPI Engine :5000 · React 18
        </div>
      </div>

      {/* RIGHT COLUMN (Login Form & Persona Switcher) */}
      <div style={{
        flex: 0.9,
        background: "#ffffff",
        color: "#002b3d",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 36px"
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Header Row with Back Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#002b3d", marginBottom: "4px" }}>
                {isVi ? "Đăng Nhập Hệ Thống" : "Sign In to Platform"}
              </h2>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                {isVi ? "Chọn vai trò demo hoặc nhập tài khoản doanh nghiệp" : "Select a demo persona or enter credentials"}
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
                cursor: "pointer"
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

          {/* Quick Demo Persona Selector */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
              {isVi ? "CHỌN VAI TRÒ TRẢI NGHIỆM NHANH (QUICK DEMO):" : "CHOOSE DEMO PERSONA:"}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {PERSONAS.map((p) => {
                const isChosen = selectedRole === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: isChosen ? "2px solid #0284c7" : "1px solid #e2e8f0",
                      background: isChosen ? "#f0f9ff" : "#f8fafc",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isChosen ? "#0284c7" : "#e2e8f0",
                        color: isChosen ? "#ffffff" : "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px"
                      }}>
                        <i className={`fa-solid ${
                          p.id === 'executive' ? 'fa-user-tie' :
                          p.id === 'knowledge_manager' ? 'fa-diagram-project' :
                          p.id === 'it_admin' ? 'fa-server' : 'fa-briefcase'
                        }`}></i>
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#002b3d" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {p.roleTitle}
                        </div>
                        <div style={{ fontSize: "10px", color: isChosen ? "#0284c7" : "#94a3b8", fontWeight: isChosen ? "700" : "500", marginTop: "2px" }}>
                          {p.targetView}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: "9.5px",
                      fontWeight: "800",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: isChosen ? "#0284c7" : "#e2e8f0",
                      color: isChosen ? "#ffffff" : "#475569"
                    }}>
                      {p.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                <i className="fa-solid fa-envelope" style={{ marginRight: "6px", color: "#0284c7" }}></i>
                {isVi ? "Email Doanh nghiệp" : "Corporate Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                <i className="fa-solid fa-lock" style={{ marginRight: "6px", color: "#0284c7" }}></i>
                {isVi ? "Mật khẩu bảo mật" : "Password"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", fontSize: "12px", color: "#64748b" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {isVi ? "Ghi nhớ phiên làm việc" : "Remember session"}
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Vui lòng liên hệ IT Administrator để đặt lại mật khẩu SSO."); }} style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}>
                {isVi ? "Quên mật khẩu?" : "Forgot password?"}
              </a>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#002b3d",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                marginBottom: "12px",
                boxShadow: "0 4px 12px rgba(0,43,61,0.25)",
                transition: "background 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#011a27"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#002b3d"}
            >
              <span>{isVi ? "Đăng Nhập Vào Hệ Thống" : "Sign In to Platform"}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleLoginSubmit}
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
                gap: "8px"
              }}
            >
              <i className="fa-brands fa-google" style={{ color: "#ea4335", fontSize: "14px" }}></i>
              <span>{isVi ? "Đăng nhập nhanh với Google Workspace SSO" : "Continue with Google Workspace SSO"}</span>
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "18px", marginTop: "20px", textAlign: "center" }}>
            <button
              type="button"
              onClick={(e) => handleLoginSubmit(e, selectedRole)}
              style={{
                width: "100%",
                padding: "8px",
                background: "#e0f2fe",
                color: "#0284c7",
                border: "1px solid #bae6fd",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <i className="fa-solid fa-bolt" style={{ color: "#0284c7" }}></i>
              <span>{isVi ? `Vào Ngay Không Gian: ${PERSONAS.find(p => p.id === selectedRole)?.name} (${PERSONAS.find(p => p.id === selectedRole)?.badge})` : `Quick Access: ${PERSONAS.find(p => p.id === selectedRole)?.name}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
