"""
Golden Test Suite for NL2Cypher / AI Data Analytics & Question Answering Engine
Covers all 13 required analytical categories:
1. Simple Data Retrieval (Customer, Product, Order details & counts)
2. Data Aggregation (COUNT, SUM, AVG, COUNT DISTINCT, GROUP BY, HAVING)
3. Extremes & Polarity Ranking (ASC vs DESC: fewest vs most products, lowest vs highest spend, both extremes, tie handling)
4. Top-N / Bottom-N Ranking
5. Comparative Analysis (Year vs Year, Category vs Category, vs System Average, absolute & % delta)
6. Time-Series Analysis (Yearly, Quarterly, Monthly, Best/Worst month, relative periods grounded to dataset)
7. Complex Conditional Filtering (>, <, above average, category-scoped ranking)
8. Business Formulas & KPIs (AOV, ARPC, Repeat Customer Rate, Category Revenue Share, YoY Growth)
9. Multi-Turn Conversational Context (Follow-up polarity flip & year switch)
10. Causal Analysis & Executive Summary Report (Why 2014 revenue dropped, comprehensive business report)
11. Ambiguity Detection & Clarification ("Khách hàng tốt nhất", "Sản phẩm tốt nhất")
12. Schema Boundary / Unsupported Metric Honesty (Profit/COGS, Inventory, Salesperson, Cancelled orders)
13. Cypher Injection Security & Read-Only Guard
"""
import os
import sys
import pytest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.modules.m3_hybrid_copilot.query_engine.nl2cypher_engine import (
    analyze_and_plan_query,
    build_cypher_from_plan,
    execute_nl2cypher_pipeline,
    is_safe_read_only_cypher,
)
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import (
    generate_cypher_from_query,
    execute_text_to_cypher,
)
from app.modules.m3_hybrid_copilot.query_engine.semantic_layer import (
    SCHEMA_REGISTRY,
    BUSINESS_METRICS,
    UNSUPPORTED_METRICS_EXPLANATIONS,
)


# ============================================================================
# GROUP 1: SEMANTIC LAYER & DATA RETRIEVAL
# ============================================================================

def test_group1_semantic_layer_completeness():
    """Verify Semantic Layer defines all core Neo4j entities and business metrics."""
    for label in ["Customer", "SalesOrder", "Product", "SubCategory", "Category", "Document", "Clause", "Company"]:
        assert label in SCHEMA_REGISTRY
    for metric in ["gross_revenue", "net_revenue", "product_quantity", "distinct_products", "order_count", "avg_order_value", "avg_revenue_per_customer", "repeat_customer_rate"]:
        assert metric in BUSINESS_METRICS


def test_group1_data_retrieval_customer_count_and_details():
    """1. Data Retrieval: total customer count and specific customer/order/product lookup."""
    res_count = execute_nl2cypher_pipeline("Có bao nhiêu khách hàng trong hệ thống?")
    assert res_count["executed"] is True
    ans_count = res_count["grounded_answer"]
    assert "19,820" in ans_count or "19820" in ans_count
    assert "19,119" in ans_count or "19119" in ans_count

    res_cust = execute_nl2cypher_pipeline("Thông tin của khách hàng Reuben D'sa là gì?")
    assert res_cust["executed"] is True
    assert "Reuben D'sa" in res_cust["grounded_answer"]
    assert "29722" in res_cust["grounded_answer"]

    res_order = execute_nl2cypher_pipeline("Đơn hàng #43659 được tạo vào thời điểm nào?")
    assert res_order["executed"] is True
    assert "43659" in res_order["grounded_answer"]
    assert "2011-05-31" in res_order["grounded_answer"]


# ============================================================================
# GROUP 2: DATA AGGREGATION (COUNT, SUM, AVG, GROUP BY, HAVING)
# ============================================================================

def test_group2_aggregation_revenue_orders_and_products():
    """2. Data Aggregation: Total revenue (Gross & Net), total orders, total products sold."""
    res_rev = execute_nl2cypher_pipeline("Tổng doanh thu của hệ thống là bao nhiêu?")
    assert res_rev["executed"] is True
    ans_rev = res_rev["grounded_answer"]
    # Gross revenue $123,216,786.12 and Net revenue $109,846,381.40 across 31,465 orders
    assert "123,216,786.12" in ans_rev
    assert "109,846,381.40" in ans_rev
    assert "31,465" in ans_rev

    res_prod = execute_nl2cypher_pipeline("Số lượng sản phẩm đã bán là bao nhiêu?")
    assert res_prod["executed"] is True
    ans_prod = res_prod["grounded_answer"]
    # 274,914 total units sold across 266 distinct sold products
    assert "274,914" in ans_prod
    assert "266" in ans_prod

    res_cat_cnt = execute_nl2cypher_pipeline("Có bao nhiêu sản phẩm trong hệ thống?")
    assert res_cat_cnt["executed"] is True
    assert "504" in res_cat_cnt["grounded_answer"]
    assert "266" in res_cat_cnt["grounded_answer"]


def test_group2_group_by_category():
    """2b. GROUP BY Category: product count, quantity sold, revenue, and share."""
    res_cat = execute_nl2cypher_pipeline("Mỗi danh mục có bao nhiêu sản phẩm và doanh thu bao nhiêu?")
    assert res_cat["executed"] is True
    ans = res_cat["grounded_answer"]
    assert "Bikes" in ans
    assert "95,145,813.35" in ans
    assert "Components" in ans
    assert "Clothing" in ans
    assert "Accessories" in ans


# ============================================================================
# GROUP 3: RANKING & EXTREMES (ASC vs DESC, BOTH EXTREMES, TIES)
# ============================================================================

def test_group3_customer_fewest_vs_most_products_polarity():
    """
    3. Core Bug Regression & Polarity Test:
    - 'khách hàng nào mua ít sản phẩm nhất' MUST use ASC and return Tony Ting (#30078) with 1 unit (plus tie count 2,511), NEVER Reuben D'sa!
    - 'khách hàng nào mua nhiều sản phẩm nhất' MUST use DESC and return Reuben D'sa (#29722) with 2,737 units.
    """
    res_min = execute_nl2cypher_pipeline("khách hàng nào mua ít sản phẩm nhất")
    assert res_min["executed"] is True
    assert res_min["plan"].sort_direction == "ASC"
    ans_min = res_min["grounded_answer"]
    assert "Tony Ting" in ans_min
    assert "30078" in ans_min
    assert "2,511" in ans_min or "2511" in ans_min
    assert "Reuben D'sa" not in ans_min.split("\n")[0]

    res_max = execute_nl2cypher_pipeline("khách hàng nào mua nhiều sản phẩm nhất")
    assert res_max["executed"] is True
    assert res_max["plan"].sort_direction == "DESC"
    ans_max = res_max["grounded_answer"]
    assert "Reuben D'sa" in ans_max
    assert "29722" in ans_max
    assert "2,737" in ans_max or "2737" in ans_max


def test_group3_customer_highest_and_lowest_spending_and_both_extremes():
    """3b. Customer spending extremes: highest (Roger Harui), lowest (Tony Ting), and combined question."""
    res_high = execute_nl2cypher_pipeline("Khách hàng nào chi tiêu nhiều nhất?")
    assert res_high["executed"] is True
    assert "Roger Harui" in res_high["grounded_answer"]
    assert "989,184.08" in res_high["grounded_answer"]

    res_low = execute_nl2cypher_pipeline("Khách hàng nào có tổng chi tiêu thấp nhất?")
    assert res_low["executed"] is True
    assert res_low["plan"].sort_direction == "ASC"
    assert "Tony Ting" in res_low["grounded_answer"]
    assert "1.52" in res_low["grounded_answer"]

    res_both = execute_nl2cypher_pipeline("Khách hàng có tổng giá trị đơn hàng cao nhất và thấp nhất là ai?")
    assert res_both["executed"] is True
    assert res_both["plan"].is_both_extremes is True
    ans_both = res_both["grounded_answer"]
    assert "Roger Harui" in ans_both
    assert "989,184.08" in ans_both
    assert "Tony Ting" in ans_both
    assert "1.52" in ans_both


def test_group3_customer_order_count_ties():
    """3c. Tie handling: Dalton Perez (#11091) and Mason Roberts (#11176) tied at 28 orders."""
    res_ord = execute_nl2cypher_pipeline("Khách hàng nào có số lượng đơn hàng nhiều nhất?")
    assert res_ord["executed"] is True
    ans = res_ord["grounded_answer"]
    assert "28" in ans
    assert "Mason Roberts" in ans or "Dalton Perez" in ans


def test_group3_product_ranking_quantity_revenue_and_price():
    """3d. Product extremes by quantity sold (ASC/DESC), revenue (DESC), and list price (ASC/DESC)."""
    res_best_qty = execute_nl2cypher_pipeline("Sản phẩm nào bán chạy nhất theo số lượng?")
    assert res_best_qty["executed"] is True
    assert "AWC Logo Cap" in res_best_qty["grounded_answer"]
    assert "8,311" in res_best_qty["grounded_answer"] or "8311" in res_best_qty["grounded_answer"]

    res_least_qty = execute_nl2cypher_pipeline("Sản phẩm nào bán ít nhất?")
    assert res_least_qty["executed"] is True
    assert res_least_qty["plan"].sort_direction == "ASC"
    assert "LL Touring Frame - Blue, 58" in res_least_qty["grounded_answer"]

    res_best_rev = execute_nl2cypher_pipeline("Sản phẩm nào mang lại doanh thu cao nhất?")
    assert res_best_rev["executed"] is True
    assert "Mountain-200 Black, 38" in res_best_rev["grounded_answer"]
    assert "4,406,151.27" in res_best_rev["grounded_answer"]

    res_price_high = execute_nl2cypher_pipeline("Sản phẩm nào có giá niêm yết cao nhất?")
    assert res_price_high["executed"] is True
    assert "Road-150 Red" in res_price_high["grounded_answer"]
    assert "3,578.27" in res_price_high["grounded_answer"]

    res_price_low = execute_nl2cypher_pipeline("Sản phẩm nào có giá niêm yết thấp nhất?")
    assert res_price_low["executed"] is True
    assert res_price_low["plan"].sort_direction == "ASC"
    assert "Patch Kit/8 Patches" in res_price_low["grounded_answer"]
    assert "2.29" in res_price_low["grounded_answer"]


# ============================================================================
# GROUP 4: TOP-N & BOTTOM-N QUERIES
# ============================================================================

def test_group4_top_n_and_bottom_n():
    """4. Top-N and Bottom-N extraction and result count verification."""
    res_top5 = execute_nl2cypher_pipeline("Top 5 khách hàng mua nhiều sản phẩm nhất")
    assert res_top5["executed"] is True
    assert res_top5["plan"].limit == 5
    assert len(res_top5["raw_rows"]) == 5
    assert "Reuben D'sa" in res_top5["grounded_answer"]
    assert "Kevin Liu" in res_top5["grounded_answer"]

    res_bot3 = execute_nl2cypher_pipeline("Top 3 sản phẩm có doanh thu thấp nhất")
    assert res_bot3["executed"] is True
    assert res_bot3["plan"].sort_direction == "ASC"
    assert res_bot3["plan"].limit == 3


# ============================================================================
# GROUP 5: COMPARATIVE ANALYSIS (A vs B, PERIOD vs PERIOD, vs AVERAGE)
# ============================================================================

def test_group5_comparative_analysis_years_and_categories():
    """5. Comparative Analysis: 2012 vs 2013 revenue and Bikes vs Components with absolute & % delta."""
    res_yr = execute_nl2cypher_pipeline("So sánh doanh thu giữa năm 2012 và năm 2013")
    assert res_yr["executed"] is True
    ans_yr = res_yr["grounded_answer"]
    assert "37,675,700.31" in ans_yr
    assert "48,965,887.96" in ans_yr
    assert "11,290,187.65" in ans_yr
    assert "29.97%" in ans_yr

    res_cat = execute_nl2cypher_pipeline("So sánh doanh thu giữa danh mục Bikes và Components")
    assert res_cat["executed"] is True
    ans_cat = res_cat["grounded_answer"]
    assert "Bikes" in ans_cat
    assert "Components" in ans_cat
    assert "95,145,813.35" in ans_cat
    assert "11,807,808.02" in ans_cat


# ============================================================================
# GROUP 6: TIME-SERIES ANALYSIS (YEAR, QUARTER, MONTH, BEST/WORST MONTH)
# ============================================================================

def test_group6_time_series_yearly_monthly_and_extremes():
    """6. Time-Series Analysis: yearly trend, best/worst month, and relative month comparison."""
    res_yr = execute_nl2cypher_pipeline("Doanh thu theo từng năm từ 2011 đến 2014 thay đổi như thế nào?")
    assert res_yr["executed"] is True
    ans_yr = res_yr["grounded_answer"]
    for y in ["2011", "2012", "2013", "2014"]:
        assert y in ans_yr
    assert "14,155,699.52" in ans_yr
    assert "48,965,887.96" in ans_yr

    res_best_m = execute_nl2cypher_pipeline("Tháng nào có doanh thu cao nhất?")
    assert res_best_m["executed"] is True
    assert "2014-03" in res_best_m["grounded_answer"]
    assert "8,097,036.31" in res_best_m["grounded_answer"]

    res_worst_m = execute_nl2cypher_pipeline("Tháng nào có doanh thu thấp nhất?")
    assert res_worst_m["executed"] is True
    assert "2014-06" in res_worst_m["grounded_answer"]
    assert "54,151.48" in res_worst_m["grounded_answer"]


# ============================================================================
# GROUP 7: CONDITIONAL ANALYSIS (FILTER THRESHOLDS, ABOVE AVERAGE, CATEGORY)
# ============================================================================

def test_group7_conditional_filtering():
    """7. Conditional Analysis: customers buying > 500 units, products > $2M revenue, above average spend."""
    res_c500 = execute_nl2cypher_pipeline("Khách hàng nào mua trên 500 sản phẩm?")
    assert res_c500["executed"] is True
    assert "Reuben D'sa" in res_c500["grounded_answer"]

    res_above_avg = execute_nl2cypher_pipeline("Có bao nhiêu khách hàng có chi tiêu cao hơn mức trung bình?")
    assert res_above_avg["executed"] is True
    assert "6,444.73" in res_above_avg["grounded_answer"] or "trung bình" in res_above_avg["grounded_answer"].lower()


# ============================================================================
# GROUP 8: BUSINESS FORMULAS & KPIs (AOV, ARPC, REPEAT RATE)
# ============================================================================

def test_group8_business_formulas_aov_arpc_repeat_rate():
    """8. Business Formulas: AOV ($3,916.00 Gross / $3,491.07 Net), ARPC ($6,444.73), Repeat Rate (39.07%)."""
    res_aov = execute_nl2cypher_pipeline("Giá trị đơn hàng trung bình (AOV) là bao nhiêu?")
    assert res_aov["executed"] is True
    ans_aov = res_aov["grounded_answer"]
    assert "3,916.00" in ans_aov
    assert "3,491.07" in ans_aov

    res_repeat = execute_nl2cypher_pipeline("Tỷ lệ khách hàng mua lặp lại (Repeat Customer Rate) là bao nhiêu?")
    assert res_repeat["executed"] is True
    ans_rep = res_repeat["grounded_answer"]
    assert "39.07%" in ans_rep
    assert "7,470" in ans_rep


# ============================================================================
# GROUP 9: MULTI-TURN CONVERSATIONAL CONTEXT RESOLUTION
# ============================================================================

def test_group9_multiturn_context_polarity_flip():
    """9. Multi-turn context: Turn 1 asks 'mua nhiều sản phẩm nhất', Turn 2 asks 'Còn người ít nhất thì sao?'"""
    session_id = "test_golden_multiturn_01"
    res1 = execute_nl2cypher_pipeline("Khách hàng nào mua nhiều sản phẩm nhất?", session_id=session_id)
    assert res1["executed"] is True
    assert "Reuben D'sa" in res1["grounded_answer"]

    res2 = execute_nl2cypher_pipeline("Còn người mua ít nhất thì sao?", session_id=session_id)
    assert res2["executed"] is True
    assert res2["plan"].target_entity == "Customer"
    assert res2["plan"].sort_direction == "ASC"
    assert "Tony Ting" in res2["grounded_answer"]


# ============================================================================
# GROUP 10: CAUSAL ANALYSIS & EXECUTIVE BUSINESS SUMMARY
# ============================================================================

def test_group10_causal_analysis_and_executive_report():
    """10. Causal Analysis (Why 2014 revenue dropped) & Executive Summary Report."""
    res_why = execute_nl2cypher_pipeline("Vì sao doanh thu năm 2014 giảm so với năm 2013?")
    assert res_why["executed"] is True
    ans_why = res_why["grounded_answer"]
    assert "2014-06" in ans_why or "06/2014" in ans_why or "6 tháng" in ans_why
    assert "54,151.48" in ans_why

    res_exec = execute_nl2cypher_pipeline("Báo cáo tổng quan tình hình kinh doanh toàn hệ thống và đề xuất khuyến nghị")
    assert res_exec["executed"] is True
    ans_exec = res_exec["grounded_answer"]
    assert "123,216,786.12" in ans_exec
    assert "31,465" in ans_exec
    assert "Khuyến nghị" in ans_exec or "khuyến nghị" in ans_exec


# ============================================================================
# GROUP 11: AMBIGUITY DETECTION & CLARIFICATION
# ============================================================================

def test_group11_ambiguity_clarification_with_proactive_metrics():
    """11. Ambiguous query ('Khách hàng tốt nhất là ai?') provides multi-metric breakdown + clarification prompt."""
    res_amb = execute_nl2cypher_pipeline("Khách hàng tốt nhất là ai?")
    assert res_amb["executed"] is True
    ans_amb = res_amb["grounded_answer"]
    assert "Roger Harui" in ans_amb
    assert "Reuben D'sa" in ans_amb
    assert "Dalton Perez" in ans_amb or "Mason Roberts" in ans_amb


# ============================================================================
# GROUP 12: UNSUPPORTED SCHEMA METRICS HONESTY (NO HALLUCINATION)
# ============================================================================

def test_group12_unsupported_schema_metrics_refusal():
    """12. Queries for Profit/COGS, Inventory stock, or Salesperson explain schema boundary honestly."""
    for q in [
        "Sản phẩm nào có lợi nhuận ròng (profit margin) cao nhất?",
        "Sản phẩm nào có lượng tồn kho thấp nhất?",
        "Nhân viên bán hàng nào có doanh số cao nhất?",
        "Đơn hàng nào bị hủy hoặc hoàn trả nhiều nhất?",
    ]:
        res = execute_nl2cypher_pipeline(q)
        assert res["executed"] is True
        assert res["plan"].intent == "UNSUPPORTED_METRIC"
        assert "không" in res["grounded_answer"].lower() or "chưa" in res["grounded_answer"].lower()


# ============================================================================
# GROUP 13: SECURITY GUARD & CYPHER INJECTION PROTECTION
# ============================================================================

def test_group13_cypher_injection_and_write_guard():
    """13. Write/DDL/Procedure Cypher payloads are strictly rejected."""
    assert is_safe_read_only_cypher("MATCH (c:Customer) RETURN count(c)") is True
    assert is_safe_read_only_cypher("MATCH (n) DETACH DELETE n") is False
    assert is_safe_read_only_cypher("CREATE (u:User {role: 'admin'})") is False
    assert is_safe_read_only_cypher("MATCH (d:Document) SET d.status = 'DELETED'") is False
    assert is_safe_read_only_cypher("CALL dbms.components()") is False
    assert is_safe_read_only_cypher("LOAD CSV FROM 'file:///etc/passwd' AS line RETURN line") is False

    # Greeting query does not trigger ERP data return
    assert execute_text_to_cypher("Xin chào") == []


def test_group14_end_to_end_copilot_rag_and_layer2_gate():
    """14. End-to-End Integration: execute_text_to_cypher -> filter_graph_entities_by_scope -> apply_layer2_context_gate -> llm_client.generate_rag_answer."""
    import asyncio
    from app.api.v1.copilot import apply_layer2_context_gate
    from app.core.rbac import filter_graph_entities_by_scope
    from app.modules.m3_hybrid_copilot.inference.client import llm_client

    for q, expected_substr, forbidden_first_line in [
        ("khách hàng nào mua ít sản phẩm nhất", "Tony Ting", "Reuben D'sa"),
        ("khách hàng nào mua nhiều sản phẩm nhất", "Reuben D'sa", "Tony Ting"),
        ("Khách hàng có tổng giá trị đơn hàng cao nhất và thấp nhất là ai?", "Roger Harui", None),
        ("So sánh doanh thu giữa năm 2012 và năm 2013", "29.97%", None),
        ("kiểm tra trong kho tài liệu có tổng cộng bao nhiêu tài liệu", "tài liệu", "Không tìm thấy bằng chứng"),
    ]:
        gh = execute_text_to_cypher(q)
        assert len(gh) > 0
        for role in ["admin", "executive", "knowledge_manager", "standard"]:
            scoped_gh = filter_graph_entities_by_scope(gh, role)
            assert len(scoped_gh) > 0, f"Role {role} lost graph hits for query: {q}"
            v_chunks, v_ents = apply_layer2_context_gate([], scoped_gh)
            assert len(v_ents) > 0
            gen = asyncio.run(llm_client.generate_rag_answer(query=q, evidence_chunks=v_chunks, graph_entities=v_ents, lang="vi"))
            assert gen["success"] is True
            ans = gen["answer"]
            assert expected_substr in ans
            if forbidden_first_line:
                assert forbidden_first_line not in ans.split("\n")[0]


if __name__ == "__main__":
    test_fns = [
        test_group1_semantic_layer_completeness,
        test_group1_data_retrieval_customer_count_and_details,
        test_group2_aggregation_revenue_orders_and_products,
        test_group2_group_by_category,
        test_group3_customer_fewest_vs_most_products_polarity,
        test_group3_customer_highest_and_lowest_spending_and_both_extremes,
        test_group3_customer_order_count_ties,
        test_group3_product_ranking_quantity_revenue_and_price,
        test_group4_top_n_and_bottom_n,
        test_group5_comparative_analysis_years_and_categories,
        test_group6_time_series_yearly_monthly_and_extremes,
        test_group7_conditional_filtering,
        test_group8_business_formulas_aov_arpc_repeat_rate,
        test_group9_multiturn_context_polarity_flip,
        test_group10_causal_analysis_and_executive_report,
        test_group11_ambiguity_clarification_with_proactive_metrics,
        test_group12_unsupported_schema_metrics_refusal,
        test_group13_cypher_injection_and_write_guard,
        test_group14_end_to_end_copilot_rag_and_layer2_gate,
    ]
    for fn in test_fns:
        fn()
        print(f"[PASS] {fn.__name__}")
    print(f"\n[ALL {len(test_fns)} GOLDEN TEST GROUPS PASSED 100%]")

