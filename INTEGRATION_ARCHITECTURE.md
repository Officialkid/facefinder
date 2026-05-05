# Full-Stack Integration Architecture

## System Flow

```
User → Frontend (Next.js) → API (Flask) → AI Engine (InsightFace) → Results → Frontend
```

## Components

### 1. Frontend (Next.js + TypeScript)
**Location**: `/app/integrated/page.tsx`

**Responsibilities**:
- User interface and interactions
- File upload handling
- Real-time status polling
- Results display

**Key Features**:
- Upload photo with validation
- Input dataset URL
- Poll job status every 1 second
- Display progress (0-100%)
- Show results grid with confidence scores

### 2. API Client (TypeScript)
**Location**: `/lib/api-client.ts`

**Responsibilities**:
- HTTP communication with backend
- Type-safe API calls
- Error handling
- URL generation

**Methods**:
- `uploadPhoto(file)` - Upload user photo
- `startProcessing(jobId, datasetUrl)` - Start AI processing
- `getStatus(jobId)` - Poll job status
- `getResults(jobId)` - Fetch final results
- `healthCheck()` - Check backend availability

### 3. Backend API (Flask + Python)
**Location**: `/backend/server.py`

**Responsibilities**:
- RESTful API endpoints
- Job management
- Async processing
- File handling
- TTL cleanup

**Endpoints**:
- `POST /api/upload` - Upload photo, validate face
- `POST /api/process` - Start processing job
- `GET /api/status/<jobId>` - Get job status
- `GET /api/results/<jobId>` - Get results
- `GET /api/image/<filename>` - Serve images
- `GET /api/download/<jobId>/<resultId>` - Download match

### 4. Image Pipeline (OpenCV)
**Location**: `/backend/image_pipeline.py`

**Responsibilities**:
- Load images
- Detect faces
- Normalize faces (112x112)
- Handle multiple faces

**Methods**:
- `load_image(path)` - Load and convert to RGB
- `detect_faces(image)` - Find all faces
- `normalize_face(image, bbox)` - Extract and resize
- `process_image(path)` - Complete pipeline

### 5. AI Engine (InsightFace)
**Location**: `/backend/face_recognition_engine.py`

**Responsibilities**:
- Face embedding extraction (512D)
- Similarity comparison
- Match finding with confidence

**Methods**:
- `extract_embedding(image_path)` - Get face vector
- `compare_faces(emb1, emb2)` - Calculate similarity
- `find_matches(user_emb, dataset, threshold)` - Search dataset

## Data Flow

### Upload Phase
```
1. User selects photo → Frontend validates size/type
2. Frontend calls apiClient.uploadPhoto(file)
3. Backend receives file → saves to temp/uploads/
4. Image pipeline detects face → validates single face
5. Backend returns jobId
6. Frontend stores jobId
```

### Processing Phase
```
1. User clicks "Find Me" → Frontend calls apiClient.startProcessing()
2. Backend creates background thread
3. Thread extracts user embedding (Phase 1: 25%)
4. Thread downloads dataset images (Phase 2: 50%)
5. Thread finds matches using AI engine (Phase 3: 75%)
6. Thread formats results (Phase 4: 100%)
7. Frontend polls status every 1 second
8. Backend updates progress in real-time
```

### Results Phase
```
1. Backend status changes to "completed"
2. Frontend calls apiClient.getResults(jobId)
3. Backend returns array of matches with:
   - Image URL
   - Confidence score (0.60-1.00)
   - Confidence level (high/medium/low)
   - Face location
4. Frontend displays ResultsGrid
5. User can download individual matches
```

## Performance Optimizations

### Backend
- **Async Processing**: Background threads prevent blocking
- **In-Memory Jobs**: Fast access without database overhead
- **Batch Processing**: Process 50 images at a time
- **GPU Acceleration**: InsightFace uses ONNX Runtime GPU
- **TTL Cleanup**: Auto-delete after 1 hour

### Frontend
- **Polling**: 1-second intervals for smooth progress
- **Lazy Loading**: Images load on demand
- **Optimistic UI**: Immediate feedback on actions
- **Error Boundaries**: Graceful error handling

### AI Engine
- **Embedding Cache**: Reuse computed embeddings
- **Parallel Processing**: ThreadPoolExecutor for batch
- **Optimized Models**: buffalo_l (99.8% accuracy, 66 img/sec)

## Error Handling

### Frontend
```typescript
try {
  await apiClient.uploadPhoto(file);
} catch (error) {
  setError(error.message);
  // Show error to user
}
```

### Backend
```python
try:
    embedding = face_engine.extract_embedding(path)
except Exception as e:
    job['status'] = 'failed'
    job['error'] = str(e)
```

### AI Engine
```python
if embedding is None:
    return None  # Graceful failure
```

## Security

- **File Validation**: Type, size, face detection
- **Secure Filenames**: werkzeug.secure_filename()
- **CORS**: Configured for frontend origin
- **TTL**: Auto-cleanup prevents storage abuse
- **No Permanent Storage**: All data ephemeral

## Deployment

### Backend
```bash
cd backend
pip install -r requirements-server.txt
python server.py
# Runs on http://localhost:5000
```

### Frontend
```bash
# Set environment variable
NEXT_PUBLIC_API_URL=http://localhost:5000/api

npm run dev
# Runs on http://localhost:3000
```

### Production
```bash
# Backend with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 server:app

# Frontend
npm run build
npm start
```

## Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Job Status
```bash
curl http://localhost:5000/api/status/<jobId>
```

## Architecture Benefits

✅ **Clean Separation**: Frontend, API, AI are independent
✅ **Type Safety**: TypeScript interfaces match Python responses
✅ **Real-time Updates**: Polling provides smooth UX
✅ **Scalable**: Background threads handle concurrent jobs
✅ **Fast**: In-memory storage, GPU acceleration
✅ **Reliable**: Comprehensive error handling at every layer
