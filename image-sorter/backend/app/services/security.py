"""Security validation helpers for uploads and remote dataset URLs."""

from __future__ import annotations

import ipaddress
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
}

IMAGE_MAGIC_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],
    ".bmp": [b"BM"],
}

BLOCKED_HOSTNAMES = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
MAX_DATASET_URL_LENGTH = 2048


def validate_upload_content(file_extension: str, content_type: str | None, content: bytes) -> None:
    normalized_type = (content_type or "").lower()
    if normalized_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image content type. Use JPG, PNG, WEBP, or BMP.",
        )

    expected_signatures = IMAGE_MAGIC_SIGNATURES.get(file_extension, [])
    if not expected_signatures:
        raise HTTPException(status_code=400, detail="Unsupported image file extension.")

    if file_extension == ".webp":
        if not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
            raise HTTPException(status_code=400, detail="Uploaded WEBP file is invalid.")
        return

    if not any(content.startswith(signature) for signature in expected_signatures):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file content does not match the declared image type.",
        )


def validate_dataset_url_input(url: str) -> None:
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="dataset_url is required.")

    if len(url) > MAX_DATASET_URL_LENGTH:
        raise HTTPException(status_code=400, detail="dataset_url is too long.")

    if url.startswith("local_zip://"):
        return

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="dataset_url must be a valid public http(s) URL.")

    hostname = (parsed.hostname or "").lower()
    if hostname in BLOCKED_HOSTNAMES:
        raise HTTPException(status_code=400, detail="Local or loopback dataset URLs are not allowed.")

    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        ip = None

    if ip and (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved):
        raise HTTPException(status_code=400, detail="Private network dataset URLs are not allowed.")

    suffix = Path(parsed.path).suffix.lower()
    if suffix and suffix not in {".zip", ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported dataset file type. Use a ZIP archive, direct image URL, or supported public gallery link.",
        )
