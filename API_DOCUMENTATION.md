# FaceFinder API Documentation

## 🏗️ Architecture Overview

**Design Philosophy**: Stateless, ephemeral, scalable

- **No permanent storage** - All data is temporary
- **Session-based processing** - Each search gets a unique session ID
- **Auto-cleanup** - Data expires after 1 hour
- **Horizontal scaling** - Stateless design allows multiple instances

---

## 🔧 Technology Stack

- **Runtime**: Node.js / Python (FastAPI)
- **Storage**: Redis (temporary, TTL-based)
- **Queue**: Bull/Celery (async processing)
- **Face Recognition**: face-recognition library / AWS Rekognition
- **File Storage**: S3 (with lifecycle policy for auto-deletion)

---

## 📡 API Endpoints

### Base URL
```
Production: https://api.facefinder.ai/v1
Development: http://localhost:8000/v1
```

### Authentication
```http
Authorization: Bearer <api_key>
```

---

## 1️⃣ Upload Reference Image

### `POST /upload`

Upload the reference face image to search for.

#### Request

**Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <api_key>
```

**Body:**
```http
POST /v1/upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="image"; filename="face.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundary--
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Reference face image (JPG, PNG, WEBP) |
| max_size | Integer | No | Max file size in MB (default: 10) |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6",
    "image_id": "img_x7y8z9w0v1u2",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "expires_at": "2024-01-15T11:30:00Z",
    "metadata": {
      "filename": "face.jpg",
      "size": 2457600,
      "format": "jpeg",
      "dimensions": {
        "width": 1920,
        "height": 1080
      }
    },
    "validation": {
      "faces_detected": 1,
      "face_quality": "high",
      "confidence": 0.98
    }
  },
  "message": "Image uploaded successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "No face detected in the uploaded image",
    "details": {
      "faces_detected": 0,
      "suggestion": "Please upload an image with a clear, visible face"
    }
  }
}
```

**Error (413 Payload Too Large):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size",
    "details": {
      "file_size": 15728640,
      "max_size": 10485760,
      "suggestion": "Please upload an image smaller than 10MB"
    }
  }
}
```

**Error (415 Unsupported Media Type):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Unsupported file format",
    "details": {
      "provided_format": "pdf",
      "supported_formats": ["jpg", "jpeg", "png", "webp"]
    }
  }
}
```

---

## 2️⃣ Start Processing

### `POST /process`

Start searching for the reference face in the provided dataset.

#### Request

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <api_key>
```

**Body:**
```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "dataset_url": "https://example.com/images/dataset.zip",
  "options": {
    "confidence_threshold": 0.75,
    "max_results": 100,
    "include_metadata": true,
    "sort_by": "confidence"
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| session_id | String | Yes | Session ID from upload response |
| dataset_url | String | Yes | Public URL to dataset (ZIP, folder, or API) |
| options.confidence_threshold | Float | No | Minimum confidence (0.0-1.0, default: 0.75) |
| options.max_results | Integer | No | Maximum matches to return (default: 100) |
| options.include_metadata | Boolean | No | Include image metadata (default: true) |
| options.sort_by | String | No | Sort results by: confidence, filename, date |

#### Response

**Success (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "session_id": "sess_a1b2c3d4e5f6",
    "status": "processing",
    "created_at": "2024-01-15T10:31:00Z",
    "estimated_time": 45,
    "progress": {
      "current": 0,
      "total": 100,
      "percentage": 0,
      "phase": "initializing"
    },
    "dataset": {
      "url": "https://example.com/images/dataset.zip",
      "size": 524288000,
      "estimated_images": 1247
    }
  },
  "message": "Processing started successfully"
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session ID not found or expired",
    "details": {
      "session_id": "sess_invalid123",
      "suggestion": "Please upload a new reference image"
    }
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATASET_URL",
    "message": "Cannot access the provided dataset URL",
    "details": {
      "url": "https://example.com/404",
      "status_code": 404,
      "suggestion": "Verify the URL is publicly accessible"
    }
  }
}
```

---

## 3️⃣ Get Processing Status

### `GET /process/:job_id`

Check the status of an ongoing processing job.

#### Request

**Headers:**
```http
Authorization: Bearer <api_key>
```

**URL:**
```
GET /v1/process/job_m9n8b7v6c5x4
```

#### Response

**Success (200 OK) - Processing:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "session_id": "sess_a1b2c3d4e5f6",
    "status": "processing",
    "progress": {
      "current": 623,
      "total": 1247,
      "percentage": 50,
      "phase": "searching",
      "phase_message": "Searching dataset...",
      "time_elapsed": 23,
      "time_remaining": 22
    },
    "stats": {
      "images_processed": 623,
      "matches_found": 8,
      "errors": 2
    }
  }
}
```

**Success (200 OK) - Completed:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "session_id": "sess_a1b2c3d4e5f6",
    "status": "completed",
    "completed_at": "2024-01-15T10:31:47Z",
    "progress": {
      "current": 1247,
      "total": 1247,
      "percentage": 100,
      "phase": "complete"
    },
    "stats": {
      "images_processed": 1247,
      "matches_found": 12,
      "errors": 3,
      "processing_time": 47
    },
    "results_url": "/v1/results/job_m9n8b7v6c5x4"
  }
}
```

**Success (200 OK) - Failed:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "status": "failed",
    "failed_at": "2024-01-15T10:31:30Z",
    "error": {
      "code": "DATASET_DOWNLOAD_FAILED",
      "message": "Failed to download dataset",
      "details": "Connection timeout after 30 seconds"
    }
  }
}
```

---

## 4️⃣ Get Results

### `GET /results/:job_id`

Retrieve the matching results from a completed job.

#### Request

**Headers:**
```http
Authorization: Bearer <api_key>
```

**URL:**
```
GET /v1/results/job_m9n8b7v6c5x4?page=1&limit=20&min_confidence=0.8
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | Integer | No | Page number (default: 1) |
| limit | Integer | No | Results per page (default: 20, max: 100) |
| min_confidence | Float | No | Filter by minimum confidence (0.0-1.0) |
| sort | String | No | Sort by: confidence, filename, date |
| order | String | No | Order: asc, desc (default: desc) |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "session_id": "sess_a1b2c3d4e5f6",
    "total_matches": 12,
    "page": 1,
    "limit": 20,
    "total_pages": 1,
    "matches": [
      {
        "match_id": "match_1a2b3c4d",
        "confidence": 0.98,
        "confidence_level": "high",
        "image": {
          "filename": "image_0234.jpg",
          "url": "https://cdn.facefinder.ai/temp/sess_a1b2c3d4e5f6/image_0234.jpg",
          "thumbnail_url": "https://cdn.facefinder.ai/temp/sess_a1b2c3d4e5f6/thumb_image_0234.jpg",
          "expires_at": "2024-01-15T11:30:00Z"
        },
        "metadata": {
          "size": 1048576,
          "format": "jpeg",
          "dimensions": {
            "width": 1920,
            "height": 1080
          },
          "captured_at": "2024-01-10T14:23:00Z"
        },
        "face_location": {
          "top": 245,
          "right": 890,
          "bottom": 645,
          "left": 490
        }
      },
      {
        "match_id": "match_5e6f7g8h",
        "confidence": 0.94,
        "confidence_level": "high",
        "image": {
          "filename": "image_0567.jpg",
          "url": "https://cdn.facefinder.ai/temp/sess_a1b2c3d4e5f6/image_0567.jpg",
          "thumbnail_url": "https://cdn.facefinder.ai/temp/sess_a1b2c3d4e5f6/thumb_image_0567.jpg",
          "expires_at": "2024-01-15T11:30:00Z"
        },
        "metadata": {
          "size": 987654,
          "format": "jpeg",
          "dimensions": {
            "width": 1280,
            "height": 720
          },
          "captured_at": "2024-01-12T09:15:00Z"
        },
        "face_location": {
          "top": 120,
          "right": 560,
          "bottom": 440,
          "left": 240
        }
      }
    ],
    "summary": {
      "high_confidence": 8,
      "medium_confidence": 3,
      "low_confidence": 1,
      "processing_time": 47,
      "images_scanned": 1247
    }
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job ID not found or results expired",
    "details": {
      "job_id": "job_invalid123",
      "suggestion": "Results are available for 1 hour after completion"
    }
  }
}
```

**Error (425 Too Early):**
```json
{
  "success": false,
  "error": {
    "code": "JOB_NOT_COMPLETED",
    "message": "Job is still processing",
    "details": {
      "job_id": "job_m9n8b7v6c5x4",
      "status": "processing",
      "progress": 67,
      "suggestion": "Poll /process/:job_id for status updates"
    }
  }
}
```

---

## 5️⃣ Download Match

### `GET /download/:match_id`

Download a specific matched image.

#### Request

**Headers:**
```http
Authorization: Bearer <api_key>
```

**URL:**
```
GET /v1/download/match_1a2b3c4d
```

#### Response

**Success (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Disposition: attachment; filename="image_0234.jpg"
Content-Length: 1048576

<binary image data>
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "MATCH_NOT_FOUND",
    "message": "Match ID not found or expired"
  }
}
```

---

## 6️⃣ Cancel Job

### `DELETE /process/:job_id`

Cancel an ongoing processing job.

#### Request

**Headers:**
```http
Authorization: Bearer <api_key>
```

**URL:**
```
DELETE /v1/process/job_m9n8b7v6c5x4
```

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "status": "cancelled",
    "cancelled_at": "2024-01-15T10:31:30Z",
    "progress": {
      "percentage": 45,
      "images_processed": 561
    }
  },
  "message": "Job cancelled successfully"
}
```

---

## 7️⃣ Bulk Download

### `POST /download/bulk`

Download multiple matches as a ZIP file.

#### Request

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <api_key>
```

**Body:**
```json
{
  "job_id": "job_m9n8b7v6c5x4",
  "match_ids": [
    "match_1a2b3c4d",
    "match_5e6f7g8h",
    "match_9i0j1k2l"
  ],
  "include_metadata": true,
  "format": "zip"
}
```

#### Response

**Success (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="facefinder_matches_job_m9n8b7v6c5x4.zip"
Content-Length: 5242880

<binary zip data>
```

---

## 8️⃣ Health Check

### `GET /health`

Check API health status.

#### Request

```
GET /v1/health
```

#### Response

**Success (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "api": "operational",
    "redis": "operational",
    "queue": "operational",
    "storage": "operational"
  },
  "stats": {
    "active_jobs": 23,
    "queued_jobs": 5,
    "completed_today": 1247
  }
}
```

---

## 🔐 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_IMAGE | 400 | No face detected or invalid image |
| FILE_TOO_LARGE | 413 | File exceeds size limit |
| INVALID_FORMAT | 415 | Unsupported file format |
| SESSION_NOT_FOUND | 404 | Session expired or invalid |
| INVALID_DATASET_URL | 400 | Cannot access dataset URL |
| JOB_NOT_FOUND | 404 | Job ID not found |
| JOB_NOT_COMPLETED | 425 | Job still processing |
| MATCH_NOT_FOUND | 404 | Match ID not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| UNAUTHORIZED | 401 | Invalid or missing API key |
| INTERNAL_ERROR | 500 | Server error |

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /upload | 10 requests | 1 minute |
| /process | 5 requests | 1 minute |
| /results | 100 requests | 1 minute |
| /download | 50 requests | 1 minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705315860
```

---

## 🔄 Webhooks (Optional)

Subscribe to job completion events.

### Configuration

```json
{
  "webhook_url": "https://your-app.com/webhooks/facefinder",
  "events": ["job.completed", "job.failed"]
}
```

### Payload

```json
{
  "event": "job.completed",
  "timestamp": "2024-01-15T10:31:47Z",
  "data": {
    "job_id": "job_m9n8b7v6c5x4",
    "session_id": "sess_a1b2c3d4e5f6",
    "status": "completed",
    "matches_found": 12,
    "processing_time": 47,
    "results_url": "https://api.facefinder.ai/v1/results/job_m9n8b7v6c5x4"
  }
}
```

---

## 🧪 Example Usage

### JavaScript (Fetch API)

```javascript
// 1. Upload reference image
const formData = new FormData()
formData.append('image', fileInput.files[0])

const uploadResponse = await fetch('https://api.facefinder.ai/v1/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
})

const { data: { session_id } } = await uploadResponse.json()

// 2. Start processing
const processResponse = await fetch('https://api.facefinder.ai/v1/process', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id,
    dataset_url: 'https://example.com/dataset.zip',
    options: {
      confidence_threshold: 0.75,
      max_results: 100
    }
  })
})

const { data: { job_id } } = await processResponse.json()

// 3. Poll for status
const pollStatus = async () => {
  const statusResponse = await fetch(
    `https://api.facefinder.ai/v1/process/${job_id}`,
    {
      headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
    }
  )
  
  const { data } = await statusResponse.json()
  
  if (data.status === 'completed') {
    return data
  } else if (data.status === 'failed') {
    throw new Error(data.error.message)
  }
  
  // Poll again in 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000))
  return pollStatus()
}

const result = await pollStatus()

// 4. Get results
const resultsResponse = await fetch(
  `https://api.facefinder.ai/v1/results/${job_id}`,
  {
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
  }
)

const { data: { matches } } = await resultsResponse.json()
console.log(`Found ${matches.length} matches`)
```

### Python (Requests)

```python
import requests
import time

API_KEY = 'YOUR_API_KEY'
BASE_URL = 'https://api.facefinder.ai/v1'
headers = {'Authorization': f'Bearer {API_KEY}'}

# 1. Upload reference image
with open('face.jpg', 'rb') as f:
    files = {'image': f}
    response = requests.post(f'{BASE_URL}/upload', headers=headers, files=files)
    session_id = response.json()['data']['session_id']

# 2. Start processing
payload = {
    'session_id': session_id,
    'dataset_url': 'https://example.com/dataset.zip',
    'options': {
        'confidence_threshold': 0.75,
        'max_results': 100
    }
}
response = requests.post(f'{BASE_URL}/process', headers=headers, json=payload)
job_id = response.json()['data']['job_id']

# 3. Poll for status
while True:
    response = requests.get(f'{BASE_URL}/process/{job_id}', headers=headers)
    data = response.json()['data']
    
    if data['status'] == 'completed':
        break
    elif data['status'] == 'failed':
        raise Exception(data['error']['message'])
    
    print(f"Progress: {data['progress']['percentage']}%")
    time.sleep(2)

# 4. Get results
response = requests.get(f'{BASE_URL}/results/{job_id}', headers=headers)
matches = response.json()['data']['matches']
print(f"Found {len(matches)} matches")
```

---

## 🗄️ Data Retention

- **Uploaded images**: 1 hour
- **Processing results**: 1 hour after completion
- **Session data**: 1 hour from creation
- **Temporary files**: Auto-deleted after TTL

---

## 🔒 Security

- **HTTPS only** - All endpoints require TLS
- **API key authentication** - Bearer token required
- **Rate limiting** - Prevent abuse
- **Input validation** - Sanitize all inputs
- **CORS** - Configurable origins
- **No data persistence** - Privacy by design

---

Built for stateless, ephemeral facial recognition processing 🚀
