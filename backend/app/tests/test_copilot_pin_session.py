"""
Test Suite: US37 · PB59 · UC.18 · BR-02
Ghim phiên hội thoại thành tài liệu dùng chung phòng ban (Shared Team Documents)
Kiểm thử các luồng:
1. Tạo phiên hội thoại cá nhân.
2. Ghim phiên với ghi chú (notes) và phòng ban phụ trách (department scope).
3. Thành viên cùng phòng ban tra cứu danh sách phiên ghim (?mode=pinned) và xem nội dung chi tiết.
4. Thành viên khác phòng ban bị từ chối truy cập (403 Forbidden / BR-02).
5. Lãnh đạo (Executive) với quyền Unrestricted có thể xem mọi phiên ghim.
6. Lọc/ẩn trích dẫn nhạy cảm ngoài thẩm quyền (UC.18 Exception Flow E1).
7. Bỏ ghim và xóa dọn dẹp.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.postgres.database import engine


async def test_copilot_pin_and_department_share():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Header cho các nhân vật kiểm thử
        # 1. Trưởng phòng Kinh doanh (Sales Manager)
        sales_mgr_headers = {
            "X-User-Name": "manager",
            "X-User-Dept": "Sales",
            "X-User-Role": "department_manager"
        }
        # 2. Nhân viên Kinh doanh (Sales Member)
        sales_member_headers = {
            "X-User-Name": "sales_staff",
            "X-User-Dept": "Sales",
            "X-User-Role": "standard_user"
        }
        # 3. Nhân viên Pháp chế (Legal Member - khác phòng ban)
        legal_member_headers = {
            "X-User-Name": "legal_staff",
            "X-User-Dept": "Legal",
            "X-User-Role": "standard_user"
        }
        # 4. Ban Giám đốc (Executive - Unrestricted)
        exec_headers = {
            "X-User-Name": "exec",
            "X-User-Role": "executive"
        }

        # BƯỚC 1: Trưởng phòng Kinh doanh tạo một phiên hội thoại mới
        res_create = await client.post(
            "/api/copilot/sessions",
            headers=sales_mgr_headers,
            json={"title": "Quy trình chào hàng mẫu 2026"}
        )
        assert res_create.status_code == 200
        session_id = res_create.json()["session"]["id"]
        assert session_id is not None

        # BƯỚC 2: Thêm tin nhắn hội thoại và trích dẫn kiểm thử vào phiên
        from app.db.postgres.database import AsyncSessionLocal
        from app.db.postgres.models.copilot_session import CopilotSession
        import uuid
        async with AsyncSessionLocal() as db_session:
            stmt = select(CopilotSession).where(CopilotSession.id == uuid.UUID(session_id))
            res = await db_session.execute(stmt)
            s_obj = res.scalar_one()
            s_obj.messages = [
                {
                    "id": "u_test_1",
                    "sender": "user",
                    "time": "10:30",
                    "text": "Quy trình chiết khấu thanh toán khách hàng VIP phòng Kinh doanh",
                },
                {
                    "id": "c_test_1",
                    "sender": "copilot",
                    "time": "10:30",
                    "introText": "Theo quy chế bán hàng 2026, khách hàng VIP được chiết khấu 15%.",
                    "citations": [
                        {
                            "docName": "SOP-Sales-Discount-VIP.pdf",
                            "file": "SOP-Sales-Discount-VIP.pdf",
                            "department": "Sales",
                            "location": "Mục 4.2",
                            "text": "Chính sách chiết khấu 15% khách VIP ngành hàng Sales",
                        },
                        {
                            "docName": "Legal-Confidential-Audit.pdf",
                            "file": "Legal-Confidential-Audit.pdf",
                            "department": "Legal",
                            "location": "Mục bí mật",
                            "text": "Tài liệu kiểm toán nội bộ mật phòng Pháp chế",
                        }
                    ]
                }
            ]
            await db_session.commit()

        # BƯỚC 3: Ghim phiên hội thoại thành tài liệu dùng chung phòng ban (US37 / UC.18 Step 4 & 5)
        res_pin = await client.post(
            f"/api/copilot/sessions/{session_id}/pin",
            headers=sales_mgr_headers,
            json={
                "is_pinned": True,
                "notes": "Tài liệu mẫu hướng dẫn chiết khấu cho toàn bộ đội ngũ Sales quý 4.",
                "department": "Sales"
            }
        )
        assert res_pin.status_code == 200
        pin_data = res_pin.json()
        assert pin_data["success"] is True
        assert pin_data["isPinned"] is True
        assert pin_data["isShared"] is True
        assert pin_data["department"] == "Sales"
        assert pin_data["session"]["pinNotes"] == "Tài liệu mẫu hướng dẫn chiết khấu cho toàn bộ đội ngũ Sales quý 4."

        # BƯỚC 4: Nhân viên Kinh doanh tra cứu danh sách phiên ghim dùng chung phòng ban (?mode=pinned)
        res_shared_sales = await client.get(
            "/api/copilot/sessions?mode=pinned",
            headers=sales_member_headers
        )
        assert res_shared_sales.status_code == 200
        shared_sessions = res_shared_sales.json()["sessions"]
        found_pinned = [s for s in shared_sessions if s["id"] == session_id]
        assert len(found_pinned) == 1, "Thành viên Sales phải nhìn thấy phiên ghim của phòng Sales"
        assert found_pinned[0]["isPinned"] is True
        assert found_pinned[0]["pinNotes"] == "Tài liệu mẫu hướng dẫn chiết khấu cho toàn bộ đội ngũ Sales quý 4."

        # BƯỚC 5: Nhân viên Kinh doanh mở xem chi tiết phiên ghim (UC.18 Step 3)
        res_open_sales = await client.get(
            f"/api/copilot/sessions/{session_id}",
            headers=sales_member_headers
        )
        assert res_open_sales.status_code == 200
        assert res_open_sales.json()["session"]["id"] == session_id
        assert len(res_open_sales.json()["session"]["messages"]) >= 2
        # UC.18 Exception Flow E1 & BR-02: Kiểm tra lọc trích dẫn tự động theo quyền của người xem
        # Nhân viên Sales được xem tài liệu Sales, tài liệu Legal bị ẩn 'RESTRICTED (BR-02)'
        citations = res_open_sales.json()["session"]["messages"][1]["citations"]
        assert len(citations) == 2
        sales_c = [c for c in citations if "SOP-Sales" in c.get("file", "")][0]
        legal_c = [c for c in citations if "Legal-" in c.get("file", "")][0]
        assert sales_c.get("restricted") is not True
        assert legal_c.get("restricted") is True
        assert "BR-02" in legal_c.get("text", "")
        assert legal_c.get("match") == "RESTRICTED (BR-02)"


        # BƯỚC 6: Nhân viên Pháp chế (Legal) tra cứu danh sách phiên ghim phòng ban
        # Phải KHÔNG thấy phiên của phòng Sales (BR-02 Scope Enforcement)
        res_shared_legal = await client.get(
            "/api/copilot/sessions?mode=pinned",
            headers=legal_member_headers
        )
        assert res_shared_legal.status_code == 200
        legal_sessions = res_shared_legal.json()["sessions"]
        assert not any(s["id"] == session_id for s in legal_sessions), "Phòng Legal không được thấy phiên của Sales"

        # BƯỚC 7: Nhân viên Pháp chế cố tình mở URL trực tiếp phiên của Sales -> Phải bị từ chối 403 Forbidden
        res_open_legal = await client.get(
            f"/api/copilot/sessions/{session_id}",
            headers=legal_member_headers
        )
        assert res_open_legal.status_code == 403, f"Expected 403, got {res_open_legal.status_code}: {res_open_legal.text}"
        assert "BR-02" in res_open_legal.json().get("detail", "")

        # BƯỚC 8: Lãnh đạo (Executive) với quyền Unrestricted có thể mở xem phiên ghim
        res_open_exec = await client.get(
            f"/api/copilot/sessions/{session_id}",
            headers=exec_headers
        )
        assert res_open_exec.status_code == 200
        assert res_open_exec.json()["session"]["id"] == session_id
        exec_citations = res_open_exec.json()["session"]["messages"][1]["citations"]
        assert len(exec_citations) == 2
        assert not any(c.get("restricted") is True for c in exec_citations)


        # BƯỚC 9: Bỏ ghim phiên hội thoại (Unpin)
        res_unpin = await client.post(
            f"/api/copilot/sessions/{session_id}/pin",
            headers=sales_mgr_headers,
            json={"is_pinned": False}
        )
        assert res_unpin.status_code == 200
        assert res_unpin.json()["isPinned"] is False

        # Xác nhận phiên không còn xuất hiện trong ?mode=pinned
        res_check_unpinned = await client.get(
            "/api/copilot/sessions?mode=pinned",
            headers=sales_member_headers
        )
        assert not any(s["id"] == session_id for s in res_check_unpinned.json()["sessions"])

        # BƯỚC 10: Dọn dẹp phiên thử nghiệm
        res_del = await client.delete(
            f"/api/copilot/sessions/{session_id}",
            headers=sales_mgr_headers
        )
        assert res_del.status_code == 200

    await engine.dispose()
    print("ALL US37 · PB59 · UC.18 PIN & SHARE TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_copilot_pin_and_department_share())
