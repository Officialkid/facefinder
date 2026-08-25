"""Persistent job queue and worker loop for dataset scan work."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import logging
import os
from pathlib import Path
import sqlite3
import threading
import time
from typing import Optional
from urllib.parse import quote

from app.models.schemas import (
    ErrorCode,
    MatchedImage,
    ProcessingSession,
    ProcessingStage,
    SessionError,
    SessionStatus,
    utc_now,
)
from app.services.dataset_retrieval import (
    cleanup_processing_artifacts,
    DatasetRetrievalError,
    cleanup_session_files,
    download_dataset,
)
from app.services.face_recognition import FaceRecognitionError, scan_dataset
from app.services.session_store import DB_PATH, get_session, list_sessions_by_status, update_session

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)
PROCESSING_TIMEOUT_SECONDS = int(os.environ.get("IMAGE_SORTER_PROCESSING_TIMEOUT_SECONDS", "1800"))
_state_lock = threading.Lock()
_queue_lock = threading.Lock()
_stop_event = threading.Event()
_worker_thread: Optional[threading.Thread] = None
_stats = {
    "jobs_enqueued": 0,
    "jobs_started": 0,
    "jobs_completed": 0,
    "jobs_failed": 0,
    "active_jobs": 0,
    "last_job_started_at": None,
    "last_job_finished_at": None,
    "last_failure_code": None,
    "last_failure_message": None,
    "last_job_duration_seconds": None,
    "average_job_duration_seconds": None,
    "total_job_duration_seconds": 0.0,
    "total_images_scanned": 0,
    "total_matches_found": 0,
}
_WORKER_ID = f"worker-{os.getpid()}"


def _queue_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _initialize_job_store() -> None:
    with _queue_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS processing_jobs (
                session_id TEXT PRIMARY KEY,
                queue_status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                finished_at TEXT,
                worker_id TEXT,
                attempt_count INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()


def _set_stat(**updates) -> None:
    with _state_lock:
        _stats.update(updates)


def _increment_stat(name: str, amount: int = 1) -> None:
    with _state_lock:
        _stats[name] = int(_stats.get(name, 0)) + amount


def _set_processing_state(session_id: str, **updates) -> ProcessingSession | None:
    session = get_session(session_id)
    if not session:
        return None

    next_stage = updates.get("stage")
    if next_stage is not None and next_stage != session.stage:
        updates["current_stage_started_at"] = utc_now()

    for key, value in updates.items():
        setattr(session, key, value)
    update_session(session)
    return session


def _recalculate_queue_positions() -> None:
    with _queue_lock, _queue_connect() as conn:
        rows = conn.execute(
            """
            SELECT session_id
            FROM processing_jobs
            WHERE queue_status = 'queued'
            ORDER BY created_at ASC
            """
        ).fetchall()

    for position, row in enumerate(rows, start=1):
        _set_processing_state(
            row["session_id"],
            queue_position=position,
            stage_message=f"Queued for processing at position {position}.",
        )


def _upsert_job(session_id: str, queue_status: str) -> None:
    now = utc_now().isoformat()
    with _queue_lock, _queue_connect() as conn:
        conn.execute(
            """
            INSERT INTO processing_jobs (
                session_id,
                queue_status,
                created_at,
                started_at,
                finished_at,
                worker_id,
                attempt_count
            )
            VALUES (?, ?, ?, NULL, NULL, NULL, 0)
            ON CONFLICT(session_id) DO UPDATE SET
                queue_status = excluded.queue_status,
                created_at = excluded.created_at,
                started_at = NULL,
                finished_at = NULL,
                worker_id = NULL,
                attempt_count = 0
            """,
            (session_id, queue_status, now),
        )
        conn.commit()


def _claim_next_job() -> str | None:
    with _queue_lock, _queue_connect() as conn:
        row = conn.execute(
            """
            SELECT session_id
            FROM processing_jobs
            WHERE queue_status = 'queued'
            ORDER BY created_at ASC
            LIMIT 1
            """
        ).fetchone()
        if row is None:
            return None

        now = utc_now().isoformat()
        result = conn.execute(
            """
            UPDATE processing_jobs
            SET queue_status = 'running',
                started_at = ?,
                worker_id = ?,
                attempt_count = attempt_count + 1
            WHERE session_id = ? AND queue_status = 'queued'
            """,
            (now, _WORKER_ID, row["session_id"]),
        )
        conn.commit()
        if result.rowcount != 1:
            return None
        return row["session_id"]


def _finish_job(session_id: str, queue_status: str) -> None:
    with _queue_lock, _queue_connect() as conn:
        conn.execute(
            """
            UPDATE processing_jobs
            SET queue_status = ?,
                finished_at = ?,
                worker_id = ?
            WHERE session_id = ?
            """,
            (queue_status, utc_now().isoformat(), _WORKER_ID, session_id),
        )
        conn.commit()


def _clear_jobs() -> None:
    with _queue_lock, _queue_connect() as conn:
        conn.execute("DELETE FROM processing_jobs")
        conn.commit()


def _scan_dataset_with_timeout(
    *,
    session_id: str,
    reference_image_path: str,
    dataset_folder: str,
    model_name: str,
    distance_threshold: float,
    progress_callback,
) -> dict:
    with ThreadPoolExecutor(max_workers=1) as scan_executor:
        future = scan_executor.submit(
            scan_dataset,
            reference_image_path,
            dataset_folder,
            model_name,
            distance_threshold,
            progress_callback,
        )
        try:
            return future.result(timeout=PROCESSING_TIMEOUT_SECONDS)
        except FutureTimeoutError as exc:
            future.cancel()
            raise FaceRecognitionError(
                ErrorCode.PROCESSING_TIMEOUT,
                f"Processing exceeded the {PROCESSING_TIMEOUT_SECONDS}-second time limit.",
                retryable=True,
            ) from exc


def _run_recognition(session: ProcessingSession) -> None:
    session_id = session.session_id
    job_started_at = time.monotonic()
    _increment_stat("jobs_started")
    _increment_stat("active_jobs")
    _set_stat(last_job_started_at=utc_now().isoformat())

    try:
        _set_processing_state(
            session_id,
            stage=ProcessingStage.DATASET_VALIDATION,
            progress_percent=5,
            queue_position=None,
            stage_message="Validating the dataset source.",
        )
        logger.info("[%s] Downloading dataset: %s", session_id, session.dataset_download_url)

        def on_dataset_progress(progress: dict) -> None:
            progress_updates = dict(progress)
            stage = progress_updates.get("stage")
            if isinstance(stage, str):
                progress_updates["stage"] = ProcessingStage(stage)
            _set_processing_state(session_id, **progress_updates)

        dataset_folder = download_dataset(
            session.dataset_download_url or "",
            session_id,
            progress_callback=on_dataset_progress,
        )
        session = _set_processing_state(
            session_id,
            dataset_source=(get_session(session_id) or session).dataset_download_url,
            stage_message="Dataset prepared. Starting face analysis.",
        ) or session

        logger.info("[%s] Starting face scan...", session_id)

        def on_progress(progress: dict):
            progress_updates = dict(progress)
            stage = progress_updates.get("stage")
            if isinstance(stage, str):
                progress_updates["stage"] = ProcessingStage(stage)
            _set_processing_state(session_id, **progress_updates)

        results = _scan_dataset_with_timeout(
            session_id=session_id,
            reference_image_path=session.reference_image_path or "",
            dataset_folder=dataset_folder,
            model_name=session.requested_model_name or "ArcFace",
            distance_threshold=session.requested_similarity_threshold or 0.4,
            progress_callback=on_progress,
        )

        dataset_root = Path(dataset_folder)
        matched_images = []
        for rank, item in enumerate(results["matched"], start=1):
            relative_path = Path(item["path"]).relative_to(dataset_root).as_posix()
            download_url = f"/api/results/{session_id}/download/{quote(relative_path, safe='')}"
            matched_images.append(
                MatchedImage(
                    filename=item["filename"],
                    relative_path=relative_path,
                    similarity_score=item["similarity_score"],
                    distance=item["distance"],
                    download_url=download_url,
                    preview_url=download_url,
                    rank=rank,
                    face_count=item.get("face_count"),
                    confidence_percent=item["confidence_percent"],
                    confidence_label=item["confidence_label"],
                    match_reason=item["match_reason"],
                    source_group=item["source_group"],
                    blur_score=item.get("blur_score"),
                    is_blurry=item.get("is_blurry"),
                    blur_description=item.get("blur_description"),
                )
            )

        session = get_session(session_id) or session
        session.matched_images = matched_images
        session.total_images_scanned = results["total_scanned"]
        session.total_images_discovered = results["total_discovered"]
        session.matched_count = len(matched_images)
        session.images_with_detected_faces = results["images_with_detected_faces"]
        session.images_without_detected_faces = results["images_without_detected_faces"]
        session.images_with_multiple_faces = results["images_with_multiple_faces"]
        session.average_match_confidence = results["average_match_confidence"]
        session.top_match_confidence = results["top_match_confidence"]
        session.processing_time_seconds = results["processing_time"]
        session.status = SessionStatus.COMPLETED
        session.stage = ProcessingStage.RESULTS_READY
        session.progress_percent = 100
        session.stage_message = "Results are ready."
        session.current_image = None
        session.queue_position = None
        session.error = None
        session.processing_completed_at = utc_now()
        session.current_stage_started_at = session.processing_completed_at
        update_session(session)

        logger.info(
            "[%s] Processing complete: %s/%s matches.",
            session_id,
            len(matched_images),
            results["total_scanned"],
        )
        _increment_stat("jobs_completed")
        job_duration = round(time.monotonic() - job_started_at, 2)
        with _state_lock:
            _stats["total_job_duration_seconds"] = round(
                float(_stats.get("total_job_duration_seconds", 0.0)) + job_duration,
                2,
            )
            completed_jobs = int(_stats.get("jobs_completed", 0))
            _stats["last_job_duration_seconds"] = job_duration
            _stats["average_job_duration_seconds"] = round(
                float(_stats["total_job_duration_seconds"]) / max(completed_jobs, 1),
                2,
            )
            _stats["total_images_scanned"] = int(_stats.get("total_images_scanned", 0)) + results["total_scanned"]
            _stats["total_matches_found"] = int(_stats.get("total_matches_found", 0)) + len(matched_images)
        _set_stat(
            last_job_finished_at=utc_now().isoformat(),
            last_failure_code=None,
            last_failure_message=None,
        )

    except (DatasetRetrievalError, FaceRecognitionError) as exc:
        logger.warning("[%s] Validation error: %s", session_id, exc)
        session = get_session(session_id) or session
        session.status = SessionStatus.FAILED
        session.stage = ProcessingStage.FAILED
        session.queue_position = None
        session.stage_message = exc.message
        session.error = SessionError(code=exc.code, message=exc.message, retryable=exc.retryable)
        session.processing_completed_at = utc_now()
        session.current_stage_started_at = session.processing_completed_at
        update_session(session)
        cleanup_processing_artifacts(session_id)
        _increment_stat("jobs_failed")
        _set_stat(
            last_job_finished_at=utc_now().isoformat(),
            last_failure_code=exc.code.value,
            last_failure_message=exc.message,
        )
    except Exception as exc:
        logger.error("[%s] Unexpected error: %s", session_id, exc, exc_info=True)
        session = get_session(session_id) or session
        session.status = SessionStatus.FAILED
        session.stage = ProcessingStage.FAILED
        session.queue_position = None
        session.stage_message = "An unexpected error occurred during processing."
        session.error = SessionError(
            code=ErrorCode.INTERNAL_ERROR,
            message="An unexpected error occurred during processing.",
            retryable=True,
        )
        session.processing_completed_at = utc_now()
        session.current_stage_started_at = session.processing_completed_at
        update_session(session)
        cleanup_processing_artifacts(session_id)
        _increment_stat("jobs_failed")
        _set_stat(
            last_job_finished_at=utc_now().isoformat(),
            last_failure_code=ErrorCode.INTERNAL_ERROR.value,
            last_failure_message="An unexpected error occurred during processing.",
        )
    finally:
        _increment_stat("active_jobs", -1)


def _worker_loop() -> None:
    logger.info("Processing worker started.")
    while not _stop_event.is_set():
        session_id = _claim_next_job()
        if session_id is None:
            time.sleep(0.5)
            continue

        _recalculate_queue_positions()

        session = get_session(session_id)
        if not session or session.status != SessionStatus.PROCESSING:
            _finish_job(session_id, "discarded")
            continue

        future = _executor.submit(_run_recognition, session)
        future.result()
        latest_session = get_session(session_id)
        if latest_session and latest_session.status == SessionStatus.COMPLETED:
            _finish_job(session_id, "completed")
        else:
            _finish_job(session_id, "failed")

    logger.info("Processing worker stopped.")


def start_processing_worker() -> None:
    global _worker_thread
    if _worker_thread and _worker_thread.is_alive():
        return

    _stop_event.clear()
    _worker_thread = threading.Thread(target=_worker_loop, name="image-sorter-worker", daemon=True)
    _worker_thread.start()
    requeue_inflight_jobs()


def stop_processing_worker() -> None:
    _stop_event.set()
    if _worker_thread and _worker_thread.is_alive():
        _worker_thread.join(timeout=2)


def enqueue_processing_job(session_id: str) -> int:
    _upsert_job(session_id, "queued")
    with _state_lock:
        _stats["jobs_enqueued"] = int(_stats.get("jobs_enqueued", 0)) + 1
    _recalculate_queue_positions()
    with _queue_lock, _queue_connect() as conn:
        row = conn.execute(
            """
            SELECT 1 + COUNT(*)
            FROM processing_jobs
            WHERE queue_status = 'queued'
              AND created_at < (
                SELECT created_at FROM processing_jobs WHERE session_id = ?
              )
            """,
            (session_id,),
        ).fetchone()
    return int(row[0]) if row else 1


def requeue_inflight_jobs() -> None:
    sessions = list_sessions_by_status(SessionStatus.PROCESSING)
    for session in sessions:
        if session.stage in {ProcessingStage.RESULTS_READY, ProcessingStage.FAILED}:
            continue

        session.stage = ProcessingStage.QUEUED
        session.queue_position = None
        session.current_image = None
        session.progress_percent = min(session.progress_percent, 3)
        session.stage_message = "Queued for processing after service restart."
        session.current_stage_started_at = utc_now()
        update_session(session)
        enqueue_processing_job(session.session_id)


def get_queue_depth() -> int:
    with _queue_lock, _queue_connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM processing_jobs WHERE queue_status = 'queued'"
        ).fetchone()
    return int(row["count"]) if row else 0


def get_worker_snapshot() -> dict:
    with _state_lock:
        snapshot = dict(_stats)
        snapshot["worker_alive"] = bool(_worker_thread and _worker_thread.is_alive())
    snapshot["queued_jobs"] = get_queue_depth()
    return snapshot


def reset_worker_state() -> None:
    stop_processing_worker()
    _clear_jobs()
    with _state_lock:
        _stats.update(
            {
                "jobs_enqueued": 0,
                "jobs_started": 0,
                "jobs_completed": 0,
                "jobs_failed": 0,
                "active_jobs": 0,
                "last_job_started_at": None,
                "last_job_finished_at": None,
                "last_failure_code": None,
                "last_failure_message": None,
                "last_job_duration_seconds": None,
                "average_job_duration_seconds": None,
                "total_job_duration_seconds": 0.0,
                "total_images_scanned": 0,
                "total_matches_found": 0,
            }
        )


_initialize_job_store()
