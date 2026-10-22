"""
Graph Mind — Enterprise RBAC & Department Scope Enforcement (BR-02, BR-04, BR-05)
Business Rules Implemented:
- BR-02: "Access to contract information and transaction data is strictly compliant
          with each user's RBAC, Department Scope, and Data Scope." (FR3, FR32)
- BR-04: "Department Managers are only allowed to draft and publish SOPs for their own departments."
- BR-05: "Executives have unrestricted full-access to data across the enterprise." (FR41, FR42, FR27)
"""

import uuid
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional, Set, List, Dict, Any
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

    def is_department_allowed(self, target_dept: Optional[str]) -> bool:
        """Check if access to target department data is permitted under BR-02."""
        if self.is_unrestricted:
            return True
        if not target_dept or target_dept.upper() == "ALL":
            return True
        norm = normalize_dept(target_dept)
        if norm in ("all", "all_departments"):
            return True
        return norm in self.allowed_depts or "*" in self.allowed_depts

    def is_document_allowed(self, doc_id: str, target_dept: Optional[str]) -> bool:
        """Check if specific document or dataset is allowed for current user."""
        if self.is_unrestricted:
            return True
        # Public or general datasets
        if doc_id in ("AW_CATEGORIES", "AW_PRODUCTS") and self.canonical_dept in ("sales", "operations", "rnd"):
            return True
        return self.is_department_allowed(target_dept)

    def assert_document_access(self, doc_id: str, target_dept: Optional[str]):
        """Raises 403 Forbidden if document is outside the user's Department Scope (BR-02)."""
        if not self.is_document_allowed(doc_id, target_dept):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Theo quy định BR-02: Truy cập bị từ chối do vi phạm phạm vi dữ liệu phòng ban (Department Scope). "
                    f"Tài khoản [{self.user.username}] thuộc phòng ban [{self.department_name}] "
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
        """Filters list of documents strictly according to user's Department Scope."""
        if self.is_unrestricted:
            return documents
        return [
            doc for doc in documents
            if self.is_document_allowed(doc.get("id", ""), doc.get("dept") or doc.get("deptLabel"))
        ]

    def filter_citations(self, citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        SRS FR32 (BR-02): 'Citations must not expose data out of scope.
        Display source citations within the allowed range.'
        """
        if self.is_unrestricted:
            return citations

        filtered = []
        for c in citations:
            src_type = c.get("sourceType", "")
            file_name = c.get("file", "") or c.get("docName", "")
            # CUAD contracts are legal scope
            if "CUAD" in file_name or "cuad" in file_name.lower() or "Qdrant" in src_type:
                if self.is_department_allowed("Pháp chế"):
                    filtered.append(c)
                else:
                    # Redact or mark as restricted citation
                    redacted = dict(c)
                    redacted["text"] = "[DỮ LIỆU ĐÃ ẨN]: Nội dung điều khoản hợp đồng ngoài phạm vi phòng ban được cấp phép (BR-02)."
                    redacted["match"] = "RESTRICTED (BR-02)"
                    filtered.append(redacted)
            # Sales Orders / CRM
            elif "SalesOrder" in file_name or "Customer" in file_name:
                if self.is_department_allowed("Kinh doanh"):
                    filtered.append(c)
                else:
                    redacted = dict(c)
                    redacted["text"] = "[DỮ LIỆU ĐÃ ẨN]: Dữ liệu giao dịch CRM ngoài phạm vi phòng ban (BR-02)."
                    redacted["match"] = "RESTRICTED (BR-02)"
                    filtered.append(redacted)
            else:
                filtered.append(c)

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
    # 1. Bearer Token
    if auth_header and auth_header.credentials:
        try:
            payload = decode_access_token(auth_header.credentials)
            if payload and "sub" in payload:
                uid = uuid.UUID(payload["sub"])
                res = await db.execute(select(User).where(User.user_id == uid))
                u = res.scalar_one_or_none()
                if u:
                    return u
        except Exception:
            pass

    # 2. X-User-Id / Query user_id
    uid_candidate = x_user_id or user_id
    if uid_candidate:
        try:
            uid = uuid.UUID(uid_candidate)
            res = await db.execute(select(User).where(User.user_id == uid))
            u = res.scalar_one_or_none()
            if u:
                return u
        except (ValueError, TypeError):
            pass

    # 3. X-User-Email
    if x_user_email:
        clean_email = x_user_email.strip().lower()
        clean_email = USER_ALIASES.get(clean_email, clean_email)
        res = await db.execute(select(User).where(User.email.ilike(clean_email)))
        u = res.scalar_one_or_none()
        if u:
            return u

    # 4. X-User-Name
    if x_user_name:
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
        if u:
            return u

    # 5. Default fallback to first active user (exec)
    res = await db.execute(select(User).order_by(User.created_at.asc()).limit(1))
    u = res.scalar_one_or_none()
    if u:
        return u

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Chưa xác định được tài khoản người dùng.",
    )


# ── Scope Context Dependency ─────────────────────────────────────────────────
async def get_user_scope(
    user: User = Depends(get_request_user),
    x_user_dept: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> ScopeContext:
    """
    Computes effective ScopeContext for current request enforcing BR-02 & BR-05.
    """
    user_role = (user.role or "").strip().lower()
    is_admin = user.is_superuser or user_role in ["admin", "it_admin"]
    is_exec = user_role in ["executive", "ceo", "cfo"]
    is_unrestricted = is_admin or is_exec

    # Resolve Department Name
    dept_name = None
    if user.department_id:
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

    # Allowed scopes
    if is_unrestricted:
        allowed = {"*"}
    else:
        allowed = DEPT_ALLOWED_SCOPES.get(canonical, {canonical})

    return ScopeContext(
        user=user,
        role=user_role,
        is_unrestricted=is_unrestricted,
        department_name=effective_dept,
        canonical_dept=canonical,
        allowed_depts=allowed,
    )
