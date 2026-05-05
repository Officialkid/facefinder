from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional

import cv2
import numpy as np


@dataclass
class FaceMatchCandidate:
    image_path: str
    best_confidence: float
    matched_face_count: int


class FaceMatcher:
    def __init__(self, model_name: str = "Facenet512", detector_backend: str = "skip") -> None:
        self.model_name = model_name
        self.detector_backend = detector_backend
        self._cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self._deepface = None
        self._deepface_ready = False

        try:
            from deepface import DeepFace  # type: ignore

            self._deepface = DeepFace
            self._deepface.build_model(self.model_name)
            self._deepface_ready = True
        except Exception:
            # Runtime can fall back to OpenCV-only embeddings when DeepFace stack
            # is unavailable in the current Python environment.
            self._deepface = None
            self._deepface_ready = False

    @property
    def deepface_ready(self) -> bool:
        return self._deepface_ready

    def detect_faces(self, image_bgr: np.ndarray) -> List[np.ndarray]:
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        boxes = self._cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        crops: List[np.ndarray] = []
        for x, y, w, h in boxes:
            crop = image_bgr[y : y + h, x : x + w]
            if crop.size > 0:
                crops.append(crop)
        return crops

    def embedding_for_largest_face(self, image_path: str) -> Optional[np.ndarray]:
        image = cv2.imread(image_path)
        if image is None:
            return None

        faces = self.detect_faces(image)
        if not faces:
            return None

        faces.sort(key=lambda f: f.shape[0] * f.shape[1], reverse=True)
        return self._to_embedding(faces[0])

    def best_match_for_image(self, reference_embedding: np.ndarray, image_path: str, threshold: float) -> Optional[FaceMatchCandidate]:
        image = cv2.imread(image_path)
        if image is None:
            return None

        faces = self.detect_faces(image)
        if not faces:
            return None

        best_conf = 0.0
        matched = 0
        for face in faces:
            emb = self._to_embedding(face)
            if emb is None:
                continue
            conf = self.similarity(reference_embedding, emb)
            if conf >= threshold:
                matched += 1
                if conf > best_conf:
                    best_conf = conf

        if matched == 0:
            return None

        return FaceMatchCandidate(
            image_path=image_path,
            best_confidence=float(best_conf),
            matched_face_count=matched,
        )

    def _to_embedding(self, face_bgr: np.ndarray) -> Optional[np.ndarray]:
        if self._deepface_ready and self._deepface is not None:
            try:
                rep = self._deepface.represent(
                    img_path=face_bgr,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False,
                )
            except Exception:
                rep = None

            if rep:
                vector = np.asarray(rep[0]["embedding"], dtype=np.float32)
                norm = float(np.linalg.norm(vector))
                if norm > 1e-12:
                    return vector / norm

        # Fallback embedding from normalized grayscale crop.
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        norm = cv2.resize(gray, (112, 112), interpolation=cv2.INTER_AREA).astype(np.float32).reshape(-1)
        denom = float(np.linalg.norm(norm))
        if denom <= 1e-12:
            return None
        return norm / denom

    @staticmethod
    def similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        denom = float(np.linalg.norm(embedding1) * np.linalg.norm(embedding2))
        if denom <= 1e-12:
            return 0.0
        cos_sim = float(np.dot(embedding1, embedding2) / denom)
        cos_sim = max(-1.0, min(1.0, cos_sim))
        return (cos_sim + 1.0) / 2.0

    @staticmethod
    def is_image_filename(name: str) -> bool:
        return os.path.splitext(name)[1].lower() in {".jpg", ".jpeg", ".png", ".webp"}
