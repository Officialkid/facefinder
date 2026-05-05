from __future__ import annotations

import os
from dataclasses import dataclass


def _parse_origins(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ("*",)
    return tuple(o.strip() for o in raw.split(",") if o.strip())


@dataclass(frozen=True)
class Settings:
    app_name: str = "FaceFinder"
    model_name: str = "Facenet512"
    detector_backend: str = "skip"
    default_threshold: float = 0.85
    max_dataset_images: int = 300
    max_results: int = 100
    temp_root: str = os.getenv("FACEFINDER_TEMP_ROOT", "/tmp")
    allowed_origins: tuple[str, ...] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        # dataclass frozen=True means we must use object.__setattr__ to set computed fields
        object.__setattr__(self, "allowed_origins", _parse_origins(os.getenv("ALLOWED_ORIGINS")))


settings = Settings()
