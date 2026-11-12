import time
import json
import httpx

PARAGRAPH = """
Điều 4. QUY TRÌNH QUẢN LÝ VÀ PHÊ DUYỆT TÀI LIỆU NỘI BỘ
1. Ban hành tài liệu: Mọi quy chế, chính sách, hướng dẫn kỹ thuật của công ty AEGIS Enterprise phải được soạn thảo theo biểu mẫu chuẩn M-01. Bản thảo phải được gửi qua Hệ thống Phê duyệt Điện tử ít nhất 05 ngày làm việc trước ngày dự kiến ban hành.
2. Thẩm định pháp lý và tuân thủ: Ban Pháp chế & Kiểm soát Tuân thủ chịu trách nhiệm thẩm tra tính hợp pháp, tính tương thích với các quy định pháp luật hiện hành và chính sách nội bộ. Thời hạn thẩm định tối đa là 03 ngày làm việc đối với tài liệu thường và 24 giờ đối với tài liệu khẩn cấp.
3. Phân cấp thẩm quyền ký duyệt: Tổng Giám đốc ký ban hành Quy chế công ty và các chính sách tài chính có giá trị trên 500 triệu đồng. Phó Tổng Giám đốc phụ trách khối ký ban hành Quy trình tác nghiệp chuyên môn và hướng dẫn công việc.
4. Quản lý phiên bản và lưu trữ: Mỗi tài liệu được cấp mã định danh duy nhất (DocID). Khi có sửa đổi, số phiên bản (Version) phải được tăng theo nguyên tắc: thay đổi lớn tăng số nguyên (1.0 -> 2.0), thay đổi nhỏ tăng số thập phân (1.0 -> 1.1). Tài liệu hết hiệu lực phải được chuyển vào kho lưu trữ điện tử trong vòng 24 giờ.
5. Bảo mật và phân quyền truy cập: Dữ liệu phân loại theo 4 cấp độ: Công khai (Public), Nội bộ (Internal), Mật (Confidential), và Tối mật (Strictly Confidential). Tài liệu Mật chỉ được truy cập bởi nhân sự có vai trò Manager trở lên hoặc được phân quyền cụ thể theo ma trận RBAC.
"""
# 6 paragraphs = 2,718 tokens + question = ~2,800 tokens
REAL_RAG_CONTEXT = (PARAGRAPH * 6).strip()
QUESTION = "Hãy tóm tắt ngắn gọn thẩm quyền ký duyệt chính sách tài chính và thời hạn thẩm định pháp lý theo quy định trên."
PROMPT = f"{REAL_RAG_CONTEXT}\n\nCâu hỏi: {QUESTION}\nTrả lời:"

URL = "http://127.0.0.1:11434/api/generate"
MODEL_7B = "qwen2.5-7b-graphmind:latest"


def run_benchmark_trial(num_predict: int, trial_idx: int):
    t0 = time.perf_counter()
    ttft = None
    final_chunk = {}
    timeout_cfg = httpx.Timeout(300.0, connect=10.0, read=300.0, write=60.0)

    with httpx.Client(timeout=timeout_cfg) as client:
        with client.stream("POST", URL, json={
            "model": MODEL_7B,
            "prompt": PROMPT,
            "stream": True,
            "options": {"num_predict": num_predict, "temperature": 0.2}
        }) as resp:
            for line in resp.iter_lines():
                if not line:
                    continue
                if ttft is None:
                    ttft = time.perf_counter() - t0
                c = json.loads(line)
                if c.get("done"):
                    final_chunk = c
                    break

    total = time.perf_counter() - t0
    p_cnt = final_chunk.get("prompt_eval_count", 0)
    p_dur_ms = final_chunk.get("prompt_eval_duration", 0) / 1e6
    e_cnt = final_chunk.get("eval_count", 0)
    e_dur_ms = final_chunk.get("eval_duration", 0) / 1e6
    load_ms = final_chunk.get("load_duration", 0) / 1e6

    prefill_s = (p_cnt / (p_dur_ms / 1000.0)) if p_dur_ms > 0 else 0
    decode_s = (e_cnt / (e_dur_ms / 1000.0)) if e_dur_ms > 0 else 0

    res = {
        "trial": trial_idx,
        "prompt_tokens": p_cnt,
        "eval_tokens": e_cnt,
        "ttft_s": round(ttft, 2) if ttft else None,
        "total_s": round(total, 2),
        "load_ms": round(load_ms, 1),
        "prefill_tok_s": round(prefill_s, 2),
        "decode_tok_s": round(decode_s, 2),
        "over_60s": total > 60.0,
    }
    print(f"Trial #{trial_idx:02d}: TTFT={res['ttft_s']}s, Total={res['total_s']}s, Prompt={p_cnt} tok ({res['prefill_tok_s']} tok/s), Gen={e_cnt} tok ({res['decode_tok_s']} tok/s), Over60s={res['over_60s']}", flush=True)
    return res


def main():
    print("=== ĐO ĐẠC B3 & B5 TRÊN PROMPT RAG THẬT (~2.8k TOKENS) ===")
    
    # 1. Đo cấu hình num_predict = 150 (Chạy 5 lượt đo thực tế)
    print("\n--- CẤU HÌNH A: num_predict = 150 ---")
    results_150 = []
    for i in range(1, 6):
        results_150.append(run_benchmark_trial(150, i))
        time.sleep(2)

    # 2. Đo cấu hình num_predict = 512 (Chạy 3 lượt đo thực tế)
    print("\n--- CẤU HÌNH B: num_predict = 512 ---")
    results_512 = []
    for i in range(1, 4):
        results_512.append(run_benchmark_trial(512, i))
        time.sleep(2)

    # Lưu kết quả
    with open("benchmarks/ollama_b3_b5_real_measurements.json", "w", encoding="utf-8") as f:
        json.dump({"config_150": results_150, "config_512": results_512}, f, indent=2, ensure_ascii=False)
    print("\n[HOÀN TẤT] Đã lưu kết quả đo đạc B3 & B5!")

if __name__ == "__main__":
    main()

