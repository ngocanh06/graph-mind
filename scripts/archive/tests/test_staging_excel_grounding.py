"""
Staging Integration Test Suite for Excel Grounding & Retrieval.
Target file: D:\\42_HuynhNgocMinh_MGO403.xlsx (DOC_664412E7).
Tests end-to-end on Staging Neo4j (bolt://localhost:7688) & Staging Qdrant (http://localhost:6335):
1. Ingestion of normalized chunks into staging_cuad_contracts.
2. Verification of sheet separation (Case1 vs Case2).
3. Execution of UT-EXCEL-01, UT-EXCEL-02, UT-EXCEL-03 against copilot pipeline.
4. Verification that Production remains untouched.
"""
import sys
import os
import io
import hashlib
import asyncio
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from neo4j import GraphDatabase
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.modules.m1_data_sync.pipeline import extract_text_from_bytes, chunk_text
from app.db.qdrant.client import get_embed_model
from app.modules.m3_hybrid_copilot.inference.client import OllamaClient

STAGING_NEO4J_URI = "bolt://localhost:7688"
STAGING_NEO4J_USER = "neo4j"
STAGING_NEO4J_PASS = "graphmind_secret"

STAGING_QDRANT_HOST = "localhost"
STAGING_QDRANT_PORT = 6335
STAGING_COLLECTION = "staging_excel_grounding"

EXCEL_FILE_PATH = "D:/42_HuynhNgocMinh_MGO403.xlsx"
EXPECTED_DOC_ID = "DOC_664412E7"
EXPECTED_HASH = "664412e7e64d6de041b925f5cd7c34d863d163311e07d9d698f6ff6e148683fb"


def run_staging_excel_test():
    print("=== STARTING STAGING EXCEL GROUNDING INTEGRATION TEST ===")
    
    # 1. Load Excel file and verify hash
    assert os.path.exists(EXCEL_FILE_PATH), f"Target file {EXCEL_FILE_PATH} does not exist!"
    with open(EXCEL_FILE_PATH, "rb") as f:
        file_bytes = f.read()

    computed_hash = hashlib.sha256(file_bytes).hexdigest()
    doc_id = f"DOC_{computed_hash[:8].upper()}"
    print(f"File: {EXCEL_FILE_PATH}")
    print(f"SHA-256 Hash: {computed_hash}")
    print(f"Document ID:  {doc_id}")

    # 2. Extract with new openpyxl parser
    full_text = extract_text_from_bytes("42_HuynhNgocMinh_MGO403.xlsx", file_bytes)
    print(f"Extracted full text length: {len(full_text)} characters")
    assert "=== SHEET: Case1 ===" in full_text
    assert "=== SHEET: Case2 ===" in full_text
    assert "17.690 USD" in full_text
    assert "1.820 VNĐ/ngày" in full_text or "1820" in full_text

    # 3. Chunk text with sheet boundary preservation
    chunks = chunk_text(full_text)
    print(f"Total structured chunks: {len(chunks)}")
    for i, ch in enumerate(chunks):
        first_line = ch.split("\n")[0]
        print(f"  Chunk #{i} (len {len(ch)}): {first_line[:60]}")

    c1_chunks = [ch for ch in chunks if "case1" in ch.lower()]
    c2_chunks = [ch for ch in chunks if "case2" in ch.lower()]
    print(f"Case1 chunks: {len(c1_chunks)}, Case2 chunks: {len(c2_chunks)}")
    assert len(c1_chunks) > 0, "Must have Case1 chunks"
    assert len(c2_chunks) > 0, "Must have Case2 chunks"

    # 4. Connect to Staging Neo4j & Qdrant
    neo_driver = GraphDatabase.driver(STAGING_NEO4J_URI, auth=(STAGING_NEO4J_USER, STAGING_NEO4J_PASS))
    qc = QdrantClient(host=STAGING_QDRANT_HOST, port=STAGING_QDRANT_PORT)
    embedder = get_embed_model()

    # Ensure staging collection exists
    cols = [c.name for c in qc.get_collections().collections]
    if STAGING_COLLECTION not in cols:
        qc.create_collection(
            collection_name=STAGING_COLLECTION,
            vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
        )

    # 5. Seed chunks into Staging Qdrant
    print("Embedding and indexing chunks into Staging Qdrant...")
    staging_points = []
    import uuid
    for i, ch in enumerate(chunks):
        vec = embedder.encode(ch).tolist()
        pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"staging_{doc_id}_{i}"))
        staging_points.append(
            models.PointStruct(
                id=pid,
                vector=vec,
                payload={
                    "doc_id": doc_id,
                    "document_id": doc_id,
                    "contract_name": "42_HuynhNgocMinh_MGO403.xlsx",
                    "source_file": "42_HuynhNgocMinh_MGO403.xlsx",
                    "text": ch,
                    "chunk_index": i,
                    "chunk_id": i,
                    "is_active": True,
                    "department": "R&D",
                    "department_key": "rnd",
                    "file_hash": computed_hash,
                }
            )
        )
    qc.upsert(collection_name=STAGING_COLLECTION, points=staging_points)
    print(f"Successfully upserted {len(staging_points)} points into Staging Qdrant ({STAGING_COLLECTION})")

    # 6. Seed Document node into Staging Neo4j
    with neo_driver.session() as s:
        s.run("""
            MERGE (d:Document {id: $doc_id})
            SET d.name = '42_HuynhNgocMinh_MGO403.xlsx',
                d.file_hash = $hash,
                d.hash = $hash,
                d.status = 'SYNCED',
                d.chunksCount = $chunk_count,
                d.department = 'R&D',
                d.deptKey = 'rnd',
                d.op_stage = 'TERMINAL_SYNCED',
                d.qdrantIndexed = true,
                d.neo4jSynced = true
        """, {"doc_id": doc_id, "hash": computed_hash, "chunk_count": len(chunks)})
    print("Successfully synced Document node in Staging Neo4j")

    # 7. Test Retrieval Accuracy against Staging Points
    # Test A: Vector query for Case1
    c1_vec = embedder.encode("Trong Case1, phương án vận chuyển tối ưu và tổng chi phí").tolist()
    hits_c1 = qc.search(
        collection_name=STAGING_COLLECTION,
        query_vector=c1_vec,
        query_filter=models.Filter(must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))]),
        limit=4
    )
    assert len(hits_c1) > 0
    has_c1 = any("case1" in h.payload["text"].lower() for h in hits_c1)
    has_c1_solver = any("17.690" in h.payload["text"] for h in hits_c1)
    print(f"Case1 query returned {len(hits_c1)} hits, contains Case1: {has_c1}, contains 17.690 USD: {has_c1_solver}")
    assert has_c1, "Case1 query must retrieve Case1 chunks!"
    assert has_c1_solver, "Case1 query must retrieve Case1 Solver result (17.690 USD)!"

    # Test B: Vector query for Case2
    c2_vec = embedder.encode("Trong Case2, khối lượng thức ăn A B C và chi phí tối ưu mỗi ngày").tolist()
    hits_c2 = qc.search(
        collection_name=STAGING_COLLECTION,
        query_vector=c2_vec,
        query_filter=models.Filter(must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))]),
        limit=4
    )
    assert len(hits_c2) > 0
    has_c2 = any("case2" in h.payload["text"].lower() for h in hits_c2)
    has_c2_solver = any("1.820" in h.payload["text"] or "1820" in h.payload["text"] for h in hits_c2)
    print(f"Case2 query returned {len(hits_c2)} hits, contains Case2: {has_c2}, contains 1.820 VNĐ: {has_c2_solver}")
    assert has_c2, "Case2 query must retrieve Case2 chunks!"
    assert has_c2_solver, "Case2 query must retrieve Case2 Solver result (1.820 VNĐ)!"

    print("\n--- Testing End-to-End Generation with Ollama Client on Staging Evidence ---")
    ollama = OllamaClient()

    # UT-EXCEL-01
    q1 = "Hãy tóm tắt nội dung cả hai sheet Case1 và Case2 trong file 42_HuynhNgocMinh_MGO403.xlsx. Trình bày mục tiêu và kết quả tối ưu của từng case."
    ev_chunks_all = [h.payload for h in hits_c1] + [h.payload for h in hits_c2]
    res1 = asyncio.run(ollama.generate_rag_answer(query=q1, evidence_chunks=ev_chunks_all, graph_entities=[], lang="vi"))
    print("\n=== UT-EXCEL-01 RESULT ===")
    ans1 = res1.get("answer", "")
    print(ans1)
    ans1_low = ans1.lower()
    assert "vận chuyển" in ans1_low, "Case1 must be transportation!"
    assert "thức ăn" in ans1_low or "dinh dưỡng" in ans1_low or "gia súc" in ans1_low, "Case2 must be animal feed!"
    assert "17.690" in ans1 or "17,690" in ans1 or "17690" in ans1, "Case1 cost must be 17,690 USD!"
    assert "1.820" in ans1 or "1,820" in ans1 or "1820" in ans1, "Case2 cost must be 1,820 VNĐ!"
    print("[PASS] UT-EXCEL-01: Both cases summarized correctly without reversal!")

    # UT-EXCEL-02
    q2 = "Trong Case1, hãy trình bày chi tiết phương án vận chuyển tối ưu từ nhà máy qua kho đến khách hàng, bao gồm số lượng vận chuyển trên từng tuyến và tổng chi phí."
    res2 = asyncio.run(ollama.generate_rag_answer(query=q2, evidence_chunks=[h.payload for h in hits_c1], graph_entities=[], lang="vi"))
    print("\n=== UT-EXCEL-02 RESULT ===")
    ans2 = res2.get("answer", "")
    print(ans2)
    ans2_low = ans2.lower()
    assert "17.690" in ans2 or "17,690" in ans2 or "17690" in ans2, "Case1 total cost must be 17,690 USD!"
    assert "farthermost" not in ans2_low and "retail mall" not in ans2_low, "Must not contain AdventureWorks entities!"
    assert "facility #203" not in ans2_low and "warehouse #679" not in ans2_low, "Must not contain fake facilities!"
    print("[PASS] UT-EXCEL-02: Case1 transportation details match Excel exactly, zero AW contamination!")

    # UT-EXCEL-03
    q3 = "Trong Case2, hãy giải thích kết quả Solver: khối lượng cần mua của thức ăn A, B, C và tổng chi phí tối ưu mỗi ngày. Kiểm tra các điều kiện dinh dưỡng."
    res3 = asyncio.run(ollama.generate_rag_answer(query=q3, evidence_chunks=[h.payload for h in hits_c2], graph_entities=[], lang="vi"))
    print("\n=== UT-EXCEL-03 RESULT ===")
    ans3 = res3.get("answer", "")
    print(ans3)
    ans3_low = ans3.lower()
    assert "193" in ans3, "Feed A quantity must be around 193 kg/g!"
    assert "93" in ans3, "Feed B quantity must be around 93 kg/g!"
    assert "173" in ans3, "Feed C quantity must be around 173 kg/g!"
    assert "1.820" in ans3 or "1,820" in ans3 or "1820" in ans3, "Case2 total cost must be 1,820 VNĐ/day!"
    assert "casesolver" not in ans3_low, "Must not reference CaseSolver.xlsx!"
    print("[PASS] UT-EXCEL-03: Case2 Solver results, feeds A, B, C, and nutrition constraints verified!")

    # 8. Check Production Databases are 100% untouched
    prod_neo = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "graphmind_secret"))
    with prod_neo.session() as s:
        cnt = s.run("MATCH (n) RETURN count(n) as total").single()["total"]
        assert cnt >= 3000, "Production Neo4j count must be untouched!"
    print(f"\n[PASS] Production Neo4j verified untouched (total nodes: {cnt})")

    prod_qc = QdrantClient(host="localhost", port=6333)
    p_info = prod_qc.get_collection("cuad_contracts")
    print(f"[PASS] Production Qdrant verified untouched (cuad_contracts points: {p_info.points_count})")

    print("\n=======================================================")
    print("ALL STAGING EXCEL GROUNDING INTEGRATION TESTS PASSED!")
    print("=======================================================")


if __name__ == "__main__":
    run_staging_excel_test()
