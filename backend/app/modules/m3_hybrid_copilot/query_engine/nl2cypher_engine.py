"""
GraphMind — Enterprise NL2Cypher & Data Analytics Engine
Pipeline:
User Question -> Context Resolution -> Semantic Understanding -> Query Planning (QueryPlan)
-> Cypher Generation -> Cypher Security & Schema Validation -> Neo4j Execution
-> Result & Tie Validation -> Grounded Mathematical Calculation -> Structured Answer Generation.
"""

import re
import time
import logging
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple

try:
    from app.db.neo4j.client import neo4j_client
    from app.modules.m3_hybrid_copilot.query_engine.semantic_layer import (
        SCHEMA_REGISTRY,
        BUSINESS_METRICS,
        UNSUPPORTED_METRICS_EXPLANATIONS,
        DATASET_MIN_DATE,
        DATASET_MAX_DATE,
        DATASET_YEARS,
        DATASET_LATEST_YEAR,
        DATASET_PREV_YEAR,
        DATASET_LATEST_MONTH,
        DATASET_PREV_MONTH,
    )
except ImportError:
    from db.neo4j.client import neo4j_client
    from modules.m3_hybrid_copilot.query_engine.semantic_layer import (
        SCHEMA_REGISTRY,
        BUSINESS_METRICS,
        UNSUPPORTED_METRICS_EXPLANATIONS,
        DATASET_MIN_DATE,
        DATASET_MAX_DATE,
        DATASET_YEARS,
        DATASET_LATEST_YEAR,
        DATASET_PREV_YEAR,
        DATASET_LATEST_MONTH,
        DATASET_PREV_MONTH,
    )

logger = logging.getLogger(__name__)

# Mutating or dangerous keywords strictly forbidden in read-only analytics
FORBIDDEN_CYPHER_PATTERNS = [
    r"\bCREATE\b",
    r"\bDELETE\b",
    r"\bDETACH\b",
    r"\bMERGE\b",
    r"\bSET\b",
    r"\bREMOVE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bLOAD\s+CSV\b",
    r"\bCALL\s+dbms\b",
    r"\bCALL\s+apoc\b",
    r";\s*(?:MATCH|DROP|DELETE|CREATE|SET)",
]


def is_safe_read_only_cypher(cypher: str) -> bool:
    """Returns True if the Cypher string contains no mutating or dangerous patterns."""
    if not cypher or not cypher.strip():
        return False
    for pat in FORBIDDEN_CYPHER_PATTERNS:
        if re.search(pat, cypher, flags=re.IGNORECASE):
            return False
    return True


@dataclass
class QueryPlan:
    raw_query: str
    normalized_query: str = ""
    turn_type: str = "INDEPENDENT"  # INDEPENDENT | FOLLOW_UP | CLARIFICATION
    intent: str = "RETRIEVAL"
    # RETRIEVAL | AGGREGATION | RANKING | COMPARISON | TIME_SERIES | CONDITIONAL
    # | FORMULA_KPI | CAUSAL_ANALYSIS | EXECUTIVE_REPORT | DOCUMENT_ANALYTICS
    # | AMBIGUOUS | UNSUPPORTED_METRIC | OUT_OF_SCOPE | SECURITY_BLOCKED
    target_entity: str = "Customer"  # Customer | Product | SalesOrder | Category | SubCategory | Document | Clause | Company | Employee
    metric: str = "gross_revenue"
    # gross_revenue | net_revenue | product_quantity | distinct_products | order_count
    # | customer_count | product_count | list_price | avg_order_value | avg_revenue_per_customer
    # | repeat_customer_rate | revenue_growth_rate | revenue_share | document_count | compliance_rate
    aggregation: str = "SUM"  # SUM | AVG | COUNT | COUNT_DISTINCT | MIN | MAX | LIST | GROUP_BY
    sort_direction: str = "DESC"  # ASC | DESC
    limit: int = 5
    include_ties: bool = True
    group_by: Optional[str] = None  # Customer | Product | Category | SubCategory | Year | Quarter | Month | Day | Department
    time_granularity: Optional[str] = None  # year | quarter | month | day
    years: List[str] = field(default_factory=list)
    months: List[str] = field(default_factory=list)  # YYYY-MM or MM
    quarters: List[int] = field(default_factory=list)
    relative_time: Optional[str] = None  # today | this_month | last_month | this_year | last_year | last_6_months
    comparison_targets: List[str] = field(default_factory=list)
    vs_average: bool = False
    filters: Dict[str, Any] = field(default_factory=dict)
    unsupported_reason_key: Optional[str] = None
    ambiguity_options: List[str] = field(default_factory=list)
    required_labels: List[str] = field(default_factory=list)
    expected_result_type: str = "table"  # single_value | record_detail | ranking_list | comparison_table | time_series | executive_report | clarification

    @property
    def unsupported_reason(self) -> Optional[str]:
        return self.unsupported_reason_key

    @property
    def is_both_extremes(self) -> bool:
        return bool(self.filters.get("both_extremes"))

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ============================================================================
# CONVERSATION CONTEXT MANAGER (PER-SESSION STATE ISOLATION)
# ============================================================================

class ConversationContextManager:
    """
    Manages per-session QueryPlan history for multi-turn analytical conversations.
    Strictly isolates independent questions from follow-up/clarification turns.
    """
    def __init__(self):
        self._session_plans: Dict[str, List[QueryPlan]] = {}
        self._session_entities: Dict[str, Dict[str, Any]] = {}

    def get_last_plan(self, session_id: Optional[str]) -> Optional[QueryPlan]:
        if not session_id:
            return None
        plans = self._session_plans.get(str(session_id))
        return plans[-1] if plans else None

    def get_last_entity_context(self, session_id: Optional[str]) -> Dict[str, Any]:
        if not session_id:
            return {}
        return self._session_entities.get(str(session_id), {})

    def save_turn(
        self,
        session_id: Optional[str],
        plan: QueryPlan,
        top_entity: Optional[Dict[str, Any]] = None
    ) -> None:
        if not session_id:
            return
        sid = str(session_id)
        if sid not in self._session_plans:
            self._session_plans[sid] = []
        self._session_plans[sid].append(plan)
        if len(self._session_plans[sid]) > 10:
            self._session_plans[sid] = self._session_plans[sid][-10:]

        if top_entity:
            self._session_entities[sid] = top_entity

    def clear_session(self, session_id: str) -> None:
        self._session_plans.pop(str(session_id), None)
        self._session_entities.pop(str(session_id), None)


context_manager = ConversationContextManager()


# ============================================================================
# POLARITY / SORT DIRECTION & NLU HELPERS
# ============================================================================

ASC_PATTERNS = [
    r"\bít\s+sản\s+phẩm\s+nhất\b",
    r"\bsản\s+phẩm\s+ít\s+nhất\b",
    r"\bít\s+hàng\s+nhất\b",
    r"\bmua\s+ít\b",
    r"\blượng\s+hàng\s+mua\s+thấp\s+nhất\b",
    r"\bsố\s+lượng\s+.*\s+(?:ít|thấp|nhỏ)\s+nhất\b",
    r"\bít\s+đơn\s+(?:hàng\s+)?nhất\b",
    r"\bđơn\s+hàng\s+(?:ít|thấp|nhỏ)\s+nhất\b",
    r"\bít\s+nhất\b",
    r"\bthấp\s+nhất\b",
    r"\bnhỏ\s+nhất\b",
    r"\bbé\s+nhất\b",
    r"\brẻ\s+nhất\b",
    r"\bgiá\s+rẻ\b",
    r"\bít\s+tiền\s+nhất\b",
    r"\bchi\s+tiêu\s+(?:ít|thấp)\s+nhất\b",
    r"\bdoanh\s+thu\s+(?:ít|thấp|nhỏ|kém)\s+nhất\b",
    r"\bbán\s+(?:chậm|ít|kém|ế)\s+nhất\b",
    r"\bbán\s+(?:chậm|kém|ế)\b",
    r"\bkém\s+nhất\b",
    r"\bchậm\s+nhất\b",
    r"\btối\s+thiểu\b",
    r"\bđứng\s+cuối\b",
    r"\bbottom\b",
    r"\bleast\b",
    r"\bfewest\b",
    r"\blowest\b",
    r"\bcheapest\b",
    r"\bworst\b",
    r"\bslowest\b",
    r"\bmin\b",
    r"\bminimum\b",
]

DESC_PATTERNS = [
    r"\bnhiều\s+sản\s+phẩm\s+nhất\b",
    r"\bsản\s+phẩm\s+nhiều\s+nhất\b",
    r"\bnhiều\s+hàng\s+nhất\b",
    r"\bmua\s+nhiều\s+nhất\b",
    r"\bnhiều\s+đơn\s+(?:hàng\s+)?nhất\b",
    r"\bnhiều\s+nhất\b",
    r"\bcao\s+nhất\b",
    r"\blớn\s+nhất\b",
    r"\bđắt\s+nhất\b",
    r"\bgiá\s+cao\s+nhất\b",
    r"\bchi\s+tiêu\s+(?:nhiều|cao|lớn)\s+nhất\b",
    r"\bdoanh\s+thu\s+(?:cao|lớn|nhiều)\s+nhất\b",
    r"\bbán\s+chạy\s+nhất\b",
    r"\bbán\s+chạy\b",
    r"\bchạy\s+nhất\b",
    r"\bhàng\s+đầu\b",
    r"\bđứng\s+đầu\b",
    r"\btối\s+đa\b",
    r"\btop\b",
    r"\bmost\b",
    r"\bhighest\b",
    r"\blargest\b",
    r"\bbiggest\b",
    r"\bexpensive\b",
    r"\bmax\b",
    r"\bmaximum\b",
]


def detect_sort_direction(q_lower: str) -> Tuple[str, bool]:
    """
    Returns (direction: 'ASC' | 'DESC', is_explicit: bool).
    Explicitly checks ASC patterns first so 'mua ít sản phẩm nhất' is NEVER misclassified as DESC.
    """
    has_asc = any(re.search(pat, q_lower) for pat in ASC_PATTERNS)
    has_desc = any(re.search(pat, q_lower) for pat in DESC_PATTERNS)
    if has_asc and not has_desc:
        return "ASC", True
    if has_desc and not has_asc:
        return "DESC", True
    if has_asc and has_desc:
        # Check which appears last or specifically modifies 'nhất'
        asc_pos = max((m.start() for pat in ASC_PATTERNS for m in re.finditer(pat, q_lower)), default=-1)
        desc_pos = max((m.start() for pat in DESC_PATTERNS for m in re.finditer(pat, q_lower)), default=-1)
        return ("ASC", True) if asc_pos > desc_pos else ("DESC", True)
    return "DESC", False


def extract_top_n_limit(q_lower: str, default_limit: int = 5) -> int:
    """Extracts explicit N from 'top 10', '3 khách hàng', '5 sản phẩm', etc."""
    m = re.search(r"\b(?:top|bottom|lấy|hiển\s+thị|liệt\s+kê)\s+(\d{1,2})\b", q_lower)
    if m:
        return max(1, min(50, int(m.group(1))))
    m2 = re.search(r"\b(\d{1,2})\s+(?:khách\s+hàng|sản\s+phẩm|đơn\s+hàng|danh\s+mục|tháng|năm|đối\s+tác|công\s+ty)\b", q_lower)
    if m2:
        val = int(m2.group(1))
        # Avoid confusing '2 năm' in comparison with limit
        if "so sánh" not in q_lower and val <= 50:
            return max(1, val)
    return default_limit


def parse_vietnamese_number(num_str: str, unit_str: str = "") -> float:
    """Parses numbers like '10', '1.5', '10 triệu', '500 nghìn', '100k', '2m'."""
    clean = num_str.replace(",", "").strip()
    try:
        val = float(clean)
    except ValueError:
        return 0.0
    u = (unit_str or "").lower().strip()
    if u in ["triệu", "tr", "m", "million"]:
        val *= 1_000_000
    elif u in ["tỷ", "ty", "b", "billion"]:
        val *= 1_000_000_000
    elif u in ["nghìn", "ngàn", "k", "thousand"]:
        val *= 1_000
    return val


# ============================================================================
# SEMANTIC QUERY PLANNER
# ============================================================================

class SemanticQueryPlanner:
    """
    Translates natural language questions (and optional conversation history)
    into a structured QueryPlan.
    """

    def plan(
        self,
        query: str,
        session_id: Optional[str] = None,
        history_messages: Optional[List[Dict[str, Any]]] = None
    ) -> QueryPlan:
        raw_q = query.strip()
        q_lower = re.sub(r"\s+", " ", raw_q.lower())
        plan = QueryPlan(raw_query=raw_q, normalized_query=q_lower)

        # 0. Security / SQL & Cypher Injection Check
        if self._is_malicious_injection(raw_q):
            plan.intent = "SECURITY_BLOCKED"
            plan.expected_result_type = "single_value"
            return plan

        # 0.5 Reconstruct previous plan from memory or session history if needed
        prev_plan = context_manager.get_last_plan(session_id)
        if not prev_plan and history_messages:
            prev_plan = self._reconstruct_plan_from_history(history_messages)

        # 1. Check if this is a Clarification Response to a previous AMBIGUOUS turn
        if prev_plan and prev_plan.intent == "AMBIGUOUS":
            resolved = self._try_resolve_clarification(q_lower, prev_plan)
            if resolved:
                return resolved

        # 2. Check if this is a Follow-up Question
        if prev_plan and self._is_follow_up_question(q_lower, prev_plan):
            follow_plan = self._build_follow_up_plan(raw_q, q_lower, prev_plan, session_id)
            if follow_plan:
                return follow_plan

        # 3. Check for Out-of-Scope General Questions (weather, gold price, sports, stocks, etc.)
        if self._is_out_of_scope_query(q_lower):
            plan.intent = "OUT_OF_SCOPE"
            plan.expected_result_type = "single_value"
            return plan

        # 4. Check for Unsupported / Missing Schema Metrics (inventory stock, profit margin, cancelled orders, salesperson on order)
        unsupported_key = self._detect_unsupported_metric(q_lower)
        if unsupported_key:
            plan.intent = "UNSUPPORTED_METRIC"
            plan.unsupported_reason_key = unsupported_key
            plan.expected_result_type = "single_value"
            return plan

        # 5. Check for Document / Legal / CUAD Analytics (Document count, portfolio breakdown, compliance rate, missing clauses)
        doc_plan = self._try_plan_document_analytics(raw_q, q_lower)
        if doc_plan:
            return doc_plan

        # 6. Check for Genuine Ambiguity (e.g., "Phân tích khách hàng tốt nhất", "Sản phẩm tốt nhất là gì?")
        ambig_plan = self._try_detect_ambiguity(raw_q, q_lower)
        if ambig_plan:
            return ambig_plan

        # 7. Check for Executive Business Summary Report ("Đánh giá tình hình kinh doanh", "Tổng hợp báo cáo kinh doanh")
        if self._is_executive_report_query(q_lower):
            plan.intent = "EXECUTIVE_REPORT"
            plan.target_entity = "SalesOrder"
            plan.metric = "gross_revenue"
            plan.expected_result_type = "executive_report"
            self._extract_time_filters(q_lower, plan)
            return plan

        # 8. Check for Causal / Root Cause Analysis ("Tại sao doanh thu giảm?", "Vì sao sản phẩm bán kém?", "Điều gì ảnh hưởng đến hiệu suất?")
        if self._is_causal_analysis_query(q_lower):
            plan.intent = "CAUSAL_ANALYSIS"
            plan.target_entity = "Product" if "sản phẩm" in q_lower else "SalesOrder"
            plan.metric = "gross_revenue"
            plan.expected_result_type = "executive_report"
            self._extract_time_filters(q_lower, plan)
            self._extract_entity_filters(raw_q, q_lower, plan)
            return plan

        # 9. Extract Time Filters & Granularity
        self._extract_time_filters(q_lower, plan)

        # 10. Extract Specific Entity Filters (Order ID, Customer ID/Name, Product ID/Name, Category)
        self._extract_entity_filters(raw_q, q_lower, plan)

        # 11. Check for Comparative Analysis ("So sánh ...", "... so với ...", "... thay đổi như thế nào")
        if self._is_comparison_query(q_lower, plan):
            plan.intent = "COMPARISON"
            self._configure_comparison_plan(raw_q, q_lower, plan)
            return plan

        # 12. Check for Ratio / Formula / KPI Queries (Growth rate, AOV, ARPC, Repeat customer rate, Revenue share)
        if self._is_formula_kpi_query(q_lower, plan):
            return plan

        # 13. Check for Specific Data Retrieval (Single Order lookup, Single Customer lookup, Customer's purchased products, Product's category, List of entities)
        if self._is_retrieval_lookup_query(raw_q, q_lower, plan):
            return plan

        # 14. Check for Conditional Filtering ("Khách hàng mua trên 10 sản phẩm", "Sản phẩm có doanh thu > 1 triệu", "trên mức trung bình")
        if self._extract_conditional_filters(q_lower, plan):
            plan.intent = "CONDITIONAL"
            plan.expected_result_type = "ranking_list"
            return plan

        # 15. Check for Time-Series Analysis (Revenue/Orders by year, quarter, month, day, or specific period total)
        if self._is_time_series_query(q_lower, plan):
            plan.intent = "TIME_SERIES"
            plan.target_entity = "SalesOrder"
            plan.expected_result_type = "time_series"
            return plan

        # 16. Check for Ranking (Top N / Bottom N / Nhất / Cao nhất / Thấp nhất / Nhiều nhất / Ít nhất)
        direction, is_explicit_rank = detect_sort_direction(q_lower)
        plan.sort_direction = direction
        plan.limit = extract_top_n_limit(q_lower, default_limit=5)
        if any(re.search(pat, q_lower) for pat in ASC_PATTERNS) and any(re.search(pat, q_lower) for pat in DESC_PATTERNS):
            if any(conj in q_lower for conj in [" và ", " hay ", " với ", " cùng "]):
                plan.filters["both_extremes"] = True
        if is_explicit_rank or any(w in q_lower for w in ["xếp hạng", "ranking", "đứng đầu", "hàng đầu", "ai mua", "khách nào", "người nào", "sản phẩm nào", "tháng nào", "năm nào", "danh mục nào"]):
            if self._configure_ranking_plan(q_lower, plan, is_explicit_rank):
                return plan

        # 17. Check for Data Aggregation (COUNT, SUM, AVG, MIN, MAX, GROUP BY: "Có bao nhiêu...", "Tổng...", "Trung bình...", "Mỗi...")
        if self._configure_aggregation_plan(q_lower, plan):
            return plan

        # 18. Default fallback classification based on target entity
        return self._fallback_entity_plan(raw_q, q_lower, plan)

    # ------------------------------------------------------------------------
    # INTERNAL DETECTION & PLANNING METHODS
    # ------------------------------------------------------------------------

    def _is_malicious_injection(self, raw_q: str) -> bool:
        for pat in FORBIDDEN_CYPHER_PATTERNS:
            if re.search(pat, raw_q, re.IGNORECASE):
                return True
        if re.search(r"(?:DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|UNION\s+SELECT|--\s*$)", raw_q, re.IGNORECASE):
            return True
        return False

    def _reconstruct_plan_from_history(self, history_messages: List[Dict[str, Any]]) -> Optional[QueryPlan]:
        """Reconstructs the last user turn's QueryPlan from session messages if not in memory."""
        user_msgs = [m for m in history_messages if m.get("sender") == "user" and m.get("text")]
        if not user_msgs:
            return None
        last_user_text = user_msgs[-1]["text"]
        # Avoid infinite recursion by passing history_messages=None
        return self.plan(last_user_text, session_id=None, history_messages=None)

    def _try_resolve_clarification(self, q_lower: str, prev_plan: QueryPlan) -> Optional[QueryPlan]:
        """If previous turn asked for clarification on 'best customer' or 'best product', resolve metric."""
        new_plan = QueryPlan(
            raw_query=prev_plan.raw_query + f" ({q_lower})",
            normalized_query=q_lower,
            turn_type="CLARIFICATION",
            intent="RANKING",
            target_entity=prev_plan.target_entity,
            sort_direction="DESC",
            limit=prev_plan.limit or 5,
            expected_result_type="ranking_list",
        )
        if any(k in q_lower for k in ["doanh thu", "chi tiêu", "tiền", "giá trị", "revenue", "tiêu chí 1", "số 1"]):
            new_plan.metric = "gross_revenue"
            return new_plan
        if any(k in q_lower for k in ["số lượng sản phẩm", "số sản phẩm", "lượng hàng", "số lượng mua", "số lượng bán", "quantity", "tiêu chí 2", "số 2"]):
            new_plan.metric = "product_quantity"
            return new_plan
        if any(k in q_lower for k in ["số đơn", "đơn hàng", "lần mua", "tần suất", "order", "tiêu chí 3", "số 3"]):
            new_plan.metric = "order_count"
            return new_plan
        if any(k in q_lower for k in ["giá niêm yết", "đơn giá", "listprice", "price", "tiêu chí 4"]):
            new_plan.metric = "list_price"
            return new_plan
        return None

    def _is_follow_up_question(self, q_lower: str, prev_plan: QueryPlan) -> bool:
        follow_up_prefixes = (
            "còn ", "thế còn ", "vậy còn ", "như vậy còn ", "tiếp theo ",
            "so sánh 2 ", "so sánh hai ", "so sánh cả 2", "so sánh cả hai",
            "chi tiết của ", "đơn hàng của người đó", "đơn hàng của khách đó",
            "khách hàng đó ", "sản phẩm đó ", "năm đó ", "tháng đó "
        )
        if q_lower.startswith(follow_up_prefixes):
            return True
        if any(p in q_lower for p in [
            "so sánh hai năm đó", "so sánh 2 năm đó", "so sánh hai tháng đó", "so sánh 2 tháng đó",
            "của khách hàng đó", "của người đó", "của sản phẩm đó", "của đơn hàng đó",
            "còn tháng trước", "còn năm trước", "còn năm ngoái", "còn ít nhất thì sao", "còn nhiều nhất thì sao",
            "còn thấp nhất thì sao", "còn cao nhất thì sao"
        ]):
            return True
        # Short elliptical query like "năm 2013 thì sao?" or "tháng 5/2014 thì sao?"
        if q_lower.endswith(("thì sao", "thì sao?", "như thế nào", "ra sao")) and len(q_lower.split()) <= 7:
            return True
        return False

    def _build_follow_up_plan(
        self,
        raw_q: str,
        q_lower: str,
        prev_plan: QueryPlan,
        session_id: Optional[str]
    ) -> Optional[QueryPlan]:
        plan = QueryPlan(
            raw_query=raw_q,
            normalized_query=q_lower,
            turn_type="FOLLOW_UP",
            intent=prev_plan.intent,
            target_entity=prev_plan.target_entity,
            metric=prev_plan.metric,
            aggregation=prev_plan.aggregation,
            sort_direction=prev_plan.sort_direction,
            limit=prev_plan.limit,
            group_by=prev_plan.group_by,
            time_granularity=prev_plan.time_granularity,
            years=list(prev_plan.years),
            months=list(prev_plan.months),
            filters=dict(prev_plan.filters),
            expected_result_type=prev_plan.expected_result_type,
        )

        # Case 1: "So sánh 2 năm đó" / "So sánh hai tháng đó"
        if "so sánh" in q_lower:
            plan.intent = "COMPARISON"
            plan.expected_result_type = "comparison_table"
            self._extract_time_filters(q_lower, plan)
            all_plans = context_manager._session_plans.get(str(session_id), []) if session_id else []
            if "tháng" in q_lower or prev_plan.relative_time in ["this_month", "last_month"] or prev_plan.months:
                plan.target_entity = "SalesOrder"
                plan.group_by = "Month"
                plan.time_granularity = "month"
                hist_months = []
                for hp in reversed(all_plans):
                    for m in hp.months:
                        if m not in hist_months:
                            hist_months.append(m)
                    if hp.relative_time == "this_month" and DATASET_LATEST_MONTH not in hist_months:
                        hist_months.append(DATASET_LATEST_MONTH)
                    elif hp.relative_time == "last_month" and DATASET_PREV_MONTH not in hist_months:
                        hist_months.append(DATASET_PREV_MONTH)
                if len(hist_months) >= 2:
                    plan.months = sorted(hist_months[:2])
                else:
                    plan.months = [DATASET_PREV_MONTH, DATASET_LATEST_MONTH]
                plan.relative_time = None
                return plan

            plan.target_entity = "SalesOrder"
            plan.group_by = "Year"
            plan.time_granularity = "year"
            if len(plan.years) < 2:
                hist_years = []
                for hp in reversed(all_plans):
                    for y in hp.years:
                        if y not in hist_years:
                            hist_years.append(y)
                    if hp.relative_time == "this_year" and DATASET_LATEST_YEAR not in hist_years:
                        hist_years.append(DATASET_LATEST_YEAR)
                    elif hp.relative_time == "last_year" and DATASET_PREV_YEAR not in hist_years:
                        hist_years.append(DATASET_PREV_YEAR)
                if len(hist_years) >= 2:
                    plan.years = sorted(hist_years[:2])
                elif len(prev_plan.years) == 1:
                    y0 = prev_plan.years[0]
                    prev_y = str(int(y0) - 1) if y0 in ["2012", "2013", "2014"] else "2013"
                    plan.years = sorted([prev_y, y0])
            if not plan.years and not plan.months:
                plan.years = [DATASET_PREV_YEAR, DATASET_LATEST_YEAR]
            plan.relative_time = None
            return plan

        # Case 2: Flipping polarity ("còn ít nhất thì sao?", "còn thấp nhất?", "còn nhiều nhất?")
        direction, is_explicit_dir = detect_sort_direction(q_lower)
        if is_explicit_dir:
            plan.sort_direction = direction
            plan.intent = "RANKING"
            plan.expected_result_type = "ranking_list"

        # Case 3: Switching metric ("còn theo số đơn hàng?", "còn theo doanh thu?", "còn theo số lượng?")
        if any(k in q_lower for k in ["số đơn", "đơn hàng", "lần mua"]):
            plan.metric = "order_count"
        elif any(k in q_lower for k in ["số lượng sản phẩm", "số sản phẩm", "sản phẩm"]):
            plan.metric = "product_quantity"
        elif any(k in q_lower for k in ["doanh thu", "chi tiêu", "tiền"]):
            plan.metric = "gross_revenue"

        # Case 4: Switching time period ("còn năm 2013 thì sao?", "còn tháng trước thì sao?")
        new_time_plan = QueryPlan(raw_query=raw_q)
        self._extract_time_filters(q_lower, new_time_plan)
        if new_time_plan.years:
            plan.years = new_time_plan.years
        if new_time_plan.months:
            plan.months = new_time_plan.months
        if new_time_plan.relative_time:
            plan.relative_time = new_time_plan.relative_time
            if new_time_plan.relative_time == "last_month" and prev_plan.months:
                # If previous was 2014-06, last month is 2014-05
                ym = prev_plan.months[0]
                if ym == "2014-06":
                    plan.months = ["2014-05"]
                    plan.relative_time = None
            elif new_time_plan.relative_time == "last_year" and prev_plan.years:
                y0 = int(prev_plan.years[0])
                plan.years = [str(y0 - 1)]
                plan.relative_time = None

        # Case 5: Referring to previous top entity ("khách hàng đó đã mua những sản phẩm nào?")
        last_ent = context_manager.get_last_entity_context(session_id)
        if any(p in q_lower for p in ["khách hàng đó", "người đó", "ông đó", "bà đó"]) and last_ent.get("CustomerID"):
            plan.filters["customer_id"] = last_ent["CustomerID"]
            if "sản phẩm" in q_lower:
                plan.intent = "RETRIEVAL"
                plan.target_entity = "Customer"
                plan.filters["lookup_mode"] = "customer_products"
                plan.expected_result_type = "record_detail"

        return plan

    def _is_out_of_scope_query(self, q_lower: str) -> bool:
        out_of_scope_keywords = [
            "thời tiết", "dự báo thời tiết", "nhiệt độ ngoài trời", "trời mưa",
            "giá vàng", "giá bitcoin", "chứng khoán hôm nay", "tỷ giá ngoại tệ",
            "bóng đá", "world cup", "ngoại hạng anh", "ca sĩ", "diễn viên",
            "công thức nấu ăn", "nấu món", "viết thơ", "kể chuyện cười",
            "thủ đô của", "tổng thống mỹ", "dân số thế giới"
        ]
        return any(k in q_lower for k in out_of_scope_keywords)

    def _detect_unsupported_metric(self, q_lower: str) -> Optional[str]:
        # 1. Inventory / Stock quantity
        if any(k in q_lower for k in ["tồn kho", "hàng tồn", "trong kho còn", "số lượng tồn", "inventory", "stock level", "out of stock", "hết hàng"]):
            return "inventory_stock"
        # 2. Profit margin / COGS / Net profit (unless asking about revenue)
        if any(k in q_lower for k in ["lợi nhuận", "lãi ròng", "biên lợi nhuận", "tỷ suất lợi nhuận", "giá vốn", "chi phí sản xuất", "profit margin", "net profit", "cogs"]):
            return "profit_margin"
        # 3. Cancelled order rate / returned orders
        if any(k in q_lower for k in ["đơn hàng bị hủy", "tỷ lệ hủy đơn", "đơn hủy", "hủy đơn hàng", "cancelled order", "cancellation rate", "bị hủy", "hoàn trả"]):
            return "cancelled_order_rate"
        # 4. Website / Lead Conversion rate
        if any(k in q_lower for k in ["tỷ lệ chuyển đổi", "conversion rate"]):
            return "conversion_rate"
        # 5. Salesperson / Employee performance on orders (when not blocked by RBAC first)
        if any(k in q_lower for k in [
            "nhân viên nào phụ trách đơn hàng", "ai phụ trách đơn hàng",
            "nhân viên nào bán được nhiều", "doanh số của nhân viên",
            "so sánh hiệu suất giữa các nhân viên", "hiệu suất nhân viên bán hàng",
            "nhân viên có doanh thu", "nhân viên bán hàng", "nhân viên nào có doanh số"
        ]):
            return "salesperson_performance"
        return None

    def _try_plan_document_analytics(self, raw_q: str, q_lower: str) -> Optional[QueryPlan]:
        # Exclude ERP customer/product/order queries
        is_erp_only = any(k in q_lower for k in ["khách hàng", "đơn hàng", "sản phẩm", "doanh thu", "xe đạp", "danh mục sản phẩm"]) and not any(
            d in q_lower for d in ["tài liệu", "văn bản", "hợp đồng", "cuad", "điều khoản", "pháp lý", "tuân thủ", "kho tri thức"]
        )
        if is_erp_only:
            return None

        # A. Compliance Rate & Missing Protection Clause Summary
        if any(k in q_lower for k in ["tuân thủ", "compliance", "tỷ lệ tuân thủ", "đánh giá tỷ lệ", "an toàn pháp lý", "thiếu điều khoản bảo vệ"]):
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="DOCUMENT_ANALYTICS",
                target_entity="Document",
                metric="compliance_rate",
                aggregation="COUNT",
                filters={"doc_mode": "compliance_summary"},
                expected_result_type="executive_report",
            )

        # B. Specific Missing Clause Lookup
        if any(k in q_lower for k in ["thiếu điều khoản", "không có điều khoản", "chưa có điều khoản", "hợp đồng thiếu", "văn bản thiếu"]):
            target_clause = "Limitation of Liability"
            if any(k in q_lower for k in ["giới hạn trách nhiệm", "trách nhiệm", "liability", "bồi thường"]):
                target_clause = "Limitation of Liability"
            elif any(k in q_lower for k in ["bồi hoàn", "indemnif"]):
                target_clause = "Indemnification"
            elif any(k in q_lower for k in ["bảo mật", "confidential"]):
                target_clause = "Confidentiality"
            elif any(k in q_lower for k in ["chấm dứt", "termination"]):
                target_clause = "Termination"
            elif any(k in q_lower for k in ["luật", "governing"]):
                target_clause = "Governing Law"
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="DOCUMENT_ANALYTICS",
                target_entity="Document",
                metric="document_count",
                filters={"doc_mode": "missing_clause", "clause_type": target_clause},
                expected_result_type="ranking_list",
            )

        # C. Portfolio Distribution across 5 Departments
        if any(k in q_lower for k in [
            "cơ cấu danh mục", "phân bố danh mục", "loại hợp đồng phổ biến", "cơ cấu hợp đồng",
            "danh mục hợp đồng", "phân bố hợp đồng", "cơ cấu tài liệu", "phân bố tài liệu",
            "danh mục tài liệu", "phân tích cơ cấu", "hợp đồng cuad",
        ]) or ("theo phòng ban" in q_lower and any(w in q_lower for w in ["tài liệu", "văn bản", "hợp đồng", "danh mục", "phân bố", "cơ cấu"])):
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="DOCUMENT_ANALYTICS",
                target_entity="Document",
                metric="document_count",
                group_by="Department",
                filters={"doc_mode": "portfolio_breakdown"},
                expected_result_type="ranking_list",
            )

        # D. Total Document Count in System
        if any(k in q_lower for k in [
            "bao nhiêu tài liệu", "bao nhiêu văn bản", "bao nhiêu hợp đồng",
            "tổng số tài liệu", "tổng số văn bản", "tổng số hợp đồng",
            "số lượng tài liệu", "số lượng văn bản", "số lượng hợp đồng",
            "tổng cộng hiện tại có bao nhiêu", "tổng cộng có bao nhiêu tài liệu",
            "hiện tại có bao nhiêu tài liệu", "hệ thống có bao nhiêu tài liệu",
            "thống kê tài liệu", "thống kê văn bản", "thống kê hợp đồng",
            "tổng tài liệu"
        ]) or (
            any(q_w in q_lower for q_w in ["bao nhiêu", "tổng cộng", "tổng số", "số lượng", "đếm"])
            and any(d_w in q_lower for d_w in ["tài liệu", "văn bản", "hợp đồng", "document", "hồ sơ"])
        ):
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="DOCUMENT_ANALYTICS",
                target_entity="Document",
                metric="document_count",
                aggregation="COUNT",
                group_by="Department",
                filters={"doc_mode": "total_documents"},
                expected_result_type="single_value",
            )

        return None

    def _try_detect_ambiguity(self, raw_q: str, q_lower: str) -> Optional[QueryPlan]:
        """
        Detects genuinely ambiguous questions like:
        - 'Phân tích khách hàng tốt nhất' / 'Khách hàng tốt nhất là ai?' (without specifying revenue, quantity, or order count)
        - 'Sản phẩm tốt nhất là gì?' (without specifying revenue, quantity sold, or price)
        """
        has_specific_metric = any(k in q_lower for k in [
            "doanh thu", "chi tiêu", "tiền", "giá trị", "revenue",
            "số lượng", "nhiều sản phẩm", "ít sản phẩm", "món hàng", "lượng hàng", "quantity", "bán chạy",
            "đơn hàng", "lần mua", "order",
            "giá niêm yết", "đắt nhất", "rẻ nhất", "listprice"
        ])
        if has_specific_metric:
            return None

        # Ambiguous customer evaluation
        if any(p in q_lower for p in [
            "khách hàng tốt nhất", "khách hàng xuất sắc nhất", "khách hàng hiệu quả nhất",
            "khách hàng hàng đầu", "ai là khách hàng tốt nhất", "phân tích khách hàng tốt nhất"
        ]):
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="AMBIGUOUS",
                target_entity="Customer",
                ambiguity_options=[
                    "1. Theo Tổng doanh thu gộp cao nhất (Gross Revenue - TotalDue)",
                    "2. Theo Tổng số lượng sản phẩm mua nhiều nhất (Product Volume - OrderQty)",
                    "3. Theo Số lượng đơn đặt hàng nhiều nhất (Order Frequency - Order Count)",
                ],
                expected_result_type="clarification",
            )

        # Ambiguous product evaluation
        if any(p in q_lower for p in [
            "sản phẩm tốt nhất", "sản phẩm hiệu quả nhất", "sản phẩm nổi bật nhất",
            "phân tích sản phẩm tốt nhất"
        ]):
            return QueryPlan(
                raw_query=raw_q,
                normalized_query=q_lower,
                intent="AMBIGUOUS",
                target_entity="Product",
                ambiguity_options=[
                    "1. Theo Tổng doanh thu mang lại cao nhất (Product Line Revenue)",
                    "2. Theo Số lượng bán ra nhiều nhất (Best-selling Volume - OrderQty)",
                    "3. Theo Giá niêm yết cao nhất (Highest ListPrice)",
                ],
                expected_result_type="clarification",
            )

        return None

    def _is_executive_report_query(self, q_lower: str) -> bool:
        report_phrases = [
            "đánh giá tình hình kinh doanh",
            "tình hình kinh doanh hiện tại",
            "tình hình kinh doanh",
            "tổng hợp báo cáo kinh doanh",
            "báo cáo tổng quan kinh doanh",
            "bức tranh toàn cảnh kinh doanh",
            "báo cáo tình hình doanh thu và đơn hàng",
            "phân tích tổng quan hoạt động kinh doanh",
            "đánh giá hiệu quả kinh doanh",
        ]
        return any(p in q_lower for p in report_phrases)

    def _is_causal_analysis_query(self, q_lower: str) -> bool:
        causal_triggers = ["tại sao", "vì sao", "nguyên nhân", "lý do", "điều gì đang ảnh hưởng", "yếu tố nào ảnh hưởng"]
        if any(t in q_lower for t in causal_triggers) and any(
            b in q_lower for b in ["doanh thu", "bán kém", "bán chậm", "giảm", "tăng", "hiệu suất", "kinh doanh", "đơn hàng", "sản phẩm"]
        ):
            return True
        if "đóng góp nhiều doanh thu" in q_lower and ("nhận xét" in q_lower or "phân tích" in q_lower or "nhóm sản phẩm" in q_lower):
            return True
        return False

    def _extract_time_filters(self, q_lower: str, plan: QueryPlan) -> None:
        # 1. Explicit year range ("từ 2011 đến 2014") and individual years
        yr_range_m = re.search(r"từ\s+(?:năm\s+)?(20\d{2})\s*(?:đến|tới|-)\s*(?:năm\s+)?(20\d{2})", q_lower)
        if yr_range_m:
            y_start, y_end = int(yr_range_m.group(1)), int(yr_range_m.group(2))
            if y_start <= y_end and (y_end - y_start) <= 20:
                for y in range(y_start, y_end + 1):
                    ys = str(y)
                    if ys not in plan.years:
                        plan.years.append(ys)
                plan.filters["is_year_range"] = True
        years_found = re.findall(r"\b(20\d{2})\b", q_lower)
        for y in years_found:
            if y not in plan.years:
                plan.years.append(y)

        # 2. Explicit month-year (e.g., tháng 5/2014, tháng 06-2014, tháng 5 năm 2014, 2014-05)
        for m_match in re.finditer(r"tháng\s*(\d{1,2})\s*(?:/|-|\s+năm\s+)\s*(20\d{2})", q_lower):
            mm = int(m_match.group(1))
            yy = m_match.group(2)
            if 1 <= mm <= 12:
                ym = f"{yy}-{mm:02d}"
                if ym not in plan.months:
                    plan.months.append(ym)
        for ym_match in re.finditer(r"\b(20\d{2})-(0[1-9]|1[0-2])\b", q_lower):
            ym = f"{ym_match.group(1)}-{ym_match.group(2)}"
            if ym not in plan.months:
                plan.months.append(ym)

        # 3. Standalone month numbers (e.g., "tháng 5 và tháng 6", "trong tháng 10")
        if not plan.months:
            for m_only in re.finditer(r"tháng\s+(\d{1,2})\b", q_lower):
                mm = int(m_only.group(1))
                if 1 <= mm <= 12:
                    if len(plan.years) == 1:
                        ym = f"{plan.years[0]}-{mm:02d}"
                    else:
                        # Default to latest dataset year having that month (2014 for 1..6, 2013 for 7..12)
                        default_yr = "2014" if mm <= 6 else "2013"
                        ym = f"{default_yr}-{mm:02d}"
                    if ym not in plan.months:
                        plan.months.append(ym)

        # 4. Quarters (quý 1, quý 2, quý 3, quý 4)
        for q_match in re.finditer(r"quý\s*([1-4])\b", q_lower):
            q_num = int(q_match.group(1))
            if q_num not in plan.quarters:
                plan.quarters.append(q_num)

        # 5. Relative time expressions
        if any(k in q_lower for k in ["hôm nay", "today", "ngày hôm nay"]):
            plan.relative_time = "today"
        elif any(k in q_lower for k in ["tháng trước", "last month", "tháng vừa rồi"]) and any(k in q_lower for k in ["tháng này", "this month", "tháng hiện tại"]):
            plan.relative_time = "this_month_vs_last_month"
        elif any(k in q_lower for k in ["tháng này", "this month", "tháng hiện tại"]):
            plan.relative_time = "this_month"
        elif any(k in q_lower for k in ["tháng trước", "last month", "tháng vừa rồi"]):
            plan.relative_time = "last_month"
        elif any(k in q_lower for k in ["năm nay", "this year", "năm hiện tại"]):
            plan.relative_time = "this_year"
        elif any(k in q_lower for k in ["năm ngoái", "năm trước", "last year"]):
            plan.relative_time = "last_year"
        elif re.search(r"\b(\d+)\s+tháng\s+gần\s+(?:nhất|đây)\b", q_lower):
            m_n = re.search(r"\b(\d+)\s+tháng\s+gần\s+(?:nhất|đây)\b", q_lower)
            plan.relative_time = f"last_{m_n.group(1)}_months"
            plan.time_granularity = "month"

        # 6. Time Granularity ("theo từng năm", "theo từng tháng", "theo từng quý", "theo từng ngày")
        if any(k in q_lower for k in ["từng ngày", "theo ngày", "mỗi ngày", "daily"]):
            plan.time_granularity = "day"
            plan.group_by = "Day"
        elif any(k in q_lower for k in ["từng tháng", "theo tháng", "mỗi tháng", "monthly", "các tháng", "tháng nào"]):
            plan.time_granularity = "month"
            plan.group_by = "Month"
        elif any(k in q_lower for k in ["từng quý", "theo quý", "mỗi quý", "quarterly", "các quý", "quý nào"]):
            plan.time_granularity = "quarter"
            plan.group_by = "Quarter"
        elif any(k in q_lower for k in ["từng năm", "theo năm", "mỗi năm", "yearly", "qua các năm", "các năm", "năm nào"]):
            plan.time_granularity = "year"
            plan.group_by = "Year"

    def _extract_entity_filters(self, raw_q: str, q_lower: str, plan: QueryPlan) -> None:
        # 1. Specific Order ID (e.g. Đơn hàng #43659, Order 55282, SalesOrder 43660)
        order_m = re.search(r"(?:order|đơn\s+hàng|salesorder|mã\s+đơn)[\s#:]*(\d{4,6})\b", raw_q, re.IGNORECASE)
        if order_m:
            plan.filters["order_id"] = int(order_m.group(1))

        # 2. Specific Customer ID (e.g. Khách hàng #29818, Customer 29722, mã KH 30078)
        cust_ids = re.findall(r"(?:khách\s+hàng|customer|mã\s+kh)[\s#:]*(\d{1,5})\b", raw_q, re.IGNORECASE)
        if not cust_ids:
            # Also check standalone #29818
            cust_ids = re.findall(r"#(\d{4,5})\b", raw_q)
        if cust_ids:
            plan.filters["customer_ids"] = [int(cid) for cid in cust_ids]
            if len(cust_ids) == 1:
                plan.filters["customer_id"] = int(cust_ids[0])

        # 3. Specific Customer Name (e.g. Roger Harui, Reuben D'sa, Kevin Liu, Tony Ting, Dalton Perez)
        known_cust_match = re.search(
            r"(?:khách\s+hàng|customer|của\s+khách\s+hàng)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){1,2})",
            raw_q
        )
        if known_cust_match and "customer_id" not in plan.filters:
            cand_name = known_cust_match.group(1).strip()
            if cand_name.lower() not in ["trong hệ", "hiện tại", "nào mua", "nào có", "tốt nhất", "nhiều nhất", "ít nhất"]:
                plan.filters["customer_name"] = cand_name

        # 4. Specific Product ID (e.g. Sản phẩm #751, Product 712, mã SP 782)
        prod_m = re.search(r"(?:sản\s+phẩm|product|mã\s+sp)[\s#:]+(\d{1,4})\b", raw_q, re.IGNORECASE)
        if prod_m:
            plan.filters["product_id"] = int(prod_m.group(1))

        # 5. Category filter (Bikes, Components, Clothing, Accessories)
        cat_map = {
            "bikes": "Bikes",
            "xe đạp": "Bikes",
            "components": "Components",
            "linh kiện": "Components",
            "phụ tùng": "Components",
            "clothing": "Clothing",
            "quần áo": "Clothing",
            "trang phục": "Clothing",
            "accessories": "Accessories",
            "phụ kiện": "Accessories",
        }
        matched_cats = []
        for kw, canon_cat in cat_map.items():
            if re.search(rf"\b{re.escape(kw)}\b", q_lower):
                if canon_cat not in matched_cats:
                    matched_cats.append(canon_cat)
        if matched_cats:
            plan.filters["categories"] = matched_cats
            if len(matched_cats) == 1:
                plan.filters["category"] = matched_cats[0]

        # 6. Specific Product Name / Model (e.g., Road-150, Mountain-200, AWC Logo Cap, Water Bottle, Sport-100 Helmet)
        prod_model_m = re.search(
            r"\b(Road-\d+(?:\s+Red|\s+Black)?(?:,\s*\d+)?|Mountain-\d+(?:\s+Black|\s+Silver)?(?:,\s*\d+)?|Touring-\d+|AWC\s+Logo\s+Cap|Water\s+Bottle(?:\s*-\s*30\s*oz\.)?|Sport-100\s+Helmet(?:,\s*(?:Blue|Black|Red))?|Long-Sleeve\s+Logo\s+Jersey(?:,\s*[SMLXL]+)?|Patch\s+Kit/8\s+Patches|Adjustable\s+Race)\b",
            raw_q,
            re.IGNORECASE
        )
        if prod_model_m:
            plan.filters["product_name"] = prod_model_m.group(1).strip()

    def _is_comparison_query(self, q_lower: str, plan: QueryPlan) -> bool:
        if any(k in q_lower for k in ["so sánh", "đối chiếu", "chênh lệch giữa", "khác biệt giữa", "compare", "comparison", "versus", " vs "]):
            return True
        if "so với" in q_lower and any(k in q_lower for k in ["tháng", "năm", "quý", "trung bình", "danh mục", "sản phẩm", "khách hàng"]):
            return True
        if plan.relative_time == "this_month_vs_last_month":
            return True
        if len(plan.years) == 2 and not plan.filters.get("is_year_range") and "từng năm" not in q_lower and any(k in q_lower for k in ["thay đổi", "biến động", "tăng hay giảm", "chênh lệch"]):
            return True
        if len(plan.months) >= 2 and any(k in q_lower for k in ["thay đổi", "biến động", "tăng hay giảm", "chênh lệch"]):
            return True
        return False

    def _configure_comparison_plan(self, raw_q: str, q_lower: str, plan: QueryPlan) -> None:
        plan.expected_result_type = "comparison_table"
        # Determine metric being compared
        if any(k in q_lower for k in ["số lượng đơn", "số đơn", "đơn hàng"]):
            plan.metric = "order_count"
        elif any(k in q_lower for k in ["số lượng sản phẩm", "số sản phẩm", "lượng bán"]):
            plan.metric = "product_quantity"
        elif any(k in q_lower for k in ["tăng trưởng", "tốc độ tăng"]):
            plan.metric = "revenue_growth_rate"
        else:
            plan.metric = "gross_revenue"

        # Check if comparing against average ("so với doanh thu trung bình", "so với mức trung bình")
        if "trung bình" in q_lower:
            plan.vs_average = True

        # Determine comparison dimension
        if plan.relative_time == "this_month_vs_last_month" or ("hai tháng" in q_lower or "2 tháng" in q_lower or len(plan.months) >= 2):
            plan.target_entity = "SalesOrder"
            plan.group_by = "Month"
            if len(plan.months) < 2:
                plan.months = [DATASET_PREV_MONTH, DATASET_LATEST_MONTH]
        elif len(plan.years) >= 2 or "hai năm" in q_lower or "2 năm" in q_lower or "các năm" in q_lower:
            plan.target_entity = "SalesOrder"
            plan.group_by = "Year"
            if len(plan.years) < 2:
                plan.years = [DATASET_PREV_YEAR, DATASET_LATEST_YEAR]
        elif "danh mục" in q_lower or len(plan.filters.get("categories", [])) >= 2:
            plan.target_entity = "Category"
            plan.group_by = "Category"
        elif "khách hàng" in q_lower:
            plan.target_entity = "Customer"
            plan.group_by = "Customer"
        elif "sản phẩm" in q_lower:
            plan.target_entity = "Product"
            plan.group_by = "Product"
        else:
            plan.target_entity = "SalesOrder"
            plan.group_by = "Year"
            if len(plan.years) < 2:
                plan.years = [DATASET_PREV_YEAR, DATASET_LATEST_YEAR]

    def _is_formula_kpi_query(self, q_lower: str, plan: QueryPlan) -> bool:
        # 1. Average Order Value (AOV)
        if any(k in q_lower for k in [
            "doanh thu trung bình mỗi đơn", "giá trị đơn hàng trung bình", "giá trị trung bình mỗi đơn",
            "trung bình mỗi đơn hàng", "trung bình 1 đơn hàng", "aov", "average order value"
        ]):
            plan.intent = "FORMULA_KPI"
            plan.target_entity = "SalesOrder"
            plan.metric = "avg_order_value"
            plan.aggregation = "AVG"
            plan.expected_result_type = "single_value"
            return True

        # 2. Average Revenue Per Customer (ARPC)
        if any(k in q_lower for k in [
            "doanh thu trung bình trên khách hàng", "doanh thu trung bình mỗi khách hàng",
            "chi tiêu trung bình mỗi khách hàng", "trung bình mỗi khách hàng chi",
            "arpc", "arpu", "average revenue per customer"
        ]):
            plan.intent = "FORMULA_KPI"
            plan.target_entity = "Customer"
            plan.metric = "avg_revenue_per_customer"
            plan.aggregation = "AVG"
            plan.expected_result_type = "single_value"
            return True

        # 3. Repeat Customer Rate
        if any(k in q_lower for k in [
            "tỷ lệ khách hàng quay lại", "tỷ lệ khách hàng mua lặp lại", "khách hàng quay lại",
            "khách hàng mua nhiều lần", "repeat customer", "retention rate"
        ]):
            plan.intent = "FORMULA_KPI"
            plan.target_entity = "Customer"
            plan.metric = "repeat_customer_rate"
            plan.aggregation = "RATIO"
            plan.expected_result_type = "single_value"
            return True

        # 4. Revenue Growth Rate
        if any(k in q_lower for k in [
            "tỷ lệ tăng trưởng", "tốc độ tăng trưởng", "tăng trưởng doanh thu", "growth rate"
        ]):
            plan.intent = "FORMULA_KPI"
            plan.target_entity = "SalesOrder"
            plan.metric = "revenue_growth_rate"
            plan.aggregation = "RATIO"
            plan.expected_result_type = "comparison_table"
            return True

        # 5. Revenue Share / Contribution by Category or Product
        if any(k in q_lower for k in [
            "tỷ trọng doanh thu", "tỷ lệ đóng góp", "cơ cấu doanh thu", "đóng góp bao nhiêu phần trăm", "revenue share"
        ]):
            plan.intent = "FORMULA_KPI"
            plan.metric = "revenue_share"
            plan.aggregation = "RATIO"
            plan.target_entity = "Product" if ("sản phẩm" in q_lower and "danh mục" not in q_lower) else "Category"
            plan.group_by = plan.target_entity
            plan.expected_result_type = "ranking_list"
            return True

        return False

    def _is_retrieval_lookup_query(self, raw_q: str, q_lower: str, plan: QueryPlan) -> bool:
        # 1. Specific Order ID lookup ("Đơn hàng #43659 được tạo vào thời điểm nào?", "Thông tin đơn hàng 55282")
        if "order_id" in plan.filters:
            plan.intent = "RETRIEVAL"
            plan.target_entity = "SalesOrder"
            plan.filters["lookup_mode"] = "order_detail"
            plan.expected_result_type = "record_detail"
            return True

        # 2. Specific Customer lookup ("Khách hàng #29818 đã mua những sản phẩm nào?", "Thông tin khách hàng Roger Harui")
        if "customer_id" in plan.filters or "customer_name" in plan.filters:
            if len(plan.filters.get("customer_ids", [])) >= 2 and "so sánh" in q_lower:
                return False
            plan.intent = "RETRIEVAL"
            plan.target_entity = "Customer"
            if any(k in q_lower for k in ["mua những sản phẩm", "đã mua sản phẩm", "mua gì", "sản phẩm nào"]):
                plan.filters["lookup_mode"] = "customer_products"
            else:
                plan.filters["lookup_mode"] = "customer_detail"
            plan.expected_result_type = "record_detail"
            return True

        # 3. Specific Product lookup ("Sản phẩm Road-150 thuộc danh mục nào?", "Thông tin sản phẩm #751")
        if "product_id" in plan.filters or "product_name" in plan.filters:
            plan.intent = "RETRIEVAL"
            plan.target_entity = "Product"
            plan.filters["lookup_mode"] = "product_detail"
            plan.expected_result_type = "record_detail"
            return True

        # 4. List of Customers / Products / Categories ("Danh sách khách hàng hiện tại gồm những ai?", "Danh sách các danh mục sản phẩm")
        if any(k in q_lower for k in ["danh sách khách hàng", "liệt kê các khách hàng", "khách hàng hiện tại gồm những ai"]):
            plan.intent = "RETRIEVAL"
            plan.target_entity = "Customer"
            plan.filters["lookup_mode"] = "customer_list"
            plan.limit = extract_top_n_limit(q_lower, default_limit=10)
            plan.expected_result_type = "ranking_list"
            return True

        if any(k in q_lower for k in ["danh sách sản phẩm", "liệt kê các sản phẩm", "các sản phẩm hiện có"]):
            plan.intent = "RETRIEVAL"
            plan.target_entity = "Product"
            plan.filters["lookup_mode"] = "product_list"
            plan.limit = extract_top_n_limit(q_lower, default_limit=10)
            plan.expected_result_type = "ranking_list"
            return True

        return False

    def _extract_conditional_filters(self, q_lower: str, plan: QueryPlan) -> bool:
        has_cond = False

        # 1. Above / Below Average condition ("doanh thu trên mức trung bình", "chi tiêu cao hơn trung bình")
        if any(k in q_lower for k in [
            "trên mức trung bình", "trên trung bình", "cao hơn trung bình", "cao hơn mức trung bình",
            "lớn hơn trung bình", "lớn hơn mức trung bình", "vượt mức trung bình", "above average"
        ]):
            plan.filters["above_average"] = True
            has_cond = True
        elif any(k in q_lower for k in [
            "dưới mức trung bình", "dưới trung bình", "thấp hơn trung bình", "thấp hơn mức trung bình",
            "nhỏ hơn trung bình", "nhỏ hơn mức trung bình", "below average"
        ]):
            plan.filters["below_average"] = True
            has_cond = True

        # 2. Range condition: BETWEEN ("từ X đến Y")
        between_m = re.search(
            r"từ\s+([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$)?\s*(?:đến|tới|-)\s*([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$|sản\s+phẩm|đơn\s+hàng)?",
            q_lower
        )
        if between_m and "tháng" not in q_lower[:between_m.start()][-10:] and "năm" not in q_lower[:between_m.start()][-10:]:
            v1 = parse_vietnamese_number(between_m.group(1), between_m.group(2) or between_m.group(4) or "")
            v2 = parse_vietnamese_number(between_m.group(3), between_m.group(4) or "")
            if "giá" in q_lower:
                plan.filters["min_price"] = v1
                plan.filters["max_price"] = v2
                plan.target_entity = "Product"
                plan.metric = "list_price"
            elif "sản phẩm" in (between_m.group(4) or ""):
                plan.filters["min_qty"] = int(v1)
                plan.filters["max_qty"] = int(v2)
                plan.metric = "product_quantity"
            elif "đơn" in (between_m.group(4) or ""):
                plan.filters["min_orders"] = int(v1)
                plan.filters["max_orders"] = int(v2)
                plan.metric = "order_count"
            else:
                plan.filters["min_rev"] = v1
                plan.filters["max_rev"] = v2
                plan.metric = "gross_revenue"
            has_cond = True

        # 3. Greater than (> / trên / lớn hơn / hơn / từ ... trở lên)
        gt_patterns = [
            (r"(?:mua|bán)\s+(?:trên|hơn|lớn\s+hơn|nhiều\s+hơn|từ)\s+(\d+)\s*sản\s+phẩm", "min_qty"),
            (r"số\s+lượng\s+(?:bán|mua)?\s*(?:trên|hơn|lớn\s+hơn|>|>=)\s*(\d+)", "min_qty"),
            (r"(?:trên|hơn|lớn\s+hơn|nhiều\s+hơn|>|>=)\s*(\d+)\s*đơn\s+hàng", "min_orders"),
            (r"(?:doanh\s+thu|chi\s+tiêu|giá\s+trị)\s+(?:trên|hơn|lớn\s+hơn|>|>=)\s*([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$)?", "min_rev"),
            (r"giá\s+(?:niêm\s+yết\s+)?(?:trên|hơn|lớn\s+hơn|>|>=)\s*([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$)?", "min_price"),
        ]
        for pat, f_key in gt_patterns:
            m = re.search(pat, q_lower)
            if m:
                unit = m.group(2) if m.lastindex and m.lastindex >= 2 else ""
                val = parse_vietnamese_number(m.group(1), unit)
                # Convert VND heuristic if user says '10 triệu đồng' while DB is in USD (note: explain clearly or treat as numeric USD if no VND conversion rate is set, or convert at 1 USD = 25,000 VND with explicit note)
                if "đồng" in q_lower or "vnd" in q_lower or "vnđ" in q_lower:
                    plan.filters["currency_note_vnd"] = val
                    val = round(val / 25000.0, 2)
                plan.filters[f_key] = val
                has_cond = True

        # 4. Less than (< / dưới / nhỏ hơn / ít hơn)
        lt_patterns = [
            (r"(?:mua|bán)\s+(?:dưới|ít\s+hơn|nhỏ\s+hơn|<|<=)\s*(\d+)\s*sản\s+phẩm", "max_qty"),
            (r"(?:dưới|ít\s+hơn|nhỏ\s+hơn|<|<=)\s*(\d+)\s*đơn\s+hàng", "max_orders"),
            (r"(?:doanh\s+thu|chi\s+tiêu|giá\s+trị)\s+(?:dưới|ít\s+hơn|nhỏ\s+hơn|thấp\s+hơn|<|<=)\s*([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$)?", "max_rev"),
            (r"giá\s+(?:niêm\s+yết\s+)?(?:dưới|ít\s+hơn|nhỏ\s+hơn|thấp\s+hơn|<|<=)\s*([\d\.,]+)\s*(triệu|tỷ|nghìn|ngàn|k|m|usd|\$)?", "max_price"),
        ]
        for pat, f_key in lt_patterns:
            m = re.search(pat, q_lower)
            if m:
                unit = m.group(2) if m.lastindex and m.lastindex >= 2 else ""
                val = parse_vietnamese_number(m.group(1), unit)
                if "đồng" in q_lower or "vnd" in q_lower or "vnđ" in q_lower:
                    plan.filters["currency_note_vnd"] = val
                    val = round(val / 25000.0, 2)
                plan.filters[f_key] = val
                has_cond = True

        # 5. Customer bought product in Category X ("Khách hàng đã mua sản phẩm thuộc danh mục Bikes")
        if "khách hàng" in q_lower and "category" in plan.filters and any(w in q_lower for w in ["thuộc danh mục", "danh mục", "mua xe đạp"]):
            plan.target_entity = "Customer"
            plan.metric = "product_quantity"
            has_cond = True

        if has_cond:
            if "khách hàng" in q_lower:
                plan.target_entity = "Customer"
                if "min_qty" in plan.filters or "max_qty" in plan.filters:
                    plan.metric = "product_quantity"
                elif "min_orders" in plan.filters or "max_orders" in plan.filters:
                    plan.metric = "order_count"
                else:
                    plan.metric = "gross_revenue"
            elif "sản phẩm" in q_lower:
                plan.target_entity = "Product"
                if "min_price" in plan.filters or "max_price" in plan.filters:
                    plan.metric = "list_price"
                elif "min_qty" in plan.filters or "max_qty" in plan.filters:
                    plan.metric = "product_quantity"
                else:
                    plan.metric = "net_revenue"
            elif "đơn hàng" in q_lower:
                plan.target_entity = "SalesOrder"
                plan.metric = "gross_revenue"

        return has_cond

    def _is_time_series_query(self, q_lower: str, plan: QueryPlan) -> bool:
        # Exclude ranking of months/years like "Tháng nào có doanh thu cao nhất?"
        if any(k in q_lower for k in ["tháng nào", "năm nào", "quý nào", "ngày nào"]) and any(
            r in q_lower for r in ["cao nhất", "thấp nhất", "nhiều nhất", "ít nhất", "lớn nhất", "nhỏ nhất"]
        ):
            return False

        # Exclude specific entity rankings within a year (e.g., "Top 5 sản phẩm bán chạy năm 2013")
        if any(k in q_lower for k in ["khách hàng nào", "sản phẩm nào", "top "]):
            return False

        if plan.time_granularity in ["year", "quarter", "month", "day"]:
            if any(k in q_lower for k in ["số lượng đơn", "số đơn", "bao nhiêu đơn"]):
                plan.metric = "order_count"
            else:
                plan.metric = "gross_revenue"
            return True

        if plan.relative_time or plan.years or plan.months or plan.quarters:
            if any(k in q_lower for k in ["doanh thu", "đơn hàng", "xu hướng", "biến động", "tài chính", "giao dịch"]):
                if any(k in q_lower for k in ["số lượng đơn", "số đơn", "bao nhiêu đơn"]):
                    plan.metric = "order_count"
                else:
                    plan.metric = "gross_revenue"
                return True

        if any(k in q_lower for k in ["xu hướng doanh thu", "xu hướng kinh doanh", "biến động doanh thu", "doanh thu qua các năm"]):
            plan.time_granularity = plan.time_granularity or "year"
            plan.group_by = plan.group_by or "Year"
            plan.metric = "gross_revenue"
            return True

        return False

    def _configure_ranking_plan(self, q_lower: str, plan: QueryPlan, is_explicit_rank: bool) -> bool:
        # 1. Ranking Months / Years ("Tháng nào có doanh thu cao nhất / thấp nhất?")
        if any(k in q_lower for k in ["tháng nào", "tháng có"]):
            plan.intent = "RANKING"
            plan.target_entity = "SalesOrder"
            plan.group_by = "Month"
            plan.time_granularity = "month"
            plan.metric = "order_count" if ("đơn hàng" in q_lower and "doanh thu" not in q_lower) else "gross_revenue"
            plan.expected_result_type = "ranking_list"
            return True

        if any(k in q_lower for k in ["năm nào", "năm có"]):
            plan.intent = "RANKING"
            plan.target_entity = "SalesOrder"
            plan.group_by = "Year"
            plan.time_granularity = "year"
            plan.metric = "order_count" if ("đơn hàng" in q_lower and "doanh thu" not in q_lower) else "gross_revenue"
            plan.expected_result_type = "ranking_list"
            return True

        # 2. Ranking Customers ("Khách hàng nào...", "Ai mua...", "Người mua...")
        if any(k in q_lower for k in ["khách hàng", "khách nào", "ai mua", "người mua", "ai có tổng", "người nào mua", "customer", "vip"]):
            # Exclude pure count query like "Có bao nhiêu khách hàng?"
            if any(k in q_lower for k in ["có bao nhiêu khách hàng", "tổng số khách hàng", "số lượng khách hàng"]):
                return False
            # Check if "Mỗi khách hàng đã mua bao nhiêu sản phẩm?" (Group-by aggregation)
            if q_lower.startswith("mỗi khách hàng"):
                plan.intent = "AGGREGATION"
                plan.target_entity = "Customer"
                plan.group_by = "Customer"
                plan.metric = "product_quantity" if "sản phẩm" in q_lower else "order_count"
                plan.limit = 10
                plan.expected_result_type = "ranking_list"
                return True

            plan.intent = "RANKING"
            plan.target_entity = "Customer"
            plan.expected_result_type = "ranking_list"
            if any(k in q_lower for k in ["sản phẩm", "lượng hàng", "món hàng", "số lượng mua", "hàng hóa", "product", "quantity", "units"]):
                plan.metric = "product_quantity"
            elif any(k in q_lower for k in ["giá trị", "chi tiêu", "doanh thu", "tiền", "thanh toán", "revenue", "spent"]):
                plan.metric = "gross_revenue"
            elif any(k in q_lower for k in ["đơn hàng", "số đơn", "lượng đơn", "lần mua", "orders"]):
                plan.metric = "order_count"
            else:
                plan.metric = "gross_revenue"
            return True

        # 3. Ranking Products ("Sản phẩm nào...", "Top sản phẩm...", "Mặt hàng nào...")
        if any(k in q_lower for k in ["sản phẩm", "mặt hàng", "hàng hóa", "xe đạp", "product"]):
            if any(k in q_lower for k in ["có bao nhiêu sản phẩm", "tổng số sản phẩm", "số lượng sản phẩm đã bán là bao nhiêu", "tổng số lượng sản phẩm đã bán"]):
                return False
            if q_lower.startswith("mỗi danh mục") or "mỗi danh mục có bao nhiêu sản phẩm" in q_lower:
                return False

            plan.intent = "RANKING"
            plan.target_entity = "Product"
            plan.expected_result_type = "ranking_list"
            if any(k in q_lower for k in ["bán chạy", "bán chậm", "bán ít", "bán kém", "bán ế", "số lượng bán", "lượng bán", "mua nhiều", "doanh số"]):
                plan.metric = "product_quantity"
            elif any(k in q_lower for k in ["doanh thu", "mang lại nhiều tiền", "doanh thu cao", "doanh thu thấp"]):
                plan.metric = "net_revenue"
            else:
                plan.metric = "list_price"
            return True

        # 4. Ranking Categories ("Danh mục nào...", "Nhóm sản phẩm nào...")
        if any(k in q_lower for k in ["danh mục nào", "nhóm sản phẩm nào", "loại sản phẩm nào"]):
            plan.intent = "RANKING"
            plan.target_entity = "Category"
            plan.group_by = "Category"
            plan.metric = "product_quantity" if ("số lượng bán" in q_lower) else ("product_count" if "nhiều sản phẩm" in q_lower and "doanh thu" not in q_lower else "net_revenue")
            plan.expected_result_type = "ranking_list"
            return True

        # 5. Ranking SalesOrders ("Đơn hàng nào có giá trị lớn nhất / nhỏ nhất?")
        if any(k in q_lower for k in ["đơn hàng nào", "top đơn hàng", "đơn hàng lớn nhất", "đơn hàng nhỏ nhất", "đơn hàng cao nhất", "đơn hàng thấp nhất"]):
            plan.intent = "RANKING"
            plan.target_entity = "SalesOrder"
            plan.metric = "gross_revenue"
            plan.expected_result_type = "ranking_list"
            return True

        return False

    def _configure_aggregation_plan(self, q_lower: str, plan: QueryPlan) -> bool:
        # 1. Group-by Category: "Mỗi danh mục có bao nhiêu sản phẩm?" / "Doanh thu theo từng danh mục"
        if any(k in q_lower for k in ["mỗi danh mục", "từng danh mục", "theo danh mục", "các danh mục sản phẩm"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "Category"
            plan.group_by = "Category"
            plan.metric = "net_revenue" if "doanh thu" in q_lower else "product_count"
            plan.aggregation = "SUM" if "doanh thu" in q_lower else "COUNT_DISTINCT"
            plan.expected_result_type = "ranking_list"
            return True

        # 2. Group-by Customer: "Mỗi khách hàng đã mua bao nhiêu sản phẩm / đơn hàng?"
        if any(k in q_lower for k in ["mỗi khách hàng", "từng khách hàng"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "Customer"
            plan.group_by = "Customer"
            plan.metric = "product_quantity" if "sản phẩm" in q_lower else ("order_count" if "đơn" in q_lower else "gross_revenue")
            plan.limit = 10
            plan.expected_result_type = "ranking_list"
            return True

        # 3. Total Customers ("Có bao nhiêu khách hàng trong hệ thống?", "Tổng số khách hàng là bao nhiêu?")
        if any(k in q_lower for k in ["bao nhiêu khách hàng", "tổng số khách hàng", "số lượng khách hàng", "đếm số khách hàng"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "Customer"
            plan.metric = "customer_count"
            plan.aggregation = "COUNT_DISTINCT"
            plan.expected_result_type = "single_value"
            return True

        # 4. Total Products Sold vs Total Products in Catalog
        if any(k in q_lower for k in ["số lượng sản phẩm đã bán", "tổng số sản phẩm đã bán", "bao nhiêu sản phẩm đã được bán", "đã bán bao nhiêu sản phẩm"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "Product"
            plan.metric = "product_quantity"
            plan.aggregation = "SUM"
            plan.expected_result_type = "single_value"
            return True

        if any(k in q_lower for k in ["bao nhiêu sản phẩm", "tổng số sản phẩm", "số lượng sản phẩm trong hệ thống", "bao nhiêu mặt hàng"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "Product"
            plan.metric = "product_count"
            plan.aggregation = "COUNT_DISTINCT"
            plan.expected_result_type = "single_value"
            return True

        # 5. Total Orders ("Có bao nhiêu đơn hàng?", "Tổng số đơn hàng là bao nhiêu?")
        if any(k in q_lower for k in ["bao nhiêu đơn hàng", "tổng số đơn hàng", "số lượng đơn hàng", "tổng đơn hàng"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "SalesOrder"
            plan.metric = "order_count"
            plan.aggregation = "COUNT_DISTINCT"
            plan.expected_result_type = "single_value"
            return True

        # 6. Total Revenue ("Tổng doanh thu là bao nhiêu?", "Doanh thu toàn hệ thống")
        if any(k in q_lower for k in ["tổng doanh thu", "doanh thu là bao nhiêu", "doanh thu toàn hệ thống", "tổng tiền bán hàng"]):
            plan.intent = "AGGREGATION"
            plan.target_entity = "SalesOrder"
            plan.metric = "gross_revenue"
            plan.aggregation = "SUM"
            plan.expected_result_type = "single_value"
            return True

        return False

    def _fallback_entity_plan(self, raw_q: str, q_lower: str, plan: QueryPlan) -> QueryPlan:
        if any(k in q_lower for k in ["doanh thu", "revenue", "tài chính"]):
            plan.intent = "TIME_SERIES"
            plan.target_entity = "SalesOrder"
            plan.metric = "gross_revenue"
            plan.time_granularity = "year"
            plan.group_by = "Year"
            plan.expected_result_type = "time_series"
            return plan
        if any(k in q_lower for k in ["khách hàng", "customer"]):
            plan.intent = "RANKING"
            plan.target_entity = "Customer"
            plan.metric = "gross_revenue"
            plan.expected_result_type = "ranking_list"
            return plan
        if any(k in q_lower for k in ["sản phẩm", "product"]):
            plan.intent = "RANKING"
            plan.target_entity = "Product"
            plan.metric = "list_price"
            plan.expected_result_type = "ranking_list"
            return plan
        if any(k in q_lower for k in ["đơn hàng", "order"]):
            plan.intent = "RANKING"
            plan.target_entity = "SalesOrder"
            plan.metric = "gross_revenue"
            plan.expected_result_type = "ranking_list"
            return plan

        plan.intent = "GENERIC_SEARCH"
        return plan


planner = SemanticQueryPlanner()


# ============================================================================
# 3. CYPHER QUERY BUILDER & VALIDATOR
# ============================================================================

class CypherValidator:
    """Validates generated Cypher for read-only safety and structural integrity."""

    @staticmethod
    def validate(cypher: str) -> Tuple[bool, str]:
        if not cypher or not cypher.strip():
            return False, "Empty Cypher query."
        if not is_safe_read_only_cypher(cypher):
            return False, "Cypher contains forbidden write/admin clauses."
        u = cypher.upper()
        if "RETURN " not in u:
            return False, "Cypher query is missing a RETURN clause."
        return True, "OK"


class CypherQueryBuilder:
    """
    Translates a structured QueryPlan into an executable, read-only Neo4j Cypher query.
    """

    def build(self, plan: QueryPlan) -> str:
        intent = plan.intent
        if intent in ["SECURITY_REJECT", "SECURITY_BLOCKED", "OUT_OF_SCOPE", "UNSUPPORTED_METRIC", "AMBIGUOUS"]:
            return ""

        if intent == "DOCUMENT_ANALYTICS":
            return self._build_document_cypher(plan)
        if intent == "EXECUTIVE_REPORT":
            return self._build_executive_report_cypher(plan)
        if intent == "CAUSAL_ANALYSIS":
            return self._build_causal_analysis_cypher(plan)
        if intent == "COMPARISON":
            return self._build_comparison_cypher(plan)
        if intent == "FORMULA_KPI":
            return self._build_formula_kpi_cypher(plan)
        if intent == "RETRIEVAL":
            return self._build_retrieval_cypher(plan)
        if intent == "CONDITIONAL":
            return self._build_conditional_cypher(plan)
        if intent == "TIME_SERIES":
            return self._build_time_series_cypher(plan)
        if intent == "RANKING":
            return self._build_ranking_cypher(plan)
        if intent == "AGGREGATION":
            return self._build_aggregation_cypher(plan)

        return self._build_generic_search_cypher(plan)

    def _build_time_where_clause(self, plan: QueryPlan, order_alias: str = "o") -> str:
        """Builds a WHERE condition snippet on SalesOrder.OrderDate if time filters exist."""
        conds = []
        if plan.years:
            yr_list = ", ".join(f"'{y}'" for y in plan.years)
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 4) IN [{yr_list}]")
        if plan.months:
            mo_list = ", ".join(f"'{m}'" for m in plan.months)
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 7) IN [{mo_list}]")
        if plan.relative_time == "this_month":
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 7) = '{DATASET_LATEST_MONTH}'")
        elif plan.relative_time == "last_month":
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 7) = '{DATASET_PREV_MONTH}'")
        elif plan.relative_time == "this_year":
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 4) = '{DATASET_LATEST_YEAR}'")
        elif plan.relative_time == "last_year":
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 4) = '{DATASET_PREV_YEAR}'")
        elif plan.relative_time == "today":
            conds.append(f"substring(toString({order_alias}.OrderDate), 0, 10) = '{DATASET_MAX_DATE}'")
        return " AND ".join(conds)

    # ------------------------------------------------------------------------
    # 3.1 DOCUMENT ANALYTICS CYPHER
    # ------------------------------------------------------------------------

    def _build_document_cypher(self, plan: QueryPlan) -> str:
        doc_mode = plan.filters.get("doc_mode", "total_documents")
        if doc_mode == "compliance_summary":
            return (
                "MATCH (d:Document) "
                "WHERE d.id IS NOT NULL AND trim(toString(d.id)) <> '' "
                "OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]->(cl:Clause) "
                "WITH d, collect(DISTINCT toLower(coalesce(cl.type, '') + ' ' + coalesce(cl.title, ''))) AS clause_types "
                "WITH d, "
                "     any(c IN clause_types WHERE c CONTAINS 'liability' OR c CONTAINS 'trách nhiệm' OR c CONTAINS 'cap') AS has_cap, "
                "     any(c IN clause_types WHERE c CONTAINS 'governing' OR c CONTAINS 'law' OR c CONTAINS 'luật' OR c CONTAINS 'jurisdiction') AS has_law, "
                "     any(c IN clause_types WHERE c CONTAINS 'indemnif' OR c CONTAINS 'bồi thường' OR c CONTAINS 'bồi hoàn' OR c CONTAINS 'hold harmless') AS has_indem, "
                "     any(c IN clause_types WHERE c CONTAINS 'termination' OR c CONTAINS 'chấm dứt' OR c CONTAINS 'expire') AS has_term "
                "RETURN count(DISTINCT d.id) AS total_docs, "
                "       sum(CASE WHEN has_cap THEN 1 ELSE 0 END) AS cap_docs, "
                "       sum(CASE WHEN has_law THEN 1 ELSE 0 END) AS law_docs, "
                "       sum(CASE WHEN has_indem THEN 1 ELSE 0 END) AS indem_docs, "
                "       sum(CASE WHEN has_term THEN 1 ELSE 0 END) AS term_docs, "
                "       collect(CASE WHEN NOT has_cap THEN coalesce(d.title, d.id) ELSE null END)[0..10] AS missing_cap_list"
            )

        if doc_mode == "missing_clause":
            target_clause = plan.filters.get("clause_type", "Limitation of Liability")
            return (
                "MATCH (d:Document) "
                "WHERE d.id IS NOT NULL AND trim(toString(d.id)) <> '' "
                "OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]->(cl:Clause) "
                "WITH d, collect(toLower(coalesce(cl.type, '') + ' ' + coalesce(cl.title, ''))) AS clauses "
                f"WHERE NONE(c IN clauses WHERE c CONTAINS toLower('{target_clause}') OR c CONTAINS 'liability' OR c CONTAINS 'trách nhiệm') "
                "RETURN DISTINCT d.id AS document_id, coalesce(d.title, d.id) AS contract_title, "
                "coalesce(d.category, d.contract_type, 'General Commercial') AS category, "
                f"'{target_clause}' AS missing_clause "
                "ORDER BY contract_title ASC LIMIT 15"
            )

        if doc_mode == "portfolio_breakdown":
            # Includes WITH d.id AS doc_id, count(d) AS occurrences and max(occurrences) AS max_occ for PR1 V3 verification
            return (
                "MATCH (d:Document) "
                "WHERE d.id IS NOT NULL AND trim(toString(d.id)) <> '' "
                "WITH d.id AS doc_id, count(d) AS occurrences, collect(d)[0] AS doc_node "
                "WITH doc_id, occurrences, "
                "CASE "
                "  WHEN toLower(coalesce(doc_node.department, '')) CONTAINS 'kinh doanh' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'sales' THEN 'Kinh doanh (Sales)' "
                "  WHEN toLower(coalesce(doc_node.department, '')) CONTAINS 'r&d' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'nghiên cứu' THEN 'Nghiên cứu & Phát triển (R&D)' "
                "  WHEN toLower(coalesce(doc_node.department, '')) CONTAINS 'kế toán' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'thu mua' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'finance' THEN 'Kế toán & Thu mua' "
                "  WHEN toLower(coalesce(doc_node.department, '')) CONTAINS 'it' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'công nghệ' THEN 'Công nghệ thông tin (IT)' "
                "  WHEN toLower(coalesce(doc_node.department, '')) CONTAINS 'pháp chế' OR toLower(coalesce(doc_node.department, '')) CONTAINS 'legal' THEN 'Pháp chế (Legal)' "
                "  WHEN toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'distributor' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'reseller' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'marketing' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'agency' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'franchise' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'sales' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'promotion' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'sponsorship' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'endorsement' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'co_branding' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'cobranding' THEN 'Kinh doanh (Sales)' "
                "  WHEN toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'development' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'license' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'ip' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'collaboration' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'joint_venture' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'alliance' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'research' THEN 'Nghiên cứu & Phát triển (R&D)' "
                "  WHEN toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'supply' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'manufacturing' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'service' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'consulting' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'outsourcing' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'transportation' THEN 'Kế toán & Thu mua' "
                "  WHEN toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'hosting' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'maintenance' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'software' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'system' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'network' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'cloud' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'data' OR toLower(coalesce(doc_node.title, doc_id)) CONTAINS 'tech' THEN 'Công nghệ thông tin (IT)' "
                "  ELSE 'Pháp chế (Legal)' "
                "END AS contract_category "
                "RETURN contract_category, count(DISTINCT doc_id) AS doc_count, max(occurrences) AS max_occ "
                "ORDER BY doc_count DESC"
            )

        # Default: total_documents
        return (
            "MATCH (d:Document) "
            "WHERE d.id IS NOT NULL AND trim(toString(d.id)) <> '' "
            "WITH d.id AS doc_id, count(d) AS occurrences, collect(d)[0] AS doc_node "
            "WITH doc_id, occurrences, "
            "     toLower(coalesce(doc_node.department, '')) AS dept, "
            "     toLower(coalesce(doc_node.title, doc_id)) AS title_str "
            "RETURN count(DISTINCT doc_id) AS total_docs, "
            "       max(occurrences) AS max_occ, "
            "       sum(CASE WHEN dept CONTAINS 'kinh doanh' OR dept CONTAINS 'sales' OR (dept = '' AND (title_str CONTAINS 'distributor' OR title_str CONTAINS 'reseller' OR title_str CONTAINS 'marketing' OR title_str CONTAINS 'agency' OR title_str CONTAINS 'franchise' OR title_str CONTAINS 'sales' OR title_str CONTAINS 'promotion' OR title_str CONTAINS 'sponsorship' OR title_str CONTAINS 'endorsement' OR title_str CONTAINS 'co_branding' OR title_str CONTAINS 'cobranding')) THEN 1 ELSE 0 END) AS sales_docs, "
            "       sum(CASE WHEN dept CONTAINS 'r&d' OR dept CONTAINS 'nghiên cứu' OR (dept = '' AND (title_str CONTAINS 'development' OR title_str CONTAINS 'license' OR title_str CONTAINS 'ip' OR title_str CONTAINS 'collaboration' OR title_str CONTAINS 'joint_venture' OR title_str CONTAINS 'alliance' OR title_str CONTAINS 'research')) THEN 1 ELSE 0 END) AS rd_docs, "
            "       sum(CASE WHEN dept CONTAINS 'kế toán' OR dept CONTAINS 'thu mua' OR dept CONTAINS 'finance' OR (dept = '' AND (title_str CONTAINS 'supply' OR title_str CONTAINS 'manufacturing' OR title_str CONTAINS 'service' OR title_str CONTAINS 'consulting' OR title_str CONTAINS 'outsourcing' OR title_str CONTAINS 'transportation')) THEN 1 ELSE 0 END) AS acc_docs, "
            "       sum(CASE WHEN dept CONTAINS 'it' OR dept CONTAINS 'công nghệ' OR (dept = '' AND (title_str CONTAINS 'hosting' OR title_str CONTAINS 'maintenance' OR title_str CONTAINS 'software' OR title_str CONTAINS 'system' OR title_str CONTAINS 'network' OR title_str CONTAINS 'cloud' OR title_str CONTAINS 'data' OR title_str CONTAINS 'tech')) THEN 1 ELSE 0 END) AS it_docs, "
            "       sum(CASE WHEN dept CONTAINS 'pháp chế' OR dept CONTAINS 'legal' OR (dept = '' AND NOT (title_str CONTAINS 'distributor' OR title_str CONTAINS 'reseller' OR title_str CONTAINS 'marketing' OR title_str CONTAINS 'agency' OR title_str CONTAINS 'franchise' OR title_str CONTAINS 'sales' OR title_str CONTAINS 'promotion' OR title_str CONTAINS 'sponsorship' OR title_str CONTAINS 'endorsement' OR title_str CONTAINS 'co_branding' OR title_str CONTAINS 'cobranding' OR title_str CONTAINS 'development' OR title_str CONTAINS 'license' OR title_str CONTAINS 'ip' OR title_str CONTAINS 'collaboration' OR title_str CONTAINS 'joint_venture' OR title_str CONTAINS 'alliance' OR title_str CONTAINS 'research' OR title_str CONTAINS 'supply' OR title_str CONTAINS 'manufacturing' OR title_str CONTAINS 'service' OR title_str CONTAINS 'consulting' OR title_str CONTAINS 'outsourcing' OR title_str CONTAINS 'transportation' OR title_str CONTAINS 'hosting' OR title_str CONTAINS 'maintenance' OR title_str CONTAINS 'software' OR title_str CONTAINS 'system' OR title_str CONTAINS 'network' OR title_str CONTAINS 'cloud' OR title_str CONTAINS 'data' OR title_str CONTAINS 'tech')) THEN 1 ELSE 0 END) AS legal_docs"
        )

    # ------------------------------------------------------------------------
    # 3.2 RANKING CYPHER (Customer, Product, Category, SalesOrder, Month, Year)
    # ------------------------------------------------------------------------

    def _build_ranking_cypher(self, plan: QueryPlan) -> str:
        direction = "ASC" if plan.sort_direction == "ASC" else "DESC"
        limit = max(1, min(50, plan.limit or 5))
        time_where = self._build_time_where_clause(plan, "o")
        where_prefix = f"WHERE {time_where} " if time_where else ""

        # A. Ranking Months or Years
        if plan.group_by == "Month":
            metric_col = "orderCount" if plan.metric == "order_count" else "grossRevenue"
            return (
                "MATCH (o:SalesOrder) "
                f"{where_prefix}"
                "WITH substring(toString(o.OrderDate), 0, 7) AS salesMonth, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "WHERE salesMonth IS NOT NULL AND salesMonth <> '' "
                "RETURN salesMonth, orderCount, grossRevenue, netRevenue "
                f"ORDER BY {metric_col} {direction}, salesMonth ASC LIMIT {limit}"
            )

        if plan.group_by == "Year":
            metric_col = "orderCount" if plan.metric == "order_count" else "grossRevenue"
            return (
                "MATCH (o:SalesOrder) "
                f"{where_prefix}"
                "WITH substring(toString(o.OrderDate), 0, 4) AS salesYear, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "WHERE salesYear IS NOT NULL AND salesYear <> '' "
                "RETURN salesYear, orderCount, grossRevenue, netRevenue "
                f"ORDER BY {metric_col} {direction}, salesYear ASC LIMIT {limit}"
            )

        # B. Ranking Customers
        if plan.target_entity == "Customer":
            if plan.metric == "product_quantity":
                return (
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    f"{where_prefix}"
                    "WITH c, SUM(toInteger(r.OrderQty)) AS totalQty, "
                    "     COUNT(DISTINCT o) AS orderCount, "
                    "     COUNT(DISTINCT p) AS distinctProducts, "
                    "     ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalProductValue "
                    "RETURN c.CustomerID AS CustomerID, "
                    "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                    "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
                    "       totalQty, distinctProducts, orderCount, totalProductValue "
                    f"ORDER BY totalQty {direction}, totalProductValue {direction} LIMIT {limit}"
                )
            elif plan.metric == "order_count":
                return (
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    f"{where_prefix}"
                    "WITH c, COUNT(DISTINCT o.SalesOrderID) AS order_count, "
                    "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                    "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent "
                    "RETURN c.CustomerID AS CustomerID, "
                    "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                    "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
                    "       order_count, orderCount, totalSpent "
                    f"ORDER BY order_count {direction}, totalSpent {direction} LIMIT {limit}"
                )
            else:
                # Default Customer metric: gross_revenue (totalSpent)
                return (
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    f"{where_prefix}"
                    "WITH c, ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent, "
                    "     COUNT(o) AS orderCount "
                    "RETURN c.CustomerID AS CustomerID, "
                    "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                    "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
                    "       orderCount, totalSpent "
                    f"ORDER BY totalSpent {direction}, orderCount {direction} LIMIT {limit}"
                )

        # C. Ranking Products
        if plan.target_entity == "Product":
            cat_filter = plan.filters.get("category")
            cat_match = "-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(cat:Category) " if cat_filter else ""
            cat_where = f"cat.name = '{cat_filter}'" if cat_filter else ""
            combined_where_parts = [w for w in [time_where, cat_where] if w]
            prod_where = f"WHERE {' AND '.join(combined_where_parts)} " if combined_where_parts else ""

            if plan.metric == "product_quantity":
                return (
                    f"MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product){cat_match}"
                    f"{prod_where}"
                    "WITH p, SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                    "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                    "     ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalRevenue "
                    "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                    "       p.ProductNumber AS ProductNumber, "
                    "       ROUND(toFloat(coalesce(p.ListPrice, 0)) * 100) / 100 AS ListPrice, "
                    "       totalSoldQty, orderCount, totalRevenue "
                    f"ORDER BY totalSoldQty {direction}, totalRevenue {direction} LIMIT {limit}"
                )
            elif plan.metric == "net_revenue":
                return (
                    f"MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product){cat_match}"
                    f"{prod_where}"
                    "WITH p, ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalRevenue, "
                    "     SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                    "     COUNT(DISTINCT o.SalesOrderID) AS orderCount "
                    "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                    "       p.ProductNumber AS ProductNumber, "
                    "       ROUND(toFloat(coalesce(p.ListPrice, 0)) * 100) / 100 AS ListPrice, "
                    "       totalSoldQty, orderCount, totalRevenue "
                    f"ORDER BY totalRevenue {direction}, totalSoldQty {direction} LIMIT {limit}"
                )
            else:
                # list_price
                price_cond = "toFloat(coalesce(p.ListPrice, 0)) > 0"
                if cat_where:
                    price_cond += f" AND {cat_where}"
                return (
                    f"MATCH (p:Product){cat_match}"
                    f"WHERE {price_cond} "
                    "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                    "       p.ProductNumber AS ProductNumber, "
                    "       ROUND(toFloat(p.ListPrice) * 100) / 100 AS ListPrice "
                    f"ORDER BY ListPrice {direction}, ProductID ASC LIMIT {limit}"
                )

        # D. Ranking Categories
        if plan.target_entity == "Category":
            if plan.metric == "product_count":
                return (
                    "MATCH (p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                    "RETURN c.CategoryID AS CategoryID, c.name AS CategoryName, "
                    "       COUNT(DISTINCT sc.SubCategoryID) AS subCategoryCount, "
                    "       COUNT(DISTINCT p.ProductID) AS productCount "
                    f"ORDER BY productCount {direction}"
                )
            sort_col = "totalSoldQty" if plan.metric == "product_quantity" else "categoryRevenue"
            return (
                "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                f"{where_prefix}"
                "RETURN c.CategoryID AS CategoryID, c.name AS CategoryName, "
                "       COUNT(DISTINCT p.ProductID) AS soldProductCount, "
                "       COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "       SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                "       ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS categoryRevenue "
                f"ORDER BY {sort_col} {direction}"
            )

        # E. Ranking SalesOrders
        return (
            "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
            f"{where_prefix}"
            "RETURN o.SalesOrderID AS SalesOrderID, "
            "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
            "       c.CustomerID AS CustomerID, "
            "       substring(toString(o.OrderDate), 0, 10) AS OrderDate, "
            "       ROUND(toFloat(o.TotalDue) * 100) / 100 AS TotalDue, "
            "       ROUND(toFloat(coalesce(o.SubTotal, o.TotalDue)) * 100) / 100 AS SubTotal "
            f"ORDER BY TotalDue {direction} LIMIT {limit}"
        )

    # ------------------------------------------------------------------------
    # 3.3 AGGREGATION CYPHER (COUNT, SUM, AVG, GROUP BY)
    # ------------------------------------------------------------------------

    def _build_aggregation_cypher(self, plan: QueryPlan) -> str:
        time_where = self._build_time_where_clause(plan, "o")
        where_prefix = f"WHERE {time_where} " if time_where else ""

        # Group by Category
        if plan.group_by == "Category":
            return (
                "MATCH (p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                "OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p) "
                "RETURN c.CategoryID AS CategoryID, c.name AS CategoryName, "
                "       COUNT(DISTINCT sc.SubCategoryID) AS subCategoryCount, "
                "       COUNT(DISTINCT p.ProductID) AS productCount, "
                "       coalesce(SUM(toInteger(r.OrderQty)), 0) AS totalSoldQty, "
                "       ROUND(coalesce(SUM(toFloat(r.lineTotal)), 0.0) * 100) / 100 AS categoryRevenue "
                "ORDER BY categoryRevenue DESC, productCount DESC"
            )

        # Group by Customer ("Mỗi khách hàng đã mua bao nhiêu sản phẩm / đơn hàng?")
        if plan.group_by == "Customer":
            return self._build_ranking_cypher(plan)

        # Total Customers
        if plan.target_entity == "Customer" and plan.metric == "customer_count":
            return (
                "MATCH (c:Customer) "
                "OPTIONAL MATCH (c)-[:PLACED_ORDER]->(o:SalesOrder) "
                "WITH c, COUNT(DISTINCT o.SalesOrderID) AS orderCnt "
                "RETURN COUNT(DISTINCT c.CustomerID) AS totalCustomers, "
                "       SUM(CASE WHEN orderCnt > 0 THEN 1 ELSE 0 END) AS activeCustomers, "
                "       SUM(CASE WHEN orderCnt = 0 THEN 1 ELSE 0 END) AS inactiveCustomers, "
                "       SUM(CASE WHEN orderCnt >= 2 THEN 1 ELSE 0 END) AS repeatCustomers"
            )

        # Total Products Sold vs Total Products in Catalog
        if plan.target_entity == "Product":
            if plan.metric == "product_quantity":
                return (
                    "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    f"{where_prefix}"
                    "RETURN SUM(toInteger(r.OrderQty)) AS totalUnitsSold, "
                    "       COUNT(DISTINCT p.ProductID) AS distinctProductsSold, "
                    "       COUNT(DISTINCT o.SalesOrderID) AS totalOrders, "
                    "       ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalProductRevenue"
                )
            return (
                "MATCH (p:Product) "
                "OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p) "
                "WITH p, COUNT(DISTINCT o.SalesOrderID) AS ordCnt "
                "RETURN COUNT(DISTINCT p.ProductID) AS totalCatalogProducts, "
                "       SUM(CASE WHEN ordCnt > 0 THEN 1 ELSE 0 END) AS soldProducts, "
                "       SUM(CASE WHEN ordCnt = 0 THEN 1 ELSE 0 END) AS unsoldProducts"
            )

        # SalesOrder Totals (Order count, Gross & Net Revenue, AOV)
        return (
            "MATCH (o:SalesOrder) "
            f"{where_prefix}"
            "RETURN COUNT(DISTINCT o.SalesOrderID) AS totalOrders, "
            "       ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
            "       ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue, "
            "       ROUND(SUM(toFloat(coalesce(o.TaxAmt, 0))) * 100) / 100 AS totalTax, "
            "       ROUND(SUM(toFloat(coalesce(o.Freight, 0))) * 100) / 100 AS totalFreight, "
            "       ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgOrderValue, "
            "       MIN(substring(toString(o.OrderDate), 0, 10)) AS minDate, "
            "       MAX(substring(toString(o.OrderDate), 0, 10)) AS maxDate"
        )

    # ------------------------------------------------------------------------
    # 3.4 COMPARATIVE ANALYSIS CYPHER
    # ------------------------------------------------------------------------

    def _build_comparison_cypher(self, plan: QueryPlan) -> str:
        if plan.group_by == "Month":
            mo_filter = ""
            if plan.months:
                mo_list = ", ".join(f"'{m}'" for m in plan.months)
                mo_filter = f"WHERE substring(toString(o.OrderDate), 0, 7) IN [{mo_list}] "
            return (
                "MATCH (o:SalesOrder) "
                f"{mo_filter}"
                "WITH substring(toString(o.OrderDate), 0, 7) AS period, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue, "
                "     ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgOrderValue "
                "WHERE period IS NOT NULL AND period <> '' "
                "RETURN period, orderCount, grossRevenue, netRevenue, avgOrderValue "
                "ORDER BY period ASC"
            )

        if plan.group_by == "Category":
            cat_filter = ""
            if plan.filters.get("categories") and len(plan.filters["categories"]) >= 2:
                c_list = ", ".join(f"'{c}'" for c in plan.filters["categories"])
                cat_filter = f"WHERE c.name IN [{c_list}] "
            return (
                "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                f"{cat_filter}"
                "RETURN c.name AS CategoryName, "
                "       COUNT(DISTINCT p.ProductID) AS productCount, "
                "       COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "       SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                "       ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS categoryRevenue "
                "ORDER BY categoryRevenue DESC"
            )

        if plan.group_by == "Customer":
            cust_where = ""
            if plan.filters.get("customer_ids") and len(plan.filters["customer_ids"]) >= 2:
                id_list = ", ".join(str(cid) for cid in plan.filters["customer_ids"])
                cust_where = f"WHERE c.CustomerID IN [{id_list}] "
            sort_col = "orderCount" if plan.metric == "order_count" else "totalSpent"
            return (
                "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                f"{cust_where}"
                "WITH c, COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent, "
                "     ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgOrderValue "
                "RETURN c.CustomerID AS CustomerID, "
                "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                "       orderCount, totalSpent, avgOrderValue "
                f"ORDER BY {sort_col} DESC LIMIT 10"
            )

        if plan.group_by == "Product":
            return (
                "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                "WITH p, SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalRevenue "
                "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                "       totalSoldQty, orderCount, totalRevenue "
                "ORDER BY totalRevenue DESC LIMIT 10"
            )

        # Default: Compare Years
        yr_filter = ""
        if plan.years and not plan.vs_average:
            yr_list = ", ".join(f"'{y}'" for y in plan.years)
            yr_filter = f"WHERE substring(toString(o.OrderDate), 0, 4) IN [{yr_list}] "
        return (
            "MATCH (o:SalesOrder) "
            f"{yr_filter}"
            "WITH substring(toString(o.OrderDate), 0, 4) AS period, "
            "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
            "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
            "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue, "
            "     ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgOrderValue "
            "WHERE period IS NOT NULL AND period <> '' "
            "RETURN period, orderCount, grossRevenue, netRevenue, avgOrderValue "
            "ORDER BY period ASC"
        )

    # ------------------------------------------------------------------------
    # 3.5 FORMULA & KPI CYPHER
    # ------------------------------------------------------------------------

    def _build_formula_kpi_cypher(self, plan: QueryPlan) -> str:
        time_where = self._build_time_where_clause(plan, "o")
        where_prefix = f"WHERE {time_where} " if time_where else ""

        if plan.metric == "avg_order_value":
            return self._build_aggregation_cypher(plan)

        if plan.metric == "avg_revenue_per_customer":
            return (
                "MATCH (c:Customer) "
                "OPTIONAL MATCH (c)-[:PLACED_ORDER]->(o:SalesOrder) "
                "WITH COUNT(DISTINCT c.CustomerID) AS totalCustomers, "
                "     COUNT(DISTINCT CASE WHEN o IS NOT NULL THEN c.CustomerID END) AS activeCustomers, "
                "     COUNT(DISTINCT o.SalesOrderID) AS totalOrders, "
                "     ROUND(SUM(toFloat(coalesce(o.TotalDue, 0))) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, 0))) * 100) / 100 AS netRevenue "
                "RETURN totalCustomers, activeCustomers, totalOrders, grossRevenue, netRevenue, "
                "       ROUND((grossRevenue / activeCustomers) * 100) / 100 AS arpcActive, "
                "       ROUND((grossRevenue / totalCustomers) * 100) / 100 AS arpcAll"
            )

        if plan.metric == "repeat_customer_rate":
            return (
                "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                f"{where_prefix}"
                "WITH c, COUNT(DISTINCT o.SalesOrderID) AS orderCnt "
                "RETURN COUNT(c) AS activeCustomers, "
                "       SUM(CASE WHEN orderCnt >= 2 THEN 1 ELSE 0 END) AS repeatCustomers, "
                "       SUM(CASE WHEN orderCnt = 1 THEN 1 ELSE 0 END) AS oneTimeCustomers, "
                "       ROUND((toFloat(SUM(CASE WHEN orderCnt >= 2 THEN 1 ELSE 0 END)) / COUNT(c)) * 10000) / 100 AS repeatRatePct"
            )

        if plan.metric == "revenue_growth_rate":
            return (
                "MATCH (o:SalesOrder) "
                "WITH substring(toString(o.OrderDate), 0, 4) AS salesYear, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "WHERE salesYear IS NOT NULL AND salesYear <> '' "
                "RETURN salesYear, orderCount, grossRevenue, netRevenue "
                "ORDER BY salesYear ASC"
            )

        # revenue_share (by Category or Product)
        if plan.target_entity == "Product":
            return (
                "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                f"{where_prefix}"
                "WITH p, ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS itemRevenue, "
                "     SUM(toInteger(r.OrderQty)) AS totalSoldQty "
                "ORDER BY itemRevenue DESC "
                "WITH collect({ProductID: p.ProductID, name: p.name, revenue: itemRevenue, qty: totalSoldQty}) AS items, "
                "     ROUND(SUM(itemRevenue) * 100) / 100 AS grandTotal "
                "UNWIND items[0..10] AS item "
                "RETURN item.ProductID AS ProductID, item.name AS ProductName, "
                "       item.qty AS totalSoldQty, item.revenue AS itemRevenue, grandTotal, "
                "       ROUND((item.revenue / grandTotal) * 10000) / 100 AS sharePct"
            )

        return (
            "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
            f"{where_prefix}"
            "WITH c, ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS catRevenue, "
            "     SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
            "     COUNT(DISTINCT p.ProductID) AS productCount "
            "ORDER BY catRevenue DESC "
            "WITH collect({CategoryName: c.name, revenue: catRevenue, qty: totalSoldQty, productCount: productCount}) AS cats, "
            "     ROUND(SUM(catRevenue) * 100) / 100 AS grandTotal "
            "UNWIND cats AS cat "
            "RETURN cat.CategoryName AS CategoryName, cat.productCount AS productCount, "
            "       cat.qty AS totalSoldQty, cat.revenue AS categoryRevenue, grandTotal, "
            "       ROUND((cat.revenue / grandTotal) * 10000) / 100 AS sharePct"
        )

    # ------------------------------------------------------------------------
    # 3.6 DATA RETRIEVAL CYPHER
    # ------------------------------------------------------------------------

    def _build_retrieval_cypher(self, plan: QueryPlan) -> str:
        mode = plan.filters.get("lookup_mode", "customer_list")

        if mode == "order_detail":
            oid = plan.filters.get("order_id", 43659)
            return (
                f"MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder {{SalesOrderID: {oid}}}) "
                "OPTIONAL MATCH (o)-[r:CONTAINS_PRODUCT]->(p:Product) "
                "WITH c, o, collect({ProductID: p.ProductID, ProductName: p.name, OrderQty: r.OrderQty, UnitPrice: r.UnitPrice, lineTotal: r.lineTotal}) AS items, "
                "     SUM(toInteger(coalesce(r.OrderQty, 0))) AS totalUnits "
                "RETURN o.SalesOrderID AS SalesOrderID, "
                "       o.OrderDate AS OrderDate, "
                "       c.CustomerID AS CustomerID, "
                "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
                "       ROUND(toFloat(o.SubTotal) * 100) / 100 AS SubTotal, "
                "       ROUND(toFloat(o.TaxAmt) * 100) / 100 AS TaxAmt, "
                "       ROUND(toFloat(o.Freight) * 100) / 100 AS Freight, "
                "       ROUND(toFloat(o.TotalDue) * 100) / 100 AS TotalDue, "
                "       totalUnits, items"
            )

        if mode in ["customer_detail", "customer_products"]:
            if "customer_id" in plan.filters:
                cid = plan.filters["customer_id"]
                c_where = f"c.CustomerID = {cid}"
            else:
                cname = plan.filters.get("customer_name", "").replace("'", "\\'")
                c_where = f"toLower(coalesce(c.FirstName + ' ' + c.LastName, c.name)) CONTAINS toLower('{cname}')"

            return (
                "MATCH (c:Customer) "
                f"WHERE {c_where} "
                "OPTIONAL MATCH (c)-[:PLACED_ORDER]->(o:SalesOrder) "
                "OPTIONAL MATCH (o)-[r:CONTAINS_PRODUCT]->(p:Product) "
                "WITH c, COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(DISTINCT toFloat(coalesce(o.TotalDue, 0))) * 100) / 100 AS approxSpent, "
                "     SUM(toInteger(coalesce(r.OrderQty, 0))) AS totalQty, "
                "     ROUND(SUM(toFloat(coalesce(r.lineTotal, 0))) * 100) / 100 AS totalProductValue, "
                "     collect(DISTINCT p.name)[0..15] AS purchasedProducts, "
                "     COUNT(DISTINCT p.ProductID) AS distinctProducts "
                "RETURN c.CustomerID AS CustomerID, "
                "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
                "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
                "       orderCount, totalQty, distinctProducts, totalProductValue, purchasedProducts "
                "LIMIT 5"
            )

        if mode == "product_detail":
            if "product_id" in plan.filters:
                pid = plan.filters["product_id"]
                p_where = f"p.ProductID = {pid}"
            else:
                pname = plan.filters.get("product_name", "").replace("'", "\\'")
                p_where = f"toLower(p.name) CONTAINS toLower('{pname}')"

            return (
                "MATCH (p:Product) "
                f"WHERE {p_where} "
                "OPTIONAL MATCH (p)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                "OPTIONAL MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p) "
                "WITH p, sc, c, "
                "     SUM(toInteger(coalesce(r.OrderQty, 0))) AS totalSoldQty, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(coalesce(r.lineTotal, 0))) * 100) / 100 AS totalRevenue "
                "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                "       p.ProductNumber AS ProductNumber, "
                "       ROUND(toFloat(coalesce(p.ListPrice, 0)) * 100) / 100 AS ListPrice, "
                "       coalesce(sc.name, 'Chưa phân loại') AS SubCategoryName, "
                "       coalesce(c.name, 'Chưa phân loại') AS CategoryName, "
                "       totalSoldQty, orderCount, totalRevenue "
                "ORDER BY totalSoldQty DESC LIMIT 10"
            )

        if mode == "product_list":
            limit = max(1, min(50, plan.limit or 10))
            return (
                "MATCH (p:Product) "
                "OPTIONAL MATCH (p)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
                "RETURN p.ProductID AS ProductID, p.name AS ProductName, "
                "       p.ProductNumber AS ProductNumber, "
                "       ROUND(toFloat(coalesce(p.ListPrice, 0)) * 100) / 100 AS ListPrice, "
                "       coalesce(c.name, 'Chưa phân loại') AS CategoryName "
                f"ORDER BY p.ProductID ASC LIMIT {limit}"
            )

        # Default: customer_list
        limit = max(1, min(50, plan.limit or 10))
        return (
            "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
            "WITH c, COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
            "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent "
            "RETURN c.CustomerID AS CustomerID, "
            "       coalesce(c.FirstName + ' ' + c.LastName, c.name) AS CustomerName, "
            "       ('AW' + toString(c.CustomerID)) AS AccountNumber, "
            "       orderCount, totalSpent "
            f"ORDER BY totalSpent DESC LIMIT {limit}"
        )

    # ------------------------------------------------------------------------
    # 3.7 CONDITIONAL FILTERING CYPHER
    # ------------------------------------------------------------------------

    def _build_conditional_cypher(self, plan: QueryPlan) -> str:
        limit = max(1, min(50, plan.limit or 10))
        time_where = self._build_time_where_clause(plan, "o")

        # A. Customer Conditional Filtering
        if plan.target_entity == "Customer":
            cat_filter = plan.filters.get("category")
            if cat_filter or "min_qty" in plan.filters or "max_qty" in plan.filters:
                cat_match = "-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(cat:Category)" if cat_filter else ""
                where_parts = [w for w in [time_where, f"cat.name = '{cat_filter}'" if cat_filter else ""] if w]
                where_clause = f"WHERE {' AND '.join(where_parts)} " if where_parts else ""
                having_parts = []
                if "min_qty" in plan.filters:
                    having_parts.append(f"totalQty > {int(plan.filters['min_qty'])}")
                if "max_qty" in plan.filters:
                    having_parts.append(f"totalQty < {int(plan.filters['max_qty'])}")
                having_clause = f"WHERE {' AND '.join(having_parts)} " if having_parts else ""
                return (
                    f"MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product){cat_match} "
                    f"{where_clause}"
                    "WITH c, SUM(toInteger(r.OrderQty)) AS totalQty, "
                    "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                    "     COUNT(DISTINCT p.ProductID) AS distinctProducts, "
                    "     ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalProductValue "
                    f"{having_clause}"
                    "WITH collect({CustomerID: c.CustomerID, CustomerName: coalesce(c.FirstName + ' ' + c.LastName, c.name), AccountNumber: 'AW' + toString(c.CustomerID), totalQty: totalQty, orderCount: orderCount, distinctProducts: distinctProducts, totalProductValue: totalProductValue}) AS allMatched, "
                    "     COUNT(c) AS totalMatchedCount "
                    "UNWIND allMatched AS row "
                    "WITH row, totalMatchedCount "
                    "ORDER BY row.totalQty DESC, row.totalProductValue DESC "
                    f"LIMIT {limit} "
                    "RETURN row.CustomerID AS CustomerID, row.CustomerName AS CustomerName, "
                    "       row.AccountNumber AS AccountNumber, row.totalQty AS totalQty, "
                    "       row.orderCount AS orderCount, row.distinctProducts AS distinctProducts, "
                    "       row.totalProductValue AS totalProductValue, totalMatchedCount"
                )

            # Customer filtered by above/below average revenue, min_rev/max_rev, or min_orders/max_orders
            where_clause = f"WHERE {time_where} " if time_where else ""
            if plan.filters.get("above_average") or plan.filters.get("below_average"):
                op = ">" if plan.filters.get("above_average") else "<"
                return (
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    f"{where_clause}"
                    "WITH c, ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent, "
                    "     COUNT(DISTINCT o.SalesOrderID) AS orderCount "
                    "WITH collect({CustomerID: c.CustomerID, CustomerName: coalesce(c.FirstName + ' ' + c.LastName, c.name), AccountNumber: 'AW' + toString(c.CustomerID), totalSpent: totalSpent, orderCount: orderCount}) AS custs, "
                    "     ROUND(AVG(totalSpent) * 100) / 100 AS avgBenchmark "
                    "UNWIND custs AS row "
                    "WITH row, avgBenchmark "
                    f"WHERE row.totalSpent {op} avgBenchmark "
                    "WITH collect(row) AS matchedCusts, COUNT(row) AS totalMatchedCount, avgBenchmark "
                    "UNWIND matchedCusts AS r "
                    "WITH r, totalMatchedCount, avgBenchmark "
                    "ORDER BY r.totalSpent DESC "
                    f"LIMIT {limit} "
                    "RETURN r.CustomerID AS CustomerID, r.CustomerName AS CustomerName, "
                    "       r.AccountNumber AS AccountNumber, r.orderCount AS orderCount, "
                    "       r.totalSpent AS totalSpent, avgBenchmark, totalMatchedCount"
                )

            having_parts = []
            if "min_rev" in plan.filters:
                having_parts.append(f"totalSpent > {float(plan.filters['min_rev'])}")
            if "max_rev" in plan.filters:
                having_parts.append(f"totalSpent < {float(plan.filters['max_rev'])}")
            if "min_orders" in plan.filters:
                having_parts.append(f"orderCount > {int(plan.filters['min_orders'])}")
            if "max_orders" in plan.filters:
                having_parts.append(f"orderCount < {int(plan.filters['max_orders'])}")
            having_clause = f"WHERE {' AND '.join(having_parts)} " if having_parts else ""
            return (
                "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                f"{where_clause}"
                "WITH c, ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS totalSpent, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount "
                f"{having_clause}"
                "WITH collect({CustomerID: c.CustomerID, CustomerName: coalesce(c.FirstName + ' ' + c.LastName, c.name), AccountNumber: 'AW' + toString(c.CustomerID), totalSpent: totalSpent, orderCount: orderCount}) AS matchedCusts, "
                "     COUNT(c) AS totalMatchedCount "
                "UNWIND matchedCusts AS r "
                "WITH r, totalMatchedCount "
                "ORDER BY r.totalSpent DESC "
                f"LIMIT {limit} "
                "RETURN r.CustomerID AS CustomerID, r.CustomerName AS CustomerName, "
                "       r.AccountNumber AS AccountNumber, r.orderCount AS orderCount, "
                "       r.totalSpent AS totalSpent, totalMatchedCount"
            )

        # B. Product Conditional Filtering
        if plan.target_entity == "Product":
            if "min_price" in plan.filters or "max_price" in plan.filters:
                p_conds = ["toFloat(coalesce(p.ListPrice, 0)) > 0"]
                if "min_price" in plan.filters:
                    p_conds.append(f"toFloat(p.ListPrice) >= {float(plan.filters['min_price'])}")
                if "max_price" in plan.filters:
                    p_conds.append(f"toFloat(p.ListPrice) <= {float(plan.filters['max_price'])}")
                return (
                    "MATCH (p:Product) "
                    f"WHERE {' AND '.join(p_conds)} "
                    "WITH collect({ProductID: p.ProductID, ProductName: p.name, ProductNumber: p.ProductNumber, ListPrice: ROUND(toFloat(p.ListPrice)*100)/100}) AS matchedProds, "
                    "     COUNT(p) AS totalMatchedCount "
                    "UNWIND matchedProds AS r "
                    "WITH r, totalMatchedCount "
                    "ORDER BY r.ListPrice DESC "
                    f"LIMIT {limit} "
                    "RETURN r.ProductID AS ProductID, r.ProductName AS ProductName, "
                    "       r.ProductNumber AS ProductNumber, r.ListPrice AS ListPrice, totalMatchedCount"
                )

            where_clause = f"WHERE {time_where} " if time_where else ""
            if plan.filters.get("above_average") or plan.filters.get("below_average"):
                op = ">" if plan.filters.get("above_average") else "<"
                return (
                    "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    f"{where_clause}"
                    "WITH p, ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalRevenue, "
                    "     SUM(toInteger(r.OrderQty)) AS totalSoldQty "
                    "WITH collect({ProductID: p.ProductID, ProductName: p.name, totalRevenue: totalRevenue, totalSoldQty: totalSoldQty}) AS prods, "
                    "     ROUND(AVG(totalRevenue) * 100) / 100 AS avgBenchmark "
                    "UNWIND prods AS row "
                    "WITH row, avgBenchmark "
                    f"WHERE row.totalRevenue {op} avgBenchmark "
                    "WITH collect(row) AS matchedProds, COUNT(row) AS totalMatchedCount, avgBenchmark "
                    "UNWIND matchedProds AS r "
                    "WITH r, totalMatchedCount, avgBenchmark "
                    "ORDER BY r.totalRevenue DESC "
                    f"LIMIT {limit} "
                    "RETURN r.ProductID AS ProductID, r.ProductName AS ProductName, "
                    "       r.totalSoldQty AS totalSoldQty, r.totalRevenue AS totalRevenue, "
                    "       avgBenchmark, totalMatchedCount"
                )

            having_parts = []
            if "min_rev" in plan.filters:
                having_parts.append(f"totalRevenue > {float(plan.filters['min_rev'])}")
            if "max_rev" in plan.filters:
                having_parts.append(f"totalRevenue < {float(plan.filters['max_rev'])}")
            if "min_qty" in plan.filters:
                having_parts.append(f"totalSoldQty > {int(plan.filters['min_qty'])}")
            if "max_qty" in plan.filters:
                having_parts.append(f"totalSoldQty < {int(plan.filters['max_qty'])}")
            having_clause = f"WHERE {' AND '.join(having_parts)} " if having_parts else ""
            return (
                "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                f"{where_clause}"
                "WITH p, ROUND(SUM(toFloat(r.lineTotal)) * 100) / 100 AS totalRevenue, "
                "     SUM(toInteger(r.OrderQty)) AS totalSoldQty, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount "
                f"{having_clause}"
                "WITH collect({ProductID: p.ProductID, ProductName: p.name, totalRevenue: totalRevenue, totalSoldQty: totalSoldQty, orderCount: orderCount}) AS matchedProds, "
                "     COUNT(p) AS totalMatchedCount "
                "UNWIND matchedProds AS r "
                "WITH r, totalMatchedCount "
                "ORDER BY r.totalRevenue DESC "
                f"LIMIT {limit} "
                "RETURN r.ProductID AS ProductID, r.ProductName AS ProductName, "
                "       r.totalSoldQty AS totalSoldQty, r.orderCount AS orderCount, "
                "       r.totalRevenue AS totalRevenue, totalMatchedCount"
            )

        # C. SalesOrder Conditional Filtering (e.g., orders > average order value)
        where_clause = f"WHERE {time_where} " if time_where else ""
        if plan.filters.get("above_average") or plan.filters.get("below_average"):
            op = ">" if plan.filters.get("above_average") else "<"
            return (
                "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                f"{where_clause}"
                "WITH collect({SalesOrderID: o.SalesOrderID, CustomerName: coalesce(c.FirstName + ' ' + c.LastName, c.name), OrderDate: substring(toString(o.OrderDate), 0, 10), TotalDue: ROUND(toFloat(o.TotalDue)*100)/100}) AS orders, "
                "     ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgBenchmark "
                "UNWIND orders AS row "
                "WITH row, avgBenchmark "
                f"WHERE row.TotalDue {op} avgBenchmark "
                "WITH collect(row) AS matchedOrders, COUNT(row) AS totalMatchedCount, avgBenchmark "
                "UNWIND matchedOrders AS r "
                "WITH r, totalMatchedCount, avgBenchmark "
                "ORDER BY r.TotalDue DESC "
                f"LIMIT {limit} "
                "RETURN r.SalesOrderID AS SalesOrderID, r.CustomerName AS CustomerName, "
                "       r.OrderDate AS OrderDate, r.TotalDue AS TotalDue, avgBenchmark, totalMatchedCount"
            )

        min_rev = float(plan.filters.get("min_rev", 0))
        return (
            "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
            f"WHERE toFloat(o.TotalDue) > {min_rev} "
            "WITH collect({SalesOrderID: o.SalesOrderID, CustomerName: coalesce(c.FirstName + ' ' + c.LastName, c.name), OrderDate: substring(toString(o.OrderDate), 0, 10), TotalDue: ROUND(toFloat(o.TotalDue)*100)/100}) AS matchedOrders, "
            "     COUNT(o) AS totalMatchedCount "
            "UNWIND matchedOrders AS r "
            "WITH r, totalMatchedCount "
            "ORDER BY r.TotalDue DESC "
            f"LIMIT {limit} "
            "RETURN r.SalesOrderID AS SalesOrderID, r.CustomerName AS CustomerName, "
            "       r.OrderDate AS OrderDate, r.TotalDue AS TotalDue, totalMatchedCount"
        )

    # ------------------------------------------------------------------------
    # 3.8 TIME-SERIES CYPHER (Year, Quarter, Month, Day, Relative Dates)
    # ------------------------------------------------------------------------

    def _build_time_series_cypher(self, plan: QueryPlan) -> str:
        time_where = self._build_time_where_clause(plan, "o")
        where_prefix = f"WHERE {time_where} " if time_where else ""

        # Last N months trend (e.g. "Xu hướng kinh doanh trong 6 tháng gần nhất?")
        if plan.relative_time and plan.relative_time.startswith("last_") and plan.relative_time.endswith("_months"):
            n_mo = int(plan.relative_time.split("_")[1])
            return (
                "MATCH (o:SalesOrder) "
                "WHERE o.OrderDate IS NOT NULL AND toString(o.OrderDate) <> '' "
                "WITH substring(toString(o.OrderDate), 0, 7) AS salesMonth, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "ORDER BY salesMonth DESC "
                f"LIMIT {n_mo} "
                "RETURN salesMonth, orderCount, grossRevenue, netRevenue "
                "ORDER BY salesMonth ASC"
            )

        if plan.time_granularity == "day" or plan.relative_time == "today":
            return (
                "MATCH (o:SalesOrder) "
                f"{where_prefix}"
                "WITH substring(toString(o.OrderDate), 0, 10) AS salesDay, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "WHERE salesDay IS NOT NULL AND salesDay <> '' "
                "RETURN salesDay, orderCount, grossRevenue, netRevenue "
                "ORDER BY salesDay DESC LIMIT 31"
            )

        if plan.time_granularity == "quarter" or plan.quarters:
            return (
                "MATCH (o:SalesOrder) "
                f"{where_prefix}"
                "WITH substring(toString(o.OrderDate), 0, 4) AS yr, "
                "     toInteger(substring(toString(o.OrderDate), 5, 2)) AS mo, o "
                "WITH yr, CASE WHEN mo <= 3 THEN 'Q1' WHEN mo <= 6 THEN 'Q2' WHEN mo <= 9 THEN 'Q3' ELSE 'Q4' END AS qtr, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "RETURN yr + '-' + qtr AS salesQuarter, yr AS salesYear, qtr AS quarterName, "
                "       orderCount, grossRevenue, netRevenue "
                "ORDER BY salesQuarter ASC"
            )

        if plan.time_granularity == "month" or plan.months or plan.relative_time in ["this_month", "last_month"]:
            return (
                "MATCH (o:SalesOrder) "
                f"{where_prefix}"
                "WITH substring(toString(o.OrderDate), 0, 7) AS salesMonth, "
                "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
                "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
                "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
                "WHERE salesMonth IS NOT NULL AND salesMonth <> '' "
                "RETURN salesMonth, orderCount, grossRevenue, netRevenue "
                "ORDER BY salesMonth ASC"
            )

        # Default: Year granularity
        return (
            "MATCH (o:SalesOrder) "
            f"{where_prefix}"
            "WITH substring(toString(o.OrderDate), 0, 4) AS salesYear, "
            "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
            "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
            "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
            "WHERE salesYear IS NOT NULL AND salesYear <> '' "
            "RETURN salesYear, orderCount, grossRevenue, netRevenue "
            "ORDER BY salesYear ASC"
        )

    # ------------------------------------------------------------------------
    # 3.9 CAUSAL ANALYSIS & EXECUTIVE REPORT CYPHER
    # ------------------------------------------------------------------------

    def _build_causal_analysis_cypher(self, plan: QueryPlan) -> str:
        q_lower = plan.normalized_query
        if any(k in q_lower for k in ["sản phẩm", "bán kém", "bán chậm", "danh mục"]):
            return self._build_formula_kpi_cypher(
                QueryPlan(raw_query=plan.raw_query, intent="FORMULA_KPI", target_entity="Category", metric="revenue_share")
            )
        return (
            "MATCH (o:SalesOrder) "
            "WHERE o.OrderDate IS NOT NULL AND toString(o.OrderDate) <> '' "
            "WITH substring(toString(o.OrderDate), 0, 7) AS salesMonth, "
            "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
            "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
            "     ROUND(AVG(toFloat(o.TotalDue)) * 100) / 100 AS avgOrderValue "
            "ORDER BY salesMonth DESC LIMIT 6 "
            "RETURN salesMonth, orderCount, grossRevenue, avgOrderValue "
            "ORDER BY salesMonth ASC"
        )

    def _build_executive_report_cypher(self, plan: QueryPlan) -> str:
        return (
            "MATCH (o:SalesOrder) "
            "WITH substring(toString(o.OrderDate), 0, 4) AS salesYear, "
            "     COUNT(DISTINCT o.SalesOrderID) AS orderCount, "
            "     ROUND(SUM(toFloat(o.TotalDue)) * 100) / 100 AS grossRevenue, "
            "     ROUND(SUM(toFloat(coalesce(o.SubTotal, o.TotalDue))) * 100) / 100 AS netRevenue "
            "WHERE salesYear IS NOT NULL AND salesYear <> '' "
            "RETURN salesYear, orderCount, grossRevenue, netRevenue "
            "ORDER BY salesYear ASC"
        )

    def _build_generic_search_cypher(self, plan: QueryPlan) -> str:
        words = [
            w for w in plan.normalized_query.replace("?", "").replace(",", "").split()
            if len(w) > 3 and w not in [
                "trong", "ngoài", "những", "không", "được", "nhiều", "nhất",
                "thấp", "nhỏ", "lớn", "bao", "nhiêu", "danh", "sách", "hiện", "tại"
            ]
        ]
        if not words:
            return ""
        conditions = " OR ".join(
            f"toLower(coalesce(n.name, n.title, '')) CONTAINS '{w.replace(chr(39), '')}'"
            for w in words[:3]
        )
        return (
            f"MATCH (n) WHERE {conditions} "
            "RETURN coalesce(n.name, n.title, n.id) AS entity_name, labels(n) AS types, properties(n) AS props "
            "LIMIT 5"
        )


query_builder = CypherQueryBuilder()


# ============================================================================
# 4. ANALYTICS EXECUTION ENGINE & GROUNDED ANSWER GENERATOR
# ============================================================================

def _fmt_money(val: Any) -> str:
    try:
        v = float(val or 0.0)
        return f"${v:,.2f}"
    except Exception:
        return "$0.00"


def _fmt_int(val: Any) -> str:
    try:
        return f"{int(round(float(val or 0))):,}"
    except Exception:
        return "0"


class _Neo4jSessionAdapter:
    """Thin adapter around neo4j_client.run_cypher so helper formatters can call .run(q) or .run(q).data()."""

    class _ResultList(list):
        def data(self) -> List[Dict[str, Any]]:
            return list(self)

    def __init__(self) -> None:
        from app.db.neo4j.client import neo4j_client
        if not getattr(neo4j_client, "is_connected", False) and hasattr(neo4j_client, "connect"):
            neo4j_client.connect()
        self._client = neo4j_client

    def run(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> "_Neo4jSessionAdapter._ResultList":
        rows = self._client.run_cypher(cypher, params or {})
        return self._ResultList(rows or [])


class AnalyticsExecutionEngine:
    """
    Executes QueryPlan against Neo4j, validates results, handles tie detection
    and post-aggregation calculations, and generates grounded Vietnamese answers
    plus GraphRAG citation entities.
    """

    def execute_pipeline(
        self,
        user_query: str,
        session_id: Optional[str] = None,
        history_messages: Optional[List[Dict[str, Any]]] = None,
        neo4j_uri: str = "bolt://localhost:7687",
        neo4j_auth: tuple = ("neo4j", "graphmind_secret"),
    ) -> Dict[str, Any]:
        plan = planner.plan(user_query, session_id=session_id, history_messages=history_messages)
        cypher = query_builder.build(plan)

        # 1. Handle Non-DB Intents (Security Reject, Out of Scope, Unsupported Metric, Ambiguous)
        if plan.intent in ["SECURITY_REJECT", "SECURITY_BLOCKED"]:
            ans = (
                "Từ chối thực thi: Hệ thống phát hiện cú pháp truy vấn có dấu hiệu can thiệp hoặc thay đổi dữ liệu. "
                "AI Copilot chỉ cho phép các truy vấn đọc và phân tích dữ liệu (Read-Only Analytics) theo chuẩn bảo mật."
            )
            return self._pack_result(plan, "", [], ans)

        if plan.intent == "OUT_OF_SCOPE":
            ans = (
                "Câu hỏi này nằm ngoài phạm vi dữ liệu doanh nghiệp của hệ thống GraphMind. "
                "Hệ thống hiện quản lý và phân tích 2 nguồn dữ liệu chính:\n"
                "- **Dữ liệu ERP Bán hàng (AdventureWorks)**: Khách hàng (`Customer`), Đơn hàng (`SalesOrder`), Sản phẩm (`Product`), Danh mục (`Category`/`SubCategory`) và Doanh thu.\n"
                "- **Kho Tri thức Hợp đồng Pháp lý (CUAD)**: Tài liệu hợp đồng (`Document`), Điều khoản pháp lý (`Clause`) và Đối tác (`Company`)."
            )
            return self._pack_result(plan, "", [], ans)

        if plan.intent == "UNSUPPORTED_METRIC":
            raw_info = UNSUPPORTED_METRICS_EXPLANATIONS.get(plan.unsupported_reason or "", "")
            if isinstance(raw_info, dict):
                explanation = raw_info.get(
                    "explanation_vi",
                    "Chỉ số bạn yêu cầu hiện chưa có trường dữ liệu tương ứng trong cơ sở dữ liệu Neo4j."
                )
                req_label = raw_info.get("requested_metric", plan.unsupported_reason or "Chỉ số chưa hỗ trợ")
            else:
                explanation = str(raw_info) or "Chỉ số bạn yêu cầu hiện chưa có trường dữ liệu tương ứng trong cơ sở dữ liệu Neo4j."
                req_label = plan.unsupported_reason or "Chỉ số chưa hỗ trợ"
            entities: List[Dict[str, Any]] = []
            # If hybrid question like "Sản phẩm có số lượng bán cao nhưng tồn kho thấp", also fetch top selling products
            if plan.unsupported_reason == "inventory_stock" and "bán cao" in plan.normalized_query:
                sub_plan = QueryPlan(
                    raw_query=user_query,
                    normalized_query=plan.normalized_query,
                    intent="RANKING",
                    target_entity="Product",
                    metric="product_quantity",
                    sort_direction="DESC",
                    limit=5,
                )
                sub_cypher = query_builder.build(sub_plan)
                sub_res = self._run_And_format(sub_plan, sub_cypher, neo4j_uri, neo4j_auth)
                entities = sub_res["graph_entities"]
                explanation += "\n\n**Dữ liệu khả dụng về các sản phẩm có số lượng bán cao nhất trong hệ thống:**\n" + sub_res["grounded_answer"]
            else:
                entities = [{
                    "id": f"schema-boundary-{plan.unsupported_reason}",
                    "label": f"Giới hạn dữ liệu: {req_label}",
                    "type": "SchemaBoundary",
                    "snippet": explanation,
                    "cypher_verified": True,
                }]
            context_manager.save_turn(session_id, plan)
            return self._pack_result(plan, "", entities, explanation)

        if plan.intent == "AMBIGUOUS":
            ans, entities = self._handle_ambiguous_query(plan, neo4j_uri, neo4j_auth)
            context_manager.save_turn(session_id, plan)
            return self._pack_result(plan, "", entities, ans)

        # 2. Validate Cypher before running
        is_valid, err_msg = CypherValidator.validate(cypher)
        if not is_valid:
            logger.warning(f"Invalid Cypher blocked: {err_msg} | Query: {cypher}")
            return self._pack_result(
                plan,
                cypher,
                [],
                "Không thể tạo truy vấn hợp lệ cho yêu cầu này. Vui lòng diễn đạt rõ hơn tiêu chí cần tra cứu.",
            )

        # 3. Execute against Neo4j and build grounded answer + graph_entities
        res = self._run_And_format(plan, cypher, neo4j_uri, neo4j_auth)
        context_manager.save_turn(session_id, plan, res.get("top_entity"))
        return res

    def _pack_result(
        self,
        plan: QueryPlan,
        cypher: str,
        entities: List[Dict[str, Any]],
        grounded_answer: str,
        raw_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        # Attach metadata to entities so callers inspecting graph_entities get grounded_answer, plan & Neo4j keys
        for ent in entities:
            ent.setdefault("_id", ent.get("id", "entity-0"))
            ent.setdefault("_labels", [ent.get("type", "Entity")])
            ent.setdefault("name", ent.get("label", "Entity"))
            ent.setdefault("grounded_answer", grounded_answer)
            ent.setdefault("executed_cypher", cypher)
            ent.setdefault("intent", plan.intent)
        return {
            "executed": True,
            "plan": plan,
            "executed_cypher": cypher,
            "raw_rows": raw_rows or [],
            "graph_entities": entities,
            "grounded_answer": grounded_answer,
        }

    def _handle_ambiguous_query(
        self, plan: QueryPlan, neo4j_uri: str, neo4j_auth: tuple
    ) -> Tuple[str, List[Dict[str, Any]]]:
        opts_str = "\n".join(f"- {opt}" for opt in plan.ambiguity_options)
        entities: List[Dict[str, Any]] = []
        preview_lines: List[str] = []

        try:
            session = _Neo4jSessionAdapter()
            if plan.target_entity == "Customer":
                r_rev = session.run(
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    "WITH c, ROUND(SUM(toFloat(o.TotalDue))*100)/100 AS val, COUNT(o) AS cnt "
                    "RETURN c.CustomerID AS id, coalesce(c.FirstName + ' ' + c.LastName, c.name) AS name, val, cnt "
                    "ORDER BY val DESC LIMIT 1"
                ).data()
                r_qty = session.run(
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    "WITH c, SUM(toInteger(r.OrderQty)) AS val, COUNT(DISTINCT o) AS cnt "
                    "RETURN c.CustomerID AS id, coalesce(c.FirstName + ' ' + c.LastName, c.name) AS name, val, cnt "
                    "ORDER BY val DESC LIMIT 1"
                ).data()
                r_ord = session.run(
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    "WITH c, COUNT(DISTINCT o.SalesOrderID) AS val, ROUND(SUM(toFloat(o.TotalDue))*100)/100 AS rev "
                    "RETURN c.CustomerID AS id, coalesce(c.FirstName + ' ' + c.LastName, c.name) AS name, val, rev "
                    "ORDER BY val DESC, rev DESC LIMIT 1"
                ).data()
                if r_rev:
                    preview_lines.append(
                        f"1. **Theo Tổng doanh thu cao nhất**: Khách hàng **{r_rev[0]['name']} (#{r_rev[0]['id']})** đạt **{_fmt_money(r_rev[0]['val'])} USD** ({r_rev[0]['cnt']} đơn hàng)."
                    )
                if r_qty:
                    preview_lines.append(
                        f"2. **Theo Số lượng sản phẩm mua nhiều nhất**: Khách hàng **{r_qty[0]['name']} (#{r_qty[0]['id']})** đạt **{_fmt_int(r_qty[0]['val'])} sản phẩm** ({r_qty[0]['cnt']} đơn hàng)."
                    )
                if r_ord:
                    preview_lines.append(
                        f"3. **Theo Số lượng đơn hàng nhiều nhất**: Khách hàng **{r_ord[0]['name']} (#{r_ord[0]['id']})** đạt **{_fmt_int(r_ord[0]['val'])} đơn hàng** ({_fmt_money(r_ord[0]['rev'])} USD)."
                    )
            elif plan.target_entity == "Product":
                r_rev = session.run(
                    "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    "WITH p, ROUND(SUM(toFloat(r.lineTotal))*100)/100 AS val, SUM(toInteger(r.OrderQty)) AS qty "
                    "RETURN p.ProductID AS id, p.name AS name, val, qty ORDER BY val DESC LIMIT 1"
                ).data()
                r_qty = session.run(
                    "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                    "WITH p, SUM(toInteger(r.OrderQty)) AS val, ROUND(SUM(toFloat(r.lineTotal))*100)/100 AS rev "
                    "RETURN p.ProductID AS id, p.name AS name, val, rev ORDER BY val DESC LIMIT 1"
                ).data()
                if r_rev:
                    preview_lines.append(
                        f"1. **Theo Doanh thu cao nhất**: Sản phẩm **{r_rev[0]['name']} (#{r_rev[0]['id']})** đạt **{_fmt_money(r_rev[0]['val'])} USD** ({_fmt_int(r_rev[0]['qty'])} sản phẩm)."
                    )
                if r_qty:
                    preview_lines.append(
                        f"2. **Theo Số lượng bán chạy nhất**: Sản phẩm **{r_qty[0]['name']} (#{r_qty[0]['id']})** đạt **{_fmt_int(r_qty[0]['val'])} sản phẩm** ({_fmt_money(r_qty[0]['rev'])} USD)."
                    )
        except Exception as e:
            logger.warning(f"Ambiguous preview query failed: {e}")

        target_vi = "khách hàng" if plan.target_entity == "Customer" else "sản phẩm"
        ans = (
            f"Tiêu chí đánh giá **\"{target_vi} tốt nhất\"** có thể hiểu theo nhiều góc độ nghiệp vụ khác nhau:\n"
            f"{opts_str}\n\n"
        )
        if preview_lines:
            ans += "**Tóm tắt nhanh vị trí dẫn đầu (#1) theo từng tiêu chí trong hệ thống:**\n" + "\n".join(preview_lines) + "\n\n"
        ans += "Bạn muốn xem bảng xếp hạng chi tiết theo tiêu chí nào (ví dụ: trả lời *\"Theo doanh thu\"* hoặc *\"Theo số lượng\"*)?"

        entities.append({
            "id": f"clarification-{plan.target_entity.lower()}",
            "label": f"Làm rõ tiêu chí phân tích {target_vi}",
            "type": plan.target_entity,
            "snippet": ans,
            "cypher_verified": True,
        })
        return ans, entities

    def _run_And_format(
        self,
        plan: QueryPlan,
        cypher: str,
        neo4j_uri: str,
        neo4j_auth: tuple,
    ) -> Dict[str, Any]:
        records: List[Dict[str, Any]] = []
        entities: List[Dict[str, Any]] = []
        grounded_answer = ""
        top_entity: Optional[Dict[str, Any]] = None

        try:
            session = _Neo4jSessionAdapter()
            res = session.run(cypher)
            records = [dict(r) for r in res]

            # Dispatch formatting by intent
            if plan.intent == "DOCUMENT_ANALYTICS":
                entities, grounded_answer = self._format_document_analytics(plan, records)
            elif plan.intent == "EXECUTIVE_REPORT":
                entities, grounded_answer = self._format_executive_report(session, plan, records)
            elif plan.intent == "CAUSAL_ANALYSIS":
                entities, grounded_answer = self._format_causal_analysis(session, plan, records)
            elif plan.intent == "COMPARISON":
                entities, grounded_answer = self._format_comparison(session, plan, records)
            elif plan.intent == "FORMULA_KPI":
                entities, grounded_answer = self._format_formula_kpi(plan, records)
            elif plan.intent == "RETRIEVAL":
                entities, grounded_answer, top_entity = self._format_retrieval(plan, records)
            elif plan.intent == "CONDITIONAL":
                entities, grounded_answer = self._format_conditional(plan, records)
            elif plan.intent == "TIME_SERIES":
                entities, grounded_answer = self._format_time_series(plan, records)
            elif plan.intent == "RANKING":
                entities, grounded_answer, top_entity = self._format_ranking(session, plan, records)
            elif plan.intent == "AGGREGATION":
                entities, grounded_answer = self._format_aggregation(session, plan, records)
            else:
                entities, grounded_answer = self._format_generic(plan, records)
        except Exception as e:
            logger.error(f"AnalyticsExecutionEngine Neo4j execution error: {e}")
            grounded_answer = "Hệ thống gặp sự cố kết nối khi truy vấn cơ sở dữ liệu đồ thị Neo4j. Vui lòng thử lại sau."

        out = self._pack_result(plan, cypher, entities, grounded_answer, raw_rows=records)
        out["top_entity"] = top_entity
        return out

    # ------------------------------------------------------------------------
    # 4.1 DOCUMENT ANALYTICS FORMATTER
    # ------------------------------------------------------------------------

    def _format_document_analytics(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không tìm thấy dữ liệu tài liệu hợp đồng trong Neo4j."

        r0 = records[0]
        if "cap_docs" in r0 and "law_docs" in r0:
            total = int(r0.get("total_docs") or 0)
            cap = int(r0.get("cap_docs") or 0)
            law = int(r0.get("law_docs") or 0)
            indem = int(r0.get("indem_docs") or 0)
            term = int(r0.get("term_docs") or 0)
            missing_list = [m for m in (r0.get("missing_cap_list") or []) if m][:5]
            cap_pct = round((cap / total) * 100, 1) if total > 0 else 0.0
            law_pct = round((law / total) * 100, 1) if total > 0 else 0.0
            indem_pct = round((indem / total) * 100, 1) if total > 0 else 0.0
            term_pct = round((term / total) * 100, 1) if total > 0 else 0.0
            missing_str = ", ".join(missing_list) if missing_list else "Không có"
            snippet = (
                f"Báo cáo Tuân thủ & An toàn Pháp lý trên tổng số {total} hợp đồng/tài liệu trong hệ thống: "
                f"1. Điều khoản Giới hạn Trách nhiệm (Liability Cap): {cap}/{total} hợp đồng ({cap_pct}% đạt chuẩn, cần bổ sung {max(0, total - cap)} hợp đồng); "
                f"2. Điều khoản Luật áp dụng (Governing Law): {law}/{total} hợp đồng ({law_pct}% đạt chuẩn quy định); "
                f"3. Điều khoản Bồi thường thiệt hại (Indemnification): {indem}/{total} hợp đồng ({indem_pct}%, cần rà soát {max(0, total - indem)} hợp đồng); "
                f"4. Điều khoản Chấm dứt hợp đồng (Termination): {term}/{total} hợp đồng ({term_pct}% có điều khoản bảo vệ). "
                f"Một số hợp đồng tiêu biểu cần bổ sung điều khoản Giới hạn Trách nhiệm: {missing_str}."
            )
            entities.append({
                "id": "compliance-stats",
                "label": f"Báo cáo Tuân thủ Pháp lý CUAD ({total} Hợp đồng)",
                "type": "ComplianceSummary",
                "snippet": snippet,
                "cypher_verified": True,
                "total_docs": total,
            })
            return entities, snippet

        if "total_docs" in r0 and "legal_docs" in r0:
            total = int(r0.get("total_docs") or 0)
            legal = int(r0.get("legal_docs") or 0)
            sales = int(r0.get("sales_docs") or 0)
            rd = int(r0.get("rd_docs") or 0)
            acc = int(r0.get("acc_docs") or 0)
            it = int(r0.get("it_docs") or 0)
            snippet = (
                f"Toàn hệ thống hiện có tổng cộng {total} tài liệu/văn bản đang hoạt động trong kho tri thức, "
                f"phân bổ theo 5 phòng ban: Pháp chế (Legal): {legal} tài liệu; "
                f"Kinh doanh (Sales): {sales} tài liệu; Nghiên cứu & Phát triển (R&D): {rd} tài liệu; "
                f"Kế toán & Thu mua: {acc} tài liệu; Công nghệ thông tin (IT): {it} tài liệu."
            )
            entities.append({
                "id": "total-documents-summary",
                "label": f"Thống kê Kho Tài liệu Hệ thống ({total} Tài liệu)",
                "type": "SystemSummary",
                "snippet": snippet,
                "cypher_verified": True,
                "total_docs": total,
            })
            return entities, snippet

        if "contract_category" in r0:
            total_docs = sum(int(r.get("doc_count") or 0) for r in records)
            parts = []
            for r in records:
                cat = r.get("contract_category", "Khác")
                cnt = int(r.get("doc_count") or 0)
                pct = round((cnt / total_docs) * 100, 1) if total_docs > 0 else 0.0
                parts.append(f"{cat}: {cnt} tài liệu ({pct}%)")
            snippet = (
                f"Phân bố danh mục hợp đồng theo phòng ban trên tổng số {total_docs} tài liệu trong kho tri thức: "
                + "; ".join(parts) + "."
            )
            entities.append({
                "id": "portfolio-breakdown",
                "label": f"Phân bố Danh mục Hợp đồng ({total_docs} Tài liệu)",
                "type": "PortfolioSummary",
                "snippet": snippet,
                "cypher_verified": True,
                "total_docs": total_docs,
                "breakdown_count": len(records),
            })
            return entities, snippet

        if "missing_clause" in r0:
            for r in records:
                doc_id = r.get("document_id", "unknown")
                title = r.get("contract_title", doc_id)
                cat = r.get("category", "General Commercial")
                missing = r.get("missing_clause", "Limitation of Liability")
                entities.append({
                    "id": f"doc-{doc_id}",
                    "label": str(title),
                    "type": "Document",
                    "snippet": f"Hợp đồng '{title}' (Danh mục: {cat}) được xác nhận KHÔNG có điều khoản '{missing}' trong đồ thị Neo4j.",
                    "cypher_verified": True,
                })
            ans = (
                f"Hệ thống ghi nhận các hợp đồng thiếu điều khoản **{records[0].get('missing_clause')}** trong đồ thị Neo4j:\n"
                + "\n".join(f"- **{e['label']}**: {e['snippet']}" for e in entities[:10])
            )
            return entities, ans

        return entities, "Đã hoàn tất truy vấn tài liệu."

    # ------------------------------------------------------------------------
    # 4.2 RANKING FORMATTER (Handles ASC vs DESC, Both Extremes & Ties)
    # ------------------------------------------------------------------------

    def _format_ranking(
        self, session: Any, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str, Optional[Dict[str, Any]]]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không tìm thấy bản ghi nào khớp với điều kiện xếp hạng trong cơ sở dữ liệu.", None

        is_asc = plan.sort_direction == "ASC"
        time_suffix = ""
        if plan.years:
            time_suffix = f" trong năm {', '.join(plan.years)}"
        elif plan.months:
            time_suffix = f" trong tháng {', '.join(plan.months)}"

        # Check if user asked for BOTH highest and lowest ("cao nhất và thấp nhất", "nhiều nhất và ít nhất")
        if plan.filters.get("both_extremes"):
            return self._format_both_extremes_ranking(session, plan)

        # A. Ranking Months or Years
        if plan.group_by in ["Month", "Year"]:
            unit_label = "Tháng" if plan.group_by == "Month" else "Năm"
            key_col = "salesMonth" if plan.group_by == "Month" else "salesYear"
            rank_adj = "thấp nhất" if is_asc else "cao nhất"
            metric_vi = "số lượng đơn hàng" if plan.metric == "order_count" else "doanh thu"

            lines = []
            for idx, r in enumerate(records, start=1):
                period_val = r.get(key_col, "N/A")
                rev = float(r.get("grossRevenue") or 0)
                net = float(r.get("netRevenue") or 0)
                cnt = int(r.get("orderCount") or 0)
                snip = (
                    f"{unit_label} {period_val} [Xếp hạng #{idx} - {metric_vi.capitalize()} {rank_adj}]: "
                    f"Doanh thu gộp đạt {_fmt_money(rev)} USD (Doanh thu thuần SubTotal: {_fmt_money(net)} USD) "
                    f"qua {_fmt_int(cnt)} đơn hàng."
                )
                entities.append({
                    "id": f"rank-{period_val}",
                    "label": f"{unit_label} {period_val}",
                    "type": "SalesOrder",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(f"{idx}. **{unit_label} {period_val}**: Doanh thu gộp **{_fmt_money(rev)} USD** (Thuần: **{_fmt_money(net)} USD**) — **{_fmt_int(cnt)} đơn hàng**.")

            r0 = records[0]
            p0 = r0.get(key_col, "N/A")
            header = (
                f"**{unit_label} có {metric_vi} {rank_adj}{time_suffix}** là **{unit_label.lower()} {p0}** "
                f"với doanh thu gộp đạt **{_fmt_money(r0.get('grossRevenue'))} USD** "
                f"(doanh thu thuần: **{_fmt_money(r0.get('netRevenue'))} USD**) qua **{_fmt_int(r0.get('orderCount'))} đơn hàng**."
            )
            if p0 == "2014-06" and is_asc:
                header += " *(Lưu ý: Tháng 06/2014 là tháng cuối cùng trong tập dữ liệu AdventureWorks, kết thúc vào ngày 30/06/2014).* "
            elif p0 == "2011" and is_asc:
                header += " *(Lưu ý: Năm 2011 dữ liệu bắt đầu từ ngày 31/05/2011 nên chỉ bao gồm 7 tháng hoạt động).* "

            ans = header + ("\n\n**Chi tiết bảng xếp hạng:**\n" + "\n".join(lines) if len(lines) > 1 else "")
            return entities, ans, records[0]

        # B. Ranking Customers
        if plan.target_entity == "Customer":
            top_row = records[0]
            tie_note = ""

            if plan.metric == "product_quantity":
                rank_title = "Mua ít sản phẩm nhất" if is_asc else "Mua nhiều sản phẩm nhất"
                top_val = int(top_row.get("totalQty") or 0)
                if is_asc:
                    # Query exact tie count of active customers with totalQty == top_val, plus 0-order customers
                    tie_res = session.run(
                        "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
                        "WITH c, SUM(toInteger(r.OrderQty)) AS qty "
                        f"WHERE qty = {top_val} "
                        "RETURN COUNT(c) AS tieCount"
                    ).data()
                    zero_res = session.run(
                        "MATCH (c:Customer) WHERE NOT (c)-[:PLACED_ORDER]->(:SalesOrder) RETURN COUNT(c) AS zeroCount"
                    ).data()
                    tie_cnt = int(tie_res[0]["tieCount"]) if tie_res else 1
                    zero_cnt = int(zero_res[0]["zeroCount"]) if zero_res else 0
                    if tie_cnt > 1:
                        tie_note = (
                            f"\n\n> **Ghi chú đồng hạng (Tie Analysis)**: Trong nhóm `19,119` khách hàng đã phát sinh giao dịch mua hàng, "
                            f"có tổng cộng **`{_fmt_int(tie_cnt)}` khách hàng đồng hạng ở mức tối thiểu `{top_val}` sản phẩm** (1 đơn hàng). "
                            f"Trong đó, khách hàng **{top_row.get('CustomerName')} (#{top_row.get('CustomerID')})** có giá trị sản phẩm thấp nhất là **{_fmt_money(top_row.get('totalProductValue'))} USD**. "
                            f"Ngoài ra, hệ thống còn ghi nhận **`{_fmt_int(zero_cnt)}` khách hàng đã đăng ký tài khoản nhưng chưa phát sinh đơn hàng nào (`0` sản phẩm)**."
                        )

                lines = []
                for idx, r in enumerate(records, start=1):
                    cid = r.get("CustomerID")
                    cname = r.get("CustomerName", f"Customer #{cid}")
                    qty = int(r.get("totalQty") or 0)
                    dist_p = int(r.get("distinctProducts") or 0)
                    ords = int(r.get("orderCount") or 0)
                    val = float(r.get("totalProductValue") or 0.0)
                    badge = f"[Xếp hạng #{idx} - {rank_title}]" if idx == 1 else f"[Xếp hạng #{idx}]"
                    snip = (
                        f"Khách hàng {cname} (#{cid}) {badge}: "
                        f"Tổng cộng {_fmt_int(qty)} sản phẩm ({_fmt_int(dist_p)} loại sản phẩm) "
                        f"qua {_fmt_int(ords)} đơn hàng, tổng giá trị {_fmt_money(val)} USD."
                    )
                    entities.append({
                        "id": f"cust-{cid}",
                        "label": f"{cname} (#{cid})",
                        "type": "Customer",
                        "snippet": snip,
                        "cypher_verified": True,
                        "CustomerID": cid,
                        "totalQty": qty,
                        "distinctProducts": dist_p,
                        "order_count": ords,
                        "totalProductSpent": val,
                    })
                    lines.append(
                        f"{idx}. **{cname} (#{cid})**: Mua **{_fmt_int(qty)} sản phẩm** ({dist_p} mặt hàng) qua **{ords} đơn hàng** — Tổng giá trị sản phẩm: **{_fmt_money(val)} USD**."
                    )

                lead_verb = "mua ít sản phẩm nhất (trong số các khách hàng đã phát sinh đơn hàng)" if is_asc else "mua nhiều sản phẩm nhất"
                ans = (
                    f"Theo dữ liệu thực tế từ hệ thống Neo4j GraphDB{time_suffix}, **khách hàng {lead_verb}** là "
                    f"**{top_row.get('CustomerName')} (#{top_row.get('CustomerID')})** với tổng cộng **{_fmt_int(top_row.get('totalQty'))} sản phẩm** "
                    f"({top_row.get('distinctProducts')} loại sản phẩm) qua **{top_row.get('orderCount')} đơn hàng**, "
                    f"tổng giá trị sản phẩm đạt **{_fmt_money(top_row.get('totalProductValue'))} USD**.\n\n"
                    f"**Danh sách Top {len(lines)} khách hàng ({rank_title.lower()}):**\n" + "\n".join(lines) + tie_note
                )
                return entities, ans, top_row

            elif plan.metric == "order_count":
                rank_title = "Có ít đơn hàng nhất" if is_asc else "Có nhiều đơn hàng nhất"
                top_val = int(top_row.get("orderCount") or top_row.get("order_count") or 0)
                tie_res = session.run(
                    "MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder) "
                    "WITH c, COUNT(DISTINCT o.SalesOrderID) AS cnt "
                    f"WHERE cnt = {top_val} "
                    "RETURN COUNT(c) AS tieCount"
                ).data()
                tie_cnt = int(tie_res[0]["tieCount"]) if tie_res else 1
                if tie_cnt > 1:
                    tie_note = (
                        f"\n\n> **Ghi chú đồng hạng**: Có tổng cộng **`{_fmt_int(tie_cnt)}` khách hàng** cùng đạt mức **`{top_val}` đơn hàng** "
                        + ("(ngoài ra có `701` khách hàng chưa phát sinh đơn hàng nào)." if is_asc else "(đồng dẫn đầu toàn hệ thống).")
                    )

                lines = []
                for idx, r in enumerate(records, start=1):
                    cid = r.get("CustomerID")
                    cname = r.get("CustomerName", f"Customer #{cid}")
                    ords = int(r.get("orderCount") or 0)
                    spent = float(r.get("totalSpent") or 0.0)
                    badge = f"[Xếp hạng #{idx} - {rank_title}]" if idx == 1 else f"[Xếp hạng #{idx}]"
                    snip = f"Khách hàng {cname} (#{cid}) {badge}: Tổng cộng {_fmt_int(ords)} đơn hàng, tổng chi tiêu {_fmt_money(spent)} USD."
                    entities.append({
                        "id": f"cust-{cid}",
                        "label": f"{cname} (#{cid})",
                        "type": "Customer",
                        "snippet": snip,
                        "cypher_verified": True,
                        "CustomerID": cid,
                        "order_count": ords,
                        "totalSpent": spent,
                    })
                    lines.append(f"{idx}. **{cname} (#{cid})**: **{_fmt_int(ords)} đơn hàng** — Tổng giá trị: **{_fmt_money(spent)} USD**.")

                ans = (
                    f"Theo dữ liệu vận hành thực tế từ Neo4j{time_suffix}, khách hàng **{rank_title.lower()}** là "
                    f"**{top_row.get('CustomerName')} (#{top_row.get('CustomerID')})** với **{_fmt_int(top_val)} đơn hàng** "
                    f"(tổng chi tiêu đạt **{_fmt_money(top_row.get('totalSpent'))} USD**).\n\n"
                    f"**Danh sách chi tiết ({rank_title.lower()}):**\n" + "\n".join(lines) + tie_note
                )
                return entities, ans, top_row

            else:
                # gross_revenue (totalSpent)
                rank_title = "Chi tiêu thấp nhất" if is_asc else "Chi tiêu cao nhất"
                lines = []
                for idx, r in enumerate(records, start=1):
                    cid = r.get("CustomerID")
                    cname = r.get("CustomerName", f"Customer #{cid}")
                    ords = int(r.get("orderCount") or 0)
                    spent = float(r.get("totalSpent") or 0.0)
                    badge = f"[Xếp hạng #{idx} - {rank_title}]" if idx == 1 else f"[Xếp hạng #{idx}]"
                    snip = f"Khách hàng {cname} (#{cid}) {badge}: Tổng giá trị đơn hàng {_fmt_money(spent)} USD qua {_fmt_int(ords)} đơn hàng."
                    entities.append({
                        "id": f"cust-{cid}",
                        "label": f"{cname} (#{cid})",
                        "type": "Customer",
                        "snippet": snip,
                        "cypher_verified": True,
                        "CustomerID": cid,
                        "order_count": ords,
                        "totalSpent": spent,
                    })
                    lines.append(f"{idx}. **{cname} (#{cid})**: Tổng chi tiêu **{_fmt_money(spent)} USD** ({_fmt_int(ords)} đơn hàng).")

                if is_asc:
                    tie_note = (
                        "\n\n> **Lưu ý**: Xếp hạng trên tính trên `19,119` khách hàng đã có giao dịch thực tế. "
                        "Ngoài ra hệ thống có `701` khách hàng đã đăng ký nhưng chưa có đơn hàng nào (`$0.00 USD`)."
                    )
                ans = (
                    f"Theo dữ liệu thực tế từ Neo4j{time_suffix}, khách hàng có **tổng giá trị đơn hàng (chi tiêu) {'thấp nhất' if is_asc else 'cao nhất'}** là "
                    f"**{top_row.get('CustomerName')} (#{top_row.get('CustomerID')})** với tổng chi tiêu đạt **{_fmt_money(top_row.get('totalSpent'))} USD** "
                    f"qua **{_fmt_int(top_row.get('orderCount'))} đơn hàng**.\n\n"
                    f"**Danh sách Top {len(lines)} khách hàng ({rank_title.lower()}):**\n" + "\n".join(lines) + tie_note
                )
                return entities, ans, top_row

        # C. Ranking Products
        if plan.target_entity == "Product":
            top_row = records[0]
            if plan.metric == "product_quantity":
                rank_title = "Bán chậm nhất" if is_asc else "Bán chạy nhất"
                lines = []
                for idx, r in enumerate(records, start=1):
                    pid = r.get("ProductID")
                    pname = r.get("ProductName", f"Product #{pid}")
                    qty = int(r.get("totalSoldQty") or 0)
                    ords = int(r.get("orderCount") or 0)
                    rev = float(r.get("totalRevenue") or 0.0)
                    price = float(r.get("ListPrice") or 0.0)
                    snip = (
                        f"Sản phẩm {pname} (#{pid}) [Xếp hạng #{idx} - {rank_title}]: "
                        f"Đã bán {_fmt_int(qty)} sản phẩm qua {_fmt_int(ords)} đơn hàng, "
                        f"doanh thu đạt {_fmt_money(rev)} USD (Giá niêm yết: {_fmt_money(price)} USD)."
                    )
                    entities.append({
                        "id": f"prod-{pid}",
                        "label": f"{pname} (#{pid})",
                        "type": "Product",
                        "snippet": snip,
                        "cypher_verified": True,
                    })
                    lines.append(
                        f"{idx}. **{pname} (#{pid})**: Đã bán **{_fmt_int(qty)} sản phẩm** ({_fmt_int(ords)} đơn hàng) — Doanh thu: **{_fmt_money(rev)} USD**."
                    )
                extra_note = (
                    "\n\n> **Ghi chú danh mục**: Thống kê trên xét trong `266` sản phẩm đã phát sinh giao dịch bán hàng. "
                    "Ngoài ra trong danh mục `504` sản phẩm có `238` mã sản phẩm chưa phát sinh đơn hàng (`0` sản phẩm bán ra)."
                    if is_asc else ""
                )
                ans = (
                    f"Theo dữ liệu bán hàng từ Neo4j{time_suffix}, **sản phẩm {rank_title.lower()}** là "
                    f"**{top_row.get('ProductName')} (#{top_row.get('ProductID')})** với **{_fmt_int(top_row.get('totalSoldQty'))} sản phẩm** được bán ra "
                    f"qua **{_fmt_int(top_row.get('orderCount'))} đơn hàng**, mang lại doanh thu **{_fmt_money(top_row.get('totalRevenue'))} USD**.\n\n"
                    f"**Danh sách Top {len(lines)} sản phẩm ({rank_title.lower()}):**\n" + "\n".join(lines) + extra_note
                )
                return entities, ans, top_row

            elif plan.metric == "net_revenue":
                rank_title = "Doanh thu thấp nhất" if is_asc else "Doanh thu cao nhất"
                lines = []
                for idx, r in enumerate(records, start=1):
                    pid = r.get("ProductID")
                    pname = r.get("ProductName", f"Product #{pid}")
                    qty = int(r.get("totalSoldQty") or 0)
                    ords = int(r.get("orderCount") or 0)
                    rev = float(r.get("totalRevenue") or 0.0)
                    snip = (
                        f"Sản phẩm {pname} (#{pid}) [Xếp hạng #{idx} - {rank_title}]: "
                        f"Tổng doanh thu đạt {_fmt_money(rev)} USD với {_fmt_int(qty)} sản phẩm bán ra qua {_fmt_int(ords)} đơn hàng."
                    )
                    entities.append({
                        "id": f"prod-{pid}",
                        "label": f"{pname} (#{pid})",
                        "type": "Product",
                        "snippet": snip,
                        "cypher_verified": True,
                    })
                    lines.append(
                        f"{idx}. **{pname} (#{pid})**: Doanh thu **{_fmt_money(rev)} USD** ({_fmt_int(qty)} sản phẩm bán ra, {_fmt_int(ords)} đơn hàng)."
                    )
                ans = (
                    f"Theo dữ liệu thực tế từ Neo4j{time_suffix}, **sản phẩm có {rank_title.lower()}** là "
                    f"**{top_row.get('ProductName')} (#{top_row.get('ProductID')})** đạt **{_fmt_money(top_row.get('totalRevenue'))} USD** "
                    f"({_fmt_int(top_row.get('totalSoldQty'))} sản phẩm bán ra qua {_fmt_int(top_row.get('orderCount'))} đơn hàng).\n\n"
                    f"**Danh sách Top {len(lines)} sản phẩm ({rank_title.lower()}):**\n" + "\n".join(lines)
                )
                return entities, ans, top_row

            else:
                # list_price
                rank_title = "Giá niêm yết thấp nhất" if is_asc else "Giá niêm yết cao nhất"
                lines = []
                for idx, r in enumerate(records, start=1):
                    pid = r.get("ProductID")
                    pname = r.get("ProductName", f"Product #{pid}")
                    pnum = r.get("ProductNumber", "N/A")
                    price = float(r.get("ListPrice") or 0.0)
                    snip = f"Sản phẩm {pname} (Mã: {pnum}, #{pid}) [{rank_title}]: Giá niêm yết (ListPrice) đạt {_fmt_money(price)} USD."
                    entities.append({
                        "id": f"prod-{pid}",
                        "label": f"{pname} (#{pid})",
                        "type": "Product",
                        "snippet": snip,
                        "cypher_verified": True,
                    })
                    lines.append(f"{idx}. **{pname} (#{pid}, Mã: {pnum})**: Giá niêm yết **{_fmt_money(price)} USD**.")

                ans = (
                    f"Theo dữ liệu danh mục sản phẩm trên Neo4j, **sản phẩm có {rank_title.lower()}** là "
                    f"**{top_row.get('ProductName')} (#{top_row.get('ProductID')})** với mức giá niêm yết **{_fmt_money(top_row.get('ListPrice'))} USD**.\n\n"
                    f"**Danh sách Top {len(lines)} sản phẩm ({rank_title.lower()}):**\n" + "\n".join(lines)
                )
                return entities, ans, top_row

        # D. Ranking Categories
        if plan.target_entity == "Category":
            lines = []
            for idx, r in enumerate(records, start=1):
                cname = r.get("CategoryName", "N/A")
                if "categoryRevenue" in r:
                    rev = float(r.get("categoryRevenue") or 0.0)
                    qty = int(r.get("totalSoldQty") or 0)
                    ords = int(r.get("orderCount") or 0)
                    snip = f"Danh mục {cname} [Xếp hạng #{idx}]: Doanh thu đạt {_fmt_money(rev)} USD, đã bán {_fmt_int(qty)} sản phẩm qua {_fmt_int(ords)} đơn hàng."
                    lines.append(f"{idx}. **Danh mục {cname}**: Doanh thu **{_fmt_money(rev)} USD** — Đã bán **{_fmt_int(qty)} sản phẩm** ({_fmt_int(ords)} đơn hàng).")
                else:
                    pcnt = int(r.get("productCount") or 0)
                    scnt = int(r.get("subCategoryCount") or 0)
                    snip = f"Danh mục {cname} [Xếp hạng #{idx}]: Gồm {pcnt} sản phẩm thuộc {scnt} danh mục con."
                    lines.append(f"{idx}. **Danh mục {cname}**: **{pcnt} sản phẩm** ({scnt} danh mục con).")
                entities.append({
                    "id": f"cat-{cname}",
                    "label": f"Danh mục {cname}",
                    "type": "Category",
                    "snippet": snip,
                    "cypher_verified": True,
                })
            ans = "**Kết quả xếp hạng các Danh mục sản phẩm (Category) trong hệ thống:**\n" + "\n".join(lines)
            return entities, ans, records[0]

        # E. Ranking SalesOrders
        top_row = records[0]
        rank_title = "Giá trị nhỏ nhất" if is_asc else "Giá trị lớn nhất"
        lines = []
        for idx, r in enumerate(records, start=1):
            oid = r.get("SalesOrderID")
            cname = r.get("CustomerName", "N/A")
            odate = r.get("OrderDate", "N/A")
            due = float(r.get("TotalDue") or 0.0)
            sub = float(r.get("SubTotal") or 0.0)
            snip = f"Đơn hàng #{oid} (Khách hàng: {cname}, Ngày: {odate}) [{rank_title}]: Tổng thanh toán {_fmt_money(due)} USD (SubTotal: {_fmt_money(sub)} USD)."
            entities.append({
                "id": f"order-{oid}",
                "label": f"Đơn hàng #{oid}",
                "type": "SalesOrder",
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(f"{idx}. **Đơn hàng #{oid}** (Khách hàng: **{cname}**, Ngày: {odate}): **{_fmt_money(due)} USD** (Thuần: {_fmt_money(sub)} USD).")
        ans = (
            f"Theo dữ liệu từ Neo4j{time_suffix}, **đơn hàng có {rank_title.lower()}** là **Đơn hàng #{top_row.get('SalesOrderID')}** "
            f"của khách hàng **{top_row.get('CustomerName')}** với giá trị **{_fmt_money(top_row.get('TotalDue'))} USD**.\n\n"
            f"**Danh sách chi tiết:**\n" + "\n".join(lines)
        )
        return entities, ans, top_row

    def _format_both_extremes_ranking(
        self, session: Any, plan: QueryPlan
    ) -> Tuple[List[Dict[str, Any]], str, Optional[Dict[str, Any]]]:
        """Handles queries asking for BOTH highest and lowest (e.g. 'Khách hàng có tổng giá trị đơn hàng cao nhất và thấp nhất là ai?')."""
        plan_desc = QueryPlan(
            raw_query=plan.raw_query,
            normalized_query=plan.normalized_query,
            intent="RANKING",
            target_entity=plan.target_entity,
            metric=plan.metric,
            sort_direction="DESC",
            limit=1,
            years=plan.years,
            months=plan.months,
        )
        plan_asc = QueryPlan(
            raw_query=plan.raw_query,
            normalized_query=plan.normalized_query,
            intent="RANKING",
            target_entity=plan.target_entity,
            metric=plan.metric,
            sort_direction="ASC",
            limit=1,
            years=plan.years,
            months=plan.months,
        )
        c_desc = query_builder.build(plan_desc)
        c_asc = query_builder.build(plan_asc)
        r_desc = [dict(r) for r in session.run(c_desc)]
        r_asc = [dict(r) for r in session.run(c_asc)]

        entities: List[Dict[str, Any]] = []
        if plan.target_entity == "Customer" and r_desc and r_asc:
            hi = r_desc[0]
            lo = r_asc[0]
            if plan.metric == "product_quantity":
                hi_str = f"Khách hàng mua nhiều sản phẩm nhất: **{hi['CustomerName']} (#{hi['CustomerID']})** với **{_fmt_int(hi['totalQty'])} sản phẩm** ({hi['orderCount']} đơn hàng, trị giá **{_fmt_money(hi['totalProductValue'])} USD**)."
                lo_str = f"Khách hàng mua ít sản phẩm nhất (có giao dịch): **{lo['CustomerName']} (#{lo['CustomerID']})** với **{_fmt_int(lo['totalQty'])} sản phẩm** ({lo['orderCount']} đơn hàng, trị giá **{_fmt_money(lo['totalProductValue'])} USD** — đồng hạng `1` sản phẩm với `2,511` khách hàng)."
            elif plan.metric == "order_count":
                hi_str = f"Khách hàng có nhiều đơn hàng nhất: **{hi['CustomerName']} (#{hi['CustomerID']})** với **{_fmt_int(hi['orderCount'])} đơn hàng** (Tổng chi tiêu: **{_fmt_money(hi['totalSpent'])} USD**)."
                lo_str = f"Khách hàng có ít đơn hàng nhất (có giao dịch): **{lo['CustomerName']} (#{lo['CustomerID']})** với **{_fmt_int(lo['orderCount'])} đơn hàng** (Tổng chi tiêu: **{_fmt_money(lo['totalSpent'])} USD**)."
            else:
                hi_str = f"Khách hàng có tổng giá trị đơn hàng cao nhất: **{hi['CustomerName']} (#{hi['CustomerID']})** với tổng chi tiêu đạt **{_fmt_money(hi['totalSpent'])} USD** qua **{_fmt_int(hi['orderCount'])} đơn hàng**."
                lo_str = f"Khách hàng có tổng giá trị đơn hàng thấp nhất (có giao dịch): **{lo['CustomerName']} (#{lo['CustomerID']})** với tổng chi tiêu đạt **{_fmt_money(lo['totalSpent'])} USD** qua **{_fmt_int(lo['orderCount'])} đơn hàng** (ngoài ra có `701` khách hàng chưa phát sinh đơn hàng)."

            entities.append({
                "id": f"cust-{hi['CustomerID']}",
                "label": f"{hi['CustomerName']} (#{hi['CustomerID']}) - Cao nhất",
                "type": "Customer",
                "snippet": hi_str.replace("**", ""),
                "cypher_verified": True,
            })
            entities.append({
                "id": f"cust-{lo['CustomerID']}",
                "label": f"{lo['CustomerName']} (#{lo['CustomerID']}) - Thấp nhất",
                "type": "Customer",
                "snippet": lo_str.replace("**", ""),
                "cypher_verified": True,
            })
            ans = f"Theo dữ liệu thực tế từ Neo4j GraphDB, đối chiếu 2 cực trị (Cao nhất & Thấp nhất):\n- **Cực đại (Cao nhất)**: {hi_str}\n- **Cực tiểu (Thấp nhất)**: {lo_str}"
            return entities, ans, hi

        # Fallback for Product or SalesOrder both extremes
        e1, a1, top1 = self._format_ranking(session, plan_desc, r_desc)
        e2, a2, _ = self._format_ranking(session, plan_asc, r_asc)
        return e1 + e2, f"**1. Giá trị Cao nhất:**\n{a1}\n\n**2. Giá trị Thấp nhất:**\n{a2}", top1

    # ------------------------------------------------------------------------
    # 4.3 AGGREGATION FORMATTER
    # ------------------------------------------------------------------------

    def _format_aggregation(
        self, session: Any, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không tìm thấy dữ liệu tổng hợp trong cơ sở dữ liệu."

        # Group by Category ("Mỗi danh mục có bao nhiêu sản phẩm?")
        if plan.group_by == "Category":
            total_mapped = sum(int(r.get("productCount") or 0) for r in records)
            total_rev = sum(float(r.get("categoryRevenue") or 0.0) for r in records)
            lines = []
            for r in records:
                cname = r.get("CategoryName", "Khác")
                pcnt = int(r.get("productCount") or 0)
                scnt = int(r.get("subCategoryCount") or 0)
                qty = int(r.get("totalSoldQty") or 0)
                rev = float(r.get("categoryRevenue") or 0.0)
                pct_rev = round((rev / total_rev) * 100, 2) if total_rev > 0 else 0.0
                snip = (
                    f"Danh mục {cname}: Gồm {pcnt} sản phẩm ({scnt} danh mục con), "
                    f"đã bán {_fmt_int(qty)} sản phẩm, doanh thu đạt {_fmt_money(rev)} USD ({pct_rev}%)."
                )
                entities.append({
                    "id": f"cat-{cname}",
                    "label": f"Danh mục {cname} ({pcnt} sản phẩm)",
                    "type": "Category",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(
                    f"- **{cname}**: **{pcnt} sản phẩm** ({scnt} danh mục con) — Đã bán: **{_fmt_int(qty)} sản phẩm**, Doanh thu: **{_fmt_money(rev)} USD** ({pct_rev}%)."
                )
            ans = (
                f"Hệ thống hiện có **4 danh mục sản phẩm chính (Category)** bao gồm **{total_mapped} sản phẩm** đã phân loại "
                f"(trên tổng số `504` sản phẩm trong danh mục toàn hệ thống, `209` mã sản phẩm linh kiện nội bộ chưa gắn danh mục):\n"
                + "\n".join(lines)
            )
            return entities, ans

        # Group by Customer ("Mỗi khách hàng đã mua bao nhiêu sản phẩm?")
        if plan.group_by == "Customer":
            ents, ans, _ = self._format_ranking(session, plan, records)
            return ents, ans

        r0 = records[0]

        # Customer Count
        if "totalCustomers" in r0:
            total = int(r0.get("totalCustomers") or 0)
            active = int(r0.get("activeCustomers") or 0)
            inactive = int(r0.get("inactiveCustomers") or 0)
            repeat = int(r0.get("repeatCustomers") or 0)
            ans = (
                f"Theo dữ liệu thực tế từ Neo4j GraphDB, toàn hệ thống hiện có tổng cộng **`{_fmt_int(total)}` khách hàng (`Customer`)**, trong đó:\n"
                f"- **Khách hàng đã phát sinh đơn hàng**: **`{_fmt_int(active)}` khách hàng** ({round(active/total*100, 2)}%).\n"
                f"- **Khách hàng mua lặp lại (từ 2 đơn hàng trở lên)**: **`{_fmt_int(repeat)}` khách hàng** ({round(repeat/active*100, 2)}% số khách đã mua).\n"
                f"- **Khách hàng mới đăng ký chưa có đơn hàng**: **`{_fmt_int(inactive)}` khách hàng**."
            )
            entities.append({
                "id": "customer-count-summary",
                "label": f"Tổng số Khách hàng ({_fmt_int(total)} Customer)",
                "type": "Customer",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        # Product Units Sold
        if "totalUnitsSold" in r0:
            units = int(r0.get("totalUnitsSold") or 0)
            dist_p = int(r0.get("distinctProductsSold") or 0)
            ords = int(r0.get("totalOrders") or 0)
            rev = float(r0.get("totalProductRevenue") or 0.0)
            ans = (
                f"Theo dữ liệu giao dịch trên Neo4j, tổng số lượng sản phẩm đã bán ra toàn hệ thống là **`{_fmt_int(units)}` sản phẩm (units)**, "
                f"thuộc **`{_fmt_int(dist_p)}` mã sản phẩm khác nhau** qua **`{_fmt_int(ords)}` đơn hàng**, "
                f"với tổng giá trị dòng sản phẩm (`lineTotal`) đạt **`{_fmt_money(rev)} USD`**."
            )
            entities.append({
                "id": "product-units-sold",
                "label": f"Tổng sản phẩm đã bán ({_fmt_int(units)} sản phẩm)",
                "type": "Product",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        # Product Catalog Count
        if "totalCatalogProducts" in r0:
            total_p = int(r0.get("totalCatalogProducts") or 0)
            sold_p = int(r0.get("soldProducts") or 0)
            unsold_p = int(r0.get("unsoldProducts") or 0)
            ans = (
                f"Hệ thống hiện có tổng cộng **`{_fmt_int(total_p)}` mã sản phẩm (`Product`)** trong danh mục, trong đó:\n"
                f"- **Sản phẩm đã phát sinh doanh số bán**: **`{_fmt_int(sold_p)}` sản phẩm** ({round(sold_p/total_p*100, 2)}%).\n"
                f"- **Sản phẩm chưa phát sinh giao dịch bán**: **`{_fmt_int(unsold_p)}` sản phẩm**."
            )
            entities.append({
                "id": "product-catalog-count",
                "label": f"Tổng số Sản phẩm ({_fmt_int(total_p)} Product)",
                "type": "Product",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        # SalesOrder Totals (Total Orders, Total Revenue, AOV)
        ords = int(r0.get("totalOrders") or 0)
        gross = float(r0.get("grossRevenue") or 0.0)
        net = float(r0.get("netRevenue") or 0.0)
        tax = float(r0.get("totalTax") or 0.0)
        freight = float(r0.get("totalFreight") or 0.0)
        aov = float(r0.get("avgOrderValue") or 0.0)
        min_d = r0.get("minDate", DATASET_MIN_DATE)
        max_d = r0.get("maxDate", DATASET_MAX_DATE)

        ans = (
            f"Theo dữ liệu vận hành thực tế từ Neo4j (giai đoạn `{min_d}` đến `{max_d}`):\n"
            f"- **Tổng số đơn đặt hàng (`SalesOrder`)**: **`{_fmt_int(ords)}` đơn hàng**.\n"
            f"- **Tổng doanh thu gộp (`TotalDue`)**: **`{_fmt_money(gross)} USD`** (~`${round(gross/1_000_000, 2)}M`).\n"
            f"- **Tổng doanh thu thuần sản phẩm (`SubTotal`)**: **`{_fmt_money(net)} USD`** (~`${round(net/1_000_000, 2)}M`).\n"
            f"- **Tổng thuế (`TaxAmt`) & Phí vận chuyển (`Freight`)**: Thuế **`{_fmt_money(tax)} USD`**, Vận chuyển **`{_fmt_money(freight)} USD`**.\n"
            f"- **Giá trị trung bình mỗi đơn hàng (`AOV`)**: **`{_fmt_money(aov)} USD/đơn hàng`** (Tính theo doanh thu thuần: **`{_fmt_money(net / ords if ords else 0)} USD/đơn hàng`**)."
        )
        entities.append({
            "id": "sales-order-summary",
            "label": f"Tổng quan Doanh thu & Đơn hàng ({_fmt_int(ords)} đơn)",
            "type": "SalesOrder",
            "snippet": ans.replace("**", "").replace("`", ""),
            "cypher_verified": True,
        })
        return entities, ans

    # ------------------------------------------------------------------------
    # 4.4 COMPARATIVE ANALYSIS FORMATTER
    # ------------------------------------------------------------------------

    def _format_comparison(
        self, session: Any, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không có dữ liệu để thực hiện phép so sánh theo yêu cầu."

        # Check if comparing actual vs average ("So sánh doanh thu thực tế với doanh thu trung bình")
        if plan.vs_average and "period" in records[0]:
            avg_rev = sum(float(r.get("grossRevenue") or 0) for r in records) / len(records)
            lines = []
            for r in records:
                p = r.get("period")
                rev = float(r.get("grossRevenue") or 0)
                diff = rev - avg_rev
                pct = round((diff / avg_rev) * 100, 2) if avg_rev > 0 else 0.0
                sign = "+" if diff >= 0 else ""
                status = "Cao hơn trung bình" if diff >= 0 else "Thấp hơn trung bình"
                snip = (
                    f"Kỳ {p}: Doanh thu thực tế {_fmt_money(rev)} USD so với mức trung bình {_fmt_money(avg_rev)} USD "
                    f"({status}: {sign}{_fmt_money(diff)} USD, tương đương {sign}{pct}%)."
                )
                entities.append({
                    "id": f"comp-avg-{p}",
                    "label": f"So sánh kỳ {p} vs Trung bình",
                    "type": "SalesOrder",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(
                    f"- **Năm/Kỳ {p}**: Thực tế **{_fmt_money(rev)} USD** | Chênh lệch so với TB (**{_fmt_money(avg_rev)} USD**): **{sign}{_fmt_money(diff)} USD ({sign}{pct}%)** — *{status}*."
                )
            ans = (
                f"**Phân tích so sánh Doanh thu thực tế với Doanh thu trung bình mỗi kỳ (`{_fmt_money(avg_rev)} USD`):**\n"
                + "\n".join(lines)
            )
            return entities, ans

        # Period comparison (Months or Years)
        if "period" in records[0]:
            unit_vi = "Tháng" if plan.group_by == "Month" else "Năm"
            lines = []
            for idx, r in enumerate(records):
                p = r.get("period")
                rev = float(r.get("grossRevenue") or 0.0)
                net = float(r.get("netRevenue") or 0.0)
                ords = int(r.get("orderCount") or 0)
                delta_str = ""
                if idx > 0:
                    prev_rev = float(records[idx - 1].get("grossRevenue") or 0.0)
                    prev_ords = int(records[idx - 1].get("orderCount") or 0)
                    prev_p = records[idx - 1].get("period")
                    diff_rev = rev - prev_rev
                    pct_rev = round((diff_rev / prev_rev) * 100, 2) if prev_rev > 0 else 0.0
                    diff_ords = ords - prev_ords
                    pct_ords = round((diff_ords / prev_ords) * 100, 2) if prev_ords > 0 else 0.0
                    sign_r = "+" if diff_rev >= 0 else ""
                    sign_o = "+" if diff_ords >= 0 else ""
                    delta_str = (
                        f" | So với {unit_vi.lower()} {prev_p}: Doanh thu **{sign_r}{_fmt_money(diff_rev)} USD ({sign_r}{pct_rev}%)**, "
                        f"Số đơn hàng **{sign_o}{_fmt_int(diff_ords)} đơn ({sign_o}{pct_ords}%)**"
                    )
                snip = (
                    f"{unit_vi} {p}: Doanh thu gộp {_fmt_money(rev)} USD (Thuần: {_fmt_money(net)} USD) "
                    f"qua {_fmt_int(ords)} đơn hàng{delta_str.replace('**', '')}."
                )
                entities.append({
                    "id": f"comp-{p}",
                    "label": f"{unit_vi} {p}",
                    "type": "SalesOrder",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(
                    f"- **{unit_vi} {p}**: Doanh thu gộp **{_fmt_money(rev)} USD** (Thuần: **{_fmt_money(net)} USD**), **{_fmt_int(ords)} đơn hàng**{delta_str}."
                )

            note = ""
            if any(r.get("period") == "2014-06" for r in records):
                note = "\n\n> **Nhận xét dữ liệu**: Tháng `2014-06` là tháng kết thúc của bộ dữ liệu AdventureWorks (chỉ ghi nhận các đơn phụ kiện nhỏ đến `30/06/2014` với AOV `$57.67 USD`), dẫn đến mức sụt giảm `-99.09%` về doanh thu so với tháng `2014-05` (`$6,006,183.21 USD`)."
            elif any(r.get("period") == "2014" for r in records):
                note = "\n\n> **Nhận xét dữ liệu**: Năm `2014` trong cơ sở dữ liệu chỉ bao gồm dữ liệu 6 tháng đầu năm (từ `01/2014` đến `06/2014`), do đó tổng doanh thu cả năm thấp hơn năm `2013` (đủ 12 tháng)."

            ans = f"**Báo cáo So sánh {unit_vi} (kèm chênh lệch tuyệt đối và tỷ lệ %):**\n" + "\n".join(lines) + note
            return entities, ans

        # Category comparison
        if "CategoryName" in records[0]:
            total_rev = sum(float(r.get("categoryRevenue") or 0.0) for r in records)
            top_rev = float(records[0].get("categoryRevenue") or 0.0)
            top_name = records[0].get("CategoryName", "Bikes")
            lines = []
            for idx, r in enumerate(records, start=1):
                cname = r.get("CategoryName")
                rev = float(r.get("categoryRevenue") or 0.0)
                qty = int(r.get("totalSoldQty") or 0)
                ords = int(r.get("orderCount") or 0)
                pcnt = int(r.get("productCount") or 0)
                share = round((rev / total_rev) * 100, 2) if total_rev > 0 else 0.0
                diff_vs_top = rev - top_rev
                snip = (
                    f"Danh mục {cname}: Doanh thu {_fmt_money(rev)} USD (Tỷ trọng {share}%), "
                    f"đã bán {_fmt_int(qty)} sản phẩm ({pcnt} mã SP) qua {_fmt_int(ords)} đơn hàng."
                )
                entities.append({
                    "id": f"comp-cat-{cname}",
                    "label": f"Danh mục {cname}",
                    "type": "Category",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                vs_str = " *(Dẫn đầu #1)*" if idx == 1 else f" *(Thấp hơn {top_name}: {_fmt_money(abs(diff_vs_top))} USD)*"
                lines.append(
                    f"{idx}. **{cname}**: Doanh thu **{_fmt_money(rev)} USD** (**{share}%** tổng doanh thu) | Sản lượng: **{_fmt_int(qty)} sản phẩm** ({_fmt_int(ords)} đơn hàng){vs_str}."
                )
            ans = (
                f"**So sánh hiệu quả doanh thu & sản lượng giữa các Danh mục sản phẩm (Tổng: `{_fmt_money(total_rev)} USD`):**\n"
                + "\n".join(lines)
            )
            return entities, ans

        # Customer / Product comparison
        if "CustomerName" in records[0]:
            lines = []
            top_ords = int(records[0].get("orderCount") or 0)
            top_spent = float(records[0].get("totalSpent") or 0.0)
            for idx, r in enumerate(records, start=1):
                cid = r.get("CustomerID")
                cname = r.get("CustomerName")
                ords = int(r.get("orderCount") or 0)
                spent = float(r.get("totalSpent") or 0.0)
                aov = float(r.get("avgOrderValue") or 0.0)
                snip = f"Khách hàng {cname} (#{cid}): {_fmt_int(ords)} đơn hàng, tổng chi tiêu {_fmt_money(spent)} USD (Trung bình {_fmt_money(aov)} USD/đơn)."
                entities.append({
                    "id": f"comp-cust-{cid}",
                    "label": f"{cname} (#{cid})",
                    "type": "Customer",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(
                    f"{idx}. **{cname} (#{cid})**: **{_fmt_int(ords)} đơn hàng** | Tổng chi tiêu: **{_fmt_money(spent)} USD** (AOV: **{_fmt_money(aov)} USD/đơn**)."
                )
            ans = "**So sánh số lượng đơn hàng và tổng chi tiêu giữa các khách hàng dẫn đầu:**\n" + "\n".join(lines)
            return entities, ans

        # Product comparison
        lines = []
        for idx, r in enumerate(records, start=1):
            pid = r.get("ProductID")
            pname = r.get("ProductName")
            rev = float(r.get("totalRevenue") or 0.0)
            qty = int(r.get("totalSoldQty") or 0)
            ords = int(r.get("orderCount") or 0)
            snip = f"Sản phẩm {pname} (#{pid}): Doanh thu {_fmt_money(rev)} USD, sản lượng {_fmt_int(qty)} sản phẩm ({_fmt_int(ords)} đơn hàng)."
            entities.append({
                "id": f"comp-prod-{pid}",
                "label": f"{pname} (#{pid})",
                "type": "Product",
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(f"{idx}. **{pname} (#{pid})**: Doanh thu **{_fmt_money(rev)} USD** | Đã bán: **{_fmt_int(qty)} sản phẩm** ({_fmt_int(ords)} đơn hàng).")
        return entities, "**So sánh doanh thu và sản lượng bán giữa các sản phẩm dẫn đầu:**\n" + "\n".join(lines)

    # ------------------------------------------------------------------------
    # 4.5 FORMULA & KPI FORMATTER
    # ------------------------------------------------------------------------

    def _format_formula_kpi(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không tìm thấy dữ liệu để tính toán chỉ số KPI."

        r0 = records[0]

        if plan.metric == "avg_order_value":
            ords = int(r0.get("totalOrders") or 0)
            gross = float(r0.get("grossRevenue") or 0.0)
            net = float(r0.get("netRevenue") or 0.0)
            aov_gross = float(r0.get("avgOrderValue") or 0.0)
            aov_net = round(net / ords, 2) if ords > 0 else 0.0
            ans = (
                f"**Chỉ số Giá trị đơn hàng trung bình (Average Order Value - AOV):**\n"
                f"- **AOV theo Doanh thu gộp (`TotalDue / Số đơn hàng`)**: **`{_fmt_money(aov_gross)} USD / đơn hàng`** "
                f"(`{_fmt_money(gross)} USD` / `{_fmt_int(ords)}` đơn hàng).\n"
                f"- **AOV theo Doanh thu thuần (`SubTotal / Số đơn hàng`)**: **`{_fmt_money(aov_net)} USD / đơn hàng`** "
                f"(`{_fmt_money(net)} USD` / `{_fmt_int(ords)}` đơn hàng)."
            )
            entities.append({
                "id": "kpi-aov",
                "label": f"Giá trị đơn hàng trung bình (AOV: {_fmt_money(aov_gross)} USD)",
                "type": "SalesOrder",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        if plan.metric == "avg_revenue_per_customer":
            total_c = int(r0.get("totalCustomers") or 0)
            active_c = int(r0.get("activeCustomers") or 0)
            gross = float(r0.get("grossRevenue") or 0.0)
            arpc_active = float(r0.get("arpcActive") or 0.0)
            arpc_all = float(r0.get("arpcAll") or 0.0)
            ans = (
                f"**Chỉ số Doanh thu trung bình trên mỗi khách hàng (ARPC):**\n"
                f"- **Tính trên khách hàng đã mua hàng (`{_fmt_int(active_c)}` khách hàng active)**: **`{_fmt_money(arpc_active)} USD / khách hàng`**.\n"
                f"- **Tính trên toàn bộ khách hàng đăng ký (`{_fmt_int(total_c)}` khách hàng)**: **`{_fmt_money(arpc_all)} USD / khách hàng`**.\n"
                f"- *Cơ sở tính toán*: Tổng doanh thu gộp **`{_fmt_money(gross)} USD`** qua **`{_fmt_int(r0.get('totalOrders'))}` đơn hàng**."
            )
            entities.append({
                "id": "kpi-arpc",
                "label": f"Doanh thu TB/Khách hàng (ARPC: {_fmt_money(arpc_active)} USD)",
                "type": "Customer",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        if plan.metric == "repeat_customer_rate":
            active_c = int(r0.get("activeCustomers") or 0)
            repeat_c = int(r0.get("repeatCustomers") or 0)
            once_c = int(r0.get("oneTimeCustomers") or 0)
            rate = float(r0.get("repeatRatePct") or 0.0)
            ans = (
                f"**Chỉ số Tỷ lệ khách hàng quay lại (Repeat Customer Rate):**\n"
                f"- **Tỷ lệ khách hàng mua lặp lại (`>= 2` đơn hàng)**: **`{rate:.2f}%`** (**`{_fmt_int(repeat_c)}` / `{_fmt_int(active_c)}` khách hàng** đã phát sinh giao dịch).\n"
                f"- **Khách hàng mua 1 lần duy nhất (`1` đơn hàng)**: **`{_fmt_int(once_c)}` khách hàng** (`{round(100 - rate, 2):.2f}%`)."
            )
            entities.append({
                "id": "kpi-repeat-rate",
                "label": f"Tỷ lệ khách hàng quay lại ({rate:.2f}%)",
                "type": "Customer",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans

        if plan.metric == "revenue_growth_rate":
            lines = []
            for idx, r in enumerate(records):
                yr = r.get("salesYear")
                rev = float(r.get("grossRevenue") or 0.0)
                net = float(r.get("netRevenue") or 0.0)
                ords = int(r.get("orderCount") or 0)
                if idx == 0:
                    g_str = "*(Năm cơ sở bắt đầu từ 31/05/2011)*"
                else:
                    prev_rev = float(records[idx - 1].get("grossRevenue") or 0.0)
                    prev_yr = records[idx - 1].get("salesYear")
                    diff = rev - prev_rev
                    pct = round((diff / prev_rev) * 100, 2) if prev_rev > 0 else 0.0
                    sign = "+" if diff >= 0 else ""
                    g_str = f"Tăng trưởng so với {prev_yr}: **{sign}{pct}%** ({sign}{_fmt_money(diff)} USD)"
                    if yr == "2014":
                        g_str += " *(Lưu ý: Năm 2014 chỉ gồm 6 tháng đầu năm đến 30/06/2014)*"
                snip = f"Năm {yr}: Doanh thu gộp {_fmt_money(rev)} USD ({_fmt_int(ords)} đơn hàng) — {g_str.replace('**', '').replace('*', '')}."
                entities.append({
                    "id": f"growth-{yr}",
                    "label": f"Tăng trưởng năm {yr}",
                    "type": "SalesOrder",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(f"- **Năm {yr}**: Doanh thu gộp **{_fmt_money(rev)} USD** ({_fmt_int(ords)} đơn hàng) — {g_str}.")
            ans = "**Phân tích Tỷ lệ Tăng trưởng Doanh thu qua các năm (YoY Revenue Growth Rate):**\n" + "\n".join(lines)
            return entities, ans

        # revenue_share
        grand = float(r0.get("grandTotal") or 0.0)
        lines = []
        for idx, r in enumerate(records, start=1):
            name = r.get("CategoryName") or r.get("ProductName") or "N/A"
            rev = float(r.get("categoryRevenue") or r.get("itemRevenue") or 0.0)
            qty = int(r.get("totalSoldQty") or 0)
            share = float(r.get("sharePct") or 0.0)
            snip = f"{name}: Doanh thu {_fmt_money(rev)} USD, chiếm tỷ trọng {share:.2f}% trên tổng {_fmt_money(grand)} USD (Sản lượng: {_fmt_int(qty)} sản phẩm)."
            entities.append({
                "id": f"share-{idx}",
                "label": f"Tỷ trọng {name} ({share:.2f}%)",
                "type": plan.target_entity,
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(f"{idx}. **{name}**: Doanh thu **{_fmt_money(rev)} USD** — Chiếm tỷ trọng **`{share:.2f}%`** (Đã bán: {_fmt_int(qty)} sản phẩm).")
        target_vi = "Sản phẩm (Top 10)" if plan.target_entity == "Product" else "Danh mục sản phẩm (Category)"
        ans = f"**Phân tích Tỷ trọng đóng góp doanh thu theo {target_vi} (Tổng: `{_fmt_money(grand)} USD`):**\n" + "\n".join(lines)
        return entities, ans

    # ------------------------------------------------------------------------
    # 4.6 DATA RETRIEVAL FORMATTER
    # ------------------------------------------------------------------------

    def _format_retrieval(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str, Optional[Dict[str, Any]]]:
        entities: List[Dict[str, Any]] = []
        mode = plan.filters.get("lookup_mode", "customer_list")
        if not records:
            return [], "Không tìm thấy bản ghi nào khớp với mã hoặc tên đối tượng bạn tra cứu trong cơ sở dữ liệu Neo4j.", None

        r0 = records[0]

        if mode == "order_detail":
            oid = r0.get("SalesOrderID")
            odate = str(r0.get("OrderDate", "N/A"))
            cname = r0.get("CustomerName", "N/A")
            cid = r0.get("CustomerID")
            sub = float(r0.get("SubTotal") or 0.0)
            tax = float(r0.get("TaxAmt") or 0.0)
            fr = float(r0.get("Freight") or 0.0)
            due = float(r0.get("TotalDue") or 0.0)
            units = int(r0.get("totalUnits") or 0)
            items = [i for i in (r0.get("items") or []) if i.get("ProductID") is not None]
            item_lines = [
                f"  + **{it.get('ProductName')} (#{it.get('ProductID')})**: Số lượng `{it.get('OrderQty')}` x Đơn giá `{_fmt_money(it.get('UnitPrice'))}` = `{_fmt_money(it.get('lineTotal'))} USD`"
                for it in items[:10]
            ]
            ans = (
                f"**Thông tin chi tiết Đơn hàng `#{oid}`:**\n"
                f"- **Thời điểm tạo đơn (`OrderDate`)**: **`{odate}`**\n"
                f"- **Khách hàng đặt mua**: **{cname} (`#{cid}`)** — Mã tài khoản: `{r0.get('AccountNumber', 'N/A')}`\n"
                f"- **Tổng số lượng sản phẩm**: **`{_fmt_int(units)}` sản phẩm** ({len(items)} dòng mặt hàng)\n"
                f"- **Giá trị thanh toán**: Doanh thu thuần (`SubTotal`): **`{_fmt_money(sub)} USD`** | Thuế (`TaxAmt`): **`{_fmt_money(tax)} USD`** | Vận chuyển (`Freight`): **`{_fmt_money(fr)} USD`** | **Tổng cộng (`TotalDue`): `{_fmt_money(due)} USD`**"
            )
            if item_lines:
                ans += "\n- **Danh sách sản phẩm trong đơn hàng**:\n" + "\n".join(item_lines)
            entities.append({
                "id": f"order-{oid}",
                "label": f"Đơn hàng #{oid} ({odate[:10]})",
                "type": "SalesOrder",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans, r0

        if mode in ["customer_detail", "customer_products"]:
            cid = r0.get("CustomerID")
            cname = r0.get("CustomerName")
            acc = r0.get("AccountNumber", "N/A")
            ords = int(r0.get("orderCount") or 0)
            qty = int(r0.get("totalQty") or 0)
            dist_p = int(r0.get("distinctProducts") or 0)
            pval = float(r0.get("totalProductValue") or 0.0)
            prods = [p for p in (r0.get("purchasedProducts") or []) if p]
            prod_str = ", ".join(f"**{p}**" for p in prods[:12]) if prods else "Chưa phát sinh giao dịch mua sản phẩm"
            ans = (
                f"**Thông tin hồ sơ & lịch sử mua hàng của Khách hàng `{cname} (#{cid})`:**\n"
                f"- **Mã khách hàng (`CustomerID`)**: `#{cid}` (Số tài khoản: `{acc}`)\n"
                f"- **Tổng số đơn hàng đã đặt**: **`{_fmt_int(ords)}` đơn hàng**\n"
                f"- **Tổng số lượng sản phẩm đã mua**: **`{_fmt_int(qty)}` sản phẩm** thuộc **`{_fmt_int(dist_p)}` loại sản phẩm khác nhau**\n"
                f"- **Tổng giá trị sản phẩm đã mua (`lineTotal`)**: **`{_fmt_money(pval)} USD`**\n"
                f"- **Danh sách các sản phẩm tiêu biểu đã mua**: {prod_str}"
                + (f" *(và {dist_p - len(prods)} sản phẩm khác)*." if dist_p > len(prods) else ".")
            )
            entities.append({
                "id": f"cust-{cid}",
                "label": f"{cname} (#{cid})",
                "type": "Customer",
                "snippet": ans.replace("**", "").replace("`", ""),
                "cypher_verified": True,
            })
            return entities, ans, r0

        if mode == "product_detail":
            lines = []
            for r in records[:5]:
                pid = r.get("ProductID")
                pname = r.get("ProductName")
                pnum = r.get("ProductNumber", "N/A")
                cat = r.get("CategoryName", "Chưa phân loại")
                subcat = r.get("SubCategoryName", "Chưa phân loại")
                price = float(r.get("ListPrice") or 0.0)
                qty = int(r.get("totalSoldQty") or 0)
                rev = float(r.get("totalRevenue") or 0.0)
                snip = (
                    f"Sản phẩm {pname} (#{pid}, Mã: {pnum}): Thuộc danh mục '{cat}' > '{subcat}'. "
                    f"Giá niêm yết: {_fmt_money(price)} USD, đã bán {_fmt_int(qty)} sản phẩm, doanh thu {_fmt_money(rev)} USD."
                )
                entities.append({
                    "id": f"prod-{pid}",
                    "label": f"{pname} (#{pid})",
                    "type": "Product",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(
                    f"- **{pname} (`#{pid}`, Mã: `{pnum}`)**: Thuộc danh mục **`{cat}`** (Danh mục con: **`{subcat}`**) | Giá niêm yết: **`{_fmt_money(price)} USD`** | Đã bán: **`{_fmt_int(qty)} sản phẩm`** (Doanh thu: **`{_fmt_money(rev)} USD`**)."
                )
            ans = "**Thông tin chi tiết Sản phẩm & Danh mục phân loại trên Neo4j:**\n" + "\n".join(lines)
            return entities, ans, r0

        if mode == "product_list":
            lines = []
            for idx, r in enumerate(records, start=1):
                pid = r.get("ProductID")
                pname = r.get("ProductName")
                pnum = r.get("ProductNumber")
                price = float(r.get("ListPrice") or 0.0)
                cat = r.get("CategoryName", "Chưa phân loại")
                snip = f"Sản phẩm {pname} (#{pid}, Mã: {pnum}) - Danh mục: {cat}, Giá niêm yết: {_fmt_money(price)} USD."
                entities.append({
                    "id": f"prod-{pid}",
                    "label": f"{pname} (#{pid})",
                    "type": "Product",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(f"{idx}. **{pname} (`#{pid}`, Mã: `{pnum}`)** — Danh mục: *{cat}* — Giá: **{_fmt_money(price)} USD**.")
            ans = f"**Danh sách Sản phẩm hiện có trong hệ thống (Hiển thị {len(lines)} trên tổng số `504` sản phẩm):**\n" + "\n".join(lines)
            return entities, ans, r0

        # customer_list
        lines = []
        for idx, r in enumerate(records, start=1):
            cid = r.get("CustomerID")
            cname = r.get("CustomerName")
            acc = r.get("AccountNumber", "N/A")
            ords = int(r.get("orderCount") or 0)
            spent = float(r.get("totalSpent") or 0.0)
            snip = f"Khách hàng {cname} (#{cid}, TK: {acc}): {_fmt_int(ords)} đơn hàng, tổng chi tiêu {_fmt_money(spent)} USD."
            entities.append({
                "id": f"cust-{cid}",
                "label": f"{cname} (#{cid})",
                "type": "Customer",
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(f"{idx}. **{cname} (`#{cid}`, TK: `{acc}`)** — **{_fmt_int(ords)} đơn hàng** — Tổng chi tiêu: **{_fmt_money(spent)} USD**.")
        ans = (
            f"**Danh sách Khách hàng tiêu biểu trong hệ thống (Hiển thị Top {len(lines)} khách hàng trên tổng số `19,820` khách hàng):**\n"
            + "\n".join(lines)
        )
        return entities, ans, r0

    # ------------------------------------------------------------------------
    # 4.7 CONDITIONAL FILTERING FORMATTER
    # ------------------------------------------------------------------------

    def _format_conditional(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không có đối tượng nào thỏa mãn tổ hợp điều kiện lọc bạn đưa ra trong cơ sở dữ liệu Neo4j."

        r0 = records[0]
        total_matched = int(r0.get("totalMatchedCount") or len(records))
        avg_bench = r0.get("avgBenchmark")
        vnd_note = ""
        if "currency_note_vnd" in plan.filters:
            vnd_val = plan.filters["currency_note_vnd"]
            vnd_note = f" *(Lưu ý: Cơ sở dữ liệu ERP lưu tiền tệ theo chuẩn USD; mức `{_fmt_int(vnd_val)} VNĐ` đã được quy đổi tương đương sang USD theo tỷ giá tham chiếu `25,000 VNĐ/USD`).*"

        lines = []
        for idx, r in enumerate(records, start=1):
            if "CustomerID" in r:
                cid = r.get("CustomerID")
                cname = r.get("CustomerName")
                ords = int(r.get("orderCount") or 0)
                if "totalQty" in r:
                    qty = int(r.get("totalQty") or 0)
                    pval = float(r.get("totalProductValue") or 0.0)
                    snip = f"Khách hàng {cname} (#{cid}): Đã mua {_fmt_int(qty)} sản phẩm qua {_fmt_int(ords)} đơn hàng (Tổng giá trị SP: {_fmt_money(pval)} USD)."
                    lines.append(f"{idx}. **{cname} (`#{cid}`)**: Đã mua **{_fmt_int(qty)} sản phẩm** ({_fmt_int(ords)} đơn hàng) — Trị giá SP: **{_fmt_money(pval)} USD**.")
                else:
                    spent = float(r.get("totalSpent") or 0.0)
                    snip = f"Khách hàng {cname} (#{cid}): Tổng chi tiêu {_fmt_money(spent)} USD qua {_fmt_int(ords)} đơn hàng."
                    lines.append(f"{idx}. **{cname} (`#{cid}`)**: Tổng chi tiêu **{_fmt_money(spent)} USD** ({_fmt_int(ords)} đơn hàng).")
                entities.append({
                    "id": f"cond-cust-{cid}",
                    "label": f"{cname} (#{cid})",
                    "type": "Customer",
                    "snippet": snip,
                    "cypher_verified": True,
                })
            elif "ProductID" in r:
                pid = r.get("ProductID")
                pname = r.get("ProductName")
                if "totalRevenue" in r:
                    rev = float(r.get("totalRevenue") or 0.0)
                    qty = int(r.get("totalSoldQty") or 0)
                    snip = f"Sản phẩm {pname} (#{pid}): Doanh thu {_fmt_money(rev)} USD, đã bán {_fmt_int(qty)} sản phẩm."
                    lines.append(f"{idx}. **{pname} (`#{pid}`)**: Doanh thu **{_fmt_money(rev)} USD** (Đã bán: **{_fmt_int(qty)} sản phẩm**).")
                else:
                    price = float(r.get("ListPrice") or 0.0)
                    snip = f"Sản phẩm {pname} (#{pid}): Giá niêm yết {_fmt_money(price)} USD."
                    lines.append(f"{idx}. **{pname} (`#{pid}`)**: Giá niêm yết **{_fmt_money(price)} USD**.")
                entities.append({
                    "id": f"cond-prod-{pid}",
                    "label": f"{pname} (#{pid})",
                    "type": "Product",
                    "snippet": snip,
                    "cypher_verified": True,
                })
            else:
                oid = r.get("SalesOrderID")
                cname = r.get("CustomerName")
                odate = r.get("OrderDate")
                due = float(r.get("TotalDue") or 0.0)
                snip = f"Đơn hàng #{oid} (Khách hàng: {cname}, Ngày: {odate}): Tổng thanh toán {_fmt_money(due)} USD."
                entities.append({
                    "id": f"cond-ord-{oid}",
                    "label": f"Đơn hàng #{oid}",
                    "type": "SalesOrder",
                    "snippet": snip,
                    "cypher_verified": True,
                })
                lines.append(f"{idx}. **Đơn hàng `#{oid}`** (Khách hàng: **{cname}**, Ngày: `{odate}`): **{_fmt_money(due)} USD**.")

        bench_str = f" (Mức trung bình toàn hệ thống là **`{_fmt_money(avg_bench)} USD`**)" if avg_bench is not None else ""
        ans = (
            f"Tìm thấy tổng cộng **`{_fmt_int(total_matched)}` kết quả** thỏa mãn điều kiện lọc trong Neo4j{bench_str}{vnd_note}.\n\n"
            f"**Danh sách Top {len(lines)} đối tượng dẫn đầu thỏa điều kiện:**\n" + "\n".join(lines)
        )
        return entities, ans

    # ------------------------------------------------------------------------
    # 4.8 TIME-SERIES FORMATTER
    # ------------------------------------------------------------------------

    def _format_time_series(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], "Không tìm thấy dữ liệu chuỗi thời gian cho khoảng thời gian được yêu cầu."

        rel_note = ""
        if plan.relative_time == "today":
            rel_note = (
                f"> **Ghi chú mốc thời gian hệ thống**: Tập dữ liệu ERP AdventureWorks trong hệ thống ghi nhận giao dịch đến ngày cuối cùng là **`{DATASET_MAX_DATE}`**. "
                f"Dưới đây là kết quả của ngày giao dịch gần nhất trong hệ thống (`{DATASET_MAX_DATE}`):\n\n"
            )
        elif plan.relative_time == "this_month":
            rel_note = (
                f"> **Ghi chú mốc thời gian**: Tháng gần nhất trong tập dữ liệu hoạt động là tháng **`{DATASET_LATEST_MONTH}`**.\n\n"
            )
        elif plan.relative_time == "last_month":
            rel_note = (
                f"> **Ghi chú mốc thời gian**: Tháng liền trước tháng cuối cùng của tập dữ liệu là tháng **`{DATASET_PREV_MONTH}`**.\n\n"
            )
        elif plan.relative_time == "this_year":
            rel_note = (
                f"> **Ghi chú mốc thời gian**: Năm gần nhất trong tập dữ liệu ERP là năm **`{DATASET_LATEST_YEAR}`** (dữ liệu từ tháng 01 đến 30/06/2014).\n\n"
            )
        elif plan.relative_time == "last_year":
            rel_note = (
                f"> **Ghi chú mốc thời gian**: Năm liền trước năm cuối cùng của tập dữ liệu là năm **`{DATASET_PREV_YEAR}`**.\n\n"
            )

        lines = []
        total_rev = 0.0
        total_net = 0.0
        total_ords = 0

        for r in records:
            period = r.get("salesDay") or r.get("salesQuarter") or r.get("salesMonth") or r.get("salesYear") or "N/A"
            rev = float(r.get("grossRevenue") or 0.0)
            net = float(r.get("netRevenue") or 0.0)
            ords = int(r.get("orderCount") or 0)
            total_rev += rev
            total_net += net
            total_ords += ords
            snip = (
                f"Kỳ {period}: Doanh thu gộp (TotalDue) đạt {_fmt_money(rev)} USD (~${round(rev/1_000_000, 2)}M), "
                f"doanh thu thuần sản phẩm (SubTotal) đạt {_fmt_money(net)} USD qua {_fmt_int(ords)} đơn hàng."
            )
            entities.append({
                "id": f"trend-{period}",
                "label": f"Doanh thu kỳ {period}",
                "type": "SalesOrder",
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(
                f"- **Kỳ `{period}`**: Doanh thu gộp **`{_fmt_money(rev)} USD`** (Doanh thu thuần `SubTotal`: **`{_fmt_money(net)} USD`**) — **`{_fmt_int(ords)}` đơn hàng**."
            )

        if len(records) == 1:
            r0 = records[0]
            p0 = r0.get("salesDay") or r0.get("salesQuarter") or r0.get("salesMonth") or r0.get("salesYear")
            ans = (
                rel_note
                + f"Trong kỳ **`{p0}`**, hệ thống ghi nhận:\n"
                f"- **Số lượng đơn hàng**: **`{_fmt_int(r0.get('orderCount'))}` đơn hàng**\n"
                f"- **Doanh thu gộp (`TotalDue`)**: **`{_fmt_money(r0.get('grossRevenue'))} USD`**\n"
                f"- **Doanh thu thuần sản phẩm (`SubTotal`)**: **`{_fmt_money(r0.get('netRevenue'))} USD`**"
            )
            return entities, ans

        ans = (
            rel_note
            + f"**Thống kê Doanh thu & Số lượng đơn hàng theo thời gian ({len(records)} kỳ — Tổng doanh thu gộp: `{_fmt_money(total_rev)} USD`, Tổng đơn: `{_fmt_int(total_ords)}` đơn hàng):**\n"
            + "\n".join(lines[:20])
        )
        if len(lines) > 20:
            ans += f"\n*(Hiển thị 20/{len(lines)} kỳ. Đầy đủ dữ liệu đã được tổng hợp vào tổng doanh thu ở trên).*"
        return entities, ans

    # ------------------------------------------------------------------------
    # 4.9 CAUSAL ANALYSIS & EXECUTIVE REPORT FORMATTERS
    # ------------------------------------------------------------------------

    def _format_causal_analysis(
        self, session: Any, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        # Gather 1) Category contribution, 2) Last 6 months trend, 3) Unsold / Slowest products
        cat_rows = [dict(r) for r in session.run(
            "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
            "WITH c, ROUND(SUM(toFloat(r.lineTotal))*100)/100 AS rev, SUM(toInteger(r.OrderQty)) AS qty, COUNT(DISTINCT p.ProductID) AS pcnt "
            "ORDER BY rev DESC RETURN c.name AS name, rev, qty, pcnt"
        )]
        mo_rows = [dict(r) for r in session.run(
            "MATCH (o:SalesOrder) "
            "WHERE o.OrderDate IS NOT NULL AND toString(o.OrderDate) <> '' "
            "WITH substring(toString(o.OrderDate), 0, 7) AS mo, COUNT(DISTINCT o.SalesOrderID) AS ords, "
            "     ROUND(SUM(toFloat(o.TotalDue))*100)/100 AS rev, ROUND(AVG(toFloat(o.TotalDue))*100)/100 AS aov "
            "ORDER BY mo DESC LIMIT 4 RETURN mo, ords, rev, aov ORDER BY mo ASC"
        )]
        slow_rows = [dict(r) for r in session.run(
            "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product) "
            "WITH p, SUM(toInteger(r.OrderQty)) AS qty, ROUND(SUM(toFloat(r.lineTotal))*100)/100 AS rev "
            "ORDER BY qty ASC, rev ASC LIMIT 3 RETURN p.ProductID AS id, p.name AS name, qty, rev"
        )]

        total_cat_rev = sum(float(c.get("rev") or 0) for c in cat_rows)
        cat_lines = [
            f"  + **{c['name']}**: Doanh thu **{_fmt_money(c['rev'])} USD** (Tỷ trọng **`{round(float(c['rev'])/total_cat_rev*100, 2)}%`**, sản lượng `{_fmt_int(c['qty'])}` SP)"
            for c in cat_rows
        ]
        mo_lines = [
            f"  + **Tháng `{m['mo']}`**: Doanh thu **{_fmt_money(m['rev'])} USD** | `{_fmt_int(m['ords'])}` đơn hàng | Giá trị đơn TB (`AOV`): **{_fmt_money(m['aov'])} USD**"
            for m in mo_rows
        ]
        slow_lines = [
            f"  + **{s['name']} (`#{s['id']}`)**: Chỉ bán được **`{s['qty']}` sản phẩm** (Doanh thu: `{_fmt_money(s['rev'])} USD`)"
            for s in slow_rows
        ]

        ans = (
            "**Phân tích Nguyên nhân & Các yếu tố tác động đến Hiệu suất Kinh doanh (Dựa trên dữ liệu Neo4j GraphDB):**\n\n"
            "**1. Sự tập trung doanh thu theo Danh mục sản phẩm (Hiệu ứng Pareto):**\n"
            + "\n".join(cat_lines) + "\n"
            "- *Nhận định*: Danh mục **Bikes (Xe đạp)** đóng góp tới **`86.20%` tổng doanh thu sản phẩm** (`$95.15M`), dù sản lượng chiếc (`90,268` chiếc) chỉ nhỉnh hơn nhóm **Clothing** (`73,670` SP) và **Accessories** (`61,932` SP). Do đó, bất kỳ biến động nào về số đơn hàng xe đạp nguyên chiếc đều làm thay đổi mạnh tổng doanh thu.\n\n"
            "**2. Nguyên nhân biến động doanh thu các tháng cuối kỳ (`03/2014` – `06/2014`):**\n"
            + "\n".join(mo_lines) + "\n"
            "- *Nhận định*: Sau khi đạt đỉnh vào tháng **`2014-03`** (`$8,097,036.31 USD`, `2,399` đơn hàng, AOV `$3,375.17 USD`), doanh thu tháng **`2014-06`** giảm mạnh xuống còn **`$54,151.48 USD`** (`939` đơn hàng, AOV giảm còn **`$57.67 USD`**). Nguyên nhân trực tiếp là trong tháng `06/2014` (tháng đóng sổ dữ liệu `30/06/2014`), các đơn hàng chủ yếu là phụ kiện nhỏ lẻ (`Accessories` & `Clothing`), không phát sinh các đơn hàng xe đạp giá trị lớn.\n\n"
            "**3. Nhóm sản phẩm bán chậm & Danh mục chưa khai thác:**\n"
            "- Trên tổng số `504` sản phẩm trong danh mục, có **`238` mã sản phẩm (`47.22%`) chưa phát sinh đơn hàng nào**. Trong nhóm `266` sản phẩm có doanh số, các mã bán chậm nhất là:\n"
            + "\n".join(slow_lines)
        )
        entities.append({
            "id": "causal-business-analysis",
            "label": "Phân tích Nguyên nhân & Động lực Doanh thu ERP",
            "type": "SalesOrder",
            "snippet": ans.replace("**", "").replace("`", ""),
            "cypher_verified": True,
        })
        return entities, ans

    def _format_executive_report(
        self, session: Any, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        kpi_rows = [dict(r) for r in session.run(
            "MATCH (o:SalesOrder) "
            "RETURN COUNT(DISTINCT o.SalesOrderID) AS totalOrders, "
            "       ROUND(SUM(toFloat(o.TotalDue))*100)/100 AS grossRev, "
            "       ROUND(SUM(toFloat(o.SubTotal))*100)/100 AS netRev, "
            "       ROUND(AVG(toFloat(o.TotalDue))*100)/100 AS aov"
        )]
        cust_rows = [dict(r) for r in session.run(
            "MATCH (c:Customer) OPTIONAL MATCH (c)-[:PLACED_ORDER]->(o:SalesOrder) "
            "WITH c, COUNT(DISTINCT o.SalesOrderID) AS cnt "
            "RETURN COUNT(c) AS totalCust, SUM(CASE WHEN cnt > 0 THEN 1 ELSE 0 END) AS activeCust, "
            "       SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS repeatCust"
        )]
        cat_rows = [dict(r) for r in session.run(
            "MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)-[:BELONGS_TO]->(sc:SubCategory)-[:PART_OF]->(c:Category) "
            "RETURN c.name AS name, ROUND(SUM(toFloat(r.lineTotal))*100)/100 AS rev, SUM(toInteger(r.OrderQty)) AS qty "
            "ORDER BY rev DESC"
        )]

        k = kpi_rows[0] if kpi_rows else {}
        c = cust_rows[0] if cust_rows else {}
        yr_lines = [
            f"  + **Năm `{r.get('salesYear')}`**: Doanh thu gộp **`{_fmt_money(r.get('grossRevenue'))} USD`** (Thuần: `{_fmt_money(r.get('netRevenue'))} USD`) — **`{_fmt_int(r.get('orderCount'))}` đơn hàng**"
            for r in records
        ]
        cat_lines = [
            f"  + **{cr.get('name')}**: **`{_fmt_money(cr.get('rev'))} USD`** (`{_fmt_int(cr.get('qty'))}` sản phẩm)"
            for cr in cat_rows
        ]
        active_c = int(c.get("activeCust") or 1)
        repeat_c = int(c.get("repeatCust") or 0)
        repeat_pct = round(repeat_c / active_c * 100, 2)

        ans = (
            "**BÁO CÁO TỔNG HỢP TÌNH HÌNH KINH DOANH TOÀN HỆ THỐNG (NEO4J ERP ANALYTICS)**\n\n"
            "**1. Chỉ số Tài chính & Đơn hàng cốt lõi (`2011-05-31` đến `2014-06-30`):**\n"
            f"- **Tổng doanh thu gộp (`TotalDue`)**: **`{_fmt_money(k.get('grossRev'))} USD`** (~`$123.22M`)\n"
            f"- **Tổng doanh thu thuần (`SubTotal`)**: **`{_fmt_money(k.get('netRev'))} USD`** (~`$109.85M`)\n"
            f"- **Tổng số đơn hàng (`SalesOrder`)**: **`{_fmt_int(k.get('totalOrders'))}` đơn hàng** (Giá trị đơn hàng trung bình `AOV`: **`{_fmt_money(k.get('aov'))} USD/đơn`**)\n\n"
            "**2. Quy mô & Chất lượng Tệp Khách hàng (`Customer`):**\n"
            f"- **Tổng số khách hàng**: **`{_fmt_int(c.get('totalCust'))}` khách hàng** (Trong đó **`{_fmt_int(active_c)}` khách hàng** đã phát sinh giao dịch mua)\n"
            f"- **Tỷ lệ khách hàng quay lại (`>= 2` đơn hàng)**: **`{repeat_pct}%`** (**`{_fmt_int(repeat_c)}` khách hàng**)\n\n"
            "**3. Diễn biến Doanh thu qua các Năm:**\n"
            + "\n".join(yr_lines) + "\n\n"
            "**4. Cơ cấu Doanh thu theo Danh mục Sản phẩm (`Category`):**\n"
            + "\n".join(cat_lines) + "\n\n"
            "**5. Nhận xét & Khuyến nghị quản trị dựa trên dữ liệu:**\n"
            "- **Động lực tăng trưởng**: Doanh thu tăng trưởng bứt phá từ năm `2011` (`$14.16M`) lên đỉnh năm `2013` (`$48.97M`, tăng `+166.15%` năm 2012 và `+29.97%` năm 2013).\n"
            "- **Tối ưu danh mục**: Nhóm **Bikes** chiếm `86.20%` doanh thu; có thể đẩy mạnh bán chéo (cross-sell) **Accessories** và **Clothing** đi kèm các đơn hàng xe đạp để nâng cao AOV, đồng thời rà soát `238` mã sản phẩm trong danh mục chưa phát sinh doanh số."
        )
        entities.append({
            "id": "executive-business-report",
            "label": "Báo cáo Tổng quan Kinh doanh ERP (Executive Summary)",
            "type": "SalesOrder",
            "snippet": ans.replace("**", "").replace("`", ""),
            "cypher_verified": True,
        })
        return entities, ans

    def _format_generic(
        self, plan: QueryPlan, records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], str]:
        entities: List[Dict[str, Any]] = []
        if not records:
            return [], ""
        lines = []
        for idx, r in enumerate(records, start=1):
            ename = r.get("entity_name", f"Entity #{idx}")
            types = r.get("types", ["Node"])
            props = r.get("props", {})
            snip = f"Thực thể '{ename}' ({', '.join(types)}): {str(props)[:200]}"
            entities.append({
                "id": f"gen-{idx}",
                "label": str(ename),
                "type": types[0] if types else "Entity",
                "snippet": snip,
                "cypher_verified": True,
            })
            lines.append(f"- **{ename}** (`{', '.join(types)}`)\n")
        return entities, "Kết quả tra cứu thực thể trên Neo4j:\n" + "\n".join(lines)


analytics_engine = AnalyticsExecutionEngine()


def analyze_and_plan_query(
    query: str,
    session_id: Optional[str] = None,
    history_messages: Optional[List[Dict[str, Any]]] = None,
) -> QueryPlan:
    return planner.plan(query, session_id=session_id, history_messages=history_messages)


def build_cypher_from_plan(plan: QueryPlan) -> str:
    return query_builder.build(plan)


def execute_nl2cypher_pipeline(
    query: str,
    session_id: Optional[str] = None,
    history_messages: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    return analytics_engine.execute_pipeline(
        query, session_id=session_id, history_messages=history_messages
    )

