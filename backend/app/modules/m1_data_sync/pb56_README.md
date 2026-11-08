# PB56: Bảng điều khiển Quản lý Máy trạm AEGIS Local Agent (Workstations)

## 1. Giới thiệu
Chức năng PB56 cung cấp bảng điều khiển quản lý và giám sát các máy trạm / đại lý biên AEGIS Local Agent (File Watcher).
- Theo dõi trạng thái Online 🟢 / Offline ⚪ thông qua cơ chế Heartbeat threshold (mặc định 3 chu kỳ).
- Bộ chuyển đổi Sync Mode cho từng máy: Real-time Watchdog hoặc Scheduled Sync (15 phút, 1 giờ, cuối ca).
- Cơ chế xác nhận 2 pha: Hiển thị "Đang chờ áp dụng" / "Chờ máy online" cho đến khi Agent phản hồi ACK thành công mới chuyển sang "Đã áp dụng".
- Báo cáo và thống kê tóm tắt: Tệp nhập thành công, bản ghi trích xuất, lỗi checksum (tích lũy kiểu BIGINT, có chống trùng report_id).

## 2. Cấu hình Feature Flag
Tính năng được bảo vệ bởi cờ `PB56_WORKSTATIONS_ENABLED` (mặc định: `false`).
- Trong `backend/.env`:
  ```env
  PB56_WORKSTATIONS_ENABLED=true
  ```
- Khi tắt cờ (`false`), toàn bộ router và bảng điều khiển bị ẩn, ứng dụng hoạt động 100% y hệt trước.

## 3. Database Migration & Rollback thủ công
- File Migration: `backend/app/db/postgres/migrations/pb56_workstations_migration.sql`
- File Rollback: `backend/app/db/postgres/migrations/pb56_workstations_rollback.sql`
- Trong môi trường `development` (`APP_ENV=development`), bảng được tạo tự động an toàn khi khởi chạy request đầu tiên.
- Trong môi trường `production`, thực thi file SQL migration thủ công qua `psql` hoặc công cụ quản trị PostgreSQL.

## 4. Kiểm thử Tự động cho AEGIS Agent (Pha 3a & 3b)
- Lệnh chạy bộ kiểm thử chuyên biệt 11 ca cho module PB56 Agent:
  ```bash
  python -m unittest aegis-agent/src/test_pb56_agent_sync.py -v
  ```
- Lệnh chạy bộ kiểm thử hồi quy Backend:
  ```bash
  python -m pytest backend/app/tests/unit -o addopts=""
  ```

## 5. Vận hành & Xử lý sự cố Khẩn cấp
- **Công tắc tắt khẩn cấp (Emergency Kill Switch):**
  Để tắt tính năng PB56 trên Agent ngay lập tức mà không cần gỡ mã nguồn: chỉ cần xóa hoặc để trống 2 biến môi trường:
  ```env
  AEGIS_WORKSTATION_ID=
  AEGIS_AGENT_TOKEN=
  ```
  Khi thiếu 1 trong 2 biến này, Agent lập tức kích hoạt chế độ **NO-OP hoàn toàn**: không tạo luồng nền, không ghi file đĩa, các lời gọi đồng bộ chuyển thẳng sang `sync_client.sync_file` gốc với 0 overhead.
- **Hành vi hàng đợi khi khởi động lại / bật lại:**
  Hàng đợi Scheduled và pending reports được lưu bền vững trên volume tại `/data/.aegis_queue/scheduled_files_<ws_id>.json`. Nếu Agent bị khởi động lại hoặc tắt khẩn cấp rồi bật lại, các tệp tồn đọng vẫn được bảo toàn nguyên vẹn trên đĩa và sẽ được flush tự động ở chu kỳ kế tiếp hoặc ngay lập tức nếu admin chuyển sang chế độ Real-time.
- **Giả định kiến trúc hệ thống:**
  *"Mỗi volume dữ liệu `/data` được gắn tương ứng với một máy trạm / AEGIS Agent duy nhất."*
