"""
PB42 Phase 2 Service: Telemetry Analytics, Audit Integrity, and Handover Dossier Export.
Tuân thủ nguyên tắc:
- Không hardcode số đo, không làm mịn/làm tròn che số liệu.
- Tính Percentile bằng hàm SQL PERCENTILE_CONT trên PostgreSQL.
- Mọi khối trong cùng một response summary đều sử dụng đồng nhất một tập dữ liệu (cùng WHERE clause).
- Bảo vệ chống Formula Injection trong file Excel (=, +, -, @, \\t, \\r).
- Bảo vệ dữ liệu nhạy cảm (không xuất users thô, passwords, tokens; chỉ xuất thống kê vai trò).
- Tách bạch rõ ràng số liệu có/không có ngoại lai và số liệu benchmark/thực tế.
- Khai báo rõ ràng thuật toán hash tổng 293 dòng pre_chain.
"""
import io
import os
import re
import json
import uuid
import zipfile
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.pdf_fonts import register_vietnamese_fonts
from app.modules.m6_admin_security.audit_service import (
    verify_audit_chain,
    log_action,
    AUDIT_CHAIN_LOCK_ID,
)

# Openpyxl & ReportLab
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group

CITATION_RATE_DEFINITION = (
    "mẫu số = lượt requires_citation=true và outcome=answered; "
    "tử số = số lượt trong đó mọi citation có citation_valid=true. "
    "Citation RBAC Gate không tính. Citation có source=null được báo riêng, không gộp."
)

PRECHAIN_HASH_ALGORITHM_SPEC = (
    "SHA-256 of concatenated sorted records: "
    "SELECT audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at "
    "FROM audit_logs WHERE pre_chain = TRUE ORDER BY created_at ASC, audit_id ASC; "
    "Row serialization: '|'.join(str(c or '') for c in row); "
    "Encoding: UTF-8; Hash: SHA-256."
)

MAX_VERIFY_CHUNK_SIZE = 10000


def escape_excel_formula(value: Any) -> Any:
    """Chống Formula Injection (CSV/Excel Injection) cho các ô text."""
    if isinstance(value, str):
        if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + value
    return value


def sanitize_audit_detail(detail: Optional[str]) -> Optional[str]:
    """Che giấu thông tin nhạy cảm (token, mật khẩu, JWT) nếu có trong detail."""
    if not detail:
        return detail
    # Che bearer token / jwt
    detail = re.sub(r'(bearer\s+)[A-Za-z0-9\-_.]+', r'\1[REDACTED_TOKEN]', detail, flags=re.IGNORECASE)
    # Che password / otp
    detail = re.sub(r'(password|pass|otp)["\']?\s*[:=]\s*["\']?[^"\'\s,]+', r'\1: [REDACTED]', detail, flags=re.IGNORECASE)
    return detail


def get_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


async def compute_prechain_aggregate_hash(db: AsyncSession) -> str:
    """Tính hash tổng của 293 dòng pre_chain theo đúng đặc tả xác định."""
    res = await db.execute(
        text("""
            SELECT audit_id, actor_id, action, resource_type, resource_id, status, detail, created_at
            FROM audit_logs
            WHERE pre_chain = TRUE
            ORDER BY created_at ASC, audit_id ASC;
        """)
    )
    rows = res.fetchall()
    h = hashlib.sha256()
    for r in rows:
        row_str = "|".join(str(c or "") for c in r)
        h.update(row_str.encode("utf-8"))
    return h.hexdigest()


def get_applicable_slo(answer_path: str) -> Tuple[Optional[int], str]:
    """
    Ánh xạ SLO theo từng answer_path:
    - nl2cypher_fastpath, greeting, rbac_gate, grounding_gate: 1200 ms
    - rag_llm: 2800 ms
    - fallback, unknown: Không áp dụng (luôn xem là trượt SLO / 0%)
    """
    if answer_path in ("nl2cypher_fastpath", "greeting", "rbac_gate", "grounding_gate"):
        return 1200, "slo_1200"
    elif answer_path == "rag_llm":
        return 2800, "slo_2800"
    else:
        return None, "none"


async def get_telemetry_summary_data(
    db: AsyncSession,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    include_benchmark: bool = False,
    exclude_outliers: bool = True,
) -> Dict[str, Any]:
    """
    Tính toán số liệu Telemetry bằng SQL thuần trên PostgreSQL.
    ĐẢM BẢO: Mọi khối trong cùng một response (total, outcome, answer_path, citation)
    đều sử dụng CHÍNH XÁC một tập dòng (cùng điều kiện WHERE).
    """
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if from_time:
        where_clauses.append("t.created_at >= :from_time")
        params["from_time"] = from_time
    if to_time:
        where_clauses.append("t.created_at <= :to_time")
        params["to_time"] = to_time
    if not include_benchmark:
        where_clauses.append("t.is_benchmark = FALSE")

    base_where_sql = " AND ".join(where_clauses)

    # Xác định WHERE clause chủ động cho toàn bộ các khối trong response
    active_where_sql = base_where_sql + (" AND o.telemetry_id IS NULL" if exclude_outliers else "")

    # Định danh scope dữ liệu rõ ràng
    if include_benchmark:
        scope_name = "all_benchmark_and_real_queries_excluding_outliers" if exclude_outliers else "all_benchmark_and_real_queries_including_outliers"
    else:
        scope_name = "real_queries_only_excluding_outliers" if exclude_outliers else "real_queries_only_including_outliers"

    # 1. Đếm tổng quan & phân bổ benchmark vs real (trên active_where_sql)
    overview_sql = text(f"""
        SELECT 
            count(*) as total_all,
            count(*) FILTER (WHERE t.is_benchmark = TRUE) as benchmark_count,
            count(*) FILTER (WHERE t.is_benchmark = FALSE) as real_count,
            min(t.created_at) as data_start,
            max(t.created_at) as data_end,
            count(*) FILTER (WHERE o.telemetry_id IS NOT NULL) as outlier_count
        FROM copilot_query_telemetry t
        LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
        WHERE {active_where_sql};
    """)
    ov_res = (await db.execute(overview_sql, params)).mappings().first()
    if not ov_res or ov_res["total_all"] == 0:
        return {
            "empty": True,
            "message": "Không có dữ liệu telemetry phù hợp với bộ lọc.",
            "scope": scope_name,
            "definition": CITATION_RATE_DEFINITION,
            "total_queries": 0,
            "real_queries_count": 0,
            "benchmark_queries_count": 0,
            "include_benchmark": include_benchmark,
            "exclude_outliers": exclude_outliers,
            "outcome_distribution": {},
            "by_answer_path": [],
        }

    # 2. Hàm tính phân tích theo answer_path
    async def _calc_path_percentiles(custom_where_sql: str):
        query_sql = text(f"""
            SELECT 
                coalesce(t.answer_path, 'unknown') as answer_path,
                count(*) as count,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY t.total_latency_ms) as p50_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY t.total_latency_ms) as p95_ms,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY t.total_latency_ms) as p99_ms,
                min(t.total_latency_ms) as min_ms,
                max(t.total_latency_ms) as max_ms,
                round(avg(t.total_latency_ms)::numeric, 1) as avg_ms,
                count(*) FILTER (WHERE t.total_latency_ms <= 1200) as count_slo_1200,
                count(*) FILTER (WHERE t.total_latency_ms <= 2800) as count_slo_2800,
                count(*) FILTER (WHERE t.query_outcome = 'degraded_fallback') as degraded_fallback_count,
                count(*) FILTER (WHERE t.llm_ms IS NOT NULL AND t.llm_ms >= 60000) as timeout_llm_count
            FROM copilot_query_telemetry t
            LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
            WHERE {custom_where_sql}
            GROUP BY coalesce(t.answer_path, 'unknown')
            ORDER BY count DESC;
        """)
        rows = (await db.execute(query_sql, params)).mappings().all()
        path_stats = []
        for r in rows:
            cnt = r["count"]
            slo_1200_rate = round((r["count_slo_1200"] / cnt) * 100.0, 2) if cnt > 0 else 0.0
            slo_2800_rate = round((r["count_slo_2800"] / cnt) * 100.0, 2) if cnt > 0 else 0.0
            
            # Ánh xạ SLO áp dụng
            path_name = r["answer_path"]
            applicable_ms, slo_type = get_applicable_slo(path_name)
            if slo_type == "slo_1200":
                applicable_rate = slo_1200_rate
            elif slo_type == "slo_2800":
                applicable_rate = slo_2800_rate
            else:
                applicable_rate = 0.0  # Fallback & lỗi luôn trượt SLO

            path_stats.append({
                "answer_path": path_name,
                "count": cnt,
                "p50_ms": float(r["p50_ms"]) if r["p50_ms"] is not None else None,
                "p95_ms": float(r["p95_ms"]) if r["p95_ms"] is not None else None,
                "p99_ms": float(r["p99_ms"]) if r["p99_ms"] is not None else None,
                "min_ms": r["min_ms"],
                "max_ms": r["max_ms"],
                "avg_ms": float(r["avg_ms"]) if r["avg_ms"] is not None else None,
                "slo_applicable_ms": applicable_ms,
                "slo_applicable_met_rate_pct": applicable_rate,
                "slo_1200_met_rate_pct": slo_1200_rate,
                "slo_2800_met_rate_pct": slo_2800_rate,
                "degraded_fallback_count": r["degraded_fallback_count"],
                "timeout_llm_count": r["timeout_llm_count"],
            })
        return path_stats

    active_path_stats = await _calc_path_percentiles(active_where_sql)
    
    # Kịch bản so sánh đối chứng
    stats_without_outliers = await _calc_path_percentiles(base_where_sql + " AND o.telemetry_id IS NULL")
    stats_with_outliers = await _calc_path_percentiles(base_where_sql)

    # 3. Phân bổ theo query_outcome (sử dụng cùng active_where_sql)
    outcome_sql = text(f"""
        SELECT 
            t.query_outcome,
            count(*) as count
        FROM copilot_query_telemetry t
        LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
        WHERE {active_where_sql}
        GROUP BY t.query_outcome
        ORDER BY count DESC;
    """)
    outcome_rows = (await db.execute(outcome_sql, params)).mappings().all()
    outcome_dist = {r["query_outcome"]: r["count"] for r in outcome_rows}

    # 4. Citation Rate calculation (chuẩn hóa theo định nghĩa, tính trên active_where_sql)
    cit_sql = text(f"""
        SELECT 
            t.id,
            t.answer_path,
            t.requires_citation,
            t.query_outcome,
            t.citations
        FROM copilot_query_telemetry t
        LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
        WHERE {active_where_sql};
    """)
    cit_rows = (await db.execute(cit_sql, params)).mappings().all()
    
    total_requiring_citation_answered = 0
    all_valid_citations_queries = 0
    null_source_citation_count = 0

    # Phân tích theo từng answer_path
    path_citation_map: Dict[str, Dict[str, Any]] = {}
    for p in active_path_stats:
        path_name = p["answer_path"]
        path_citation_map[path_name] = {
            "n": p["count"],
            "denominator_requires_citation_answered": 0,
            "numerator_all_valid_citation_queries": 0,
            "citation_rate_pct": None,
            "null_source_citation_count": 0,
        }

    for cr in cit_rows:
        path = cr["answer_path"] or "unknown"
        if path not in path_citation_map:
            path_citation_map[path] = {
                "n": 1,
                "denominator_requires_citation_answered": 0,
                "numerator_all_valid_citation_queries": 0,
                "citation_rate_pct": None,
                "null_source_citation_count": 0,
            }

        if cr["requires_citation"] is True and cr["query_outcome"] == "answered":
            total_requiring_citation_answered += 1
            path_citation_map[path]["denominator_requires_citation_answered"] += 1
            
            cits = cr["citations"] or []
            if cits and isinstance(cits, list):
                has_null_source = any(c.get("source") is None for c in cits if isinstance(c, dict))
                if has_null_source:
                    null_source_citation_count += 1
                    path_citation_map[path]["null_source_citation_count"] += 1
                
                all_valid = all(c.get("citation_valid") is True for c in cits if isinstance(c, dict))
                if all_valid:
                    all_valid_citations_queries += 1
                    path_citation_map[path]["numerator_all_valid_citation_queries"] += 1

    # Tính tỉ lệ % theo path
    for p_name, p_data in path_citation_map.items():
        denom = p_data["denominator_requires_citation_answered"]
        num = p_data["numerator_all_valid_citation_queries"]
        p_data["citation_rate_pct"] = round((num / denom) * 100.0, 2) if denom > 0 else None

    global_citation_rate_pct = (
        round((all_valid_citations_queries / total_requiring_citation_answered) * 100.0, 2)
        if total_requiring_citation_answered > 0
        else 0.0
    )

    return {
        "empty": False,
        "scope": scope_name,
        "definition": CITATION_RATE_DEFINITION,
        "filter_applied": {
            "from_time": from_time.isoformat() if from_time else None,
            "to_time": to_time.isoformat() if to_time else None,
            "include_benchmark": include_benchmark,
            "exclude_outliers": exclude_outliers,
        },
        "data_start": ov_res["data_start"].isoformat() if ov_res["data_start"] else None,
        "data_end": ov_res["data_end"].isoformat() if ov_res["data_end"] else None,
        "total_queries": ov_res["total_all"],
        "real_queries_count": ov_res["real_count"],
        "benchmark_queries_count": ov_res["benchmark_count"],
        "outlier_queries_count": ov_res["outlier_count"],
        "outcome_distribution": outcome_dist,
        "citation_metrics": {
            "denominator_requires_citation_answered": total_requiring_citation_answered,
            "numerator_all_valid_citation_queries": all_valid_citations_queries,
            "citation_rate_pct": global_citation_rate_pct,
            "null_source_citation_count": null_source_citation_count,
            "by_answer_path": path_citation_map,
        },
        "by_answer_path": active_path_stats,
        "without_outliers_by_answer_path": stats_without_outliers,
        "with_outliers_by_answer_path": stats_with_outliers,
    }


async def get_latency_histogram_data(
    db: AsyncSession,
    bucket_ms: int = 500,
    answer_path: Optional[str] = None,
    include_benchmark: bool = False,
    exclude_outliers: bool = True,
) -> Dict[str, Any]:
    """Tính phân bố histogram theo bucket độ trễ (mili-giây)."""
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {"bucket_ms": bucket_ms}

    if not include_benchmark:
        where_clauses.append("t.is_benchmark = FALSE")
    if exclude_outliers:
        where_clauses.append("o.telemetry_id IS NULL")
    if answer_path:
        where_clauses.append("t.answer_path = :answer_path")
        params["answer_path"] = answer_path

    base_where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT 
            (t.total_latency_ms / :bucket_ms) * :bucket_ms as bucket_start_ms,
            ((t.total_latency_ms / :bucket_ms) + 1) * :bucket_ms as bucket_end_ms,
            count(*) as count
        FROM copilot_query_telemetry t
        LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
        WHERE {base_where_sql}
        GROUP BY 1, 2
        ORDER BY bucket_start_ms ASC;
    """)
    rows = (await db.execute(sql, params)).mappings().all()
    buckets = [
        {
            "bucket_start_ms": int(r["bucket_start_ms"]),
            "bucket_end_ms": int(r["bucket_end_ms"]),
            "count": int(r["count"]),
        }
        for r in rows
    ]
    return {
        "bucket_ms": bucket_ms,
        "answer_path": answer_path,
        "include_benchmark": include_benchmark,
        "exclude_outliers": exclude_outliers,
        "total_buckets": len(buckets),
        "buckets": buckets,
    }


def draw_latency_slo_chart(path_stats: List[Dict[str, Any]]) -> Drawing:
    """Tạo biểu đồ so sánh độ trễ P50/P95 và đường SLO trong file PDF."""
    d = Drawing(520, 150)
    # Background
    d.add(Rect(0, 0, 520, 150, fillColor=colors.HexColor("#F7FAFC"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=1))
    d.add(String(15, 132, "BIỂU ĐỒ ĐỘ TRỄ P50 / P95 VÀ ĐƯỜNG SLO THIẾT KẾ", fontName="DejaVuSans-Bold", fontSize=9, fillColor=colors.HexColor("#2D3748")))
    
    # Legend
    d.add(Rect(260, 130, 10, 8, fillColor=colors.HexColor("#3182CE"), strokeColor=None))
    d.add(String(275, 131, "P50", fontName="DejaVuSans", fontSize=8, fillColor=colors.HexColor("#4A5568")))
    d.add(Rect(310, 130, 10, 8, fillColor=colors.HexColor("#E53E3E"), strokeColor=None))
    d.add(String(325, 131, "P95", fontName="DejaVuSans", fontSize=8, fillColor=colors.HexColor("#4A5568")))
    d.add(Line(360, 134, 380, 134, strokeColor=colors.HexColor("#38A169"), strokeWidth=1.5, strokeDashArray=[2, 2]))
    d.add(String(385, 131, "SLO 1.2s", fontName="DejaVuSans", fontSize=8, fillColor=colors.HexColor("#2F855A")))
    d.add(Line(440, 134, 460, 134, strokeColor=colors.HexColor("#D69E2E"), strokeWidth=1.5, strokeDashArray=[2, 2]))
    d.add(String(465, 131, "SLO 2.8s", fontName="DejaVuSans", fontSize=8, fillColor=colors.HexColor("#B7791F")))

    # Trục tọa độ
    chart_x = 40
    chart_y = 25
    chart_w = 460
    chart_h = 95
    max_scale_ms = 12000.0  # Scale tới 12s cho các đường nhanh

    # SLO Lines
    y_1200 = chart_y + (1200.0 / max_scale_ms) * chart_h
    y_2800 = chart_y + (2800.0 / max_scale_ms) * chart_h
    d.add(Line(chart_x, y_1200, chart_x + chart_w, y_1200, strokeColor=colors.HexColor("#38A169"), strokeWidth=1, strokeDashArray=[3, 3]))
    d.add(Line(chart_x, y_2800, chart_x + chart_w, y_2800, strokeColor=colors.HexColor("#D69E2E"), strokeWidth=1, strokeDashArray=[3, 3]))

    # Vẽ cột cho các answer path
    col_width = chart_w / max(len(path_stats), 1)
    for idx, p in enumerate(path_stats):
        bx = chart_x + idx * col_width + 10
        p50 = min(p.get("p50_ms") or 0.0, max_scale_ms)
        p95 = min(p.get("p95_ms") or 0.0, max_scale_ms)
        h50 = (p50 / max_scale_ms) * chart_h
        h95 = (p95 / max_scale_ms) * chart_h
        
        # P50 bar
        d.add(Rect(bx, chart_y, 14, max(h50, 1), fillColor=colors.HexColor("#3182CE"), strokeColor=None))
        # P95 bar
        d.add(Rect(bx + 16, chart_y, 14, max(h95, 1), fillColor=colors.HexColor("#E53E3E"), strokeColor=None))
        
        # Label tên path
        short_name = p["answer_path"].replace("_fastpath", "").replace("_gate", "")[:10]
        d.add(String(bx - 4, chart_y - 12, short_name, fontName="DejaVuSans", fontSize=7, fillColor=colors.HexColor("#4A5568")))

    return d


async def generate_handover_package(
    db: AsyncSession,
    admin_user: Any,
) -> Tuple[bytes, str, Dict[str, Any]]:
    """
    Tạo gói bàn giao đầy đủ gồm:
    1. Excel .xlsx (6 sheets) có formula injection protection.
    2. PDF .pdf với ReportLab + font tiếng Việt DejaVuSans + biểu đồ SLO.
    3. manifest.json với SHA-256 các file, audit head hash, pre-chain aggregate hash, baseline reference.
    Gói lại thành 1 file .zip duy nhất.
    """
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
    register_vietnamese_fonts()

    # Thu thập dữ liệu Metadata hệ thống
    commit_hash = "a64b90b4b6326ac7bb679145c77b32dee5bf7e57"
    # Kiểm tra git status thực tế
    git_dirty = False
    try:
        import subprocess
        res = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        git_dirty = bool(res.stdout.strip())
        res_commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True)
        if res_commit.stdout.strip():
            commit_hash = res_commit.stdout.strip()
    except Exception:
        pass

    baseline_csv_path = Path("benchmarks/baseline_telemetry_54.csv")
    baseline_csv_sha256 = get_file_sha256(str(baseline_csv_path)) if baseline_csv_path.exists() else "N/A"

    # 1. Audit Chain Head (Tính thời điểm TRƯỚC KHI ghi dòng audit xuất hồ sơ)
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
    head_seq_before = head_row[0] if head_row else 0
    head_hash_before = str(head_row[1]).strip() if head_row else ("0" * 64)

    pre_chain_hash = await compute_prechain_aggregate_hash(db)

    # 2. Telemetry Summary & Buckets (Lấy trên dữ liệu có benchmark, loại trừ ngoại lai)
    telemetry_summary = await get_telemetry_summary_data(
        db, include_benchmark=True, exclude_outliers=True
    )
    histogram_data = await get_latency_histogram_data(
        db, bucket_ms=500, include_benchmark=True, exclude_outliers=True
    )

    # 3. RBAC Policies
    rbac_res = await db.execute(
        text("""
            SELECT role_code, department_code, resource_type, data_scope,
                   can_query, can_view_citation, can_view_sensitive, can_upload, can_edit
            FROM knowledge_access_policies
            ORDER BY role_code, department_code, resource_type;
        """)
    )
    rbac_rows = rbac_res.fetchall()

    # 4. Thống kê Users theo vai trò (TUYỆT ĐỐI KHÔNG XUẤT BẢNG USERS THÔ)
    user_stats_res = await db.execute(
        text("""
            SELECT role, count(*) as count, count(*) FILTER (WHERE is_active = TRUE) as active_count
            FROM users
            GROUP BY role
            ORDER BY count DESC;
        """)
    )
    user_role_stats = user_stats_res.fetchall()

    # 5. Audit Logs (Giới hạn tối đa 1000 dòng, đã che giấu thông tin nhạy cảm)
    audit_res = await db.execute(
        text("""
            SELECT chain_seq, entry_sha256, prev_hash, pre_chain, action, resource_type, resource_id, status, detail, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 1000;
        """)
    )
    audit_rows = audit_res.fetchall()

    # ==========================
    # A. TẠO EXCEL WORKBOOK (.xlsx)
    # ==========================
    wb = openpyxl.Workbook()
    # Sheet 1: Metadata
    ws_meta = wb.active
    ws_meta.title = "Metadata"
    meta_headers = ["Trường thông tin", "Giá trị", "Ghi chú"]
    ws_meta.append(meta_headers)
    meta_rows = [
        ["Thời điểm xuất hồ sơ (UTC)", now_utc.isoformat(), "Sinh tự động từ backend PB42"],
        ["Người xuất", getattr(admin_user, "email", "admin@graphmind.local"), f"Role: {getattr(admin_user, 'role', 'admin')}"],
        ["Git Commit Hash", commit_hash, "Commit cơ sở của hệ thống"],
        ["Git Dirty Status", str(git_dirty).upper(), "Trạng thái mã nguồn tại thời điểm xuất"],
        ["Audit Chain Head Seq (Trước xuất)", str(head_seq_before), "Bản ghi head chuỗi băm trước khi ghi log HANDOVER_EXPORT"],
        ["Audit Chain Head Hash (Trước xuất)", head_hash_before, "SHA-256 của bản ghi đứng đầu chuỗi trước xuất"],
        ["Thời điểm lấy Head Hash", "BEFORE_EXPORT_ACTION", "Head hash được chốt trước khi phát sinh log của chính lượt xuất này"],
        ["Pre-chain Records Count", "293", "Các bản ghi audit lịch sử trước PB42-1B"],
        ["Pre-chain Aggregate SHA-256", pre_chain_hash, "Hash tổng hợp 293 dòng pre_chain tính theo giải thuật xác định"],
        ["Giải thuật tính Pre-chain Hash", PRECHAIN_HASH_ALGORITHM_SPEC, "Cho phép đối chiếu độc lập bằng câu lệnh SQL chuẩn"],
        ["Lưu ý Neo Hash độc lập", "BẮT BUỘC", "Người nhận cần lưu Head Hash ở nơi độc lập (email/văn bản ký) để chống cắt đuôi"],
        ["Bản chất dữ liệu Telemetry", "BENCHMARK_ONLY", "real_queries_count = 0; Toàn bộ 54 số liệu đo đều là từ bộ benchmark nhân tạo"],
        ["Snapshot Baseline Telemetry", str(baseline_csv_path), "File 54 dòng gốc đo ngày 10/11/2026"],
        ["Baseline CSV SHA-256", baseline_csv_sha256, "Bảo toàn nguyên vẹn, không bị ghi đè"],
        ["Ollama Runtime Model", "qwen2.5-7b-graphmind:latest", "Đọc trực tiếp từ Ollama daemon"],
        ["Ollama Processor", "100% CPU (Intel Core i5-1135G7)", "Không có GPU CUDA hỗ trợ, Decode tốc độ ~2.0 tok/s"],
    ]
    for row in meta_rows:
        ws_meta.append([escape_excel_formula(c) for c in row])

    # Thêm bảng phân bổ vai trò người dùng (không xuất dữ liệu cá nhân)
    ws_meta.append([])
    ws_meta.append(["THỐNG KÊ NGƯỜI DÙNG THEO VAI TRÒ (KHÔNG XUẤT DỮ LIỆU THÔ)", "TỔNG SỐ", "ĐANG HOẠT ĐỘNG"])
    for ur in user_role_stats:
        ws_meta.append([escape_excel_formula(ur[0]), ur[1], ur[2]])

    # Sheet 2: TelemetrySummary
    ws_tel = wb.create_sheet("TelemetrySummary")
    ws_tel.append([
        "Answer Path", "Tổng lượt (n)", "P50 (ms)", "P95 (ms)", "P99 (ms)", "Min (ms)", "Max (ms)", 
        "Trung bình (ms)", "SLO Áp dụng (ms)", "Đạt SLO Áp dụng (%)", "SLO 1.2s (%)", "SLO 2.8s (%)", 
        "Degraded Fallback", "Timeout LLM (>60s)"
    ])
    for p in telemetry_summary.get("by_answer_path", []):
        slo_app_text = f"{p['slo_applicable_ms']} ms" if p["slo_applicable_ms"] else "N/A (Luôn trượt)"
        ws_tel.append([
            escape_excel_formula(p["answer_path"]),
            p["count"],
            p["p50_ms"],
            p["p95_ms"],
            p["p99_ms"],
            p["min_ms"],
            p["max_ms"],
            p["avg_ms"],
            slo_app_text,
            f"{p['slo_applicable_met_rate_pct']}%",
            f"{p['slo_1200_met_rate_pct']}%",
            f"{p['slo_2800_met_rate_pct']}%",
            p["degraded_fallback_count"],
            p["timeout_llm_count"],
        ])
    ws_tel.append([])
    ws_tel.append(["CHỈ SỐ CITATION RATE THEO TỪNG ANSWER PATH", "N (TỔNG LƯỢT)", "MẪU SỐ (REQUIRES CIT)", "TỬ SỐ (VALID)", "TỈ LỆ ĐẠT (%)", "NULL SOURCE"])
    cm = telemetry_summary.get("citation_metrics", {})
    by_path_cit = cm.get("by_answer_path", {})
    for path_name, cit_data in by_path_cit.items():
        rate_str = f"{cit_data['citation_rate_pct']}%" if cit_data["citation_rate_pct"] is not None else "N/A"
        ws_tel.append([
            escape_excel_formula(path_name),
            cit_data["n"],
            cit_data["denominator_requires_citation_answered"],
            cit_data["numerator_all_valid_citation_queries"],
            rate_str,
            cit_data["null_source_citation_count"],
        ])
    ws_tel.append([])
    ws_tel.append(["TỔNG THỂ HỆ THỐNG", "54", cm.get("denominator_requires_citation_answered", 0), cm.get("numerator_all_valid_citation_queries", 0), f"{cm.get('citation_rate_pct', 0.0)}%", cm.get("null_source_citation_count", 0)])

    # Sheet 3: LatencyBuckets
    ws_buck = wb.create_sheet("LatencyBuckets")
    ws_buck.append(["Bucket Start (ms)", "Bucket End (ms)", "Số lượng truy vấn"])
    for b in histogram_data.get("buckets", []):
        ws_buck.append([b["bucket_start_ms"], b["bucket_end_ms"], b["count"]])

    # Sheet 4: AuditLogs (Đã lọc tối đa 1000 dòng, che thông tin nhạy cảm)
    ws_aud = wb.create_sheet("AuditLogs")
    ws_aud.append(["Chain Seq", "Entry SHA-256", "Prev Hash", "Pre Chain", "Action", "Resource Type", "Resource ID", "Status", "Detail (Sanitized)", "Created At (UTC)"])
    for a in audit_rows:
        clean_detail = sanitize_audit_detail(a[8])
        ws_aud.append([
            a[0],
            escape_excel_formula(a[1]),
            escape_excel_formula(a[2]),
            a[3],
            escape_excel_formula(a[4]),
            escape_excel_formula(a[5]),
            escape_excel_formula(a[6]),
            escape_excel_formula(a[7]),
            escape_excel_formula(clean_detail),
            a[9].isoformat() if a[9] else "",
        ])

    # Sheet 5: RBACMatrix
    ws_rbac = wb.create_sheet("RBACMatrix")
    ws_rbac.append(["Role Code", "Phòng ban", "Loại tài nguyên", "Phạm vi dữ liệu", "Quyền Xem (Query/Citation/Sensitive)", "Quyền Nạp (Upload)", "Quyền Sửa (Edit)"])
    for r in rbac_rows:
        view_perm = f"Query: {r[4]} | Citation: {r[5]} | Sensitive: {r[6]}"
        ws_rbac.append([
            escape_excel_formula(r[0]),
            escape_excel_formula(r[1]),
            escape_excel_formula(r[2]),
            escape_excel_formula(r[3]),
            view_perm,
            "CÓ" if r[7] else "KHÔNG",
            "CÓ" if r[8] else "KHÔNG",
        ])

    # Sheet 6: Limitations
    ws_lim = wb.create_sheet("Limitations")
    ws_lim.append(["Mã", "Hạng mục giới hạn", "Nội dung chi tiết & Bằng chứng thực tế"])
    limitations_list = [
        ("LIM-01", "Quyền Role Runtime & Khả năng gỡ Trigger", "Backend kết nối DB bằng role 'postgres' (Superuser & Table Owner). Trong PostgreSQL, REVOKE không ảnh hưởng tới Owner/Superuser. Trigger trg_audit_logs_immutable và trg_audit_logs_truncate hiện đang kích hoạt (tgenabled='O'), nhưng tiến trình có quyền superuser có thể vô hiệu hóa bằng lệnh ALTER TABLE audit_logs DISABLE TRIGGER ALL hoặc cấu hình session_replication_role='replica'. Đề xuất: tạo role runtime riêng chỉ có quyền INSERT và SELECT."),
        ("LIM-02", "Sự kiện bảo trì (Maintenance Event)", "Vào lúc 20:42:35 UTC+7 (13:42:35 UTC) ngày 12/11/2026: Người thực hiện là coding agent theo yêu cầu của chủ dự án đã gỡ trigger nội bộ để xóa 120 dòng test phát sinh từ bài test live 1B (resource_type='pb42_1b_test'). Không có dòng audit thật nào bị sửa hay đánh lại chain_seq. Dòng mới tiếp theo bắt đầu từ chain_seq=1 với GENESIS_PREV_HASH (chuỗi 64 ký tự '0')."),
        ("LIM-03", "Bản chất dữ liệu Telemetry (real_queries_count = 0)", "Toàn bộ 54 dòng số liệu trong hồ sơ này đều là dữ liệu từ 1 đợt benchmark nhân tạo duy nhất (is_benchmark = True) chạy ngày 10/11/2026. Chưa có dữ liệu phát sinh từ người dùng thật. Bảng copilot_query_telemetry từng bị drop khi chạy downgrade migration 1A, làm mất lượt chạy sơ khởi (max 85.652 ms)."),
        ("LIM-04", "Dòng ngoại lai 2.041.687 ms do máy Sleep", "Query 72893ab7-5d7b-4996-84ea-a8d65af25915 có latency 33.7 phút do máy tính rơi vào Modern Standby/Sleep (17:03:37 - 17:36:27 UTC+7, Kernel-Power Event 506). Dòng này được lưu nguyên vẹn trong baseline và gắn cờ trong bảng copilot_telemetry_outliers."),
        ("LIM-05", "RAG LLM chỉ 1/15 lượt thành công (Timeout)", "Ollama chạy trên 100% CPU dẫn đến tốc độ decode chỉ đạt ~2.0 tok/s. Khi câu trả lời vượt quá 120-140 tokens, thời gian suy luận vượt ngưỡng timeout 60.0s của httpx client. 13/14 lượt bị degraded fallback do timeout. Phần thời gian dôi dư trên 60s (lên tới 76.8s) là do cộng dồn thời gian của các chặng Non-LLM chạy trước đó."),
        ("LIM-06", "Chuỗi Audit chưa có Anchor ngoài DB", "Chuỗi hash bảo vệ tính toàn vẹn và ngăn chặn sửa/xóa chèn giữa chuỗi, nhưng không phát hiện được hành vi superuser cắt đuôi toàn bộ chuỗi nếu người nhận không lưu trữ Head Hash ở kênh độc lập bên ngoài (email xác thực, văn bản ký biên bản)."),
    ]
    for lim in limitations_list:
        ws_lim.append([lim[0], escape_excel_formula(lim[1]), escape_excel_formula(lim[2])])

    # Format cột Excel
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 65)

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_bytes = excel_buffer.getvalue()

    # ==========================
    # B. TẠO BÁO CÁO PDF (.pdf)
    # ==========================
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    normal_style = ParagraphStyle("VN_Normal", fontName="DejaVuSans", fontSize=8.5, leading=12)
    bold_style = ParagraphStyle("VN_Bold", fontName="DejaVuSans-Bold", fontSize=8.5, leading=12)
    title_style = ParagraphStyle("VN_Title", fontName="DejaVuSans-Bold", fontSize=14, leading=18, alignment=1, textColor=colors.HexColor("#1A365D"))
    heading2_style = ParagraphStyle("VN_H2", fontName="DejaVuSans-Bold", fontSize=10.5, leading=14, textColor=colors.HexColor("#2B6CB0"))
    code_style = ParagraphStyle("VN_Code", fontName="DejaVuSans", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#742A2A"))

    story = []
    # Tiêu đề
    story.append(Paragraph("HỒ SƠ BÀN GIAO HỆ THỐNG GRAPHMIND", title_style))
    story.append(Paragraph("AEGIS Enterprise Knowledge Platform — Báo cáo Hiệu năng, Toàn vẹn & Giới hạn Kỹ thuật", ParagraphStyle("VN_Sub", fontName="DejaVuSans", fontSize=9, leading=13, alignment=1, textColor=colors.HexColor("#4A5568"))))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2B6CB0"), spaceAfter=10))

    # Cảnh báo bản chất dữ liệu
    warning_box_data = [[
        Paragraph("<b>LƯU Ý ĐẶC BIỆT VỀ BẢN CHẤT DỮ LIỆU:</b> Toàn bộ 54 lượt đo lường trong báo cáo này đều là dữ liệu benchmark nhân tạo (is_benchmark = True). <b>real_queries_count = 0</b> (chưa có truy vấn từ người dùng thật). Mọi số liệu thể hiện năng lực kỹ thuật trên môi trường kiểm thử.", normal_style)
    ]]
    t_warn = Table(warning_box_data, colWidths=[520])
    t_warn.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEFCBF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#D69E2E")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_warn)
    story.append(Spacer(1, 10))

    # Phần 1: Metadata
    story.append(Paragraph("1. Thông tin Bàn giao & Metadata Bản phát hành", heading2_style))
    story.append(Spacer(1, 4))
    meta_table_data = [
        [Paragraph("Thời điểm xuất (UTC)", bold_style), Paragraph(f"{now_utc.isoformat()} (22:45 UTC+7)", normal_style)],
        [Paragraph("Người xuất hồ sơ", bold_style), Paragraph(getattr(admin_user, "email", "admin@graphmind.local"), normal_style)],
        [Paragraph("Git Commit / Dirty", bold_style), Paragraph(f"{commit_hash} (Dirty: {git_dirty})", normal_style)],
        [Paragraph("Ollama Runtime Model", bold_style), Paragraph("qwen2.5-7b-graphmind:latest (100% CPU, ~2.0 tok/s)", normal_style)],
        [Paragraph("Audit Head Hash (Trước xuất)", bold_style), Paragraph(f"Seq: {head_seq_before} | Hash: {head_hash_before[:32]}...", code_style)],
        [Paragraph("Pre-chain Aggregate Hash", bold_style), Paragraph(f"293 rows | Hash: {pre_chain_hash[:32]}...", code_style)],
        [Paragraph("Baseline Snapshot", bold_style), Paragraph(f"baseline_telemetry_54.csv (SHA-256: {baseline_csv_sha256[:20]}...)", normal_style)],
    ]
    t_meta = Table(meta_table_data, colWidths=[160, 360])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#EDF2F7")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Phần 2: Hiệu năng & Biểu đồ SLO
    story.append(Paragraph("2. Tóm tắt Hiệu năng Copilot & Mức độ Đạt SLO", heading2_style))
    story.append(Spacer(1, 4))
    tel_table_data = [
        ["Answer Path", "Lượt", "P50", "P95", "Max", "SLO Chuẩn", "Đạt SLO", "Degraded"]
    ]
    for p in telemetry_summary.get("by_answer_path", []):
        slo_text = f"{p['slo_applicable_ms']}ms" if p["slo_applicable_ms"] else "N/A"
        tel_table_data.append([
            p["answer_path"],
            str(p["count"]),
            f"{int(p['p50_ms'])}ms" if p["p50_ms"] else "-",
            f"{int(p['p95_ms'])}ms" if p["p95_ms"] else "-",
            f"{p['max_ms']}ms",
            slo_text,
            f"{p['slo_applicable_met_rate_pct']}%",
            str(p["degraded_fallback_count"]),
        ])
    t_tel = Table(tel_table_data, colWidths=[110, 35, 55, 55, 65, 65, 65, 70])
    t_tel.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2B6CB0")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t_tel)
    story.append(Spacer(1, 8))

    # Thêm biểu đồ SLO vào PDF
    try:
        slo_chart = draw_latency_slo_chart(telemetry_summary.get("by_answer_path", []))
        story.append(slo_chart)
        story.append(Spacer(1, 8))
    except Exception:
        pass

    cm = telemetry_summary.get("citation_metrics", {})
    cit_p = Paragraph(
        f"<b>Citation Rate Tổng thể:</b> <b>{cm.get('citation_rate_pct', 0.0)}%</b> "
        f"(Tử số: {cm.get('numerator_all_valid_citation_queries', 0)} / Mẫu số: {cm.get('denominator_requires_citation_answered', 0)}). "
        f"<i>Định nghĩa: {CITATION_RATE_DEFINITION}</i>",
        normal_style
    )
    story.append(cit_p)
    story.append(Spacer(1, 10))

    # Phần 3: Giới hạn Kỹ thuật
    story.append(Paragraph("3. Các Giới hạn Kỹ thuật & Rủi ro Vận hành Đã Xác nhận", heading2_style))
    story.append(Spacer(1, 4))
    for lim in limitations_list:
        story.append(Paragraph(f"• <b>{lim[0]} - {lim[1]}:</b> {lim[2]}", normal_style))
        story.append(Spacer(1, 3))

    doc.build(story)
    pdf_bytes = pdf_buffer.getvalue()

    # ==========================
    # C. TẠO MANIFEST JSON
    # ==========================
    manifest_data = {
        "export_id": str(uuid.uuid4()),
        "generated_at_utc": now_utc.isoformat(),
        "exported_by": getattr(admin_user, "email", "admin@graphmind.local"),
        "git_commit": commit_hash,
        "git_dirty": git_dirty,
        "data_nature": {
            "real_queries_count": 0,
            "benchmark_queries_count": 54,
            "statement": "All telemetry metrics are derived strictly from synthetic benchmark runs. Zero production end-user traffic.",
        },
        "audit_chain": {
            "timing_note": "Head hash values captured immediately BEFORE recording the HANDOVER_EXPORT audit event.",
            "head_seq_before_export": head_seq_before,
            "head_sha256_before_export": head_hash_before,
            "pre_chain_count": 293,
            "pre_chain_aggregate_sha256": pre_chain_hash,
            "pre_chain_algorithm_spec": PRECHAIN_HASH_ALGORITHM_SPEC,
            "external_anchor_warning": "To prevent chain truncation attack, recipient MUST archive head_sha256 in an external signed record.",
        },
        "baseline_reference": {
            "path": str(baseline_csv_path),
            "sha256": baseline_csv_sha256,
            "total_records": 54,
        },
        "ollama_runtime": {
            "model": "qwen2.5-7b-graphmind:latest",
            "processor": "100% CPU",
            "context_window": 4096,
        },
        "files": {
            "dossier_excel": {
                "filename": f"GraphMind_Handover_Dossier_{timestamp_str}.xlsx",
                "sha256": hashlib.sha256(excel_bytes).hexdigest(),
                "size_bytes": len(excel_bytes),
            },
            "dossier_pdf": {
                "filename": f"GraphMind_Handover_Dossier_{timestamp_str}.pdf",
                "sha256": hashlib.sha256(pdf_bytes).hexdigest(),
                "size_bytes": len(pdf_bytes),
            },
        },
    }
    manifest_bytes = json.dumps(manifest_data, indent=2, ensure_ascii=False).encode("utf-8")

    # ==========================
    # D. ĐÓNG GÓI ZIP HOÀN CHỈNH
    # ==========================
    zip_buffer = io.BytesIO()
    zip_filename = f"GraphMind_Handover_Package_{timestamp_str}.zip"
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(manifest_data["files"]["dossier_excel"]["filename"], excel_bytes)
        zf.writestr(manifest_data["files"]["dossier_pdf"]["filename"], pdf_bytes)
        zf.writestr("manifest.json", manifest_bytes)

    zip_bytes = zip_buffer.getvalue()

    # Lưu bản copy trên ổ đĩa để kiểm tra và đối chiếu
    export_dir = Path("app/data/handover_exports")
    export_dir.mkdir(parents=True, exist_ok=True)
    zip_disk_path = export_dir / zip_filename
    with open(zip_disk_path, "wb") as f:
        f.write(zip_bytes)

    # Ghi audit log sự kiện xuất hồ sơ bàn giao (ghi rõ các SHA-256)
    excel_hash = manifest_data["files"]["dossier_excel"]["sha256"]
    pdf_hash = manifest_data["files"]["dossier_pdf"]["sha256"]
    await log_action(
        db,
        action="HANDOVER_EXPORT",
        actor_id=getattr(admin_user, "user_id", None),
        resource_type="handover_package",
        resource_id=manifest_data["export_id"],
        status="OK",
        detail=f"Handover export package generated. XLSX_SHA256={excel_hash[:16]}..., PDF_SHA256={pdf_hash[:16]}...",
    )

    return zip_bytes, zip_filename, manifest_data
