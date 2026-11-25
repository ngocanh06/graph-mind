import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.rbac import get_user_scope, ScopeContext

@pytest.fixture
def client_sales_user():
    """Client với dependency_override cho get_user_scope trả về user phòng Sales (không có quyền Legal)"""
    mock_user = MagicMock()
    mock_user.role = "standard"
    mock_user.email = "sales_user@graphmind.ai"
    
    sales_scope = ScopeContext(
        user=mock_user,
        role="standard",
        is_unrestricted=False,
        department_name="sales",
        canonical_dept="sales",
        allowed_depts={"sales"},
        allowed_resources={"SALES"}
    )
    
    app.dependency_overrides[get_user_scope] = lambda: sales_scope
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

def test_knowledge_explorer_fail_closed_endpoint(client_sales_user):
    """
    Kiểm thử trực tiếp endpoint GET /api/knowledge-explorer/search.
    Khi Qdrant trả về các chunk của phòng Legal mà user phòng Sales không có quyền,
    endpoint BẮT BUỘC phải trả về vector_results = [] (Fail-closed).
    Nếu rơi vào lỗi Fail-open cũ (if filtered:), test này sẽ FAIL vì trả về 3 kết quả gốc.
    """
    mock_qdrant_hits = [
        {"contract_name": "Contract_Legal_01.pdf", "department": "legal", "text": "Secret Legal 1"},
        {"contract_name": "Contract_Legal_02.pdf", "department": "legal", "text": "Secret Legal 2"},
        {"contract_name": "Contract_Legal_03.pdf", "department": "legal", "text": "Secret Legal 3"},
    ]
    
    with patch("app.main.qdrant_client.vector_search", return_value=mock_qdrant_hits):
        with patch("app.main.neo4j_client.search_nodes", return_value=[]):
            with patch("app.main.neo4j_client.get_all_nodes", return_value=[]):
                response = client_sales_user.get("/api/knowledge-explorer/search?query=indemnification")
                assert response.status_code == 200
                data = response.json()
                vector_results = data.get("vector_results", [])
                
                # BẮT BUỘC rỗng vì user Sales không có quyền Legal
                assert len(vector_results) == 0, f"FAIL-OPEN LEAK DETECTED: Expected 0 results but got {len(vector_results)} unauthorized documents!"
                assert vector_results == []
