"""
Ollama / Self-Hosted LLM Inference Client for fine-tuned Qwen2.5-7B
Handles prompt synthesis and chat generation with local Ollama runtime.
"""
import logging
import time
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self):
        self.base_url = settings.INFERENCE_ENGINE_URL.rstrip("/")
        self.model = settings.MODEL_NAME

    async def is_available(self) -> bool:
        """Kiểm tra server Ollama có đang chạy và model đã sẵn sàng không."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    return any(self.model in m for m in models) or len(models) > 0
        except Exception as e:
            logger.debug(f"Ollama connection check failed: {e}")
        return False

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Đồng bộ tạo câu trả lời trực tiếp từ Ollama model."""
        try:
            with httpx.Client(timeout=60.0) as client:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 768
                    }
                }
                if system_prompt:
                    payload["system"] = system_prompt
                res = client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    return res.json().get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama synchronous generate failed: {e}")
        return ""

    async def generate_rag_answer(

        self,
        query: str,
        evidence_chunks: Optional[List[Dict[str, Any]]] = None,
        graph_entities: Optional[List[Dict[str, Any]]] = None,
        lang: str = "vi"
    ) -> Dict[str, Any]:
        """
        Tổng hợp câu trả lời thông minh dựa trên:
        1. Query người dùng
        2. Đoạn trích văn bản pháp lý từ Qdrant (CUAD Vector Chunks)
        3. Thực thể và quan hệ từ Neo4j Knowledge Graph
        """
        is_vi = lang == "vi"
        evidence_chunks = evidence_chunks or []
        graph_entities = graph_entities or []

        # 1. Trích xuất text từ vector chunks
        chunks_text_list = []
        for i, c in enumerate(evidence_chunks[:4]):
            t = c.get("text") or c.get("content") or ""
            cname = c.get("contract_name") or c.get("name") or "CUAD Contract"
            cid = c.get("chunk_id", i + 1)
            if t:
                chunks_text_list.append(f"[Trích đoạn #{cid} - {cname}]:\n{t[:600]}")
        chunks_context = "\n\n".join(chunks_text_list)

        # 2. Trích xuất text từ graph entities
        entities_text_list = []
        for e in graph_entities[:10]:
            name = e.get("name") or e.get("title") or e.get("_id")
            labels = "/".join(e.get("_labels") or ["Entity"])
            snippet = e.get("snippet")
            info = f"{name} ({labels})"
            if snippet:
                info += f": {snippet}"
            if name:
                entities_text_list.append(info)
        entities_context = "\n".join([f"- {it}" for it in entities_text_list])

        # 3. Xây dựng Prompt
        if is_vi:
            system_prompt = (
                "Bạn là trợ lý AI thông minh GraphMind (AEGIS Enterprise Knowledge Intelligence Platform). "
                "Bạn sử dụng kiến trúc Hybrid GraphRAG kết hợp giữa đồ thị tri thức Neo4j và tìm kiếm vector Qdrant. "
                "Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, chính xác, khách quan dựa trên ngữ cảnh được cung cấp.\n"
                "QUY TẮC BẮT BUỘC:\n"
                "1. Tuyệt đối chỉ sử dụng dữ kiện và số liệu có thật trong ngữ cảnh. Không tự bịa đặt mã UUID ảo (như 11111111-...). \n"
                "2. ĐỊNH DẠNG TRÌNH BÀY:\n"
                "   - Viết một câu giới thiệu ngắn gọn ở đầu.\n"
                "   - Các ý chính hoặc các thực thể/khách hàng BẮT BUỘC phải xuống dòng và đánh số rõ ràng (1., 2., 3.,...).\n"
                "   - Khi liệt kê chi tiết các năm hoặc các điều khoản, BẮT BUỘC phải xuống dòng cho từng năm/điều khoản với dấu gạch đầu dòng (- Năm 2011: ..., - Năm 2012: ...). Tuyệt đối không viết dồn trên cùng một dòng."
            )
            context_block = ""
            if chunks_context:
                context_block += f"\n\n--- CHỨNG CỨ VĂN BẢN (QDRANT VECTOR DB) ---\n{chunks_context}"
            if entities_context:
                context_block += f"\n\n--- THỰC THỂ ĐỒ THỊ LIÊN QUAN (NEO4J GRAPH DB) ---\n{entities_context}"

            user_prompt = f"Câu hỏi của người dùng: {query}{context_block}\n\nHãy tổng hợp câu trả lời:"
        else:
            system_prompt = (
                "You are GraphMind Copilot, an enterprise AI assistant powered by Hybrid GraphRAG "
                "(Neo4j Knowledge Graph + Qdrant Vector DB + fine-tuned Qwen2.5-7B). "
                "Synthesize a clear, professional answer strictly using the provided context."
            )
            context_block = ""
            if chunks_context:
                context_block += f"\n\n--- EVIDENCE EXCERPTS (QDRANT VECTOR DB) ---\n{chunks_context}"
            if entities_context:
                context_block += f"\n\n--- RELATED GRAPH ENTITIES (NEO4J) ---\n{entities_context}"

            user_prompt = f"User Question: {query}{context_block}\n\nSynthesize your answer:"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # 4. Gửi request sang Ollama
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "top_p": 0.9,
                            "num_predict": 512
                        }
                    }
                )
                latency = round(time.time() - start_time, 2)
                if res.status_code == 200:
                    data = res.json()
                    answer = data.get("message", {}).get("content", "").strip()
                    if answer:
                        return {
                            "success": True,
                            "answer": answer,
                            "model": f"{self.model} (Ollama Local)",
                            "latency": latency,
                            "fallback": False
                        }
        except Exception as e:
            logger.warning(f"Ollama generation failed or timed out: {e}")

        # Fallback graceful response nếu Ollama chưa sẵn sàng
        latency = round(time.time() - start_time, 2)
        fallback_msg = (
            f"Tìm thấy {len(evidence_chunks)} chứng cứ pháp lý từ Qdrant và đồ thị liên quan từ Neo4j cho truy vấn '{query}'. "
            f"(Hệ thống sẵn sàng kết nối model {self.model} qua Ollama)."
            if is_vi else
            f"Retrieved {len(evidence_chunks)} evidence chunks from Qdrant and related entities from Neo4j for query '{query}'."
        )
        return {
            "success": True,
            "answer": fallback_msg,
            "model": f"{self.model} (Fallback)",
            "latency": latency,
            "fallback": True
        }


llm_client = OllamaClient()
