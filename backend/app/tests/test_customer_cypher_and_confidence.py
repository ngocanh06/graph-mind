"""
Test verification for Customer Cypher query separation & ERP confidence/badge logic.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import (
    generate_cypher_from_query,
    execute_text_to_cypher
)

def test_customer_cypher_separation():
    # 1. Product quantity query
    q_qty = "KHÁCH HÀNG NÀO MUA NHIỀU SẢN PHẨM NHẤT"
    cypher_qty = generate_cypher_from_query(q_qty)
    assert "CONTAINS_PRODUCT" in cypher_qty, "Expected CONTAINS_PRODUCT traversal for product volume"
    assert "totalQty" in cypher_qty, "Expected totalQty aggregation"
    res_qty = execute_text_to_cypher(q_qty)
    assert len(res_qty) > 0, "Expected results for product volume"
    top_qty = res_qty[0]
    assert top_qty.get("CustomerID") == 29722 or "29722" in str(top_qty.get("name")), f"Expected Customer #29722, got {top_qty}"
    assert top_qty.get("totalQty") == 2737, f"Expected 2737 units, got {top_qty.get('totalQty')}"
    print(f"[OK] Product Volume: {top_qty['name']} bought {top_qty['totalQty']} units (Rank #1)")

    # 2. Order count query
    q_ord = "Khách hàng nào có nhiều đơn hàng nhất"
    cypher_ord = generate_cypher_from_query(q_ord)
    assert "order_count DESC" in cypher_ord, "Expected order_count descending order"
    res_ord = execute_text_to_cypher(q_ord)
    assert len(res_ord) > 0, "Expected results for order count"
    top_ord = res_ord[0]
    assert top_ord.get("order_count") == 28, f"Expected 28 orders, got {top_ord.get('order_count')}"
    print(f"[OK] Order Count: {top_ord['name']} has {top_ord['order_count']} orders (Rank #1)")

    # 3. Revenue / Spending query (MAX)
    q_rev = "Khách hàng nào có doanh thu cao nhất"
    cypher_rev = generate_cypher_from_query(q_rev)
    assert "totalSpent DESC" in cypher_rev, "Expected totalSpent descending order"
    res_rev = execute_text_to_cypher(q_rev)
    assert len(res_rev) > 0, "Expected results for revenue"
    top_rev = res_rev[0]
    assert top_rev.get("CustomerID") == 29818 or "29818" in str(top_rev.get("name")), f"Expected Customer #29818, got {top_rev}"
    assert top_rev.get("totalSpent") == 989184.08, f"Expected $989184.08, got {top_rev.get('totalSpent')}"
    print(f"[OK] Revenue / VIP (MAX): {top_rev['name']} spent ${top_rev['totalSpent']} USD (Rank #1)")

    # 4. Lowest Revenue / Spending query (MIN)
    q_rev_min = "Khách hàng có chi tiêu thấp nhất"
    cypher_rev_min = generate_cypher_from_query(q_rev_min)
    assert "totalSpent ASC" in cypher_rev_min, "Expected totalSpent ascending order"
    res_rev_min = execute_text_to_cypher(q_rev_min)
    assert len(res_rev_min) > 0, "Expected results for lowest spending"
    lowest_rev = res_rev_min[0]
    assert lowest_rev.get("CustomerID") == 30078 or "30078" in str(lowest_rev.get("name")) or "Mobile Outlet" in str(lowest_rev.get("name")), f"Expected Customer #30078 (Mobile Outlet), got {lowest_rev}"
    assert lowest_rev.get("totalSpent") == 1.52, f"Expected $1.52, got {lowest_rev.get('totalSpent')}"
    print(f"[OK] Lowest Spending (MIN): {lowest_rev['name']} spent ${lowest_rev['totalSpent']} USD (Rank #1 lowest)")

if __name__ == "__main__":
    test_customer_cypher_separation()
    print("\n[ALL CHECKS PASSED] Customer Cypher ranking & verification confirmed!")
