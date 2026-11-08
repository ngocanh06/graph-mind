"""
AEGIS Local Agent — PB56 Workstation & Sync Mode Management Integration
Module: aegis-agent/src/pb56_agent_sync.py
Namespace: pb56_*

Additive-only edge component:
- Manages heartbeat loop with Backend Cloud PB56 APIs.
- Supports Real-time Watchdog and Scheduled Sync modes (15m, 1h, end_of_shift).
- Thread-safe persistent file queue and report queue on disk (survives crashes/restarts).
- Default queue directory: /data/.aegis_queue (persistent named volume).
- Queue file names include AEGIS_WORKSTATION_ID for isolation.
- Boot order: Synchronous short-timeout heartbeat first; fallback to last known config on disk; default realtime.
- Flush: 5xx/network errors retry next cycle; permanent 4xx moved to failed log after 3 attempts; empty/deleted batch sends no report.
- SyncClient thread safety protected by threading.Lock().
- Realtime mode batches sync-reports asynchronously to keep KPI accurate without blocking watchdog.
- Strict checksum calculation: srv_hash != local_hash.
- NO-OP mode when AEGIS_WORKSTATION_ID or AEGIS_AGENT_TOKEN is not configured.
"""

import os
import sys
import json
import time
import uuid
import atexit
import hashlib
import logging
import platform
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

import requests

logger = logging.getLogger("aegis.pb56")


# ── CONFIGURATION & ENVIRONMENT ───────────────────────────────────────────────

def get_workstation_id() -> str:
    return os.getenv("AEGIS_WORKSTATION_ID", "").strip()


def get_agent_token() -> str:
    return os.getenv("AEGIS_AGENT_TOKEN", "").strip()


def is_pb56_enabled() -> bool:
    """NO-OP check: True only if both workstation ID and secret token are present."""
    return bool(get_workstation_id() and get_agent_token())


def get_queue_directory() -> str:
    """
    Determines persistent directory for queue storage on disk.
    Default: /data/.aegis_queue inside the persistent storage volume.
    Fallback: local .aegis_queue in agent folder if /data is not accessible.
    """
    custom_dir = os.getenv("AEGIS_QUEUE_DIR", "").strip()
    if custom_dir:
        os.makedirs(custom_dir, exist_ok=True)
        return custom_dir

    watch_root = os.getenv("WATCH_ROOT", os.getenv("AEGIS_WATCH_DIR", "/data"))
    candidate = os.path.join(watch_root, ".aegis_queue")
    try:
        os.makedirs(candidate, exist_ok=True)
        test_file = os.path.join(candidate, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return candidate
    except Exception:
        fallback = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".aegis_queue"))
        os.makedirs(fallback, exist_ok=True)
        return fallback


# ── ATOMIC DISK PERSISTENCE ───────────────────────────────────────────────────

class PB56DiskQueue:
    """
    Thread-safe persistent queue on disk with atomic temp-file replace.
    Files named with workstation_id to ensure isolation.
    """

    def __init__(self, directory: str, workstation_id: str = "default"):
        self.directory = directory
        self.workstation_id = workstation_id or "default"
        os.makedirs(directory, exist_ok=True)
        self.lock = threading.Lock()
        safe_ws_id = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in self.workstation_id)
        self.files_queue_path = os.path.join(directory, f"scheduled_files_{safe_ws_id}.json")
        self.reports_queue_path = os.path.join(directory, f"pending_reports_{safe_ws_id}.json")
        self.failed_queue_path = os.path.join(directory, f"failed_files_{safe_ws_id}.json")
        self.config_cache_path = os.path.join(directory, f"last_known_config_{safe_ws_id}.json")

    def _read_json(self, path: str, default: Any) -> Any:
        if not os.path.exists(path):
            return default
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[PB56 DiskQueue] Corrupted file at {path}, resetting safely: {e}")
            return default

    def _write_json_atomic(self, path: str, data: Any) -> None:
        temp_path = f"{path}.tmp.{uuid.uuid4().hex}"
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(temp_path, path)
        except Exception as e:
            logger.error(f"[PB56 DiskQueue] Atomic write failed for {path}: {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    # ── Scheduled files queue
    def enqueue_file(self, file_path: str, department: str, event_type: str) -> None:
        with self.lock:
            items: List[Dict[str, Any]] = self._read_json(self.files_queue_path, [])
            abs_path = os.path.abspath(file_path)
            items = [it for it in items if it.get("abs_path") != abs_path]
            items.append({
                "abs_path": abs_path,
                "file_path": file_path,
                "department": department,
                "event_type": event_type,
                "retry_count": 0,
                "queued_at": datetime.now(timezone.utc).isoformat()
            })
            self._write_json_atomic(self.files_queue_path, items)

    def dequeue_all_files(self) -> List[Dict[str, Any]]:
        with self.lock:
            items: List[Dict[str, Any]] = self._read_json(self.files_queue_path, [])
            if items:
                self._write_json_atomic(self.files_queue_path, [])
            valid_items = [it for it in items if os.path.exists(it.get("file_path", ""))]
            return valid_items

    def requeue_files(self, items: List[Dict[str, Any]]) -> None:
        """Puts files back into queue if retryable network error occurs."""
        if not items:
            return
        with self.lock:
            current: List[Dict[str, Any]] = self._read_json(self.files_queue_path, [])
            current_paths = {it.get("abs_path") for it in current}
            for it in items:
                if it.get("abs_path") not in current_paths:
                    current.append(it)
            self._write_json_atomic(self.files_queue_path, current)

    def move_to_failed(self, item: Dict[str, Any], reason: str) -> None:
        """Moves permanently failed file to failed log after max retries."""
        with self.lock:
            failed: List[Dict[str, Any]] = self._read_json(self.failed_queue_path, [])
            item_copy = dict(item)
            item_copy["failed_at"] = datetime.now(timezone.utc).isoformat()
            item_copy["failure_reason"] = reason
            failed.append(item_copy)
            self._write_json_atomic(self.failed_queue_path, failed[:500])

    def peek_files_count(self) -> int:
        with self.lock:
            items: List[Dict[str, Any]] = self._read_json(self.files_queue_path, [])
            return len(items)

    # ── Pending sync reports queue
    def enqueue_report(self, report_payload: Dict[str, Any]) -> None:
        with self.lock:
            reports: List[Dict[str, Any]] = self._read_json(self.reports_queue_path, [])
            rep_id = str(report_payload.get("report_id"))
            reports = [r for r in reports if str(r.get("report_id")) != rep_id]
            reports.append(report_payload)
            self._write_json_atomic(self.reports_queue_path, reports)

    def get_pending_reports(self) -> List[Dict[str, Any]]:
        with self.lock:
            return self._read_json(self.reports_queue_path, [])

    def remove_report(self, report_id: str) -> None:
        with self.lock:
            reports: List[Dict[str, Any]] = self._read_json(self.reports_queue_path, [])
            reports = [r for r in reports if str(r.get("report_id")) != str(report_id)]
            self._write_json_atomic(self.reports_queue_path, reports)

    # ── Last known config cache
    def save_last_config(self, config: Dict[str, Any]) -> None:
        with self.lock:
            self._write_json_atomic(self.config_cache_path, config)

    def load_last_config(self) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self._read_json(self.config_cache_path, None)


# ── PB56 AGENT CONTROLLER ─────────────────────────────────────────────────────

class PB56AgentController:
    """Manages PB56 heartbeat, sync modes, scheduled batches, and reporting."""

    def __init__(
        self,
        workstation_id: str,
        token: str,
        backend_url: str,
        fallback_backend_url: Optional[str] = None,
        watch_path: str = "/data",
        queue_dir: Optional[str] = None,
        sync_client_instance: Optional[Any] = None,
    ):
        self.workstation_id = workstation_id
        self.token = token
        self.backend_url = backend_url.rstrip("/")
        self.fallback_backend_url = fallback_backend_url.rstrip("/") if fallback_backend_url else None
        self.watch_path = watch_path
        self.queue = PB56DiskQueue(queue_dir or get_queue_directory(), workstation_id=self.workstation_id)
        self.sync_client = sync_client_instance
        self.sync_lock = threading.Lock()  # Thread-safety for SyncClient calls

        # State
        self.current_sync_mode = "realtime"
        self.current_schedule_type: Optional[str] = None
        self.current_shift_end_time: Optional[str] = None
        self.current_timezone = "Asia/Ho_Chi_Minh"
        self.heartbeat_interval = 30
        self.threshold_cycles = 3

        # Realtime batch aggregation state
        self._realtime_lock = threading.Lock()
        self._realtime_files_ingested = 0
        self._realtime_records_extracted = 0
        self._realtime_checksum_errors = 0
        self._last_realtime_report_time = time.time()

        self.last_shift_trigger_date: Optional[str] = None
        self.last_scheduled_flush_time = time.time()
        self.notified_unregistered = False

        self._stop_event = threading.Event()
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._scheduler_thread: Optional[threading.Thread] = None

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Agent-Token": self.token,
            "Authorization": f"Bearer {self.token}",
        }

    def _request(self, method: str, path: str, json_body: Optional[Dict[str, Any]] = None, timeout: int = 15) -> Optional[requests.Response]:
        """Tries primary backend URL, then fallback URL."""
        urls = [f"{self.backend_url}{path}"]
        if self.fallback_backend_url and self.fallback_backend_url != self.backend_url:
            urls.append(f"{self.fallback_backend_url}{path}")

        for url in urls:
            try:
                resp = requests.request(
                    method=method,
                    url=url,
                    json=json_body,
                    headers=self._headers(),
                    timeout=timeout,
                )
                return resp
            except requests.exceptions.RequestException:
                continue
        return None

    # ── Heartbeat Loop
    def send_heartbeat(self, timeout: int = 15) -> Optional[Dict[str, Any]]:
        """Sends POST /api/v1/workstations/heartbeat (id in body)."""
        body = {
            "id": self.workstation_id,
            "hostname": platform.node() or "agent-node",
            "ip_address": "127.0.0.1",
            "os_info": f"{platform.system()} {platform.release()}",
            "monitored_folder": os.path.abspath(self.watch_path),
        }

        resp = self._request("POST", "/api/v1/workstations/heartbeat", body, timeout=timeout)
        if not resp:
            return None

        if resp.status_code == 404:
            if not self.notified_unregistered:
                logger.warning(f"[PB56] Máy trạm '{self.workstation_id}' chưa đăng ký trong backend PB56 (HTTP 404).")
                self.notified_unregistered = True
            return None

        if resp.status_code == 401:
            logger.error("[PB56] Token máy trạm không hợp lệ hoặc đã bị xoay (HTTP 401).")
            return None

        if resp.status_code == 403:
            logger.warning("[PB56] Máy trạm demo bị từ chối gửi heartbeat (HTTP 403).")
            return None

        if resp.status_code == 200:
            self.notified_unregistered = False
            try:
                data = resp.json()
            except Exception:
                return None

            # 1. Restore current mode from backend response
            backend_mode = data.get("sync_mode")
            if backend_mode in ("realtime", "scheduled"):
                self.current_sync_mode = backend_mode
                self.current_schedule_type = data.get("schedule_type")
                self.current_shift_end_time = data.get("shift_end_time")
                self.current_timezone = data.get("timezone") or self.current_timezone

                # Cache to disk for offline restarts
                self.queue.save_last_config({
                    "sync_mode": self.current_sync_mode,
                    "schedule_type": self.current_schedule_type,
                    "shift_end_time": self.current_shift_end_time,
                    "timezone": self.current_timezone,
                })

            # 2. Check pending command
            if data.get("has_pending_command") and data.get("pending_command"):
                cmd = data["pending_command"]
                self._handle_pending_command(cmd)

            return data

        return None

    def _handle_pending_command(self, cmd: Dict[str, Any]) -> None:
        """Applies pending target sync mode, flushes if transitioning to realtime, then sends ACK."""
        target_mode = cmd.get("target_sync_mode")
        target_sched = cmd.get("target_schedule_type")
        target_shift = cmd.get("target_shift_end_time")
        target_tz = cmd.get("timezone") or "Asia/Ho_Chi_Minh"

        logger.info(f"[PB56] Nhận lệnh đổi chế độ: mode={target_mode}, sched={target_sched}, shift={target_shift}")

        old_mode = self.current_sync_mode
        self.current_sync_mode = target_mode
        self.current_schedule_type = target_sched
        self.current_shift_end_time = target_shift
        self.current_timezone = target_tz

        self.queue.save_last_config({
            "sync_mode": self.current_sync_mode,
            "schedule_type": self.current_schedule_type,
            "shift_end_time": self.current_shift_end_time,
            "timezone": self.current_timezone,
        })

        if old_mode == "scheduled" and target_mode == "realtime":
            logger.info("[PB56] Chuyển sang Real-time -> Lập tức flush toàn bộ hàng đợi tệp...")
            self.flush_scheduled_files()

        self.send_ack_sync_mode(target_mode, target_sched, target_shift)

    def send_ack_sync_mode(self, mode: str, sched: Optional[str], shift: Optional[str]) -> bool:
        """Sends POST /api/v1/workstations/{id}/ack-sync-mode."""
        body = {
            "applied_mode": mode,
            "applied_schedule_type": sched,
            "applied_shift_end_time": shift,
        }
        resp = self._request("POST", f"/api/v1/workstations/{self.workstation_id}/ack-sync-mode", body)
        if not resp:
            return False

        if resp.status_code == 200:
            logger.info(f"[PB56] Đã xác nhận (ACK) áp dụng thành công chế độ '{mode}'.")
            return True
        elif resp.status_code == 400:
            logger.error(f"[PB56] Backend từ chối ACK (400 Bad Request): {resp.text}. Dừng thử lại mù.")
            return False
        return False

    # ── Sync Report Handling
    def send_sync_report(
        self,
        files_ingested: int,
        records_extracted: int,
        checksum_errors: int,
        status_str: str = "SUCCESS",
        error_message: Optional[str] = None,
        report_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """Persists report to disk first, transmits to backend, removes on 200."""
        rep_uuid = report_id or uuid.uuid4()
        payload = {
            "report_id": str(rep_uuid),
            "files_ingested": max(0, int(files_ingested)),
            "records_extracted": max(0, int(records_extracted)),
            "checksum_errors": max(0, int(checksum_errors)),
            "status": status_str,
            "error_message": error_message,
        }

        self.queue.enqueue_report(payload)
        return self._try_flush_report(payload)

    def _try_flush_report(self, payload: Dict[str, Any]) -> bool:
        rep_id = payload.get("report_id")
        resp = self._request("POST", f"/api/v1/workstations/{self.workstation_id}/sync-report", payload)
        if resp and resp.status_code == 200:
            self.queue.remove_report(rep_id)
            return True
        return False

    def flush_pending_reports(self) -> None:
        """Flushes any unsent reports from disk (retries using original report_id)."""
        pending = self.queue.get_pending_reports()
        for rep in pending:
            self._try_flush_report(rep)

    # ── Realtime Batched Report Flushing
    def record_realtime_metrics(self, files: int, records: int, checksum_err: int) -> None:
        """Buffers realtime ingestion counts and flushes periodically or in batches."""
        with self._realtime_lock:
            self._realtime_files_ingested += files
            self._realtime_records_extracted += records
            self._realtime_checksum_errors += checksum_err

            now = time.time()
            if self._realtime_files_ingested >= 5 or (now - self._last_realtime_report_time >= 15 and self._realtime_files_ingested > 0):
                self._flush_realtime_metrics_now()

    def _flush_realtime_metrics_now(self) -> None:
        """Flushes accumulated realtime stats to backend sync-report."""
        if self._realtime_files_ingested == 0 and self._realtime_checksum_errors == 0:
            return

        f = self._realtime_files_ingested
        r = self._realtime_records_extracted
        c = self._realtime_checksum_errors

        self._realtime_files_ingested = 0
        self._realtime_records_extracted = 0
        self._realtime_checksum_errors = 0
        self._last_realtime_report_time = time.time()

        self.send_sync_report(
            files_ingested=f,
            records_extracted=r,
            checksum_errors=c,
            status_str="SUCCESS" if c == 0 else "PARTIAL",
        )

    # ── Scheduled Flush Execution
    def flush_scheduled_files(self) -> Tuple[int, int, int]:
        """
        Flushes all queued files to backend, aggregates stats, and submits sync-report.
        - Network/5xx: files requeued for next cycle.
        - Permanent 4xx after 3 attempts: moved to failed list.
        - Empty/deleted batch: sends no sync-report.
        """
        if not self.sync_client:
            logger.warning("[PB56] SyncClient instance missing, cannot flush files.")
            return 0, 0, 0

        files = self.queue.dequeue_all_files()
        if not files:
            return 0, 0, 0

        total_files = len(files)
        files_ingested = 0
        records_extracted = 0
        checksum_errors = 0
        requeue_items = []

        logger.info(f"[PB56 Scheduled] Bắt đầu đồng bộ mẻ {total_files} tệp...")

        for item in files:
            fpath = item.get("file_path")
            dept = item.get("department", "General")
            ev_type = item.get("event_type", "created")

            if not os.path.exists(fpath):
                continue

            local_hash = ""
            try:
                hasher = hashlib.sha256()
                with open(fpath, "rb") as f:
                    while chunk := f.read(65536):
                        hasher.update(chunk)
                local_hash = hasher.hexdigest()
            except Exception:
                pass

            # Sync file safely with lock
            with self.sync_lock:
                try:
                    res = self.sync_client.sync_file(fpath, department=dept, event_type=ev_type)
                except Exception as e:
                    res = {"success": False, "status_code": 0, "error": str(e)}

            if res.get("success"):
                files_ingested += 1
                data = res.get("data") if isinstance(res.get("data"), dict) else {}
                chunks = data.get("chunks_extracted") or data.get("chunk_count") or 0
                records_extracted += int(chunks)

                srv_hash = data.get("file_hash")
                if srv_hash and local_hash and srv_hash != local_hash:
                    checksum_errors += 1
            else:
                code = res.get("status_code", 0)
                item["retry_count"] = item.get("retry_count", 0) + 1

                # If permanent 4xx and retries >= 3, move to failed log
                if 400 <= code < 500 and item["retry_count"] >= 3:
                    logger.warning(f"[PB56] Tệp {fpath} thất bại vĩnh viễn ({code}), chuyển sang danh sách lỗi.")
                    self.queue.move_to_failed(item, res.get("error", f"HTTP {code}"))
                else:
                    # Retryable: keep in queue for next cycle
                    requeue_items.append(item)

        # Put retryable items back to disk queue
        if requeue_items:
            self.queue.requeue_files(requeue_items)

        # Classify batch status
        effective_processed = files_ingested + (total_files - len(requeue_items) - files_ingested)
        if effective_processed == 0 and files_ingested == 0:
            # All items requeued due to network error -> do not send empty report
            return 0, 0, 0

        if files_ingested == total_files and checksum_errors == 0:
            batch_status = "SUCCESS"
        elif files_ingested > 0:
            batch_status = "PARTIAL"
        else:
            batch_status = "FAILED"

        if files_ingested > 0 or checksum_errors > 0 or batch_status == "FAILED":
            self.send_sync_report(
                files_ingested=files_ingested,
                records_extracted=records_extracted,
                checksum_errors=checksum_errors,
                status_str=batch_status,
            )

        logger.info(f"[PB56 Scheduled] Hoàn tất mẻ: {files_ingested}/{total_files} tệp thành công, {len(requeue_items)} tệp giữ lại hàng đợi.")
        return files_ingested, records_extracted, checksum_errors

    # ── Background Loops
    def _heartbeat_worker(self) -> None:
        consecutive_failures = 0
        max_backoff = self.heartbeat_interval * self.threshold_cycles

        while not self._stop_event.is_set():
            try:
                res = self.send_heartbeat()
                if res is not None:
                    consecutive_failures = 0
                    self.flush_pending_reports()
                else:
                    consecutive_failures += 1
            except Exception as ex:
                consecutive_failures += 1
                logger.debug(f"[PB56 Heartbeat] Exception: {ex}")

            if consecutive_failures > 0:
                sleep_sec = min(self.heartbeat_interval * (1.5 ** consecutive_failures), max_backoff)
            else:
                sleep_sec = self.heartbeat_interval

            self._stop_event.wait(timeout=sleep_sec)

    def _scheduler_worker(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._check_and_trigger_scheduled()
                # Also flush realtime buffer if any
                with self._realtime_lock:
                    if self._realtime_files_ingested > 0 and (time.time() - self._last_realtime_report_time >= 15):
                        self._flush_realtime_metrics_now()
            except Exception as ex:
                logger.debug(f"[PB56 Scheduler] Exception: {ex}")
            self._stop_event.wait(timeout=10)

    def _check_and_trigger_scheduled(self) -> None:
        if self.current_sync_mode != "scheduled":
            return

        now_ts = time.time()
        sched_type = self.current_schedule_type

        # 1. 15-minute schedule
        if sched_type == "15m":
            if now_ts - self.last_scheduled_flush_time >= 900:
                self.flush_scheduled_files()
                self.last_scheduled_flush_time = now_ts

        # 2. 1-hour schedule
        elif sched_type == "1h":
            if now_ts - self.last_scheduled_flush_time >= 3600:
                self.flush_scheduled_files()
                self.last_scheduled_flush_time = now_ts

        # 3. End of shift schedule
        elif sched_type == "end_of_shift" and self.current_shift_end_time:
            tz = None
            if ZoneInfo:
                try:
                    tz = ZoneInfo(self.current_timezone)
                except Exception:
                    pass
            if not tz:
                tz = timezone(timedelta(hours=7))

            local_now = datetime.now(tz)
            today_str = local_now.strftime("%Y-%m-%d")
            current_hhmm = local_now.strftime("%H:%M")

            if current_hhmm >= self.current_shift_end_time and self.last_shift_trigger_date != today_str:
                logger.info(f"[PB56] Cuối ca làm việc ({current_hhmm} >= {self.current_shift_end_time}). Kích hoạt đồng bộ...")
                self.flush_scheduled_files()
                self.last_shift_trigger_date = today_str
                self.last_scheduled_flush_time = now_ts

    def determine_initial_mode_sync(self) -> None:
        """
        Synchronous startup determination:
        1. Fast heartbeat (timeout=5s)
        2. Fallback to cached config on disk
        3. Fallback to default 'realtime'
        """
        logger.info(f"[PB56] Xác định chế độ đồng bộ ban đầu cho máy '{self.workstation_id}'...")
        res = self.send_heartbeat(timeout=5)
        if res is not None:
            logger.info(f"[PB56] Đã xác định chế độ từ Backend: {self.current_sync_mode} (sched={self.current_schedule_type})")
            return

        # Fallback to disk cache
        cached = self.queue.load_last_config()
        if cached and cached.get("sync_mode"):
            self.current_sync_mode = cached["sync_mode"]
            self.current_schedule_type = cached.get("schedule_type")
            self.current_shift_end_time = cached.get("shift_end_time")
            self.current_timezone = cached.get("timezone", "Asia/Ho_Chi_Minh")
            logger.info(f"[PB56] Backend không phản hồi nhanh -> Khôi phục chế độ từ đĩa: {self.current_sync_mode}")
            return

        # Default fallback
        self.current_sync_mode = "realtime"
        logger.info("[PB56] Không có cấu hình trước đó -> Mặc định khởi đầu: realtime")

    def start(self) -> None:
        """Starts background heartbeat and scheduler daemon threads."""
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_worker, daemon=True, name="pb56-heartbeat")
        self._scheduler_thread = threading.Thread(target=self._scheduler_worker, daemon=True, name="pb56-scheduler")
        self._heartbeat_thread.start()
        self._scheduler_thread.start()

    def shutdown(self) -> None:
        """Gracefully flushes queues and signals worker threads to stop."""
        if self._stop_event.is_set():
            return
        logger.info("[PB56] Đang dừng PB56 Agent Controller và flush dữ liệu đĩa...")
        self._stop_event.set()
        try:
            with self._realtime_lock:
                self._flush_realtime_metrics_now()
            self.flush_scheduled_files()
            self.flush_pending_reports()
        except Exception as e:
            logger.debug(f"[PB56] Shutdown flush note: {e}")


# ── SINGLETON & DISPATCHER INTERFACES ─────────────────────────────────────────

_GLOBAL_AGENT: Optional[PB56AgentController] = None


def init_pb56_agent(sync_client: Any, watch_path: str = "/data") -> Optional[PB56AgentController]:
    """
    Initializes PB56 Agent singleton if configured.
    Synchronously determines sync mode BEFORE initial_sync_scan runs.
    Returns None if not configured (NO-OP mode).
    """
    global _GLOBAL_AGENT
    if not is_pb56_enabled():
        logger.info("[PB56] Chưa cấu hình AEGIS_WORKSTATION_ID hoặc AEGIS_AGENT_TOKEN -> Kích hoạt chế độ NO-OP.")
        return None

    if _GLOBAL_AGENT is None:
        backend_url = os.getenv("AEGIS_BACKEND_URL", "http://backend:5000")
        fallback_url = os.getenv("AEGIS_BACKEND_FALLBACK_URL", "http://host.docker.internal:5000")

        _GLOBAL_AGENT = PB56AgentController(
            workstation_id=get_workstation_id(),
            token=get_agent_token(),
            backend_url=backend_url,
            fallback_backend_url=fallback_url,
            watch_path=watch_path,
            sync_client_instance=sync_client,
        )
        # Step 2: Determine mode BEFORE initial_sync_scan
        _GLOBAL_AGENT.determine_initial_mode_sync()
        _GLOBAL_AGENT.start()
        atexit.register(shutdown_pb56_agent)

    return _GLOBAL_AGENT


def get_pb56_agent() -> Optional[PB56AgentController]:
    return _GLOBAL_AGENT


def shutdown_pb56_agent() -> None:
    global _GLOBAL_AGENT
    if _GLOBAL_AGENT is not None:
        _GLOBAL_AGENT.shutdown()
        _GLOBAL_AGENT = None


def pb56_dispatch_sync(
    sync_client: Any,
    file_path: str,
    department: str = "General",
    event_type: str = "created"
) -> Dict[str, Any]:
    """
    Unified Dispatcher:
    - If NO-OP: calls sync_client.sync_file directly (zero overhead).
    - If Real-time: calls sync_file immediately and buffers metrics for batched async reporting.
    - If Scheduled: queues file to disk queue and returns compatible success dict with 2-layer data.
    """
    agent = get_pb56_agent()
    if agent is None:
        return sync_client.sync_file(file_path, department=department, event_type=event_type)

    # Scheduled mode: enqueue to persistent disk queue
    if agent.current_sync_mode == "scheduled":
        agent.queue.enqueue_file(file_path, department, event_type)
        return {
            "success": True,
            "status": "queued_scheduled",
            "message": f"Tệp được xếp vào hàng đợi đồng bộ định kỳ ({agent.current_schedule_type}).",
            "data": {
                "data": {
                    "doc_id": "QUEUED",
                    "chunks_extracted": 0,
                    "file_path": file_path,
                    "queued": True,
                },
                "file_path": file_path,
                "queued": True,
            }
        }

    # Real-time mode: sync immediately
    local_hash = ""
    try:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        local_hash = hasher.hexdigest()
    except Exception:
        pass

    with agent.sync_lock:
        res = sync_client.sync_file(file_path, department=department, event_type=event_type)

    files_ingested = 1 if res.get("success") else 0
    records_extracted = 0
    checksum_errors = 0

    if res.get("success"):
        data = res.get("data") if isinstance(res.get("data"), dict) else {}
        chunks = data.get("chunks_extracted") or data.get("chunk_count") or 0
        records_extracted = int(chunks)

        srv_hash = data.get("file_hash")
        if srv_hash and local_hash and srv_hash != local_hash:
            checksum_errors = 1

    # Buffer realtime metrics and flush asynchronously in batch
    agent.record_realtime_metrics(files_ingested, records_extracted, checksum_errors)

    return res
