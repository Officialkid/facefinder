from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.parse import urlparse

from dataset_adapters import ingest_dataset

from app.core.settings import settings
from app.schemas import FaceFinderException, MatchResult, ProcessResponse
from app.services.face_matcher import FaceMatcher
from app.services.preview import build_preview_data_url, file_name


class ProcessingService:
    def __init__(self, matcher: FaceMatcher) -> None:
        self.matcher = matcher

    def process(self, reference_bytes: bytes, reference_filename: str, dataset_link: str, threshold: float, include_previews: bool, max_results: int) -> ProcessResponse:
        request_id = str(uuid.uuid4())

        if not reference_bytes:
            raise FaceFinderException(
                error_code="MISSING_REFERENCE_IMAGE",
                message="Reference image upload is required.",
                status_code=400,
            )

        parsed = urlparse(dataset_link)
        if parsed.scheme not in {"http", "https"}:
            raise FaceFinderException(
                error_code="INVALID_DATASET_LINK",
                message="Dataset link must start with http:// or https://.",
                details={"dataset_link": dataset_link},
                status_code=400,
            )

        # Each request gets an isolated temp workspace and is deleted after completion.
        with tempfile.TemporaryDirectory(prefix="facefinder_", dir=settings.temp_root) as work_dir:
            workspace = Path(work_dir)
            ref_path = workspace / f"reference_{file_name(reference_filename) or 'reference.jpg'}"
            ref_path.write_bytes(reference_bytes)

            dataset_dir = workspace / "dataset"
            dataset_dir.mkdir(parents=True, exist_ok=True)

            try:
                dataset_result = ingest_dataset(
                    dataset_link,
                    str(dataset_dir),
                    allowed_file=self.matcher.is_image_filename,
                    max_images=settings.max_dataset_images,
                    include_source_map=True,
                )

                if isinstance(dataset_result, tuple):
                    dataset_images, source_map = dataset_result
                else:
                    dataset_images = dataset_result
                    source_map = {}
            except Exception as exc:
                raise FaceFinderException(
                    error_code="DATASET_DOWNLOAD_FAILED",
                    message="Unable to download or parse dataset link.",
                    details={"reason": str(exc)},
                    status_code=400,
                ) from exc

            if not dataset_images:
                raise FaceFinderException(
                    error_code="EMPTY_DATASET",
                    message="No valid images were found in the dataset link.",
                    details={"dataset_link": dataset_link},
                    status_code=400,
                )

            ref_embedding = self.matcher.embedding_for_largest_face(str(ref_path))
            if ref_embedding is None:
                raise FaceFinderException(
                    error_code="NO_FACE_IN_REFERENCE",
                    message="No detectable face found in reference image.",
                    status_code=400,
                )

            effective_threshold = max(0.0, min(1.0, threshold))
            effective_max_results = max(1, min(settings.max_results, int(max_results)))

            matches: List[MatchResult] = []
            for image_path in dataset_images:
                if not os.path.exists(image_path):
                    continue

                candidate = self.matcher.best_match_for_image(ref_embedding, image_path, effective_threshold)
                if candidate is None:
                    continue

                preview = build_preview_data_url(candidate.image_path) if include_previews else None

                # Preserve remote source URLs for HTML/Pixieset/direct link inputs.
                source_url = source_map.get(candidate.image_path)
                if not source_url and self.matcher.is_image_filename(parsed.path):
                    source_url = dataset_link
                matches.append(
                    MatchResult(
                        image_id=file_name(candidate.image_path),
                        source_url=source_url,
                        confidence=round(candidate.best_confidence, 6),
                        matched_face_count=candidate.matched_face_count,
                        preview_base64=preview,
                    )
                )

            matches.sort(key=lambda item: item.confidence, reverse=True)
            matches = matches[:effective_max_results]

            if not matches:
                return ProcessResponse(
                    request_id=request_id,
                    message="No matching faces found above threshold.",
                    threshold=effective_threshold,
                    matches_found=0,
                    matches=[],
                )

            return ProcessResponse(
                request_id=request_id,
                message="Processing complete.",
                threshold=effective_threshold,
                matches_found=len(matches),
                matches=matches,
            )
