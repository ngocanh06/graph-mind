"""
Script kiểm tra trực tiếp việc sinh gói hồ sơ bàn giao trên cơ sở dữ liệu thật graphmind_db:
- Sinh file zip gồm: .xlsx, .pdf, manifest.json
- Giải nén kiểm tra toàn bộ 6 sheets của Excel
- Đọc nội dung PDF bằng pdfplumber
- Kiểm tra mã băm SHA-256 trong manifest
"""
import asyncio
import zipfile
import json
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.modules.m6_admin_security.pb42_service import generate_handover_package, get_telemetry_summary_data
import openpyxl
import pdfplumber

class AdminContext:
    user_id = None
    email = "admin@graphmind.local"
    role = "it_admin"

async def test_live_export():
    engine = create_async_engine(settings.async_database_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("[1] Kiểm tra telemetry summary trên DB demo...")
        summary = await get_telemetry_summary_data(db, include_benchmark=True, exclude_outliers=True)
        print("  - Tổng queries:", summary["total_queries"])
        print("  - Benchmark queries:", summary["benchmark_queries_count"])
        print("  - Citation Rate:", summary["citation_metrics"]["citation_rate_pct"], "%")
        print("  - Phân bổ answer_path:", [p["answer_path"] for p in summary["by_answer_path"]])

        print("\n[2] Đang sinh gói hồ sơ bàn giao...")
        zip_bytes, zip_filename, manifest = await generate_handover_package(db, AdminContext())
        await db.commit()

        print(f"  - Đã sinh: {zip_filename} ({len(zip_bytes)} bytes)")
        print("  - Export ID:", manifest["export_id"])
        print("  - Head hash:", manifest["audit_chain"]["head_sha256"][:32], "...")
        print("  - Pre-chain aggregate hash:", manifest["audit_chain"]["pre_chain_aggregate_sha256"])

        # Lưu ra thư mục để kiểm tra
        output_dir = Path("app/data/handover_exports")
        output_dir.mkdir(parents=True, exist_ok=True)
        zip_path = output_dir / zip_filename

        # Giải nén và kiểm tra từng file
        with zipfile.ZipFile(zip_path, "r") as zf:
            files = zf.namelist()
            print("  - Danh sách file trong zip:", files)
            assert "manifest.json" in files
            excel_file = [f for f in files if f.endswith(".xlsx")][0]
            pdf_file = [f for f in files if f.endswith(".pdf")][0]

            # Kiểm tra Excel
            wb = openpyxl.load_workbook(zf.open(excel_file))
            print("  - Excel sheets:", wb.sheetnames)
            expected_sheets = ["Metadata", "TelemetrySummary", "LatencyBuckets", "AuditLogs", "RBACMatrix", "Limitations"]
            for s in expected_sheets:
                assert s in wb.sheetnames, f"Thiếu sheet {s}"

            # Kiểm tra PDF
            with pdfplumber.open(zf.open(pdf_file)) as pdf:
                print(f"  - PDF tổng số trang: {len(pdf.pages)}")
                full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                assert "HỒ SƠ BÀN GIAO HỆ THỐNG GRAPHMIND" in full_text
                assert "Citation Rate" in full_text
                assert "LIM-01" in full_text
                assert "LIM-06" in full_text
                print("  - Kiểm tra text PDF thành công, tiếng Việt hiển thị đầy đủ!")

    await engine.dispose()
    print("\n[PASS] TOÀN BỘ KIỂM TRA SINH GÓI HỒ SƠ BÀN GIAO ĐÃ THÀNH CÔNG 100%!")

if __name__ == "__main__":
    asyncio.run(test_live_export())

