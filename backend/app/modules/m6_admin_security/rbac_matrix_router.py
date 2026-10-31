"""
FastAPI Router cho Ma trận Phân quyền Tri thức chi tiết (Granular RBAC) - PB02 (Mục 6.2.1)
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.database import get_db
from app.db.postgres.models.user import User
from app.core.rbac import get_request_user
from app.modules.m6_admin_security.deps import get_admin_user
from app.modules.m6_admin_security.rbac_matrix_schema import (
    RbacMatrixResponse,
    MatrixMetadataOut,
    BulkPolicyUpdateRequest,
    UserKnowledgePermissionsResponse,
    PolicyItemOut,
    RESOURCE_TYPES,
    ROLES,
    DEPARTMENTS,
)
from app.modules.m6_admin_security.rbac_matrix_service import (
    get_all_policies,
    bulk_update_policies,
    reset_matrix,
    get_user_knowledge_permissions,
)

router = APIRouter(prefix="/admin/rbac-matrix", tags=["M6 Granular RBAC Matrix"])


@router.get("", response_model=RbacMatrixResponse)
@router.get("/", response_model=RbacMatrixResponse)
async def get_rbac_matrix(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    GET /api/admin/rbac-matrix:
    Trả về toàn bộ cấu trúc ma trận phân quyền tri thức chi tiết.
    Tự động khởi tạo dữ liệu mặc định nếu bảng đang trống.
    Chỉ cho phép vai trò Admin hệ thống.
    """
    policies = await get_all_policies(db, auto_seed=True)
    return RbacMatrixResponse(
        metadata=MatrixMetadataOut(
            resource_types=RESOURCE_TYPES,
            roles=ROLES,
            departments=DEPARTMENTS,
        ),
        policies=[PolicyItemOut.model_validate(p) for p in policies],
    )


@router.put("", response_model=Dict[str, Any])
@router.put("/", response_model=Dict[str, Any])
@router.post("/bulk-update", response_model=Dict[str, Any])
async def update_rbac_matrix(
    payload: BulkPolicyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    PUT /api/admin/rbac-matrix hoặc POST /api/admin/rbac-matrix/bulk-update:
    Cập nhật danh sách các ô quyền được thay đổi vào PostgreSQL trong 1 Transaction.
    Bắt buộc tự động ghi Audit Log với actor_id, nội dung thay đổi và timestamp.
    """
    count = await bulk_update_policies(db, payload.policies, admin)
    return {
        "status": "success",
        "updated_count": count,
        "message": f"Đã lưu thành công {count} chính sách phân quyền tri thức vào hệ thống.",
    }


@router.post("/reset-default", response_model=Dict[str, Any])
async def reset_rbac_matrix_default(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    POST /api/admin/rbac-matrix/reset-default:
    Khôi phục ma trận về cấu hình chuẩn mặc định và ghi Audit Log.
    """
    policies = await reset_matrix(db, admin)
    return {
        "status": "success",
        "total_policies": len(policies),
        "message": "Đã khôi phục toàn bộ Ma trận Phân quyền Tri thức về cấu hình chuẩn mặc định.",
    }


@router.get("/user-scope/me", response_model=UserKnowledgePermissionsResponse)
async def get_my_knowledge_permissions(
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Data Scope Resolver (Mục 6.2.2 tiền đề cho AI Copilot / Smart Search):
    Truy vấn danh sách resource_type được phép xem, data_scope và cờ can_view_sensitive của user hiện tại.
    """
    return await get_user_knowledge_permissions(user, db)
