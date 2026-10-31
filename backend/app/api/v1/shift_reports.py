"""
Shift Reports API — vòng đời báo cáo ca: DRAFT -> SUBMITTED -> APPROVED | REJECTED.
- Chỉ tác giả được tạo/sửa/gửi (khi DRAFT hoặc REJECTED).
- Chỉ Trưởng phòng đúng phòng ban (hoặc Executive/Admin) được duyệt/từ chối, và không được tự duyệt báo cáo của mình.
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.core.rbac import get_user_scope, ScopeContext
    from app.db.postgres.database import get_db
    from app.db.postgres.models.shift_report import ShiftReport
except ImportError:
    from core.rbac import get_user_scope, ScopeContext
    from db.postgres.database import get_db
    from db.postgres.models.shift_report import ShiftReport

router = APIRouter()

MANAGER_ROLES = {"knowledge_manager", "department_manager", "executive", "ceo", "cfo", "admin", "it_admin"}
EDITABLE = {"DRAFT", "REJECTED"}


class CaseRow(BaseModel):
    time: str = Field("", max_length=20)
    customer: str = Field("", max_length=200)
    issue: str = Field("", max_length=1000)
    solution: str = Field("", max_length=1000)
    ref: str = Field("", max_length=100)
    status: str = Field("", max_length=50)


class ReportBody(BaseModel):
    summary: str = Field("", max_length=5000)
    cases: List[CaseRow] = Field(default_factory=list, max_length=50)
    proposals: str = Field("", max_length=3000)


class ReviewBody(BaseModel):
    decision: str = Field(..., pattern="^(approve|reject)$")
    comment: Optional[str] = Field("", max_length=2000)


def _hash(r: ShiftReport) -> str:
    raw = json.dumps([r.summary, r.cases, r.proposals], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _get(db: AsyncSession, report_id: str) -> ShiftReport:
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(404, "Không tìm thấy báo cáo.")
    r = (await db.execute(select(ShiftReport).where(ShiftReport.id == rid))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Không tìm thấy báo cáo.")
    return r


def _own_editable(r: ShiftReport, scope: ScopeContext):
    if r.author_id != scope.user.user_id:
        raise HTTPException(403, "Chỉ tác giả mới được sửa/gửi báo cáo này.")
    if r.status not in EDITABLE:
        raise HTTPException(409, f"Báo cáo đang ở trạng thái {r.status}, không thể chỉnh sửa.")


def _apply(r: ShiftReport, body: ReportBody):
    r.summary = body.summary.strip()
    r.cases = [c.model_dump() for c in body.cases]
    r.proposals = body.proposals.strip()


@router.get("/mine")
async def my_reports(scope: ScopeContext = Depends(get_user_scope), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ShiftReport).where(ShiftReport.author_id == scope.user.user_id).order_by(ShiftReport.updated_at.desc())
    )).scalars().all()
    return {"success": True, "reports": [r.to_dict() for r in rows]}


@router.post("")
async def create_report(body: ReportBody, scope: ScopeContext = Depends(get_user_scope), db: AsyncSession = Depends(get_db)):
    r = ShiftReport(
        author_id=scope.user.user_id,
        author_name=scope.user.full_name or scope.user.username,
        username=scope.user.username,
        department=scope.canonical_dept,
        status="DRAFT",
    )
    _apply(r, body)
    db.add(r)
    await db.flush()
    await db.refresh(r)
    return {"success": True, "report": r.to_dict()}


@router.put("/{report_id}")
async def update_report(report_id: str, body: ReportBody, scope: ScopeContext = Depends(get_user_scope), db: AsyncSession = Depends(get_db)):
    r = await _get(db, report_id)
    _own_editable(r, scope)
    _apply(r, body)
    await db.flush()
    await db.refresh(r)
    return {"success": True, "report": r.to_dict()}


@router.post("/{report_id}/submit")
async def submit_report(report_id: str, scope: ScopeContext = Depends(get_user_scope), db: AsyncSession = Depends(get_db)):
    r = await _get(db, report_id)
    _own_editable(r, scope)
    if not r.summary:
        raise HTTPException(422, "Cần nhập nội dung tóm tắt trước khi gửi.")
    r.status = "SUBMITTED"
    r.submitted_at = datetime.now(timezone.utc)
    r.content_hash = _hash(r)
    r.signed_by = r.signed_at = r.manager_comment = None
    await db.flush()
    await db.refresh(r)
    return {"success": True, "report": r.to_dict()}


@router.post("/{report_id}/review")
async def review_report(report_id: str, body: ReviewBody, scope: ScopeContext = Depends(get_user_scope), db: AsyncSession = Depends(get_db)):
    if scope.role not in MANAGER_ROLES:
        raise HTTPException(403, "Chỉ Trưởng phòng hoặc Ban Giám Đốc mới có quyền duyệt báo cáo ca (BR-04).")
    r = await _get(db, report_id)
    if not scope.is_unrestricted and scope.canonical_dept != r.department:
        raise HTTPException(403, "Chỉ được duyệt báo cáo thuộc phòng ban mình phụ trách (BR-04).")
    if r.author_id == scope.user.user_id:
        raise HTTPException(403, "Không được tự duyệt báo cáo của chính mình.")
    if r.status != "SUBMITTED":
        raise HTTPException(409, f"Báo cáo đang ở trạng thái {r.status}, không thể duyệt.")
    comment = (body.comment or "").strip()
    if body.decision == "reject" and not comment:
        raise HTTPException(422, "Cần ghi lý do khi từ chối báo cáo.")
    if _hash(r) != r.content_hash:
        raise HTTPException(409, "Nội dung báo cáo đã bị thay đổi sau khi gửi.")
    r.status = "APPROVED" if body.decision == "approve" else "REJECTED"
    r.signed_by = scope.user.full_name or scope.user.username
    r.signed_at = datetime.now(timezone.utc)
    r.manager_comment = comment
    await db.flush()
    await db.refresh(r)
    return {"success": True, "report": r.to_dict()}
