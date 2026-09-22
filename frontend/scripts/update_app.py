# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\App.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add import
if "ColorPaletteLandingPage" not in code:
    code = code.replace('import LandingPage from "./components/LandingPage";',
                        'import LandingPage from "./components/LandingPage";\\nimport ColorPaletteLandingPage from "./components/ColorPaletteLandingPage";')

# 2. Add color-landing view check
color_block = """  if (pageMode === "color-landing") {
    return (
      <ColorPaletteLandingPage
        onEnterPlatform={() => {
          setPageMode("app");
          setView("executive");
        }}
        onOpenKnowledgeLanding={() => setPageMode("landing")}
        onShowLogin={() => setPageMode("login")}
      />
    );
  }
"""

if 'pageMode === "color-landing"' not in code:
    code = code.replace('if (pageMode === "landing") {', color_block + '\\n  if (pageMode === "landing") {')

# 3. Add onOpenColorLanding to LandingPage
code = code.replace('onShowLogin={() => setPageMode("login")}',
                    'onShowLogin={() => setPageMode("login")}\\n        onOpenColorLanding={() => setPageMode("color-landing")}')

# 4. Pass onOpenColorLanding to Topbar and NavRail
code = code.replace('onOpenLanding={() => setPageMode("landing")}',
                    'onOpenLanding={() => setPageMode("landing")}\\n        onOpenColorLanding={() => setPageMode("color-landing")}')

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\App.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated App.jsx with ColorPaletteLandingPage support!")
