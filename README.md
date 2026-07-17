# FaceFinder AI Workspace

This repository now centers on `FaceFinder AI` as the single active product.

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

- legacy Facefinder code removed
- live processing progress/status contract improved
- persistent session storage kept as backend truth
- dataset download and archive handling hardened
- Google Photos, Pixieset, and Pixabay gallery-provider support added
- orientation and low-quality image fallback handling improved
- frontend product name updated to `FaceFinder AI`

Remaining external requirement before public deployment:

- valid Vercel authentication on this machine
- valid Google Cloud authentication on this machine
