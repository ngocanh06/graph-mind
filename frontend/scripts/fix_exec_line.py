# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\ExecutiveView.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

lines[98] = '                  className={`px-space-sm py-space-2xs font-label-caps text-label-caps transition-colors rounded-DEFAULT ${activeRange === range ? "bg-surface-container-high text-primary font-bold shadow-inner" : "text-on-surface-variant hover:text-on-surface"}`}\\n'

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\ExecutiveView.jsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Replaced line 99 cleanly!")
