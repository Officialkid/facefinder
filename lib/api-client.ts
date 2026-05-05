/**
 * API Client - Frontend to FastAPI Backend Communication
 *
 * In production (Vercel) all requests go to /api/backend which Vercel rewrites
 * to the Cloud Run URL (set in vercel.json or NEXT_PUBLIC_API_URL env var).
 * In local dev Next.js rewrites /api/backend/* to http://localhost:8000/*.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}`   // direct URL (e.g. during server-side calls)
  : '/api/backend';                          // relative — goes through the Next.js rewrite proxy

export interface ProcessMatch {
  image_id: string;
  source_url: string | null;
  confidence: number;
  matched_face_count: number;
  preview_base64: string | null;
}

export interface ProcessResponse {
  request_id: string;
  message: string;
  threshold: number;
  matches_found: number;
  matches: ProcessMatch[];
}

interface ApiError {
  error_code?: string;
  message?: string;
  error?: string;
}

export interface SearchSettings {
  confidenceThresholdPct: number;
  maxResults: number;
  strictMode: boolean;
  searchMode?: 'faster' | 'moretime' | 'complex';
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async processFaces(
    file: File,
    datasetUrl: string,
    settings?: SearchSettings,
    options?: { includePreviews?: boolean }
  ): Promise<ProcessResponse> {
    const formData = new FormData();
    formData.append('reference_image', file);
    formData.append('dataset_link', datasetUrl);

    const thresholdPct = settings?.confidenceThresholdPct ?? 88;
    formData.append('threshold', String(Math.max(0.0, Math.min(1.0, thresholdPct / 100))));
    formData.append('include_previews', String(Boolean(options?.includePreviews)));
    formData.append('max_results', String(settings?.maxResults ?? 50));

    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      body: formData,
    });

    const body = (await response.json()) as ProcessResponse | ApiError;
    if (!response.ok) {
      throw new Error((body as ApiError).message || (body as ApiError).error || 'Processing failed');
    }

    return body as ProcessResponse;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
