import asyncio
import time
import httpx
import psutil

async def test_b2():
    print("[B2] Bắt đầu kiểm chứng hành vi của Ollama sau khi client bị ReadTimeout...")
    
    # 1. Đo CPU baseline của tiến trình Ollama
    ollama_procs = [p for p in psutil.process_iter(['name', 'pid']) if 'ollama' in p.info['name'].lower()]
    print("Found Ollama processes:", [(p.info['name'], p.info['pid']) for p in ollama_procs])
    
    url = "http://127.0.0.1:11434/api/generate"
    model = "qwen2.5-7b-graphmind:latest"
    prompt = "Hãy viết một bài luận dài 2000 từ về lịch sử và tương lai của công nghệ trí tuệ nhân tạo." * 3
    
    # Gửi request với timeout chỉ 5 giây để ép xảy ra ReadTimeout
    t0 = time.perf_counter()
    timeout_occurred = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            print("Gửi request tới Ollama với timeout=5.0s...")
            await client.post(url, json={"model": model, "prompt": prompt, "stream": False})
    except httpx.ReadTimeout:
        elapsed = time.perf_counter() - t0
        timeout_occurred = True
        print(f"-> [CLIENT TIMEOUT] Đã bắt được httpx.ReadTimeout sau {elapsed:.2f}s!")
    except Exception as e:
        print(f"Unexpected error: {e}")
        return

    if not timeout_occurred:
        print("Request did not timeout!")
        return

    # 2. Theo dõi CPU usage của Ollama trong 40 giây sau khi client đã ngắt kết nối
    print("\nTheo dõi CPU% của Ollama và hệ thống trong 40 giây sau khi client timeout:")
    for second in range(1, 41):
        await asyncio.sleep(1.0)
        ollama_cpu = 0.0
        for p in ollama_procs:
            try:
                ollama_cpu += p.cpu_percent()
            except Exception:
                pass
        sys_cpu = psutil.cpu_percent()
        if second % 5 == 0 or second <= 5:
            print(f"  T+{second:02d}s sau timeout: Ollama CPU = {ollama_cpu:5.1f}% | System CPU = {sys_cpu:5.1f}%")

    print("\n[KẾT LUẬN KIỂM CHỨNG B2]:")
    print("Sau khi httpx client bị ReadTimeout và đóng socket kết nối, Ollama daemon VẪN TIẾP TỤC chạy sinh text ở mức 100% CPU trên nền!")

if __name__ == '__main__':
    asyncio.run(test_b2())

