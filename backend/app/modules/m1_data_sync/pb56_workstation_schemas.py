"""
PB56 Workstation Schemas (Pydantic v2 DTOs)
Namespace: pb56_*
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import re
from pydantic import BaseModel, Field, field_validator


class PB56WorkstationRegisterRequest(BaseModel):
    id: str = Field(..., min_length=3, max_length=64, description="Unique workstation/agent ID")
    hostname: str = Field(..., min_length=1, max_length=255)
    ip_address: str = Field(..., min_length=7, max_length=64)
    os_info: str = Field(..., min_length=1, max_length=128)
    monitored_folder: str = Field(..., min_length=1, max_length=512)
    sync_mode: str = Field(default="realtime", pattern="^(realtime|scheduled)$")
    schedule_type: Optional[str] = Field(default=None, pattern="^(15m|1h|end_of_shift)$")
    shift_end_time: Optional[str] = None
    timezone: str = Field(default="Asia/Ho_Chi_Minh", max_length=64)
    heartbeat_interval_sec: int = Field(default=30, ge=5, le=3600)
    heartbeat_threshold_cycles: int = Field(default=3, ge=1, le=10)


class PB56WorkstationRegisterResponse(BaseModel):
    success: bool = True
    id: str
    hostname: str
    ip_address: str
    agent_token: str = Field(..., description="Plaintext secret token for agent authentication — shown ONCE only!")
    message: str = "Tạo máy trạm và sinh mã Token thành công. Vui lòng lưu trữ Token an toàn."


class PB56RotateTokenResponse(BaseModel):
    success: bool = True
    id: str
    new_agent_token: str = Field(..., description="New plaintext secret token — shown ONCE only!")
    message: str = "Đã cấp mới Token thành công. Vui lòng cập nhật cấu hình cho máy trạm."


class PB56ChangeSyncModeRequest(BaseModel):
    sync_mode: str = Field(..., pattern="^(realtime|scheduled)$")
    schedule_type: Optional[str] = None
    shift_end_time: Optional[str] = None
    timezone: Optional[str] = "Asia/Ho_Chi_Minh"

    @field_validator("schedule_type")
    @classmethod
    def validate_schedule_type(cls, v, info):
        values = info.data
        mode = values.get("sync_mode")
        if mode == "realtime" and v is not None:
            raise ValueError("Chế độ realtime không được có schedule_type (phải là None/null)")
        if mode == "scheduled":
            if not v or v not in ("15m", "1h", "end_of_shift"):
                raise ValueError("Chế độ scheduled bắt buộc phải chọn schedule_type: '15m', '1h' hoặc 'end_of_shift'")
        return v

    @field_validator("shift_end_time")
    @classmethod
    def validate_shift_end_time(cls, v, info):
        values = info.data
        mode = values.get("sync_mode")
        sched = values.get("schedule_type")
        if mode == "realtime" and v is not None:
            raise ValueError("Chế độ realtime không được có shift_end_time (phải là None/null)")
        if sched == "end_of_shift":
            if not v or not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", str(v)):
                raise ValueError("Chu kỳ end_of_shift bắt buộc phải có shift_end_time định dạng HH:MM (ví dụ: '17:30')")
        return v


class PB56AckSyncModeRequest(BaseModel):
    applied_mode: str = Field(..., pattern="^(realtime|scheduled)$")
    applied_schedule_type: Optional[str] = None
    applied_shift_end_time: Optional[str] = None


class PB56HeartbeatRequest(BaseModel):
    id: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    os_info: Optional[str] = None
    monitored_folder: Optional[str] = None


class PB56HeartbeatResponse(BaseModel):
    success: bool = True
    id: str
    server_time: datetime
    is_online: bool = True
    sync_mode: str = "realtime"
    schedule_type: Optional[str] = None
    shift_end_time: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    has_pending_command: bool = False
    pending_command: Optional[Dict[str, Any]] = None
    message: str = "Heartbeat received"


class PB56SyncReportRequest(BaseModel):
    report_id: UUID = Field(..., description="Unique client UUID for idempotency")
    files_ingested: int = Field(ge=0, default=0)
    records_extracted: int = Field(ge=0, default=0)
    checksum_errors: int = Field(ge=0, default=0)
    status: str = Field(default="SUCCESS", pattern="^(SUCCESS|PARTIAL|FAILED)$")
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class PB56WorkstationItem(BaseModel):
    id: str
    hostname: str
    ip_address: str
    os_info: str
    monitored_folder: str
    sync_mode: str
    schedule_type: Optional[str] = None
    shift_end_time: Optional[str] = None
    timezone: str
    target_sync_mode: Optional[str] = None
    target_schedule_type: Optional[str] = None
    target_shift_end_time: Optional[str] = None
    sync_mode_status: str  # applied, pending, pending_offline
    heartbeat_interval_sec: int
    heartbeat_threshold_cycles: int
    last_heartbeat_at: Optional[datetime] = None
    is_online: bool
    files_ingested_total: int
    records_extracted_total: int
    checksum_errors_total: int
    is_demo: bool
    created_at: datetime
    updated_at: datetime


class PB56StatsSummary(BaseModel):
    total_workstations: int
    online_count: int
    offline_count: int
    total_files_ingested: int
    total_records_extracted: int
    total_checksum_errors: int


class PB56WorkstationListResponse(BaseModel):
    success: bool = True
    summary: PB56StatsSummary
    workstations: List[PB56WorkstationItem]

