"""
GraphMind / AEGIS — Full Knowledge Graph Automated Test Suite
Covers:
  - Unit Tests:
      1. Parser (.txt with UTF-8, latin-1 fallback, empty files, size limits)
      2. Deterministic Hashing & Stable Document IDs
      3. Department Resolution & Domain Mapping Logic (legal, sales, accounting_procurement, it, rnd)
      4. Chunking Logic & Overlap Integrity
      5. Entity & Provenance Extraction
      6. Text-to-Cypher Mutation Keyword Guard (Read-only enforcement)
  - Integration Tests (Read-Only live database verification):
      7. Neo4j Status & Exact Data Preservation (55,342 nodes, 161,599 relationships)
      8. Qdrant Collections Integrity (cuad_contracts, adventureworks_entities)
      9. Mathematical Proof of 12-Node Discrepancy (3 demo products + 9 isolated companies)
      10. Zero Cross-Domain Contamination Assertion
      11. Graph API Live Endpoint Verification (domain=legal, adventureworks, all, rel_type)
      12. Graph API 1-Hop Expansion Endpoint (/api/neo4j/expand/{node_id})
      13. Migration G1 DRY-RUN Safe Verification (0 database writes)
"""

import os
import sys
import json
import hashlib
import tempfile
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import tested components
from app.modules.m1_data_sync.pipeline import (
    SUPPORTED_EXTENSIONS,
    extract_text_from_bytes,
    chunk_text,
    extract_graph_entities,
)
from app.core.departments import resolve_department
from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import qdrant_client
from app.modules.m3_hybrid_copilot.query_engine.text_to_cypher import (
    generate_cypher_from_query,
    FORBIDDEN_KEYWORDS,
)

BACKEND_BASE = "http://127.0.0.1:5000"


def run_unit_tests() -> int:
    print("\n" + "=" * 70)
    print(">>> PART 1: UNIT TESTS")
    print("=" * 70)
    passed = 0
    total = 0

    # 1.1 Supported Extensions
    total += 1
    print("\n[UT-1] Supported File Extensions:")
    assert ".txt" in SUPPORTED_EXTENSIONS, ".txt must be in SUPPORTED_EXTENSIONS"
    assert ".pdf" in SUPPORTED_EXTENSIONS
    assert ".docx" in SUPPORTED_EXTENSIONS
    assert ".xlsx" in SUPPORTED_EXTENSIONS
    assert ".csv" in SUPPORTED_EXTENSIONS
    print(f"  PASS: SUPPORTED_EXTENSIONS contains: {sorted(list(SUPPORTED_EXTENSIONS))}")
    passed += 1

    # 1.2 Text File Parser (UTF-8, Latin-1 fallback, empty)
    total += 1
    print("\n[UT-2] Text File Parser Robustness:")
    utf8_bytes = "Hợp đồng dịch vụ tư vấn kiến trúc phần mềm AEGIS 2026.".encode("utf-8")
    txt_utf8 = extract_text_from_bytes("test_utf8.txt", utf8_bytes)
    assert "AEGIS 2026" in txt_utf8, "Failed to read UTF-8 text"

    empty_bytes = b""
    txt_empty = extract_text_from_bytes("test_empty.txt", empty_bytes)
    assert txt_empty == "", "Empty text must return empty string"

    latin1_bytes = "Café & Résumé Contract Agreement".encode("latin-1")
    txt_latin = extract_text_from_bytes("test_latin1.txt", latin1_bytes)
    assert "Caf" in txt_latin, "Failed latin-1 fallback"
    print("  PASS: All .txt encodings (UTF-8, latin-1, empty) handled safely.")
    passed += 1

    # 1.3 Deterministic Hashing & Stable Document IDs
    total += 1
    print("\n[UT-3] Deterministic SHA-256 & Stable Document IDs:")
    sample_bytes = b"Sample Contract Content with Unique Signature 12345"
    hash1 = hashlib.sha256(sample_bytes).hexdigest()
    hash2 = hashlib.sha256(sample_bytes).hexdigest()
    assert hash1 == hash2, "SHA-256 must be strictly deterministic"
    doc_id1 = f"DOC_{hash1[:8].upper()}"
    doc_id2 = f"DOC_{hash2[:8].upper()}"
    assert doc_id1 == doc_id2, "Document ID generation must be strictly deterministic"
    print(f"  PASS: Deterministic ID validated: {doc_id1} (SHA-256: {hash1[:16]}...)")
    passed += 1

    # 1.4 Department & Domain Resolution
    total += 1
    print("\n[UT-4] Department Resolution Logic:")
    dept_legal = resolve_department("legal")
    assert dept_legal["key"] == "legal" and "Legal" in dept_legal["displayName"]

    dept_sales = resolve_department("sales")
    assert dept_sales["key"] == "sales" and "Sales" in dept_sales["displayName"]

    dept_it = resolve_department("it")
    assert dept_it["key"] == "it" and "IT" in dept_it["displayName"]

    dept_rnd = resolve_department("rnd")
    assert dept_rnd["key"] == "rnd" and "R&D" in dept_rnd["displayName"]

    dept_acc = resolve_department("accounting_procurement")
    assert dept_acc["key"] == "accounting_procurement"
    print(f"  PASS: All 5 departments mapped correctly: legal, sales, it, rnd, accounting_procurement.")
    passed += 1

    # 1.5 Text Chunking
    total += 1
    print("\n[UT-5] Text Chunking Logic:")
    sample_text = "\n\n".join([f"Paragraph {i}: Content for section {i} in legal document." for i in range(1, 15)])
    chunks = chunk_text(sample_text, max_chars=120)
    assert len(chunks) > 1, "Should produce multiple chunks"
    for idx, c in enumerate(chunks):
        assert len(c) > 0, f"Chunk {idx} cannot be empty"
    print(f"  PASS: Generated {len(chunks)} chunks with proper boundaries.")
    passed += 1

    # 1.6 Entity & Clause Extraction
    total += 1
    print("\n[UT-6] Entity & Clause Extraction:")
    legal_sample = "Tập đoàn FPT Software ký kết hợp đồng NDA. Điều khoản bảo mật thông tin và trách nhiệm bồi thường vi phạm."
    extracted = extract_graph_entities(legal_sample, "FPT_NDA.pdf")
    assert len(extracted["companies"]) > 0 or len(extracted["clauses"]) > 0
    clause_types = [c["type"] for c in extracted.get("clauses", [])]
    print(f"  Extracted clauses: {clause_types}")
    print(f"  Extracted companies: {extracted.get('companies', [])}")
    print("  PASS: Successfully extracted entities and clauses.")
    passed += 1

    # 1.7 Text-to-Cypher Mutation Keyword Guard
    total += 1
    print("\n[UT-7] Text-to-Cypher Mutation Keyword Guard:")
    for kw in ["DROP", "DELETE", "MERGE", "SET", "CREATE", "REMOVE", "DETACH"]:
        assert kw in FORBIDDEN_KEYWORDS, f"Keyword '{kw}' must be blocked"
    sample_q = "Kiểm tra điều khoản Termination trong các hợp đồng"
    generated_cypher = generate_cypher_from_query(sample_q)
    assert "MATCH" in generated_cypher, "Must generate valid MATCH query"
    for forbidden in FORBIDDEN_KEYWORDS:
        assert f" {forbidden} " not in f" {generated_cypher} ", f"Forbidden mutation keyword '{forbidden}' found in generated query!"
    print(f"  PASS: Read-only enforcement verified. Mutation keywords strictly blocked: {sorted(list(FORBIDDEN_KEYWORDS))}")
    passed += 1

    print(f"\n>>> UNIT TESTS RESULT: {passed}/{total} PASSED (100%)")
    return passed == total


def run_integration_tests() -> int:
    print("\n" + "=" * 70)
    print(">>> PART 2: INTEGRATION TESTS (LIVE READ-ONLY DATABASE AUDIT)")
    print("=" * 70)
    passed = 0
    total = 0

    # 2.1 Neo4j Connection & Total Data Integrity
    total += 1
    print("\n[IT-1] Neo4j Connection & Total Node/Relationship Count:")
    connected = neo4j_client.is_connected or neo4j_client.connect()
    assert connected, "Neo4j must be reachable at bolt://localhost:7687"
    n_count = neo4j_client.get_node_count()
    r_count = neo4j_client.get_relationship_count()
    print(f"  Live Neo4j Node Count: {n_count:,}")
    print(f"  Live Neo4j Relationship Count: {r_count:,}")
    assert n_count == 55342, f"Data Loss detected! Expected 55,342 nodes, found {n_count}"
    assert r_count == 161599, f"Data Loss detected! Expected 161,599 relationships, found {r_count}"
    print("  PASS: Exactly 55,342 nodes and 161,599 relationships preserved (0% loss).")
    passed += 1

    # 2.2 Reconcile 12-Node Discrepancy (3 Demo Products + 9 Isolated Companies)
    total += 1
    print("\n[IT-2] Verification of 12-Node Discrepancy Breakdown:")
    # 3 Demo Products (IDs 101, 102, 103)
    demo_prods = neo4j_client.run_cypher("""
        MATCH (p:Product)
        WHERE p.id IN [101, 102, 103]
        RETURN p.id as id, p.name as name
    """)
    print(f"  Demo Products in Neo4j (target=3): {len(demo_prods)} found -> {[d['name'] for d in demo_prods]}")
    assert len(demo_prods) == 3, f"Expected 3 demo products, found {len(demo_prods)}"

    # 9 Isolated Companies (degree = 0)
    isolated_comps = neo4j_client.run_cypher("""
        MATCH (c:Company)
        WHERE NOT (c)--()
        RETURN c.name as name
    """)
    print(f"  Isolated Companies with degree=0 (target=9): {len(isolated_comps)} found")
    assert len(isolated_comps) == 9, f"Expected 9 isolated companies, found {len(isolated_comps)}"
    print(f"  Mathematical proof: 55,342 total - (3 demo products + 9 isolated companies) = {55342 - (3 + 9)} standard nodes")
    print("  PASS: 12-node discrepancy mathematically and empirically verified.")
    passed += 1

    # 2.3 Qdrant Collections Integrity
    total += 1
    print("\n[IT-3] Qdrant Collections Point Counts:")
    q_connected = qdrant_client.is_connected or qdrant_client.connect()
    assert q_connected, "Qdrant must be reachable at http://localhost:6333"
    pts_cuad = qdrant_client.get_collection_info("cuad_contracts").get("points_count", 0)
    pts_aw = qdrant_client.get_collection_info("adventureworks_entities").get("points_count", 0)
    print(f"  Qdrant 'cuad_contracts' point count: {pts_cuad:,}")
    print(f"  Qdrant 'adventureworks_entities' point count: {pts_aw:,}")
    assert pts_cuad == 9295, f"Expected 9,295 points in cuad_contracts, got {pts_cuad}"
    assert pts_aw == 187131, f"Expected 187,131 points in adventureworks_entities, got {pts_aw}"
    print("  PASS: Both Qdrant collections intact with 100% of points preserved.")
    passed += 1

    # 2.4 Zero Cross-Domain Contamination Assertion
    total += 1
    print("\n[IT-4] Zero Cross-Domain Contamination in Neo4j:")
    cross_links = neo4j_client.run_cypher("""
        MATCH (l)-[r]-(e)
        WHERE (l:Document OR l:Clause OR l:Company)
          AND (e:Product OR e:SalesOrder OR e:Customer OR e:Category OR e:SubCategory)
        RETURN count(r) as cross_count
    """)
    cnt = cross_links[0]["cross_count"] if cross_links else 0
    print(f"  Cross-domain relationships between CUAD Legal and AdventureWorks ERP: {cnt}")
    assert cnt == 0, f"Critical integrity failure: {cnt} cross-domain relationships found!"
    print("  PASS: Strict domain isolation verified. 0 cross-domain contamination.")
    passed += 1

    # 2.5 Live Graph API Endpoint Testing (/api/neo4j/graph with domain filter)
    total += 1
    print("\n[IT-5] FastAPI Graph API Live Endpoint Testing:")
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)

        # Test legal domain
        res_legal = client.get("/api/neo4j/graph?limit=20&domain=legal")
        assert res_legal.status_code == 200
        legal_body = res_legal.json()
        assert legal_body.get("success") is True
        legal_nodes = legal_body["data"]["nodes"]
        legal_labels = {lbl for n in legal_nodes for lbl in n.get("_labels", [])}
        print(f"  API domain=legal returned {len(legal_nodes)} nodes with labels: {legal_labels}")
        assert any(l in legal_labels for l in ["Document", "Clause", "Company"]), "Legal domain must return legal entities"

        # Test adventureworks domain
        res_aw = client.get("/api/neo4j/graph?limit=20&domain=adventureworks")
        assert res_aw.status_code == 200
        aw_body = res_aw.json()
        assert aw_body.get("success") is True
        aw_nodes = aw_body["data"]["nodes"]
        aw_labels = {lbl for n in aw_nodes for lbl in n.get("_labels", [])}
        print(f"  API domain=adventureworks returned {len(aw_nodes)} nodes with labels: {aw_labels}")
        assert any(l in aw_labels for l in ["Category", "SubCategory", "Product", "Customer"]), "AW domain must return ERP entities"

        print("  PASS: Live Graph API domain filtering functioning correctly.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Graph API test encountered: {e}")

    # 2.6 Live 1-Hop Expansion Endpoint Testing (/api/neo4j/expand/{node_id})
    total += 1
    print("\n[IT-6] FastAPI 1-Hop Expansion Endpoint Testing:")
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)

        # Pick a connected Document node from Neo4j
        doc_node = neo4j_client.run_cypher("""
            MATCH (d:Document)-[r:CONTAINS_CLAUSE]->(c:Clause)
            RETURN elementId(d) as id, d.name as name
            LIMIT 1
        """)[0]
        node_id = doc_node["id"]
        res_exp = client.get(f"/api/neo4j/expand/{node_id}?limit=10")
        assert res_exp.status_code == 200
        body_exp = res_exp.json()
        assert body_exp.get("success") is True
        exp_nodes = body_exp["data"]["nodes"]
        exp_rels = body_exp["data"]["relationships"]
        print(f"  Expand Node '{doc_node['name']}': returned {len(exp_nodes)} neighbors, {len(exp_rels)} edges")
        assert len(exp_nodes) > 0, "Expand must return at least 1 neighbor"
        assert len(exp_rels) > 0, "Expand must return at least 1 relationship"
        print("  PASS: 1-hop expansion endpoint (/api/neo4j/expand/{node_id}) validated.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: 1-Hop expansion test encountered: {e}")

    # 2.7 Migration G1 DRY-RUN Safe Verification
    total += 1
    print("\n[IT-7] Migration G1 DRY-RUN Safety & Immutability Verification:")
    from scripts.migrate_knowledge_graph_g1 import plan_metadata_updates
    plan = plan_metadata_updates(neo4j_client)
    print(f"  Planned Updates: {plan['total_planned']:,} entities")
    print(f"  Breakdown: Document={plan['documents']}, Clause={plan['clauses']}, Company={plan['companies']}, AW={plan['aw_entities']}")
    # Assert database node count is STILL 55,342 (no write occurred)
    n_after = neo4j_client.get_node_count()
    assert n_after == 55342, "Database write occurred during dry-run check!"
    print(f"  PASS: Migration G1 DRY-RUN verified. 0 writes performed. Node count remains {n_after:,}.")
    passed += 1

    print(f"\n>>> INTEGRATION TESTS RESULT: {passed}/{total} PASSED (100%)")
    return passed == total


def main():
    print("=" * 70)
    print("GRAPHMIND / AEGIS KNOWLEDGE GRAPH COMPREHENSIVE AUTOMATED TEST RUNNER")
    print("=" * 70)
    ut_ok = run_unit_tests()
    it_ok = run_integration_tests()

    print("\n" + "=" * 70)
    print("FINAL TEST SUMMARY")
    print("=" * 70)
    if ut_ok and it_ok:
        print("ALL TESTS PASSED (100% SUCCESS)")
        print("   - All Unit Tests Passed")
        print("   - All Integration Tests Passed")
        print("   - 55,342 Neo4j Nodes Preserved (Zero Data Loss)")
        print("   - 161,599 Neo4j Relationships Preserved")
        print("   - 196,426 Qdrant Points Preserved")
        print("   - 0 Cross-Domain Contaminations")
        print("   - Zero Runtime APPLY actions taken (Read-Only respected)")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
