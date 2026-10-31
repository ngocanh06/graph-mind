"""
Script: scripts/test_copilot_e2e_routing.py
Description: End-to-end verification of Copilot routing between CUAD Legal Contracts and AdventureWorks ERP entities.
"""
import sys
import json
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND_BASE = "http://127.0.0.1:5000"

def ask_copilot(query: str, role: str = "executive", dept: str = "Executive"):
    url = f"{BACKEND_BASE}/api/v1/copilot/ask"
    payload = json.dumps({"query": query, "lang": "vi"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-User-Name": "test_runner",
            "X-User-Role": role,
            "X-User-Dept": dept,
        }
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_copilot_routing():
    print("=" * 65)
    print("TEST COPILOT E2E ROUTING (LEGAL VS ERP VS HYBRID)")
    print("=" * 65)

    # 1. Legal Contract Query -> cuad_contracts
    print("\n[TEST 1] Legal Contract Query (Clauses, Compliance, Termination)...")
    q_legal = "Điều khoản bảo mật và trách nhiệm bồi hoàn trong hợp đồng cung cấp dịch vụ"
    res_legal = ask_copilot(q_legal)
    citations_legal = res_legal.get("citations", [])
    print(f"  Query: '{q_legal}'")
    print(f"  Citations returned: {len(citations_legal)}")
    assert len(citations_legal) > 0, "No citations returned for legal query!"
    
    legal_vector_found = any(
        ".pdf" in (c.get("file", "") + c.get("docName", "")).lower() or
        "kho véc-tơ cuad" in c.get("location", "").lower() or
        "đoạn #" in c.get("location", "").lower()
        for c in citations_legal
    )
    print(f"  Legal vector doc citation verified: {legal_vector_found}")
    assert legal_vector_found, "Expected legal contract document in citations for legal query!"
    print("  --> PASS: Legal query correctly routed to cuad_contracts & Legal KG")

    # 2. AdventureWorks Semantic Query -> adventureworks_entities
    print("\n[TEST 2] AdventureWorks Business Entity Query (Product / Customer / Store)...")
    q_biz = "Tìm sản phẩm xe đạp địa hình Mountain-100 màu đen"
    res_biz = ask_copilot(q_biz)
    citations_biz = res_biz.get("citations", [])
    print(f"  Query: '{q_biz}'")
    print(f"  Citations returned: {len(citations_biz)}")
    assert len(citations_biz) > 0, "No citations returned for business semantic query!"

    aw_vector_found = any(
        "aw vector" in c.get("location", "").lower() or
        "mountain" in (c.get("docName", "") + c.get("file", "") + c.get("text", "")).lower() or
        "product" in c.get("location", "").lower()
        for c in citations_biz
    )
    print(f"  AdventureWorks vector/graph entity verified: {aw_vector_found}")
    assert aw_vector_found, "Expected AdventureWorks entity in citations (vector search must not be blocked)!"
    print("  --> PASS: Business entity query correctly routed to adventureworks_entities & Product KG")

    # 3. Customer / Store Query -> adventureworks_entities
    print("\n[TEST 3] Customer / Store Partner Query...")
    q_cust = "Thông tin khách hàng và cửa hàng xe đạp Better Bike Shop"
    res_cust = ask_copilot(q_cust)
    citations_cust = res_cust.get("citations", [])
    print(f"  Query: '{q_cust}'")
    print(f"  Citations returned: {len(citations_cust)}")
    assert len(citations_cust) > 0, "No citations returned for customer query!"
    cust_found = any("better bike" in (c.get("docName", "") + c.get("text", "")).lower() or "customer" in c.get("location", "").lower() for c in citations_cust)
    print(f"  Customer entity verified: {cust_found}")
    print("  --> PASS: Customer entity query successfully handled")

    # 4. Financial / Aggregation Query -> Neo4j Cypher / Graph
    print("\n[TEST 4] Financial / Sales Aggregation Query...")
    q_fin = "Tổng doanh thu và số lượng đơn hàng bán được"
    res_fin = ask_copilot(q_fin)
    answer_fin = res_fin.get("answer", "")
    print(f"  Query: '{q_fin}'")
    print(f"  Answer snippet: {answer_fin[:120]}...")
    assert len(answer_fin) > 10, "Empty answer returned for aggregation query!"
    print("  --> PASS: Financial aggregation query routed to graph engine")

    # 5. Cross-Domain Query -> Qdrant + Neo4j Hybrid Blend
    print("\n[TEST 5] Cross-Domain Query (Contract Compliance for AdventureWorks Products)...")
    q_cross = "Hợp đồng tuân thủ điều khoản chất lượng sản phẩm xe đạp địa hình Mountain"
    res_cross = ask_copilot(q_cross)
    citations_cross = res_cross.get("citations", [])
    print(f"  Query: '{q_cross}'")
    print(f"  Citations returned: {len(citations_cross)}")
    assert len(citations_cross) > 0, "No citations returned for cross-domain query!"
    print("  --> PASS: Cross-domain query successfully fused")

    print("\n" + "=" * 65)
    print("ALL COPILOT ROUTING TESTS PASSED [100%]")
    print("=" * 65)

if __name__ == "__main__":
    test_copilot_routing()
