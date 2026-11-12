"""
PB42 Router: Handover Dossier & Telemetry Analytics Endpoints.
Endpoints:
- GET  /api/v1/pb42/telemetry/summary: Số liệu tổng quan P50/P95/P99 theo answer_path, SLO, citation rate
- GET  /api/v1/pb42/telemetry/latency-histogram: Phân bố độ trễ theo khoảng mili-giây
- GET  /api/v1/pb42/audit/integrity: Kiểm tra toàn vẹn chuỗi băm theo phân đoạn (rate limit 10 req/phút)
- POST /api/v1/pb42/handover-export: Xuất gói hồ sơ bàn giao (.zip chứa .xlsx, .pdf, manifest.json)
"""
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres.database import get_db
from app.modules.m6_admin_security.deps import get_admin_user
from app.modules.m6_admin_security.audit_service import verify_audit_chain
from app.modules.m6_admin_security.user_admin_api import _check_verify_rate_limit, MAX_VERIFY_CHUNK_SIZE
from app.modules.m6_admin_security.pb42_service import (
    get_telemetry_summary_data,
    get_latency_histogram_data,
    generate_handover_package,
    compute_prechain_aggregate_hash,
)

router = APIRouter(prefix="/pb42", tags=["PB42 Handover & Telemetry"])


@router.get("/telemetry/summary")
async def get_telemetry_summary_endpoint(
    from_time: Optional[datetime] = Query(None, description="Thời điểm bắt đầu (UTC)"),
    to_time: Optional[datetime] = Query(None, description="Thời điểm kết thúc (UTC)"),
    include_benchmark: bool = Query(False, description="Có bao gồm dữ liệu benchmark hay không (mặc định False)"),
    exclude_outliers: bool = Query(True, description="Có loại trừ dòng ngoại lai (máy Sleep) hay không (mặc định True)"),
    db: AsyncSession = Depends(get_db),
    admin_user: Any = Depends(get_admin_user),
) -> Dict[str, Any]:
    """
    API số liệu Telemetry chuẩn xác (Chỉ Admin):
    - Tính P50/P95/P99/min/max/avg qua hàm SQL PERCENTILE_CONT trên PostgreSQL.
    - Tỉ lệ đạt SLO 1.2s và 2.8s theo answer_path.
    - Citation rate theo định nghĩa chuẩn xác (tách riêng null source).
    - Cung cấp cả số liệu có và không có ngoại lai.
    """
    return await get_telemetry_summary_data(
        db,
        from_time=from_time,
        to_time=to_time,
        include_benchmark=include_benchmark,
        exclude_outliers=exclude_outliers,
    )


@router.get("/telemetry/latency-histogram")
async def get_latency_histogram_endpoint(
    bucket_ms: int = Query(500, ge=50, le=10000, description="Kích thước bucket độ trễ (ms)"),
    answer_path: Optional[str] = Query(None, description="Lọc theo answer_path cụ thể"),
    include_benchmark: bool = Query(False, description="Có bao gồm dữ liệu benchmark hay không"),
    exclude_outliers: bool = Query(True, description="Có loại trừ dòng ngoại lai hay không"),
    db: AsyncSession = Depends(get_db),
    admin_user: Any = Depends(get_admin_user),
) -> Dict[str, Any]:
    """Phân bố độ trễ histogram của hệ thống."""
    return await get_latency_histogram_data(
        db,
        bucket_ms=bucket_ms,
        answer_path=answer_path,
        include_benchmark=include_benchmark,
        exclude_outliers=exclude_outliers,
    )


@router.get("/audit/integrity")
async def get_audit_integrity_endpoint(
    from_seq: Optional[int] = Query(None, ge=1, description="Seq bắt đầu kiểm tra"),
    to_seq: Optional[int] = Query(None, ge=1, description="Seq kết thúc kiểm tra"),
    db: AsyncSession = Depends(get_db),
    admin_user: Any = Depends(get_admin_user),
) -> Dict[str, Any]:
    """
    Kiểm tra tính toàn vẹn của chuỗi băm audit_logs theo đoạn.
    Áp dụng rate limit 10 req/phút và giới hạn tối đa 10,000 bản ghi/đoạn.
    """
    _check_verify_rate_limit(str(getattr(admin_user, "user_id", "admin")))

    if from_seq is not None and to_seq is not None:
        if to_seq < from_seq:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="to_seq phải lớn hơn hoặc bằng from_seq",
            )
        chunk_size = to_seq - from_seq + 1
        if chunk_size > MAX_VERIFY_CHUNK_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kích thước đoạn kiểm tra ({chunk_size}) vượt quá giới hạn tối đa ({MAX_VERIFY_CHUNK_SIZE})",
            )

    is_valid, checked_count, broken_at_seq, pre_chain_count = await verify_audit_chain(
        db, from_seq=from_seq, to_seq=to_seq
    )

    # Lấy thông tin head
    head_res = await db.execute(
        text("""
            SELECT chain_seq, entry_sha256
            FROM audit_logs
            WHERE pre_chain = FALSE AND chain_seq IS NOT NULL
            ORDER BY chain_seq DESC
            LIMIT 1;
        """)
    )
    head_row = head_res.fetchone()
    head_seq = head_row[0] if head_row else 0
    head_hash = str(head_row[1]).strip() if head_row else ("0" * 64)
    pre_chain_agg_hash = await compute_prechain_aggregate_hash(db)

    return {
        "is_valid": is_valid,
        "checked_count": checked_count,
        "broken_at_seq": broken_at_seq,
        "pre_chain_count": pre_chain_count,
        "head_chain_seq": head_seq,
        "head_entry_sha256": head_hash,
        "pre_chain_aggregate_sha256": pre_chain_agg_hash,
        "scope_note": "Phạm vi hash là phương án (b) 10 trường ORM; 293 dòng pre_chain không có hash chuỗi.",
        "external_anchor_requirement": "Cần neo giữ Head Hash ở hệ thống lưu trữ bên ngoài để ngăn chặn tấn công cắt đuôi chuỗi.",
    }


@router.post("/handover-export")
async def export_handover_package_endpoint(
    db: AsyncSession = Depends(get_db),
    admin_user: Any = Depends(get_admin_user),
):
    """
    Xuất trọn gói hồ sơ bàn giao hệ thống (.zip chứa .xlsx, .pdf, manifest.json).
    Chỉ dành riêng cho Quản trị viên (Admin).
    """
    zip_bytes, zip_filename, manifest_data = await generate_handover_package(db, admin_user)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={zip_filename}",
            "X-Handover-Export-ID": manifest_data["export_id"],
        },
    )
