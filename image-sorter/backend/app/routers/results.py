import logging
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.models.schemas import (
    ProcessingStage,
    ResultsResponse,
    SessionStatus,
    StatusResponse,
    WorkerSnapshotResponse,
    utc_now,
)
from app.services.session_store import get_session, delete_session
from app.services.dataset_retrieval import cleanup_session_files, get_session_temp_dir
from app.services.processing_queue import get_worker_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_stage_elapsed_seconds(session) -> float:
    return max(
        0.0,
        round((utc_now() - session.current_stage_started_at).total_seconds(), 2),
    )


def _get_estimated_remaining_seconds(session, stage_elapsed_seconds: float) -> float | None:
    if session.status == SessionStatus.COMPLETED:
        return 0.0
    if session.stage != ProcessingStage.DATASET_SCAN:
        return None
    if session.total_images_discovered <= 0 or session.total_images_scanned <= 0:
        return None

    remaining_images = session.total_images_discovered - session.total_images_scanned
    if remaining_images <= 0:
        return 0.0

    scan_rate = session.total_images_scanned / max(stage_elapsed_seconds, 1.0)
    if scan_rate <= 0:
        return None

    return round(remaining_images / scan_rate, 2)


@router.get("/{session_id}/status", response_model=StatusResponse, summary="Get processing status")
async def get_status(session_id: str):
    """
    Poll processing status. Returns current session state.
    Frontend should poll every 3-5 seconds until status is 'completed' or 'failed'.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    stage_elapsed_seconds = _get_stage_elapsed_seconds(session)

    return StatusResponse(
        session_id=session_id,
        status=session.status,
        stage=session.stage,
        requested_model_name=session.requested_model_name,
        requested_similarity_threshold=session.requested_similarity_threshold,
        dataset_provider=session.dataset_provider,
        dataset_source_kind=session.dataset_source_kind,
        progress_percent=session.progress_percent,
        stage_message=session.stage_message,
        total_images_scanned=session.total_images_scanned,
        total_images_discovered=session.total_images_discovered,
        matched_count=session.matched_count,
        images_with_detected_faces=session.images_with_detected_faces,
        images_without_detected_faces=session.images_without_detected_faces,
        images_with_multiple_faces=session.images_with_multiple_faces,
        average_match_confidence=session.average_match_confidence,
        top_match_confidence=session.top_match_confidence,
        current_image=session.current_image,
        queue_position=session.queue_position,
        dataset_downloaded_bytes=session.dataset_downloaded_bytes,
        dataset_total_bytes=session.dataset_total_bytes,
        dataset_files_extracted=session.dataset_files_extracted,
        dataset_total_files=session.dataset_total_files,
        processing_started_at=session.processing_started_at,
        processing_completed_at=session.processing_completed_at,
        current_stage_started_at=session.current_stage_started_at,
        stage_elapsed_seconds=stage_elapsed_seconds,
        estimated_remaining_seconds=_get_estimated_remaining_seconds(session, stage_elapsed_seconds),
        processing_time_seconds=session.processing_time_seconds,
        matched_images=session.matched_images or [],
        manual_search_estimated_seconds=(
            round(session.total_images_discovered * 1.8, 1) if session.total_images_discovered > 0 else None
        ),
        time_saved_percent=(
            round(max(0.0, ((session.total_images_discovered * 1.8) - (session.processing_time_seconds or stage_elapsed_seconds)) / (session.total_images_discovered * 1.8) * 100), 1)
            if session.total_images_discovered > 0 and (session.total_images_discovered * 1.8) > (session.processing_time_seconds or stage_elapsed_seconds)
            else None
        ),
        color_space_normalized=True,
        error=session.error,
        last_updated_at=session.last_updated_at,
    )


@router.get("/{session_id}", response_model=ResultsResponse, summary="Get full results")
async def get_results(session_id: str):
    """
    Retrieve full results including all matched images with similarity scores.
    Only available when status == 'completed'.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.status == SessionStatus.PROCESSING:
        raise HTTPException(
            status_code=202,
            detail="Processing is still in progress. Poll /status for updates.",
        )

    stage_elapsed_seconds = _get_stage_elapsed_seconds(session)

    return ResultsResponse(
        session_id=session_id,
        status=session.status,
        stage=session.stage,
        requested_model_name=session.requested_model_name,
        requested_similarity_threshold=session.requested_similarity_threshold,
        dataset_provider=session.dataset_provider,
        dataset_source_kind=session.dataset_source_kind,
        progress_percent=session.progress_percent,
        stage_message=session.stage_message,
        total_images_scanned=session.total_images_scanned,
        total_images_discovered=session.total_images_discovered,
        matched_count=session.matched_count,
        images_with_detected_faces=session.images_with_detected_faces,
        images_without_detected_faces=session.images_without_detected_faces,
        images_with_multiple_faces=session.images_with_multiple_faces,
        average_match_confidence=session.average_match_confidence,
        top_match_confidence=session.top_match_confidence,
        matched_images=session.matched_images,
        queue_position=session.queue_position,
        dataset_downloaded_bytes=session.dataset_downloaded_bytes,
        dataset_total_bytes=session.dataset_total_bytes,
        dataset_files_extracted=session.dataset_files_extracted,
        dataset_total_files=session.dataset_total_files,
        processing_started_at=session.processing_started_at,
        processing_completed_at=session.processing_completed_at,
        current_stage_started_at=session.current_stage_started_at,
        stage_elapsed_seconds=stage_elapsed_seconds,
        estimated_remaining_seconds=_get_estimated_remaining_seconds(session, stage_elapsed_seconds),
        processing_time_seconds=session.processing_time_seconds,
        manual_search_estimated_seconds=(
            round(session.total_images_discovered * 1.8, 1) if session.total_images_discovered > 0 else None
        ),
        time_saved_percent=(
            round(max(0.0, ((session.total_images_discovered * 1.8) - (session.processing_time_seconds or stage_elapsed_seconds)) / (session.total_images_discovered * 1.8) * 100), 1)
            if session.total_images_discovered > 0 and (session.total_images_discovered * 1.8) > (session.processing_time_seconds or stage_elapsed_seconds)
            else None
        ),
        color_space_normalized=True,
        error=session.error,
    )


@router.get("/worker/snapshot", response_model=WorkerSnapshotResponse, summary="Get worker snapshot")
async def get_worker_status():
    """Return queue and worker metrics for observability."""
    return WorkerSnapshotResponse(**get_worker_snapshot())


@router.get("/{session_id}/download/{file_path:path}", summary="Download a matched image")
async def download_image(session_id: str, file_path: str):
    """
    Download a specific matched image by filename.
    Only available for active (non-expired) sessions.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.status != SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Processing not yet completed.")

    dataset_dir = get_session_temp_dir(session_id) / "dataset"
    requested_path = Path(file_path)
    resolved_path = (dataset_dir / requested_path).resolve()
    dataset_root = dataset_dir.resolve()
    if dataset_root not in resolved_path.parents and resolved_path != dataset_root:
        raise HTTPException(status_code=400, detail="Invalid image path.")
    if not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(status_code=404, detail=f"Image '{requested_path.as_posix()}' not found.")

    return FileResponse(
        path=str(resolved_path),
        filename=resolved_path.name,
        media_type="image/jpeg",
    )


@router.get("/{session_id}/download-all", summary="Download all matched images as a ZIP archive")
@router.get("/{session_id}/download_all", summary="Download all matched images as a ZIP archive (alias)")
async def download_all_matches(session_id: str):
    """
    Generate and download a ZIP file containing all matched images for this session.
    Only available when processing is completed.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.status != SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Processing not yet completed.")

    if not session.matched_images:
        raise HTTPException(status_code=404, detail="No matched images to download.")

    dataset_dir = get_session_temp_dir(session_id) / "dataset"
    zip_dir = get_session_temp_dir(session_id)
    zip_path = zip_dir / f"FaceFinder_Matches_{session_id[:8]}.zip"

    # Create zip file containing all matched images
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, match in enumerate(session.matched_images, 1):
            rel_path = match.relative_path or match.filename
            img_path = (dataset_dir / rel_path).resolve()
            if img_path.exists() and img_path.is_file():
                # Store with rank prefix for clean sorting in file explorer
                arcname = f"Rank_{match.rank:02d}_{img_path.name}"
                zf.write(img_path, arcname=arcname)

    if not zip_path.exists() or zip_path.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="Failed to create matches ZIP archive.")

    return FileResponse(
        path=str(zip_path),
        filename=f"FaceFinder_Matches_{session_id[:8]}.zip",
        media_type="application/zip",
    )


@router.delete("/{session_id}", summary="Delete session and all temporary files")
async def delete_session_endpoint(session_id: str):
    """
    Manually delete a session and all associated temporary files.
    Sessions are also deleted automatically on expiry.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    cleanup_session_files(session_id)
    delete_session(session_id)

    logger.info(f"Session manually deleted: {session_id}")
    return {"message": f"Session {session_id} and all associated files deleted."}

