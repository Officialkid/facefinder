"""Processing router that enqueues scan work for the worker service."""

from pathlib import Path
import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import ProcessRequest, ProcessResponse, ProcessingStage, SessionStatus, utc_now
from app.services.dataset_retrieval import infer_dataset_source_metadata
from app.services.processing_queue import enqueue_processing_job
from app.services.rate_limiter import RateLimitExceeded, enforce_rate_limit
from app.services.security import validate_dataset_url_input
from app.services.session_store import get_session, update_session

router = APIRouter()
logger = logging.getLogger(__name__)
PROCESS_REQUESTS_PER_MINUTE_PER_CLIENT = 6


@router.post("/start", response_model=ProcessResponse, summary="Start face recognition")
async def start_processing(request: ProcessRequest, http_request: Request):
    """
    Queue the AI face recognition pipeline for a session.
    Clients should poll /api/results/{session_id}/status for live progress.
    """
    client_host = http_request.client.host if http_request.client else "unknown"
    try:
        enforce_rate_limit(
            key=f"process:{client_host}",
            limit=PROCESS_REQUESTS_PER_MINUTE_PER_CLIENT,
            window_seconds=60,
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=f"Too many processing requests. Try again in {exc.retry_after_seconds} seconds.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status == SessionStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Session is already processing.")

    if not session.reference_image_path or not Path(session.reference_image_path).exists():
        raise HTTPException(
            status_code=400,
            detail="Reference image not found. Upload an image first via /api/upload/reference",
        )

    validate_dataset_url_input(request.dataset_url or "")
    dataset_provider, dataset_source_kind = infer_dataset_source_metadata(request.dataset_url or "")

    session.status = SessionStatus.PROCESSING
    session.stage = ProcessingStage.QUEUED
    session.progress_percent = 1
    session.stage_message = "Queued for processing."
    session.total_images_scanned = 0
    session.total_images_discovered = 0
    session.matched_images = []
    session.matched_count = 0
    session.images_with_detected_faces = 0
    session.images_without_detected_faces = 0
    session.images_with_multiple_faces = 0
    session.average_match_confidence = None
    session.top_match_confidence = None
    session.current_image = None
    session.queue_position = None
    session.dataset_downloaded_bytes = 0
    session.dataset_total_bytes = None
    session.dataset_files_extracted = 0
    session.dataset_total_files = None
    session.error = None
    session.processing_time_seconds = None
    session.processing_started_at = utc_now()
    session.processing_completed_at = None
    session.current_stage_started_at = session.processing_started_at
    session.dataset_source = None
    session.dataset_download_url = request.dataset_url
    session.dataset_provider = dataset_provider
    session.dataset_source_kind = dataset_source_kind
    session.requested_model_name = request.model_name
    session.requested_similarity_threshold = request.similarity_threshold
    session.selected_face_index = request.selected_face_index
    update_session(session)

    queue_position = enqueue_processing_job(request.session_id)
    session.queue_position = queue_position
    update_session(session)

    logger.info(
        "[%s] Processing job queued at position %s.",
        request.session_id,
        queue_position,
    )

    return ProcessResponse(
        session_id=request.session_id,
        status=SessionStatus.PROCESSING,
        stage=ProcessingStage.QUEUED,
        queue_position=queue_position,
        requested_model_name=request.model_name,
        requested_similarity_threshold=request.similarity_threshold,
        message=f"Processing queued. Current queue position: {queue_position}.",
    )
