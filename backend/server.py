"""
Flask API Server - Connects Frontend to AI Engine
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid
import time
from datetime import datetime
from threading import Thread
import shutil

import numpy as np

from face_recognition_engine import FaceRecognitionEngine
from image_pipeline import ImagePipeline
from dataset_adapters import ingest_dataset

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'temp/uploads'
RESULTS_FOLDER = 'temp/results'
DATASETS_FOLDER = 'temp/datasets'
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DATASET_IMAGES = 300
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
TTL_HOURS = 1
DEFAULT_CONFIDENCE_THRESHOLD_PCT = 88
DEFAULT_MAX_RESULTS = 50

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(DATASETS_FOLDER, exist_ok=True)

# Initialize AI engines
face_engine = FaceRecognitionEngine(use_gpu=False)
image_pipeline = ImagePipeline()

# In-memory job storage
jobs = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def _sanitize_settings(raw):
    raw = raw or {}
    try:
        threshold = int(raw.get('confidenceThresholdPct', DEFAULT_CONFIDENCE_THRESHOLD_PCT))
    except Exception:
        threshold = DEFAULT_CONFIDENCE_THRESHOLD_PCT

    try:
        max_results = int(raw.get('maxResults', DEFAULT_MAX_RESULTS))
    except Exception:
        max_results = DEFAULT_MAX_RESULTS

    search_mode = str(raw.get('searchMode', 'moretime')).strip().lower()
    if search_mode not in {'faster', 'moretime', 'complex'}:
        search_mode = 'moretime'

    settings = {
        'confidenceThresholdPct': max(85, min(95, threshold)),
        'maxResults': max(5, min(200, max_results)),
        'strictMode': _coerce_bool(raw.get('strictMode', False)),
        'searchMode': search_mode,
    }
    return settings


def _max_dataset_images_for_settings(settings):
    mode = settings.get('searchMode', 'moretime')
    if mode == 'faster':
        return min(MAX_DATASET_IMAGES, 160)
    if mode == 'complex':
        return min(700, max(MAX_DATASET_IMAGES, 500))
    return min(500, max(MAX_DATASET_IMAGES, 300))


def _filter_face_boxes(face_boxes, image_shape):
    """Filter likely false-positive boxes and keep meaningful candidates."""
    if not face_boxes:
        return []

    img_h, img_w = int(image_shape[0]), int(image_shape[1])
    img_area = max(1, img_h * img_w)
    min_area = max(900, int(img_area * 0.01))

    filtered = []
    for x, y, w, h in face_boxes:
        area = int(w) * int(h)
        if area < min_area:
            continue
        filtered.append((int(x), int(y), int(w), int(h), area))

    filtered.sort(key=lambda item: item[4], reverse=True)
    return filtered


def _is_confident_multi_face(filtered_faces):
    """
    Return True only when there are at least two similarly strong faces.
    This avoids rejecting a valid portrait due to tiny false positives.
    """
    if len(filtered_faces) < 2:
        return False

    largest = filtered_faces[0][4]
    second = filtered_faces[1][4]
    return largest > 0 and (second / float(largest)) >= 0.45


def cleanup_job(job_id):
    """Remove job data after TTL"""
    time.sleep(TTL_HOURS * 3600)
    if job_id in jobs:
        job = jobs[job_id]
        # Delete files
        if os.path.exists(job['upload_path']):
            os.remove(job['upload_path'])
        if 'result_paths' in job:
            for path in job['result_paths']:
                if os.path.exists(path):
                    os.remove(path)
        if 'dataset_dir' in job and os.path.exists(job['dataset_dir']):
            shutil.rmtree(job['dataset_dir'], ignore_errors=True)
        del jobs[job_id]


def _normalize(vec):
    denom = float(np.linalg.norm(vec))
    if denom <= 1e-12:
        return vec
    return vec / denom


def _build_reference_embedding(upload_path, anchor_path=None):
    upload_result = face_engine.extract_embedding(upload_path)
    if upload_result is None:
        return None

    upload_embedding = upload_result if isinstance(upload_result, np.ndarray) else upload_result[0]

    if not anchor_path:
        return _normalize(upload_embedding.astype(np.float32))

    anchor_result = face_engine.extract_embedding(anchor_path)
    if anchor_result is None:
        return _normalize(upload_embedding.astype(np.float32))

    anchor_embedding = anchor_result if isinstance(anchor_result, np.ndarray) else anchor_result[0]
    fused = (upload_embedding.astype(np.float32) + anchor_embedding.astype(np.float32)) / 2.0
    return _normalize(fused)


def _score_dataset(reference_embedding, dataset_images, confidence_threshold):
    matches = []
    total_images = len(dataset_images)

    # Optional live telemetry target via current job context.
    telemetry_job = None
    if isinstance(reference_embedding, tuple):
        reference_embedding, telemetry_job = reference_embedding
    elif isinstance(reference_embedding, dict):
        telemetry_job = reference_embedding.get('job')
        reference_embedding = reference_embedding.get('embedding')

    start_time = time.time()

    for index, image_path in enumerate(dataset_images, start=1):
        result = face_engine.extract_embedding(image_path, return_face_info=True)

        if telemetry_job is not None:
            telemetry_job['scanned_count'] = index
            telemetry_job['total_images'] = total_images
            elapsed = max(0.001, time.time() - start_time)
            rate = index / elapsed
            remaining = max(0, total_images - index)
            telemetry_job['eta_seconds'] = int(round(remaining / rate)) if rate > 0 else 0

        if result is None:
            continue

        embedding, face = result
        confidence = float(face_engine.compare_faces(reference_embedding, embedding))
        if confidence < confidence_threshold:
            continue

        bbox_data = None
        if hasattr(face, 'bbox'):
            bbox_data = np.array(face.bbox, dtype=np.int32)
        elif isinstance(face, dict) and 'bbox' in face:
            bbox_data = np.array(face['bbox'], dtype=np.int32)

        if bbox_data is None or bbox_data.size < 4:
            location = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
        else:
            location = {
                'left': int(bbox_data[0]),
                'top': int(bbox_data[1]),
                'right': int(bbox_data[2]),
                'bottom': int(bbox_data[3]),
            }

        matches.append({
            'image_path': image_path,
            'confidence': confidence,
            'confidence_level': face_engine.get_confidence_level(confidence),
            'face_location': location,
        })

    matches.sort(key=lambda item: item['confidence'], reverse=True)
    return matches


def _get_or_ingest_dataset(job):
    dataset_dir = job.get('dataset_dir') or os.path.join(DATASETS_FOLDER, job['id'])
    job['dataset_dir'] = dataset_dir

    dataset_images = job.get('dataset_images', [])
    if dataset_images:
        existing = [path for path in dataset_images if os.path.exists(path)]
        if existing:
            job['dataset_images'] = existing
            return existing

    dataset_images = ingest_dataset(
        job['dataset_url'],
        dataset_dir,
        allowed_file=allowed_file,
        max_images=_max_dataset_images_for_settings(job.get('settings') or _sanitize_settings({})),
    )
    job['dataset_images'] = dataset_images
    return dataset_images


@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@app.route('/api/upload', methods=['POST'])
def upload():
    """Upload user photo"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    
    # Save file
    job_id = str(uuid.uuid4())
    filename = secure_filename(f"{job_id}_{file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # Validate face detection
    # 1) Fast pass via Haar detector
    # 2) Fallback pass via embedding extractor (more tolerant to lighting/pose)
    image = image_pipeline.load_image(filepath)
    faces = image_pipeline.detect_faces(image) if image is not None else []
    filtered_faces = _filter_face_boxes(faces, image.shape) if image is not None else []

    if _is_confident_multi_face(filtered_faces):
        os.remove(filepath)
        return jsonify({'error': 'Multiple faces detected. Please upload a photo with one clearly visible face.'}), 400

    fallback_embedding = face_engine.extract_embedding(filepath)
    if fallback_embedding is None and len(filtered_faces) == 0:
        os.remove(filepath)
        return jsonify({'error': 'No face detected in image. Angled photos are supported, but keep one face visible and well-lit.'}), 400
    
    # Create job
    jobs[job_id] = {
        'id': job_id,
        'upload_path': filepath,
        'status': 'uploaded',
        'created_at': datetime.now().isoformat(),
        'progress': 0
    }
    
    # Schedule cleanup
    Thread(target=cleanup_job, args=(job_id,), daemon=True).start()
    
    return jsonify({
        'jobId': job_id,
        'status': 'uploaded',
        'message': 'Photo uploaded successfully'
    })


@app.route('/api/process', methods=['POST'])
def process():
    """Start face recognition processing"""
    data = request.json or {}
    job_id = data.get('jobId')
    dataset_url = data.get('datasetUrl')
    
    if not job_id or job_id not in jobs:
        return jsonify({'error': 'Invalid job ID'}), 400
    
    if not dataset_url:
        return jsonify({'error': 'Dataset URL required'}), 400
    
    job = jobs[job_id]
    job['settings'] = _sanitize_settings(data.get('settings'))
    job['status'] = 'processing'
    job['dataset_url'] = dataset_url
    job['progress'] = 10
    
    # Start async processing
    Thread(target=process_job, args=(job_id,), daemon=True).start()
    
    return jsonify({
        'jobId': job_id,
        'status': 'processing',
        'message': 'Processing started'
    })


@app.route('/api/review/start', methods=['POST'])
def review_start():
    """Build top-3 candidate anchors for user confirmation."""
    data = request.json or {}
    job_id = data.get('jobId')
    dataset_url = data.get('datasetUrl')

    if not job_id or job_id not in jobs:
        return jsonify({'error': 'Invalid job ID'}), 400

    if not dataset_url:
        return jsonify({'error': 'Dataset URL required'}), 400

    job = jobs[job_id]
    job['dataset_url'] = dataset_url
    job['settings'] = _sanitize_settings(data.get('settings'))
    job['status'] = 'reviewing'
    job['phase'] = 'searching'
    job['progress'] = 20

    try:
        dataset_images = _get_or_ingest_dataset(job)
        if not dataset_images:
            return jsonify({'error': 'No downloadable images were found at the dataset URL'}), 400

        reference_embedding = _build_reference_embedding(job['upload_path'])
        if reference_embedding is None:
            return jsonify({'error': 'Failed to extract reference face features'}), 400

        settings = job.get('settings') or _sanitize_settings({})
        target_threshold = settings['confidenceThresholdPct'] / 100.0
        strict_mode = settings['strictMode']

        review_primary = max(0.65, target_threshold - (0.12 if strict_mode else 0.18))
        review_fallback = max(0.50, target_threshold - (0.20 if strict_mode else 0.30))

        candidates = _score_dataset(reference_embedding, dataset_images, confidence_threshold=review_primary)
        if len(candidates) < 3:
            candidates = _score_dataset(reference_embedding, dataset_images, confidence_threshold=review_fallback)

        top_candidates = candidates[:3]

        # Fallback: if strict scoring produced no anchors, relax threshold to 0 but keep
        # face-detected images only (avoid logos/icons in candidate cards).
        if not top_candidates:
            top_candidates = _score_dataset(reference_embedding, dataset_images, confidence_threshold=0.0)[:3]

        if not top_candidates:
            return jsonify({'error': 'No faces detected in dataset images. Please use a link that contains clear face photos.'}), 400

        review_candidates = []
        for item in top_candidates:
            candidate_id = str(uuid.uuid4())
            review_candidates.append({
                'candidateId': candidate_id,
                'imagePath': item['image_path'],
                'imageUrl': f"/api/image/{os.path.basename(item['image_path'])}",
                'confidence': round(float(item['confidence']), 4),
                'confidencePct': int(round(float(item['confidence']) * 100)),
            })

        job['review_candidates'] = review_candidates
        job['status'] = 'awaiting_review'
        job['phase'] = 'review'
        job['progress'] = 35

        return jsonify({
            'jobId': job_id,
            'status': 'awaiting_review',
            'candidates': [
                {
                    'candidateId': candidate['candidateId'],
                    'imageUrl': candidate['imageUrl'],
                    'confidencePct': candidate['confidencePct'],
                }
                for candidate in review_candidates
            ],
        })
    except Exception as exc:
        job['status'] = 'failed'
        job['error'] = str(exc)
        job['progress'] = 0
        return jsonify({'error': str(exc)}), 500


@app.route('/api/review/confirm', methods=['POST'])
def review_confirm():
    """Accept selected anchor and rerun full matching with confirmed profile."""
    data = request.json or {}
    job_id = data.get('jobId')
    candidate_id = data.get('candidateId')

    if not job_id or job_id not in jobs:
        return jsonify({'error': 'Invalid job ID'}), 400

    if not candidate_id:
        return jsonify({'error': 'candidateId is required'}), 400

    job = jobs[job_id]
    review_candidates = job.get('review_candidates', [])
    selected = next((item for item in review_candidates if item['candidateId'] == candidate_id), None)
    if not selected:
        return jsonify({'error': 'Invalid candidate selection'}), 400

    job['status'] = 'processing'
    job['phase'] = 'analyzing'
    job['progress'] = 45
    job['selected_candidate_id'] = candidate_id

    Thread(target=process_job, args=(job_id, selected['imagePath']), daemon=True).start()

    return jsonify({
        'jobId': job_id,
        'status': 'processing',
        'message': 'Confirmed anchor received. Running full search.',
    })


def process_job(job_id, anchor_image_path=None):
    """Background job processing"""
    job = jobs[job_id]
    
    try:
        # Phase 1: Analyze reference face
        job['progress'] = 25
        job['phase'] = 'analyzing'
        
        # Phase 2: Download/ingest dataset from provided URL
        job['progress'] = 50
        job['phase'] = 'searching'

        dataset_images = _get_or_ingest_dataset(job)
        if not dataset_images:
            job['status'] = 'failed'
            job['error'] = 'No downloadable images were found at the dataset URL'
            return

        job['scanned_count'] = 0
        job['total_images'] = len(dataset_images)
        job['eta_seconds'] = 0

        job['progress'] = 65
        reference_embedding = _build_reference_embedding(job['upload_path'], anchor_image_path)
        if reference_embedding is None:
            job['status'] = 'failed'
            job['error'] = 'Failed to extract reference face features'
            return

        settings = job.get('settings') or _sanitize_settings({})
        confidence_threshold = settings['confidenceThresholdPct'] / 100.0
        if settings.get('strictMode'):
            confidence_threshold = max(confidence_threshold, 0.90)
        max_results = settings['maxResults']
        
        # Phase 3: Find matches
        job['progress'] = 75
        job['phase'] = 'finalizing'
        
        matches = _score_dataset((reference_embedding, job), dataset_images, confidence_threshold=confidence_threshold)[:max_results]
        
        # Phase 4: Format results
        job['progress'] = 100
        job['status'] = 'completed'
        job['results'] = [
            {
                'id': str(uuid.uuid4()),
                'imagePath': match['image_path'],
                'imageUrl': f"/api/image/{os.path.basename(match['image_path'])}",
                'confidence': round(float(match['confidence']), 4),
                'confidenceLevel': match['confidence_level'],
                'location': match['face_location']
            }
            for match in matches
        ]
        job['result_paths'] = [m['image_path'] for m in matches]
        job['completed_at'] = datetime.now().isoformat()
        job['eta_seconds'] = 0
        
    except Exception as e:
        job['status'] = 'failed'
        job['error'] = str(e)
        job['progress'] = 0


@app.route('/api/status/<job_id>', methods=['GET'])
def status(job_id):
    """Get job status and progress"""
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = jobs[job_id]
    response = {
        'jobId': job_id,
        'status': job['status'],
        'progress': job.get('progress', 0),
        'phase': job.get('phase', 'idle'),
        'scannedCount': job.get('scanned_count', 0),
        'totalImages': job.get('total_images', 0),
        'etaSeconds': job.get('eta_seconds', 0),
    }
    
    if job['status'] == 'failed':
        response['error'] = job.get('error', 'Unknown error')
    
    return jsonify(response)


@app.route('/api/results/<job_id>', methods=['GET'])
def results(job_id):
    """Get processing results"""
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = jobs[job_id]
    
    if job['status'] != 'completed':
        return jsonify({'error': 'Job not completed'}), 400
    
    return jsonify({
        'jobId': job_id,
        'status': 'completed',
        'results': job.get('results', []),
        'totalMatches': len(job.get('results', [])),
        'processedAt': job.get('completed_at')
    })


@app.route('/api/image/<filename>', methods=['GET'])
def serve_image(filename):
    """Serve result images"""
    for job in jobs.values():
        # Serve final matched images
        for path in job.get('result_paths', []):
            if os.path.basename(path) == filename and os.path.exists(path):
                return send_file(path, mimetype='image/jpeg')

        # Serve review candidate images
        for candidate in job.get('review_candidates', []):
            path = candidate.get('imagePath')
            if path and os.path.basename(path) == filename and os.path.exists(path):
                return send_file(path, mimetype='image/jpeg')

        # Serve any ingested dataset image for this job
        for path in job.get('dataset_images', []):
            if os.path.basename(path) == filename and os.path.exists(path):
                return send_file(path, mimetype='image/jpeg')
    
    return jsonify({'error': 'Image not found'}), 404


@app.route('/api/download/<job_id>/<result_id>', methods=['GET'])
def download(job_id, result_id):
    """Download single result image"""
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = jobs[job_id]
    result = next((r for r in job.get('results', []) if r['id'] == result_id), None)
    
    if not result:
        return jsonify({'error': 'Result not found'}), 404
    
    return send_file(result['imagePath'], as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
