"""
Unit test for PDF generation with Vietnamese Unicode font (DejaVu Sans).
Tests font registration, PDF rendering, text extraction, and diacritic fidelity.
"""
import io
import tempfile
from pathlib import Path
import pytest
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import pdfplumber

from app.core.pdf_fonts import register_vietnamese_fonts, FONTS_DIR


def test_fonts_exist():
    """Verify DejaVu Sans TTF and LICENSE files are present."""
    regular = FONTS_DIR / "DejaVuSans.ttf"
    bold = FONTS_DIR / "DejaVuSans-Bold.ttf"
    license_file = FONTS_DIR / "LICENSE"

    assert regular.exists(), "DejaVuSans.ttf must exist"
    assert bold.exists(), "DejaVuSans-Bold.ttf must exist"
    assert license_file.exists(), "Font LICENSE file must exist"
    assert regular.stat().st_size > 500_000
    assert bold.stat().st_size > 500_000


def test_pdf_vietnamese_diacritics_fidelity():
    """
    Generate a PDF containing 'Hồ sơ bàn giao hệ thống - Nguyễn Thị Ánh'
    using ReportLab + DejaVuSans, then extract text and verify 100% exact diacritics.
    """
    register_vietnamese_fonts()

    expected_phrase = "Hồ sơ bàn giao hệ thống - Nguyễn Thị Ánh"
    extra_text = "Hệ thống Quản trị Tri thức GraphMind PB42 — Bàn giao Nghiệm thu"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    styles = getSampleStyleSheet()
    vn_style = ParagraphStyle(
        name="VietnameseHeading",
        parent=styles["Heading1"],
        fontName="DejaVuSans-Bold",
        fontSize=18,
        leading=22,
    )
    vn_body = ParagraphStyle(
        name="VietnameseBody",
        parent=styles["Normal"],
        fontName="DejaVuSans",
        fontSize=12,
        leading=16,
    )

    story = [
        Paragraph(expected_phrase, vn_style),
        Spacer(1, 12),
        Paragraph(extra_text, vn_body),
    ]

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    assert len(pdf_bytes) > 1000, "Generated PDF must not be empty"

    # Extract text from generated PDF and verify exact character match
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        first_page = pdf.pages[0]
        extracted_text = first_page.extract_text()

    assert expected_phrase in extracted_text, (
        f"Extracted text failed to match expected phrase.\nExpected: {expected_phrase}\nFound: {extracted_text}"
    )
    assert "GraphMind PB42" in extracted_text

