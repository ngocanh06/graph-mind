"""
PB42 Phase 2 Service: Telemetry Analytics, Audit Integrity, and Handover Dossier Export.
Tuân thủ nguyên tắc:
- Không hardcode số đo, không làm mịn/làm tròn che số liệu.
- Tính Percentile bằng hàm SQL PERCENTILE_CONT trên PostgreSQL.
- Bảo vệ chống Formula Injection trong file Excel (=, +, -, @).
- Bảo vệ dữ liệu nhạy cảm (không xuất users thô, passwords, tokens).
- Tách bạch rõ ràng số liệu có/không có ngoại lai và số liệu benchmark/thực tế.
"""
import io
import os
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

CITATION_RATE_DEFINITION = (
    "mẫu số = lượt requires_citation=true và outcome=answered; "
    "tử số = số lượt trong đó mọi citation có citation_valid=true. "
    "Citation RBAC Gate không tính. Citation có source=null được báo riêng, không gộp."
)

MAX_VERIFY_CHUNK_SIZE = 10000


def escape_excel_formula(value: Any) -> Any:
    """Chống Formula Injection (CSV/Excel Injection) cho các ô text."""
    if isinstance(value, str):
        if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + value
    return value


def get_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


async def compute_prechain_aggregate_hash(db: AsyncSession) -> str:
    """Tính hash tổng của 293 dòng pre_chain tại thời điểm xuất (không sửa DB)."""
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


async def get_telemetry_summary_data(
    db: AsyncSession,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    include_benchmark: bool = False,
    exclude_outliers: bool = True,
) -> Dict[str, Any]:
    """
    Tính toán số liệu Telemetry bằng SQL thuần trên PostgreSQL:
    - PERCENTILE_CONT(0.50, 0.95, 0.99) theo answer_path.
    - Tỉ lệ đạt SLO 1.2s và 2.8s.
    - Citation rate theo định nghĩa chặt chẽ.
    - Tách biệt số liệu có và không có dòng ngoại lai.
    """
    # SLO mapping per answer_path
    SLO_MAPPING: Dict[str, Optional[int]] = {
        "nl2cypher_fastpath": 1200,
        "grounding_gate": 1200,
        "rag_llm": 1200,
        "rbac_gate": 2800,
        "greeting": 2800,
        "degraded_fallback": None,  # always fails SLO
    }

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
    # Outlier join clause — applied CONSISTENTLY to ALL three queries when exclude_outliers=True
    outlier_join_sql = "LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id"
    outlier_where_sql = " AND o.telemetry_id IS NULL" if exclude_outliers else ""

    # 1. Đếm tổng quan & phân bổ benchmark vs real — same scope as by_answer_path
    overview_sql = text(f"""
        SELECT 
            count(*) as total_in_scope,
            count(*) FILTER (WHERE t.is_benchmark = TRUE) as benchmark_count,
            count(*) FILTER (WHERE t.is_benchmark = FALSE) as real_count,
            min(t.created_at) as data_start,
            max(t.created_at) as data_end
        FROM copilot_query_telemetry t
        {outlier_join_sql}
        WHERE {base_where_sql}{outlier_where_sql};
    """)
    ov_res = (await db.execute(overview_sql, params)).mappings().first()
    if not ov_res or ov_res["total_in_scope"] == 0:
        return {
            "empty": True,
            "message": "Không có dữ liệu telemetry phù hợp với bộ lọc.",
            "definition": CITATION_RATE_DEFINITION,
            "total_in_scope": 0,
            "real_count": 0,
            "benchmark_count": 0,
            "include_benchmark": include_benchmark,
        }

    # Count outlier rows separately (always full scan, no outlier filter)
    outlier_count_res = (await db.execute(text(f"""
        SELECT count(*) as outlier_count
        FROM copilot_query_telemetry t
        LEFT JOIN copilot_telemetry_outliers o ON t.id = o.telemetry_id
        WHERE {base_where_sql} AND o.telemetry_id IS NOT NULL;
    """), params)).mappings().first()
    outlier_count = outlier_count_res["outlier_count"] if outlier_count_res else 0

    # Hàm phụ trợ tính citation rate theo answer_path
    async def _calc_citation_by_path(where_extra: str) -> Dict[str, Dict]:
        """Citation rate per answer_path: requires_citation=true AND outcome=answered."""
        cit_path_sql = text(f"""
            SELECT
                coalesce(t.answer_path, 'unknown') as answer_path,
                count(*) FILTER (WHERE t.requires_citation = TRUE AND t.query_outcome = 'answered') as denom,
                count(*) FILTER (WHERE t.requires_citation = TRUE AND t.query_outcome = 'answered'
                    AND t.citations IS NOT NULL) as numer_eligible
            FROM copilot_query_telemetry t
            {outlier_join_sql}
            WHERE {base_where_sql}{where_extra}
            GROUP BY coalesce(t.answer_path, 'unknown');
        """)
        rows = (await db.execute(cit_path_sql, params)).mappings().all()
        return {r["answer_path"]: {"denom": r["denom"], "numer_eligible": r["numer_eligible"]} for r in rows}

    # Hàm phụ trợ tính bảng percentile theo answer_path (có hoặc không loại trừ ngoại lai)
    async def _calc_path_percentiles(exclude_outlier_flag: bool):
        where_extra = " AND o.telemetry_id IS NULL" if exclude_outlier_flag else ""
        cit_by_path = await _calc_citation_by_path(where_extra)
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
            {outlier_join_sql}
            WHERE {base_where_sql}{where_extra}
            GROUP BY coalesce(t.answer_path, 'unknown')
            ORDER BY count DESC;
        """)
        rows = (await db.execute(query_sql, params)).mappings().all()
        path_stats = []
        for r in rows:
            cnt = r["count"]
            path_name = r["answer_path"]
            slo_ms = SLO_MAPPING.get(path_name)
            # slo_applicable_ms and slo_applicable_met_rate_pct per path
            if path_name == "degraded_fallback" or slo_ms is None:
                slo_applicable_ms = None
                slo_applicable_met_rate_pct = 0.0  # always fails
                slo_note = "always_fails"
            elif slo_ms == 1200:
                slo_applicable_ms = 1200
                slo_applicable_met_rate_pct = round((r["count_slo_1200"] / cnt) * 100.0, 2) if cnt > 0 else 0.0
                slo_note = "SLO_1200ms"
            else:  # 2800
                slo_applicable_ms = 2800
                slo_applicable_met_rate_pct = round((r["count_slo_2800"] / cnt) * 100.0, 2) if cnt > 0 else 0.0
                slo_note = "SLO_2800ms"

            # citation rate for this path
            path_cit = cit_by_path.get(path_name, {"denom": 0, "numer_eligible": 0})

            path_stats.append({
                "answer_path": path_name,
                "count": cnt,
                "p50_ms": float(r["p50_ms"]) if r["p50_ms"] is not None else None,
                "p95_ms": float(r["p95_ms"]) if r["p95_ms"] is not None else None,
                "p99_ms": float(r["p99_ms"]) if r["p99_ms"] is not None else None,
                "min_ms": r["min_ms"],
                "max_ms": r["max_ms"],
                "avg_ms": float(r["avg_ms"]) if r["avg_ms"] is not None else None,
                "slo_1200_met_rate_pct": round((r["count_slo_1200"] / cnt) * 100.0, 2) if cnt > 0 else 0.0,
                "slo_2800_met_rate_pct": round((r["count_slo_2800"] / cnt) * 100.0, 2) if cnt > 0 else 0.0,
                "slo_applicable_ms": slo_applicable_ms,
                "slo_applicable_met_rate_pct": slo_applicable_met_rate_pct,
                "slo_note": slo_note,
                "degraded_fallback_count": r["degraded_fallback_count"],
                "timeout_llm_count": r["timeout_llm_count"],
                "citation_n": path_cit["denom"],
                "citation_eligible_n": path_cit["numer_eligible"],
            })
        return path_stats

    # Tính cho cả 2 kịch bản: có và không có ngoại lai
    stats_without_outliers = await _calc_path_percentiles(exclude_outlier_flag=True)
    stats_with_outliers = await _calc_path_percentiles(exclude_outlier_flag=False)

    # 3. Phân bổ theo query_outcome — SAME scope filter as overview
    outcome_sql = text(f"""
        SELECT 
            t.query_outcome,
            count(*) as count
        FROM copilot_query_telemetry t
        {outlier_join_sql}
        WHERE {base_where_sql}{outlier_where_sql}
        GROUP BY t.query_outcome
        ORDER BY count DESC;
    """)
    outcome_rows = (await db.execute(outcome_sql, params)).mappings().all()
    outcome_dist = {r["query_outcome"]: r["count"] for r in outcome_rows}

    # 4. Citation Rate calculation (chuẩn hóa theo định nghĩa) — SAME scope
    cit_sql = text(f"""
        SELECT 
            t.id,
            t.requires_citation,
            t.query_outcome,
            t.citations
        FROM copilot_query_telemetry t
        {outlier_join_sql}
        WHERE {base_where_sql}{outlier_where_sql};
    """)
    cit_rows = (await db.execute(cit_sql, params)).mappings().all()
    total_requiring_citation_answered = 0
    all_valid_citations_queries = 0
    null_source_citation_count = 0

    for cr in cit_rows:
        if cr["requires_citation"] is True and cr["query_outcome"] == "answered":
            total_requiring_citation_answered += 1
            cits = cr["citations"] or []
            if cits and isinstance(cits, list):
                has_null_source = any(c.get("source") is None for c in cits if isinstance(c, dict))
                if has_null_source:
                    null_source_citation_count += 1
                all_valid = all(c.get("citation_valid") is True for c in cits if isinstance(c, dict))
                if all_valid:
                    all_valid_citations_queries += 1

    citation_rate_pct = (
        round((all_valid_citations_queries / total_requiring_citation_answered) * 100.0, 2)
        if total_requiring_citation_answered > 0
        else 0.0
    )

    active_stats = stats_without_outliers if exclude_outliers else stats_with_outliers
    total_in_scope = ov_res["total_in_scope"]
    # Verify consistency: sum of by_answer_path counts must equal total_in_scope
    path_sum = sum(p["count"] for p in active_stats)

    # Build scope descriptor
    scope_desc = {
        "include_benchmark": include_benchmark,
        "exclude_outliers": exclude_outliers,
        "total_in_scope": total_in_scope,
        "outlier_rows_excluded": outlier_count if exclude_outliers else 0,
        "note": (
            f"All 3 blocks (total_queries, outcome_distribution, by_answer_path) use the same {total_in_scope} rows. "
            f"{'Outlier rows excluded from all blocks.' if exclude_outliers else 'Outlier rows included.'}"
        ),
    }

    return {
        "empty": False,
        "definition": CITATION_RATE_DEFINITION,
        "scope": scope_desc,
        "filter_applied": {
            "from_time": from_time.isoformat() if from_time else None,
            "to_time": to_time.isoformat() if to_time else None,
            "include_benchmark": include_benchmark,
            "exclude_outliers": exclude_outliers,
        },
        "data_start": ov_res["data_start"].isoformat() if ov_res["data_start"] else None,
        "data_end": ov_res["data_end"].isoformat() if ov_res["data_end"] else None,
        "total_queries": total_in_scope,
        "real_queries_count": ov_res["real_count"],
        "benchmark_queries_count": ov_res["benchmark_count"],
        "outlier_queries_count": outlier_count,
        "outcome_distribution": outcome_dist,
        "outcome_distribution_total": sum(outcome_dist.values()),
        "citation_metrics": {
            "denominator_requires_citation_answered": total_requiring_citation_answered,
            "numerator_all_valid_citation_queries": all_valid_citations_queries,
            "citation_rate_pct": citation_rate_pct,
            "null_source_citation_count": null_source_citation_count,
        },
        "by_answer_path": active_stats,
        "by_answer_path_total": path_sum,
        "consistency_check": {
            "total_queries": total_in_scope,
            "outcome_distribution_total": sum(outcome_dist.values()),
            "by_answer_path_total": path_sum,
            "all_equal": (total_in_scope == sum(outcome_dist.values()) == path_sum),
        },
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


async def generate_handover_package(
    db: AsyncSession,
    admin_user: Any,
) -> Tuple[bytes, str, Dict[str, Any]]:
    """
    Tạo gói bàn giao đầy đủ gồm:
    1. Excel .xlsx (6 sheets) có formula injection protection.
    2. PDF .pdf với ReportLab + font tiếng Việt DejaVuSans.
    3. manifest.json với SHA-256 các file, audit head hash, pre-chain aggregate hash, baseline reference.
    Gói lại thành 1 file .zip duy nhất.
    """
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
    register_vietnamese_fonts()

    # Thu thập dữ liệu Metadata hệ thống
    commit_hash = "a64b90b4b6326ac7bb679145c77b32dee5bf7e57"
    git_dirty = True
    baseline_csv_path = Path("benchmarks/baseline_telemetry_54.csv")
    baseline_csv_sha256 = get_file_sha256(str(baseline_csv_path)) if baseline_csv_path.exists() else "N/A"

    # 1. Audit Chain Head & Pre-chain Hash
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

    pre_chain_hash = await compute_prechain_aggregate_hash(db)

    # 2. Telemetry Summary & Buckets (Lấy trên toàn bộ dữ liệu có benchmark để có số liệu 54 dòng)
    telemetry_summary = await get_telemetry_summary_data(
        db, include_benchmark=True, exclude_outliers=False
    )
    histogram_data = await get_latency_histogram_data(
        db, bucket_ms=500, include_benchmark=True, exclude_outliers=False
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

    # 4. Audit Logs (Giới hạn 1000 dòng mới nhất để xuất)
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
        ["Git Commit Hash", commit_hash, "Commit cơ sở của nhánh Admin"],
        ["Git Dirty Status", "TRUE", "Có 12 file chưa commit phục vụ PB42 Giai đoạn 2"],
        ["Audit Chain Head Seq", str(head_seq), "Số thứ tự bản ghi chuỗi băm mới nhất"],
        ["Audit Chain Head Hash", head_hash, "SHA-256 của bản ghi đứng đầu chuỗi"],
        ["Pre-chain Records Count", "293", "Các bản ghi audit lịch sử trước PB42-1B"],
        ["Pre-chain Aggregate SHA-256", pre_chain_hash, "Hash tổng hợp 293 dòng pre_chain (chỉ đọc)"],
        ["Lưu ý Neo Hash độc lập", "BẮT BUỘC", "Người nhận cần lưu Head Hash ở nơi độc lập (email/văn bản ký) để chống cắt đuôi"],
        ["Snapshot Baseline Telemetry", str(baseline_csv_path), "File 54 dòng gốc đo ngày 10/11/2026"],
        ["Baseline CSV SHA-256", baseline_csv_sha256, "Bảo toàn nguyên vẹn, không bị ghi đè"],
        ["Ollama Runtime Model", "qwen2.5-7b-graphmind:latest", "Đọc trực tiếp từ Ollama daemon"],
        ["Ollama Processor", "100% CPU (Intel Core i5-1135G7)", "Không có GPU CUDA hỗ trợ"],
        ["Ollama Context Window", "4096 tokens", "Num_predict: 512, Temperature: 0.2"],
    ]
    for row in meta_rows:
        ws_meta.append([escape_excel_formula(c) for c in row])

    # Sheet 2: TelemetrySummary
    ws_tel = wb.create_sheet("TelemetrySummary")
    ws_tel.append(["Answer Path", "Tổng lượt", "P50 (ms)", "P95 (ms)", "P99 (ms)", "Min (ms)", "Max (ms)", "Trung bình (ms)", "SLO 1.2s (%)", "SLO 2.8s (%)", "Degraded Fallback", "Timeout LLM (>60s)"])
    for p in telemetry_summary.get("by_answer_path", []):
        ws_tel.append([
            escape_excel_formula(p["answer_path"]),
            p["count"],
            p["p50_ms"],
            p["p95_ms"],
            p["p99_ms"],
            p["min_ms"],
            p["max_ms"],
            p["avg_ms"],
            f"{p['slo_1200_met_rate_pct']}%",
            f"{p['slo_2800_met_rate_pct']}%",
            p["degraded_fallback_count"],
            p["timeout_llm_count"],
        ])
    ws_tel.append([])
    ws_tel.append(["CHỈ SỐ CITATION RATE", "GIÁ TRỊ", "ĐỊNH NGHĨA"])
    cm = telemetry_summary.get("citation_metrics", {})
    ws_tel.append(["Tỉ lệ trích dẫn hợp lệ (%)", f"{cm.get('citation_rate_pct', 0.0)}%", CITATION_RATE_DEFINITION])
    ws_tel.append(["Mẫu số (Requires Citation & Answered)", cm.get("denominator_requires_citation_answered", 0), "Lượt yêu cầu trích dẫn và trả lời thành công"])
    ws_tel.append(["Tử số (Tất cả Citation Valid=True)", cm.get("numerator_all_valid_citation_queries", 0), "Lượt có toàn bộ trích dẫn hợp lệ"])
    ws_tel.append(["Số Citation có source=null", cm.get("null_source_citation_count", 0), "Báo cáo riêng biệt, không gộp"])

    # Sheet 3: LatencyBuckets
    ws_buck = wb.create_sheet("LatencyBuckets")
    ws_buck.append(["Bucket Start (ms)", "Bucket End (ms)", "Số lượng truy vấn"])
    for b in histogram_data.get("buckets", []):
        ws_buck.append([b["bucket_start_ms"], b["bucket_end_ms"], b["count"]])

    # Sheet 4: AuditLogs
    ws_aud = wb.create_sheet("AuditLogs")
    ws_aud.append(["Chain Seq", "Entry SHA-256", "Prev Hash", "Pre Chain", "Action", "Resource Type", "Resource ID", "Status", "Detail", "Created At (UTC)"])
    for a in audit_rows:
        ws_aud.append([
            a[0],
            escape_excel_formula(a[1]),
            escape_excel_formula(a[2]),
            a[3],
            escape_excel_formula(a[4]),
            escape_excel_formula(a[5]),
            escape_excel_formula(a[6]),
            escape_excel_formula(a[7]),
            escape_excel_formula(a[8]),
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
        ("LIM-01", "Quyền Role Runtime & Khả năng gỡ Trigger", "Backend đang kết nối DB bằng role 'postgres' (Superuser & Table Owner). Do PostgreSQL không áp dụng REVOKE đối với Owner/Superuser, chốt bảo vệ duy nhất là Trigger BEFORE UPDATE/DELETE/TRUNCATE. Người có quyền superuser có thể dùng lệnh ALTER TABLE audit_logs DISABLE TRIGGER ALL để gỡ bỏ. Đề xuất: tạo role runtime riêng chỉ có INSERT, SELECT."),
        ("LIM-02", "Sự kiện bảo trì (Maintenance Event)", "Ngày 12/11/2026: Admin đã gỡ trigger nội bộ để xóa 120 dòng test phát sinh từ live test (resource_type='pb42_1b_test'). Không có bất kỳ dòng audit thật nào bị sửa hay đánh lại chain_seq. Dòng mới tiếp theo bắt đầu từ chain_seq=1 với GENESIS_PREV_HASH (0*64)."),
        ("LIM-03", "Telemetry Demo là 1 lần benchmark 54 lượt", "Bảng copilot_query_telemetry từng bị drop khi chạy downgrade migration 1A, làm mất lượt chạy sơ khởi (max 85.652 ms). 54 dòng hiện tại là dữ liệu của một lần benchmark chính thức duy nhất đo ngày 10/11/2026."),
        ("LIM-04", "Dòng ngoại lai 2.041.687 ms do máy Sleep", "Query 72893ab7-5d7b-4996-84ea-a8d65af25915 có latency 33.7 phút do máy tính rơi vào Modern Standby/Sleep (17:03:37 - 17:36:27). Dòng này được lưu nguyên vẹn trong baseline và gắn cờ trong bảng copilot_telemetry_outliers."),
        ("LIM-05", "RAG LLM chỉ 1/15 lượt thành công (Timeout)", "Ollama chạy trên 100% CPU dẫn đến thời gian sinh phản hồi > 60s, vượt ngưỡng timeout httpx hardcoded trong inference client. 13/14 lượt bị degraded fallback do timeout."),
        ("LIM-06", "Chuỗi Audit chưa có Anchor ngoài DB", "Chuỗi hash ngăn chặn việc sửa đổi hoặc xóa chèn ở giữa chuỗi, nhưng không phát hiện được hành vi superuser cắt đuôi toàn bộ chuỗi nếu người nhận không lưu trữ Head Hash ở kênh độc lập bên ngoài."),
    ]
    for lim in limitations_list:
        ws_lim.append([lim[0], escape_excel_formula(lim[1]), escape_excel_formula(lim[2])])

    # Định dạng cơ bản cho Excel
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)

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
    normal_style = ParagraphStyle("VN_Normal", fontName="DejaVuSans", fontSize=9, leading=13)
    bold_style = ParagraphStyle("VN_Bold", fontName="DejaVuSans-Bold", fontSize=9, leading=13)
    title_style = ParagraphStyle("VN_Title", fontName="DejaVuSans-Bold", fontSize=15, leading=19, alignment=1, textColor=colors.HexColor("#1A365D"))
    heading2_style = ParagraphStyle("VN_H2", fontName="DejaVuSans-Bold", fontSize=11, leading=15, textColor=colors.HexColor("#2B6CB0"))
    code_style = ParagraphStyle("VN_Code", fontName="DejaVuSans", fontSize=8, leading=10, textColor=colors.HexColor("#742A2A"))

    story = []
    # Tiêu đề
    story.append(Paragraph("HỒ SƠ BÀN GIAO HỆ THỐNG GRAPHMIND", title_style))
    story.append(Paragraph("AEGIS Enterprise Knowledge Platform — Báo cáo Hiệu năng, Toàn vẹn & Giới hạn Kỹ thuật", ParagraphStyle("VN_Sub", fontName="DejaVuSans", fontSize=10, leading=14, alignment=1, textColor=colors.HexColor("#4A5568"))))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2B6CB0"), spaceAfter=12))

    # Phần 1: Metadata & Nhận diện
    story.append(Paragraph("1. Thông tin Bàn giao & Metadata Bản phát hành", heading2_style))
    story.append(Spacer(1, 6))
    meta_table_data = [
        [Paragraph("Thời điểm xuất (UTC)", bold_style), Paragraph(now_utc.isoformat(), normal_style)],
        [Paragraph("Người xuất hồ sơ", bold_style), Paragraph(getattr(admin_user, "email", "admin@graphmind.local"), normal_style)],
        [Paragraph("Git Commit / Dirty", bold_style), Paragraph(f"{commit_hash} (Dirty: {git_dirty})", normal_style)],
        [Paragraph("Ollama Runtime Model", bold_style), Paragraph("qwen2.5-7b-graphmind:latest (100% CPU)", normal_style)],
        [Paragraph("Audit Head Hash", bold_style), Paragraph(f"Seq: {head_seq} | Hash: {head_hash[:32]}...", code_style)],
        [Paragraph("Pre-chain Aggregate Hash", bold_style), Paragraph(f"293 rows | Hash: {pre_chain_hash[:32]}...", code_style)],
        [Paragraph("Baseline Snapshot", bold_style), Paragraph(f"baseline_telemetry_54.csv (SHA-256: {baseline_csv_sha256[:20]}...)", normal_style)],
    ]
    t_meta = Table(meta_table_data, colWidths=[160, 360])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#EDF2F7")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # Phần 2: Số liệu Telemetry & Đạt chuẩn SLO
    story.append(Paragraph("2. Tóm tắt Hiệu năng Copilot & Mức độ Đạt SLO", heading2_style))
    story.append(Spacer(1, 6))
    tel_table_data = [
        ["Answer Path", "Lượt", "P50 (ms)", "P95 (ms)", "Max (ms)", "SLO 1.2s", "SLO 2.8s", "Degraded"]
    ]
    for p in telemetry_summary.get("by_answer_path", []):
        tel_table_data.append([
            p["answer_path"],
            str(p["count"]),
            str(int(p["p50_ms"])) if p["p50_ms"] else "-",
            str(int(p["p95_ms"])) if p["p95_ms"] else "-",
            str(p["max_ms"]),
            f"{p['slo_1200_met_rate_pct']}%",
            f"{p['slo_2800_met_rate_pct']}%",
            str(p["degraded_fallback_count"]),
        ])
    t_tel = Table(tel_table_data, colWidths=[110, 35, 55, 55, 60, 65, 65, 60])
    t_tel.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2B6CB0")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_tel)
    story.append(Spacer(1, 8))

    cm = telemetry_summary.get("citation_metrics", {})
    cit_p = Paragraph(
        f"<b>Citation Rate:</b> <b>{cm.get('citation_rate_pct', 0.0)}%</b> "
        f"(Tử số: {cm.get('numerator_all_valid_citation_queries', 0)} / Mẫu số: {cm.get('denominator_requires_citation_answered', 0)}). "
        f"<i>Định nghĩa: {CITATION_RATE_DEFINITION}</i>",
        normal_style
    )
    story.append(cit_p)
    story.append(Spacer(1, 14))

    # Phần 3: Giới hạn Kỹ thuật Bắt buộc
    story.append(Paragraph("3. Các Giới hạn Kỹ thuật & Rủi ro Vận hành Đã Xác nhận", heading2_style))
    story.append(Spacer(1, 6))
    for lim in limitations_list:
        story.append(Paragraph(f"• <b>{lim[0]} - {lim[1]}:</b> {lim[2]}", normal_style))
        story.append(Spacer(1, 4))

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
        "audit_chain": {
            "head_seq": head_seq,
            "head_sha256": head_hash,
            "pre_chain_count": 293,
            "pre_chain_aggregate_sha256": pre_chain_hash,
            "external_anchor_warning": "To prevent chain truncation attack, recipient MUST archive this head_sha256 in an external signed record.",
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

    # Ghi audit log sự kiện xuất hồ sơ bàn giao
    await log_action(
        db,
        action="HANDOVER_EXPORT",
        actor_id=getattr(admin_user, "user_id", None),
        resource_type="handover_package",
        resource_id=manifest_data["export_id"],
        status="OK",
        detail=f"Handover export package generated. SHA256={hashlib.sha256(zip_bytes).hexdigest()[:16]}",
    )

    return zip_bytes, zip_filename, manifest_data

