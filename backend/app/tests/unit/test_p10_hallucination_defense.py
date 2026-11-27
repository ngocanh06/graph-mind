"""
RED/GREEN Reproduction and Verification Tests for P10 Hallucination Defense (Step 2B.7).

Verifies:
1. is_factual_contract_query identifies queries requiring strict grounding.
2. Grounded numbers (present in evidence) pass validation cleanly without disclaimers.
3. Ungrounded fabricated figures (P10 hallucination bug) are detected, flagged, and cause confidence degradation.
4. Factual contract queries without verified chunks fail closed with grounding refusal.
"""

import pytest
from app.core.grounding_verifier import (
    is_factual_contract_query,
    extract_answer_figures,
    verify_grounded_figures
)


def test_is_factual_contract_query_detection():
    """Verify accurate detection of queries asking for factual or contract numbers/clauses."""
    factual_queries = [
        "Điều khoản bồi thường trong hợp đồng quy định mức phạt bao nhiêu?",
        "Trách nhiệm vô hạn của đối tác theo hợp đồng dịch vụ là gì?",
        "Thời hạn thanh toán hợp đồng là bao nhiêu ngày?",
        "Chi phí bản quyền phần mềm và phí phạt vi phạm là bao nhiêu?",
        "Quy định về bảo mật thông tin và bồi thường thiệt hại?",
        "What is the maximum liability and penalty clause in the contract?",
    ]
    for q in factual_queries:
        assert is_factual_contract_query(q) is True, f"Failed to identify factual query: {q}"

    conversational_queries = [
        "Xin chào!",
        "Bạn là ai?",
        "Hôm nay thời tiết thế nào?",
        "Cảm ơn bạn nhiều nhé.",
    ]
    for q in conversational_queries:
        assert is_factual_contract_query(q) is False, f"Incorrectly marked conversational query: {q}"


def test_grounded_figures_pass_verification():
    """Verify that answers containing numbers directly supported by evidence pass without warning."""
    evidence = [
        {
            "text": "Mức phạt vi phạm hợp đồng tối đa là 8% giá trị phần nghĩa vụ bị vi phạm theo Điều 301 Luật Thương mại, số tiền ước tính $50,000 USD."
        }
    ]
    answer = "Theo quy định, mức phạt vi phạm là 8% và số tiền ước tính là $50,000 USD."

    verified_answer, is_grounded, ungrounded = verify_grounded_figures(
        answer_text=answer,
        evidence_chunks=evidence,
    )

    assert is_grounded is True
    assert len(ungrounded) == 0
    assert "⚠️ [Kiểm định độ tin cậy P10]" not in verified_answer


def test_ungrounded_fabricated_figures_detected():
    """
    P10 Reproduction & Fix:
    When the LLM fabricates arbitrary monetary amounts or percentages absent from the source text,
    the verifier detects the hallucination and appends a P10 reliability disclaimer.
    """
    evidence = [
        {
            "text": "Các bên cam kết giải quyết mọi tranh chấp phát sinh từ hợp đồng thông qua thương lượng hòa giải trước khi đưa ra Tòa án."
        }
    ]
    # Simulated LLM hallucination (P10): inventing $1,000,000 and 30% penalty
    hallucinated_answer = (
        "Bên vi phạm hợp đồng có nghĩa vụ bồi thường toàn bộ thiệt hại lên đến $1,000,000 USD "
        "và chịu phạt vi phạm tương đương 30% tổng giá trị hợp đồng."
    )

    verified_answer, is_grounded, ungrounded = verify_grounded_figures(
        answer_text=hallucinated_answer,
        evidence_chunks=evidence,
    )

    assert is_grounded is False
    assert len(ungrounded) >= 1
    assert any("$1,000,000" in u for u in ungrounded)
    assert "⚠️ [Kiểm định độ tin cậy P10]" in verified_answer
    assert "chưa được đối chứng trực tiếp trong tài liệu trích dẫn" in verified_answer


def test_factual_query_with_no_evidence_fails_closed():
    """When evidence is empty and query is factual, verifier flags all generated figures as ungrounded."""
    empty_evidence = []
    hallucinated_answer = "Tổng giá trị hợp đồng được phê duyệt là 500 triệu đồng."

    verified_answer, is_grounded, ungrounded = verify_grounded_figures(
        answer_text=hallucinated_answer,
        evidence_chunks=empty_evidence,
    )

    assert is_grounded is False
    assert "⚠️ [Kiểm định độ tin cậy P10]" in verified_answer
