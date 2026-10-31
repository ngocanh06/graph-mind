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
    if r in ("department_manager", "knowledge_manager", "manager", "quan_ly"):
        return "DEPARTMENT_MANAGER"
    return "STANDARD_USER"


def normalize_dept_code(dept: Optional[str]) -> str:
    d = (dept or "").strip().upper()
    if not d or d in ("ALL", "TOÀN CÔNG TY", "TOAN_CONG_TY"):
        return "ALL"
    if "KINH DOANH" in d or "SALES" in d:
        return "SALES"
    if "KẾ TOÁN" in d or "KE TOAN" in d or "THU MUA" in d or "ACCOUNTING" in d or "PROCUREMENT" in d:
        return "ACCOUNTING_PROCUREMENT"
    if "PHÁP LÝ" in d or "PHAP LY" in d or "PHÁP CHẾ" in d or "PHAP CHE" in d or "LEGAL" in d:
        return "LEGAL"
    if "R&D" in d or "RND" in d or "NGHIÊN CỨU" in d or "NGHIEN CUU" in d:
        return "RND"
    if "IT" in d or "CÔNG NGHỆ" in d or "CONG NGHE" in d:
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
    """Khởi tạo toàn bộ ma trận phân quyền mặc định (4 Roles x 7 Columns: 5 phòng ban Docker volume + Nhân viên + Ban lãnh đạo)."""
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

    # 3. Department Manager (dept ALL - phạm vi phòng ban)
    mgr_allowed = {"LEGAL", "SALES", "ACCOUNTING_PROCUREMENT", "IT", "RND", "EMPLOYEE"}
    for res in RESOURCE_TYPES:
        allowed = res in mgr_allowed
        is_dept_vol = res in {"LEGAL", "SALES", "ACCOUNTING_PROCUREMENT", "IT", "RND"}
        policies.append(
            KnowledgeAccessPolicy(
                role_code="DEPARTMENT_MANAGER",
                department_code="ALL",
                resource_type=res,
                can_query=allowed,
                can_view_citation=allowed,
                can_edit=is_dept_vol,
                can_view_sensitive=False,
                data_scope="OWN_DEPARTMENT" if allowed else "NONE",
                updated_by=admin_id,
            )
        )

    # 4. Standard User (dept ALL - chuyên viên nghiệp vụ)
    std_allowed = {"LEGAL", "SALES", "ACCOUNTING_PROCUREMENT", "IT", "RND", "EMPLOYEE"}
    for res in RESOURCE_TYPES:
        allowed = res in std_allowed
        policies.append(
            KnowledgeAccessPolicy(
                role_code="STANDARD_USER",
                department_code="ALL",
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
    """Lấy danh sách tất cả policies. Tự động seed nếu bảng chưa có dữ liệu hoặc chưa khớp 4x7 mới."""
    await ensure_table_created(db)
    result = await db.execute(select(KnowledgeAccessPolicy).order_by(
        KnowledgeAccessPolicy.role_code,
        KnowledgeAccessPolicy.department_code,
        KnowledgeAccessPolicy.resource_type
    ))
    rows = list(result.scalars().all())
    if auto_seed:
        existing_types = {r.resource_type for r in rows}
        has_all_std = any(r.role_code == "STANDARD_USER" and r.department_code == "ALL" for r in rows)
        if not rows or not set(RESOURCE_TYPES).issubset(existing_types) or not has_all_std:
            return await seed_default_matrix(db)
    return rows


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
        stmt = select(KnowledgeAccessPolicy).where(
            KnowledgeAccessPolicy.role_code == item.role_code,
            KnowledgeAccessPolicy.department_code == item.department_code,
            KnowledgeAccessPolicy.resource_type == item.resource_type,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        if existing:
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

    user_dept = "ALL"
    if hasattr(user, "department") and user.department:
        user_dept = normalize_dept_code(user.department)
    elif getattr(user, "department_id", None):
        user_dept = "SALES"
    else:
        user_dept = "ALL"

    stmt = select(KnowledgeAccessPolicy).where(
        KnowledgeAccessPolicy.role_code == role_code,
        KnowledgeAccessPolicy.department_code.in_([user_dept, "ALL"])
    )
    result = await db.execute(stmt)
    policies = result.scalars().all()

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
