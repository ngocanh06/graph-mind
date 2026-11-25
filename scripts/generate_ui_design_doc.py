"""
GraphMind — Capstone Project 1 (C1SE18)
User Interface Design Document Generator
Generates:
  - docs/C1SE18_USER_INTERFACE_DESIGN_GraphMind_ver1.0.docx
  - final_document/C1SE18_UserInterfaceDesign_GraphMind_Ver1_0.docx
Matches template: C2SE.27_USER INTERFACE DESIGN_SmartMealVN_ver1.0.docx
"""

import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCREENSHOTS_DIR = os.path.join(REPO_ROOT, "docs", "ui_screenshots")
OUT_DOCS = os.path.join(REPO_ROOT, "docs", "C1SE18_USER_INTERFACE_DESIGN_GraphMind_ver1.0.docx")
OUT_FINAL = os.path.join(REPO_ROOT, "final_document", "C1SE18_UserInterfaceDesign_GraphMind_Ver1_0.docx")

# Styling helper functions
def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_p(doc, text="", bold=False, italic=False, size=11, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=6, space_before=0, color=RGBColor(30, 41, 59)):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.line_spacing = 1.15
    if text:
        r = p.add_run(text)
        r.bold = bold
        r.italic = italic
        r.font.name = "Times New Roman"
        r.font.size = Pt(size)
        r.font.color.rgb = color
    return p

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(30, 58, 138) # Navy Blue #1E3A8A
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(13.5)
    r.font.color.rgb = RGBColor(15, 23, 42)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.italic = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(11.5)
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def create_spec_table(doc, table_title, columns, rows_data, col_widths=None):
    """
    Creates a standardized UI Field Specification Table matching SmartMealVN template:
    Row 0: Merged Table Title
    Row 1: Column Headers (No., Field name, Type, Require, Target)
    Row 2..N: Data rows
    """
    total_cols = len(columns)
    table = doc.add_table(rows=len(rows_data) + 2, cols=total_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color="CBD5E1")

    # 1. Merged Header Row (Table Title)
    hdr_row = table.rows[0]
    cell_a = hdr_row.cells[0]
    for c in hdr_row.cells[1:]:
        cell_a.merge(c)
    set_cell_background(cell_a, "1E3A8A") # Dark Navy Blue
    set_cell_margins(cell_a, top=110, bottom=110, left=140, right=140)
    p = cell_a.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(table_title)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(255, 255, 255)

    # 2. Sub-Header Row
    col_row = table.rows[1]
    for idx, col_name in enumerate(columns):
        cell = col_row.cells[idx]
        set_cell_background(cell, "2563EB") # Royal Blue
        set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(col_name)
        r.bold = True
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    # 3. Data Rows
    for r_idx, row_item in enumerate(rows_data):
        row = table.rows[r_idx + 2]
        bg_hex = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_item):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg_hex)
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(val))
            r.font.name = "Times New Roman"
            r.font.size = Pt(9)
            if c_idx == 0:
                r.bold = True
            r.font.color.rgb = RGBColor(30, 41, 59)

    # Apply column widths
    if col_widths:
        for row in table.rows:
            for idx, w in enumerate(col_widths):
                if idx < len(row.cells):
                    row.cells[idx].width = Inches(w)

    add_p(doc, "", space_after=10)
    return table

def build_document():
    print("[+] Creating GraphMind UI Design Document...")
    doc = Document()

    # Page Margins (DTU Academic standard)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.2)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

    # ── COVER PAGE ────────────────────────────────────────────────────────────
    add_p(doc, "DUY TAN UNIVERSITY", bold=True, size=15, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, color=RGBColor(185, 28, 28))
    add_p(doc, "INTERNATIONAL SCHOOL", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4, color=RGBColor(30, 58, 138))
    add_p(doc, "DEPARTMENT OF COMPUTER SCIENCE & SOFTWARE ENGINEERING", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=28, color=RGBColor(71, 85, 105))

    add_p(doc, "CAPSTONE PROJECT 1 (C1SE18)", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6, color=RGBColor(30, 58, 138))
    add_p(doc, "USER INTERFACE DESIGN DOCUMENT", bold=True, size=22, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8, color=RGBColor(15, 23, 42))
    add_p(doc, "Version 1.0 — Academic Year 2026", italic=True, size=12, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24, color=RGBColor(100, 116, 139))

    # Project Title Box
    p_box = add_p(doc, "PROJECT TITLE:", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4, color=RGBColor(30, 58, 138))
    add_p(doc, "GraphMind: Enterprise Knowledge Intelligence & Decision Support Platform", bold=True, size=14, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, color=RGBColor(15, 23, 42))
    add_p(doc, "(GraphRAG-based Knowledge Management Platform for SME Decision Support)", italic=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=40, color=RGBColor(71, 85, 105))

    # Members Table
    add_p(doc, "STUDENT IMPLEMENTATION TEAM — C1SE18:", bold=True, size=11, space_after=4, color=RGBColor(30, 58, 138))
    team_table = doc.add_table(rows=6, cols=3)
    team_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(team_table, color="CBD5E1")
    t_hdrs = ["Student ID", "Full Name", "Assigned Capstone Role"]
    for i, h in enumerate(t_hdrs):
        cell = team_table.rows[0].cells[i]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    members = [
        ("3814", "Trần Thị Ngọc Ánh", "Team Leader, Fullstack UI/UX & Quality Assurance"),
        ("2309", "Huỳnh Ngọc Minh", "Backend API Architect, Copilot & Query Engine"),
        ("1082", "Hà Hoàng Anh", "Database Engineer, Neo4j Graph & QA Automation"),
        ("1905", "Trần Viết Anh Vũ", "Data Pipeline, Docker Ingestion & ETL Engineer"),
        ("1234", "Phan Anh Bảo", "DevOps, Security, RBAC & Workstations Telemetry")
    ]
    for r_idx, m in enumerate(members):
        row = team_table.rows[r_idx + 1]
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(m):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9)
            if c_idx == 0:
                r.bold = True

    add_p(doc, "", space_after=20)
    add_p(doc, "PROJECT SUPERVISOR / MENTOR:", bold=True, size=11, space_after=2, color=RGBColor(30, 58, 138))
    add_p(doc, "PhD. Kim Tran Sanh — Faculty of Information Technology & Software Engineering", bold=True, size=11, space_after=20, color=RGBColor(15, 23, 42))

    doc.add_page_break()

    # ── DOCUMENT CONTROL & REVISION HISTORY ──────────────────────────────────
    add_heading_1(doc, "DOCUMENT CONTROL & APPROVALS")
    add_p(doc, "This document establishes the official User Interface Design specifications for the GraphMind enterprise software product. Any architectural or structural UI/UX modification must follow the formal Change Request (CR) procedure.", italic=True, size=10, space_after=8)

    # Table 1: Approval Matrix
    app_table = doc.add_table(rows=4, cols=4)
    app_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(app_table, color="CBD5E1")
    app_hdrs = ["Document Title", "User Interface Design Document (UI/UX Specification)", "", ""]
    # merge row 0
    app_table.rows[0].cells[0].merge(app_table.rows[0].cells[3])
    set_cell_background(app_table.rows[0].cells[0], "1E3A8A")
    set_cell_margins(app_table.rows[0].cells[0], 90, 90, 120, 120)
    pr = app_table.rows[0].cells[0].paragraphs[0]
    rn = pr.add_run("Table 1: Document Metadata & Formal Approvals")
    rn.bold = True
    rn.font.name = "Times New Roman"
    rn.font.size = Pt(10)
    rn.font.color.rgb = RGBColor(255, 255, 255)

    approval_rows = [
        ("Author(s)", "Trần Thị Ngọc Ánh, Huỳnh Ngọc Minh, Hà Hoàng Anh", "Role", "Frontend Architect, Product Team C1SE18"),
        ("Project Sponsor", "Duy Tan University International School", "Target Release", "GraphMind Production Release v1.0"),
        ("Approved By", "PhD. Kim Tran Sanh", "Approval Date", "November 25th, 2026")
    ]
    for idx, (f1, v1, f2, v2) in enumerate(approval_rows):
        row = app_table.rows[idx + 1]
        for c_idx, val in enumerate([f1, v1, f2, v2]):
            cell = row.cells[c_idx]
            bg = "F8FAFC" if c_idx % 2 == 0 else "FFFFFF"
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9)
            if c_idx % 2 == 0:
                r.bold = True

    add_p(doc, "", space_after=12)

    # Table 2: Version History
    add_heading_2(doc, "Version Revision History")
    rev_table = doc.add_table(rows=4, cols=5)
    rev_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(rev_table, color="CBD5E1")
    rev_hdrs = ["Version", "Release Date", "Primary Changes & Scope", "Author", "Review Status"]
    for i, h in enumerate(rev_hdrs):
        cell = rev_table.rows[0].cells[i]
        set_cell_background(cell, "2563EB")
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    revisions = [
        ("v0.1", "15/10/2026", "Initial UI wireframes & navigation tree draft for Sprints 1-2", "Trần Thị Ngọc Ánh", "Approved (Internal)"),
        ("v0.8", "12/11/2026", "Consolidated 6 modules: Risk Observatory, Hybrid Copilot, HITL Knowledge Editor", "C1SE18 Team", "Reviewed (Sprint 3)"),
        ("v1.0", "25/11/2026", "Finalized enterprise UI design with 22 high-resolution screens, BVA/EP forms & dark mode", "Trần Thị Ngọc Ánh", "Approved (Final Capstone)")
    ]
    for r_idx, rev in enumerate(revisions):
        row = rev_table.rows[r_idx + 1]
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(rev):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9)
            if c_idx == 0:
                r.bold = True

    add_p(doc, "", space_after=14)

    # Table of Contents Outline
    add_heading_2(doc, "Document Table of Contents Outline")
    toc_items = [
        "1. INTRODUCTION & SYSTEM DESIGN PHILOSOPHY",
        "    1.1. Document Purpose & Objectives",
        "    1.2. Product Scope & Functional Modules (M1 - M6)",
        "    1.3. UI/UX Architecture & Technical Stack (React 18 + TailwindCSS + Lucide/FA Icons)",
        "    1.4. Role-based Access Control (RBAC) & Visual Tier Isolation",
        "2. USER INTERFACE DETAILED SPECIFICATIONS",
        "    2.1. Authentication & Identity Management (SCREEN-001 to SCREEN-003)",
        "    2.2. Executive Decision Support & Performance Dashboards (SCREEN-004 to SCREEN-008)",
        "    2.3. Intelligent Hybrid AI Copilot & Grounding Preview (SCREEN-009 to SCREEN-010)",
        "    2.4. Multi-facet Search & Knowledge Graph Exploration (SCREEN-011 to SCREEN-013)",
        "    2.5. Knowledge Repository & SOP Workflow Governance (SCREEN-014 to SCREEN-017)",
        "    2.6. System Administration, Security Audit & Connectivity (SCREEN-018 to SCREEN-022)",
        "3. NON-FUNCTIONAL UI REQUIREMENTS & ACCESSIBILITY",
        "    3.1. Responsive Breakpoints & Device Form Factors",
        "    3.2. Performance Budgets, Perceived Latency & Asynchronous Telemetry",
        "    3.3. WCAG 2.1 AA Accessibility & Enterprise Dark Mode Adaptability",
        "    3.4. Bilingual Localization (EN / VI) Architecture"
    ]
    for item in toc_items:
        add_p(doc, item, size=9.5, space_after=2, color=RGBColor(51, 65, 85))

    doc.add_page_break()

    # ── SECTION 1: INTRODUCTION ───────────────────────────────────────────────
    add_heading_1(doc, "1. INTRODUCTION & SYSTEM DESIGN PHILOSOPHY")

    add_heading_2(doc, "1.1. Document Purpose & Objectives")
    add_p(doc, "The User Interface Design Document (UIDD) provides an exhaustive, field-level technical blueprint for the front-end user experience of GraphMind. GraphMind is an Enterprise Knowledge Intelligence & Executive Decision Support Platform designed for small-to-medium enterprises (SMEs) to unify heterogeneous unstructured documents (CUAD legal contracts, NDA, SOPs) with structured relational ERP datasets (AdventureWorks sales orders, financial records, inventory items).")
    add_p(doc, "This document serves as the authoritative visual contract between the Capstone development engineering team, system testers, UI/UX evaluators, and academic mentors. Every screen, interactive modal, drawer, filter toolbar, and table component is rigorously specified with visual representations, control types, styling requirements, and event handlers.")

    add_heading_2(doc, "1.2. Product Scope & Functional Modules")
    add_p(doc, "GraphMind encapsulates six core functional modules aligned with the Capstone C1SE18 System Requirements Specification (SRS):")
    modules_desc = [
        ("Module 1 (M1 — Data Sync & Ingestion):", "Local AEGIS file watcher and Google Drive cloud connector with SHA-256 integrity verification and automated document registration."),
        ("Module 2 (M2 — Knowledge Management & SOP Wiki):", "Central file repository (581 contracts/documents), Human-in-the-Loop (HITL) Graph Editor, and Standard Operating Procedure (SOP) authoring."),
        ("Module 3 (M3 — Hybrid AI Copilot):", "Multi-model reasoning combining Qdrant Vector search with Neo4j Graph Cypher traversal and Qwen2.5-7B ChatML LLM inference."),
        ("Module 4 (M4 — Decision Support & Risk Observatory):", "Executive KPIs, profit margin analysis, enterprise risk observatory, and automated daily shift handover consolidation."),
        ("Module 5 (M5 — Multi-facet Search & Explorer):", "Unified faceted search spanning Contracts, Customers, Products, and SOPs with interactive Neo4j force-directed graph canvas."),
        ("Module 6 (M6 — Admin, Security & RBAC):", "User lifecycle management, single-active-session kick enforcement, granular department matrix, and SHA-256 tamper-evident audit logs.")
    ]
    for m_title, m_desc in modules_desc:
        p = add_p(doc, "• ", bold=True, size=10, space_after=3)
        r1 = p.add_run(m_title + " ")
        r1.bold = True
        r1.font.name = "Times New Roman"
        r1.font.color.rgb = RGBColor(30, 58, 138)
        r2 = p.add_run(m_desc)
        r2.font.name = "Times New Roman"
        r2.font.color.rgb = RGBColor(51, 65, 85)

    add_heading_2(doc, "1.3. UI/UX Architecture & Technical Stack")
    add_p(doc, "GraphMind front-end is engineered as a modern Single Page Application (SPA) leveraging industry-standard frameworks:")
    add_p(doc, "1. Core Framework: React 18.3 with Vite 5.4 build tooling ensuring <600ms cold start and instant Hot Module Replacement (HMR).")
    add_p(doc, "2. Styling Engine: TailwindCSS 3.4 with CSS variables design token architecture, supporting seamless runtime theme switching (Enterprise Light vs. High-Contrast Dark Mode).")
    add_p(doc, "3. Iconography: FontAwesome 6 Pro and Lucide React icons wrapped in a unified shim with defensive rendering preventing layout shifts.")
    add_p(doc, "4. In-browser Document Rendering: docx-preview for client-side Word rendering and HTML5 Canvas PDF.js for multi-page contract inspection.")
    add_p(doc, "5. Graph Visualization: Cytoscape.js & Canvas force-directed graph algorithms for smooth 60fps interaction on 50,000+ node schemas.")

    add_heading_2(doc, "1.4. Role-based Access Control (RBAC) & Visual Tier Isolation")
    add_p(doc, "The user interface enforces four distinct visual access tiers defined in BR-02 (Departmental Scope) and BR-05 (Executive Decision Privacy):")
    add_p(doc, "• Executive / CEO (exec): Unrestricted visibility across all 5 departments, Executive Decision View, Margin Analysis, and Risk Observatory.")
    add_p(doc, "• Knowledge Manager (manager): Knowledge Editor, SOP authoring, document approval workflows, and departmental performance.")
    add_p(doc, "• System Administrator (admin): Complete administrative authority, user accounts, RBAC policy matrix, tamper-evident audit logs, and system telemetry.")
    add_p(doc, "• Standard User (ops / standard): Strict departmental isolation (e.g. Sales user only sees Sales orders and products; CUAD legal contracts and risk alerts are automatically hidden).")

    doc.add_page_break()

    # ── SECTION 2: DETAILED SCREEN SPECIFICATIONS ──────────────────────────────
    add_heading_1(doc, "2. USER INTERFACE DETAILED SPECIFICATIONS")
    add_p(doc, "This chapter presents the detailed screen layouts, embedded user interface captures, and control-level specifications for all 22 operational interfaces of GraphMind.")

    # List of 22 Screen Definitions
    screens_data = [
        # 2.1 Authentication & User Access
        {
            "num": "2.1.1",
            "id": "SCREEN-001",
            "title": "User Login & Multi-Factor Access Interface",
            "img": "01_login_view.png",
            "desc": "Primary authentication portal for enterprise personnel. Enforces JWT issuance, Single Active Session verification (JTI), and instant role testing shortcuts for Capstone evaluation.",
            "role": "Public / All Roles",
            "table_title": "Table 3: Field Specifications for User Login Screen (SCREEN-001)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Brand Logo & Title", "Text / SVG", "Font: 22px Semi-bold #0F172A", "Displays GraphMind Enterprise Knowledge observatory branding"),
                ("2", "Username / Email Input", "Input (Text/Email)", "Mandatory; Auto-focus; #F8FAFC", "Accepts username (admin, exec, manager, ops) or corporate email"),
                ("3", "Password Input", "Input (Password)", "Mandatory; 8-64 chars; masking", "User password with reveal toggle; validated against Argon2/Bcrypt hash"),
                ("4", "Role Switcher Pills", "Button Group", "4 Quick Badges (exec, admin, mgr, ops)", "Pre-fills demo credentials instantly for rapid academic evaluation"),
                ("5", "Remember Session Toggle", "Checkbox", "Default: True; Accent #0284C7", "Persists refresh token across browser restarts in localStorage"),
                ("6", "Forgot Password Link", "Text Button", "Color: #0284C7; Hover: underline", "Transitions user to Forgot Password OTP recovery workflow (SCREEN-002)"),
                ("7", "Submit Login Button", "Primary Button", "Background: #0284C7; Text: White", "Calls POST /api/v1/auth/login, receives JWT, kicks concurrent sessions"),
                ("8", "SSO Entra ID Button", "Outline Button", "Microsoft Blue icon; Border 1px", "Single Sign-On bridge via Azure Active Directory / OAuth2")
            ]
        },
        {
            "num": "2.1.2",
            "id": "SCREEN-002",
            "title": "Forgot Password & Time-based OTP Recovery Interface",
            "img": "02_forgot_password_view.png",
            "desc": "Secure password recovery wizard implementing HMAC-SHA256 OTP verification (FR43). Prevents user enumeration and enforces 6-digit numeric verification with 5-minute expiry.",
            "role": "Public / Unauthenticated User",
            "table_title": "Table 4: Field Specifications for Forgot Password Screen (SCREEN-002)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Wizard Header", "Text", "Font: 20px Bold #0F172A", "Displays 'Khôi phục Mật khẩu' with security shield icon"),
                ("2", "Corporate Email Input", "Input (Email)", "Regex: ^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$", "Accepts user's registered corporate email to receive security OTP"),
                ("3", "Send OTP Button", "Button", "Background: #0284C7; Text: White", "Calls POST /api/v1/auth/forgot-password, generates 6-digit cryptographic OTP"),
                ("4", "6-Digit OTP Field", "Input (Numeric)", "Length: 6 digits; Masked input", "Validates input OTP code against stored HMAC-SHA256 hash in DB"),
                ("5", "New Password Input", "Input (Password)", "Min 8 chars, 1 uppercase, 1 digit", "Accepts newly defined user credentials"),
                ("6", "Confirm Password Input", "Input (Password)", "Must strictly match new password", "Prevents typing mistakes before committing password change"),
                ("7", "Reset Password Button", "Primary Button", "Green #10B981; Hover: #059669", "Calls POST /api/v1/auth/reset-password, invalidates previous JWT tokens"),
                ("8", "Back to Login Link", "Text Link", "Color: #64748B; Arrow icon", "Cancels password recovery and returns user to SCREEN-001")
            ]
        },
        {
            "num": "2.1.3",
            "id": "SCREEN-003",
            "title": "User Profile & Active Session Inspector Modal",
            "img": "21_user_profile_modal.png",
            "desc": "Personal profile management dialog displaying current user identity, role authority, canonical department scope, active JWT session JTI identifier, and security audit log history.",
            "role": "All Authenticated Users",
            "table_title": "Table 5: Field Specifications for User Profile Modal (SCREEN-003)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "User Avatar & Badge", "Avatar / Badge", "Initials 'TH'; Green active dot", "Displays employee visual mark and live connection status"),
                ("2", "Full Name & Account", "Text Heading", "Font: 18px Bold #0F172A", "Displays user full name (e.g. Trần Thị Thu Hương) and username"),
                ("3", "Role & Authority Tag", "Badge", "Role: BAN GIÁM ĐỐC / IT_ADMIN", "Indicates current RBAC access tier and privilege level"),
                ("4", "Department Badge", "Badge", "Background: #EFF6FF; Text: #1D4ED8", "Displays canonical business department (e.g. Ban Giám Đốc, Pháp chế)"),
                ("5", "Session Token JTI", "Code Span", "Monospace font; Truncated hash", "Displays unique JWT JTI identifier for single active session enforcement"),
                ("6", "Language Switcher", "Button Toggle", "EN | VI pill switcher", "Toggles full platform interface language between English and Vietnamese"),
                ("7", "Close Modal Button", "Icon Button", "Top right 'X' icon or Esc key", "Dismisses the user profile modal"),
                ("8", "Sign-out Action", "Danger Button", "Color: #EF4444; Logout icon", "Revokes current active session token and clears localStorage")
            ]
        },
        # 2.2 Decision Support & Executive Analytics
        {
            "num": "2.2.1",
            "id": "SCREEN-004",
            "title": "Enterprise Executive Dashboard (Home View)",
            "img": "03_home_dashboard.png",
            "desc": "Central command center presenting high-level cross-departmental business health. Consolidates 4 macro KPI metric cards, department contract distribution chart, and executive action widgets.",
            "role": "Executive (exec), Admin (admin), Knowledge Manager (manager)",
            "table_title": "Table 6: Field Specifications for Enterprise Home Dashboard (SCREEN-004)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Executive Welcome Banner", "Hero Banner", "Gradient #0F172A to #1E293B", "Welcomes executive with date, time, and real-time operational status"),
                ("2", "Total Revenue KPI Card", "Metric Card", "Value: $109,846,381.40; Green +12.4%", "Aggregates AdventureWorks sales revenue from 31,465 orders"),
                ("3", "Total Orders KPI Card", "Metric Card", "Value: 31,465 orders; Blue badge", "Displays total completed enterprise sales orders"),
                ("4", "Active Contracts KPI Card", "Metric Card", "Value: 610 contracts; Purple badge", "Displays full inventory of 610 documents across 5 business departments"),
                ("5", "Compliance Rate KPI Card", "Metric Card", "Value: 94.2%; Emerald shield badge", "Real-time CUAD compliance score calculated from Neo4j Clause nodes"),
                ("6", "Dept Distribution Chart", "Donut / Bar", "5 Colors: Legal, Sales, R&D, IT, Ops", "Visualizes document allocation: 528 Legal, 34 Sales, 29 R&D, 13 Ops, 6 IT"),
                ("7", "Quick Action Shortcuts", "Card Grid", "4 Quick Action Buttons", "Direct links to Ask Copilot, Risk Observatory, Document Repository, Search"),
                ("8", "System Connection Status", "Status Pill", "Green pulse; '247 nguồn kết nối'", "Live telemetry indicating PostgreSQL, Neo4j, Qdrant health")
            ]
        },
        {
            "num": "2.2.2",
            "id": "SCREEN-005",
            "title": "Business Performance & Margin Analytics View",
            "img": "04_executive_dashboard.png",
            "desc": "Dedicated financial and operational decision support dashboard (UC.19, BR-05). Provides granular breakdown of sales margin by subcategory and identifies top key account corporate customers.",
            "role": "Executive, Admin only (Strictly hidden from Standard Users)",
            "table_title": "Table 7: Field Specifications for Executive View (SCREEN-005)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Section Header", "Page Header", "Title: 'Chỉ số Kinh doanh & Ra Quyết Định'", "Designates restricted strategic management decision zone"),
                ("2", "Year Selector", "Select Dropdown", "Options: 2011, 2012, 2013, 2014, All", "Filters revenue, orders, and margin metrics by AdventureWorks fiscal year"),
                ("3", "Gross Margin KPI", "Metric Card", "Value: 41.8% average gross margin", "Calculates (LineTotal - StandardCost) / LineTotal from ERP database"),
                ("4", "Top Customer List", "Card List", "5 Key Accounts: Brakes and Gears, etc.", "Displays top corporate accounts by total invoice revenue and order count"),
                ("5", "Subcategory Margin Table", "Data Table", "Columns: Category, Orders, Revenue, Margin", "Shows margin % for Mountain Bikes, Road Bikes, Touring, Accessories"),
                ("6", "Anomalous Discount Alert", "Alert Card", "Warning badge; Yellow highlight", "Flags orders where discount rate exceeds 15% threshold"),
                ("7", "Action Bar", "Button Group", "Export PDF / Query Copilot", "Generates executive PDF digest or opens Copilot with current context")
            ]
        },
        {
            "num": "2.2.3",
            "id": "SCREEN-006",
            "title": "Enterprise Risk Observatory & Contract Compliance View",
            "img": "05_risk_observatory.png",
            "desc": "Macro risk monitoring dashboard (UC.20). Automatically highlights legal vulnerabilities, missing liability caps, unbounded indemnification clauses, and anomalous sales discounts.",
            "role": "Executive, Knowledge Manager, Admin",
            "table_title": "Table 8: Field Specifications for Risk Observatory (SCREEN-006)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Risk Center Header", "Page Header", "Title: 'Trung tâm Cảnh báo Rủi ro'", "Central hub for monitoring operational and legal vulnerabilities"),
                ("2", "Macro Filter Tabs", "Tab Switcher", "4 Tabs: Tất cả (2), Nghiêm trọng (1), Pháp lý, Tài chính", "Filters alert cards by severity and business domain"),
                ("3", "Financial Risk KPI Card", "Metric Card", "Value: 0 Đơn hàng bất thường; Red icon", "Monitors below-cost sales and extreme discounts"),
                ("4", "Legal Risk KPI Card", "Metric Card", "Value: 2 Hợp đồng thiếu điều khoản; Purple shield", "Shows 74 contracts lacking indemnification cap, 52 lacking termination clause"),
                ("5", "High Priority KPI Card", "Metric Card", "Value: 1 Cảnh báo ưu tiên cao; Amber triangle", "Highlights urgent risk items requiring Executive Director sign-off"),
                ("6", "Primary Risk Alert Card", "Alert Card", "Red left border 4px; Tag 'Không có trần bồi thường'", "Detailed alert for Aduro Biotech contract missing liability cap (Neo4j Graph verified)"),
                ("7", "Secondary Risk Alert Card", "Alert Card", "Purple left border 4px; Tag 'Thiếu điều khoản chấm dứt'", "Detailed alert for BioAmber contract lacking safe termination exit terms"),
                ("8", "Handle with Copilot Button", "Secondary Button", "Border #0284C7; Text #0284C7", "Pre-fills Copilot with contract risk remediation prompt"),
                ("9", "View Dossier Button", "Outline Button", "Hover: bg-slate-100", "Opens document original preview drawer (SCREEN-010)"),
                ("10", "Resolve Action Button", "Success Button", "Green #10B981; Text White", "Marks risk item as acknowledged/resolved in database")
            ]
        },
        {
            "num": "2.2.4",
            "id": "SCREEN-007",
            "title": "Daily Shift Handover & Operations Consolidation View",
            "img": "15_executive_reports.png",
            "desc": "Executive shift report management (UC.24, UC.25). Provides daily timeline consolidation of departmental operations, pending handovers, safety incidents, and executive approvals.",
            "role": "Executive, Knowledge Manager, Admin",
            "table_title": "Table 9: Field Specifications for Shift Handover View (SCREEN-007)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Report Page Header", "Page Header", "Title: 'Báo cáo Vận hành & Bàn giao Ca'", "Central management view for operational shift reports"),
                ("2", "Shift Status KPI Bar", "Metric Bar", "3 Cards: Ca Sáng, Ca Chiều, Ca Đêm", "Displays active shift supervisor, status (Completed, In Progress), and incidents"),
                ("3", "Date Picker Toolbar", "Date Selector", "Calendar icon; Default: Today", "Allows browsing past daily shift logs and handover archives"),
                ("4", "Shift Report Cards Grid", "Card Grid", "Cards with Shift Badge, Dept, Author", "Displays individual shift dossiers submitted by department managers"),
                ("5", "Approval Status Badge", "Badge", "Green (Approved) / Amber (Pending)", "Indicates executive review and sign-off status"),
                ("6", "Incident Summary Tag", "Tag", "Red #EF4444 badge if incident reported", "Highlights equipment downtime or client escalations"),
                ("7", "View Full Report Action", "Button", "Text 'Xem chi tiết'", "Navigates to full shift report detail view"),
                ("8", "Sign-off Shift Button", "Primary Button", "Background #0284C7", "Commits executive digital approval to database audit trail")
            ]
        },
        {
            "num": "2.2.5",
            "id": "SCREEN-008",
            "title": "Departmental Operations & Incident Reporting View",
            "img": "16_department_shift_report.png",
            "desc": "Detailed shift authoring and incident reporting workspace for department managers. Allows recording shift handover notes, inventory status, safety logs, and escalation triggers.",
            "role": "Knowledge Manager, Department Supervisor, Admin",
            "table_title": "Table 10: Field Specifications for Department Shift View (SCREEN-008)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Department Selector", "Dropdown", "5 Departments: Sales, Legal, R&D, IT, Ops", "Selects the operational department for current handover"),
                ("2", "Shift Type Pills", "Button Group", "Ca Sáng (06:00 - 14:00), Ca Chiều, Ca Đêm", "Selects operational work shift time slot"),
                ("3", "Supervisor Input", "Input (Text)", "Auto-filled with current user name", "Records the responsible manager overseeing the shift"),
                ("4", "Handover Notes Editor", "Markdown Editor", "Rich text toolbar, bold, list, quote", "Detailed summary of completed tasks, work-in-progress, and pending items"),
                ("5", "Safety & Incident Checkbox", "Checkbox", "Red border if checked", "Flags whether any technical or safety incidents occurred during the shift"),
                ("6", "Attached Files Dropzone", "Upload Zone", "Accepts PDF, DOCX, XLSX attachments", "Allows attaching shift log sheets or machine inspection photos"),
                ("7", "Save Draft Button", "Secondary Button", "Border 1px; Text #475569", "Saves in-progress shift notes without submitting"),
                ("8", "Submit Handover Button", "Primary Button", "Background #10B981; Text White", "Submits shift report for executive review and locks content")
            ]
        },
        # 2.3 Intelligent Hybrid AI Copilot
        {
            "num": "2.3.1",
            "id": "SCREEN-009",
            "title": "Hybrid GraphRAG Copilot Reasoning Workspace",
            "img": "06_copilot_workspace.png",
            "desc": "Interactive conversational intelligence assistant (UC.11, UC.12). Combines Qdrant vector semantic search with Neo4j ontology traversal to generate verified grounded answers with citations.",
            "role": "All Roles (Content grounded and scoped by RBAC)",
            "table_title": "Table 11: Field Specifications for AI Copilot (SCREEN-009)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Copilot Workspace Header", "Header Bar", "Title: 'AI Copilot Tri Thức Doanh Nghiệp'", "Displays active AI session, model name (qwen2.5-7b), and status"),
                ("2", "Conversation History", "Message Stream", "User messages right; Assistant left", "Renders rich markdown formatted answers, formulas, bullet points, and tables"),
                ("3", "Evidence Citations Box", "Collapsible Card", "Badge 'Dẫn chứng Nguồn Tri thức'", "Lists exact source documents, chunk IDs, and similarity score"),
                ("4", "Neo4j Knowledge Graph Card", "Visual Sub-card", "Displays matched entities & relations", "Shows 2-hop graph paths connecting contract clauses to company entities"),
                ("5", "Confidence Meter", "Progress Meter", "Value: 98% Confidence score", "Indicates certainty of answer based on grounding provenance"),
                ("6", "Suggested Prompt Chips", "Chip Buttons", "4 Quick Prompts: 'Hợp đồng sắp hết hạn', etc.", "Inserts verified executive queries into input with 1 click"),
                ("7", "Chat Input Omnibox", "Textarea", "Auto-resizing, placeholder, Enter to send", "Accepts natural language queries in Vietnamese or English"),
                ("8", "Send Message Button", "Icon Button", "Blue circular send icon #0284C7", "Calls POST /api/v1/copilot/ask with streaming LLM inference response"),
                ("9", "Voice Query / Attach File", "Icon Buttons", "Mic & Paperclip icons", "Supports voice dictation and uploading ad-hoc files for inspection"),
                ("10", "Clear Chat History Action", "Icon Button", "Trash icon with confirmation prompt", "Clears active conversation session and resets context")
            ]
        },
        {
            "num": "2.3.2",
            "id": "SCREEN-010",
            "title": "Original Document Visual Preview & Risk Inspection Workspace",
            "img": "10_document_preview_modal.png",
            "desc": "High-fidelity in-browser document inspection drawer (UC.21). Renders native DOCX and PDF documents side-by-side with extracted AI vector chunks, clause tags, and risk highlights.",
            "role": "Executive, Knowledge Manager, Admin (Policy C4: Read-Only Preview)",
            "table_title": "Table 12: Field Specifications for Document Preview Workspace (SCREEN-010)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Drawer Header & Title", "Drawer Header", "Font: 16px Bold; Full filename", "Displays active document name (e.g. ADUROBIOTECH_CONSULTING_AGREEMENT.PDF)"),
                ("2", "Fullscreen Toggle Button", "Icon Button", "Expand / Compress icon", "Expands preview drawer to 100% viewport width for deep reading"),
                ("3", "Close Drawer Button", "Icon Button", "'X' icon; Esc key handler", "Closes preview drawer and returns to repository view"),
                ("4", "Preview Mode Tabs", "Tab Switcher", "Tab 1: 'Tệp Gốc (Original)' | Tab 2: 'Phân đoạn Vector'", "Switches between native rendered file and Qdrant chunk cards"),
                ("5", "Zoom Control Toolbar", "Button Group", "Zoom In (+), Zoom Out (-), Reset (100%)", "Scales document canvas from 75% to 200% for readability"),
                ("6", "Document Canvas Renderer", "HTML5 Canvas / docx-preview", "High-fidelity multi-page document view", "Renders original formatting, tables, signatures, and stamps directly in browser"),
                ("7", "Risk Clause Sidebar", "Side Panel", "Red / Amber tags for flagged clauses", "Lists detected indemnification, termination, and liability clauses with jump links"),
                ("8", "Direct Download Action", "Action Button", "Gated by Admin privilege; Icon download", "Downloads decrypted original binary file from Central Storage")
            ]
        },
        # 2.4 Multi-facet Search & Knowledge Explorer
        {
            "num": "2.4.1",
            "id": "SCREEN-011",
            "title": "Enterprise Multi-facet Search Hub",
            "img": "07_smart_search.png",
            "desc": "Universal search engine (UC.07, UC.08). Simultaneously indexes and searches across 4 heterogeneous enterprise data facets: Legal Contracts (CUAD), Customers (AdventureWorks), Products, and SOPs.",
            "role": "All Authenticated Users (Results filtered by RBAC scope)",
            "table_title": "Table 13: Field Specifications for Multi-facet Search (SCREEN-011)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Search Hub Header", "Page Header", "Title: 'Tìm kiếm Thông minh Đa diện'", "Unified enterprise information retrieval portal"),
                ("2", "Omnibox Search Bar", "Search Input", "Large 48px input; Magnifying icon", "Accepts keyword, entity code, customer name, or natural language prompt"),
                ("3", "Search Mode Switcher", "Pill Buttons", "Hybrid (Mặc định) | Semantic | Keyword", "Switches between RRF k=60 Fusion, Vector cosine similarity, or Exact match"),
                ("4", "Facet Filter Tabs", "Tab Bar", "Tất cả (200+) | Hợp đồng | Khách hàng | Sản phẩm | SOP", "Filters result cards to specific business entity types"),
                ("5", "Department Filter Dropdown", "Select", "Options: Tất cả, Pháp chế, Kinh doanh, R&D...", "Scopes search results to permitted corporate departments"),
                ("6", "Result Cards List", "Result Stream", "Rich card layout with badge, title, snippet", "Renders matched entities with bold keyword highlights and confidence score"),
                ("7", "Entity Meta Badges", "Badges", "Type: CONTRACT, CUSTOMER, PRODUCT, SOP", "Indicates data origin (Neo4j Graph vs Qdrant Vector vs PostgreSQL)"),
                ("8", "Clear Filter & View All", "Button", "Text 'Xóa bộ lọc & Xem toàn bộ'", "Resets query filters and displays default enterprise catalog")
            ]
        },
        {
            "num": "2.4.2",
            "id": "SCREEN-012",
            "title": "Interactive Neo4j Knowledge Graph Canvas View",
            "img": "11_knowledge_graph_view.png",
            "desc": "Interactive ontology graph explorer (UC.09). Renders 56,310 nodes and relationships spanning Company, Document, Clause, Customer, Product, and Department entities with real-time physics.",
            "role": "Executive, Knowledge Manager, Admin",
            "table_title": "Table 14: Field Specifications for Knowledge Graph View (SCREEN-012)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Graph Page Header", "Page Header", "Title: 'Đồ thị Tri thức Doanh nghiệp (Neo4j)'", "Designates interactive enterprise knowledge graph workspace"),
                ("2", "Graph Legend Toolbar", "Legend Bar", "Color pills: Blue (Doc), Purple (Clause), Orange (Company)", "Indicates node entity classifications and relationship color codes"),
                ("3", "Interactive Canvas", "Canvas (WebGL/Cytoscape)", "Pan, zoom, drag force-directed graph", "Visualizes node clusters, cross-departmental connections, and entity linkages"),
                ("4", "Node Search Input", "Search Input", "Input: 'Tìm kiếm thực thể node...'", "Locates specific node by ID or name and centers canvas with pulse animation"),
                ("5", "Selected Entity Inspector", "Side Drawer", "Displays node properties and relations", "Shows full Neo4j attributes: contractValue, chunksCount, ingestedAt, status"),
                ("6", "Expand 1-Hop Relations", "Action Button", "Icon plus; Text 'Mở rộng liên kết'", "Executes Cypher MATCH (n)-[r]-(m) to dynamically pull and display neighbor nodes"),
                ("7", "Export Graph Image Action", "Button", "Export PNG / SVG canvas snapshot", "Downloads high-resolution vector graph diagram for reports"),
                ("8", "Reset Layout Button", "Icon Button", "Recenter icon", "Re-applies force-directed layout and fits graph to viewport")
            ]
        },
        {
            "num": "2.4.3",
            "id": "SCREEN-013",
            "title": "Knowledge Schema & Multi-Hop Explorer View",
            "img": "12_knowledge_explorer.png",
            "desc": "Structural knowledge catalog providing multi-hop path inspection, node property validation, and schema consistency checks across relational and graph models.",
            "role": "Knowledge Manager, Admin",
            "table_title": "Table 15: Field Specifications for Knowledge Explorer (SCREEN-013)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Explorer Header", "Page Header", "Title: 'Khám phá Cấu trúc Lược đồ Tri thức'", "Structural ontology exploration interface"),
                ("2", "Schema Type Navigation", "Tree View", "Tree: Document, Clause, Company, Customer...", "Allows selecting entity schemas to inspect structural properties"),
                ("3", "Property Definition Table", "Data Table", "Columns: Property, Data Type, Indexed, Constraint", "Lists schema constraints (e.g. Document.id is UNIQUE, chunksCount is INTEGER)"),
                ("4", "Multi-hop Traversal Tool", "Query Builder", "Source Node -> Relation -> Target Node", "Constructs visual multi-hop graph queries without manual Cypher syntax"),
                ("5", "Execute Query Action", "Primary Button", "Background #0284C7", "Executes graph path traversal and displays matched path list"),
                ("6", "Path Results Viewer", "Data Grid", "Shows path hops: Company -> PARTY_TO -> Document -> CONTAINS -> Clause", "Validates semantic connectivity between enterprise contracts and partners")
            ]
        },
        # 2.5 Knowledge Repository & SOP Governance
        {
            "num": "2.5.1",
            "id": "SCREEN-014",
            "title": "Central Document & File Repository View",
            "img": "08_document_repository.png",
            "desc": "Comprehensive digital archive managing 581 business documents and datasets (UC.15). Features multi-criteria filtering, pagination, vector chunk metrics, and direct preview access.",
            "role": "All Roles (Scoped by Departmental Policy)",
            "table_title": "Table 16: Field Specifications for Document Repository (SCREEN-014)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Repository Page Header", "Page Header", "Title: 'Kho tài liệu & Dữ liệu Tri thức'", "Displays repository screen code 'SCREEN-015' and ingestion badges"),
                ("2", "Storage Metric Badges", "Metric Bar", "5 Cards: Tổng tài liệu (581), Đã lập chỉ mục, Đang chờ, Thất bại, Vector", "Real-time synchronization status across Central Storage, Qdrant, and Neo4j"),
                ("3", "Search Filename Input", "Search Input", "Placeholder: 'Tìm kiếm tên tài liệu, điều khoản, mã...'", "Filters active document list in real time by name, category, or code"),
                ("4", "File Type Filter Dropdown", "Select", "Options: Tất cả, Hợp đồng PDF, Sheets XLSX, SOP DOCX, NDA", "Filters documents by MIME type and business classification"),
                ("5", "Department Filter Dropdown", "Select", "Options: Tất cả, Pháp chế, Kinh doanh, R&D, IT, Vận hành", "Restricts document view to specific corporate division"),
                ("6", "Sort & New Only Dropdown", "Select", "Options: Mới nhất trước, Tên A-Z, Chỉ tài liệu mới thêm", "Sorts document cards by ingest timestamp or alphabetical title"),
                ("7", "View Mode Switcher", "Toggle Button", "Grid (Lưới) vs Table (Bảng)", "Toggles between rich visual cards and compact tabular view"),
                ("8", "Document Card", "Interactive Card", "Icon box, Formatted title, Risk badge, Type tag", "Clicking card opens Document Visual Preview Drawer (SCREEN-010)"),
                ("9", "Upload Document Action", "Primary Button", "Green #10B981; Upload cloud icon", "Opens Document Ingestion & Approval Gate Modal (SCREEN-015)"),
                ("10", "Pagination Toolbar", "Paginator", "Previous, Page 1 of 37, Next; 16 items/page", "Navigates across complete 581 document archive")
            ]
        },
        {
            "num": "2.5.2",
            "id": "SCREEN-015",
            "title": "Document Ingestion & Approval Gate Modal",
            "img": "09_document_upload_modal.png",
            "desc": "Strict document ingestion gate (UC.23, BR-01). Enforces SHA-256 duplicate detection, file size limits (≤10MB), supported MIME validation, and submit-for-approval workflows.",
            "role": "Staff Users, Knowledge Managers, Admin",
            "table_title": "Table 17: Field Specifications for Document Upload Modal (SCREEN-015)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Modal Header", "Modal Header", "Title: 'Tải lên & Nạp Tài Liệu Tri Thức'", "Displays upload modal with security shield and department badge"),
                ("2", "Drag & Drop Upload Zone", "File Dropzone", "Dashed border #0284C7; Cloud upload icon", "Accepts drag-and-drop or file picker for .pdf, .docx, .xlsx, .txt files ≤ 10MB"),
                ("3", "Selected File Preview", "File Card", "Shows filename, file size, icon", "Validates file extension and displays computed local SHA-256 hash"),
                ("4", "Target Department Select", "Select Dropdown", "Mandatory; 5 Departments", "Specifies owner department for RBAC access control policy"),
                ("5", "Document Category Select", "Select Dropdown", "Options: Hợp đồng, SOP, Báo cáo, Tài liệu kỹ thuật", "Categorizes document for automated vector collection routing"),
                ("6", "Security Classification Tag", "Radio Group", "Nội bộ (Internal) | Mật (Confidential) | Công khai", "Defines confidentiality tier and encryption parameters"),
                ("7", "Duplicate Check Indicator", "Status Text", "Real-time check against Neo4j & Storage", "Warns user with HTTP 409 if identical content or name already exists"),
                ("8", "Submit for Approval Action", "Primary Button", "Background #0284C7; Text White", "Calls POST /api/v1/sync/documents/upload, queues for Admin approval"),
                ("9", "Cancel Modal Action", "Secondary Button", "Border 1px; Text #64748B", "Dismisses modal and clears selected file state")
            ]
        },
        {
            "num": "2.5.3",
            "id": "SCREEN-016",
            "title": "Standard Operating Procedures (SOP Wiki) View",
            "img": "13_sop_wiki.png",
            "desc": "Enterprise procedural knowledge base (UC.14, FR26). Organizes internal operating standards, technical guidelines, and compliance protocols with full-text search and department filtering.",
            "role": "All Authenticated Users",
            "table_title": "Table 18: Field Specifications for SOP Wiki View (SCREEN-016)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "SOP Page Header", "Page Header", "Title: 'Quy trình Vận hành Chuẩn (SOP Wiki)'", "Central repository for corporate operating procedures"),
                ("2", "SOP Search Input", "Search Input", "Placeholder: 'Tìm kiếm quy trình, hướng dẫn, mã SOP...'", "Filters active SOP catalog by title, steps, or code"),
                ("3", "Category Filter Tabs", "Tab Bar", "Tất cả | Vận hành | Pháp chế | Bảo mật | CNTT", "Restricts SOP list to specific business operations category"),
                ("4", "SOP Card Grid", "Card Layout", "Cards with SOP Code, Version, Dept tag", "Displays published procedures with effective date and approval badge"),
                ("5", "Read Protocol Button", "Button", "Text 'Xem quy trình'; Blue link", "Opens full procedure detail with formatted markdown steps and diagrams"),
                ("6", "SOP Version Badge", "Badge", "e.g. 'v2.1' or 'v1.0 Published'", "Indicates document revision and governance maturity"),
                ("7", "Create New SOP Action", "Primary Button", "Green #10B981; Plus icon", "Opens SOP Composer editor workspace (SCREEN-017)")
            ]
        },
        {
            "num": "2.5.4",
            "id": "SCREEN-017",
            "title": "SOP Document Composer & Markdown Editor View",
            "img": "14_sop_composer.png",
            "desc": "Dedicated authoring studio for drafting and publishing enterprise SOPs. Features markdown editor, live HTML preview, step sequencing, and version metadata controls.",
            "role": "Knowledge Manager, Admin",
            "table_title": "Table 19: Field Specifications for SOP Composer (SCREEN-017)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Composer Header", "Page Header", "Title: 'Soạn thảo & Ban hành Quy trình SOP'", "Interactive authoring studio for procedural documentation"),
                ("2", "SOP Title Input", "Input (Text)", "Mandatory; Large 18px text", "Specifies official procedure title (e.g. Quy trình Xử lý Sự cố An toàn Thông tin)"),
                ("3", "SOP Code Input", "Input (Text)", "Format: SOP-DEPT-XXX (e.g. SOP-IT-004)", "Unique business identifier registered in database"),
                ("4", "Department Scope Select", "Dropdown", "5 Departments", "Specifies owner department responsible for enforcing the procedure"),
                ("5", "Markdown Source Editor", "Textarea", "Monospace font; Line numbers; Syntax highlight", "Accepts standard markdown for procedural steps, checklists, tables, and warnings"),
                ("6", "Live Preview Pane", "HTML Viewer", "Side-by-side split screen", "Renders formatted headings, numbered steps, alerts, and callout boxes in real time"),
                ("7", "Save Draft Action", "Secondary Button", "Border #CBD5E1; Text #334155", "Saves SOP draft state in PostgreSQL without publishing"),
                ("8", "Publish SOP Action", "Primary Button", "Background #10B981; Text White", "Publishes procedure to active wiki, indexes into Qdrant, and logs audit record")
            ]
        },
        # 2.6 System Administration, Security & System Health
        {
            "num": "2.6.1",
            "id": "SCREEN-018",
            "title": "User & Identity Administration Panel",
            "img": "18_admin_users_panel.png",
            "desc": "Identity governance control panel (UC.01, UC.02). Empowers System Administrators to provision corporate accounts, assign RBAC roles, lock suspicious users, and enforce password resets.",
            "role": "System Administrator (admin) only",
            "table_title": "Table 20: Field Specifications for User Administration (SCREEN-018)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Admin Panel Header", "Page Header", "Title: 'Quản trị Hệ thống & Người dùng'", "Administrative control center for enterprise security"),
                ("2", "Admin Tab Navigation", "Tab Bar", "3 Tabs: Người dùng (Users), Phân quyền (RBAC), Nhật ký (Audit Logs)", "Switches between user list, permission matrix, and tamper-evident audit trail"),
                ("3", "User Search & Role Filter", "Filter Toolbar", "Search input + Role dropdown", "Filters user table by name, email, or role (exec, admin, manager, standard)"),
                ("4", "Add User Action Button", "Primary Button", "Blue #0284C7; Plus icon", "Opens modal to register new enterprise employee with role and department"),
                ("5", "User Accounts Data Table", "Data Table", "Columns: User, Role, Department, Status, Last Login, Actions", "Displays registered corporate users with active status badges"),
                ("6", "Account Status Badge", "Badge", "Green (Active) / Red (Locked)", "Shows whether account is active or locked due to failed attempts"),
                ("7", "Lock / Unlock Action", "Icon Button", "Lock / Key icon", "Toggles user is_active status; locked users are blocked at login (HTTP 403)"),
                ("8", "Reset Password Trigger", "Icon Button", "Key icon with confirmation prompt", "Generates temporary password or triggers reset email to user")
            ]
        },
        {
            "num": "2.6.2",
            "id": "SCREEN-019",
            "title": "Granular RBAC Permission Matrix View",
            "img": "19_admin_rbac_matrix.png",
            "desc": "Multi-dimensional access matrix interface (UC.03, BR-02). Allows granular configuration of department read/write scopes, document upload privileges, and executive view restrictions.",
            "role": "System Administrator (admin) only",
            "table_title": "Table 21: Field Specifications for RBAC Matrix (SCREEN-019)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "RBAC Matrix Header", "Section Header", "Title: 'Ma trận Phân quyền & Miền Tri thức (RBAC)'", "Configures enterprise access policies across roles and departments"),
                ("2", "Role Selector Tabs", "Tab Switcher", "4 Roles: Lãnh đạo, Admin, Quản lý, Nhân viên nghiệp vụ", "Selects target role to inspect and modify permissions"),
                ("3", "Department Access Matrix", "Checkbox Grid", "5 Departments x Permissions", "Configures Read, Write, and Audit permissions for Legal, Sales, R&D, IT, Ops"),
                ("4", "Can Upload Toggle", "Switch Toggle", "can_upload boolean flag (PB48/PB50)", "Grants or restricts permission to ingest new documents into Central Storage"),
                ("5", "Executive View Restriction", "Policy Switch", "BR-05 Enforcer", "Ensures Executive Decision Dashboard is restricted strictly to exec/admin"),
                ("6", "Save Policy Changes Action", "Primary Button", "Green #10B981; Disk icon", "Calls PUT /api/v1/admin/rbac/policies, updates database, and invalidates auth cache"),
                ("7", "Reset to Default Policies", "Secondary Button", "Border 1px; Text #EF4444", "Restores standard baseline corporate security policies")
            ]
        },
        {
            "num": "2.6.3",
            "id": "SCREEN-020",
            "title": "Tamper-Evident Security Audit Logs View",
            "img": "20_admin_audit_logs.png",
            "desc": "Immutable security audit log viewer (UC.04, FR6, BR-03). Records all authentication events, role changes, document access, and system mutations with actor, IP, and integrity status.",
            "role": "System Administrator (admin) only",
            "table_title": "Table 22: Field Specifications for Audit Logs (SCREEN-020)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Audit Logs Header", "Section Header", "Title: 'Nhật ký Kiểm toán & Truy vết Bảo mật'", "Immutable audit trail viewer meeting ISO 27001 requirements"),
                ("2", "Actor / Event Filter", "Search Input", "Placeholder: 'Lọc theo tài khoản, hành động...'", "Filters logs by actor username, action (LOGIN, LOGOUT, ROLE_CHANGE), or resource"),
                ("3", "Time Range Selector", "Date Range", "Options: Hôm nay, 7 ngày, 30 ngày, Tất cả", "Narrows audit log window to specific investigative timeframe"),
                ("4", "Audit Records Data Table", "Data Table", "Columns: Thời gian, Tài khoản, Hành động, Đối tượng, IP, Trạng thái", "Displays chronological log records recorded in PostgreSQL audit_logs table"),
                ("5", "Action Type Badge", "Badge", "LOGIN (Green), LOGOUT (Gray), ROLE_CHANGE (Amber), MUTATION (Red)", "Color-codes audit event severity and operational category"),
                ("6", "IP Address Column", "Code Text", "e.g. 127.0.0.1, 192.168.1.20", "Captures client remote IP address for forensic provenance"),
                ("7", "Integrity Check Status", "Status Badge", "Badge 'Chữ ký Hợp lệ' (Valid HMAC)", "Verifies log row has not been altered or deleted by rogue DB administrators"),
                ("8", "Export Audit Report Action", "Button", "Export CSV / PDF button", "Exports cryptographically signed audit log file for compliance audits")
            ]
        },
        {
            "num": "2.6.4",
            "id": "SCREEN-021",
            "title": "Data Connectors & External Ingestion Sync View",
            "img": "17_data_connectors.png",
            "desc": "External data connectivity dashboard (UC.16, FR4, FR19). Monitors continuous ingestion pipelines from Google Drive cloud folders and local file system watchdogs (AEGIS).",
            "role": "Knowledge Manager, Admin",
            "table_title": "Table 23: Field Specifications for Data Connectors (SCREEN-021)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Connectors Header", "Page Header", "Title: 'Kết nối Nguồn Dữ liệu Ngoài'", "Central hub for managing automated data pipelines"),
                ("2", "AEGIS File Watcher Card", "Service Card", "Status: Active (Xanh); Container ID", "Monitors local file system daemon scanning /data volume for new documents"),
                ("3", "Google Drive Connector Card", "Service Card", "OAuth 2.0 Connected badge", "Cloud folder sync pulling shared corporate spreadsheets and contract PDFs"),
                ("4", "Sync Health Badge", "Badge", "Green pulse; 'Hoạt động bình thường'", "Indicates real-time webhook availability and event listening status"),
                ("5", "Last Ingested File Info", "Text Block", "Filename, Timestamp, SHA-256 hash", "Displays the most recent document ingested through the automated pipeline"),
                ("6", "Manual Sync Trigger", "Action Button", "Text 'Đồng bộ ngay'; Refresh icon", "Forces immediate re-scan of monitored directories and syncs changes"),
                ("7", "Storage Volume Metric", "Progress Bar", "Value: 71.2 MB / 10 GB used", "Visualizes Central Storage disk consumption and volume headroom")
            ]
        },
        {
            "num": "2.6.5",
            "id": "SCREEN-022",
            "title": "Adaptive Enterprise Dark Mode Interface",
            "img": "22_dark_mode_risk_view.png",
            "desc": "High-contrast dark mode display demonstration. Validates CSS custom properties, WCAG 2.1 AA text contrast, and night-shift readability across complex analytical charts and risk cards.",
            "role": "All Roles (User Preference)",
            "table_title": "Table 24: Field Specifications for Dark Mode Adaptation (SCREEN-022)",
            "cols": ["No.", "Field name", "Type", "Require / Styling", "Target / Action / Logic"],
            "col_widths": [0.5, 1.6, 1.0, 1.6, 2.3],
            "fields": [
                ("1", "Theme Switcher Control", "Topbar Button", "Sun / Moon icon with 'Dark / Light' label", "Toggles documentElement 'dark' CSS class and persists choice in localStorage"),
                ("2", "Dark App Canvas", "App Background", "Hex: #0B1329 / #0F172A", "Deep blue-black background reducing eye strain during night operations"),
                ("3", "Surface Cards Styling", "Card Surfaces", "Hex: #1E293B; Border #334155", "Elevated card surfaces maintaining clear visual hierarchy over base canvas"),
                ("4", "Text Contrast Compliance", "Typography", "Primary text #F8FAFC; Ratio >= 7:1", "Guarantees AAA/AA contrast compliance against dark surfaces for readability"),
                ("5", "Risk Card Borders in Dark", "Alert Borders", "Vibrant Red #F87171, Purple #C084FC", "Maintains strong danger signal visibility without color vibration"),
                ("6", "Metric Numbers Luminescence", "KPI Typography", "Font: 26px Bold #FFFFFF", "Crisp high-readability metric digits for mission-critical monitoring"),
                ("7", "Navigation Rail Adaptation", "Vertical Sidebar", "Background #0F172A; Active: #1E293B", "Darkened navigation drawer seamlessly integrated with workspace")
            ]
        }
    ]

    # Process all 22 screens into Word Document
    total_screens = len(screens_data)
    for s_idx, scr in enumerate(screens_data):
        print(f"[+] Processing {scr['num']}: {scr['title']} ({s_idx + 1}/{total_screens})...")
        add_heading_2(doc, f"{scr['num']}. {scr['title']} ({scr['id']})")
        add_p(doc, scr['desc'], size=10.5, space_after=6)
        
        # Access & Role note
        p_role = add_p(doc, "Access Authority & User Scope: ", bold=True, size=9.5, space_after=6, color=RGBColor(30, 58, 138))
        r_role = p_role.add_run(scr['role'])
        r_role.bold = False
        r_role.font.name = "Times New Roman"
        r_role.font.color.rgb = RGBColor(71, 85, 105)

        # Image Insertion
        img_path = os.path.join(SCREENSHOTS_DIR, scr['img'])
        if os.path.exists(img_path):
            try:
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(4)
                p_img.paragraph_format.space_after = Pt(4)
                p_img.paragraph_format.keep_with_next = True
                run_img = p_img.add_run()
                run_img.add_picture(img_path, width=Inches(5.85))

                p_cap = doc.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_cap.paragraph_format.space_after = Pt(8)
                p_cap.paragraph_format.keep_with_next = True
                r_cap = p_cap.add_run(f"Figure {s_idx + 1}: Live User Interface of {scr['title']}")
                r_cap.bold = True
                r_cap.italic = True
                r_cap.font.name = "Times New Roman"
                r_cap.font.size = Pt(9)
                r_cap.font.color.rgb = RGBColor(100, 116, 139)
            except Exception as e:
                print(f"  [!] Error adding image {scr['img']}: {e}")
        else:
            print(f"  [!] Screenshot missing: {img_path}")

        # Field Specification Table
        create_spec_table(
            doc=doc,
            table_title=scr['table_title'],
            columns=scr['cols'],
            rows_data=scr['fields'],
            col_widths=scr['col_widths']
        )

    # ── SECTION 3: NON-FUNCTIONAL UI REQUIREMENTS ─────────────────────────────
    doc.add_page_break()
    add_heading_1(doc, "3. NON-FUNCTIONAL UI REQUIREMENTS & ACCESSIBILITY")

    add_heading_2(doc, "3.1. Responsive Breakpoints & Device Adaptability")
    add_p(doc, "GraphMind is engineered to support desktop workstations, tablet displays, and control room monitors. The layout utilizes TailwindCSS responsive breakpoints:")
    add_p(doc, "• Desktop (>= 1280px / 1440px): Full 3-column split-pane workspace with permanent vertical Navigation Rail (240px) and Topbar.")
    add_p(doc, "• Laptop & Tablet Landscape (1024px - 1279px): Collapsible compact Navigation Rail (60px icon-only rail) and responsive multi-column KPI grids.")
    add_p(doc, "• Minimum Supported Resolution: 1024 x 768 pixels. Below this viewport, an advisory banner prompts the user to switch to a supported workstation display.")

    add_heading_2(doc, "3.2. Performance Budgets, Latency & Asynchronous Telemetry")
    add_p(doc, "To provide a snappy user experience during heavy database operations, the UI adheres to the following latency thresholds:")
    add_p(doc, "• Single Page Application (SPA) Initial Render: <= 1.2 seconds over local enterprise network.")
    add_p(doc, "• Client-side View Transitions: <= 100 milliseconds using React component caching and memoization.")
    add_p(doc, "• Live Hybrid AI Copilot Streaming: Initial token TTFT (Time To First Token) <= 800ms; complete grounded answer <= 3.5s.")
    add_p(doc, "• Multi-facet Search Response: <= 250ms across 56,310 Neo4j nodes and 9,148 Qdrant vector chunks via parallel asynchronous queries.")

    add_heading_2(doc, "3.3. WCAG 2.1 AA Accessibility & Color Contrast Standards")
    add_p(doc, "All visual elements comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards:")
    add_p(doc, "• Text Contrast Ratio: Normal body text achieves at least 4.5:1 contrast against background; large headers achieve >= 7:1.")
    add_p(doc, "• Semantic Color Dual-Coding: Warning and error indicators combine color with prominent iconography (e.g. Red + Exclamation Triangle, Green + Shield Checkmark) so color-blind users can instantly distinguish status.")
    add_p(doc, "• Keyboard Accessibility: Full keyboard navigation (Tab, Shift+Tab, Enter, Escape) supported across all modals, drawers, and form controls.")

    add_heading_2(doc, "3.4. Bilingual Localization Architecture (EN / VI)")
    add_p(doc, "The front-end integrates a centralized internationalization engine (localStorage key 'aegis_lang'):")
    add_p(doc, "• Default Language: Vietnamese (vi) tailored to domestic enterprise terminology (Pháp chế, Vận hành, Kế toán, Trần bồi thường).")
    add_p(doc, "• Secondary Language: English (en) enabling international auditor and stakeholder review.")
    add_p(doc, "• Zero-Flicker Transition: Switching language instantly re-renders all UI labels, table column headers, and date/currency formats without requiring a full page reload.")

    # ── SAVE DOCUMENT ─────────────────────────────────────────────────────────
    print(f"[+] Saving document to: {OUT_DOCS}...")
    saved_docs = OUT_DOCS
    try:
        doc.save(OUT_DOCS)
    except PermissionError:
        saved_docs = OUT_DOCS.replace(".docx", "_v1.1.docx")
        print(f"    [!] {OUT_DOCS} is currently open in MS Word. Saving to {saved_docs} instead.")
        doc.save(saved_docs)

    print(f"[+] Saving duplicate copy to: {OUT_FINAL}...")
    os.makedirs(os.path.dirname(OUT_FINAL), exist_ok=True)
    saved_final = OUT_FINAL
    try:
        doc.save(OUT_FINAL)
    except PermissionError:
        saved_final = OUT_FINAL.replace(".docx", "_v1.1.docx")
        print(f"    [!] {OUT_FINAL} is currently open in MS Word. Saving to {saved_final} instead.")
        doc.save(saved_final)

    print("[+] UI Design Document successfully created!")
    print(f"    - File 1: {saved_docs} ({os.path.getsize(saved_docs)} bytes)")
    print(f"    - File 2: {saved_final} ({os.path.getsize(saved_final)} bytes)")

if __name__ == "__main__":
    build_document()
