"""
GraphMind Sprint 2 AI / KG / LoRA Evaluation Suite — DeepEval
Covers:
  - PB08–PB12, PB19: CUAD NER/RE, Neo4j Schema & Qdrant 384-Dim Embeddings
  - PB17–PB18: Kaggle T4 LoRA/PEFT Fine-Tuning Setup (Unsloth Qwen2.5-7B-Instruct 4-bit)
"""
import json
from pathlib import Path

from deepeval import assert_test
from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase

REPO_ROOT = Path(__file__).resolve().parents[2]


class LoRANotebookConfigMetric(BaseMetric):
    """DeepEval metric validating Kaggle T4 LoRA/Unsloth fine-tuning notebook configuration."""

    REQUIRED_TOKENS = [
        "Qwen2.5-7B-Instruct-bnb-4bit",
        "load_in_4bit = True",
        "r=16",
        "lora_alpha=16",
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ]

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        text = test_case.actual_output
        hits = [t for t in self.REQUIRED_TOKENS if t in text]
        self.score = len(hits) / len(self.REQUIRED_TOKENS)
        self.success = self.score >= self.threshold
        self.reason = f"Found {len(hits)}/{len(self.REQUIRED_TOKENS)} required LoRA/Unsloth parameters."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Kaggle T4 LoRA Config Completeness"


class CUADExtractionSchemaMetric(BaseMetric):
    """DeepEval metric validating CUAD NER/RE script covers core legal graph entities & relations."""

    REQUIRED_ENTITIES = ["Company", "Contract", "Clause", "PARTY_TO", "CONTAINS_CLAUSE"]

    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        src = test_case.actual_output
        hits = [e for e in self.REQUIRED_ENTITIES if e in src]
        self.score = len(hits) / len(self.REQUIRED_ENTITIES)
        self.success = self.score >= self.threshold
        self.reason = f"Matched {len(hits)}/{len(self.REQUIRED_ENTITIES)} CUAD KG entities/relations."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "CUAD NER/RE Graph Schema Coverage"


class QdrantVectorSchemaMetric(BaseMetric):
    """DeepEval metric validating 384-dim SentenceTransformer & Qdrant retrieval guard."""

    REQUIRED_MARKERS = ["384", "cuad_contracts", "is_active"]

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        src = test_case.actual_output
        hits = [m for m in self.REQUIRED_MARKERS if m in src]
        self.score = len(hits) / len(self.REQUIRED_MARKERS)
        self.success = self.score >= self.threshold
        self.reason = f"Matched {len(hits)}/{len(self.REQUIRED_MARKERS)} Qdrant 384-dim & Layer-1 markers."
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Qdrant 384-Dim & Layer-1 Guard"


class MultiHopTaskBalanceMetric(BaseMetric):
    """DeepEval metric verifying Sprint 2 dataset covers both NL2Cypher & RAG Citation tasks."""

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0
        self.success = False
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        records = json.loads(test_case.actual_output)
        tasks = {r.get("task") for r in records}
        has_cypher = "text_to_cypher" in tasks
        has_rag = "rag_citation" in tasks
        self.score = (int(has_cypher) + int(has_rag)) / 2.0
        self.success = self.score >= self.threshold
        self.reason = f"Dataset tasks present: {sorted(t for t in tasks if t)}"
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "Multi-Task Fine-Tuning Balance"


def test_s2_ai_01_deepeval_lora_kaggle_notebook():
    """S2_AI_01: DeepEval verifies Kaggle T4 LoRA/Unsloth notebook config (PB17, PB18)."""
    nb_text = (REPO_ROOT / "research" / "notebooks" / "05_finetuning_kaggle_unsloth.ipynb").read_text(encoding="utf-8")
    tc = LLMTestCase(input="Validate Kaggle T4 Unsloth LoRA configuration", actual_output=nb_text)
    assert_test(tc, [LoRANotebookConfigMetric(threshold=1.0)])


def test_s2_ai_02_deepeval_cuad_ner_re_extraction():
    """S2_AI_02: DeepEval verifies CUAD NER/RE extraction script covers legal KG schema (PB08-PB10)."""
    src = (REPO_ROOT / "research" / "src" / "ner_re" / "extract_cuad_kg.py").read_text(encoding="utf-8")
    tc = LLMTestCase(input="Audit CUAD NER/RE legal graph extraction", actual_output=src)
    assert_test(tc, [CUADExtractionSchemaMetric(threshold=0.8)])


def test_s2_ai_03_deepeval_qdrant_384_and_layer1_guard():
    """S2_AI_03: DeepEval verifies Qdrant 384-dim embeddings & PR1 Layer-1 is_active guard (PB12)."""
    qdrant_src = (REPO_ROOT / "backend" / "app" / "db" / "qdrant" / "client.py").read_text(encoding="utf-8")
    pipe_src = (REPO_ROOT / "backend" / "app" / "modules" / "m1_data_sync" / "pipeline.py").read_text(encoding="utf-8")
    combined = qdrant_src + "\n" + pipe_src[:40000]
    tc = LLMTestCase(input="Verify Qdrant 384-dim & Layer-1 guard", actual_output=combined)
    assert_test(tc, [QdrantVectorSchemaMetric(threshold=1.0)])


def test_s2_ai_04_deepeval_multitask_finetuning_balance():
    """S2_AI_04: DeepEval verifies fine-tuning dataset balances text_to_cypher & rag_citation (PB17)."""
    raw = (REPO_ROOT / "research" / "data" / "qa_pairs" / "train_dataset.json").read_text(encoding="utf-8")
    tc = LLMTestCase(input="Verify fine-tuning task balance", actual_output=raw)
    assert_test(tc, [MultiHopTaskBalanceMetric(threshold=1.0)])


def test_s2_ai_05_known_limitation_qdrant_payload_index_e2e_iss_16():
    """S2_AI_05 [Known MVP Limitation E2E-ISS-16]: Qdrant client lacks payload index creation on department & is_active."""
    qdr_src = (REPO_ROOT / "backend" / "app" / "db" / "qdrant" / "client.py").read_text(encoding="utf-8")
    assert "create_payload_index" in qdr_src, (
        "Known Limitation E2E-ISS-16: Qdrant client does not create payload indexes on department/is_active."
    )
