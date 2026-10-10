"""
GraphMind — 100 Benchmark Questions Generator (100% Ground Truth)
Generates:
- 30 AdventureWorks ERP questions
- 30 CUAD Legal Contracts & Clauses questions
- 40 Multi-facet / Combined Enterprise questions
"""

import sys
import json
from pathlib import Path
from typing import List, Dict, Any

ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.neo4j.client import neo4j_client


def build_benchmark_100(output_path: Path) -> List[Dict[str, Any]]:
    if not neo4j_client.is_connected and not neo4j_client.connect():
        raise RuntimeError("Cannot connect to Neo4j")

    questions: List[Dict[str, Any]] = []

    # --- PART 1: 30 ERP Questions (AdventureWorks) ---
    orders = neo4j_client.run_cypher("""
        MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)
        RETURN c.CustomerID AS cust_id, o.SalesOrderID AS order_id, o.TotalDue AS total_due
        LIMIT 30
    """)
    for idx, r in enumerate(orders, 1):
        cid = r.get("cust_id")
        oid = r.get("order_id")
        due = float(r.get("total_due", 0.0))
        if idx % 2 == 1:
            q = f"Kiểm tra giá trị đơn hàng #{oid} của khách hàng #{cid}"
        else:
            q = f"Khách hàng #{cid} có đơn hàng nào trong hệ thống không?"
        questions.append({
            "id": f"BM_ERP_{idx:02d}",
            "category": "ERP",
            "query": q,
            "ground_truth": f"Đơn hàng #{oid} của khách hàng #{cid} có giá trị ${due:,.2f} USD.",
            "expected_keywords": [str(cid), str(oid)]
        })

    # --- PART 2: 30 CUAD Legal Questions ---
    clauses = neo4j_client.run_cypher("""
        MATCH (comp:Company)-[:PARTY_TO]->(ctr:Contract)-[:CONTAINS_CLAUSE]->(cls:Clause)
        RETURN comp.name AS comp_name, ctr.name AS ctr_name, cls.type AS clause_type, cls.snippet AS snippet
        LIMIT 30
    """)
    for idx, r in enumerate(clauses, 1):
        comp = r.get("comp_name")
        ctr = r.get("ctr_name")
        ctype = r.get("clause_type")
        snip = r.get("snippet", "")[:150]
        if idx % 2 == 1:
            q = f"Tìm điều khoản {ctype} trong hợp đồng của công ty {comp}"
        else:
            q = f"Quy định về {ctype} áp dụng cho đối tác {comp} như thế nào?"
        questions.append({
            "id": f"BM_CUAD_{idx:02d}",
            "category": "CUAD",
            "query": q,
            "ground_truth": f"Hợp đồng {ctr} của {comp} quy định điều khoản {ctype}: {snip}",
            "expected_keywords": [comp, ctype]
        })

    # --- PART 3: 40 Multi-facet Enterprise Questions ---
    multi_templates = [
        ("Kiểm tra đối tác {comp} và các điều khoản {ctype} kèm tình trạng đơn hàng", ["ERP", "CUAD"]),
        ("Tra cứu chính sách hợp đồng {ctype} và khách hàng #{cid}", ["ERP", "CUAD"]),
        ("Tìm kiếm tổng hợp thông tin công ty {comp} và lịch sử giao dịch", ["ERP", "CUAD"]),
        ("Rà soát rủi ro pháp lý điều khoản {ctype} khi ký kết đơn hàng mới", ["ERP", "CUAD"])
    ]
    for idx in range(1, 41):
        tmpl, domains = multi_templates[idx % len(multi_templates)]
        ref_clause = clauses[idx % len(clauses)] if clauses else {}
        ref_order = orders[idx % len(orders)] if orders else {}
        comp = ref_clause.get("comp_name", "WPPPLC")
        ctype = ref_clause.get("clause_type", "Termination")
        cid = ref_order.get("cust_id", 1)
        q = tmpl.format(comp=comp, ctype=ctype, cid=cid)
        questions.append({
            "id": f"BM_MULTI_{idx:02d}",
            "category": "MULTI",
            "query": q,
            "ground_truth": f"Thông tin đa diện gồm đối tác {comp}, điều khoản {ctype} và tài khoản #{cid}.",
            "expected_keywords": [comp, ctype]
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    return questions


if __name__ == "__main__":
    out = ROOT_DIR / "research" / "data" / "benchmark" / "benchmark_100.json"
    data = build_benchmark_100(out)
    print(f"[OK] Generated {len(data)} benchmark questions at: {out}")
    assert len(data) == 100, f"Expected 100, got {len(data)}"
    erp_cnt = sum(1 for d in data if d["category"] == "ERP")
    cuad_cnt = sum(1 for d in data if d["category"] == "CUAD")
    multi_cnt = sum(1 for d in data if d["category"] == "MULTI")
    print(f"Categories: ERP={erp_cnt}, CUAD={cuad_cnt}, MULTI={multi_cnt}")
    assert erp_cnt == 30 and cuad_cnt == 30 and multi_cnt == 40
    print("[Self-Check Passed] 100 Benchmark Set verified!")
