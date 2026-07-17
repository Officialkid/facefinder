# FaceFinder AI Deployment Guide

FaceFinder AI deploys as two pieces:

- Frontend: `image-sorter/frontend`
- Backend: `image-sorter/backend`

## Frontend

- Built with Next.js
- Deployed to Vercel
- Root `vercel.json` rewrites `/api/:path*` to the backend service

Local verification:

```powershell
npm run build
```

## Backend

- Built from the root `Dockerfile`
- Serves the upload, processing, status, and results APIs
- Must be deployed separately from the frontend because the Vercel app proxies API traffic to it

Local verification:

```powershell
.venv\Scripts\python.exe image-sorter\backend\tests\test_session_and_status.py
```

## Deployment Blockers

The codebase is ready for deployment, but this machine still needs:

- a valid Vercel login or deploy token
- a valid Google Cloud login or deployment credential

Without those two credentials, the latest FaceFinder AI changes cannot be pushed live from this workspace.
