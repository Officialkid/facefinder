/**
 * Optimized API Client - Reduced Latency & Better Performance
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Connection pooling configuration
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

// Request cache for deduplication
const requestCache = new Map<string, Promise<any>>();

export interface UploadResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface ProcessResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface StatusResponse {
  jobId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  phase: 'idle' | 'analyzing' | 'searching' | 'finalizing';
  error?: string;
}

export interface ResultsResponse {
  jobId: string;
  status: string;
  results: Array<{
    id: string;
    imagePath: string;
    imageUrl: string;
    confidence: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    location: Record<string, number>;
  }>;
  totalMatches: number;
  processedAt: string;
}

class OptimizedApiClient {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.abortControllers = new Map();
  }

  /**
   * Upload with progress tracking
   */
  async uploadPhoto(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Create abort controller for cancellation
    const controller = new AbortController();
    const uploadId = `upload-${Date.now()}`;
    this.abortControllers.set(uploadId, controller);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      const response = await new Promise<UploadResponse>((resolve, reject) => {
        xhr.open('POST', `${this.baseUrl}/upload`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.timeout = 30000; // 30s timeout
        xhr.send(formData);
      });

      return response;
    } finally {
      this.abortControllers.delete(uploadId);
    }
  }

  /**
   * Start processing with retry logic
   */
  async startProcessing(
    jobId: string,
    datasetUrl: string,
    retries = 3
  ): Promise<ProcessResponse> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/process`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, datasetUrl }),
          },
          5000
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Processing failed');
        }

        return response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw new Error('Max retries reached');
  }

  /**
   * Poll status with request deduplication
   */
  async getStatus(jobId: string): Promise<StatusResponse> {
    const cacheKey = `status-${jobId}`;

    // Return cached promise if request is in-flight
    if (requestCache.has(cacheKey)) {
      return requestCache.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/status/${jobId}`,
          {},
          3000
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get status');
        }

        return response.json();
      } finally {
        // Remove from cache after 100ms to allow brief deduplication
        setTimeout(() => requestCache.delete(cacheKey), 100);
      }
    })();

    requestCache.set(cacheKey, promise);
    return promise;
  }

  /**
   * Get results with caching
   */
  async getResults(jobId: string): Promise<ResultsResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/results/${jobId}`,
      {},
      10000
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get results');
    }

    return response.json();
  }

  /**
   * Prefetch images for faster display
   */
  prefetchImages(imageUrls: string[]): void {
    imageUrls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Get image URL with CDN support
   */
  getImageUrl(filename: string): string {
    return `${this.baseUrl}/image/${filename}`;
  }

  /**
   * Get download URL
   */
  getDownloadUrl(jobId: string, resultId: string): string {
    return `${this.baseUrl}/download/${jobId}/${resultId}`;
  }

  /**
   * Health check with timeout
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 2000);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Cancel ongoing requests
   */
  cancelAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    requestCache.clear();
  }
}

export const apiClient = new OptimizedApiClient();

/**
 * Optimized polling hook with adaptive interval
 */
export function useAdaptivePolling(
  jobId: string | null,
  onProgress: (progress: number, phase: string) => void,
  onComplete: (results: ResultsResponse) => void,
  onError: (error: string) => void
) {
  let pollInterval = 1000; // Start at 1s
  let consecutiveErrors = 0;

  const poll = async () => {
    if (!jobId) return;

    try {
      const status = await apiClient.getStatus(jobId);
      onProgress(status.progress, status.phase);

      if (status.status === 'completed') {
        const results = await apiClient.getResults(jobId);
        
        // Prefetch result images
        const imageUrls = results.results.map((r) => r.imageUrl);
        apiClient.prefetchImages(imageUrls);
        
        onComplete(results);
        return;
      } else if (status.status === 'failed') {
        onError(status.error || 'Processing failed');
        return;
      }

      // Adaptive interval: slow down if progress is slow
      if (status.progress < 50) {
        pollInterval = 1000; // Fast polling during initial phase
      } else {
        pollInterval = 1500; // Slower polling during search phase
      }

      consecutiveErrors = 0;
      setTimeout(poll, pollInterval);
    } catch (error) {
      consecutiveErrors++;

      if (consecutiveErrors > 5) {
        onError('Connection lost. Please refresh.');
        return;
      }

      // Exponential backoff on errors
      pollInterval = Math.min(pollInterval * 1.5, 5000);
      setTimeout(poll, pollInterval);
    }
  };

  return { startPolling: poll, stopPolling: () => apiClient.cancelAll() };
}

/**
 * Batch download helper
 */
export async function batchDownload(
  jobId: string,
  resultIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < resultIds.length; i++) {
    const url = apiClient.getDownloadUrl(jobId, resultIds[i]);
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-${i + 1}.jpg`;
    link.click();

    if (onProgress) {
      onProgress(i + 1, resultIds.length);
    }

    // Delay between downloads to avoid overwhelming browser
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
