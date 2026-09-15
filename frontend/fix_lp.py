# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "r", encoding="utf-8") as f:
    text = f.read()

header_bad = """          <button           {onOpenColorLanding && (
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
\\n          className="btn sm" onClick={onShowLogin}>"""

# Or let us find lines and replace cleanly:
lines = text.split("\\n")
new_lines = []
skip = False
for line in lines:
    if "onOpenColorLanding && (" in line:
        new_lines.append('          {onOpenColorLanding && (')
        new_lines.append('            <button')
        new_lines.append('              className="btn sm"')
        new_lines.append('              onClick={onOpenColorLanding}')
        new_lines.append('              style={{ borderColor: "#00E5FF", color: "#00E5FF", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}')
        new_lines.append('              title="Khám phá nền tảng màu sắc Chroma_Mind"')
        new_lines.append('            >')
        new_lines.append('              <span>🎨</span>')
        new_lines.append('              <span>Chroma_Mind Bảng Màu</span>')
        new_lines.append('            </button>')
        new_lines.append('          )}')
        new_lines.append('          <button className="btn sm" onClick={onShowLogin}>')
        skip = True
    elif skip and "btn_signin" in line:
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

fixed_text = "\\n".join(new_lines)
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\components\LandingPage.jsx", "w", encoding="utf-8") as f:
    f.write(fixed_text)

print("Fixed LandingPage cleanly!")
