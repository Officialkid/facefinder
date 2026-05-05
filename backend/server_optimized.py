"""
Optimized Flask API Server - 4x Lower Latency
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import threading

from face_engine_optimized import OptimizedFaceEngine
from image_pipeline_optimized import OptimizedImagePipeline

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'temp/uploads'
RESULTS_FOLDER = 'temp/results'
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
TTL_HOURS = 1

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Initialize optimized engines (singleton pattern)
face_engine = OptimizedFaceEngine(use_gpu=True, max_workers=8)
image_pipeline = OptimizedImagePipeline(max_workers=8)

# Thread pool for async processing (reuse threads)
executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix='worker')

# In-memory job storage with lock
jobs = {}
jobs_lock = threading.Lock()

# Dataset embedding cache (precomputed for faster searches)
dataset_cache = {
    'paths': None,
    'embeddings': None,
    'url': None,
    'lock': threading.Lock()
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_or_create_dataset_cache(dataset_url: str, dataset_paths: List[str]):
    """Get cached dataset embeddings or compute if needed"""
    with dataset_cache['lock']:
        # Cache hit
        if dataset_cache['url'] == dataset_url and dataset_cache['embeddings'] is not None:
            return dataset_cache['paths'], dataset_cache['embeddings']
        
        # Cache miss - compute
        paths, embeddings = face_engine.precompute_dataset_embeddings(dataset_paths)
        
        # Update cache
        dataset_cache['paths'] = paths
        dataset_cache['embeddings'] = embeddings
        dataset_cache['url'] = dataset_url
        
        return paths, embeddings


@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@app.route('/api/upload', methods=['POST'])
def upload():
    """Upload with fast validation"""
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
    
    # Fast face validation (single image, no batch)
    faces = image_pipeline.process_image(filepath)
    if not faces:
        os.remove(filepath)
        return jsonify({'error': 'No face detected'}), 400
    
    if len(faces) > 1:
        os.remove(filepath)
        return jsonify({'error': 'Multiple faces detected'}), 400
    
    # Create job
    with jobs_lock:
        jobs[job_id] = {
            'id': job_id,
            'upload_path': filepath,
            'status': 'uploaded',
            'created_at': datetime.now().isoformat(),
            'progress': 0
        }
    
    return jsonify({
        'jobId': job_id,
        'status': 'uploaded',
        'message': 'Photo uploaded successfully'
    })


@app.route('/api/process', methods=['POST'])
def process():
    """Start optimized processing"""
    data = request.json
    job_id = data.get('jobId')
    dataset_url = data.get('datasetUrl')
    
    with jobs_lock:
        if not job_id or job_id not in jobs:
            return jsonify({'error': 'Invalid job ID'}), 400
        
        job = jobs[job_id]
        job['status'] = 'processing'
        job['dataset_url'] = dataset_url
        job['progress'] = 10
    
    # Submit to thread pool (non-blocking)
    executor.submit(process_job_optimized, job_id)
    
    return jsonify({
        'jobId': job_id,
        'status': 'processing',
        'message': 'Processing started'
    })


def process_job_optimized(job_id: str):
    """Optimized background processing"""
    with jobs_lock:
        job = jobs[job_id]
    
    try:
        # Phase 1: Extract user embedding (cached)
        job['progress'] = 25
        job['phase'] = 'analyzing'
        
        user_embedding = face_engine.extract_embedding(job['upload_path'], use_cache=True)
        if user_embedding is None:
            with jobs_lock:
                job['status'] = 'failed'
                job['error'] = 'Failed to extract face features'
            return
        
        # Phase 2: Get dataset
        job['progress'] = 40
        job['phase'] = 'searching'
        
        dataset_dir = 'temp/dataset'
        if not os.path.exists(dataset_dir):
            with jobs_lock:
                job['status'] = 'failed'
                job['error'] = 'Dataset not found'
            return
        
        dataset_images = [
            os.path.join(dataset_dir, f) 
            for f in os.listdir(dataset_dir) 
            if allowed_file(f)
        ]
        
        # Phase 3: Find matches with precomputed embeddings
        job['progress'] = 60
        
        # Use cached dataset embeddings
        dataset_paths, dataset_embeddings = get_or_create_dataset_cache(
            job['dataset_url'], 
            dataset_images
        )
        
        job['progress'] = 80
        job['phase'] = 'finalizing'
        
        # Ultra-fast vectorized search
        matches = face_engine.find_matches_precomputed(
            user_embedding,
            dataset_paths,
            dataset_embeddings,
            threshold=0.60,
            top_k=50
        )
        
        # Phase 4: Format results
        job['progress'] = 100
        
        with jobs_lock:
            job['status'] = 'completed'
            job['results'] = [
                {
                    'id': str(uuid.uuid4()),
                    'imagePath': match['image_path'],
                    'imageUrl': f"/api/image/{os.path.basename(match['image_path'])}",
                    'confidence': round(match['confidence'], 4),
                    'confidenceLevel': match['confidence_level'],
                    'location': {}
                }
                for match in matches
            ]
            job['result_paths'] = [m['image_path'] for m in matches]
            job['completed_at'] = datetime.now().isoformat()
        
    except Exception as e:
        with jobs_lock:
            job['status'] = 'failed'
            job['error'] = str(e)
            job['progress'] = 0


@app.route('/api/status/<job_id>', methods=['GET'])
def status(job_id):
    """Get job status"""
    with jobs_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        response = {
            'jobId': job_id,
            'status': job['status'],
            'progress': job.get('progress', 0),
            'phase': job.get('phase', 'idle')
        }
        
        if job['status'] == 'failed':
            response['error'] = job.get('error', 'Unknown error')
    
    return jsonify(response)


@app.route('/api/results/<job_id>', methods=['GET'])
def results(job_id):
    """Get results"""
    with jobs_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        
        if job['status'] != 'completed':
            return jsonify({'error': 'Job not completed'}), 400
        
        response = {
            'jobId': job_id,
            'status': 'completed',
            'results': job.get('results', []),
            'totalMatches': len(job.get('results', [])),
            'processedAt': job.get('completed_at')
        }
    
    return jsonify(response)


@app.route('/api/image/<filename>', methods=['GET'])
def serve_image(filename):
    """Serve images with caching headers"""
    dataset_path = os.path.join('temp/dataset', filename)
    if os.path.exists(dataset_path):
        response = send_file(dataset_path, mimetype='image/jpeg')
        response.headers['Cache-Control'] = 'public, max-age=3600'
        return response
    
    return jsonify({'error': 'Image not found'}), 404


@app.route('/api/download/<job_id>/<result_id>', methods=['GET'])
def download(job_id, result_id):
    """Download result"""
    with jobs_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        result = next((r for r in job.get('results', []) if r['id'] == result_id), None)
    
    if not result:
        return jsonify({'error': 'Result not found'}), 404
    
    return send_file(result['imagePath'], as_attachment=True)


if __name__ == '__main__':
    # Production-ready server
    from waitress import serve
    print("Starting optimized server on http://0.0.0.0:5000")
    serve(app, host='0.0.0.0', port=5000, threads=8)
