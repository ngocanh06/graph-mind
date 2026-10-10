"""
GraphMind — Reciprocal Rank Fusion (RRF) Engine
Merges disparate search rankings (dense vector cosine + structured graph matches)
into a unified calibrated relevance list without score normalization distortions.
"""

from typing import List, Dict, Any


def reciprocal_rank_fusion(
    vector_hits: List[Dict[str, Any]],
    graph_hits: List[Dict[str, Any]],
    k: int = 60,
    top_n: int = 8
) -> List[Dict[str, Any]]:
    """
    RRF algorithm: score(d) = sum(1 / (k + rank_i + 1))
    # ponytail: fixed k=60 Cormack standard; tune k only if benchmark shows bias towards one modality
    """
    fused_items: Dict[str, Dict[str, Any]] = {}

    # 1. Process Vector Hits (Qdrant)
    for rank, hit in enumerate(vector_hits):
        doc_id = str(hit.get("id") or f"vec_{rank}")
        c_name = hit.get("contract_name", "Document")
        chunk_id = hit.get("chunk_id", rank)
        score_contribution = 1.0 / (k + rank + 1)

        fused_items[doc_id] = {
            "id": doc_id,
            "type": "vector",
            "label": f"{c_name[:28]} (chunk #{chunk_id})",
            "snippet": hit.get("text") or hit.get("content", ""),
            "rrf_score": score_contribution,
            "sources": [f"Qdrant Rank #{rank + 1} (Score: {hit.get('score', 'N/A')})"],
            "raw": hit
        }

    # 2. Process Graph Hits (Neo4j)
    for rank, node in enumerate(graph_hits):
        node_id = str(node.get("_id") or node.get("id") or f"graph_{rank}")
        name = node.get("name") or node.get("title") or node.get("contract_name") or f"Entity #{node_id}"
        labels = "/".join(node.get("_labels") or ["Entity"])
        score_contribution = 1.0 / (k + rank + 1)

        if node_id in fused_items:
            # If evidence appears in both Vector and Graph
            fused_items[node_id]["rrf_score"] += score_contribution
            fused_items[node_id]["sources"].append(f"Neo4j Rank #{rank + 1} ({labels})")
        else:
            snippet = node.get("snippet") or node.get("description") or str({k: v for k, v in node.items() if not k.startswith("_") and k != "name"})[:300]
            fused_items[node_id] = {
                "id": node_id,
                "type": "graph",
                "label": f"{name} ({labels})",
                "snippet": snippet,
                "rrf_score": score_contribution,
                "sources": [f"Neo4j Rank #{rank + 1} ({labels})"],
                "raw": node
            }

    # 3. Sort descending by fused RRF score
    ranked = sorted(fused_items.values(), key=lambda x: x["rrf_score"], reverse=True)
    return ranked[:top_n]


if __name__ == "__main__":
    # Runnable self-check
    mock_vec = [
        {"id": "doc_1", "contract_name": "Service_Agmt.pdf", "chunk_id": 12, "score": 0.88, "text": "Limitation of liability..."},
        {"id": "doc_2", "contract_name": "NDA_Corp.pdf", "chunk_id": 3, "score": 0.74, "text": "Confidential info..."}
    ]
    mock_graph = [
        {"_id": "doc_1", "name": "Service_Agmt", "_labels": ["Contract"], "snippet": "Governed by Delaware law"},
        {"_id": "node_99", "name": "Action Bicycle", "_labels": ["Customer"], "snippet": "Annual sales 100k"}
    ]
    res = reciprocal_rank_fusion(mock_vec, mock_graph, k=60)
    assert len(res) == 3, f"Expected 3 fused items, got {len(res)}"
    # doc_1 was in both list rank 0 -> should have highest score: 1/(61) + 1/(61)
    assert res[0]["id"] == "doc_1" and len(res[0]["sources"]) == 2, "Cross-modal fusion failed"
    print(f"[Self-Check Passed] RRF Fusion top score: {res[0]['rrf_score']:.6f} for {res[0]['label']}")
