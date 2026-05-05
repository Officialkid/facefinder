"""Dataset ingestion adapters for public dataset links.

Supported providers:
- Direct image URLs
- ZIP URLs
- Google Drive file URLs
- Google Drive folder URLs (public)
- Pixieset pages (public)
- Generic public HTML pages with image links
"""

from __future__ import annotations

import os
import re
import uuid
import zipfile
from typing import Callable, Dict, List, Optional, Set, Tuple, Union
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from werkzeug.utils import secure_filename

REQUEST_TIMEOUT = 25
DEFAULT_MAX_IMAGES = 300

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}


def _download_to_file(url: str, target_path: str) -> None:
    with requests.get(url, stream=True, timeout=REQUEST_TIMEOUT, headers=DEFAULT_HEADERS) as response:
        response.raise_for_status()
        with open(target_path, "wb") as handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    handle.write(chunk)


def _download_single_image(url: str, output_dir: str) -> str:
    ext = os.path.splitext(urlparse(url).path)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    out_path = os.path.join(output_dir, f"{uuid.uuid4()}{ext}")
    _download_to_file(url, out_path)
    return out_path


def _download_single_image_with_source(url: str, output_dir: str) -> Tuple[str, str]:
    return _download_single_image(url, output_dir), url


def _extract_images_from_zip(zip_path: str, output_dir: str, allowed_file: Callable[[str], bool], max_images: int) -> List[str]:
    extracted: List[str] = []
    with zipfile.ZipFile(zip_path, "r") as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            name = os.path.basename(member.filename)
            if not name or not allowed_file(name):
                continue

            safe_name = secure_filename(name)
            out_path = os.path.join(output_dir, f"{uuid.uuid4()}_{safe_name}")
            with archive.open(member) as src, open(out_path, "wb") as dst:
                dst.write(src.read())
            extracted.append(out_path)
            if len(extracted) >= max_images:
                break
    return extracted


def _is_image_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return path.endswith(".jpg") or path.endswith(".jpeg") or path.endswith(".png") or path.endswith(".webp")


def _google_drive_file_to_direct(url: str) -> Optional[str]:
    parsed = urlparse(url)
    if "drive.google.com" not in parsed.netloc:
        return None

    if "/file/d/" in parsed.path:
        match = re.search(r"/file/d/([^/]+)", parsed.path)
        if match:
            return f"https://drive.google.com/uc?export=download&id={match.group(1)}"

    query_id = parse_qs(parsed.query).get("id", [None])[0]
    if query_id:
        return f"https://drive.google.com/uc?export=download&id={query_id}"

    return None


def _google_drive_folder_id(url: str) -> Optional[str]:
    parsed = urlparse(url)
    if "drive.google.com" not in parsed.netloc:
        return None

    match = re.search(r"/folders/([a-zA-Z0-9_-]+)", parsed.path)
    if match:
        return match.group(1)

    query_id = parse_qs(parsed.query).get("id", [None])[0]
    return query_id


def _list_images_recursive(folder: str, allowed_file: Callable[[str], bool], max_images: int) -> List[str]:
    results: List[str] = []
    for root, _, files in os.walk(folder):
        for name in files:
            if allowed_file(name):
                results.append(os.path.join(root, name))
                if len(results) >= max_images:
                    return results
    return results


def _download_google_drive_folder(url: str, output_dir: str, allowed_file: Callable[[str], bool], max_images: int) -> List[str]:
    folder_id = _google_drive_folder_id(url)
    if not folder_id:
        return []

    try:
        import gdown  # type: ignore
    except Exception as exc:
        raise RuntimeError("Google Drive folder support requires installing gdown") from exc

    folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
    downloaded = gdown.download_folder(
        url=folder_url,
        output=output_dir,
        quiet=True,
        use_cookies=False,
        remaining_ok=True,
    )

    if not downloaded:
        return []

    return _list_images_recursive(output_dir, allowed_file=allowed_file, max_images=max_images)


def _extract_image_candidates_from_html(page_url: str, html: str) -> Set[str]:
    links: Set[str] = set()

    # Generic src/href scraping.
    for match in re.finditer(r"(?:src|href|data-src)=[\"']([^\"']+)[\"']", html, flags=re.IGNORECASE):
        links.add(urljoin(page_url, match.group(1).strip()))

    # srcset support.
    for match in re.finditer(r"srcset=[\"']([^\"']+)[\"']", html, flags=re.IGNORECASE):
        for part in match.group(1).split(","):
            candidate = part.strip().split(" ")[0]
            if candidate:
                links.add(urljoin(page_url, candidate))

    # JSON/script fallback for escaped image URLs.
    for match in re.finditer(r"https?:\\?/\\?/[^\"'\s]+(?:jpg|jpeg|png|webp)(?:\?[^\"'\s]*)?", html, flags=re.IGNORECASE):
        links.add(match.group(0).replace("\\/", "/"))

    # Plain URL fallback.
    for match in re.finditer(r"https?://[^\"'\s]+(?:jpg|jpeg|png|webp)(?:\?[^\"'\s]*)?", html, flags=re.IGNORECASE):
        links.add(match.group(0))

    return {u for u in links if u.startswith("http://") or u.startswith("https://")}


def _download_images_from_html_page(page_url: str, output_dir: str, max_images: int) -> List[str]:
    response = requests.get(page_url, timeout=REQUEST_TIMEOUT, headers=DEFAULT_HEADERS)
    response.raise_for_status()

    candidates = _extract_image_candidates_from_html(page_url, response.text)
    downloaded: List[str] = []

    for link in candidates:
        if len(downloaded) >= max_images:
            break
        if not _is_image_url(link):
            continue
        try:
            downloaded.append(_download_single_image(link, output_dir))
        except Exception:
            continue

    return downloaded


def _download_images_from_html_page_with_sources(page_url: str, output_dir: str, max_images: int) -> Tuple[List[str], Dict[str, str]]:
    response = requests.get(page_url, timeout=REQUEST_TIMEOUT, headers=DEFAULT_HEADERS)
    response.raise_for_status()

    candidates = _extract_image_candidates_from_html(page_url, response.text)
    downloaded: List[str] = []
    source_map: Dict[str, str] = {}

    for link in candidates:
        if len(downloaded) >= max_images:
            break
        if not _is_image_url(link):
            continue
        try:
            local_path = _download_single_image(link, output_dir)
            downloaded.append(local_path)
            source_map[local_path] = link
        except Exception:
            continue

    return downloaded, source_map


def ingest_dataset(
    dataset_url: str,
    output_dir: str,
    *,
    allowed_file: Callable[[str], bool],
    max_images: int = DEFAULT_MAX_IMAGES,
    include_source_map: bool = False,
) -> Union[List[str], Tuple[List[str], Dict[str, str]]]:
    """Download and extract dataset images from supported providers."""
    os.makedirs(output_dir, exist_ok=True)

    parsed = urlparse(dataset_url)
    if not parsed.scheme.startswith("http"):
        raise ValueError("Dataset URL must start with http:// or https://")

    source_map: Dict[str, str] = {}

    def _result(images: List[str]) -> Union[List[str], Tuple[List[str], Dict[str, str]]]:
        if include_source_map:
            return images, source_map
        return images

    # Google Drive folder adapter.
    if "drive.google.com" in parsed.netloc and "/folders/" in parsed.path:
        images = _download_google_drive_folder(dataset_url, output_dir, allowed_file=allowed_file, max_images=max_images)
        if images:
            return _result(images)

    # Google Drive file adapter.
    direct_drive_file = _google_drive_file_to_direct(dataset_url)
    if direct_drive_file:
        dataset_url = direct_drive_file
        parsed = urlparse(dataset_url)

    lower_path = parsed.path.lower()

    # ZIP adapter.
    if lower_path.endswith(".zip"):
        archive_path = os.path.join(output_dir, "dataset.zip")
        _download_to_file(dataset_url, archive_path)
        images = _extract_images_from_zip(archive_path, output_dir, allowed_file=allowed_file, max_images=max_images)
        if os.path.exists(archive_path):
            os.remove(archive_path)
        return _result(images)

    # Direct image adapter.
    if _is_image_url(dataset_url):
        image_path, source_url = _download_single_image_with_source(dataset_url, output_dir)
        source_map[image_path] = source_url
        return _result([image_path])

    # Pixieset adapter (page-based extraction).
    if "pixieset.com" in parsed.netloc:
        if include_source_map:
            images, page_sources = _download_images_from_html_page_with_sources(dataset_url, output_dir, max_images=max_images)
            source_map.update(page_sources)
            return _result(images)
        return _result(_download_images_from_html_page(dataset_url, output_dir, max_images=max_images))

    # Generic page adapter.
    if include_source_map:
        images, page_sources = _download_images_from_html_page_with_sources(dataset_url, output_dir, max_images=max_images)
        source_map.update(page_sources)
        return _result(images)
    return _result(_download_images_from_html_page(dataset_url, output_dir, max_images=max_images))
