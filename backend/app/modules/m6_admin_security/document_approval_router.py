"""
FastAPI Router cho Hàng đợi Phê duyệt Tài liệu Tri thức (Document Upload Approvals)
Triển khai PB48, PB50, PB02:
- POST /api/documents/submit-upload
- GET  /api/admin/upload-approvals
- POST /api/admin/upload-approvals/{request_id}/approve
- POST /api/admin/upload-approvals/{request_id}/reject
- GET  /api/admin/upload-approvals/{request_id}/preview
"""
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Header, status
from pydantic import BaseModel
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres.database import get_db, AsyncSessionLocal
from app.db.postgres.models.user import User
from app.core.rbac import get_request_user
from app.modules.m6_admin_security.rbac import is_system_admin, ADMIN_ONLY_DETAIL
from app.modules.m6_admin_security.audit_service import log_action
from app.modules.m6_admin_security.document_approval_model import KnowledgeUploadApproval
from app.modules.m6_admin_security.rbac_matrix_model import KnowledgeAccessPolicy
from app.modules.m6_admin_security.rbac_matrix_service import normalize_role_code, normalize_dept_code, ensure_table_created

try:
    from app.core.central_storage import (
        save_file_to_storage,
        sanitize_filename,
        resolve_canonical_dept,
    )
    from app.modules.m1_data_sync.pipeline import (
        process_document_ingestion,
        SUPPORTED_EXTENSIONS,
    )
except ImportError:
    from core.central_storage import (
        save_file_to_storage,
        sanitize_filename,
        resolve_canonical_dept,
    )
    from modules.m1_data_sync.pipeline import (
        process_document_ingestion,
        SUPPORTED_EXTENSIONS,
    )

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Document Upload Approvals (PB48, PB50, PB02)"])

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
DATA_ROOT = os.getenv("GRAPH_MIND_DATA_DIR", "/data")
PENDING_STAGING_DIR = os.path.join(DATA_ROOT, ".pending_uploads")

# Map standard resource types to canonical department keys if needed
RESOURCE_TO_DEPT_MAP = {
    "LEGAL": "legal",
    "CONTRACT": "legal",
    "CLAUSE": "legal",
    "SALES": "sales",
    "CUSTOMER": "sales",
    "SALES_ORDER": "sales",
    "ACCOUNTING_PROCUREMENT": "accounting_procurement",
    "VENDOR": "accounting_procurement",
    "INVOICE": "accounting_procurement",
    "IT": "it",
    "RND": "rnd",
    "PRODUCT": "sales",
    "SOP_WIKI": "sales",
    "EMPLOYEE": "sales",
}


def _get_staging_dir() -> str:
    """Ensure staging directory exists and return its path."""
    target_dir = PENDING_STAGING_DIR
    try:
        os.makedirs(target_dir, exist_ok=True)
    except Exception:
        target_dir = os.path.join(os.path.dirname(__file__), ".pending_storage")
        os.makedirs(target_dir, exist_ok=True)
    return target_dir


async def ensure_approval_table(db: AsyncSession) -> None:
    """Ensure knowledge_upload_approvals table exists in PostgreSQL."""
    from sqlalchemy import text
    create_sql = """
    CREATE TABLE IF NOT EXISTS knowledge_upload_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        file_path VARCHAR(500) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        department_code VARCHAR(50) NOT NULL DEFAULT 'SALES',
        uploaded_by_id UUID NULL,
        uploaded_by_email VARCHAR(255) NOT NULL,
        uploaded_by_role VARCHAR(50) NOT NULL DEFAULT 'STANDARD_USER',
        action_type VARCHAR(50) NOT NULL DEFAULT 'UPLOAD_NEW',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        reviewed_by VARCHAR(255) NULL,
        review_note VARCHAR(1000) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ NULL
    );
    """
    await db.execute(text(create_sql))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_kua_status ON knowledge_upload_approvals(status);"))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_kua_resource ON knowledge_upload_approvals(resource_type);"))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_kua_dept ON knowledge_upload_approvals(department_code);"))
    await db.commit()


class RejectPayload(BaseModel):
    review_note: Optional[str] = "Từ chối tài liệu tải lên do không phù hợp quy định doanh nghiệp."


class ApprovalResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size: int
    resource_type: str
    department_code: str
    uploaded_by_id: Optional[str] = None
    uploaded_by_email: str
    uploaded_by_role: str
    action_type: str
    status: str
    reviewed_by: Optional[str] = None
    review_note: Optional[str] = None
    created_at: Optional[str] = None
    reviewed_at: Optional[str] = None


def _serialize_approval(item: KnowledgeUploadApproval) -> Dict[str, Any]:
    return {
        "id": str(item.id),
        "file_name": item.file_name,
        "file_type": item.file_type,
        "file_size": item.file_size,
        "file_path": item.file_path,
        "resource_type": item.resource_type,
        "department_code": item.department_code,
        "uploaded_by_id": str(item.uploaded_by_id) if item.uploaded_by_id else None,
        "uploaded_by_email": item.uploaded_by_email,
        "uploaded_by_role": item.uploaded_by_role,
        "action_type": item.action_type,
        "status": item.status,
        "reviewed_by": item.reviewed_by,
        "review_note": item.review_note,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
    }


# ============================================================================
# 1. POST /api/documents/submit-upload
# ============================================================================
@router.post("/documents/submit-upload")
@router.post("/v1/documents/submit-upload")
async def submit_document_upload(
    file: UploadFile = File(...),
    resource_type: str = Form("SALES"),
    department_code: Optional[str] = Form(None),
    action_type: str = Form("UPLOAD_NEW"),
    x_user_role: Optional[str] = Header(None),
    x_user_dept: Optional[str] = Header(None),
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Tải lên / cập nhật tài liệu tri thức (PDF, CSV, DOCX, XLSX).
    - Kiểm tra quyền trên Ma trận Granular RBAC (can_upload hoặc can_edit).
    - Nếu là Admin: Cho phép tự động duyệt (APPROVED) và nạp ngay vào Kho tri thức.
    - Nếu là Executive, Manager, Standard User: Lưu vào hàng đợi PENDING và ghi nhận Audit Log.
    """
    await ensure_approval_table(db)
    await ensure_table_created(db)

    # Validate file name & sanitize
    raw_name = file.filename or "uploaded_file"
    try:
        safe_name = sanitize_filename(raw_name)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

    # Validate file extension
    ext = os.path.splitext(safe_name)[1].lower().replace(".", "")
    if f".{ext}" not in SUPPORTED_EXTENSIONS and ext not in ("pdf", "csv", "docx", "xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp '.{ext}' không được hỗ trợ. Chỉ chấp nhận: PDF, CSV, DOCX, XLSX."
        )

    # Read content & size
    content_bytes = await file.read()
    file_size = len(content_bytes)
    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dung lượng tệp ({round(file_size / (1024 * 1024), 2)}MB) vượt quá giới hạn tối đa 50MB."
        )

    # Determine user role and department
    user_role = (x_user_role or getattr(user, "role", "standard") or "standard").strip().lower()
    role_code = normalize_role_code(user_role)
    raw_dept = department_code or x_user_dept or getattr(user, "department", "SALES")
    norm_dept = normalize_dept_code(raw_dept)
    if norm_dept == "ALL":
        norm_dept = "SALES"

    # Normalize resource_type
    clean_res = (resource_type or norm_dept).strip().upper()

    # RBAC Permission Check
    is_admin = (role_code == "ADMIN")
    if not is_admin:
        # Check permissions in knowledge_access_policies
        # Match by clean_res or by mapped department
        matched_res_types = [clean_res]
        if clean_res in ("CUSTOMER", "SALES_ORDER", "PRODUCT"):
            matched_res_types.append("SALES")
        elif clean_res in ("CONTRACT", "CLAUSE"):
            matched_res_types.append("LEGAL")
        elif clean_res in ("VENDOR", "INVOICE"):
            matched_res_types.append("ACCOUNTING_PROCUREMENT")

        stmt = select(KnowledgeAccessPolicy).where(
            KnowledgeAccessPolicy.role_code == role_code,
            KnowledgeAccessPolicy.department_code.in_([norm_dept, "ALL"]),
            KnowledgeAccessPolicy.resource_type.in_(matched_res_types)
        )
        res_policies = (await db.execute(stmt)).scalars().all()

        has_permission = any(
            getattr(p, "can_upload", False) or p.can_edit
            for p in res_policies
        )

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Từ chối quyền truy cập (403): Vai trò [{role_code}] thuộc phòng ban [{norm_dept}] "
                    f"chưa được cấp quyền tải lên (can_upload) cho loại tri thức [{clean_res}] trên Ma trận RBAC."
                )
            )

    approval_id = uuid.uuid4()
    staging_dir = _get_staging_dir()
    staging_file_path = os.path.join(staging_dir, f"{approval_id}_{safe_name}")

    # Write file to staging
    try:
        with open(staging_file_path, "wb") as f:
            f.write(content_bytes)
    except Exception as e:
        logger.error(f"[UploadApproval] Staging save failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi lưu tệp chờ duyệt: {str(e)}"
        )

    # If Admin: Auto-approve & Ingest directly
    if is_admin:
        canonical_dept = resolve_canonical_dept(norm_dept)
        storage_res = save_file_to_storage(content_bytes, safe_name, canonical_dept)
        ingest_res = process_document_ingestion(
            content_bytes=content_bytes,
            filename=safe_name,
            department=canonical_dept,
            event_type="created",
            allow_skip_known=False
        )

        # Invalidate inventory cache
        try:
            from app.main import invalidate_inventory_cache
            invalidate_inventory_cache()
        except Exception:
            pass

        approval_record = KnowledgeUploadApproval(
            id=approval_id,
            file_name=safe_name,
            file_type=ext.upper(),
            file_size=file_size,
            file_path=storage_res.get("storage_path", staging_file_path),
            resource_type=clean_res,
            department_code=norm_dept,
            uploaded_by_id=user.user_id,
            uploaded_by_email=user.email,
            uploaded_by_role=role_code,
            action_type=action_type,
            status="APPROVED",
            reviewed_by=user.email,
            review_note="Tự động phê duyệt bởi Admin hệ thống",
            reviewed_at=datetime.now(timezone.utc),
        )
        db.add(approval_record)
        await db.commit()

        await log_action(
            db,
            action="DOCUMENT_UPLOAD_APPROVED",
            actor_id=user.user_id,
            resource_type="KNOWLEDGE_UPLOAD_APPROVAL",
            resource_id=str(approval_id),
            detail=f"Admin tải lên và phê duyệt ngay tệp '{safe_name}' ({clean_res}) vào Kho tri thức ({canonical_dept})",
        )
        await db.commit()

        return {
            "success": True,
            "status": "APPROVED",
            "id": str(approval_id),
            "file_name": safe_name,
            "department": canonical_dept,
            "message": f"Tài liệu '{safe_name}' đã được phê duyệt và lập chỉ mục trực tiếp vào Kho tri thức AI.",
            "data": _serialize_approval(approval_record),
            "ingestion": ingest_res,
        }

    # If Non-Admin: Create PENDING request
    approval_record = KnowledgeUploadApproval(
        id=approval_id,
        file_name=safe_name,
        file_type=ext.upper(),
        file_size=file_size,
        file_path=staging_file_path,
        resource_type=clean_res,
        department_code=norm_dept,
        uploaded_by_id=user.user_id,
        uploaded_by_email=user.email,
        uploaded_by_role=role_code,
        action_type=action_type,
        status="PENDING",
    )
    db.add(approval_record)
    await db.commit()

    await log_action(
        db,
        action="DOCUMENT_UPLOAD_SUBMITTED",
        actor_id=user.user_id,
        resource_type="KNOWLEDGE_UPLOAD_APPROVAL",
        resource_id=str(approval_id),
        detail=f"Người dùng {user.email} [{role_code}/{norm_dept}] gửi yêu cầu tải lên tệp '{safe_name}' ({clean_res}) chờ Admin duyệt",
    )
    await db.commit()

    return {
        "success": True,
        "status": "PENDING",
        "id": str(approval_id),
        "file_name": safe_name,
        "department": norm_dept,
        "message": "Tài liệu đã được gửi lên hàng đợi. Vui lòng chờ Quản trị viên Hệ thống & Tri thức (Admin) phê duyệt trước khi đồng bộ vào AI Copilot.",
        "data": _serialize_approval(approval_record),
    }


# ============================================================================
# 2. GET /api/admin/upload-approvals
# ============================================================================
@router.get("/admin/upload-approvals")
@router.get("/v1/admin/upload-approvals")
async def list_upload_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    department: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách các yêu cầu phê duyệt tải lên tài liệu:
    - Admin: xem được tất cả các tệp (chờ duyệt, đã duyệt, từ chối).
    - Người dùng thông thường: chỉ xem được các tệp do chính mình gửi lên.
    """
    await ensure_approval_table(db)

    is_admin = is_system_admin(user) or normalize_role_code(getattr(user, "role", "standard")) == "ADMIN"

    query = select(KnowledgeUploadApproval)

    if not is_admin:
        # Scoped strictly to the current user
        query = query.where(
            or_(
                KnowledgeUploadApproval.uploaded_by_id == user.user_id,
                KnowledgeUploadApproval.uploaded_by_email == user.email,
            )
        )

    if status_filter and status_filter.upper() != "ALL":
        query = query.where(KnowledgeUploadApproval.status == status_filter.upper())

    if department and department.upper() != "ALL":
        query = query.where(KnowledgeUploadApproval.department_code == department.upper())

    if resource_type and resource_type.upper() != "ALL":
        query = query.where(KnowledgeUploadApproval.resource_type == resource_type.upper())

    query = query.order_by(desc(KnowledgeUploadApproval.created_at))

    res = await db.execute(query)
    items = res.scalars().all()

    # Calculate pending count
    pending_count_query = select(func.count(KnowledgeUploadApproval.id)).where(
        KnowledgeUploadApproval.status == "PENDING"
    )
    if not is_admin:
        pending_count_query = pending_count_query.where(
            or_(
                KnowledgeUploadApproval.uploaded_by_id == user.user_id,
                KnowledgeUploadApproval.uploaded_by_email == user.email,
            )
        )
    pending_count = (await db.execute(pending_count_query)).scalar() or 0

    return {
        "success": True,
        "is_admin": is_admin,
        "total": len(items),
        "pending_count": pending_count,
        "items": [_serialize_approval(it) for it in items],
    }


# ============================================================================
# 3. POST /api/admin/upload-approvals/{request_id}/approve
# ============================================================================
@router.post("/admin/upload-approvals/{request_id}/approve")
@router.post("/v1/admin/upload-approvals/{request_id}/approve")
async def approve_upload_request(
    request_id: uuid.UUID,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin phê duyệt tài liệu:
    - Chỉ Admin mới có quyền gọi.
    - Chuyển trạng thái sang APPROVED.
    - Lưu tệp vào Central Storage (/data/{dept}/{filename}).
    - Kích hoạt Unified Core Ingestion Pipeline (Qdrant vector & Neo4j graph).
    - Ghi nhận Audit Log (DOCUMENT_UPLOAD_APPROVED).
    """
    await ensure_approval_table(db)

    is_admin = is_system_admin(user) or normalize_role_code(getattr(user, "role", "standard")) == "ADMIN"
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ADMIN_ONLY_DETAIL)

    res = await db.execute(
        select(KnowledgeUploadApproval).where(KnowledgeUploadApproval.id == request_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy yêu cầu phê duyệt.")

    if item.status == "APPROVED":
        return {
            "success": True,
            "message": f"Tài liệu '{item.file_name}' đã được phê duyệt trước đó.",
            "item": _serialize_approval(item),
        }

    # Verify staging file exists
    if not os.path.exists(item.file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tệp lưu trữ tạm ({item.file_path}) không còn tồn tại trên máy chủ."
        )

    with open(item.file_path, "rb") as f:
        content_bytes = f.read()

    canonical_dept = resolve_canonical_dept(item.department_code)

    # 1. Save to Central Storage
    storage_res = save_file_to_storage(content_bytes, item.file_name, canonical_dept)

    # 2. Ingest into Neo4j & Qdrant
    ingest_res = process_document_ingestion(
        content_bytes=content_bytes,
        filename=item.file_name,
        department=canonical_dept,
        event_type="created",
        allow_skip_known=False
    )

    # 3. Update approval status
    item.status = "APPROVED"
    item.reviewed_by = user.email
    item.review_note = "Đã phê duyệt và nạp vào Kho tri thức chính thức"
    item.reviewed_at = datetime.now(timezone.utc)
    item.file_path = storage_res.get("storage_path", item.file_path)

    # 4. Invalidate inventory cache
    try:
        from app.main import invalidate_inventory_cache
        invalidate_inventory_cache()
    except Exception:
        pass

    # 5. Audit Log
    await log_action(
        db,
        action="DOCUMENT_UPLOAD_APPROVED",
        actor_id=user.user_id,
        resource_type="KNOWLEDGE_UPLOAD_APPROVAL",
        resource_id=str(item.id),
        detail=f"Admin {user.email} đã duyệt tệp '{item.file_name}' ({item.resource_type}) gửi bởi {item.uploaded_by_email}",
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Đã phê duyệt và nạp thành công tệp '{item.file_name}' vào Kho tri thức ({canonical_dept}).",
        "item": _serialize_approval(item),
        "ingestion": ingest_res,
    }


# ============================================================================
# 4. POST /api/admin/upload-approvals/{request_id}/reject
# ============================================================================
@router.post("/admin/upload-approvals/{request_id}/reject")
@router.post("/v1/admin/upload-approvals/{request_id}/reject")
async def reject_upload_request(
    request_id: uuid.UUID,
    payload: RejectPayload,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin từ chối tài liệu:
    - Chỉ Admin mới có quyền gọi.
    - Nhận lý do từ chối (review_note).
    - Chuyển trạng thái sang REJECTED.
    - Ghi nhận Audit Log (DOCUMENT_UPLOAD_REJECTED).
    """
    await ensure_approval_table(db)

    is_admin = is_system_admin(user) or normalize_role_code(getattr(user, "role", "standard")) == "ADMIN"
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ADMIN_ONLY_DETAIL)

    res = await db.execute(
        select(KnowledgeUploadApproval).where(KnowledgeUploadApproval.id == request_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy yêu cầu phê duyệt.")

    item.status = "REJECTED"
    item.reviewed_by = user.email
    item.review_note = payload.review_note or "Từ chối bởi Quản trị viên"
    item.reviewed_at = datetime.now(timezone.utc)

    await log_action(
        db,
        action="DOCUMENT_UPLOAD_REJECTED",
        actor_id=user.user_id,
        resource_type="KNOWLEDGE_UPLOAD_APPROVAL",
        resource_id=str(item.id),
        detail=f"Admin {user.email} từ chối tệp '{item.file_name}'. Lý do: {item.review_note}",
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Đã từ chối tài liệu '{item.file_name}'.",
        "item": _serialize_approval(item),
    }


# ============================================================================
# 5. GET /api/admin/upload-approvals/{request_id}/preview
# ============================================================================
@router.get("/admin/upload-approvals/{request_id}/preview")
@router.get("/v1/admin/upload-approvals/{request_id}/preview")
async def preview_upload_request(
    request_id: uuid.UUID,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Xem trước tóm tắt thông tin và nội dung tệp (CSV sample / PDF metadata).
    """
    await ensure_approval_table(db)

    res = await db.execute(
        select(KnowledgeUploadApproval).where(KnowledgeUploadApproval.id == request_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy yêu cầu.")

    preview_content = ""
    lines_count = 0
    if os.path.exists(item.file_path):
        try:
            ext = item.file_type.lower()
            if ext == "csv" or item.file_name.lower().endswith(".csv"):
                with open(item.file_path, "r", encoding="utf-8", errors="ignore") as f:
                    sample_lines = [f.readline() for _ in range(25)]
                    preview_content = "".join([l for l in sample_lines if l])
                    lines_count = len(sample_lines)
            elif ext == "pdf" or item.file_name.lower().endswith(".pdf"):
                try:
                    import pypdf
                    reader = pypdf.PdfReader(item.file_path)
                    preview_content = f"PDF Document — Tổng cộng {len(reader.pages)} trang.\n\nTrích đoạn trang đầu:\n"
                    if len(reader.pages) > 0:
                        preview_content += reader.pages[0].extract_text()[:1500]
                except Exception:
                    preview_content = f"Tệp PDF ({round(item.file_size / 1024, 1)} KB). Định dạng nhị phân chuẩn bị lập chỉ mục."
            else:
                preview_content = f"Tệp văn bản định dạng {item.file_type} ({round(item.file_size / 1024, 1)} KB)."
        except Exception as e:
            preview_content = f"Không thể đọc trước nội dung tệp: {str(e)}"

    return {
        "success": True,
        "item": _serialize_approval(item),
        "preview_text": preview_content,
        "lines_count": lines_count,
    }
