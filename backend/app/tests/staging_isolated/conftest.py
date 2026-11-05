"""
Staging Isolated Conftest (PR0).
Guarantees that any test in this directory is skipped by default
unless explicit user authorization flag --run-staging is provided.
"""
import pytest


def pytest_addoption(parser):
    try:
        parser.addoption(
            "--run-staging",
            action="store_true",
            default=False,
            help="Run tests requiring isolated staging database containers",
        )
    except ValueError:
        pass  # Option already added


@pytest.fixture(autouse=True)
def skip_staging_by_default(request):
    if not request.config.getoption("--run-staging", default=False):
        pytest.skip("Staging tests are disabled by default. Pass --run-staging to run.")
