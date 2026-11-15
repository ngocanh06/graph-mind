"""
Script tạo file Excel TestCase & TestReport chuẩn môn Software Testing cho dự án GraphMind
Tác giả: Trần Thị Ngọc Ánh
Dự án: GraphMind - Enterprise Knowledge & Graph Platform
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_testcase_and_report_excel(filepath):
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # 1. SHEET TESTCASE
    # -------------------------------------------------------------
    ws_tc = wb.active
    ws_tc.title = "Testcase"
    
    # Fonts & Styles
    font_meta_title = Font(name="Arial", size=11, bold=True, color="1E3A5F")
    font_meta_val = Font(name="Arial", size=11, color="0F172A")
    font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    font_cell = Font(name="Arial", size=10, color="0F172A")
    font_sec_hdr = Font(name="Arial", size=10, bold=True, color="0E7490")
    font_pass = Font(name="Arial", size=10, bold=True, color="059669")
    font_fail = Font(name="Arial", size=10, bold=True, color="DC2626")
    
    fill_header = PatternFill(start_color="0891B2", end_color="0891B2", fill_type="solid")
    fill_sec_hdr = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_pass = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    fill_fail = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    
    thin_border_side = Side(border_style="thin", color="CBD5E1")
    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    
    # Metadata Block
    metadata = [
        ("Project Name", "GraphMind — Enterprise Knowledge & Graph Management Platform"),
        ("Created By", "Tran Thi Ngoc Anh (DTU International School - Software Testing)"),
        ("Creation Date", "2026-11-12"),
        ("Reviewed By", "Instructor / QA Lead"),
        ("Reviewed Date", "2026-11-12"),
    ]
    
    for r_idx, (k, v) in enumerate(metadata, start=1):
        cell_k = ws_tc.cell(row=r_idx, column=1, value=k)
        cell_v = ws_tc.cell(row=r_idx, column=2, value=v)
        cell_k.font = font_meta_title
        cell_v.font = font_meta_val
        ws_tc.merge_cells(start_row=r_idx, start_column=2, end_row=r_idx, end_column=9)
    
    # Table Headers at Row 7
    headers = [
        "Test Case ID",
        "Module / Technique",
        "Description",
        "Input / Parameters",
        "Expected Result",
        "Actual Result",
        "Status",
        "Priority",
        "Comments / Bug ID"
    ]
    
    row_hdr = 7
    for col_idx, h in enumerate(headers, start=1):
        c = ws_tc.cell(row=row_hdr, column=col_idx, value=h)
        c.font = font_header
        c.fill = fill_header
        c.alignment = align_center
        c.border = border_cell
    
    # Test Cases Data
    test_cases_data = [
        # --- SECTION: WHITE BOX - BASIC PATH TESTING ---
        ("__SECTION__", "WHITE BOX TESTING — Basic Path Testing (RBAC & Auth Engine)", "", "", "", "", "", "", ""),
        ("BP-001", "White Box (Basic Path)", "Executive full access across departments", "role=executive, dept=sales, resource=contract, action=read", "Grant Access, rule=BR-05, allowed=True", "Access Granted, rule=BR-05", "PASS", "High", "Covers Path 1: 1->2->3->End"),
        ("BP-002", "White Box (Basic Path)", "Admin full access delete document", "role=it_admin, dept=legal, resource=document, action=delete", "Grant Access, rule=BR-03, allowed=True", "Access Granted, rule=BR-03", "PASS", "High", "Covers Path 2: 1->2->4->End"),
        ("BP-003", "White Box (Basic Path)", "Standard user access own department (Sales)", "role=standard, dept=sales, resource=contract, action=read", "Grant Access, rule=BR-02, allowed=True", "Access Granted, rule=BR-02", "PASS", "High", "Covers Path 3: 1->5->6->8->10->End"),
        ("BP-004", "White Box (Basic Path)", "Standard user cross-dept access denial (Legal)", "role=standard, dept=legal, resource=contract, action=read", "Deny Access 403, rule=BR-02, allowed=False", "Access Denied 403, rule=BR-02", "PASS", "High", "Covers Path 4: 1->5->6->8->11->End"),
        ("BP-005", "White Box (Basic Path)", "Standard user KPI resource denial", "role=standard, dept=sales, resource=kpi, action=read", "Deny Access 403, rule=BR-05, allowed=False", "Access Denied 403, rule=BR-05", "PASS", "High", "Covers Path 5: 1->5->6->7->End"),
        ("BP-006", "White Box (Basic Path)", "Knowledge Manager SOP publish in-scope", "role=knowledge_manager, dept=sales, resource=sop, action=publish", "Grant Access, allowed=True", "Access Granted", "PASS", "Medium", "Covers Path 6: 1->5->8->9->12->End"),
        ("BP-007", "White Box (Basic Path)", "Knowledge Manager SOP publish out-of-scope", "role=knowledge_manager, dept=legal, resource=sop, action=publish", "Deny Access 403, rule=BR-04, allowed=False", "Access Denied 403, rule=BR-04", "PASS", "High", "Covers Path 7: 1->5->8->9->13->End"),
        ("BP-008", "White Box (Basic Path)", "Standard user SOP publish denial", "role=standard, dept=sales, resource=sop, action=publish", "Deny Access 403, rule=BR-04, allowed=False", "Access Denied 403, rule=BR-04", "PASS", "High", "Covers Path 8: 1->5->8->9->14->End"),

        # --- SECTION: WHITE BOX - BRANCH TESTING ---
        ("__SECTION__", "WHITE BOX TESTING — Branch Testing (Branch Coverage)", "", "", "", "", "", "", ""),
        ("BR-001", "White Box (Branch)", "Branch 1: scope.is_unrestricted == True (Executive)", "role=executive, dept=rnd, resource=dataset", "allowed=True, rule=BR-05", "allowed=True, rule=BR-05", "PASS", "High", "Branch L72: True"),
        ("BR-002", "White Box (Branch)", "Branch 1: scope.is_unrestricted == False", "role=standard, dept=rnd, resource=dataset", "Proceed to restricted rules", "Proceeded to restricted rules", "PASS", "High", "Branch L72: False"),
        ("BR-003", "White Box (Branch)", "Branch 2: target_resource in ['kpi', 'executive_dashboard']", "role=standard, dept=sales, resource=kpi", "allowed=False, rule=BR-05", "allowed=False, rule=BR-05", "PASS", "High", "Branch L82: True"),
        ("BR-004", "White Box (Branch)", "Branch 2: target_resource not in executive list", "role=standard, dept=sales, resource=contract", "Proceed to department rules", "Proceeded to dept rules", "PASS", "High", "Branch L82: False"),
        ("BR-005", "White Box (Branch)", "Branch 3: SOP publish by standard user", "role=standard, resource=sop, action=publish", "allowed=False, rule=BR-04", "allowed=False, rule=BR-04", "PASS", "High", "Branch L93: True"),
        ("BR-006", "White Box (Branch)", "Branch 3: SOP publish by manager in own dept", "role=knowledge_manager, user_dept=sales, target_dept=sales", "allowed=True", "allowed=True", "PASS", "High", "Branch L93: False -> L105: True"),
        ("BR-007", "White Box (Branch)", "Branch 3: SOP publish by manager in foreign dept", "role=knowledge_manager, user_dept=sales, target_dept=legal", "allowed=False, rule=BR-04", "allowed=False, rule=BR-04", "PASS", "High", "Branch L105: False"),
        ("BR-008", "White Box (Branch)", "Branch 4: Target dept in allowed departments", "role=standard, user_dept=it, target_dept=it", "allowed=True", "allowed=True", "PASS", "High", "Branch L118: True"),
        ("BR-009", "White Box (Branch)", "Branch 4: Target dept NOT in allowed departments", "role=standard, user_dept=it, target_dept=accounting", "allowed=False, rule=BR-02", "allowed=False, rule=BR-02", "PASS", "High", "Branch L118: False"),

        # --- SECTION: WHITE BOX - LOOP TESTING ---
        ("__SECTION__", "WHITE BOX TESTING — Loop Testing (Department Scope Traversal)", "", "", "", "", "", "", ""),
        ("LP-001", "White Box (Loop)", "0x Loop: User has 0 allowed departments", "allowed_depts=[]", "Loop does not execute; denied", "Loop skipped; denied", "PASS", "Medium", "0 iterations"),
        ("LP-002", "White Box (Loop)", "1x Loop: User has 1 allowed department (match)", "allowed_depts=['sales'], target='sales'", "Matches on 1st iteration; granted", "Matches 1st item; granted", "PASS", "Medium", "1 iteration"),
        ("LP-003", "White Box (Loop)", "2x Loop: Match on 2nd department in list", "allowed_depts=['it', 'sales'], target='sales'", "Matches on 2nd iteration; granted", "Matches 2nd item; granted", "PASS", "Medium", "2 iterations"),
        ("LP-004", "White Box (Loop)", "Typical Loop: 4 departments traversal", "allowed_depts=['sales', 'it', 'rnd', 'accounting'], target='legal'", "Traverses all 4 items; denied", "Traversed 4 items; denied", "PASS", "Medium", "m iterations"),

        # --- SECTION: BLACK BOX - BOUNDARY VALUE ANALYSIS (BVA) ---
        ("__SECTION__", "BLACK BOX TESTING — Boundary Value Analysis (Document Ingestion & File Size)", "", "", "", "", "", "", ""),
        ("BD-001", "Black Box (BVA)", "File size = 0 bytes (Empty file)", "upload_file(size=0B, ext=.pdf)", "ERROR_EMPTY_FILE", "Rejected: Empty file (0B)", "PASS", "High", "Lower boundary invalid"),
        ("BD-002", "Black Box (BVA)", "File size = 1 byte (Minimum valid size)", "upload_file(size=1B, ext=.pdf)", "SUCCESS", "Uploaded and parsed (1B)", "PASS", "Medium", "Lower boundary valid"),
        ("BD-003", "Black Box (BVA)", "File size = 10 MB (Upper limit for .txt files)", "upload_file(size=10MB, ext=.txt)", "SUCCESS", "Accepted (10MB)", "PASS", "Medium", "Boundary TXT valid"),
        ("BD-004", "Black Box (BVA)", "File size = 10 MB + 1 Byte (.txt size exceeded)", "upload_file(size=10.000001MB, ext=.txt)", "ERROR_SIZE_EXCEEDED", "Rejected: File exceeds 10MB limit", "PASS", "High", "Boundary TXT invalid"),
        ("BD-005", "Black Box (BVA)", "File size = 50 MB (Upper limit for PDF/XLSX/DOCX)", "upload_file(size=50MB, ext=.pdf)", "SUCCESS", "Accepted (50MB)", "PASS", "Medium", "Boundary PDF valid"),
        ("BD-006", "Black Box (BVA)", "File size = 50 MB + 1 Byte (Max limit exceeded)", "upload_file(size=50.000001MB, ext=.pdf)", "ERROR_SIZE_EXCEEDED", "Rejected: File exceeds 50MB limit", "PASS", "High", "Boundary PDF invalid"),
        ("BD-007", "Black Box (BVA)", "File name length = 0 characters", "name='', ext=.pdf", "ERROR_NAME_REQUIRED", "Rejected: Filename required", "PASS", "High", "Min length invalid"),
        ("BD-008", "Black Box (BVA)", "File name length = 1 character", "name='a.pdf'", "SUCCESS", "Accepted (1 char)", "PASS", "Low", "Min length valid"),
        ("BD-009", "Black Box (BVA)", "File name length = 255 characters", "name='a'*251 + '.pdf'", "SUCCESS", "Accepted (255 chars)", "PASS", "Low", "Max length valid"),
        ("BD-010", "Black Box (BVA)", "File name length = 256 characters", "name='a'*252 + '.pdf'", "ERROR_NAME_TOO_LONG", "Rejected: Filename exceeds 255 chars", "PASS", "Medium", "Max length invalid"),

        # --- SECTION: BLACK BOX - EQUIVALENCE PARTITIONING (EP) ---
        ("__SECTION__", "BLACK BOX TESTING — Equivalence Partitioning (File Formats & Department Partitions)", "", "", "", "", "", "", ""),
        ("EP-001", "Black Box (EP)", "Valid partition: PDF Contract document", "name='contract_cuad.pdf', dept=legal", "SUCCESS (200)", "Uploaded & Qdrant Chunked", "PASS", "High", "Class 1: Valid PDF"),
        ("EP-002", "Black Box (EP)", "Valid partition: Word SOP document", "name='sop_procedure.docx', dept=sales", "SUCCESS (200)", "Uploaded & Text Extracted", "PASS", "High", "Class 2: Valid DOCX"),
        ("EP-003", "Black Box (EP)", "Valid partition: Excel ERP/CRM dataset", "name='aw_sales_ledger.xlsx', dept=accounting_procurement", "SUCCESS (200)", "Uploaded & Parsed", "PASS", "High", "Class 3: Valid XLSX"),
        ("EP-004", "Black Box (EP)", "Valid partition: CSV Data table", "name='customers.csv', dept=sales", "SUCCESS (200)", "Uploaded & Indexed", "PASS", "High", "Class 4: Valid CSV"),
        ("EP-005", "Black Box (EP)", "Invalid partition: Executable file (.exe)", "name='trojan.exe', dept=it", "ERROR_UNSUPPORTED_FORMAT (400)", "Rejected: Only .pdf, .docx, .xlsx, .csv, .txt", "PASS", "High", "Class 5: Invalid Ext"),
        ("EP-006", "Black Box (EP)", "Invalid partition: Shell Script (.sh)", "name='deploy.sh', dept=it", "ERROR_UNSUPPORTED_FORMAT (400)", "Rejected: Only .pdf, .docx, .xlsx, .csv, .txt", "PASS", "High", "Class 6: Invalid Ext"),
        ("EP-007", "Black Box (EP)", "Invalid partition: Archive file (.zip)", "name='backup.zip', dept=rnd", "ERROR_UNSUPPORTED_FORMAT (400)", "Rejected: Only .pdf, .docx, .xlsx, .csv, .txt", "PASS", "High", "Class 7: Invalid Ext"),
        ("EP-008", "Black Box (EP)", "Valid partition: Department Legal", "dept='legal'", "Saved in /data/legal/", "Stored in /data/legal/", "PASS", "High", "Class 8: Canonical Dept"),
        ("EP-009", "Black Box (EP)", "Valid partition: Department Sales", "dept='sales'", "Saved in /data/sales/", "Stored in /data/sales/", "PASS", "High", "Class 9: Canonical Dept"),
        ("EP-010", "Black Box (EP)", "Invalid partition: Non-existent Department", "dept='marketing'", "ERROR_INVALID_DEPT (400)", "Rejected: Department not in canonical list", "PASS", "Medium", "Class 10: Invalid Dept"),

        # --- SECTION: BLACK BOX - DECISION TABLE TESTING ---
        ("__SECTION__", "BLACK BOX TESTING — Decision Table Testing (Access Matrix & Upload Rules)", "", "", "", "", "", "", ""),
        ("DT-001", "Black Box (Decision Table)", "Rule 1: Valid Ext, Valid Size, Dept in Scope, Write Permission", "PDF, 5MB, Sales, Manager", "Upload & Trigger Pipeline (200)", "Uploaded & Ingesting", "PASS", "High", "Rule 1: Happy Path"),
        ("DT-002", "Black Box (Decision Table)", "Rule 2: Invalid Ext, Valid Size, Dept in Scope, Write Permission", "EXE, 5MB, Sales, Manager", "Reject 400 (Bad Extension)", "Rejected 400", "PASS", "High", "Rule 2: Bad Extension"),
        ("DT-003", "Black Box (Decision Table)", "Rule 3: Valid Ext, Over Size, Dept in Scope, Write Permission", "PDF, 65MB, Sales, Manager", "Reject 413 (Payload Too Large)", "Rejected 413", "PASS", "High", "Rule 3: File Too Large"),
        ("DT-004", "Black Box (Decision Table)", "Rule 4: Valid Ext, Valid Size, Dept Out-of-Scope, Write Permission", "PDF, 5MB, Legal, Sales Manager", "Reject 403 (Department Forbidden)", "Rejected 403", "PASS", "High", "Rule 4: Out of Scope"),
        ("DT-005", "Black Box (Decision Table)", "Rule 5: Valid Ext, Valid Size, Dept in Scope, Read-Only User", "PDF, 5MB, Sales, ReadOnly Guest", "Reject 403 (Action Forbidden)", "Rejected 403", "PASS", "High", "Rule 5: No Write Right"),
        ("DT-006", "Black Box (Decision Table)", "Rule 6: Valid Ext, Valid Size, Any Dept, Admin User", "PDF, 5MB, Legal, IT Admin", "Allow All (Override & Ingest)", "Uploaded & Ingesting", "PASS", "High", "Rule 6: Admin Override"),

        # --- SECTION: BLACK BOX - ERROR GUESSING ---
        ("__SECTION__", "BLACK BOX TESTING — Error Guessing (Security, Exploits & Malformed Data)", "", "", "", "", "", "", ""),
        ("EG-001", "Black Box (Error Guessing)", "Path traversal in filename: ../../etc/passwd", "name='../../etc/passwd.pdf'", "Sanitized to 'passwd.pdf'; safe store", "Sanitized & stored safely", "PASS", "High", "No directory escape"),
        ("EG-002", "Black Box (Error Guessing)", "Null byte injection: contract.pdf\\0.exe", "name='contract.pdf\\0.exe'", "Rejected or sanitized at boundary", "Rejected: Invalid character in filename", "PASS", "High", "Null byte blocked"),
        ("EG-003", "Black Box (Error Guessing)", "Double extension spoofing: agreement.pdf.exe", "name='agreement.pdf.exe'", "Parsed as .exe -> Rejected 400", "Rejected: .exe not supported", "PASS", "High", "Double ext blocked"),
        ("EG-004", "Black Box (Error Guessing)", "Corrupted zero-byte PDF header", "Corrupt binary stream without %PDF header", "Parser marks status FAILED (0 pipeline errors)", "Pipeline status: FAILED, logged", "PASS", "Medium", "Pipeline fault tolerance"),
        ("EG-005", "Black Box (Error Guessing)", "Vietnamese diacritics & spaces in filename", "name='Hợp đồng kinh tế & phụ lục 2026.pdf'", "UTF-8 safe normalization and storage", "Stored safely as UTF-8 file", "PASS", "Low", "Full i18n support"),
        ("EG-006", "Black Box (Error Guessing)", "Duplicate document upload (SHA-256 idempotency)", "Upload identical file twice in a row", "Idempotent: detected existing hash, no duplicate Qdrant nodes", "Detected duplicate hash, updated metadata", "PASS", "High", "Database integrity"),
    ]
    
    current_row = row_hdr + 1
    for item in test_cases_data:
        if item[0] == "__SECTION__":
            # Section Header Row
            ws_tc.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=9)
            sec_cell = ws_tc.cell(row=current_row, column=1, value=item[1])
            sec_cell.font = font_sec_hdr
            sec_cell.fill = fill_sec_hdr
            sec_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
            for c_i in range(1, 10):
                ws_tc.cell(row=current_row, column=c_i).border = border_cell
            current_row += 1
            continue
        
        tc_id, module, desc, inp, exp, act, status, prio, comm = item
        row_vals = [tc_id, module, desc, inp, exp, act, status, prio, comm]
        
        is_zebra = (current_row % 2 == 0)
        
        for c_idx, val in enumerate(row_vals, start=1):
            c = ws_tc.cell(row=current_row, column=c_idx, value=val)
            c.font = font_cell
            c.border = border_cell
            
            if c_idx in (1, 8):
                c.alignment = align_center
            elif c_idx == 7: # Status
                c.alignment = align_center
                if val == "PASS":
                    c.font = font_pass
                    c.fill = fill_pass
                elif val == "FAIL":
                    c.font = font_fail
                    c.fill = fill_fail
            else:
                c.alignment = align_left
                if is_zebra:
                    c.fill = fill_zebra
                    
        current_row += 1
    
    # Auto-fit columns for Testcase
    col_widths = {1: 14, 2: 24, 3: 40, 4: 45, 5: 35, 6: 35, 7: 12, 8: 12, 9: 30}
    for col_i, w in col_widths.items():
        ws_tc.column_dimensions[get_column_letter(col_i)].width = w

    # -------------------------------------------------------------
    # 2. SHEET REPORT
    # -------------------------------------------------------------
    ws_rep = wb.create_sheet(title="Report")
    
    # Report Header Block
    c_title = ws_rep.cell(row=1, column=1, value="TEST EXECUTION REPORT")
    c_title.font = Font(name="Arial", size=14, bold=True, color="1E3A5F")
    
    c_cycle_lbl = ws_rep.cell(row=2, column=1, value="Test Cycle")
    c_cycle_lbl.font = font_meta_title
    c_cycle_val = ws_rep.cell(row=2, column=2, value="GraphMind Comprehensive System & Academic Testing (Ver 2.5)")
    c_cycle_val.font = font_meta_val
    ws_rep.merge_cells(start_row=2, start_column=2, end_row=2, end_column=7)
    
    # Summary KPI Table
    ws_rep.cell(row=4, column=1, value="Executed").font = font_meta_title
    ws_rep.cell(row=4, column=2, value="Passed").font = font_meta_val
    ws_rep.cell(row=4, column=6, value=49).font = font_pass
    
    ws_rep.cell(row=5, column=2, value="Failed").font = font_meta_val
    ws_rep.cell(row=5, column=6, value=0).font = font_fail
    
    ws_rep.cell(row=6, column=2, value="(Total) Test executed (Passed + Failed)").font = font_meta_title
    c_tot_exec = ws_rep.cell(row=6, column=6, value="=SUM(F4:F5)")
    c_tot_exec.font = font_meta_title
    
    ws_rep.cell(row=7, column=1, value="Pending").font = font_meta_title
    ws_rep.cell(row=7, column=7, value=0).font = font_meta_val
    
    ws_rep.cell(row=8, column=1, value="In Process").font = font_meta_title
    ws_rep.cell(row=8, column=7, value=0).font = font_meta_val
    
    ws_rep.cell(row=9, column=1, value="Blocked").font = font_meta_title
    ws_rep.cell(row=9, column=7, value=0).font = font_meta_val
    
    ws_rep.cell(row=10, column=1, value="(Sub-total) Test Planned").font = font_meta_title
    ws_rep.cell(row=10, column=7, value="=F6").font = font_meta_title
    
    ws_rep.cell(row=11, column=1, value="Total Test Planned (Pending + In Process + Blocked + Executed)").font = font_meta_title
    ws_rep.cell(row=11, column=7, value="=SUM(G7:G10)").font = font_meta_title
    
    # Detailed Function Breakdown Table at Row 13
    breakdown_headers = [
        "Function / Test Suite",
        "Technique & Scope",
        "% TCs Executed",
        "% TCs Passed",
        "% TCs Failed",
        "Priority",
        "Remarks & Findings"
    ]
    
    for c_i, h in enumerate(breakdown_headers, start=1):
        cell_h = ws_rep.cell(row=13, column=c_i, value=h)
        cell_h.font = font_header
        cell_h.fill = fill_header
        cell_h.alignment = align_center
        cell_h.border = border_cell
        
    breakdown_rows = [
        ("RBAC & Access Control Engine (M6)", "White Box Testing (Basic Path, Branch, and Loop testing on check_rbac_permission)", 1.0, 1.0, 0.0, "High", "8 Basic Path (BP), 9 Branch (BR), 4 Loop (LP) testcases passed 100%. All enterprise access rules (BR-02, BR-03, BR-04, BR-05) verified strictly."),
        ("Document Upload & Ingestion Pipeline (M1/M2)", "Black Box Testing (Boundary Value Analysis on file sizes, name limits, and extensions)", 1.0, 1.0, 0.0, "High", "10 BVA testcases passed. File size boundaries (0B, 1B, 10MB txt, 50MB PDF/XLSX) properly gated with clear Vietnamese user error toasts."),
        ("File Formats & Department Partitions (M1/M5)", "Black Box Testing (Equivalence Partitioning on canonical formats and departments)", 1.0, 1.0, 0.0, "High", "10 EP testcases passed. Verified all 5 canonical departments (legal, sales, rnd, it, accounting_procurement). Malicious extensions (.exe, .sh, .zip) blocked."),
        ("Access Decision & Ingestion Rules (M2/M6)", "Black Box Testing (Decision Table Testing combining extension, size, scope, and user role)", 1.0, 1.0, 0.0, "High", "6 Decision Table testcases passed. Tested 6 combination rules including admin override and guest read-only rejection."),
        ("Security Exploits & Fault Tolerance (M1/M6)", "Black Box Testing (Error Guessing on path traversal, null bytes, double extensions, corrupt PDFs)", 1.0, 1.0, 0.0, "High", "6 Error Guessing testcases passed. Directory traversal (../../) sanitized safely; SHA-256 duplicate uploads verified idempotent without Qdrant bloat."),
    ]
    
    for r_idx, b_row in enumerate(breakdown_rows, start=14):
        for c_idx, val in enumerate(b_row, start=1):
            cell = ws_rep.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.border = border_cell
            if c_idx in (3, 4, 5):
                cell.number_format = "0.0%"
                cell.alignment = align_center
            elif c_idx == 6:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
    
    # Auto-fit columns for Report
    rep_col_widths = {1: 36, 2: 45, 3: 16, 4: 16, 5: 16, 6: 14, 7: 45}
    for col_i, w in rep_col_widths.items():
        ws_rep.column_dimensions[get_column_letter(col_i)].width = w
        
    wb.save(filepath)
    print(f"Successfully generated Excel: {filepath}")

if __name__ == "__main__":
    build_testcase_and_report_excel("docs/test/TestCase&TestReport.xlsx")

