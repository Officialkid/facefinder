"""
Upload Router
Handles reference image upload and creates a new processing session.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pathlib import Path
import logging

from app.models.schemas import ProcessingSession, SessionStatus
from app.services.rate_limiter import RateLimitExceeded, enforce_rate_limit
from app.services.security import validate_upload_content
from app.services.session_store import create_session
from app.services.dataset_retrieval import get_session_temp_dir

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
    create_session(session)

    logger.info(f"Reference image uploaded. Session: {session.session_id}")
    return {
        "session_id": session.session_id,
        "status": session.status,
        "message": "Reference image uploaded successfully. Proceed to /api/process/start",
        "reference_image": file.filename,
    }
