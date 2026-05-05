"""
FaceFinder - Face Recognition Engine (DeepFace)
Alternative implementation using DeepFace library

Features:
- Multiple model support (VGG-Face, Facenet, ArcFace)
- Face detection and verification
- Distance metrics (cosine, euclidean)
- Easy-to-use API
"""

import os
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# DeepFace imports
from deepface import DeepFace
from deepface.commons import functions

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class FaceMatch:
    """Face match result"""
    image_path: str
    confidence: float
    confidence_level: str
    face_location: Dict[str, int]
    distance: float
    
    def to_dict(self) -> Dict:
        return {
            'image_path': self.image_path,
            'confidence': float(self.confidence),
            'confidence_level': self.confidence_level,
            'face_location': self.face_location,
            'distance': float(self.distance)
        }


class DeepFaceEngine:
    """
    Face recognition engine using DeepFace
    
    Supported models:
    - VGG-Face: Fast, good accuracy
    - Facenet: Balanced speed/accuracy
    - Facenet512: High accuracy
    - ArcFace: State-of-the-art accuracy
    """
    
    def __init__(
        self,
        model_name: str = 'Facenet512',
        detector_backend: str = 'retinaface',
        distance_metric: str = 'cosine'
    ):
        """
        Initialize DeepFace engine
        
        Args:
            model_name: Model to use (VGG-Face, Facenet, Facenet512, ArcFace)
            detector_backend: Face detector (opencv, ssd, dlib, mtcnn, retinaface)
            distance_metric: Distance metric (cosine, euclidean, euclidean_l2)
        """
        self.model_name = model_name
        self.detector_backend = detector_backend
        self.distance_metric = distance_metric
        
        # Thresholds for different models and metrics
        self.thresholds = {
            'VGG-Face': {'cosine': 0.40, 'euclidean': 0.60, 'euclidean_l2': 0.86},
            'Facenet': {'cosine': 0.40, 'euclidean': 10, 'euclidean_l2': 0.80},
            'Facenet512': {'cosine': 0.30, 'euclidean': 23.56, 'euclidean_l2': 1.04},
            'ArcFace': {'cosine': 0.68, 'euclidean': 4.15, 'euclidean_l2': 1.13}
        }
        
        logger.info(f"Initializing DeepFace with model: {model_name}")
        
        # Pre-load model
        try:
            DeepFace.build_model(model_name)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def extract_embedding(
        self,
        image_path: str,
        enforce_detection: bool = True
    ) -> Optional[np.ndarray]:
        """
        Extract face embedding from image
        
        Args:
            image_path: Path to image file
            enforce_detection: Raise error if no face detected
            
        Returns:
            Face embedding vector
        """
        try:
            # Extract embedding
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=enforce_detection
            )
            
            if not embedding_objs:
                logger.warning(f"No face detected in: {image_path}")
                return None
            
            # Get first face embedding
            embedding = np.array(embedding_objs[0]['embedding'])
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error extracting embedding from {image_path}: {e}")
            return None
    
    def compare_faces(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray
    ) -> Tuple[float, float]:
        """
        Compare two face embeddings
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            
        Returns:
            Tuple of (distance, confidence)
        """
        # Calculate distance
        if self.distance_metric == 'cosine':
            distance = functions.findCosineDistance(embedding1, embedding2)
        elif self.distance_metric == 'euclidean':
            distance = functions.findEuclideanDistance(embedding1, embedding2)
        elif self.distance_metric == 'euclidean_l2':
            distance = functions.findEuclideanDistance(
                functions.l2_normalize(embedding1),
                functions.l2_normalize(embedding2)
            )
        else:
            raise ValueError(f"Unknown distance metric: {self.distance_metric}")
        
        # Get threshold
        threshold = self.thresholds[self.model_name][self.distance_metric]
        
        # Convert distance to confidence (0-1)
        # Lower distance = higher confidence
        confidence = max(0, 1 - (distance / threshold))
        
        return distance, confidence
    
    def verify_faces(
        self,
        image1_path: str,
        image2_path: str
    ) -> Dict:
        """
        Verify if two images contain the same person
        
        Args:
            image1_path: Path to first image
            image2_path: Path to second image
            
        Returns:
            Verification result dictionary
        """
        try:
            result = DeepFace.verify(
                img1_path=image1_path,
                img2_path=image2_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                distance_metric=self.distance_metric,
                enforce_detection=True
            )
            
            return {
                'verified': result['verified'],
                'distance': result['distance'],
                'threshold': result['threshold'],
                'confidence': 1 - (result['distance'] / result['threshold'])
            }
            
        except Exception as e:
            logger.error(f"Error verifying faces: {e}")
            return None
    
    def get_confidence_level(self, confidence: float) -> str:
        """Get confidence level label"""
        if confidence >= 0.90:
            return 'high'
        elif confidence >= 0.75:
            return 'medium'
        else:
            return 'low'
    
    def find_matches(
        self,
        reference_image: str,
        dataset_images: List[str],
        confidence_threshold: float = 0.75,
        max_results: int = 100,
        batch_size: int = 10,
        use_parallel: bool = True
    ) -> List[FaceMatch]:
        """
        Find matching faces in dataset
        
        Args:
            reference_image: Path to reference face image
            dataset_images: List of dataset image paths
            confidence_threshold: Minimum confidence score
            max_results: Maximum number of results
            batch_size: Parallel processing batch size
            use_parallel: Use parallel processing
            
        Returns:
            List of FaceMatch objects
        """
        logger.info(f"Finding matches for reference: {reference_image}")
        logger.info(f"Dataset size: {len(dataset_images)} images")
        
        # Extract reference embedding
        start_time = time.time()
        reference_embedding = self.extract_embedding(reference_image)
        
        if reference_embedding is None:
            logger.error("No face detected in reference image")
            return []
        
        logger.info(f"Reference embedding extracted in {time.time() - start_time:.2f}s")
        
        # Process dataset
        if use_parallel:
            matches = self._find_matches_parallel(
                reference_embedding,
                dataset_images,
                confidence_threshold,
                batch_size
            )
        else:
            matches = self._find_matches_sequential(
                reference_embedding,
                dataset_images,
                confidence_threshold
            )
        
        # Sort by confidence
        matches.sort(key=lambda x: x.confidence, reverse=True)
        
        # Limit results
        matches = matches[:max_results]
        
        logger.info(f"Found {len(matches)} matches")
        
        return matches
    
    def _find_matches_parallel(
        self,
        reference_embedding: np.ndarray,
        dataset_images: List[str],
        confidence_threshold: float,
        batch_size: int
    ) -> List[FaceMatch]:
        """Parallel processing"""
        matches = []
        total = len(dataset_images)
        
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_image = {
                executor.submit(
                    self._process_single_image,
                    reference_embedding,
                    image_path,
                    confidence_threshold
                ): image_path
                for image_path in dataset_images
            }
            
            for i, future in enumerate(as_completed(future_to_image)):
                if i % 50 == 0:
                    logger.info(f"Processing: {i}/{total} ({i/total*100:.1f}%)")
                
                try:
                    match = future.result()
                    if match:
                        matches.append(match)
                except Exception as e:
                    logger.error(f"Error: {e}")
        
        return matches
    
    def _find_matches_sequential(
        self,
        reference_embedding: np.ndarray,
        dataset_images: List[str],
        confidence_threshold: float
    ) -> List[FaceMatch]:
        """Sequential processing"""
        matches = []
        
        for i, image_path in enumerate(dataset_images):
            if i % 50 == 0:
                logger.info(f"Processing: {i}/{len(dataset_images)}")
            
            match = self._process_single_image(
                reference_embedding,
                image_path,
                confidence_threshold
            )
            
            if match:
                matches.append(match)
        
        return matches
    
    def _process_single_image(
        self,
        reference_embedding: np.ndarray,
        image_path: str,
        confidence_threshold: float
    ) -> Optional[FaceMatch]:
        """Process single image"""
        try:
            # Extract embedding
            embedding = self.extract_embedding(image_path, enforce_detection=False)
            
            if embedding is None:
                return None
            
            # Compare with reference
            distance, confidence = self.compare_faces(reference_embedding, embedding)
            
            if confidence < confidence_threshold:
                return None
            
            # Get face location (using DeepFace detect)
            face_objs = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend=self.detector_backend,
                enforce_detection=False
            )
            
            if face_objs:
                facial_area = face_objs[0]['facial_area']
                face_location = {
                    'left': facial_area['x'],
                    'top': facial_area['y'],
                    'right': facial_area['x'] + facial_area['w'],
                    'bottom': facial_area['y'] + facial_area['h']
                }
            else:
                face_location = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
            
            return FaceMatch(
                image_path=image_path,
                confidence=confidence,
                confidence_level=self.get_confidence_level(confidence),
                face_location=face_location,
                distance=distance
            )
            
        except Exception as e:
            logger.error(f"Error processing {image_path}: {e}")
            return None


def main():
    """Example usage"""
    
    # Initialize engine
    engine = DeepFaceEngine(
        model_name='Facenet512',
        detector_backend='retinaface',
        distance_metric='cosine'
    )
    
    # Example: Find matches
    reference_path = "reference_face.jpg"
    dataset_dir = "dataset"
    dataset_images = [str(p) for p in Path(dataset_dir).glob("**/*.jpg")]
    
    matches = engine.find_matches(
        reference_image=reference_path,
        dataset_images=dataset_images,
        confidence_threshold=0.75,
        max_results=10
    )
    
    print(f"\nFound {len(matches)} matches:")
    for i, match in enumerate(matches, 1):
        print(f"{i}. {Path(match.image_path).name}")
        print(f"   Confidence: {match.confidence:.4f} ({match.confidence_level})")
        print(f"   Distance: {match.distance:.4f}")


if __name__ == "__main__":
    main()
