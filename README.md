# FaceFinder AI Workspace

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Officialkid/facefinder/blob/main/FaceFinder_AI_Colab.ipynb)

> **Copyright © 2026 Daniel Mwalili Mutinda. All Rights Reserved.**  
> **Student Reg:** SCT221-C004-0765/2022 | **Supervisor:** Dr. Judy Gateri  
> **Institution:** Jomo Kenyatta University of Agriculture and Technology (JKUAT)  
> *Notice: This repository and its algorithms are proprietary academic intellectual property created for BSc Information Technology degree evaluation. Commercialization, reproduction, or redistribution without written authorization is strictly prohibited.*

This repository centers on `FaceFinder AI` as the single active product.



Active application paths:

- Frontend: `image-sorter/frontend`
- Backend: `image-sorter/backend`

## What FaceFinder AI Does

FaceFinder AI lets a user:

- upload one reference face photo
- provide a public dataset source
- track real processing progress while the scan is running
- review ranked match results with richer metadata

Supported dataset-source flows in the current backend:

- Google Photos public gallery links
- Pixieset public gallery links
- Pixabay public gallery links
- Google Drive file links
- Dropbox direct-download links
- public ZIP links
- direct public image URLs

## Local Verification

Frontend production build:

```powershell
npm run build
```

Backend test suite:

```powershell
.venv\Scripts\python.exe image-sorter\backend\tests\test_session_and_status.py
```

## Deployment Shape

- Vercel serves the frontend.
- `/api/*` is rewritten to the deployed backend service.
- The backend is packaged from the root `Dockerfile` and deployed separately.

## Current Status

Completed in this workspace:

- **Multi-Face Reference Disambiguation**: When an uploaded reference image contains multiple people, interactive face crop selection allows targeting the exact person before initiating dataset scanning.
- **Occlusion & Sunglasses Handling**: Multi-stage detection pipeline (OpenCV / SSD with MTCNN fallback) reliably detects and extracts ArcFace embeddings even under harsh lighting, hats, and sunglasses.
- **Candidate Verification Tier ("Is this you?")**: Tiered matching separates high-confidence matches ($d \le 0.45$) from borderline candidates ($0.45 < d \le 0.65$), presenting side-by-side comparison cards with one-click "Confirm" or "Dismiss" actions.
- **Dynamic Match Promotion**: Confirmed candidates dynamically update the matched count and are immediately included in the downloadable ZIP archive.
- **Dataset Retrieval Support**: Google Photos public shared albums, Pixieset, Pixabay, Google Drive, Dropbox direct links, and public ZIP uploads supported with automatic extraction and sanitization.
- **Live Progress Cockpit**: Real-time percentage tracking, scan stages, and live match counters streamed via status polling.

---

## What is Still Remaining (Next Steps / Roadmap)

- **Live Production Deployment Credentials**: The Docker container and Vercel configurations are ready; the only remaining deployment step is connecting the active cloud deployment tokens (Vercel and Google Cloud / Cloud Run).
- **GPU Acceleration & Vector Database Scaling**: Transitioning the vector search from in-memory CPU NumPy arrays to a GPU-accelerated vector index (such as FAISS or Qdrant/Milvus) to search galleries of 50,000+ photos in sub-second time.
- **Permanent Multi-Tenant User Accounts**: Adding database-backed user authentication (PostgreSQL/Supabase) to persist albums and search history permanently across sessions.

