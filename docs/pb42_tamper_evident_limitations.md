# Tài liệu Giới hạn và Đặc tả Cơ chế Kiểm toán Toàn vẹn (Tamper-Evident Audit Trail)
**Dự án:** GraphMind — Phân hệ PB42  
**Phiên bản:** PB42 Phần 1B  
**Ngày cập nhật:** 2026-11-12  

---

### 1. Bản chất Hệ thống: Tamper-Evident vs. Tamper-Proof

* **Tamper-Evident (Phát hiện can thiệp):** Cơ chế chuỗi băm mật mã SHA-256 (`entry_sha256`, `prev_hash`, `chain_seq`) được thiết kế nhằm **phát hiện lập tức và chính xác vị trí** của bất kỳ hành vi sửa đổi dữ liệu (UPDATE) hoặc xóa bản ghi ở giữa chuỗi (DELETE).
* **Không phải Tamper-Proof (Không ngăn tuyệt đối superuser):** Người quản trị có quyền cao nhất trên cơ sở dữ liệu (`superuser` hoặc chủ sở hữu PostgreSQL) về mặt vật lý vẫn có thể tắt trigger (`DISABLE TRIGGER`) hoặc can thiệp trực tiếp vào file dữ liệu đĩa. Tuy nhiên, bất kỳ can thiệp nào làm thay đổi nội dung đều sẽ làm gãy chuỗi băm và bị phát hiện ngay khi hàm `verify_audit_chain()` chạy.

---

### 2. Phạm vi Tính Băm Mật mã (Phương án B)

Chuỗi băm `entry_sha256` được tính bằng **SHA-256 trên Canonical JSON** (sắp xếp key alphabet, separator chuẩn `(',', ':')`, mã hóa UTF-8) bao gồm đúng **10 trường** của ORM `AuditLog`:

```json
{
  "action": "STRING (max 100)",
  "actor_id": "UUID string | null",
  "audit_id": "UUID string",
  "chain_seq": "INTEGER",
  "created_at": "ISO 8601 UTC microsecond (YYYY-MM-DDTHH:MM:SS.ffffffZ)",
  "detail": "STRING (đã chuẩn hóa và cắt tối đa 500 ký tự)",
  "prev_hash": "HEX SHA-256 (64 ký tự)",
  "resource_id": "STRING | null",
  "resource_type": "STRING | null",
  "status": "STRING | null"
}
```

#### Giới hạn về các cột cũ:
* Các cột kế thừa từ schema cũ ban đầu gồm: `user_id`, `module_name`, `target_type`, `target_id`, `details`, `ip_address` **KHÔNG nằm trong phạm vi băm**.
* Mọi thay đổi trên các cột cũ này không làm đổi `entry_sha256` và do đó **không được bảo vệ bởi chuỗi hash**. Ứng dụng hiện tại chỉ ghi và đọc dựa trên 10 trường chuẩn hóa ở trên.

---

### 3. Giới hạn 293 Dòng Lịch sử Cũ (`pre_chain = True`)

* Có **293 bản ghi lịch sử** tồn tại trước thời điểm triển khai migration PB42 1B (`pb42_1b_audit_chain`).
* Theo nguyên tắc bảo toàn dữ liệu gốc (không suy đoán, không backfill dữ liệu giả), toàn bộ 293 dòng này được đánh dấu cờ `pre_chain = TRUE` và giữ `chain_seq = NULL`, `entry_sha256 = NULL`, `prev_hash = NULL`.
* **Giới hạn an toàn:** 293 dòng cũ này **không được bảo vệ tính toàn vẹn bằng chuỗi hash**. Hàm `verify_audit_chain()` ghi nhận số lượng `pre_chain_count` nhưng không thể kiểm chứng tính toàn vẹn của các dòng này.

---

### 4. Nguy cơ Cắt Đuôi Chuỗi (Truncation Attack) và Cơ chế Neo (Anchor)

* **Nguy cơ:** Nếu một kẻ tấn công có quyền superuser xóa $N$ bản ghi gần nhất ở cuối chuỗi (xóa từ `chain_seq = M` đến `chain_seq = M - N`), các bản ghi còn lại từ 1 đến $M - N - 1$ vẫn tạo thành một chuỗi hợp lệ nội bộ. Nếu chỉ kiểm tra tính liên tục nội bộ mà không có thông tin đối chiếu bên ngoài, hệ thống không thể biết chuỗi đã từng dài hơn.
* **Cơ chế phòng ngừa & khắc phục (Anchor):** 
  - Đỉnh chuỗi (`head_seq`, `head_sha256`) phải được định kỳ neo ra ngoài DB (ví dụ: in vào hồ sơ bàn giao nghiệm thu kèm SHA-256 từng file xuất trong `manifest.json`, log ra SIEM/WORM storage độc lập).
  - Bất kỳ hành vi xóa đuôi nào làm `head_seq` thụt lùi so với giá trị neo đã công bố đều bị phát hiện ngay lập tức.

---

### 5. Cơ chế Phòng vệ 2 Lớp (Defense in Depth)

1. **Lớp 1 — Quyền hạn Cơ sở dữ liệu (Database Grants):**
   - Migration `pb42_1b_truncate_guard` thực thi:
     ```sql
     REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
     ```
   - Các role người dùng ứng dụng không có quyền gọi UPDATE, DELETE hoặc TRUNCATE trên bảng này.
2. **Lớp 2 — Trigger PostgreSQL mức Hàng và Mức Câu lệnh:**
   - `trg_audit_logs_immutable`: Chặn `BEFORE UPDATE OR DELETE FOR EACH ROW`, ném ngoại lệ `AuditLogImmutableError` (mã lỗi PostgreSQL `55000`).
   - `trg_audit_logs_truncate`: Chặn `BEFORE TRUNCATE FOR EACH STATEMENT`, ném ngoại lệ `AuditLogImmutableError` (mã lỗi PostgreSQL `55000`).

