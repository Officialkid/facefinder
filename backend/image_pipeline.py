"""
Image Processing Pipeline for Face Detection and Normalization
"""
import cv2
import numpy as np
from typing import List, Tuple, Optional
from pathlib import Path


class ImagePipeline:
    """Handles image loading, face detection, and normalization"""
    
    def __init__(self, target_size: Tuple[int, int] = (112, 112)):
        self.target_size = target_size
        # Load Haar Cascade for face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
    
    def load_image(self, path: str) -> Optional[np.ndarray]:
        """Load image from file path"""
        img = cv2.imread(path)
        if img is None:
            return None
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect all faces in image. Returns list of (x, y, w, h) tuples"""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]
    
    def normalize_face(self, image: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        """Extract and normalize face region"""
        x, y, w, h = bbox
        
        # Add 20% padding
        pad = int(w * 0.2)
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(image.shape[1], x + w + pad)
        y2 = min(image.shape[0], y + h + pad)
        
        # Crop face
        face = image[y1:y2, x1:x2]
        
        # Resize to target size
        face = cv2.resize(face, self.target_size, interpolation=cv2.INTER_AREA)
        
        # Normalize pixel values to [0, 1]
        face = face.astype(np.float32) / 255.0
        
        return face
    
    def process_image(self, path: str) -> List[np.ndarray]:
        """Complete pipeline: load → detect → normalize all faces"""
        # Load
        image = self.load_image(path)
        if image is None:
            return []
        
        # Detect
        faces = self.detect_faces(image)
        if not faces:
            return []
        
        # Normalize all detected faces
        normalized = [self.normalize_face(image, bbox) for bbox in faces]
        
        return normalized
    
    def process_batch(self, paths: List[str]) -> List[Tuple[str, List[np.ndarray]]]:
        """Process multiple images"""
        results = []
        for path in paths:
            faces = self.process_image(path)
            if faces:
                results.append((path, faces))
        return results


# Usage Example
if __name__ == "__main__":
    pipeline = ImagePipeline(target_size=(112, 112))
    
    # Single image
    faces = pipeline.process_image("photo.jpg")
    print(f"Found {len(faces)} faces")
    
    # Batch processing
    image_paths = ["img1.jpg", "img2.jpg", "img3.jpg"]
    results = pipeline.process_batch(image_paths)
    
    for path, faces in results:
        print(f"{path}: {len(faces)} faces detected")
