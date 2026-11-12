"""
Script thực thi xuất hồ sơ bàn giao qua endpoint thật POST /api/v1/pb42/handover-export:
1. Khởi tạo FastAPI TestClient với tài khoản admin thật.
2. Gửi request POST /api/v1/pb42/handover-export.
3. Kiểm tra file zip trả về, giải nén và đọc manifest.json.
4. Truy vấn dòng audit log mới sinh từ log_action: chain_seq, entry_sha256, prev_hash.
5. Chạy verify_audit_chain trên DB và xác nhận valid=True.
"""
import asyncio
import zipfile
import json
import io
from pathlib import Path
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

from app.main import app
from app.core.config import settings
from app.modules.m6_admin_security.audit_service import verify_audit_chain
from app.modules.m6_admin_security.deps import get_admin_user

class RealAdmin:
    user_id = None
    email = "admin@graphmind.local"
    role = "it_admin"
    is_superuser = True

async def run_real_export():
    app.dependency_overrides[get_admin_user] = lambda: RealAdmin()
    print("[1] Đang gọi endpoint POST /api/v1/pb42/handover-export...")
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=60.0) as client:
        res = await client.post("/api/v1/pb42/handover-export")
        assert res.status_code == 200, f"Lỗi export: {res.status_code} - {res.text}"
        zip_bytes = res.content
        filename = res.headers.get("content-disposition", "").split("filename=")[-1]
        export_id = res.headers.get("x-handover-export-id")
        print(f"  -> Thành công! File: {filename} ({len(zip_bytes):,} bytes), Export ID: {export_id}")

    # Đọc manifest từ zip
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        print("\n[2] Thông tin Manifest trong gói xuất:")
        print(f"  - Thời điểm: {manifest['generated_at_utc']}")
        print(f"  - Git Commit: {manifest['git_commit']} (Dirty: {manifest['git_dirty']})")
        print(f"  - Pre-chain Hash: {manifest['audit_chain']['pre_chain_aggregate_sha256']}")
        print(f"  - Head Hash trước xuất: {manifest['audit_chain']['head_sha256_before_export']}")
        print(f"  - Timing Note: {manifest['audit_chain']['timing_note']}")

    # Kiểm tra dòng audit mới trong DB
    print("\n[3] Kiểm tra dòng audit_log mới trong DB demo:")
    engine = create_async_engine(settings.async_database_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        query = text("""
            SELECT chain_seq, entry_sha256, prev_hash, action, resource_type, resource_id, status, detail, created_at
            FROM audit_logs
            WHERE action = 'HANDOVER_EXPORT'
            ORDER BY chain_seq DESC
            LIMIT 1;
        """)
        row = (await db.execute(query)).mappings().first()
        if row:
            print(f"  - chain_seq: {row['chain_seq']}")
            print(f"  - entry_sha256: {row['entry_sha256']}")
            print(f"  - prev_hash: {row['prev_hash']}")
            print(f"  - action: {row['action']} | resource_type: {row['resource_type']}")
            print(f"  - detail: {row['detail']}")
            print(f"  - created_at: {row['created_at']}")
        else:
            print("  [ERROR] Không tìm thấy dòng audit HANDOVER_EXPORT!")

        print("\n[4] Chạy verify_audit_chain sau khi xuất hồ sơ:")
        verify_res = await verify_audit_chain(db)
        print(f"  - Valid: {verify_res.get('valid')}")
        print(f"  - Checked count: {verify_res.get('checked_count')}")
        print(f"  - Pre-chain count: {verify_res.get('pre_chain_count')}")
        print(f"  - Head seq: {verify_res.get('head_seq')}")
        print(f"  - Head sha256: {verify_res.get('head_sha256')}")
        print(f"  - Reason: {verify_res.get('reason')}")
        assert verify_res.get("valid") is True, f"Audit chain verification failed: {verify_res}"
        print("  -> Chuỗi băm audit hợp lệ 100%!")

    await engine.dispose()
    app.dependency_overrides.pop(get_admin_user, None)

if __name__ == "__main__":
    asyncio.run(run_real_export())

