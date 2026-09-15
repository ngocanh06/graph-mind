# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "r", encoding="utf-8") as f:
    text = f.read()

idx = text.find("landing-hero")
# Find opening <div before landing-hero
idx_div = text.rfind("<div", 0, idx)

hero_and_rest = text[idx_div:]

clean_header = """import React from "react";

export default function LandingPage({ onEnterPlatform, onShowLogin, onOpenColorLanding, lang, onLangChange, theme, onThemeChange, t }) {
  return (
    <div className="landing-view active">
      <header className="landing-header">
        <div className="rail-brand" style={{ border: "none", padding: 0, cursor: "pointer" }} onClick={onEnterPlatform}>
          <div className="brand-mark"></div>
          <div className="brand-text" style={{ opacity: 1 }}>
            GRAPH MIND<span>{t.brand_sub}</span>
          </div>
        </div>

        <nav className="landing-nav">
          <a href="#capabilities">Platform</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#evidence-ai">Evidence-First AI</a>
          <a href="#security">Trust & Security</a>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="ctrl-group">
            <button className={`ctrl-btn ${lang === "en" ? "active" : ""}`} onClick={() => onLangChange("en")}>
              EN
            </button>
            <button className={`ctrl-btn ${lang === "vi" ? "active" : ""}`} onClick={() => onLangChange("vi")}>
              VI
            </button>
          </div>

          <div className="ctrl-group">
            <button className={`ctrl-btn ${theme === "light" ? "active" : ""}`} onClick={() => onThemeChange("light")}>
              Light
            </button>
            <button className={`ctrl-btn ${theme === "dark" ? "active" : ""}`} onClick={() => onThemeChange("dark")}>
              Dark
            </button>
          </div>

          {onOpenColorLanding && (
            <button
              className="btn sm"
              onClick={onOpenColorLanding}
              style={{ borderColor: "#00E5FF", color: "#00E5FF", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
              title="Khám phá nền tảng màu sắc Chroma_Mind"
            >
              <span>🎨</span>
              <span>Chroma_Mind Bảng Màu</span>
            </button>
          )}

          <button className="btn sm" onClick={onShowLogin}>
            {t.btn_signin}
          </button>
          <button className="btn primary sm" onClick={onEnterPlatform}>
            {t.btn_enter_platform}
          </button>
        </div>
      </header>

"""

full_content = clean_header + hero_and_rest
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "w", encoding="utf-8") as f:
    f.write(full_content)

print("Restored LandingPage.jsx cleanly!")
