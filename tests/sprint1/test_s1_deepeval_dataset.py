"""
GraphMind Sprint 1 AI Dataset & Synthetic Linking Evaluation — DeepEval
Covers:
  - PB16 / US46: 509 ChatML Q&A Dataset Quality & Safety
  - PB47 / US45: Controlled Synthetic Linking (AdventureWorks <-> CUAD)
Uses DeepEval LLMTestCase + deterministic BaseMetric subclasses (zero external API cost).
"""
import json
import re
from pathlib import Path

from deepeval import assert_test
from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = REPO_ROOT / "research" / "data" / "qa_pairs" / "train_dataset.json"
MUTATING_CYPHER_RE = re.compile(r"\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|CALL)\b", re.IGNORECASE)


class DatasetFormatMetric(BaseMetric):
    """DeepEval metric verifying ChatML/Instruction-Output completeness and non-empty fields."""

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        records = json.loads(test_case.actual_output)
        valid = sum(
            1
            for r in records
            if isinstance(r, dict)
            and str(r.get("task", "")).strip()
            and str(r.get("instruction", "")).strip()
            and str(r.get("output", "")).strip()
        )
        self.score = valid / len(records) if records else 0.0
        self.success = self.score >= self.threshold
        self.reason = f"{valid}/{len(records)} records have valid non-empty task, instruction, and output."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Dataset Format Completeness"


class ReadOnlyCypherSafetyMetric(BaseMetric):
    """DeepEval metric verifying 100% of text_to_cypher outputs are read-only (no mutating keywords)."""

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        records = json.loads(test_case.actual_output)
        cypher_rows = [r for r in records if r.get("task") == "text_to_cypher"]
        safe = sum(
            1
            for r in cypher_rows
            if "MATCH" in r["output"].upper()
            and "RETURN" in r["output"].upper()
            and not MUTATING_CYPHER_RE.search(r["output"])
        )
        self.score = safe / len(cypher_rows) if cypher_rows else 0.0
        self.success = self.score >= self.threshold
        self.reason = f"{safe}/{len(cypher_rows)} text_to_cypher pairs are strictly read-only MATCH..RETURN."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Read-Only Cypher Safety"


class SyntheticLinkingIntegrityMetric(BaseMetric):
    """DeepEval metric verifying AdventureWorks <-> CUAD synthetic linking bridge coverage."""

    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        records = json.loads(test_case.actual_output)
        linked = [
            r
            for r in records
            if any(k in r.get("output", "") for k in ("PARTY_TO", "CONTAINS_CLAUSE", "Customer", "SalesOrder", "Contract"))
        ]
        self.score = min(1.0, len(linked) / max(1, len(records)))
        self.success = self.score >= self.threshold
        self.reason = f"{len(linked)}/{len(records)} samples ground entities across AdventureWorks/CUAD schema."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Synthetic Linking Grounding"


def _load_dataset_text() -> tuple[list, str]:
    raw = DATASET_PATH.read_text(encoding="utf-8")
    return json.loads(raw), raw


def test_s1_ai_01_dataset_exact_509_count():
    """S1_AI_01: train_dataset.json contains exactly 509 curated Q&A pairs (PB16)."""
    records, _ = _load_dataset_text()
    assert len(records) == 509, f"Expected 509 Q&A pairs, got {len(records)}"


def test_s1_ai_02_deepeval_format_completeness():
    """S1_AI_02: DeepEval verifies 100% of 509 records have valid task/instruction/output."""
    _, raw = _load_dataset_text()
    tc = LLMTestCase(input="Validate 509 ChatML Q&A dataset schema", actual_output=raw)
    assert_test(tc, [DatasetFormatMetric(threshold=1.0)])


def test_s1_ai_03_deepeval_cypher_read_only_safety():
    """S1_AI_03: DeepEval verifies 100% of text_to_cypher outputs are read-only and injection-safe."""
    _, raw = _load_dataset_text()
    tc = LLMTestCase(input="Audit text_to_cypher safety across 509 dataset", actual_output=raw)
    assert_test(tc, [ReadOnlyCypherSafetyMetric(threshold=1.0)])


def test_s1_ai_04_deepeval_synthetic_linking_grounding():
    """S1_AI_04: DeepEval verifies AdventureWorks <-> CUAD synthetic linking references (PB47)."""
    _, raw = _load_dataset_text()
    tc = LLMTestCase(input="Verify AdventureWorks-CUAD synthetic linking coverage", actual_output=raw)
    assert_test(tc, [SyntheticLinkingIntegrityMetric(threshold=0.5)])


def test_s1_ai_05_dataset_80_20_split_and_uniqueness():
    """S1_AI_05: Dataset supports 80/20 split (407 train / 102 val) and has high instruction diversity."""
    records, _ = _load_dataset_text()
    train_size = int(len(records) * 0.8)
    val_size = len(records) - train_size
    assert train_size == 407 and val_size == 102
    unique_prompts = len({(r["instruction"].strip(), str(r.get("input", "")).strip()) for r in records})
    assert unique_prompts / len(records) >= 0.90, (
        f"Prompt uniqueness too low: {unique_prompts}/{len(records)}"
    )
