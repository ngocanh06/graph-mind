"""
PB56 Workstation & Sync Mode ORM Models
Namespace: pb56_*
Additive-only: creates standalone tables pb56_workstations, pb56_workstation_sync_logs, pb56_sync_mode_audit_logs.
"""
from datetime import datetime, timezone
import uuid
from typing import Optional, Any
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint, text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

try:
    from app.db.postgres.database import Base
except ImportError:
    from db.postgres.database import Base


class PB56Workstation(Base):
    __tablename__ = "pb56_workstations"

    id = Column(String(64), primary_key=True)  # Workstation / Agent ID
    hostname = Column(String(255), nullable=False)
    ip_address = Column(String(64), nullable=False)
    os_info = Column(String(128), nullable=False)
    monitored_folder = Column(String(512), nullable=False)
    agent_token_hash = Column(String(128), nullable=False)

    # Sync Mode configuration
    sync_mode = Column(String(32), nullable=False, default="realtime")  # realtime, scheduled
    schedule_type = Column(String(32), nullable=True)  # 15m, 1h, end_of_shift
    shift_end_time = Column(String(8), nullable=True)  # HH:MM
    timezone = Column(String(64), nullable=False, default="Asia/Ho_Chi_Minh")

    # Pending sync mode command
    target_sync_mode = Column(String(32), nullable=True)
    target_schedule_type = Column(String(32), nullable=True)
    target_shift_end_time = Column(String(8), nullable=True)
    sync_mode_status = Column(String(32), nullable=False, default="applied")  # applied, pending, pending_offline

    # Heartbeat metrics
    heartbeat_interval_sec = Column(Integer, nullable=False, default=30)
    heartbeat_threshold_cycles = Column(Integer, nullable=False, default=3)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)

    # Cumulative Statistics (BIGINT)
    files_ingested_total = Column(BigInteger, nullable=False, default=0)
    records_extracted_total = Column(BigInteger, nullable=False, default=0)
    checksum_errors_total = Column(BigInteger, nullable=False, default=0)

    # Demo flag
    is_demo = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    sync_logs = relationship("PB56WorkstationSyncLog", back_populates="workstation", cascade="all, delete-orphan")
    audit_logs = relationship("PB56SyncModeAuditLog", back_populates="workstation", cascade="all, delete-orphan")

    def is_online(self, now: Optional[datetime] = None) -> bool:
        """Shared logic to compute dynamic online/offline status."""
        from app.modules.m1_data_sync.pb56_workstation_service import is_workstation_online
        return is_workstation_online(
            self.last_heartbeat_at,
            self.heartbeat_interval_sec or 30,
            self.heartbeat_threshold_cycles or 3,
            now=now
        )


class PB56WorkstationSyncLog(Base):
    __tablename__ = "pb56_workstation_sync_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workstation_id = Column(String(64), ForeignKey("pb56_workstations.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(UUID(as_uuid=True), nullable=False)
    sync_mode_used = Column(String(32), nullable=False, default="realtime")
    files_ingested = Column(Integer, nullable=False, default=0)
    records_extracted = Column(Integer, nullable=False, default=0)
    checksum_errors = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="SUCCESS")
    error_message = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    workstation = relationship("PB56Workstation", back_populates="sync_logs")

    __table_args__ = (
        UniqueConstraint("workstation_id", "report_id", name="uq_pb56_sync_report"),
    )


class PB56SyncModeAuditLog(Base):
    __tablename__ = "pb56_sync_mode_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workstation_id = Column(String(64), ForeignKey("pb56_workstations.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(32), nullable=False)  # 'REQUESTED', 'APPLIED', 'CANCELLED', 'REJECTED'
    old_sync_mode = Column(String(32), nullable=True)
    new_sync_mode = Column(String(32), nullable=True)
    old_schedule_type = Column(String(32), nullable=True)
    new_schedule_type = Column(String(32), nullable=True)
    old_shift_end_time = Column(String(8), nullable=True)
    new_shift_end_time = Column(String(8), nullable=True)
    changed_by = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    workstation = relationship("PB56Workstation", back_populates="audit_logs")

