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
    """
    if isinstance(val, dict):
        # 0. Check ERP structured labels and types (Product, Customer, SalesOrder -> SALES; Vendor, PO -> ACCOUNTING_PROCUREMENT)
        labels = val.get("_labels") or []
        if isinstance(labels, str):
            labels = [labels]
        e_type = str(val.get("entity_type") or "")
        if any(l in ["Product", "ProductCategory", "ProductSubcategory", "Customer", "SalesOrder", "SalesOrderDetail"] for l in labels) or e_type in ["Product", "ProductCategory", "ProductSubcategory", "Customer", "SalesOrder", "SalesOrderDetail"]:
            return "SALES"
        if any(l in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail", "Store", "Supplier"] for l in labels) or e_type in ["Vendor", "PurchaseOrder", "PurchaseOrderDetail", "Store", "Supplier"]:
            return "ACCOUNTING_PROCUREMENT"
        if any(l in ["DocumentSummary", "SystemStats", "ContractPortfolio", "ComplianceReport", "CUAD"] for l in labels) or str(val.get("document_id", "")).startswith("SYSTEM-") or val.get("_id") in ["total-documents-summary", "portfolio-breakdown", "compliance-stats"]:
            return "SALES"

        dk = (val.get("deptKey") or val.get("dept_key") or "").strip().lower()
        if dk in FOLDER_TO_RESOURCE:
            return FOLDER_TO_RESOURCE[dk]
        path = (val.get("storage_path") or val.get("file") or val.get("source_file") or "").strip().lower()
        for f, res in FOLDER_TO_RESOURCE.items():
            if f"/data/{f}" in path or f"\\data\\{f}" in path or f"/{f}/" in path:
                return res
        val = (
            val.get("dept")
            or val.get("department")
            or val.get("deptLabel")
            or val.get("domain")
            or val.get("category")
            or val.get("name")
            or ""
        )

    s = str(val or "").strip()
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
    return "LEGAL"


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


# ── Canonical Department Mapping ─────────────────────────────────────────────
DEPT_CANONICAL: Dict[str, str] = {
    # Legal / Pháp chế
    "pháp chế": "legal",
    "legal": "legal",
    "pháp chế & r&d": "legal",
    "phòng pháp chế": "legal",
    "phòng pháp chế & hợp đồng": "legal",
    "cuad": "legal",
    # Sales / Kinh doanh
    "kinh doanh": "sales",
    "sales": "sales",
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
    "nghiên cứu": "rnd",
    # Accounting / Tài chính
    "kế toán": "accounting",
    "accounting": "accounting",
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
    """Normalize raw department string into canonical department key."""
    if not dept:
        return "all"
    d = dept.strip().lower()
    return DEPT_CANONICAL.get(d, d)


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
        """Check if access to target department data is permitted under Admin RBAC."""
        if not target_dept or str(target_dept).upper() in ("ALL", "ALL_DEPARTMENTS"):
            return True
        if self.is_unrestricted and "*" in self.allowed_depts:
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


# ── User Resolution Helper ───────────────────────────────────────────────────
async def get_request_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    x_user_dept: Optional[str] = Header(None),
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Unified resolver for requesting user:
    1. JWT Bearer token
    2. X-User-Id / Query user_id
    3. X-User-Email
    4. X-User-Name
    5. Default fallback to executive user
    """
    u = None

    # 1. Bearer Token
    if auth_header and auth_header.credentials:
        try:
            payload = decode_access_token(auth_header.credentials)
            if payload and "sub" in payload:
                uid = uuid.UUID(payload["sub"])
                res = await db.execute(select(User).where(User.user_id == uid))
                u = res.scalar_one_or_none()
        except Exception:
            pass

    # 2. X-User-Id / Query user_id
    if not u:
        uid_candidate = x_user_id or user_id
        if uid_candidate:
            try:
                uid = uuid.UUID(uid_candidate)
                res = await db.execute(select(User).where(User.user_id == uid))
                u = res.scalar_one_or_none()
            except (ValueError, TypeError):
                pass

    # 3. X-User-Email
    if not u and x_user_email:
        clean_email = x_user_email.strip().lower()
        clean_email = USER_ALIASES.get(clean_email, clean_email)
        res = await db.execute(select(User).where(User.email.ilike(clean_email)))
        u = res.scalar_one_or_none()

    # 4. X-User-Name
    if not u and x_user_name:
        clean_name = x_user_name.strip().lower()
        clean_name = USER_ALIASES.get(clean_name, clean_name)
        res = await db.execute(
            select(User).where(
                or_(
                    User.username.ilike(clean_name),
                    User.email.ilike(f"%{clean_name}%"),
                )
            )
        )
        u = res.scalar_one_or_none()

    # 5. Default fallback to first active user (exec)
    if not u:
        res = await db.execute(select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.asc()).limit(1))
        u = res.scalar_one_or_none()

    if not u:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa xác định được tài khoản người dùng.",
        )

    if u.deleted_at is not None:
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
    x_user_role: Optional[str] = Header(None),
    x_user_dept: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> ScopeContext:
    """
    Computes effective ScopeContext for current request dynamically reading Granular RBAC Matrix.
    """
    user_role = (x_user_role or user.role or "").strip()
    try:
        from app.modules.m6_admin_security.rbac_matrix_service import normalize_role_code
        role_code = normalize_role_code(user_role)
    except Exception:
        role_code = "STANDARD_USER"

    is_admin = role_code == "ADMIN" or (not x_user_role and getattr(user, "is_superuser", False))
    is_exec = role_code == "EXECUTIVE"
    is_unrestricted = is_admin or is_exec

    # Resolve Department Name
    dept_name = None
    if getattr(user, "department_id", None):
        dept_res = await db.execute(
            text("SELECT name FROM departments WHERE department_id = :d_id"),
            {"d_id": user.department_id},
        )
        row = dept_res.fetchone()
        if row:
            dept_name = row[0]

    if x_user_dept:
        try:
            x_user_dept = urllib.parse.unquote(x_user_dept)
        except Exception:
            pass

    effective_dept = x_user_dept or dept_name or "Ban Giám Đốc"
    canonical = normalize_dept(effective_dept)

    # Dynamically read policies from PostgreSQL knowledge_access_policies
    allowed_resources = set()
    try:
        from app.modules.m6_admin_security.rbac_matrix_model import KnowledgeAccessPolicy
        stmt = select(KnowledgeAccessPolicy).where(
            KnowledgeAccessPolicy.role_code == role_code
        )
        res = await db.execute(stmt)
        policies = res.scalars().all()
        if not policies:
            from app.modules.m6_admin_security.rbac_matrix_service import seed_default_matrix
            policies = await seed_default_matrix(db)
            policies = [p for p in policies if p.role_code == role_code]

        allowed_resources = {p.resource_type for p in policies if p.can_query}
    except Exception as e:
        # Fallback to standard defaults
        if is_unrestricted:
            allowed_resources = set(CANONICAL_RESOURCE_TYPES)
        elif role_code == "DEPARTMENT_MANAGER":
            allowed_resources = {"SALES", "ACCOUNTING_PROCUREMENT", "IT", "RND"}
        else:
            allowed_resources = {"SALES", "IT", "RND"}

    allowed_depts = {RESOURCE_TO_FOLDER[r] for r in allowed_resources if r in RESOURCE_TO_FOLDER}
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
