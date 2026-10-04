param(
    [string]$ServiceName = "facefinder-backend",
    [string]$Region = "us-central1"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Deploying FaceFinder AI Backend to Cloud Run" -ForegroundColor Cyan
Write-Host " Service: $ServiceName" -ForegroundColor Yellow
Write-Host " Region:  $Region" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

gcloud run deploy $ServiceName `
  --source . `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 2 `
  --timeout 1800 `
  --port 8080

Write-Host "Deployment complete! Your live Cloud Run backend URL is shown above." -ForegroundColor Green
