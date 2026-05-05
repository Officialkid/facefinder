# FaceFinder Deployment Guide

## Architecture

- Frontend: Next.js on Vercel
- Backend: FastAPI container on Google Cloud Run
- CI/CD: GitHub Actions

---

## 1) Deploy Backend to Google Cloud Run

### Prerequisites

- Google Cloud project
- Artifact Registry enabled
- Cloud Run enabled
- `gcloud` installed and authenticated

### Build and push container

```bash
PROJECT_ID="your-gcp-project"
REGION="us-central1"
REPOSITORY="facefinder"
IMAGE="facefinder-backend"
IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE:latest"

gcloud artifacts repositories create $REPOSITORY --repository-format=docker --location=$REGION || true
gcloud auth configure-docker $REGION-docker.pkg.dev
docker build -t $IMAGE_URI .
docker push $IMAGE_URI
```

### Deploy service

```bash
SERVICE_NAME="facefinder-api"

gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URI \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8000 \
  --memory 2Gi \
  --timeout 900 \
  --min-instances 0 \
  --max-instances 5
```

### Verify

```bash
curl https://YOUR_CLOUD_RUN_URL/health
```

---

## 2) Deploy Frontend to Vercel

### Vercel project setup

- Import this GitHub repo in Vercel.
- Set Framework Preset to Next.js.
- Add environment variable:
  - `NEXT_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL`

### Production deploy

- Push to `main` branch to trigger Vercel deployment.

---

## 3) GitHub Actions CI/CD

This repo now includes:

- `.github/workflows/cloudrun.yml`
  - Builds Docker image
  - Pushes to Artifact Registry
  - Optional Cloud Run deploy (controlled by secret `CLOUD_RUN_DEPLOY=true`)

- `.github/workflows/frontend-vercel.yml`
  - Deploys frontend to Vercel on `main`

### Required GitHub secrets

#### For Cloud Run workflow

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`
- `CLOUD_RUN_SERVICE`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `CLOUD_RUN_DEPLOY` (`true` to enable auto-deploy)

#### For Vercel workflow

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 4) Stateless Privacy Compliance

- Backend writes only to temporary request-scoped directories.
- Temporary files are deleted after each request.
- No permanent user images or embeddings are stored.
