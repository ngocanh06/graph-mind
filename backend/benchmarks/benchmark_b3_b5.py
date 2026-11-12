"""
B3 & B5 Benchmark Script:
Đo đạc chi tiết hiệu năng Ollama trên prompt RAG thực tế (~2.8k tokens):
- Cấu hình 1: Model 7B hiện tại, num_predict = 512 (≥ 10 lượt)
- Cấu hình 2: Model 7B hiện tại, num_predict = 150 (≥ 10 lượt)
- Ghi nhận: load_duration, prompt_eval_count, prompt_eval_duration, eval_count, eval_duration,
  tok/s prefill, tok/s decode, Time To First Token (TTFT), tỉ lệ timeout > 60s.
"""
import asyncio
import time
import json
import httpx

# Tạo prompt thực tế ~2.8k tokens
PARAGRAPH = """
Điều 4. QUY TRÌNH QUẢN LÝ VÀ PHÊ DUYỆT TÀI LIỆU NỘI BỘ
1. Ban hành tài liệu: Mọi quy chế, chính sách, hướng dẫn kỹ thuật của công ty AEGIS Enterprise phải được soạn thảo theo biểu mẫu chuẩn M-01. Bản thảo phải được gửi qua Hệ thống Phê duyệt Điện tử ít nhất 05 ngày làm việc trước ngày dự kiến ban hành.
2. Thẩm định pháp lý và tuân thủ: Ban Pháp chế & Kiểm soát Tuân thủ chịu trách nhiệm thẩm tra tính hợp pháp, tính tương thích với các quy định pháp luật hiện hành và chính sách nội bộ. Thời hạn thẩm định tối đa là 03 ngày làm việc đối với tài liệu thường và 24 giờ đối với tài liệu khẩn cấp.
3. Phân cấp thẩm quyền ký duyệt: Tổng Giám đốc ký ban hành Quy chế công ty và các chính sách tài chính có giá trị trên 500 triệu đồng. Phó Tổng Giám đốc phụ trách khối ký ban hành Quy trình tác nghiệp chuyên môn và hướng dẫn công việc.
4. Quản lý phiên bản và lưu trữ: Mỗi tài liệu được cấp mã định danh duy nhất (DocID). Khi có sửa đổi, số phiên bản (Version) phải được tăng theo nguyên tắc: thay đổi lớn tăng số nguyên (1.0 -> 2.0), thay đổi nhỏ tăng số thập phân (1.0 -> 1.1). Tài liệu hết hiệu lực phải được chuyển vào kho lưu trữ điện tử trong vòng 24 giờ.
5. Bảo mật và phân quyền truy cập: Dữ liệu phân loại theo 4 cấp độ: Công khai (Public), Nội bộ (Internal), Mật (Confidential), và Tối mật (Strictly Confidential). Tài liệu Mật chỉ được truy cập bởi nhân sự có vai trò Manager trở lên hoặc được phân quyền cụ thể theo ma trận RBAC.
"""
# Lặp lại để đạt ~2,800 tokens ngữ cảnh
REAL_RAG_CONTEXT = (PARAGRAPH * 10).strip()
QUESTION = "Hãy tóm tắt chi tiết thẩm quyền ký duyệt các chính sách tài chính, quy trình thẩm định pháp lý và quy tắc tăng số phiên bản tài liệu theo Điều 4."
PROMPT = f"Dưới đây là tài liệu quy định nội bộ của tổ chức:\n\n{REAL_RAG_CONTEXT}\n\nCâu hỏi: {QUESTION}\nTrả lời chi tiết dựa trên tài liệu:"

URL = "http://127.0.0.1:11434/api/generate"
MODEL_7B = "qwen2.5-7b-graphmind:latest"


async def run_single_benchmark(client: httpx.AsyncClient, model: str, num_predict: int, run_idx: int):
    t_start = time.perf_counter()
    ttft = None
    chunks_count = 0
    generated_tokens = 0
    final_data = {}

    req_body = {
        "model": model,
        "prompt": PROMPT,
        "stream": True,
        "options": {
            "num_predict": num_predict,
            "temperature": 0.2,
        }
    }

    async with client.stream("POST", URL, json=req_body, timeout=180.0) as resp:
        async for line in resp.aiter_lines():
            if not line:
                continue
            now = time.perf_counter()
            if ttft is None:
                ttft = now - t_start
            chunks_count += 1
            chunk = json.loads(line)
            if chunk.get("done") is True:
                final_data = chunk
                break

    total_time = time.perf_counter() - t_start
    p_count = final_data.get("prompt_eval_count", 0)
    p_dur_ms = final_data.get("prompt_eval_duration", 0) / 1e6
    e_count = final_data.get("eval_count", 0)
    e_dur_ms = final_data.get("eval_duration", 0) / 1e6
    load_dur_ms = final_data.get("load_duration", 0) / 1e6

    prefill_tok_s = (p_count / (p_dur_ms / 1000.0)) if p_dur_ms > 0 else 0.0
    decode_tok_s = (e_count / (e_dur_ms / 1000.0)) if e_dur_ms > 0 else 0.0

    result = {
        "run": run_idx,
        "prompt_tokens": p_count,
        "eval_tokens": e_count,
        "ttft_seconds": round(ttft, 2) if ttft else None,
        "total_seconds": round(total_time, 2),
        "load_duration_ms": round(load_dur_ms, 1),
        "prompt_eval_duration_ms": round(p_dur_ms, 1),
        "eval_duration_ms": round(e_dur_ms, 1),
        "prefill_tok_s": round(prefill_tok_s, 2),
        "decode_tok_s": round(decode_tok_s, 2),
        "is_timeout_over_60s": total_time > 60.0,
    }
    print(
        f"  Run #{run_idx:02d}: TTFT = {result['ttft_seconds']}s | "
        f"Total = {result['total_seconds']}s | "
        f"Prompt: {p_count} tok ({result['prefill_tok_s']} tok/s) | "
        f"Gen: {e_count} tok ({result['decode_tok_s']} tok/s) | "
        f"Timeout(>60s): {result['is_timeout_over_60s']}",
        flush=True,
    )
    return result


async def run_suite(model: str, num_predict: int, n_runs: int, suite_name: str):
    print(f"\n=======================================================")
    print(f"BẮT ĐẦU {suite_name}: Model={model}, num_predict={num_predict}, n={n_runs}")
    print(f"=======================================================", flush=True)

    results = []
    async with httpx.AsyncClient() as client:
        for i in range(1, n_runs + 1):
            res = await run_single_benchmark(client, model, num_predict, i)
            results.append(res)

    avg_ttft = sum(r["ttft_seconds"] for r in results) / len(results)
    avg_total = sum(r["total_seconds"] for r in results) / len(results)
    avg_prefill = sum(r["prefill_tok_s"] for r in results) / len(results)
    avg_decode = sum(r["decode_tok_s"] for r in results) / len(results)
    timeout_count = sum(1 for r in results if r["is_timeout_over_60s"])
    timeout_rate = (timeout_count / len(results)) * 100.0

    summary = {
        "suite_name": suite_name,
        "model": model,
        "num_predict": num_predict,
        "runs": len(results),
        "avg_prompt_tokens": results[0]["prompt_tokens"] if results else 0,
        "avg_eval_tokens": sum(r["eval_tokens"] for r in results) / len(results),
        "avg_ttft_seconds": round(avg_ttft, 2),
        "avg_total_seconds": round(avg_total, 2),
        "avg_prefill_tok_s": round(avg_prefill, 2),
        "avg_decode_tok_s": round(avg_decode, 2),
        "timeout_count_over_60s": timeout_count,
        "timeout_rate_pct": round(timeout_rate, 2),
        "raw_results": results,
    }

    print(f"\n--- TỔNG KẾT {suite_name} ---")
    print(f"  Prompt Tokens: {summary['avg_prompt_tokens']}")
    print(f"  Avg TTFT (Time To First Token): {summary['avg_ttft_seconds']}s")
    print(f"  Avg Total Time: {summary['avg_total_seconds']}s")
    print(f"  Avg Prefill Speed: {summary['avg_prefill_tok_s']} tok/s")
    print(f"  Avg Decode Speed: {summary['avg_decode_tok_s']} tok/s")
    print(f"  Tỉ lệ vượt mốc 60s timeout: {timeout_count}/{len(results)} ({summary['timeout_rate_pct']}%)", flush=True)
    return summary


async def main():
    # 1. Cấu hình 1 (B3 & B5.1): Model 7B, num_predict = 512, 10 lượt
    cfg1 = await run_suite(MODEL_7B, num_predict=512, n_runs=10, suite_name="CẤU HÌNH 1 (7B, num_predict=512)")
    
    # 2. Cấu hình 2 (B5.3): Model 7B, num_predict = 150, 10 lượt
    cfg2 = await run_suite(MODEL_7B, num_predict=150, n_runs=10, suite_name="CẤU HÌNH 2 (7B, num_predict=150)")

    # Lưu kết quả đo đạc thật ra file JSON
    with open("benchmarks/ollama_rag_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump({"cfg1_7b_512": cfg1, "cfg2_7b_150": cfg2}, f, indent=2, ensure_ascii=False)
    print("\nĐã lưu toàn bộ kết quả đo đạc B3 & B5 vào benchmarks/ollama_rag_benchmark_results.json")

if __name__ == "__main__":
    asyncio.run(main())

