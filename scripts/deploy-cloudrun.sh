#!/usr/bin/env bash
set -e

SERVICE_NAME="${1:-facefinder-backend}"
REGION="${2:-us-central1}"

echo "=========================================="
echo " Deploying FaceFinder AI Backend to Cloud Run"
echo " Service: $SERVICE_NAME"
echo " Region:  $REGION"
echo "=========================================="

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 1800 \
  --port 8080

echo "Deployment complete! Cloud Run URL printed above."
