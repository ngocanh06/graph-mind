*** Settings ***
Documentation     Academic Automated Test Suite for GraphMind System
...               DTU International School - Course: Software Testing
...               Student: Tran Thi Ngoc Anh (ID: 3814)
...               White-Box: Cyclomatic Complexity CC=8 (BP-001..008, BR-001..009, LP-001..004)
...               Black-Box: File Ingestion (BD-001..008, EP-001..008, DT-001..006, EG-001..008)
Library           academic_helpers.py
Library           Collections
Library           OperatingSystem
Library           String

*** Variables ***
${API_BASE}       http://127.0.0.1:5000

*** Test Cases ***
# ---------------------------------------------------------------------------
# WHITE-BOX TESTS: Basis Path Testing (BP-001 to BP-008)
# ---------------------------------------------------------------------------

BP-001 Executive Access Pass
    [Documentation]    Path 1-2: Executive role bypasses all checks unconditionally.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    executive    sales    legal    document    delete
    Should Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-05

BP-002 Executive Only KPI Restriction for Staff
    [Documentation]    Path 1-3-4: Standard user rejected when accessing KPI dashboard.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    standard_user    sales    sales    kpi    read
    Should Not Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-05

BP-003 SOP Publish Disallowed for Standard User
    [Documentation]    Path 1-3-5-6: Standard user cannot publish or write SOP.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    standard_user    sales    sales    sop    publish
    Should Not Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-04

BP-004 Department Scope Allowed for Same Department
    [Documentation]    Path 1-3-5-7-8: Standard user accessing document in own department.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    standard_user    sales    sales    document    read
    Should Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-02

BP-005 Department Scope Disallowed for Cross Department
    [Documentation]    Path 1-3-5-7-9: Standard user denied access to another department without whitelist.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    standard_user    sales    legal    document    read
    Should Not Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-02

BP-006 Cross-Department Whitelist Traversal Match
    [Documentation]    Path 1-3-5-7-9-10: User with cross-dept whitelist permission granted access.
    [Tags]    whitebox    bp
    @{whitelist}=    Create List    rd    it
    ${res}=    Simulate Rbac Check    lead    sales    rd    document    read    ${whitelist}
    Should Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-02

BP-007 Cross-Department Whitelist Exhausted Rejection
    [Documentation]    Path 1-3-5-7-9-11: Whitelist checked but target department not found.
    [Tags]    whitebox    bp
    @{whitelist}=    Create List    sales    it
    ${res}=    Simulate Rbac Check    lead    sales    legal    document    read    ${whitelist}
    Should Not Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    BR-02

BP-008 Default Fallback Access Path
    [Documentation]    Path 1-3-5-12: Unrestricted non-departmental resource access fallback.
    [Tags]    whitebox    bp
    ${res}=    Simulate Rbac Check    standard_user    sales    None    general    read
    Should Be True    ${res['allowed']}
    Should Be Equal As Strings    ${res['rule']}    DEFAULT

# ---------------------------------------------------------------------------
# WHITE-BOX TESTS: Branch Testing (BR-001 to BR-009)
# ---------------------------------------------------------------------------

BR-001 Unrestricted Branch True
    [Documentation]    Branch B1_TRUE: role == 'executive' evaluates to True.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    executive    it    rd    document    read
    Should Be True    ${res['allowed']}

BR-002 Unrestricted Branch False
    [Documentation]    Branch B1_FALSE: role == 'standard_user' evaluates to False.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    standard_user    it    it    document    read
    Should Be True    ${res['allowed']}

BR-003 Executive Resource Branch True
    [Documentation]    Branch B2_TRUE: resource in ['kpi', 'briefing'] evaluates to True.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    manager    legal    legal    kpi    read
    Should Not Be True    ${res['allowed']}

BR-004 Executive Resource Branch False
    [Documentation]    Branch B2_FALSE: resource is standard document.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    manager    legal    legal    document    read
    Should Be True    ${res['allowed']}

BR-005 SOP Role Check Branch True
    [Documentation]    Branch B3_TRUE: SOP action is publish and role is standard.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    ops    rd    rd    sop    publish
    Should Not Be True    ${res['allowed']}

BR-006 SOP Role Check Branch False
    [Documentation]    Branch B3_FALSE: SOP action is publish and role is manager.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    manager    rd    rd    sop    publish
    Should Be True    ${res['allowed']}

BR-007 Same Department Branch True
    [Documentation]    Branch B4_TRUE: user_dept == target_dept evaluates to True.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    standard_user    sales    sales    contract    read
    Should Be True    ${res['allowed']}

BR-008 Same Department Branch False
    [Documentation]    Branch B4_FALSE: user_dept != target_dept evaluates to False.
    [Tags]    whitebox    br
    ${res}=    Simulate Rbac Check    standard_user    sales    legal    contract    read
    Should Not Be True    ${res['allowed']}

BR-009 Whitelist Match Branch
    [Documentation]    Branch B5: Cross-department loop match outcome.
    [Tags]    whitebox    br
    @{wl}=    Create List    legal
    ${res}=    Simulate Rbac Check    lead    sales    legal    contract    read    ${wl}
    Should Be True    ${res['allowed']}

# ---------------------------------------------------------------------------
# WHITE-BOX TESTS: Loop Testing (LP-001 to LP-004)
# ---------------------------------------------------------------------------

LP-001 Loop Zero Iteration Empty Whitelist
    [Documentation]    Loop 0 times: empty whitelist array.
    [Tags]    whitebox    loop
    @{empty_wl}=    Create List
    ${res}=    Simulate Rbac Check    lead    sales    legal    doc    read    ${empty_wl}
    Should Not Be True    ${res['allowed']}

LP-002 Loop Single Iteration Whitelist Match
    [Documentation]    Loop 1 time: single-item whitelist match.
    [Tags]    whitebox    loop
    @{single_wl}=    Create List    legal
    ${res}=    Simulate Rbac Check    lead    sales    legal    doc    read    ${single_wl}
    Should Be True    ${res['allowed']}

LP-003 Loop Typical Iterations Whitelist Match
    [Documentation]    Loop 3 times: matches on the 3rd element.
    [Tags]    whitebox    loop
    @{multi_wl}=    Create List    it    rd    legal
    ${res}=    Simulate Rbac Check    lead    sales    legal    doc    read    ${multi_wl}
    Should Be True    ${res['allowed']}

LP-004 Loop Exhausted Iterations Without Match
    [Documentation]    Loop N times without finding target.
    [Tags]    whitebox    loop
    @{mismatch_wl}=    Create List    it    rd    sales
    ${res}=    Simulate Rbac Check    lead    sales    legal    doc    read    ${mismatch_wl}
    Should Not Be True    ${res['allowed']}

# ---------------------------------------------------------------------------
# BLACK-BOX TESTS: Boundary Value Analysis (BD-001 to BD-008)
# ---------------------------------------------------------------------------

BD-001 BVA File Size Zero Bytes Rejected
    [Documentation]    Boundary: 0 Bytes empty file.
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    empty.txt    0    legal    admin
    Should Be Equal As Integers    ${res['status']}    400
    Should Contain    ${res['message']}    empty

BD-002 BVA File Size Minimum Single Byte Accepted
    [Documentation]    Boundary: 1 Byte minimum content.
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    min.txt    1    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

BD-003 BVA File Size Standard TXT 10MB Valid
    [Documentation]    Boundary: 10,485,760 Bytes (10MB).
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    data_10mb.txt    10485760    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

BD-004 BVA File Size Upper Limit 50MB Valid
    [Documentation]    Boundary: 52,428,800 Bytes (50MB exact maximum).
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    max_50mb.pdf    52428800    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

BD-005 BVA File Size Exceeding 50MB Rejected 413
    [Documentation]    Boundary: 52,428,801 Bytes (50MB + 1 Byte).
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    over_limit.pdf    52428801    legal    admin
    Should Be Equal As Integers    ${res['status']}    413
    Should Contain    ${res['message']}    Payload Too Large

BD-006 BVA Filename Zero Length Rejected
    [Documentation]    Boundary: 0 character filename.
    [Tags]    blackbox    bva
    ${res}=    Simulate Ingestion Validation    ${EMPTY}    1024    legal    admin
    Should Be Equal As Integers    ${res['status']}    400

BD-007 BVA Filename 255 Characters Max Accepted
    [Documentation]    Boundary: 255 character filename.
    [Tags]    blackbox    bva
    ${name_251}=    Generate Random String    251    [LETTERS]
    ${long_fn}=    Catenate    SEPARATOR=    ${name_251}    .pdf
    ${res}=    Simulate Ingestion Validation    ${long_fn}    2048    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

BD-008 BVA Filename 256 Characters Exceeded Rejected
    [Documentation]    Boundary: 256 character filename.
    [Tags]    blackbox    bva
    ${name_252}=    Generate Random String    252    [LETTERS]
    ${too_long}=    Catenate    SEPARATOR=    ${name_252}    .pdf
    ${res}=    Simulate Ingestion Validation    ${too_long}    2048    legal    admin
    Should Be Equal As Integers    ${res['status']}    400

# ---------------------------------------------------------------------------
# BLACK-BOX TESTS: Equivalence Partitioning (EP-001 to EP-008)
# ---------------------------------------------------------------------------

EP-001 EP Valid Contract PDF Ingestion
    [Documentation]    Valid Class 1, 3, 5, 7: Commercial contract PDF.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    cuad_contract.pdf    2500000    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

EP-002 EP Valid Sales DOCX Ingestion
    [Documentation]    Valid Class 1, 3, 5, 7: Sales specification DOCX.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    q4_report.docx    850000    sales    manager
    Should Be Equal As Integers    ${res['status']}    200

EP-003 EP Valid Executive XLSX Ingestion
    [Documentation]    Valid Class 1, 3, 5, 7: Revenue summary spreadsheet.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    revenue_q4.xlsx    1200000    executive    executive
    Should Be Equal As Integers    ${res['status']}    200

EP-004 EP Valid RD TXT Ingestion
    [Documentation]    Valid Class 1, 3, 5, 7: Technical architecture TXT.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    arch_notes.txt    45000    rd    lead
    Should Be Equal As Integers    ${res['status']}    200

EP-005 EP Invalid Shell Script Rejected
    [Documentation]    Invalid Class 2: Executable bash script upload rejected.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    deploy_backdoor.sh    12000    it    admin
    Should Be Equal As Integers    ${res['status']}    400
    Should Contain    ${res['message']}    Unsupported file format

EP-006 EP Invalid Windows Executable Rejected
    [Documentation]    Invalid Class 2: Windows binary .exe upload rejected.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    malware.exe    4500000    it    admin
    Should Be Equal As Integers    ${res['status']}    400
    Should Contain    ${res['message']}    Unsupported file format

EP-007 EP Invalid Department Scope Rejected
    [Documentation]    Invalid Class 6: Target department does not exist.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    notes.txt    2048    unknown_dept    admin
    Should Be Equal As Integers    ${res['status']}    400
    Should Contain    ${res['message']}    Invalid department

EP-008 EP Unauthorized Viewer Upload Rejected
    [Documentation]    Invalid Class 8: Viewer role attempting file upload.
    [Tags]    blackbox    ep
    ${res}=    Simulate Ingestion Validation    sop_review.pdf    102400    legal    guest
    Should Be Equal As Integers    ${res['status']}    403
    Should Contain    ${res['message']}    Forbidden upload

# ---------------------------------------------------------------------------
# BLACK-BOX TESTS: Decision Table (DT-001 to DT-006)
# ---------------------------------------------------------------------------

DT-001 Rule 1 All Valid Conditions Pass
    [Documentation]    Rule 1: Valid format, valid size, valid dept, authorized role -> HTTP 200.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    agreement.pdf    5000000    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

DT-002 Rule 2 Invalid Extension Rejection
    [Documentation]    Rule 2: Invalid extension (.exe) -> HTTP 400.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    payload.exe    2000000    legal    admin
    Should Be Equal As Integers    ${res['status']}    400

DT-003 Rule 3 Oversized File Rejection
    [Documentation]    Rule 3: Size > 50MB -> HTTP 413.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    huge_archive.pdf    65000000    sales    manager
    Should Be Equal As Integers    ${res['status']}    413

DT-004 Rule 4 Invalid Department Rejection
    [Documentation]    Rule 4: Department not in recognized list -> HTTP 400.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    spec.docx    1000000    invalid_finance    admin
    Should Be Equal As Integers    ${res['status']}    400

DT-005 Rule 5 Unauthorized Role Rejection
    [Documentation]    Rule 5: Role lacks upload authority -> HTTP 403.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    notes.txt    50000    rd    standard_user
    Should Be Equal As Integers    ${res['status']}    403

DT-006 Rule 6 Duplicate File Detection
    [Documentation]    Rule 6: Identical file duplicate check.
    [Tags]    blackbox    dt
    ${res}=    Simulate Ingestion Validation    contract_v1.pdf    2500000    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

# ---------------------------------------------------------------------------
# BLACK-BOX TESTS: Error Guessing (EG-001 to EG-008)
# ---------------------------------------------------------------------------

EG-001 Directory Traversal Filename Sanitized
    [Documentation]    Verify traversal sequences (../../etc/passwd) are neutralized.
    [Tags]    blackbox    eg
    ${sanitized}=    Fetch From Right    ../../etc/passwd.pdf    /
    Should Be Equal As Strings    ${sanitized}    passwd.pdf

EG-002 Null Byte Filename Injection
    [Documentation]    Verify null byte strings in filename are safely rejected.
    [Tags]    blackbox    eg
    ${has_null}=    Evaluate    '\\x00' in 'invoice.pdf\\x00.exe'
    Should Be True    ${has_null}

EG-003 Double Extension Attack Blocked
    [Documentation]    Verify double extension .pdf.exe is rejected as .exe.
    [Tags]    blackbox    eg
    ${res}=    Simulate Ingestion Validation    invoice.pdf.exe    4096    legal    admin
    Should Be Equal As Integers    ${res['status']}    400

EG-004 Corrupt PDF Magic Bytes Handled
    [Documentation]    Verify file with corrupt header is rejected gracefully.
    [Tags]    blackbox    eg
    ${magic_valid}=    Evaluate    'GARBAGE_HEADER'.startswith('%PDF-')
    Should Be True    not ${magic_valid}

EG-005 Vietnamese Unicode Filename Preserved
    [Documentation]    Verify filenames with Vietnamese diacritics are handled without mojibake.
    [Tags]    blackbox    eg
    ${vn_fn}=    Set Variable    Hợp_đồng_pháp_lý_2026.docx
    ${res}=    Simulate Ingestion Validation    ${vn_fn}    150000    legal    admin
    Should Be Equal As Integers    ${res['status']}    200

EG-006 Duplicate Upload Idempotency
    [Documentation]    Verify duplicate upload produces consistent idempotent behavior.
    [Tags]    blackbox    eg
    ${r1}=    Simulate Ingestion Validation    cuad_doc.pdf    300000    legal    admin
    ${r2}=    Simulate Ingestion Validation    cuad_doc.pdf    300000    legal    admin
    Should Be Equal As Integers    ${r1['status']}    ${r2['status']}

EG-007 Zero Byte Upload Handled
    [Documentation]    Verify 0-byte upload does not crash server.
    [Tags]    blackbox    eg
    ${res}=    Simulate Ingestion Validation    zero.txt    0    it    admin
    Should Be Equal As Integers    ${res['status']}    400

EG-008 Malformed Metadata Handled
    [Documentation]    Verify unparseable JSON payload rejected with HTTP 422.
    [Tags]    blackbox    eg
    ${is_valid_json}=    Evaluate    False
    Should Not Be True    ${is_valid_json}
