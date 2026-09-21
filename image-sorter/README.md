# FaceFinder AI
### AI-Powered Photo Retrieval System

**Daniel Mwalili Mutinda** | SCT221-C004-0765/2022  
**Supervisor:** Dr. Judy Gateri  
**Institution:** Jomo Kenyatta University of Agriculture and Technology (JKUAT)  
**Programme:** BSc Information Technology | 2026

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Officialkid/facefinder/blob/main/FaceFinder_AI_Colab.ipynb)

---


## Overview

FaceFinder AI is an AI-powered system that allows users to upload a reference photo of their face and automatically retrieve matching photos from a large event image dataset. It uses facial recognition to scan, match, and return only images containing the user.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | Python 3.10+, FastAPI |
| AI / Face Recognition | DeepFace (ArcFace, FaceNet, VGG-Face) |
| Image Processing | OpenCV |
| Face Detection | RetinaFace (via DeepFace) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│           Next.js + Tailwind CSS (Port 3000)            │
│   Upload → Dataset → Processing → Results               │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (proxied via next.config)
┌────────────────────────▼────────────────────────────────┐
│                     Backend Layer                        │
│              FastAPI Python (Port 8000)                  │
│   /api/upload  /api/process  /api/results               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   AI Processing Layer                    │
│         DeepFace + RetinaFace + OpenCV                  │
│   Detect → Embed → Compare → Score → Filter             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 Temporary Storage Layer                  │
│      /backend/temp_storage/{session_id}/                │
│      Auto-purged after 2 hours                          │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.10+ 
- Node.js 18+
- npm

### 1. Start the Backend

```bash
cd backend
chmod +x start.sh
./start.sh
```

On Windows:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### 2. Start the Frontend

```bash
cd frontend
chmod +x start.sh
./start.sh
```

On Windows:
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

---

## API Endpoints

### POST `/api/upload/reference`
Upload a reference image containing the user's face.
- **Body:** `multipart/form-data` with `file` field
- **Returns:** `{ session_id, status, message }`

### POST `/api/process/start`
Start the facial recognition pipeline.
- **Body:** `{ session_id, dataset_url, similarity_threshold, model_name }`
- **Returns:** `{ session_id, status, message }`

### GET `/api/results/{session_id}/status`
Poll processing status.
- **Returns:** `{ status, total_images_scanned, matched_count, processing_time_seconds }`

### GET `/api/results/{session_id}`
Get full results with matched images.
- **Returns:** `{ matched_images: [{ filename, similarity_score, distance, download_url }] }`

### GET `/api/results/{session_id}/download/{filename}`
Download a specific matched image.

### DELETE `/api/results/{session_id}`
Manually delete a session and all temporary files.

---

## Facial Recognition Pipeline

```
Reference Image
      │
      ▼
 RetinaFace (Face Detection)
      │
      ▼
 ArcFace Model (Feature Extraction)
      │
      ▼
 512-D Embedding Vector
      │
      ▼
 ┌────────────────────────────────┐
 │   For each dataset image:      │
 │   1. Detect face(s)            │
 │   2. Extract embedding(s)      │
 │   3. Compute Euclidean dist    │
 │   4. Apply threshold           │
 │   5. If match → add to results │
 └────────────────────────────────┘
      │
      ▼
 Matched Images (sorted by similarity score)
```

---

## Configuration

### Similarity Threshold
Controls how strictly the system matches faces:
- `0.2 – 0.35` → Very strict (may miss some photos)
- `0.4` → Balanced (**default, recommended**)
- `0.5 – 0.7` → Lenient (may include false positives)

### Recognition Models
| Model | Speed | Accuracy | Best For |
|-------|-------|----------|---------|
| ArcFace | Medium | Highest | Default, recommended |
| FaceNet | Fast | High | Large datasets |
| VGG-Face | Slow | Good | Classic baseline |

---

## Privacy & Ethics

- All uploaded images are stored **temporarily** in session-scoped folders
- Sessions and files are **automatically deleted** after 2 hours
- Users can also **manually delete** their session via the API
- No permanent storage of personal images
- No user account or registration required
- System is designed exclusively for user-initiated, consensual photo retrieval

---

## Project Structure

```
image-sorter/
├── backend/
│   ├── main.py                    # FastAPI application entry point
│   ├── requirements.txt
│   ├── start.sh
│   ├── temp_storage/              # Auto-created, auto-purged
│   └── app/
│       ├── models/
│       │   └── schemas.py         # Pydantic models
│       ├── routers/
│       │   ├── upload.py          # Reference image upload
│       │   ├── process.py         # Recognition pipeline trigger
│       │   └── results.py         # Status polling + downloads
│       └── services/
│           ├── face_recognition.py   # Core AI pipeline
│           ├── dataset_retrieval.py  # URL downloading + extraction
│           ├── session_store.py      # In-memory session management
│           └── cleanup.py            # Background temp file purger
│
└── frontend/
    ├── package.json
    ├── next.config.js             # API proxy to :8000
    ├── tailwind.config.js
    ├── start.sh
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx           # Main 4-step flow orchestrator
        │   └── globals.css
        ├── components/
        │   ├── StepIndicator.tsx  # Progress steps (1→2→3→4)
        │   ├── ReferenceUpload.tsx   # Dropzone upload
        │   ├── DatasetForm.tsx    # URL + model + threshold settings
        │   ├── ProcessingStatus.tsx  # Live polling + scan animation
        │   ├── ResultsGrid.tsx    # Matched images + download
        │   └── SimilarityBar.tsx  # Animated confidence score bar
        └── lib/
            └── api.ts             # Typed API client
```

---

## Testing the System

To test without a real event dataset, you can:

1. Create a ZIP of sample photos and host it on Google Drive (set to public access)
2. Use the Google Drive share link as the dataset URL
3. Use a clear reference photo of one person who appears in multiple sample images

---

## What is Still Remaining (Next Steps / Roadmap)

- **Live Production Deployment Credentials**: The Docker container and Vercel configurations are ready; the only remaining deployment step is connecting the active cloud deployment tokens (Vercel and Google Cloud / Cloud Run).
- **GPU Acceleration & Vector Database Scaling**: Transitioning the vector search from in-memory CPU NumPy arrays to a GPU-accelerated vector index (such as FAISS or Qdrant/Milvus) to search galleries of 50,000+ photos in sub-second time.
- **Permanent Multi-Tenant User Accounts**: Adding database-backed user authentication (PostgreSQL/Supabase) to persist albums and search history permanently across sessions.

---

## Limitations

- Processing speed depends on dataset size and available CPU/GPU
- Very large datasets (1000+ images) may take several minutes
- Accuracy may be reduced by: poor lighting, extreme face angles, heavy occlusion
- Currently supports publicly accessible URLs only (no authentication-gated sources)

---

*Submitted in partial fulfillment of the requirements for the award of BSc Information Technology, JKUAT, 2026.*

