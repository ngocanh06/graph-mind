"""
Root pytest configuration and dependency fallbacks for GraphMind test suites.
"""
import sys
from types import ModuleType

# Graceful fallback for deepeval if not installed in the current environment
try:
    import deepeval
except ImportError:
    m_deep = ModuleType("deepeval")
    m_metrics = ModuleType("deepeval.metrics")
    m_testcase = ModuleType("deepeval.test_case")

    class LLMTestCase:
        def __init__(self, input="", actual_output="", expected_output="", context=None, retrieval_context=None, **kwargs):
            self.input = input
            self.actual_output = actual_output
            self.expected_output = expected_output
            self.context = context or []
            self.retrieval_context = retrieval_context or []

    class BaseMetric:
        def __init__(self, threshold=0.5, **kwargs):
            self.threshold = threshold
            self.score = 0.0
            self.success = False
            self.reason = ""

        def measure(self, test_case: LLMTestCase) -> float:
            return self.score

        def is_successful(self) -> bool:
            return getattr(self, "success", False) or self.score >= self.threshold

    def assert_test(test_case, metrics):
        for metric in metrics:
            score = metric.measure(test_case)
            is_ok = metric.is_successful() if hasattr(metric, "is_successful") else (score >= getattr(metric, "threshold", 0.5))
            assert is_ok, (
                f"Metric {getattr(metric, '__name__', type(metric).__name__)} failed "
                f"with score {score} < {getattr(metric, 'threshold', 0.5)}: {getattr(metric, 'reason', '')}"
            )

    m_deep.assert_test = assert_test
    m_metrics.BaseMetric = BaseMetric
    m_testcase.LLMTestCase = LLMTestCase

    sys.modules["deepeval"] = m_deep
    sys.modules["deepeval.metrics"] = m_metrics
    sys.modules["deepeval.test_case"] = m_testcase
