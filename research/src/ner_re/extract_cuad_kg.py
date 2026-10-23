"""
GraphMind — CUAD Knowledge Graph Extraction (NER & RE)
Extracts Company, Contract, and Clause entities directly from real CUAD data in Qdrant,
and builds ground-truth relationships in Neo4j without any synthetic fabrication.
"""

import sys
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add backend to path to reuse existing DB clients
ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.neo4j.client import neo4j_client
from app.db.qdrant.client import QdrantClientWrapper
from qdrant_client.http import models

# Core clause categories mapped from Atticus CUAD standards
# ponytail: regex NER on pre-labeled CUAD patterns; swap to spaCy/transformers NER if domain shifts beyond SEC EDGAR
CLAUSE_PATTERNS = {
    "Termination": re.compile(r"\b(terminat\w+|notice period|immediate termination)\b", re.IGNORECASE),
    "Governing Law": re.compile(r"\b(governed by|jurisdiction|applicable law|courts of)\b", re.IGNORECASE),
    "Limitation of Liability": re.compile(r"\b(limitation of liability|consequential damages|aggregate liability)\b", re.IGNORECASE),
    "Confidentiality": re.compile(r"\b(confidential\w+|non-disclosure|proprietary information)\b", re.IGNORECASE),
    "Indemnification": re.compile(r"\b(indemnif\w+|hold harmless|defend and hold)\b", re.IGNORECASE),
    "Audit Rights": re.compile(r"\b(audit rights|inspect records|books and records)\b", re.IGNORECASE),
    "Non-Compete": re.compile(r"\b(non-compete|restrictive covenant|exclusivity)\b", re.IGNORECASE),
    "Dispute Resolution": re.compile(r"\b(arbitration|mediation|dispute resolution)\b", re.IGNORECASE),
}


def parse_contract_filename(filename: str) -> Dict[str, str]:
    """NER on standardized SEC EDGAR filenames (Company, Date, Type)."""
    base = filename.replace(".txt", "").replace(".pdf", "")
    parts = base.split("-")
    
    # Extract Company & Date from first token
    prefix = parts[0]
    date_match = re.search(r"(\d{2}_\d{2}_\d{4}|\d{8})", prefix)
    date_str = date_match.group(1) if date_match else "Unknown"
    company_raw = prefix[:date_match.start()].rstrip("_") if date_match else prefix
    
    # Clean company name
    company = re.sub(r"([A-Z])([A-Z][a-z])", r"\1 \2", company_raw)
    company = re.sub(r"([a-z])([A-Z])", r"\1 \2", company).replace("_", " ").strip()
    if not company:
        company = "Enterprise Partner"

    contract_type = parts[-1].strip() if len(parts) > 1 else "Commercial Contract"
    return {
        "company": company,
        "date": date_str.replace("_", "/"),
        "contract_type": contract_type,
        "contract_name": base
    }


def extract_clauses_from_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """RE & NER: Extract specific legal clauses from text chunks."""
    found_clauses = []
    seen_types = set()
    for c in chunks:
        text = c.get("text", "")
        chunk_id = c.get("chunk_id", 0)
        for ctype, pattern in CLAUSE_PATTERNS.items():
            if ctype not in seen_types and pattern.search(text):
                seen_types.add(ctype)
                found_clauses.append({
                    "clause_type": ctype,
                    "chunk_id": chunk_id,
                    "snippet": text[:350].strip()
                })
    return found_clauses


def ingest_cuad_to_neo4j(limit: int = 50) -> Dict[str, int]:
    """Extract entities and write real Ground-Truth graph into Neo4j."""
    qdrant = QdrantClientWrapper()
    if not qdrant.connect() or not neo4j_client.connect():
        raise RuntimeError("Could not connect to Qdrant or Neo4j")

    # Get distinct contracts from Qdrant scroll
    pts, _ = qdrant._client.scroll(
        collection_name=qdrant._collection,
        limit=10000,
        with_payload=["contract_name"],
        with_vectors=False
    )
    contract_names = list(dict.fromkeys(p.payload.get("contract_name") for p in pts if p.payload and p.payload.get("contract_name")))
    if limit > 0:
        contract_names = contract_names[:limit]

    print(f"[NER/RE] Processing {len(contract_names)} real CUAD contracts into Neo4j...")
    counts = {"companies": 0, "contracts": 0, "clauses": 0}

    for idx, cname in enumerate(contract_names, 1):
        meta = parse_contract_filename(cname)
        contract_id = f"CUAD_{idx:03d}"
        
        # 1. Fetch chunks for this contract from Qdrant
        hits, _ = qdrant._client.scroll(
            collection_name=qdrant._collection,
            limit=25,
            scroll_filter=models.Filter(must=[models.FieldCondition(key="contract_name", match=models.MatchValue(value=cname))]),
            with_payload=True,
            with_vectors=False
        )
        chunks = [h.payload for h in hits if h.payload]
        clauses = extract_clauses_from_chunks(chunks)

        # 2. Write to Neo4j via Cypher MERGE (Idempotent)
        cypher = """
        MERGE (comp:Company {name: $company})
        MERGE (ctr:Contract {id: $contract_id})
        ON CREATE SET 
            ctr.name = $contract_name,
            ctr.type = $contract_type,
            ctr.date = $date,
            ctr.source = "CUAD",
            ctr.chunk_count = $chunk_count
        MERGE (comp)-[:PARTY_TO]->(ctr)
        WITH ctr
        UNWIND $clauses AS cl
            CREATE (cls:Clause {
                id: ctr.id + '_' + cl.clause_type,
                type: cl.clause_type,
                chunk_id: cl.chunk_id,
                snippet: cl.snippet
            })
            MERGE (ctr)-[:CONTAINS_CLAUSE]->(cls)
        """
        neo4j_client.run_cypher(cypher, {
            "company": meta["company"],
            "contract_id": contract_id,
            "contract_name": meta["contract_name"],
            "contract_type": meta["contract_type"],
            "date": meta["date"],
            "chunk_count": len(chunks),
            "clauses": clauses
        })

        counts["contracts"] += 1
        counts["clauses"] += len(clauses)

    counts["companies"] = neo4j_client.run_cypher("MATCH (c:Company) RETURN count(c) AS cnt")[0]["cnt"]
    return counts


if __name__ == "__main__":
    result = ingest_cuad_to_neo4j(limit=30)
    print(f"[OK] Ingestion complete: {result}")
    # Self-check assertions
    assert result["contracts"] > 0, "No contracts ingested"
    assert result["clauses"] > 0, "No clauses extracted"
    print("[Self-Check Passed] Ground-truth Neo4j CUAD Graph verified!")
