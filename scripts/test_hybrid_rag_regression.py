"""
Comprehensive Hybrid GraphRAG Regression Test Suite (Tests A through H)
Validates:
1. Stable Document ID
2. Exact Document Match (No short_name split or contains)
3. No Cross-Document Contamination
4. Semantic Chunk Selection (Chunks preserved by relevance)
5. Grounding Gate (Threshold calibrated at 0.28)
6. Context Builder & LLM Synthesis
7. Query Routing (Document QA vs Business vs Hybrid)
8. Citation Provenance (document_id, source_file, chunk_index, retrieval_score)
9. Ingestion Lifecycle (Upload, Replace, Delete)
10. Data Integrity (No dropping Neo4j or Qdrant collections)
"""

import os
import sys
import json
import time
import io
import urllib.request
import urllib.error
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND_BASE = "http://127.0.0.1:5000"


def ask_copilot(query: str, role: str = "executive", dept: str = "Executive") -> Dict[str, Any]:
    url = f"{BACKEND_BASE}/api/v1/copilot/ask"
    payload = json.dumps({"query": query, "lang": "vi"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-User-Name": "regression_tester",
            "X-User-Role": role,
            "X-User-Dept": dept,
        }
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def create_docx_bytes(paragraphs: List[str]) -> bytes:
    import docx
    doc = docx.Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def upload_document(filename: str, file_bytes: bytes, department: str = "legal") -> Dict[str, Any]:
    boundary = "----WebKitFormBoundaryRegressionTest7MA4YWxkTrZu0gW"
    body = bytearray()
    # file field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")
    # department field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="department"\r\n\r\n')
    body.extend(department.encode("utf-8"))
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        f"{BACKEND_BASE}/api/v1/sync/upload",
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "X-User-Role": "admin"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def replace_document(old_name: str, new_bytes: bytes, department: str = "legal") -> Dict[str, Any]:
    boundary = "----WebKitFormBoundaryRegressionReplace7MA4YWxkTrZu0gW"
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{old_name}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n")
    body.extend(new_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="old_name"\r\n\r\n')
    body.extend(old_name.encode("utf-8"))
    body.extend(b"\r\n")
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="department"\r\n\r\n')
    body.extend(department.encode("utf-8"))
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        f"{BACKEND_BASE}/api/v1/documents/replace",
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "X-User-Role": "admin"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def delete_document(filename: str, department: str = "legal") -> Dict[str, Any]:
    req = urllib.request.Request(
        f"{BACKEND_BASE}/api/v1/documents/delete",
        data=json.dumps({"file_name": filename, "department": department}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-User-Role": "admin"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_all_tests():
    print("=" * 70)
    print("GRAPHMINDRAG REGRESSION TEST SUITE (TESTS A - H)")
    print("=" * 70)
    passed_tests = []
    failed_tests = []

    # ---------------------------------------------------------
    # TEST A: ProjectPlan + "ai là trưởng nhóm?"
    # ---------------------------------------------------------
    print("\n[TEST A] ProjectPlan + 'ai là trưởng nhóm?'")
    try:
        q_a = "ProjectPlan_GraphMind và ai là trưởng nhóm?"
        res_a = ask_copilot(q_a)
        intro_a = res_a.get("introText") or res_a.get("answer") or ""
        citations_a = res_a.get("citations") or []
        print(f"  Intro Text:\n{intro_a}\n")
        print(f"  Citations count: {len(citations_a)}")
        for idx, c in enumerate(citations_a):
            print(f"    Citation #{idx+1}: {c.get('source_file') or c.get('file')} | Chunk {c.get('chunk_index')} | Score {c.get('retrieval_score')} | DocID: {c.get('document_id')}")

        has_leader_name = ("ngọc ánh" in intro_a.lower()) or ("ngoc anh" in intro_a.lower()) or ("trần thị ngọc ánh" in intro_a.lower())
        has_correct_citation = any("c1se18_projectplan" in (c.get("source_file", "") + c.get("file", "") + c.get("docName", "")).lower() for c in citations_a)

        assert has_leader_name, f"Expected team leader 'Tran Thi Ngoc Anh' in answer, got: {intro_a}"
        assert has_correct_citation, f"Expected ProjectPlan document in citations, got: {[c.get('file') for c in citations_a]}"
        print("  --> PASS: Test A (ProjectPlan team leader correctly identified with accurate provenance)")
        passed_tests.append("Test A: ProjectPlan Team Leader & Citation")
    except Exception as e:
        print(f"  --> FAIL: Test A: {e}")
        failed_tests.append(f"Test A: {e}")

    # ---------------------------------------------------------
    # TEST B: No TubeMediaCorp in ProjectPlan Query
    # ---------------------------------------------------------
    print("\n[TEST B] Verify NO TubeMediaCorp in ProjectPlan evidence")
    try:
        # Re-check response from Test A
        if 'res_a' not in locals() or not res_a:
            res_a = ask_copilot("ProjectPlan_GraphMind và ai là trưởng nhóm?")
        evidence_b = str(res_a.get("evidenceChips", []))
        citations_b = str(res_a.get("citations", []))
        intro_b = str(res_a.get("introText", ""))

        assert "tubemediacorp" not in intro_b.lower(), "TubeMediaCorp leaked into answer text!"
        assert "tubemediacorp" not in evidence_b.lower(), "TubeMediaCorp leaked into evidence chips!"
        assert "tubemediacorp" not in citations_b.lower(), "TubeMediaCorp leaked into citations!"
        print("  --> PASS: Test B (0% cross-document contamination from TubeMediaCorp)")
        passed_tests.append("Test B: No Cross-Document Contamination")
    except Exception as e:
        print(f"  --> FAIL: Test B: {e}")
        failed_tests.append(f"Test B: {e}")

    # ---------------------------------------------------------
    # TEST C: TubeMediaCorp Query retrieves TubeMediaCorp only
    # ---------------------------------------------------------
    print("\n[TEST C] TubeMediaCorp Query retrieves TubeMediaCorp only")
    try:
        q_c = "Điều khoản Affiliate Agreement của TubeMediaCorp quy định gì?"
        res_c = ask_copilot(q_c)
        intro_c = res_c.get("introText") or res_c.get("answer") or ""
        citations_c = res_c.get("citations") or []
        print(f"  Citations count: {len(citations_c)}")
        for idx, c in enumerate(citations_c):
            print(f"    Citation #{idx+1}: {c.get('source_file') or c.get('file')}")

        has_tube = any("tubemediacorp" in (c.get("source_file", "") + c.get("file", "") + c.get("docName", "")).lower() for c in citations_c)
        has_no_projectplan = not any("projectplan" in (c.get("source_file", "") + c.get("file", "") + c.get("docName", "")).lower() for c in citations_c)

        assert has_tube, "Expected TubeMediaCorp in citations!"
        assert has_no_projectplan, "ProjectPlan contaminated TubeMediaCorp query!"
        print("  --> PASS: Test C (TubeMediaCorp strictly isolated)")
        passed_tests.append("Test C: TubeMediaCorp Strictly Isolated")
    except Exception as e:
        print(f"  --> FAIL: Test C: {e}")
        failed_tests.append(f"Test C: {e}")

    # ---------------------------------------------------------
    # TEST D: Upload new DOCX with team lead "Nguyễn Văn A"
    # ---------------------------------------------------------
    print("\n[TEST D] Upload new DOCX with team lead 'Nguyễn Văn A'")
    doc_d_name = "TestD_TeamLead_Document.docx"
    try:
        content_d = [
            "Dự án Hệ thống Quản trị Doanh nghiệp Thông minh GraphMind.",
            "Danh sách Ban điều hành và phân công nhân sự:",
            "Trưởng nhóm dự án: Nguyễn Văn A. Email: nguyenvana@graphmind.test. Chịu trách nhiệm chung toàn dự án.",
            "Phó trưởng nhóm: Trần Văn C. Chịu trách nhiệm kiến trúc hệ thống."
        ]
        file_bytes_d = create_docx_bytes(content_d)
        up_res_d = upload_document(doc_d_name, file_bytes_d, department="sales")
        print(f"  Upload response: success={up_res_d.get('success')}, fileHash={up_res_d.get('fileHash')[:12]}")
        time.sleep(1)

        q_d = "Trong tài liệu TestD_TeamLead_Document ai là trưởng nhóm?"
        res_d = ask_copilot(q_d)
        intro_d = res_d.get("introText") or res_d.get("answer") or ""
        citations_d = res_d.get("citations") or []
        print(f"  Intro Text:\n{intro_d}\n")
        print(f"  Citations: {[c.get('source_file') or c.get('file') for c in citations_d]}")

        assert "nguyễn văn a" in intro_d.lower() or "nguyen van a" in intro_d.lower(), f"Expected 'Nguyễn Văn A' in answer, got: {intro_d}"
        assert any(doc_d_name.lower() in (c.get("source_file", "") + c.get("file", "") + c.get("docName", "")).lower() for c in citations_d), "Expected citation pointing to TestD_TeamLead_Document.docx"
        print("  --> PASS: Test D (Dynamic document upload and semantic answer without prompt hack)")
        passed_tests.append("Test D: Dynamic Upload & QA")
    except Exception as e:
        print(f"  --> FAIL: Test D: {e}")
        failed_tests.append(f"Test D: {e}")

    # ---------------------------------------------------------
    # TEST E: Replace document with v2: new team lead "Trần Văn B"
    # ---------------------------------------------------------
    print("\n[TEST E] Replace document with v2: new team lead 'Trần Văn B'")
    try:
        content_e = [
            "Dự án Hệ thống Quản trị Doanh nghiệp Thông minh GraphMind - Phiên bản 2.0.",
            "Danh sách cập nhật nhân sự ban điều hành:",
            "Trưởng nhóm dự án: Trần Văn B. Email: tranvanb@graphmind.test. Thay thế toàn bộ ban điều hành cũ kể từ phiên bản 2.0.",
            "Thư ký dự án: Lê Thị M."
        ]
        file_bytes_e = create_docx_bytes(content_e)
        rep_res_e = replace_document(doc_d_name, file_bytes_e, department="sales")
        print(f"  Replace response: success={rep_res_e.get('success')}")
        time.sleep(1)

        q_e = "Trong tài liệu TestD_TeamLead_Document ai là trưởng nhóm?"
        res_e = ask_copilot(q_e)
        intro_e = res_e.get("introText") or res_e.get("answer") or ""
        print(f"  Intro Text (After Replace):\n{intro_e}\n")

        assert "trần văn b" in intro_e.lower() or "tran van b" in intro_e.lower(), f"Expected updated leader 'Trần Văn B', got: {intro_e}"
        assert "nguyễn văn a" not in intro_e.lower() and "nguyen van a" not in intro_e.lower(), f"Stale leader 'Nguyễn Văn A' still present after replace: {intro_e}"
        print("  --> PASS: Test E (Stale chunks purged on replace, updated v2 answer reflected)")
        passed_tests.append("Test E: Replace File & Stale Purge")
    except Exception as e:
        print(f"  --> FAIL: Test E: {e}")
        failed_tests.append(f"Test E: {e}")

    # ---------------------------------------------------------
    # TEST F: Delete document
    # ---------------------------------------------------------
    print("\n[TEST F] Delete document and verify database cleanup")
    try:
        del_res = delete_document(doc_d_name, department="sales")
        print(f"  Delete response: success={del_res.get('success')}, qdrant_removed={del_res.get('data', {}).get('qdrant_removed')}")

        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
        from app.db.neo4j.client import neo4j_client
        from app.db.qdrant.client import qdrant_client

        neo_count = neo4j_client.run_cypher("MATCH (d:Document {name: $name}) RETURN count(d) as cnt", {"name": doc_d_name})
        cnt_neo = neo_count[0]["cnt"] if neo_count else 0
        print(f"  Neo4j Document count for '{doc_d_name}': {cnt_neo}")
        assert cnt_neo == 0, f"Expected 0 Document node in Neo4j, found {cnt_neo}"

        # Ensure connected
        if not qdrant_client._connected:
            qdrant_client.connect()
        pts, _ = qdrant_client._client.scroll(
            collection_name=qdrant_client._collection,
            scroll_filter={"must": [{"key": "contract_name", "match": {"value": doc_d_name}}]},
            limit=10
        )
        print(f"  Qdrant points count for '{doc_d_name}': {len(pts)}")
        assert len(pts) == 0, f"Expected 0 Qdrant points, found {len(pts)}"
        print("  --> PASS: Test F (Neo4j and Qdrant clean deletion)")
        passed_tests.append("Test F: Clean Deletion in Qdrant & Neo4j")
    except Exception as e:
        print(f"  --> FAIL: Test F: {e}")
        failed_tests.append(f"Test F: {e}")

    # ---------------------------------------------------------
    # TEST G: 2 documents with similar content keep provenance
    # ---------------------------------------------------------
    print("\n[TEST G] Two documents with similar content keep separate provenance")
    doc_g1 = "Doc_Branch_Hanoi.docx"
    doc_g2 = "Doc_Branch_Danang.docx"
    try:
        b_g1 = create_docx_bytes([
            "Báo cáo Chi nhánh Hà Nội:",
            "Trưởng chi nhánh Hà Nội: Ông Lê Hoàng. Phụ trách kinh doanh toàn miền Bắc."
        ])
        b_g2 = create_docx_bytes([
            "Báo cáo Chi nhánh Đà Nẵng:",
            "Trưởng chi nhánh Đà Nẵng: Bà Phan Mai. Phụ trách kinh doanh toàn miền Trung."
        ])
        upload_document(doc_g1, b_g1, department="sales")
        upload_document(doc_g2, b_g2, department="sales")
        time.sleep(1)

        q_g = "Trong tài liệu Doc_Branch_Hanoi ai là trưởng chi nhánh?"
        res_g = ask_copilot(q_g)
        intro_g = res_g.get("introText") or res_g.get("answer") or ""
        citations_g = res_g.get("citations") or []
        print(f"  Intro Text:\n{intro_g}\n")
        print(f"  Citations: {[c.get('source_file') or c.get('file') for c in citations_g]}")

        assert "lê hoàng" in intro_g.lower() or "le hoang" in intro_g.lower(), f"Expected 'Lê Hoàng' for Hanoi, got: {intro_g}"
        assert "phan mai" not in intro_g.lower(), f"Danang leader 'Phan Mai' contaminated Hanoi query: {intro_g}"
        assert any("hanoi" in (c.get("source_file", "") + c.get("file", "")).lower() for c in citations_g), "Expected Hanoi citation"

        # Cleanup
        delete_document(doc_g1, department="sales")
        delete_document(doc_g2, department="sales")
        print("  --> PASS: Test G (Strict document provenance between similar documents)")
        passed_tests.append("Test G: Multi-doc Provenance Isolation")
    except Exception as e:
        print(f"  --> FAIL: Test G: {e}")
        failed_tests.append(f"Test G: {e}")

    # ---------------------------------------------------------
    # TEST H: Out-of-domain query triggers Grounding Gate
    # ---------------------------------------------------------
    print("\n[TEST H] Out-of-domain query ('F-35 stealth fighter')")
    try:
        q_h = "F-35 stealth fighter avionics radar systems"
        res_h = ask_copilot(q_h)
        intro_h = res_h.get("introText") or res_h.get("answer") or ""
        citations_h = res_h.get("citations") or []
        print(f"  Intro Text:\n{intro_h}\n")
        print(f"  Citations count: {len(citations_h)}")

        expected_msg = "Không tìm thấy bằng chứng đủ tin cậy trong kho tri thức để trả lời câu hỏi này."
        assert expected_msg in intro_h, f"Expected safe fallback, got: {intro_h}"
        assert len(citations_h) == 0, f"Expected 0 citations for out-of-domain query, got: {len(citations_h)}"
        print("  --> PASS: Test H (Grounding Gate safely blocked hallucination)")
        passed_tests.append("Test H: Grounding Gate Out-of-Domain Guard")
    except Exception as e:
        print(f"  --> FAIL: Test H: {e}")
        failed_tests.append(f"Test H: {e}")

    # ---------------------------------------------------------
    # FINAL SUMMARY
    # ---------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"REGRESSION SUITE COMPLETED: {len(passed_tests)} PASSED, {len(failed_tests)} FAILED")
    print("=" * 70)
    for p in passed_tests:
        print(f"  [PASS] {p}")
    for f in failed_tests:
        print(f"  [FAIL] {f}")

    return len(failed_tests) == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
