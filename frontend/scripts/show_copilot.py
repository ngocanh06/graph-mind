# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\CopilotView.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(130, 142):
    print(f"{i+1}: {repr(lines[i])}")
