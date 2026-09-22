# -*- coding: utf-8 -*-

# 1. Update LandingPage.jsx
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "export default function LandingPage({ onEnterPlatform, onShowLogin, lang, onLangChange, theme, onThemeChange, t }) {",
    "export default function LandingPage({ onEnterPlatform, onShowLogin, onOpenColorLanding, lang, onLangChange, theme, onThemeChange, t }) {"
)

btn_code = """          {onOpenColorLanding && (
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
"""

target_btn = 'className="btn sm" onClick={onShowLogin}>'
if "Chroma_Mind Bảng Màu" not in text:
    text = text.replace(target_btn, btn_code + "\\n          " + target_btn)

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated LandingPage.jsx with onOpenColorLanding button!")

# 2. Update Topbar.jsx
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\Topbar.jsx", "r", encoding="utf-8") as f:
    top_text = f.read()

top_text = top_text.replace(
    "  onOpenLanding,\\n  onNavigate,",
    "  onOpenLanding,\\n  onOpenColorLanding,\\n  onNavigate,"
)

top_btn = """        {onOpenColorLanding && (
          <button
            className="btn sm"
            onClick={onOpenColorLanding}
            style={{ borderColor: "#00E5FF", color: "#00E5FF", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px" }}
            title="Khám phá Landing Page Bảng màu sắc Chroma_Mind"
          >
            <span>🎨</span>
            <span style={{ fontSize: "11px", fontWeight: "600" }}>Chroma_Mind (Bảng Màu)</span>
          </button>
        )}
"""

if "Chroma_Mind (Bảng Màu)" not in top_text:
    top_text = top_text.replace(
        '<div className="topbar-right">',
        '<div className="topbar-right">\\n' + top_btn
    )

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\Topbar.jsx", "w", encoding="utf-8") as f:
    f.write(top_text)

print("Updated Topbar.jsx with onOpenColorLanding button!")
