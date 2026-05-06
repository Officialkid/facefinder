# FaceFinder Backend Processing Pipeline

## 🏗️ System Architecture Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Layer  │─────▶│Queue/Worker │─────▶│   Storage   │
│  (Browser)  │      │  (Express)  │      │   (Bull)    │      │   (Redis)   │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
                            │                     │                     │
                            │                     │                     │
                            ▼                     ▼                     ▼
                     ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
                     │  Validator  │      │Face Recog.  │      │  Cleanup    │
                     │   Service   │      │   Engine    │      │   Service   │
                     └─────────────┘      └─────────────┘      └─────────────┘
```

---

## 📋 Processing Pipeline (7 Steps)

### **Step 1: Receive & Validate Input**

#### **1.1 API Request Handler**
```javascript
POST /api/v1/process
{
  "session_id": "sess_abc123",
  "dataset_url": "https://example.com/dataset.zip",
  "options": {
    "confidence_threshold": 0.75,
    "max_results": 100
  }
}
```

#### **1.2 Validation Checks**
```javascript
async function validateRequest(req) {
  // Check session exists
  const session = await redis.get(`session:${req.session_id}`)
  if (!session) throw new Error('SESSION_EXPIRED')
  
  // Validate dataset URL
  const urlValid = await validateUrl(req.dataset_url)
  if (!urlValid) throw new Error('INVALID_DATASET_URL')
  
  // Check rate limits
  const rateLimitOk = await checkRateLimit(req.user_id)
  if (!rateLimitOk) throw new Error('RATE_LIMIT_EXCEEDED')
  
  // Validate options
  if (req.options.confidence_threshold < 0 || req.options.confidence_threshold > 1) {
    throw new Error('INVALID_CONFIDENCE_THRESHOLD')
  }
  
  return true
}
```

#### **1.3 Create Job**
```javascript
const job = await queue.add('face-matching', {
  job_id: generateId('job'),
  session_id: req.session_id,
  dataset_url: req.dataset_url,
  reference_image_path: session.image_path,
  options: req.options,
  created_at: Date.now()
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 }, // 1 hour
  removeOnFail: { age: 3600 }
})

// Store job metadata
await redis.setex(
  `job:${job.id}`,
  3600, // 1 hour TTL
  JSON.stringify({
    status: 'queued',
    progress: 0,
    created_at: Date.now()
  })
)

return { job_id: job.id }
```

**Memory Impact**: Minimal (~1KB per job)  
**Error Handling**: Validation errors return 400, system errors return 500

---

### **Step 2: Download Dataset**

#### **2.1 Initialize Worker**
```javascript
queue.process('face-matching', async (job) => {
  const { job_id, dataset_url, session_id } = job.data
  
  // Update status
  await updateJobStatus(job_id, 'downloading', 0)
  
  // Create temporary directory
  const tempDir = `/tmp/facefinder/${job_id}`
  await fs.mkdir(tempDir, { recursive: true })
  
  try {
    // Download dataset
    const datasetPath = await downloadDataset(dataset_url, tempDir, job)
    
    // Extract if ZIP
    if (datasetPath.endsWith('.zip')) {
      await extractZip(datasetPath, tempDir, job)
    }
    
    // Proceed to next step
    return await processImages(job, tempDir)
    
  } catch (error) {
    // Cleanup on error
    await cleanup(tempDir)
    throw error
  }
})
```

#### **2.2 Download with Progress**
```javascript
async function downloadDataset(url, destDir, job) {
  const destPath = path.join(destDir, 'dataset.zip')
  const writer = fs.createWriteStream(destPath)
  
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 300000, // 5 min timeout
    maxContentLength: 5 * 1024 * 1024 * 1024, // 5GB max
  })
  
  const totalSize = parseInt(response.headers['content-length'], 10)
  let downloadedSize = 0
  
  response.data.on('data', (chunk) => {
    downloadedSize += chunk.length
    const progress = Math.floor((downloadedSize / totalSize) * 25) // 0-25%
    
    // Update progress every 5%
    if (progress % 5 === 0) {
      updateJobProgress(job.data.job_id, progress, 'downloading')
    }
  })
  
  response.data.pipe(writer)
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(destPath))
    writer.on('error', reject)
  })
}
```

#### **2.3 Extract ZIP**
```javascript
async function extractZip(zipPath, destDir, job) {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  
  let extracted = 0
  const total = entries.length
  
  for (const entry of entries) {
    if (!entry.isDirectory && isImageFile(entry.entryName)) {
      zip.extractEntryTo(entry, destDir, false, true)
      extracted++
      
      // Update progress 25-50%
      const progress = 25 + Math.floor((extracted / total) * 25)
      if (extracted % 10 === 0) {
        await updateJobProgress(job.data.job_id, progress, 'extracting')
      }
    }
  }
  
  // Delete ZIP to free space
  await fs.unlink(zipPath)
  
  return destDir
}
```

**Memory Impact**: Streaming download (~10MB buffer), ZIP extraction (~50MB peak)  
**Disk Usage**: Dataset size (auto-cleaned after 1 hour)  
**Error Handling**: Network errors retry 3x with exponential backoff

---

### **Step 3: Store Temporarily**

#### **3.1 File Organization**
```
/tmp/facefinder/
└── job_abc123/
    ├── reference.jpg          # Reference face (from session)
    ├── dataset/               # Extracted images
    │   ├── image_001.jpg
    │   ├── image_002.jpg
    │   └── ...
    └── matches/               # Matched images (copied)
        ├── match_001.jpg
        └── ...
```

#### **3.2 Memory-Mapped Storage**
```javascript
class TemporaryStorage {
  constructor(jobId) {
    this.jobId = jobId
    this.basePath = `/tmp/facefinder/${jobId}`
    this.maxMemory = 500 * 1024 * 1024 // 500MB limit
    this.currentMemory = 0
  }
  
  async storeImage(buffer, filename) {
    // Check memory limit
    if (this.currentMemory + buffer.length > this.maxMemory) {
      throw new Error('MEMORY_LIMIT_EXCEEDED')
    }
    
    const filepath = path.join(this.basePath, 'dataset', filename)
    await fs.writeFile(filepath, buffer)
    
    this.currentMemory += buffer.length
    
    // Register for cleanup
    await this.registerForCleanup(filepath)
    
    return filepath
  }
  
  async registerForCleanup(filepath) {
    // Add to Redis set with TTL
    await redis.sadd(`cleanup:${this.jobId}`, filepath)
    await redis.expire(`cleanup:${this.jobId}`, 3600) // 1 hour
  }
  
  async getMemoryUsage() {
    return {
      used: this.currentMemory,
      limit: this.maxMemory,
      percentage: (this.currentMemory / this.maxMemory) * 100
    }
  }
}
```

#### **3.3 Disk Space Monitoring**
```javascript
async function checkDiskSpace(path) {
  const { free, size } = await checkDiskSpace(path)
  const usagePercent = ((size - free) / size) * 100
  
  if (usagePercent > 90) {
    // Trigger emergency cleanup
    await emergencyCleanup()
    throw new Error('DISK_SPACE_LOW')
  }
  
  return { free, size, usagePercent }
}
```

**Memory Impact**: 500MB max per job  
**Disk Usage**: Dataset size + matches (~10-20% of dataset)  
**Cleanup**: Auto-cleanup after 1 hour via Redis TTL

---

### **Step 4: Run Face Recognition**

#### **4.1 Load Reference Face**
```javascript
async function loadReferenceFace(imagePath) {
  // Load image
  const image = await faceapi.loadImage(imagePath)
  
  // Detect face
  const detection = await faceapi
    .detectSingleFace(image)
    .withFaceLandmarks()
    .withFaceDescriptor()
  
  if (!detection) {
    throw new Error('NO_FACE_IN_REFERENCE')
  }
  
  return detection.descriptor // 128-dimensional vector
}
```

#### **4.2 Batch Processing**
```javascript
async function processImages(job, tempDir) {
  const { job_id, reference_image_path, options } = job.data
  
  // Load reference face encoding
  const referenceEncoding = await loadReferenceFace(reference_image_path)
  
  // Get all images in dataset
  const imageFiles = await getImageFiles(path.join(tempDir, 'dataset'))
  const totalImages = imageFiles.length
  
  // Process in batches to manage memory
  const batchSize = 50
  const matches = []
  
  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize)
    
    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(file => compareFace(file, referenceEncoding, options))
    )
    
    // Collect matches
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        matches.push(result.value)
      }
    }
    
    // Update progress 50-90%
    const progress = 50 + Math.floor((i / totalImages) * 40)
    await updateJobProgress(job_id, progress, 'searching')
    
    // Force garbage collection every 10 batches
    if (i % (batchSize * 10) === 0) {
      if (global.gc) global.gc()
    }
  }
  
  return matches
}
```

#### **4.3 Face Comparison**
```javascript
async function compareFace(imagePath, referenceEncoding, options) {
  try {
    // Load image
    const image = await faceapi.loadImage(imagePath)
    
    // Detect faces
    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors()
    
    // Compare each face
    for (const detection of detections) {
      const distance = faceapi.euclideanDistance(
        referenceEncoding,
        detection.descriptor
      )
      
      // Convert distance to confidence (0-1)
      const confidence = 1 - distance
      
      // Check threshold
      if (confidence >= options.confidence_threshold) {
        return {
          match_id: generateId('match'),
          image_path: imagePath,
          filename: path.basename(imagePath),
          confidence: confidence,
          confidence_level: getConfidenceLevel(confidence),
          face_location: {
            top: detection.box.top,
            right: detection.box.right,
            bottom: detection.box.bottom,
            left: detection.box.left
          },
          detected_at: Date.now()
        }
      }
    }
    
    return null
    
  } catch (error) {
    // Log error but don't fail entire job
    console.error(`Error processing ${imagePath}:`, error)
    return null
  }
}
```

#### **4.4 Memory Management**
```javascript
// Enable garbage collection
node --expose-gc app.js

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage()
  
  if (usage.heapUsed > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
    console.warn('High memory usage, forcing GC')
    if (global.gc) global.gc()
  }
  
  // Log metrics
  console.log({
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB'
  })
}, 30000) // Every 30 seconds
```

**Memory Impact**: ~100MB per batch (50 images), peak ~500MB  
**CPU Usage**: High during processing (multi-threaded)  
**Error Handling**: Individual image errors logged but don't fail job

---

### **Step 5: Filter & Sort Matches**

#### **5.1 Filter Results**
```javascript
async function filterMatches(matches, options) {
  let filtered = matches
  
  // Remove duplicates (same image, multiple faces)
  filtered = removeDuplicates(filtered)
  
  // Apply confidence threshold
  filtered = filtered.filter(m => 
    m.confidence >= options.confidence_threshold
  )
  
  // Limit results
  if (options.max_results) {
    filtered = filtered.slice(0, options.max_results)
  }
  
  return filtered
}

function removeDuplicates(matches) {
  const seen = new Set()
  return matches.filter(match => {
    if (seen.has(match.image_path)) {
      return false
    }
    seen.add(match.image_path)
    return true
  })
}
```

#### **5.2 Sort Results**
```javascript
function sortMatches(matches, sortBy = 'confidence') {
  switch (sortBy) {
    case 'confidence':
      return matches.sort((a, b) => b.confidence - a.confidence)
    
    case 'filename':
      return matches.sort((a, b) => 
        a.filename.localeCompare(b.filename)
      )
    
    case 'date':
      return matches.sort((a, b) => 
        b.detected_at - a.detected_at
      )
    
    default:
      return matches
  }
}
```

#### **5.3 Generate Thumbnails**
```javascript
async function generateThumbnails(matches, tempDir) {
  const thumbnailDir = path.join(tempDir, 'thumbnails')
  await fs.mkdir(thumbnailDir, { recursive: true })
  
  for (const match of matches) {
    const thumbnailPath = path.join(
      thumbnailDir,
      `thumb_${match.filename}`
    )
    
    await sharp(match.image_path)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath)
    
    match.thumbnail_path = thumbnailPath
  }
  
  return matches
}
```

**Memory Impact**: Minimal (~10MB for sorting)  
**Processing Time**: ~1-2 seconds for 100 matches

---

### **Step 6: Store Results & Return**

#### **6.1 Upload to CDN**
```javascript
async function uploadResults(matches, jobId) {
  const s3 = new AWS.S3()
  const bucket = 'facefinder-temp'
  const prefix = `results/${jobId}`
  
  for (const match of matches) {
    // Upload full image
    const imageKey = `${prefix}/${match.filename}`
    await s3.upload({
      Bucket: bucket,
      Key: imageKey,
      Body: fs.createReadStream(match.image_path),
      ContentType: 'image/jpeg',
      Metadata: {
        'x-amz-meta-expires': String(Date.now() + 3600000) // 1 hour
      }
    }).promise()
    
    // Upload thumbnail
    const thumbKey = `${prefix}/thumb_${match.filename}`
    await s3.upload({
      Bucket: bucket,
      Key: thumbKey,
      Body: fs.createReadStream(match.thumbnail_path),
      ContentType: 'image/jpeg'
    }).promise()
    
    // Update match with URLs
    match.url = `https://cdn.facefinder.ai/${imageKey}`
    match.thumbnail_url = `https://cdn.facefinder.ai/${thumbKey}`
    
    // Remove local paths (security)
    delete match.image_path
    delete match.thumbnail_path
  }
  
  return matches
}
```

#### **6.2 Store in Redis**
```javascript
async function storeResults(jobId, matches) {
  const resultKey = `results:${jobId}`
  
  // Store matches
  await redis.setex(
    resultKey,
    3600, // 1 hour TTL
    JSON.stringify({
      total: matches.length,
      matches: matches,
      stored_at: Date.now()
    })
  )
  
  // Update job status
  await updateJobStatus(jobId, 'completed', 100)
  
  return resultKey
}
```

#### **6.3 Return Response**
```javascript
async function finalizeJob(jobId, matches) {
  // Upload to CDN
  const uploadedMatches = await uploadResults(matches, jobId)
  
  // Store in Redis
  await storeResults(jobId, uploadedMatches)
  
  // Update job metadata
  await redis.setex(
    `job:${jobId}`,
    3600,
    JSON.stringify({
      status: 'completed',
      progress: 100,
      completed_at: Date.now(),
      stats: {
        matches_found: matches.length,
        processing_time: calculateProcessingTime(jobId)
      }
    })
  )
  
  // Trigger webhook (if configured)
  await triggerWebhook(jobId, 'job.completed')
  
  return {
    job_id: jobId,
    status: 'completed',
    matches_found: matches.length
  }
}
```

**Memory Impact**: Minimal (streaming uploads)  
**Network**: Depends on match count and image sizes

---

### **Step 7: Cleanup**

#### **7.1 Immediate Cleanup**
```javascript
async function cleanup(tempDir) {
  try {
    // Delete temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
    
    // Remove from cleanup registry
    const jobId = path.basename(tempDir)
    await redis.del(`cleanup:${jobId}`)
    
    console.log(`Cleaned up: ${tempDir}`)
    
  } catch (error) {
    console.error(`Cleanup failed for ${tempDir}:`, error)
    // Schedule for retry
    await scheduleCleanupRetry(tempDir)
  }
}
```

#### **7.2 Scheduled Cleanup (Cron)**
```javascript
// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled cleanup...')
  
  // Find expired jobs
  const expiredJobs = await redis.keys('cleanup:*')
  
  for (const key of expiredJobs) {
    const jobId = key.split(':')[1]
    const tempDir = `/tmp/facefinder/${jobId}`
    
    // Check if directory exists
    if (await fs.pathExists(tempDir)) {
      await cleanup(tempDir)
    }
  }
  
  // Clean up old S3 objects
  await cleanupS3Objects()
})
```

#### **7.3 S3 Lifecycle Policy**
```javascript
// Configure S3 bucket lifecycle
const lifecycleConfig = {
  Rules: [
    {
      Id: 'DeleteTempResults',
      Status: 'Enabled',
      Prefix: 'results/',
      Expiration: {
        Days: 1 // Delete after 1 day
      }
    }
  ]
}

await s3.putBucketLifecycleConfiguration({
  Bucket: 'facefinder-temp',
  LifecycleConfiguration: lifecycleConfig
}).promise()
```

#### **7.4 Emergency Cleanup**
```javascript
async function emergencyCleanup() {
  console.warn('Emergency cleanup triggered!')
  
  // Get all temp directories
  const tempDirs = await fs.readdir('/tmp/facefinder')
  
  // Sort by age (oldest first)
  const sorted = await Promise.all(
    tempDirs.map(async (dir) => {
      const stats = await fs.stat(`/tmp/facefinder/${dir}`)
      return { dir, mtime: stats.mtime }
    })
  )
  sorted.sort((a, b) => a.mtime - b.mtime)
  
  // Delete oldest 50%
  const toDelete = sorted.slice(0, Math.floor(sorted.length / 2))
  
  for (const { dir } of toDelete) {
    await cleanup(`/tmp/facefinder/${dir}`)
  }
  
  console.log(`Emergency cleanup: deleted ${toDelete.length} directories`)
}
```

**Cleanup Triggers**:
- ✅ Job completion (immediate)
- ✅ Job failure (immediate)
- ✅ TTL expiration (Redis)
- ✅ Scheduled cron (every 15 min)
- ✅ Emergency (disk > 90%)

---

## 🚨 Error Handling Strategy

### **Error Types & Recovery**

| Error Type | Recovery Strategy | User Impact |
|------------|------------------|-------------|
| Network timeout | Retry 3x with backoff | Delayed processing |
| Invalid image | Skip, continue job | Partial results |
| Out of memory | Force GC, reduce batch | Slower processing |
| Disk full | Emergency cleanup | Job failure |
| Face not detected | Return error | Job failure |
| Dataset unavailable | Retry 3x, then fail | Job failure |

### **Error Response Format**
```javascript
{
  "success": false,
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Face recognition failed",
    "details": {
      "phase": "searching",
      "progress": 67,
      "images_processed": 835,
      "error_type": "OUT_OF_MEMORY"
    },
    "recovery": {
      "can_retry": true,
      "suggestion": "Try with a smaller dataset"
    }
  }
}
```

### **Graceful Degradation**
```javascript
async function processWithFallback(job) {
  try {
    // Try primary method (local processing)
    return await processLocally(job)
    
  } catch (error) {
    if (error.code === 'OUT_OF_MEMORY') {
      // Fallback to cloud processing
      console.warn('Falling back to cloud processing')
      return await processInCloud(job)
    }
    
    throw error
  }
}
```

---

## 📊 Monitoring & Metrics

### **Key Metrics**
```javascript
// Track in Redis
await redis.hincrby('metrics:daily', 'jobs_completed', 1)
await redis.hincrby('metrics:daily', 'images_processed', imageCount)
await redis.hincrby('metrics:daily', 'matches_found', matchCount)

// Processing time histogram
await redis.zadd(
  'metrics:processing_time',
  processingTime,
  jobId
)

// Memory usage
await redis.lpush(
  'metrics:memory',
  JSON.stringify({
    timestamp: Date.now(),
    heapUsed: process.memoryUsage().heapUsed,
    jobId: jobId
  })
)
```

### **Health Checks**
```javascript
async function healthCheck() {
  return {
    status: 'healthy',
    checks: {
      redis: await checkRedis(),
      disk: await checkDiskSpace('/tmp'),
      memory: await checkMemory(),
      queue: await checkQueue()
    },
    metrics: {
      active_jobs: await queue.getActiveCount(),
      queued_jobs: await queue.getWaitingCount(),
      failed_jobs: await queue.getFailedCount()
    }
  }
}
```

---

## 🎯 Performance Optimization

### **1. Parallel Processing**
```javascript
// Process multiple jobs in parallel
const concurrency = os.cpus().length
queue.process('face-matching', concurrency, processJob)
```

### **2. Image Caching**
```javascript
// Cache face encodings
const encodingCache = new LRU({
  max: 1000,
  maxAge: 3600000 // 1 hour
})
```

### **3. Batch Optimization**
```javascript
// Dynamic batch size based on memory
function calculateBatchSize() {
  const availableMemory = os.freemem()
  const avgImageSize = 5 * 1024 * 1024 // 5MB
  return Math.floor(availableMemory / avgImageSize / 10)
}
```

### **4. Resource Limits**
```javascript
// Limit concurrent jobs per worker
const MAX_CONCURRENT_JOBS = 3
const MAX_MEMORY_PER_JOB = 500 * 1024 * 1024 // 500MB
const MAX_PROCESSING_TIME = 600000 // 10 minutes
```

---

## 🔐 Security Considerations

- ✅ **Input validation** - Sanitize all URLs and files
- ✅ **Sandboxing** - Isolate each job in separate directory
- ✅ **Resource limits** - Prevent DoS via large datasets
- ✅ **Auto-cleanup** - No data persistence beyond TTL
- ✅ **Secure deletion** - Overwrite files before deletion
- ✅ **Access control** - Signed URLs for result access

---

**Complete stateless, ephemeral processing pipeline with robust error handling and automatic cleanup** 🚀
