# DEPLOYMENT READINESS & INFRASTRUCTURE AUDIT — FACEFINDER AI

**Project:** FaceFinder AI  
**Author:** DevOps Lead & Senior Architect  
**Date:** November 19, 2026  
**Status:** Post-Verification Audit  

---

## 1. THE FOUR READINESS TIERS (CRITICAL ARCHITECTURAL DISTINCTION)

| Tier | Status | Assessment & Limitations |
| :--- | :---: | :--- |
| **Tier 1: Local Development** | **READY** | Both backend (FastAPI/Uvicorn) and frontend (Next.js 14) start and communicate cleanly via `localhost:3000` and `127.0.0.1:8000`. |
| **Tier 2: Single-Instance Cloud (Cloud Run `--max-instances 1`)** | **READY** | Cloud Run handles requests reliably without session split-brain because all requests route to the single container instance. |
| **Tier 3: Data Durability** | **NOT READY** | Cloud Run instances are ephemeral. If the single instance restarts, crashes, or scales to zero after inactivity, local SQLite database and `temp_storage` are wiped. |
| **Tier 4: Multi-Instance Cluster Scaling (`--max-instances > 1`)** | **NOT READY** | Requests are load-balanced randomly across instances. An upload on Instance A cannot be polled on Instance B, producing HTTP 404s. |

---

## 2. PRODUCTION MULTI-INSTANCE MIGRATION ROADMAP

To transition FaceFinder AI from Tier 2 to Tier 4, the following two changes are mandatory:

1. **Managed Database (Session Store):**
   - Replace SQLite `session_store.sqlite3` with Google Cloud SQL (PostgreSQL) or Google Firestore.
   - Requires SQLAlchemy or asyncpg connection pool in FastAPI.
2. **Object Storage (Album Filesystem):**
   - Replace local directory `temp_storage/{session_id}` with Google Cloud Storage (GCS) buckets.
   - Use GCS Signed URLs for direct browser-to-bucket uploads and downloads.
3. **Task Queue Decoupling:**
   - Migrate in-process `processing_worker` thread to Google Cloud Tasks or Celery with Redis/RabbitMQ, allowing worker instances with GPU acceleration to process jobs independently of API instances.

---

## 3. DEPLOYMENT CONFIGURATION AUDIT

### 3.1 Google Cloud Run (`.github/workflows/cloudrun.yml`)
- Service Name: `facefinder-backend`
- CPU: 2 vCPU
- Memory: 2GiB
- Timeout: 1800s (30 minutes)
- Port: 8080 (Container maps to internal FastAPI port)
- Max Instances: `1` (Strictly pinned to prevent session loss)
- Secret Validation: Workflow now outputs `::error::` and fails manual dispatch if `GCP_CREDENTIALS_JSON` is unset.

### 3.2 Vercel Frontend
- Project Root: `image-sorter/frontend`
- Framework: Next.js 14.2.3
- Build Command: `next build`
- Output Directory: `.next`
- Direct ZIP Route: Bypasses Vercel 4.5MB serverless body limit via direct multipart uploads to backend.
