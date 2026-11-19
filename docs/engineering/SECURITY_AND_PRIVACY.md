# SECURITY & BIOMETRIC PRIVACY REVIEW — FACEFINDER AI

**Project:** FaceFinder AI  
**Author:** Application Security & Compliance Lead / CTO  
**Date:** November 19, 2026  
**Status:** Post-Verification Hardened  

---

## 1. THREAT MODEL & VERIFIED SECURITY CONTROLS

### 1.1 Archive Upload & Safe Extraction
- **Path Traversal Protection:** Base filenames are sanitized using `Path(file.filename).name`. In `_safe_extract_zip()`, all member destination paths are resolved and verified to reside inside `destination_root`.
- **Resource Limits & Zip Bomb Defense:**
  - Maximum upload size: 300MB (`HTTP 413 Payload Too Large`).
  - Maximum archive file count: 10,000 files.
  - Maximum uncompressed member size: 100MB.
  - Maximum uncompressed total size: 750MB (`ErrorCode.DATASET_TOO_LARGE`).
  - Symlink entries (`0o120000`) are rejected immediately.
- **Fail-Safe Disk Cleanup:** All temporary archive files (`uploaded_dataset_*.zip`) and staging folders (`dataset_staging/`) are cleaned up in a `finally` block in `upload.py`, ensuring zero orphaned files remain if extraction fails.

### 1.2 SSRF Protection & Network Boundary Controls
- **IP Address Validation:** In `dataset_retrieval.py`:
  - `_is_forbidden_host()` checks domain names and resolved IP addresses against loopback (`127.0.0.0/8`, `::1`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), cloud metadata (`169.254.169.254`, `metadata.google.internal`), multicast, unspecified (`0.0.0.0`), IPv4-mapped IPv6 (`::ffff:...`), and integer IP formats.
- **Redirect Protection:** Standard `urllib.request` automatically follows HTTP 301/302 redirects. `SafeRedirectHandler` intercepts all redirect requests and re-validates the new destination URL against `_validate_remote_url()` before the connection proceeds.
- **DNS Rebinding Limitation (Honest Disclosure):**
  - In standard Python `urllib`, DNS resolution occurs first during validation, and separately during the socket connection in `http.client`.
  - If an adversary deploys a custom authoritative DNS server returning a public IP with `TTL=0` on the first lookup and `169.254.169.254` on the second lookup, DNS rebinding is theoretically possible.
  - Full mitigation requires socket-level IP connection pinning (e.g. using a custom transport adapter or `requests`/`httpx` with pre-resolved IP connections). This is documented as an architectural roadmap item.

### 1.3 CORS & Client Access Policy
- **W3C Standards Compliance:** The backend no longer uses wildcard `allow_origins=["*"]` with `allow_credentials=True`.
- **Restricted Preview Policy:** Origin regex is strictly scoped to the project's own Vercel namespace:
  - `^https?://(localhost|127\.0\.0\.1|(facefinder(-[a-zA-Z0-9_-]+)?\.vercel\.app))(:\d+)?$`
  - Arbitrary third-party `.vercel.app` applications cannot perform credentialed requests against the backend.

---

## 2. BIOMETRIC DATA LIFECYCLE & PRIVACY COMPLIANCE

### 2.1 Data Ingestion & Storage Architecture
- **Reference Faces:** Uploaded to session-isolated local directory `temp_storage/{session_id}/reference.jpg`.
- **Target Face Crops:** Extracted to memory / base64 thumbnails for UI display.
- **Biometric Vectors:** 512-dimensional ArcFace neural vectors stored in SQLite `sessions` table.
- **Event Photos:** Extracted to `temp_storage/{session_id}/dataset/`.

### 2.2 Retention & Deletion Policy
- An asynchronous background cleanup scheduler (`cleanup_scheduler` in `main.py`) executes hourly.
- Sessions whose `last_updated_at` timestamp is older than `SESSION_TTL_HOURS` (4 hours) are purged:
  1. The database row in SQLite `sessions` is deleted.
  2. The entire directory tree `temp_storage/{session_id}` is recursively removed from disk.
- Active jobs that are actively processing continue updating their `last_updated_at` heartbeat and are not evicted.

### 2.3 Regulatory & Governance Notes
- Under Kenya's Data Protection Act (2019) and GDPR, facial vectors constitute sensitive biometric data.
- Recommended enhancements:
  1. Add an explicit consent modal on reference upload informing users that vectors are used solely for album comparison and destroyed within 4 hours.
  2. Provide a user-facing "Delete My Data Now" button to trigger instantaneous session deletion on demand.
