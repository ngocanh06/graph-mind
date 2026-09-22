# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\App.jsx", "r", encoding="utf-8") as f:
    text = f.read()

old_state = 'const [pageMode, setPageMode] = useState("app");'
new_state = """const [pageMode, setPageMode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("mode");
      if (p === "app") return "app";
      if (p === "landing") return "landing";
      if (p === "color") return "color-landing";
    } catch (e) {}
    return "color-landing"; // Default to show the new Chroma_Mind Color Platform!
  });"""

text = text.replace(old_state, new_state)

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\App.jsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated App.jsx default pageMode to color-landing!")
