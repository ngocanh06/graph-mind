"""
PDF Unicode Font Manager for ReportLab.
Registers DejaVu Sans (Regular & Bold) for standard Vietnamese diacritics support.
"""
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_FONTS_REGISTERED = False


def register_vietnamese_fonts() -> bool:
    """
    Registers DejaVuSans and DejaVuSans-Bold TrueType fonts in ReportLab.
    Idempotent: safe to call repeatedly.
    """
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return True

    regular_path = FONTS_DIR / "DejaVuSans.ttf"
    bold_path = FONTS_DIR / "DejaVuSans-Bold.ttf"

    if not regular_path.exists():
        raise FileNotFoundError(f"Missing font file: {regular_path}")
    if not bold_path.exists():
        raise FileNotFoundError(f"Missing font file: {bold_path}")

    pdfmetrics.registerFont(TTFont("DejaVuSans", str(regular_path)))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(bold_path)))
    _FONTS_REGISTERED = True
    return True

