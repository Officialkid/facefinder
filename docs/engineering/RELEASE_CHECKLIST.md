# RELEASE CHECKLIST & GATE REQUIREMENTS — FACEFINDER AI

**Project:** FaceFinder AI  
**Gate:** Release Candidate Gate  
**Current Status:** **READY FOR OWNER APPROVAL** (Local & Single-Instance Cloud)  
**Date:** November 19, 2026  

---

## 1. MANDATORY RELEASE CONDITIONS CHECKLIST

- [x] **Local Repository State Inspected:** Clean working tree with only verified fixes staged/modified.
- [x] **User Changes Preserved:** All existing user features, scripts, and documentation intact.
- [x] **Face Recognition Correctness:**
  - Multi-face portrait disambiguation verified.
  - Coordinate scaling matches 1:1 image aspect ratio.
  - Silent fallback to dominant face eradicated.
  - Distance threshold empirically set to `0.45` for balanced precision/recall.
- [x] **Upload & Extraction Safeguards:**
  - ZIP upload timeout set to 300,000ms.
  - Basename path traversal blocked (`Path(name).name`).
  - Zip Slip and Zip bomb checks verified in `_safe_extract_zip`.
- [x] **Remote Retrieval Security:**
  - SSRF protection active against loopback, private RFC 1918 subnets, and cloud metadata (`169.254.169.254`).
  - Redirect handling intercepts HTTP 302 redirects to prohibited IPs.
- [x] **Session & Data Isolation:**
  - SQLite sessions isolated by UUID `session_id`.
  - In-flight active jobs protected from TTL cleanup eviction.
- [x] **Manual Verification UX:**
  - Machine scan completion decoupled from user verification.
  - Explicit "Confirm" / "Reject" controls persist state.
- [x] **Automated Tests Executed:**
  - Backend: 27/27 pytest tests passing (100%).
  - Frontend: `npm run build` completed with 0 errors across 7 routes.
- [x] **Deployment Configuration Inspected:**
  - Cloud Run constrained to `--max-instances 1` to prevent state loss across ephemeral instances.
  - GitHub Actions updated to prevent silent bypass when credentials are missing.
- [x] **No Code Pushed or Deployed:** Repository remains 100% local until owner provides explicit authorization.

---

## 2. PROPOSED COMMIT & PUSH PLAN (PENDING OWNER APPROVAL)

### Target Branch: `main`
Proposed commit message:
```text
fix: harden face recognition, upload timeouts, ssrf protection, and cors compliance

- Prevent silent dominant face fallback on targeted face extraction failure
- Align frontend uploadDatasetZip timeout to 300s
- Sanitize ZIP upload filenames to prevent directory traversal
- Add SSRF and 302 redirect protection against loopback/private/metadata IPs
- Align CORS configuration with W3C standards (no wildcard with credentials)
- Restrict Cloud Run deployment to single instance to ensure session affinity
- Clean root package.json scripts and add 3 new regression tests (27/27 passing)
- Add comprehensive engineering documentation suite under docs/engineering/
```
