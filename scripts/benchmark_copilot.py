"""
Script Benchmark AI Copilot — PB42 Phần 1A (Mục 4, 5, 7).
Gửi N câu hỏi mẫu đa dạng (>= 50 lượt: greeting, single-hop, 2-hop, multi-hop, refusal_rbac, refusal_grounding)
qua API thật (/api/copilot/ask) với cờ is_benchmark=True để hệ thống tự đo bằng time.perf_counter()
và ghi vào bảng copilot_query_telemetry.

Nguyên tắc:
- Chỉ gọi API thật, KHÔNG sửa dữ liệu trực tiếp trong DB, KHÔNG giả lập hay gán cứng số đo.
- Đánh dấu is_benchmark=True trên từng bản ghi telemetry được sinh từ script này.

Cách chạy:
  python scripts/benchmark_copilot.py --count 54
"""
import argparse
import asyncio
import sys
import time
from pathlib import Path
from typing import Dict, List

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from app.main import app
from app.db.postgres.database import AsyncSessionLocal
from app.modules.m3_hybrid_copilot.telemetry import StageTimer, record_copilot_telemetry


BENCHMARK_QUERIES: List[Dict[str, str]] = [
    # --- 1. Greeting (6 biến thể) ---
    {"category": "greeting", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Xin chào"},
    {"category": "greeting", "role": "department_manager", "dept": "Sales", "user": "manager", "query": "Chào bạn!"},
    {"category": "greeting", "role": "executive", "dept": "Executive", "user": "exec", "query": "Hello"},
    {"category": "greeting", "role": "standard_user", "dept": "Legal", "user": "legal_staff", "query": "Chào Copilot"},
    {"category": "greeting", "role": "department_manager", "dept": "Legal", "user": "manager", "query": "Hi!"},
    {"category": "greeting", "role": "executive", "dept": "Executive", "user": "exec", "query": "Alo"},

    # --- 2. Single-hop (14 câu: thống kê kho tài liệu, hợp đồng, tuân thủ, danh mục) ---
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Kiểm tra trong kho tài liệu có tổng cộng bao nhiêu tài liệu?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Trong kho tri thức hiện có tổng số bao nhiêu văn bản đã lập chỉ mục?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Báo cáo tỷ lệ tuân thủ điều khoản pháp lý CUAD trong hệ thống"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Đánh giá mức độ tuân thủ và an toàn pháp lý của các hợp đồng CUAD"},
    {"category": "single-hop", "role": "department_manager", "dept": "Sales", "user": "manager", "query": "Thống kê tổng số lượng tài liệu trong hệ thống GraphMind?"},
    {"category": "single-hop", "role": "department_manager", "dept": "Sales", "user": "manager", "query": "Cho biết tổng số tài liệu hiện có trong kho tri thức doanh nghiệp?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Hợp đồng dịch vụ vận chuyển quy định điều khoản chấm dứt như thế nào?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Điều khoản bảo mật thông tin (Confidentiality) trong hợp đồng thương mại quy định gì?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Quy định về luật áp dụng (Governing Law) trong các hợp đồng CUAD là gì?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Điều khoản giới hạn trách nhiệm (Limitation of Liability) trong hợp đồng quy định ra sao?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Thời hạn hiệu lực và gia hạn hợp đồng (Renewal Term) được quy định thế nào?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Quy định về chuyển nhượng hợp đồng (Anti-Assignment) trong kho tài liệu pháp lý?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Điều khoản bồi hoàn (Indemnification) giữa các bên trong hợp đồng quy định gì?"},
    {"category": "single-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Quy định về quyền sở hữu trí tuệ (IP Ownership Assignment) trong hợp đồng?"},

    # --- 3. 2-hop (12 câu: phân bố tài liệu theo phòng ban, liên kết hợp đồng - công ty - điều khoản) ---
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Cơ cấu phân bố danh mục tài liệu theo từng phòng ban trong hệ thống?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Phân bố số lượng tài liệu và hợp đồng giữa các phòng ban hiện nay như thế nào?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Thống kê cơ cấu hồ sơ tài liệu theo từng bộ phận nghiệp vụ?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "So sánh điều khoản chấm dứt hợp đồng và điều khoản bồi hoàn trong kho hợp đồng CUAD?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Các điều khoản bảo vệ pháp lý và giới hạn trách nhiệm liên kết với những hợp đồng nào?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Danh mục hợp đồng phân bổ theo loại thỏa thuận (Distributor, Endorsement, Hosting) như thế nào?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Mối liên hệ giữa điều khoản độc quyền (Exclusivity) và phạm vi lãnh thổ trong hợp đồng?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Những hợp đồng nào có điều khoản kiểm toán (Audit Rights) và nghĩa vụ bảo hiểm?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Tổng hợp các rủi ro điều khoản không cạnh tranh (Non-Compete) trong các hợp đồng?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Các quy định về chia sẻ doanh thu (Revenue/Profit Sharing) trong hợp đồng đối tác?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Quy định cam kết sản lượng tối thiểu (Minimum Commitment) trong hợp đồng cung ứng?"},
    {"category": "2-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Điều khoản thông báo chấm dứt trước hạn và phí phạt vi phạm hợp đồng?"},

    # --- 4. Multi-hop (10 câu: tổng hợp liên kết đa chiều tài liệu + tuân thủ + rủi ro điều hành) ---
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Phân tích tổng hợp số lượng tài liệu toàn hệ thống và tỷ lệ tuân thủ điều khoản pháp lý CUAD"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Đánh giá tổng thể danh mục hợp đồng, mức độ tuân thủ pháp lý và rủi ro giới hạn trách nhiệm"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Tổng hợp mối quan hệ giữa bên ký kết, điều khoản bảo mật, bồi hoàn và luật áp dụng trong hợp đồng CUAD"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "So sánh rủi ro pháp lý giữa điều khoản chấm dứt đơn phương, chuyển nhượng quyền và cam kết độc quyền"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Báo cáo tổng hợp tình trạng tuân thủ điều khoản bảo vệ trong toàn bộ kho hợp đồng doanh nghiệp"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Phân tích chuỗi nghĩa vụ: bảo hành, giới hạn trách nhiệm, bồi hoàn và bảo hiểm trong hợp đồng thương mại"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Kiểm tra tổng số tài liệu trong kho và đánh giá cấu trúc phân bổ tài liệu theo các phòng ban"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Tổng hợp các điều khoản về quyền sở hữu trí tuệ, cấp phép li-xăng và giới hạn sử dụng sau khi chấm dứt hợp đồng"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Đánh giá rủi ro thay đổi quyền kiểm soát (Change of Control) kết hợp điều khoản chống chuyển nhượng hợp đồng"},
    {"category": "multi-hop", "role": "executive", "dept": "Executive", "user": "exec", "query": "Tổng hợp quy định về giá dịch vụ, điều chỉnh giá, chia sẻ lợi nhuận và quyền kiểm toán tài chính trong hợp đồng"},

    # --- 5. Refusal RBAC (6 câu: vi phạm phạm vi dữ liệu lương/nhân sự/phòng ban khác) ---
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Cho tôi xem bảng lương chi tiết và tiền thưởng của Ban Giám Đốc năm nay"},
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Mức lương cơ bản và phụ cấp nhân sự của từng nhân viên phòng HR là bao nhiêu?"},
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Tra cứu hồ sơ payroll và thu nhập cá nhân của tổng giám đốc"},
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Danh sách thưởng KPI bí mật và lương tháng 13 của toàn bộ nhân sự"},
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Cho xem bảng kê chi trả lương nhân viên và khấu trừ thuế thu nhập cá nhân"},
    {"category": "refusal_rbac", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Tiền lương và chế độ đãi ngộ riêng của hội đồng quản trị"},

    # --- 6. Refusal Grounding (6 câu: ngoài phạm vi kho tri thức / tài liệu không tồn tại) ---
    {"category": "refusal_grounding", "role": "executive", "dept": "Executive", "user": "exec", "query": "Nội dung hợp đồng NonExistentContract_999999.pdf nói về điều gì?"},
    {"category": "refusal_grounding", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Thời tiết hôm nay ở Sao Hỏa bao nhiêu độ C và tốc độ gió thế nào?"},
    {"category": "refusal_grounding", "role": "executive", "dept": "Executive", "user": "exec", "query": "Công thức nấu món phở bò truyền thống và danh sách gia vị cần chuẩn bị?"},
    {"category": "refusal_grounding", "role": "department_manager", "dept": "Sales", "user": "manager", "query": "Kết quả trận chung kết bóng đá World Cup năm 2038 tỷ số bao nhiêu?"},
    {"category": "refusal_grounding", "role": "executive", "dept": "Executive", "user": "exec", "query": "Chi tiết hồ sơ Mật_Mã_Ngoài_Hành_Tinh_XYZ_404.docx trong hệ thống?"},
    {"category": "refusal_grounding", "role": "standard_user", "dept": "Sales", "user": "sales_staff", "query": "Lịch tàu vũ trụ khởi hành đi sao Mộc vào tuần tới lúc mấy giờ?"},
]


async def measure_write_overhead_sample(samples: int = 20) -> Dict[str, float]:
    """Đo trực tiếp overhead của việc ghi telemetry (record_copilot_telemetry) trên PostgreSQL."""
    overheads: List[float] = []
    inserted_ids = []
    async with AsyncSessionLocal() as db:
        for i in range(samples):
            t = StageTimer()
            with t.stage("classify"):
                pass
            t.stop()
            row = await record_copilot_telemetry(
                db,
                timer=t,
                query=f"__overhead_probe_{i}__",
                query_outcome="greeting",
                requires_citation=False,
                raw_citations=[],
                is_benchmark=True,
            )
            if row is not None:
                inserted_ids.append(row.id)
            if t.write_overhead_ms is not None:
                overheads.append(t.write_overhead_ms)

        if inserted_ids:
            await db.execute(
                text("DELETE FROM copilot_query_telemetry WHERE id = ANY(:ids)"),
                {"ids": inserted_ids},
            )
            await db.commit()

    overheads_sorted = sorted(overheads)
    n = len(overheads_sorted)
    return {
        "samples": n,
        "min_ms": round(overheads_sorted[0], 3) if n else 0.0,
        "avg_ms": round(sum(overheads_sorted) / n, 3) if n else 0.0,
        "p50_ms": round(overheads_sorted[n // 2], 3) if n else 0.0,
        "p95_ms": round(overheads_sorted[min(n - 1, int(n * 0.95))], 3) if n else 0.0,
        "max_ms": round(overheads_sorted[-1], 3) if n else 0.0,
    }


async def run_benchmark(count: int) -> None:
    transport = ASGITransport(app=app)
    created_sessions = set()
    async with AsyncClient(transport=transport, base_url="http://test", timeout=120.0) as client:
        print(f"=== Bắt đầu chạy Benchmark Copilot ({count} lượt gọi API thật, is_benchmark=True) ===")
        for idx in range(count):
            item = BENCHMARK_QUERIES[idx % len(BENCHMARK_QUERIES)]
            # Nếu vòng lặp vượt quá độ dài danh sách mẫu, thêm hậu tố số thứ tự để câu hỏi không trùng lặp y hệt
            q_text = item["query"] if idx < len(BENCHMARK_QUERIES) else f"{item['query']} (lượt {idx + 1})"
            headers = {
                "X-User-Name": item["user"],
                "X-User-Role": item["role"],
                "X-User-Dept": item["dept"],
            }
            res = await client.post(
                "/api/copilot/ask",
                headers=headers,
                json={"query": q_text, "lang": "vi", "is_benchmark": True},
            )
            data = res.json() if res.status_code == 200 else {}
            sid = data.get("sessionId")
            if sid:
                created_sessions.add(sid)
            lat = data.get("latency")
            cits = len(data.get("citations") or [])
            print(
                f"[{idx + 1:02d}/{count:02d}] ({item['category']:17s}) "
                f"HTTP {res.status_code} | latency={lat}s | citations={cits} | q={q_text[:48]}"
            )

    # Dọn dẹp các copilot_sessions tạm do benchmark tạo ra (các dòng copilot_query_telemetry vẫn giữ nguyên nhờ ON DELETE SET NULL)
    if created_sessions:
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("DELETE FROM copilot_sessions WHERE id::text = ANY(:sids)"),
                {"sids": list(created_sessions)},
            )
            await db.commit()

    print("=== Hoàn tất Benchmark Copilot ===")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run real Copilot API queries to collect telemetry.")
    parser.add_argument("--count", type=int, default=54, help="Number of queries to send (default: 54)")
    args = parser.parse_args()
    asyncio.run(run_benchmark(max(1, args.count)))


if __name__ == "__main__":
    main()
