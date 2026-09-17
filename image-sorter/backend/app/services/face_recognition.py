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
    # In fast mode: start with opencv & ssd for 10ms throughput; gracefully fall back to mtcnn for sunglasses/occlusions
    detectors = ["opencv", "ssd", "mtcnn"] if fast_mode else ["mtcnn", "ssd", "opencv"]
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


def detect_reference_faces(image_path: str) -> list[dict]:
    """
    Detect all faces in a reference image and return bounding boxes and base64 thumbnails.
    Enables user disambiguation when multiple people appear in the reference photo.
    """
    import base64
    DeepFace = _get_deepface()
    cv2 = _get_cv2()
    img = cv2.imread(image_path)
    if img is None:
        return []

    h_img, w_img = img.shape[:2]

    # MTCNN provides reliable landmark alignment even through sunglasses and varied lighting
    faces = []
    for detector in ["mtcnn", "ssd", "opencv"]:
        try:
            extracted = DeepFace.extract_faces(
                img_path=img,
                detector_backend=detector,
                enforce_detection=True,
            )
            if extracted:
                faces = extracted
                break
        except Exception:
            continue

    results = []
    for idx, face_obj in enumerate(faces):
        area = face_obj.get("facial_area", {})
        x = max(0, area.get("x", 0))
        y = max(0, area.get("y", 0))
        w = area.get("w", 0)
        h = area.get("h", 0)

        # Pad bounding box by 25% for a nice portrait avatar
        pad_x = int(w * 0.25)
        pad_y = int(h * 0.25)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w_img, x + w + pad_x)
        y2 = min(h_img, y + h + pad_y)

        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        thumb = cv2.resize(crop, (160, 160), interpolation=cv2.INTER_AREA)
        _, buf = cv2.imencode(".jpg", thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        b64_thumb = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

        results.append({
            "face_index": idx,
            "confidence": round(float(face_obj.get("confidence", 1.0)), 3),
            "bounding_box": {"x": x, "y": y, "w": w, "h": h},
            "thumbnail_base64": b64_thumb,
        })

    # Sort left-to-right based on x position for intuitive visual ordering
    results.sort(key=lambda item: item["bounding_box"]["x"])
    for idx, item in enumerate(results):
        item["face_index"] = idx

    return results


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


def extract_embedding(
    image_path: str,
    model_name: str = "ArcFace",
    target_face_index: Optional[int] = None,
) -> Optional[np.ndarray]:
    """
    Detect face and extract facial embedding from a reference image.
    Supports single faces, and in multi-face reference photos, extracts embedding
    specifically for the user-selected target_face_index.
    """
    DeepFace = _get_deepface()
    cv2 = _get_cv2()

    # If target_face_index was chosen, extract that specific face crop
    if target_face_index is not None:
        try:
            faces = detect_reference_faces(image_path)
            if faces and 0 <= target_face_index < len(faces):
                target = faces[target_face_index]
                box = target["bounding_box"]
                img = cv2.imread(image_path)
                if img is not None:
                    h_img, w_img = img.shape[:2]
                    pad_x = int(box["w"] * 0.25)
                    pad_y = int(box["h"] * 0.25)
                    x1 = max(0, box["x"] - pad_x)
                    y1 = max(0, box["y"] - pad_y)
                    x2 = min(w_img, box["x"] + box["w"] + pad_x)
                    y2 = min(h_img, box["y"] + box["h"] + pad_y)
                    face_crop = img[y1:y2, x1:x2]
                    if face_crop.size > 0:
                        reps = DeepFace.represent(
                            img_path=face_crop,
                            model_name=model_name,
                            enforce_detection=False,
                        )
                        if reps:
                            logger.info(
                                "Extracted embedding for targeted face %d (%s-D)",
                                target_face_index,
                                len(reps[0]["embedding"]),
                            )
                            return np.array(reps[0]["embedding"], dtype=np.float32)
        except Exception as exc:
            logger.warning("Targeted face extraction failed: %s. Falling back to dominant face.", exc)

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
                    logger.info(
                        "Multiple faces detected in reference (%d). Auto-selecting primary face.",
                        len(embedding_objs),
                    )
                    embedding = np.array(embedding_objs[0]["embedding"], dtype=np.float32)
                    return embedding

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
    distance_threshold: float = 0.45,
    candidate_threshold: float = 0.65,
) -> Tuple[bool, bool, float, float, int, dict]:
    """
    Try to match the reference face in a dataset image.
    Evaluates original orientation first for 5x faster throughput with OpenCV/SSD,
    falling back to MTCNN on occlusions or challenging angles.
    Returns:
        (is_match: bool, is_candidate: bool, similarity_score: float, distance: float, face_count: int, blur_info: dict)
    """
    best_similarity = 0.0
    best_distance = float("inf")
    face_count = 0

    image = preprocess_image(dataset_image_path)
    if image is None:
        blur_info = detect_blur(dataset_image_path)
        return False, False, 0.0, float("inf"), 0, blur_info

    # Fast evaluation on natural orientation with OpenCV/SSD + MTCNN fallback
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
    is_candidate = (not is_match) and (best_distance <= candidate_threshold)
    return (
        is_match,
        is_candidate,
        round(best_similarity, 4),
        round(best_distance, 4),
        face_count,
        blur_info,
    )


def scan_dataset(
    reference_image_path: str,
    dataset_folder: str,
    model_name: str = "ArcFace",
    distance_threshold: float = 0.45,
    selected_face_index: Optional[int] = None,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> dict:
    """
    Scan all images in dataset_folder and return confirmed matches and review candidates.
    Supports selected_face_index for multi-face disambiguation.
    """
    start_time = time.time()

    # Step 1: Extract reference embedding (using selected face if specified)
    if progress_callback:
        progress_callback(
            {
                "stage": "reference_analysis",
                "progress_percent": 30,
                "stage_message": "Extracting 512-D cranial and facial biometric landmarks...",
            }
        )

    reference_embedding = extract_embedding(
        reference_image_path,
        model_name,
        target_face_index=selected_face_index,
    )
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

    logger.info(
        "Scanning %d images with model=%s, threshold=%.2f, selected_face=%s",
        len(dataset_paths),
        model_name,
        distance_threshold,
        selected_face_index,
    )

    matched = []
    candidates = []
    images_with_detected_faces = 0
    images_without_detected_faces = 0
    images_with_multiple_faces = 0
    blurry_matches = 0
    total_paths = len(dataset_paths)
    candidate_threshold = max(distance_threshold + 0.20, 0.65)

    for index, img_path in enumerate(dataset_paths, start=1):
        is_match, is_candidate, similarity, distance, face_count, blur_info = match_face_in_image(
            img_path,
            reference_embedding,
            model_name,
            distance_threshold=distance_threshold,
            candidate_threshold=candidate_threshold,
        )
        if face_count > 0:
            images_with_detected_faces += 1
        else:
            images_without_detected_faces += 1
        if face_count > 1:
            images_with_multiple_faces += 1

        if is_match or is_candidate:
            confidence_percent, confidence_label, match_reason = classify_confidence(similarity)
            tier = "confirmed" if is_match else "candidate"
            if is_candidate:
                confidence_label = "potential_match"
                match_reason = "Potential facial match with moderate similarity. Review visually to confirm."

            if blur_info["is_blurry"]:
                blurry_matches += 1
                match_reason += f" Note: this image appears blurry ({blur_info['description']})."

            item_dict = {
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
                "match_tier": tier,
            }

            if is_match:
                matched.append(item_dict)
                logger.info(f"MATCH: {Path(img_path).name} (sim={similarity}, dist={distance})")
            else:
                candidates.append(item_dict)
                logger.info(f"CANDIDATE: {Path(img_path).name} (sim={similarity}, dist={distance})")

        if progress_callback:
            progress_callback(
                {
                    "stage": "dataset_scan",
                    "total_images_discovered": total_paths,
                    "total_images_scanned": index,
                    "current_image": Path(img_path).name,
                    "matched_count": len(matched),
                    "candidate_count": len(candidates),
                    "matched_items": list(matched),
                    "candidate_items": list(candidates),
                    "stage_message": f"Scanning image {index} of {total_paths}. (Found {len(matched)} verified, {len(candidates)} candidates)",
                    "progress_percent": min(95, 40 + int((index / total_paths) * 55)),
                }
            )

    # Sort by similarity score descending
    matched.sort(key=lambda x: x["similarity_score"], reverse=True)
    candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

    elapsed = round(time.time() - start_time, 2)
    all_found = matched + candidates
    logger.info(
        f"Scan complete: {len(matched)} verified, {len(candidates)} candidates out of {len(dataset_paths)} images in {elapsed}s"
    )

    return {
        "matched": matched,
        "candidates": candidates,
        "total_scanned": len(dataset_paths),
        "total_discovered": len(dataset_paths),
        "images_with_detected_faces": images_with_detected_faces,
        "images_without_detected_faces": images_without_detected_faces,
        "images_with_multiple_faces": images_with_multiple_faces,
        "blurry_matches": blurry_matches,
        "reference_blur": ref_blur,
        "average_match_confidence": round(
            sum(item["similarity_score"] for item in all_found) / len(all_found),
            4,
        ) if all_found else None,
        "top_match_confidence": all_found[0]["similarity_score"] if all_found else None,
        "processing_time": elapsed,
    }
