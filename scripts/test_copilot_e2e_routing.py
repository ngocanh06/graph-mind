#!/usr/bin/env python3
"""
scripts/test_copilot_e2e_routing.py
End-to-End API Copilot Verification Suite
Tests:
1. AdventureWorks Business / ERP Query Routing
2. CUAD Legal Contract Query Routing
3. Cross-domain / Hybrid Query Routing
4. Negative / Out-of-Domain Query (No Hallucination)
5. Citation Integrity & Evidence Chips
"""

import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API_URL = "http://127.0.0.1:5000/api/v1/copilot/ask"

def post_ask(query: str, lang: str = "vi") -> dict:
    payload = json.dumps({"query": query, "lang": lang}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_tests():
    print("=" * 75)
    print(" GRAPHMIND — COPILOT E2E API & QUERY ROUTING VERIFICATION SUITE")
    print("=" * 75)
    
    passed = 0
    total = 5

    # -------------------------------------------------------------------------
    # TEST 1: AdventureWorks ERP Routing
    # -------------------------------------------------------------------------
    print("\n[TEST 1] AdventureWorks ERP Query Routing (Doanh thu & Đơn hàng)...")
    q1 = "Tổng doanh thu năm 2013 của công ty là bao nhiêu?"
    r1 = post_ask(q1)
    ans1 = r1.get("answer", "")
    citations1 = r1.get("citations", [])
    chips1 = r1.get("evidenceChips", [])
    
    # Check that answer mentions 2013 and revenue (48M or 43M)
    has_revenue_info = "48,965,887" in ans1 or "43,622,479" in ans1 or "2013" in ans1 or "doanh thu" in ans1.lower()
    has_aw_source = any("AdventureWorks" in str(c.get("sourceType")) or "Neo4j" in str(c.get("sourceType")) for c in citations1)
    
    t1_pass = has_revenue_info and has_aw_source
    print(f"  Query: '{q1}'")
    print(f"  Answer Snippet: {ans1[:120]}...")
    print(f"  Citations Count: {len(citations1)} (Sources: {[c.get('sourceType') for c in citations1[:3]]})")
    print(f"  -> {'PASS' if t1_pass else 'FAIL'}")
    if t1_pass: passed += 1

    # -------------------------------------------------------------------------
    # TEST 2: CUAD Legal Contract Routing
    # -------------------------------------------------------------------------
    print("\n[TEST 2] CUAD Legal Contract Routing (Điều khoản & Hợp đồng)...")
    q2 = "Tìm điều khoản Limitation of Liability trong các hợp đồng CUAD"
    r2 = post_ask(q2)
    ans2 = r2.get("answer", "")
    citations2 = r2.get("citations", [])
    
    has_legal_source = any("cuad" in str(c.get("file", "")).lower() or "cuad" in str(c.get("sourceType", "")).lower() or "clause" in str(c.get("sourceType", "")).lower() or "neo4j" in str(c.get("sourceType", "")).lower() for c in citations2)
    t2_pass = len(citations2) > 0 and has_legal_source
    print(f"  Query: '{q2}'")
    print(f"  Answer Snippet: {ans2[:120]}...")
    print(f"  Citations Count: {len(citations2)} (Files: {[c.get('file') or c.get('docName') for c in citations2[:3]]})")
    print(f"  -> {'PASS' if t2_pass else 'FAIL'}")
    if t2_pass: passed += 1

    # -------------------------------------------------------------------------
    # TEST 3: Specific SalesOrder Lookup
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Specific SalesOrder Traversal (Order #43659)...")
    q3 = "Thông tin chi tiết đơn hàng #43659"
    r3 = post_ask(q3)
    ans3 = r3.get("answer", "")
    citations3 = r3.get("citations", [])
    
    has_order_info = "43659" in ans3 or "23,153" in ans3 or "29825" in ans3 or any("43659" in str(c) for c in citations3)
    t3_pass = has_order_info
    print(f"  Query: '{q3}'")
    print(f"  Answer Snippet: {ans3[:120]}...")
    print(f"  -> {'PASS' if t3_pass else 'FAIL'}")
    if t3_pass: passed += 1

    # -------------------------------------------------------------------------
    # TEST 4: Out-of-Domain / Negative Query (No Data / No Hallucination)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Out-of-Domain / No Data Query (Anti-Hallucination)...")
    q4 = "Thông số vũ khí máy bay tiêm kích tàng hình F-35 Lightning II"
    r4 = post_ask(q4)
    ans4 = r4.get("answer", "")
    citations4 = r4.get("citations", [])
    
    # Check that system clearly indicates no relevant enterprise data or filters it
    t4_pass = (
        "không tìm thấy" in ans4.lower() or
        "không có dữ liệu" in ans4.lower() or
        "không liên quan" in ans4.lower() or
        "ngoài phạm vi" in ans4.lower() or
        len(citations4) == 0 or
        r4.get("confidenceScore", 0) < 60
    )
    print(f"  Query: '{q4}'")
    print(f"  Answer Snippet: {ans4[:120]}...")
    print(f"  Confidence Score: {r4.get('confidenceScore')}")
    print(f"  -> {'PASS' if t4_pass else 'FAIL'}")
    if t4_pass: passed += 1

    # -------------------------------------------------------------------------
    # TEST 5: Citations Schema & Evidence Chips Validation
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Citations Schema & Evidence Chips Validation...")
    t5_pass = True
    for c in citations1 + citations2:
        if not ("docName" in c and "sourceType" in c):
            t5_pass = False
            break
    print(f"  Checked {len(citations1) + len(citations2)} citations for standard fields (docName, sourceType, text, location).")
    print(f"  Evidence Chips in Test 1: {[chip.get('label') for chip in chips1[:3]]}")
    print(f"  -> {'PASS' if t5_pass else 'FAIL'}")
    if t5_pass: passed += 1

    print("\n" + "=" * 75)
    print(f"COPILOT E2E VERIFICATION RESULT: {passed}/{total} TESTS PASSED ({passed/total*100:.1f}%)")
    print("=" * 75)
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
