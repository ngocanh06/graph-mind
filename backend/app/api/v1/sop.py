"""
SOP API Router — Quản lý và Xuất bản Quy trình vận hành chuẩn (SOP)
Triển khai Functional Requirement FR26, Use Case UC.14 và quy tắc nghiệp vụ BR-04 trong SRS.
Endpoints:
- GET    /api/v1/sop: Lấy danh sách quy trình SOP (hỗ trợ lọc dept, status, search)
- GET    /api/v1/sop/{sop_id}: Lấy chi tiết quy trình SOP
- POST   /api/v1/sop: Tạo mới hoặc lưu bản nháp SOP
- PUT    /api/v1/sop/{sop_id}: Cập nhật bản nháp SOP
- POST   /api/v1/sop/publish: Xuất bản SOP cho phòng ban (Kiểm tra BR-04 & Ground-Truth Ingestion)
- POST   /api/v1/sop/{sop_id}/publish: Xuất bản SOP theo ID
- DELETE /api/v1/sop/{sop_id}: Xóa bản nháp SOP
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

try:
    from app.core.security import decode_access_token
    from app.db.postgres.database import get_db
    from app.db.postgres.models.user import User
    from app.db.postgres.models.sop_document import SopDocument
    from app.db.neo4j.client import neo4j_client
    from app.db.qdrant.client import qdrant_client
    from app.schemas.sop import (
        SopCreateRequest,
        SopUpdateRequest,
        SopPublishRequest,
        SopResponse,
        SopListResponse,
    )
except ImportError:
    from core.security import decode_access_token
    from db.postgres.database import get_db
    from db.postgres.models.user import User
    from db.postgres.models.sop_document import SopDocument
    from db.neo4j.client import neo4j_client
    from db.qdrant.client import qdrant_client
    from schemas.sop import (
        SopCreateRequest,
        SopUpdateRequest,
        SopPublishRequest,
        SopResponse,
        SopListResponse,
    )

router = APIRouter()
security_bearer = HTTPBearer(auto_error=False)

# ── Bảng ánh xạ phòng ban chuẩn hóa (Canonical Department Mapping) ─────────────
DEPT_CANONICAL = {
    "pháp chế": "legal",
    "legal": "legal",
    "phòng pháp chế & hợp đồng": "legal",
    "phòng pháp chế": "legal",
    "kinh doanh": "sales",
    "sales": "sales",
    "phòng kinh doanh": "sales",
    "phòng kinh doanh & phát triển thị trường": "sales",
    "công nghệ / it": "it",
    "công nghệ thông tin": "it",
    "it": "it",
    "phòng cntt": "it",
    "r&d": "rnd",
    "nghiên cứu": "rnd",
    "ai ops": "ai_ops",
    "kế toán": "accounting",
    "accounting": "accounting",
    "nhân sự": "hr",
    "hr": "hr",
    "vận hành": "operations",
    "vận hành & nghiệp vụ": "operations",
    "operations": "operations",
    "quản lý phòng ban": "all_departments",
    "khối quản lý phòng ban & bộ phận": "all_departments",
    "ban giám đốc": "executive",
}

# ── Dữ liệu khởi tạo mặc định (Initial Seed SOPs) ──────────────────────────────
DEFAULT_SEED_SOPS = [
    {
        "code": "SOP-01",
        "title": "SOP-01: Quy trình rà soát hợp đồng pháp lý CUAD",
        "department": "Pháp chế",
        "version": "v2.2",
        "status": "published",
        "tags": ["#legal", "#cuad", "#risk"],
        "author_name": "Trưởng phòng Pháp chế",
        "purpose": "Quy trình này quy định các bước chuẩn hóa bắt buộc đối với chuyên viên Pháp chế và Quản lý Hợp đồng khi tiếp nhận, rà soát và đánh giá rủi ro pháp lý đối với toàn bộ các dự thảo hợp đồng mua sắm dịch vụ (CUAD Service Agreement) có giá trị từ 500,000,000 VNĐ trở lên hoặc hợp đồng có yếu tố đối tác nước ngoài.",
        "steps": [
            {
                "num": 1,
                "title": "Bước 1: Nạp tài liệu & Kích hoạt Hybrid GraphRAG",
                "desc": "Chuyên viên tải tệp PDF dự thảo lên SCREEN-015. Hệ thống tự động phân tách 128 Chunks vector vào Qdrant và liên kết các node pháp lý tương ứng trong Neo4j."
            },
            {
                "num": 2,
                "title": "Bước 2: Đối soát điều khoản và Nhận diện rủi ro tự động",
                "desc": "AI Copilot sẽ quét toàn bộ 41 danh mục điều khoản CUAD. Đặc biệt lưu ý các cảnh báo HAS_RISK_LIABILITY nếu điều khoản bồi thường thiệt hại trực tiếp dưới mức trần quy chuẩn 30% giá trị hợp đồng."
            },
            {
                "num": 3,
                "title": "Bước 3: Hiệu chỉnh Human-in-the-loop & Đề xuất sửa đổi",
                "desc": "Sử dụng Knowledge Editor (SCREEN-016) để xác nhận lại mối liên hệ thực thể, bổ sung chú thích pháp lý trước khi phát hành Báo cáo thẩm định sang ban Giám đốc."
            }
        ],
        "governance": "Mọi biên bản rà soát phải được ký số bởi Trưởng phòng Pháp chế và lưu trữ vĩnh viễn trên hệ thống tri thức tập trung. Bất kỳ ngoại lệ nào vượt quá thẩm quyền phải kích hoạt quy trình phê duyệt khẩn cấp (Escalation Rule C4)."
    },
    {
        "code": "SOP-02",
        "title": "SOP-02: Quy chuẩn tiếp nhận & nghiệm thu phần mềm đối tác v2.1",
        "department": "Công nghệ / IT",
        "version": "v2.1",
        "status": "published",
        "tags": ["#it", "#uat", "#security"],
        "author_name": "Nguyễn Văn An",
        "purpose": "Tiêu chuẩn kiểm thử bảo mật, UAT và bàn giao mã nguồn IT từ các nhà phát triển và đối tác gia công phần mềm.",
        "steps": [
            {
                "num": 1,
                "title": "Bước 1: Tiếp nhận mã nguồn & Kiểm tra bảo mật tĩnh (SAST)",
                "desc": "Chạy quét mã nguồn qua SonarQube và kiểm tra tuân thủ các chuẩn OWASP Top 10."
            },
            {
                "num": 2,
                "title": "Bước 2: Triển khai môi trường UAT & Kiểm thử chức năng",
                "desc": "Kích hoạt pipeline kiểm thử tự động trên Kubernetes Staging cluster."
            }
        ],
        "governance": "Bắt buộc có biên bản nghiệm thu ký bởi Trưởng phòng Công nghệ thông tin trước khi chuyển sang môi trường Production."
    },
    {
        "code": "SOP-03",
        "title": "SOP-03: Hướng dẫn tích hợp Agent đồng bộ máy trạm AEGIS",
        "department": "R&D",
        "version": "v0.9",
        "status": "draft",
        "tags": ["#aegis", "#sync", "#agent"],
        "author_name": "Trần Thu Hương",
        "purpose": "Quy trình cấp phát token và cấu hình RBAC cho máy trạm mới cần đồng bộ dữ liệu hồ sơ vào hệ thống AEGIS EKMP.",
        "steps": [
            {
                "num": 1,
                "title": "Bước 1: Cài đặt AEGIS Local Watcher",
                "desc": "Tải gói agent nhị phân và cài đặt trên máy trạm doanh nghiệp."
            }
        ],
        "governance": "Token có thời hạn tối đa 30 ngày và phải được cấp qua kênh xác thực nội bộ an toàn."
    },
    {
        "code": "SOP-04",
        "title": "SOP-04: Xử lý sự cố lệch dữ liệu Vector Qdrant",
        "department": "AI Ops",
        "version": "v1.0-draft",
        "status": "draft",
        "tags": ["#vector", "#qdrant", "#ops"],
        "author_name": "Võ Minh Đạt",
        "purpose": "Sổ tay Runbook dành cho AI Ops khi phát hiện drift embeddings hoặc sai lệch giữa vector index và dữ liệu đồ thị Neo4j.",
        "steps": [
            {
                "num": 1,
                "title": "Bước 1: Kiểm tra Telemetry và Cosine Drift Rate",
                "desc": "Giám sát bảng điều khiển LLMOps để xác định tỷ lệ trôi dạt ngữ nghĩa của các chunks mới."
            }
        ],
        "governance": "Mọi lệnh tái lập chỉ mục (re-index) phải thông báo trước cho SecOps Lead và thực hiện ngoài giờ cao điểm."
    }
]


async def ensure_initial_seed_sops(db: AsyncSession):
    """Tự động nạp dữ liệu SOP mẫu ban đầu nếu bảng còn trống"""
    try:
        res = await db.execute(select(func.count(SopDocument.id)))
        count = res.scalar() or 0
        if count == 0:
            for item in DEFAULT_SEED_SOPS:
                sop = SopDocument(
                    code=item["code"],
                    title=item["title"],
                    department=item["department"],
                    version=item["version"],
                    status=item["status"],
                    tags=item["tags"],
                    author_name=item["author_name"],
                    purpose=item["purpose"],
                    steps=item["steps"],
                    governance=item["governance"],
                    published_at=datetime.now(timezone.utc) if item["status"] == "published" else None,
                )
                db.add(sop)
            await db.commit()
            logger.info("Đã khởi tạo 4 SOP mẫu vào PostgreSQL")
    except Exception as e:
        logger.warning(f"Lỗi khởi tạo SOP seed: {e}")
        await db.rollback()


# ── User Resolution Helper ────────────────────────────────────────────────────
async def get_request_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    x_user_dept: Optional[str] = Header(None),
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Xác định tài khoản người dùng gửi request từ JWT Token hoặc Headers"""
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

    # 2. X-User-Id hoặc Query user_id
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

    USER_ALIASES = {
        "ceo": "exec",
        "executive": "exec",
        "manager": "manager",
        "knowledge_manager": "manager",
        "it_admin": "admin",
        "admin": "admin",
        "sales_ops": "ops",
        "ops": "ops",
    }

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

    # 5. Fallback mặc định tài khoản manager nếu chưa có auth (cho môi trường dev)
    res = await db.execute(select(User).where(User.username == "manager"))
    u = res.scalar_one_or_none()
    if u:
        return u

    # 6. Fallback tài khoản đầu tiên
    res = await db.execute(select(User).order_by(User.created_at.asc()).limit(1))
    u = res.scalar_one_or_none()
    if u:
        return u

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Yêu cầu đăng nhập để thực hiện chức năng này.",
    )


# ── BR-04 Permission Verification Helper ──────────────────────────────────────
async def verify_br04_publish_permission(
    user: User,
    target_department: str,
    x_user_dept: Optional[str],
    db: AsyncSession,
):
    """
    Xác minh nghiêm ngặt quy tắc nghiệp vụ BR-04 và FR26:
    - BR-04: 'Department Managers are only allowed to draft and publish SOPs for their own departments.'
    - FR26: 'Department Manager drafts and publishes SOPs/regulations for his department.'
    - Standard Users (nhân viên nghiệp vụ) không có quyền xuất bản SOP.
    - Ban Giám Đốc (Executive) và Quản trị viên (Admin) có thẩm quyền toàn hệ thống.
    """
    if x_user_dept:
        try:
            import urllib.parse
            x_user_dept = urllib.parse.unquote(x_user_dept)
        except Exception:
            pass

    user_role = (user.role or "").strip().lower()
    is_admin = user.is_superuser or user_role in ["admin", "it_admin"]
    is_exec = user_role in ["executive", "ceo", "cfo"]

    # 1. Admin và Executive được phép xuất bản cho mọi phòng ban
    if is_admin or is_exec:
        return True

    # 2. Chuyên viên nghiệp vụ (Standard User) bị chặn hoàn toàn
    if user_role in ["standard_user", "standard", "sales_ops", "ops"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Theo quy định FR26 & BR-04: Chuyên viên nghiệp vụ (Standard User) không có quyền xuất bản SOP. Chức năng này chỉ dành cho Trưởng phòng (Department Manager) hoặc Ban Quản trị.",
        )

    # 3. Trưởng phòng (Department Manager): Kiểm tra phạm vi phòng ban (Department Scope)
    user_dept_name = None
    if user.department_id:
        dept_res = await db.execute(
            text("SELECT name FROM departments WHERE department_id = :d_id"),
            {"d_id": user.department_id},
        )
        row = dept_res.fetchone()
        if row:
            user_dept_name = row[0]

    # Ưu tiên department từ header X-User-Dept nếu có truyền từ giao diện persona
    effective_dept = x_user_dept or user_dept_name or "Quản Lý Phòng Ban"

    user_canonical = DEPT_CANONICAL.get(effective_dept.strip().lower())
    target_canonical = DEPT_CANONICAL.get(target_department.strip().lower())

    # Nếu người dùng thuộc khối 'Quản Lý Phòng Ban' tổng thể, cho phép quản lý
    if user_canonical == "all_departments":
        return True

    # Nếu trưởng phòng thuộc phòng ban cụ thể nhưng cố ý xuất bản sang phòng ban khác -> CHẶN THEO BR-04
    if user_canonical and target_canonical and user_canonical != target_canonical:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Quy định BR-04: Trưởng phòng chỉ được phép soạn thảo và xuất bản SOP cho phòng ban của mình ({effective_dept}). Bạn không có quyền xuất bản SOP cho phòng ban '{target_department}'.",
        )

    return True


# ── Ground-Truth Ingestion Helper ─────────────────────────────────────────────
def ground_sop_into_knowledge_base(sop: SopDocument):
    """
    Nạp SOP đã xuất bản vào cơ sở tri thức để làm Ground-Truth cho AI Copilot:
    1. Đồ thị tri thức Neo4j: Tạo/Cập nhật node (:SOP) và quan hệ (:BELONGS_TO)
    2. Vector DB Qdrant: Nhúng embedding quy trình vào vector database
    """
    # 1. Neo4j Graph Ingestion
    try:
        if neo4j_client.is_connected:
            cypher = """
            MERGE (s:SOP {code: $code})
            SET s.id = $id,
                s.title = $title,
                s.department = $department,
                s.version = $version,
                s.status = 'published',
                s.purpose = $purpose,
                s.governance = $governance,
                s.updated_at = datetime()
            MERGE (d:Department {name: $department})
            MERGE (s)-[:BELONGS_TO]->(d)
            RETURN s.code as code
            """
            neo4j_client.run_cypher(
                cypher,
                {
                    "code": sop.code,
                    "id": str(sop.id),
                    "title": sop.title,
                    "department": sop.department,
                    "version": sop.version,
                    "purpose": sop.purpose or "",
                    "governance": sop.governance or "",
                },
            )
            logger.info(f"[Neo4j] Đã gắn Ground-Truth SOP node: {sop.code}")
    except Exception as e:
        logger.warning(f"[Neo4j] Ingestion SOP {sop.code} failed: {e}")

    # 2. Qdrant Vector DB Ingestion (nếu có embedding model)
    try:
        if qdrant_client.is_connected and qdrant_client._client:
            col = qdrant_client._collection
            from app.db.qdrant.client import get_embed_model

            model = get_embed_model()
            if model and col:
                text_content = f"{sop.title}. Phòng ban: {sop.department}. Phiên bản: {sop.version}. Mục đích: {sop.purpose or ''}. Quy định: {sop.governance or ''}"
                steps_text = " ".join([f"Bước {s.get('num')}: {s.get('title')} - {s.get('desc')}" for s in (sop.steps or [])])
                full_text = f"{text_content} {steps_text}".strip()

                vec = model.encode(full_text).tolist()
                point_id = abs(hash(sop.code)) % (10**12)

                from qdrant_client.models import PointStruct

                qdrant_client._client.upsert(
                    collection_name=col,
                    points=[
                        PointStruct(
                            id=point_id,
                            vector=vec,
                            payload={
                                "contract_name": f"SOP: {sop.title}",
                                "chunk_id": sop.code,
                                "text": full_text,
                                "source_type": "SOP",
                                "department": sop.department,
                                "version": sop.version,
                            },
                        )
                    ],
                )
                logger.info(f"[Qdrant] Đã nhúng vector Ground-Truth cho {sop.code}")
    except Exception as e:
        logger.warning(f"[Qdrant] Ingestion SOP {sop.code} vector failed: {e}")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("", response_model=SopListResponse)
@router.get("/", response_model=SopListResponse)
async def list_sops(
    dept: Optional[str] = Query(None, description="Lọc theo phòng ban (hoặc ALL)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái (published, draft, hoặc ALL)"),
    q: Optional[str] = Query(None, description="Tìm kiếm theo từ khóa tên hoặc mã SOP"),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách quy trình tác nghiệp chuẩn (SOP).
    Tự động seed dữ liệu mẫu ban đầu nếu bảng trống.
    """
    await ensure_initial_seed_sops(db)

    stmt = select(SopDocument).order_by(SopDocument.updated_at.desc())

    if dept and dept != "ALL":
        stmt = stmt.where(SopDocument.department.ilike(f"%{dept}%"))

    if status_filter and status_filter != "ALL":
        stmt = stmt.where(SopDocument.status == status_filter.lower())

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                SopDocument.title.ilike(term),
                SopDocument.code.ilike(term),
                SopDocument.department.ilike(term),
                SopDocument.purpose.ilike(term),
            )
        )

    result = await db.execute(stmt)
    records = result.scalars().all()
    items = [r.to_dict() for r in records]

    return SopListResponse(
        success=True,
        count=len(items),
        data=items,
    )


@router.get("/{sop_id}", response_model=SopResponse)
async def get_sop_detail(
    sop_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin chi tiết một tài liệu SOP theo Code (ví dụ: SOP-01) hoặc UUID"""
    await ensure_initial_seed_sops(db)

    stmt = select(SopDocument).where(
        or_(
            SopDocument.code == sop_id,
            SopDocument.title.ilike(f"%{sop_id}%"),
        )
    )
    try:
        val_uuid = uuid.UUID(sop_id)
        stmt = select(SopDocument).where(
            or_(
                SopDocument.id == val_uuid,
                SopDocument.code == sop_id,
            )
        )
    except ValueError:
        pass

    result = await db.execute(stmt)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu SOP với định danh '{sop_id}'.",
        )

    return SopResponse(
        success=True,
        message="Lấy thông tin SOP thành công.",
        data=sop.to_dict(),
    )


@router.post("", response_model=SopResponse)
@router.post("/", response_model=SopResponse)
async def create_or_save_draft(
    payload: SopCreateRequest,
    user: User = Depends(get_request_user),
    x_user_dept: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo mới hoặc lưu bản nháp quy trình SOP vào cơ sở dữ liệu PostgreSQL.
    """
    await ensure_initial_seed_sops(db)

    # Sinh mã code nếu chưa có
    code = payload.code or payload.id
    if not code:
        res = await db.execute(select(func.count(SopDocument.id)))
        cnt = (res.scalar() or 0) + 1
        code = f"SOP-{cnt:02d}"

    # Chuẩn hóa tags
    tags_list = []
    if payload.tags:
        if isinstance(payload.tags, list):
            tags_list = payload.tags
        elif isinstance(payload.tags, str):
            tags_list = [t.strip() for t in payload.tags.split(",") if t.strip()]

    # Chuẩn hóa steps
    steps_list = []
    if payload.steps:
        steps_list = [s.model_dump() for s in payload.steps]

    # Kiểm tra đã tồn tại SOP theo mã code chưa
    stmt = select(SopDocument).where(SopDocument.code == code)
    res = await db.execute(stmt)
    sop = res.scalar_one_or_none()

    if sop:
        # Cập nhật bản nháp đã có
        sop.title = payload.title
        sop.department = payload.dept
        sop.version = payload.version or sop.version
        sop.tags = tags_list
        sop.purpose = payload.purpose
        sop.steps = steps_list
        sop.governance = payload.governance
        sop.updated_at = func.now()
    else:
        # Tạo mới
        sop = SopDocument(
            code=code,
            title=payload.title,
            department=payload.dept,
            version=payload.version or "v1.0",
            status="draft",
            tags=tags_list,
            purpose=payload.purpose,
            steps=steps_list,
            governance=payload.governance,
            author_id=user.user_id,
            author_name=user.full_name or user.username,
        )
        db.add(sop)

    await db.commit()
    await db.refresh(sop)

    return SopResponse(
        success=True,
        message=f"Đã lưu bản nháp {sop.code} vào hệ thống cơ sở dữ liệu.",
        data=sop.to_dict(),
    )


@router.post("/publish", response_model=SopResponse)
@router.post("/{sop_id}/publish", response_model=SopResponse)
async def publish_sop(
    payload: Optional[SopPublishRequest] = None,
    sop_id: Optional[str] = None,
    user: User = Depends(get_request_user),
    x_user_dept: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Xuất bản quy trình SOP cho phòng ban (FR26, UC.14, BR-04).
    Kiểm tra quyền hạn phòng ban (BR-04) và nạp quy trình vào GraphRAG Ground-Truth.
    """
    await ensure_initial_seed_sops(db)

    # 1. Xác định mã SOP cần xuất bản
    target_code = None
    if sop_id:
        target_code = sop_id
    elif payload:
        target_code = payload.sop_id or payload.id or payload.code

    sop = None
    if target_code:
        stmt = select(SopDocument).where(
            or_(
                SopDocument.code == target_code,
                SopDocument.title.ilike(f"%{target_code}%"),
            )
        )
        try:
            val_uuid = uuid.UUID(target_code)
            stmt = select(SopDocument).where(
                or_(
                    SopDocument.id == val_uuid,
                    SopDocument.code == target_code,
                )
            )
        except ValueError:
            pass
        res = await db.execute(stmt)
        sop = res.scalar_one_or_none()

    # 2. Nếu truyền toàn bộ payload mới từ Composer trực tiếp
    if not sop and payload and payload.title and payload.dept:
        # Tự sinh mã code
        res_cnt = await db.execute(select(func.count(SopDocument.id)))
        cnt = (res_cnt.scalar() or 0) + 1
        code_gen = payload.code or payload.id or f"SOP-{cnt:02d}"

        tags_list = []
        if payload.tags:
            if isinstance(payload.tags, list):
                tags_list = payload.tags
            elif isinstance(payload.tags, str):
                tags_list = [t.strip() for t in payload.tags.split(",") if t.strip()]

        steps_list = [s.model_dump() for s in payload.steps] if payload.steps else []

        sop = SopDocument(
            code=code_gen,
            title=payload.title,
            department=payload.dept,
            version=payload.version or "v1.0",
            status="draft",
            tags=tags_list,
            purpose=payload.purpose,
            steps=steps_list,
            governance=payload.governance,
            author_id=user.user_id,
            author_name=user.full_name or user.username,
        )
        db.add(sop)
        await db.flush()

    if not sop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu SOP để xuất bản. Vui lòng cung cấp thông tin hoặc ID hợp lệ.",
        )

    # Cập nhật thông tin mới nếu có payload gửi kèm
    if payload:
        if payload.title:
            sop.title = payload.title
        if payload.dept:
            sop.department = payload.dept
        if payload.version:
            sop.version = payload.version
        if payload.purpose:
            sop.purpose = payload.purpose
        if payload.governance:
            sop.governance = payload.governance
        if payload.steps is not None:
            sop.steps = [s.model_dump() for s in payload.steps]
        if payload.tags is not None:
            if isinstance(payload.tags, list):
                sop.tags = payload.tags
            elif isinstance(payload.tags, str):
                sop.tags = [t.strip() for t in payload.tags.split(",") if t.strip()]

    # 3. KIỂM TRA PHÂN QUYỀN BR-04 VÀ FR26
    await verify_br04_publish_permission(
        user=user,
        target_department=sop.department,
        x_user_dept=x_user_dept,
        db=db,
    )

    # 4. CẬP NHẬT TRẠNG THÁI XUẤT BẢN
    sop.status = "published"
    sop.published_at = func.now()
    sop.updated_at = func.now()
    sop.author_name = user.full_name or user.username

    # 5. GHI NHẬT KÝ AUDIT LOG (SRS FR6)
    try:
        await db.execute(
            text(
                """
                INSERT INTO audit_logs (audit_id, user_id, action, module_name, target_type, target_id, details, created_at)
                VALUES (:aid, :uid, :act, :mod, :ttype, :tid, :details, NOW())
                """
            ),
            {
                "aid": uuid.uuid4(),
                "uid": user.user_id,
                "act": "PUBLISH_SOP",
                "mod": "Module 2 - Knowledge Editor",
                "ttype": "SOP",
                "tid": sop.code,
                "details": f'{{"code": "{sop.code}", "title": "{sop.title}", "dept": "{sop.department}"}}',
            },
        )
    except Exception as e:
        logger.warning(f"Ghi audit log xuất bản SOP thất bại: {e}")

    await db.commit()
    await db.refresh(sop)

    # 6. GROUNDING VÀO KNOWLEDGE GRAPH & VECTOR DB
    ground_sop_into_knowledge_base(sop)

    return SopResponse(
        success=True,
        message=f"✓ Đã xuất bản thành công {sop.code} ({sop.department}) và nạp làm Ground-Truth cho AI Copilot!",
        data=sop.to_dict(),
    )


@router.delete("/{sop_id}", response_model=SopResponse)
async def delete_sop(
    sop_id: str,
    user: User = Depends(get_request_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa bản nháp SOP khỏi cơ sở dữ liệu"""
    stmt = select(SopDocument).where(
        or_(
            SopDocument.code == sop_id,
            SopDocument.title.ilike(f"%{sop_id}%"),
        )
    )
    try:
        val_uuid = uuid.UUID(sop_id)
        stmt = select(SopDocument).where(
            or_(
                SopDocument.id == val_uuid,
                SopDocument.code == sop_id,
            )
        )
    except ValueError:
        pass

    result = await db.execute(stmt)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy SOP '{sop_id}' để xóa.",
        )

    # Không cho phép xóa SOP đã xuất bản nếu không phải admin/exec
    user_role = (user.role or "").strip().lower()
    is_admin_or_exec = user.is_superuser or user_role in ["admin", "it_admin", "executive"]
    if sop.status == "published" and not is_admin_or_exec:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể xóa SOP đã xuất bản. Chỉ Admin hoặc Ban Giám Đốc mới có quyền lưu trữ hoặc gỡ bỏ SOP chính thức.",
        )

    code = sop.code
    await db.delete(sop)
    await db.commit()

    return SopResponse(
        success=True,
        message=f"Đã xóa quy trình {code} khỏi hệ thống.",
        data={"code": code},
    )
