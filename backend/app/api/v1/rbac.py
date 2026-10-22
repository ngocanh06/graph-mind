"""
RBAC & Department Scope API Router — /api/v1/rbac
Implements:
- FR3 (BR-02): RBAC decentralization combines Department Scope and Data Scope.
- Endpoint /api/v1/rbac/check: Check or inspect access permissions for resources and departments.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel

try:
    from app.core.rbac import get_user_scope, ScopeContext, normalize_dept
except ImportError:
    from core.rbac import get_user_scope, ScopeContext, normalize_dept

router = APIRouter()


class RbacCheckRequest(BaseModel):
    department: Optional[str] = None
    resource_type: Optional[str] = None  # e.g. "contract", "customer", "document", "sop", "kpi"
    resource_id: Optional[str] = None
    action: Optional[str] = "read"      # "read", "write", "publish", "delete"


class RbacCheckResponse(BaseModel):
    allowed: bool
    rule: str
    user: Dict[str, Any]
    scope: Dict[str, Any]
    detail: str


@router.get("/check", response_model=RbacCheckResponse)
@router.post("/check", response_model=RbacCheckResponse)
async def check_rbac_permission(
    payload: Optional[RbacCheckRequest] = None,
    department: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    action: Optional[str] = Query("read"),
    scope: ScopeContext = Depends(get_user_scope),
):
    """
    FR3 (BR-02): Kiểm tra quyền truy cập tài nguyên theo Role và Department Scope.
    - Ban Giám Đốc (Executive) có quyền toàn diện (BR-05).
    - Quản trị viên (Admin) có quyền toàn diện (BR-03).
    - Trưởng phòng (Department Manager) và Chuyên viên (Standard User) bị giới hạn
      chính xác trong phạm vi phòng ban của mình (BR-02, BR-04).
    """
    target_dept = (payload.department if payload and payload.department else department)
    target_resource = (payload.resource_type if payload and payload.resource_type else resource_type)
    target_id = (payload.resource_id if payload and payload.resource_id else resource_id)
    target_action = (payload.action if payload and payload.action else action or "read").lower()

    user_info = {
        "id": str(scope.user.user_id),
        "username": scope.user.username,
        "email": scope.user.email,
        "role": scope.role,
        "department": scope.department_name,
    }

    scope_info = {
        "is_unrestricted": scope.is_unrestricted,
        "canonical_department": scope.canonical_dept,
        "allowed_departments": list(scope.allowed_depts),
    }

    # 1. Executive and Admin have full enterprise access (BR-05, BR-03)
    if scope.is_unrestricted:
        return RbacCheckResponse(
            allowed=True,
            rule="BR-05" if scope.role in ["executive", "ceo", "cfo"] else "BR-03",
            user=user_info,
            scope=scope_info,
            detail="Toàn quyền truy cập trên toàn bộ phạm vi doanh nghiệp.",
        )

    # 2. Executive features (KPIs, Briefing)
    if target_resource in ["kpi", "executive_dashboard", "briefing"]:
        return RbacCheckResponse(
            allowed=False,
            rule="BR-05",
            user=user_info,
            scope=scope_info,
            detail=f"Quy định BR-05: Tài nguyên '{target_resource}' chỉ dành riêng cho Ban Lãnh Đạo (Executive).",
        )

    # 3. SOP Publishing (BR-04, FR26)
    if target_resource == "sop" and target_action in ["publish", "write"]:
        if scope.role in ["standard_user", "standard", "ops", "sales_ops"]:
            return RbacCheckResponse(
                allowed=False,
                rule="BR-04",
                user=user_info,
                scope=scope_info,
                detail="Quy định BR-04 & FR26: Chuyên viên nghiệp vụ không có quyền xuất bản SOP.",
            )
        if target_dept and normalize_dept(target_dept) != scope.canonical_dept and scope.canonical_dept != "all_departments":
            return RbacCheckResponse(
                allowed=False,
                rule="BR-04",
                user=user_info,
                scope=scope_info,
                detail=f"Quy định BR-04: Trưởng phòng chỉ được xuất bản SOP cho phòng ban của mình ({scope.department_name}).",
            )

    # 4. Department Scope Check (BR-02)
    if target_dept:
        allowed = scope.is_department_allowed(target_dept)
        if not allowed:
            return RbacCheckResponse(
                allowed=False,
                rule="BR-02",
                user=user_info,
                scope=scope_info,
                detail=f"Quy định BR-02: Phòng ban [{scope.department_name}] không có quyền truy cập dữ liệu của phòng ban [{target_dept}].",
            )

    # 5. Specific Document Check (BR-02)
    if target_id:
        allowed = scope.is_document_allowed(target_id, target_dept)
        if not allowed:
            return RbacCheckResponse(
                allowed=False,
                rule="BR-02",
                user=user_info,
                scope=scope_info,
                detail=f"Quy định BR-02: Không có quyền truy cập tài liệu [{target_id}].",
            )

    return RbacCheckResponse(
        allowed=True,
        rule="BR-02",
        user=user_info,
        scope=scope_info,
        detail="Quyền truy cập hợp lệ tuân thủ RBAC & Department Scope.",
    )
