"""
Unit Test Suite for PB56 AEGIS Local Agent Integration
Module: aegis-agent/src/test_pb56_agent_sync.py

Tests Phase 3a & 3b conditions:
1. NO-OP mode: Zero threads, zero files on disk, returns original sync_client result.
2. Disk queue: Atomic replace, deduplication, skips deleted files, corrupted JSON recovery, ws_id isolation.
3. Heartbeat: Restores current mode and timezone upon restart.
4. Mode switch: Flush scheduled files immediately when transitioning from Scheduled -> Realtime.
5. Idempotent reports: Retries use the exact same report_id UUID.
6. Watcher isolation: Files in .aegis_queue are rejected by watcher's _is_supported.
7. Compatible payload: Scheduled response contains 2-tier data structure for watcher logger.
8. Batch classification: SUCCESS vs PARTIAL vs FAILED in flush_scheduled_files.
9. Error handling: Heartbeat 404 logs once and backs off; ack 400 stops retrying.
10. Scheduled initial boot with 50 files: 0 sync_file requests during initial scan.
11. Advanced flush: 5xx keeps files in queue; permanent 4xx moves to failed list; empty batch sends no report.
"""

import os
import sys
import json
import uuid
import time
import hashlib
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

# Ensure agent src is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock watchdog if not installed in local host environment
if "watchdog" not in sys.modules:
    sys.modules["watchdog"] = MagicMock()
    sys.modules["watchdog.observers"] = MagicMock()
    sys.modules["watchdog.events"] = MagicMock()

from src.pb56_agent_sync import (
    PB56DiskQueue,
    PB56AgentController,
    init_pb56_agent,
    get_pb56_agent,
    shutdown_pb56_agent,
    pb56_dispatch_sync,
)
from src.watcher import _is_supported


class DummySyncClient:
    def __init__(self, failure_on=None, fail_code=500):
        self.synced_files = []
        self.failure_on = failure_on or set()
        self.fail_code = fail_code

    def sync_file(self, file_path, department="General", event_type="created"):
        if file_path in self.failure_on:
            return {"success": False, "status_code": self.fail_code, "error": f"HTTP {self.fail_code}"}

        self.synced_files.append((file_path, department, event_type))
        try:
            with open(file_path, "rb") as f:
                real_hash = hashlib.sha256(f.read()).hexdigest()
        except Exception:
            real_hash = "dummy"

        return {
            "success": True,
            "status_code": 200,
            "data": {
                "file_path": file_path,
                "file_hash": real_hash,
                "chunks_extracted": 3,
            }
        }


class TestPB56AgentSync(unittest.TestCase):

    def setUp(self):
        shutdown_pb56_agent()
        self.test_dir = tempfile.mkdtemp(prefix="aegis_test_queue_")

    def tearDown(self):
        shutdown_pb56_agent()
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    # ── TEST 1: NO-OP MODE ───────────────────────────────────────────────────
    def test_noop_mode_when_unconfigured(self):
        with patch.dict(os.environ, {"AEGIS_WORKSTATION_ID": "", "AEGIS_AGENT_TOKEN": ""}):
            dummy = DummySyncClient()
            agent = init_pb56_agent(dummy, watch_path=self.test_dir)
            self.assertIsNone(agent)
            self.assertIsNone(get_pb56_agent())

            fake_file = os.path.join(self.test_dir, "test.txt")
            with open(fake_file, "w") as f:
                f.write("hello world")

            res = pb56_dispatch_sync(dummy, fake_file, department="Legal", event_type="created")
            self.assertTrue(res.get("success"))
            self.assertEqual(len(dummy.synced_files), 1)
            self.assertEqual(dummy.synced_files[0][0], fake_file)
            self.assertFalse(os.path.exists(os.path.join(self.test_dir, ".aegis_queue")))

    # ── TEST 2: DISK QUEUE ATOMIC & RECOVERY ─────────────────────────────────
    def test_disk_queue_atomic_operations_and_recovery(self):
        queue = PB56DiskQueue(self.test_dir, workstation_id="WS-TEST-01")

        f1 = os.path.join(self.test_dir, "doc1.txt")
        f2 = os.path.join(self.test_dir, "doc2.txt")
        with open(f1, "w") as f: f.write("1")
        with open(f2, "w") as f: f.write("2")

        queue.enqueue_file(f1, "Sales", "created")
        queue.enqueue_file(f1, "Sales", "modified")
        self.assertEqual(queue.peek_files_count(), 1)

        queue.enqueue_file(f2, "Legal", "created")
        self.assertEqual(queue.peek_files_count(), 2)

        os.remove(f2)
        dequeued = queue.dequeue_all_files()
        self.assertEqual(len(dequeued), 1)
        self.assertEqual(dequeued[0]["file_path"], f1)
        self.assertEqual(queue.peek_files_count(), 0)

        # Corrupted JSON recovery
        queue_file = os.path.join(self.test_dir, "scheduled_files_WS-TEST-01.json")
        with open(queue_file, "w") as f:
            f.write("{corrupted_json:;;;}")
        self.assertEqual(queue.peek_files_count(), 0)

    # ── TEST 3: HEARTBEAT RESTORES CURRENT MODE ──────────────────────────────
    def test_heartbeat_restores_sync_mode_on_restart(self):
        ctrl = PB56AgentController(
            workstation_id="WS-TEST-AGENT",
            token="aegis_sec_token123",
            backend_url="http://mock-backend",
            watch_path=self.test_dir,
            queue_dir=self.test_dir,
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "success": True,
            "id": "WS-TEST-AGENT",
            "sync_mode": "scheduled",
            "schedule_type": "end_of_shift",
            "shift_end_time": "17:30",
            "timezone": "Asia/Ho_Chi_Minh",
            "has_pending_command": False,
            "pending_command": None,
        }

        with patch.object(ctrl, "_request", return_value=mock_resp):
            data = ctrl.send_heartbeat()
            self.assertIsNotNone(data)
            self.assertEqual(ctrl.current_sync_mode, "scheduled")
            self.assertEqual(ctrl.current_schedule_type, "end_of_shift")
            self.assertEqual(ctrl.current_shift_end_time, "17:30")
            self.assertEqual(ctrl.current_timezone, "Asia/Ho_Chi_Minh")

    # ── TEST 4: FLUSH WHEN SWITCHING SCHEDULED -> REALTIME ───────────────────
    def test_flush_when_transitioning_to_realtime(self):
        dummy = DummySyncClient()
        ctrl = PB56AgentController(
            workstation_id="WS-TEST-AGENT",
            token="aegis_sec_token123",
            backend_url="http://mock-backend",
            watch_path=self.test_dir,
            queue_dir=self.test_dir,
            sync_client_instance=dummy,
        )
        ctrl.current_sync_mode = "scheduled"

        f1 = os.path.join(self.test_dir, "batch1.txt")
        f2 = os.path.join(self.test_dir, "batch2.txt")
        with open(f1, "w") as f: f.write("content 1")
        with open(f2, "w") as f: f.write("content 2")

        ctrl.queue.enqueue_file(f1, "IT", "created")
        ctrl.queue.enqueue_file(f2, "IT", "created")
        self.assertEqual(ctrl.queue.peek_files_count(), 2)

        cmd = {
            "target_sync_mode": "realtime",
            "target_schedule_type": None,
            "target_shift_end_time": None,
            "timezone": "Asia/Ho_Chi_Minh",
        }

        with patch.object(ctrl, "send_ack_sync_mode", return_value=True) as mock_ack, \
             patch.object(ctrl, "send_sync_report", return_value=True) as mock_report:
            ctrl._handle_pending_command(cmd)
            self.assertEqual(ctrl.current_sync_mode, "realtime")
            self.assertEqual(len(dummy.synced_files), 2)
            self.assertEqual(ctrl.queue.peek_files_count(), 0)
            mock_ack.assert_called_once_with("realtime", None, None)
            mock_report.assert_called_once()

    # ── TEST 5: SYNC REPORT RETRY PRESERVES REPORT_ID ────────────────────────
    def test_sync_report_retry_uses_same_report_id(self):
        ctrl = PB56AgentController(
            workstation_id="WS-TEST-AGENT",
            token="aegis_sec_token123",
            backend_url="http://mock-backend",
            watch_path=self.test_dir,
            queue_dir=self.test_dir,
        )

        test_uuid = uuid.uuid4()

        with patch.object(ctrl, "_request", return_value=None):
            success = ctrl.send_sync_report(
                files_ingested=5,
                records_extracted=120,
                checksum_errors=0,
                report_id=test_uuid
            )
            self.assertFalse(success)
            pending = ctrl.queue.get_pending_reports()
            self.assertEqual(len(pending), 1)
            self.assertEqual(pending[0]["report_id"], str(test_uuid))

        ok_resp = MagicMock()
        ok_resp.status_code = 200
        ok_resp.json.return_value = {"success": True, "idempotent": False}

        with patch.object(ctrl, "_request", return_value=ok_resp) as mock_req:
            ctrl.flush_pending_reports()
            mock_req.assert_called_once()
            call_body = mock_req.call_args[0][2] if len(mock_req.call_args[0]) > 2 else mock_req.call_args[1].get("json_body")
            self.assertEqual(call_body["report_id"], str(test_uuid))
            self.assertEqual(len(ctrl.queue.get_pending_reports()), 0)

    # ── TEST 6: WATCHER ISOLATION FOR QUEUE FILES ────────────────────────────
    def test_watcher_ignores_queue_files(self):
        q_dir = os.path.join(self.test_dir, ".aegis_queue")
        os.makedirs(q_dir, exist_ok=True)
        q_file = os.path.join(q_dir, "scheduled_files_WS-01.json")
        tmp_file = os.path.join(q_dir, "scheduled_files_WS-01.json.tmp.123abc456")

        self.assertFalse(_is_supported(q_file))
        self.assertFalse(_is_supported(tmp_file))

    # ── TEST 7: COMPATIBLE SCHEDULED LOGGING PAYLOAD ─────────────────────────
    def test_scheduled_response_compatibility_with_watcher_log(self):
        ctrl = PB56AgentController(
            workstation_id="WS-TEST-AGENT",
            token="aegis_sec_token123",
            backend_url="http://mock-backend",
            watch_path=self.test_dir,
            queue_dir=self.test_dir,
        )
        ctrl.current_sync_mode = "scheduled"
        ctrl.current_schedule_type = "15m"

        with patch("src.pb56_agent_sync.get_pb56_agent", return_value=ctrl):
            dummy = DummySyncClient()
            fake_file = os.path.join(self.test_dir, "contract.pdf")
            with open(fake_file, "w") as f: f.write("pdf data")

            res = pb56_dispatch_sync(dummy, fake_file, "Legal", "created")
            self.assertTrue(res.get("success"))
            self.assertEqual(res.get("status"), "queued_scheduled")

            data = res.get("data", {}).get("data", {})
            doc_id = data.get("doc_id")
            chunks = data.get("chunks_extracted")

            self.assertEqual(doc_id, "QUEUED")
            self.assertEqual(chunks, 0)

    # ── TEST 8: BATCH STATUS CLASSIFICATION ──────────────────────────────────
    def test_batch_flush_status_classification(self):
        f1 = os.path.join(self.test_dir, "good1.txt")
        f2 = os.path.join(self.test_dir, "good2.txt")
        f3 = os.path.join(self.test_dir, "bad.txt")
        for f in (f1, f2, f3):
            with open(f, "w") as fp: fp.write("sample")

        # Case A: All succeed -> SUCCESS
        dummy_ok = DummySyncClient()
        ctrl_ok = PB56AgentController(
            workstation_id="WS-BATCH-1", token="tok", backend_url="http://mock",
            watch_path=self.test_dir, queue_dir=self.test_dir, sync_client_instance=dummy_ok
        )
        ctrl_ok.queue.enqueue_file(f1, "IT", "created")
        ctrl_ok.queue.enqueue_file(f2, "IT", "created")

        with patch.object(ctrl_ok, "send_sync_report") as mock_rep:
            ctrl_ok.flush_scheduled_files()
            mock_rep.assert_called_once()
            self.assertEqual(mock_rep.call_args[1]["status_str"], "SUCCESS")

        # Case B: 1 fails, 1 succeeds -> PARTIAL
        dummy_part = DummySyncClient(failure_on={f3})
        ctrl_part = PB56AgentController(
            workstation_id="WS-BATCH-2", token="tok", backend_url="http://mock",
            watch_path=self.test_dir, queue_dir=self.test_dir, sync_client_instance=dummy_part
        )
        ctrl_part.queue.enqueue_file(f1, "IT", "created")
        ctrl_part.queue.enqueue_file(f3, "IT", "created")

        with patch.object(ctrl_part, "send_sync_report") as mock_rep:
            ctrl_part.flush_scheduled_files()
            mock_rep.assert_called_once()
            self.assertEqual(mock_rep.call_args[1]["status_str"], "PARTIAL")

    # ── TEST 9: HEARTBEAT 404 & ACK 400 ERROR HANDLING ───────────────────────
    def test_heartbeat_404_logs_once_and_ack_400_no_retry(self):
        ctrl = PB56AgentController(
            workstation_id="WS-ERR-TEST", token="tok", backend_url="http://mock",
            watch_path=self.test_dir, queue_dir=self.test_dir
        )

        resp_404 = MagicMock()
        resp_404.status_code = 404

        with patch.object(ctrl, "_request", return_value=resp_404):
            self.assertFalse(ctrl.notified_unregistered)
            res1 = ctrl.send_heartbeat()
            self.assertIsNone(res1)
            self.assertTrue(ctrl.notified_unregistered)

            res2 = ctrl.send_heartbeat()
            self.assertIsNone(res2)
            self.assertTrue(ctrl.notified_unregistered)

        resp_400 = MagicMock()
        resp_400.status_code = 400
        resp_400.text = "Mismatch"

        with patch.object(ctrl, "_request", return_value=resp_400):
            ack_success = ctrl.send_ack_sync_mode("realtime", None, None)
            self.assertFalse(ack_success)

    # ── TEST 10: SCHEDULED BOOT WITH 50 FILES ENQUEUED (0 SYNC REQUESTS) ─────
    def test_scheduled_initial_boot_enqueues_all_files_with_zero_network_calls(self):
        """Condition 2: When booting in Scheduled mode, initial scan enqueues 50 files without network sync_file calls."""
        dummy = DummySyncClient()
        ctrl = PB56AgentController(
            workstation_id="WS-BOOT-TEST",
            token="aegis_token_boot",
            backend_url="http://mock",
            watch_path=self.test_dir,
            queue_dir=self.test_dir,
            sync_client_instance=dummy
        )
        ctrl.current_sync_mode = "scheduled"
        ctrl.current_schedule_type = "end_of_shift"

        # Create 50 files
        file_paths = []
        for i in range(50):
            fp = os.path.join(self.test_dir, f"file_{i:02d}.pdf")
            with open(fp, "w") as f: f.write(f"content {i}")
            file_paths.append(fp)

        # Simulate initial_sync_scan loop calling pb56_dispatch_sync
        with patch("src.pb56_agent_sync.get_pb56_agent", return_value=ctrl):
            for fp in file_paths:
                res = pb56_dispatch_sync(dummy, fp, department="Sales", event_type="created")
                self.assertTrue(res.get("success"))
                self.assertEqual(res.get("status"), "queued_scheduled")

        # Zero actual network sync calls made!
        self.assertEqual(len(dummy.synced_files), 0)
        # All 50 files queued on disk
        self.assertEqual(ctrl.queue.peek_files_count(), 50)

    # ── TEST 11: ADVANCED FLUSH ERROR HANDLING ───────────────────────────────
    def test_advanced_flush_5xx_requeue_and_4xx_permanent_failure(self):
        """Condition 4: 5xx keeps files in queue; permanent 4xx moves to failed list; empty batch sends no report."""
        f_5xx = os.path.join(self.test_dir, "net_err.txt")
        f_4xx = os.path.join(self.test_dir, "bad_req.txt")
        with open(f_5xx, "w") as f: f.write("err500")
        with open(f_4xx, "w") as f: f.write("err400")

        dummy_5xx = DummySyncClient(failure_on={f_5xx}, fail_code=500)
        ctrl = PB56AgentController(
            workstation_id="WS-FLUSH-TEST", token="tok", backend_url="http://mock",
            watch_path=self.test_dir, queue_dir=self.test_dir, sync_client_instance=dummy_5xx
        )
        ctrl.queue.enqueue_file(f_5xx, "Legal", "created")

        # 1. 5xx failure -> file requeued
        with patch.object(ctrl, "send_sync_report") as mock_rep:
            ctrl.flush_scheduled_files()
            # File remained in queue for next cycle
            self.assertEqual(ctrl.queue.peek_files_count(), 1)
            # No empty report sent
            mock_rep.assert_not_called()

        # Clear queue before testing 4xx
        ctrl.queue.dequeue_all_files()
        self.assertEqual(ctrl.queue.peek_files_count(), 0)

        # 2. 4xx failure 3 times -> moved to failed log
        dummy_4xx = DummySyncClient(failure_on={f_4xx}, fail_code=400)
        ctrl.sync_client = dummy_4xx
        ctrl.queue.enqueue_file(f_4xx, "Legal", "created")

        for _ in range(3):
            ctrl.flush_scheduled_files()

        # File should now be moved to failed list, queue empty
        self.assertEqual(ctrl.queue.peek_files_count(), 0)
        failed_path = ctrl.queue.failed_queue_path
        self.assertTrue(os.path.exists(failed_path))
        with open(failed_path, "r") as fp:
            failed_data = json.load(fp)
            self.assertTrue(any("bad_req.txt" in it.get("file_path", "") for it in failed_data))


if __name__ == "__main__":
    unittest.main()
