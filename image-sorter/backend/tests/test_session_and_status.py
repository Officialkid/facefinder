import importlib
import asyncio
import json
import os
from pathlib import Path
import shutil
import sqlite3
import zipfile
import sys
import tempfile
from datetime import timedelta
import unittest
from unittest import mock


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_backend(temp_dir: str):
    os.environ["IMAGE_SORTER_SESSION_DB"] = str(Path(temp_dir) / "session_store.sqlite3")
    os.environ["IMAGE_SORTER_TEMP_DIR"] = str(Path(temp_dir) / "temp_storage")

    for module_name in [
        "main",
        "app",
        "app.models",
        "app.routers",
        "app.services",
        "app.services.session_store",
        "app.services.processing_queue",
        "app.services.rate_limiter",
        "app.services.security",
        "app.services.dataset_retrieval",
        "app.services.cleanup",
        "app.routers.upload",
        "app.routers.process",
        "app.routers.results",
        "app.models.schemas",
    ]:
        sys.modules.pop(module_name, None)

    main = importlib.import_module("main")
    schemas = importlib.import_module("app.models.schemas")
    session_store = importlib.import_module("app.services.session_store")
    dataset_retrieval = importlib.import_module("app.services.dataset_retrieval")
    processing_queue = importlib.import_module("app.services.processing_queue")
    rate_limiter = importlib.import_module("app.services.rate_limiter")
    return main, schemas, session_store, dataset_retrieval, processing_queue, rate_limiter


def unload_backend_modules():
    for module_name in [
        "main",
        "app",
        "app.models",
        "app.routers",
        "app.services",
        "app.services.session_store",
        "app.services.processing_queue",
        "app.services.rate_limiter",
        "app.services.security",
        "app.services.dataset_retrieval",
        "app.services.cleanup",
        "app.routers.upload",
        "app.routers.process",
        "app.routers.results",
        "app.models.schemas",
    ]:
        sys.modules.pop(module_name, None)


class SessionAndStatusTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        (
            self.main,
            self.schemas,
            self.session_store,
            self.dataset_retrieval,
            self.processing_queue,
            self.rate_limiter,
        ) = load_backend(
            self.temp_dir
        )
        from fastapi.testclient import TestClient

        self.client = TestClient(self.main.app)
        self.cleanup_service = importlib.import_module("app.services.cleanup")
        self.session_store.reset_store()
        self.processing_queue.reset_worker_state()
        self.rate_limiter.reset_rate_limiter()
        shutil.rmtree(self.dataset_retrieval.TEMP_DIR, ignore_errors=True)
        self.dataset_retrieval.TEMP_DIR.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def valid_png_bytes() -> bytes:
        return b"\x89PNG\r\n\x1a\nfake-png-payload"

    @staticmethod
    def valid_jpeg_bytes() -> bytes:
        return b"\xff\xd8\xfffake-jpeg-payload"

    def tearDown(self):
        self.client.close()
        unload_backend_modules()
        os.environ.pop("IMAGE_SORTER_SESSION_DB", None)
        os.environ.pop("IMAGE_SORTER_TEMP_DIR", None)
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_session_persists_across_module_reload(self):
        session = self.schemas.ProcessingSession()
        session.progress_percent = 42
        self.session_store.create_session(session)

        _, schemas_reloaded, session_store_reloaded, _, _, _ = load_backend(self.temp_dir)
        loaded = session_store_reloaded.get_session(session.session_id)

        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.session_id, session.session_id)
        self.assertEqual(loaded.progress_percent, 42)
        self.assertEqual(loaded.status, schemas_reloaded.SessionStatus.PENDING)

    def test_get_expired_sessions_uses_last_updated_at_not_created_at(self):
        stale_but_active = self.schemas.ProcessingSession()
        stale_but_active.created_at = self.schemas.utc_now() - timedelta(hours=5)
        stale_but_active.last_updated_at = self.schemas.utc_now()

        truly_expired = self.schemas.ProcessingSession()
        truly_expired.created_at = self.schemas.utc_now() - timedelta(hours=5)
        truly_expired.last_updated_at = self.schemas.utc_now() - timedelta(hours=5)

        self.session_store.create_session(stale_but_active)
        self.session_store.create_session(truly_expired)

        expired = self.session_store.get_expired_sessions()

        self.assertIn(truly_expired.session_id, expired)
        self.assertNotIn(stale_but_active.session_id, expired)

    def test_run_cleanup_purges_only_inactive_sessions(self):
        stale_session = self.schemas.ProcessingSession()
        stale_session.created_at = self.schemas.utc_now() - timedelta(hours=5)
        stale_session.last_updated_at = self.schemas.utc_now() - timedelta(hours=5)
        active_session = self.schemas.ProcessingSession()
        active_session.created_at = self.schemas.utc_now() - timedelta(hours=5)
        active_session.last_updated_at = self.schemas.utc_now()

        self.session_store.create_session(stale_session)
        self.session_store.create_session(active_session)

        stale_dir = self.dataset_retrieval.get_session_temp_dir(stale_session.session_id)
        active_dir = self.dataset_retrieval.get_session_temp_dir(active_session.session_id)
        stale_dir.mkdir(parents=True, exist_ok=True)
        active_dir.mkdir(parents=True, exist_ok=True)
        (stale_dir / "reference.jpg").write_bytes(b"stale")
        (active_dir / "reference.jpg").write_bytes(b"active")

        asyncio.run(self.cleanup_service.run_cleanup())

        self.assertIsNone(self.session_store.get_session(stale_session.session_id))
        self.assertFalse(stale_dir.exists())
        self.assertIsNotNone(self.session_store.get_session(active_session.session_id))
        self.assertTrue(active_dir.exists())

    def test_upload_creates_session_and_status_returns_enriched_payload(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.png", self.valid_png_bytes(), "image/png")},
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        session_id = payload["session_id"]

        status_response = self.client.get(f"/api/results/{session_id}/status")
        self.assertEqual(status_response.status_code, 200)

        status_payload = status_response.json()
        self.assertEqual(status_payload["session_id"], session_id)
        self.assertEqual(status_payload["status"], "pending")
        self.assertEqual(status_payload["stage"], "upload_received")
        self.assertEqual(status_payload["progress_percent"], 0)
        self.assertEqual(status_payload["total_images_scanned"], 0)
        self.assertEqual(status_payload["total_images_discovered"], 0)
        self.assertEqual(status_payload["matched_count"], 0)
        self.assertEqual(status_payload["images_with_detected_faces"], 0)
        self.assertEqual(status_payload["images_without_detected_faces"], 0)
        self.assertEqual(status_payload["images_with_multiple_faces"], 0)
        self.assertIsNone(status_payload["average_match_confidence"])
        self.assertIsNone(status_payload["top_match_confidence"])
        self.assertIsNone(status_payload["requested_model_name"])
        self.assertIsNone(status_payload["requested_similarity_threshold"])
        self.assertIsNone(status_payload["dataset_provider"])
        self.assertIsNone(status_payload["dataset_source_kind"])
        self.assertIsNone(status_payload["error"])
        self.assertIsNone(status_payload["stage_message"])
        self.assertEqual(status_payload["dataset_downloaded_bytes"], 0)
        self.assertIsNone(status_payload["dataset_total_bytes"])
        self.assertEqual(status_payload["dataset_files_extracted"], 0)
        self.assertIsNone(status_payload["dataset_total_files"])
        self.assertIn("last_updated_at", status_payload)
        self.assertIn("current_stage_started_at", status_payload)
        self.assertIn("stage_elapsed_seconds", status_payload)
        self.assertIn("estimated_remaining_seconds", status_payload)
        self.assertIsNone(status_payload["estimated_remaining_seconds"])
        self.assertGreaterEqual(status_payload["stage_elapsed_seconds"], 0)
        self.assertIsNone(status_payload["processing_started_at"])
        self.assertIsNone(status_payload["processing_completed_at"])

    def test_delete_session_removes_persisted_state_and_temp_files(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
        )
        session_id = response.json()["session_id"]

        session_dir = self.dataset_retrieval.get_session_temp_dir(session_id)
        self.assertTrue(session_dir.exists())

        delete_response = self.client.delete(f"/api/results/{session_id}")
        self.assertEqual(delete_response.status_code, 200)

        status_response = self.client.get(f"/api/results/{session_id}/status")
        self.assertEqual(status_response.status_code, 404)
        self.assertFalse(session_dir.exists())

    def test_start_processing_queues_job_and_persists_request_metadata(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
        )
        session_id = response.json()["session_id"]

        with mock.patch("app.routers.process.enqueue_processing_job", return_value=1):
            start_response = self.client.post(
                "/api/process/start",
                json={
                    "session_id": session_id,
                    "dataset_url": "https://example.com/photos.zip",
                    "similarity_threshold": 0.45,
                    "model_name": "ArcFace",
                },
            )

        self.assertEqual(start_response.status_code, 200)
        start_payload = start_response.json()
        self.assertEqual(start_payload["status"], "processing")
        self.assertEqual(start_payload["stage"], "queued")
        self.assertEqual(start_payload["queue_position"], 1)
        self.assertEqual(start_payload["requested_model_name"], "ArcFace")
        self.assertEqual(start_payload["requested_similarity_threshold"], 0.45)

        db_path = Path(os.environ["IMAGE_SORTER_SESSION_DB"])
        with sqlite3.connect(db_path) as conn:
            row = conn.execute(
                "SELECT payload_json FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()

        self.assertIsNotNone(row)
        stored_payload = json.loads(row[0])
        self.assertEqual(stored_payload["status"], "processing")
        self.assertEqual(stored_payload["stage"], "queued")
        self.assertEqual(stored_payload["queue_position"], 1)
        self.assertIsNotNone(stored_payload["processing_started_at"])
        self.assertIsNone(stored_payload["processing_completed_at"])
        self.assertIsNotNone(stored_payload["current_stage_started_at"])
        self.assertEqual(stored_payload["dataset_download_url"], "https://example.com/photos.zip")
        self.assertEqual(stored_payload["dataset_provider"], "ZIP Link")
        self.assertEqual(stored_payload["dataset_source_kind"], "direct_file")
        self.assertEqual(stored_payload["requested_model_name"], "ArcFace")
        self.assertEqual(stored_payload["requested_similarity_threshold"], 0.45)

        status_response = self.client.get(f"/api/results/{session_id}/status")
        self.assertEqual(status_response.status_code, 200)
        status_payload = status_response.json()
        self.assertEqual(status_payload["requested_model_name"], "ArcFace")
        self.assertEqual(status_payload["requested_similarity_threshold"], 0.45)
        self.assertEqual(status_payload["dataset_provider"], "ZIP Link")
        self.assertEqual(status_payload["dataset_source_kind"], "direct_file")

    def test_start_processing_clears_stale_results_from_previous_run(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
        )
        self.assertEqual(response.status_code, 200)
        session_id = response.json()["session_id"]

        session = self.session_store.get_session(session_id)
        self.assertIsNotNone(session)
        session.status = self.schemas.SessionStatus.COMPLETED
        session.stage = self.schemas.ProcessingStage.RESULTS_READY
        session.dataset_source = "https://example.com/old.zip"
        session.total_images_scanned = 12
        session.total_images_discovered = 12
        session.matched_count = 1
        session.processing_time_seconds = 9.5
        session.processing_completed_at = self.schemas.utc_now()
        session.matched_images = [
            self.schemas.MatchedImage(
                filename="old-match.jpg",
                relative_path="old-match.jpg",
                similarity_score=0.9,
                distance=0.2,
                download_url=f"/api/results/{session_id}/download/old-match.jpg",
                preview_url=f"/api/results/{session_id}/download/old-match.jpg",
                rank=1,
                face_count=1,
                confidence_percent=90,
                confidence_label="high",
                match_reason="High facial similarity that comfortably exceeds the match threshold.",
                source_group="root",
            )
        ]
        self.session_store.update_session(session)

        with mock.patch("app.routers.process.enqueue_processing_job", return_value=1):
            retry_response = self.client.post(
                "/api/process/start",
                json={
                    "session_id": session_id,
                    "dataset_url": "https://example.com/new-photos.zip",
                    "similarity_threshold": 0.45,
                    "model_name": "ArcFace",
                },
            )

        self.assertEqual(retry_response.status_code, 200)

        refreshed = self.session_store.get_session(session_id)
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed.status, self.schemas.SessionStatus.PROCESSING)
        self.assertEqual(refreshed.stage, self.schemas.ProcessingStage.QUEUED)
        self.assertEqual(refreshed.total_images_scanned, 0)
        self.assertEqual(refreshed.total_images_discovered, 0)
        self.assertEqual(refreshed.matched_count, 0)
        self.assertEqual(refreshed.matched_images, [])
        self.assertIsNone(refreshed.processing_time_seconds)
        self.assertIsNone(refreshed.processing_completed_at)
        self.assertIsNone(refreshed.dataset_source)
        self.assertEqual(refreshed.dataset_download_url, "https://example.com/new-photos.zip")

    def test_upload_rejects_mismatched_file_signature(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.png", b"not-a-real-png", "image/png")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("does not match", response.json()["detail"])

    def test_upload_rate_limit_returns_429(self):
        limiter_module = importlib.import_module("app.routers.upload")
        original_limit = limiter_module.UPLOADS_PER_MINUTE_PER_CLIENT
        limiter_module.UPLOADS_PER_MINUTE_PER_CLIENT = 2
        try:
            first = self.client.post(
                "/api/upload/reference",
                files={"file": ("a.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
            )
            second = self.client.post(
                "/api/upload/reference",
                files={"file": ("b.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
            )
            third = self.client.post(
                "/api/upload/reference",
                files={"file": ("c.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
            )
        finally:
            limiter_module.UPLOADS_PER_MINUTE_PER_CLIENT = original_limit

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(third.status_code, 429)
        self.assertIn("Too many uploads", third.json()["detail"])

    def test_processing_rejects_local_dataset_url(self):
        response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
        )
        session_id = response.json()["session_id"]

        process_response = self.client.post(
            "/api/process/start",
            json={
                "session_id": session_id,
                "dataset_url": "http://127.0.0.1/photos.zip",
                "similarity_threshold": 0.45,
                "model_name": "ArcFace",
            },
        )

        self.assertEqual(process_response.status_code, 400)
        self.assertIn("not allowed", process_response.json()["detail"])

    def test_processing_rate_limit_returns_429(self):
        limiter_module = importlib.import_module("app.routers.process")
        original_limit = limiter_module.PROCESS_REQUESTS_PER_MINUTE_PER_CLIENT
        limiter_module.PROCESS_REQUESTS_PER_MINUTE_PER_CLIENT = 2
        try:
            upload_response = self.client.post(
                "/api/upload/reference",
                files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
            )
            session_id = upload_response.json()["session_id"]

            with mock.patch("app.routers.process.enqueue_processing_job", return_value=1):
                first = self.client.post(
                    "/api/process/start",
                    json={
                        "session_id": session_id,
                        "dataset_url": "https://example.com/photos.zip",
                        "similarity_threshold": 0.45,
                        "model_name": "ArcFace",
                    },
                )
                retry_session = self.session_store.get_session(session_id)
                retry_session.status = self.schemas.SessionStatus.PENDING
                retry_session.stage = self.schemas.ProcessingStage.UPLOAD_RECEIVED
                self.session_store.update_session(retry_session)

                second = self.client.post(
                    "/api/process/start",
                    json={
                        "session_id": session_id,
                        "dataset_url": "https://example.com/photos.zip",
                        "similarity_threshold": 0.45,
                        "model_name": "ArcFace",
                    },
                )
                retry_session = self.session_store.get_session(session_id)
                retry_session.status = self.schemas.SessionStatus.PENDING
                retry_session.stage = self.schemas.ProcessingStage.UPLOAD_RECEIVED
                self.session_store.update_session(retry_session)

                third = self.client.post(
                    "/api/process/start",
                    json={
                        "session_id": session_id,
                        "dataset_url": "https://example.com/photos.zip",
                        "similarity_threshold": 0.45,
                        "model_name": "ArcFace",
                    },
                )
        finally:
            limiter_module.PROCESS_REQUESTS_PER_MINUTE_PER_CLIENT = original_limit

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(third.status_code, 429)
        self.assertIn("Too many processing requests", third.json()["detail"])

    def test_health_reports_worker_snapshot(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "healthy")
        self.assertIn("worker", payload)
        self.assertIn("queued_jobs", payload["worker"])
        self.assertIn("worker_alive", payload["worker"])
        self.assertIn("last_job_duration_seconds", payload["worker"])
        self.assertIn("average_job_duration_seconds", payload["worker"])
        self.assertIn("total_images_scanned", payload["worker"])
        self.assertIn("total_matches_found", payload["worker"])

    def test_worker_snapshot_endpoint_returns_observability_metrics(self):
        response = self.client.get("/api/results/worker/snapshot")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("queued_jobs", payload)
        self.assertIn("worker_alive", payload)
        self.assertIn("jobs_enqueued", payload)
        self.assertIn("jobs_completed", payload)
        self.assertIn("total_matches_found", payload)

    def test_run_recognition_success_updates_results_and_metrics(self):
        dataset_dir = Path(self.temp_dir) / "dataset"
        dataset_dir.mkdir(parents=True, exist_ok=True)
        session = self.schemas.ProcessingSession(
            status=self.schemas.SessionStatus.PROCESSING,
            stage=self.schemas.ProcessingStage.QUEUED,
            reference_image_path=str(Path(self.temp_dir) / "reference.jpg"),
            dataset_download_url="https://example.com/photos.zip",
            requested_model_name="ArcFace",
            requested_similarity_threshold=0.4,
        )
        Path(session.reference_image_path).write_bytes(b"fake")
        self.session_store.create_session(session)

        def fake_download_dataset(_url, _session_id, progress_callback=None, **kwargs):
            if progress_callback:
                progress_callback(
                    {
                        "stage": "dataset_download",
                        "progress_percent": 16,
                        "dataset_downloaded_bytes": 1024,
                        "dataset_total_bytes": 2048,
                        "stage_message": "Downloaded 1024 of 2048 bytes.",
                    }
                )
                progress_callback(
                    {
                        "stage": "dataset_extraction",
                        "progress_percent": 28,
                        "dataset_files_extracted": 3,
                        "dataset_total_files": 3,
                        "stage_message": "Extracted 3 of 3 dataset files.",
                    }
                )
            return str(dataset_dir)

        def fake_scan_dataset(*args, **kwargs):
            progress_callback = kwargs.get("progress_callback")
            if not progress_callback and len(args) >= 6:
                progress_callback = args[5]
            if progress_callback:
                progress_callback(
                    {
                        "stage": "reference_analysis",
                        "progress_percent": 30,
                        "stage_message": "Analyzing the uploaded reference face.",
                    }
                )
                progress_callback(
                    {
                        "stage": "dataset_scan",
                        "progress_percent": 95,
                        "total_images_discovered": 3,
                        "total_images_scanned": 3,
                        "matched_count": 1,
                        "current_image": "match-1.jpg",
                        "stage_message": "Scanning image 3 of 3.",
                    }
                )
            return {
                "matched": [
                    {
                        "filename": "match-1.jpg",
                        "path": str(dataset_dir / "match-1.jpg"),
                        "similarity_score": 0.93,
                        "distance": 0.21,
                        "face_count": 1,
                        "confidence_percent": 93,
                        "confidence_label": "very_high",
                        "match_reason": "Very strong facial similarity with a top-ranked embedding match.",
                        "source_group": "dataset",
                    }
                ],
                "total_scanned": 3,
                "total_discovered": 3,
                "images_with_detected_faces": 2,
                "images_without_detected_faces": 1,
                "images_with_multiple_faces": 0,
                "average_match_confidence": 0.93,
                "top_match_confidence": 0.93,
                "processing_time": 1.25,
            }

        with mock.patch(
            "app.services.processing_queue.download_dataset",
            side_effect=fake_download_dataset,
        ), mock.patch(
            "app.services.processing_queue.scan_dataset",
            side_effect=fake_scan_dataset,
        ):
            self.processing_queue._run_recognition(session)

        stored = self.session_store.get_session(session.session_id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.status, self.schemas.SessionStatus.COMPLETED)
        self.assertEqual(stored.stage, self.schemas.ProcessingStage.RESULTS_READY)
        self.assertEqual(stored.matched_count, 1)
        self.assertEqual(stored.total_images_scanned, 3)
        self.assertEqual(stored.progress_percent, 100)
        self.assertEqual(stored.stage_message, "Results are ready.")
        self.assertEqual(stored.dataset_downloaded_bytes, 1024)
        self.assertEqual(stored.dataset_total_bytes, 2048)
        self.assertEqual(stored.dataset_files_extracted, 3)
        self.assertEqual(stored.dataset_total_files, 3)
        self.assertEqual(stored.images_with_detected_faces, 2)
        self.assertEqual(stored.images_without_detected_faces, 1)
        self.assertEqual(stored.images_with_multiple_faces, 0)
        self.assertEqual(stored.average_match_confidence, 0.93)
        self.assertEqual(stored.top_match_confidence, 0.93)
        self.assertEqual(stored.matched_images[0].rank, 1)
        self.assertEqual(stored.matched_images[0].relative_path, "match-1.jpg")
        self.assertEqual(stored.matched_images[0].confidence_percent, 93)
        self.assertEqual(stored.matched_images[0].confidence_label, "very_high")
        self.assertEqual(stored.matched_images[0].source_group, "dataset")
        self.assertIsNotNone(stored.processing_completed_at)
        self.assertIsNotNone(stored.current_stage_started_at)
        self.assertEqual(stored.current_stage_started_at, stored.processing_completed_at)

        metrics = self.processing_queue.get_worker_snapshot()
        self.assertEqual(metrics["jobs_started"], 1)
        self.assertEqual(metrics["jobs_completed"], 1)
        self.assertEqual(metrics["jobs_failed"], 0)
        self.assertEqual(metrics["active_jobs"], 0)
        self.assertGreaterEqual(metrics["last_job_duration_seconds"], 0)
        self.assertGreaterEqual(metrics["average_job_duration_seconds"], 0)
        self.assertEqual(metrics["total_images_scanned"], 3)
        self.assertEqual(metrics["total_matches_found"], 1)

        response = self.client.get(f"/api/results/{session.session_id}")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["requested_model_name"], "ArcFace")
        self.assertEqual(payload["requested_similarity_threshold"], 0.4)
        self.assertIsNone(payload["dataset_provider"])
        self.assertIsNone(payload["dataset_source_kind"])
        self.assertEqual(payload["estimated_remaining_seconds"], 0.0)
        self.assertEqual(payload["stage_message"], "Results are ready.")
        self.assertEqual(payload["dataset_downloaded_bytes"], 1024)
        self.assertEqual(payload["dataset_total_bytes"], 2048)
        self.assertEqual(payload["dataset_files_extracted"], 3)
        self.assertEqual(payload["dataset_total_files"], 3)
        self.assertEqual(payload["images_with_detected_faces"], 2)
        self.assertEqual(payload["images_without_detected_faces"], 1)
        self.assertEqual(payload["images_with_multiple_faces"], 0)
        self.assertEqual(payload["average_match_confidence"], 0.93)
        self.assertEqual(payload["top_match_confidence"], 0.93)
        self.assertEqual(payload["matched_images"][0]["confidence_percent"], 93)
        self.assertEqual(payload["matched_images"][0]["confidence_label"], "very_high")
        self.assertEqual(payload["matched_images"][0]["source_group"], "dataset")

    def test_run_recognition_failure_sets_structured_error_and_metrics(self):
        session = self.schemas.ProcessingSession(
            status=self.schemas.SessionStatus.PROCESSING,
            stage=self.schemas.ProcessingStage.QUEUED,
            reference_image_path=str(Path(self.temp_dir) / "reference.jpg"),
            dataset_download_url="https://example.com/photos.zip",
            requested_model_name="ArcFace",
            requested_similarity_threshold=0.4,
        )
        Path(session.reference_image_path).write_bytes(b"fake")
        self.session_store.create_session(session)

        failure = importlib.import_module("app.services.dataset_retrieval").DatasetRetrievalError(
            self.schemas.ErrorCode.DATASET_UNREACHABLE,
            "Dataset could not be reached from the provided URL.",
            retryable=True,
        )

        with mock.patch(
            "app.services.processing_queue.download_dataset",
            side_effect=failure,
        ), mock.patch(
            "app.services.processing_queue.cleanup_processing_artifacts"
        ) as cleanup_mock:
            self.processing_queue._run_recognition(session)

        stored = self.session_store.get_session(session.session_id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.status, self.schemas.SessionStatus.FAILED)
        self.assertEqual(stored.stage, self.schemas.ProcessingStage.FAILED)
        self.assertEqual(stored.error.code, self.schemas.ErrorCode.DATASET_UNREACHABLE)
        self.assertTrue(stored.error.retryable)
        cleanup_mock.assert_called_once_with(session.session_id)

        metrics = self.processing_queue.get_worker_snapshot()
        self.assertEqual(metrics["jobs_started"], 1)
        self.assertEqual(metrics["jobs_completed"], 0)
        self.assertEqual(metrics["jobs_failed"], 1)
        self.assertEqual(metrics["last_failure_code"], "dataset_unreachable")

    def test_dataset_failure_preserves_reference_image_for_retry(self):
        upload_response = self.client.post(
            "/api/upload/reference",
            files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
        )
        self.assertEqual(upload_response.status_code, 200)
        session_id = upload_response.json()["session_id"]
        session = self.session_store.get_session(session_id)
        self.assertIsNotNone(session)
        self.assertTrue(Path(session.reference_image_path).exists())

        failure = self.dataset_retrieval.DatasetRetrievalError(
            self.schemas.ErrorCode.DATASET_UNREACHABLE,
            "Dataset could not be reached from the provided URL.",
            retryable=True,
        )

        with mock.patch(
            "app.services.processing_queue.download_dataset",
            side_effect=failure,
        ):
            session.status = self.schemas.SessionStatus.PROCESSING
            session.stage = self.schemas.ProcessingStage.QUEUED
            self.session_store.update_session(session)
            self.processing_queue._run_recognition(session)

        failed_session = self.session_store.get_session(session_id)
        self.assertIsNotNone(failed_session)
        self.assertEqual(failed_session.status, self.schemas.SessionStatus.FAILED)
        self.assertTrue(Path(failed_session.reference_image_path).exists())

        with mock.patch("app.routers.process.enqueue_processing_job", return_value=1):
            retry_response = self.client.post(
                "/api/process/start",
                json={
                    "session_id": session_id,
                    "dataset_url": "https://example.com/photos.zip",
                    "similarity_threshold": 0.45,
                    "model_name": "ArcFace",
                },
            )

        self.assertEqual(retry_response.status_code, 200)
        self.assertEqual(retry_response.json()["stage"], "queued")

    def test_run_recognition_too_many_faces_sets_structured_error(self):
        session = self.schemas.ProcessingSession(
            status=self.schemas.SessionStatus.PROCESSING,
            stage=self.schemas.ProcessingStage.QUEUED,
            reference_image_path=str(Path(self.temp_dir) / "reference.jpg"),
            dataset_download_url="https://example.com/photos.zip",
            requested_model_name="ArcFace",
            requested_similarity_threshold=0.4,
        )
        Path(session.reference_image_path).write_bytes(b"fake")
        self.session_store.create_session(session)

        failure = importlib.import_module("app.services.face_recognition").FaceRecognitionError(
            self.schemas.ErrorCode.TOO_MANY_FACES,
            "Multiple faces were detected in the reference image. Please upload a photo with only one clear face.",
            retryable=False,
        )

        with mock.patch(
            "app.services.processing_queue.download_dataset",
            return_value=str(Path(self.temp_dir) / "dataset"),
        ), mock.patch(
            "app.services.processing_queue.scan_dataset",
            side_effect=failure,
        ), mock.patch(
            "app.services.processing_queue.cleanup_processing_artifacts"
        ) as cleanup_mock:
            self.processing_queue._run_recognition(session)

        stored = self.session_store.get_session(session.session_id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.status, self.schemas.SessionStatus.FAILED)
        self.assertEqual(stored.stage, self.schemas.ProcessingStage.FAILED)
        self.assertEqual(stored.error.code, self.schemas.ErrorCode.TOO_MANY_FACES)
        self.assertFalse(stored.error.retryable)
        cleanup_mock.assert_called_once_with(session.session_id)

    def test_run_recognition_timeout_sets_structured_error(self):
        session = self.schemas.ProcessingSession(
            status=self.schemas.SessionStatus.PROCESSING,
            stage=self.schemas.ProcessingStage.QUEUED,
            reference_image_path=str(Path(self.temp_dir) / "reference.jpg"),
            dataset_download_url="https://example.com/photos.zip",
            requested_model_name="ArcFace",
            requested_similarity_threshold=0.4,
        )
        Path(session.reference_image_path).write_bytes(b"fake")
        self.session_store.create_session(session)

        failure = importlib.import_module("app.services.face_recognition").FaceRecognitionError(
            self.schemas.ErrorCode.PROCESSING_TIMEOUT,
            "Processing exceeded the 1800-second time limit.",
            retryable=True,
        )

        with mock.patch(
            "app.services.processing_queue.download_dataset",
            return_value=str(Path(self.temp_dir) / "dataset"),
        ), mock.patch(
            "app.services.processing_queue._scan_dataset_with_timeout",
            side_effect=failure,
        ), mock.patch(
            "app.services.processing_queue.cleanup_processing_artifacts"
        ) as cleanup_mock:
            self.processing_queue._run_recognition(session)

        stored = self.session_store.get_session(session.session_id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.status, self.schemas.SessionStatus.FAILED)
        self.assertEqual(stored.stage, self.schemas.ProcessingStage.FAILED)
        self.assertEqual(stored.error.code, self.schemas.ErrorCode.PROCESSING_TIMEOUT)
        self.assertTrue(stored.error.retryable)
        cleanup_mock.assert_called_once_with(session.session_id)

    def test_download_route_uses_relative_paths_for_duplicate_filenames(self):
        session_id = "duplicate-download-session"
        dataset_dir = self.dataset_retrieval.get_session_temp_dir(session_id) / "dataset"
        (dataset_dir / "camera-a").mkdir(parents=True, exist_ok=True)
        (dataset_dir / "camera-b").mkdir(parents=True, exist_ok=True)
        file_a = dataset_dir / "camera-a" / "shared.jpg"
        file_b = dataset_dir / "camera-b" / "shared.jpg"
        file_a.write_bytes(b"camera-a-bytes")
        file_b.write_bytes(b"camera-b-bytes")

        session = self.schemas.ProcessingSession(
            session_id=session_id,
            status=self.schemas.SessionStatus.COMPLETED,
            stage=self.schemas.ProcessingStage.RESULTS_READY,
            matched_count=2,
            matched_images=[
                self.schemas.MatchedImage(
                    filename="shared.jpg",
                    relative_path="camera-a/shared.jpg",
                    similarity_score=0.91,
                    distance=0.2,
                    download_url=f"/api/results/{session_id}/download/camera-a%2Fshared.jpg",
                    preview_url=f"/api/results/{session_id}/download/camera-a%2Fshared.jpg",
                    rank=1,
                    face_count=1,
                    confidence_percent=91,
                    confidence_label="very_high",
                    match_reason="Very strong facial similarity with a top-ranked embedding match.",
                    source_group="camera-a",
                ),
                self.schemas.MatchedImage(
                    filename="shared.jpg",
                    relative_path="camera-b/shared.jpg",
                    similarity_score=0.88,
                    distance=0.24,
                    download_url=f"/api/results/{session_id}/download/camera-b%2Fshared.jpg",
                    preview_url=f"/api/results/{session_id}/download/camera-b%2Fshared.jpg",
                    rank=2,
                    face_count=1,
                    confidence_percent=88,
                    confidence_label="high",
                    match_reason="High facial similarity that comfortably exceeds the match threshold.",
                    source_group="camera-b",
                ),
            ],
        )
        self.session_store.create_session(session)

        response_a = self.client.get(f"/api/results/{session_id}/download/camera-a%2Fshared.jpg")
        response_b = self.client.get(f"/api/results/{session_id}/download/camera-b%2Fshared.jpg")

        self.assertEqual(response_a.status_code, 200)
        self.assertEqual(response_b.status_code, 200)
        self.assertEqual(response_a.content, b"camera-a-bytes")
        self.assertEqual(response_b.content, b"camera-b-bytes")

    def test_download_dataset_cleans_partial_files_when_archive_is_invalid(self):
        session_id = "cleanup-invalid-archive"
        session_root = self.dataset_retrieval.get_session_temp_dir(session_id)

        zip_path = Path(self.temp_dir) / "invalid-dataset.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            archive.writestr("notes.txt", "not an image")

        class FakeResponse:
            def __init__(self, data: bytes, headers=None):
                self._data = data
                self._offset = 0
                self.headers = headers or {}

            def read(self, size=-1):
                if size is None or size < 0:
                    size = len(self._data) - self._offset
                chunk = self._data[self._offset:self._offset + size]
                self._offset += len(chunk)
                return chunk

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        zip_bytes = zip_path.read_bytes()

        def fake_urlopen(request, timeout=0):
            if getattr(request, "method", "GET") == "HEAD":
                raise Exception("skip head")
            return FakeResponse(
                zip_bytes,
                headers={
                    "Content-Length": str(len(zip_bytes)),
                    "Content-Type": "application/zip",
                },
            )

        with mock.patch("app.services.dataset_retrieval.urllib.request.urlopen", side_effect=fake_urlopen):
            with self.assertRaises(self.dataset_retrieval.DatasetRetrievalError) as exc:
                self.dataset_retrieval.download_dataset("https://example.com/photos.zip", session_id)

        self.assertEqual(exc.exception.code, self.schemas.ErrorCode.DATASET_EMPTY)
        self.assertFalse((session_root / "dataset_staging").exists())
        self.assertFalse((session_root / "downloads").exists())
        self.assertFalse((session_root / "dataset").exists())

    def test_start_processing_accepts_supported_gallery_provider_urls(self):
        for dataset_url in [
            "https://photos.app.goo.gl/publicAlbum123",
            "https://gallery.pixieset.com/wedding-day",
            "https://pixabay.com/photos/crowd-event-party-123456/",
        ]:
            with self.subTest(dataset_url=dataset_url):
                response = self.client.post(
                    "/api/upload/reference",
                    files={"file": ("reference.jpg", self.valid_jpeg_bytes(), "image/jpeg")},
                )
                session_id = response.json()["session_id"]
                with mock.patch("app.routers.process.enqueue_processing_job", return_value=1):
                    start_response = self.client.post(
                        "/api/process/start",
                        json={
                            "session_id": session_id,
                            "dataset_url": dataset_url,
                            "similarity_threshold": 0.4,
                            "model_name": "ArcFace",
                        },
                    )

                self.assertEqual(start_response.status_code, 200)
                body = start_response.json()
                stored = self.session_store.get_session(session_id)
                self.assertIsNotNone(stored)
                self.assertIsNotNone(stored.dataset_provider)
                self.assertEqual(body["stage"], "queued")

    def test_download_dataset_supports_google_photos_gallery_pages(self):
        session_id = "google-photos-gallery"
        album_url = "https://photos.app.goo.gl/exampleAlbum123"
        album_html = """
        <html>
          <body>
            <img src="https://lh3.googleusercontent.com/pw/example-one=w1600-h900-no" />
            <img src="https://lh3.googleusercontent.com/pw/example-two=w1600-h900-no" />
          </body>
        </html>
        """

        class FakeResponse:
            def __init__(self, data: bytes, headers=None):
                self._data = data
                self._offset = 0
                self.headers = headers or {}

            def read(self, size=-1):
                if size is None or size < 0:
                    size = len(self._data) - self._offset
                chunk = self._data[self._offset:self._offset + size]
                self._offset += len(chunk)
                return chunk

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        def fake_urlopen(request, timeout=0):
            url = getattr(request, "full_url", str(request))
            method = getattr(request, "method", "GET")
            if method == "HEAD":
                raise Exception("skip head")
            if url == album_url:
                return FakeResponse(
                    album_html.encode("utf-8"),
                    headers={"Content-Type": "text/html; charset=utf-8"},
                )
            if "googleusercontent.com" in url:
                return FakeResponse(
                    self.valid_jpeg_bytes(),
                    headers={
                        "Content-Type": "image/jpeg",
                        "Content-Length": str(len(self.valid_jpeg_bytes())),
                    },
                )
            raise AssertionError(f"Unexpected URL requested: {url}")

        with mock.patch("app.services.dataset_retrieval.urllib.request.urlopen", side_effect=fake_urlopen):
            dataset_dir = Path(self.dataset_retrieval.download_dataset(album_url, session_id))

        prepared_images = sorted(dataset_dir.glob("*.jpg"))
        self.assertEqual(len(prepared_images), 2)

    def test_download_dataset_supports_pixieset_gallery_pages(self):
        session_id = "pixieset-gallery"
        gallery_url = "https://gallery.pixieset.com/wedding-day"
        gallery_html = """
        <html>
          <body>
            <img src="https://images.pixieset.com/album-shot-1.jpg" />
            <img src="https://images.pixieset.com/album-shot-2.jpg" />
          </body>
        </html>
        """

        class FakeResponse:
            def __init__(self, data: bytes, headers=None):
                self._data = data
                self._offset = 0
                self.headers = headers or {}

            def read(self, size=-1):
                if size is None or size < 0:
                    size = len(self._data) - self._offset
                chunk = self._data[self._offset:self._offset + size]
                self._offset += len(chunk)
                return chunk

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        def fake_urlopen(request, timeout=0):
            url = getattr(request, "full_url", str(request))
            method = getattr(request, "method", "GET")
            if method == "HEAD":
                raise Exception("skip head")
            if url == gallery_url:
                return FakeResponse(
                    gallery_html.encode("utf-8"),
                    headers={"Content-Type": "text/html; charset=utf-8"},
                )
            if "pixieset.com" in url:
                return FakeResponse(
                    self.valid_jpeg_bytes(),
                    headers={
                        "Content-Type": "image/jpeg",
                        "Content-Length": str(len(self.valid_jpeg_bytes())),
                    },
                )
            raise AssertionError(f"Unexpected URL requested: {url}")

        with mock.patch("app.services.dataset_retrieval.urllib.request.urlopen", side_effect=fake_urlopen), \
             mock.patch("app.services.dataset_retrieval.urllib.request.build_opener") as mock_build_opener:
            mock_opener = mock.MagicMock()
            mock_opener.open.side_effect = fake_urlopen
            mock_build_opener.return_value = mock_opener
            dataset_dir = Path(self.dataset_retrieval.download_dataset(gallery_url, session_id))

        prepared_images = sorted(dataset_dir.glob("*.jpg"))
        self.assertEqual(len(prepared_images), 2)

    def test_download_all_matches_returns_valid_zip_archive(self):
        import zipfile
        import io
        from fastapi.testclient import TestClient

        client = TestClient(self.main.app)
        session_id = "test-download-zip"

        # Create session
        session = self.schemas.ProcessingSession(
            session_id=session_id,
            status=self.schemas.SessionStatus.COMPLETED,
            matched_images=[
                self.schemas.MatchedImage(
                    filename="photo1.jpg",
                    relative_path="photo1.jpg",
                    similarity_score=0.15,
                    distance=0.15,
                    download_url=f"/api/results/{session_id}/download/photo1.jpg",
                    preview_url=f"/api/results/{session_id}/download/photo1.jpg",
                    rank=1,
                    confidence_percent=85,
                    confidence_label="High Confidence",
                    match_reason="Strong cosine similarity",
                    source_group="Event Album",
                )
            ],
        )
        self.session_store.create_session(session)

        # Create physical image file in temp dataset
        dataset_dir = Path(self.dataset_retrieval.get_session_temp_dir(session_id)) / "dataset"
        dataset_dir.mkdir(parents=True, exist_ok=True)
        img_path = dataset_dir / "photo1.jpg"
        img_path.write_bytes(self.valid_jpeg_bytes())

        # Test download-all endpoint
        response = client.get(f"/api/results/{session_id}/download-all")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "application/zip")

        # Verify ZIP contains the photo
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            names = zf.namelist()
            self.assertEqual(len(names), 1)
            self.assertIn("Rank_01_photo1.jpg", names)


if __name__ == "__main__":
    unittest.main()

