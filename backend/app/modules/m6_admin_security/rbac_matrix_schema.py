"""
Pydantic Schemas cho Ma trận Phân quyền Tri thức chi tiết (Granular RBAC) - PB02
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# 7 cột phân quyền: 5 phòng ban + Nhân viên + Ban lãnh đạo
RESOURCE_TYPES = [
    "LEGAL",
    "SALES",
    "ACCOUNTING_PROCUREMENT",
    "IT",
    "RND",
    "EMPLOYEE",
    "EXECUTIVE_BOARD",
]

# Danh sách 4 vai trò chuẩn của dự án và 5 phòng ban
ROLES = [
    {"code": "ADMIN", "name": "Admin hệ thống (SecOps / IT)", "badge": "warning"},
    {"code": "EXECUTIVE", "name": "Ban lãnh đạo (Executive Director)", "badge": "danger"},
    {"code": "DEPARTMENT_MANAGER", "name": "Trưởng phòng (Department Manager)", "badge": "success"},
    {"code": "STANDARD_USER", "name": "Chuyên viên (Standard User)", "badge": "info"},
]

DEPARTMENTS = [
    {"code": "ALL", "name": "Toàn công ty (Tất cả)"},
    {"code": "LEGAL", "name": "Pháp chế (Legal)"},
    {"code": "SALES", "name": "Kinh doanh (Sales)"},
    {"code": "ACCOUNTING_PROCUREMENT", "name": "Kế toán / Thu mua"},
    {"code": "IT", "name": "Công nghệ / IT"},
    {"code": "RND", "name": "R&D"},
]


class PolicyItemOut(BaseModel):
    id: uuid.UUID
    role_code: str
    department_code: str
    resource_type: str
    can_query: bool
    can_view_citation: bool
    can_edit: bool
    can_view_sensitive: bool
    data_scope: str
    updated_by: Optional[uuid.UUID] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PolicyCellUpdate(BaseModel):
    id: Optional[uuid.UUID] = None
    role_code: str
    department_code: str = "ALL"
    resource_type: str
    can_query: bool = False
    can_view_citation: bool = False
    can_edit: bool = False
    can_view_sensitive: bool = False
    data_scope: str = "NONE"


class BulkPolicyUpdateRequest(BaseModel):
    policies: List[PolicyCellUpdate]


class MatrixMetadataOut(BaseModel):
    resource_types: List[str] = RESOURCE_TYPES
    roles: List[dict] = ROLES
    departments: List[dict] = DEPARTMENTS


class RbacMatrixResponse(BaseModel):
    metadata: MatrixMetadataOut
    policies: List[PolicyItemOut]


class UserKnowledgePermissionsResponse(BaseModel):
    user_id: uuid.UUID
    role_code: str
    department_code: str
    allowed_resources: List[str]
    can_view_sensitive: bool
    data_scope: str
    permissions_by_resource: dict
