import pytest
from app.tests.safety_db_guard import assert_test_database, get_test_database_url


def test_safety_db_guard_rejects_graphmind_db():
    with pytest.raises(RuntimeError) as exc_info:
        assert_test_database("postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_db")
    assert "FATAL DB SAFETY VIOLATION" in str(exc_info.value)
    assert "graphmind_db" in str(exc_info.value)


def test_safety_db_guard_rejects_non_test_database():
    with pytest.raises(RuntimeError) as exc_info:
        assert_test_database("postgresql+asyncpg://postgres:123123@localhost:5432/production_db")
    assert "FATAL DB SAFETY VIOLATION" in str(exc_info.value)
    assert "does not end with '_test'" in str(exc_info.value)


def test_safety_db_guard_accepts_test_database():
    assert assert_test_database("postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_test") == "graphmind_test"
    assert assert_test_database("postgresql+asyncpg://postgres:123123@localhost:5432/graphmind_pb56_test") == "graphmind_pb56_test"
    assert assert_test_database("graphmind_temp_test") == "graphmind_temp_test"


def test_safety_db_guard_rejects_empty():
    with pytest.raises(ValueError):
        assert_test_database("")

