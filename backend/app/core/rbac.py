"""
Graph Mind — Enterprise RBAC & Department Data Scope Governance (BR-02, BR-04, BR-05, US19)
Enforces Row-Level / Node-Level Data Isolation as defined in SRS BR-02, BR-04, BR-05, and US19.

Roles:
- executive: Unrestricted full-access across the SME (BR-05).
- it_admin: Full access to all telemetry, system configs & documents (BR-03).
- knowledge_manager: Access to assigned department documents & oversight queues (BR-04).
- standard: Access strictly scoped to assigned department (Default: Sales / Kinh doanh).
"""

import re
import uuid
import urllib.parse
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional, Set, List, Dict, Any, Tuple
from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.security import decode_access_token
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
except ImportError:
    from core.security import decode_access_token
    from db.postgres.database import get_db
    from db.postgres.models.user import User

security_bearer = HTTPBearer(auto_error=False)

# ── Role Definitions & Entity Label Scopes ───────────────────────────────────
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
    ROLE_EXECUTIVE: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Employee", "Vendor", "Company", "Document", "Department", "Category", "SubCategory"},
    ROLE_ADMIN: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Employee", "Vendor", "Company", "Document", "Department", "Category", "SubCategory"},
    ROLE_MANAGER: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Company", "Vendor", "Document", "Department", "Category", "SubCategory"},
    ROLE_STANDARD: {"Customer", "Product", "SalesOrder", "Contract", "Clause", "Document", "Department", "Category", "SubCategory"}  # Excludes Employee (HR payroll / internal personnel) and Vendor / Company
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


CANONICAL_RESOURCE_TYPES = ["LEGAL", "SALES", "ACCOUNTING_PROCUREMENT", "IT", "RND"]

RESOURCE_TO_FOLDER = {
    "LEGAL": "legal",
    "SALES": "sales",
    "ACCOUNTING_PROCUREMENT": "accounting_procurement",
    "IT": "it",
    "RND": "rnd",
}

FOLDER_TO_RESOURCE = {
    "legal": "LEGAL",
    "sales": "SALES",
    "accounting_procurement": "ACCOUNTING_PROCUREMENT",
    "accounting": "ACCOUNTING_PROCUREMENT",
    "it": "IT",
    "rnd": "RND",
}


def resolve_resource_type(val: Any) -> str:
    """
    Resolves any department name, folder, key, doc dict, or path to one of the 5 canonical RESOURCE_TYPES:
    LEGAL, SALES, ACCOUNTING_PROCUREMENT, IT, RND.
    Returns 'UNKNOWN' if department cannot be resolved (fail-closed).
    """
    if isinstance(val, dict):
        payload = val.get("payload") if isinstance(val.get("payload"), dict) else {}

        # 0. Check ERP structured labels and types (Product, Customer, SalesOrder -> SALES; Vendor, PO -> ACCOUNTING_PROCUREMENT)
        labels = val.get("_labels") or payload.get("_labels") or []
        if isinstance(labels, str):
            labels = [labels]
        e_type = str(val.get("entity_type") or payload.get("entity_type") or "")
        if any(l in ["Product", "ProductCategory", "ProductSubcategory", "Customer", "SalesOrder", "SalesOrderDetail"] for l in labels) or e_type in ["Product", "ProductCategory", "ProductSubcategory", "Customer", "SalesOrder", "SalesOrderDetail"]:
            return "SALES"
        if any(l in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail", "Store", "Supplier"] for l in labels) or e_type in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail", "Store", "Supplier"]:
            return "ACCOUNTING_PROCUREMENT"
        if any(l in ["DocumentSummary", "SystemStats", "ContractPortfolio", "ComplianceReport", "CUAD"] for l in labels) or str(val.get("document_id") or payload.get("document_id", "")).startswith("SYSTEM-") or val.get("_id") in ["total-documents-summary", "portfolio-breakdown", "compliance-stats"]:
            return "SALES"

        # Check explicit department fields FIRST (prevents filename 'Salesforce' spoofing Legal docs)
        dept_val = (
            val.get("department")
            or payload.get("department")
            or val.get("dept")
            or payload.get("dept")
            or val.get("deptLabel")
            or payload.get("deptLabel")
            or val.get("deptKey")
            or payload.get("deptKey")
            or val.get("dept_key")
            or payload.get("dept_key")
            or val.get("domain")
            or payload.get("domain")
            or val.get("category")
            or payload.get("category")
        )
        if dept_val:
            s_dept = str(dept_val).strip().lower()
            if s_dept in FOLDER_TO_RESOURCE:
                return FOLDER_TO_RESOURCE[s_dept]
            for canonical in CANONICAL_RESOURCE_TYPES:
                if canonical.lower() == s_dept:
                    return canonical
            if any(k in s_dept for k in ["legal", "pháp chế", "phap che", "cuad", "hợp đồng", "contract"]) or re.search(r"(?<![a-z0-9])nda(?![a-z0-9])", s_dept):
                return "LEGAL"
            if any(k in s_dept for k in ["sales", "kinh doanh", "kinh_doanh", "bán hàng", "ban hang", "order", "sản phẩm", "product", "hàng hóa", "khách hàng", "customer"]) or re.search(r"(?<![a-z0-9])crm(?![a-z0-9])", s_dept):
                return "SALES"
            if any(k in s_dept for k in ["accounting", "procurement", "kế toán", "ke toan", "thu mua", "thu_mua", "hóa đơn", "invoice", "công nợ", "vendor"]):
                return "ACCOUNTING_PROCUREMENT"
            if any(k in s_dept for k in ["công nghệ", "cong nghe", "cntt", "secops"]) or re.search(r"(?<![a-z0-9])it(?![a-z0-9])", s_dept):
                return "IT"
            if any(k in s_dept for k in ["r&d", "nghiên cứu", "nghien cuu"]) or re.search(r"(?<![a-z0-9])rnd(?![a-z0-9])", s_dept):
                return "RND"

        # Check storage path
        path = (
            val.get("storage_path")
            or payload.get("storage_path")
            or val.get("storagePath")
            or payload.get("storagePath")
            or val.get("file")
            or payload.get("file")
            or val.get("source_file")
            or payload.get("source_file")
            or ""
        ).strip().lower()
        for f, res in FOLDER_TO_RESOURCE.items():
            if f"/data/{f}" in path or f"\\data\\{f}" in path or f"/{f}/" in path or f"\\{f}\\" in path:
                return res

        # If department and storage path are missing, FAIL-CLOSED (do not guess from filename)
        return "UNKNOWN"

    s = str(val or "").strip()
    if not s:
        return "UNKNOWN"

    s_upper = s.upper()
    if s_upper in CANONICAL_RESOURCE_TYPES:
        return s_upper

    s_lower = s.lower()
    if any(k in s_lower for k in ["legal", "pháp chế", "phap che", "cuad", "hợp đồng", "contract"]) or re.search(r"(?<![a-z0-9])nda(?![a-z0-9])", s_lower):
        return "LEGAL"
    if any(k in s_lower for k in ["sales", "kinh doanh", "kinh_doanh", "bán hàng", "ban hang", "order", "sản phẩm", "product", "hàng hóa", "khách hàng", "customer"]) or re.search(r"(?<![a-z0-9])crm(?![a-z0-9])", s_lower):
        return "SALES"
    if any(k in s_lower for k in ["accounting", "procurement", "kế toán", "ke toan", "thu mua", "thu_mua", "hóa đơn", "invoice", "công nợ", "vendor"]):
        return "ACCOUNTING_PROCUREMENT"
    if any(k in s_lower for k in ["công nghệ", "cong nghe", "cntt", "secops"]) or re.search(r"(?<![a-z0-9])it(?![a-z0-9])", s_lower):
        return "IT"
    if any(k in s_lower for k in ["r&d", "nghiên cứu", "nghien cuu"]) or re.search(r"(?<![a-z0-9])rnd(?![a-z0-9])", s_lower):
        return "RND"
    return "UNKNOWN"


def check_data_scope_permission(query: str, role: str, scope: Optional[Any] = None) -> Tuple[bool, Optional[str]]:
    """
    Kiểm tra xem câu hỏi hoặc truy vấn của người dùng có vi phạm phạm vi dữ liệu RBAC không.
    Kiểm tra cả từ khóa cấm (HR payroll) và quyền truy vấn các phòng ban theo Admin Matrix.
    """
    clean_role = (role or "").strip().lower()
    clean_query = (query or "").lower()

    # 1. Check HR / Payroll restricted keywords
    if not (is_privileged_role(clean_role) or clean_role == ROLE_MANAGER):
        for pattern in STANDARD_RESTRICTED_KEYWORDS:
            if re.search(pattern, clean_query, re.IGNORECASE):
                return False, (
                    "Theo chính sách phân quyền dữ liệu RBAC (Quy tắc BR-02 / US19), tài khoản Standard User "
                    "(Chuyên viên Kinh doanh) chỉ có quyền tra cứu trong phạm vi Dữ liệu Kinh doanh (Khách hàng, "
                    "Đơn hàng, Danh mục sản phẩm và Hợp đồng thương mại liên quan). Dữ liệu nhân sự / tiền lương "
                    "thuộc phạm vi bảo mật của phòng Nhân sự (HR) và Ban Giám Đốc."
                )

    # 2. Check Admin RBAC Matrix resource permissions if scope provided
    if scope and getattr(scope, "allowed_resources", None) and not getattr(scope, "is_unrestricted", False):
        allowed_res = scope.allowed_resources
        # Check Legal / CUAD contracts
        if "LEGAL" not in allowed_res:
            legal_keywords = [
                r"\bcuad\b", r"\bhợp đồng\b", r"\bcontract\b", r"\bđiều khoản\b", r"\bclause\b",
                r"\bnda\b", r"\bthỏa thuận bảo mật\b", r"\bpháp chế\b", r"\blegal\b",
                r"\bliability\b", r"\bindemnif\b", r"\btermination\b", r"\bgoverning law\b"
            ]
            if any(re.search(pat, clean_query) for pat in legal_keywords):
                return False, (
                    "Theo ma trận phân quyền của Quản trị viên (Admin RBAC Matrix), vai trò của bạn "
                    "chưa được cấp quyền truy vấn hoặc tra cứu tài liệu thuộc phạm vi Pháp chế / Hợp đồng CUAD (LEGAL)."
                )

        # Check Accounting / Procurement
        if "ACCOUNTING_PROCUREMENT" not in allowed_res:
            acct_keywords = [
                r"\bkế toán\b", r"\bthu mua\b", r"\bhóa đơn\b", r"\bprocurement\b",
                r"\baccounting\b", r"\bnhà cung cấp\b", r"\bvendor\b", r"\bcông nợ\b",
                r"\bledger\b", r"\bpurchase\s*order\b"
            ]
            if any(re.search(pat, clean_query) for pat in acct_keywords):
                return False, (
                    "Theo ma trận phân quyền của Quản trị viên (Admin RBAC Matrix), vai trò của bạn "
                    "chưa được cấp quyền truy vấn tài liệu thuộc phạm vi Kế toán / Thu mua (ACCOUNTING_PROCUREMENT)."
                )

    return True, None


def normalize_role_key(role: Optional[str]) -> str:
    r = (role or "").strip().lower()
    if r in ["admin", "it", "itadmin", "secops", "it_admin"]:
        return ROLE_ADMIN
    if r in ["ceo", "cfo", "lanhdao", "exec", "executive"]:
        return ROLE_EXECUTIVE
    if r in ["manager", "mgr", "tp", "lead", "truongphong", "knowledge_manager", "knowledge_mgr"]:
        return ROLE_MANAGER
    return ROLE_STANDARD


def filter_graph_entities_by_scope(
    entities: List[Dict[str, Any]],
    role: str,
    scope: Optional[Any] = None
) -> List[Dict[str, Any]]:
    """
    Lọc danh sách các node thực thể Neo4j trả về tuân thủ RBAC, Department Scope và Data Classification.
    Fail-closed khi thiếu metadata phòng ban/phân loại trên các thực thể tài liệu/hợp đồng nhạy cảm.
    """
    canonical_role = normalize_role_key(role)
    if (scope and getattr(scope, "is_unrestricted", False)) or is_privileged_role(canonical_role):
        return entities

    allowed_labels = ALLOWED_ENTITY_LABELS.get(canonical_role, ALLOWED_ENTITY_LABELS[ROLE_STANDARD])

    if scope and getattr(scope, "allowed_resources", None):
        allowed_res = set(scope.allowed_resources)
    else:
        allowed_depts = ROLE_DEPARTMENT_SCOPE.get(canonical_role, ROLE_DEPARTMENT_SCOPE[ROLE_STANDARD])
        if "ALL" in allowed_depts:
            return entities
        allowed_res = {FOLDER_TO_RESOURCE.get(d.lower(), d.upper()) for d in allowed_depts if d.lower() in FOLDER_TO_RESOURCE}
        if canonical_role == ROLE_STANDARD:
            allowed_res = {"SALES", "RND"}

    filtered = []
    for ent in entities:
        # 0. Exclude failed or invalid staging journal nodes (Task 2 fail-closed)
        if ent.get("status") == "FAILED" or ent.get("op_stage") == "TERMINAL_FAILED":
            continue

        labels = ent.get("_labels") or []
        if isinstance(labels, str):
            labels = [labels]

        # 1. Label exclusions
        if "Employee" in labels and canonical_role in [ROLE_STANDARD, ROLE_MANAGER]:
            continue
        if any(l in ["Vendor", "Company"] for l in labels) and canonical_role == ROLE_STANDARD:
            continue
        if labels and not any(l in allowed_labels for l in labels):
            continue

        # 2. Classification check (Fail-closed)
        classification = str(
            ent.get("classification")
            or ent.get("classification_level")
            or ent.get("security_level")
            or ""
        ).strip().upper()

        allowed_cls = getattr(scope, "allowed_classifications", None) if scope else None
        if not allowed_cls:
            if canonical_role in [ROLE_EXECUTIVE, ROLE_MANAGER]:
                allowed_cls = {"PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"}
            else:
                allowed_cls = {"PUBLIC", "INTERNAL"}

        is_doc_entity = any(l in ["Document", "Contract", "Clause", "File"] for l in labels)
        if classification:
            if classification not in allowed_cls:
                continue
        elif is_doc_entity:
            continue

        if classification == "PUBLIC":
            filtered.append(ent)
            continue

        # 3. Department / Resource Type check (Fail-closed)
        is_doc_entity = any(l in ["Document", "Contract", "Clause", "File"] for l in labels)
        node_dept = (
            ent.get("department")
            or ent.get("dept")
            or ent.get("deptKey")
            or ent.get("dept_key")
            or ent.get("domain")
            or ""
        )
        storage_path = ent.get("storagePath") or ent.get("storage_path") or ""

        # Sensitive document/clause/storage nodes missing department must fail-closed (chặn node chỉ có storagePath mà thiếu department)
        if (is_doc_entity or storage_path) and not node_dept:
            continue

        res_type = resolve_resource_type(ent)
        if not res_type or res_type == "UNKNOWN":
            continue

        if res_type in allowed_res:
            filtered.append(ent)

    return filtered


def filter_graph_data_by_scope(
    nodes: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    role: str,
    scope: Optional[Any] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Lọc cả node và quan hệ Neo4j theo phân quyền RBAC của role (loại bỏ cạnh treo)."""
    filtered_nodes = filter_graph_entities_by_scope(nodes, role, scope=scope)
    allowed_ids = {n["_id"] for n in filtered_nodes if "_id" in n}
    filtered_rels = []
    for r in relationships:
        src = r.get("source")
        tgt = r.get("target")
        src_id = src.get("id") or src.get("_id") if isinstance(src, dict) else src
        tgt_id = tgt.get("id") or tgt.get("_id") if isinstance(tgt, dict) else tgt
        if src_id in allowed_ids and tgt_id in allowed_ids:
            filtered_rels.append(r)
    return filtered_nodes, filtered_rels


def filter_label_counts_by_scope(label_counts: Dict[str, int], role: str) -> Dict[str, int]:
    """Lọc danh sách đếm taxonomy hiển thị trên filter bar theo vai trò."""
    canonical_role = normalize_role_key(role)
    if is_privileged_role(canonical_role):
        return label_counts
    allowed = ALLOWED_ENTITY_LABELS.get(canonical_role, ALLOWED_ENTITY_LABELS[ROLE_STANDARD])
    return {k: v for k, v in (label_counts or {}).items() if k in allowed}


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


# ── Canonical Department Mapping ─────────────────────────────────────────────
DEPT_CANONICAL: Dict[str, str] = {
    # Legal / Pháp chế
    "pháp chế": "legal",
    "legal": "legal",
    "pháp chế (legal)": "legal",
    "phap che": "legal",
    "pháp chế & r&d": "legal",
    "phòng pháp chế": "legal",
    "phòng pháp chế & hợp đồng": "legal",
    "cuad": "legal",
    # Sales / Kinh doanh
    "kinh doanh": "sales",
    "sales": "sales",
    "kinh doanh (sales)": "sales",
    "bán hàng": "sales",
    "bán hàng (sales)": "sales",
    "phòng kinh doanh": "sales",
    "phòng kinh doanh & phát triển thị trường": "sales",
    "phòng kinh doanh & khách hàng doanh nghiệp": "sales",
    "khối kinh doanh & vận hành": "sales",
    "khối quản lý phòng ban & bộ phận": "sales",
    "khối quản lý phòng ban": "sales",
    "quản lý phòng ban": "sales",
    # IT / Công nghệ thông tin
    "công nghệ / it": "it",
    "công nghệ thông tin": "it",
    "it": "it",
    "cntt": "it",
    "phòng cntt": "it",
    "khối công nghệ, dữ liệu & quản trị tri thức": "it",
    "it_admin": "it",
    # Operations / Vận hành
    "vận hành": "operations",
    "vận hành & nghiệp vụ": "operations",
    "vận hành & sản phẩm": "operations",
    "operations": "operations",
    "ops": "operations",
    # R&D
    "r&d": "rnd",
    "rnd": "rnd",
    "nghiên cứu": "rnd",
    # Accounting / Tài chính / Thu mua
    "kế toán": "accounting",
    "accounting": "accounting",
    "accounting_procurement": "accounting",
    "kế toán / thu mua": "accounting",
    "thu mua": "accounting",
    "phòng kế toán & tài chính": "accounting",
    # HR / Nhân sự
    "nhân sự": "hr",
    "hr": "hr",
    "phòng nhân sự": "hr",
    # Executive & Across Departments
    "ban giám đốc": "executive",
    "executive": "executive",
    "ban lãnh đạo": "executive",
    "ban giám đốc & hội đồng quản trị": "executive",
    "quản lý phòng ban": "all_departments",
    "khối quản lý phòng ban & bộ phận": "all_departments",
    "all": "all",
}

# Cross-department permitted scopes for each department
DEPT_ALLOWED_SCOPES: Dict[str, Set[str]] = {
    "executive": {"*"},  # Full enterprise access (BR-05)
    "admin": {"*"},      # Full administrative access (BR-03)
    "all_departments": {"legal", "sales", "operations", "rnd", "it", "accounting", "hr"},
    "legal": {"legal", "rnd"},
    "sales": {"sales", "operations"},
    "operations": {"operations", "rnd", "sales"},
    "rnd": {"rnd", "operations", "legal"},
    "it": {"it", "hr", "operations"},
    "accounting": {"accounting", "sales"},
    "hr": {"hr", "it"},
}

USER_ALIASES: Dict[str, str] = {
    "ceo": "exec",
    "executive": "exec",
    "huong.tran@graphmind.ai": "executive@graphmind.ai",
    "knowledge_manager": "manager",
    "it_admin": "admin",
    "sales_ops": "ops",
    "sales": "ops",
    "sales@graphmind.ai": "ops@graphmind.ai",
}


def normalize_dept(dept: Optional[str]) -> str:
    """Normalize raw department string into canonical department key. Fail-closed on empty/unknown."""
    if not dept:
        return "unknown"
    d = dept.strip().lower()
    return DEPT_CANONICAL.get(d, "unknown")


@dataclass
class ScopeContext:
    user: User
    role: str
    is_unrestricted: bool
    department_name: str
    canonical_dept: str
    allowed_depts: Set[str] = field(default_factory=set)
    allowed_resources: Set[str] = field(default_factory=set)

    @property
    def department(self) -> str:
        return self.canonical_dept

    def is_department_allowed(self, target_dept: Optional[str]) -> bool:
        """Check if access to target department data is permitted under Admin RBAC (fail-closed)."""
        if not target_dept or str(target_dept).upper() in ("ALL", "ALL_DEPARTMENTS"):
            return self.is_unrestricted and "*" in self.allowed_depts
        if self.is_unrestricted and "*" in self.allowed_depts:
            return True
        d_lower = target_dept.strip().lower()
        if d_lower in self.allowed_depts or "*" in self.allowed_depts:
            return True
        norm_d = normalize_dept(target_dept)
        if norm_d in self.allowed_depts:
            return True
        res_type = resolve_resource_type(target_dept)
        if self.allowed_resources:
            return res_type in self.allowed_resources
        return self.is_unrestricted

    def is_document_allowed(self, doc_id: str, target_dept: Optional[str] = None, doc_dict: Optional[Dict[str, Any]] = None) -> bool:
        """Check if specific document or dataset is allowed for current user."""
        if self.is_unrestricted and "*" in self.allowed_depts:
            return True
        # Public or general datasets
        if doc_id in ("AW_CATEGORIES", "AW_PRODUCTS") and any(r in self.allowed_resources for r in ["SALES", "RND"]):
            return True
        res_type = resolve_resource_type(doc_dict if doc_dict else (target_dept or doc_id))
        if self.allowed_resources:
            return res_type in self.allowed_resources
        return self.is_unrestricted

    def assert_document_access(self, doc_id: str, target_dept: Optional[str], doc_dict: Optional[Dict[str, Any]] = None):
        """Raises 403 Forbidden if document is outside the user's Department Scope (BR-02/RBAC)."""
        if not self.is_document_allowed(doc_id, target_dept, doc_dict):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Theo phân quyền của Quản trị viên (Admin RBAC Matrix): Truy cập bị từ chối. "
                    f"Tài khoản [{self.user.username}] với vai trò [{self.role}] "
                    f"không có quyền truy cập tài liệu [{doc_id}] thuộc phạm vi [{target_dept}]."
                ),
            )

    def assert_executive_access(self, feature_name: str = "Chức năng này"):
        """Raises 403 Forbidden if user is not Executive or Admin (BR-05)."""
        if not self.is_unrestricted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Theo quy định BR-05: {feature_name} chỉ dành riêng cho Ban Lãnh Đạo (Executive) hoặc Quản trị viên. "
                    f"Vai trò hiện tại [{self.role}] không có quyền truy cập."
                ),
            )

    def filter_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filters list of documents strictly according to user's permitted Resource Types."""
        if self.is_unrestricted and "*" in self.allowed_depts and not self.allowed_resources:
            return documents
        return [
            doc for doc in documents
            if self.is_document_allowed(doc.get("id", "") or doc.get("raw_id", ""), doc.get("dept") or doc.get("deptLabel"), doc_dict=doc)
        ]

    def filter_citations(self, citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        SRS FR32 (BR-02): 'Citations must not expose data out of scope.
        Filter citations to only allowed resource types.'
        """
        if self.is_unrestricted and "*" in self.allowed_depts and not self.allowed_resources:
            return citations

        filtered = []
        for c in citations:
            res_type = resolve_resource_type(c)
            if not self.allowed_resources or res_type in self.allowed_resources:
                filtered.append(c)
            else:
                redacted = dict(c)
                redacted["restricted"] = True
                redacted["text"] = f"[DỮ LIỆU ĐÃ ẨN]: Trích dẫn tài liệu thuộc phạm vi {res_type} bị giới hạn bởi phân quyền quản trị (Admin RBAC)."
                redacted["match"] = "RESTRICTED (RBAC)"
                filtered.append(redacted)

        return filtered


@dataclass
class ACLFilter:
    scope: ScopeContext
    is_unrestricted: bool
    allowed_depts: Set[str]
    allowed_classifications: Set[str]
    can_view_sensitive: bool
    qdrant_filter: Optional[Dict[str, Any]] = None
    cypher_where: str = "1=1"
    shadow_mode: bool = False
    shadow_blocked_events: List[Dict[str, Any]] = field(default_factory=list)

    def _block_or_shadow(self, reason: str, payload: Dict[str, Any]) -> bool:
        """Helper to enforce hard block and record shadow blocked event if shadow mode active."""
        if self.shadow_mode:
            actor = getattr(self.scope.user, "user_id", None) if self.scope and self.scope.user else None
            res_id = (
                payload.get("logical_chunk_id")
                or payload.get("id")
                or payload.get("doc_id")
                or payload.get("document_id")
                or payload.get("source_file")
                or payload.get("name")
                or "unknown"
            )
            self.shadow_blocked_events.append({
                "actor_id": actor,
                "resource_id": str(res_id),
                "resource_type": "DOCUMENT_CHUNK",
                "reason": reason,
                "payload": payload,
            })
        return False  # Strict fail-closed: NEVER loosen main path, even in shadow mode!

    def matches_payload(self, payload: Dict[str, Any]) -> bool:
        """Evaluates whether an arbitrary node, document, or chunk payload passes this ACL filter (fail-closed)."""
        if self.is_unrestricted:
            return True

        if not isinstance(payload, dict):
            return False

        # 1. Classification check (strict fail-closed allowlist)
        raw_cls = payload.get("classification") or payload.get("classification_level")
        if not raw_cls:
            return self._block_or_shadow("Missing classification metadata (fail-closed)", payload)

        classification = str(raw_cls).strip().upper()
        if classification not in self.allowed_classifications:
            return self._block_or_shadow(
                f"Classification '{classification}' not allowed for role {self.scope.role} (allowed: {self.allowed_classifications})",
                payload
            )

        if classification == "PUBLIC":
            return True

        # 2. ERP structured datasets (SalesOrder, Customer -> SALES; Vendor, PO -> ACCOUNTING_PROCUREMENT)
        if payload.get("source") == "adventureworks" or "entity_type" in payload:
            e_type = str(payload.get("entity_type", ""))
            if e_type in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail"]:
                if "ACCOUNTING_PROCUREMENT" not in self.scope.allowed_resources:
                    return self._block_or_shadow(f"ERP entity {e_type} requires ACCOUNTING_PROCUREMENT", payload)
                return True
            if ("SALES" not in self.scope.allowed_resources) and ("RND" not in self.scope.allowed_resources):
                return self._block_or_shadow(f"ERP entity {e_type} requires SALES or RND", payload)
            return True

        # 3. Department matching (fail-closed using canonical keys)
        raw_dept = (
            payload.get("department_key")
            or payload.get("dept_key")
            or payload.get("deptKey")
            or payload.get("department_id")
            or payload.get("department")
            or payload.get("dept")
            or payload.get("domain")
        )

        if not raw_dept:
            spath = payload.get("storage_path") or payload.get("storagePath") or payload.get("file") or payload.get("source_file")
            if spath:
                from app.core.central_storage import resolve_canonical_dept
                raw_dept = resolve_canonical_dept(str(spath))
                if raw_dept == "unknown":
                    return self._block_or_shadow("Unknown department from storage path", payload)
            else:
                return self._block_or_shadow("Missing department metadata (fail-closed)", payload)

        canon_dept = normalize_dept(str(raw_dept))
        if canon_dept == "unknown":
            return self._block_or_shadow(f"Unrecognized department '{raw_dept}'", payload)

        # Common and public resources are accessible across all departments
        if canon_dept in ("common", "public", "general"):
            return True

        if canon_dept not in self.allowed_depts and not (self.is_unrestricted and "*" in self.allowed_depts):
            return self._block_or_shadow(
                f"Department '{canon_dept}' not in user allowed departments {self.allowed_depts}",
                payload
            )

        return True


def build_acl_filter(scope: ScopeContext, shadow_mode: Optional[bool] = None) -> ACLFilter:
    """
    Constructs centralized, multi-engine ACL filters for Qdrant, Neo4j, and in-memory evaluation.
    Enforces Least Privilege and Department Isolation (fail-closed).
    Supports ACL_SHADOW_MODE for audit-only shadow execution without dropping chunks.
    """
    if shadow_mode is None:
        try:
            from app.core.config import settings
            shadow_mode = bool(getattr(settings, "ACL_SHADOW_MODE", False))
        except Exception:
            shadow_mode = False

    if scope.is_unrestricted and "*" in scope.allowed_depts:
        return ACLFilter(
            scope=scope,
            is_unrestricted=True,
            allowed_depts={"*"},
            allowed_classifications={"PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"},
            can_view_sensitive=True,
            qdrant_filter=None,
            cypher_where="1=1",
            shadow_mode=shadow_mode,
        )

    # Determine if user has can_view_sensitive permission (Least Privilege: Executive and Managers only)
    can_view_sensitive = (
        scope.is_unrestricted
        or scope.role.upper() in ("EXECUTIVE", "ADMIN", "DEPARTMENT_MANAGER", "KNOWLEDGE_MANAGER", "MANAGER")
    )
    if scope.role.upper() in ("STANDARD", "STANDARD_USER"):
        can_view_sensitive = False

    allowed_classifications = {"PUBLIC", "INTERNAL"}
    if can_view_sensitive:
        allowed_classifications.add("RESTRICTED")
        allowed_classifications.add("CONFIDENTIAL")

    # Task 3: Filter using standardized canonical department_key / department_id
    # Never match on unstructured localized display strings!
    canon_keys: Set[str] = set()
    for d in scope.allowed_depts:
        k = normalize_dept(d)
        if k != "unknown":
            canon_keys.add(k)
        else:
            canon_keys.add(d.strip().lower())

    # Confirm COMMON and PUBLIC are in allowlist of all users
    canon_keys.add("common")
    canon_keys.add("public")
    canon_keys.add("general")

    # Strict positive allowlist for Qdrant (fail-closed, canonical key)
    must_conditions = [
        {"key": "department_key", "match": {"any": sorted(canon_keys)}},
        {"key": "classification", "match": {"any": sorted(allowed_classifications)}},
    ]

    qdrant_filter: Dict[str, Any] = {
        "must": must_conditions,
    }

    cypher_dept_list = [f"'{k}'" for k in sorted(canon_keys)]
    cypher_cls_list = [f"'{c.upper()}'" for c in sorted(allowed_classifications)]
    cypher_where = f"toLower(coalesce(n.deptKey, n.department_id, n.domain, '')) IN [{', '.join(cypher_dept_list)}] AND toUpper(n.classification) IN [{', '.join(cypher_cls_list)}]"

    # NOTE: shadow_mode NEVER loosens qdrant_filter or cypher_where pre-filters.
    # Pre-filtering remains strictly enforcing; shadow events are recorded for in-memory checks.

    return ACLFilter(
        scope=scope,
        is_unrestricted=False,
        allowed_depts=scope.allowed_depts,
        allowed_classifications=allowed_classifications,
        can_view_sensitive=can_view_sensitive,
        qdrant_filter=qdrant_filter,
        cypher_where=cypher_where,
        shadow_mode=shadow_mode,
    )


async def record_acl_shadow_block(
    db: Any,
    *,
    actor_id: Optional[uuid.UUID],
    resource_type: str,
    resource_id: str,
    reason: str,
    query: Optional[str] = None
) -> None:
    """Records would-be blocked query or chunk in PostgreSQL audit_logs (action=ACL_SHADOW_BLOCKED)."""
    try:
        from app.db.postgres.models.audit_log import AuditLog
        entry = AuditLog(
            action="ACL_SHADOW_BLOCKED",
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id[:150] if resource_id else None,
            status="SHADOW_PERMITTED",
            detail=f"Shadow blocked: {reason} | query={query or ''}"[:500]
        )
        db.add(entry)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"[ACL Shadow] Failed to record shadow audit event: {e}")


# ── User Resolution Helper ───────────────────────────────────────────────────
async def get_request_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Unified strict resolver for requesting user:
    1. Validates JWT Bearer token
    2. Looks up user by sub in DB
    3. Verifies active and non-locked status
    Fail-closed: returns 401 if token is missing or invalid.
    Client-side spoofing headers (X-User-Id, X-User-Role, etc.) are strictly forbidden.
    """
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực tài khoản (Thiếu Bearer Token).",
        )

    try:
        payload = decode_access_token(auth_header.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )

    try:
        uid = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject không hợp lệ.",
        )

    res = await db.execute(
        select(User).where(
            User.user_id == uid,
            User.deleted_at.is_(None)
        )
    )
    u = res.scalar_one_or_none()

    if not u:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trong hệ thống.",
        )

    if not u.is_active or getattr(u, "status", "active") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa, liên hệ quản trị viên",
        )

    # Cập nhật Online (Throttled 2 phút)
    now = datetime.now(timezone.utc)
    if u.last_active_at is None or (now - u.last_active_at).total_seconds() > 120:
        u.last_active_at = now
        try:
            await db.commit()
        except Exception:
            pass

    return u


# ── Scope Context Dependency ─────────────────────────────────────────────────
async def get_user_scope(
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
) -> ScopeContext:
    """
    Computes effective ScopeContext strictly from database User and Granular RBAC Matrix.
    Client-side role/department header spoofing is strictly prohibited.
    """
    user_role = (user.role or "").strip()
    try:
        from app.modules.m6_admin_security.rbac_matrix_service import normalize_role_code
        role_code = normalize_role_code(user_role)
    except Exception:
        role_code = "STANDARD_USER"

    is_admin = role_code == "ADMIN" or getattr(user, "is_superuser", False)
    is_exec = role_code == "EXECUTIVE"
    # TODO(P4): Separate SoD for IT Admin vs Executive; Admin currently retains legacy unrestricted knowledge access.
    is_unrestricted = is_exec or is_admin

    # Resolve Department Name strictly from DB
    dept_name = None
    if getattr(user, "department_id", None):
        dept_res = await db.execute(
            text("SELECT name FROM departments WHERE department_id = :d_id"),
            {"d_id": user.department_id},
        )
        row = dept_res.fetchone()
        if row:
            dept_name = row[0]

    effective_dept = dept_name or ("Ban Giám Đốc" if is_exec else "Kinh doanh")
    canonical = normalize_dept(effective_dept)

    # Dynamically read policies from PostgreSQL knowledge_access_policies
    allowed_resources = set()
    try:
        from app.modules.m6_admin_security.rbac_matrix_model import KnowledgeAccessPolicy
        from app.modules.m6_admin_security.rbac_matrix_service import normalize_dept_code
        user_dept_code = normalize_dept_code(effective_dept)

        stmt = select(KnowledgeAccessPolicy).where(
            KnowledgeAccessPolicy.role_code == role_code,
            KnowledgeAccessPolicy.department_code.in_([user_dept_code, "ALL"]),
        )
        res = await db.execute(stmt)
        policies = res.scalars().all()
        if not policies:
            from app.modules.m6_admin_security.rbac_matrix_service import seed_default_matrix
            all_seeded = await seed_default_matrix(db)
            policies = [
                p for p in all_seeded
                if p.role_code == role_code and p.department_code in (user_dept_code, "ALL")
            ]

        dept_policies = [p for p in policies if p.department_code == user_dept_code]
        effective_policies = dept_policies if dept_policies else policies
        allowed_resources = {p.resource_type for p in effective_policies if p.can_query}

        if not allowed_resources and role_code == "STANDARD_USER":
            user_res = FOLDER_TO_RESOURCE.get(canonical)
            if user_res:
                allowed_resources = {user_res}
    except Exception as e:
        # Fallback strictly fail-closed based on user department
        if is_unrestricted:
            allowed_resources = set(CANONICAL_RESOURCE_TYPES)
        else:
            user_res = FOLDER_TO_RESOURCE.get(canonical)
            allowed_resources = {user_res} if user_res else set()

    allowed_depts = {RESOURCE_TO_FOLDER[r] for r in allowed_resources if r in RESOURCE_TO_FOLDER}
    if "accounting_procurement" in allowed_depts:
        allowed_depts.add("accounting")
    # Task 3: Standard user allowlist includes common/public/general
    allowed_depts.add("common")
    allowed_depts.add("public")
    allowed_depts.add("general")
    if is_unrestricted:
        allowed_depts.add("*")

    return ScopeContext(
        user=user,
        role=user_role,
        is_unrestricted=is_unrestricted,
        department_name=effective_dept,
        canonical_dept=canonical,
        allowed_depts=allowed_depts,
        allowed_resources=allowed_resources,
    )
