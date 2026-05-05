from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, UploadFile

from app.core.settings import settings
from app.schemas import HealthResponse, ProcessResponse, utc_now_iso
from app.services.face_matcher import FaceMatcher
from app.services.processor import ProcessingService

logger = logging.getLogger(__name__)

router = APIRouter()
matcher = FaceMatcher(model_name=settings.model_name, detector_backend=settings.detector_backend)
processor = ProcessingService(matcher=matcher)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        model_name=settings.model_name,
        deepface_ready=matcher.deepface_ready,
        timestamp=utc_now_iso(),
    )


@router.post("/process", response_model=ProcessResponse)
async def process(
    reference_image: UploadFile = File(...),
    dataset_link: str = Form(...),
    threshold: float = Form(settings.default_threshold),
    include_previews: bool = Form(False),
    max_results: int = Form(50),
) -> ProcessResponse:
    file_bytes = await reference_image.read()
    logger.info("Processing request with dataset link: %s", dataset_link)
    return processor.process(
        reference_bytes=file_bytes,
        reference_filename=reference_image.filename or "reference.jpg",
        dataset_link=dataset_link,
        threshold=threshold,
        include_previews=include_previews,
        max_results=max_results,
    )
