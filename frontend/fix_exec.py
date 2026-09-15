# -*- coding: utf-8 -*-
with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\ExecutiveView.jsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix onVlick -> onClick
text = text.replace("onVlick=", "onClick=")
# Fix ${\\n ... \\n}
text = text.replace("${\\n                    activeRange === range\\n                      ? \\\"bg-surface-container-high text-primary font-bold shadow-inner\\\"\\n                      : \\\"text-on-surface-variant hover:text-on-surface\\\"\\n                  }",
                    "${activeRange === range ? \"bg-surface-container-high text-primary font-bold shadow-inner\" : \"text-on-surface-variant hover:text-on-surface\"}")

with open(r"D:\Dokumen\NgocAnh\FULLSTACK\graph-mind\frontend\src\views\ExecutiveView.jsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed ExecutiveView.jsx!")
