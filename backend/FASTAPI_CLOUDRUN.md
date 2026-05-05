# FaceFinder FastAPI Backend (Cloud Run Ready)

## Endpoints

- `GET /health`
- `POST /process`

## Example request

```bash
curl -X POST "http://localhost:8000/process" \
  -F "reference_image=@./reference.jpg" \
  -F "dataset_link=https://example.com/dataset.zip" \
  -F "threshold=0.85" \
  -F "include_previews=true" \
  -F "max_results=25"
```

## Example success response

```json
{
  "request_id": "9cf70f6f-c6e5-44ce-80a1-95fa6ce6d4df",
  "message": "Processing complete.",
  "threshold": 0.85,
  "matches_found": 2,
  "matches": [
    {
      "image_id": "f6ca524d-99e7-4ca6-93a6-9a4504c3e9f0.jpg",
      "source_url": null,
      "confidence": 0.913842,
      "matched_face_count": 1,
      "preview_base64": "data:image/jpeg;base64,/9j/4AAQSk..."
    }
  ]
}
```

## Example error response

```json
{
  "error_code": "INVALID_DATASET_LINK",
  "message": "Dataset link must start with http:// or https://.",
  "details": {
    "dataset_link": "ftp://example.com/photos"
  },
  "timestamp": "2026-05-06T12:00:00.000000+00:00"
}
```

## Local run

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Docker build and run

```bash
docker build -t facefinder-backend .
docker run --rm -p 8000:8000 -e PORT=8000 facefinder-backend
```

## Google Cloud Run deploy

1. Set variables:

```bash
PROJECT_ID="your-gcp-project"
REGION="us-central1"
REPOSITORY="facefinder"
SERVICE_NAME="facefinder-api"
IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/facefinder-backend:latest"
```

2. Create Artifact Registry repository (one-time):

```bash
gcloud artifacts repositories create $REPOSITORY \
  --repository-format=docker \
  --location=$REGION
```

3. Build and push image:

```bash
gcloud auth configure-docker $REGION-docker.pkg.dev
docker build -t $IMAGE_URI .
docker push $IMAGE_URI
```

4. Deploy to Cloud Run:

```bash
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

## Stateless privacy guarantees

- Every request runs inside a unique temporary workspace under `/tmp`.
- Reference and dataset files are deleted automatically after each response.
- No persistent database or long-term storage is used.
