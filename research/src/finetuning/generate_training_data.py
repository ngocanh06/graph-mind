"""
GraphMind — Synthetic Q&A Dataset Generator from 100% Real DB Records
Pulls real nodes from Neo4j (CUAD Contracts + AdventureWorks) and generates
instruction pairs for LoRA/PEFT fine-tuning (Text-to-Cypher & RAG Citation).
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


def generate_finetuning_dataset(output_path: Path) -> int:
    if not neo4j_client.is_connected and not neo4j_client.connect():
        raise RuntimeError("Cannot connect to Neo4j to pull real records")

    dataset: List[Dict[str, Any]] = []

    # 1. Pull Real CUAD Clauses & Contracts for Text-to-Cypher & RAG
    clauses = neo4j_client.run_cypher("""
        MATCH (comp:Company)-[:PARTY_TO]->(ctr:Contract)-[:CONTAINS_CLAUSE]->(cls:Clause)
        RETURN comp.name AS company, ctr.name AS contract_name, ctr.type AS contract_type,
               cls.type AS clause_type, cls.snippet AS snippet, cls.chunk_id AS chunk_id
        LIMIT 150
    """)

    for row in clauses:
        comp = row.get("company", "Enterprise")
        cname = row.get("contract_name", "Contract")
        ctype = row.get("clause_type", "General")
        snippet = row.get("snippet", "")
        cid = row.get("chunk_id", 1)

        # Task A: Text-to-Cypher (Vietnamese + English)
        dataset.append({
            "task": "text_to_cypher",
            "instruction": f"Chuyển câu hỏi sau thành câu lệnh Cypher truy vấn vào cơ sở dữ liệu Neo4j: 'Tìm điều khoản {ctype} trong hợp đồng của công ty {comp}'",
            "input": "",
            "output": f"MATCH (comp:Company {{name: '{comp}'}})-[:PARTY_TO]->(ctr:Contract)-[:CONTAINS_CLAUSE]->(cls:Clause {{type: '{ctype}'}}) RETURN ctr.name, cls.snippet LIMIT 5;"
        })
        dataset.append({
            "task": "text_to_cypher",
            "instruction": f"Translate natural question to Cypher: 'Find {ctype} clause in contract of {comp}'",
            "input": "",
            "output": f"MATCH (comp:Company {{name: '{comp}'}})-[:PARTY_TO]->(ctr:Contract)-[:CONTAINS_CLAUSE]->(cls:Clause {{type: '{ctype}'}}) RETURN ctr.name, cls.snippet LIMIT 5;"
        })

        # Task B: Grounded RAG with Citation
        if snippet:
            dataset.append({
                "task": "rag_citation",
                "instruction": f"Bạn là trợ lý GraphMind. Hãy trả lời câu hỏi dựa trên chứng cứ được trích dẫn từ hợp đồng thực tế.",
                "input": f"Câu hỏi: Điều khoản {ctype} của {comp} quy định như thế nào?\nChứng cứ: [Trích đoạn #{cid} - {cname}]:\n{snippet}",
                "output": f"Căn cứ theo trích đoạn #{cid} trong hợp đồng {cname} của {comp}, điều khoản {ctype} được quy định cụ thể như sau:\n\"{snippet}\"\n(Nguồn: CUAD Legal Repository - Neo4j & Qdrant)."
            })

    # 2. Pull Real AdventureWorks Customers & SalesOrders
    orders = neo4j_client.run_cypher("""
        MATCH (c:Customer)-[:PLACED_ORDER]->(o:SalesOrder)
        RETURN c.CustomerID AS customer_id,
               o.SalesOrderID AS order_id, o.TotalDue AS total_due, o.OrderDate AS order_date
        LIMIT 100
    """)

    for row in orders:
        cust_id = row.get("customer_id")
        oid = row.get("order_id")
        due = float(row.get("total_due", 0.0))

        dataset.append({
            "task": "text_to_cypher",
            "instruction": f"Viết truy vấn Cypher để lấy thông tin các đơn hàng của khách hàng #{cust_id}",
            "input": "",
            "output": f"MATCH (c:Customer {{CustomerID: {cust_id}}})-[:PLACED_ORDER]->(o:SalesOrder) RETURN o.SalesOrderID, o.TotalDue, o.OrderDate ORDER BY o.TotalDue DESC;"
        })
        dataset.append({
            "task": "rag_citation",
            "instruction": "Bạn là trợ lý ERP GraphMind. Trả lời câu hỏi tra cứu đơn hàng dựa trên cơ sở tri thức Neo4j.",
            "input": f"Câu hỏi: Khách hàng #{cust_id} có đơn hàng nào không?\nBằng chứng đồ thị: Customer #{cust_id} -> SalesOrder #{oid} có tổng giá trị là ${due:,.2f} USD.",
            "output": f"Theo dữ liệu vận hành từ hệ thống AdventureWorks ERP, khách hàng #{cust_id} có đơn hàng #{oid} với tổng giá trị thanh toán là ${due:,.2f} USD."
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    return len(dataset)


if __name__ == "__main__":
    target = ROOT_DIR / "research" / "data" / "qa_pairs" / "train_dataset.json"
    count = generate_finetuning_dataset(target)
    print(f"[OK] Generated {count} real training samples at: {target}")
    assert count >= 100, f"Expected at least 100 samples, got {count}"
    assert target.exists(), "Target file does not exist"
    print("[Self-Check Passed] Training dataset generation verified!")
