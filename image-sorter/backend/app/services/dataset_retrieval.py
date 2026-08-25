"""Dataset retrieval with stronger staging, cleanup, and archive safety checks."""

import html
import logging
import os
from pathlib import Path
import re
import shutil
from typing import Callable, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
import urllib.request
import uuid
import zipfile

from app.models.schemas import ErrorCode

logger = logging.getLogger(__name__)

DEFAULT_TEMP_DIR = Path(__file__).parent.parent.parent / "temp_storage"
TEMP_DIR = Path(os.environ.get("IMAGE_SORTER_TEMP_DIR", DEFAULT_TEMP_DIR))
TEMP_DIR.mkdir(exist_ok=True)

MAX_DATASET_SIZE_MB = 500
MAX_ARCHIVE_MEMBER_SIZE_MB = 100
MAX_ARCHIVE_TOTAL_SIZE_MB = 750
MAX_ARCHIVE_FILE_COUNT = 10000
MAX_GALLERY_IMAGE_COUNT = 5000
DOWNLOAD_TIMEOUT_SECONDS = int(os.environ.get("IMAGE_SORTER_DOWNLOAD_TIMEOUT_SECONDS", "60"))
DOWNLOAD_CHUNK_SIZE_BYTES = 1024 * 1024
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
SUPPORTED_REMOTE_HOSTS = ("http", "https")
GALLERY_PROVIDER_HOST_MARKERS = {
    "google_photos": ("photos.google.com", "photos.app.goo.gl"),
    "pixieset": ("pixieset.com",),
    "pixabay": ("pixabay.com",),
}
IMAGE_HOST_MARKERS = (
    "googleusercontent.com",
    "ggpht.com",
    "pixieset.com",
    "pxscdn.com",
    "pixabay.com",
)
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


class DatasetRetrievalError(Exception):
    def __init__(self, code: ErrorCode, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


def _google_drive_direct_url(url: str) -> Optional[str]:
    match = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    return None


def _dropbox_direct_url(url: str) -> str:
    return url.replace("?dl=0", "?dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com")


def _infer_source_kind(url: str) -> str:
    hostname = (urlparse(url).hostname or "").lower()
    path = urlparse(url).path.lower()

    if "drive.google.com" in hostname and re.search(r"/d/([a-zA-Z0-9_-]+)", url):
        return "direct_file"
    if "dropbox.com" in hostname:
        return "direct_file"
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["google_photos"]):
        return "gallery_page"
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["pixieset"]):
        return "gallery_page"
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["pixabay"]):
        return "gallery_page"

    suffix = Path(path).suffix.lower()
    if suffix in SUPPORTED_IMAGE_EXTENSIONS or suffix == ".zip":
        return "direct_file"
    return "gallery_page"


def _resolve_url(url: str) -> tuple[str, str]:
    source_kind = _infer_source_kind(url)
    if "drive.google.com" in url:
        direct = _google_drive_direct_url(url)
        if direct:
            return direct, "direct_file"
    if "dropbox.com" in url:
        return _dropbox_direct_url(url), "direct_file"
    return url, source_kind


def _validate_remote_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in SUPPORTED_REMOTE_HOSTS or not parsed.netloc:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_INVALID,
            "Please provide a valid public dataset URL.",
        )


def _count_supported_images(folder: Path) -> int:
    return sum(1 for path in folder.rglob("*") if path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS)


def _build_request(url: str, *, method: str = "GET", referer: Optional[str] = None) -> urllib.request.Request:
    headers = dict(REQUEST_HEADERS)
    if referer:
        headers["Referer"] = referer
    return urllib.request.Request(url, method=method, headers=headers)


def _provider_label(url: str) -> str:
    hostname = (urlparse(url).hostname or "").lower()
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["google_photos"]):
        return "Google Photos"
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["pixieset"]):
        return "Pixieset"
    if any(marker in hostname for marker in GALLERY_PROVIDER_HOST_MARKERS["pixabay"]):
        return "Pixabay"
    if "drive.google.com" in hostname:
        return "Google Drive"
    if "dropbox.com" in hostname:
        return "Dropbox"
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix == ".zip":
        return "ZIP Link"
    if suffix in SUPPORTED_IMAGE_EXTENSIONS:
        return "Direct Image"
    return "gallery"


def infer_dataset_source_metadata(url: str) -> tuple[str, str]:
    resolved_url, source_kind = _resolve_url(url)
    return _provider_label(resolved_url), source_kind


def _looks_like_supported_image_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in SUPPORTED_REMOTE_HOSTS or not parsed.netloc:
        return False

    hostname = (parsed.hostname or "").lower()
    if Path(parsed.path).suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
        return True

    return any(marker in hostname for marker in IMAGE_HOST_MARKERS)


def _normalize_candidate_url(raw_url: str, base_url: str) -> Optional[str]:
    candidate = html.unescape(raw_url.strip().strip("\"'"))
    candidate = candidate.replace("\\u003d", "=").replace("\\u0026", "&").replace("\\u002f", "/")
    candidate = candidate.replace("\\/", "/").replace("&amp;", "&")
    candidate = urljoin(base_url, candidate)

    # Google Photos special treatment: ensure high-resolution endpoint
    if "googleusercontent.com" in candidate:
        if "/a/" in candidate or "/og/" in candidate or "/contacts/" in candidate:
            return None
        # Normalize and strip sizing query
        base_photo_url = re.sub(r"=[^/]*$", "", candidate)
        return f"{base_photo_url}=w1920-h1080-no"

    # Pixieset special treatment: ensure full size
    if "pxscdn.com" in candidate or "pixieset.com" in candidate:
        if "avatar" in candidate or "logo" in candidate:
            return None
        return candidate

    if not _looks_like_supported_image_url(candidate):
        return None
    return candidate


def _extract_gallery_image_urls(page_html: str, base_url: str) -> list[str]:
    candidates: list[str] = []
    patterns = [
        r"""(?:src|content|data-src|data-large-src)=["']([^"']+)["']""",
        r"""https?:\\?/\\?/[^"'<>\s)]+""",
    ]

    for pattern in patterns:
        for match in re.findall(pattern, page_html, flags=re.IGNORECASE):
            normalized = _normalize_candidate_url(match, base_url)
            if normalized and normalized not in candidates:
                candidates.append(normalized)

    return candidates



def _fetch_gallery_page(url: str) -> str:
    req = _build_request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
                raise DatasetRetrievalError(
                    ErrorCode.DATASET_INVALID,
                    "Dataset URL did not return a downloadable file or a supported public gallery page.",
                )
            raw_html = response.read()
            return raw_html.decode("utf-8", errors="ignore")
    except HTTPError as e:
        logger.error(f"HTTP error fetching gallery page {url}: {e.code} {e.reason}")
        if e.code in (401, 403):
            raise DatasetRetrievalError(
                ErrorCode.DATASET_UNREACHABLE,
                "The album or gallery link requires a password or login. Please ensure the link is publicly shared.",
            ) from e
        raise DatasetRetrievalError(
            ErrorCode.DATASET_UNREACHABLE,
            f"Could not access gallery link (HTTP {e.code}: {e.reason}).",
        ) from e
    except (URLError, TimeoutError) as e:
        logger.error(f"Connection error fetching gallery page {url}: {e}")
        raise DatasetRetrievalError(
            ErrorCode.DATASET_TIMEOUT,
            "Timed out while connecting to the dataset host. Please check your internet or album URL.",
        ) from e



def _extension_from_content_type(content_type: str, fallback_url: str) -> str:
    normalized = (content_type or "").split(";")[0].strip().lower()
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
    }
    extension = mapping.get(normalized)
    if extension:
        return extension

    suffix = Path(urlparse(fallback_url).path).suffix.lower()
    if suffix in SUPPORTED_IMAGE_EXTENSIONS:
        return suffix
    return ".jpg"


def _cleanup_path(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
    else:
        path.unlink(missing_ok=True)


def _safe_extract_zip(
    zip_path: Path,
    destination: Path,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> None:
    destination_root = destination.resolve()

    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.infolist()
        if len(members) > MAX_ARCHIVE_FILE_COUNT:
            raise DatasetRetrievalError(
                ErrorCode.DATASET_INVALID,
                "Dataset archive contains too many files.",
            )

        total_uncompressed_size = 0
        for member in members:
            member_name = member.filename
            if not member_name:
                continue

            member_path = destination / member_name
            resolved = member_path.resolve()
            if destination_root not in resolved.parents and resolved != destination_root:
                raise DatasetRetrievalError(
                    ErrorCode.DATASET_UNSAFE_ARCHIVE,
                    "Dataset archive contains unsafe file paths.",
                )

            if member.is_dir():
                continue

            if member.file_size > MAX_ARCHIVE_MEMBER_SIZE_MB * 1024 * 1024:
                raise DatasetRetrievalError(
                    ErrorCode.DATASET_TOO_LARGE,
                    "A file inside the dataset archive is too large.",
                )

            total_uncompressed_size += member.file_size
            if total_uncompressed_size > MAX_ARCHIVE_TOTAL_SIZE_MB * 1024 * 1024:
                raise DatasetRetrievalError(
                    ErrorCode.DATASET_TOO_LARGE,
                    "The extracted dataset would exceed the allowed size limit.",
                )

            if member.external_attr >> 16:
                file_mode = member.external_attr >> 16
                if file_mode & 0o170000 == 0o120000:
                    raise DatasetRetrievalError(
                        ErrorCode.DATASET_UNSAFE_ARCHIVE,
                        "Dataset archive contains unsupported symbolic links.",
                    )

        extracted_files = 0
        total_files = len([member for member in members if member.filename and not member.is_dir()])
        if progress_callback:
            progress_callback(
                {
                    "stage": "dataset_extraction",
                    "progress_percent": 22,
                    "dataset_files_extracted": 0,
                    "dataset_total_files": total_files,
                    "stage_message": "Extracting dataset archive.",
                }
            )

        for member in members:
            zf.extract(member, destination)
            if member.filename and not member.is_dir():
                extracted_files += 1
                if progress_callback and total_files > 0:
                    progress_callback(
                        {
                            "stage": "dataset_extraction",
                            "progress_percent": min(28, 22 + int((extracted_files / total_files) * 6)),
                            "dataset_files_extracted": extracted_files,
                            "dataset_total_files": total_files,
                            "stage_message": f"Extracted {extracted_files} of {total_files} dataset files.",
                        }
                    )


def _download_to_path(
    resolved_url: str,
    destination: Path,
    progress_callback: Optional[Callable[[dict], None]] = None,
    referer: Optional[str] = None,
) -> tuple[int, Optional[int], str]:
    req = _build_request(resolved_url, method="GET", referer=referer)
    with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        content_length_header = response.headers.get("Content-Length")
        total_bytes = int(content_length_header) if content_length_header and content_length_header.isdigit() else None

        downloaded_bytes = 0
        with destination.open("wb") as handle:
            while True:
                chunk = response.read(DOWNLOAD_CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                downloaded_bytes += len(chunk)
                if downloaded_bytes > MAX_DATASET_SIZE_MB * 1024 * 1024:
                    raise DatasetRetrievalError(
                        ErrorCode.DATASET_TOO_LARGE,
                        f"Dataset exceeds maximum allowed size of {MAX_DATASET_SIZE_MB}MB.",
                    )
                handle.write(chunk)

                if progress_callback:
                    progress_percent = 10
                    if total_bytes and total_bytes > 0:
                        progress_percent = min(20, 10 + int((downloaded_bytes / total_bytes) * 10))
                    progress_callback(
                        {
                            "stage": "dataset_download",
                            "progress_percent": progress_percent,
                            "dataset_downloaded_bytes": downloaded_bytes,
                            "dataset_total_bytes": total_bytes,
                            "stage_message": (
                                f"Downloaded {downloaded_bytes} bytes"
                                if not total_bytes
                                else f"Downloaded {downloaded_bytes} of {total_bytes} bytes."
                            ),
                        }
                    )

        return downloaded_bytes, total_bytes, content_type


def _download_gallery_dataset(
    page_url: str,
    staging_dir: Path,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> None:
    provider_name = _provider_label(page_url)
    page_html = _fetch_gallery_page(page_url)
    image_urls = _extract_gallery_image_urls(page_html, page_url)

    if not image_urls:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_EMPTY,
            f"No downloadable images were discovered in the public {provider_name} gallery.",
        )
    if len(image_urls) > MAX_GALLERY_IMAGE_COUNT:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_TOO_LARGE,
            f"The public {provider_name} gallery exposes too many images to process safely in one run.",
        )

    total_images = len(image_urls)
    if progress_callback:
        progress_callback(
            {
                "stage": "dataset_extraction",
                "progress_percent": 22,
                "dataset_files_extracted": 0,
                "dataset_total_files": total_images,
                "stage_message": f"Found {total_images} image candidates in the {provider_name} gallery.",
            }
        )

    aggregate_downloaded_bytes = 0
    prepared_images = 0
    for index, image_url in enumerate(image_urls, start=1):
        temp_path = staging_dir / f"provider-image-{index:04d}.part"
        try:
            downloaded_bytes, _, content_type = _download_to_path(
                image_url,
                temp_path,
                progress_callback=None,
                referer=page_url,
            )
            if "image/" not in content_type and "application/octet-stream" not in content_type:
                temp_path.unlink(missing_ok=True)
                continue

            extension = _extension_from_content_type(content_type, image_url)
            final_path = staging_dir / f"provider-image-{index:04d}{extension}"
            if final_path.exists():
                final_path.unlink()
            temp_path.replace(final_path)
            aggregate_downloaded_bytes += downloaded_bytes
            prepared_images += 1

            if progress_callback:
                progress_callback(
                    {
                        "stage": "dataset_extraction",
                        "progress_percent": min(28, 22 + int((index / total_images) * 6)),
                        "dataset_downloaded_bytes": aggregate_downloaded_bytes,
                        "dataset_files_extracted": prepared_images,
                        "dataset_total_files": total_images,
                        "stage_message": f"Prepared {prepared_images} of {total_images} gallery images for scanning.",
                    }
                )
        finally:
            temp_path.unlink(missing_ok=True)


def download_dataset(
    url: str,
    session_id: str,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> str:
    """
    Download a dataset into a session-specific staging folder.
    ZIP archives are extracted atomically; direct image URLs are staged then moved into place.
    """
    session_root = TEMP_DIR / session_id
    dataset_dir = session_root / "dataset"
    staging_dir = session_root / "dataset_staging"
    downloads_dir = session_root / "downloads"

    _cleanup_path(dataset_dir)
    _cleanup_path(staging_dir)
    downloads_dir.mkdir(parents=True, exist_ok=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    resolved_url, source_kind = _resolve_url(url)
    _validate_remote_url(resolved_url)
    parsed = urlparse(resolved_url)
    filename = Path(parsed.path).name or f"dataset_{uuid.uuid4().hex[:8]}"

    final_download_path = downloads_dir / filename
    partial_download_path = downloads_dir / f"{filename}.part"
    logger.info("Downloading dataset from: %s", resolved_url)

    try:
        if source_kind == "direct_file":
            req = _build_request(resolved_url, method="HEAD")
            with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > MAX_DATASET_SIZE_MB * 1024 * 1024:
                    raise DatasetRetrievalError(
                        ErrorCode.DATASET_TOO_LARGE,
                        f"Dataset exceeds maximum allowed size of {MAX_DATASET_SIZE_MB}MB.",
                    )
    except DatasetRetrievalError:
        raise
    except Exception as exc:
        logger.warning("HEAD request failed (proceeding anyway): %s", exc)

    try:
        if progress_callback:
            progress_callback(
                {
                    "stage": "dataset_download",
                    "progress_percent": 10,
                    "dataset_downloaded_bytes": 0,
                    "dataset_total_bytes": None,
                    "stage_message": "Starting dataset download.",
                }
            )

        if source_kind == "gallery_page":
            _download_gallery_dataset(
                resolved_url,
                staging_dir,
                progress_callback=progress_callback,
            )
        else:
            downloaded_bytes, total_bytes, content_type = _download_to_path(
                resolved_url,
                partial_download_path,
                progress_callback=progress_callback,
            )
            partial_download_path.replace(final_download_path)
            logger.info("Downloaded to: %s", final_download_path)

            if total_bytes is not None and downloaded_bytes != total_bytes:
                raise DatasetRetrievalError(
                    ErrorCode.DATASET_UNREACHABLE,
                    "Dataset download was incomplete.",
                    retryable=True,
                )

            if zipfile.is_zipfile(final_download_path):
                logger.info("Detected ZIP archive, extracting...")
                _safe_extract_zip(final_download_path, staging_dir, progress_callback=progress_callback)
                final_download_path.unlink(missing_ok=True)
            else:
                extension = final_download_path.suffix.lower()
                if extension not in SUPPORTED_IMAGE_EXTENSIONS:
                    raise DatasetRetrievalError(
                        ErrorCode.DATASET_INVALID,
                        f"Unsupported file type: '{extension}'. Please provide a ZIP archive, direct image URL, or supported public gallery link.",
                    )
                if content_type and "image/" not in content_type and "application/octet-stream" not in content_type:
                    raise DatasetRetrievalError(
                        ErrorCode.DATASET_INVALID,
                        "Dataset response did not look like a supported image download.",
                    )
                shutil.move(str(final_download_path), str(staging_dir / final_download_path.name))
                if progress_callback:
                    progress_callback(
                        {
                            "stage": "dataset_extraction",
                            "progress_percent": 28,
                            "dataset_files_extracted": 1,
                            "dataset_total_files": 1,
                            "stage_message": "Prepared the downloaded image for scanning.",
                        }
                    )

        image_count = _count_supported_images(staging_dir)
        if image_count == 0:
            raise DatasetRetrievalError(
                ErrorCode.DATASET_EMPTY,
                "No supported images were found in the dataset.",
            )

        if dataset_dir.exists():
            shutil.rmtree(dataset_dir, ignore_errors=True)
        staging_dir.replace(dataset_dir)
        _cleanup_path(downloads_dir)
        logger.info("Prepared dataset for session %s at %s", session_id, dataset_dir)
        return str(dataset_dir)
    except HTTPError as exc:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_UNREACHABLE,
            f"Dataset could not be downloaded (HTTP {exc.code}).",
            retryable=exc.code >= 500,
        ) from exc
    except URLError as exc:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_UNREACHABLE,
            "Dataset could not be reached from the provided URL.",
            retryable=True,
        ) from exc
    except DatasetRetrievalError:
        raise
    except Exception as exc:
        raise DatasetRetrievalError(
            ErrorCode.DATASET_UNREACHABLE,
            "Dataset download failed unexpectedly.",
            retryable=True,
        ) from exc
    finally:
        _cleanup_path(partial_download_path)
        _cleanup_path(final_download_path)
        _cleanup_path(staging_dir)
        if downloads_dir.exists() and not any(downloads_dir.iterdir()):
            downloads_dir.rmdir()


def get_session_temp_dir(session_id: str) -> Path:
    return TEMP_DIR / session_id


def cleanup_processing_artifacts(session_id: str) -> None:
    session_path = get_session_temp_dir(session_id)
    for child_name in ("dataset", "dataset_staging", "downloads"):
        _cleanup_path(session_path / child_name)
    logger.info("Cleaned up processing artifacts for session: %s", session_id)


def cleanup_session_files(session_id: str) -> None:
    session_path = TEMP_DIR / session_id
    if session_path.exists():
        shutil.rmtree(session_path, ignore_errors=True)
        logger.info("Cleaned up temp files for session: %s", session_id)
