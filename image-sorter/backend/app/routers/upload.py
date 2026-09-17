"""
Upload Router
Handles reference image upload and creates a new processing session.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from pathlib import Path
import logging

from app.models.schemas import ProcessingSession, SessionStatus, FaceDetectionItem
from app.services.rate_limiter import RateLimitExceeded, enforce_rate_limit
from app.services.security import validate_upload_content
from app.services.session_store import create_session, get_session
from app.services.dataset_retrieval import get_session_temp_dir
from app.services.face_recognition import detect_reference_faces

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
MAX_FILE_SIZE_MB = 10
UPLOADS_PER_MINUTE_PER_CLIENT = 10


@router.post("/reference", summary="Upload reference image")
async def upload_reference_image(request: Request, file: UploadFile = File(...)):
    """
    Upload a reference image containing the user's face.
    Returns a session_id to be used in subsequent API calls.
    """
    client_host = request.client.host if request.client else "unknown"
    try:
        enforce_rate_limit(
            key=f"upload:{client_host}",
            limit=UPLOADS_PER_MINUTE_PER_CLIENT,
            window_seconds=60,
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=f"Too many uploads. Try again in {exc.retry_after_seconds} seconds.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Create session
    session = ProcessingSession()
    session_dir = get_session_temp_dir(session.session_id)
    session_dir.mkdir(parents=True, exist_ok=True)

    # Save reference image
    ref_path = session_dir / f"reference{ext}"
    try:
        with open(ref_path, "wb") as f:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum allowed: {MAX_FILE_SIZE_MB}MB",
                )
            validate_upload_content(ext, file.content_type, content)
            f.write(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save reference image: {e}")
        raise HTTPException(status_code=500, detail="Failed to save reference image.")

    session.reference_image_path = str(ref_path)
    session.progress_percent = 0

    # Detect faces in reference image for instant user disambiguation
    detected_faces = []
    try:
        raw_faces = detect_reference_faces(str(ref_path))
        detected_faces = [FaceDetectionItem(**f) for f in raw_faces]
        session.detected_reference_faces = detected_faces
    except Exception as exc:
        logger.warning("Failed detecting reference faces on upload: %s", exc)

    create_session(session)

    logger.info(f"Reference image uploaded ({len(detected_faces)} faces detected). Session: {session.session_id}")
    return {
        "session_id": session.session_id,
        "status": session.status,
        "message": "Reference image uploaded successfully. Proceed to /api/process/start",
        "reference_image": file.filename,
        "detected_faces": [f.model_dump() for f in detected_faces],
    }


@router.get("/reference/{session_id}", summary="Get uploaded reference portrait")
@router.get("/{session_id}/reference", summary="Get uploaded reference portrait (alias)")
async def get_reference_image(session_id: str):
    """Serve the reference portrait for the given session."""
    session = get_session(session_id)
    if not session or not session.reference_image_path:
        raise HTTPException(status_code=404, detail="Reference image not found.")
    
    ref_path = Path(session.reference_image_path)
    if not ref_path.exists() or not ref_path.is_file():
        raise HTTPException(status_code=404, detail="Reference image file not found.")
    
    ext = ref_path.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }
    return FileResponse(
        path=str(ref_path),
        media_type=media_types.get(ext, "image/jpeg"),
        filename=ref_path.name,
    )


@router.post("/dataset-zip", summary="Upload local dataset ZIP archive")
async def upload_dataset_zip(
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a local ZIP archive of photos directly for a session.
    Extracts the archive safely into the session's dataset directory.
    """
    client_host = request.client.host if request.client else "unknown"
    try:
        enforce_rate_limit(
            key=f"upload_zip:{client_host}",
            limit=UPLOADS_PER_MINUTE_PER_CLIENT,
            window_seconds=60,
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=f"Too many uploads. Try again in {exc.retry_after_seconds} seconds.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .zip archive.")

    session_dir = get_session_temp_dir(session_id)
    session_dir.mkdir(parents=True, exist_ok=True)
    temp_zip_path = session_dir / f"uploaded_dataset_{file.filename}"

    try:
        content = await file.read()
        if len(content) > 300 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="ZIP archive exceeds 300MB limit.")

        with open(temp_zip_path, "wb") as f:
            f.write(content)

        import zipfile
        from app.services.dataset_retrieval import _safe_extract_zip, _count_supported_images, _cleanup_path

        if not zipfile.is_zipfile(temp_zip_path):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive.")

        staging_dir = session_dir / "dataset_staging"
        dataset_dir = session_dir / "dataset"

        _cleanup_path(staging_dir)
        staging_dir.mkdir(parents=True, exist_ok=True)

        _safe_extract_zip(temp_zip_path, staging_dir)
        temp_zip_path.unlink(missing_ok=True)

        image_count = _count_supported_images(staging_dir)
        if image_count == 0:
            _cleanup_path(staging_dir)
            raise HTTPException(status_code=400, detail="The ZIP archive contains no supported image files (JPG, PNG, WEBP, BMP).")

        _cleanup_path(dataset_dir)
        staging_dir.replace(dataset_dir)

        # Update session
        session.dataset_source = f"local_zip://{file.filename}"
        session.dataset_download_url = f"local_zip://{file.filename}"
        session.dataset_provider = "Local ZIP Upload"
        session.dataset_source_kind = "direct_file"
        session.total_images_discovered = image_count
        session.stage_message = f"Loaded {image_count} photos from {file.filename}."
        from app.services.session_store import update_session
        update_session(session)

        logger.info(f"[{session_id}] Uploaded and extracted {image_count} photos from ZIP {file.filename}")
        return {
            "session_id": session_id,
            "status": "ready",
            "filename": file.filename,
            "image_count": image_count,
            "message": f"Successfully extracted {image_count} photos from {file.filename}.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process ZIP upload for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to extract ZIP archive: {str(e)}")

