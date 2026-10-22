"""
RBAC & Department Data Scope Governance — backend/app/core/rbac.py
Enforces Row-Level / Node-Level Data Isolation as defined in SRS BR-02, BR-05, and US19.

Roles:
- executive: Unrestricted full-access across the SME (BR-05).
- it_admin: Full access to all telemetry, system configs & documents.
- knowledge_manager: Access to assigned department documents & oversight queues.
- standard: Access strictly scoped to assigned department (Default: Sales / Kinh doanh).
"""
import re
from typing import Dict, Any, List, Optional, Tuple

ROLE_EXECUTIVE = "executive"
ROLE_ADMIN = "it_admin"
ROLE_MANAGER = "knowledge_manager"
ROLE_STANDARD = "standard"

# Mapping department scopes
ROLE_DEPARTMENT_SCOPE = {
    ROLE_EXECUTIVE: ["ALL"],
    ROLE_ADMIN: ["ALL"],
    ROLE_MANAGER: ["Kinh doanh", "R&D", "Pháp chế"],
    ROLE_STANDARD: ["Kinh doanh", "R&D"]  # Sales Specialist: Sales orders, customers, product catalog
}

# Entity labels allowed per role
ALLOWED_ENTITY_LABELS = {
    ROLE_EXECUTIVE: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Employee", "Vendor", "Company"},
    ROLE_ADMIN: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Employee", "Vendor", "Company"},
    ROLE_MANAGER: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Company"},
    ROLE_STANDARD: {"Customer", "Product", "SalesOrder", "Contract", "Clause"}  # Excludes Employee (HR payroll / internal personnel)
}

# Forbidden topics/keywords for Standard Sales User (HR payroll, employee directory, internal audit logs)
STANDARD_RESTRICTED_KEYWORDS = [
    r"\blương\b",
    r"\btiền lương\b",
    r"\bbảng lương\b",
    r"\bsalary\b",
    r"\bsalaries\b",
    r"\bpayroll\b",
    r"\bnhân sự nội bộ\b",
    r"\bstaff directory\b",
    r"\bemployee directory\b",
    r"\bhồ sơ nhân viên\b",
    r"\bquản trị hệ thống\b",
    r"\bapi key\b",
    r"\bsecret key\b",
]


def is_privileged_role(role: str) -> bool:
    """Kiểm tra vai trò có toàn quyền truy cập liên phòng ban hay không"""
    clean_role = (role or "").strip().lower()
    return clean_role in [ROLE_EXECUTIVE, ROLE_ADMIN, "admin", "cfo", "ceo"]


def check_data_scope_permission(query: str, role: str) -> Tuple[bool, Optional[str]]:
    """
    Kiểm tra xem câu hỏi hoặc truy vấn của người dùng có vi phạm phạm vi dữ liệu RBAC không.
    Đối với Standard User (Kinh doanh): Không được phép tra cứu bảng lương nhân viên / nhân sự nội bộ (HR).
    """
    clean_role = (role or "").strip().lower()
    if is_privileged_role(clean_role) or clean_role == ROLE_MANAGER:
        return True, None

    clean_query = (query or "").lower()
    for pattern in STANDARD_RESTRICTED_KEYWORDS:
        if re.search(pattern, clean_query, re.IGNORECASE):
            return False, (
                "Theo chính sách phân quyền dữ liệu RBAC (Quy tắc BR-02 / US19), tài khoản Standard User "
                "(Chuyên viên Kinh doanh) chỉ có quyền tra cứu trong phạm vi Dữ liệu Kinh doanh (Khách hàng, "
                "Đơn hàng, Danh mục sản phẩm và Hợp đồng thương mại liên quan). Dữ liệu nhân sự / tiền lương "
                "thuộc phạm vi bảo mật của phòng Nhân sự (HR) và Ban Giám Đốc."
            )

    return True, None


def filter_graph_entities_by_scope(entities: List[Dict[str, Any]], role: str) -> List[Dict[str, Any]]:
    """Lọc danh sách các node thực thể Neo4j trả về tuân thủ Data Scope của role"""
    clean_role = (role or "").strip().lower()
    if is_privileged_role(clean_role):
        return entities

    allowed_labels = ALLOWED_ENTITY_LABELS.get(clean_role, ALLOWED_ENTITY_LABELS[ROLE_STANDARD])
    filtered = []
    for ent in entities:
        labels = ent.get("_labels") or []
        if isinstance(labels, str):
            labels = [labels]
        # Nếu thực thể là Employee mà user là Standard User -> loại bỏ
        if "Employee" in labels and clean_role == ROLE_STANDARD:
            continue
        filtered.append(ent)
    return filtered


def filter_search_documents_by_scope(documents: List[Dict[str, Any]], role: str) -> List[Dict[str, Any]]:
    """Lọc tài liệu / bộ dữ liệu trả về trong Multi-facet Search tuân thủ Data Scope"""
    clean_role = (role or "").strip().lower()
    if is_privileged_role(clean_role):
        return documents

    filtered = []
    for doc in documents:
        doc_id = doc.get("id") or doc.get("code") or ""
        # Ẩn Staff Directory khỏi Standard User
        if "EMPLOYEE" in doc_id.upper() or "STAFF" in doc_id.upper():
            continue
        filtered.append(doc)
    return filtered
