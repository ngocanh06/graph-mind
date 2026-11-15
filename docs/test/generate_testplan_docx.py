"""
Script to generate DTU International School Software Testing Plan for GraphMind.
Generates: docs/test/TESTPLAN_PROJECT_SOFTWARETESTING_GRAPHMIND.docx
"""
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def style_table_header(row, col_widths=None, bg_hex="1E3A8A"):
    for idx, cell in enumerate(row.cells):
        set_cell_background(cell, bg_hex)
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.bold = True
                r.font.name = "Times New Roman"
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(255, 255, 255)
        if col_widths and idx < len(col_widths):
            cell.width = Inches(col_widths[idx])

def format_table_body(table, col_widths=None):
    for r_idx, row in enumerate(table.rows[1:]):
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, cell in enumerate(row.cells):
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(9.5)
            if col_widths and c_idx < len(col_widths):
                cell.width = Inches(col_widths[c_idx])

def add_heading_with_spacing(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(12)
    h.paragraph_format.space_after = Pt(4)
    for r in h.runs:
        r.font.name = "Times New Roman"
        if level == 1:
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 23, 42)
        elif level == 2:
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = RGBColor(30, 58, 138)
        elif level == 3:
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = RGBColor(51, 65, 85)
    return h

def add_body_p(doc, text, bold_prefix=None, italic=False, space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(11)
    r = p.add_run(text)
    r.italic = italic
    r.font.name = "Times New Roman"
    r.font.size = Pt(11)
    return p

def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(10.5)
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    return p

def build_testplan_docx():
    doc = Document()
    
    # Page setup: Standard A4
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
    
    # Title Header
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("DUY TAN UNIVERSITY - DTU INTERNATIONAL SCHOOL\nFACULTY OF INFORMATION TECHNOLOGY")
    r_sub.bold = True
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(100, 116, 139)
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("SOFTWARE TESTING PLAN")
    r_title.bold = True
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(22)
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    p_sub2 = doc.add_paragraph()
    p_sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub2.paragraph_format.space_after = Pt(18)
    r_sub2 = p_sub2.add_run("GraphMind: Enterprise AI Knowledge & Legal Assistant System\nCourse: Software Testing - Academic Term 2025/2026")
    r_sub2.bold = True
    r_sub2.font.name = "Times New Roman"
    r_sub2.font.size = Pt(13)
    r_sub2.font.color.rgb = RGBColor(14, 116, 144)

    # Project Information Table
    info_table = doc.add_table(rows=7, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    widths = [2.2, 4.3]
    meta = [
        ("Project Name", "GraphMind - Enterprise Graph & Vector Knowledge System"),
        ("Document Code", "TEST_PLAN_GRAPHMIND_v2.0"),
        ("Date Created", "October 26, 2025 / Revised November 2026"),
        ("Author / Student", "Trần Thị Ngọc Ánh (Student ID: 3814)"),
        ("Class / Major", "DTU International School - Software Engineering"),
        ("Academic Mentor", "MSc. Trần Kim Sanh"),
        ("Test Environment", "FastAPI (127.0.0.1:5000), Vite React (127.0.0.1:5173), Neo4j, Qdrant")
    ]
    for idx, (label, val) in enumerate(meta):
        cell_lbl, cell_val = info_table.rows[idx].cells
        cell_lbl.text = label
        cell_val.text = val
        cell_lbl.paragraphs[0].runs[0].bold = True
        cell_lbl.paragraphs[0].runs[0].font.name = "Times New Roman"
        cell_lbl.paragraphs[0].runs[0].font.size = Pt(10)
        cell_val.paragraphs[0].runs[0].font.name = "Times New Roman"
        cell_val.paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_background(cell_val, "FFFFFF")
        set_cell_margins(cell_lbl, 60, 60, 100, 100)
        set_cell_margins(cell_val, 60, 60, 100, 100)
        cell_lbl.width = Inches(widths[0])
        cell_val.width = Inches(widths[1])

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Approval Signatures Table
    appr_table = doc.add_table(rows=2, cols=3)
    appr_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    appr_widths = [2.6, 2.0, 1.9]
    hdr = appr_table.rows[0]
    hdr.cells[0].text = "Mentor Approved"
    hdr.cells[1].text = "Signature"
    hdr.cells[2].text = "Date"
    style_table_header(hdr, appr_widths, bg_hex="0F766E")
    r1 = appr_table.rows[1]
    r1.cells[0].text = "MSc. Trần Kim Sanh"
    r1.cells[1].text = "[Approved / Signed]"
    r1.cells[2].text = "26/10/2025"
    format_table_body(appr_table, appr_widths)

    doc.add_page_break()

    # Section 1: Quality Objectives
    add_heading_with_spacing(doc, "1. Quality Objectives", level=1)
    add_body_p(doc, "The primary objective of this Software Testing Plan is to systematically verify, validate, and evaluate the functional correctness, security, and interface robustness of the GraphMind Enterprise Knowledge Assistant system. Testing is conducted strictly under rigorous academic standards established by DTU International School, ensuring:")
    add_bullet(doc, "Ensure all core microservices and UI workflows function according to business requirements without data loss or corruption.", "Functional Correctness: ")
    add_bullet(doc, "Validate Role-Based Access Control (RBAC) ensuring cross-departmental isolation between Executive, Legal, Sales, IT, and R&D roles.", "Security & Isolation: ")
    add_bullet(doc, "Exhaustively examine decision logic in access control using White-Box Basis Path, Branch, and Loop testing with Cyclomatic Complexity CC = 8.", "White-Box Rigor: ")
    add_bullet(doc, "Verify input handling and file ingestion against boundary values, equivalence partitions, decision tables, and error guessing.", "Black-Box Coverage: ")
    add_bullet(doc, "Deliver automated regression testing utilizing Robot Framework and Python RequestsLibrary with reproducible logs and test reports.", "Automated Verifiability: ")
    add_bullet(doc, "Maintain calm enterprise UI standards with zero text clipping, unified FontAwesome iconography, and consistent single-row KPI strips.", "User Experience: ")

    # Section 2: Test Scope
    add_heading_with_spacing(doc, "2. Test Scope", level=1)
    add_body_p(doc, "The test scope encompasses both Frontend Single Page Application (SPA) modules and Backend REST API endpoints, with specialized verification of hybrid storage systems (PostgreSQL, Neo4j Graph DB, Qdrant Vector DB).")

    add_heading_with_spacing(doc, "2.1 Functional Modules in Scope", level=2)
    scope_table = doc.add_table(rows=7, cols=3)
    scope_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sc_widths = [1.2, 2.2, 3.1]
    sc_hdr = scope_table.rows[0]
    sc_hdr.cells[0].text = "Module ID"
    sc_hdr.cells[1].text = "Functional Domain"
    sc_hdr.cells[2].text = "Test Items & Verification Focus"
    style_table_header(sc_hdr, sc_widths)
    
    scope_data = [
        ("M1", "Executive & Analytics", "KPI metrics, revenue aggregations ($123.22M), CUAD legal compliance rate (56.7%), risk warnings, single-row KPI layout."),
        ("M2", "Knowledge & Documents", "Document repository (595 files), CUAD contracts (55 items, 9.3K chunks), upload pipeline, two-tier omnibar toolbar, zero text clipping."),
        ("M3", "AI Copilot & Assistant", "Departmental context switching, multi-turn RAG querying, prompt token limits, LLM stream resilience, chat reset."),
        ("M4", "Graph Explorer (Neo4j)", "53,000+ nodes & 82,000+ relationships, 2D/3D force graph rendering, node inspect drawer, department filter."),
        ("M5", "Risk Monitor & SOP", "Critical contract violation detection, SOP procedure checklist, approval workflows, export reports."),
        ("M6", "RBAC & System Security", "check_rbac_permission function, 5 department roles, token verification, cross-department data isolation.")
    ]
    for idx, row in enumerate(scope_data):
        r = scope_table.rows[idx + 1]
        r.cells[0].text = row[0]
        r.cells[1].text = row[1]
        r.cells[2].text = row[2]
    format_table_body(scope_table, sc_widths)

    add_heading_with_spacing(doc, "2.2 Out of Scope", level=2)
    add_bullet(doc, "Retraining or fine-tuning underlying Large Language Model transformer weights (e.g. Gemini / Sentence-Transformers).")
    add_bullet(doc, "Internal hardware infrastructure load testing beyond local deployment limits (benchmarked at 100 concurrent requests).")
    add_bullet(doc, "Modifications to underlying database schemas or existing backend business logic code.")

    # Section 3: Testing Strategy
    add_heading_with_spacing(doc, "3. Testing Strategy", level=1)
    add_body_p(doc, "A hybrid testing methodology combining White-Box structural testing and Black-Box functional testing is applied to achieve maximum test integrity and coverage.")

    add_heading_with_spacing(doc, "3.1 White-Box Testing (Structural Verification)", level=2)
    add_body_p(doc, "Focus Module: check_rbac_permission in backend/app/api/v1/rbac.py.")
    add_body_p(doc, "The function governs enterprise security authorization across departments and sensitive resources. Its control logic contains 5 independent decision statements:")
    add_bullet(doc, "Cyclomatic Complexity: V(G) = E - N + 2P = 15 - 9 + 2(1) = 8.")
    add_bullet(doc, "Basis Path Testing (BP): 8 linearly independent basis paths (BP-001 through BP-008).")
    add_bullet(doc, "Branch Testing (BR): 9 decision outcomes covering True/False branches of each condition.")
    add_bullet(doc, "Loop Testing (LP): 4 iteration boundaries (0 loops, 1 loop, typical loop, maximum iterations) across department traversal.")

    add_heading_with_spacing(doc, "3.2 Black-Box Testing (Specification-Based Verification)", level=2)
    add_body_p(doc, "Focus Module: Document Ingestion & Upload Pipeline (/api/v1/sync/upload & Knowledge Base UI).")
    add_bullet(doc, "Boundary Value Analysis (BVA): File size limits (0 bytes, 1 byte, 10MB text threshold, 50MB max, 50MB + 1 byte) and filename character lengths (0, 1, 255, 256 chars).")
    add_bullet(doc, "Equivalence Partitioning (EP): Valid file formats (.pdf, .docx, .xlsx, .csv, .txt) vs invalid executable extensions (.exe, .sh, .zip, .bat) and department scopes.")
    add_bullet(doc, "Decision Table (DT): 6-rule combinatorial matrix evaluating File Extension * File Size * Department Scope * Role Permissions -> Upload Outcome.")
    add_bullet(doc, "Error Guessing (EG): Path traversal (../../etc/passwd), null bytes, double extensions (.pdf.exe), empty payloads, and SHA-256 duplicate idempotency.")

    add_heading_with_spacing(doc, "3.3 Test Automation Tools & Frameworks", level=2)
    tools_table = doc.add_table(rows=6, cols=3)
    tools_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_widths = [1.8, 2.0, 2.7]
    t_hdr = tools_table.rows[0]
    t_hdr.cells[0].text = "Tool / Library"
    t_hdr.cells[1].text = "Category"
    t_hdr.cells[2].text = "Role in Project"
    style_table_header(t_hdr, t_widths)
    t_data = [
        ("Robot Framework 7.5.1", "Test Runner & Reporter", "Execution engine for keyword-driven academic automated test cases."),
        ("RequestsLibrary / Python", "API Automation", "HTTP client for testing REST endpoints and validating status codes & JSON payloads."),
        ("Python openpyxl", "Test Management Tool", "Automated synchronization and generation of TestCase&TestReport.xlsx."),
        ("python-docx", "Documentation Automation", "Compilation of academic test plan and final project documentation."),
        ("Vite & Tailwind CSS", "UI Verification", "Component rendering test and layout regression checks for enterprise standards.")
    ]
    for idx, row in enumerate(t_data):
        r = tools_table.rows[idx + 1]
        r.cells[0].text = row[0]
        r.cells[1].text = row[1]
        r.cells[2].text = row[2]
    format_table_body(tools_table, t_widths)

    # Section 4: Criteria
    add_heading_with_spacing(doc, "4. Test Criteria & Quality Gates", level=1)
    add_heading_with_spacing(doc, "4.1 Entry Criteria", level=2)
    add_bullet(doc, "Backend FastAPI service operational on 127.0.0.1:5000 with healthy /health endpoint.")
    add_bullet(doc, "Frontend React Vite development server active on 127.0.0.1:5173 with proxy connected.")
    add_bullet(doc, "Test datasets initialized: 595 knowledge documents, 55 CUAD contracts, 9.3K Qdrant chunks, and Neo4j graph nodes.")

    add_heading_with_spacing(doc, "4.2 Exit Criteria", level=2)
    add_bullet(doc, "100% of planned test cases executed across White-Box (BP, BR, LP) and Black-Box (BVA, EP, DT, EG).")
    add_bullet(doc, "Zero Critical or High severity defects outstanding in RBAC security and document ingestion pipelines.")
    add_bullet(doc, "Pass rate equal to or exceeding 95% across automated regression suites.")
    add_bullet(doc, "Complete test report and execution matrices finalized in TestCase&TestReport.xlsx.")

    # Section 5: Roles and Responsibilities
    add_heading_with_spacing(doc, "5. Roles and Responsibilities", level=1)
    roles_table = doc.add_table(rows=4, cols=3)
    roles_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    r_widths = [1.6, 1.8, 3.1]
    r_hdr = roles_table.rows[0]
    r_hdr.cells[0].text = "Role"
    r_hdr.cells[1].text = "Assigned Personnel"
    r_hdr.cells[2].text = "Key Responsibilities"
    style_table_header(r_hdr, r_widths)
    r_data = [
        ("Academic Mentor", "MSc. Trần Kim Sanh", "Guidance, curriculum compliance review, academic methodology validation, and final evaluation."),
        ("Test Lead & QA Engineer", "Trần Thị Ngọc Ánh (3814)", "Test planning, CFG derivation, White-Box & Black-Box test case design, Robot Framework scripting, UI refinement."),
        ("Peer QA Reviewer", "DTU Testing Group 2", "Cross-review of test cases, defect reproduction verification, and documentation proofreading.")
    ]
    for idx, row in enumerate(r_data):
        r = roles_table.rows[idx + 1]
        r.cells[0].text = row[0]
        r.cells[1].text = row[1]
        r.cells[2].text = row[2]
    format_table_body(roles_table, r_widths)

    # Section 6: Risks and Mitigation
    add_heading_with_spacing(doc, "6. Risks and Mitigation Strategies", level=1)
    risk_table = doc.add_table(rows=5, cols=4)
    risk_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rk_widths = [1.6, 2.0, 1.1, 1.8]
    rk_hdr = risk_table.rows[0]
    rk_hdr.cells[0].text = "Risk Description"
    rk_hdr.cells[1].text = "Impact"
    rk_hdr.cells[2].text = "Severity"
    rk_hdr.cells[3].text = "Mitigation Strategy"
    style_table_header(rk_hdr, rk_widths)
    rk_data = [
        ("Port binding collision (IPv4 vs IPv6 on Windows)", "Frontend cannot connect to backend, displaying 0 documents.", "High", "Explicitly bind API_BASE to 127.0.0.1:5000 in api.js and vite.config.js."),
        ("Qdrant / Neo4j container restart latency", "Vector search or graph query returns 503 during automated test run.", "Medium", "Implement retry loop and connection health pre-check keywords in Robot Framework suite."),
        ("UI text clipping across diverse screen resolutions", "Labels truncated, poor user experience.", "Medium", "Replace fixed width grids with flexible Two-Tier omnibar and single-row KPI layout."),
        ("Oversized file upload crashing ingestion worker", "Server memory exhaustion on 100MB+ PDF upload.", "Low", "Enforce 50MB maximum body limit in FastAPI middleware and client validation.")
    ]
    for idx, row in enumerate(rk_data):
        r = risk_table.rows[idx + 1]
        r.cells[0].text = row[0]
        r.cells[1].text = row[1]
        r.cells[2].text = row[2]
        r.cells[3].text = row[3]
    format_table_body(risk_table, rk_widths)

    output_path = os.path.abspath("docs/test/TESTPLAN_PROJECT_SOFTWARETESTING_GRAPHMIND.docx")
    doc.save(output_path)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    build_testplan_docx()

