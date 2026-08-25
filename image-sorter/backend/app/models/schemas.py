"""Data models for FaceFinder AI sessions, progress, and results."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SessionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class ProcessingStage(str, Enum):
    QUEUED = "queued"
    UPLOAD_RECEIVED = "upload_received"
    DATASET_VALIDATION = "dataset_validation"
    DATASET_DOWNLOAD = "dataset_download"
    DATASET_EXTRACTION = "dataset_extraction"
    REFERENCE_ANALYSIS = "reference_analysis"
    DATASET_SCAN = "dataset_scan"
    RESULTS_READY = "results_ready"
    FAILED = "failed"


class ErrorCode(str, Enum):
    NO_FACE_IN_REFERENCE = "no_face_in_reference"
    TOO_MANY_FACES = "too_many_faces"
    DATASET_EMPTY = "dataset_empty"
    DATASET_UNREACHABLE = "dataset_unreachable"
    DATASET_TOO_LARGE = "dataset_too_large"
    DATASET_INVALID = "dataset_invalid"
    DATASET_UNSAFE_ARCHIVE = "dataset_unsafe_archive"
    PROCESSING_TIMEOUT = "processing_timeout"
    INTERNAL_ERROR = "internal_error"


class RecognitionModel(str, Enum):
    ARCFACE = "ArcFace"
    FACENET = "Facenet"
    VGG_FACE = "VGG-Face"
    DEEPFACE = "DeepFace"


class SessionError(BaseModel):
    code: ErrorCode
    message: str
    retryable: bool = False


class MatchedImage(BaseModel):
    filename: str
    relative_path: str
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    distance: float = Field(..., description="Embedding distance (lower = more similar)")
    download_url: str
    preview_url: str
    rank: int
    face_count: Optional[int] = Field(default=None, ge=0)
    confidence_percent: int = Field(..., ge=0, le=100)
    confidence_label: str
    match_reason: str
    source_group: str
    blur_score: Optional[float] = Field(default=None, description="Laplacian variance blur score")
    is_blurry: Optional[bool] = Field(default=None, description="Whether the image is flagged as blurry")
    blur_description: Optional[str] = Field(default=None, description="Human-readable blur assessment")
    filename: str
    relative_path: str
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    distance: float = Field(..., description="Embedding distance (lower = more similar)")
    download_url: str
    preview_url: str
    rank: int
    face_count: Optional[int] = Field(default=None, ge=0)
    confidence_percent: int = Field(..., ge=0, le=100)
    confidence_label: str
    match_reason: str
    source_group: str


class ProcessingSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: SessionStatus = SessionStatus.PENDING
    stage: ProcessingStage = ProcessingStage.UPLOAD_RECEIVED
    created_at: datetime = Field(default_factory=utc_now)
    reference_image_path: Optional[str] = None
    dataset_source: Optional[str] = None  # URL or folder path
    dataset_download_url: Optional[str] = None
    dataset_provider: Optional[str] = None
    dataset_source_kind: Optional[str] = None
    requested_model_name: Optional[str] = None
    requested_similarity_threshold: Optional[float] = None
    total_images_scanned: int = 0
    total_images_discovered: int = 0
    matched_images: List[MatchedImage] = Field(default_factory=list)
    matched_count: int = 0
    images_with_detected_faces: int = 0
    images_without_detected_faces: int = 0
    images_with_multiple_faces: int = 0
    average_match_confidence: Optional[float] = None
    top_match_confidence: Optional[float] = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    stage_message: Optional[str] = None
    current_image: Optional[str] = None
    queue_position: Optional[int] = Field(default=None, ge=1)
    dataset_downloaded_bytes: int = Field(default=0, ge=0)
    dataset_total_bytes: Optional[int] = Field(default=None, ge=0)
    dataset_files_extracted: int = Field(default=0, ge=0)
    dataset_total_files: Optional[int] = Field(default=None, ge=0)
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    current_stage_started_at: datetime = Field(default_factory=utc_now)
    last_updated_at: datetime = Field(default_factory=utc_now)
    error: Optional[SessionError] = None
    processing_time_seconds: Optional[float] = None


class ProcessRequest(BaseModel):
    session_id: str
    dataset_url: Optional[str] = None
    similarity_threshold: float = Field(
        default=0.4,
        ge=0.1,
        le=0.9,
        description="Distance threshold for face matching. Lower = stricter match.",
    )
    model_name: RecognitionModel = Field(
        default=RecognitionModel.ARCFACE,
        description="Recognition model: ArcFace, VGG-Face, Facenet, DeepFace",
    )


class ProcessResponse(BaseModel):
    session_id: str
    status: SessionStatus
    stage: ProcessingStage
    queue_position: Optional[int] = None
    requested_model_name: RecognitionModel
    requested_similarity_threshold: float
    message: str


class StatusResponse(BaseModel):
    session_id: str
    status: SessionStatus
    stage: ProcessingStage
    requested_model_name: Optional[RecognitionModel]
    requested_similarity_threshold: Optional[float]
    dataset_provider: Optional[str]
    dataset_source_kind: Optional[str]
    progress_percent: int
    stage_message: Optional[str]
    total_images_scanned: int
    total_images_discovered: int
    matched_count: int
    images_with_detected_faces: int
    images_without_detected_faces: int
    images_with_multiple_faces: int
    average_match_confidence: Optional[float]
    top_match_confidence: Optional[float]
    current_image: Optional[str]
    queue_position: Optional[int]
    dataset_downloaded_bytes: int
    dataset_total_bytes: Optional[int]
    dataset_files_extracted: int
    dataset_total_files: Optional[int]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    current_stage_started_at: datetime
    stage_elapsed_seconds: float
    estimated_remaining_seconds: Optional[float]
    processing_time_seconds: Optional[float]
    error: Optional[SessionError]
    last_updated_at: datetime


class ResultsResponse(BaseModel):
    session_id: str
    status: SessionStatus
    stage: ProcessingStage
    requested_model_name: Optional[RecognitionModel]
    requested_similarity_threshold: Optional[float]
    dataset_provider: Optional[str]
    dataset_source_kind: Optional[str]
    progress_percent: int
    stage_message: Optional[str]
    total_images_scanned: int
    total_images_discovered: int
    matched_count: int
    images_with_detected_faces: int
    images_without_detected_faces: int
    images_with_multiple_faces: int
    average_match_confidence: Optional[float]
    top_match_confidence: Optional[float]
    matched_images: List[MatchedImage]
    queue_position: Optional[int]
    dataset_downloaded_bytes: int
    dataset_total_bytes: Optional[int]
    dataset_files_extracted: int
    dataset_total_files: Optional[int]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    current_stage_started_at: datetime
    stage_elapsed_seconds: float
    estimated_remaining_seconds: Optional[float]
    processing_time_seconds: Optional[float]
    error: Optional[SessionError]


class WorkerSnapshotResponse(BaseModel):
    queued_jobs: int
    worker_alive: bool
    jobs_enqueued: int
    jobs_started: int
    jobs_completed: int
    jobs_failed: int
    active_jobs: int
    last_job_started_at: Optional[str]
    last_job_finished_at: Optional[str]
    last_failure_code: Optional[str]
    last_failure_message: Optional[str]
    last_job_duration_seconds: Optional[float]
    average_job_duration_seconds: Optional[float]
    total_job_duration_seconds: float
    total_images_scanned: int
    total_matches_found: int
