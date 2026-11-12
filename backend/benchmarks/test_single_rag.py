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
REAL_RAG_CONTEXT = (PARAGRAPH * 6).strip()
QUESTION = "Hãy tóm tắt ngắn gọn thẩm quyền ký duyệt chính sách tài chính và thời hạn thẩm định pháp lý theo quy định trên."
PROMPT = f"{REAL_RAG_CONTEXT}\n\nCâu hỏi: {QUESTION}\nTrả lời:"

def test_stream_run(num_predict=150):
    url = "http://127.0.0.1:11434/api/generate"
    t0 = time.perf_counter()
    ttft = None
    final_chunk = {}
    
    with httpx.Client(timeout=180.0) as client:
        with client.stream("POST", url, json={
            "model": "qwen2.5-7b-graphmind:latest",
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
    
    print(f"Results for num_predict={num_predict}:")
    print(f"  Prompt tokens: {p_cnt} (Target ~2.8k)")
    print(f"  TTFT: {ttft:.2f}s")
    print(f"  Total time: {total:.2f}s")
    print(f"  Load duration: {load_ms:.1f}ms")
    print(f"  Prefill: {p_cnt} tok in {p_dur_ms:.1f}ms ({prefill_s:.2f} tok/s)")
    print(f"  Decode: {e_cnt} tok in {e_dur_ms:.1f}ms ({decode_s:.2f} tok/s)")

if __name__ == "__main__":
    test_stream_run(150)

