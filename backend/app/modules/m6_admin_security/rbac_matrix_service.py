"""
Service xử lý nghiệp vụ Ma trận Phân quyền Tri thức chi tiết (Granular RBAC) - PB02
"""
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.models.user import User
from app.modules.m6_admin_security.rbac_matrix_model import KnowledgeAccessPolicy
from app.modules.m6_admin_security.rbac_matrix_schema import (
    RESOURCE_TYPES,
    PolicyCellUpdate,
    UserKnowledgePermissionsResponse,
)
from app.modules.m6_admin_security.audit_service import log_action


def normalize_role_code(role: str) -> str:
    r = (role or "").strip().lower()
    if r in ("admin", "it_admin", "administrator"):
        return "ADMIN"
    if r in ("executive", "exec", "lanh_dao", "leadership"):
        return "EXECUTIVE"
    if r in ("department_manager", "manager", "quan_ly"):
        return "DEPARTMENT_MANAGER"
    return "STANDARD_USER"


def normalize_dept_code(dept: Optional[str]) -> str:
    d = (dept or "").strip().upper()
    if not d or d in ("ALL", "TOÀN CÔNG TY", "TOAN_CONG_TY"):
        return "ALL"
    if "KINH DOANH" in d or "SALES" in d:
        return "SALES"
    if "KẾ TOÁN" in d or "KE TOAN" in d or "ACCOUNTING" in d:
        return "ACCOUNTING"
    if "NHÂN SỰ" in d or "NHAN SU" in d or "HR" in d:
        return "HR"
    if "PHÁP LÝ" in d or "PHAP LY" in d or "PHÁP CHẾ" in d or "LEGAL" in d:
        return "LEGAL"
    if "IT" in d or "CÔNG NGHỆ" in d or "R&D" in d:
        return "IT"
    return d


async def ensure_table_created(db: AsyncSession) -> None:
    """Đảm bảo bảng knowledge_access_policies đã tồn tại trong PostgreSQL."""
    from sqlalchemy import text
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS knowledge_access_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_code VARCHAR(50) NOT NULL,
        department_code VARCHAR(50) NOT NULL DEFAULT 'ALL',
        resource_type VARCHAR(50) NOT NULL,
        can_query BOOLEAN NOT NULL DEFAULT FALSE,
        can_view_citation BOOLEAN NOT NULL DEFAULT FALSE,
        can_edit BOOLEAN NOT NULL DEFAULT FALSE,
        can_view_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
        data_scope VARCHAR(50) NOT NULL DEFAULT 'NONE',
        updated_by UUID NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_role_dept_resource_policy UNIQUE (role_code, department_code, resource_type)
    );
    """
    await db.execute(text(create_table_sql))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_kap_role_dept ON knowledge_access_policies (role_code, department_code);"))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_kap_resource ON knowledge_access_policies (resource_type);"))
    await db.commit()


async def seed_default_matrix(db: AsyncSession, admin_id: Optional[uuid.UUID] = None) -> List[KnowledgeAccessPolicy]:
    """Khởi tạo toàn bộ ma trận phân quyền mặc định theo đặc tả nghiệp vụ PB02."""
    await ensure_table_created(db)
    
    # Xóa dữ liệu cũ nếu đang reset
    await db.execute(delete(KnowledgeAccessPolicy))
    await db.commit()

    policies: List[KnowledgeAccessPolicy] = []

    # 1. Admin (dept ALL)
    for res in RESOURCE_TYPES:
        policies.append(
            KnowledgeAccessPolicy(
                role_code="ADMIN",
                department_code="ALL",
                resource_type=res,
                can_query=True,
                can_view_citation=True,
                can_edit=True,
                can_view_sensitive=True,
                data_scope="ALL_DEPARTMENTS",
                updated_by=admin_id,
            )
        )

    # 2. Executive (dept ALL)
    for res in RESOURCE_TYPES:
        policies.append(
            KnowledgeAccessPolicy(
                role_code="EXECUTIVE",
                department_code="ALL",
                resource_type=res,
                can_query=True,
                can_view_citation=True,
                can_edit=False,
                can_view_sensitive=True,
                data_scope="ALL_DEPARTMENTS",
                updated_by=admin_id,
            )
        )

    # 3. Department Manager (dept ALL - phạm vi phòng mình)
    for res in RESOURCE_TYPES:
        is_sop = (res == "SOP_WIKI")
        policies.append(
            KnowledgeAccessPolicy(
                role_code="DEPARTMENT_MANAGER",
                department_code="ALL",
                resource_type=res,
                can_query=True,
                can_view_citation=True,
                can_edit=is_sop,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT",
                updated_by=admin_id,
            )
        )

    # 4. Standard User theo từng phòng ban:
    # 4.1 SALES
    sales_allowed = {"CUSTOMER", "SALES_ORDER", "PRODUCT", "SOP_WIKI"}
    for res in RESOURCE_TYPES:
        allowed = res in sales_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="SALES",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=False,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    # 4.2 ACCOUNTING
    acc_allowed = {"CUSTOMER", "SALES_ORDER", "PRODUCT", "VENDOR", "CONTRACT", "CLAUSE", "SOP_WIKI"}
    for res in RESOURCE_TYPES:
        allowed = res in acc_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="ACCOUNTING",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=False,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    # 4.3 LEGAL
    legal_allowed = {"CUSTOMER", "CONTRACT", "CLAUSE", "SOP_WIKI"}
    for res in RESOURCE_TYPES:
        allowed = res in legal_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="LEGAL",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=False,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    # 4.4 HR
    hr_allowed = {"EMPLOYEE", "SOP_WIKI"}
    for res in RESOURCE_TYPES:
        allowed = res in hr_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="HR",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=False,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    # 4.5 IT
    it_allowed = {"PRODUCT", "SOP_WIKI"}
    for res in RESOURCE_TYPES:
        allowed = res in it_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="IT",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=False,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    db.add_all(policies)
    await db.commit()
    return policies


async def get_all_policies(db: AsyncSession, auto_seed: bool = True) -> List[KnowledgeAccessPolicy]:
    """Lấy danh sách tất cả policies. Tự động seed nếu bảng chưa có dữ liệu."""
    await ensure_table_created(db)
    result = await db.execute(select(KnowledgeAccessPolicy).order_by(
        KnowledgeAccessPolicy.role_code,
        KnowledgeAccessPolicy.department_code,
        KnowledgeAccessPolicy.resource_type
    ))
    rows = result.scalars().all()
    if not rows and auto_seed:
        return await seed_default_matrix(db)
    return list(rows)


async def bulk_update_policies(
    db: AsyncSession,
    updates: List[PolicyCellUpdate],
    admin: User,
) -> int:
    """Cập nhật hàng loạt ô ma trận trong 1 transaction và ghi Audit Log."""
    await ensure_table_created(db)
    updated_count = 0
    change_summaries = []

    for item in updates:
        # Tìm bản ghi tương ứng
        stmt = select(KnowledgeAccessPolicy).where(
            KnowledgeAccessPolicy.role_code == item.role_code,
            KnowledgeAccessPolicy.department_code == item.department_code,
            KnowledgeAccessPolicy.resource_type == item.resource_type,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        if existing:
            # Ghi nhận thay đổi
            old_val = f"query={existing.can_query},scope={existing.data_scope}"
            new_val = f"query={item.can_query},scope={item.data_scope}"
            if old_val != new_val or existing.can_edit != item.can_edit or existing.can_view_sensitive != item.can_view_sensitive:
                change_summaries.append(
                    f"{item.role_code}:{item.department_code}:{item.resource_type} [{old_val} -> {new_val}]"
                )
            existing.can_query = item.can_query
            existing.can_view_citation = item.can_view_citation
            existing.can_edit = item.can_edit
            existing.can_view_sensitive = item.can_view_sensitive
            existing.data_scope = item.data_scope
            existing.updated_by = admin.user_id
            updated_count += 1
        else:
            new_policy = KnowledgeAccessPolicy(
                role_code=item.role_code,
                department_code=item.department_code,
                resource_type=item.resource_type,
                can_query=item.can_query,
                can_view_citation=item.can_view_citation,
                can_edit=item.can_edit,
                can_view_sensitive=item.can_view_sensitive,
                data_scope=item.data_scope,
                updated_by=admin.user_id,
            )
            db.add(new_policy)
            updated_count += 1
            change_summaries.append(f"NEW {item.role_code}:{item.department_code}:{item.resource_type}")

    await db.commit()

    # Ghi nhận vào Nhật ký kiểm toán (AuditLog)
    detail_text = "; ".join(change_summaries[:10])
    if len(change_summaries) > 10:
        detail_text += f"... (+{len(change_summaries) - 10} thay đổi khác)"

    await log_action(
        db,
        action="RBAC_MATRIX_UPDATE",
        actor_id=admin.user_id,
        resource_type="KNOWLEDGE_ACCESS_POLICY",
        resource_id=f"bulk_{updated_count}_items",
        detail=f"Cập nhật {updated_count} ô ma trận quyền tri thức: {detail_text}",
    )
    await db.commit()
    return updated_count


async def reset_matrix(db: AsyncSession, admin: User) -> List[KnowledgeAccessPolicy]:
    """Khôi phục ma trận về cấu hình chuẩn mặc định và ghi Audit Log."""
    policies = await seed_default_matrix(db, admin_id=admin.user_id)
    await log_action(
        db,
        action="RBAC_MATRIX_RESET",
        actor_id=admin.user_id,
        resource_type="KNOWLEDGE_ACCESS_POLICY",
        resource_id="ALL",
        detail="Khôi phục toàn bộ Ma trận Phân quyền Tri thức về cấu hình chuẩn mặc định",
    )
    await db.commit()
    return policies


async def get_user_knowledge_permissions(user: User, db: AsyncSession) -> UserKnowledgePermissionsResponse:
    """
    Data Scope Resolver (Mục 6.2.2 tiền đề cho AI Copilot & Smart Search):
    Đọc quyền tri thức chi tiết của user dựa trên role & department của user trong DB.
    """
    await ensure_table_created(db)
    role_code = normalize_role_code(getattr(user, "role", "standard"))
    
    # Lấy tên phòng ban của user
    user_dept = "ALL"
    if hasattr(user, "department") and user.department:
        user_dept = normalize_dept_code(user.department)
    elif getattr(user, "department_id", None):
        # Có department_id -> truy vấn hoặc fallback
        user_dept = "SALES"  # Default SME sales department
    else:
        user_dept = "ALL" if role_code in ("ADMIN", "EXECUTIVE") else "SALES"

    # Truy vấn policy cho role và department
    # Ưu tiên department cụ thể, nếu không có thì lấy department ALL
    stmt = select(KnowledgeAccessPolicy).where(
        KnowledgeAccessPolicy.role_code == role_code,
        KnowledgeAccessPolicy.department_code.in_([user_dept, "ALL"])
    )
    result = await db.execute(stmt)
    policies = result.scalars().all()

    # Nhóm theo resource_type
    allowed_resources = []
    can_view_sensitive_any = False
    max_scope = "NONE"
    perms_by_resource = {}

    for p in policies:
        perms_by_resource[p.resource_type] = {
            "can_query": p.can_query,
            "can_view_citation": p.can_view_citation,
            "can_edit": p.can_edit,
            "can_view_sensitive": p.can_view_sensitive,
            "data_scope": p.data_scope,
        }
        if p.can_query:
            allowed_resources.append(p.resource_type)
        if p.can_view_sensitive:
            can_view_sensitive_any = True
        if p.data_scope == "ALL_DEPARTMENTS":
            max_scope = "ALL_DEPARTMENTS"
        elif p.data_scope == "OWN_DEPARTMENT" and max_scope != "ALL_DEPARTMENTS":
            max_scope = "OWN_DEPARTMENT"

    return UserKnowledgePermissionsResponse(
        user_id=user.user_id,
        role_code=role_code,
        department_code=user_dept,
        allowed_resources=allowed_resources,
        can_view_sensitive=can_view_sensitive_any,
        data_scope=max_scope,
        permissions_by_resource=perms_by_resource,
    )
