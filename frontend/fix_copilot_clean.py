# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\CopilotView.jsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace any className={p-space-sm ... } with backtick template literal
for t_id in [1, 2, 3]:
    bad = "className={p-space-sm rounded-DEFAULT cursor-pointer shadow-inner position-relative overflow-hidden group ${\\n                activeThread === " + str(t_id) + " ? \"bg-surface-container-high\" : \"bg-surface-container-lowest hover:bg-surface-container\"\\n              }}\\n            >"
    good = "className={`p-space-sm rounded-DEFAULT cursor-pointer shadow-inner relative overflow-hidden group ${activeThread === " + str(t_id) + " ? \"bg-surface-container-high\" : \"bg-surface-container-lowest hover:bg-surface-container\"}`}\\n            >"
    text = text.replace(bad, good)

# Also check for any generic ${\\n in text
text = text.replace("${\\n", "${")
text = text.replace("\\n              }", "}")

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\CopilotView.jsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Cleaned CopilotView.jsx!")
