from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MatchResult(BaseModel):
    image_id: str = Field(description="Unique ID for matched image")
    source_url: Optional[str] = Field(default=None, description="Original source URL if known")
    confidence: float = Field(ge=0.0, le=1.0)
    matched_face_count: int = Field(ge=1)
    preview_base64: Optional[str] = Field(default=None, description="Optional data URL preview")


class ProcessResponse(BaseModel):
    request_id: str
    message: str
    threshold: float = Field(ge=0.0, le=1.0)
    matches_found: int = Field(ge=0)
    matches: List[MatchResult]


class HealthResponse(BaseModel):
    status: str
    service: str
    model_name: str
    deepface_ready: bool
    timestamp: str


class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str


class FaceFinderException(Exception):
    def __init__(self, error_code: str, message: str, details: Optional[Dict[str, Any]] = None, status_code: int = 400):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.status_code = status_code


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
