# BASELINE AUDIT — FACEFINDER AI RECOVERY DRILL

**Date:** November 19, 2026  
**Auditor:** Chief Technology Officer / Principal Architect  
**Repository Path:** `c:\Users\DANIEL\Documents\WebApp Projects\facefinderai\facefinder`  
**Git Remote:** `git@github.com:Officialkid/facefinder.git`  
**Current Branch:** `main`  
**Tracking Branch:** `origin/main` (In sync with remote commit `d462778`)  
**Base Commit SHA:** `d462778` (`chore(colab): update Colab notebook with latest git sync and tightened distance threshold`)

---

## 1. GIT BASELINE STATUS

```text
## main...origin/main
 M .github/workflows/cloudrun.yml
 M image-sorter/backend/app/routers/upload.py
 M image-sorter/backend/app/services/dataset_retrieval.py
 M image-sorter/backend/app/services/face_recognition.py
 M image-sorter/backend/main.py
 M image-sorter/backend/tests/test_session_and_status.py
 M image-sorter/frontend/src/lib/api.ts
```

- **Untracked files:** None (`git ls-files --others --exclude-standard` returned empty).
- **Staged changes:** None (`git diff --cached` returned empty).
- **Unpushed commits:** None (local `HEAD` matches `origin/main` at `d462778`).

---

## 2. PRE-EXISTING MODIFICATIONS INVENTORY

The following 7 files contain local, uncommitted improvements implemented prior to this drill:

1. **`.github/workflows/cloudrun.yml`**
   - *Nature of change:* Replaced silent skip warning with explicit `::error::` annotation when `GCP_CREDENTIALS_JSON` secret is missing. Restrained Cloud Run service instances to `--max-instances 1` to prevent state desynchronization across container instances.
2. **`image-sorter/backend/app/routers/upload.py`**
   - *Nature of change:* Added `safe_filename = Path(file.filename).name` sanitization to prevent path traversal during ZIP archive uploads.
3. **`image-sorter/backend/app/services/dataset_retrieval.py`**
   - *Nature of change:* Implemented `_is_forbidden_host()` resolving DNS and rejecting private RFC 1918 subnets, loopback (`127.0.0.1`), link-local, and Google Cloud metadata (`169.254.169.254`).
4. **`image-sorter/backend/app/services/face_recognition.py`**
   - *Nature of change:* Eliminated silent fallback to dominant face in `extract_embedding()`. When a user specifies `target_face_index`, an extraction failure logs an error and returns `None` rather than falling through to auto-select another person.
5. **`image-sorter/backend/main.py`**
   - *Nature of change:* Replaced illegal W3C CORS wildcard `allow_origins=["*"]` + `allow_credentials=True` with explicit domain origins (`localhost:3000`, `127.0.0.1:3000`, `*.vercel.app`) and regex.
6. **`image-sorter/backend/tests/test_session_and_status.py`**
   - *Nature of change:* Added 3 automated regression tests covering SSRF blocking, target-face extraction integrity, and ZIP upload filename sanitization (bringing test suite to 27 tests).
7. **`image-sorter/frontend/src/lib/api.ts`**
   - *Nature of change:* Aligned `uploadDatasetZip` timeout from `120000` (2 min) to `300000` (5 min) matching the global Axios timeout.

---

## 3. RUNTIME ENVIRONMENT INVENTORY

- **Operating System:** Windows 11 Pro (win32, x64)
- **Node.js Runtime:** `v20.20.0`
- **npm Package Manager:** `10.8.2`
- **Python Interpreter:** `Python 3.12.0` (Active virtual environment at `.venv\Scripts\python.exe`)
- **Key Python Packages:** `deepface 0.0.92`, `tf-keras 2.16.0`, `opencv-python-headless 4.9.0`, `fastapi 0.111.0`, `uvicorn 0.30.0`, `pytest 8.3.2`
- **Frontend Framework:** Next.js `14.2.3`, React `18.3.1`, Tailwind CSS `3.4.1`

---

## 4. BASELINE SAFETY RULES IN FORCE

1. No `git push` or remote updates.
2. No `git reset --hard` or destructive checkout.
3. No production deployment to Vercel or Cloud Run.
4. All local user changes preserved.
5. All code and documentation written directly to local working tree.
