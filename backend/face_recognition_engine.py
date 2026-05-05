"""
FaceFinder - Face Recognition Engine
Uses InsightFace when available and falls back to OpenCV-based matching.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np

try:
    from insightface.app import FaceAnalysis  # type: ignore
    HAS_INSIGHTFACE = True
except Exception:
    HAS_INSIGHTFACE = False
    FaceAnalysis = None  # type: ignore


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@dataclass
class FaceMatch:
    image_path: str
    confidence: float
    confidence_level: str
    face_location: Dict[str, int]
    embedding: Optional[np.ndarray] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "image_path": self.image_path,
            "confidence": float(self.confidence),
            "confidence_level": self.confidence_level,
            "face_location": self.face_location,
        }


class FaceRecognitionEngine:
    """Face matcher with optional InsightFace acceleration."""

    def __init__(
        self,
        model_name: str = "buffalo_l",
        det_size: Tuple[int, int] = (640, 640),
        use_gpu: bool = True,
    ):
        self.model_name = model_name
        self.det_size = det_size
        self.use_insightface = False

        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        if HAS_INSIGHTFACE:
            try:
                providers = ["CPUExecutionProvider"]
                if use_gpu:
                    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

                self.app = FaceAnalysis(name=model_name, providers=providers)
                self.app.prepare(ctx_id=0 if use_gpu else -1, det_size=det_size)
                self.use_insightface = True
                logger.info("Using InsightFace backend")
            except Exception as exc:
                logger.warning("InsightFace init failed, using fallback backend: %s", exc)
                self.app = None
        else:
            self.app = None
            logger.warning("InsightFace not installed, using fallback backend")

    def _embedding_from_crop(self, crop_bgr: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        blur = cv2.GaussianBlur(gray, (3, 3), 0)

        vectors = []
        for variant in (gray, clahe, blur):
            norm = cv2.resize(variant, (96, 96), interpolation=cv2.INTER_AREA)
            vec = norm.astype(np.float32).reshape(-1)
            denom = float(np.linalg.norm(vec))
            if denom > 0:
                vec /= denom
            vectors.append(vec)

        fused = np.mean(np.vstack(vectors), axis=0)
        fused_denom = float(np.linalg.norm(fused))
        if fused_denom > 0:
            fused /= fused_denom
        return fused

    def _extract_fallback(
        self,
        image_path: str,
        return_face_info: bool = False,
    ) -> Optional[Union[np.ndarray, Tuple[np.ndarray, Dict[str, np.ndarray]]]]:
        img = cv2.imread(image_path)
        if img is None:
            logger.error("Failed to read image: %s", image_path)
            return None

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        if len(faces) == 0:
            return None

        x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
        x1, y1, x2, y2 = int(x), int(y), int(x + w), int(y + h)
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        embedding = self._embedding_from_crop(crop)
        if return_face_info:
            return embedding, {"bbox": np.array([x1, y1, x2, y2], dtype=np.int32)}
        return embedding

    def extract_embedding(
        self,
        image_path: str,
        return_face_info: bool = False,
    ) -> Optional[Union[np.ndarray, Tuple[np.ndarray, object]]]:
        if self.use_insightface and self.app is not None:
            try:
                img = cv2.imread(image_path)
                if img is None:
                    return None

                faces = self.app.get(img)
                if len(faces) == 0:
                    return None

                face = max(
                    faces,
                    key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
                )
                if return_face_info:
                    return face.embedding, face
                return face.embedding
            except Exception as exc:
                logger.warning("InsightFace extract failed for %s, using fallback: %s", image_path, exc)

        return self._extract_fallback(image_path, return_face_info=return_face_info)

    def compare_faces(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        denom = float(np.linalg.norm(embedding1) * np.linalg.norm(embedding2))
        if denom <= 1e-12:
            return 0.0

        similarity = float(np.dot(embedding1, embedding2) / denom)
        similarity = max(-1.0, min(1.0, similarity))
        return (similarity + 1.0) / 2.0

    def get_confidence_level(self, confidence: float) -> str:
        if confidence >= 0.90:
            return "high"
        if confidence >= 0.75:
            return "medium"
        return "low"

    def find_matches(
        self,
        reference_image: str,
        dataset_images: List[str],
        confidence_threshold: float = 0.75,
        max_results: int = 100,
        batch_size: int = 16,
        use_parallel: bool = True,
    ) -> List[FaceMatch]:
        logger.info("Finding matches in %d images", len(dataset_images))

        reference_result = self.extract_embedding(reference_image)
        if reference_result is None:
            logger.error("No face detected in reference image")
            return []

        reference_embedding = reference_result if isinstance(reference_result, np.ndarray) else reference_result[0]

        if use_parallel:
            matches = self._find_matches_parallel(
                reference_embedding,
                dataset_images,
                confidence_threshold,
                batch_size,
            )
        else:
            matches = self._find_matches_sequential(
                reference_embedding,
                dataset_images,
                confidence_threshold,
            )

        matches.sort(key=lambda m: m.confidence, reverse=True)
        return matches[:max_results]

    def _find_matches_parallel(
        self,
        reference_embedding: np.ndarray,
        dataset_images: List[str],
        confidence_threshold: float,
        batch_size: int,
    ) -> List[FaceMatch]:
        matches: List[FaceMatch] = []
        workers = max(1, min(batch_size, 16))

        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_image = {
                executor.submit(
                    self._process_single_image,
                    reference_embedding,
                    image_path,
                    confidence_threshold,
                ): image_path
                for image_path in dataset_images
            }

            for future in as_completed(future_to_image):
                try:
                    match = future.result()
                    if match is not None:
                        matches.append(match)
                except Exception as exc:
                    logger.error("Error processing %s: %s", future_to_image[future], exc)

        return matches

    def _find_matches_sequential(
        self,
        reference_embedding: np.ndarray,
        dataset_images: List[str],
        confidence_threshold: float,
    ) -> List[FaceMatch]:
        matches: List[FaceMatch] = []
        for image_path in dataset_images:
            match = self._process_single_image(reference_embedding, image_path, confidence_threshold)
            if match is not None:
                matches.append(match)
        return matches

    def _process_single_image(
        self,
        reference_embedding: np.ndarray,
        image_path: str,
        confidence_threshold: float,
    ) -> Optional[FaceMatch]:
        result = self.extract_embedding(image_path, return_face_info=True)
        if result is None:
            return None

        embedding, face = result
        confidence = self.compare_faces(reference_embedding, embedding)
        if confidence < confidence_threshold:
            return None

        bbox_data = None
        if hasattr(face, "bbox"):
            bbox_data = np.array(face.bbox, dtype=np.int32)
        elif isinstance(face, dict) and "bbox" in face:
            bbox_data = np.array(face["bbox"], dtype=np.int32)

        if bbox_data is None or bbox_data.size < 4:
            face_location = {"left": 0, "top": 0, "right": 0, "bottom": 0}
        else:
            face_location = {
                "left": int(bbox_data[0]),
                "top": int(bbox_data[1]),
                "right": int(bbox_data[2]),
                "bottom": int(bbox_data[3]),
            }

        return FaceMatch(
            image_path=image_path,
            confidence=confidence,
            confidence_level=self.get_confidence_level(confidence),
            face_location=face_location,
            embedding=embedding,
        )


def main() -> None:
    engine = FaceRecognitionEngine(use_gpu=False)
    reference_path = "reference_face.jpg"
    dataset_dir = "dataset"
    dataset_images = [str(p) for p in Path(dataset_dir).glob("**/*.jpg")]

    matches = engine.find_matches(
        reference_image=reference_path,
        dataset_images=dataset_images,
        confidence_threshold=0.75,
        max_results=10,
    )

    print(f"Found {len(matches)} matches")


if __name__ == "__main__":
    main()
