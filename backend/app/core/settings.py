from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "FaceFinder"
    model_name: str = "Facenet512"
    detector_backend: str = "skip"
    default_threshold: float = 0.85
    max_dataset_images: int = 300
    max_results: int = 100
    temp_root: str = os.getenv("FACEFINDER_TEMP_ROOT", "/tmp")


settings = Settings()
