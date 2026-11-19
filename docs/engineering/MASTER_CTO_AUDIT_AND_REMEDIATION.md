# FaceFinder AI — Master CTO Audit and Remediation Report

**Document ID:** `DOC-CTO-2026-MASTER-001`  
**Date:** 2026-11-19  
**Repository:** `https://github.com/Officialkid/facefinder`  
**Base Commit SHA:** `d462778b5058d40b19af33535af463b926057da0`  
**Author / Role:** Chief Technology Officer (CTO), Principal Software Engineer, Application Security Engineer, Release Lead  
**Audit Scope:** End-to-End Codebase, Security Boundaries, Biometrics Engine, Storage Reliability, and Release Readiness  
**Release Verdict:** **CONDITIONALLY READY (LOCAL WORKSTATION & SINGLE-INSTANCE CLOUD ONLY; BLOCKED FOR MULTI-INSTANCE AUTO-SCALING)**

---

## 1. Actual System Architecture & Data Flow

### 1.1 Architecture Overview
FaceFinder AI is a biometric event photograph identification system that allows users to upload a reference portrait, detect and select a target face, ingest an album or collection of event photographs, and isolate all photographs containing the target individual using deep learning face representations.

The real executable architecture consists of:
1. **Frontend**: Next.js 14.2.3 with React 18, TypeScript, and Tailwind CSS. Provides a stepped workflow: Step 1 (Reference portrait upload and multi-face selector), Step 2 (Dataset gallery/archive source configuration), Step 3 (Processing progress telemetry), and Step 4 (Partitioned results inspection, candidate confirmation, and ZIP export).
2. **Backend API**: Python 3.12 with FastAPI and Uvicorn. Implements REST endpoints for session lifecycle, uploads, queue management, status polling, results delivery, and export downloads.
3. **Biometrics & Computer Vision Pipeline**:
   - Preprocessing: PIL `ImageOps.exif_transpose` (handles portrait/phone camera rotations) and bicubic downscaling capped at 1200px.
   - Detection: Multi-detector cascade (`ssd`, `mtcnn`, `opencv`).
   - Feature Extraction: DeepFace with ArcFace producing 512-dimensional cranial embeddings under `_inference_lock`.
   - Matching: Cosine distance calculation ($d = 1 - \text{cosine\_similarity}$) with partitioned thresholds:
     - Confirmed match: $d \le 0.45$
     - Review candidate: $0.45 < d \le 0.57$
     - Rejected: $d > 0.57$
4. **Session Management & Storage**:
   - Persistent SQLite database (`session_store.sqlite3`) with Write-Ahead Logging (`PRAGMA journal_mode=WAL`) and 30-second busy timeout.
   - Temporary filesystem storage (`temp_storage/<session_id>/`) for uploaded reference portraits, extracted datasets, and generated export ZIPs.
5. **Worker & Concurrency Model**:
   - Asynchronous in-process queue managed by `processing_queue.py` using `concurrent.futures.ThreadPoolExecutor`.
   - Rate limiting via sliding-window token limiter in `rate_limiter.py`.

---

## 2. Initial Git State & Preserved User Work

Prior to this mission, the repository state was established as follows:
- **Branch**: `main`
- **Upstream**: `origin/main` (in sync at `d462778b5058d40b19af33535af463b926057da0`)
- **Author/Date of HEAD**: Mon Oct 5 14:34:58 2026 +0300 (`Officialkid <danielmwalili1@gmail.com>`)
- **Preserved User Modifications**: Existing modifications across upload handlers, dataset retrieval, face recognition, Cloud Run deployment configuration, and frontend components were strictly preserved. No git resets, checkouts, stashes, or commits were executed.

---

## 3. Prioritized Defect Register

| Defect ID | Severity | Affected Component / File | Root Cause | Implemented Repair | Regression Test | Verification |
|---|---|---|---|---|---|---|
| **DEF-01** | **P2** | `image-sorter/backend/app/routers/upload.py` (`upload_dataset_zip`) | Uncaught `DatasetRetrievalError` during zip extraction fell through to generic 500 handler. | Explicitly catch `DatasetRetrievalError`, returning 400 (or 413 if too large). | `test_upload_dataset_zip_rejects_zip_slip_with_400` | **VERIFIED (PASS)** |
| **DEF-02** | **P2** | `image-sorter/backend/app/services/security.py` (`validate_dataset_url_input`) | Incomplete SSRF check in URL validator did not resolve DNS, check decimal IPs, or unmap IPv6. | Refactored validator to delegate to `_is_forbidden_host` from `dataset_retrieval.py`. | `test_security_validate_dataset_url_blocks_decimal_and_mapped_ips` | **VERIFIED (PASS)** |
| **DEF-03** | **P2** | `image-sorter/backend/app/routers/process.py` (`start_processing`) | `selected_face_index` was not validated against `session.detected_reference_faces`, crashing worker asynchronously. | Added synchronous bounds check returning HTTP 400 immediately on invalid index. | `test_process_start_rejects_out_of_bounds_face_index` | **VERIFIED (PASS)** |
| **DEF-04** | **P2** | `image-sorter/backend/app/services/session_store.py` (`_connect`, `_initialize`) | SQLite lacked WAL mode and busy timeout, risking `database is locked` errors during concurrent scans. | Configured `timeout=30.0` and executed `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;`. | `test_session_store_wal_mode_and_timeout` | **VERIFIED (PASS)** |
| **DEF-05** | **P2** | `image-sorter/backend/main.py` (`health`) | Ingress proxies hitting `/api/health` returned 404 because only `/health` was mapped. | Added `@app.get("/api/health")` route decorator. | `test_health_reports_worker_snapshot` & Simulation | **VERIFIED (PASS)** |
| **DEF-06** | **P2** | `image-sorter/frontend/src/components/ReferenceUpload.tsx` | No-face reference photo uploads silently allowed user to proceed to Step 2. | Added UI boundary guard halting progression and displaying error when `detected_faces.length === 0`. | End-to-end simulation step 11 | **VERIFIED (PASS)** |
| **DEF-07** | **P2** | `image-sorter/backend/app/services/face_recognition.py` (`extract_embedding`) | Silent dominant-face fallback switched target identity when specific face crop extraction failed. | Removed fallback; explicitly returns `None` and aborts if selected face crop fails. | `test_target_face_index_no_silent_dominant_fallback` | **VERIFIED (PASS)** |
| **DEF-08** | **P1** | `.github/workflows/cloudrun.yml` | Cloud Run configuration permitted multiple instances without shared database, causing session split-brain. | Set `--max-instances 1` as temporary safeguard until Cloud SQL / GCS are integrated. | Deployment workflow audit | **VERIFIED (PASS)** |

---

## 4. Remediation Details & Root Causes

### 4.1 Safe ZIP Extraction & Error Mapping (DEF-01)
* **Root Cause**: `app/routers/upload.py` called `_safe_extract_zip()` inside a generic `try...except Exception` block. When `_safe_extract_zip()` detected a Zip Slip traversal attempt (`../../evil.jpg`) or an oversized file, it raised `DatasetRetrievalError`. The router logged it as an unexpected server error and responded with HTTP 500 instead of HTTP 400 Bad Request.
* **Remediation**: Added specialized exception handling in `upload_dataset_zip` that maps `DatasetRetrievalError` with `ErrorCode.DATASET_TOO_LARGE` to HTTP 413 and all other archive violations to HTTP 400.
* **Affected Files**: `image-sorter/backend/app/routers/upload.py`.

### 4.2 Comprehensive SSRF Validation (DEF-02)
* **Root Cause**: `app/services/security.py` performed regex and partial IP address checking on `dataset_url`, but lacked DNS resolution, decimal IP conversion (e.g., `http://2130706433/`), and IPv4-mapped IPv6 normalization (`::ffff:127.0.0.1`). Attackers could bypass initial API validation using non-standard IP formats or hostnames resolving to private IPs.
* **Remediation**: Replaced redundant validation logic in `security.py` with `_is_forbidden_host()` from `app/services/dataset_retrieval.py`, ensuring consistent, hardened network boundary protection across both API ingestion and background downloaders.
* **Affected Files**: `image-sorter/backend/app/services/security.py`.

### 4.3 Synchronous Face Selection Bounds Checking (DEF-03)
* **Root Cause**: In `app/routers/process.py`, `request.selected_face_index` was accepted without checking `session.detected_reference_faces`. If a client requested index 99 or a negative number, the API returned 200 OK, queued the job, and subsequently crashed inside the background worker thread.
* **Remediation**: Added validation in `start_processing`: if `selected_face_index` is provided, the API verifies that reference faces were detected and that $0 \le \text{index} < \text{len}(\text{detected\_reference\_faces})$. If out of bounds, it immediately raises HTTP 400.
* **Affected Files**: `image-sorter/backend/app/routers/process.py`.

### 4.4 SQLite Concurrency & Locking Mitigation (DEF-04)
* **Root Cause**: `app/services/session_store.py` used SQLite defaults with a 5-second timeout and default rollback journaling. In high-concurrency scenarios where a background thread was writing scan progress while HTTP requests were polling status, SQLite threw `sqlite3.OperationalError: database is locked`.
* **Remediation**: Configured `timeout=30.0` on connection creation and executed `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;` during initialization. This allows concurrent readers without blocking writes.
* **Affected Files**: `image-sorter/backend/app/services/session_store.py`.

---

## 5. Security and Biometric Privacy Findings

### 5.1 Biometric Data Handling & Retention
1. **Volatile Vector Lifecycles**: 512-dimensional embeddings are generated in memory and serialized into SQLite session records during active processing. Sessions are automatically purged after 2 hours of inactivity (`SESSION_TTL_HOURS = 2`).
2. **Facial Crop Protection**: Thumbnails are stored as Base64 JPEG data URLs inside the session payload rather than exposed on public unauthenticated static endpoints.
3. **No Training or Model Persistence**: Reference faces and event photos are not used for continual training and are not persisted in external model registries.

### 5.2 Network Boundary & CORS Protection
1. **SSRF Defense**: The backend enforces DNS lookups against public resolvers, disallows internal IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254`), prevents IPv6 loopbacks, and inspects HTTP redirect destinations via `SafeRedirectHandler`.
2. **CORS Policy**: Configured in `main.py` with strict regex matching for trusted origins (`localhost`, `127.0.0.1`, and `*.vercel.app`), preventing unauthorized cross-origin requests from stealing session tokens or biometric data.

---

## 6. Database, Storage, and Deployment Constraints

### 6.1 Ephemeral Storage on Containerized Hosting (Cloud Run)
* **Finding**: Limiting Cloud Run to `--max-instances 1` prevents database divergence between multiple concurrent containers, but **does not provide durable storage**.
* **Impact**: When Cloud Run scales to zero due to inactivity, or when Google Cloud recycles the container instance, the local filesystem (`/tmp/` and `temp_storage/session_store.sqlite3`) is wiped. Users returning to active sessions will receive HTTP 404.
* **Production Recommendation**:
  1. Migrate session metadata from SQLite to Google Cloud SQL (PostgreSQL).
  2. Migrate temporary and extracted photo storage to Google Cloud Storage (GCS) buckets with signed download URLs.

---

## 7. Inventory of Modified Files

```
Tracked Files Modified (12):
  .github/workflows/cloudrun.yml
  image-sorter/backend/app/routers/process.py
  image-sorter/backend/app/routers/upload.py
  image-sorter/backend/app/services/dataset_retrieval.py
  image-sorter/backend/app/services/face_recognition.py
  image-sorter/backend/app/services/security.py
  image-sorter/backend/app/services/session_store.py
  image-sorter/backend/main.py
  image-sorter/backend/tests/test_session_and_status.py
  image-sorter/frontend/src/components/ReferenceUpload.tsx
  image-sorter/frontend/src/lib/api.ts
  package.json

Untracked Documentation Files (9):
  docs/engineering/BASELINE_AUDIT.md
  docs/engineering/CTO_AUDIT_REPORT.md
  docs/engineering/DEPLOYMENT_READINESS.md
  docs/engineering/DRILL_3_RELEASE_CANDIDATE_REPORT.md
  docs/engineering/LOCAL_DEVELOPMENT.md
  docs/engineering/RELEASE_CHECKLIST.md
  docs/engineering/SECURITY_AND_PRIVACY.md
  docs/engineering/TEST_REPORT.md
  docs/engineering/MASTER_CTO_AUDIT_AND_REMEDIATION.md
```
