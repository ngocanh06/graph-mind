import asyncio
import time
import httpx

async def measure_ollama():
    url = "http://127.0.0.1:11434/api/generate"
    model = "qwen2.5-7b-graphmind:latest"
    
    # Prompt simulating RAG with context
    context = (
        "Quy trình quản lý hợp đồng kinh tế của công ty: "
        "Bước 1: Soạn thảo hợp đồng bởi phòng Kinh doanh. "
        "Bước 2: Phòng Pháp chế thẩm định trong vòng 3 ngày làm việc. "
        "Bước 3: Ban Giám đốc ký duyệt và đóng dấu. "
        "Bước 4: Phòng Kế toán lưu trữ và theo dõi tiến độ thanh toán. "
    ) * 5  # ~500 tokens
    
    prompt = f"Ngữ cảnh sau:\n{context}\n\nCâu hỏi: Hãy tóm tắt các bước trong quy trình quản lý hợp đồng kinh tế và thời hạn thẩm định của phòng Pháp chế."
    
    results = []
    print(f"Starting 10 benchmark queries to Ollama model {model}...")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for i in range(10):
            t0 = time.perf_counter()
            resp = await client.post(
                url,
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 256,
                        "temperature": 0.2,
                    }
                }
            )
            elapsed = time.perf_counter() - t0
            data = resp.json()
            
            p_eval_count = data.get("prompt_eval_count", 0)
            p_eval_dur_ns = data.get("prompt_eval_duration", 0)
            eval_count = data.get("eval_count", 0)
            eval_dur_ns = data.get("eval_duration", 0)
            total_dur_ns = data.get("total_duration", 0)
            
            # calculate tok/s
            p_eval_tok_s = (p_eval_count / (p_eval_dur_ns / 1e9)) if p_eval_dur_ns > 0 else 0
            eval_tok_s = (eval_count / (eval_dur_ns / 1e9)) if eval_dur_ns > 0 else 0
            
            res_entry = {
                "run": i + 1,
                "elapsed_s": round(elapsed, 2),
                "prompt_eval_count": p_eval_count,
                "prompt_eval_duration_ms": round(p_eval_dur_ns / 1e6, 1),
                "eval_count": eval_count,
                "eval_duration_ms": round(eval_dur_ns / 1e6, 1),
                "prefill_tok_s": round(p_eval_tok_s, 2),
                "decode_tok_s": round(eval_tok_s, 2),
            }
            print(f"Run {i+1}: elapsed={res_entry['elapsed_s']}s, prefill={res_entry['prefill_tok_s']} tok/s ({p_eval_count} tok), decode={res_entry['decode_tok_s']} tok/s ({eval_count} tok)", flush=True)
            results.append(res_entry)
            
    # Calculate averages
    avg_prefill = sum(r["prefill_tok_s"] for r in results) / len(results)
    avg_decode = sum(r["decode_tok_s"] for r in results) / len(results)
    avg_elapsed = sum(r["elapsed_s"] for r in results) / len(results)
    print("\n--- OLLAMA BENCHMARK SUMMARY (10 RUNS) ---", flush=True)
    print(f"Avg Elapsed: {avg_elapsed:.2f}s", flush=True)
    print(f"Avg Prefill Speed: {avg_prefill:.2f} tok/s", flush=True)
    print(f"Avg Decode Speed: {avg_decode:.2f} tok/s", flush=True)

if __name__ == '__main__':
    asyncio.run(measure_ollama())
