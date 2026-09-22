# AEGIS Local Agent — File Watcher & Secure Sync Client

AEGIS Local Agent là service chạy trên máy trạm cục bộ của doanh nghiệp SME để theo dõi thay đổi tài liệu (file watcher) và đồng bộ hóa gia tăng (incremental sync) về Backend Cloud thông qua kết nối an toàn HTTPS/TLS.

## Cấu trúc
```
aegis-agent/
├── src/
│   ├── watcher.py       # Theo dõi thư mục cục bộ (Watchdog)
│   ├── sync_client.py   # Client đồng bộ hóa file gia tăng tới Backend Cloud
│   └── config.py        # Cấu hình đường dẫn, API endpoint, credentials
├── requirements.txt     # Phụ thuộc Python (watchdog, requests, v.v.)
└── README.md
```

## Chức năng chính
- Lắng nghe sự kiện thêm/sửa/xóa file trong các thư mục theo dõi (PDF, DOCX, XLSX, CSV).
- Tính hash (SHA-256) kiểm tra nội dung trùng lặp trước khi truyền tải.
- Gửi payload kèm metadata phòng ban/người dùng tới Endpoint `POST /api/v1/sync/file-watcher` của Backend Cloud.
