# FaceFinder AI — Release Readiness Evaluation

**Document ID:** `DOC-REL-2026-MASTER-001`  
**Execution Date:** 2026-11-19  
**Repository:** `https://github.com/Officialkid/facefinder`  
**Current Branch:** `main` (at commit `d462778b5058d40b19af33535af463b926057da0`)  
**Release Target:** Release Candidate 1 (RC1)  
**Overall Verdict:** **CONDITIONALLY READY (LOCAL / SINGLE-INSTANCE CLOUD ONLY; BLOCKED FOR MULTI-INSTANCE AUTO-SCALING)**

---

## 1. Capability Verification Status

### 1.1 Verified Capabilities [VERIFIED]
- **Reference Image Ingestion & Multi-Face Detection**: Successfully isolates multiple faces, computes bounding boxes, extracts padded portrait crops, and generates base64 avatar previews.
- **Biometric Locking**: Guarantees that ArcFace embedding generation adheres strictly to the user-selected face index without falling back to dominant faces.
- **Zero-Face Upload Guard**: Halts workflow immediately on Step 1 if an uploaded portrait contains 0 detectable human faces.
- **ZIP Upload & Traversal Defense**: Safely parses and unpacks ZIP archives up to 300MB, strips malicious path components (Zip Slip), enforces file count limits (1,000 files), and maps extraction errors to HTTP 400/413.
- **SSRF Network Boundary**: Rejects access to localhost, private RFC1918 ranges, cloud link-local metadata (169.254.169.254), IPv6 loopbacks, IPv4-mapped IPv6, and decimal integer IP addresses.
- **Partitioned Results & Manual Confirmation**: Distinguishes verified matches ($d \le 0.45$) from candidates ($0.45 < d \le 0.57$) and allows user confirmation before export.
- **Export Packaging**: Generates ranked ZIP streams containing confirmed photos.
- **Session Isolation & Rate Limiting**: Enforces session-scoped temp directories and rate limits uploads and process starts.

### 1.2 Partially Verified Capabilities [PARTIALLY VERIFIED]
- **ArcFace Recognition Threshold (`0.45`)**: Effective for clean, front-facing test photos. However, it is classified as **PROVISIONAL** because it has not yet been benchmarked against a standardized, multi-subject, multi-demographic event dataset.
- **Remote Gallery Retrieval**: Connectors for Google Photos, Pixieset, and direct image URLs function against public test fixtures, but third-party UI/DOM changes on proprietary platforms can disrupt scraping without warning.

### 1.3 Unverified Capabilities [NOT VERIFIED]
- **Production Biometric Accuracy SLAs**: Claims of "100% accuracy / 0% false positives" are unverified and retracted until formal evaluations against datasets such as LFW or an annotated 500-subject gallery are completed.
- **Multi-Tenant Concurrent Load**: Performance under $\ge 50$ concurrent heavy event scans has not been tested on cloud hardware.

---

## 2. Operational Limitations & Blockers

### 2.1 Production Blockers [BLOCKED for Multi-Instance Auto-Scaling]
- **BLOCKED: Multi-Instance Cloud Run**:
  - *Constraint*: Cloud Run instances do not share local filesystem storage or SQLite database files. Running $\ge 2$ instances causes split-brain session failures (users querying status get 404 if hitting a different container).
  - *Remediation*:
    1. Deploy Google Cloud SQL (PostgreSQL) for centralized session metadata.
    2. Deploy Google Cloud Storage (GCS) for uploaded reference portraits, event ZIPs, and result archives.
    3. Adopt Google Cloud Tasks or Celery/Redis for decoupled background scanning workers.

---

## 3. Environment Configuration & Setup Instructions

### 3.1 Local Development Environment
```bash
# 1. Install root workspace dependencies
npm install

# 2. Run backend automated tests
npm run backend:test

# 3. Start local development servers (Frontend: port 3000, Backend: port 8000)
# Terminal 1 (Backend):
cd image-sorter/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 (Frontend):
cd image-sorter/frontend
npm install
npm run dev
```

### 3.2 Required Environment Variables
| Variable Name | Required By | Default / Example Value | Description |
|---|---|---|---|
| `ALLOWED_ORIGINS` | Backend | `http://localhost:3000,https://facefinder.vercel.app` | Comma-separated list of allowed CORS origins. |
| `IMAGE_SORTER_TEMP_DIR` | Backend | `temp_storage/` | Base directory for temporary session files. |
| `IMAGE_SORTER_SESSION_DB`| Backend | `temp_storage/session_store.sqlite3` | Filepath for SQLite session database. |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8000` (Local) / Cloud Run URL (Prod) | Base URL for FastAPI backend. |

---

## 4. Rollback & Staging Considerations

- **Single Release Candidate**: All changes are confined to the local working directory. If a rollback is needed prior to release, `git restore` on any individual file will return it to the `origin/main` baseline at `d462778`.
- **Pre-Push Review**: Ensure the 12 modified files are reviewed line-by-line with the project owner before any commit or push is initiated.
