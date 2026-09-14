"""Face recognition pipeline and scan progress reporting."""

import logging
import os
import time
from pathlib import Path
from typing import Callable, Optional, Tuple
import numpy as np

# Ensure TensorFlow/Keras compatibility for DeepFace
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from app.models.schemas import ErrorCode

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports – heavy ML libraries are only loaded when first needed so
# the FastAPI app starts quickly even on cold boot.
# ---------------------------------------------------------------------------

_deepface = None
_cv2 = None


class FaceRecognitionError(Exception):
    def __init__(self, code: ErrorCode, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


def _get_deepface():
    global _deepface
    if _deepface is None:
        try:
            from deepface import DeepFace
            _deepface = DeepFace
            logger.info("DeepFace loaded successfully.")
        except ImportError:
            raise RuntimeError(
                "DeepFace is not installed. Run: pip install deepface"
            )
    return _deepface


def _get_cv2():
    global _cv2
    if _cv2 is None:
        import cv2
        _cv2 = cv2
    return _cv2


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def preprocess_image(image_path: str) -> Optional[np.ndarray]:
    """
    Load and preprocess an image for face recognition.
    Steps: load → resize (if needed) → normalize → return array.
    Returns None if the image cannot be loaded.
    """
    cv2 = _get_cv2()
    img = cv2.imread(image_path)
    if img is None:
        logger.warning(f"Could not load image: {image_path}")
        return None

    # Resize very large images to cap processing time
    max_dim = 1920
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    return img


def _enhance_image_for_detection(image: np.ndarray) -> np.ndarray:
    cv2 = _get_cv2()
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)
    merged = cv2.merge((enhanced_l, a_channel, b_channel))
    enhanced = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    blurred = cv2.GaussianBlur(enhanced, (0, 0), sigmaX=1.2)
    return cv2.addWeighted(enhanced, 1.35, blurred, -0.35, 0)


def _generate_detection_variants(image_path: str) -> list[tuple[str, np.ndarray]]:
    cv2 = _get_cv2()
    image = preprocess_image(image_path)
    if image is None:
        return []

    variants = [
        ("original", image),
        ("rot90", cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)),
        ("rot180", cv2.rotate(image, cv2.ROTATE_180)),
        ("rot270", cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)),
    ]
    variants.append(("enhanced", _enhance_image_for_detection(image)))
    return variants


def _represent_variant(image: np.ndarray, model_name: str, fast_mode: bool = False):
    DeepFace = _get_deepface()
    # In fast mode (dataset photos), use high-throughput OpenCV/SSD detectors
    detectors = ["opencv", "ssd"] if fast_mode else ["ssd", "opencv", "mtcnn"]
    last_err = None
    for detector in detectors:
        try:
            return DeepFace.represent(
                img_path=image,
                model_name=model_name,
                enforce_detection=True,
                detector_backend=detector,
            )
        except Exception as err:
            last_err = err
            continue
    if last_err:
        raise last_err


def detect_blur(image_path: str) -> dict:
    """
    Detect blur level in an image using Laplacian variance.
    Returns a dict with blur_score, is_blurry flag, and description.
    Higher variance = sharper image. Lower variance = blurrier image.
    """
    cv2 = _get_cv2()
    img = cv2.imread(image_path)
    if img is None:
        return {"blur_score": 0.0, "is_blurry": True, "description": "Could not load image for blur check."}

    # Convert to grayscale and compute Laplacian variance
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Thresholds tuned for face photos (frontal, ~640px+ faces)
    # Very sharp: > 400, Acceptable: 150-500, Blurry: 50-150, Very blurry: < 50
    if lap_var >= 400:
        description = "Sharp and clear."
        is_blurry = False
    elif lap_var >= 150:
        description = "Moderately sharp."
        is_blurry = False
    elif lap_var >= 50:
        description = "Somewhat blurry."
        is_blurry = True
    else:
        description = "Very blurry."
        is_blurry = True

    return {
        "blur_score": round(lap_var, 2),
        "is_blurry": is_blurry,
        "description": description,
    }


def extract_embedding(image_path: str, model_name: str = "ArcFace") -> Optional[np.ndarray]:
    """
    Detect face and extract facial embedding from a reference image.
    Supports single faces, and in multi-face reference photos (e.g. speaking at events),
    automatically selects the dominant foreground subject if clearly prominent.
    Returns a 1-D numpy array (embedding vector) or None if no face found.
    """
    variants = _generate_detection_variants(image_path)
    if not variants:
        return None

    last_error = None
    for variant_name, variant in variants:
        try:
            embedding_objs = _represent_variant(variant, model_name)
            if embedding_objs:
                if len(embedding_objs) > 1:
                    # Sort detected faces by bounding box area (w * h)
                    embedding_objs.sort(
                        key=lambda x: x["facial_area"]["w"] * x["facial_area"]["h"],
                        reverse=True,
                    )
                    a0 = embedding_objs[0]["facial_area"]["w"] * embedding_objs[0]["facial_area"]["h"]
                    a1 = embedding_objs[1]["facial_area"]["w"] * embedding_objs[1]["facial_area"]["h"]
                    total_a = sum(obj["facial_area"]["w"] * obj["facial_area"]["h"] for obj in embedding_objs)

                    # If the largest face is clearly the dominant foreground subject
                    # (at least 1.8x larger than background faces or > 55% of total face area), select it!
                    if (a0 >= 1.8 * a1) or (a0 / max(total_a, 1) >= 0.55):
                        logger.info(
                            "Dominant foreground face selected from reference image (area ratio: %.1fx vs secondary).",
                            a0 / max(a1, 1),
                        )
                        embedding = np.array(embedding_objs[0]["embedding"], dtype=np.float32)
                        return embedding

                    raise FaceRecognitionError(
                        ErrorCode.TOO_MANY_FACES,
                        "Multiple equally prominent faces were detected in the reference image. Please upload a photo with only yourself or crop it to focus on your face.",
                    )

                embedding = np.array(embedding_objs[0]["embedding"], dtype=np.float32)
                logger.info(
                    "Embedding extracted from reference image (%s variant, %s-D).",
                    variant_name,
                    len(embedding),
                )
                return embedding
        except FaceRecognitionError:
            raise
        except Exception as exc:
            last_error = exc
            logger.debug("Reference detection failed for %s variant %s: %s", image_path, variant_name, exc)

    if last_error:
        logger.error("Embedding extraction failed for %s: %s", image_path, last_error)
    return None


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine similarity ∈ [0, 1]. Higher = more similar."""
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    if norm == 0:
        return 0.0
    return float(dot / norm)


def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Return L2 distance. Lower = more similar."""
    return float(np.linalg.norm(a - b))


def classify_confidence(similarity_score: float) -> tuple[int, str, str]:
    confidence_percent = max(0, min(100, round(similarity_score * 100)))
    if confidence_percent >= 90:
        return (
            confidence_percent,
            "very_high",
            "Very strong facial similarity with a top-ranked embedding match.",
        )
    if confidence_percent >= 80:
        return (
            confidence_percent,
            "high",
            "High facial similarity that comfortably exceeds the match threshold.",
        )
    if confidence_percent >= 65:
        return (
            confidence_percent,
            "medium",
            "Moderate facial similarity. Review visually before relying on this match.",
        )
    return (
        confidence_percent,
        "low",
        "Lower-confidence match that passed the configured threshold but needs manual review.",
    )


def match_face_in_image(
    dataset_image_path: str,
    reference_embedding: np.ndarray,
    model_name: str = "ArcFace",
    distance_threshold: float = 0.4,
) -> Tuple[bool, float, float, int, dict]:
    """
    Try to match the reference face in a dataset image.
    Evaluates the original orientation first for 5x faster throughput.
    Returns:
        (is_match: bool, similarity_score: float, distance: float, face_count: int, blur_info: dict)
    """
    best_similarity = 0.0
    best_distance = float("inf")
    face_count = 0

    image = preprocess_image(dataset_image_path)
    if image is None:
        blur_info = detect_blur(dataset_image_path)
        return False, 0.0, float("inf"), 0, blur_info

    # Fast evaluation on natural orientation with OpenCV/SSD detectors
    try:
        embedding_objs = _represent_variant(image, model_name, fast_mode=True)
        if embedding_objs:
            face_count = len(embedding_objs)
            for obj in embedding_objs:
                candidate = np.array(obj["embedding"], dtype=np.float32)
                sim = cosine_similarity(reference_embedding, candidate)
                cos_dist = max(0.0, 1.0 - sim)
                if cos_dist < best_distance:
                    best_distance = cos_dist
                    best_similarity = sim
    except Exception as exc:
        logger.debug("Fast scan skipped %s (no face detected): %s", dataset_image_path, exc)

    blur_info = detect_blur(dataset_image_path)
    is_match = best_distance <= distance_threshold
    return is_match, round(best_similarity, 4), round(best_distance, 4), face_count, blur_info


def scan_dataset(
    reference_image_path: str,
    dataset_folder: str,
    model_name: str = "ArcFace",
    distance_threshold: float = 0.4,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> dict:
    """
    Scan all images in dataset_folder and return matches.

    Returns a dict with matched images, blur info, and scan statistics.
    """
    start_time = time.time()

    # Step 1: Extract reference embedding
    if progress_callback:
        progress_callback(
            {
                "stage": "reference_analysis",
                "progress_percent": 30,
                "stage_message": "Loading Neural Engine & extracting 512-D face biometric vector...",
            }
        )

    reference_embedding = extract_embedding(reference_image_path, model_name)
    if reference_embedding is None:
        raise FaceRecognitionError(
            ErrorCode.NO_FACE_IN_REFERENCE,
            "No face detected in the reference image. Please upload a clear, front-facing photo.",
        )

    # Check reference blur
    ref_blur = detect_blur(reference_image_path)
    logger.info(
        "Reference blur score: %.2f (%s)",
        ref_blur["blur_score"],
        ref_blur["description"],
    )

    # Step 2: Collect dataset images
    supported_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
    dataset_paths = [
        str(p)
        for p in Path(dataset_folder).rglob("*")
        if p.suffix.lower() in supported_exts
    ]

    if not dataset_paths:
        raise FaceRecognitionError(
            ErrorCode.DATASET_EMPTY,
            "No supported images found in the dataset folder.",
        )

    if progress_callback:
        progress_callback(
            {
                "stage": "dataset_scan",
                "progress_percent": 40,
                "stage_message": f"Scanning {len(dataset_paths)} dataset images for face matches.",
                "total_images_discovered": len(dataset_paths),
                "total_images_scanned": 0,
            }
        )

    logger.info(f"Scanning {len(dataset_paths)} images with model={model_name}, threshold={distance_threshold}")

    matched = []
    images_with_detected_faces = 0
    images_without_detected_faces = 0
    images_with_multiple_faces = 0
    blurry_matches = 0
    total_paths = len(dataset_paths)
    for index, img_path in enumerate(dataset_paths, start=1):
        is_match, similarity, distance, face_count, blur_info = match_face_in_image(
            img_path, reference_embedding, model_name, distance_threshold
        )
        if face_count > 0:
            images_with_detected_faces += 1
        else:
            images_without_detected_faces += 1
        if face_count > 1:
            images_with_multiple_faces += 1

        if is_match:
            confidence_percent, confidence_label, match_reason = classify_confidence(similarity)
            if blur_info["is_blurry"]:
                blurry_matches += 1
                match_reason += f" Note: this image appears blurry ({blur_info['description']})."
            matched.append({
                "filename": Path(img_path).name,
                "path": img_path,
                "similarity_score": similarity,
                "distance": distance,
                "face_count": face_count,
                "confidence_percent": confidence_percent,
                "confidence_label": confidence_label,
                "match_reason": match_reason,
                "source_group": Path(img_path).parent.name or "root",
                "blur_score": blur_info["blur_score"],
                "is_blurry": blur_info["is_blurry"],
                "blur_description": blur_info["description"],
            })
            logger.info(f"MATCH: {Path(img_path).name} (sim={similarity}, dist={distance}, blur={blur_info['blur_score']})")

        if progress_callback:
            progress_callback(
                {
                    "stage": "dataset_scan",
                    "total_images_discovered": total_paths,
                    "total_images_scanned": index,
                    "current_image": Path(img_path).name,
                    "matched_count": len(matched),
                    "matched_items": list(matched),
                    "stage_message": f"Scanning image {index} of {total_paths}. (Found {len(matched)} matches so far)",
                    "progress_percent": min(95, 40 + int((index / total_paths) * 55)),
                }
            )

    # Sort by similarity score descending
    matched.sort(key=lambda x: x["similarity_score"], reverse=True)

    elapsed = round(time.time() - start_time, 2)
    logger.info(
        f"Scan complete: {len(matched)}/{len(dataset_paths)} matches in {elapsed}s"
    )

    return {
        "matched": matched,
        "total_scanned": len(dataset_paths),
        "total_discovered": len(dataset_paths),
        "images_with_detected_faces": images_with_detected_faces,
        "images_without_detected_faces": images_without_detected_faces,
        "images_with_multiple_faces": images_with_multiple_faces,
        "blurry_matches": blurry_matches,
        "reference_blur": ref_blur,
        "average_match_confidence": round(
            sum(item["similarity_score"] for item in matched) / len(matched),
            4,
        ) if matched else None,
        "top_match_confidence": matched[0]["similarity_score"] if matched else None,
        "processing_time": elapsed,
    }
