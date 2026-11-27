"""
P10 Hallucination Defense & Numeric Grounding Verifier (BR-02, P10).
Prevents LLM numerical fabrication and ungrounded factual claims by:
1. Enforcing strict evidence requirement: Factual/contract queries require non-empty verified chunks.
2. Validating figures, percentages, and amounts in generated answers against evidence chunks.
"""

import re
from typing import List, Dict, Any, Tuple, Set, Optional


def extract_answer_figures(text: str) -> Set[str]:
    """
    Extracts significant numbers, amounts, and percentages from generated text.
    Filters out common markdown bullet list numbers (e.g., '1.', '2.').
    """
    if not text:
        return set()

    # Remove markdown bullets like '1. ', '2. ', '\n1. '
    cleaned = re.sub(r'(?:^|\n)\s*\d+\.\s+', ' ', text)

    # Patterns for currency, percentages, numerical metrics, and significant numbers
    patterns = [
        r'\$\s*\d+(?:[\.,]\d+)*',
        r'\d+(?:[\.,]\d+)*\s*%',
        r'\d+(?:[\.,]\d+)*(?:\s*(?:tỷ|triệu|nghìn|đồng|usd|vnd|năm|tháng|ngày))',
        r'\b\d{2,}(?:[\.,]\d+)*\b',
    ]
    figures = set()
    for pat in patterns:
        for match in re.finditer(pat, cleaned, re.IGNORECASE):
            raw = match.group(0).strip()
            digits = re.sub(r'[^\d]', '', raw)
            if len(digits) >= 2:  # Ignore single digits (e.g. '1', '2')
                figures.add(raw)
    return figures


def verify_grounded_figures(
    answer_text: str,
    evidence_chunks: List[Dict[str, Any]],
    graph_entities: Optional[List[Dict[str, Any]]] = None
) -> Tuple[str, bool, List[str]]:
    """
    Verifies that significant numbers and figures in the answer appear in the evidence text.
    Returns:
        (sanitized_or_flagged_answer, is_fully_grounded, ungrounded_figures)
    """
    if not answer_text:
        return answer_text, True, []

    # Aggregate all evidence text from chunks and graph entities
    all_evidence = []
    for ch in (evidence_chunks or []):
        t = ch.get("text") or (ch.get("payload") or {}).get("text") or ""
        if t:
            all_evidence.append(t)
    for ge in (graph_entities or []):
        s = ge.get("snippet") or ge.get("grounded_answer") or ""
        if s:
            all_evidence.append(s)

    evidence_blob = " ".join(all_evidence)
    if not evidence_blob:
        figures = extract_answer_figures(answer_text)
        if figures:
            refusal = (
                f"⚠️ [Kiểm định độ tin cậy P10]: Phát hiện số liệu/thông tin ({', '.join(list(figures)[:3])}) nhưng không có "
                "văn bản đối chứng trong kho tri thức. Hệ thống từ chối câu trả lời để đảm bảo an toàn dữ liệu (P10 Refusal)."
            )
            return refusal, False, list(figures)
        return answer_text, True, []

    figures = extract_answer_figures(answer_text)
    ungrounded = []

    for fig in figures:
        dig_groups = re.findall(r'\d+', fig)
        is_matched = False
        for dg in dig_groups:
            if len(dg) >= 2 and dg in evidence_blob:
                is_matched = True
                break
        if not is_matched and dig_groups and any(len(dg) >= 2 for dg in dig_groups):
            ungrounded.append(fig)

    if ungrounded:
        refusal = (
            f"⚠️ [Kiểm định độ tin cậy P10]: Phát hiện số liệu/điều khoản ({', '.join(ungrounded[:4])}) "
            "chưa được đối chứng trực tiếp trong tài liệu trích dẫn đã xác minh. "
            "Hệ thống từ chối câu trả lời để ngăn ngừa sai lệch dữ liệu (P10 Grounding Refusal)."
        )
        return refusal, False, ungrounded

    return answer_text, True, []


def is_factual_contract_query(query: str) -> bool:
    """
    Detects whether a user query requires grounded evidence in knowledge store (fail-closed against hallucination).
    Enterprise rule (Item 5): All enterprise queries require strict grounding UNLESS they are simple
    conversational greetings or meta assistant identity questions.
    """
    if not query:
        return False
    # Normalize query by lowercasing and stripping punctuation
    q_clean = re.sub(r'[^\w\s]', ' ', query.lower()).strip()
    q_clean = re.sub(r'\s+', ' ', q_clean)

    # Conversational greetings and self-meta questions that don't need doc grounding
    greetings = {
        "xin chào", "chào bạn", "hello", "hi", "hey", "good morning", "good afternoon",
        "bạn là ai", "who are you", "bạn có thể làm gì", "what can you do", "giúp gì cho tôi",
        "tạm biệt", "bye", "cảm ơn", "cảm ơn bạn nhiều nhé", "thank you", "thanks",
        "hôm nay thời tiết thế nào"
    }
    if q_clean in greetings:
        return False
    if len(q_clean.split()) <= 2 and any(g in q_clean for g in ["chào", "hello", "hi", "hey"]):
        return False

    # All domain queries, questions, or analytical requests require grounded evidence
    return True
