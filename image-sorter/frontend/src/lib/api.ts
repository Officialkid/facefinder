/**
 * FaceFinder AI API client and shared frontend contract types.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export const RECOGNITION_MODELS = ["ArcFace", "Facenet", "VGG-Face", "DeepFace"] as const;
export type RecognitionModel = (typeof RECOGNITION_MODELS)[number];

export const PROCESSING_STAGES = [
  "queued",
  "upload_received",
  "dataset_validation",
  "dataset_download",
  "dataset_extraction",
  "reference_analysis",
  "dataset_scan",
  "results_ready",
  "failed",
] as const;
export type ProcessingStage = (typeof PROCESSING_STAGES)[number];

export const SESSION_ERROR_CODES = [
  "no_face_in_reference",
  "too_many_faces",
  "dataset_empty",
  "dataset_unreachable",
  "dataset_too_large",
  "dataset_invalid",
  "dataset_unsafe_archive",
  "processing_timeout",
  "internal_error",
] as const;
export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];

export interface DetectedReferenceFace {
  face_index: number;
  confidence: number;
  bounding_box: { x: number; y: number; w: number; h: number };
  thumbnail_base64: string;
}

export interface UploadResponse {
  session_id: string;
  status: string;
  message: string;
  reference_image: string;
  detected_faces?: DetectedReferenceFace[];
}

export interface SessionError {
  code: SessionErrorCode;
  message: string;
  retryable: boolean;
}

export interface SessionErrorDisplay {
  title: string;
  message: string;
  guidance: string;
  recoverAtStep: 1 | 2;
  retryable: boolean;
}

export interface ProcessStartResponse {
  session_id: string;
  status: "processing";
  stage: "queued";
  queue_position: number | null;
  requested_model_name: RecognitionModel;
  requested_similarity_threshold: number;
  message: string;
}

export interface StatusResponse {
  session_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  stage: ProcessingStage;
  requested_model_name: RecognitionModel | null;
  requested_similarity_threshold: number | null;
  dataset_provider: string | null;
  dataset_source_kind: string | null;
  progress_percent: number;
  stage_message: string | null;
  total_images_scanned: number;
  total_images_discovered: number;
  matched_count: number;
  candidate_count?: number;
  images_with_detected_faces: number;
  images_without_detected_faces: number;
  images_with_multiple_faces: number;
  average_match_confidence: number | null;
  top_match_confidence: number | null;
  highest_observed_similarity?: number | null;
  current_image: string | null;
  queue_position: number | null;
  dataset_downloaded_bytes: number;
  dataset_total_bytes: number | null;
  dataset_files_extracted: number;
  dataset_total_files: number | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  current_stage_started_at: string;
  stage_elapsed_seconds: number;
  estimated_remaining_seconds: number | null;
  processing_time_seconds: number | null;
  matched_images?: MatchedImage[];
  candidate_images?: MatchedImage[];
  selected_face_index?: number | null;
  detected_reference_faces?: DetectedReferenceFace[] | null;
  manual_search_estimated_seconds?: number | null;
  time_saved_percent?: number | null;
  color_space_normalized?: boolean;
  error: SessionError | null;
  last_updated_at: string;
}

export interface MatchedImage {
  filename: string;
  relative_path: string;
  similarity_score: number;
  distance: number;
  download_url: string;
  preview_url: string;
  rank: number;
  face_count: number | null;
  confidence_percent: number;
  confidence_label: string;
  match_reason: string;
  source_group: string;
  match_tier?: "confirmed" | "candidate";
  blur_score?: number | null;
  is_blurry?: boolean | null;
  blur_description?: string | null;
}

export interface ResultsResponse {
  session_id: string;
  status: string;
  stage: ProcessingStage;
  requested_model_name: RecognitionModel | null;
  requested_similarity_threshold: number | null;
  dataset_provider: string | null;
  dataset_source_kind: string | null;
  progress_percent: number;
  stage_message: string | null;
  total_images_scanned: number;
  total_images_discovered: number;
  matched_count: number;
  candidate_count?: number;
  images_with_detected_faces: number;
  images_without_detected_faces: number;
  images_with_multiple_faces: number;
  average_match_confidence: number | null;
  top_match_confidence: number | null;
  matched_images: MatchedImage[];
  candidate_images?: MatchedImage[];
  selected_face_index?: number | null;
  detected_reference_faces?: DetectedReferenceFace[] | null;
  queue_position: number | null;
  dataset_downloaded_bytes: number;
  dataset_total_bytes: number | null;
  dataset_files_extracted: number;
  dataset_total_files: number | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  current_stage_started_at: string;
  stage_elapsed_seconds: number;
  estimated_remaining_seconds: number | null;
  processing_time_seconds: number | null;
  manual_search_estimated_seconds?: number | null;
  time_saved_percent?: number | null;
  color_space_normalized?: boolean;
  error: SessionError | null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: { message?: string }; detail?: string }
      | undefined;

    return payload?.error?.message ?? payload?.detail ?? fallback;
  }

  return fallback;
}

export function getSessionErrorDisplay(error: SessionError | null): SessionErrorDisplay {
  if (!error) {
    return {
      title: "Processing stopped",
      message: "The scan ended before results could be prepared.",
      guidance: "Try the dataset step again. If it keeps happening, use a smaller or cleaner dataset link.",
      recoverAtStep: 2,
      retryable: true,
    };
  }

  switch (error.code) {
    case "no_face_in_reference":
      return {
        title: "No face found in the reference photo",
        message: error.message,
        guidance: "Upload a clearer front-facing photo with one visible face, then start the scan again.",
        recoverAtStep: 1,
        retryable: false,
      };
    case "too_many_faces":
      return {
        title: "Reference photo is ambiguous",
        message: error.message,
        guidance: "Go back and upload a photo that contains only the target person.",
        recoverAtStep: 1,
        retryable: false,
      };
    case "dataset_empty":
      return {
        title: "The dataset had no usable images",
        message: error.message,
        guidance: "Return to the dataset step and use a ZIP or public image source that actually contains supported image files.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "dataset_unreachable":
      return {
        title: "The dataset could not be reached",
        message: error.message,
        guidance: "Check that the link is public, still active, and downloadable without a login prompt.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "dataset_too_large":
      return {
        title: "The dataset is too large",
        message: error.message,
        guidance: "Try a smaller archive or split the dataset into more manageable batches.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "dataset_invalid":
      return {
        title: "The dataset source is invalid",
        message: error.message,
        guidance: "Use a public ZIP or direct image URL that the backend can validate and download safely.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "dataset_unsafe_archive":
      return {
        title: "The archive was blocked for safety",
        message: error.message,
        guidance: "Rebuild the ZIP with a normal folder structure and remove unsafe paths or suspicious files.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "processing_timeout":
      return {
        title: "Processing took too long",
        message: error.message,
        guidance: "Try a smaller dataset, or rerun the scan later if the worker was under heavy load.",
        recoverAtStep: 2,
        retryable: true,
      };
    case "internal_error":
    default:
      return {
        title: "An internal processing error occurred",
        message: error.message,
        guidance: "Retry from the dataset step first. If the same failure repeats, the backend needs investigation.",
        recoverAtStep: 2,
        retryable: error.retryable,
      };
  }
}

export const ImageSorterAPI = {
  uploadReference: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<UploadResponse>("/upload/reference", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  uploadDatasetZip: async (
    session_id: string,
    file: File
  ): Promise<{ session_id: string; status: string; filename: string; image_count: number; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<{ session_id: string; status: string; filename: string; image_count: number; message: string }>(
      `/upload/dataset-zip?session_id=${encodeURIComponent(session_id)}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      }
    );
    return data;
  },

  startProcessing: async (
    session_id: string,
    dataset_url: string,
    similarity_threshold: number = 0.45,
    model_name: RecognitionModel = "ArcFace",
    selected_face_index: number | null = null,
    dataset_email?: string,
    dataset_password?: string,
  ): Promise<ProcessStartResponse> => {
    const { data } = await api.post<ProcessStartResponse>("/process/start", {
      session_id,
      dataset_url,
      similarity_threshold,
      model_name,
      selected_face_index,
      dataset_email: dataset_email || undefined,
      dataset_password: dataset_password || undefined,
    });
    return data;
  },

  confirmCandidateMatches: async (
    session_id: string,
    confirmed_filenames: string[]
  ): Promise<{ session_id: string; matched_count: number; candidate_count: number; message: string }> => {
    const { data } = await api.post<{ session_id: string; matched_count: number; candidate_count: number; message: string }>(
      `/results/${session_id}/confirm-matches`,
      { confirmed_filenames }
    );
    return data;
  },

  getStatus: async (session_id: string): Promise<StatusResponse> => {
    const { data } = await api.get<StatusResponse>(`/results/${session_id}/status`);
    return data;
  },

  getResults: async (session_id: string): Promise<ResultsResponse> => {
    const { data } = await api.get<ResultsResponse>(`/results/${session_id}`);
    return data;
  },

  getWorkerSnapshot: async (): Promise<Record<string, unknown>> => {
    const { data } = await api.get("/results/worker/snapshot");
    return data;
  },

  getDownloadUrl: (session_id: string, relativePath: string): string =>
    `/api/results/${session_id}/download/${encodeURIComponent(relativePath)}`,

  getDownloadAllUrl: (session_id: string): string =>
    `/api/results/${session_id}/download-all`,

  getImageUrl: (session_id: string, relativePath: string): string =>
    `/api/results/${session_id}/download/${encodeURIComponent(relativePath)}`,

  getReferenceImageUrl: (session_id: string): string =>
    `/api/upload/${session_id}/reference`,

  deleteSession: async (session_id: string): Promise<void> => {
    await api.delete(`/results/${session_id}`);
  },
};

