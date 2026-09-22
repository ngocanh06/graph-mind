import React, { useState } from "react";

export default function LandingPage({
  onEnterPlatform,
  onShowLogin,
  lang = "vi",
  onLangChange,
  theme = "light",
  onThemeChange,
  t = {}
}) {
  const isVi = lang === "vi";
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [subscribedToast, setSubscribedToast] = useState("");

  const handleSubscribe = (email, fieldName) => {
    if (!email || !email.includes("@")) {
      setSubscribedToast(isVi ? "Vui lòng nhập địa chỉ email hợp lệ!" : "Please enter a valid email address!");
      setTimeout(() => setSubscribedToast(""), 3000);
      return;
    }
    setSubscribedToast(isVi ? `Đã đăng ký nhận bản tin thành công cho: ${email}` : `Subscribed successfully: ${email}`);
    if (fieldName === "newsletter") setNewsletterEmail("");
    if (fieldName === "footer") setFooterEmail("");
    setTimeout(() => setSubscribedToast(""), 3500);
  };

  const scrollToSection = (e, id) => {
    e?.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ fontFamily: "var(--f-body, 'Inter', sans-serif)", background: "#ffffff", color: "#002b3d", width: "100%", overflowX: "clip" }}>
      {/* Toast */}
      {subscribedToast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: "#002b3d",
          color: "#ffffff",
          border: "1px solid #00e5ff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: "500"
        }}>
          <span style={{ color: "#00e5ff", fontSize: "16px" }}>✓</span>
          <span>{subscribedToast}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* FIXED TOP HEADER (ALWAYS VISIBLE WHILE SCROLLING)        */}
      {/* ======================================================== */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "rgba(1, 15, 26, 0.95)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.15)",
        width: "100%",
        transition: "all 0.2s ease"
      }}>
        <div style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {/* Logo */}
          <div
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            title={isVi ? "Cuộn lên đầu trang" : "Scroll to top"}
          >
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00e5ff, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0,229,255,0.4)"
            }}>
              <i className="fa-solid fa-bolt" style={{ fontSize: "15px", color: "#010f1a" }}></i>
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.01em", color: "#ffffff" }}>
                GRAPH MIND
              </div>
              <div style={{ fontSize: "9px", letterSpacing: "0.08em", color: "#00e5ff", textTransform: "uppercase", fontWeight: "700" }}>
                KNOWLEDGE OBSERVATORY
              </div>
            </div>
          </div>

          {/* Smooth Scroll Nav Links (Single-page scroll down) */}
          <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <button
              onClick={(e) => {
                e?.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "transparent",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "6px 0",
                borderBottom: "2px solid transparent",
                transition: "all 0.15s ease",
                opacity: 0.92
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.opacity = "0.92"; }}
            >
              {isVi ? "Trang Chủ" : "Home"}
            </button>

            <button
              onClick={(e) => scrollToSection(e, "solutions")}
              style={{
                background: "transparent",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "6px 0",
                borderBottom: "2px solid transparent",
                transition: "all 0.15s ease",
                opacity: 0.92
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.opacity = "0.92"; }}
            >
              {isVi ? "Giải Pháp" : "Solution Matrix"}
            </button>

            <button
              onClick={(e) => scrollToSection(e, "testimonials")}
              style={{
                background: "transparent",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "6px 0",
                borderBottom: "2px solid transparent",
                transition: "all 0.15s ease",
                opacity: 0.92
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.opacity = "0.92"; }}
            >
              {isVi ? "Đánh Giá" : "Testimonial"}
            </button>

            <button
              onClick={(e) => scrollToSection(e, "newsletter")}
              style={{
                background: "transparent",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "6px 0",
                borderBottom: "2px solid transparent",
                transition: "all 0.15s ease",
                opacity: 0.92
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.opacity = "0.92"; }}
            >
              {isVi ? "Bản Tin" : "Newsletter"}
            </button>
          </nav>

          {/* Actions & Language */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2px" }}>
              <button
                onClick={() => onLangChange("en")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  borderRadius: "16px",
                  border: "none",
                  cursor: "pointer",
                  background: lang === "en" ? "#00e5ff" : "transparent",
                  color: lang === "en" ? "#010f1a" : "#ffffff"
                }}
              >
                EN
              </button>
              <button
                onClick={() => onLangChange("vi")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  borderRadius: "16px",
                  border: "none",
                  cursor: "pointer",
                  background: lang === "vi" ? "#00e5ff" : "transparent",
                  color: lang === "vi" ? "#010f1a" : "#ffffff"
                }}
              >
                VI
              </button>
            </div>

            <button
              onClick={onShowLogin}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "8px 14px"
              }}
            >
              {isVi ? "Đăng Nhập" : "Sign In"}
            </button>

            <button
              onClick={onEnterPlatform}
              style={{
                background: "transparent",
                border: "1.8px solid #ffffff",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                borderRadius: "24px",
                padding: "8px 20px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.color = "#010f1a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              {isVi ? "Vào Nền Tảng" : "Try for free"}
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* SECTION 1: DARK MIDNIGHT HERO                            */}
      {/* ======================================================== */}
      <section style={{ background: "linear-gradient(180deg, #010f1a 0%, #021727 100%)", color: "#ffffff", padding: "85px 0 70px 0" }}>
        {/* Hero Content Grid (50% Left / 50% Right) */}
        <div style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "40px 24px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          alignItems: "center"
        }}>
          {/* Left Column: Title & Checkboxes */}
          <div>
            {/* Small Brand Pill with Holographic Shimmer */}
            <div
              className="badge-shimmer"
              style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: "16px",
                border: "1px solid rgba(0,229,255,0.45)",
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "0.08em",
                color: "#00e5ff",
                marginBottom: "20px",
                textTransform: "uppercase"
              }}
            >
              ⚡ KNOWLEDGE GRAPH & GRAPHRAG
            </div>

            <h1 style={{
              fontSize: "36px",
              fontWeight: "800",
              lineHeight: 1.25,
              color: "#ffffff",
              marginBottom: "32px",
              letterSpacing: "-0.01em"
            }}>
              {isVi ? "Làm chủ nhu cầu dữ liệu với giải pháp toàn diện" : "Capture demand with all-in-one"} <br />
              <span style={{ color: "#ffffff", fontWeight: "900" }}>
                {isVi ? "Enterprise Knowledge Solution" : "Enterprise Knowledge Solution"}
              </span>
            </h1>

            {/* Two Side-by-Side Dark Container Boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "16px" }}>
              {/* Box 1: Dashed border checkmark list */}
              <div style={{
                background: "rgba(3, 27, 44, 0.7)",
                border: "1px dashed rgba(255, 255, 255, 0.3)",
                borderRadius: "6px",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "11.5px",
                color: "#e2e8f0"
              }}>
                {[
                  "14-day free trial",
                  "No credit card required",
                  "Cancel anytime",
                  "Lifetime deal offer"
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "transform 0.2s ease",
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                  >
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ffffff", color: "#011422", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", flexShrink: 0 }}>
                      <i className="fa-solid fa-check"></i>
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Box 2: Explanation & Pill Button */}
              <div style={{
                background: "rgba(3, 27, 44, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <p style={{ fontSize: "11.5px", lineHeight: "1.6", color: "#cbd5e1", margin: "0 0 14px 0" }}>
                  {isVi
                    ? "Mọi công cụ doanh nghiệp cần để biến tài liệu thành tri thức: từ thu nạp, phân giải đến suy luận nhân quả và ra quyết định."
                    : "Every tool you need to rank enterprise knowledge in one place: from ingestion to causal planning and team-driven execution."}
                </p>
                <button
                  onClick={onEnterPlatform}
                  style={{
                    alignSelf: "flex-start",
                    background: "transparent",
                    border: "1.8px solid #ffffff",
                    color: "#ffffff",
                    borderRadius: "20px",
                    padding: "6px 18px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.color = "#010f1a";
                    e.currentTarget.style.transform = "scale(1.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {isVi ? "Trải Nghiệm Miễn Phí" : "Try for free"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentic Hero Laptop Graphic from Template */}
          <div style={{
            position: "relative",
            width: "100%",
            minHeight: "380px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px"
          }}>
            {/* Ambient subtle glow backdrop */}
            <div style={{
              position: "absolute",
              width: "380px",
              height: "280px",
              background: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.16) 0%, rgba(3, 105, 161, 0.08) 50%, transparent 75%)",
              filter: "blur(32px)",
              pointerEvents: "none",
              zIndex: 0
            }} />

            <img
              src="/hero_laptop.png"
              alt="Graph Mind AI Enterprise Platform"
              style={{
                position: "relative",
                zIndex: 1,
                maxWidth: "100%",
                width: "520px",
                height: "auto",
                maxHeight: "380px",
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 12px 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 20px rgba(0, 229, 255, 0.2))"
              }}
            />
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: WHY US? (CLEAN CRISP WHITE BACKGROUND)       */}
      {/* ======================================================== */}
      <section id="why-us" style={{ background: "#ffffff", padding: "80px 24px 60px", scrollMarginTop: "76px" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "800",
            letterSpacing: "0.08em",
            color: "#00344d",
            marginBottom: "50px",
            textTransform: "uppercase"
          }}>
            {isVi ? "TẠI SAO CHỌN GRAPH MIND?" : "WHY US?"}
          </h2>

          {/* 3 Columns with Motion Hover */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "28px",
            textAlign: "center"
          }}>
            {/* Col 1 */}
            <div
              className="card-hover-elevate"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 24px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                cursor: "default"
              }}
            >
              <div style={{ width: "64px", height: "64px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src="/why_us/icon1.png"
                  alt="Workflow-centric and feature-rich"
                  style={{ width: "54px", height: "54px", objectFit: "contain", display: "block" }}
                />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#002b3d", marginBottom: "12px", lineHeight: "1.4" }}>
                {isVi ? "Tập trung quy trình & tính năng toàn diện" : "Workflow-centric and feature-rich"}
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: "1.7", maxWidth: "300px" }}>
                {isVi
                  ? "Trải nghiệm liền mạch từ quản lý tài liệu, trích xuất thực thể đồ thị đến suy luận đa tầng trong một không gian duy nhất."
                  : "Experience seamless creation in a single sitting and skyrocket your enterprise productivity with our complete toolset."}
              </p>
            </div>

            {/* Col 2 */}
            <div
              className="card-hover-elevate"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 24px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                cursor: "default"
              }}
            >
              <div style={{ width: "64px", height: "64px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src="/why_us/icon2.png"
                  alt="Easy onboarding and dependable support"
                  style={{ width: "54px", height: "54px", objectFit: "contain", display: "block" }}
                />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#002b3d", marginBottom: "12px", lineHeight: "1.4" }}>
                {isVi ? "Triển khai dễ dàng & hỗ trợ tin cậy" : "Easy onboarding and dependable support"}
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: "1.7", maxWidth: "300px" }}>
                {isVi
                  ? "Cơ sở tri thức được phân loại chuẩn mực cùng đội ngũ chuyên gia đảm bảo kết quả tối ưu và luôn đi đầu trong đổi mới."
                  : "Our categorized knowledge base & expert team provide optimal results & dependable customer support while keeping ahead."}
              </p>
            </div>

            {/* Col 3 */}
            <div
              className="card-hover-elevate"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 24px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                cursor: "default"
              }}
            >
              <div style={{ width: "64px", height: "64px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src="/why_us/icon3.png"
                  alt="Loaded editor and GPT-powered AI"
                  style={{ width: "54px", height: "54px", objectFit: "contain", display: "block" }}
                />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#002b3d", marginBottom: "12px", lineHeight: "1.4" }}>
                {isVi ? "Trình phân tích & Động cơ AI GraphRAG" : "Loaded editor and GPT-powered AI"}
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: "1.7", maxWidth: "300px" }}>
                {isVi
                  ? "Sử dụng sức mạnh suy luận nhân quả hỗ trợ người dùng tạo ra kết quả xuất sắc với định dạng trích dẫn chuẩn hóa."
                  : "Get GPT powered AI help producing engaging content with our content editor built for focus and exceptional results."}
              </p>
            </div>
          </div>

          {/* Thin horizontal divider line */}
          <div style={{ width: "60%", height: "2px", background: "#00344d", margin: "60px auto 0" }}></div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: STOP JUGGLING MULTIPLE TOOLS (COMPARISON)     */}
      {/* ======================================================== */}
      <section id="solutions" data-alias="matrix-table" style={{ background: "#ffffff", padding: "40px 24px 70px", scrollMarginTop: "76px" }}>
        <div style={{
          maxWidth: "1160px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "50px",
          alignItems: "center"
        }}>
          {/* Left Illustration */}
          <div style={{ width: "100%", height: "320px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 420 300" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="illGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              {/* Animated gears and floating cloud */}
              <g className="gear-spin-slow">
                <circle cx="90" cy="90" r="40" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="8 6" />
                <circle cx="90" cy="90" r="16" fill="#e2e8f0" />
              </g>
              <g className="gear-spin-slow-rev">
                <circle cx="340" cy="180" r="50" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" strokeDasharray="10 8" />
                <circle cx="340" cy="180" r="22" fill="#e2e8f0" />
              </g>

              {/* Cloud upload icon with animated arrow */}
              <path d="M320,110 C320,95 340,90 350,100 C365,95 380,110 375,125 L320,125 Z" fill="#00e5ff" opacity="0.85" />
              <g className="arrow-bounce-subtle">
                <path d="M350,105 L350,120 M345,115 L350,120 L355,115" stroke="#ffffff" strokeWidth="2.5" fill="none" />
              </g>

              {/* Main Desktop Monitor Illustration */}
              <rect x="80" y="60" width="240" height="150" rx="12" fill="#ffffff" stroke="#94a3b8" strokeWidth="3" />
              <rect x="90" y="70" width="220" height="130" rx="6" fill="#021f33" />
              {/* Screen code elements */}
              <rect x="105" y="85" width="60" height="8" rx="2" fill="#00e5ff" />
              <rect x="105" y="100" width="100" height="6" rx="2" fill="#94a3b8" />
              <rect x="105" y="112" width="80" height="6" rx="2" fill="#94a3b8" />
              <rect x="105" y="124" width="120" height="6" rx="2" fill="#94a3b8" />

              {/* Monitor Stand */}
              <path d="M180,210 L170,245 L230,245 L220,210 Z" fill="#94a3b8" />
              <rect x="150" y="245" width="100" height="8" rx="4" fill="#64748b" />

              {/* Mobile Device in foreground */}
              <rect x="250" y="140" width="70" height="120" rx="12" fill="#00e5ff" stroke="#ffffff" strokeWidth="3" />
              <rect x="256" y="152" width="58" height="95" rx="6" fill="#021f33" />
              <circle cx="285" cy="200" r="14" fill="#00e5ff" />
              <path d="M280,200 L284,204 L292,196" stroke="#001424" strokeWidth="2" fill="none" />

              {/* Code icon badge */}
              <rect x="130" y="170" width="48" height="32" rx="8" fill="#00e5ff" />
              <text x="154" y="191" fill="#001424" fontSize="14" fontWeight="800" textAnchor="middle">&lt;/&gt;</text>
            </svg>
          </div>

          {/* Right Matrix Table */}
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#002b3d", marginBottom: "8px", letterSpacing: "-0.01em" }}>
              {isVi ? "Chấm dứt việc phân mảnh công cụ và dữ liệu" : "Stop juggling multiple content tools"}
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
              {isVi ? "Tất cả trong một: Thu nạp, Phân giải, Đồ thị, Suy luận và Ra quyết định chính xác." : "All-in-one: Research, strategize, create, and optimize high-ranking content."}
            </p>

            {/* Structured Comparison Table */}
            <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "2px", overflow: "hidden", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#002b3d", fontWeight: "700", width: "30%", borderRight: "1.5px solid #cbd5e1" }}>
                      {isVi ? "Giai đoạn" : "Phase"}
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#002b3d", fontWeight: "700" }}>
                      {isVi ? "Giải pháp Graph Mind" : "Our solution"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155", borderRight: "1.5px solid #cbd5e1" }}>
                      {isVi ? "Thu nạp (Research)" : "Research"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", lineHeight: "1.6" }}>
                      • 247 Connectors (Google Drive, Sheets, ERP)<br />
                      • Automated File Watcher & Local Agent
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155", borderRight: "1.5px solid #cbd5e1" }}>
                      {isVi ? "Đồ thị (Planning)" : "Planning"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", lineHeight: "1.6" }}>
                      • Multi-Modal Knowledge Graph (142K Entities)<br />
                      • Human-In-The-Loop Validation Queue
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155", borderRight: "1.5px solid #cbd5e1" }}>
                      {isVi ? "Thực thi (Execution)" : "Execution"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", lineHeight: "1.6" }}>
                      • Python Hybrid GraphRAG Deterministic Engine<br />
                      • Multi-Hop Causal Reasoning (WHAT / WHY / ACTION)<br />
                      • Board-Ready Briefings & L5 Provenance Citations
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pill button */}
            <button
              onClick={onEnterPlatform}
              style={{
                background: "transparent",
                border: "1.8px solid #00344d",
                color: "#00344d",
                borderRadius: "20px",
                padding: "8px 24px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00344d";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#00344d";
              }}
            >
              {isVi ? "Xem Chi Tiết Tính Năng" : "See features"}
            </button>
          </div>
        </div>

        {/* Thin horizontal divider line */}
        <div style={{ maxWidth: "1160px", margin: "40px auto 0" }}>
          <div style={{ width: "60%", height: "2px", background: "#00344d", margin: "0 auto" }}></div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 4: TESTIMONIAL (DARK NAVY CARDS ON WHITE BG)     */}
      {/* ======================================================== */}
      <section id="testimonials" style={{ background: "#ffffff", padding: "30px 24px 80px", scrollMarginTop: "76px" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "22px",
            fontWeight: "800",
            letterSpacing: "0.08em",
            color: "#00344d",
            marginBottom: "40px",
            textTransform: "uppercase"
          }}>
            {isVi ? "ĐÁNH GIÁ TỪ LÃNH ĐẠO & KHÁCH HÀNG" : "TESTIMONIAL"}
          </h2>

          {/* 3 Dark Blue Cards with Elevation Hover */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px"
          }}>
            {/* Card 1 */}
            <div
              className="card-hover-elevate"
              style={{
                background: "#00283b",
                borderRadius: "12px",
                padding: "36px 24px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 10px 25px rgba(0,40,59,0.15)",
                border: "1px solid rgba(0,229,255,0.15)",
                cursor: "default",
                position: "relative"
              }}
            >
              {/* Circular Avatar Photo with Verified Badge */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <div style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  border: "2.5px solid #00e5ff",
                  boxShadow: "0 0 16px rgba(0, 229, 255, 0.35)",
                  overflow: "hidden",
                  background: "#011624"
                }}>
                  <img
                    src="/avatars/avatar_eva_chase.jpg"
                    alt="Eva Chase"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  background: "#00e5ff",
                  color: "#00283b",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  border: "2px solid #00283b",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                }} title="Doanh nghiệp đã xác thực">
                  <i className="fa-solid fa-check"></i>
                </div>
              </div>

              {/* Company Tag */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#7dd3fc",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                padding: "2px 10px",
                borderRadius: "12px",
                marginBottom: "12px"
              }}>
                <i className="fa-solid fa-building" style={{ fontSize: "9px" }}></i> Vinamilk Group
              </div>

              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", fontSize: "11px", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
              </div>
              <p style={{ fontSize: "11.5px", lineHeight: "1.7", color: "#e2e8f0", textAlign: "center", margin: "0 0 20px 0" }}>
                {isVi
                  ? "\"Graph Mind giúp ban điều hành phát hiện hợp đồng 1,2 tỷ sắp hết hạn và giảm thiểu 32% nguy cơ rời bỏ khách hàng một cách chính xác tuyệt đối.\""
                  : "\"It's pretty amazing tool and UI/UX is great. Google NLP API is something that I always wanted to have for enterprise knowledge and they've got that.\""}
              </p>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                Eva Chase
              </div>
              <div style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: "600" }}>
                {isVi ? "Giám đốc Chiến lược Tài chính" : "Chief Financial Officer"}
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="card-hover-elevate"
              style={{
                background: "#00283b",
                borderRadius: "12px",
                padding: "36px 24px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 10px 25px rgba(0,40,59,0.15)",
                border: "1px solid rgba(0,229,255,0.15)",
                cursor: "default",
                position: "relative"
              }}
            >
              {/* Circular Avatar Photo with Verified Badge */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <div style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  border: "2.5px solid #00e5ff",
                  boxShadow: "0 0 16px rgba(0, 229, 255, 0.35)",
                  overflow: "hidden",
                  background: "#011624"
                }}>
                  <img
                    src="/avatars/avatar_tran_m_anh.jpg"
                    alt="Trần M. Anh"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  background: "#00e5ff",
                  color: "#00283b",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  border: "2px solid #00283b",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                }} title="Doanh nghiệp đã xác thực">
                  <i className="fa-solid fa-check"></i>
                </div>
              </div>

              {/* Company Tag */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#7dd3fc",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                padding: "2px 10px",
                borderRadius: "12px",
                marginBottom: "12px"
              }}>
                <i className="fa-solid fa-building" style={{ fontSize: "9px" }}></i> Techcom Capital
              </div>

              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", fontSize: "11px", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
              </div>
              <p style={{ fontSize: "11.5px", lineHeight: "1.7", color: "#e2e8f0", textAlign: "center", margin: "0 0 20px 0" }}>
                {isVi
                  ? "\"Tính năng suy luận Hybrid GraphRAG giải thích rõ ràng TẠI SAO (WHY) chứ không chỉ đưa ra câu trả lời võ đoán như các Chatbot thông thường.\""
                  : "\"It's pretty amazing tool and UI/UX is great. GraphRAG reasoning with exact evidentiary citations has saved our team hundreds of research hours.\""}
              </p>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                Trần M. Anh
              </div>
              <div style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: "600" }}>
                {isVi ? "Giám đốc Mua hàng & Chuỗi Cung ứng" : "Procurement Director"}
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="card-hover-elevate"
              style={{
                background: "#00283b",
                borderRadius: "12px",
                padding: "36px 24px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 10px 25px rgba(0,40,59,0.15)",
                border: "1px solid rgba(0,229,255,0.15)",
                cursor: "default",
                position: "relative"
              }}
            >
              {/* Circular Avatar Photo with Verified Badge */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <div style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  border: "2.5px solid #00e5ff",
                  boxShadow: "0 0 16px rgba(0, 229, 255, 0.35)",
                  overflow: "hidden",
                  background: "#011624"
                }}>
                  <img
                    src="/avatars/avatar_le_v_hung.jpg"
                    alt="Lê V. Hùng"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  background: "#00e5ff",
                  color: "#00283b",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  border: "2px solid #00283b",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                }} title="Doanh nghiệp đã xác thực">
                  <i className="fa-solid fa-check"></i>
                </div>
              </div>

              {/* Company Tag */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#7dd3fc",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.2)",
                padding: "2px 10px",
                borderRadius: "12px",
                marginBottom: "12px"
              }}>
                <i className="fa-solid fa-building" style={{ fontSize: "9px" }}></i> PVN Energy Holding
              </div>

              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", fontSize: "11px", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
              </div>
              <p style={{ fontSize: "11.5px", lineHeight: "1.7", color: "#e2e8f0", textAlign: "center", margin: "0 0 20px 0" }}>
                {isVi
                  ? "\"Hàng đợi xác thực con người (HITL) giúp đội ngũ pháp chế kiểm soát chặt chẽ từng thực thể trước khi đưa vào kho dữ liệu cốt lõi.\""
                  : "\"The human-in-the-loop validation queues ensure infallible compliance and complete trust across all legal and executive tiers.\""}
              </p>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                Lê V. Hùng
              </div>
              <div style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: "600" }}>
                {isVi ? "Trưởng Ban Kiểm toán & Rủi ro" : "Chief Risk Officer"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 5: DARK NEWSLETTER BANNER (WITH 3D ROBOT MASCOT) */}
      {/* ======================================================== */}
      <section id="newsletter" style={{ background: "#011624", color: "#ffffff", padding: "70px 24px", scrollMarginTop: "76px" }}>
        <div style={{
          maxWidth: "1160px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "40px",
          alignItems: "center"
        }}>
          {/* Left Text & Input */}
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", marginBottom: "12px", letterSpacing: "-0.01em" }}>
              {isVi ? "Nhận báo cáo trí tuệ doanh nghiệp trực tiếp qua hộp thư!" : "Get the latest updates delivered straight to your inbox!"}
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "28px", lineHeight: "1.6" }}>
              {isVi
                ? "Đăng ký để nhận các bản tóm lược chiến lược và phát hiện rủi ro mới nhất. Một email mỗi tuần, không bao giờ spam!"
                : "Subscribe to get our best content in your inbox. One post at a time. No spam, ever!"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "440px" }}>
              <input
                type="email"
                placeholder={isVi ? "Địa chỉ email của bạn..." : "Your email"}
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
              <button
                onClick={() => handleSubscribe(newsletterEmail, "newsletter")}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "1.8px solid #ffffff",
                  color: "#ffffff",
                  borderRadius: "20px",
                  padding: "8px 28px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.color = "#011624";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#ffffff";
                }}
              >
                {isVi ? "Gửi Yêu Cầu" : "Submit"}
                <i className="fa-solid fa-paper-plane" style={{ marginLeft: "8px", fontSize: "11px" }}></i>
              </button>
            </div>
          </div>

          {/* Right Glowing 3D AI Robot / Mascot Graphic */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg viewBox="0 0 320 280" style={{ width: "280px", height: "250px" }}>
              <defs>
                <linearGradient id="pedestalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#001a2c" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="robotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Holographic background charts */}
              <g stroke="rgba(0,229,255,0.3)" strokeWidth="1.5" fill="none">
                <line x1="80" y1="90" x2="80" y2="170" />
                <line x1="100" y1="60" x2="100" y2="170" />
                <line x1="120" y1="110" x2="120" y2="170" />
                <line x1="220" y1="70" x2="220" y2="170" />
                <line x1="240" y1="100" x2="240" y2="170" />
              </g>

              {/* Isometric Glowing Pedestal Base */}
              <polygon points="160,180 260,220 160,260 60,220" fill="url(#pedestalGrad)" stroke="#00e5ff" strokeWidth="2" filter="url(#robotGlow)" />
              <polygon points="60,220 160,260 160,270 60,230" fill="#01101a" />
              <polygon points="160,260 260,220 260,230 160,270" fill="#021c2e" />

              {/* Glowing Aura with platform pulse */}
              <ellipse cx="160" cy="220" rx="42" ry="17" fill="#00e5ff" opacity="0.45" filter="url(#robotGlow)" className="platform-glow" />

              {/* 3D AI Robot Body with continuous levitation motion */}
              <g className="robot-levitate">
                <ellipse cx="160" cy="150" rx="26" ry="30" fill="url(#robotGrad)" />
                {/* Robot Head */}
                <rect x="138" y="90" width="44" height="34" rx="14" fill="url(#robotGrad)" />
                {/* Robot Eyes Visor */}
                <rect x="144" y="98" width="32" height="14" rx="7" fill="#010e17" />
                <circle cx="152" cy="105" r="3.2" fill="#00e5ff" />
                <circle cx="168" cy="105" r="3.2" fill="#00e5ff" />
                {/* Antenna */}
                <line x1="160" y1="90" x2="160" y2="78" stroke="#a855f7" strokeWidth="3" />
                <circle cx="160" cy="76" r="4.5" fill="#00e5ff" />

                {/* Floating holographic hands */}
                <ellipse cx="120" cy="150" rx="8" ry="12" fill="#818cf8" />
                <ellipse cx="200" cy="150" rx="8" ry="12" fill="#818cf8" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 6: VIETNAMESE ENTERPRISE FOOTER                  */}
      {/* ======================================================== */}
      <footer style={{ background: "#000d18", color: "#cbd5e1", padding: "60px 24px 30px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          maxWidth: "1160px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gap: "40px",
          marginBottom: "40px"
        }}>
          {/* Column 1: Company Info & Dashed Box */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#00e5ff",
                color: "#011624",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "900",
                boxShadow: "0 0 14px rgba(0, 229, 255, 0.45)",
                flexShrink: 0
              }}>
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", margin: 0, letterSpacing: "0.02em" }}>
                CÔNG TY CỔ PHẦN AEGIS GRAPH MIND
              </h3>
            </div>
            <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "16px" }}>
              Mã số thuế: 0109876543 do Sở Kế hoạch và Đầu tư Thành phố Hà Nội cấp ngày 01/01/2026.
            </p>

            {/* Address & Contact Box with Dashed Frame */}
            <div style={{
              border: "1px dashed rgba(0, 229, 255, 0.25)",
              background: "rgba(0, 229, 255, 0.02)",
              borderRadius: "6px",
              padding: "14px 16px",
              fontSize: "11.5px",
              lineHeight: "1.8",
              color: "#94a3b8",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {/* 1. HomepageAlternativeOutlined */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <i
                  className="fa-solid fa-house"
                  style={{ fontSize: "20px", color: "#00e5ff", marginRight: "8px", marginTop: "2px", flexShrink: 0, width: "22px", textAlign: "center" }}
                  title="Trụ sở chính"
                ></i>
                <span>Tòa tháp AEGIS Tower, Phường Mễ Trì, Quận Nam Từ Liêm, Hà Nội</span>
              </div>

              {/* 2. MailOutlined */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <i
                  className="fa-regular fa-envelope"
                  style={{ fontSize: "20px", color: "#00e5ff", marginRight: "8px", flexShrink: 0, width: "22px", textAlign: "center" }}
                  title="Hộp thư điện tử"
                ></i>
                <span>contact@graphmind.ai / info@aegis-ekmp.vn</span>
              </div>

              {/* 3. PhoneOutlined */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <i
                  className="fa-solid fa-phone"
                  style={{ fontSize: "20px", color: "#00e5ff", marginRight: "8px", flexShrink: 0, width: "22px", textAlign: "center" }}
                  title="Hotline hỗ trợ"
                ></i>
                <span>Hotline: 0987.654.321</span>
              </div>

              {/* 4. PrinterOutlined */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <i
                  className="fa-solid fa-print"
                  style={{ fontSize: "20px", color: "#00e5ff", marginRight: "8px", flexShrink: 0, width: "22px", textAlign: "center" }}
                  title="Fax / Hotline kỹ thuật"
                ></i>
                <span>Fax / Kỹ thuật: (+84) 24.3999.8888</span>
              </div>
            </div>
          </div>

          {/* Column 2: Legal & Guide Links */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "16px" }}>
              {isVi ? "HƯỚNG DẪN & PHÁP LÝ" : "LEGAL & COMPLIANCE"}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "11.5px", lineHeight: "2", color: "#94a3b8" }}>
              <li><a href="#why-us" style={{ color: "#94a3b8", textDecoration: "none" }}>{isVi ? "Hướng dẫn mua hàng & Đăng ký" : "Purchasing Guide"}</a></li>
              <li><a href="#solutions" style={{ color: "#94a3b8", textDecoration: "none" }}>{isVi ? "Khu vực triển khai On-premise" : "Deployment Regions"}</a></li>
              <li><a href="#testimonials" style={{ color: "#94a3b8", textDecoration: "none" }}>{isVi ? "Phương thức thanh toán doanh nghiệp" : "Payment Terms"}</a></li>
              <li><a href="#newsletter" style={{ color: "#94a3b8", textDecoration: "none" }}>{isVi ? "Chính sách bảo mật thông tin (L5)" : "Privacy Policy"}</a></li>
              <li><a href="#why-us" style={{ color: "#94a3b8", textDecoration: "none" }}>{isVi ? "Chính sách hoàn tiền & SLA 99.9%" : "Refund & SLA Policy"}</a></li>
            </ul>
          </div>

          {/* Column 3: Newsletter, Socials & Ministry Badge */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "14px" }}>
              {isVi ? "Đăng ký nhận thông tin mới nhất" : "Stay connected"}
            </h3>

            {/* Email input + Gửi button */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
              <input
                type="email"
                placeholder={isVi ? "Nhập email của bạn..." : "Your email..."}
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  outline: "none"
                }}
              />
              <button
                onClick={() => handleSubscribe(footerEmail, "footer")}
                style={{
                  background: "#00e5ff",
                  border: "none",
                  color: "#011624",
                  borderRadius: "4px",
                  padding: "7px 16px",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.15)"}
                onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
              >
                <span>{isVi ? "Gửi" : "Send"}</span>
              </button>
            </div>

            {/* Real Official Social Brand Icons matching Design Spec */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
              {[
                { type: "font", icon: "fa-brands fa-facebook", bg: "#3b5998", name: "Facebook", link: "https://facebook.com" },
                { type: "font", icon: "fa-brands fa-youtube", bg: "#cc181e", name: "YouTube", link: "https://youtube.com" },
                { type: "font", icon: "fa-brands fa-tiktok", bg: "#111111", border: "1px solid rgba(255,255,255,0.2)", name: "TikTok", link: "https://tiktok.com" },
                { type: "font", icon: "fa-brands fa-instagram", bg: "#e1306c", name: "Instagram", link: "https://instagram.com" },
                { type: "svg", src: "/zalo.svg", bg: "#0068FF", name: "Zalo", link: "https://zalo.me" },
                { type: "font", icon: "fa-brands fa-twitter", bg: "#1da1f2", name: "Twitter", link: "https://twitter.com" }
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "5px",
                    background: item.bg,
                    border: item.border || "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    textDecoration: "none",
                    overflow: "hidden",
                    flexShrink: 0,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {item.type === "svg" ? (
                    <img
                      src={item.src}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <i className={item.icon} style={{ fontSize: "18px" }}></i>
                  )}
                </a>
              ))}
            </div>

            {/* Official Ministry of Industry and Trade Verification Emblem Badge */}
            <a
              href="http://online.gov.vn/"
              target="_blank"
              rel="noopener noreferrer"
              title="Đã thông báo với Bộ Công Thương"
              style={{
                display: "inline-block",
                textDecoration: "none",
                transition: "transform 0.2s ease, filter 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.filter = "brightness(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.filter = "none";
              }}
            >
              <img
                src="/bo_cong_thuong.png"
                alt="Đã thông báo Bộ Công Thương"
                style={{
                  height: "36px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))"
                }}
              />
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{
          maxWidth: "1160px",
          margin: "0 auto",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#64748b"
        }}>
          <div>© 2026 AEGIS Graph Mind Corporation. All rights reserved.</div>
          <div>Enterprise Knowledge Management & Decision Support Platform (EKMP).</div>
        </div>
      </footer>
    </div>
  );
}
