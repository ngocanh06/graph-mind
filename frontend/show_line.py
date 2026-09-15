# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\ExecutiveView.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(94, min(104, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")
