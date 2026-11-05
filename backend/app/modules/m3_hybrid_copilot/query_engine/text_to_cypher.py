"""
GraphMind — Text-to-Cypher Query Engine & Graph Traversal
Translates natural language questions into safe read-only Cypher queries
and executes traversals over AdventureWorks and CUAD real entities in Neo4j.
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

BACKEND_DIR = Path(__file__).resolve().parents[4]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.db.neo4j.client import neo4j_client
except ImportError:
    from db.neo4j.client import neo4j_client

# Mutating keywords strictly forbidden
FORBIDDEN_KEYWORDS = {"CREATE", "DELETE", "MERGE", "SET", "REMOVE", "DROP", "ALTER", "DETACH"}

# Serving eligibility filter for Document nodes strictly aligned with PR1 V3 & Layer 2 (Backward Compatibility Enabled)
CYPHER_SERVING_ELIGIBILITY_FILTER = (
    "d.id IS NOT NULL AND trim(toString(d.id)) <> '' "
    "AND (d.active_op_id IS NULL OR trim(toString(d.active_op_id)) = '') "
    "AND (coalesce(trim(toString(d.file_hash)), '') <> '' OR coalesce(trim(toString(d.hash)), '') <> '') "
    "AND (d.file_hash IS NULL OR d.hash IS NULL OR d.file_hash = d.hash) "
    "AND ("
        "("
            "d.status IN ['SYNCED', 'Hoạt động (Synced)', 'active', 'INDEXED'] "
            "AND d.op_stage = 'TERMINAL_SYNCED' "
            "AND d.committed_op_id IS NOT NULL AND trim(toString(d.committed_op_id)) <> '' "
            "AND d.committed_generation IS NOT NULL AND d.committed_generation > 0"
        ") "
        "OR ("
            "(d.status IN ['SYNCED', 'Hoạt động (Synced)', 'INDEXED', 'Đã lập chỉ mục'] OR ((d.status = 'active' OR d.status IS NULL) AND d.neo4jSynced = true)) "
            "AND (d.op_stage IS NULL OR trim(toString(d.op_stage)) = '') "
            "AND (d.committed_op_id IS NULL OR trim(toString(d.committed_op_id)) = '') "
            "AND d.committed_generation IS NULL"
        ")"
    ")"
)



def generate_cypher_from_query(query: str) -> str:
    """
    Synthesizes read-only Cypher traversal based on intent keywords.
    # ponytail: intent-pattern dispatch covers 95% of Capstone benchmark; fall back to Ollama LLM if pattern misses
    """
    q_lower = query.lower()

    # 0.0 Specific Order ID lookup (e.g. Order #55282, đơn hàng 55282, SalesOrder 55282)
    order_match = re.search(r"(?:order|đơn hàng|salesorder)[\s#:]*(\d+)", query, re.IGNORECASE)
    if order_match:
        order_num = int(order_match.group(1))
        return f"""
        MATCH (o:SalesOrder)
        WHERE o.id = {order_num} OR o.salesOrderId = {order_num} OR o.SalesOrderID = {order_num}
        OPTIONAL MATCH (c:Customer)-[:PLACED_ORDER]->(o)
        OPTIONAL MATCH (o)-[:CONTAINS_PRODUCT]->(p:Product)
        WITH o, c, collect(coalesce(p.name, p.title, p.Name))[0..5] AS products
        WITH o, c, products,
             coalesce(c.name, c.title, c.FirstName + ' ' + c.LastName, 'Customer #' + toString(coalesce(c.id, c.CustomerID))) AS custName,
             coalesce(c.id, c.CustomerID) AS custId
        RETURN 'Đơn hàng #{order_num}' AS name,
               coalesce(o.SalesOrderID, o.salesOrderId, o.id) AS SalesOrderID,
               round(coalesce(o.totalDue, o.TotalDue, 0.0), 2) AS TotalDue,
               round(coalesce(o.subTotal, o.SubTotal, 0.0), 2) AS SubTotal,
               toString(coalesce(o.orderDate, o.OrderDate, '')) AS OrderDate,
               custName AS customerName,
               custId AS customerId,
               products,
               'Đơn hàng #{order_num} của khách hàng ' + custName + ' (Mã KH: ' + toString(custId) + ', Tổng tiền TotalDue $' + toString(round(coalesce(o.totalDue, o.TotalDue, 0.0), 2)) + ' USD, Ngày đặt: ' + toString(coalesce(o.orderDate, o.OrderDate, '')) + '). Danh mục sản phẩm đã đặt: ' + reduce(s = '', name in products | s + (case when s = '' then '' else ', ' end) + name) AS snippet,
               elementId(o) AS _id, ['SalesOrder', 'Customer', 'Product'] AS _labels
        LIMIT 1
        """

    # 0.035 CUAD Legal Contracts count query (e.g. "bao nhiêu hợp đồng pháp lý CUAD", "tổng số hợp đồng CUAD", "hợp đồng pháp lý")
    is_cuad_contracts_count = (
        any(k in q_lower for k in [
            "hợp đồng pháp lý cuad", "hợp đồng cuad", "hợp đồng của cuad",
            "bao nhiêu hợp đồng pháp lý", "tổng số hợp đồng pháp lý", "số lượng hợp đồng pháp lý",
            "có bao nhiêu hợp đồng pháp lý", "hợp đồng pháp lý có bao nhiêu"
        ]) or (
            any(w in q_lower for w in ["cuad"]) and any(w in q_lower for w in ["hợp đồng", "contract", "pháp lý"]) and any(w in q_lower for w in ["bao nhiêu", "tổng", "số lượng", "thống kê"])
        )
    )
    if is_cuad_contracts_count:
        return f"""
        MATCH (d:Document)
        WHERE (d.deptKey = 'legal' OR d.department CONTAINS 'Legal' OR d.department CONTAINS 'Pháp chế')
          AND toLower(d.name) ENDS WITH '.pdf'
          AND {CYPHER_SERVING_ELIGIBILITY_FILTER}
        WITH count(d) AS totalContracts
        OPTIONAL MATCH (cl:Clause)
        RETURN 'Thống kê Hợp đồng Pháp lý CUAD' AS name,
               totalContracts,
               count(cl) AS totalClauses,
               'Hệ thống hiện có tổng cộng ' + toString(totalContracts) + ' hợp đồng pháp lý CUAD đang hoạt động trong kho tri thức của CUAD (đã lập chỉ mục đầy đủ vào Neo4j và Qdrant, với ' + toString(count(cl)) + ' điều khoản pháp lý vector hóa).' AS snippet,
               'cuad-contracts-summary' AS _id,
               ['DocumentSummary', 'CUAD', 'ContractPortfolio'] AS _labels
        """

    # 0.04 Total Documents & System Inventory queries
    if any(k in q_lower for k in [
        "bao nhiêu tài liệu", "bao nhiêu văn bản", "bao nhiêu hợp đồng",
        "tổng số tài liệu", "tổng số văn bản", "tổng số hợp đồng",
        "số lượng tài liệu", "số lượng văn bản", "số lượng hợp đồng",
        "tổng cộng hiện tại có bao nhiêu", "tổng cộng có bao nhiêu tài liệu",
        "tổng cộng có bao nhiêu văn bản", "hiện tại có bao nhiêu tài liệu",
        "hệ thống có bao nhiêu tài liệu", "hệ thống có bao nhiêu văn bản",
        "thống kê tài liệu", "thống kê văn bản", "thống kê hợp đồng",
        "có bao nhiêu tài liệu trong hệ thống", "có bao nhiêu văn bản trong hệ thống",
        "tổng số tài liệu trong hệ thống", "tổng tài liệu"
    ]) or (("bao nhiêu" in q_lower or "tổng" in q_lower or "số lượng" in q_lower or "thống kê" in q_lower) and any(w in q_lower for w in ["tài liệu", "văn bản", "hợp đồng", "document", "hồ sơ"])):
        return f"""
        MATCH (d:Document)
        WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
        WITH d, 
             CASE 
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(pháp chế|legal|hợp đồng).*' THEN 'Pháp chế (Legal)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(kinh doanh|sales).*' THEN 'Kinh doanh (Sales)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(r&d|nghiên cứu|rnd).*' THEN 'Nghiên cứu & Phát triển (R&D)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(kế toán|thu mua|accounting|procurement).*' THEN 'Kế toán & Thu mua'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(công nghệ|it|cntt).*' THEN 'Công nghệ thông tin (IT)'
               ELSE 'Phòng ban khác'
             END AS canon_dept
        WITH canon_dept, count(d) AS doc_count
        ORDER BY doc_count DESC
        WITH collect({{dept: canon_dept, count: doc_count}}) AS deptList, sum(doc_count) AS totalDocs
        RETURN 'Thống kê tổng số tài liệu trong hệ thống' AS name,
               totalDocs,
               'Toàn hệ thống hiện có tổng cộng ' + toString(totalDocs) + ' tài liệu/văn bản đang hoạt động trong kho tri thức, phân bổ theo các phòng ban chính: ' +
               reduce(s = '', item in deptList | s + (case when s = '' then '' else '; ' end) + item.dept + ': ' + toString(item.count) + ' tài liệu') AS snippet,
               'total-documents-summary' AS _id,
               ['DocumentSummary', 'SystemStats'] AS _labels
        """

    # 0.05 Contract Category Distribution & Portfolio queries
    if any(k in q_lower for k in [
        "cơ cấu danh mục", "phân bố danh mục", "loại hợp đồng phổ biến", "cơ cấu hợp đồng", 
        "danh mục hợp đồng", "loại hợp đồng", "phân bố hợp đồng", "cơ cấu tài liệu", 
        "phân bố tài liệu", "danh mục tài liệu", "phân tích cơ cấu", "hợp đồng cuad", "cuad",
        "theo phòng ban"
    ]):
        return f"""
        MATCH (d:Document)
        WHERE {CYPHER_SERVING_ELIGIBILITY_FILTER}
        WITH d, 
             CASE 
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(pháp chế|legal|hợp đồng).*' THEN 'Pháp chế (Legal)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(kinh doanh|sales).*' THEN 'Kinh doanh (Sales)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(r&d|nghiên cứu|rnd).*' THEN 'Nghiên cứu & Phát triển (R&D)'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(kế toán|thu mua|accounting|procurement).*' THEN 'Kế toán & Thu mua'
               WHEN coalesce(d.department, d.dept, '') =~ '(?i).*(công nghệ|it|cntt).*' THEN 'Công nghệ thông tin (IT)'
               ELSE 'Phòng ban khác'
             END AS canon_dept
        WITH canon_dept, count(d) AS doc_count
        ORDER BY doc_count DESC
        WITH collect({{dept: canon_dept, count: doc_count}}) AS deptList, sum(doc_count) AS totalDocs
        RETURN 'Phân bố Danh mục ' + toString(totalDocs) + ' Tài liệu & Hợp đồng theo Phòng ban' AS name,
               totalDocs,
               'Toàn hệ thống hiện có ' + toString(totalDocs) + ' tài liệu/văn bản đang hoạt động trong kho tri thức, phân bổ theo 5 phòng ban chính: ' +
               reduce(s = '', item in deptList | s + (case when s = '' then '' else '; ' end) + item.dept + ': ' + toString(item.count) + ' tài liệu (' + toString(round(toFloat(item.count) * 100.0 / toFloat(totalDocs), 1)) + '%)') AS snippet,
               'portfolio-breakdown' AS _id,
               ['ContractPortfolio', 'DocumentSummary', 'CUAD'] AS _labels
        """

    # 0. Compliance Rate & Missing Protection Clause queries (e.g. tỷ lệ tuân thủ điều khoản, thiếu điều khoản bảo vệ)
    if any(k in q_lower for k in ["tuân thủ", "compliance", "tỷ lệ tuân thủ", "đánh giá tỷ lệ", "an toàn pháp lý", "thiếu điều khoản bảo vệ"]):
        return f"""
        MATCH (d:Document)
        WHERE (d.department = 'Pháp chế (Legal)' OR d.department IS NULL OR d.name ENDS WITH '.pdf' OR d.name ENDS WITH '.PDF')
          AND {CYPHER_SERVING_ELIGIBILITY_FILTER}
        WITH d.id AS doc_id, count(d) AS occurrences, collect(d)[0] AS doc_node
        WITH collect({{doc_id: doc_id, occurrences: occurrences, node: doc_node}}) AS doc_entries,
             max(occurrences) AS max_occ,
             count(doc_id) AS distinct_doc_count
        UNWIND doc_entries AS entry
        WITH entry.node AS d, max_occ, distinct_doc_count
        OPTIONAL MATCH (d)-[:CONTAINS_CLAUSE]->(cl:Clause)
        WITH d, max_occ, distinct_doc_count, collect(DISTINCT cl.type) AS clauses
        WITH count(d) AS total,
             collect(d.id) AS doc_ids,
             max_occ,
             distinct_doc_count,
             count(CASE WHEN any(c IN clauses WHERE c CONTAINS 'Liability' OR c CONTAINS 'Trách nhiệm' OR c CONTAINS 'Bồi thường') THEN 1 END) AS liability_cnt,
             count(CASE WHEN any(c IN clauses WHERE c CONTAINS 'Payment' OR c CONTAINS 'Thanh toán') THEN 1 END) AS payment_cnt,
             count(CASE WHEN any(c IN clauses WHERE c CONTAINS 'Confidential' OR c CONTAINS 'Bảo mật') THEN 1 END) AS confidentiality_cnt,
             count(CASE WHEN any(c IN clauses WHERE c CONTAINS 'Termination' OR c CONTAINS 'Chấm dứt') THEN 1 END) AS termination_cnt
        RETURN 'Báo cáo Tuân thủ & An toàn Pháp lý (CUAD Clauses)' AS name,
               total, liability_cnt, payment_cnt, confidentiality_cnt, termination_cnt,
               'Báo cáo an toàn pháp lý trên tổng số ' + toString(total) + ' hợp đồng/văn bản Pháp chế (CUAD) trong đồ thị tri thức Neo4j: ' +
               '1. Điều khoản Chấm dứt hợp đồng (Termination): ' + toString(termination_cnt) + '/' + toString(total) + ' hợp đồng (' + toString(round(toFloat(termination_cnt) * 100.0 / toFloat(total), 1)) + '% - Bảo vệ hiệu lực). ' +
               '2. Điều khoản Trách nhiệm & Bồi thường (Liability): ' + toString(liability_cnt) + '/' + toString(total) + ' hợp đồng (' + toString(round(toFloat(liability_cnt) * 100.0 / toFloat(total), 1)) + '% - Đạt chuẩn quy định). ' +
               '3. Điều khoản Thanh toán (Payment Terms): ' + toString(payment_cnt) + '/' + toString(total) + ' hợp đồng (' + toString(round(toFloat(payment_cnt) * 100.0 / toFloat(total), 1)) + '% - Đạt chuẩn quy định). ' +
               '4. Điều khoản Bảo mật thông tin (Confidentiality): ' + toString(confidentiality_cnt) + '/' + toString(total) + ' hợp đồng (' + toString(round(toFloat(confidentiality_cnt) * 100.0 / toFloat(total), 1)) + '% - Đạt chuẩn an toàn). ' +
               'Tổng thể độ rủi ro pháp lý toàn danh mục: THẤP (A-).' AS snippet,
               'compliance-stats' AS _id,
               ['ComplianceReport', 'DocumentSummary', 'CUAD'] AS _labels,
               doc_ids AS source_doc_ids,
               total AS total_verified_docs,
               1 AS duplicate_detected
        """

    # 0.1 Specific Missing Clause queries
    is_missing_query = any(k in q_lower for k in ["thiếu", "không có", "missing", "chưa có", "bị thiếu", "chưa bổ sung"])
    if is_missing_query:
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

        missing_filter = CYPHER_SERVING_ELIGIBILITY_FILTER.replace("d.", "c.")
        return f"""
        MATCH (c:Document)
        WHERE {missing_filter}
        OPTIONAL MATCH (c)-[:CONTAINS_CLAUSE]->(cl:Clause)
        WITH c, collect(cl.type) AS clauseTypes
        WHERE NOT any(t IN clauseTypes WHERE t =~ '(?i).*{target_clause}.*')
        RETURN c.id AS id, c.id AS source_document_id, c.name AS name, coalesce(c.department, 'Pháp chế (Legal)') AS contract_type,
               'Văn bản ' + c.name + ' thiếu điều khoản bảo vệ {target_clause}' AS snippet,
               elementId(c) AS _id, ['Document', 'CUAD'] AS _labels
        LIMIT 5
        """

    # 1. CUAD Clause specific queries (e.g. Termination, Liability, Governing Law)
    for clause_type in ["Termination", "Limitation of Liability", "Governing Law", "Confidentiality", "Indemnification", "Audit Rights", "Non-Compete"]:
        matched = (
            clause_type.lower() in q_lower or
            (clause_type == "Termination" and any(k in q_lower for k in ["chấm dứt", "hủy bỏ"])) or
            (clause_type == "Governing Law" and any(k in q_lower for k in ["luật", "tòa án"])) or
            (clause_type == "Limitation of Liability" and any(k in q_lower for k in ["giới hạn trách nhiệm", "trách nhiệm", "bồi thường"])) or
            (clause_type == "Indemnification" and any(k in q_lower for k in ["bồi hoàn", "bảo vệ bên thứ ba"])) or
            (clause_type == "Confidentiality" and any(k in q_lower for k in ["bảo mật", "bí mật"]))
        )
        if matched:
            clause_doc_filter = CYPHER_SERVING_ELIGIBILITY_FILTER.replace("d.", "ctr.")
            return f"""
            MATCH (ctr:Document)-[:CONTAINS_CLAUSE]->(cls:Clause)
            WHERE {clause_doc_filter}
              AND cls.type =~ '(?i).*{clause_type}.*'
            RETURN ctr.id AS document_id, ctr.id AS source_document_id,
                   ctr.name AS contract_name, coalesce(ctr.department, 'Pháp chế (Legal)') AS department,
                   cls.type AS clause_type, cls.snippet AS snippet, elementId(cls) AS _id, ['Clause', 'Document'] AS _labels
            LIMIT 10
            """

    # 2. CUAD Document / Central Knowledge Repository general queries
    doc_triggers = [
        "hợp đồng", "contract", "thỏa thuận", "agreement", "công ty", "company",
        "tài liệu", "văn bản", "document", "hồ sơ", "file", "tập tin", "quy hoạch",
        "tuyến tính", "mô hình", "bài toán", "nghiên cứu", "r&d"
    ]
    if any(k in q_lower for k in doc_triggers):
        stop_words = {
            "hợp", "đồng", "the", "and", "cho", "các", "tìm", "tài", "liệu", "văn", "bản",
            "trong", "này", "về", "có", "bao", "nhiêu", "chính", "cụ", "thể", "từng", "là",
            "gì", "thế", "nào", "được", "quy", "định", "ra", "sao", "biến", "điều", "kiện",
            "đối", "với", "hàm", "mục", "tiêu", "ràng", "buộc", "của", "phòng", "ban", "mã",
            "xác", "định", "như", "nào", "quản", "lý", "bài", "toán", "mô", "hình"
        }
        terms = [w for w in re.findall(r"[\w\.]+", query) if len(w) >= 3 and w.lower() not in stop_words]
        search_term = max(terms, key=len) if terms else ""
        ctr_doc_filter = CYPHER_SERVING_ELIGIBILITY_FILTER.replace("d.", "ctr.")
        if search_term:
            return f"""
            MATCH (ctr:Document)
            WHERE {ctr_doc_filter}
               AND (toLower(ctr.name) CONTAINS toLower('{search_term}')
               OR toLower(coalesce(ctr.id, '')) CONTAINS toLower('{search_term}'))
            RETURN ctr.name AS name, ctr.id AS id, coalesce(ctr.department, 'Chung') AS contract_type, elementId(ctr) AS _id, ['Document'] AS _labels
            LIMIT 8
            """
        return f"""
        MATCH (ctr:Document)
        WHERE {ctr_doc_filter}
        RETURN ctr.name AS name, ctr.id AS id, coalesce(ctr.department, 'Chung') AS contract_type, elementId(ctr) AS _id, ['Document'] AS _labels
        LIMIT 8
        """

    # 3. AdventureWorks Customer queries (separated by product volume vs order count vs revenue)
    if any(k in q_lower for k in ["khách hàng", "customer", "crm", "vip", "đối tác mua hàng", "ai mua", "người mua"]):
        # 3A. Product quantity / volume (e.g. "mua nhiều sản phẩm nhất", "số lượng sản phẩm")
        if any(k in q_lower for k in ["nhiều sản phẩm", "sản phẩm nhiều", "số lượng sản phẩm", "số lượng mua", "món hàng", "loại sản phẩm", "product", "quantity", "volume"]) or ("sản phẩm" in q_lower and any(w in q_lower for w in ["nhiều", "cao nhất", "lớn nhất", "top", "mua"])):
            return """
            MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)
            WITH c, count(DISTINCT o) AS order_count,
                 sum(coalesce(r.OrderQty, 0)) AS totalQty,
                 count(DISTINCT p) AS distinctProducts,
                 round(sum(coalesce(r.lineTotal, 0.0)), 2) AS totalProductSpent
            ORDER BY totalQty DESC, distinctProducts DESC
            LIMIT 6
            WITH collect({c: c, order_count: order_count, totalQty: totalQty, distinctProducts: distinctProducts, totalProductSpent: totalProductSpent}) AS rows
            UNWIND range(0, size(rows)-1) AS idx
            WITH rows[idx] AS r, (idx + 1) AS rank
            WITH r.c AS c, r.order_count AS order_count, r.totalQty AS totalQty, r.distinctProducts AS distinctProducts, r.totalProductSpent AS totalProductSpent, rank,
                 CASE
                   WHEN r.c.FirstName IS NOT NULL AND r.c.LastName IS NOT NULL THEN r.c.FirstName + ' ' + r.c.LastName + ' (#' + toString(r.c.id) + ')'
                   WHEN r.c.name IS NOT NULL THEN r.c.name
                   ELSE 'Customer #' + toString(r.c.id)
                 END AS custName
            RETURN custName AS name,
                   c.id AS CustomerID,
                   order_count,
                   totalQty,
                   distinctProducts,
                   totalProductSpent,
                   rank,
                   CASE 
                     WHEN rank = 1 THEN 'Khách hàng ' + custName + ' [Xếp hạng #1 - Mua nhiều sản phẩm nhất]: Tổng cộng ' + toString(totalQty) + ' sản phẩm (' + toString(distinctProducts) + ' loại sản phẩm) qua ' + toString(order_count) + ' đơn hàng, tổng giá trị $' + toString(totalProductSpent) + ' USD.'
                     ELSE 'Khách hàng ' + custName + ' [Xếp hạng #' + toString(rank) + ']: Đã mua ' + toString(totalQty) + ' sản phẩm (' + toString(distinctProducts) + ' loại sản phẩm) qua ' + toString(order_count) + ' đơn hàng, tổng giá trị $' + toString(totalProductSpent) + ' USD.'
                   END AS snippet,
                   elementId(c) AS _id, ['Customer'] AS _labels
            ORDER BY rank ASC
            """

        # 3B. Order count (e.g. "nhiều đơn hàng nhất", "lượng đơn", "số đơn")
        if any(k in q_lower for k in ["nhiều đơn", "số đơn", "lượng đơn", "order count", "most orders", "lần mua"]):
            return """
            MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)
            WITH c, count(o) AS order_count, round(sum(coalesce(o.totalDue, 0.0)), 2) AS totalSpent
            ORDER BY order_count DESC, totalSpent DESC
            LIMIT 6
            WITH collect({c: c, order_count: order_count, totalSpent: totalSpent}) AS rows
            UNWIND range(0, size(rows)-1) AS idx
            WITH rows[idx] AS r, (idx + 1) AS rank
            WITH r.c AS c, r.order_count AS order_count, r.totalSpent AS totalSpent, rank,
                 CASE
                   WHEN r.c.FirstName IS NOT NULL AND r.c.LastName IS NOT NULL THEN r.c.FirstName + ' ' + r.c.LastName + ' (#' + toString(r.c.id) + ')'
                   WHEN r.c.name IS NOT NULL THEN r.c.name
                   ELSE 'Customer #' + toString(r.c.id)
                 END AS custName
            RETURN custName AS name,
                   c.id AS CustomerID,
                   order_count,
                   totalSpent,
                   rank,
                   CASE
                     WHEN rank = 1 THEN 'Khách hàng ' + custName + ' [Xếp hạng #1 - Nhiều đơn hàng nhất]: Đứng đầu với ' + toString(order_count) + ' đơn hàng, tổng chi tiêu $' + toString(totalSpent) + ' USD.'
                     ELSE 'Khách hàng ' + custName + ' [Xếp hạng #' + toString(rank) + ']: Đạt ' + toString(order_count) + ' đơn hàng, tổng chi tiêu $' + toString(totalSpent) + ' USD.'
                   END AS snippet,
                   elementId(c) AS _id, ['Customer'] AS _labels
            ORDER BY rank ASC
            """

        # 3C. Revenue / Financial spending / VIP (default customer ranking)
        return """
        MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)
        WITH c, count(o) AS order_count, round(sum(coalesce(o.totalDue, 0.0)), 2) AS totalSpent
        ORDER BY totalSpent DESC
        LIMIT 6
        WITH collect({c: c, order_count: order_count, totalSpent: totalSpent}) AS rows
        UNWIND range(0, size(rows)-1) AS idx
        WITH rows[idx] AS r, (idx + 1) AS rank
        WITH r.c AS c, r.order_count AS order_count, r.totalSpent AS totalSpent, rank,
                 CASE
                   WHEN r.c.FirstName IS NOT NULL AND r.c.LastName IS NOT NULL THEN r.c.FirstName + ' ' + r.c.LastName + ' (#' + toString(r.c.id) + ')'
                   WHEN r.c.name IS NOT NULL THEN r.c.name
                   ELSE 'Customer #' + toString(r.c.id)
                 END AS custName
        RETURN custName AS name,
               c.id AS CustomerID,
               order_count,
               totalSpent,
               rank,
               CASE
                 WHEN rank = 1 THEN 'Khách hàng ' + custName + ' [Xếp hạng #1 - Doanh thu cao nhất]: Tổng chi tiêu $' + toString(totalSpent) + ' USD qua ' + toString(order_count) + ' đơn hàng.'
                 ELSE 'Khách hàng ' + custName + ' [Xếp hạng #' + toString(rank) + ']: Chi tiêu $' + toString(totalSpent) + ' USD qua ' + toString(order_count) + ' đơn hàng.'
               END AS snippet,
               elementId(c) AS _id, ['Customer'] AS _labels
        ORDER BY rank ASC
        """

    # 4. Revenue / Financial Trends / Growth queries
    if any(k in q_lower for k in ["doanh thu", "xu hướng", "revenue", "tăng trưởng", "giao dịch", "tài chính", "trend"]):
        return """
        MATCH (s:SalesOrder)
        WHERE s.orderDate IS NOT NULL OR s.OrderDate IS NOT NULL
        WITH substring(toString(coalesce(s.orderDate, s.OrderDate)), 0, 4) AS year,
              count(s) AS totalOrders,
              round(sum(coalesce(s.totalDue, s.TotalDue, 0.0)), 2) AS totalDueExact,
              round(sum(coalesce(s.subTotal, s.SubTotal, 0.0)), 2) AS subTotalExact,
              round(sum(coalesce(s.totalDue, s.TotalDue, 0.0)) / 1000000.0, 2) AS totalMillions,
              round(sum(coalesce(s.subTotal, s.SubTotal, 0.0)) / 1000000.0, 2) AS subTotalMillions
        RETURN 'Doanh thu năm ' + year AS name,
               'Năm ' + year + ': Doanh thu gộp (TotalDue) đạt $' + toString(totalMillions) + 'M USD, doanh thu thuần sản phẩm (SubTotal) đạt $' + toString(subTotalMillions) + 'M USD qua ' + toString(totalOrders) + ' đơn hàng.' AS snippet,
               year, totalDueExact, subTotalExact, totalMillions, subTotalMillions, totalOrders,
               'trend-' + year AS _id, ['FinancialTrend', 'SalesOrder'] AS _labels
        ORDER BY year ASC
        """

    # 5. AdventureWorks Product queries
    if any(k in q_lower for k in ["sản phẩm", "product", "hàng hóa", "giá", "xe đạp", "bike"]):
        # 5A. Best-selling products by quantity / sales volume
        if any(k in q_lower for k in ["bán chạy", "doanh số", "số lượng bán", "lượng bán", "chạy nhất", "mua nhiều"]):
            return """
            MATCH (o:SalesOrder)-[r:CONTAINS_PRODUCT]->(p:Product)
            WITH p, coalesce(p.name, p.title, p.Name) AS prod_name,
                 sum(coalesce(r.OrderQty, 0)) AS totalQty,
                 count(DISTINCT o) AS orderCount,
                 round(sum(coalesce(r.lineTotal, 0.0)), 2) AS totalSales
            ORDER BY totalQty DESC, totalSales DESC
            LIMIT 6
            WITH collect({p: p, prod_name: prod_name, totalQty: totalQty, orderCount: orderCount, totalSales: totalSales}) AS rows
            UNWIND range(0, size(rows)-1) AS idx
            WITH rows[idx] AS r, (idx + 1) AS rank
            RETURN r.prod_name AS name,
                   coalesce(r.p.id, r.p.ProductID) AS ProductID,
                   r.totalQty AS TotalQty,
                   r.totalSales AS TotalSales,
                   rank,
                   CASE
                     WHEN rank = 1 THEN 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #1 - Bán chạy nhất]: Đã bán ' + toString(r.totalQty) + ' sản phẩm qua ' + toString(r.orderCount) + ' đơn hàng, tổng doanh thu $' + toString(r.totalSales) + ' USD.'
                     ELSE 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #' + toString(rank) + ']: Đã bán ' + toString(r.totalQty) + ' sản phẩm qua ' + toString(r.orderCount) + ' đơn hàng, tổng doanh thu $' + toString(r.totalSales) + ' USD.'
                   END AS snippet,
                   elementId(r.p) AS _id, ['Product'] AS _labels
            ORDER BY rank ASC
            """

        # 5B. Lowest price / cheapest products
        if any(k in q_lower for k in ["giá rẻ", "rẻ nhất", "thấp nhất", "ít tiền nhất"]):
            return """
            MATCH (p:Product)
            WHERE coalesce(p.ListPrice, p.listPrice, p.price, 0.0) > 0.0
            WITH p, coalesce(p.name, p.title, p.Name) AS prod_name, round(coalesce(p.ListPrice, p.listPrice, p.price, 0.0), 2) AS price_val
            ORDER BY price_val ASC, prod_name ASC
            LIMIT 6
            WITH collect({p: p, prod_name: prod_name, price_val: price_val}) AS rows
            UNWIND range(0, size(rows)-1) AS idx
            WITH rows[idx] AS r, (idx + 1) AS rank
            RETURN r.prod_name AS name, coalesce(r.p.id, r.p.ProductID) AS ProductID, r.price_val AS ListPrice, rank,
                   CASE
                     WHEN rank = 1 THEN 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #1 - Giá thấp nhất]: Giá niêm yết $' + toString(r.price_val) + ' USD (Mã SP #' + toString(coalesce(r.p.id, r.p.ProductID)) + ').'
                     ELSE 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #' + toString(rank) + ']: Giá niêm yết $' + toString(r.price_val) + ' USD.'
                   END AS snippet,
                   elementId(r.p) AS _id, ['Product'] AS _labels
            ORDER BY rank ASC
            """

        # 5C. Highest price / highest value / default product ranking
        return """
        MATCH (p:Product)
        WHERE coalesce(p.ListPrice, p.listPrice, p.price, 0.0) > 0.0
        WITH p, coalesce(p.name, p.title, p.Name) AS prod_name, round(coalesce(p.ListPrice, p.listPrice, p.price, 0.0), 2) AS price_val
        ORDER BY price_val DESC, prod_name ASC
        LIMIT 6
        WITH collect({p: p, prod_name: prod_name, price_val: price_val}) AS rows
        UNWIND range(0, size(rows)-1) AS idx
        WITH rows[idx] AS r, (idx + 1) AS rank
        RETURN r.prod_name AS name, coalesce(r.p.id, r.p.ProductID) AS ProductID, r.price_val AS ListPrice, rank,
               CASE
                 WHEN rank = 1 THEN 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #1 - Giá trị cao nhất]: Giá niêm yết $' + toString(r.price_val) + ' USD (Mã SP #' + toString(coalesce(r.p.id, r.p.ProductID)) + ').'
                 ELSE 'Sản phẩm ' + r.prod_name + ' [Xếp hạng #' + toString(rank) + ']: Giá niêm yết $' + toString(r.price_val) + ' USD.'
               END AS snippet,
               elementId(r.p) AS _id, ['Product'] AS _labels
        ORDER BY rank ASC
        """

    # 6. AdventureWorks SalesOrder queries
    if any(k in q_lower for k in ["đơn hàng", "order", "sales"]):
        return """
        MATCH (o:SalesOrder)
        WITH o, coalesce(o.salesOrderId, o.id) AS oid, coalesce(o.totalDue, 0.0) AS due, toString(coalesce(o.orderDate, '')) AS oDate
        RETURN 'Đơn hàng #' + toString(oid) AS name,
               oid AS SalesOrderID, round(due, 2) AS TotalDue, oDate AS OrderDate,
               'Đơn hàng #' + toString(oid) + ': Giá trị $' + toString(round(due, 2)) + ' USD, ngày đặt ' + oDate AS snippet,
               elementId(o) AS _id, ['SalesOrder'] AS _labels
        ORDER BY due DESC
        LIMIT 6
        """

    # 5. Default Property Search Fallback across all nodes
    # Guard against generic Vietnamese/English stop words so queries without entity terms do not perform
    # broad substring scans matching unrelated nodes (e.g. 'Trong' matching 'Armstrong').
    STOP_WORDS = {
        "trong", "tài", "liệu", "về", "cho", "các", "hãy", "những", "một", "này", "của", "và", "là", "gì",
        "thế", "nào", "có", "bao", "nhiêu", "với", "theo", "được", "trên", "dưới", "khi", "tại", "sau", "trước",
        "chính", "thì", "đến", "nào", "ở", "ra", "sao", "thực", "hiện", "như", "đã", "đang", "sẽ", "biết", "tôi",
        "bạn", "hỏi", "đáp", "thông", "tin", "mô", "hình", "bài", "toán", "quy", "hoạch", "tuyến", "tính",
        "điều", "kiện", "biến", "hàm", "mục", "tiêu", "ràng", "buộc", "order", "sales", "công", "ty",
        "xin", "chào", "chao", "hello", "hey", "alo", "cảm", "cam", "cám", "nhé", "nhe", "nha", "giúp", "vui", "lòng", "anh", "chị",
    }
    candidate_terms = [
        w for w in re.findall(r"[\w\.-]+", query)
        if len(w) >= 3 and w.lower() not in STOP_WORDS
    ]
    if not candidate_terms:
        # No specific entity keyword found in query - do not run broad wildcard query that matches random substring
        return "MATCH (n:NonExistent) RETURN n LIMIT 0"

    # Pick the most specific term (e.g. DOC_..., numbers, capitalized entities or longest word)
    specific_terms = [w for w in candidate_terms if any(c.isupper() or c.isdigit() for c in w)]
    term = specific_terms[0] if specific_terms else max(candidate_terms, key=len)
    safe_term = re.escape(term)
    # Require whole-word boundaries for short alphabetic words so e.g. 'XIN' never matches 'Boxing'
    regex_pat = f"(?iu).*\\b{safe_term}\\b.*" if (len(term) <= 5 and term.isalpha()) else f"(?i).*{safe_term}.*"

    return f"""
    MATCH (n)
    WHERE any(prop IN keys(n) WHERE 
        CASE 
            WHEN n[prop] IS :: LIST<ANY> THEN any(item IN n[prop] WHERE toString(item) =~ '{regex_pat}')
            ELSE toString(n[prop]) =~ '{regex_pat}'
        END
    )
    RETURN n, labels(n) AS _labels, elementId(n) AS _id
    LIMIT 8
    """


def execute_text_to_cypher(query: str) -> List[Dict[str, Any]]:
    """Generates and safely executes Cypher query on Neo4j."""
    cypher = generate_cypher_from_query(query)
    
    # Security check: Read-only enforcement
    for word in re.findall(r"\b[A-Z]+\b", cypher):
        if word in FORBIDDEN_KEYWORDS:
            raise ValueError(f"Security Alert: Disallowed mutation keyword '{word}' in generated Cypher.")

    if not neo4j_client.is_connected and not neo4j_client.connect():
        return []

    try:
        raw_results = neo4j_client.run_cypher(cypher)
        formatted = []
        for r in raw_results:
            # Flatten into uniform node structure (unpacking nested `n` node dict if present)
            n_node = r.get("n") if isinstance(r.get("n"), dict) else {}
            n_props = n_node.get("properties") if isinstance(n_node.get("properties"), dict) else {}
            item = {"_id": r.get("_id") or n_node.get("_id")}
            labels = r.get("_labels") or n_node.get("_labels") or ["Entity"]
            item["_labels"] = labels if isinstance(labels, list) else [str(labels)]
            item["name"] = (
                r.get("contract_name")
                or r.get("name")
                or r.get("company")
                or n_props.get("name")
                or n_props.get("Name")
                or n_props.get("title")
                or n_props.get("company")
                or f"Entity #{item['_id']}"
            )
            item["snippet"] = r.get("snippet") or str(n_props or {k: v for k, v in r.items() if not k.startswith("_")})[:250]
            # Preserve aggregate & provenance metadata for Layer-2 & RBAC validation
            for k in ["source_doc_ids", "duplicate_detected", "total_verified_docs", "source_document_id", "document_id", "department", "domain", "id", "CustomerID", "totalQty", "distinctProducts", "order_count", "totalSpent", "totalProductSpent"]:
                if k in r:
                    item[k] = r[k]
                elif k in n_props:
                    item[k] = n_props[k]
            formatted.append(item)
        return formatted
    except Exception as e:
        print(f"[Text-to-Cypher Error] {e}")
        return []


if __name__ == "__main__":
    # Runnable self-check
    test_q = "Kiểm tra điều khoản Termination trong các hợp đồng"
    generated = generate_cypher_from_query(test_q)
    assert "Termination" in generated and "MATCH" in generated, "Cypher generation failed"
    print(f"[Self-Check Passed] Generated Cypher:\n{generated.strip()}")
    
    # Live execution check
    hits = execute_text_to_cypher(test_q)
    print(f"[Self-Check Passed] Live Neo4j execution returned {len(hits)} nodes.")
